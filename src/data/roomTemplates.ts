export interface RoomTemplateItem {
  name: string;
  category: string;
  subcategory: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  notes?: string;
}

export interface RoomTemplate {
  id: string;
  name: string;
  category: "ห้องน้ำ" | "ห้องครัว" | "ห้องนอน" | "ห้องนั่งเล่น" | "ห้องทานข้าว" | "ห้องแต่งตัว" | "ห้องซักล้าง";
  description: string;
  icon: string;
  estimatedCost: {
    min: number;
    max: number;
  };
  items: RoomTemplateItem[];
  tags: string[];
}

export const roomTemplates: RoomTemplate[] = [
  // ============================================
  // ห้องน้ำ (Bathroom)
  // ============================================
  {
    id: "bathroom-standard",
    name: "ห้องน้ำมาตรฐาน",
    category: "ห้องน้ำ",
    description: "ห้องน้ำครบชุด ขนาด 1.5x2 ม. พร้อมสุขภัณฑ์และระบบประปา",
    icon: "🚿",
    estimatedCost: { min: 35000, max: 55000 },
    tags: ["มาตรฐาน", "ครบชุด", "สุขภัณฑ์"],
    items: [
      // งานโครงสร้าง/ผนัง
      { name: "ก่อผนังคอนกรีตบลอก 4 นิ้ว", category: "โครงสร้าง", subcategory: "ผนัง", unit: "m2", quantity: 12, unitPrice: 450, amount: 5400 },
      { name: "ฉาบปูนผนังเรียบ 2 หน้า", category: "สถาปัตยกรรมภายใน", subcategory: "ปูน", unit: "m2", quantity: 24, unitPrice: 120, amount: 2880 },
      
      // งานกันซึม
      { name: "กันซึมพื้น/ผนังห้องน้ำ 2 ชั้น", category: "สถาปัตยกรรมภายใน", subcategory: "กันซึม", unit: "m2", quantity: 8, unitPrice: 280, amount: 2240 },
      
      // งานกระเบื้อง
      { name: "กระเบื้องผนัง 10x10 นิ้ว", category: "สถาปัตยกรรมภายใน", subcategory: "กระเบื้อง", unit: "m2", quantity: 15, unitPrice: 480, amount: 7200 },
      { name: "กระเบื้องพื้นห้องน้ำ 12x12 นิ้ว กันลื่น", category: "สถาปัตยกรรมภายใน", subcategory: "กระเบื้อง", unit: "m2", quantity: 3, unitPrice: 520, amount: 1560 },
      
      // สุขภัณฑ์
      { name: "สุขภัณฑ์ชิ้นเดียว เกรดมาตรฐาน", category: "ระบบ MEP", subcategory: "ประปา", unit: "set", quantity: 1, unitPrice: 4800, amount: 4800 },
      { name: "ติดตั้งอ่างล้างหน้าแขวน/วาง Top + S-trap", category: "ระบบ MEP", subcategory: "ประปา", unit: "set", quantity: 1, unitPrice: 650, amount: 650 },
      { name: "ติดตั้งชุดก๊อกผสมฝักบัวติดผนัง", category: "ระบบ MEP", subcategory: "ประปา", unit: "set", quantity: 1, unitPrice: 650, amount: 650 },
      
      // กระจกและอุปกรณ์
      { name: "กระจกเงาชนิดกันน้ำ 5 มม.", category: "สถาปัตยกรรมภายใน", subcategory: "กระจก", unit: "m2", quantity: 1.5, unitPrice: 850, amount: 1275 },
      { name: "ชั้นวางของสแตนเลส", category: "สถาปัตยกรรมภายใน", subcategory: "อุปกรณ์", unit: "pcs", quantity: 2, unitPrice: 350, amount: 700 },
      
      // ระบบประปา
      { name: "ท่อ PVC 1 นิ้ว พร้อมติดตั้ง", category: "ระบบ MEP", subcategory: "ประปา", unit: "m", quantity: 8, unitPrice: 70, amount: 560 },
      { name: "ท่อ PVC Class 8.5 ขนาด 1/2 นิ้ว", category: "ระบบ MEP", subcategory: "ประปา", unit: "m", quantity: 6, unitPrice: 30, amount: 180 },
      { name: "จุดน้ำเย็น (วาล์ว+เดินท่อถึงจุด)", category: "ระบบ MEP", subcategory: "ประปา", unit: "pt", quantity: 3, unitPrice: 330, amount: 990 },
      { name: "จุดท่อน้ำทิ้ง 2\"", category: "ระบบ MEP", subcategory: "ประปา", unit: "pt", quantity: 2, unitPrice: 220, amount: 440 },
      { name: "ตะแกรงกันกลิ่นสแตนเลส 4\"", category: "ระบบ MEP", subcategory: "ประปา", unit: "pcs", quantity: 1, unitPrice: 240, amount: 240 },
      
      // ไฟฟ้า
      { name: "จุดโคมไฟภายใน", category: "ระบบ MEP", subcategory: "ไฟฟ้า", unit: "point", quantity: 2, unitPrice: 650, amount: 1300 },
      { name: "จุดปลั๊กไฟ พร้อมสายและท่อ", category: "ระบบ MEP", subcategory: "ไฟฟ้า", unit: "point", quantity: 1, unitPrice: 570, amount: 570 },
      { name: "จุดสวิตช์ไฟ 1 ทาง", category: "ระบบ MEP", subcategory: "ไฟฟ้า", unit: "point", quantity: 1, unitPrice: 380, amount: 380 },
      
      // ประตู
      { name: "ประตูห้องน้ำ PVC พร้อมวงกบ", category: "สถาปัตยกรรมภายใน", subcategory: "ประตู", unit: "set", quantity: 1, unitPrice: 3200, amount: 3200 },
    ],
  },
  
  {
    id: "bathroom-premium",
    name: "ห้องน้ำ Premium",
    category: "ห้องน้ำ",
    description: "ห้องน้ำหรู พร้อมฉากกระจก อ่างอาบน้ำ และสุขภัณฑ์คุณภาพสูง",
    icon: "🛁",
    estimatedCost: { min: 85000, max: 150000 },
    tags: ["หรู", "อ่างอาบน้ำ", "ฉากกระจก"],
    items: [
      // งานโครงสร้าง/ผนัง
      { name: "ก่อผนังคอนกรีตบลอก 4 นิ้ว", category: "โครงสร้าง", subcategory: "ผนัง", unit: "m2", quantity: 18, unitPrice: 450, amount: 8100 },
      { name: "ฉาบปูนผนังเรียบ 2 หน้า", category: "สถาปัตยกรรมภายใน", subcategory: "ปูน", unit: "m2", quantity: 36, unitPrice: 120, amount: 4320 },
      
      // งานกันซึม
      { name: "กันซึม���ื้น/ผนังห้องน้ำ 2 ชั้น", category: "สถาปัตยกรรมภายใน", subcategory: "กันซึม", unit: "m2", quantity: 12, unitPrice: 280, amount: 3360 },
      
      // งานกระเบื้อง
      { name: "กระเบื้องผนัง 30x60 ซม.", category: "สถาปัตยกรรมภายใน", subcategory: "กระเบื้อง", unit: "m2", quantity: 25, unitPrice: 580, amount: 14500 },
      { name: "กระเบื้องพื้นห้องน้ำ 12x12 นิ้ว กันลื่น", category: "สถาปัตยกรรมภายใน", subcategory: "กระเบื้อง", unit: "m2", quantity: 6, unitPrice: 620, amount: 3720 },
      
      // สุขภัณฑ์ Premium
      { name: "สุขภัณฑ์ชิ้นเดียว เกรดมาตรฐาน", category: "ระบบ MEP", subcategory: "ประปา", unit: "set", quantity: 1, unitPrice: 12000, amount: 12000 },
      { name: "ติดตั้งอ่างล้างหน้าแขวน/วาง Top + S-trap", category: "ระบบ MEP", subcategory: "ประปา", unit: "set", quantity: 1, unitPrice: 850, amount: 850 },
      { name: "ชุดเรนชาวเวอร์ + มิกเซอร์", category: "ห้องน้ำโรงแรม", subcategory: "สุขภัณฑ์", unit: "set", quantity: 1, unitPrice: 4500, amount: 4500 },
      
      // ฉากกระจก
      { name: "ฉากกั้นอาบน้ำอลูมิเนียมกระจก 6 มม.", category: "สถาปัตยกรรมภายใน", subcategory: "ห้องน้ำ", unit: "m2", quantity: 3, unitPrice: 930, amount: 2790 },
      
      // กระจกและอุปกรณ์
      { name: "กระจกเงา Bevel 20 มม.", category: "สถาปัตยกรรมภายใน", subcategory: "กระจก", unit: "m2", quantity: 2, unitPrice: 800, amount: 1600 },
      { name: "ชั้นวางของสแตนเลส", category: "สถาปัตยกรรมภายใน", subcategory: "อุปกรณ์", unit: "pcs", quantity: 3, unitPrice: 450, amount: 1350 },
      { name: "ราวจับสแตนเลส ห้องน้ำ", category: "ห้องน้ำโรงแรม", subcategory: "อุปกรณ์", unit: "pcs", quantity: 2, unitPrice: 570, amount: 1140 },
      
      // ระบบประปา
      { name: "ท่อ PPR PN20 ขนาด 20 มม.", category: "ระบบ MEP", subcategory: "ประปา", unit: "m", quantity: 12, unitPrice: 140, amount: 1680 },
      { name: "จุดน้ำเย็น (วาล์ว+เดินท่อถึงจุด)", category: "ระบบ MEP", subcategory: "ประปา", unit: "pt", quantity: 4, unitPrice: 330, amount: 1320 },
      { name: "จุดท่อน้ำทิ้ง 2\"", category: "ระบบ MEP", subcategory: "ประปา", unit: "pt", quantity: 3, unitPrice: 220, amount: 660 },
      { name: "เครื่องทำน้ำอุ่น 3,500W ติดตั้ง", category: "ระบบ MEP", subcategory: "ประปา", unit: "set", quantity: 1, unitPrice: 600, amount: 600 },
      
      // ไฟฟ้า
      { name: "โคมดาวน์ไลท์ LED 9W", category: "ระบบ MEP", subcategory: "ไฟฟ้า", unit: "pcs", quantity: 4, unitPrice: 240, amount: 960 },
      { name: "จุดปลั๊กไฟ พร้อมสายและท่อ", category: "ระบบ MEP", subcategory: "ไฟฟ้า", unit: "point", quantity: 2, unitPrice: 570, amount: 1140 },
      { name: "จุดสวิตช์ไฟ 1 ทาง", category: "ระบบ MEP", subcategory: "ไฟฟ้า", unit: "point", quantity: 2, unitPrice: 380, amount: 760 },
      { name: "พัดลมระบายอากาศ 8 นิ้ว ติดตั้ง", category: "ระบบ MEP", subcategory: "ระบายอากาศ", unit: "set", quantity: 1, unitPrice: 650, amount: 650 },
      
      // ประตู
      { name: "ประตูภายใน HDF กันชื้น + มือจับ", category: "สถาปัตยกรรมภายใน", subcategory: "ประตู", unit: "pcs", quantity: 1, unitPrice: 2720, amount: 2720 },
    ],
  },

  // ============================================
  // ห้องครัว (Kitchen)
  // ============================================
  {
    id: "kitchen-thai-standard",
    name: "ครัวไทย มาตรฐาน",
    category: "ห้องครัว",
    description: "ครัวเปียกแบบไทย พร้อมซิงค์ เตาก๊าซ และตู้ครัวล่าง",
    icon: "🍳",
    estimatedCost: { min: 45000, max: 75000 },
    tags: ["ครัวเปียก", "ไทย", "มาตรฐาน"],
    items: [
      // งานผนัง
      { name: "ก่อผนังคอนกรีตบลอก 4 นิ้ว", category: "โครงสร้าง", subcategory: "ผนัง", unit: "m2", quantity: 10, unitPrice: 450, amount: 4500 },
      { name: "ฉาบปูนผนังเรียบ 2 หน้า", category: "สถาปัตยกรรมภายใน", subcategory: "ปูน", unit: "m2", quantity: 20, unitPrice: 120, amount: 2400 },
      
      // กระเบื้อง
      { name: "กระเบื้องผนังครัว 10x10 นิ้ว", category: "สถาปัตยกรรมภายใน", subcategory: "กระเบื้อง", unit: "m2", quantity: 12, unitPrice: 480, amount: 5760 },
      { name: "กระเบื้องพื้นครัว 12x12 นิ้ว", category: "สถาปัตยกรรมภายใน", subcategory: "กระเบื้อง", unit: "m2", quantity: 8, unitPrice: 420, amount: 3360 },
      
      // ตู้ครัว
      { name: "ตู้ครัวล่างโครงไม้อัด กรุเมลามีน", category: "สถาปัตยกรรมภายใน", subcategory: "ห้องครัว", unit: "m", quantity: 3, unitPrice: 4500, amount: 13500 },
      { name: "ท็อปครัวหินแกรนิต 2 ซม.", category: "สถาปัตยกรรมภายใน", subcategory: "ห้องครัว", unit: "m2", quantity: 2, unitPrice: 2800, amount: 5600 },
      
      // ซิงค์และอุปกรณ์
      { name: "ซิงค์ล้างจานสแตนเลส 2 หลุม", category: "ครัวเปียก/ซิงค์/สุขาภิบาลครัว", subcategory: "ซิงค์", unit: "pcs", quantity: 1, unitPrice: 5200, amount: 5200 },
      { name: "ติดตั้งก๊อกผสมซิงค์", category: "ระบบ MEP", subcategory: "ประปา", unit: "pcs", quantity: 1, unitPrice: 250, amount: 250 },
      { name: "ติดตั้งบ่อดักไขมัน 30 ลิตร (ครัว)", category: "ระบบ MEP", subcategory: "ประปา", unit: "set", quantity: 1, unitPrice: 1700, amount: 1700 },
      
      // ระบบประปา
      { name: "ท่อ PVC 1 นิ้ว พร้อมติดตั้ง", category: "ระบบ MEP", subcategory: "ประปา", unit: "m", quantity: 6, unitPrice: 70, amount: 420 },
      { name: "จุดน้ำเย็น (วาล์ว+เดินท่อถึงจุด)", category: "ระบบ MEP", subcategory: "ประปา", unit: "pt", quantity: 2, unitPrice: 330, amount: 660 },
      { name: "จุดท่อน้ำทิ้ง 2\"", category: "ระบบ MEP", subcategory: "ประปา", unit: "pt", quantity: 2, unitPrice: 220, amount: 440 },
      
      // ไฟฟ้า
      { name: "จุดโคมไฟภายใน", category: "ระบบ MEP", subcategory: "ไฟฟ้า", unit: "point", quantity: 3, unitPrice: 650, amount: 1950 },
      { name: "จุดปลั๊กไฟ พร้อมสายและท่อ", category: "ระบบ MEP", subcategory: "ไฟฟ้า", unit: "point", quantity: 3, unitPrice: 570, amount: 1710 },
      { name: "จุดสวิตช์ไฟ 1 ทาง", category: "ระบบ MEP", subcategory: "ไฟฟ้า", unit: "point", quantity: 2, unitPrice: 380, amount: 760 },
      
      // ระบายอากาศ
      { name: "พัดลมระบายอากาศ 8 นิ้ว ติดตั้ง", category: "ระบบ MEP", subcategory: "ระบายอากาศ", unit: "set", quantity: 1, unitPrice: 650, amount: 650 },
    ],
  },

  {
    id: "kitchen-modern",
    name: "ครัวสไตล์โมเดิร์น",
    category: "ห้องครัว",
    description: "ครัวปิดพร้อมตู้บน-ล่าง เคาน์เตอร์หินควอตซ์ และเครื่องใช้ไฟฟ้า",
    icon: "👨‍🍳",
    estimatedCost: { min: 120000, max: 200000 },
    tags: ["โมเดิร์น", "ครัวแห้ง", "ครบชุด"],
    items: [
      // งานผนัง
      { name: "ก่อผนังคอนกรีตบลอก 4 นิ้ว", category: "โครงสร้าง", subcategory: "ผนัง", unit: "m2", quantity: 15, unitPrice: 450, amount: 6750 },
      { name: "ฉาบปูนผนังเรียบ 2 หน้า", category: "สถาปัตยกรรมภายใน", subcategory: "ปูน", unit: "m2", quantity: 30, unitPrice: 120, amount: 3600 },
      { name: "กระเบื้องผนังครัว 30x60 ซม.", category: "สถาปัตยกรรมภายใน", subcategory: "กระเบื้อง", unit: "m2", quantity: 15, unitPrice: 580, amount: 8700 },
      
      // พื้น
      { name: "กระเบื้องพื้นครัว 12x12 นิ้ว", category: "สถาปัตยกรรมภายใน", subcategory: "กระเบื้อง", unit: "m2", quantity: 12, unitPrice: 520, amount: 6240 },
      
      // ตู้ครัว
      { name: "ตู้ครัวบน HMR 18 มม. เมลามีน", category: "สถาปัตยกรรมภายใน", subcategory: "ห้องครัว", unit: "m", quantity: 3, unitPrice: 6000, amount: 18000 },
      { name: "ตู้ครัวล่างโครงไม้อัด กรุเมลามีน", category: "สถาปัตยกรรมภายใน", subcategory: "ห้องครัว", unit: "m", quantity: 4, unitPrice: 5500, amount: 22000 },
      { name: "ท็อปหินควอตซ์ ครัว 20 มม.", category: "สถาปัตยกรรมภายใน", subcategory: "ห้องครัว", unit: "m2", quantity: 3, unitPrice: 2850, amount: 8550 },
      
      // ซิงค์และอุปกรณ์
      { name: "ซิงค์ล้างจานสแตนเลส 2 หลุม", category: "ครัวเปียก/ซิงค์/สุขาภิบาลครัว", subcategory: "ซิงค์", unit: "pcs", quantity: 1, unitPrice: 6500, amount: 6500 },
      { name: "ติดตั้งก๊อกผสมซิงค์", category: "ระบบ MEP", subcategory: "ประปา", unit: "pcs", quantity: 1, unitPrice: 250, amount: 250 },
      { name: "ฮูดดูดควัน ติดผนัง 90 ซม.", category: "สถาปัตยกรรมภายใน", subcategory: "ห้องครัว", unit: "set", quantity: 1, unitPrice: 3800, amount: 3800 },
      
      // บ่อดักไขมัน
      { name: "ติดตั้งบ่อดักไขมัน 60 ลิตร (ครัว)", category: "ระบบ MEP", subcategory: "ประปา", unit: "set", quantity: 1, unitPrice: 2400, amount: 2400 },
      
      // ระบบประปา
      { name: "ท่อ PPR PN20 ขนาด 20 มม.", category: "ระบบ MEP", subcategory: "ประปา", unit: "m", quantity: 10, unitPrice: 140, amount: 1400 },
      { name: "จุดน้ำเย็น (วาล์ว+เดินท่อถึงจุด)", category: "ระบบ MEP", subcategory: "ประปา", unit: "pt", quantity: 3, unitPrice: 330, amount: 990 },
      { name: "จุดท่อน้ำทิ้ง 2\"", category: "ระบบ MEP", subcategory: "ประปา", unit: "pt", quantity: 2, unitPrice: 220, amount: 440 },
      
      // ไฟฟ้า
      { name: "โคมดาวน์ไลท์ LED 9W", category: "ระบบ MEP", subcategory: "ไฟฟ้า", unit: "pcs", quantity: 6, unitPrice: 240, amount: 1440 },
      { name: "ไฟเส้น LED ใต้ตู้ + ไดรเวอร์", category: "สถาปัตยกรรมภายใน", subcategory: "ไฟ", unit: "m", quantity: 4, unitPrice: 200, amount: 800 },
      { name: "จุดปลั๊กไฟ พร้อมสายและท่อ", category: "ระบบ MEP", subcategory: "ไฟฟ้า", unit: "point", quantity: 5, unitPrice: 570, amount: 2850 },
      { name: "จุดสวิตช์ไฟ 1 ทาง", category: "ระบบ MEP", subcategory: "ไฟฟ้า", unit: "point", quantity: 2, unitPrice: 380, amount: 760 },
      
      // ระบายอากาศ
      { name: "พัดลมระบายอากาศ 8 นิ้ว ติดตั้ง", category: "ระบบ MEP", subcategory: "ระบายอากาศ", unit: "set", quantity: 1, unitPrice: 650, amount: 650 },
    ],
  },

  // ============================================
  // ห้องนอน (Bedroom)
  // ============================================
  {
    id: "bedroom-standard",
    name: "ห้องนอนมาตรฐาน",
    category: "ห้องนอน",
    description: "ห้องนอน 3x3.5 ม. พร้อมตู้เสื้อผ้าบิ้วอิน",
    icon: "🛏️",
    estimatedCost: { min: 35000, max: 60000 },
    tags: ["มาตรฐาน", "ตู้บิ้วอิน"],
    items: [
      // งานผนัง
      { name: "ก่อผนังคอนกรีตบลอก 4 นิ้ว", category: "โครงสร้าง", subcategory: "ผนัง", unit: "m2", quantity: 20, unitPrice: 450, amount: 9000 },
      { name: "ฉาบปูนผนังเรียบ 2 หน้า", category: "สถาปัตยกรรมภายใน", subcategory: "ปูน", unit: "m2", quantity: 40, unitPrice: 120, amount: 4800 },
      { name: "ทาสีอะครีลิคภายใน 2 เที่ยว", category: "สถาปัตยกรรมภายใน", subcategory: "ทาสี", unit: "m2", quantity: 40, unitPrice: 80, amount: 3200 },
      
      // พื้น
      { name: "พื้นกระเบื้อง 60x60 ซม.", category: "สถาปัตยกรรมภายใน", subcategory: "พื้น", unit: "m2", quantity: 10.5, unitPrice: 480, amount: 5040 },
      { name: "บัวพื้น PVC", category: "สถาปัตยกรรมภายใน", subcategory: "บัว", unit: "m", quantity: 13, unitPrice: 60, amount: 780 },
      
      // ตู้เสื้อผ้า
      { name: "ตู้เสื้อผ้าบิลท์อิน ลามิเนต", category: "ห้องพักโรงแรม (FF&E)", subcategory: "ตู้", unit: "m2", quantity: 6, unitPrice: 2500, amount: 15000 },
      { name: "บานพับ Soft-close (แพ็ก 2 ชิ้น)", category: "สถาปัตยกรรมภายใน", subcategory: "ฮาร์ดแวร์", unit: "pack", quantity: 3, unitPrice: 240, amount: 720 },
      
      // ไฟฟ้า
      { name: "โคมดาวน์ไลท์ LED 9W", category: "ระบบ MEP", subcategory: "ไฟฟ้า", unit: "pcs", quantity: 4, unitPrice: 240, amount: 960 },
      { name: "จุดปลั๊กไฟ พร้อมสายและท่อ", category: "ระบบ MEP", subcategory: "ไฟฟ้า", unit: "point", quantity: 4, unitPrice: 570, amount: 2280 },
      { name: "จุดสวิตช์ไฟ 1 ทาง", category: "ระบบ MEP", subcategory: "ไฟฟ้า", unit: "point", quantity: 2, unitPrice: 380, amount: 760 },
      
      // แอร์
      { name: "ติดตั้งแอร์ Split 12,000 BTU (ไม่รวมเครื่อง)", category: "ระบบ MEP", subcategory: "แอร์", unit: "set", quantity: 1, unitPrice: 2500, amount: 2500 },
      { name: "ท่อทองแดงชุดแอร์ 1/4-1/2\"", category: "ระบบ MEP", subcategory: "แอร์", unit: "m", quantity: 5, unitPrice: 180, amount: 900 },
      { name: "รางครอบท่อแอร์ PVC 2 นิ้ว", category: "ระบบ MEP", subcategory: "แอร์", unit: "m", quantity: 5, unitPrice: 100, amount: 500 },
      
      // ประตู
      { name: "ประตูภายใน HDF กันชื้น + มือจับ", category: "สถาปัตยกรรมภายใน", subcategory: "ประตู", unit: "pcs", quantity: 1, unitPrice: 2720, amount: 2720 },
    ],
  },

  {
    id: "bedroom-master",
    name: "Master Bedroom พร้อมห้องน้ำใน",
    category: "ห้องนอน",
    description: "ห้องนอนใหญ่ 4x5 ม. พร้อมตู้เสื้อผ้า Walk-in และห้องน้ำในตัว",
    icon: "👑",
    estimatedCost: { min: 180000, max: 300000 },
    tags: ["Master", "Walk-in", "ห้องน้ำใน"],
    items: [
      // งานผนัง
      { name: "ก่อผนังคอนกรีตบลอก 4 นิ้ว", category: "โครงสร้าง", subcategory: "ผนัง", unit: "m2", quantity: 35, unitPrice: 450, amount: 15750 },
      { name: "ฉาบปูนผนังเรียบ 2 หน้า", category: "สถาปัตยกรรมภายใน", subcategory: "ปูน", unit: "m2", quantity: 70, unitPrice: 120, amount: 8400 },
      { name: "ทาสีอะครีลิคภายใน 2 เที่ยว", category: "สถาปัตยกรรมภายใน", subcategory: "ทาสี", unit: "m2", quantity: 70, unitPrice: 80, amount: 5600 },
      
      // พื้น
      { name: "พื้นไม้ลามิเนต 12 มม.", category: "สถาปัตยกรรมภายใน", subcategory: "พื้น", unit: "m2", quantity: 20, unitPrice: 620, amount: 12400 },
      { name: "บัวพื้น PVC", category: "สถาปัตยกรรมภายใน", subcategory: "บัว", unit: "m", quantity: 18, unitPrice: 60, amount: 1080 },
      
      // ตู้เสื้อผ้า Walk-in
      { name: "ตู้เสื้อผ้าบิลท์อิน ลามิเนต", category: "ห้องพักโรงแรม (FF&E)", subcategory: "ตู้", unit: "m2", quantity: 12, unitPrice: 2800, amount: 33600 },
      { name: "ราง Soft-close ตู้บานเลื่อน", category: "สถาปัตยกรรมภายใน", subcategory: "ฮาร์ดแวร์", unit: "set", quantity: 2, unitPrice: 560, amount: 1120 },
      { name: "ไฟเส้น LED ใต้ตู้ + ไดรเวอร์", category: "สถาปัตยกรรมภายใน", subcategory: "ไฟ", unit: "m", quantity: 6, unitPrice: 200, amount: 1200 },
      
      // ห้องน้ำใน (ใช้รายการจาก bathroom-premium)
      { name: "กันซึมพื้น/ผนังห้องน้ำ 2 ชั้น", category: "สถาปัตยกรรมภายใน", subcategory: "กันซึม", unit: "m2", quantity: 8, unitPrice: 280, amount: 2240 },
      { name: "กระเบื้องผนัง 30x60 ซม.", category: "สถาปัตยกรรมภายใน", subcategory: "กระเบื้อง", unit: "m2", quantity: 18, unitPrice: 580, amount: 10440 },
      { name: "กระเบื้องพื้นห้องน้ำ 12x12 นิ้ว กันลื่น", category: "สถาปัตยกรรมภายใน", subcategory: "กระเบื้อง", unit: "m2", quantity: 4, unitPrice: 620, amount: 2480 },
      { name: "สุขภัณฑ์ชิ้นเดียว เกรดมาตรฐาน", category: "ระบบ MEP", subcategory: "ประปา", unit: "set", quantity: 1, unitPrice: 12000, amount: 12000 },
      { name: "ชุดเรนชาวเวอร์ + มิกเซอร์", category: "ห้องน้ำโรงแรม", subcategory: "สุขภัณฑ์", unit: "set", quantity: 1, unitPrice: 4500, amount: 4500 },
      { name: "ฉากกั้นอาบน้ำอลูมิเนียมกระจก 6 มม.", category: "สถาปัตยกรรมภายใน", subcategory: "ห้องน้ำ", unit: "m2", quantity: 2.5, unitPrice: 930, amount: 2325 },
      
      // ไฟฟ้า
      { name: "โคมดาวน์ไลท์ LED 9W", category: "ระบบ MEP", subcategory: "ไฟฟ้า", unit: "pcs", quantity: 8, unitPrice: 240, amount: 1920 },
      { name: "จุดปลั๊กไฟ พร้อมสายและท่อ", category: "ระบบ MEP", subcategory: "ไฟฟ้า", unit: "point", quantity: 8, unitPrice: 570, amount: 4560 },
      { name: "จุดสวิตช์ไฟ 1 ทาง", category: "ระบบ MEP", subcategory: "ไฟฟ้า", unit: "point", quantity: 4, unitPrice: 380, amount: 1520 },
      
      // แอร์
      { name: "ติดตั้งแอร์ Split 18,000 BTU (ไม่รวมเครื่อง)", category: "ระบบ MEP", subcategory: "แอร์", unit: "set", quantity: 1, unitPrice: 3200, amount: 3200 },
      { name: "ท่อทองแดงชุดแอร์ 1/4-1/2\"", category: "ระบบ MEP", subcategory: "แอร์", unit: "m", quantity: 8, unitPrice: 180, amount: 1440 },
      
      // ประตู
      { name: "ประตูภายใน HDF กันชื้น + มือจับ", category: "สถาปัตยกรรมภายใน", subcategory: "ประตู", unit: "pcs", quantity: 2, unitPrice: 2720, amount: 5440 },
    ],
  },

  // ============================================
  // ห้องนั่งเล่น (Living Room)
  // ============================================
  {
    id: "living-standard",
    name: "ห้องนั่งเล่นมาตรฐาน",
    category: "ห้องนั่งเล่น",
    description: "ห้องนั่งเล่น 4x5 ม. พื้นกระเบื้อง ผนังทาสี",
    icon: "🛋️",
    estimatedCost: { min: 40000, max: 65000 },
    tags: ["มาตรฐาน", "โล่ง"],
    items: [
      // งานผนัง
      { name: "ก่อผนังคอนกรีตบลอก 4 นิ้ว", category: "โครงสร้าง", subcategory: "ผนัง", unit: "m2", quantity: 25, unitPrice: 450, amount: 11250 },
      { name: "ฉาบปูนผนังเรียบ 2 หน้า", category: "สถาปัตยกรรมภายใน", subcategory: "ปูน", unit: "m2", quantity: 50, unitPrice: 120, amount: 6000 },
      { name: "ทาสีอะครีลิคภายใน 2 เที่ยว", category: "สถาปัตยกรรมภายใน", subcategory: "ทาสี", unit: "m2", quantity: 50, unitPrice: 80, amount: 4000 },
      
      // พื้น
      { name: "พื้นกระเบื้อง 60x60 ซม.", category: "สถาปัตยกรรมภายใน", subcategory: "พื้น", unit: "m2", quantity: 20, unitPrice: 480, amount: 9600 },
      { name: "บัวพื้น PVC", category: "สถาปัตยกรรมภายใน", subcategory: "บัว", unit: "m", quantity: 18, unitPrice: 60, amount: 1080 },
      
      // ไฟฟ้า
      { name: "โคมดาวน์ไลท์ LED 9W", category: "ระบบ MEP", subcategory: "ไฟฟ้า", unit: "pcs", quantity: 8, unitPrice: 240, amount: 1920 },
      { name: "จุดปลั๊กไฟ พร้อมสายและท่อ", category: "ระบบ MEP", subcategory: "ไฟฟ้า", unit: "point", quantity: 6, unitPrice: 570, amount: 3420 },
      { name: "จุดสวิตช์ไฟ 1 ทาง", category: "ระบบ MEP", subcategory: "ไฟฟ้า", unit: "point", quantity: 3, unitPrice: 380, amount: 1140 },
      
      // แอร์
      { name: "ติดตั้งแอร์ Split 18,000 BTU (ไม่รวมเครื่อง)", category: "ระบบ MEP", subcategory: "แอร์", unit: "set", quantity: 1, unitPrice: 3200, amount: 3200 },
      { name: "ท่อทองแดงชุดแอร์ 1/4-1/2\"", category: "ระบบ MEP", subcategory: "แอร์", unit: "m", quantity: 6, unitPrice: 180, amount: 1080 },
      { name: "รางครอบท่อแอร์ PVC 2 ��ิ้ว", category: "ระบบ MEP", subcategory: "แอร์", unit: "m", quantity: 6, unitPrice: 100, amount: 600 },
    ],
  },

  {
    id: "living-premium",
    name: "ห้องนั่งเล่น Premium + ฝ้า",
    category: "ห้องนั่งเล่น",
    description: "ห้องนั่งเล่นหรู พร้อมฝ้าฉาบเรียบ ไฟซ่อนขอบ และผนังสีเฉพาะจุด",
    icon: "✨",
    estimatedCost: { min: 95000, max: 150000 },
    tags: ["Premium", "ฝ้า", "ไฟซ่อน"],
    items: [
      // งานผนัง
      { name: "ก่อผนังคอนกรีตบลอก 4 นิ้ว", category: "โครงสร้าง", subcategory: "ผนัง", unit: "m2", quantity: 30, unitPrice: 450, amount: 13500 },
      { name: "ฉาบปูนผนังเรียบ 2 หน้า", category: "สถาปัตยกรรมภายใน", subcategory: "ปูน", unit: "m2", quantity: 60, unitPrice: 120, amount: 7200 },
      { name: "ทาสีอะครีลิคภายใน 2 เที่ยว", category: "สถาปัตยกรรมภายใน", subcategory: "ทาสี", unit: "m2", quantity: 50, unitPrice: 80, amount: 4000 },
      { name: "ผนังตกแต่งไม้จริง Finger-joint", category: "สถาปัตยกรรมภายใน", subcategory: "ผนัง", unit: "m2", quantity: 8, unitPrice: 1300, amount: 10400 },
      
      // พื้น
      { name: "พื้นไม้ลามิเนต 12 มม.", category: "สถาปัตยกรรมภายใน", subcategory: "พื้น", unit: "m2", quantity: 25, unitPrice: 620, amount: 15500 },
      { name: "บัวพื้น PVC", category: "สถาปัตยกรรมภายใน", subcategory: "บัว", unit: "m", quantity: 20, unitPrice: 60, amount: 1200 },
      
      // ฝ้า
      { name: "ฝ้าฉาบเรียบ กันชื้น 9 มม.", category: "สถาปัตยกรรมภายใน", subcategory: "ฝ้า", unit: "m2", quantity: 25, unitPrice: 390, amount: 9750 },
      { name: "ทำ Bulkhead ยิปซัม ซ่อนแสง", category: "สถาปัตยกรรมภายใน", subcategory: "ฝ้า", unit: "m", quantity: 12, unitPrice: 180, amount: 2160 },
      { name: "ไฟเส้น LED ใต้ตู้ + ไดรเวอร์", category: "สถาปัตยกรรมภายใน", subcategory: "ไฟ", unit: "m", quantity: 12, unitPrice: 200, amount: 2400 },
      
      // ไฟฟ้า
      { name: "โคมดาวน์ไลท์ LED 9W", category: "ระบบ MEP", subcategory: "ไฟฟ้า", unit: "pcs", quantity: 12, unitPrice: 240, amount: 2880 },
      { name: "โคมแผง LED 60x60", category: "ระบบ MEP", subcategory: "ไฟฟ้า", unit: "pcs", quantity: 2, unitPrice: 700, amount: 1400 },
      { name: "จุดปลั๊กไฟ พร้อมสายและท่อ", category: "ระบบ MEP", subcategory: "ไฟฟ้า", unit: "point", quantity: 8, unitPrice: 570, amount: 4560 },
      { name: "จุดสวิตช์ไฟ 1 ทาง", category: "ระบบ MEP", subcategory: "ไฟฟ้า", unit: "point", quantity: 4, unitPrice: 380, amount: 1520 },
      
      // แอร์
      { name: "ติดตั้งแอร์ Split 18,000 BTU (ไม่รวมเครื่อง)", category: "ระบบ MEP", subcategory: "แอร์", unit: "set", quantity: 1, unitPrice: 3200, amount: 3200 },
      { name: "ท่อทองแดงชุดแอร์ 1/4-1/2\"", category: "ระบบ MEP", subcategory: "แอร์", unit: "m", quantity: 8, unitPrice: 180, amount: 1440 },
      { name: "รางครอบท่อแอร์ PVC 2 นิ้ว", category: "ระบบ MEP", subcategory: "แอร์", unit: "m", quantity: 8, unitPrice: 100, amount: 800 },
    ],
  },

  // ============================================
  // ห้องทานข้าว (Dining Room)
  // ============================================
  {
    id: "dining-standard",
    name: "ห้องทานข้าวมาตรฐาน",
    category: "ห้องทานข้าว",
    description: "ห้องทานข้าว 3x4 ม. พื้นกระเบื้อง พร้อมไฟระย้า",
    icon: "🍽️",
    estimatedCost: { min: 30000, max: 50000 },
    tags: ["มาตรฐาน", "โล่ง"],
    items: [
      // งานผนัง
      { name: "ก่อผนังคอนกรีตบลอก 4 นิ้ว", category: "โครงสร้าง", subcategory: "ผนัง", unit: "m2", quantity: 18, unitPrice: 450, amount: 8100 },
      { name: "ฉาบปูนผนังเรียบ 2 หน้า", category: "สถาปัตยกรรมภายใน", subcategory: "ปูน", unit: "m2", quantity: 36, unitPrice: 120, amount: 4320 },
      { name: "ทาสีอะครีลิคภายใน 2 เที่ยว", category: "สถาปัตยกรรมภายใน", subcategory: "ทาสี", unit: "m2", quantity: 36, unitPrice: 80, amount: 2880 },
      
      // พื้น
      { name: "พื้นกระเบื้อง 60x60 ซม.", category: "สถาปัตยกรรมภายใน", subcategory: "พื้น", unit: "m2", quantity: 12, unitPrice: 480, amount: 5760 },
      { name: "บัวพื้น PVC", category: "สถาปัตยกรรมภายใน", subcategory: "บัว", unit: "m", quantity: 14, unitPrice: 60, amount: 840 },
      
      // ไฟฟ้า
      { name: "โคมดาวน์ไลท์ LED 9W", category: "ระบบ MEP", subcategory: "ไฟฟ้า", unit: "pcs", quantity: 4, unitPrice: 240, amount: 960 },
      { name: "จุดปลั๊กไฟ พร้อมสายและท่อ", category: "ระบบ MEP", subcategory: "ไฟฟ้า", unit: "point", quantity: 3, unitPrice: 570, amount: 1710 },
      { name: "จุดสวิตช์ไฟ 1 ทาง", category: "ระบบ MEP", subcategory: "ไฟฟ้า", unit: "point", quantity: 2, unitPrice: 380, amount: 760 },
      
      // แอร์
      { name: "ติดตั้งแอร์ Split 12,000 BTU (ไม่รวมเครื่อง)", category: "ระบบ MEP", subcategory: "แอร์", unit: "set", quantity: 1, unitPrice: 2500, amount: 2500 },
      { name: "ท่อทองแดงชุดแอร์ 1/4-1/2\"", category: "ระบบ MEP", subcategory: "แอร์", unit: "m", quantity: 5, unitPrice: 180, amount: 900 },
    ],
  },

  // ============================================
  // ห้องแต่งตัว (Dressing Room)
  // ============================================
  {
    id: "dressing-walkin",
    name: "ห้องแต่งตัว Walk-in",
    category: "ห้องแต่งตัว",
    description: "ห้องแต่งตัว 2x3 ม. พร้อมตู้บิ้วอิน ชั้นวาง และกระจกเงา",
    icon: "👔",
    estimatedCost: { min: 60000, max: 100000 },
    tags: ["Walk-in", "ตู้บิ้วอิน", "กระจก"],
    items: [
      // งานผนัง
      { name: "ก่อผนังคอนกรีตบลอก 4 นิ้ว", category: "โครงสร้าง", subcategory: "ผนัง", unit: "m2", quantity: 12, unitPrice: 450, amount: 5400 },
      { name: "ฉาบปูนผนังเรียบ 2 หน้า", category: "สถาปัตยกรรมภายใน", subcategory: "ปูน", unit: "m2", quantity: 24, unitPrice: 120, amount: 2880 },
      { name: "ทาสีอะครีลิคภายใน 2 เที่ยว", category: "สถาปัตยกรรมภายใน", subcategory: "ทาสี", unit: "m2", quantity: 24, unitPrice: 80, amount: 1920 },
      
      // พื้น
      { name: "พื้นไม้ลามิเนต 12 มม.", category: "สถาปัตยกรรมภายใน", subcategory: "พื้น", unit: "m2", quantity: 6, unitPrice: 620, amount: 3720 },
      { name: "บัวพื้น PVC", category: "สถาปัตยกรรมภายใน", subcategory: "บัว", unit: "m", quantity: 10, unitPrice: 60, amount: 600 },
      
      // ตู้บิ้วอิน Walk-in
      { name: "ตู้เสื้อผ้าบิลท์อิน ลามิเนต", category: "ห้องพักโรงแรม (FF&E)", subcategory: "ตู้", unit: "m2", quantity: 10, unitPrice: 2800, amount: 28000 },
      { name: "บานพับ Soft-close (แพ็ก 2 ชิ้น)", category: "สถาปัตยกรรมภายใน", subcategory: "ฮาร์ดแวร์", unit: "pack", quantity: 4, unitPrice: 240, amount: 960 },
      { name: "ราง Soft-close ตู้บานเลื่อน", category: "สถาปัตยกรรมภายใน", subcategory: "ฮาร์ดแวร์", unit: "set", quantity: 1, unitPrice: 560, amount: 560 },
      
      // กระจก
      { name: "กระจกเงาชนิดกันน้ำ 5 มม.", category: "สถาปัตยกรรมภายใน", subcategory: "กระจก", unit: "m2", quantity: 3, unitPrice: 850, amount: 2550 },
      
      // ไฟฟ้า
      { name: "โคมดาวน์ไลท์ LED 9W", category: "ระบบ MEP", subcategory: "ไฟฟ้า", unit: "pcs", quantity: 4, unitPrice: 240, amount: 960 },
      { name: "ไฟเส้น LED ใต้ตู้ + ไดรเวอร์", category: "สถาปัตยกรรมภายใน", subcategory: "ไฟ", unit: "m", quantity: 4, unitPrice: 200, amount: 800 },
      { name: "จุดปลั๊กไฟ พร้อมสายและท่อ", category: "ระบบ MEP", subcategory: "ไฟฟ้า", unit: "point", quantity: 2, unitPrice: 570, amount: 1140 },
      { name: "จุดสวิตช์ไฟ 1 ทาง", category: "ระบบ MEP", subcategory: "ไฟฟ้า", unit: "point", quantity: 2, unitPrice: 380, amount: 760 },
      
      // ประตู
      { name: "ประตูภายใน HDF กันชื้น + มือจับ", category: "สถาปัตยกรรมภายใน", subcategory: "ประตู", unit: "pcs", quantity: 1, unitPrice: 2720, amount: 2720 },
    ],
  },

  // ============================================
  // ห้องซักล้าง (Laundry Room)
  // ============================================
  {
    id: "laundry-standard",
    name: "ห้องซักล้างมาตรฐาน",
    category: "ห้องซักล้าง",
    description: "ห้องซักล้าง 1.5x2 ม. พร้อมซิงค์ ตู้เก็บของ และระบบประปา",
    icon: "🧺",
    estimatedCost: { min: 25000, max: 45000 },
    tags: ["มาตรฐาน", "ซิงค์", "ตู้บิ้วอิน"],
    items: [
      // งานผนัง
      { name: "ก่อผนังคอนกรีตบลอก 4 นิ้ว", category: "โครงสร้าง", subcategory: "ผนัง", unit: "m2", quantity: 10, unitPrice: 450, amount: 4500 },
      { name: "ฉาบปูนผนังเรียบ 2 หน้า", category: "สถาปัตยกรรมภายใน", subcategory: "ปูน", unit: "m2", quantity: 20, unitPrice: 120, amount: 2400 },
      { name: "ทาสีอะครีลิคภายใน 2 เที่ยว", category: "สถาปัตยกรรมภายใน", subcategory: "ทาสี", unit: "m2", quantity: 20, unitPrice: 80, amount: 1600 },
      
      // พื้น + กันซึม
      { name: "กันซึมพื้น/ผนังห้องน้ำ 2 ชั้น", category: "สถาปัตยกรรมภายใน", subcategory: "กันซึม", unit: "m2", quantity: 4, unitPrice: 280, amount: 1120 },
      { name: "กระเบื้องพื้นห้องน้ำ 12x12 นิ้ว กันลื่น", category: "สถาปัตยกรรมภายใน", subcategory: "กระเบื้อง", unit: "m2", quantity: 3, unitPrice: 520, amount: 1560 },
      { name: "กระเบื้องผนัง 10x10 นิ้ว", category: "สถาปัตยกรรมภายใน", subcategory: "กระเบื้อง", unit: "m2", quantity: 5, unitPrice: 480, amount: 2400 },
      
      // ตู้บิ้วอิน
      { name: "ตู้ครัวล่างโครงไม้อัด กรุเมลามีน", category: "สถาปัตยกรรมภายใน", subcategory: "ห้องครัว", unit: "m", quantity: 1.5, unitPrice: 4500, amount: 6750 },
      { name: "ท็อปครัวหินแกรนิต 2 ซม.", category: "สถาปัตยกรรมภายใน", subcategory: "ห้องครัว", unit: "m2", quantity: 0.5, unitPrice: 2800, amount: 1400 },
      
      // ซิงค์และอุปกรณ์
      { name: "ติดตั้งอ่างล้างหน้าแขวน/วาง Top + S-trap", category: "ระบบ MEP", subcategory: "ประปา", unit: "set", quantity: 1, unitPrice: 650, amount: 650 },
      { name: "ติดตั้งก๊อกผสมซิงค์", category: "ระบบ MEP", subcategory: "ประปา", unit: "pcs", quantity: 1, unitPrice: 250, amount: 250 },
      
      // ระบบประปา
      { name: "ท่อ PVC 1 นิ้ว พร้อมติดตั้ง", category: "ระบบ MEP", subcategory: "ประปา", unit: "m", quantity: 4, unitPrice: 70, amount: 280 },
      { name: "จุดน้ำเย็น (วาล์ว+เดินท่อถึงจุด)", category: "ระบบ MEP", subcategory: "ประปา", unit: "pt", quantity: 2, unitPrice: 330, amount: 660 },
      { name: "จุดท่อน้ำทิ้ง 2\"", category: "ระบบ MEP", subcategory: "ประปา", unit: "pt", quantity: 2, unitPrice: 220, amount: 440 },
      { name: "ตะแกรงกันกลิ่นสแตนเลส 4\"", category: "ระบบ MEP", subcategory: "ประปา", unit: "pcs", quantity: 1, unitPrice: 240, amount: 240 },
      
      // ไฟฟ้า
      { name: "โคมดาวน์ไลท์ LED 9W", category: "ระบบ MEP", subcategory: "ไฟฟ้า", unit: "pcs", quantity: 2, unitPrice: 240, amount: 480 },
      { name: "จุดปลั๊กไฟ พร้อมสายและท่อ", category: "ระบบ MEP", subcategory: "ไฟฟ้า", unit: "point", quantity: 2, unitPrice: 570, amount: 1140 },
      { name: "จุดสวิตช์ไฟ 1 ทาง", category: "ระบบ MEP", subcategory: "ไฟฟ้า", unit: "point", quantity: 1, unitPrice: 380, amount: 380 },
      { name: "พัดลมระบายอากาศ 8 นิ้ว ติดตั้ง", category: "ระบบ MEP", subcategory: "ระบายอากาศ", unit: "set", quantity: 1, unitPrice: 650, amount: 650 },
      
      // ประตู
      { name: "ประตูภายใน HDF กันชื้น + มือจับ", category: "สถาปัตยกรรมภายใน", subcategory: "ประตู", unit: "pcs", quantity: 1, unitPrice: 2720, amount: 2720 },
    ],
  },
];

// Helper functions
export function getRoomCategories(): string[] {
  return ["ห้องน้ำ", "ห้องครัว", "ห้องนอน", "ห้องนั่งเล่น", "ห้องทานข้าว", "ห้องแต่งตัว", "ห้องซักล้าง"];
}

export function getTemplatesByRoom(category: string): RoomTemplate[] {
  return roomTemplates.filter(t => t.category === category);
}

export function getTemplateById(id: string): RoomTemplate | undefined {
  return roomTemplates.find(t => t.id === id);
}
