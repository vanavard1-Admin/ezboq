import React from 'react';
import { FileText, Building2, Mail, Phone, User, EyeOff, Eye } from 'lucide-react';
import { ProjectData, QuotationItem } from '../utils/projectData';
import { loadCompanyProfile } from '../utils/companyProfile';
import { getDocumentCompanyTagline, getDocumentCompanyTitle } from '../utils/documentBrand';
import { findBankByName } from '../utils/thaiBankData';


interface InvoiceProps {
  project: ProjectData;
}

export function Villa175InvoiceDocument({ project }: InvoiceProps) {
  const [hidePrice, setHidePrice] = React.useState(false);
  const co = loadCompanyProfile();
  const quotationData = project.quotationData;

  // คำนวณราคา
  const calculateAmount = (item: QuotationItem): number => {
    if (!item.quantity || item.quantity === '') return 0;
    const qty = Number(item.quantity);
    const unitPrice = Number(item.unitPrice) || 0;
    const laborCost = Number(item.laborCost) || 0;
    return qty * (unitPrice + laborCost);
  };

  // แยกหมวดหมู่
  const categories = {
    A: { name: 'ค่าออกแบบ', items: [] as QuotationItem[], total: 0 },
    B: { name: 'รื้อถอน', items: [] as QuotationItem[], total: 0 },
    C: { name: 'อิฐมวลเบา', items: [] as QuotationItem[], total: 0 },
    D: { name: 'ไฟฟ้า', items: [] as QuotationItem[], total: 0 },
    E: { name: 'ประปา', items: [] as QuotationItem[], total: 0 },
    F: { name: 'ห้องน้ำ', items: [] as QuotationItem[], total: 0 },
    G: { name: 'ฝ้า', items: [] as QuotationItem[], total: 0 },
    H: { name: 'พื้น SPC', items: [] as QuotationItem[], total: 0 },
    I: { name: 'สีผนัง', items: [] as QuotationItem[], total: 0 },
    J: { name: 'เก็บงาน/Cleaning', items: [] as QuotationItem[], total: 0 },
    K: { name: 'Built-in: Living Room', items: [] as QuotationItem[], total: 0 },
    L: { name: 'Built-in: Kitchen', items: [] as QuotationItem[], total: 0 },
    M: { name: 'Built-in: Master Bedroom', items: [] as QuotationItem[], total: 0 },
    N: { name: 'Built-in: Bathroom', items: [] as QuotationItem[], total: 0 },
    O: { name: 'Built-in: Bedroom 2', items: [] as QuotationItem[], total: 0 },
  };

  quotationData.forEach(item => {
    const mainCat = item.no.split('.')[0] as keyof typeof categories;
    if (categories[mainCat]) {
      if (item.no !== mainCat) { // ไม่นับหัวข้อหลัก
        categories[mainCat].items.push(item);
        const profitMultiplier = mainCat === 'A' ? 1.00 : 1.20; // ค่าออกแบบไม่บวกกำไร
        categories[mainCat].total += calculateAmount(item) * profitMultiplier;
      }
    }
  });

  // คำนวณยอดรวม
  const subtotal = Object.values(categories).reduce((sum, cat) => sum + cat.total, 0);
  const operationFee = subtotal * 0.05;
  const grandTotal = subtotal + operationFee;

  // แบ่งงวดชำระตาม Phase (5 งวด) - ผูก Milestone กับ Scope ทั้ง 4 Cluster
  const paymentSchedule = [
    {
      phase: 1,
      name: 'Wall + MEP Rough-in',
      percentage: 30,
      amount: Math.round(grandTotal * 0.30),
      condition: 'ก่อผนัง + เดินท่อไฟ/น้ำ + โครงฝ้า เสร็จ',
      work: 'ก่อผนังอิฐมวลเบา 20 ตร.ม., เดินท่อไฟฝังผนัง + point box, เดินท่อน้ำดี PPR + น้ำทิ้ง, ตั้งโครงฝ้า',
      weeks: 'Week 1-3',
    },
    {
      phase: 2,
      name: 'Close-up Work',
      percentage: 25,
      amount: Math.round(grandTotal * 0.25),
      condition: 'ทดสอบระบบ + ปิดฝ้า + ฉาบเรียบ + อนุมัติ Shop Drawing + สั่งไม้',
      work: 'ทดสอบระบบรั่วซึม, ปิดฝ้ายิปซั่ม, ฉาบเรียบผนัง, ทาสีรองพื้น, อนุมัติ shop drawing, ซื้อ HMR ล็อตแรก',
      weeks: 'Week 4-5',
    },
    {
      phase: 3,
      name: 'Finishing (พื้น + ห้องน้ำ)',
      percentage: 20,
      amount: Math.round(grandTotal * 0.20),
      condition: 'ปูพื้น SPC + กันซึมห้องน้ำ + ปูกระเบื้อง + QC carcass 80%',
      work: 'ปูพื้น SPC/บัว, กันซึมห้องน้ำ Dr.Fixit 2K (3 coat), ปูกระเบื้องห้องน้ำ, QC carcass 80% ที่โรงงาน',
      weeks: 'Week 6-7',
    },
    {
      phase: 4,
      name: 'Built-in Installation',
      percentage: 15,
      amount: Math.round(grandTotal * 0.15),
      condition: 'ติดตั้งเฟอร์นิเจอร์ onsite เสร็จ',
      work: 'คืนพื้นที่ติดตั้ง, ยึด carcass, set alignment, soft-close/runner/hinge',
      weeks: 'Week 8-11',
    },
    {
      phase: 5,
      name: 'Final (Defect + Handover)',
      percentage: 10,
      amount: 0, // จะคำนวณจาก grandTotal - sum(งวดอื่น)
      condition: 'เก็บ Defect + Big Cleaning + ส่งมอบ',
      work: 'ซิลิโคน, touch-up, Big clean, defect list ทั้งหมด',
      weeks: 'Week 12-13',
    },
  ];

  // คำนวณงวดสุดท้ายให้พอดี
  paymentSchedule[4].amount = grandTotal - paymentSchedule.slice(0, 4).reduce((sum, p) => sum + p.amount, 0);

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('th-TH', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const numberToThaiText = (num: number): string => {
    const ones = ['', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
    const positions = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน', 'ล้าน'];

    if (num === 0) return 'ศูนย์บาทถ้วน';

    const integer = Math.floor(num).toString();
    let result = '';

    const intArray = integer.split('').reverse();
    for (let i = 0; i < intArray.length; i++) {
      const digit = parseInt(intArray[i]);
      if (digit !== 0) {
        if (i === 1 && digit === 2) {
          result = 'ยี่สิบ' + result;
        } else if (i === 1 && digit === 1) {
          result = 'สิบ' + result;
        } else if (i === 0 && digit === 1 && intArray.length > 1) {
          result = 'เอ็ด' + result;
        } else {
          result = ones[digit] + positions[i] + result;
        }
      }
    }

    result = result || 'ศูนย์';
    result += 'บาทถ้วน';

    return result;
  };

  return (
    <div id="invoice-doc" className="max-w-[210mm] mx-auto bg-white print:shadow-none">
      {(!co?.companyName && !co?.phone) && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mx-8 mt-4 print:hidden">
          <p className="text-sm text-amber-800">กรุณากรอกข้อมูลบริษัทในหน้า "ข้อมูลบริษัท" ก่อนพิมพ์เอกสาร</p>
        </div>
      )}
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 15mm;
          }
          body {
            margin: 0;
            padding: 0;
          }
          #invoice-doc {
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
      <div className="bg-gradient-to-br from-emerald-800 via-emerald-700 to-emerald-900 text-white px-8 py-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,.02)_50%,transparent_75%,transparent_100%)] bg-[length:250px_250px]"></div>
        
        {/* Toggle Hide Price Button - Print Hidden */}
        <div className="print:hidden absolute top-3 left-1/2 transform -translate-x-1/2 z-10">
          <button
            onClick={() => setHidePrice(!hidePrice)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
              hidePrice 
                ? 'bg-red-600 hover:bg-red-700 text-white' 
                : 'bg-white/10 hover:bg-white/20 text-white border border-white/30'
            }`}
          >
            {hidePrice ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            <span className="text-xs">{hidePrice ? 'ราคาถูกซ่อน' : 'แสดงราคา'}</span>
          </button>
        </div>
        
        <div className="relative">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-6">
              <div className="bg-white/10 backdrop-blur-sm p-3 rounded-lg border border-white/20">
                <Building2 className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-3xl tracking-wider mb-1">{getDocumentCompanyTitle(co)}</h1>
                <p className="text-sm text-emerald-300">{getDocumentCompanyTagline(co)}</p>
              </div>
              <div className="border-l border-white/30 pl-6 ml-2">
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="w-5 h-5" />
                  <h2 className="text-xl tracking-wide">ใบวางบิล / ใบแจ้งหนี้</h2>
                </div>
                <p className="text-xs text-emerald-300">INVOICE</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Invoice Info */}
      <div className="px-8 py-4 bg-gradient-to-r from-emerald-50 to-white border-b-2 border-emerald-200">
        <div className="grid grid-cols-2 gap-6 text-sm">
          <div>
            <p className="text-emerald-900 mb-1">เลขที่ใบวางบิล:</p>
            <p className="text-base text-emerald-800">INV-2568-175</p>
          </div>
          <div>
            <p className="text-emerald-900 mb-1">วันที่:</p>
            <p className="text-base text-emerald-800">18 ธันวาคม 2568</p>
          </div>
        </div>
      </div>

      {/* Company & Customer Info */}
      <div className="px-8 py-4 grid grid-cols-2 gap-6 text-sm border-b border-emerald-100">
        <div className="space-y-2">
          <h3 className="text-emerald-900 mb-2">ผู้รับเงิน (Seller):</h3>
          <p className="text-base">{co.companyName || '-'}</p>
                    <p className="text-xs text-slate-600">{co.address || "-"}</p>
          <div className="flex items-center gap-2 text-xs text-slate-600 mt-2">
            <Phone className="w-3 h-3" />
            <span>{co.phone || '-'}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <Mail className="w-3 h-3" />
            <span>{co.email || '-'}</span>
          </div>
        </div>
        <div className="space-y-2">
          <h3 className="text-emerald-900 mb-2">ผู้ชำระเงิน (Customer):</h3>
          <div className="flex items-center gap-2 text-base mb-1">
            <User className="w-4 h-4 text-slate-500" />
            <span>{project.owner || '____________________'}</span>
          </div>
          <p className="text-xs text-slate-600">{project.address}</p>
          {project.phone && project.phone !== '-' && (
            <div className="flex items-center gap-2 text-xs text-slate-600 mt-2">
              <Phone className="w-3 h-3" />
              <span>{project.phone}</span>
            </div>
          )}
        </div>
      </div>

      {/* Project Summary */}
      <div className="px-8 py-4">
        <h3 className="text-base text-emerald-900 mb-3">รายการโครงการ:</h3>
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
          <p className="text-lg text-emerald-900 mb-1">{project.name}</p>
          <p className="text-xs text-slate-600">งานรีโนเวทคอนโด 2 ห้องนอน (ครบวงจร)</p>
        </div>
      </div>

      {/* Category Summary */}
      <div className="px-8 py-4">
        <h3 className="text-base text-emerald-900 mb-3">สรุปยอดตามหมวด:</h3>
        <div className="grid grid-cols-2 gap-3 text-xs">
          {Object.entries(categories).map(([key, cat]) => {
            if (cat.total === 0) return null;
            return (
              <div key={key} className="flex justify-between items-center bg-white border border-emerald-100 rounded px-3 py-2">
                <span className="text-slate-700">{cat.name}</span>
                <span className="text-emerald-800">{hidePrice ? '*****' : formatCurrency(cat.total)} บาท</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Total */}
      <div className="px-8 py-4 bg-gradient-to-r from-emerald-50 to-white">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-slate-700">รวมค่าใช้จ่ายโดยตรง (Subtotal):</span>
            <span className="text-emerald-800">{hidePrice ? '*****' : formatCurrency(subtotal)} บาท</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-700">ค่าดำเนินการ 5% (Operation Fee):</span>
            <span className="text-emerald-800">{hidePrice ? '*****' : formatCurrency(operationFee)} บาท</span>
          </div>
          <div className="border-t-2 border-emerald-300 pt-2 mt-2">
            <div className="flex justify-between items-center">
              <span className="text-lg text-emerald-900">ยอดชำระทั้งหมด (Grand Total):</span>
              <span className="text-xl text-emerald-900">{hidePrice ? '*****' : formatCurrency(grandTotal)} บาท</span>
            </div>
            <p className="text-xs text-slate-600 mt-1 text-right">({hidePrice ? '(ราคาถูกซ่อน)' : numberToThaiText(grandTotal)})</p>
          </div>
        </div>
      </div>

      {/* Payment Schedule */}
      <div className="px-8 py-4 print:page-break-inside-avoid">
        <h3 className="text-base text-emerald-900 mb-3">แผนการชำระเงิน (Payment Schedule) - 5 งวด:</h3>
        <div className="space-y-3">
          {paymentSchedule.map((payment, idx) => (
            <div key={idx} className={`border rounded-lg overflow-hidden ${
              idx === paymentSchedule.length - 1 
                ? 'border-green-300 bg-green-50' 
                : 'border-emerald-200 bg-white'
            }`}>
              <div className={`px-4 py-2 flex items-center justify-between ${
                idx === paymentSchedule.length - 1
                  ? 'bg-gradient-to-r from-green-600 to-green-700 text-white'
                  : 'bg-gradient-to-r from-emerald-600 to-emerald-700 text-white'
              }`}>
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 backdrop-blur-sm px-2 py-1 rounded text-xs">
                    งวดที่ {payment.phase}
                  </div>
                  <h4 className="text-sm">{payment.name}</h4>
                </div>
                <div className="text-right">
                  <p className="text-base">{hidePrice ? '*****' : formatCurrency(payment.amount)} บาท</p>
                  <p className="text-xs opacity-90">({payment.percentage}%)</p>
                </div>
              </div>
              <div className="px-4 py-2">
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <p className="text-slate-600 mb-1">เงื่อนไข:</p>
                    <p className="text-slate-800">{payment.condition}</p>
                  </div>
                  <div>
                    <p className="text-slate-600 mb-1">กำหนดชำระประมาณ:</p>
                    <p className="text-emerald-800">{payment.weeks}</p>
                  </div>
                </div>
                <div className="mt-2 text-slate-600">
                  <p className="text-slate-600 mb-1">งานที่ต้องทำ:</p>
                  <p className="text-slate-800">{payment.work}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
          <p className="mb-2">หมายเหตุ:</p>
          <ul className="space-y-1 pl-4">
            <li>• ยอดรวมทั้ง 5 งวดคิดเป็น 100% ของราคาทั้งหมด รวม <span className="text-amber-900">{hidePrice ? '*****' : formatCurrency(grandTotal)} บาท</span></li>
            <li>• กำหนดสัปดาห์เป็นประมาณการ อาจปรับตามความคืบหน้างานจริง</li>
            <li>• หากชำระล่าช้าเกิน 7 วัน อาจหยุดงานชั่วคราว</li>
          </ul>
        </div>
      </div>

      {/* Payment Info */}
      <div className="px-8 py-4 bg-gradient-to-r from-blue-50 to-white border-y-2 border-blue-200 print:page-break-inside-avoid">
        <h3 className="text-base text-blue-900 mb-3">ช่องทางการชำระเงิน:</h3>
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-white border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              {(() => { const _bi = findBankByName(co?.bankAccounts?.[0]?.bankName || ""); return _bi ? <img src={_bi.icon} alt={_bi.symbol} className="w-14 h-14 object-contain" /> : null; })()}
              <div className="flex-1 space-y-2 text-xs">
                <p className="text-blue-900 mb-2">โอนเข้าบัญชีธนาคาร:</p>
                <p>ธนาคาร: <span className="text-blue-800">{co.bankAccounts[0]?.bankName || '-'}</span></p>
                <p>เลขที่บัญชี: <span className="text-blue-800">{co.bankAccounts[0]?.accountNumber || '-'}</span></p>
                <p>ชื่อบัญชี: <span className="text-blue-800">{co.bankAccounts[0]?.accountName || '-'}</span></p>
                <p className="text-amber-600 mt-2">*** กรุณาแจ้งโอนพร้อมหลักฐาน ***</p>
              </div>
            </div>
          </div>
          <div className="bg-white border border-blue-200 rounded-lg p-4 flex flex-col items-center justify-center">
            <div className="w-32 h-32 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center mb-2">
              <p className="text-xs text-slate-400 text-center px-2">QR Code<br/>PromptPay</p>
            </div>
            <p className="text-xs text-center text-slate-600">สแกน QR Code ชำระเงินผ่าน PromptPay</p>
            <p className="text-xs text-center text-blue-800 mt-1">{co.phone || '-'}</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-8 py-4 text-center text-xs text-slate-600">
        <p>หากมีข้อสงสัย กรุณาติดต่อ: {co.phone || '-'} หรือ {co.email || '-'}</p>
        <p className="mt-2">ขอบคุณที่ไว้วางใจใช้บริการ</p>
      </div>

      {/* Print Button */}
      <div className="p-4 bg-white border-t border-emerald-200 print:hidden">
        <button
          onClick={() => window.print()}
          className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white py-2 px-6 rounded-lg transition-all shadow-md hover:shadow-lg text-sm"
        >
          พิมพ์ใบวางบิล / Print Invoice
        </button>
      </div>
    </div>
  );
}
