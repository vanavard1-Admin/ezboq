import React, { useState } from 'react';
import { Edit3, Save, X, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { ProjectData, QuotationItem } from '../utils/projectData';
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

interface QuotationEditorProps {
  project: ProjectData;
  onUpdate: (updatedProject: ProjectData) => void;
}

export function QuotationEditor({ project, onUpdate }: QuotationEditorProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [expandedDetails, setExpandedDetails] = useState<Set<number>>(new Set());
  const [editForm, setEditForm] = useState<QuotationItem | null>(null);
  const [pendingDeleteIndex, setPendingDeleteIndex] = useState<number | null>(null);

  const handleEdit = (index: number) => {
    if (index < 0 || index >= (project.quotationData ?? []).length) return;
    setEditingIndex(index);
    setEditForm({ ...project.quotationData[index] });
  };

  const handleSave = () => {
    if (editingIndex === null || !editForm) return;
    if (editingIndex < 0 || editingIndex >= (project.quotationData ?? []).length) return;

    const updatedData = [...project.quotationData];
    updatedData[editingIndex] = editForm;

    onUpdate({
      ...project,
      quotationData: updatedData,
    });

    setEditingIndex(null);
    setEditForm(null);
  };

  const handleCancel = () => {
    setEditingIndex(null);
    setEditForm(null);
  };

  const handleDelete = (index: number) => {
    const updatedData = project.quotationData.filter((_, i) => i !== index);
    onUpdate({
      ...project,
      quotationData: updatedData,
    });
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

    onUpdate({
      ...project,
      quotationData: [...project.quotationData, newItem],
    });
  };

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

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="flex items-center gap-2 text-slate-800">
          <Edit3 className="w-5 h-5" />
          แก้ไขรายการงาน: {project.name}
        </h2>
        <button
          onClick={handleAddItem}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition-colors text-sm"
        >
          <Plus className="w-4 h-4" />
          เพิ่มรายการ
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-slate-100">
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
            {(project.quotationData ?? []).map((item, index) => {
              const isHeader = !item.no.includes('.');
              const amount = calculateAmount(item);
              const isEditing = editingIndex === index;

              return (
                <React.Fragment key={index}>
                  <tr className={isHeader ? 'bg-slate-50' : 'hover:bg-slate-50'}>
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
                              onClick={() => setPendingDeleteIndex(index)}
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
                      <td colSpan={8} className="border border-slate-300 px-4 py-2 bg-blue-50">
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
                      <td colSpan={8} className="border border-slate-300 px-4 py-2 bg-blue-50">
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
              (project.quotationData ?? []).reduce((sum, item) => sum + calculateAmount(item), 0)
            )} บาท
          </span>
        </div>
      </div>

      <AlertDialog open={pendingDeleteIndex !== null} onOpenChange={(isOpen) => !isOpen && setPendingDeleteIndex(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ลบรายการนี้?</AlertDialogTitle>
            <AlertDialogDescription>
              รายการ BOQ ที่เลือกจะถูกลบทันที และไม่สามารถย้อนกลับจาก dialog นี้ได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingDeleteIndex !== null) {
                  handleDelete(pendingDeleteIndex);
                  setPendingDeleteIndex(null);
                }
              }}
            >
              ลบรายการ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
