import React from 'react';
import { findBankByName } from '../utils/thaiBankData';
import { ProjectData, QuotationItem } from '../utils/projectData';
import { loadCompanyProfile } from '../utils/companyProfile';
import { getCurrentThaiDate } from '../utils/dateUtils';

interface CentroDesignInvoiceDocumentProps {
  project: ProjectData;
}

export function CentroDesignInvoiceDocument({ project }: CentroDesignInvoiceDocumentProps) {
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

  const payment1 = Math.round(grandTotal * 0.5);
  const payment2 = Math.round(grandTotal * 0.3);
  const payment3 = grandTotal - payment1 - payment2;

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
  };

  const pageClass = "w-[210mm] min-h-[297mm] mx-auto bg-white relative";
  const contentPadding = "px-[25mm] pt-[20mm] pb-[15mm]";

  return (
    <div id="centro-invoice-doc" className="max-w-[210mm] mx-auto bg-white print:shadow-none">
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
          <div className="flex items-center justify-between border-b border-slate-300 pb-4 mb-6">
            <img src={companyLogo} alt={co.companyName || 'Company Logo'} className="h-12 object-contain" />
            <div className="text-right">
              <p className="text-[10px] text-slate-400 tracking-[0.3em] uppercase">Interior Design & Construction</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{co.email || '-'} | {co.phone || '-'}</p>
            </div>
          </div>

          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-xl font-bold tracking-wide text-slate-900">ใบวางบิล</h1>
            <h2 className="text-base mt-1 text-slate-700">DESIGN INVOICE</h2>
            <p className="text-xs text-slate-500 mt-3">เลขที่: <span className="font-semibold text-slate-700">INV-2569-CENTRO</span> &nbsp;&nbsp;|&nbsp;&nbsp; วันที่: <span className="font-semibold text-slate-700">{getCurrentThaiDate()}</span></p>
          </div>

          {/* Bill To & Biller */}
          <div className="grid grid-cols-2 gap-8 mb-8">
            <div>
              <h3 className="text-sm font-bold text-slate-900 border-b-2 border-slate-800 pb-1.5 mb-3">เรียกเก็บจาก</h3>
              <p className="text-xs leading-relaxed text-slate-800 font-bold mb-1">{project.owner}</p>
              <p className="text-xs leading-relaxed text-slate-600 mb-1">{project.address}</p>
              <p className="text-xs leading-relaxed text-slate-600">โครงการ: {project.name}</p>
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 border-b-2 border-slate-800 pb-1.5 mb-3">ผู้วางบิล</h3>
              <p className="text-xs leading-relaxed text-slate-800 font-bold mb-1">{co.companyName || '-'}</p>
              <p className="text-xs leading-relaxed text-slate-600 mb-1">{co.email || '-'}</p>
              <p className="text-xs leading-relaxed text-slate-600">{co.phone || '-'}</p>
            </div>
          </div>

          {/* Billing Summary */}
          <h3 className="text-sm font-bold text-slate-900 border-b-2 border-slate-800 pb-1.5 mb-4">สรุปยอดเรียกเก็บ</h3>

          <table className="w-full border-collapse text-xs mb-8">
            <tbody>
              <tr className="bg-slate-50">
                <td className="border border-slate-300 px-3 py-2 text-xs">ค่าออกแบบตกแต่งภายใน ({totalArea.toFixed(2)} ตร.ม. x 1,000 บาท)</td>
                <td className="border border-slate-300 px-3 py-2 text-xs text-right w-28">{formatCurrency(subtotalBeforeDiscount)} บาท</td>
              </tr>
              <tr>
                <td className="border border-slate-300 px-3 py-2 text-xs">{discountLabel}</td>
                <td className="border border-slate-300 px-3 py-2 text-xs text-right">-{formatCurrency(discountAmount)} บาท</td>
              </tr>
              <tr className="bg-slate-800 text-white">
                <td className="border border-slate-600 px-3 py-2.5 text-xs font-bold">ยอดชำระทั้งหมด</td>
                <td className="border border-slate-600 px-3 py-2.5 text-xs text-right font-bold">{formatCurrency(grandTotal)} บาท</td>
              </tr>
            </tbody>
          </table>

          {/* Payment Schedule */}
          <h3 className="text-sm font-bold text-slate-900 border-b-2 border-slate-800 pb-1.5 mb-4">แผนการชำระเงิน (3 งวด)</h3>

          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-slate-300 px-3 py-2 text-left font-semibold w-28">งวด</th>
                <th className="border border-slate-300 px-3 py-2 text-left font-semibold">เงื่อนไขการชำระ</th>
                <th className="border border-slate-300 px-3 py-2 text-right font-semibold w-28">จำนวนเงิน</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-slate-300 px-3 py-2 text-xs font-semibold">งวดที่ 1 (50%)</td>
                <td className="border border-slate-300 px-3 py-2 text-xs">มัดจำก่อนเริ่มงานออกแบบ</td>
                <td className="border border-slate-300 px-3 py-2 text-xs text-right font-semibold">{formatCurrency(payment1)} บาท</td>
              </tr>
              <tr className="bg-slate-50">
                <td className="border border-slate-300 px-3 py-2 text-xs font-semibold">งวดที่ 2 (30%)</td>
                <td className="border border-slate-300 px-3 py-2 text-xs">ชำระเมื่อส่งแบบดราฟแรก</td>
                <td className="border border-slate-300 px-3 py-2 text-xs text-right font-semibold">{formatCurrency(payment2)} บาท</td>
              </tr>
              <tr>
                <td className="border border-slate-300 px-3 py-2 text-xs font-semibold">งวดที่ 3 (20%)</td>
                <td className="border border-slate-300 px-3 py-2 text-xs">ชำระเมื่อส่งแบบก่อสร้าง + BOQ</td>
                <td className="border border-slate-300 px-3 py-2 text-xs text-right font-semibold">{formatCurrency(payment3)} บาท</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 bg-slate-800 text-white py-2 text-center">
          <p className="text-[10px] text-slate-300">{co.companyName || co.companyNameTh || 'ชื่อบริษัท'} &nbsp;&bull;&nbsp; {co.tagline || 'Interior Design & Construction'} &nbsp;&bull;&nbsp; {co.email || '-'} &nbsp;&bull;&nbsp; {co.phone || '-'}</p>
        </div>
      </div>

      {/* ==================== PAGE 2 ==================== */}
      <div className={`${pageClass} page-break`}>
        <div className={contentPadding}>
          {/* Payment Method */}
          <h3 className="text-sm font-bold text-slate-900 border-b-2 border-slate-800 pb-1.5 mb-6">ช่องทางชำระเงิน</h3>

          <div className="grid grid-cols-2 gap-6 mb-8">
            {/* Bank Info */}
            <div className="border border-slate-200 rounded-lg p-5">
              <div className="flex items-center gap-4 mb-3">
                {(() => { const _bi = findBankByName(co?.bankAccounts?.[0]?.bankName || ""); return _bi ? <img src={_bi.icon} alt={_bi.symbol} className="w-12 h-12 object-contain" /> : null; })()}
                <p className="text-xs font-bold text-slate-800">{co.bankAccounts[0]?.bankName || '-'}</p>
              </div>
              <div className="pl-1">
                <p className="text-xs text-slate-700 mb-1.5">เลขที่บัญชี: <span className="font-bold text-slate-900 text-sm">{co.bankAccounts[0]?.accountNumber || '-'}</span></p>
                <p className="text-xs text-slate-700">ชื่อบัญชี: <span className="font-semibold">{co.bankAccounts[0]?.accountName || '-'}</span></p>
              </div>
            </div>
            {/* QR Code */}
            <div className="border border-slate-200 rounded-lg p-5 flex flex-col items-center justify-center">
              <div className="w-32 h-32 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center mx-auto mb-2">
                <p className="text-xs text-slate-400 text-center px-2">QR Code<br/>PromptPay</p>
              </div>
              <p className="text-xs text-slate-500">สแกน QR Code เพื่อชำระเงิน</p>
            </div>
          </div>

          {/* Notes */}
          <h3 className="text-sm font-bold text-slate-900 border-b-2 border-slate-800 pb-1.5 mb-4">หมายเหตุ</h3>
          <p className="text-xs leading-relaxed text-slate-700 mb-2 pl-4">1. &nbsp; กรุณาแจ้งหลักฐานการโอนเงินทุกครั้ง ผ่าน LINE หรืออีเมล</p>
          <p className="text-xs leading-relaxed text-slate-700 mb-2 pl-4">2. &nbsp; งานออกแบบจะเริ่มหลังได้รับชำระงวดที่ 1 เรียบร้อยแล้ว</p>
          <p className="text-xs leading-relaxed text-slate-700 mb-2 pl-4">3. &nbsp; หากชำระล่าช้าเกิน 3 วัน ผู้รับจ้างมีสิทธิ์หยุดงานจนกว่าจะได้รับชำระ</p>
          <p className="text-xs leading-relaxed text-slate-700 mb-2 pl-4">4. &nbsp; ใบวางบิลนี้ไม่ใช่ใบเสร็จรับเงิน กรุณาเก็บหลักฐานการโอนไว้เป็นสำคัญ</p>

          {/* Signature */}
          <div className="mt-16 border-t-2 border-slate-400 pt-6">
            <div className="grid grid-cols-2 gap-12">
              <div className="text-center">
                <p className="text-xs text-slate-500 mb-2">ผู้วางบิล (Billed By)</p>
                <div className="h-4"></div>
                <div className="w-24 h-12 border-b border-slate-400" />
                <p className="text-xs border-b border-slate-400 pb-1 mx-8">{co.companyName || co.companyNameTh || 'ชื่อบริษัท'}</p>
                <p className="text-xs text-slate-600 mt-2">{getCurrentThaiDate()}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-500 mb-2">ผู้รับบิล (Received By)</p>
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
          พิมพ์ใบวางบิล / Print Invoice
        </button>
      </div>
    </div>
  );
}
