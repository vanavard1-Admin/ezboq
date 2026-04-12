import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  writeBatch,
  where,
  type QueryConstraint,
} from 'firebase/firestore';
import type { User as FirebaseUser } from 'firebase/auth';
import { db } from './firebase';
import type { AuthSession, AuthUser, UserRole } from './authSession';
import {
  defaultCompanyProfile,
  type BankAccount,
  type CompanyProfile,
} from './companyProfile';
import {
  prepareProjectDocuments,
  type DocumentPipelineData,
  type ProjectDiscountConfig,
  type PaymentInstallmentConfig,
  type PresentationBoardData,
  type ProjectData,
  type QuotationItem,
  type TaxData,
  type WorkPlanConfig,
} from './projectData';
import { allAppTabs, type AppTab } from './workspaceTabs';

interface CloudUserRecord {
  uid: string;
  workspaceId: string;
  workspaceName: string;
  name: string;
  email: string;
  role: UserRole;
  title: string;
  company: string;
  description: string;
  hasFullProjectAccess: boolean;
  assignedProjectIds: string[];
  allowedTabs: AppTab[];
  canExportAll: boolean;
  canResetDemoData: boolean;
  canManageProjects: boolean;
  canOpenSpecialProjects: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function stringOrFallback(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

function booleanOrFallback(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function numberOrFallback(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : [];
}

function appTabs(value: unknown, fallback: AppTab[]): AppTab[] {
  const next = Array.isArray(value)
    ? value.filter((item): item is AppTab => typeof item === 'string' && allAppTabs.includes(item as AppTab))
    : [];
  return next.length > 0 ? next : fallback;
}

function permissionsForRole(role: UserRole): Pick<
  CloudUserRecord,
  | 'hasFullProjectAccess'
  | 'assignedProjectIds'
  | 'allowedTabs'
  | 'canExportAll'
  | 'canResetDemoData'
  | 'canManageProjects'
  | 'canOpenSpecialProjects'
> {
  if (role === 'client') {
    return {
      hasFullProjectAccess: false,
      assignedProjectIds: [],
      allowedTabs: ['dashboard', 'customer-quotation', 'presentation-board', 'invoice', 'receipt', 'workplan', 'contract'],
      canExportAll: false,
      canResetDemoData: false,
      canManageProjects: false,
      canOpenSpecialProjects: false,
    };
  }

  if (role === 'member') {
    return {
      hasFullProjectAccess: false,
      assignedProjectIds: [],
      allowedTabs: ['home', 'dashboard', 'quotation', 'purchase-order', 'customer-quotation', 'presentation-board', 'invoice', 'summary-invoice', 'receipt', 'workplan', 'contract'],
      canExportAll: false,
      canResetDemoData: false,
      canManageProjects: false,
      canOpenSpecialProjects: false,
    };
  }

  return {
    hasFullProjectAccess: true,
    assignedProjectIds: [],
    allowedTabs: [...allAppTabs],
    canExportAll: true,
    canResetDemoData: false,
    canManageProjects: true,
    canOpenSpecialProjects: false,
  };
}

function defaultCloudUserRecord(firebaseUser: FirebaseUser): CloudUserRecord {
  const role: UserRole = 'owner';
  const permissions = permissionsForRole(role);
  const workspaceName = firebaseUser.displayName?.trim() || firebaseUser.email?.trim() || 'My Workspace';

  return {
    uid: firebaseUser.uid,
    workspaceId: firebaseUser.uid,
    workspaceName,
    name: firebaseUser.displayName?.trim() || firebaseUser.email?.trim() || 'Workspace Owner',
    email: firebaseUser.email?.trim() || '',
    role,
    title: 'Workspace Owner',
    company: '',
    description: 'บัญชีเจ้าของ workspace ส่วนตัว',
    ...permissions,
  };
}

function sanitizeCloudUserRecord(firebaseUser: FirebaseUser, raw: unknown): CloudUserRecord {
  const fallback = defaultCloudUserRecord(firebaseUser);
  const record = isRecord(raw) ? raw : {};
  const role = record.role === 'member' || record.role === 'client' ? record.role : fallback.role;
  const permissions = permissionsForRole(role);

  return {
    uid: firebaseUser.uid,
    workspaceId: stringOrFallback(record.workspaceId, fallback.workspaceId),
    workspaceName: stringOrFallback(record.workspaceName, fallback.workspaceName),
    name: stringOrFallback(record.name, fallback.name),
    email: stringOrFallback(record.email, fallback.email),
    role,
    title: stringOrFallback(record.title, fallback.title),
    company: stringOrFallback(record.company, fallback.company),
    description: stringOrFallback(record.description, fallback.description),
    hasFullProjectAccess: booleanOrFallback(record.hasFullProjectAccess, permissions.hasFullProjectAccess),
    assignedProjectIds: stringArray(record.assignedProjectIds),
    allowedTabs: appTabs(record.allowedTabs, permissions.allowedTabs),
    canExportAll: booleanOrFallback(record.canExportAll, permissions.canExportAll),
    canResetDemoData: booleanOrFallback(record.canResetDemoData, permissions.canResetDemoData),
    canManageProjects: booleanOrFallback(record.canManageProjects, permissions.canManageProjects),
    canOpenSpecialProjects: booleanOrFallback(record.canOpenSpecialProjects, permissions.canOpenSpecialProjects),
  };
}

function toAuthUser(record: CloudUserRecord): AuthUser {
  return {
    id: record.uid,
    workspaceId: record.workspaceId,
    workspaceName: record.workspaceName,
    name: record.name,
    email: record.email,
    role: record.role,
    title: record.title,
    company: record.company,
    description: record.description,
    hasFullProjectAccess: record.hasFullProjectAccess,
    assignedProjectIds: [...record.assignedProjectIds],
    allowedTabs: [...record.allowedTabs],
    canExportAll: record.canExportAll,
    canResetDemoData: record.canResetDemoData,
    canManageProjects: record.canManageProjects,
    canOpenSpecialProjects: record.canOpenSpecialProjects,
  };
}

export async function resolveFirebaseAuthSession(firebaseUser: FirebaseUser): Promise<AuthSession> {
  const userRef = doc(db, 'users', firebaseUser.uid);
  let snapshot;
  try {
    snapshot = await getDoc(userRef);
  } catch (readErr) {
    console.error('[EzBOQ] Firestore user read failed:', readErr);
    throw readErr;
  }
  const record = sanitizeCloudUserRecord(firebaseUser, snapshot.data());

  await setDoc(
    userRef,
    {
      ...record,
      updatedAt: serverTimestamp(),
      createdAt: snapshot.exists() ? undefined : serverTimestamp(),
    },
    { merge: true },
  );

  if (record.role === 'owner') {
    await setDoc(
      doc(db, 'workspaces', record.workspaceId),
      {
        ownerUid: firebaseUser.uid,
        name: record.workspaceName,
        updatedAt: serverTimestamp(),
        createdAt: snapshot.exists() ? undefined : serverTimestamp(),
      },
      { merge: true },
    );
  }

  const rawData = snapshot.data();
  const lineLinked = !!(rawData?.lineUserId || rawData?.provider === 'line');

  return {
    user: toAuthUser(record),
    rememberSession: true,
    signedInAt: new Date().toISOString(),
    workspaceMode: 'cloud',
    lineLinked,
  };
}

function normalizeQuotationItem(item: unknown): QuotationItem {
  const record = isRecord(item) ? item : {};

  const result: QuotationItem = {
    no: stringOrFallback(record.no, ''),
    description: stringOrFallback(record.description, ''),
    unit: stringOrFallback(record.unit, ''),
    quantity: typeof record.quantity === 'number' || typeof record.quantity === 'string' ? record.quantity : '',
    unitPrice: typeof record.unitPrice === 'number' || typeof record.unitPrice === 'string' ? record.unitPrice : '',
    laborCost: typeof record.laborCost === 'number' || typeof record.laborCost === 'string' ? record.laborCost : '',
    customerUnitPrice: typeof record.customerUnitPrice === 'number' || typeof record.customerUnitPrice === 'string' ? record.customerUnitPrice : '',
    scopeDetails: typeof record.scopeDetails === 'string' ? record.scopeDetails : undefined,
    totalPrice: typeof record.totalPrice === 'number' || typeof record.totalPrice === 'string' ? record.totalPrice : '',
  };
  // Migration: ล้าง totalPrice เมื่อมี unitPrice/laborCost จริง
  const up = Number(result.unitPrice) || 0;
  const lc = Number(result.laborCost) || 0;
  if ((up > 0 || lc > 0) && result.totalPrice !== undefined && result.totalPrice !== '') {
    result.totalPrice = '';
  }
  return result;
}

function normalizeWorkPlanConfig(value: unknown): WorkPlanConfig | undefined {
  if (!isRecord(value)) return undefined;
  const items = Array.isArray(value.items)
    ? value.items
        .filter(isRecord)
        .map((item) => ({
          no: stringOrFallback(item.no, ''),
          task: stringOrFallback(item.task, ''),
          duration: stringOrFallback(item.duration, ''),
          weekCells: Array.isArray(item.weekCells)
            ? item.weekCells.filter((cell): cell is string => typeof cell === 'string')
            : [],
          status: stringOrFallback(item.status, ''),
        }))
    : [];

  return {
    totalWeeks: typeof value.totalWeeks === 'number' ? value.totalWeeks : 0,
    startDate: typeof value.startDate === 'string' ? value.startDate : undefined,
    endDate: typeof value.endDate === 'string' ? value.endDate : undefined,
    durationLabel: typeof value.durationLabel === 'string' ? value.durationLabel : undefined,
    items,
  };
}

function normalizePaymentSchedule(value: unknown): PaymentInstallmentConfig[] | undefined {
  if (!Array.isArray(value)) return undefined;

  return value
    .filter(isRecord)
    .map((item) => ({
      no: typeof item.no === 'number' ? item.no : 0,
      description: stringOrFallback(item.description, ''),
      percentage: typeof item.percentage === 'number' ? item.percentage : 0,
      condition: typeof item.condition === 'string' ? item.condition : undefined,
    }))
    .filter((item) => item.no > 0);
}

function normalizeTaxData(value: unknown): TaxData | undefined {
  if (!isRecord(value)) return undefined;

  return {
    includeVat: booleanOrFallback(value.includeVat, true),
    includeWithholding: booleanOrFallback(value.includeWithholding, true),
    vatRate: typeof value.vatRate === 'number' ? value.vatRate : 0.07,
    withholdingRate: typeof value.withholdingRate === 'number' ? value.withholdingRate : 0.03,
    taxInvoiceNumber: typeof value.taxInvoiceNumber === 'string' ? value.taxInvoiceNumber : undefined,
    whtCertNumber: typeof value.whtCertNumber === 'string' ? value.whtCertNumber : undefined,
  };
}

function normalizePresentationBoard(value: unknown): PresentationBoardData | undefined {
  if (!isRecord(value)) return undefined;

  return {
    title: typeof value.title === 'string' ? value.title : undefined,
    subtitle: typeof value.subtitle === 'string' ? value.subtitle : undefined,
    brandLabel: typeof value.brandLabel === 'string' ? value.brandLabel : undefined,
    featureImage: typeof value.featureImage === 'string' ? value.featureImage : undefined,
    heroImage: typeof value.heroImage === 'string' ? value.heroImage : undefined,
  };
}

function normalizeDocumentPipeline(value: unknown): DocumentPipelineData | undefined {
  if (!isRecord(value)) return undefined;

  return {
    sourceFingerprint: stringOrFallback(value.sourceFingerprint, ''),
    lastPreparedAt: stringOrFallback(value.lastPreparedAt, ''),
    status: value.status === 'ready' ? 'ready' : 'attention',
    readyDocuments: stringArray(value.readyDocuments),
    missingInputs: stringArray(value.missingInputs),
  };
}

function normalizeDiscountConfig(value: unknown): ProjectDiscountConfig | undefined {
  if (!isRecord(value)) return undefined;

  return {
    label: stringOrFallback(value.label, ''),
    percent: typeof value.percent === 'number' ? value.percent : undefined,
    amount: typeof value.amount === 'number' ? value.amount : undefined,
    appliesToCategoryRefs: stringArray(value.appliesToCategoryRefs),
    requiresCategoryRefs: stringArray(value.requiresCategoryRefs),
    condition: typeof value.condition === 'string' ? value.condition : undefined,
  };
}

function normalizeProjectRecord(projectId: string, value: unknown): ProjectData {
  const record = isRecord(value) ? value : {};

  return prepareProjectDocuments({
    id: projectId,
    name: stringOrFallback(record.name, 'โครงการใหม่'),
    address: stringOrFallback(record.address, ''),
    phone: stringOrFallback(record.phone, ''),
    owner: stringOrFallback(record.owner, ''),
    quotationData: Array.isArray(record.quotationData)
      ? record.quotationData.map(normalizeQuotationItem)
      : [],
    scopeDetails: typeof record.scopeDetails === 'string' ? record.scopeDetails : undefined,
    designFee: typeof record.designFee === 'number' ? record.designFee : undefined,
    totalCost: typeof record.totalCost === 'number' ? record.totalCost : undefined,
    customerPrice: typeof record.customerPrice === 'number' ? record.customerPrice : undefined,
    operatingCost: typeof record.operatingCost === 'number' ? record.operatingCost : undefined,
    operatingRate: typeof record.operatingRate === 'number' ? record.operatingRate : undefined,
    markupRate: typeof record.markupRate === 'number' ? record.markupRate : undefined,
    discountConfig: normalizeDiscountConfig(record.discountConfig),
    status: record.status === 'archived' ? 'archived' : 'active',
    templateId: typeof record.templateId === 'string' ? record.templateId : undefined,
    templateArea: typeof record.templateArea === 'number' ? record.templateArea : undefined,
    templateBudget: typeof record.templateBudget === 'number' ? record.templateBudget : undefined,
    templateRooms: typeof record.templateRooms === 'number' ? record.templateRooms : undefined,
    templateBathrooms: typeof record.templateBathrooms === 'number' ? record.templateBathrooms : undefined,
    templatePricingTier: record.templatePricingTier === 'value' || record.templatePricingTier === 'premium'
      ? record.templatePricingTier
      : record.templatePricingTier === 'standard'
        ? 'standard'
        : undefined,
    priceReferenceSummary: isRecord(record.priceReferenceSummary)
      ? {
          seriesLabel: stringOrFallback(record.priceReferenceSummary.seriesLabel, ''),
          updatedAt: stringOrFallback(record.priceReferenceSummary.updatedAt, ''),
          tier: record.priceReferenceSummary.tier === 'value' || record.priceReferenceSummary.tier === 'premium'
            ? record.priceReferenceSummary.tier
            : 'standard',
          matchedItems: numberOrFallback(record.priceReferenceSummary.matchedItems, 0),
          totalItems: numberOrFallback(record.priceReferenceSummary.totalItems, 0),
          coveragePercent: numberOrFallback(record.priceReferenceSummary.coveragePercent, 0),
          sourceLabels: stringArray(record.priceReferenceSummary.sourceLabels),
        }
      : undefined,
    taxData: normalizeTaxData(record.taxData),
    workPlan: normalizeWorkPlanConfig(record.workPlan),
    paymentSchedule: normalizePaymentSchedule(record.paymentSchedule),
    presentationBoard: normalizePresentationBoard(record.presentationBoard),
    autoSyncDocuments: typeof record.autoSyncDocuments === 'boolean' ? record.autoSyncDocuments : undefined,
    documentPipeline: normalizeDocumentPipeline(record.documentPipeline),
    assignedUserIds: stringArray(record.assignedUserIds),
  });
}

function serializeProjectRecord(project: ProjectData, userId: string): Record<string, unknown> {
  const preparedProject = prepareProjectDocuments({
    ...project,
    assignedUserIds: Array.from(new Set([...(project.assignedUserIds || []), userId])),
  });

  const serialized = JSON.parse(JSON.stringify(preparedProject));
  if (!serialized || typeof serialized !== 'object') {
    return {} as Record<string, unknown>;
  }
  return serialized as Record<string, unknown>;
}

export function subscribeCloudProjects(
  user: AuthUser,
  onProjects: (projects: ProjectData[]) => void,
  onError: (error: Error) => void,
): () => void {
  const projectsRef = collection(db, 'workspaces', user.workspaceId, 'projects');
  const constraints: QueryConstraint[] = [];

  if (!user.hasFullProjectAccess) {
    constraints.push(where('assignedUserIds', 'array-contains', user.id));
  } else {
    constraints.push(orderBy('updatedAt', 'desc'));
  }

  const projectQuery = constraints.length > 0 ? query(projectsRef, ...constraints) : projectsRef;

  return onSnapshot(
    projectQuery,
    (snapshot) => {
      onProjects(snapshot.docs.map((item) => normalizeProjectRecord(item.id, item.data())));
    },
    (error) => {
      onError(error);
    },
  );
}

export async function saveProjectsToCloud(user: AuthUser, projects: ProjectData[]): Promise<ProjectData[]> {
  const projectsRef = collection(db, 'workspaces', user.workspaceId, 'projects');
  const existingSnapshot = await getDocs(projectsRef);
  const existingDocs = new Map(existingSnapshot.docs.map((item) => [item.id, item.data()]));
  const batch = writeBatch(db);
  const normalizedProjects = projects.map((project) => prepareProjectDocuments(project));

  for (const project of normalizedProjects) {
    const serialized = serializeProjectRecord(project, user.id);
    const projectRef = doc(projectsRef, project.id);
    const existing = existingDocs.get(project.id);

    batch.set(
      projectRef,
      {
        ...serialized,
        updatedAt: serverTimestamp(),
        createdAt: existing?.createdAt ?? serverTimestamp(),
      },
      { merge: true },
    );
  }

  for (const existingId of existingDocs.keys()) {
    if (!normalizedProjects.some((project) => project.id === existingId)) {
      batch.delete(doc(projectsRef, existingId));
    }
  }

  await batch.commit();
  return normalizedProjects;
}

function normalizeBankAccount(value: unknown, fallbackId: string): BankAccount {
  const record = isRecord(value) ? value : {};

  return {
    id: stringOrFallback(record.id, fallbackId),
    bankName: stringOrFallback(record.bankName, ''),
    accountName: stringOrFallback(record.accountName, ''),
    accountNumber: stringOrFallback(record.accountNumber, ''),
    accountType: typeof record.accountType === 'string' ? record.accountType : undefined,
  };
}

function normalizeCompanyProfile(value: unknown): CompanyProfile {
  const record = isRecord(value) ? value : {};

  return {
    ...defaultCompanyProfile,
    companyName: stringOrFallback(record.companyName, defaultCompanyProfile.companyName),
    companyNameTh: typeof record.companyNameTh === 'string' ? record.companyNameTh : defaultCompanyProfile.companyNameTh,
    tagline: stringOrFallback(record.tagline, defaultCompanyProfile.tagline),
    phone: stringOrFallback(record.phone, defaultCompanyProfile.phone),
    email: stringOrFallback(record.email, defaultCompanyProfile.email),
    address: stringOrFallback(record.address, defaultCompanyProfile.address),
    taxId: typeof record.taxId === 'string' ? record.taxId : defaultCompanyProfile.taxId,
    logoUrl: typeof record.logoUrl === 'string' ? record.logoUrl : defaultCompanyProfile.logoUrl,
    signatureName: stringOrFallback(record.signatureName, defaultCompanyProfile.signatureName),
    signatureUrl: typeof record.signatureUrl === 'string' ? record.signatureUrl : defaultCompanyProfile.signatureUrl,
    bankAccounts: Array.isArray(record.bankAccounts) && record.bankAccounts.length > 0
      ? record.bankAccounts.map((item, index) => normalizeBankAccount(item, `bank-${index + 1}`))
      : defaultCompanyProfile.bankAccounts.map((item) => ({ ...item })),
    defaultVatRate: typeof record.defaultVatRate === 'number' ? record.defaultVatRate : undefined,
    vatExempt: typeof record.vatExempt === 'boolean' ? record.vatExempt : undefined,
  };
}

export async function loadCompanyProfileFromCloud(user: AuthUser): Promise<CompanyProfile | null> {
  const profileRef = doc(db, 'workspaces', user.workspaceId, 'meta', 'companyProfile');
  const snapshot = await getDoc(profileRef);
  if (!snapshot.exists()) return null;
  return normalizeCompanyProfile(snapshot.data());
}

export async function saveCompanyProfileToCloud(user: AuthUser, profile: CompanyProfile): Promise<CompanyProfile> {
  const normalized = normalizeCompanyProfile(profile);
  await setDoc(
    doc(db, 'workspaces', user.workspaceId, 'meta', 'companyProfile'),
    {
      ...JSON.parse(JSON.stringify(normalized)),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
  return normalized;
}
