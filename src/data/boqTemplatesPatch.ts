import { BOQItem } from "../types/boq";

/**
 * BOQ Templates Patch - งานเหล็กและโครงหลังคา
 * เพิ่มรายการที่ขาดสำหรับ:
 * 1. งานเหล็กโครงสร้าง (เหล็กกล่อง, H-Beam, C-Channel)
 * 2. งานโครงหลังคา
 * 3. งานเหล็กกัลวาไนซ์
 * 4. งานทาสีเหล็ก
 * เวอร์ชัน: 1.0
 * วันที่: 2025-10-29
 */

// ==================== Template: งานโครงหลังคาเหล็ก 100 ตร.ม. ====================
export const roof_steel_100: BOQItem[] = [
  // โครงเหล็กหลังคา
  { id: "rf-001", name: "เหล็กกล่อง 2x1 นิ้ว หนา 1.6 มม.", category: "โครงสร้าง", subcategory: "โครงเหล็ก", unit: "kg", material: 42, labor: 18, quantity: 850 },
  { id: "rf-002", name: "เหล็กกล่อง 1.5x1.5 นิ้ว", category: "โครงสร้าง", subcategory: "โครงเหล็ก", unit: "kg", material: 42, labor: 18, quantity: 450 },
  { id: "rf-003", name: "เสา H‑Beam 200x200x8", category: "โครงสร้าง", subcategory: "โครงเหล็ก", unit: "kg", material: 48, labor: 20, quantity: 600 },
  { id: "rf-004", name: "ทาสีเหล็กสีน้ำมัน 2 เที่ยว", category: "สถาปัตยกรรมภายนอก", subcategory: "ทาสี", unit: "m2", material: 45, labor: 55, quantity: 200 },
  { id: "rf-005", name: "สีพ่นอีพ็อกซีเหล็ก 2 ส่วน", category: "สถาปัตยกรรมภายนอก", subcategory: "สี", unit: "L", material: 180, labor: 45, quantity: 25 },
  
  // หลังคา
  { id: "rf-010", name: "เมทัลชีท 0.47 มม. โครงเหล็กกล่อง 1.5\"", category: "สถาปัตยกรรมภายนอก", subcategory: "หลังคา", unit: "m2", material: 320, labor: 220, quantity: 100 },
  { id: "rf-011", name: "ฉนวน PE ใต้หลังคา 5 มม.", category: "สถาปัตยกรรมภายนอก", subcategory: "ฉนวน", unit: "m2", material: 250, labor: 50, quantity: 100 },
  { id: "rf-012", name: "คิ้วอลูมิเนียมตัวจบ J/U", category: "สถาปัตยกรรมภายนอก", subcategory: "อุปกรณ์", unit: "m", material: 60, labor: 40, quantity: 45 },
  { id: "rf-013", name: "รางน้ำสังกะสี 0.5 มม.", category: "สถาปัตยกรรมภายนอก", subcategory: "ระบายน้ำ", unit: "m", material: 120, labor: 80, quantity: 35 },
  { id: "rf-014", name: "ท่อเดรนลงฝน UPVC 3\"", category: "สถาปัตยกรรมภายนอก", subcategory: "ระบายน้ำ", unit: "m", material: 120, labor: 70, quantity: 20 },
];

// ==================== Template: งานโครงหลังคา Standing Seam ====================
export const roof_standing_seam_150: BOQItem[] = [
  // โครงเหล็ก
  { id: "rfs-001", name: "เหล็กกล่อง 2x1 นิ้ว หนา 1.6 มม.", category: "โครงสร้าง", subcategory: "โครงเหล็ก", unit: "kg", material: 42, labor: 18, quantity: 1280 },
  { id: "rfs-002", name: "เหล็กกล่อง 1.5x1.5 นิ้ว", category: "โครงสร้าง", subcategory: "โครงเหล็ก", unit: "kg", material: 42, labor: 18, quantity: 680 },
  { id: "rfs-003", name: "เสา H‑Beam 200x200x8", category: "โครงสร้าง", subcategory: "โครงเหล็ก", unit: "kg", material: 48, labor: 20, quantity: 900 },
  { id: "rfs-004", name: "ทาสีเหล็กสีน้ำมัน 2 เที่ยว", category: "สถาปัตยกรรมภายนอก", subcategory: "ทาสี", unit: "m2", material: 45, labor: 55, quantity: 300 },
  
  // หลังคา Standing Seam
  { id: "rfs-010", name: "Standing Seam Alu-zinc", category: "สถาปัตยกรรมภายนอก", subcategory: "หลังคา", unit: "m2", material: 780, labor: 320, quantity: 150 },
  { id: "rfs-011", name: "ฉนวน PE ใต้หลังคา 5 มม.", category: "สถาปัตยกรรมภายนอก", subcategory: "ฉนวน", unit: "m2", material: 250, labor: 50, quantity: 150 },
  { id: "rfs-012", name: "รางน้ำสแตนเลส 0.8 มม.", category: "สถาปัตยกรรมภายนอก", subcategory: "ระบายน้ำ", unit: "m", material: 380, labor: 180, quantity: 50 },
  { id: "rfs-013", name: "ท่อเดรนลงฝน UPVC 3\"", category: "สถาปัตยกรรมภายนอก", subcategory: "ระบายน้ำ", unit: "m", material: 120, labor: 70, quantity: 30 },
];

// ==================== Template: งานกันสาดเหล็ก 30 ตร.ม. ====================
export const canopy_steel_30: BOQItem[] = [
  // โครงเหล็ก
  { id: "can-001", name: "เหล็กกล่อง 2x1 นิ้ว หนา 1.6 มม.", category: "โครงสร้าง", subcategory: "โครงเหล็ก", unit: "kg", material: 42, labor: 18, quantity: 180 },
  { id: "can-002", name: "เหล็กกล่อง 1.5x1.5 นิ้ว", category: "โครงสร้าง", subcategory: "โครงเหล็ก", unit: "kg", material: 42, labor: 18, quantity: 85 },
  { id: "can-003", name: "ทาสีเหล็กสีน้ำมัน 2 เที่ยว", category: "สถาปัตยกรรมภายนอก", subcategory: "ทาสี", unit: "m2", material: 45, labor: 55, quantity: 60 },
  
  // กันสาด
  { id: "can-010", name: "กันสาดโครงเหล็ก + เมทัลชีท", category: "สถาปัตยกรรมภายนอก", subcategory: "กันสาด", unit: "m2", material: 420, labor: 260, quantity: 30 },
];

// ==================== Template: งานกันสาดโพลีคาร์บอเนต ====================
export const canopy_polycarbonate_20: BOQItem[] = [
  // โครงเหล็ก
  { id: "canp-001", name: "เหล็กกล่อง 2x1 นิ้ว หนา 1.6 มม.", category: "โครงสร้าง", subcategory: "โครงเหล็ก", unit: "kg", material: 42, labor: 18, quantity: 120 },
  { id: "canp-002", name: "ทาสีเหล็กสีน้ำมัน 2 เที่ยว", category: "สถาปัตยกรรมภายนอก", subcategory: "ทาสี", unit: "m2", material: 45, labor: 55, quantity: 40 },
  
  // กันสาด
  { id: "canp-010", name: "กันสาดโครงเหล็ก+โพลีตัน 6 มม.", category: "สถาปัตยกรรมภายนอก", subcategory: "กันสาด", unit: "m2", material: 900, labor: 420, quantity: 20 },
];

// ==================== Template: งานโครงเหล็กทั่วไป ====================
export const steel_structure_general: BOQItem[] = [
  // เหล็กโครงสร้างพื้นฐาน
  { id: "st-001", name: "เหล็กกล่อง 2x1 นิ้ว หนา 1.6 มม.", category: "โครงสร้าง", subcategory: "โครงเหล็ก", unit: "kg", material: 42, labor: 18, quantity: 500 },
  { id: "st-002", name: "เหล็กกล่อง 1.5x1.5 นิ้ว", category: "โครงสร้าง", subcategory: "โครงเหล็ก", unit: "kg", material: 42, labor: 18, quantity: 300 },
  { id: "st-003", name: "เหล็กแผ่นตัดพับ 3 มม.", category: "สถาปัตยกรรมภายนอก", subcategory: "เหล็กแผ่น", unit: "kg", material: 55, labor: 20, quantity: 180 },
  { id: "st-004", name: "เสา H‑Beam 200x200x8", category: "โครงสร้าง", subcategory: "โครงเหล็ก", unit: "kg", material: 48, labor: 20, quantity: 400 },
  
  // ทาสี/ป้องกันสนิม
  { id: "st-010", name: "ทาสีเหล็กสีน้ำมัน 2 เที่ยว", category: "สถาปัตยกรรมภายนอก", subcategory: "ทาสี", unit: "m2", material: 45, labor: 55, quantity: 150 },
  { id: "st-011", name: "สีพ่นอีพ็อกซีเหล็ก 2 ส่วน", category: "สถาปัตยกรรมภายนอก", subcategory: "สี", unit: "L", material: 180, labor: 45, quantity: 15 },
];

// ==================== Template: งานราวกันตก/บันได ====================
export const handrail_stairs: BOQItem[] = [
  // ราวกันตก
  { id: "hr-001", name: "ราวกันตกสแตนเลส Ø38 มม.", category: "สถาปัตยกรรมภายนอก", subcategory: "ราว", unit: "m", material: 850, labor: 350, quantity: 20 },
  { id: "hr-002", name: "เหล็กกล่อง 1.5x1.5 นิ้ว (โครงรองราว)", category: "โครงสร้าง", subcategory: "โครงเหล็ก", unit: "kg", material: 42, labor: 18, quantity: 65 },
  { id: "hr-003", name: "ทาสีเหล็กสีน้ำมัน 2 เที่ยว", category: "สถาปัตยกรรมภายนอก", subcategory: "ทาสี", unit: "m2", material: 45, labor: 55, quantity: 25 },
];

// ==================== Template: งานประตู/รั้วเหล็ก ====================
export const fence_gate_steel: BOQItem[] = [
  // โครงประตู/รั้ว
  { id: "fg-001", name: "ประตูเหล็กบานเลื่อน", category: "สถาปัตยกรรมภายนอก", subcategory: "โลหะ", unit: "m2", material: 1200, labor: 600, quantity: 8 },
  { id: "fg-002", name: "เหล็กกล่อง 2x1 นิ้ว หนา 1.6 มม.", category: "โครงสร้าง", subcategory: "โครงเหล็ก", unit: "kg", material: 42, labor: 18, quantity: 280 },
  { id: "fg-003", name: "ทาสีเหล็กสีน้ำมัน 2 เที่ยว", category: "สถาปัตยกรรมภายนอก", subcategory: "ทาสี", unit: "m2", material: 45, labor: 55, quantity: 45 },
];

// ==================== รายการเหล็กเพิ่มเติมสำหรับ catalog ====================
export const additionalSteelItems: BOQItem[] = [
  // เหล็กกัลวาไนซ์
  { id: "steel-gi-box-2x1", name: "เหล็กกล่องกัลวาไนซ์ 2x1 นิ้ว", category: "โครงสร้าง", subcategory: "โครงเหล็ก", unit: "kg", material: 48, labor: 19.8, quantity: 0 },
  { id: "steel-gi-box-3x1-5", name: "เหล็กกล่องกัลวาไนซ์ 3x1.5 นิ้ว", category: "โครงสร้าง", subcategory: "โครงเหล็ก", unit: "kg", material: 50, labor: 20.5, quantity: 0 },
  { id: "steel-gi-box-4x2", name: "เหล็กกล่องกัลวาไนซ์ 4x2 นิ้ว", category: "โครงสร้าง", subcategory: "โครงเหล็ก", unit: "kg", material: 52, labor: 21.4, quantity: 0 },
  
  // เหล็ก C-Channel
  { id: "steel-c-channel-75", name: "เหล็กซี C-Channel 75 มม.", category: "โครงสร้าง", subcategory: "โครงเหล็ก", unit: "kg", material: 44, labor: 18.2, quantity: 0 },
  { id: "steel-c-channel-100", name: "เหล็กซี C-Channel 100 มม.", category: "โครงสร้าง", subcategory: "โครงเหล็ก", unit: "kg", material: 46, labor: 19.0, quantity: 0 },
  { id: "steel-c-channel-150", name: "เหล็กซี C-Channel 150 มม.", category: "โครงสร้าง", subcategory: "โครงเหล็ก", unit: "kg", material: 48, labor: 19.8, quantity: 0 },
  
  // เหล็ก H-Beam เพิ่มเติม
  { id: "steel-hbeam-150x150", name: "เสา H-Beam 150x150x7", category: "โครงสร้าง", subcategory: "โครงเหล็ก", unit: "kg", material: 45, labor: 18.5, quantity: 0 },
  { id: "steel-hbeam-250x250", name: "เสา H-Beam 250x250x9", category: "โครงสร้าง", subcategory: "โครงเหล็ก", unit: "kg", material: 50, labor: 20.5, quantity: 0 },
  { id: "steel-hbeam-300x300", name: "เสา H-Beam 300x300x10", category: "โครงสร้าง", subcategory: "โครงเหล็ก", unit: "kg", material: 52, labor: 21.4, quantity: 0 },
  
  // เหล็กแผ่นเพิ่มเติม
  { id: "steel-sheet-2mm", name: "เหล็กแผ่นตัดพับ 2 มม.", category: "สถาปัตยกรรมภายนอก", subcategory: "เหล็กแผ่น", unit: "kg", material: 52, labor: 18.0, quantity: 0 },
  { id: "steel-sheet-4mm", name: "เหล็กแผ่นตัดพับ 4 มม.", category: "สถาปัตยกรรมภายนอก", subcategory: "เหล็กแผ่น", unit: "kg", material: 58, labor: 22.0, quantity: 0 },
  { id: "steel-sheet-5mm", name: "เหล็กแผ่นตัดพับ 5 มม.", category: "สถาปัตยกรรมภายนอก", subcategory: "เหล็กแผ่น", unit: "kg", material: 60, labor: 24.0, quantity: 0 },
  
  // เหล็กท่อกลม
  { id: "steel-pipe-1in", name: "เหล็กท่อกลม 1 นิ้ว", category: "โครงสร้าง", subcategory: "โครงเหล็ก", unit: "kg", material: 40, labor: 16.5, quantity: 0 },
  { id: "steel-pipe-1-5in", name: "เหล็กท่อกลม 1.5 นิ้ว", category: "โครงสร้าง", subcategory: "โครงเหล็ก", unit: "kg", material: 42, labor: 17.3, quantity: 0 },
  { id: "steel-pipe-2in", name: "เหล็กท่อกลม 2 นิ้ว", category: "โครงสร้าง", subcategory: "โครงเหล็ก", unit: "kg", material: 44, labor: 18.1, quantity: 0 },
  
  // สีกันสนิมเพิ่มเติม
  { id: "steel-paint-red-oxide", name: "สีกันสนิมแดง Red Oxide", category: "สถาปัตยกรรมภายนอก", subcategory: "สี", unit: "L", material: 120, labor: 39.6, quantity: 0 },
  { id: "steel-paint-zinc-rich", name: "สีกันสนิม Zinc Rich Primer", category: "สถาปัตยกรรมภายนอก", subcategory: "สี", unit: "L", material: 280, labor: 92.4, quantity: 0 },
  { id: "steel-paint-pu-gloss", name: "สี PU เงา ทนความร้อน", category: "สถาปัตยกรรมภายนอก", subcategory: "สี", unit: "L", material: 320, labor: 105.6, quantity: 0 },
  
  // งานเชื่อม/ต่อเหล็ก
  { id: "steel-welding-point", name: "เชื่อมต่อเหล็กโครงสร้าง (จุด)", category: "โครงสร้าง", subcategory: "โครงเหล็ก", unit: "pt", material: 0, labor: 85.0, quantity: 0 },
  { id: "steel-bolt-m12", name: "สลักเกลียว M12 + น๊อต", category: "โครงสร้าง", subcategory: "อุปกรณ์", unit: "set", material: 15, labor: 4.95, quantity: 0 },
  { id: "steel-bolt-m16", name: "สลักเกลียว M16 + น๊อต", category: "โครงสร้าง", subcategory: "อุปกรณ์", unit: "set", material: 25, labor: 8.25, quantity: 0 },
  
  // โครงหลังคาเพิ่มเติม
  { id: "roof-purlin-c-100", name: "เหล็กรองหลังคา Purlin C-100", category: "โครงสร้าง", subcategory: "โครงเหล็ก", unit: "kg", material: 44, labor: 18.2, quantity: 0 },
  { id: "roof-purlin-c-150", name: "เหล็กรองหลังคา Purlin C-150", category: "โครงสร้าง", subcategory: "โครงเหล็ก", unit: "kg", material: 46, labor: 19.0, quantity: 0 },
  { id: "roof-truss-assembly", name: "ประกอบโครงหลังคาเหล็ก (ชุด)", category: "โครงสร้าง", subcategory: "โครงเหล็ก", unit: "set", material: 0, labor: 1200.0, quantity: 0 },
];

// ==================== Export All Templates ====================
export const steelTemplates = {
  roof_steel_100,
  roof_standing_seam_150,
  canopy_steel_30,
  canopy_polycarbonate_20,
  steel_structure_general,
  handrail_stairs,
  fence_gate_steel,
  additionalSteelItems,
};

// Template Metadata
export const steelTemplateMetadata = [
  {
    id: "roof_steel_100",
    name: "โครงหลังคาเหล็ก 100 ตร.ม.",
    category: "โครงหลังคา",
    description: "โครงหลังคาเหล็กพร้อมมุงเมทัลชีท ขนาด 100 ตารางเมตร",
    estimatedValue: 350000,
  },
  {
    id: "roof_standing_seam_150",
    name: "โครงหลังคา Standing Seam 150 ตร.ม.",
    category: "โครงหลังคา",
    description: "โครงหลังคาเหล็กพร้อมมุง Standing Seam คุณภาพสูง",
    estimatedValue: 750000,
  },
  {
    id: "canopy_steel_30",
    name: "กันสาดเหล็ก 30 ตร.ม.",
    category: "กันสาด",
    description: "โครงกันสาดเหล็กพร้อมมุงเมทัลชีท",
    estimatedValue: 85000,
  },
  {
    id: "canopy_polycarbonate_20",
    name: "กันสาดโพลีคาร์บอเนต 20 ตร.ม.",
    category: "กันสาด",
    description: "โครงกันสาดเหล็กพร้อมมุงโพลีคาร์บอเนต",
    estimatedValue: 95000,
  },
  {
    id: "steel_structure_general",
    name: "งานโครงเหล็กทั่วไป",
    category: "โครงเหล็ก",
    description: "รายการโครงเหล็กพื้นฐานสำหรับงานทั่วไป",
    estimatedValue: 180000,
  },
  {
    id: "handrail_stairs",
    name: "ราวกันตก/บันได",
    category: "โครงเหล็ก",
    description: "ราวกันตกสแตนเลสพร้อมโครงรอง",
    estimatedValue: 45000,
  },
  {
    id: "fence_gate_steel",
    name: "ประตู/รั้วเหล็ก",
    category: "โครงเหล็ก",
    description: "ประตูและรั้วเหล็กพร้อมทาสี",
    estimatedValue: 65000,
  },
];
