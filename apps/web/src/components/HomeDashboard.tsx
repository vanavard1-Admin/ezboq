import { useState, useEffect, useMemo } from 'react';
import { ArrowRight, Archive, Briefcase, User, Phone, Plus, FolderOpen, TrendingUp, DollarSign, Wallet, BarChart3 } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import { ProjectData, QuotationItem, getProjectMarkupMultiplier } from '../utils/projectData';
import { TemplateBudgetComparison } from './TemplateBudgetComparison';
import { EzBOQLogo } from './EzBOQLogo';

interface HomeDashboardProps {
  projects: ProjectData[];
  showFinancialInsights: boolean;
  onSelectProject: (projectId: string) => void;
  onCreateProject?: () => void;
}

/* ── helpers ─────────────────────────────────────────────── */

function getItemCost(item: QuotationItem): number {
  if (!item.quantity || item.quantity === '') return 0;
  const qty = Number(item.quantity) || 0;
  if (item.totalPrice !== undefined && item.totalPrice !== null && item.totalPrice !== '') {
    return qty * (Number(item.totalPrice) || 0);
  }
  return qty * ((Number(item.unitPrice) || 0) + (Number(item.laborCost) || 0));
}

function getCustomerAmount(project: ProjectData, item: QuotationItem): number {
  if (!item.quantity || item.quantity === '') return 0;
  return getItemCost(item) * getProjectMarkupMultiplier(project, item.no);
}

interface ProjectFinancials {
  id: string;
  name: string;
  owner: string;
  phone: string;
  totalCost: number;
  grandTotal: number;
  profit: number;
  margin: number;
  boqCount: number;
  archived: boolean;
}

function getProjectFinancials(project: ProjectData): ProjectFinancials {
  const boqItems = project.quotationData.filter(i => i.quantity !== '' && i.quantity !== undefined);
  const totalCost = boqItems.reduce((s, i) => s + getItemCost(i), 0);
  const customerSubtotal =
    project.customerPrice && project.customerPrice > 0
      ? project.customerPrice
      : boqItems.reduce((s, i) => s + getCustomerAmount(project, i), 0);
  const operatingCost = project.operatingCost !== undefined ? project.operatingCost : customerSubtotal * 0.05;
  const grandTotal = customerSubtotal + operatingCost;
  const profit = grandTotal - totalCost;
  const margin = grandTotal > 0 ? (profit / grandTotal) * 100 : 0;

  return {
    id: project.id,
    name: project.name,
    owner: project.owner,
    phone: project.phone,
    totalCost,
    grandTotal,
    profit,
    margin,
    boqCount: boqItems.length,
    archived: project.status === 'archived',
  };
}

function formatCurrency(v: number): string {
  return currencyFormatter.format(v);
}

function formatShort(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return formatCurrency(v);
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'สวัสดีตอนเช้า';
  if (h < 17) return 'สวัสดีตอนบ่าย';
  return 'สวัสดีตอนเย็น';
}

const STONE_SHADES = ['#292524', '#44403c', '#57534e', '#78716c', '#a8a29e', '#d6d3d1'];
const currencyFormatter = new Intl.NumberFormat('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

/* ── custom tooltip ──────────────────────────────────────── */

interface StoneTooltipEntry {
  name: string;
  value: number;
}

interface StoneTooltipProps {
  active?: boolean;
  payload?: StoneTooltipEntry[];
  label?: string;
}

function StoneTooltip({ active, payload, label }: StoneTooltipProps) {
  if (!active || !payload) return null;
  return (
    <div className="bg-white border border-stone-200 rounded-lg px-3 py-2 shadow-sm text-xs">
      <p className="text-stone-500 mb-1">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-stone-800 tabular-nums">
          {entry.name}: {formatCurrency(entry.value)} บาท
        </p>
      ))}
    </div>
  );
}

/* ── component ───────────────────────────────────────────── */

export function HomeDashboard({ projects, showFinancialInsights, onSelectProject, onCreateProject }: HomeDashboardProps) {
  const [mounted, setMounted] = useState(false);
  const [showCharts, setShowCharts] = useState(() =>
    typeof window === 'undefined' ? true : window.innerWidth >= 768,
  );

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const handleResize = () => setShowCharts(window.innerWidth >= 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const {
    activeFinancials,
    archivedFinancials,
    barChartData,
    donutData,
    maxRevenue,
    sortedByRevenue,
    totalBoq,
    totalCost,
    totalMargin,
    totalProfit,
    totalRevenue,
  } = useMemo(() => {
    const allFinancials = projects.map(getProjectFinancials);
    const active = allFinancials.filter(p => !p.archived);
    const archived = allFinancials.filter(p => p.archived);
    const revenue = active.reduce((s, p) => s + p.grandTotal, 0);
    const cost = active.reduce((s, p) => s + p.totalCost, 0);
    const profit = revenue - cost;
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
    const boq = active.reduce((s, p) => s + p.boqCount, 0);
    const sorted = [...active].sort((a, b) => b.grandTotal - a.grandTotal);
    const max = sorted.length > 0 ? sorted[0].grandTotal : 0;
    const bars = sorted.slice(0, 6).map(p => ({
      name: p.name.length > 12 ? p.name.substring(0, 12) + '…' : p.name,
      'ต้นทุน': Math.round(p.totalCost),
      'รายรับ': Math.round(p.grandTotal),
    }));
    const donut = active
      .filter(p => p.profit > 0)
      .map(p => ({ name: p.name, value: Math.round(p.profit) }));

    return {
      activeFinancials: active,
      archivedFinancials: archived,
      barChartData: bars,
      donutData: donut,
      maxRevenue: max,
      sortedByRevenue: sorted,
      totalBoq: boq,
      totalCost: cost,
      totalMargin: margin,
      totalProfit: profit,
      totalRevenue: revenue,
    };
  }, [projects]);

  const metrics = showFinancialInsights
    ? [
        { label: 'รายรับรวม', value: formatCurrency(totalRevenue), sub: '', icon: TrendingUp, accent: 'border-stone-700' },
        { label: 'ต้นทุนรวม', value: formatCurrency(totalCost), sub: '', icon: DollarSign, accent: 'border-stone-500' },
        { label: 'กำไรรวม', value: formatCurrency(totalProfit), sub: `${totalMargin.toFixed(1)}% margin`, icon: Wallet, accent: 'border-stone-400' },
        { label: 'โครงการ', value: String(activeFinancials.length), sub: `${totalBoq} BOQ items`, icon: BarChart3, accent: 'border-stone-300' },
      ]
    : [
        { label: 'โครงการ', value: String(activeFinancials.length), sub: '', icon: Briefcase, accent: 'border-stone-500' },
        { label: 'BOQ Items รวม', value: String(totalBoq), sub: '', icon: BarChart3, accent: 'border-stone-300' },
      ];
  const primaryProject = sortedByRevenue[0] || activeFinancials[0] || null;
  const quickListProjects = sortedByRevenue.slice(0, 3);

  return (
    <div className="max-w-5xl mx-auto">

      {/* ── Hero Header ─────────────────────────────────── */}
      <div
        className="flex flex-col items-center text-center mb-12 animate-in fade-in duration-600"
      >
        <EzBOQLogo size="lg" className="text-stone-800 mb-2" />
        <p className="text-[11px] uppercase tracking-[0.28em] text-stone-300 mb-6">Document System</p>
        <div className="w-12 h-px bg-stone-300 mb-6" />
        <p className="text-sm text-stone-400">{getGreeting()}</p>
        <p className="text-lg font-light text-stone-700 mt-1">ภาพรวมธุรกิจของคุณ</p>
      </div>

      <div className="mb-12 grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(300px,0.8fr)]">
        <div className="rounded-2xl border border-stone-200 bg-white px-6 py-6 shadow-sm">
          <p className="text-[11px] font-medium tracking-[0.2em] uppercase text-stone-400">Next Step</p>
          <h2 className="mt-3 text-2xl font-light text-stone-900">
            {primaryProject ? 'กลับเข้าโครงการที่กำลังเดินต่อ' : 'เริ่มต้นสร้าง workspace งานแรก'}
          </h2>
          <p className="mt-3 max-w-2xl text-sm text-stone-600">
            {primaryProject
              ? `ระบบแนะนำให้เริ่มจาก "${primaryProject.name}" เพื่อดู Project Home, เอกสารลูกค้า, และรอบเก็บเงินต่อจากข้อมูลล่าสุด`
              : 'เมื่อสร้างโครงการจาก template แล้ว ระบบจะเตรียม BOQ, ใบเสนอราคา, แผนงาน, ใบวางบิล, ภาษี, และ Presentation ให้ตั้งต้นอัตโนมัติ'}
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            {primaryProject ? (
              <button
                onClick={() => onSelectProject(primaryProject.id)}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--doc-primary)] px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-[var(--doc-primary-hover)]"
              >
                เปิด Project Home
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              onCreateProject && (
                <button
                  onClick={onCreateProject}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--doc-primary)] px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-[var(--doc-primary-hover)]"
                >
                  <Plus className="h-4 w-4" />
                  สร้างโครงการใหม่
                </button>
              )
            )}
            {onCreateProject && primaryProject && (
              <button
                onClick={onCreateProject}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-stone-200 px-5 py-3 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50"
              >
                <Plus className="h-4 w-4" />
                เพิ่มโครงการ
              </button>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-stone-50/80 px-5 py-5">
          <p className="text-[11px] font-medium tracking-[0.2em] uppercase text-stone-400">Workspace Snapshot</p>
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between rounded-xl bg-white px-4 py-3">
              <span className="text-sm text-stone-500">โครงการที่กำลังดำเนินการ</span>
              <span className="text-sm font-medium text-stone-900">{activeFinancials.length}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-white px-4 py-3">
              <span className="text-sm text-stone-500">เก็บถาวรแล้ว</span>
              <span className="text-sm font-medium text-stone-900">{archivedFinancials.length}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-white px-4 py-3">
              <span className="text-sm text-stone-500">โครงการรายรับสูงสุด</span>
              <span className="max-w-[12rem] truncate text-sm font-medium text-stone-900">
                {primaryProject?.name || '-'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Metric Cards ────────────────────────────────── */}
      <div className={`grid ${metrics.length > 2 ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-2'} gap-4 mb-12`}>
        {metrics.map((m, i) => {
          const Icon = m.icon;
          return (
            <div
              key={m.label}
              className={`bg-stone-50/80 rounded-xl p-5 border-l-2 ${m.accent} animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both transition-shadow hover:shadow-sm`}
              style={{ animationDelay: `${200 + i * 100}ms` }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon className="w-3.5 h-3.5 text-stone-400" />
                <p className="text-[11px] font-medium tracking-widest uppercase text-stone-400">{m.label}</p>
              </div>
              <p className="text-xl font-light text-stone-800 tabular-nums">{m.value}</p>
              {m.sub && <p className="text-[11px] text-stone-400 mt-0.5 tabular-nums">{m.sub}</p>}
            </div>
          );
        })}
      </div>

      {/* ── Charts Row (Bar + Donut) ────────────────────── */}
      {showFinancialInsights && sortedByRevenue.length > 0 && showCharts && (
        <div
          className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12 animate-in fade-in duration-700 fill-mode-both"
          style={{ animationDelay: '500ms' }}
        >
          {/* Bar Chart */}
          <div className="bg-stone-50/50 rounded-xl p-5 border border-stone-200/40">
            <p className="text-[11px] font-medium tracking-widest uppercase text-stone-400 mb-4">รายรับ vs ต้นทุน</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={barChartData} barGap={2} barSize={14}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#a8a29e' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#a8a29e' }} axisLine={false} tickLine={false} tickFormatter={v => formatShort(v)} />
                <Tooltip content={<StoneTooltip />} />
                <Bar dataKey="ต้นทุน" fill="#44403c" radius={[3, 3, 0, 0]} isAnimationActive={false} />
                <Bar dataKey="รายรับ" fill="#d6d3d1" radius={[3, 3, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-4 mt-3 text-[11px] text-stone-400">
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-2 rounded-sm bg-stone-700" /> ต้นทุน
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-2 rounded-sm bg-stone-300" /> รายรับ
              </span>
            </div>
          </div>

          {/* Donut Chart */}
          {donutData.length > 0 && (
            <div className="bg-stone-50/50 rounded-xl p-5 border border-stone-200/40">
              <p className="text-[11px] font-medium tracking-widest uppercase text-stone-400 mb-4">สัดส่วนกำไร</p>
              <div className="relative">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={donutData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={2}
                      dataKey="value"
                      stroke="none"
                      isAnimationActive={false}
                    >
                      {donutData.map((_entry, index) => (
                        <Cell key={index} fill={STONE_SHADES[index % STONE_SHADES.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => [`${formatCurrency(value)} บาท`, 'กำไร']}
                      contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e7e5e4' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <p className="text-[10px] text-stone-400 uppercase tracking-widest">กำไรรวม</p>
                  <p className="text-lg font-light text-stone-800 tabular-nums">{formatShort(totalProfit)}</p>
                </div>
              </div>
              {/* legend */}
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                {donutData.map((d, i) => (
                  <span key={d.name} className="flex items-center gap-1 text-[10px] text-stone-400">
                    <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: STONE_SHADES[i % STONE_SHADES.length] }} />
                    {d.name.length > 14 ? d.name.substring(0, 14) + '…' : d.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {showFinancialInsights && sortedByRevenue.length > 0 && !showCharts && (
        <div className="mb-12 rounded-2xl border border-stone-200 bg-white px-5 py-5 shadow-sm">
          <div className="flex items-baseline gap-3">
            <p className="text-[11px] font-medium tracking-widest uppercase text-stone-400">ภาพรวมโครงการเด่น</p>
            <span className="text-[11px] text-stone-400">มือถือจะแสดงแบบย่อเพื่อให้ลื่นขึ้น</span>
          </div>
          <div className="mt-4 space-y-3">
            {quickListProjects.map((project) => (
              <button
                key={project.id}
                onClick={() => onSelectProject(project.id)}
                className="flex w-full items-center justify-between rounded-xl border border-stone-200 px-4 py-3 text-left transition hover:bg-stone-50"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-stone-800">{project.name}</p>
                  <p className="mt-1 text-xs text-stone-400">
                    ต้นทุน {formatCurrency(project.totalCost)} • รายรับ {formatCurrency(project.grandTotal)}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-stone-300" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Margin Ranking Bars ─────────────────────────── */}
      {showFinancialInsights && sortedByRevenue.length > 0 && (
        <div
          className="mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-both"
          style={{ animationDelay: '600ms' }}
        >
          <div className="flex items-baseline gap-3 mb-4">
            <p className="text-[11px] font-medium tracking-widest uppercase text-stone-400">
              รายรับ-ต้นทุน ตามโครงการ
            </p>
            <span className="text-[11px] text-stone-400">{sortedByRevenue.length} projects</span>
          </div>
          <div className="space-y-3">
            {sortedByRevenue.map((p, i) => {
              const costBarW = maxRevenue > 0 ? (p.totalCost / maxRevenue) * 100 : 0;
              const revenueBarW = maxRevenue > 0 ? (p.grandTotal / maxRevenue) * 100 : 0;
              return (
                <div key={p.id}>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-sm text-stone-600 truncate w-40 shrink-0">{p.name}</span>
                    <span className="text-[11px] text-stone-500 tabular-nums shrink-0">
                      {formatShort(p.totalCost)} / {formatShort(p.grandTotal)}
                    </span>
                    <span className="text-[11px] text-stone-400 tabular-nums w-10 text-right shrink-0">
                      {p.margin.toFixed(0)}%
                    </span>
                  </div>
                  <div className="relative h-2 rounded-full bg-stone-100 overflow-hidden">
                    <div
                      className="absolute inset-y-0 left-0 rounded-full bg-stone-300 transition-all duration-700 ease-out"
                      style={{ width: mounted ? `${revenueBarW}%` : '0%', transitionDelay: `${700 + i * 80}ms` }}
                    />
                    <div
                      className="absolute inset-y-0 left-0 rounded-full bg-stone-700 transition-all duration-700 ease-out"
                      style={{ width: mounted ? `${costBarW}%` : '0%', transitionDelay: `${700 + i * 80}ms` }}
                    />
                  </div>
                </div>
              );
            })}
            <div className="flex items-center gap-4 pt-2 text-[11px] text-stone-400">
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-2 rounded-full bg-stone-700" /> ต้นทุน
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-2 rounded-full bg-stone-300" /> รายรับ
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── Tax & Budget Analytics ──────────────────────── */}
      {showFinancialInsights && projects.some(p => p.templateId) && (
        <div
          className="border-t border-stone-200 pt-8 mb-12 animate-in fade-in duration-500 fill-mode-both"
          style={{ animationDelay: '700ms' }}
        >
          <div className="flex items-baseline gap-3 mb-4">
            <p className="text-[11px] font-medium tracking-widest uppercase text-stone-400">
              ภาษี & งบประมาณ
            </p>
          </div>
          <TemplateBudgetComparison projects={projects} />
        </div>
      )}

      {/* ── Active Project List ─────────────────────────── */}
      <div className="border-t border-stone-200 pt-8">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-baseline gap-3">
            <p className="text-[11px] font-medium tracking-widest uppercase text-stone-400">โครงการที่ดำเนินการ</p>
            <span className="text-[11px] text-stone-400">{activeFinancials.length}</span>
          </div>
          {onCreateProject && (
            <button
              onClick={onCreateProject}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border border-stone-200 text-stone-600 hover:bg-stone-100 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              เพิ่มโครงการ
            </button>
          )}
        </div>

        {activeFinancials.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-stone-100 mb-4">
              <FolderOpen className="w-7 h-7 text-stone-400" />
            </div>
            <p className="text-sm text-stone-600 mb-1">ยังไม่มีโครงการ</p>
            <p className="text-xs text-stone-400 mb-5">เริ่มต้นสร้างโครงการแรกของคุณ</p>
            {onCreateProject && (
              <button
                onClick={onCreateProject}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm bg-[var(--doc-primary)] hover:bg-[var(--doc-primary-hover)] text-white transition-colors"
              >
                <Plus className="w-4 h-4" />
                สร้างโครงการใหม่
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {activeFinancials.map((p, i) => (
              <ProjectCard
                key={p.id}
                project={p}
                showFinancialInsights={showFinancialInsights}
                onSelect={onSelectProject}
                delay={800 + i * 80}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Archived Projects ───────────────────────────── */}
      {archivedFinancials.length > 0 && (
        <div className="border-t border-stone-200 mt-10 pt-8">
          <div className="flex items-baseline gap-3 mb-5">
            <Archive className="w-3.5 h-3.5 text-stone-400" />
            <p className="text-[11px] font-medium tracking-widest uppercase text-stone-400">เก็บถาวร</p>
            <span className="text-[11px] text-stone-400">{archivedFinancials.length}</span>
          </div>
          <div className="space-y-2 opacity-60">
            {archivedFinancials.map(p => (
              <ProjectCard
                key={p.id}
                project={p}
                showFinancialInsights={showFinancialInsights}
                onSelect={onSelectProject}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Footer Branding ─────────────────────────────── */}
      <div className="flex justify-center mt-14 mb-6">
        <EzBOQLogo size="sm" className="text-stone-200" />
      </div>
    </div>
  );
}

/* ── Project Card ────────────────────────────────────────── */

function ProjectCard({
  project: p,
  showFinancialInsights,
      onSelect,
      delay,
}: {
  project: ProjectFinancials;
  showFinancialInsights: boolean;
  onSelect: (id: string) => void;
  delay?: number;
}) {
  return (
    <button
      onClick={() => onSelect(p.id)}
      className="group w-full text-left border border-stone-200/80 rounded-xl px-5 py-4 hover:bg-stone-50/50 hover:border-stone-300 hover:-translate-y-0.5 hover:shadow-sm transition-all duration-200 animate-in fade-in slide-in-from-bottom-2 duration-400 fill-mode-both"
      style={delay ? { animationDelay: `${delay}ms` } : undefined}
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-stone-400 shrink-0" />
            <span className="text-sm font-medium text-stone-800 truncate">{p.name}</span>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1.5 text-[11px] text-stone-400">
            {p.owner && p.owner !== '-' && (
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" />
                {p.owner}
              </span>
            )}
            {p.phone && p.phone !== '-' && (
              <span className="flex items-center gap-1">
                <Phone className="w-3 h-3" />
                {p.phone}
              </span>
            )}
          </div>
        </div>
        <ArrowRight className="w-4 h-4 text-stone-300 group-hover:text-stone-500 transition-colors mt-1 shrink-0" />
      </div>

      {showFinancialInsights ? (
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[11px] tabular-nums">
          <span className="text-stone-500">
            ต้นทุน <span className="text-stone-800">{formatCurrency(p.totalCost)}</span>
          </span>
          <span className="text-stone-500">
            ราคาขาย <span className="text-stone-800">{formatCurrency(p.grandTotal)}</span>
          </span>
          <span className="text-stone-500">
            กำไร <span className="text-stone-800">{formatCurrency(p.profit)}</span>
          </span>
          <span className="text-stone-500">
            {p.margin.toFixed(1)}%
          </span>
        </div>
      ) : (
        <div className="flex gap-6 mt-3 text-[11px] tabular-nums">
          <span className="text-stone-500">
            BOQ Items <span className="text-stone-800">{p.boqCount}</span>
          </span>
        </div>
      )}
    </button>
  );
}
