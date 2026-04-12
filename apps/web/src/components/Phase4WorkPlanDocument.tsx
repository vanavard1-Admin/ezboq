import React from 'react';
import { Calendar, CheckCircle2, Clock } from 'lucide-react';
import { ProjectData } from '../utils/projectData';
import { loadCompanyProfile } from '../utils/companyProfile';

interface Phase4WorkPlanDocumentProps {
  project: ProjectData;
}

export function Phase4WorkPlanDocument({ project }: Phase4WorkPlanDocumentProps) {
  const co = loadCompanyProfile();

  // แผนการทำงานงานบิ้วอิน - เริ่ม 21 ม.ค. 2569 - 10 เม.ย. 2569
  const workPlan = [
    {
      cluster: 'H',
      phase: 'งานบิ้วอินเฟอร์นิเจอร์ทั้งหมด',
      items: [
        'ตรวจสอบและวัดขนาดพื้นที่ติดตั้งจริง',
        'ผลิตงานบิ้วอินตามแบบ 3D (14 รายการ)',
        'เข้าติดตั้งงานบิ้วอินทุกรายการ',
        'ตรวจสอบการใช้งานและปรับแต่งรายละเอียด',
        'เช็คงานและส่งมอบให้ลูกค้า',
      ],
      duration: '80 วัน (21 ม.ค. - 10 เม.ย. 2569)',
      milestone: 'งานบิ้วอินครบทั้ง 14 รายการ พร้อมใช้งาน',
      color: 'from-amber-600 to-orange-700',
    },
  ];

  // รายการงานบิ้วอินทั้ง 14 รายการ
  const builtinItems = [
    { code: 'BF-01', name: 'SHOE CABINET & STORAGE (ตู้รองเท้าและตู้เก็บของ)' },
    { code: 'BF-02', name: 'COUNTER PANTRY (เคาน์เตอร์แพนทรี) - ชุดที่ 1' },
    { code: 'BF-03', name: 'COUNTER PANTRY (เคาน์เตอร์แพนทรี) - ชุดที่ 2' },
    { code: 'BF-04', name: 'STORAGE (ตู้เก็บของ) - ชุดที่ 1' },
    { code: 'BF-05', name: 'TV. CABINET (ตู้วางทีวี)' },
    { code: 'BF-06', name: 'STORAGE (ตู้เก็บของ) - ชุดที่ 2' },
    { code: 'BF-07', name: 'WALL DECORATE & SIDE TABLE (ผนังตกแต่งและโต๊ะข้าง)' },
    { code: 'BF-08', name: 'CLOSET (ตู้เสื้อผ้า) - ชุดที่ 1' },
    { code: 'BF-09', name: 'DRESSING TABLE (โต๊ะเครื่องแป้ง)' },
    { code: 'BF-10', name: 'BENCH (ม้านั่งยาว)' },
    { code: 'BF-11', name: 'CLOSET (ตู้เสื้อผ้า) - ชุดที่ 2' },
    { code: 'BF-12', name: 'WALL DECORATE & BED (ผนังตกแต่งและเตียงนอน)' },
    { code: 'BF-13', name: 'CLOSET (ตู้เสื้อผ้า) - ชุดที่ 3' },
    { code: 'BF-14', name: 'CABINET & STORAGE (ตู้เก็บของ)' },
  ];

  // แผนการชำระเงิน 3 งวด
  const paymentSchedule = [
    { 
      no: 1, 
      description: 'งวดที่ 1 - มัดจำเริ่มงาน', 
      amount: 200000, 
      timing: 'ชำระก่อนเริ่มผลิต',
      color: 'bg-green-50 border-green-300'
    },
    { 
      no: 2, 
      description: 'งวดที่ 2 - ระหว่างดำเนินงาน', 
      amount: 200000, 
      timing: 'ชำระเมื่อผลิตเสร็จ 50%',
      color: 'bg-blue-50 border-blue-300'
    },
    { 
      no: 3, 
      description: 'งวดที่ 3 - ส่งมอบงานเรียบร้อย', 
      amount: 230000, 
      timing: 'ชำระเมื่องานติดตั้งเสร็จ 100%',
      color: 'bg-purple-50 border-purple-300'
    },
  ];

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('th-TH', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="bg-white">
      {(!co?.companyName && !co?.phone) && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mx-8 mt-4 print:hidden">
          <p className="text-sm text-amber-800">กรุณากรอกข้อมูลบริษัทในหน้า "ข้อมูลบริษัท" ก่อนพิมพ์เอกสาร</p>
        </div>
      )}
      {/* Header - สีทอง/ส้ม */}
      <div className="bg-gradient-to-r from-amber-600 to-orange-700 text-white p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Calendar className="w-8 h-8" />
              <div>
                <h1 className="text-2xl">แผนการทำงาน - งานบิ้วอิน</h1>
                <p className="text-orange-100 text-sm">Built-in Furniture Work Plan & Timeline</p>
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-orange-100">{co.companyName?.toUpperCase() || '-'}</p>
            <p className="text-xs text-orange-200">งานออกแบบและผลิตเฟอร์นิเจอร์บิ้วอิน</p>
          </div>
        </div>
      </div>

      {/* Document Info */}
      <div className="px-4 py-1.5 bg-gradient-to-r from-orange-50 to-white border-b border-orange-200">
        <div className="grid grid-cols-3 gap-3 text-[10px]">
          <div>
            <p className="text-slate-900 mb-0.5">เลขที่เอกสาร:</p>
            <p className="text-xs text-slate-800">WP-2569-004</p>
          </div>
          <div>
            <p className="text-slate-900 mb-0.5">โครงการ:</p>
            <p className="text-xs text-slate-800">{project.name}</p>
          </div>
          <div>
            <p className="text-slate-900 mb-0.5">ระยะเวลาโครงการ:</p>
            <p className="text-xs text-slate-800">21 ม.ค. - 10 เม.ย. 2569 (80 วัน)</p>
          </div>
        </div>
      </div>

      {/* Work Plan Timeline */}
      <div className="px-6 py-4">
        <h2 className="text-base text-slate-900 mb-3 flex items-center gap-2">
          <Clock className="w-5 h-5 text-orange-600" />
          <span>แผนการดำเนินงาน</span>
        </h2>

        <div className="space-y-4">
          {workPlan.map((phase, index) => (
            <div key={index} className="border-2 border-orange-200 rounded-lg overflow-hidden">
              <div className={`bg-gradient-to-r ${phase.color} text-white px-4 py-3`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm mb-1">หมวดที่ {phase.cluster}: {phase.phase}</h3>
                    <p className="text-xs text-orange-100">ระยะเวลา: {phase.duration}</p>
                  </div>
                  <div className="bg-white/20 px-3 py-1 rounded">
                    <p className="text-xs">14 รายการ</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-600 mb-2">รายการงาน:</p>
                    <ul className="space-y-1 text-xs">
                      {phase.items.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-600 mt-0.5 flex-shrink-0" />
                          <span className="text-slate-700">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-3">
                      <p className="text-xs text-green-900 mb-1 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Milestone:</span>
                      </p>
                      <p className="text-xs text-green-800">{phase.milestone}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* รายการงานบิ้วอิน 14 รายการ */}
      <div className="px-6 py-4 bg-slate-50">
        <h2 className="text-base text-slate-900 mb-3">รายการงานบิ้วอินเฟอร์นิเจอร์ (14 รายการ)</h2>
        <div className="grid grid-cols-2 gap-3">
          {builtinItems.map((item, index) => (
            <div key={index} className="bg-white border border-slate-200 rounded-lg p-2 flex items-center gap-2">
              <div className="bg-orange-100 text-orange-800 px-2 py-1 rounded text-xs font-bold">
                {item.code}
              </div>
              <p className="text-xs text-slate-700">{item.name}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Payment Schedule */}
      <div className="px-6 py-4 bg-gradient-to-r from-amber-50 to-white border-y-2 border-amber-200">
        <h2 className="text-base text-slate-900 mb-3">กำหนดการชำระเงิน (3 งวด)</h2>
        <div className="space-y-2">
          {paymentSchedule.map((payment) => (
            <div key={payment.no} className={`${payment.color} border-2 rounded-lg p-3`}>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm text-slate-900 mb-0.5">{payment.description}</p>
                  <p className="text-xs text-slate-600">{payment.timing}</p>
                </div>
                <div className="text-right">
                  <p className="text-base text-slate-900">{formatCurrency(payment.amount)} บาท</p>
                </div>
              </div>
            </div>
          ))}
          <div className="bg-slate-800 text-white rounded-lg p-3 mt-3">
            <div className="flex items-center justify-between">
              <p className="text-sm">รวมทั้งสิ้น (รวม VAT 5%):</p>
              <p className="text-xl">630,000 บาท</p>
            </div>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="px-6 py-4 bg-yellow-50 border-b border-yellow-200">
        <h3 className="text-xs text-yellow-900 mb-2">หมายเหตุสำคัญ:</h3>
        <ul className="space-y-1 text-xs text-yellow-800 pl-4">
          <li>• ระยะเวลาการผลิตและติดตั้งรวม 80 วันทำการ (21 ม.ค. - 10 เม.ย. 2569)</li>
          <li>• งานบิ้วอินทั้ง 14 รายการผลิตตามแบบ 3D ที่ลูกค้าอนุมัติ</li>
          <li>• วัสดุและอุปกรณ์คุณภาพสูง พร้อมการรับประกัน</li>
          <li>• กรุณาชำระเงินตามงวดที่กำหนดเพื่อไม่ให้งานล่าช้า</li>
          <li>• สงวนสิทธิ์ปรับแผนการทำงานตามความเหมาะสม โดยแจ้งให้ทราบล่วงหน้า</li>
        </ul>
      </div>

      {/* Signature */}
      <div className="px-6 py-4 bg-white">
        <div className="grid grid-cols-2 gap-8">
          <div className="text-center">
            <p className="text-xs text-slate-500 mb-8">ผู้รับผิดชอบโครงการ</p>
            <div className="border-b border-slate-400 mb-1 mx-8"></div>
            <p className="text-xs text-slate-700 mt-1">( {co.signatureName || '-'} )</p>
            <p className="text-xs text-slate-500 mt-1">วันที่ 21/1/2569</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-slate-500 mb-8">ผู้ว่าจ้าง / เจ้าของโครงการ</p>
            <div className="border-b border-slate-400 mb-1 mx-8"></div>
            <p className="text-xs text-slate-700 mt-1">( ...................................... )</p>
            <p className="text-xs text-slate-500 mt-1">วันที่ ......./......./.........</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gradient-to-r from-amber-600 to-orange-700 text-white py-2 text-center">
        <p className="text-xs text-orange-100">{co.companyName?.toUpperCase() || '-'} • Built-in Furniture Specialist • {co.email || '-'} • {co.phone || '-'}</p>
      </div>

      {/* Print Button */}
      <div className="p-6 bg-slate-50 border-t-2 border-slate-200 print:hidden">
        <button
          onClick={() => window.print()}
          className="w-full bg-gradient-to-r from-amber-600 to-orange-700 hover:from-amber-700 hover:to-orange-800 text-white py-3 px-6 rounded-lg transition-all shadow-md hover:shadow-xl text-sm uppercase tracking-wide"
        >
          พิมพ์แผนการทำงาน / Print Work Plan
        </button>
      </div>
    </div>
  );
}
