import { projectId } from "../utils/supabase/info";
import { supabase } from "../utils/supabase/client";
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
import { exportWorkflowToPDF } from "../utils/pdfExport";
import { calculateBOQSummaryWithTax, calculatePaymentTermAmount, formatCurrency } from "../utils/calculations";
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
  onSave?: () => Promise<boolean>;
  
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
  onSave,
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

  // 🔒 Helper to get access token
  const getAccessToken = async (): Promise<string | null> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('กรุณาเข้าสู่ระบบใหม่');
        return null;
      }
      return session.access_token;
    } catch (error) {
      console.error('Failed to get access token:', error);
      toast.error('เกิดข้อผิดพลาดในการยืนยันตัวตน');
      return null;
    }
  };

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
      // Use onSave prop if provided (from AppWorkflow)
      if (onSave) {
        const success = await onSave();
        if (success) {
          setIsSaved(true);
          
          // 🔥 NEW: Create tax record automatically
          await createTaxRecordForReceipt();
          
          toast.success("บันทึกเอกสารและข้อมูลภาษีสำเร็จ!", {
            description: `เลขที่ ${taxInvoice.invoiceNumber} | บันทึกไปหน้าภาษีแล้ว`,
          });
        }
      } else {
        // Fallback: Use legacy save method
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

        const accessToken = await getAccessToken();
        if (!accessToken) {
          console.error('❌ No access token available');
          return;
        }

        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-6e95bca3/documents`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify(document),
          }
        );

        if (response.ok) {
          setIsSaved(true);
          
          // 🔥 NEW: Create tax record automatically
          await createTaxRecordForReceipt();
          
          toast.success("บันทึกเอกสารและข้อมูลภาษีสำเร็จ!", {
            description: `เลขที่ ${taxInvoice.invoiceNumber} | บันทึกไปหน้าภาษีแล้ว`,
          });
        } else {
          throw new Error("Failed to save document");
        }
      }
    } catch (error) {
      console.error("Save document failed:", error);
      toast.error("ไม่สามารถบันทึกเอกสารได้");
    } finally {
      setIsSaving(false);
    }
  };

  // 🔥 NEW: Helper function to create tax record
  const createTaxRecordForReceipt = async () => {
    try {
      console.log('💾 Creating tax record for receipt...');
      
      const accessToken = await getAccessToken();
      if (!accessToken) {
        console.warn('⚠️ No access token for tax record creation');
        return;
      }
      
      const vatAmount = summary.vat || 0;
      const vatRate = profile.vatPct || 7;
      const withholdingTaxAmount = summary.withholdingTaxAmount || 0;
      
      const taxRecord = {
        id: `tax-${Date.now()}`,
        documentId: `doc-${Date.now()}`,
        documentNumber: taxInvoice.invoiceNumber,
        customerId: recipientType === 'customer' ? (customer.id || "default-customer") : (selectedPartner?.id || "default-partner"),
        customerName: recipientType === 'customer' ? customer.name : (selectedPartner?.name || ''),
        customerTaxId: customer.taxId || undefined,
        projectTitle: projectTitle,
        paymentAmount: summary.totalBeforeVat,
        vatRate: vatRate,
        vatAmount: vatAmount,
        withholdingTaxRate: withholdingTaxRate,
        withholdingTaxAmount: withholdingTaxAmount,
        withholdingTaxType: withholdingTaxType,
        netPayment: summary.netPayable,
        paymentDate: taxInvoice.issueDate || new Date().toISOString().split('T')[0],
        taxDocumentNumber: taxInvoice.invoiceNumber,
        withholdingTaxDocumentNumber: withholdingTaxAmount > 0 ? taxInvoice.receiptNumber : undefined,
        status: 'paid' as const,
        notes: `บันทึกอัตโนมัติจากใบเสร็จ ${taxInvoice.receiptNumber}`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-6e95bca3/tax-records`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(taxRecord),
        }
      );
      
      if (response.ok) {
        console.log('✅ Tax record created successfully');
      } else {
        console.warn('⚠️ Failed to create tax record, but document was saved');
      }
    } catch (error) {
      console.warn('⚠️ Failed to create tax record:', error);
      // Don't throw - we don't want to fail the entire save if tax record fails
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

    let loadingToast: string | number | undefined;
    let saveSuccess = false;
    
    try {
      // 🔥 STEP 1: บันทึกเอกสารงวดนี้ก่อน (optional - only if not saved yet)
      // สำหรับงวดชำระ เราไม่จำเป็นต้องบันทึกเอกสารใหม่ทุกคร���้ง
      // เพราะเอกสารหลักถูกบันทึกแล้วตอนส่งออกครั้งแรก
      
      // 🔥 STEP 2: Export PDF for installment
      loadingToast = toast.loading(`กำลังสร้างใบเสร็จงวดที่ ${installmentNumber}...`);
      
      await exportWorkflowToPDF(
        projectTitle,
        "receipt",
        undefined,
        installmentNumber
      );
      
      // ✅ Dismiss loading toast BEFORE showing success
      if (loadingToast) {
        toast.dismiss(loadingToast);
        loadingToast = undefined;
      }
      
      const amount = calculateInstallmentAmount(term);
      toast.success(`🎉 Export ใบเสร็จงวดที่ ${installmentNumber} สำเร็จ!`, {
        description: `จำนวนเงิน ${formatCurrency(amount)} | เลขที่ ${term.receiptNumber}`,
        duration: 3000,
      });
    } catch (error) {
      console.error("Failed to export receipt:", error);
      
      // ✅ Dismiss loading toast BEFORE showing error
      if (loadingToast) {
        toast.dismiss(loadingToast);
        loadingToast = undefined;
      }
      
      toast.error("ไม่สามารถ Export ใบเสร็จได้", {
        description: "กรุณาลองใหม่��ีกครั้ง",
      });
    } finally {
      // ✅ Final safety net
      if (loadingToast) {
        toast.dismiss(loadingToast);
      }
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

    let toastId: string | number | undefined;
    let saveSuccess = false;
    
    try {
      // 🔥 STEP 1: บันทึกเอกสารก่อน export
      console.log('💾 Saving document before export...');
      toastId = toast.loading('กำลังบันทึกเอกสาร...');
      
      if (onSave) {
        saveSuccess = await onSave();
      } else {
        // Fallback: Use legacy save method
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

        const accessToken = await getAccessToken();
        if (!accessToken) {
          console.error('❌ No access token available');
          return;
        }

        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-6e95bca3/documents`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify(document),
          }
        );

        if (response.ok) {
          saveSuccess = true;
          setIsSaved(true);
        }
      }
      
      if (!saveSuccess) {
        throw new Error('ไม่สามารถบันทึกเอกสารได้');
      }
      
      console.log('✅ Document saved successfully');
      
      // 🔥 STEP 1.5: Create tax record
      await createTaxRecordForReceipt();
      
      if (toastId) toast.dismiss(toastId);
      
      // 🔥 STEP 2: Export PDF
      console.log('📄 Starting PDF export...');
      
      // ⚠️ Check BOQ size and warn user
      const itemCount = boqItems?.length || 0;
      if (itemCount > 200) {
        toast.info(`⚠️ เอกสารมี ${itemCount} รายการ - อาจใช้เวลา 30-60 วินาที`, {
          description: 'กรุณารอสักครู่...',
          duration: 5000,
        });
      }
      
      await exportWorkflowToPDF(projectTitle, "receipt", (progress) => {
        if (toastId) {
          toast.dismiss(toastId);
        }
        toastId = toast.loading(`กำลังสร้าง PDF... (${progress.current}/${progress.total}) - ${progress.documentName}`, {
          description: itemCount > 200 ? `กำลังประมวลผล ${itemCount} รายการ - โปรดรอสักครู่` : `กำลังประมวลผล ${progress.documentName}`,
        });
      });
      
      // ✅ Dismiss loading toast BEFORE showing success
      if (toastId) {
        toast.dismiss(toastId);
        toastId = undefined;
      }
      
      toast.success("Export PDF และบันทึกสำเร็จ! 🎉", {
        description: "ดาวน์โหลดไฟล์ใบกำกับภาษี/ใบเสร็จรับเงินแล้ว และบันทึกไปประวัติเอกสารและหน้าภาษีแล้ว",
        duration: 5000,
      });
    } catch (error: any) {
      console.error("PDF export failed:", error);
      const errorMsg = error?.message || "ไม่สามารถ Export PDF ได้";
      
      // ✅ Dismiss loading toast BEFORE showing error
      if (toastId) {
        toast.dismiss(toastId);
        toastId = undefined;
      }
      
      toast.error(errorMsg, {
        description: "กรุณาตรวจสอบข้อมูลและลองใหม่อีกครั้ง หรือลองลดจำนวนรายการ",
        duration: 6000,
      });
    } finally {
      // ✅ Final safety net - dismiss any remaining toast
      if (toastId) {
        toast.dismiss(toastId);
      }
    }
  };

  const handleExportAllDocuments = async () => {
    if (!taxInvoice.invoiceNumber) {
      toast.error("กรุณากรอกเลขที่ใบกำกับภาษี");
      return;
    }

    let toastId: string | number | undefined;
    let saveSuccess = false;
    
    try {
      // 🔥 STEP 1: บันทึกเอกสารก่อน export
      console.log('💾 Saving document before export all...');
      toastId = toast.loading('กำลังบันทึกเอกสาร...');
      
      if (onSave) {
        saveSuccess = await onSave();
      } else {
        // Fallback: Use legacy save method
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

        const accessToken = await getAccessToken();
        if (!accessToken) {
          console.error('❌ No access token available');
          return;
        }

        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-6e95bca3/documents`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify(document),
          }
        );

        if (response.ok) {
          saveSuccess = true;
          setIsSaved(true);
        }
      }
      
      if (!saveSuccess) {
        throw new Error('ไม่สามารถบันทึกเอกสารได้');
      }
      
      console.log('✅ Document saved successfully');
      
      // 🔥 STEP 1.5: Create tax record
      await createTaxRecordForReceipt();
      
      if (toastId) toast.dismiss(toastId);
      
      // 🔥 STEP 2: Export all PDFs
      console.log('📄 Starting export all...');
      
      // ⚠️ Check BOQ size and warn user
      const itemCount = boqItems?.length || 0;
      if (itemCount > 200) {
        toast.info(`⚠️ เอกสารมี ${itemCount} รายการ - อาจใช้เวลา 1-2 นาที`, {
          description: 'กำลังสร้างเอกสารทั้งหมด กรุณารอสักครู่...',
          duration: 5000,
        });
      }
      
      // Export all document types
      await exportWorkflowToPDF(projectTitle, "all", (progress) => {
        if (toastId) {
          toast.dismiss(toastId);
        }
        toastId = toast.loading(`กำลังสร้าง PDF... (${progress.current}/${progress.total}) - ${progress.documentName}`, {
          description: itemCount > 200 ? `กำลังประมวลผล ${itemCount} รายการ - โปรดรอสักครู่` : `กำลังประมวลผล ${progress.documentName}`,
        });
      });
      
      // ✅ Dismiss loading toast BEFORE showing success
      if (toastId) {
        toast.dismiss(toastId);
        toastId = undefined;
      }
      
      toast.success("ส่งออกเอกสารทั้งชุดและบันทึกสำเร็จ! 🎉", {
        description: "ดาวน์โหลดไฟล์ BOQ, ใบเสนอราคา, ใบวางบิล แฉะใบเสร็จแล้ว และบันทึกไปประวัติเอกสารและหน้าภาษีแล้ว",
        duration: 5000,
      });
    } catch (error: any) {
      console.error("PDF export all failed:", error);
      const errorMsg = error?.message || "ไม่สามารถ Export เอกสารทั้งหมดได้";
      
      // ✅ Dismiss loading toast BEFORE showing error
      if (toastId) {
        toast.dismiss(toastId);
        toastId = undefined;
      }
      
      toast.error(errorMsg, {
        description: "กรุณาตรวจสอบข้อมูลและลองใหม่อีกครั้ง หรือลองแยกดาวน์โหลดทีละเอกสาร",
        duration: 6000,
      });
    } finally {
      // ✅ Final safety net - dismiss any remaining toast
      if (toastId) {
        toast.dismiss(toastId);
      }
    }
  };

  // ✅ Use centralized calculation with Decimal.js
  const calculateInstallmentAmount = (term: PaymentTerm): number => {
    return calculatePaymentTermAmount(summary.totalAfterDiscount, term.percentage, term.amount);
  };

  // Use useMemo to recalculate when paymentTerms changes
  const totalPaid = useMemo(() => {
    if (!paymentTerms || !paymentTerms.terms) return 0;
    
    return paymentTerms.terms
      .filter(t => t.status === 'paid')
      .reduce((sum, t) => {
        const amount = calculatePaymentTermAmount(summary.totalAfterDiscount, t.percentage, t.amount);
        return sum + amount;
      }, 0);
  }, [paymentTerms, summary.totalAfterDiscount]);

  const totalPending = useMemo(() => {
    return summary.totalAfterDiscount - totalPaid;
  }, [summary.totalAfterDiscount, totalPaid]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-violet-50 to-indigo-50 pb-20">
      {/* Page Header */}
      <div className="bg-gradient-to-r from-purple-600 to-violet-600 text-white p-4 sm:p-6 md:p-8 shadow-xl">
        <div className="container mx-auto">
          <div className="flex items-center gap-3 sm:gap-4 mb-3">
            <div className="p-2 sm:p-3 bg-white/20 rounded-lg backdrop-blur-sm shrink-0">
              <ReceiptIcon className="h-6 w-6 sm:h-8 sm:w-8" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl md:text-3xl mb-1 truncate">ใบกำกับภาษี/ใบเสร็จรับเงิน</h1>
              <p className="text-xs sm:text-sm text-purple-100 line-clamp-2">Tax Invoice & Receipt - Step 4 of 4</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs sm:text-sm flex-wrap">
            <span className="opacity-75 hidden sm:inline">BOQ</span>
            <span className="opacity-75 hidden sm:inline">→</span>
            <span className="opacity-75 hidden sm:inline">ใบเสนอราคา</span>
            <span className="opacity-75 hidden sm:inline">→</span>
            <span className="opacity-75 hidden sm:inline">ใบวางบิล</span>
            <span className="opacity-75 hidden sm:inline">→</span>
            <div className="px-2 sm:px-3 py-1 bg-white/20 rounded-full backdrop-blur-sm">
              Step 4 of 4
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-6 md:py-8">
        <div id="receipt-content" className="grid gap-4 sm:gap-6">
          {/* Project Summary */}
          <Card className="p-4 sm:p-6 bg-white/80 backdrop-blur-sm shadow-lg border-purple-100">
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
                <div className="text-2xl bg-gradient-to-r from-purple-600 to-violet-600 bg-clip-text text-transparent">
                  {formatCurrency(summary.totalAfterDiscount)}
                </div>
              </div>
            </div>
          </Card>

          {/* Payment Installments Management */}
          {paymentTerms && paymentTerms.terms.length > 0 && (
            <Card 
              key={`payment-${paymentTerms.terms.filter(t => t.status === 'paid').length}`}
              className="p-4 sm:p-6 bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 shadow-lg"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 mb-4">
                <h3 className="text-base sm:text-lg md:text-xl bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                  สถานะการชระเงินตามงวด
                </h3>
                <div className="flex gap-2 flex-wrap" key={`badges-${totalPaid}`}>
                  <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300 text-xs sm:text-sm">
                    ชำระแล้ว: {formatCurrency(totalPaid)}
                  </Badge>
                  <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-300 text-xs sm:text-sm">
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
                      className={`p-3 sm:p-4 rounded-lg border-2 ${
                        term.status === 'paid'
                          ? 'bg-green-50 border-green-300'
                          : 'bg-white border-gray-200'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-0 sm:justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start sm:items-center gap-2 sm:gap-3 mb-2 flex-wrap">
                            <span className="text-base sm:text-lg font-semibold shrink-0">
                              งวดที่ {term.installment}:
                            </span>
                            <span className="text-xs sm:text-sm text-muted-foreground line-clamp-2 break-words">{term.description}</span>
                            {term.status === 'paid' && (
                              <Badge className="gap-1 bg-green-500 shrink-0">
                                <CheckCircle className="w-3 h-3" />
                                <span className="text-xs">ชำระแล้ว</span>
                              </Badge>
                            )}
                          </div>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <DollarSign className="w-3 h-3 sm:w-4 sm:h-4" />
                              <span className="font-medium">{formatCurrency(amount)}</span>
                            </div>
                            {term.paidDate && (
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                                <span className="text-xs">ชำระวันที่: {new Date(term.paidDate).toLocaleDateString('th-TH')}</span>
                              </div>
                            )}
                            {term.receiptNumber && (
                              <div className="text-xs bg-green-100 px-2 py-1 rounded break-all max-w-full">
                                เลขที่ใบเสร็จ: {term.receiptNumber}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2 shrink-0 w-full sm:w-auto">
                          {term.status !== 'paid' ? (
                            <Button
                              onClick={() => handleMarkAsPaid(term.installment)}
                              size="sm"
                              className="gap-2 bg-green-600 hover:bg-green-700 w-full sm:w-auto"
                            >
                              <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                              <span className="text-xs sm:text-sm">บันทึกการชำระ</span>
                            </Button>
                          ) : (
                            <Button
                              onClick={() => handleExportReceiptForInstallment(term.installment)}
                              size="sm"
                              variant="outline"
                              className="gap-2 w-full sm:w-auto"
                            >
                              <Download className="w-3 h-3 sm:w-4 sm:h-4" />
                              <span className="text-xs sm:text-sm">Export ใบเสร็จงวดนี้</span>
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
          <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Tax Invoice Form */}
            <TaxInvoiceSection 
              taxInvoice={taxInvoice} 
              grandTotal={summary.totalAfterDiscount}
              onUpdate={setTaxInvoice} 
            />

            {/* Payment Summary Card - Shows payment status from installments */}
            <Card 
              key={`summary-${totalPaid}-${totalPending}`}
              className="p-4 sm:p-6 bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200 shadow-lg h-fit"
            >
              <h3 className="mb-3 sm:mb-4 bg-gradient-to-r from-purple-600 to-violet-600 bg-clip-text text-transparent text-base sm:text-lg md:text-xl">
                สถานะการชำระเงิน
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">
                ข้อมูลจากการแบ่งงวดชำระ
              </p>
              
              <div className="space-y-2 sm:space-y-3" key={`amounts-${totalPaid}`}>
                <div className="flex justify-between items-center p-2 sm:p-3 bg-white rounded-lg border">
                  <span className="text-xs sm:text-sm text-muted-foreground">ยอดรวมทั้งหมด</span>
                  <span className="text-sm sm:text-base md:text-lg font-semibold">
                    ฿{summary.totalAfterDiscount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                
                <div className="flex justify-between items-center p-2 sm:p-3 bg-green-100 rounded-lg border border-green-300">
                  <span className="text-xs sm:text-sm text-green-700 flex items-center gap-1 sm:gap-2">
                    <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                    ชำระแล้ว
                  </span>
                  <span className="text-sm sm:text-base md:text-lg font-semibold text-green-600" key={totalPaid}>
                    ฿{totalPaid.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                
                <div className="flex justify-between items-center p-2 sm:p-3 bg-orange-100 rounded-lg border border-orange-300">
                  <span className="text-xs sm:text-sm text-orange-700">คงเหลือ</span>
                  <span className="text-sm sm:text-base md:text-lg font-semibold text-orange-600" key={totalPending}>
                    ฿{totalPending.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
              
              <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-xs text-blue-700">
                  ⚠️ หมายเหตุ: ใบกำกับภาษีจะถูกออกให้เฉพาะลูกค้��ที่เป็นนิติบุคคล
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
            <Card className="p-4 sm:p-6 bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200 shadow-lg">
              <h3 className="mb-3 sm:mb-4 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent text-base sm:text-lg md:text-xl">
                ดำเนินการ
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">
                บันทึกและส่งออกเอกสาร
              </p>
              
              <div className="space-y-2 sm:space-y-3">
                <Button
                  onClick={handleSaveDocument}
                  size="lg"
                  variant="outline"
                  className="w-full gap-2 py-4 sm:py-6 text-sm sm:text-base"
                  disabled={isSaving || isSaved}
                >
                  {isSaved ? (
                    <>
                      <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                      <span>บันทึกแล้ว</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 sm:h-5 sm:w-5" />
                      <span>{isSaving ? "กำลังบันทึก..." : "บันทึกเอกสาร"}</span>
                    </>
                  )}
                </Button>
                
                <Button
                  onClick={handleExportPDF}
                  size="lg"
                  className="w-full gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 py-4 sm:py-6 text-sm sm:text-base"
                >
                  <Download className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="line-clamp-1">ส่งออก PDF (ใบกำกับภาษี/ใบเสร็จ)</span>
                </Button>
                
                <Button
                  onClick={handleExportAllDocuments}
                  size="lg"
                  variant="outline"
                  className="w-full gap-2 py-4 sm:py-6 border-2 border-blue-500 text-blue-600 hover:bg-blue-50 hover:text-blue-700 text-sm sm:text-base"
                >
                  <FileSpreadsheet className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="line-clamp-1">ส่งออกเอกสารทั้งชุด (BOQ - ใบเสร็จ)</span>
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
              className="gap-2 px-6 sm:px-8 py-4 sm:py-6 text-sm sm:text-base md:text-lg w-full sm:w-auto"
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