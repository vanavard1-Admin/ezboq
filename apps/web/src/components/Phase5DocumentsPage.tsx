import React, { useMemo, useState } from 'react';
import { ArrowLeft, Banknote, Calendar, DollarSign, FileText, Receipt, RefreshCw } from 'lucide-react';
import { ConstructionContractorInvoiceDocument } from './ConstructionContractorInvoiceDocument';
import { ConstructionCustomerQuotationDocument } from './ConstructionCustomerQuotationDocument';
import { ConstructionQuotationDocument } from './ConstructionQuotationDocument';
import { InvoiceDocument } from './InvoiceDocument';
import { WorkPlanDocument } from './WorkPlanDocument';
import { getProjectCustomerAmount, prepareProjectDocuments } from '../utils/projectData';
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

type Phase5DocumentTab =
  | 'cost-quotation'
  | 'customer-quotation'
  | 'invoice'
  | 'contractor-invoice'
  | 'workplan';

export function Phase5DocumentsPage() {
  const [activeDoc, setActiveDoc] = useState<Phase5DocumentTab>('cost-quotation');
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const project = useMemo(
    () => loadProjectById('phase5-final-finishing'),
    [],
  );
  const preparedProject = useMemo(
    () => (project ? prepareProjectDocuments(project) : null),
    [project],
  );

  if (!project || !preparedProject) {
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

  const totalCost = preparedProject.quotationData.reduce((sum, item) => {
    if (!item.quantity || item.quantity === '') return sum;

    const quantity = Number(item.quantity) || 0;
    const unitPrice = Number(item.unitPrice) || 0;
    const laborCost = Number(item.laborCost) || 0;

    return sum + quantity * (unitPrice + laborCost);
  }, 0);
  const customerPrice = Math.round(preparedProject.customerPrice || preparedProject.quotationData.reduce(
    (sum, item) => sum + getProjectCustomerAmount(preparedProject, item),
    0,
  ));
  const grandTotal = customerPrice + Math.round(preparedProject.operatingCost || customerPrice * 0.05);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('th-TH', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);

  return (
    <div className="min-h-screen bg-gray-100">
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
              <span className="text-sm">ใบเสนอราคาต้นทุน</span>
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
              <span className="text-sm">ใบวางบิล</span>
            </button>
            <button
              onClick={() => setActiveDoc('contractor-invoice')}
              className={`flex items-center gap-2 px-4 py-2 rounded-t-lg transition-all whitespace-nowrap ${
                activeDoc === 'contractor-invoice'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md'
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
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span className="text-sm">แผนงาน</span>
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

      <div className="max-w-[1200px] mx-auto p-4">
        <div className="bg-white rounded-lg shadow-lg">
          {activeDoc === 'cost-quotation' && <ConstructionQuotationDocument project={project} />}
          {activeDoc === 'customer-quotation' && <ConstructionCustomerQuotationDocument project={project} />}
          {activeDoc === 'invoice' && <InvoiceDocument project={project} />}
          {activeDoc === 'contractor-invoice' && <ConstructionContractorInvoiceDocument project={project} />}
          {activeDoc === 'workplan' && <WorkPlanDocument project={project} />}
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-4 pb-4 print:hidden">
        <div className="bg-gradient-to-r from-fuchsia-700 to-rose-700 text-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl mb-4">สรุปราคาโครงการ Phase 5</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <p className="text-fuchsia-100 text-sm mb-1">ต้นทุนรวม</p>
              <p className="text-2xl">{formatCurrency(totalCost)} บาท</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <p className="text-fuchsia-100 text-sm mb-1">เสนอลูกค้า (+25%)</p>
              <p className="text-2xl">{formatCurrency(customerPrice)} บาท</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <p className="text-fuchsia-100 text-sm mb-1">รวมค่าดำเนินการ 5%</p>
              <p className="text-2xl">{formatCurrency(grandTotal)} บาท</p>
            </div>
          </div>
          <div className="mt-4 text-sm text-fuchsia-100">
            <p>✓ I) งานสีผนังและเก็บผิว: 26,000 บาท</p>
            <p>✓ J) งานเก็บงาน / Defect / Big Cleaning: 14,000 บาท</p>
            <p>✓ เหมาะสำหรับปิดงานรอบสุดท้ายก่อนส่งมอบ</p>
          </div>
        </div>
      </div>
    </div>
  );
}
