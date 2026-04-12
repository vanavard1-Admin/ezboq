import React from 'react';
import { Calendar, Building2, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { ProjectData } from '../utils/projectData';
import { loadCompanyProfile } from '../utils/companyProfile';

interface ConstructionWorkPlanDocumentProps {
  project: ProjectData;
}

export function ConstructionWorkPlanDocument({ project }: ConstructionWorkPlanDocumentProps) {
  const co = loadCompanyProfile();
  // แผนการทำงาน 4 Cluster
  const workPlan = [
    {
      cluster: 'A',
      phase: 'งานปรับปรุงพื้น',
      items: [
        'ขัดมันพื้นคอนกรีต',
        'ปูนปรับระดับพื้น (Self-Leveling)',
      ],
      duration: '3-5 วัน',
      milestone: 'ผิวพื้นเรียบ พร้อมงานต่อไป',
      payment: 'ไม่มี',
      color: 'from-purple-600 to-purple-700',
    },
    {
      cluster: 'B',
      phase: 'งานก่อสร้างและสถาปัตยกรรม',
      items: [
        'งานก่อผนังด้วยอิฐมวลเบา',
        'งานฉาบผิวผนังเรียบ',
        'งานเทคอนกรีต N บริเวณกรอบประตู',
        'ติดตั้งประตู 2 บาน',
        'ทาสีรองพื้นเตรียมผิว',
      ],
      duration: '7-10 วัน',
      milestone: 'โครงสร้างเสร็จ ประตูติดตั้งเรียบร้อย',
      payment: 'งวดที่ 1 (70%) - หลัง A+B เสร็จ',
      color: 'from-orange-600 to-orange-700',
    },
    {
      cluster: 'C',
      phase: 'งานกันซึมพื้นที่เปียก',
      items: [
        'งานกันซึมระเบียง 2 ฝั่ง',
        'งานกันซึมห้องน้ำ',
        'ทา 2-3 coat ตามมาตรฐาน',
        'ทดสอบความรั่วซึม',
      ],
      duration: '2-3 วัน',
      milestone: 'ผ่านการทดสอบกันซึม',
      payment: 'ไม่มี',
      color: 'from-blue-600 to-blue-700',
    },
    {
      cluster: 'D',
      phase: 'งานปูกระเบื้องและเตรียมผิว',
      items: [
        'ฉาบปูนปรับผิวผนัง/พื้น',
        'ปูตาข่ายเสริมแรง',
        'ปูกระเบื้อง 60x120 (ลูกค้าจัดหา)',
        'เข้ามุม 45 องศา',
        'ยาแนวและเก็บงานเรียบร้อย',
      ],
      duration: '5-7 วัน',
      milestone: 'งานส่งมอบเสร็จสมบูรณ์',
      payment: 'งวดที่ 2 (30%) - ส่งมอบงาน',
      color: 'from-green-600 to-green-700',
    },
  ];

  const totalDuration = '17-25 วันทำการ';

  return (
    <div className="bg-white">
      {(!co?.companyName && !co?.phone) && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mx-8 mt-4 print:hidden">
          <p className="text-sm text-amber-800">กรุณากรอกข้อมูลบริษัทในหน้า "ข้อมูลบริษัท" ก่อนพิมพ์เอกสาร</p>
        </div>
      )}
      {/* Header - สีม่วง */}
      <div className="bg-gradient-to-r from-purple-700 to-indigo-800 text-white p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Calendar className="w-8 h-8" />
              <div>
                <h1 className="text-2xl">แผนการทำงาน</h1>
                <p className="text-purple-100 text-sm">Construction Work Plan & Timeline</p>
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-purple-100">{(co.companyName || co.companyNameTh || 'ชื่อบริษัท').toUpperCase()}</p>
            <p className="text-xs text-purple-200">{co.tagline || 'Interior Design & Construction'}</p>
          </div>
        </div>
      </div>

      {/* Document Info */}
      <div className="px-4 py-1.5 bg-gradient-to-r from-purple-50 to-white border-b border-purple-200">
        <div className="grid grid-cols-3 gap-3 text-[10px]">
          <div>
            <p className="text-slate-900 mb-0.5">เลขที่เอกสาร:</p>
            <p className="text-xs text-slate-800">WP-2569-001</p>
          </div>
          <div>
            <p className="text-slate-900 mb-0.5">วันที่:</p>
            <p className="text-xs text-slate-800">3 มกราคม 2569</p>
          </div>
          <div>
            <p className="text-slate-900 mb-0.5">ระยะเวลารวม:</p>
            <p className="text-xs text-purple-700">{totalDuration}</p>
          </div>
        </div>
      </div>

      {/* Project Info */}
      <div className="px-6 py-3 border-b border-purple-100 bg-purple-50/30">
        <h3 className="text-sm text-purple-900 mb-2 flex items-center gap-2">
          <Building2 className="w-4 h-4" />
          <span>รายละเอียดโครงการ</span>
        </h3>
        <div className="text-[10px] text-slate-700">
          <p><strong>โครงการ:</strong> {project.name}</p>
          <p><strong>สถานที่:</strong> {project.address}</p>
        </div>
      </div>

      {/* Timeline Overview */}
      <div className="px-6 py-4 border-b border-purple-100">
        <h3 className="text-sm text-purple-900 mb-3">ภาพรวมแผนงาน (Timeline)</h3>
        <div className="flex items-center gap-2 mb-4">
          {workPlan.map((phase, index) => (
            <React.Fragment key={index}>
              <div className="flex-1">
                <div className={`bg-gradient-to-r ${phase.color} text-white px-3 py-2 rounded text-center`}>
                  <p className="text-xs mb-1">Cluster {phase.cluster}</p>
                  <p className="text-[9px] text-white/80">{phase.duration}</p>
                </div>
              </div>
              {index < workPlan.length - 1 && (
                <div className="text-purple-400">→</div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Work Plan Details */}
      <div className="px-6 py-4">
        <h3 className="text-sm text-purple-900 mb-4">รายละเอียดแผนการทำงานแต่ละ Cluster</h3>
        
        {workPlan.map((phase, index) => (
          <div key={index} className="mb-6 last:mb-0">
            {/* Phase Header */}
            <div className={`bg-gradient-to-r ${phase.color} text-white px-4 py-3 rounded-t-lg`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 backdrop-blur-sm rounded-full w-8 h-8 flex items-center justify-center">
                    <span className="text-sm">{phase.cluster}</span>
                  </div>
                  <div>
                    <h4 className="text-sm">{phase.phase}</h4>
                    <p className="text-xs text-white/80">Cluster {phase.cluster}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-2 text-xs">
                    <Clock className="w-3 h-3" />
                    <span>{phase.duration}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Phase Content */}
            <div className="border border-purple-200 rounded-b-lg overflow-hidden">
              <div className="bg-white px-4 py-3">
                <h5 className="text-[10px] text-purple-800 mb-2">รายการงาน:</h5>
                <ul className="text-[10px] text-slate-700 space-y-1">
                  {phase.items.map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="w-3 h-3 text-purple-600 mt-0.5 flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-purple-50/50 px-4 py-2 border-t border-purple-100">
                <div className="grid grid-cols-2 gap-4 text-[10px]">
                  <div>
                    <p className="text-purple-700 mb-1 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <strong>Milestone:</strong>
                    </p>
                    <p className="text-slate-700">{phase.milestone}</p>
                  </div>
                  <div>
                    <p className="text-purple-700 mb-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      <strong>การชำระเงิน:</strong>
                    </p>
                    <p className={phase.payment === 'ไม่มี' ? 'text-slate-400' : 'text-green-700 font-semibold'}>
                      {phase.payment}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Payment Summary */}
      <div className="px-6 py-4 border-t border-purple-200 bg-gradient-to-r from-purple-50 to-white">
        <h3 className="text-sm text-purple-900 mb-3">สรุปงวดชำระเงิน (70/30)</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white border border-orange-200 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="bg-orange-100 text-orange-700 rounded-full w-6 h-6 flex items-center justify-center text-xs">1</div>
              <p className="text-[10px] text-orange-900">งวดที่ 1 (70%)</p>
            </div>
            <p className="text-xs text-slate-700 mb-1">เงื่อนไข: เสร็จ Cluster A+B</p>
            <p className="text-[9px] text-slate-500">• ขัดพื้น + ปรับระดับ</p>
            <p className="text-[9px] text-slate-500">• งานก่อ-ฉาบ + ติดประตู</p>
          </div>
          <div className="bg-white border border-green-200 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="bg-green-100 text-green-700 rounded-full w-6 h-6 flex items-center justify-center text-xs">2</div>
              <p className="text-[10px] text-green-900">งวดที่ 2 (30%)</p>
            </div>
            <p className="text-xs text-slate-700 mb-1">เงื่อนไข: ส่งมอบงาน Cluster C+D</p>
            <p className="text-[9px] text-slate-500">• กันซึมทดสอบผ่าน</p>
            <p className="text-[9px] text-slate-500">• ปูกระเบื้อง ยาแนวเรียบร้อย</p>
          </div>
        </div>
      </div>

      {/* Important Notes */}
      <div className="px-6 py-4 border-t border-purple-200 bg-white">
        <h3 className="text-sm text-purple-900 mb-2 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span>หมายเหตุสำคัญ</span>
        </h3>
        <ul className="text-[10px] text-slate-700 space-y-1 list-disc list-inside">
          <li>ระยะเวลาอาจปรับเปลี่ยนตามสภาพอากาศและความพร้อมของวัสดุ</li>
          <li>การทำงานแต่ละ Cluster ต้องเสร็จสมบูรณ์ก่อนเริ่ม Cluster ถัดไป</li>
          <li>กระเบื้องต้องพร้อมก่อนเริ่มงาน Cluster D (ลูกค้าจัดหาเอง)</li>
          <li>การตรวจรับงานแต่ละ Milestone จะทำร่วมกับลูกค้า</li>
          <li>หากมีการเปลี่ยนแปลงงาน อาจส่งผลต่อระยะเวลาและค่าใช้จ่าย</li>
        </ul>
      </div>

      {/* Signatures */}
      <div className="px-6 py-6 border-t border-purple-200">
        <div className="grid grid-cols-2 gap-8 text-[10px]">
          <div className="text-center">
            <div className="border-b border-purple-300 mb-2 pb-12"></div>
            <p className="text-slate-700">ผู้รับเหมา (ยืนยันแผนงาน)</p>
            <p className="text-slate-500 mt-1">วันที่: _____ / _____ / _____</p>
          </div>
          <div className="text-center">
            <div className="border-b border-purple-300 mb-2 pb-12"></div>
            <p className="text-slate-700">ลูกค้า (รับทราบแผนงาน)</p>
            <p className="text-slate-500 mt-1">วันที่: _____ / _____ / _____</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gradient-to-r from-purple-700 to-indigo-800 text-white px-6 py-3">
        <div className="text-center text-[9px]">
          <p className="text-purple-100">
            {co.companyName || co.companyNameTh || 'ชื่อบริษัท'} | {co.tagline || 'Interior Design & Construction'}
          </p>
          <p className="text-purple-200 mt-1">
            โทร: {co.phone || '-'} | อีเมล: {co.email || '-'}
          </p>
        </div>
      </div>
    </div>
  );
}
