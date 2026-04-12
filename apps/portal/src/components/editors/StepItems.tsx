import { DocumentItem } from '@/lib/repos/documents.repo';
import { Plus, Trash2 } from 'lucide-react';

interface StepItemsProps {
    items: DocumentItem[];
    setItems: (items: DocumentItem[]) => void;
    isReadOnly: boolean;
}

const DEFAULT_ITEM: DocumentItem = {
    line_no: 1,
    description_th: '',
    qty: 1,
    unit: 'รายการ',
    unit_price: 0,
    amount: 0,
};

export function StepItems({ items, setItems, isReadOnly }: StepItemsProps) {
    const handleItemChange = (index: number, field: keyof DocumentItem, value: string | number) => {
        const newItems = [...items];
        const item = { ...newItems[index], [field]: value };

        // Recalc line amount
        if (field === 'qty' || field === 'unit_price') {
            item.amount = Number(item.qty) * Number(item.unit_price);
        }

        newItems[index] = item;
        setItems(newItems);
    };

    const addItem = () => {
        // Find max line_no
        const maxLine = items.reduce((max, item) => Math.max(max, item.line_no), 0);
        setItems([...items, { ...DEFAULT_ITEM, line_no: maxLine + 1 }]);
    };

    const removeItem = (index: number) => {
        if (items.length === 1) return;
        const newItems = items.filter((_, i) => i !== index);
        // Re-index line numbers
        const reindexed = newItems.map((item, i) => ({ ...item, line_no: i + 1 }));
        setItems(reindexed);
    };

    return (
        <div className="bg-white dark:bg-slate-900 shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-4">รายการสินค้า/บริการ</h3>

            {items.length === 0 && (
                <div className="text-center py-8 text-gray-500 dark:text-slate-400 border-2 border-dashed dark:border-slate-700 rounded-lg mb-4">
                    ยังไม่มีรายการ กด &quot;เพิ่มรายการ&quot; เพื่อเริ่มต้น
                </div>
            )}

            <div className="space-y-4">
                {items.map((item, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-start text-sm border-b dark:border-slate-700 md:border-b-0 pb-4 md:pb-0 mb-4 md:mb-0">
                        <div className="col-span-1 pt-3 text-center text-gray-400 dark:text-slate-400 hidden md:block">{index + 1}</div>

                        <div className="col-span-12 md:col-span-5">
                            <label className="block text-xs text-gray-500 dark:text-slate-400 md:hidden mb-1">รายละเอียด</label>
                            <input
                                type="text"
                                placeholder="รายละเอียดสินค้า/บริการ"
                                disabled={isReadOnly}
                                value={item.description_th}
                                onChange={(e) => handleItemChange(index, 'description_th', e.target.value)}
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600"
                            />
                        </div>

                        <div className="col-span-4 md:col-span-2">
                            <label className="block text-xs text-gray-500 dark:text-slate-400 md:hidden mb-1">จำนวน</label>
                            <input
                                type="number"
                                placeholder="จำนวน"
                                disabled={isReadOnly}
                                value={item.qty}
                                onChange={(e) => handleItemChange(index, 'qty', parseFloat(e.target.value) || 0)}
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600 text-right"
                            />
                        </div>

                        <div className="col-span-4 md:col-span-1">
                            <label className="block text-xs text-gray-500 dark:text-slate-400 md:hidden mb-1">หน่วย</label>
                            <input
                                type="text"
                                placeholder="หน่วย"
                                disabled={isReadOnly}
                                value={item.unit}
                                onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600 text-center"
                            />
                        </div>

                        <div className="col-span-4 md:col-span-2">
                            <label className="block text-xs text-gray-500 dark:text-slate-400 md:hidden mb-1">ราคา/หน่วย</label>
                            <input
                                type="number"
                                placeholder="ราคา"
                                disabled={isReadOnly}
                                value={item.unit_price}
                                onChange={(e) => handleItemChange(index, 'unit_price', parseFloat(e.target.value) || 0)}
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600 text-right"
                            />
                        </div>

                        <div className="col-span-12 md:col-span-1 pt-2 text-center flex md:block justify-end">
                            {!isReadOnly && (
                                <button
                                    onClick={() => removeItem(index)}
                                    className="text-red-400 hover:text-red-600 p-2"
                                    title="ลบรายการ"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {!isReadOnly && (
                <button
                    onClick={addItem}
                    className="mt-4 flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 dark:text-indigo-300 dark:hover:text-indigo-200 px-3 py-2 rounded-md"
                >
                    <Plus className="w-4 h-4 mr-1" /> เพิ่มรายการ
                </button>
            )}

            <div className="mt-4 pt-4 border-t dark:border-slate-700 text-right text-gray-500 dark:text-slate-400 text-sm">
                จำนวนรายการทั้งหมด: {items.length}
            </div>
        </div>
    );
}
