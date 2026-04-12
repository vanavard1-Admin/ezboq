import { ProjectData } from './projectData';

export const constructionProject: ProjectData = {
  id: 'construction-floor-masonry',
  name: 'งานก่อสร้างและปรับปรุงพื้นที่',
  address: 'โครงการปรับปรุงและก่อสร้าง',
  phone: '-',
  owner: '-',
  quotationData: [
    // A) งานปรับปรุงพื้น (ขัดมัน)
    {
      no: 'A',
      description: 'งานปรับปรุงพื้น (Floor Polishing)',
      unit: '',
      quantity: '',
      unitPrice: '',
      laborCost: '',
    },
    {
      no: 'A.1',
      description: 'ขัดมันพื้นคอนกรีต',
      unit: 'งาน',
      quantity: 1,
      unitPrice: 0,
      laborCost: 20000,
      scopeDetails: '• ปรับปรุงผิวพื้นเดิม\\n• ขัดมันพื้นคอนกรีตให้เรียบสม่ำเสมอ\\n• วัสดุขัดเกรดดี\\n• ปัดฝุ่นและทำความสะอาด\\n\\n*** รวมค่าวัสดุและค่าแรงแล้ว ***',
    },
    {
      no: 'A.2',
      description: 'ปูนปรับระดับพื้น (Self-Leveling Mortar)',
      unit: 'งาน',
      quantity: 1,
      unitPrice: 0,
      laborCost: 0,
      scopeDetails: '• งานปรับระดับพื้นด้วยปูน Self-Leveling\\n• เตรียมผิวพื้นก่อนเทปูน\\n• เทปูนปรับระดับตามมาตรฐาน\\n\\n*** รวมค่าวัสดุและค่าแรงแล้ว ***',
    },

    // B) งานก่อสร้างและสถาปัตยกรรม
    {
      no: 'B',
      description: 'งานก่อสร้างและสถาปัตยกรรม (Masonry & Architecture)',
      unit: '',
      quantity: '',
      unitPrice: '',
      laborCost: '',
    },
    {
      no: 'B.1',
      description: 'งานก่อ–ฉาบ และติดตั้งประตู (ไม่รวมวงกบ) รวมอิฐมวลเบา',
      unit: 'งาน',
      quantity: 1,
      unitPrice: 0,
      laborCost: 37000,
      scopeDetails: '• งานก่อผนังตามแบบ\\n• งานฉาบผิวผนังเรียบ\\n• งานเทคอนกรีต N บริเวณกรอบประตู\\n• ติดตั้งประตู จำนวน 2 บาน\\n• ทาสีรองพื้นเตรียมผิว\\n• อุปกรณ์ประกอบและอุดรอยต่อ\\n\\n*** หมายเหตุ: ไม่รวมวงกบประตู ***\\n*** รวมค่าวัสดุและค่าแรงแล้ว ***',
    },

    // C) งานกันซึม
    {
      no: 'C',
      description: 'งานกันซึมพื้นที่เปียก (Waterproofing)',
      unit: '',
      quantity: '',
      unitPrice: '',
      laborCost: '',
    },
    {
      no: 'C.1',
      description: 'งานกันซึมระเบียงและห้องน้ำ',
      unit: 'งาน',
      quantity: 1,
      unitPrice: 0,
      laborCost: 5500,
      scopeDetails: '• งานกันซึมระเบียง 2 ฝั่ง\\n• งานกันซึมห้องน้ำ\\n• วัสดุกันซึมคุณภาพดี\\n• ทาครบ 2-3 coat ตามมาตรฐาน\\n• ทดสอบความรั่วซึม\\n\\n*** รวมค่าวัสดุและค่าแรงแล้ว ***',
    },

    // D) งานปูกระเบื้องและเตรียมผิว
    {
      no: 'D',
      description: 'งานปูกระเบื้องและเตรียมผิว (Tiling & Surface Preparation)',
      unit: '',
      quantity: '',
      unitPrice: '',
      laborCost: '',
    },
    {
      no: 'D.1',
      description: 'งานปูกระเบื้องพร้อมเตรียมผิว',
      unit: 'งาน',
      quantity: 1,
      unitPrice: 0,
      laborCost: 30400,
      scopeDetails: '• ปูกระเบื้องตามแบบและพื้นที่ที่กำหนด\\n• ฉาบปูนปรับผิวผนัง/พื้น\\n• ปูตาข่ายเสริมแรงก่อนงานปูกระเบื้อง\\n• ค่าปูนฉาบคุณภาพดี\\n• ค่าปูนกาวปูกระเบื้อง\\n• อุปกรณ์กิ๊บล็อคกระเบื้อง (Tile Leveling System)\\n• ยาแนวและเก็บงานเรียบร้อย\\n• ไม่รวมค่ากระเบื้อง (ลูกค้าจัดหาเอง)\\n\\n*** หมายเหตุ: กระเบื้องปู1/2 60x120 ใช้ปูนเยอะ รวมงานฉาบผนังห้องน้ำ และเข้ามุม45 ***\\n*** รวมค่าวัสดุและค่าแรงทั้งหมดแล้ว ***',
    },
  ],
};
