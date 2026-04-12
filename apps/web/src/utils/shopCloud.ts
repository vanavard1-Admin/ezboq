import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import type { AuthUser } from './authSession';
import { db } from './firebase';
import type { PoDraft } from './boqShopIntegration';
import type { ProjectData } from './projectData';
import {
  buildPoDraftFromProject,
  calculateLandedCost,
  recommendSearchRadiusKm,
  type PurchaseListSummary,
  type QuoteIntakeChannel,
  type VendorQuoteOption,
} from './rfqMarketplace';
import {
  shopCategories,
  shopProducts,
  shopVendors,
  type ProductOffer,
  type ShopCategory,
  type ShopProduct,
  type ShopVendor,
} from './shopCatalog';
import { scopedKey } from './userScope';

const SHOP_SEED_VERSION = 'rfq-phase-4-v1';
const LOCAL_RFQ_KEY = 'ezboq_shop_rfqs_v1';

export type ShopCatalogSource = 'cloud' | 'seed';
export type ShopRfqStatus = 'requested' | 'quoted' | 'awarded' | 'closed';
export type ShopVendorQuoteStatus = 'requested' | 'received' | 'awarded' | 'declined';

export interface VendorQuoteUpdateInput {
  channel: QuoteIntakeChannel;
  materialSubtotal: number;
  shippingFee: number;
  etaDays: number;
  status: ShopVendorQuoteStatus;
  notes?: string;
}

export interface ShopCatalogSnapshot {
  categories: ShopCategory[];
  products: ShopProduct[];
  vendors: ShopVendor[];
  source: ShopCatalogSource;
}

export interface ShopVendorQuoteRecord extends VendorQuoteOption {
  status: ShopVendorQuoteStatus;
  rank: number;
  notes?: string;
  respondedAt?: string;
}

export interface ShopRfqRecord {
  id: string;
  title: string;
  projectId: string;
  projectName: string;
  status: ShopRfqStatus;
  purchaseList: PurchaseListSummary;
  searchRadiusKm: number;
  vendorQuotes: ShopVendorQuoteRecord[];
  poDraft: PoDraft;
  recommendedVendorId?: string;
  awardedVendorId?: string;
  notes?: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
  source: 'cloud' | 'local';
}

interface EnsureWorkspaceShopSeedOptions {
  force?: boolean;
}

function categoryCollection(workspaceId: string) {
  return collection(db, 'workspaces', workspaceId, 'shop_categories');
}

function productCollection(workspaceId: string) {
  return collection(db, 'workspaces', workspaceId, 'shop_products');
}

function vendorCollection(workspaceId: string) {
  return collection(db, 'workspaces', workspaceId, 'shop_vendors');
}

function rfqCollection(workspaceId: string) {
  return collection(db, 'workspaces', workspaceId, 'shop_rfqs');
}

function shopMetaRef(workspaceId: string) {
  return doc(db, 'workspaces', workspaceId, 'shop_meta', 'catalog');
}

function toIsoString(value: unknown): string {
  if (typeof value === 'string' && value.trim()) return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object' && value !== null && 'toDate' in value && typeof (value as { toDate?: () => Date }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  return new Date().toISOString();
}

function stringOrFallback(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function numberOrFallback(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function responseChannels(value: unknown): QuoteIntakeChannel[] {
  return Array.isArray(value)
    ? value.filter((item): item is QuoteIntakeChannel => item === 'line_oa' || item === 'google_form' || item === 'admin_call')
    : [];
}

function normalizeOffer(value: unknown): ProductOffer | null {
  if (!isRecord(value)) return null;
  const vendorId = stringOrFallback(value.vendorId);
  if (!vendorId) return null;

  return {
    vendorId,
    price: numberOrFallback(value.price),
    leadTimeDays: numberOrFallback(value.leadTimeDays, 1),
  };
}

function normalizeCategory(id: string, value: unknown): ShopCategory {
  const record = isRecord(value) ? value : {};
  return {
    id,
    name: stringOrFallback(record.name, id),
  };
}

function normalizeVendor(id: string, value: unknown): ShopVendor {
  const record = isRecord(value) ? value : {};
  return {
    id,
    name: stringOrFallback(record.name, id),
    contact: stringOrFallback(record.contact),
    phone: stringOrFallback(record.phone),
    lineId: stringOrFallback(record.lineId),
    lineOaUrl: stringOrFallback(record.lineOaUrl) || undefined,
    responseFormSlug: stringOrFallback(record.responseFormSlug) || undefined,
    responseFormUrl: stringOrFallback(record.responseFormUrl) || undefined,
    address: stringOrFallback(record.address),
    district: stringOrFallback(record.district),
    province: stringOrFallback(record.province),
    serviceAreas: Array.isArray(record.serviceAreas)
      ? record.serviceAreas.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      : undefined,
    supportedCategoryIds: Array.isArray(record.supportedCategoryIds)
      ? record.supportedCategoryIds.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      : undefined,
    deliveryRadiusKm: numberOrFallback(record.deliveryRadiusKm, 10),
    deliveryEtaDays: numberOrFallback(record.deliveryEtaDays, 1),
    minimumOrderValue: typeof record.minimumOrderValue === 'number' ? record.minimumOrderValue : undefined,
    paymentTerms: stringOrFallback(record.paymentTerms) || undefined,
    responseChannels: responseChannels(record.responseChannels),
  };
}

function normalizeProduct(id: string, value: unknown): ShopProduct {
  const record = isRecord(value) ? value : {};
  return {
    id,
    sku: stringOrFallback(record.sku, id),
    name: stringOrFallback(record.name, id),
    brand: typeof record.brand === 'string' ? record.brand : undefined,
    categoryId: stringOrFallback(record.categoryId),
    vendorId: stringOrFallback(record.vendorId),
    unit: stringOrFallback(record.unit, 'ชิ้น'),
    price: numberOrFallback(record.price),
    stock: numberOrFallback(record.stock),
    leadTimeDays: numberOrFallback(record.leadTimeDays, 1),
    featured: record.featured === true,
    alternateOffers: Array.isArray(record.alternateOffers)
      ? record.alternateOffers.map(normalizeOffer).filter((offer): offer is ProductOffer => offer !== null)
      : [],
  };
}

function normalizePurchaseListSummary(value: unknown): PurchaseListSummary {
  if (!isRecord(value)) {
    return {
      lines: [],
      matchedLines: 0,
      reviewLines: 0,
      unmatchedLines: 0,
      estimatedSubtotal: 0,
    };
  }

  const lines = Array.isArray(value.lines)
    ? value.lines
        .filter(isRecord)
        .map((line, index) => ({
          id: stringOrFallback(line.id, `line-${index + 1}`),
          boqNo: stringOrFallback(line.boqNo),
          description: stringOrFallback(line.description),
          quantity: numberOrFallback(line.quantity),
          unit: stringOrFallback(line.unit, '-'),
          confidence: numberOrFallback(line.confidence),
          matchedProductId: typeof line.matchedProductId === 'string' ? line.matchedProductId : undefined,
          matchedProductName: typeof line.matchedProductName === 'string' ? line.matchedProductName : undefined,
          preferredVendorId: typeof line.preferredVendorId === 'string' ? line.preferredVendorId : undefined,
          estimatedUnitPrice: typeof line.estimatedUnitPrice === 'number' ? line.estimatedUnitPrice : undefined,
          estimatedAmount: typeof line.estimatedAmount === 'number' ? line.estimatedAmount : undefined,
          status: normalizePurchaseLineStatus(line.status),
          note: stringOrFallback(line.note),
        }))
    : [];

  return {
    lines,
    matchedLines: numberOrFallback(value.matchedLines),
    reviewLines: numberOrFallback(value.reviewLines),
    unmatchedLines: numberOrFallback(value.unmatchedLines),
    estimatedSubtotal: numberOrFallback(value.estimatedSubtotal),
  };
}

function normalizePurchaseLineStatus(value: unknown): 'matched' | 'review' | 'unmatched' {
  if (value === 'matched' || value === 'review' || value === 'unmatched') {
    return value;
  }
  return 'review';
}

function normalizePoDraft(value: unknown): PoDraft {
  if (!isRecord(value)) {
    return {
      id: 'PO-DRAFT',
      createdAt: new Date().toISOString(),
      lines: [],
      totalAmount: 0,
      unmatched: [],
    };
  }

  return {
    id: stringOrFallback(value.id, 'PO-DRAFT'),
    createdAt: toIsoString(value.createdAt),
    lines: Array.isArray(value.lines)
      ? value.lines
          .filter(isRecord)
          .map((line) => ({
            sku: stringOrFallback(line.sku),
            productName: stringOrFallback(line.productName),
            vendorName: stringOrFallback(line.vendorName),
            unit: stringOrFallback(line.unit, '-'),
            quantity: numberOrFallback(line.quantity),
            unitPrice: numberOrFallback(line.unitPrice),
            leadTimeDays: numberOrFallback(line.leadTimeDays, 1),
            amount: numberOrFallback(line.amount),
          }))
      : [],
    totalAmount: numberOrFallback(value.totalAmount),
    unmatched: Array.isArray(value.unmatched)
      ? value.unmatched.filter((line): line is string => typeof line === 'string')
      : [],
  };
}

function normalizeVendorQuote(value: unknown, index: number): ShopVendorQuoteRecord | null {
  if (!isRecord(value)) return null;
  const vendorId = stringOrFallback(value.vendorId);
  if (!vendorId) return null;

  return {
    vendorId,
    vendorName: stringOrFallback(value.vendorName, vendorId),
    channel: responseChannels([value.channel])[0] || 'admin_call',
    radiusKm: numberOrFallback(value.radiusKm, 10),
    etaDays: numberOrFallback(value.etaDays, 1),
    shippingFee: numberOrFallback(value.shippingFee),
    materialSubtotal: numberOrFallback(value.materialSubtotal),
    landedCost: numberOrFallback(value.landedCost),
    matchedLines: numberOrFallback(value.matchedLines),
    reviewLines: numberOrFallback(value.reviewLines),
    confidenceScore: numberOrFallback(value.confidenceScore),
    status: value.status === 'received' || value.status === 'awarded' || value.status === 'declined' ? value.status : 'requested',
    rank: numberOrFallback(value.rank, index + 1),
    notes: typeof value.notes === 'string' ? value.notes : undefined,
    respondedAt: typeof value.respondedAt === 'string' ? value.respondedAt : undefined,
  };
}

function normalizeRfq(id: string, value: unknown): ShopRfqRecord {
  const record = isRecord(value) ? value : {};
  return {
    id,
    title: stringOrFallback(record.title, `RFQ ${id}`),
    projectId: stringOrFallback(record.projectId),
    projectName: stringOrFallback(record.projectName, 'ไม่ระบุโครงการ'),
    status: record.status === 'quoted' || record.status === 'awarded' || record.status === 'closed' ? record.status : 'requested',
    purchaseList: normalizePurchaseListSummary(record.purchaseList),
    searchRadiusKm: numberOrFallback(record.searchRadiusKm, 10),
    vendorQuotes: Array.isArray(record.vendorQuotes)
      ? record.vendorQuotes.map(normalizeVendorQuote).filter((quote): quote is ShopVendorQuoteRecord => quote !== null)
      : [],
    poDraft: normalizePoDraft(record.poDraft),
    recommendedVendorId: typeof record.recommendedVendorId === 'string' ? record.recommendedVendorId : undefined,
    awardedVendorId: typeof record.awardedVendorId === 'string' ? record.awardedVendorId : undefined,
    notes: typeof record.notes === 'string' ? record.notes : undefined,
    createdBy: stringOrFallback(record.createdBy),
    createdByName: stringOrFallback(record.createdByName, 'EzBOQ'),
    createdAt: toIsoString(record.createdAt),
    updatedAt: toIsoString(record.updatedAt),
    source: record.source === 'local' ? 'local' : 'cloud',
  };
}

function toSerializable<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function normalizeVendorQuoteRank(quotes: ShopVendorQuoteRecord[]): ShopVendorQuoteRecord[] {
  const sorted = [...quotes].sort((left, right) => {
    const leftDeclined = left.status === 'declined';
    const rightDeclined = right.status === 'declined';
    if (leftDeclined !== rightDeclined) return leftDeclined ? 1 : -1;
    if (left.landedCost !== right.landedCost) return left.landedCost - right.landedCost;
    if (left.etaDays !== right.etaDays) return left.etaDays - right.etaDays;
    return left.vendorName.localeCompare(right.vendorName, 'th');
  });

  return sorted.map((quote, index) => ({
    ...quote,
    rank: index + 1,
  }));
}

function deriveRfqStatus(rfq: ShopRfqRecord, quotes: ShopVendorQuoteRecord[]): ShopRfqStatus {
  if (rfq.status === 'closed') return 'closed';
  if (quotes.some((quote) => quote.status === 'awarded')) return 'awarded';
  if (quotes.some((quote) => quote.status === 'received' || quote.status === 'declined')) return 'quoted';
  return 'requested';
}

export function updateVendorQuoteRecord(
  rfq: ShopRfqRecord,
  vendorId: string,
  input: VendorQuoteUpdateInput,
): ShopRfqRecord {
  const updatedAt = new Date().toISOString();
  const normalizedMaterialSubtotal = Math.max(0, Math.round(input.materialSubtotal));
  const normalizedShippingFee = Math.max(0, Math.round(input.shippingFee));
  const normalizedEtaDays = Math.max(1, Math.round(input.etaDays));
  const normalizedNotes = input.notes?.trim() || undefined;

  const nextVendorQuotes = normalizeVendorQuoteRank(
    rfq.vendorQuotes.map((quote) => {
      if (quote.vendorId !== vendorId) return quote;

      const nextStatus = input.status === 'awarded' ? 'awarded' : input.status;
      return {
        ...quote,
        channel: input.channel,
        materialSubtotal: normalizedMaterialSubtotal,
        shippingFee: normalizedShippingFee,
        etaDays: normalizedEtaDays,
        landedCost: calculateLandedCost(normalizedMaterialSubtotal, normalizedShippingFee),
        status: nextStatus,
        notes: normalizedNotes,
        respondedAt: nextStatus === 'requested' ? quote.respondedAt : updatedAt,
      };
    }),
  );

  const awardedVendorId = nextVendorQuotes.find((quote) => quote.status === 'awarded')?.vendorId;
  const recommendedVendorId = awardedVendorId
    || nextVendorQuotes.find((quote) => quote.status !== 'declined')?.vendorId
    || rfq.recommendedVendorId;

  return {
    ...rfq,
    vendorQuotes: nextVendorQuotes,
    updatedAt,
    status: deriveRfqStatus(rfq, nextVendorQuotes),
    awardedVendorId,
    recommendedVendorId,
  };
}

function localRfqKey(): string {
  return scopedKey(LOCAL_RFQ_KEY);
}

export function loadLocalShopRfqs(): ShopRfqRecord[] {
  if (typeof localStorage === 'undefined') return [];

  try {
    const stored = localStorage.getItem(localRfqKey());
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item, index) => normalizeRfq(isRecord(item) ? stringOrFallback(item.id, `local-${index + 1}`) : `local-${index + 1}`, item));
  } catch {
    return [];
  }
}

export function saveLocalShopRfqs(rfqs: ShopRfqRecord[]): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(localRfqKey(), JSON.stringify(toSerializable(rfqs)));
}

export function createShopRfqDraft(
  user: AuthUser,
  project: ProjectData,
  purchaseList: PurchaseListSummary,
  quoteOptions: VendorQuoteOption[],
): ShopRfqRecord {
  const now = new Date().toISOString();
  const recommendedVendorId = quoteOptions[0]?.vendorId;

  return {
    id: `rfq-${Date.now()}`,
    title: `RFQ - ${project.name}`,
    projectId: project.id,
    projectName: project.name,
    status: 'requested',
    purchaseList,
    searchRadiusKm: recommendSearchRadiusKm(purchaseList.estimatedSubtotal),
    vendorQuotes: quoteOptions.map((quote, index) => ({
      ...quote,
      status: 'requested',
      rank: index + 1,
    })),
    poDraft: buildPoDraftFromProject(project),
    recommendedVendorId,
    notes: 'สร้างจาก BOQ และ catalog ปัจจุบันของโครงการ',
    createdBy: user.id,
    createdByName: user.name,
    createdAt: now,
    updatedAt: now,
    source: 'cloud',
  };
}

async function seedWorkspaceShopCatalog(user: AuthUser): Promise<ShopCatalogSnapshot> {
  const now = new Date().toISOString();
  const batch = writeBatch(db);

  for (const category of shopCategories) {
    batch.set(
      doc(categoryCollection(user.workspaceId), category.id),
      {
        ...category,
        updatedAt: now,
      },
      { merge: true },
    );
  }

  for (const vendor of shopVendors) {
    batch.set(
      doc(vendorCollection(user.workspaceId), vendor.id),
      {
        ...vendor,
        updatedAt: now,
      },
      { merge: true },
    );
  }

  for (const product of shopProducts) {
    batch.set(
      doc(productCollection(user.workspaceId), product.id),
      {
        ...product,
        updatedAt: now,
      },
      { merge: true },
    );
  }

  batch.set(
    shopMetaRef(user.workspaceId),
    {
      seedVersion: SHOP_SEED_VERSION,
      seededAt: now,
      categories: shopCategories.length,
      vendors: shopVendors.length,
      products: shopProducts.length,
      updatedAt: now,
    },
    { merge: true },
  );

  await batch.commit();
  return {
    categories: shopCategories,
    products: shopProducts,
    vendors: shopVendors,
    source: 'seed',
  };
}

export async function ensureWorkspaceShopSeed(
  user: AuthUser,
  options: EnsureWorkspaceShopSeedOptions = {},
): Promise<ShopCatalogSnapshot> {
  const metaSnapshot = await getDoc(shopMetaRef(user.workspaceId));
  const productSeedCheck = await getDocs(query(productCollection(user.workspaceId), limit(1)));
  const currentSeedVersion = stringOrFallback(metaSnapshot.data()?.seedVersion);

  if (!options.force && !productSeedCheck.empty && currentSeedVersion === SHOP_SEED_VERSION) {
    return loadWorkspaceShopCatalog(user);
  }
  return seedWorkspaceShopCatalog(user);
}

export async function loadWorkspaceShopCatalog(user: AuthUser): Promise<ShopCatalogSnapshot> {
  const [categorySnapshot, productSnapshot, vendorSnapshot] = await Promise.all([
    getDocs(categoryCollection(user.workspaceId)),
    getDocs(productCollection(user.workspaceId)),
    getDocs(vendorCollection(user.workspaceId)),
  ]);

  const categories = categorySnapshot.docs.map((item) => normalizeCategory(item.id, item.data()));
  const products = productSnapshot.docs.map((item) => normalizeProduct(item.id, item.data()));
  const vendors = vendorSnapshot.docs.map((item) => normalizeVendor(item.id, item.data()));

  if (categories.length === 0 || products.length === 0 || vendors.length === 0) {
    return {
      categories: shopCategories,
      products: shopProducts,
      vendors: shopVendors,
      source: 'seed',
    };
  }

  return {
    categories,
    products,
    vendors,
    source: 'cloud',
  };
}

export function subscribeWorkspaceRfqs(
  user: AuthUser,
  onRfqs: (rfqs: ShopRfqRecord[]) => void,
  onError: (error: Error) => void,
): () => void {
  const rfqsQuery = query(rfqCollection(user.workspaceId), orderBy('updatedAt', 'desc'));

  return onSnapshot(
    rfqsQuery,
    (snapshot) => {
      onRfqs(snapshot.docs.map((item) => normalizeRfq(item.id, item.data())));
    },
    (error) => {
      onError(error);
    },
  );
}

export async function saveWorkspaceRfq(user: AuthUser, rfq: ShopRfqRecord): Promise<ShopRfqRecord> {
  const normalized: ShopRfqRecord = {
    ...rfq,
    updatedAt: new Date().toISOString(),
    source: 'cloud',
  };

  await setDoc(
    doc(rfqCollection(user.workspaceId), normalized.id),
    toSerializable(normalized),
    { merge: true },
  );

  return normalized;
}

