import { Eye, FileDown, Send, Check, FileText } from 'lucide-react';
import type { DocumentStatus } from '../types';

interface DocumentCardProps {
  title: string;
  subtitle?: string;
  status: DocumentStatus;
  amount?: number;
  onView?: () => void;
  onExportPdf?: () => void;
  onSendLine?: () => void;
  children?: React.ReactNode;
}

function formatCurrency(v: number): string {
  return new Intl.NumberFormat('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);
}

const STATUS_CONFIG: Record<DocumentStatus, { label: string; color: string; icon: typeof Check }> = {
  draft: { label: 'แบบร่าง', color: 'text-slate-500 bg-slate-100', icon: FileText },
  ready: { label: 'พร้อม', color: 'text-emerald-700 bg-emerald-50', icon: Check },
  sent: { label: 'ส่งแล้ว', color: 'text-blue-700 bg-blue-50', icon: Send },
  approved: { label: 'อนุมัติ', color: 'text-violet-700 bg-violet-50', icon: Check },
  paid: { label: 'ชำระแล้ว', color: 'text-emerald-700 bg-emerald-50', icon: Check },
};

export function DocumentCard({
  title,
  subtitle,
  status,
  amount,
  onView,
  onExportPdf,
  onSendLine,
  children,
}: DocumentCardProps) {
  const statusInfo = STATUS_CONFIG[status];
  const StatusIcon = statusInfo.icon;

  return (
    <div className="border border-slate-200 rounded-xl bg-white hover:shadow-sm transition-shadow">
      {/* Header */}
      <div className="px-4 py-3 flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-slate-800 truncate">{title}</h4>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}`}>
              <StatusIcon className="w-3 h-3" />
              {statusInfo.label}
            </span>
          </div>
          {subtitle && (
            <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
          )}
        </div>
        {amount !== undefined && (
          <span className="text-sm font-semibold text-slate-800 font-mono ml-3 whitespace-nowrap">
            {formatCurrency(amount)} บาท
          </span>
        )}
      </div>

      {/* Expandable content */}
      {children && (
        <div className="px-4 pb-3 border-t border-slate-100 pt-3">
          {children}
        </div>
      )}

      {/* Actions */}
      <div className="px-4 py-2 bg-slate-50/50 border-t border-slate-100 rounded-b-xl flex items-center gap-2">
        {onView && (
          <button
            onClick={onView}
            className="flex items-center gap-1 text-xs text-slate-600 hover:text-blue-600 font-medium transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
            ดูเอกสาร
          </button>
        )}
        {onExportPdf && (
          <button
            onClick={onExportPdf}
            className="flex items-center gap-1 text-xs text-slate-600 hover:text-blue-600 font-medium transition-colors"
          >
            <FileDown className="w-3.5 h-3.5" />
            Export PDF
          </button>
        )}
        {onSendLine && (
          <button
            onClick={onSendLine}
            className="flex items-center gap-1 text-xs text-green-600 hover:text-green-700 font-medium transition-colors ml-auto"
          >
            <Send className="w-3.5 h-3.5" />
            ส่ง LINE
          </button>
        )}
      </div>
    </div>
  );
}
