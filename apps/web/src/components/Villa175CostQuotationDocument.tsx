import React, { useState } from 'react';
import { FileText, Building2, EyeOff, Eye, AlertTriangle } from 'lucide-react';
import { ProjectData, QuotationItem } from '../utils/projectData';
import { loadCompanyProfile } from '../utils/companyProfile';

interface CostQuotationProps {
  project: ProjectData;
}

export function Villa175CostQuotationDocument({ project }: CostQuotationProps) {
  const [hidePrices, setHidePrices] = useState(false);
  const co = loadCompanyProfile();
  const quotationData = project.quotationData;

  // คำนวณราคา
  const calculateCost = (item: QuotationItem): number => {
    if (!item.quantity || item.quantity === '') return 0;
    const qty = Number(item.quantity);
    const unitPrice = Number(item.unitPrice) || 0;
    const laborCost = Number(item.laborCost) || 0;
    return qty * (unitPrice + laborCost);
  };

  const calculateSelling = (item: QuotationItem, mainCat: string): number => {
    const cost = calculateCost(item);
    const profitMultiplier = mainCat === 'A' ? 1.00 : 1.20;
    return cost * profitMultiplier;
  };

  // แยกหมวดหมู่
  const categoryGroups: { [key: string]: { name: string; items: QuotationItem[]; cost: number; selling: number } } = {};

  quotationData.forEach(item => {
    const mainCat = item.no.split('.')[0];
    
    if (item.no === mainCat && item.quantity === '') {
      if (!categoryGroups[mainCat]) {
        categoryGroups[mainCat] = {
          name: item.description,
          items: [],
          cost: 0,
          selling: 0
        };
      }
    } else if (item.quantity !== '') {
      if (!categoryGroups[mainCat]) {
        categoryGroups[mainCat] = {
          name: '',
          items: [],
          cost: 0,
          selling: 0
        };
      }
      categoryGroups[mainCat].items.push(item);
      categoryGroups[mainCat].cost += calculateCost(item);
      categoryGroups[mainCat].selling += calculateSelling(item, mainCat);
    }
  });

  // คำนวณยอดรวม
  const totalCost = Object.values(categoryGroups).reduce((sum, cat) => sum + cat.cost, 0);
  const totalSelling = Object.values(categoryGroups).reduce((sum, cat) => sum + cat.selling, 0);
  const operationFee = totalSelling * 0.05;
  const grandTotal = totalSelling + operationFee;
  const totalProfit = grandTotal - totalCost;
  const profitPercent = totalCost > 0 ? ((totalProfit / totalCost) * 100) : 0;

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('th-TH', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div id="cost-quotation-doc" className="max-w-[210mm] mx-auto bg-white print:shadow-none">
      <style>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 12mm;
          }
          body {
            margin: 0;
            padding: 0;
          }
          #cost-quotation-doc {
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
      <div className="bg-gradient-to-br from-red-800 via-red-700 to-red-900 text-white px-6 py-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,.02)_50%,transparent_75%,transparent_100%)] bg-[length:250px_250px]"></div>
        <div className="relative">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-white/10 backdrop-blur-sm p-2 rounded-lg border border-white/20">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl tracking-wider mb-0.5">{(co.companyName || co.companyNameTh || 'ชื่อบริษัท').toUpperCase()}</h1>
                <p className="text-xs text-red-200">{co.tagline || 'Interior Design & Construction'}</p>
              </div>
              <div className="border-l border-white/30 pl-4 ml-2">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  <h2 className="text-lg tracking-wide">ใบเสนอราคาต้นทุน</h2>
                </div>
                <p className="text-xs text-red-200 mt-0.5">COST QUOTATION (ฉบับภายใน - แบบละเอียด)</p>
              </div>
            </div>
            <div className="print:hidden">
              <button
                onClick={() => setHidePrices(!hidePrices)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                  hidePrices
                    ? 'bg-white text-red-800 hover:bg-red-50'
                    : 'bg-white/20 text-white border border-white/30 hover:bg-white/30'
                }`}
              >
                {hidePrices ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                <span className="text-sm">{hidePrices ? 'แสดงราคา' : 'ซ่อนราคา'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Warning Banner */}
      <div className="px-6 py-3 bg-amber-100 border-b-2 border-amber-400 print:hidden">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-700" />
          <div className="flex-1 text-sm text-amber-800">
            <p className="mb-1">⚠️ <strong>เอกสารลับ - ฉบับภายใน:</strong> ไม่ส่งลูกค้า!</p>
            <p className="text-xs">ใช้ปุ่ม "ซ่อนราคา" ก่อนส่งให้ช่างเสนอราคาวัสดุ</p>
          </div>
        </div>
      </div>

      {/* Project Info */}
      <div className="px-6 py-3 bg-gradient-to-r from-red-50 to-white border-b border-red-200">
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-red-900 mb-0.5 text-xs">โครงการ:</p>
            <p className="text-base text-red-800">{project.name}</p>
          </div>
          <div>
            <p className="text-red-900 mb-0.5 text-xs">เลขที่:</p>
            <p className="text-base text-red-800">COST-2568-175</p>
          </div>
          <div>
            <p className="text-red-900 mb-0.5 text-xs">วันที่:</p>
            <p className="text-base text-red-800">18 ธันวาคม 2568</p>
          </div>
        </div>
      </div>

      {/* BOQ Detail */}
      <div className="px-6 py-4">
        <div className="space-y-3">
          {Object.entries(categoryGroups).map(([catKey, category]) => {
            if (category.items.length === 0) return null;
            
            const profitAmount = category.selling - category.cost;
            const profitPercent = category.cost > 0 ? ((profitAmount / category.cost) * 100) : 0;
            
            return (
              <div key={catKey} className="border border-red-200 rounded-lg overflow-hidden print:page-break-inside-avoid">
                <div className="bg-gradient-to-r from-red-600 to-red-700 text-white px-4 py-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm">{catKey}) {category.name}</h4>
                    <div className="flex items-center gap-4 text-xs">
                      <span className="bg-white/10 backdrop-blur-sm px-2 py-1 rounded">
                        ต้นทุน: {hidePrices ? '฿ ***' : formatCurrency(category.cost) + ' ฿'}
                      </span>
                      <span className="bg-white/20 backdrop-blur-sm px-2 py-1 rounded">
                        ขาย: {hidePrices ? '฿ ***' : formatCurrency(category.selling) + ' ฿'}
                      </span>
                      <span className="bg-green-500/30 backdrop-blur-sm px-2 py-1 rounded">
                        กำไร: {hidePrices ? '***' : `${formatCurrency(profitAmount)} ฿ (${profitPercent.toFixed(1)}%)`}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="bg-white">
                  <table className="w-full text-[10px]">
                    <thead className="bg-red-50">
                      <tr className="border-b border-red-200">
                        <th className="px-2 py-1.5 text-left text-red-900 w-10">No.</th>
                        <th className="px-2 py-1.5 text-left text-red-900">รายการ</th>
                        <th className="px-2 py-1.5 text-center text-red-900 w-12">หน่วย</th>
                        <th className="px-2 py-1.5 text-center text-red-900 w-12">จำนวน</th>
                        <th className="px-2 py-1.5 text-right text-red-900 w-16">วัสดุ/หน่วย</th>
                        <th className="px-2 py-1.5 text-right text-red-900 w-16">แรง/หน่วย</th>
                        <th className="px-2 py-1.5 text-right text-red-900 w-20">ต้นทุนรวม</th>
                        <th className="px-2 py-1.5 text-right text-red-900 w-20">ราคาขาย</th>
                        <th className="px-2 py-1.5 text-right text-red-900 w-16">กำไร</th>
                      </tr>
                    </thead>
                    <tbody>
                      {category.items.map((item, idx) => {
                        const cost = calculateCost(item);
                        const selling = calculateSelling(item, catKey);
                        const profit = selling - cost;
                        const unitPrice = Number(item.unitPrice) || 0;
                        const laborCost = Number(item.laborCost) || 0;
                        const profitPercent = cost > 0 ? ((profit / cost) * 100) : 0;
                        
                        return (
                          <tr key={idx} className="border-b border-red-100 hover:bg-red-50">
                            <td className="px-2 py-1.5 text-slate-600">{item.no}</td>
                            <td className="px-2 py-1.5">
                              <p className="text-slate-800">{item.description}</p>
                              {item.scopeDetails && (
                                <div className="mt-0.5 text-[9px] text-slate-500">
                                  {item.scopeDetails.split('\n').slice(0, 2).map((line, i) => (
                                    <p key={i}>{line}</p>
                                  ))}
                                </div>
                              )}
                            </td>
                            <td className="px-2 py-1.5 text-center text-slate-600">{item.unit}</td>
                            <td className="px-2 py-1.5 text-center text-slate-600">{item.quantity}</td>
                            <td className="px-2 py-1.5 text-right text-slate-600">
                              {hidePrices ? '***' : (unitPrice > 0 ? formatCurrency(unitPrice) : '-')}
                            </td>
                            <td className="px-2 py-1.5 text-right text-slate-600">
                              {hidePrices ? '***' : (laborCost > 0 ? formatCurrency(laborCost) : '-')}
                            </td>
                            <td className="px-2 py-1.5 text-right text-red-800">
                              {hidePrices ? '***' : (cost > 0 ? formatCurrency(cost) : '-')}
                            </td>
                            <td className="px-2 py-1.5 text-right text-purple-800">
                              {hidePrices ? '***' : (selling > 0 ? formatCurrency(selling) : '-')}
                            </td>
                            <td className="px-2 py-1.5 text-right text-green-700">
                              {hidePrices ? '***' : (profit > 0 ? `${formatCurrency(profit)} (${profitPercent.toFixed(0)}%)` : '-')}
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
      <div className="px-6 py-4 bg-gradient-to-r from-red-50 to-white print:page-break-inside-avoid">
        <div className="grid grid-cols-3 gap-6 text-sm">
          <div className="bg-white border border-red-200 rounded-lg p-4">
            <p className="text-xs text-red-700 mb-2">ต้นทุนทั้งหมด:</p>
            <p className="text-2xl text-red-800">{hidePrices ? '฿ ***' : formatCurrency(totalCost) + ' ฿'}</p>
          </div>
          <div className="bg-white border border-purple-200 rounded-lg p-4">
            <p className="text-xs text-purple-700 mb-2">ราคาขายลูกค้า (ก่อน +5%):</p>
            <p className="text-2xl text-purple-800">{hidePrices ? '฿ ***' : formatCurrency(totalSelling) + ' ฿'}</p>
          </div>
          <div className="bg-white border border-green-200 rounded-lg p-4">
            <p className="text-xs text-green-700 mb-2">กำไรรวม (ก่อน +5%):</p>
            <p className="text-2xl text-green-800">
              {hidePrices ? '฿ *** (**%)' : `${formatCurrency(totalSelling - totalCost)} ฿ (${((totalSelling - totalCost) / totalCost * 100).toFixed(1)}%)`}
            </p>
          </div>
        </div>

        <div className="mt-4 bg-blue-50 border-2 border-blue-300 rounded-lg p-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-blue-900 mb-2">คำนวณราคาลูกค้าสุดท้าย:</p>
              <div className="space-y-1 text-xs text-slate-700">
                <div className="flex justify-between">
                  <span>รวมค่าใช้จ่ายโดยตรง:</span>
                  <span className="text-blue-800">{hidePrices ? '***' : formatCurrency(totalSelling) + ' ฿'}</span>
                </div>
                <div className="flex justify-between">
                  <span>+ ค่าดำเนินการ 5%:</span>
                  <span className="text-blue-800">{hidePrices ? '***' : formatCurrency(operationFee) + ' ฿'}</span>
                </div>
                <div className="flex justify-between border-t border-blue-300 pt-1 mt-1">
                  <span className="text-base">ยอดชำระทั้งหมด (Grand Total):</span>
                  <span className="text-base text-blue-900">{hidePrices ? '***' : formatCurrency(grandTotal) + ' ฿'}</span>
                </div>
              </div>
            </div>
            <div>
              <p className="text-green-900 mb-2">สรุปกำไรสุดท้าย:</p>
              <div className="space-y-1 text-xs text-slate-700">
                <div className="flex justify-between">
                  <span>ต้นทุนรวม:</span>
                  <span className="text-red-800">{hidePrices ? '***' : formatCurrency(totalCost) + ' ฿'}</span>
                </div>
                <div className="flex justify-between">
                  <span>ราคาลูกค้า (รวม +5%):</span>
                  <span className="text-purple-800">{hidePrices ? '***' : formatCurrency(grandTotal) + ' ฿'}</span>
                </div>
                <div className="flex justify-between border-t border-green-300 pt-1 mt-1">
                  <span className="text-base text-green-900">กำไรสุทธิ:</span>
                  <span className="text-base text-green-900">
                    {hidePrices ? '*** (**%)' : `${formatCurrency(totalProfit)} ฿ (${profitPercent.toFixed(1)}%)`}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="px-6 py-4 bg-amber-50 border-t-2 border-amber-300">
        <h3 className="text-sm text-amber-900 mb-2">หมายเหตุ:</h3>
        <ul className="space-y-1 text-xs text-amber-800 pl-4">
          <li>• <strong>ค่าออกแบบ (หมวด A):</strong> 30,000 บาท เป็นราคาลูกค้าสุดท้าย (ไม่บวกกำไร 20%)</li>
          <li>• <strong>หมวดอื่นๆ (B-P):</strong> บวกกำไร 20% ทั้งหมด</li>
          <li>• <strong>ค่าดำเนินการ 5%:</strong> คำนวณจากยอดรวมหลังบวกกำไร 20% แล้ว</li>
          <li>• <strong>Top หินสังเคราะห์:</strong> ลูกค้าจัดหาเอง (ครัว + โต๊ะเครื่องแป้ง) - ไม่มีต้นทุนในใบนี้</li>
          <li>• <strong>การใช้งาน:</strong> ใช้ปุ่ม "ซ่อนราคา" ก่อนส่งให้ช่างเสนอราคาวัสดุ เพื่อไม่ให้เห็นต้นทุนและกำไร</li>
        </ul>
      </div>

      {/* Footer */}
      <div className="bg-gradient-to-r from-red-800 to-red-700 text-white py-2 text-center">
        <p className="text-xs text-red-200">⚠️ เอกสารลับ - ฉบับภายใน • ห้ามส่งลูกค้า • {co.companyName || co.companyNameTh || 'ชื่อบริษัท'}</p>
      </div>

      {/* Print Button */}
      <div className="p-4 bg-white border-t border-red-200 print:hidden">
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.print()}
            className="flex-1 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white py-2 px-6 rounded-lg transition-all shadow-md hover:shadow-lg text-sm"
          >
            พิมพ์ใบเสนอราคาต้นทุน / Print Cost Quotation
          </button>
          <button
            onClick={() => setHidePrices(!hidePrices)}
            className={`px-6 py-2 rounded-lg transition-all text-sm ${
              hidePrices
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-amber-600 hover:bg-amber-700 text-white'
            }`}
          >
            {hidePrices ? 'แสดงราคาก่อนพิมพ์' : 'ซ่อนราคาก่อนส่งช่าง'}
          </button>
        </div>
      </div>
    </div>
  );
}
