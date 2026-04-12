import {
  Suspense, lazy, startTransition, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState, type ComponentType } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  BarChart3, Building2, Calendar, ChevronDown, Crown, DollarSign, FileCheck,
  AlertTriangle, CheckCircle2, CircleHelp, Clock3, FileSignature, FileText, FolderOpen, Home, ImageIcon, LoaderCircle, LogOut, Menu, Receipt, RefreshCcw, Search, Settings, ShoppingCart,
  SquarePen, TrendingUp, WalletCards,
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { ExportAllButton } from './ExportAllButton';
import {
  loadProjects,
  loadWorkspaceUiState,
  resetToDefault,
  saveProjects,
  saveWorkspaceUiState,
} from '../utils/storageUtils';
import { prepareProjectDocuments, type ProjectData } from '../utils/projectData';
import {
  canAccessTab, filterProjectsForUser, getAllowedTabsForUser,
} from '../utils/authAccess';
import type { AuthSession } from '../utils/authSession';
import type { AppTab, WorkspaceDocumentTab } from '../utils/workspaceTabs';
import { loadCompanyProfile, saveCompanyProfile, type CompanyProfile } from '../utils/companyProfile';
import { loadThemeId, getThemeById, applyTheme, saveThemeId } from '../utils/themePresets';
import { ENABLE_SPECIAL_PROJECTS } from '../utils/runtimeFlags';
import {
  loadCompanyProfileFromCloud,
  saveCompanyProfileToCloud,
  saveProjectsToCloud,
  subscribeCloudProjects,
} from '../utils/cloudWorkspace';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from './ui/drawer';
import { EzBOQLogo } from './EzBOQLogo';

const specialProjectIds = ENABLE_SPECIAL_PROJECTS
  ? new Set([
      'villa-ratchathewi-room175',
      'construction-floor-masonry',
      'phase3-electrical-ceiling-plumbing',
      'phase4-builtin-furniture',
      'phase5-final-finishing',
      'centro-ratchaphruek-suanphak',
    ])
  : new Set<string>();

const CLOUD_SYNC_DEBOUNCE_MS = 900;

type SyncStatus = 'hydrating' | 'queued' | 'saving' | 'synced' | 'error' | 'local';

function getSyncedLabel() {
  return `ซิงก์ล่าสุด ${new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}`;
}

type ExtractLazyComponent<TModule, TKey extends keyof TModule> =
  TModule[TKey] extends ComponentType<infer TProps> ? ComponentType<TProps> : never;

function lazyNamed<TModule, TKey extends keyof TModule>(
  loader: () => Promise<TModule>,
  key: TKey,
) {
  return lazy(() =>
    loader().then((module) => ({
      default: module[key] as ExtractLazyComponent<TModule, TKey>,
    })),
  );
}

const QuotationDocument = lazyNamed(() => import('./QuotationDocument'), 'QuotationDocument');
const PurchaseOrderDocument = lazyNamed(() => import('./PurchaseOrderDocument'), 'PurchaseOrderDocument');
const CustomerQuotationDocument = lazyNamed(() => import('./CustomerQuotationDocument'), 'CustomerQuotationDocument');
const PresentationBoardDocument = lazyNamed(() => import('./PresentationBoardDocument'), 'PresentationBoardDocument');
const InvoiceDocument = lazyNamed(() => import('./InvoiceDocument'), 'InvoiceDocument');
const WorkPlanDocument = lazyNamed(() => import('./WorkPlanDocument'), 'WorkPlanDocument');
const PriceComparisonDocument = lazyNamed(() => import('./PriceComparisonDocument'), 'PriceComparisonDocument');
const ReceiptDocument = lazyNamed(() => import('./ReceiptDocument'), 'ReceiptDocument');
const ContractorInvoiceDocument = lazyNamed(() => import('./ContractorInvoiceDocument'), 'ContractorInvoiceDocument');
const SummaryInvoiceDocument = lazyNamed(() => import('./SummaryInvoiceDocument'), 'SummaryInvoiceDocument');
const VatInvoiceDocument = lazyNamed(() => import('./VatInvoiceDocument'), 'VatInvoiceDocument');
const WithholdingTaxDocument = lazyNamed(() => import('./WithholdingTaxDocument'), 'WithholdingTaxDocument');
const ProjectDashboardWorkspace = lazyNamed(() => import('./ProjectDashboardWorkspace'), 'ProjectDashboardWorkspace');
const ContractDocument = lazyNamed(() => import('./ContractDocument'), 'ContractDocument');
const ProjectManager = lazyNamed(() => import('./ProjectManager'), 'ProjectManager');
const AdvancedQuotationEditor = lazyNamed(() => import('./AdvancedQuotationEditor'), 'AdvancedQuotationEditor');
const CompanyProfileSettings = lazyNamed(() => import('./CompanyProfileSettings'), 'CompanyProfileSettings');
const HomeDashboard = lazyNamed(() => import('./HomeDashboard'), 'HomeDashboard');
const PipelineWizard = lazyNamed(() => import('../features/pipeline'), 'ProjectWizard');
const Villa175DocumentsPage = ENABLE_SPECIAL_PROJECTS
  ? lazyNamed(() => import('./Villa175DocumentsPage'), 'Villa175DocumentsPage')
  : null;
const ConstructionDocumentsPage = ENABLE_SPECIAL_PROJECTS
  ? lazyNamed(() => import('./ConstructionDocumentsPage'), 'ConstructionDocumentsPage')
  : null;
const Phase3DocumentsPage = ENABLE_SPECIAL_PROJECTS
  ? lazyNamed(() => import('./Phase3DocumentsPage'), 'Phase3DocumentsPage')
  : null;
const Phase4DocumentsPage = ENABLE_SPECIAL_PROJECTS
  ? lazyNamed(() => import('./Phase4DocumentsPage'), 'Phase4DocumentsPage')
  : null;
const Phase5DocumentsPage = ENABLE_SPECIAL_PROJECTS
  ? lazyNamed(() => import('./Phase5DocumentsPage'), 'Phase5DocumentsPage')
  : null;
const CentroDocumentsPage = ENABLE_SPECIAL_PROJECTS
  ? lazyNamed(() => import('./CentroDocumentsPage'), 'CentroDocumentsPage')
  : null;

function WorkspaceContentFallback({ label = 'กำลังโหลดเอกสาร...' }: { label?: string }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white px-6 py-10 text-center shadow-sm">
      <p className="text-[10px] tracking-[0.2em] uppercase text-stone-400">Loading</p>
      <p className="mt-3 text-sm text-stone-600">{label}</p>
    </div>
  );
}

interface TabDef {
  label: string;
  description: string;
  icon: LucideIcon;
  relatedTabs: AppTab[];
}

const tabs: Record<AppTab, TabDef> = {
  home: {
    label: 'Dashboard',
    description: 'ภาพรวมรายรับ รายจ่าย กำไร และสถิติของทุกโครงการ',
    icon: Home,
    relatedTabs: ['dashboard'],
  },
  dashboard: {
    label: 'หน้าโครงการ',
    description: 'ภาพรวมโครงการและทางลัดสำหรับเริ่มทำงานต่อจาก flow หลัก',
    icon: BarChart3,
    relatedTabs: ['quotation', 'customer-quotation', 'workplan'],
  },
  quotation: {
    label: 'ต้นทุน / BOQ',
    description: 'ตั้งต้นทุน ตรวจรายการ และเก็บฐานตัวเลขก่อนออกเอกสารลูกค้า',
    icon: FileText,
    relatedTabs: ['purchase-order', 'comparison', 'edit'],
  },
  'purchase-order': {
    label: 'ใบสั่งซื้อ',
    description: 'สรุปรายการวัสดุที่ต้องจัดซื้อจาก BOQ เพื่อเตรียมเข้าหน้างาน',
    icon: ShoppingCart,
    relatedTabs: ['quotation', 'workplan', 'manage'],
  },
  'customer-quotation': {
    label: 'เอกสารลูกค้า',
    description: 'เอกสารเสนอราคาและขอบเขตงานสำหรับสื่อสารกับลูกค้า',
    icon: DollarSign,
    relatedTabs: ['presentation-board', 'invoice', 'contract'],
  },
  'presentation-board': {
    label: 'Presentation',
    description: 'บอร์ดนำเสนอภาพงานในรูปแบบพร้อมพรีเซนต์ให้ลูกค้า',
    icon: ImageIcon,
    relatedTabs: ['customer-quotation', 'invoice', 'contract'],
  },
  comparison: {
    label: 'เปรียบเทียบราคา',
    description: 'เช็กต้นทุน ราคาขาย และ margin ก่อนสรุปตัวเลขสุดท้าย',
    icon: TrendingUp,
    relatedTabs: ['quotation', 'customer-quotation', 'invoice'],
  },
  edit: {
    label: 'แก้ไข BOQ',
    description: 'แก้ปริมาณ ราคา และรายการภายใน BOQ เมื่อข้อมูลเปลี่ยน',
    icon: SquarePen,
    relatedTabs: ['quotation', 'comparison', 'dashboard'],
  },
  invoice: {
    label: 'ใบวางบิล',
    description: 'เริ่มรอบเก็บเงินด้วยเอกสารวางบิลที่พร้อมใช้งาน',
    icon: Receipt,
    relatedTabs: ['summary-invoice', 'receipt', 'workplan'],
  },
  'contractor-invoice': {
    label: 'ใบเบิกช่าง',
    description: 'ควบคุมเอกสารเบิกงวดของผู้รับเหมาและการจ่ายงาน',
    icon: WalletCards,
    relatedTabs: ['summary-invoice', 'workplan', 'manage'],
  },
  'summary-invoice': {
    label: 'สรุปบิล',
    description: 'รวมสถานะการเก็บเงินและตรวจความครบของเอกสารการเงิน',
    icon: WalletCards,
    relatedTabs: ['receipt', 'invoice', 'dashboard'],
  },
  receipt: {
    label: 'ใบเสร็จ',
    description: 'ออกเอกสารรับชำระเพื่อปิดรอบเก็บเงินของโครงการ',
    icon: FileCheck,
    relatedTabs: ['summary-invoice', 'dashboard', 'contract'],
  },
  'vat-invoice': {
    label: 'ใบกำกับภาษี',
    description: 'ออกใบกำกับภาษีมูลค่าเพิ่ม (VAT 7%) สำหรับเรียกเก็บเงินลูกค้า',
    icon: FileText,
    relatedTabs: ['invoice', 'receipt', 'withholding-tax'],
  },
  'withholding-tax': {
    label: 'หัก ณ ที่จ่าย',
    description: 'ใบหักภาษี ณ ที่จ่าย (ภ.ง.ด.3/53) สำหรับงานจ้างรับเหมาก่อสร้าง',
    icon: FileCheck,
    relatedTabs: ['vat-invoice', 'invoice', 'receipt'],
  },
  workplan: {
    label: 'แผนงาน',
    description: 'กำหนดลำดับงาน ติดตามสถานะ และเตรียมส่งมอบโครงการ',
    icon: Calendar,
    relatedTabs: ['contract', 'invoice', 'dashboard'],
  },
  contract: {
    label: 'สัญญา',
    description: 'เงื่อนไขและข้อตกลงหลักก่อนเริ่มงานหรือปิดโครงการ',
    icon: FileSignature,
    relatedTabs: ['workplan', 'receipt', 'customer-quotation'],
  },
  pipeline: {
    label: 'สร้างโปรเจค',
    description: 'สร้างโปรเจคใหม่ครบ flow ตั้งแต่ BOQ ถึงใบเสร็จใน 5 ขั้นตอน',
    icon: Crown,
    relatedTabs: ['dashboard', 'quotation', 'invoice'],
  },
  manage: {
    label: 'จัดการโครงการ',
    description: 'ดูแลข้อมูลหลักของโครงการและเอกสารภายในระบบ',
    icon: Settings,
    relatedTabs: ['dashboard', 'edit', 'quotation'],
  },
  'company-settings': {
    label: 'ตั้งค่าบริษัท',
    description: 'ข้อมูลบริษัท โลโก้ ลายเซ็น และบัญชีที่ใช้บนเอกสารทุกชุด',
    icon: Building2,
    relatedTabs: ['dashboard'],
  },
};

const navGroups = [
  { key: 'home', label: 'หน้าหลัก', tabs: ['home', 'pipeline', 'dashboard'] as AppTab[] },
  { key: 'pricing', label: 'ก่อนขาย', tabs: ['quotation', 'customer-quotation', 'presentation-board', 'comparison', 'edit'] as AppTab[] },
  { key: 'procurement', label: 'จัดซื้อ', tabs: ['purchase-order'] as AppTab[] },
  { key: 'billing',  label: 'การเงิน',  tabs: ['invoice', 'contractor-invoice', 'summary-invoice', 'receipt', 'vat-invoice', 'withholding-tax'] as AppTab[] },
  { key: 'deliver',  label: 'ส่งมอบ', tabs: ['workplan', 'contract', 'manage'] as AppTab[] },
  { key: 'settings', label: 'ตั้งค่า', tabs: ['company-settings'] as AppTab[] },
];

function toDocumentTabs(t: AppTab[]): WorkspaceDocumentTab[] {
  return t.filter((tab): tab is WorkspaceDocumentTab => tab !== 'home' && tab !== 'dashboard' && tab !== 'pipeline' && tab !== 'company-settings');
}

interface WorkspaceShellProps {
  session: AuthSession;
  onSignOut: () => void;
  onOpenGuide: () => void;
  onOpenShopRoute?: () => void;
  onRetryCloudSync?: () => Promise<boolean> | boolean;
  onOpenPricing?: () => void;
}

export function WorkspaceShell({
  session,
  onSignOut,
  onOpenGuide,
  onOpenShopRoute,
  onRetryCloudSync,
  onOpenPricing,
}: WorkspaceShellProps) {
  const [activeTab, setActiveTab] = useState<AppTab>(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.replace(/^#\/?/, '').trim().toLowerCase();
      if (hash === 'pipeline') return 'pipeline';
    }
    return 'home';
  });
  const [isLoading, setIsLoading] = useState(true);
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [showSpecialPage, setShowSpecialPage] = useState(false);
  const [contractorInstallment, setContractorInstallment] = useState(1);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobileProjectHubOpen, setMobileProjectHubOpen] = useState(false);
  const [mobileProjectQuery, setMobileProjectQuery] = useState('');
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile>(() => loadCompanyProfile());
  const [currentThemeId, setCurrentThemeId] = useState(() => loadThemeId());
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('hydrating');
  const [syncMessage, setSyncMessage] = useState('กำลังโหลดข้อมูลจากระบบกลาง');
  const [isRetryingCloudSync, setIsRetryingCloudSync] = useState(false);
  const [isOnline, setIsOnline] = useState(() => (typeof window === 'undefined' ? true : window.navigator.onLine));
  const projectSyncTimerRef = useRef<number | null>(null);
  const companySyncTimerRef = useRef<number | null>(null);
  const pendingProjectsRef = useRef<ProjectData[] | null>(null);
  const pendingCompanyProfileRef = useRef<CompanyProfile | null>(null);
  const projectSyncSequenceRef = useRef(0);
  const companySyncSequenceRef = useRef(0);

  const clearProjectSyncTimer = useCallback(() => {
    if (projectSyncTimerRef.current !== null && typeof window !== 'undefined') {
      window.clearTimeout(projectSyncTimerRef.current);
      projectSyncTimerRef.current = null;
    }
  }, []);

  const clearCompanySyncTimer = useCallback(() => {
    if (companySyncTimerRef.current !== null && typeof window !== 'undefined') {
      window.clearTimeout(companySyncTimerRef.current);
      companySyncTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    applyTheme(getThemeById(currentThemeId));
  }, [currentThemeId]);

  useEffect(() => () => {
    clearProjectSyncTimer();
    clearCompanySyncTimer();
  }, [clearCompanySyncTimer, clearProjectSyncTimer]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const updateOnlineStatus = () => {
      setIsOnline(window.navigator.onLine);
    };

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  const handleThemeChange = useCallback((themeId: string) => {
    setCurrentThemeId(themeId);
    saveThemeId(themeId);
  }, []);

  useEffect(() => {
    const loaded = loadProjects();
    setProjects(loaded);
    if (typeof window !== 'undefined') {
      const workspaceUiState = loadWorkspaceUiState(loaded);
      if (workspaceUiState.selectedProjectId && loaded.find((project) => project.id === workspaceUiState.selectedProjectId)) {
        setSelectedProjectId(workspaceUiState.selectedProjectId);
        setShowSpecialPage(ENABLE_SPECIAL_PROJECTS && workspaceUiState.showSpecialPage);
      } else {
        setSelectedProjectId(loaded[0]?.id || '');
      }
    } else {
      setSelectedProjectId(loaded[0]?.id || '');
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    let active = true;

    if (session.workspaceMode && session.workspaceMode !== 'cloud') {
      setSyncStatus(isOnline ? 'error' : 'local');
      setSyncMessage(
        isOnline
          ? 'เชื่อมต่อระบบกลางไม่สำเร็จ จึงเปิดข้อมูลล่าสุดในเครื่องก่อน'
          : 'ออฟไลน์อยู่ กำลังใช้ข้อมูลล่าสุดในเครื่อง',
      );
      return () => {
        active = false;
      };
    }

    setSyncStatus('hydrating');
    setSyncMessage('กำลังโหลดข้อมูลจากระบบกลาง');

    loadCompanyProfileFromCloud(session.user)
      .then((profile) => {
        if (!active || !profile) return;
        saveCompanyProfile(profile);
        setCompanyProfile(profile);
      })
      .catch((error) => {
        console.error('Failed to load cloud company profile:', error);
      });

    const unsubscribe = subscribeCloudProjects(
      session.user,
      (cloudProjects) => {
        if (!active) return;
        const cachedProjects = saveProjects(cloudProjects);
        setProjects(cachedProjects);
        setSyncStatus('synced');
        setSyncMessage(`ซิงก์ล่าสุด ${new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}`);
      },
      (error) => {
        if (!active) return;
        console.error('Failed to hydrate cloud projects:', error);
        setSyncStatus('error');
        setSyncMessage(
          isOnline
            ? 'เชื่อมต่อระบบกลางไม่สำเร็จ กำลังใช้ข้อมูลล่าสุดในเครื่อง'
            : 'ออฟไลน์อยู่ กำลังใช้ข้อมูลล่าสุดในเครื่อง',
        );
      },
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, [isOnline, session.user, session.workspaceMode]);

  const accessibleProjects = useMemo(
    () => filterProjectsForUser(projects, session.user),
    [projects, session.user],
  );
  const allowedTabs = useMemo(
    () => getAllowedTabsForUser(session.user),
    [session.user],
  );
  const availableTabs = useMemo(
    () => (allowedTabs.length > 0 ? allowedTabs : ['dashboard' as AppTab]),
    [allowedTabs],
  );
  const availableDocumentTabs = useMemo(
    () => toDocumentTabs(allowedTabs),
    [allowedTabs],
  );
  const showFinancialInsights = useMemo(
    () => canAccessTab(session.user, 'quotation') || canAccessTab(session.user, 'comparison'),
    [session.user],
  );

  useEffect(() => {
    if (!selectedProjectId) return;
    saveWorkspaceUiState({ selectedProjectId, showSpecialPage });
  }, [selectedProjectId, showSpecialPage]);

  useEffect(() => {
    if (!mobileProjectHubOpen) {
      setMobileProjectQuery('');
    }
  }, [mobileProjectHubOpen]);

  useEffect(() => {
    if (accessibleProjects.length === 0) {
      if (selectedProjectId !== '') setSelectedProjectId('');
      if (showSpecialPage) setShowSpecialPage(false);
      if (activeTab !== 'home' && activeTab !== 'pipeline' && activeTab !== 'manage' && activeTab !== 'company-settings') setActiveTab('home');
      return;
    }
    if (!accessibleProjects.some(p => p.id === selectedProjectId)) {
      setSelectedProjectId(accessibleProjects[0].id);
      setActiveTab('home');
      setShowSpecialPage(false);
    }
  }, [accessibleProjects, selectedProjectId, showSpecialPage]);

  useEffect(() => {
    if (!availableTabs.includes(activeTab)) setActiveTab(availableTabs[0]);
  }, [activeTab, availableTabs]);

  const selectedProject = useMemo(
    () => accessibleProjects.find(p => p.id === selectedProjectId) || accessibleProjects[0],
    [accessibleProjects, selectedProjectId],
  );

  const activeTabDef = tabs[activeTab];
  const relatedTabs = useMemo(
    () => activeTabDef.relatedTabs.filter((tab) => availableTabs.includes(tab) && tab !== activeTab).slice(0, 3),
    [activeTab, activeTabDef.relatedTabs, availableTabs],
  );
  const selectedProjectSnapshot = useMemo(() => {
    if (!selectedProject) return null;
    const boqItems = selectedProject.quotationData.filter((item) => item.quantity !== '' && item.quantity !== undefined);
    const boqSections = selectedProject.quotationData.filter((item) => item.quantity === '' && !item.no.includes('.'));
    return {
      boqItems: boqItems.length,
      boqSections: boqSections.length,
      owner: selectedProject.owner,
      phone: selectedProject.phone,
    };
  }, [selectedProject]);
  const mobileProjectResults = useMemo(() => {
    const ordered = [...accessibleProjects].sort((left, right) => {
      if (left.id === selectedProjectId) return -1;
      if (right.id === selectedProjectId) return 1;
      return left.name.localeCompare(right.name, 'th');
    });

    const query = mobileProjectQuery.trim().toLocaleLowerCase();
    if (!query) return ordered;

    return ordered.filter((project) =>
      [project.name, project.owner, project.phone, project.address]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase()
        .includes(query),
    );
  }, [accessibleProjects, mobileProjectQuery, selectedProjectId]);
  const showProjectContext = Boolean(selectedProject && activeTab !== 'home' && activeTab !== 'pipeline' && activeTab !== 'company-settings');
  const userInitials = useMemo(() => {
    const parts = session.user.name
      .split(/\s+/)
      .map((part) => part.trim())
      .filter(Boolean);

    if (parts.length === 0) return 'EZ';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0] || ''}${parts[parts.length - 1][0] || ''}`.toUpperCase();
  }, [session.user.name]);

  const flushProjectsToCloud = useCallback(async (nextProjects?: ProjectData[]) => {
    if (session.workspaceMode && session.workspaceMode !== 'cloud') return;

    const payload = nextProjects ?? pendingProjectsRef.current;
    if (!payload) return;

    pendingProjectsRef.current = null;
    clearProjectSyncTimer();
    const syncId = projectSyncSequenceRef.current + 1;
    projectSyncSequenceRef.current = syncId;
    setSyncStatus('saving');
    setSyncMessage('กำลังบันทึกโครงการขึ้นระบบกลาง');

    try {
      const cloudProjects = await saveProjectsToCloud(session.user, payload);
      if (projectSyncSequenceRef.current !== syncId) return;
      const cachedProjects = saveProjects(cloudProjects);
      setProjects(cachedProjects);
      setSyncStatus('synced');
      setSyncMessage(getSyncedLabel());
    } catch (error) {
      if (projectSyncSequenceRef.current !== syncId) return;
      console.error('Failed to save projects to cloud:', error);
      setSyncStatus('error');
      setSyncMessage('บันทึกขึ้นระบบกลางไม่สำเร็จ ข้อมูลถูกเก็บไว้ในเครื่องก่อน');
      toast.error('บันทึกโครงการขึ้นระบบกลางไม่สำเร็จ', {
        description: 'ระบบเก็บฉบับล่าสุดไว้ใน browser ก่อนแล้ว กรุณาลองใหม่เมื่ออินเทอร์เน็ตพร้อม',
      });
    }
  }, [clearProjectSyncTimer, session.user, session.workspaceMode]);

  const queueProjectsToCloud = useCallback((nextProjects: ProjectData[]) => {
    if (session.workspaceMode && session.workspaceMode !== 'cloud') return;
    pendingProjectsRef.current = nextProjects;
    clearProjectSyncTimer();
    setSyncStatus('queued');
    setSyncMessage('เตรียมซิงก์โครงการขึ้นระบบกลาง');
    if (typeof window !== 'undefined') {
      projectSyncTimerRef.current = window.setTimeout(() => {
        void flushProjectsToCloud();
      }, CLOUD_SYNC_DEBOUNCE_MS);
    }
  }, [clearProjectSyncTimer, flushProjectsToCloud, session.workspaceMode]);

  const flushCompanyProfileToCloudQueued = useCallback(async (nextProfile?: CompanyProfile) => {
    if (session.workspaceMode && session.workspaceMode !== 'cloud') return;

    const payload = nextProfile ?? pendingCompanyProfileRef.current;
    if (!payload) return;

    pendingCompanyProfileRef.current = null;
    clearCompanySyncTimer();
    const syncId = companySyncSequenceRef.current + 1;
    companySyncSequenceRef.current = syncId;
    setSyncStatus('saving');
    setSyncMessage('กำลังบันทึกข้อมูลบริษัทขึ้นระบบกลาง');

    try {
      const normalizedProfile = await saveCompanyProfileToCloud(session.user, payload);
      if (companySyncSequenceRef.current !== syncId) return;
      saveCompanyProfile(normalizedProfile);
      setCompanyProfile(normalizedProfile);
      setSyncStatus('synced');
      setSyncMessage(getSyncedLabel());
      toast.success('บันทึกข้อมูลบริษัทขึ้นระบบกลางแล้ว');
    } catch (error) {
      if (companySyncSequenceRef.current !== syncId) return;
      console.error('Failed to save company profile to cloud:', error);
      setSyncStatus('error');
      setSyncMessage('บันทึกข้อมูลบริษัทขึ้นระบบกลางไม่สำเร็จ ข้อมูลถูกเก็บไว้ในเครื่องก่อน');
      toast.error('บันทึกข้อมูลบริษัทขึ้นระบบกลางไม่สำเร็จ', {
        description: 'ระบบเก็บฉบับล่าสุดไว้ใน browser ก่อนแล้ว',
      });
    }
  }, [clearCompanySyncTimer, session.user, session.workspaceMode]);

  const queueCompanyProfileToCloud = useCallback((profile: CompanyProfile) => {
    if (session.workspaceMode && session.workspaceMode !== 'cloud') return;
    pendingCompanyProfileRef.current = profile;
    clearCompanySyncTimer();
    setSyncStatus('queued');
    setSyncMessage('เตรียมซิงก์ข้อมูลบริษัทขึ้นระบบกลาง');
    if (typeof window !== 'undefined') {
      companySyncTimerRef.current = window.setTimeout(() => {
        void flushCompanyProfileToCloudQueued();
      }, CLOUD_SYNC_DEBOUNCE_MS);
    }
  }, [clearCompanySyncTimer, flushCompanyProfileToCloudQueued, session.workspaceMode]);

  useEffect(() => {
    if (!isOnline) return;
    if (session.workspaceMode && session.workspaceMode !== 'cloud') return;

    if (pendingProjectsRef.current) {
      void flushProjectsToCloud();
    }
    if (pendingCompanyProfileRef.current) {
      void flushCompanyProfileToCloudQueued();
    }
  }, [
    flushCompanyProfileToCloudQueued,
    flushProjectsToCloud,
    isOnline,
    session.workspaceMode,
  ]);

  const handleSelectProject = useCallback((id: string) => {
    setSidebarOpen(false);
    setMobileProjectHubOpen(false);
    startTransition(() => {
      setSelectedProjectId(id);
      setActiveTab('dashboard');
      setShowSpecialPage(false);
    });
  }, []);

  const handleProjectsChange = useCallback((updated: ProjectData[]) => {
    if (!session.user.canManageProjects) return;
    const normalizedProjects = updated.map((project) => prepareProjectDocuments(project));
    const preparedProjects = saveProjects(normalizedProjects);
    const nextProjects = preparedProjects.length > 0 ? preparedProjects : normalizedProjects;
    const accessible = filterProjectsForUser(nextProjects, session.user);

    if (session.workspaceMode && session.workspaceMode !== 'cloud') {
      startTransition(() => {
        setProjects(nextProjects);
        if (!accessible.find(p => p.id === selectedProjectId)) {
          setSelectedProjectId(accessible[0]?.id || '');
          setActiveTab('home');
          setShowSpecialPage(false);
        }
      });
      setSyncStatus(isOnline ? 'error' : 'local');
      setSyncMessage(
        isOnline
          ? 'บันทึกไว้ในเครื่องแล้ว รอเชื่อมต่อระบบกลางอีกครั้ง'
          : 'ออฟไลน์อยู่ ข้อมูลล่าสุดถูกบันทึกไว้ในเครื่อง',
      );
      return;
    }

    startTransition(() => {
      setProjects(nextProjects);
      if (!accessible.find(p => p.id === selectedProjectId)) {
        setSelectedProjectId(accessible[0]?.id || '');
        setActiveTab('home');
        setShowSpecialPage(false);
      }
    });
    queueProjectsToCloud(nextProjects);
  }, [isOnline, queueProjectsToCloud, selectedProjectId, session.user, session.workspaceMode]);

  const handleResetProjects = useCallback(() => {
    if (!session.user.canResetDemoData) return;
    const defaults = resetToDefault();
    handleProjectsChange(defaults);
  }, [handleProjectsChange, session.user.canResetDemoData]);

  const handleProjectUpdate = useCallback((updatedProject: ProjectData) => {
    handleProjectsChange(projects.map(p => p.id === updatedProject.id ? updatedProject : p));
  }, [handleProjectsChange, projects]);

  const handleSaveCompanyProfile = useCallback((profile: CompanyProfile) => {
    saveCompanyProfile(profile);
    setCompanyProfile(profile);

    if (session.workspaceMode && session.workspaceMode !== 'cloud') {
      setSyncStatus(isOnline ? 'error' : 'local');
      setSyncMessage(
        isOnline
          ? 'บันทึกข้อมูลบริษัทไว้ในเครื่องแล้ว รอเชื่อมต่อระบบกลางอีกครั้ง'
          : 'ออฟไลน์อยู่ ข้อมูลบริษัทล่าสุดถูกบันทึกไว้ในเครื่อง',
      );
      return;
    }
    queueCompanyProfileToCloud(profile);
  }, [isOnline, queueCompanyProfileToCloud, session.workspaceMode]);

  const handleRetryCloudConnection = useCallback(async () => {
    if (!onRetryCloudSync || isRetryingCloudSync) return;

    setIsRetryingCloudSync(true);
    setSyncStatus('saving');
    setSyncMessage('กำลังเชื่อมต่อระบบกลางอีกครั้ง');

    try {
      const restored = await onRetryCloudSync();
      if (restored) {
        setSyncStatus('hydrating');
        setSyncMessage('กำลังโหลดข้อมูลจากระบบกลาง');
        return;
      }

      setSyncStatus(isOnline ? 'error' : 'local');
      setSyncMessage(
        isOnline
          ? 'เชื่อมต่อระบบกลางอีกครั้งไม่สำเร็จ'
          : 'ออฟไลน์อยู่ กำลังใช้ข้อมูลล่าสุดในเครื่อง',
      );
      toast.error('ยังเชื่อมต่อระบบกลางไม่ได้', {
        description: 'ระบบยังเปิดข้อมูลล่าสุดในเครื่องไว้ให้ทำงานต่อได้ก่อน',
      });
    } finally {
      setIsRetryingCloudSync(false);
    }
  }, [isOnline, isRetryingCloudSync, onRetryCloudSync]);

  const handleOpenShopRoute = useCallback(() => {
    if (!selectedProject || !onOpenShopRoute) return;
    setSidebarOpen(false);
    setMobileProjectHubOpen(false);
    onOpenShopRoute();
  }, [onOpenShopRoute, selectedProject]);

  const navigateToTab = useCallback((tab: AppTab) => {
    if (!availableTabs.includes(tab)) return;
    setSidebarOpen(false);
    setMobileProjectHubOpen(false);
    startTransition(() => {
      setActiveTab(tab);
    });
  }, [availableTabs]);

  const visibleGroups = useMemo(
    () => navGroups
      .map(g => ({ ...g, tabs: g.tabs.filter(t => availableTabs.includes(t)) }))
      .filter(g => g.tabs.length > 0),
    [availableTabs],
  );
  const deferredActiveTab = useDeferredValue(activeTab);
  const deferredSelectedProject = useDeferredValue(selectedProject);
  const deferredAccessibleProjects = useDeferredValue(accessibleProjects);
  const deferredAvailableDocumentTabs = useDeferredValue(availableDocumentTabs);

  const renderedContent = useMemo(() => {
    // Tabs that don't require a selected project
    switch (deferredActiveTab) {
      case 'home':
        return (
          <HomeDashboard
            projects={deferredAccessibleProjects}
            showFinancialInsights={showFinancialInsights}
            onSelectProject={handleSelectProject}
            onCreateProject={session.user.canManageProjects ? () => navigateToTab('manage') : undefined}
          />
        );
      case 'manage':
        return (
          <ProjectManager
            projects={projects}
            selectedProjectId={selectedProjectId}
            onProjectsChange={handleProjectsChange}
            onSelectProject={handleSelectProject}
          />
        );
      case 'pipeline':
        return (
          <PipelineWizard
            onComplete={(newProject) => {
              handleProjectsChange([...projects, newProject]);
              handleSelectProject(newProject.id);
              setActiveTab('dashboard');
              toast.success('สร้างโปรเจคและเอกสารทั้งหมดเรียบร้อย!');
            }}
            onCancel={() => setActiveTab('home')}
          />
        );
      case 'company-settings':
        return <CompanyProfileSettings profile={companyProfile} onSave={handleSaveCompanyProfile} currentThemeId={currentThemeId} onThemeChange={handleThemeChange} />;
      default:
        break;
    }

    // All other tabs require a selected project
    if (!deferredSelectedProject) {
      return (
        <HomeDashboard
          projects={deferredAccessibleProjects}
          showFinancialInsights={showFinancialInsights}
          onSelectProject={handleSelectProject}
          onCreateProject={session.user.canManageProjects ? () => navigateToTab('manage') : undefined}
        />
      );
    }

    switch (deferredActiveTab) {
      case 'quotation':
        return <QuotationDocument project={deferredSelectedProject} companyProfile={companyProfile} onOpenShop={handleOpenShopRoute} />;
      case 'purchase-order': return <PurchaseOrderDocument project={deferredSelectedProject} companyProfile={companyProfile} />;
      case 'customer-quotation': return <CustomerQuotationDocument project={deferredSelectedProject} companyProfile={companyProfile} />;
      case 'presentation-board':
        return <PresentationBoardDocument project={deferredSelectedProject} companyProfile={companyProfile} onUpdate={session.user.canManageProjects ? handleProjectUpdate : undefined} />;
      case 'invoice': return <InvoiceDocument project={deferredSelectedProject} companyProfile={companyProfile} />;
      case 'contractor-invoice':
        return <ContractorInvoiceDocument project={deferredSelectedProject} installmentNumber={contractorInstallment} companyProfile={companyProfile} />;
      case 'summary-invoice': return <SummaryInvoiceDocument project={deferredSelectedProject} companyProfile={companyProfile} />;
      case 'vat-invoice': return <VatInvoiceDocument project={deferredSelectedProject} companyProfile={companyProfile} />;
      case 'withholding-tax': return <WithholdingTaxDocument project={deferredSelectedProject} companyProfile={companyProfile} />;
      case 'workplan': return <WorkPlanDocument project={deferredSelectedProject} companyProfile={companyProfile} onUpdate={session.user.canManageProjects ? handleProjectUpdate : undefined} />;
      case 'comparison': return <PriceComparisonDocument project={deferredSelectedProject} companyProfile={companyProfile} />;
      case 'receipt': return <ReceiptDocument project={deferredSelectedProject} companyProfile={companyProfile} />;
      case 'contract': return <ContractDocument project={deferredSelectedProject} companyProfile={companyProfile} />;
      case 'dashboard':
        return (
          <ProjectDashboardWorkspace
            project={deferredSelectedProject}
            projectCount={deferredAccessibleProjects.length}
            accessibleTabs={deferredAvailableDocumentTabs}
            showFinancialInsights={showFinancialInsights}
            onNavigate={navigateToTab}
            onUpdateProject={session.user.canManageProjects ? handleProjectUpdate : undefined}
            onOpenShop={handleOpenShopRoute}
          />
        );
      case 'edit':
        return <AdvancedQuotationEditor project={deferredSelectedProject} onUpdate={handleProjectUpdate} onOpenShop={handleOpenShopRoute} />;
      default: return null;
    }
  }, [
    availableDocumentTabs,
    companyProfile,
    contractorInstallment,
    currentThemeId,
    deferredAccessibleProjects,
    deferredActiveTab,
    deferredAvailableDocumentTabs,
    deferredSelectedProject,
    handleProjectUpdate,
    handleProjectsChange,
    handleOpenShopRoute,
    handleSaveCompanyProfile,
    handleSelectProject,
    handleThemeChange,
    navigateToTab,
    projects,
    selectedProjectId,
    session.user.canManageProjects,
    showFinancialInsights,
  ]);

  // Loading
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm tracking-widest uppercase text-stone-400">Loading workspace...</p>
      </div>
    );
  }

  // No access — only block users who can't manage projects (restricted roles)
  if (accessibleProjects.length === 0 && !session.user.canManageProjects) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-lg border border-stone-200 bg-white px-8 py-8 text-center">
          <p className="text-[10px] tracking-[0.15em] uppercase text-stone-400">Access</p>
          <h1 className="mt-3 text-lg font-light text-stone-800">ยังไม่มีโครงการที่เข้าถึงได้</h1>
          <p className="mt-3 text-sm text-stone-500">
            บัญชีนี้ยังไม่มีโครงการใน workspace หรือยังไม่ได้รับสิทธิ์ให้เข้าถึงโครงการที่แชร์มา
          </p>
          <button
            onClick={onSignOut}
            className="mt-5 rounded-lg border border-stone-200 px-4 py-2 text-sm text-stone-600 transition hover:bg-stone-50"
          >
            กลับไปหน้า login
          </button>
        </div>
      </div>
    );
  }

  // Special project pages
  const canOpenSpecialPage = ENABLE_SPECIAL_PROJECTS
    && session.user.canOpenSpecialProjects
    && specialProjectIds.has(selectedProjectId);
  if (showSpecialPage && canOpenSpecialPage) {
    const pageMap: Record<string, ComponentType | null> = {
      'villa-ratchathewi-room175': Villa175DocumentsPage,
      'construction-floor-masonry': ConstructionDocumentsPage,
      'phase3-electrical-ceiling-plumbing': Phase3DocumentsPage,
      'phase4-builtin-furniture': Phase4DocumentsPage,
      'phase5-final-finishing': Phase5DocumentsPage,
      'centro-ratchaphruek-suanphak': CentroDocumentsPage,
    };
    const SpecialPage = pageMap[selectedProjectId as keyof typeof pageMap];
    if (SpecialPage) {
      return (
        <Suspense fallback={<WorkspaceContentFallback label="กำลังเปิดหน้าโครงการ..." />}>
          <SpecialPage />
        </Suspense>
      );
    }
  }

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Top bar */}
      <header className="sticky top-0 z-50 bg-white/70 backdrop-blur-md border-b border-stone-200/60 print:hidden">
        <div className="mx-auto max-w-[1560px] px-4 py-3 md:px-6">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  aria-label="เปิดเมนู"
                  className="inline-flex items-center justify-center rounded-lg p-2 text-stone-500 transition hover:bg-stone-100 xl:hidden"
                >
                  <Menu className="h-5 w-5" />
                </button>
                <div className="min-w-0">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-emerald-200/70 bg-emerald-50/80 shadow-sm">
                      <EzBOQLogo size="sm" className="h-10 w-auto" />
                    </div>
                    <div className="min-w-0">
                      <span className="block truncate text-[10px] font-semibold tracking-[0.42em] text-[var(--doc-primary)]">
                        E z B O Q
                      </span>
                      <span className="mt-1 block truncate text-sm font-semibold text-stone-900">
                        {session.user.workspaceName || companyProfile.companyName || 'Workspace'}
                      </span>
                      <p className="mt-1 hidden text-xs text-stone-500 sm:block">
                        ระบบ BOQ, เอกสาร, จัดซื้อ, และส่งมอบใน flow เดียว
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] ${
                      syncStatus === 'synced'
                        ? 'bg-emerald-50 text-emerald-700'
                        : syncStatus === 'saving'
                          ? 'bg-amber-50 text-amber-700'
                          : syncStatus === 'queued'
                            ? 'bg-stone-100 text-stone-600'
                            : syncStatus === 'error'
                              ? 'bg-rose-50 text-rose-700'
                              : syncStatus === 'local'
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-stone-100 text-stone-500'
                    }`}>
                      {syncStatus === 'synced' && <CheckCircle2 className="h-3.5 w-3.5" />}
                      {syncStatus === 'saving' && <LoaderCircle className="h-3.5 w-3.5 animate-spin" />}
                      {syncStatus === 'hydrating' && <LoaderCircle className="h-3.5 w-3.5 animate-spin" />}
                      {syncStatus === 'queued' && <Clock3 className="h-3.5 w-3.5" />}
                      {syncStatus === 'error' && <AlertTriangle className="h-3.5 w-3.5" />}
                      {syncStatus === 'local' && <AlertTriangle className="h-3.5 w-3.5" />}
                      <span>{syncMessage}</span>
                    </span>
                    {onRetryCloudSync && (session.workspaceMode === 'local-cache' || syncStatus === 'error') && (
                      <button
                        onClick={() => { void handleRetryCloudConnection(); }}
                        disabled={isRetryingCloudSync || !isOnline}
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] transition ${
                          isRetryingCloudSync || !isOnline
                            ? 'cursor-not-allowed border-stone-200 bg-stone-100 text-stone-400'
                            : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
                        }`}
                      >
                        <RefreshCcw className={`h-3.5 w-3.5 ${isRetryingCloudSync ? 'animate-spin' : ''}`} />
                        <span>{isOnline ? 'เชื่อมต่อใหม่' : 'รอออนไลน์'}</span>
                      </button>
                    )}
                    {selectedProject && (
                      <span className="hidden rounded-full border border-stone-200 bg-white px-2.5 py-1 text-[11px] text-stone-500 md:inline-flex">
                        โปรเจกต์: {selectedProject.name}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 xl:hidden">
                <div className="min-w-0 max-w-[144px] rounded-2xl border border-stone-200/80 bg-white px-3 py-2 text-right shadow-sm">
                  <p className="truncate text-xs font-semibold text-stone-900 sm:text-sm">{session.user.name}</p>
                  <p className="hidden truncate text-[11px] text-stone-500 sm:block">{session.user.title}</p>
                </div>

                <button
                  onClick={onOpenGuide}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-600 transition hover:bg-stone-50"
                  title="เปิดคู่มือการใช้งาน"
                >
                  <CircleHelp className="h-4 w-4" />
                </button>
                <button
                  onClick={onSignOut}
                  aria-label="ออกจากระบบ"
                  className="inline-flex items-center justify-center rounded-lg p-2 text-stone-400 transition hover:bg-stone-100 hover:text-stone-600"
                  title="ออกจากระบบ"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2 xl:min-w-[580px] xl:flex-row xl:items-center xl:justify-end">
              <button
                onClick={() => setMobileProjectHubOpen(true)}
                className="xl:hidden rounded-2xl border border-stone-200 bg-white px-4 py-3 text-left shadow-sm transition hover:border-stone-300 hover:bg-stone-50"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <span className="block text-[10px] uppercase tracking-[0.18em] text-stone-400">Project Hub</span>
                    <p className="mt-1 truncate text-sm font-medium text-stone-900">
                      {selectedProject ? selectedProject.name : 'เลือกโครงการเพื่อเริ่มทำงาน'}
                    </p>
                    <p className="mt-1 text-xs text-stone-500">
                      {accessibleProjects.length > 0
                        ? `${accessibleProjects.length} โครงการ • แตะเพื่อสลับหรือเปิดหน้าโครงการ`
                        : 'ยังไม่มีโครงการใน workspace นี้'}
                    </p>
                  </div>
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-stone-100 text-stone-600">
                    <FolderOpen className="h-5 w-5" />
                  </div>
                </div>
              </button>

              <div className="relative hidden flex-1 xl:block xl:max-w-[360px]">
                {accessibleProjects.length > 0 ? (
                  <>
                    <select
                      value={selectedProjectId}
                      onChange={(e) => handleSelectProject(e.target.value)}
                      className="w-full appearance-none rounded-xl border border-stone-200 bg-white px-4 py-2.5 pr-9 text-sm text-stone-800 transition hover:border-stone-300 focus:border-stone-400 focus:outline-none"
                    >
                      {accessibleProjects.map((project) => (
                        <option key={project.id} value={project.id}>{project.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                  </>
                ) : (
                  <div className="rounded-xl border border-dashed border-stone-200 bg-white px-4 py-2.5 text-sm text-stone-400">
                    ยังไม่มีโครงการ
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 sm:flex-none">
                {session.user.canExportAll && selectedProject && (
                  <ExportAllButton project={selectedProject} />
                )}

                <div className="hidden min-w-0 items-center gap-3 rounded-2xl border border-stone-200/80 bg-white px-3 py-2 shadow-sm xl:flex">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--doc-primary)] text-xs font-semibold text-[var(--doc-primary-text)]">
                    {userInitials}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-stone-900">{session.user.name}</p>
                    <p className="truncate text-[11px] text-stone-500">{session.user.title}</p>
                  </div>
                </div>

                <button
                  onClick={onOpenGuide}
                  className="hidden items-center gap-1.5 rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-600 transition hover:bg-stone-50 xl:inline-flex"
                  title="เปิดคู่มือการใช้งาน"
                >
                  <CircleHelp className="h-4 w-4" />
                  <span>คู่มือ</span>
                </button>
                <button
                  onClick={onSignOut}
                  aria-label="ออกจากระบบ"
                  className="hidden items-center justify-center rounded-lg p-2 text-stone-400 transition hover:bg-stone-100 hover:text-stone-600 xl:inline-flex"
                  title="ออกจากระบบ"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <Drawer open={mobileProjectHubOpen} onOpenChange={setMobileProjectHubOpen}>
        <DrawerContent className="border-stone-200 bg-white text-stone-900 xl:hidden">
          <DrawerHeader className="border-b border-stone-200 pb-3">
            <DrawerTitle className="flex items-center gap-2 text-stone-900">
              <FolderOpen className="h-5 w-5 text-[var(--doc-primary)]" />
              เข้าถึงโครงการ
            </DrawerTitle>
            <DrawerDescription className="text-stone-500">
              สลับโปรเจกต์ เปิดหน้าโครงการ หรือไปจัดการโครงการได้จากตรงนี้เลย
            </DrawerDescription>
          </DrawerHeader>

          <div className="space-y-4 overflow-y-auto px-4 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] pt-1">
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                onClick={() => {
                  setMobileProjectHubOpen(false);
                  navigateToTab('dashboard');
                }}
                disabled={!selectedProject}
                className={`rounded-2xl border px-4 py-3 text-left transition ${
                  selectedProject
                    ? 'border-stone-200 bg-stone-50 text-stone-800 hover:border-stone-300 hover:bg-stone-100'
                    : 'cursor-not-allowed border-stone-200 bg-stone-50 text-stone-400'
                }`}
              >
                <p className="text-[10px] uppercase tracking-[0.18em] text-stone-400">Quick Open</p>
                <p className="mt-1 text-sm font-medium">เปิดหน้าโครงการปัจจุบัน</p>
                <p className="mt-1 text-xs text-stone-500">
                  {selectedProject ? selectedProject.name : 'ยังไม่มีโครงการที่เลือกอยู่'}
                </p>
              </button>

              {session.user.canManageProjects && (
                <button
                  onClick={() => {
                    setMobileProjectHubOpen(false);
                    navigateToTab('manage');
                  }}
                  className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-left text-stone-800 transition hover:border-stone-300 hover:bg-stone-50"
                >
                  <p className="text-[10px] uppercase tracking-[0.18em] text-stone-400">Manage</p>
                  <p className="mt-1 text-sm font-medium">สร้างหรือจัดการโครงการ</p>
                  <p className="mt-1 text-xs text-stone-500">เพิ่มโครงการใหม่ คัดลอก แก้ชื่อ หรือลบโครงการ</p>
                </button>
              )}
              {selectedProject && onOpenShopRoute && (
                <button
                  onClick={handleOpenShopRoute}
                  className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-left text-stone-800 transition hover:border-sky-300 hover:bg-sky-100"
                >
                  <p className="text-[10px] uppercase tracking-[0.18em] text-sky-600">Procurement</p>
                  <p className="mt-1 text-sm font-medium">เปิด Shop / RFQ</p>
                  <p className="mt-1 text-xs text-stone-500">แปลง BOQ เป็น purchase list แล้วส่งขอราคาวัสดุทันที</p>
                </button>
              )}
            </div>

            <div className="rounded-2xl border border-stone-200 bg-stone-50/70 p-3">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                <input
                  type="text"
                  value={mobileProjectQuery}
                  onChange={(event) => setMobileProjectQuery(event.target.value)}
                  placeholder="ค้นหาชื่อโครงการ เจ้าของ หรือเบอร์โทร"
                  className="w-full rounded-xl border border-stone-200 bg-white py-2.5 pl-10 pr-3 text-sm text-stone-800 outline-none transition placeholder:text-stone-400 focus:border-stone-400"
                />
              </label>
              <p className="mt-2 text-xs text-stone-500">
                {mobileProjectResults.length} จาก {accessibleProjects.length} โครงการที่เข้าถึงได้
              </p>
            </div>

            <div className="space-y-2">
              {mobileProjectResults.length > 0 ? (
                mobileProjectResults.map((project) => {
                  const isSelected = project.id === selectedProjectId;
                  return (
                    <button
                      key={project.id}
                      onClick={() => handleSelectProject(project.id)}
                      className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                        isSelected
                          ? 'border-[var(--doc-primary)] bg-[var(--doc-accent-light)] shadow-sm'
                          : 'border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-medium text-stone-900">{project.name}</p>
                            {isSelected && (
                              <span className="rounded-full bg-[var(--doc-primary)] px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-[var(--doc-primary-text)]">
                                Current
                              </span>
                            )}
                          </div>
                          <div className="mt-1 flex flex-wrap gap-2 text-xs text-stone-500">
                            {project.owner && project.owner !== '-' && <span>เจ้าของ: {project.owner}</span>}
                            {project.phone && project.phone !== '-' && <span>โทร: {project.phone}</span>}
                          </div>
                          {project.address && project.address !== '-' && (
                            <p className="mt-1 line-clamp-2 text-xs text-stone-500">{project.address}</p>
                          )}
                        </div>
                        <span className="shrink-0 rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1 text-[11px] text-stone-600">
                          เปิด
                        </span>
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="rounded-2xl border border-dashed border-stone-200 bg-white px-4 py-6 text-center">
                  <p className="text-sm text-stone-700">ไม่พบโครงการที่ตรงกับคำค้น</p>
                  <p className="mt-1 text-xs text-stone-500">ลองค้นด้วยชื่อโครงการ ชื่อเจ้าของ หรือเบอร์โทรอีกครั้ง</p>
                </div>
              )}
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      <div className="mx-auto flex max-w-[1560px] gap-0 xl:gap-6 px-4 pt-4 md:px-6">
        {/* Sidebar */}
        <aside className={`
          fixed inset-y-0 left-0 z-[70] w-56 bg-white border-r border-stone-200/60 px-3 py-4
          transition-transform duration-200 xl:static xl:w-56 xl:flex-none xl:border-r-0 xl:bg-transparent xl:px-0 xl:py-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full xl:translate-x-0'}
          print:hidden
        `}>
          <div className="flex h-full flex-col xl:sticky xl:top-[61px] xl:h-[calc(100vh-61px)]">
            {/* Mobile close */}
            <div className="flex items-center justify-between px-2 pb-4 xl:hidden">
              <span className="text-[10px] tracking-[0.15em] uppercase text-stone-400">Menu</span>
              <button
                onClick={() => setSidebarOpen(false)}
                className="rounded-lg px-2 py-1 text-xs text-stone-500 transition hover:bg-stone-100"
              >
                ปิด
              </button>
            </div>

            {/* Nav groups */}
            <nav className="flex-1 space-y-5 overflow-y-auto px-1">
              {visibleGroups.map((group) => (
                <div key={group.key}>
                  <p className="px-3 text-[10px] tracking-[0.15em] uppercase text-stone-400">
                    {group.label}
                  </p>
                  <div className="mt-2 space-y-0.5">
                    {group.tabs.map((tab) => {
                      const def = tabs[tab];
                      const Icon = def.icon;
                      const isActive = activeTab === tab;
                      return (
                        <button
                          key={tab}
                          onClick={() => navigateToTab(tab)}
                          className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition ${
                            isActive
                              ? 'bg-[var(--doc-primary)] text-[var(--doc-primary-text)]'
                              : 'text-stone-500 hover:text-stone-800 hover:bg-stone-100/60'
                          }`}
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          <span className="truncate">{def.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {canOpenSpecialPage && (
                <div>
                  <p className="px-3 text-[10px] tracking-[0.15em] uppercase text-stone-400">Special</p>
                  <button
                    onClick={() => setShowSpecialPage(true)}
                    className="mt-2 flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-amber-600 transition hover:bg-amber-50"
                  >
                    เปิดหน้าโครงการ
                  </button>
                </div>
              )}
            </nav>

            {/* Sidebar footer */}
            <div className="border-t border-stone-200/60 px-3 pt-3 pb-2">
              {onOpenPricing && (
                <button
                  onClick={() => { onOpenPricing(); setSidebarOpen(false); }}
                  className="mb-1.5 flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-emerald-600 transition hover:bg-emerald-50"
                >
                  <Crown className="h-4 w-4 shrink-0" />
                  <span>แพ็คเกจ & ราคา</span>
                </button>
              )}

              <p className="text-sm text-stone-800">{session.user.name}</p>
              <p className="text-xs text-stone-400">{session.user.title}</p>
              <p className="mt-1 text-[11px] text-stone-400">{session.user.email || session.user.workspaceId}</p>
              {session.user.canResetDemoData && (
                <button
                  onClick={handleResetProjects}
                  className="mt-2 text-xs text-stone-400 transition hover:text-stone-600"
                >
                  รีเซ็ตข้อมูล
                </button>
              )}
            </div>
          </div>
        </aside>

        {/* Sidebar overlay (mobile) */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-[60] bg-black/20 backdrop-blur-sm xl:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main content */}
        <main className="min-w-0 flex-1 pb-8">
          <div className="mb-4 rounded-2xl border border-stone-200/80 bg-white/90 px-4 py-4 shadow-sm print:hidden md:px-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.18em] text-stone-400">
                  {showProjectContext ? 'Project Workspace' : 'Workspace'}
                </p>
                <h1 className="mt-1 text-xl font-light text-stone-900 md:text-2xl">{activeTabDef.label}</h1>
                <p className="mt-2 max-w-3xl text-sm text-stone-600">{activeTabDef.description}</p>
                {showProjectContext && selectedProject && selectedProjectSnapshot && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="inline-flex items-center rounded-full bg-stone-100 px-3 py-1 text-xs text-stone-600">
                      {selectedProject.name}
                    </span>
                    <span className="inline-flex items-center rounded-full bg-stone-100 px-3 py-1 text-xs text-stone-600">
                      {selectedProjectSnapshot.boqSections} หมวด / {selectedProjectSnapshot.boqItems} รายการ
                    </span>
                    {selectedProjectSnapshot.owner && selectedProjectSnapshot.owner !== '-' && (
                      <span className="inline-flex items-center rounded-full bg-stone-100 px-3 py-1 text-xs text-stone-600">
                        เจ้าของ: {selectedProjectSnapshot.owner}
                      </span>
                    )}
                    {selectedProjectSnapshot.phone && selectedProjectSnapshot.phone !== '-' && (
                      <span className="inline-flex items-center rounded-full bg-stone-100 px-3 py-1 text-xs text-stone-600">
                        โทร: {selectedProjectSnapshot.phone}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {relatedTabs.length > 0 && (
                <div className="rounded-2xl border border-stone-200 bg-stone-50/80 p-3 lg:min-w-[280px]">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-stone-400">ไปต่อจากหน้านี้</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {relatedTabs.map((tab) => (
                      <button
                        key={tab}
                        onClick={() => navigateToTab(tab)}
                        className="inline-flex items-center rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs text-stone-600 transition hover:border-stone-300 hover:bg-stone-100"
                      >
                        {tabs[tab].label}
                      </button>
                    ))}
                    {selectedProject && onOpenShopRoute && (
                      <button
                        onClick={handleOpenShopRoute}
                        className="inline-flex items-center rounded-full border border-sky-200 bg-white px-3 py-1.5 text-xs text-sky-700 transition hover:border-sky-300 hover:bg-sky-50"
                      >
                        Shop / RFQ
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {activeTab === 'contractor-invoice' && (
            <div className="mb-4 flex flex-wrap items-center gap-2 print:hidden">
              <span className="text-sm text-stone-500">งวดใบเบิกช่าง</span>
              {(selectedProject?.paymentSchedule?.map((item) => item.no) || [1, 2, 3]).map((n) => (
                <button
                  key={n}
                  onClick={() => setContractorInstallment(n)}
                  className={`rounded-lg px-3 py-1.5 text-sm transition ${
                    contractorInstallment === n
                      ? 'bg-[var(--doc-primary)] text-[var(--doc-primary-text)]'
                      : 'border border-stone-200 text-stone-500 hover:bg-stone-100'
                  }`}
                >
                  งวด {n}
                </button>
              ))}
            </div>
          )}
            <Suspense fallback={<WorkspaceContentFallback />}>
              {renderedContent}
            </Suspense>
          </main>
        </div>
      </div>
  );
}
