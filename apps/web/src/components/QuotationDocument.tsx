import React from 'react';
import { FileText, Building2, Pencil, Eye, ShoppingCart } from 'lucide-react';
import { ProjectData, QuotationItem } from '../utils/projectData';
import { getCurrentThaiDate } from '../utils/dateUtils';
import { loadCompanyProfile, type CompanyProfile } from '../utils/companyProfile';

interface QuotationDocumentProps {
  project: ProjectData;
  companyProfile?: CompanyProfile;
  onOpenShop?: () => void;
  onUpdate?: (project: ProjectData) => void;
}

export function QuotationDocument({ project, companyProfile, onOpenShop, onUpdate }: QuotationDocumentProps) {
  const [hidePrices, setHidePrices] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);
  const [editingCell, setEditingCell] = React.useState<{ index: number; field: 'unitPrice' | 'laborCost' } | null>(null);
  const quotationData = project.quotationData;

  const handleCellChange = (index: number, field: 'unitPrice' | 'laborCost', value: string) => {
    if (!onUpdate) return;
    const updated = [...quotationData];
    const numVal = value === '' ? '' : Number(value) || 0;
    updated[index] = { ...updated[index], [field]: numVal, totalPrice: '' };
    onUpdate({ ...project, quotationData: updated });
  };
  const co = companyProfile || loadCompanyProfile();

  // Calculate totals — ใช้ unitPrice + laborCost เป็นหลัก, ใช้ totalPrice เฉพาะเมื่อไม่มีราคาแยก
  const calculateAmount = (item: QuotationItem): number => {
    if (!item.quantity || item.quantity === '') return 0;
    const qty = Number(item.quantity);
    const unitPrice = Number(item.unitPrice) || 0;
    const laborCost = Number(item.laborCost) || 0;
    if (unitPrice > 0 || laborCost > 0) return qty * (unitPrice + laborCost);
    // fallback: ราคาเหมาเมื่อไม่มี breakdown
    if (item.totalPrice !== undefined && item.totalPrice !== null && item.totalPrice !== '') {
      return qty * (Number(item.totalPrice) || 0);
    }
    return 0;
  };

  const subtotal = quotationData.reduce((sum, item) => sum + calculateAmount(item), 0);
  const grandTotal = subtotal; // ไม่มีค่าดำเนินการ 5% สำหรับราคาทุน

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

  return (
    <div id="quotation-doc" className="max-w-[210mm] mx-auto bg-white print:shadow-none">
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
          #quotation-doc {
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
      <div className="bg-[var(--doc-primary)] text-white px-6 py-5">
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
                <FileText className="w-5 h-5" />
                <h2 className="text-xl tracking-wide">ใบเสนอราคา</h2>
              </div>
              <p className="text-xs text-stone-400">QUOTATION (COST)</p>
            </div>
          </div>
          <div className="text-right">
            <div className="px-5 py-3">
              <p className="text-xs text-stone-400 mb-1">เลขที่เอกสาร / Document No.</p>
              <p className="text-base">{`QT-${new Date().getFullYear() + 543}-001`}</p>
              <p className="text-xs text-stone-400 mt-3 mb-1">วันที่ / Date</p>
              <p className="text-base">{getCurrentThaiDate()}</p>
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
        {onOpenShop && (
          <button
            onClick={onOpenShop}
            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm text-emerald-700 transition hover:bg-emerald-100"
          >
            <ShoppingCart className="h-3.5 w-3.5" />
            สั่งซื้อวัสดุ / RFQ
          </button>
        )}
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
      <div className="px-6 py-3 border-b border-stone-200 print:page-break-inside-avoid">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <h2 className="text-xs text-stone-800 mb-1.5">ข้อมูลโครงการ</h2>
            <div className="space-y-0.5 text-xs">
              <div className="flex gap-2">
                <span className="text-stone-500 w-16 text-[10px]">โครงการ:</span>
                <span>{project.name}</span>
              </div>
              {project.address && (
                <div className="flex gap-2">
                  <span className="text-stone-500 w-16 text-[10px]">ที่อยู่:</span>
                  <span className="text-[10px]">{project.address}</span>
                </div>
              )}
              {project.phone && project.phone !== '-' && (
                <div className="flex gap-2">
                  <span className="text-stone-500 w-16 text-[10px]">โทรศัพท์:</span>
                  <span>{project.phone}</span>
                </div>
              )}
              {project.owner && project.owner !== '-' && (
                <div className="flex gap-2">
                  <span className="text-stone-500 w-16 text-[10px]">Owner:</span>
                  <span>{project.owner}</span>
                </div>
              )}
            </div>
          </div>
          <div>
            <h2 className="text-xs text-stone-800 mb-1.5">ข้อมูลผู้เสนอ</h2>
            <div className="space-y-0.5 text-xs">
              <div className="flex gap-2">
                <span className="text-stone-500 w-16 text-[10px]">บริษัท:</span>
                <span>{co?.companyName || '-'}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-stone-500 w-16 text-[10px]">อีเมล:</span>
                <span className="text-[10px]">{co?.email || '-'}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-stone-500 w-16 text-[10px]">โทรศัพท์:</span>
                <span>{co?.phone || '-'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Toggle Hide Prices Button */}
        <div className="mt-4 print:hidden">
          <label className="flex items-center gap-2 cursor-pointer bg-stone-50 border border-stone-200 px-4 py-2 rounded-lg hover:bg-stone-100 transition-colors">
            <input
              type="checkbox"
              checked={hidePrices}
              onChange={(e) => setHidePrices(e.target.checked)}
              className="w-4 h-4 text-stone-800 bg-white border-stone-300 rounded focus:ring-stone-500"
            />
            <span className="text-xs text-stone-800">
              ซ่อนราคา (สำหรับส่งให้ช่างเสนอราคา)
            </span>
          </label>
        </div>
      </div>

      {/* Quotation Table */}
      <div className="px-6 py-3">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[10px]">
            <thead>
              <tr className="bg-stone-50">
                <th className="border border-stone-200 px-1.5 py-1 text-left w-10">ลำดับ</th>
                <th className="border border-stone-200 px-1.5 py-1 text-left">รายการ</th>
                <th className="border border-stone-200 px-1.5 py-1 text-center w-14">หน่วย</th>
                <th className="border border-stone-200 px-1.5 py-1 text-center w-12">จำนวน</th>
                {!hidePrices && (
                  <>
                    <th className="border border-stone-200 px-1.5 py-1 text-right w-20">ราคาวัสดุ</th>
                    <th className="border border-stone-200 px-1.5 py-1 text-right w-20">ค่าแรง</th>
                    <th className="border border-stone-200 px-1.5 py-1 text-right w-24">รวม (บาท)</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {quotationData.map((item, index) => {
                const isHeader = !item.no.includes('.');
                const amount = calculateAmount(item);

                return (
                  <React.Fragment key={index}>
                    <tr className={isHeader ? 'bg-stone-50' : ''}>
                      <td className={`border border-stone-200 px-1.5 py-0.5 ${isHeader ? '' : 'text-stone-500'}`}>
                        {item.no}
                      </td>
                      <td className={`border border-stone-200 px-1.5 py-0.5 ${isHeader ? '' : 'pl-4'}`}>
                        {item.description}
                      </td>
                      <td className="border border-stone-200 px-1.5 py-0.5 text-center text-stone-500">
                        {item.unit}
                      </td>
                      <td className="border border-stone-200 px-1.5 py-0.5 text-center text-stone-500">
                        {item.quantity}
                      </td>
                      {!hidePrices && (
                        <>
                          <td
                            className={`border border-stone-200 px-1.5 py-0.5 text-right text-stone-500 ${onUpdate && !isHeader ? 'cursor-pointer hover:bg-blue-50 print:hover:bg-transparent' : ''}`}
                            onClick={() => onUpdate && !isHeader && setEditingCell({ index, field: 'unitPrice' })}
                          >
                            {editingCell?.index === index && editingCell.field === 'unitPrice' ? (
                              <input
                                type="number"
                                defaultValue={Number(item.unitPrice) || ''}
                                autoFocus
                                className="w-full text-right text-xs border border-blue-400 rounded px-1 py-0.5 focus:outline-none print:hidden"
                                onBlur={(e) => { handleCellChange(index, 'unitPrice', e.target.value); setEditingCell(null); }}
                                onKeyDown={(e) => { if (e.key === 'Enter') { handleCellChange(index, 'unitPrice', (e.target as HTMLInputElement).value); setEditingCell(null); } }}
                              />
                            ) : (
                              item.unitPrice && item.unitPrice !== '' ? formatCurrency(Number(item.unitPrice)) : '-'
                            )}
                          </td>
                          <td
                            className={`border border-stone-200 px-1.5 py-0.5 text-right text-stone-500 ${onUpdate && !isHeader ? 'cursor-pointer hover:bg-blue-50 print:hover:bg-transparent' : ''}`}
                            onClick={() => onUpdate && !isHeader && setEditingCell({ index, field: 'laborCost' })}
                          >
                            {editingCell?.index === index && editingCell.field === 'laborCost' ? (
                              <input
                                type="number"
                                defaultValue={Number(item.laborCost) || ''}
                                autoFocus
                                className="w-full text-right text-xs border border-blue-400 rounded px-1 py-0.5 focus:outline-none print:hidden"
                                onBlur={(e) => { handleCellChange(index, 'laborCost', e.target.value); setEditingCell(null); }}
                                onKeyDown={(e) => { if (e.key === 'Enter') { handleCellChange(index, 'laborCost', (e.target as HTMLInputElement).value); setEditingCell(null); } }}
                              />
                            ) : (
                              item.laborCost && item.laborCost !== '' ? formatCurrency(Number(item.laborCost)) : '-'
                            )}
                          </td>
                          <td className="border border-stone-200 px-1.5 py-0.5 text-right">
                            {amount > 0 ? formatCurrency(amount) : '-'}
                          </td>
                        </>
                      )}
                    </tr>
                    {/* Scope Details Row */}
                    {item.scopeDetails && !isHeader && (
                      <tr>
                        <td colSpan={hidePrices ? 4 : 7} className="border border-stone-200 px-4 py-1.5 bg-white">
                          <div className="text-[9px] text-stone-500">
                            <span className="font-medium text-stone-800">รายละเอียดงาน:</span>
                            <div className="mt-0.5 whitespace-pre-line leading-relaxed pl-2">
                              {item.scopeDetails}
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
        {project.name.includes('Phase 4') && (
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
        {!hidePrices && (
          <div className="mt-3 flex justify-end print:page-break-inside-avoid">
            <div className="w-72">
              <div className="bg-stone-50 p-3 rounded-lg space-y-1.5 text-xs border border-stone-200">
                <div className="flex justify-between pb-1.5 border-b border-stone-200">
                  <span className="text-stone-500">รวมค่าใช้จ่ายโดยตรง:</span>
                  <span>{formatCurrency(subtotal)} บาท</span>
                </div>
                <div className="flex justify-between pt-1.5 border-t border-stone-200">
                  <span>รวมราคาสุทธิ (Grand Total):</span>
                  <span className="text-sm text-stone-800">{formatCurrency(grandTotal)} บาท</span>
                </div>
              </div>
            </div>
          </div>
        )}
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
      <div className="bg-[var(--doc-primary)] text-white py-2 text-center">
        <p className="text-[10px] text-stone-400">{co?.companyName?.toUpperCase() || '-'} • Your Trusted Interior Design Partner • {co?.email || '-'} • {co?.phone || '-'}</p>
      </div>

      {/* Print Button */}
      <div className="p-4 bg-white border-t border-stone-200 print:hidden">
        <button
          onClick={() => { setIsEditing(false); window.print(); }}
          className="w-full bg-[var(--doc-primary)] hover:bg-[var(--doc-primary-hover)] text-white py-2 px-6 rounded-lg transition-colors text-sm"
        >
          พิมพ์เอกสาร / Print Document
        </button>
      </div>
    </div>
  );
}
