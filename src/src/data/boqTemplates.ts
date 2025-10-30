import { TemplateMetadata } from "../types/template";
import { BOQItem } from "../types/boq";

/**
 * EZBOQ Template Library
 * 
 * หมวดหมู่:
 * 1. บ้านเดี่ยว - 1 ชั้น, 2 ชั้น, 3 ชั้น
 * 2. ห้องต่างๆ - ห้องน้ำ, ครัว, นอน
 * 3. รีโนเวท - ห้องน้ำ, ครัว, ทั้งบ้าน
 * 4. บิ้วอิน - ตู้เสื้อผ้า, ชุดครัว, ชุดวางทีวี
 * 5. ภูมิทัศน์ - สวน, รั้ว, ทางเดิน
 * 6. ร้านค้า - ร้านกาแฟ, ร้านอาหาร
 */

// ==================== บ้านเดี่ยว ====================

const house_1floor_80: BOQItem[] = [
  // โครงสร้าง
  { id: "h1-001", name: "คอนกรีตผสมเสร็จ 210 ksc", category: "โครงสร้าง", subcategory: "คอนกรีต", unit: "m3", material: 2384, labor: 0, quantity: 18 },
  { id: "h1-002", name: "เหล็กเส้น SD40 Ø12 มม.", category: "โครงสร้าง", subcategory: "เหล็กเส้น", unit: "kg", material: 20, labor: 5, quantity: 1800 },
  { id: "h1-003", name: "ผนังอิฐมอญ ก่อ+ฉาบ", category: "โครงสร้าง", subcategory: "ก่ออิฐ", unit: "m2", material: 260, labor: 140, quantity: 150 },
  
  // หลังคา
  { id: "h1-010", name: "มุงแผ่นเมทัลชีท PU 25 มม.", category: "สถาปัตยกรรมภายนอก", subcategory: "หลังคา", unit: "m2", material: 320, labor: 180, quantity: 100 },
  { id: "h1-011", name: "ฉนวน PE ใต้หลังคา 5 มม.", category: "สถาปัตยกรรมภายนอก", subcategory: "ฉนวน", unit: "m2", material: 250, labor: 50, quantity: 100 },
  
  // ประตู-หน้าต่าง
  { id: "h1-020", name: "ประตูภายนอก UPVC พร้อมวงกบ", category: "สถาปัตยกรรมภายนอก", subcategory: "ประตู", unit: "pcs", material: 2400, labor: 700, quantity: 1 },
  { id: "h1-021", name: "กรอบ uPVC บานเลื่อน 2 ราง + มุ้ง", category: "สถาปัตยกรรมภายนอก", subcategory: "หน้าต่าง", unit: "m2", material: 980, labor: 400, quantity: 12 },
  
  // ทาสี
  { id: "h1-030", name: "ทาสีอะครีลิคภายนอก 2 เที่ยว", category: "สถาปัตยกรรมภายนอก", subcategory: "ทาสี", unit: "m2", material: 55, labor: 45, quantity: 300 },
  { id: "h1-031", name: "ทาสีอะครีลิคภายใน 2 เที่ยว", category: "สถาปัตยกรรมภายใน", subcategory: "ทาสี", unit: "m2", material: 45, labor: 35, quantity: 280 },
  
  // พื้น
  { id: "h1-040", name: "กระเบื้องแกรนิตโต 60x60 ซม.", category: "สถาปัตยกรรมภายใน", subcategory: "พื้น", unit: "m2", material: 380, labor: 180, quantity: 45 },
  { id: "h1-041", name: "พื้นลามิเนต 12 มม.", category: "สถาปัตยกรรมภายใน", subcategory: "พื้น", unit: "m2", material: 420, labor: 150, quantity: 35 },
  
  // ห้องน้ำ
  { id: "h1-050", name: "สุขภัณฑ์ชิ้นเดียว เกรดมาตรฐาน", category: "สถาปัตยกรรมภายใน", subcategory: "ห้องน้ำ", unit: "set", material: 4000, labor: 800, quantity: 2 },
  { id: "h1-051", name: "กระเบื้องผนัง 30x60 ซม.", category: "สถาปัตยกรรมภายใน", subcategory: "ผนัง", unit: "m2", material: 320, labor: 180, quantity: 40 },
  
  // ไฟฟ้า
  { id: "h1-060", name: "ตู้ไฟ MDB 12 ช่อง", category: "ระบบ MEP", subcategory: "ไฟฟ้า", unit: "set", material: 3500, labor: 1200, quantity: 1 },
  { id: "h1-061", name: "จุดโคมไฟภายใน", category: "ระบบ MEP", subcategory: "ไฟฟ้า", unit: "point", material: 400, labor: 250, quantity: 25 },
  { id: "h1-062", name: "จุดปลั๊กไฟ พร้อมสายและท่อ", category: "ระบบ MEP", subcategory: "ไฟฟ้า", unit: "point", material: 320, labor: 250, quantity: 30 },
  
  // ประปา
  { id: "h1-070", name: "ท่อ PVC 2\\\" พร้อมอุปกรณ์", category: "ระบบ MEP", subcategory: "ประปา", unit: "m", material: 65, labor: 45, quantity: 40 },
  { id: "h1-071", name: "ท่อ PVC 4\\\" ระบายน้ำ", category: "ระบบ MEP", subcategory: "ระบายน้ำ", unit: "m", material: 85, labor: 55, quantity: 30 },
];

const house_2floor_150: BOQItem[] = [
  // โครงสร้าง
  { id: "h2-001", name: "คอนกรีตผสมเสร็จ 210 ksc", category: "โครงสร้าง", subcategory: "คอนกรีต", unit: "m3", material: 2384, labor: 0, quantity: 35 },
  { id: "h2-002", name: "เหล็กเส้น SD40 Ø12 มม.", category: "โครงสร้าง", subcategory: "เหล็กเส้น", unit: "kg", material: 20, labor: 5, quantity: 3500 },
  { id: "h2-003", name: "เหล็กข้ออ้อย SD40 Ø16 มม.", category: "โครงสร้าง", subcategory: "เหล็กเส้น", unit: "kg", material: 23, labor: 6, quantity: 2400 },
  { id: "h2-004", name: "ผนังอิฐมอญ ก่อ+ฉาบ", category: "โครงสร้าง", subcategory: "ก่ออิฐ", unit: "m2", material: 260, labor: 140, quantity: 280 },
  
  // หลังคา
  { id: "h2-010", name: "มุงแผ่นเมทัลชีท PU 25 มม.", category: "สถาปัตยกรรมภายนอก", subcategory: "หลังคา", unit: "m2", material: 320, labor: 180, quantity: 180 },
  { id: "h2-011", name: "ฉนวน PE ใต้หลังคา 5 มม.", category: "สถาปัตยกรรมภายนอก", subcategory: "ฉนวน", unit: "m2", material: 250, labor: 50, quantity: 180 },
  
  // บันได
  { id: "h2-015", name: "บันไดคอนกรีต ตกแต่งหินอ่อน", category: "สถาปัตยกรรมภายใน", subcategory: "บันได", unit: "m2", material: 850, labor: 450, quantity: 15 },
  { id: "h2-016", name: "ราวบันไดสแตนเลส", category: "สถาปัตยกรรมภายใน", subcategory: "บันได", unit: "m", material: 1200, labor: 400, quantity: 12 },
  
  // ประตู-หน้าต่าง
  { id: "h2-020", name: "ประตูภายนอก UPVC พร้อมวงกบ", category: "สถาปัตยกรรมภายนอก", subcategory: "ประตู", unit: "pcs", material: 2400, labor: 700, quantity: 1 },
  { id: "h2-021", name: "กรอบ uPVC บานเลื่อน 2 ราง + มุ้ง", category: "สถาปัตยกรรมภายนอก", subcategory: "หน้าต่าง", unit: "m2", material: 980, labor: 400, quantity: 24 },
  { id: "h2-022", name: "กรอบบานประตูไม้ HDF", category: "สถาปัตยกรรมภายใน", subcategory: "ประตู", unit: "pcs", material: 900, labor: 250, quantity: 8 },
  
  // ทาสี
  { id: "h2-030", name: "ทาสีอะครีลิคภายนอก 2 เที่ยว", category: "สถาปัตยกรรมภายนอก", subcategory: "ทาสี", unit: "m2", material: 55, labor: 45, quantity: 550 },
  { id: "h2-031", name: "ทาสีอะครีลิคภายใน 2 เที่ยว", category: "สถาปัตยกรรมภายใน", subcategory: "ทาสี", unit: "m2", material: 45, labor: 35, quantity: 520 },
  
  // พื้น
  { id: "h2-040", name: "กระเบื้องแกรนิตโต 60x60 ซม.", category: "สถาปัตยกรรมภายใน", subcategory: "พื้น", unit: "m2", material: 380, labor: 180, quantity: 85 },
  { id: "h2-041", name: "พื้นลามิเนต 12 มม.", category: "สถาปัตยกรรมภายใน", subcategory: "พื้น", unit: "m2", material: 420, labor: 150, quantity: 65 },
  
  // ห้องน้ำ (3 ห้อง)
  { id: "h2-050", name: "สุขภัณฑ์ชิ้นเดียว เกรดมาตรฐาน", category: "สถาปัตยกรรมภายใน", subcategory: "ห้องน้ำ", unit: "set", material: 4000, labor: 800, quantity: 2 },
  { id: "h2-051", name: "สุขภัณฑ์ชิ้นเดียว เกรดพรีเมียม", category: "สถาปัตยกรรมภายใน", subcategory: "ห้องน้ำ", unit: "set", material: 6500, labor: 1000, quantity: 1 },
  { id: "h2-052", name: "กระเบื้องผนัง 30x60 ซม.", category: "สถาปัตยกรรมภายใน", subcategory: "ผนัง", unit: "m2", material: 320, labor: 180, quantity: 65 },
  
  // ไฟฟ้า
  { id: "h2-060", name: "ตู้ไฟ MDB 16 ช่อง", category: "ระบบ MEP", subcategory: "ไฟฟ้า", unit: "set", material: 4500, labor: 1500, quantity: 1 },
  { id: "h2-061", name: "จุดโคมไฟภายใน", category: "ระบบ MEP", subcategory: "ไฟฟ้า", unit: "point", material: 400, labor: 250, quantity: 45 },
  { id: "h2-062", name: "จุดปลั๊กไฟ พร้อมสายและท่อ", category: "ระบบ MEP", subcategory: "ไฟฟ้า", unit: "point", material: 320, labor: 250, quantity: 55 },
  { id: "h2-063", name: "แอร์บ้าน 18,000 BTU พร้อมติดตั้ง", category: "ระบบ MEP", subcategory: "แอร์", unit: "set", material: 18000, labor: 2500, quantity: 3 },
];

const house_2floor_200: BOQItem[] = [
  // โครงสร้าง
  { id: "h2b-001", name: "คอนกรีตผสมเสร็จ 210 ksc", category: "โครงสร้าง", subcategory: "คอนกรีต", unit: "m3", material: 2384, labor: 0, quantity: 45 },
  { id: "h2b-002", name: "คอนกรีตผสมเสร็จ 240 ksc", category: "โครงสร้าง", subcategory: "คอนกรีต", unit: "m3", material: 2550, labor: 0, quantity: 25 },
  { id: "h2b-003", name: "เหล็กเส้น SD40 Ø12 มม.", category: "โครงสร้าง", subcategory: "เหล็กเส้น", unit: "kg", material: 20, labor: 5, quantity: 4500 },
  { id: "h2b-004", name: "เหล็กข้ออ้อย SD40 Ø16 มม.", category: "โครงสร้าง", subcategory: "เหล็กเส้น", unit: "kg", material: 23, labor: 6, quantity: 3200 },
  { id: "h2b-005", name: "ผนังอิฐมอญ ก่อ+ฉาบ", category: "โครงสร้าง", subcategory: "ก่ออิฐ", unit: "m2", material: 260, labor: 140, quantity: 380 },
  
  // หลังคา
  { id: "h2b-010", name: "มุงแผ่นเมทัลชีท PU 25 มม.", category: "สถาปัตยกรรมภายนอก", subcategory: "หลังคา", unit: "m2", material: 320, labor: 180, quantity: 240 },
  { id: "h2b-011", name: "ฉนวน PE ใต้หลังคา 5 มม.", category: "สถาปัตยกรรมภายนอก", subcategory: "ฉนวน", unit: "m2", material: 250, labor: 50, quantity: 240 },
  
  // บันได
  { id: "h2b-015", name: "บันไดคอนกรีต ตกแต่งหินอ่อน", category: "สถาปัตยกรรมภายใน", subcategory: "บันได", unit: "m2", material: 850, labor: 450, quantity: 18 },
  { id: "h2b-016", name: "ราวบันไดสแตนเลส", category: "สถาปัตยกรรมภายใน", subcategory: "บันได", unit: "m", material: 1200, labor: 400, quantity: 15 },
  
  // ประตู-หน้าต่าง
  { id: "h2b-020", name: "ประตูภายนอก UPVC พร้อมวงกบ", category: "สถาปัตยกรรมภายนอก", subcategory: "ประตู", unit: "pcs", material: 2400, labor: 700, quantity: 1 },
  { id: "h2b-021", name: "กรอบ uPVC บานเลื่อน 2 ราง + มุ้ง", category: "สถาปัตยกรรมภายนอก", subcategory: "หน้าต่าง", unit: "m2", material: 980, labor: 400, quantity: 32 },
  { id: "h2b-022", name: "กรอบบานประตูไม้ HDF", category: "สถาปัตยกรรมภายใน", subcategory: "ประตู", unit: "pcs", material: 900, labor: 250, quantity: 10 },
  
  // พื้น
  { id: "h2b-040", name: "กระเบื้องแกรนิตโต 60x60 ซม.", category: "สถาปัตยกรรมภายใน", subcategory: "พื้น", unit: "m2", material: 380, labor: 180, quantity: 115 },
  { id: "h2b-041", name: "พื้นลามิเนต 12 มม.", category: "สถาปัตยกรรมภายใน", subcategory: "พื้น", unit: "m2", material: 420, labor: 150, quantity: 85 },
  
  // ห้องน้ำ (4 ห้อง)
  { id: "h2b-050", name: "สุขภัณฑ์ชิ้นเดียว เกรดมาตรฐาน", category: "สถาปัตยกรรมภายใน", subcategory: "ห้องน้ำ", unit: "set", material: 4000, labor: 800, quantity: 2 },
  { id: "h2b-051", name: "สุขภัณฑ์ชิ้นเดียว เกรดพรีเมียม", category: "สถาปัตยกรรมภายใน", subcategory: "ห้องน้ำ", unit: "set", material: 6500, labor: 1000, quantity: 2 },
  { id: "h2b-052", name: "กระเบื้องผนัง 30x60 ซม.", category: "สถาปัตยกรรมภายใน", subcategory: "ผนัง", unit: "m2", material: 320, labor: 180, quantity: 85 },
  
  // ไฟฟ้า
  { id: "h2b-060", name: "ตู้ไฟ MDB 20 ช่อง", category: "ระบบ MEP", subcategory: "ไฟฟ้า", unit: "set", material: 5500, labor: 1800, quantity: 1 },
  { id: "h2b-061", name: "จุดโคมไฟภายใน", category: "ระบบ MEP", subcategory: "ไฟฟ้า", unit: "point", material: 400, labor: 250, quantity: 60 },
  { id: "h2b-062", name: "จุดปลั๊กไฟ พร้อมสายและท่อ", category: "ระบบ MEP", subcategory: "ไฟฟ้า", unit: "point", material: 320, labor: 250, quantity: 70 },
  { id: "h2b-063", name: "แอร์บ้าน 18,000 BTU พร้อมติดตั้ง", category: "ระบบ MEP", subcategory: "แอร์", unit: "set", material: 18000, labor: 2500, quantity: 4 },
];

// ==================== ห้องต่างๆ ====================

const bathroom_basic: BOQItem[] = [
  { id: "br-001", name: "สุขภัณฑ์ชิ้นเดียว เกรดมาตรฐาน", category: "สถาปัตยกรรมภายใน", subcategory: "ห้องน้ำ", unit: "set", material: 4000, labor: 800, quantity: 1 },
  { id: "br-002", name: "กระเบื้องผนัง 30x30 ซม.", category: "สถาปัตยกรรมภายใน", subcategory: "ผนัง", unit: "m2", material: 280, labor: 160, quantity: 16 },
  { id: "br-003", name: "กระเบื้องพื้น 30x30 ซม.", category: "สถาปัตยกรรมภายใน", subcategory: "พื้น", unit: "m2", material: 300, labor: 170, quantity: 4 },
  { id: "br-004", name: "กระจกเงา 5 มม. 40x60 ซม.", category: "สถาปัตยกรรมภายใน", subcategory: "ห้องน้ำ", unit: "pcs", material: 220, labor: 120, quantity: 1 },
  { id: "br-005", name: "ก๊อกอ่างล้างหน้า + อ่างล้างหน้า", category: "สถาปัตยกรรมภายใน", subcategory: "ห้องน้ำ", unit: "set", material: 1200, labor: 400, quantity: 1 },
  { id: "br-006", name: "ฝักบัวพร้อมชุดก๊อก", category: "สถาปัตยกรรมภายใน", subcategory: "ห้องน้ำ", unit: "set", material: 800, labor: 350, quantity: 1 },
  { id: "br-007", name: "ชุดอุปกรณ์ห้องน้ำ (ราวแขวน/แปรง)", category: "สถาปัตยกรรมภายใน", subcategory: "ห้องน้ำ", unit: "set", material: 450, labor: 200, quantity: 1 },
];

const kitchen_basic: BOQItem[] = [
  { id: "kt-001", name: "ตู้ครัวบิ้วอิน ล่าง 3 ม.", category: "สถาปัตยกรรมภายใน", subcategory: "ห้องครัว", unit: "m", material: 4500, labor: 1200, quantity: 3 },
  { id: "kt-002", name: "ตู้ครัวบิ้วอิน บน 3 ม.", category: "สถาปัตยกรรมภายใน", subcategory: "ห้องครัว", unit: "m", material: 3200, labor: 900, quantity: 3 },
  { id: "kt-003", name: "เคาน์เตอร์หินแกรนิต 20 มม.", category: "สถาปัตยกรรมภายใน", subcategory: "ห้องครัว", unit: "m", material: 2800, labor: 700, quantity: 3 },
  { id: "kt-004", name: "อ่างล้างจานสแตนเลส 2 หลุม", category: "สถาปัตยกรรมภายใน", subcategory: "ห้องครัว", unit: "set", material: 1200, labor: 350, quantity: 1 },
  { id: "kt-005", name: "ก๊อกผสมซิงก์ แบบคอสูง", category: "สถาปัตยกรรมภายใน", subcategory: "ห้องครัว", unit: "pcs", material: 680, labor: 180, quantity: 1 },
  { id: "kt-006", name: "ฮูดดูดควัน ติดผนัง 90 ซม.", category: "สถาปัตยกรรมภายใน", subcategory: "ห้องครัว", unit: "set", material: 3200, labor: 600, quantity: 1 },
  { id: "kt-007", name: "กระเบื้องผนังครัว 30x60 ซม.", category: "สถาปัตยกรรมภายใน", subcategory: "ผนัง", unit: "m2", material: 320, labor: 180, quantity: 12 },
];

const bathroom_premium: BOQItem[] = [
  { id: "brp-001", name: "สุขภัณฑ์ชิ้นเดียว เกรดพรีเมียม", category: "สถาปัตยกรรมภายใน", subcategory: "ห้องน้ำ", unit: "set", material: 6500, labor: 1000, quantity: 1 },
  { id: "brp-002", name: "กระเบื้องผนัง 30x60 ซม. เกรด A", category: "สถาปัตยกรรมภายใน", subcategory: "ผนัง", unit: "m2", material: 380, labor: 180, quantity: 24 },
  { id: "brp-003", name: "กระเบื้องพื้น 60x60 ซม. เกรด A", category: "สถาปัตยกรรมภายใน", subcategory: "พื้น", unit: "m2", material: 420, labor: 190, quantity: 9 },
  { id: "brp-004", name: "กระจกเงา 5 มม. ทั้งผนัง", category: "สถาปัตยกรรมภายใน", subcategory: "ห้องน้ำ", unit: "m2", material: 450, labor: 250, quantity: 4 },
  { id: "brp-005", name: "ก๊อก + อ่างล้างหน้าเกรดพรีเมียม", category: "สถาปัตยกรรมภายใน", subcategory: "ห้องน้ำ", unit: "set", material: 2500, labor: 600, quantity: 1 },
  { id: "brp-006", name: "ฝักบัว Rain Shower พร้อมก๊อก", category: "สถาปัตยกรรมภายใน", subcategory: "ห้องน้ำ", unit: "set", material: 1800, labor: 500, quantity: 1 },
  { id: "brp-007", name: "ชุดอุปกรณ์ห้องน้ำ แบรนด์เนม", category: "สถาปัตยกรรมภายใน", subcategory: "ห้องน้ำ", unit: "set", material: 850, labor: 300, quantity: 1 },
  { id: "brp-008", name: "กันซึมซีเมนต์พอลิเมอร์ 2K", category: "สถาปัตยกรรมภายนอก", subcategory: "กันซึม", unit: "m2", material: 180, labor: 120, quantity: 9 },
];

const bathroom_master: BOQItem[] = [
  { id: "brm-001", name: "สุขภัณฑ์ชิ้นเดียว เกรดพรีเมียม", category: "สถาปัตยกรรมภายใน", subcategory: "ห้องน้ำ", unit: "set", material: 8500, labor: 1200, quantity: 1 },
  { id: "brm-002", name: "กระเบื้องผนัง 30x60 ซม. นำเข้า", category: "สถาปัตยกรรมภายใน", subcategory: "ผนัง", unit: "m2", material: 520, labor: 200, quantity: 40 },
  { id: "brm-003", name: "กระเบื้องพื้น 60x60 ซม. นำเข้า", category: "สถาปัตยกรรมภายใน", subcategory: "พื้น", unit: "m2", material: 580, labor: 220, quantity: 16 },
  { id: "brm-004", name: "กระจกเงา 5 มม. ทั้งผนัง + ไฟ LED", category: "สถาปัตยกรรมภายใน", subcategory: "ห้องน้ำ", unit: "m2", material: 650, labor: 300, quantity: 6 },
  { id: "brm-005", name: "อ่างอาบน้ำอะคริลิค", category: "สถาปัตยกรรมภายใน", subcategory: "ห้องน้ำ", unit: "set", material: 12000, labor: 2500, quantity: 1 },
  { id: "brm-006", name: "ก๊อก + อ่างล้างหน้า แบรนด์เนม", category: "สถาปัตยกรรมภายใน", subcategory: "ห้องน้ำ", unit: "set", material: 4500, labor: 800, quantity: 1 },
  { id: "brm-007", name: "ฝักบัว Rain Shower + Hand Shower", category: "สถาปัตยกรรมภายใน", subcategory: "ห้องน้ำ", unit: "set", material: 3500, labor: 700, quantity: 1 },
  { id: "brm-008", name: "ชั้นวางของในตัว + ตู้เก็บของ", category: "สถาปัตยกรรมภายใน", subcategory: "ห้องน้ำ", unit: "set", material: 2800, labor: 800, quantity: 1 },
  { id: "brm-009", name: "กันซึมซีเมนต์พอลิเมอร์ 2K", category: "สถาปัตยกรรมภายนอก", subcategory: "กันซึม", unit: "m2", material: 180, labor: 120, quantity: 16 },
];

const kitchen_premium: BOQItem[] = [
  { id: "ktp-001", name: "ตู้ครัวบิ้วอิน ล่าง 4 ม. เกรดพรีเมียม", category: "สถาปัตยกรรมภายใน", subcategory: "ห้องครัว", unit: "m", material: 6500, labor: 1500, quantity: 4 },
  { id: "ktp-002", name: "ตู้ครัวบิ้วอิน บน 4 ม. เกรดพรีเมียม", category: "สถาปัตยกรรมภายใน", subcategory: "ห้องครัว", unit: "m", material: 4800, labor: 1200, quantity: 4 },
  { id: "ktp-003", name: "เคาน์เตอร์หินควอตซ์ 20 มม.", category: "สถาปัตยกรรมภายใน", subcategory: "ห้องครัว", unit: "m", material: 4500, labor: 1000, quantity: 4 },
  { id: "ktp-004", name: "อ่างล้างจานสแตนเลส 2 หลุม นำเข้า", category: "สถาปัตยกรรมภายใน", subcategory: "ห้องครัว", unit: "set", material: 2800, labor: 500, quantity: 1 },
  { id: "ktp-005", name: "ก๊อกผสมซิงก์ แบรนด์เนม", category: "สถาปัตยกรรมภายใน", subcategory: "ห้องครัว", unit: "pcs", material: 1800, labor: 300, quantity: 1 },
  { id: "ktp-006", name: "ฮูดดูดควัน สแตนเลส 90 ซม.", category: "สถาปัตยกรรมภายใน", subcategory: "ห้องครัว", unit: "set", material: 6500, labor: 1000, quantity: 1 },
  { id: "ktp-007", name: "เตาแก๊สบิ้วอิน 3 หัว", category: "สถาปัตยกรรมภายใน", subcategory: "ห้องครัว", unit: "set", material: 8500, labor: 1200, quantity: 1 },
  { id: "ktp-008", name: "กระเบื้องผนังครัว 30x60 ซม. เกรด A", category: "สถาปัตยกรรมภายใน", subcategory: "ผนัง", unit: "m2", material: 420, labor: 200, quantity: 16 },
  { id: "ktp-009", name: "ไอแลนด์ครัว 1.5 ม.", category: "สถาปัตยกรรมภายใน", subcategory: "ห้องครัว", unit: "set", material: 12000, labor: 3000, quantity: 1 },
];

const bedroom_small: BOQItem[] = [
  { id: "bds-001", name: "พื้นลามิเนต 12 มม.", category: "สถาปัตยกรรมภายใน", subcategory: "พื้น", unit: "m2", material: 420, labor: 150, quantity: 9 },
  { id: "bds-002", name: "ทาสีอะครีลิคภายใน 2 เที่ยว", category: "สถาปัตยกรรมภายใน", subcategory: "ทาสี", unit: "m2", material: 45, labor: 35, quantity: 36 },
  { id: "bds-003", name: "ตู้เสื้อผ้าบิ้วอิน 1.8 ม.", category: "สถาปัตยกรรมภายใน", subcategory: "บิ้วอิน", unit: "m", material: 5500, labor: 1500, quantity: 1.8 },
  { id: "bds-004", name: "โต๊ะทำงาน บิ้วอิน 1.2 ม.", category: "สถาปัตยกรรมภายใน", subcategory: "บิ้วอิน", unit: "m", material: 3200, labor: 900, quantity: 1.2 },
  { id: "bds-005", name: "ม่านไม้ 2 ม.", category: "สถาปัตยกรรมภายใน", subcategory: "ผ้าม่าน", unit: "m", material: 450, labor: 150, quantity: 2 },
  { id: "bds-006", name: "จุดโคมไฟ + สวิตช์", category: "ระบบ MEP", subcategory: "ไฟฟ้า", unit: "point", material: 600, labor: 400, quantity: 4 },
];

const bedroom_medium: BOQItem[] = [
  { id: "bdm-001", name: "พื้นลามิเนต 12 มม.", category: "สถาปัตยกรรมภายใน", subcategory: "พื้น", unit: "m2", material: 420, labor: 150, quantity: 16 },
  { id: "bdm-002", name: "ทาสีอะครีลิคภายใน 2 เที่ยว", category: "สถาปัตยกรรมภายใน", subcategory: "ทาสี", unit: "m2", material: 45, labor: 35, quantity: 56 },
  { id: "bdm-003", name: "ตู้เสื้อผ้าบิ้วอิน 2.5 ม.", category: "สถาปัตยกรรมภายใน", subcategory: "บิ้วอิน", unit: "m", material: 5500, labor: 1500, quantity: 2.5 },
  { id: "bdm-004", name: "โต๊ะทำงาน บิ้วอิน 1.5 ม.", category: "สถาปัตยกรรมภายใน", subcategory: "บิ้วอิน", unit: "m", material: 3200, labor: 900, quantity: 1.5 },
  { id: "bdm-005", name: "ชั้นหนังสือ บิ้วอิน 2 ม.", category: "สถาปัตยกรรมภายใน", subcategory: "บิ้วอิน", unit: "m", material: 2800, labor: 800, quantity: 2 },
  { id: "bdm-006", name: "ม่านผ้า 3 ม.", category: "สถาปัตยกรรมภายใน", subcategory: "ผ้าม่าน", unit: "m", material: 650, labor: 200, quantity: 3 },
  { id: "bdm-007", name: "จุดโคมไฟ + สวิตช์", category: "ระบบ MEP", subcategory: "ไฟฟ้า", unit: "point", material: 600, labor: 400, quantity: 6 },
  { id: "bdm-008", name: "แอร์ติดผนัง 12,000 BTU", category: "ระบบ MEP", subcategory: "แอร์", unit: "set", material: 12000, labor: 2000, quantity: 1 },
];

const bedroom_master: BOQItem[] = [
  { id: "bdms-001", name: "พื้นไม้จริง 3/4\\\"", category: "สถาปัตยกรรมภายใน", subcategory: "พื้น", unit: "m2", material: 850, labor: 300, quantity: 30 },
  { id: "bdms-002", name: "ทาสีอะครีลิคภายใน 2 เที่ยว", category: "สถาปัตยกรรมภายใน", subcategory: "ทาสี", unit: "m2", material: 45, labor: 35, quantity: 96 },
  { id: "bdms-003", name: "ตู้เสื้อผ้าบิ้วอิน 3.5 ม.", category: "สถาปัตยกรรมภายใน", subcategory: "บิ้วอิน", unit: "m", material: 6500, labor: 1800, quantity: 3.5 },
  { id: "bdms-004", name: "Walk-in Closet 3x2 ม.", category: "สถาปัตยกรรมภายใน", subcategory: "บิ้วอิน", unit: "set", material: 35000, labor: 8000, quantity: 1 },
  { id: "bdms-005", name: "โต๊ะเครื่องแป้ง บิ้วอิน + กระจกไฟ LED", category: "สถาปัตยกรรมภายใน", subcategory: "บิ้วอิน", unit: "set", material: 8500, labor: 2500, quantity: 1 },
  { id: "bdms-006", name: "ชั้นหนังสือ + ชั้นตกแต่ง", category: "สถาปัตยกรรมภายใน", subcategory: "บิ้วอิน", unit: "set", material: 6500, labor: 1800, quantity: 1 },
  { id: "bdms-007", name: "ม่านผ้า มอเตอร์ไฟฟ้า 4 ม.", category: "สถาปัตยกรรมภายใน", subcategory: "ผ้าม่าน", unit: "m", material: 1200, labor: 400, quantity: 4 },
  { id: "bdms-008", name: "แอร์ติดผนัง 18,000 BTU อินเวอร์เตอร์", category: "ระบบ MEP", subcategory: "แอร์", unit: "set", material: 18000, labor: 2500, quantity: 1 },
  { id: "bdms-009", name: "ระบบไฟอัจฉริยะ + สวิตช์ทัชสกรีน", category: "ระบบ MEP", subcategory: "ไฟฟ้า", unit: "set", material: 12000, labor: 3000, quantity: 1 },
];

const living_room: BOQItem[] = [
  { id: "lr-001", name: "กระเบื้องแกรนิตโต 80x80 ซม.", category: "สถาปัตยกรรมภายใน", subcategory: "พื้น", unit: "m2", material: 520, labor: 220, quantity: 30 },
  { id: "lr-002", name: "ทาสีอะครีลิคภายใน 2 เที่ยว", category: "สถาปัตยกรรมภายใน", subcategory: "ทาสี", unit: "m2", material: 45, labor: 35, quantity: 96 },
  { id: "lr-003", name: "ฝ้ายิปซัม 9 มม. โครงซีลาย", category: "สถาปัตยกรรมภายใน", subcategory: "ฝ้า", unit: "m2", material: 260, labor: 100, quantity: 30 },
  { id: "lr-004", name: "ชุดวางทีวี บิ้วอิน 3 ม.", category: "สถาปัตยกรรมภายใน", subcategory: "บิ้วอิน", unit: "m", material: 6500, labor: 1800, quantity: 3 },
  { id: "lr-005", name: "ชั้นตกแต่ง + ชั้นวางของ", category: "สถาปัตยกรรมภายใน", subcategory: "บิ้วอิน", unit: "set", material: 4500, labor: 1200, quantity: 1 },
  { id: "lr-006", name: "ม่านผ้า มอเตอร์ไฟฟ้า 5 ม.", category: "สถาปัตยกรรมภายใน", subcategory: "ผ้าม่าน", unit: "m", material: 1200, labor: 400, quantity: 5 },
  { id: "lr-007", name: "จุดโคมไฟ + ดาวน์ไลท์", category: "ระบบ MEP", subcategory: "ไฟฟ้า", unit: "point", material: 600, labor: 400, quantity: 12 },
  { id: "lr-008", name: "แอร์ติดผนัง 24,000 BTU อินเวอร์เตอร์", category: "ระบบ MEP", subcategory: "แอร์", unit: "set", material: 22000, labor: 3000, quantity: 1 },
];

const balcony: BOQItem[] = [
  { id: "bal-001", name: "กระเบื้องปูพื้น 60x60 ซม. กันลื่น", category: "สถาปัตยกรรมภายใน", subcategory: "พื้น", unit: "m2", material: 320, labor: 180, quantity: 8 },
  { id: "bal-002", name: "ราวกันตก สแตนเลส 316", category: "สถาปัตยกรรมภายนอก", subcategory: "ราวกันตก", unit: "m", material: 1800, labor: 600, quantity: 6 },
  { id: "bal-003", name: "มุ้งลวดสแตนเลส", category: "สถาปัตยกรรมภายนอก", subcategory: "มุ้งลวด", unit: "m2", material: 450, labor: 200, quantity: 8 },
  { id: "bal-004", name: "ชั้นวาง ตู้เก็บของ กันน้ำ", category: "สถาปัตยกรรมภายใน", subcategory: "บิ้วอิน", unit: "m", material: 3500, labor: 1000, quantity: 2 },
  { id: "bal-005", name: "จุดปลั๊กไฟกันน้ำ", category: "ระบบ MEP", subcategory: "ไฟฟ้า", unit: "point", material: 450, labor: 300, quantity: 2 },
  { id: "bal-006", name: "โคมไฟติดผนังกันน้ำ", category: "ระบบ MEP", subcategory: "ไฟฟ้า", unit: "pcs", material: 650, labor: 250, quantity: 2 },
];

// ==================== รีโนเวท ====================

// ==================== ห้องทานข้าว ====================

const dining_room: BOQItem[] = [
  // งานผนัง
  { id: "din-001", name: "ฉาบปูนผนังเรียบ 2 หน้า", category: "สถาปัตยกรรมภายใน", subcategory: "ปูน", unit: "m2", material: 35, labor: 45, quantity: 36 },
  { id: "din-002", name: "ทาสีอะครีลิคภายใน 2 เที่ยว", category: "สถาปัตยกรรมภายใน", subcategory: "ทาสี", unit: "m2", material: 45, labor: 35, quantity: 36 },
  
  // พื้น
  { id: "din-010", name: "พื้นกระเบื้อง 60x60 ซม.", category: "สถาปัตยกรรมภายใน", subcategory: "พื้น", unit: "m2", material: 380, labor: 180, quantity: 12 },
  { id: "din-011", name: "บัวพื้น PVC", category: "สถาปัตยกรรมภายใน", subcategory: "บัว", unit: "m", material: 60, labor: 30, quantity: 14 },
  
  // ฝ้า
  { id: "din-020", name: "ฝ้าฉาบเรียบ กันชื้น 9 มม.", category: "สถาปัตยกรรมภายใน", subcategory: "ฝ้า", unit: "m2", material: 320, labor: 180, quantity: 12 },
  
  // บิ้วอิน (ตู้โชว์/ตู้กับข้าว)
  { id: "din-030", name: "ตู้โชว์บิ้วอิน เมลามีน 2 ม.", category: "สถาปัตยกรรมภายใน", subcategory: "บิ้วอิน", unit: "m", material: 4500, labor: 1200, quantity: 2 },
  { id: "din-031", name: "ชั้นวางกระจก + ไฟ LED", category: "สถาปัตยกรรมภายใน", subcategory: "บิ้วอิน", unit: "set", material: 2200, labor: 600, quantity: 1 },
  
  // ไฟฟ้า
  { id: "din-040", name: "โคมดาวน์ไลท์ LED 9W", category: "ระบบ MEP", subcategory: "ไฟฟ้า", unit: "pcs", material: 240, labor: 180, quantity: 4 },
  { id: "din-041", name: "จุดปลั๊กไฟ พร้อมสายและท่อ", category: "ระบบ MEP", subcategory: "ไฟฟ้า", unit: "point", material: 320, labor: 250, quantity: 3 },
  { id: "din-042", name: "จุดสวิตช์ไฟ 1 ทาง", category: "ระบบ MEP", subcategory: "ไฟฟ้า", unit: "point", material: 200, labor: 180, quantity: 2 },
  
  // แอร์
  { id: "din-050", name: "ติดตั้งแอร์ Split 12,000 BTU (ไม่รวมเครื่อง)", category: "ระบบ MEP", subcategory: "แอร์", unit: "set", material: 0, labor: 2500, quantity: 1 },
  { id: "din-051", name: "ท่อทองแดงชุดแอร์ 1/4-1/2\"", category: "ระบบ MEP", subcategory: "แอร์", unit: "m", material: 180, labor: 60, quantity: 5 },
];

// ==================== ห้องแต่งตัว (Walk-in Closet) ====================

const dressing_room: BOQItem[] = [
  // งานผนัง
  { id: "drs-001", name: "ฉาบปูนผนังเรียบ 2 หน้า", category: "สถาปัตยกรรมภายใน", subcategory: "ปูน", unit: "m2", material: 35, labor: 45, quantity: 24 },
  { id: "drs-002", name: "ทาสีอะครีลิคภายใน 2 เที่ยว", category: "สถาปัตยกรรมภายใน", subcategory: "ทาสี", unit: "m2", material: 45, labor: 35, quantity: 24 },
  
  // พื้น
  { id: "drs-010", name: "พื้นไม้ลามิเนต 12 มม.", category: "สถาปัตยกรรมภายใน", subcategory: "พื้น", unit: "m2", material: 420, labor: 150, quantity: 6 },
  { id: "drs-011", name: "บัวพื้น PVC", category: "สถาปัตยกรรมภายใน", subcategory: "บัว", unit: "m", material: 60, labor: 30, quantity: 10 },
  
  // บิ้วอิน Walk-in Closet
  { id: "drs-020", name: "ตู้เสื้อผ้าบิ้วอิน Walk-in เมลามีน", category: "สถาปัตยกรรมภายใน", subcategory: "บิ้วอิน", unit: "m2", material: 2500, labor: 800, quantity: 10 },
  { id: "drs-021", name: "ชั้นวาง + ราวแขวนเสื้อ 3 ด้าน", category: "สถาปัตยกรรมภายใน", subcategory: "บิ้วอิน", unit: "set", material: 6500, labor: 1800, quantity: 1 },
  { id: "drs-022", name: "ลิ้นชักเก็บเครื่องประดับ 6 ลิ้นชัก", category: "สถาปัตยกรรมภายใน", subcategory: "บิ้วอิน", unit: "set", material: 4500, labor: 1200, quantity: 1 },
  { id: "drs-023", name: "บานพับ Soft-close (แพ็ก 2 ชิ้น)", category: "สถาปัตยกรรมภายใน", subcategory: "ฮาร์ดแวร์", unit: "pack", material: 240, labor: 80, quantity: 4 },
  { id: "drs-024", name: "ราง Soft-close ตู้บานเลื่อน", category: "สถาปัตยกรรมภายใน", subcategory: "ฮาร์ดแวร์", unit: "set", material: 560, labor: 220, quantity: 1 },
  
  // กระจก
  { id: "drs-030", name: "กระจกเงาเต็มตัว พร้อมไฟ LED", category: "สถาปัตยกรรมภายใน", subcategory: "กระจก", unit: "m2", material: 1200, labor: 400, quantity: 3 },
  
  // ไฟฟ้า
  { id: "drs-040", name: "โคมดาวน์ไลท์ LED 9W", category: "ระบบ MEP", subcategory: "ไฟฟ้า", unit: "pcs", material: 240, labor: 180, quantity: 4 },
  { id: "drs-041", name: "ไฟเส้น LED ใต้ตู้ + ไดรเวอร์", category: "สถาปัตยกรรมภายใน", subcategory: "ไฟ", unit: "m", material: 200, labor: 100, quantity: 4 },
  { id: "drs-042", name: "จุดปลั๊กไฟ พร้อมสายและท่อ", category: "ระบบ MEP", subcategory: "ไฟฟ้า", unit: "point", material: 320, labor: 250, quantity: 2 },
  { id: "drs-043", name: "จุดสวิตช์ไฟ 1 ทาง", category: "ระบบ MEP", subcategory: "ไฟฟ้า", unit: "point", material: 200, labor: 180, quantity: 2 },
  
  // ประตู
  { id: "drs-050", name: "ประตูภายใน HDF กันชื้น + มือจับ", category: "สถาปัตยกรรมภายใน", subcategory: "ประตู", unit: "pcs", material: 2000, labor: 720, quantity: 1 },
];

// ==================== ห้องซักล้าง (Laundry Room) ====================

const laundry_room: BOQItem[] = [
  // งานผนัง
  { id: "lau-001", name: "ฉาบปูนผนังเรียบ 2 หน้า", category: "สถาปัตยกรรมภายใน", subcategory: "ปูน", unit: "m2", material: 35, labor: 45, quantity: 20 },
  { id: "lau-002", name: "ทาสีอะครีลิคภายใน 2 เที่ยว", category: "สถาปัตยกรรมภายใน", subcategory: "ทาสี", unit: "m2", material: 45, labor: 35, quantity: 20 },
  
  // กันซึม + กระเบื้อง
  { id: "lau-010", name: "กันซึมพื้น/ผนังห้องน้ำ 2 ชั้น", category: "สถาปัตยกรรมภายใน", subcategory: "กันซึม", unit: "m2", material: 180, labor: 120, quantity: 4 },
  { id: "lau-011", name: "กระเบื้องพื้นห้องน้ำ 12x12 นิ้ว กันลื่น", category: "สถาปัตยกรรมภายใน", subcategory: "กระเบื้อง", unit: "m2", material: 350, labor: 180, quantity: 3 },
  { id: "lau-012", name: "กระเบื้องผนัง 10x10 นิ้ว", category: "สถาปัตยกรรมภายใน", subcategory: "กระเบื้อง", unit: "m2", material: 320, labor: 180, quantity: 5 },
  
  // บิ้วอิน (ตู้เก็บของ)
  { id: "lau-020", name: "ตู้ครัวล่างโครงไม้อัด กรุเมลามีน", category: "สถาปัตยกรรมภายใน", subcategory: "ห้องครัว", unit: "m", material: 4500, labor: 1200, quantity: 1.5 },
  { id: "lau-021", name: "ท็อปครัวหินแกรนิต 2 ซม.", category: "สถาปัตยกรรมภายใน", subcategory: "ห้องครัว", unit: "m2", material: 2800, labor: 700, quantity: 0.5 },
  
  // ซิงค์และอุปกรณ์
  { id: "lau-030", name: "ติดตั้งอ่างล้างหน้าแขวน/วาง Top + S-trap", category: "ระบบ MEP", subcategory: "ประปา", unit: "set", material: 400, labor: 250, quantity: 1 },
  { id: "lau-031", name: "ติดตั้งก๊อกผสมซิงค์", category: "ระบบ MEP", subcategory: "ประปา", unit: "pcs", material: 180, labor: 70, quantity: 1 },
  
  // ระบบประปา
  { id: "lau-040", name: "ท่อ PVC 1\" พร้อมติดตั้ง", category: "ระบบ MEP", subcategory: "ประปา", unit: "m", material: 40, labor: 30, quantity: 4 },
  { id: "lau-041", name: "จุดน้ำเย็น (วาล์ว+เดินท่อถึงจุด)", category: "ระบบ MEP", subcategory: "ประปา", unit: "pt", material: 200, labor: 130, quantity: 2 },
  { id: "lau-042", name: "จุดท่อน้ำทิ้ง 2\"", category: "ระบบ MEP", subcategory: "ประปา", unit: "pt", material: 150, labor: 70, quantity: 2 },
  { id: "lau-043", name: "ตะแกรงกันกลิ่นสแตนเลส 4\"", category: "ระบบ MEP", subcategory: "ประปา", unit: "pcs", material: 240, labor: 60, quantity: 1 },
  
  // ไฟฟ้า
  { id: "lau-050", name: "โคมดาวน์ไลท์ LED 9W", category: "ระบบ MEP", subcategory: "ไฟฟ้า", unit: "pcs", material: 240, labor: 180, quantity: 2 },
  { id: "lau-051", name: "จุดปลั๊กไฟ พร้อมสายและท่อ", category: "ระบบ MEP", subcategory: "ไฟฟ้า", unit: "point", material: 320, labor: 250, quantity: 2 },
  { id: "lau-052", name: "จุดสวิตช์ไฟ 1 ทาง", category: "ระบบ MEP", subcategory: "ไฟฟ้า", unit: "point", material: 200, labor: 180, quantity: 1 },
  { id: "lau-053", name: "พัดลมระบายอากาศ 8 นิ้ว ติดตั้ง", category: "ระบบ MEP", subcategory: "ระบายอากาศ", unit: "set", material: 450, labor: 200, quantity: 1 },
  
  // ประตู
  { id: "lau-060", name: "ประตูภายใน HDF กันชื้น + มือจับ", category: "สถาปัตยกรรมภายใน", subcategory: "ประตู", unit: "pcs", material: 2000, labor: 720, quantity: 1 },
];

const bathroom_renovation: BOQItem[] = [
  { id: "ren-br-001", name: "รื้อถอนงานเดิม (ห้องน้ำ)", category: "งานเตรียมพื้นที่", subcategory: "รื้อถอน", unit: "job", material: 0, labor: 2500, quantity: 1 },
  { id: "ren-br-002", name: "สุขภัณฑ์ชิ้นเดียว เกรดพรีเมียม", category: "สถาปัตยกรรมภายใน", subcategory: "ห้องน้ำ", unit: "set", material: 6500, labor: 1000, quantity: 1 },
  { id: "ren-br-003", name: "กระเบื้องผนัง 30x60 ซม.", category: "สถาปัตยกรรมภายใน", subcategory: "ผนัง", unit: "m2", material: 350, labor: 180, quantity: 20 },
  { id: "ren-br-004", name: "กระเบื้องพื้น 60x60 ซม.", category: "สถาปัตยกรรมภายใน", subcategory: "พื้น", unit: "m2", material: 380, labor: 180, quantity: 6 },
  { id: "ren-br-005", name: "กระจกเงา 5 มม. ทั้งผนัง", category: "สถาปัตยกรรมภายใน", subcategory: "ห้องน้ำ", unit: "m2", material: 450, labor: 250, quantity: 3 },
  { id: "ren-br-006", name: "ก๊อก + อ่างล้างหน้าเกรดพรีเมียม", category: "สถาปัตยกรรมภายใน", subcategory: "ห้องน้ำ", unit: "set", material: 2500, labor: 600, quantity: 1 },
  { id: "ren-br-007", name: "ฝักบัว Rain Shower พร้อมก๊อก", category: "สถาปัตยกรรมภายใน", subcategory: "ห้องน้ำ", unit: "set", material: 1800, labor: 500, quantity: 1 },
  { id: "ren-br-008", name: "กันซึมซีเมนต์พอลิเมอร์ 2K", category: "สถาปัตยกรรมภายนอก", subcategory: "กันซึม", unit: "m2", material: 180, labor: 120, quantity: 26 },
];

const kitchen_renovation: BOQItem[] = [
  { id: "ren-kt-001", name: "รื้อถอนงานเดิม (ห้องครัว)", category: "งานเตรียมพื้นที่", subcategory: "รื้อถอน", unit: "job", material: 0, labor: 3500, quantity: 1 },
  { id: "ren-kt-002", name: "ตู้ครัวบิ้วอิน ล่าง 3 ม.", category: "สถาปัตยกรรมภายใน", subcategory: "ห้องครัว", unit: "m", material: 5500, labor: 1500, quantity: 3 },
  { id: "ren-kt-003", name: "ตู้ครัวบิ้วอิน บน 3 ม.", category: "สถาปัตยกรรมภายใน", subcategory: "ห้องครัว", unit: "m", material: 3800, labor: 1000, quantity: 3 },
  { id: "ren-kt-004", name: "เคาน์เตอร์หินควอตซ์ 20 มม.", category: "สถาปัตยกรรมภายใน", subcategory: "ห้องครัว", unit: "m", material: 3800, labor: 900, quantity: 3 },
  { id: "ren-kt-005", name: "กระเบื้องผนัง 30x60 ซม.", category: "สถาปัตยกรรมภายใน", subcategory: "ผนัง", unit: "m2", material: 350, labor: 180, quantity: 15 },
  { id: "ren-kt-006", name: "กระเบื้องพื้น 60x60 ซม.", category: "สถาปัตยกรรมภายใน", subcategory: "พื้น", unit: "m2", material: 380, labor: 180, quantity: 12 },
  { id: "ren-kt-007", name: "อ่างล้างจานสแตนเลส 2 หลุม", category: "สถาปัตยกรรมภายใน", subcategory: "ห้องครัว", unit: "set", material: 2500, labor: 600, quantity: 1 },
  { id: "ren-kt-008", name: "ก๊อกผสมเคาน์เตอร์", category: "สถาปัตยกรรมภายใน", subcategory: "ห้องครัว", unit: "pcs", material: 850, labor: 200, quantity: 1 },
  { id: "ren-kt-009", name: "ฮูดดูดควันสแตนเลส", category: "งานครัว - ระบบดูดควัน", subcategory: "ฮูด", unit: "set", material: 3500, labor: 900, quantity: 1 },
];

const bedroom_renovation: BOQItem[] = [
  { id: "ren-bd-001", name: "รื้อถอนงานเดิม (ห้องนอน)", category: "งานเตรียมพื้นที่", subcategory: "รื้อถอน", unit: "job", material: 0, labor: 2000, quantity: 1 },
  { id: "ren-bd-002", name: "พื้นไม้ลามิเนต 12 มม.", category: "สถาปัตยกรรมภายใน", subcategory: "พื้น", unit: "m2", material: 420, labor: 150, quantity: 16 },
  { id: "ren-bd-003", name: "ทาสีอะครีลิคภายใน 2 เที่ยว", category: "สถาปัตยกรรมภายใน", subcategory: "ทาสี", unit: "m2", material: 45, labor: 35, quantity: 48 },
  { id: "ren-bd-004", name: "ตู้เสื้อผ้าบิ้วอิน 3 ม.", category: "สถาปัตยกรรมภายใน", subcategory: "บิ้วอิน", unit: "m", material: 6000, labor: 1600, quantity: 3 },
  { id: "ren-bd-005", name: "โต๊ะทำงาน บิ้วอิน 1.8 ม.", category: "สถาปัตยกรรมภายใน", subcategory: "บิ้วอิน", unit: "m", material: 3500, labor: 1000, quantity: 1.8 },
  { id: "ren-bd-006", name: "ชั้นหนังสือบิ้วอิน 2 ม.", category: "สถาปัตยกรรมภายใน", subcategory: "บิ้วอิน", unit: "m", material: 3500, labor: 1000, quantity: 2 },
  { id: "ren-bd-007", name: "ม่านผ้า พร้อมราง 3 ม.", category: "สถาปัตยกรรมภายใน", subcategory: "ผ้าม่าน", unit: "m", material: 650, labor: 200, quantity: 3 },
  { id: "ren-bd-008", name: "จุดไฟฟ้า-สวิตช์ใหม่", category: "ระบบ MEP", subcategory: "ไฟฟ้า", unit: "point", material: 400, labor: 250, quantity: 6 },
];

const livingroom_renovation: BOQItem[] = [
  { id: "ren-lr-001", name: "รื้อถอนงานเดิม (ห้องนั่งเล่น)", category: "งานเตรียมพื้นที่", subcategory: "รื้อถอน", unit: "job", material: 0, labor: 2500, quantity: 1 },
  { id: "ren-lr-002", name: "กระเบื้องแกรนิตโต 80x80 ซม.", category: "สถาปัตยกรรมภายใน", subcategory: "พื้น", unit: "m2", material: 520, labor: 220, quantity: 30 },
  { id: "ren-lr-003", name: "ทาสีอะครีลิคภายใน 2 เที่ยว", category: "สถาปัตยกรรมภายใน", subcategory: "ทาสี", unit: "m2", material: 45, labor: 35, quantity: 96 },
  { id: "ren-lr-004", name: "ฝ้ายิปซัม 9 มม. โครงซีลาย", category: "สถาปัตยกรรมภายใน", subcategory: "ฝ้า", unit: "m2", material: 260, labor: 100, quantity: 30 },
  { id: "ren-lr-005", name: "ชุดวางทีวี บิ้วอิน 3.5 ม.", category: "สถาปัตยกรรมภายใน", subcategory: "บิ้วอิน", unit: "m", material: 6500, labor: 1800, quantity: 3.5 },
  { id: "ren-lr-006", name: "ชั้นตกแต่ง บิ้วอิน", category: "สถาปัตยกรรมภายใน", subcategory: "บิ้วอิน", unit: "set", material: 4500, labor: 1200, quantity: 1 },
  { id: "ren-lr-007", name: "ม่านผ้า มอเตอร์ไฟฟ้า 5 ม.", category: "สถาปัตยกรรมภายใน", subcategory: "ผ้าม่าน", unit: "m", material: 1200, labor: 400, quantity: 5 },
  { id: "ren-lr-008", name: "จุดไฟฟ้าใหม่ + ดาวน์ไลท์", category: "ระบบ MEP", subcategory: "ไฟฟ้า", unit: "point", material: 600, labor: 400, quantity: 12 },
];

const whole_house_renovation: BOQItem[] = [
  { id: "ren-wh-001", name: "รื้อถอนงานเดิมทั้งหมด", category: "งานเตรียมพื้นที่", subcategory: "รื้อถอน", unit: "job", material: 0, labor: 15000, quantity: 1 },
  { id: "ren-wh-002", name: "ทาสีทั้งภายนอก+ภายใน 100 ตร.ม.", category: "สถาปัตยกรรมภายใน", subcategory: "ทาสี", unit: "m2", material: 50, labor: 40, quantity: 400 },
  { id: "ren-wh-003", name: "พื้นกระเบื้อง-ไม้ลามิเนต", category: "สถาปัตยกรรมภายใน", subcategory: "พื้น", unit: "m2", material: 400, labor: 180, quantity: 80 },
  { id: "ren-wh-004", name: "ปรับปรุงห้องน้ำ 2 ห้อง", category: "สถาปัตยกรรมภายใน", subcategory: "ห้องน้ำ", unit: "set", material: 35000, labor: 12000, quantity: 2 },
  { id: "ren-wh-005", name: "ปรับปรุงห้องครัว", category: "สถาปัตยกรรมภายใน", subcategory: "ห้องครัว", unit: "set", material: 45000, labor: 15000, quantity: 1 },
  { id: "ren-wh-006", name: "ประตู-หน้าต่างใหม่", category: "สถาปัตยกรรมภายใน", subcategory: "ประตู", unit: "set", material: 25000, labor: 8000, quantity: 1 },
  { id: "ren-wh-007", name: "ระบบไฟฟ้าใหม่ทั้งหมด", category: "ระบบ MEP", subcategory: "ไฟฟ้า", unit: "job", material: 35000, labor: 18000, quantity: 1 },
  { id: "ren-wh-008", name: "ระบบประปาใหม่", category: "ระบบ MEP", subcategory: "ประปา", unit: "job", material: 15000, labor: 8000, quantity: 1 },
];

// ==================== บ้านเดี่ยว 3 ชั้น ====================

const house_3floor_250: BOQItem[] = [
  // โครงสร้าง
  { id: "h3-001", name: "คอนกรีตผสมเสร็จ 210 ksc", category: "โครงสร้าง", subcategory: "คอนกรีต", unit: "m3", material: 2384, labor: 0, quantity: 45 },
  { id: "h3-002", name: "เหล็กเส้น SD40 Ø12-16 มม.", category: "โครงสร้าง", subcategory: "เหล็กเส้น", unit: "kg", material: 21, labor: 5.5, quantity: 5500 },
  { id: "h3-003", name: "ผนังอิฐมอญ ก่อ+ฉาบ", category: "โครงสร้าง", subcategory: "ก่ออิฐ", unit: "m2", material: 260, labor: 140, quantity: 700 },
  
  // หลังคา
  { id: "h3-010", name: "มุงแผ่นเมทัลชีท PU 25 มม.", category: "สถาปัตยกรรมภายนอก", subcategory: "หลังคา", unit: "m2", material: 320, labor: 180, quantity: 100 },
  { id: "h3-011", name: "ฉนวน PE ใต้หลังคา", category: "สถาปัตยกรรมภายนอก", subcategory: "ฉนวน", unit: "m2", material: 250, labor: 50, quantity: 100 },
  
  // ประตู-หน้าต่าง
  { id: "h3-020", name: "ประตู-หน้าต่าง UPVC", category: "สถาปัตยกรรมภายนอก", subcategory: "ประตู", unit: "set", material: 85000, labor: 12000, quantity: 1 },
  
  // พื้น-ทาสี
  { id: "h3-030", name: "ทาสีอะครีลิคภายนอก", category: "สถาปัตยกรรมภายนอก", subcategory: "ทาสี", unit: "m2", material: 55, labor: 45, quantity: 600 },
  { id: "h3-031", name: "ทาสีอะครีลิคภายใน", category: "สถาปัตยกรรมภายใน", subcategory: "ทาสี", unit: "m2", material: 45, labor: 35, quantity: 700 },
  { id: "h3-040", name: "กระเบื้อง+พื้นไม้ลามิเนต", category: "สถาปัตยกรรมภายใน", subcategory: "พื้น", unit: "m2", material: 400, labor: 180, quantity: 150 },
  
  // ห้องน้ำ 4 ห้อง
  { id: "h3-050", name: "สุขภัณฑ์ชุด พร้อมติดตั้ง", category: "สถาปัตยกรรมภายใน", subcategory: "ห้องน้ำ", unit: "set", material: 5000, labor: 900, quantity: 4 },
  { id: "h3-051", name: "กระเบื้องห้องน้ำ", category: "สถาปัตยกรรมภายใน", subcategory: "ผนัง", unit: "m2", material: 330, labor: 180, quantity: 80 },
  
  // บันได 2 ชุด
  { id: "h3-060", name: "บันไดคอนกรีต+หินอ่อน", category: "โครงสร้าง", subcategory: "บันได", unit: "m2", material: 850, labor: 450, quantity: 30 },
  { id: "h3-061", name: "ราวบันไดสแตนเลส", category: "โครงสร้าง", subcategory: "บันได", unit: "m", material: 850, labor: 350, quantity: 24 },
  
  // ไฟฟ้า
  { id: "h3-070", name: "ตู้ไฟ MDB 20 ช่อง", category: "ระบบ MEP", subcategory: "ไฟฟ้า", unit: "set", material: 5500, labor: 1800, quantity: 1 },
  { id: "h3-071", name: "จุดไฟฟ้า-ปลั๊ก-สวิตช์", category: "ระบบ MEP", subcategory: "ไฟฟ้า", unit: "point", material: 360, labor: 250, quantity: 80 },
  
  // ประปา
  { id: "h3-080", name: "ระบบประปาทั้งหมด", category: "ระบบ MEP", subcategory: "ประปา", unit: "job", material: 25000, labor: 12000, quantity: 1 },
];

// ==================== ตึกพาณิชย์ ====================

const shophouse_2floor: BOQItem[] = [
  // โครงสร้าง
  { id: "sh2-001", name: "คอนกรีตผสมเสร็จ 210 ksc", category: "โครงสร้าง", subcategory: "คอนกรีต", unit: "m3", material: 2384, labor: 0, quantity: 30 },
  { id: "sh2-002", name: "เหล็กเส้น SD40 Ø12-16 มม.", category: "โครงสร้าง", subcategory: "เหล็กเส้น", unit: "kg", material: 21, labor: 5.5, quantity: 3500 },
  { id: "sh2-003", name: "ผนังอิฐมอญ ก่อ+ฉาบ", category: "โครงสร้าง", subcategory: "ก่ออิฐ", unit: "m2", material: 260, labor: 140, quantity: 450 },
  
  // หลังคา
  { id: "sh2-010", name: "มุงกระเบื้องลอนคู่ กันร้อน", category: "สถาปัตยกรรมภายนอก", subcategory: "หลังคา", unit: "m2", material: 180, labor: 120, quantity: 85 },
  
  // บันได
  { id: "sh2-020", name: "บันไดคอนกรีต+กระเบื้อง", category: "โครงสร้าง", subcategory: "บันได", unit: "m2", material: 750, labor: 400, quantity: 15 },
  { id: "sh2-021", name: "ราวบันไดเหล็ก ทาสี", category: "โครงสร้าง", subcategory: "บันได", unit: "m", material: 650, labor: 280, quantity: 12 },
  
  // ชั้น 1 - พาณิชย์
  { id: "sh2-030", name: "พื้นกระเบื้อง 60x60 ซม. ชั้น 1", category: "สถาปัตยกรรมภายใน", subcategory: "พื้น", unit: "m2", material: 380, labor: 180, quantity: 80 },
  { id: "sh2-031", name: "ประตูหน้าร้าน กระจก+อลูมิเนียม", category: "สถาปัตยกรรมภายนอก", subcategory: "ประตู", unit: "set", material: 25000, labor: 5000, quantity: 1 },
  { id: "sh2-032", name: "กระจกโชว์หน้าร้าน", category: "สถาปัตยกรรมภายนอก", subcategory: "กระจก", unit: "m2", material: 850, labor: 350, quantity: 20 },
  
  // ชั้น 2 - ที่อยู่อาศัย
  { id: "sh2-040", name: "พื้นไม้ลามิเนต ชั้น 2", category: "สถาปัตยกรรมภายใน", subcategory: "พื้น", unit: "m2", material: 420, labor: 150, quantity: 80 },
  { id: "sh2-041", name: "ห้องนอน 2 ห้อง พร้อมตู้บิ้วอิน", category: "สถาปัตยกรรมภายใน", subcategory: "บิ้วอิน", unit: "set", material: 35000, labor: 9000, quantity: 2 },
  { id: "sh2-042", name: "ห้องน้ำ 2 ห้อง พร้อมสุขภัณฑ์", category: "สถาปัตยกรรมภายใน", subcategory: "ห้องน้ำ", unit: "set", material: 25000, labor: 8000, quantity: 2 },
  
  // ทาสี
  { id: "sh2-050", name: "ทาสีภายนอก 2 เที่ยว", category: "สถาปัตยกรรมภายนอก", subcategory: "ทาสี", unit: "m2", material: 55, labor: 45, quantity: 380 },
  { id: "sh2-051", name: "ทาสีภายใน 2 เที่ยว", category: "สถาปัตยกรรมภายใน", subcategory: "ทาสี", unit: "m2", material: 45, labor: 35, quantity: 450 },
  
  // ไฟฟ้า
  { id: "sh2-060", name: "ตู้ไฟ MDB 3 เฟส 16 ช่อง", category: "ระบบ MEP", subcategory: "ไฟฟ้า", unit: "set", material: 8500, labor: 2500, quantity: 1 },
  { id: "sh2-061", name: "จุดไฟฟ้า ชั้น 1 (พาณิชย์)", category: "ระบบ MEP", subcategory: "ไฟฟ้า", unit: "point", material: 400, labor: 280, quantity: 25 },
  { id: "sh2-062", name: "จุดไฟฟ้า ชั้น 2 (ที่อยู่อาศัย)", category: "ระบบ MEP", subcategory: "ไฟฟ้า", unit: "point", material: 360, labor: 250, quantity: 30 },
  
  // ประปา
  { id: "sh2-070", name: "ระบบประปา 2 ชั้น", category: "ระบบ MEP", subcategory: "ประปา", unit: "job", material: 18000, labor: 9000, quantity: 1 },
  
  // แอร์
  { id: "sh2-080", name: "ติดตั้งแอร์ 3 เครื่อง (ไม่รวมเครื่อง)", category: "ระบบ MEP", subcategory: "แอร์", unit: "set", material: 0, labor: 7500, quantity: 3 },
];

const shophouse_3floor: BOQItem[] = [
  // โครงสร้าง
  { id: "sh3-001", name: "คอนกรีตผสมเสร็จ 210 ksc", category: "โครงสร้าง", subcategory: "คอนกรีต", unit: "m3", material: 2384, labor: 0, quantity: 42 },
  { id: "sh3-002", name: "เหล็กเส้น SD40 Ø12-16 มม.", category: "โครงสร้าง", subcategory: "เหล็กเส้น", unit: "kg", material: 21, labor: 5.5, quantity: 5000 },
  { id: "sh3-003", name: "ผนังอิฐมอญ ก่อ+ฉาบ", category: "โครงสร้าง", subcategory: "ก่ออิฐ", unit: "m2", material: 260, labor: 140, quantity: 680 },
  
  // หลังคา
  { id: "sh3-010", name: "มุงกระเบื้องลอนคู่ กันร้อน", category: "สถาปัตยกรรมภายนอก", subcategory: "หลังคา", unit: "m2", material: 180, labor: 120, quantity: 85 },
  
  // บันได 2 ชุด
  { id: "sh3-020", name: "บันไดคอนกรีต+กระเบื้อง", category: "โครงสร้าง", subcategory: "บันได", unit: "m2", material: 750, labor: 400, quantity: 30 },
  { id: "sh3-021", name: "ราวบันไดเหล็ก ทาสี", category: "โครงสร้าง", subcategory: "บันได", unit: "m", material: 650, labor: 280, quantity: 24 },
  
  // ชั้น 1 - พาณิชย์
  { id: "sh3-030", name: "พื้นกระเบื้อง 60x60 ซม. ชั้น 1", category: "สถาปัตยกรรมภายใน", subcategory: "พื้น", unit: "m2", material: 380, labor: 180, quantity: 80 },
  { id: "sh3-031", name: "ประตูหน้าร้าน กระจก+อลูมิเนียม", category: "สถาปัตยกรรมภายนอก", subcategory: "ประตู", unit: "set", material: 25000, labor: 5000, quantity: 1 },
  { id: "sh3-032", name: "กระจกโชว์หน้าร้าน", category: "สถาปัตยกรรมภายนอก", subcategory: "กระจก", unit: "m2", material: 850, labor: 350, quantity: 20 },
  
  // ชั้น 2-3 - ที่อยู่อาศัย
  { id: "sh3-040", name: "พื้นไม้ลามิเนต ชั้น 2-3", category: "สถาปัตยกรรมภายใน", subcategory: "พื้น", unit: "m2", material: 420, labor: 150, quantity: 160 },
  { id: "sh3-041", name: "ห้องนอน 3 ห้อง พร้อมตู้บิ้วอิน", category: "สถาปัตยกรรมภายใน", subcategory: "บิ้วอิน", unit: "set", material: 35000, labor: 9000, quantity: 3 },
  { id: "sh3-042", name: "ห้องน้ำ 3 ห้อง พร้อมสุขภัณฑ์", category: "สถาปัตยกรรมภายใน", subcategory: "ห้องน้ำ", unit: "set", material: 25000, labor: 8000, quantity: 3 },
  
  // ทาสี
  { id: "sh3-050", name: "ทาสีภายนอก 2 เที่ยว", category: "สถาปัตยกรรมภายนอก", subcategory: "ทาสี", unit: "m2", material: 55, labor: 45, quantity: 570 },
  { id: "sh3-051", name: "ทาสีภายใน 2 เที่ยว", category: "สถาปัตยกรรมภายใน", subcategory: "ทาสี", unit: "m2", material: 45, labor: 35, quantity: 680 },
  
  // ไฟฟ้า
  { id: "sh3-060", name: "ตู้ไฟ MDB 3 เฟส 20 ช่อง", category: "ระบบ MEP", subcategory: "ไฟฟ้า", unit: "set", material: 10500, labor: 3000, quantity: 1 },
  { id: "sh3-061", name: "จุดไฟฟ้าทุกชั้น", category: "ระบบ MEP", subcategory: "ไฟฟ้า", unit: "point", material: 380, labor: 260, quantity: 70 },
  
  // ประปา
  { id: "sh3-070", name: "ระบบประปา 3 ชั้น พร้อมปั๊มน้ำ", category: "ระบบ MEP", subcategory: "ประปา", unit: "job", material: 25000, labor: 12000, quantity: 1 },
  
  // แอร์
  { id: "sh3-080", name: "ติดตั้งแอร์ 5 เครื่อง (ไม่รวมเครื่อง)", category: "ระบบ MEP", subcategory: "แอร์", unit: "set", material: 0, labor: 12500, quantity: 5 },
];

const shophouse_35floor: BOQItem[] = [
  // โครงสร้าง
  { id: "sh35-001", name: "คอนกรีตผสมเสร็จ 210 ksc", category: "โครงสร้าง", subcategory: "คอนกรีต", unit: "m3", material: 2384, labor: 0, quantity: 52 },
  { id: "sh35-002", name: "เหล็กเส้น SD40 Ø12-16 มม.", category: "โครงสร้าง", subcategory: "เหล็กเส้น", unit: "kg", material: 21, labor: 5.5, quantity: 6500 },
  { id: "sh35-003", name: "ผนังอิฐมอญ ก่อ+ฉาบ", category: "โครงสร้าง", subcategory: "ก่ออิฐ", unit: "m2", material: 260, labor: 140, quantity: 850 },
  
  // หลังคา
  { id: "sh35-010", name: "มุงกระเบื้องลอนคู่ กันร้อน", category: "สถาปัตยกรรมภายนอก", subcategory: "หลังคา", unit: "m2", material: 180, labor: 120, quantity: 85 },
  
  // ดาดฟ้า (ชั้น 4)
  { id: "sh35-015", name: "กันซึมดาดฟ้า เมมเบรน", category: "สถาปัตยกรรมภายนอก", subcategory: "กันซึม", unit: "m2", material: 320, labor: 160, quantity: 100 },
  { id: "sh35-016", name: "ปูกระเบื้องดาดฟ้า", category: "สถาปัตยกรรมภายนอก", subcategory: "พื้น", unit: "m2", material: 320, labor: 180, quantity: 100 },
  
  // บันได 3 ชุด
  { id: "sh35-020", name: "บันไดคอนกรีต+กระเบื้อง", category: "โครงสร้าง", subcategory: "บันได", unit: "m2", material: 750, labor: 400, quantity: 45 },
  { id: "sh35-021", name: "ราวบันไดสแตนเลส", category: "โครงสร้าง", subcategory: "บันได", unit: "m", material: 850, labor: 350, quantity: 36 },
  
  // ชั้น 1 - พาณิชย์
  { id: "sh35-030", name: "พื้นกระเบื้อง 60x60 ซม. ชั้น 1", category: "สถาปัตยกรรมภายใน", subcategory: "พื้น", unit: "m2", material: 380, labor: 180, quantity: 100 },
  { id: "sh35-031", name: "ประตูหน้าร้าน กระจก+อลูมิเนียม", category: "สถาปัตยกรรมภายนอก", subcategory: "ประตู", unit: "set", material: 32000, labor: 6500, quantity: 1 },
  { id: "sh35-032", name: "กระจกโชว์หน้าร้าน", category: "สถาปัตยกรรมภายนอก", subcategory: "กระจก", unit: "m2", material: 850, labor: 350, quantity: 25 },
  
  // ชั้น 2-3 - ที่อยู่อาศัย
  { id: "sh35-040", name: "พื้นไม้ลามิเนต ชั้น 2-3", category: "สถาปัตยกรรมภายใน", subcategory: "พื้น", unit: "m2", material: 420, labor: 150, quantity: 200 },
  { id: "sh35-041", name: "ห้องนอน 4 ห้อง พร้อมตู้บิ้วอิน", category: "สถาปัตยกรรมภายใน", subcategory: "บิ้วอิน", unit: "set", material: 35000, labor: 9000, quantity: 4 },
  { id: "sh35-042", name: "ห้องน้ำ 4 ห้อง พร้อมสุขภัณฑ์", category: "สถาปัตยกรรมภายใน", subcategory: "ห้องน้ำ", unit: "set", material: 25000, labor: 8000, quantity: 4 },
  
  // ทาสี
  { id: "sh35-050", name: "ทาสีภายนอก 2 เที่ยว", category: "สถาปัตยกรรมภายนอก", subcategory: "ทาสี", unit: "m2", material: 55, labor: 45, quantity: 720 },
  { id: "sh35-051", name: "ทาสีภายใน 2 เที่ยว", category: "สถาปัตยกรรมภายใน", subcategory: "ทาสี", unit: "m2", material: 45, labor: 35, quantity: 850 },
  
  // ไฟฟ้า
  { id: "sh35-060", name: "ตู้ไฟ MDB 3 เฟส 24 ช่อง", category: "ระบบ MEP", subcategory: "ไฟฟ้า", unit: "set", material: 12500, labor: 3500, quantity: 1 },
  { id: "sh35-061", name: "จุดไฟฟ้าทุกชั้น", category: "ระบบ MEP", subcategory: "ไฟฟ้า", unit: "point", material: 380, labor: 260, quantity: 90 },
  
  // ประปา
  { id: "sh35-070", name: "ระบบประปา 4 ชั้น พร้อมปั๊มน้ำ", category: "ระบบ MEP", subcategory: "ประปา", unit: "job", material: 32000, labor: 15000, quantity: 1 },
  
  // แอร์
  { id: "sh35-080", name: "ติดตั้งแอร์ 6 เครื่อง (ไม่รวมเครื่อง)", category: "ระบบ MEP", subcategory: "แอร์", unit: "set", material: 0, labor: 15000, quantity: 6 },
];

// ==================== ห้องพิเศษ ====================

const home_office: BOQItem[] = [
  { id: "ho-001", name: "พื้นไม้ลามิเนต 12 มม.", category: "สถาปัตยกรรมภายใน", subcategory: "พื้น", unit: "m2", material: 420, labor: 150, quantity: 9 },
  { id: "ho-002", name: "ทาสีอะครีลิคภายใน 2 เที่ยว", category: "สถาปัตยกรรมภายใน", subcategory: "ทาสี", unit: "m2", material: 45, labor: 35, quantity: 36 },
  { id: "ho-003", name: "โต๊ะทำงาน บิ้วอิน L-Shape 2.5 ม.", category: "สถาปัตยกรรมภายใน", subcategory: "บิ้วอิน", unit: "set", material: 12000, labor: 3500, quantity: 1 },
  { id: "ho-004", name: "ชั้นหนังสือ บิ้วอิน 3 ม.", category: "สถาปัตยกรรมภายใน", subcategory: "บิ้วอิน", unit: "m", material: 3500, labor: 1000, quantity: 3 },
  { id: "ho-005", name: "ตู้เก็บเอกสาร บิ้วอิน", category: "สถาปัตยกรรมภายใน", subcategory: "บิ้วอิน", unit: "set", material: 6500, labor: 1800, quantity: 1 },
  { id: "ho-006", name: "ม่านม้วน Blackout", category: "สถาปัตยกรรมภายใน", subcategory: "ผ้าม่าน", unit: "m2", material: 450, labor: 150, quantity: 3 },
  { id: "ho-007", name: "ปลั๊กไฟ + LAN + USB ช่องเยอะ", category: "ระบบ MEP", subcategory: "ไฟฟ้า", unit: "set", material: 1200, labor: 400, quantity: 4 },
  { id: "ho-008", name: "ไฟ LED แบบปรับแสงได้", category: "ระบบ MEP", subcategory: "ไฟฟ้า", unit: "set", material: 2500, labor: 800, quantity: 1 },
  { id: "ho-009", name: "แอร์ 12,000 BTU อินเวอร์เตอร์", category: "ระบบ MEP", subcategory: "แอร์", unit: "set", material: 15000, labor: 2500, quantity: 1 },
];

const home_gym: BOQItem[] = [
  { id: "hg-001", name: "พื้นยาง PVC หนา 8 มม. กันกระแทก", category: "สถาปัตยกรรมภายใน", subcategory: "พื้น", unit: "m2", material: 650, labor: 200, quantity: 20 },
  { id: "hg-002", name: "กระจกเงาเต็มผนัง", category: "สถาปัตยกรรมภายใน", subcategory: "กระจก", unit: "m2", material: 650, labor: 280, quantity: 12 },
  { id: "hg-003", name: "ทาสีอะครีลิคภายใน 2 เที่ยว", category: "สถาปัตยกรรมภายใน", subcategory: "ทาสี", unit: "m2", material: 45, labor: 35, quantity: 56 },
  { id: "hg-004", name: "ชั้นวางอุปกรณ์ บิ้วอิน", category: "สถาปัตยกรรมภายใน", subcategory: "บิ้วอิน", unit: "m", material: 2800, labor: 800, quantity: 3 },
  { id: "hg-005", name: "ราวแขวนผ้า + กระจก", category: "สถาปัตยกรรมภายใน", subcategory: "บิ้วอิน", unit: "set", material: 1500, labor: 500, quantity: 1 },
  { id: "hg-006", name: "พัดลมอุตสาหกรรม 24 นิ้ว", category: "ระบบ MEP", subcategory: "ระบายอากาศ", unit: "pcs", material: 2500, labor: 500, quantity: 2 },
  { id: "hg-007", name: "ดาวน์ไลท์ LED + ลำโพง Bluetooth", category: "ระบบ MEP", subcategory: "ไฟฟ้า", unit: "set", material: 3500, labor: 1200, quantity: 1 },
  { id: "hg-008", name: "แอร์ 18,000 BTU อินเวอร์เตอร์", category: "ระบบ MEP", subcategory: "แอร์", unit: "set", material: 18000, labor: 3000, quantity: 1 },
];

const home_theater: BOQItem[] = [
  { id: "ht-001", name: "พื้นพรม Carpet Wall-to-Wall", category: "สถาปัตยกรรมภายใน", subcategory: "พื้น", unit: "m2", material: 850, labor: 280, quantity: 20 },
  { id: "ht-002", name: "ทาสีดำด้าน (ผนัง+ฝ้า)", category: "สถาปัตยกรรมภายใน", subcategory: "ทาสี", unit: "m2", material: 55, labor: 40, quantity: 76 },
  { id: "ht-003", name: "ผนังกันเสียง Acoustic Panel", category: "สถาปัตยกรรมภายใน", subcategory: "ผนังกันเสียง", unit: "m2", material: 1200, labor: 400, quantity: 30 },
  { id: "ht-004", name: "ฝ้าฉาบเรียบ สีดำ", category: "สถาปัตยกรรมภายใน", subcategory: "ฝ้า", unit: "m2", material: 320, labor: 180, quantity: 20 },
  { id: "ht-005", name: "ชั้นวางอุปกรณ์ AV บิ้วอิน", category: "สถาปัตยกรรมภายใน", subcategory: "บิ้วอิน", unit: "set", material: 8500, labor: 2500, quantity: 1 },
  { id: "ht-006", name: "เบาะนั่งโฮมเธียเตอร์ 8 ที่นั่ง", category: "เฟอร์นิเจอร์/ฟิตเอาต์ ร้านอาหาร", subcategory: "เบาะนั่ง", unit: "set", material: 48000, labor: 8000, quantity: 1 },
  { id: "ht-007", name: "ระบบไฟ Dimmer + Scene Control", category: "ระบบ MEP", subcategory: "ไฟฟ้า", unit: "set", material: 5500, labor: 2000, quantity: 1 },
  { id: "ht-008", name: "ปลั๊กไฟ + สาย HDMI ฝังผนัง", category: "ระบบ MEP", subcategory: "ไฟฟ้า", unit: "set", material: 2500, labor: 800, quantity: 1 },
  { id: "ht-009", name: "แอร์ 24,000 BTU เงียบพิเศษ", category: "ระบบ MEP", subcategory: "แอร์", unit: "set", material: 25000, labor: 3500, quantity: 1 },
];

const garage_extension: BOQItem[] = [
  { id: "gar-001", name: "ขุดดิน+ถมดินบดอัด", category: "งานเตรียมพื้นที่", subcategory: "ดิน", unit: "m3", material: 80, labor: 120, quantity: 6 },
  { id: "gar-002", name: "คอนกรีตผสมเสร็จ พื้นโรงรถ", category: "โครงสร้าง", subcategory: "คอนกรีต", unit: "m3", material: 2200, labor: 0, quantity: 6 },
  { id: "gar-003", name: "โครงหลังคาเหล็กกล่อง", category: "โครงสร้าง", subcategory: "โครงเหล็ก", unit: "kg", material: 42, labor: 18, quantity: 350 },
  { id: "gar-004", name: "มุงเมทัลชีท 0.47 มม.", category: "สถาปัตยกรรมภายนอก", subcategory: "หลังคา", unit: "m2", material: 320, labor: 220, quantity: 28 },
  { id: "gar-005", name: "ทาสีเหล็กโครงหลังคา", category: "สถาปัตยกรรมภายนอก", subcategory: "ทาสี", unit: "m2", material: 45, labor: 55, quantity: 35 },
  { id: "gar-006", name: "ผนังอิฐมอญ ก่อ+ฉาบ 2 ด้าน", category: "โครงสร้าง", subcategory: "ก่ออิฐ", unit: "m2", material: 260, labor: 140, quantity: 20 },
  { id: "gar-007", name: "ประตูม้วน 3x2.5 ม. ไฟฟ้า", category: "สถาปัตยกรรมภายนอก", subcategory: "ประตู", unit: "set", material: 18000, labor: 3500, quantity: 1 },
  { id: "gar-008", name: "จุดไฟฟ้า + ปลั๊ก", category: "ระบบ MEP", subcategory: "ไฟฟ้า", unit: "point", material: 350, labor: 250, quantity: 4 },
];

// ==================== ภูมิทัศน์เพิ่มเติม ====================

const swimming_pool: BOQItem[] = [
  { id: "pool-001", name: "ขุดดิน สระว่ายน้ำ 4x8x1.5 ม.", category: "งานเตรียมพื้นที่", subcategory: "ดิน", unit: "m3", material: 0, labor: 120, quantity: 55 },
  { id: "pool-002", name: "คอนกรีตผสมเสร็จ 210 ksc พื้น+ผนังสระ", category: "โครงสร้าง", subcategory: "คอนกรีต", unit: "m3", material: 2384, labor: 0, quantity: 18 },
  { id: "pool-003", name: "เหล็กเส้นเสริมสระ", category: "โครงสร้าง", subcategory: "เหล็กเส้น", unit: "kg", material: 20, labor: 5, quantity: 1200 },
  { id: "pool-004", name: "กันซึมสระว่ายน้ำ 3 ชั้น", category: "สถาปัตยกรรมภายนอก", subcategory: "กันซึม", unit: "m2", material: 380, labor: 180, quantity: 72 },
  { id: "pool-005", name: "กระเบื้องโมเสกสระว่ายน้ำ", category: "สถาปัตยกรรมภายนอก", subcategory: "กระเบื้อง", unit: "m2", material: 650, labor: 320, quantity: 72 },
  { id: "pool-006", name: "ระบบกรองน้ำ + ปั๊ม", category: "ระบบ MEP", subcategory: "ประปา", unit: "set", material: 45000, labor: 12000, quantity: 1 },
  { id: "pool-007", name: "ไฟใต้น้ำ LED RGB", category: "ระบบ MEP", subcategory: "ไฟฟ้า", unit: "pcs", material: 3500, labor: 1200, quantity: 4 },
  { id: "pool-008", name: "ระบบทำความสะอาดอัตโนมัติ", category: "ระบบ MEP", subcategory: "ประปา", unit: "set", material: 25000, labor: 5000, quantity: 1 },
  { id: "pool-009", name: "บันไดสแตนเลส 304", category: "โครงสร้าง", subcategory: "โลหะ", unit: "set", material: 12000, labor: 3000, quantity: 1 },
];

const sala_garden: BOQItem[] = [
  { id: "sala-001", name: "ฐานรากคอนกรีต เสา 4 ต้น", category: "โครงสร้าง", subcategory: "คอนกรีต", unit: "m3", material: 2200, labor: 0, quantity: 1.5 },
  { id: "sala-002", name: "เสาไม้เนื้อแข็ง 6x6 นิ้ว", category: "โครงสร้าง", subcategory: "ไม้", unit: "m", material: 850, labor: 350, quantity: 12 },
  { id: "sala-003", name: "โครงหลังคาไม้เนื้อแข็ง", category: "สถาปัตยกรรมภายนอก", subcategory: "โครงไม้", unit: "set", material: 15000, labor: 6000, quantity: 1 },
  { id: "sala-004", name: "มุงกระเบื้องดินเผา", category: "สถาปัตยกรรมภายนอก", subcategory: "หลังคา", unit: "m2", material: 280, labor: 150, quantity: 12 },
  { id: "sala-005", name: "พื้นไม้เนื้อแข็ง สีธรรมชาติ", category: "สถาปัตยกรรมภายใน", subcategory: "พื้น", unit: "m2", material: 950, labor: 350, quantity: 9 },
  { id: "sala-006", name: "ราวกันตกไม้", category: "สถาปัตยกรรมภายนอก", subcategory: "ราว", unit: "m", material: 650, labor: 280, quantity: 12 },
  { id: "sala-007", name: "ทาน้ำมันไม้ทั้งหมด", category: "สถาปัตยกรรมภายนอก", subcategory: "ทาสี", unit: "m2", material: 80, labor: 60, quantity: 45 },
  { id: "sala-008", name: "จุดไฟฟ้า + โคมไฟสวนกันน้ำ", category: "ระบบ MEP", subcategory: "ไฟฟ้า", unit: "set", material: 2500, labor: 800, quantity: 4 },
];

const paint_whole_house: BOQItem[] = [
  { id: "paint-001", name: "ขัดกระดาษทรายผนังเก่า", category: "งานเตรียมพื้นที่", subcategory: "เตรียมผิว", unit: "m2", material: 5, labor: 15, quantity: 400 },
  { id: "paint-002", name: "ซ่อมรอยร้าว + สกิมโคท", category: "สถาปัตยกรรมภายใน", subcategory: "ฉาบปูน", unit: "m2", material: 40, labor: 50, quantity: 400 },
  { id: "paint-003", name: "รองพื้นกันด่าง 1 เที่ยว", category: "สถาปัตยกรรมภายใน", subcategory: "ทาสี", unit: "m2", material: 25, labor: 20, quantity: 400 },
  { id: "paint-004", name: "ทาสีอะครีลิคภายใน 2 เที่ยว", category: "สถาปัตยกรรมภายใน", subcategory: "ทาสี", unit: "m2", material: 45, labor: 35, quantity: 350 },
  { id: "paint-005", name: "ทาสีภายนอก กันรังสี UV 2 เที่ยว", category: "สถาปัตยกรรมภายนอก", subcategory: "ทาสี", unit: "m2", material: 55, labor: 45, quantity: 250 },
  { id: "paint-006", name: "ทาสีเหล็ก (ประตู-หน้าต่าง-ราว)", category: "สถาปัตยกรรมภายนอก", subcategory: "ทาสี", unit: "m2", material: 50, labor: 60, quantity: 35 },
  { id: "paint-007", name: "ทาสีไม้ (ฝ้า-บัว-ประตู)", category: "สถาปัตยกรรมภายใน", subcategory: "ทาสี", unit: "m2", material: 60, labor: 50, quantity: 40 },
  { id: "paint-008", name: "ปกป้องพื้น-เฟอร์นิเจอร์", category: "งานเตรียมพื้นที่", subcategory: "ป้องกัน", unit: "job", material: 1500, labor: 1000, quantity: 1 },
];

// ==================== บิ้วอิน ====================

const wardrobe_standard: BOQItem[] = [
  { id: "bi-wr-001", name: "ตู้เสื้อผ้าบิ้วอิน เมลามีน 2.5 ม.", category: "สถาปัตยกรรมภายใน", subcategory: "บิ้วอิน", unit: "m", material: 5500, labor: 1500, quantity: 2.5 },
  { id: "bi-wr-002", name: "บานเลื่อนกระจกเงา", category: "สถาปัตยกรรมภายใน", subcategory: "บิ้วอิน", unit: "m2", material: 1200, labor: 450, quantity: 6 },
  { id: "bi-wr-003", name: "ชั้นวางของ + ราวแขวน", category: "สถาปัตยกรรมภายใน", subcategory: "บิ้วอิน", unit: "set", material: 800, labor: 300, quantity: 1 },
  { id: "bi-wr-004", name: "ลิ้นชัก 3 ลิ้นชัก", category: "สถาปัตยกรรมภายใน", subcategory: "บิ้วอิน", unit: "set", material: 1200, labor: 400, quantity: 1 },
];

const tv_console: BOQItem[] = [
  { id: "bi-tv-001", name: "ชุดวางทีวี บิ้วอิน 2.5 ม.", category: "สถาปัตยกรรมภายใน", subcategory: "บิ้วอิน", unit: "m", material: 6500, labor: 1800, quantity: 2.5 },
  { id: "bi-tv-002", name: "ชั้นวางอุปกรณ์ + ลิ้นชัก", category: "สถาปัตยกรรมภายใน", subcategory: "บิ้วอิน", unit: "set", material: 2800, labor: 800, quantity: 1 },
  { id: "bi-tv-003", name: "ช่องเดินสายไฟ + ปลั๊ก", category: "สถาปัตยกรรมภายใน", subcategory: "บิ้วอิน", unit: "set", material: 800, labor: 400, quantity: 1 },
  { id: "bi-tv-004", name: "ไฟ LED แถบ RGB พร้อมรีโมท", category: "ระบบ MEP", subcategory: "ไฟฟ้า", unit: "m", material: 280, labor: 150, quantity: 5 },
];

const walkin_closet: BOQItem[] = [
  { id: "bi-wc-001", name: "Walk-in Closet 3x2 ม. โครงเมลามีน", category: "สถาปัตยกรรมภายใน", subcategory: "บิ้วอิน", unit: "set", material: 35000, labor: 8000, quantity: 1 },
  { id: "bi-wc-002", name: "ชั้นวางเสื้อผ้า 3 ด้าน", category: "สถาปัตยกรรมภายใน", subcategory: "บิ้วอิน", unit: "set", material: 6500, labor: 1800, quantity: 1 },
  { id: "bi-wc-003", name: "ราวแขวนเสื้อ 3 ชั้น", category: "สถาปัตยกรรมภายใน", subcategory: "บิ้วอิน", unit: "set", material: 3200, labor: 900, quantity: 1 },
  { id: "bi-wc-004", name: "ลิ้นชักเก็บเครื่องประดับ 6 ลิ้นชัก", category: "สถาปัตยกรรมภายใน", subcategory: "บิ้วอิน", unit: "set", material: 4500, labor: 1200, quantity: 1 },
  { id: "bi-wc-005", name: "ชั้นวางกระเป๋า + รองเท้า", category: "สถาปัตยกรรมภายใน", subcategory: "บิ้วอิน", unit: "set", material: 3800, labor: 1000, quantity: 1 },
  { id: "bi-wc-006", name: "กระจกเต็มตัว พร้อมไฟ LED", category: "สถาปัตยกรรมภายใน", subcategory: "บิ้วอิน", unit: "set", material: 4500, labor: 1200, quantity: 1 },
  { id: "bi-wc-007", name: "ระบบไฟ LED พร้อม Motion Sensor", category: "ระบบ MEP", subcategory: "ไฟฟ้า", unit: "set", material: 2500, labor: 800, quantity: 1 },
];

const bookshelf: BOQItem[] = [
  { id: "bi-bs-001", name: "ชั้นหนังสือ บิ้วอิน 2.5 ม.", category: "สถาปัตยกรรมภายใน", subcategory: "บิ้วอิน", unit: "m", material: 3500, labor: 1000, quantity: 2.5 },
  { id: "bi-bs-002", name: "ชั้นปรับระดับได้ 5 ชั้น", category: "สถาปัตยกรรมภายใน", subcategory: "บิ้วอิน", unit: "set", material: 1800, labor: 500, quantity: 1 },
  { id: "bi-bs-003", name: "ลิ้นชักเก็บของ 2 ลิ้นชัก", category: "สถาปัตยกรรมภายใน", subcategory: "บิ้วอิน", unit: "set", material: 1200, labor: 400, quantity: 1 },
  { id: "bi-bs-004", name: "ไฟ LED ใต้ชั้น", category: "ระบบ MEP", subcategory: "ไฟฟ้า", unit: "set", material: 800, labor: 350, quantity: 1 },
];

const work_desk: BOQItem[] = [
  { id: "bi-wd-001", name: "โต๊ะทำงาน บิ้วอิน 1.8 ม.", category: "สถาปัตยกรรมภายใน", subcategory: "บิ้วอิน", unit: "m", material: 3500, labor: 1000, quantity: 1.8 },
  { id: "bi-wd-002", name: "ท็อปโต๊ะ ไม้อัด HPL", category: "สถาปัตยกรรมภายใน", subcategory: "บิ้วอิน", unit: "m2", material: 1200, labor: 400, quantity: 1.5 },
  { id: "bi-wd-003", name: "ลิ้นชักข้าง 3 ลิ้นชัก", category: "สถาปัตยกรรมภายใน", subcategory: "บิ้วอิน", unit: "set", material: 1800, labor: 600, quantity: 1 },
  { id: "bi-wd-004", name: "ชั้นวางหนังสือ + ของตกแต่ง", category: "สถาปัตยกรรมภายใน", subcategory: "บิ้วอิน", unit: "set", material: 2200, labor: 700, quantity: 1 },
  { id: "bi-wd-005", name: "ช่องเดินสายไฟ + ปลั๊ก USB", category: "ระบบ MEP", subcategory: "ไฟฟ้า", unit: "set", material: 650, labor: 300, quantity: 1 },
  { id: "bi-wd-006", name: "ไฟ LED อ่านหนังสือ", category: "ระบบ MEP", subcategory: "ไฟฟ้า", unit: "pcs", material: 450, labor: 200, quantity: 1 },
];

const shoe_cabinet: BOQItem[] = [
  { id: "bi-sc-001", name: "ตู้รองเท้า บิ้วอิน 1.5 ม.", category: "สถาปัตยกรรมภายใน", subcategory: "บิ้วอิน", unit: "m", material: 4200, labor: 1200, quantity: 1.5 },
  { id: "bi-sc-002", name: "ชั้นวาง 6 ชั้น พร้อมระบายอากาศ", category: "สถาปัตยกรรมภายใน", subcategory: "บิ้วอิน", unit: "set", material: 1500, labor: 500, quantity: 1 },
  { id: "bi-sc-003", name: "บานประตู Push to Open", category: "สถาปัตยกรรมภายใน", subcategory: "บิ้วอิน", unit: "m2", material: 800, labor: 350, quantity: 2 },
  { id: "bi-sc-004", name: "ที่นั่งบิ้วอิน บุฟองน้ำ", category: "สถาปัตยกรรมภายใน", subcategory: "บิ้วอิน", unit: "m", material: 1200, labor: 450, quantity: 1.5 },
  { id: "bi-sc-005", name: "ไฟ LED เซ็นเซอร์", category: "ระบบ MEP", subcategory: "ไฟฟ้า", unit: "set", material: 650, labor: 280, quantity: 1 },
];

const dressing_table: BOQItem[] = [
  { id: "bi-dt-001", name: "โต๊ะเครื่องแป้ง บิ้วอิน 1.2 ม.", category: "สถาปัตยกรรมภายใน", subcategory: "บิ้วอิน", unit: "m", material: 5500, labor: 1500, quantity: 1.2 },
  { id: "bi-dt-002", name: "กระจก LED Hollywood Style", category: "สถาปัตยกรรมภายใน", subcategory: "บิ้วอิน", unit: "set", material: 3500, labor: 900, quantity: 1 },
  { id: "bi-dt-003", name: "ลิ้นชักเก็บเครื่องสำอาง 4 ลิ้นชัก", category: "สถาปัตยกรรมภายใน", subcategory: "บิ้วอิน", unit: "set", material: 2200, labor: 700, quantity: 1 },
  { id: "bi-dt-004", name: "ช่องเก็บเครื่องประดับ มีกระจก", category: "สถาปัตยกรรมภายใน", subcategory: "บิ้วอิน", unit: "set", material: 1800, labor: 600, quantity: 1 },
  { id: "bi-dt-005", name: "ปลั๊กไฟ + USB + ปลั๊กไดร์", category: "ระบบ MEP", subcategory: "ไฟฟ้า", unit: "set", material: 850, labor: 350, quantity: 1 },
];

const pantry_cabinet: BOQItem[] = [
  { id: "bi-pc-001", name: "ตู้ครัวบิ้วอิน ล่าง 2 ม.", category: "สถาปัตยกรรมภายใน", subcategory: "ห้องครัว", unit: "m", material: 4500, labor: 1200, quantity: 2 },
  { id: "bi-pc-002", name: "ตู้ครัวบิ้วอิน บน 2 ม.", category: "สถาปัตยกรรมภายใน", subcategory: "ห้องครัว", unit: "m", material: 3200, labor: 900, quantity: 2 },
  { id: "bi-pc-003", name: "เคาน์เตอร์หินแกรนิต 20 มม.", category: "สถาปัตยกรรมภายใน", subcategory: "ห้องครัว", unit: "m", material: 2800, labor: 700, quantity: 2 },
  { id: "bi-pc-004", name: "อ่างล้างจานสแตนเลส 1 หลุม", category: "สถาปัตยกรรมภายใน", subcategory: "ห้องครัว", unit: "set", material: 850, labor: 250, quantity: 1 },
  { id: "bi-pc-005", name: "ก๊อกผสมซิงก์", category: "สถาปัตยกรรมภายใน", subcategory: "ห้องครัว", unit: "pcs", material: 680, labor: 180, quantity: 1 },
  { id: "bi-pc-006", name: "ปลั๊กไฟ 4 ช่อง พร้อมสวิตช์", category: "ระบบ MEP", subcategory: "ไฟฟ้า", unit: "set", material: 450, labor: 250, quantity: 2 },
];

// ==================== ร้านอาหาร/คาเฟ่ ====================

const cafe_small_40sqm: BOQItem[] = [
  // ผิวสำเร็จ
  { id: "cf-001", name: "พื้นอีพ็อกซี่ 3 มม.", category: "สถาปัตยกรรมภายใน", subcategory: "พื้น", unit: "m2", material: 450, labor: 250, quantity: 40 },
  { id: "cf-002", name: "ทาสีอะครีลิคภายใน 2 เที่ยว", category: "สถาปัตยกรรมภายใน", subcategory: "ทาสี", unit: "m2", material: 45, labor: 35, quantity: 100 },
  
  // เฟอร์นิเจอร์
  { id: "cf-010", name: "เคาน์เตอร์โครงไม้อัด 18 มม. กรุ HPL", category: "เฟอร์นิเจอร์/ฟิตเอาต์ ร้านอาหาร", subcategory: "เคาน์เตอร์", unit: "m2", material: 3500, labor: 1200, quantity: 4 },
  { id: "cf-011", name: "ท็อปโต๊ะ Compact Laminate 10 มม.", category: "เฟอร์นิเจอร์/ฟิตเอาต์ ร้านอาหาร", subcategory: "โต๊ะ", unit: "m2", material: 850, labor: 350, quantity: 12 },
  { id: "cf-012", name: "เบาะนั่ง Bench บุฟองน้ำ หุ้มไวนิล", category: "เฟอร์นิเจอร์/ฟิตเอาต์ ร้านอาหาร", subcategory: "เบาะนั่ง", unit: "m", material: 1200, labor: 450, quantity: 6 },
  
  // ครัว
  { id: "cf-020", name: "ซิงค์ล้างจานสแตนเลส 2 หลุม", category: "ครัวเปียก/ซิงค์/สุขาภิบาลครัว", subcategory: "ซิงค์", unit: "pcs", material: 3500, labor: 800, quantity: 1 },
  { id: "cf-021", name: "ฮูดครัวสแตนเลส สูง 700 มม.", category: "งานครัว - ระบบดูดควัน", subcategory: "ฮูด", unit: "m", material: 4500, labor: 1200, quantity: 2 },
  { id: "cf-022", name: "พัดลมดูดควัน Centrifugal 12\\\"", category: "งานครัว - ระบบดูดควัน", subcategory: "พัดลม", unit: "pcs", material: 8500, labor: 1500, quantity: 1 },
  { id: "cf-023", name: "บ่อดักไขมัน 600 ลิตร", category: "ครัวเปียก/ซิงค์/สุขาภิบาลครัว", subcategory: "บ่อดักไขมัน", unit: "pcs", material: 12000, labor: 3000, quantity: 1 },
  
  // ป้าย
  { id: "cf-030", name: "ป้าย Lightbox อลูมิเนียม", category: "ป้ายและไฟป้าย", subcategory: "ป้าย", unit: "m2", material: 2500, labor: 800, quantity: 3 },
  { id: "cf-031", name: "ไฟเส้น LED สำหรับป้าย", category: "ป้ายและไฟป้าย", subcategory: "LED", unit: "m", material: 280, labor: 120, quantity: 12 },
  
  // MEP
  { id: "cf-040", name: "ตู้เมน/DB พร้อมอุปกรณ์", category: "ระบบ MEP", subcategory: "ไฟฟ้า", unit: "set", material: 8500, labor: 2500, quantity: 1 },
  { id: "cf-041", name: "แอร์ Split ชุดรวมติดตั้ง 18,000 BTU", category: "ระบบ MEP", subcategory: "แอร์", unit: "set", material: 18000, labor: 2500, quantity: 2 },
  { id: "cf-042", name: "กล้อง IP 4MP", category: "ระบบกล้อง/เครือข่าย", subcategory: "กล้อง", unit: "pcs", material: 2500, labor: 800, quantity: 4 },
  { id: "cf-043", name: "เครื่องบันทึก NVR 16 ช่อง", category: "ระบบกล้อง/เครือข่าย", subcategory: "NVR", unit: "set", material: 8500, labor: 1500, quantity: 1 },
];

const restaurant_80sqm: BOQItem[] = [
  // ผิวสำเร็จ
  { id: "rs-001", name: "พื้นอีพ็อกซี่กันลื่น 3 มม. (ครัว)", category: "ผิวสำเร็จครัวเฉพาะ", subcategory: "พื้น", unit: "m2", material: 480, labor: 280, quantity: 25 },
  { id: "rs-002", name: "กระเบื้องแกรนิตโต 60x60 ซม. (โซนนั่ง)", category: "สถาปัตยกรรมภายใน", subcategory: "พื้น", unit: "m2", material: 380, labor: 180, quantity: 55 },
  { id: "rs-003", name: "ทาสีอะครีลิคภายใน 2 เที่ยว", category: "สถาปัตยกรรมภายใน", subcategory: "ทาสี", unit: "m2", material: 45, labor: 35, quantity: 200 },
  
  // เฟอร์นิเจอร์
  { id: "rs-010", name: "เคาน์เตอร์โครงไม้อัด 18 มม. กรุ HPL", category: "เฟอร์นิเจอร์/ฟิตเอาต์ ร้านอาหาร", subcategory: "เคาน์เตอร์", unit: "m2", material: 3500, labor: 1200, quantity: 6 },
  { id: "rs-011", name: "ท็อปโต๊ะ Compact Laminate 10 มม.", category: "เฟอร์นิเจอร์/ฟิตเอาต์ ร้านอาหาร", subcategory: "โต๊ะ", unit: "m2", material: 850, labor: 350, quantity: 25 },
  { id: "rs-012", name: "เบาะนั่ง Bench บุฟองน้ำ หุ้มไวนิล", category: "เฟอร์นิเจอร์/ฟิตเอาต์ ร้านอาหาร", subcategory: "เบาะนั่ง", unit: "m", material: 1200, labor: 450, quantity: 12 },
  
  // ครัว
  { id: "rs-020", name: "ซิงค์ล้างจานสแตนเลส 2 หลุม", category: "ครัวเปียก/ซิงค์/สุขาภิบาลครัว", subcategory: "ซิงค์", unit: "pcs", material: 3500, labor: 800, quantity: 2 },
  { id: "rs-021", name: "ฮูดครัวสแตนเลส สูง 700 มม.", category: "งานครัว - ระบบดูดควัน", subcategory: "ฮูด", unit: "m", material: 4500, labor: 1200, quantity: 4 },
  { id: "rs-022", name: "ท่อลมดูดควัน GI 24 ga", category: "งานครัว - ระบบดูดควัน", subcategory: "ท่อ", unit: "m", material: 380, labor: 220, quantity: 20 },
  { id: "rs-023", name: "พัดลมดูดควัน Centrifugal 12\\\"", category: "งานครัว - ระบบดูดควัน", subcategory: "พัดลม", unit: "pcs", material: 8500, labor: 1500, quantity: 1 },
  { id: "rs-024", name: "บ่อดักไขมัน 1200 ลิตร", category: "ครัวเปียก/ซิงค์/สุขาภิบาลครัว", subcategory: "บ่อดักไขมัน", unit: "pcs", material: 18000, labor: 4500, quantity: 1 },
  { id: "rs-025", name: "แท่นวางเตา/ตู้ครัว สแตนเลส", category: "เครื่องครัวเชิงพาณิชย์", subcategory: "ตู้ครัว", unit: "m", material: 6500, labor: 1800, quantity: 4 },
  { id: "rs-026", name: "ชั้นวางสแตนเลส 4 ชั้น", category: "เครื่องครัวเชิงพาณิชย์", subcategory: "ชั้นวาง", unit: "pcs", material: 2800, labor: 600, quantity: 3 },
  
  // แก๊ส
  { id: "rs-030", name: "ท่อแก๊สสแตนเลส 1\\\"", category: "ระบบแก๊สหุงต้ม", subcategory: "ท่อแก๊ส", unit: "m", material: 450, labor: 250, quantity: 15 },
  { id: "rs-031", name: "บอลวาล์วแก๊ส 1\\\"", category: "ระบบแก๊สหุงต้ม", subcategory: "วาล์ว", unit: "pcs", material: 380, labor: 180, quantity: 2 },
  { id: "rs-032", name: "เรกูเลเตอร์ 2 สเตจ", category: "ระบบแก๊สหุงต้ม", subcategory: "เรกูเลเตอร์", unit: "set", material: 1200, labor: 400, quantity: 1 },
  { id: "rs-033", name: "ชุดตรวจจับแก๊สรั่ว + Controller", category: "ระบบแก๊สหุงต้ม", subcategory: "ตรวจจับแก๊ส", unit: "set", material: 8500, labor: 1500, quantity: 1 },
  
  // ป้าย
  { id: "rs-040", name: "โครงเหล็กป้าย", category: "ป้ายและไฟป้าย", subcategory: "โครงป้าย", unit: "m", material: 1200, labor: 450, quantity: 8 },
  { id: "rs-041", name: "ป้าย Lightbox อลูมิเนียม", category: "ป้ายและไฟป้าย", subcategory: "ป้าย", unit: "m2", material: 2500, labor: 800, quantity: 5 },
  { id: "rs-042", name: "ไฟเส้น LED สำหรับป้าย", category: "ป้ายและไฟป้าย", subcategory: "LED", unit: "m", material: 280, labor: 120, quantity: 20 },
  
  // MEP
  { id: "rs-050", name: "ตู้เมน/DB พร้อมอุปกรณ์", category: "ระบบ MEP", subcategory: "ไฟฟ้า", unit: "set", material: 12000, labor: 3500, quantity: 1 },
  { id: "rs-051", name: "แอร์ Split ชุดรวมติดตั้ง 24,000 BTU", category: "ระบบ MEP", subcategory: "แอร์", unit: "set", material: 22000, labor: 3000, quantity: 3 },
  { id: "rs-052", name: "กล้อง IP 4MP", category: "ระบบกล้อง/เครือข่าย", subcategory: "กล้อง", unit: "pcs", material: 2500, labor: 800, quantity: 6 },
  { id: "rs-053", name: "เครื่องบันทึก NVR 16 ช่อง", category: "ระบบกล้อง/เครือข่าย", subcategory: "NVR", unit: "set", material: 8500, labor: 1500, quantity: 1 },
  { id: "rs-054", name: "สวิตช์ PoE 16 พอร์ต", category: "ระบบกล้อง/เครือข่าย", subcategory: "Network", unit: "pcs", material: 4200, labor: 800, quantity: 1 },
  
  // ระบบป้องกันอัคคีภัย
  { id: "rs-060", name: "Hose Reel 1.5\\\" สาย 30 ม.", category: "ระบบป้องกันอัคคีภัย", subcategory: "Hose Reel", unit: "set", material: 3500, labor: 1200, quantity: 1 },
  { id: "rs-061", name: "เครื่องตรวจจับควัน", category: "ระบบป้องกันอัคคีภัย", subcategory: "ตรวจจับควัน", unit: "pcs", material: 850, labor: 350, quantity: 4 },
  { id: "rs-062", name: "ไฟฉุกเฉิน", category: "ระบบป้องกันอัคคีภัย", subcategory: "ไฟฉุกเฉิน", unit: "pcs", material: 680, labor: 280, quantity: 4 },
];

// ==================== METADATA ====================

export const templateMetadata: TemplateMetadata[] = [
  // บ้านเดี่ยว
  {
    id: "house-1floor-80",
    name: "บ้านเดี่ยว 1 ชั้น 80 ตร.ม.",
    description: "บ้านเดี่ยว 1 ชั้น ขนาด 80 ตารางเมตร 2 ห้องนอน 2 ห้องน้ำ เหมาะสำหรับครอบครัวเล็ก",
    mainCategory: "house",
    area: 80,
    estimatedCost: 1000000,
    estimatedDays: 90,
    tags: ["บ้านเดี่ยว", "1 ชั้น", "80 ตร.ม.", "2 ห้องนอน"],
    difficulty: "medium",
    items: house_1floor_80,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    usageCount: 156
  },
  {
    id: "house-2floor-150",
    name: "บ้านเดี่ยว 2 ชั้น 150 ตร.ม.",
    description: "บ้านเดี่ยว 2 ชั้น ขนาด 150 ตารางเมตร 3 ห้องนอน 3 ห้องน้ำ พร้อมบันไดหินอ่อน",
    mainCategory: "house",
    area: 150,
    estimatedCost: 1850000,
    estimatedDays: 120,
    tags: ["บ้านเดี่ยว", "2 ชั้น", "150 ตร.ม.", "3 ห้องนอน"],
    difficulty: "hard",
    items: house_2floor_150,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    usageCount: 142
  },
  {
    id: "house-2floor-200",
    name: "บ้านเดี่ยว 2 ชั้น 200 ตร.ม.",
    description: "บ้านเดี่ยว 2 ชั้น ขนาด 200 ตารางเมตร 4 ห้องนอน 4 ห้องน้ำ พร้อมแอร์ทุกห้อง",
    mainCategory: "house",
    area: 200,
    estimatedCost: 2500000,
    estimatedDays: 150,
    tags: ["บ้านเดี่ยว", "2 ชั้น", "200 ตร.ม.", "4 ห้องนอน", "พรีเมียม"],
    difficulty: "hard",
    items: house_2floor_200,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    usageCount: 98
  },
  {
    id: "house-3floor-250",
    name: "บ้านเดี่ยว 3 ชั้น 250 ตร.ม.",
    description: "บ้านเดี่ยว 3 ชั้น ขนาด 250 ตารางเมตร 5 ห้องนอน 4 ห้องน้ำ บันได 2 ชุด",
    mainCategory: "house",
    area: 250,
    estimatedCost: 3250000,
    estimatedDays: 180,
    tags: ["บ้านเดี่ยว", "3 ชั้น", "250 ตร.ม.", "5 ห้องนอน", "พรีเมียม", "บันได 2 ชุด"],
    difficulty: "hard",
    items: house_3floor_250,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    usageCount: 45
  },
  
  // ตึกพาณิชย์
  {
    id: "shophouse-2floor",
    name: "ตึกแถว 2 ชั้น 4x20 ม.",
    description: "ตึกแถว 2 ชั้น 4x20 เมตร (160 ตร.ม.) ชั้น 1 พาณิชย์ ชั้น 2 ที่อยู่อาศัย",
    mainCategory: "commercial",
    area: 160,
    estimatedCost: 1850000,
    estimatedDays: 150,
    tags: ["ตึกแถว", "2 ชั้น", "160 ตร.ม.", "พาณิชย์", "ที่อยู่อาศัย"],
    difficulty: "hard",
    items: shophouse_2floor,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    usageCount: 78
  },
  {
    id: "shophouse-3floor",
    name: "ตึกแถว 3 ชั้น 4x20 ม.",
    description: "ตึกแถว 3 ชั้น 4x20 เมตร (240 ตร.ม.) ชั้น 1 พาณิชย์ ชั้น 2-3 ที่อยู่อาศัย",
    mainCategory: "commercial",
    area: 240,
    estimatedCost: 2650000,
    estimatedDays: 180,
    tags: ["ตึกแถว", "3 ชั้น", "240 ตร.ม.", "พาณิชย์", "ที่อยู่อาศัย"],
    difficulty: "hard",
    items: shophouse_3floor,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    usageCount: 62
  },
  {
    id: "shophouse-35floor",
    name: "ตึกแถว 3.5 ชั้น 5x20 ม. มีดาดฟ้า",
    description: "ตึกแถว 3.5 ชั้น 5x20 เมตร (350 ตร.ม.) พร้อมดาดฟ้า ชั้น 1 พาณิชย์ ชั้น 2-3 ที่อยู่อาศัย",
    mainCategory: "commercial",
    area: 350,
    estimatedCost: 3850000,
    estimatedDays: 210,
    tags: ["ตึกแถว", "3.5 ชั้น", "350 ตร.ม.", "พาณิชย์", "ดาดฟ้า"],
    difficulty: "hard",
    items: shophouse_35floor,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    usageCount: 51
  },
  
  // ห้องต่างๆ
  {
    id: "bathroom-basic",
    name: "ห้องน้ำเบสิค 2x2 ม.",
    description: "ห้องน้ำเบสิค ขนาด 2x2 เมตร สุขภัณฑ์เกรดมาตรฐาน",
    mainCategory: "room",
    area: 4,
    estimatedCost: 45000,
    estimatedDays: 10,
    tags: ["ห้องน้ำ", "เบสิค", "2x2 ม."],
    difficulty: "easy",
    items: bathroom_basic,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    usageCount: 234
  },
  {
    id: "bathroom-premium",
    name: "ห้องน้ำพรีเมียม 3x3 ม.",
    description: "ห้องน้ำพรีเมียม ขนาด 3x3 เมตร สุขภัณฑ์เกรดพรีเมียม พร้อม Rain Shower",
    mainCategory: "room",
    area: 9,
    estimatedCost: 85000,
    estimatedDays: 12,
    tags: ["ห้องน้ำ", "พรีเมียม", "3x3 ม.", "Rain Shower"],
    difficulty: "medium",
    items: bathroom_premium,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    usageCount: 167
  },
  {
    id: "bathroom-master",
    name: "ห้องน้ำมาสเตอร์ 4x4 ม.",
    description: "ห้องน้ำมาสเตอร์ ขนาด 4x4 เมตร พร้อมอ่างอาบน้ำ กระเบื้องนำเข้า",
    mainCategory: "room",
    area: 16,
    estimatedCost: 195000,
    estimatedDays: 15,
    tags: ["ห้องน้ำ", "มาสเตอร์", "4x4 ม.", "อ่างอาบน้ำ", "หรูหรา"],
    difficulty: "hard",
    items: bathroom_master,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    usageCount: 89
  },
  {
    id: "kitchen-basic",
    name: "ห้องครัวบิ้วอิน 3 ม.",
    description: "ห้องครัวบิ้วอิน ขนาด 3 เมตร พร้อมเคาน์เตอร์หินแกรนิต",
    mainCategory: "room",
    area: 9,
    estimatedCost: 85000,
    estimatedDays: 15,
    tags: ["ห้องครัว", "บิ้วอิน", "3 ม."],
    difficulty: "medium",
    items: kitchen_basic,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    usageCount: 189
  },
  {
    id: "kitchen-premium",
    name: "ห้องครัวพรีเมียม 4 ม. + ไอแลนด์",
    description: "ห้องครัวพรีเมียม ขนาด 4 เมตร พร้อมเคาน์เตอร์หินควอตซ์ ไอแลนด์ครัว เตาบิ้วอิน",
    mainCategory: "room",
    area: 20,
    estimatedCost: 185000,
    estimatedDays: 20,
    tags: ["ห้องครัว", "พรีเมียม", "4 ม.", "ไอแลนด์", "หินควอตซ์"],
    difficulty: "hard",
    items: kitchen_premium,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    usageCount: 124
  },
  {
    id: "bedroom-small",
    name: "ห้องนอนเล็ก 3x3 ม.",
    description: "ห้องนอนเล็ก ขนาด 3x3 เมตร พร้อมตู้เสื้อผ้าและโต๊ะทำงานบิ้วอิน",
    mainCategory: "room",
    area: 9,
    estimatedCost: 55000,
    estimatedDays: 10,
    tags: ["ห้องนอน", "เล็ก", "3x3 ม.", "บิ้วอิน"],
    difficulty: "easy",
    items: bedroom_small,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    usageCount: 198
  },
  {
    id: "dining-room",
    name: "ห้องทานข้าว 3x4 ม.",
    description: "ห้องทานข้าว ขนาด 3x4 เมตร พร้อมตู้โชว์บิ้วอิน ฝ้า และแอร์",
    mainCategory: "room",
    area: 12,
    estimatedCost: 45000,
    estimatedDays: 10,
    tags: ["ห้องทานข้าว", "3x4 ม.", "ตู้โชว์", "ฝ้า"],
    difficulty: "easy",
    items: dining_room,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    usageCount: 87
  },
  {
    id: "dressing-room",
    name: "ห้องแต่งตัว Walk-in 2x3 ม.",
    description: "ห้องแต่งตัว Walk-in Closet ขนาด 2x3 เมตร พร้อมตู้บิ้วอิน ชั้นวาง กระจกเงา และไฟ LED",
    mainCategory: "room",
    area: 6,
    estimatedCost: 65000,
    estimatedDays: 12,
    tags: ["ห้องแต่งตัว", "Walk-in", "2x3 ม.", "ตู้บิ้วอิน", "กระจกเงา"],
    difficulty: "medium",
    items: dressing_room,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    usageCount: 64
  },
  {
    id: "laundry-room",
    name: "ห้องซักล้าง 1.5x2 ม.",
    description: "ห้องซักล้าง ขนาด 1.5x2 เมตร พร้อมตู้บิ้วอิน ซิงค์ กันซึม และระบบระบายอากาศ",
    mainCategory: "room",
    area: 3,
    estimatedCost: 30000,
    estimatedDays: 8,
    tags: ["ห้องซักล้าง", "1.5x2 ม.", "ตู้บิ้วอิน", "ซิงค์", "กันซึม"],
    difficulty: "easy",
    items: laundry_room,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    usageCount: 71
  },
  {
    id: "bedroom-medium",
    name: "ห้องนอนกลาง 4x4 ม.",
    description: "ห้องนอนกลาง ขนาด 4x4 เมตร พร้อมตู้เสื้อผ้า โต๊ะทำงาน ชั้นหนังสือ และแอร์",
    mainCategory: "room",
    area: 16,
    estimatedCost: 98000,
    estimatedDays: 12,
    tags: ["ห้องนอน", "กลาง", "4x4 ม.", "แอร์"],
    difficulty: "medium",
    items: bedroom_medium,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    usageCount: 176
  },
  {
    id: "bedroom-master",
    name: "ห้องนอนมาสเตอร์ 5x6 ม.",
    description: "ห้องนอนมาสเตอร์ ขนาด 5x6 เมตร พื้นไม้จริง Walk-in Closet โต๊ะเครื่องแป้ง ระบบไฟอัจฉริยะ",
    mainCategory: "room",
    area: 30,
    estimatedCost: 245000,
    estimatedDays: 18,
    tags: ["ห้องนอน", "มาสเตอร์", "5x6 ม.", "Walk-in", "พื้นไม้จริง", "Smart Home"],
    difficulty: "hard",
    items: bedroom_master,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    usageCount: 112
  },
  {
    id: "living-room",
    name: "ห้องนั่งเล่น 5x6 ม.",
    description: "ห้องนั่งเล่น ขนาด 5x6 เมตร พร้อมชุดวางทีวี ฝ้ายิปซัม ม่านมอเตอร์ แอร์",
    mainCategory: "room",
    area: 30,
    estimatedCost: 165000,
    estimatedDays: 15,
    tags: ["ห้องนั่งเล่น", "5x6 ม.", "ชุดวางทีวี", "ฝ้ายิปซัม"],
    difficulty: "medium",
    items: living_room,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    usageCount: 145
  },
  {
    id: "balcony",
    name: "ระเบียง 2x4 ม.",
    description: "ระเบียง ขนาด 2x4 เมตร พื้นกันลื่น ราวกันตกสแตนเลส มุ้งลวด ตู้เก็บของ",
    mainCategory: "room",
    area: 8,
    estimatedCost: 42000,
    estimatedDays: 7,
    tags: ["ระเบียง", "2x4 ม.", "ราวกันตก", "กันลื่น"],
    difficulty: "easy",
    items: balcony,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    usageCount: 203
  },
  
  // รีโนเวท
  {
    id: "bathroom-renovation",
    name: "รีโนเวทห้องน้ำเต็มระบบ",
    description: "รีโนเวทห้องน้ำเต็มรูปแบบ รื้อของเดิม ทำใหม่ทั้งหมด เกรดพรีเมียม",
    mainCategory: "renovation",
    area: 6,
    estimatedCost: 95000,
    estimatedDays: 12,
    tags: ["รีโนเวท", "ห้องน้ำ", "พรีเมียม"],
    difficulty: "medium",
    items: bathroom_renovation,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    usageCount: 167
  },
  {
    id: "kitchen-renovation",
    name: "รีโนเวทห้องครัว 3 ม.",
    description: "รีโนเวทห้องครัว 3 เมตร รื้อของเดิม ตู้ครัวบิ้วอิน หินควอตซ์ กระเบื้อง ฮูด",
    mainCategory: "renovation",
    area: 12,
    estimatedCost: 125000,
    estimatedDays: 15,
    tags: ["รีโนเวท", "ห้องครัว", "ตู้บิ้วอิน", "หินควอตซ์"],
    difficulty: "medium",
    items: kitchen_renovation,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    usageCount: 143
  },
  {
    id: "bedroom-renovation",
    name: "รีโนเวทห้องนอน 4x4 ม.",
    description: "รีโนเวทห้องนอน 4x4 เมตร พื้นไม้ลามิเนต ตู้บิ้วอิน โต๊ะทำงาน ชั้นหนังสือ",
    mainCategory: "renovation",
    area: 16,
    estimatedCost: 95000,
    estimatedDays: 12,
    tags: ["รีโนเวท", "ห้องนอน", "ตู้บิ้วอิน", "พื้นไม้"],
    difficulty: "easy",
    items: bedroom_renovation,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    usageCount: 128
  },
  {
    id: "livingroom-renovation",
    name: "รีโนเวทห้องนั่งเล่น 5x6 ม.",
    description: "รีโนเวทห้องนั่งเล่น 5x6 เมตร กระเบื้องแกรนิตโต ฝ้ายิปซัม ชุดวางทีวีบิ้วอิน",
    mainCategory: "renovation",
    area: 30,
    estimatedCost: 165000,
    estimatedDays: 18,
    tags: ["รีโนเวท", "ห้องนั่งเล่น", "ฝ้ายิปซัม", "ชุดวางทีวี"],
    difficulty: "medium",
    items: livingroom_renovation,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    usageCount: 118
  },
  {
    id: "whole-house-renovation",
    name: "รีโนเวททั้งบ้าน 100 ตร.ม.",
    description: "รีโนเวททั้งบ้าน 100 ตร.ม. ทาสีทั้งหมด พื้น ห้องน้ำ ห้องครัว ไฟฟ้า ประปา",
    mainCategory: "renovation",
    area: 100,
    estimatedCost: 385000,
    estimatedDays: 45,
    tags: ["รีโนเวท", "ทั้งบ้าน", "100 ตร.ม.", "ครบวงจร"],
    difficulty: "hard",
    items: whole_house_renovation,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    usageCount: 95
  },
  {
    id: "paint-whole-house",
    name: "ทาสีทั้งบ้าน 100 ตร.ม.",
    description: "ทาสีใหม่ทั้งภายนอก-ภายใน 100 ตร.ม. ซ่อมรอยร้าว รองพื้น ทาสี 2 เที่ยว",
    mainCategory: "renovation",
    area: 100,
    estimatedCost: 85000,
    estimatedDays: 12,
    tags: ["ทาสี", "ทั้งบ้าน", "100 ตร.ม."],
    difficulty: "easy",
    items: paint_whole_house,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    usageCount: 186
  },
  
  // ห้องพิเศษ
  {
    id: "home-office",
    name: "ห้องทำงาน Home Office 3x3 ม.",
    description: "ห้องทำงาน 3x3 เมตร โต๊ะ L-Shape ชั้นหนังสือ ตู้เก็บเอกสาร ปลั๊ก+LAN+USB แอร์",
    mainCategory: "room",
    area: 9,
    estimatedCost: 75000,
    estimatedDays: 12,
    tags: ["Home Office", "3x3 ม.", "โต๊ะ L-Shape", "แอร์"],
    difficulty: "medium",
    items: home_office,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    usageCount: 132
  },
  {
    id: "home-gym",
    name: "ห้องยิม/ฟิตเนส 4x5 ม.",
    description: "ห้องยิม 4x5 เมตร พื้นยาง PVC กระจกเงาเต็มผนัง พัดลมอุตสาหกรรม แอร์",
    mainCategory: "room",
    area: 20,
    estimatedCost: 68000,
    estimatedDays: 10,
    tags: ["ห้องยิม", "4x5 ม.", "กระจกเงา", "พื้นยาง"],
    difficulty: "easy",
    items: home_gym,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    usageCount: 89
  },
  {
    id: "home-theater",
    name: "ห้องโฮมเธียเตอร์ 4x5 ม.",
    description: "ห้องโฮมเธียเตอร์ 4x5 เมตร ผนังกันเสียง พรม เบาะ 8 ที่นั่ง ระบบไฟ Dimmer",
    mainCategory: "room",
    area: 20,
    estimatedCost: 185000,
    estimatedDays: 15,
    tags: ["โฮมเธียเตอร์", "4x5 ม.", "กันเสียง", "เบาะนั่ง 8 ที่"],
    difficulty: "hard",
    items: home_theater,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    usageCount: 67
  },
  {
    id: "garage-extension",
    name: "ต่อเติมโรงรถ 4x6 ม.",
    description: "ต่อเติมโรงรถ 4x6 เมตร พื้นคอนกรีต โครงหลังคาเหล็ก มุงเมทัลชีท ประตูม้วนไฟฟ้า",
    mainCategory: "renovation",
    area: 24,
    estimatedCost: 135000,
    estimatedDays: 20,
    tags: ["ต่อเติม", "โรงรถ", "4x6 ม.", "ประตูม้วน"],
    difficulty: "medium",
    items: garage_extension,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    usageCount: 105
  },
  
  // ภูมิทัศน์พิเศษ
  {
    id: "swimming-pool",
    name: "สระว่ายน้ำ 4x8x1.5 ม.",
    description: "สระว่ายน้ำ 4x8x1.5 เมตร กันซึม กระเบื้องโมเสก ระบบกรอง ไฟใต้น้ำ LED",
    mainCategory: "landscape",
    area: 32,
    estimatedCost: 485000,
    estimatedDays: 30,
    tags: ["สระว่ายน้ำ", "4x8 ม.", "ระบบกรอง", "ไฟใต้น้ำ"],
    difficulty: "hard",
    items: swimming_pool,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    usageCount: 73
  },
  {
    id: "sala-garden",
    name: "ศาลาพักผ่อน 3x3 ม.",
    description: "ศาลาไม้เนื้อแข็ง 3x3 เมตร มุงกระเบื้องดินเผา พื้นไม้ ราวกันตก โคมไฟสวน",
    mainCategory: "landscape",
    area: 9,
    estimatedCost: 95000,
    estimatedDays: 15,
    tags: ["ศาลา", "3x3 ม.", "ไม้เนื้อแข็ง", "กระเบื้องดินเผา"],
    difficulty: "medium",
    items: sala_garden,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    usageCount: 82
  },
  
  // บิ้วอิน
  {
    id: "wardrobe-standard",
    name: "ตู้เสื้อผ้าบิ้วอิน 2.5 ม.",
    description: "ตู้เสื้อผ้าบิ้วอิน เมลามีน บานเลื่อนกระจก 2.5 เมตร",
    mainCategory: "builtin",
    area: 6,
    estimatedCost: 28000,
    estimatedDays: 7,
    tags: ["ตู้เสื้อผ้า", "บิ้วอิน", "2.5 ม."],
    difficulty: "easy",
    items: wardrobe_standard,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    usageCount: 312
  },
  {
    id: "tv-console",
    name: "ชุดวางทีวี บิ้วอิน 2.5 ม.",
    description: "ชุดวางทีวี บิ้วอิน 2.5 เมตร พร้อมชั้นวางอุปกรณ์ ลิ้นชัก ไฟ LED RGB",
    mainCategory: "builtin",
    area: 5,
    estimatedCost: 32000,
    estimatedDays: 7,
    tags: ["ชุดวางทีวี", "บิ้วอิน", "2.5 ม.", "LED RGB"],
    difficulty: "easy",
    items: tv_console,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    usageCount: 287
  },
  {
    id: "walkin-closet",
    name: "Walk-in Closet 3x2 ม.",
    description: "Walk-in Closet ขนาด 3x2 เมตร ชั้นวาง 3 ด้าน ราวแขวน ลิ้นชัก กระจกเต็มตัว Motion Sensor",
    mainCategory: "builtin",
    area: 6,
    estimatedCost: 78000,
    estimatedDays: 12,
    tags: ["Walk-in Closet", "3x2 ม.", "กระจก", "Motion Sensor", "หรูหรา"],
    difficulty: "hard",
    items: walkin_closet,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    usageCount: 154
  },
  {
    id: "bookshelf",
    name: "ชั้นหนังสือบิ้วอิน 2.5 ม.",
    description: "ชั้นหนังสือบิ้วอิน 2.5 เมตร ชั้นปรับระดับได้ ลิ้นชัก ไฟ LED ใต้ชั้น",
    mainCategory: "builtin",
    area: 3,
    estimatedCost: 22000,
    estimatedDays: 5,
    tags: ["ชั้นหนังสือ", "บิ้วอิน", "2.5 ม.", "LED"],
    difficulty: "easy",
    items: bookshelf,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    usageCount: 245
  },
  {
    id: "work-desk",
    name: "โต๊ะทำงาน บิ้วอิน 1.8 ม.",
    description: "โต๊ะทำงาน บิ้วอิน 1.8 เมตร พร้อมลิ้นชัก ชั้นวาง ช่องเดินสาย ปลั๊ก USB ไฟอ่านหนังสือ",
    mainCategory: "builtin",
    area: 2,
    estimatedCost: 26000,
    estimatedDays: 6,
    tags: ["โต๊ะทำงาน", "บิ้วอิน", "1.8 ม.", "USB", "Work from Home"],
    difficulty: "easy",
    items: work_desk,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    usageCount: 298
  },
  {
    id: "shoe-cabinet",
    name: "ตู้รองเท้า บิ้วอิน 1.5 ม.",
    description: "ตู้รองเท้า บิ้วอิน 1.5 เมตร ชั้นวาง 6 ชั้น ระบายอากาศ ที่นั่ง ไฟเซ็นเซอร์",
    mainCategory: "builtin",
    area: 2,
    estimatedCost: 18000,
    estimatedDays: 5,
    tags: ["ตู้รองเท้า", "บิ้วอิน", "1.5 ม.", "ที่นั่ง", "เซ็นเซอร์"],
    difficulty: "easy",
    items: shoe_cabinet,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    usageCount: 267
  },
  {
    id: "dressing-table",
    name: "โต๊ะเครื่องแป้ง บิ้วอิน 1.2 ม.",
    description: "โต๊ะเครื่องแป้ง บิ้วอิน 1.2 เมตร กระจก LED Hollywood Style ลิ้นชัก 4 ลิ้นชัก ช่องเครื่องประดับ",
    mainCategory: "builtin",
    area: 2,
    estimatedCost: 29000,
    estimatedDays: 6,
    tags: ["โต๊ะเครื่องแป้ง", "บิ้วอิน", "1.2 ม.", "Hollywood LED", "ลิ้นชัก"],
    difficulty: "medium",
    items: dressing_table,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    usageCount: 189
  },
  {
    id: "pantry-cabinet",
    name: "ตู้ครัวเล็ก (Pantry) 2 ม.",
    description: "ตู้ครัวเล็ก Pantry 2 เมตร ตู้ล่าง+บน เคาน์เตอร์หินแกรนิต อ่างล้างจาน ก๊อกน้ำ",
    mainCategory: "builtin",
    area: 4,
    estimatedCost: 38000,
    estimatedDays: 8,
    tags: ["ตู้ครัว", "Pantry", "2 ม.", "หินแกรนิต"],
    difficulty: "medium",
    items: pantry_cabinet,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    usageCount: 176
  },
  
  // ร้านอาหาร/คาเฟ่
  {
    id: "cafe-small-40",
    name: "ร้านกาแฟเล็ก 40 ตร.ม.",
    description: "ร้านกาแฟขนาดเล็ก 40 ตารางเมตร ที่นั่ง 15-20 ที่ พร้อมครัวเบา ระบบกล้อง",
    mainCategory: "commercial",
    area: 40,
    estimatedCost: 450000,
    estimatedDays: 30,
    tags: ["ร้านกาแฟ", "คาเฟ่", "40 ตร.ม.", "ครัวเบา"],
    difficulty: "medium",
    items: cafe_small_40sqm,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    usageCount: 87
  },
  {
    id: "restaurant-80",
    name: "ร้านอาหาร 80 ตร.ม.",
    description: "ร้านอาหารขนาดกลาง 80 ตารางเมตร ที่นั่ง 40-50 ที่ พร้อมครัวหนัก ระบบดูดควัน ระบบแก๊ส บ่อดักไขมัน",
    mainCategory: "commercial",
    area: 80,
    estimatedCost: 850000,
    estimatedDays: 45,
    tags: ["ร้านอาหาร", "80 ตร.ม.", "ครัวหนัก", "ระบบแก๊ส"],
    difficulty: "hard",
    items: restaurant_80sqm,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    usageCount: 64
  },
];
