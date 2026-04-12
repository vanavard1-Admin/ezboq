'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Plus,
    Filter,
    Calendar,
    Receipt,
    Wallet,
    TrendingDown,
    Loader2,
    X,
    Pencil,
    Trash2,
} from 'lucide-react';
import { expensesRepo, Expense, ExpenseCategory, ExpenseStatus } from '@/lib/repos/expenses.repo';

const CUSTOM_CATEGORY = '__CUSTOM__';
const DEFAULT_CATEGORY_LABELS: Record<string, string> = {
    [ExpenseCategory.COST_OF_GOODS]: 'ต้นทุนสินค้า',
    [ExpenseCategory.OPERATION]: 'ค่าดำเนินงาน',
    [ExpenseCategory.MARKETING]: 'การตลาด',
    [ExpenseCategory.TRANSPORT]: 'ค่าเดินทาง/ขนส่ง',
    [ExpenseCategory.SALARY]: 'เงินเดือน',
    [ExpenseCategory.RENT]: 'ค่าเช่า',
    [ExpenseCategory.UTILITIES]: 'ค่าน้ำ/ไฟ/เน็ต',
    [ExpenseCategory.TAX]: 'ภาษี',
    [ExpenseCategory.OTHER]: 'อื่นๆ',
};

const getCategoryLabel = (value: string) => DEFAULT_CATEGORY_LABELS[value] || value;

// Quick Month Filter Helper
const getMonthRange = (dateString: string) => {
    // dateString is "YYYY-MM-DD" or "YYYY-MM"
    const [year, month] = dateString.split('-');
    const lastDay = new Date(Number(year), Number(month), 0).getDate();
    return {
        startDate: `${year}-${month}-01`,
        endDate: `${year}-${month}-${lastDay}`,
    };
};

export default function ExpensesPage() {
    const [loading, setLoading] = useState(true);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [creating, setCreating] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [customCategory, setCustomCategory] = useState('');

    // Filter State
    const [currentMonth, setCurrentMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

    // Form State
    const [formData, setFormData] = useState<Partial<Expense>>({
        date: new Date().toISOString().split('T')[0],
        category: ExpenseCategory.OTHER,
        status: ExpenseStatus.PAID,
        amount: 0,
        vatAmount: 0,
        whtAmount: 0,
        description: '',
        supplierName: '',
        supplierTaxId: '',
        supplierAddress: '',
    });

    const loadExpenses = useCallback(async () => {
        setLoading(true);
        try {
            const { startDate, endDate } = getMonthRange(`${currentMonth}-01`);
            const data = await expensesRepo.list({
                startDate,
                endDate,
                category: selectedCategory === 'ALL' ? undefined : selectedCategory,
            });
            setExpenses(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [currentMonth, selectedCategory]);

    const handleDelete = async (id: string) => {
        if (!confirm('ยืนยันลบรายการนี้?')) return;
        try {
            await expensesRepo.delete(id);
            loadExpenses();
        } catch {
            alert('Failed to delete expense');
        }
    };

    const handleEdit = (expense: Expense) => {
        const isDefaultCategory = Object.values(ExpenseCategory).includes(expense.category as ExpenseCategory);
        setEditId(expense.id);
        setFormData({
            date: expense.date,
            category: isDefaultCategory ? expense.category : CUSTOM_CATEGORY,
            status: expense.status,
            amount: expense.amount,
            vatAmount: expense.vatAmount ?? 0,
            whtAmount: expense.whtAmount ?? 0,
            description: expense.description,
            supplierName: expense.supplierName ?? '',
            supplierTaxId: expense.supplierTaxId ?? '',
            supplierAddress: expense.supplierAddress ?? '',
        });
        setCustomCategory(isDefaultCategory ? '' : expense.category);
        setShowCreateModal(true);
    };

    const resetForm = () => {
        setEditId(null);
        setFormData({
            date: new Date().toISOString().split('T')[0],
            category: ExpenseCategory.OTHER,
            status: ExpenseStatus.PAID,
            amount: 0,
            vatAmount: 0,
            whtAmount: 0,
            description: '',
            supplierName: '',
            supplierTaxId: '',
            supplierAddress: '',
        });
        setCustomCategory('');
    };

    useEffect(() => {
        void loadExpenses();
    }, [loadExpenses]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreating(true);
        try {
            const categoryValue =
                formData.category === CUSTOM_CATEGORY ? customCategory.trim() : String(formData.category || '');
            if (!categoryValue) {
                alert('กรุณาใส่ชื่อหมวดหมู่');
                return;
            }
            const normalized = {
                ...formData,
                category: categoryValue,
                vatAmount: Number(formData.vatAmount || 0),
                whtAmount: Number(formData.whtAmount || 0),
                totalAmount: Number(formData.amount || 0) + Number(formData.vatAmount || 0),
            };
            if (editId) {
                await expensesRepo.update(editId, normalized);
            } else {
                await expensesRepo.create(normalized);
            }
            setShowCreateModal(false);
            resetForm();
            loadExpenses();
        } catch (error) {
            console.error(error);
            alert(error instanceof Error ? error.message : 'Failed to save expense');
        } finally {
            setCreating(false);
        }
    };

    const totalExpense = expenses.reduce((sum, item) => sum + item.amount, 0);
    const categoryOptions = useMemo(() => {
        const defaults = Object.values(ExpenseCategory);
        const custom = Array.from(
            new Set(expenses.map((expense) => expense.category).filter((cat) => !defaults.includes(cat as ExpenseCategory)))
        );
        return [...defaults, ...custom];
    }, [expenses]);

    return (
        <div className="mx-auto max-w-6xl space-y-6 pb-20">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">รายจ่าย (Expenses)</h1>
                    <p className="text-slate-500 dark:text-slate-400">บันทึกและจัดการค่าใช้จ่ายทั้งหมด</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="relative z-30 group flex items-center justify-center gap-2 rounded-xl bg-slate-900 dark:bg-slate-100 px-4 py-2.5 text-sm font-medium text-white dark:text-slate-900 shadow-lg shadow-slate-900/20 transition-all hover:-translate-y-0.5 hover:bg-slate-800 dark:hover:bg-slate-200 hover:shadow-slate-900/30"
                >
                    <Plus className="h-4 w-4 transition-transform group-hover:rotate-90" />
                    บันทึกรายจ่าย
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-col gap-4 sm:flex-row">
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2">
                    <Calendar className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                    <input
                        type="month"
                        value={currentMonth}
                        onChange={(e) => setCurrentMonth(e.target.value)}
                        className="border-none bg-transparent text-sm font-medium focus:outline-none dark:text-slate-100"
                    />
                </div>
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2">
                    <Filter className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                    <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="border-none bg-transparent text-sm font-medium focus:outline-none dark:text-slate-100"
                    >
                        <option value="ALL">ทุกประเภท</option>
                        {categoryOptions.map((cat) => (
                            <option key={cat} value={cat}>
                                {getCategoryLabel(cat)}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Stats Card */}
            <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="rounded-xl bg-rose-50 dark:bg-rose-900/30 p-3">
                            <TrendingDown className="h-6 w-6 text-rose-500" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">รวมรายจ่ายเดือนนี้</p>
                            <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                                {totalExpense.toLocaleString('th-TH')} ฿
                            </h3>
                        </div>
                    </div>
                </div>
            </div>

            {/* List */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm">
                <div className="border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 px-6 py-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
                        <Receipt className="h-4 w-4" />
                        รายการล่าสุด
                    </div>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-700">
                    {loading ? (
                        <div className="flex items-center justify-center py-10">
                            <Loader2 className="h-6 w-6 animate-spin text-slate-400 dark:text-slate-500" />
                        </div>
                    ) : expenses.length === 0 ? (
                        <div className="py-10 text-center text-slate-400 dark:text-slate-500">ยังไม่มีรายจ่าย</div>
                    ) : (
                        expenses.map((expense) => (
                            <div key={expense.id} className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-800">
                                <div className="flex items-center gap-4">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
                                        <Wallet className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-slate-900 dark:text-slate-100">{expense.description}</p>
                                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                            <span>{new Date(expense.date).toLocaleDateString('th-TH')}</span>
                                            <span>•</span>
                                            <span className="rounded-full bg-slate-100 dark:bg-slate-700 px-2 py-0.5 text-slate-600 dark:text-slate-300">
                                                {getCategoryLabel(expense.category)}
                                            </span>
                                            {expense.supplierName ? (
                                                <>
                                                    <span>•</span>
                                                    <span className="text-slate-500 dark:text-slate-400">ผู้รับเงิน: {expense.supplierName}</span>
                                                </>
                                            ) : null}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-slate-900 dark:text-slate-100">
                                        -{expense.amount.toLocaleString('th-TH')} ฿
                                    </p>
                                    <span className="text-xs text-slate-400 dark:text-slate-500">{expense.status}</span>
                                    <div className="mt-2 flex justify-end gap-2">
                                        <button onClick={() => handleEdit(expense)} className="p-1 hover:text-indigo-600">
                                            <Pencil className="h-4 w-4" />
                                        </button>
                                        <button onClick={() => handleDelete(expense.id)} className="p-1 hover:text-rose-600">
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl">
                        <div className="mb-6 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                                {editId ? 'แก้ไขรายจ่าย' : 'บันทึกรายจ่าย'}
                            </h2>
                            <button onClick={() => { setShowCreateModal(false); resetForm(); }} className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-700">
                                <X className="h-5 w-5 text-slate-500 dark:text-slate-400" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">วันที่</label>
                                <input
                                    type="date"
                                    required
                                    value={formData.date}
                                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                    className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 px-4 py-2 dark:text-slate-100 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">หมวดหมู่</label>
                                <select
                                    value={formData.category}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                    className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 px-4 py-2 dark:text-slate-100 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                >
                                    {Object.values(ExpenseCategory).map((cat) => (
                                        <option key={cat} value={cat}>
                                            {getCategoryLabel(cat)}
                                        </option>
                                    ))}
                                    <option value={CUSTOM_CATEGORY}>เพิ่มหมวดหมู่เอง</option>
                                </select>
                            </div>
                            {formData.category === CUSTOM_CATEGORY && (
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">ชื่อหมวดหมู่ใหม่</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="เช่น ค่าดูแลสัตว์เลี้ยง"
                                        value={customCategory}
                                        onChange={(e) => setCustomCategory(e.target.value)}
                                        className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 px-4 py-2 dark:text-slate-100 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                    />
                                </div>
                            )}
                            <div>
                                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">รายละเอียด</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="เช่น ค่าเช่าออฟฟิศ, ค่ากาแฟ"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 px-4 py-2 dark:text-slate-100 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">ผู้รับเงิน (คู่ค้า)</label>
                                <input
                                    type="text"
                                    placeholder="เช่น หจก.วนาวาด"
                                    value={formData.supplierName}
                                    onChange={(e) => setFormData({ ...formData, supplierName: e.target.value })}
                                    className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 px-4 py-2 dark:text-slate-100 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">เลขผู้เสียภาษีผู้รับเงิน (ถ้ามี)</label>
                                <input
                                    type="text"
                                    placeholder="เช่น 010555XXXXXXX"
                                    value={formData.supplierTaxId}
                                    onChange={(e) => setFormData({ ...formData, supplierTaxId: e.target.value })}
                                    className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 px-4 py-2 dark:text-slate-100 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">ที่อยู่ผู้รับเงิน (ถ้ามี)</label>
                                <input
                                    type="text"
                                    placeholder="เช่น 99/1 ถนนสุขุมวิท..."
                                    value={formData.supplierAddress}
                                    onChange={(e) => setFormData({ ...formData, supplierAddress: e.target.value })}
                                    className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 px-4 py-2 dark:text-slate-100 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">จำนวนเงิน (ไม่รวมภาษี)</label>
                                <input
                                    type="number"
                                    required
                                    min="0"
                                    step="0.01"
                                    value={formData.amount}
                                    onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                                    className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 px-4 py-2 dark:text-slate-100 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">VAT (ถ้ามี)</label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={formData.vatAmount}
                                    onChange={(e) => setFormData({ ...formData, vatAmount: Number(e.target.value) })}
                                    className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 px-4 py-2 dark:text-slate-100 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">หัก ณ ที่จ่าย (บาท)</label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={formData.whtAmount}
                                    onChange={(e) => setFormData({ ...formData, whtAmount: Number(e.target.value) })}
                                    className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 px-4 py-2 dark:text-slate-100 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                />
                                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                    ใส่ยอดที่ถูกหัก เช่น 1%/3%/5% (ระบบใช้คำนวณ 50 ทวิ)
                                </p>
                            </div>

                            <button
                                type="submit"
                                disabled={creating}
                                className="mt-4 flex w-full justify-center rounded-xl bg-slate-900 dark:bg-slate-100 py-3 font-semibold text-white dark:text-slate-900 shadow-lg shadow-slate-900/20 transition-all hover:bg-slate-800 dark:hover:bg-slate-200 disabled:opacity-50"
                            >
                                {creating ? <Loader2 className="animate-spin" /> : 'บันทึก'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
