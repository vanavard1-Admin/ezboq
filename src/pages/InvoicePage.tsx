import { BankInfoSection } from "../components/BankInfoSection";
import { PaymentTermsSection } from "../components/PaymentTermsSection";
import { BOQSummary } from "../components/BOQSummary";
import { BOQItem, Profile, CompanyInfo, CustomerInfo, Discount, PaymentTerms, BankInfo, BOQSummary as BOQSummaryType } from "../types/boq";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Receipt, ArrowRight, ArrowLeft, User, Users } from "lucide-react";
import { toast } from "sonner@2.0.3";
import { calculateBOQSummaryWithTax } from "../utils/calculations";
import { Separator } from "../components/ui/separator";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";

interface InvoicePageProps {
  boqItems: BOQItem[];
  profile: Profile;
  projectTitle: string;
  company: CompanyInfo;
  customer: CustomerInfo;
  discount: Discount | null;
  bankInfo: BankInfo | null;
  setBankInfo: (info: BankInfo | null) => void;
  paymentTerms: PaymentTerms | null;
  setPaymentTerms: (terms: PaymentTerms | null) => void;
  onNext: () => void;
  onBack: () => void;
  
  // Partner support
  recipientType?: 'customer' | 'partner';
  selectedPartner?: any;
  mainProjectTag?: string;
  
  // Withholding Tax
  withholdingTaxRate?: number;
  setWithholdingTaxRate?: (rate: number) => void;
  withholdingTaxType?: string;
  setWithholdingTaxType?: (type: string) => void;
}

export function InvoicePage({
  boqItems,
  profile,
  projectTitle,
  company,
  customer,
  discount,
  bankInfo,
  setBankInfo,
  paymentTerms,
  setPaymentTerms,
  onNext,
  onBack,
  recipientType = 'customer',
  selectedPartner,
  mainProjectTag,
  withholdingTaxRate = 0,
  setWithholdingTaxRate,
  withholdingTaxType = '',
  setWithholdingTaxType,
}: InvoicePageProps) {
  const calculateSummary = (): BOQSummaryType & { 
    discountAmount: number; 
    totalAfterDiscount: number;
    withholdingTaxAmount: number;
    netPayable: number;
  } => {
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
    
    // Calculate Withholding Tax (หัก ณ ที่จ่าย)
    const withholdingTaxAmount = totalBeforeVat * (withholdingTaxRate / 100);
    const netPayable = totalAfterDiscount - withholdingTaxAmount;

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
      withholdingTaxAmount,
      netPayable,
    };
  };

  const handleConfirm = () => {
    if (!bankInfo || !bankInfo.bankName || !bankInfo.accountName || !bankInfo.accountNumber) {
      toast.error("กรุณากรอกข้อมูลธนาคารให้ครบถ้วน");
      return;
    }

    // Check payment terms balance
    if (paymentTerms && paymentTerms.terms.length > 0) {
      const totalAllocated = paymentTerms.terms.reduce((sum, term) => {
        const amount = term.percentage !== undefined 
          ? summary.totalAfterDiscount * (term.percentage / 100)
          : term.amount || 0;
        return sum + amount;
      }, 0);

      const remaining = summary.totalAfterDiscount - totalAllocated;
      if (Math.abs(remaining) > 0.01) {
        toast.error("ยอดแบ่งงวดไม่สมดุล กรุณาตรวจสอบอีกครั้ง");
        return;
      }
    }

    toast.success("ใบวางบิลเสร็จสมบูรณ์");
    onNext();
  };

  // Calculate summary
  const summary = calculateSummary();

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-pink-50 pb-20">
      {/* Page Header */}
      <div className="bg-gradient-to-r from-orange-600 to-red-600 text-white p-8 shadow-xl">
        <div className="container mx-auto">
          <div className="flex items-center gap-4 mb-3">
            <div className="p-3 bg-white/20 rounded-lg backdrop-blur-sm">
              <Receipt className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-3xl mb-1">ใบวางบิล (Invoice)</h1>
              <p className="text-orange-100">ขั้นตอนที่ 3: จัดการแผนชำระเงินและข้อมูลธนาคาร</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="opacity-75">BOQ</span>
            <span className="opacity-75">→</span>
            <span className="opacity-75">ใบเสนอราคา</span>
            <span className="opacity-75">→</span>
            <div className="px-3 py-1 bg-white/20 rounded-full backdrop-blur-sm">
              Step 3 of 4
            </div>
            <span className="opacity-75">→</span>
            <span className="opacity-75">ใบเสร็จ</span>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        <div id="invoice-content" className="grid gap-6">
          {/* Project Info */}
          <Card className="p-6 bg-white/80 backdrop-blur-sm shadow-lg border-orange-100">
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <div className="text-sm text-muted-foreground mb-1">โครงการ</div>
                <div className="text-xl">{projectTitle}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1 flex items-center gap-2">
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
                <div className="text-lg">
                  {recipientType === 'customer' ? customer.name : selectedPartner?.name || 'ไม่ระบุ'}
                </div>
                {recipientType === 'partner' && mainProjectTag && (
                  <Badge variant="secondary" className="mt-1">
                    {mainProjectTag}
                  </Badge>
                )}
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">ยอดรวมสุทธิ</div>
                <div className="text-2xl bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                  ฿{summary.totalAfterDiscount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          </Card>

          {/* Bank Info */}
          <BankInfoSection bankInfo={bankInfo} onUpdate={setBankInfo} />

          <Separator />

          {/* Payment Terms */}
          <PaymentTermsSection
            paymentTerms={paymentTerms}
            grandTotal={summary.totalAfterDiscount}
            onUpdate={setPaymentTerms}
          />

          <Separator />

          {/* Withholding Tax Section (for Partners) */}
          {recipientType === 'partner' && setWithholdingTaxRate && setWithholdingTaxType && (
            <>
              <Card className="p-6 bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200 shadow-lg">
                <h3 className="mb-4 bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent text-xl flex items-center gap-2">
                  <Receipt className="w-6 h-6 text-amber-600" />
                  หัก ณ ที่จ่าย (Withholding Tax)
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  สำหรับการจ้างพาร์ทเนอร์/ช่าง ในนามบริษัท
                </p>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="withholdingRate">อัตราหัก ณ ที่จ่าย (%)</Label>
                    <Input
                      id="withholdingRate"
                      type="number"
                      value={withholdingTaxRate}
                      onChange={(e) => setWithholdingTaxRate(Number(e.target.value))}
                      placeholder="3"
                      min="0"
                      max="100"
                      step="0.1"
                      className="bg-white"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      ทั่วไป: 3% (บริการ), 5% (โฆษณา), 1% (ขนส่ง)
                    </p>
                  </div>
                  
                  <div>
                    <Label htmlFor="withholdingType">ประเภท</Label>
                    <select
                      id="withholdingType"
                      value={withholdingTaxType}
                      onChange={(e) => setWithholdingTaxType(e.target.value)}
                      className="w-full h-10 rounded-md border border-input bg-white px-3 py-2 text-sm"
                    >
                      <option value="">เลือกประเภท</option>
                      <option value="ภ.ง.ด.3">ภ.ง.ด.3 (นิติบุคคล)</option>
                      <option value="ภ.ง.ด.53">ภ.ง.ด.53 (บุคคลธรรมดา)</option>
                      <option value="ภ.ง.ด.54">ภ.ง.ด.54 (ไม่มีสถานประกอบการ)</option>
                    </select>
                  </div>
                </div>
                
                {withholdingTaxRate > 0 && (
                  <div className="mt-4 p-4 bg-white rounded-lg border border-amber-200">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">ยอดหัก ณ ที่จ่าย ({withholdingTaxRate}%)</span>
                      <span className="text-lg text-red-600">
                        -฿{summary.withholdingTaxAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mt-2 pt-2 border-t">
                      <span className="font-semibold">ยอดจ่ายสุทธิ (หลังหัก ณ ฯ)</span>
                      <span className="text-xl text-green-600 font-semibold">
                        ฿{summary.netPayable.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                )}
              </Card>
              
              <Separator />
            </>
          )}

          {/* Summary */}
          <div className="grid lg:grid-cols-2 gap-6">
            <BOQSummary summary={summary} />

            {paymentTerms && paymentTerms.terms.length > 0 && (
              <Card className="p-6 bg-gradient-to-br from-orange-50 to-red-50 border-orange-200 shadow-lg">
                <h3 className="mb-4 bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent text-xl">
                  สรุปแผนชำระเงิน
                </h3>
                <div className="space-y-2 mb-4">
                  {paymentTerms.terms.map((term) => {
                    const amount = term.percentage !== undefined 
                      ? summary.totalAfterDiscount * (term.percentage / 100)
                      : term.amount || 0;
                    return (
                      <div key={term.id} className="flex justify-between p-3 bg-white/70 rounded-lg">
                        <div>
                          <span className="font-medium">งวดที่ {term.installment}:</span>
                          <span className="text-sm text-muted-foreground ml-2">{term.description}</span>
                        </div>
                        <span className="font-semibold">
                          ฿{amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="pt-3 border-t border-orange-300">
                  <div className="flex justify-between text-lg">
                    <span>รวมทั้งหมด:</span>
                    <span className="font-semibold">
                      ฿{summary.totalAfterDiscount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </Card>
            )}
          </div>

          {/* Navigation */}
          <Separator />
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={onBack}
              size="lg"
              className="gap-2 px-8 py-6 text-lg"
            >
              <ArrowLeft className="h-5 w-5" />
              กลับไปใบเสนอราคา
            </Button>
            <Button
              onClick={handleConfirm}
              size="lg"
              className="gap-2 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 px-8 py-6 text-lg"
            >
              ยืนยันใบวางบิลและไปขั้นตอนถัดไป
              <ArrowRight className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
