import { useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  FileDown,
  ShoppingCart,
  Clock,
  Package,
  CheckCircle2,
  Circle,
  Send,
  Table2,
  Wrench,
} from 'lucide-react';
import type { ProjectData } from '../../../utils/projectData';
import type { MaterialCategory } from '../types';
import type { ViewableDocument } from '../components/DocumentViewer';

interface ProcurementStepProps {
  project: ProjectData;
  materialCategories: MaterialCategory[];
  onViewDoc?: (type: ViewableDocument) => void;
}

type POStatus = 'pending' | 'draft' | 'created' | 'sent';
type BoqWorkspaceTab = 'boq' | 'procurement';

function formatCurrency(v: number): string {
  return new Intl.NumberFormat('th-TH', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(v);
}

const CATEGORY_ICONS: Record<string, string> = {
  A: '📐', B: '🏗️', C: '🧱', D: '⚡', E: '💧', F: '🪟',
  G: '🎨', H: '🔩', I: '🪵', J: '🏠', K: '🛠️', L: '📦',
};

const STATUS_CONFIG: Record<POStatus, { label: string; color: string; bg: string; icon: typeof Circle }> = {
  pending: { label: 'รอสร้าง', color: 'text-slate-400', bg: 'bg-slate-100', icon: Circle },
  draft: { label: 'แบบร่าง', color: 'text-amber-600', bg: 'bg-amber-50', icon: Clock },
  created: { label: 'สร้างแล้ว', color: 'text-blue-600', bg: 'bg-blue-50', icon: CheckCircle2 },
  sent: { label: 'ส่งแล้ว', color: 'text-green-600', bg: 'bg-green-50', icon: Send },
};

// ── Category Expanded Content ───────────────────────────────

function CategoryContent({
  cat,
  status,
  onCreatePO,
  onViewDoc,
}: {
  cat: MaterialCategory;
  status: POStatus;
  onCreatePO: () => void;
  onViewDoc?: (type: ViewableDocument) => void;
}) {
  const purchasableItems = cat.items.filter((i) => i.unitPrice > 0);
  const laborItems = cat.items.filter((i) => i.unitPrice === 0 && i.laborCost > 0);

  return (
    <div className="border-t border-slate-100">
      {/* ── Section: วัสดุที่ต้องซื้อ ── */}
      {purchasableItems.length > 0 && (
        <div>
          <div className="px-4 py-2 bg-blue-50/60 border-b border-blue-100/80">
            <div className="flex items-center gap-1.5">
              <ShoppingCart className="w-3.5 h-3.5 text-blue-600" />
              <span className="text-xs font-semibold text-blue-700">วัสดุที่ต้องซื้อ</span>
              <span className="text-[10px] text-blue-500 ml-1">({purchasableItems.length} รายการ)</span>
            </div>
          </div>

          {/* Mobile view */}
          <div className="sm:hidden divide-y divide-slate-50">
            {purchasableItems.map((item) => (
              <div key={item.boqNo} className="px-4 py-2.5 space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-[10px] text-slate-400 font-mono mr-1">{item.boqNo}</span>
                    <span className="text-sm text-slate-700">{item.description}</span>
                  </div>
                  <span className="text-sm font-mono font-medium text-slate-800 whitespace-nowrap">
                    {formatCurrency(item.materialOnly)}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span>{item.quantity} {item.unit}</span>
                  <span>@ {formatCurrency(item.unitPrice)}</span>
                  {item.laborCost > 0 && (
                    <span className="text-slate-400">+ ค่าแรง {formatCurrency(item.laborCost)}</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Desktop view */}
          <table className="hidden sm:table w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-xs text-slate-500">
                <th className="px-4 py-1.5 text-left">รายการ</th>
                <th className="px-3 py-1.5 text-center w-20">จำนวน</th>
                <th className="px-3 py-1.5 text-center w-16">หน่วย</th>
                <th className="px-3 py-1.5 text-right w-24">ราคาวัสดุ/หน่วย</th>
                <th className="px-3 py-1.5 text-right w-28">รวมวัสดุ</th>
              </tr>
            </thead>
            <tbody>
              {purchasableItems.map((item) => (
                <tr key={item.boqNo} className="border-t border-slate-50 hover:bg-slate-50/30">
                  <td className="px-4 py-2 text-slate-700">
                    <span className="text-xs text-slate-400 mr-1.5">{item.boqNo}</span>
                    {item.description}
                  </td>
                  <td className="px-3 py-2 text-center font-mono text-slate-700">{item.quantity}</td>
                  <td className="px-3 py-2 text-center text-slate-500">{item.unit}</td>
                  <td className="px-3 py-2 text-right font-mono text-slate-600">{formatCurrency(item.unitPrice)}</td>
                  <td className="px-4 py-2 text-right font-mono font-medium text-slate-800">{formatCurrency(item.materialOnly)}</td>
                </tr>
              ))}
            </tbody>
          </table>

        </div>
      )}

      {/* ── Section: ค่าแรง ── */}
      {laborItems.length > 0 && (
        <div>
          <div className="px-4 py-2 bg-slate-50/80 border-y border-slate-100">
            <div className="flex items-center gap-1.5">
              <Wrench className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs font-semibold text-slate-500">ค่าแรง</span>
              <span className="text-[10px] text-slate-400 ml-1">({laborItems.length} รายการ)</span>
              <span className="ml-2 text-[10px] bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded">ไม่ต้องจัดซื้อ</span>
            </div>
          </div>

          {/* Mobile view */}
          <div className="sm:hidden divide-y divide-slate-50 opacity-60">
            {laborItems.map((item) => (
              <div key={item.boqNo} className="px-4 py-2.5 space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-[10px] text-slate-400 font-mono mr-1">{item.boqNo}</span>
                    <span className="text-sm text-slate-500">{item.description}</span>
                  </div>
                  <span className="text-sm font-mono text-slate-400 whitespace-nowrap">
                    {formatCurrency(Math.round(item.quantity * item.laborCost))}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <span>{item.quantity} {item.unit}</span>
                  <span>ค่าแรง @ {formatCurrency(item.laborCost)}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop view */}
          <table className="hidden sm:table w-full text-sm opacity-60">
            <tbody>
              {laborItems.map((item) => (
                <tr key={item.boqNo} className="border-t border-slate-50">
                  <td className="px-4 py-2 text-slate-500">
                    <span className="text-xs text-slate-400 mr-1.5">{item.boqNo}</span>
                    {item.description}
                  </td>
                  <td className="px-3 py-2 text-center font-mono text-slate-400 w-20">{item.quantity}</td>
                  <td className="px-3 py-2 text-center text-slate-400 w-16">{item.unit}</td>
                  <td className="px-3 py-2 text-right font-mono text-slate-400 w-24">ค่าแรง {formatCurrency(item.laborCost)}</td>
                  <td className="px-4 py-2 text-right font-mono text-slate-400 w-28">
                    {formatCurrency(Math.round(item.quantity * item.laborCost))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Summary footer ── */}
      <div className="px-4 py-2 bg-slate-50/80 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
        <span className="text-xs text-slate-500">รวมหมวด {cat.label}</span>
        <div className="flex items-center gap-3">
          {cat.laborTotal > 0 && (
            <span className="text-xs text-slate-400 font-mono">
              ค่าแรง {formatCurrency(cat.laborTotal)}
            </span>
          )}
          <span className="text-sm font-semibold font-mono text-slate-800">
            วัสดุ {formatCurrency(cat.totalCost)} บาท
          </span>
        </div>
      </div>

      {/* ── PO actions ── */}
      <div className="px-4 py-2.5 bg-white border-t border-slate-100 flex flex-wrap items-center gap-2">
        {purchasableItems.length > 0 && (status === 'pending' || status === 'draft') ? (
          <button
            onClick={onCreatePO}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors"
          >
            <FileDown className="w-3.5 h-3.5" />
            สร้าง PO หมวด{cat.label}
          </button>
        ) : purchasableItems.length > 0 ? (
          <button
            onClick={() => onViewDoc?.('purchase-order')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-blue-200 text-blue-600 text-xs font-medium rounded-lg hover:bg-blue-50 transition-colors"
          >
            <FileDown className="w-3.5 h-3.5" />
            ดู PO หมวด{cat.label}
          </button>
        ) : (
          <span className="text-xs text-slate-400 italic">ไม่มีรายการสั่งซื้อ (ค่าแรงอย่างเดียว)</span>
        )}

        <button
          disabled
          className="inline-flex items-center gap-1 text-xs text-slate-300 font-medium ml-auto cursor-not-allowed"
          title="เร็วๆ นี้ — รอร้านค้าเข้าร่วม"
        >
          <ShoppingCart className="w-3.5 h-3.5" />
          ส่งขอราคาร้านค้า
          <span className="px-1.5 py-0.5 bg-slate-100 text-slate-400 rounded text-[10px]">เร็วๆ นี้</span>
        </button>
      </div>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────

export function ProcurementStep({ project, materialCategories, onViewDoc }: ProcurementStepProps) {
  const [workspaceTab, setWorkspaceTab] = useState<BoqWorkspaceTab>('procurement');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(() => new Set(materialCategories.slice(0, 1).map((cat) => cat.key)));
  const [poStatuses, setPoStatuses] = useState<Record<string, POStatus>>(() => {
    const initial: Record<string, POStatus> = {};
    for (const cat of materialCategories) {
      initial[cat.key] = 'pending';
    }
    return initial;
  });

  const boqRows = useMemo(
    () => project.quotationData.filter((item) => item.quantity !== '' && item.quantity !== undefined),
    [project.quotationData],
  );

  const sortedCategories = useMemo(
    () => [...materialCategories].sort((left, right) => right.totalCost - left.totalCost),
    [materialCategories],
  );

  const toggleCategory = (key: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleCreatePO = (categoryKey: string) => {
    setPoStatuses((prev) => ({ ...prev, [categoryKey]: 'created' }));
    onViewDoc?.('purchase-order');
  };

  const handleCreateAllPO = () => {
    setPoStatuses((prev) => {
      const next = { ...prev };
      for (const key of Object.keys(next)) {
        if (next[key] === 'pending' || next[key] === 'draft') {
          next[key] = 'created';
        }
      }
      return next;
    });
    onViewDoc?.('purchase-order');
  };

  const totalMaterialCost = useMemo(() => sortedCategories.reduce((sum, cat) => sum + cat.totalCost, 0), [sortedCategories]);
  const totalLaborCost = useMemo(() => sortedCategories.reduce((sum, cat) => sum + cat.laborTotal, 0), [sortedCategories]);
  const purchasableItemCount = sortedCategories.reduce(
    (sum, cat) => sum + cat.items.filter((i) => i.unitPrice > 0).length, 0,
  );
  const createdCount = Object.values(poStatuses).filter((s) => s === 'created' || s === 'sent').length;
  const pendingCount = sortedCategories.length - createdCount;

  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <div className="space-y-1">
        <h2 className="text-base font-semibold text-slate-800">
          {workspaceTab === 'procurement' ? 'จัดซื้อวัสดุ' : 'BOQ รายการงาน'} — {project.name}
        </h2>
        <p className="text-xs text-slate-500">
          {boqRows.length} รายการ BOQ · {sortedCategories.length} หมวดจัดซื้อ · {purchasableItemCount} รายการวัสดุ
        </p>
      </div>

      {/* ── Tab Switcher ── */}
      <div className="sticky top-[72px] z-10 rounded-xl border border-slate-200 bg-white/95 p-1 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        <div className="grid grid-cols-2 gap-1">
          <button
            onClick={() => setWorkspaceTab('boq')}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              workspaceTab === 'boq' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            BOQ รายการงาน
          </button>
          <button
            onClick={() => setWorkspaceTab('procurement')}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              workspaceTab === 'procurement' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            จัดซื้อ
          </button>
        </div>
      </div>

      {workspaceTab === 'boq' ? (
        /* ── BOQ Table Tab ── */
        <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Table2 className="h-4 w-4 text-slate-500" />
              <p className="text-sm font-semibold text-slate-700">BOQ รายการงาน</p>
            </div>
            <button
              onClick={() => setWorkspaceTab('procurement')}
              className="text-xs font-medium text-blue-600 hover:text-blue-700"
            >
              ไปแท็บจัดซื้อ →
            </button>
          </div>

          <div className="overflow-auto rounded-lg border border-slate-100">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="px-3 py-2 text-left">รหัส</th>
                  <th className="px-3 py-2 text-left">รายละเอียด</th>
                  <th className="px-3 py-2 text-right">จำนวน</th>
                  <th className="px-3 py-2 text-left">หน่วย</th>
                  <th className="px-3 py-2 text-right">ราคา/หน่วย</th>
                </tr>
              </thead>
              <tbody>
                {boqRows.map((row) => (
                  <tr key={row.no} className="border-t border-slate-100">
                    <td className="px-3 py-2 font-mono text-xs text-slate-500">{row.no}</td>
                    <td className="px-3 py-2 text-slate-700">{row.description}</td>
                    <td className="px-3 py-2 text-right font-mono text-slate-700">{row.quantity}</td>
                    <td className="px-3 py-2 text-slate-500">{row.unit}</td>
                    <td className="px-3 py-2 text-right font-mono text-slate-700">{formatCurrency(Number(row.unitPrice) || 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ── Procurement Tab ── */
        <>
          {project.address && project.address !== '-' && (
            <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 px-3 py-2 rounded-lg">
              <span>📍</span>
              <span>หน้างาน: {project.address}</span>
            </div>
          )}

          {/* ── Category Cards ── */}
          <div className="space-y-3">
            {sortedCategories.map((cat) => {
              const isExpanded = expandedCategories.has(cat.key);
              const icon = CATEGORY_ICONS[cat.key] || '📦';
              const status = poStatuses[cat.key] || 'pending';
              const statusCfg = STATUS_CONFIG[status];
              const StatusIcon = statusCfg.icon;

              return (
                <div
                  key={cat.key}
                  className="border border-slate-200 rounded-xl bg-white overflow-hidden"
                >
                  {/* ── Category Header ── */}
                  <button
                    onClick={() => toggleCategory(cat.key)}
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50/50 transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                      )}
                      <span className="text-base shrink-0">{icon}</span>
                      <div className="flex flex-col items-start min-w-0 sm:flex-row sm:items-center sm:gap-2">
                        <span className="text-sm font-semibold text-slate-800 truncate">
                          {cat.label}
                        </span>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full whitespace-nowrap">
                            {cat.items.length} รายการ
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${statusCfg.bg} ${statusCfg.color}`}
                          >
                            <StatusIcon className="w-3 h-3" />
                            {statusCfg.label}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-0.5 ml-2 shrink-0">
                      <span className="text-sm font-semibold text-slate-700 font-mono whitespace-nowrap">
                        วัสดุ ฿{formatCurrency(cat.totalCost)}
                      </span>
                      {cat.laborTotal > 0 && (
                        <span className="text-[11px] text-slate-400 font-mono whitespace-nowrap">
                          ค่าแรง ฿{formatCurrency(cat.laborTotal)}
                        </span>
                      )}
                    </div>
                  </button>

                  {/* ── Expanded Content ── */}
                  {isExpanded && (
                    <CategoryContent
                      cat={cat}
                      status={status}
                      onCreatePO={() => handleCreatePO(cat.key)}
                      onViewDoc={onViewDoc}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* ── Summary ── */}
          <div className="border border-slate-200 rounded-xl bg-slate-50 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-slate-500" />
              <span className="text-sm font-semibold text-slate-700">สรุปการจัดซื้อ</span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="space-y-0.5">
                <p className="text-xs text-slate-500">ต้นทุนวัสดุรวม</p>
                <p className="font-semibold font-mono text-slate-800">
                  {formatCurrency(totalMaterialCost)} <span className="text-xs font-normal text-slate-500">บาท</span>
                </p>
              </div>
              <div className="space-y-0.5">
                <p className="text-xs text-slate-500">ค่าแรงรวม</p>
                <p className="font-semibold font-mono text-slate-800">
                  {formatCurrency(totalLaborCost)} <span className="text-xs font-normal text-slate-500">บาท</span>
                </p>
              </div>
              <div className="space-y-0.5">
                <p className="text-xs text-slate-500">รายการวัสดุ</p>
                <p className="font-semibold font-mono text-slate-800">
                  {purchasableItemCount} <span className="text-xs font-normal text-slate-500">รายการ</span>
                </p>
              </div>
              <div className="space-y-0.5">
                <p className="text-xs text-slate-500">PO สร้างแล้ว</p>
                <p className="font-semibold text-slate-800">
                  <span className="font-mono text-green-600">{createdCount}</span>
                  <span className="text-xs font-normal text-slate-400"> / {sortedCategories.length} หมวด</span>
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-200">
              {pendingCount > 0 ? (
                <button
                  onClick={handleCreateAllPO}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors"
                >
                  <FileDown className="w-4 h-4" />
                  สร้าง PO ทั้งหมด ({pendingCount} หมวด)
                </button>
              ) : (
                <button
                  onClick={() => onViewDoc?.('purchase-order')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  ดู PO ทั้งหมด
                </button>
              )}
              <span className="text-xs text-slate-400">
                วัสดุรวม {formatCurrency(totalMaterialCost)} บาท · ค่าแรงรวม {formatCurrency(totalLaborCost)} บาท
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
