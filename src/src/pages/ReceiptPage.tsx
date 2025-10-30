import { useState, useEffect } from "react";
import { BOQItem, Profile, CompanyInfo, CustomerInfo, Discount, PaymentTerms, BankInfo, TaxInvoice, BOQSummary as BOQSummaryType, Document } from "../types/boq";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { FileSpreadsheet, ArrowLeft, Download, Save, CheckCircle } from "lucide-react";
import { toast } from "sonner@2.0.3";
import { Separator } from "../components/ui/separator";
import { Badge } from "../components/ui/badge";
import { projectId, publicAnonKey } from "../utils/supabase/info";
import { exportWorkflowToPDF } from "../utils/pdfExport";
import { calculateBOQSummary, calculatePaymentTermAmount } from "../utils/calculations";

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
  setPaymentTerms?: (terms: PaymentTerms) => void;
  taxInvoice: TaxInvoice;
  setTaxInvoice: (invoice: TaxInvoice) => void;
  onBack: () => void;
}

export function ReceiptPage({
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
}: ReceiptPageProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [selectedInstallment, setSelectedInstallment] = useState<number | null>(null);
  const [signatures, setSignatures] = useState<import("../types/boq").Signature[]>([
    { type: "proposer", name: "", position: "", signatureUrl: undefined },
    { type: "customer", name: "", position: "", signatureUrl: undefined },
    { type: "witness", name: "", position: "", signatureUrl: undefined },
  ]);

  // Auto-generate document numbers
  useEffect(() => {
    if (!taxInvoice.invoiceNumber || taxInvoice.invoiceNumber.startsWith('INV-2025-0001') || taxInvoice.invoiceNumber.startsWith('INV-2024')) {
      const year = new Date().getFullYear();
      const month = String(new Date().getMonth() + 1).padStart(2, '0');
      const randomPart = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
      
      setTaxInvoice({
        ...taxInvoice,
        invoiceNumber: `INV-${year}-${month}-${randomPart}`,
        receiptNumber: `RCP-${year}-${month}-${randomPart}`,
      });
    }
  }, []);

  // ✅ Use centralized calculation with Decimal.js
  const calculateSummary = (): BOQSummaryType & { discountAmount: number; totalAfterDiscount: number } => {
    return calculateBOQSummary(boqItems, profile, discount);
  };

  const handleSaveDocument = async () => {
    if (!taxInvoice.invoiceNumber || !taxInvoice.receiptNumber) {
      toast.error("กรุณากรอกเลขที่เอกสารให้ครบถ้วน");
      return;
    }

    setIsSaving(true);
    try {
      const summary = calculateSummary();
      const document: Document = {
        id: `doc-${Date.now()}`,
        documentNumber: taxInvoice.invoiceNumber,
        type: "receipt",
        status: "sent",
        projectTitle,
        projectDescription,
        projectLocation,
        customerId: customer.id || "default-customer",
        customerName: customer.name,
        totalAmount: summary.totalAfterDiscount,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        boqItems,
        profile,
        company,
        customer,
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
        toast.success("บันทึกเอกสารสำเร็จ!", { description: `เลขที่ ${taxInvoice.invoiceNumber}` });
      } else {
        throw new Error("Failed to save document");
      }
    } catch (error) {
      console.error("Save failed:", error);
      toast.error("ไม่สามารถบันทึกเอกสารได้");
    } finally {
      setIsSaving(false);
    }
  };

  const handleMarkAsPaid = (installmentNumber: number) => {
    if (!paymentTerms || !setPaymentTerms) return;
    
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const randomPart = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
    
    const term = paymentTerms.terms.find(t => t.installment === installmentNumber);
    const amount = term 
      ? (term.percentage !== undefined 
          ? summary.totalAfterDiscount * (term.percentage / 100)
          : term.amount || 0)
      : 0;
    
    const updatedTerms: PaymentTerms = {
      ...paymentTerms,
      terms: paymentTerms.terms.map(term => 
        term.installment === installmentNumber
          ? {
              ...term,
              status: 'paid' as const,
              paidDate: new Date().toISOString(),
              receiptNumber: `RCP-${year}-${month}-${randomPart}-${installmentNumber}`,
            }
          : term
      )
    };
    
    setPaymentTerms(updatedTerms);
    toast.success(`✅ บันทึกการชำระงวดที่ ${installmentNumber} สำเร็จ!`, {
      description: `จำนวนเงิน ${formatCurrency(amount)} - พร้อม Export ใบเสร็จได้แล้ว`,
    });
  };

  const handleExportInstallmentReceipt = async (installmentNumber: number) => {
    if (!paymentTerms) return;
    
    setSelectedInstallment(installmentNumber);
    await new Promise(resolve => setTimeout(resolve, 150));
    
    try {
      const toastId = toast.loading(`กำลังสร้างใบเสร็จงวดที่ ${installmentNumber}...`);
      
      await exportWorkflowToPDF(projectTitle, "receipt", undefined, installmentNumber);
      
      toast.dismiss(toastId);
      toast.success(`🎉 Export ใบเสร็จงวดที่ ${installmentNumber} สำเร็จ!`, {
        description: `ไฟล์: ${projectTitle}_งวดที่_${installmentNumber}_Receipt.pdf`,
      });
    } catch (error) {
      console.error("Export failed:", error);
      toast.error(`ไม่สามารถ Export ใบเสร็จงวดที่ ${installmentNumber} ได้`);
    } finally {
      setSelectedInstallment(null);
    }
  };

  const handleExportAllPDF = async () => {
    if (!taxInvoice.invoiceNumber) {
      toast.error("กรุณากรอกเลขที่ใบกำกับภาษี");
      return;
    }

    let toastId: string | number | undefined;
    
    try {
      await exportWorkflowToPDF(projectTitle, "all", (current, total, name) => {
        if (toastId) toast.dismiss(toastId);
        toastId = toast.loading(`กำลังสร้าง PDF... (${current}/${total}) - ${name}`);
      });
      
      toast.success("Export PDF สำเร็จ! 🎉", {
        description: "ดาวน์โหลดไฟล์ BOQ, Quotation, Invoice และ Receipt แล้ว",
        duration: 5000,
      });
    } catch (error) {
      console.error("PDF export failed:", error);
      toast.error("ไม่สามารถ Export PDF ได้");
    } finally {
      // ✅ ALWAYS dismiss loading toast
      if (toastId) toast.dismiss(toastId);
    }
  };

  const summary = calculateSummary();
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(amount);
  };

  // Calculate totals for payment terms - USE REAL-TIME STATE
  const calculatePaidTotal = () => {
    if (!paymentTerms) return 0;
    return paymentTerms.terms
      .filter(t => t.status === 'paid')
      .reduce((sum, t) => {
        const amt = t.percentage !== undefined 
          ? summary.totalAfterDiscount * (t.percentage / 100)
          : t.amount || 0;
        return sum + amt;
      }, 0);
  };

  const paidTotal = calculatePaidTotal();
  const remainingTotal = summary.totalAfterDiscount - paidTotal;

  return (
    <>
      {/* ======================== HIDDEN PDF EXPORT SECTION ======================== */}
      <div style={{ position: 'fixed', left: '-9999px', top: 0, opacity: 1, pointerEvents: 'none', width: '210mm', overflow: 'visible', backgroundColor: '#ffffff' }}>
        
        {/* Receipt Export Section */}
        <div id="receipt-export-section" style={{ backgroundColor: '#ffffff', padding: '32px', width: '210mm', minHeight: '297mm', color: '#000000' }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '24px', borderBottom: '2px solid #000', paddingBottom: '16px' }}>
            <h1 style={{ fontSize: '24px', marginBottom: '8px', fontWeight: '700' }}>{company.name}</h1>
            <p style={{ fontSize: '12px' }}>{company.address}</p>
            <p style={{ fontSize: '12px' }}>โทร: {company.phone} | อีเมล: {company.email}</p>
            {company.taxId && <p style={{ fontSize: '12px' }}>เลขประจำตัวผู้เสียภาษี: {company.taxId}</p>}
          </div>
          
          {/* Title */}
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '4px' }}>ใบกำกับภาษี / ใบเสร็จรับเงิน</h2>
            <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '12px' }}>Tax Invoice / Receipt</h3>
            
            {/* Installment Badge */}
            {selectedInstallment && paymentTerms && (
              <div style={{ backgroundColor: '#10b981', color: '#ffffff', padding: '8px 16px', borderRadius: '8px', marginBottom: '12px', fontSize: '14px', fontWeight: '600', display: 'inline-block' }}>
                🧾 ใบเสร็จงวดที่ {selectedInstallment} - {paymentTerms.terms.find(t => t.installment === selectedInstallment)?.description}
              </div>
            )}
            
            {/* Document Info */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '16px', fontSize: '13px' }}>
              <div style={{ textAlign: 'left', backgroundColor: '#f9fafb', padding: '12px', borderRadius: '4px' }}>
                <p style={{ marginBottom: '4px' }}><strong>เลขที่ใบกำกับภาษี:</strong> {taxInvoice.invoiceNumber || 'INV-XXXX'}</p>
                <p style={{ marginBottom: '4px' }}><strong>เลขที่ใบเสร็จ:</strong> {
                  selectedInstallment && paymentTerms
                    ? paymentTerms.terms.find(t => t.installment === selectedInstallment)?.receiptNumber || taxInvoice.receiptNumber || 'RCP-XXXX'
                    : taxInvoice.receiptNumber || 'RCP-XXXX'
                }</p>
                <p style={{ marginBottom: '4px' }}><strong>วันที่ออก:</strong> {new Date(taxInvoice.issueDate).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                {selectedInstallment && paymentTerms && paymentTerms.terms.find(t => t.installment === selectedInstallment)?.dueDate && (
                  <p style={{ marginBottom: '4px' }}><strong>วันครบกำหนด:</strong> {new Date(paymentTerms.terms.find(t => t.installment === selectedInstallment)!.dueDate!).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                )}
              </div>
              
              <div style={{ textAlign: 'left', backgroundColor: '#f0f9ff', padding: '12px', borderRadius: '4px' }}>
                <p style={{ marginBottom: '4px' }}><strong>โครงการ:</strong> {projectTitle}</p>
                {projectLocation && <p style={{ marginBottom: '4px' }}><strong>สถานที่:</strong> {projectLocation}</p>}
                {projectDescription && <p style={{ marginBottom: '4px', fontSize: '11px', color: '#6b7280' }}>{projectDescription}</p>}
              </div>
            </div>

            {/* Customer Info */}
            <div style={{ fontSize: '14px', textAlign: 'left', marginTop: '12px', backgroundColor: '#dbeafe', padding: '12px', borderRadius: '4px', border: '1px solid #3b82f6' }}>
              <p style={{ marginBottom: '4px', fontWeight: '700', color: '#1e40af' }}>ลูกค้า / Customer:</p>
              <p style={{ marginBottom: '4px' }}><strong>ชื่อ:</strong> {customer.name}</p>
              <p style={{ marginBottom: '4px' }}><strong>ที่อยู่:</strong> {customer.address}</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '4px' }}>
                <p><strong>โทร:</strong> {customer.phone}</p>
                {customer.email && <p><strong>อีเมล:</strong> {customer.email}</p>}
                {customer.taxId && <p><strong>เลขประจำตัวผู้เสียภาษี:</strong> {customer.taxId}</p>}
              </div>
            </div>
          </div>

          {/* Items Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', marginTop: '20px' }}>
            <thead>
              <tr style={{ backgroundColor: '#1f2937', color: '#ffffff' }}>
                <th style={{ border: '1px solid #000', padding: '10px', fontSize: '12px', width: '50px' }}>ลำดับ</th>
                <th style={{ border: '1px solid #000', padding: '10px', fontSize: '12px' }}>รายการ</th>
                <th style={{ border: '1px solid #000', padding: '10px', fontSize: '12px', width: '80px' }}>หน่วย</th>
                <th style={{ border: '1px solid #000', padding: '10px', fontSize: '12px', width: '80px' }}>จำนวน</th>
                <th style={{ border: '1px solid #000', padding: '10px', fontSize: '12px', width: '120px' }}>ราคา/หน่วย</th>
                <th style={{ border: '1px solid #000', padding: '10px', fontSize: '12px', width: '120px' }}>รวม</th>
              </tr>
            </thead>
            <tbody>
              {boqItems.map((item, idx) => (
                <tr key={item.id} style={{ backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f9fafb' }}>
                  <td style={{ border: '1px solid #e5e7eb', padding: '8px', textAlign: 'center', fontSize: '11px' }}>{idx + 1}</td>
                  <td style={{ border: '1px solid #e5e7eb', padding: '8px', fontSize: '11px' }}>
                    {item.name}
                    {item.notes && <div style={{ fontSize: '10px', color: '#6b7280', marginTop: '2px' }}>หมายเหตุ: {item.notes}</div>}
                  </td>
                  <td style={{ border: '1px solid #e5e7eb', padding: '8px', textAlign: 'center', fontSize: '11px' }}>{item.unit}</td>
                  <td style={{ border: '1px solid #e5e7eb', padding: '8px', textAlign: 'right', fontSize: '11px' }}>{item.quantity.toLocaleString('th-TH')}</td>
                  <td style={{ border: '1px solid #e5e7eb', padding: '8px', textAlign: 'right', fontSize: '11px' }}>{formatCurrency(item.material + item.labor)}</td>
                  <td style={{ border: '1px solid #e5e7eb', padding: '8px', textAlign: 'right', fontSize: '11px', fontWeight: '600' }}>{formatCurrency((item.material + item.labor) * item.quantity)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ backgroundColor: '#e5e7eb' }}>
                <td colSpan={5} style={{ border: '1px solid #000', padding: '10px', textAlign: 'right', fontSize: '12px' }}>รวมเป็นเงิน (ก่อนภาษี)</td>
                <td style={{ border: '1px solid #000', padding: '10px', textAlign: 'right', fontSize: '12px', fontWeight: '600' }}>{formatCurrency(summary.totalBeforeVat)}</td>
              </tr>
              <tr>
                <td colSpan={5} style={{ border: '1px solid #000', padding: '8px', textAlign: 'right', fontSize: '11px' }}>ภาษีมูลค่าเพิ่ม {profile.vatPct}%</td>
                <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'right', fontSize: '11px' }}>{formatCurrency(summary.vat)}</td>
              </tr>
              <tr style={{ backgroundColor: '#e5e7eb' }}>
                <td colSpan={5} style={{ border: '1px solid #000', padding: '10px', textAlign: 'right', fontSize: '12px' }}>ยอดรวม (รวมภาษี)</td>
                <td style={{ border: '1px solid #000', padding: '10px', textAlign: 'right', fontSize: '12px', fontWeight: '600' }}>{formatCurrency(summary.grandTotal)}</td>
              </tr>
              {discount && (
                <tr>
                  <td colSpan={5} style={{ border: '1px solid #000', padding: '8px', textAlign: 'right', fontSize: '11px' }}>ส่วนลด {discount.type === 'percent' ? `${discount.value}%` : ''}</td>
                  <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'right', fontSize: '11px', color: '#dc2626' }}>-{formatCurrency(summary.discountAmount)}</td>
                </tr>
              )}
              
              {/* Installment or Full Payment */}
              {selectedInstallment && paymentTerms ? (
                <>
                  <tr style={{ backgroundColor: '#f3f4f6' }}>
                    <td colSpan={5} style={{ border: '1px solid #000', padding: '10px', textAlign: 'right', fontSize: '12px' }}>ยอดรวมโครงการ</td>
                    <td style={{ border: '1px solid #000', padding: '10px', textAlign: 'right', fontSize: '12px', fontWeight: '600' }}>{formatCurrency(summary.totalAfterDiscount)}</td>
                  </tr>
                  <tr style={{ backgroundColor: '#10b981', color: '#ffffff' }}>
                    <td colSpan={5} style={{ border: '1px solid #000', padding: '12px', textAlign: 'right', fontSize: '14px', fontWeight: '700' }}>
                      ยอดชำระงวดนี้ (งวดที่ {selectedInstallment})
                    </td>
                    <td style={{ border: '1px solid #000', padding: '12px', textAlign: 'right', fontSize: '14px', fontWeight: '700' }}>
                      {formatCurrency(
                        (() => {
                          const term = paymentTerms.terms.find(t => t.installment === selectedInstallment);
                          if (!term) return 0;
                          return term.percentage !== undefined 
                            ? summary.totalAfterDiscount * (term.percentage / 100)
                            : term.amount || 0;
                        })()
                      )}
                    </td>
                  </tr>
                  <tr style={{ backgroundColor: '#dcfce7' }}>
                    <td colSpan={5} style={{ border: '1px solid #000', padding: '10px', textAlign: 'right', fontSize: '12px', color: '#16a34a' }}>ชำระสะสม (รวมงวดนี้)</td>
                    <td style={{ border: '1px solid #000', padding: '10px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#16a34a' }}>
                      {formatCurrency(
                        paymentTerms.terms
                          .filter(t => t.installment <= selectedInstallment)
                          .reduce((sum, t) => {
                            const amt = t.percentage !== undefined 
                              ? summary.totalAfterDiscount * (t.percentage / 100)
                              : t.amount || 0;
                            return sum + amt;
                          }, 0)
                      )}
                    </td>
                  </tr>
                  <tr style={{ backgroundColor: '#fed7aa' }}>
                    <td colSpan={5} style={{ border: '1px solid #000', padding: '10px', textAlign: 'right', fontSize: '12px', color: '#c2410c' }}>คงเห��ือ</td>
                    <td style={{ border: '1px solid #000', padding: '10px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#c2410c' }}>
                      {formatCurrency(
                        summary.totalAfterDiscount - paymentTerms.terms
                          .filter(t => t.installment <= selectedInstallment)
                          .reduce((sum, t) => {
                            const amt = t.percentage !== undefined 
                              ? summary.totalAfterDiscount * (t.percentage / 100)
                              : t.amount || 0;
                            return sum + amt;
                          }, 0)
                      )}
                    </td>
                  </tr>
                </>
              ) : (
                <tr style={{ backgroundColor: '#10b981', color: '#ffffff' }}>
                  <td colSpan={5} style={{ border: '1px solid #000', padding: '12px', textAlign: 'right', fontSize: '14px', fontWeight: '700' }}>ยอดสุทธิที่ชำระ / Net Amount Paid</td>
                  <td style={{ border: '1px solid #000', padding: '12px', textAlign: 'right', fontSize: '14px', fontWeight: '700' }}>{formatCurrency(summary.totalAfterDiscount)}</td>
                </tr>
              )}
            </tfoot>
          </table>

          {/* Payment Summary Section */}
          {selectedInstallment && paymentTerms && (
            <div style={{ marginTop: '20px', padding: '16px', backgroundColor: '#f0fdf4', border: '2px solid #10b981', borderRadius: '8px' }}>
              <p style={{ fontSize: '14px', fontWeight: '700', color: '#047857', marginBottom: '12px', textAlign: 'center' }}>
                💰 สรุปการชำระเงิน - งวดที่ {selectedInstallment}
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', fontSize: '13px' }}>
                <div style={{ textAlign: 'center', padding: '8px', backgroundColor: '#ffffff', borderRadius: '4px', border: '1px solid #10b981' }}>
                  <p style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>ชำระงวดนี้</p>
                  <p style={{ fontSize: '16px', fontWeight: '700', color: '#10b981' }}>
                    {formatCurrency(
                      (() => {
                        const term = paymentTerms.terms.find(t => t.installment === selectedInstallment);
                        if (!term) return 0;
                        return term.percentage !== undefined 
                          ? summary.totalAfterDiscount * (term.percentage / 100)
                          : term.amount || 0;
                      })()
                    )}
                  </p>
                </div>
                
                <div style={{ textAlign: 'center', padding: '8px', backgroundColor: '#ffffff', borderRadius: '4px', border: '1px solid #3b82f6' }}>
                  <p style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>ชำระสะสม</p>
                  <p style={{ fontSize: '16px', fontWeight: '700', color: '#3b82f6' }}>
                    {formatCurrency(
                      paymentTerms.terms
                        .filter(t => t.installment <= selectedInstallment)
                        .reduce((sum, t) => {
                          const amt = t.percentage !== undefined 
                            ? summary.totalAfterDiscount * (t.percentage / 100)
                            : t.amount || 0;
                          return sum + amt;
                        }, 0)
                    )}
                  </p>
                </div>
                
                <div style={{ textAlign: 'center', padding: '8px', backgroundColor: '#ffffff', borderRadius: '4px', border: '1px solid #f59e0b' }}>
                  <p style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>เหลือค้างชำระ</p>
                  <p style={{ fontSize: '16px', fontWeight: '700', color: '#f59e0b' }}>
                    {formatCurrency(
                      summary.totalAfterDiscount - paymentTerms.terms
                        .filter(t => t.installment <= selectedInstallment)
                        .reduce((sum, t) => {
                          const amt = t.percentage !== undefined 
                            ? summary.totalAfterDiscount * (t.percentage / 100)
                            : t.amount || 0;
                          return sum + amt;
                        }, 0)
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Payment Info & Bank */}
          <div style={{ marginTop: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#fef3c7', borderRadius: '4px', fontSize: '12px' }}>
              <p style={{ fontWeight: '700', marginBottom: '8px', color: '#92400e' }}>📋 ข้อมูลการชำระเงิน</p>
              <p style={{ marginBottom: '4px' }}><strong>วิธีชำระ:</strong> {
                taxInvoice.paymentMethod === 'transfer' ? 'โอนเงิน' :
                taxInvoice.paymentMethod === 'cash' ? 'เงินสด' :
                taxInvoice.paymentMethod === 'check' ? 'เช็ค' : taxInvoice.paymentMethod
              }</p>
              {taxInvoice.paidAmount && (
                <p style={{ marginBottom: '4px' }}><strong>จำนวนที่ชำระ:</strong> <span style={{ fontWeight: '700', color: '#047857' }}>{formatCurrency(taxInvoice.paidAmount)}</span></p>
              )}
              {taxInvoice.notes && (
                <p style={{ marginTop: '8px', fontSize: '11px', color: '#6b7280' }}><strong>หมายเหตุ:</strong> {taxInvoice.notes}</p>
              )}
            </div>
            
            {bankInfo && (
              <div style={{ padding: '12px', backgroundColor: '#dbeafe', borderRadius: '4px', fontSize: '11px' }}>
                <p style={{ fontWeight: '700', marginBottom: '8px', color: '#1e40af' }}>💳 ชำระเงินผ่านบัญชี</p>
                <p style={{ marginBottom: '3px' }}><strong>ธนาคาร:</strong> {bankInfo.bankName}</p>
                <p style={{ marginBottom: '3px' }}><strong>ชื่อบัญชี:</strong> {bankInfo.accountName}</p>
                <p style={{ marginBottom: '3px' }}><strong>เลขที่:</strong> <span style={{ fontFamily: 'monospace', fontWeight: '600' }}>{bankInfo.accountNumber}</span></p>
                {bankInfo.branch && <p style={{ marginBottom: '3px' }}><strong>สาขา:</strong> {bankInfo.branch}</p>}
              </div>
            )}
          </div>

          {/* Payment Status */}
          <div style={{ marginTop: '20px', padding: '12px', backgroundColor: '#f0fdf4', borderRadius: '4px', border: '1px solid #10b981' }}>
            <p style={{ fontSize: '11px', color: '#047857', fontWeight: '600', marginBottom: '4px' }}>✅ สถานะ: ชำระเงินแล้ว (PAID)</p>
            <p style={{ fontSize: '10px', color: '#065f46' }}>เอกสารนี้รับรองว่าได้รับชำระเงินครบถ้วนแล้ว ณ วันที่ {new Date().toLocaleDateString('th-TH')}</p>
          </div>

          {/* Signatures */}
          <div style={{ marginTop: '30px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
            <div style={{ textAlign: 'center', padding: '16px', border: '1px solid #e5e7eb', borderRadius: '8px', backgroundColor: '#f9fafb' }}>
              <p style={{ fontSize: '12px', fontWeight: '600', marginBottom: '12px' }}>ผู้วางบิล</p>
              {signatures.find(s => s.type === 'proposer')?.signatureUrl ? (
                <div style={{ marginBottom: '12px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <img src={signatures.find(s => s.type === 'proposer')?.signatureUrl} alt="ลายเซ็น" style={{ maxHeight: '60px', maxWidth: '100%' }} />
                </div>
              ) : (
                <div style={{ height: '60px', marginBottom: '12px', borderBottom: '1px solid #000' }}></div>
              )}
              <p style={{ fontSize: '11px' }}>({signatures.find(s => s.type === 'proposer')?.name || '..........................................'})</p>
              {signatures.find(s => s.type === 'proposer')?.position && <p style={{ fontSize: '10px', color: '#6b7280' }}>{signatures.find(s => s.type === 'proposer')?.position}</p>}
              <p style={{ fontSize: '10px', marginTop: '8px' }}>วันที่ ....../....../......</p>
            </div>
            
            <div style={{ textAlign: 'center', padding: '16px', border: '1px solid #e5e7eb', borderRadius: '8px', backgroundColor: '#f9fafb' }}>
              <p style={{ fontSize: '12px', fontWeight: '600', marginBottom: '12px' }}>ผู้รับบิล</p>
              {signatures.find(s => s.type === 'customer')?.signatureUrl ? (
                <div style={{ marginBottom: '12px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <img src={signatures.find(s => s.type === 'customer')?.signatureUrl} alt="ลายเซ็น" style={{ maxHeight: '60px', maxWidth: '100%' }} />
                </div>
              ) : (
                <div style={{ height: '60px', marginBottom: '12px', borderBottom: '1px solid #000' }}></div>
              )}
              <p style={{ fontSize: '11px' }}>({signatures.find(s => s.type === 'customer')?.name || '..........................................'})</p>
              {signatures.find(s => s.type === 'customer')?.position && <p style={{ fontSize: '10px', color: '#6b7280' }}>{signatures.find(s => s.type === 'customer')?.position}</p>}
              <p style={{ fontSize: '10px', marginTop: '8px' }}>วันที่ ....../....../......</p>
            </div>
          </div>
        </div>
      </div>

      {/* ======================== VISIBLE UI SECTION ======================== */}
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-8 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Button variant="ghost" onClick={onBack} className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                ย้อนกลับ
              </Button>
              <div>
                <h1 className="flex items-center gap-2">
                  <FileSpreadsheet className="w-6 h-6 text-purple-600" />
                  ใบกำกับภาษี / ใบเสร็จรับเงิน
                </h1>
                <p className="text-sm text-muted-foreground mt-1">Tax Invoice & Receipt - Step 4</p>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button onClick={handleSaveDocument} disabled={isSaving} className="gap-2">
                <Save className="w-4 h-4" />
                {isSaving ? "กำลัง��ันทึก..." : isSaved ? "✓ บันทึกแล้ว" : "บันทึกเอกสาร"}
              </Button>
              <Button onClick={handleExportAllPDF} className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                <Download className="w-4 h-4" />
                Export PDF ทั้งหมด
              </Button>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid lg:grid-cols-2 gap-6">
            
            {/* Left Column - Summary */}
            <div className="space-y-6">
              {/* Project Summary */}
              <Card className="p-6 bg-white/80 backdrop-blur-sm shadow-lg">
                <h3 className="mb-4 text-blue-600">📊 สรุปโครงการ</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">ยอดรวม (ก่อนภาษี):</span>
                    <span className="font-semibold">{formatCurrency(summary.totalBeforeVat)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">VAT {profile.vatPct}%:</span>
                    <span>{formatCurrency(summary.vat)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">ยอดรวม (รวมภาษี):</span>
                    <span className="font-semibold">{formatCurrency(summary.grandTotal)}</span>
                  </div>
                  {discount && (
                    <div className="flex justify-between text-red-600">
                      <span>ส่วนลด:</span>
                      <span>-{formatCurrency(summary.discountAmount)}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between text-lg">
                    <span className="font-semibold">ยอดสุทธิ:</span>
                    <span className="font-bold text-green-600">{formatCurrency(summary.totalAfterDiscount)}</span>
                  </div>
                </div>
              </Card>

              {/* Bank Info */}
              {bankInfo && (
                <Card className="p-6 bg-white/80 backdrop-blur-sm shadow-lg">
                  <h4 className="mb-3 text-blue-600">💳 ข้อมูลบัญชีธนาคาร</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">ธนาคาร:</span>
                      <span className="font-medium">{bankInfo.bankName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">ชื่อบัญชี:</span>
                      <span className="font-medium">{bankInfo.accountName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">เลขที่บัญชี:</span>
                      <span className="font-medium font-mono">{bankInfo.accountNumber}</span>
                    </div>
                    {bankInfo.branch && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">สาขา:</span>
                        <span>{bankInfo.branch}</span>
                      </div>
                    )}
                    {bankInfo.qrCodeUrl && (
                      <div className="pt-3 mt-3 border-t">
                        <p className="text-xs text-muted-foreground mb-2 text-center">QR Code พร้อมเพย์</p>
                        <div className="flex justify-center">
                          <img src={bankInfo.qrCodeUrl} alt="QR Code" className="w-40 h-40 border rounded-lg shadow-md" />
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              )}

              {/* Payment Terms with Installments */}
              {paymentTerms && paymentTerms.terms.length > 0 && (
                <Card className="p-6 bg-white/80 backdrop-blur-sm shadow-lg border-orange-100">
                  <h4 className="mb-3 bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                    💰 แผนการชำระเงิน ({paymentTerms.totalInstallments} งวด)
                  </h4>
                  <div className="space-y-3">
                    {paymentTerms.terms.map((term, index) => {
                      const amount = term.percentage !== undefined 
                        ? summary.totalAfterDiscount * (term.percentage / 100)
                        : term.amount || 0;
                      
                      const previousTerm = index > 0 ? paymentTerms.terms[index - 1] : null;
                      const canExport = index === 0 || previousTerm?.status === 'paid';
                      const isPaid = term.status === 'paid';
                      
                      return (
                        <div 
                          key={term.id} 
                          className={`p-3 rounded-lg border-2 ${
                            isPaid 
                              ? 'bg-green-50 border-green-300' 
                              : canExport 
                                ? 'bg-gradient-to-br from-orange-50 to-red-50 border-orange-300' 
                                : 'bg-gray-100 border-gray-300 opacity-50'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold">งวดที่ {term.installment}</span>
                                {isPaid && <Badge className="bg-green-600 text-white text-xs"><CheckCircle className="w-3 h-3 mr-1" />ชำระแล้ว</Badge>}
                                {!canExport && !isPaid && <Badge variant="secondary" className="text-xs">รอชำระงวดก่อนหน้า</Badge>}
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">{term.description}</p>
                              {term.dueDate && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  ครบกำหนด: {new Date(term.dueDate).toLocaleDateString('th-TH')}
                                </p>
                              )}
                              {isPaid && term.paidDate && (
                                <p className="text-xs text-green-600 mt-1">
                                  ชำระเมื่อ: {new Date(term.paidDate).toLocaleDateString('th-TH')}
                                </p>
                              )}
                              {isPaid && term.receiptNumber && (
                                <p className="text-xs text-green-600">
                                  ใบเสร็จ: {term.receiptNumber}
                                </p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-lg">
                                ฿{amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                              </p>
                              {term.percentage && (
                                <p className="text-xs text-muted-foreground">({term.percentage}%)</p>
                              )}
                            </div>
                          </div>
                          
                          {canExport && !isPaid && (
                            <div className="space-y-2 mt-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full border-green-500 text-green-600 hover:bg-green-50"
                                onClick={() => handleMarkAsPaid(term.installment)}
                              >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                ยืนยันชำระงวดที่ {term.installment}
                              </Button>
                              <Button
                                size="sm"
                                className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                                onClick={() => handleExportInstallmentReceipt(term.installment)}
                              >
                                <Download className="w-4 h-4 mr-2" />
                                Export ใบเสร็จงวดนี้
                              </Button>
                            </div>
                          )}
                          {isPaid && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full mt-2 border-green-500 text-green-600 hover:bg-green-50"
                              onClick={() => handleExportInstallmentReceipt(term.installment)}
                            >
                              <Download className="w-4 h-4 mr-2" />
                              Export ใบเสร็จงวดนี้
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Summary */}
                  <Separator className="my-4" />
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">ยอดรวมทั้งหมด:</span>
                      <span className="font-semibold">
                        ฿{summary.totalAfterDiscount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between text-green-600">
                      <span>ชำระแล้ว:</span>
                      <span className="font-semibold">
                        ฿{paidTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between text-orange-600">
                      <span>คงเหลือ:</span>
                      <span className="font-semibold">
                        ฿{remainingTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </Card>
              )}
            </div>

            {/* Right Column - Document Info */}
            <div className="space-y-6">
              <Card className="p-6 bg-white/80 backdrop-blur-sm shadow-lg">
                <h3 className="mb-4 text-purple-600">📄 ข้อมูลเอกสาร</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">เลขที่ใบกำกับภาษี</label>
                    <div className="mt-1 p-3 bg-gray-50 rounded border font-mono text-sm">
                      {taxInvoice.invoiceNumber || 'INV-XXXX-XX-XXX'}
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">เลขที่ใบเสร็จ</label>
                    <div className="mt-1 p-3 bg-gray-50 rounded border font-mono text-sm">
                      {taxInvoice.receiptNumber || 'RCP-XXXX-XX-XXX'}
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">วันที่ออกเอกสาร</label>
                    <div className="mt-1 p-3 bg-gray-50 rounded border text-sm">
                      {new Date(taxInvoice.issueDate).toLocaleDateString('th-TH', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </div>
                  </div>
                  
                  {taxInvoice.dueDate && (
                    <div>
                      <label className="text-sm font-medium">วันครบกำหนด</label>
                      <div className="mt-1 p-3 bg-gray-50 rounded border text-sm">
                        {new Date(taxInvoice.dueDate).toLocaleDateString('th-TH', { 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </div>
                    </div>
                  )}
                  
                  <div>
                    <label className="text-sm font-medium">วิธีชำระเงิน</label>
                    <div className="mt-1 p-3 bg-gray-50 rounded border text-sm">
                      {taxInvoice.paymentMethod === 'transfer' ? '💳 โอนเงิน' :
                       taxInvoice.paymentMethod === 'cash' ? '💵 เงินสด' :
                       taxInvoice.paymentMethod === 'check' ? '📝 เช็ค' : 
                       taxInvoice.paymentMethod}
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-green-100 rounded-full">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-green-900 mb-1">สถานะ: ชำระเงินแล้ว</h4>
                    <p className="text-sm text-green-700">
                      เอกสารนี้รับรองว่าได้รับชำระเงินครบถ้วนแล้ว
                    </p>
                    <p className="text-xs text-green-600 mt-2">
                      วันที่ออกเอกสาร: {new Date().toLocaleDateString('th-TH')}
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-6 bg-blue-50 border-blue-200">
                <h4 className="font-medium text-blue-900 mb-2">💡 วิธีใช้งาน</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• กด "ยืนยันชำระ" เพื่อบันทึกสถานะงวด</li>
                  <li>• กด "Export ใบเสร็จ" เพื่อพิมพ์แต่ละงวด</li>
                  <li>• ระบบล็อกงวดถัดไปจนกว่างวดก่อนหน้าจะชำระ</li>
                  <li>• กด "Export PDF ทั้งหมด" เพื่อดาวน์โหลดครบทั้ง 4 ไฟล์</li>
                </ul>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
