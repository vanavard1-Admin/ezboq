import React from 'react';
import { FileText, Building2, EyeOff, Eye } from 'lucide-react';
import { findBankByName } from '../utils/thaiBankData';
import { ProjectData, QuotationItem } from '../utils/projectData';
import { getCurrentThaiDate } from '../utils/dateUtils';
import { loadCompanyProfile } from '../utils/companyProfile';

interface InvoiceCategory {
  no: string;
  category: string;
  amount: number;
}

interface Phase4InvoiceDocumentProps {
  project: ProjectData;
}

export function Phase4InvoiceDocument({ project }: Phase4InvoiceDocumentProps) {
  const [hidePrice, setHidePrice] = React.useState(false);
  const co = loadCompanyProfile();
  const quotationData = project.quotationData;

  const calculateAmount = (item: QuotationItem): number => {
    if (!item.quantity || item.quantity === '') return 0;
    const qty = Number(item.quantity);
    const unitPrice = Number(item.unitPrice) || 0;
    const laborCost = Number(item.laborCost) || 0;
    return qty * (unitPrice + laborCost);
  };

  // Calculate category totals - ราคาทุน
  const categoryTotals: { [key: string]: number } = {};
  quotationData.forEach(item => {
    const mainCategory = item.no.split('.')[0];
    if (!categoryTotals[mainCategory]) {
      categoryTotals[mainCategory] = 0;
    }
    categoryTotals[mainCategory] += calculateAmount(item);
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

  // ใช้ราคาเสนอลูกค้าตายตัว 600,000 บาท
  const _costTotal = invoiceCategories.reduce((sum, item) => sum + item.amount, 0); // 450,000
  const customerTotal = 600000; // ราคาเสนอลูกค้าตายตัว
  const operationFee = customerTotal * 0.05; // 5% operation fee
  const grandTotal = customerTotal + operationFee; // 600,000 + 30,000 = 630,000

  // งวดชำระเงิน 3 งวด งวดละ 200,000 บาท
  const installments = [
    { no: 1, description: 'งวดที่ 1 - มัดจำเริ่มงาน', percentage: 0, amount: 200000 },
    { no: 2, description: 'งวดที่ 2 - ระหว่างดำเนินงาน', percentage: 0, amount: 200000 },
    { no: 3, description: 'งวดที่ 3 - ส่งมอบงานเรียบร้อย', percentage: 0, amount: 230000 }, // รวม VAT และค่าดำเนินการ
  ];

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
      <div className="bg-gradient-to-br from-slate-800 via-slate-700 to-slate-900 text-white px-6 py-5 print:page-break-inside-avoid relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,.02)_50%,transparent_75%,transparent_100%)] bg-[length:250px_250px]"></div>
        
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

        <div className="relative flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-white/10 backdrop-blur-sm p-3 rounded-lg border border-white/20">
              <Building2 className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl tracking-wider mb-1">{co.companyName?.toUpperCase() || '-'}</h1>
              <p className="text-xs text-slate-300">{co.tagline || '-'}</p>
            </div>
            <div className="border-l border-white/30 pl-4 ml-2">
              <div className="flex items-center gap-2 mb-1">
                <FileText className="w-5 h-5" />
                <h2 className="text-xl tracking-wide">ใบวางบิล</h2>
              </div>
              <p className="text-[10px] text-slate-300">INVOICE - งานบิ้วอินเฟอร์นิเจอร์</p>
            </div>
          </div>
          <div className="text-right">
            <div className="bg-white/10 backdrop-blur-sm px-4 py-3 rounded-lg border border-white/20">
              <p className="text-[10px] text-slate-300 mb-1">Invoice No.</p>
              <p className="text-base mb-3">INV-2569-004</p>
              <p className="text-[10px] text-slate-300 mb-1">Date</p>
              <p className="text-sm">{getCurrentThaiDate()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Project Info */}
      <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 print:page-break-inside-avoid">
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-white rounded-lg p-3 border border-slate-200">
            <h2 className="text-[10px] text-slate-500 mb-2 pb-1.5 border-b border-slate-200">ข้อมูลโครงการ / Project Info</h2>
            <div className="space-y-1 text-xs">
              <div className="flex gap-3">
                <span className="text-slate-500 w-20 text-xs">โครงการ:</span>
                <span className="text-slate-800">{project.name}</span>
              </div>
              {project.address && (
                <div className="flex gap-3">
                  <span className="text-slate-500 w-20 text-xs">ที่อยู่:</span>
                  <span className="text-xs text-slate-700">{project.address}</span>
                </div>
              )}
            </div>
          </div>
          <div className="bg-white rounded-lg p-3 border border-slate-200">
            <h2 className="text-[10px] text-slate-500 mb-2 pb-1.5 border-b border-slate-200">ข้อมูลผู้วางบิล / Biller Info</h2>
            <div className="space-y-1 text-xs">
              <div className="flex gap-3">
                <span className="text-slate-500 w-20 text-xs">บริษัท:</span>
                <span className="text-slate-800">{co.companyName || '-'}</span>
              </div>
              <div className="flex gap-3">
                <span className="text-slate-500 w-20 text-xs">อีเมล:</span>
                <span className="text-xs text-slate-700">{co.email || '-'}</span>
              </div>
              <div className="flex gap-3">
                <span className="text-slate-500 w-20 text-xs">โทรศัพท์:</span>
                <span className="text-slate-700">{co.phone || '-'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Invoice Table */}
      <div className="px-6 py-4">
        <div className="mb-3">
          <h3 className="text-xs text-slate-700 mb-2">รายการค่าใช้จ่าย / Item List</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-slate-700 text-white">
                <th className="border border-slate-600 px-3 py-2 text-left w-14">ลำดับ</th>
                <th className="border border-slate-600 px-3 py-2 text-left">หมวดงาน</th>
                <th className="border border-slate-600 px-3 py-2 text-right w-32">จำนวนเงิน (บาท)</th>
              </tr>
            </thead>
            <tbody>
              <tr className="bg-white">
                <td className="border border-slate-200 px-3 py-2 text-center text-slate-600">H</td>
                <td className="border border-slate-200 px-3 py-2 text-slate-800">งานบิ้วอินเฟอร์นิเจอร์ (Built-in Furniture) - 14 รายการ</td>
                <td className="border border-slate-200 px-3 py-2 text-right text-slate-800">
                  {hidePrice ? '*****' : formatCurrency(customerTotal)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Summary and Payment Info Grid */}
        <div className="mt-4 grid grid-cols-2 gap-4 print:page-break-inside-avoid">
          {/* Summary */}
          <div>
            <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-3 rounded-lg space-y-2 text-xs border-2 border-slate-300">
              <div className="flex justify-between pb-1.5 border-b border-slate-300">
                <span className="text-slate-600">รวมค่าบิ้วอินเฟอร์นิเจอร์:</span>
                <span className="text-slate-800">{hidePrice ? '*****' : formatCurrency(customerTotal)} บาท</span>
              </div>
              <div className="flex justify-between pb-2 border-b-2 border-slate-400">
                <span className="text-slate-600">ค่าดำเนินการ (5%):</span>
                <span className="text-slate-700">{hidePrice ? '*****' : formatCurrency(operationFee)} บาท</span>
              </div>
              <div className="flex justify-between pt-1.5 bg-slate-700 text-white -mx-3 -mb-3 px-3 py-2.5 rounded-b-lg">
                <span className="text-sm">ยอดชำระทั้งหมด:</span>
                <span className="text-base">{hidePrice ? '*****' : formatCurrency(grandTotal)} บาท</span>
              </div>
            </div>

            {/* Installments - 3 งวด */}
            <div className="mt-3 bg-white border-2 border-slate-300 rounded-lg overflow-hidden">
              <div className="bg-slate-700 px-3 py-2 border-b border-slate-600">
                <p className="text-xs text-white">แผนการชำระเงิน 3 งวด / Payment Schedule</p>
              </div>
              <div className="p-3">
                <table className="w-full text-[10px]">
                  <thead>
                    <tr className="border-b border-slate-300">
                      <th className="text-left py-1.5 text-slate-600 text-[10px]">งวด</th>
                      <th className="text-right py-1.5 text-slate-600 text-[10px]">จำนวนเงิน</th>
                    </tr>
                  </thead>
                  <tbody>
                    {installments.map((inst) => (
                      <tr key={inst.no} className="border-b border-slate-200">
                        <td className="py-1.5 text-slate-700">{inst.description}</td>
                        <td className="text-right text-slate-800">{hidePrice ? '*****' : formatCurrency(inst.amount)}</td>
                      </tr>
                    ))}
                    <tr className="bg-slate-100 border-t-2 border-slate-400">
                      <td className="py-2 text-slate-900 font-bold">รวมทั้งสิ้น</td>
                      <td className="text-right text-slate-900 font-bold">{hidePrice ? '*****' : formatCurrency(grandTotal)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* QR Code Section */}
          <div className="space-y-3">
            <div className="bg-white border-2 border-slate-300 rounded-lg overflow-hidden">
              <div className="bg-gradient-to-r from-green-600 to-green-700 px-3 py-2 border-b border-green-800">
                <p className="text-xs text-white">สแกนชำระเงิน / QR Payment</p>
              </div>
              <div className="p-3 text-center">
                <div className="w-32 h-32 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center mx-auto mb-2">
                  <p className="text-xs text-slate-400 text-center px-2">QR Code<br/>PromptPay</p>
                </div>
                <p className="text-[10px] text-slate-600">สแกน QR เพื่อชำระเงิน</p>
              </div>
            </div>

            {/* Bank Account Section */}
            <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
              <div className="bg-slate-100 px-3 py-2 border-b border-slate-200">
                <p className="text-xs text-slate-700 font-medium">บัญชีธนาคาร / Bank Account</p>
              </div>
              <div className="p-3 space-y-1.5 text-xs">
                <div className="flex justify-between items-center bg-slate-50 px-2 py-1.5 rounded">
                  <span className="text-slate-600 text-[10px]">ธนาคาร:</span>
                  <span className="flex items-center gap-1.5 text-slate-800">
                    {(() => { const bankInfo = findBankByName(co?.bankAccounts?.[0]?.bankName || ""); return bankInfo ? <img src={bankInfo.icon} alt={bankInfo.symbol} className="h-5 w-5 rounded" /> : null; })()}
                    {co.bankAccounts[0]?.bankName || '-'}
                  </span>
                </div>
                <div className="flex justify-between items-center bg-slate-50 px-2 py-1.5 rounded">
                  <span className="text-slate-600 text-[10px]">เลขที่บัญชี:</span>
                  <span className="text-slate-800 font-medium">{co.bankAccounts[0]?.accountNumber || '-'}</span>
                </div>
                <div className="flex justify-between items-center bg-slate-50 px-2 py-1.5 rounded">
                  <span className="text-slate-600 text-[10px]">ชื่อบัญชี:</span>
                  <span className="text-slate-800 text-xs">{co.bankAccounts[0]?.accountName || '-'}</span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-orange-300 rounded-lg p-2.5">
              <p className="text-[10px] mb-1">
                <FileText className="w-3 h-3 inline mr-1" />
                <span className="text-xs">หมายเหตุสำคัญ</span>
              </p>
              <ul className="text-slate-700 space-y-0.5 list-disc list-inside text-[10px]">
                <li>กรุณาโอนเงินตามงวดที่กำหนด</li>
                <li>แจ้งหลักฐานการโอนทุกครั้ง</li>
                <li>งานบิ้วอินรวม 14 รายการ ดูรายละเอียดในใบเสนอราคา</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Signature Section */}
      <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 print:page-break-inside-avoid">
        <div className="grid grid-cols-2 gap-10">
          <div className="text-center">
            <p className="text-[10px] text-slate-500 mb-6">ผู้วางบิล / Billed By</p>
            <div className="mb-2">
              <div className="w-24 h-12 border-b border-slate-400" />
            </div>
            <div className="border-b border-slate-400 mb-1 pb-0.5 mx-8">
              <span className="invisible text-[10px]">Signature</span>
            </div>
            <p className="text-xs text-slate-700">( {co.signatureName || '-'} )</p>
            <p className="text-[10px] text-slate-500 mt-1">{getCurrentThaiDate()}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-slate-500 mb-6">ผู้รับบิล / Received By</p>
            <div className="mb-2">
              <span className="invisible text-[10px] h-10 block">Signature placeholder</span>
            </div>
            <div className="border-b border-slate-400 mb-1 pb-0.5 mx-8">
              <span className="invisible text-[10px]">Signature</span>
            </div>
            <p className="text-xs text-slate-700">( ...................................... )</p>
            <p className="text-[10px] text-slate-500 mt-1">วันที่ ........................</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-900 text-white py-2 text-center">
        <p className="text-[10px] text-slate-300">{co.companyName?.toUpperCase() || '-'} • Built-in Furniture Specialist • {co.email || '-'} • {co.phone || '-'}</p>
      </div>

      {/* Print Button */}
      <div className="p-6 bg-slate-50 border-t-2 border-slate-200 print:hidden">
        <button
          onClick={() => window.print()}
          className="w-full bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-800 hover:to-slate-900 text-white py-3 px-6 rounded-lg transition-all shadow-md hover:shadow-xl text-sm uppercase tracking-wide"
        >
          พิมพ์เอกสาร / Print Document
        </button>
      </div>
    </div>
  );
}
