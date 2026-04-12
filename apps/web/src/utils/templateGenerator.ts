import {
  QuotationItem,
  ProjectData,
  PaymentInstallmentConfig,
  WorkPlanConfig,
  WorkPlanItem,
  prepareProjectDocuments,
} from './projectData';
import { addWeeks, formatThaiDate, getCurrentThaiDate } from './dateUtils';
import {
  ConstructionTemplate,
  TemplateCategoryDef,
  TemplateQuotationItem,
  TemplateInput,
  GenerationResult,
  WorkPlanPhaseDef,
} from './constructionTemplates';
import { getTemplateById } from './constructionTemplates.data';
import {
  applyMarketReferenceToItem,
  buildPriceReferenceSummary,
  type PricingTier,
} from './materialPriceMaster';

// คำนวณจำนวนตาม QuantityMode
function resolveQuantity(
  item: TemplateQuotationItem,
  area: number,
  rooms: number,
  bathrooms: number
): number {
  const mode = item.quantityMode;
  switch (mode.type) {
    case 'area-multiplier':
      return Math.ceil(area * mode.factor);
    case 'per-room':
      // ใช้ bathrooms สำหรับหมวดห้องน้ำ
      if (item.unit === 'ห้อง' && item.description.includes('ห้องน้ำ')) {
        return bathrooms;
      }
      return rooms > 0 ? rooms : mode.defaultCount;
    case 'per-point':
      return Math.ceil(area * mode.pointsPerSqm);
    case 'fixed':
      return mode.value;
    case 'perimeter': {
      // ประมาณเส้นรอบวง: sqrt(area) * 4, คูณความสูงผนัง
      const perimeter = Math.sqrt(area) * 4;
      return Math.ceil(perimeter * mode.wallHeight);
    }
    case 'area-percentage':
      return Math.ceil(area * mode.percentage);
    default:
      return 1;
  }
}

// สร้าง QuotationItem[] จาก template + input
function generateQuotationItems(
  categories: TemplateCategoryDef[],
  area: number,
  rooms: number,
  bathrooms: number,
  excludedCategories: string[],
  pricingTier: PricingTier,
): QuotationItem[] {
  const items: QuotationItem[] = [];

  for (const category of categories) {
    if (excludedCategories.includes(category.no)) continue;

    // Header row
    items.push({
      no: category.no,
      description: category.description,
      unit: '',
      quantity: '',
      unitPrice: '',
      laborCost: '',
    });

    // Sub-items
    for (const templateItem of category.items) {
      if (templateItem.isOptional && excludedCategories.includes(templateItem.no)) continue;

      const qty = resolveQuantity(templateItem, area, rooms, bathrooms);

      items.push({
        no: templateItem.no,
        description: templateItem.description,
        unit: templateItem.unit,
        quantity: qty,
        unitPrice: templateItem.unitPrice,
        laborCost: templateItem.laborCost,
        scopeDetails: templateItem.scopeDetails,
      });
    }
  }

  return items.map((item) => applyMarketReferenceToItem(item, pricingTier).item);
}

// คำนวณราคา
function calculatePricing(items: QuotationItem[]): {
  totalCost: number;
  sellingSubtotal: number;
  operatingFee: number;
  sellingTotal: number;
} {
  let totalCost = 0;
  const categoryCosts: Record<string, number> = {};

  for (const item of items) {
    const qty = typeof item.quantity === 'number' ? item.quantity : 0;
    const unitPrice = typeof item.unitPrice === 'number' ? item.unitPrice : 0;
    const laborCost = typeof item.laborCost === 'number' ? item.laborCost : 0;

    if (qty === 0) continue; // skip headers

    const itemCost = qty * (unitPrice + laborCost);
    totalCost += itemCost;

    const categoryNo = item.no.split('.')[0];
    categoryCosts[categoryNo] = (categoryCosts[categoryNo] || 0) + itemCost;
  }

  // Apply markup: A = 0%, others = 25%
  let sellingSubtotal = 0;
  for (const [catNo, cost] of Object.entries(categoryCosts)) {
    const markup = catNo === 'A' ? 1.0 : 1.25;
    sellingSubtotal += cost * markup;
  }

  const operatingFee = Math.round(sellingSubtotal * 0.05);
  const sellingTotal = Math.round(sellingSubtotal) + operatingFee;

  return {
    totalCost: Math.round(totalCost),
    sellingSubtotal: Math.round(sellingSubtotal),
    operatingFee,
    sellingTotal,
  };
}

// คำนวณระยะเวลาโดยประมาณ (สัปดาห์)
function estimateDuration(template: ConstructionTemplate, area: number, excludedCategories: string[]): number {
  // แต่ละ phase ทำงานคู่ขนานได้บางส่วน ใช้ ~60% ของเวลารวม
  let totalWeeks = 0;
  for (const phase of template.workPlanPhases) {
    if (excludedCategories.includes(phase.categoryRef)) continue;
    const rawWeeks = (area / 100) * phase.weeksPerHundredSqm;
    const weeks = Math.max(phase.minWeeks, Math.min(phase.maxWeeks, Math.round(rawWeeks)));
    totalWeeks += weeks;
  }
  // ปรับค่าสำหรับงานที่ทำคู่ขนานได้
  return Math.ceil(totalWeeks * 0.6);
}

function estimatePhaseWeeks(phase: WorkPlanPhaseDef, area: number): number {
  const rawWeeks = (area / 100) * phase.weeksPerHundredSqm;
  return Math.max(phase.minWeeks, Math.min(phase.maxWeeks, Math.round(rawWeeks)));
}

function buildTemplateWorkPlan(
  template: ConstructionTemplate,
  area: number,
  excludedCategories: string[],
): WorkPlanConfig {
  const activePhases = template.workPlanPhases.filter((phase) => !excludedCategories.includes(phase.categoryRef));
  if (activePhases.length === 0) {
    return {
      totalWeeks: 8,
      startDate: getCurrentThaiDate(),
      endDate: formatThaiDate(addWeeks(new Date(), 8)),
      durationLabel: '2 เดือน',
      items: [],
    };
  }

  const scheduled = activePhases.map((phase, index) => {
    const weeks = estimatePhaseWeeks(phase, area);
    const overlap = index === 0
      ? 0
      : phase.symbol === '■'
        ? Math.max(1, Math.floor(weeks * 0.5))
        : Math.max(1, Math.floor(weeks * 0.35));
    return {
      ...phase,
      weeks,
      overlap,
    };
  });

  let cursor = 0;
  let maxEnd = 0;
  const phaseRanges = scheduled.map((phase, index) => {
    const start = index === 0 ? 0 : Math.max(0, cursor - phase.overlap);
    const end = start + phase.weeks;
    cursor = end;
    maxEnd = Math.max(maxEnd, end);
    return {
      ...phase,
      start,
      end,
    };
  });

  const totalWeeks = Math.max(4, maxEnd);
  const durationMonths = Math.max(1, Math.round(totalWeeks / 4.33));
  const startDate = new Date();

  const items: WorkPlanItem[] = phaseRanges.map((phase, index) => ({
    no: `${index + 1}`,
    task: phase.task,
    duration: `${phase.weeks} สัปดาห์`,
    weekCells: Array.from({ length: totalWeeks }, (_, weekIndex) =>
      weekIndex >= phase.start && weekIndex < phase.end ? phase.symbol : ''),
    status: 'รอเริ่มงาน',
  }));

  return {
    totalWeeks,
    startDate: getCurrentThaiDate(),
    endDate: formatThaiDate(addWeeks(startDate, totalWeeks)),
    durationLabel: `${durationMonths} เดือน`,
    items,
  };
}

function buildTemplatePaymentSchedule(
  template: ConstructionTemplate,
  totalWeeks: number,
): PaymentInstallmentConfig[] {
  let cumulativePercent = 0;

  return template.paymentSchedule.map((item, index) => {
    cumulativePercent += item.percent;
    const normalizedPercent = Math.round(item.percent * 10000) / 100;
    const targetWeek = Math.max(1, Math.min(totalWeeks, Math.round(totalWeeks * cumulativePercent)));
    const description = item.label.startsWith('งวด')
      ? item.label
      : `งวดที่ ${index + 1} - ${item.label}`;
    const condition = index === template.paymentSchedule.length - 1
      ? 'ชำระหลังตรวจรับ เก็บงาน และส่งมอบงานเรียบร้อย'
      : `ชำระเมื่อความคืบหน้างานถึงประมาณ ${Math.round(cumulativePercent * 100)}% ของแผนงาน (ประมาณสัปดาห์ที่ ${targetWeek})`;

    return {
      no: index + 1,
      description,
      percentage: normalizedPercent,
      condition,
    };
  });
}

// ===== MAIN EXPORT =====

export function generateProjectFromTemplate(input: TemplateInput): GenerationResult | null {
  const template = getTemplateById(input.templateId);
  if (!template) return null;

  const rooms = input.rooms ?? template.defaultRooms;
  const bathrooms = input.bathrooms ?? template.defaultBathrooms;
  const excluded = input.excludedCategories ?? [];
  const pricingTier = input.pricingTier ?? 'standard';

  const quotationData = generateQuotationItems(
    template.categories,
    input.area,
    rooms,
    bathrooms,
    excluded,
    pricingTier,
  );

  const pricing = calculatePricing(quotationData);
  const budgetUtilization = input.budget > 0
    ? Math.round((pricing.sellingTotal / input.budget) * 100)
    : 0;

  const estimatedDurationWeeks = estimateDuration(template, input.area, excluded);

  // Warnings
  const warnings: string[] = [];
  if (input.budget > 0 && pricing.sellingTotal > input.budget * 1.1) {
    const overPercent = Math.round(((pricing.sellingTotal - input.budget) / input.budget) * 100);
    warnings.push(`งบประมาณอาจไม่เพียงพอ (เกินงบ ${overPercent}%) — พิจารณาลดขอบเขตงานหรือเพิ่มงบ`);
  }
  if (input.budget > 0 && pricing.sellingTotal < input.budget * 0.5) {
    warnings.push('งบประมาณเหลือมาก — สามารถอัพเกรดวัสดุหรือเพิ่มหมวดงานได้');
  }
  if (input.area < template.minArea) {
    warnings.push(`พื้นที่ต่ำกว่ามาตรฐาน (แนะนำ ${template.minArea}+ ตร.ม.)`);
  }
  if (input.area > template.maxArea) {
    warnings.push(`พื้นที่เกินมาตรฐาน (แนะนำไม่เกิน ${template.maxArea} ตร.ม.)`);
  }
  const priceReference = buildPriceReferenceSummary(quotationData, pricingTier);
  if (priceReference.coveragePercent < 70) {
    warnings.push(`template นี้อ้างอิงราคาได้ประมาณ ${priceReference.coveragePercent}% ของรายการ ควรตรวจ BOQ รายการพิเศษเพิ่มก่อนเสนอราคา`);
  }

  return {
    quotationData,
    estimatedCost: pricing.totalCost,
    estimatedSellingPrice: pricing.sellingTotal,
    estimatedOperatingFee: pricing.operatingFee,
    budgetUtilization,
    estimatedDurationWeeks,
    warnings,
    priceReference,
  };
}

// สร้าง ProjectData จาก template
export function createProjectFromTemplate(input: TemplateInput): ProjectData | null {
  const result = generateProjectFromTemplate(input);
  const template = getTemplateById(input.templateId);
  if (!result || !template) return null;

  const excluded = input.excludedCategories ?? [];
  const workPlan = buildTemplateWorkPlan(template, input.area, excluded);
  const paymentSchedule = buildTemplatePaymentSchedule(template, workPlan.totalWeeks);

  return prepareProjectDocuments({
    id: `template-${input.templateId}-${Date.now()}`,
    name: input.projectName,
    address: input.projectAddress,
    phone: input.projectPhone,
    owner: input.projectOwner,
    quotationData: result.quotationData,
    markupRate: template.defaultMarkupRate,
    operatingRate: template.defaultOperatingRate,
    discountConfig: template.defaultDiscountConfig ? { ...template.defaultDiscountConfig } : undefined,
    templateId: input.templateId,
    templateArea: input.area,
    templateBudget: input.budget,
    templateRooms: input.rooms,
    templateBathrooms: input.bathrooms,
    templatePricingTier: input.pricingTier ?? 'standard',
    priceReferenceSummary: result.priceReference,
    autoSyncDocuments: true,
    workPlan,
    paymentSchedule,
    taxData: {
      includeVat: true,
      includeWithholding: true,
      vatRate: 0.07,
      withholdingRate: 0.03,
    },
  });
}

// format ราคาเป็นภาษาไทย
export function formatCurrency(amount: number): string {
  return amount.toLocaleString('th-TH');
}
