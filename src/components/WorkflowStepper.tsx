import { WorkflowStep } from "../types/boq";
import { FileText, FileCheck, Receipt, FileSpreadsheet, Check, LucideIcon } from "lucide-react";
import { Card } from "./ui/card";

interface WorkflowStepperProps {
  currentStep: WorkflowStep;
  completedSteps: {
    boq: boolean;
    quotation: boolean;
    invoice: boolean;
    receipt: boolean;
  };
  onStepClick?: (step: WorkflowStep) => void;
}

export function WorkflowStepper({ currentStep, completedSteps, onStepClick }: WorkflowStepperProps) {
  const steps: {
    id: WorkflowStep;
    label: string;
    shortLabel: string;
    icon: LucideIcon;
    description: string;
  }[] = [
    {
      id: "boq",
      label: "BOQ - รายการวัสดุ",
      shortLabel: "BOQ",
      icon: FileText,
      description: "กรอกรายการวัสดุและรายละเอียด",
    },
    {
      id: "quotation",
      label: "ใบเสนอราคา",
      shortLabel: "Quotation",
      icon: FileCheck,
      description: "สร้างใบเสนอราคา + ส่วนลด",
    },
    {
      id: "invoice",
      label: "ใบวางบิล",
      shortLabel: "Invoice",
      icon: Receipt,
      description: "แบ่งงวดชำระ + ข้อมูลธนาคาร",
    },
    {
      id: "receipt",
      label: "ใบกำกับภาษี/ใบเสร็จ",
      shortLabel: "Receipt",
      icon: FileSpreadsheet,
      description: "ออกใบกำกับภาษีและใบเสร็จ",
    },
  ];

  const getStepIndex = (step: WorkflowStep) => steps.findIndex(s => s.id === step);
  const currentIndex = getStepIndex(currentStep);

  return (
    <Card className="p-6 bg-white/80 backdrop-blur-sm shadow-lg border-purple-100">
      <h3 className="mb-4 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
        ขั้นตอนการทำเอกสาร
      </h3>
      
      {/* Desktop Stepper */}
      <div className="hidden md:flex items-center justify-between">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = currentStep === step.id;
          const isCompleted = completedSteps[step.id];
          const isPast = index < currentIndex;
          const canClick = isPast || isCompleted || index === currentIndex;

          return (
            <div key={step.id} className="flex items-center flex-1">
              {/* Step Circle */}
              <div className="flex flex-col items-center flex-1">
                <button
                  onClick={() => canClick && onStepClick?.(step.id)}
                  disabled={!canClick}
                  className={`
                    w-16 h-16 rounded-full border-2 flex items-center justify-center transition-all
                    ${isActive 
                      ? 'border-purple-500 bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg scale-110' 
                      : isCompleted
                      ? 'border-green-500 bg-green-500 hover:scale-105'
                      : isPast
                      ? 'border-gray-300 bg-gray-100 hover:scale-105'
                      : 'border-gray-300 bg-white'
                    }
                    ${canClick ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}
                  `}
                >
                  {isCompleted ? (
                    <Check className="h-8 w-8 text-white" />
                  ) : (
                    <Icon className={`h-8 w-8 ${isActive ? 'text-white' : 'text-gray-600'}`} />
                  )}
                </button>
                <div className="mt-3 text-center">
                  <div className={`text-sm font-medium ${isActive ? 'text-purple-600' : 'text-gray-600'}`}>
                    {step.shortLabel}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 max-w-[120px]">
                    {step.description}
                  </div>
                </div>
              </div>

              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div className={`h-0.5 flex-1 mx-2 -mt-12 transition-colors ${
                  index < currentIndex || isCompleted ? 'bg-green-500' : 'bg-gray-300'
                }`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile Stepper */}
      <div className="md:hidden space-y-3">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = currentStep === step.id;
          const isCompleted = completedSteps[step.id];
          const isPast = index < currentIndex;
          const canClick = isPast || isCompleted || index === currentIndex;

          return (
            <button
              key={step.id}
              onClick={() => canClick && onStepClick?.(step.id)}
              disabled={!canClick}
              className={`
                w-full p-4 rounded-lg border-2 flex items-center gap-4 transition-all
                ${isActive 
                  ? 'border-purple-500 bg-gradient-to-r from-purple-50 to-pink-50 shadow-md' 
                  : isCompleted
                  ? 'border-green-500 bg-green-50'
                  : isPast
                  ? 'border-gray-300 bg-gray-50'
                  : 'border-gray-300 bg-white'
                }
                ${canClick ? 'cursor-pointer hover:shadow-md' : 'cursor-not-allowed opacity-50'}
              `}
            >
              <div className={`
                w-12 h-12 rounded-full border-2 flex items-center justify-center flex-shrink-0
                ${isActive 
                  ? 'border-purple-500 bg-gradient-to-br from-purple-500 to-pink-500' 
                  : isCompleted
                  ? 'border-green-500 bg-green-500'
                  : 'border-gray-300 bg-white'
                }
              `}>
                {isCompleted ? (
                  <Check className="h-6 w-6 text-white" />
                ) : (
                  <Icon className={`h-6 w-6 ${isActive ? 'text-white' : 'text-gray-600'}`} />
                )}
              </div>
              <div className="flex-1 text-left">
                <div className={`font-medium ${isActive ? 'text-purple-600' : 'text-gray-900'}`}>
                  {step.label}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {step.description}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </Card>
  );
}
