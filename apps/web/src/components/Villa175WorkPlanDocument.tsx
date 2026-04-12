import React from 'react';
import { Calendar, Building2, CheckCircle2, ClipboardCheck, AlertCircle } from 'lucide-react';
import { ProjectData } from '../utils/projectData';
import { loadCompanyProfile } from '../utils/companyProfile';

interface WorkPlanProps {
  project: ProjectData;
}

export function Villa175WorkPlanDocument({ project }: WorkPlanProps) {
  const co = loadCompanyProfile();
  // แผนการทำงานจริงตามปฏิทิน พ.ศ. 2569
  const workTimeline = [
    {
      weeks: 'สัปดาห์ 1-2',
      dates: '6-17 ม.ค. 2569',
      title: 'Wall + MEP Rough-in',
      phase: 1,
      payment: '30%',
      cluster: 'A) ก่อผนัง / ฉาบ + B) ระบบไฟ-ประปา',
      tasks: [
        'ก่อผนังอิฐมวลเบา 20 ตร.ม.',
        'ฉาบหยาบ-ละเอียด',
        'ฝังเหล็ก L / wire mesh',
        'เดิน conduits + point box ครบทุกจุด',
        'เดินท่อ PPR น้ำดี + น้ำทิ้ง',
        'แก้ slope drain ห้องน้ำ',
        'ทดสอบระบบก่อนปิด',
      ],
      milestone: '✓ ผนังพร้อม-ระบบพร้อมปิด',
      offsite: '-',
    },
    {
      weeks: 'สัปดาห์ 3',
      dates: '20-24 ม.ค. 2569',
      title: 'ฝ้าโครง',
      phase: 1,
      payment: '30%',
      cluster: 'B) ระบบไฟ-ประปา',
      tasks: [
        'ตั้งโครงฝ้า C-Stud',
        'วางราง LED Strip ~22 ม.',
        'เตรียม downlight (17 จุด)',
        'Tracklight (6 ม. × 2 เส้น)',
      ],
      milestone: '✓ โครงฝ้าพร้อม / แบบเฟอร์ฯ จบ',
      offsite: 'เคลียร์แบบ Shop Drawing (รอบสุดท้าย)',
    },
    {
      weeks: 'สัปดาห์ 4-5',
      dates: '27 ม.ค.-7 ก.พ. 2569',
      title: 'Close-up Work',
      phase: 2,
      payment: '25%',
      cluster: 'C) ฝ้า / สี / พื้น',
      tasks: [
        'ปิดฝ้ายิปซั่ม',
        'ฉาบผิว-เตรียมด้วย skimcoat',
        'รองพื้นผนัง',
      ],
      milestone: '✓ ระบบผ่าน + สั่งไม้แล้ว',
      offsite: 'สั่ง HMR + ลามิเนตล็อตแรกเข้ารง. / เริ่ม cut-list งานไม้',
    },
    {
      weeks: 'สัปดาห์ 6-7',
      dates: '10-21 ก.พ. 2569',
      title: 'Finishing – Round 1',
      phase: 3,
      payment: '20%',
      cluster: 'C) ฝ้า / สี / พื้น',
      tasks: [
        'ปูพื้น SPC 64 ตร.ม.',
        'บัวพื้น 45 ม.',
        'Waterproof Dr.Fixit (3 coat)',
        'ปูกระเบื้องห้องน้ำ: พื้น/ผนัง',
        'ทาสีรอบแรก 2-3 รอบ',
      ],
      milestone: '✓ หน้างาน 70% / โรงงานพร้อม',
      offsite: 'carcass 80% + ประกอบ drawer / ส่งภาพ QC ให้ลูกค้า',
    },
    {
      weeks: 'สัปดาห์ 8-10',
      dates: '24 ก.พ.-14 มี.ค. 2569',
      title: 'Built-in Installation – Round 1',
      phase: 4,
      payment: '-',
      cluster: 'D) Built-in',
      tasks: [
        'ขนตู้ขึ้นคอนโด (ต้องแจ้งนิติ)',
        'Fitting carcass Living/Kitchen/Master',
        'alignment + soft-close',
      ],
      milestone: '✓ ตู้หลักตั้งครบ',
      offsite: 'พ่นสีหน้าบาน',
    },
    {
      weeks: 'สัปดาห์ 11',
      dates: '17-21 มี.ค. 2569',
      title: 'Built-in Installation – Round 2',
      phase: 4,
      payment: '15%',
      cluster: 'D) Built-in',
      tasks: [
        'ประกอบบาน / handle',
        'ติด Top หิน (หากมี)',
        'ปิดปลายขอบงานไม้',
      ],
      milestone: '✓ Built-in เสร็จ 100%',
      offsite: '-',
    },
    {
      weeks: 'สัปดาห์ 12',
      dates: '24-28 มี.ค. 2569',
      title: 'Defect Pass 1',
      phase: 5,
      payment: '-',
      cluster: 'Final',
      tasks: [
        'ซิลิโคนทุก joint',
        'เก็บสีรอยต่อ',
        'ตรวจ defect 1 รอบ',
        'Clean รอบแรก',
      ],
      milestone: '✓ Defect รอบแรกเสร็จ',
      offsite: '-',
    },
    {
      weeks: 'สัปดาห์ 13',
      dates: '31 มี.ค.-4 เม.ย. 2569',
      title: 'Final Handover',
      phase: 5,
      payment: '10%',
      cluster: 'Final',
      tasks: [
        'Defect รอบสอง',
        'Big Cleaning',
        'Checklist ส่งมอบลูกค้า',
      ],
      milestone: '✓ พร้อมย้ายเข้า',
      offsite: '-',
    },
  ];

  // Payment Plan รายละเอียด 5 งวด
  const paymentPlan = [
    {
      phase: 1,
      percentage: 30,
      name: 'Wall + MEP Rough-in',
      weeks: 'สัปดาห์ 1-3 (6-24 ม.ค.)',
      scope: 'A) ก่อผนัง / ฉาบ + B) ระบบไฟ-ประปา',
      tasks: [
        'ก่อผนังอิฐมวลเบา (20 ตร.ม.)',
        'ติดตั้งเหล็ก L / wire mesh',
        'เดินท่อไฟฝังผนัง + point box',
        'เดินท่อน้ำดี PPR + น้ำทิ้ง',
        'แก้ drain slope',
        'ตั้งโครงฝ้า',
      ],
      goal: 'ผนังพร้อมทดสอบระบบ',
    },
    {
      phase: 2,
      percentage: 25,
      name: 'Close-up Work',
      weeks: 'สัปดาห์ 4-5 (27 ม.ค.-7 ก.พ.)',
      scope: 'C) ฝ้า / สี / พื้น (เริ่มต้น)',
      tasks: [
        'ทดสอบระบบรั่วซึม',
        'ปิดฝ้ายิปซั่ม 1 ชั้น',
        'ฉาบเรียบผนัง',
        'ทาสีรองพื้น',
        'อนุมัติ shop drawing',
        'ซื้อ HMR ล็อตแรก',
      ],
      goal: 'ระบบผ่าน + ฝ้าเรียบ + สั่งไม้แล้ว',
    },
    {
      phase: 3,
      percentage: 20,
      name: 'Finishing',
      weeks: 'สัปดาห์ 6-7 (10-21 ก.พ.)',
      scope: 'C) ฝ้า / สี / พื้น (สำเร็จ)',
      tasks: [
        'ปูพื้น SPC / บัว',
        'กันซึมห้องน้ำ Dr.Fixit 2K (3 coat)',
        'ปูกระเบื้องห้องน้ำ',
        'QC carcass 80%',
      ],
      goal: 'งานหน้างานเสร็จ 70% / โรงงานพร้อมติดตั้ง',
    },
    {
      phase: 4,
      percentage: 15,
      name: 'Built-in Installation',
      weeks: 'สัปดาห์ 8-11 (24 ก.พ.-21 มี.ค.)',
      scope: 'D) Built-in',
      tasks: [
        'คืนพื้นที่ติดตั้ง',
        'ยึด carcass',
        'set alignment',
        'soft-close / runner / hinge',
      ],
      goal: 'Built-in ติดตั้งเสร็จ 100%',
    },
    {
      phase: 5,
      percentage: 10,
      name: 'Final',
      weeks: 'สัปดาห์ 12-13 (24 มี.ค.-4 เม.ย.)',
      scope: 'Defect + Handover',
      tasks: [
        'ซิลิโคน',
        'touch-up',
        'Big clean',
        'defect 2 รอบ',
      ],
      goal: 'ส่งมอบงานสมบูรณ์',
    },
  ];

  // วันหยุดที่ต้องระวัง
  const holidays = [
    '1 ม.ค. 2569 – ปีใหม่',
    '2 ม.ค. (มีโอกาสหยุดพิเศษ)',
    '3 ม.ค. ศุกร์ (ไม่เริ่มงาน)',
    '6 เม.ย. วันจักรี',
    '10-11 เม.ย. (ก่อนสงกรานต์ช่างหนีกลับบ้าน)',
    '13-15 เม.ย. สงกรานต์',
  ];

  return (
    <div id="work-plan-doc" className="max-w-[210mm] mx-auto bg-white print:shadow-none">
      {(!co?.companyName && !co?.phone) && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mx-8 mt-4 print:hidden">
          <p className="text-sm text-amber-800">กรุณากรอกข้อมูลบริษัทในหน้า "ข้อมูลบริษัท" ก่อนพิมพ์เอกสาร</p>
        </div>
      )}
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 12mm;
          }
          body {
            margin: 0;
            padding: 0;
          }
          #work-plan-doc {
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
      <div className="bg-gradient-to-br from-indigo-800 via-indigo-700 to-indigo-900 text-white px-6 py-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,.02)_50%,transparent_75%,transparent_100%)] bg-[length:250px_250px]"></div>
        <div className="relative">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-white/10 backdrop-blur-sm p-2 rounded-lg border border-white/20">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl tracking-wider mb-0.5">{(co.companyName || co.companyNameTh || 'ชื่อบริษัท').toUpperCase()}</h1>
                <p className="text-xs text-indigo-200">{co.tagline || 'Interior Design & Construction'}</p>
              </div>
              <div className="border-l border-white/30 pl-4 ml-2">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <h2 className="text-lg tracking-wide">แผนการทำงานตามปฏิทิน พ.ศ. 2569</h2>
                </div>
                <p className="text-xs text-indigo-200 mt-0.5">6 ม.ค. - 4 เม.ย. 2569 (13 สัปดาห์)</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Project Info */}
      <div className="px-6 py-3 bg-gradient-to-r from-indigo-50 to-white border-b-2 border-indigo-200">
        <div className="grid grid-cols-4 gap-3 text-xs">
          <div>
            <p className="text-indigo-900 mb-1">โครงการ:</p>
            <p className="text-sm text-indigo-800">{project.name}</p>
          </div>
          <div>
            <p className="text-indigo-900 mb-1">เริ่มงาน:</p>
            <p className="text-sm text-indigo-800">จันทร์ 6 ม.ค. 2569</p>
          </div>
          <div>
            <p className="text-indigo-900 mb-1">ส่งมอบ:</p>
            <p className="text-sm text-indigo-800">ศุกร์ 4 เม.ย. 2569</p>
          </div>
          <div>
            <p className="text-indigo-900 mb-1">วันทำงาน:</p>
            <p className="text-sm text-indigo-800">จ.-ศ. (09.00-16.30)</p>
          </div>
        </div>
      </div>

      {/* Important Notice */}
      <div className="px-6 py-2 bg-red-50 border-b border-red-200">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-xs text-red-900">
              <span className="font-semibold">⚠️ สำคัญ:</span> ปิดโปรเจกต์ก่อน 6 เม.ย. (วันจักรี) เพราะช่างจะหยุดยาวช่วงสงกรานต์ (10-15 เม.ย.) 
              หากเจอ Defect ค้างข้ามสงกรานต์จะเสี่ยงล่าช้า
            </p>
          </div>
        </div>
      </div>

      {/* Timeline Table */}
      <div className="px-6 py-4">
        <h3 className="text-sm mb-3 flex items-center gap-2 text-indigo-900">
          <Calendar className="w-4 h-4" />
          <span>Timeline 13 สัปดาห์ (Milestone-Driven)</span>
        </h3>

        <div className="border-2 border-indigo-300 rounded-lg overflow-hidden">
          <table className="w-full text-[10px]">
            <thead>
              <tr className="bg-gradient-to-r from-indigo-700 to-indigo-800 text-white">
                <th className="px-2 py-2 text-center w-16">สัปดาห์</th>
                <th className="px-2 py-2 text-center w-24">วันที่</th>
                <th className="px-2 py-2 text-left">งาน (On-Site)</th>
                <th className="px-2 py-2 text-left w-32">Off-Site</th>
                <th className="px-2 py-2 text-center w-12">งวด</th>
                <th className="px-2 py-2 text-center w-12">%</th>
                <th className="px-2 py-2 text-left">Milestone</th>
              </tr>
            </thead>
            <tbody>
              {workTimeline.map((item, idx) => (
                <tr key={idx} className={`border-b border-indigo-200 ${idx % 2 === 0 ? 'bg-indigo-50' : 'bg-white'}`}>
                  <td className="px-2 py-2 text-center">
                    <div className="font-semibold text-indigo-800">{item.weeks}</div>
                  </td>
                  <td className="px-2 py-2 text-center">
                    <div className="text-slate-700">{item.dates}</div>
                  </td>
                  <td className="px-2 py-2">
                    <div className="font-semibold text-indigo-900 mb-0.5 text-[11px]">{item.title}</div>
                    <ul className="space-y-0.5 text-slate-700">
                      {item.tasks.map((task, taskIdx) => (
                        <li key={taskIdx} className="flex items-start gap-1">
                          <span className="text-indigo-500 mt-0.5">•</span>
                          <span>{task}</span>
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td className="px-2 py-2 bg-orange-50/50">
                    <div className={`text-slate-700 ${item.offsite === '-' ? 'text-slate-400 text-center' : ''}`}>
                      {item.offsite}
                    </div>
                  </td>
                  <td className="px-2 py-2 text-center">
                    <div className="bg-indigo-600 text-white w-7 h-7 rounded-full flex items-center justify-center mx-auto text-[11px] font-semibold">
                      {item.phase}
                    </div>
                  </td>
                  <td className="px-2 py-2 text-center">
                    {item.payment !== '-' && (
                      <div className="bg-green-100 text-green-800 px-1.5 py-0.5 rounded text-[11px] font-semibold">
                        {item.payment}
                      </div>
                    )}
                  </td>
                  <td className="px-2 py-2">
                    <div className="flex items-start gap-1 text-green-700">
                      <CheckCircle2 className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      <span>{item.milestone}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Plan Details */}
      <div className="px-6 py-4">
        <h3 className="text-sm mb-3 flex items-center gap-2 text-green-900">
          <ClipboardCheck className="w-4 h-4" />
          <span>รายละเอียดแผนการชำระเงิน 5 งวด</span>
        </h3>

        <div className="space-y-2">
          {paymentPlan.map((payment, idx) => (
            <div key={idx} className={`border rounded-lg overflow-hidden print:page-break-inside-avoid ${
              idx === paymentPlan.length - 1 
                ? 'border-green-300 bg-green-50' 
                : 'border-indigo-200 bg-white'
            }`}>
              <div className={`px-3 py-1.5 flex items-center justify-between ${
                idx === paymentPlan.length - 1
                  ? 'bg-gradient-to-r from-green-600 to-green-700 text-white'
                  : 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white'
              }`}>
                <div className="flex items-center gap-2">
                  <div className="bg-white/20 backdrop-blur-sm px-1.5 py-0.5 rounded text-[10px]">
                    Phase {payment.phase}
                  </div>
                  <h4 className="text-xs font-semibold">{payment.name}</h4>
                  <span className="text-[10px] opacity-80">({payment.weeks})</span>
                </div>
                <div className="text-sm font-bold bg-white/20 backdrop-blur-sm px-2 py-0.5 rounded">
                  {payment.percentage}%
                </div>
              </div>
              <div className="p-3">
                <div className="grid grid-cols-3 gap-2 text-[10px]">
                  <div className="bg-blue-50 border border-blue-200 rounded p-1.5">
                    <p className="text-blue-900 font-semibold mb-0.5">Scope:</p>
                    <p className="text-slate-800">{payment.scope}</p>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded p-1.5">
                    <p className="text-slate-900 font-semibold mb-0.5">ทำอะไร:</p>
                    <ul className="space-y-0.5">
                      {payment.tasks.map((task, taskIdx) => (
                        <li key={taskIdx} className="flex items-start gap-1">
                          <span className="text-indigo-500 mt-0.5">–</span>
                          <span className="text-slate-700">{task}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded p-1.5">
                    <p className="text-green-900 font-semibold mb-0.5">Goal:</p>
                    <p className="text-green-800">{payment.goal}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Holidays Warning */}
      <div className="px-6 py-3 bg-amber-50 border-t-2 border-amber-300">
        <h3 className="text-xs mb-2 text-amber-900 font-semibold">📅 วันหยุดที่ต้องระวัง:</h3>
        <div className="grid grid-cols-2 gap-1.5 text-[10px]">
          {holidays.map((holiday, idx) => (
            <div key={idx} className="bg-white border border-amber-200 rounded px-2 py-1 text-amber-800">
              • {holiday}
            </div>
          ))}
        </div>
        <p className="text-[10px] text-amber-900 mt-2">
          <span className="font-semibold">หมายเหตุ:</span> งาน noisy (เจาะ/สกัด/กรีด) วางช่วงต้นวันจันทร์-พุธ • 
          คืนหลังเลิกงานใช้ทำ Shop drawing / QC โรงงาน
        </p>
      </div>

      {/* Footer */}
      <div className="bg-gradient-to-r from-indigo-800 to-indigo-700 text-white py-2 text-center">
        <p className="text-[10px] text-indigo-200">{co.companyName || co.companyNameTh || 'ชื่อบริษัท'} • {co.email || '-'} • {co.phone || '-'}</p>
      </div>

      {/* Print Button */}
      <div className="p-4 bg-white border-t border-indigo-200 print:hidden">
        <button
          onClick={() => window.print()}
          className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white py-2 px-6 rounded-lg transition-all shadow-md hover:shadow-lg text-sm"
        >
          พิมพ์แผนการทำงาน / Print Work Plan
        </button>
      </div>
    </div>
  );
}
