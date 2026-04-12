import {
  getPriceSources,
  MARKET_PRICE_REFERENCE_SERIES,
  MARKET_PRICE_REFERENCE_UPDATED_AT,
  materialPriceMaster,
  resolveMaterialUnitPrice,
  type PricingTier,
} from './materialPriceMaster';

export interface ShopVendor {
  id: string;
  name: string;
  contact: string;
  phone: string;
  lineId: string;
  lineOaUrl?: string;
  responseFormSlug?: string;
  responseFormUrl?: string;
  address: string;
  district: string;
  province: string;
  serviceAreas?: string[];
  supportedCategoryIds?: string[];
  deliveryRadiusKm: number;
  deliveryEtaDays: number;
  minimumOrderValue?: number;
  paymentTerms?: string;
  responseChannels: Array<'line_oa' | 'google_form' | 'admin_call'>;
}

export interface ShopCategory {
  id: string;
  name: string;
}

export interface ProductOffer {
  vendorId: string;
  price: number;
  leadTimeDays: number;
}

export interface ShopProduct {
  id: string;
  sku: string;
  name: string;
  brand?: string;
  categoryId: string;
  vendorId: string;
  unit: string;
  price: number;
  stock: number;
  leadTimeDays: number;
  featured?: boolean;
  alternateOffers?: ProductOffer[];
  aliases?: string[];
  sourceLabel?: string;
  sourceUrl?: string;
  lastCheckedAt?: string;
  priceOrigin?: 'official-index' | 'retail-snapshot' | 'market-benchmark';
}

export interface ProductReferenceStats {
  seriesLabel: string;
  updatedAt: string;
  skuCount: number;
  categoryCount: number;
  officialIndexCount: number;
  retailerSnapshotCount: number;
  benchmarkCount: number;
}

export const shopVendors: ShopVendor[] = [
  {
    id: 'vendor-siam',
    name: 'สยาม บิลด์ ซัพพลาย',
    contact: 'ฝ่ายขายโครงการ',
    phone: '02-111-2222',
    lineId: '@siambuild',
    lineOaUrl: 'https://line.me/R/ti/p/@siambuild',
    responseFormSlug: 'siam-build-bangyai',
    responseFormUrl: 'https://ezdoc-v1-th.web.app/#/shop/vendor/siam-build-bangyai',
    address: 'บางใหญ่ นนทบุรี',
    district: 'บางใหญ่',
    province: 'นนทบุรี',
    serviceAreas: ['บางใหญ่', 'บางบัวทอง', 'ปากเกร็ด', 'ราชพฤกษ์'],
    supportedCategoryIds: ['cement-mortar', 'tile-floor', 'paint', 'hardware', 'ceiling-wall'],
    deliveryRadiusKm: 12,
    deliveryEtaDays: 1,
    minimumOrderValue: 15000,
    paymentTerms: 'เครดิต 7 วัน / โอนก่อนส่งสำหรับออเดอร์ต่ำกว่า 15,000',
    responseChannels: ['line_oa', 'admin_call'],
  },
  {
    id: 'vendor-thaiwatsadu',
    name: 'ไทวัสดุ โปร บางบัวทอง',
    contact: 'ผู้จัดการสาขา',
    phone: '02-333-4444',
    lineId: '@thaiwatsadupro',
    lineOaUrl: 'https://line.me/R/ti/p/@thaiwatsadupro',
    responseFormSlug: 'thaiwatsadu-pro-bangbuathong',
    responseFormUrl: 'https://ezdoc-v1-th.web.app/#/shop/vendor/thaiwatsadu-pro-bangbuathong',
    address: 'บางบัวทอง นนทบุรี',
    district: 'บางบัวทอง',
    province: 'นนทบุรี',
    serviceAreas: ['บางบัวทอง', 'ชัยพฤกษ์', 'ราชพฤกษ์', 'นครปฐม', 'ปทุมธานี'],
    supportedCategoryIds: ['cement-mortar', 'tile-floor', 'paint', 'electrical', 'plumbing', 'hardware', 'ceiling-wall'],
    deliveryRadiusKm: 22,
    deliveryEtaDays: 2,
    minimumOrderValue: 25000,
    paymentTerms: 'เครดิต 15 วัน / มีรอบส่งเช้า-บ่าย',
    responseChannels: ['line_oa', 'google_form', 'admin_call'],
  },
  {
    id: 'vendor-homepro',
    name: 'โฮมโปรเทรด ราชพฤกษ์',
    contact: 'ทีมลูกค้าโครงการ',
    phone: '02-555-6666',
    lineId: '@homeprotrade',
    lineOaUrl: 'https://line.me/R/ti/p/@homeprotrade',
    responseFormSlug: 'homepro-trade-ratchaphruek',
    responseFormUrl: 'https://ezdoc-v1-th.web.app/#/shop/vendor/homepro-trade-ratchaphruek',
    address: 'ปากเกร็ด นนทบุรี',
    district: 'ปากเกร็ด',
    province: 'นนทบุรี',
    serviceAreas: ['ปากเกร็ด', 'ราชพฤกษ์', 'กรุงเทพฯ โซนตะวันตก', 'นนทบุรี', 'สมุทรปราการบางพื้นที่'],
    supportedCategoryIds: ['tile-floor', 'paint', 'electrical', 'plumbing', 'hardware', 'wood-builtin'],
    deliveryRadiusKm: 30,
    deliveryEtaDays: 3,
    minimumOrderValue: 35000,
    paymentTerms: 'เครดิต 30 วันสำหรับ account โครงการ / โอนก่อนส่งกรณีพิเศษ',
    responseChannels: ['google_form', 'admin_call'],
  },
];

export const shopCategories: ShopCategory[] = [
  { id: 'cement-mortar', name: 'ปูนและกาว' },
  { id: 'tile-floor', name: 'กระเบื้องและพื้น' },
  { id: 'paint', name: 'สีและเคมีภัณฑ์' },
  { id: 'electrical', name: 'ไฟฟ้า' },
  { id: 'plumbing', name: 'ประปา' },
  { id: 'hardware', name: 'ฮาร์ดแวร์' },
  { id: 'ceiling-wall', name: 'ฝ้าและผนัง' },
  { id: 'wood-builtin', name: 'ไม้และบิ้วอิน' },
];

const VENDOR_PRICE_ADJUSTMENT: Record<string, Partial<Record<ShopCategory['id'], number>>> = {
  'vendor-siam': {
    'cement-mortar': 0.98,
    'tile-floor': 1.03,
    paint: 1.01,
    electrical: 1.02,
    plumbing: 1.01,
    hardware: 1.02,
    'ceiling-wall': 0.99,
    'wood-builtin': 1.02,
  },
  'vendor-thaiwatsadu': {
    'cement-mortar': 1,
    'tile-floor': 0.99,
    paint: 1,
    electrical: 1.01,
    plumbing: 0.99,
    hardware: 1,
    'ceiling-wall': 1,
    'wood-builtin': 1.01,
  },
  'vendor-homepro': {
    'cement-mortar': 1.03,
    'tile-floor': 1.01,
    paint: 0.98,
    electrical: 0.99,
    plumbing: 1,
    hardware: 0.98,
    'ceiling-wall': 1.02,
    'wood-builtin': 0.99,
  },
};

const DEFAULT_STOCK_BY_CATEGORY: Partial<Record<ShopCategory['id'], number>> = {
  'cement-mortar': 180,
  'tile-floor': 90,
  paint: 64,
  electrical: 120,
  plumbing: 90,
  hardware: 72,
  'ceiling-wall': 110,
  'wood-builtin': 48,
};

function toSku(categoryId: string, index: number): string {
  return `EZ-${categoryId.slice(0, 3).toUpperCase()}-${String(index + 1).padStart(3, '0')}`;
}

function getCategoryName(categoryId: string): string {
  return shopCategories.find((category) => category.id === categoryId)?.name || categoryId;
}

function computeVendorPrice(
  basePrice: number,
  vendorId: string,
  categoryId: ShopCategory['id'],
  offsetSeed: number,
): number {
  const categoryFactor = VENDOR_PRICE_ADJUSTMENT[vendorId]?.[categoryId] ?? 1;
  const oscillation = ((offsetSeed % 3) - 1) * 0.0125;
  return Math.max(1, Math.round(basePrice * (categoryFactor + oscillation)));
}

function computeLeadTime(vendorId: string, categoryId: ShopCategory['id'], index: number): number {
  const vendor = shopVendors.find((candidate) => candidate.id === vendorId);
  const base = vendor?.deliveryEtaDays || 2;
  const categorySlack = categoryId === 'wood-builtin' ? 2 : categoryId === 'tile-floor' ? 1 : 0;
  return Math.max(1, base + categorySlack + (index % 2));
}

function buildShopProductsFromMaster(tier: PricingTier = 'standard'): ShopProduct[] {
  return materialPriceMaster
    .filter((record) => record.purchasable && record.shopCategoryId)
    .map((record, index) => {
      const categoryId = record.shopCategoryId as ShopCategory['id'];
      const preferredVendors = (record.preferredVendors && record.preferredVendors.length > 0
        ? record.preferredVendors
        : ['vendor-thaiwatsadu', 'vendor-homepro', 'vendor-siam'])
        .filter((vendorId, vendorIndex, all) => all.indexOf(vendorId) === vendorIndex);

      const primaryVendorId = preferredVendors[0] || 'vendor-thaiwatsadu';
      const benchmarkPrice = resolveMaterialUnitPrice(record, tier);
      const price = computeVendorPrice(benchmarkPrice, primaryVendorId, categoryId, index);
      const alternateOffers = preferredVendors.slice(1).map((vendorId, vendorIndex) => ({
        vendorId,
        price: computeVendorPrice(benchmarkPrice, vendorId, categoryId, index + vendorIndex + 1),
        leadTimeDays: computeLeadTime(vendorId, categoryId, index + vendorIndex + 1),
      }));
      const sources = getPriceSources(record.sourceIds);
      const primarySource = sources[0];

      return {
        id: record.id,
        sku: toSku(categoryId, index),
        name: record.label,
        brand: record.brand,
        categoryId,
        vendorId: primaryVendorId,
        unit: record.unit,
        price,
        stock: (DEFAULT_STOCK_BY_CATEGORY[categoryId] || 40) + ((index % 5) * 8),
        leadTimeDays: computeLeadTime(primaryVendorId, categoryId, index),
        featured: record.featured === true,
        alternateOffers,
        aliases: [...(record.aliases || []), ...record.templateMatchers],
        sourceLabel: primarySource?.label,
        sourceUrl: primarySource?.url,
        lastCheckedAt: primarySource?.checkedAt || MARKET_PRICE_REFERENCE_UPDATED_AT,
        priceOrigin:
          primarySource?.kind === 'retail-snapshot'
            ? 'retail-snapshot'
            : primarySource?.kind === 'official-index'
              ? 'official-index'
              : 'market-benchmark',
      };
    });
}

export const shopProducts: ShopProduct[] = buildShopProductsFromMaster();

export function getVendorName(vendorId: string): string {
  return shopVendors.find((vendor) => vendor.id === vendorId)?.name || vendorId;
}

export function getVendorById(vendorId: string): ShopVendor | undefined {
  return shopVendors.find((vendor) => vendor.id === vendorId);
}

export function getProductReferenceSummary(): string {
  return `${MARKET_PRICE_REFERENCE_UPDATED_AT} • ${shopProducts.length} SKU • ${shopCategories.length} หมวด`;
}

export function getProductReferenceStats(): ProductReferenceStats {
  return {
    seriesLabel: MARKET_PRICE_REFERENCE_SERIES,
    updatedAt: MARKET_PRICE_REFERENCE_UPDATED_AT,
    skuCount: shopProducts.length,
    categoryCount: shopCategories.length,
    officialIndexCount: shopProducts.filter((product) => product.priceOrigin === 'official-index').length,
    retailerSnapshotCount: shopProducts.filter((product) => product.priceOrigin === 'retail-snapshot').length,
    benchmarkCount: shopProducts.filter((product) => product.priceOrigin === 'market-benchmark').length,
  };
}

export { getCategoryName };
