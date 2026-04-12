/**
 * quotation-templates.ts
 * Template รายการงานมาตรฐานสำหรับแต่ละประเภทงาน
 */

interface TemplateItem {
  category: string;
  description: string;
  unit: string;
  estimatedUnitPrice: [number, number]; // [min, max]
  estimatedLaborCost: [number, number];
}

export const BUILTIN_TEMPLATE: TemplateItem[] = [
  { category: 'ทุบรื้อ', description: 'งานทุบรื้อถอนของเดิม', unit: 'งาน', estimatedUnitPrice: [0, 0], estimatedLaborCost: [5000, 15000] },
  { category: 'Built-in', description: 'ตู้เสื้อผ้า Melamine', unit: 'ชุด', estimatedUnitPrice: [15000, 45000], estimatedLaborCost: [8000, 15000] },
  { category: 'Built-in', description: 'ตู้ครัว Top-Bottom', unit: 'ชุด', estimatedUnitPrice: [25000, 60000], estimatedLaborCost: [10000, 20000] },
  { category: 'Built-in', description: 'ชั้นวางของ/ตู้โชว์', unit: 'ชุด', estimatedUnitPrice: [8000, 25000], estimatedLaborCost: [5000, 10000] },
  { category: 'Built-in', description: 'โต๊ะทำงาน Built-in', unit: 'ชุด', estimatedUnitPrice: [8000, 20000], estimatedLaborCost: [4000, 8000] },
  { category: 'ท็อปหิน', description: 'หินท็อป Quartz', unit: 'เมตร', estimatedUnitPrice: [4000, 8000], estimatedLaborCost: [1000, 2000] },
  { category: 'Hardware', description: 'อุปกรณ์ (บานพับ, ราง, มือจับ)', unit: 'ชุด', estimatedUnitPrice: [3000, 10000], estimatedLaborCost: [0, 0] },
  { category: 'ทาสี', description: 'งานทาสี/เคลือบผิว', unit: 'งาน', estimatedUnitPrice: [2000, 5000], estimatedLaborCost: [3000, 6000] },
];

export const RENOVATION_TEMPLATE: TemplateItem[] = [
  { category: 'ทุบรื้อ', description: 'งานทุบรื้อถอน', unit: 'งาน', estimatedUnitPrice: [0, 0], estimatedLaborCost: [8000, 25000] },
  { category: 'โครงสร้าง', description: 'ฝ้าเพดาน Gypsum', unit: 'ตร.ม.', estimatedUnitPrice: [200, 350], estimatedLaborCost: [150, 250] },
  { category: 'โครงสร้าง', description: 'ผนัง Gypsum', unit: 'ตร.ม.', estimatedUnitPrice: [200, 300], estimatedLaborCost: [150, 200] },
  { category: 'ไฟฟ้า', description: 'เดินไฟฟ้าใหม่', unit: 'จุด', estimatedUnitPrice: [800, 1500], estimatedLaborCost: [700, 1000] },
  { category: 'ประปา', description: 'เดินท่อประปาใหม่', unit: 'จุด', estimatedUnitPrice: [1000, 2000], estimatedLaborCost: [1000, 1500] },
  { category: 'พื้น', description: 'ปูกระเบื้อง 60x60', unit: 'ตร.ม.', estimatedUnitPrice: [250, 500], estimatedLaborCost: [200, 350] },
  { category: 'Built-in', description: 'งาน Built-in ตู้/ชั้น', unit: 'ชุด', estimatedUnitPrice: [15000, 50000], estimatedLaborCost: [8000, 15000] },
  { category: 'ทาสี', description: 'ทาสีทั้งห้อง', unit: 'ตร.ม.', estimatedUnitPrice: [80, 150], estimatedLaborCost: [80, 120] },
  { category: 'ทำความสะอาด', description: 'ทำความสะอาดหลังงาน', unit: 'งาน', estimatedUnitPrice: [0, 0], estimatedLaborCost: [3000, 8000] },
];

export const FULL_INTERIOR_TEMPLATE: TemplateItem[] = [
  { category: 'ออกแบบ', description: 'Design Fee', unit: 'งาน', estimatedUnitPrice: [30000, 150000], estimatedLaborCost: [0, 0] },
  ...RENOVATION_TEMPLATE,
  { category: 'เฟอร์นิเจอร์', description: 'เฟอร์นิเจอร์ลอย (Loose Furniture)', unit: 'ชุด', estimatedUnitPrice: [20000, 100000], estimatedLaborCost: [0, 5000] },
  { category: 'ผ้าม่าน', description: 'ผ้าม่าน + ราง', unit: 'ชุด', estimatedUnitPrice: [5000, 25000], estimatedLaborCost: [2000, 5000] },
  { category: 'ตกแต่ง', description: 'Accessories / Decoration', unit: 'ชุด', estimatedUnitPrice: [5000, 30000], estimatedLaborCost: [0, 0] },
];

export function getTemplate(type: 'builtin' | 'renovation' | 'full-interior'): TemplateItem[] {
  switch (type) {
    case 'builtin': return BUILTIN_TEMPLATE;
    case 'renovation': return RENOVATION_TEMPLATE;
    case 'full-interior': return FULL_INTERIOR_TEMPLATE;
  }
}
