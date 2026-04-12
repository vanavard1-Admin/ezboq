import { useCallback, useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { InstallmentLine, InstallmentPreset } from '../types';
import { INSTALLMENT_PRESETS } from '../types';

interface InstallmentEditorProps {
  total: number;
  installments: InstallmentLine[];
  onChange: (installments: InstallmentLine[]) => void;
  label?: string;
}

function formatCurrency(v: number): string {
  return new Intl.NumberFormat('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);
}

const DEFAULT_LABELS = [
  'มัดจำเริ่มงาน',
  'ระหว่างดำเนินงาน',
  'ติดตั้งและเก็บรายละเอียด',
  'ส่งมอบงาน',
  'งวดเพิ่มเติม',
];

export function InstallmentEditor({ total, installments, onChange, label = 'แบ่งงวดชำระเงิน' }: InstallmentEditorProps) {
  const [activePreset, setActivePreset] = useState<InstallmentPreset | null>(null);

  const totalPercent = useMemo(
    () => installments.reduce((sum, i) => sum + i.percent, 0),
    [installments],
  );

  const isValid = Math.abs(totalPercent - 100) < 0.01;

  const applyPreset = useCallback((preset: InstallmentPreset) => {
    const found = INSTALLMENT_PRESETS.find((p) => p.key === preset);
    if (!found || found.key === 'custom') {
      setActivePreset('custom');
      return;
    }

    setActivePreset(preset);
    const newInstallments: InstallmentLine[] = found.splits.map((pct, idx) => ({
      no: idx + 1,
      label: DEFAULT_LABELS[idx] || `งวดที่ ${idx + 1}`,
      percent: pct,
      amount: Math.round(total * (pct / 100)),
    }));
    onChange(newInstallments);
  }, [total, onChange]);

  const handlePercentChange = useCallback((index: number, newPercent: number) => {
    setActivePreset('custom');
    const updated = installments.map((inst, i) => {
      if (i !== index) return inst;
      const pct = Math.max(0, Math.min(100, newPercent));
      return { ...inst, percent: pct, amount: Math.round(total * (pct / 100)) };
    });
    onChange(updated);
  }, [installments, total, onChange]);

  const handleAmountChange = useCallback((index: number, newAmount: number) => {
    setActivePreset('custom');
    const amt = Math.max(0, Math.min(total, newAmount));
    const pct = total > 0 ? Math.round((amt / total) * 10000) / 100 : 0;
    const updated = installments.map((inst, i) => {
      if (i !== index) return inst;
      return { ...inst, percent: pct, amount: amt };
    });
    onChange(updated);
  }, [installments, total, onChange]);

  const handleLabelChange = useCallback((index: number, newLabel: string) => {
    const updated = installments.map((inst, i) =>
      i === index ? { ...inst, label: newLabel } : inst,
    );
    onChange(updated);
  }, [installments, onChange]);

  const handleAddInstallment = useCallback(() => {
    setActivePreset('custom');
    const newNo = installments.length + 1;
    onChange([
      ...installments,
      {
        no: newNo,
        label: DEFAULT_LABELS[Math.min(newNo - 1, DEFAULT_LABELS.length - 1)],
        percent: 0,
        amount: 0,
      },
    ]);
  }, [installments, onChange]);

  const handleRemoveInstallment = useCallback((index: number) => {
    setActivePreset('custom');
    const updated = installments
      .filter((_, i) => i !== index)
      .map((inst, i) => ({ ...inst, no: i + 1 }));
    onChange(updated);
  }, [installments, onChange]);

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-slate-800">{label}</h3>

      {/* ── Preset buttons ─────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        {INSTALLMENT_PRESETS.map((preset) => (
          <button
            key={preset.key}
            onClick={() => applyPreset(preset.key)}
            className={`
              px-3 py-1.5 rounded-lg text-xs font-medium border transition-all
              ${activePreset === preset.key
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-600'
              }
            `}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* ── Installment table ──────────────────────── */}
      <div className="border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-slate-500">
              <th className="px-3 py-2 text-left w-12">งวด</th>
              <th className="px-3 py-2 text-left">รายละเอียด</th>
              <th className="px-3 py-2 text-center w-24">%</th>
              <th className="px-3 py-2 text-right w-36">จำนวนเงิน</th>
              <th className="px-3 py-2 w-10" />
            </tr>
          </thead>
          <tbody>
            {installments.map((inst, idx) => (
              <tr key={inst.no} className="border-t border-slate-100 hover:bg-slate-50/50">
                <td className="px-3 py-2 text-center font-medium text-slate-700">
                  {inst.no}
                </td>
                <td className="px-3 py-2">
                  <input
                    type="text"
                    value={inst.label}
                    onChange={(e) => handleLabelChange(idx, e.target.value)}
                    className="w-full bg-transparent border-0 text-slate-700 text-sm focus:ring-0 focus:outline-none px-0"
                    placeholder={`งวดที่ ${inst.no}`}
                  />
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center justify-center gap-1">
                    <input
                      type="number"
                      value={inst.percent}
                      onChange={(e) => handlePercentChange(idx, Number(e.target.value))}
                      className="w-16 text-center bg-white border border-slate-200 rounded-md px-2 py-1 text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-400 focus:outline-none"
                      min={0}
                      max={100}
                      step={1}
                    />
                    <span className="text-slate-400 text-xs">%</span>
                  </div>
                </td>
                <td className="px-3 py-2 text-right">
                  <input
                    type="text"
                    value={formatCurrency(inst.amount)}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^0-9]/g, '');
                      handleAmountChange(idx, Number(raw));
                    }}
                    className="w-full text-right bg-white border border-slate-200 rounded-md px-2 py-1 text-sm font-mono focus:border-blue-400 focus:ring-1 focus:ring-blue-400 focus:outline-none"
                  />
                </td>
                <td className="px-3 py-2 text-center">
                  {installments.length > 1 && (
                    <button
                      onClick={() => handleRemoveInstallment(idx)}
                      className="text-slate-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </td>
              </tr>
            ))}

            {/* Total row */}
            <tr className="border-t-2 border-slate-200 bg-slate-50 font-medium">
              <td className="px-3 py-2" />
              <td className="px-3 py-2 text-slate-700">รวม</td>
              <td className="px-3 py-2 text-center">
                <span className={`text-sm font-semibold ${isValid ? 'text-emerald-600' : 'text-red-500'}`}>
                  {Math.round(totalPercent * 100) / 100}%
                </span>
              </td>
              <td className="px-3 py-2 text-right font-mono text-slate-800">
                {formatCurrency(installments.reduce((sum, i) => sum + i.amount, 0))}
              </td>
              <td />
            </tr>
          </tbody>
        </table>
      </div>

      {/* ── Progress bar ───────────────────────────── */}
      <div className="space-y-1">
        <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              isValid ? 'bg-emerald-500' : totalPercent > 100 ? 'bg-red-500' : 'bg-blue-500'
            }`}
            style={{ width: `${Math.min(totalPercent, 100)}%` }}
          />
        </div>
        <div className="flex justify-between text-xs">
          <span className={isValid ? 'text-emerald-600 font-medium' : 'text-slate-400'}>
            {isValid ? 'ครบ 100%' : `ยังเหลืออีก ${Math.round((100 - totalPercent) * 100) / 100}%`}
          </span>
          <span className="text-slate-400">
            ยอดรวม: {formatCurrency(total)} บาท
          </span>
        </div>
      </div>

      {/* ── Add button ─────────────────────────────── */}
      <button
        onClick={handleAddInstallment}
        className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
      >
        <Plus className="w-3.5 h-3.5" />
        เพิ่มงวด
      </button>

      {/* ── Validation warning ─────────────────────── */}
      {!isValid && totalPercent > 0 && (
        <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
          {totalPercent > 100
            ? `เกิน 100% อยู่ ${Math.round((totalPercent - 100) * 100) / 100}% — กรุณาปรับลด`
            : `ต้องรวมเป็น 100% พอดี จึงจะดำเนินการต่อได้`
          }
        </p>
      )}
    </div>
  );
}
