import React, { useState, useCallback, useEffect } from 'react';
import { ArrowLeft, Download, Loader2, Plus, Trash2, ChevronDown } from 'lucide-react';
import { loadCompanyProfile } from '../utils/companyProfile';
import { CentroDesignQuotationDocument } from './CentroDesignQuotationDocument';
import { CentroDesignInvoiceDocument } from './CentroDesignInvoiceDocument';
import { CentroDesignContractDocument } from './CentroDesignContractDocument';
import { CentroDesignWorkPlanDocument } from './CentroDesignWorkPlanDocument';
import { clearProjectUiState, loadProjectById, resetToDefault, setSpecialPageState, updateProject } from '../utils/storageUtils';
import { QuotationItem, ProjectData } from '../utils/projectData';
import { exportMultipleElementsAsSinglePDF } from '../utils/exportUtils';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter, DialogClose, DialogTrigger,
} from './ui/dialog';
import { Progress } from './ui/progress';
import { Button } from './ui/button';

type DocumentType = 'quotation' | 'invoice' | 'contract' | 'work-plan';
type ActiveTab = 'documents' | 'data';

const documents = [
  { id: 'quotation' as DocumentType, name: 'ใบเสนอราคา', component: CentroDesignQuotationDocument },
  { id: 'invoice' as DocumentType, name: 'ใบวางบิล', component: CentroDesignInvoiceDocument },
  { id: 'contract' as DocumentType, name: 'สัญญา', component: CentroDesignContractDocument },
  { id: 'work-plan' as DocumentType, name: 'แผนงาน', component: CentroDesignWorkPlanDocument },
];

export function CentroDocumentsPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('documents');
  const [selectedDoc, setSelectedDoc] = useState<DocumentType>('quotation');
  const co = loadCompanyProfile();
  const [isExportingAll, setIsExportingAll] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStatus, setExportStatus] = useState('');

  const [project, setProject] = useState<ProjectData | null>(() =>
    loadProjectById('centro-ratchaphruek-suanphak'),
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

  const [editData, setEditData] = useState<ProjectData>(project);

  // Sync editData when entering data tab
  useEffect(() => {
    if (activeTab === 'data') {
      setEditData({ ...project, quotationData: project.quotationData.map(item => ({ ...item })) });
    }
  }, [activeTab]);

  // --- Calculations ---
  const calculateAmount = (item: QuotationItem): number => {
    if (!item.quantity || item.quantity === '') return 0;
    return Number(item.quantity) * ((Number(item.unitPrice) || 0) + (Number(item.laborCost) || 0));
  };

  const subtotalBeforeDiscount = project.quotationData.reduce((sum, item) => sum + calculateAmount(item), 0);
  const grandTotal = subtotalBeforeDiscount * 0.75;
  const totalArea = project.quotationData
    .filter(item => item.no.includes('.') && item.unit === 'ตร.ม.')
    .reduce((sum, item) => sum + Number(item.quantity), 0);

  const formatCurrency = (value: number): string =>
    new Intl.NumberFormat('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);

  // --- Edit handlers ---
  const handleEditField = (field: keyof ProjectData, value: string) => {
    setEditData(prev => ({ ...prev, [field]: value }));
  };

  const handleEditItem = (index: number, field: keyof QuotationItem, value: string | number) => {
    setEditData(prev => {
      const newItems = [...prev.quotationData];
      newItems[index] = { ...newItems[index], [field]: value };
      return { ...prev, quotationData: newItems };
    });
  };

  const handleAddItem = () => {
    const existingSubItems = editData.quotationData.filter(item => item.no.includes('.'));
    const newItem: QuotationItem = {
      no: `A.${existingSubItems.length + 1}`,
      description: '',
      unit: 'ตร.ม.',
      quantity: 0,
      unitPrice: 1000,
      laborCost: 0,
      scopeDetails: '',
    };
    setEditData(prev => ({ ...prev, quotationData: [...prev.quotationData, newItem] }));
  };

  const handleRemoveItem = (index: number) => {
    setEditData(prev => ({
      ...prev,
      quotationData: prev.quotationData.filter((_, i) => i !== index),
    }));
  };

  const handleSaveEdit = () => {
    const subtotal = editData.quotationData.reduce((sum, item) => {
      if (!item.quantity || item.quantity === '') return sum;
      return sum + Number(item.quantity) * ((Number(item.unitPrice) || 0) + (Number(item.laborCost) || 0));
    }, 0);
    const discRate = editData.discountConfig?.percent ?? 0.25;
    const discAmt = editData.discountConfig?.amount != null
      ? editData.discountConfig.amount
      : subtotal * discRate;
    const net = subtotal - discAmt;
    const updatedProject: ProjectData = { ...editData, designFee: net, customerPrice: net };
    updateProject(updatedProject);
    setProject(updatedProject);
    setActiveTab('documents');
  };

  // --- Navigation ---
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

  // --- Export ---
  const handleExportAll = useCallback(async () => {
    setIsExportingAll(true);
    setExportProgress(0);
    setExportStatus('กำลังเตรียมเอกสาร...');
    await new Promise(resolve => setTimeout(resolve, 100));

    try {
      const elementIds = ['centro-quotation-doc', 'centro-invoice-doc', 'centro-workplan-doc', 'centro-contract-doc'];
      const sanitizedName = project.name.replace(/[^a-zA-Z0-9ก-๙]/g, '_');

      await exportMultipleElementsAsSinglePDF(
        elementIds,
        `${sanitizedName}_เอกสารทั้งหมด.pdf`,
        (message, progress) => { setExportStatus(message); setExportProgress(progress); },
      );

      setExportStatus('เสร็จสิ้น');
      setExportProgress(100);
      setTimeout(() => { setIsExportingAll(false); setExportProgress(0); setExportStatus(''); }, 2000);
    } catch (error) {
      void error;
      setExportStatus(`เกิดข้อผิดพลาด: ${error instanceof Error ? error.message : 'กรุณาลองใหม่'}`);
      setTimeout(() => { setIsExportingAll(false); setExportProgress(0); setExportStatus(''); }, 4000);
    }
  }, [project.name]);

  // --- Edit form calculations ---
  const editSubtotal = editData.quotationData.reduce((sum, item) => {
    if (!item.quantity || item.quantity === '') return sum;
    return sum + Number(item.quantity) * (Number(item.unitPrice) || 0);
  }, 0);
  const editDiscountRate = editData.discountConfig?.percent ?? 0.25;
  const editDiscountLabel = editData.discountConfig?.label ?? 'ส่วนลด 25%';
  const editDiscountAmount = editData.discountConfig?.amount != null
    ? editData.discountConfig.amount
    : editSubtotal * editDiscountRate;
  const editNet = editSubtotal - editDiscountAmount;

  // --- Accordion state ---
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(['general', 'items']));
  const toggleSection = (key: string) => {
    setOpenSections(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  // --- Active document component ---
  const activeDocEntry = documents.find(d => d.id === selectedDoc) || documents[0];
  const DocComponent = activeDocEntry.component;

  return (
    <div className="min-h-screen flex flex-col">
      {/* ═══════ STICKY TOP BAR ═══════ */}
      <header className="sticky top-0 z-50 bg-white/70 backdrop-blur-md border-b border-stone-200/60 print:hidden">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
          <button
            onClick={handleBackToMain}
            className="flex items-center gap-2 text-stone-400 hover:text-stone-700 transition-colors duration-200 text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>หน้าหลัก</span>
          </button>

          <span className="text-[11px] font-medium tracking-[0.2em] uppercase text-stone-400 hidden sm:block">
            {co.companyName || co.companyNameTh || 'ชื่อบริษัท'}
          </span>

          <button
            onClick={handleExportAll}
            disabled={isExportingAll}
            className="flex items-center gap-2 bg-stone-800 hover:bg-stone-900 disabled:bg-stone-400 text-white px-5 py-2 rounded-lg text-sm tracking-wide shadow-sm hover:shadow-md transition-all duration-200"
          >
            {isExportingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            <span>{isExportingAll ? 'กำลัง Export...' : 'Export All PDF'}</span>
          </button>
        </div>
      </header>

      {/* ═══════ HERO ═══════ */}
      <section className="text-center pt-10 pb-6 px-4 print:hidden">
        <h1 className="text-2xl font-light tracking-wide text-stone-800">
          {project.name}
        </h1>
        <div className="flex items-center justify-center gap-5 text-stone-400 text-sm font-light mt-3">
          <span>{totalArea.toFixed(2)} ตร.ม.</span>
          <span className="w-px h-3 bg-stone-300" />
          <span className="tabular-nums">{formatCurrency(grandTotal)} บาท</span>
          <span className="w-px h-3 bg-stone-300" />
          <span>1 เดือน</span>
        </div>
      </section>

      {/* ═══════ PRIMARY TABS ═══════ */}
      <nav className="max-w-5xl w-full mx-auto px-6 print:hidden">
        <div className="flex items-center justify-between border-b border-stone-200">
          <div className="flex items-center gap-0">
            {([
              { key: 'documents', label: 'เอกสาร' },
              { key: 'data', label: 'ข้อมูลโครงการ' },
            ] as const).map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`relative px-5 py-3 text-sm tracking-wide transition-colors duration-300 ${
                  activeTab === tab.key
                    ? 'text-stone-800 font-medium'
                    : 'text-stone-400 hover:text-stone-600'
                }`}
              >
                {tab.label}
                {activeTab === tab.key && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-600" />
                )}
              </button>
            ))}
          </div>

          {/* Reset - small ghost link */}
          <Dialog>
            <DialogTrigger asChild>
              <button className="text-xs text-stone-400 hover:text-stone-600 transition-colors">
                รีเซ็ต
              </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-sm">
              <DialogHeader>
                <DialogTitle>รีเซ็ตข้อมูล?</DialogTitle>
                <DialogDescription>
                  ข้อมูลทั้งหมดจะกลับเป็นค่าเริ่มต้น ไม่สามารถย้อนกลับได้
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="ghost">ยกเลิก</Button>
                </DialogClose>
                <Button variant="destructive" onClick={handleResetProjects}>
                  รีเซ็ต
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </nav>

      {/* ═══════ CONTENT ═══════ */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-6 py-8">

        {/* ── DOCUMENTS TAB ── */}
        {activeTab === 'documents' && (
          <>
            {/* Document sub-tabs */}
            <div className="flex items-center gap-6 mb-8 print:hidden">
              {documents.map(doc => (
                <button
                  key={doc.id}
                  onClick={() => setSelectedDoc(doc.id)}
                  className={`relative pb-2 text-sm tracking-wide transition-colors duration-300 ${
                    selectedDoc === doc.id
                      ? 'text-stone-800 font-medium'
                      : 'text-stone-400 hover:text-stone-600'
                  }`}
                >
                  {doc.name}
                  {selectedDoc === doc.id && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-600 rounded-full" />
                  )}
                </button>
              ))}
            </div>

            {/* A4 Document Preview */}
            <div className="flex justify-center">
              <div className="shadow-[0_4px_40px_rgba(0,0,0,0.06)] rounded-sm">
                <DocComponent project={project} />
              </div>
            </div>
          </>
        )}

        {/* ── PROJECT DATA TAB ── */}
        {activeTab === 'data' && (
          <div className="max-w-3xl mx-auto space-y-0">

            {/* Section: ข้อมูลทั่วไป */}
            <div className="border-b border-stone-200">
              <button
                onClick={() => toggleSection('general')}
                className="w-full flex items-center justify-between py-4 text-sm font-medium text-stone-700 hover:text-stone-900 transition-colors"
              >
                <span className="tracking-wide">ข้อมูลทั่วไป</span>
                <ChevronDown className={`w-4 h-4 text-stone-400 transition-transform duration-200 ${openSections.has('general') ? 'rotate-180' : ''}`} />
              </button>
              {openSections.has('general') && (
                <div className="pb-6 grid grid-cols-2 gap-x-8 gap-y-5">
                  {[
                    { key: 'name' as const, label: 'ชื่อโครงการ', span: 1 },
                    { key: 'owner' as const, label: 'เจ้าของ / ลูกค้า', span: 1 },
                    { key: 'address' as const, label: 'ที่อยู่', span: 2 },
                    { key: 'phone' as const, label: 'เบอร์โทร', span: 1 },
                  ].map(field => (
                    <div key={field.key} className={field.span === 2 ? 'col-span-2' : ''}>
                      <label className="text-[11px] font-medium tracking-widest uppercase text-stone-400 mb-1.5 block">
                        {field.label}
                      </label>
                      <input
                        type="text"
                        value={String(editData[field.key] || '')}
                        onChange={(e) => handleEditField(field.key, e.target.value)}
                        className="w-full px-0 py-2 bg-transparent border-0 border-b border-stone-200 focus:border-amber-500 focus:ring-0 text-stone-800 text-sm transition-colors outline-none"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Section: รายการค่าออกแบบ */}
            <div className="border-b border-stone-200">
              <button
                onClick={() => toggleSection('items')}
                className="w-full flex items-center justify-between py-4 text-sm font-medium text-stone-700 hover:text-stone-900 transition-colors"
              >
                <span className="tracking-wide">รายการค่าออกแบบ</span>
                <ChevronDown className={`w-4 h-4 text-stone-400 transition-transform duration-200 ${openSections.has('items') ? 'rotate-180' : ''}`} />
              </button>
              {openSections.has('items') && (
                <div className="pb-6">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-[11px] font-medium tracking-widest uppercase text-stone-400">
                        <th className="text-left pb-2 pr-3 w-16">No.</th>
                        <th className="text-left pb-2 pr-3">รายละเอียด</th>
                        <th className="text-left pb-2 pr-3 w-16">หน่วย</th>
                        <th className="text-right pb-2 pr-3 w-20">ปริมาณ</th>
                        <th className="text-right pb-2 pr-3 w-24">ราคา/หน่วย</th>
                        <th className="text-right pb-2 w-24">รวม</th>
                        <th className="w-8"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {editData.quotationData.map((item, index) => {
                        const isHeader = !item.no.includes('.');
                        const amount = Number(item.quantity) * (Number(item.unitPrice) || 0);
                        return (
                          <tr key={index} className={`border-t border-stone-100 ${isHeader ? 'bg-stone-50/50' : ''}`}>
                            <td className="py-2 pr-3">
                              <input
                                type="text"
                                value={item.no}
                                onChange={(e) => handleEditItem(index, 'no', e.target.value)}
                                className="w-full px-0 py-1 bg-transparent border-0 border-b border-transparent focus:border-amber-500 text-sm text-stone-600 outline-none transition-colors"
                              />
                            </td>
                            <td className="py-2 pr-3">
                              <input
                                type="text"
                                value={item.description}
                                onChange={(e) => handleEditItem(index, 'description', e.target.value)}
                                className="w-full px-0 py-1 bg-transparent border-0 border-b border-transparent focus:border-amber-500 text-sm text-stone-800 outline-none transition-colors"
                              />
                            </td>
                            <td className="py-2 pr-3">
                              <input
                                type="text"
                                value={item.unit}
                                onChange={(e) => handleEditItem(index, 'unit', e.target.value)}
                                className="w-full px-0 py-1 bg-transparent border-0 border-b border-transparent focus:border-amber-500 text-sm text-stone-600 outline-none transition-colors"
                              />
                            </td>
                            <td className="py-2 pr-3">
                              <input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => handleEditItem(index, 'quantity', e.target.value ? Number(e.target.value) : '')}
                                className="w-full px-0 py-1 bg-transparent border-0 border-b border-transparent focus:border-amber-500 text-sm text-stone-800 text-right tabular-nums outline-none transition-colors"
                              />
                            </td>
                            <td className="py-2 pr-3">
                              <input
                                type="number"
                                value={item.unitPrice}
                                onChange={(e) => handleEditItem(index, 'unitPrice', e.target.value ? Number(e.target.value) : '')}
                                className="w-full px-0 py-1 bg-transparent border-0 border-b border-transparent focus:border-amber-500 text-sm text-stone-800 text-right tabular-nums outline-none transition-colors"
                              />
                            </td>
                            <td className="py-2 text-right text-sm tabular-nums text-stone-500">
                              {amount > 0 ? formatCurrency(amount) : '-'}
                            </td>
                            <td className="py-2 pl-2">
                              {!isHeader && (
                                <button
                                  onClick={() => handleRemoveItem(index)}
                                  className="text-stone-300 hover:text-red-500 transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  <button
                    onClick={handleAddItem}
                    className="flex items-center gap-1.5 mt-4 text-stone-400 hover:text-stone-700 text-sm transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>เพิ่มรายการ</span>
                  </button>

                  {/* Summary */}
                  <div className="mt-6 pt-4 border-t border-stone-100 flex justify-end">
                    <div className="w-56 space-y-1.5 text-sm">
                      <div className="flex justify-between text-stone-500">
                        <span>รวมก่อนลด</span>
                        <span className="tabular-nums">{formatCurrency(editSubtotal)}</span>
                      </div>
                      <div className="flex justify-between text-stone-500">
                        <span>{editDiscountLabel}</span>
                        <span className="tabular-nums">-{formatCurrency(editDiscountAmount)}</span>
                      </div>
                      <div className="flex justify-between pt-1.5 border-t border-stone-200 text-stone-800 font-medium">
                        <span>ราคาสุทธิ</span>
                        <span className="tabular-nums">{formatCurrency(editNet)} บาท</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Section: สโคปงาน */}
            <div className="border-b border-stone-200">
              <button
                onClick={() => toggleSection('scope')}
                className="w-full flex items-center justify-between py-4 text-sm font-medium text-stone-700 hover:text-stone-900 transition-colors"
              >
                <span className="tracking-wide">สโคปงาน</span>
                <ChevronDown className={`w-4 h-4 text-stone-400 transition-transform duration-200 ${openSections.has('scope') ? 'rotate-180' : ''}`} />
              </button>
              {openSections.has('scope') && (
                <div className="pb-6 space-y-5">
                  {editData.quotationData.filter(item => item.no.includes('.')).map((item) => {
                    const actualIndex = editData.quotationData.indexOf(item);
                    return (
                      <div key={actualIndex}>
                        <label className="text-[11px] font-medium tracking-widest uppercase text-stone-400 mb-1.5 block">
                          {item.no} — {item.description || 'ยังไม่ระบุ'}
                        </label>
                        <textarea
                          value={item.scopeDetails || ''}
                          onChange={(e) => handleEditItem(actualIndex, 'scopeDetails', e.target.value)}
                          rows={3}
                          className="w-full px-0 py-2 bg-transparent border-0 border-b border-stone-200 focus:border-amber-500 focus:ring-0 text-sm text-stone-700 resize-none outline-none transition-colors"
                          placeholder="รายละเอียดสโคปงาน..."
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Save button */}
            <div className="pt-8">
              <button
                onClick={handleSaveEdit}
                className="w-full bg-stone-800 hover:bg-stone-900 text-white py-3 rounded-xl text-sm tracking-wide transition-all duration-200 shadow-sm hover:shadow-md"
              >
                บันทึกข้อมูล
              </button>
            </div>
          </div>
        )}
      </main>

      {/* ═══════ FOOTER ═══════ */}
      <footer className="text-center py-8 print:hidden">
        <p className="text-xs text-stone-400 tracking-widest">
          {co.companyName || co.companyNameTh || 'ชื่อบริษัท'} &nbsp;&middot;&nbsp; {co.phone || '-'} &nbsp;&middot;&nbsp; {co.email || '-'}
        </p>
      </footer>

      {/* ═══════ EXPORT DIALOG ═══════ */}
      <Dialog open={isExportingAll}>
        <DialogContent className="sm:max-w-sm border-0 shadow-2xl bg-white/95 backdrop-blur-md [&>button]:hidden">
          <div className="text-center py-2">
            <Loader2 className="w-6 h-6 animate-spin text-stone-400 mx-auto mb-4" />
            <p className="text-sm text-stone-600 mb-4">{exportStatus}</p>
            <Progress value={exportProgress} className="h-1 bg-stone-100" />
            <p className="text-xs text-stone-400 mt-2 tabular-nums">{Math.round(exportProgress)}%</p>
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══════ HIDDEN EXPORT CONTAINER ═══════ */}
      {isExportingAll && (
        <div style={{ position: 'absolute', top: 0, left: 0, width: '210mm', zIndex: -1 }}>
          <CentroDesignQuotationDocument project={project} />
          <CentroDesignInvoiceDocument project={project} />
          <CentroDesignWorkPlanDocument project={project} />
          <CentroDesignContractDocument project={project} />
        </div>
      )}
    </div>
  );
}
