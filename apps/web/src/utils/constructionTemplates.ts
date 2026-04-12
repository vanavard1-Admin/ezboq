import type { ProjectDiscountConfig, QuotationItem } from './projectData';
import type { PricingTier, PriceReferenceSummary } from './materialPriceMaster';

// วิธีคำนวณจำนวนจากพื้นที่ที่ผู้ใช้กรอก
export type QuantityMode =
  | { type: 'area-multiplier'; factor: number }     // qty = area * factor
  | { type: 'per-room'; defaultCount: number }       // qty = จำนวนห้อง (user override)
  | { type: 'per-point'; pointsPerSqm: number }      // qty = area * pointsPerSqm
  | { type: 'fixed'; value: number }                  // qty = ค่าคงที่
  | { type: 'perimeter'; wallHeight: number }          // qty = sqrt(area) * 4 * wallHeight (พื้นที่ผนังโดยประมาณ)
  | { type: 'area-percentage'; percentage: number };   // qty = area * percentage (เช่น พื้นที่เปียก 15%)

// รายการ BOQ ใน template (ก่อน resolve quantity)
export interface TemplateQuotationItem {
  no: string;
  description: string;
  unit: string;
  unitPrice: number;
  laborCost: number;
  scopeDetails: string;
  quantityMode: QuantityMode;
  isOptional?: boolean;
}

// หมวดงาน
export interface TemplateCategoryDef {
  no: string;              // 'A', 'B', 'C', ...
  description: string;     // ชื่อหมวด
  items: TemplateQuotationItem[];
  isOptional?: boolean;    // ผู้ใช้สามารถเลือกไม่รวมหมวดนี้
}

// ข้อมูลแผนงานแต่ละ phase
export interface WorkPlanPhaseDef {
  task: string;
  categoryRef: string;
  weeksPerHundredSqm: number; // สัปดาห์ต่อ 100 ตร.ม.
  minWeeks: number;
  maxWeeks: number;
  symbol: '■' | '□';       // ■ = โรงงาน/off-site, □ = หน้างาน
}

// Template หลัก
export interface ConstructionTemplate {
  id: string;
  name: string;
  nameEn: string;
  icon: string;            // Lucide icon name
  coverImage?: string;     // path to cover image in /images/templates/
  description: string;
  referenceArea: number;   // พื้นที่อ้างอิง (ตร.ม.)
  minArea: number;
  maxArea: number;
  defaultRooms: number;
  defaultBathrooms: number;
  categories: TemplateCategoryDef[];
  workPlanPhases: WorkPlanPhaseDef[];
  paymentSchedule: { percent: number; label: string }[];
  tags: string[];
  defaultMarkupRate?: number;
  defaultOperatingRate?: number;
  defaultDiscountConfig?: ProjectDiscountConfig;
}

// ผลลัพธ์จากการ generate
export interface TemplateInput {
  templateId: string;
  projectName: string;
  projectAddress: string;
  projectPhone: string;
  projectOwner: string;
  area: number;
  budget: number;
  rooms?: number;
  bathrooms?: number;
  excludedCategories?: string[];
  pricingTier?: PricingTier;
}

export interface GenerationResult {
  quotationData: QuotationItem[];
  estimatedCost: number;
  estimatedSellingPrice: number;
  estimatedOperatingFee: number;
  budgetUtilization: number;
  estimatedDurationWeeks: number;
  warnings: string[];
  priceReference: PriceReferenceSummary;
}
