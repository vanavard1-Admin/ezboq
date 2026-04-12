import React from 'react';
import { Receipt, BadgeCheck, Calendar, Banknote } from 'lucide-react';
import { getCurrentThaiDate } from '../utils/dateUtils';
import { prepareProjectDocuments, ProjectData } from '../utils/projectData';
import { loadCompanyProfile } from '../utils/companyProfile';
import { getDocumentCompanyTagline, getDocumentCompanyTitle } from '../utils/documentBrand';
import { numberToThaiText } from '../utils/taxUtils';
import { findBankByName } from '../utils/thaiBankData';

interface ConstructionReceiptDocumentProps {
  project: ProjectData;
}

export function ConstructionReceiptDocument({ project }: ConstructionReceiptDocumentProps) {
  const co = loadCompanyProfile();
  const preparedProject = prepareProjectDocuments(project);
  const receiptDate = getCurrentThaiDate();
  const totalAmount = Math.round((preparedProject.customerPrice || 0) + (preparedProject.operatingCost || 0));
  const payerName = project.owner || 'ผู้ชำระเงิน';
  const paymentItems = [
    {
      date: receiptDate,
      amount: totalAmount,
      description: `รับชำระค่าก่อสร้าง ${project.name || 'ตามโครงการ'}`,
    },
  ];

  return (
    <div className="bg-white">
      {(!co?.companyName && !co?.phone) && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mx-8 mt-4 print:hidden">
          <p className="text-sm text-amber-800">กรุณากรอกข้อมูลบริษัทในหน้า "ข้อมูลบริษัท" ก่อนพิมพ์เอกสาร</p>
        </div>
      )}
      {/* Header - สีทองเหลือง */}
      <div className="bg-gradient-to-r from-yellow-600 to-amber-700 text-white p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Receipt className="w-8 h-8" />
              <div>
                <h1 className="text-2xl">ใบเสร็จรับเงิน</h1>
                <p className="text-yellow-100 text-sm">Official Receipt</p>
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-yellow-100">{getDocumentCompanyTitle(co)}</p>
            <p className="text-xs text-yellow-200">{getDocumentCompanyTagline(co)}</p>
          </div>
        </div>
      </div>

      {/* Document Info */}
      <div className="px-4 py-1.5 bg-gradient-to-r from-yellow-50 to-white border-b border-yellow-200">
        <div className="grid grid-cols-2 gap-3 text-[10px]">
          <div>
            <p className="text-slate-900 mb-0.5">เลขที่ใบเสร็จ:</p>
            <p className="text-xs text-slate-800">RC-2569-001</p>
          </div>
          <div>
            <p className="text-slate-900 mb-0.5">วันที่ออกใบเสร็จ:</p>
            <p className="text-xs text-slate-800">{receiptDate}</p>
          </div>
        </div>
        <div className="mt-2 rounded-lg border border-yellow-200 bg-white/80 px-3 py-2 text-[10px] text-slate-700">
          <p><strong>โครงการ:</strong> {project.name || '-'}</p>
          <p><strong>สถานที่:</strong> {project.address || '-'}</p>
        </div>
      </div>

      {/* Payer & Receiver Info */}
      <div className="px-6 py-4 border-b border-yellow-100">
        <div className="grid grid-cols-2 gap-4">
          {/* ผู้รับเงิน */}
          <div className="bg-yellow-50/50 border border-yellow-200 rounded-lg p-3">
            <h3 className="text-xs text-yellow-900 mb-2 flex items-center gap-2">
              <BadgeCheck className="w-4 h-4" />
              <span>ผู้รับเงิน</span>
            </h3>
            <div className="flex items-start gap-3">
              {(() => { const _bi = findBankByName(co?.bankAccounts?.[0]?.bankName || ""); return _bi ? <img src={_bi.icon} alt={_bi.symbol} className="w-12 h-12 object-contain" /> : null; })()}
              <div className="text-[10px] text-slate-700 flex-1">
                <p className="mb-1"><strong>ชื่อ:</strong> {co.bankAccounts[0]?.accountName || '-'}</p>
                <p className="mb-1"><strong>ธนาคาร:</strong> {co.bankAccounts[0]?.bankName || '-'}</p>
                <p><strong>ช่องทาง:</strong> โอนเงินผ่าน K-BIZ (Kasikornbank)</p>
              </div>
            </div>
          </div>

          {/* ผู้ชำระเงิน */}
          <div className="bg-blue-50/50 border border-blue-200 rounded-lg p-3">
            <h3 className="text-xs text-blue-900 mb-2 flex items-center gap-2">
              <Banknote className="w-4 h-4" />
              <span>ผู้ชำระเงิน</span>
            </h3>
            <div className="flex items-start gap-3">
              {(() => { const _bi = findBankByName(co?.bankAccounts?.[0]?.bankName || ""); return _bi ? <img src={_bi.icon} alt={_bi.symbol} className="w-12 h-12 object-contain" /> : null; })()}
              <div className="text-[10px] text-slate-700 flex-1">
                <p className="mb-1"><strong>ชื่อ:</strong> {payerName}</p>
                <p className="mb-1"><strong>ที่อยู่:</strong> {project.address || '-'}</p>
                <p className="text-slate-500">{project.phone || 'ชำระผ่านบัญชีธนาคาร'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Items */}
      <div className="px-6 py-4 border-b border-yellow-100">
        <h3 className="text-sm text-yellow-900 mb-3 flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          <span>รายละเอียดการรับเงิน</span>
        </h3>

        <table className="w-full text-[10px] border-collapse mb-4">
          <thead>
            <tr className="bg-gradient-to-r from-yellow-600 to-amber-700 text-white">
              <th className="border border-yellow-700 px-3 py-2 text-center w-16">ลำดับ</th>
              <th className="border border-yellow-700 px-3 py-2 text-center w-28">วันที่รับเงิน</th>
              <th className="border border-yellow-700 px-3 py-2 text-left">รายละเอียด</th>
              <th className="border border-yellow-700 px-3 py-2 text-right w-32">จำนวนเงิน (บาท)</th>
            </tr>
          </thead>
          <tbody>
            {paymentItems.map((item, index) => (
              <tr key={index} className="hover:bg-yellow-50">
                <td className="border border-yellow-200 px-3 py-2 text-center">{index + 1}</td>
                <td className="border border-yellow-200 px-3 py-2 text-center">{item.date}</td>
                <td className="border border-yellow-200 px-3 py-2">{item.description}</td>
                <td className="border border-yellow-200 px-3 py-2 text-right">
                  {item.amount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gradient-to-r from-yellow-700 to-amber-800 text-white">
              <td colSpan={3} className="border border-yellow-800 px-3 py-2 text-right">
                <strong>ยอดรวมเงินที่รับทั้งหมด</strong>
              </td>
              <td className="border border-yellow-800 px-3 py-2 text-right">
                <strong className="text-base">
                  {totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </strong>
              </td>
            </tr>
          </tfoot>
        </table>

        {/* Amount in Words */}
        <div className="bg-gradient-to-r from-yellow-100 to-amber-100 border-2 border-yellow-400 rounded-lg p-3 text-center">
          <p className="text-[10px] text-yellow-800 mb-1">จำนวนเงิน (ตัวอักษร)</p>
          <p className="text-sm text-yellow-900">
            <strong>{numberToThaiText(totalAmount)}</strong>
          </p>
        </div>
      </div>

      {/* Payment Slips Section */}
      <div className="px-6 py-4 border-b border-yellow-100 bg-yellow-50/30">
        <h3 className="text-sm text-yellow-900 mb-3">หลักฐานการโอนเงิน</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {paymentItems.map((item, index) => (
            <div key={index} className="bg-white border-2 border-dashed border-yellow-300 rounded-lg p-3">
              <div className="text-center mb-2">
                <p className="text-[10px] text-yellow-800 mb-1">สลิปที่ {index + 1}</p>
                <p className="text-[9px] text-slate-600">{item.date}</p>
                <p className="text-xs text-yellow-900 mt-1">
                  <strong>{item.amount.toLocaleString()} บาท</strong>
                </p>
              </div>
              <div className="bg-gray-100 rounded border border-gray-300 h-48 flex items-center justify-center">
                <div className="text-center text-gray-400">
                  <Receipt className="w-8 h-8 mx-auto mb-2" />
                  <p className="text-[9px]">แนบสลิปการโอนเงิน</p>
                  <p className="text-[9px]">ที่นี่</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div className="px-6 py-4 border-b border-yellow-100">
        <h3 className="text-sm text-yellow-900 mb-2">หมายเหตุ</h3>
        <ul className="text-[10px] text-slate-700 space-y-1 list-disc list-inside">
          <li>รับชำระเงินโดยการโอนผ่านบัญชีธนาคาร</li>
          <li>ค่าธรรมเนียมการโอน: <strong className="text-green-700">0.00 บาท</strong></li>
          <li>ใบเสร็จฉบับนี้ออกเพื่อเป็นหลักฐานการรับเงินเท่านั้น</li>
          <li>กรุณาเก็บใบเสร็จไว้เป็นหลักฐานการชำระเงิน</li>
        </ul>
      </div>

      {/* Signature */}
      <div className="px-6 py-6 border-b border-yellow-200">
        <div className="flex justify-center">
          <div className="text-center w-80">
            <div className="border-b-2 border-yellow-400 mb-2 pb-16"></div>
            <p className="text-xs text-slate-900 mb-1">ผู้รับเงิน</p>
            <p className="text-[10px] text-slate-700 mt-2">
              ( {co.signatureName || '-'} )
            </p>
            <p className="text-[10px] text-slate-500 mt-2">
              วันที่: <strong>{receiptDate}</strong>
            </p>
          </div>
        </div>
      </div>

      {/* Stamp Section */}
      <div className="px-6 py-4 border-b border-yellow-200 bg-yellow-50/20">
        <div className="flex items-center justify-center gap-8">
          <div className="text-center">
            <div className="bg-white border-2 border-dashed border-yellow-400 rounded-lg w-32 h-32 flex items-center justify-center">
              <div className="text-yellow-600">
                <BadgeCheck className="w-12 h-12 mx-auto mb-1" />
                <p className="text-[9px]">ตราประทับ</p>
              </div>
            </div>
          </div>
          <div className="text-[10px] text-slate-600 max-w-md">
            <p className="mb-2">
              <strong className="text-yellow-900">การรับรองความถูกต้อง:</strong>
            </p>
            <p>ใบเสร็จรับเงินฉบับนี้ออกโดย {co.signatureName || '-'} เพื่อรับรองว่าได้รับเงินจาก {payerName} ครบถ้วนตามจำนวนที่ระบุไว้ข้างต้น</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gradient-to-r from-yellow-600 to-amber-700 text-white px-6 py-3">
        <div className="text-center text-[9px]">
          <p className="text-yellow-100">
            {co.companyName || co.companyNameTh || 'ชื่อบริษัท'} | {co.tagline || 'Interior Design & Construction'}
          </p>
          <p className="text-yellow-200 mt-1">
            โทร: {co.phone || '-'} | อีเมล: {co.email || '-'}
          </p>
          <p className="text-yellow-200 mt-1 text-[8px]">
            ใบเสร็จรับเงินฉบับนี้ออกโดยระบบอิเล็กทรอนิกส์ มีผลใช้ได้ทันที
          </p>
        </div>
      </div>
    </div>
  );
}
