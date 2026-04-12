import { useCallback, useMemo, useState } from 'react';
import {
  ArrowLeft, ArrowRight, Check, FileText, FolderPlus, ShoppingCart, Wallet,
} from 'lucide-react';
import type { ProjectData } from '../../utils/projectData';
import type { PipelineStep, PricingConfig, InstallmentLine, ContractorAssignment, MaterialCategory } from './types';
import { calculateInstallments, calculatePricing, DEFAULT_PRICING, extractMaterialCategories, PIPELINE_STEPS } from './types';
import { ProjectSetupStep } from './steps/ProjectSetupStep';
import { CustomerDocumentsStep } from './steps/CustomerDocumentsStep';
import { ProcurementStep } from './steps/ProcurementStep';
import { FinanceStep } from './steps/FinanceStep';

interface ProjectWizardProps {
  /** ถ้ามี project อยู่แล้ว (เปิดจาก existing project) */
  initialProject?: ProjectData;
  onComplete: (project: ProjectData) => void;
  onCancel: () => void;
}

const STEP_ICONS: Record<PipelineStep, typeof FolderPlus> = {
  'setup': FolderPlus,
  'mapping': FileText,
  'status': ShoppingCart,
  'output': Wallet,
  'finish': Check,
};

const STEP_KEYS: PipelineStep[] = ['setup', 'mapping', 'status', 'output'];

function formatCurrency(v: number): string {
  return new Intl.NumberFormat('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);
}

export function ProjectWizard({ initialProject, onComplete, onCancel }: ProjectWizardProps) {
  const [currentStep, setCurrentStep] = useState<number>(initialProject ? 1 : 0);
  const [project, setProject] = useState<ProjectData | null>(initialProject ?? null);
  const [pricing, setPricing] = useState<PricingConfig>(DEFAULT_PRICING);

  // Installments
  const [customerInstallments, setCustomerInstallments] = useState<InstallmentLine[]>([]);

  // Contractor
  const contractors = useMemo<ContractorAssignment[]>(() => [], []);

  // Derived
  const pricingSummary = useMemo(() => {
    if (!project) return null;
    return calculatePricing(project.quotationData, pricing);
  }, [project, pricing]);

  const materialCategories = useMemo<MaterialCategory[]>(() => {
    if (!project) return [];
    return extractMaterialCategories(project.quotationData);
  }, [project]);

  const stepIndex = currentStep;
  const stepKey = STEP_KEYS[stepIndex];
  const isFirstStep = stepIndex === 0;
  const isLastStep = stepIndex === STEP_KEYS.length - 1;

  const canProceed = useMemo(() => {
    switch (stepKey) {
      case 'setup':
        return project !== null;
      case 'mapping':
        return customerInstallments.length > 0;
      case 'status':
        return true; // Status can be tracked later
      case 'output':
        return true;
      default:
        return false;
    }
  }, [stepKey, project, customerInstallments]);

  const handleNext = useCallback(() => {
    if (isLastStep) {
      if (project) onComplete(project);
      return;
    }
    setCurrentStep((s) => Math.min(s + 1, STEP_KEYS.length - 1));
  }, [isLastStep, project, onComplete]);

  const handleBack = useCallback(() => {
    if (isFirstStep) {
      onCancel();
      return;
    }
    setCurrentStep((s) => Math.max(s - 1, 0));
  }, [isFirstStep, onCancel]);

  const handleProjectCreated = useCallback((newProject: ProjectData, newPricing: PricingConfig) => {
    setProject(newProject);
    setPricing(newPricing);

    // Auto-generate default installments
    const summary = calculatePricing(newProject.quotationData, newPricing);
    const defaultInstallments = calculateInstallments(summary.sellingTotal, [
      { no: 1, label: 'มัดจำเริ่มงาน', percent: 30 },
      { no: 2, label: 'ระหว่างดำเนินงาน', percent: 30 },
      { no: 3, label: 'ติดตั้งและเก็บรายละเอียด', percent: 30 },
      { no: 4, label: 'ส่งมอบงาน', percent: 10 },
    ]);
    setCustomerInstallments(defaultInstallments);

    // Auto-advance to next step
    setCurrentStep(1);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* ── Stepper Header ─────────────────────────── */}
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 py-3">
          {/* Title */}
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-lg font-semibold text-slate-900">
              {project ? project.name : 'สร้างโปรเจคใหม่'}
            </h1>
            {pricingSummary && (
              <span className="text-sm font-medium text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full">
                {formatCurrency(pricingSummary.sellingTotal)} บาท
              </span>
            )}
          </div>

          {/* Step indicators */}
          <div className="flex items-center gap-1">
            {PIPELINE_STEPS.map((step, idx) => {
              const Icon = STEP_ICONS[step.key];
              const isActive = idx === stepIndex;
              const isDone = idx < stepIndex;

              return (
                <button
                  key={step.key}
                  onClick={() => {
                    // Allow going back to completed steps
                    if (idx <= stepIndex || (project && idx <= stepIndex + 1)) {
                      setCurrentStep(idx);
                    }
                  }}
                  disabled={idx > stepIndex + 1 || (!project && idx > 0)}
                  className={`
                    flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                    ${isActive
                      ? 'bg-blue-600 text-white shadow-sm'
                      : isDone
                        ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                        : 'bg-slate-100 text-slate-400'
                    }
                    ${idx > stepIndex + 1 || (!project && idx > 0) ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
                  `}
                >
                  {isDone ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    <Icon className="w-3.5 h-3.5" />
                  )}
                  <span className="hidden sm:inline">{step.label}</span>
                  <span className="sm:hidden">{idx + 1}</span>
                </button>
              );
            })}
          </div>

          {/* Progress bar */}
          <div className="mt-2 h-1 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${((stepIndex + 1) / STEP_KEYS.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* ── Step Content ───────────────────────────── */}
      <div className="max-w-5xl mx-auto px-4 py-6">
        {stepKey === 'setup' && (
          <ProjectSetupStep
            initialProject={project}
            onProjectCreated={handleProjectCreated}
          />
        )}

        {stepKey === 'mapping' && project && pricingSummary && (
          <CustomerDocumentsStep
            project={project}
            pricing={pricing}
            installments={customerInstallments}
            onInstallmentsChange={setCustomerInstallments}
            onPricingChange={setPricing}
          />
        )}

        {stepKey === 'status' && project && (
          <ProcurementStep
            project={project}
            materialCategories={materialCategories}
          />
        )}

        {stepKey === 'output' && project && pricingSummary && (
          <FinanceStep
            project={project}
            pricing={pricing}
            pricingSummary={pricingSummary}
            installments={customerInstallments}
            contractors={contractors}
          />
        )}
      </div>

      {/* ── Bottom Navigation ──────────────────────── */}
      <div className="sticky bottom-0 bg-white/95 backdrop-blur border-t border-slate-200">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={handleBack}
            className="flex items-center gap-1.5 px-4 py-2 text-sm text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {isFirstStep ? 'ยกเลิก' : 'ย้อนกลับ'}
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">
              {stepIndex + 1} / {STEP_KEYS.length}
            </span>
            <button
              onClick={handleNext}
              disabled={!canProceed}
              className={`
                flex items-center gap-1.5 px-5 py-2 rounded-lg text-sm font-medium transition-all
                ${canProceed
                  ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                }
              `}
            >
              {isLastStep ? 'เสร็จสิ้น' : 'ถัดไป'}
              {isLastStep ? <Check className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
