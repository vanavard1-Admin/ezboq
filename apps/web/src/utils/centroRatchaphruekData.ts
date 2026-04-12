import { ProjectData } from './projectData';

export const centroRatchaphruek: ProjectData = {
  id: 'centro-ratchaphruek-suanphak',
  name: 'Centro ราชพฤกษ์-สวนผัก',
  address: '(กรุณากรอกที่อยู่โครงการ)',
  phone: '-',
  owner: '(กรุณากรอกชื่อเจ้าของโครงการ)',
  designFee: 21960, // ราคาสุทธิหลังส่วนลด 25% (29.28 x 1,000 x 0.75)
  customerPrice: 21960,
  operatingCost: 0, // งานออกแบบไม่มีค่าดำเนินการ
  quotationData: [
    // A) ค่าออกแบบ
    {
      no: 'A',
      description: 'ค่าออกแบบ / Design Fee',
      unit: '',
      quantity: '',
      unitPrice: '',
      laborCost: '',
      scopeDetails: '• ค่าออกแบบ 1,000 บาท/ตร.ม.\n• ส่วนลด 25% (เนื่องจากมีงานบิ้วอินด้วย)',
    },
    {
      no: 'A.1',
      description: 'ออกแบบห้องนอนน้องมากิ (17.69 ตร.ม.)',
      unit: 'ตร.ม.',
      quantity: 17.69,
      unitPrice: 1000,
      laborCost: 0,
      scopeDetails: '• ออกแบบตกแต่งภายในห้องนอน\n• Layout Plan / Furniture Plan\n• 3D Perspective\n• Elevation Drawing\n• Section Drawing\n• Lighting Design\n• Material Specification\n• Shop Drawing\n• BOQ',
    },
    {
      no: 'A.2',
      description: 'ออกแบบห้องน้ำ (11.59 ตร.ม.)',
      unit: 'ตร.ม.',
      quantity: 11.59,
      unitPrice: 1000,
      laborCost: 0,
      scopeDetails: '• ออกแบบตกแต่งภายในห้องน้ำ\n• Layout Plan / อุปกรณ์สุขภัณฑ์\n• 3D Perspective\n• Elevation Drawing\n• Section Drawing\n• Lighting Design\n• Material Specification\n• Shop Drawing\n• BOQ',
    },
  ],
};
