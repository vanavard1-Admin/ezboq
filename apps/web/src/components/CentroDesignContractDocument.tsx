import React from 'react';
import { findBankByName } from '../utils/thaiBankData';
import { ProjectData, QuotationItem } from '../utils/projectData';
import { loadCompanyProfile } from '../utils/companyProfile';
import { getCurrentThaiDate, formatThaiDate, addWeeks } from '../utils/dateUtils';

interface CentroDesignContractDocumentProps {
  project: ProjectData;
}

export function CentroDesignContractDocument({ project }: CentroDesignContractDocumentProps) {
  const co = loadCompanyProfile();
  const companyLogo = co.logoUrl || '/ezboq-logo.png';
  const quotationData = project.quotationData;

  const calculateAmount = (item: QuotationItem): number => {
    if (!item.quantity || item.quantity === '') return 0;
    const qty = Number(item.quantity);
    const unitPrice = Number(item.unitPrice) || 0;
    const laborCost = Number(item.laborCost) || 0;
    return qty * (unitPrice + laborCost);
  };

  const subtotalBeforeDiscount = quotationData.reduce((sum, item) => sum + calculateAmount(item), 0);
  const discountRate = project.discountConfig?.percent ?? 0.25;
  const discountLabel = project.discountConfig?.label ?? 'ส่วนลดพิเศษ 25%';
  const discountAmount = project.discountConfig?.amount != null
    ? project.discountConfig.amount
    : subtotalBeforeDiscount * discountRate;
  const grandTotal = subtotalBeforeDiscount - discountAmount;
  const payment1 = Math.ceil(grandTotal * 0.5);
  const payment2 = Math.ceil(grandTotal * 0.3);
  const payment3 = grandTotal - payment1 - payment2;

  const totalArea = quotationData
    .filter(item => item.no.includes('.') && item.unit === 'ตร.ม.')
    .reduce((sum, item) => sum + Number(item.quantity), 0);

  const startDate = new Date();
  const designEndDate = addWeeks(startDate, 2);
  const shopDrawingEndDate = addWeeks(startDate, 4);

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

  // Shared page styles
  const pageClass = "w-[210mm] min-h-[297mm] mx-auto bg-white relative";
  const contentPadding = "px-[25mm] pt-[20mm] pb-[15mm]";

  // Section header style
  const SectionHeader = ({ number, title }: { number: string; title: string }) => (
    <div className="mb-4 mt-6 first:mt-0">
      <h3 className="text-sm font-bold text-slate-900 border-b-2 border-slate-800 pb-1.5">
        หมวดที่ {number} &nbsp; {title}
      </h3>
    </div>
  );

  // Clause text style
  const clauseClass = "text-xs leading-relaxed text-slate-800 mb-2";
  const subClauseClass = "text-xs leading-relaxed text-slate-700 mb-1 pl-8";

  return (
    <div id="centro-contract-doc" className="max-w-[210mm] mx-auto bg-white print:shadow-none">
      {(!co?.companyName && !co?.phone) && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mx-8 mt-4 print:hidden">
          <p className="text-sm text-amber-800">กรุณากรอกข้อมูลบริษัทในหน้า "ข้อมูลบริษัท" ก่อนพิมพ์เอกสาร</p>
        </div>
      )}
      <style>{`
        @media print {
          @page { size: A4; margin: 0; }
          body { margin: 0; padding: 0; }
          .page-break { page-break-before: always; break-before: always; }
          .avoid-break { page-break-inside: avoid; break-inside: avoid; }
        }
      `}</style>

      {/* ==================== PAGE 1 ==================== */}
      <div className={pageClass}>
        <div className={contentPadding}>
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-300 pb-4 mb-6">
            <img src={companyLogo} alt={co.companyName || 'Company Logo'} className="h-12 object-contain" />
            <div className="text-right">
              <p className="text-[10px] text-slate-400 tracking-[0.3em] uppercase">Interior Design & Construction</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{co.email || '-'} | {co.phone || '-'}</p>
            </div>
          </div>

          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-xl font-bold tracking-wide text-slate-900">สัญญาว่าจ้างออกแบบตกแต่งภายใน</h1>
            <h2 className="text-base mt-1 text-slate-700">INTERIOR DESIGN SERVICE CONTRACT</h2>
            <div className="mt-4 text-xs text-slate-600 leading-relaxed">
              <p>โครงการ {project.name}</p>
              <p className="mt-1">หนังสือสัญญาฉบับนี้ทำขึ้นเมื่อวันที่ {getCurrentThaiDate()}</p>
              <p>ณ {project.address}</p>
            </div>
          </div>

          {/* Parties */}
          <div className="mb-8">
            <h3 className="text-sm font-bold text-slate-900 border-b-2 border-slate-800 pb-1.5 mb-4">คู่สัญญา</h3>

            <div className="mb-4">
              <p className={clauseClass}>
                <span className="font-bold">ผู้ว่าจ้าง:</span> &nbsp; {project.owner}
              </p>
              <p className={clauseClass}>
                <span className="font-bold">ที่อยู่:</span> &nbsp; {project.address}
              </p>
              <p className="text-xs text-slate-500 mb-4 italic">ซึ่งต่อไปในสัญญานี้เรียกว่า "ผู้ว่าจ้าง"</p>
            </div>

            <p className="text-center text-xs text-slate-500 mb-4">— และ —</p>

            <div className="mb-4">
              <p className={clauseClass}>
                <span className="font-bold">ผู้รับจ้าง:</span> &nbsp; {co.companyName || '-'}
              </p>
              <p className={clauseClass}>
                <span className="font-bold">ที่อยู่:</span> &nbsp; {co.address || '-'}
              </p>
              <p className={clauseClass}>
                <span className="font-bold">โทรศัพท์:</span> {co.phone || '-'} &nbsp;&nbsp; <span className="font-bold">อีเมล:</span> {co.email || '-'}
              </p>
              <p className="text-xs text-slate-500 mb-4 italic">ซึ่งต่อไปในสัญญานี้เรียกว่า "ผู้รับจ้าง"</p>
            </div>

            <p className="text-xs leading-relaxed text-slate-800 text-center">
              คู่สัญญาทั้งสองฝ่ายได้ตกลงทำสัญญากัน โดยมีข้อความดังต่อไปนี้
            </p>
          </div>

          {/* Section 1 - Scope */}
          <SectionHeader number="1" title="ขอบเขตงานออกแบบ" />

          <p className={clauseClass}>
            <span className="font-bold">1.1</span> &nbsp; ผู้ว่าจ้างตกลงจ้าง และผู้รับจ้างตกลงรับจ้างออกแบบตกแต่งภายใน โครงการ <span className="font-semibold">{project.name}</span> ณ ที่ตั้ง {project.address}
          </p>

          <p className={clauseClass}>
            <span className="font-bold">1.2 พื้นที่ออกแบบ:</span>
          </p>
          <div className="pl-8 mb-3">
            {quotationData.filter(item => item.no.includes('.')).map((item, index) => (
              <p key={index} className="text-xs leading-relaxed text-slate-700">
                • &nbsp; {item.description} ({item.quantity} {item.unit})
              </p>
            ))}
            <p className="text-xs leading-relaxed text-slate-800 font-semibold mt-1">
              รวมพื้นที่ทั้งหมด: {totalArea.toFixed(2)} ตารางเมตร
            </p>
          </div>

          <p className={clauseClass}>
            <span className="font-bold">1.3 สิ่งที่ผู้ว่าจ้างจะได้รับ (Deliverables):</span>
          </p>
          <div className="pl-8 mb-3 grid grid-cols-2 gap-x-6">
            <p className="text-xs leading-loose text-slate-700">1) Layout Plan / Furniture Plan</p>
            <p className="text-xs leading-loose text-slate-700">2) 3D Perspective</p>
            <p className="text-xs leading-loose text-slate-700">3) Elevation Drawing</p>
            <p className="text-xs leading-loose text-slate-700">4) Section Drawing</p>
            <p className="text-xs leading-loose text-slate-700">5) Lighting Design</p>
            <p className="text-xs leading-loose text-slate-700">6) Material Specification</p>
            <p className="text-xs leading-loose text-slate-700">7) Shop Drawing (แบบก่อสร้าง)</p>
            <p className="text-xs leading-loose text-slate-700">8) BOQ + ใบเสนอราคาบิ้วอิน</p>
          </div>
        </div>
      </div>

      {/* ==================== PAGE 2 ==================== */}
      <div className={`${pageClass} page-break`}>
        <div className={contentPadding}>
          <SectionHeader number="2" title="ระยะเวลาดำเนินการ และแผนการทำงาน" />

          <p className={clauseClass}>
            <span className="font-bold">2.1</span> &nbsp; คู่สัญญาตกลงให้สัญญานี้มีระยะเวลาดำเนินการรวม <span className="font-semibold">1 เดือน (4 สัปดาห์)</span> นับตั้งแต่วันที่ {getCurrentThaiDate()} ถึงวันที่ {formatThaiDate(shopDrawingEndDate)}
          </p>

          <p className={clauseClass}>
            <span className="font-bold">2.2 แผนการทำงาน:</span> &nbsp; แบ่งเป็น 2 เฟส ดังนี้
          </p>

          {/* Phase 1 */}
          <p className="text-xs font-semibold text-slate-800 pl-4 mb-2">เฟสที่ 1: งานออกแบบ (สัปดาห์ที่ 1-2)</p>
          <table className="w-full border-collapse mb-4 ml-4" style={{ width: 'calc(100% - 16px)' }}>
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-slate-300 px-3 py-2 text-left text-xs font-semibold w-10">ลำดับ</th>
                <th className="border border-slate-300 px-3 py-2 text-left text-xs font-semibold">รายละเอียดงาน</th>
                <th className="border border-slate-300 px-3 py-2 text-left text-xs font-semibold w-32">กำหนด</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-slate-300 px-3 py-1.5 text-xs text-center">1</td>
                <td className="border border-slate-300 px-3 py-1.5 text-xs">เข้าวัดพื้นที่ ถ่ายรูป เก็บข้อมูล</td>
                <td className="border border-slate-300 px-3 py-1.5 text-xs text-slate-600">สัปดาห์ที่ 1</td>
              </tr>
              <tr className="bg-slate-50">
                <td className="border border-slate-300 px-3 py-1.5 text-xs text-center">2</td>
                <td className="border border-slate-300 px-3 py-1.5 text-xs">ขึ้น Mass / Concept Design</td>
                <td className="border border-slate-300 px-3 py-1.5 text-xs text-slate-600">สัปดาห์ที่ 1</td>
              </tr>
              <tr>
                <td className="border border-slate-300 px-3 py-1.5 text-xs text-center">3</td>
                <td className="border border-slate-300 px-3 py-1.5 text-xs">ออกแบบ Layout Plan, Furniture Plan, Elevation</td>
                <td className="border border-slate-300 px-3 py-1.5 text-xs text-slate-600">สัปดาห์ที่ 1-2</td>
              </tr>
              <tr className="bg-slate-50">
                <td className="border border-slate-300 px-3 py-1.5 text-xs text-center">4</td>
                <td className="border border-slate-300 px-3 py-1.5 text-xs">Render 3D Perspective + Lighting Design</td>
                <td className="border border-slate-300 px-3 py-1.5 text-xs text-slate-600">สัปดาห์ที่ 2</td>
              </tr>
              <tr>
                <td className="border border-slate-300 px-3 py-1.5 text-xs text-center">5</td>
                <td className="border border-slate-300 px-3 py-1.5 text-xs">ส่งแบบดราฟแรก (Draft 1) + Revise แบบ</td>
                <td className="border border-slate-300 px-3 py-1.5 text-xs text-slate-600">สัปดาห์ที่ 2</td>
              </tr>
              <tr className="bg-slate-50">
                <td className="border border-slate-300 px-3 py-1.5 text-xs text-center">6</td>
                <td className="border border-slate-300 px-3 py-1.5 text-xs">ส่งแบบรอบที่ 2 + สรุปแบบ</td>
                <td className="border border-slate-300 px-3 py-1.5 text-xs text-slate-600">สัปดาห์ที่ 2</td>
              </tr>
            </tbody>
          </table>

          {/* Phase 2 */}
          <p className="text-xs font-semibold text-slate-800 pl-4 mb-2">เฟสที่ 2: แบบก่อสร้าง (สัปดาห์ที่ 3-4)</p>
          <table className="w-full border-collapse mb-4 ml-4" style={{ width: 'calc(100% - 16px)' }}>
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-slate-300 px-3 py-2 text-left text-xs font-semibold w-10">ลำดับ</th>
                <th className="border border-slate-300 px-3 py-2 text-left text-xs font-semibold">รายละเอียดงาน</th>
                <th className="border border-slate-300 px-3 py-2 text-left text-xs font-semibold w-32">กำหนด</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-slate-300 px-3 py-1.5 text-xs text-center">7</td>
                <td className="border border-slate-300 px-3 py-1.5 text-xs">ส่งแบบไฟนอล (Final Design) + ชำระงวดที่ 2</td>
                <td className="border border-slate-300 px-3 py-1.5 text-xs text-slate-600">สัปดาห์ที่ 3</td>
              </tr>
              <tr className="bg-slate-50">
                <td className="border border-slate-300 px-3 py-1.5 text-xs text-center">8</td>
                <td className="border border-slate-300 px-3 py-1.5 text-xs">ทำแบบก่อสร้าง Shop Drawing, Section, Material Spec</td>
                <td className="border border-slate-300 px-3 py-1.5 text-xs text-slate-600">สัปดาห์ที่ 3-4</td>
              </tr>
              <tr>
                <td className="border border-slate-300 px-3 py-1.5 text-xs text-center">9</td>
                <td className="border border-slate-300 px-3 py-1.5 text-xs">ส่งแบบก่อสร้าง + BOQ + ใบเสนอราคาบิ้วอิน + ชำระงวดที่ 3</td>
                <td className="border border-slate-300 px-3 py-1.5 text-xs text-slate-600">สัปดาห์ที่ 4</td>
              </tr>
            </tbody>
          </table>

          {/* 2.3 Milestones */}
          <p className={clauseClass}>
            <span className="font-bold">2.3 Milestones สำคัญ:</span>
          </p>
          <table className="w-full border-collapse mb-4 ml-4" style={{ width: 'calc(100% - 16px)' }}>
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-slate-300 px-3 py-2 text-left text-xs font-semibold w-24">Milestone</th>
                <th className="border border-slate-300 px-3 py-2 text-left text-xs font-semibold">รายละเอียด</th>
                <th className="border border-slate-300 px-3 py-2 text-left text-xs font-semibold w-36">กำหนดส่ง</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-slate-300 px-3 py-1.5 text-xs font-semibold">M1</td>
                <td className="border border-slate-300 px-3 py-1.5 text-xs">ส่งแบบดราฟแรก + ชำระงวดที่ 2 ({formatCurrency(payment2)} บาท)</td>
                <td className="border border-slate-300 px-3 py-1.5 text-xs">{formatThaiDate(addWeeks(startDate, 2))}</td>
              </tr>
              <tr className="bg-slate-50">
                <td className="border border-slate-300 px-3 py-1.5 text-xs font-semibold">M2</td>
                <td className="border border-slate-300 px-3 py-1.5 text-xs">ส่งแบบไฟนอล (Final Design) — แบบสมบูรณ์หลัง Revise</td>
                <td className="border border-slate-300 px-3 py-1.5 text-xs">{formatThaiDate(designEndDate)}</td>
              </tr>
              <tr>
                <td className="border border-slate-300 px-3 py-1.5 text-xs font-semibold">M3</td>
                <td className="border border-slate-300 px-3 py-1.5 text-xs">ส่งแบบก่อสร้าง + BOQ + ชำระงวดที่ 3 ({formatCurrency(payment3)} บาท)</td>
                <td className="border border-slate-300 px-3 py-1.5 text-xs">{formatThaiDate(shopDrawingEndDate)}</td>
              </tr>
            </tbody>
          </table>

          {/* 2.4 Revisions */}
          <p className={clauseClass}>
            <span className="font-bold">2.4 การแก้ไขแบบ:</span> &nbsp; ผู้ว่าจ้างสามารถแจ้งแก้ไขแบบได้ไม่เกิน <span className="font-semibold">3 ครั้ง</span> ภายในระยะเวลา 1 เดือน ดังนี้
          </p>
          <p className={subClauseClass}>• &nbsp; ครั้งที่ 1-2: หลังส่งแบบดราฟ (Draft 1)</p>
          <p className={subClauseClass}>• &nbsp; ครั้งที่ 3: ก่อนสรุปแบบไฟนอล (Final Design)</p>
          <p className={subClauseClass}>• &nbsp; หากมีการแก้ไขครั้งที่ 4 ระยะเวลาขยายเพิ่ม +7 วัน (ไม่เกินวันที่ {formatThaiDate(addWeeks(shopDrawingEndDate, 1))})</p>
          <p className={subClauseClass}>• &nbsp; การแจ้งแก้ไขต้องทำเป็นลายลักษณ์อักษร (LINE, อีเมล หรือหนังสือ)</p>

          <p className={clauseClass}>
            <span className="font-bold">2.5</span> &nbsp; หากผู้ว่าจ้างไม่แจ้งแก้ไขภายใน <span className="font-semibold">3 วันทำการ</span> นับจากวันที่ได้รับแบบ ให้ถือว่าอนุมัติแบบนั้นโดยปริยาย
          </p>

          <p className={clauseClass}>
            <span className="font-bold">2.6</span> &nbsp; ระยะเวลาดำเนินการขยายตามจำนวนวันที่ผู้ว่าจ้างตอบกลับล่าช้าจากกำหนด
          </p>

          <p className={clauseClass}>
            <span className="font-bold">2.7 ค่าปรับกรณีส่งงานล่าช้า:</span> &nbsp; หากผู้รับจ้างส่งมอบงานล่าช้าจากกำหนดโดยไม่มีเหตุอันสมควร ผู้รับจ้างยินยอมชำระค่าปรับในอัตรา <span className="font-semibold">ร้อยละ 0.05 ของมูลค่าสัญญาต่อวัน</span> (คิดเป็น {formatCurrency(Math.round(grandTotal * 0.0005))} บาท/วัน) ทั้งนี้ค่าปรับรวมไม่เกินร้อยละ 10 ของมูลค่าสัญญา ({formatCurrency(Math.round(grandTotal * 0.1))} บาท) โดยไม่นับรวมวันล่าช้าอันเกิดจากผู้ว่าจ้าง หรือเหตุสุดวิสัย (Force Majeure)
          </p>
        </div>
      </div>

      {/* ==================== PAGE 3 ==================== */}
      <div className={`${pageClass} page-break`}>
        <div className={contentPadding}>
          <SectionHeader number="3" title="ค่าจ้างออกแบบ และการชำระเงิน" />

          <p className={clauseClass}>
            <span className="font-bold">3.1 ค่าจ้างออกแบบ:</span>
          </p>
          <table className="w-full border-collapse mb-4 ml-4" style={{ width: 'calc(100% - 16px)' }}>
            <tbody>
              <tr className="bg-slate-50">
                <td className="border border-slate-300 px-3 py-2 text-xs w-48">อัตราค่าออกแบบ</td>
                <td className="border border-slate-300 px-3 py-2 text-xs text-right">1,000 บาท / ตารางเมตร</td>
              </tr>
              <tr>
                <td className="border border-slate-300 px-3 py-2 text-xs">พื้นที่ออกแบบรวม</td>
                <td className="border border-slate-300 px-3 py-2 text-xs text-right">{totalArea.toFixed(2)} ตารางเมตร</td>
              </tr>
              <tr className="bg-slate-50">
                <td className="border border-slate-300 px-3 py-2 text-xs">รวมก่อนส่วนลด</td>
                <td className="border border-slate-300 px-3 py-2 text-xs text-right">{formatCurrency(subtotalBeforeDiscount)} บาท</td>
              </tr>
              <tr>
                <td className="border border-slate-300 px-3 py-2 text-xs">{discountLabel}</td>
                <td className="border border-slate-300 px-3 py-2 text-xs text-right">-{formatCurrency(discountAmount)} บาท</td>
              </tr>
              <tr className="bg-slate-800 text-white">
                <td className="border border-slate-600 px-3 py-2.5 text-xs font-bold">ยอดชำระทั้งหมด</td>
                <td className="border border-slate-600 px-3 py-2.5 text-xs font-bold text-right">{formatCurrency(grandTotal)} บาท ({numberToThaiText(grandTotal)})</td>
              </tr>
            </tbody>
          </table>

          <p className={clauseClass}>
            <span className="font-bold">3.2 การชำระเงิน:</span> &nbsp; แบ่งชำระเป็น 3 งวด ดังนี้
          </p>
          <table className="w-full border-collapse mb-4 ml-4" style={{ width: 'calc(100% - 16px)' }}>
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-slate-300 px-3 py-2 text-left text-xs font-semibold w-24">งวดที่</th>
                <th className="border border-slate-300 px-3 py-2 text-left text-xs font-semibold">รายละเอียด</th>
                <th className="border border-slate-300 px-3 py-2 text-right text-xs font-semibold w-28">จำนวนเงิน</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-slate-300 px-3 py-2 text-xs font-semibold">งวดที่ 1</td>
                <td className="border border-slate-300 px-3 py-2 text-xs">มัดจำ 50% — ชำระก่อนเริ่มดำเนินงาน</td>
                <td className="border border-slate-300 px-3 py-2 text-xs text-right font-semibold">{formatCurrency(payment1)} บาท</td>
              </tr>
              <tr className="bg-slate-50">
                <td className="border border-slate-300 px-3 py-2 text-xs font-semibold">งวดที่ 2</td>
                <td className="border border-slate-300 px-3 py-2 text-xs">30% — ชำระเมื่อส่งแบบดราฟแรก (Draft 1)</td>
                <td className="border border-slate-300 px-3 py-2 text-xs text-right font-semibold">{formatCurrency(payment2)} บาท</td>
              </tr>
              <tr>
                <td className="border border-slate-300 px-3 py-2 text-xs font-semibold">งวดที่ 3</td>
                <td className="border border-slate-300 px-3 py-2 text-xs">20% — ชำระเมื่อส่งแบบก่อสร้าง + BOQ</td>
                <td className="border border-slate-300 px-3 py-2 text-xs text-right font-semibold">{formatCurrency(payment3)} บาท</td>
              </tr>
            </tbody>
          </table>

          {discountAmount > 0 && (
            <p className={clauseClass}>
              <span className="font-bold">3.3 เงื่อนไข{discountLabel}:</span> &nbsp; ส่วนลดพิเศษนี้สำหรับลูกค้าที่ทำงานบิ้วอินกับ {co.companyName || '-'} เท่านั้น หากผู้ว่าจ้างตัดสินใจไม่ทำบิ้วอิน ผู้ว่าจ้างต้องชำระส่วนต่างค่าออกแบบเพิ่มเติม จำนวน <span className="font-semibold">{formatCurrency(discountAmount)} บาท ({numberToThaiText(discountAmount)})</span>
            </p>
          )}

          <p className={clauseClass}>
            <span className="font-bold">3.4 ช่องทางชำระเงิน:</span>
          </p>
          <div className="pl-8 mb-4 flex items-center gap-4 border border-slate-200 rounded p-3 ml-4" style={{ width: 'calc(100% - 32px)' }}>
            {(() => { const _bi = findBankByName(co?.bankAccounts?.[0]?.bankName || ""); return _bi ? <img src={_bi.icon} alt={_bi.symbol} className="w-10 h-10 object-contain" /> : null; })()}
            <div className="text-xs leading-relaxed text-slate-800">
              <p>{co.bankAccounts[0]?.bankName || '-'}</p>
              <p>เลขที่บัญชี: <span className="font-semibold">{co.bankAccounts[0]?.accountNumber || '-'}</span></p>
              <p>ชื่อบัญชี: <span className="font-semibold">{co.bankAccounts[0]?.accountName || '-'}</span></p>
            </div>
          </div>

          {/* Section 4 - IP */}
          <SectionHeader number="4" title="ทรัพย์สินทางปัญญาและลิขสิทธิ์" />

          <p className={clauseClass}>
            <span className="font-bold">4.1</span> &nbsp; ลิขสิทธิ์ในแบบทั้งหมดเป็นของผู้รับจ้าง จนกว่าผู้ว่าจ้างจะชำระเงินครบถ้วนทุกงวด
          </p>
          <p className={clauseClass}>
            <span className="font-bold">4.2</span> &nbsp; เมื่อชำระเงินครบ สิทธิ์ในการใช้งานแบบโอนให้ผู้ว่าจ้างเฉพาะโครงการนี้เท่านั้น ห้ามนำไปใช้กับโครงการอื่น ทำซ้ำ ดัดแปลง จำหน่าย หรือเผยแพร่โดยไม่ได้รับอนุญาตเป็นลายลักษณ์อักษร
          </p>
          <p className={clauseClass}>
            <span className="font-bold">4.3</span> &nbsp; ผู้รับจ้างสงวนสิทธิ์ในการนำผลงานไปใช้เป็น Portfolio เพื่อการประชาสัมพันธ์
          </p>
          <p className={clauseClass}>
            <span className="font-bold">4.4</span> &nbsp; ห้ามนำแบบมอบให้ผู้รับเหมารายอื่นโดยไม่ได้รับความยินยอม ยกเว้นกรณีนำแบบไปก่อสร้างจริงหลังชำระเงินครบถ้วน
          </p>
          <p className={clauseClass}>
            <span className="font-bold">4.5</span> &nbsp; หากมีการละเมิดลิขสิทธิ์ ผู้รับจ้างมีสิทธิ์เรียกค่าเสียหายตามกฎหมาย
          </p>
        </div>
      </div>

      {/* ==================== PAGE 4 ==================== */}
      <div className={`${pageClass} page-break`}>
        <div className={contentPadding}>
          <SectionHeader number="5" title="หน้าที่และความรับผิดชอบ" />

          <p className={clauseClass}>
            <span className="font-bold">5.1 หน้าที่ของผู้ว่าจ้าง:</span>
          </p>
          <p className={subClauseClass}>(ก) &nbsp; อำนวยความสะดวกในการเข้าสำรวจและวัดพื้นที่หน้างาน</p>
          <p className={subClauseClass}>(ข) &nbsp; แจ้งข้อมูลความต้องการ สไตล์ งบประมาณ และข้อจำกัดอย่างครบถ้วน</p>
          <p className={subClauseClass}>(ค) &nbsp; ตรวจสอบแบบและแจ้งรายการแก้ไขภายใน 3 วันทำการ</p>
          <p className={subClauseClass}>(ง) &nbsp; ชำระเงินตามกำหนดงวด หากล่าช้าเกิน 3 วัน ผู้รับจ้างมีสิทธิ์หยุดงานจนกว่าจะได้รับชำระ</p>
          <p className={subClauseClass}>(จ) &nbsp; จัดเตรียมข้อมูลพื้นที่ (แบบแปลน ขนาดห้อง ตำแหน่งปลั๊กไฟ/สวิตช์) เพื่อประกอบการออกแบบ</p>
          <p className={subClauseClass + " mb-4"}>(ฉ) &nbsp; เข้าร่วมนัดพบรีวิวแบบตามแผนงาน หากไม่สะดวกต้องแจ้งล่วงหน้าไม่น้อยกว่า 2 วัน</p>

          <p className={clauseClass}>
            <span className="font-bold">5.2 หน้าที่ของผู้รับจ้าง:</span>
          </p>
          <p className={subClauseClass}>(ก) &nbsp; ออกแบบอย่างมืออาชีพ คำนึงถึงประโยชน์ใช้สอย ความสวยงาม และงบประมาณ</p>
          <p className={subClauseClass}>(ข) &nbsp; ส่งมอบแบบตามกำหนดเวลา หากต้องเลื่อนแจ้งล่วงหน้าไม่น้อยกว่า 3 วัน</p>
          <p className={subClauseClass}>(ค) &nbsp; แก้ไขแบบไม่เกิน 3 ครั้ง ภายในระยะเวลาสัญญา (ครั้งที่ 4 ขยายเวลา +7 วัน)</p>
          <p className={subClauseClass}>(ง) &nbsp; ให้คำปรึกษาเรื่องวัสดุ สี เฟอร์นิเจอร์ และงานระบบเบื้องต้น</p>
          <p className={subClauseClass}>(จ) &nbsp; รักษาความลับข้อมูลผู้ว่าจ้าง ยกเว้นการใช้เป็น Portfolio ตามข้อ 4.3</p>
          <p className={subClauseClass}>(ฉ) &nbsp; จัดทำ BOQ และใบเสนอราคาบิ้วอินละเอียด แยกวัสดุและค่าแรงชัดเจน</p>
          <p className={subClauseClass + " mb-4"}>(ช) &nbsp; ประสานงานและรายงานความคืบหน้าอย่างสม่ำเสมอ</p>

          <p className={clauseClass}>
            <span className="font-bold">5.3 ข้อจำกัดความรับผิดชอบ:</span>
          </p>
          <p className={subClauseClass}>(ก) &nbsp; ผู้รับจ้างรับผิดชอบเฉพาะงานออกแบบ ไม่รวมงานก่อสร้างโดยผู้รับเหมารายอื่น</p>
          <p className={subClauseClass}>(ข) &nbsp; การเปลี่ยนแปลงขอบเขตงาน (เพิ่มห้อง เปลี่ยนสไตล์) ถือเป็นงานนอกสัญญา ต้องตกลงค่าใช้จ่ายเพิ่มแยกต่างหาก</p>
          <p className={subClauseClass + " mb-4"}>(ค) &nbsp; สีวัสดุในภาพ 3D อาจแตกต่างจากของจริงเล็กน้อย เนื่องจากข้อจำกัดของหน้าจอ</p>

          <SectionHeader number="6" title="การบอกเลิกสัญญาและการคืนเงิน" />

          <p className="text-xs font-semibold text-slate-800 mb-2 mt-2">กรณีผู้ว่าจ้างบอกเลิกสัญญา</p>

          <p className={clauseClass}>
            <span className="font-bold">6.1</span> &nbsp; ยกเลิก<span className="underline">ก่อน</span>เริ่มงาน: หักค่าดำเนินการ 30% จากเงินมัดจำงวดที่ 1 ส่วนที่เหลือคืนผู้ว่าจ้าง
          </p>
          <p className={clauseClass}>
            <span className="font-bold">6.2</span> &nbsp; ยกเลิก<span className="underline">หลัง</span>เริ่มงาน: เงินมัดจำงวดที่ 1 ไม่สามารถเรียกคืนได้
          </p>
          <p className={clauseClass}>
            <span className="font-bold">6.3</span> &nbsp; ยกเลิกหลังชำระงวดที่ 2: ไม่คืนเงินงวดที่ 1 และ 2 แต่ผู้รับจ้างส่งมอบ Layout Plan และ 3D Perspective ให้ผู้ว่าจ้าง
          </p>

          <p className="text-xs font-semibold text-slate-800 mb-2 mt-4">กรณีผู้รับจ้างผิดสัญญา</p>

          <p className={clauseClass}>
            <span className="font-bold">6.4</span> &nbsp; ผู้รับจ้างไม่สามารถส่งมอบงานได้ตามกำหนด โดยไม่มีเหตุสุดวิสัย: ผู้ว่าจ้างเรียกคืนเงินมัดจำงวดที่ 1 ได้เต็มจำนวน
          </p>
          <p className={clauseClass}>
            <span className="font-bold">6.5</span> &nbsp; ผู้รับจ้างส่งงานล่าช้าเกิน 14 วัน: ผู้ว่าจ้างมีสิทธิ์ยกเลิกสัญญาและเรียกคืนเงินทั้งหมดที่ชำระแล้ว
          </p>

          <p className="text-xs font-semibold text-slate-800 mb-2 mt-4">ขั้นตอนการบอกเลิก</p>

          <p className={clauseClass}>
            <span className="font-bold">6.6</span> &nbsp; ฝ่ายที่ประสงค์ยกเลิกต้องแจ้งเป็นลายลักษณ์อักษรล่วงหน้าไม่น้อยกว่า 7 วัน พร้อมระบุเหตุผล
          </p>
          <p className={clauseClass}>
            <span className="font-bold">6.7</span> &nbsp; การคืนเงินดำเนินการภายใน 15 วันทำการ ผ่านการโอนธนาคาร
          </p>
        </div>
      </div>

      {/* ==================== PAGE 5 ==================== */}
      <div className={`${pageClass} page-break`}>
        <div className={contentPadding}>
          <SectionHeader number="7" title="ข้อกำหนดทั่วไป" />

          <p className={clauseClass}>
            <span className="font-bold">7.1</span> &nbsp; สัญญานี้เป็นค่าออกแบบเท่านั้น ไม่รวมค่าก่อสร้าง วัสดุ เฟอร์นิเจอร์ หรือค่าแรง
          </p>
          <p className={clauseClass}>
            <span className="font-bold">7.2</span> &nbsp; หากผู้ว่าจ้างต้องการทำงานบิ้วอิน ให้จัดทำสัญญารับเหมาก่อสร้างแยกต่างหาก โดยอ้างอิงแบบและ BOQ จากสัญญานี้
          </p>
          <p className={clauseClass}>
            <span className="font-bold">7.3</span> &nbsp; การติดต่อสื่อสารสามารถทำผ่าน LINE อีเมล โทรศัพท์ หรือหนังสือ มีผลเมื่ออีกฝ่ายรับทราบ
          </p>
          <p className={clauseClass}>
            <span className="font-bold">7.4</span> &nbsp; เหตุสุดวิสัย (Force Majeure) ไม่ถือว่าผิดสัญญา ระยะเวลาขยายตามผลกระทบจริง
          </p>
          <p className={clauseClass}>
            <span className="font-bold">7.5</span> &nbsp; หากข้อกำหนดข้อใดไม่มีผลบังคับใช้ ข้อกำหนดอื่นยังคงมีผลปกติ
          </p>
          <p className={clauseClass}>
            <span className="font-bold">7.6</span> &nbsp; การแก้ไขเปลี่ยนแปลงสัญญาต้องทำเป็นลายลักษณ์อักษร และลงนามโดยคู่สัญญาทั้งสองฝ่าย
          </p>
          <p className={clauseClass}>
            <span className="font-bold">7.7</span> &nbsp; สัญญานี้อยู่ภายใต้กฎหมายไทย หากมีข้อพิพาทให้เจรจาไกล่เกลี่ยก่อน หากตกลงกันไม่ได้ให้ใช้สิทธิ์ทางศาล
          </p>

          {/* Signature Section */}
          <div className="mt-16 border-t-2 border-slate-400 pt-6">
            <p className="text-xs leading-relaxed text-slate-800 text-center mb-10">
              สัญญาฉบับนี้จัดทำขึ้น 2 ฉบับ มีข้อความตรงกัน คู่สัญญาได้อ่านและเข้าใจข้อความโดยตลอดแล้ว จึงลงลายมือชื่อไว้เป็นหลักฐาน
            </p>

            <div className="grid grid-cols-2 gap-12">
              {/* Left - ผู้ว่าจ้าง */}
              <div className="space-y-10">
                <div className="text-center">
                  <div className="h-16"></div>
                  <p className="text-xs border-b border-slate-400 pb-1 mx-4">ลงชื่อ ..................................................</p>
                  <p className="text-xs mt-2">( {project.owner} )</p>
                  <p className="text-xs text-slate-600 mt-0.5">ผู้ว่าจ้าง</p>
                </div>
                <div className="text-center">
                  <div className="h-16"></div>
                  <p className="text-xs border-b border-slate-400 pb-1 mx-4">ลงชื่อ ..................................................</p>
                  <p className="text-xs mt-2">( ..................................................... )</p>
                  <p className="text-xs text-slate-600 mt-0.5">พยานฝ่ายผู้ว่าจ้าง</p>
                </div>
              </div>

              {/* Right - ผู้รับจ้าง */}
              <div className="space-y-10">
                <div className="text-center">
                  <div className="h-4"></div>
                  <div className="w-24 h-12 border-b border-slate-400" />
                  <p className="text-xs border-b border-slate-400 pb-1 mx-4">{co.signatureName || '-'}</p>
                  <p className="text-xs mt-2">ผู้รับจ้าง / {co.companyName || '-'}</p>
                </div>
                <div className="text-center">
                  <div className="h-16"></div>
                  <p className="text-xs border-b border-slate-400 pb-1 mx-4">ลงชื่อ ..................................................</p>
                  <p className="text-xs mt-2">( ..................................................... )</p>
                  <p className="text-xs text-slate-600 mt-0.5">พยานฝ่ายผู้รับจ้าง</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 bg-slate-800 text-white py-2 text-center">
          <p className="text-[10px] text-slate-300">{co.companyName || co.companyNameTh || 'ชื่อบริษัท'} &nbsp;•&nbsp; {co.tagline || 'Interior Design & Construction'} &nbsp;•&nbsp; {co.email || '-'} &nbsp;•&nbsp; {co.phone || '-'}</p>
        </div>
      </div>

      {/* Print Button */}
      <div className="p-4 bg-white border-t border-slate-200 print:hidden">
        <button
          onClick={() => window.print()}
          className="w-full bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-800 hover:to-slate-900 text-white py-2.5 px-6 rounded-lg transition-all shadow-md hover:shadow-lg text-sm"
        >
          พิมพ์สัญญา / Print Contract
        </button>
      </div>
    </div>
  );
}
