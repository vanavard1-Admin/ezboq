import { BOQTableGrouped } from "../components/BOQTableGrouped";
import { BOQSummary } from "../components/BOQSummary";
import { DiscountSection } from "../components/DiscountSection";
import { BOQItem, Profile, CompanyInfo, CustomerInfo, Discount, BOQSummary as BOQSummaryType, Document } from "../types/boq";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Textarea } from "../components/ui/textarea";
import { Label } from "../components/ui/label";
import { Building2, User, ArrowRight, ArrowLeft, FileCheck, FileText, Users, Save } from "lucide-react";
import { toast } from "sonner@2.0.3";
import { calculateBOQSummary } from "../utils/calculations";
import { Separator } from "../components/ui/separator";
import { Badge } from "../components/ui/badge";
import { projectId, publicAnonKey } from "../utils/supabase/info";
import { useState } from "react";

interface QuotationPageProps {
  boqItems: BOQItem[];
  setBoqItems: (items: BOQItem[]) => void;
  profile: Profile;
  projectTitle: string;
  company: CompanyInfo;
  customer: CustomerInfo;
  discount: Discount | null;
  setDiscount: (discount: Discount | null) => void;
  quotationNotes: string;
  setQuotationNotes: (notes: string) => void;
  paymentConditions: string;
  setPaymentConditions: (conditions: string) => void;
  onNext: () => void;
  onBack: () => void;
  
  // Partner support
  recipientType?: 'customer' | 'partner';
  selectedPartner?: any;
  mainProjectTag?: string;
}

export function QuotationPage({
  boqItems,
  setBoqItems,
  profile,
  projectTitle,
  company,
  customer,
  discount,
  setDiscount,
  quotationNotes,
  setQuotationNotes,
  paymentConditions,
  setPaymentConditions,
  onNext,
  onBack,
  recipientType = 'customer',
  selectedPartner,
  mainProjectTag,
}: QuotationPageProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const handleUpdateItem = (id: string, updates: Partial<BOQItem>) => {
    setBoqItems(boqItems.map(item => 
      item.id === id ? { ...item, ...updates } : item
    ));
  };

  const handleRemove = (id: string) => {
    setBoqItems(boqItems.filter(item => item.id !== id));
    toast.success("ลบรายการแล้ว");
  };

  const handleSaveQuotation = async () => {
    if (boqItems.length === 0) {
      toast.error("กรุณาเพิ่มรายการ BOQ ก่อนบันทึก");
      return;
    }

    setIsSaving(true);

    try {
      const summary = calculateSummary();
      const quotationNumber = `QT-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;

      const document: Document = {
        id: `doc-${Date.now()}`,
        documentNumber: quotationNumber,
        type: "quotation",
        status: "draft",
        projectTitle,
        customerId: recipientType === 'customer' ? (customer.id || "default-customer") : undefined,
        customerName: recipientType === 'customer' ? customer.name : undefined,
        partnerId: recipientType === 'partner' ? selectedPartner?.id : undefined,
        partnerName: recipientType === 'partner' ? selectedPartner?.name : undefined,
        recipientType: recipientType,
        mainProjectTag: recipientType === 'partner' ? mainProjectTag : undefined,
        totalAmount: summary.totalAfterDiscount,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        issueDate: new Date().toISOString().split('T')[0],
        boqItems,
        profile,
        company,
        customer: recipientType === 'customer' ? customer : undefined,
        partner: recipientType === 'partner' ? selectedPartner : undefined,
        discount,
      };

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-6e95bca3/documents`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify(document),
        }
      );

      if (response.ok) {
        setIsSaved(true);
        toast.success("บันทึกใบเสนอราคาสำเร็จ!", {
          description: `เลขที่ ${quotationNumber}`,
        });
      } else {
        throw new Error("Failed to save quotation");
      }
    } catch (error) {
      console.error("Save quotation failed:", error);
      toast.error("ไม่สามารถบันทึกใบเสนอราคาได้");
    } finally {
      setIsSaving(false);
    }
  };

  const calculateSummary = (): BOQSummaryType & { discountAmount: number; totalAfterDiscount: number } => {
    const subtotalMaterial = boqItems.reduce((sum, item) => 
      sum + (item.material * item.quantity), 0
    );
    const subtotalLabor = boqItems.reduce((sum, item) => 
      sum + (item.labor * item.quantity), 0
    );
    const subtotal = subtotalMaterial + subtotalLabor;

    const waste = subtotal * (profile.wastePct / 100);
    const opex = subtotal * (profile.opexPct / 100);
    const error = subtotal * (profile.errorPct / 100);
    const totalBeforeMarkup = subtotal + waste + opex + error;

    const markup = totalBeforeMarkup * (profile.markupPct / 100);
    const totalBeforeVat = totalBeforeMarkup + markup;

    const vat = totalBeforeVat * (profile.vatPct / 100);
    let grandTotal = totalBeforeVat + vat;

    let discountAmount = 0;
    if (discount) {
      if (discount.type === "percent") {
        discountAmount = grandTotal * (discount.value / 100);
      } else {
        discountAmount = discount.value;
      }
    }

    const totalAfterDiscount = grandTotal - discountAmount;

    return {
      subtotalMaterial,
      subtotalLabor,
      subtotal,
      waste,
      opex,
      error,
      totalBeforeMarkup,
      markup,
      totalBeforeVat,
      vat,
      grandTotal,
      discountAmount,
      totalAfterDiscount,
    };
  };

  const handleConfirm = async () => {
    // Auto-save quotation before proceeding
    if (boqItems.length === 0) {
      toast.error("กรุณาเพิ่มรายการ BOQ ก่อนดำเนินการต่อ");
      return;
    }

    // Save quotation if not already saved
    if (!isSaved) {
      setIsSaving(true);
      try {
        const summary = calculateSummary();
        const quotationNumber = `QT-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;

        const document: Document = {
          id: `doc-${Date.now()}`,
          documentNumber: quotationNumber,
          type: "quotation",
          status: "draft",
          projectTitle,
          customerId: recipientType === 'customer' ? (customer.id || "default-customer") : undefined,
          customerName: recipientType === 'customer' ? customer.name : undefined,
          partnerId: recipientType === 'partner' ? selectedPartner?.id : undefined,
          partnerName: recipientType === 'partner' ? selectedPartner?.name : undefined,
          recipientType: recipientType,
          mainProjectTag: recipientType === 'partner' ? mainProjectTag : undefined,
          totalAmount: summary.totalAfterDiscount,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          issueDate: new Date().toISOString().split('T')[0],
          boqItems,
          profile,
          company,
          customer: recipientType === 'customer' ? customer : undefined,
          partner: recipientType === 'partner' ? selectedPartner : undefined,
          discount,
        };

        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-6e95bca3/documents`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${publicAnonKey}`,
            },
            body: JSON.stringify(document),
          }
        );

        if (response.ok) {
          setIsSaved(true);
          toast.success("บันทึกใบเสนอราคาสำเร็จและดำเนินการต่อ", {
            description: `เลขที่ ${quotationNumber}`,
          });
          // Proceed to next step
          onNext();
        } else {
          throw new Error("Failed to save quotation");
        }
      } catch (error) {
        console.error("Save quotation failed:", error);
        toast.error("ไม่สามารถบันทึกใบเสนอราคาได้ กรุณาลองอีกครั้ง");
      } finally {
        setIsSaving(false);
      }
    } else {
      // Already saved, just proceed
      toast.success("ใบเสนอราคาเสร็จสมบูรณ์");
      onNext();
    }
  };

  // Calculate summary
  const summary = calculateSummary();

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 pb-20">
      {/* Page Header */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white p-8 shadow-xl">
        <div className="container mx-auto">
          <div className="flex items-center gap-4 mb-3">
            <div className="p-3 bg-white/20 rounded-lg backdrop-blur-sm">
              <FileCheck className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-3xl mb-1">ใบเสนอราคา (Quotation)</h1>
              <p className="text-green-100">ขั้นตอนที่ 2: สร้างใบเสนอราคาและกำหนดส่วนลด</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="opacity-75">BOQ</span>
            <span className="opacity-75">→</span>
            <div className="px-3 py-1 bg-white/20 rounded-full backdrop-blur-sm">
              Step 2 of 4
            </div>
            <span className="opacity-75">→</span>
            <span className="opacity-75">ใบวางบิล</span>
            <span className="opacity-75">→</span>
            <span className="opacity-75">ใบเสร็จ</span>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        <div id="quotation-content" className="grid gap-6">
          {/* Project Info Card */}
          <Card className="p-6 bg-white/80 backdrop-blur-sm shadow-lg border-green-100">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="mb-3 bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                  โครงการ
                </h3>
                <div className="text-2xl mb-2">{projectTitle}</div>
                <div className="text-sm text-muted-foreground">
                  รายการทั้งหมด: {boqItems.length} รายการ
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground mb-1">ผู้เสนอราคา:</div>
                  <div>{company.name}</div>
                </div>
                <div>
                  <div className="text-muted-foreground mb-1 flex items-center gap-2">
                    {recipientType === 'customer' ? (
                      <>
                        <User className="w-4 h-4" />
                        ลูกค้า
                      </>
                    ) : (
                      <>
                        <Users className="w-4 h-4" />
                        พาร์ทเนอร์
                      </>
                    )}
                  </div>
                  <div>
                    {recipientType === 'customer' ? customer.name : selectedPartner?.name || 'ไม่ระบุ'}
                  </div>
                  {recipientType === 'partner' && mainProjectTag && (
                    <Badge variant="secondary" className="mt-1">
                      {mainProjectTag}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* BOQ Table */}
          <BOQTableGrouped
            items={boqItems}
            onUpdate={handleUpdateItem}
            onRemove={handleRemove}
          />

          <Separator />

          {/* Discount Section */}
          <DiscountSection 
            discount={discount}
            totalBeforeDiscount={summary.grandTotal}
            onUpdate={setDiscount}
          />

          <Separator />

          {/* Notes and Payment Conditions */}
          <div className="grid lg:grid-cols-2 gap-6">
            <Card className="p-6 bg-white/80 backdrop-blur-sm shadow-lg border-green-100">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="h-5 w-5 text-green-600" />
                <h3 className="bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                  หมายเหตุ
                </h3>
              </div>
              <Label htmlFor="quotation-notes" className="text-sm text-muted-foreground mb-2">
                ระบุหมายเหตุเพิ่มเติม (ผู้ใช้สามารถแก้ไขหรือลบได้)
              </Label>
              <Textarea
                id="quotation-notes"
                value={quotationNotes}
                onChange={(e) => setQuotationNotes(e.target.value)}
                placeholder="ระบุหมายเหตุ..."
                rows={5}
                className="mt-2 bg-white"
              />
            </Card>

            <Card className="p-6 bg-white/80 backdrop-blur-sm shadow-lg border-emerald-100">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="h-5 w-5 text-emerald-600" />
                <h3 className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                  เงื่อนไขการชำระเงิน
                </h3>
              </div>
              <Label htmlFor="payment-conditions" className="text-sm text-muted-foreground mb-2">
                ระบุเงื่อนไขการชำระเงิน (ผู้ใช้สามารถแก้ไขหรือลบได้)
              </Label>
              <Textarea
                id="payment-conditions"
                value={paymentConditions}
                onChange={(e) => setPaymentConditions(e.target.value)}
                placeholder="ระบุเงื่อนไขการชำระเงิน..."
                rows={5}
                className="mt-2 bg-white"
              />
            </Card>
          </div>

          <Separator />

          {/* Summary */}
          <div className="grid lg:grid-cols-2 gap-6">
            <BOQSummary summary={summary} />
            
            <Card className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 shadow-lg">
              <h3 className="mb-4 bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent text-xl">
                สรุปใบเสนอราคา
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between p-3 bg-white/70 rounded-lg">
                  <span>ราคาก่อนส่วนลด:</span>
                  <span className="text-lg">฿{summary.grandTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                </div>
                {discount && (
                  <>
                    <div className="flex justify-between p-3 bg-white/70 rounded-lg text-red-600">
                      <span>ส่วนลด {discount.type === "percent" ? `(${discount.value}%)` : ""}:</span>
                      <span className="text-lg">- ฿{summary.discountAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                    </div>
                    {discount.description && (
                      <div className="px-3 text-sm text-muted-foreground">
                        {discount.description}
                      </div>
                    )}
                  </>
                )}
                <div className="pt-3 border-t-2 border-green-300">
                  <div className="flex justify-between items-center p-4 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg text-white">
                    <span className="text-lg">ยอดรวมสุทธิ:</span>
                    <span className="text-3xl">
                      ฿{summary.totalAfterDiscount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Navigation */}
          <Separator />
          <div className="flex justify-between items-center">
            <Button
              variant="outline"
              onClick={onBack}
              size="lg"
              className="gap-2 px-8 py-6 text-lg"
            >
              <ArrowLeft className="h-5 w-5" />
              กลับไป BOQ
            </Button>
            <div className="flex gap-3">
              <Button
                onClick={handleSaveQuotation}
                disabled={isSaving || boqItems.length === 0}
                size="lg"
                variant="outline"
                className="gap-2 px-8 py-6 text-lg"
              >
                <Save className="h-5 w-5" />
                {isSaving ? "กำลังบันทึก..." : isSaved ? "✓ บันทึกแล้ว" : "บันทึกใบเสนอราคา"}
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={isSaving || boqItems.length === 0}
                size="lg"
                className="gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 px-8 py-6 text-lg"
              >
                {isSaving ? "กำลังบันทึก..." : "ยืนยันใบเสนอราคาและไปขั้นตอนถัดไป"}
                <ArrowRight className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
