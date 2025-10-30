import { BOQItem } from "../types/boq";
import { 
  TemplateMetadata,
} from "../types/template";
import { templateMetadata } from "../data/boqTemplates";
import { calculateBOQSummary } from "./calculations";

// Default profile for calculation
const DEFAULT_PROFILE = {
  wastePct: 3,
  opexPct: 5,
  errorPct: 2,
  markupPct: 10,
  vatPct: 7,
};

/**
 * คำนวณงบประมาณและแนะนำ Template
 */
export function calculateByBudget(input: BudgetCalculationInput): BudgetCalculationResult {
  const { budget, category, preferredQuality = "standard" } = input;

  // Filter templates by category
  let candidates = [...templateMetadata];
  if (category && category !== "budget") {
    candidates = candidates.filter(t => t.mainCategory === category);
  }

  // Filter by budget (allow up to 15% over budget)
  const maxBudget = budget * 1.15;
  const minBudget = budget * 0.7; // At least 70% of budget

  candidates = candidates
    .filter(t => t.estimatedCost && t.estimatedCost >= minBudget && t.estimatedCost <= maxBudget)
    .sort((a, b) => {
      // Prioritize templates closest to budget
      const diffA = Math.abs((a.estimatedCost || 0) - budget);
      const diffB = Math.abs((b.estimatedCost || 0) - budget);
      return diffA - diffB;
    });

  // Quality adjustment factor
  const qualityFactors = {
    basic: 0.75,
    standard: 1.0,
    premium: 1.35,
  };
  const qualityFactor = qualityFactors[preferredQuality];

  // Adjust template costs based on quality
  const adjustedTemplates = candidates.map(template => ({
    ...template,
    estimatedCost: template.estimatedCost ? Math.round(template.estimatedCost * qualityFactor) : undefined,
    items: template.items.map(item => ({
      ...item,
      material: Math.round(item.material * qualityFactor),
      labor: Math.round(item.labor * qualityFactor),
    })),
  }));

  // Calculate budget breakdown
  const avgTemplate = adjustedTemplates[0];
  const totalMaterialLabor = avgTemplate ? 
    avgTemplate.items.reduce((sum, item) => 
      sum + (item.material + item.labor) * item.quantity, 0
    ) : budget * 0.75;

  const waste = totalMaterialLabor * (DEFAULT_PROFILE.wastePct / 100);
  const opex = totalMaterialLabor * (DEFAULT_PROFILE.opexPct / 100);
  const error = totalMaterialLabor * (DEFAULT_PROFILE.errorPct / 100);
  const subtotalBeforeProfit = totalMaterialLabor + waste + opex + error;
  const profit = subtotalBeforeProfit * (DEFAULT_PROFILE.markupPct / 100);
  const subtotalBeforeVat = subtotalBeforeProfit + profit;
  const vat = subtotalBeforeVat * (DEFAULT_PROFILE.vatPct / 100);
  const total = subtotalBeforeVat + vat;

  const materialPct = (totalMaterialLabor * 0.6) / total; // Assume 60% is material
  const laborPct = (totalMaterialLabor * 0.4) / total; // Assume 40% is labor
  const overheadPct = (waste + opex + error) / total;
  const profitPct = profit / total;

  const budgetBreakdown = {
    material: Math.round(budget * materialPct),
    labor: Math.round(budget * laborPct),
    overhead: Math.round(budget * overheadPct),
    profit: Math.round(budget * profitPct),
    total: budget,
  };

  // Generate recommendations
  const recommendations: string[] = [];

  if (adjustedTemplates.length === 0) {
    recommendations.push("งบประมาณของคุณอาจไม่เพียงพอสำหรับงานในหมวดนี้");
    recommendations.push("แนะนำให้เพิ่มงบประมาณอีก 20-30% หรือเลือกหมวดอื่น");
  } else {
    recommendations.push(`พบ ${adjustedTemplates.length} Template ที่เหมาะสมกับงบประมาณ`);
    
    if (preferredQuality === "basic") {
      recommendations.push("คุณเลือกระดับเบสิค วัสดุจะเป็นเกรดประหยัด แต่ยังใช้งานได้ดี");
    } else if (preferredQuality === "premium") {
      recommendations.push("คุณเลือกระดับพรีเมียม วัสดุจะเป็นเกรดดี แบรนด์ชั้นนำ");
    }
    
    const avgCost = adjustedTemplates[0]?.estimatedCost || 0;
    const budgetDiff = budget - avgCost;
    
    if (budgetDiff > 0) {
      recommendations.push(`เหลืองบประมาณ ${formatCurrency(budgetDiff)} สามารถเพิ่มรายการหรืออัพเกรดคุณภาพได้`);
    } else if (budgetDiff < 0 && Math.abs(budgetDiff) <= budget * 0.1) {
      recommendations.push(`เกินงบเล็กน้อย ${formatCurrency(Math.abs(budgetDiff))} แนะนำปรับรายการบางส่วน`);
    }

    // Suggest combining templates
    if (budget > 200000) {
      const possibleCombinations = findTemplateCombinations(budget, adjustedTemplates);
      if (possibleCombinations.length > 0) {
        recommendations.push("คุณสามารถรวม Template หลายอันได้ เช่น ห้องน้ำ + ห้องครัว");
      }
    }
  }

  // Warnings
  const warnings: string[] = [];
  if (budget < 50000) {
    warnings.push("งบประมาณต่ำมาก อาจไม่เพียงพอสำหรับงานคุณภาพดี");
  }
  if (preferredQuality === "premium" && budget < 200000) {
    warnings.push("งบประมาณอาจไม่เพียงพอสำหรับวัสดุระดับพรีเมียม");
  }

  return {
    suggestedTemplates: adjustedTemplates.slice(0, 6),
    budgetBreakdown,
    recommendations,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * คำนวณจากพื้นที่และสร้าง BOQ อัตโนมัติ
 */
export function calculateByArea(input: AreaCalculationInput): AreaCalculationResult {
  const { area, houseType, quality = "standard", includeRooms } = input;

  // Find base template
  const baseTemplate = templateMetadata.find(t => 
    t.subType === houseType || t.id.includes(houseType)
  );

  if (!baseTemplate) {
    throw new Error(`ไม่พบ Template สำหรับ ${houseType}`);
  }

  // Calculate scaling factor
  const baseArea = baseTemplate.area || 100;
  const scaleFactor = area / baseArea;

  // Quality adjustment
  const qualityFactors = {
    basic: 0.75,
    standard: 1.0,
    premium: 1.35,
  };
  const qualityFactor = qualityFactors[quality];

  // Scale template items
  const scaledItems: BOQItem[] = baseTemplate.items.map(item => ({
    ...item,
    quantity: Math.ceil(item.quantity * scaleFactor),
    material: Math.round(item.material * qualityFactor),
    labor: Math.round(item.labor * qualityFactor),
  }));

  // Add rooms if specified
  if (includeRooms) {
    const roomTemplates = templateMetadata.filter(t => t.mainCategory === "room");
    
    // Add bathrooms
    if (includeRooms.bathrooms > 0) {
      const bathroomTemplate = quality === "premium" 
        ? roomTemplates.find(t => t.id === "room_bathroom_premium")
        : roomTemplates.find(t => t.id === "room_bathroom_basic");
      
      if (bathroomTemplate) {
        for (let i = 0; i < includeRooms.bathrooms; i++) {
          bathroomTemplate.items.forEach(item => {
            scaledItems.push({
              ...item,
              id: `${item.id}-bath${i + 1}`,
              notes: `${item.notes || ""} (ห้องน้ำที่ ${i + 1})`.trim(),
            });
          });
        }
      }
    }

    // Add kitchens
    if (includeRooms.kitchens > 0) {
      const kitchenTemplate = roomTemplates.find(t => t.id === "room_kitchen_basic");
      if (kitchenTemplate) {
        for (let i = 0; i < includeRooms.kitchens; i++) {
          kitchenTemplate.items.forEach(item => {
            scaledItems.push({
              ...item,
              id: `${item.id}-kitchen${i + 1}`,
              notes: `${item.notes || ""} (ห้องครัวที่ ${i + 1})`.trim(),
            });
          });
        }
      }
    }

    // Add bedrooms
    if (includeRooms.bedrooms > 0) {
      const bedroomTemplate = roomTemplates.find(t => t.id === "room_bedroom_master");
      if (bedroomTemplate) {
        for (let i = 0; i < includeRooms.bedrooms; i++) {
          bedroomTemplate.items.forEach(item => {
            scaledItems.push({
              ...item,
              id: `${item.id}-bedroom${i + 1}`,
              quantity: i === 0 ? item.quantity : Math.ceil(item.quantity * 0.7), // First bedroom full size, others 70%
              notes: `${item.notes || ""} (ห้องนอนที่ ${i + 1})`.trim(),
            });
          });
        }
      }
    }
  }

  // Calculate costs
  const summary = calculateBOQSummary(scaledItems, DEFAULT_PROFILE);

  // Room breakdown
  const roomBreakdown = [];
  
  // Group by category
  const categories = new Set(scaledItems.map(item => item.category));
  categories.forEach(category => {
    const categoryItems = scaledItems.filter(item => item.category === category);
    const categoryTotal = categoryItems.reduce((sum, item) => 
      sum + (item.material + item.labor) * item.quantity, 0
    );
    
    roomBreakdown.push({
      room: category,
      area: category.includes("ห้องน้ำ") ? 4 : category.includes("ห้องครัว") ? 9 : Math.ceil(area / 10),
      items: categoryItems.length,
      cost: Math.round(categoryTotal),
    });
  });

  // Recommendations
  const recommendations: string[] = [
    `สร้าง BOQ สำหรับบ้าน ${area} ตร.ม. จากต้นแบบ ${baseTemplate.name}`,
    `ปรับขนาดรายการตามสัดส่วน ${scaleFactor.toFixed(2)}x`,
  ];

  if (quality === "premium") {
    recommendations.push("ใช้วัสดุระดับพรีเมียม ราคาเพิ่มขึ้น 35%");
  } else if (quality === "basic") {
    recommendations.push("ใช้วัสดุระดับเบสิค ประหยัดงบประมาณ 25%");
  }

  if (includeRooms) {
    if (includeRooms.bathrooms > 0) {
      recommendations.push(`เพิ่มห้องน้ำ ${includeRooms.bathrooms} ห้อง`);
    }
    if (includeRooms.kitchens > 0) {
      recommendations.push(`เพิ่มห้องครัว ${includeRooms.kitchens} ห้อง`);
    }
    if (includeRooms.bedrooms > 0) {
      recommendations.push(`เพิ่มห้องนอน ${includeRooms.bedrooms} ห้อง`);
    }
  }

  // Generate new template
  const generatedTemplate: TemplateMetadata = {
    ...baseTemplate,
    id: `generated_${houseType}_${area}_${Date.now()}`,
    name: `${baseTemplate.name} (${area} ตร.ม.) - ${quality === "premium" ? "พรีเมียม" : quality === "basic" ? "เบสิค" : "มาตรฐาน"}`,
    description: `สร้างอัตโนมัติจากพื้นที่ ${area} ตร.ม. คุณภาพ${quality === "premium" ? "พรีเมียม" : quality === "basic" ? "เบสิค" : "มาตรฐาน"}`,
    area,
    estimatedCost: Math.round(summary.grandTotal),
    tags: [...baseTemplate.tags, `${area} ตร.ม.`, `${quality}`, "สร้างอัตโนมัติ"],
    items: scaledItems,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  return {
    generatedTemplate,
    estimatedCost: Math.round(summary.grandTotal),
    materialCost: Math.round(summary.subtotalMaterial),
    laborCost: Math.round(summary.subtotalLabor),
    roomBreakdown: roomBreakdown.sort((a, b) => b.cost - a.cost),
    recommendations,
  };
}

/**
 * ค้นหา Template ที่รวมกันได้ภายในงบประมาณ
 */
function findTemplateCombinations(
  budget: number,
  templates: TemplateMetadata[]
): TemplateMetadata[][] {
  const combinations: TemplateMetadata[][] = [];
  
  // Try 2-template combinations
  for (let i = 0; i < templates.length; i++) {
    for (let j = i + 1; j < templates.length; j++) {
      const cost1 = templates[i].estimatedCost || 0;
      const cost2 = templates[j].estimatedCost || 0;
      const totalCost = cost1 + cost2;
      
      if (totalCost <= budget * 1.1 && totalCost >= budget * 0.9) {
        combinations.push([templates[i], templates[j]]);
      }
    }
  }
  
  return combinations.slice(0, 3); // Return top 3 combinations
}

/**
 * Format currency
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Estimate construction days based on items and complexity
 */
export function estimateConstructionDays(items: BOQItem[]): number {
  // Base calculation on item count and categories
  const categories = new Set(items.map(item => item.category));
  const baseDays = Math.ceil(items.length / 5); // ~5 items per day average
  const categoryMultiplier = 1 + (categories.size * 0.1); // More categories = more time
  
  return Math.ceil(baseDays * categoryMultiplier);
}

/**
 * Calculate cost per square meter
 */
export function calculateCostPerSqm(totalCost: number, area: number): number {
  if (area <= 0) return 0;
  return Math.round(totalCost / area);
}

/**
 * Merge multiple templates into one
 */
export function mergeTemplates(templates: TemplateMetadata[]): TemplateMetadata {
  if (templates.length === 0) {
    throw new Error("No templates to merge");
  }

  if (templates.length === 1) {
    return templates[0];
  }

  // Merge items
  const allItems: BOQItem[] = [];
  templates.forEach((template, index) => {
    template.items.forEach(item => {
      allItems.push({
        ...item,
        id: `${item.id}-t${index}`,
        notes: `${item.notes || ""} (จาก ${template.name})`.trim(),
      });
    });
  });

  // Calculate totals
  const totalArea = templates.reduce((sum, t) => sum + (t.area || 0), 0);
  const totalCost = templates.reduce((sum, t) => sum + (t.estimatedCost || 0), 0);
  const totalDays = Math.max(...templates.map(t => t.estimatedDays || 0));

  // Merge tags
  const allTags = new Set<string>();
  templates.forEach(t => t.tags.forEach(tag => allTags.add(tag)));

  const mergedTemplate: TemplateMetadata = {
    id: `merged_${templates.map(t => t.id).join("_")}_${Date.now()}`,
    name: templates.map(t => t.name).join(" + "),
    description: `รวม ${templates.length} Template: ${templates.map(t => t.name).join(", ")}`,
    mainCategory: templates[0].mainCategory,
    area: totalArea,
    estimatedCost: totalCost,
    estimatedDays: totalDays,
    tags: Array.from(allTags),
    items: allItems,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  return mergedTemplate;
}
