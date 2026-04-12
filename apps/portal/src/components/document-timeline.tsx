'use client';

import { Check } from 'lucide-react';

interface TimelineStep {
    label: string;
    key: string;
    reached: boolean;
    active: boolean;
}

interface DocumentTimelineProps {
    status: string;
    openedByClient?: boolean;
    compact?: boolean;
}

function getSteps(status: string, openedByClient?: boolean): TimelineStep[] {
    const order = ['DRAFT', 'ISSUED', 'OPENED', 'PAID'];
    let currentIndex = 0;

    if (status === 'CANCELLED') {
        return [
            { label: 'ยกเลิก', key: 'CANCELLED', reached: true, active: true },
        ];
    }

    if (status === 'PAID') currentIndex = 3;
    else if (openedByClient) currentIndex = 2;
    else if (status === 'ISSUED') currentIndex = 1;
    else currentIndex = 0;

    const labels: Record<string, string> = {
        DRAFT: 'ร่าง',
        ISSUED: 'ออกแล้ว',
        OPENED: 'เปิดดูแล้ว',
        PAID: 'ชำระแล้ว',
    };

    return order.map((key, i) => ({
        label: labels[key],
        key,
        reached: i <= currentIndex,
        active: i === currentIndex,
    }));
}

const stepColors: Record<string, { dot: string; line: string }> = {
    DRAFT: { dot: 'bg-slate-400 dark:bg-slate-500', line: 'bg-slate-200 dark:bg-slate-700' },
    ISSUED: { dot: 'bg-emerald-500', line: 'bg-emerald-300 dark:bg-emerald-700' },
    OPENED: { dot: 'bg-blue-500', line: 'bg-blue-300 dark:bg-blue-700' },
    PAID: { dot: 'bg-emerald-500', line: 'bg-emerald-300 dark:bg-emerald-700' },
    CANCELLED: { dot: 'bg-red-500', line: 'bg-red-200 dark:bg-red-800' },
};

export default function DocumentTimeline({ status, openedByClient, compact }: DocumentTimelineProps) {
    const steps = getSteps(status, openedByClient);

    if (steps.length === 1 && steps[0].key === 'CANCELLED') {
        return (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 dark:bg-red-900/40 px-2 py-0.5 text-[10px] font-semibold text-red-700 dark:text-red-300">
                ยกเลิก
            </span>
        );
    }

    if (compact) {
        return (
            <div className="flex items-center gap-1">
                {steps.map((step, i) => {
                    const colors = stepColors[step.key];
                    return (
                        <div key={step.key} className="flex items-center gap-1">
                            <div
                                className={`h-2 w-2 rounded-full transition-colors ${step.reached ? colors.dot : 'bg-slate-200 dark:bg-slate-700'}`}
                                title={step.label}
                            />
                            {i < steps.length - 1 && (
                                <div
                                    className={`h-0.5 w-3 rounded-full ${step.reached && steps[i + 1].reached ? colors.line : 'bg-slate-200 dark:bg-slate-700'}`}
                                />
                            )}
                        </div>
                    );
                })}
                <span className="ml-1 text-[10px] font-medium text-slate-500 dark:text-slate-400">
                    {steps.find((s) => s.active)?.label}
                </span>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-0">
            {steps.map((step, i) => {
                const colors = stepColors[step.key];
                return (
                    <div key={step.key} className="flex items-center">
                        <div className="flex flex-col items-center">
                            <div
                                className={`flex h-6 w-6 items-center justify-center rounded-full transition-colors ${
                                    step.reached ? colors.dot : 'bg-slate-200 dark:bg-slate-700'
                                } ${step.active ? 'ring-2 ring-offset-2 ring-emerald-300 dark:ring-emerald-700 dark:ring-offset-slate-900' : ''}`}
                            >
                                {step.reached && !step.active && (
                                    <Check className="h-3 w-3 text-white" strokeWidth={3} />
                                )}
                                {step.active && (
                                    <div className="h-2 w-2 rounded-full bg-white" />
                                )}
                            </div>
                            <span className={`mt-1 text-[10px] font-medium ${step.active ? 'text-slate-900 dark:text-slate-100' : 'text-slate-400 dark:text-slate-500'}`}>
                                {step.label}
                            </span>
                        </div>
                        {i < steps.length - 1 && (
                            <div
                                className={`mx-1 h-0.5 w-8 rounded-full ${step.reached && steps[i + 1].reached ? colors.line : 'bg-slate-200 dark:bg-slate-700'}`}
                            />
                        )}
                    </div>
                );
            })}
        </div>
    );
}
