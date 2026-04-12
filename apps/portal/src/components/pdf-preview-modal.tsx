'use client';

import { useEffect } from 'react';
import { X, Download, Loader2 } from 'lucide-react';
import { createPortal } from 'react-dom';

interface PdfPreviewModalProps {
    pdfUrl: string;
    docNo: string;
    onClose: () => void;
}

export default function PdfPreviewModal({ pdfUrl, docNo, onClose }: PdfPreviewModalProps) {
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleEsc);
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', handleEsc);
            document.body.style.overflow = '';
        };
    }, [onClose]);

    return createPortal(
        <div className="fixed inset-0 z-[60] flex flex-col bg-black/70 backdrop-blur-sm animate-fadeIn">
            {/* Header */}
            <div className="flex items-center justify-between bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-4 py-3 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                    {docNo || 'ตัวอย่างเอกสาร'}
                </h3>
                <div className="flex items-center gap-2">
                    <a
                        href={pdfUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-700"
                    >
                        <Download className="h-3.5 w-3.5" />
                        ดาวน์โหลด
                    </a>
                    <button
                        onClick={onClose}
                        className="rounded-lg p-1.5 text-slate-500 dark:text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-700"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>
            </div>

            {/* PDF Viewer */}
            <div className="relative flex-1 flex items-center justify-center p-4">
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <Loader2 className="h-8 w-8 animate-spin text-white/50" />
                </div>
                <iframe
                    src={pdfUrl}
                    className="relative z-10 h-full w-full max-w-4xl rounded-lg bg-white shadow-2xl"
                    title={`PDF Preview: ${docNo}`}
                />
            </div>
        </div>,
        document.body,
    );
}
