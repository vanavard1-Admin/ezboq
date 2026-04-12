import React, { useState, useRef } from 'react';
import { Edit3, Save, X, Plus, Trash2, ChevronDown, ChevronUp, GripVertical, CheckSquare, Square, Copy, FileDown, FileUp, Layers, Wand2, ShoppingCart } from 'lucide-react';
import { ProjectData, QuotationItem } from '../utils/projectData';
import { itemTemplates, getTemplatesByCategory, categoryColors } from '../utils/templateData';
import { toast } from 'sonner@2.0.3';
import { generatePoDraftFromMatches, matchBoqItemsToCatalog } from '../utils/boqShopIntegration';
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

interface AdvancedQuotationEditorProps {
  project: ProjectData;
  onUpdate: (updatedProject: ProjectData) => void;
  onOpenShop?: () => void;
}

export function AdvancedQuotationEditor({ project, onUpdate, onOpenShop }: AdvancedQuotationEditorProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [expandedDetails, setExpandedDetails] = useState<Set<number>>(new Set());
  const [editForm, setEditForm] = useState<QuotationItem | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showBulkEdit, setShowBulkEdit] = useState(false);
  const [pendingDeleteIndex, setPendingDeleteIndex] = useState<number | null>(null);
  const [pendingBulkDelete, setPendingBulkDelete] = useState(false);
  const [showPoDraft, setShowPoDraft] = useState(false);
  const [draftMatches, setDraftMatches] = useState(() => matchBoqItemsToCatalog(project.quotationData));
  const [bulkEditForm, setBulkEditForm] = useState({
    unitPrice: '',
    laborCost: '',
    multiplier: ''
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // === BASIC CRUD OPERATIONS ===
  const handleEdit = (index: number) => {
    setEditingIndex(index);
    setEditForm({ ...project.quotationData[index] });
  };

  const handleSave = () => {
    if (editingIndex === null || !editForm) return;
    const original = project.quotationData[editingIndex];
    const saved = { ...editForm };
    // ถ้าแก้ unitPrice หรือ laborCost → ล้าง totalPrice เพราะไม่ใช่ราคาเหมาแล้ว
    if (
      saved.totalPrice !== undefined && saved.totalPrice !== '' &&
      (String(saved.unitPrice) !== String(original.unitPrice) ||
       String(saved.laborCost) !== String(original.laborCost))
    ) {
      saved.totalPrice = '';
    }
    const updatedData = [...project.quotationData];
    updatedData[editingIndex] = saved;
    onUpdate({ ...project, quotationData: updatedData });
    setEditingIndex(null);
    setEditForm(null);
  };

  const handleCancel = () => {
    setEditingIndex(null);
    setEditForm(null);
  };

  const handleDelete = (index: number) => {
    setPendingDeleteIndex(index);
  };

  const confirmDelete = () => {
    if (pendingDeleteIndex === null) return;
    const updatedData = project.quotationData.filter((_, i) => i !== pendingDeleteIndex);
    onUpdate({ ...project, quotationData: updatedData });
    setPendingDeleteIndex(null);
  };

  const handleAddItem = () => {
    const newItem: QuotationItem = {
      no: `${project.quotationData.length + 1}`,
      description: 'รายการใหม่',
      unit: 'ชุด',
      quantity: 1,
      unitPrice: 0,
      laborCost: 0,
    };
    onUpdate({ ...project, quotationData: [...project.quotationData, newItem] });
  };

  // === DRAG & DROP ===
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const items = [...project.quotationData];
    const draggedItem = items[draggedIndex];
    items.splice(draggedIndex, 1);
    items.splice(index, 0, draggedItem);

    onUpdate({ ...project, quotationData: items });
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  // === BULK SELECTION ===
  const toggleSelectItem = (index: number) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedItems(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedItems.size === project.quotationData.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(project.quotationData.map((_, i) => i)));
    }
  };

  // === BULK EDIT ===
  const handleBulkEdit = () => {
    if (selectedItems.size === 0) return;

    const updatedData = project.quotationData.map((item, index) => {
      if (!selectedItems.has(index)) return item;

      const newItem = { ...item };

      // Apply unit price
      if (bulkEditForm.unitPrice !== '') {
        newItem.unitPrice = Number(bulkEditForm.unitPrice);
      }

      // Apply labor cost
      if (bulkEditForm.laborCost !== '') {
        newItem.laborCost = Number(bulkEditForm.laborCost);
      }

      // Apply multiplier
      if (bulkEditForm.multiplier !== '') {
        const multiplier = Number(bulkEditForm.multiplier);
        if (newItem.unitPrice) newItem.unitPrice = Number(newItem.unitPrice) * multiplier;
        if (newItem.laborCost) newItem.laborCost = Number(newItem.laborCost) * multiplier;
      }

      return newItem;
    });

    onUpdate({ ...project, quotationData: updatedData });
    setShowBulkEdit(false);
    setBulkEditForm({ unitPrice: '', laborCost: '', multiplier: '' });
    setSelectedItems(new Set());
  };

  // === BULK DELETE ===
  const handleBulkDelete = () => {
    if (selectedItems.size === 0) return;
    setPendingBulkDelete(true);
  };

  const confirmBulkDelete = () => {
    const updatedData = project.quotationData.filter((_, i) => !selectedItems.has(i));
    onUpdate({ ...project, quotationData: updatedData });
    setSelectedItems(new Set());
    setPendingBulkDelete(false);
  };

  // === BULK COPY ===
  const handleBulkCopy = () => {
    if (selectedItems.size === 0) return;

    const itemsToCopy = project.quotationData.filter((_, i) => selectedItems.has(i));
    const copiedItems = itemsToCopy.map(item => ({ ...item }));
    
    onUpdate({ ...project, quotationData: [...project.quotationData, ...copiedItems] });
    setSelectedItems(new Set());
  };

  // === TEMPLATE SYSTEM ===
  const handleAddTemplate = (templateId: string) => {
    const template = itemTemplates.find(t => t.id === templateId);
    if (!template) return;

    const newItems = template.items.map(item => ({ ...item }));
    onUpdate({ ...project, quotationData: [...project.quotationData, ...newItems] });
    setShowTemplates(false);
  };

  // === EXPORT/IMPORT ===
  const handleExportJSON = () => {
    const dataStr = JSON.stringify(project, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = `${project.name}_${new Date().toISOString().split('T')[0]}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleImportJSON = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const raw = JSON.parse(e.target?.result as string);
        if (!raw || typeof raw !== 'object' || !Array.isArray(raw.quotationData)) {
          toast.error('ไฟล์ไม่ถูกต้อง: ต้องมี quotationData เป็น array');
          return;
        }
        const allowedProjectKeys = new Set([
          'id', 'name', 'address', 'phone', 'owner', 'designFee', 'totalCost', 'customerPrice',
          'operatingCost', 'operatingRate', 'markupRate', 'discountConfig', 'quotationData', 'scopeDetails', 'paymentSchedule',
          'workPlan', 'taxData', 'status', 'templateId', 'templateArea', 'templateBudget',
          'presentationBoard',
          'autoSyncDocuments',
          'templatePricingTier',
          'priceReferenceSummary',
          'templateRooms', 'templateBathrooms',
        ]);
        const allowedItemKeys = new Set([
          'no', 'description', 'unit', 'quantity', 'unitPrice', 'laborCost', 'scopeDetails',
          'customerUnitPrice', 'totalPrice',
        ]);
        const sanitized: Record<string, unknown> = {};
        for (const key of Object.keys(raw)) {
          if (allowedProjectKeys.has(key)) sanitized[key] = raw[key];
        }
        sanitized.quotationData = raw.quotationData.map((item: Record<string, unknown>) => {
          if (!item || typeof item !== 'object') return { no: '', description: '', unit: '', quantity: '', unitPrice: '', laborCost: '' };
          const safeItem: Record<string, unknown> = {};
          for (const key of Object.keys(item)) {
            if (allowedItemKeys.has(key)) safeItem[key] = item[key];
          }
          return safeItem;
        });
        onUpdate(sanitized as unknown as ProjectData);
        toast.success('นำเข้าข้อมูลสำเร็จ');
      } catch {
        toast.error('เกิดข้อผิดพลาดในการอ่านไฟล์');
      }
    };
    reader.readAsText(file);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // === UTILITIES ===
  const toggleDetails = (index: number) => {
    const newExpanded = new Set(expandedDetails);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedDetails(newExpanded);
  };

  const calculateAmount = (item: QuotationItem): number => {
    if (!item.quantity || item.quantity === '') return 0;
    const qty = Number(item.quantity);
    const unitPrice = Number(item.unitPrice) || 0;
    const laborCost = Number(item.laborCost) || 0;
    return qty * (unitPrice + laborCost);
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('th-TH', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const templatesByCategory = getTemplatesByCategory();
  const poDraft = generatePoDraftFromMatches(draftMatches);
  const openPoDraft = () => {
    const base = selectedItems.size > 0
      ? project.quotationData.filter((_, index) => selectedItems.has(index))
      : project.quotationData;
    setDraftMatches(matchBoqItemsToCatalog(base));
    setShowPoDraft(true);
  };

  return (
    <>
      <AlertDialog open={pendingDeleteIndex !== null} onOpenChange={(open: boolean) => { if (!open) setPendingDeleteIndex(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบรายการ</AlertDialogTitle>
            <AlertDialogDescription>
              รายการ BOQ ที่เลือกจะถูกลบออกจากโครงการและตัวเลขเอกสารที่ผูกอยู่จะถูกคำนวณใหม่ตาม pipeline
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-rose-600 text-white hover:bg-rose-700">
              ลบรายการ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={pendingBulkDelete} onOpenChange={(open: boolean) => { if (!open) setPendingBulkDelete(false); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบหลายรายการ</AlertDialogTitle>
            <AlertDialogDescription>
              จะลบ {selectedItems.size} รายการออกจาก BOQ และ recalculation เอกสารหลักทั้งหมดตามรายการล่าสุด
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={confirmBulkDelete} className="bg-rose-600 text-white hover:bg-rose-700">
              ลบรายการที่เลือก
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <div className="bg-white rounded-lg shadow-md p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="flex items-center gap-2 text-slate-800">
          <Edit3 className="w-5 h-5" />
          แก้ไขรายการงาน: {project.name}
        </h2>
        <div className="flex gap-2">
          {onOpenShop && (
            <button
              onClick={onOpenShop}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition-colors text-sm"
            >
              <ShoppingCart className="w-4 h-4" />
              เปิด Shop / RFQ
            </button>
          )}
          <button
            onClick={openPoDraft}
            className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg transition-colors text-sm"
          >
            <ShoppingCart className="w-4 h-4" />
            ดู PO draft
          </button>
          <button
            onClick={() => setShowTemplates(true)}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors text-sm"
          >
            <Layers className="w-4 h-4" />
            เทมเพลต
          </button>
          <button
            onClick={handleAddItem}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            เพิ่มรายการ
          </button>
        </div>
      </div>

      {/* BOQ Editor */}
      <>
      {/* Toolbar */}
      <div className="mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={toggleSelectAll}
            className="flex items-center gap-2 text-sm text-slate-700 hover:text-slate-900"
          >
            {selectedItems.size === project.quotationData.length ? (
              <CheckSquare className="w-4 h-4" />
            ) : (
              <Square className="w-4 h-4" />
            )}
            เลือกทั้งหมด
          </button>
          <span className="text-xs text-slate-500">
            ({selectedItems.size} รายการ)
          </span>
        </div>

        {selectedItems.size > 0 && (
          <div className="flex gap-2">
            <button
              onClick={openPoDraft}
              className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg transition-colors text-sm"
            >
              <ShoppingCart className="w-4 h-4" />
              ดู PO draft
            </button>
            <button
              onClick={() => setShowBulkEdit(true)}
              className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-xs transition-colors"
            >
              <Wand2 className="w-3 h-3" />
              แก้ไขหมู่
            </button>
            <button
              onClick={handleBulkCopy}
              className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded text-xs transition-colors"
            >
              <Copy className="w-3 h-3" />
              คัดลอก
            </button>
            <button
              onClick={handleBulkDelete}
              className="flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded text-xs transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              ลบ
            </button>
          </div>
        )}

        <div className="flex gap-2">
          {onOpenShop && (
            <button
              onClick={onOpenShop}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition-colors text-sm"
            >
              <ShoppingCart className="w-4 h-4" />
              Shop / RFQ
            </button>
          )}
          <button
            onClick={openPoDraft}
            className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg transition-colors text-sm"
          >
            <ShoppingCart className="w-4 h-4" />
            ดู PO draft
          </button>
          <button
            onClick={handleExportJSON}
            className="flex items-center gap-1 bg-slate-600 hover:bg-slate-700 text-white px-3 py-1.5 rounded text-xs transition-colors"
          >
            <FileDown className="w-3 h-3" />
            Export
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1 bg-slate-600 hover:bg-slate-700 text-white px-3 py-1.5 rounded text-xs transition-colors"
          >
            <FileUp className="w-3 h-3" />
            Import
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImportJSON}
            className="hidden"
          />
        </div>
      </div>

      {/* Bulk Edit Modal */}
      {showBulkEdit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg mb-4">แก้ไขรายการที่เลือก ({selectedItems.size} รายการ)</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-slate-600 mb-1">ราคาวัสดุ (บาท)</label>
                <input
                  type="number"
                  value={bulkEditForm.unitPrice}
                  onChange={(e) => setBulkEditForm({ ...bulkEditForm, unitPrice: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded text-sm"
                  placeholder="ไม่เปลี่ยน"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">ค่าแรง (บาท)</label>
                <input
                  type="number"
                  value={bulkEditForm.laborCost}
                  onChange={(e) => setBulkEditForm({ ...bulkEditForm, laborCost: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded text-sm"
                  placeholder="ไม่เปลี่ยน"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">คูณราคา (เช่น 1.1 = +10%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={bulkEditForm.multiplier}
                  onChange={(e) => setBulkEditForm({ ...bulkEditForm, multiplier: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded text-sm"
                  placeholder="เช่น 1.2 สำหรับ +20%"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleBulkEdit}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm"
              >
                ยืนยัน
              </button>
              <button
                onClick={() => {
                  setShowBulkEdit(false);
                  setBulkEditForm({ unitPrice: '', laborCost: '', multiplier: '' });
                }}
                className="flex-1 bg-slate-400 hover:bg-slate-500 text-white px-4 py-2 rounded text-sm"
              >
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Template Modal */}
      {showTemplates && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full my-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg">เลือกเทมเพลต</h3>
              <button
                onClick={() => setShowTemplates(false)}
                className="text-slate-500 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 max-h-[70vh] overflow-y-auto">
              {Array.from(templatesByCategory.entries()).map(([category, templates]) => (
                <div key={category}>
                  <h4 className={`text-sm px-3 py-1 rounded inline-block mb-2 ${categoryColors[category]}`}>
                    {category}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {templates.map(template => (
                      <button
                        key={template.id}
                        onClick={() => handleAddTemplate(template.id)}
                        className="text-left p-3 border-2 border-slate-200 hover:border-blue-500 rounded-lg transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h5 className="text-sm text-slate-800">{template.name}</h5>
                            <p className="text-xs text-slate-500 mt-1">
                              {template.items.length} รายการ
                            </p>
                          </div>
                          <Plus className="w-4 h-4 text-blue-600 flex-shrink-0 ml-2" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}


      {showPoDraft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[88vh] w-full max-w-4xl overflow-y-auto rounded-xl bg-white p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">PO Draft อัตโนมัติจาก BOQ</h3>
              <button onClick={() => setShowPoDraft(false)} className="rounded px-2 py-1 text-sm text-slate-500 hover:bg-slate-100">ปิด</button>
            </div>
            <p className="mt-1 text-xs text-slate-500">Match แล้ว {poDraft.lines.length} รายการ • ไม่พบ {poDraft.unmatched.length} รายการ</p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="border px-2 py-1 text-left">SKU</th>
                    <th className="border px-2 py-1 text-left">สินค้า</th>
                    <th className="border px-2 py-1 text-left">Vendor</th>
                    <th className="border px-2 py-1 text-right">Qty</th>
                    <th className="border px-2 py-1 text-right">ราคา/หน่วย</th>
                    <th className="border px-2 py-1 text-right">รวม</th>
                    <th className="border px-2 py-1 text-center">Lead</th>
                  </tr>
                </thead>
                <tbody>
                  {poDraft.lines.map((line) => (
                    <tr key={`${line.sku}-${line.productName}`}>
                      <td className="border px-2 py-1">{line.sku}</td>
                      <td className="border px-2 py-1">{line.productName}</td>
                      <td className="border px-2 py-1">{line.vendorName}</td>
                      <td className="border px-2 py-1 text-right">{line.quantity}</td>
                      <td className="border px-2 py-1 text-right">{formatCurrency(line.unitPrice)}</td>
                      <td className="border px-2 py-1 text-right">{formatCurrency(line.amount)}</td>
                      <td className="border px-2 py-1 text-center">{line.leadTimeDays} วัน</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {poDraft.unmatched.length > 0 && (
              <div className="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-700">
                <p className="font-semibold">รายการที่ยังไม่ match</p>
                <ul className="mt-1 list-disc pl-5">{poDraft.unmatched.map((name) => <li key={name}>{name}</li>)}</ul>
              </div>
            )}
            <div className="mt-4 text-right text-sm font-semibold">รวม PO Draft: {formatCurrency(poDraft.totalAmount)} บาท</div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-slate-100">
              <th className="border border-slate-300 px-2 py-2 w-8"></th>
              <th className="border border-slate-300 px-2 py-2 w-8"></th>
              <th className="border border-slate-300 px-2 py-2 text-left w-16">ลำดับ</th>
              <th className="border border-slate-300 px-2 py-2 text-left">รายการ</th>
              <th className="border border-slate-300 px-2 py-2 text-center w-20">หน่วย</th>
              <th className="border border-slate-300 px-2 py-2 text-center w-20">จำนวน</th>
              <th className="border border-slate-300 px-2 py-2 text-right w-28">ราคาวัสดุ</th>
              <th className="border border-slate-300 px-2 py-2 text-right w-28">ค่าแรง</th>
              <th className="border border-slate-300 px-2 py-2 text-right w-32">รวม (บาท)</th>
              <th className="border border-slate-300 px-2 py-2 text-center w-28">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {project.quotationData.map((item, index) => {
              const isHeader = !item.no.includes('.');
              const isEditing = editingIndex === index;
              const amount = calculateAmount(isEditing && editForm ? editForm : item);
              const isSelected = selectedItems.has(index);

              return (
                <React.Fragment key={index}>
                  <tr 
                    className={`
                      ${isHeader ? 'bg-slate-50' : 'hover:bg-slate-50'}
                      ${isSelected ? 'bg-blue-50' : ''}
                      ${draggedIndex === index ? 'opacity-50' : ''}
                    `}
                    draggable={!isEditing}
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                  >
                    {/* Drag Handle */}
                    <td className="border border-slate-300 px-1 py-1 text-center cursor-move">
                      <GripVertical className="w-4 h-4 text-slate-400" />
                    </td>

                    {/* Select Checkbox */}
                    <td className="border border-slate-300 px-1 py-1 text-center">
                      <button
                        onClick={() => toggleSelectItem(index)}
                        className="text-slate-600 hover:text-blue-600"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </td>

                    {/* No */}
                    <td className="border border-slate-300 px-2 py-1">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editForm?.no || ''}
                          onChange={(e) => setEditForm({ ...editForm!, no: e.target.value })}
                          className="w-full px-1 py-0.5 border border-blue-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      ) : (
                        <span className="text-slate-600">{item.no}</span>
                      )}
                    </td>

                    {/* Description */}
                    <td className="border border-slate-300 px-2 py-1">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editForm?.description || ''}
                          onChange={(e) => setEditForm({ ...editForm!, description: e.target.value })}
                          className="w-full px-1 py-0.5 border border-blue-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      ) : (
                        <div>
                          <span className={isHeader ? '' : 'pl-4'}>{item.description}</span>
                          {item.scopeDetails && (
                            <button
                              onClick={() => toggleDetails(index)}
                              className="ml-2 text-blue-600 hover:text-blue-800 text-xs inline-flex items-center"
                            >
                              {expandedDetails.has(index) ? (
                                <ChevronUp className="w-3 h-3" />
                              ) : (
                                <ChevronDown className="w-3 h-3" />
                              )}
                            </button>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Unit */}
                    <td className="border border-slate-300 px-2 py-1 text-center">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editForm?.unit || ''}
                          onChange={(e) => setEditForm({ ...editForm!, unit: e.target.value })}
                          className="w-full px-1 py-0.5 border border-blue-300 rounded text-xs text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      ) : (
                        <span className="text-slate-600">{item.unit}</span>
                      )}
                    </td>

                    {/* Quantity */}
                    <td className="border border-slate-300 px-2 py-1 text-center">
                      {isEditing ? (
                        <input
                          type="number"
                          value={editForm?.quantity || ''}
                          onChange={(e) => setEditForm({ ...editForm!, quantity: e.target.value ? Number(e.target.value) : '' })}
                          className="w-full px-1 py-0.5 border border-blue-300 rounded text-xs text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      ) : (
                        <span className="text-slate-600">{item.quantity}</span>
                      )}
                    </td>

                    {/* Unit Price */}
                    <td className="border border-slate-300 px-2 py-1 text-right">
                      {isEditing ? (
                        <input
                          type="number"
                          value={editForm?.unitPrice || ''}
                          onChange={(e) => setEditForm({ ...editForm!, unitPrice: e.target.value ? Number(e.target.value) : '' })}
                          className="w-full px-1 py-0.5 border border-blue-300 rounded text-xs text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      ) : (
                        <span className="text-slate-600">
                          {item.unitPrice && item.unitPrice !== '' ? formatCurrency(Number(item.unitPrice)) : '-'}
                        </span>
                      )}
                    </td>

                    {/* Labor Cost */}
                    <td className="border border-slate-300 px-2 py-1 text-right">
                      {isEditing ? (
                        <input
                          type="number"
                          value={editForm?.laborCost || ''}
                          onChange={(e) => setEditForm({ ...editForm!, laborCost: e.target.value ? Number(e.target.value) : '' })}
                          className="w-full px-1 py-0.5 border border-blue-300 rounded text-xs text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      ) : (
                        <span className="text-slate-600">
                          {item.laborCost && item.laborCost !== '' ? formatCurrency(Number(item.laborCost)) : '-'}
                        </span>
                      )}
                    </td>

                    {/* Amount */}
                    <td className="border border-slate-300 px-2 py-1 text-right">
                      <span className={amount > 0 ? 'text-slate-800' : 'text-slate-400'}>
                        {amount > 0 ? formatCurrency(amount) : '-'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="border border-slate-300 px-2 py-1">
                      <div className="flex gap-1 justify-center">
                        {isEditing ? (
                          <>
                            <button
                              onClick={handleSave}
                              className="p-1 text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                              title="บันทึก"
                            >
                              <Save className="w-4 h-4" />
                            </button>
                            <button
                              onClick={handleCancel}
                              className="p-1 text-slate-600 hover:bg-slate-100 rounded transition-colors"
                              title="ยกเลิก"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleEdit(index)}
                              className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              title="แก้ไข"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(index)}
                              className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="ลบ"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>

                  {/* Scope Details Expanded Row */}
                  {expandedDetails.has(index) && item.scopeDetails && !isEditing && (
                    <tr>
                      <td colSpan={10} className="border border-slate-300 px-4 py-2 bg-blue-50">
                        <div className="text-xs">
                          <span className="text-blue-800">รายละเอียดงาน:</span>
                          <div className="mt-1 whitespace-pre-line text-slate-700 leading-relaxed pl-2">
                            {item.scopeDetails}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}

                  {/* Edit Scope Details */}
                  {isEditing && (
                    <tr>
                      <td colSpan={10} className="border border-slate-300 px-4 py-2 bg-blue-50">
                        <label className="block text-xs text-blue-800 mb-1">
                          รายละเอียดงาน (Scope Details):
                        </label>
                        <textarea
                          value={editForm?.scopeDetails || ''}
                          onChange={(e) => setEditForm({ ...editForm!, scopeDetails: e.target.value })}
                          className="w-full px-2 py-1 border border-blue-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                          rows={4}
                          placeholder="ใส่รายละเอียดงาน (ใช้ \n สำหรับขึ้นบรรทัดใหม่)"
                        />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
        <div className="flex justify-between text-sm">
          <span className="text-slate-600">รวมทั้งหมด:</span>
          <span className="text-slate-800">
            {formatCurrency(
              project.quotationData.reduce((sum, item) => sum + calculateAmount(item), 0)
            )} บาท
          </span>
        </div>
      </div>
      </>
      </div>
    </>
  );
}
