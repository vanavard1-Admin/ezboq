import { PDFExportBOQ } from './PDFExportBOQ';
import { PDFExportQuotation } from './PDFExportQuotation';
import { BOQItem, Profile, CompanyInfo, CustomerInfo, Discount, PaymentTerms, BankInfo, TaxInvoice, BOQSummary, PaymentTerm } from '../types/boq';
import { calculateBOQSummaryWithTax, calculatePaymentTermAmount, formatCurrency } from '../utils/calculations';
import { useEffect } from 'react';
import { log } from '../utils/logger';
import { BANK_NAMES, ThaiBank } from './BankLogo';

// Import bank logos for PDF export
import bblLogo from '../assets/brands/banks/bbl.svg?url';
import kbankLogo from '../assets/brands/banks/kbank.svg?url';
import scbLogo from '../assets/brands/banks/scb.svg?url';
import ktbLogo from '../assets/brands/banks/ktb.svg?url';
import bayLogo from '../assets/brands/banks/bay.svg?url';
import ttbLogo from '../assets/brands/banks/ttb.svg?url';
import gsbLogo from '../assets/brands/banks/gsb.svg?url';
import ghbLogo from '../assets/brands/banks/ghb.svg?url';
import kkpLogo from '../assets/brands/banks/kkp.svg?url';
import cimbLogo from '../assets/brands/banks/cimb.svg?url';
import uobLogo from '../assets/brands/banks/uob.svg?url';
import tiscoLogo from '../assets/brands/banks/tisco.svg?url';
import lhbankLogo from '../assets/brands/banks/lhbank.svg?url';

const BANK_LOGO_MAP: Record<ThaiBank, string> = {
  bbl: bblLogo,
  kbank: kbankLogo,
  scb: scbLogo,
  ktb: ktbLogo,
  bay: bayLogo,
  ttb: ttbLogo,
  gsb: gsbLogo,
  ghb: ghbLogo,
  kkp: kkpLogo,
  cimb: cimbLogo,
  uob: uobLogo,
  tisco: tiscoLogo,
  lhbank: lhbankLogo,
};

interface PDFExportWrapperProps {
  projectTitle: string;
  projectDescription: string;
  projectLocation: string;
  company: CompanyInfo;
  customer: CustomerInfo;
  profile: Profile;
  boqItems: BOQItem[];
  summary?: BOQSummary;
  discount: Discount | null;
  bankInfo: BankInfo | null;
  paymentTerms: PaymentTerms | null;
  taxInvoice: TaxInvoice;
  signatureUrl?: string;
  
  recipientType?: 'customer' | 'partner';
  selectedPartner?: any;
  mainProjectTag?: string;
  withholdingTaxRate?: number;
  withholdingTaxType?: string;
  selectedInstallmentForExport?: number | null;
}

/**
 * PDF Export Wrapper - Production Version
 * Hidden export sections for PDF generation
 */
export function PDFExportWrapper({
  projectTitle,
  projectDescription,
  projectLocation,
  company,
  customer,
  profile,
  boqItems,
  summary: passedSummary,
  discount,
  bankInfo,
  paymentTerms,
  taxInvoice,
  signatureUrl,
  recipientType = 'customer',
  selectedPartner,
  mainProjectTag,
  withholdingTaxRate = 0,
  withholdingTaxType = '',
  selectedInstallmentForExport = null,
}: PDFExportWrapperProps) {
  // Safety check: Ensure minimum data is present
  const safeBoqItems = Array.isArray(boqItems) ? boqItems : [];
  const safeProfile = profile || { 
    labor: 0, 
    material: 0, 
    overhead: 0, 
    profit: 0, 
    vat: 7 
  } as Profile;
  const safeCompany = company || {
    name: 'บริษัท',
    address: '',
    phone: '',
    email: '',
  };
  const safeCustomer = customer || {
    id: '',
    type: 'individual' as const,
    name: 'ลูกค้า',
    phone: '',
    address: '',
  };

  // Always calculate summary with tax to ensure all properties are present
  const summary = calculateBOQSummaryWithTax(
    safeBoqItems,
    safeProfile,
    discount,
    withholdingTaxRate
  );

  // Get recipient info
  const recipient = recipientType === 'customer' ? safeCustomer : {
    id: selectedPartner?.id || '',
    type: 'company' as const,
    name: selectedPartner?.name || 'ไม่ระบุ',
    phone: selectedPartner?.phone || '',
    address: selectedPartner?.address || '',
    email: selectedPartner?.email,
    taxId: selectedPartner?.taxId,
  };
  
  // Check if exporting specific installment
  const exportingInstallment = selectedInstallmentForExport !== null;
  const currentInstallment = exportingInstallment && paymentTerms 
    ? paymentTerms.terms.find(t => t.installment === selectedInstallmentForExport) 
    : null;
  
  // ✅ Use centralized calculation with Decimal.js
  const calculateTermAmount = (term: PaymentTerm | null | undefined): number => {
    if (!term) return 0;
    
    // If paidAmount is explicitly set, use it
    if (term.paidAmount !== undefined && term.paidAmount > 0) return term.paidAmount;
    
    // Calculate based on percentage or amount
    const grandTotal = withholdingTaxRate > 0 ? summary.netPayable : summary.totalAfterDiscount;
    return calculatePaymentTermAmount(grandTotal, term.percentage, term.amount);
  };
  
  // Determine if paid - ถ้า export งวด ให้ดูว่ามี receiptNumber หรือไม่
  const isPaid = exportingInstallment 
    ? (currentInstallment?.isPaid === true || !!currentInstallment?.receiptNumber) 
    : (taxInvoice.paidAmount !== undefined && taxInvoice.paidAmount > 0);
  
  // Get paid amount - คำนวณจาก percentage หรือ amount
  const paidAmount = exportingInstallment && currentInstallment
    ? calculateTermAmount(currentInstallment)
    : (taxInvoice.paidAmount || 0);
  
  // Calculate total paid and remaining (for installment export)
  const totalPaidSoFar = exportingInstallment && paymentTerms
    ? paymentTerms.terms
        .filter(t => t.installment <= (selectedInstallmentForExport || 0) && (t.isPaid || t.status === 'paid'))
        .reduce((sum, t) => sum + calculateTermAmount(t), 0)
    : 0;
  
  const grandTotal = withholdingTaxRate > 0 ? summary.netPayable : summary.totalAfterDiscount;
  const remainingAmount = exportingInstallment 
    ? grandTotal - totalPaidSoFar
    : 0;
  
  // Get paid date
  const paidDate = exportingInstallment && currentInstallment?.paidDate
    ? new Date(currentInstallment.paidDate)
    : new Date();

  // Document number generator
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, '0');
  const boqNumber = `BOQ-${year}-${month}-0001`;
  const quotationNumber = `QT-${year}-${month}-0001`;

  // 🐛 Debug: Check if component renders and elements exist
  useEffect(() => {
    log.debug('📦 PDFExportWrapper rendered', {
      hasBoqItems: boqItems.length,
      hasCompany: !!company,
      hasProfile: !!profile,
    });
    log.debug('🔍 Checking export sections...');
    
    const checkElements = () => {
      const boq = document.getElementById('boq-export-section');
      const quotation = document.getElementById('quotation-export-section');
      const invoice = document.getElementById('invoice-export-section');
      const receipt = document.getElementById('receipt-export-section');
      
      log.debug('BOQ section:', boq ? '✅ FOUND' : '❌ NOT FOUND', {
        exists: !!boq,
        width: boq?.offsetWidth,
        height: boq?.offsetHeight,
        scrollHeight: boq?.scrollHeight
      });
      log.debug('Quotation section:', quotation ? '✅ FOUND' : '❌ NOT FOUND', {
        exists: !!quotation,
        width: quotation?.offsetWidth,
        height: quotation?.offsetHeight
      });
      log.debug('Invoice section:', invoice ? '✅ FOUND' : '❌ NOT FOUND', {
        exists: !!invoice,
        width: invoice?.offsetWidth,
        height: invoice?.offsetHeight
      });
      log.debug('Receipt section:', receipt ? '✅ FOUND' : '❌ NOT FOUND', {
        exists: !!receipt,
        width: receipt?.offsetWidth,
        height: receipt?.offsetHeight
      });
      
      const wrapper = document.querySelector('[data-pdf-export-wrapper]');
      log.debug('PDF Wrapper:', wrapper ? '✅ FOUND' : '❌ NOT FOUND', {
        exists: !!wrapper,
        width: wrapper?.clientWidth,
        height: wrapper?.clientHeight,
        position: wrapper ? getComputedStyle(wrapper as Element).position : 'N/A',
        childrenCount: wrapper?.children.length
      });
      
      // Check if components actually rendered
      const allDivs = document.querySelectorAll('div[id*="export"]');
      log.debug(`Found ${allDivs.length} divs with "export" in ID:`, 
        Array.from(allDivs).map(d => d.id).filter(Boolean)
      );
    };
    
    checkElements();
    
    setTimeout(() => {
      log.debug('🔍 Rechecking after 100ms...');
      checkElements();
    }, 100);
    
    setTimeout(() => {
      log.debug('🔍 Rechecking after 500ms...');
      checkElements();
    }, 500);
  }, [boqItems.length, company, profile]);

  // Note: Styling is now in globals.css via [data-pdf-export-wrapper] selector
  return (
    <div 
      data-pdf-export-wrapper="true"
      key="pdf-export-wrapper"
    >
      {/* BOQ Export */}
      <PDFExportBOQ
        projectTitle={projectTitle || 'โครงการ'}
        projectDescription={projectDescription}
        projectLocation={projectLocation}
        company={safeCompany}
        customer={recipient}
        profile={safeProfile}
        boqItems={safeBoqItems}
        summary={summary}
        documentNumber={boqNumber}
        signatureUrl={signatureUrl}
      />

      {/* Quotation Export */}
      <PDFExportQuotation
        projectTitle={projectTitle || 'โครงการ'}
        projectDescription={projectDescription}
        projectLocation={projectLocation}
        company={safeCompany}
        customer={recipient}
        profile={safeProfile}
        boqItems={safeBoqItems}
        summary={summary}
        discount={discount}
        documentNumber={quotationNumber}
        signatureUrl={signatureUrl}
        validityDays={30}
      />

      {/* Invoice Export */}
      <div
        id="invoice-export-section"
        style={{
          backgroundColor: '#ffffff',
          width: '210mm',
          minHeight: '297mm',
          color: '#000000',
          fontFamily: '"Sarabun", "Noto Sans Thai", sans-serif',
        }}
      >
        <div style={{ padding: '15mm 12mm' }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '16px', borderBottom: '2px solid #059669', paddingBottom: '12px' }}>
            <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#059669', margin: '0 0 6px 0' }}>
              {safeCompany.name}
            </h1>
            <p style={{ fontSize: '11px', color: '#4b5563', margin: '0 0 3px 0' }}>
              {safeCompany.address}
            </p>
            <p style={{ fontSize: '11px', color: '#4b5563', margin: '0 0 3px 0' }}>
              โทร: {safeCompany.phone} | อีเมล: {safeCompany.email}
            </p>
            {safeCompany.taxId && (
              <p style={{ fontSize: '11px', color: '#4b5563', margin: '0 0 0 0' }}>
                เลขประจำตัวผู้เสียภาษี: {safeCompany.taxId}
              </p>
            )}
          </div>

          {/* Document Title - Bold & Clear */}
          <div style={{ textAlign: 'center', marginBottom: '14px', backgroundColor: '#f3f4f6', padding: '10px', borderRadius: '6px', border: '2px solid #d1d5db' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '900', margin: 0, color: '#000000', letterSpacing: '0.5px' }}>
              ใบวางบิล
            </h2>
            <p style={{ fontSize: '14px', fontWeight: '600', margin: '3px 0 0 0', color: '#000000' }}>
              INVOICE
            </p>
            {taxInvoice.invoiceNumber && (
              <p style={{ fontSize: '13px', marginTop: '6px', fontWeight: '600', color: '#000000', margin: '6px 0 0 0' }}>
                เลขที่: {taxInvoice.invoiceNumber}
              </p>
            )}
          </div>

          {/* Customer & Bank Info */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
            <div style={{ flex: 1, backgroundColor: '#eff6ff', padding: '12px', borderRadius: '6px', border: '1px solid #bfdbfe' }}>
              <h3 style={{ fontSize: '13px', fontWeight: '700', marginBottom: '10px', color: '#1e40af', margin: '0 0 10px 0' }}>
                {recipientType === 'customer' ? 'ข้อมูลลูกค้า' : 'ข้อมูลพาร์ทเนอร์'}
              </h3>
              <p style={{ marginBottom: '4px', fontSize: '11px', margin: '0 0 4px 0' }}>
                <strong>ชื่อ:</strong> {recipient.name}
              </p>
              <p style={{ marginBottom: '4px', fontSize: '11px', margin: '0 0 4px 0' }}>
                <strong>ที่อยู่:</strong> {recipient.address}
              </p>
              <p style={{ margin: 0, fontSize: '11px' }}>
                <strong>โทร:</strong> {recipient.phone}
              </p>
            </div>

            {bankInfo && (
              <div style={{ flex: 1, backgroundColor: '#f0fdf4', padding: '12px', borderRadius: '6px', border: '1px solid #bbf7d0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                  {BANK_LOGO_MAP[bankInfo.bankName as ThaiBank] && (
                    <img
                      src={BANK_LOGO_MAP[bankInfo.bankName as ThaiBank]}
                      alt={BANK_NAMES[bankInfo.bankName as ThaiBank]}
                      style={{
                        width: '48px',
                        height: '20px',
                        objectFit: 'contain',
                        display: 'block'
                      }}
                    />
                  )}
                  <h3 style={{ fontSize: '13px', fontWeight: '700', color: '#166534', margin: 0 }}>
                    ข้อมูลบัญชี
                  </h3>
                </div>
                <p style={{ marginBottom: '4px', fontSize: '11px', margin: '0 0 4px 0' }}>
                  <strong>ธนาคาร:</strong> {BANK_NAMES[bankInfo.bankName as ThaiBank] || bankInfo.bankName}
                </p>
                <p style={{ marginBottom: '4px', fontSize: '11px', margin: '0 0 4px 0' }}>
                  <strong>ชื่อบัญชี:</strong> {bankInfo.accountName}
                </p>
                <p style={{ margin: 0, fontSize: '11px' }}>
                  <strong>เลขที่บัญชี:</strong> {bankInfo.accountNumber}
                </p>
              </div>
            )}
          </div>

          {/* QR Code PromptPay (if available) */}
          {bankInfo?.qrCodeUrl && (
            <div style={{ marginBottom: '16px', textAlign: 'center', backgroundColor: '#fef3c7', padding: '14px', borderRadius: '6px', border: '2px solid #fbbf24' }}>
              <h3 style={{ fontSize: '13px', fontWeight: '700', marginBottom: '10px', color: '#92400e', margin: '0 0 10px 0' }}>
                💳 QR Code พร้อมเพย์
              </h3>
              <div style={{ display: 'inline-block', padding: '8px', backgroundColor: '#ffffff', borderRadius: '8px', border: '2px solid #f59e0b' }}>
                <img
                  src={bankInfo.qrCodeUrl}
                  alt="QR Code พร้อมเพย์"
                  style={{
                    width: '140px',
                    height: '140px',
                    display: 'block',
                    margin: '0 auto'
                  }}
                />
              </div>
              <p style={{ fontSize: '10px', color: '#92400e', marginTop: '8px', margin: '8px 0 0 0' }}>
                สแกน QR Code เพื่อชำระเงิน
              </p>
            </div>
          )}

          {/* Payment Terms */}
          {paymentTerms && paymentTerms.terms.length > 0 && (
            <div style={{ marginBottom: '16px', backgroundColor: '#fef3c7', padding: '12px', borderRadius: '6px', border: '1px solid #fbbf24' }}>
              <h3 style={{ fontSize: '13px', fontWeight: '700', marginBottom: '8px', color: '#92400e', margin: '0 0 8px 0' }}>
                เงื่อนไขการชำระเงิน
              </h3>
              {paymentTerms.terms.map((term, idx) => (
                <div key={idx} style={{ marginBottom: '4px', fontSize: '11px', margin: '0 0 4px 0' }}>
                  <strong>งวดที่ {term.installment}:</strong> {term.description} -{' '}
                  {term.percentage !== undefined 
                    ? `${term.percentage}%`
                    : formatCurrency(term.amount || 0)}
                </div>
              ))}
            </div>
          )}

          {/* Summary */}
          <div style={{ maxWidth: '380px', marginLeft: 'auto', marginBottom: '24px' }}>
            <div style={{ backgroundColor: '#ecfdf5', padding: '12px', borderRadius: '6px', border: '2px solid #a7f3d0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '11px' }}>
                <span>รวมก่อน VAT:</span>
                <span style={{ fontWeight: '600' }}>{formatCurrency(summary.totalBeforeVat)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '11px' }}>
                <span>VAT (7%):</span>
                <span style={{ fontWeight: '600' }}>{formatCurrency(summary.vat)}</span>
              </div>
              {summary.discountAmount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '11px', color: '#dc2626' }}>
                  <span>ส่วนลด:</span>
                  <span style={{ fontWeight: '600' }}>-{formatCurrency(summary.discountAmount)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', paddingTop: '10px', borderTop: '2px solid #059669' }}>
                <span style={{ fontWeight: '700' }}>ยอดชำระสุทธิ:</span>
                <span style={{ fontWeight: '700', color: '#059669', fontSize: '16px' }}>
                  {formatCurrency(summary.totalAfterDiscount)}
                </span>
              </div>
            </div>
          </div>

          {/* Signatures */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '32px', marginBottom: '24px' }}>
            <div style={{ width: '45%', textAlign: 'center' }}>
              <div style={{ borderBottom: '2px solid #000', paddingBottom: '50px', marginBottom: '6px' }} />
              <p style={{ margin: 0, fontSize: '11px', fontWeight: '600' }}>ผู้เสนอราคา</p>
              <p style={{ margin: '3px 0 0 0', fontSize: '10px', color: '#6b7280' }}>({safeCompany.name})</p>
            </div>
            <div style={{ width: '45%', textAlign: 'center' }}>
              <div style={{ borderBottom: '2px solid #000', paddingBottom: '50px', marginBottom: '6px' }} />
              <p style={{ margin: 0, fontSize: '11px', fontWeight: '600' }}>ผู้อนุมัติ</p>
              <p style={{ margin: '3px 0 0 0', fontSize: '10px', color: '#6b7280' }}>({recipient.name})</p>
            </div>
          </div>

          {/* Footer */}
          <div style={{ textAlign: 'center', fontSize: '9px', color: '#9ca3af', borderTop: '1px solid #e5e7eb', paddingTop: '10px' }}>
            <p style={{ margin: 0 }}>เอกสารนี้ออกโดย BOQ Management System © {new Date().getFullYear()}</p>
          </div>
        </div>
      </div>

      {/* Receipt Export */}
      <div
        id="receipt-export-section"
        key="receipt-export-section"
        data-export-type="receipt"
        style={{
          backgroundColor: '#ffffff',
          width: '210mm',
          minHeight: '297mm',
          color: '#000000',
          fontFamily: '"Sarabun", "Noto Sans Thai", sans-serif',
          position: 'relative',
        }}
      >
        {/* Large PAID Watermark */}
        {isPaid && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%) rotate(-45deg)',
            fontSize: '120px',
            fontWeight: '900',
            color: 'rgba(16, 185, 129, 0.08)',
            letterSpacing: '10px',
            pointerEvents: 'none',
            zIndex: 0,
            whiteSpace: 'nowrap',
          }}>
            ชำระสำเร็จ
          </div>
        )}
        
        <div style={{ padding: '15mm 12mm', position: 'relative', zIndex: 1 }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '16px', borderBottom: '2px solid #10b981', paddingBottom: '12px' }}>
            <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#10b981', margin: '0 0 6px 0' }}>
              {safeCompany.name}
            </h1>
            <p style={{ fontSize: '11px', color: '#4b5563', margin: '0 0 3px 0' }}>
              {safeCompany.address}
            </p>
            <p style={{ fontSize: '11px', color: '#4b5563', margin: '0 0 3px 0' }}>
              โทร: {safeCompany.phone} | อีเมล: {safeCompany.email}
            </p>
            {safeCompany.taxId && (
              <p style={{ fontSize: '11px', color: '#4b5563', margin: '0 0 0 0' }}>
                เลขประจำตัวผู้เสียภาษี: {safeCompany.taxId}
              </p>
            )}
          </div>

          {/* Document Title - Bold & Clear with PAID Stamp */}
          <div style={{ position: 'relative', textAlign: 'center', marginBottom: '8px', backgroundColor: '#f3f4f6', padding: '14px', borderRadius: '6px', border: '2px solid #d1d5db' }}>
            <h2 style={{ fontSize: '24px', fontWeight: '900', margin: 0, color: '#000000', letterSpacing: '0.5px' }}>
              ใบกำกับภาษี/ใบเสร็จรับเงิน
            </h2>
            <p style={{ fontSize: '16px', fontWeight: '700', margin: '4px 0 0 0', color: '#000000' }}>
              Tax Invoice / Receipt
            </p>
            {taxInvoice.invoiceNumber && (
              <p style={{ fontSize: '13px', marginTop: '6px', fontWeight: '600', color: '#000000', margin: '6px 0 0 0' }}>
                เลขที่: {taxInvoice.invoiceNumber}
              </p>
            )}
            {taxInvoice.receiptNumber && (
              <p style={{ fontSize: '12px', marginTop: '3px', fontWeight: '600', color: '#000000', margin: '3px 0 0 0' }}>
                ใบเสร็จเลขที่: {taxInvoice.receiptNumber}
              </p>
            )}
            
            {/* PAID Stamp */}
            {isPaid && (
              <div style={{
                position: 'absolute',
                top: '50%',
                right: '20px',
                transform: 'translateY(-50%) rotate(-15deg)',
                border: '4px solid #10b981',
                borderRadius: '8px',
                padding: '8px 16px',
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.2)',
              }}>
                <div style={{ 
                  fontSize: '24px', 
                  fontWeight: '900', 
                  color: '#dc2626', 
                  letterSpacing: '2px',
                  textShadow: 'none',
                }}>
                  ชำระสำเร็จ
                </div>
                <div style={{ 
                  fontSize: '14px', 
                  fontWeight: '700', 
                  color: '#10b981', 
                  letterSpacing: '1px',
                  marginTop: '2px',
                }}>
                  PAID
                </div>
              </div>
            )}
          </div>

          {/* Dates */}
          <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', fontSize: '11px' }}>
            <div style={{ flex: 1 }}>
              <p style={{ margin: '3px 0' }}>
                <strong>วันที่ออกเอกสาร:</strong> {new Date(taxInvoice.issueDate).toLocaleDateString('th-TH')}
              </p>
            </div>
            {taxInvoice.dueDate && (
              <div style={{ flex: 1 }}>
                <p style={{ margin: '3px 0' }}>
                  <strong>วันที่ครบกำหนด:</strong> {new Date(taxInvoice.dueDate).toLocaleDateString('th-TH')}
                </p>
              </div>
            )}
          </div>

          {/* Customer & Bank */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
            <div style={{ flex: 1, backgroundColor: '#eff6ff', padding: '12px', borderRadius: '6px', border: '1px solid #bfdbfe' }}>
              <h3 style={{ fontSize: '13px', fontWeight: '700', marginBottom: '10px', color: '#1e40af', margin: '0 0 10px 0' }}>
                {recipientType === 'customer' ? 'ลูกค้า' : 'พาร์ทเนอร์'}
              </h3>
              <p style={{ marginBottom: '4px', fontSize: '11px', margin: '0 0 4px 0' }}>
                <strong>ชื่อ:</strong> {recipient.name}
              </p>
              <p style={{ marginBottom: '4px', fontSize: '11px', margin: '0 0 4px 0' }}>
                <strong>ที่อยู่:</strong> {recipient.address}
              </p>
              <p style={{ marginBottom: '4px', fontSize: '11px', margin: '0 0 4px 0' }}>
                <strong>โทร:</strong> {recipient.phone}
              </p>
              {recipient.taxId && (
                <p style={{ margin: 0, fontSize: '11px' }}>
                  <strong>เลขประจำตัวผู้เสียภาษี:</strong> {recipient.taxId}
                </p>
              )}
            </div>

            {bankInfo && (
              <div style={{ flex: 1, backgroundColor: '#f0fdf4', padding: '12px', borderRadius: '6px', border: '1px solid #bbf7d0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                  {BANK_LOGO_MAP[bankInfo.bankName as ThaiBank] && (
                    <img
                      src={BANK_LOGO_MAP[bankInfo.bankName as ThaiBank]}
                      alt={BANK_NAMES[bankInfo.bankName as ThaiBank]}
                      style={{
                        width: '48px',
                        height: '20px',
                        objectFit: 'contain',
                        display: 'block'
                      }}
                    />
                  )}
                  <h3 style={{ fontSize: '13px', fontWeight: '700', color: '#166534', margin: 0 }}>
                    ข้อมูลบัญชี
                  </h3>
                </div>
                <p style={{ marginBottom: '4px', fontSize: '11px', margin: '0 0 4px 0' }}>
                  <strong>ธนาคาร:</strong> {BANK_NAMES[bankInfo.bankName as ThaiBank] || bankInfo.bankName}
                </p>
                <p style={{ marginBottom: '4px', fontSize: '11px', margin: '0 0 4px 0' }}>
                  <strong>ชื่อบัญชี:</strong> {bankInfo.accountName}
                </p>
                <p style={{ margin: 0, fontSize: '11px' }}>
                  <strong>เลขที่บัญชี:</strong> {bankInfo.accountNumber}
                </p>
              </div>
            )}
          </div>

          {/* Project Info */}
          <div style={{ marginBottom: '16px', backgroundColor: '#fef3c7', padding: '12px', borderRadius: '6px', border: '1px solid #fbbf24' }}>
            <h3 style={{ fontSize: '13px', fontWeight: '700', marginBottom: '6px', color: '#92400e', margin: '0 0 6px 0' }}>
              รายละเอียดโครงการ
            </h3>
            <p style={{ marginBottom: '3px', fontSize: '11px', margin: '0 0 3px 0' }}>
              <strong>โครงการ:</strong> {projectTitle}
            </p>
            {projectDescription && (
              <p style={{ marginBottom: '3px', fontSize: '11px', margin: '0 0 3px 0' }}>
                <strong>รายละเอียด:</strong> {projectDescription}
              </p>
            )}
            {projectLocation && (
              <p style={{ margin: 0, fontSize: '11px' }}>
                <strong>สถานที่:</strong> {projectLocation}
              </p>
            )}
          </div>

          {/* QR Code PromptPay (if available) - Receipt */}
          {bankInfo?.qrCodeUrl && (
            <div style={{ marginBottom: '16px', display: 'flex', gap: '12px' }}>
              <div style={{ flex: 1 }}>
                {/* Left side content placeholder - for future use */}
              </div>
              <div style={{ width: '180px', textAlign: 'center', backgroundColor: '#ecfdf5', padding: '12px', borderRadius: '6px', border: '2px solid #10b981' }}>
                <h3 style={{ fontSize: '12px', fontWeight: '700', marginBottom: '8px', color: '#065f46', margin: '0 0 8px 0' }}>
                  💳 QR Code พร้อมเพย์
                </h3>
                <div style={{ display: 'inline-block', padding: '6px', backgroundColor: '#ffffff', borderRadius: '6px', border: '2px solid #10b981' }}>
                  <img
                    src={bankInfo.qrCodeUrl}
                    alt="QR Code พร้อมเพย์"
                    style={{
                      width: '120px',
                      height: '120px',
                      display: 'block',
                      margin: '0 auto'
                    }}
                  />
                </div>
                <p style={{ fontSize: '9px', color: '#065f46', marginTop: '6px', margin: '6px 0 0 0' }}>
                  สแกนเพื่อชำระเงิน
                </p>
              </div>
            </div>
          )}

          {/* Tax Summary */}
          <div style={{ maxWidth: '420px', marginLeft: 'auto', marginBottom: '24px' }}>
            <div style={{ backgroundColor: '#ecfdf5', padding: '12px', borderRadius: '6px', border: '2px solid #a7f3d0' }}>
              <h3 style={{ fontSize: '13px', fontWeight: '700', marginBottom: '10px', color: '#166534', margin: '0 0 10px 0' }}>
                สรุปภาษีและยอดเงิน
              </h3>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '11px' }}>
                <span>รวมก่อน VAT:</span>
                <span style={{ fontWeight: '600' }}>{formatCurrency(summary.totalBeforeVat)}</span>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '11px' }}>
                <span>VAT (7%):</span>
                <span style={{ fontWeight: '600' }}>{formatCurrency(summary.vat)}</span>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '11px' }}>
                <span>รวมรวม VAT:</span>
                <span style={{ fontWeight: '600' }}>{formatCurrency(summary.grandTotal)}</span>
              </div>
              
              {summary.discountAmount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '11px', color: '#dc2626' }}>
                  <span>ส่วนลด:</span>
                  <span style={{ fontWeight: '600' }}>-{formatCurrency(summary.discountAmount)}</span>
                </div>
              )}
              
              {withholdingTaxRate > 0 && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '11px', paddingTop: '6px', borderTop: '1px solid #d1d5db' }}>
                    <span>ยอดหลังหักส่วนลด:</span>
                    <span style={{ fontWeight: '600' }}>{formatCurrency(summary.totalAfterDiscount)}</span>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '11px', color: '#dc2626' }}>
                    <span>หัก ณ ที่จ่าย ({withholdingTaxRate}%):</span>
                    <span style={{ fontWeight: '600' }}>-{formatCurrency(summary.withholdingTaxAmount)}</span>
                  </div>
                </>
              )}
              
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', paddingTop: '10px', borderTop: '2px solid #10b981', marginTop: '6px' }}>
                <span style={{ fontWeight: '700' }}>ยอดชำระสุทธิ:</span>
                <span style={{ fontWeight: '700', color: '#10b981', fontSize: '17px' }}>
                  {formatCurrency(withholdingTaxRate > 0 ? summary.netPayable : summary.totalAfterDiscount)}
                </span>
              </div>
            </div>
          </div>

          {/* Payment Method & Status */}
          <div style={{ marginBottom: '16px', fontSize: '11px' }}>
            <p style={{ margin: '3px 0' }}>
              <strong>วิธีชำระเงิน:</strong> {
                taxInvoice.paymentMethod === 'cash' ? 'เงินสด' :
                taxInvoice.paymentMethod === 'transfer' ? 'โอนเงิน' :
                taxInvoice.paymentMethod === 'check' ? 'เช็ค' :
                'อื่นๆ'
              }
            </p>
            {/* Payment Status Box */}
            {isPaid && (
              <div style={{ 
                marginTop: '8px', 
                padding: '10px 12px', 
                backgroundColor: '#d1fae5', 
                border: '2px solid #10b981', 
                borderRadius: '6px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '24px', marginBottom: '6px' }}>
                  <div>
                    <p style={{ margin: '0', fontWeight: '700', color: '#065f46', fontSize: '12px' }}>
                      ✓ ชำระแล้ว:
                    </p>
                    <p style={{ margin: '2px 0 0 0', fontSize: '15px', fontWeight: '700', color: '#10b981' }}>
                      {formatCurrency(paidAmount)}
                    </p>
                  </div>
                  {exportingInstallment && remainingAmount > 0 && (
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ margin: '0', fontWeight: '700', color: '#065f46', fontSize: '12px' }}>
                        คงเหลือ:
                      </p>
                      <p style={{ margin: '2px 0 0 0', fontSize: '15px', fontWeight: '700', color: '#ea580c' }}>
                        {formatCurrency(remainingAmount)}
                      </p>
                    </div>
                  )}
                </div>
                <p style={{ margin: '6px 0 0 0', fontSize: '10px', color: '#047857', borderTop: '1px solid #a7f3d0', paddingTop: '6px' }}>
                  วันที่ชำระ: {paidDate.toLocaleDateString('th-TH', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            )}
            {taxInvoice.notes && (
              <p style={{ margin: '8px 0 0 0' }}>
                <strong>หมายเหตุ:</strong> {taxInvoice.notes}
              </p>
            )}
          </div>

          {/* Signatures */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '32px', marginBottom: '24px' }}>
            <div style={{ width: '45%', textAlign: 'center' }}>
              <div style={{ borderBottom: '2px solid #000', paddingBottom: '50px', marginBottom: '6px' }} />
              <p style={{ margin: 0, fontSize: '11px', fontWeight: '600' }}>ผู้รับเงิน</p>
              <p style={{ margin: '3px 0 0 0', fontSize: '10px', color: '#6b7280' }}>({safeCompany.name})</p>
            </div>
            <div style={{ width: '45%', textAlign: 'center' }}>
              <div style={{ borderBottom: '2px solid #000', paddingBottom: '50px', marginBottom: '6px' }} />
              <p style={{ margin: 0, fontSize: '11px', fontWeight: '600' }}>ผู้จ่ายเงิน</p>
              <p style={{ margin: '3px 0 0 0', fontSize: '10px', color: '#6b7280' }}>({recipient.name})</p>
            </div>
          </div>

          {/* Footer */}
          <div style={{ textAlign: 'center', fontSize: '9px', color: '#9ca3af', borderTop: '1px solid #e5e7eb', paddingTop: '10px' }}>
            <p style={{ margin: '3px 0' }}>เอกสารนี้ออกโดย BOQ Management System</p>
            <p style={{ margin: '3px 0' }}>© {new Date().getFullYear()} {safeCompany.name}</p>
            {taxInvoice.invoiceNumber && (
              <p style={{ margin: '3px 0', fontFamily: 'monospace' }}>
                Document ID: {taxInvoice.invoiceNumber}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}