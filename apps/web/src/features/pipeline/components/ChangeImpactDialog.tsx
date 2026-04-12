import { useState } from 'react';
import { AlertTriangle, ArrowRight, Lock, Unlock } from 'lucide-react';
import type { BoqChange, ChangeImpactMode } from '../types';
import { computeChangeImpact, type PricingConfig } from '../types';

interface ChangeImpactDialogProps {
  changes: BoqChange[];
  pricing: PricingConfig;
  oldCostTotal: number;
  newCostTotal: number;
  oldSellingTotal: number;
  onConfirm: (mode: ChangeImpactMode) => void;
  onCancel: () => void;
}

function formatCurrency(v: number): string {
  return new Intl.NumberFormat('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);
}

export function ChangeImpactDialog({
  changes,
  pricing,
  oldCostTotal,
  newCostTotal,
  oldSellingTotal,
  onConfirm,
  onCancel,
}: ChangeImpactDialogProps) {
  const [selectedMode, setSelectedMode] = useState<ChangeImpactMode>(
    pricing.lockSellingPrice ? 'lock-selling' : 'adjust-selling',
  );

  const costDelta = newCostTotal - oldCostTotal;
  const impact = computeChangeImpact(changes, selectedMode, pricing);

  // Calculate new selling for "adjust" mode
  const markupRate = 1 + pricing.markupPercent / 100;
  const operatingRate = 1 + pricing.operatingPercent / 100;
  const newSellingBeforeVat = Math.round(newCostTotal * markupRate * operatingRate);
  const newSellingTotal = pricing.vatEnabled
    ? Math.round(newSellingBeforeVat * (1 + pricing.vatRate))
    : newSellingBeforeVat;
  const sellingDelta = newSellingTotal - oldSellingTotal;

  // For lock mode, profit changes
  const profitDeltaLock = -costDelta; // if cost goes down, profit goes up
  const oldMarginPercent = oldSellingTotal > 0 ? Math.round(((oldSellingTotal - oldCostTotal) / oldSellingTotal) * 1000) / 10 : 0;
  const newMarginPercent = oldSellingTotal > 0 ? Math.round(((oldSellingTotal - newCostTotal) / oldSellingTotal) * 1000) / 10 : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40" onClick={onCancel} />

      {/* Dialog */}
      <div className="relative bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <h2 className="text-base font-semibold text-slate-900">
              BOQ เปลี่ยน — ต้นทุน{costDelta > 0 ? 'เพิ่ม' : 'ลด'} {formatCurrency(Math.abs(costDelta))} บาท
            </h2>
          </div>
        </div>

        {/* Changes summary */}
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-100">
          <p className="text-xs font-medium text-slate-500 mb-2">รายการที่เปลี่ยน:</p>
          {changes.map((c, idx) => (
            <div key={idx} className="flex items-center gap-2 text-xs text-slate-600 py-0.5">
              <span className="text-slate-400">{c.boqNo}</span>
              <span className="truncate">{c.description}</span>
              <ArrowRight className="w-3 h-3 text-slate-300 flex-shrink-0" />
              <span className="text-slate-400">{c.oldValue}</span>
              <span className="text-slate-900 font-medium">{c.newValue}</span>
            </div>
          ))}
        </div>

        {/* Mode selection */}
        <div className="px-5 py-4 space-y-3">
          <p className="text-sm font-medium text-slate-700">คุณต้องการ:</p>

          {/* Option A: Adjust selling */}
          <label
            className={`
              block p-3 rounded-xl border-2 cursor-pointer transition-all
              ${selectedMode === 'adjust-selling'
                ? 'border-blue-500 bg-blue-50'
                : 'border-slate-200 bg-white hover:border-slate-300'
              }
            `}
          >
            <div className="flex items-start gap-2">
              <input
                type="radio"
                checked={selectedMode === 'adjust-selling'}
                onChange={() => setSelectedMode('adjust-selling')}
                className="mt-0.5 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <div className="flex items-center gap-1.5">
                  <Unlock className="w-3.5 h-3.5 text-blue-600" />
                  <span className="text-sm font-semibold text-slate-800">ปรับราคาลูกค้าตาม</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  ราคาใหม่: {formatCurrency(newSellingTotal)} ({sellingDelta > 0 ? '+' : ''}{formatCurrency(sellingDelta)})
                </p>
                <p className="text-xs text-slate-400">
                  กำไร: {pricing.markupPercent}% (เท่าเดิม)
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  อัพเดท: ใบเสนอราคา, บิลงวด, สัญญา
                </p>
              </div>
            </div>
          </label>

          {/* Option B: Lock selling */}
          <label
            className={`
              block p-3 rounded-xl border-2 cursor-pointer transition-all
              ${selectedMode === 'lock-selling'
                ? 'border-amber-500 bg-amber-50'
                : 'border-slate-200 bg-white hover:border-slate-300'
              }
            `}
          >
            <div className="flex items-start gap-2">
              <input
                type="radio"
                checked={selectedMode === 'lock-selling'}
                onChange={() => setSelectedMode('lock-selling')}
                className="mt-0.5 text-amber-600 focus:ring-amber-500"
              />
              <div>
                <div className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-amber-600" />
                  <span className="text-sm font-semibold text-slate-800">ล็อคราคาลูกค้า (ไม่เปลี่ยน)</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  ราคาเดิม: {formatCurrency(oldSellingTotal)}
                </p>
                <p className="text-xs text-slate-500">
                  กำไร{profitDeltaLock > 0 ? 'เพิ่ม' : 'ลด'}: {oldMarginPercent}% → {newMarginPercent}% ({profitDeltaLock > 0 ? '+' : ''}{formatCurrency(profitDeltaLock)})
                </p>
                <p className="text-xs text-amber-600 mt-1">
                  อัพเดท: PO เท่านั้น
                </p>
              </div>
            </div>
          </label>
        </div>

        {/* Affected documents */}
        <div className="px-5 py-3 border-t border-slate-100">
          <p className="text-xs font-medium text-slate-500 mb-2">เอกสารที่จะอัพเดท:</p>
          <div className="space-y-1">
            {impact.affectedDocuments.map((doc) => (
              <div key={doc.type} className="flex items-center justify-between text-xs py-0.5">
                <div className="flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${doc.willChange ? 'bg-blue-500' : 'bg-slate-200'}`} />
                  <span className={doc.willChange ? 'text-slate-700' : 'text-slate-400'}>
                    {doc.label}
                  </span>
                </div>
                <span className={`text-xs ${doc.willChange ? 'text-blue-600' : 'text-slate-300'}`}>
                  {doc.reason}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="px-5 py-4 border-t border-slate-100 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 font-medium transition-colors"
          >
            ยกเลิก
          </button>
          <button
            onClick={() => onConfirm(selectedMode)}
            className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            ยืนยันการเปลี่ยน
          </button>
        </div>
      </div>
    </div>
  );
}
