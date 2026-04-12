import React from 'react';
import { ProjectData } from '../utils/projectData';
import { loadCompanyProfile } from '../utils/companyProfile';
import { getCurrentThaiDate, formatThaiDate, addWeeks } from '../utils/dateUtils';

interface CentroDesignWorkPlanDocumentProps {
  project: ProjectData;
}

export function CentroDesignWorkPlanDocument({ project }: CentroDesignWorkPlanDocumentProps) {
  const co = loadCompanyProfile();
  const companyLogo = co.logoUrl || '/ezboq-logo.png';
  const startDate = new Date();
  const endDate = addWeeks(startDate, 4);

  const totalArea = project.quotationData
    .filter(item => item.no.includes('.') && item.unit === 'ตร.ม.')
    .reduce((sum, item) => sum + Number(item.quantity), 0);

  const workPlanData = [
    { no: '1', task: 'เข้าวัดพื้นที่ ถ่ายรูป เก็บข้อมูล', duration: '2 วัน', weekCells: ['■', '', '', ''], phase: 'design' },
    { no: '2', task: 'ขึ้น Mass / Concept Design', duration: '2 วัน', weekCells: ['■', '', '', ''], phase: 'design' },
    { no: '3', task: 'ออกแบบ Layout, Furniture Plan, Elevation', duration: '3 วัน', weekCells: ['■', '■', '', ''], phase: 'design' },
    { no: '4', task: 'Render 3D Perspective + Lighting Design', duration: '3 วัน', weekCells: ['', '■', '', ''], phase: 'design' },
    { no: '5', task: 'ส่งแบบดราฟแรก (Draft 1) + Revise', duration: '1 วัน', weekCells: ['', '■', '', ''], phase: 'design' },
    { no: '6', task: 'Revise แบบ + ส่งแบบรอบที่ 2 + สรุปแบบ', duration: '2 วัน', weekCells: ['', '■', '', ''], phase: 'design' },
    { no: '7', task: 'ส่งแบบไฟนอล (Final Design)', duration: '1 วัน', weekCells: ['', '', '■', ''], phase: 'design' },
    { no: '8', task: 'ทำแบบก่อสร้าง Shop Drawing, Section', duration: '5 วัน', weekCells: ['', '', '■', '■'], phase: 'construction' },
    { no: '9', task: 'Material Spec + BOQ + ใบเสนอราคาบิ้วอิน', duration: '3 วัน', weekCells: ['', '', '', '■'], phase: 'construction' },
    { no: '10', task: 'ส่งมอบแบบก่อสร้างทั้งหมด', duration: '1 วัน', weekCells: ['', '', '', '■'], phase: 'construction' },
  ];

  return (
    <div id="centro-workplan-doc" className="max-w-[210mm] mx-auto bg-white print:shadow-none">
      {(!co?.companyName && !co?.phone) && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mx-8 mt-4 print:hidden">
          <p className="text-sm text-amber-800">กรุณากรอกข้อมูลบริษัทในหน้า "ข้อมูลบริษัท" ก่อนพิมพ์เอกสาร</p>
        </div>
      )}
      <style>{`
        @media print {
          @page { size: A4; margin: 0; }
          body { margin: 0; padding: 0; }
        }
      `}</style>

      {/* ==================== PAGE 1 ==================== */}
      <div className="w-[210mm] h-[297mm] mx-auto bg-white flex flex-col">
        <div className="flex-1 flex flex-col px-[25mm] pt-[15mm]">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-300 pb-3 mb-4">
            <img src={companyLogo} alt={co.companyName || 'Company Logo'} className="h-10 object-contain" />
            <div className="text-right">
              <p className="text-[10px] text-slate-400 tracking-[0.3em] uppercase">Interior Design & Construction</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{co.email || '-'} | {co.phone || '-'}</p>
            </div>
          </div>

          {/* Title */}
          <div className="text-center mb-4">
            <h1 className="text-lg font-bold tracking-wide text-slate-900">แผนการทำงานออกแบบ</h1>
            <h2 className="text-sm mt-0.5 text-slate-700">DESIGN WORK PLAN</h2>
          </div>

          {/* Project Info */}
          <div className="grid grid-cols-2 gap-6 mb-4">
            <div>
              <h3 className="text-xs font-bold text-slate-900 border-b-2 border-slate-800 pb-1 mb-2">ข้อมูลโครงการ</h3>
              <p className="text-xs leading-snug text-slate-800 mb-0.5"><span className="font-bold">โครงการ:</span> {project.name}</p>
              <p className="text-xs leading-snug text-slate-800 mb-0.5"><span className="font-bold">เจ้าของ:</span> {project.owner}</p>
              <p className="text-xs leading-snug text-slate-800 mb-0.5"><span className="font-bold">พื้นที่:</span> {totalArea.toFixed(2)} ตร.ม.</p>
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900 border-b-2 border-slate-800 pb-1 mb-2">ระยะเวลาโครงการ</h3>
              <p className="text-xs leading-snug text-slate-800 mb-0.5"><span className="font-bold">ระยะเวลา:</span> 1 เดือน (4 สัปดาห์)</p>
              <p className="text-xs leading-snug text-slate-800 mb-0.5"><span className="font-bold">เริ่ม:</span> {getCurrentThaiDate()}</p>
              <p className="text-xs leading-snug text-slate-800 mb-0.5"><span className="font-bold">สิ้นสุด:</span> {formatThaiDate(endDate)}</p>
            </div>
          </div>

          {/* Gantt Chart */}
          <h3 className="text-xs font-bold text-slate-900 border-b-2 border-slate-800 pb-1 mb-3">แผนงาน (Gantt Chart)</h3>

          <table className="w-full border-collapse text-xs mb-4">
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-slate-300 px-2 py-1.5 text-center w-8 font-semibold text-xs">#</th>
                <th className="border border-slate-300 px-3 py-1.5 text-left font-semibold text-xs">รายการงาน</th>
                <th className="border border-slate-300 px-2 py-1.5 text-center w-14 font-semibold text-xs">ระยะเวลา</th>
                <th className="border border-slate-300 px-1 py-1.5 text-center w-10 font-semibold text-xs">W1</th>
                <th className="border border-slate-300 px-1 py-1.5 text-center w-10 font-semibold text-xs">W2</th>
                <th className="border border-slate-300 px-1 py-1.5 text-center w-10 font-semibold text-xs">W3</th>
                <th className="border border-slate-300 px-1 py-1.5 text-center w-10 font-semibold text-xs">W4</th>
              </tr>
            </thead>
            <tbody>
              {workPlanData.map((item, index) => {
                const isDesign = item.phase === 'design';
                return (
                  <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                    <td className="border border-slate-300 px-2 py-1 text-xs text-center text-slate-500">{item.no}</td>
                    <td className="border border-slate-300 px-3 py-1 text-xs text-slate-800">{item.task}</td>
                    <td className="border border-slate-300 px-2 py-1 text-xs text-center text-slate-500">{item.duration}</td>
                    {item.weekCells.map((cell, ci) => (
                      <td key={ci} className="border border-slate-300 px-0 py-1">
                        {cell === '■' && <div className={`mx-1 h-3 rounded-sm ${isDesign ? 'bg-slate-700' : 'bg-slate-400'}`} />}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Legend */}
          <div className="flex items-center gap-6 text-xs mb-4">
            <div className="flex items-center gap-2">
              <div className="w-5 h-3 bg-slate-700 rounded-sm"></div>
              <span className="text-xs text-slate-600">เฟส 1: งานออกแบบ (สัปดาห์ที่ 1-2)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-3 bg-slate-400 rounded-sm"></div>
              <span className="text-xs text-slate-600">เฟส 2: แบบก่อสร้าง (สัปดาห์ที่ 3-4)</span>
            </div>
          </div>

          {/* Phase Summary */}
          <h3 className="text-xs font-bold text-slate-900 border-b border-slate-400 pb-1 mb-2">สรุปเฟสการทำงาน</h3>
          <table className="w-full border-collapse text-xs mb-4">
            <tbody>
              <tr>
                <td className="border border-slate-300 px-3 py-1 text-xs font-semibold w-36">เฟส 1: งานออกแบบ</td>
                <td className="border border-slate-300 px-3 py-1 text-xs text-slate-600">{getCurrentThaiDate()} — {formatThaiDate(addWeeks(startDate, 2))}</td>
              </tr>
              <tr className="bg-slate-50">
                <td className="border border-slate-300 px-3 py-1 text-xs font-semibold">เฟส 2: แบบก่อสร้าง</td>
                <td className="border border-slate-300 px-3 py-1 text-xs text-slate-600">{formatThaiDate(addWeeks(startDate, 2))} — {formatThaiDate(endDate)}</td>
              </tr>
            </tbody>
          </table>

          {/* Notes */}
          <h3 className="text-xs font-bold text-slate-900 border-b border-slate-400 pb-1 mb-2">หมายเหตุ</h3>
          <p className="text-xs leading-normal text-slate-700 mb-1 pl-4">1. แก้ไขแบบได้ 3 ครั้ง/เดือน (ครั้งที่ 4 ขยาย +7 วัน)</p>
          <p className="text-xs leading-normal text-slate-700 mb-1 pl-4">2. ตอบกลับแก้ไขภายใน 3 วันทำการ มิฉะนั้นถือว่าอนุมัติ</p>
          <p className="text-xs leading-normal text-slate-700 mb-1 pl-4">3. ส่งงานล่าช้าเสียค่าปรับ 0.05%/วัน ของมูลค่าสัญญา</p>
          <p className="text-xs leading-normal text-slate-700 mb-0 pl-4">4. ระยะเวลาอาจปรับได้หากผู้ว่าจ้างตอบกลับล่าช้า</p>

          {/* Signature - mt-auto pushes to bottom */}
          <div className="mt-auto border-t-2 border-slate-400 pt-4">
            <div className="grid grid-cols-2 gap-8">
              <div className="text-center">
                <p className="text-[11px] text-slate-500 mb-1">ผู้จัดทำแผน (Prepared By)</p>
                <div className="w-24 h-12 border-b border-slate-400" />
                <p className="text-[11px] border-b border-slate-400 pb-0.5 mx-6">{co.companyName || co.companyNameTh || 'ชื่อบริษัท'}</p>
                <p className="text-[11px] text-slate-600 mt-1">{getCurrentThaiDate()}</p>
              </div>
              <div className="text-center">
                <p className="text-[11px] text-slate-500 mb-1">ผู้อนุมัติแผน (Approved By)</p>
                <div className="h-10"></div>
                <p className="text-[11px] border-b border-slate-400 pb-0.5 mx-6">ลงชื่อ ..................................................</p>
                <p className="text-[11px] mt-1">( {project.owner} )</p>
                <p className="text-[11px] text-slate-500 mt-0.5">วันที่ ........................</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer - in flow, not absolute */}
        <div className="bg-slate-800 text-white py-2 text-center">
          <p className="text-[10px] text-slate-300">{co.companyName || co.companyNameTh || 'ชื่อบริษัท'} &nbsp;&bull;&nbsp; {co.tagline || 'Interior Design & Construction'} &nbsp;&bull;&nbsp; {co.email || '-'} &nbsp;&bull;&nbsp; {co.phone || '-'}</p>
        </div>
      </div>

      {/* Print Button */}
      <div className="p-4 bg-white border-t border-slate-200 print:hidden">
        <button onClick={() => window.print()} className="w-full bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-800 hover:to-slate-900 text-white py-2.5 px-6 rounded-lg transition-all shadow-md hover:shadow-lg text-sm">
          พิมพ์แผนการทำงาน / Print Work Plan
        </button>
      </div>
    </div>
  );
}
