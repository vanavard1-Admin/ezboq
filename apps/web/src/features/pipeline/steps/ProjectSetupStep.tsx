import { useCallback, useMemo, useState, useRef } from 'react';
import { MapPin, Upload, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { ProjectData, QuotationItem } from '../../../utils/projectData';
import type { PricingConfig } from '../types';
import { calculatePricing, DEFAULT_PRICING } from '../types';
import { constructionTemplates } from '../../../utils/constructionTemplates.data';
import { generateProjectFromTemplate, createProjectFromTemplate } from '../../../utils/templateGenerator';
import type { PricingTier } from '../../../utils/materialPriceMaster';

// Mock service for BOQ Ingest (since we can't easily import from functions/src in the web app directly without an API)
const mockBoqIngest = async (file: File): Promise<{ rows: QuotationItem[]; totalAmount: number }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        if (!content) {
          throw new Error("Could not read file content");
        }

        const lines = content.split(/\r?\n/);
        if (lines.length < 2) {
          throw new Error("File is empty or has no data");
        }

        // Simple CSV parsing (handling basic cases)
        const rows: QuotationItem[] = [];
        let totalAmount = 0;

        // Detect headers
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        
        // Find indices for boss's specific columns or generic ones
        // Boss columns: Category, Room/Area, Description, Unit, Quantity, MaterialPrice, LaborPrice
        const idx = {
          no: headers.findIndex(h => h.includes('no.') || h === 'no' || h === 'ลำดับ'),
          description: headers.findIndex(h => h.includes('description') || h.includes('รายการ') || h === 'หมวดงาน/รายการ'),
          unit: headers.findIndex(h => h.includes('unit') || h === 'หน่วย'),
          quantity: headers.findIndex(h => h.includes('quantity') || h === 'จำนวน'),
          materialPrice: headers.findIndex(h => h.includes('material') || h === 'ราคาวัสดุ' || h.includes('unit price') || h === 'ราคาต่อหน่วย'),
          laborPrice: headers.findIndex(h => h.includes('labor') || h === 'ราคาค่าแรง' || h === 'ค่าแรง'),
          // Boss specific fallback
          category: headers.indexOf('category'),
          roomArea: headers.indexOf('room/area')
        };

        // If no header match for No., we'll just use the index
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          // Split by comma, but respect quotes if we wanted to be fancy
          // For now, simple split as requested
          const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
          
          if (cols.length < 3) continue;

          const qty = parseFloat(cols[idx.quantity] || '0') || 0;
          const uPrice = parseFloat(cols[idx.materialPrice] || '0') || 0;
          const lPrice = parseFloat(cols[idx.laborPrice] || '0') || 0;

          // Construct description from boss columns if available
          let description = cols[idx.description] || '';
          if (idx.category !== -1 && idx.roomArea !== -1 && cols[idx.category]) {
            const cat = cols[idx.category];
            const room = cols[idx.roomArea];
            description = `[${cat}${room ? ` - ${room}` : ''}] ${description}`;
          }

          const item: QuotationItem = {
            no: idx.no !== -1 ? cols[idx.no] : i.toString(),
            description: description,
            unit: cols[idx.unit] || 'หน่วย',
            quantity: qty,
            unitPrice: uPrice,
            laborCost: lPrice
          };

          rows.push(item);
          totalAmount += (qty * (uPrice + lPrice));
        }

        resolve({ rows, totalAmount });
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = () => reject(new Error("File reading error"));
    reader.readAsText(file);
  });
};

interface ProjectSetupStepProps {
  initialProject: ProjectData | null;
  onProjectCreated: (project: ProjectData, pricing: PricingConfig) => void;
}

function formatCurrency(v: number): string {
  return new Intl.NumberFormat('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);
}

const PROVINCES = [
  'กรุงเทพมหานคร', 'นนทบุรี', 'ปทุมธานี', 'สมุทรปราการ', 'นครปฐม',
  'ชลบุรี', 'ระยอง', 'เชียงใหม่', 'ขอนแก่น', 'นครราชสีมา',
  'ภูเก็ต', 'สุราษฎร์ธานี', 'หาดใหญ่/สงขลา', 'อุดรธานี', 'เชียงราย',
];

const PRICING_TIER_OPTIONS: Array<{ id: PricingTier; label: string; description: string }> = [
  { id: 'value', label: 'ประหยัด', description: 'เน้น baseline คุมงบ ใช้วัสดุเกรดคุ้มค่า' },
  { id: 'standard', label: 'มาตรฐาน', description: 'ชุดมาตรฐานสำหรับบ้านเสนอราคา owner ส่วนใหญ่' },
  { id: 'premium', label: 'พรีเมียม', description: 'อัปเกรดวัสดุและแรงสำหรับงานภาพรวมสูงขึ้น' },
];

function getPricingTierLabel(tier: PricingTier): string {
  return PRICING_TIER_OPTIONS.find((option) => option.id === tier)?.label || tier;
}

export function ProjectSetupStep({ initialProject, onProjectCreated }: ProjectSetupStepProps) {
  // Form state
  const [selectedTemplateId, setSelectedTemplateId] = useState(initialProject?.templateId || '');
  const [area, setArea] = useState(initialProject?.templateArea || 200);
  const [projectName, setProjectName] = useState(initialProject?.name || '');
  const [owner, setOwner] = useState(initialProject?.owner || '');
  const [phone, setPhone] = useState(initialProject?.phone || '');
  const [province, setProvince] = useState('');
  const [district, setDistrict] = useState('');
  const [address, setAddress] = useState(initialProject?.address || '');

  // BOQ Upload state
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadedBoq, setUploadedBoq] = useState<QuotationItem[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pricing
  const [markupPercent, setMarkupPercent] = useState(DEFAULT_PRICING.markupPercent);
  const [operatingPercent, setOperatingPercent] = useState(DEFAULT_PRICING.operatingPercent);
  const [vatEnabled, setVatEnabled] = useState(DEFAULT_PRICING.vatEnabled);
  const [pricingTier, setPricingTier] = useState<PricingTier>(initialProject?.templatePricingTier || 'standard');

  // Get templates
  const templates = useMemo(() => constructionTemplates, []);

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === selectedTemplateId),
    [templates, selectedTemplateId],
  );

  // Handle File Upload
  const uploadInProgress = useRef(false);
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (uploadInProgress.current) return;

    uploadInProgress.current = true;
    setIsProcessing(true);
    try {
      const result = await mockBoqIngest(file);
      setUploadedBoq(result.rows);
      setSelectedTemplateId('custom-upload'); // Mark as custom upload
      if (!projectName) setProjectName(file.name.replace(/\.[^/.]+$/, ""));
    } catch (error) {
      console.error("Failed to parse BOQ:", error);
      toast.error("ไม่สามารถอ่านไฟล์ได้ กรุณาลองใหม่อีกครั้ง");
    } finally {
      uploadInProgress.current = false;
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Preview pricing
  const previewResult = useMemo(() => {
    if (uploadedBoq) {
      return {
        quotationData: uploadedBoq,
        priceReference: {
          seriesLabel: 'ไฟล์ที่อัปโหลด',
          updatedAt: new Date().toLocaleDateString('th-TH'),
          coveragePercent: 100,
          matchedItems: uploadedBoq.length,
          totalItems: uploadedBoq.length
        }
      };
    }
    if (!selectedTemplate) return null;
    try {
      const tempInput = {
        templateId: selectedTemplate.id,
        projectName: projectName || 'Preview',
        projectAddress: address || '-',
        projectPhone: phone || '-',
        projectOwner: owner || '-',
        area,
        budget: 0,
        pricingTier,
      };
      return generateProjectFromTemplate(tempInput);
    } catch {
      return null;
    }
  }, [selectedTemplate, area, projectName, address, phone, owner, pricingTier, uploadedBoq]);

  const previewPricing = useMemo(() => {
    if (!previewResult) return null;
    const config: PricingConfig = {
      ...DEFAULT_PRICING,
      markupPercent,
      operatingPercent,
      vatEnabled,
    };
    return calculatePricing(previewResult.quotationData as QuotationItem[], config);
  }, [previewResult, markupPercent, operatingPercent, vatEnabled]);

  const stripHtml = (str: string) => str.replace(/<[^>]*>/g, '');
  const MAX_NAME_LENGTH = 200;

  const canCreate = (selectedTemplateId || uploadedBoq) && projectName.trim() && owner.trim() && (uploadedBoq ? true : area > 0);

  const handleCreate = useCallback(() => {
    if (!canCreate) return;

    const sanitizedName = stripHtml(projectName).slice(0, MAX_NAME_LENGTH);
    const sanitizedOwner = stripHtml(owner).slice(0, MAX_NAME_LENGTH);

    const fullAddress = [address, district, province].filter(Boolean).join(', ');

    let project: ProjectData | null = null;

    if (uploadedBoq) {
      project = {
        id: `proj-${Date.now()}`,
        name: sanitizedName,
        address: fullAddress || '-',
        phone: phone || '-',
        owner: sanitizedOwner,
        quotationData: uploadedBoq,
        templateId: 'custom-upload',
        status: 'active'
      };
    } else if (selectedTemplate) {
      const input = {
        templateId: selectedTemplate.id,
        projectName: sanitizedName,
        projectAddress: fullAddress || '-',
        projectPhone: phone || '-',
        projectOwner: sanitizedOwner,
        area,
        budget: 0,
        pricingTier,
      };
      project = createProjectFromTemplate(input);
    }

    if (!project) return;

    const pricingConfig: PricingConfig = {
      ...DEFAULT_PRICING,
      markupPercent,
      operatingPercent,
      vatEnabled,
    };

    onProjectCreated(project, pricingConfig);
  }, [selectedTemplate, canCreate, projectName, owner, phone, address, district, province, area, pricingTier, markupPercent, operatingPercent, vatEnabled, onProjectCreated, uploadedBoq]);

  return (
    <div className="space-y-6">
      {/* ── Template Selection ─────────────────────── */}
      <section>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <h2 className="text-base font-semibold text-slate-800">เลือก Template</h2>
          
          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".xlsx, .xls, .csv"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
                ${isProcessing 
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-sm'
                }
              `}
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              {isProcessing ? 'Processing...' : 'Upload Excel/BOQ'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {uploadedBoq && (
            <button
              onClick={() => setSelectedTemplateId('custom-upload')}
              className={`
                text-left p-4 rounded-xl border-2 transition-all
                ${selectedTemplateId === 'custom-upload'
                  ? 'border-emerald-500 bg-emerald-50 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-slate-300'
                }
              `}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">📊</span>
                <span className="text-sm font-semibold text-slate-800">BOQ จากไฟล์อัปโหลด</span>
              </div>
              <p className="text-xs text-slate-500">ใช้ข้อมูลจากไฟล์ที่คุณเลือก</p>
              <p className="text-xs text-emerald-600 mt-1 font-medium">
                {uploadedBoq.length} รายการ | พร้อมใช้งาน
              </p>
            </button>
          )}

          {templates.map((tmpl) => {
            const isSelected = selectedTemplateId === tmpl.id;
            return (
              <button
                key={tmpl.id}
                onClick={() => {
                  setSelectedTemplateId(tmpl.id);
                  setUploadedBoq(null); // Clear upload if template is chosen
                }}
                className={`
                  text-left rounded-xl border-2 transition-all overflow-hidden
                  ${isSelected
                    ? 'border-blue-500 bg-blue-50 shadow-md ring-2 ring-blue-200'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                  }
                `}
              >
                {tmpl.coverImage && (
                  <div className="relative w-full h-32 bg-slate-100">
                    <img
                      src={tmpl.coverImage}
                      alt={tmpl.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    {isSelected && (
                      <div className="absolute top-2 right-2 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                        <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </div>
                )}
                <div className="p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-base">{tmpl.icon || '🏠'}</span>
                    <span className="text-sm font-semibold text-slate-800">{tmpl.name}</span>
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-2">{tmpl.description}</p>
                  <p className="text-xs text-slate-400 mt-1.5">
                    {tmpl.minArea}-{tmpl.maxArea} ตร.ม. | {tmpl.categories.length} หมวดงาน
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Area + Pricing ─────────────────────────── */}
      {(selectedTemplate || uploadedBoq) && (
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Project info */}
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-slate-800">ข้อมูลโปรเจค</h2>

            {!uploadedBoq && selectedTemplate && (
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">พื้นที่ (ตร.ม.)</label>
                <input
                  type="number"
                  value={area}
                  onChange={(e) => setArea(Math.max(1, Number(e.target.value)))}
                  min={selectedTemplate.minArea}
                  max={selectedTemplate.maxArea}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-400 focus:outline-none"
                />
                <p className="text-xs text-slate-400 mt-1">
                  แนะนำ: {selectedTemplate.minArea} - {selectedTemplate.maxArea} ตร.ม.
                </p>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">ชื่อโปรเจค</label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="เช่น บ้านคุณสมชาย รังสิต"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">ผู้ว่าจ้าง / ลูกค้า</label>
              <input
                type="text"
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                placeholder="ชื่อ-นามสกุล"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">เบอร์โทร</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="081-234-5678"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-400 focus:outline-none"
              />
            </div>

            {/* Location */}
            <div className="space-y-3">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-slate-500" />
                <label className="text-xs font-medium text-slate-600">Location หน้างาน</label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">จังหวัด</label>
                  <select
                    value={province}
                    onChange={(e) => setProvince(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-400 focus:outline-none bg-white"
                  >
                    <option value="">เลือกจังหวัด</option>
                    {PROVINCES.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-slate-500 mb-1">เขต/อำเภอ</label>
                  <input
                    type="text"
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    placeholder="เช่น ลำลูกกา"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-400 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-500 mb-1">ที่อยู่หน้างาน</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="เช่น 123/45 หมู่ 6 ต.บึงคำพร้อย"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-400 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Right: Pricing summary */}
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-slate-800">ตั้งค่าราคา</h2>

            <div className="bg-slate-50 rounded-xl p-4 space-y-3">
              <div>
                <label className="block text-xs text-slate-500 mb-2">ระดับวัสดุอ้างอิง</label>
                <div className="grid gap-2 sm:grid-cols-3">
                  {PRICING_TIER_OPTIONS.map((option) => {
                    const active = pricingTier === option.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setPricingTier(option.id)}
                        className={`rounded-xl border px-3 py-3 text-left transition ${
                          active
                            ? 'border-blue-500 bg-blue-50 text-blue-900'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <p className="text-sm font-semibold">{option.label}</p>
                        <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{option.description}</p>
                      </button>
                    );
                  })}
                </div>
                {previewResult && (
                  <p className="mt-2 text-xs text-slate-500">
                    อ้างอิง {previewResult.priceReference.seriesLabel} ตรวจล่าสุด {previewResult.priceReference.updatedAt} ครอบคลุม {previewResult.priceReference.coveragePercent}% ของ BOQ template
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">กำไร (%)</label>
                  <input
                    type="number"
                    value={markupPercent}
                    onChange={(e) => setMarkupPercent(Math.max(0, Number(e.target.value)))}
                    min={0}
                    max={100}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-400 focus:outline-none bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">ค่าดำเนินงาน (%)</label>
                  <input
                    type="number"
                    value={operatingPercent}
                    onChange={(e) => setOperatingPercent(Math.max(0, Number(e.target.value)))}
                    min={0}
                    max={100}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-400 focus:outline-none bg-white"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={vatEnabled}
                  onChange={(e) => setVatEnabled(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                รวม VAT 7%
              </label>
            </div>

            {/* Pricing Preview */}
            {previewPricing && (
              <div className="border border-slate-200 rounded-xl p-4 space-y-2 bg-white">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">สรุปประมาณการ</h3>

                <div className="space-y-1.5 text-sm">
                  {previewResult && (
                    <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-[11px] text-slate-600">
                      <span className="font-semibold text-slate-800">ฐานราคา:</span> {previewResult.priceReference.seriesLabel} • {getPricingTierLabel(pricingTier)} • matched {previewResult.priceReference.matchedItems}/{previewResult.priceReference.totalItems}
                    </div>
                  )}
                  <div className="flex justify-between text-slate-600">
                    <span>ค่าวัสดุ</span>
                    <span className="font-mono">{formatCurrency(previewPricing.costMaterial)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>ค่าแรง</span>
                    <span className="font-mono">{formatCurrency(previewPricing.costLabor)}</span>
                  </div>
                  <div className="flex justify-between text-slate-500 text-xs border-t border-dashed border-slate-200 pt-1.5">
                    <span>ต้นทุนรวม</span>
                    <span className="font-mono">{formatCurrency(previewPricing.costTotal)}</span>
                  </div>
                  {previewPricing.markup > 0 && (
                    <div className="flex justify-between text-emerald-600">
                      <span>กำไร {markupPercent}%</span>
                      <span className="font-mono">+{formatCurrency(previewPricing.markup)}</span>
                    </div>
                  )}
                  {previewPricing.operating > 0 && (
                    <div className="flex justify-between text-slate-500">
                      <span>ค่าดำเนินงาน {operatingPercent}%</span>
                      <span className="font-mono">+{formatCurrency(previewPricing.operating)}</span>
                    </div>
                  )}
                  {previewPricing.vat > 0 && (
                    <div className="flex justify-between text-slate-500">
                      <span>VAT 7%</span>
                      <span className="font-mono">+{formatCurrency(previewPricing.vat)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-900 font-semibold text-base border-t border-slate-200 pt-2">
                    <span>ราคาเสนอลูกค้า</span>
                    <span className="font-mono text-blue-700">{formatCurrency(previewPricing.sellingTotal)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-emerald-600">
                    <span>Margin</span>
                    <span>{previewPricing.marginPercent}%</span>
                  </div>
                </div>
              </div>
            )}

            {/* Create button */}
            <button
              onClick={handleCreate}
              disabled={!canCreate}
              className={`
                w-full py-3 rounded-xl text-sm font-semibold transition-all
                ${canCreate
                  ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                }
              `}
            >
              สร้างโปรเจคและเอกสารทั้งหมด
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
