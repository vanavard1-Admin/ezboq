import React from 'react';
import { ProjectData, QuotationItem } from '../utils/projectData';
import { loadCompanyProfile } from '../utils/companyProfile';
import { getCurrentThaiDate } from '../utils/dateUtils';

interface CentroDesignQuotationDocumentProps {
  project: ProjectData;
}

export function CentroDesignQuotationDocument({ project }: CentroDesignQuotationDocumentProps) {
  const co = loadCompanyProfile();
  const companyLogo = co.logoUrl || '/ezboq-logo.png';
  const quotationData = project.quotationData;

  const calculateAmount = (item: QuotationItem): number => {
    if (!item.quantity || item.quantity === '') return 0;
    const qty = Number(item.quantity);
    const unitPrice = Number(item.unitPrice) || 0;
    const laborCost = Number(item.laborCost) || 0;
    return qty * (unitPrice + laborCost);
  };

  const subtotalBeforeDiscount = quotationData.reduce((sum, item) => sum + calculateAmount(item), 0);
  const discountRate = project.discountConfig?.percent ?? 0.25;
  const discountLabel = project.discountConfig?.label ?? 'ส่วนลดค่าออกแบบ 25%';
  const discountAmount = project.discountConfig?.amount != null
    ? project.discountConfig.amount
    : subtotalBeforeDiscount * discountRate;
  const grandTotal = subtotalBeforeDiscount - discountAmount;

  const totalArea = quotationData
    .filter(item => item.no.includes('.') && item.unit === 'ตร.ม.')
    .reduce((sum, item) => sum + Number(item.quantity), 0);

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
  };

  const pageClass = "w-[210mm] min-h-[297mm] mx-auto bg-white relative";
  const contentPadding = "px-[25mm] pt-[20mm] pb-[15mm]";
  const clauseClass = "text-xs leading-relaxed text-slate-800 mb-2";

  return (
    <div id="centro-quotation-doc" className="max-w-[210mm] mx-auto bg-white print:shadow-none">
      {(!co?.companyName && !co?.phone) && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mx-8 mt-4 print:hidden">
          <p className="text-sm text-amber-800">กรุณากรอกข้อมูลบริษัทในหน้า "ข้อมูลบริษัท" ก่อนพิมพ์เอกสาร</p>
        </div>
      )}
      <style>{`
        @media print {
          @page { size: A4; margin: 0; }
          body { margin: 0; padding: 0; }
          .page-break { page-break-before: always; break-before: always; }
        }
      `}</style>

      {/* ==================== PAGE 1 ==================== */}
      <div className={pageClass}>
        <div className={contentPadding}>
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-300 pb-3 mb-4">
            <img src={companyLogo} alt={co.companyName || 'Company Logo'} className="h-12 object-contain" />
            <div className="text-right">
              <p className="text-[10px] text-slate-400 tracking-[0.3em] uppercase">Interior Design & Construction</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{co.email || '-'} | {co.phone || '-'}</p>
            </div>
          </div>

          {/* Title */}
          <div className="text-center mb-5">
            <h1 className="text-xl font-bold tracking-wide text-slate-900">ใบเสนอราคาค่าออกแบบ</h1>
            <h2 className="text-base mt-1 text-slate-700">DESIGN QUOTATION</h2>
            <p className="text-xs text-slate-500 mt-2">เลขที่: <span className="font-semibold text-slate-700">QT-2569-CENTRO</span> &nbsp;&nbsp;|&nbsp;&nbsp; วันที่: <span className="font-semibold text-slate-700">{getCurrentThaiDate()}</span> &nbsp;&nbsp;|&nbsp;&nbsp; มีผล 30 วัน</p>
          </div>

          {/* Project & Provider Info */}
          <div className="grid grid-cols-2 gap-8 mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 border-b-2 border-slate-800 pb-1.5 mb-3">ข้อมูลโครงการ</h3>
              <p className={clauseClass}><span className="font-bold">โครงการ:</span> &nbsp; {project.name}</p>
              <p className={clauseClass}><span className="font-bold">ที่อยู่:</span> &nbsp; {project.address}</p>
              <p className={clauseClass}><span className="font-bold">เจ้าของ:</span> &nbsp; {project.owner}</p>
              <p className={clauseClass}><span className="font-bold">พื้นที่รวม:</span> &nbsp; {totalArea.toFixed(2)} ตร.ม.</p>
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 border-b-2 border-slate-800 pb-1.5 mb-3">ข้อมูลผู้เสนอ</h3>
              <p className={clauseClass}><span className="font-bold">บริษัท:</span> &nbsp; {co.companyName || '-'}</p>
              <p className={clauseClass}><span className="font-bold">ที่อยู่:</span> &nbsp; {co.address || '-'}</p>
              <p className={clauseClass}><span className="font-bold">โทร:</span> &nbsp; {co.phone || '-'}</p>
              <p className={clauseClass}><span className="font-bold">อีเมล:</span> &nbsp; {co.email || '-'}</p>
            </div>
          </div>

          {/* Quotation Table */}
          <h3 className="text-sm font-bold text-slate-900 border-b-2 border-slate-800 pb-1.5 mb-3">รายละเอียดค่าออกแบบ</h3>
          <table className="w-full border-collapse text-xs mb-3">
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-slate-300 px-2 py-1 text-left w-10 font-semibold">ลำดับ</th>
                <th className="border border-slate-300 px-2 py-1 text-left font-semibold">รายการ</th>
                <th className="border border-slate-300 px-2 py-1 text-center w-12 font-semibold">หน่วย</th>
                <th className="border border-slate-300 px-2 py-1 text-center w-14 font-semibold">จำนวน</th>
                <th className="border border-slate-300 px-2 py-1 text-right w-20 font-semibold">ราคา/หน่วย</th>
                <th className="border border-slate-300 px-2 py-1 text-right w-20 font-semibold">รวม (บาท)</th>
              </tr>
            </thead>
            <tbody>
              {quotationData.map((item, index) => {
                const isHeader = !item.no.includes('.');
                const amount = calculateAmount(item);
                return (
                  <tr key={index} className={isHeader ? 'bg-slate-50' : ''}>
                    <td className={`border border-slate-300 px-2 py-1 text-xs ${isHeader ? 'font-semibold' : 'text-slate-600'}`}>{item.no}</td>
                    <td className={`border border-slate-300 px-2 py-1 text-xs ${isHeader ? 'font-semibold' : 'pl-5'}`}>{item.description}</td>
                    <td className="border border-slate-300 px-2 py-1 text-xs text-center text-slate-600">{item.unit}</td>
                    <td className="border border-slate-300 px-2 py-1 text-xs text-center text-slate-600">{item.quantity !== '' ? item.quantity : ''}</td>
                    <td className="border border-slate-300 px-2 py-1 text-xs text-right text-slate-600">{Number(item.unitPrice) > 0 ? formatCurrency(Number(item.unitPrice)) : '-'}</td>
                    <td className="border border-slate-300 px-2 py-1 text-xs text-right font-semibold text-slate-800">{amount > 0 ? formatCurrency(amount) : '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Summary */}
          <div className="flex justify-end mb-3">
            <table className="w-72 border-collapse text-xs">
              <tbody>
                <tr className="bg-slate-50">
                  <td className="border border-slate-300 px-2 py-1 text-xs text-slate-600">รวมค่าออกแบบ ({totalArea.toFixed(2)} ตร.ม. x 1,000)</td>
                  <td className="border border-slate-300 px-2 py-1 text-xs text-right w-24">{formatCurrency(subtotalBeforeDiscount)} บาท</td>
                </tr>
                <tr>
                  <td className="border border-slate-300 px-2 py-1 text-xs text-slate-600">{discountLabel}</td>
                  <td className="border border-slate-300 px-2 py-1 text-xs text-right">-{formatCurrency(discountAmount)} บาท</td>
                </tr>
                <tr className="bg-slate-800 text-white">
                  <td className="border border-slate-600 px-2 py-1.5 text-xs font-bold">ราคาสุทธิ</td>
                  <td className="border border-slate-600 px-2 py-1.5 text-xs text-right font-bold">{formatCurrency(grandTotal)} บาท</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Notes */}
          <h3 className="text-xs font-bold text-slate-900 border-b border-slate-400 pb-1 mb-2">หมายเหตุ</h3>
          <p className="text-xs leading-normal text-slate-700 mb-1 pl-4">1. &nbsp; ราคาข้างต้นเป็นค่าออกแบบเท่านั้น ไม่รวมค่าก่อสร้าง วัสดุ เฟอร์นิเจอร์ หรือค่าแรง</p>
          {discountAmount > 0 && (
            <p className="text-xs leading-normal text-red-700 font-semibold mb-1 pl-4">2. &nbsp; {discountLabel} หากไม่ทำ ต้องชำระคืน {formatCurrency(discountAmount)} บาท</p>
          )}
          <p className="text-xs leading-normal text-slate-700 mb-1 pl-4">3. &nbsp; การชำระเงินแบ่ง 3 งวด: มัดจำ 50% / ส่งแบบดราฟ 30% / ส่งแบบก่อสร้าง 20%</p>
          <p className="text-xs leading-normal text-slate-700 mb-1 pl-4">4. &nbsp; ระยะเวลาดำเนินการ 1 เดือน (4 สัปดาห์) | แก้ไขแบบได้ 3 ครั้ง</p>
        </div>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 bg-slate-800 text-white py-2 text-center">
          <p className="text-[10px] text-slate-300">{co.companyName || co.companyNameTh || 'ชื่อบริษัท'} &nbsp;&bull;&nbsp; {co.tagline || 'Interior Design & Construction'} &nbsp;&bull;&nbsp; {co.email || '-'} &nbsp;&bull;&nbsp; {co.phone || '-'}</p>
        </div>
      </div>

      {/* ==================== PAGE 2 ==================== */}
      <div className={`${pageClass} page-break`}>
        <div className={contentPadding}>
          {/* Deliverables */}
          <h3 className="text-sm font-bold text-slate-900 border-b-2 border-slate-800 pb-1.5 mb-4">สิ่งที่ลูกค้าจะได้รับ (Deliverables)</h3>

          <table className="w-full border-collapse text-xs mb-6">
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-slate-300 px-3 py-1.5 text-left w-8 font-semibold">#</th>
                <th className="border border-slate-300 px-3 py-1.5 text-left font-semibold">รายการ</th>
                <th className="border border-slate-300 px-3 py-1.5 text-left font-semibold">รายละเอียด</th>
              </tr>
            </thead>
            <tbody>
              {[
                { name: 'Layout Plan / Furniture Plan', desc: 'แปลนพื้น จัดวางเฟอร์นิเจอร์ และแปลนงานระบบ' },
                { name: '3D Perspective', desc: 'ภาพ 3 มิติเสมือนจริง แสดงมุมมองห้องทุกมุม' },
                { name: 'Elevation Drawing', desc: 'แบบรูปด้านผนังแต่ละด้าน แสดงรายละเอียดงานตกแต่ง' },
                { name: 'Section Drawing', desc: 'แบบรูปตัด แสดงรายละเอียดโครงสร้างและระดับ' },
                { name: 'Lighting Design', desc: 'แบบระบบไฟส่องสว่างและตำแหน่งดวงโคม' },
                { name: 'Material Specification', desc: 'รายการสเปควัสดุที่ใช้ในงานตกแต่งทั้งหมด' },
                { name: 'Shop Drawing', desc: 'แบบก่อสร้างละเอียดสำหรับช่างเข้าทำงาน' },
                { name: 'BOQ + ใบเสนอราคาบิ้วอิน', desc: 'รายการวัสดุ ปริมาณงาน และราคาบิ้วอิน' },
              ].map((item, i) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                  <td className="border border-slate-300 px-3 py-1.5 text-xs text-center text-slate-600">{i + 1}</td>
                  <td className="border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-800">{item.name}</td>
                  <td className="border border-slate-300 px-3 py-1.5 text-xs text-slate-600">{item.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Timeline */}
          <h3 className="text-sm font-bold text-slate-900 border-b-2 border-slate-800 pb-1.5 mb-4">ระยะเวลาดำเนินการ</h3>

          <table className="w-full border-collapse text-xs mb-4">
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-slate-300 px-3 py-1.5 text-left font-semibold w-28">ช่วงเวลา</th>
                <th className="border border-slate-300 px-3 py-1.5 text-left font-semibold">เนื้องาน</th>
                <th className="border border-slate-300 px-3 py-1.5 text-left font-semibold">รายละเอียด</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-slate-300 px-3 py-1.5 text-xs font-semibold">สัปดาห์ที่ 1-2</td>
                <td className="border border-slate-300 px-3 py-1.5 text-xs">งานออกแบบ (Design)</td>
                <td className="border border-slate-300 px-3 py-1.5 text-xs text-slate-600">Layout Plan, 3D Perspective, Elevation, Lighting Design</td>
              </tr>
              <tr className="bg-slate-50">
                <td className="border border-slate-300 px-3 py-1.5 text-xs font-semibold">สัปดาห์ที่ 3-4</td>
                <td className="border border-slate-300 px-3 py-1.5 text-xs">แบบก่อสร้าง</td>
                <td className="border border-slate-300 px-3 py-1.5 text-xs text-slate-600">Section, Shop Drawing, Material Spec, BOQ</td>
              </tr>
            </tbody>
          </table>

          <p className="text-xs leading-relaxed text-slate-700 mb-2">
            <span className="font-bold">ระยะเวลารวม:</span> &nbsp; 1 เดือน (4 สัปดาห์) &nbsp;|&nbsp; แก้ไขแบบได้ 3 ครั้ง &nbsp;|&nbsp; ค่าปรับกรณีล่าช้า 0.05%/วัน
          </p>

          {/* Signature */}
          <div className="mt-16 border-t-2 border-slate-400 pt-6">
            <p className="text-xs text-slate-600 text-center mb-8">
              ข้าพเจ้ายืนยันว่ารายละเอียดข้างต้นถูกต้อง และยินดีเสนอราคาตามเงื่อนไขที่ระบุ
            </p>
            <div className="grid grid-cols-2 gap-12">
              <div className="text-center">
                <p className="text-xs text-slate-500 mb-2">ผู้เสนอ (Prepared By)</p>
                <div className="h-4"></div>
                <div className="w-24 h-12 border-b border-slate-400" />
                <p className="text-xs border-b border-slate-400 pb-1 mx-8">{co.companyName || co.companyNameTh || 'ชื่อบริษัท'}</p>
                <p className="text-xs text-slate-600 mt-2">{getCurrentThaiDate()}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-500 mb-2">ผู้รับเสนอ (Client)</p>
                <div className="h-16"></div>
                <p className="text-xs border-b border-slate-400 pb-1 mx-8">ลงชื่อ ..................................................</p>
                <p className="text-xs mt-2">( {project.owner} )</p>
                <p className="text-xs text-slate-500 mt-0.5">วันที่ ........................</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 bg-slate-800 text-white py-2 text-center">
          <p className="text-[10px] text-slate-300">{co.companyName || co.companyNameTh || 'ชื่อบริษัท'} &nbsp;&bull;&nbsp; {co.tagline || 'Interior Design & Construction'} &nbsp;&bull;&nbsp; {co.email || '-'} &nbsp;&bull;&nbsp; {co.phone || '-'}</p>
        </div>
      </div>

      {/* Print Button */}
      <div className="p-4 bg-white border-t border-slate-200 print:hidden">
        <button onClick={() => window.print()} className="w-full bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-800 hover:to-slate-900 text-white py-2.5 px-6 rounded-lg transition-all shadow-md hover:shadow-lg text-sm">
          พิมพ์ใบเสนอราคา / Print Quotation
        </button>
      </div>
    </div>
  );
}
