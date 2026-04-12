import React from 'react';
import { ShoppingCart, Package, AlertTriangle, CheckSquare } from 'lucide-react';
import { ProjectData } from '../utils/projectData';
import { loadCompanyProfile } from '../utils/companyProfile';
import { getDocumentCompanyTagline, getDocumentCompanyTitle } from '../utils/documentBrand';

interface PurchaseOrderProps {
  project: ProjectData;
}

export function Villa175PurchaseOrderDocument({ project }: PurchaseOrderProps) {
  const co = loadCompanyProfile();
  // รายการวัสดุที่ลูกค้าต้องซื้อเอง
  const customerPurchaseItems = [
    {
      category: 'Top หินสังเคราะห์ (Quartz/Granite)',
      deadline: 'สัปดาห์ที่ 9 (ก่อนติดตั้ง Built-in)',
      importance: 'สูงมาก',
      items: [
        {
          no: '1',
          item: 'Top หินครัว',
          spec: 'ขนาด: 2.40 × 0.60 เมตร\nความหนา: 2-3 ซม.\nรูปแบบ: ตัด U สำหรับ Sink\nขอบ: ขัดเงา 4 ด้าน',
          location: 'ครัว - ตู้เตี้ย',
          qty: '1',
          unit: 'แผ่น',
          estimatedPrice: '12,000-18,000',
          notes: '• ต้องวัดขนาดจริงหน้างานก่อนสั่ง\n• ประสานช่างหินมาวัดสัปดาห์ที่ 8\n• เผื่อเวลาผลิต 7-10 วัน',
        },
        {
          no: '2',
          item: 'Top หินโต๊ะเครื่องแป้ง',
          spec: 'ขนาด: 1.65 × 0.40 เมตร\nความหนา: 2-3 ซม.\nรูปแบบ: ตัดตรง\nขอบ: ขัดเงา 4 ด้าน',
          location: 'ห้องนอนใหญ่ - โต๊ะเครื่องแป้ง',
          qty: '1',
          unit: 'แผ่น',
          estimatedPrice: '5,000-8,000',
          notes: '• สามารถสั่งพร้อมกับ Top ครัวได้\n• ใช้หินลายเดียวกันหรือต่างก็ได้',
        },
        {
          no: '3',
          item: 'Top หินเคาน์เตอร์อ่างห้องน้ำ',
          spec: 'ขนาด: 0.95 × 0.50 เมตร\nความหนา: 2-3 ซม.\nรูปแบบ: เจาะรูอ่างล้างหน้า\nขอบ: ขัดเงา 4 ด้าน',
          location: 'ห้องน้ำ - เคาน์เตอร์อ่าง',
          qty: '1',
          unit: 'แผ่น',
          estimatedPrice: '4,000-6,000',
          notes: '• ต้องสั่งพร้อมอ่างล้างหน้า\n• แจ้งขนาดรูอ่างให้ช่างหิน',
        },
      ],
    },
    {
      category: 'สุขภัณฑ์ห้องน้ำ (Bathroom Fixtures)',
      deadline: 'สัปดาห์ที่ 5-6',
      importance: 'สูงมาก',
      items: [
        {
          no: '4',
          item: 'ชักโครกสุขภัณฑ์',
          spec: 'ชนิด: Washdown / Two-Piece\nระบบ: ราง 3 นิ้ว\nรุ่น: กลาง-ดี\nยี่ห้อ: COTTO/American Standard/TOTO',
          location: 'ห้องน้ำ',
          qty: '1',
          unit: 'ชุด',
          estimatedPrice: '3,000-8,000',
          notes: '• ต้องตรวจสอบระยะท่อน้ำทิ้งกับผู้รับเหมา\n• ซื้อพร้อมฝาชักโครก Soft-close\n• ตรวจสอบว่าท่อระบายตรงกับหน้างาน',
        },
        {
          no: '5',
          item: 'อ่างล้างหน้า (Under Counter)',
          spec: 'ชนิด: อ่างฝัง (Under Counter)\nขนาด: 40-50 ซม.\nวัสดุ: เซรามิก\nยี่ห้อ: COTTO/American Standard',
          location: 'ห้องน้ำ - เคาน์เตอร์หิน',
          qty: '1',
          unit: 'ชุด',
          estimatedPrice: '1,500-4,000',
          notes: '• ต้องสั่งพร้อม Top หินเคาน์เตอร์\n• แจ้งขนาดรูอ่างให้ช่างหินเจาะ\n• ซื้อพร้อมสะดืออ่าง (Pop-up drain)',
        },
        {
          no: '6',
          item: 'ก๊อกอ่างล้างหน้า',
          spec: 'ชนิด: ก๊อกเดี่ยว (Single Lever)\nความสูง: กลาง-สูง\nวัสดุ: ทองเหลือง Chrome\nยี่ห้อ: COTTO/American Standard',
          location: 'ห้องน้ำ - อ่างล้างหน้า',
          qty: '1',
          unit: 'ชุด',
          estimatedPrice: '1,500-5,000',
          notes: '• เลือกแบบที่เข้ากับดีไซน์\n• ตรวจสอบระยะเดินท่อน้ำกับผู้รับเหมา\n• ควรซื้อพร้อมสายน้ำและข้อต่อ',
        },
        {
          no: '7',
          item: 'ฝักบัว Rainshower',
          spec: 'ขนาด: 8-10 นิ้ว\nรูปแบบ: แบบฝังเพดาน/ติดผนัง\nวัสดุ: Stainless Steel\nยี่ห้อ: COTTO/hansgrohe/GROHE',
          location: 'ห้องน้ำ - Shower Zone',
          qty: '1',
          unit: 'ชุด',
          estimatedPrice: '3,000-15,000',
          notes: '• ต้องประสานกับผู้รับเหมาเรื่องตำแหน่งติดตั้ง\n• ซื้อพร้อมวาล์วผสมน้ำร้อน-เย็น\n• ตรวจสอบแรงดันน้ำเพียงพอ',
        },
        {
          no: '8',
          item: 'อ่างอาบน้ำ (Bathtub)',
          spec: 'รุ่น: Cotto Collo 03\nขนาด: 150×80×60 ซม.\nชนิด: อะคริลิค\nรูปแบบ: Freestanding',
          location: 'ห้องน้ำ',
          qty: '1',
          unit: 'ชุด',
          estimatedPrice: '15,000-25,000',
          notes: '• รุ่นที่ระบุ: Cotto Collo 03\n• ต้องวัดพื้นที่จริงก่อนสั่ง\n• ตรวจสอบน้ำหนักและโครงรับกับผู้รับเหมา',
        },
        {
          no: '9',
          item: 'ก๊อกอ่างอาบน้ำ (Bathtub Faucet)',
          spec: 'รุ่น: SALA4 (แบบตั้งพื้น)\nชนิด: Floor Mounted\nวัสดุ: ทองเหลือง Chrome\nยี่ห้อ: COTTO/American Standard',
          location: 'ห้องน้ำ - อ่างอาบน้ำ',
          qty: '1',
          unit: 'ชุด',
          estimatedPrice: '8,000-20,000',
          notes: '• ⚠️ สำคัญ: ต้องแจ้งช่างเรื่องถมพื้นเพื่อฝังท่อ\n• แบบตั้งพื้นต้องเตรียมท่อน้ำล่วงหน้า\n• ซื้อพร้อมสายน้ำและข้อต่อ\n• ตรวจสอบแรงดันน้ำเพียงพอ',
        },
        {
          no: '10',
          item: 'เครื่องทำน้ำร้อน (Water Heater)',
          spec: 'ชนิด: แบบกระจายจุด/ทั้งบ้าน\nกำลัง: 3,500-4,500W\nความจุ: 15-30 ลิตร\nยี่ห้อ: Stiebel Eltron/ARISTON/Panasonic',
          location: 'ห้องน้ำ/ครัว',
          qty: '1-2',
          unit: 'เครื่อง',
          estimatedPrice: '6,000-18,000',
          notes: '• ต้องเลือกว่าจะใช้แบบจุดเดียวหรือทั้งบ้าน\n• ตรวจสอบระบบไฟฟ้า 220V\n• ปรึกษาช่างไฟเรื่องเบรกเกอร์\n• เช็คตำแหน่งติดตั้งและท่อน้ำ',
        },
        {
          no: '11',
          item: 'สะดืออ่าง (Pop-up Drain)',
          spec: 'ชนิด: Pop-up แบบกด\nวัสดุ: Stainless Steel/Chrome\nขนาด: 1.25-1.5 นิ้ว',
          location: 'ห้องน้ำ - อ่างล้างหน้า',
          qty: '1',
          unit: 'ชุด',
          estimatedPrice: '300-1,200',
          notes: '• ควรซื้อพร้อมอ่างล้างหน้า\n• เลือกสีให้เข้ากับก๊อกน้ำ',
        },
        {
          no: '12',
          item: 'Floor Drain (ตะแกรงรับน้ำพื้น)',
          spec: 'ขนาด: 4-6 นิ้ว\nชนิด: มีดักกลิ่น\nวัสดุ: Stainless Steel\nจำนวน: 2 ตัว (1 Shower + 1 Balcony)',
          location: 'ห้องน้ำ + ระเบียง',
          qty: '2',
          unit: 'ตัว',
          estimatedPrice: '300-1,000/ตัว',
          notes: '• ต้องเช็คขนาดท่อกับผู้รับเหมา\n• เลือกแบบกันกลิ่น (Trap)\n• 1 ตัวในห้องน้ำ + 1 ตัวระเบียง',
        },
        {
          no: '13',
          item: 'อุปกรณ์เสริมห้องน้ำ (Bathroom Accessories)',
          spec: 'ชุดประกอบด้วย:\n• สายฉีดชำระ (Bidet Spray) พร้อมวาล์ว\n• ที่ใส่กระดาษทิชชู่\n• ราวแขวนผ้า/ที่แขวนผ้าเช็ดตัว\n• ที่วางแปรง/สบู่\nวัสดุ: Stainless Steel/Chrome\nยี่ห้อ: COTTO/Kohler/Axent',
          location: 'ห้องน้ำ',
          qty: '1',
          unit: 'ชุด',
          estimatedPrice: '2,000-6,000',
          notes: '• เลือกสีให้เข้ากับก๊อกน้ำ (Chrome/Matt Black)\n• สายฉีดชำระต้องมีวาล์วปิด-เปิดน้ำ\n• ราวแขวนผ้าควรยาว 60-80 ซม.\n• ประมาณการตำแหน่งติดตั้งกับผู้รับเหมา',
        },
      ],
    },
    {
      category: 'กระเบื้อง (Tiles)',
      deadline: 'สัปดาห์ที่ 4-5',
      importance: 'สูง',
      items: [
        {
          no: '14',
          item: 'กระเบื้องพื้นห้องน้ำ 60×120 ซม.',
          spec: 'ขนาด: 60×120 ซม.\nผิว: Matt / กันลื่น\nโทนสี: ตามดีไซน์\nเกรด: A',
          location: 'ห้องน้ำ - พื้น',
          qty: '12',
          unit: 'ตร.ม.',
          estimatedPrice: '600-1,200/ตร.ม.',
          notes: '• พื้นที่จริง 10 ตร.ม. + สำรอง 20%\n• เลือกแบบกันลื่นสำหรับพื้นห้องน้ำ\n• สั่งให้ครบก่อนสัปดาห์ที่ 5',
        },
        {
          no: '15',
          item: 'กระเบื้องผนังห้องน้ำ 60×120 ซม.',
          spec: 'ขนาด: 60×120 ซม.\nผิว: Glossy / Matt\nโทนสี: ตามดีไซน์\nเกรด: A',
          location: 'ห้องน้ำ - ผนัง',
          qty: '30',
          unit: 'ตร.ม.',
          estimatedPrice: '500-1,000/ตร.ม.',
          notes: '• พื้นที่จริง 26 ตร.ม. + สำรอง 15%\n• สามารถใช้ลายเดียวกับพื้นหรือต่างก็ได้\n• สั่งพร้อมกระเบื้องพื้น',
        },
        {
          no: '16',
          item: 'กระเบื้องระเบียง',
          spec: 'ขนาด: 40×40 ซม. หรือ 60×60 ซม.\nผิว: กันลื่น (Anti-slip)\nโทนสี: เข้ากับห้องน้ำ',
          location: 'ระเบียง',
          qty: '12',
          unit: 'ตร.ม.',
          estimatedPrice: '300-600/ตร.ม.',
          notes: '• พื้นที่จริง 10 ตร.ม. + สำรอง 20%\n• เลือกแบบทนแดด-ฝน-ลม',
        },
      ],
    },
    {
      category: 'พื้น SPC ลายไม้',
      deadline: 'สัปดาห์ที่ 5-7',
      importance: 'กลาง',
      items: [
        {
          no: '17',
          item: 'พื้น SPC 4-5 มม.',
          spec: 'ความหนา: 4-5 มม.\nลาย: ลายไม้ตามดีไซน์\nมาตรฐาน: กันน้ำ 100%\nระบบ: Click Lock',
          location: 'นั่งเล่น + ห้องนอนทั้ง 2 ห้อง',
          qty: '70',
          unit: 'ตร.ม.',
          estimatedPrice: '600-1,200/ตร.ม.',
          notes: '• พื้นที่จริง 64 ตร.ม. + สำรอง 10%\n• เลือกยี่ห้อดี (Lamton/Krono ฯลฯ)\n• ต้องมีบัวพื้น PVC สีเข้ากัน 45 ม.',
        },
      ],
    },
    {
      category: 'อุปกรณ์ครัว (Kitchen Appliances)',
      deadline: 'สัปดาห์ที่ 9-10',
      importance: 'สูง',
      items: [
        {
          no: '18',
          item: 'อ่างล้างจาน (Kitchen Sink)',
          spec: 'ขนาด: 1 หลุม 70-80 ซม. หรือ 2 หลุม\nวัสดุ: Stainless Steel 304\nความหนา: 0.8-1.0 มม.\nยี่ห้อ: FRANKE/TEKA/HAFELE',
          location: 'ครัว - ตู้เตี้ย',
          qty: '1',
          unit: 'ชุด',
          estimatedPrice: '3,000-12,000',
          notes: '• ต้องสั่งพร้อม Top หินครัว\n• แจ้งขนาดรูตัดให้ช่างหิน\n• ควรซื้อพร้อมตะแกรง/ถังขยะ',
        },
        {
          no: '19',
          item: 'ก๊อกน้ำซิงค์ครัว',
          spec: 'ชนิด: ก๊อกดึงสาย (Pull-out)\nวัสดุ: ทองเหลือง Chrome/Stainless\nยี่ห้อ: FRANKE/GROHE/American Standard',
          location: 'ครัว - อ่างล้างจาน',
          qty: '1',
          unit: 'ชุด',
          estimatedPrice: '2,000-8,000',
          notes: '• เลือกแบบดึงสายได้สะดวกล้างจาน\n• ตรวจสอบแรงดันน้ำเพียงพอ\n• ควรซื้อพร้อมสายน้ำและข้อต่อ',
        },
        {
          no: '20',
          item: 'เตาไฟฟ้า (Induction/Ceramic Hob)',
          spec: 'ขนาด: 2 หัว (60-70 ซม.)\nชนิด: Induction / Ceramic\nกำลัง: 3,000-4,000W\nยี่ห้อ: SMEG/ELECTROLUX/HAFELE',
          location: 'ครัว - ตู้เตี้ย',
          qty: '1',
          unit: 'เครื่อง',
          estimatedPrice: '8,000-25,000',
          notes: '• ต้องแจ้งขนาดเจาะ Top หินให้ช่างหิน\n• ตรวจสอบระบบไฟฟ้า 220V\n• ปรึกษาช่างไฟเรื่องสายไฟและเบรกเกอร์',
        },
        {
          no: '21',
          item: 'เครื่องดูดควัน (Range Hood)',
          spec: 'ขนาด: 70-90 ซม.\\nชนิด: ติดผนัง/ฝังเพดาน\\nกำลัง: 600-1,000 m³/h\\nยี่ห้อ: SMEG/ELECTROLUX/FABER',
          location: 'ครัว - เหนือเตา',
          qty: '1',
          unit: 'เครื่อง',
          estimatedPrice: '6,000-30,000',
          notes: '• ต้องประสานกับผู้รับเหมาเรื่องท่อระบาย\\n• วัดความสูงติดตั้งให้เหมาะสม (70-80 ซม.)\\n• ตรวจสอบปลั๊กไฟและตำแหน่งท่อ',
        },
        {
          no: '22',
          item: 'เตาอบ (Oven)',
          spec: 'ขนาด: 35×33×23 ซม. (แบบตั้งโต๊ะ)\\nชนิด: Countertop Oven\\nกำลัง: 1,200-1,800W\\nยี่ห้อ: Sharp/Electrolux/Panasonic',
          location: 'ครัว - โต๊ะหรือตู้สูง',
          qty: '1',
          unit: 'เครื่อง',
          estimatedPrice: '3,000-8,000',
          notes: '• เป็นแบบตั้งโต๊ะ ไม่ใช่แบบฝังตู้\\n• ต้องเตรียมพื้นที่วาง\\n• ตรวจสอบปลั๊กไฟ 220V',
        },
      ],
    },
    {
      category: 'อุปกรณ์ไฟฟ้า (ตัวเลือก - ถ้าลูกค้าต้องการเลือกเอง)',
      deadline: 'สัปดาห์ที่ 2-4',
      importance: 'ต่ำ',
      items: [
        {
          no: '23',
          item: 'Downlight LED 17 ดวง',
          spec: 'ขนาด: 3-4 นิ้ว\nกำลัง: 7-9W\nแสง: Warm White / Cool White\nยี่ห้อ: Philips/Opple ฯลฯ',
          location: 'ทั้งห้อง',
          qty: '17',
          unit: 'ดวง',
          estimatedPrice: '200-500/ดวง',
          notes: '• ผู้รับเหมาสามารถจัดหาให้ได้\n• ถ้าลูกค้าต้องการเลือกเองก็สั่งได้',
        },
        {
          no: '24',
          item: 'Track Light Set',
          spec: 'ราง: 6 เมตร × 2 เส้น\nโคม: 8 ดวง\nหลอด: 8 หลอด GU10\nสี: ดำ/ขาว',
          location: 'ห้องนั่งเล่น / ห้องนอน',
          qty: '1',
          unit: 'ชุด',
          estimatedPrice: '6,000-12,000',
          notes: '• ผู้รับเหมาสามารถจัดหาให้ได้\n• ถ้าลูกค้าต้องการแบรนด์เฉพาะ',
        },
      ],
    },
  ];

  const formatCurrency = (value: string): string => {
    return value;
  };

  return (
    <div id="purchase-order-doc" className="max-w-[210mm] mx-auto bg-white print:shadow-none">
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 12mm;
          }
          body {
            margin: 0;
            padding: 0;
          }
          #purchase-order-doc {
            max-width: 100%;
          }
          .print\\:page-break-before {
            page-break-before: always;
            break-before: always;
          }
          .print\\:page-break-inside-avoid {
            page-break-inside: avoid;
            break-inside: avoid;
          }
        }
      `}</style>

      {/* Header */}
      <div className="bg-gradient-to-br from-orange-600 via-orange-500 to-orange-700 text-white px-8 py-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,.02)_50%,transparent_75%,transparent_100%)] bg-[length:250px_250px]"></div>
        <div className="relative">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-6">
              <div className="bg-white/10 backdrop-blur-sm p-3 rounded-lg border border-white/20">
                <ShoppingCart className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-3xl tracking-wider mb-1">{getDocumentCompanyTitle(co)}</h1>
                <p className="text-sm text-orange-200">{getDocumentCompanyTagline(co)}</p>
              </div>
              <div className="border-l border-white/30 pl-6 ml-2">
                <div className="flex items-center gap-2 mb-1">
                  <Package className="w-5 h-5" />
                  <h2 className="text-xl tracking-wide">ใบสั่งซื้อวัสดุ</h2>
                </div>
                <p className="text-xs text-orange-200">CUSTOMER PURCHASE ORDER</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Project Info */}
      <div className="px-8 py-4 bg-gradient-to-r from-orange-50 to-white border-b-2 border-orange-200">
        <div className="grid grid-cols-2 gap-6 text-sm">
          <div>
            <p className="text-orange-900 mb-1">โครงการ:</p>
            <p className="text-base text-orange-800">{project.name}</p>
          </div>
          <div>
            <p className="text-orange-900 mb-1">วันที่:</p>
            <p className="text-base text-orange-800">18 ธันวาคม 2568</p>
          </div>
        </div>
      </div>

      {/* Warning Banner */}
      <div className="px-8 py-4 bg-amber-100 border-y-2 border-amber-400">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 text-amber-700 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-base text-amber-900 mb-2">⚠️ สำคัญ! วัสดุที่ลูกค้าต้องซื้อเอง</h3>
            <p className="text-sm text-amber-800 mb-2">
              รายการด้านล่างนี้เป็นวัสดุที่ <strong>ลูกค้าต้องจัดหาและสั่งซื้อเอง</strong> ตามกำหนดเวลา
            </p>
            <ul className="text-xs text-amber-800 space-y-1 pl-4">
              <li>✓ ผู้รับเหมาจะแจ้งกำหนดเวลาที่ต้องการวัสดุล่วงหน้า</li>
              <li>✓ หากวัสดุไม่ถึงตามกำหนด อาจทำให้งานล่าช้า</li>
              <li>✓ ราคาประมาณการเป็นเพียงแนวทาง - ราคาจริงขึ้นกับร้านและแบรนด์ที่เลือก</li>
              <li>✓ ปรึกษาผู้รับเหมาก่อนสั่งซื้อทุกครั้ง</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Purchase Items */}
      <div className="px-8 py-4">
        {customerPurchaseItems.map((category, catIdx) => (
          <div key={catIdx} className="mb-6 print:page-break-inside-avoid">
            <div className="bg-gradient-to-r from-orange-600 to-orange-700 text-white px-4 py-3 rounded-t-lg">
              <div className="flex items-center justify-between">
                <h3 className="text-base">{category.category}</h3>
                <div className="flex items-center gap-3 text-xs">
                  <div className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded">
                    กำหนดส่ง: {category.deadline}
                  </div>
                  <div className={`px-3 py-1 rounded ${
                    category.importance === 'สูงมาก' ? 'bg-red-500' :
                    category.importance === 'สูง' ? 'bg-orange-500' :
                    category.importance === 'กลาง' ? 'bg-yellow-500' :
                    'bg-green-500'
                  }`}>
                    ความสำคัญ: {category.importance}
                  </div>
                </div>
              </div>
            </div>

            <div className="border-x-2 border-b-2 border-orange-200 rounded-b-lg overflow-hidden">
              {category.items.map((item, itemIdx) => (
                <div key={itemIdx} className={`p-4 ${itemIdx !== category.items.length - 1 ? 'border-b border-orange-100' : ''} hover:bg-orange-50 transition-colors`}>
                  <div className="grid grid-cols-12 gap-4 text-xs">
                    {/* Item Number & Checkbox */}
                    <div className="col-span-1 flex items-start gap-2">
                      <div className="bg-orange-100 text-orange-800 w-8 h-8 rounded-full flex items-center justify-center text-sm">
                        {item.no}
                      </div>
                      <CheckSquare className="w-5 h-5 text-slate-300 print:hidden" />
                    </div>

                    {/* Item Details */}
                    <div className="col-span-6">
                      <p className="text-base text-orange-900 mb-2">{item.item}</p>
                      <div className="bg-slate-50 rounded p-2 mb-2">
                        <p className="text-[10px] text-slate-600 mb-1">รายละเอียดสเปค:</p>
                        <div className="text-xs text-slate-700 whitespace-pre-line">
                          {item.spec}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-600">
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          📍 ตำแหน่ง: {item.location}
                        </span>
                      </div>
                    </div>

                    {/* Quantity & Price */}
                    <div className="col-span-2 text-center">
                      <p className="text-[10px] text-slate-600 mb-1">จำนวน</p>
                      <p className="text-lg text-orange-800">{item.qty}</p>
                      <p className="text-xs text-slate-600">{item.unit}</p>
                    </div>
                    <div className="col-span-3">
                      <p className="text-[10px] text-slate-600 mb-1">ราคาประมาณการ</p>
                      <p className="text-sm text-orange-800">{formatCurrency(item.estimatedPrice)} ฿</p>
                      {item.notes && (
                        <div className="mt-2 bg-amber-50 border border-amber-200 rounded p-2">
                          <p className="text-[9px] text-amber-800 mb-1">📌 หมายเหตุ:</p>
                          <div className="text-[9px] text-amber-700 whitespace-pre-line">
                            {item.notes}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Timeline Summary */}
      <div className="px-8 py-4 bg-gradient-to-r from-blue-50 to-white border-y-2 border-blue-200">
        <h3 className="text-base text-blue-900 mb-3">📅 สรุปกำหนดเวลาสั่งซื้อ:</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white border border-red-200 rounded-lg p-3">
            <p className="text-xs text-red-700 mb-1">⏰ เร่งด่วน</p>
            <p className="text-sm text-red-900 mb-2">สัปดาห์ที่ 2-5</p>
            <ul className="text-xs text-slate-700 space-y-1">
              <li>• กระเบื้องห้องน้ำ</li>
              <li>• สุขภัณฑ์ห้องน้ำ</li>
              <li>• อุปกรณ์ไฟฟ้า (ถ้าเลือกเอง)</li>
            </ul>
          </div>
          <div className="bg-white border border-orange-200 rounded-lg p-3">
            <p className="text-xs text-orange-700 mb-1">📦 กลาง</p>
            <p className="text-sm text-orange-900 mb-2">สัปดาห์ที่ 5-7</p>
            <ul className="text-xs text-slate-700 space-y-1">
              <li>• พื้น SPC</li>
            </ul>
          </div>
          <div className="bg-white border border-yellow-200 rounded-lg p-3">
            <p className="text-xs text-yellow-700 mb-1">🎯 สำคัญที่สุด</p>
            <p className="text-sm text-yellow-900 mb-2">สัปดาห์ที่ 9</p>
            <ul className="text-xs text-slate-700 space-y-1">
              <li>• Top หินสังเคราะห์ (ทั้ง 3 ชิ้น)</li>
              <li>• อุปกรณ์ครัว (Sink + เตา + Hood)</li>
              <li>• <strong>ต้องวัดหน้างานก่อน!</strong></li>
            </ul>
          </div>
        </div>
      </div>

      {/* Shopping Guide */}
      <div className="px-8 py-4">
        <h3 className="text-base text-orange-900 mb-3">🛒 คำแนะนำในการสั่งซื้อ:</h3>
        <div className="grid grid-cols-2 gap-4 text-xs text-slate-700">
          <div>
            <p className="text-orange-800 mb-2">ก่อนสั่งซื้อ:</p>
            <ul className="space-y-1 pl-4">
              <li>✓ ปรึกษาผู้รับเหมาเสมอ</li>
              <li>✓ ขอดูตัวอย่างสินค้าจริง</li>
              <li>✓ เช็คสต็อกและเวลาผลิต</li>
              <li>✓ สอบถามนโยบายคืน/เปลี่ยน</li>
              <li>✓ สั่งสำรอง 10-20% (กระเบื้อง/พื้น)</li>
            </ul>
          </div>
          <div>
            <p className="text-orange-800 mb-2">ร้านแนะนำ (กรุงเทพฯ):</p>
            <ul className="space-y-1 pl-4">
              <li>🏪 กระเบื้อง: HomePro, Thai Watsadu, Index</li>
              <li>🏪 Top หิน: ตลาดหินอ่อน, ร้านหินย่านบางนา</li>
              <li>🏪 พื้น SPC: HomePro, Laminate House</li>
              <li>🏪 สุขภัณฑ์: HomePro, Boonthavorn</li>
              <li>🏪 อุปกรณ์ครัว: MegaHome, Index Living Mall</li>
              <li>🏪 ไฟฟ้า: MegaHome, HomePro</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Contact Info */}
      <div className="px-8 py-4 bg-orange-50 border-t-2 border-orange-200">
        <div className="text-center text-sm text-orange-900">
          <p className="mb-1">หากมีข้อสงสัยเกี่ยวกับการสั่งซื้อวัสดุ กรุณาติดต่อ:</p>
          <p className="text-base">📞 {co.phone || '-'} | 📧 {co.email || '-'}</p>
          <p className="text-xs text-orange-700 mt-2">{co.companyName || co.companyNameTh || 'ชื่อบริษัท'}</p>
        </div>
      </div>

      {/* Print Button */}
      <div className="p-4 bg-white border-t border-orange-200 print:hidden">
        <button
          onClick={() => window.print()}
          className="w-full bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white py-2 px-6 rounded-lg transition-all shadow-md hover:shadow-lg text-sm"
        >
          พิมพ์ใบสั่งซื้อ / Print Purchase Order
        </button>
      </div>
    </div>
  );
}
