import { BankInfoSection } from "../components/BankInfoSection";
import { PaymentTermsSection } from "../components/PaymentTermsSection";
import { BOQSummary } from "../components/BOQSummary";
import { BOQItem, Profile, CompanyInfo, CustomerInfo, Discount, PaymentTerms, BankInfo, BOQSummary as BOQSummaryType } from "../types/boq";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Receipt, ArrowRight, ArrowLeft, User, Users } from "lucide-react";
import { toast } from "sonner@2.0.3";
import { calculateBOQSummaryWithTax, calculateBalancedPaymentTerms, validatePaymentBalance } from "../utils/calculations";
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
  // ✅ Use centralized calculation with Decimal.js
  const calculateSummary = (): BOQSummaryType & { 
    discountAmount: number; 
    totalAfterDiscount: number;
    withholdingTaxAmount: number;
    netPayable: number;
  } => {
    return calculateBOQSummaryWithTax(boqItems, profile, discount, withholdingTaxRate);
  };

  const handleConfirm = () => {
    if (!bankInfo || !bankInfo.bankName || !bankInfo.accountName || !bankInfo.accountNumber) {
      toast.error("กรุณากรอกข้อมูลธนาคารให้ครบถ้วน");
      return;
    }

    // ✅ Check payment terms balance with improved validation
    if (paymentTerms && paymentTerms.terms.length > 0) {
      const balancedAmounts = calculateBalancedPaymentTerms(
        summary.totalAfterDiscount, 
        paymentTerms.terms
      );
      
      const validation = validatePaymentBalance(
        summary.totalAfterDiscount,
        balancedAmounts
      );

      if (!validation.balanced) {
        toast.error(
          `ยอดแบ่งงวดไม่สมดุล (${validation.difference > 0 ? 'ขาด' : 'เกิน'} ${Math.abs(validation.difference).toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท) กรุณาคลิก "ปรับให้ลงตัว" หรือปรับจำนวนเอง`,
          { duration: 5000 }
        );
        return;
      }
    }

    toast.success("✅ ใบวางบิลเสร็จสมบูรณ์");
    onNext();
  };

  // Calculate summary
  const summary = calculateSummary();

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 pb-20">
      {/* Page Header */}
      <div className="bg-gradient-to-r from-orange-600 to-amber-600 text-white p-4 sm:p-6 md:p-8 shadow-xl">
        <div className="container mx-auto">
          <div className="flex items-center gap-3 sm:gap-4 mb-3">
            <div className="p-2 sm:p-3 bg-white/20 rounded-lg backdrop-blur-sm shrink-0">
              <Receipt className="h-6 w-6 sm:h-8 sm:w-8" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl md:text-3xl mb-1 truncate">ใบวางบิล (Invoice)</h1>
              <p className="text-xs sm:text-sm text-orange-100 line-clamp-2">Invoice - Step 3 of 4</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs sm:text-sm flex-wrap">
            <span className="opacity-75 hidden sm:inline">BOQ</span>
            <span className="opacity-75 hidden sm:inline">→</span>
            <span className="opacity-75 hidden sm:inline">ใบเสนอราคา</span>
            <span className="opacity-75 hidden sm:inline">→</span>
            <div className="px-2 sm:px-3 py-1 bg-white/20 rounded-full backdrop-blur-sm">
              Step 3 of 4
            </div>
            <span className="opacity-75 hidden sm:inline">→</span>
            <span className="opacity-75 hidden sm:inline">ใบเสร็จ</span>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-6 md:py-8">
        <div id="invoice-content" className="grid gap-4 sm:gap-6">
          {/* Project Info */}
          <Card className="p-4 sm:p-6 bg-white/80 backdrop-blur-sm shadow-lg border-orange-100">
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
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
          <BankInfoSection 
            value={{
              bankCode: bankInfo?.bankName as any || "",
              accountName: bankInfo?.accountName || "",
              accountNumber: bankInfo?.accountNumber || "",
              branch: bankInfo?.branch || "",
              qrCodeUrl: bankInfo?.qrCodeUrl
            }}
            onChange={(account) => {
              setBankInfo({
                bankName: account.bankCode,
                accountName: account.accountName,
                accountNumber: account.accountNumber,
                branch: account.branch,
                qrCodeUrl: account.qrCodeUrl
              });
            }}
          />

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

            {paymentTerms && paymentTerms.terms.length > 0 && (() => {
              const balancedAmounts = calculateBalancedPaymentTerms(
                summary.totalAfterDiscount,
                paymentTerms.terms
              );
              const validation = validatePaymentBalance(
                summary.totalAfterDiscount,
                balancedAmounts
              );

              return (
                <Card className="p-6 bg-gradient-to-br from-orange-50 to-red-50 border-orange-200 shadow-lg">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent text-xl">
                      สรุปแผนชำระเงิน
                    </h3>
                    {validation.balanced && (
                      <Badge className="bg-green-500 text-white">
                        ✓ สมดุล
                      </Badge>
                    )}
                  </div>
                  <div className="space-y-2 mb-4">
                    {paymentTerms.terms.map((term, index) => {
                      const amount = balancedAmounts[index] || 0;
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
                      <span className={`font-semibold ${validation.balanced ? 'text-green-600' : 'text-orange-600'}`}>
                        ฿{validation.totalAllocated.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    {!validation.balanced && (
                      <div className="text-xs text-center mt-2 text-orange-700">
                        ⚠️ ต่างจากยอดรวม {Math.abs(validation.difference).toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท
                      </div>
                    )}
                  </div>
                </Card>
              );
            })()}
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