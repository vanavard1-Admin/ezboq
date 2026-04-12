import React from 'react';
import { Building2, CreditCard } from 'lucide-react';
import { ProjectData } from '../utils/projectData';
import { getCurrentThaiDate } from '../utils/dateUtils';
import { loadCompanyProfile, type CompanyProfile } from '../utils/companyProfile';
import { numberToThaiText } from '../utils/taxUtils';

interface PaymentVoucherDocumentProps {
  project: ProjectData;
  companyProfile?: CompanyProfile;
  payeeName: string;
  amount: number;
  vatAmount?: number;
  whtAmount?: number;
  netAmount: number;
  paymentMethod: string;
  description: string;
  voucherNumber?: string;
}

export function PaymentVoucherDocument({
  project,
  companyProfile,
  payeeName,
  amount,
  vatAmount,
  whtAmount,
  netAmount,
  paymentMethod,
  description,
  voucherNumber,
}: PaymentVoucherDocumentProps) {
  const co = companyProfile || loadCompanyProfile();

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('th-TH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const docNumber = voucherNumber || `PV-${new Date().getFullYear() + 543}-001`;
  const thaiDate = getCurrentThaiDate();
  const netAmountText = numberToThaiText(netAmount);

  const paymentMethodLabel = (method: string): string => {
    switch (method) {
      case 'transfer': return 'โอนเงิน';
      case 'cash': return 'เงินสด';
      case 'cheque': return 'เช็ค';
      default: return method;
    }
  };

  return (
    <div className="max-w-[210mm] mx-auto bg-white shadow-xl print:shadow-none overflow-hidden">
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
        }
      `}</style>

      {/* Header */}
      <div className="bg-[var(--doc-primary)] text-white px-8 py-6">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-4">
            {co?.logoUrl ? (
              <img src={co.logoUrl} alt="Logo" className="w-12 h-12 rounded-lg object-contain bg-white/10 p-1" />
            ) : (
              <Building2 className="w-7 h-7" />
            )}
            <div>
              <h1 className="text-2xl tracking-wider mb-1">{co?.companyName?.toUpperCase() || '-'}</h1>
              <p className="text-xs text-stone-300">{co?.tagline || 'Interior Design & Construction'}</p>
            </div>
            <div className="border-l border-stone-600 pl-4 ml-2">
              <div className="flex items-center gap-2 mb-1">
                <CreditCard className="w-5 h-5" />
                <h2 className="text-xl tracking-wide">ใบสำคัญจ่าย</h2>
              </div>
              <p className="text-[10px] text-stone-400">PAYMENT VOUCHER</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-stone-400 mb-1">Voucher No.</p>
            <p className="text-base mb-3">{docNumber}</p>
            <p className="text-[10px] text-stone-400 mb-1">Date</p>
            <p className="text-sm">{thaiDate}</p>
          </div>
        </div>
      </div>

      {/* Company & Payee Info */}
      <div className="px-8 py-4 grid grid-cols-2 gap-6 border-b border-stone-200 bg-stone-50">
        <div>
          <h3 className="text-xs text-stone-800 mb-2 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5" />
            <span>ข้อมูลบริษัท / Company Info</span>
          </h3>
          <div className="space-y-0.5 text-xs">
            <p className="text-stone-800">{co?.companyName || '-'}</p>
            <p className="text-stone-500">{co?.phone || '-'}</p>
            <p className="text-stone-500">{co?.email || '-'}</p>
          </div>
        </div>
        <div>
          <h3 className="text-xs text-stone-800 mb-2 flex items-center gap-1.5">
            <CreditCard className="w-3.5 h-3.5" />
            <span>จ่ายให้ / Pay To</span>
          </h3>
          <div className="space-y-0.5 text-xs">
            <p className="text-stone-800">ชื่อผู้รับเงิน: {payeeName}</p>
            <p className="text-stone-500">โครงการ: {project.name}</p>
            <p className="text-stone-500">วิธีชำระเงิน: {paymentMethodLabel(paymentMethod)}</p>
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="px-8 py-6">
        <div className="border border-stone-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200">
                <th className="text-left px-4 py-2 text-stone-800 font-medium">รายการ / Description</th>
                <th className="text-right px-4 py-2 text-stone-800 font-medium w-40">จำนวนเงิน (บาท)</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-stone-200">
                <td className="px-4 py-3 text-stone-800">{description}</td>
                <td className="px-4 py-3 text-right text-stone-800 font-mono">{formatCurrency(amount)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="mt-4 bg-stone-50 border border-stone-200 rounded-lg p-4">
          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="text-stone-500">ยอดรวมก่อนภาษี / Subtotal:</span>
              <span className="text-stone-800 font-mono">{formatCurrency(amount)}</span>
            </div>
            {vatAmount !== undefined && vatAmount > 0 && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-stone-500">ภาษีมูลค่าเพิ่ม 7% / VAT 7%:</span>
                <span className="text-stone-800 font-mono">{formatCurrency(vatAmount)}</span>
              </div>
            )}
            {whtAmount !== undefined && whtAmount > 0 && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-stone-500">หัก ณ ที่จ่าย / WHT Deduction:</span>
                <span className="text-red-600 font-mono">-{formatCurrency(whtAmount)}</span>
              </div>
            )}
            <div className="border-t border-stone-300 pt-2 mt-2">
              <div className="flex justify-between items-center">
                <span className="text-stone-500">ยอดสุทธิ / Net Amount:</span>
                <span className="text-2xl text-stone-800 font-mono">{formatCurrency(netAmount)} บาท</span>
              </div>
            </div>
          </div>

          <div className="mt-3 bg-white rounded-lg px-4 py-2 border border-stone-200">
            <div className="flex items-start gap-2">
              <span className="text-sm text-stone-500 whitespace-nowrap">จำนวนเงิน (ตัวอักษร):</span>
              <span className="text-sm text-stone-800">{netAmountText}</span>
            </div>
          </div>
        </div>

        {/* Payment Details */}
        <div className="mt-4 border border-stone-200 rounded-lg overflow-hidden">
          <div className="bg-stone-50 px-4 py-2 border-b border-stone-200">
            <h3 className="text-xs text-stone-800 font-medium">รายละเอียดการจ่ายเงิน / Payment Details</h3>
          </div>
          <div className="p-4">
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b border-stone-200">
                  <td className="py-2 text-stone-500 w-1/3">วิธีชำระเงิน / Payment Method</td>
                  <td className="py-2 text-stone-800">{paymentMethodLabel(paymentMethod)}</td>
                </tr>
                <tr className="border-b border-stone-200">
                  <td className="py-2 text-stone-500">ผู้รับเงิน / Payee</td>
                  <td className="py-2 text-stone-800">{payeeName}</td>
                </tr>
                <tr>
                  <td className="py-2 text-stone-500">โครงการ / Project</td>
                  <td className="py-2 text-stone-800">{project.name}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Signature Section */}
      <div className="px-8 py-6 bg-stone-50 border-t border-stone-200">
        <div className="grid grid-cols-3 gap-8">
          <div className="text-center">
            <p className="text-xs text-stone-500 mb-8">ผู้จัดทำ (Prepared By)</p>
            <div className="border-b border-stone-400 mb-1 pb-0.5 mx-4">
              <span className="invisible text-xs">Signature</span>
            </div>
            <p className="text-xs text-stone-800 mt-2">( ...................................... )</p>
            <p className="text-xs text-stone-500 mt-1">วันที่ ........................</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-stone-500 mb-8">ผู้ตรวจสอบ (Verified By)</p>
            <div className="border-b border-stone-400 mb-1 pb-0.5 mx-4">
              <span className="invisible text-xs">Signature</span>
            </div>
            <p className="text-xs text-stone-800 mt-2">( ...................................... )</p>
            <p className="text-xs text-stone-500 mt-1">วันที่ ........................</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-stone-500 mb-8">ผู้อนุมัติ (Approved By)</p>
            <div className="border-b border-stone-400 mb-1 pb-0.5 mx-4">
              <span className="invisible text-xs">Signature</span>
            </div>
            <p className="text-xs text-stone-800 mt-2">( ...................................... )</p>
            <p className="text-xs text-stone-500 mt-1">วันที่ ........................</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-[var(--doc-primary)] text-white py-2 text-center">
        <p className="text-[10px] text-stone-300">
          {co?.companyName?.toUpperCase() || '-'} &bull; {co?.tagline || '-'} &bull; {co?.email || '-'} &bull; {co?.phone || '-'}
        </p>
      </div>

      {/* Print Button */}
      <div className="p-4 bg-white border-t border-stone-200 print:hidden">
        <button
          onClick={() => window.print()}
          className="w-full bg-[var(--doc-primary)] hover:bg-[var(--doc-primary-hover)] text-white py-2 px-6 rounded-lg transition-all text-sm"
        >
          พิมพ์เอกสาร / Print Document
        </button>
      </div>
    </div>
  );
}
