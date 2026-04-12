import React from 'react';
import { Building2, Package } from 'lucide-react';
import { ProjectData } from '../utils/projectData';
import { getCurrentThaiDate } from '../utils/dateUtils';
import { loadCompanyProfile, type CompanyProfile } from '../utils/companyProfile';

interface GoodsReceiptItem {
  boqNo: string;
  description: string;
  orderedQty: number;
  receivedQty: number;
  unit: string;
  unitPrice: number;
}

interface GoodsReceiptDocumentProps {
  project: ProjectData;
  companyProfile?: CompanyProfile;
  supplierName: string;
  categoryLabel: string;
  items: GoodsReceiptItem[];
  receivedDate?: string;
  poNumber?: string;
}

export function GoodsReceiptDocument({
  project,
  companyProfile,
  supplierName,
  categoryLabel,
  items,
  receivedDate,
  poNumber,
}: GoodsReceiptDocumentProps) {
  const co = companyProfile || loadCompanyProfile();

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('th-TH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const thaiDate = receivedDate || getCurrentThaiDate();
  const grNumber = poNumber
    ? `GR-${poNumber.replace(/^PO-/, '')}`
    : `GR-${new Date().getFullYear() + 543}-001`;

  const totalAmount = items.reduce((sum, item) => sum + item.receivedQty * item.unitPrice, 0);

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
                <Package className="w-5 h-5" />
                <h2 className="text-xl tracking-wide">ใบรับสินค้า</h2>
              </div>
              <p className="text-[10px] text-stone-400">GOODS RECEIPT</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-stone-400 mb-1">GR No.</p>
            <p className="text-base mb-3">{grNumber}</p>
            <p className="text-[10px] text-stone-400 mb-1">Date</p>
            <p className="text-sm">{thaiDate}</p>
          </div>
        </div>
      </div>

      {/* Supplier & Project Info */}
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
            <Package className="w-3.5 h-3.5" />
            <span>ข้อมูลผู้ส่งสินค้า / Supplier Info</span>
          </h3>
          <div className="space-y-0.5 text-xs">
            <p className="text-stone-800">ผู้ส่งสินค้า: {supplierName}</p>
            <p className="text-stone-500">หมวดงาน: {categoryLabel}</p>
            <p className="text-stone-500">โครงการ: {project.name}</p>
            {poNumber && <p className="text-stone-500">อ้างอิง PO: {poNumber}</p>}
            <p className="text-stone-500">วันที่รับสินค้า: {thaiDate}</p>
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="px-8 py-6">
        <div className="border border-stone-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200">
                <th className="text-center px-2 py-2 text-stone-800 font-medium w-12">ลำดับ</th>
                <th className="text-left px-3 py-2 text-stone-800 font-medium">รายการ / Description</th>
                <th className="text-right px-2 py-2 text-stone-800 font-medium w-20">สั่งซื้อ</th>
                <th className="text-right px-2 py-2 text-stone-800 font-medium w-20">รับจริง</th>
                <th className="text-center px-2 py-2 text-stone-800 font-medium w-16">หน่วย</th>
                <th className="text-right px-2 py-2 text-stone-800 font-medium w-24">ราคา/หน่วย</th>
                <th className="text-right px-3 py-2 text-stone-800 font-medium w-28">รวม (บาท)</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => {
                const lineTotal = item.receivedQty * item.unitPrice;
                const isMismatch = item.receivedQty !== item.orderedQty;
                return (
                  <tr
                    key={index}
                    className={`border-b border-stone-200 ${isMismatch ? 'bg-amber-50' : ''}`}
                  >
                    <td className="text-center px-2 py-2 text-stone-500">{index + 1}</td>
                    <td className="px-3 py-2 text-stone-800">
                      <span className="text-stone-400 text-xs mr-1">[{item.boqNo}]</span>
                      {item.description}
                    </td>
                    <td className="text-right px-2 py-2 text-stone-800">{item.orderedQty}</td>
                    <td className={`text-right px-2 py-2 font-medium ${isMismatch ? 'text-amber-700' : 'text-stone-800'}`}>
                      {item.receivedQty}
                    </td>
                    <td className="text-center px-2 py-2 text-stone-500">{item.unit}</td>
                    <td className="text-right px-2 py-2 text-stone-800 font-mono">{formatCurrency(item.unitPrice)}</td>
                    <td className="text-right px-3 py-2 text-stone-800 font-mono">{formatCurrency(lineTotal)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Total */}
        <div className="mt-4 bg-stone-50 border border-stone-200 rounded-lg p-4">
          <div className="flex justify-between items-center">
            <span className="text-stone-500">รวมมูลค่าสินค้าที่รับ / Total Received Amount:</span>
            <span className="text-2xl text-stone-800 font-mono">{formatCurrency(totalAmount)} บาท</span>
          </div>
        </div>

        {/* Mismatch Legend */}
        {items.some((item) => item.receivedQty !== item.orderedQty) && (
          <div className="mt-3 flex items-center gap-2">
            <div className="w-4 h-4 bg-amber-50 border border-amber-300 rounded" />
            <span className="text-xs text-stone-500">รายการที่จำนวนรับจริงไม่ตรงกับจำนวนสั่งซื้อ</span>
          </div>
        )}

        {/* Note */}
        <div className="mt-4 p-3 bg-stone-50 border border-stone-200 rounded-lg">
          <p className="text-xs text-stone-500">
            <span className="font-medium text-stone-800">หมายเหตุ:</span>{' '}
            กรุณาตรวจสอบสินค้าก่อนลงนามรับ
          </p>
        </div>
      </div>

      {/* Signature Section */}
      <div className="px-8 py-6 bg-stone-50 border-t border-stone-200">
        <div className="grid grid-cols-3 gap-8">
          <div className="text-center">
            <p className="text-xs text-stone-500 mb-8">ผู้ส่งสินค้า (Delivered By)</p>
            <div className="border-b border-stone-400 mb-1 pb-0.5 mx-4">
              <span className="invisible text-xs">Signature</span>
            </div>
            <p className="text-xs text-stone-800 mt-2">( ...................................... )</p>
            <p className="text-xs text-stone-500 mt-1">วันที่ ........................</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-stone-500 mb-8">ผู้รับสินค้า (Received By)</p>
            <div className="border-b border-stone-400 mb-1 pb-0.5 mx-4">
              <span className="invisible text-xs">Signature</span>
            </div>
            <p className="text-xs text-stone-800 mt-2">( ...................................... )</p>
            <p className="text-xs text-stone-500 mt-1">วันที่ ........................</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-stone-500 mb-8">ผู้ตรวจสอบ (Inspected By)</p>
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
