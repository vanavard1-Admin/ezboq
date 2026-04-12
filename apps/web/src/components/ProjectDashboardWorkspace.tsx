import { useMemo } from 'react';
import { AlertTriangle, Archive, ArchiveRestore, ArrowRight, CheckCircle2, ShoppingCart, User, MapPin, Phone, Wand2 } from 'lucide-react';
import { ProjectData, QuotationItem, getProjectMarkupMultiplier, getProjectPaymentSchedule, prepareProjectDocuments } from '../utils/projectData';
import type { WorkspaceDocumentTab } from '../utils/workspaceTabs';
import { buildPurchaseListFromProject } from '../utils/rfqMarketplace';

interface ProjectDashboardWorkspaceProps {
  project: ProjectData;
  projectCount?: number;
  accessibleTabs: WorkspaceDocumentTab[];
  showFinancialInsights?: boolean;
  onNavigate: (tab: WorkspaceDocumentTab) => void;
  onUpdateProject?: (project: ProjectData) => void;
  onOpenShop?: () => void;
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

function formatCurrency(v: number): string {
  return new Intl.NumberFormat('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);
}

const pipelineLabels: Record<string, string> = {
  quotation: 'ต้นทุน / BOQ',
  'purchase-order': 'ใบสั่งซื้อ',
  'customer-quotation': 'ใบเสนอราคาลูกค้า',
  'presentation-board': 'Presentation',
  comparison: 'เปรียบเทียบราคา',
  invoice: 'ใบวางบิล',
  'contractor-invoice': 'ใบเบิกช่าง',
  'summary-invoice': 'สรุปบิล',
  receipt: 'ใบเสร็จ',
  'vat-invoice': 'ใบกำกับภาษี',
  'withholding-tax': 'หัก ณ ที่จ่าย',
  workplan: 'แผนงาน',
  contract: 'สัญญา',
};

interface CategoryBreakdown {
  key: string;
  label: string;
  cost: number;
}

interface PriorityAction {
  tab: WorkspaceDocumentTab;
  label: string;
  reason: string;
}

function getPricingTierLabel(tier?: ProjectData['templatePricingTier']): string {
  if (tier === 'value') return 'ประหยัด';
  if (tier === 'premium') return 'พรีเมียม';
  return 'มาตรฐาน';
}

function getCategoryBreakdown(allItems: QuotationItem[]): CategoryBreakdown[] {
  const headers = allItems.filter(i => i.quantity === '' && !i.no.includes('.'));
  const items = allItems.filter(i => i.quantity !== '' && i.quantity !== undefined);

  const headerMap = new Map<string, string>();
  for (const h of headers) {
    headerMap.set(h.no, h.description);
  }

  const costMap = new Map<string, number>();
  for (const item of items) {
    const cat = item.no.split('.')[0];
    costMap.set(cat, (costMap.get(cat) || 0) + getItemCost(item));
  }

  const result: CategoryBreakdown[] = [];
  for (const [key, cost] of costMap) {
    if (cost <= 0) continue;
    result.push({ key, label: headerMap.get(key) || key, cost });
  }

  result.sort((a, b) => b.cost - a.cost);
  return result;
}

function getInstallments(project: ProjectData, total: number) {
  if (project.paymentSchedule?.length) {
    return getProjectPaymentSchedule(project, total).map(({ no, percentage, amount }) => ({
      no,
      label: `งวดที่ ${no}`,
      pct: percentage,
      amount,
    }));
  }

  return [
    { no: 1, label: 'งวดที่ 1', pct: 30, amount: Math.round(total * 0.3) },
    { no: 2, label: 'งวดที่ 2', pct: 30, amount: Math.round(total * 0.3) },
    { no: 3, label: 'งวดที่ 3', pct: 30, amount: Math.round(total * 0.3) },
    { no: 4, label: 'งวดที่ 4', pct: 10, amount: Math.round(total * 0.1) },
  ];
}

/* ── component ───────────────────────────────────────────── */

export function ProjectDashboardWorkspace({
  project,
  accessibleTabs,
  showFinancialInsights = true,
  onNavigate,
  onUpdateProject,
  onOpenShop,
}: ProjectDashboardWorkspaceProps) {
  const isArchived = project.status === 'archived';
  const isAutoSyncEnabled = project.autoSyncDocuments !== false;

  const toggleArchive = () => {
    if (!onUpdateProject) return;
    onUpdateProject({
      ...project,
      status: isArchived ? 'active' : 'archived',
    });
  };

  const regenerateDocuments = () => {
    if (!onUpdateProject) return;
    onUpdateProject(prepareProjectDocuments(project, { regenerate: true }));
  };

  const toggleAutoSyncDocuments = () => {
    if (!onUpdateProject) return;

    if (isAutoSyncEnabled) {
      onUpdateProject({
        ...project,
        autoSyncDocuments: false,
      });
      return;
    }

    onUpdateProject(prepareProjectDocuments({
      ...project,
      autoSyncDocuments: true,
    }, { regenerate: true }));
  };
  const {
    boqHeaders,
    boqItems,
    customerSubtotal,
    grandTotal,
    margin,
    operatingCost,
    profit,
    totalCost,
  } = useMemo(() => {
    const items = project.quotationData.filter(i => i.quantity !== '' && i.quantity !== undefined);
    const headers = project.quotationData.filter(i => i.quantity === '' && !i.no.includes('.'));
    const cost = items.reduce((s, i) => s + getItemCost(i), 0);
    const subtotal =
      project.customerPrice && project.customerPrice > 0
        ? project.customerPrice
        : items.reduce((s, i) => s + getCustomerAmount(project, i), 0);
    const opCost = project.operatingCost !== undefined ? project.operatingCost : subtotal * 0.05;
    const total = subtotal + opCost;
    const totalProfit = total - cost;
    const totalMargin = total > 0 ? (totalProfit / total) * 100 : 0;

    return {
      boqHeaders: headers,
      boqItems: items,
      customerSubtotal: subtotal,
      grandTotal: total,
      margin: totalMargin,
      operatingCost: opCost,
      profit: totalProfit,
      totalCost: cost,
    };
  }, [project]);

  const stages = useMemo(() => {
    const tabSet = new Set(accessibleTabs);
    return [
      {
        title: 'ตั้งต้นทุน',
        docs: [
          { label: 'ต้นทุน / BOQ', tab: 'quotation' as WorkspaceDocumentTab },
          { label: 'เปรียบเทียบราคา', tab: 'comparison' as WorkspaceDocumentTab },
          { label: 'แก้ไข BOQ', tab: 'edit' as WorkspaceDocumentTab },
        ],
      },
      {
        title: 'จัดซื้อ / เตรียมวัสดุ',
        docs: [{ label: 'ใบสั่งซื้อ', tab: 'purchase-order' as WorkspaceDocumentTab }],
      },
      {
        title: 'เอกสารลูกค้า',
        docs: [
          { label: 'ใบเสนอราคาลูกค้า', tab: 'customer-quotation' as WorkspaceDocumentTab },
          { label: 'Presentation Board', tab: 'presentation-board' as WorkspaceDocumentTab },
        ],
      },
      {
        title: 'เก็บเงิน',
        docs: [
          { label: 'ใบวางบิล', tab: 'invoice' as WorkspaceDocumentTab },
          { label: 'ใบเบิกช่าง', tab: 'contractor-invoice' as WorkspaceDocumentTab },
          { label: 'สรุปบิล', tab: 'summary-invoice' as WorkspaceDocumentTab },
          { label: 'ใบเสร็จ', tab: 'receipt' as WorkspaceDocumentTab },
          { label: 'ใบกำกับภาษี', tab: 'vat-invoice' as WorkspaceDocumentTab },
          { label: 'หัก ณ ที่จ่าย', tab: 'withholding-tax' as WorkspaceDocumentTab },
        ],
      },
      {
        title: 'คุมงาน / ปิดโครงการ',
        docs: [
          { label: 'แผนงาน', tab: 'workplan' as WorkspaceDocumentTab },
          { label: 'สัญญา', tab: 'contract' as WorkspaceDocumentTab },
          { label: 'จัดการโครงการ', tab: 'manage' as WorkspaceDocumentTab },
        ],
      },
    ]
      .map(s => ({ ...s, docs: s.docs.filter(d => tabSet.has(d.tab)) }))
      .filter(s => s.docs.length > 0);
  }, [accessibleTabs]);

  const categories = useMemo(
    () => (showFinancialInsights ? getCategoryBreakdown(project.quotationData) : []),
    [project.quotationData, showFinancialInsights],
  );
  const maxCategoryCost = categories.length > 0 ? categories[0].cost : 0;
  const installments = useMemo(
    () => (showFinancialInsights ? getInstallments(project, grandTotal) : []),
    [grandTotal, project, showFinancialInsights],
  );
  const purchaseListSummary = useMemo(
    () => buildPurchaseListFromProject(project),
    [project],
  );
  const pipeline = project.documentPipeline;
  const readyDocumentLabels = useMemo(
    () => (pipeline?.readyDocuments || []).map((key) => pipelineLabels[key] || key),
    [pipeline?.readyDocuments],
  );
  const priorityActions = useMemo<PriorityAction[]>(() => {
    const actions: PriorityAction[] = [];
    const hasTab = (tab: WorkspaceDocumentTab) => accessibleTabs.includes(tab);
    const pushAction = (tab: WorkspaceDocumentTab, reason: string) => {
      if (!hasTab(tab) || actions.some((item) => item.tab === tab)) return;
      actions.push({
        tab,
        label: pipelineLabels[tab] || tab,
        reason,
      });
    };

    if (boqItems.length === 0) {
      pushAction('quotation', 'เริ่มจาก BOQ เพื่อให้ระบบสร้างตัวเลขตั้งต้นทั้งหมด');
      pushAction('manage', 'เติมข้อมูลโครงการก่อนออกเอกสาร');
    } else {
      pushAction('customer-quotation', 'พร้อมเปิดใบเสนอราคาให้ลูกค้าจาก BOQ ล่าสุด');
      pushAction('invoice', 'ตั้งรอบเก็บเงินและเช็กงวดชำระ');
      pushAction('workplan', 'ตรวจลำดับงานและ timeline ก่อนเริ่มหน้างาน');
    }

    if (pipeline?.missingInputs.some((item) => item.includes('รูป'))) {
      pushAction('presentation-board', 'ยังขาดรูปสำหรับ presentation board');
    }
    if (pipeline?.missingInputs.some((item) => item.includes('เจ้าของ') || item.includes('ที่อยู่') || item.includes('เบอร์โทร'))) {
      pushAction('manage', 'ยังมีข้อมูลโครงการหลักที่ควรเติมให้ครบ');
    }
    pushAction('purchase-order', 'เตรียมวัสดุจาก BOQ ล่าสุดก่อนเข้าหน้างาน');

    return actions.slice(0, 4);
  }, [accessibleTabs, boqItems.length, pipeline?.missingInputs]);

  /* ── render ──────────────────────────────────────────── */

  return (
    <div className="max-w-5xl mx-auto">
      {/* ── Project Header ── */}
      <div className="mb-10">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-light tracking-wide text-stone-800">{project.name}</h1>
              {isArchived && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-stone-200/60 text-[11px] text-stone-500">
                  <Archive className="w-3 h-3" />
                  เก็บถาวร
                </span>
              )}
            </div>
          </div>
          {onUpdateProject && (
            <div className="flex flex-wrap items-center gap-2 print:hidden">
              <button
                onClick={toggleAutoSyncDocuments}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] transition-colors ${
                  isAutoSyncEnabled
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                    : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
                }`}
              >
                {isAutoSyncEnabled ? 'Auto Sync: เปิด' : 'Auto Sync: ล็อกไว้'}
              </button>
              <button
                onClick={regenerateDocuments}
                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] text-emerald-700 transition-colors hover:bg-emerald-100"
              >
                <Wand2 className="w-3.5 h-3.5" />
                เตรียมเอกสารทั้งชุด
              </button>
              <button
                onClick={toggleArchive}
                className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 px-3 py-1.5 text-[11px] text-stone-500 transition-colors hover:bg-stone-50"
              >
                {isArchived ? <ArchiveRestore className="w-3.5 h-3.5" /> : <Archive className="w-3.5 h-3.5" />}
                {isArchived ? 'นำกลับมา' : 'เก็บถาวร'}
              </button>
              {onOpenShop && (
                <button
                  onClick={onOpenShop}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-3 py-1.5 text-[11px] text-sky-700 transition-colors hover:bg-sky-100"
                >
                  <ShoppingCart className="w-3.5 h-3.5" />
                  เปิด Shop / RFQ
                </button>
              )}
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-1 mt-2 text-sm text-stone-400">
          {project.owner && project.owner !== '-' && (
            <span className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" />
              {project.owner}
            </span>
          )}
          {project.phone && project.phone !== '-' && (
            <span className="flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5" />
              {project.phone}
            </span>
          )}
          {project.address && project.address !== '-' && (
            <span className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" />
              {project.address}
            </span>
          )}
        </div>
      </div>

      <div className="mb-10 grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
        <div className="rounded-2xl border border-stone-200 bg-white px-5 py-5 shadow-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-700" />
            <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-stone-500">Priority Actions</p>
          </div>
          <h2 className="mt-3 text-xl font-light text-stone-900">เอกสารที่ควรทำต่อจากข้อมูลชุดนี้</h2>
          <p className="mt-2 text-sm text-stone-600">
            ระบบจะเรียงงานให้จาก BOQ และ pipeline ล่าสุด เพื่อให้ทีมเริ่มจากเอกสารที่ควรแตะก่อนแทนการไล่เปิดทุกแท็บเอง
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {priorityActions.map((action) => (
              <button
                key={action.tab}
                onClick={() => onNavigate(action.tab)}
                className="rounded-xl border border-stone-200 bg-stone-50/70 px-4 py-3 text-left transition hover:border-stone-300 hover:bg-stone-100"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-stone-800">{action.label}</span>
                  <ArrowRight className="h-3.5 w-3.5 shrink-0 text-stone-300" />
                </div>
                <p className="mt-1 text-xs text-stone-500">{action.reason}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-stone-50/80 px-5 py-5">
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-stone-500">Project Snapshot</p>
          <div className="mt-4 space-y-3">
            <div className="rounded-xl bg-white px-4 py-3">
              <p className="text-xs uppercase tracking-[0.18em] text-stone-400">BOQ</p>
              <p className="mt-1 text-sm text-stone-800">{boqHeaders.length} หมวด / {boqItems.length} รายการ</p>
            </div>
            <div className="rounded-xl bg-white px-4 py-3">
              <p className="text-xs uppercase tracking-[0.18em] text-stone-400">Pipeline</p>
              <p className="mt-1 text-sm text-stone-800">{readyDocumentLabels.length} เอกสารพร้อมใช้งาน</p>
            </div>
            <div className="rounded-xl bg-white px-4 py-3">
              <p className="text-xs uppercase tracking-[0.18em] text-stone-400">สถานะ Auto Sync</p>
              <p className="mt-1 text-sm text-stone-800">{isAutoSyncEnabled ? 'เปิดให้เอกสาร sync ตาม BOQ' : 'ล็อกตัวเลขไว้เอง'}</p>
            </div>
            {project.priceReferenceSummary && (
              <div className="rounded-xl bg-white px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-stone-400">ฐานราคา Template</p>
                <p className="mt-1 text-sm text-stone-800">
                  {project.priceReferenceSummary.seriesLabel} • {getPricingTierLabel(project.templatePricingTier)}
                </p>
                <p className="mt-1 text-xs text-stone-500">
                  ตรวจล่าสุด {project.priceReferenceSummary.updatedAt} • match {project.priceReferenceSummary.matchedItems}/{project.priceReferenceSummary.totalItems} รายการ ({project.priceReferenceSummary.coveragePercent}%)
                </p>
              </div>
            )}
            {onOpenShop && (
              <button
                onClick={onOpenShop}
                className="w-full rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-left transition hover:bg-sky-100"
              >
                <p className="text-xs uppercase tracking-[0.18em] text-sky-600">Material Sourcing</p>
                <p className="mt-1 text-sm font-medium text-stone-800">
                  {purchaseListSummary.lines.length} purchase lines • {purchaseListSummary.matchedLines} match พร้อมยิง RFQ
                </p>
                <p className="mt-1 text-xs text-stone-500">
                  เปิด EzBOQ Shop เพื่อเทียบราคาร้านวัสดุ, คุม landed cost, และสร้าง RFQ จาก BOQ ปัจจุบัน
                </p>
              </button>
            )}
          </div>
        </div>
      </div>

      {pipeline && (
        <div className={`mb-10 rounded-2xl border px-5 py-5 ${
          pipeline.status === 'ready'
            ? 'border-emerald-200 bg-emerald-50/70'
            : 'border-amber-200 bg-amber-50/70'
        }`}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                {pipeline.status === 'ready' ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-amber-700" />
                )}
                <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-stone-500">Auto Document Pipeline</p>
              </div>
              <h2 className="mt-2 text-lg text-stone-900">
                {pipeline.status === 'ready'
                  ? 'ระบบเตรียมเอกสารตั้งต้นครบตาม BOQ แล้ว'
                  : 'ระบบเตรียมเอกสารให้อัตโนมัติแล้ว แต่ยังมีข้อมูลที่ควรเติม'}
              </h2>
              <p className="mt-1 text-sm text-stone-600">
                {isAutoSyncEnabled
                  ? 'เมื่อ BOQ เปลี่ยน ระบบจะ sync ตัวเลขหลักและ metadata เอกสารให้อัตโนมัติ แล้วคุณค่อยเข้าไปแก้รายละเอียดรายหน้าได้'
                  : 'ตอนนี้โครงการอยู่ในโหมดล็อกตัวเลขไว้เอง ระบบจะไม่ทับราคาลูกค้าและค่าดำเนินการจนกว่าจะเปิด Auto Sync อีกครั้ง'}
              </p>
            </div>
            <div className="rounded-xl border border-white/70 bg-white/80 px-4 py-3 text-right">
              <p className="text-[10px] uppercase tracking-[0.18em] text-stone-400">Documents Ready</p>
              <p className="mt-1 text-2xl font-light text-stone-900">{readyDocumentLabels.length}</p>
              <p className="text-xs text-stone-500">พร้อมใช้งานจาก pipeline ล่าสุด</p>
            </div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
            <div className="rounded-xl border border-white/70 bg-white/75 p-4">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">เอกสารที่พร้อมแล้ว</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {readyDocumentLabels.map((label) => (
                  <span
                    key={label}
                    className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs text-emerald-800"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {label}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-white/70 bg-white/75 p-4">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">ข้อมูลที่ยังควรเติม</p>
              <div className="mt-3 space-y-2">
                {pipeline.missingInputs.length > 0 ? pipeline.missingInputs.map((item) => (
                  <div key={item} className="flex items-start gap-2 text-sm text-stone-700">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                    <span>{item}</span>
                  </div>
                )) : (
                  <div className="flex items-start gap-2 text-sm text-emerald-800">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>ข้อมูลสำคัญครบสำหรับเอกสารมาตรฐานแล้ว</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Financial Metrics ── */}
      {showFinancialInsights ? (
        <div className="grid grid-cols-2 xl:grid-cols-5 gap-4 mb-10">
          <div className="bg-stone-50 rounded-xl p-5">
            <p className="text-[11px] font-medium tracking-widest uppercase text-stone-400 mb-1">ต้นทุนรวม</p>
            <p className="text-xl font-light text-stone-800 tabular-nums">{formatCurrency(totalCost)}</p>
          </div>
          <div className="bg-stone-50 rounded-xl p-5">
            <p className="text-[11px] font-medium tracking-widest uppercase text-stone-400 mb-1">ยอดก่อนดำเนินการ</p>
            <p className="text-xl font-light text-stone-800 tabular-nums">{formatCurrency(customerSubtotal)}</p>
          </div>
          <div className="bg-stone-50 rounded-xl p-5">
            <p className="text-[11px] font-medium tracking-widest uppercase text-stone-400 mb-1">ค่าดำเนินการ</p>
            <p className="text-xl font-light text-stone-800 tabular-nums">{formatCurrency(operatingCost)}</p>
          </div>
          <div className="bg-stone-50 rounded-xl p-5">
            <p className="text-[11px] font-medium tracking-widest uppercase text-stone-400 mb-1">ยอดรวมลูกค้า</p>
            <p className="text-xl font-light text-stone-800 tabular-nums">{formatCurrency(grandTotal)}</p>
          </div>
          <div className="bg-stone-50 rounded-xl p-5">
            <p className="text-[11px] font-medium tracking-widest uppercase text-stone-400 mb-1">กำไร / Margin</p>
            <p className="text-xl font-light text-stone-800 tabular-nums">{formatCurrency(profit)}</p>
            <p className="mt-1 text-xs text-stone-400">{margin.toFixed(1)}%</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          <div className="bg-stone-50 rounded-xl p-5">
            <p className="text-[11px] font-medium tracking-widest uppercase text-stone-400 mb-1">เอกสารที่เข้าถึง</p>
            <p className="text-xl font-light text-stone-800 tabular-nums">{accessibleTabs.length}</p>
          </div>
          <div className="bg-stone-50 rounded-xl p-5">
            <p className="text-[11px] font-medium tracking-widest uppercase text-stone-400 mb-1">หมวดงาน</p>
            <p className="text-xl font-light text-stone-800 tabular-nums">{boqHeaders.length}</p>
          </div>
          <div className="bg-stone-50 rounded-xl p-5">
            <p className="text-[11px] font-medium tracking-widest uppercase text-stone-400 mb-1">BOQ Items</p>
            <p className="text-xl font-light text-stone-800 tabular-nums">{boqItems.length}</p>
          </div>
        </div>
      )}

      {/* ── Cost Breakdown by Category ── */}
      {showFinancialInsights && categories.length > 0 && (
        <>
          <div className="flex items-baseline gap-3 mb-4">
            <p className="text-[11px] font-medium tracking-widest uppercase text-stone-400">ต้นทุนตามหมวดงาน</p>
            <span className="text-[11px] text-stone-400">{categories.length} categories</span>
          </div>
          <div className="space-y-3 mb-10">
            {categories.map(cat => {
              const pct = totalCost > 0 ? (cat.cost / totalCost) * 100 : 0;
              const barW = maxCategoryCost > 0 ? (cat.cost / maxCategoryCost) * 100 : 0;
              return (
                <div key={cat.key} className="group">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-[11px] font-medium tracking-widest uppercase text-stone-400 w-5 text-right shrink-0">
                      {cat.key}
                    </span>
                    <span className="text-sm text-stone-600 truncate flex-1">{cat.label}</span>
                    <span className="text-sm text-stone-800 tabular-nums shrink-0">{formatCurrency(cat.cost)}</span>
                    <span className="text-[11px] text-stone-400 tabular-nums w-10 text-right shrink-0">
                      {pct.toFixed(0)}%
                    </span>
                  </div>
                  <div className="ml-8 h-2 rounded-full bg-stone-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-stone-700 transition-all duration-500"
                      style={{ width: `${barW}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ── Payment Installments ── */}
      {showFinancialInsights && grandTotal > 0 && (
        <>
          <div className="flex items-baseline gap-3 mb-4">
            <p className="text-[11px] font-medium tracking-widest uppercase text-stone-400">งวดชำระเงิน</p>
            <span className="text-[11px] text-stone-400">{installments.length} งวด</span>
          </div>
          <div className="space-y-3 mb-10">
            {installments.map(inst => (
              <div key={inst.no}>
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-sm text-stone-600 w-28 shrink-0">
                    {inst.label} ({inst.pct}%)
                  </span>
                  <div className="flex-1 h-2 rounded-full bg-stone-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-stone-700 transition-all duration-500"
                      style={{ width: `${inst.pct}%` }}
                    />
                  </div>
                  <span className="text-sm text-stone-800 tabular-nums shrink-0">
                    {formatCurrency(inst.amount)} บาท
                  </span>
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between pt-2 border-t border-stone-200">
              <span className="text-sm text-stone-500">รวมทั้งหมด</span>
              <span className="text-sm font-medium text-stone-800 tabular-nums">{formatCurrency(grandTotal)} บาท</span>
            </div>
          </div>
        </>
      )}

      {/* ── Document Workflow ── */}
      <div className="border-t border-stone-200 pt-8 mb-10">
        <p className="text-[11px] font-medium tracking-widest uppercase text-stone-400 mb-6">เอกสาร</p>
        <div className="space-y-8">
          {stages.map((stage, i) => (
            <div key={stage.title}>
              <div className="flex items-baseline gap-3 mb-3">
                <span className="text-[11px] font-medium tracking-widest uppercase text-stone-400">{i + 1}</span>
                <h2 className="text-sm font-medium text-stone-700 tracking-wide">{stage.title}</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
                {stage.docs.map(doc => (
                  <button
                    key={doc.tab}
                    onClick={() => onNavigate(doc.tab)}
                    className="group flex items-center justify-between px-4 py-3 rounded-lg border border-stone-200/80 text-left text-sm text-stone-600 hover:text-stone-900 hover:border-stone-300 hover:bg-stone-50/50 transition-colors"
                  >
                    <span>{doc.label}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-stone-300 group-hover:text-stone-500 transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── BOQ Sections ── */}
      {boqHeaders.length > 0 && (
        <>
          <div className="border-t border-stone-200 pt-6">
            <div className="flex items-baseline gap-3 mb-4">
              <p className="text-[11px] font-medium tracking-widest uppercase text-stone-400">หมวดงานใน BOQ</p>
              <span className="text-[11px] text-stone-400">{boqHeaders.length} sections</span>
            </div>
            <div className="space-y-1">
              {boqHeaders.slice(0, 8).map((header, index) => (
                <div
                  key={`${header.no}-${index}`}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-stone-600 hover:bg-stone-50 transition-colors"
                >
                  <span className="text-[11px] font-medium tracking-widest uppercase text-stone-400 w-6 text-right shrink-0">
                    {header.no}
                  </span>
                  <span>{header.description}</span>
                </div>
              ))}
            </div>
            {boqHeaders.length > 8 && (
              <p className="mt-3 px-3 text-sm text-stone-400">+{boqHeaders.length - 8} หมวดเพิ่มเติม</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
