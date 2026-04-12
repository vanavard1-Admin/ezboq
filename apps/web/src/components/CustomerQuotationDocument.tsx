import React from 'react';
import { Building2, FileText, Pencil, Eye, Mail, MapPin, Phone } from 'lucide-react';
import {
  ProjectData,
  QuotationItem,
  getProjectCustomerAmount,
  getProjectCustomerSubtotal,
  getProjectCustomerSubtotalBeforeDiscount,
  getProjectCustomerUnitPrice,
  getProjectDiscountAmount,
  getProjectOperatingCost,
  prepareProjectDocuments,
} from '../utils/projectData';
import { getCurrentThaiDate } from '../utils/dateUtils';
import { loadCompanyProfile, type CompanyProfile } from '../utils/companyProfile';

interface CustomerQuotationDocumentProps {
  project: ProjectData;
  companyProfile?: CompanyProfile;
}

export function CustomerQuotationDocument({ project, companyProfile }: CustomerQuotationDocumentProps) {
  const [isEditing, setIsEditing] = React.useState(false);
  const preparedProject = React.useMemo(() => prepareProjectDocuments(project), [project]);
  const quotationData = preparedProject.quotationData;
  const co = companyProfile || loadCompanyProfile();
  const quotationNumber = `QT-${new Date().getFullYear() + 543}-001`;
  const customerName = preparedProject.owner && preparedProject.owner !== '-' ? preparedProject.owner : 'ลูกค้า';

  // Customer unit price = (unitPrice + laborCost) * markup
  const getCustomerUnitPrice = (item: QuotationItem): number => {
    return getProjectCustomerUnitPrice(preparedProject, item);
  };

  // Customer line total = qty * customerUnitPrice
  const calculateCustomerAmount = (item: QuotationItem): number => {
    return getProjectCustomerAmount(preparedProject, item);
  };

  // Totals
  const customerSubtotalBeforeDiscount = getProjectCustomerSubtotalBeforeDiscount(preparedProject);
  const customerDiscount = getProjectDiscountAmount(preparedProject);
  const customerSubtotal = getProjectCustomerSubtotal(preparedProject);
  const customerOperationFee = getProjectOperatingCost(preparedProject, customerSubtotal);
  const customerGrandTotal = customerSubtotal + customerOperationFee;

  const formatCurrency = (value: number | string): string => {
    if (value === '' || value === 0 || value === '-' || value === null || value === undefined) return '-';
    if (typeof value === 'string' && value === '-') return '-';
    const num = Number(value);
    if (isNaN(num)) return '-';
    return new Intl.NumberFormat('th-TH', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  const normalizeScopeDetails = (details?: string): string => {
    if (!details) return '';
    return details
      .replace(/^\s*(หมายเหตุหมวดงาน|หมายเหตุ|รายละเอียดงาน)\s*:\s*/u, '')
      .trim();
  };

  const shouldRenderInlineScope = (isHeader: boolean, details: string): boolean => {
    if (!details) return false;
    if (isHeader) return true;
    return !details.includes('\n') && !details.includes('•') && details.length <= 80;
  };

  return (
    <div id="customer-quotation-doc" className="max-w-[210mm] mx-auto bg-white print:shadow-none">
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
          #customer-quotation-doc {
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
          table {
            page-break-inside: auto;
          }
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          thead {
            display: table-header-group;
          }
          tfoot {
            display: table-footer-group;
          }
        }
      `}</style>
      {/* Header */}
      <div className="border-b border-stone-300 border-t-[6px] border-t-emerald-900 bg-white px-6 py-5 print:page-break-inside-avoid">
        <div className="grid gap-5 md:grid-cols-[minmax(0,1.35fr)_17rem]">
          <div className="min-w-0">
            <div className="flex items-start gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center border border-stone-300 bg-white p-2">
                {co?.logoUrl ? (
                  <img src={co.logoUrl} alt="Logo" className="h-full w-full object-contain" />
                ) : (
                  <Building2 className="h-7 w-7 text-stone-500" />
                )}
              </div>
              <div className="min-w-0">
                <h1 className="text-xl font-semibold tracking-[0.16em] text-stone-900">{co?.companyName?.toUpperCase() || 'COMPANY NAME'}</h1>
                <p className="mt-1 text-[10px] uppercase tracking-[0.3em] text-stone-500">{co?.tagline || 'Interior Design & Construction'}</p>
                <div className="mt-3 space-y-1 text-xs text-stone-600">
                  {co?.address && (
                    <div className="flex items-start gap-2">
                      <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-stone-500" />
                      <span>{co.address}</span>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    {co?.phone && (
                      <span className="inline-flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 text-stone-500" />
                        {co.phone}
                      </span>
                    )}
                    {co?.email && (
                      <span className="inline-flex items-center gap-1.5 break-all">
                        <Mail className="h-3.5 w-3.5 text-stone-500" />
                        {co.email}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 border border-stone-300 px-4 py-3">
              <div className="grid gap-3 text-xs text-stone-700 md:grid-cols-[5.5rem_minmax(0,1fr)]">
                <span className="font-medium text-stone-500">เรียน</span>
                <span>{customerName}</span>
                <span className="font-medium text-stone-500">โครงการ</span>
                <span>{preparedProject.name}</span>
                {preparedProject.address && (
                  <>
                    <span className="font-medium text-stone-500">สถานที่</span>
                    <span>{preparedProject.address}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="border border-stone-300">
            <div className="border-b border-stone-300 px-4 py-4 text-center">
              <div className="inline-flex items-center gap-2 text-stone-700">
                <FileText className="h-4 w-4" />
                <span className="text-[10px] uppercase tracking-[0.3em]">Quotation</span>
              </div>
              <h2 className="mt-2 text-2xl font-semibold text-stone-900">ใบเสนอราคา</h2>
              <p className="mt-1 text-[11px] tracking-[0.26em] text-stone-500">QUOTATION</p>
            </div>
            <div className="grid grid-cols-[7.25rem_1fr] text-xs">
              <div className="border-b border-r border-stone-300 px-3 py-2 text-stone-500">เลขที่เอกสาร</div>
              <div className="border-b border-stone-300 px-3 py-2 font-medium text-stone-900">{quotationNumber}</div>
              <div className="border-b border-r border-stone-300 px-3 py-2 text-stone-500">วันที่ออกเอกสาร</div>
              <div className="border-b border-stone-300 px-3 py-2 font-medium text-stone-900">{getCurrentThaiDate()}</div>
              <div className="border-r border-stone-300 px-3 py-2 text-stone-500">ระยะเวลาเสนอราคา</div>
              <div className="px-3 py-2 font-medium text-stone-900">30 วัน</div>
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
              ? 'bg-stone-800 text-white'
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
      <div className="bg-[#fbfcfb] px-6 py-4 border-b border-stone-200 print:page-break-inside-avoid">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <h2 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-stone-500">ข้อมูลโครงการ</h2>
            <div className="space-y-0.5 text-xs">
              <div className="flex gap-3">
                <span className="text-stone-500 w-20 text-xs">โครงการ:</span>
                <span>{preparedProject.name}</span>
              </div>
              {preparedProject.address && (
                <div className="flex gap-3">
                  <span className="text-stone-500 w-20 text-xs">ที่อยู่:</span>
                  <span className="text-xs">{preparedProject.address}</span>
                </div>
              )}
              {preparedProject.phone && preparedProject.phone !== '-' && (
                <div className="flex gap-3">
                  <span className="text-stone-500 w-20 text-xs">โทรศัพท์:</span>
                  <span>{preparedProject.phone}</span>
                </div>
              )}
              {preparedProject.owner && preparedProject.owner !== '-' && (
                <div className="flex gap-3">
                  <span className="text-stone-500 w-20 text-xs">Owner:</span>
                  <span>{preparedProject.owner}</span>
                </div>
              )}
            </div>
          </div>
          <div>
            <h2 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-stone-500">ข้อมูลผู้เสนอ</h2>
            <div className="space-y-0.5 text-xs">
              <div className="flex gap-3">
                <span className="text-stone-500 w-20 text-xs">บริษัท:</span>
                <span>{co?.companyName || '-'}</span>
              </div>
              <div className="flex gap-3">
                <span className="text-stone-500 w-20 text-xs">อีเมล:</span>
                <span className="text-xs">{co?.email || '-'}</span>
              </div>
              <div className="flex gap-3">
                <span className="text-stone-500 w-20 text-xs">โทรศัพท์:</span>
                <span>{co?.phone || '-'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Customer Quotation Table */}
      <div className="px-6 py-3">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[10px]">
            <thead>
              <tr className="bg-stone-100 text-stone-700">
                <th className="border border-stone-200 px-1.5 py-1 text-left w-10">ลำดับ</th>
                <th className="border border-stone-200 px-1.5 py-1 text-left">รายการ</th>
                <th className="border border-stone-200 px-1.5 py-1 text-center w-14">หน่วย</th>
                <th className="border border-stone-200 px-1.5 py-1 text-center w-12">จำนวน</th>
                <th className="border border-stone-200 px-1.5 py-1 text-right w-24">ราคา/หน่วย</th>
                <th className="border border-stone-200 px-1.5 py-1 text-right w-24">รวม (บาท)</th>
              </tr>
            </thead>
            <tbody>
              {quotationData.map((item, index) => {
                const isHeader = !item.no.includes('.');
                const custUnitPrice = getCustomerUnitPrice(item);
                const custTotal = calculateCustomerAmount(item);
                const scopeDetails = normalizeScopeDetails(item.scopeDetails);
                const showInlineScope = shouldRenderInlineScope(isHeader, scopeDetails);

                return (
                  <React.Fragment key={index}>
                    <tr className={isHeader ? 'bg-stone-50' : 'bg-white'}>
                      <td className={`border border-stone-200 px-1.5 py-0.5 ${isHeader ? '' : 'text-stone-500'}`}>
                        {item.no}
                      </td>
                      <td className={`border border-stone-200 px-1.5 py-0.5 ${isHeader ? '' : 'pl-4'}`}>
                        <div className={isHeader ? 'font-medium text-stone-800' : 'text-stone-800'}>
                          {item.description}
                        </div>
                        {scopeDetails && showInlineScope && (
                          <div className={`mt-0.5 text-[9px] leading-relaxed ${isHeader ? 'text-stone-500' : 'text-stone-400'}`}>
                            <span className="font-medium text-stone-600">หมายเหตุ:</span> {scopeDetails}
                          </div>
                        )}
                      </td>
                      <td className="border border-stone-200 px-1.5 py-0.5 text-center text-stone-500">
                        {item.unit}
                      </td>
                      <td className="border border-stone-200 px-1.5 py-0.5 text-center text-stone-500">
                        {item.quantity}
                      </td>
                      <td className="border border-stone-200 px-1.5 py-0.5 text-right text-stone-500">
                        {custUnitPrice > 0 ? formatCurrency(custUnitPrice) : '-'}
                      </td>
                      <td className="border border-stone-200 px-1.5 py-0.5 text-right">
                        {custTotal > 0 ? formatCurrency(custTotal) : '-'}
                      </td>
                    </tr>
                    {/* Scope Details / Notes Row */}
                    {scopeDetails && !showInlineScope && (
                      <tr>
                        <td colSpan={6} className={`border border-stone-200 px-4 py-2 ${isHeader ? 'bg-stone-50' : 'bg-white'}`}>
                          <div className="text-[9px] text-stone-500">
                            <span className="font-medium text-stone-800">รายละเอียดงาน:</span>
                            <div className="mt-1 whitespace-pre-line leading-relaxed pl-2">
                              {scopeDetails}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Built-in Details - Phase 4 */}
        {preparedProject.name.includes('Phase 4') && (
          <div className="mt-4 bg-stone-50 border border-stone-200 rounded-lg p-4 print:page-break-inside-avoid">
            <h3 className="text-xs font-semibold text-stone-800 mb-2">รายละเอียดงาน Built-in ทั้งหมด</h3>
            <div className="text-[10px] text-stone-800 space-y-1">
              <div className="flex gap-2">
                <span className="text-stone-500">-</span>
                <span><strong>วัสดุหน้าบาน:</strong> Laminate</span>
              </div>
              <div className="flex gap-2">
                <span className="text-stone-500">-</span>
                <span><strong>โครงตู้:</strong> HMR (Moisture Resistant Board)</span>
              </div>
              <div className="flex gap-2">
                <span className="text-stone-500">-</span>
                <span><strong>บานพับ:</strong> Hafele</span>
              </div>
              <div className="flex gap-2">
                <span className="text-stone-500">-</span>
                <span><strong>รางลิ้นชัก:</strong> Soft-Close Hafele</span>
              </div>
              <div className="flex gap-2">
                <span className="text-stone-500">-</span>
                <span><strong>การติดตั้ง:</strong> ติดตั้งครบชุดพร้อมใช้งาน</span>
              </div>
              <div className="flex gap-2 mt-2 pt-2 border-t border-stone-200">
                <span className="text-stone-500">*</span>
                <span><strong>หมายเหตุ:</strong> ราคานี้ไม่รวมแผ่น Laminate</span>
              </div>
            </div>
          </div>
        )}

        {/* Summary */}
        <div className="mt-3 flex justify-end print:page-break-inside-avoid">
          <div className="w-72">
            <div className="border border-stone-300 bg-white p-3 text-xs">
              <div className="flex justify-between pb-1.5 border-b border-stone-200">
                <span className="text-stone-500">รวมก่อนหักส่วนลด:</span>
                <span>{formatCurrency(customerSubtotalBeforeDiscount)} บาท</span>
              </div>
              {customerDiscount > 0 && (
                <div className="flex justify-between py-1.5 border-b border-stone-200 text-rose-700">
                  <span>{preparedProject.discountConfig?.label || 'ส่วนลด'}</span>
                  <span>-{formatCurrency(customerDiscount)} บาท</span>
                </div>
              )}
              {customerOperationFee > 0 && (
                <div className="flex justify-between py-1.5 border-b border-stone-200">
                  <span className="text-stone-500">ค่าดำเนินการ (5%):</span>
                  <span>{formatCurrency(customerOperationFee)} บาท</span>
                </div>
              )}
              <div className="mt-2 flex justify-between border-t-2 border-stone-800 pt-2 text-stone-900">
                <span className="font-semibold">รวมราคาสุทธิ (Grand Total):</span>
                <span className="text-sm font-semibold">{formatCurrency(customerGrandTotal)} บาท</span>
              </div>
              {customerDiscount > 0 && preparedProject.discountConfig?.condition && (
                <p className="mt-2 text-[10px] leading-relaxed text-stone-500">
                  {preparedProject.discountConfig.condition}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Signature Section */}
      <div className="px-6 py-3 bg-stone-50 border-t border-stone-200 print:page-break-inside-avoid">
        <div className="grid grid-cols-2 gap-8">
          <div className="text-center">
            <p className="text-[10px] text-stone-500 mb-6">ผู้เสนอ (Prepared By)</p>
            <div className="mb-1.5">
              <div className="w-24 h-12 border-b border-slate-400" />
            </div>
            <div className="border-b border-stone-400 mb-0.5 pb-0.5">
              <span className="invisible text-[10px]">Signature</span>
            </div>
            <p className="text-[10px] text-stone-500">( {co?.signatureName || '-'} )</p>
            <p className="text-[10px] text-stone-400 mt-0.5">{getCurrentThaiDate()}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-stone-500 mb-6">ผู้รับเสนอ (Proposed To/Client)</p>
            <div className="mb-1.5">
              <span className="invisible text-[10px] h-10 block">Signature placeholder</span>
            </div>
            <div className="border-b border-stone-400 mb-0.5 pb-0.5">
              <span className="invisible text-[10px]">Signature</span>
            </div>
            <p className="text-[10px] text-stone-500">( ...................................... )</p>
            <p className="text-[10px] text-stone-400 mt-0.5">วันที่ ........................</p>
          </div>
        </div>
      </div>

      </div>
      {/* End Main Content */}

      {/* Footer */}
      <div className="border-t border-stone-300 bg-white py-3 text-center">
        <p className="text-[10px] tracking-[0.16em] text-stone-500">{co?.companyName?.toUpperCase() || '-'} | {co?.email || '-'} | {co?.phone || '-'}</p>
      </div>

      {/* Print Button */}
      <div className="p-4 bg-white border-t border-stone-200 print:hidden">
        <button
          onClick={() => { setIsEditing(false); window.print(); }}
          className="w-full rounded-lg bg-stone-800 px-6 py-2 text-sm text-white transition-colors hover:bg-stone-700"
        >
          พิมพ์เอกสาร / Print Document
        </button>
      </div>
    </div>
  );
}
