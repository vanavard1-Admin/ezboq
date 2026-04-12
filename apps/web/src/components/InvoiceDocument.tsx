import React from 'react';
import { FileText, Building2, EyeOff, Eye, Pencil } from 'lucide-react';
import { findBankByName } from '../utils/thaiBankData';
import {
  ProjectData,
  getProjectCustomerAmount,
  getProjectDiscountAmount,
  getProjectOperatingCost,
  getProjectPaymentSchedule,
  prepareProjectDocuments,
} from '../utils/projectData';
import { getCurrentThaiDate } from '../utils/dateUtils';
import { loadCompanyProfile, type CompanyProfile } from '../utils/companyProfile';
import generatePayload from 'promptpay-qr';
import QRCode from 'qrcode';

interface InvoiceCategory {
  no: string;
  category: string;
  amount: number;
}

interface InvoiceDocumentProps {
  project: ProjectData;
  companyProfile?: CompanyProfile;
}

export function InvoiceDocument({ project, companyProfile }: InvoiceDocumentProps) {
  const [hidePrice, setHidePrice] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);
  const [qrDataUrl, setQrDataUrl] = React.useState<string | null>(null);
  const preparedProject = React.useMemo(() => prepareProjectDocuments(project), [project]);
  const co = companyProfile || loadCompanyProfile();
  const quotationData = preparedProject.quotationData;
  const thaiYear = new Date().getFullYear() + 543;
  const invoiceNumber = `INV-${thaiYear}-001`;

  const categoryTotals: { [key: string]: number } = {};
  quotationData.forEach(item => {
    const mainCategory = item.no.split('.')[0];
    if (!categoryTotals[mainCategory]) {
      categoryTotals[mainCategory] = 0;
    }
    categoryTotals[mainCategory] += getProjectCustomerAmount(preparedProject, item);
  });

  // Dynamic categories based on project
  const uniqueCategories = new Set<string>();
  quotationData.forEach(item => {
    const mainCategory = item.no.split('.')[0];
    if (mainCategory && !item.no.includes('.')) {
      uniqueCategories.add(mainCategory);
    }
  });

  const invoiceCategories: InvoiceCategory[] = Array.from(uniqueCategories)
    .sort()
    .map(catNo => {
      const categoryItem = quotationData.find(item => item.no === catNo);
      return {
        no: catNo,
        category: categoryItem?.description || `หมวด ${catNo}`,
        amount: categoryTotals[catNo] || 0
      };
    });

  const subtotalBeforeDiscount = invoiceCategories.reduce((sum, item) => sum + item.amount, 0);
  const discountAmount = getProjectDiscountAmount(preparedProject);
  const subtotal = Math.max(0, subtotalBeforeDiscount - discountAmount);
  const operationFee = getProjectOperatingCost(preparedProject, subtotal);
  const grandTotal = subtotal + operationFee;

  // ถ้าเป็น Phase 4 ใช้ราคาตายตัว
  let displaySubtotal = subtotal;
  let displayOperationFee = operationFee;
  let displayGrandTotal = grandTotal;
  
  if (preparedProject.name.includes('Phase 4')) {
    displaySubtotal = 600000; // ราคาตายตัว
    displayOperationFee = 0; // ไม่มีค่าดำเนินการ
    displayGrandTotal = 600000;
  }

  const installments = getProjectPaymentSchedule(preparedProject, displayGrandTotal);

  // Auto-generate PromptPay QR from company profile
  React.useEffect(() => {
    const ppId = co?.promptPayId?.replace(/[-\s]/g, '');
    if (!ppId) { setQrDataUrl(null); return; }
    try {
      const payload = generatePayload(ppId, { amount: displayGrandTotal });
      QRCode.toDataURL(payload, { width: 256, margin: 1, errorCorrectionLevel: 'M' })
        .then(setQrDataUrl)
        .catch(() => setQrDataUrl(null));
    } catch { setQrDataUrl(null); }
  }, [co?.promptPayId, displayGrandTotal]);

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('th-TH', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div id="invoice-doc" className="max-w-[210mm] mx-auto bg-white print:shadow-none">
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
          #invoice-doc {
            max-width: 100%;
            transform: scale(0.87);
            transform-origin: top center;
          }
          .print\\:page-break-inside-avoid {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .print\\:page-break-before {
            page-break-before: always;
            break-before: always;
          }
        }
      `}</style>

      {/* Header */}
      <div className="bg-[var(--doc-primary)] text-white px-6 py-5 print:page-break-inside-avoid relative overflow-hidden">
        
        {/* Toggle Hide Price Button - Print Hidden */}
        <div className="print:hidden absolute top-3 left-1/2 transform -translate-x-1/2 z-10">
          <button
            onClick={() => setHidePrice(!hidePrice)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
              hidePrice 
                ? 'bg-red-600 hover:bg-red-700 text-white' 
                : 'bg-white/10 hover:bg-white/20 text-white border border-white/30'
            }`}
          >
            {hidePrice ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            <span className="text-xs">{hidePrice ? 'ราคาถูกซ่อน' : 'แสดงราคา'}</span>
          </button>
        </div>

        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            {co?.logoUrl ? (
              <img src={co.logoUrl} alt="Logo" className="w-12 h-12 rounded-lg object-contain bg-white/10 p-1" />
            ) : (
              <div className="bg-white/10 p-3 rounded-lg border border-white/20">
                <Building2 className="w-8 h-8" />
              </div>
            )}
            <div>
              <h1 className="text-3xl tracking-wider mb-1">{co?.companyName?.toUpperCase() || '-'}</h1>
              <p className="text-xs text-stone-400">{co?.tagline || 'Interior Design & Construction'}</p>
            </div>
            <div className="border-l border-white/30 pl-4 ml-2">
              <div className="flex items-center gap-2 mb-1">
                <FileText className="w-5 h-5" />
                <h2 className="text-xl tracking-wide">ใบวางบิล</h2>
              </div>
              <p className="text-[10px] text-stone-400">INVOICE</p>
            </div>
          </div>
          <div className="text-right">
            <div className="bg-white/10 px-4 py-3 rounded-lg border border-white/20">
              <p className="text-[10px] text-stone-400 mb-1">Invoice No.</p>
              <p className="text-base mb-3">{invoiceNumber}</p>
              <p className="text-[10px] text-stone-400 mb-1">Date</p>
              <p className="text-sm">{getCurrentThaiDate()}</p>
            </div>
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
      {/* Project Info */}
      <div className="px-6 py-4 bg-stone-50 border-b border-stone-200 print:page-break-inside-avoid">
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-white rounded-lg p-3 border border-stone-200">
            <h2 className="text-[10px] text-stone-500 mb-2 pb-1.5 border-b border-stone-200">ข้อมูลโครงการ / Project Info</h2>
            <div className="space-y-1 text-xs">
              <div className="flex gap-3">
                <span className="text-stone-500 w-20 text-xs">โครงการ:</span>
                <span className="text-stone-800">{preparedProject.name}</span>
              </div>
              {preparedProject.address && (
                <div className="flex gap-3">
                  <span className="text-stone-500 w-20 text-xs">ที่อยู่:</span>
                  <span className="text-xs text-stone-700">{preparedProject.address}</span>
                </div>
              )}
              {preparedProject.phone && preparedProject.phone !== '-' && (
                <div className="flex gap-3">
                  <span className="text-stone-500 w-20 text-xs">โทรศัพท์:</span>
                  <span className="text-stone-700">{preparedProject.phone}</span>
                </div>
              )}
              {preparedProject.owner && preparedProject.owner !== '-' && (
                <div className="flex gap-3">
                  <span className="text-stone-500 w-20 text-xs">Owner:</span>
                  <span className="text-stone-700">{preparedProject.owner}</span>
                </div>
              )}
            </div>
          </div>
          <div className="bg-white rounded-lg p-3 border border-stone-200">
            <h2 className="text-[10px] text-stone-500 mb-2 pb-1.5 border-b border-stone-200">ข้อมูลผู้วางบิล / Biller Info</h2>
            <div className="space-y-1 text-xs">
              <div className="flex gap-3">
                <span className="text-stone-500 w-20 text-xs">บริษัท:</span>
                <span className="text-stone-800">{co?.companyName || '-'}</span>
              </div>
              <div className="flex gap-3">
                <span className="text-stone-500 w-20 text-xs">อีเมล:</span>
                <span className="text-xs text-stone-700">{co?.email || '-'}</span>
              </div>
              <div className="flex gap-3">
                <span className="text-stone-500 w-20 text-xs">โทรศัพท์:</span>
                <span className="text-stone-700">{co?.phone || '-'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Invoice Table */}
      <div className="px-6 py-4">
        <div className="mb-3">
          <h3 className="text-xs text-stone-800 mb-2">รายการค่าใช้จ่าย / Item List</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-[var(--doc-primary)] text-white">
                <th className="border border-stone-700 px-3 py-2 text-left w-14">ลำดับ</th>
                <th className="border border-stone-700 px-3 py-2 text-left">หมวดงาน</th>
                <th className="border border-stone-700 px-3 py-2 text-right w-32">จำนวนเงิน (บาท)</th>
              </tr>
            </thead>
            <tbody>
              {invoiceCategories.map((item, index) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-stone-50'}>
                  <td className="border border-stone-200 px-3 py-2 text-center text-stone-500">
                    {item.no}
                  </td>
                  <td className="border border-stone-200 px-3 py-2 text-stone-800">
                    {item.category}
                  </td>
                  <td className="border border-stone-200 px-3 py-2 text-right text-stone-800">
                    {hidePrice ? '*****' : formatCurrency(item.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary and Payment Info Grid */}
        <div className="mt-4 grid grid-cols-2 gap-4 print:page-break-inside-avoid">
          {/* Summary */}
          <div>
            <div className="bg-stone-50 p-3 rounded-lg space-y-2 text-xs border border-stone-200">
              <div className="flex justify-between pb-1.5 border-b border-stone-200">
                <span className="text-stone-500">รวมก่อนหักส่วนลด:</span>
                <span className="text-stone-800">{hidePrice ? '*****' : formatCurrency(preparedProject.name.includes('Phase 4') ? displaySubtotal : subtotalBeforeDiscount)} บาท</span>
              </div>
              {discountAmount > 0 && !preparedProject.name.includes('Phase 4') && (
                <div className="flex justify-between pb-2 border-b border-stone-300 text-rose-700">
                  <span>{preparedProject.discountConfig?.label || 'ส่วนลด'}</span>
                  <span>{hidePrice ? '*****' : `-${formatCurrency(discountAmount)} บาท`}</span>
                </div>
              )}
              {displayOperationFee > 0 && (
                <div className="flex justify-between pb-2 border-b border-stone-300">
                  <span className="text-stone-500">ค่าดำเนินการ:</span>
                  <span className="text-stone-800">{hidePrice ? '*****' : formatCurrency(displayOperationFee)} บาท</span>
                </div>
              )}
              <div className="flex justify-between pt-1.5 bg-[var(--doc-primary)] text-white -mx-3 -mb-3 px-3 py-2.5 rounded-b-lg">
                <span className="text-sm">ยอดชำระทั้งหมด:</span>
                <span className="text-base">{hidePrice ? '*****' : formatCurrency(displayGrandTotal)} บาท</span>
              </div>
            </div>

            {/* Installments */}
            <div className="mt-3 bg-white border border-stone-200 rounded-lg overflow-hidden">
              <div className="bg-[var(--doc-primary)] px-3 py-2 border-b border-stone-700">
                <p className="text-xs text-white">แผนการชำระเงิน / Payment Schedule</p>
              </div>
              <div className="p-3">
                <table className="w-full text-[10px]">
                  <thead>
                    <tr className="border-b border-stone-200">
                      <th className="text-left py-1.5 text-stone-500 text-[10px]">งวด</th>
                      <th className="text-right py-1.5 text-stone-500 text-[10px]">%</th>
                      <th className="text-right py-1.5 text-stone-500 text-[10px]">จำนวนเงิน</th>
                    </tr>
                  </thead>
                  <tbody>
                    {installments.map((inst) => {
                      const rowClass = 'border-b border-stone-200';
                      const textClass = 'text-stone-800';
                      const amountClass = 'text-stone-800';

                      return (
                        <tr key={inst.no} className={rowClass}>
                          <td className={`py-1.5 ${textClass}`}>{inst.description}</td>
                          <td className="text-right text-stone-500">{inst.percentage > 0 ? `${inst.percentage}%` : ''}</td>
                          <td className={`text-right ${amountClass}`}>
                            {hidePrice ? '*****' : formatCurrency(inst.amount)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* QR Code Section */}
          <div className="space-y-3">
            <div className="bg-white border border-stone-200 rounded-lg overflow-hidden">
              <div className="bg-[var(--doc-primary)] px-3 py-2 border-b border-stone-700">
                <p className="text-xs text-white">สแกนชำระเงิน / QR Payment</p>
              </div>
              <div className="p-3 text-center">
                {co?.promptPayQrUrl ? (
                  <img src={co.promptPayQrUrl} alt="PromptPay QR" className="w-32 h-32 object-contain mx-auto mb-2 rounded-lg" />
                ) : qrDataUrl ? (
                  <img src={qrDataUrl} alt="PromptPay QR" className="w-32 h-32 mx-auto mb-2 rounded-lg" />
                ) : (
                  <div className="w-32 h-32 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center mx-auto mb-2">
                    <p className="text-xs text-slate-400 text-center px-2">QR Code<br/>PromptPay</p>
                  </div>
                )}
                <p className="text-[10px] text-stone-500">
                  {co?.promptPayId
                    ? `PromptPay: ${co.promptPayId} · ฿${formatCurrency(displayGrandTotal)}`
                    : 'สแกน QR เพื่อชำระเงิน'}
                </p>
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
                  <span className="flex items-center gap-1.5 text-stone-800">
                    {(() => { const bankInfo = findBankByName(co?.bankAccounts?.[0]?.bankName || ""); return bankInfo ? <img src={bankInfo.icon} alt={bankInfo.symbol} className="h-5 w-5 rounded" /> : null; })()}
                    {co?.bankAccounts?.[0]?.bankName || '-'}
                  </span>
                </div>
                <div className="flex justify-between items-center bg-stone-50 px-2 py-1.5 rounded">
                  <span className="text-stone-500 text-[10px]">เลขที่บัญชี:</span>
                  <span className="text-stone-800 font-medium">{co?.bankAccounts?.[0]?.accountNumber || '-'}</span>
                </div>
                <div className="flex justify-between items-center bg-stone-50 px-2 py-1.5 rounded">
                  <span className="text-stone-500 text-[10px]">ชื่อบัญชี:</span>
                  <span className="text-stone-800 text-xs">{co?.bankAccounts?.[0]?.accountName || '-'}</span>
                </div>
              </div>
            </div>

            <div className="bg-stone-50 border border-stone-200 rounded-lg p-2.5">
              <p className="text-[10px] mb-1">
                <FileText className="w-3 h-3 inline mr-1" />
                <span className="text-xs text-stone-800">หมายเหตุสำคัญ</span>
              </p>
              <ul className="text-stone-500 space-y-0.5 list-disc list-inside text-[10px]">
                <li>กรุณาโอนเงินตามงวดที่กำหนด</li>
                <li>แจ้งหลักฐานการโอนทุกครั้ง</li>
              </ul>
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
            <p className="text-xs text-stone-800">( {co?.signatureName || '-'} )</p>
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

      </div>
      {/* End Main Content */}

      {/* Footer */}
      <div className="bg-[var(--doc-primary)] text-white py-2 text-center">
        <p className="text-[10px] text-stone-400">{co?.companyName?.toUpperCase() || '-'} • Your Trusted Interior Design Partner • {co?.email || '-'} • {co?.phone || '-'}</p>
      </div>

      {/* Print Button */}
      <div className="p-6 bg-white border-t border-stone-200 print:hidden">
        <button
          onClick={() => { setIsEditing(false); window.print(); }}
          className="w-full bg-[var(--doc-primary)] hover:bg-[var(--doc-primary-hover)] text-white py-3 px-6 rounded-lg transition-all text-sm uppercase tracking-wide"
        >
          พิมพ์เอกสาร / Print Document
        </button>
      </div>
    </div>
  );
}
