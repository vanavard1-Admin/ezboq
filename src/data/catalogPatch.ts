import { CatalogItem } from "../types/boq";

/**
 * Catalog Patch - Additional Essential Items
 * เพิ่มรายการสำคัญที่ขาดจาก catalog หลัก
 * ใช้กฎ: labor = 33% ของ material ถ้าไม่มีค่าแรง
 * เวอร์ชัน: 1.0
 * วันที่: 2025-10-29
 * รายการทั้งหมด: 85 รายการ
 */

export const catalogPatch: CatalogItem[] = [
  // งานบิลท์อินฮาร์ดแวร์ (15 รายการ)
  { id: "builtin-blum-tandembox-450", name: "ชุดลิ้นชัก Blum Tandembox 450 มม.", category: "สถาปัตยกรรมภายใน", subcategory: "บิลท์อิน", unit: "set", material: 1800.0, labor: 594.0 },
  { id: "builtin-blum-movento-soft", name: "รางลิ้นชัก Blum Movento Soft-close", category: "สถาปัตยกรรมภายใน", subcategory: "บิลท์อิน", unit: "set", material: 1200.0, labor: 396.0 },
  { id: "builtin-blum-hinge-soft", name: "บานพับ Blum Clip-top Soft-close", category: "สถาปัตยกรรมภายใน", subcategory: "บิลท์อิน", unit: "pcs", material: 280.0, labor: 92.4 },
  { id: "builtin-push-open", name: "ตัวกดเปิด Push-to-open (Tip-on)", category: "สถาปัตยกรรมภายใน", subcategory: "บิลท์อิน", unit: "pcs", material: 180.0, labor: 59.4 },
  { id: "builtin-lazy-susan-800", name: "ถาดหมุน Lazy Susan Ø800", category: "สถาปัตยกรรมภายใน", subcategory: "บิลท์อิน", unit: "set", material: 1500.0, labor: 495.0 },
  { id: "builtin-magic-corner", name: "Magic Corner ตู้เข้ามุม + ชั้น", category: "สถาปัตยกรรมภายใน", subcategory: "บิลท์อิน", unit: "set", material: 2800.0, labor: 924.0 },
  { id: "builtin-pullout-pantry-300", name: "ตู้ Pantry Pull-out 300 มม.", category: "สถาปัตยกรรมภายใน", subcategory: "บิลท์อิน", unit: "set", material: 2200.0, labor: 726.0 },
  { id: "builtin-pullout-spice", name: "ชุดเครื่องปรุง Pull-out 150 มม.", category: "สถาปัตยกรรมภายใน", subcategory: "บิลท์อิน", unit: "set", material: 1100.0, labor: 363.0 },
  { id: "builtin-pullout-bin-2x15", name: "ชุดถังขยะ Pull-out 2x15L", category: "สถาปัตยกรรมภายใน", subcategory: "บิลท์อิน", unit: "set", material: 1600.0, labor: 528.0 },
  { id: "builtin-dish-rack", name: "ชั้นคว่ำจาน/แก้ว ติดบานยก", category: "สถาปัตยกรรมภายใน", subcategory: "บิลท์อิน", unit: "set", material: 900.0, labor: 297.0 },
  { id: "builtin-lift-up-aventos", name: "ระบบยกบานบน Aventos + ตั้งฉุน", category: "สถาปัตยกรรมภายใน", subcategory: "บิลท์อิน", unit: "set", material: 3200.0, labor: 1056.0 },
  { id: "builtin-base-cab-600", name: "ตู้ล่างครัว 600 มม. พร้อมบาน/ลิ้นชัก", category: "สถาปัตยกรรมภายใน", subcategory: "บิลท์อิน", unit: "m", material: 4500.0, labor: 1485.0 },
  { id: "builtin-wall-cab-300", name: "ตู้บนครัว 300 มม. พร้อมบาน", category: "สถาปัตยกรรมภายใน", subcategory: "บิลท์อิน", unit: "m", material: 3200.0, labor: 1056.0 },
  { id: "builtin-quartz-top-20", name: "ท้อปครัว หินควอทซ์ 20 มม. ติดตั้ง", category: "สถาปัตยกรรมภายใน", subcategory: "บิลท์อิน", unit: "m2", material: 3500.0, labor: 1155.0 },
  { id: "builtin-granite-top-20", name: "ท้อปครัว หินแกรนิต 20 มม. ติดตั้ง", category: "สถาปัตยกรรมภายใน", subcategory: "บิลท์อิน", unit: "m2", material: 2200.0, labor: 726.0 },

  // งานไฟฟ้าเพิ่มเติม (14 รายการ)
  { id: "elec-switch-2way", name: "สวิตช์ไฟ 2 ทาง + เดินสาย", category: "ระบบ MEP", subcategory: "ไฟฟ้า", unit: "pt", material: 280.0, labor: 200.0 },
  { id: "elec-dimmer", name: "ติดตั้งสวิตช์หรี่ไฟ (Dimmer)", category: "ระบบ MEP", subcategory: "ไฟฟ้า", unit: "pcs", material: 450.0, labor: 148.5 },
  { id: "elec-pir-motion", name: "สวิตช์ตรวจจับการเคลื่อนไหว PIR", category: "ระบบ MEP", subcategory: "ไฟฟ้า", unit: "pcs", material: 380.0, labor: 125.4 },
  { id: "elec-smoke-detector", name: "ติดตั้ง Smoke Detector", category: "ระบบ MEP", subcategory: "ไฟฟ้า", unit: "pcs", material: 350.0, labor: 115.5 },
  { id: "elec-box-gang1", name: "กล่องบล็อกเซอร์กิต 1 ช่อง + ฝา", category: "ระบบ MEP", subcategory: "ไฟฟ้า", unit: "pcs", material: 35.0, labor: 11.55 },
  { id: "elec-box-octagon", name: "กล่องแปดเหลี่ยม/วงจร (Octagon box)", category: "ระบบ MEP", subcategory: "ไฟฟ้า", unit: "pcs", material: 45.0, labor: 14.85 },
  { id: "elec-breaker-20a", name: "เบรกเกอร์ 20A + ติดตั้ง", category: "ระบบ MEP", subcategory: "ไฟฟ้า", unit: "pcs", material: 220.0, labor: 72.6 },
  { id: "elec-rcd-30ma", name: "ติดตั้ง RCD/ELCB 30mA", category: "ระบบ MEP", subcategory: "ไฟฟ้า", unit: "pcs", material: 880.0, labor: 290.4 },
  { id: "elec-downlight-9w", name: "Downlight LED 9W ติดตั้ง", category: "ระบบ MEP", subcategory: "ไฟฟ้า", unit: "pcs", material: 150.0, labor: 120.0 },
  { id: "elec-led-panel-6060", name: "LED Panel 60x60 ติดตั้ง", category: "ระบบ MEP", subcategory: "ไฟฟ้า", unit: "pcs", material: 550.0, labor: 181.5 },
  { id: "elec-pendant", name: "ติดตั้งโคมแขวน Pendant (ต่อจุด)", category: "ระบบ MEP", subcategory: "ไฟฟ้า", unit: "pcs", material: 0.0, labor: 250.0 },
  { id: "elec-chandelier-s", name: "ติดตั้งโคมระย้า ขนาดเล็ก ≤60ซม.", category: "ระบบ MEP", subcategory: "ไฟฟ้า", unit: "set", material: 0.0, labor: 450.0 },
  { id: "elec-chandelier-m", name: "ติดตั้งโคมระย้า ขนาดกลาง 60-90ซม.", category: "ระบบ MEP", subcategory: "ไฟฟ้า", unit: "set", material: 0.0, labor: 850.0 },
  { id: "elec-chandelier-l", name: "ติดตั้งโคมระย้า ขนาดใหญ่ >90ซม.", category: "ระบบ MEP", subcategory: "ไฟฟ้า", unit: "set", material: 0.0, labor: 1500.0 },

  // งานประปาเพิ่มเติม (27 รายการ)
  { id: "plumb-angle-valve-12", name: "วาล์วมุม 1/2\"", category: "ระบบ MEP", subcategory: "ประปา", unit: "pcs", material: 85.0, labor: 28.05 },
  { id: "plumb-ball-valve-12", name: "บอลวาล์วทองเหลือง 1/2\"", category: "ระบบ MEP", subcategory: "ประปา", unit: "pcs", material: 180.0, labor: 59.4 },
  { id: "plumb-check-valve-1", name: "เช็ควาล์ว 1\"", category: "ระบบ MEP", subcategory: "ประปา", unit: "pcs", material: 220.0, labor: 72.6 },
  { id: "plumb-flex-hose-50", name: "สายถักต่อก๊อก/สุขภัณฑ์ 50 ซม.", category: "ระบบ MEP", subcategory: "ประปา", unit: "pcs", material: 60.0, labor: 19.8 },
  { id: "plumb-ppr-20", name: "ท่อ PPR 20 มม. + ข้อต่อ/รัดท่อ", category: "ระบบ MEP", subcategory: "ประปา", unit: "m", material: 85.0, labor: 55.0 },
  { id: "plumb-ppr-25", name: "ท่อ PPR 25 มม. + ข้อต่อ/รัดท่อ", category: "ระบบ MEP", subcategory: "ประปา", unit: "m", material: 120.0, labor: 70.0 },
  { id: "plumb-ppr-32", name: "ท่อ PPR 32 มม. + ข้อต่อ/รัดท่อ", category: "ระบบ MEP", subcategory: "ประปา", unit: "m", material: 160.0, labor: 80.0 },
  { id: "plumb-ppr-40", name: "ท่อ PPR 40 มม. + ข้อต่อ/รัดท่อ", category: "ระบบ MEP", subcategory: "ประปา", unit: "m", material: 220.0, labor: 90.0 },
  { id: "plumb-ppr-insul-13", name: "ฉนวนท่อร้อนความหนา 13 มม. (ติดตั้ง)", category: "ระบบ MEP", subcategory: "ประปา", unit: "m", material: 45.0, labor: 14.85 },
  { id: "plumb-booster-05hp", name: "ติดตั้งปั๊มน้ำบูสเตอร์ 0.5HP + ถังยาง + เดินท่อ", category: "ระบบ MEP", subcategory: "ประปา", unit: "set", material: 4500.0, labor: 1485.0 },
  { id: "plumb-heater-storage-50", name: "ติดตั้งหม้อต้มน้ำร้อน 50 ลิตร", category: "ระบบ MEP", subcategory: "ประปา", unit: "set", material: 0.0, labor: 1200.0 },
  { id: "plumb-heater-tankless", name: "ติดตั้งเครื่องทำน้ำอุ่นไฟฟ้า (ต่อท่อ/น้ำ/ทิ้ง)", category: "ระบบ MEP", subcategory: "ประปา", unit: "set", material: 0.0, labor: 850.0 },
  { id: "plumb-basin-top", name: "ติดตั้งอ่างล้างหน้าแขวน/วาง Top + S-trap", category: "ระบบ MEP", subcategory: "ประปา", unit: "set", material: 0.0, labor: 650.0 },
  { id: "plumb-basin-pedestal", name: "ติดตั้งอ่างล้างหน้าแบบขาตั้ง", category: "ระบบ MEP", subcategory: "ประปา", unit: "set", material: 0.0, labor: 650.0 },
  { id: "plumb-wc-s-trap", name: "ติดตั้งชักโครกแบบ S-trap พร้อมเดินท่อน้ำ/ทิ้ง", category: "ระบบ MEP", subcategory: "ประปา", unit: "set", material: 0.0, labor: 850.0 },
  { id: "plumb-shower-mixer", name: "ติดตั้งชุดก๊อกผสมฝักบัวติดผนัง", category: "ระบบ MEP", subcategory: "ประปา", unit: "set", material: 0.0, labor: 650.0 },
  { id: "plumb-rain-shower", name: "ติดตั้ง Rain shower + แขน/ท่อ", category: "ระบบ MEP", subcategory: "ประปา", unit: "set", material: 0.0, labor: 850.0 },
  { id: "plumb-faucet-basin", name: "ติดตั้งก๊อกผสมอ่างล้างหน้า", category: "ระบบ MEP", subcategory: "ประปา", unit: "pcs", material: 0.0, labor: 250.0 },
  { id: "plumb-faucet-sink", name: "ติดตั้งก๊อกผสมซิงค์", category: "ระบบ MEP", subcategory: "ประปา", unit: "pcs", material: 0.0, labor: 250.0 },
  { id: "plumb-bidet-spray", name: "ติดตั้งสายฉีดชำระ", category: "ระบบ MEP", subcategory: "ประปา", unit: "set", material: 0.0, labor: 250.0 },
  { id: "plumb-water-point-cold", name: "จุดน้ำเย็น (วาล์ว+เดินท่อถึงจุด)", category: "ระบบ MEP", subcategory: "ประปา", unit: "pt", material: 180.0, labor: 150.0 },
  { id: "plumb-water-point-hot", name: "จุดน้ำร้อน PPR + หุ้มฉนวน", category: "ระบบ MEP", subcategory: "ประปา", unit: "pt", material: 280.0, labor: 180.0 },
  { id: "plumb-drain-2in", name: "จุดท่อน้ำทิ้ง 2\"", category: "ระบบ MEP", subcategory: "ประปา", unit: "pt", material: 120.0, labor: 100.0 },
  { id: "plumb-floor-trap-4", name: "ตะแกรงกันกลิ่นสแตนเลส 4\"", category: "ระบบ MEP", subcategory: "ประปา", unit: "pcs", material: 180.0, labor: 59.4 },
  { id: "plumb-grease-trap-30", name: "ติดตั้งบ่อดักไขมัน 30 ลิตร (ครัว)", category: "ระบบ MEP", subcategory: "ประปา", unit: "set", material: 1200.0, labor: 500.0 },
  { id: "plumb-grease-trap-60", name: "ติดตั้งบ่อดักไขมัน 60 ลิตร (ครัว)", category: "ระบบ MEP", subcategory: "ประปา", unit: "set", material: 1800.0, labor: 600.0 },
  { id: "plumb-water-meter-12", name: "ติดตั้งมิเตอร์วัดน้ำ 1/2\"", category: "ระบบ MEP", subcategory: "ประปา", unit: "set", material: 850.0, labor: 280.5 },

  // งานภายนอก/ภูมิทัศน์ (7 รายการ)
  { id: "fence-chain-link-25-20", name: "รั้วลวดตาข่าย Chain Link 2.5 มม. สูง 2.0 ม.", category: "งานภายนอก/ภูมิทัศน์", subcategory: "รั้ว", unit: "m", material: 180.0, labor: 180.0 },
  { id: "fence-gate-sliding-4m", name: "ประตูบานเลื่อนเหล็ก 4 ม. พร้อมราง", category: "งานภายนอก/ภูมิทัศน์", subcategory: "ประตู", unit: "set", material: 4500.0, labor: 2000.0 },
  { id: "outdoor-light-pole-6m", name: "เสาไฟสาธารณะ 6 ม. ฐานหล่อ", category: "งานภายนอก/ภูมิทัศน์", subcategory: "ไฟฟ้า", unit: "set", material: 2800.0, labor: 1200.0 },
  { id: "outdoor-light-led-100w", name: "โคมถนน LED 100W", category: "งานภายนอก/ภูมิทัศน์", subcategory: "ไฟฟ้า", unit: "pcs", material: 1800.0, labor: 300.0 },
  { id: "landscape-drip-pe16", name: "ระบบน้ำหยด พร้อมท่อ PE16", category: "งานภายนอก/ภูมิทัศน์", subcategory: "ระบบน้ำ", unit: "m", material: 25.0, labor: 20.0 },
  { id: "landscape-drain-200", name: "ท่อระบายน้ำคสล. Ø200 มม.", category: "งานภายนอก/ภูมิทัศน์", subcategory: "ระบายน้ำ", unit: "m", material: 420.0, labor: 220.0 },
  { id: "landscape-manhole-60x60", name: "บ่อพักท่อระบายน้ำ 60x60 ซม.", category: "งานภายนอก/ภูมิทัศน์", subcategory: "ระบายน้ำ", unit: "pcs", material: 780.0, labor: 420.0 },

  // ระบบความปลอดภัย (6 รายการ)
  { id: "security-keycard-1door", name: "ชุดคีย์การ์ด 1 ประตู (Controller+Reader)", category: "ระบบ MEP", subcategory: "ความปลอดภัย", unit: "set", material: 3200.0, labor: 900.0 },
  { id: "security-maglock-600lb", name: "แม่เหล็กประตู 600lb Maglock", category: "ระบบ MEP", subcategory: "ความปลอดภัย", unit: "pcs", material: 950.0, labor: 250.0 },
  { id: "security-exit-button", name: "Exit Button สแตนเลส", category: "ระบบ MEP", subcategory: "ความปลอดภัย", unit: "pcs", material: 180.0, labor: 80.0 },
  { id: "security-pir-alarm", name: "สัญญาณกันขโมย PIR", category: "ระบบ MEP", subcategory: "ความปลอดภัย", unit: "pcs", material: 350.0, labor: 150.0 },
  { id: "security-cctv-4mp-poe", name: "ติดตั้งกล้อง PoE 4MP", category: "ระบบ MEP", subcategory: "ความปลอดภัย", unit: "pcs", material: 1450.0, labor: 350.0 },
  { id: "security-nvr-8ch", name: "NVR 8 ช่อง ตั้งค่า", category: "ระบบ MEP", subcategory: "ความปลอดภัย", unit: "pcs", material: 2800.0, labor: 600.0 },

  // ระบบสื่อสาร/เครือข่าย (4 รายการ)
  { id: "network-cat6-utp", name: "สายแลน CAT6 UTP", category: "ระบบ MEP", subcategory: "สื่อสาร", unit: "m", material: 12.0, labor: 3.0 },
  { id: "network-faceplate-2port", name: "Faceplate 2 ช่อง + Keystone", category: "ระบบ MEP", subcategory: "สื่อสาร", unit: "set", material: 180.0, labor: 80.0 },
  { id: "network-patch-panel-24", name: "Patch panel 24 พอร์ต", category: "ระบบ MEP", subcategory: "สื่อสาร", unit: "pcs", material: 950.0, labor: 250.0 },
  { id: "network-wifi-ap", name: "ติดตั้ง Wi‑Fi Access Point", category: "ระบบ MEP", subcategory: "สื่อสาร", unit: "pcs", material: 0.0, labor: 350.0 },

  // งานทดสอบ/ส่งมอบ (2 รายการ)
  { id: "test-pressure-water", name: "ทดสอบแรงดันระบบประปา 10 บาร์", category: "ทดสอบ–ส่งมอบ", subcategory: "ทดสอบ", unit: "set", material: 0.0, labor: 850.0 },
  { id: "test-commission-elec", name: "ทดสอบ/เดินระบบ/คอมมิชชันนิ่ง ไฟฟ้า", category: "ทดสอบ–ส่งมอบ", subcategory: "ทดสอบ", unit: "set", material: 0.0, labor: 1200.0 },

  // งานหม้อแปลง/Generator (2 รายการ)
  { id: "transformer-30kva", name: "หม้อแปลง 30kVA ติดตั้ง", category: "ระบบ MEP", subcategory: "ไฟฟ้า", unit: "set", material: 42000.0, labor: 13860.0 },
  { id: "generator-20kva-diesel", name: "เครื่องกำเนิดไฟฟ้าดีเซล 20kVA + ติดตั้ง", category: "ระบบ MEP", subcategory: "ไฟฟ้า", unit: "set", material: 85000.0, labor: 28050.0 },

  // งานซ่อมแซม/บำรุงรักษา (6 รายการ)
  { id: "repair-crack-wall", name: "ซ่อมรอยแตกร้าว ปูนฉาบ", category: "สถาปัตยกรรมภายใน", subcategory: "ซ่อม", unit: "m2", material: 60.0, labor: 120.0 },
  { id: "repair-crack-epoxy", name: "เสริมเหล็ก/ฉีดอีพ็อกซี่รอยร้าว", category: "สถาปัตยกรรมภายใน", subcategory: "ซ่อม", unit: "m", material: 180.0, labor: 250.0 },
  { id: "repair-tile-1pc", name: "เปลี่ยนกระเบื้องแตก 1 จุด", category: "สถาปัตยกรรมภายใน", subcategory: "ซ่อม", unit: "pcs", material: 80.0, labor: 220.0 },
  { id: "repair-pu-injection", name: "อุดรอยรั่ว PU Injection", category: "สถาปัตยกรรมภายใน", subcategory: "ซ่อม", unit: "m", material: 220.0, labor: 350.0 },
  { id: "clean-aircon-split", name: "ทำความสะอาดล้างแอร์แยกส่วน", category: "ระบบ MEP", subcategory: "แอร์", unit: "set", material: 0.0, labor: 600.0 },
  { id: "clean-facade", name: "บำรุงรักษา/ทำความสะอาด Facade", category: "สถาปัตยกรรมภายนอก", subcategory: "บำรุงรักษา", unit: "m2", material: 50.0, labor: 80.0 },

  // อื่นๆ สำคัญ (2 รายการ)
  { id: "scaffold-rental-day", name: "นั่งร้าน รายวัน", category: "งานเตรียมพื้นที่", subcategory: "เครื่องมือ", unit: "set", material: 0.0, labor: 350.0 },
  { id: "crane-rental-day", name: "เครน/เครื่องจักร รายวัน", category: "งานเตรียมพื้นที่", subcategory: "เครื่องมือ", unit: "set", material: 0.0, labor: 2500.0 },
];
