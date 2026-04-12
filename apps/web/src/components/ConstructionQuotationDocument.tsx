import React from 'react';
import { FileText, Building2, Mail, Phone, User, CheckCircle2, EyeOff, Eye } from 'lucide-react';
import { ProjectData, QuotationItem } from '../utils/projectData';
import { loadCompanyProfile } from '../utils/companyProfile';
import { getDocumentCompanyTagline, getDocumentCompanyTitle } from '../utils/documentBrand';
import { findBankByName } from '../utils/thaiBankData';

interface QuotationProps {
  project: ProjectData;
}

export function ConstructionQuotationDocument({ project }: QuotationProps) {
  const co = loadCompanyProfile();
  const [hidePrices, setHidePrices] = React.useState(false);
  const quotationData = project.quotationData;

  // คำนวณราคา
  const calculateAmount = (item: QuotationItem): number => {
    if (!item.quantity || item.quantity === '') return 0;
    const qty = Number(item.quantity);
    const unitPrice = Number(item.unitPrice) || 0;
    const laborCost = Number(item.laborCost) || 0;
    return qty * (unitPrice + laborCost);
  };

  // แยกหมวดหมู่
  const categoryGroups: { [key: string]: { name: string; items: QuotationItem[]; selling: number } } = {};

  quotationData.forEach(item => {
    const mainCat = item.no.split('.')[0];
    
    // ถ้าเป็นหัวข้อหลัก
    if (item.no === mainCat && item.quantity === '') {
      if (!categoryGroups[mainCat]) {
        categoryGroups[mainCat] = {
          name: item.description,
          items: [],
          selling: 0
        };
      }
    } else if (item.quantity !== '') {
      // ถ้าเป็นรายการย่อย
      if (!categoryGroups[mainCat]) {
        categoryGroups[mainCat] = {
          name: '',
          items: [],
          selling: 0
        };
      }
      categoryGroups[mainCat].items.push(item);
      
      const itemCost = calculateAmount(item);
      // บวกกำไร 25% ทุกหมวด
      categoryGroups[mainCat].selling += itemCost * 1.25;
    }
  });

  // คำนวณยอดรวม
  const totalSelling = Object.values(categoryGroups).reduce((sum, cat) => sum + cat.selling, 0);
  const operationFee = totalSelling * 0.05;
  const grandTotal = totalSelling + operationFee;

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
    <div id="construction-quotation-doc" className="max-w-[210mm] mx-auto bg-white print:shadow-none">
      {(!co?.companyName && !co?.phone) && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mx-8 mt-4 print:hidden">
          <p className="text-sm text-amber-800">กรุณากรอกข้อมูลบริษัทในหน้า "ข้อมูลบริษัท" ก่อนพิมพ์เอกสาร</p>
        </div>
      )}
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 10mm;
          }
          body {
            margin: 0;
            padding: 0;
            font-size: 9pt;
          }
          #construction-quotation-doc {
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
      <div className="bg-gradient-to-br from-orange-600 via-orange-500 to-orange-700 text-white px-4 py-2 relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,.02)_50%,transparent_75%,transparent_100%)] bg-[length:250px_250px]"></div>
        <div className="relative">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/10 backdrop-blur-sm p-1.5 rounded-lg border border-white/20">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl tracking-wider mb-0.5">{getDocumentCompanyTitle(co)}</h1>
                <p className="text-[9px] text-orange-200">{getDocumentCompanyTagline(co)}</p>
              </div>
              <div className="border-l border-white/30 pl-3 ml-1">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <FileText className="w-3.5 h-3.5" />
                  <h2 className="text-base tracking-wide">ใบเสนอราคา</h2>
                </div>
                <p className="text-[9px] text-orange-200">งานก่อสร้างและปรับปรุง</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quotation Info */}
      <div className="px-4 py-1.5 bg-gradient-to-r from-orange-50 to-white border-b border-orange-200">
        <div className="grid grid-cols-2 gap-3 text-[10px]">
          <div>
            <p className="text-orange-900 mb-0.5">เลขที่ใบเสนอราคา:</p>
            <p className="text-xs text-orange-800">QT-CONST-2569-001</p>
          </div>
          <div>
            <p className="text-orange-900 mb-0.5">วันที่:</p>
            <p className="text-xs text-orange-800">3 มกราคม 2569</p>
          </div>
        </div>
      </div>

      {/* Company & Customer Info */}
      <div className="px-4 py-1.5 grid grid-cols-2 gap-3 text-[10px] border-b border-orange-100">
        <div className="space-y-0.5">
          <h3 className="text-orange-900 mb-0.5 text-xs">ผู้เสนอราคา (Contractor):</h3>
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
          <h3 className="text-orange-900 mb-0.5 text-xs">ลูกค้า (Client):</h3>
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
      <div className="px-4 py-1.5 bg-orange-50 border-b border-orange-100">
        <h3 className="text-xs text-orange-900 mb-0.5">โครงการ:</h3>
        <p className="text-sm text-orange-800 mb-0.5">{project.name}</p>
        <p className="text-[9px] text-slate-600">งานก่อสร้างและปรับปรุงพื้นที่ (ครบวงจร)</p>
      </div>

      {/* BOQ Detail */}
      <div className="px-4 py-2">
        <h3 className="text-xs text-orange-900 mb-2">รายการและราคา (Bill of Quantities):</h3>
        
        <div className="space-y-2">
          {Object.entries(categoryGroups).map(([catKey, category]) => {
            if (category.items.length === 0) return null;
            
            return (
              <div key={catKey} className="border border-orange-200 rounded-md overflow-hidden print:page-break-inside-avoid">
                <div className="bg-gradient-to-r from-orange-600 to-orange-700 text-white px-3 py-1.5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs">หมวดที่ {catKey}) {category.name}</h4>
                    <span className="text-xs bg-white/20 backdrop-blur-sm px-2 py-0.5 rounded">
                      {hidePrices ? '***' : `${formatCurrency(category.selling)} บาท`}
                    </span>
                  </div>
                </div>
                <div className="bg-white">
                  <table className="w-full text-[10px]">
                    <thead className="bg-orange-50">
                      <tr className="border-b border-orange-200">
                        <th className="px-2 py-1 text-left text-orange-900 w-10">ลำดับ</th>
                        <th className="px-2 py-1 text-left text-orange-900">รายการ</th>
                        <th className="px-2 py-1 text-center text-orange-900 w-12">หน่วย</th>
                        <th className="px-2 py-1 text-center text-orange-900 w-12">จำนวน</th>
                        <th className="px-2 py-1 text-right text-orange-900 w-20">ราคา (บาท)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {category.items.map((item, idx) => {
                        const itemCost = calculateAmount(item);
                        
                        return (
                          <tr key={idx} className="border-b border-orange-100 hover:bg-orange-50">
                            <td className="px-2 py-1 text-slate-600">{item.no}</td>
                            <td className="px-2 py-1">
                              <div>
                                <p className="text-slate-800">{item.description}</p>
                                {item.scopeDetails && (
                                  <div className="mt-0.5 pl-2 text-[9px] text-slate-500 space-y-0.5">
                                    {item.scopeDetails.split('\n').map((line, i) => (
                                      <p key={i}>{line}</p>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-2 py-1 text-center text-slate-600">{item.unit}</td>
                            <td className="px-2 py-1 text-center text-slate-600">{item.quantity}</td>
                            <td className="px-2 py-1 text-right text-orange-800">
                              {hidePrices ? '***' : (itemCost > 0 ? formatCurrency(itemCost) : '-')}
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
      <div className="px-4 py-2 bg-gradient-to-r from-orange-50 to-white print:page-break-inside-avoid">
        <div className="max-w-md ml-auto space-y-2 text-xs">
          <div className="flex justify-between items-center">
            <span className="text-slate-600">รวมราคางาน:</span>
            <span className="text-slate-800">{hidePrices ? '***' : `${formatCurrency(totalSelling)} บาท`}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-600">ค่าดำเนินการ:</span>
            <span className="text-slate-800">{hidePrices ? '***' : `${formatCurrency(operationFee)} บาท`}</span>
          </div>
          <div className="flex justify-between items-center pb-1.5 border-b border-orange-200">
            <span className="text-base text-orange-900">รวมเสนอราคา:</span>
            <span className="text-xl text-orange-900">{hidePrices ? '***' : `${formatCurrency(grandTotal)} บาท`}</span>
          </div>
          {!hidePrices && (
            <p className="text-[10px] text-slate-600 text-right">({numberToThaiText(grandTotal)})</p>
          )}
        </div>
      </div>

      {/* Payment Terms - 70/30 */}
      <div className="px-4 py-2 bg-blue-50 border-y-2 border-blue-200 print:page-break-inside-avoid">
        <h3 className="text-xs text-blue-900 mb-2 flex items-center gap-1.5">
          <CheckCircle2 className="w-4 h-4" />
          <span>เงื่อนไขการชำระเงิน:</span>
        </h3>
        <div className="grid grid-cols-2 gap-3 text-[10px] text-slate-700">
          <div>
            <p className="mb-1.5">แบ่งชำระ 2 งวด:</p>
            <ul className="space-y-0.5 pl-3">
              <li>• งวดที่ 1: 70% มัดจำเริ่มงาน</li>
              <li>• งวดที่ 2: 30% ส่งมอบงาน</li>
            </ul>
          </div>
          <div>
            <p className="mb-1.5">ช่องทางชำระเงิน:</p>
            <div className="flex items-center gap-1.5">
              {(() => { const _bi = findBankByName(co?.bankAccounts?.[0]?.bankName || ""); return _bi ? <img src={_bi.icon} alt={_bi.symbol} className="w-5 h-5 object-contain" /> : null; })()}
              <span className="text-blue-800">{co.bankAccounts[0]?.bankName || '-'} {co.bankAccounts[0]?.accountNumber || '-'}</span>
            </div>
            <p className="text-[9px] text-slate-600 mt-0.5">{co.bankAccounts[0]?.accountName || '-'}</p>
          </div>
        </div>
      </div>

      {/* Important Notes */}
      <div className="px-4 py-2 bg-amber-50 border-t-2 border-amber-300">
        <h3 className="text-xs text-amber-900 mb-1.5">หมายเหตุสำคัญ:</h3>
        <ul className="space-y-0.5 text-[10px] text-amber-800 pl-3">
          <li>• ราคานี้รวมค่าวัสดุและค่าแรงตามขอบเขตงานที่ระบุแล้ว</li>
          <li>• ไม่รวมค่าธรรมเนียมพิเศษ หรืองานเพิ่มเติมนอกเหนือจากรายการนี้</li>
          <li>• ราคาวัสดุอาจปรับเปลี่ยนได้หากราคาตลาดผันผวนเกิน 10%</li>
          <li>• ใบเสนอราคานี้มีผลใช้ได้ 30 วัน นับจากวันที่ออกเอกสาร</li>
          <li>• ระยะเวลาทำงานตามที่ตกลง อาจปรับเปลี่ยนตามสภาพอากาศและเหตุสุดวิสัย</li>
        </ul>
      </div>

      {/* Signature */}
      <div className="px-4 py-3 print:page-break-inside-avoid">
        <div className="grid grid-cols-2 gap-6 text-[10px]">
          <div className="space-y-2">
            <div>
              <p className="mb-6">ลงชื่อ _________________________________</p>
              <p className="text-center">( ____________________________________ )</p>
              <p className="text-center mt-0.5">ผู้รับใบเสนอราคา (ลูกค้า)</p>
              <p className="text-center text-[9px] text-slate-500 mt-1">วันที่ ____/____/________</p>
            </div>
          </div>
          <div className="space-y-2">
            <div>
              <p className="mb-6">ลงชื่อ _________________________________</p>
              <p className="text-center">( {co.signatureName || '-'} )</p>
              <p className="text-center mt-0.5">ผู้เสนอราคา / {co.companyName || '-'}</p>
              <p className="text-center text-[9px] text-slate-500 mt-1">วันที่ 3/1/2569</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gradient-to-r from-orange-800 to-orange-700 text-white py-1.5 text-center">
        <p className="text-[10px] text-orange-200">{co.companyName || co.companyNameTh || 'ชื่อบริษัท'} • {co.email || '-'} • {co.phone || '-'}</p>
      </div>

      {/* Print Button */}
      <div className="p-3 bg-white border-t border-orange-200 print:hidden">
        <div className="flex gap-2">
          <button
            onClick={() => setHidePrices(!hidePrices)}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg transition-all shadow-md hover:shadow-lg text-xs ${ 
              hidePrices
                ? 'bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white'
                : 'bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white'
            }`}
          >
            {hidePrices ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>{hidePrices ? 'แสดงราคา' : 'ซ่อนราคา'}</span>
          </button>
          <button
            onClick={() => window.print()}
            className="flex-1 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white py-1.5 px-4 rounded-lg transition-all shadow-md hover:shadow-lg text-xs"
          >
            พิมพ์ใบเสนอราคา / Print Quotation
          </button>
        </div>
      </div>
    </div>
  );
}
