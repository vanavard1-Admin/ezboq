import React from 'react';
import { Calendar, Clock, Building2, AlertCircle } from 'lucide-react';
import { ProjectData } from '../utils/projectData';
import { loadCompanyProfile } from '../utils/companyProfile';
import { getDocumentCompanyTagline, getDocumentCompanyTitle } from '../utils/documentBrand';

interface VillaWorkPlanDocumentProps {
  project: ProjectData;
}

interface WorkPlanItem {
  no: string;
  task: string;
  duration: string;
  weekCells: string[];
  status: string;
  note?: string;
}

export function VillaWorkPlanDocument({ project }: VillaWorkPlanDocumentProps) {
  const co = loadCompanyProfile();
  const totalWeeks = 13;
  const startDate = 'วันพุธที่ 17 ธันวาคม 2568';
  const endDate = 'กลางเดือนมีนาคม 2569';

  const workPlanData: WorkPlanItem[] = [
    {
      no: '1',
      task: 'งานรื้อถอน (Demolition) - รื้อทิ้งทั้งหมด',
      duration: '~4 สัปดาห์',
      weekCells: ['■', '■', '■', '■', '', '', '', '', '', '', '', '', ''],
      status: 'รอเริ่มงาน'
    },
    {
      no: '2.1',
      task: 'งานไฟฟ้า - เดินระบบใหม่ทั้งหมด',
      duration: '~2 สัปดาห์',
      weekCells: ['', '', '■', '■', '■', '', '', '', '', '', '', '', ''],
      status: 'รอเริ่มงาน'
    },
    {
      no: '2.2',
      task: 'งานก่อผนัง + ฉาบเรียบ',
      duration: '~2 สัปดาห์',
      weekCells: ['', '', '■', '■', '■', '', '', '', '', '', '', '', ''],
      status: 'รอเริ่มงาน'
    },
    {
      no: '2.3',
      task: 'งานฝ้าเพดาน - ขึ้นโครง + ปิดผิว',
      duration: '~2 สัปดาห์',
      weekCells: ['', '', '', '■', '■', '■', '', '', '', '', '', '', ''],
      status: 'รอเริ่มงาน'
    },
    {
      no: '3',
      task: 'งานห้องน้ำ - กันซึม + กระเบื้อง',
      duration: '~1.5 สัปดาห์',
      weekCells: ['', '', '', '', '■', '■', '■', '', '', '', '', '', ''],
      status: 'รอเริ่มงาน'
    },
    {
      no: '4.1',
      task: 'งานปูพื้น SPC ลายไม้',
      duration: '~1 สัปดาห์',
      weekCells: ['', '', '', '', '', '', '■', '■', '', '', '', '', ''],
      status: 'รอเริ่มงาน'
    },
    {
      no: '4.2',
      task: 'ติดตั้งแอร์ + ทดสอบระบบ',
      duration: '1-2 วัน',
      weekCells: ['', '', '', '', '', '', '', '■', '', '', '', '', ''],
      status: 'รอเริ่มงาน'
    },
    {
      no: '5.1',
      task: 'งานบิ้วอิน - ผลิตที่โรงงาน',
      duration: '~3 สัปดาห์',
      weekCells: ['■', '■', '■', '■', '■', '', '', '', '', '', '', '', ''],
      status: 'รอเริ่มงาน',
      note: '🏭 ผลิตนอกสถานที่'
    },
    {
      no: '5.2',
      task: 'งานบิ้วอิน - ติดตั้งหน้างาน',
      duration: '~3 สัปดาห์',
      weekCells: ['', '', '', '', '', '', '', '■', '■', '■', '', '', ''],
      status: 'รอเริ่มงาน'
    },
    {
      no: '6.1',
      task: 'งานสี + เก็บรายละเอียด',
      duration: '~1 สัปดาห์',
      weekCells: ['', '', '', '', '', '', '', '', '', '■', '■', '', ''],
      status: 'รอเริ่มงาน'
    },
    {
      no: '6.2',
      task: 'ทำความสะอาด + ส่งมอบงาน',
      duration: '3-5 วัน',
      weekCells: ['', '', '', '', '', '', '', '', '', '', '', '■', '■'],
      status: 'รอเริ่มงาน'
    }
  ];

  return (
    <div id="workplan-doc" className="max-w-[210mm] mx-auto bg-white print:shadow-none">
      <style>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 8mm 10mm;
          }
          body {
            margin: 0;
            padding: 0;
          }
          #workplan-doc {
            max-width: 100%;
            transform: scale(0.95);
            transform-origin: top center;
          }
          .print\\:page-break-inside-avoid {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          table {
            page-break-inside: auto;
          }
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          thead {
            display: table-header-group;
          }
        }
      `}</style>

      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-600 text-white px-6 py-4 print:page-break-inside-avoid">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-white/10 backdrop-blur-sm p-2.5 rounded-lg border border-white/20">
              <Building2 className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl tracking-wider mb-0.5">{getDocumentCompanyTitle(co)}</h1>
              <p className="text-xs text-slate-300">{getDocumentCompanyTagline(co)}</p>
            </div>
            <div className="border-l border-white/30 pl-4 ml-2">
              <div className="flex items-center gap-2 mb-0.5">
                <Calendar className="w-4 h-4" />
                <h2 className="text-lg tracking-wide">แผนการทำงาน</h2>
              </div>
              <p className="text-[10px] text-slate-300">WORK PLAN / TIMELINE</p>
            </div>
          </div>
          <div className="text-right">
            <div className="bg-white/15 backdrop-blur-sm px-4 py-2.5 rounded-lg border border-white/20">
              <p className="text-[10px] text-slate-300 mb-0.5">วันที่เริ่มโครงการ</p>
              <p className="text-sm">{startDate}</p>
              <p className="text-[10px] text-slate-300 mt-2 mb-0.5">ระยะเวลา</p>
              <p className="text-sm">{totalWeeks} สัปดาห์</p>
            </div>
          </div>
        </div>
      </div>

      {/* Project Info */}
      <div className="px-6 py-3 border-b border-slate-200 bg-slate-50 print:page-break-inside-avoid">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <h2 className="text-xs text-slate-700 mb-1.5">ข้อมูลโครงการ</h2>
            <div className="space-y-0.5 text-xs">
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
          <div>
            <h2 className="text-xs text-slate-700 mb-1.5">เงื่อนไขการทำงาน</h2>
            <div className="space-y-0.5 text-xs">
              <div className="flex gap-3">
                <span className="text-slate-500 w-24 text-xs">วันทำงาน:</span>
                <span className="text-slate-800">จันทร์–ศุกร์ (09.00–16.30)</span>
              </div>
              <div className="flex gap-3">
                <span className="text-slate-500 w-24 text-xs">หยุด:</span>
                <span className="text-slate-700">เสาร์–อาทิตย์ + วันหยุดนักขัตฤกษ์</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Work Plan Table */}
      <div className="px-6 py-4">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[10px]">
            <thead>
              <tr className="bg-slate-700 text-white">
                <th className="border border-slate-400 px-2 py-2 text-left w-12">ลำดับ</th>
                <th className="border border-slate-400 px-3 py-2 text-left">รายการงาน</th>
                <th className="border border-slate-400 px-2 py-2 text-center w-20">ระยะเวลา</th>
                {Array.from({ length: totalWeeks }, (_, i) => (
                  <th key={i} className="border border-slate-400 px-1.5 py-2 text-center w-12">
                    W{i + 1}
                  </th>
                ))}
                <th className="border border-slate-400 px-2 py-2 text-center w-20">สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {workPlanData.map((item, index) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                  <td className="border border-slate-300 px-2 py-2 text-center text-slate-700">
                    {item.no}
                  </td>
                  <td className="border border-slate-300 px-3 py-2 text-slate-800">
                    {item.task}
                    {item.note && (
                      <div className="text-[9px] text-blue-600 mt-0.5">{item.note}</div>
                    )}
                  </td>
                  <td className="border border-slate-300 px-2 py-2 text-center text-slate-600">
                    {item.duration}
                  </td>
                  {item.weekCells.map((cell, cellIndex) => {
                    const isActive = cell === '■';
                    return (
                      <td
                        key={cellIndex}
                        className={`border border-slate-300 px-0.5 py-2 text-center ${
                          isActive ? 'bg-blue-600' : ''
                        }`}
                      >
                        {cell && (
                          <div className="h-4 flex items-center justify-center">
                            <span className="text-white text-xs font-bold">{cell}</span>
                          </div>
                        )}
                      </td>
                    );
                  })}
                  <td className="border border-slate-300 px-2 py-2 text-center">
                    <span className="inline-block px-2 py-0.5 rounded text-[9px] bg-amber-100 text-amber-700 border border-amber-300">
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="mt-3 flex items-center gap-6 text-[10px]">
          <div className="flex items-center gap-2">
            <div className="w-6 h-5 bg-blue-600 border border-slate-400 flex items-center justify-center text-white rounded">■</div>
            <span className="text-slate-700">ช่วงเวลาดำเนินงาน</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-5 bg-white border border-slate-300 rounded"></div>
            <span className="text-slate-700">ไม่มีงาน</span>
          </div>
        </div>

        {/* Project Summary */}
        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
            <p className="text-[10px] text-blue-700 mb-0.5">วันที่เริ่มโครงการ</p>
            <p className="text-xs text-slate-800">{startDate}</p>
          </div>
          <div className="bg-green-50 p-3 rounded-lg border border-green-200">
            <p className="text-[10px] text-green-700 mb-0.5">วันที่คาดว่าแล้วเสร็จ</p>
            <p className="text-xs text-slate-800">{endDate}</p>
          </div>
          <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
            <p className="text-[10px] text-purple-700 mb-0.5">จำนวนงานทั้งหมด</p>
            <p className="text-xs text-slate-800">{workPlanData.length} รายการ</p>
          </div>
        </div>

        {/* Timeline Summary */}
        <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
          <h3 className="text-xs text-slate-800 mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            สรุปภาพรวมระยะเวลา (Timeline Summary)
          </h3>
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div className="flex items-center gap-2">
              <span className="text-lg">🔨</span>
              <span className="text-slate-700">รื้อถอน: ~4 สัปดาห์</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg">⚡</span>
              <span className="text-slate-700">ระบบ + โครงสร้าง: ~2 สัปดาห์</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg">🚿</span>
              <span className="text-slate-700">ห้องน้ำ + พื้นเปียก: ~1 สัปดาห์</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg">🪵</span>
              <span className="text-slate-700">พื้น SPC + แอร์: ~1 สัปดาห์</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg">🏭</span>
              <span className="text-slate-700">ติดตั้งบิ้วอิน: 10–15 วัน</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg">🧹</span>
              <span className="text-slate-700">เก็บงาน + ส่งมอบ: ~1 สัปดาห์</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="mt-3 p-3 bg-amber-50 border border-amber-300 rounded-lg print:page-break-inside-avoid">
          <div className="flex items-start gap-2 mb-2">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-[10px] text-slate-800">หมายเหตุสำคัญ / Important Notes:</p>
          </div>
          <ul className="text-[10px] text-slate-700 space-y-0.5 list-disc list-inside ml-5">
            <li>แผนนี้เป็น <span className="font-medium">Preliminary Work Plan</span> ระยะเวลาอาจปรับตามแบบก่อสร้าง, กฎนิติบุคคล, และสภาพหน้างานจริง</li>
            <li>งานบางรายการสามารถทำพร้อมกัน (Overlap) ได้ เช่น งานไฟฟ้า + งานก่อผนัง และงานผลิตบิ้วอินที่โรงงาน</li>
            <li>งานบิ้วอินผลิตที่โรงงานล่วงหน้าแล้ว ไม่รบกวนหน้างานหลัก</li>
            <li>กรุณาติดต่อล่วงหน้า 3 วัน หากต้องการเปลี่ยนแปลงแผนการทำงาน</li>
          </ul>
        </div>
      </div>

      {/* Signature Section */}
      <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 print:page-break-inside-avoid">
        <div className="grid grid-cols-2 gap-8">
          <div className="text-center">
            <p className="text-[10px] text-slate-600 mb-8">ผู้จัดทำแผน (Prepared By)</p>
            <div className="border-b border-slate-400 mb-0.5 pb-0.5">
              <span className="invisible text-[10px]">Signature</span>
            </div>
            <p className="text-[10px] text-slate-700">( {co.companyName || co.companyNameTh || 'ชื่อบริษัท'} )</p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              {new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-slate-600 mb-8">ผู้อนุมัติแผน (Approved By)</p>
            <div className="border-b border-slate-400 mb-0.5 pb-0.5">
              <span className="invisible text-[10px]">Signature</span>
            </div>
            <p className="text-[10px] text-slate-700">( ...................................... )</p>
            <p className="text-[10px] text-slate-500 mt-0.5">วันที่ ........................</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-600 text-white py-2 text-center">
        <p className="text-[10px] text-slate-300">
          {co.companyName || co.companyNameTh || 'ชื่อบริษัท'} • {co.tagline || 'Interior Design & Construction'} • {co.email || '-'} • {co.phone || '-'}
        </p>
      </div>

      {/* Print Button */}
      <div className="p-4 bg-white border-t border-slate-200 print:hidden">
        <button
          onClick={() => window.print()}
          className="w-full bg-gradient-to-r from-slate-700 to-slate-600 hover:from-slate-800 hover:to-slate-700 text-white py-2 px-6 rounded-lg transition-all shadow-md hover:shadow-lg text-sm"
        >
          พิมพ์เอกสาร / Print Document
        </button>
      </div>
    </div>
  );
}
