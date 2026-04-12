/**
 * ErrorState Component
 * 
 * B3: Actionable error states with retry/back/contact actions
 */
'use client';

import { AlertCircle, RefreshCw, ArrowLeft, Mail } from 'lucide-react';
import Link from 'next/link';

export interface ErrorStateProps {
    title?: string;
    message: string;
    error?: Error | string;
    actions?: {
        retry?: () => void;
        back?: string | (() => void);
        contactAdmin?: boolean;
    };
    className?: string;
}

export function ErrorState({
    title = 'เกิดข้อผิดพลาด',
    message,
    error,
    actions,
    className = '',
}: ErrorStateProps) {
    const errorMessage = error instanceof Error ? error.message : error || message;

    return (
        <div className={`flex flex-col items-center justify-center p-8 text-center ${className}`}>
            <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">{title}</h2>
            <p className="text-gray-600 mb-1">{message}</p>
            {error && (
                <p className="text-sm text-gray-500 mt-2 font-mono bg-gray-50 p-2 rounded max-w-md">
                    {errorMessage}
                </p>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-3 mt-6 justify-center">
                {actions?.retry && (
                    <button
                        onClick={actions.retry}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md font-medium flex items-center gap-2 text-sm sm:text-base"
                        data-testid="error-retry-button"
                    >
                        <RefreshCw className="w-4 h-4" />
                        ลองอีกครั้ง
                    </button>
                )}

                {actions?.back && (
                    typeof actions.back === 'string' ? (
                        <Link
                            href={actions.back}
                            className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-md font-medium flex items-center gap-2 text-sm sm:text-base"
                            data-testid="error-back-button"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            กลับ
                        </Link>
                    ) : (
                        <button
                            onClick={actions.back}
                            className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-md font-medium flex items-center gap-2 text-sm sm:text-base"
                            data-testid="error-back-button"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            กลับ
                        </button>
                    )
                )}

                {actions?.contactAdmin && (
                    <a
                        href="mailto:support@ezdoc.app?subject=Error Report"
                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md font-medium flex items-center gap-2 text-sm sm:text-base"
                        data-testid="error-contact-button"
                    >
                        <Mail className="w-4 h-4" />
                        ติดต่อผู้ดูแลระบบ
                    </a>
                )}
            </div>
        </div>
    );
}






