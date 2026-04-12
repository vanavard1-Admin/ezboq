import React from 'react';
import { Building2, MapPin, Pencil, Eye, FileText } from 'lucide-react';
import { ProjectData } from '../utils/projectData';
import { getCurrentThaiDate } from '../utils/dateUtils';
import { loadCompanyProfile, type CompanyProfile } from '../utils/companyProfile';

interface ExpenseItem {
  id: string;
  date: string;
  description: string;
  category: string;
  amount: number;
  vatAmount: number;
  supplierName?: string;
}

interface ExpenseRecordDocumentProps {
  project: ProjectData;
  companyProfile?: CompanyProfile;
  expenses?: ExpenseItem[];
}

export function ExpenseRecordDocument({ project, companyProfile, expenses }: ExpenseRecordDocumentProps) {
  const [isEditing, setIsEditing] = React.useState(false);
  const co = companyProfile || loadCompanyProfile();

  const fmt = (n: number) => n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Build expense data — use provided expenses or generate placeholder from project costs
  const expenseItems: ExpenseItem[] = expenses && expenses.length > 0
    ? expenses
    : buildPlaceholderExpenses(project);

  // Category subtotals
  const categoryMap: Record<string, { items: ExpenseItem[]; total: number }> = {};
  expenseItems.forEach(item => {
    if (!categoryMap[item.category]) categoryMap[item.category] = { items: [], total: 0 };
    categoryMap[item.category].items.push(item);
    categoryMap[item.category].total += item.amount + item.vatAmount;
  });

  const grandSubtotal = expenseItems.reduce((sum, e) => sum + e.amount, 0);
  const grandVat = expenseItems.reduce((sum, e) => sum + e.vatAmount, 0);
  const grandTotal = grandSubtotal + grandVat;

  return (
    <div id="expense-record-doc" className="max-w-[210mm] mx-auto bg-white print:shadow-none">
      {(!co?.companyName && !co?.phone) && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mx-8 mt-4 print:hidden">
          <p className="text-sm text-amber-800">กรุณากรอกข้อมูลบริษัทในหน้า "ข้อมูลบริษัท" ก่อนพิมพ์เอกสาร</p>
        </div>
      )}

      <style>{`
        @media print {
          @page { size: A4; margin: 8mm 10mm; }
          body { margin: 0; padding: 0; }
          body * { visibility: hidden; }
          #expense-record-doc, #expense-record-doc * { visibility: visible; }
          #expense-record-doc { position: absolute; top: 0; left: 0; width: 100%; max-width: 100%; transform: scale(0.87); transform-origin: top center; }
          .print\\:page-break-inside-avoid { page-break-inside: avoid; break-inside: avoid; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>

      {/* ===== HEADER ===== */}
      <div className="bg-[var(--doc-primary)] text-white px-6 py-5 print:page-break-inside-avoid">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-6">
            {co?.logoUrl ? (
              <img src={co.logoUrl} alt="Logo" className="w-10 h-10 rounded object-contain bg-white/10" />
            ) : (
              <Building2 className="w-8 h-8" />
            )}
            <div>
              <h1 className="text-3xl tracking-wider mb-1">{co?.companyName?.toUpperCase() || '-'}</h1>
              <p className="text-sm text-stone-400">{co?.tagline || 'Interior Design & Construction'}</p>
            </div>
            <div className="border-l border-white/30 pl-6 ml-2">
              <div className="flex items-center gap-2 mb-1">
                <FileText className="w-5 h-5" />
                <h2 className="text-xl tracking-wide">บันทึกรายจ่าย</h2>
              </div>
              <p className="text-xs text-stone-400">EXPENSE RECORD</p>
            </div>
          </div>
          <div className="text-right">
            <div className="px-5 py-3">
              <p className="text-xs text-stone-400 mb-1">วันที่ / Date</p>
              <p className="text-base">{getCurrentThaiDate()}</p>
              <p className="text-xs text-stone-400 mt-3 mb-1">โครงการ / Project</p>
              <p className="text-base truncate max-w-[180px]">{project.name}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ===== TOOLBAR ===== */}
      <div className="flex items-center gap-2 px-6 py-3 bg-stone-50 border-b border-stone-200 print:hidden">
        <button
          onClick={() => setIsEditing(!isEditing)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
            isEditing
              ? 'bg-[var(--doc-primary)] text-white'
              : 'border border-stone-200 text-stone-600 hover:bg-stone-100'
          }`}
        >
          {isEditing ? <Eye className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
          {isEditing ? 'ดูตัวอย่าง' : 'แก้ไข'}
        </button>
        {isEditing && (
          <span className="text-[11px] text-stone-400">คลิกที่ข้อความเพื่อแก้ไขได้เลย</span>
        )}
      </div>

      {/* ===== MAIN CONTENT ===== */}
      <div
        contentEditable={isEditing}
        suppressContentEditableWarning
        className={`${isEditing ? '[&_p]:outline-none [&_p]:hover:bg-amber-50/40 [&_p]:focus:bg-amber-50/60 [&_td]:outline-none [&_td]:hover:bg-amber-50/40 [&_td]:focus:bg-amber-50/60 [&_p]:rounded [&_td]:rounded [&_p]:transition-colors [&_td]:transition-colors' : ''}`}
      >
        {/* Project Info */}
        <div className="px-6 py-4 border-b border-stone-200 bg-stone-50 print:page-break-inside-avoid">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h3 className="text-xs text-stone-800 mb-2 flex items-center gap-1.5 font-semibold">
                <Building2 className="w-3.5 h-3.5" />
                <span>บริษัท / Company</span>
              </h3>
              <div className="space-y-1 text-xs">
                <p className="text-stone-800 font-medium">{co?.companyName || '-'}</p>
                {co?.address && (
                  <div className="flex items-start gap-1.5">
                    <MapPin className="w-3 h-3 mt-0.5 text-stone-400 flex-shrink-0" />
                    <span className="text-stone-500">{co.address}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="border-l border-stone-200 pl-6">
              <h3 className="text-xs text-stone-800 mb-2 font-semibold">โครงการ / Project</h3>
              <div className="space-y-1 text-xs">
                <p className="text-stone-800 font-medium">{project.name}</p>
                <p className="text-stone-500">ลูกค้า: {project.owner || '-'}</p>
                {project.templateArea && (
                  <p className="text-stone-500">พื้นที่: {project.templateArea} ตร.ม.</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Expense Table */}
        <div className="px-6 pt-5 pb-4 print:page-break-inside-avoid">
          {(!expenses || expenses.length === 0) && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <p className="text-xs text-blue-800">แสดงข้อมูลประมาณการจากต้นทุนโครงการ (ยังไม่มีข้อมูลรายจ่ายจริง)</p>
            </div>
          )}

          <table className="w-full mb-4 text-sm">
            <thead>
              <tr className="bg-[var(--doc-primary)] text-white">
                <th className="px-2 py-2.5 text-left w-10 text-xs">ลำดับ</th>
                <th className="px-2 py-2.5 text-left w-20 text-xs">วันที่</th>
                <th className="px-2 py-2.5 text-left text-xs">รายการ</th>
                <th className="px-2 py-2.5 text-left w-20 text-xs">หมวด</th>
                <th className="px-2 py-2.5 text-left w-24 text-xs">ผู้ขาย</th>
                <th className="px-2 py-2.5 text-right w-24 text-xs">จำนวนเงิน</th>
                <th className="px-2 py-2.5 text-right w-20 text-xs">VAT</th>
                <th className="px-2 py-2.5 text-right w-24 text-xs">รวม</th>
              </tr>
            </thead>
            <tbody>
              {expenseItems.map((item, idx) => (
                <tr key={item.id} className={`border-b border-stone-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-stone-50/50'}`}>
                  <td className="px-2 py-2 text-center text-stone-500 text-xs">{idx + 1}</td>
                  <td className="px-2 py-2 text-stone-600 text-xs">{item.date}</td>
                  <td className="px-2 py-2 text-stone-800 text-xs">{item.description}</td>
                  <td className="px-2 py-2 text-stone-600 text-xs">{item.category}</td>
                  <td className="px-2 py-2 text-stone-600 text-xs">{item.supplierName || '-'}</td>
                  <td className="px-2 py-2 text-right font-medium text-stone-800 text-xs">{fmt(item.amount)}</td>
                  <td className="px-2 py-2 text-right text-stone-600 text-xs">{fmt(item.vatAmount)}</td>
                  <td className="px-2 py-2 text-right font-medium text-stone-800 text-xs">{fmt(item.amount + item.vatAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Category Subtotals */}
          <div className="mb-4">
            <h4 className="text-xs font-semibold text-stone-700 mb-2">สรุปตามหมวด / Category Summary</h4>
            <div className="space-y-1">
              {Object.entries(categoryMap).map(([cat, data]) => (
                <div key={cat} className="flex justify-between text-xs py-1 px-3 bg-stone-50 rounded">
                  <span className="text-stone-600">{cat} ({data.items.length} รายการ)</span>
                  <span className="font-medium text-stone-800">{fmt(data.total)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Grand Total */}
          <div className="max-w-xs ml-auto space-y-1.5 mt-4">
            <div className="flex justify-between text-sm py-1">
              <span className="text-stone-500">รวมค่าใช้จ่าย</span>
              <span className="font-medium text-stone-800">{fmt(grandSubtotal)}</span>
            </div>
            <div className="flex justify-between text-sm py-1">
              <span className="text-stone-500">ภาษีมูลค่าเพิ่ม (VAT)</span>
              <span className="font-medium text-stone-800">{fmt(grandVat)}</span>
            </div>
            <div className="flex justify-between pt-1.5 bg-[var(--doc-primary)] text-white -mx-3 -mb-3 px-3 py-2.5 rounded-b-lg">
              <span className="font-bold">ยอดรวมทั้งสิ้น</span>
              <span className="font-bold">{fmt(grandTotal)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-[var(--doc-primary)] text-white py-2 text-center mt-4">
        <p className="text-[10px] text-stone-400">
          {co?.companyName || '-'} | {co?.phone || '-'} | {co?.email || '-'}
        </p>
      </div>
    </div>
  );
}

/** Generate placeholder expenses from project cost data */
function buildPlaceholderExpenses(project: ProjectData): ExpenseItem[] {
  const items: ExpenseItem[] = [];
  const quotationData = project.quotationData || [];

  const categoryTotals: Record<string, { description: string; amount: number }> = {};
  quotationData.forEach(item => {
    const mainCat = item.no.split('.')[0];
    if (!categoryTotals[mainCat]) {
      const catItem = quotationData.find(q => q.no === mainCat);
      categoryTotals[mainCat] = {
        description: catItem?.description || `หมวด ${mainCat}`,
        amount: 0,
      };
    }
    const cost = (Number(item.unitPrice) || 0) + (Number(item.laborCost) || 0);
    categoryTotals[mainCat].amount += cost;
  });

  Object.entries(categoryTotals).forEach(([catNo, data]) => {
    if (data.amount <= 0) return;
    const amount = Math.round(data.amount);
    items.push({
      id: `placeholder-${catNo}`,
      date: '-',
      description: data.description,
      category: `หมวด ${catNo}`,
      amount,
      vatAmount: Math.round(amount * 0.07),
      supplierName: undefined,
    });
  });

  return items;
}
