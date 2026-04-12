/**
 * Project Pipeline Types
 * โครงสร้างข้อมูลสำหรับ BOQ-to-Cash One-Click Pipeline
 */

import type { QuotationItem } from '../../utils/projectData';
import { calculateRoundedPercentage, calculateThaiTaxBilling, type TaxAuditEntry } from './taxBilling';

// ── Pipeline Steps ──────────────────────────────────────

export type PipelineStep = 'setup' | 'mapping' | 'status' | 'output' | 'finish';

export const PIPELINE_STEPS: { key: PipelineStep; label: string; icon: string }[] = [
  { key: 'setup', label: '1. Project Setup', icon: 'FolderPlus' },
  { key: 'mapping', label: '2. Mapping', icon: 'FileText' },
  { key: 'status', label: '3. Status', icon: 'ShoppingCart' },
  { key: 'output', label: '4. Output', icon: 'Wallet' },
];

// ── Pricing Structure (ต้นทุน vs ราคาขาย) ──────────────

export interface PricingConfig {
  markupPercent: number;       // กำไร %  (e.g. 7)
  operatingPercent: number;    // ค่าดำเนินงาน %  (e.g. 5)
  vatEnabled: boolean;
  vatRate: number;             // 0.07
  whtEnabled: boolean;
  whtRate: number;             // 0.03
  lockSellingPrice: boolean;   // ล็อคราคาขาย — แก้ BOQ ไม่กระทบราคาลูกค้า
}

export const DEFAULT_PRICING: PricingConfig = {
  markupPercent: 7,
  operatingPercent: 0,
  vatEnabled: true,
  vatRate: 0.07,
  whtEnabled: false,
  whtRate: 0.03,
  lockSellingPrice: false,
};

export interface PricingSummary {
  costMaterial: number;        // ต้นทุนวัสดุ
  costLabor: number;           // ต้นทุนค่าแรง
  costTotal: number;           // ต้นทุนรวม
  markup: number;              // กำไร (บาท)
  operating: number;           // ค่าดำเนินงาน (บาท)
  sellingBeforeVat: number;    // ราคาขายก่อน VAT
  vat: number;                 // VAT
  sellingTotal: number;        // ราคาขายรวม VAT
  wht: number;                 // หัก ณ ที่จ่าย
  netReceive: number;          // รับสุทธิ
  marginPercent: number;       // margin %
  taxAuditTrail?: TaxAuditEntry[];
}

// ── Installment (แบ่งงวด) ───────────────────────────────

export type InstallmentPreset = '30-30-30-10' | '25-25-25-25' | '50-50' | '20-25-25-20-10' | 'custom';

export interface InstallmentLine {
  no: number;
  label: string;
  percent: number;
  amount: number;              // คำนวณอัตโนมัติจาก percent * total
}

export const INSTALLMENT_PRESETS: { key: InstallmentPreset; label: string; splits: number[] }[] = [
  { key: '30-30-30-10', label: '30/30/30/10', splits: [30, 30, 30, 10] },
  { key: '25-25-25-25', label: '25/25/25/25', splits: [25, 25, 25, 25] },
  { key: '50-50', label: '50/50', splits: [50, 50] },
  { key: '20-25-25-20-10', label: '20/25/25/20/10', splits: [20, 25, 25, 20, 10] },
  { key: 'custom', label: 'กำหนดเอง', splits: [] },
];

// ── Contractor (ช่าง) ───────────────────────────────────

export type ContractorMode = 'single' | 'multiple';

export interface ContractorAssignment {
  id: string;
  name: string;
  phone?: string;
  assignedCategories: string[];  // BOQ category keys e.g. ['B','C','D']
  laborCost: number;             // คำนวณจาก categories ที่เลือก
  installments: InstallmentLine[];
}

// ── Material Category (หมวดวัสดุ สำหรับ PO) ─────────────

export interface MaterialCategory {
  key: string;                 // BOQ category key
  label: string;               // ชื่อหมวด
  items: MaterialItem[];
  totalCost: number;           // material-only cost (ไม่รวมค่าแรง)
  laborTotal: number;          // ค่าแรงรวมในหมวด
}

export interface MaterialItem {
  boqNo: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;           // ราคาวัสดุต่อหน่วย
  laborCost: number;           // ค่าแรงต่อหน่วย
  materialOnly: number;        // ยอดวัสดุรวม (qty * unitPrice)
  amount: number;              // ยอดรวมทั้งหมด (material + labor)
}

// ── Document Status Tracking ─────────────────────────────

export type DocumentStatus = 'draft' | 'ready' | 'sent' | 'approved' | 'paid';

export interface PipelineDocument {
  type: DocumentType;
  label: string;
  status: DocumentStatus;
  sentViaLine?: boolean;
  sentAt?: string;
  pdfUrl?: string;
}

export type DocumentType =
  | 'quotation'
  | 'contract'
  | 'billing-schedule'
  | 'work-plan'
  | 'purchase-order'
  | 'contractor-contract'
  | 'contractor-billing'
  | 'vat-invoice'
  | 'withholding-tax'
  | 'receipt';

// ── Change Impact (แก้ BOQ → เอกสารไหนเปลี่ยน) ─────────

export type ChangeImpactMode = 'adjust-selling' | 'lock-selling';

export interface BoqChange {
  boqNo: string;
  description: string;
  field: 'quantity' | 'unitPrice' | 'laborCost';
  oldValue: number;
  newValue: number;
}

export interface ChangeImpact {
  changes: BoqChange[];
  costDelta: number;           // ต้นทุนเปลี่ยนไปเท่าไหร่
  affectedDocuments: {
    type: DocumentType;
    label: string;
    willChange: boolean;       // จะเปลี่ยนตาม mode ที่เลือก
    reason: string;
  }[];
}

// ── Pipeline State (สถานะรวมทั้ง pipeline) ───────────────

export interface PipelineState {
  step: PipelineStep;
  projectId: string;

  // Step 1: Setup
  templateId?: string;
  area?: number;
  location?: ProjectLocation;
  customerName?: string;
  customerPhone?: string;

  // Pricing
  pricing: PricingConfig;
  pricingSummary?: PricingSummary;

  // Step 2: Customer docs
  customerInstallments: InstallmentLine[];
  documents: PipelineDocument[];

  // Step 3: Procurement
  materialCategories: MaterialCategory[];

  // Step 4: Contractor
  contractorMode: ContractorMode;
  contractors: ContractorAssignment[];

  // Step 5: Finance
  receipts: ReceiptEntry[];
}

export interface ProjectLocation {
  province: string;
  district: string;
  address: string;
}

export interface ReceiptEntry {
  installmentNo: number;
  status: 'pending' | 'paid';
  paidAt?: string;
  amount: number;
}

// ── Utility: คำนวณราคา ──────────────────────────────────

export function calculatePricing(
  items: QuotationItem[],
  config: PricingConfig,
): PricingSummary {
  let costMaterial = 0;
  let costLabor = 0;

  for (const item of items) {
    if (!item.quantity || item.quantity === '') continue;
    const qty = Number(item.quantity) || 0;

    if (item.totalPrice !== undefined && item.totalPrice !== null && item.totalPrice !== '') {
      costMaterial += qty * (Number(item.totalPrice) || 0);
    } else {
      costMaterial += qty * (Number(item.unitPrice) || 0);
      costLabor += qty * (Number(item.laborCost) || 0);
    }
  }

  const roundedCostMaterial = Math.round(costMaterial);
  const roundedCostLabor = Math.round(costLabor);
  const roundedCostTotal = Math.round(costMaterial + costLabor);

  const markup = calculateRoundedPercentage(roundedCostTotal, config.markupPercent);
  const operating = calculateRoundedPercentage(roundedCostTotal, config.operatingPercent);
  const sellingBeforeVat = roundedCostTotal + markup + operating;

  const taxResult = calculateThaiTaxBilling(sellingBeforeVat, {
    vatEnabled: config.vatEnabled,
    vatRate: config.vatRate,
    whtEnabled: config.whtEnabled,
    whtRate: config.whtRate,
    roundingUnit: 'baht',
  });

  const vat = taxResult.vatAmount;
  const sellingTotal = taxResult.grossAmount;
  const wht = taxResult.withholdingAmount;
  const netReceive = taxResult.netAmount;
  const marginPercent = sellingBeforeVat > 0
    ? Math.round(((sellingBeforeVat - roundedCostTotal) / sellingBeforeVat) * 1000) / 10
    : 0;

  return {
    costMaterial: roundedCostMaterial,
    costLabor: roundedCostLabor,
    costTotal: roundedCostTotal,
    markup,
    operating,
    sellingBeforeVat,
    vat,
    sellingTotal,
    wht,
    netReceive,
    marginPercent,
    taxAuditTrail: taxResult.auditTrail,
  };
}

/** แบ่งงวดจากยอดรวมและ % */
export function calculateInstallments(
  total: number,
  splits: { no: number; label: string; percent: number }[],
): InstallmentLine[] {
  return splits.map((s) => ({
    ...s,
    amount: Math.round(total * (s.percent / 100)),
  }));
}

/** แยกหมวดวัสดุจาก BOQ สำหรับ PO
 *  - แยก unitPrice (วัสดุ) กับ laborCost (ค่าแรง) ออกจากกัน
 *  - ข้ามรายการที่ unitPrice === 0 (labor-only เช่น ค่าออกแบบ)
 *  - totalCost = material-only, laborTotal = ค่าแรงรวม
 */
export function extractMaterialCategories(items: QuotationItem[]): MaterialCategory[] {
  const headers = new Map<string, string>();
  const categoryItems = new Map<string, MaterialItem[]>();

  for (const item of items) {
    if (!item.no.includes('.') && (item.quantity === '' || item.quantity === undefined)) {
      headers.set(item.no, item.description);
      continue;
    }

    if (!item.quantity || item.quantity === '' || item.quantity === undefined) continue;
    const qty = Number(item.quantity) || 0;
    if (qty <= 0) continue;

    // Extract material price and labor cost separately
    let materialPrice: number;
    if (item.totalPrice !== undefined && item.totalPrice !== null && item.totalPrice !== '') {
      materialPrice = Number(item.totalPrice) || 0;
    } else {
      materialPrice = Number(item.unitPrice) || 0;
    }
    const labor = Number(item.laborCost) || 0;

    // Skip labor-only items (no material cost, only labor)
    // But include items that have material cost, even if they also have labor
    if (materialPrice <= 0 && labor <= 0) continue;

    const catKey = item.no.split('.')[0];
    if (!categoryItems.has(catKey)) categoryItems.set(catKey, []);

    categoryItems.get(catKey)!.push({
      boqNo: item.no,
      description: item.description,
      quantity: qty,
      unit: item.unit,
      unitPrice: materialPrice,
      laborCost: labor,
      materialOnly: Math.round(qty * materialPrice),
      amount: Math.round(qty * (materialPrice + labor)),
    });
  }

  const result: MaterialCategory[] = [];
  for (const [key, matItems] of categoryItems) {
    result.push({
      key,
      label: headers.get(key) || key,
      items: matItems,
      totalCost: matItems.reduce((sum, i) => sum + i.materialOnly, 0),
      laborTotal: matItems.reduce((sum, i) => sum + Math.round(i.quantity * i.laborCost), 0),
    });
  }

  result.sort((a, b) => b.totalCost - a.totalCost);
  return result;
}

/** คำนวณ Change Impact */
export function computeChangeImpact(
  changes: BoqChange[],
  mode: ChangeImpactMode,
  _pricing: PricingConfig,
): ChangeImpact {
  let costDelta = 0;
  for (const c of changes) {
    if (c.field === 'quantity') {
      costDelta += 0; // need unit price context — simplified
    }
    costDelta += c.newValue - c.oldValue;
  }

  const lockSelling = mode === 'lock-selling';
  const docs: ChangeImpact['affectedDocuments'] = [
    { type: 'purchase-order', label: 'ใบสั่งซื้อ (PO)', willChange: true, reason: 'จำนวนวัสดุเปลี่ยน' },
    { type: 'quotation', label: 'ใบเสนอราคา', willChange: !lockSelling, reason: lockSelling ? 'ล็อคราคาอยู่' : 'ราคาปรับตามต้นทุน' },
    { type: 'billing-schedule', label: 'ใบวางบิลแบ่งงวด', willChange: !lockSelling, reason: lockSelling ? 'ล็อคราคาอยู่' : 'ยอดงวดปรับตาม' },
    { type: 'contract', label: 'สัญญาจ้าง', willChange: !lockSelling, reason: lockSelling ? 'ล็อคราคาอยู่' : 'ราคาในสัญญาปรับตาม' },
    { type: 'contractor-contract', label: 'สัญญาช่าง', willChange: false, reason: 'ค่าแรงไม่เปลี่ยน' },
    { type: 'contractor-billing', label: 'บิลช่าง', willChange: false, reason: 'ค่าแรงไม่เปลี่ยน' },
    { type: 'vat-invoice', label: 'ใบกำกับภาษี', willChange: !lockSelling, reason: lockSelling ? 'ล็อคราคาอยู่' : 'ยอดภาษีปรับตาม' },
    { type: 'work-plan', label: 'แผนการทำงาน', willChange: false, reason: 'scope งานเท่าเดิม' },
  ];

  return { changes, costDelta, affectedDocuments: docs };
}
