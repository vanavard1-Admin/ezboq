/**
 * AppShell — Unified app layout (replaces HomePage + Navigation + old tab mess)
 *
 * Mobile: bottom tab bar (native app feel)
 * Desktop: minimal top bar
 * Main content: Pipeline 5 steps = main navigation
 */
import {
  Suspense, lazy, startTransition, useCallback,
  useEffect, useMemo, useRef, useState,
  type ComponentType,
} from 'react';
import {
  ChevronDown, FileText, LogOut, Plus, Settings,
  ClipboardList, Loader2,
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import type { AuthSession } from '../utils/authSession';
import type { ProjectData, PaymentInstallmentConfig } from '../utils/projectData';
import { prepareProjectDocuments, getProjectGrandTotal } from '../utils/projectData';
import { loadProjects, loadWorkspaceUiState, saveProjects, saveWorkspaceUiState } from '../utils/storageUtils';
import { filterProjectsForUser } from '../utils/authAccess';
import { loadCompanyProfile, saveCompanyProfile, type CompanyProfile } from '../utils/companyProfile';
import type { PricingConfig, InstallmentLine, ContractorAssignment, ContractorMode, MaterialCategory } from '../features/pipeline/types';
import {
  calculateInstallments, calculatePricing, DEFAULT_PRICING,
  extractMaterialCategories,
} from '../features/pipeline/types';
import type { ViewableDocument } from '../features/pipeline/components/DocumentViewer';
import { PartnerAds } from '../features/pipeline/components/PartnerAds';
import { EzBOQLogo } from './EzBOQLogo';
import {
  type MainTab, type AppView, type PlanTier, type SettingsTab,
  TABS, CLOUD_SYNC_DEBOUNCE_MS, PAID_ONLY_MAIN_TABS, PAID_ONLY_DOCUMENTS,
} from './AppShellTypes';
import { DashboardTab } from './DashboardTab';
import { SettingsPage } from './SettingsPage';

// Lazy-load step content
function lazyNamed<TModule, TKey extends keyof TModule>(
  loader: () => Promise<TModule>,
  key: TKey,
) {
  return lazy(() =>
    loader().then((module) => ({
      default: module[key] as ComponentType<Record<string, unknown>>,
    })),
  );
}

const ProjectSetupStep = lazyNamed(() => import('../features/pipeline/steps/ProjectSetupStep'), 'ProjectSetupStep');
const CustomerDocumentsStep = lazyNamed(() => import('../features/pipeline/steps/CustomerDocumentsStep'), 'CustomerDocumentsStep');
const ProcurementStep = lazyNamed(() => import('../features/pipeline/steps/ProcurementStep'), 'ProcurementStep');
const ContractorStep = lazyNamed(() => import('../features/pipeline/steps/ContractorStep'), 'ContractorStep');
const FinanceStep = lazyNamed(() => import('../features/pipeline/steps/FinanceStep'), 'FinanceStep');
const DocumentViewer = lazyNamed(() => import('../features/pipeline/components/DocumentViewer'), 'DocumentViewer');

type CloudWorkspaceModule = typeof import('../utils/cloudWorkspace');

let cloudWorkspacePromise: Promise<CloudWorkspaceModule> | null = null;

function loadCloudWorkspaceModule() {
  if (!cloudWorkspacePromise) {
    cloudWorkspacePromise = import('../utils/cloudWorkspace');
  }

  return cloudWorkspacePromise;
}

function formatCurrency(v: number): string {
  return new Intl.NumberFormat('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);
}

// ── Props ─────────────────────────────────────────

interface SubscriptionInfo {
  plan: string | null;
  status: string;
  endDate: string | null;
}

interface AppShellProps {
  session: AuthSession;
  onSignOut: () => void;
  planTier?: PlanTier;
  subscriptionInfo?: SubscriptionInfo | null;
  onOpenPricing?: () => void;
  onOpenAdminSub?: () => void;
  onOpenAdminMemory?: () => void;
}

function formatSubEndDate(iso: string | null): string {
  if (!iso) return '';
  try { return new Date(iso).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' }); }
  catch { return ''; }
}

function getPlanLabel(plan: string | null): string {
  if (!plan) return 'Free';
  if (plan === 'solo') return 'Pro';
  if (plan === 'team') return 'Business';
  return plan.charAt(0).toUpperCase() + plan.slice(1);
}

// ── Component ─────────────────────────────────────

export function AppShell({ session, onSignOut, planTier = 'paid', subscriptionInfo, onOpenPricing, onOpenAdminSub, onOpenAdminMemory }: AppShellProps) {
  // ── Data state (from WorkspaceShell) ────────────
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile>(() => loadCompanyProfile());

  // ── UI state ────────────────────────────────────
  const [activeTab, setActiveTab] = useState<MainTab>('dashboard');
  const [appView, setAppView] = useState<AppView>('main');
  const [initialSettingsTab, setInitialSettingsTab] = useState<SettingsTab>('profile');
  const [showProjectPicker, setShowProjectPicker] = useState(false);
  const [viewingDoc, setViewingDoc] = useState<{ type: ViewableDocument; installment?: number; categoryFilter?: string } | null>(null);
  const isFreeTier = planTier === 'free';

  // ── Pipeline state ──────────────────────────────
  const [pricing, setPricing] = useState<PricingConfig>(DEFAULT_PRICING);
  const [customerInstallments, setCustomerInstallments] = useState<InstallmentLine[]>([]);
  const [contractorMode, setContractorMode] = useState<ContractorMode>('single');
  const [contractors, setContractors] = useState<ContractorAssignment[]>([]);

  // ── Cloud sync refs ─────────────────────────────
  const projectSyncTimerRef = useRef<number | null>(null);
  const companySyncTimerRef = useRef<number | null>(null);

  // ── Derived ─────────────────────────────────────
  const accessibleProjects = useMemo(
    () => filterProjectsForUser(projects, session.user),
    [projects, session.user],
  );

  const selectedProject = useMemo(
    () => accessibleProjects.find((p) => p.id === selectedProjectId) || null,
    [accessibleProjects, selectedProjectId],
  );

  const pricingSummary = useMemo(() => {
    if (!selectedProject) return null;
    return calculatePricing(selectedProject.quotationData, pricing);
  }, [selectedProject, pricing]);

  const materialCategories = useMemo<MaterialCategory[]>(() => {
    if (!selectedProject) return [];
    return extractMaterialCategories(selectedProject.quotationData);
  }, [selectedProject]);

  const hasProjects = accessibleProjects.length > 0;
  const userInitials = useMemo(() => {
    const parts = session.user.name
      .split(/\s+/)
      .map((part) => part.trim())
      .filter(Boolean);

    if (parts.length === 0) return 'EZ';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0] || ''}${parts[parts.length - 1][0] || ''}`.toUpperCase();
  }, [session.user.name]);

  // ── Init: load projects ─────────────────────────
  useEffect(() => {
    const loaded = loadProjects();
    setProjects(loaded);
    const accessible = filterProjectsForUser(loaded, session.user);
    if (typeof window !== 'undefined') {
      const { selectedProjectId: savedProjectId } = loadWorkspaceUiState(accessible);
      if (savedProjectId && accessible.find((project) => project.id === savedProjectId)) {
        setSelectedProjectId(savedProjectId);
      } else if (accessible.length > 0) {
        setSelectedProjectId(accessible[0].id);
      }
    } else if (accessible.length > 0) {
      setSelectedProjectId(accessible[0].id);
    }
    setIsLoading(false);
  }, [session.user]);

  // ── Cloud sync: load from cloud ─────────────────
  useEffect(() => {
    if (!session.workspaceMode || session.workspaceMode !== 'cloud') return;
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    void loadCloudWorkspaceModule()
      .then((module) => {
        if (cancelled) return;

        void module.loadCompanyProfileFromCloud(session.user)
          .then((profile) => {
            if (cancelled || !profile) return;
            setCompanyProfile(profile);
            saveCompanyProfile(profile);
          })
          .catch(() => {});

        unsubscribe = module.subscribeCloudProjects(
          session.user,
          (cloudProjects) => {
            if (!cloudProjects || cancelled) return;
            const prepared = cloudProjects.map((p) => prepareProjectDocuments(p));
            setProjects(prepared);
            saveProjects(prepared);
          },
          () => {},
        );
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [session.user, session.workspaceMode]);

  // ── Save selectedProjectId ──────────────────────
  useEffect(() => {
    if (!selectedProjectId) return;
    saveWorkspaceUiState({ selectedProjectId });
  }, [selectedProjectId]);

  // ── Generate installments when project changes ──
  useEffect(() => {
    if (!selectedProject || !pricingSummary) return;
    if (customerInstallments.length > 0) return; // don't overwrite user edits

    const quotationTotal = getProjectGrandTotal(selectedProject);

    // Load from project.paymentSchedule if it exists (synced from billing schedule)
    if (selectedProject.paymentSchedule && selectedProject.paymentSchedule.length > 0) {
      const loaded = selectedProject.paymentSchedule.map((ps) => ({
        no: ps.no,
        label: ps.description,
        percent: ps.percentage,
        amount: Math.round(quotationTotal * (ps.percentage / 100)),
      }));
      setCustomerInstallments(loaded);
      return;
    }

    const defaultInstallments = calculateInstallments(quotationTotal, [
      { no: 1, label: 'มัดจำเริ่มงาน', percent: 30 },
      { no: 2, label: 'ระหว่างดำเนินงาน', percent: 30 },
      { no: 3, label: 'ติดตั้งและเก็บรายละเอียด', percent: 30 },
      { no: 4, label: 'ส่งมอบงาน', percent: 10 },
    ]);
    setCustomerInstallments(defaultInstallments);
  }, [selectedProject, pricingSummary, customerInstallments.length]);

  // ── Handlers ────────────────────────────────────

  const queueProjectsToCloud = useCallback((nextProjects: ProjectData[]) => {
    if (!session.workspaceMode || session.workspaceMode !== 'cloud') return;
    if (projectSyncTimerRef.current !== null) window.clearTimeout(projectSyncTimerRef.current);
    projectSyncTimerRef.current = window.setTimeout(() => {
      void loadCloudWorkspaceModule()
        .then(({ saveProjectsToCloud }) => saveProjectsToCloud(session.user, nextProjects))
        .catch(() => {});
      projectSyncTimerRef.current = null;
    }, CLOUD_SYNC_DEBOUNCE_MS);
  }, [session.user, session.workspaceMode]);

  const handleProjectsChange = useCallback((updated: ProjectData[]) => {
    if (!session.user.canManageProjects) return;
    const effectiveVatRate = companyProfile.vatExempt ? 0 : (companyProfile.defaultVatRate ?? 0.07);
    const prepared = updated.map((p) => prepareProjectDocuments(p, { defaultVatRate: effectiveVatRate }));
    const saved = saveProjects(prepared);
    const next = saved.length > 0 ? saved : prepared;
    startTransition(() => setProjects(next));
    queueProjectsToCloud(next);
  }, [session.user.canManageProjects, queueProjectsToCloud, companyProfile]);

  const handleSelectProject = useCallback((id: string) => {
    setShowProjectPicker(false);
    startTransition(() => {
      setSelectedProjectId(id);
      setActiveTab('dashboard');
      setAppView('main');
    });
    // Reset pipeline state for new project
    setCustomerInstallments([]);
    setContractors([]);
  }, []);

  const handleNewProjectCreated = useCallback((project: ProjectData, newPricing: PricingConfig) => {
    handleProjectsChange([...projects, project]);
    setSelectedProjectId(project.id);
    setPricing(newPricing);

    // Generate installments — use quotation grand total (same as invoice)
    const newProjectTotal = getProjectGrandTotal(project);
    setCustomerInstallments(calculateInstallments(newProjectTotal, [
      { no: 1, label: 'มัดจำเริ่มงาน', percent: 30 },
      { no: 2, label: 'ระหว่างดำเนินงาน', percent: 30 },
      { no: 3, label: 'ติดตั้งและเก็บรายละเอียด', percent: 30 },
      { no: 4, label: 'ส่งมอบงาน', percent: 10 },
    ]));
    setContractors([]);

    setAppView('main');
    setActiveTab('dashboard');
    toast.success('สร้างโปรเจคเรียบร้อย!');
  }, [projects, handleProjectsChange]);

  // Sync billing schedule → project.paymentSchedule so InvoiceDocument uses same installments
  const handleInstallmentsChange = useCallback((installments: InstallmentLine[]) => {
    setCustomerInstallments(installments);
    if (selectedProject) {
      const paymentSchedule: PaymentInstallmentConfig[] = installments.map((inst) => ({
        no: inst.no,
        description: inst.label,
        percentage: inst.percent,
      }));
      const updatedProjects = projects.map((p) =>
        p.id === selectedProject.id ? { ...p, paymentSchedule } : p,
      );
      handleProjectsChange(updatedProjects);
    }
  }, [selectedProject, projects, handleProjectsChange]);

  const handleOpenSettings = useCallback((tab: SettingsTab = 'profile') => {
    setInitialSettingsTab(tab);
    setAppView('settings');
  }, []);

  const handleSaveCompanyProfile = useCallback((profile: CompanyProfile) => {
    saveCompanyProfile(profile);
    setCompanyProfile(profile);
    if (session.workspaceMode === 'cloud') {
      if (companySyncTimerRef.current !== null) window.clearTimeout(companySyncTimerRef.current);
      companySyncTimerRef.current = window.setTimeout(() => {
        void loadCloudWorkspaceModule()
          .then(({ saveCompanyProfileToCloud }) => saveCompanyProfileToCloud(session.user, profile))
          .catch(() => {});
        companySyncTimerRef.current = null;
      }, CLOUD_SYNC_DEBOUNCE_MS);
    }
  }, [session.user, session.workspaceMode]);

  const promptUpgrade = useCallback((feature: 'invoice' | 'receipt' | 'finance' | 'export' | 'team' = 'finance') => {
    const descriptionMap: Record<typeof feature, string> = {
      invoice: 'ใบวางบิลและเอกสารการเงิน เปิดใช้ได้ในแพ็ก Pro หรือ Business',
      receipt: 'ใบเสร็จและเอกสารรับชำระ เปิดใช้ได้ในแพ็ก Pro หรือ Business',
      finance: 'เมนูการเงิน (Invoice/Receipt/Tax) ใช้ได้ในแพ็ก Pro หรือ Business',
      export: 'การส่งออก PDF และการแชร์ไฟล์ ใช้ได้ในแพ็ก Pro หรือ Business',
      team: 'การเชิญและจัดการทีม ใช้ได้ในแพ็ก Business',
    };
    toast.message('ฟีเจอร์นี้ต้องอัปเกรดแพ็กเกจ', {
      description: descriptionMap[feature],
    });
    onOpenPricing?.();
  }, [onOpenPricing]);

  const handleNavigateTab = useCallback((nextTab: MainTab) => {
    if (isFreeTier && PAID_ONLY_MAIN_TABS.has(nextTab)) {
      promptUpgrade('finance');
      return;
    }
    setActiveTab(nextTab);
  }, [isFreeTier, promptUpgrade]);

  const openDocumentViewer = useCallback((type: ViewableDocument, options?: { installment?: number; categoryFilter?: string }) => {
    if (isFreeTier && PAID_ONLY_DOCUMENTS.has(type)) {
      promptUpgrade(type === 'receipt' ? 'receipt' : 'invoice');
      return;
    }

    setViewingDoc({
      type,
      installment: options?.installment,
      categoryFilter: options?.categoryFilter,
    });
  }, [isFreeTier, promptUpgrade]);

  // ── Loading state ───────────────────────────────

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  // ── Settings view ───────────────────────────────

  if (appView === 'settings') {
    return (
      <SettingsPage
        session={session}
        companyProfile={companyProfile}
        onSaveCompanyProfile={handleSaveCompanyProfile}
        onSignOut={onSignOut}
        onBack={() => setAppView('main')}
        planTier={planTier}
        onOpenPricing={onOpenPricing}
        onOpenAdminSub={onOpenAdminSub}
        onOpenAdminMemory={onOpenAdminMemory}
        initialTab={initialSettingsTab}
      />
    );
  }

  // ── New Project view ────────────────────────────

  if (appView === 'new-project') {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-20 bg-card border-b border-border px-4 py-3 flex items-center justify-between">
          <button onClick={() => setAppView('main')} className="text-sm text-primary font-medium">
            ยกเลิก
          </button>
          <h1 className="text-sm font-semibold text-foreground">สร้างโปรเจคใหม่</h1>
          <div className="w-10" />
        </header>
        <div className="max-w-3xl mx-auto px-4 py-6">
          <Suspense fallback={<div className="p-6 text-center text-sm text-muted-foreground">กำลังโหลด...</div>}>
            <ProjectSetupStep
              initialProject={null}
              onProjectCreated={handleNewProjectCreated}
            />
          </Suspense>
        </div>
      </div>
    );
  }

  // ── Main view ───────────────────────────────────

  return (
    <div className="min-h-screen bg-background pb-[calc(env(safe-area-inset-bottom)+88px)] md:pb-0">
      {/* ── Desktop Top Bar ─────────────────────── */}
      <header className="sticky top-0 z-20 bg-card border-b border-border" {...(viewingDoc ? { 'data-print-hide': true } : {})}>
        <div className="max-w-5xl mx-auto px-3 sm:px-4 py-2 min-h-16 flex items-center gap-2 sm:gap-3">
          {/* Left: Brand + Project selector */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-2xl border border-wood-200 bg-wood-50/80 shadow-sm">
              <EzBOQLogo size="sm" className="h-8 sm:h-10 w-auto" />
            </div>
            <div className="min-w-0">
              <p className="hidden sm:block text-[10px] font-semibold tracking-[0.32em] text-primary">
                EZBOQ
              </p>
              <p className="mt-1 hidden truncate text-sm font-semibold text-foreground sm:block">
                {session.user.workspaceName || session.user.company || 'Workspace'}
              </p>
            </div>

            {/* Project Selector */}
            {hasProjects ? (
              <div className="relative min-w-0">
                <button
                  onClick={() => setShowProjectPicker(!showProjectPicker)}
                  className="flex h-10 items-center gap-1.5 px-3 py-1.5 bg-secondary hover:bg-wood-200 rounded-lg text-sm font-medium text-foreground transition-colors max-w-[150px] sm:max-w-[320px]"
                >
                  <span className="truncate">
                    {selectedProject?.name || 'เลือกโปรเจค'}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 flex-shrink-0 text-muted-foreground" />
                </button>

                {/* Dropdown */}
                {showProjectPicker && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowProjectPicker(false)} />
                    <div className="absolute left-0 top-full mt-1 z-20 w-72 bg-card rounded-xl shadow-lg border border-border py-1 max-h-80 overflow-y-auto">
                      {accessibleProjects.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => handleSelectProject(p.id)}
                          className={`w-full text-left px-3 py-2.5 text-sm hover:bg-secondary transition-colors ${
                            p.id === selectedProjectId ? 'bg-accent text-primary' : 'text-foreground'
                          }`}
                        >
                          <p className="font-medium truncate">{p.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{p.owner} | {p.address}</p>
                        </button>
                      ))}
                      <div className="border-t border-border mt-1 pt-1">
                        <button
                          onClick={() => { setShowProjectPicker(false); setAppView('new-project'); }}
                          className="w-full text-left px-3 py-2.5 text-sm text-primary hover:bg-accent font-medium flex items-center gap-1.5"
                        >
                          <Plus className="w-4 h-4" />
                          สร้างโปรเจคใหม่
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <span className="text-sm text-muted-foreground">ยังไม่มีโปรเจค</span>
            )}

            {/* Price badge */}
            {pricingSummary && (
              <span className="hidden sm:inline text-xs font-medium text-matcha-700 bg-matcha-50 px-2.5 py-1 rounded-full">
                {formatCurrency(pricingSummary.sellingTotal)}
              </span>
            )}
          </div>

          {/* Right: Actions */}
          <div className="ml-auto flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Plan Badge */}
            {subscriptionInfo ? (
              <button
                onClick={() => { setInitialSettingsTab('subscription'); setAppView('settings'); }}
                className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  subscriptionInfo.status === 'active'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                    : subscriptionInfo.status === 'pending'
                      ? 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
                      : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'
                }`}
                title="จัดการแผนสมาชิก"
              >
                <span>{getPlanLabel(subscriptionInfo.plan)}</span>
                {subscriptionInfo.status === 'active' && subscriptionInfo.endDate && (
                  <span className="text-emerald-500 font-normal">ถึง {formatSubEndDate(subscriptionInfo.endDate)}</span>
                )}
                {subscriptionInfo.status === 'pending' && (
                  <span className="text-amber-500 font-normal">รอตรวจสอบ</span>
                )}
              </button>
            ) : (
              <button
                onClick={onOpenPricing}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-secondary text-muted-foreground border border-border hover:bg-accent hover:text-primary hover:border-wood-300 transition-colors"
              >
                Free
              </button>
            )}
            <button
              onClick={() => setAppView('settings')}
              className="hidden sm:flex min-w-0 max-w-[144px] items-center gap-2 rounded-2xl border border-border bg-card px-2.5 py-2 shadow-sm sm:max-w-none sm:gap-3 sm:px-3 hover:bg-secondary transition-colors"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                {userInitials}
              </div>
              <div className="min-w-0 text-left">
                <p className="truncate text-xs font-semibold text-foreground sm:text-sm">{session.user.name}</p>
                <p className="hidden truncate text-[11px] text-muted-foreground sm:block">{session.user.title}</p>
              </div>
            </button>
            <button
              onClick={() => setAppView('new-project')}
              className="flex h-10 items-center gap-1 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-medium rounded-lg hover:bg-wood-900 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">สร้างโปรเจค</span>
            </button>
            <a
              href="#docs"
              className="flex h-10 items-center gap-1 px-3 py-1.5 bg-card border border-border text-foreground text-xs font-medium rounded-lg hover:bg-secondary transition-colors"
              title="เปิดโมดูลเอกสาร EzDoc"
            >
              <FileText className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">EzDoc</span>
            </a>
            {/* Mobile plan badge */}
            {subscriptionInfo && (
              <button
                onClick={() => { setInitialSettingsTab('subscription'); setAppView('settings'); }}
                className={`sm:hidden px-2 py-1 rounded-full text-[10px] font-semibold ${
                  subscriptionInfo.status === 'active'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : subscriptionInfo.status === 'pending'
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : 'bg-secondary text-muted-foreground border border-border'
                }`}
              >
                {getPlanLabel(subscriptionInfo.plan)}
              </button>
            )}
            <button
              onClick={() => setAppView('settings')}
              className="h-10 w-10 inline-flex items-center justify-center rounded-lg border border-transparent text-muted-foreground hover:text-foreground hover:border-border hover:bg-secondary transition-colors"
              title="ตั้งค่า"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              onClick={onSignOut}
              className="h-10 w-10 inline-flex items-center justify-center rounded-lg border border-transparent text-muted-foreground hover:text-foreground hover:border-border hover:bg-secondary transition-colors"
              title="ออกจากระบบ"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Desktop tab bar */}
        {hasProjects && selectedProject ? (
          <div className="hidden md:block max-w-5xl mx-auto px-4">
            <div className="flex gap-1 -mb-px">
              {TABS.map((tab) => {
                const TabIcon = tab.icon;
                const tabButtonClass = activeTab === tab.key
                  ? 'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors border-primary text-primary'
                  : 'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors border-transparent text-muted-foreground hover:text-foreground hover:border-wood-300';

                return (
                  <button
                    key={tab.key}
                    onClick={() => handleNavigateTab(tab.key)}
                    className={tabButtonClass}
                  >
                    <TabIcon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </header>

      {/* ── Main Content ───────────────────────── */}
      <main className="max-w-5xl mx-auto px-4 py-4 sm:py-6" {...(viewingDoc ? { 'data-print-hide': true } : {})}>
        {!hasProjects ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 bg-wood-50 rounded-2xl flex items-center justify-center mb-4">
              <ClipboardList className="w-10 h-10 text-wood-400" />
            </div>
            <h2 className="text-lg font-semibold text-foreground mb-1">ยังไม่มีโปรเจค</h2>
            <p className="text-sm text-muted-foreground mb-6 max-w-xs">
              สร้างโปรเจคแรกของคุณ — เลือก Template แล้วระบบสร้างเอกสารครบ Flow ให้ทันที
            </p>
            <button
              onClick={() => setAppView('new-project')}
              className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground text-sm font-semibold rounded-xl hover:bg-wood-900 transition-colors shadow-sm"
            >
              <Plus className="w-5 h-5" />
              สร้างโปรเจคใหม่
            </button>
            <div className="mt-12 w-full max-w-2xl">
              <div style={{ contentVisibility: 'auto', containIntrinsicSize: '360px' }}>
                <PartnerAds />
              </div>
            </div>
          </div>
        ) : !selectedProject ? (
          <div className="text-center py-20 text-muted-foreground text-sm">กรุณาเลือกโปรเจค</div>
        ) : (
          <>
            <Suspense fallback={<div className="py-10 text-center text-sm text-muted-foreground">กำลังโหลด...</div>}>
              {activeTab === 'dashboard' && (
                <DashboardTab
                  session={session}
                  companyProfile={companyProfile}
                  project={selectedProject}
                  pricingSummary={pricingSummary}
                  installments={customerInstallments}
                  contractors={contractors}
                  onNavigate={handleNavigateTab}
                  onViewDoc={(type) => openDocumentViewer(type)}
                  onOpenSettings={handleOpenSettings}
                />
              )}

              {activeTab === 'customer' && pricingSummary && (
                <CustomerDocumentsStep
                  project={selectedProject}
                  pricing={pricing}
                  pricingSummary={pricingSummary}
                  installments={customerInstallments}
                  onInstallmentsChange={handleInstallmentsChange}
                  onPricingChange={setPricing}
                  onViewDoc={(type) => openDocumentViewer(type)}
                />
              )}

              {activeTab === 'procurement' && (
                <ProcurementStep
                  project={selectedProject}
                  materialCategories={materialCategories}
                  onViewDoc={(type) => openDocumentViewer(type)}
                />
              )}

              {activeTab === 'contractor' && pricingSummary && (
                <ContractorStep
                  project={selectedProject}
                  pricingSummary={pricingSummary}
                  contractorMode={contractorMode}
                  contractors={contractors}
                  onModeChange={setContractorMode}
                  onContractorsChange={setContractors}
                  customerInstallments={customerInstallments}
                  onViewDoc={(type, installment) => openDocumentViewer(type, { installment })}
                />
              )}

              {activeTab === 'finance' && pricingSummary && (
                <FinanceStep
                  project={selectedProject}
                  pricing={pricing}
                  pricingSummary={pricingSummary}
                  installments={customerInstallments}
                  contractors={contractors}
                  onViewDoc={(type) => openDocumentViewer(type)}
                />
              )}
            </Suspense>

          </>
        )}
      </main>

      {/* Document Viewer Modal */}
      {viewingDoc && selectedProject && (
        <Suspense fallback={<div className="fixed inset-0 z-50 bg-white/80 backdrop-blur-sm" />}>
          <DocumentViewer
            docType={viewingDoc.type}
            project={selectedProject}
            companyProfile={companyProfile}
            installmentNumber={viewingDoc.installment}
            categoryFilter={viewingDoc.categoryFilter}
            onClose={() => setViewingDoc(null)}
            userId={session.user.id}
            workspaceMode={session.workspaceMode}
            canExport={!isFreeTier}
            onUpgradeRequired={() => promptUpgrade('export')}
            onProjectUpdate={(updated) => {
              const updatedProjects = projects.map((p) =>
                p.id === updated.id ? updated : p,
              );
              handleProjectsChange(updatedProjects);
            }}
          />
        </Suspense>
      )}

      {/* ── Mobile Premium Bottom Tab Bar ──────────────── */}
      {hasProjects && selectedProject && (
        <div className="md:hidden fixed inset-x-0 bottom-0 z-40 px-3 pb-[calc(env(safe-area-inset-bottom)+1rem)] print:hidden">
          <nav className="rounded-3xl border border-border bg-card/90 p-1.5 shadow-[0_8px_32px_rgba(87,74,61,0.12)] backdrop-blur-2xl flex items-stretch">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.key;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => handleNavigateTab(tab.key)}
                  className="relative flex-1 flex flex-col items-center justify-center transition-all duration-500 ease-out py-2"
                >
                  {/* Blooming indicator behind active tab */}
                  <div className={`
                    absolute inset-0 flex items-center justify-center transition-all duration-500 ease-out
                    ${isActive ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}
                  `}>
                    <div className="w-full h-full mx-1 rounded-[1.2rem] bg-gradient-to-tr from-wood-800 to-wood-700 shadow-[0_4px_16px_rgba(87,74,61,0.25)]"></div>
                  </div>

                  {/* Icon */}
                  <Icon className={`
                    relative z-10 my-0.5 transition-all duration-500 ease-out
                    ${isActive ? 'w-5 h-5 text-white scale-110 drop-shadow-sm' : 'w-5 h-5 text-muted-foreground group-hover:text-foreground'}
                  `} strokeWidth={isActive ? 2.5 : 2} />

                  {/* Label */}
                  <span className={`
                    relative z-10 text-[9px] sm:text-[10px] leading-tight transition-all duration-500 ease-out mt-0.5
                    ${isActive ? 'font-bold text-white tracking-wide' : 'font-medium text-slate-400'}
                  `}>
                    {tab.shortLabel}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>
      )}
    </div>
  );
}
