import React from 'react';
import { Building2, User, Calendar, CheckCircle2, Banknote } from 'lucide-react';
import { ProjectData } from '../utils/projectData';
import { loadCompanyProfile } from '../utils/companyProfile';
import { findBankByName } from '../utils/thaiBankData';

interface ConstructionContractorInvoiceDocumentProps {
  project: ProjectData;
}

export function ConstructionContractorInvoiceDocument({ project }: ConstructionContractorInvoiceDocumentProps) {
  const co = loadCompanyProfile();
  // คำนวณยอดรวม (ราคาต้นทุนช่าง)
  const calculateTotal = () => {
    let total = 0;
    project.quotationData.forEach((item) => {
      if (item.laborCost && typeof item.laborCost === 'number') {
        const quantity = typeof item.quantity === 'number' ? item.quantity : Number(item.quantity) || 1;
        total += item.laborCost * quantity;
      }
    });
    return total;
  };

  const totalAmount = calculateTotal();
  const firstPayment = Math.round(totalAmount * 0.7); // งวดที่ 1: 70%
  const secondPayment = totalAmount - firstPayment; // งวดที่ 2: 30%

  return (
    <div className="bg-white">
      {(!co?.companyName && !co?.phone) && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mx-8 mt-4 print:hidden">
          <p className="text-sm text-amber-800">กรุณากรอกข้อมูลบริษัทในหน้า "ข้อมูลบริษัท" ก่อนพิมพ์เอกสาร</p>
        </div>
      )}
      {/* Header - สีเขียวมะกอก */}
      <div className="bg-gradient-to-r from-green-700 to-green-800 text-white p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Banknote className="w-8 h-8" />
              <div>
                <h1 className="text-2xl">ใบวางบิลช่าง</h1>
                <p className="text-green-100 text-sm">Contractor Payment Invoice</p>
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-green-100">{(co.companyName || co.companyNameTh || 'ชื่อบริษัท').toUpperCase()}</p>
            <p className="text-xs text-green-200">{co.tagline || 'Interior Design & Construction'}</p>
          </div>
        </div>
      </div>

      {/* Document Info */}
      <div className="px-4 py-1.5 bg-gradient-to-r from-green-50 to-white border-b border-green-200">
        <div className="grid grid-cols-2 gap-3 text-[10px]">
          <div>
            <p className="text-slate-900 mb-0.5">เลขที่เอกสาร:</p>
            <p className="text-xs text-slate-800">INV-CONTRACTOR-2569-001</p>
          </div>
          <div>
            <p className="text-slate-900 mb-0.5">วันที่:</p>
            <p className="text-xs text-slate-800">3 มกราคม 2569</p>
          </div>
        </div>
      </div>

      {/* Contractor Info */}
      <div className="px-6 py-4 border-b border-green-100 bg-green-50/30">
        <h3 className="text-sm text-green-900 mb-3 flex items-center gap-2">
          <User className="w-4 h-4" />
          <span>ข้อมูลผู้รับเหมา</span>
        </h3>
        <div className="grid grid-cols-2 gap-4 text-[10px]">
          <div>
            <p className="text-slate-600 mb-1">ชื่อผู้รับเหมา:</p>
            <p className="text-slate-900">_______________________________________</p>
          </div>
          <div>
            <p className="text-slate-600 mb-1">เลขประจำตัวผู้เสียภาษี:</p>
            <p className="text-slate-900">_______________________________________</p>
          </div>
          <div>
            <p className="text-slate-600 mb-1">ที่อยู่:</p>
            <p className="text-slate-900">_______________________________________</p>
          </div>
          <div>
            <p className="text-slate-600 mb-1">เบอร์โทร:</p>
            <p className="text-slate-900">_______________________________________</p>
          </div>
        </div>
      </div>

      {/* Project Info */}
      <div className="px-6 py-3 border-b border-green-100 bg-white">
        <h3 className="text-sm text-green-900 mb-2 flex items-center gap-2">
          <Building2 className="w-4 h-4" />
          <span>รายละเอียดโครงการ</span>
        </h3>
        <div className="text-[10px] text-slate-700">
          <p><strong>โครงการ:</strong> {project.name}</p>
          <p><strong>สถานที่:</strong> {project.address}</p>
        </div>
      </div>

      {/* Payment Schedule Table */}
      <div className="px-6 py-4">
        <h3 className="text-sm text-green-900 mb-3 flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          <span>รายละเอียดการชำระเงิน</span>
        </h3>

        <table className="w-full text-[10px] border-collapse">
          <thead>
            <tr className="bg-gradient-to-r from-green-600 to-green-700 text-white">
              <th className="border border-green-700 px-3 py-2 text-left w-16">งวดที่</th>
              <th className="border border-green-700 px-3 py-2 text-left">Milestone / เงื่อนไข</th>
              <th className="border border-green-700 px-3 py-2 text-center w-24">สัดส่วน</th>
              <th className="border border-green-700 px-3 py-2 text-right w-32">จำนวนเงิน (บาท)</th>
              <th className="border border-green-700 px-3 py-2 text-center w-20">สถานะ</th>
            </tr>
          </thead>
          <tbody>
            <tr className="hover:bg-green-50">
              <td className="border border-green-200 px-3 py-2 text-center">1</td>
              <td className="border border-green-200 px-3 py-2">
                <strong className="text-green-800">งวดเริ่มงาน - งานหมวด A+B เสร็จ</strong>
                <br />
                <span className="text-slate-600">• ขัดมันพื้น + ปูนปรับระดับ</span>
                <br />
                <span className="text-slate-600">• งานก่อ-ฉาบ ติดตั้งประตู</span>
              </td>
              <td className="border border-green-200 px-3 py-2 text-center text-green-700">70%</td>
              <td className="border border-green-200 px-3 py-2 text-right">{firstPayment.toLocaleString()}</td>
              <td className="border border-green-200 px-3 py-2 text-center">
                <div className="flex items-center justify-center gap-1 text-slate-400">
                  <CheckCircle2 className="w-3 h-3" />
                  <span className="text-[9px]">รอชำระ</span>
                </div>
              </td>
            </tr>
            <tr className="hover:bg-green-50">
              <td className="border border-green-200 px-3 py-2 text-center">2</td>
              <td className="border border-green-200 px-3 py-2">
                <strong className="text-green-800">งานส่งมอบ - หมวด C+D เสร็จสมบูรณ์</strong>
                <br />
                <span className="text-slate-600">• งานกันซึมระเบียง+ห้องน้ำ</span>
                <br />
                <span className="text-slate-600">• งานปูกระเบื้อง เก็บงานเรียบร้อย</span>
              </td>
              <td className="border border-green-200 px-3 py-2 text-center text-green-700">30%</td>
              <td className="border border-green-200 px-3 py-2 text-right">{secondPayment.toLocaleString()}</td>
              <td className="border border-green-200 px-3 py-2 text-center">
                <div className="flex items-center justify-center gap-1 text-slate-400">
                  <CheckCircle2 className="w-3 h-3" />
                  <span className="text-[9px]">รอชำระ</span>
                </div>
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr className="bg-gradient-to-r from-green-700 to-green-800 text-white">
              <td colSpan={3} className="border border-green-800 px-3 py-2 text-right">
                <strong>ยอดรวมทั้งหมด</strong>
              </td>
              <td className="border border-green-800 px-3 py-2 text-right">
                <strong className="text-base">{totalAmount.toLocaleString()}</strong>
              </td>
              <td className="border border-green-800 px-3 py-2"></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Item Details */}
      <div className="px-6 py-4 border-t border-green-200 bg-green-50/20">
        <h3 className="text-sm text-green-900 mb-3">รายละเอียดงานทั้งหมด</h3>
        <table className="w-full text-[10px] border-collapse">
          <thead>
            <tr className="bg-green-100 text-green-900">
              <th className="border border-green-200 px-3 py-2 text-left w-16">ลำดับ</th>
              <th className="border border-green-200 px-3 py-2 text-left">รายการ</th>
              <th className="border border-green-200 px-3 py-2 text-center w-24">หน่วย</th>
              <th className="border border-green-200 px-3 py-2 text-center w-20">จำนวน</th>
              <th className="border border-green-200 px-3 py-2 text-right w-32">ราคา (บาท)</th>
            </tr>
          </thead>
          <tbody>
            {project.quotationData.map((item, index) => {
              const isHeader = !item.unit && !item.quantity;
              const laborCost = typeof item.laborCost === 'number' ? item.laborCost : 0;

              if (isHeader) {
                return (
                  <tr key={index} className="bg-gradient-to-r from-green-600 to-green-700 text-white">
                    <td className="border border-green-700 px-3 py-2 text-center">{item.no}</td>
                    <td colSpan={4} className="border border-green-700 px-3 py-2">
                      <strong>{item.description}</strong>
                    </td>
                  </tr>
                );
              }

              return (
                <tr key={index} className="hover:bg-green-50">
                  <td className="border border-green-200 px-3 py-2 text-center">{item.no}</td>
                  <td className="border border-green-200 px-3 py-2">{item.description}</td>
                  <td className="border border-green-200 px-3 py-2 text-center">{item.unit}</td>
                  <td className="border border-green-200 px-3 py-2 text-center">{item.quantity}</td>
                  <td className="border border-green-200 px-3 py-2 text-right">
                    {laborCost > 0 ? laborCost.toLocaleString() : '-'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Bank Info */}
      <div className="px-6 py-4 border-t border-green-200 bg-gradient-to-r from-green-50 to-white">
        <h3 className="text-sm text-green-900 mb-3">ข้อมูลบัญชีสำหรับโอนเงิน</h3>
        <div className="flex items-start gap-4">
          {(() => { const _bi = findBankByName(co?.bankAccounts?.[0]?.bankName || ""); return _bi ? <img src={_bi.icon} alt={_bi.symbol} className="w-16 h-16 object-contain" /> : null; })()}
          <div className="text-[10px] text-slate-700 flex-1">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-slate-600">ธนาคาร:</p>
                <p className="text-slate-900">{co.bankAccounts[0]?.bankName || '-'}</p>
              </div>
              <div>
                <p className="text-slate-600">ชื่อบัญชี:</p>
                <p className="text-slate-900">{co.bankAccounts[0]?.accountName || '-'}</p>
              </div>
              <div>
                <p className="text-slate-600">เลขที่บัญชี:</p>
                <p className="text-slate-900">{co.bankAccounts[0]?.accountNumber || '-'}</p>
              </div>
              <div>
                <p className="text-slate-600">ประเภทบัญชี:</p>
                <p className="text-slate-900">ออมทรัพย์</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Terms */}
      <div className="px-6 py-4 border-t border-green-200 bg-white">
        <h3 className="text-sm text-green-900 mb-2">เงื่อนไขการชำระเงิน</h3>
        <ul className="text-[10px] text-slate-700 space-y-1 list-disc list-inside">
          <li>ชำระผ่านการโอนเงินเข้าบัญชีธนาคารตามข้อมูลด้านบน</li>
          <li>แจ้งหลักฐานการโอนเงินหลังโอนทุกครั้ง</li>
          <li>การชำระเงินแต่ละงวดจะทำหลังจากผ่านการตรวจรับงานเรียบร้อยแล้ว</li>
          <li>กรณีมีการเปลี่ยนแปลงงาน จะต้องตกลงราคาก่อนดำเนินการ</li>
          <li>หักภาษี ณ ที่จ่าย 3% (ถ้ามี)</li>
        </ul>
      </div>

      {/* Signatures */}
      <div className="px-6 py-6 border-t border-green-200">
        <div className="grid grid-cols-2 gap-8 text-[10px]">
          <div className="text-center">
            <div className="border-b border-green-300 mb-2 pb-12"></div>
            <p className="text-slate-700">ผู้รับเหมา (ผู้รับเงิน)</p>
            <p className="text-slate-500 mt-1">วันที่: _____ / _____ / _____</p>
          </div>
          <div className="text-center">
            <div className="border-b border-green-300 mb-2 pb-12"></div>
            <p className="text-slate-700">{co.companyName || co.companyNameTh || 'ชื่อบริษัท'} (ผู้จ่ายเงิน)</p>
            <p className="text-slate-500 mt-1">วันที่: _____ / _____ / _____</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gradient-to-r from-green-700 to-green-800 text-white px-6 py-3">
        <div className="text-center text-[9px]">
          <p className="text-green-100">
            {co.companyName || co.companyNameTh || 'ชื่อบริษัท'} | {co.tagline || 'Interior Design & Construction'}
          </p>
          <p className="text-green-200 mt-1">
            โทร: {co.phone || '-'} | อีเมล: {co.email || '-'}
          </p>
        </div>
      </div>
    </div>
  );
}
