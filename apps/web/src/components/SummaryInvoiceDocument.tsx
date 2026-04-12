import React from 'react';
import { FileText, Building2, Pencil, Eye } from 'lucide-react';
import { findBankByName } from '../utils/thaiBankData';
import { getCurrentThaiDate } from '../utils/dateUtils';
import { ProjectData } from '../utils/projectData';
import { loadCompanyProfile, type CompanyProfile } from '../utils/companyProfile';

interface SummaryInvoiceDocumentProps {
  project?: ProjectData;
  companyProfile?: CompanyProfile;
}

export function SummaryInvoiceDocument({ project, companyProfile }: SummaryInvoiceDocumentProps) {
  const [isEditing, setIsEditing] = React.useState(false);
  const co = companyProfile || loadCompanyProfile();

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('th-TH', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // รายการยอดที่จะส่งเบิก — เริ่มว่างเปล่า ผู้ใช้เพิ่มเองผ่าน contentEditable
  const invoiceItems: { no: number; project: string; description: string; amount: number; toBill: boolean }[] = [];

  const totalAmount = invoiceItems.filter(item => item.toBill).reduce((sum, item) => sum + item.amount, 0);
  const grandTotal = invoiceItems.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div id="summary-invoice-doc" className="max-w-[210mm] mx-auto bg-white print:shadow-none">
      {(!co?.companyName && !co?.phone) && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mx-8 mt-4 print:hidden">
          <p className="text-sm text-amber-800">กรุณากรอกข้อมูลบริษัทในหน้า "ข้อมูลบริษัท" ก่อนพิมพ์เอกสาร</p>
        </div>
      )}
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 8mm 10mm;
          }
          body {
            margin: 0;
            padding: 0;
          }
          #summary-invoice-doc {
            max-width: 100%;
            transform: scale(0.87);
            transform-origin: top center;
          }
          .print\\:page-break-inside-avoid {
            page-break-inside: avoid;
            break-inside: avoid;
          }
        }
      `}</style>

      {/* Header */}
      <div className="bg-[var(--doc-primary)] text-white px-6 py-5 print:page-break-inside-avoid">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            {co?.logoUrl ? (
              <img src={co.logoUrl} alt="Logo" className="w-10 h-10 rounded object-contain bg-white/10" />
            ) : (
              <Building2 className="w-8 h-8" />
            )}
            <div>
              <h1 className="text-3xl tracking-wider mb-1">{co?.companyName?.toUpperCase() || '-'}</h1>
              <p className="text-xs text-stone-300">{co?.tagline || 'Interior Design & Construction'}</p>
            </div>
            <div className="border-l border-stone-600 pl-4 ml-2">
              <div className="flex items-center gap-2 mb-1">
                <FileText className="w-5 h-5" />
                <h2 className="text-xl tracking-wide">ใบวางบิลสรุปยอดรวม</h2>
              </div>
              <p className="text-[10px] text-stone-400">SUMMARY INVOICE</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-stone-400 mb-1">Invoice No.</p>
            <p className="text-base mb-3">INV-SUM-2568-001</p>
            <p className="text-[10px] text-stone-400 mb-1">Date</p>
            <p className="text-sm">{getCurrentThaiDate()}</p>
          </div>
        </div>
      </div>

      {/* Edit / View toggle */}
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

      {/* Main Content */}
      <div
        contentEditable={isEditing}
        suppressContentEditableWarning
        className={`${isEditing ? '[&_p]:outline-none [&_p]:hover:bg-amber-50/40 [&_p]:focus:bg-amber-50/60 [&_td]:outline-none [&_td]:hover:bg-amber-50/40 [&_td]:focus:bg-amber-50/60 [&_p]:rounded [&_td]:rounded [&_p]:transition-colors [&_td]:transition-colors' : ''}`}
      >
      {/* Company Info */}
      <div className="px-6 py-4 bg-stone-50 border-b border-stone-200 print:page-break-inside-avoid">
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-white rounded-lg p-3 border border-stone-200">
            <h2 className="text-[10px] text-stone-800 mb-2 pb-1.5 border-b border-stone-200">ข้อมูลโครงการ / Project Info</h2>
            <div className="space-y-1 text-xs">
              <div className="flex gap-3">
                <span className="text-stone-500 w-24 text-xs">โครงการ:</span>
                <span className="text-stone-800">{project?.name || '-'}</span>
              </div>
              <div className="flex gap-3">
                <span className="text-stone-500 w-24 text-xs">ประเภท:</span>
                <span className="text-stone-800">ใบวางบิลสรุปยอดรวม</span>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-3 border border-stone-200">
            <h2 className="text-[10px] text-stone-800 mb-2 pb-1.5 border-b border-stone-200">ข้อมูลผู้วางบิล / Biller Info</h2>
            <div className="space-y-1 text-xs">
              <div className="flex gap-3">
                <span className="text-stone-500 w-20 text-xs">บริษัท:</span>
                <span className="text-stone-800">{co?.companyName || '-'}</span>
              </div>
              <div className="flex gap-3">
                <span className="text-stone-500 w-20 text-xs">อีเมล:</span>
                <span className="text-xs text-stone-800">{co?.email || '-'}</span>
              </div>
              <div className="flex gap-3">
                <span className="text-stone-500 w-20 text-xs">โทรศัพท์:</span>
                <span className="text-stone-800">{co?.phone || '-'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Invoice Items Table */}
      <div className="px-6 py-4">
        <div className="mb-3">
          <h3 className="text-xs text-stone-800 mb-2 font-medium">รายการงวดที่ส่งเบิก / Invoice Items</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-[var(--doc-primary)] text-white">
                <th className="border border-stone-700 px-3 py-2.5 text-center w-12">ลำดับ</th>
                <th className="border border-stone-700 px-3 py-2.5 text-left">โครงการ</th>
                <th className="border border-stone-700 px-3 py-2.5 text-left">รายละเอียดงวด</th>
                <th className="border border-stone-700 px-3 py-2.5 text-right w-32">จำนวนเงิน (บาท)</th>
              </tr>
            </thead>
            <tbody>
              {invoiceItems.map((item, index) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-stone-50'}>
                  <td className="border border-stone-200 px-3 py-3 text-center text-stone-500 font-medium">
                    {item.no}
                  </td>
                  <td className="border border-stone-200 px-3 py-3 text-stone-800">
                    {item.project}
                  </td>
                  <td className="border border-stone-200 px-3 py-3 text-stone-500">
                    {item.description}
                  </td>
                  <td className="border border-stone-200 px-3 py-3 text-right text-stone-800 font-medium">
                    {formatCurrency(item.amount)}
                  </td>
                </tr>
              ))}
              {/* Total Row */}
              <tr className="bg-stone-100 border-t-2 border-stone-400">
                <td colSpan={3} className="border border-stone-200 px-3 py-3 text-right font-bold text-stone-800">
                  ยอดรวมทั้งสิ้น (Total):
                </td>
                <td className="border border-stone-200 px-3 py-3 text-right font-bold text-stone-800 text-base">
                  {formatCurrency(grandTotal)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Summary and Payment Info Grid */}
        <div className="mt-4 grid grid-cols-2 gap-4 print:page-break-inside-avoid">
          {/* Summary Box */}
          <div>
            <div className="bg-stone-50 p-4 rounded-lg border border-stone-200">
              <h3 className="text-xs text-stone-800 mb-3 font-medium">สรุปยอดชำระ / Payment Summary</h3>
              <div className="space-y-2 text-xs">
                {invoiceItems.length === 0 && (
                  <p className="text-stone-400 text-center py-2">ยังไม่มีรายการ</p>
                )}
                {invoiceItems.map((item, i) => (
                  <div key={i} className={`flex justify-between pb-2 ${i < invoiceItems.length - 1 ? 'border-b border-stone-200' : 'border-b-2 border-stone-400'}`}>
                    <span className="text-stone-500">{item.project}:</span>
                    <span className={item.toBill ? 'text-stone-800' : 'text-stone-400 line-through'}>{formatCurrency(item.amount)} บาท</span>
                  </div>
                ))}
                <div className="flex justify-between pt-2 bg-[var(--doc-primary)] text-white -mx-4 -mb-4 px-4 py-3 rounded-b-lg">
                  <span className="text-sm font-medium">ยอดชำระครั้งนี้:</span>
                  <span className="text-lg font-bold">{formatCurrency(totalAmount)} บาท</span>
                </div>
              </div>
            </div>

            {/* Note */}
            <div className="mt-3 bg-stone-50 border border-stone-200 rounded-lg p-3">
              <p className="text-[10px] mb-1.5 text-stone-800 font-medium">
                <FileText className="w-3 h-3 inline mr-1" />
                หมายเหตุ / Notes:
              </p>
              <ul className="text-stone-500 space-y-0.5 list-disc list-inside text-[10px]">
                <li>กรุณาโอนเงินตามยอดรวมที่ระบุ</li>
                <li>แจ้งหลักฐานการโอนหลังชำระเงิน</li>
              </ul>
            </div>
          </div>

          {/* QR Code Section */}
          <div className="space-y-3">
            <div className="bg-white border border-stone-200 rounded-lg overflow-hidden">
              <div className="bg-[var(--doc-primary)] px-3 py-2">
                <p className="text-xs text-white font-medium">สแกนชำระเงิน / QR Payment</p>
              </div>
              <div className="p-3 text-center">
                <div className="w-32 h-32 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center mx-auto mb-2">
                  <p className="text-xs text-slate-400 text-center px-2">QR Code<br/>PromptPay</p>
                </div>
                <p className="text-[10px] text-stone-500 font-medium">สแกน QR เพื่อชำระเงิน</p>
                <p className="text-sm text-stone-800 font-bold mt-1">{formatCurrency(totalAmount)} บาท</p>
              </div>
            </div>

            {/* Bank Account Section */}
            <div className="bg-white border border-stone-200 rounded-lg overflow-hidden">
              <div className="bg-stone-100 px-3 py-2 border-b border-stone-200">
                <p className="text-xs text-stone-700 font-medium">บัญชีธนาคาร / Bank Account</p>
              </div>
              <div className="p-3 space-y-1.5 text-xs">
                <div className="flex justify-between items-center bg-stone-50 px-2 py-1.5 rounded">
                  <span className="text-stone-500 text-[10px]">ธนาคาร:</span>
                  <span className="flex items-center gap-1.5 text-stone-800 font-medium">
                    {(() => { const bankInfo = findBankByName(co?.bankAccounts?.[0]?.bankName || ""); return bankInfo ? <img src={bankInfo.icon} alt={bankInfo.symbol} className="h-5 w-5 rounded" /> : null; })()}
                    {co?.bankAccounts?.[0]?.bankName || '-'}
                  </span>
                </div>
                <div className="flex justify-between items-center bg-stone-50 px-2 py-1.5 rounded">
                  <span className="text-stone-500 text-[10px]">เลขที่บัญชี:</span>
                  <span className="text-stone-800 font-bold">{co?.bankAccounts?.[0]?.accountNumber || '-'}</span>
                </div>
                <div className="flex justify-between items-center bg-stone-50 px-2 py-1.5 rounded">
                  <span className="text-stone-500 text-[10px]">ชื่อบัญชี:</span>
                  <span className="text-stone-800 text-xs font-medium">{co?.bankAccounts?.[0]?.accountName || '-'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Signature Section */}
      <div className="px-6 py-4 bg-stone-50 border-t border-stone-200 print:page-break-inside-avoid">
        <div className="grid grid-cols-2 gap-10">
          <div className="text-center">
            <p className="text-[10px] text-stone-500 mb-6">ผู้วางบิล / Billed By</p>
            <div className="mb-2">
              <div className="w-24 h-12 border-b border-slate-400" />
            </div>
            <div className="border-b border-stone-400 mb-1 pb-0.5 mx-8">
              <span className="invisible text-[10px]">Signature</span>
            </div>
            <p className="text-xs text-stone-800 font-medium">( {co?.signatureName || '-'} )</p>
            <p className="text-[10px] text-stone-500 mt-1">{getCurrentThaiDate()}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-stone-500 mb-6">ผู้รับบิล / Received By</p>
            <div className="mb-2">
              <span className="invisible text-[10px] h-10 block">Signature placeholder</span>
            </div>
            <div className="border-b border-stone-400 mb-1 pb-0.5 mx-8">
              <span className="invisible text-[10px]">Signature</span>
            </div>
            <p className="text-xs text-stone-800">( ...................................... )</p>
            <p className="text-[10px] text-stone-500 mt-1">วันที่ ........................</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-[var(--doc-primary)] text-white py-2 text-center">
        <p className="text-[10px] text-stone-300">{co?.companyName?.toUpperCase() || '-'} &bull; {co?.tagline || '-'} &bull; {co?.email || '-'} &bull; {co?.phone || '-'}</p>
      </div>
      </div>

      {/* Print Button */}
      <div className="p-6 bg-white border-t border-stone-200 print:hidden">
        <button
          onClick={() => { setIsEditing(false); window.print(); }}
          className="w-full bg-[var(--doc-primary)] hover:bg-[var(--doc-primary-hover)] text-white py-3 px-6 rounded-lg transition-all text-sm uppercase tracking-wide font-medium"
        >
          พิมพ์ใบวางบิลสรุปยอดรวม / Print Summary Invoice
        </button>
      </div>
    </div>
  );
}
