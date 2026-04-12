import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ClipboardList,
  Copy,
  ExternalLink,
  Loader2,
  MessageSquareQuote,
  PhoneCall,
  Save,
  Store,
  Truck,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  describeQuoteChannel,
  getVendorCoverageLabel,
  type QuoteIntakeChannel,
} from '../../utils/rfqMarketplace';
import { getCategoryName, type ShopVendor } from '../../utils/shopCatalog';
import type {
  ShopRfqRecord,
  ShopVendorQuoteRecord,
  ShopVendorQuoteStatus,
  VendorQuoteUpdateInput,
} from '../../utils/shopCloud';

interface VendorQuotePortalProps {
  rfqs: ShopRfqRecord[];
  vendors: ShopVendor[];
  currentRfqId?: string;
  currentVendorId?: string;
  busyRfqId?: string | null;
  isCloudMode: boolean;
  onOpenInbox: () => void;
  onOpenVendorContext: (rfqId: string, vendorId: string) => void;
  onSaveVendorQuote: (rfq: ShopRfqRecord, vendorId: string, input: VendorQuoteUpdateInput) => void | Promise<void>;
}

interface QuoteFormDraft {
  channel: QuoteIntakeChannel;
  materialSubtotal: string;
  shippingFee: string;
  etaDays: string;
  status: ShopVendorQuoteStatus;
  notes: string;
}

function parseNumber(value: string, fallback = 0): number {
  const parsed = Number(value.replace(/,/g, '').trim());
  return Number.isFinite(parsed) ? parsed : fallback;
}

function createDraftFromQuote(quote: ShopVendorQuoteRecord): QuoteFormDraft {
  return {
    channel: quote.channel,
    materialSubtotal: String(Math.round(quote.materialSubtotal)),
    shippingFee: String(Math.round(quote.shippingFee)),
    etaDays: String(Math.max(1, quote.etaDays)),
    status: quote.status === 'awarded' ? 'received' : quote.status,
    notes: quote.notes || '',
  };
}

function buildShareLink(rfqId: string, vendorId: string): string {
  if (typeof window === 'undefined') {
    return `/shop/vendor/${encodeURIComponent(rfqId)}/${encodeURIComponent(vendorId)}`;
  }

  return `${window.location.origin}${window.location.pathname}#/shop/vendor/${encodeURIComponent(rfqId)}/${encodeURIComponent(vendorId)}`;
}

function buildGenericVendorLink(vendor: ShopVendor | null): string | null {
  if (!vendor) return null;
  return vendor.responseFormUrl || null;
}

export function VendorQuotePortal({
  rfqs,
  vendors,
  currentRfqId,
  currentVendorId,
  busyRfqId,
  isCloudMode,
  onOpenInbox,
  onOpenVendorContext,
  onSaveVendorQuote,
}: VendorQuotePortalProps) {
  const selectedRfq = useMemo(
    () => rfqs.find((rfq) => rfq.id === currentRfqId) || rfqs[0] || null,
    [currentRfqId, rfqs],
  );

  const availableQuotes = selectedRfq?.vendorQuotes || [];
  const selectedQuote = useMemo(
    () => availableQuotes.find((quote) => quote.vendorId === currentVendorId) || availableQuotes[0] || null,
    [availableQuotes, currentVendorId],
  );

  const selectedVendor = useMemo(
    () => vendors.find((vendor) => vendor.id === selectedQuote?.vendorId) || null,
    [selectedQuote?.vendorId, vendors],
  );

  const [draft, setDraft] = useState<QuoteFormDraft | null>(selectedQuote ? createDraftFromQuote(selectedQuote) : null);

  useEffect(() => {
    setDraft(selectedQuote ? createDraftFromQuote(selectedQuote) : null);
  }, [selectedQuote?.channel, selectedQuote?.etaDays, selectedQuote?.materialSubtotal, selectedQuote?.notes, selectedQuote?.respondedAt, selectedQuote?.shippingFee, selectedQuote?.status, selectedQuote?.vendorId]);

  const shareLink = selectedRfq && selectedQuote
    ? buildShareLink(selectedRfq.id, selectedQuote.vendorId)
    : '';
  const genericVendorLink = buildGenericVendorLink(selectedVendor);

  const busy = busyRfqId === selectedRfq?.id;
  const estimatedLines = selectedRfq?.purchaseList.lines.slice(0, 6) || [];

  const handleCopyLink = async () => {
    if (!shareLink) return;
    try {
      await navigator.clipboard.writeText(shareLink);
      toast.success('คัดลอกลิงก์ vendor portal แล้ว');
    } catch {
      toast.error('คัดลอกลิงก์ไม่สำเร็จ');
    }
  };

  const handleSave = async () => {
    if (!selectedRfq || !selectedQuote || !draft) return;

    await onSaveVendorQuote(selectedRfq, selectedQuote.vendorId, {
      channel: draft.channel,
      materialSubtotal: parseNumber(draft.materialSubtotal, selectedQuote.materialSubtotal),
      shippingFee: parseNumber(draft.shippingFee, selectedQuote.shippingFee),
      etaDays: Math.max(1, parseNumber(draft.etaDays, selectedQuote.etaDays)),
      status: draft.status,
      notes: draft.notes,
    });
  };

  if (rfqs.length === 0) {
    return (
      <section className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-slate-100 text-slate-500">
          <Store className="h-7 w-7" />
        </div>
        <h2 className="mt-4 text-xl font-semibold text-slate-900">ยังไม่มี RFQ ให้เปิด vendor portal</h2>
        <p className="mt-2 text-sm text-slate-500">
          สร้าง RFQ จาก BOQ ก่อน แล้วค่อยเปิดฟอร์มรับราคาจริงรายร้านจากหน้า RFQ Inbox
        </p>
        <button
          onClick={onOpenInbox}
          className="mt-5 inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
          กลับไป RFQ Inbox
        </button>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Vendor Portal</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">ฟอร์มรับราคาจริงรายร้าน</h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-500">
              ใช้หน้านี้ตอนแอดมินคีย์ราคากลับ, แชร์ลิงก์ให้ทีมขายร้าน, หรือเปิดเทียบ landed cost แบบโฟกัส vendor เดียวโดยไม่ต้องเลื่อนทั้ง inbox
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-medium ${
              isCloudMode ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
            }`}>
              {isCloudMode ? 'บันทึกขึ้นระบบกลางทันที' : 'บันทึกชั่วคราวในเครื่องนี้'}
            </span>
            <button
              onClick={onOpenInbox}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" />
              กลับไป RFQ Inbox
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1 text-sm text-slate-500">
                <span>เลือกรอบ RFQ</span>
                <select
                  value={selectedRfq?.id || ''}
                  onChange={(event) => {
                    const nextRfq = rfqs.find((rfq) => rfq.id === event.target.value);
                    const nextVendorId = nextRfq?.vendorQuotes[0]?.vendorId;
                    if (nextRfq && nextVendorId) {
                      onOpenVendorContext(nextRfq.id, nextVendorId);
                    }
                  }}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-slate-400"
                >
                  {rfqs.map((rfq) => (
                    <option key={rfq.id} value={rfq.id}>
                      {rfq.projectName} • {rfq.id}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-sm text-slate-500">
                <span>เลือกร้านวัสดุ</span>
                <select
                  value={selectedQuote?.vendorId || ''}
                  onChange={(event) => {
                    if (selectedRfq && event.target.value) {
                      onOpenVendorContext(selectedRfq.id, event.target.value);
                    }
                  }}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-slate-400"
                >
                  {availableQuotes.map((quote) => (
                    <option key={quote.vendorId} value={quote.vendorId}>
                      {quote.vendorName}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {selectedRfq && selectedQuote && draft && (
              <>
                <div className="mt-5 flex flex-wrap items-start justify-between gap-4 rounded-2xl bg-slate-50 p-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-400">RFQ Context</p>
                    <h3 className="mt-2 text-xl font-semibold text-slate-900">{selectedRfq.projectName}</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      {selectedRfq.purchaseList.lines.length} รายการซื้อ • ประมาณการวัสดุ ฿{selectedRfq.purchaseList.estimatedSubtotal.toLocaleString('th-TH')}
                    </p>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="rounded-2xl bg-white px-4 py-3">
                      <p className="text-xs text-slate-500">Vendor portal link</p>
                      <button
                        onClick={() => void handleCopyLink()}
                        className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-emerald-700 transition hover:text-emerald-800"
                      >
                        <Copy className="h-4 w-4" />
                        คัดลอกลิงก์รอบนี้
                      </button>
                    </div>
                    <div className="rounded-2xl bg-white px-4 py-3">
                      <p className="text-xs text-slate-500">ช่องทางปัจจุบัน</p>
                      <p className="mt-2 text-sm font-medium text-slate-900">{describeQuoteChannel(selectedQuote.channel)}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Vendor Response Form</p>
                      <h3 className="mt-2 text-lg font-semibold text-slate-900">{selectedQuote.vendorName}</h3>
                      <p className="mt-1 text-sm text-slate-500">{getVendorCoverageLabel(selectedQuote.vendorId)}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 px-4 py-3 text-right">
                      <p className="text-xs text-slate-500">Landed cost ล่าสุด</p>
                      <p className="mt-2 text-2xl font-semibold text-emerald-700">
                        ฿{(parseNumber(draft.materialSubtotal) + parseNumber(draft.shippingFee)).toLocaleString('th-TH')}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <label className="space-y-1 text-xs text-slate-500">
                      <span>ช่องทางรับราคา</span>
                      <select
                        value={draft.channel}
                        onChange={(event) => setDraft((current) => current ? { ...current, channel: event.target.value as QuoteIntakeChannel } : current)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-slate-400"
                      >
                        <option value="line_oa">LINE OA / แชต</option>
                        <option value="google_form">Google Form</option>
                        <option value="admin_call">โทรกลับ / คีย์หลังบ้าน</option>
                      </select>
                    </label>
                    <label className="space-y-1 text-xs text-slate-500">
                      <span>สถานะร้าน</span>
                      <select
                        value={draft.status}
                        onChange={(event) => setDraft((current) => current ? { ...current, status: event.target.value as ShopVendorQuoteStatus } : current)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-slate-400"
                      >
                        <option value="requested">รอตอบกลับ</option>
                        <option value="received">ได้รับราคาแล้ว</option>
                        <option value="declined">ปฏิเสธ / ของไม่พร้อม</option>
                      </select>
                    </label>
                    <label className="space-y-1 text-xs text-slate-500">
                      <span>ค่าวัสดุรวม</span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={draft.materialSubtotal}
                        onChange={(event) => setDraft((current) => current ? { ...current, materialSubtotal: event.target.value } : current)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-slate-400"
                      />
                    </label>
                    <label className="space-y-1 text-xs text-slate-500">
                      <span>ค่าส่ง</span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={draft.shippingFee}
                        onChange={(event) => setDraft((current) => current ? { ...current, shippingFee: event.target.value } : current)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-slate-400"
                      />
                    </label>
                    <label className="space-y-1 text-xs text-slate-500">
                      <span>ETA (วัน)</span>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={draft.etaDays}
                        onChange={(event) => setDraft((current) => current ? { ...current, etaDays: event.target.value } : current)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-slate-400"
                      />
                    </label>
                    <div className="rounded-2xl bg-slate-50 px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Quote Snapshot</p>
                      <div className="mt-2 space-y-1 text-sm text-slate-600">
                        <p>วัสดุ: ฿{parseNumber(draft.materialSubtotal).toLocaleString('th-TH')}</p>
                        <p>ค่าส่ง: ฿{parseNumber(draft.shippingFee).toLocaleString('th-TH')}</p>
                        <p>ETA: {Math.max(1, parseNumber(draft.etaDays, 1))} วัน</p>
                      </div>
                    </div>
                  </div>

                  <label className="mt-4 block space-y-1 text-xs text-slate-500">
                    <span>หมายเหตุ</span>
                    <textarea
                      rows={4}
                      value={draft.notes}
                      onChange={(event) => setDraft((current) => current ? { ...current, notes: event.target.value } : current)}
                      placeholder="เช่น ของเข้าอีก 2 วัน, รวมยกของ, ขอรอบส่งเช้า, บางรายการใช้แบรนด์เทียบ"
                      className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                    />
                  </label>

                  <div className="mt-5 flex flex-wrap gap-2">
                    <button
                      onClick={() => void handleSave()}
                      disabled={busy}
                      className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
                    >
                      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      บันทึกราคาจริง
                    </button>
                    <button
                      onClick={() => setDraft(createDraftFromQuote(selectedQuote))}
                      className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                      รีเซ็ตค่าฟอร์ม
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {selectedRfq && (
            <div className="rounded-3xl border border-slate-200 bg-white p-6">
              <div className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-slate-500" />
                <h3 className="text-lg font-semibold text-slate-900">รายการซื้อที่เกี่ยวข้อง</h3>
              </div>
              <div className="mt-4 space-y-3">
                {estimatedLines.map((line) => (
                  <div key={line.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900">{line.description}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {line.boqNo} • {line.quantity} {line.unit} • {line.status}
                        </p>
                      </div>
                      <div className="text-right text-xs text-slate-500">
                        <p>ประมาณการ</p>
                        <p className="mt-1 font-semibold text-slate-900">
                          ฿{Math.round(line.estimatedAmount || 0).toLocaleString('th-TH')}
                        </p>
                      </div>
                    </div>
                    {line.note && <p className="mt-2 text-xs text-slate-500">{line.note}</p>}
                  </div>
                ))}
                {selectedRfq.purchaseList.lines.length > estimatedLines.length && (
                  <p className="text-xs text-slate-400">
                    และอีก {selectedRfq.purchaseList.lines.length - estimatedLines.length} รายการใน purchase list
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <aside className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6">
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Vendor Profile</p>
            {selectedVendor ? (
              <>
                <div className="mt-3">
                  <h3 className="text-lg font-semibold text-slate-900">{selectedVendor.name}</h3>
                  <p className="mt-1 text-sm text-slate-500">{selectedVendor.address}</p>
                </div>
                <div className="mt-4 space-y-3 text-sm text-slate-600">
                  <div className="flex items-center gap-2">
                    <PhoneCall className="h-4 w-4 text-slate-400" />
                    {selectedVendor.phone}
                  </div>
                  <div className="flex items-center gap-2">
                    <Truck className="h-4 w-4 text-slate-400" />
                    รัศมี {selectedVendor.deliveryRadiusKm} กม. • ETA ปกติ {selectedVendor.deliveryEtaDays} วัน
                  </div>
                  <div className="flex items-center gap-2">
                    <MessageSquareQuote className="h-4 w-4 text-slate-400" />
                    LINE: {selectedVendor.lineId}
                  </div>
                  {selectedVendor.paymentTerms && (
                    <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Payment Terms</p>
                      <p className="mt-2">{selectedVendor.paymentTerms}</p>
                    </div>
                  )}
                  {typeof selectedVendor.minimumOrderValue === 'number' && (
                    <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Minimum Order</p>
                      <p className="mt-2">฿{selectedVendor.minimumOrderValue.toLocaleString('th-TH')}</p>
                    </div>
                  )}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {selectedVendor.lineOaUrl && (
                    <a
                      href={selectedVendor.lineOaUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                      <ExternalLink className="h-4 w-4" />
                      เปิด LINE OA
                    </a>
                  )}
                  {genericVendorLink && (
                    <a
                      href={genericVendorLink}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                      <ExternalLink className="h-4 w-4" />
                      เปิด generic form
                    </a>
                  )}
                </div>
                {selectedVendor.serviceAreas && selectedVendor.serviceAreas.length > 0 && (
                  <div className="mt-5">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Service Areas</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {selectedVendor.serviceAreas.map((area) => (
                        <span key={area} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                          {area}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {selectedVendor.supportedCategoryIds && selectedVendor.supportedCategoryIds.length > 0 && (
                  <div className="mt-5">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Supported Categories</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {selectedVendor.supportedCategoryIds.map((categoryId) => (
                        <span key={categoryId} className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                          {getCategoryName(categoryId)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="mt-3 text-sm text-slate-500">เลือกร้านจาก dropdown เพื่อดูข้อมูล vendor เพิ่มเติม</p>
            )}
          </div>

          {selectedQuote && (
            <div className="rounded-3xl border border-slate-200 bg-white p-6">
              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Current Quote Snapshot</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                  <p className="text-xs text-slate-500">ช่องทางล่าสุด</p>
                  <p className="mt-2 text-sm font-medium text-slate-900">{describeQuoteChannel(selectedQuote.channel)}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                  <p className="text-xs text-slate-500">ค่าส่ง / ETA</p>
                  <p className="mt-2 text-sm font-medium text-slate-900">
                    ฿{selectedQuote.shippingFee.toLocaleString('th-TH')} • {selectedQuote.etaDays} วัน
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                  <p className="text-xs text-slate-500">Coverage</p>
                  <p className="mt-2 text-sm font-medium text-slate-900">{getVendorCoverageLabel(selectedQuote.vendorId)}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                  <p className="text-xs text-slate-500">Rank ปัจจุบัน</p>
                  <p className="mt-2 text-sm font-medium text-slate-900">#{selectedQuote.rank}</p>
                </div>
              </div>
            </div>
          )}
        </aside>
      </section>
    </div>
  );
}
