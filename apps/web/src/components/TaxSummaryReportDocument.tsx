import React from 'react';
import { Building2, Pencil, Eye, FileSpreadsheet } from 'lucide-react';
import { ProjectData, getProjectCustomerAmount } from '../utils/projectData';
import { getCurrentThaiDate } from '../utils/dateUtils';
import { loadCompanyProfile, type CompanyProfile } from '../utils/companyProfile';
import { calculateTax } from '../utils/taxUtils';

interface TaxSummaryReportDocumentProps {
  project: ProjectData;
  companyProfile?: CompanyProfile;
  period?: string; // e.g. "มีนาคม 2569"
}

interface TaxEntry {
  no: number;
  invoiceNumber: string;
  name: string;
  goodsValue: number;
  taxAmount: number;
}

export function TaxSummaryReportDocument({
  project,
  companyProfile,
  period,
}: TaxSummaryReportDocumentProps) {
  const [isEditing, setIsEditing] = React.useState(false);
  const co = companyProfile || loadCompanyProfile();

  const fmt = (n: number) => n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const displayPeriod = period || getCurrentThaiDate().replace(/^\d+\s/, ''); // fallback to current month/year

  // Build placeholder data from project
  const { outputEntries, inputEntries } = buildPlaceholderData(project);

  const outputSubtotalGoods = outputEntries.reduce((s, e) => s + e.goodsValue, 0);
  const outputSubtotalTax = outputEntries.reduce((s, e) => s + e.taxAmount, 0);
  const inputSubtotalGoods = inputEntries.reduce((s, e) => s + e.goodsValue, 0);
  const inputSubtotalTax = inputEntries.reduce((s, e) => s + e.taxAmount, 0);

  const netTax = outputSubtotalTax - inputSubtotalTax;

  return (
    <div id="tax-summary-report-doc" className="max-w-[210mm] mx-auto bg-white print:shadow-none">
      {(!co?.companyName && !co?.phone) && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mx-8 mt-4 print:hidden">
          <p className="text-sm text-amber-800">กรุณากรอกข้อมูลบริษัทในหน้า "ข้อมูลบริษัท" ก่อนพิมพ์เอกสาร</p>
        </div>
      )}

      <style>{`
        @media print {
          @page { size: A4; margin: 8mm 10mm; }
          body { margin: 0; padding: 0; }
          body * { visibility: hidden; }
          #tax-summary-report-doc, #tax-summary-report-doc * { visibility: visible; }
          #tax-summary-report-doc { position: absolute; top: 0; left: 0; width: 100%; max-width: 100%; transform: scale(0.87); transform-origin: top center; }
          .print\\:page-break-inside-avoid { page-break-inside: avoid; break-inside: avoid; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>

      {/* ===== HEADER ===== */}
      <div className="bg-[var(--doc-primary)] text-white px-6 py-5 print:page-break-inside-avoid">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-6">
            {co?.logoUrl ? (
              <img src={co.logoUrl} alt="Logo" className="w-10 h-10 rounded object-contain bg-white/10" />
            ) : (
              <Building2 className="w-8 h-8" />
            )}
            <div>
              <h1 className="text-3xl tracking-wider mb-1">{co?.companyName?.toUpperCase() || '-'}</h1>
              <p className="text-sm text-stone-400">{co?.tagline || 'Interior Design & Construction'}</p>
            </div>
            <div className="border-l border-white/30 pl-6 ml-2">
              <div className="flex items-center gap-2 mb-1">
                <FileSpreadsheet className="w-5 h-5" />
                <h2 className="text-xl tracking-wide">รายงานภาษีซื้อ-ขาย</h2>
              </div>
              <p className="text-xs text-stone-400">TAX PURCHASE-SALES SUMMARY</p>
            </div>
          </div>
          <div className="text-right">
            <div className="px-5 py-3">
              <p className="text-xs text-stone-400 mb-1">งวด / Period</p>
              <p className="text-base">{displayPeriod}</p>
              <p className="text-xs text-stone-400 mt-3 mb-1">โครงการ / Project</p>
              <p className="text-base truncate max-w-[180px]">{project.name}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ===== TOOLBAR ===== */}
      <div className="flex items-center gap-2 px-6 py-3 bg-stone-50 border-b border-stone-200 print:hidden">
        <button
          onClick={() => setIsEditing(!isEditing)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
            isEditing
              ? 'bg-[var(--doc-primary)] text-white'
              : 'border border-stone-200 text-stone-600 hover:bg-stone-100'
          }`}
        >
          {isEditing ? <Eye className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
          {isEditing ? 'ดูตัวอย่าง' : 'แก้ไข'}
        </button>
        {isEditing && (
          <span className="text-[11px] text-stone-400">คลิกที่ข้อความเพื่อแก้ไขได้เลย</span>
        )}
      </div>

      {/* ===== MAIN CONTENT ===== */}
      <div
        contentEditable={isEditing}
        suppressContentEditableWarning
        className={`${isEditing ? '[&_p]:outline-none [&_p]:hover:bg-amber-50/40 [&_p]:focus:bg-amber-50/60 [&_td]:outline-none [&_td]:hover:bg-amber-50/40 [&_td]:focus:bg-amber-50/60 [&_p]:rounded [&_td]:rounded [&_p]:transition-colors [&_td]:transition-colors' : ''}`}
      >
        {/* Company Info */}
        <div className="px-6 py-4 border-b border-stone-200 bg-stone-50 print:page-break-inside-avoid">
          <div className="flex justify-between items-start">
            <div className="text-xs space-y-1">
              <p className="text-stone-800 font-medium">{co?.companyName || '-'}</p>
              {co?.taxId && (
                <p className="text-stone-700">เลขประจำตัวผู้เสียภาษี: {co.taxId}</p>
              )}
              {co?.address && <p className="text-stone-500">{co.address}</p>}
            </div>
            <div className="text-xs text-right">
              <p className="text-stone-500">โครงการ: <span className="text-stone-700 font-medium">{project.name}</span></p>
              <p className="text-stone-500">ลูกค้า: {project.owner || '-'}</p>
            </div>
          </div>
        </div>

        {/* Placeholder notice */}
        <div className="px-6 pt-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <p className="text-xs text-blue-800">แสดงข้อมูลประมาณการจากราคาโครงการ (ยังไม่มีข้อมูลภาษีจริง)</p>
          </div>
        </div>

        {/* Section 1: Output VAT */}
        <div className="px-6 pt-2 pb-4 print:page-break-inside-avoid">
          <h3 className="text-sm font-semibold text-stone-800 mb-3 flex items-center gap-2">
            <span className="w-6 h-6 bg-[var(--doc-primary)] text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
            ภาษีขาย (Output VAT)
          </h3>
          <table className="w-full mb-3 text-sm">
            <thead>
              <tr className="bg-[var(--doc-primary)] text-white">
                <th className="px-3 py-2 text-left w-12 text-xs">ลำดับ</th>
                <th className="px-3 py-2 text-left w-36 text-xs">เลขที่ใบกำกับ</th>
                <th className="px-3 py-2 text-left text-xs">ชื่อลูกค้า</th>
                <th className="px-3 py-2 text-right w-32 text-xs">มูลค่าสินค้า (บาท)</th>
                <th className="px-3 py-2 text-right w-28 text-xs">ภาษีขาย (บาท)</th>
              </tr>
            </thead>
            <tbody>
              {outputEntries.map((entry, idx) => (
                <tr key={idx} className={`border-b border-stone-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-stone-50/50'}`}>
                  <td className="px-3 py-2 text-center text-stone-500">{entry.no}</td>
                  <td className="px-3 py-2 text-stone-600">{entry.invoiceNumber}</td>
                  <td className="px-3 py-2 text-stone-800">{entry.name}</td>
                  <td className="px-3 py-2 text-right font-medium text-stone-800">{fmt(entry.goodsValue)}</td>
                  <td className="px-3 py-2 text-right text-stone-800">{fmt(entry.taxAmount)}</td>
                </tr>
              ))}
              <tr className="bg-stone-100 font-semibold">
                <td colSpan={3} className="px-3 py-2 text-right text-sm text-stone-700">รวมภาษีขาย</td>
                <td className="px-3 py-2 text-right text-sm text-stone-800">{fmt(outputSubtotalGoods)}</td>
                <td className="px-3 py-2 text-right text-sm text-stone-800">{fmt(outputSubtotalTax)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Section 2: Input VAT */}
        <div className="px-6 pt-2 pb-4 print:page-break-inside-avoid">
          <h3 className="text-sm font-semibold text-stone-800 mb-3 flex items-center gap-2">
            <span className="w-6 h-6 bg-[var(--doc-primary)] text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
            ภาษีซื้อ (Input VAT)
          </h3>
          <table className="w-full mb-3 text-sm">
            <thead>
              <tr className="bg-[var(--doc-primary)] text-white">
                <th className="px-3 py-2 text-left w-12 text-xs">ลำดับ</th>
                <th className="px-3 py-2 text-left w-36 text-xs">เลขที่ใบกำกับ</th>
                <th className="px-3 py-2 text-left text-xs">ชื่อผู้ขาย</th>
                <th className="px-3 py-2 text-right w-32 text-xs">มูลค่าสินค้า (บาท)</th>
                <th className="px-3 py-2 text-right w-28 text-xs">ภาษีซื้อ (บาท)</th>
              </tr>
            </thead>
            <tbody>
              {inputEntries.map((entry, idx) => (
                <tr key={idx} className={`border-b border-stone-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-stone-50/50'}`}>
                  <td className="px-3 py-2 text-center text-stone-500">{entry.no}</td>
                  <td className="px-3 py-2 text-stone-600">{entry.invoiceNumber}</td>
                  <td className="px-3 py-2 text-stone-800">{entry.name}</td>
                  <td className="px-3 py-2 text-right font-medium text-stone-800">{fmt(entry.goodsValue)}</td>
                  <td className="px-3 py-2 text-right text-stone-800">{fmt(entry.taxAmount)}</td>
                </tr>
              ))}
              <tr className="bg-stone-100 font-semibold">
                <td colSpan={3} className="px-3 py-2 text-right text-sm text-stone-700">รวมภาษีซื้อ</td>
                <td className="px-3 py-2 text-right text-sm text-stone-800">{fmt(inputSubtotalGoods)}</td>
                <td className="px-3 py-2 text-right text-sm text-stone-800">{fmt(inputSubtotalTax)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Summary */}
        <div className="px-6 pb-4 print:page-break-inside-avoid">
          <div className="max-w-sm ml-auto space-y-1.5">
            <div className="flex justify-between text-sm py-1">
              <span className="text-stone-500">ภาษีขาย (Output VAT)</span>
              <span className="font-medium text-stone-800">{fmt(outputSubtotalTax)}</span>
            </div>
            <div className="flex justify-between text-sm py-1">
              <span className="text-stone-500">ภาษีซื้อ (Input VAT)</span>
              <span className="font-medium text-stone-800">({fmt(inputSubtotalTax)})</span>
            </div>
            <div className={`flex justify-between pt-1.5 text-white -mx-3 -mb-3 px-3 py-2.5 rounded-b-lg ${netTax >= 0 ? 'bg-[var(--doc-primary)]' : 'bg-green-700'}`}>
              <span className="font-bold">
                {netTax >= 0 ? 'ภาษีที่ต้องชำระ / Tax Payable' : 'ภาษีที่ขอคืน / Tax Refundable'}
              </span>
              <span className="font-bold">{fmt(Math.abs(netTax))}</span>
            </div>
          </div>
        </div>

        {/* Note */}
        <div className="mx-6 my-4 p-3 bg-amber-50 border border-amber-200 rounded-lg print:page-break-inside-avoid">
          <p className="text-xs text-amber-800">
            <span className="font-semibold">หมายเหตุ:</span> รายงานนี้จัดทำเพื่อสรุปภาษีซื้อ-ขายประจำงวด
            สำหรับการยื่นแบบ ภ.พ.30
          </p>
        </div>

        {/* Signature */}
        <div className="px-6 pt-4 pb-6 grid grid-cols-2 gap-8 print:page-break-inside-avoid">
          <div className="text-center">
            {co?.signatureUrl ? (
              <div className="mb-1">
                <img src={co.signatureUrl} alt="Signature" className="h-10 mx-auto" />
              </div>
            ) : (
              <div className="border-b border-stone-400 pb-12 mx-8" />
            )}
            <p className="text-xs text-stone-600 mt-2">ผู้จัดทำ / Prepared by</p>
            <p className="text-xs text-stone-500">{co.signatureName || 'ชื่อผู้จัดทำ'}</p>
          </div>
          <div className="text-center">
            <div className="border-b border-stone-400 pb-12 mx-8" />
            <p className="text-xs text-stone-600 mt-2">ผู้อนุมัติ / Approved by</p>
            <p className="text-xs text-stone-500">ชื่อผู้อนุมัติ</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-[var(--doc-primary)] text-white py-2 text-center">
        <p className="text-[10px] text-stone-400">
          {co?.companyName || '-'} | {co?.phone || '-'} | {co?.email || '-'}
        </p>
      </div>
    </div>
  );
}

/** Build placeholder output/input tax data from project pricing */
function buildPlaceholderData(project: ProjectData): { outputEntries: TaxEntry[]; inputEntries: TaxEntry[] } {
  const quotationData = project.quotationData || [];

  // Output VAT: selling price to customer
  let totalSellingPrice = 0;
  quotationData.forEach(item => {
    totalSellingPrice += getProjectCustomerAmount(project, item);
  });

  const operationFee = project.operatingCost !== undefined
    ? Math.round(project.operatingCost)
    : Math.round(totalSellingPrice * 0.05);

  const sellingTotal = totalSellingPrice + operationFee;
  const taxOptions = project.taxData || { includeVat: true, includeWithholding: false, vatRate: 0.07, withholdingRate: 0.03 };
  const outputTax = calculateTax(sellingTotal, { ...taxOptions, includeVat: true, includeWithholding: false });

  const outputEntries: TaxEntry[] = sellingTotal > 0 ? [{
    no: 1,
    invoiceNumber: project.taxData?.taxInvoiceNumber || `TAX-${new Date().getFullYear() + 543}-001`,
    name: project.owner || '(ลูกค้า)',
    goodsValue: Math.round(sellingTotal),
    taxAmount: Math.round(outputTax.vatAmount),
  }] : [];

  // Input VAT: material costs (purchases)
  const categoryMaterials: Record<string, { description: string; materialCost: number }> = {};
  quotationData.forEach(item => {
    const mainCat = item.no.split('.')[0];
    if (!categoryMaterials[mainCat]) {
      const catItem = quotationData.find(q => q.no === mainCat);
      categoryMaterials[mainCat] = {
        description: catItem?.description || `หมวด ${mainCat}`,
        materialCost: 0,
      };
    }
    categoryMaterials[mainCat].materialCost += (Number(item.unitPrice) || 0) * (Number(item.quantity) || 0);
  });

  const inputEntries: TaxEntry[] = [];
  let entryNo = 1;
  Object.entries(categoryMaterials).forEach(([, data]) => {
    if (data.materialCost <= 0) return;
    const amount = Math.round(data.materialCost);
    inputEntries.push({
      no: entryNo++,
      invoiceNumber: `ITX-${new Date().getFullYear() + 543}-${String(entryNo).padStart(3, '0')}`,
      name: `ผู้ขาย ${data.description}`,
      goodsValue: amount,
      taxAmount: Math.round(amount * 0.07),
    });
  });

  return { outputEntries, inputEntries };
}
