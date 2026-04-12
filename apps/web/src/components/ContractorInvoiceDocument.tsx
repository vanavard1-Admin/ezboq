import React from 'react';
import { Building2, Hammer, Pencil, Eye } from 'lucide-react';
import { ProjectData, type PaymentInstallmentConfig, type QuotationItem } from '../utils/projectData';
import { getCurrentThaiDate } from '../utils/dateUtils';
import { loadCompanyProfile, type CompanyProfile } from '../utils/companyProfile';

interface ContractorInvoiceDocumentProps {
  project: ProjectData;
  installmentNumber?: number; // เลือกงวดที่จะออกบิล (1, 2, หรือ 3)
  companyProfile?: CompanyProfile;
}

interface ContractorInstallmentLine {
  no: number;
  description: string;
  percentage: number;
  amount: number;
}

function getLineCost(item: Pick<QuotationItem, 'quantity' | 'unitPrice' | 'laborCost' | 'totalPrice'>): number {
  if (!item.quantity || item.quantity === '') return 0;
  const quantity = Number(item.quantity) || 0;

  if (item.totalPrice !== undefined && item.totalPrice !== null && item.totalPrice !== '') {
    return quantity * (Number(item.totalPrice) || 0);
  }

  return quantity * ((Number(item.unitPrice) || 0) + (Number(item.laborCost) || 0));
}

function buildContractorInstallments(totalCost: number, schedule?: PaymentInstallmentConfig[]) {
  if (totalCost <= 0) {
    return [];
  }

  if (schedule && schedule.length > 0) {
    return schedule.map((item, index) => {
      const amount = index === schedule.length - 1
        ? totalCost - schedule.slice(0, -1).reduce((sum, entry) => sum + Math.round(totalCost * (entry.percentage / 100)), 0)
        : Math.round(totalCost * (item.percentage / 100));

      return {
        no: item.no,
        description: item.description,
        percentage: item.percentage,
        amount,
      };
    });
  }

  const defaultPercentages = [40, 40, 20];
  return defaultPercentages.map((percentage, index) => ({
    no: index + 1,
    description: `งวดที่ ${index + 1}`,
    percentage,
    amount: index === defaultPercentages.length - 1
      ? totalCost - defaultPercentages.slice(0, -1).reduce((sum, value) => sum + Math.round(totalCost * (value / 100)), 0)
      : Math.round(totalCost * (percentage / 100)),
  }));
}

export function ContractorInvoiceDocument({ project, installmentNumber = 1, companyProfile }: ContractorInvoiceDocumentProps) {
  const [isEditing, setIsEditing] = React.useState(false);
  const co = companyProfile || loadCompanyProfile();

  // สำหรับ Phase 4: ราคาทุน 450,000 บาท แบ่งจ่าย 3 งวดๆ ละ 150,000 บาท
  const isPhase4 = project.name.includes('Phase 4');
  const totalCost = isPhase4
    ? 450000
    : typeof project.totalCost === 'number' && project.totalCost > 0
      ? project.totalCost
      : project.quotationData.reduce((sum, item) => sum + getLineCost(item), 0);
  const allInstallments: ContractorInstallmentLine[] = isPhase4
    ? [
        { no: 1, description: 'งวดที่ 1 - มัดจำ', percentage: 33.33, amount: 150000 },
        { no: 2, description: 'งวดที่ 2 - เข้าติดตั้ง', percentage: 33.33, amount: 150000 },
        { no: 3, description: 'งวดที่ 3 - ส่งงาน', percentage: 33.34, amount: 150000 },
      ]
    : buildContractorInstallments(totalCost, project.paymentSchedule);
  const currentInstallment = allInstallments.find((inst) => inst.no === installmentNumber) || allInstallments[0] || null;

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('th-TH', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div id="contractor-invoice-doc" className="max-w-[210mm] mx-auto bg-white print:shadow-none">
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
          #contractor-invoice-doc {
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
              <Building2 className="w-7 h-7" />
            )}
            <div>
              <h1 className="text-2xl tracking-wider mb-0.5">{co?.companyName?.toUpperCase() || '-'}</h1>
              <p className="text-xs text-stone-300">{co?.tagline || 'Interior Design & Construction'}</p>
            </div>
            <div className="border-l border-stone-600 pl-4 ml-2">
              <div className="flex items-center gap-2 mb-1">
                <Hammer className="w-5 h-5" />
                <h2 className="text-xl tracking-wide">ใบวางบิล (ผู้รับเหมา)</h2>
              </div>
              <p className="text-[10px] text-stone-400">CONTRACTOR INVOICE</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-stone-400 mb-1">Invoice No.</p>
            <p className="text-base mb-3">{`CINV-${new Date().getFullYear() + 543}-001`}</p>
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
      {/* Company & Contractor Info */}
      <div className="px-6 py-4 grid grid-cols-2 gap-6 border-b border-stone-200 bg-stone-50 print:page-break-inside-avoid">
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
            <Hammer className="w-3.5 h-3.5" />
            <span>ข้อมูลผู้รับเหมา / Contractor Info</span>
          </h3>
          <div className="space-y-0.5 text-xs">
            <p className="text-stone-800">ชื่อผู้รับเหมา: .......................................</p>
            <p className="text-stone-500">เบอร์โทร: ...........................................</p>
            <p className="text-stone-500">โครงการ: {project.name}</p>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="px-6 py-4">
        <h3 className="text-xs text-stone-800 mb-3">สรุปยอดชำระ / Payment Summary</h3>

        {currentInstallment && (
          <>
            {/* Current Installment Info */}
            <div className="bg-[var(--doc-primary)] text-white rounded-lg p-4 mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-stone-300">งวดที่ออกบิล:</span>
                <span className="text-2xl font-medium">{currentInstallment.description}</span>
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-stone-600">
                <span className="text-sm text-stone-300">จำนวนเงินงวดนี้:</span>
                <span className="text-3xl font-bold">{formatCurrency(currentInstallment.amount)} บาท</span>
              </div>
            </div>

            {/* Project Total Reference */}
            <div className="bg-stone-50 border border-stone-200 rounded-lg p-3 mb-4">
              <div className="flex justify-between items-center text-xs">
                <span className="text-stone-500">ราคาทุนรวมทั้งโครงการ:</span>
                <span className="text-stone-800">{formatCurrency(totalCost)} บาท</span>
              </div>
              <div className="flex justify-between items-center text-xs mt-1">
                <span className="text-stone-500">งวดที่:</span>
                <span className="text-stone-800">{currentInstallment.no} / {allInstallments.length} ({currentInstallment.percentage.toFixed(2)}%)</span>
              </div>
            </div>
          </>
        )}

        {/* Contractor Bank Account (ให้ช่างกรอก) */}
        <div className="bg-white border border-stone-200 rounded-lg p-4">
          <h3 className="text-xs text-stone-800 mb-3 flex items-center gap-2">
            <span>บัญชีธนาคารผู้รับเหมา (สำหรับรับเงิน) / Contractor Bank Account</span>
          </h3>
          <div className="space-y-2">
            <div className="flex gap-2">
              <span className="text-xs text-stone-500 w-24">ชื่อบัญชี:</span>
              <span className="text-xs text-stone-400 border-b border-dashed border-stone-300 flex-1">.............................................</span>
            </div>
            <div className="flex gap-2">
              <span className="text-xs text-stone-500 w-24">ธนาคาร:</span>
              <span className="text-xs text-stone-400 border-b border-dashed border-stone-300 flex-1">.............................................</span>
            </div>
            <div className="flex gap-2">
              <span className="text-xs text-stone-500 w-24">เลขที่บัญชี:</span>
              <span className="text-xs text-stone-400 border-b border-dashed border-stone-300 flex-1">.............................................</span>
            </div>
            <div className="flex gap-2">
              <span className="text-xs text-stone-500 w-24">ประเภท:</span>
              <span className="text-xs text-stone-400 border-b border-dashed border-stone-300 flex-1">.............................................</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="mt-4 p-3 bg-stone-50 border border-stone-200 rounded-lg">
          <p className="text-xs mb-1.5 text-stone-800">หมายเหตุ / Notes:</p>
          <ul className="text-xs text-stone-500 space-y-0.5 list-disc list-inside">
            <li>กรุณาแจ้งยอดโอนและแนบสลิปหลังจากชำระเงินทุกครั้ง</li>
            <li>การชำระเงินต้องทำภายใน 3 วันหลังจากส่งมอบงานตามงวดที่กำหนด</li>
            <li>กรณีชำระเงินล่าช้า จะมีการหักค่าปรับตามสัญญา</li>
            <li>เอกสารฉบับนี้เป็นใบวางบิลสำหรับผู้รับเหมา (ราคาทุน) - งวดที่ {currentInstallment?.no}</li>
          </ul>
        </div>
      </div>

      {/* Signature */}
      <div className="px-6 py-4 bg-stone-50 border-t border-stone-200 print:page-break-inside-avoid">
        <div className="grid grid-cols-2 gap-8">
          <div className="text-center">
            <p className="text-xs text-stone-500 mb-2">ผู้จัดทำ (Prepared By)</p>
            {co?.signatureUrl ? (
              <div className="mb-1">
                <img src={co.signatureUrl} alt="Signature" className="h-10 mx-auto" />
              </div>
            ) : (
              <div className="border-b border-stone-400 mb-1 pb-8">
                <span className="invisible text-xs">Signature</span>
              </div>
            )}
            <p className="text-xs text-stone-800">( {co?.signatureName || '-'} )</p>
            <p className="text-xs text-stone-500 mt-1">{getCurrentThaiDate()}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-stone-500 mb-8">ผู้รับเหมายืนยัน (Contractor Confirmed)</p>
            <div className="border-b border-stone-400 mb-1 pb-1">
              <span className="invisible text-xs">Signature</span>
            </div>
            <p className="text-xs text-stone-800">( ...................................... )</p>
            <p className="text-xs text-stone-500 mt-1">วันที่ ........................</p>
          </div>
        </div>
      </div>

      </div>
      {/* End Main Content */}

      {/* Footer */}
      <div className="bg-[var(--doc-primary)] text-white py-2 text-center">
        <p className="text-[10px] text-stone-300">{co?.companyName?.toUpperCase() || '-'} &bull; {co?.tagline || '-'} &bull; {co?.email || '-'} &bull; {co?.phone || '-'}</p>
      </div>

      {/* Print Button */}
      <div className="p-4 bg-white border-t border-stone-200 print:hidden">
        <button
          onClick={() => { setIsEditing(false); window.print(); }}
          className="w-full bg-[var(--doc-primary)] hover:bg-[var(--doc-primary-hover)] text-white py-2 px-6 rounded-lg transition-all text-sm"
        >
          พิมพ์เอกสาร / Print Document
        </button>
      </div>
    </div>
  );
}
