import { auth } from '../../utils/firebase';
import { ENABLE_MOCK_AUTH } from '../../utils/runtimeFlags';

const DEFAULT_EMULATOR_URL = 'http://localhost:5001/ezdoc-v1-th/asia-southeast1/api';
const envApiBaseUrl = (import.meta.env.VITE_DOCS_API_BASE_URL as string | undefined)?.trim();
const API_BASE_URL = envApiBaseUrl && envApiBaseUrl.length > 0
  ? envApiBaseUrl.replace(/\/+$/, '')
  : (import.meta.env.PROD ? 'https://doc.ezboq.com' : DEFAULT_EMULATOR_URL);

const MOCK_DOCS_STORAGE_KEY = 'ezboq_mock_docs_state_v1';
const MOCK_AUTH_PERSISTENT_KEY = 'ezboq_auth_session';
const MOCK_AUTH_TEMP_KEY = 'ezboq_auth_session_temp';
const MOCK_DOC_TYPE_PREFIX: Record<DocType, string> = {
  QUO: 'QUO',
  BILL: 'BILL',
  RECEIPT: 'RCT',
  CN: 'CN',
  DN: 'DN',
};
const MOCK_PDF_DATA_URL = 'data:application/pdf;base64,JVBERi0xLjQKMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMiAwIFIKPj4KZW5kb2JqCjIgMCBvYmoKPDwKL1R5cGUgL1BhZ2VzCi9Db3VudCAxCi9LaWRzIFszIDAgUl0KPj4KZW5kb2JqCjMgMCBvYmoKPDwKL1R5cGUgL1BhZ2UKL1BhcmVudCAyIDAgUgovTWVkaWFCb3ggWzAgMCAyMDAgMjAwXQovQ29udGVudHMgNCAwIFIKL1Jlc291cmNlcyA8PAovRm9udCA8PAovRjEgNSAwIFIKPj4KPj4KPj4KZW5kb2JqCjQgMCBvYmoKPDwKL0xlbmd0aCA0NAo+PgpzdHJlYW0KQlQKL0YxIDI0IFRmCjUwIDE1MCBUZAooRXpCT1EgRG9jdW1lbnQpIFRqCkVUCmVuZHN0cmVhbQplbmRvYmoKNSAwIG9iago8PAovVHlwZSAvRm9udAovU3VidHlwZSAvVHlwZTEKL0Jhc2VGb250IC9IZWx2ZXRpY2EKPj4KZW5kb2JqCnhyZWYKMCA2CjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDAxMCAwMDAwMCBuIAowMDAwMDAwMDYwIDAwMDAwIG4gCjAwMDAwMDAxMTcgMDAwMDAgbiAKMDAwMDAwMDI0MyAwMDAwMCBuIAowMDAwMDAwMzM4IDAwMDAwIG4gCnRyYWlsZXIKPDwKL1NpemUgNgovUm9vdCAxIDAgUgo+PgpzdGFydHhyZWYKNDA4CiUlRU9G';

export class DocsApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'DocsApiError';
  }
}

export type DocType = 'QUO' | 'BILL' | 'RECEIPT' | 'CN' | 'DN';
export type DocStatus = 'DRAFT' | 'READY' | 'ISSUED' | 'PAID' | 'CANCELLED';

export interface BusinessProfile {
  id: string;
  name: string;
}

export interface UserProfile {
  userId: string;
  email: string | null;
  activeBusinessId: string | null;
  business: BusinessProfile | null;
  businesses: Array<{ id: string; name: string }>;
}

export interface Customer {
  id: string;
  businessId: string;
  type: 'PERSON' | 'COMPANY';
  displayName: string;
  address?: string;
  phone?: string;
  email?: string;
  taxId?: string;
}

export interface CustomerListResponse {
  businessId: string;
  customers: Customer[];
  count: number;
}

export interface DocumentItem {
  line_no: number;
  description_th: string;
  description_en?: string | null;
  qty: number;
  unit: string;
  unit_price: number;
  amount: number;
  /** Optional per-item discount percentage (0–100). Applied to qty * unit_price. */
  discount_pct?: number;
}

export interface MoneySummary {
  subtotal: number;
  /** Sum of all per-item discounts (qty * unit_price * discount_pct / 100). */
  line_discount_total: number;
  /** Document-level discount amount (฿). */
  discount_amount: number;
  /** Document-level discount type: 'amount' (฿) or 'percent' (%). */
  discount_type: 'amount' | 'percent';
  /** Document-level discount percentage (0–100), used when discount_type = 'percent'. */
  discount_pct: number;
  extra_fee_amount: number;
  vat_amount: number;
  wht_amount: number;
  total_amount: number;
  net_receive_amount: number;
  discount_enabled: boolean;
  vat_enabled: boolean;
  wht_enabled: boolean;
  extra_fee_enabled: boolean;
  vat_rate_pct: number;
  wht_rate_pct: number;
}

export interface TaxSnapshot {
  vatEnabled: boolean;
  vatRate: number;
  whtEnabled: boolean;
  whtRate: number;
  whtBase: 'BEFORE_VAT' | 'AFTER_VAT';
}

export interface PaymentMilestone {
  label?: string | null;
  percent?: number | null;
  amount?: number | null;
  note?: string | null;
}

export interface EzDocument {
  id: string;
  docNo: string;
  docType: DocType;
  status: DocStatus;
  customerId: string;
  customerSnapshot?: {
    displayName: string;
    address?: string;
    taxId?: string;
  };
  issueDate: string;
  dueDate?: string;
  subjectTh?: string;
  subjectEn?: string;
  items: DocumentItem[];
  payment_milestones?: PaymentMilestone[] | null;
  money: MoneySummary;
  taxSnapshot?: TaxSnapshot;
  revision: number;
  pdfReady: boolean;
  pdfUrl: string | null;
  pdfState?: 'QUEUED' | 'RENDERING' | 'READY' | 'FAILED';
  openedByClient?: boolean;
  documentOpenedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  version: number;
  origin_document_id: string | null;
  supersedes_document_id: string | null;
  is_void: boolean;
}

export interface DocumentListResponse {
  documents: EzDocument[];
  count: number;
}

export interface DocumentDeliveryResponse {
  jobId: string;
  status: string;
  message?: string;
}

export interface DocumentInput {
  docType?: DocType;
  customerId?: string;
  issueDate?: string;
  subjectTh?: string;
  items?: DocumentItem[];
  taxSnapshot?: TaxSnapshot;
  discount_amount?: number;
  discount_type?: 'amount' | 'percent';
  discount_pct?: number;
  extra_fee_amount?: number;
  payment_milestones?: PaymentMilestone[] | null;
  revision?: number;
  [key: string]: unknown;
}

interface MockStoredSession {
  userId: string;
  signedInAt: string;
}

interface MockDocsUserState {
  businessId: string;
  businessName: string;
  email: string | null;
  sequenceByType: Partial<Record<DocType, number>>;
  customers: Customer[];
  documents: EzDocument[];
}

interface MockDocsState {
  users: Record<string, MockDocsUserState>;
}

function buildUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  if (!path.startsWith('/')) return `${API_BASE_URL}/${path}`;
  return `${API_BASE_URL}${path}`;
}

function safeNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function randomId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `mock-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function currentIsoDate(): string {
  return new Date().toISOString();
}

function readMockSession(storage: Storage | undefined): MockStoredSession | null {
  if (!storage) return null;
  const raw = storage.getItem(MOCK_AUTH_PERSISTENT_KEY) || storage.getItem(MOCK_AUTH_TEMP_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as MockStoredSession;
  } catch {
    return null;
  }
}

function getMockDocsUserId(): string | null {
  if (!ENABLE_MOCK_AUTH || typeof window === 'undefined') return null;

  const persistent = readMockSession(window.localStorage);
  if (persistent?.userId) return persistent.userId;

  const temp = readMockSession(window.sessionStorage);
  return temp?.userId || null;
}

function getMockUserEmail(userId: string): string {
  const normalizedUserId = userId.replace(/[^a-z0-9-]/giu, '-').toLowerCase();
  return `${normalizedUserId}@local.dev`;
}

function shouldUseMockDocsApi(): boolean {
  return !auth.currentUser && Boolean(getMockDocsUserId());
}

export function hasDocsAccessSession(): boolean {
  return Boolean(auth.currentUser || getMockDocsUserId());
}

function loadMockDocsState(): MockDocsState {
  if (typeof window === 'undefined') return { users: {} };

  const raw = window.localStorage.getItem(MOCK_DOCS_STORAGE_KEY);
  if (!raw) return { users: {} };

  try {
    return JSON.parse(raw) as MockDocsState;
  } catch {
    return { users: {} };
  }
}

function persistMockDocsState(state: MockDocsState): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(MOCK_DOCS_STORAGE_KEY, JSON.stringify(state));
}

function seedMockCustomers(businessId: string): Customer[] {
  return [
    {
      id: `${businessId}-customer-centro`,
      businessId,
      type: 'COMPANY',
      displayName: 'Centro Design Studio Co., Ltd.',
      address: '999 ถนนราชพฤกษ์ กรุงเทพฯ',
      phone: '081-234-5678',
      email: 'procurement@centro.example',
      taxId: '0105559123456',
    },
    {
      id: `${businessId}-customer-owner`,
      businessId,
      type: 'PERSON',
      displayName: 'คุณธนกฤต วัชราภรณ์',
      address: '88/9 ซอยพหลโยธิน 34 กรุงเทพฯ',
      phone: '089-555-1234',
      email: 'thanakrit@example.com',
      taxId: '1103700000001',
    },
    {
      id: `${businessId}-customer-henry`,
      businessId,
      type: 'COMPANY',
      displayName: 'Henry & Co Furniture',
      address: '18/201 ถ.เลียบคลอง 4 ลำลูกกา ปทุมธานี',
      phone: '097-046-7330',
      email: 'sales@henryco.example',
      taxId: '0135566123450',
    },
  ];
}

function ensureMockUserState(userId: string): MockDocsUserState {
  const state = loadMockDocsState();
  const existing = state.users[userId];

  if (existing) {
    if (!existing.customers?.length) {
      existing.customers = seedMockCustomers(existing.businessId);
      persistMockDocsState(state);
    }
    return existing;
  }

  const businessId = `mock-biz-${userId}`;
  const nextUserState: MockDocsUserState = {
    businessId,
    businessName: 'Workspace Documents',
    email: getMockUserEmail(userId),
    sequenceByType: {},
    customers: seedMockCustomers(businessId),
    documents: [],
  };

  state.users[userId] = nextUserState;
  persistMockDocsState(state);
  return nextUserState;
}

function withMockUserState<T>(userId: string, recipe: (userState: MockDocsUserState) => T): T {
  const state = loadMockDocsState();
  const userState = state.users[userId] || (() => {
    const created = ensureMockUserState(userId);
    state.users[userId] = created;
    return created;
  })();
  const result = recipe(userState);
  persistMockDocsState(state);
  return result;
}

function normalizeItems(items?: DocumentItem[]): DocumentItem[] {
  const source = items && items.length > 0
    ? items
    : [{
        line_no: 1,
        description_th: '',
        qty: 1,
        unit: 'รายการ',
        unit_price: 0,
        amount: 0,
      }];

  return source.map((item, index) => {
    const qty = safeNumber(item.qty, 0);
    const unitPrice = safeNumber(item.unit_price, 0);

    return {
      line_no: index + 1,
      description_th: item.description_th || '',
      description_en: item.description_en || null,
      qty,
      unit: item.unit || 'รายการ',
      unit_price: unitPrice,
      amount: qty * unitPrice,
    };
  });
}

function normalizeTaxSnapshot(snapshot: TaxSnapshot | undefined, docType: DocType): TaxSnapshot {
  return {
    vatEnabled: snapshot?.vatEnabled ?? (docType !== 'QUO'),
    vatRate: safeNumber(snapshot?.vatRate, 7),
    whtEnabled: snapshot?.whtEnabled ?? false,
    whtRate: safeNumber(snapshot?.whtRate, 3),
    whtBase: snapshot?.whtBase === 'AFTER_VAT' ? 'AFTER_VAT' : 'BEFORE_VAT',
  };
}

function calculateMoneySummary(
  items: DocumentItem[],
  discountAmount: number,
  discountType: 'amount' | 'percent',
  discountPct: number,
  extraFeeAmount: number,
  taxSnapshot: TaxSnapshot,
): MoneySummary {
  // subtotal = sum of gross amounts before any discounts
  const subtotal = items.reduce((sum, item) => sum + safeNumber(item.amount, 0), 0);

  // Per-item discounts
  const lineDiscountTotal = items.reduce((sum, item) => {
    const pct = safeNumber(item.discount_pct, 0);
    return pct > 0 ? sum + safeNumber(item.amount, 0) * (pct / 100) : sum;
  }, 0);

  const subtotalAfterItems = subtotal - lineDiscountTotal;

  // Document-level discount
  const resolvedDocDiscount = discountType === 'percent'
    ? subtotalAfterItems * (safeNumber(discountPct, 0) / 100)
    : safeNumber(discountAmount, 0);

  const totalDiscountAmount = lineDiscountTotal + resolvedDocDiscount;
  const extraFee = safeNumber(extraFeeAmount, 0);

  // subtotalAfterItems - doc discount + extra fee = taxable base
  const taxableBase = subtotalAfterItems - resolvedDocDiscount + extraFee;
  const vatAmount = taxSnapshot.vatEnabled ? taxableBase * (taxSnapshot.vatRate / 100) : 0;
  const totalAmount = taxableBase + vatAmount;
  const whtBase = taxSnapshot.whtBase === 'AFTER_VAT' ? totalAmount : taxableBase;
  const whtAmount = taxSnapshot.whtEnabled ? whtBase * (taxSnapshot.whtRate / 100) : 0;

  return {
    subtotal,
    line_discount_total: lineDiscountTotal,
    discount_amount: Math.round(totalDiscountAmount * 100) / 100,
    discount_type: discountType,
    discount_pct: safeNumber(discountPct, 0),
    extra_fee_amount: extraFee,
    vat_amount: vatAmount,
    wht_amount: whtAmount,
    total_amount: totalAmount,
    net_receive_amount: totalAmount - whtAmount,
    discount_enabled: totalDiscountAmount > 0,
    vat_enabled: taxSnapshot.vatEnabled,
    wht_enabled: taxSnapshot.whtEnabled,
    extra_fee_enabled: extraFee > 0,
    vat_rate_pct: taxSnapshot.vatRate,
    wht_rate_pct: taxSnapshot.whtRate,
  };
}

function buildCustomerSnapshot(customers: Customer[], customerId: string) {
  const customer = customers.find((entry) => entry.id === customerId);
  if (!customer) return undefined;

  return {
    displayName: customer.displayName,
    address: customer.address,
    taxId: customer.taxId,
  };
}

function nextMockDocNo(userState: MockDocsUserState, docType: DocType): string {
  const nextSeq = safeNumber(userState.sequenceByType[docType], 0) + 1;
  userState.sequenceByType[docType] = nextSeq;

  const buddhistYear = new Date().getFullYear() + 543;
  return `${MOCK_DOC_TYPE_PREFIX[docType]}-${buddhistYear}-${String(nextSeq).padStart(4, '0')}`;
}

function buildMockDocument(userState: MockDocsUserState, existing: EzDocument | null, data: Partial<DocumentInput>): EzDocument {
  const docType = (data.docType || existing?.docType || 'QUO') as DocType;
  const customerId = String(data.customerId || existing?.customerId || userState.customers[0]?.id || '');
  const issueDate = String(data.issueDate || existing?.issueDate || new Date().toISOString().slice(0, 10));
  const items = normalizeItems(data.items || existing?.items);
  const taxSnapshot = normalizeTaxSnapshot((data.taxSnapshot || existing?.taxSnapshot) as TaxSnapshot | undefined, docType);
  const discountType: 'amount' | 'percent' = (data.discount_type || existing?.money.discount_type || 'amount') as 'amount' | 'percent';
  const discountPct = safeNumber(data.discount_pct, existing?.money.discount_pct || 0);
  // For 'amount' type, fall back to old money.discount_amount minus line discounts (backward compat)
  const discountAmount = discountType === 'amount'
    ? safeNumber(data.discount_amount, (existing?.money.discount_amount || 0) - (existing?.money.line_discount_total || 0))
    : 0;
  const extraFeeAmount = safeNumber(data.extra_fee_amount, existing?.money.extra_fee_amount || 0);
  const now = currentIsoDate();
  const customerSnapshot = buildCustomerSnapshot(userState.customers, customerId);

  return {
    id: existing?.id || randomId(),
    docNo: existing?.docNo || 'DRAFT',
    docType,
    status: existing?.status || 'DRAFT',
    customerId,
    customerSnapshot,
    issueDate,
    dueDate: existing?.dueDate,
    subjectTh: String(data.subjectTh || existing?.subjectTh || ''),
    subjectEn: existing?.subjectEn,
    items,
    payment_milestones: clone((data.payment_milestones || existing?.payment_milestones || []) as PaymentMilestone[]),
    money: calculateMoneySummary(items, discountAmount, discountType, discountPct, extraFeeAmount, taxSnapshot),
    taxSnapshot,
    revision: existing ? existing.revision + 1 : 1,
    pdfReady: false,
    pdfUrl: null,
    pdfState: undefined,
    openedByClient: existing?.openedByClient,
    documentOpenedAt: existing?.documentOpenedAt,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
    version: existing ? existing.version + 1 : 1,
    origin_document_id: existing?.origin_document_id || null,
    supersedes_document_id: existing?.supersedes_document_id || null,
    is_void: existing?.is_void || false,
  };
}

async function getAuthHeaders(): Promise<HeadersInit> {
  const user = auth.currentUser;
  if (!user) {
    throw new DocsApiError(401, 'กรุณาเข้าสู่ระบบด้วยบัญชี EzBOQ ก่อนใช้งานโมดูลเอกสาร');
  }

  const token = await user.getIdToken();
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

async function docsFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = await getAuthHeaders();
  const response = await fetch(buildUrl(path), {
    ...init,
    headers: {
      ...headers,
      ...init?.headers,
    },
  });

  if (!response.ok) {
    let message = response.statusText;
    try {
      const payload = await response.json();
      message = payload.error || payload.message || response.statusText;
    } catch {
      // Ignore parse failures and use status text.
    }
    throw new DocsApiError(response.status, message || 'เกิดข้อผิดพลาดจากระบบเอกสาร');
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json() as Promise<T>;
}

const mockDocsApi = {
  getUserId(): string {
    const userId = getMockDocsUserId();
    if (!userId) {
      throw new DocsApiError(401, 'mock auth session ไม่พร้อมใช้งานสำหรับโมดูลเอกสาร');
    }

    return userId;
  },

  async getMe(): Promise<UserProfile> {
    const userId = mockDocsApi.getUserId();
    const userState = ensureMockUserState(userId);

    return clone({
      userId,
      email: userState.email,
      activeBusinessId: userState.businessId,
      business: {
        id: userState.businessId,
        name: userState.businessName,
      },
      businesses: [
        {
          id: userState.businessId,
          name: userState.businessName,
        },
      ],
    });
  },

  async bootstrapBusiness(): Promise<{ success: boolean; created: boolean; businessId: string; activeBusinessId: string }> {
    const userId = mockDocsApi.getUserId();
    const userState = ensureMockUserState(userId);

    return {
      success: true,
      created: false,
      businessId: userState.businessId,
      activeBusinessId: userState.businessId,
    };
  },

  async listCustomers(params?: { limit?: number; q?: string }): Promise<CustomerListResponse> {
    const userId = mockDocsApi.getUserId();
    const userState = ensureMockUserState(userId);
    const query = params?.q?.trim().toLowerCase();
    const filtered = query
      ? userState.customers.filter((customer) =>
          [customer.displayName, customer.email, customer.phone, customer.taxId]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()
            .includes(query))
      : userState.customers;
    const limited = params?.limit ? filtered.slice(0, params.limit) : filtered;

    return clone({
      businessId: userState.businessId,
      customers: limited,
      count: limited.length,
    });
  },

  async listDocuments(params?: { limit?: number; type?: string; status?: string; customerId?: string }): Promise<DocumentListResponse> {
    const userId = mockDocsApi.getUserId();
    const userState = ensureMockUserState(userId);

    const filtered = userState.documents.filter((document) => {
      if (params?.type && document.docType !== params.type) return false;
      if (params?.status && document.status !== params.status) return false;
      if (params?.customerId && document.customerId !== params.customerId) return false;
      return true;
    });
    const limited = params?.limit ? filtered.slice(0, params.limit) : filtered;

    return clone({
      documents: limited,
      count: limited.length,
    });
  },

  async getDocument(docId: string): Promise<EzDocument> {
    const userId = mockDocsApi.getUserId();
    const userState = ensureMockUserState(userId);
    const document = userState.documents.find((entry) => entry.id === docId);

    if (!document) {
      throw new DocsApiError(404, 'ไม่พบเอกสารที่ต้องการเปิด');
    }

    return clone(document);
  },

  async createDocument(data: DocumentInput): Promise<EzDocument> {
    const userId = mockDocsApi.getUserId();

    return withMockUserState(userId, (userState) => {
      const created = buildMockDocument(userState, null, data);
      userState.documents = [created, ...userState.documents];
      return clone(created);
    });
  },

  async updateDocument(docId: string, data: Partial<DocumentInput>): Promise<EzDocument> {
    const userId = mockDocsApi.getUserId();

    return withMockUserState(userId, (userState) => {
      const index = userState.documents.findIndex((entry) => entry.id === docId);
      if (index === -1) {
        throw new DocsApiError(404, 'ไม่พบ draft ที่ต้องการบันทึก');
      }

      const current = userState.documents[index];
      if (current.status !== 'DRAFT') {
        throw new DocsApiError(409, 'เอกสารฉบับนี้ถูกออกแล้ว จึงแก้ไขไม่ได้');
      }

      const updated = buildMockDocument(userState, current, data);
      userState.documents[index] = updated;
      return clone(updated);
    });
  },

  async generatePdf(docId: string): Promise<{ success: boolean; jobId: string }> {
    const userId = mockDocsApi.getUserId();

    return withMockUserState(userId, (userState) => {
      const index = userState.documents.findIndex((entry) => entry.id === docId);
      if (index === -1) {
        throw new DocsApiError(404, 'ไม่พบเอกสารที่ต้องการสร้าง PDF');
      }

      const current = userState.documents[index];
      userState.documents[index] = {
        ...current,
        pdfReady: true,
        pdfState: 'READY',
        pdfUrl: MOCK_PDF_DATA_URL,
        updatedAt: currentIsoDate(),
        version: current.version + 1,
      };

      return {
        success: true,
        jobId: `mock-pdf-${docId}`,
      };
    });
  },

  async markReady(docId: string): Promise<{ id: string; status: string }> {
    const userId = mockDocsApi.getUserId();

    return withMockUserState(userId, (userState) => {
      const index = userState.documents.findIndex((entry) => entry.id === docId);
      if (index === -1) {
        throw new DocsApiError(404, 'ไม่พบเอกสารที่ต้องการเตรียมออก');
      }

      const current = userState.documents[index];
      userState.documents[index] = {
        ...current,
        status: 'READY',
        updatedAt: currentIsoDate(),
        version: current.version + 1,
      };

      return {
        id: docId,
        status: 'READY',
      };
    });
  },

  async confirmDocument(docId: string): Promise<EzDocument> {
    const userId = mockDocsApi.getUserId();

    return withMockUserState(userId, (userState) => {
      const index = userState.documents.findIndex((entry) => entry.id === docId);
      if (index === -1) {
        throw new DocsApiError(404, 'ไม่พบเอกสารที่ต้องการออก');
      }

      const current = userState.documents[index];
      const docNo = current.docNo && current.docNo !== 'DRAFT'
        ? current.docNo
        : nextMockDocNo(userState, current.docType);
      const confirmed: EzDocument = {
        ...current,
        docNo,
        status: 'ISSUED',
        updatedAt: currentIsoDate(),
        version: current.version + 1,
      };

      userState.documents[index] = confirmed;
      return clone(confirmed);
    });
  },

  async deliverDocument(docId: string, businessId: string): Promise<DocumentDeliveryResponse> {
    const userId = mockDocsApi.getUserId();
    const userState = ensureMockUserState(userId);
    const document = userState.documents.find((entry) => entry.id === docId);

    if (!document) {
      throw new DocsApiError(404, 'ไม่พบเอกสารที่ต้องการส่ง');
    }

    if (businessId !== userState.businessId) {
      throw new DocsApiError(403, 'businessId ไม่ตรงกับ mock workspace ปัจจุบัน');
    }

    if (document.status === 'DRAFT') {
      throw new DocsApiError(409, 'ต้องออกเอกสารก่อนจึงจะส่งผ่าน LINE ได้');
    }

    return {
      jobId: `mock-line-${docId}`,
      status: 'QUEUED',
      message: 'ส่งข้อความ mock ไปที่ LINE แล้ว',
    };
  },
};

export const docsApi = {
  async getMe(): Promise<UserProfile> {
    if (shouldUseMockDocsApi()) return mockDocsApi.getMe();
    return docsFetch<UserProfile>('/v1/me');
  },

  async bootstrapBusiness(): Promise<{ success: boolean; created: boolean; businessId: string; activeBusinessId: string }> {
    if (shouldUseMockDocsApi()) return mockDocsApi.bootstrapBusiness();
    return docsFetch('/v1/business/bootstrap', { method: 'POST' });
  },

  async listCustomers(params?: { limit?: number; q?: string }): Promise<CustomerListResponse> {
    if (shouldUseMockDocsApi()) return mockDocsApi.listCustomers(params);

    const query = new URLSearchParams();
    if (params?.limit) query.append('limit', String(params.limit));
    if (params?.q) query.append('q', params.q);
    return docsFetch(`/v1/customers?${query.toString()}`);
  },

  async listDocuments(params?: { limit?: number; type?: string; status?: string; customerId?: string }): Promise<DocumentListResponse> {
    if (shouldUseMockDocsApi()) return mockDocsApi.listDocuments(params);

    const query = new URLSearchParams();
    if (params?.limit) query.append('limit', String(params.limit));
    if (params?.type) query.append('docType', params.type);
    if (params?.status) query.append('status', params.status);
    if (params?.customerId) query.append('customerId', params.customerId);
    return docsFetch(`/v1/documents?${query.toString()}`);
  },

  async getDocument(docId: string): Promise<EzDocument> {
    if (shouldUseMockDocsApi()) return mockDocsApi.getDocument(docId);
    return docsFetch(`/v1/documents/${docId}`);
  },

  async createDocument(data: DocumentInput): Promise<EzDocument> {
    if (shouldUseMockDocsApi()) return mockDocsApi.createDocument(data);
    return docsFetch('/v1/documents', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateDocument(docId: string, data: Partial<DocumentInput>): Promise<EzDocument> {
    if (shouldUseMockDocsApi()) return mockDocsApi.updateDocument(docId, data);
    return docsFetch(`/v1/documents/${docId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async generatePdf(docId: string): Promise<{ success: boolean; jobId: string }> {
    if (shouldUseMockDocsApi()) return mockDocsApi.generatePdf(docId);
    return docsFetch(`/v1/documents/${docId}/generate-pdf`, {
      method: 'POST',
    });
  },

  async markReady(docId: string): Promise<{ id: string; status: string }> {
    if (shouldUseMockDocsApi()) return mockDocsApi.markReady(docId);
    return docsFetch(`/v1/documents/${docId}/ready`, {
      method: 'POST',
    });
  },

  async confirmDocument(docId: string): Promise<EzDocument> {
    if (shouldUseMockDocsApi()) return mockDocsApi.confirmDocument(docId);
    return docsFetch(`/v1/documents/${docId}/confirm`, {
      method: 'POST',
    });
  },

  async deliverDocument(docId: string, businessId: string): Promise<DocumentDeliveryResponse> {
    if (shouldUseMockDocsApi()) return mockDocsApi.deliverDocument(docId, businessId);
    return docsFetch(`/v1/documents/${docId}/deliver`, {
      method: 'POST',
      body: JSON.stringify({ businessId }),
    });
  },
};
