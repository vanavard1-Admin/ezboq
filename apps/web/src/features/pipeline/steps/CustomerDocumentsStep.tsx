import { FileText, Lock, Unlock, Shield, ShieldCheck, ShieldAlert } from 'lucide-react';
import type { ProjectData } from '../../../utils/projectData';
import { getProjectGrandTotal } from '../../../utils/projectData';
import type { PricingConfig, InstallmentLine } from '../types';
import type { ViewableDocument } from '../components/DocumentViewer';
import { DocumentCard } from '../components/DocumentCard';
import { InstallmentEditor } from '../components/InstallmentEditor';

interface CustomerDocumentsStepProps {
  project: ProjectData;
  pricing: PricingConfig;
  installments: InstallmentLine[];
  onInstallmentsChange: (installments: InstallmentLine[]) => void;
  onPricingChange: (pricing: PricingConfig) => void;
  onViewDoc?: (type: ViewableDocument) => void;
}

const SPEC_GRADES = [
  { id: 'value', label: 'Economy', icon: Shield, color: 'text-slate-500', bg: 'bg-slate-50' },
  { id: 'standard', label: 'Standard', icon: ShieldCheck, color: 'text-blue-600', bg: 'bg-blue-50' },
  { id: 'premium', label: 'Premium', icon: ShieldAlert, color: 'text-purple-600', bg: 'bg-purple-50' },
];

export function CustomerDocumentsStep({
  project,
  pricing,
  installments,
  onInstallmentsChange,
  onPricingChange,
  onViewDoc,
}: CustomerDocumentsStepProps) {
  const itemCount = project.quotationData.filter(
    (i) => i.quantity !== '' && i.quantity !== undefined,
  ).length;

  // Use same grand total calculation as the quotation document
  const grandTotal = getProjectGrandTotal(project);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* ── Section Header ──────────────── */}
      <div className="mb-2">
        <h4 className="text-[13px] sm:text-[15px] font-extrabold text-center tracking-tight leading-loose mb-[-2px] text-slate-800">เอกสารลูกค้า</h4>
        <p className="text-xs text-slate-500 text-center">{project.name}</p>
      </div>

      {/* ── Mapping & Spec Locking Header ──────────────── */}
      <section className="bg-white rounded-2xl border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,20,109,1)] p-6 mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
              2. Mapping & Spec Locking
            </h2>
            <p className="text-sm text-slate-500 font-medium mt-1">
              Select grade and lock selling price to protect your margin.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Lock selling price toggle */}
            <button
              onClick={() => onPricingChange({ ...pricing, lockSellingPrice: !pricing.lockSellingPrice })}
              className={`
                flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold border-2 transition-all active:scale-95
                ${pricing.lockSellingPrice
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-900 border-slate-900 hover:bg-slate-50'
                }
              `}
            >
              {pricing.lockSellingPrice ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
              {pricing.lockSellingPrice ? 'SPEC LOCKED' : 'LOCK SPEC'}
            </button>
          </div>
        </div>

        {/* Grade Selection */}
        <div className="mt-8">
          <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 block">
            Select Spec Grade
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {SPEC_GRADES.map((grade) => {
              const isActive = (project.templatePricingTier || 'standard') === grade.id;
              const Icon = grade.icon;
              return (
                <button
                  key={grade.id}
                  onClick={() => {
                    // Logic to change grade would involve re-calculating BOQ
                    // For now, let's just show it as UI element
                  }}
                  className={`
                    flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all
                    ${isActive
                      ? `border-slate-900 ${grade.bg} shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]`
                      : 'border-slate-100 bg-white hover:border-slate-200 opacity-60'
                    }
                  `}
                >
                  <Icon className={`w-6 h-6 mb-2 ${grade.color}`} />
                  <span className={`text-sm font-bold ${grade.color}`}>{grade.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Documents Column */}
        <div className="lg:col-span-7 space-y-4">
          <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-2">
            Generated Documents
          </h3>

          <div className="space-y-4">
            <DocumentCard
              title="BOQ / ต้นทุน"
              subtitle={`${itemCount} รายการ`}
              status="ready"
              amount={project.quotationData.reduce((sum, item) => {
                const qty = parseFloat(String(item.quantity)) || 0;
                if (!qty) return sum;
                const up = Number(item.unitPrice) || 0;
                const lc = Number(item.laborCost) || 0;
                if (up > 0 || lc > 0) return sum + qty * (up + lc);
                const tp = item.totalPrice !== undefined && item.totalPrice !== null && item.totalPrice !== '' ? Number(item.totalPrice) || 0 : 0;
                return sum + qty * tp;
              }, 0)}
              onView={() => onViewDoc?.('quotation')}
              onExportPdf={() => onViewDoc?.('quotation')}
              onSendLine={() => onViewDoc?.('quotation')}
            />

            <DocumentCard
              title="QUOTATION"
              subtitle={`${itemCount} items`}
              status="ready"
              amount={grandTotal}
              onView={() => onViewDoc?.('customer-quotation')}
              onExportPdf={() => onViewDoc?.('customer-quotation')}
              onSendLine={() => onViewDoc?.('customer-quotation')}
            />

            <DocumentCard
              title="CONSTRUCTION CONTRACT"
              subtitle={`Owner: ${project.owner}`}
              status="ready"
              amount={grandTotal}
              onView={() => onViewDoc?.('contract')}
              onExportPdf={() => onViewDoc?.('contract')}
              onSendLine={() => onViewDoc?.('contract')}
            />

            <DocumentCard
              title="WORK PLAN"
              subtitle={project.workPlan ? `${project.workPlan.totalWeeks} Weeks` : 'Draft'}
              status={project.workPlan ? 'ready' : 'draft'}
              onView={() => onViewDoc?.('work-plan')}
              onExportPdf={() => onViewDoc?.('work-plan')}
              onSendLine={() => onViewDoc?.('work-plan')}
            />

            <DocumentCard
              title="INVOICE"
              subtitle={`${installments.length} งวด`}
              status={installments.length > 0 ? 'ready' : 'draft'}
              amount={grandTotal}
              onView={() => onViewDoc?.('invoice')}
              onExportPdf={() => onViewDoc?.('invoice')}
              onSendLine={() => onViewDoc?.('invoice')}
            />
          </div>
        </div>

        {/* Finance/Installments Column */}
        <div className="lg:col-span-5 space-y-4">
          <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-2">
            Billing Schedule
          </h3>
          <div className="bg-white rounded-2xl border-2 border-slate-900 p-6">
            <InstallmentEditor
              total={grandTotal}
              installments={installments}
              onChange={onInstallmentsChange}
            />
          </div>
        </div>
      </div>

      {/* ── Batch Actions ──────────────────────────── */}
      <div className="bg-slate-900 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-white">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Project Value</p>
          <p className="text-2xl font-black">{new Intl.NumberFormat('th-TH').format(grandTotal)} บาท</p>
        </div>

        <div className="flex flex-wrap gap-3 w-full sm:w-auto">
          <button
            onClick={() => {}}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-white text-slate-900 text-sm font-black rounded-xl hover:bg-slate-50 transition-all active:scale-95"
          >
            <FileText className="w-4 h-4" />
            EXPORT ALL
          </button>
          <button
            onClick={() => {}}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-green-500 text-white text-sm font-black rounded-xl hover:bg-green-600 transition-all active:scale-95"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
            </svg>
            LINE SEND
          </button>
        </div>
      </div>
    </div>
  );
}
