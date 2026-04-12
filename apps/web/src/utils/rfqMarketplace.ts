import { generatePoDraftFromMatches, matchBoqItemsToCatalog, type BoqShopMatch } from './boqShopIntegration';
import type { ProjectData, QuotationItem } from './projectData';
import { getVendorById, shopVendors, type ProductOffer, type ShopProduct } from './shopCatalog';

export type QuoteIntakeChannel = 'line_oa' | 'google_form' | 'admin_call';

export interface PurchaseListLine {
  id: string;
  boqNo: string;
  description: string;
  quantity: number;
  unit: string;
  confidence: number;
  matchedProductId?: string;
  matchedProductName?: string;
  preferredVendorId?: string;
  estimatedUnitPrice?: number;
  estimatedAmount?: number;
  status: 'matched' | 'review' | 'unmatched';
  note: string;
}

export interface PurchaseListSummary {
  lines: PurchaseListLine[];
  matchedLines: number;
  reviewLines: number;
  unmatchedLines: number;
  estimatedSubtotal: number;
}

export interface VendorQuoteOption {
  vendorId: string;
  vendorName: string;
  channel: QuoteIntakeChannel;
  radiusKm: number;
  etaDays: number;
  shippingFee: number;
  materialSubtotal: number;
  landedCost: number;
  matchedLines: number;
  reviewLines: number;
  confidenceScore: number;
}

export interface VendorQuoteLine {
  vendorId: string;
  productId: string;
  productName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  amount: number;
  etaDays: number;
}

function clampRadius(radiusKm: number): number {
  if (radiusKm <= 10) return 10;
  if (radiusKm <= 15) return 15;
  if (radiusKm <= 20) return 20;
  return 30;
}

export function recommendSearchRadiusKm(estimatedSubtotal: number): number {
  if (estimatedSubtotal >= 150_000) return 30;
  if (estimatedSubtotal >= 80_000) return 20;
  if (estimatedSubtotal >= 30_000) return 15;
  return 10;
}

export function calculateLandedCost(materialSubtotal: number, shippingFee: number): number {
  return Math.max(0, materialSubtotal) + Math.max(0, shippingFee);
}

export function normalizeMaterialKey(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9ก-๙\s]/g, ' ')
    .replace(/\b(scg|toa|cotto|hafele|dyno)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function getMatchStatus(match: BoqShopMatch): PurchaseListLine['status'] {
  if (!match.product) return 'unmatched';
  if (match.confidence >= 0.55) return 'matched';
  return 'review';
}

function toPurchaseListLine(match: BoqShopMatch, index: number): PurchaseListLine {
  const quantity = Number(match.boqItem.quantity) || 0;
  const estimatedUnitPrice = match.product?.price;
  const estimatedAmount = estimatedUnitPrice ? quantity * estimatedUnitPrice : undefined;

  return {
    id: `${match.boqItem.no || 'item'}-${index + 1}`,
    boqNo: match.boqItem.no,
    description: match.boqItem.description,
    quantity,
    unit: match.boqItem.unit || match.product?.unit || '-',
    confidence: match.confidence,
    matchedProductId: match.product?.id,
    matchedProductName: match.product?.name,
    preferredVendorId: match.product?.vendorId,
    estimatedUnitPrice,
    estimatedAmount,
    status: getMatchStatus(match),
    note: match.note,
  };
}

export function buildPurchaseListFromMatches(matches: BoqShopMatch[]): PurchaseListSummary {
  const lines = matches.map(toPurchaseListLine);
  return {
    lines,
    matchedLines: lines.filter((line) => line.status === 'matched').length,
    reviewLines: lines.filter((line) => line.status === 'review').length,
    unmatchedLines: lines.filter((line) => line.status === 'unmatched').length,
    estimatedSubtotal: lines.reduce((sum, line) => sum + (line.estimatedAmount || 0), 0),
  };
}

export function buildPurchaseListFromProject(project: ProjectData): PurchaseListSummary {
  const boqItems = project.quotationData.filter(
    (item: QuotationItem) => item.no.includes('.') && item.quantity !== '' && Number(item.quantity) > 0,
  );
  return buildPurchaseListFromMatches(matchBoqItemsToCatalog(boqItems));
}

function shippingFeeForVendor(materialSubtotal: number, radiusKm: number): number {
  const distanceBandFee = radiusKm <= 10 ? 350 : radiusKm <= 20 ? 650 : 1_050;
  const orderDiscount = materialSubtotal >= 150_000 ? 350 : materialSubtotal >= 80_000 ? 200 : 0;
  return Math.max(150, distanceBandFee - orderDiscount);
}

function confidenceScoreForVendor(line: PurchaseListLine, vendorId: string): number {
  if (!line.preferredVendorId) return 0.1;
  if (line.preferredVendorId === vendorId) return 1;
  if (line.status === 'review') return 0.55;
  return 0.3;
}

function getOfferPrice(product: ShopProduct | undefined, vendorId: string): ProductOffer | null {
  if (!product) return null;
  if (product.vendorId === vendorId) {
    return {
      vendorId,
      price: product.price,
      leadTimeDays: product.leadTimeDays,
    };
  }
  return product.alternateOffers?.find((offer) => offer.vendorId === vendorId) || null;
}

export function buildVendorQuoteOptions(
  purchaseList: PurchaseListSummary,
  matches: BoqShopMatch[],
): VendorQuoteOption[] {
  if (purchaseList.lines.length === 0) return [];

  const recommendedRadius = clampRadius(recommendSearchRadiusKm(purchaseList.estimatedSubtotal));

  return shopVendors
    .filter((vendor) => vendor.deliveryRadiusKm >= recommendedRadius || vendor.deliveryRadiusKm >= 10)
    .map((vendor) => {
      let materialSubtotal = 0;
      let matchedLines = 0;
      let reviewLines = 0;
      let confidenceAggregate = 0;

      purchaseList.lines.forEach((line) => {
        const match = matches.find((item) => item.boqItem.no === line.boqNo && item.boqItem.description === line.description);
        const offer = getOfferPrice(match?.product, vendor.id);

        if (offer && line.quantity > 0) {
          materialSubtotal += offer.price * line.quantity;
          matchedLines += 1;
        } else if (line.status === 'review') {
          reviewLines += 1;
        }

        confidenceAggregate += confidenceScoreForVendor(line, vendor.id);
      });

      const shippingFee = shippingFeeForVendor(materialSubtotal, vendor.deliveryRadiusKm);
      const landedCost = calculateLandedCost(materialSubtotal, shippingFee);
      const channel = vendor.responseChannels[0] || 'admin_call';

      return {
        vendorId: vendor.id,
        vendorName: vendor.name,
        channel,
        radiusKm: vendor.deliveryRadiusKm,
        etaDays: vendor.deliveryEtaDays,
        shippingFee,
        materialSubtotal,
        landedCost,
        matchedLines,
        reviewLines,
        confidenceScore: Number((confidenceAggregate / purchaseList.lines.length).toFixed(2)),
      };
    })
    .filter((option) => option.materialSubtotal > 0)
    .sort((left, right) => left.landedCost - right.landedCost || left.etaDays - right.etaDays);
}

export function buildVendorQuoteLines(matches: BoqShopMatch[], vendorId: string): VendorQuoteLine[] {
  return matches.flatMap((match) => {
    const quantity = Number(match.boqItem.quantity) || 0;
    if (!match.product || quantity <= 0) return [];

    const offer = getOfferPrice(match.product, vendorId);
    if (!offer) return [];

    return [{
      vendorId,
      productId: match.product.id,
      productName: match.product.name,
      quantity,
      unit: match.product.unit,
      unitPrice: offer.price,
      amount: offer.price * quantity,
      etaDays: offer.leadTimeDays,
    }];
  });
}

export function describeQuoteChannel(channel: QuoteIntakeChannel): string {
  switch (channel) {
    case 'line_oa':
      return 'ส่ง RFQ ผ่าน LINE OA';
    case 'google_form':
      return 'รับราคากลับผ่าน Google Form';
    case 'admin_call':
      return 'แอดมินโทรกลับเพื่อยืนยันราคา';
    default:
      return channel;
  }
}

export function buildPoDraftFromProject(project: ProjectData) {
  const boqItems = project.quotationData.filter(
    (item: QuotationItem) => item.no.includes('.') && item.quantity !== '' && Number(item.quantity) > 0,
  );
  return generatePoDraftFromMatches(matchBoqItemsToCatalog(boqItems));
}

export function getVendorCoverageLabel(vendorId: string): string {
  const vendor = getVendorById(vendorId);
  if (!vendor) return vendorId;
  return `${vendor.district}, ${vendor.province} • ${vendor.deliveryRadiusKm} กม.`;
}
