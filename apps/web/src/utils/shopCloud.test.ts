import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createShopRfqDraft,
  loadLocalShopRfqs,
  saveLocalShopRfqs,
  updateVendorQuoteRecord,
  type ShopRfqRecord,
} from './shopCloud';
import { setCurrentUserId } from './userScope';
import type { AuthUser } from './authSession';
import type { ProjectData } from './projectData';
import type { PurchaseListSummary, VendorQuoteOption } from './rfqMarketplace';

const baseUser: AuthUser = {
  id: 'user-1',
  workspaceId: 'workspace-1',
  workspaceName: 'Workspace',
  name: 'Boss',
  email: 'boss@example.com',
  role: 'owner',
  title: 'Owner',
  company: 'EzBOQ',
  description: '',
  hasFullProjectAccess: true,
  assignedProjectIds: [],
  allowedTabs: [],
  canExportAll: true,
  canResetDemoData: false,
  canManageProjects: true,
  canOpenSpecialProjects: false,
};

const baseProject: ProjectData = {
  id: 'project-1',
  name: 'บ้านตัวอย่าง',
  address: '',
  phone: '',
  owner: 'คุณลูกค้า',
  quotationData: [
    { no: '1.1', description: 'ปูนซีเมนต์ปอร์ตแลนด์', unit: 'ถุง', quantity: 10, unitPrice: 135, laborCost: 0 },
  ],
};

const purchaseList: PurchaseListSummary = {
  lines: [
    {
      id: 'line-1',
      boqNo: '1.1',
      description: 'ปูนซีเมนต์ปอร์ตแลนด์',
      quantity: 10,
      unit: 'ถุง',
      confidence: 0.9,
      matchedProductId: 'product-1',
      matchedProductName: 'ปูนซีเมนต์ปอร์ตแลนด์',
      preferredVendorId: 'vendor-siam',
      estimatedUnitPrice: 135,
      estimatedAmount: 1_350,
      status: 'matched',
      note: 'match by name',
    },
  ],
  matchedLines: 1,
  reviewLines: 0,
  unmatchedLines: 0,
  estimatedSubtotal: 1_350,
};

const quoteOptions: VendorQuoteOption[] = [
  {
    vendorId: 'vendor-siam',
    vendorName: 'สยาม บิลด์ ซัพพลาย',
    channel: 'line_oa',
    radiusKm: 10,
    etaDays: 1,
    shippingFee: 350,
    materialSubtotal: 1_350,
    landedCost: 1_700,
    matchedLines: 1,
    reviewLines: 0,
    confidenceScore: 0.9,
  },
  {
    vendorId: 'vendor-homepro',
    vendorName: 'โฮมโปรเทรด ราชพฤกษ์',
    channel: 'google_form',
    radiusKm: 20,
    etaDays: 2,
    shippingFee: 450,
    materialSubtotal: 1_420,
    landedCost: 1_870,
    matchedLines: 1,
    reviewLines: 0,
    confidenceScore: 0.65,
  },
];

describe('shopCloud', () => {
  beforeEach(() => {
    const storage = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      clear: () => storage.clear(),
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
      removeItem: (key: string) => {
        storage.delete(key);
      },
    });
    globalThis.localStorage.clear();
    setCurrentUserId(baseUser.id);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('creates RFQ draft from project, purchase list, and vendor options', () => {
    const rfq = createShopRfqDraft(baseUser, baseProject, purchaseList, quoteOptions);

    expect(rfq.projectId).toBe(baseProject.id);
    expect(rfq.status).toBe('requested');
    expect(rfq.searchRadiusKm).toBe(10);
    expect(rfq.vendorQuotes[0]?.vendorId).toBe('vendor-siam');
    expect(rfq.poDraft.lines.length).toBeGreaterThanOrEqual(1);
  });

  it('persists RFQs in local scoped storage', () => {
    const rfq: ShopRfqRecord = createShopRfqDraft(baseUser, baseProject, purchaseList, quoteOptions);
    saveLocalShopRfqs([rfq]);

    const loaded = loadLocalShopRfqs();
    expect(loaded).toHaveLength(1);
    expect(loaded[0]?.id).toBe(rfq.id);
    expect(loaded[0]?.vendorQuotes[0]?.vendorId).toBe('vendor-siam');
  });

  it('updates vendor quote response and re-ranks the RFQ', () => {
    const rfq = createShopRfqDraft(baseUser, baseProject, purchaseList, quoteOptions);
    const updated = updateVendorQuoteRecord(rfq, 'vendor-homepro', {
      channel: 'admin_call',
      materialSubtotal: 1_100,
      shippingFee: 200,
      etaDays: 1,
      status: 'received',
      notes: 'โทรคอนเฟิร์มราคาและค่าส่งแล้ว',
    });

    expect(updated.status).toBe('quoted');
    expect(updated.recommendedVendorId).toBe('vendor-homepro');
    expect(updated.vendorQuotes[0]?.vendorId).toBe('vendor-homepro');
    expect(updated.vendorQuotes[0]?.landedCost).toBe(1_300);
    expect(updated.vendorQuotes[0]?.rank).toBe(1);
    expect(updated.vendorQuotes[0]?.respondedAt).toBeTruthy();
  });
});
