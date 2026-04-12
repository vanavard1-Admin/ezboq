import React from 'react';
import { Pencil, Eye, Building2, Mail, Phone, MapPin, Receipt } from 'lucide-react';
import { ProjectData, getProjectCustomerAmount } from '../utils/projectData';
import { getCurrentThaiDate } from '../utils/dateUtils';
import { loadCompanyProfile, type CompanyProfile } from '../utils/companyProfile';
import { calculateTax, numberToThaiText } from '../utils/taxUtils';

interface VatInvoiceDocumentProps {
  project: ProjectData;
  companyProfile?: CompanyProfile;
}

export function VatInvoiceDocument({ project, companyProfile }: VatInvoiceDocumentProps) {
  const [isEditing, setIsEditing] = React.useState(false);
  const co = companyProfile || loadCompanyProfile();
  const quotationData = project.quotationData;

  const categoryTotals: { [key: string]: number } = {};
  quotationData.forEach(item => {
    const mainCategory = item.no.split('.')[0];
    if (!categoryTotals[mainCategory]) categoryTotals[mainCategory] = 0;
    categoryTotals[mainCategory] += getProjectCustomerAmount(project, item);
  });

  // Dynamic categories
  const uniqueCategories = new Set<string>();
  quotationData.forEach(item => {
    const mainCategory = item.no.split('.')[0];
    if (mainCategory && !item.no.includes('.')) {
      uniqueCategories.add(mainCategory);
    }
  });

  const invoiceCategories = Array.from(uniqueCategories).sort().map(catNo => {
    const categoryItem = quotationData.find(item => item.no === catNo);
    return {
      no: catNo,
      category: categoryItem?.description || `หมวด ${catNo}`,
      amount: Math.round(categoryTotals[catNo] || 0),
    };
  });

  const subtotal = invoiceCategories.reduce((sum, item) => sum + item.amount, 0);
  const operationFee = project.operatingCost !== undefined ? Math.round(project.operatingCost) : Math.round(subtotal * 0.05);
  const sellingTotal = subtotal + operationFee;

  // Tax calculation
  const taxOptions = project.taxData || { includeVat: true, includeWithholding: false, vatRate: 0.07, withholdingRate: 0.03 };
  const tax = calculateTax(sellingTotal, { ...taxOptions, includeVat: true, includeWithholding: false });

  const docNumber = project.taxData?.taxInvoiceNumber || `TAX-${new Date().getFullYear() + 543}-001`;

  const fmt = (n: number) => n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div id="vat-invoice-doc" className="max-w-[210mm] mx-auto bg-white print:shadow-none">
      {/* Company validation warning */}
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
          #vat-invoice-doc, #vat-invoice-doc * { visibility: visible; }
          #vat-invoice-doc { position: absolute; top: 0; left: 0; width: 100%; max-width: 100%; transform: scale(0.87); transform-origin: top center; }
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
                <Receipt className="w-5 h-5" />
                <h2 className="text-xl tracking-wide">ใบกำกับภาษี</h2>
              </div>
              <p className="text-xs text-stone-400">TAX INVOICE</p>
            </div>
          </div>
          <div className="text-right">
            <div className="px-5 py-3">
              <p className="text-xs text-stone-400 mb-1">เลขที่เอกสาร / Document No.</p>
              <p className="text-base">{docNumber}</p>
              <p className="text-xs text-stone-400 mt-3 mb-1">วันที่ / Date</p>
              <p className="text-base">{getCurrentThaiDate()}</p>
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
        {/* Company & Customer Info */}
        <div className="px-6 py-4 grid grid-cols-2 gap-6 border-b border-stone-200 bg-stone-50 print:page-break-inside-avoid">
          <div>
            <h3 className="text-xs text-stone-800 mb-2 flex items-center gap-1.5 font-semibold">
              <Building2 className="w-3.5 h-3.5" />
              <span>ผู้ออกใบกำกับภาษี / Issuer</span>
            </h3>
            <div className="space-y-1 text-xs">
              <p className="text-stone-800 font-medium">{co?.companyName || '-'}</p>
              {co?.companyNameTh && <p className="text-stone-500">{co.companyNameTh}</p>}
              {co?.address && (
                <div className="flex items-start gap-1.5">
                  <MapPin className="w-3 h-3 mt-0.5 text-stone-400 flex-shrink-0" />
                  <span className="text-stone-500">{co.address}</span>
                </div>
              )}
              <div className="flex items-center gap-3">
                {co?.phone && (
                  <span className="flex items-center gap-1 text-stone-500">
                    <Phone className="w-3 h-3 text-stone-400" />{co.phone}
                  </span>
                )}
                {co?.email && (
                  <span className="flex items-center gap-1 text-stone-500">
                    <Mail className="w-3 h-3 text-stone-400" />{co.email}
                  </span>
                )}
              </div>
              {co?.taxId && (
                <p className="text-stone-700 font-medium mt-1">
                  เลขประจำตัวผู้เสียภาษี: {co.taxId}
                </p>
              )}
            </div>
          </div>
          <div className="border-l border-stone-200 pl-6">
            <h3 className="text-xs text-stone-800 mb-2 flex items-center gap-1.5 font-semibold">
              <Building2 className="w-3.5 h-3.5" />
              <span>ผู้ซื้อ / Customer</span>
            </h3>
            <div className="space-y-1 text-xs">
              <p className="text-stone-800 font-medium">{project.owner || '-'}</p>
              {project.address && project.address !== '-' && (
                <div className="flex items-start gap-1.5">
                  <MapPin className="w-3 h-3 mt-0.5 text-stone-400 flex-shrink-0" />
                  <span className="text-stone-500">{project.address}</span>
                </div>
              )}
              {project.phone && project.phone !== '-' && (
                <span className="flex items-center gap-1 text-stone-500">
                  <Phone className="w-3 h-3 text-stone-400" />{project.phone}
                </span>
              )}
              <div className="mt-1.5 pt-1.5 border-t border-stone-200">
                <p className="text-stone-500">โครงการ: <span className="text-stone-700 font-medium">{project.name}</span></p>
                {project.templateArea && (
                  <p className="text-stone-500">พื้นที่: {project.templateArea} ตร.ม.</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="px-6 pt-5 pb-4 print:page-break-inside-avoid">
          <table className="w-full mb-4 text-sm">
            <thead>
              <tr className="bg-[var(--doc-primary)] text-white">
                <th className="px-3 py-2.5 text-left w-12 text-xs">ลำดับ</th>
                <th className="px-3 py-2.5 text-left text-xs">รายการ / Description</th>
                <th className="px-3 py-2.5 text-right w-36 text-xs">จำนวนเงิน (บาท)</th>
              </tr>
            </thead>
            <tbody>
              {invoiceCategories.map((cat, idx) => (
                <tr key={cat.no} className={`border-b border-stone-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-stone-50/50'}`}>
                  <td className="px-3 py-2.5 text-center text-stone-500">{idx + 1}</td>
                  <td className="px-3 py-2.5 text-stone-800">{cat.category}</td>
                  <td className="px-3 py-2.5 text-right font-medium text-stone-800">{fmt(cat.amount)}</td>
                </tr>
              ))}
              {operationFee > 0 && (
                <tr className="border-b border-stone-100 bg-stone-50/50">
                  <td className="px-3 py-2.5 text-center text-stone-500">{invoiceCategories.length + 1}</td>
                  <td className="px-3 py-2.5 text-stone-800">ค่าดำเนินการ (Operating Fee 5%)</td>
                  <td className="px-3 py-2.5 text-right font-medium text-stone-800">{fmt(operationFee)}</td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Summary */}
          <div className="max-w-xs ml-auto space-y-1.5 mt-4">
            <div className="flex justify-between text-sm py-1">
              <span className="text-stone-500">รวมค่าบริการ</span>
              <span className="font-medium text-stone-800">{fmt(sellingTotal)}</span>
            </div>
            <div className="flex justify-between text-sm py-1">
              <span className="text-stone-500">ภาษีมูลค่าเพิ่ม (VAT {(tax.vatRate * 100).toFixed(0)}%)</span>
              <span className="font-medium text-stone-800">{fmt(tax.vatAmount)}</span>
            </div>
            <div className="flex justify-between pt-1.5 bg-[var(--doc-primary)] text-white -mx-3 -mb-3 px-3 py-2.5 rounded-b-lg">
              <span className="font-bold">ยอดรวมทั้งสิ้น (รวม VAT)</span>
              <span className="font-bold">{fmt(tax.totalWithVat)}</span>
            </div>
          </div>
          <div className="max-w-xs ml-auto mt-4">
            <p className="text-xs text-stone-500 text-right">
              ({numberToThaiText(tax.totalWithVat)})
            </p>
          </div>
        </div>

        {/* Notes */}
        <div className="mx-6 mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg print:page-break-inside-avoid">
          <p className="text-xs text-amber-800">
            <span className="font-semibold">หมายเหตุ:</span> ใบกำกับภาษีนี้ออกเพื่อแสดงรายการค่าบริการและภาษีมูลค่าเพิ่ม
            ตามประมวลรัษฎากร มาตรา 86/4
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
            <p className="text-xs text-stone-600 mt-2">ผู้รับบริการ / Customer</p>
            <p className="text-xs text-stone-500">{project.owner || '-'}</p>
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
