import React from 'react';
import { Building2, FileText } from 'lucide-react';
import { ProjectData } from '../utils/projectData';
import { getCurrentThaiDate } from '../utils/dateUtils';
import { loadCompanyProfile, type CompanyProfile } from '../utils/companyProfile';
import { numberToThaiText } from '../utils/taxUtils';

interface ExpenseVoucherDocumentProps {
  project: ProjectData;
  companyProfile?: CompanyProfile;
  contractorName: string;
  categoryLabel: string;
  installmentNo: number;
  amount: number;
  description?: string;
}

function generateVoucherNumber(projectName: string, no: number): string {
  const initials = projectName
    .split(/[\s-]+/)
    .filter((w) => w.length > 0)
    .map((w) => w[0].toUpperCase())
    .join('')
    .slice(0, 4);
  return `EV-${initials}-${String(no).padStart(3, '0')}`;
}

export function ExpenseVoucherDocument({
  project,
  companyProfile,
  contractorName,
  categoryLabel,
  installmentNo,
  amount,
  description,
}: ExpenseVoucherDocumentProps) {
  const co = companyProfile || loadCompanyProfile();

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('th-TH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const voucherNumber = generateVoucherNumber(project.name, installmentNo);
  const thaiDate = getCurrentThaiDate();
  const amountText = numberToThaiText(amount);

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
                <FileText className="w-5 h-5" />
                <h2 className="text-xl tracking-wide">ใบเบิก</h2>
              </div>
              <p className="text-[10px] text-stone-400">EXPENSE VOUCHER</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-stone-400 mb-1">Voucher No.</p>
            <p className="text-base mb-3">{voucherNumber}</p>
            <p className="text-[10px] text-stone-400 mb-1">Date</p>
            <p className="text-sm">{thaiDate}</p>
          </div>
        </div>
      </div>

      {/* Company & Contractor Info */}
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
            <FileText className="w-3.5 h-3.5" />
            <span>ข้อมูลผู้เบิก / Claimant Info</span>
          </h3>
          <div className="space-y-0.5 text-xs">
            <p className="text-stone-800">ชื่อผู้รับเหมา: {contractorName}</p>
            <p className="text-stone-500">หมวดงาน: {categoryLabel}</p>
            <p className="text-stone-500">โครงการ: {project.name}</p>
            <p className="text-stone-500">งวดที่: {installmentNo}</p>
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
                <td className="px-4 py-3 text-stone-800">
                  {description || `ค่างาน${categoryLabel} - งวดที่ ${installmentNo}`}
                </td>
                <td className="px-4 py-3 text-right text-stone-800 font-mono">
                  {formatCurrency(amount)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Total */}
        <div className="mt-4 bg-stone-50 border border-stone-200 rounded-lg p-4">
          <div className="flex justify-between items-center mb-3">
            <span className="text-stone-500">รวมเงินทั้งสิ้น / Total:</span>
            <span className="text-2xl text-stone-800 font-mono">{formatCurrency(amount)} บาท</span>
          </div>
          <div className="bg-white rounded-lg px-4 py-2 border border-stone-200">
            <div className="flex items-start gap-2">
              <span className="text-sm text-stone-500 whitespace-nowrap">จำนวนเงิน (ตัวอักษร):</span>
              <span className="text-sm text-stone-800">{amountText}</span>
            </div>
          </div>
        </div>

        {/* Note */}
        <div className="mt-4 p-3 bg-stone-50 border border-stone-200 rounded-lg">
          <p className="text-xs text-stone-500">
            <span className="font-medium text-stone-800">หมายเหตุ:</span>{' '}
            เอกสารนี้ใช้ประกอบการเบิกจ่ายเงินงวดงาน
          </p>
        </div>
      </div>

      {/* Signature Section */}
      <div className="px-8 py-6 bg-stone-50 border-t border-stone-200">
        <div className="grid grid-cols-3 gap-8">
          <div className="text-center">
            <p className="text-xs text-stone-500 mb-8">ผู้เบิก (Claimant)</p>
            <div className="border-b border-stone-400 mb-1 pb-0.5 mx-4">
              <span className="invisible text-xs">Signature</span>
            </div>
            <p className="text-xs text-stone-800 mt-2">( ...................................... )</p>
            <p className="text-xs text-stone-500 mt-1">วันที่ ........................</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-stone-500 mb-8">ผู้อนุมัติ (Approver)</p>
            <div className="border-b border-stone-400 mb-1 pb-0.5 mx-4">
              <span className="invisible text-xs">Signature</span>
            </div>
            <p className="text-xs text-stone-800 mt-2">( ...................................... )</p>
            <p className="text-xs text-stone-500 mt-1">วันที่ ........................</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-stone-500 mb-8">ผู้จ่าย (Payer)</p>
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
