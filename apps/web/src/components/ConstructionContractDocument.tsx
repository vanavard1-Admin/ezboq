import React from 'react';
import { FileSignature, Building2, AlertCircle, CheckCircle2, Scale } from 'lucide-react';
import { prepareProjectDocuments, ProjectData } from '../utils/projectData';
import { loadCompanyProfile } from '../utils/companyProfile';
import { getDocumentCompanyTagline, getDocumentCompanyTitle } from '../utils/documentBrand';
import { findBankByName } from '../utils/thaiBankData';

interface ConstructionContractDocumentProps {
  project: ProjectData;
}

export function ConstructionContractDocument({ project }: ConstructionContractDocumentProps) {
  const co = loadCompanyProfile();
  const preparedProject = prepareProjectDocuments(project);

  const calculateTotal = () => {
    const costTotal = Math.round(preparedProject.totalCost || 0);
    const subtotal = Math.round(preparedProject.customerPrice || 0);
    const operationFee = Math.round(preparedProject.operatingCost || 0);
    const profit = Math.max(0, subtotal - costTotal);
    const grandTotal = subtotal + operationFee;

    return {
      costTotal,
      profit,
      subtotal,
      operationFee,
      grandTotal,
    };
  };

  const totals = calculateTotal();
  const firstPayment = Math.round(totals.grandTotal * 0.7); // 70%
  const secondPayment = Math.round(totals.grandTotal * 0.3); // 30%

  return (
    <div className="bg-white">
      {(!co?.companyName && !co?.phone) && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mx-8 mt-4 print:hidden">
          <p className="text-sm text-amber-800">กรุณากรอกข้อมูลบริษัทในหน้า "ข้อมูลบริษัท" ก่อนพิมพ์เอกสาร</p>
        </div>
      )}
      {/* Header - สีแดงเข้ม */}
      <div className="bg-gradient-to-r from-red-800 to-red-900 text-white p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <FileSignature className="w-8 h-8" />
              <div>
                <h1 className="text-2xl">สัญญารับเหมาก่อสร้าง</h1>
                <p className="text-red-100 text-sm">Construction Contract Agreement</p>
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-red-100">{getDocumentCompanyTitle(co)}</p>
            <p className="text-xs text-red-200">{getDocumentCompanyTagline(co)}</p>
          </div>
        </div>
      </div>

      {/* Document Info */}
      <div className="px-4 py-1.5 bg-gradient-to-r from-red-50 to-white border-b border-red-200">
        <div className="grid grid-cols-2 gap-3 text-[10px]">
          <div>
            <p className="text-slate-900 mb-0.5">เลขที่สัญญา:</p>
            <p className="text-xs text-slate-800">CONTRACT-2569-001</p>
          </div>
          <div>
            <p className="text-slate-900 mb-0.5">วันที่ทำสัญญา:</p>
            <p className="text-xs text-slate-800">3 มกราคม 2569</p>
          </div>
        </div>
      </div>

      {/* Parties */}
      <div className="px-6 py-4 border-b border-red-100">
        <h3 className="text-sm text-red-900 mb-3 flex items-center gap-2">
          <Scale className="w-4 h-4" />
          <span>คู่สัญญา</span>
        </h3>

        {/* ผู้ว่าจ้าง */}
        <div className="mb-4 bg-red-50/30 border border-red-100 rounded-lg p-3">
          <h4 className="text-xs text-red-800 mb-2">ผู้ว่าจ้าง (ฝ่าย "ก")</h4>
          <div className="text-[10px] text-slate-700 space-y-1">
            <p><strong>ชื่อ-สกุล:</strong> _____________________________________________</p>
            <p><strong>ที่อยู่:</strong> _____________________________________________</p>
            <p className="ml-16">_____________________________________________</p>
            <p><strong>เลขประจำตัวประชาชน:</strong> _____________________________________________</p>
            <p><strong>เบอร์โทรศัพท์:</strong> _____________________________________________</p>
          </div>
        </div>

        {/* ผู้รับจ้าง */}
        <div className="bg-red-50/30 border border-red-100 rounded-lg p-3">
          <h4 className="text-xs text-red-800 mb-2">ผู้รับจ้าง (ฝ่าย "ข")</h4>
          <div className="text-[10px] text-slate-700 space-y-1">
            <p><strong>ชื่อ:</strong> {co.companyName || '-'}</p>
            <p><strong>ที่อยู่:</strong> {co.address || '-'}</p>
            <p><strong>เบอร์โทรศัพท์:</strong> {co.phone || '-'}</p>
            <p><strong>อีเมล:</strong> {co.email || '-'}</p>
          </div>
        </div>
      </div>

      {/* Project Scope */}
      <div className="px-6 py-4 border-b border-red-100">
        <h3 className="text-sm text-red-900 mb-3 flex items-center gap-2">
          <Building2 className="w-4 h-4" />
          <span>ข้อ 1. ขอบเขตงาน</span>
        </h3>
        <div className="text-[10px] text-slate-700 mb-3">
          <p className="mb-2"><strong>โครงการ:</strong> {project.name}</p>
          <p className="mb-3"><strong>สถานที่:</strong> {project.address}</p>
          
          <p className="mb-2 text-red-800"><strong>งานที่ต้องทำตามสัญญา แบ่งเป็น 4 Cluster:</strong></p>
        </div>

        {/* Scope Details */}
        <div className="space-y-3">
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
            <h5 className="text-xs text-purple-800 mb-2">Cluster A: งานปรับปรุงพื้น</h5>
            <ul className="text-[10px] text-slate-700 space-y-1 list-disc list-inside ml-2">
              <li>ขัดมันพื้นคอนกรีตให้เรียบสม่ำเสมอ</li>
              <li>ปูนปรับระดับพื้น (Self-Leveling Mortar)</li>
            </ul>
          </div>

          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
            <h5 className="text-xs text-orange-800 mb-2">Cluster B: งานก่อสร้างและสถาปัตยกรรม</h5>
            <ul className="text-[10px] text-slate-700 space-y-1 list-disc list-inside ml-2">
              <li>งานก่อผนังด้วยอิฐมวลเบา ตามแบบ</li>
              <li>งานฉาบผิวผนังเรียบ</li>
              <li>งานเทคอนกรีต N บริเวณกรอบประตู</li>
              <li>ติดตั้งประตู จำนวน 2 บาน (ไม่รวมวงกบ)</li>
              <li>ทาสีรองพื้นเตรียมผิว</li>
            </ul>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <h5 className="text-xs text-blue-800 mb-2">Cluster C: งานกันซึมพื้นที่เปียก</h5>
            <ul className="text-[10px] text-slate-700 space-y-1 list-disc list-inside ml-2">
              <li>งานกันซึมระเบียง 2 ฝั่ง</li>
              <li>งานกันซึมห้องน้ำ</li>
              <li>ทา 2-3 coat ตามมาตรฐาน และทดสอบความรั่วซึม</li>
            </ul>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <h5 className="text-xs text-green-800 mb-2">Cluster D: งานปูกระเบื้องและเตรียมผิว</h5>
            <ul className="text-[10px] text-slate-700 space-y-1 list-disc list-inside ml-2">
              <li>ฉาบปูนปรับผิวผนัง/พื้น</li>
              <li>ปูตาข่ายเสริมแรงก่อนงานปูกระเบื้อง</li>
              <li>ปูกระเบื้อง 60x120 (กระเบื้องลูกค้าจัดหาเอง)</li>
              <li>เข้ามุม 45 องศา</li>
              <li>ยาแนวและเก็บงานเรียบร้อย</li>
            </ul>
            <p className="text-[9px] text-yellow-700 mt-2 flex items-start gap-1">
              <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
              <span><strong>หมายเหตุ:</strong> กระเบื้องปู1/2 60x120 ใช้ปูนเยอะ รวมงานฉาบผนังห้องน้ำ และเข้ามุม45 แล้ว</span>
            </p>
          </div>
        </div>
      </div>

      {/* Payment Terms */}
      <div className="px-6 py-4 border-b border-red-100 bg-red-50/20">
        <h3 className="text-sm text-red-900 mb-3 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>ข้อ 2. ค่าตอบแทนและการชำระเงิน</span>
        </h3>

        {/* Price Breakdown */}
        <div className="bg-white border border-red-200 rounded-lg p-4 mb-4">
          <table className="w-full text-[10px]">
            <tbody>
              <tr className="border-b border-slate-200">
                <td className="py-2 text-slate-700">มูลค่างานรวมทั้งหมด</td>
                <td className="py-2 text-right">{totals.subtotal.toLocaleString()} บาท</td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="py-2 text-slate-700">ค่าดำเนินการ (5%)</td>
                <td className="py-2 text-right">{totals.operationFee.toLocaleString()} บาท</td>
              </tr>
              <tr className="bg-red-50">
                <td className="py-2"><strong className="text-red-900">ราคารวมทั้งสิ้น</strong></td>
                <td className="py-2 text-right"><strong className="text-lg text-red-900">{totals.grandTotal.toLocaleString()} บาท</strong></td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Payment Schedule */}
        <h4 className="text-xs text-red-800 mb-2">กำหนดการชำระเงิน (แบ่งชำระ 2 งวด):</h4>
        <div className="space-y-2">
          <div className="bg-white border border-orange-200 rounded-lg p-3">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="bg-orange-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">1</div>
                <span className="text-xs text-orange-900">งวดที่ 1 (70%)</span>
              </div>
              <span className="text-sm text-orange-900"><strong>{firstPayment.toLocaleString()} บาท</strong></span>
            </div>
            <p className="text-[10px] text-slate-700 ml-8">
              <strong>เงื่อนไข:</strong> ชำระหลังงาน Cluster A+B เสร็จสมบูรณ์และผ่านการตรวจรับงาน
            </p>
          </div>

          <div className="bg-white border border-green-200 rounded-lg p-3">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">2</div>
                <span className="text-xs text-green-900">งวดที่ 2 (30%)</span>
              </div>
              <span className="text-sm text-green-900"><strong>{secondPayment.toLocaleString()} บาท</strong></span>
            </div>
            <p className="text-[10px] text-slate-700 ml-8">
              <strong>เงื่อนไข:</strong> ชำระหลังงาน Cluster C+D เสร็จสมบูรณ์และส่งมอบงาน
            </p>
          </div>
        </div>

        {/* Bank Info */}
        <div className="mt-4 bg-white border border-red-200 rounded-lg p-3">
          <h5 className="text-xs text-red-800 mb-2">บัญชีสำหรับโอนเงิน:</h5>
          <div className="flex items-start gap-3">
            {(() => { const _bi = findBankByName(co?.bankAccounts?.[0]?.bankName || ""); return _bi ? <img src={_bi.icon} alt={_bi.symbol} className="w-12 h-12 object-contain" /> : null; })()}
            <div className="text-[10px] text-slate-700 flex-1">
              <p><strong>ธนาคาร:</strong> {co.bankAccounts[0]?.bankName || '-'}</p>
              <p><strong>ชื่อบัญชี:</strong> {co.bankAccounts[0]?.accountName || '-'}</p>
              <p><strong>เลขที่บัญชี:</strong> {co.bankAccounts[0]?.accountNumber || '-'} (ออมทรัพย์)</p>
            </div>
          </div>
        </div>
      </div>

      {/* Duration */}
      <div className="px-6 py-4 border-b border-red-100">
        <h3 className="text-sm text-red-900 mb-2">ข้อ 3. ระยะเวลาดำเนินการ</h3>
        <div className="text-[10px] text-slate-700 space-y-1">
          <p>• ระยะเวลาทำงานประมาณ <strong className="text-red-900">17-25 วันทำการ</strong> นับจากวันเริ่มงาน</p>
          <p>• การทำงานต้องดำเนินการตาม Cluster ตามลำดับ A → B → C → D</p>
          <p>• ระยะเวลาอาจปรับเปลี่ยนตามสภาพอากาศและความพร้อมของวัสดุ</p>
        </div>
      </div>

      {/* Responsibilities */}
      <div className="px-6 py-4 border-b border-red-100">
        <h3 className="text-sm text-red-900 mb-2">ข้อ 4. หน้าที่และความรับผิดชอบ</h3>
        
        <div className="mb-3">
          <h4 className="text-xs text-red-800 mb-1">4.1 ฝ่าย "ข" (ผู้รับจ้าง) มีหน้าที่:</h4>
          <ul className="text-[10px] text-slate-700 space-y-1 list-disc list-inside ml-2">
            <li>ดำเนินงานให้เป็นไปตามขอบเขตงานที่ระบุในสัญญา</li>
            <li>จัดหาวัสดุก่อสร้างทุกรายการ ยกเว้นกระเบื้อง 60x120 (ลูกค้าจัดหา)</li>
            <li>จัดหาช่างและแรงงานที่มีคุณภาพ</li>
            <li>รักษาความสะอาดและความเป็นระเบียบในสถานที่ทำงาน</li>
            <li>รับประกันคุณภาพงานเป็นเวลา 1 ปี นับจากวันส่งมอบงาน</li>
          </ul>
        </div>

        <div>
          <h4 className="text-xs text-red-800 mb-1">4.2 ฝ่าย "ก" (ผู้ว่าจ้าง) มีหน้าที่:</h4>
          <ul className="text-[10px] text-slate-700 space-y-1 list-disc list-inside ml-2">
            <li>จัดหากระเบื้อง 60x120 ให้พร้อมก่อนเริ่มงาน Cluster D</li>
            <li>อำนวยความสะดวกในการเข้าทำงาน (น้ำ, ไฟฟ้า, สถานที่เก็บวัสดุ)</li>
            <li>ชำระเงินตามงวดที่ระบุในสัญญา</li>
            <li>ตรวจรับงานแต่ละ Milestone ตามกำหนด</li>
          </ul>
        </div>
      </div>

      {/* Warranty */}
      <div className="px-6 py-4 border-b border-red-100 bg-blue-50/30">
        <h3 className="text-sm text-red-900 mb-2">ข้อ 5. การรับประกัน</h3>
        <div className="text-[10px] text-slate-700 space-y-1">
          <p>• ฝ่าย "ข" รับประกันคุณภาพงานเป็นเวลา <strong className="text-blue-900">1 ปี</strong> นับจากวันส่งมอบงาน</p>
          <p>• หากเกิดความเสียหายจากฝีมือหรือวัสดุที่ฝ่าย "ข" จัดหา จะรับผิดชอบซ่อมแซมให้โดยไม่คิดค่าใช้จ่าย</p>
          <p>• ไม่รวมความเสียหายจากการใช้งานผิดวิธี หรือภัยธรรมชาติ</p>
        </div>
      </div>

      {/* Modification */}
      <div className="px-6 py-4 border-b border-red-100">
        <h3 className="text-sm text-red-900 mb-2">ข้อ 6. การเปลี่ยนแปลงงาน</h3>
        <div className="text-[10px] text-slate-700 space-y-1">
          <p>• หากมีการเพิ่ม-ลด หรือเปลี่ยนแปลงขอบเขตงาน ต้องตกลงราคาและระยะเวลาเป็นลายลักษณ์อักษร</p>
          <p>• การเปลี่ยนแปลงอาจส่งผลต่อราคาและระยะเวลาดำเนินการ</p>
        </div>
      </div>

      {/* Termination */}
      <div className="px-6 py-4 border-b border-red-100">
        <h3 className="text-sm text-red-900 mb-2">ข้อ 7. การบอกเลิกสัญญา</h3>
        <div className="text-[10px] text-slate-700 space-y-1">
          <p>• คู่สัญญาฝ่ายใดฝ่ายหนึ่งประสงค์จะบอกเลิกสัญญา ต้องแจ้งล่วงหน้า 7 วัน</p>
          <p>• ชำระค่าตอบแทนสำหรับงานที่ทำไปแล้ว ตามสัดส่วนที่เหมาะสม</p>
        </div>
      </div>

      {/* Agreement */}
      <div className="px-6 py-4 border-b border-red-100 bg-red-50/30">
        <div className="text-[10px] text-slate-700 text-center mb-3">
          <p className="mb-2">คู่สัญญาทั้งสองฝ่ายได้อ่านและเข้าใจข้อความในสัญญานี้โดยตลอดแล้ว</p>
          <p>จึงได้ลงลายมือชื่อไว้เป็นสำคัญต่อหน้าพยาน</p>
        </div>
      </div>

      {/* Signatures */}
      <div className="px-6 py-6 border-b border-red-200">
        <div className="grid grid-cols-2 gap-8 text-[10px] mb-8">
          <div className="text-center">
            <div className="border-b-2 border-red-300 mb-2 pb-16"></div>
            <p className="text-slate-900 mb-1">ผู้ว่าจ้าง (ฝ่าย "ก")</p>
            <p className="text-slate-600 mt-2">
              ( ____________________________________ )
            </p>
            <p className="text-slate-500 mt-1">วันที่: _____ / _____ / _____</p>
          </div>
          <div className="text-center">
            <div className="border-b-2 border-red-300 mb-2 pb-16"></div>
            <p className="text-slate-900 mb-1">ผู้รับจ้าง (ฝ่าย "ข")</p>
            <p className="text-slate-600 mt-2">
              {co.companyName || co.companyNameTh || 'ชื่อบริษัท'}
            </p>
            <p className="text-slate-500 mt-1">วันที่: _____ / _____ / _____</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 text-[10px] border-t border-red-200 pt-6">
          <div className="text-center">
            <div className="border-b border-red-200 mb-2 pb-12"></div>
            <p className="text-slate-700">พยาน</p>
            <p className="text-slate-600 mt-2">
              ( ____________________________________ )
            </p>
          </div>
          <div className="text-center">
            <div className="border-b border-red-200 mb-2 pb-12"></div>
            <p className="text-slate-700">พยาน</p>
            <p className="text-slate-600 mt-2">
              ( ____________________________________ )
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gradient-to-r from-red-800 to-red-900 text-white px-6 py-3">
        <div className="text-center text-[9px]">
          <p className="text-red-100">
            {co.companyName || co.companyNameTh || 'ชื่อบริษัท'} | {co.tagline || 'Interior Design & Construction'}
          </p>
          <p className="text-red-200 mt-1">
            โทร: {co.phone || '-'} | อีเมล: {co.email || '-'}
          </p>
        </div>
      </div>
    </div>
  );
}
