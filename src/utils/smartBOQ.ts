import { evalExpression } from "./safeExpr";
import { BOQItem } from "../types/boq";
import { catalog } from "../data/catalog";

// =====================================================
// SmartBOQ Engine - Auto-generate BOQ from project info
// =====================================================

export interface SmartBOQInputs {
  // Basic Info
  projectType: 'house' | 'building' | 'cafe' | 'restaurant' | 'retail' | 'office' | 'clinic' | 'hotel' | 'gym' | 'spa';
  usableArea_m2: number;
  floors: number;
  perimeterPerFloor_m: number;
  floorHeight_m: number;
  
  // Restaurant/Cafe-specific
  seatCount?: number;
  kitchenType?: 'light' | 'heavy';
  kitchenAreaRatio?: number;
  facadeFront_m?: number;
  signageWidth_m?: number;
  coldStorage?: 'none' | 'undercounter' | 'walkin';
  hvacType?: 'split' | 'ducted' | 'vrf';
  finishLevel?: 'basic' | 'standard' | 'premium';
  
  // Clinic-specific
  roomCount?: number;
  xrayRoom?: boolean;
  
  // Hotel-specific
  guestRoomCount?: number;
  
  // Retail-specific
  shopfrontWidth_m?: number;
}

export interface SmartBOQRule {
  name: string;
  categoryId?: string;
  itemId?: string;
  custom?: boolean;
  uom: string;
  qtyFormula: string;
  unitRateHint_THB_per_unit?: number;
  note?: string;
}

// ===== RULES BY PROJECT TYPE =====

// House Rules - บ้านพักอาศัย
const HOUSE_RULES: SmartBOQRule[] = [
  // โครงสร้าง
  { name: "เสาเข็มเจาะ Ø 0.30 ม. ลึก 12 ม.", categoryId: "โครงสร้าง", custom: true, uom: "m", qtyFormula: "floors > 1 ? 30 : 0", unitRateHint_THB_per_unit: 1800 },
  { name: "คานคอดิน 15x20 ซม.", categoryId: "โครงสร้าง", custom: true, uom: "m", qtyFormula: "perimeterPerFloor_m", unitRateHint_THB_per_unit: 450 },
  { name: "พื้นคอนกรีตเสริมเหล็ก หนา 10 ซม.", categoryId: "โครงสร้าง", custom: true, uom: "m2", qtyFormula: "usableArea_m2", unitRateHint_THB_per_unit: 850 },
  { name: "เสาโครงสร้าง 20x20 ซม.", categoryId: "โครงสร้าง", custom: true, uom: "m", qtyFormula: "floorHeight_m * max(8, usableArea_m2 / 25)", unitRateHint_THB_per_unit: 680 },
  { name: "คานโครงสร้าง 20x35 ซม.", categoryId: "โครงสร้าง", custom: true, uom: "m", qtyFormula: "perimeterPerFloor_m * 1.5", unitRateHint_THB_per_unit: 750 },
  
  // สถาปัตย์ภายนอก
  { name: "ผนังก่ออิฐมวลเบา 7.5 ซม. + ฉาบปูน", categoryId: "สถาปัตยกรรมภายนอก", custom: true, uom: "m2", qtyFormula: "wallArea_m2 * 0.6", unitRateHint_THB_per_unit: 420 },
  { name: "กระเบื้องหลังคาคอนกรีต", categoryId: "สถาปัตยกรรมภายนอก", custom: true, uom: "m2", qtyFormula: "usableArea_m2 * 1.2", unitRateHint_THB_per_unit: 380 },
  { name: "ประตูหน้าต่าง uPVC พร้อมกระจก", categoryId: "สถาปัตยกรรมภายนอก", custom: true, uom: "m2", qtyFormula: "wallArea_m2 * 0.2", unitRateHint_THB_per_unit: 1800 },
  
  // สถาปัตย์ภายใน
  { name: "ผนังก่ออิฐมวลเบา 7.5 ซม. ภายใน", categoryId: "สถาปัตยกรรมภายใน", custom: true, uom: "m2", qtyFormula: "wallArea_m2 * 0.4", unitRateHint_THB_per_unit: 380 },
  { name: "ฝ้ายิปซัม ทาสี", categoryId: "สถาปัตยกรรมภายใน", custom: true, uom: "m2", qtyFormula: "usableArea_m2 * 0.8", unitRateHint_THB_per_unit: 280 },
  { name: "ทาสีภายใน 3 ชั้น", categoryId: "สถาปัตยกรรมภายใน", custom: true, uom: "m2", qtyFormula: "wallArea_m2", unitRateHint_THB_per_unit: 85 },
  { name: "กระเบื้องพื้น 60x60 ซม.", categoryId: "สถาปัตยกรรมภายใน", custom: true, uom: "m2", qtyFormula: "usableArea_m2 * 0.6", unitRateHint_THB_per_unit: 380 },
  { name: "ประตูไม้ HDF เคลือบ PVC", categoryId: "สถาปัตยกรรมภายใน", custom: true, uom: "pcs", qtyFormula: "max(6, usableArea_m2 / 30)", unitRateHint_THB_per_unit: 4500 },
  
  // ระบบ MEP
  { name: "ระบบประปา ท่อ PVC + อุปกรณ์", categoryId: "ระบบ MEP", custom: true, uom: "job", qtyFormula: "1", unitRateHint_THB_per_unit: 35000 },
  { name: "ระบบไฟฟ้า เมน DB + สายไฟ", categoryId: "ระบบ MEP", custom: true, uom: "job", qtyFormula: "1", unitRateHint_THB_per_unit: 45000 },
  { name: "แอร์ติดผนัง พร้อมติดตั้ง", custom: true, uom: "tr", qtyFormula: "ac_TR", unitRateHint_THB_per_unit: 14500 },
  { name: "สุขภัณฑ์ ชุดห้องน้ำ", categoryId: "ระบบ MEP", custom: true, uom: "set", qtyFormula: "max(2, usableArea_m2 / 80)", unitRateHint_THB_per_unit: 12000 },
];

// Building Rules - ตึกพาณิชย์/อาคารสูง
const BUILDING_RULES: SmartBOQRule[] = [
  // โครงสร้าง
  { name: "เสาเข็มเจาะ Ø 0.40 ม. ลึก 18 ม.", categoryId: "โครงสร้าง", custom: true, uom: "m", qtyFormula: "50 * floors", unitRateHint_THB_per_unit: 2200 },
  { name: "คานคอดิน 20x30 ซม.", categoryId: "โครงสร้าง", custom: true, uom: "m", qtyFormula: "perimeterPerFloor_m", unitRateHint_THB_per_unit: 680 },
  { name: "พื้นคอนกรีตเสริมเหล็ก หนา 15 ซม.", categoryId: "โครงสร้าง", custom: true, uom: "m2", qtyFormula: "usableArea_m2 * floors", unitRateHint_THB_per_unit: 1200 },
  { name: "เสาโครงสร้าง 30x30 ซม.", categoryId: "โครงสร้าง", custom: true, uom: "m", qtyFormula: "floorHeight_m * floors * max(12, usableArea_m2 / 20)", unitRateHint_THB_per_unit: 950 },
  { name: "คานโครงสร้าง 25x50 ซม.", categoryId: "โครงสร้าง", custom: true, uom: "m", qtyFormula: "perimeterPerFloor_m * 2 * floors", unitRateHint_THB_per_unit: 1100 },
  
  // สถาปัตย์ภายนอก
  { name: "ผนังคอนกรีต 15 ซม. + ฉาบปูน", categoryId: "สถาปัตยกรรมภายนอก", custom: true, uom: "m2", qtyFormula: "wallArea_m2 * 0.5", unitRateHint_THB_per_unit: 680 },
  { name: "ผนังกระจกอลูมิเนียม ระบบม่านบาน", categoryId: "สถาปัตยกรรมภายนอก", custom: true, uom: "m2", qtyFormula: "wallArea_m2 * 0.3", unitRateHint_THB_per_unit: 2800 },
  { name: "ระบบฟาซาดอลูมิเนียมคอมโพสิต", categoryId: "สถาปัตยกรรมภายนอก", custom: true, uom: "m2", qtyFormula: "wallArea_m2 * 0.2", unitRateHint_THB_per_unit: 3500 },
  
  // สถาปัตย์ภายใน
  { name: "ผนังยิปซัมบอร์ด + โครงเหล็ก", categoryId: "สถาปัตยกรรมภายใน", custom: true, uom: "m2", qtyFormula: "wallArea_m2 * 0.4", unitRateHint_THB_per_unit: 450 },
  { name: "ฝ้า T-Bar 60x60 ซม.", categoryId: "สถาปัตยกรรมภายใน", custom: true, uom: "m2", qtyFormula: "usableArea_m2 * floors * 0.85", unitRateHint_THB_per_unit: 320 },
  { name: "ทาสีภายใน ระดับพรีเมียม", categoryId: "สถาปัตยกรรมภายใน", custom: true, uom: "m2", qtyFormula: "wallArea_m2", unitRateHint_THB_per_unit: 120 },
  { name: "กระเบื้องแกรนิต 80x80 ซม.", categoryId: "สถาปัตยกรรมภายใน", custom: true, uom: "m2", qtyFormula: "usableArea_m2 * floors * 0.7", unitRateHint_THB_per_unit: 680 },
  { name: "ประตูไฟเบอร์กลาสทนไฟ 2 ชม.", categoryId: "สถาปัตยกรรมภายใน", custom: true, uom: "pcs", qtyFormula: "floors * 4", unitRateHint_THB_per_unit: 18000 },
  
  // ระบบ MEP
  { name: "ลิฟต์โดยสาร 8 คน", categoryId: "ระบบ MEP", custom: true, uom: "ชุด", qtyFormula: "floors > 3 ? ceil(floors / 4) : 0", unitRateHint_THB_per_unit: 1800000 },
  { name: "ระบบปั๊มน้ำ + ถังเก็บน้ำ", categoryId: "ระบบ MEP", custom: true, uom: "set", qtyFormula: "1", unitRateHint_THB_per_unit: 120000 },
  { name: "ระบบไฟฟ้าแรงสูง + หม้อแปลง", categoryId: "ระบบ MEP", custom: true, uom: "job", qtyFormula: "1", unitRateHint_THB_per_unit: 280000 },
  { name: "ระบบสปริงเกอร์ดับเพลิง", categoryId: "ระบบ MEP", custom: true, uom: "m2", qtyFormula: "usableArea_m2 * floors", unitRateHint_THB_per_unit: 180 },
  { name: "แอร์ VRV ระบบรวม", custom: true, uom: "tr", qtyFormula: "ac_TR * floors", unitRateHint_THB_per_unit: 18000 },
  
  // ระบบกล้อง/เครือข่าย
  { name: "กล้อง IP 4MP", itemId: "ip-camera-4mp--pcs", uom: "pcs", qtyFormula: "max(12, ceil(usableArea_m2 * floors / 60))" },
  { name: "เครื่องบันทึก NVR 32 ช่อง", custom: true, uom: "set", qtyFormula: "1", unitRateHint_THB_per_unit: 35000 },
  { name: "ระบบ Access Control", custom: true, uom: "จุด", qtyFormula: "floors * 3", unitRateHint_THB_per_unit: 15000 },
];

// Cafe/Restaurant Rules - ใช้ catalog ใหม่
const CAFE_RESTAURANT_RULES: SmartBOQRule[] = [
  // งานครัว - ระบบดูดควัน (ใช้ catalog ใหม่)
  { name: "ฮูดครัวสแตนเลส สูง 700 มม.", itemId: "exhaust-hood-ss-700--m", uom: "m", qtyFormula: "hoodLength_m" },
  { name: "แผ่นกรอง Baffle สแตนเลส", itemId: "hood-baffle-filter-ss--pcs", uom: "pcs", qtyFormula: "ceil(hoodLength_m / 0.5)" },
  { name: "ท่อลมดูดควัน GI 24 ga", itemId: "exhaust-duct-gi-24ga--m", uom: "m", qtyFormula: "ductLength_m" },
  { name: "พัดลมดูดควัน Centrifugal 12\"", itemId: "exhaust-fan-centrifugal-12--pcs", uom: "pcs", qtyFormula: "1" },
  { name: "วอลุ่มแดมเปอร์ GI 12\"", itemId: "volume-damper-gi-12--pcs", uom: "pcs", qtyFormula: "ceil(ductLength_m / 8)" },
  
  // ระบบแก๊สหุงต้ม (ใช้ catalog ใหม่)
  { name: "ท่อแก๊สสแตนเลส 1\"", itemId: "gas-pipe-ss-1in--m", uom: "m", qtyFormula: "max(10, kitchenArea_m2 * 0.5)" },
  { name: "บอลวาล์วแก๊ส 1\"", itemId: "gas-valve-1in--pcs", uom: "pcs", qtyFormula: "max(2, sinkCount)" },
  { name: "เรกูเลเตอร์ 2 สเตจ", itemId: "gas-regulator-2stage--set", uom: "set", qtyFormula: "1" },
  { name: "ชุดตรวจจับแก๊สรั่ว + Controller", itemId: "gas-leak-detector--set", uom: "set", qtyFormula: "1" },
  
  // ครัวเปียก/ซิงค์
  { name: "ซิงค์ล้างจานสแตนเลส 2 หลุม", itemId: "sink-ss-2bowl--pcs", uom: "pcs", qtyFormula: "sinkCount" },
  { name: "อ่างล้างมือสแตนเลส", itemId: "handwash-ss--pcs", uom: "pcs", qtyFormula: "handwashCount" },
  { name: "ฟลอร์แทรปสแตนเลส", itemId: "floor-trap-ss--pcs", uom: "pcs", qtyFormula: "max(3, ceil(kitchenArea_m2 / 15))" },
  { name: "บ่อดักไขมัน 600 ลิตร", itemId: "grease-trap-600l--pcs", uom: "pcs", qtyFormula: "kitchenType === \"light\" ? 1 : 0" },
  { name: "บ่อดักไขมัน 1200 ลิตร", itemId: "grease-trap-1200l--pcs", uom: "pcs", qtyFormula: "kitchenType === \"heavy\" ? 1 : 0" },
  
  // เครื่องครัว
  { name: "แท่นวางเตา/ตู้ครัว สแตนเลส", itemId: "cookline-stand-ss--m", uom: "m", qtyFormula: "max(3, kitchenArea_m2 * 0.15)" },
  { name: "ชั้นวางสแตนเลส 4 ชั้น", itemId: "shelf-ss-4tier--pcs", uom: "pcs", qtyFormula: "max(2, ceil(kitchenArea_m2 / 10))" },
  { name: "เครื่องทำน้ำแข็ง 50 กก./วัน", itemId: "ice-maker-50kg--pcs", uom: "pcs", qtyFormula: "seatCount > 30 ? 1 : 0" },
  
  // ผิวสำเร็จครัว
  { name: "พื้นอีพ็อกซี่กันลื่น 3 มม.", itemId: "epoxy-anti-slip-3mm--m2", uom: "m2", qtyFormula: "kitchenArea_m2" },
  { name: "คิ้วโค้ง Epoxy ขอบพื้น-ผนัง", itemId: "coving-epoxy--m", uom: "m", qtyFormula: "kitchenArea_m2 * 0.5" },
  
  // เฟอร์นิเจอร์/ฟิตเอาต์
  { name: "เคาน์เตอร์โครงไม้อัด 18 มม. กรุ HPL", itemId: "counter-ply18-hpl--m2", uom: "m2", qtyFormula: "max(4, seatCount * 0.05)" },
  { name: "ท็อปโต๊ะ Compact Laminate 10 มม.", itemId: "table-top-compact-10mm--m2", uom: "m2", qtyFormula: "seatCount * 0.5" },
  { name: "เบาะนั่ง Bench บุฟองน้ำ หุ้มไวนิล", itemId: "banquette-seat-vinyl--m", uom: "m", qtyFormula: "seatCount * 0.4" },
  
  // ป้ายและไฟป้าย
  { name: "โครงเหล็กป้าย", itemId: "sign-structure-steel--m", uom: "m", qtyFormula: "signageWidth_m ? signageWidth_m * 1.5 : 0" },
  { name: "ป้าย Lightbox อลูมิเนียม", itemId: "sign-lightbox-alum--m2", uom: "m2", qtyFormula: "signageWidth_m ? signageWidth_m * 0.8 : 0" },
  { name: "ไฟเส้น LED สำหรับป้าย", itemId: "led-strip-signage--m", uom: "m", qtyFormula: "signageWidth_m ? signageWidth_m * 3 : 0" },
  
  // ระบบกล้อง/เครือข่าย
  { name: "กล้อง IP 4MP", itemId: "ip-camera-4mp--pcs", uom: "pcs", qtyFormula: "max(4, ceil(usableArea_m2 / 40))" },
  { name: "เครื่องบันทึก NVR 16 ช่อง", itemId: "nvr-16ch--set", uom: "set", qtyFormula: "1" },
  { name: "สวิตช์ PoE 16 พอร์ต", itemId: "poe-switch-16p--pcs", uom: "pcs", qtyFormula: "1" },
  { name: "จุดกระจายสัญญาณ Wi-Fi Enterprise", itemId: "wifi-ap-enterprise--pcs", uom: "pcs", qtyFormula: "max(2, ceil(usableArea_m2 / 100))" },
  
  // ระบบป้องกันอัคคีภัย
  { name: "Hose Reel 1.5\" สาย 30 ม.", itemId: "hose-reel-cabinet-1-5-30--set", uom: "set", qtyFormula: "floors" },
  { name: "เครื่องตรวจจับควัน", itemId: "smoke-detector--pcs", uom: "pcs", qtyFormula: "max(4, ceil(usableArea_m2 / 50))" },
  { name: "ไฟฉุกเฉิน", itemId: "emergency-light--pcs", uom: "pcs", qtyFormula: "max(4, ceil(usableArea_m2 / 60))" },
  { name: "ป้ายทางออกฉุกเฉิน LED", itemId: "exit-sign-led--pcs", uom: "pcs", qtyFormula: "max(2, floors * 2)" },
  
  // ARCH-IN | ฝ้า ผนัง
  { name: "ฝ้า T-Bar 60x60 โถงนั่ง", categoryId: "สถาปัตยกรรมภายใน", itemId: "arch-in--60x60-", uom: "m2", qtyFormula: "seatingArea_m2 * 0.9" },
  { name: "กรุผนัง HPL Backdrop", categoryId: "สถาปัตยกรรมภายใน", itemId: "builtin--hpl", uom: "m2", qtyFormula: "max(6, seatCount * 0.04)" },
  
  // MEP - ไฟฟ้า
  { name: "ตู้เมน/DB พร้อมอุปกรณ์", itemId: "db-main-panel--set", uom: "set", qtyFormula: "1" },
  { name: "ท่อ EMT 1\" + อุปกรณ์", itemId: "emt-1in--m", uom: "m", qtyFormula: "usableArea_m2 * 1.2" },
  { name: "สาย MC 2x2.5 ตร.มม.", itemId: "mc-cable-2x2-5--m", uom: "m", qtyFormula: "usableArea_m2 * 1.5" },
  
  // แอร์
  { name: "แอร์ Split ชุดรวมติดตั้ง", custom: true, uom: "tr", qtyFormula: "ac_TR", unitRateHint_THB_per_unit: 14500 },
];

// Clinic Rules - ใช้ catalog ใหม่
const CLINIC_RULES: SmartBOQRule[] = [
  // ผิวสำเร็จคลินิก
  { name: "พื้นไวนิล Homogeneous 2 มม.", itemId: "vinyl-homogeneous-2mm--m2", uom: "m2", qtyFormula: "usableArea_m2 * 0.8" },
  { name: "บัวโค้ง Coved Skirting PVC", itemId: "coved-skirting-pvc--m", uom: "m", qtyFormula: "perimeterPerFloor_m * floors" },
  { name: "สีทาภายในชนิด Antibacterial", itemId: "antibacterial-paint--m2", uom: "m2", qtyFormula: "wallArea_m2" },
  { name: "แผ่นกันชนผนัง/กันเปื้อน", itemId: "wall-protection-sheet--m2", uom: "m2", qtyFormula: "wallArea_m2 * 0.3" },
  
  // ระบบแก๊สการแพทย์
  { name: "ท่อทองแดงแก๊สแพทย์ Ø12 มม.", itemId: "medgas-copper-12mm--m", uom: "m", qtyFormula: "roomCount * 8" },
  { name: "จุด O2 Outlet ผนัง", itemId: "o2-outlet-wall--pcs", uom: "pcs", qtyFormula: "roomCount * 2" },
  { name: "จุด Vacuum Outlet ผนัง", itemId: "vacuum-outlet-wall--pcs", uom: "pcs", qtyFormula: "roomCount * 2" },
  { name: "ตู้แสดงสถานะแก๊สการแพทย์ 3 ชนิด", itemId: "medgas-alarm-3gas--set", uom: "set", qtyFormula: "1" },
  
  // ห้องเอกซเรย์ (ถ้ามี)
  { name: "บุแผ่นตะกั่ว 2 มม. ผนัง/ประตู", itemId: "lead-lining-2mm--m2", uom: "m2", qtyFormula: "xrayRoom ? 40 : 0" },
  { name: "ประตูกันรังสี พร้อมช่องมอง", itemId: "xray-door-leaded--set", uom: "set", qtyFormula: "xrayRoom ? 1 : 0" },
  { name: "กระจกตะกั่วกันรังสี", itemId: "xray-viewing-window--m2", uom: "m2", qtyFormula: "xrayRoom ? 2 : 0" },
  
  // อุปกรณ์คลินิก
  { name: "อ่างล้างมือเซ็นเซอร์ ห้องตรวจ", itemId: "handwash-sensor-basin--pcs", uom: "pcs", qtyFormula: "roomCount" },
  
  // HVAC ห้องสะอาด
  { name: "AHU + HEPA H13 99.97%", itemId: "ahu-hepa-99-97--tr", uom: "tr", qtyFormula: "ac_TR" },
  
  // ระบบกล้อง
  { name: "กล้อง IP 4MP", itemId: "ip-camera-4mp--pcs", uom: "pcs", qtyFormula: "max(6, roomCount * 1.5)" },
  { name: "เครื่องบันทึก NVR 16 ช่อง", itemId: "nvr-16ch--set", uom: "set", qtyFormula: "1" },
];

// Hotel Rules
const HOTEL_RULES: SmartBOQRule[] = [
  // ห้องพักโรงแรม
  { name: "ฐานเตียงควีน + หัวเตียง", itemId: "bed-base-queen--set", uom: "set", qtyFormula: "guestRoomCount" },
  { name: "ตู้เสื้อผ้าบิลท์อิน ลามิเนต", itemId: "wardrobe-laminate--m2", uom: "m2", qtyFormula: "guestRoomCount * 3" },
  { name: "มินิบาร์ 90 ลิตร", itemId: "minibar-90l--pcs", uom: "pcs", qtyFormula: "guestRoomCount" },
  { name: "ตู้เซฟในห้องพัก", itemId: "inroom-safe--pcs", uom: "pcs", qtyFormula: "guestRoomCount" },
  
  // ห้องน้ำโรงแรม
  { name: "ฉากกระจกห้องอาบน้ำ 10 มม.", itemId: "shower-glass-10mm--m2", uom: "m2", qtyFormula: "guestRoomCount * 3" },
  { name: "ชุดเรนชาวเวอร์ + มิกเซอร์", itemId: "rainshower-mixer--set", uom: "set", qtyFormula: "guestRoomCount" },
  { name: "ราวจับสแตนเลส ห้องน้ำ", itemId: "grab-bar-ss--pcs", uom: "pcs", qtyFormula: "guestRoomCount * 2" },
  
  // โถงทางเดิน
  { name: "พรมแผ่น 6 มม.", itemId: "carpet-tile-6mm--m2", uom: "m2", qtyFormula: "usableArea_m2 * 0.3" },
  { name: "ป้ายเลขห้องแบบมีไฟ", itemId: "room-number-sign-led--pcs", uom: "pcs", qtyFormula: "guestRoomCount" },
  
  // ระบบกล้อง
  { name: "กล้อง IP 4MP", itemId: "ip-camera-4mp--pcs", uom: "pcs", qtyFormula: "max(8, guestRoomCount * 0.5)" },
  { name: "เครื่องบันทึก NVR 16 ช่อง", itemId: "nvr-16ch--set", uom: "set", qtyFormula: "1" },
];

// Retail Rules
const RETAIL_RULES: SmartBOQRule[] = [
  // หน้าร้าน/ฟาซาด
  { name: "กระจกบานเปลือย 12 มม.", itemId: "frameless-glass-12mm--m2", uom: "m2", qtyFormula: "shopfrontWidth_m * floorHeight_m * 0.8" },
  { name: "ประตูบานเลื่อนอัตโนมัติ", itemId: "auto-sliding-door--set", uom: "set", qtyFormula: "1" },
  
  // ชั้นวาง
  { name: "ชั้นกอนโดลา 2 ม.", itemId: "gondola-shelf-2m--pcs", uom: "pcs", qtyFormula: "max(6, ceil(usableArea_m2 / 20))" },
  { name: "เคาน์เตอร์แคชแรป", itemId: "cashwrap-counter--m2", uom: "m2", qtyFormula: "4" },
  
  // ระบบกล้อง
  { name: "กล้อง IP 4MP", itemId: "ip-camera-4mp--pcs", uom: "pcs", qtyFormula: "max(8, ceil(usableArea_m2 / 30))" },
  { name: "เครื่องบันทึก NVR 16 ช่อง", itemId: "nvr-16ch--set", uom: "set", qtyFormula: "1" },
];

// Office Rules
const OFFICE_RULES: SmartBOQRule[] = [
  // งานออฟฟิศ
  { name: "ผนังกระจกเทมเปอร์ 10 มม.", itemId: "glass-partition-10mm--m2", uom: "m2", qtyFormula: "usableArea_m2 * 0.15" },
  { name: "ฝ้าอะคูสติก 600x600", itemId: "acoustic-ceiling-board--m2", uom: "m2", qtyFormula: "usableArea_m2 * 0.9" },
  { name: "พื้นยก 600x600 + ขา", itemId: "raised-floor-600x600--m2", uom: "m2", qtyFormula: "usableArea_m2 * 0.3" },
  
  // ระบบกล้อง/เครือข่าย
  { name: "กล้อง IP 4MP", itemId: "ip-camera-4mp--pcs", uom: "pcs", qtyFormula: "max(4, ceil(usableArea_m2 / 80))" },
  { name: "สวิตช์ PoE 16 พอร์ต", itemId: "poe-switch-16p--pcs", uom: "pcs", qtyFormula: "max(1, ceil(usableArea_m2 / 200))" },
  { name: "จุดกระจายสัญญาณ Wi-Fi Enterprise", itemId: "wifi-ap-enterprise--pcs", uom: "pcs", qtyFormula: "max(2, ceil(usableArea_m2 / 150))" },
];

// Gym Rules
const GYM_RULES: SmartBOQRule[] = [
  { name: "พื้นยางยิม 10 มม.", itemId: "rubber-floor-10mm--m2", uom: "m2", qtyFormula: "usableArea_m2 * 0.7" },
  { name: "กระจกเต็มผนัง 5 มม.", itemId: "mirror-5mm-wall--m2", uom: "m2", qtyFormula: "wallArea_m2 * 0.4" },
  { name: "สตัดเคมีฝังพื้น ยึดเครื่อง", itemId: "equipment-anchor-chem--pcs", uom: "pcs", qtyFormula: "max(20, usableArea_m2 * 0.3)" },
  { name: "กล้อง IP 4MP", itemId: "ip-camera-4mp--pcs", uom: "pcs", qtyFormula: "max(4, ceil(usableArea_m2 / 50))" },
];

// Spa Rules
const SPA_RULES: SmartBOQRule[] = [
  { name: "เก้าอี้สระผมพร้อมอ่าง", itemId: "shampoo-station--set", uom: "set", qtyFormula: "max(2, ceil(usableArea_m2 / 40))" },
  { name: "โต๊ะทำเล็บพร้อมดูดไอระเหย", itemId: "nail-bar-vent-ss--m", uom: "m", qtyFormula: "max(2, usableArea_m2 / 30)" },
  { name: "ท่อระบายกลิ่น/ไอระเหย GI", itemId: "aroma-vent-duct-gi--m", uom: "m", qtyFormula: "perimeterPerFloor_m * 0.5" },
];

// Expression evaluator (improved to handle nested functions and string comparisons)
function evalFormula(formula: string, context: Record<string, any>): number {
  try {
    // Replace variables with values - handle strings properly
    let expr = formula;
    for (const [key, value] of Object.entries(context)) {
      // For string values, ensure they're properly quoted when replacing
      const replacement = typeof value === 'string' ? `"${value}"` : String(value);
      // Use word boundaries to avoid partial matches
      const regex = new RegExp(`\\b${key}\\b`, 'g');
      expr = expr.replace(regex, replacement);
    }
    
    // Handle nested functions by replacing innermost first
    // Process ceil and floor first (innermost) - loop until no more matches
    let maxIterations = 10; // Prevent infinite loops
    while ((expr.includes('ceil(') || expr.includes('floor(')) && maxIterations-- > 0) {
      expr = expr.replace(/ceil\(([^()]+)\)/g, (match, a) => {
        try {
          return String(Math.ceil(evalExpression(a)));
        } catch {
          return match; // Keep original if eval fails
        }
      });
      expr = expr.replace(/floor\(([^()]+)\)/g, (match, a) => {
        try {
          return String(Math.floor(evalExpression(a)));
        } catch {
          return match; // Keep original if eval fails
        }
      });
    }
    
    // Now handle max and min (after inner functions are resolved)
    maxIterations = 10;
    while ((expr.includes('max(') || expr.includes('min(')) && maxIterations-- > 0) {
      expr = expr.replace(/max\(([^(),]+),([^()]+)\)/g, (match, a, b) => {
        try {
          return String(Math.max(evalExpression(a.trim()), evalExpression(b.trim())));
        } catch {
          return match; // Keep original if eval fails
        }
      });
      expr = expr.replace(/min\(([^(),]+),([^()]+)\)/g, (match, a, b) => {
        try {
          return String(Math.min(evalExpression(a.trim()), evalExpression(b.trim())));
        } catch {
          return match; // Keep original if eval fails
        }
      });
    }
    
    // Final eval
    const result = evalExpression(expr);
    return typeof result === 'number' ? result : 0;
  } catch (e) {
    console.error(`Failed to eval formula: ${formula}`, e);
    return 0;
  }
}

// Generate BOQ Items from inputs
export function generateSmartBOQ(inputs: SmartBOQInputs): BOQItem[] {
  const {
    projectType,
    usableArea_m2,
    floors,
    perimeterPerFloor_m,
    floorHeight_m,
    seatCount = 20,
    kitchenType = 'light',
    kitchenAreaRatio = 0.25,
    facadeFront_m = 6,
    signageWidth_m = 0,
    finishLevel = 'standard',
    roomCount = 5,
    xrayRoom = false,
    guestRoomCount = 10,
    shopfrontWidth_m = 6,
  } = inputs;
  
  // Derived calculations
  const seatingArea_m2 = usableArea_m2 * (1 - (kitchenAreaRatio || 0));
  const kitchenArea_m2 = usableArea_m2 * (kitchenAreaRatio || 0);
  const wallArea_m2 = perimeterPerFloor_m * floorHeight_m * floors * 0.85;
  const glassArea_m2 = facadeFront_m * floorHeight_m * 0.8;
  const hoodLength_m = kitchenType === 'heavy' 
    ? Math.max(3, seatCount * 0.06) 
    : Math.max(2, seatCount * 0.04);
  const ductLength_m = hoodLength_m * 1.5 + 10;
  const handwashCount = Math.max(2, Math.ceil(seatCount / 25));
  const sinkCount = kitchenType === 'heavy' ? 3 : 2;
  const cleanoutCount = Math.max(2, Math.ceil(seatCount / 20));
  const ac_TR = Math.ceil(usableArea_m2 / 25);
  
  const context = {
    projectType,
    usableArea_m2,
    floors,
    perimeterPerFloor_m,
    floorHeight_m,
    seatCount,
    seatingArea_m2,
    kitchenArea_m2,
    wallArea_m2,
    glassArea_m2,
    hoodLength_m,
    ductLength_m,
    handwashCount,
    sinkCount,
    cleanoutCount,
    ac_TR,
    signageWidth_m,
    roomCount,
    xrayRoom,
    guestRoomCount,
    shopfrontWidth_m,
    kitchenType,
  };
  
  // Select rules based on project type
  let rules: SmartBOQRule[] = [];
  switch (projectType) {
    case 'house':
      rules = HOUSE_RULES;
      break;
    case 'building':
      rules = BUILDING_RULES;
      break;
    case 'cafe':
    case 'restaurant':
      rules = CAFE_RESTAURANT_RULES;
      break;
    case 'clinic':
      rules = CLINIC_RULES;
      break;
    case 'hotel':
      rules = HOTEL_RULES;
      break;
    case 'retail':
      rules = RETAIL_RULES;
      break;
    case 'office':
      rules = OFFICE_RULES;
      break;
    case 'gym':
      rules = GYM_RULES;
      break;
    case 'spa':
      rules = SPA_RULES;
      break;
    default:
      rules = HOUSE_RULES;
  }
  
  const boqItems: BOQItem[] = [];
  const timestamp = Date.now();
  
  rules.forEach((rule, index) => {
    const qty = evalFormula(rule.qtyFormula, context);
    
    if (qty <= 0) return; // Skip if qty is 0
    
    // Find item in catalog (catalog is flat array)
    let catalogItem = null;
    if (!rule.custom && rule.itemId) {
      catalogItem = catalog.find(item => item.id === rule.itemId);
    }
    
    // Ensure valid numbers
    const material = catalogItem?.material ?? rule.unitRateHint_THB_per_unit ?? 0;
    const labor = catalogItem?.labor ?? 0;
    const quantity = Math.round(qty * 100) / 100; // 2 decimal places
    
    // Create BOQ item with guaranteed valid values
    const boqItem: BOQItem = {
      id: `smart-${timestamp}-${index}`,
      name: rule.name || 'รายการไม่ระบุชื่อ',
      category: catalogItem?.category || rule.categoryId || 'อื่นๆ',
      subcategory: catalogItem?.subcategory || '',
      unit: rule.uom || 'pcs',
      quantity: isNaN(quantity) ? 0 : quantity,
      material: isNaN(material) ? 0 : Number(material),
      labor: isNaN(labor) ? 0 : Number(labor),
      notes: rule.note || '',
    };
    
    // Only add if item has valid data
    if (boqItem.quantity > 0 && (boqItem.material > 0 || boqItem.labor > 0)) {
      boqItems.push(boqItem);
    }
  });
  
  return boqItems;
}

// Get project type presets
export function getProjectTypeInfo(type: string) {
  const presets = {
    house: {
      name: "บ้านพักอาศัย",
      description: "โครงสร้าง, ผนัง, หลังคา, ระบบไฟฟ้า-ประปา, สุขภัณฑ์",
      icon: "🏡",
      category: "บ้าน",
      defaultInputs: {
        floorHeight_m: 3.0,
        kitchenAreaRatio: 0.15,
        finishLevel: 'standard' as const,
      }
    },
    building: {
      name: "อาคารพาณิชย์/ตึก",
      description: "โครงสร้างสูง, ฟาซาด, ลิฟต์, ระบบดับเพลิง, ระบบรักษาความปลอดภัย",
      icon: "🏗️",
      category: "ตึก",
      defaultInputs: {
        floorHeight_m: 3.5,
        kitchenAreaRatio: 0.1,
        finishLevel: 'premium' as const,
      }
    },
    cafe: {
      name: "ร้านกาแฟ / Café",
      description: "ครัวเบา, เคาน์เตอร์บาริสต้า, โซนนั่ง, ป้าย, ระบบดูดควัน",
      icon: "☕",
      category: "ร้านอาหาร",
      defaultInputs: {
        floorHeight_m: 3.5,
        kitchenAreaRatio: 0.25,
        kitchenType: 'light' as const,
        finishLevel: 'standard' as const,
      }
    },
    restaurant: {
      name: "ร้านอาหาร / Restaurant",
      description: "ครัวหนัก, ระบบแก๊ส, ดักไขมัน, ดูดควัน, เฟอร์นิเจอร์, ป้าย",
      icon: "🍽️",
      category: "ร้านอาหาร",
      defaultInputs: {
        floorHeight_m: 3.5,
        kitchenAreaRatio: 0.35,
        kitchenType: 'heavy' as const,
        finishLevel: 'standard' as const,
      }
    },
    retail: {
      name: "ร้านค้าปลีก / Retail",
      description: "หน้าร้าน, ชั้นวาง, แคชเชียร์, ระบบแสงสว่าง, กล้องวงจรปิด",
      icon: "🛍️",
      category: "ร้านค้า",
      defaultInputs: {
        floorHeight_m: 3.0,
        kitchenAreaRatio: 0,
        finishLevel: 'standard' as const,
      }
    },
    office: {
      name: "สำนักงาน / Office",
      description: "ผนังกระจก, ฝ้าอะคูสติก, พื้นยก, ระบบ IT, Wi-Fi, ห้องประชุม",
      icon: "🏢",
      category: "สำนักงาน",
      defaultInputs: {
        floorHeight_m: 3.0,
        kitchenAreaRatio: 0.1,
        finishLevel: 'standard' as const,
      }
    },
    clinic: {
      name: "คลินิก/ทันตกรรม",
      description: "ห้องตรวจ, แก๊สการแพทย์, ห้องเอกซเรย์, พื้นสุขอนามัย, HEPA",
      icon: "🏥",
      category: "คลินิก",
      defaultInputs: {
        floorHeight_m: 3.0,
        finishLevel: 'premium' as const,
      }
    },
    hotel: {
      name: "โรงแรม/รีสอร์ท",
      description: "ห้องพัก, FF&E, ห้องน้ำโรงแรม, โถงทางเดิน, ระบบกล้อง",
      icon: "🏨",
      category: "โรงแรม",
      defaultInputs: {
        floorHeight_m: 3.0,
        finishLevel: 'premium' as const,
      }
    },
    gym: {
      name: "ฟิตเนส/ยิม",
      description: "พื้นยางยิม, กระจกเต็มผนัง, สตัดยึดเครื่อง, ระบบแอร์",
      icon: "💪",
      category: "ฟิตเนส",
      defaultInputs: {
        floorHeight_m: 4.0,
        finishLevel: 'standard' as const,
      }
    },
    spa: {
      name: "สปา/บิวตี้",
      description: "ห้องทรีทเมนต์, เก้าอี้สระผม, โต๊ะทำเล็บ, ระบายกลิ่น",
      icon: "💆",
      category: "สปา",
      defaultInputs: {
        floorHeight_m: 3.0,
        finishLevel: 'premium' as const,
      }
    }
  };
  
  return presets[type as keyof typeof presets] || presets.house;
}
