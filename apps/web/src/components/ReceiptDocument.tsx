import React, { useState } from 'react';
import { FileText, Building2, Mail, Phone, User } from 'lucide-react';
import { ProjectData } from '../utils/projectData';
import { getCurrentThaiDate } from '../utils/dateUtils';
import { loadCompanyProfile, type CompanyProfile } from '../utils/companyProfile';

interface ReceiptDocumentProps {
  project: ProjectData;
  companyProfile?: CompanyProfile;
}

export function ReceiptDocument({ project, companyProfile }: ReceiptDocumentProps) {
  const co = companyProfile || loadCompanyProfile();

  const [receiptNumber, setReceiptNumber] = useState('RE-2568-001');
  const [receiptDate, setReceiptDate] = useState(getCurrentThaiDate());
  const [paymentMethod, setPaymentMethod] = useState('โอนเงิน');
  const [installmentNumber, setInstallmentNumber] = useState('1');
  const [payerName, setPayerName] = useState(project.owner);
  const [amount, setAmount] = useState('0.00');
  const [note, setNote] = useState('');

  const formatCurrency = (value: string): string => {
    const num = parseFloat(value.replace(/,/g, ''));
    if (isNaN(num)) return '0.00';
    return num.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handleAmountChange = (value: string) => {
    // Remove non-numeric characters except decimal point
    const cleaned = value.replace(/[^\d.]/g, '');
    setAmount(cleaned);
  };

  const numberToThaiText = (num: number): string => {
    const ones = ['', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
    const positions = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน', 'ล้าน'];

    if (num === 0) return 'ศูนย์บาทถ้วน';

    const [integer, decimal] = num.toFixed(2).split('.');
    let result = '';

    // Convert integer part
    const intArray = integer.split('').reverse();
    for (let i = 0; i < intArray.length; i++) {
      const digit = parseInt(intArray[i]);
      if (digit !== 0) {
        if (i === 1 && digit === 2) {
          result = 'ยี่สิบ' + result;
        } else if (i === 1 && digit === 1) {
          result = 'สิบ' + result;
        } else {
          result = ones[digit] + positions[i] + result;
        }
      }
    }

    result = result || 'ศูนย์';
    result += 'บาท';

    // Convert decimal part
    const dec = parseInt(decimal);
    if (dec > 0) {
      result += dec.toString() + 'สตางค์';
    } else {
      result += 'ถ้วน';
    }

    return result;
  };

  const amountNum = parseFloat(amount.replace(/,/g, '')) || 0;
  const amountText = numberToThaiText(amountNum);

  return (
    <div className="max-w-[900px] mx-auto bg-white shadow-xl rounded-lg overflow-hidden">
      {(!co?.companyName && !co?.phone) && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mx-8 mt-4 print:hidden">
          <p className="text-sm text-amber-800">กรุณากรอกข้อมูลบริษัทในหน้า "ข้อมูลบริษัท" ก่อนพิมพ์เอกสาร</p>
        </div>
      )}
      {/* Print-only watermark */}
      <div className="hidden print:block absolute inset-0 flex items-center justify-center pointer-events-none opacity-5">
        <FileText className="w-96 h-96" />
      </div>

      {/* Header */}
      <div className="bg-[var(--doc-primary)] text-white px-8 py-6">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-4">
            {co?.logoUrl && (
              <img src={co.logoUrl} alt="Logo" className="w-12 h-12 rounded-lg object-contain bg-white/10 p-1" />
            )}
            <div>
              <h1 className="text-3xl mb-2">ใบเสร็จรับเงิน</h1>
              <p className="text-stone-400">RECEIPT</p>
            </div>
          </div>
          <div className="text-right">
            <div className="bg-white text-stone-800 px-4 py-2 rounded-lg inline-block mb-2">
              <p className="text-sm">เลขที่ / Receipt No.</p>
              <p className="text-xl font-mono">{receiptNumber}</p>
            </div>
            <p className="text-sm text-stone-400">วันที่: {receiptDate}</p>
          </div>
        </div>
      </div>

      {/* Company Info */}
      <div className="px-8 py-6 bg-stone-50 border-b border-stone-200">
        <div className="grid grid-cols-2 gap-8">
          <div>
            <h2 className="text-lg text-stone-800 mb-3">{co?.companyName?.toUpperCase() || '-'}</h2>
            <div className="space-y-1.5 text-sm text-stone-800">
              <div className="flex items-start gap-2">
                <Building2 className="w-4 h-4 mt-0.5 text-stone-500" />
                <span>{co?.tagline || 'Interior Design & Construction'}</span>
              </div>
              <div className="flex items-start gap-2">
                <Mail className="w-4 h-4 mt-0.5 text-stone-500" />
                <span>{co?.email || '-'}</span>
              </div>
              <div className="flex items-start gap-2">
                <Phone className="w-4 h-4 mt-0.5 text-stone-500" />
                <span>{co?.phone || '-'}</span>
              </div>
            </div>
          </div>
          <div className="border-l-2 border-stone-200 pl-8">
            <h3 className="text-sm text-stone-500 mb-2">ได้รับเงินจาก / Received From:</h3>
            <div className="space-y-1.5 text-sm">
              <div className="flex items-start gap-2">
                <User className="w-4 h-4 mt-0.5 text-stone-500" />
                <div>
                  <p className="text-stone-800">{payerName}</p>
                  <p className="text-stone-500 text-xs">โครงการ: {project.name}</p>
                </div>
              </div>
              {project.address && project.address !== '-' && (
                <div className="flex items-start gap-2">
                  <Building2 className="w-4 h-4 mt-0.5 text-stone-500" />
                  <span className="text-stone-500">{project.address}</span>
                </div>
              )}
              {project.phone && project.phone !== '-' && (
                <div className="flex items-start gap-2">
                  <Phone className="w-4 h-4 mt-0.5 text-stone-500" />
                  <span className="text-stone-500">{project.phone}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Form Inputs - Hidden when printing */}
      <div className="px-8 py-6 bg-stone-50 border-b border-stone-200 print:hidden">
        <h3 className="text-sm text-stone-500 mb-4">กรอกข้อมูลใบเสร็จ</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-stone-500 mb-1">เลขที่ใบเสร็จ</label>
            <input
              type="text"
              value={receiptNumber}
              onChange={(e) => setReceiptNumber(e.target.value)}
              className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
            />
          </div>
          <div>
            <label className="block text-xs text-stone-500 mb-1">วันที่</label>
            <input
              type="text"
              value={receiptDate}
              onChange={(e) => setReceiptDate(e.target.value)}
              className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
            />
          </div>
          <div>
            <label className="block text-xs text-stone-500 mb-1">ชื่อผู้ชำระเงิน</label>
            <input
              type="text"
              value={payerName}
              onChange={(e) => setPayerName(e.target.value)}
              className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
            />
          </div>
          <div>
            <label className="block text-xs text-stone-500 mb-1">งวดที่</label>
            <select
              value={installmentNumber}
              onChange={(e) => setInstallmentNumber(e.target.value)}
              className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
            >
              <option value="1">งวดที่ 1 (30%)</option>
              <option value="2">งวดที่ 2 (30%)</option>
              <option value="3">งวดที่ 3 (30%)</option>
              <option value="4">งวดที่ 4 (10%)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-stone-500 mb-1">วิธีชำระเงิน</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
            >
              <option value="โอนเงิน">โอนเงิน</option>
              <option value="เงินสด">เงินสด</option>
              <option value="เช็ค">เช็ค</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-stone-500 mb-1">จำนวนเงิน (บาท)</label>
            <input
              type="text"
              value={amount}
              onChange={(e) => handleAmountChange(e.target.value)}
              placeholder="0.00"
              className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-xs text-stone-500 mb-1">หมายเหตุ</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
              placeholder="หมายเหตุเพิ่มเติม (ถ้ามี)"
            />
          </div>
        </div>
      </div>

      {/* Receipt Details */}
      <div className="px-8 py-6">
        <div className="border border-stone-200 rounded-lg overflow-hidden">
          <div className="bg-stone-50 px-4 py-2 border-b border-stone-200">
            <h3 className="text-stone-800">รายละเอียดการชำระเงิน / Payment Details</h3>
          </div>
          <div className="p-6">
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b border-stone-200">
                  <td className="py-3 text-stone-500 w-1/3">รายการ / Description</td>
                  <td className="py-3 text-stone-800">ชำระค่างานตกแต่งภายใน งวดที่ {installmentNumber}</td>
                </tr>
                <tr className="border-b border-stone-200">
                  <td className="py-3 text-stone-500">โครงการ / Project</td>
                  <td className="py-3 text-stone-800">{project.name}</td>
                </tr>
                <tr className="border-b border-stone-200">
                  <td className="py-3 text-stone-500">วิธีชำระเงิน / Payment Method</td>
                  <td className="py-3 text-stone-800">{paymentMethod}</td>
                </tr>
                {note && (
                  <tr className="border-b border-stone-200">
                    <td className="py-3 text-stone-500">หมายเหตุ / Note</td>
                    <td className="py-3 text-stone-800">{note}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Amount Section */}
        <div className="mt-6 bg-stone-50 border border-stone-200 rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <span className="text-stone-500">จำนวนเงิน / Amount:</span>
            <span className="text-3xl text-stone-800 font-mono">{formatCurrency(amount)} บาท</span>
          </div>
          <div className="bg-white rounded-lg px-4 py-3 border border-stone-200">
            <div className="flex items-start gap-2">
              <span className="text-sm text-stone-500 whitespace-nowrap">จำนวนเงิน (ตัวอักษร):</span>
              <span className="text-sm text-stone-800">{amountText}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Signature Section */}
      <div className="px-8 py-6 bg-stone-50 border-t border-stone-200">
        <div className="grid grid-cols-2 gap-12">
          <div className="text-center">
            <p className="text-xs text-stone-500 mb-6">ผู้รับเงิน / Received By</p>
            <div className="mb-2">
              <div className="w-24 h-12 border-b border-slate-400" />
            </div>
            <div className="border-b border-stone-400 mb-1 pb-0.5 mx-12">
              <span className="invisible text-xs">Signature</span>
            </div>
            <p className="text-sm text-stone-800 mt-2">( {co?.signatureName || '-'} )</p>
            <p className="text-xs text-stone-500 mt-1">{receiptDate}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-stone-500 mb-6">ผู้ชำระเงิน / Paid By</p>
            <div className="mb-2">
              <span className="invisible text-xs h-12 block">Signature placeholder</span>
            </div>
            <div className="border-b border-stone-400 mb-1 pb-0.5 mx-12">
              <span className="invisible text-xs">Signature</span>
            </div>
            <p className="text-sm text-stone-800 mt-2">( ...................................... )</p>
            <p className="text-xs text-stone-500 mt-1">วันที่ ........................</p>
          </div>
        </div>
      </div>

      {/* Footer Note */}
      <div className="px-8 py-4 bg-stone-50 border-t border-stone-200">
        <p className="text-xs text-stone-500">
          <span className="font-medium">หมายเหตุ:</span> ใบเสร็จนี้จะสมบูรณ์เมื่อเช็คหรือเงินโอนเข้าบัญชีเรียบร้อยแล้ว •
          กรุณาเก็บใบเสร็จไว้เป็นหลักฐาน
        </p>
      </div>

      {/* Footer */}
      <div className="bg-[var(--doc-primary)] text-white py-2 text-center">
        <p className="text-xs text-stone-400">{co?.companyName?.toUpperCase() || '-'} • {co?.email || '-'} • {co?.phone || '-'}</p>
      </div>

      {/* Print Button */}
      <div className="p-4 bg-white border-t border-stone-200 print:hidden">
        <button
          onClick={() => window.print()}
          className="w-full bg-[var(--doc-primary)] hover:bg-[var(--doc-primary-hover)] text-white py-3 px-6 rounded-lg transition-colors"
        >
          พิมพ์ใบเสร็จ
        </button>
      </div>
    </div>
  );
}
