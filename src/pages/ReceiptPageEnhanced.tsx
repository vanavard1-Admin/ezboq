import { useState, useEffect, useMemo } from "react";
import { motion } from "motion/react";
import { TaxInvoiceSection } from "../components/TaxInvoiceSection";
import { BOQSummary } from "../components/BOQSummary";
import { SignatureSection } from "../components/SignatureSection";
import { BOQItem, Profile, CompanyInfo, CustomerInfo, Discount, PaymentTerms, PaymentTerm, BankInfo, TaxInvoice, BOQSummary as BOQSummaryType, Document } from "../types/boq";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { 
  FileSpreadsheet, 
  ArrowLeft, 
  Download, 
  FileText, 
  Save, 
  CheckCircle,
  Receipt as ReceiptIcon,
  Calendar,
  DollarSign,
  User,
  Users
} from "lucide-react";
import { toast } from "sonner@2.0.3";
import { Separator } from "../components/ui/separator";
import { Badge } from "../components/ui/badge";
import { Checkbox } from "../components/ui/checkbox";
import { projectId, publicAnonKey } from "../utils/supabase/info";
import { exportWorkflowToPDF } from "../utils/pdfExport";
import { calculateBOQSummaryWithTax, formatCurrency } from "../utils/calculations";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../components/ui/dialog";

interface ReceiptPageProps {
  boqItems: BOQItem[];
  profile: Profile;
  projectTitle: string;
  projectDescription: string;
  projectLocation: string;
  company: CompanyInfo;
  customer: CustomerInfo;
  discount: Discount | null;
  bankInfo: BankInfo | null;
  paymentTerms: PaymentTerms | null;
  setPaymentTerms: (terms: PaymentTerms | null) => void;
  taxInvoice: TaxInvoice;
  setTaxInvoice: (invoice: TaxInvoice) => void;
  onBack: () => void;
  
  // Partner support
  recipientType?: 'customer' | 'partner';
  selectedPartner?: any;
  mainProjectTag?: string;
  
  // Withholding Tax
  withholdingTaxRate?: number;
  withholdingTaxType?: string;
  
  // Selected installment for export
  setSelectedInstallmentForExport?: (installment: number | null) => void;
}

export function ReceiptPageEnhanced({
  boqItems,
  profile,
  projectTitle,
  projectDescription,
  projectLocation,
  company,
  customer,
  discount,
  bankInfo,
  paymentTerms,
  setPaymentTerms,
  taxInvoice,
  setTaxInvoice,
  onBack,
  recipientType = 'customer',
  selectedPartner,
  mainProjectTag,
  withholdingTaxRate = 0,
  withholdingTaxType = '',
  setSelectedInstallmentForExport,
}: ReceiptPageProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [selectedInstallment, setSelectedInstallment] = useState<number | null>(null);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [signatures, setSignatures] = useState<import("../types/boq").Signature[]>([
    { type: "proposer", name: "", position: "", signatureUrl: undefined },
    { type: "customer", name: "", position: "", signatureUrl: undefined },
    { type: "witness", name: "", position: "", signatureUrl: undefined },
  ]);

  // Auto-generate document numbers on component mount
  useEffect(() => {
    const generateDocNumber = () => {
      const year = new Date().getFullYear();
      const month = String(new Date().getMonth() + 1).padStart(2, '0');
      const randomPart = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
      
      const invoiceNumber = `INV-${year}-${month}-${randomPart}`;
      const receiptNumber = `RCP-${year}-${month}-${randomPart}`;
      
      if (!taxInvoice.invoiceNumber || taxInvoice.invoiceNumber.startsWith('INV-2025-0001') || taxInvoice.invoiceNumber.startsWith('INV-2024')) {
        setTaxInvoice({
          ...taxInvoice,
          invoiceNumber,
          receiptNumber,
        });
      }
    };
    
    generateDocNumber();
  }, []);

  const summary = calculateBOQSummaryWithTax(boqItems, profile, discount, withholdingTaxRate);

  const handleMarkAsPaid = (installmentNumber: number) => {
    setSelectedInstallment(installmentNumber);
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setIsPaymentDialogOpen(true);
  };

  const confirmPayment = () => {
    if (!paymentTerms || selectedInstallment === null) return;

    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const randomPart = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
    const receiptNumber = `RCP-${year}-${month}-${randomPart}-${selectedInstallment}`;

    const updatedTerms: PaymentTerms = {
      ...paymentTerms,
      terms: paymentTerms.terms.map(term => 
        term.installment === selectedInstallment
          ? { 
              ...term, 
              status: 'paid' as const, 
              isPaid: true,
              paidDate: paymentDate, 
              paidAmount: term.amount, // ยอดที่ชำระ = ยอดของงวด
              receiptNumber 
            }
          : term
      ),
    };

    setPaymentTerms(updatedTerms);
    setIsPaymentDialogOpen(false);
    toast.success(`บันทึกการชำระงวดที่ ${selectedInstallment} สำเร็จ!`, {
      description: `เลขที่ใบเสร็จ: ${receiptNumber}`,
    });
  };

  const handleSaveDocument = async () => {
    if (!taxInvoice.invoiceNumber) {
      toast.error("กรุณากรอกเลขที่ใบกำกับภาษี");
      return;
    }

    if (!taxInvoice.receiptNumber) {
      toast.error("กรุณากรอกเลขที่ใบเสร็จ");
      return;
    }

    setIsSaving(true);

    try {

      const document: Document = {
        id: `doc-${Date.now()}`,
        documentNumber: taxInvoice.invoiceNumber,
        type: "receipt",
        status: "sent",
        projectTitle,
        projectDescription,
        projectLocation,
        customerId: recipientType === 'customer' ? (customer.id || "default-customer") : undefined,
        customerName: recipientType === 'customer' ? customer.name : undefined,
        partnerId: recipientType === 'partner' ? selectedPartner?.id : undefined,
        partnerName: recipientType === 'partner' ? selectedPartner?.name : undefined,
        recipientType: recipientType,
        mainProjectTag: recipientType === 'partner' ? mainProjectTag : undefined,
        totalAmount: summary.totalAfterDiscount,
        withholdingTaxRate: withholdingTaxRate,
        withholdingTaxType: withholdingTaxType,
        withholdingTaxAmount: summary.withholdingTaxAmount,
        netPayable: summary.netPayable,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        boqItems,
        profile,
        company,
        customer: recipientType === 'customer' ? customer : undefined,
        partner: recipientType === 'partner' ? selectedPartner : undefined,
        discount,
        bankInfo,
        paymentTerms,
        taxInvoice,
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
        toast.success("บันทึกเอกสารสำเร็จ!", {
          description: `เลขที่ ${taxInvoice.invoiceNumber}`,
        });
      } else {
        throw new Error("Failed to save document");
      }
    } catch (error) {
      console.error("Save document failed:", error);
      toast.error("ไม่สามารถบันทึกเอกสารได้");
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportReceiptForInstallment = async (installmentNumber: number) => {
    const term = paymentTerms?.terms.find(t => t.installment === installmentNumber);
    if (!term || !term.receiptNumber) {
      toast.error("กรุณาบันทึกการชำระก่อน");
      return;
    }

    console.log('🎯 Starting export for installment:', installmentNumber);
    console.log('🎯 Term data:', {
      installment: term.installment,
      amount: term.amount,
      paidAmount: term.paidAmount,
      isPaid: term.isPaid,
      status: term.status,
      receiptNumber: term.receiptNumber,
      paidDate: term.paidDate
    });

    // Set selected installment for PDF rendering (both local and global)
    setSelectedInstallment(installmentNumber);
    if (setSelectedInstallmentForExport) {
      setSelectedInstallmentForExport(installmentNumber);
    }
    
    // Wait longer for React to re-render and DOM to update
    await new Promise(resolve => setTimeout(resolve, 500));

    try {
      const loadingToast = toast.loading(`กำลังสร้างใบเสร็จงวดที่ ${installmentNumber}...`);
      
      // Export PDF for specific installment with installment number parameter
      await exportWorkflowToPDF(
        projectTitle,
        "receipt",
        undefined,
        installmentNumber
      );
      
      // Dismiss loading toast
      toast.dismiss(loadingToast);
      
      const amount = calculateInstallmentAmount(term);
      toast.success(`🎉 Export ใบเสร็จงวดที่ ${installmentNumber} สำเร็จ!`, {
        description: `จำนวนเงิน ${formatCurrency(amount)} | เลขที่ ${term.receiptNumber}`,
      });
    } catch (error) {
      console.error("Failed to export receipt:", error);
      toast.error("ไม่สามารถ Export ใบเสร็จได้");
    } finally {
      setSelectedInstallment(null);
      if (setSelectedInstallmentForExport) {
        setSelectedInstallmentForExport(null);
      }
    }
  };

  const handleExportPDF = async () => {
    if (!taxInvoice.invoiceNumber) {
      toast.error("กรุณากรอกเลขที่ใบกำกับภาษี");
      return;
    }

    try {
      // Debug: Check if elements exist before export
      console.log('🔍 Checking for export elements...');
      const receiptElement = document.getElementById('receipt-export-section');
      console.log('Receipt element found:', !!receiptElement);
      
      if (!receiptElement) {
        console.error('❌ Receipt element not found in DOM!');
        console.log('Available elements:', Array.from(document.querySelectorAll('[id*="export-section"]')).map(el => el.id));
        
        // Wait a bit and try again
        await new Promise(resolve => setTimeout(resolve, 500));
        const retryElement = document.getElementById('receipt-export-section');
        if (!retryElement) {
          throw new Error('ไม่พบส่วน export ใบเสร็จ - กรุณาลองใหม่อีกครั้ง');
        }
      }
      
      let toastId: string | number | undefined;
      
      await exportWorkflowToPDF(projectTitle, "receipt", (progress) => {
        if (toastId) {
          toast.dismiss(toastId);
        }
        toastId = toast.loading(`กำลังสร้าง PDF... (${progress.current}/${progress.total}) - ${progress.documentName}`, {
          description: `กำลังประมวลผล ${progress.documentName}`,
        });
      });
      
      if (toastId) {
        toast.dismiss(toastId);
      }
      
      toast.success("Export PDF สำเร็จ! 🎉", {
        description: "ดาวน์โหลดไฟล์ใบกำกับภาษี/ใบเสร็จรับเงินแล้ว",
        duration: 5000,
      });
    } catch (error) {
      console.error("PDF export failed:", error);
      toast.error("ไม่สามารถ Export PDF ได้", {
        description: error instanceof Error ? error.message : "กรุณาตรวจสอบข้อมูลและลองใหม่อีกครั้ง",
      });
    }
  };

  const handleExportAllDocuments = async () => {
    if (!taxInvoice.invoiceNumber) {
      toast.error("กรุณากรอกเลขที่ใบกำกับภาษี");
      return;
    }

    try {
      let toastId: string | number | undefined;
      
      // Export all document types
      await exportWorkflowToPDF(projectTitle, "all", (progress) => {
        if (toastId) {
          toast.dismiss(toastId);
        }
        toastId = toast.loading(`กำลังสร้าง PDF... (${progress.current}/${progress.total}) - ${progress.documentName}`, {
          description: `กำลังประมวลผล ${progress.documentName}`,
        });
      });
      
      if (toastId) {
        toast.dismiss(toastId);
      }
      
      toast.success("ส่งออกเอกสารทั้งชุดสำเร็จ! 🎉", {
        description: "ดาวน์โหลดไฟล์ BOQ, ใบเสนอราคา, ใบวางบิล และใบเสร็จแล้ว",
        duration: 5000,
      });
    } catch (error) {
      console.error("PDF export all failed:", error);
      toast.error("ไม่สามารถ Export เอกสารทั้งหมดได้", {
        description: error instanceof Error ? error.message : "กรุณาตรวจสอบข้อมูลและลองใหม่อีกครั้ง",
      });
    }
  };

  const calculateInstallmentAmount = (term: PaymentTerm): number => {
    return term.percentage !== undefined 
      ? summary.totalAfterDiscount * (term.percentage / 100)
      : term.amount || 0;
  };

  // Use useMemo to recalculate when paymentTerms changes
  const totalPaid = useMemo(() => {
    if (!paymentTerms || !paymentTerms.terms) return 0;
    
    return paymentTerms.terms
      .filter(t => t.status === 'paid')
      .reduce((sum, t) => {
        const amount = t.percentage !== undefined 
          ? summary.totalAfterDiscount * (t.percentage / 100)
          : t.amount || 0;
        return sum + amount;
      }, 0);
  }, [paymentTerms, summary.totalAfterDiscount]);

  const totalPending = useMemo(() => {
    return summary.totalAfterDiscount - totalPaid;
  }, [summary.totalAfterDiscount, totalPaid]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 pb-20">
      {/* Page Header */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white p-8 shadow-xl">
        <div className="container mx-auto">
          <div className="flex items-center gap-4 mb-3">
            <div className="p-3 bg-white/20 rounded-lg backdrop-blur-sm">
              <ReceiptIcon className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-3xl mb-1">ใบกำกับภาษี/ใบเสร็จ (Tax Invoice/Receipt)</h1>
              <p className="text-green-100">ขั้นตอนที่ 4: จัดการใบกำกับภาษีและใบเสร็จรับเงิน</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="opacity-75">BOQ</span>
            <span className="opacity-75">→</span>
            <span className="opacity-75">ใบเสนอราคา</span>
            <span className="opacity-75">→</span>
            <span className="opacity-75">ใบวางบิล</span>
            <span className="opacity-75">→</span>
            <div className="px-3 py-1 bg-white/20 rounded-full backdrop-blur-sm">
              Step 4 of 4
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        <div id="receipt-content" className="grid gap-6">
          {/* Project Summary */}
          <Card className="p-6 bg-white/80 backdrop-blur-sm shadow-lg border-green-100">
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
                <div className="text-2xl bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                  {formatCurrency(summary.totalAfterDiscount)}
                </div>
              </div>
            </div>
          </Card>

          {/* Payment Installments Management */}
          {paymentTerms && paymentTerms.terms.length > 0 && (
            <Card 
              key={`payment-${paymentTerms.terms.filter(t => t.status === 'paid').length}`}
              className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 shadow-lg"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                  สถานะการชำระเงินตามงวด
                </h3>
                <div className="flex gap-2" key={`badges-${totalPaid}`}>
                  <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                    ชำระแล้ว: {formatCurrency(totalPaid)}
                  </Badge>
                  <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-300">
                    คงเหลือ: {formatCurrency(totalPending)}
                  </Badge>
                </div>
              </div>

              <div className="space-y-3">
                {paymentTerms.terms.map((term) => {
                  const amount = calculateInstallmentAmount(term);
                  return (
                    <motion.div
                      key={term.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-4 rounded-lg border-2 ${
                        term.status === 'paid'
                          ? 'bg-green-50 border-green-300'
                          : 'bg-white border-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-lg font-semibold">
                              งวดที่ {term.installment}:
                            </span>
                            <span className="text-muted-foreground">{term.description}</span>
                            {term.status === 'paid' && (
                              <Badge className="gap-1 bg-green-500">
                                <CheckCircle className="w-3 h-3" />
                                ชำระแล้ว
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <DollarSign className="w-4 h-4" />
                              {formatCurrency(amount)}
                            </div>
                            {term.paidDate && (
                              <div className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                ชำระวันที่: {new Date(term.paidDate).toLocaleDateString('th-TH')}
                              </div>
                            )}
                            {term.receiptNumber && (
                              <div className="text-xs bg-green-100 px-2 py-1 rounded">
                                เลขที่ใบเสร็จ: {term.receiptNumber}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {term.status !== 'paid' ? (
                            <Button
                              onClick={() => handleMarkAsPaid(term.installment)}
                              size="sm"
                              className="gap-2 bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle className="w-4 h-4" />
                              บันทึกการชำระ
                            </Button>
                          ) : (
                            <Button
                              onClick={() => handleExportReceiptForInstallment(term.installment)}
                              size="sm"
                              variant="outline"
                              className="gap-2"
                            >
                              <Download className="w-4 h-4" />
                              Export ใบเสร็จงวดนี้
                            </Button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </Card>
          )}

          <Separator />

          {/* Tax Invoice & Payment Summary Section */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Tax Invoice Form */}
            <TaxInvoiceSection 
              taxInvoice={taxInvoice} 
              grandTotal={summary.totalAfterDiscount}
              onUpdate={setTaxInvoice} 
            />

            {/* Payment Summary Card - Shows payment status from installments */}
            <Card 
              key={`summary-${totalPaid}-${totalPending}`}
              className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 shadow-lg h-fit"
            >
              <h3 className="mb-4 bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent text-xl">
                สถานะการชำระเงิน
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                ข้อมูลจากการแบ่งงวดชำระ
              </p>
              
              <div className="space-y-3" key={`amounts-${totalPaid}`}>
                <div className="flex justify-between items-center p-3 bg-white rounded-lg border">
                  <span className="text-sm text-muted-foreground">ยอดรวมทั้งหมด</span>
                  <span className="text-lg font-semibold">
                    ฿{summary.totalAfterDiscount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                
                <div className="flex justify-between items-center p-3 bg-green-100 rounded-lg border border-green-300">
                  <span className="text-sm text-green-700 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    ชำระแล้ว
                  </span>
                  <span className="text-lg font-semibold text-green-600" key={totalPaid}>
                    ฿{totalPaid.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                
                <div className="flex justify-between items-center p-3 bg-orange-100 rounded-lg border border-orange-300">
                  <span className="text-sm text-orange-700">คงเหลือ</span>
                  <span className="text-lg font-semibold text-orange-600" key={totalPending}>
                    ฿{totalPending.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
              
              <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-xs text-blue-700">
                  ⚠️ หมายเหตุ: ใบกำกับภาษีจะถูกออกให้เฉพาะลูกค้าที่เป็นนิติบุคคล
                </p>
              </div>
            </Card>
          </div>

          <Separator />

          {/* Bank Info & Export Section */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Bank Info Display */}
            {bankInfo && (
              <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 shadow-lg">
                <h3 className="mb-4 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent text-xl">
                  ข้อมูลบัญชีธนาคาร
                </h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">ธนาคาร:</span>{" "}
                    <span className="font-semibold">{bankInfo.bankName}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">ชื่อบัญชี:</span>{" "}
                    <span className="font-semibold">{bankInfo.accountName}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">เลขที่บัญชี:</span>{" "}
                    <span className="font-mono font-semibold">{bankInfo.accountNumber}</span>
                  </div>
                  {bankInfo.qrCodeUrl && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-sm text-muted-foreground mb-2">QR Code พร้อมเพย์:</p>
                      <img 
                        src={bankInfo.qrCodeUrl} 
                        alt="QR Code" 
                        className="w-40 h-40 mx-auto rounded-lg shadow-md"
                      />
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Export Actions Card */}
            <Card className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200 shadow-lg">
              <h3 className="mb-4 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent text-xl">
                ดำเนินการ
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                บันทึกและส่งออกเอกสาร
              </p>
              
              <div className="space-y-3">
                <Button
                  onClick={handleSaveDocument}
                  size="lg"
                  variant="outline"
                  className="w-full gap-2 py-6"
                  disabled={isSaving || isSaved}
                >
                  {isSaved ? (
                    <>
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      บันทึกแล้ว
                    </>
                  ) : (
                    <>
                      <Save className="h-5 w-5" />
                      {isSaving ? "กำลังบันทึก..." : "บันทึกเอกสาร"}
                    </>
                  )}
                </Button>
                
                <Button
                  onClick={handleExportPDF}
                  size="lg"
                  className="w-full gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 py-6"
                >
                  <Download className="h-5 w-5" />
                  ส่งออก PDF (ใบกำกับภาษี/ใบเสร็จ)
                </Button>
                
                <Button
                  onClick={handleExportAllDocuments}
                  size="lg"
                  variant="outline"
                  className="w-full gap-2 py-6 border-2 border-blue-500 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                >
                  <FileSpreadsheet className="h-5 w-5" />
                  ส่งออกเอกสารทั้งชุด (BOQ - ใบเสร็จ)
                </Button>
              </div>
            </Card>
          </div>

          {/* Navigation */}
          <Separator />
          <div className="flex justify-center">
            <Button
              variant="outline"
              onClick={onBack}
              size="lg"
              className="gap-2 px-8 py-6 text-lg"
            >
              <ArrowLeft className="h-5 w-5" />
              กลับไปใบวางบิล
            </Button>
          </div>
        </div>
      </div>

      {/* Payment Confirmation Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>บันทึกการชำระเงิน</DialogTitle>
            <DialogDescription>
              งวดที่ {selectedInstallment} - {paymentTerms?.terms.find(t => t.installment === selectedInstallment)?.description}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="text-sm text-muted-foreground mb-1">จำนวนเงิน</div>
              <div className="text-2xl font-semibold text-green-600">
                {selectedInstallment && paymentTerms && formatCurrency(
                  calculateInstallmentAmount(
                    paymentTerms.terms.find(t => t.installment === selectedInstallment)!
                  )
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>วันที่ชำระ</Label>
              <Input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
            </div>

            <div className="p-3 bg-blue-50 rounded border border-blue-200 text-sm">
              <p className="text-blue-700">
                ℹ️ เมื่อบันทึกแล้ว ระบบจะสร้างเลขที่ใบเสร็จให้อัตโนมัติ
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>
              ยกเลิก
            </Button>
            <Button onClick={confirmPayment} className="gap-2 bg-green-600 hover:bg-green-700">
              <CheckCircle className="w-4 h-4" />
              ยืนยันการชำระ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}