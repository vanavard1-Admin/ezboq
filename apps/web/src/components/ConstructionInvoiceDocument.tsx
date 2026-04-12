import React from 'react';
import { Receipt, Building2, Mail, Phone, User, Calendar } from 'lucide-react';
import { ProjectData, QuotationItem, getProjectCustomerAmount, prepareProjectDocuments } from '../utils/projectData';
import { loadCompanyProfile } from '../utils/companyProfile';
import { getDocumentCompanyTagline, getDocumentCompanyTitle } from '../utils/documentBrand';
import { findBankByName } from '../utils/thaiBankData';

interface InvoiceProps {
  project: ProjectData;
}

export function ConstructionInvoiceDocument({ project }: InvoiceProps) {
  const co = loadCompanyProfile();
  const preparedProject = prepareProjectDocuments(project);
  const quotationData = preparedProject.quotationData;

  const calculateCustomerAmount = (item: QuotationItem): number => getProjectCustomerAmount(preparedProject, item);

  // แยกหมวดหมู่
  const categoryGroups: { [key: string]: { name: string; items: QuotationItem[]; selling: number } } = {};

  quotationData.forEach(item => {
    const mainCat = item.no.split('.')[0];
    
    if (item.no === mainCat && item.quantity === '') {
      if (!categoryGroups[mainCat]) {
        categoryGroups[mainCat] = {
          name: item.description,
          items: [],
          selling: 0
        };
      }
    } else if (item.quantity !== '') {
      if (!categoryGroups[mainCat]) {
        categoryGroups[mainCat] = {
          name: '',
          items: [],
          selling: 0
        };
      }
      categoryGroups[mainCat].items.push(item);
      
      categoryGroups[mainCat].selling += calculateCustomerAmount(item);
    }
  });

  // คำนวณยอดรวม
  const totalSelling = Math.round(preparedProject.customerPrice || Object.values(categoryGroups).reduce((sum, cat) => sum + cat.selling, 0));
  const operationFee = Math.round(preparedProject.operatingCost || totalSelling * 0.05);
  const grandTotal = totalSelling + operationFee;

  // งวดชำระเงิน 60% และหักยอดที่โอนมาแล้ว
  const payment1Percentage = 0.60; // 60%
  const payment1 = grandTotal * payment1Percentage;
  const paidAmount = 107816; // ยอดที่โอนมาแล้ว
  const remainingPayment = payment1 - paidAmount; // ยอดคงเหลือที่ต้องชำระ

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('th-TH', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const numberToThaiText = (num: number): string => {
    const ones = ['', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
    const positions = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน', 'ล้าน'];

    if (num === 0) return 'ศูนย์บาทถ้วน';

    const integer = Math.floor(num).toString();
    let result = '';

    const intArray = integer.split('').reverse();
    for (let i = 0; i < intArray.length; i++) {
      const digit = parseInt(intArray[i]);
      if (digit !== 0) {
        if (i === 1 && digit === 2) {
          result = 'ยี่สิบ' + result;
        } else if (i === 1 && digit === 1) {
          result = 'สิบ' + result;
        } else if (i === 0 && digit === 1 && intArray.length > 1) {
          result = 'เอ็ด' + result;
        } else {
          result = ones[digit] + positions[i] + result;
        }
      }
    }

    result = result || 'ศูนย์';
    result += 'บาทถ้วน';

    return result;
  };

  return (
    <div id="construction-invoice-doc" className="max-w-[210mm] mx-auto bg-white print:shadow-none">
      {(!co?.companyName && !co?.phone) && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mx-8 mt-4 print:hidden">
          <p className="text-sm text-amber-800">กรุณากรอกข้อมูลบริษัทในหน้า "ข้อมูลบริษัท" ก่อนพิมพ์เอกสาร</p>
        </div>
      )}
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 8mm;
          }
          body {
            margin: 0;
            padding: 0;
            font-size: 8pt;
          }
          #construction-invoice-doc {
            max-width: 100%;
          }
          .print\\:page-break-before {
            page-break-before: always;
            break-before: always;
          }
          .print\\:page-break-inside-avoid {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>

      {/* Header */}
      <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 text-white px-4 py-2 relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,.02)_50%,transparent_75%,transparent_100%)] bg-[length:250px_250px]"></div>
        <div className="relative">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/10 backdrop-blur-sm p-1.5 rounded-lg border border-white/20">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl tracking-wider mb-0.5">{getDocumentCompanyTitle(co)}</h1>
                <p className="text-[9px] text-blue-200">{getDocumentCompanyTagline(co)}</p>
              </div>
              <div className="border-l border-white/30 pl-3 ml-1">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <Receipt className="w-3.5 h-3.5" />
                  <h2 className="text-base tracking-wide">ใบแจ้งหนี้ / INVOICE</h2>
                </div>
                <p className="text-[9px] text-blue-200">งานก่อสร้างและปรับปรุง</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Invoice Info */}
      <div className="px-4 py-1.5 bg-gradient-to-r from-blue-50 to-white border-b border-blue-200">
        <div className="grid grid-cols-3 gap-3 text-[10px]">
          <div>
            <p className="text-blue-900 mb-0.5">เลขที่ใบแจ้งหนี้:</p>
            <p className="text-xs text-blue-800">INV-2569-001</p>
          </div>
          <div>
            <p className="text-blue-900 mb-0.5">วันที่:</p>
            <p className="text-xs text-blue-800">3 มกราคม 2569</p>
          </div>
          <div>
            <p className="text-blue-900 mb-0.5">ครบกำหนดชำระ:</p>
            <p className="text-xs text-blue-800">10 มกราคม 2569</p>
          </div>
        </div>
      </div>

      {/* Company & Customer Info */}
      <div className="px-4 py-1.5 grid grid-cols-2 gap-3 text-[10px] border-b border-blue-100">
        <div className="space-y-0.5">
          <h3 className="text-blue-900 mb-0.5 text-xs">จาก (From):</h3>
          <p className="text-xs">{co.companyName || '-'}</p>
          <p className="text-[9px] text-slate-600">{co.address || '-'}</p>
          <div className="flex items-center gap-1.5 text-[9px] text-slate-600 mt-0.5">
            <Phone className="w-2.5 h-2.5" />
            <span>{co.phone || '-'}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[9px] text-slate-600">
            <Mail className="w-2.5 h-2.5" />
            <span>{co.email || '-'}</span>
          </div>
        </div>
        <div className="space-y-0.5">
          <h3 className="text-blue-900 mb-0.5 text-xs">ถึง (To):</h3>
          <div className="flex items-center gap-1.5 text-xs mb-0.5">
            <User className="w-2.5 h-2.5 text-slate-500" />
            <span>{project.owner || '____________________'}</span>
          </div>
          <p className="text-[9px] text-slate-600">{project.address}</p>
          {project.phone && project.phone !== '-' && (
            <div className="flex items-center gap-1.5 text-[9px] text-slate-600 mt-0.5">
              <Phone className="w-2.5 h-2.5" />
              <span>{project.phone}</span>
            </div>
          )}
        </div>
      </div>

      {/* Project Info */}
      <div className="px-4 py-1.5 bg-blue-50 border-b border-blue-100">
        <h3 className="text-xs text-blue-900 mb-0.5">โครงการ:</h3>
        <p className="text-sm text-blue-800 mb-0.5">{project.name}</p>
        <p className="text-[9px] text-slate-600">งานก่อสร้างและปรับปรุงพื้นที่ (ครบวงจร)</p>
      </div>

      {/* Invoice Items */}
      <div className="px-4 py-2">
        <h3 className="text-xs text-blue-900 mb-2">รายการงานและราคา:</h3>
        
        <div className="space-y-2">
          {Object.entries(categoryGroups).map(([catKey, category]) => {
            if (category.items.length === 0) return null;
            
            return (
              <div key={catKey} className="border border-blue-200 rounded-md overflow-hidden print:page-break-inside-avoid">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-3 py-1.5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs">หมวดที่ {catKey}) {category.name}</h4>
                    <span className="text-xs bg-white/20 backdrop-blur-sm px-2 py-0.5 rounded">
                      {formatCurrency(category.selling)} บาท
                    </span>
                  </div>
                </div>
                <div className="bg-white">
                  <table className="w-full text-[10px]">
                    <thead className="bg-blue-50">
                      <tr className="border-b border-blue-200">
                        <th className="px-2 py-1 text-left text-blue-900 w-10">ลำดับ</th>
                        <th className="px-2 py-1 text-left text-blue-900">รายการ</th>
                        <th className="px-2 py-1 text-center text-blue-900 w-12">หน่วย</th>
                        <th className="px-2 py-1 text-center text-blue-900 w-12">จำนวน</th>
                        <th className="px-2 py-1 text-right text-blue-900 w-20">ราคารวม (บาท)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {category.items.map((item, idx) => {
                        const itemTotal = calculateCustomerAmount(item);
                        
                        return (
                          <tr key={idx} className="border-b border-blue-100 hover:bg-blue-50">
                            <td className="px-2 py-1 text-slate-600">{item.no}</td>
                            <td className="px-2 py-1">
                              <p className="text-slate-800">{item.description}</p>
                            </td>
                            <td className="px-2 py-1 text-center text-slate-600">{item.unit}</td>
                            <td className="px-2 py-1 text-center text-slate-600">{item.quantity}</td>
                            <td className="px-2 py-1 text-right text-blue-800">
                              {itemTotal > 0 ? formatCurrency(itemTotal) : '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Total Summary */}
      <div className="px-4 py-2 bg-gradient-to-r from-blue-50 to-white print:page-break-inside-avoid">
        <div className="max-w-md ml-auto space-y-2 text-xs">
          <div className="flex justify-between items-center pb-1.5 border-b border-blue-200">
            <span className="text-slate-700">รวมค่าใช้จ่ายโดยตรง:</span>
            <span className="text-blue-800">{formatCurrency(totalSelling)} บาท</span>
          </div>
          <div className="flex justify-between items-center pb-1.5 border-b border-blue-200">
            <span className="text-slate-700">ค่าดำเนินการ 5%:</span>
            <span className="text-blue-800">{formatCurrency(operationFee)} บาท</span>
          </div>
          <div className="flex justify-between items-center py-1.5 bg-blue-100 px-3 rounded-md border-2 border-blue-300">
            <span className="text-base text-blue-900">ยอดชำระทั้งหมด:</span>
            <span className="text-xl text-blue-900">{formatCurrency(grandTotal)} บาท</span>
          </div>
          <p className="text-[10px] text-slate-600 text-right">({numberToThaiText(grandTotal)})</p>
        </div>
      </div>

      {/* Payment Schedule - 60% และหักยอดที่โอนมาแล้ว */}
      <div className="px-4 py-2 bg-green-50 border-y-2 border-green-200 print:page-break-inside-avoid">
        <h3 className="text-xs text-green-900 mb-2 flex items-center gap-1.5">
          <Calendar className="w-4 h-4" />
          <span>กำหนดการชำระเงิน (Payment Schedule):</span>
        </h3>
        <div className="space-y-1.5 text-[10px]">
          <div className="bg-white rounded-md p-2 border border-green-200">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-slate-800 mb-0.5">งวดที่ 1: มัดจำเริ่มงาน (60% ของยอดรวม)</p>
                <p className="text-[9px] text-slate-600">60% × {formatCurrency(grandTotal)} บาท</p>
              </div>
              <span className="text-sm text-green-800">{formatCurrency(payment1)} บาท</span>
            </div>
          </div>
          <div className="bg-red-50 rounded-md p-2 border border-red-300">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-red-800 mb-0.5">หัก: ยอดที่โอนมาแล้ว</p>
                <p className="text-[9px] text-red-600">ชำระเมื่อ: ก่อนวันที่ 3/1/2569</p>
              </div>
              <span className="text-sm text-red-700">- {formatCurrency(paidAmount)} บาท</span>
            </div>
          </div>
          <div className="bg-gradient-to-r from-yellow-50 to-amber-50 rounded-md p-3 border-2 border-yellow-400 shadow-sm">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-base text-amber-900 mb-0.5">💰 ยอดคงเหลือที่ต้องชำระครั้งนี้:</p>
                <p className="text-[9px] text-amber-700">({formatCurrency(payment1)} - {formatCurrency(paidAmount)} = {formatCurrency(remainingPayment)})</p>
              </div>
              <span className="text-xl text-amber-900 font-bold">{formatCurrency(remainingPayment)} บาท</span>
            </div>
          </div>
          <p className="text-[10px] text-slate-600 text-center mt-2">({numberToThaiText(remainingPayment)})</p>
        </div>
      </div>

      {/* Payment Info */}
      <div className="px-4 py-2 bg-amber-50 border-b border-amber-200">
        <h3 className="text-xs text-amber-900 mb-1.5">ช่องทางชำระเงิน:</h3>
        <div className="flex items-center gap-2 bg-white rounded-md p-2 border border-amber-200">
          {(() => { const _bi = findBankByName(co?.bankAccounts?.[0]?.bankName || ""); return _bi ? <img src={_bi.icon} alt={_bi.symbol} className="w-5 h-5 object-contain" /> : null; })()}
          <div className="text-[10px]">
            <p className="text-blue-800">{co.bankAccounts[0]?.bankName || '-'} เลขที่ {co.bankAccounts[0]?.accountNumber || '-'}</p>
            <p className="text-slate-600">{co.bankAccounts[0]?.accountName || '-'}</p>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="px-4 py-2 bg-slate-50 border-b border-slate-200">
        <h3 className="text-xs text-slate-900 mb-1">หมายเหตุ:</h3>
        <ul className="space-y-0.5 text-[9px] text-slate-700 pl-3">
          <li>• กรุณาชำระเงินตามกำหนดเพื่อไม่ให้เกิดความล่าช้าในการดำเนินงาน</li>
          <li>• โปรดแจ้งกลับพร้อมหลักฐานการโอนเงินเพื่อยืนยันการชำระ</li>
          <li>• หากมีข้อสงสัยกรุณาติดต่อ {co.phone || '-'}</li>
        </ul>
      </div>

      {/* Signature */}
      <div className="px-4 py-3 print:page-break-inside-avoid">
        <div className="grid grid-cols-2 gap-6 text-[10px]">
          <div className="space-y-2">
            <div>
              <p className="mb-6">ลงชื่อ _________________________________</p>
              <p className="text-center">( ____________________________________ )</p>
              <p className="text-center mt-0.5">ผู้รับใบแจ้งหนี้ (ลูกค้า)</p>
              <p className="text-center text-[9px] text-slate-500 mt-1">วันที่ ____/____/________</p>
            </div>
          </div>
          <div className="space-y-2">
            <div>
              <p className="mb-6">ลงชื่อ _________________________________</p>
              <p className="text-center">( {co.signatureName || '-'} )</p>
              <p className="text-center mt-0.5">ผู้ออกใบแจ้งหนี้ / {co.companyName || '-'}</p>
              <p className="text-center text-[9px] text-slate-500 mt-1">วันที่ 3/1/2569</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gradient-to-r from-blue-800 to-indigo-700 text-white py-1.5 text-center">
        <p className="text-[10px] text-blue-200">{co.companyName || co.companyNameTh || 'ชื่อบริษัท'} • {co.email || '-'} • {co.phone || '-'}</p>
      </div>

      {/* Print Button */}
      <div className="p-3 bg-white border-t border-blue-200 print:hidden">
        <button
          onClick={() => window.print()}
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-2 px-4 rounded-lg transition-all shadow-md hover:shadow-lg text-xs"
        >
          พิมพ์ใบแจ้งหนี้ / Print Invoice
        </button>
      </div>
    </div>
  );
}
