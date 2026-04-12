import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, X } from 'lucide-react';
import type { WorkPlanItem, WorkPlanConfig } from '../utils/projectData';

interface WorkPlanEditorProps {
  initialConfig: WorkPlanConfig;
  onSave: (config: WorkPlanConfig) => void;
  onCancel: () => void;
}

const CELL_TYPES = ['', '■', '□'] as const;
const CELL_LABELS: Record<string, string> = {
  '': 'ว่าง',
  '■': 'โรงงาน',
  '□': 'หน้างาน',
};

export function WorkPlanEditor({ initialConfig, onSave, onCancel }: WorkPlanEditorProps) {
  const [totalWeeks, setTotalWeeks] = useState(initialConfig.totalWeeks);
  const [endDate, setEndDate] = useState(initialConfig.endDate || '');
  const [items, setItems] = useState<WorkPlanItem[]>(
    initialConfig.items.map(item => ({ ...item, weekCells: [...item.weekCells] }))
  );

  // Adjust weekCells when totalWeeks changes
  useEffect(() => {
    setItems(prev =>
      prev.map(item => {
        const cells = [...item.weekCells];
        if (cells.length < totalWeeks) {
          return { ...item, weekCells: [...cells, ...Array(totalWeeks - cells.length).fill('')] };
        } else if (cells.length > totalWeeks) {
          return { ...item, weekCells: cells.slice(0, totalWeeks) };
        }
        return item;
      })
    );
  }, [totalWeeks]);

  const handleCellClick = (itemIndex: number, cellIndex: number) => {
    setItems(prev => {
      const updated = [...prev];
      const item = { ...updated[itemIndex], weekCells: [...updated[itemIndex].weekCells] };
      const currentIdx = CELL_TYPES.indexOf(item.weekCells[cellIndex] as typeof CELL_TYPES[number]);
      item.weekCells[cellIndex] = CELL_TYPES[(currentIdx + 1) % CELL_TYPES.length];
      updated[itemIndex] = item;
      return updated;
    });
  };

  const handleFieldChange = (index: number, field: keyof WorkPlanItem, value: string) => {
    setItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const addItem = () => {
    const newNo = String(items.length + 1);
    setItems(prev => [
      ...prev,
      {
        no: newNo,
        task: '',
        duration: '7 วัน',
        weekCells: Array(totalWeeks).fill(''),
        status: 'รอเริ่มงาน',
      },
    ]);
  };

  const removeItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    onSave({
      totalWeeks,
      endDate,
      items: items.map((item, i) => ({
        ...item,
        no: String(i + 1),
      })),
    });
  };

  return (
    <div className="bg-white border border-stone-200 rounded-xl shadow-lg mx-auto max-w-[210mm] print:hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-stone-200 bg-stone-50 rounded-t-xl">
        <h3 className="text-sm font-medium text-stone-800">แก้ไขแผนการทำงาน</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={onCancel}
            className="flex items-center gap-1 px-3 py-1.5 text-xs text-stone-500 hover:text-stone-700 border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            ยกเลิก
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-1 px-3 py-1.5 text-xs text-white bg-stone-800 hover:bg-stone-700 rounded-lg transition-colors"
          >
            <Save className="w-3.5 h-3.5" />
            บันทึก
          </button>
        </div>
      </div>

      {/* Settings */}
      <div className="px-5 py-3 border-b border-stone-100 flex items-center gap-6">
        <div className="flex items-center gap-2">
          <label className="text-xs text-stone-500">จำนวนสัปดาห์:</label>
          <input
            type="number"
            min={1}
            max={52}
            value={totalWeeks}
            onChange={e => setTotalWeeks(Math.max(1, Math.min(52, parseInt(e.target.value) || 1)))}
            className="w-16 px-2 py-1 text-xs border border-stone-200 rounded-md text-center focus:outline-none focus:ring-1 focus:ring-stone-400"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-stone-500">วันที่คาดว่าแล้วเสร็จ:</label>
          <input
            type="text"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            placeholder="เช่น 10 เมษายน 2569"
            className="w-48 px-2 py-1 text-xs border border-stone-200 rounded-md focus:outline-none focus:ring-1 focus:ring-stone-400"
          />
        </div>
      </div>

      {/* Legend */}
      <div className="px-5 py-2 border-b border-stone-100 flex items-center gap-4 text-[10px] text-stone-500">
        <span>คลิกช่องเพื่อเปลี่ยนสถานะ:</span>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 border border-stone-200 rounded bg-white"></div>
          <span>ว่าง</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-stone-600 border border-stone-200 rounded"></div>
          <span>โรงงาน (■)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-stone-400 border border-stone-200 rounded"></div>
          <span>หน้างาน (□)</span>
        </div>
      </div>

      {/* Table */}
      <div className="px-5 py-3 overflow-x-auto">
        <table className="w-full border-collapse text-[11px]">
          <thead>
            <tr className="bg-stone-100">
              <th className="border border-stone-200 px-2 py-1.5 text-left w-10 text-stone-500">#</th>
              <th className="border border-stone-200 px-2 py-1.5 text-left min-w-[180px] text-stone-500">รายการงาน</th>
              <th className="border border-stone-200 px-2 py-1.5 text-center w-20 text-stone-500">ระยะเวลา</th>
              {Array.from({ length: totalWeeks }, (_, i) => (
                <th key={i} className="border border-stone-200 px-1 py-1.5 text-center w-9 text-stone-500">
                  W{i + 1}
                </th>
              ))}
              <th className="border border-stone-200 px-2 py-1.5 text-center w-24 text-stone-500">สถานะ</th>
              <th className="border border-stone-200 px-1 py-1.5 text-center w-8"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-stone-50/50'}>
                <td className="border border-stone-200 px-2 py-1 text-center text-stone-400">
                  {index + 1}
                </td>
                <td className="border border-stone-200 px-1 py-0.5">
                  <input
                    type="text"
                    value={item.task}
                    onChange={e => handleFieldChange(index, 'task', e.target.value)}
                    className="w-full px-1 py-0.5 text-[11px] border-0 bg-transparent focus:outline-none focus:bg-stone-100 rounded"
                    placeholder="ชื่อรายการงาน..."
                  />
                </td>
                <td className="border border-stone-200 px-1 py-0.5">
                  <input
                    type="text"
                    value={item.duration}
                    onChange={e => handleFieldChange(index, 'duration', e.target.value)}
                    className="w-full px-1 py-0.5 text-[11px] text-center border-0 bg-transparent focus:outline-none focus:bg-stone-100 rounded"
                    placeholder="7 วัน"
                  />
                </td>
                {item.weekCells.map((cell, cellIndex) => {
                  const isFactory = cell === '■';
                  const isOnsite = cell === '□';
                  return (
                    <td
                      key={cellIndex}
                      onClick={() => handleCellClick(index, cellIndex)}
                      className={`border border-stone-200 p-0 text-center cursor-pointer select-none transition-colors ${
                        isFactory
                          ? 'bg-stone-600 hover:bg-stone-500'
                          : isOnsite
                          ? 'bg-stone-400 hover:bg-stone-300'
                          : 'hover:bg-stone-100'
                      }`}
                      title={CELL_LABELS[cell] || 'คลิกเพื่อเปลี่ยน'}
                    >
                      <div className="h-6 flex items-center justify-center">
                        {cell && <span className="text-white text-xs">{cell}</span>}
                      </div>
                    </td>
                  );
                })}
                <td className="border border-stone-200 px-1 py-0.5">
                  <select
                    value={item.status}
                    onChange={e => handleFieldChange(index, 'status', e.target.value)}
                    className="w-full px-1 py-0.5 text-[10px] border-0 bg-transparent focus:outline-none rounded"
                  >
                    <option value="รอเริ่มงาน">รอเริ่มงาน</option>
                    <option value="กำลังดำเนินการ">กำลังดำเนินการ</option>
                    <option value="เสร็จแล้ว">เสร็จแล้ว</option>
                    <option value="ล่าช้า">ล่าช้า</option>
                  </select>
                </td>
                <td className="border border-stone-200 px-0.5 py-0.5 text-center">
                  <button
                    onClick={() => removeItem(index)}
                    className="p-0.5 text-stone-300 hover:text-red-500 transition-colors"
                    title="ลบรายการ"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Add row button */}
        <button
          onClick={addItem}
          className="mt-2 flex items-center gap-1.5 px-3 py-1.5 text-xs text-stone-500 hover:text-stone-700 border border-dashed border-stone-300 rounded-lg hover:border-stone-400 transition-colors w-full justify-center"
        >
          <Plus className="w-3.5 h-3.5" />
          เพิ่มรายการ
        </button>
      </div>
    </div>
  );
}
