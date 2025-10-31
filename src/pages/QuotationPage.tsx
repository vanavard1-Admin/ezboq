import { BOQTableGrouped } from "../components/BOQTableGrouped";
import { BOQSummary } from "../components/BOQSummary";
import { DiscountSection } from "../components/DiscountSection";
import { BOQItem, Profile, CompanyInfo, CustomerInfo, Discount, BOQSummary as BOQSummaryType, Document } from "../types/boq";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Textarea } from "../components/ui/textarea";
import { Label } from "../components/ui/label";
import { Building2, User, ArrowRight, ArrowLeft, FileCheck, FileText, Users, Save, Receipt, ChevronDown, ChevronUp, Package, Percent, DollarSign } from "lucide-react";
import { toast } from "sonner@2.0.3";
import { calculateBOQSummary } from "../utils/calculations";
import { Separator } from "../components/ui/separator";
import { Badge } from "../components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../components/ui/accordion";
import { api, generateIdempotencyKey } from "../utils/api";
import { useState, useRef } from "react";

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
  const [showFullSummary, setShowFullSummary] = useState(false);
  
  // ✅ Store idempotency key to prevent double-click
  const idempotencyKeyRef = useRef<string | null>(null);

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

      // ✅ Generate idempotency key once per save attempt
      if (!idempotencyKeyRef.current) {
        idempotencyKeyRef.current = generateIdempotencyKey('save-quotation');
      }

      // ✅ FIX: api.post returns data directly, not response object
      const data = await api.post('/documents', document, idempotencyKeyRef.current);

      // ✅ If we got here without error, save was successful
      setIsSaved(true);
      toast.success("บันทึกใบเสนอราคาสำเร็จ!", {
        description: `เลขที่ ${quotationNumber}`,
      });
    } catch (error) {
      console.error("Save quotation failed:", error);
      toast.error("ไม่สามารถบันทึกใบเสนอราคาได้");
    } finally {
      setIsSaving(false);
    }
  };

  // ✅ Use centralized calculation with Decimal.js
  const calculateSummary = (): BOQSummaryType & { discountAmount: number; totalAfterDiscount: number } => {
    return calculateBOQSummary(boqItems, profile, discount);
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

        // ✅ Reuse same idempotency key if user clicks "confirm" multiple times
        if (!idempotencyKeyRef.current) {
          idempotencyKeyRef.current = generateIdempotencyKey('save-quotation');
        }

        // ✅ FIX: api.post returns data directly, not response object
        const data = await api.post('/documents', document, idempotencyKeyRef.current);

        // ✅ If we got here without error, save was successful
        setIsSaved(true);
        toast.success("บันทึกใบเสนอราคาสำเร็จและดำเนินการต่อ", {
          description: `เลขที่ ${quotationNumber}`,
        });
        // Proceed to next step
        onNext();
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
      {/* Compact Header - Mobile Optimized */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white sticky top-0 z-10 shadow-lg">
        <div className="container mx-auto px-3 py-3 sm:px-4 sm:py-4 md:px-6 md:py-5">
          {/* Title Row */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <div className="p-1.5 sm:p-2 bg-white/20 rounded-lg backdrop-blur-sm shrink-0">
                <FileCheck className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />
              </div>
              <div className="min-w-0">
                <h1 className="text-base sm:text-lg md:text-xl truncate">ใบเสนอราคา</h1>
                <p className="text-[10px] sm:text-xs text-green-100 hidden sm:block">Quotation - Step 2 of 4</p>
              </div>
            </div>
            
            {/* Quick Summary Badge - Always Visible on Mobile */}
            <div className="shrink-0">
              <div className="px-2 sm:px-3 py-1 sm:py-1.5 bg-white/20 rounded-lg backdrop-blur-sm text-right">
                <div className="text-[10px] sm:text-xs opacity-75">ยอดรวม</div>
                <div className="text-xs sm:text-sm md:text-base">
                  ฿{(summary.totalAfterDiscount || 0).toLocaleString('th-TH', { maximumFractionDigits: 0 })}
                </div>
              </div>
            </div>
          </div>

          {/* Project Info - Collapsible on Mobile */}
          <div className="text-xs sm:text-sm">
            <div className="flex items-center justify-between gap-2 p-2 bg-white/10 rounded-lg backdrop-blur-sm">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <Package className="w-3 h-3 sm:w-4 sm:h-4 shrink-0 opacity-75" />
                <span className="truncate">{projectTitle}</span>
              </div>
              <Badge variant="secondary" className="shrink-0 text-[10px] sm:text-xs">
                {boqItems.length} รายการ
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-3 sm:px-4 md:px-6 py-3 sm:py-4 md:py-6">
        <div className="grid gap-3 sm:gap-4 md:gap-6">
          
          {/* Client Info Card - Compact */}
          <Card className="border-green-100 shadow-md">
            <CardHeader className="pb-3 p-3 sm:p-4 md:p-6">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                  {recipientType === 'customer' ? (
                    <><User className="w-4 h-4" /> ลูกค้า</>
                  ) : (
                    <><Users className="w-4 h-4" /> พาร์ทเนอร์</>
                  )}
                </CardTitle>
                <div className="text-xs sm:text-sm text-muted-foreground">
                  {recipientType === 'customer' ? customer.name : selectedPartner?.name || 'ไม่ระบุ'}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
              <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm">
                <div className="p-2 bg-gray-50 rounded">
                  <div className="text-muted-foreground mb-0.5">ผู้เสนอราคา</div>
                  <div className="truncate">{company.name}</div>
                </div>
                {recipientType === 'partner' && mainProjectTag && (
                  <div className="p-2 bg-blue-50 rounded">
                    <div className="text-muted-foreground mb-0.5">Project Tag</div>
                    <Badge variant="secondary" className="text-[10px]">{mainProjectTag}</Badge>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* BOQ Items Table */}
          <BOQTableGrouped
            items={boqItems}
            onUpdate={handleUpdateItem}
            onRemove={handleRemove}
          />

          {/* Accordion Sections for Better Mobile UX */}
          <Accordion type="multiple" defaultValue={["discount", "notes", "summary"]} className="space-y-3">
            
            {/* Discount Section */}
            <AccordionItem value="discount" className="border rounded-lg bg-white shadow-sm">
              <AccordionTrigger className="px-3 sm:px-4 md:px-6 py-3 hover:no-underline">
                <div className="flex items-center gap-2 text-sm sm:text-base">
                  <Percent className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" />
                  <span>ส่วนลด</span>
                  {discount && (
                    <Badge variant="destructive" className="ml-2 text-[10px] sm:text-xs">
                      {discount.type === "percent" ? `${discount.value}%` : `฿${discount.value.toLocaleString()}`}
                    </Badge>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-3 sm:px-4 md:px-6 pb-4">
                <DiscountSection 
                  discount={discount}
                  totalBeforeDiscount={summary.grandTotal}
                  onUpdate={setDiscount}
                />
              </AccordionContent>
            </AccordionItem>

            {/* Notes & Payment Conditions */}
            <AccordionItem value="notes" className="border rounded-lg bg-white shadow-sm">
              <AccordionTrigger className="px-3 sm:px-4 md:px-6 py-3 hover:no-underline">
                <div className="flex items-center gap-2 text-sm sm:text-base">
                  <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                  <span>หมายเหตุ & เงื่อนไขชำระเงิน</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-3 sm:px-4 md:px-6 pb-4">
                <div className="space-y-4">
                  {/* Notes */}
                  <div>
                    <Label htmlFor="quotation-notes" className="text-xs sm:text-sm mb-1.5 block">
                      หมายเหตุ
                    </Label>
                    <Textarea
                      id="quotation-notes"
                      value={quotationNotes}
                      onChange={(e) => setQuotationNotes(e.target.value)}
                      placeholder="ระบุหมายเหตุเพิ่มเติม..."
                      rows={4}
                      className="text-sm"
                    />
                  </div>

                  {/* Payment Conditions */}
                  <div>
                    <Label htmlFor="payment-conditions" className="text-xs sm:text-sm mb-1.5 block">
                      เงื่อนไขการชำระเงิน
                    </Label>
                    <Textarea
                      id="payment-conditions"
                      value={paymentConditions}
                      onChange={(e) => setPaymentConditions(e.target.value)}
                      placeholder="ระบุเงื่อนไขการชำระเงิน..."
                      rows={4}
                      className="text-sm"
                    />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Summary Section */}
            <AccordionItem value="summary" className="border rounded-lg bg-gradient-to-br from-green-50 to-emerald-50 shadow-sm">
              <AccordionTrigger className="px-3 sm:px-4 md:px-6 py-3 hover:no-underline">
                <div className="flex items-center gap-2 text-sm sm:text-base">
                  <Receipt className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                  <span>สรุปใบเสนอราคา</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-3 sm:px-4 md:px-6 pb-4">
                <div className="space-y-3">
                  {/* Detailed Summary */}
                  <div className="grid gap-2 text-xs sm:text-sm">
                    <div className="flex justify-between p-2 sm:p-3 bg-white/70 rounded-lg">
                      <span>รวมค่าวัสดุ:</span>
                      <span>฿{(summary.materialTotal || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between p-2 sm:p-3 bg-white/70 rounded-lg">
                      <span>รวมค่าแรง:</span>
                      <span>฿{(summary.laborTotal || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between p-2 sm:p-3 bg-white/70 rounded-lg">
                      <span>รวมค่าอื่นๆ:</span>
                      <span>฿{(summary.miscTotal || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                    </div>
                    
                    <Separator className="my-1" />
                    
                    <div className="flex justify-between p-2 sm:p-3 bg-white/70 rounded-lg">
                      <span>รวม (ก่อนค่าอื่นๆ):</span>
                      <span>฿{(summary.subtotal || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                    </div>
                    
                    {profile.wastePercentage > 0 && (
                      <div className="flex justify-between p-2 sm:p-3 bg-amber-50 rounded-lg text-amber-800">
                        <span>ค่าของเสีย ({profile.wastePercentage}%):</span>
                        <span>฿{(summary.wasteAmount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}
                    
                    {profile.overheadPercentage > 0 && (
                      <div className="flex justify-between p-2 sm:p-3 bg-blue-50 rounded-lg text-blue-800">
                        <span>ค่าดำเนินการ ({profile.overheadPercentage}%):</span>
                        <span>฿{(summary.overheadAmount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}
                    
                    {profile.variancePercentage > 0 && (
                      <div className="flex justify-between p-2 sm:p-3 bg-purple-50 rounded-lg text-purple-800">
                        <span>ค่าคลาดเคลื่อน ({profile.variancePercentage}%):</span>
                        <span>฿{(summary.varianceAmount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}
                    
                    {profile.profitPercentage > 0 && (
                      <div className="flex justify-between p-2 sm:p-3 bg-green-50 rounded-lg text-green-800">
                        <span>กำไร ({profile.profitPercentage}%):</span>
                        <span>฿{(summary.profitAmount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}
                    
                    {profile.vatPercentage > 0 && (
                      <div className="flex justify-between p-2 sm:p-3 bg-indigo-50 rounded-lg text-indigo-800">
                        <span>VAT ({profile.vatPercentage}%):</span>
                        <span>฿{(summary.vatAmount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}
                    
                    <Separator className="my-1" />
                    
                    <div className="flex justify-between p-2 sm:p-3 bg-white rounded-lg">
                      <span className="font-medium">ราคาก่อนส่วนลด:</span>
                      <span className="text-base sm:text-lg">฿{(summary.grandTotal || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                    </div>
                    
                    {discount && (
                      <>
                        <div className="flex justify-between p-2 sm:p-3 bg-red-50 rounded-lg text-red-600">
                          <span>ส่วนลด {discount.type === "percent" ? `(${discount.value}%)` : ""}:</span>
                          <span className="text-base sm:text-lg">- ฿{(summary.discountAmount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                        </div>
                        {discount.description && (
                          <div className="px-2 sm:px-3 text-xs text-muted-foreground">
                            💡 {discount.description}
                          </div>
                        )}
                      </>
                    )}
                    
                    <Separator className="my-2" />
                    
                    {/* Grand Total */}
                    <div className="p-3 sm:p-4 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg text-white shadow-lg">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="text-xs opacity-90 mb-0.5">ยอดรวมสุทธิ</div>
                          <div className="text-xl sm:text-2xl md:text-3xl">
                            ฿{(summary.totalAfterDiscount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                        <DollarSign className="w-8 h-8 sm:w-10 sm:h-10 opacity-50" />
                      </div>
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* Action Buttons - Sticky on Mobile */}
          <div className="sticky bottom-0 left-0 right-0 bg-white border-t shadow-lg p-3 sm:p-4 -mx-3 sm:-mx-4 md:mx-0 md:relative md:border-0 md:shadow-none md:bg-transparent z-10">
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Back Button */}
              <Button
                variant="outline"
                onClick={onBack}
                className="gap-2 order-3 sm:order-1 h-12 sm:h-14 text-base sm:text-lg px-6"
              >
                <ArrowLeft className="h-5 w-5" />
                <span className="hidden sm:inline">กลับไป BOQ</span>
                <span className="sm:hidden">กลับ</span>
              </Button>

              {/* Save Button */}
              <Button
                onClick={handleSaveQuotation}
                disabled={isSaving || boqItems.length === 0}
                variant="outline"
                className="gap-2 flex-1 order-2 h-12 sm:h-14 text-base sm:text-lg px-6"
              >
                <Save className="h-5 w-5" />
                {isSaving ? "กำลังบันทึก..." : isSaved ? "✓ บันทึกแล้ว" : "บันทึก"}
              </Button>

              {/* Confirm Button - EXTRA LARGE */}
              <Button
                onClick={handleConfirm}
                disabled={isSaving || boqItems.length === 0}
                className="gap-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 flex-1 sm:flex-[2] order-1 sm:order-3 h-14 sm:h-16 text-base sm:text-xl px-8 shadow-xl hover:shadow-2xl transition-all duration-200 font-medium"
              >
                {isSaving ? (
                  <span className="text-lg">กำลังบันทึก...</span>
                ) : (
                  <>
                    <span className="hidden md:inline">ยืนยันและไปขั้นตอนถัดไป</span>
                    <span className="hidden sm:inline md:hidden">ยืนยันไปต่อ</span>
                    <span className="sm:hidden">ยืนยันใบเสนอราคา</span>
                    <ArrowRight className="h-5 w-5 sm:h-6 sm:w-6" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}