import React, { Suspense, lazy, useState } from 'react';
import { Calendar, Pencil } from 'lucide-react';
import { ProjectData, generateDefaultWorkPlan, type WorkPlanConfig } from '../utils/projectData';
import { loadCompanyProfile, type CompanyProfile } from '../utils/companyProfile';
import { WorkPlanEditor } from './WorkPlanEditor';
import { ENABLE_SPECIAL_PROJECTS } from '../utils/runtimeFlags';
import { getCurrentThaiDate } from '../utils/dateUtils';

const VillaWorkPlanDocument = ENABLE_SPECIAL_PROJECTS
  ? lazy(() => import('./VillaWorkPlanDocument').then((module) => ({ default: module.VillaWorkPlanDocument })))
  : null;

interface WorkPlanDocumentProps {
  project: ProjectData;
  companyProfile?: CompanyProfile;
  onUpdate?: (project: ProjectData) => void;
}

function getTimelineGroups(totalWeeks: number, durationLabel?: string) {
  const monthMatch = durationLabel?.match(/(\d+)\s*เดือน/);
  const requestedGroups = monthMatch ? Number(monthMatch[1]) : Math.ceil(totalWeeks / 4);
  const groupCount = Math.max(1, Math.min(totalWeeks, requestedGroups || 1));
  const base = Math.floor(totalWeeks / groupCount);
  const remainder = totalWeeks - (base * groupCount);

  return Array.from({ length: groupCount }, (_, index) => ({
    label: monthMatch ? `เดือนที่ ${index + 1}` : `ช่วงที่ ${index + 1}`,
    count: base + (index === groupCount - 1 ? remainder : 0),
  }));
}

function getStatusBadgeClass(status: string): string {
  if (status === 'เสร็จแล้ว') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (status === 'กำลังดำเนินการ') return 'border-sky-200 bg-sky-50 text-sky-700';
  if (status === 'ล่าช้า') return 'border-rose-200 bg-rose-50 text-rose-700';
  return 'border-stone-200 bg-stone-50 text-stone-500';
}

function getWeekFillClass(cell: string): string {
  if (cell === '■') return 'bg-stone-700';
  if (cell === '□') return 'bg-emerald-800';
  return 'bg-transparent';
}

export function WorkPlanDocument({ project, companyProfile, onUpdate }: WorkPlanDocumentProps) {
  const co = companyProfile || loadCompanyProfile();
  const [isEditing, setIsEditing] = useState(false);

  // Villa Ratchathewi 2BR → dedicated component
  if (ENABLE_SPECIAL_PROJECTS && project.id === 'villa-ratchathewi-2br-room175' && VillaWorkPlanDocument) {
    return (
      <Suspense fallback={<div className="rounded-2xl border border-stone-200 bg-white px-6 py-10 text-center text-sm text-stone-500">กำลังโหลดเอกสาร...</div>}>
        <VillaWorkPlanDocument project={project} />
      </Suspense>
    );
  }

  // Use stored work plan, or generate from BOQ
  const workPlanConfig: WorkPlanConfig = project.workPlan || generateDefaultWorkPlan(project);
  const {
    totalWeeks,
    startDate = getCurrentThaiDate(),
    endDate = '',
    durationLabel = '',
    items: workPlanData,
  } = workPlanConfig;
  const durationDisplay = durationLabel ? `${durationLabel} (${totalWeeks} สัปดาห์)` : `${totalWeeks} สัปดาห์`;

  const handleSaveWorkPlan = (config: WorkPlanConfig) => {
    if (onUpdate) {
      onUpdate({ ...project, workPlan: config });
    }
    setIsEditing(false);
  };

  // Show editor
  if (isEditing) {
    return (
      <WorkPlanEditor
        initialConfig={workPlanConfig}
        onSave={handleSaveWorkPlan}
        onCancel={() => setIsEditing(false)}
      />
    );
  }

  const hasFactoryItems = workPlanData.some(item => item.weekCells.includes('■'));
  const hasOnsiteItems = workPlanData.some(item => item.weekCells.includes('□'));
  const timelineGroups = getTimelineGroups(totalWeeks, durationLabel);
  const shouldStartTableOnNextPage = totalWeeks >= 12 || workPlanData.length >= 8;

  return (
    <div id="workplan-doc" className="mx-auto max-w-[297mm] bg-white print:shadow-none">
      {(!co?.companyName && !co?.phone) && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mx-8 mt-4 print:hidden">
          <p className="text-sm text-amber-800">กรุณากรอกข้อมูลบริษัทในหน้า "ข้อมูลบริษัท" ก่อนพิมพ์เอกสาร</p>
        </div>
      )}
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
          }
          #workplan-doc .workplan-table-shell {
            overflow: visible !important;
            border-radius: 0 !important;
          }
          #workplan-doc .workplan-table {
            width: 100% !important;
            min-width: 0 !important;
            font-size: 10px !important;
          }
          #workplan-doc .workplan-table th,
          #workplan-doc .workplan-table td {
            padding-top: 3px !important;
            padding-bottom: 3px !important;
          }
          #workplan-doc .workplan-week-fill {
            height: 14px !important;
          }
          #workplan-doc .workplan-support-section,
          #workplan-doc .workplan-signature-section,
          #workplan-doc .workplan-summary-grid,
          #workplan-doc .workplan-notes {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .print\\:page-break-inside-avoid {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .print\\:page-break-before {
            page-break-before: always;
            break-before: always;
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
          tfoot {
            display: table-footer-group;
          }
        }
      `}</style>

      {/* Header */}
      <div className="border-b border-stone-300 border-t-[6px] border-t-emerald-900 bg-white px-6 py-5 print:page-break-inside-avoid">
        <div className="flex items-start justify-between gap-6">
          <div className="flex items-start gap-4">
            {co?.logoUrl && (
              <div className="flex h-16 w-16 items-center justify-center border border-stone-300 bg-white p-2">
                <img src={co.logoUrl} alt="Logo" className="h-full w-full object-contain" />
              </div>
            )}
            <div>
              <h1 className="text-xl font-semibold tracking-[0.16em] text-stone-900">{co?.companyName?.toUpperCase() || '-'}</h1>
              <p className="mt-1 text-[10px] uppercase tracking-[0.3em] text-stone-500">{co?.tagline || 'Interior Design & Construction'}</p>
              <div className="mt-3 flex items-center gap-2 text-stone-700">
                <Calendar className="h-4 w-4" />
                <div>
                  <h2 className="text-base font-semibold text-stone-900">แผนการทำงาน</h2>
                  <p className="text-[10px] tracking-[0.22em] text-stone-500">WORK PLAN / TIMELINE</p>
                </div>
              </div>
            </div>
          </div>
          <div className="min-w-[16rem] border border-stone-300">
            <div className="border-b border-stone-300 px-4 py-3 text-center">
              <p className="text-[10px] uppercase tracking-[0.24em] text-stone-500">Project Timeline</p>
              <p className="mt-1 text-lg font-semibold text-stone-900">{durationDisplay}</p>
            </div>
            <div className="grid grid-cols-[6.75rem_1fr] text-xs">
              <div className="border-b border-r border-stone-300 px-3 py-2 text-stone-500">วันเริ่มงาน</div>
              <div className="border-b border-stone-300 px-3 py-2 text-stone-900">{startDate}</div>
              <div className="border-r border-stone-300 px-3 py-2 text-stone-500">วันแล้วเสร็จ</div>
              <div className="px-3 py-2 text-stone-900">{endDate || '-'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Project Info */}
      <div className="grid gap-3 border-b border-stone-200 bg-[#fafaf9] px-6 py-4 print:page-break-inside-avoid md:grid-cols-4">
        <div className="border border-stone-200 bg-white px-4 py-3">
          <p className="text-[10px] uppercase tracking-[0.24em] text-stone-500">โครงการ</p>
          <p className="mt-1 text-sm font-medium text-stone-900">{project.name}</p>
        </div>
        <div className="border border-stone-200 bg-white px-4 py-3">
          <p className="text-[10px] uppercase tracking-[0.24em] text-stone-500">สถานที่</p>
          <p className="mt-1 text-xs leading-relaxed text-stone-700">{project.address || '-'}</p>
        </div>
        <div className="border border-stone-200 bg-white px-4 py-3">
          <p className="text-[10px] uppercase tracking-[0.24em] text-stone-500">ผู้รับผิดชอบ</p>
          <p className="mt-1 text-sm font-medium text-stone-900">{co?.companyName || '-'}</p>
          <p className="mt-1 text-xs text-stone-500">{co?.phone || '-'}</p>
        </div>
        <div className="border border-stone-200 bg-white px-4 py-3">
          <p className="text-[10px] uppercase tracking-[0.24em] text-stone-500">รายการงานทั้งหมด</p>
          <p className="mt-1 text-sm font-medium text-stone-900">{workPlanData.length} รายการ</p>
        </div>
      </div>

      {/* Work Plan Table */}
      <div className={`px-6 pt-4 ${shouldStartTableOnNextPage ? 'print:page-break-before' : ''}`}>
        <div className="workplan-table-shell overflow-x-auto rounded-xl border border-stone-200 bg-white">
          <table className="workplan-table w-full min-w-[1120px] border-collapse table-fixed text-[11px]">
            <thead>
              <tr className="bg-stone-900 text-white">
                <th rowSpan={2} className="border border-stone-700 px-2 py-2 text-left w-12">ลำดับ</th>
                <th rowSpan={2} className="border border-stone-700 px-3 py-2 text-left w-[24rem]">รายการงาน</th>
                <th rowSpan={2} className="border border-stone-700 px-2 py-2 text-center w-28">ระยะเวลา</th>
                {timelineGroups.map((group, index) => (
                  <th key={`${group.label}-${index}`} colSpan={group.count} className="border border-stone-700 px-2 py-2 text-center text-[10px] tracking-[0.24em] text-stone-200">
                    {group.label}
                  </th>
                ))}
              </tr>
              <tr className="bg-stone-100 text-stone-600">
                {Array.from({ length: totalWeeks }, (_, i) => (
                  <th key={i} className="border border-stone-200 px-1 py-2 text-center w-10 text-[10px] font-semibold">
                    W{i + 1}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {workPlanData.map((item, index) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-[#fcfcfb]'}>
                  <td className="border border-stone-200 px-2 py-2 text-center align-top text-stone-500">
                    {item.no}
                  </td>
                  <td className="border border-stone-200 px-3 py-2 align-top text-stone-800">
                    <div className="font-medium leading-relaxed text-stone-900">{item.task}</div>
                    <div className="mt-2">
                      <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] ${getStatusBadgeClass(item.status)}`}>
                        {item.status}
                      </span>
                    </div>
                  </td>
                  <td className="border border-stone-200 px-2 py-2 text-center align-top text-stone-500">
                    {item.duration}
                  </td>
                  {item.weekCells.map((cell, cellIndex) => {
                    return (
                      <td key={cellIndex} className="border border-stone-200 px-1 py-2">
                        <div className={`workplan-week-fill mx-auto h-6 rounded-sm ${getWeekFillClass(cell)}`} />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="workplan-support-section px-6 pb-4 pt-4">
        {/* Legend */}
        <div className="mt-4 flex flex-wrap items-center gap-4 text-[10px]">
          {hasFactoryItems && (
            <div className="flex items-center gap-1.5">
              <div className="h-4 w-6 rounded-sm bg-stone-700" />
              <span className="text-stone-500">งานโรงงาน (Off-site)</span>
            </div>
          )}
          {hasOnsiteItems && (
            <div className="flex items-center gap-1.5">
              <div className="h-4 w-6 rounded-sm bg-emerald-800" />
              <span className="text-stone-500">งานหน้างาน (On-site)</span>
            </div>
          )}
          {!hasFactoryItems && !hasOnsiteItems && (
            <div className="flex items-center gap-1.5">
              <div className="h-4 w-6 rounded-sm bg-stone-700" />
              <span className="text-stone-500">ช่วงเวลาดำเนินงาน</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <div className="h-4 w-6 rounded-sm border border-stone-200 bg-white" />
            <span className="text-stone-500">ไม่มีงาน</span>
          </div>
        </div>

        {/* Project Summary */}
        <div className="workplan-summary-grid mt-4 grid grid-cols-4 gap-3">
          <div className="bg-stone-50 p-2.5 rounded-lg border border-stone-200">
            <p className="text-[10px] text-stone-400 mb-0.5">วันที่เริ่มโครงการ</p>
            <p className="text-xs text-stone-800">{startDate}</p>
          </div>
          <div className="bg-stone-50 p-2.5 rounded-lg border border-stone-200">
            <p className="text-[10px] text-stone-400 mb-0.5">วันที่คาดว่าแล้วเสร็จ</p>
            <p className="text-xs text-stone-800">{endDate || '-'}</p>
          </div>
          <div className="bg-stone-50 p-2.5 rounded-lg border border-stone-200">
            <p className="text-[10px] text-stone-400 mb-0.5">ระยะเวลาดำเนินงาน</p>
            <p className="text-xs text-stone-800">{durationDisplay}</p>
          </div>
          <div className="bg-stone-50 p-2.5 rounded-lg border border-stone-200">
            <p className="text-[10px] text-stone-400 mb-0.5">จำนวนงานทั้งหมด</p>
            <p className="text-xs text-stone-800">{workPlanData.length} รายการ</p>
          </div>
        </div>

        {/* Notes */}
        <div className="workplan-notes mt-3 p-3 bg-stone-50 border border-stone-200 rounded-lg print:page-break-inside-avoid">
          <p className="text-[10px] mb-1.5 text-stone-800">หมายเหตุ / Notes:</p>
          <ul className="text-[10px] text-stone-500 space-y-0.5 list-disc list-inside">
            <li>ระยะเวลาอาจเปลี่ยนแปลงได้ตามสภาพหน้างานจริง</li>
            <li>งานบางรายการสามารถทำพร้อมกันได้</li>
            <li>กรุณาติดต่อล่วงหน้า 3 วัน หากต้องการเปลี่ยนแปลงแผนการทำงาน</li>
          </ul>
        </div>
      </div>

      {/* Signature Section */}
      <div className="workplan-signature-section px-6 py-3 bg-stone-50 border-t border-stone-200 print:page-break-inside-avoid">
        <div className="grid grid-cols-2 gap-8">
          <div className="text-center">
            <p className="text-[10px] text-stone-500 mb-6">ผู้จัดทำแผน (Prepared By)</p>
            {co?.signatureUrl ? (
              <img src={co.signatureUrl} alt="ลายเซ็น" className="h-10 mx-auto mb-1 object-contain" />
            ) : (
              <div className="mb-1 pb-4"></div>
            )}
            <div className="border-b border-stone-400 mb-0.5 pb-0.5">
              <span className="invisible text-[10px]">Signature</span>
            </div>
            <p className="text-[10px] text-stone-800">( {co?.signatureName || '-'} )</p>
            <p className="text-[10px] text-stone-400 mt-0.5">{getCurrentThaiDate()}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-stone-500 mb-6">ผู้อนุมัติแผน (Approved By)</p>
            <div className="mb-1 pb-4"></div>
            <div className="border-b border-stone-400 mb-0.5 pb-0.5">
              <span className="invisible text-[10px]">Signature</span>
            </div>
            <p className="text-[10px] text-stone-800">( ...................................... )</p>
            <p className="text-[10px] text-stone-400 mt-0.5">วันที่ ........................</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-[var(--doc-primary)] text-white py-2 text-center">
        <p className="text-[10px] text-stone-400">{co?.companyName?.toUpperCase() || '-'} • {co?.tagline || '-'} • {co?.email || '-'} • {co?.phone || '-'}</p>
      </div>

      {/* Action Buttons */}
      <div className="p-4 bg-white border-t border-stone-200 print:hidden flex gap-3">
        {onUpdate && (
          <button
            onClick={() => setIsEditing(true)}
            className="flex-1 flex items-center justify-center gap-2 border border-stone-300 hover:bg-stone-50 text-stone-700 py-2 px-6 rounded-lg transition-colors text-sm"
          >
            <Pencil className="w-4 h-4" />
            แก้ไขแผนงาน
          </button>
        )}
        <button
          onClick={() => window.print()}
          className="flex-1 bg-[var(--doc-primary)] hover:bg-[var(--doc-primary-hover)] text-white py-2 px-6 rounded-lg transition-colors text-sm"
        >
          พิมพ์เอกสาร / Print Document
        </button>
      </div>
    </div>
  );
}
