import React from 'react';
import {
  Building2, CalendarDays, ClipboardList, Eye, Mail, MapPin, Package, Pencil, Phone, ShoppingCart,
} from 'lucide-react';
import type { CompanyProfile } from '../utils/companyProfile';
import { loadCompanyProfile } from '../utils/companyProfile';
import { getCurrentThaiDate } from '../utils/dateUtils';
import type { ProjectData, QuotationItem } from '../utils/projectData';

interface PurchaseOrderDocumentProps {
  project: ProjectData;
  companyProfile?: CompanyProfile;
  categoryFilter?: string;
}

interface PurchaseOrderLine {
  no: string;
  description: string;
  unit: string;
  quantity: number;
  materialUnitCost: number;
  total: number;
  scopeDetails?: string;
}

interface PurchaseOrderSection {
  key: string;
  title: string;
  scopeDetails?: string;
  items: PurchaseOrderLine[];
  total: number;
}

function formatCurrency(value: number | string): string {
  if (value === '' || value === 0 || value === '-' || value === null || value === undefined) return '-';
  const num = Number(value);
  if (Number.isNaN(num)) return '-';
  return new Intl.NumberFormat('th-TH', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

function normalizeScopeDetails(details?: string): string {
  if (!details) return '';
  return details
    .replace(/^\s*(หมายเหตุหมวดงาน|หมายเหตุ|รายละเอียดงาน)\s*:\s*/u, '')
    .trim();
}

function getMaterialUnitCost(item: QuotationItem): number {
  if (item.totalPrice !== undefined && item.totalPrice !== null && item.totalPrice !== '') {
    return Number(item.totalPrice) || 0;
  }
  return Number(item.unitPrice) || 0;
}

function isCustomerSupplied(text: string): boolean {
  return /ลูกค้าจัดหาเอง|ลูกค้าจัดหา|owner จัดหา/i.test(text);
}

function buildPurchaseSections(items: QuotationItem[]): PurchaseOrderSection[] {
  const headerMap = new Map<string, QuotationItem>();
  const headerOrder = new Map<string, number>();

  items.forEach((item, index) => {
    if (item.quantity === '' && !item.no.includes('.')) {
      headerMap.set(item.no, item);
      headerOrder.set(item.no, index);
    }
  });

  const sectionMap = new Map<string, PurchaseOrderSection>();

  items.forEach((item) => {
    if (item.quantity === '' || item.quantity === undefined || !item.no.includes('.')) {
      return;
    }

    const quantity = Number(item.quantity) || 0;
    const materialUnitCost = getMaterialUnitCost(item);
    const categoryKey = item.no.split('.')[0];
    const header = headerMap.get(categoryKey);
    const categoryNote = normalizeScopeDetails(header?.scopeDetails);
    const itemNote = normalizeScopeDetails(item.scopeDetails);
    const combinedText = `${header?.description || ''} ${categoryNote} ${item.description} ${itemNote}`;

    if (quantity <= 0 || materialUnitCost <= 0 || isCustomerSupplied(combinedText)) {
      return;
    }

    if (!sectionMap.has(categoryKey)) {
      sectionMap.set(categoryKey, {
        key: categoryKey,
        title: header?.description || `หมวด ${categoryKey}`,
        scopeDetails: categoryNote || undefined,
        items: [],
        total: 0,
      });
    }

    const section = sectionMap.get(categoryKey)!;
    const lineTotal = quantity * materialUnitCost;

    section.items.push({
      no: item.no,
      description: item.description,
      unit: item.unit,
      quantity,
      materialUnitCost,
      total: lineTotal,
      scopeDetails: itemNote || undefined,
    });
    section.total += lineTotal;
  });

  return Array.from(sectionMap.values())
    .sort((a, b) => (headerOrder.get(a.key) || 0) - (headerOrder.get(b.key) || 0))
    .filter((section) => section.items.length > 0);
}

export function PurchaseOrderDocument({ project, companyProfile, categoryFilter }: PurchaseOrderDocumentProps) {
  const [isEditing, setIsEditing] = React.useState(false);
  const co = companyProfile || loadCompanyProfile();
  const thaiYear = new Date().getFullYear() + 543;
  const documentNumber = `PO-${thaiYear}-001`;
  const requestedDeliveryDate = project.workPlan?.startDate || 'ตามแผนงาน';

  const filteredQuotationData = React.useMemo(() => {
    if (!categoryFilter) return project.quotationData;
    return project.quotationData.filter((item) => {
      const mainKey = item.no.split('.')[0];
      return mainKey === categoryFilter;
    });
  }, [project.quotationData, categoryFilter]);

  const categoryLabel = React.useMemo(() => {
    if (!categoryFilter) return undefined;
    const header = project.quotationData.find(
      (item) => item.no === categoryFilter && !item.no.includes('.') && item.quantity === '',
    );
    return header?.description;
  }, [project.quotationData, categoryFilter]);

  const purchaseSections = React.useMemo(
    () => buildPurchaseSections(filteredQuotationData),
    [filteredQuotationData],
  );
  const purchaseItemCount = purchaseSections.reduce((sum, section) => sum + section.items.length, 0);
  const purchaseTotal = purchaseSections.reduce((sum, section) => sum + section.total, 0);

  return (
    <div id="purchase-order-doc" className="mx-auto max-w-[210mm] bg-white print:shadow-none">
      {(!co?.companyName && !co?.phone) && (
        <div className="mx-8 mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 print:hidden">
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
          #purchase-order-doc {
            max-width: 100%;
            transform: scale(0.87);
            transform-origin: top center;
          }
          .print\\:page-break-inside-avoid {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          thead {
            display: table-header-group;
          }
          tfoot {
            display: table-footer-group;
          }
          tr {
            page-break-inside: avoid;
            break-inside: avoid;
          }
        }
      `}</style>

      <div className="border-t-[6px] border-t-emerald-900 border-b border-stone-300 bg-white px-6 py-5 print:page-break-inside-avoid">
        <div className="grid gap-5 md:grid-cols-[minmax(0,1.35fr)_17rem]">
          <div className="min-w-0">
            <div className="flex items-start gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center border border-stone-300 bg-white">
                {co?.logoUrl ? (
                  <img src={co.logoUrl} alt="Logo" className="h-full w-full object-contain p-2" />
                ) : (
                  <Building2 className="h-7 w-7 text-stone-500" />
                )}
              </div>
              <div className="min-w-0">
                <h1 className="text-xl font-semibold tracking-[0.16em] text-stone-900">
                  {co?.companyName?.toUpperCase() || 'COMPANY NAME'}
                </h1>
                <p className="mt-1 text-[10px] uppercase tracking-[0.3em] text-stone-500">
                  {co?.tagline || 'Interior Design & Construction'}
                </p>
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
          </div>

          <div className="border border-stone-300">
            <div className="border-b border-stone-300 px-4 py-4 text-center">
              <div className="inline-flex items-center gap-2 text-stone-700">
                <ShoppingCart className="h-4 w-4" />
                <span className="text-[10px] uppercase tracking-[0.3em]">Purchase Order</span>
              </div>
              <h2 className="mt-2 text-2xl font-semibold text-stone-900">
                ใบสั่งซื้อ{categoryLabel ? ` — ${categoryLabel}` : ''}
              </h2>
              <p className="mt-1 text-[11px] tracking-[0.26em] text-stone-500">PURCHASE ORDER</p>
            </div>
            <div className="grid grid-cols-[7.25rem_1fr] text-xs">
              <div className="border-b border-r border-stone-300 px-3 py-2 text-stone-500">เลขที่เอกสาร</div>
              <div className="border-b border-stone-300 px-3 py-2 font-medium text-stone-900">{documentNumber}</div>
              <div className="border-b border-r border-stone-300 px-3 py-2 text-stone-500">วันที่ออกเอกสาร</div>
              <div className="border-b border-stone-300 px-3 py-2 font-medium text-stone-900">{getCurrentThaiDate()}</div>
              <div className="border-r border-stone-300 px-3 py-2 text-stone-500">กำหนดใช้วัสดุ</div>
              <div className="px-3 py-2 font-medium text-stone-900">{requestedDeliveryDate}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 border-b border-stone-200 bg-stone-50 px-6 py-3 print:hidden">
        <button
          onClick={() => setIsEditing(!isEditing)}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors ${
            isEditing
              ? 'bg-stone-800 text-white'
              : 'border border-stone-200 text-stone-600 hover:bg-stone-100'
          }`}
        >
          {isEditing ? <Eye className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
          {isEditing ? 'ดูตัวอย่าง' : 'แก้ไข'}
        </button>
        {isEditing && (
          <span className="text-[11px] text-stone-400">คลิกที่ข้อความเพื่อแก้ไขหมายเหตุหรือข้อมูลจัดซื้อได้เลย</span>
        )}
      </div>

      <div
        contentEditable={isEditing}
        suppressContentEditableWarning
        className={`${isEditing ? '[&_p]:outline-none [&_p]:hover:bg-amber-50/40 [&_p]:focus:bg-amber-50/60 [&_td]:outline-none [&_td]:hover:bg-amber-50/40 [&_td]:focus:bg-amber-50/60 [&_div]:rounded [&_td]:rounded [&_div]:transition-colors [&_td]:transition-colors' : ''}`}
      >
        <div className="grid gap-4 border-b border-stone-200 bg-[#fbfcfb] px-6 py-4 md:grid-cols-3 print:page-break-inside-avoid">
          <div className="rounded-xl border border-stone-200 bg-white p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-stone-500">ข้อมูลโครงการ</p>
            <div className="mt-3 space-y-1.5 text-xs text-stone-700">
              <p className="font-medium text-stone-900">{project.name}</p>
              {project.address && (
                <p className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-stone-400" />
                  <span>{project.address}</span>
                </p>
              )}
              {project.owner && project.owner !== '-' && <p>ผู้ว่าจ้าง: {project.owner}</p>}
            </div>
          </div>

          <div className="rounded-xl border border-stone-200 bg-white p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-stone-500">สรุปการจัดซื้อ</p>
            <div className="mt-3 space-y-1.5 text-xs text-stone-700">
              <p className="flex items-center gap-2">
                <Package className="h-3.5 w-3.5 text-stone-400" />
                <span>{purchaseItemCount} รายการวัสดุที่ต้องสั่งซื้อ</span>
              </p>
              <p className="flex items-center gap-2">
                <ClipboardList className="h-3.5 w-3.5 text-stone-400" />
                <span>{purchaseSections.length} หมวดจัดซื้อ</span>
              </p>
              <p className="flex items-center gap-2">
                <CalendarDays className="h-3.5 w-3.5 text-stone-400" />
                <span>อ้างอิงกำหนดใช้วัสดุตามแผนงาน</span>
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-stone-200 bg-white p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-stone-500">ข้อมูลผู้สั่งซื้อ</p>
            <div className="mt-3 space-y-1.5 text-xs text-stone-700">
              <p className="font-medium text-stone-900">{co?.companyName || 'COMPANY NAME'}</p>
              {co?.phone && (
                <p className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 text-stone-400" />
                  <span>{co.phone}</span>
                </p>
              )}
              <p className="text-stone-500">ผู้จำหน่าย / Supplier: ระบุภายหลัง</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-4">
          {purchaseSections.length === 0 ? (
            <div className="rounded-xl border border-dashed border-stone-300 bg-stone-50 px-6 py-12 text-center text-sm text-stone-500">
              ไม่พบรายการวัสดุใน BOQ ที่ต้องสั่งซื้อ เอกสารนี้จะดึงเฉพาะรายการที่มีต้นทุนวัสดุเท่านั้น
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[10px]">
                <thead>
                  <tr className="bg-stone-100 text-stone-700">
                    <th className="w-10 border border-stone-200 px-1.5 py-1 text-left">ลำดับ</th>
                    <th className="border border-stone-200 px-1.5 py-1 text-left">รายการวัสดุ</th>
                    <th className="w-14 border border-stone-200 px-1.5 py-1 text-center">หน่วย</th>
                    <th className="w-14 border border-stone-200 px-1.5 py-1 text-center">จำนวน</th>
                    <th className="w-24 border border-stone-200 px-1.5 py-1 text-right">ราคาทุน/หน่วย</th>
                    <th className="w-24 border border-stone-200 px-1.5 py-1 text-right">รวม (บาท)</th>
                  </tr>
                </thead>
                <tbody>
                  {purchaseSections.map((section) => (
                    <React.Fragment key={section.key}>
                      <tr className="bg-stone-50">
                        <td className="border border-stone-200 px-1.5 py-1 font-medium text-stone-700">{section.key}</td>
                        <td colSpan={4} className="border border-stone-200 px-1.5 py-1 font-medium text-stone-800">
                          {section.title}
                          {section.scopeDetails && (
                            <div className="mt-0.5 text-[9px] font-normal text-stone-500">
                              <span className="font-medium text-stone-600">หมายเหตุ:</span> {section.scopeDetails}
                            </div>
                          )}
                        </td>
                        <td className="border border-stone-200 px-1.5 py-1 text-right font-medium text-stone-800">
                          {formatCurrency(section.total)}
                        </td>
                      </tr>
                      {section.items.map((item) => (
                        <tr key={item.no} className="bg-white">
                          <td className="border border-stone-200 px-1.5 py-1 text-stone-500">{item.no}</td>
                          <td className="border border-stone-200 px-1.5 py-1 text-stone-800">
                            <div>{item.description}</div>
                            {item.scopeDetails && item.scopeDetails !== section.scopeDetails && (
                              <div className="mt-0.5 text-[9px] text-stone-400">
                                <span className="font-medium text-stone-500">รายละเอียด:</span> {item.scopeDetails}
                              </div>
                            )}
                          </td>
                          <td className="border border-stone-200 px-1.5 py-1 text-center text-stone-500">{item.unit}</td>
                          <td className="border border-stone-200 px-1.5 py-1 text-center text-stone-500">{formatCurrency(item.quantity)}</td>
                          <td className="border border-stone-200 px-1.5 py-1 text-right text-stone-500">
                            {formatCurrency(item.materialUnitCost)}
                          </td>
                          <td className="border border-stone-200 px-1.5 py-1 text-right text-stone-800">
                            {formatCurrency(item.total)}
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-stone-100 text-stone-900">
                    <td colSpan={5} className="border border-stone-200 px-2 py-2 text-right font-semibold">
                      รวมมูลค่าวัสดุที่ต้องสั่งซื้อ
                    </td>
                    <td className="border border-stone-200 px-2 py-2 text-right font-semibold">
                      {formatCurrency(purchaseTotal)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          <div className="mt-4 rounded-xl border border-stone-200 bg-stone-50 p-4 print:page-break-inside-avoid">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-stone-500">หมายเหตุการใช้งานเอกสาร</p>
            <div className="mt-2 space-y-1 text-[11px] text-stone-600">
              <p>1. เอกสารนี้สรุปจากต้นทุนวัสดุใน BOQ ภายใน ใช้สำหรับจัดซื้อและเตรียมของเข้าหน้างาน</p>
              <p>2. รายการที่เป็นค่าแรงล้วน หรือรายการที่ลูกค้าจัดหาเอง จะไม่ถูกดึงมาแสดงในใบสั่งซื้อนี้</p>
              <p>3. ผู้ใช้งานสามารถแก้ไขชื่อผู้ขาย กำหนดส่ง และหมายเหตุเฉพาะรายการก่อนพิมพ์ได้จากโหมดแก้ไข</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 border-t border-stone-200 bg-stone-50 px-6 py-4 print:page-break-inside-avoid">
          <div className="text-center">
            <p className="mb-6 text-[10px] text-stone-500">ผู้จัดทำใบสั่งซื้อ</p>
            <div className="mb-1.5 border-b border-stone-400 pb-8" />
            <p className="text-[10px] text-stone-500">( {co?.signatureName || co?.companyName || '-'} )</p>
            <p className="mt-0.5 text-[10px] text-stone-400">{getCurrentThaiDate()}</p>
          </div>
          <div className="text-center">
            <p className="mb-6 text-[10px] text-stone-500">ผู้อนุมัติ / ผู้รับคำสั่งซื้อ</p>
            <div className="mb-1.5 border-b border-stone-400 pb-8" />
            <p className="text-[10px] text-stone-500">( ...................................... )</p>
            <p className="mt-0.5 text-[10px] text-stone-400">วันที่ ........................</p>
          </div>
        </div>
      </div>

      <div className="border-t border-stone-300 bg-white py-3 text-center">
        <p className="text-[10px] tracking-[0.16em] text-stone-500">
          {co?.companyName?.toUpperCase() || '-'} | {co?.email || '-'} | {co?.phone || '-'}
        </p>
      </div>

      <div className="border-t border-stone-200 bg-white p-4 print:hidden">
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
