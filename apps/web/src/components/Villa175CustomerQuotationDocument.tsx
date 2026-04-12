import React from 'react';
import { FileText, Building2, Mail, Phone, User, CheckCircle2, EyeOff, Eye } from 'lucide-react';
import { ProjectData, QuotationItem } from '../utils/projectData';
import { loadCompanyProfile } from '../utils/companyProfile';
import { getDocumentCompanyTagline, getDocumentCompanyTitle } from '../utils/documentBrand';
import { findBankByName } from '../utils/thaiBankData';

interface QuotationProps {
  project: ProjectData;
}

export function Villa175CustomerQuotationDocument({ project }: QuotationProps) {
  const [hidePrices, setHidePrices] = React.useState(false);
  const co = loadCompanyProfile();
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
  const categoryGroups: { [key: string]: { name: string; items: QuotationItem[]; subtotal: number } } = {};

  quotationData.forEach(item => {
    const mainCat = item.no.split('.')[0];
    
    // ถ้าเป็นหัวข้อหลัก
    if (item.no === mainCat && item.quantity === '') {
      if (!categoryGroups[mainCat]) {
        categoryGroups[mainCat] = {
          name: item.description,
          items: [],
          subtotal: 0
        };
      }
    } else if (item.quantity !== '') {
      // ถ้าเป็นรายการย่อย
      if (!categoryGroups[mainCat]) {
        categoryGroups[mainCat] = {
          name: '',
          items: [],
          subtotal: 0
        };
      }
      categoryGroups[mainCat].items.push(item);
      
      // คำนวณราคาเสนอลูกค้า (ค่าออกแบบไม่บวกกำไร, อื่นๆบวก 25%)
      const profitMultiplier = mainCat === 'A' ? 1.00 : 1.25;
      categoryGroups[mainCat].subtotal += calculateAmount(item) * profitMultiplier;
    }
  });

  // คำนวณยอดรวม
  const subtotal = Object.values(categoryGroups).reduce((sum, cat) => sum + cat.subtotal, 0);
  const operationFee = subtotal * 0.05;
  const grandTotal = subtotal + operationFee;

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
            margin: 10mm;
          }
          body {
            margin: 0;
            padding: 0;
            font-size: 9pt;
          }
          #customer-quotation-doc {
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
        }
      `}</style>

      {/* Header */}
      <div className="bg-gradient-to-br from-cyan-600 via-teal-600 to-cyan-700 text-white px-6 py-3 relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,.02)_50%,transparent_75%,transparent_100%)] bg-[length:250px_250px]"></div>
        <div className="relative">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-white/10 backdrop-blur-sm p-2 rounded-lg border border-white/20">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl tracking-wider mb-0.5">{getDocumentCompanyTitle(co)}</h1>
                <p className="text-xs text-cyan-200">{getDocumentCompanyTagline(co)}</p>
              </div>
              <div className="border-l border-white/30 pl-4 ml-2">
                <div className="flex items-center gap-2 mb-0.5">
                  <FileText className="w-4 h-4" />
                  <h2 className="text-lg tracking-wide">ใบเสนอราคา</h2>
                </div>
                <p className="text-[10px] text-cyan-200">QUOTATION</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quotation Info */}
      <div className="px-6 py-2 bg-gradient-to-r from-cyan-50 to-white border-b border-cyan-200">
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <p className="text-cyan-900 mb-0.5">เลขที่ใบเสนอราคา:</p>
            <p className="text-sm text-cyan-800">QT-2568-175</p>
          </div>
          <div>
            <p className="text-cyan-900 mb-0.5">วันที่:</p>
            <p className="text-sm text-cyan-800">18 ธันวาคม 2568</p>
          </div>
        </div>
      </div>

      {/* Company & Customer Info */}
      <div className="px-6 py-2 grid grid-cols-2 gap-4 text-xs border-b border-cyan-100">
        <div className="space-y-1">
          <h3 className="text-cyan-900 mb-1 text-sm">ผู้เสนอราคา (Seller):</h3>
          <p className="text-sm">{co.companyName || '-'}</p>
          <p className="text-[10px] text-slate-600">{co.address || '-'}</p>
          <div className="flex items-center gap-2 text-[10px] text-slate-600 mt-1">
            <Phone className="w-3 h-3" />
            <span>{co.phone || '-'}</span>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-slate-600">
            <Mail className="w-3 h-3" />
            <span>{co.email || '-'}</span>
          </div>
        </div>
        <div className="space-y-1">
          <h3 className="text-cyan-900 mb-1 text-sm">ลูกค้า (Customer):</h3>
          <div className="flex items-center gap-2 text-sm mb-1">
            <User className="w-3 h-3 text-slate-500" />
            <span>{project.owner || '____________________'}</span>
          </div>
          <p className="text-[10px] text-slate-600">{project.address}</p>
          {project.phone && project.phone !== '-' && (
            <div className="flex items-center gap-2 text-[10px] text-slate-600 mt-1">
              <Phone className="w-3 h-3" />
              <span>{project.phone}</span>
            </div>
          )}
        </div>
      </div>

      {/* Project Info */}
      <div className="px-6 py-2 bg-cyan-50 border-b border-cyan-100">
        <h3 className="text-sm text-cyan-900 mb-1">โครงการ:</h3>
        <p className="text-base text-cyan-800 mb-0.5">{project.name}</p>
        <p className="text-[10px] text-slate-600">งานรีโนเวทคอนโด 2 ห้องนอน (ครบวงจร) - ระยะเวลา 13 สัปดาห์</p>
      </div>

      {/* BOQ Detail */}
      <div className="px-6 py-3">
        <h3 className="text-base text-cyan-900 mb-3">รายการและราคา (Bill of Quantities):</h3>
        
        <div className="space-y-4">
          {Object.entries(categoryGroups).map(([catKey, category]) => {
            if (category.items.length === 0) return null;
            
            return (
              <div key={catKey} className="border border-cyan-200 rounded-lg overflow-hidden print:page-break-inside-avoid">
                <div className="bg-gradient-to-r from-cyan-600 to-cyan-700 text-white px-4 py-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm">{catKey}) {category.name}</h4>
                    <span className="text-sm bg-white/20 backdrop-blur-sm px-3 py-1 rounded">
                      {hidePrices ? '***' : `${formatCurrency(category.subtotal)} บาท`}
                    </span>
                  </div>
                </div>
                <div className="bg-white">
                  <table className="w-full text-xs">
                    <thead className="bg-cyan-50">
                      <tr className="border-b border-cyan-200">
                        <th className="px-3 py-2 text-left text-cyan-900 w-12">ลำดับ</th>
                        <th className="px-3 py-2 text-left text-cyan-900">รายการ</th>
                        <th className="px-3 py-2 text-center text-cyan-900 w-16">หน่วย</th>
                        <th className="px-3 py-2 text-center text-cyan-900 w-16">จำนวน</th>
                        <th className="px-3 py-2 text-right text-cyan-900 w-24">ราคารวม (บาท)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {category.items.map((item, idx) => {
                        const profitMultiplier = catKey === 'A' ? 1.00 : 1.25;
                        const itemTotal = calculateAmount(item) * profitMultiplier;
                        
                        return (
                          <tr key={idx} className="border-b border-cyan-100 hover:bg-cyan-50">
                            <td className="px-3 py-2 text-slate-600">{item.no}</td>
                            <td className="px-3 py-2">
                              <div>
                                <p className="text-slate-800">{item.description}</p>
                                {item.scopeDetails && (
                                  <div className="mt-1 pl-3 text-[10px] text-slate-500 space-y-0.5">
                                    {item.scopeDetails.split('\n').map((line, i) => (
                                      <p key={i}>{line}</p>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-2 text-center text-slate-600">{item.unit}</td>
                            <td className="px-3 py-2 text-center text-slate-600">{item.quantity}</td>
                            <td className="px-3 py-2 text-right text-cyan-800">
                              {hidePrices ? '***' : (itemTotal > 0 ? formatCurrency(itemTotal) : '-')}
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
      <div className="px-8 py-4 bg-gradient-to-r from-cyan-50 to-white print:page-break-inside-avoid">
        <div className="max-w-md ml-auto space-y-3 text-sm">
          <div className="flex justify-between items-center pb-2">
            <span className="text-slate-700">รวมค่าใช้จ่ายโดยตรง:</span>
            <span className="text-cyan-800">{hidePrices ? '***' : `${formatCurrency(subtotal)} บาท`}</span>
          </div>
          <div className="flex justify-between items-center pb-2">
            <span className="text-slate-700">ค่าดำเนินการ 5%:</span>
            <span className="text-cyan-800">{hidePrices ? '***' : `${formatCurrency(operationFee)} บาท`}</span>
          </div>
          <div className="border-t-2 border-cyan-300 pt-3">
            <div className="flex justify-between items-center">
              <span className="text-lg text-cyan-900">ยอดชำระทั้งหมด:</span>
              <span className="text-2xl text-cyan-900">{hidePrices ? '***' : `${formatCurrency(grandTotal)} บาท`}</span>
            </div>
            {!hidePrices && (
              <p className="text-xs text-slate-600 mt-1 text-right">({numberToThaiText(grandTotal)})</p>
            )}
          </div>
        </div>
      </div>

      {/* Payment Terms */}
      <div className="px-8 py-4 bg-blue-50 border-y-2 border-blue-200 print:page-break-inside-avoid">
        <h3 className="text-base text-blue-900 mb-3 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5" />
          <span>เงื่อนไขการชำระเงิน:</span>
        </h3>
        <div className="grid grid-cols-2 gap-4 text-xs text-slate-700">
          <div>
            <p className="mb-2">แบ่งชำระ 5 งวด:</p>
            <ul className="space-y-1 pl-4">
              <li>• งวดที่ 1: 20% มัดจำเริ่มงาน</li>
              <li>• งวดที่ 2: 20% โครงสร้าง+ระบบเสร็จ</li>
              <li>• งวดที่ 3: 30% ห้องน้ำ+ฝ้า+พื้น+สีเสร็จ</li>
              <li>• งวดที่ 4: 20% Built-in เสร็จ 50%</li>
              <li>• งวดที่ 5: 10% ส่งมอบงาน</li>
            </ul>
          </div>
          <div>
            <p className="mb-2">ระยะเวลา:</p>
            <ul className="space-y-1 pl-4">
              <li>• ระยะเวลาทำงาน 13 สัปดาห์</li>
              <li>• นับจากวันลงนามสัญญา</li>
              <li>• รายละเอียดดูแผนการทำงานแนบท้าย</li>
            </ul>
            <p className="mt-3 mb-2">ช่องทางชำระเงิน:</p>
            <div className="flex items-center gap-2">
              {(() => { const _bi = findBankByName(co?.bankAccounts?.[0]?.bankName || ""); return _bi ? <img src={_bi.icon} alt={_bi.symbol} className="w-6 h-6 object-contain" /> : null; })()}
              <span className="text-blue-800">{co.bankAccounts[0]?.bankName || '-'} {co.bankAccounts[0]?.accountNumber || '-'}</span>
            </div>
            <p className="text-[10px] text-slate-600 mt-1">{co.bankAccounts[0]?.accountName || '-'}</p>
          </div>
        </div>
      </div>

      {/* Scope & Warranty */}
      <div className="px-8 py-4 print:page-break-inside-avoid">
        <h3 className="text-base text-cyan-900 mb-3">ขอบเขตงานและการรับประกัน:</h3>
        <div className="grid grid-cols-2 gap-4 text-xs text-slate-700">
          <div>
            <p className="text-cyan-800 mb-2">รวมในราคา:</p>
            <ul className="space-y-1 pl-4">
              <li>✓ ค่าออกแบบ + แบบก่อสร้างครบชุด</li>
              <li>✓ งานรื้อถอน + ขนทิ้ง</li>
              <li>✓ งานโครงสร้าง/ก่อฉาบ</li>
              <li>✓ ระบบไฟฟ้าเดินใหม่ทั้งห้อง</li>
              <li>✓ ระบบประปา PPR</li>
              <li>✓ ห้องน้ำกันซึม 3 Coat</li>
              <li>✓ ฝ้า/พื้น SPC/สีผนัง</li>
              <li>✓ Built-in ครบทุกโซน</li>
              <li>✓ เก็บงาน + Defect 2 รอบ</li>
              <li>✓ Big Cleaning ส่งมอบ</li>
            </ul>
          </div>
          <div>
            <p className="text-cyan-800 mb-2">ไม่รวมในราคา:</p>
            <ul className="space-y-1 pl-4">
              <li>✗ Top หินสังเคราะห์ (ครัว + โต๊ะเครื่องแป้ง)</li>
              <li>✗ ค่าธรรมเนียมกับนิติฯ</li>
              <li>✗ ค่าไฟ/น้ำระหว่างก่อสร้าง</li>
              <li>✗ เครื่องใช้ไฟฟ้า (แอร์/เตา/ฮูด ฯลฯ)</li>
            </ul>
            <p className="text-cyan-800 mb-2 mt-3">การรับประกัน:</p>
            <ul className="space-y-1 pl-4">
              <li>✓ รับประกันโครงสร้าง 1 ปี</li>
              <li>✓ รับประกันงานบิ้วอิน 1 ปี</li>
              <li>✓ รับประกันระบบไฟ/ประปา 1 ปี</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Important Notes */}
      <div className="px-8 py-4 bg-amber-50 border-t-2 border-amber-300">
        <h3 className="text-base text-amber-900 mb-2">หมายเหตุสำคัญ:</h3>
        <ul className="space-y-1 text-xs text-amber-800 pl-4">
          <li>• ราคานี้รวมค่าดำเนินการ 5% แล้ว</li>
          <li>• ลูกค้าต้องจัดหา Top หินสังเคราะห์เอง (ครัว + โต๊ะเครื่องแป้ง) ก่อนสัปดาห์ที่ 9</li>
          <li>• ราคาวัสดุอาจปรับเปลี่ยนได้หากราคาตลาดผันผวนเกิน 10%</li>
          <li>• ใบเสนอราคานี้มีผลใช้ได้ 30 วัน นับจากวันที่ออกเอกสาร</li>
          <li>• ระยะเวลาอาจปรับเปลี่ยนได้ตามความพร้อมของวัสดุและเหตุสุดวิสัย</li>
        </ul>
      </div>

      {/* Signature */}
      <div className="px-8 py-6 print:page-break-inside-avoid">
        <div className="grid grid-cols-2 gap-8 text-xs">
          <div className="space-y-4">
            <div>
              <p className="mb-8">ลงชื่อ _________________________________</p>
              <p className="text-center">( ____________________________________ )</p>
              <p className="text-center mt-1">ผู้รับใบเสนอราคา (ลูกค้า)</p>
              <p className="text-center text-[10px] text-slate-500 mt-2">วันที่ ____/____/________</p>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <p className="mb-8">ลงชื่อ _________________________________</p>
              <p className="text-center">( {co.signatureName || '-'} )</p>
              <p className="text-center mt-1">ผู้เสนอราคา / {co.companyName || '-'}</p>
              <p className="text-center text-[10px] text-slate-500 mt-2">วันที่ 18/12/2568</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gradient-to-r from-cyan-800 to-cyan-700 text-white py-2 text-center">
        <p className="text-xs text-cyan-200">{co.companyName || co.companyNameTh || 'ชื่อบริษัท'} • {co.email || '-'} • {co.phone || '-'}</p>
      </div>

      {/* Print Button */}
      <div className="p-4 bg-white border-t border-cyan-200 print:hidden">
        <div className="flex gap-3">
          <button
            onClick={() => setHidePrices(!hidePrices)}
            className={`flex items-center gap-2 px-6 py-2 rounded-lg transition-all shadow-md hover:shadow-lg text-sm ${ 
              hidePrices
                ? 'bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white'
                : 'bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white'
            }`}
          >
            {hidePrices ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            <span>{hidePrices ? 'แสดงราคา' : 'ซ่อนราคา (ส่งช่างเสนอราคา)'}</span>
          </button>
          <button
            onClick={() => window.print()}
            className="flex-1 bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-700 hover:to-cyan-800 text-white py-2 px-6 rounded-lg transition-all shadow-md hover:shadow-lg text-sm"
          >
            พิมพ์ใบเสนอราคา / Print Quotation
          </button>
        </div>
      </div>
    </div>
  );
}
