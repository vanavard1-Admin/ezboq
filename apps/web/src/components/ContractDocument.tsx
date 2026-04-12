import React, { useState } from 'react';
import { FileText, Building2, Pencil, Eye } from 'lucide-react';
import {
  ProjectData,
  getProjectCustomerAmount,
  getProjectDiscountAmount,
  getProjectOperatingCost,
  getProjectPaymentSchedule,
  prepareProjectDocuments,
  type PaymentInstallment,
} from '../utils/projectData';
import { findBankByName } from '../utils/thaiBankData';
import { loadCompanyProfile, type CompanyProfile } from '../utils/companyProfile';
import { getCurrentThaiDate } from '../utils/dateUtils';

interface ContractDocumentProps {
  project: ProjectData;
  companyProfile?: CompanyProfile;
}

export function ContractDocument({ project, companyProfile }: ContractDocumentProps) {
  const [isEditing, setIsEditing] = useState(false);
  const preparedProject = React.useMemo(() => prepareProjectDocuments(project), [project]);
  const quotationData = preparedProject.quotationData;
  const co = companyProfile || loadCompanyProfile();
  const thaiYear = new Date().getFullYear() + 543;
  const quotationNumber = `QT-${thaiYear}-001`;
  const invoiceNumber = `INV-${thaiYear}-001`;

  const categoryTotals: { [key: string]: number } = {};
  quotationData.forEach(item => {
    const mainCategory = item.no.split('.')[0];
    if (!categoryTotals[mainCategory]) {
      categoryTotals[mainCategory] = 0;
    }
    categoryTotals[mainCategory] += getProjectCustomerAmount(preparedProject, item);
  });

  // Calculate subtotal from all categories
  const subtotalBeforeDiscount = Object.values(categoryTotals).reduce((sum, amount) => sum + amount, 0);
  const discountAmount = getProjectDiscountAmount(preparedProject);
  const subtotal = Math.max(0, subtotalBeforeDiscount - discountAmount);
  const operationFee = getProjectOperatingCost(preparedProject, subtotal);
  const grandTotal = subtotal + operationFee;
  const workPlan = preparedProject.workPlan;
  const durationText = workPlan?.durationLabel
    ? `${workPlan.durationLabel} (${workPlan.totalWeeks} สัปดาห์)`
    : `${workPlan?.totalWeeks || 13} สัปดาห์`;

  const defaultContractSchedule: PaymentInstallment[] = [
    { no: 1, description: 'งวดที่ 1 – มัดจำเริ่มงาน', percentage: 20, amount: Math.round(grandTotal * 0.20), condition: 'ชำระก่อนเริ่มงานรื้อถอน (สัปดาห์ที่ 1)' },
    { no: 2, description: 'งวดที่ 2 – งวดโครงสร้าง + ระบบ', percentage: 20, amount: Math.round(grandTotal * 0.20), condition: 'ระบบไฟฟ้า-ประปาเสร็จ + ทดสอบผ่าน (สัปดาห์ที่ 4)' },
    { no: 3, description: 'งวดที่ 3 – งวดห้องน้ำ + ฝ้า + พื้น', percentage: 30, amount: Math.round(grandTotal * 0.30), condition: 'ห้องน้ำใช้งานได้ + ฝ้าและพื้นเสร็จ + ทาสีเสร็จ (สัปดาห์ที่ 8)' },
    { no: 4, description: 'งวดที่ 4 – งวด Built-in 50%', percentage: 20, amount: Math.round(grandTotal * 0.20), condition: 'Built-in เสร็จ 50% (Living + Kitchen + Master Bedroom) (สัปดาห์ที่ 11)' },
    { no: 5, description: 'งวดที่ 5 – งวดส่งมอบ งวดสุดท้าย', percentage: 10, amount: Math.round(grandTotal - (Math.round(grandTotal * 0.20) * 3) - Math.round(grandTotal * 0.30)), condition: 'Built-in 100% + เก็บงาน + Defect 2 รอบ + Big Cleaning (สัปดาห์ที่ 13)' },
  ];
  const contractPaymentSchedule = preparedProject.paymentSchedule?.length
    ? getProjectPaymentSchedule(preparedProject, grandTotal)
    : defaultContractSchedule;

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

    // Convert integer part
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
    <div id="contract-doc" className="max-w-[210mm] mx-auto bg-white print:shadow-none">
      {(!co?.companyName && !co?.phone) && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mx-8 mt-4 print:hidden">
          <p className="text-sm text-amber-800">กรุณากรอกข้อมูลบริษัทในหน้า "ข้อมูลบริษัท" ก่อนพิมพ์เอกสาร</p>
        </div>
      )}
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 15mm;
          }
          body {
            margin: 0;
            padding: 0;
          }
          #contract-doc {
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
      <div className="bg-[var(--doc-primary)] text-white px-8 py-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-6">
            {co?.logoUrl ? (
              <img src={co.logoUrl} alt="Logo" className="w-12 h-12 rounded-lg object-contain bg-white/10 p-1" />
            ) : (
              <div className="bg-white/10 p-3 rounded-lg border border-white/20">
                <Building2 className="w-8 h-8" />
              </div>
            )}
            <div>
              <h1 className="text-3xl tracking-wider mb-1">{co?.companyName?.toUpperCase() || '-'}</h1>
              <p className="text-sm text-stone-400">{co?.tagline || 'Interior Design & Construction'}</p>
            </div>
            <div className="border-l border-white/30 pl-6 ml-2">
              <div className="flex items-center gap-2 mb-1">
                <FileText className="w-5 h-5" />
                <h2 className="text-xl tracking-wide">สัญญารับเหมาก่อสร้าง</h2>
              </div>
              <p className="text-xs text-stone-400">CONSTRUCTION CONTRACT</p>
            </div>
          </div>
        </div>
      </div>

      {/* Edit / View toggle */}
      <div className="flex items-center gap-2 px-8 py-3 bg-stone-50 border-b border-stone-200 print:hidden">
        <button
          onClick={() => setIsEditing(!isEditing)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
            isEditing
              ? 'bg-[var(--doc-primary)] text-white'
              : 'border border-stone-200 text-stone-600 hover:bg-stone-100'
          }`}
        >
          {isEditing ? <Eye className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
          {isEditing ? 'ดูตัวอย่าง' : 'แก้ไขสัญญา'}
        </button>
        {isEditing && (
          <span className="text-[11px] text-stone-400">คลิกที่ข้อความในสัญญาเพื่อแก้ไขได้เลย</span>
        )}
      </div>

      {/* Contract Content */}
      <div
        className={`px-8 py-6 space-y-6 text-sm leading-relaxed ${isEditing ? 'ring-2 ring-stone-300 ring-inset [&_p]:outline-none [&_p]:hover:bg-amber-50/40 [&_p]:focus:bg-amber-50/60 [&_p]:rounded [&_p]:transition-colors' : ''}`}
        contentEditable={isEditing}
        suppressContentEditableWarning>
        {/* Title */}
        <div className="text-center space-y-2 print:page-break-inside-avoid">
          <h2 className="text-xl">สัญญารับเหมาก่อสร้าง</h2>
          <h3 className="text-base">โครงการ {preparedProject.name} (ปรับปรุงตกแต่งภายนอกและภายใน)</h3>
          <div className="text-xs space-y-1 mt-3">
            <p>หนังสือสัญญาฉบับนี้ทำขึ้นเมื่อ วันที่ {getCurrentThaiDate()}</p>
            <p>ณ ________________________________________________</p>
          </div>
        </div>

        {/* Parties */}
        <div className="space-y-4 print:page-break-inside-avoid">
          <div className="bg-stone-50 p-4 rounded-lg border border-stone-200">
            <h3 className="text-sm mb-3">ระหว่าง</h3>
            <div className="space-y-2 text-xs">
              <p className="underline">ผู้ว่าจ้าง</p>
              <p>ชื่อ: _______________________________________________</p>
              <p>ที่อยู่: {preparedProject.address}</p>
              <p>โทรศัพท์: {preparedProject.phone}</p>
              <p className="mt-2 text-stone-500">ซึ่งต่อไปในสัญญานี้เรียกว่า <span className="font-medium text-stone-800">"ผู้ว่าจ้าง"</span></p>
            </div>
          </div>

          <div className="text-center text-xs">และ</div>

          <div className="bg-stone-50 p-4 rounded-lg border border-stone-200">
            <h3 className="text-sm mb-3">ผู้รับจ้าง</h3>
            <div className="space-y-2 text-xs">
              <p>ชื่อ: <span className="font-medium">{co?.companyName || '-'} {co?.companyNameTh || '-'}</span></p>
              <p>เลขประจำตัวผู้เสียภาษี: {co?.taxId || '-'}</p>
              <p>ที่อยู่: {co?.address || '-'}</p>
              <p>โทรศัพท์: {co?.phone || '-'}</p>
              <p>อีเมล: {co?.email || '-'}</p>
              <p className="mt-2 text-stone-500">ซึ่งต่อไปในสัญญานี้เรียกว่า <span className="font-medium text-stone-800">"ผู้รับจ้าง"</span></p>
            </div>
          </div>

          <p className="text-xs text-center mt-4">คู่สัญญาทั้งสองฝ่ายได้ตกลงทำสัญญากัน มีข้อความดังต่อไปนี้</p>
        </div>

        {/* Section 1 */}
        <div className="space-y-3 print:page-break-inside-avoid">
          <h3 className="bg-[var(--doc-primary)] text-white px-3 py-1.5 rounded text-sm">หมวดที่ 1 ขอบเขตงานและเอกสารแนบท้ายสัญญา</h3>
          <div className="space-y-3 text-xs pl-4">
            <p className="leading-relaxed">
              <span className="font-medium">1.1</span> ผู้ว่าจ้างตกลงจ้าง และผู้รับจ้างตกลงรับจ้างดำเนินการปรับปรุง ตกแต่ง และติดตั้งงานตามโครงการ
              <span className="font-medium"> {preparedProject.name}</span> ณ สถานที่ตั้ง <span className="font-medium">{preparedProject.address || '-'}</span>
              ตามขอบเขตงาน ปริมาณงาน ชนิดวัสดุ และเงื่อนไขที่ระบุไว้ในสัญญาและเอกสารแนบท้ายทั้งหมด ซึ่งต่อไปนี้เรียกรวมว่า
              <span className="font-medium"> "งานตามสัญญา"</span>
            </p>
            <div>
              <p className="font-medium mb-2">1.2 เอกสารดังต่อไปนี้ให้ถือเป็นส่วนหนึ่งของสัญญาฉบับนี้</p>
              <div className="pl-4 space-y-1">
                <p>1.2.1 สัญญาฉบับนี้ และบันทึก/ภาคผนวก/หนังสือแก้ไขเพิ่มเติมที่คู่สัญญาลงนามร่วมกัน</p>
                <p>1.2.2 ใบเสนอราคา เลขที่ {quotationNumber} ลงวันที่ {getCurrentThaiDate()}</p>
                <p>1.2.3 รายการแสดงปริมาณงานและราคา (BOQ) รวมถึงรายการวัสดุและรายละเอียดงาน</p>
                <p>1.2.4 ใบวางบิล/ใบแจ้งหนี้ เลขที่ {invoiceNumber} และแผนการชำระเงินตามสัญญา</p>
                <p>1.2.5 แผนการทำงาน (Work Plan) ระยะเวลา {durationText}</p>
                <p>1.2.6 แบบก่อสร้าง แบบตกแต่ง แบบขยาย รายการสี/วัสดุ ตัวอย่างวัสดุ และภาพที่ผู้ว่าจ้างอนุมัติ</p>
                <p>1.2.7 หนังสือ/ข้อความยืนยันงานเพิ่ม-ลด (Change Order) ที่คู่สัญญาตกลงร่วมกันเป็นลายลักษณ์อักษร</p>
                <p>1.2.8 บันทึกส่งมอบพื้นที่ บันทึกตรวจรับงาน และบันทึกส่งมอบงาน</p>
              </div>
            </div>
            <p className="leading-relaxed">
              <span className="font-medium">1.3</span> หากเอกสารแนบท้ายขัดหรือแย้งกัน ให้ตีความโดยยึดลำดับดังนี้:
              ภาคผนวกแก้ไขเพิ่มเติม &gt; สัญญาฉบับนี้ &gt; Change Order ที่ลงนามร่วมกัน &gt; แผนการชำระเงิน/แผนงาน &gt; แบบที่อนุมัติ &gt; BOQ &gt; ใบเสนอราคา
            </p>
            <p className="leading-relaxed">
              <span className="font-medium">1.4</span> คำสั่งเปลี่ยนแปลงงาน เพิ่มงาน ลดงาน เลื่อนงาน หรือแก้ไขวัสดุที่มิได้กระทำเป็นลายลักษณ์อักษร
              และไม่ได้รับการยืนยันจากผู้มีอำนาจของคู่สัญญาทั้งสองฝ่าย จะยังไม่ถือเป็นข้อผูกพันให้ผู้รับจ้างต้องดำเนินการ
            </p>
            <p className="leading-relaxed">
              <span className="font-medium">1.5</span> งานตามสัญญานี้ไม่รวมงานหรือค่าใช้จ่ายที่มิได้ระบุไว้โดยชัดแจ้งในเอกสารแนบท้าย
              รวมถึงค่าธรรมเนียมหน่วยงานรัฐ งานนอกขอบเขตพื้นที่ งานซ่อมสภาพเดิมที่ซ่อนอยู่ และวัสดุ/อุปกรณ์ที่ผู้ว่าจ้างจัดหาเอง เว้นแต่จะตกลงไว้เป็นหนังสือ
            </p>
          </div>
        </div>

        {/* Section 2 */}
        <div className="space-y-3 print:page-break-inside-avoid">
          <h3 className="bg-[var(--doc-primary)] text-white px-3 py-1.5 rounded text-sm">หมวดที่ 2 ระยะเวลาสัญญา การเริ่มงาน และการขยายเวลา</h3>
          <div className="space-y-3 text-xs pl-4">
            <p className="leading-relaxed">
              <span className="font-medium">2.1</span> คู่สัญญาตกลงให้ระยะเวลาดำเนินงานตามสัญญาเป็นเวลา <span className="font-medium">{durationText}</span>
              {workPlan?.startDate && workPlan?.endDate
                ? <> โดยมีกำหนดเริ่มงานวันที่ <span className="font-medium">{workPlan.startDate}</span> และคาดว่าแล้วเสร็จภายในวันที่ <span className="font-medium">{workPlan.endDate}</span></>
                : <> โดยเริ่มนับเมื่อผู้ว่าจ้างส่งมอบพื้นที่และครบเงื่อนไขการเริ่มงาน</>}
            </p>
            <p className="leading-relaxed">
              <span className="font-medium">2.2</span> ผู้รับจ้างจะเริ่มงานเมื่อครบทุกเงื่อนไขดังต่อไปนี้แล้ว:
              (ก) คู่สัญญาลงนามในสัญญาครบถ้วน (ข) ผู้ว่าจ้างชำระเงินงวดที่ 1 ครบถ้วน
              (ค) ผู้ว่าจ้างส่งมอบพื้นที่ทำงานที่พร้อมเข้าดำเนินการจริง และ (ง) ผู้ว่าจ้างจัดเตรียมไฟฟ้า น้ำ และการอนุญาตเข้าพื้นที่ตามสมควรแล้ว
            </p>
            <p className="leading-relaxed">
              <span className="font-medium">2.3</span> หากเกิดเหตุใด ๆ ที่ไม่ใช่ความผิดของผู้รับจ้าง เช่น ผู้ว่าจ้างส่งมอบพื้นที่ล่าช้า,
              ผู้ว่าจ้างไม่อนุมัติแบบ/สี/วัสดุภายในเวลาที่กำหนด, วัสดุที่ผู้ว่าจ้างจัดหามาส่งล่าช้าหรือไม่ได้มาตรฐาน,
              พบสภาพหน้างานเดิมหรือความเสียหายซ่อนเร้นภายหลังรื้อถอน, มีบุคคลภายนอกหรือผู้รับเหมารายอื่นเข้าทำงานแทรก,
              หรือเกิดเหตุสุดวิสัย/คำสั่งหน่วยงานรัฐ ให้กำหนดเวลาแล้วเสร็จขยายออกไปตามระยะเวลาที่เสียไปจริงรวมเวลาเตรียมกลับเข้าหน้างานตามสมควร
            </p>
            <p className="leading-relaxed">
              <span className="font-medium">2.4</span> ผู้รับจ้างจะแจ้งเหตุที่มีผลกระทบต่อเวลาเป็นลายลักษณ์อักษรภายในเวลาอันสมควร
              พร้อมระบุผลกระทบต่อแผนงานโดยประมาณ ทั้งนี้ไม่ถือเป็นการสละสิทธิหากเหตุการณ์ดังกล่าวเห็นได้ชัดเจนจากพฤติการณ์แห่งหน้างาน
            </p>
            <p className="leading-relaxed">
              <span className="font-medium">2.5</span> ในกรณีผู้รับจ้างล่าช้าโดยมีสาเหตุจากความผิดของผู้รับจ้างแต่เพียงฝ่ายเดียว
              ผู้ว่าจ้างมีสิทธิเรียกค่าปรับในอัตรา <span className="font-medium">ร้อยละ 0.03 ต่อวัน</span> ของมูลค่างานส่วนที่ล่าช้า
              นับแต่วันที่พ้นกำหนดส่งมอบของงานส่วนนั้น โดยรวมแล้วไม่เกินร้อยละ 10 ของมูลค่างานส่วนที่ล่าช้า
            </p>
            <p className="leading-relaxed">
              <span className="font-medium">2.6</span> งานเพิ่ม ลด หรือเปลี่ยนแปลงจากขอบเขตเดิม จะมีผลต่อราคาและระยะเวลาต่อเมื่อคู่สัญญาตกลงกันเป็นหนังสือก่อนดำเนินการ
            </p>
          </div>
        </div>

        {/* Section 3 - Payment */}
        <div className="space-y-3 print:page-break-before">
          <h3 className="bg-[var(--doc-primary)] text-white px-3 py-1.5 rounded text-sm">หมวดที่ 3 ค่าจ้างตามสัญญา การตรวจรับงวดงาน และการชำระเงิน</h3>
          <div className="space-y-3 text-xs pl-4">
            <div>
              <p className="leading-relaxed mb-2">
                <span className="font-medium">3.1</span> ราคาค่าจ้างตามสัญญานี้เป็นเงินรวมทั้งสิ้น
              </p>
              <div className="bg-stone-50 p-3 rounded border border-stone-200">
                <p className="text-base text-stone-800">
                  ยอดชำระทั้งหมด (Grand Total): <span className="font-medium">{formatCurrency(grandTotal)} บาท</span>
                </p>
                <p className="text-xs text-stone-500 mt-1">({numberToThaiText(grandTotal)})</p>
                <div className="mt-2 pt-2 border-t border-stone-200 space-y-1">
                  <p className="text-xs text-stone-500">ซึ่งคำนวณจาก</p>
                  <p className="text-xs text-stone-800">รวมก่อนหักส่วนลด: {formatCurrency(subtotalBeforeDiscount)} บาท</p>
                  {discountAmount > 0 && (
                    <p className="text-xs text-rose-700">{preparedProject.discountConfig?.label || 'ส่วนลด'}: -{formatCurrency(discountAmount)} บาท</p>
                  )}
                  {operationFee > 0 && (
                    <p className="text-xs text-stone-800">ค่าดำเนินการ: {formatCurrency(operationFee)} บาท</p>
                  )}
                </div>
              </div>
            </div>

            <div>
              <p className="font-medium mb-2">3.2 ผู้ว่าจ้างตกลงแบ่งชำระเป็น {contractPaymentSchedule.length} งวด ดังนี้</p>
              <div className="space-y-2 mt-3">
                {contractPaymentSchedule.map((installment) => (
                  <div key={installment.no} className="bg-stone-50 p-2 rounded border border-stone-200">
                    <div className="flex justify-between items-start mb-1">
                      <p className="text-[10px] font-medium text-stone-800">
                        {installment.description} ({installment.percentage}%)
                      </p>
                      <p className="text-[10px] font-medium text-stone-800">{formatCurrency(installment.amount)} บาท</p>
                    </div>
                    {installment.condition && (
                      <p className="text-[9px] text-stone-500">เงื่อนไขงวดงาน: {installment.condition}</p>
                    )}
                  </div>
                ))}
              </div>
              <p className="mt-3 text-[10px] text-stone-500">
                รวมทั้งสิ้น {contractPaymentSchedule.length} งวด คิดเป็น 100% ของราคาค่าจ้างตามสัญญา
              </p>
            </div>

            <p className="leading-relaxed">
              <span className="font-medium">3.3</span> เมื่อผู้รับจ้างแจ้งว่างานในงวดใดเสร็จพร้อมตรวจรับ ผู้ว่าจ้างต้องตรวจรับและแจ้งผลเป็นหนังสือภายใน
              <span className="font-medium"> 3 วันทำการ</span> นับแต่ได้รับแจ้ง หากผู้ว่าจ้างไม่แจ้งข้อโต้แย้งเป็นหนังสือพร้อมระบุเหตุแห่งการไม่รับงานโดยชัดแจ้ง
              ให้ถือว่าผู้ว่าจ้างยอมรับผลงานงวดนั้นโดยปริยาย และผู้รับจ้างมีสิทธิออกใบวางบิล/ใบแจ้งหนี้ได้ทันที
            </p>

            <div className="bg-stone-50 p-3 rounded border border-stone-200">
              <p className="font-medium mb-2">3.4 การชำระเงินให้โอนเข้าบัญชีต่อไปนี้</p>
              <div className="flex items-start gap-3">
                {(() => { const _bi = findBankByName(co?.bankAccounts?.[0]?.bankName || ""); return _bi ? <img src={_bi.icon} alt={_bi.symbol} className="w-12 h-12 object-contain" /> : null; })()}
                <div className="flex-1 space-y-1 text-xs">
                  <p>ธนาคาร: <span className="font-medium">{co?.bankAccounts?.[0]?.bankName || '-'}</span></p>
                  <p>เลขที่บัญชี: <span className="font-medium">{co?.bankAccounts?.[0]?.accountNumber || '-'}</span></p>
                  <p>ชื่อบัญชี: <span className="font-medium">{co?.bankAccounts?.[0]?.accountName || '-'}</span></p>
                </div>
              </div>
              <p className="mt-2 text-[10px] text-stone-500">
                ผู้ว่าจ้างต้องชำระเงินภายใน <span className="font-medium text-stone-800">3 วันทำการ</span> นับแต่วันที่ได้รับใบวางบิล/ใบแจ้งหนี้ของงวดนั้น
              </p>
            </div>

            <p className="leading-relaxed">
              <span className="font-medium">3.5</span> หากผู้ว่าจ้างผิดนัดชำระเงินเกินกำหนด ผู้รับจ้างมีสิทธิแจ้งเตือนเป็นหนังสือ
              และหากพ้น 3 วันนับแต่วันเตือนแล้วยังไม่ชำระ ผู้รับจ้างมีสิทธิหยุดงานชั่วคราว ระงับการสั่งวัสดุ หรือเลื่อนกำหนดส่งมอบออกไปเท่ากับจำนวนวันที่ค้างชำระ
              รวมเวลาระดมคนงานกลับเข้าหน้างาน และมีสิทธิเรียกดอกเบี้ยผิดนัดตามกฎหมาย รวมทั้งค่าใช้จ่ายที่เกิดขึ้นจริงจากการหยุดและกลับเข้าดำเนินงาน
            </p>

            <p className="leading-relaxed">
              <span className="font-medium">3.6</span> เงินงวดที่ 1 ถือเป็นเงินสำหรับสำรองคิวงาน ค่าเตรียมการเข้าหน้างาน ค่าระดมคนงาน ค่าออกแบบ/วัดหน้างาน
              และ/หรือค่าสั่งซื้อวัสดุเฉพาะงานตามสมควร หากผู้ว่าจ้างยกเลิกสัญญาโดยมิใช่ความผิดของผู้รับจ้าง ผู้รับจ้างมีสิทธิหักค่าใช้จ่ายที่เกิดขึ้นจริง
              หรือภาระผูกพันที่ได้ก่อขึ้นแล้วก่อนคืนส่วนที่เหลือ (ถ้ามี)
            </p>

            <p className="leading-relaxed">
              <span className="font-medium">3.7</span> ในกรณีที่ผู้ว่าจ้างมีหน้าที่หักภาษี ณ ที่จ่าย ผู้ว่าจ้างต้องนำส่งและออกหนังสือรับรองการหักภาษี ณ ที่จ่ายให้ผู้รับจ้างภายใน 7 วัน
              นับแต่วันที่ชำระเงินแต่ละงวด
            </p>
          </div>
        </div>

        {/* Sections 4-5 */}
        <div className="space-y-3 print:page-break-inside-avoid">
          <h3 className="bg-[var(--doc-primary)] text-white px-3 py-1.5 rounded text-sm">หมวดที่ 4 หน้าที่และความรับผิดของผู้ว่าจ้าง</h3>
          <div className="space-y-3 text-xs pl-4">
            <p className="leading-relaxed">
              <span className="font-medium">4.1</span> ผู้ว่าจ้างต้องส่งมอบพื้นที่ทำงานที่พร้อมเข้าดำเนินการจริง จัดให้มีทางเข้าออก ไฟฟ้า น้ำประปา และการอนุญาตจากเจ้าของพื้นที่/นิติบุคคล/หน่วยงานที่เกี่ยวข้องตามสมควร
            </p>
            <p className="leading-relaxed">
              <span className="font-medium">4.2</span> ผู้ว่าจ้างต้องแต่งตั้งผู้ประสานงานหรือผู้มีอำนาจตัดสินใจอย่างน้อย 1 คน
              เพื่ออนุมัติแบบ สี วัสดุ และรับ/ตอบหนังสือแจ้งต่าง ๆ โดยคำสั่งจากบุคคลอื่นที่มิใช่ผู้มีอำนาจจะยังไม่ผูกพันผู้รับจ้างจนกว่าจะได้รับการยืนยันเป็นลายลักษณ์อักษร
            </p>
            <p className="leading-relaxed">
              <span className="font-medium">4.3</span> ผู้ว่าจ้างต้องอนุมัติแบบ สี วัสดุ ตัวอย่าง และงานเพิ่ม-ลด ภายใน 3 วันทำการนับแต่วันที่ได้รับเสนอ
              หากล่าช้ากว่านั้น ให้ถือเป็นเหตุขยายเวลาและ/หรือปรับแผนงานได้ตามจริง
            </p>
            <p className="leading-relaxed">
              <span className="font-medium">4.4</span> วัสดุหรืออุปกรณ์ที่ผู้ว่าจ้างจัดหาเอง ผู้ว่าจ้างต้องจัดส่งให้ครบถ้วน ตรงสเปก และตรงเวลา
              หากล่าช้า เสียหาย ไม่ตรงสเปก หรือใช้งานไม่ได้ ผู้รับจ้างมีสิทธิเลื่อนงานส่วนที่เกี่ยวข้องและไม่ต้องรับผิดในความเสียหายอันเกิดจากวัสดุนั้น
            </p>
            <p className="leading-relaxed">
              <span className="font-medium">4.5</span> ระหว่างดำเนินงาน ผู้ว่าจ้างจะไม่ให้ผู้รับเหมารายอื่นหรือบุคคลภายนอกเข้าทำงานแทรกในพื้นที่เดียวกัน
              หรือสั่งงานคนงานของผู้รับจ้างโดยตรง เว้นแต่ได้รับความยินยอมจากผู้รับจ้างเป็นลายลักษณ์อักษร
            </p>
          </div>
        </div>

        <div className="space-y-3 print:page-break-inside-avoid">
          <h3 className="bg-[var(--doc-primary)] text-white px-3 py-1.5 rounded text-sm">หมวดที่ 5 หน้าที่และความรับผิดของผู้รับจ้าง</h3>
          <div className="space-y-3 text-xs pl-4">
            <p className="leading-relaxed">
              <span className="font-medium">5.1</span> ผู้รับจ้างต้องดำเนินงานให้เป็นไปตามสัญญา เอกสารแนบท้าย แบบที่อนุมัติ และมาตรฐานงานก่อสร้าง/งานตกแต่งทั่วไปที่สมควรแก่ประเภทงาน
            </p>
            <p className="leading-relaxed">
              <span className="font-medium">5.2</span> ผู้รับจ้างอาจใช้ผู้รับจ้างช่วงหรือผู้ติดตั้งเฉพาะทางได้ แต่ยังคงรับผิดชอบคุณภาพและผลของงานต่อผู้ว่าจ้างทุกประการ
            </p>
            <p className="leading-relaxed">
              <span className="font-medium">5.3</span> ผู้รับจ้างจะควบคุมดูแลคนงาน เครื่องมือ และการทำงานให้เป็นระเบียบ ปลอดภัยตามสมควร
              และรักษาความสะอาดพื้นที่ในระดับที่เหมาะสมกับสภาพงานระหว่างก่อสร้าง
            </p>
            <p className="leading-relaxed">
              <span className="font-medium">5.4</span> หากพบว่างานหรือวัสดุที่ผู้รับจ้างจัดหาไม่เป็นไปตามสัญญา ผู้รับจ้างต้องแก้ไขหรือเปลี่ยนให้ถูกต้องโดยไม่คิดค่าใช้จ่ายเพิ่มเติม
              ทั้งนี้ ผู้รับจ้างมีสิทธิไม่ปฏิบัติตามคำสั่งที่ขัดต่อแบบ ขัดต่อความปลอดภัย หรือขัดต่อข้อกำหนดในสัญญา จนกว่าจะได้รับการยืนยันเป็นหนังสือ
            </p>
            <p className="leading-relaxed">
              <span className="font-medium">5.5</span> เมื่อผู้รับจ้างเห็นว่างานในงวดใดพร้อมตรวจรับหรือพร้อมส่งมอบ จะต้องแจ้งผู้ว่าจ้างเพื่อดำเนินการตรวจรับตามขั้นตอนในสัญญา
            </p>
          </div>
        </div>

        {/* Sections 6-9 */}
        <div className="space-y-3 print:page-break-inside-avoid">
          <h3 className="bg-[var(--doc-primary)] text-white px-3 py-1.5 rounded text-sm">หมวดที่ 6 วัสดุ งานเพิ่ม-ลด และสภาพหน้างานเดิม</h3>
          <div className="space-y-3 text-xs pl-4">
            <p className="leading-relaxed">
              <span className="font-medium">6.1</span> วัสดุที่ผู้รับจ้างจัดหาต้องเป็นไปตามที่ระบุใน BOQ หรือเอกสารแนบท้าย
              หากจำเป็นต้องเปลี่ยนยี่ห้อ รุ่น หรือชนิดวัสดุเนื่องจากเลิกผลิต ขาดตลาด หรือไม่เหมาะสมกับสภาพหน้างาน ผู้รับจ้างจะแจ้งผู้ว่าจ้างเพื่ออนุมัติเป็นลายลักษณ์อักษรก่อน
            </p>
            <p className="leading-relaxed">
              <span className="font-medium">6.2</span> งานเพิ่มงานลด หรือการเปลี่ยนแปลงใด ๆ จะต้องมีเอกสาร Change Order ระบุรายละเอียด ราคา ระยะเวลาเพิ่ม และเงื่อนไขชำระเงินอย่างชัดเจน
              และจะมีผลผูกพันต่อเมื่อผู้มีอำนาจของทั้งสองฝ่ายลงนามรับรองแล้ว
            </p>
            <p className="leading-relaxed">
              <span className="font-medium">6.3</span> หากภายหลังเริ่มงานหรือรื้อถอนแล้วพบความชำรุดบกพร่องเดิม งานซ่อนเร้น งานโครงสร้างเดิมไม่พร้อม
              ความชื้น น้ำรั่ว ปลวก งานระบบเดิมเสียหาย หรือเงื่อนไขหน้างานอื่นที่ไม่อาจทราบได้ตามปกติก่อนเริ่มงาน ให้ถือเป็นงานนอกขอบเขตเดิม
              ผู้รับจ้างมีสิทธิเสนอราคา/เวลาเพิ่มเติมและชะลอเฉพาะส่วนที่ได้รับผลกระทบจนกว่าจะได้ข้อยุติร่วมกัน
            </p>
            <p className="leading-relaxed">
              <span className="font-medium">6.4</span> สำหรับวัสดุหรืออุปกรณ์ที่ผู้ว่าจ้างจัดหาเอง ผู้รับจ้างรับผิดเฉพาะฝีมือการติดตั้งของผู้รับจ้าง
              ไม่รับประกันคุณภาพ อายุการใช้งาน การเข้ากันได้ของสินค้า หรือความเสียหายที่เกิดจากข้อบกพร่องของสินค้าเดิม
            </p>
          </div>
        </div>

        <div className="space-y-3 print:page-break-inside-avoid">
          <h3 className="bg-[var(--doc-primary)] text-white px-3 py-1.5 rounded text-sm">หมวดที่ 7 การตรวจรับ ส่งมอบงาน และการรับประกัน</h3>
          <div className="space-y-3 text-xs pl-4">
            <p className="leading-relaxed">
              <span className="font-medium">7.1</span> เมื่อผู้รับจ้างแจ้งว่างานเสร็จพร้อมส่งมอบ ผู้ว่าจ้างต้องเข้าตรวจรับและจัดทำรายการเก็บงาน (Punch List / Defect List) ภายใน 7 วัน
              หากผู้ว่าจ้างไม่จัดทำรายการภายในกำหนด ให้ถือว่ายอมรับงานในส่วนที่ส่งมอบนั้น เว้นแต่เป็นความชำรุดบกพร่องแฝงที่พิสูจน์ได้ว่าเกิดจากฝีมือผู้รับจ้าง
            </p>
            <p className="leading-relaxed">
              <span className="font-medium">7.2</span> หากผู้ว่าจ้างเข้าใช้ประโยชน์ในพื้นที่งานทั้งหมดหรือบางส่วนก่อนลงนามรับมอบงาน
              ให้ถือว่าพื้นที่ส่วนนั้นได้รับการส่งมอบโดยปริยาย นับแต่วันที่เริ่มใช้งาน เว้นแต่ข้อบกพร่องที่ผู้ว่าจ้างได้แจ้งสงวนสิทธิไว้เป็นหนังสือแล้ว
            </p>
            <p className="leading-relaxed">
              <span className="font-medium">7.3</span> ผู้รับจ้างรับประกันเฉพาะความชำรุดบกพร่องที่เกิดจากฝีมือการทำงานและการติดตั้งของผู้รับจ้างเป็นระยะเวลา
              <span className="font-medium"> 180 วัน</span> นับแต่วันที่ตรวจรับส่งมอบงานในส่วนที่เกี่ยวข้อง
              ส่วนวัสดุหรืออุปกรณ์สำเร็จรูปให้เป็นไปตามเงื่อนไขรับประกันของผู้ผลิต (ถ้ามี)
            </p>
            <p className="leading-relaxed">
              <span className="font-medium">7.4</span> การรับประกันไม่ครอบคลุมความเสียหายที่เกิดจากการทรุดตัวหรือความชำรุดเดิมของอาคาร,
              ความชื้น น้ำรั่ว การใช้งานผิดประเภท การดูแลรักษาไม่ถูกต้อง การดัดแปลงโดยบุคคลอื่น วัสดุที่ผู้ว่าจ้างจัดหาเอง ภัยธรรมชาติ เหตุสุดวิสัย
              หรือการเสื่อมสภาพตามอายุการใช้งานปกติ
            </p>
            <p className="leading-relaxed">
              <span className="font-medium">7.5</span> ผู้ว่าจ้างต้องแจ้งข้อบกพร่องเป็นหนังสือภายใน 7 วันนับแต่วันที่พบ
              และเปิดโอกาสให้ผู้รับจ้างเข้าตรวจสอบและแก้ไขก่อน หากเป็นกรณีฉุกเฉินที่ต้องแก้ไขทันที ผู้ว่าจ้างต้องแจ้งให้ผู้รับจ้างทราบโดยเร็วพร้อมเก็บหลักฐานไว้
            </p>
          </div>
        </div>

        <div className="space-y-3 print:page-break-inside-avoid">
          <h3 className="bg-[var(--doc-primary)] text-white px-3 py-1.5 rounded text-sm">หมวดที่ 8 การเลิกสัญญา การระงับงาน และการชำระบัญชี</h3>
          <div className="space-y-3 text-xs pl-4">
            <p className="leading-relaxed">
              <span className="font-medium">8.1</span> หากฝ่ายใดผิดสัญญาในสาระสำคัญ อีกฝ่ายต้องมีหนังสือบอกกล่าวให้แก้ไขภายใน 7 วันนับแต่ได้รับหนังสือ
              หากไม่แก้ไขภายในกำหนด อีกฝ่ายมีสิทธิบอกเลิกสัญญาได้
            </p>
            <p className="leading-relaxed">
              <span className="font-medium">8.2</span> ผู้ว่าจ้างมีสิทธิบอกเลิกสัญญาได้ หากผู้รับจ้างละทิ้งงานติดต่อกันเกิน 15 วันโดยไม่มีเหตุอันสมควร
              หรือปฏิเสธไม่แก้ไขงานที่ผิดไปจากสัญญาในสาระสำคัญภายหลังได้รับหนังสือบอกกล่าวแล้ว
            </p>
            <p className="leading-relaxed">
              <span className="font-medium">8.3</span> ผู้รับจ้างมีสิทธิบอกเลิกสัญญาได้ หากผู้ว่าจ้างค้างชำระเงินเกิน 7 วันนับแต่ครบกำหนดและได้รับหนังสือทวงถามแล้ว,
              ไม่ส่งมอบพื้นที่หรือไม่ให้เข้าทำงานตามสมควร, หรือสั่งเปลี่ยนแปลงงานโดยไม่ตกลงราคา/เวลาเป็นหนังสือจนทำให้งานไม่อาจดำเนินต่อได้
            </p>
            <p className="leading-relaxed">
              <span className="font-medium">8.4</span> หากสัญญาสิ้นสุดลงโดยมิใช่ความผิดของผู้รับจ้าง หรือผู้ว่าจ้างเป็นฝ่ายเลิกสัญญาโดยไม่มีเหตุอันเกิดจากผู้รับจ้าง
              ผู้ว่าจ้างต้องชำระค่าจ้างตามส่วนงานที่ทำเสร็จแล้ว งานระหว่างทำ วัสดุที่สั่งซื้อหรือผลิตเฉพาะงานซึ่งไม่อาจคืนได้ ค่าเคลื่อนย้าย และค่าเสียหายที่เกิดขึ้นจริงแก่ผู้รับจ้าง
            </p>
            <p className="leading-relaxed">
              <span className="font-medium">8.5</span> หากผู้รับจ้างเป็นฝ่ายผิดสัญญา ผู้ว่าจ้างมีสิทธิหักกลบลบหนี้ได้เฉพาะค่าเสียหายที่พิสูจน์ได้จริง
              โดยต้องคำนึงถึงมูลค่างานที่ผู้รับจ้างได้ทำและวัสดุที่ผู้ว่าจ้างได้รับประโยชน์ไปแล้วด้วย
            </p>
          </div>
        </div>

        <div className="space-y-3 print:page-break-inside-avoid">
          <h3 className="bg-[var(--doc-primary)] text-white px-3 py-1.5 rounded text-sm">หมวดที่ 9 ข้อกำหนดเบ็ดเตล็ด</h3>
          <div className="space-y-3 text-xs pl-4">
            <p className="leading-relaxed">
              <span className="font-medium">9.1</span> ความสัมพันธ์ของคู่สัญญาตามสัญญานี้เป็นเพียงสัญญาจ้างทำของ มิใช่สัญญาจ้างแรงงาน หุ้นส่วน หรือตัวแทนทางกฎหมายระหว่างกัน
            </p>
            <p className="leading-relaxed">
              <span className="font-medium">9.2</span> หนังสือแจ้ง บันทึกส่งมอบ บันทึกตรวจรับ ใบวางบิล และคำบอกกล่าวใด ๆ อาจส่งโดยเอกสารกระดาษ
              อีเมล หรือระบบข้อความที่คู่สัญญาใช้ติดต่อกันตามปกติได้ โดยให้ถือหลักฐานการส่งและการอ่านข้อความเป็นพยานหลักฐานเบื้องต้น
            </p>
            <p className="leading-relaxed">
              <span className="font-medium">9.3</span> การผ่อนผัน การงดใช้สิทธิ หรือการไม่ใช้สิทธิของฝ่ายใดในครั้งหนึ่งครั้งใด
              ไม่ถือเป็นการสละสิทธิในครั้งต่อไป เว้นแต่จะทำเป็นหนังสือชัดแจ้ง
            </p>
            <p className="leading-relaxed">
              <span className="font-medium">9.4</span> หากข้อความข้อใดของสัญญานี้ตกเป็นโมฆะหรือใช้บังคับไม่ได้
              ให้ข้อความส่วนที่เหลือยังคงมีผลใช้บังคับต่อไปเท่าที่กฎหมายอนุญาต
            </p>
            <p className="leading-relaxed">
              <span className="font-medium">9.5</span> คู่สัญญาตกลงเจรจาและไกล่เกลี่ยข้อพิพาทกันโดยสุจริตก่อนเป็นเวลาไม่น้อยกว่า 15 วัน
              หากตกลงกันไม่ได้ ให้ใช้กฎหมายไทยบังคับและดำเนินคดีต่อศาลที่มีเขตอำนาจตามกฎหมาย
            </p>
            <p className="leading-relaxed">
              <span className="font-medium">9.6</span> หากคู่สัญญาฝ่ายใดเป็นนิติบุคคล ผู้ลงนามในสัญญารับรองว่าตนมีอำนาจลงนามผูกพันนิติบุคคลนั้นโดยชอบด้วยกฎหมาย
            </p>
          </div>
        </div>

        {/* Signature Section */}
        <div className="mt-8 space-y-6 print:page-break-inside-avoid">
          <div className="border-t-2 border-stone-300 pt-4">
            <p className="text-xs text-center mb-6">ข้อยืนยันและลงลายมือชื่อ</p>
            <p className="text-xs text-center mb-4">
              สัญญาฉบับนี้จัดทำขึ้นจำนวน 2 ฉบับ มีข้อความถูกต้องตรงกันทุกประการ<br/>
              คู่สัญญาได้อ่านและเข้าใจข้อความในสัญญาโดยตลอดแล้ว จึงลงลายมือชื่อไว้เป็นหลักฐาน
            </p>
            <p className="text-[10px] text-center text-stone-500">
              หากคู่สัญญาฝ่ายใดเป็นนิติบุคคล ให้ผู้มีอำนาจลงนามผูกพันนิติบุคคลนั้น และประทับตราบริษัท (ถ้ามี)
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 text-xs">
            <div className="space-y-4">
              <div>
                <p className="mb-8">ลงชื่อ _________________________________</p>
                <p className="text-center">( ____________________________________ )</p>
                <p className="text-center mt-1">ผู้ว่าจ้าง</p>
              </div>
              <div>
                <p className="mb-8">ลงชื่อ _________________________________</p>
                <p className="text-center">( ____________________________________ )</p>
                <p className="text-center mt-1">พยานฝ่ายผู้ว่าจ้าง</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <div className="mb-2 text-center">
                  <div className="w-24 h-12 border-b border-slate-400" />
                </div>
                <p className="text-center border-b border-stone-400 pb-1">{co?.bankAccounts?.[0]?.accountName || '-'}</p>
                <p className="text-center mt-1">ผู้รับจ้าง / {co?.signatureName || '-'}</p>
              </div>
              <div>
                <p className="mb-8">ลงชื่อ _________________________________</p>
                <p className="text-center">( ____________________________________ )</p>
                <p className="text-center mt-1">พยานฝ่ายผู้รับจ้าง</p>
              </div>
            </div>
          </div>

          <div className="text-center mt-6">
            <p className="text-xs text-stone-500">ตราประทับ (ถ้ามี)</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-[var(--doc-primary)] text-white py-2 text-center">
        <p className="text-[10px] text-stone-400">{co?.companyName?.toUpperCase() || '-'} • Your Trusted Interior Design Partner • {co?.email || '-'} • {co?.phone || '-'}</p>
      </div>

      {/* Print Button */}
      <div className="p-4 bg-white border-t border-stone-200 print:hidden flex gap-2">
        <button
          onClick={() => { setIsEditing(false); window.print(); }}
          className="flex-1 bg-[var(--doc-primary)] hover:bg-[var(--doc-primary-hover)] text-white py-2 px-6 rounded-lg transition-all text-sm"
        >
          พิมพ์สัญญา / Print Contract
        </button>
      </div>
    </div>
  );
}
