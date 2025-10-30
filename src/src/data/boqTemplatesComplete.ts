import { BOQItem } from "../types/boq";

/**
 * BOQ Templates - บ้านหนึ่งหลังแบบสมบูรณ์
 * ตามมาตรฐานการก่อสร้าง 14 หมวดหมู่
 * 
 * หมวดหมู่:
 * 1. Preliminary (งานเตรียมการ)
 * 2. โครงสร้าง
 * 3. หลังคา
 * 4. ผนัง
 * 5. ช่องเปิด
 * 6. ฝ้า-ผนังกั้น
 * 7. พื้น
 * 8. สี-เคลือบ
 * 9. สุขาภิบาล
 * 10. ไฟฟ้า-แสงสว่าง
 * 11. แอร์
 * 12. บิ้วอิน
 * 13. งานภายนอก
 * 14. ทดสอบ-ส่งมอบ
 * 
 * กฎการคำนวณ:
 * - ความสูงผนังเฉลี่ย 2.8 ม. → ผนังรวม ≈ 2.8 × พื้นที่พื้น
 * - ฝ้า/พื้น ต่อพื้นที่ 1:1
 * - จุดไฟ-ปลั๊ก-LAN เบื้องต้น ≈ 0.08 จุด/ม²
 * 
 * เวอร์ชัน: 2.0 Complete
 * วันที่: 2025-10-29
 */

// ==================== บ้าน 2 ชั้น 150 ตร.ม. (แบบสมบูรณ์) ====================
export const house_2floor_150_complete: BOQItem[] = [
  // ===== 1. PRELIMINARY (งานเตรียมการ) =====
  { id: "hp-001", name: "ขนย้ายวัสดุเข้า-ออกพื้นที่", category: "งานเตรียมการ", subcategory: "ขนย้าย", unit: "lot", material: 15000, labor: 8000, quantity: 1 },
  { id: "hp-002", name: "ไฟฟ้าชั่วคราว 3 เดือน", category: "งานเตรียมการ", subcategory: "ไฟ-น้ำชั่วคราว", unit: "month", material: 1200, labor: 0, quantity: 6 },
  { id: "hp-003", name: "น้ำประปาชั่วคราว 3 เดือน", category: "งานเตรียมการ", subcategory: "ไฟ-น้ำชั่วคราว", unit: "month", material: 800, labor: 0, quantity: 6 },
  { id: "hp-004", name: "รั้วชั่วคราว สังกะสี", category: "งานเตรียมการ", subcategory: "รั้วชั่วคราว", unit: "m", material: 180, labor: 120, quantity: 60 },
  { id: "hp-005", name: "นั่งร้านคนงาน พร้อมห้องน้ำ", category: "งานเตรียมการ", subcategory: "นั่งร้าน", unit: "set", material: 12000, labor: 3000, quantity: 1 },
  { id: "hp-006", name: "อุปกรณ์ความปลอดภัย (หมวก,เข็มขัด)", category: "งานเตรียมการ", subcategory: "ความปลอดภัย", unit: "set", material: 8000, labor: 0, quantity: 1 },
  { id: "hp-007", name: "ทำความสะอาดรายวัน", category: "งานเตรียมการ", subcategory: "ทำความสะอาด", unit: "month", material: 0, labor: 3500, quantity: 6 },
  { id: "hp-008", name: "เก็บเศษวัสดุเหลือใช้", category: "งานเตรียมการ", subcategory: "เก็บเศษ", unit: "lot", material: 5000, labor: 8000, quantity: 1 },

  // ===== 2. โครงสร้าง =====
  // งานฐานราก
  { id: "hs-001", name: "ขุดดินหลุมเสา", category: "โครงสร้าง", subcategory: "ฐานราก", unit: "m3", material: 0, labor: 120, quantity: 24 },
  { id: "hs-002", name: "คอนกรีตผสมเสร็จ 180 ksc ฐานราก", category: "โครงสร้าง", subcategory: "ฐานราก", unit: "m3", material: 2200, labor: 0, quantity: 8 },
  { id: "hs-003", name: "เหล็กเส้นฐานราก Ø12 มม.", category: "โครงสร้าง", subcategory: "เหล็ก���ส้น", unit: "kg", material: 20, labor: 5, quantity: 650 },
  { id: "hs-004", name: "ถมดินคืน บดอัด", category: "โครงสร้าง", subcategory: "ฐานราก", unit: "m3", material: 80, labor: 120, quantity: 18 },
  
  // คาน-เสา
  { id: "hs-010", name: "คอนกรีตผสมเสร็จ 210 ksc เสา-คาน", category: "โครงสร้าง", subcategory: "คอนกรีต", unit: "m3", material: 2384, labor: 0, quantity: 22 },
  { id: "hs-011", name: "เหล็กเส้น SD40 Ø12 มม.", category: "โครงสร้าง", subcategory: "เหล็กเส้น", unit: "kg", material: 20, labor: 5, quantity: 2800 },
  { id: "hs-012", name: "เหล็กข้ออ้อย SD40 Ø16 มม.", category: "โครงสร้าง", subcategory: "เหล็กเส้น", unit: "kg", material: 23, labor: 6, quantity: 1800 },
  
  // พื้นชั้นล่าง-ชั้นบน
  { id: "hs-020", name: "คอนกรีตผสมเสร็จ 210 ksc พื้นชั้น", category: "โครงสร้าง", subcategory: "คอนกรีต", unit: "m3", material: 2384, labor: 0, quantity: 18 },
  { id: "hs-021", name: "เหล็กข่ายพื้น Ø9 มม. 15x15 ซม.", category: "โครงสร้าง", subcategory: "เหล็กเส้น", unit: "kg", material: 18, labor: 4.5, quantity: 1200 },
  { id: "hs-022", name: "แผ่นพื้น Hollow Core 15 ซม.", category: "โครงสร้าง", subcategory: "แผ่นพื้นสำเร็จ", unit: "m2", material: 520, labor: 180, quantity: 75 },
  
  // บันไดคอนกรีต
  { id: "hs-030", name: "บันไดคอนกรีต ตกแต่งหินอ่อน", category: "โครงสร้าง", subcategory: "บันได", unit: "m2", material: 850, labor: 450, quantity: 15 },
  { id: "hs-031", name: "ราวบันไดสแตนเลส Ø38 มม.", category: "โครงสร้าง", subcategory: "บันได", unit: "m", material: 850, labor: 350, quantity: 12 },
  
  // กันซึมโครงสร้างจุดวิกฤต
  { id: "hs-040", name: "กันซึมซีเมนต์พอลิเมอร์ 2K ระเบียง", category: "โครงสร้าง", subcategory: "กันซึม", unit: "m2", material: 180, labor: 120, quantity: 25 },
  { id: "hs-041", name: "เมมเบรนบิทูมินัส ดาดฟ้า", category: "โครงสร้าง", subcategory: "กันซึม", unit: "m2", material: 320, labor: 160, quantity: 75 },

  // ===== 3. หลังคา =====
  // โครงหลังคา
  { id: "hr-001", name: "เหล็กกล่อง 2x1 นิ้ว โครงหลังคา", category: "สถาปัตยกรรมภายนอก", subcategory: "โครงเหล็ก", unit: "kg", material: 42, labor: 18, quantity: 850 },
  { id: "hr-002", name: "เหล็กกล่อง 1.5x1.5 นิ้ว ระแนง", category: "สถาปัตยกรรมภายนอก", subcategory: "โครงเหล็ก", unit: "kg", material: 42, labor: 18, quantity: 420 },
  { id: "hr-003", name: "ทาสีเหล็กกันสนิม+สีน้ำมัน", category: "สถาปัตยกรรมภายนอก", subcategory: "ทาสี", unit: "m2", material: 45, labor: 55, quantity: 180 },
  
  // แผ่นมุง
  { id: "hr-010", name: "เมทัลชีท 0.47 มม. PU 25 มม.", category: "สถาปัตยกรรมภายนอก", subcategory: "หลังคา", unit: "m2", material: 320, labor: 220, quantity: 90 },
  
  // แผ่นปิดเชิงชาย/ครอบ
  { id: "hr-020", name: "คิ้วอลูมิเนียมตัวจบ J/U", category: "สถาปัตยกรรมภายนอก", subcategory: "อุปกรณ์", unit: "m", material: 60, labor: 40, quantity: 85 },
  { id: "hr-021", name: "ครอบสันหลังคา อลูมิเนียม", category: "สถาปัตยกรรมภายนอก", subcategory: "หลังคา", unit: "m", material: 180, labor: 90, quantity: 18 },
  
  // ฉนวนกันความร้อน
  { id: "hr-030", name: "ฉนวน PE ใต้หลังคา 5 มม.", category: "สถาปัตยกรรมภายนอก", subcategory: "ฉนวน", unit: "m2", material: 250, labor: 50, quantity: 90 },
  
  // รางน้ำ-ท่อน้ำฝน
  { id: "hr-040", name: "รางน้ำสังกะสี 0.5 มม.", category: "สถาปัตยกรรมภายนอก", subcategory: "ระบายน้ำ", unit: "m", material: 120, labor: 80, quantity: 48 },
  { id: "hr-041", name: "ท่อเดรนลงฝน UPVC 3\\\"", category: "สถาปัตยกรรมภายนอก", subcategory: "ระบายน้ำ", unit: "m", material: 120, labor: 70, quantity: 24 },
  
  // กันซึมรอยต่อ
  { id: "hr-050", name: "PU ซีลอนต์รอยต่อหลังคา", category: "สถาปัตยกรรมภายนอก", subcategory: "ซีล", unit: "m", material: 65, labor: 45, quantity: 50 },

  // ===== 4. ผนัง =====
  // ก่ออิฐ
  { id: "hw-001", name: "ผนังอิฐมอญ ก่อ+ฉาบ", category: "สถาปัตยกรรมภายนอก", subcategory: "ก่ออิฐ", unit: "m2", material: 260, labor: 140, quantity: 420 },
  
  // ฉาบ-สกิม
  { id: "hw-010", name: "ฉาบปูนเรียบ สกิมโคท", category: "สถาปัตยกรรมภายใน", subcategory: "ฉาบปูน", unit: "m2", material: 35, labor: 45, quantity: 400 },
  
  // กันซึมห้องเปียก
  { id: "hw-020", name: "กันซึมซีเมนต์พอลิเมอร์ห้องน้ำ", category: "สถาปัตยกรรมภายใน", subcategory: "กันซึม", unit: "m2", material: 180, labor: 120, quantity: 68 },
  
  // ใส่ตาข่ายตามรอยต่อ���ครงสร้าง
  { id: "hw-030", name: "ตาข่ายไฟเบอร์กลาสรอยต่อ", category: "สถาปัตยกรรมภายใน", subcategory: "อุปกรณ์", unit: "m", material: 25, labor: 20, quantity: 180 },

  // ===== 5. ช่องเปิด =====
  // วงกบ
  { id: "hd-001", name: "วงกบ UPVC ประตู 80x200 ซม.", category: "สถาปัตยกรรมภายนอก", subcategory: "ประตู", unit: "pcs", material: 1200, labor: 400, quantity: 1 },
  { id: "hd-002", name: "วงกบอลูมิเนียมหน้าต่าง", category: "สถาปัตยกรรมภายนอก", subcategory: "หน้าต่าง", unit: "m2", material: 780, labor: 320, quantity: 28 },
  
  // บานประตู-หน้าต่าง
  { id: "hd-010", name: "ประตูภายนอก UPVC พร้อมวงกบ", category: "สถาปัตยกรรมภายนอก", subcategory: "ประตู", unit: "pcs", material: 2400, labor: 700, quantity: 1 },
  { id: "hd-011", name: "กรอบบานประตูไม้ HDF", category: "สถาปัตยกรรมภายใน", subcategory: "ประตู", unit: "pcs", material: 900, labor: 250, quantity: 8 },
  { id: "hd-012", name: "กรอบ uPVC บานเลื่อน 2 ราง + มุ้ง", category: "สถาปัตยกรรมภายนอก", subcategory: "หน้าต่าง", unit: "m2", material: 980, labor: 400, quantity: 28 },
  
  // กระจก
  { id: "hd-020", name: "กระจกใส 5 มม. พร้อมติดตั้ง", category: "สถาปัตยกรรมภายนอก", subcategory: "กระจก", unit: "m2", material: 280, labor: 120, quantity: 15 },
  
  // อุปกรณ์บาน
  { id: "hd-030", name: "กุญแจลูกบิด มอก.", category: "สถาปัตยกรรมภายใน", subcategory: "อุปกรณ์", unit: "set", material: 380, labor: 80, quantity: 9 },
  { id: "hd-031", name: "บานพับสแตนเลส 3\\\" x 3\\\"", category: "สถาปัตยกรรมภายใน", subcategory: "อุปกรณ์", unit: "set", material: 120, labor: 40, quantity: 24 },
  
  // มุ้งลวด
  { id: "hd-040", name: "มุ้งลวดอลูมิเนียม พร้อมกรอบ", category: "สถาปัตยกรรมภายนอก", subcategory: "หน้าต่าง", unit: "m2", material: 180, labor: 90, quantity: 28 },
  
  // ซีลแลนต์
  { id: "hd-050", name: "ซิลิโคนซีลแลนต์ช่องเปิด", category: "สถาปัตยกรรมภายนอก", subcategory: "ซีล", unit: "m", material: 45, labor: 35, quantity: 120 },

  // ===== 6. ฝ้า-ผนังกั้น =====
  // ฝ้ายิปซัม
  { id: "hc-001", name: "ฝ้ายิปซัมบอร์ด 9 มม. + โครง", category: "สถาปัตยกรรมภายใน", subcategory: "ฝ้าเพดาน", unit: "m2", material: 280, labor: 180, quantity: 150 },
  
  // โครงผนังเบา
  { id: "hc-010", name: "ผนังยิปซัม 2 ชั้น + โครง", category: "สถาปัตยกรรมภายใน", subcategory: "ผนังกั้น", unit: "m2", material: 420, labor: 280, quantity: 45 },
  
  // แผ่นกันชื้นในพื้นที่เปียก
  { id: "hc-020", name: "แผ่นยิปซัมกันชื้น สีเขียว", category: "สถาปัตยกรรมภายใน", subcategory: "ฝ้าเพดาน", unit: "m2", material: 350, labor: 200, quantity: 20 },
  
  // ฉนวนกันเสียงเฉพาะห้อง
  { id: "hc-030", name: "ใยแก้ว 25 มม. 24kg/m3", category: "สถาปัตยกรรมภายใน", subcategory: "ฉนวน", unit: "m2", material: 180, labor: 120, quantity: 45 },

  // ===== 7. พื้น =====
  // ปูนปรับระดับ
  { id: "hf-001", name: "ปูนปรับระดับ 1:3 หนา 3 ซม.", category: "สถาปัตยกรรมภายใน", subcategory: "พื้น", unit: "m2", material: 85, labor: 65, quantity: 150 },
  
  // กระเบื้อง/ลามิเนต/ขัดมัน
  { id: "hf-010", name: "กระเบื้องแกรนิตโต 60x60 ซม.", category: "สถาปัตยกรรมภายใน", subcategory: "พื้น", unit: "m2", material: 380, labor: 180, quantity: 85 },
  { id: "hf-011", name: "พื้นลามิเนต 12 มม. AC4", category: "สถาปัตยกรรมภายใน", subcategory: "พื้น", unit: "m2", material: 420, labor: 150, quantity: 65 },
  
  // บัวพื้น
  { id: "hf-020", name: "บัวพื้นไม้ MDF 3 นิ้ว", category: "สถาปัตยกรรมภายใน", subcategory: "บัวพื้น", unit: "m", material: 45, labor: 35, quantity: 180 },
  
  // ตัวรองรับระดับพื้นต่างสเปก
  { id: "hf-030", name: "คานรับพื้นระดับต่าง", category: "สถาปัตยกรรมภายใน", subcategory: "โครงพื้น", unit: "m", material: 280, labor: 180, quantity: 25 },

  // ===== 8. สี-เคลือบ =====
  // สีรองพื้น-สีจริงภายใน/ภายนอก
  { id: "hp-001", name: "รองพื้นปูนใหม่กันด่าง", category: "สถาปัตยกรรมภายนอก", subcategory: "ทาสี", unit: "m2", material: 25, labor: 20, quantity: 420 },
  { id: "hp-002", name: "ทาสีอะครีลิคภายนอก 2 เที่ยว", category: "สถาปัตยกรรมภายนอก", subcategory: "ทาสี", unit: "m2", material: 55, labor: 45, quantity: 420 },
  { id: "hp-003", name: "ทาสีอะครีลิคภายใน 2 เที่ยว", category: "สถาปัตยกรรมภายใน", subcategory: "ทาสี", unit: "m2", material: 45, labor: 35, quantity: 550 },
  
  // เคลือบไม้/เหล็ก
  { id: "hp-010", name: "ยาทาไม้ชนิดเคลือบเงา", category: "สถาปัตยกรรมภายใน", subcategory: "ทาสี", unit: "m2", material: 85, labor: 55, quantity: 35 },
  
  // ทากันซึมพื้น-ผนังเปียก
  { id: "hp-020", name: "กันซึมซีเมนต์พอลิเมอร์พื้นห้องน้ำ", category: "สถาปัตยกรรมภายใน", subcategory: "กันซึม", unit: "m2", material: 180, labor: 120, quantity: 24 },

  // ===== 9. สุขาภิบาล =====
  // ท่อน้ำดี-ทิ้ง
  { id: "hsa-001", name: "ท่อ PVC 1/2\\\" น้ำดี", category: "ระบบ MEP", subcategory: "ประปา", unit: "m", material: 45, labor: 35, quantity: 85 },
  { id: "hsa-002", name: "ท่อ PVC 2\\\" น้ำดี", category: "ระบบ MEP", subcategory: "ประปา", unit: "m", material: 65, labor: 45, quantity: 55 },
  { id: "hsa-003", name: "ท่อ PVC 2\\\" น้ำทิ้ง", category: "ระบบ MEP", subcategory: "ระบายน้ำ", unit: "m", material: 70, labor: 50, quantity: 45 },
  { id: "hsa-004", name: "ท่อ PVC 4\\\" ระบายน้ำ", category: "ระบบ MEP", subcategory: "ระบายน้ำ", unit: "m", material: 85, labor: 55, quantity: 38 },
  
  // กรีซแทรป
  { id: "hsa-010", name: "กรีซแทรป PVC ห้องครัว", category: "ระบบ MEP", subcategory: "ระบายน้ำ", unit: "pcs", material: 850, labor: 350, quantity: 1 },
  
  // ถังน้ำ-ปั๊ม-วาล์วหลัก
  { id: "hsa-020", name: "ถังเก็บน้ำ PE 1000 ลิตร", category: "ระบบ MEP", subcategory: "ประปา", unit: "pcs", material: 3500, labor: 800, quantity: 1 },
  { id: "hsa-021", name: "ปั๊มน้ำ 200W อัตโนมัติ", category: "ระบบ MEP", subcategory: "ประปา", unit: "set", material: 4200, labor: 1200, quantity: 1 },
  { id: "hsa-022", name: "วาล์วปิด-เปิดน้ำหลัก 1\\\"", category: "ระบบ MEP", subcategory: "ประปา", unit: "pcs", material: 380, labor: 150, quantity: 3 },
  
  // สุขภัณฑ์
  { id: "hsa-030", name: "สุขภัณฑ์ชิ้นเดียว เกรดมาตรฐาน", category: "ระบบ MEP", subcategory: "สุขภัณฑ์", unit: "set", material: 4000, labor: 800, quantity: 2 },
  { id: "hsa-031", name: "สุขภัณฑ์ชิ้นเดียว เกรดพรีเมียม", category: "ระบบ MEP", subcategory: "สุขภัณฑ์", unit: "set", material: 6500, labor: 1000, quantity: 1 },
  { id: "hsa-032", name: "อ่างล้างหน้า + ก๊อก", category: "ระบบ MEP", subcategory: "สุขภัณฑ์", unit: "set", material: 2800, labor: 600, quantity: 3 },
  { id: "hsa-033", name: "ฝักบัวอาบน้ำ + ก๊อก", category: "ระบบ MEP", subcategory: "สุขภัณฑ์", unit: "set", material: 1800, labor: 450, quantity: 3 },
  
  // เครื่องทำน้ำอุ่น
  { id: "hsa-040", name: "เครื่องทำน้ำอุ่น 3500W", category: "ระบบ MEP", subcategory: "สุขภัณฑ์", unit: "set", material: 2800, labor: 800, quantity: 2 },
  
  // ทดสอบแรงดัน-รั่วซึม
  { id: "hsa-050", name: "ทดสอบความดันน้ำ 10 บาร์", category: "ระบบ MEP", subcategory: "ทดสอบ", unit: "lot", material: 0, labor: 2500, quantity: 1 },

  // ===== 10. ไฟฟ้า-แสงสว่าง =====
  // ตู้เมน-กราวด์
  { id: "he-001", name: "ตู้ไฟ MDB 16 ช่อง", category: "ระบบ MEP", subcategory: "ไฟฟ้า", unit: "set", material: 4500, labor: 1500, quantity: 1 },
  { id: "he-002", name: "ตู้ไฟย่อย DB 8 ช่อง", category: "ระบบ MEP", subcategory: "ไฟฟ้า", unit: "set", material: 2800, labor: 900, quantity: 1 },
  { id: "he-003", name: "ระบบกราวด์ เสาทองแดง", category: "ระบบ MEP", subcategory: "ไฟฟ้า", unit: "set", material: 3200, labor: 1200, quantity: 1 },
  
  // ท่อ-สาย-ราง
  { id: "he-010", name: "ท่อร้อยสาย PVC 3/4\\\"", category: "ระบบ MEP", subcategory: "ไฟฟ้า", unit: "m", material: 35, labor: 25, quantity: 280 },
  { id: "he-011", name: "สายไฟ THW 2x2.5 ตร.มม.", category: "ระบบ MEP", subcategory: "ไฟฟ้า", unit: "m", material: 28, labor: 12, quantity: 450 },
  { id: "he-012", name: "สายไฟ THW 2x4 ตร.มม.", category: "ระบบ MEP", subcategory: "ไฟฟ้า", unit: "m", material: 42, labor: 15, quantity: 180 },
  
  // จุดปลั๊ก-สวิตช์-ดวงโคม (150 ตร.ม. x 0.08 = 12 จุด)
  { id: "he-020", name: "จุดปลั๊กไฟ พร้อมสายและท่อ", category: "ระบบ MEP", subcategory: "ไฟฟ้า", unit: "point", material: 320, labor: 250, quantity: 55 },
  { id: "he-021", name: "จุดสวิตช์ไฟ 1 ช่อง", category: "ระบบ MEP", subcategory: "ไฟฟ้า", unit: "point", material: 180, labor: 120, quantity: 28 },
  { id: "he-022", name: "จุดโคมไฟภายใน LED 9W", category: "ระบบ MEP", subcategory: "ไฟฟ้า", unit: "point", material: 400, labor: 250, quantity: 45 },
  { id: "he-023", name: "จุดไฟส่องนอกอาคาร 12W", category: "ระบบ MEP", subcategory: "ไฟฟ้า", unit: "point", material: 850, labor: 350, quantity: 8 },
  
  // ระบบ LAN/โทรศัพท์/กล้องเตรียมท่อ
  { id: "he-030", name: "จุด LAN Cat6 เตรียมท่อ", category: "ระบบ MEP", subcategory: "สื่อสาร", unit: "point", material: 280, labor: 180, quantity: 12 },
  { id: "he-031", name: "จุดเตรียมท่อกล้อง CCTV", category: "ระบบ MEP", subcategory: "สื่อสาร", unit: "point", material: 150, labor: 100, quantity: 6 },
  
  // SPD/RCBO ตามความเหมาะสม
  { id: "he-040", name: "SPD กันฟ้าผ่า Type 2", category: "ระบบ MEP", subcategory: "ไฟฟ้า", unit: "set", material: 2800, labor: 800, quantity: 1 },
  { id: "he-041", name: "RCBO 16A กันดูด 30mA", category: "ระบบ MEP", subcategory: "ไฟฟ้า", unit: "pcs", material: 850, labor: 150, quantity: 4 },

  // ===== 11. แอร์ =====
  // เครื่อง split ตามห้องหลัก
  { id: "ha-001", name: "แอร์บ้าน 12,000 BTU พร้อมติดตั้ง", category: "ระบบ MEP", subcategory: "แอร์", unit: "set", material: 15000, labor: 2200, quantity: 2 },
  { id: "ha-002", name: "แอร์บ้าน 18,000 BTU พร้อมติดตั้ง", category: "ระบบ MEP", subcategory: "แอร์", unit: "set", material: 18000, labor: 2500, quantity: 2 },
  
  // ท่อทองแดง-ฉนวน-ระบายน้ำ
  { id: "ha-010", name: "ท่อทองแดงพร้อมฉนวน 1/4\\\" + 3/8\\\"", category: "ระบบ MEP", subcategory: "แอร์", unit: "m", material: 180, labor: 80, quantity: 65 },
  { id: "ha-011", name: "ท่อระบายน้ำแอร์ PVC 1/2\\\"", category: "ระบบ MEP", subcategory: "แอร์", unit: "m", material: 35, labor: 25, quantity: 50 },
  
  // เบรกเกอร์เฉพาะ
  { id: "ha-020", name: "เบรกเกอร์แอร์ 20A", category: "ระบบ MEP", subcategory: "ไฟฟ้า", unit: "pcs", material: 350, labor: 120, quantity: 4 },
  
  // ขาแขวน/ฐานรองคอนเดนซิ่ง
  { id: "ha-030", name: "ขาแขวนคอนเดนเซอร์", category: "ระบบ MEP", subcategory: "แอร์", unit: "set", material: 850, labor: 350, quantity: 4 },

  // ===== 12. บิ้วอิน =====
  // ชุดครัวพื้นฐาน
  { id: "hbi-001", name: "ชุดครัวตัวล่าง Melamine 2.0 ม.", category: "สถาปัตยกรรมภายใน", subcategory: "บิ้วอิน", unit: "m", material: 6500, labor: 2200, quantity: 2 },
  { id: "hbi-002", name: "ชุดครัวตัวบน Melamine 1.5 ม.", category: "สถาปัตยกรรมภายใน", subcategory: "บิ้วอิน", unit: "m", material: 4500, labor: 1500, quantity: 1.5 },
  { id: "hbi-003", name: "เคาน์เตอร์หินแกรนิต 60 ซม.", category: "สถาปัตยกรรมภายใน", subcategory: "บิ้วอิน", unit: "m", material: 2800, labor: 800, quantity: 2 },
  { id: "hbi-004", name: "ซิงค์ล้างจาน 1 หลุม สแตนเลส", category: "สถาปัตยกรรมภายใน", subcategory: "บิ้วอิน", unit: "set", material: 1800, labor: 450, quantity: 1 },
  
  // ตู้เสื้อผ้า (มินิมอล)
  { id: "hbi-010", name: "ตู้เสื้อผ้า Melamine 2.0 ม.", category: "สถาปัตยกรรมภายใน", subcategory: "บิ้วอิน", unit: "m", material: 5500, labor: 1800, quantity: 8 },
  
  // เคาน์เตอร์อ่างล้างหน้าแบบสำเร็จ
  { id: "hbi-020", name: "เคาน์เตอร์ห้องน้ำพร้อมอ่าง", category: "สถาปัตยกรรมภายใน", subcategory: "บิ้วอิน", unit: "set", material: 4800, labor: 1200, quantity: 2 },

  // ===== 13. งานภายนอก =====
  // ปรับพื้นที่
  { id: "hex-001", name: "ปรับพื้นที่ ถมดินบดอัด", category: "สถาปัตยกรรมภายนอก", subcategory: "ถมดิน", unit: "m3", material: 120, labor: 80, quantity: 45 },
  
  // ทางรถ/ลานจอด
  { id: "hex-010", name: "คสล. ทางรถ หนา 10 ซม.", category: "สถาปัตยกรรมภายนอก", subcategory: "ทางเดิน", unit: "m2", material: 420, labor: 280, quantity: 30 },
  { id: "hex-011", name: "ลานจอดรถ พื้น Interlocking", category: "สถาปัตยกรรมภายนอก", subcategory: "ทางเดิน", unit: "m2", material: 380, labor: 220, quantity: 25 },
  
  // รั้ว-ประตู
  { id: "hex-020", name: "รั้วคอนกรีตสำเร็จรูป สูง 1.8 ม.", category: "สถาปัตยกรรมภายนอก", subcategory: "รั้ว", unit: "m", material: 850, labor: 450, quantity: 40 },
  { id: "hex-021", name: "ประตูเหล็กบานเลื่อน 3 ม.", category: "สถาปัตยกรรมภายนอก", subcategory: "โลหะ", unit: "set", material: 12000, labor: 4000, quantity: 1 },
  
  // ระบายน้ำ
  { id: "hex-030", name: "ท่อระบายน้ำคอนกรีต Ø30 ซม.", category: "สถาปัตยกรรมภายนอก", subcategory: "ระบายน้ำ", unit: "m", material: 380, labor: 220, quantity: 18 },
  { id: "hex-031", name: "บ่อพักน้ำคอนกรีต 60x60 ซม.", category: "สถาปัตยกรรมภายนอก", subcategory: "ระบายน้ำ", unit: "pcs", material: 850, labor: 450, quantity: 4 },
  
  // จัดสวนเล็ก
  { id: "hex-040", name: "ดินปลูก + ปุ๋ย", category: "สถาปัตยกรรมภายนอก", subcategory: "จัดสวน", unit: "m3", material: 450, labor: 200, quantity: 8 },
  { id: "hex-041", name: "ปลูกไม้ยืนต้นกลาง", category: "สถาปัตยกรรมภายนอก", subcategory: "จัดสวน", unit: "ต้น", material: 1200, labor: 300, quantity: 6 },
  { id: "hex-042", name: "ปลูกไม้พุ่มและหญ้า", category: "สถาปัตยกรรมภายนอก", subcategory: "จัดสวน", unit: "lot", material: 8000, labor: 3500, quantity: 1 },

  // ===== 14. ทดสอบ-ส่งมอบ =====
  // ทดสอบระบบทั้งหมด
  { id: "ht-001", name: "ทดสอบระบบไฟฟ้าครบทุกจุด", category: "งานเตรียมการ", subcategory: "ทดสอบ", unit: "lot", material: 0, labor: 3500, quantity: 1 },
  { id: "ht-002", name: "ทดสอบระบบประปาไม่รั่วซึม", category: "งานเตรียมการ", subcategory: "ทดสอบ", unit: "lot", material: 0, labor: 2500, quantity: 1 },
  { id: "ht-003", name: "ทดสอบการทำงานแอร์ทุกเครื่อง", category: "งานเตรียมการ", subcategory: "ทดสอบ", unit: "lot", material: 0, labor: 1500, quantity: 1 },
  
  // เก็บจุดบกพร่อง
  { id: "ht-010", name: "Snag List - เก็บงานบกพร่อง", category: "งานเตรียมการ", subcategory: "เก็บงาน", unit: "lot", material: 5000, labor: 8000, quantity: 1 },
  
  // ทำ as-built และคู่มือบ้าน
  { id: "ht-020", name: "จัดทำ As-Built Drawing", category: "งานเตรียมการ", subcategory: "เอกสาร", unit: "set", material: 3500, labor: 0, quantity: 1 },
  { id: "ht-021", name: "จัดทำคู่มือบ้านและรับประกัน", category: "งานเตรียมการ", subcategory: "เอกสาร", unit: "set", material: 2500, labor: 0, quantity: 1 },

  // ===== 15. สำรอง (5% ของมูลค่างาน) =====
  { id: "hcont-001", name: "สำรอง - ปรับแบบ/อัปเกรดระหว่างก่อสร้าง", category: "งานเตรียมการ", subcategory: "สำรอง", unit: "lot", material: 75000, labor: 0, quantity: 1 },
];

// ==================== บ้าน 1 ชั้น 100 ตร.ม. (แบบสมบูรณ์) ====================
export const house_1floor_100_complete: BOQItem[] = [
  // ===== 1. PRELIMINARY =====
  { id: "h1p-001", name: "ขนย้ายวัสดุเข้า-ออกพื้นที่", category: "งานเตรียมการ", subcategory: "ขนย้าย", unit: "lot", material: 12000, labor: 6000, quantity: 1 },
  { id: "h1p-002", name: "ไฟฟ้าชั่วคราว 4 เดือน", category: "งานเตรียมการ", subcategory: "ไฟ-น้ำชั่วคราว", unit: "month", material: 1200, labor: 0, quantity: 4 },
  { id: "h1p-003", name: "น้ำประปาชั่วคราว 4 เดือน", category: "งานเตรียมการ", subcategory: "ไฟ-น้ำชั่วคราว", unit: "month", material: 800, labor: 0, quantity: 4 },
  { id: "h1p-004", name: "รั้วชั่วคราว สังกะสี", category: "งานเตรียมการ", subcategory: "รั้วชั่วคราว", unit: "m", material: 180, labor: 120, quantity: 45 },
  { id: "h1p-005", name: "นั่งร้านคนงาน พร้อมห้องน้ำ", category: "งานเตรียมการ", subcategory: "นั่งร้าน", unit: "set", material: 8000, labor: 2500, quantity: 1 },
  { id: "h1p-006", name: "อุปกรณ์ความปลอดภ��ย", category: "งานเตรียมการ", subcategory: "ความปลอดภัย", unit: "set", material: 5000, labor: 0, quantity: 1 },
  { id: "h1p-007", name: "ทำความสะอาดรายวัน", category: "งานเตรียมการ", subcategory: "ทำความสะอาด", unit: "month", material: 0, labor: 2800, quantity: 4 },
  { id: "h1p-008", name: "เก็บเศษวัสดุเหลือใช้", category: "งานเตรียมการ", subcategory: "เก็บเศษ", unit: "lot", material: 3500, labor: 5500, quantity: 1 },

  // ===== 2. โครงสร้าง =====
  { id: "h1s-001", name: "ขุดดินหลุมเสา", category: "โครงสร้าง", subcategory: "ฐานราก", unit: "m3", material: 0, labor: 120, quantity: 18 },
  { id: "h1s-002", name: "คอนกรีตผสมเสร็จ 180 ksc ฐานราก", category: "โครงสร้าง", subcategory: "ฐานราก", unit: "m3", material: 2200, labor: 0, quantity: 6 },
  { id: "h1s-003", name: "เหล็กเส้นฐานราก Ø12 มม.", category: "โครงสร้าง", subcategory: "เหล็กเส้น", unit: "kg", material: 20, labor: 5, quantity: 480 },
  { id: "h1s-004", name: "คอนกรีตผสมเสร็จ 210 ksc", category: "โครงสร้าง", subcategory: "คอนกรีต", unit: "m3", material: 2384, labor: 0, quantity: 18 },
  { id: "h1s-005", name: "เหล็กเส้น SD40 Ø12 มม.", category: "โครงสร้าง", subcategory: "เหล็กเส้น", unit: "kg", material: 20, labor: 5, quantity: 1800 },
  { id: "h1s-006", name: "ผนังอิฐมอญ ก่อ+ฉาบ", category: "โครงสร้าง", subcategory: "ก่ออิฐ", unit: "m2", material: 260, labor: 140, quantity: 280 },
  { id: "h1s-007", name: "กันซึมซีเมนต์พอลิเมอร์ฐานราก", category: "โครงสร้าง", subcategory: "กันซึม", unit: "m2", material: 180, labor: 120, quantity: 15 },

  // ===== 3. หลังคา (100 ตร.ม. x 1.0) =====
  { id: "h1r-001", name: "เหล็กกล่อง 2x1 นิ้ว โครงหลังคา", category: "สถาปัตยกรรมภายนอก", subcategory: "โครงเหล็ก", unit: "kg", material: 42, labor: 18, quantity: 580 },
  { id: "h1r-002", name: "ทาสีเหล็กกันสนิม", category: "สถาปัตยกรรมภายนอก", subcategory: "ทาสี", unit: "m2", material: 45, labor: 55, quantity: 120 },
  { id: "h1r-003", name: "มุงแผ่นเมทัลชีท PU 25 มม.", category: "สถาปัตยกรรมภายนอก", subcategory: "หลังคา", unit: "m2", material: 320, labor: 180, quantity: 100 },
  { id: "h1r-004", name: "ฉนวน PE ใต้หลังคา 5 มม.", category: "สถาปัตยกรรมภายนอก", subcategory: "ฉนวน", unit: "m2", material: 250, labor: 50, quantity: 100 },
  { id: "h1r-005", name: "รางน้ำสังกะสี", category: "สถาปัตยกรรมภายนอก", subcategory: "ระบายน้ำ", unit: "m", material: 120, labor: 80, quantity: 35 },
  { id: "h1r-006", name: "ท่อเดรนลงฝน UPVC 3\\\"", category: "สถาปัตยกรรมภายนอก", subcategory: "ระบายน้ำ", unit: "m", material: 120, labor: 70, quantity: 18 },

  // ===== 4-8. ผนัง, ช่องเปิด, ฝ้า-ผนังกั้น, พื้น, สี-เคลือบ =====
  { id: "h1w-001", name: "ฉาบปูนเรียบ สกิมโคท", category: "สถาปัตยกรรมภายใน", subcategory: "ฉาบปูน", unit: "m2", material: 35, labor: 45, quantity: 280 },
  { id: "h1w-002", name: "กันซึมซีเมนต์พอลิเมอร์ห้องน้ำ", category: "สถาปัตยกรรมภายใน", subcategory: "กันซึม", unit: "m2", material: 180, labor: 120, quantity: 42 },
  { id: "h1d-001", name: "ประตูภายนอก UPVC พร้อมวงกบ", category: "สถาปัตยกรรม���ายนอก", subcategory: "ประตู", unit: "pcs", material: 2400, labor: 700, quantity: 1 },
  { id: "h1d-002", name: "กรอบบานประตูไม้ HDF", category: "สถาปัตยกรรมภายใน", subcategory: "ประตู", unit: "pcs", material: 900, labor: 250, quantity: 5 },
  { id: "h1d-003", name: "กรอบ uPVC บานเลื่อน 2 ราง + มุ้ง", category: "สถาปัตยกรรมภายนอก", subcategory: "หน้าต่าง", unit: "m2", material: 980, labor: 400, quantity: 18 },
  { id: "h1c-001", name: "ฝ้ายิปซัมบอร์ด 9 มม. + โครง", category: "สถาปัตยกรรมภายใน", subcategory: "ฝ้าเพดาน", unit: "m2", material: 280, labor: 180, quantity: 100 },
  { id: "h1f-001", name: "ปูนปรับระดับ 1:3", category: "สถาปัตยกรรมภายใน", subcategory: "พื้น", unit: "m2", material: 85, labor: 65, quantity: 100 },
  { id: "h1f-002", name: "กระเบื้องแกรนิตโต 60x60 ซม.", category: "สถาปัตยกรรมภายใน", subcategory: "พื้น", unit: "m2", material: 380, labor: 180, quantity: 60 },
  { id: "h1f-003", name: "พื้นลามิเนต 12 มม.", category: "สถาปัตยกรรมภายใน", subcategory: "พื้น", unit: "m2", material: 420, labor: 150, quantity: 40 },
  { id: "h1f-004", name: "บัวพื้นไม้ MDF 3 นิ้ว", category: "สถาปัตยกรรมภายใน", subcategory: "บัวพื้น", unit: "m", material: 45, labor: 35, quantity: 120 },
  { id: "h1pt-001", name: "รองพื้นกันด่าง", category: "สถาปัตยกรรมภายนอก", subcategory: "ทาสี", unit: "m2", material: 25, labor: 20, quantity: 280 },
  { id: "h1pt-002", name: "ทาสีอะครีลิคภายนอก 2 เที่ยว", category: "สถาปัตยกรรมภายนอก", subcategory: "ทาสี", unit: "m2", material: 55, labor: 45, quantity: 280 },
  { id: "h1pt-003", name: "ทาสีอะครีลิคภายใน 2 เที่ยว", category: "สถาปัตยกรรมภายใน", subcategory: "ทาสี", unit: "m2", material: 45, labor: 35, quantity: 280 },

  // ===== 9. สุขาภิบาล =====
  { id: "h1sa-001", name: "ท่อ PVC 1/2\\\" น้ำดี", category: "ระบบ MEP", subcategory: "ประปา", unit: "m", material: 45, labor: 35, quantity: 55 },
  { id: "h1sa-002", name: "ท่อ PVC 2\\\" น้ำดี", category: "ระบบ MEP", subcategory: "ประปา", unit: "m", material: 65, labor: 45, quantity: 40 },
  { id: "h1sa-003", name: "ท่อ PVC 4\\\" ระบายน้ำ", category: "ระบบ MEP", subcategory: "ระบายน้ำ", unit: "m", material: 85, labor: 55, quantity: 30 },
  { id: "h1sa-004", name: "ถังเก็บน้ำ PE 1000 ลิตร", category: "ระบบ MEP", subcategory: "ประปา", unit: "pcs", material: 3500, labor: 800, quantity: 1 },
  { id: "h1sa-005", name: "ปั๊มน้ำ 200W อัตโนมัติ", category: "ระบบ MEP", subcategory: "ประปา", unit: "set", material: 4200, labor: 1200, quantity: 1 },
  { id: "h1sa-006", name: "สุขภัณฑ์ชิ้นเดียว เกรดมาตรฐาน", category: "ระบบ MEP", subcategory: "สุขภัณฑ์", unit: "set", material: 4000, labor: 800, quantity: 2 },
  { id: "h1sa-007", name: "อ่างล้างหน้า + ก๊อก", category: "ระบบ MEP", subcategory: "สุขภัณฑ์", unit: "set", material: 2800, labor: 600, quantity: 2 },
  { id: "h1sa-008", name: "เครื่องทำน้ำอุ่น 3500W", category: "ระบบ MEP", subcategory: "สุขภัณฑ์", unit: "set", material: 2800, labor: 800, quantity: 1 },
  { id: "h1sa-009", name: "ทดสอบความดันน้ำ", category: "ระบบ MEP", subcategory: "ทดสอบ", unit: "lot", material: 0, labor: 1800, quantity: 1 },

  // ===== 10. ไฟฟ้า-แสงสว่าง (100 x 0.08 = 8 จุด) =====
  { id: "h1e-001", name: "ตู้ไฟ MDB 12 ช่อง", category: "ระบบ MEP", subcategory: "ไฟฟ้า", unit: "set", material: 3500, labor: 1200, quantity: 1 },
  { id: "h1e-002", name: "ระบบกราวด์", category: "ระบบ MEP", subcategory: "ไฟฟ้า", unit: "set", material: 2800, labor: 1000, quantity: 1 },
  { id: "h1e-003", name: "ท่อร้อยสาย PVC 3/4\\\"", category: "ระบบ MEP", subcategory: "ไฟฟ้า", unit: "m", material: 35, labor: 25, quantity: 180 },
  { id: "h1e-004", name: "จุดปลั๊กไฟ พร้อมสายและท่อ", category: "ระบบ MEP", subcategory: "ไฟฟ้า", unit: "point", material: 320, labor: 250, quantity: 35 },
  { id: "h1e-005", name: "จุดโคมไฟภายใน LED", category: "ระบบ MEP", subcategory: "ไฟฟ้า", unit: "point", material: 400, labor: 250, quantity: 28 },
  { id: "h1e-006", name: "จุด LAN Cat6 เตรียมท่อ", category: "ระบบ MEP", subcategory: "สื่อสาร", unit: "point", material: 280, labor: 180, quantity: 8 },
  { id: "h1e-007", name: "SPD กันฟ้าผ่า", category: "ระบบ MEP", subcategory: "ไฟฟ้า", unit: "set", material: 2800, labor: 800, quantity: 1 },

  // ===== 11. แอร์ =====
  { id: "h1a-001", name: "แอร์บ้าน 12,000 BTU พร้อมติดตั้ง", category: "ระบบ MEP", subcategory: "แอร์", unit: "set", material: 15000, labor: 2200, quantity: 2 },
  { id: "h1a-002", name: "ท่อทองแดงพร้อมฉนวน", category: "ระบบ MEP", subcategory: "แอร์", unit: "m", material: 180, labor: 80, quantity: 35 },
  { id: "h1a-003", name: "เบรกเกอร์แอร์ 20A", category: "ระบบ MEP", subcategory: "ไฟฟ้า", unit: "pcs", material: 350, labor: 120, quantity: 2 },

  // ===== 12. บิ้วอิน =====
  { id: "h1bi-001", name: "ชุดครัวตัวล่าง 1.5 ม.", category: "สถาปัตยกรรมภายใน", subcategory: "บิ้วอิน", unit: "m", material: 6500, labor: 2200, quantity: 1.5 },
  { id: "h1bi-002", name: "ชุดครัวตัวบน 1.2 ม.", category: "สถาปัตยกรรมภายใน", subcategory: "บิ้วอิน", unit: "m", material: 4500, labor: 1500, quantity: 1.2 },
  { id: "h1bi-003", name: "ตู้เสื้อผ้า Melamine 2.0 ม.", category: "สถาปัตยกรรมภายใน", subcategory: "บิ้วอิน", unit: "m", material: 5500, labor: 1800, quantity: 4 },

  // ===== 13. งานภายนอก =====
  { id: "h1ex-001", name: "ปรับพื้นที่ ถมดิน", category: "สถาปัตยกรรมภายนอก", subcategory: "ถมดิน", unit: "m3", material: 120, labor: 80, quantity: 30 },
  { id: "h1ex-002", name: "ลานจอดรถ Interlocking", category: "สถาปัตยกรรมภายนอก", subcategory: "ทางเดิน", unit: "m2", material: 380, labor: 220, quantity: 20 },
  { id: "h1ex-003", name: "รั้วคอนกรีตสำเร็จรูป", category: "สถาปัตยกรรมภายนอก", subcategory: "รั้ว", unit: "m", material: 850, labor: 450, quantity: 30 },
  { id: "h1ex-004", name: "จัดสวนเล็ก", category: "สถาปัตยกรรมภายนอก", subcategory: "จัดสวน", unit: "lot", material: 8000, labor: 3500, quantity: 1 },

  // ===== 14. ทดสอบ-ส่งมอบ =====
  { id: "h1t-001", name: "ทดสอบระบบไฟฟ้า", category: "งานเตรียมการ", subcategory: "ทดสอบ", unit: "lot", material: 0, labor: 2500, quantity: 1 },
  { id: "h1t-002", name: "Snag List - เก็บงานบกพร่อง", category: "งานเตรียมการ", subcategory: "เก็บงาน", unit: "lot", material: 3500, labor: 5500, quantity: 1 },
  { id: "h1t-003", name: "จัดทำ As-Built + คู่มือบ้าน", category: "งานเตรียมการ", subcategory: "เอกสาร", unit: "set", material: 4000, labor: 0, quantity: 1 },

  // ===== 15. สำรอง =====
  { id: "h1cont-001", name: "สำรอง - ปรับแบบ/อัปเกรด", category: "งานเตรียมการ", subcategory: "สำรอง", unit: "lot", material: 50000, labor: 0, quantity: 1 },
];

// ==================== Export Templates ====================
export const completeTemplates = {
  house_2floor_150_complete,
  house_1floor_100_complete,
};

// Template Metadata
export const completeTemplateMetadata = [
  {
    id: "house_2floor_150_complete",
    name: "บ้าน 2 ชั้น 150 ตร.ม. (สมบูรณ์)",
    category: "บ้านเดี่ยว",
    description: "บ้าน 2 ชั้น ครบ 14 หมวดหมู่ ตามมาตรฐานการก่อสร้าง รวม Preliminary, ทดสอบ-ส่งมอบ, และสำรอง",
    estimatedValue: 2850000,
    items: house_2floor_150_complete.length,
    categories: [
      "งานเตรียมการ",
      "โครงสร้าง",
      "หลังคา",
      "ผนัง",
      "ช่องเปิด",
      "ฝ้า-ผนังกั้น",
      "พื้น",
      "สี-เคลือบ",
      "สุขาภิบาล",
      "ไฟฟ้า-แสงสว่าง",
      "แอร์",
      "บิ้วอิน",
      "งานภายนอก",
      "ทดสอบ-ส่งมอบ"
    ],
  },
  {
    id: "house_1floor_100_complete",
    name: "บ้าน 1 ชั้น 100 ตร.ม. (สมบูรณ์)",
    category: "บ้านเดี่ยว",
    description: "บ้าน 1 ชั้น ครบ 14 หมวดหมู่ ตามมาตรฐานการก่อสร้าง",
    estimatedValue: 1650000,
    items: house_1floor_100_complete.length,
    categories: [
      "งานเตรียมการ",
      "โครงสร้าง",
      "หลังคา",
      "ผนัง",
      "ช่องเปิด",
      "ฝ้า-ผนังกั้น",
      "พื้น",
      "สี-เคลือบ",
      "สุขาภิบาล",
      "ไฟฟ้า-แสงสว่าง",
      "แอร์",
      "บิ้วอิน",
      "งานภายนอก",
      "ทดสอบ-ส่งมอบ"
    ],
  },
];

// ==================== Helper: Calculate Template Summary ====================
export function calculateTemplateSummary(template: BOQItem[]) {
  const summary = {
    totalItems: template.length,
    materialTotal: 0,
    laborTotal: 0,
    grandTotal: 0,
    categories: new Set<string>(),
    subcategories: new Set<string>(),
  };

  template.forEach(item => {
    const itemTotal = (item.material + item.labor) * item.quantity;
    summary.materialTotal += item.material * item.quantity;
    summary.laborTotal += item.labor * item.quantity;
    summary.grandTotal += itemTotal;
    summary.categories.add(item.category);
    summary.subcategory && summary.subcategories.add(item.subcategory);
  });

  return {
    ...summary,
    categories: Array.from(summary.categories),
    subcategories: Array.from(summary.subcategories),
  };
}
