import { QuotationItem } from './projectData';

export interface ItemTemplate {
  id: string;
  name: string;
  category: string;
  items: QuotationItem[];
}

export const itemTemplates: ItemTemplate[] = [
  // ===== งานเตรียม =====
  {
    id: 'template-demolition',
    name: 'งานรื้อถอน',
    category: 'งานเตรียม',
    items: [
      {
        no: '1',
        description: 'รื้อถอนฝ้าเพดานเดิม',
        unit: 'ตร.ม.',
        quantity: 30,
        unitPrice: 50,
        laborCost: 80,
        scopeDetails: '- รื้อฝ้ายิปซั่ม/แคลเซียมซิลิเกตเดิม\n- รื้อโครงฝ้า\n- ขนย้ายเศษวัสดุ'
      },
      {
        no: '2',
        description: 'รื้อถอนพื้นเดิม (กระเบื้อง/ไม้/พรม)',
        unit: 'ตร.ม.',
        quantity: 30,
        unitPrice: 30,
        laborCost: 100,
        scopeDetails: '- รื้อกระเบื้อง/ลามิเนต/พรมเดิม\n- ขัดกาวเก่า\n- ปรับระดับ'
      },
      {
        no: '3',
        description: 'รื้อถอนผนังกั้นห้อง / ประตู-หน้าต่างเดิม',
        unit: 'เหมา',
        quantity: 1,
        unitPrice: 8000,
        laborCost: 12000,
        scopeDetails: '- รื้อผนังยิปซั่ม/อิฐเดิม\n- รื้อวงกบ/ประตู/หน้าต่าง\n- เก็บทำความสะอาด'
      },
      {
        no: '4',
        description: 'ขนย้ายเศษวัสดุ + ค่าทิ้ง',
        unit: 'เที่ยว',
        quantity: 2,
        unitPrice: 3500,
        laborCost: 1500,
        scopeDetails: '- รถบรรทุก 6 ล้อ\n- ขนเศษวัสดุไปทิ้ง\n- ค่าทิ้งที่ลานทิ้ง'
      }
    ]
  },
  // ===== งานระบบ =====
  {
    id: 'template-electrical',
    name: 'งานไฟฟ้า',
    category: 'งานระบบ',
    items: [
      {
        no: '1',
        description: 'ตู้ Consumer Unit (MDB) + Main Breaker',
        unit: 'ตู้',
        quantity: 1,
        unitPrice: 4500,
        laborCost: 2500,
        scopeDetails: '- ตู้โหลดเซ็นเตอร์ 12-18 ช่อง (Schneider/Haco)\n- Main Breaker 50-63A\n- กราวด์บาร์/นิวทรัลบาร์'
      },
      {
        no: '2',
        description: 'เบรกเกอร์ MCB 16-20A (วงจรไฟ/ปลั๊ก)',
        unit: 'ตัว',
        quantity: 6,
        unitPrice: 280,
        laborCost: 150,
        scopeDetails: '- MCB 1P 16-20A (Schneider/ABB)\n- 1 วงจรต่อ 1 ห้อง/โซน'
      },
      {
        no: '3',
        description: 'เบรกเกอร์ MCB 32A (วงจรหนัก แอร์/เตา)',
        unit: 'ตัว',
        quantity: 4,
        unitPrice: 450,
        laborCost: 200,
        scopeDetails: '- MCB 2P 32A สำหรับวงจรหนัก\n- แยกวงจรแอร์/เตา/น้ำอุ่น'
      },
      {
        no: '4',
        description: 'RCBO กันไฟดูด 30mA',
        unit: 'ตัว',
        quantity: 2,
        unitPrice: 1200,
        laborCost: 300,
        scopeDetails: '- RCBO 30mA (Schneider/ABB)\n- วงจรห้องน้ำ/ภายนอก'
      },
      {
        no: '5',
        description: 'สายไฟ THW 1.5 sq.mm. (Phelps Dodge)',
        unit: 'เมตร',
        quantity: 200,
        unitPrice: 7,
        laborCost: 15,
        scopeDetails: '- สาย THW 1.5 sq.mm.\n- วงจรไฟฟ้าแสงสว่าง\n- สีตามมาตรฐาน'
      },
      {
        no: '6',
        description: 'สายไฟ THW 2.5 sq.mm. (Phelps Dodge)',
        unit: 'เมตร',
        quantity: 150,
        unitPrice: 11,
        laborCost: 15,
        scopeDetails: '- สาย THW 2.5 sq.mm.\n- วงจรปลั๊กไฟ\n- สีตามมาตรฐาน'
      },
      {
        no: '7',
        description: 'ท่อร้อยสาย PVC 3/8" + 1/2"',
        unit: 'เมตร',
        quantity: 200,
        unitPrice: 12,
        laborCost: 18,
        scopeDetails: '- ท่อ PVC สีขาว 3/8" / 1/2"\n- ข้อต่อ/ข้องอ/คลิปรัด\n- เฟล็กซ์ Flexible Conduit'
      },
      {
        no: '8',
        description: 'จุดปลั๊กไฟ 3 ขา Panasonic Wide Series',
        unit: 'จุด',
        quantity: 20,
        unitPrice: 180,
        laborCost: 250,
        scopeDetails: '- ปลั๊ก 3 ขา Panasonic Wide Series\n- บ็อกซ์ฝัง 4×4"\n- หน้ากาก + ฝาครอบ'
      },
      {
        no: '9',
        description: 'สวิตช์ไฟ 1-3 Gang Panasonic Wide Series',
        unit: 'จุด',
        quantity: 12,
        unitPrice: 200,
        laborCost: 250,
        scopeDetails: '- สวิตช์ 1/2/3 Gang\n- บ็อกซ์ฝัง 4×4"\n- หน้ากาก + ฝาครอบ'
      },
      {
        no: '10',
        description: 'ดาวน์ไลท์ LED 7-9W (Warm White)',
        unit: 'ดวง',
        quantity: 20,
        unitPrice: 250,
        laborCost: 150,
        scopeDetails: '- ดาวน์ไลท์ LED 7-9W ฝังฝ้า\n- 3.5-4 นิ้ว Warm White 3000K'
      },
      {
        no: '11',
        description: 'สายกราวด์ + หลักดิน (Grounding)',
        unit: 'ชุด',
        quantity: 1,
        unitPrice: 2500,
        laborCost: 1500,
        scopeDetails: '- สาย THW 10 sq.mm. สีเขียว\n- หลักดิน Copper Rod 5/8"×2.4 ม.\n- ค่าความต้านทาน ≤5 โอห์ม'
      }
    ]
  },
  {
    id: 'template-plumbing',
    name: 'งานประปา',
    category: 'งานระบบ',
    items: [
      {
        no: '1',
        description: 'ท่อน้ำดี PPR PN10 ขนาด 20-25 มม.',
        unit: 'เมตร',
        quantity: 30,
        unitPrice: 45,
        laborCost: 80,
        scopeDetails: '- ท่อ PPR PN10 เกรด A\n- เชื่อมความร้อน Heat Fusion'
      },
      {
        no: '2',
        description: 'จุดจ่ายน้ำดี (วาล์ว/ข้อต่อ)',
        unit: 'จุด',
        quantity: 7,
        unitPrice: 350,
        laborCost: 800,
        scopeDetails: '- Ball Valve + ข้อต่อ PPR\n- ฝังผนัง + ทดสอบแรงดัน'
      },
      {
        no: '3',
        description: 'ท่อทิ้งน้ำเสีย PVC 2"-4"',
        unit: 'เมตร',
        quantity: 20,
        unitPrice: 60,
        laborCost: 100,
        scopeDetails: '- ท่อ PVC 2" (อ่าง/ซิงค์)\n- ท่อ PVC 4" (สุขภัณฑ์)\n- ข้อต่อ/กาว'
      },
      {
        no: '4',
        description: 'Trap กันกลิ่น P-Trap / Floor Drain',
        unit: 'ตัว',
        quantity: 4,
        unitPrice: 350,
        laborCost: 200,
        scopeDetails: '- P-Trap PVC (อ่าง/ซิงค์)\n- Floor Drain สแตนเลส (ห้องน้ำ)'
      },
      {
        no: '5',
        description: 'มิเตอร์น้ำ + วาล์วหลัก',
        unit: 'ชุด',
        quantity: 1,
        unitPrice: 1500,
        laborCost: 800,
        scopeDetails: '- มิเตอร์น้ำ 1/2"-3/4"\n- Gate Valve เมน\n- ท่อเมนเข้าอาคาร'
      }
    ]
  },
  {
    id: 'template-ac',
    name: 'เครื่องปรับอากาศ',
    category: 'งานระบบ',
    items: [
      {
        no: '1',
        description: 'แอร์ผนัง Inverter 12,000 BTU + ติดตั้ง',
        unit: 'เครื่อง',
        quantity: 2,
        unitPrice: 18000,
        laborCost: 4500,
        scopeDetails: '- แอร์ Inverter 12,000 BTU (Daikin/Mitsubishi)\n- เดินท่อทองแดง ≤5 ม.\n- เดินสายไฟแยกวงจร'
      },
      {
        no: '2',
        description: 'แอร์ผนัง Inverter 18,000 BTU + ติดตั้ง',
        unit: 'เครื่อง',
        quantity: 1,
        unitPrice: 24000,
        laborCost: 5000,
        scopeDetails: '- แอร์ Inverter 18,000 BTU (Daikin/Mitsubishi)\n- เดินท่อทองแดง ≤7 ม.\n- สำหรับห้องนั่งเล่น/ลิฟวิ่ง'
      }
    ]
  },
  // ===== งานโครงสร้าง =====
  {
    id: 'template-partition',
    name: 'ผนังกั้นห้อง',
    category: 'งานโครงสร้าง',
    items: [
      {
        no: '1',
        description: 'ก่อผนังอิฐมวลเบา 7.5 ซม.',
        unit: 'ตร.ม.',
        quantity: 15,
        unitPrice: 120,
        laborCost: 350,
        scopeDetails: '- อิฐมวลเบา Q-CON 7.5 ซม.\n- ปูนก่ออิฐมวลเบา'
      },
      {
        no: '2',
        description: 'ฉาบปูนผนัง 2 ด้าน',
        unit: 'ตร.ม.',
        quantity: 30,
        unitPrice: 40,
        laborCost: 300,
        scopeDetails: '- ปูนฉาบสำเร็จรูป (ตราเสือ/จระเข้)\n- ฉาบหนา 1-1.5 ซม.'
      },
      {
        no: '3',
        description: 'เสาเอ็น / คานทับหลัง คสล.',
        unit: 'เมตร',
        quantity: 8,
        unitPrice: 250,
        laborCost: 450,
        scopeDetails: '- เหล็ก DB12 4 เส้น + ปลอก RB6 @15 ซม.\n- คอนกรีต 240 ksc'
      }
    ]
  },
  {
    id: 'template-masonry-wall',
    name: 'ผนังก่ออิฐมวลเบา',
    category: 'งานโครงสร้าง',
    items: [
      {
        no: '1',
        description: 'ก่อผนังอิฐมวลเบา 10 ซม.',
        unit: 'ตร.ม.',
        quantity: 20,
        unitPrice: 150,
        laborCost: 400,
        scopeDetails: '- อิฐมวลเบา Q-CON / Super Block 10 ซม.\n- ปูนก่ออิฐมวลเบา\n- สำหรับผนังภายนอก/รับน้ำหนัก'
      },
      {
        no: '2',
        description: 'ฉาบปูนผนัง 2 ด้าน',
        unit: 'ตร.ม.',
        quantity: 40,
        unitPrice: 40,
        laborCost: 300,
        scopeDetails: '- ปูนฉาบสำเร็จรูป\n- ฉาบหนา 1-1.5 ซม.\n- ตีเส้นระดับ/ฉาบเรียบ'
      },
      {
        no: '3',
        description: 'เสาเอ็น / คานทับหลัง คสล.',
        unit: 'เมตร',
        quantity: 12,
        unitPrice: 250,
        laborCost: 450,
        scopeDetails: '- เหล็ก DB12 4 เส้น + ปลอก RB6\n- คอนกรีต 240 ksc\n- ไม้แบบ'
      },
      {
        no: '4',
        description: 'วงกบประตู-หน้าต่าง + ทับหลัง',
        unit: 'ช่อง',
        quantity: 4,
        unitPrice: 800,
        laborCost: 600,
        scopeDetails: '- วงกบเหล็กชุบ/อลูมิเนียม\n- คานทับหลัง\n- ยาแนว'
      }
    ]
  },
  // ===== งานตกแต่ง =====
  {
    id: 'template-ceiling',
    name: 'ฝ้าเพดาน ยิปซั่มบอร์ด',
    category: 'งานตกแต่ง',
    items: [
      {
        no: '1',
        description: 'ฝ้าเรียบ ยิปซั่มบอร์ด 9 มม.',
        unit: 'ตร.ม.',
        quantity: 25,
        unitPrice: 120,
        laborCost: 350,
        scopeDetails: '- ยิปซั่มบอร์ด 9 มม. (ตราช้าง/ยิปรอค)\n- โครงเหล็กชุบ C-Line + Furring\n- ฉาบรอยต่อ + เทปกาว'
      },
      {
        no: '2',
        description: 'ฝ้าหลุม / ฝ้าดรอป พร้อมร่องไฟ',
        unit: 'ตร.ม.',
        quantity: 10,
        unitPrice: 200,
        laborCost: 550,
        scopeDetails: '- ยิปซั่มบอร์ด 9 มม. 2 ชั้น\n- โครงเหล็กชุบ 2 ระดับ\n- กัดร่อง LED Strip'
      },
      {
        no: '3',
        description: 'ฝ้าห้องน้ำ แผ่นกันชื้น',
        unit: 'ตร.ม.',
        quantity: 5,
        unitPrice: 180,
        laborCost: 400,
        scopeDetails: '- แผ่นแคลเซียมซิลิเกต 6 มม.\n- โครงเหล็กชุบ\n- ช่องเปิด Manhole'
      }
    ]
  },
  {
    id: 'template-paint',
    name: 'งานทาสี',
    category: 'งานตกแต่ง',
    items: [
      {
        no: '1',
        description: 'โป๊วผิว + ขัดผนัง',
        unit: 'ตร.ม.',
        quantity: 80,
        unitPrice: 20,
        laborCost: 50,
        scopeDetails: '- โป๊วผิว 1-2 รอบ (ตราจระเข้/TOA)\n- ขัดกระดาษทราย 180-240'
      },
      {
        no: '2',
        description: 'สีรองพื้นปูนใหม่ (Primer)',
        unit: 'ตร.ม.',
        quantity: 80,
        unitPrice: 15,
        laborCost: 25,
        scopeDetails: '- สีรองพื้น 1 รอบ (TOA/Nippon/Jotun)\n- ป้องกันด่างปูน'
      },
      {
        no: '3',
        description: 'สีผนังภายใน 2-3 รอบ',
        unit: 'ตร.ม.',
        quantity: 80,
        unitPrice: 30,
        laborCost: 55,
        scopeDetails: '- สีน้ำอะครีลิค 100% (TOA 4 Seasons/Nippon Matex)\n- ทา 2-3 รอบ\n- เช็ดล้างได้'
      },
      {
        no: '4',
        description: 'สีฝ้าเพดาน 2 รอบ',
        unit: 'ตร.ม.',
        quantity: 35,
        unitPrice: 20,
        laborCost: 40,
        scopeDetails: '- สีน้ำทาฝ้า (TOA Ceiling Paint)\n- ทา 2 รอบ สีขาว'
      }
    ]
  },
  {
    id: 'template-door',
    name: 'ประตู',
    category: 'งานตกแต่ง',
    items: [
      {
        no: '1',
        description: 'ประตูไม้ HDF / ไม้จริง (ภายใน)',
        unit: 'บาน',
        quantity: 3,
        unitPrice: 5000,
        laborCost: 1200,
        scopeDetails: '- ประตู HDF / ไม้จริง\n- วงกบไม้/เหล็ก\n- บานพับ 3 ตัว\n- ลูกบิด/มือจับ + กลอน'
      },
      {
        no: '2',
        description: 'ประตูห้องน้ำ PVC / อลูมิเนียม',
        unit: 'บาน',
        quantity: 2,
        unitPrice: 3500,
        laborCost: 800,
        scopeDetails: '- ประตู PVC เกล็ดระบาย / อลูมิเนียม\n- บานพับสแตนเลส\n- มือจับ + กลอน'
      }
    ]
  },
  // ===== งานพื้น =====
  {
    id: 'template-flooring-spc',
    name: 'พื้น SPC / Vinyl Plank',
    category: 'งานพื้น',
    items: [
      {
        no: '1',
        description: 'ปูพื้น SPC Click Lock 4 มม.',
        unit: 'ตร.ม.',
        quantity: 30,
        unitPrice: 350,
        laborCost: 180,
        scopeDetails: '- พื้น SPC 4 มม. ลายไม้ Click Lock\n- Underlay PE Foam 2 มม.\n- เว้นรอยต่อขยาย'
      },
      {
        no: '2',
        description: 'บัวเชิงผนัง PVC / MDF',
        unit: 'เมตร',
        quantity: 30,
        unitPrice: 55,
        laborCost: 35,
        scopeDetails: '- บัวเชิงผนัง สูง 6-8 ซม.\n- กาว + ตะปูเกลียว'
      }
    ]
  },
  {
    id: 'template-flooring-laminate',
    name: 'พื้นลามิเนต',
    category: 'งานพื้น',
    items: [
      {
        no: '1',
        description: 'ปูพื้นลามิเนต 8-12 มม.',
        unit: 'ตร.ม.',
        quantity: 30,
        unitPrice: 450,
        laborCost: 200,
        scopeDetails: '- ลามิเนตหนา 8-12 มม. AC4-AC5\n- Underlay PE Foam\n- Click Lock'
      },
      {
        no: '2',
        description: 'บัวเชิงผนัง PVC / MDF',
        unit: 'เมตร',
        quantity: 30,
        unitPrice: 55,
        laborCost: 35,
        scopeDetails: '- บัวเชิงผนัง สูง 6-8 ซม.\n- กาว + ตะปูเกลียว'
      }
    ]
  },
  {
    id: 'template-flooring-tile',
    name: 'พื้นกระเบื้อง',
    category: 'งานพื้น',
    items: [
      {
        no: '1',
        description: 'ปูกระเบื้องพื้น 60×60 พอร์ซเลน',
        unit: 'ตร.ม.',
        quantity: 20,
        unitPrice: 500,
        laborCost: 400,
        scopeDetails: '- กระเบื้องพอร์ซเลน 60×60\n- กาวซีเมนต์ Weber/จระเข้\n- ยาแนว'
      }
    ]
  },
  // ===== งานเฟอร์นิเจอร์ =====
  {
    id: 'template-built-in-wardrobe',
    name: 'ตู้เสื้อผ้าบิ้วอิน',
    category: 'งานเฟอร์นิเจอร์',
    items: [
      {
        no: '1',
        description: 'ตู้เสื้อผ้าบิ้วอิน 2.0×2.4 ม. (บานเปิด)',
        unit: 'ชุด',
        quantity: 1,
        unitPrice: 28000,
        laborCost: 7000,
        scopeDetails: '- โครงไม้อัด/MDF\n- หน้าบาน Melamine/Laminate\n- ชั้นวาง + ราวแขวน\n- ลิ้นชัก 2-3 ใบ\n- บานพับ Soft Close'
      }
    ]
  },
  {
    id: 'template-kitchen',
    name: 'ชุดครัว',
    category: 'งานเฟอร์นิเจอร์',
    items: [
      {
        no: '1',
        description: 'ชุดครัว ตู้ล่าง + Top หินควอตซ์ (~3 ม.)',
        unit: 'ชุด',
        quantity: 1,
        unitPrice: 45000,
        laborCost: 8000,
        scopeDetails: '- ตู้ล่าง Melamine 3 ม.\n- Top หินควอตซ์/หินเทียม\n- อ่างล้างจาน สแตนเลส\n- บานพับ Soft Close'
      },
      {
        no: '2',
        description: 'ชุดครัว ตู้ลอย (~3 ม.)',
        unit: 'ชุด',
        quantity: 1,
        unitPrice: 22000,
        laborCost: 5000,
        scopeDetails: '- ตู้ลอย Melamine 3 ม.\n- บานพับ Soft Close\n- ชั้นปรับระดับ'
      }
    ]
  },
  {
    id: 'template-tv-console',
    name: 'ชั้นวางทีวี / ตู้โชว์',
    category: 'งานเฟอร์นิเจอร์',
    items: [
      {
        no: '1',
        description: 'ชั้นวางทีวี / ตู้โชว์ บิ้วอิน (~2.5-3.5 ม.)',
        unit: 'ชุด',
        quantity: 1,
        unitPrice: 38000,
        laborCost: 7000,
        scopeDetails: '- ชั้นวาง + ช่องเก็บของ\n- ช่องซ่อนสายไฟ/HDMI\n- ไฟ LED ในตู้ (ถ้ามี)\n- Melamine/Laminate'
      }
    ]
  },
  // ===== งานห้องน้ำ =====
  {
    id: 'template-bathroom',
    name: 'งานห้องน้ำครบชุด',
    category: 'งานห้องน้ำ',
    items: [
      {
        no: '1',
        description: 'กันซึม Flex Seal / Dr. Fixit 2K',
        unit: 'ตร.ม.',
        quantity: 5,
        unitPrice: 250,
        laborCost: 450,
        scopeDetails: '- กันซึม 2 ชั้น พื้น + ผนังสูง 30 ซม.\n- ทดสอบขังน้ำ 24-48 ชม.'
      },
      {
        no: '2',
        description: 'ปูกระเบื้องพื้นห้องน้ำ กันลื่น',
        unit: 'ตร.ม.',
        quantity: 4,
        unitPrice: 500,
        laborCost: 450,
        scopeDetails: '- กระเบื้องพอร์ซเลน กันลื่น\n- กาวซีเมนต์ + ยาแนว\n- ทำลาดเข้าท่อระบาย'
      },
      {
        no: '3',
        description: 'ปูกระเบื้องผนังห้องน้ำ',
        unit: 'ตร.ม.',
        quantity: 12,
        unitPrice: 650,
        laborCost: 500,
        scopeDetails: '- กระเบื้อง 30×60 / 60×120\n- ปูผนังสูง 2.4 ม.\n- กาวซีเมนต์ + ยาแนว'
      },
      {
        no: '4',
        description: 'โถสุขภัณฑ์ชิ้นเดียว (COTTO/AMS)',
        unit: 'ชุด',
        quantity: 1,
        unitPrice: 5500,
        laborCost: 1500,
        scopeDetails: '- Dual Flush สีขาว\n- ฝารองนั่ง Soft Close\n- สายอ่อน + ข้อต่อ'
      },
      {
        no: '5',
        description: 'อ่างล้างหน้า + ก๊อกน้ำ',
        unit: 'ชุด',
        quantity: 1,
        unitPrice: 5300,
        laborCost: 1500,
        scopeDetails: '- อ่างล้างหน้าแบบฝัง/วางบนเคาน์เตอร์\n- ก๊อกน้ำก้านโยก สีโครม\n- สาย Flexible + วาล์ว'
      },
      {
        no: '6',
        description: 'ชุดฝักบัว + ราวเลื่อน',
        unit: 'ชุด',
        quantity: 1,
        unitPrice: 2200,
        laborCost: 500,
        scopeDetails: '- ฝักบัว 3-5 ระบบ\n- ราวเลื่อนสแตนเลส\n- วาล์วผสมน้ำร้อน-เย็น'
      },
      {
        no: '7',
        description: 'กระจกเงา + อุปกรณ์ห้องน้ำ',
        unit: 'ชุด',
        quantity: 1,
        unitPrice: 3000,
        laborCost: 600,
        scopeDetails: '- กระจกเงา 50×70 ซม.\n- ราวแขวนผ้า/ที่ใส่สบู่/กระดาษ'
      },
      {
        no: '8',
        description: 'ประตูห้องน้ำ PVC/อลูมิเนียม',
        unit: 'บาน',
        quantity: 1,
        unitPrice: 3500,
        laborCost: 800,
        scopeDetails: '- ประตู PVC เกล็ดระบาย\n- บานพับสแตนเลส\n- มือจับ + กลอน'
      }
    ]
  }
];

export const categoryColors: Record<string, string> = {
  'งานเตรียม': 'bg-red-100 text-red-800 border-red-300',
  'งานระบบ': 'bg-blue-100 text-blue-800 border-blue-300',
  'งานโครงสร้าง': 'bg-purple-100 text-purple-800 border-purple-300',
  'งานตกแต่ง': 'bg-green-100 text-green-800 border-green-300',
  'งานพื้น': 'bg-yellow-100 text-yellow-800 border-yellow-300',
  'งานเฟอร์นิเจอร์': 'bg-orange-100 text-orange-800 border-orange-300',
  'งานห้องน้ำ': 'bg-cyan-100 text-cyan-800 border-cyan-300'
};

// Get templates by category
export function getTemplatesByCategory(): Map<string, ItemTemplate[]> {
  const grouped = new Map<string, ItemTemplate[]>();

  itemTemplates.forEach(template => {
    const existing = grouped.get(template.category) || [];
    grouped.set(template.category, [...existing, template]);
  });

  return grouped;
}
