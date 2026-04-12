import React, { useState, useMemo } from 'react';
import {
  Home, Building, Building2, Store, Hammer, Briefcase,
  ChevronLeft, ChevronRight, Sparkles, AlertTriangle, Check, Info
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import { constructionTemplates } from '../utils/constructionTemplates.data';
import { ConstructionTemplate } from '../utils/constructionTemplates';
import { generateProjectFromTemplate, createProjectFromTemplate, formatCurrency } from '../utils/templateGenerator';
import { ProjectData } from '../utils/projectData';
import type { PricingTier } from '../utils/materialPriceMaster';

const iconMap: Record<string, React.ElementType> = {
  Home, Building, Building2, Store, Hammer, Briefcase,
};

interface TemplateWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProjectCreated: (project: ProjectData) => void;
}

type WizardStep = 1 | 2 | 3;

const PRICING_TIER_LABELS: Record<PricingTier, string> = {
  value: 'ประหยัด',
  standard: 'มาตรฐาน',
  premium: 'พรีเมียม',
};

export function TemplateWizard({ open, onOpenChange, onProjectCreated }: TemplateWizardProps) {
  const [step, setStep] = useState<WizardStep>(1);
  const [selectedTemplate, setSelectedTemplate] = useState<ConstructionTemplate | null>(null);

  // Step 2 form
  const [projectName, setProjectName] = useState('');
  const [projectAddress, setProjectAddress] = useState('');
  const [projectPhone, setProjectPhone] = useState('');
  const [projectOwner, setProjectOwner] = useState('');
  const [area, setArea] = useState(100);
  const [budget, setBudget] = useState(1500000);
  const [rooms, setRooms] = useState(3);
  const [bathrooms, setBathrooms] = useState(2);
  const [excludedCategories, setExcludedCategories] = useState<string[]>([]);
  const [pricingTier, setPricingTier] = useState<PricingTier>('standard');

  // Reset wizard
  const resetWizard = () => {
    setStep(1);
    setSelectedTemplate(null);
    setProjectName('');
    setProjectAddress('');
    setProjectPhone('');
    setProjectOwner('');
    setArea(100);
    setBudget(1500000);
    setRooms(3);
    setBathrooms(2);
    setExcludedCategories([]);
    setPricingTier('standard');
  };

  const handleClose = () => {
    resetWizard();
    onOpenChange(false);
  };

  const handleSelectTemplate = (template: ConstructionTemplate) => {
    setSelectedTemplate(template);
    setArea(template.referenceArea);
    setRooms(template.defaultRooms);
    setBathrooms(template.defaultBathrooms);
    setProjectName(`${template.name} ${template.referenceArea} ตร.ม.`);
    setExcludedCategories([]);
    setStep(2);
  };

  // Preview calculation
  const preview = useMemo(() => {
    if (!selectedTemplate) return null;
    return generateProjectFromTemplate({
      templateId: selectedTemplate.id,
      projectName,
      projectAddress,
      projectPhone,
      projectOwner,
      area,
      budget,
      rooms,
      bathrooms,
      excludedCategories,
      pricingTier,
    });
  }, [selectedTemplate, area, budget, rooms, bathrooms, excludedCategories, pricingTier, projectName, projectAddress, projectPhone, projectOwner]);

  const handleCreate = () => {
    if (!selectedTemplate) return;
    const project = createProjectFromTemplate({
      templateId: selectedTemplate.id,
      projectName: projectName || `${selectedTemplate.name} ${area} ตร.ม.`,
      projectAddress,
      projectPhone,
      projectOwner,
      area,
      budget,
      rooms,
      bathrooms,
      excludedCategories,
      pricingTier,
    });
    if (project) {
      onProjectCreated(project);
      handleClose();
    }
  };

  const toggleCategory = (catNo: string) => {
    setExcludedCategories(prev =>
      prev.includes(catNo) ? prev.filter(c => c !== catNo) : [...prev, catNo]
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v: boolean) => { if (!v) handleClose(); }}>
      <DialogContent className="sm:max-w-[760px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[var(--doc-accent)]" />
            {step === 1 && 'เลือก Template ก่อสร้าง'}
            {step === 2 && `กรอกข้อมูล — ${selectedTemplate?.name}`}
            {step === 3 && 'ตรวจสอบ & สร้างโครงการ'}
          </DialogTitle>
          <DialogDescription>
            {step === 1 && 'เลือกประเภทงานก่อสร้าง ระบบจะสร้าง BOQ + เอกสารทั้งหมดให้อัตโนมัติ'}
            {step === 2 && 'กรอกรายละเอียดโครงการ พื้นที่ และงบประมาณ'}
            {step === 3 && 'ตรวจสอบข้อมูลก่อนสร้างโครงการ — แก้ไขได้ทุกรายการหลังสร้าง'}
          </DialogDescription>
        </DialogHeader>

        {/* Step indicators */}
        <div className="flex items-center justify-center gap-2 mb-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                s === step ? 'bg-[var(--doc-primary)] text-white' :
                s < step ? 'bg-green-500 text-white' :
                'bg-stone-200 text-stone-500'
              }`}>
                {s < step ? <Check className="w-4 h-4" /> : s}
              </div>
              {s < 3 && <div className={`w-8 h-0.5 ${s < step ? 'bg-green-500' : 'bg-stone-200'}`} />}
            </div>
          ))}
        </div>

        {/* STEP 1: Template Selection */}
        {step === 1 && (
          <div className="grid grid-cols-2 gap-3">
            {constructionTemplates.map((template) => {
              const Icon = iconMap[template.icon] || Building;
              return (
                <button
                  key={template.id}
                  onClick={() => handleSelectTemplate(template)}
                  className="text-left rounded-xl border-2 border-stone-200 hover:border-stone-400 hover:shadow-lg transition-all group overflow-hidden"
                >
                  {template.coverImage ? (
                    <div className="relative h-32 overflow-hidden">
                      <img
                        src={template.coverImage}
                        alt={template.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                      <div className="absolute bottom-2 left-3 flex items-center gap-1.5">
                        <div className="p-1 rounded-md bg-white/90 text-stone-700">
                          <Icon className="w-4 h-4" />
                        </div>
                        <h3 className="font-semibold text-white text-sm drop-shadow">{template.name}</h3>
                      </div>
                    </div>
                  ) : (
                    <div className="h-32 bg-stone-100 flex items-center justify-center">
                      <Icon className="w-10 h-10 text-stone-400" />
                    </div>
                  )}
                  <div className="p-3">
                    <p className="text-xs text-stone-500">{template.nameEn}</p>
                    <p className="text-xs text-stone-600 mt-1 line-clamp-2">{template.description}</p>
                    <p className="text-xs text-stone-500 font-medium mt-1.5">
                      {template.minArea}–{template.maxArea} ตร.ม. | {template.categories.length} หมวดงาน
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* STEP 2: Configuration */}
        {step === 2 && selectedTemplate && (
          <div className="space-y-4">
            {/* Project Info */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-stone-700">ข้อมูลโครงการ</h4>
              <input
                type="text"
                placeholder="ชื่อโครงการ *"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-stone-400 focus:outline-none"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="เจ้าของโครงการ"
                  value={projectOwner}
                  onChange={(e) => setProjectOwner(e.target.value)}
                  className="px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-stone-400 focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="เบอร์โทร"
                  value={projectPhone}
                  onChange={(e) => setProjectPhone(e.target.value)}
                  className="px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-stone-400 focus:outline-none"
                />
              </div>
              <input
                type="text"
                placeholder="ที่อยู่โครงการ"
                value={projectAddress}
                onChange={(e) => setProjectAddress(e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-stone-400 focus:outline-none"
              />
            </div>

            {/* Area + Budget */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  พื้นที่ใช้สอย (ตร.ม.)
                </label>
                <input
                  type="number"
                  value={area}
                  onChange={(e) => setArea(Math.max(1, parseInt(e.target.value) || 1))}
                  min={selectedTemplate.minArea}
                  max={selectedTemplate.maxArea}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-stone-400 focus:outline-none"
                />
                <input
                  type="range"
                  value={area}
                  onChange={(e) => setArea(parseInt(e.target.value))}
                  min={selectedTemplate.minArea}
                  max={selectedTemplate.maxArea}
                  className="w-full mt-1 accent-stone-600"
                />
                <p className="text-xs text-stone-400 mt-0.5">
                  {selectedTemplate.minArea}–{selectedTemplate.maxArea} ตร.ม.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  งบประมาณ (บาท)
                </label>
                <input
                  type="text"
                  value={formatCurrency(budget)}
                  onChange={(e) => {
                    const num = parseInt(e.target.value.replace(/[^0-9]/g, '')) || 0;
                    setBudget(num);
                  }}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-stone-400 focus:outline-none"
                />
                <p className="text-xs text-stone-400 mt-1">ใช้เป็นตัวอ้างอิงเปรียบเทียบ</p>
              </div>
            </div>

            {/* Rooms */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">จำนวนห้องนอน</label>
                <input
                  type="number"
                  value={rooms}
                  onChange={(e) => setRooms(Math.max(1, parseInt(e.target.value) || 1))}
                  min={1}
                  max={10}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-stone-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">จำนวนห้องน้ำ</label>
                <input
                  type="number"
                  value={bathrooms}
                  onChange={(e) => setBathrooms(Math.max(1, parseInt(e.target.value) || 1))}
                  min={1}
                  max={10}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-stone-400 focus:outline-none"
                />
              </div>
            </div>

            {/* Optional Categories */}
            {selectedTemplate.categories.filter(c => c.isOptional).length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-stone-700 mb-2">หมวดงานเพิ่มเติม (เลือกรวม/ไม่รวม)</h4>
                <div className="space-y-1.5">
                  {selectedTemplate.categories.filter(c => c.isOptional).map((cat) => (
                    <label key={cat.no} className="flex items-center gap-2 p-2 rounded-lg border border-stone-200 hover:bg-stone-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!excludedCategories.includes(cat.no)}
                        onChange={() => toggleCategory(cat.no)}
                        className="w-4 h-4 rounded border-stone-300 text-stone-600 focus:ring-stone-400"
                      />
                      <span className="text-sm text-stone-700">{cat.no}) {cat.description}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h4 className="text-sm font-medium text-stone-700 mb-2">ระดับวัสดุอ้างอิง</h4>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'value', label: 'ประหยัด', desc: 'คุมงบและวัสดุเกรดใช้งานจริง' },
                  { id: 'standard', label: 'มาตรฐาน', desc: 'เหมาะกับงานบ้านทั่วไป' },
                  { id: 'premium', label: 'พรีเมียม', desc: 'อัปเกรดสเปกและงานจบเนียนขึ้น' },
                ].map((tier) => {
                  const active = pricingTier === tier.id;
                  return (
                    <button
                      key={tier.id}
                      type="button"
                      onClick={() => setPricingTier(tier.id as PricingTier)}
                      className={`rounded-xl border px-3 py-3 text-left transition ${
                        active
                          ? 'border-[var(--doc-primary)] bg-[var(--doc-accent-light)]'
                          : 'border-stone-200 bg-white hover:border-stone-300'
                      }`}
                    >
                      <p className="text-sm font-medium text-stone-800">{tier.label}</p>
                      <p className="mt-1 text-[11px] leading-relaxed text-stone-500">{tier.desc}</p>
                    </button>
                  );
                })}
              </div>
              {preview && (
                <p className="mt-2 text-xs text-stone-500">
                  ใช้ฐานราคา {preview.priceReference.seriesLabel} ตรวจล่าสุด {preview.priceReference.updatedAt} ครอบคลุม {preview.priceReference.coveragePercent}% ของรายการ
                </p>
              )}
            </div>

            {/* Quick preview */}
            {preview && (
              <div className="p-3 rounded-lg bg-stone-50 border border-stone-200">
                <div className="flex items-center gap-1.5 text-xs text-stone-700 mb-1">
                  <Info className="w-3.5 h-3.5" /> ประมาณการเบื้องต้น
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-xs text-stone-500">ต้นทุน</p>
                    <p className="text-sm font-semibold text-stone-800">{formatCurrency(preview.estimatedCost)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-stone-500">ราคาขาย</p>
                    <p className="text-sm font-semibold text-stone-700">{formatCurrency(preview.estimatedSellingPrice)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-stone-500">ใช้งบ</p>
                    <p className={`text-sm font-semibold ${
                      preview.budgetUtilization > 100 ? 'text-red-600' :
                      preview.budgetUtilization > 80 ? 'text-orange-600' :
                      'text-green-600'
                    }`}>{preview.budgetUtilization}%</p>
                  </div>
                </div>
                <div className="mt-3 rounded-lg bg-white px-3 py-2 text-[11px] text-stone-500">
                  <span className="font-medium text-stone-700">ราคาอ้างอิง:</span> {preview.priceReference.seriesLabel} • {PRICING_TIER_LABELS[pricingTier]} • matched {preview.priceReference.matchedItems}/{preview.priceReference.totalItems}
                </div>
              </div>
            )}

            {/* Nav buttons */}
            <div className="flex justify-between pt-2">
              <button
                onClick={() => setStep(1)}
                className="flex items-center gap-1 px-4 py-2 text-sm text-stone-600 hover:text-stone-800 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" /> ย้อนกลับ
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={!projectName.trim()}
                className="flex items-center gap-1 px-6 py-2 bg-[var(--doc-primary)] hover:bg-[var(--doc-primary-hover)] disabled:bg-stone-300 text-white rounded-lg text-sm transition-colors"
              >
                ถัดไป <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Preview & Confirm */}
        {step === 3 && selectedTemplate && preview && (
          <div className="space-y-4">
            {/* Warnings */}
            {preview.warnings.length > 0 && (
              <div className="space-y-2">
                {preview.warnings.map((w, i) => (
                  <div key={i} className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
                    <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-800">{w}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Project Summary */}
            <div className="p-4 rounded-xl bg-stone-50 border border-stone-200">
              <h4 className="text-sm font-medium text-stone-700 mb-3">สรุปโครงการ</h4>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <div><span className="text-stone-500">ชื่อ:</span> <span className="font-medium">{projectName}</span></div>
                <div><span className="text-stone-500">ประเภท:</span> <span className="font-medium">{selectedTemplate.name}</span></div>
                <div><span className="text-stone-500">พื้นที่:</span> <span className="font-medium">{formatCurrency(area)} ตร.ม.</span></div>
                <div><span className="text-stone-500">งบประมาณ:</span> <span className="font-medium">{formatCurrency(budget)} บาท</span></div>
                <div><span className="text-stone-500">ห้องนอน/น้ำ:</span> <span className="font-medium">{rooms} / {bathrooms}</span></div>
                <div><span className="text-stone-500">ระยะเวลา:</span> <span className="font-medium">~{preview.estimatedDurationWeeks} สัปดาห์</span></div>
                <div><span className="text-stone-500">ระดับวัสดุ:</span> <span className="font-medium">{PRICING_TIER_LABELS[pricingTier]}</span></div>
                <div><span className="text-stone-500">ฐานราคา:</span> <span className="font-medium">{preview.priceReference.seriesLabel}</span></div>
              </div>
            </div>

            {/* Category breakdown */}
            <div className="p-4 rounded-xl bg-white border border-stone-200">
              <h4 className="text-sm font-medium text-stone-700 mb-2">หมวดงานที่รวม</h4>
              <div className="space-y-1">
                {selectedTemplate.categories
                  .filter(c => !excludedCategories.includes(c.no))
                  .map(cat => {
                    const catItems = preview.quotationData.filter(
                      item => item.no.startsWith(cat.no + '.') && typeof item.quantity === 'number'
                    );
                    const catCost = catItems.reduce((sum, item) => {
                      const qty = typeof item.quantity === 'number' ? item.quantity : 0;
                      const up = typeof item.unitPrice === 'number' ? item.unitPrice : 0;
                      const lc = typeof item.laborCost === 'number' ? item.laborCost : 0;
                      return sum + qty * (up + lc);
                    }, 0);

                    return (
                      <div key={cat.no} className="flex justify-between items-center py-1 px-2 rounded hover:bg-stone-50">
                        <span className="text-sm text-stone-700">{cat.no}) {cat.description}</span>
                        <span className="text-sm font-medium text-stone-600">{formatCurrency(Math.round(catCost))} บ.</span>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Financial Summary */}
            <div className="p-4 rounded-xl bg-stone-50 border border-stone-200">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-stone-600">ต้นทุนรวม</span>
                  <span className="font-medium">{formatCurrency(preview.estimatedCost)} บาท</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-stone-600">ราคาขาย (markup 25% + operating 5%)</span>
                  <span className="font-semibold text-stone-700">{formatCurrency(preview.estimatedSellingPrice)} บาท</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-stone-600">กำไรโดยประมาณ</span>
                  <span className="font-semibold text-green-600">
                    {formatCurrency(preview.estimatedSellingPrice - preview.estimatedCost)} บาท
                    ({Math.round(((preview.estimatedSellingPrice - preview.estimatedCost) / preview.estimatedSellingPrice) * 100)}%)
                  </span>
                </div>
                <hr className="border-stone-200" />
                {/* Budget comparison bar */}
                <div>
                  <div className="flex justify-between text-xs text-stone-500 mb-1">
                    <span>ราคาขาย vs งบประมาณ</span>
                    <span>{preview.budgetUtilization}%</span>
                  </div>
                  <div className="w-full h-3 bg-stone-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        preview.budgetUtilization > 100 ? 'bg-red-500' :
                        preview.budgetUtilization > 80 ? 'bg-amber-500' :
                        'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(preview.budgetUtilization, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Tax info */}
            <div className="p-3 rounded-lg bg-stone-50 border border-stone-200">
              <div className="flex items-center gap-1.5 text-xs text-stone-500">
                <Info className="w-3.5 h-3.5" />
                โครงการจะรวมระบบภาษี: VAT 7% + หัก ณ ที่จ่าย 3% (แก้ไขได้ภายหลัง)
              </div>
              <div className="mt-2 text-xs text-stone-500">
                ราคา template รอบนี้อ้างอิง {preview.priceReference.seriesLabel} ตรวจล่าสุด {preview.priceReference.updatedAt} และ match ได้ {preview.priceReference.coveragePercent}% ของรายการ BOQ
              </div>
            </div>

            {/* Nav buttons */}
            <div className="flex justify-between pt-2">
              <button
                onClick={() => setStep(2)}
                className="flex items-center gap-1 px-4 py-2 text-sm text-stone-600 hover:text-stone-800 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" /> ย้อนกลับ
              </button>
              <button
                onClick={handleCreate}
                className="flex items-center gap-2 px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
              >
                <Sparkles className="w-4 h-4" />
                สร้างโครงการ ({preview.quotationData.filter(i => typeof i.quantity === 'number').length} รายการ)
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
