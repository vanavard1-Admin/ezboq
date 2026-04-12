import React from 'react';
import { Building2, Mail, Phone, MapPin, Pencil, Eye, Receipt } from 'lucide-react';
import { ProjectData } from '../utils/projectData';
import { getCurrentThaiDate } from '../utils/dateUtils';
import { loadCompanyProfile, type CompanyProfile } from '../utils/companyProfile';

interface InputTaxInvoiceItem {
  description: string;
  amount: number;
  vatAmount: number;
}

interface InputTaxInvoiceDocumentProps {
  project: ProjectData;
  companyProfile?: CompanyProfile;
  supplierName?: string;
  taxInvoiceNumber?: string;
  items?: InputTaxInvoiceItem[];
}

export function InputTaxInvoiceDocument({
  project,
  companyProfile,
  supplierName,
  taxInvoiceNumber,
  items,
}: InputTaxInvoiceDocumentProps) {
  const [isEditing, setIsEditing] = React.useState(false);
  const co = companyProfile || loadCompanyProfile();

  const fmt = (n: number) => n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Use provided items or build placeholder from project data
  const invoiceItems: InputTaxInvoiceItem[] = items && items.length > 0
    ? items
    : buildPlaceholderItems(project);

  const subtotal = invoiceItems.reduce((sum, item) => sum + item.amount, 0);
  const totalVat = invoiceItems.reduce((sum, item) => sum + item.vatAmount, 0);
  const grandTotal = subtotal + totalVat;

  const docNumber = taxInvoiceNumber || `ITX-${new Date().getFullYear() + 543}-001`;

  return (
    <div id="input-tax-invoice-doc" className="max-w-[210mm] mx-auto bg-white print:shadow-none">
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
          #input-tax-invoice-doc, #input-tax-invoice-doc * { visibility: visible; }
          #input-tax-invoice-doc { position: absolute; top: 0; left: 0; width: 100%; max-width: 100%; transform: scale(0.87); transform-origin: top center; }
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
                <h2 className="text-xl tracking-wide">ใบกำกับภาษีซื้อ</h2>
              </div>
              <p className="text-xs text-stone-400">INPUT TAX INVOICE</p>
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
        {/* Supplier & Buyer Info */}
        <div className="px-6 py-4 grid grid-cols-2 gap-6 border-b border-stone-200 bg-stone-50 print:page-break-inside-avoid">
          <div>
            <h3 className="text-xs text-stone-800 mb-2 flex items-center gap-1.5 font-semibold">
              <Building2 className="w-3.5 h-3.5" />
              <span>ผู้ขาย / Supplier</span>
            </h3>
            <div className="space-y-1 text-xs">
              <p className="text-stone-800 font-medium">{supplierName || '(ระบุชื่อผู้ขาย)'}</p>
            </div>
          </div>
          <div className="border-l border-stone-200 pl-6">
            <h3 className="text-xs text-stone-800 mb-2 flex items-center gap-1.5 font-semibold">
              <Building2 className="w-3.5 h-3.5" />
              <span>ผู้ซื้อ / Buyer</span>
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
              <div className="mt-1.5 pt-1.5 border-t border-stone-200">
                <p className="text-stone-500">โครงการ: <span className="text-stone-700 font-medium">{project.name}</span></p>
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
                <th className="px-3 py-2.5 text-right w-32 text-xs">จำนวนเงิน (บาท)</th>
                <th className="px-3 py-2.5 text-right w-28 text-xs">VAT (บาท)</th>
              </tr>
            </thead>
            <tbody>
              {invoiceItems.map((item, idx) => (
                <tr key={idx} className={`border-b border-stone-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-stone-50/50'}`}>
                  <td className="px-3 py-2.5 text-center text-stone-500">{idx + 1}</td>
                  <td className="px-3 py-2.5 text-stone-800">{item.description}</td>
                  <td className="px-3 py-2.5 text-right font-medium text-stone-800">{fmt(item.amount)}</td>
                  <td className="px-3 py-2.5 text-right text-stone-600">{fmt(item.vatAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Summary */}
          <div className="max-w-xs ml-auto space-y-1.5 mt-4">
            <div className="flex justify-between text-sm py-1">
              <span className="text-stone-500">รวมมูลค่าสินค้า/บริการ</span>
              <span className="font-medium text-stone-800">{fmt(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm py-1">
              <span className="text-stone-500">ภาษีมูลค่าเพิ่ม (VAT 7%)</span>
              <span className="font-medium text-stone-800">{fmt(totalVat)}</span>
            </div>
            <div className="flex justify-between pt-1.5 bg-[var(--doc-primary)] text-white -mx-3 -mb-3 px-3 py-2.5 rounded-b-lg">
              <span className="font-bold">ยอดรวมทั้งสิ้น</span>
              <span className="font-bold">{fmt(grandTotal)}</span>
            </div>
          </div>
        </div>

        {/* Note */}
        <div className="mx-6 mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg print:page-break-inside-avoid">
          <p className="text-xs text-amber-800">
            <span className="font-semibold">หมายเหตุ:</span> เอกสารสำหรับบันทึกภาษีซื้อ
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
            <p className="text-xs text-stone-600 mt-2">ผู้บันทึก / Recorded by</p>
            <p className="text-xs text-stone-500">{co.signatureName || 'ชื่อผู้บันทึก'}</p>
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

/** Build placeholder items from project material costs */
function buildPlaceholderItems(project: ProjectData): InputTaxInvoiceItem[] {
  const items: InputTaxInvoiceItem[] = [];
  const quotationData = project.quotationData || [];

  const categoryTotals: Record<string, { description: string; materialCost: number }> = {};
  quotationData.forEach(item => {
    const mainCat = item.no.split('.')[0];
    if (!categoryTotals[mainCat]) {
      const catItem = quotationData.find(q => q.no === mainCat);
      categoryTotals[mainCat] = {
        description: catItem?.description || `หมวด ${mainCat}`,
        materialCost: 0,
      };
    }
    categoryTotals[mainCat].materialCost += (Number(item.unitPrice) || 0) * (Number(item.quantity) || 0);
  });

  Object.entries(categoryTotals).forEach(([_, data]) => {
    if (data.materialCost <= 0) return;
    const amount = Math.round(data.materialCost);
    items.push({
      description: data.description,
      amount,
      vatAmount: Math.round(amount * 0.07),
    });
  });

  return items;
}
