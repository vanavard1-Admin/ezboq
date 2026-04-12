import type { QuotationItem } from './projectData';
import { shopProducts, getVendorName, type ShopProduct } from './shopCatalog';

export interface BoqShopMatch {
  boqItem: QuotationItem;
  product?: ShopProduct;
  confidence: number;
  note: string;
}

export interface PoDraftLine {
  sku: string;
  productName: string;
  vendorName: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  leadTimeDays: number;
  amount: number;
}

export interface PoDraft {
  id: string;
  createdAt: string;
  lines: PoDraftLine[];
  totalAmount: number;
  unmatched: string[];
}

function normalizeText(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9ก-๙\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function tokenize(input: string): string[] {
  return normalizeText(input).split(' ').filter((token) => token.length > 1);
}

function buildProductSearchText(product: ShopProduct): string {
  return normalizeText([
    product.name,
    product.sku,
    product.brand || '',
    ...(product.aliases || []),
  ].join(' '));
}

function scoreMatch(material: QuotationItem, product: ShopProduct): number {
  const src = normalizeText([
    material.description,
    material.no,
    material.scopeDetails || '',
  ].join(' '));
  if (!src) return 0;

  const skuHit = src.includes(product.sku.toLowerCase()) ? 1 : 0;
  const nameHit = src.includes(normalizeText(product.name)) ? 1 : 0;
  const aliasHit = (product.aliases || []).some((alias) => src.includes(normalizeText(alias))) ? 1 : 0;
  const normalizedUnit = normalizeText(material.unit || '');
  const unitScore = normalizedUnit && normalizeText(product.unit) === normalizedUnit ? 0.08 : 0;
  const materialTokens = tokenize(`${material.description} ${material.scopeDetails || ''}`);
  const productTokens = tokenize(buildProductSearchText(product));
  const overlap = materialTokens.filter((token) => productTokens.includes(token)).length;
  const overlapRatio = materialTokens.length > 0 ? overlap / materialTokens.length : 0;

  return (skuHit * 0.5) + (nameHit * 0.2) + (aliasHit * 0.17) + (overlapRatio * 0.22) + unitScore;
}

export function matchBoqItemsToCatalog(items: QuotationItem[]): BoqShopMatch[] {
  return items
    .filter((item) => item.no.includes('.') && item.quantity !== '' && Number(item.quantity) > 0)
    .map((item) => {
      const sorted = shopProducts
        .map((product) => ({ product, score: scoreMatch(item, product) }))
        .sort((a, b) => b.score - a.score);

      const best = sorted[0];
      if (!best || best.score < 0.24) {
        return { boqItem: item, confidence: 0, note: 'ไม่พบสินค้าที่ match ได้อย่างปลอดภัย' };
      }

      return {
        boqItem: item,
        product: best.product,
        confidence: best.score,
        note: best.score >= 0.55 ? 'จับคู่โดย SKU/ชื่อใกล้เคียง' : 'จับคู่แบบคาดการณ์ (ควรตรวจอีกครั้ง)',
      };
    });
}

export function generatePoDraftFromMatches(matches: BoqShopMatch[]): PoDraft {
  const lines: PoDraftLine[] = [];
  const unmatched: string[] = [];

  matches.forEach((match) => {
    const qty = Number(match.boqItem.quantity) || 0;
    if (!match.product || qty <= 0) {
      unmatched.push(match.boqItem.description);
      return;
    }

    lines.push({
      sku: match.product.sku,
      productName: match.product.name,
      vendorName: getVendorName(match.product.vendorId),
      unit: match.product.unit,
      quantity: qty,
      unitPrice: match.product.price,
      leadTimeDays: match.product.leadTimeDays,
      amount: qty * match.product.price,
    });
  });

  const totalAmount = lines.reduce((sum, line) => sum + line.amount, 0);
  return {
    id: `PO-DRAFT-${new Date().toISOString().slice(0, 10)}`,
    createdAt: new Date().toISOString(),
    lines,
    totalAmount,
    unmatched,
  };
}
