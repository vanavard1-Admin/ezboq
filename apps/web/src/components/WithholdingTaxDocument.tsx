import React from 'react';
import { Pencil, Eye, Building2, ShieldCheck, User } from 'lucide-react';
import { ProjectData, getProjectCustomerAmount } from '../utils/projectData';
import { getCurrentThaiDate } from '../utils/dateUtils';
import { loadCompanyProfile, type CompanyProfile } from '../utils/companyProfile';
import { calculateTax, numberToThaiText } from '../utils/taxUtils';

interface WithholdingTaxDocumentProps {
  project: ProjectData;
  companyProfile?: CompanyProfile;
}

export function WithholdingTaxDocument({ project, companyProfile }: WithholdingTaxDocumentProps) {
  const [isEditing, setIsEditing] = React.useState(false);
  const co = companyProfile || loadCompanyProfile();
  const quotationData = project.quotationData;

  // คำนวณราคาขาย
  const categoryTotals: { [key: string]: number } = {};
  quotationData.forEach(item => {
    const mainCategory = item.no.split('.')[0];
    if (!categoryTotals[mainCategory]) categoryTotals[mainCategory] = 0;
    categoryTotals[mainCategory] += getProjectCustomerAmount(project, item);
  });

  const subtotal = Object.values(categoryTotals).reduce((sum, v) => sum + v, 0);
  const operationFee = project.operatingCost !== undefined ? Math.round(project.operatingCost) : Math.round(subtotal * 0.05);
  const sellingTotal = subtotal + operationFee;

  // Tax: WHT 3%
  const taxOptions = project.taxData || { includeVat: true, includeWithholding: true, vatRate: 0.07, withholdingRate: 0.03 };
  const tax = calculateTax(sellingTotal, { ...taxOptions, includeVat: false, includeWithholding: true });

  const docNumber = project.taxData?.whtCertNumber || `WHT-${new Date().getFullYear() + 543}-001`;
  const fmt = (n: number) => n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const now = new Date();
  const thaiMonths = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];

  return (
    <div id="withholding-tax-doc" className="max-w-[210mm] mx-auto bg-white print:shadow-none">
      {/* Company validation warning */}
      {(!co?.companyName && !co?.phone) && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mx-8 mt-4 print:hidden">
          <p className="text-sm text-amber-800">กรุณากรอกข้อมูลบริษัทในหน้า "ข้อมูลบริษัท" ก่อนพิมพ์เอกสาร</p>
        </div>
      )}

      <style>{`
        @media print {
          @page { size: A4; margin: 10mm 12mm; }
          body { margin: 0; padding: 0; }
          body * { visibility: hidden; }
          #withholding-tax-doc, #withholding-tax-doc * { visibility: visible; }
          #withholding-tax-doc { position: absolute; top: 0; left: 0; width: 100%; max-width: 100%; transform: scale(0.87); transform-origin: top center; }
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
                <ShieldCheck className="w-5 h-5" />
                <h2 className="text-lg tracking-wide leading-tight">หนังสือรับรองการหักภาษี<br/>ณ ที่จ่าย</h2>
              </div>
              <p className="text-xs text-stone-400">WITHHOLDING TAX CERTIFICATE</p>
            </div>
          </div>
          <div className="text-right">
            <div className="px-5 py-3">
              <p className="text-xs text-stone-400 mb-1">เลขที่ / Certificate No.</p>
              <p className="text-base">{docNumber}</p>
              <p className="text-xs text-stone-400 mt-3 mb-1">วันที่ / Date</p>
              <p className="text-base">{now.getDate()} {thaiMonths[now.getMonth()]} {now.getFullYear() + 543}</p>
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
        {/* Official subheader */}
        <div className="px-6 pt-4 pb-2 text-center print:page-break-inside-avoid">
          <p className="text-xs text-stone-500">ตามมาตรา 50 ทวิ แห่งประมวลรัษฎากร</p>
        </div>

        {/* Payer & Payee Info - 2 columns */}
        <div className="px-6 py-3 grid grid-cols-2 gap-0 print:page-break-inside-avoid">
          {/* ผู้จ่ายเงิน (ลูกค้า) */}
          <div className="border-2 border-stone-800 p-4 rounded-l-lg">
            <h3 className="text-xs font-bold mb-3 flex items-center gap-1.5 text-stone-800 uppercase tracking-wider">
              <User className="w-3.5 h-3.5" />
              ผู้จ่ายเงิน (ผู้หักภาษี ณ ที่จ่าย)
            </h3>
            <div className="space-y-2.5 text-sm">
              <div>
                <span className="text-xs text-stone-400 block mb-0.5">ชื่อ</span>
                <span className="font-medium text-stone-800 border-b border-dotted border-stone-300 pb-0.5 block">
                  {project.owner || '..................................................'}
                </span>
              </div>
              <div>
                <span className="text-xs text-stone-400 block mb-0.5">เลขประจำตัวผู้เสียภาษีอากร</span>
                <span className="text-stone-800 border-b border-dotted border-stone-300 pb-0.5 block">
                  {'..................................................'}
                </span>
              </div>
              <div>
                <span className="text-xs text-stone-400 block mb-0.5">ที่อยู่</span>
                <span className="text-stone-800 border-b border-dotted border-stone-300 pb-0.5 block">
                  {project.address || '..................................................'}
                </span>
              </div>
            </div>
          </div>

          {/* ผู้รับเงิน (บริษัท) */}
          <div className="border-2 border-l-0 border-stone-800 p-4 rounded-r-lg">
            <h3 className="text-xs font-bold mb-3 flex items-center gap-1.5 text-stone-800 uppercase tracking-wider">
              <Building2 className="w-3.5 h-3.5" />
              ผู้รับเงิน (ผู้ถูกหักภาษี ณ ที่จ่าย)
            </h3>
            <div className="space-y-2.5 text-sm">
              <div>
                <span className="text-xs text-stone-400 block mb-0.5">ชื่อ</span>
                <span className="font-medium text-stone-800 border-b border-dotted border-stone-300 pb-0.5 block">
                  {co.companyName || co.companyNameTh || '..................................................'}
                </span>
              </div>
              <div>
                <span className="text-xs text-stone-400 block mb-0.5">เลขประจำตัวผู้เสียภาษีอากร</span>
                <span className="text-stone-800 border-b border-dotted border-stone-300 pb-0.5 block">
                  {co.taxId || '..................................................'}
                </span>
              </div>
              <div>
                <span className="text-xs text-stone-400 block mb-0.5">ที่อยู่</span>
                <span className="text-stone-800 border-b border-dotted border-stone-300 pb-0.5 block">
                  {co.address || '..................................................'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Income Type Table */}
        <div className="px-6 pt-3 pb-4 print:page-break-inside-avoid">
          <h3 className="text-xs font-bold mb-2 text-stone-700 uppercase tracking-wider">ประเภทเงินได้ที่จ่ายและอัตราภาษีหัก ณ ที่จ่าย</h3>
          <table className="w-full text-sm border-2 border-stone-800">
            <thead>
              <tr className="bg-[var(--doc-primary)] text-white">
                <th className="border border-stone-700 px-3 py-2.5 text-left text-xs">ประเภทเงินได้</th>
                <th className="border border-stone-700 px-3 py-2.5 text-center w-24 text-xs">วัน เดือน ปี<br/>ที่จ่าย</th>
                <th className="border border-stone-700 px-3 py-2.5 text-right w-32 text-xs">จำนวนเงิน<br/>ที่จ่าย</th>
                <th className="border border-stone-700 px-3 py-2.5 text-right w-32 text-xs">ภาษีที่<br/>หักไว้</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-stone-600 px-3 py-3">
                  <div className="space-y-1">
                    <p className="font-medium text-stone-800">6. ค่าจ้างทำของ (ค่ารับเหมาก่อสร้าง)</p>
                    <p className="text-xs text-stone-500 pl-4">
                      ตามมาตรา 40(7)/(8) — จ้างรับเหมาก่อสร้าง/ตกแต่งภายใน
                    </p>
                    <p className="text-xs text-stone-400 pl-4">
                      โครงการ: {project.name}
                    </p>
                  </div>
                </td>
                <td className="border border-stone-600 px-3 py-3 text-center text-sm text-stone-700">
                  {getCurrentThaiDate()}
                </td>
                <td className="border border-stone-600 px-3 py-3 text-right font-medium text-stone-800">
                  {fmt(tax.subtotalBeforeVat)}
                </td>
                <td className="border border-stone-600 px-3 py-3 text-right font-medium text-red-700">
                  {fmt(tax.withholdingAmount)}
                </td>
              </tr>
              <tr className="bg-stone-50">
                <td className="border border-stone-600 px-3 py-2.5 text-right font-bold text-stone-700" colSpan={2}>
                  รวมเงินที่จ่ายและภาษีที่หักรวมทั้งสิ้น
                </td>
                <td className="border border-stone-600 px-3 py-2.5 text-right font-bold text-stone-800">
                  {fmt(tax.subtotalBeforeVat)}
                </td>
                <td className="border border-stone-600 px-3 py-2.5 text-right font-bold text-red-700">
                  {fmt(tax.withholdingAmount)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Amount in Thai text */}
        <div className="mx-6 mb-4 p-3 bg-[var(--doc-accent-light)] border border-stone-200 rounded-lg print:page-break-inside-avoid">
          <div className="text-sm">
            <span className="text-stone-500 text-xs">รวมเงินภาษีที่หัก (ตัวอักษร): </span>
            <span className="font-medium text-stone-800">{numberToThaiText(tax.withholdingAmount)}</span>
          </div>
        </div>

        {/* WHT Rate & Payment Info - side by side */}
        <div className="px-6 mb-4 grid grid-cols-2 gap-4 print:page-break-inside-avoid">
          <div className="p-3 border border-stone-200 rounded-lg">
            <h3 className="text-xs font-bold mb-2 text-stone-700">อัตราภาษีหัก ณ ที่จ่าย</h3>
            <div className="flex items-center gap-2 text-sm">
              <span className="inline-flex items-center justify-center w-4 h-4 border-2 border-stone-800 rounded-sm text-xs font-bold leading-none">&#10003;</span>
              <span className="text-stone-700">หัก ณ ที่จ่าย ร้อยละ <strong>{(tax.withholdingRate * 100).toFixed(0)}</strong></span>
            </div>
            <p className="text-xs text-stone-400 mt-1.5 pl-6">
              แบบ ภ.ง.ด.3 (บุคคลธรรมดา) / ภ.ง.ด.53 (นิติบุคคล)
            </p>
          </div>
          <div className="p-3 border border-stone-200 rounded-lg">
            <h3 className="text-xs font-bold mb-2 text-stone-700">เงินที่จ่ายเป็น</h3>
            <div className="grid grid-cols-2 gap-y-1.5 gap-x-3 text-sm">
              <label className="flex items-center gap-1.5">
                <span className="inline-flex items-center justify-center w-4 h-4 border-2 border-stone-800 rounded-sm" />
                <span className="text-stone-700">เงินสด</span>
              </label>
              <label className="flex items-center gap-1.5">
                <span className="inline-flex items-center justify-center w-4 h-4 border-2 border-stone-800 rounded-sm text-xs font-bold leading-none">&#10003;</span>
                <span className="text-stone-700">โอนผ่านธนาคาร</span>
              </label>
              <label className="flex items-center gap-1.5">
                <span className="inline-flex items-center justify-center w-4 h-4 border-2 border-stone-800 rounded-sm" />
                <span className="text-stone-700">เช็ค</span>
              </label>
              <label className="flex items-center gap-1.5">
                <span className="inline-flex items-center justify-center w-4 h-4 border-2 border-stone-800 rounded-sm" />
                <span className="text-stone-700">อื่นๆ</span>
              </label>
            </div>
          </div>
        </div>

        {/* Certification */}
        <div className="mx-6 p-4 bg-stone-50 border-2 border-stone-300 rounded-lg mb-4 print:page-break-inside-avoid">
          <p className="text-sm text-stone-700 text-center">
            ข้าพเจ้าขอรับรองว่ารายการที่แจ้งไว้ข้างต้นนี้ถูกต้องตรงกับความจริงทุกประการ
          </p>
          <p className="text-xs text-stone-500 text-center mt-2">
            ออกหนังสือรับรองฉบับนี้ เมื่อวันที่ {now.getDate()} เดือน{thaiMonths[now.getMonth()]} พ.ศ. {now.getFullYear() + 543}
          </p>
        </div>

        {/* Signature */}
        <div className="px-6 pt-2 pb-6 grid grid-cols-2 gap-8 print:page-break-inside-avoid">
          <div className="text-center">
            <div className="border-b border-stone-400 pb-12 mx-8" />
            <p className="text-xs text-stone-600 mt-2">ลงชื่อ ผู้จ่ายเงิน (ผู้หักภาษี ณ ที่จ่าย)</p>
            <p className="text-xs text-stone-500">{project.owner || '-'}</p>
          </div>
          <div className="text-center">
            {co?.signatureUrl ? (
              <div className="mb-1">
                <img src={co.signatureUrl} alt="Signature" className="h-10 mx-auto" />
              </div>
            ) : (
              <div className="border-b border-stone-400 pb-12 mx-8" />
            )}
            <p className="text-xs text-stone-600 mt-2">ลงชื่อ ผู้รับเงิน (ผู้ถูกหักภาษี ณ ที่จ่าย)</p>
            <p className="text-xs text-stone-500">{co.companyName || co.signatureName || '-'}</p>
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
