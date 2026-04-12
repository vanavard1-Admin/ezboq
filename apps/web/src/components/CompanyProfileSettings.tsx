import { useState, useRef } from 'react';
import { ImagePlus, Plus, Trash2, Check, QrCode } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import type { CompanyProfile, BankAccount } from '../utils/companyProfile';
import { themePresets } from '../utils/themePresets';
import { thaiBankOptions, findBankByName } from '../utils/thaiBankData';

interface CompanyProfileSettingsProps {
  profile: CompanyProfile;
  onSave: (profile: CompanyProfile) => void;
  currentThemeId: string;
  onThemeChange: (id: string) => void;
}


function BankSelector({ value, onChange }: { value: string; onChange: (name: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const bankInfo = findBankByName(value);

  // Close on outside click
  useState(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  });

  return (
    <div ref={ref} className="relative">
      {/* Selected bank display / trigger */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-left transition hover:border-slate-300 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
      >
        {bankInfo ? (
          <>
            <img src={bankInfo.icon} alt={bankInfo.symbol} className="h-8 w-8 rounded-md object-contain" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-800 truncate">{bankInfo.fullname}</p>
              <p className="text-xs text-slate-400">{bankInfo.nameEN}</p>
            </div>
          </>
        ) : (
          <span className="text-sm text-slate-400">-- เลือกธนาคาร --</span>
        )}
        <svg className="h-4 w-4 shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
          {thaiBankOptions.map((o) => {
            const isSelected = o.label === value || o.value === value?.toUpperCase();
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => { onChange(o.label); setOpen(false); }}
                className={"flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-slate-50 " + (isSelected ? "bg-blue-50" : "")}
              >
                <img src={o.icon} alt={o.symbol} className="h-8 w-8 rounded-md object-contain" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{o.label}</p>
                  <p className="text-xs text-slate-400">{o.nameEN}</p>
                </div>
                {isSelected && <Check className="h-4 w-4 text-blue-500 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function CompanyProfileSettings({ profile, onSave, currentThemeId, onThemeChange }: CompanyProfileSettingsProps) {
  const [form, setForm] = useState<CompanyProfile>({ ...profile, bankAccounts: profile.bankAccounts.map(b => ({ ...b })) });
  const [saved, setSaved] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const sigInputRef = useRef<HTMLInputElement>(null);
  const qrInputRef = useRef<HTMLInputElement>(null);

  const updateField = <K extends keyof CompanyProfile>(key: K, value: CompanyProfile[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const updateBank = (id: string, field: keyof BankAccount, value: string) => {
    setForm(prev => ({
      ...prev,
      bankAccounts: prev.bankAccounts.map(b => b.id === id ? { ...b, [field]: value } : b),
    }));
    setSaved(false);
  };

  const addBank = () => {
    setForm(prev => ({
      ...prev,
      bankAccounts: [...prev.bankAccounts, {
        id: `bank-${Date.now()}`,
        bankName: '',
        accountName: '',
        accountNumber: '',
        accountType: 'ออมทรัพย์',
      }],
    }));
    setSaved(false);
  };

  const removeBank = (id: string) => {
    setForm(prev => ({
      ...prev,
      bankAccounts: prev.bankAccounts.filter(b => b.id !== id),
    }));
    setSaved(false);
  };

  const handleImageUpload = (key: 'logoUrl' | 'signatureUrl' | 'promptPayQrUrl') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('ไฟล์ต้องมีขนาดไม่เกิน 2MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      updateField(key, reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    onSave(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const inputClass = 'w-full bg-transparent border-0 border-b border-stone-200 rounded-none px-0 py-2 text-sm text-stone-800 placeholder:text-stone-300 focus:border-amber-500 focus:ring-0 focus:outline-none transition-colors';
  const labelClass = 'mb-2 block text-sm text-stone-500';

  return (
    <div className="mx-auto max-w-5xl">
      <section className="px-6 py-6 md:px-8">
        <p className="text-[11px] uppercase tracking-[0.22em] text-stone-400">Company Identity</p>
        <h1 className="mt-3 text-3xl text-stone-800">ข้อมูลบริษัท</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-500">
          ข้อมูลชุดนี้จะถูกใช้กับหัวเอกสาร โลโก้ ลายเซ็น และรายละเอียดการชำระเงินในเอกสารทั้งหมด
        </p>
      </section>

      <section className="mt-6 px-6">
        <p className="text-[11px] font-medium tracking-[0.22em] uppercase text-stone-400 mb-4">โลโก้บริษัท</p>
        <div
          onClick={() => logoInputRef.current?.click()}
          className="flex cursor-pointer items-center gap-6 rounded-xl border-2 border-dashed border-stone-200 bg-white p-6 transition-colors hover:border-stone-300"
        >
          {form.logoUrl ? (
            <img src={form.logoUrl} alt="Logo" className="h-20 w-20 rounded-lg object-contain" />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-stone-50">
              <ImagePlus className="h-6 w-6 text-stone-400" />
            </div>
          )}
          <div>
            <p className="text-sm text-stone-800">คลิกเพื่ออัพโหลดโลโก้</p>
            <p className="mt-1 text-xs text-stone-400">.jpg, .png ขนาดไม่เกิน 2MB</p>
          </div>
        </div>
        <input
          ref={logoInputRef}
          type="file"
          accept="image/jpeg,image/png"
          className="hidden"
          onChange={handleImageUpload('logoUrl')}
        />
        {form.logoUrl && (
          <button
            onClick={(e) => { e.stopPropagation(); updateField('logoUrl', undefined); }}
            className="mt-3 text-xs text-stone-400 transition-colors hover:text-stone-800"
          >
            ลบโลโก้
          </button>
        )}
      </section>

      <section className="mt-6 px-6">
        <p className="text-[11px] font-medium tracking-[0.22em] uppercase text-stone-400 mb-4">ข้อมูลทั่วไป</p>
        <div className="space-y-5">
          <div>
            <label className={labelClass}>ชื่อบริษัท</label>
            <input className={inputClass} value={form.companyName} onChange={e => updateField('companyName', e.target.value)} placeholder="ชื่อบริษัท" />
          </div>
          <div>
            <label className={labelClass}>ชื่อบริษัท (ภาษาไทย)</label>
            <input className={inputClass} value={form.companyNameTh || ''} onChange={e => updateField('companyNameTh', e.target.value)} placeholder="ชื่อบริษัท (ไทย)" />
          </div>
          <div>
            <label className={labelClass}>Tagline</label>
            <input className={inputClass} value={form.tagline} onChange={e => updateField('tagline', e.target.value)} placeholder="Interior Design & Construction" />
          </div>
          <div>
            <label className={labelClass}>เบอร์โทรศัพท์</label>
            <input className={inputClass} value={form.phone} onChange={e => updateField('phone', e.target.value)} placeholder="0XX-XXX-XXXX" />
          </div>
          <div>
            <label className={labelClass}>อีเมล</label>
            <input className={inputClass} type="email" value={form.email} onChange={e => updateField('email', e.target.value)} placeholder="email@company.com" />
          </div>
          <div>
            <label className={labelClass}>ที่อยู่</label>
            <textarea className={`${inputClass} resize-none`} rows={3} value={form.address} onChange={e => updateField('address', e.target.value)} placeholder="ที่อยู่บริษัท" />
          </div>
          <div>
            <label className={labelClass}>เลขประจำตัวผู้เสียภาษี</label>
            <input className={inputClass} value={form.taxId || ''} onChange={e => updateField('taxId', e.target.value)} placeholder="เลขประจำตัวผู้เสียภาษี (ถ้ามี)" />
          </div>
        </div>
      </section>

      <section className="mt-6 px-6">
        <p className="text-[11px] font-medium tracking-[0.22em] uppercase text-stone-400 mb-4">การตั้งค่า VAT</p>
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <button
              type="button"
              role="switch"
              aria-checked={form.vatExempt ?? false}
              onClick={() => updateField('vatExempt', !(form.vatExempt ?? false))}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus:outline-none ${
                form.vatExempt ? 'bg-amber-500' : 'bg-stone-200'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition-transform ${
                  form.vatExempt ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
            <div>
              <p className="text-sm text-stone-800">ยกเว้น VAT (Non-VAT registered)</p>
              <p className="text-xs text-stone-400">สำหรับธุรกิจที่ยังไม่ได้จด VAT — อัตรา VAT จะเป็น 0%</p>
            </div>
          </div>
          {!form.vatExempt && (
            <div>
              <label className={labelClass}>อัตรา VAT เริ่มต้น (%)</label>
              <input
                className={inputClass}
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={form.defaultVatRate !== undefined ? (form.defaultVatRate * 100).toFixed(1) : '7.0'}
                onChange={e => {
                  const pct = parseFloat(e.target.value);
                  updateField('defaultVatRate', isNaN(pct) ? 0.07 : pct / 100);
                }}
                placeholder="7"
              />
              <p className="mt-1 text-xs text-stone-400">ค่าเริ่มต้น 7% — ใช้เป็นค่า default เมื่อสร้างโครงการใหม่</p>
            </div>
          )}
        </div>
      </section>

      <section className="mt-6 px-6">
        <p className="text-[11px] font-medium tracking-[0.22em] uppercase text-stone-400 mb-4">บัญชีธนาคาร</p>
        <div className="space-y-6">
          {form.bankAccounts.map((bank, i) => (
            <div key={bank.id} className="rounded-xl border border-stone-200 bg-white p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-stone-800">บัญชี {i + 1}</p>
                {form.bankAccounts.length > 1 && (
                  <button
                    onClick={() => removeBank(bank.id)}
                    className="text-stone-400 transition-colors hover:text-rose-600"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <div className="space-y-4">
                <div>
                  <label className={labelClass}>ชื่อธนาคาร</label>
                  <BankSelector
                    value={bank.bankName}
                    onChange={(name) => updateBank(bank.id, 'bankName', name)}
                  />
                </div>
                <div>
                  <label className={labelClass}>ชื่อบัญชี</label>
                  <input className={inputClass} value={bank.accountName} onChange={e => updateBank(bank.id, 'accountName', e.target.value)} placeholder="ชื่อเจ้าของบัญชี" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className={labelClass}>เลขบัญชี</label>
                    <input className={inputClass} value={bank.accountNumber} onChange={e => updateBank(bank.id, 'accountNumber', e.target.value)} placeholder="XXX-X-XXXXX-X" />
                  </div>
                  <div>
                    <label className={labelClass}>ประเภทบัญชี</label>
                    <input className={inputClass} value={bank.accountType || ''} onChange={e => updateBank(bank.id, 'accountType', e.target.value)} placeholder="ออมทรัพย์" />
                  </div>
                </div>
              </div>
              {i < form.bankAccounts.length - 1 && (
                <div className="mt-6 border-t border-stone-200" />
              )}
            </div>
          ))}
        </div>
        <button
          onClick={addBank}
          className="mt-4 inline-flex items-center gap-2 rounded-lg border border-stone-200 px-4 py-2.5 text-sm text-stone-500 hover:text-stone-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          เพิ่มบัญชี
        </button>
      </section>

      <section className="mt-6 px-6">
        <p className="text-[11px] font-medium tracking-[0.22em] uppercase text-stone-400 mb-4">
          <QrCode className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
          PromptPay / QR Code ชำระเงิน
        </p>
        <p className="text-sm text-stone-500 mb-4">QR Code จะแสดงในใบวางบิลให้ลูกค้าสแกนชำระเงินได้ทันที</p>
        <div className="space-y-5">
          <div>
            <label className={labelClass}>หมายเลข PromptPay (เบอร์โทร / เลขบัตรประชาชน)</label>
            <input
              className={inputClass}
              value={form.promptPayId || ''}
              onChange={e => updateField('promptPayId', e.target.value)}
              placeholder="0XX-XXX-XXXX หรือ X-XXXX-XXXXX-XX-X"
            />
            <p className="mt-1 text-xs text-stone-400">ใส่เบอร์โทรหรือเลขบัตรประชาชนที่ผูก PromptPay</p>
          </div>
          <div>
            <label className={labelClass}>อัพโหลดภาพ QR Code</label>
            <div
              onClick={() => qrInputRef.current?.click()}
              className="flex cursor-pointer items-center gap-6 rounded-xl border-2 border-dashed border-stone-200 bg-white p-5 transition-colors hover:border-stone-300"
            >
              {form.promptPayQrUrl ? (
                <img src={form.promptPayQrUrl} alt="QR Code" className="h-24 w-24 rounded-lg object-contain" />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-lg bg-stone-50">
                  <QrCode className="h-8 w-8 text-stone-400" />
                </div>
              )}
              <div>
                <p className="text-sm text-stone-800">คลิกเพื่ออัพโหลดภาพ QR Code</p>
                <p className="mt-1 text-xs text-stone-400">แคปหน้าจอ QR จากแอปธนาคาร · .jpg, .png ขนาดไม่เกิน 2MB</p>
              </div>
            </div>
            <input
              ref={qrInputRef}
              type="file"
              accept="image/jpeg,image/png"
              className="hidden"
              onChange={handleImageUpload('promptPayQrUrl')}
            />
            {form.promptPayQrUrl && (
              <button
                onClick={() => updateField('promptPayQrUrl', undefined)}
                className="mt-3 text-xs text-stone-400 transition-colors hover:text-stone-800"
              >
                ลบภาพ QR Code
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="mt-6 px-6">
        <p className="text-[11px] font-medium tracking-[0.22em] uppercase text-stone-400 mb-4">ลายเซ็น</p>
        <div className="space-y-5">
          <div>
            <label className={labelClass}>ชื่อผู้เซ็น</label>
            <input className={inputClass} value={form.signatureName} onChange={e => updateField('signatureName', e.target.value)} placeholder="ชื่อผู้ลงนาม" />
          </div>
          <div
            onClick={() => sigInputRef.current?.click()}
            className="flex cursor-pointer items-center gap-6 rounded-xl border-2 border-dashed border-stone-200 bg-white p-5 transition-colors hover:border-stone-300"
          >
            {form.signatureUrl ? (
              <img src={form.signatureUrl} alt="Signature" className="h-16 object-contain" />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-stone-50">
                <ImagePlus className="h-5 w-5 text-stone-400" />
              </div>
            )}
            <div>
              <p className="text-sm text-stone-800">อัพโหลดลายเซ็น</p>
              <p className="mt-1 text-xs text-stone-400">.jpg, .png ขนาดไม่เกิน 2MB</p>
            </div>
          </div>
          <input
            ref={sigInputRef}
            type="file"
            accept="image/jpeg,image/png"
            className="hidden"
            onChange={handleImageUpload('signatureUrl')}
          />
          {form.signatureUrl && (
            <button
              onClick={() => updateField('signatureUrl', undefined)}
              className="text-xs text-stone-400 transition-colors hover:text-stone-800"
            >
              ลบลายเซ็น
            </button>
          )}
        </div>
      </section>

      <section className="mt-6 px-6">
        <p className="text-[11px] font-medium tracking-[0.22em] uppercase text-stone-400 mb-4">ธีมสีเอกสาร</p>
        <p className="text-sm text-stone-500 mb-4">เลือกชุดสีสำหรับหัวเอกสาร ปุ่ม และ Sidebar</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {themePresets.map((theme) => (
            <button
              key={theme.id}
              onClick={() => onThemeChange(theme.id)}
              className={`rounded-xl border-2 p-4 text-left transition-all ${
                currentThemeId === theme.id
                  ? 'border-stone-800 shadow-md'
                  : 'border-stone-200 hover:border-stone-300'
              }`}
            >
              <div className="flex gap-1.5 mb-2">
                <div className="h-6 flex-1 rounded-md" style={{ backgroundColor: theme.colors.primary }} />
                <div className="h-6 w-6 rounded-md" style={{ backgroundColor: theme.colors.accent }} />
              </div>
              <p className="text-sm text-stone-800">{theme.nameTh}</p>
              <p className="text-[10px] text-stone-400">{theme.name}</p>
            </button>
          ))}
        </div>
      </section>

      <div className="mt-6 px-6 pb-6">
        <button
          onClick={handleSave}
          className={`flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-sm font-medium transition-colors ${
            saved ? 'bg-stone-100 text-stone-800' : 'bg-[var(--doc-primary)] hover:bg-[var(--doc-primary-hover)] text-[var(--doc-primary-text)]'
          }`}
        >
          {saved ? (
            <>
              <Check className="w-4 h-4" />
              บันทึกแล้ว
            </>
          ) : (
            'บันทึก'
          )}
        </button>
      </div>
    </div>
  );
}
