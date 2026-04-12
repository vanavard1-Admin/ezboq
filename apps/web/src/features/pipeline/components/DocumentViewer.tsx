/**
 * DocumentViewer — Full-screen modal to view, export PDF, and send via LINE
 * Renders existing document components in a preview pane
 */
import { Suspense, lazy, useCallback, useRef, useState } from 'react';
import { ArrowLeft, Download, Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';
import type { ProjectData } from '../../../utils/projectData';
import type { CompanyProfile } from '../../../utils/companyProfile';

// Lazy document components
const QuotationDocument = lazy(() => import('../../../components/QuotationDocument').then(m => ({ default: m.QuotationDocument })));
const CustomerQuotationDocument = lazy(() => import('../../../components/CustomerQuotationDocument').then(m => ({ default: m.CustomerQuotationDocument })));
const ContractDocument = lazy(() => import('../../../components/ContractDocument').then(m => ({ default: m.ContractDocument })));
const InvoiceDocument = lazy(() => import('../../../components/InvoiceDocument').then(m => ({ default: m.InvoiceDocument })));
const ContractorInvoiceDocument = lazy(() => import('../../../components/ContractorInvoiceDocument').then(m => ({ default: m.ContractorInvoiceDocument })));
const PurchaseOrderDocument = lazy(() => import('../../../components/PurchaseOrderDocument').then(m => ({ default: m.PurchaseOrderDocument })));
const WorkPlanDocument = lazy(() => import('../../../components/WorkPlanDocument').then(m => ({ default: m.WorkPlanDocument })));
const ReceiptDocument = lazy(() => import('../../../components/ReceiptDocument').then(m => ({ default: m.ReceiptDocument })));
const VatInvoiceDocument = lazy(() => import('../../../components/VatInvoiceDocument').then(m => ({ default: m.VatInvoiceDocument })));
const WithholdingTaxDocument = lazy(() => import('../../../components/WithholdingTaxDocument').then(m => ({ default: m.WithholdingTaxDocument })));
const SummaryInvoiceDocument = lazy(() => import('../../../components/SummaryInvoiceDocument').then(m => ({ default: m.SummaryInvoiceDocument })));
const ExpenseVoucherDocument = lazy(() => import('../../../components/ExpenseVoucherDocument').then(m => ({ default: m.ExpenseVoucherDocument })));
const PaymentVoucherDocument = lazy(() => import('../../../components/PaymentVoucherDocument').then(m => ({ default: m.PaymentVoucherDocument })));
const GoodsReceiptDocument = lazy(() => import('../../../components/GoodsReceiptDocument').then(m => ({ default: m.GoodsReceiptDocument })));
const ExpenseRecordDocument = lazy(() => import('../../../components/ExpenseRecordDocument').then(m => ({ default: m.ExpenseRecordDocument })));
const InputTaxInvoiceDocument = lazy(() => import('../../../components/InputTaxInvoiceDocument').then(m => ({ default: m.InputTaxInvoiceDocument })));
const TaxSummaryReportDocument = lazy(() => import('../../../components/TaxSummaryReportDocument').then(m => ({ default: m.TaxSummaryReportDocument })));

export type ViewableDocument =
  | 'quotation'
  | 'customer-quotation'
  | 'contract'
  | 'invoice'
  | 'contractor-invoice'
  | 'purchase-order'
  | 'work-plan'
  | 'receipt'
  | 'vat-invoice'
  | 'withholding-tax'
  | 'summary-invoice'
  | 'expense-voucher'
  | 'payment-voucher'
  | 'goods-receipt'
  | 'expense-record'
  | 'input-tax-invoice'
  | 'tax-summary-report';

const DOC_LABELS: Record<ViewableDocument, string> = {
  'quotation': 'ต้นทุน / BOQ',
  'customer-quotation': 'ใบเสนอราคา',
  'contract': 'สัญญาจ้าง',
  'invoice': 'ใบวางบิล',
  'contractor-invoice': 'ใบเบิกช่าง',
  'purchase-order': 'ใบสั่งซื้อ',
  'work-plan': 'แผนการทำงาน',
  'receipt': 'ใบเสร็จรับเงิน',
  'vat-invoice': 'ใบกำกับภาษี',
  'withholding-tax': 'หัก ณ ที่จ่าย',
  'summary-invoice': 'สรุปบิล',
  'expense-voucher': 'ใบสำคัญจ่าย',
  'payment-voucher': 'ใบสำคัญรับ',
  'goods-receipt': 'ใบรับสินค้า',
  'expense-record': 'บันทึกรายจ่าย',
  'input-tax-invoice': 'ใบกำกับภาษีซื้อ',
  'tax-summary-report': 'รายงานภาษีซื้อ-ขาย',
};

interface DocumentViewerProps {
  docType: ViewableDocument;
  project: ProjectData;
  companyProfile: CompanyProfile;
  installmentNumber?: number;
  onClose: () => void;
  /** If provided, show LINE send button */
  userId?: string;
  categoryFilter?: string;
  canExport?: boolean;
  onUpgradeRequired?: () => void;
  workspaceMode?: 'cloud' | 'local-cache' | 'mock' | 'line';
  onProjectUpdate?: (project: ProjectData) => void;
}

export function DocumentViewer({
  docType,
  project,
  companyProfile,
  installmentNumber = 1,
  onClose,
  userId,
  categoryFilter,
  canExport = true,
  onUpgradeRequired,
  workspaceMode,
  onProjectUpdate,
}: DocumentViewerProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isSendingLine, setIsSendingLine] = useState(false);
  const exportElementId = `pipeline-document-${docType}`;
  const pdfFilename = `${DOC_LABELS[docType]}_${project.name}.pdf`.replace(/\s+/g, '_');

  const handleExportPdf = useCallback(async () => {
    if (!canExport) {
      onUpgradeRequired?.();
      return;
    }
    if (!contentRef.current) return;
    setIsExporting(true);
    try {
      const { exportDocumentAsPDF } = await import('../../../utils/exportUtils');
      await exportDocumentAsPDF(exportElementId, pdfFilename, undefined, { download: true });
      toast.success('ดาวน์โหลด PDF แล้ว');
    } catch (err) {
      console.error('PDF export failed:', err);
      toast.error(err instanceof Error ? err.message : 'Export PDF ไม่สำเร็จ', {
        action: {
          label: 'ลองใหม่',
          onClick: () => handleExportPdf(),
        },
      });
    } finally {
      setIsExporting(false);
    }
  }, [canExport, exportElementId, onUpgradeRequired, pdfFilename]);

  const handleSendLine = useCallback(async () => {
    if (!canExport) {
      onUpgradeRequired?.();
      return;
    }
    if (!userId) return;

    if (workspaceMode !== 'line') {
      toast.error('LINE not connected - Please link your account to send documents');
      return;
    }

    setIsSendingLine(true);
    try {
      const { exportDocumentAsPDF, sharePdfFile } = await import('../../../utils/exportUtils');
      const blob = await exportDocumentAsPDF(exportElementId, pdfFilename, undefined, { download: false });
      const shared = await sharePdfFile(blob, pdfFilename, `📄 ${DOC_LABELS[docType]} — ${project.name}`);

      if (shared) {
        toast.success('เปิด share sheet แล้ว เลือก LINE เพื่อส่งต่อได้เลย');
      } else {
        await exportDocumentAsPDF(exportElementId, pdfFilename, undefined, { download: true });
        toast('อุปกรณ์นี้ยังแชร์ไฟล์เข้า LINE โดยตรงไม่ได้ จึงดาวน์โหลด PDF ให้แทนแล้ว');
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        toast('ยกเลิกการแชร์ไฟล์แล้ว');
        return;
      }
      console.error('LINE send failed:', err);
      toast.error(err instanceof Error ? err.message : 'ส่งไฟล์เข้า LINE ไม่สำเร็จ', {
        action: {
          label: 'ลองใหม่',
          onClick: () => handleSendLine(),
        },
      });
    } finally {
      setIsSendingLine(false);
    }
  }, [canExport, workspaceMode, userId, exportElementId, pdfFilename, DOC_LABELS, docType, project.name, onUpgradeRequired]);

  const renderDocument = () => {
    if (!project.quotationData) {
      return <div className="p-8 text-center text-slate-500">ไม่พบข้อมูลใบเสนอราคา</div>;
    }
    const props = { project, companyProfile };
    const safeInstallment = project.paymentSchedule
      ? Math.min(installmentNumber, project.paymentSchedule.length || 1)
      : installmentNumber;
    switch (docType) {
      case 'quotation': return <QuotationDocument {...props} onUpdate={onProjectUpdate} />;
      case 'customer-quotation': return <CustomerQuotationDocument {...props} />;
      case 'contract': return <ContractDocument {...props} />;
      case 'invoice': return <InvoiceDocument {...props} />;
      case 'contractor-invoice': return <ContractorInvoiceDocument {...props} installmentNumber={safeInstallment} />;
      case 'purchase-order': return <PurchaseOrderDocument {...props} categoryFilter={categoryFilter} />;
      case 'work-plan':
        if (!project.workPlan) return <div className="p-8 text-center text-slate-500">ยังไม่มีข้อมูลแผนงาน</div>;
        return <WorkPlanDocument {...props} />;
      case 'receipt': return <ReceiptDocument {...props} />;
      case 'vat-invoice': return <VatInvoiceDocument {...props} />;
      case 'withholding-tax': return <WithholdingTaxDocument {...props} />;
      case 'summary-invoice': return <SummaryInvoiceDocument {...props} />;
      case 'expense-voucher': return <ExpenseVoucherDocument {...props} contractorName="-" categoryLabel="-" installmentNo={1} amount={0} />;
      case 'payment-voucher': return <PaymentVoucherDocument {...props} payeeName="-" amount={0} netAmount={0} paymentMethod="transfer" description="-" />;
      case 'goods-receipt': return <GoodsReceiptDocument {...props} supplierName="-" categoryLabel="-" items={[]} />;
      case 'expense-record': return <ExpenseRecordDocument {...props} />;
      case 'input-tax-invoice': return <InputTaxInvoiceDocument {...props} />;
      case 'tax-summary-report': return <TaxSummaryReportDocument {...props} />;
      default: return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col" data-print-document>
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between safe-area-top print:hidden">
        <button onClick={onClose} className="flex items-center gap-1 text-sm text-blue-600 font-medium">
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">กลับ</span>
        </button>

        <h1 className="text-sm font-semibold text-slate-800 truncate max-w-[180px] sm:max-w-none">
          {DOC_LABELS[docType]}
        </h1>

        <div className="flex items-center gap-2">
          {/* Export PDF */}
          <button
            onClick={handleExportPdf}
            disabled={isExporting}
            className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">PDF</span>
          </button>

          {/* Send LINE */}
          {userId && (
            <button
              onClick={handleSendLine}
              disabled={isSendingLine}
              className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {isSendingLine ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">LINE</span>
            </button>
          )}
        </div>
      </header>

      {/* Document Content */}
      <div className="flex-1 overflow-y-auto bg-slate-100">
        <div className="max-w-4xl mx-auto p-4">
          <div id={exportElementId} ref={contentRef} className="bg-white rounded-lg shadow-sm">
            <Suspense
              fallback={
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                </div>
              }
            >
              {renderDocument()}
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}
