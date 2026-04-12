import { useCallback, useMemo, useState } from 'react';
import {
  HardHat,
  Plus,
  Trash2,
  Users,
  User,
  ChevronDown,
  ChevronUp,
  FileText,
  Send,
  CheckCircle2,
  Circle,
  Banknote,
  BarChart3,
  Phone,
} from 'lucide-react';
import type { ProjectData, QuotationItem } from '../../../utils/projectData';
import type { ContractorAssignment, ContractorMode, InstallmentLine, PricingSummary } from '../types';
import { calculateInstallments } from '../types';
import type { ViewableDocument } from '../components/DocumentViewer';
import { InstallmentEditor } from '../components/InstallmentEditor';

// ── Props ──────────────────────────────────────────────

interface ContractorStepProps {
  project: ProjectData;
  pricingSummary: PricingSummary;
  contractorMode: ContractorMode;
  contractors: ContractorAssignment[];
  onModeChange: (mode: ContractorMode) => void;
  onContractorsChange: (contractors: ContractorAssignment[]) => void;
  customerInstallments: InstallmentLine[];
  onViewDoc?: (type: ViewableDocument, installment?: number) => void;
}

// ── Helpers ────────────────────────────────────────────

function formatCurrency(v: number): string {
  return new Intl.NumberFormat('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);
}

/** Get BOQ categories (headers — rows without a dot in `no` and no quantity) */
function getCategories(items: QuotationItem[]) {
  return items
    .filter((i) => !i.no.includes('.') && (i.quantity === '' || i.quantity === undefined))
    .map((i) => ({ key: i.no, label: i.description }));
}

/** Calculate labor cost for selected categories */
function getLaborCostForCategories(items: QuotationItem[], categoryKeys: string[]): number {
  const keySet = new Set(categoryKeys);
  let total = 0;
  for (const item of items) {
    if (item.quantity === '' || item.quantity === undefined) continue;
    const catKey = item.no.split('.')[0];
    if (!keySet.has(catKey)) continue;
    const qty = Number(item.quantity) || 0;
    total += qty * (Number(item.laborCost) || 0);
  }
  return Math.round(total);
}

/** Get labor cost breakdown per category */
function getLaborCostByCategory(
  items: QuotationItem[],
  categoryKeys: string[],
  categories: { key: string; label: string }[],
): { key: string; label: string; laborCost: number; itemCount: number }[] {
  const keySet = new Set(categoryKeys);
  const catMap = new Map<string, string>();
  for (const c of categories) catMap.set(c.key, c.label);

  const breakdown = new Map<string, { laborCost: number; itemCount: number }>();

  for (const item of items) {
    if (item.quantity === '' || item.quantity === undefined) continue;
    const catKey = item.no.split('.')[0];
    if (!keySet.has(catKey)) continue;
    const qty = Number(item.quantity) || 0;
    const labor = qty * (Number(item.laborCost) || 0);
    if (labor <= 0) continue;

    const existing = breakdown.get(catKey) || { laborCost: 0, itemCount: 0 };
    existing.laborCost += labor;
    existing.itemCount += 1;
    breakdown.set(catKey, existing);
  }

  return categoryKeys
    .filter((k) => breakdown.has(k))
    .map((k) => ({
      key: k,
      label: catMap.get(k) || k,
      laborCost: Math.round(breakdown.get(k)!.laborCost),
      itemCount: breakdown.get(k)!.itemCount,
    }));
}

// ── Main Component ─────────────────────────────────────

export function ContractorStep({
  project,
  pricingSummary,
  contractorMode,
  contractors,
  onModeChange,
  onContractorsChange,
  customerInstallments,
  onViewDoc,
}: ContractorStepProps) {
  const categories = useMemo(() => getCategories(project.quotationData), [project.quotationData]);

  // Track which contractor cards are expanded
  const [expandedCards, setExpandedCards] = useState<Set<string>>(() => new Set(contractors.map((c) => c.id)));
  // Track which installments are marked as paid (local state for expense tracking)
  const [paidInstallments, setPaidInstallments] = useState<Map<string, Set<number>>>(() => new Map());
  // Track selected installment for document actions
  const [selectedInstallment, setSelectedInstallment] = useState<Map<string, number>>(() => new Map());

  const totalAssignedLabor = useMemo(
    () => contractors.reduce((sum, c) => sum + c.laborCost, 0),
    [contractors],
  );
  const unassignedLabor = pricingSummary.costLabor - totalAssignedLabor;
  const assignmentPercent = pricingSummary.costLabor > 0
    ? Math.min(100, Math.round((totalAssignedLabor / pricingSummary.costLabor) * 100))
    : 0;

  // ── Card expand toggle ───────────────────────────────

  const toggleCard = useCallback((id: string) => {
    setExpandedCards((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // ── Paid installment toggle ──────────────────────────

  const togglePaid = useCallback((contractorId: string, installmentNo: number) => {
    setPaidInstallments((prev) => {
      const next = new Map(prev);
      const set = new Set(next.get(contractorId) || []);
      if (set.has(installmentNo)) set.delete(installmentNo);
      else set.add(installmentNo);
      next.set(contractorId, set);
      return next;
    });
  }, []);

  const getPaidSet = useCallback(
    (contractorId: string): Set<number> => paidInstallments.get(contractorId) || new Set(),
    [paidInstallments],
  );

  const getSelectedInstallment = useCallback(
    (contractorId: string): number => selectedInstallment.get(contractorId) || 1,
    [selectedInstallment],
  );

  const setContractorInstallment = useCallback((contractorId: string, no: number) => {
    setSelectedInstallment((prev) => {
      const next = new Map(prev);
      next.set(contractorId, no);
      return next;
    });
  }, []);

  // ── Handlers ─────────────────────────────────────────

  const handleModeSwitch = useCallback((mode: ContractorMode) => {
    onModeChange(mode);
    if (mode === 'single' && contractors.length !== 1) {
      const allKeys = categories.map((c) => c.key);
      const laborCost = getLaborCostForCategories(project.quotationData, allKeys);
      const defaultInstallments = calculateInstallments(
        laborCost,
        customerInstallments.map((i) => ({ no: i.no, label: i.label, percent: i.percent })),
      );
      const newId = `contractor-${Date.now()}`;
      onContractorsChange([{
        id: newId,
        name: '',
        assignedCategories: allKeys,
        laborCost,
        installments: defaultInstallments,
      }]);
      setExpandedCards(new Set([newId]));
    }
  }, [categories, contractors.length, customerInstallments, project.quotationData, onContractorsChange, onModeChange]);

  const handleAddContractor = useCallback(() => {
    const newId = `contractor-${Date.now()}`;
    onContractorsChange([
      ...contractors,
      { id: newId, name: '', assignedCategories: [], laborCost: 0, installments: [] },
    ]);
    setExpandedCards((prev) => new Set([...prev, newId]));
  }, [contractors, onContractorsChange]);

  const handleRemoveContractor = useCallback((id: string) => {
    onContractorsChange(contractors.filter((c) => c.id !== id));
    setExpandedCards((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, [contractors, onContractorsChange]);

  const handleUpdateContractor = useCallback((id: string, updates: Partial<ContractorAssignment>) => {
    onContractorsChange(contractors.map((c) => {
      if (c.id !== id) return c;
      const updated = { ...c, ...updates };

      // Recalculate labor cost if categories changed
      if (updates.assignedCategories) {
        updated.laborCost = getLaborCostForCategories(project.quotationData, updated.assignedCategories);
        updated.installments = calculateInstallments(
          updated.laborCost,
          customerInstallments.map((i) => ({ no: i.no, label: i.label, percent: i.percent })),
        );
      }

      return updated;
    }));
  }, [contractors, customerInstallments, project.quotationData, onContractorsChange]);

  const handleToggleCategory = useCallback((contractorId: string, categoryKey: string) => {
    const contractor = contractors.find((c) => c.id === contractorId);
    if (!contractor) return;

    const current = contractor.assignedCategories;
    const next = current.includes(categoryKey)
      ? current.filter((k) => k !== categoryKey)
      : [...current, categoryKey];

    handleUpdateContractor(contractorId, { assignedCategories: next });
  }, [contractors, handleUpdateContractor]);

  // Which categories are already assigned to other contractors
  const assignedCategoriesMap = useMemo(() => {
    const map = new Map<string, string>(); // categoryKey -> contractorId
    for (const c of contractors) {
      for (const cat of c.assignedCategories) {
        map.set(cat, c.id);
      }
    }
    return map;
  }, [contractors]);

  // ── Render ───────────────────────────────────────────

  return (
    <div className="space-y-5">
      <h2 className="text-base font-semibold text-slate-800">จัดการช่าง — {project.name}</h2>

      {/* ── Mode selector ──────────────────────────── */}
      <div className="flex gap-3">
        <button
          onClick={() => handleModeSwitch('single')}
          className={`
            flex-1 flex items-center gap-3 p-4 rounded-xl border-2 transition-all
            ${contractorMode === 'single'
              ? 'border-blue-500 bg-blue-50'
              : 'border-slate-200 bg-white hover:border-slate-300'
            }
          `}
        >
          <User className={`w-6 h-6 shrink-0 ${contractorMode === 'single' ? 'text-blue-600' : 'text-slate-400'}`} />
          <div className="text-left">
            <p className="text-sm font-semibold text-slate-800">เหมารวม</p>
            <p className="text-xs text-slate-500">ผู้รับเหมาคนเดียว</p>
          </div>
        </button>
        <button
          onClick={() => handleModeSwitch('multiple')}
          className={`
            flex-1 flex items-center gap-3 p-4 rounded-xl border-2 transition-all
            ${contractorMode === 'multiple'
              ? 'border-blue-500 bg-blue-50'
              : 'border-slate-200 bg-white hover:border-slate-300'
            }
          `}
        >
          <Users className={`w-6 h-6 shrink-0 ${contractorMode === 'multiple' ? 'text-blue-600' : 'text-slate-400'}`} />
          <div className="text-left">
            <p className="text-sm font-semibold text-slate-800">แยกช่าง</p>
            <p className="text-xs text-slate-500">หลายทีม (ช่างไฟ, ช่างเหล็ก, ...)</p>
          </div>
        </button>
      </div>

      {/* ── Assignment Progress Bar ────────────────── */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">ความคืบหน้าการมอบหมาย</span>
          </div>
          <span className="text-xs font-mono text-slate-500">{assignmentPercent}%</span>
        </div>
        <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              assignmentPercent >= 100
                ? 'bg-emerald-500'
                : assignmentPercent > 0
                  ? 'bg-blue-500'
                  : 'bg-slate-200'
            }`}
            style={{ width: `${assignmentPercent}%` }}
          />
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-slate-500">
            มอบหมายแล้ว: <span className="font-mono font-medium text-blue-700">{formatCurrency(totalAssignedLabor)}</span>
          </span>
          {unassignedLabor > 0 ? (
            <span className="text-amber-600">
              ยังไม่มอบหมาย: <span className="font-mono font-medium">{formatCurrency(unassignedLabor)}</span>
            </span>
          ) : unassignedLabor < 0 ? (
            <span className="text-red-600">
              เกินงบ: <span className="font-mono font-medium">{formatCurrency(Math.abs(unassignedLabor))}</span>
            </span>
          ) : (
            <span className="text-emerald-600 font-medium">มอบหมายครบแล้ว</span>
          )}
        </div>
      </div>

      {/* ── Contractor Cards ───────────────────────── */}
      <div className="space-y-4">
        {contractors.map((contractor, idx) => {
          const isExpanded = expandedCards.has(contractor.id);
          const paidSet = getPaidSet(contractor.id);
          const totalPaid = contractor.installments
            .filter((inst) => paidSet.has(inst.no))
            .reduce((sum, inst) => sum + inst.amount, 0);
          const costBreakdown = getLaborCostByCategory(
            project.quotationData,
            contractor.assignedCategories,
            categories,
          );
          const currentInstallment = getSelectedInstallment(contractor.id);

          return (
            <div key={contractor.id} className="border border-slate-200 rounded-xl bg-white overflow-hidden shadow-sm">
              {/* ── Contractor header ──────────────────── */}
              <div
                className="px-4 py-3 bg-slate-50 flex items-center gap-3 cursor-pointer"
                onClick={() => toggleCard(contractor.id)}
              >
                <HardHat className="w-5 h-5 text-slate-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-800 truncate">
                      {contractor.name || (contractorMode === 'single' ? 'ผู้รับเหมา (ยังไม่ระบุชื่อ)' : `ช่าง #${idx + 1}`)}
                    </span>
                    {contractor.laborCost > 0 && (
                      <span className="text-xs font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full whitespace-nowrap">
                        {formatCurrency(contractor.laborCost)} บ.
                      </span>
                    )}
                  </div>
                  {contractor.assignedCategories.length > 0 && (
                    <p className="text-xs text-slate-400 truncate mt-0.5">
                      {contractor.assignedCategories.length} หมวด — {contractor.assignedCategories.join(', ')}
                    </p>
                  )}
                </div>
                {contractorMode === 'multiple' && contractors.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveContractor(contractor.id);
                    }}
                    className="text-slate-300 hover:text-red-500 transition-colors shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                {isExpanded
                  ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                  : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                }
              </div>

              {/* ── Expanded content ───────────────────── */}
              {isExpanded && (
                <>
                  {/* Name & Phone inputs */}
                  <div className="px-4 py-3 border-t border-slate-100 flex flex-col sm:flex-row gap-2">
                    <div className="flex-1">
                      <label className="text-xs text-slate-500 mb-1 block">ชื่อผู้รับเหมา / ทีม</label>
                      <input
                        type="text"
                        value={contractor.name}
                        onChange={(e) => handleUpdateContractor(contractor.id, { name: e.target.value })}
                        placeholder={contractorMode === 'single' ? 'ชื่อผู้รับเหมา / ทีมช่าง' : `ช่าง #${idx + 1} — ชื่อทีม`}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 focus:outline-none"
                      />
                    </div>
                    <div className="w-full sm:w-40">
                      <label className="text-xs text-slate-500 mb-1 block">
                        <Phone className="w-3 h-3 inline mr-1" />
                        เบอร์โทร
                      </label>
                      <input
                        type="tel"
                        value={contractor.phone || ''}
                        onChange={(e) => handleUpdateContractor(contractor.id, { phone: e.target.value })}
                        placeholder="0xx-xxx-xxxx"
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-600 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Category checkboxes */}
                  <div className="px-4 py-3 border-t border-slate-100">
                    <p className="text-xs font-medium text-slate-500 mb-2">หมวดงานที่รับผิดชอบ:</p>
                    <div className="flex flex-wrap gap-2">
                      {categories.map((cat) => {
                        const isAssigned = contractor.assignedCategories.includes(cat.key);
                        const assignedToOther = assignedCategoriesMap.get(cat.key);
                        const isDisabled = contractorMode === 'single'
                          ? false
                          : assignedToOther !== undefined && assignedToOther !== contractor.id;

                        return (
                          <label
                            key={cat.key}
                            className={`
                              flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border cursor-pointer transition-all select-none
                              ${isAssigned
                                ? 'bg-blue-50 border-blue-300 text-blue-700'
                                : isDisabled
                                  ? 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed'
                                  : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                              }
                            `}
                          >
                            <input
                              type="checkbox"
                              checked={isAssigned}
                              disabled={isDisabled || contractorMode === 'single'}
                              onChange={() => handleToggleCategory(contractor.id, cat.key)}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3 h-3"
                            />
                            <span>{cat.key}. {cat.label}</span>
                          </label>
                        );
                      })}
                    </div>
                    {contractorMode === 'single' && (
                      <p className="text-xs text-slate-400 mt-2 italic">* เหมารวม: มอบหมายทุกหมวดอัตโนมัติ</p>
                    )}
                  </div>

                  {/* ── Cost Breakdown per Category ────────── */}
                  {costBreakdown.length > 0 && (
                    <div className="px-4 py-3 border-t border-slate-100">
                      <p className="text-xs font-medium text-slate-500 mb-2">ค่าแรงแยกตามหมวด:</p>
                      <div className="space-y-1.5">
                        {costBreakdown.map((cat) => {
                          const pct = contractor.laborCost > 0
                            ? Math.round((cat.laborCost / contractor.laborCost) * 100)
                            : 0;
                          return (
                            <div key={cat.key} className="flex items-center gap-2">
                              <span className="text-xs text-slate-600 w-6 text-right font-mono">{cat.key}.</span>
                              <span className="text-xs text-slate-700 flex-1 truncate">{cat.label}</span>
                              <span className="text-xs text-slate-400">{cat.itemCount} รายการ</span>
                              <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-blue-400 rounded-full"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="text-xs font-mono font-medium text-slate-700 w-24 text-right">
                                {formatCurrency(cat.laborCost)}
                              </span>
                            </div>
                          );
                        })}
                        <div className="flex items-center gap-2 pt-1.5 border-t border-dashed border-slate-200">
                          <span className="text-xs font-semibold text-slate-700 flex-1">รวมค่าแรง</span>
                          <span className="text-sm font-mono font-semibold text-slate-800">
                            {formatCurrency(contractor.laborCost)} บาท
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── Installment Schedule ──────────────── */}
                  {contractor.laborCost > 0 && (
                    <div className="px-4 py-3 border-t border-slate-100 space-y-3">
                      <InstallmentEditor
                        total={contractor.laborCost}
                        installments={contractor.installments}
                        onChange={(installments) => handleUpdateContractor(contractor.id, { installments })}
                        label="บิลช่าง แบ่งงวด"
                      />
                    </div>
                  )}

                  {/* ── Expense Tracking (จ่ายจริง) ────────── */}
                  {contractor.installments.length > 0 && contractor.laborCost > 0 && (
                    <div className="px-4 py-3 border-t border-slate-100">
                      <div className="flex items-center gap-2 mb-3">
                        <Banknote className="w-4 h-4 text-slate-400" />
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          การจ่ายเงินช่าง
                        </p>
                        <span className="ml-auto text-xs text-slate-400">
                          จ่ายแล้ว {formatCurrency(totalPaid)} / {formatCurrency(contractor.laborCost)}
                        </span>
                      </div>
                      {/* Payment progress */}
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-3">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            totalPaid >= contractor.laborCost ? 'bg-emerald-500' : 'bg-amber-400'
                          }`}
                          style={{ width: `${contractor.laborCost > 0 ? Math.min(100, Math.round((totalPaid / contractor.laborCost) * 100)) : 0}%` }}
                        />
                      </div>
                      <div className="space-y-2">
                        {contractor.installments.map((inst) => {
                          const isPaid = paidSet.has(inst.no);
                          return (
                            <div
                              key={inst.no}
                              className={`flex items-center gap-3 px-3 py-2 rounded-lg border transition-all ${
                                isPaid
                                  ? 'bg-emerald-50 border-emerald-200'
                                  : 'bg-white border-slate-200'
                              }`}
                            >
                              <button
                                onClick={() => togglePaid(contractor.id, inst.no)}
                                className={`shrink-0 transition-colors ${
                                  isPaid ? 'text-emerald-500' : 'text-slate-300 hover:text-slate-400'
                                }`}
                                title={isPaid ? 'ยกเลิกการจ่าย' : 'ทำเครื่องหมายจ่ายแล้ว'}
                              >
                                {isPaid
                                  ? <CheckCircle2 className="w-5 h-5" />
                                  : <Circle className="w-5 h-5" />
                                }
                              </button>
                              <div className="flex-1 min-w-0">
                                <span className={`text-sm ${isPaid ? 'text-emerald-700 line-through' : 'text-slate-700'}`}>
                                  งวดที่ {inst.no}: {inst.label}
                                </span>
                              </div>
                              <span className={`text-sm font-mono whitespace-nowrap ${
                                isPaid ? 'text-emerald-600' : 'text-slate-700'
                              }`}>
                                {formatCurrency(inst.amount)} บ.
                              </span>
                              <span className="text-xs text-slate-400 w-10 text-right">{inst.percent}%</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* ── Document Actions ──────────────────── */}
                  {contractor.laborCost > 0 && (
                    <div className="px-4 py-3 bg-slate-50/70 border-t border-slate-100 space-y-3">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">เอกสาร</p>

                      {/* Installment selector for per-installment docs */}
                      {contractor.installments.length > 0 && (
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-slate-500">เลือกงวด:</span>
                          {contractor.installments.map((inst) => (
                            <button
                              key={inst.no}
                              onClick={() => setContractorInstallment(contractor.id, inst.no)}
                              className={`
                                px-2.5 py-1 rounded-md text-xs font-medium border transition-all
                                ${currentInstallment === inst.no
                                  ? 'bg-blue-600 text-white border-blue-600'
                                  : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
                                }
                              `}
                            >
                              งวด {inst.no}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="flex flex-wrap gap-2">
                        {/* View contract */}
                        <button
                          onClick={() => onViewDoc?.('contract')}
                          disabled={!contractor.name}
                          className={`
                            inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-all
                            ${contractor.name
                              ? 'bg-white border-slate-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300'
                              : 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed'
                            }
                          `}
                          title={!contractor.name ? 'กรุณากรอกชื่อผู้รับเหมาก่อน' : ''}
                        >
                          <FileText className="w-3.5 h-3.5" />
                          ดูสัญญาช่าง
                        </button>

                        {/* View contractor invoice */}
                        <button
                          onClick={() => onViewDoc?.('contractor-invoice', currentInstallment)}
                          disabled={!contractor.name || contractor.installments.length === 0}
                          className={`
                            inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-all
                            ${contractor.name && contractor.installments.length > 0
                              ? 'bg-white border-slate-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300'
                              : 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed'
                            }
                          `}
                          title={!contractor.name ? 'กรุณากรอกชื่อผู้รับเหมาก่อน' : ''}
                        >
                          <FileText className="w-3.5 h-3.5" />
                          ดูบิลงวดช่าง {contractor.installments.length > 0 ? `(งวด ${currentInstallment})` : ''}
                        </button>

                        {/* Send LINE */}
                        <button
                          onClick={() => onViewDoc?.('contractor-invoice', currentInstallment)}
                          disabled={!contractor.name || contractor.installments.length === 0}
                          className={`
                            inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-all
                            ${contractor.name && contractor.installments.length > 0
                              ? 'bg-white border-green-200 text-green-600 hover:bg-green-50 hover:border-green-300'
                              : 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed'
                            }
                          `}
                          title={!contractor.name ? 'กรุณากรอกชื่อผู้รับเหมาก่อน' : ''}
                        >
                          <Send className="w-3.5 h-3.5" />
                          ส่ง LINE {contractor.installments.length > 0 ? `(งวด ${currentInstallment})` : ''}
                        </button>
                      </div>

                      {!contractor.name && (
                        <p className="text-xs text-amber-500 bg-amber-50 px-3 py-1.5 rounded-lg">
                          กรุณากรอกชื่อผู้รับเหมาเพื่อสร้างเอกสาร
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Add contractor button ──────────────────── */}
      {contractorMode === 'multiple' && (
        <button
          onClick={handleAddContractor}
          className="flex items-center gap-2 w-full justify-center px-4 py-3 border-2 border-dashed border-slate-200 rounded-xl text-sm text-blue-600 hover:text-blue-800 hover:border-blue-300 font-medium transition-all"
        >
          <Plus className="w-4 h-4" />
          เพิ่มช่าง
        </button>
      )}

      {/* ── Summary ────────────────────────────────── */}
      <div className="bg-slate-50 rounded-xl p-4 space-y-3">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">สรุปค่าแรง</h3>
        <div className="flex justify-between text-sm">
          <span className="text-slate-600">งบค่าแรงรวม (จาก BOQ)</span>
          <span className="font-mono font-medium text-slate-800">{formatCurrency(pricingSummary.costLabor)} บาท</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-600">มอบหมายแล้ว ({contractors.length} ทีม)</span>
          <span className="font-mono font-medium text-blue-700">{formatCurrency(totalAssignedLabor)} บาท</span>
        </div>
        {unassignedLabor > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-amber-600">ยังไม่ได้มอบหมาย</span>
            <span className="font-mono font-medium text-amber-600">{formatCurrency(unassignedLabor)} บาท</span>
          </div>
        )}
        {unassignedLabor < 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-red-600">เกินงบค่าแรง</span>
            <span className="font-mono font-medium text-red-600">{formatCurrency(Math.abs(unassignedLabor))} บาท</span>
          </div>
        )}
        {unassignedLabor === 0 && totalAssignedLabor > 0 && (
          <div className="flex items-center gap-2 text-sm text-emerald-600">
            <CheckCircle2 className="w-4 h-4" />
            <span className="font-medium">มอบหมายค่าแรงครบถ้วน</span>
          </div>
        )}

        {/* Per-contractor paid summary */}
        {contractors.some((c) => (paidInstallments.get(c.id)?.size || 0) > 0) && (
          <>
            <div className="border-t border-slate-200 pt-3">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">สรุปการจ่ายเงินช่าง</h4>
              {contractors.map((c) => {
                const paid = c.installments
                  .filter((inst) => getPaidSet(c.id).has(inst.no))
                  .reduce((sum, inst) => sum + inst.amount, 0);
                if (paid === 0) return null;
                return (
                  <div key={c.id} className="flex justify-between text-sm mb-1">
                    <span className="text-slate-600">{c.name || `ช่าง (${c.id.slice(-4)})`}</span>
                    <span className="font-mono text-emerald-600">{formatCurrency(paid)} บาท</span>
                  </div>
                );
              })}
              <div className="flex justify-between text-sm font-medium border-t border-dashed border-slate-200 pt-1 mt-1">
                <span className="text-slate-700">จ่ายแล้วทั้งหมด</span>
                <span className="font-mono text-emerald-700">
                  {formatCurrency(
                    contractors.reduce(
                      (sum, c) => sum + c.installments
                        .filter((inst) => getPaidSet(c.id).has(inst.no))
                        .reduce((s, inst) => s + inst.amount, 0),
                      0,
                    ),
                  )} บาท
                </span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
