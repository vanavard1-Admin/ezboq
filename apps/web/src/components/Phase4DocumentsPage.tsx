import React, { useMemo, useState } from 'react';
import { FileText, ArrowLeft, DollarSign, Receipt, Banknote, Calendar, ShoppingCart, FileSignature, BadgeCheck, RefreshCw } from 'lucide-react';
import { ConstructionQuotationDocument } from './ConstructionQuotationDocument';
import { ConstructionCustomerQuotationDocument } from './ConstructionCustomerQuotationDocument';
import { Phase4InvoiceDocument } from './Phase4InvoiceDocument';
import { ConstructionContractorInvoiceDocument } from './ConstructionContractorInvoiceDocument';
import { Phase4WorkPlanDocument } from './Phase4WorkPlanDocument';
import { ConstructionPurchaseOrderDocument } from './ConstructionPurchaseOrderDocument';
import { ConstructionContractDocument } from './ConstructionContractDocument';
import { ConstructionReceiptDocument } from './ConstructionReceiptDocument';
import { clearProjectUiState, loadProjectById, resetToDefault, setSpecialPageState } from '../utils/storageUtils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';

export function Phase4DocumentsPage() {
  const [activeDoc, setActiveDoc] = useState<'cost-quotation' | 'customer-quotation' | 'invoice' | 'contractor-invoice' | 'workplan' | 'purchase-order' | 'contract' | 'receipt'>('cost-quotation');
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const project = useMemo(
    () => loadProjectById('phase4-builtin-furniture'),
    [],
  );

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center max-w-md">
          <p className="text-slate-500 text-sm">ไม่พบข้อมูลโครงการ</p>
          <p className="text-slate-400 text-xs mt-2">กรุณาสร้างโครงการใหม่จากหน้าหลัก</p>
          <button
            onClick={() => { setSpecialPageState(false); window.location.reload(); }}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
          >
            กลับหน้าหลัก
          </button>
        </div>
      </div>
    );
  }

  const handleBackToMain = () => {
    if (typeof window !== 'undefined') {
      setSpecialPageState(false);
      window.location.reload();
    }
  };

  const handleResetProjects = () => {
    resetToDefault();
    clearProjectUiState();

    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Navigation */}
      <div className="bg-white shadow-md print:hidden sticky top-0 z-10">
        <div className="max-w-[1200px] mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <button
                onClick={handleBackToMain}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-slate-100 hover:bg-slate-200 rounded transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>กลับหน้าหลัก</span>
              </button>
              
              <button
                onClick={() => setResetDialogOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-amber-50 border border-amber-200 text-amber-700 rounded hover:bg-amber-100 transition-colors"
                title="รีเซ็ตโครงการกลับเป็นค่าเริ่มต้น"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>รีเซ็ต</span>
              </button>
              
              <div>
                <h1 className="text-lg">โครงการ: {project.name}</h1>
                <p className="text-xs text-slate-600">{project.address}</p>
              </div>
            </div>
          </div>

          {/* Document Tabs */}
          <div className="flex gap-2 overflow-x-auto">
            <button
              onClick={() => setActiveDoc('cost-quotation')}
              className={`flex items-center gap-2 px-4 py-2 rounded-t-lg transition-all whitespace-nowrap ${
                activeDoc === 'cost-quotation'
                  ? 'bg-orange-600 text-white shadow-md'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span className="text-sm">ใบเสนอราคาต้นทุน (ช่าง)</span>
            </button>
            <button
              onClick={() => setActiveDoc('customer-quotation')}
              className={`flex items-center gap-2 px-4 py-2 rounded-t-lg transition-all whitespace-nowrap ${
                activeDoc === 'customer-quotation'
                  ? 'bg-gradient-to-r from-slate-700 to-slate-800 text-white shadow-md'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <DollarSign className="w-4 h-4" />
              <span className="text-sm">ใบเสนอราคาลูกค้า</span>
            </button>
            <button
              onClick={() => setActiveDoc('invoice')}
              className={`flex items-center gap-2 px-4 py-2 rounded-t-lg transition-all whitespace-nowrap ${
                activeDoc === 'invoice'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <Receipt className="w-4 h-4" />
              <span className="text-sm">ใบแจ้งหนี้</span>
            </button>
            <button
              onClick={() => setActiveDoc('contractor-invoice')}
              className={`flex items-center gap-2 px-4 py-2 rounded-t-lg transition-all whitespace-nowrap ${
                activeDoc === 'contractor-invoice'
                  ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-md'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <Banknote className="w-4 h-4" />
              <span className="text-sm">ใบเบิกช่าง</span>
            </button>
            <button
              onClick={() => setActiveDoc('workplan')}
              className={`flex items-center gap-2 px-4 py-2 rounded-t-lg transition-all whitespace-nowrap ${
                activeDoc === 'workplan'
                  ? 'bg-gradient-to-r from-green-600 to-green-700 text-white shadow-md'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span className="text-sm">แผนการทำงาน</span>
            </button>
            <button
              onClick={() => setActiveDoc('purchase-order')}
              className={`flex items-center gap-2 px-4 py-2 rounded-t-lg transition-all whitespace-nowrap ${
                activeDoc === 'purchase-order'
                  ? 'bg-gradient-to-r from-teal-600 to-teal-700 text-white shadow-md'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <ShoppingCart className="w-4 h-4" />
              <span className="text-sm">ใบสั่งซื้อ</span>
            </button>
            <button
              onClick={() => setActiveDoc('contract')}
              className={`flex items-center gap-2 px-4 py-2 rounded-t-lg transition-all whitespace-nowrap ${
                activeDoc === 'contract'
                  ? 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-md'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <FileSignature className="w-4 h-4" />
              <span className="text-sm">สัญญา</span>
            </button>
            <button
              onClick={() => setActiveDoc('receipt')}
              className={`flex items-center gap-2 px-4 py-2 rounded-t-lg transition-all whitespace-nowrap ${
                activeDoc === 'receipt'
                  ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-white shadow-md'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <BadgeCheck className="w-4 h-4" />
              <span className="text-sm">ใบเสร็จรับเงิน</span>
            </button>
          </div>
        </div>
      </div>

      <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>รีเซ็ตข้อมูลโครงการนี้?</AlertDialogTitle>
            <AlertDialogDescription>
              ระบบจะคืนค่าข้อมูลกลับเป็นค่าเริ่มต้น และล้างการแก้ไขที่ยังเก็บไว้ในเครื่องนี้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={handleResetProjects}>รีเซ็ต</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Document Content */}
      <div className="max-w-[1200px] mx-auto p-4">
        {activeDoc === 'cost-quotation' && <ConstructionQuotationDocument project={project} />}
        {activeDoc === 'customer-quotation' && <ConstructionCustomerQuotationDocument project={project} />}
        {activeDoc === 'invoice' && <Phase4InvoiceDocument project={project} />}
        {activeDoc === 'contractor-invoice' && <ConstructionContractorInvoiceDocument project={project} />}
        {activeDoc === 'workplan' && <Phase4WorkPlanDocument project={project} />}
        {activeDoc === 'purchase-order' && <ConstructionPurchaseOrderDocument project={project} />}
        {activeDoc === 'contract' && <ConstructionContractDocument project={project} />}
        {activeDoc === 'receipt' && <ConstructionReceiptDocument project={project} />}
      </div>
    </div>
  );
}
