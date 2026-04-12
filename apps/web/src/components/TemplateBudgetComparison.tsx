import React from 'react';
import { TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';
import { ProjectData } from '../utils/projectData';
import { calculateTax } from '../utils/taxUtils';

interface TemplateBudgetComparisonProps {
  projects: ProjectData[];
}

function getProjectFinancials(project: ProjectData) {
  let totalCost = 0;
  const categoryCosts: Record<string, number> = {};

  for (const item of project.quotationData) {
    const qty = typeof item.quantity === 'number' ? item.quantity : 0;
    const unitPrice = typeof item.unitPrice === 'number' ? item.unitPrice : 0;
    const laborCost = typeof item.laborCost === 'number' ? item.laborCost : 0;
    if (qty === 0) continue;
    const cost = qty * (unitPrice + laborCost);
    totalCost += cost;
    const catNo = item.no.split('.')[0];
    categoryCosts[catNo] = (categoryCosts[catNo] || 0) + cost;
  }

  let sellingSubtotal = 0;
  for (const [catNo, cost] of Object.entries(categoryCosts)) {
    sellingSubtotal += cost * (catNo === 'A' ? 1.0 : 1.25);
  }
  const operatingFee = Math.round(sellingSubtotal * 0.05);
  const sellingTotal = Math.round(sellingSubtotal) + operatingFee;
  const profit = sellingTotal - Math.round(totalCost);

  return { totalCost: Math.round(totalCost), sellingTotal, operatingFee, profit };
}

const fmt = (n: number) => n.toLocaleString('th-TH');

export function TemplateBudgetComparison({ projects }: TemplateBudgetComparisonProps) {
  const templateProjects = projects.filter(p => p.templateId && p.templateBudget);

  if (templateProjects.length === 0) return null;

  // Aggregate tax
  let totalVat = 0;
  let totalWht = 0;
  for (const project of projects) {
    const fin = getProjectFinancials(project);
    const taxOpts = project.taxData || { includeVat: true, includeWithholding: true, vatRate: 0.07, withholdingRate: 0.03 };
    const tax = calculateTax(fin.sellingTotal, taxOpts);
    totalVat += tax.vatAmount;
    totalWht += tax.withholdingAmount;
  }

  return (
    <div className="space-y-4">
      {/* Tax Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 rounded-lg bg-stone-50 border border-stone-200">
          <p className="text-xs text-stone-500">VAT 7% รวม</p>
          <p className="text-lg font-bold text-stone-800">{fmt(totalVat)} <span className="text-xs font-normal">บาท</span></p>
        </div>
        <div className="p-3 rounded-lg bg-stone-50 border border-stone-200">
          <p className="text-xs text-stone-500">หัก ณ ที่จ่าย 3% รวม</p>
          <p className="text-lg font-bold text-stone-800">{fmt(totalWht)} <span className="text-xs font-normal">บาท</span></p>
        </div>
        <div className="p-3 rounded-lg bg-[var(--doc-accent-light)] border border-stone-200">
          <p className="text-xs text-stone-500">ภาษีสุทธิ (VAT - WHT)</p>
          <p className="text-lg font-bold text-stone-800">{fmt(totalVat - totalWht)} <span className="text-xs font-normal">บาท</span></p>
        </div>
      </div>

      {/* Budget vs Actual per template project */}
      <div>
        <h4 className="text-sm font-medium text-stone-700 mb-2 flex items-center gap-1.5">
          <TrendingUp className="w-4 h-4" />
          งบประมาณ vs ราคาจริง (โครงการจาก Template)
        </h4>
        <div className="space-y-2">
          {templateProjects.map(project => {
            const fin = getProjectFinancials(project);
            const budget = project.templateBudget || 0;
            const utilization = budget > 0 ? Math.round((fin.sellingTotal / budget) * 100) : 0;
            const isOver = utilization > 100;
            const isWarning = utilization > 80 && utilization <= 100;

            return (
              <div key={project.id} className="p-3 rounded-lg border border-stone-200 bg-white">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    {isOver ? (
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                    ) : (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    )}
                    <span className="text-sm font-medium text-stone-800">{project.name}</span>
                  </div>
                  <span className={`text-sm font-bold ${
                    isOver ? 'text-red-600' : isWarning ? 'text-amber-600' : 'text-green-600'
                  }`}>
                    {utilization}%
                  </span>
                </div>
                <div className="w-full h-2.5 bg-stone-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      isOver ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(utilization, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between mt-1 text-xs text-stone-500">
                  <span>ราคาขาย: {fmt(fin.sellingTotal)} บ.</span>
                  <span>งบ: {fmt(budget)} บ.</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
