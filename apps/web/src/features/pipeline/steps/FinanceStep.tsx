import { useState, useCallback, useMemo, type Dispatch, type SetStateAction } from 'react';
import {
  BarChart3,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  DollarSign,
  FileText,
  Landmark,
  Minus,
  Plus,
  Receipt,
  TrendingDown,
  TrendingUp,
  Wallet,
  X,
} from 'lucide-react';
import type { ProjectData } from '../../../utils/projectData';
import type {
  ContractorAssignment,
  InstallmentLine,
  PricingConfig,
  PricingSummary,
} from '../types';
import type { ViewableDocument } from '../components/DocumentViewer';
import { DocumentCard } from '../components/DocumentCard';
import type {
  IncomeRecord,
  ExpenseRecord,
  PaymentMethod,
  ExpenseCategory,
  ProjectAccounting,
} from '../../../types/accounting';

// ── Types ────────────────────────────────────────────────

type SubTab = 'overview' | 'income' | 'expenses' | 'tax' | 'reports';

type ProjectWithAccounting = ProjectData & { accounting?: ProjectAccounting };

interface ExpenseFormState {
  category: ExpenseCategory;
  subcategory: string;
  description: string;
  amount: string;
  vatAmount: string;
  whtAmount: string;
  supplierName: string;
  paymentMethod: PaymentMethod;
  paymentDate: string;
  linkedPoCategory: string;
  linkedContractorId: string;
  note: string;
}

interface FinanceStepProps {
  project: ProjectData;
  pricing: PricingConfig;
  pricingSummary: PricingSummary;
  installments: InstallmentLine[];
  contractors: ContractorAssignment[];
  onViewDoc?: (type: ViewableDocument) => void;
}

// ── Helpers ──────────────────────────────────────────────

function fmt(v: number): string {
  return new Intl.NumberFormat('th-TH', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(v);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: '2-digit',
  });
}

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

function createInitialExpenseForm(): ExpenseFormState {
  return {
    category: 'material',
    subcategory: '',
    description: '',
    amount: '',
    vatAmount: '',
    whtAmount: '',
    supplierName: '',
    paymentMethod: 'transfer',
    paymentDate: todayISO(),
    linkedPoCategory: '',
    linkedContractorId: '',
    note: '',
  };
}

function genId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function daysBetween(dateStr: string, now: Date): number {
  const d = new Date(dateStr);
  return Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
}

const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  transfer: 'โอนเงิน',
  cash: 'เงินสด',
  cheque: 'เช็ค',
};

const EXPENSE_CATEGORY_LABEL: Record<ExpenseCategory, string> = {
  material: 'วัสดุ',
  labor: 'ค่าแรง',
  operating: 'ค่าดำเนินงาน',
  other: 'อื่นๆ',
};

const EXPENSE_CATEGORY_COLOR: Record<ExpenseCategory, string> = {
  material: 'bg-blue-100 text-blue-700',
  labor: 'bg-orange-100 text-orange-700',
  operating: 'bg-purple-100 text-purple-700',
  other: 'bg-slate-100 text-slate-600',
};

const SUB_TABS: { key: SubTab; label: string; icon: typeof Wallet }[] = [
  { key: 'overview', label: 'ภาพรวม', icon: BarChart3 },
  { key: 'income', label: 'รายรับ', icon: TrendingUp },
  { key: 'expenses', label: 'รายจ่าย', icon: TrendingDown },
  { key: 'tax', label: 'ภาษี', icon: Landmark },
  { key: 'reports', label: 'รายงาน', icon: FileText },
];

// ── Component ────────────────────────────────────────────

export function FinanceStep({
  project,
  pricing,
  pricingSummary,
  installments,
  contractors,
  onViewDoc,
}: FinanceStepProps) {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('overview');

  // ── Accounting state ──
  const initAccounting = (project as ProjectWithAccounting).accounting;

  const [incomeRecords, setIncomeRecords] = useState<IncomeRecord[]>(
    initAccounting?.incomeRecords ?? [],
  );
  const [expenseRecords, setExpenseRecords] = useState<ExpenseRecord[]>(
    initAccounting?.expenseRecords ?? [],
  );

  // ── Income form state ──
  const [incomeFormOpen, setIncomeFormOpen] = useState<number | null>(null);
  const [incomeFormMethod, setIncomeFormMethod] = useState<PaymentMethod>('transfer');
  const [incomeFormDate, setIncomeFormDate] = useState(todayISO());
  const [incomeFormNote, setIncomeFormNote] = useState('');

  // ── Expense form state ──
  const [expenseFormOpen, setExpenseFormOpen] = useState(false);
  const [expForm, setExpForm] = useState<ExpenseFormState>(createInitialExpenseForm);

  // ── Tax period selector ──
  const now = new Date();
  const [taxMonth, setTaxMonth] = useState(now.getMonth() + 1);
  const [taxYear, setTaxYear] = useState(now.getFullYear() + 543); // Buddhist year

  // ── Derived calculations ──
  const vatRate = pricing.vatEnabled ? pricing.vatRate : 0;

  const totalSellingWithVat = pricingSummary.sellingTotal;

  const totalIncome = useMemo(
    () => incomeRecords.reduce((s, r) => s + r.amount, 0),
    [incomeRecords],
  );
  const totalExpenses = useMemo(
    () => expenseRecords.reduce((s, r) => s + r.amount, 0),
    [expenseRecords],
  );
  const totalExpenseVat = useMemo(
    () => expenseRecords.reduce((s, r) => s + r.vatAmount, 0),
    [expenseRecords],
  );
  const totalExpenseWht = useMemo(
    () => expenseRecords.reduce((s, r) => s + r.whtAmount, 0),
    [expenseRecords],
  );

  const paidInstallmentNos = useMemo(
    () => new Set(incomeRecords.map((r) => r.installmentNo)),
    [incomeRecords],
  );

  const pendingInstallments = useMemo(
    () => installments.filter((i) => !paidInstallmentNos.has(i.no)),
    [installments, paidInstallmentNos],
  );

  const totalOutstanding = useMemo(
    () => pendingInstallments.reduce((s, i) => s + i.amount, 0),
    [pendingInstallments],
  );

  const profitLoss = totalIncome - totalExpenses;
  const taxPayable = pricing.vatEnabled
    ? Math.round(pricingSummary.sellingBeforeVat * vatRate) - totalExpenseVat
    : 0;

  // ── Expense by category ──
  const expensesByCategory = useMemo(() => {
    const groups: Record<ExpenseCategory, ExpenseRecord[]> = {
      material: [],
      labor: [],
      operating: [],
      other: [],
    };
    for (const e of expenseRecords) {
      groups[e.category].push(e);
    }
    return groups;
  }, [expenseRecords]);

  const expenseTotalByCategory = useMemo(() => {
    const totals: Record<ExpenseCategory, number> = { material: 0, labor: 0, operating: 0, other: 0 };
    for (const e of expenseRecords) {
      totals[e.category] += e.amount;
    }
    return totals;
  }, [expenseRecords]);

  // ── Handlers ──
  const handleRecordIncome = useCallback(
    (installmentNo: number, amount: number) => {
      const record: IncomeRecord = {
        id: genId(),
        installmentNo,
        amount,
        paymentMethod: incomeFormMethod,
        paymentDate: incomeFormDate,
        note: incomeFormNote || undefined,
        createdAt: new Date().toISOString(),
      };
      setIncomeRecords((prev) => [...prev, record]);
      setIncomeFormOpen(null);
      setIncomeFormMethod('transfer');
      setIncomeFormDate(todayISO());
      setIncomeFormNote('');
    },
    [incomeFormMethod, incomeFormDate, incomeFormNote],
  );

  const handleAddExpense = useCallback(() => {
    const amount = Number(expForm.amount) || 0;
    if (!expForm.description || amount <= 0) return;

    const vatAmt = Number(expForm.vatAmount) || 0;
    const whtAmt = Number(expForm.whtAmount) || 0;

    const record: ExpenseRecord = {
      id: genId(),
      category: expForm.category,
      subcategory: expForm.subcategory || undefined,
      description: expForm.description,
      amount,
      vatAmount: vatAmt,
      whtAmount: whtAmt,
      netAmount: amount + vatAmt - whtAmt,
      paymentMethod: expForm.paymentMethod,
      paymentDate: expForm.paymentDate,
      status: 'paid',
      supplierName: expForm.supplierName || undefined,
      linkedPoCategory: expForm.linkedPoCategory || undefined,
      linkedContractorId: expForm.linkedContractorId || undefined,
      note: expForm.note || undefined,
      createdAt: new Date().toISOString(),
    };
    setExpenseRecords((prev) => [...prev, record]);
    setExpenseFormOpen(false);
    setExpForm(createInitialExpenseForm());
  }, [expForm]);

  const handleDeleteExpense = useCallback((id: string) => {
    setExpenseRecords((prev) => prev.filter((e) => e.id !== id));
  }, []);

  // ── Auto-calc VAT for expense form ──
  const handleExpenseAmountChange = useCallback(
    (val: string) => {
      const num = Number(val) || 0;
      const autoVat = pricing.vatEnabled ? Math.round(num * pricing.vatRate) : 0;
      setExpForm((prev) => ({
        ...prev,
        amount: val,
        vatAmount: autoVat > 0 ? String(autoVat) : '',
      }));
    },
    [pricing],
  );

  return (
    <div className="space-y-4">
      {/* ── Sub-tab navigation ── */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
        {SUB_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveSubTab(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors shrink-0 ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Tab content ── */}
      {activeSubTab === 'overview' && (
        <OverviewTab
          pricingSummary={pricingSummary}
          pricing={pricing}
          totalIncome={totalIncome}
          totalExpenses={totalExpenses}
          profitLoss={profitLoss}
          taxPayable={taxPayable}
          totalSellingWithVat={totalSellingWithVat}
          installments={installments}
          paidCount={paidInstallmentNos.size}
          onNavigate={setActiveSubTab}
        />
      )}

      {activeSubTab === 'income' && (
        <IncomeTab
          installments={installments}
          incomeRecords={incomeRecords}
          paidInstallmentNos={paidInstallmentNos}
          totalIncome={totalIncome}
          totalOutstanding={totalOutstanding}
          incomeFormOpen={incomeFormOpen}
          incomeFormMethod={incomeFormMethod}
          incomeFormDate={incomeFormDate}
          incomeFormNote={incomeFormNote}
          setIncomeFormOpen={setIncomeFormOpen}
          setIncomeFormMethod={setIncomeFormMethod}
          setIncomeFormDate={setIncomeFormDate}
          setIncomeFormNote={setIncomeFormNote}
          onRecordIncome={handleRecordIncome}
          onViewDoc={onViewDoc}
        />
      )}

      {activeSubTab === 'expenses' && (
        <ExpensesTab
          expenseRecords={expenseRecords}
          expensesByCategory={expensesByCategory}
          expenseTotalByCategory={expenseTotalByCategory}
          totalExpenses={totalExpenses}
          expenseFormOpen={expenseFormOpen}
          expForm={expForm}
          setExpenseFormOpen={setExpenseFormOpen}
          setExpForm={setExpForm}
          onAddExpense={handleAddExpense}
          onDeleteExpense={handleDeleteExpense}
          onAmountChange={handleExpenseAmountChange}
          contractors={contractors}
        />
      )}

      {activeSubTab === 'tax' && (
        <TaxTab
          pricing={pricing}
          pricingSummary={pricingSummary}
          totalExpenseVat={totalExpenseVat}
          totalExpenseWht={totalExpenseWht}
          taxMonth={taxMonth}
          taxYear={taxYear}
          setTaxMonth={setTaxMonth}
          setTaxYear={setTaxYear}
          onViewDoc={onViewDoc}
        />
      )}

      {activeSubTab === 'reports' && (
        <ReportsTab
          pricingSummary={pricingSummary}
          totalIncome={totalIncome}
          totalExpenses={totalExpenses}
          profitLoss={profitLoss}
          expenseTotalByCategory={expenseTotalByCategory}
          incomeRecords={incomeRecords}
          expenseRecords={expenseRecords}
          installments={installments}
          paidInstallmentNos={paidInstallmentNos}
        />
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// Tab 1: Overview
// ══════════════════════════════════════════════════════════

function OverviewTab({
  pricingSummary,
  pricing,
  totalIncome,
  totalExpenses,
  profitLoss,
  taxPayable,
  totalSellingWithVat,
  installments,
  paidCount,
  onNavigate,
}: {
  pricingSummary: PricingSummary;
  pricing: PricingConfig;
  totalIncome: number;
  totalExpenses: number;
  profitLoss: number;
  taxPayable: number;
  totalSellingWithVat: number;
  installments: InstallmentLine[];
  paidCount: number;
  onNavigate: (tab: SubTab) => void;
}) {
  return (
    <div className="space-y-5">
      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="รายรับรวม"
          value={fmt(totalIncome)}
          sub={`จาก ${totalSellingWithVat > 0 ? fmt(totalSellingWithVat) : '-'} บาท`}
          icon={<TrendingUp className="w-4 h-4" />}
          color="emerald"
        />
        <StatCard
          label="รายจ่ายรวม"
          value={fmt(totalExpenses)}
          sub="บันทึกแล้ว"
          icon={<TrendingDown className="w-4 h-4" />}
          color="red"
        />
        <StatCard
          label="กำไร/ขาดทุน"
          value={`${profitLoss >= 0 ? '' : '-'}${fmt(Math.abs(profitLoss))}`}
          sub={profitLoss >= 0 ? 'กำไร' : 'ขาดทุน'}
          icon={<DollarSign className="w-4 h-4" />}
          color={profitLoss >= 0 ? 'blue' : 'red'}
        />
        <StatCard
          label="ภาษีค้างจ่าย"
          value={fmt(Math.max(taxPayable, 0))}
          sub={pricing.vatEnabled ? 'VAT สุทธิ' : 'ไม่มี VAT'}
          icon={<Landmark className="w-4 h-4" />}
          color="amber"
        />
      </div>

      {/* Cost breakdown */}
      <section className="bg-slate-50 rounded-xl p-4 space-y-2 text-sm">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
          รายละเอียดต้นทุนและราคาขาย
        </h3>
        <Row label="วัสดุ" value={pricingSummary.costMaterial} />
        <Row label="ค่าแรง" value={pricingSummary.costLabor} />
        {pricingSummary.markup > 0 && (
          <Row label={`+ กำไร ${pricing.markupPercent}%`} value={pricingSummary.markup} className="text-emerald-600" />
        )}
        {pricingSummary.operating > 0 && (
          <Row label={`+ ค่าดำเนินงาน ${pricing.operatingPercent}%`} value={pricingSummary.operating} className="text-slate-500" />
        )}
        <Row
          label="ราคาขาย (ก่อน VAT)"
          value={pricingSummary.sellingBeforeVat}
          className="border-t border-slate-200 pt-1.5 font-medium"
        />
        {pricing.vatEnabled && <Row label={`VAT ${pricing.vatRate * 100}%`} value={pricingSummary.vat} className="text-slate-500" />}
        {pricing.whtEnabled && (
          <Row label={`- WHT ${pricing.whtRate * 100}%`} value={-pricingSummary.wht} className="text-red-500" />
        )}
        <Row
          label="รับสุทธิ"
          value={pricingSummary.netReceive}
          className="border-t border-slate-200 pt-1.5 font-semibold text-blue-700 text-base"
        />
      </section>

      {/* Collection progress */}
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-slate-600 font-medium">รับเงินแล้ว</span>
          <span className="font-mono text-slate-800 font-semibold">
            {fmt(totalIncome)} / {fmt(totalSellingWithVat)}
          </span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2.5">
          <div
            className="bg-emerald-500 h-2.5 rounded-full transition-all duration-500"
            style={{
              width: `${Math.min((totalIncome / Math.max(totalSellingWithVat, 1)) * 100, 100)}%`,
            }}
          />
        </div>
        <div className="flex items-center justify-between text-xs text-slate-400 mt-1">
          <span>
            {paidCount}/{installments.length} งวด
          </span>
          <span>{Math.round((totalIncome / Math.max(totalSellingWithVat, 1)) * 100)}%</span>
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {SUB_TABS.filter((t) => t.key !== 'overview').map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => onNavigate(tab.key)}
              className="flex items-center gap-2 px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors"
            >
              <Icon className="w-4 h-4 text-slate-400" />
              <span className="font-medium">{tab.label}</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300 ml-auto" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// Tab 2: Income
// ══════════════════════════════════════════════════════════

function IncomeTab({
  installments,
  incomeRecords,
  paidInstallmentNos,
  totalIncome,
  totalOutstanding,
  incomeFormOpen,
  incomeFormMethod,
  incomeFormDate,
  incomeFormNote,
  setIncomeFormOpen,
  setIncomeFormMethod,
  setIncomeFormDate,
  setIncomeFormNote,
  onRecordIncome,
  onViewDoc,
}: {
  installments: InstallmentLine[];
  incomeRecords: IncomeRecord[];
  paidInstallmentNos: Set<number>;
  totalIncome: number;
  totalOutstanding: number;
  incomeFormOpen: number | null;
  incomeFormMethod: PaymentMethod;
  incomeFormDate: string;
  incomeFormNote: string;
  setIncomeFormOpen: (v: number | null) => void;
  setIncomeFormMethod: (v: PaymentMethod) => void;
  setIncomeFormDate: (v: string) => void;
  setIncomeFormNote: (v: string) => void;
  onRecordIncome: (installmentNo: number, amount: number) => void;
  onViewDoc?: (type: ViewableDocument) => void;
}) {
  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-[140px] bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
          <p className="text-xs text-emerald-600">รับแล้ว</p>
          <p className="text-lg font-bold font-mono text-emerald-800">{fmt(totalIncome)}</p>
        </div>
        <div className="flex-1 min-w-[140px] bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
          <p className="text-xs text-amber-600">ค้างรับ</p>
          <p className="text-lg font-bold font-mono text-amber-800">{fmt(totalOutstanding)}</p>
        </div>
      </div>

      {/* Installment list */}
      <div className="space-y-2">
        {installments.map((inst) => {
          const isPaid = paidInstallmentNos.has(inst.no);
          const record = incomeRecords.find((r) => r.installmentNo === inst.no);
          const isFormOpen = incomeFormOpen === inst.no;

          return (
            <div
              key={inst.no}
              className={`border rounded-xl overflow-hidden transition-colors ${
                isPaid ? 'border-emerald-200 bg-emerald-50/40' : 'border-slate-200 bg-white'
              }`}
            >
              {/* Installment header */}
              <div className="px-4 py-3 flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-800">งวดที่ {inst.no}</span>
                    <StatusBadge status={isPaid ? 'paid' : 'pending'} />
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{inst.label}</p>
                </div>
                <span className="text-sm font-mono font-semibold text-slate-800 ml-3">
                  {fmt(inst.amount)} บาท
                </span>
              </div>

              {/* Paid details */}
              {isPaid && record && (
                <div className="px-4 pb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-emerald-700">
                  <span>รับเงินวันที่ {formatDate(record.paymentDate)}</span>
                  <span>{PAYMENT_METHOD_LABEL[record.paymentMethod]}</span>
                  {record.note && <span className="text-emerald-500">"{record.note}"</span>}
                  <button
                    onClick={() => onViewDoc?.('receipt')}
                    className="ml-auto flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium"
                  >
                    <Receipt className="w-3 h-3" />
                    ออกใบเสร็จ
                  </button>
                </div>
              )}

              {/* Record payment button */}
              {!isPaid && !isFormOpen && (
                <div className="px-4 pb-3">
                  <button
                    onClick={() => setIncomeFormOpen(inst.no)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    บันทึกรับเงิน
                  </button>
                </div>
              )}

              {/* Inline income form */}
              {!isPaid && isFormOpen && (
                <div className="px-4 pb-4 border-t border-slate-100 pt-3 space-y-3">
                  {/* Amount (pre-filled) */}
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">จำนวนเงิน</label>
                    <div className="text-sm font-mono font-semibold text-slate-800 bg-slate-50 px-3 py-2 rounded-lg">
                      {fmt(inst.amount)} บาท
                    </div>
                  </div>

                  {/* Payment method */}
                  <div>
                    <label className="text-xs text-slate-500 block mb-1.5">วิธีชำระ</label>
                    <div className="flex gap-2">
                      {(['transfer', 'cash', 'cheque'] as PaymentMethod[]).map((m) => (
                        <label
                          key={m}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer border transition-colors ${
                            incomeFormMethod === m
                              ? 'border-blue-500 bg-blue-50 text-blue-700'
                              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <input
                            type="radio"
                            name="income-method"
                            value={m}
                            checked={incomeFormMethod === m}
                            onChange={() => setIncomeFormMethod(m)}
                            className="sr-only"
                          />
                          {PAYMENT_METHOD_LABEL[m]}
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Date */}
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">วันที่รับเงิน</label>
                    <input
                      type="date"
                      value={incomeFormDate}
                      onChange={(e) => setIncomeFormDate(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                    />
                  </div>

                  {/* Note */}
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">หมายเหตุ (ไม่บังคับ)</label>
                    <input
                      type="text"
                      value={incomeFormNote}
                      onChange={(e) => setIncomeFormNote(e.target.value)}
                      placeholder="เช่น เลขอ้างอิง, หมายเลขเช็ค"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => onRecordIncome(inst.no, inst.amount)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      บันทึก
                    </button>
                    <button
                      onClick={() => setIncomeFormOpen(null)}
                      className="px-3 py-2 bg-slate-100 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-200 transition-colors"
                    >
                      ยกเลิก
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// Tab 3: Expenses
// ══════════════════════════════════════════════════════════

function ExpensesTab({
  expenseRecords,
  expensesByCategory,
  expenseTotalByCategory,
  totalExpenses,
  expenseFormOpen,
  expForm,
  setExpenseFormOpen,
  setExpForm,
  onAddExpense,
  onDeleteExpense,
  onAmountChange,
  contractors,
}: {
  expenseRecords: ExpenseRecord[];
  expensesByCategory: Record<ExpenseCategory, ExpenseRecord[]>;
  expenseTotalByCategory: Record<ExpenseCategory, number>;
  totalExpenses: number;
  expenseFormOpen: boolean;
  expForm: ExpenseFormState;
  setExpenseFormOpen: (v: boolean) => void;
  setExpForm: Dispatch<SetStateAction<ExpenseFormState>>;
  onAddExpense: () => void;
  onDeleteExpense: (id: string) => void;
  onAmountChange: (val: string) => void;
  contractors: ContractorAssignment[];
}) {
  const categories: ExpenseCategory[] = ['material', 'labor', 'operating', 'other'];
  const updateExpenseForm = (patch: Partial<ExpenseFormState>) => {
    setExpForm((prev) => ({ ...prev, ...patch }));
  };

  return (
    <div className="space-y-4">
      {/* Header with add button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">รายจ่ายทั้งหมด</h3>
          <p className="text-xs text-slate-500">{expenseRecords.length} รายการ</p>
        </div>
        <button
          onClick={() => setExpenseFormOpen(!expenseFormOpen)}
          className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
            expenseFormOpen
              ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {expenseFormOpen ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {expenseFormOpen ? 'ปิดฟอร์ม' : 'เพิ่มรายจ่าย'}
        </button>
      </div>

      {/* Inline expense form */}
      {expenseFormOpen && (
        <div className="bg-white border border-blue-200 rounded-xl p-4 space-y-3">
          <h4 className="text-sm font-semibold text-slate-800">เพิ่มรายจ่ายใหม่</h4>

          {/* Category */}
          <div>
            <label className="text-xs text-slate-500 block mb-1">หมวดหมู่</label>
            <select
              value={expForm.category}
              onChange={(e) =>
                updateExpenseForm({ category: e.target.value as ExpenseCategory })
              }
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {EXPENSE_CATEGORY_LABEL[c]}
                </option>
              ))}
            </select>
          </div>

          {/* Subcategory */}
          <div>
            <label className="text-xs text-slate-500 block mb-1">หมวดย่อย (ไม่บังคับ)</label>
            <input
              type="text"
              value={expForm.subcategory}
              onChange={(e) => updateExpenseForm({ subcategory: e.target.value })}
              placeholder="เช่น หมวด BOQ ที่เกี่ยวข้อง"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs text-slate-500 block mb-1">รายละเอียด</label>
            <input
              type="text"
              value={expForm.description}
              onChange={(e) => updateExpenseForm({ description: e.target.value })}
              placeholder="เช่น ค่าปูนซีเมนต์, ค่าแรงทาสี"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
            />
          </div>

          {/* Amount / VAT / WHT */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div>
              <label className="text-xs text-slate-500 block mb-1">จำนวนเงิน</label>
              <input
                type="number"
                value={expForm.amount}
                onChange={(e) => onAmountChange(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 block mb-1">VAT</label>
              <input
                type="number"
                value={expForm.vatAmount}
                onChange={(e) => updateExpenseForm({ vatAmount: e.target.value })}
                placeholder="0"
                className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 block mb-1">WHT</label>
              <input
                type="number"
                value={expForm.whtAmount}
                onChange={(e) => updateExpenseForm({ whtAmount: e.target.value })}
                placeholder="0"
                className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
              />
            </div>
          </div>

          {/* Supplier */}
          <div>
            <label className="text-xs text-slate-500 block mb-1">ผู้ขาย / Supplier</label>
            <input
              type="text"
              value={expForm.supplierName}
              onChange={(e) => updateExpenseForm({ supplierName: e.target.value })}
              placeholder="ชื่อร้านหรือบริษัท"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
            />
          </div>

          {/* Payment method & date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-500 block mb-1">วิธีชำระ</label>
              <select
                value={expForm.paymentMethod}
                onChange={(e) =>
                  updateExpenseForm({ paymentMethod: e.target.value as PaymentMethod })
                }
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
              >
                {(['transfer', 'cash', 'cheque'] as PaymentMethod[]).map((m) => (
                  <option key={m} value={m}>
                    {PAYMENT_METHOD_LABEL[m]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 block mb-1">วันที่</label>
              <input
                type="date"
                value={expForm.paymentDate}
                onChange={(e) => updateExpenseForm({ paymentDate: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
              />
            </div>
          </div>

          {/* Linked PO / Contractor */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-500 block mb-1">เชื่อมกับ PO (ไม่บังคับ)</label>
              <input
                type="text"
                value={expForm.linkedPoCategory}
                onChange={(e) => updateExpenseForm({ linkedPoCategory: e.target.value })}
                placeholder="หมวด PO"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 block mb-1">เชื่อมกับช่าง (ไม่บังคับ)</label>
              <select
                value={expForm.linkedContractorId}
                onChange={(e) =>
                  updateExpenseForm({ linkedContractorId: e.target.value })
                }
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
              >
                <option value="">-- ไม่เลือก --</option>
                {contractors.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="text-xs text-slate-500 block mb-1">หมายเหตุ</label>
            <input
              type="text"
              value={expForm.note}
              onChange={(e) => updateExpenseForm({ note: e.target.value })}
              placeholder="(ไม่บังคับ)"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
            />
          </div>

          {/* Save */}
          <button
            onClick={onAddExpense}
            disabled={!expForm.description || !(Number(expForm.amount) > 0)}
            className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CheckCircle2 className="w-4 h-4" />
            บันทึกรายจ่าย
          </button>
        </div>
      )}

      {/* Expense list grouped by category */}
      {categories.map((cat) => {
        const items = expensesByCategory[cat];
        if (items.length === 0) return null;
        return (
          <div key={cat} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${EXPENSE_CATEGORY_COLOR[cat]}`}
                >
                  {EXPENSE_CATEGORY_LABEL[cat]}
                </span>
                <span className="text-xs text-slate-400">{items.length} รายการ</span>
              </div>
              <span className="text-xs font-mono font-semibold text-slate-600">
                {fmt(expenseTotalByCategory[cat])} บาท
              </span>
            </div>
            <div className="space-y-1">
              {items.map((exp) => (
                <div
                  key={exp.id}
                  className="bg-white border border-slate-200 rounded-lg px-3 py-2.5 flex items-center justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-slate-800 truncate">{exp.description}</p>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
                      <span>{formatDate(exp.paymentDate)}</span>
                      {exp.supplierName && <span>| {exp.supplierName}</span>}
                      <span>| {PAYMENT_METHOD_LABEL[exp.paymentMethod]}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-3 shrink-0">
                    <span className="text-sm font-mono font-semibold text-slate-800">
                      {fmt(exp.amount)}
                    </span>
                    <button
                      onClick={() => onDeleteExpense(exp.id)}
                      className="p-1 text-slate-300 hover:text-red-500 transition-colors"
                      title="ลบ"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* Empty state */}
      {expenseRecords.length === 0 && !expenseFormOpen && (
        <div className="border border-dashed border-slate-200 rounded-xl p-8 text-center">
          <Wallet className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-400">ยังไม่มีรายจ่าย</p>
          <p className="text-xs text-slate-300 mt-1">กดปุ่ม "เพิ่มรายจ่าย" เพื่อเริ่มบันทึก</p>
        </div>
      )}

      {/* Total bar */}
      {expenseRecords.length > 0 && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 flex items-center justify-between">
          <span className="text-sm font-medium text-slate-700">รวมรายจ่ายทั้งหมด</span>
          <span className="text-lg font-bold font-mono text-slate-900">{fmt(totalExpenses)} บาท</span>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// Tab 4: Tax
// ══════════════════════════════════════════════════════════

function TaxTab({
  pricing,
  pricingSummary,
  totalExpenseVat,
  totalExpenseWht,
  taxMonth,
  taxYear,
  setTaxMonth,
  setTaxYear,
  onViewDoc,
}: {
  pricing: PricingConfig;
  pricingSummary: PricingSummary;
  totalExpenseVat: number;
  totalExpenseWht: number;
  taxMonth: number;
  taxYear: number;
  setTaxMonth: (v: number) => void;
  setTaxYear: (v: number) => void;
  onViewDoc?: (type: ViewableDocument) => void;
}) {
  const vatOutput = pricingSummary.vat;
  const vatInput = totalExpenseVat;
  const netVat = vatOutput - vatInput;

  return (
    <div className="space-y-5">
      {/* Period selector */}
      <div className="flex items-center gap-2">
        <Calendar className="w-4 h-4 text-slate-400" />
        <span className="text-sm text-slate-600">งวดภาษี:</span>
        <select
          value={taxMonth}
          onChange={(e) => setTaxMonth(Number(e.target.value))}
          className="px-2 py-1 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30"
        >
          {Array.from({ length: 12 }, (_, i) => (
            <option key={i + 1} value={i + 1}>
              {new Date(2000, i).toLocaleDateString('th-TH', { month: 'long' })}
            </option>
          ))}
        </select>
        <input
          type="number"
          value={taxYear}
          onChange={(e) => setTaxYear(Number(e.target.value))}
          className="w-20 px-2 py-1 text-sm font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30"
        />
      </div>

      {/* VAT Summary */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 bg-blue-50 border-b border-blue-100">
          <h3 className="text-sm font-semibold text-blue-800">ภาษีมูลค่าเพิ่ม (VAT)</h3>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-700">ภาษีขาย (Output VAT)</p>
              <p className="text-xs text-slate-400">จากใบกำกับภาษีที่ออกให้ลูกค้า</p>
            </div>
            <span className="text-sm font-mono font-semibold text-blue-700">{fmt(vatOutput)}</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-700">ภาษีซื้อ (Input VAT)</p>
              <p className="text-xs text-slate-400">จากใบกำกับภาษีที่ได้รับจาก Supplier</p>
            </div>
            <span className="text-sm font-mono font-semibold text-emerald-700">
              -{fmt(vatInput)}
            </span>
          </div>
          <div className="border-t border-slate-200 pt-3 flex items-center justify-between">
            <p className="text-sm font-medium text-slate-800">VAT สุทธิ (ต้องนำส่ง)</p>
            <span
              className={`text-base font-mono font-bold ${
                netVat > 0 ? 'text-red-700' : netVat < 0 ? 'text-emerald-700' : 'text-slate-700'
              }`}
            >
              {netVat > 0 ? '' : netVat < 0 ? '-' : ''}
              {fmt(Math.abs(netVat))} บาท
            </span>
          </div>
          {netVat < 0 && (
            <div className="bg-emerald-50 rounded-lg px-3 py-2 text-xs text-emerald-700">
              มี VAT ซื้อมากกว่าขาย — สามารถขอคืนภาษีได้
            </div>
          )}
        </div>
      </section>

      {/* WHT Summary */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 bg-red-50 border-b border-red-100">
          <h3 className="text-sm font-semibold text-red-800">หัก ณ ที่จ่าย (WHT)</h3>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-700">หัก ณ ที่จ่าย (จ่ายช่าง/Supplier)</p>
              <p className="text-xs text-slate-400">WHT ที่เราหักจากการจ่ายเงิน</p>
            </div>
            <span className="text-sm font-mono font-semibold text-red-700">{fmt(totalExpenseWht)}</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-700">ถูกหักภาษี (ลูกค้าหัก)</p>
              <p className="text-xs text-slate-400">WHT ที่ลูกค้าหักจากการจ่ายเงินให้เรา</p>
            </div>
            <span className="text-sm font-mono font-semibold text-orange-700">
              {fmt(pricingSummary.wht)}
            </span>
          </div>
        </div>
      </section>

      {/* Filing helper */}
      <section className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <h4 className="text-sm font-semibold text-amber-800 mb-2">สรุปสำหรับยื่น ภ.พ.30</h4>
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-amber-700">ยอดขาย (ก่อน VAT)</span>
            <span className="font-mono text-amber-900">{fmt(pricingSummary.sellingBeforeVat)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-amber-700">ภาษีขาย</span>
            <span className="font-mono text-amber-900">{fmt(vatOutput)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-amber-700">ยอดซื้อ (ที่มี VAT)</span>
            <span className="font-mono text-amber-900">{fmt(vatInput > 0 ? Math.round(vatInput / pricing.vatRate) : 0)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-amber-700">ภาษีซื้อ</span>
            <span className="font-mono text-amber-900">{fmt(vatInput)}</span>
          </div>
          <div className="flex justify-between border-t border-amber-300 pt-1.5">
            <span className="text-amber-800 font-medium">ภาษีที่ต้องชำระ</span>
            <span className="font-mono font-bold text-amber-900">{fmt(Math.max(netVat, 0))}</span>
          </div>
        </div>
      </section>

      {/* Tax document buttons */}
      <section className="space-y-3">
        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          เอกสารภาษี
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {pricing.vatEnabled && (
            <DocumentCard
              title="ใบกำกับภาษี"
              subtitle={`VAT ${pricing.vatRate * 100}% = ${fmt(vatOutput)} บาท`}
              status="ready"
              amount={vatOutput}
              onView={() => onViewDoc?.('vat-invoice')}
            />
          )}
          {pricing.whtEnabled && (
            <DocumentCard
              title="หัก ณ ที่จ่าย"
              subtitle={`WHT ${pricing.whtRate * 100}% = ${fmt(pricingSummary.wht)} บาท`}
              status="ready"
              amount={pricingSummary.wht}
              onView={() => onViewDoc?.('withholding-tax')}
            />
          )}
          <DocumentCard
            title="รายงานภาษีซื้อ-ขาย"
            subtitle={`งวด ${taxMonth}/${taxYear}`}
            status="draft"
            onView={() => onViewDoc?.('summary-invoice')}
          />
        </div>
      </section>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// Tab 5: Reports
// ══════════════════════════════════════════════════════════

function ReportsTab({
  pricingSummary,
  totalIncome,
  totalExpenses,
  profitLoss,
  expenseTotalByCategory,
  incomeRecords,
  expenseRecords,
  installments,
  paidInstallmentNos,
}: {
  pricingSummary: PricingSummary;
  totalIncome: number;
  totalExpenses: number;
  profitLoss: number;
  expenseTotalByCategory: Record<ExpenseCategory, number>;
  incomeRecords: IncomeRecord[];
  expenseRecords: ExpenseRecord[];
  installments: InstallmentLine[];
  paidInstallmentNos: Set<number>;
}) {
  const marginPercent =
    totalIncome > 0 ? Math.round((profitLoss / totalIncome) * 1000) / 10 : 0;

  const now = new Date();

  // Budget vs Actual
  const estimatedMaterial = pricingSummary.costMaterial;
  const estimatedLabor = pricingSummary.costLabor;
  const actualMaterial = expenseTotalByCategory.material;
  const actualLabor = expenseTotalByCategory.labor;

  // Cash flow: combine income and expense records sorted by date
  const cashFlowEntries = useMemo(() => {
    const entries: { date: string; type: 'in' | 'out'; description: string; amount: number }[] = [];
    for (const r of incomeRecords) {
      entries.push({
        date: r.paymentDate,
        type: 'in',
        description: `รับเงินงวดที่ ${r.installmentNo}`,
        amount: r.amount,
      });
    }
    for (const e of expenseRecords) {
      entries.push({
        date: e.paymentDate,
        type: 'out',
        description: e.description,
        amount: e.amount,
      });
    }
    entries.sort((a, b) => a.date.localeCompare(b.date));
    return entries;
  }, [incomeRecords, expenseRecords]);

  // Aged receivables
  const agedReceivables = useMemo(() => {
    const buckets = { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };
    for (const inst of installments) {
      if (paidInstallmentNos.has(inst.no)) continue;
      // Use a synthetic due date based on installment number (every 30 days from project start)
      const daysOverdue = Math.max(0, (inst.no - 1) * 30);
      if (daysOverdue <= 30) buckets['0-30'] += inst.amount;
      else if (daysOverdue <= 60) buckets['31-60'] += inst.amount;
      else if (daysOverdue <= 90) buckets['61-90'] += inst.amount;
      else buckets['90+'] += inst.amount;
    }
    return buckets;
  }, [installments, paidInstallmentNos]);

  // Aged payables
  const agedPayables = useMemo(() => {
    const buckets = { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };
    for (const exp of expenseRecords) {
      if (exp.status === 'paid') continue;
      const days = daysBetween(exp.paymentDate, now);
      if (days <= 30) buckets['0-30'] += exp.amount;
      else if (days <= 60) buckets['31-60'] += exp.amount;
      else if (days <= 90) buckets['61-90'] += exp.amount;
      else buckets['90+'] += exp.amount;
    }
    return buckets;
  }, [expenseRecords]);

  return (
    <div className="space-y-5">
      {/* Profit/Loss summary */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 bg-blue-50 border-b border-blue-100">
          <h3 className="text-sm font-semibold text-blue-800">กำไร-ขาดทุน (P&L)</h3>
        </div>
        <div className="p-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-600">รายรับรวม</span>
            <span className="font-mono text-emerald-700 font-semibold">{fmt(totalIncome)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">รายจ่ายรวม</span>
            <span className="font-mono text-red-600 font-semibold">-{fmt(totalExpenses)}</span>
          </div>
          <div className="border-t border-slate-200 pt-2 flex justify-between">
            <span className="font-medium text-slate-800">กำไร/ขาดทุนสุทธิ</span>
            <span
              className={`font-mono font-bold text-base ${
                profitLoss >= 0 ? 'text-emerald-700' : 'text-red-700'
              }`}
            >
              {profitLoss >= 0 ? '' : '-'}
              {fmt(Math.abs(profitLoss))}
            </span>
          </div>
          <div className="flex justify-between text-xs text-slate-400">
            <span>Margin</span>
            <span>{marginPercent}%</span>
          </div>
        </div>
      </section>

      {/* Budget vs Actual */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 bg-purple-50 border-b border-purple-100">
          <h3 className="text-sm font-semibold text-purple-800">งบประมาณ vs จริง</h3>
        </div>
        <div className="p-4">
          <div className="space-y-3">
            <BudgetRow label="วัสดุ" estimated={estimatedMaterial} actual={actualMaterial} />
            <BudgetRow label="ค่าแรง" estimated={estimatedLabor} actual={actualLabor} />
            <BudgetRow
              label="ค่าดำเนินงาน"
              estimated={pricingSummary.operating}
              actual={expenseTotalByCategory.operating}
            />
            <div className="border-t border-slate-200 pt-2">
              <BudgetRow
                label="รวม"
                estimated={pricingSummary.costTotal + pricingSummary.operating}
                actual={totalExpenses}
                bold
              />
            </div>
          </div>
        </div>
      </section>

      {/* Cash flow timeline */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-800">กระแสเงินสด (Cash Flow)</h3>
        </div>
        <div className="p-4">
          {cashFlowEntries.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">ยังไม่มีรายการ</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {cashFlowEntries.map((entry, idx) => {
                let runningBalance = 0;
                for (let i = 0; i <= idx; i++) {
                  runningBalance +=
                    cashFlowEntries[i].type === 'in'
                      ? cashFlowEntries[i].amount
                      : -cashFlowEntries[i].amount;
                }
                return (
                  <div
                    key={idx}
                    className="flex items-center gap-3 text-sm"
                  >
                    <span className="text-xs text-slate-400 w-16 shrink-0">
                      {formatDate(entry.date)}
                    </span>
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                        entry.type === 'in' ? 'bg-emerald-100' : 'bg-red-100'
                      }`}
                    >
                      {entry.type === 'in' ? (
                        <Plus className="w-3 h-3 text-emerald-600" />
                      ) : (
                        <Minus className="w-3 h-3 text-red-600" />
                      )}
                    </span>
                    <span className="text-slate-700 truncate flex-1 min-w-0">
                      {entry.description}
                    </span>
                    <span
                      className={`font-mono text-xs shrink-0 ${
                        entry.type === 'in' ? 'text-emerald-700' : 'text-red-600'
                      }`}
                    >
                      {entry.type === 'in' ? '+' : '-'}
                      {fmt(entry.amount)}
                    </span>
                    <span className="font-mono text-xs text-slate-400 w-20 text-right shrink-0">
                      {fmt(runningBalance)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Aged receivables */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 bg-amber-50 border-b border-amber-100">
          <h3 className="text-sm font-semibold text-amber-800">ลูกหนี้ค้างชำระ (Aged Receivables)</h3>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
            {Object.entries(agedReceivables).map(([bucket, amount]) => (
              <div key={bucket} className="bg-slate-50 rounded-lg p-2">
                <p className="text-xs text-slate-500">{bucket} วัน</p>
                <p
                  className={`text-sm font-mono font-semibold mt-0.5 ${
                    amount > 0 ? 'text-amber-700' : 'text-slate-400'
                  }`}
                >
                  {fmt(amount)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Aged payables */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 bg-red-50 border-b border-red-100">
          <h3 className="text-sm font-semibold text-red-800">เจ้าหนี้ค้างจ่าย (Aged Payables)</h3>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
            {Object.entries(agedPayables).map(([bucket, amount]) => (
              <div key={bucket} className="bg-slate-50 rounded-lg p-2">
                <p className="text-xs text-slate-500">{bucket} วัน</p>
                <p
                  className={`text-sm font-mono font-semibold mt-0.5 ${
                    amount > 0 ? 'text-red-700' : 'text-slate-400'
                  }`}
                >
                  {fmt(amount)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// Shared sub-components
// ══════════════════════════════════════════════════════════

function StatCard({
  label,
  value,
  sub,
  icon,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  color: 'blue' | 'emerald' | 'slate' | 'red' | 'amber';
}) {
  const colorMap: Record<string, { border: string; bg: string; icon: string; value: string; sub: string }> = {
    blue: {
      border: 'border-blue-200',
      bg: 'bg-blue-50/50',
      icon: 'text-blue-600',
      value: 'text-blue-900',
      sub: 'text-blue-500',
    },
    emerald: {
      border: 'border-emerald-200',
      bg: 'bg-emerald-50/50',
      icon: 'text-emerald-600',
      value: 'text-emerald-900',
      sub: 'text-emerald-500',
    },
    red: {
      border: 'border-red-200',
      bg: 'bg-red-50/50',
      icon: 'text-red-600',
      value: 'text-red-900',
      sub: 'text-red-500',
    },
    amber: {
      border: 'border-amber-200',
      bg: 'bg-amber-50/50',
      icon: 'text-amber-600',
      value: 'text-amber-900',
      sub: 'text-amber-500',
    },
    slate: {
      border: 'border-slate-200',
      bg: 'bg-white',
      icon: 'text-slate-500',
      value: 'text-slate-800',
      sub: 'text-slate-400',
    },
  };

  const c = colorMap[color] ?? colorMap.slate;

  return (
    <div className={`border ${c.border} ${c.bg} rounded-xl p-3`}>
      <div className="flex items-center gap-1.5 mb-1">
        <span className={c.icon}>{icon}</span>
        <p className="text-xs text-slate-500 truncate">{label}</p>
      </div>
      <p className={`text-lg font-bold font-mono ${c.value} leading-tight`}>{value}</p>
      {sub && <p className={`text-xs ${c.sub} mt-0.5`}>{sub}</p>}
    </div>
  );
}

function Row({
  label,
  value,
  className = '',
}: {
  label: string;
  value: number;
  className?: string;
}) {
  return (
    <div className={`flex justify-between ${className}`}>
      <span>{label}</span>
      <span className="font-mono">
        {value < 0 ? '-' : ''}
        {fmt(Math.abs(value))}
      </span>
    </div>
  );
}

function StatusBadge({ status }: { status: 'paid' | 'pending' }) {
  if (status === 'paid') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
        <CheckCircle2 className="w-3 h-3" />
        รับแล้ว
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700">
      <Clock className="w-3 h-3" />
      รอรับเงิน
    </span>
  );
}

function BudgetRow({
  label,
  estimated,
  actual,
  bold = false,
}: {
  label: string;
  estimated: number;
  actual: number;
  bold?: boolean;
}) {
  const diff = actual - estimated;
  const overBudget = diff > 0;
  const pct = estimated > 0 ? Math.round((actual / estimated) * 100) : 0;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className={bold ? 'font-semibold text-slate-800' : 'text-slate-600'}>{label}</span>
        <div className="flex items-center gap-3 text-xs">
          <span className="text-slate-400">ประมาณการ: {fmt(estimated)}</span>
          <span className={`font-mono font-semibold ${bold ? 'text-slate-800' : 'text-slate-700'}`}>
            จริง: {fmt(actual)}
          </span>
        </div>
      </div>
      {estimated > 0 && (
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-slate-100 rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full transition-all ${
                overBudget ? 'bg-red-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(pct, 100)}%` }}
            />
          </div>
          <span
            className={`text-xs font-mono ${
              overBudget ? 'text-red-600' : 'text-emerald-600'
            }`}
          >
            {pct}%
          </span>
        </div>
      )}
    </div>
  );
}
