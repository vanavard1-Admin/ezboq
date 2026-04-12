import { useState } from 'react';
import {
  CircleCheckBig,
  ClipboardList,
  Loader2,
  MessageSquareQuote,
  PencilLine,
  PhoneCall,
  Save,
  Store,
  Truck,
  X,
} from 'lucide-react';
import {
  describeQuoteChannel,
  getVendorCoverageLabel,
  type QuoteIntakeChannel,
} from '../../utils/rfqMarketplace';
import type {
  ShopRfqRecord,
  ShopVendorQuoteRecord,
  ShopVendorQuoteStatus,
  VendorQuoteUpdateInput,
} from '../../utils/shopCloud';

interface RfqInboxProps {
  rfqs: ShopRfqRecord[];
  currentProjectName?: string;
  busyRfqId?: string | null;
  isCloudMode: boolean;
  onCreateRfq: () => void;
  onMarkQuoted: (rfq: ShopRfqRecord) => void;
  onSaveVendorQuote: (rfq: ShopRfqRecord, vendorId: string, input: VendorQuoteUpdateInput) => void | Promise<void>;
  onAwardVendor: (rfq: ShopRfqRecord, vendorId: string) => void;
  onCloseRfq: (rfq: ShopRfqRecord) => void;
  onOpenVendorPortal?: (rfqId: string, vendorId: string) => void;
}

interface QuoteFormDraft {
  channel: QuoteIntakeChannel;
  materialSubtotal: string;
  shippingFee: string;
  etaDays: string;
  status: ShopVendorQuoteStatus;
  notes: string;
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function statusBadge(status: ShopRfqRecord['status']): string {
  switch (status) {
    case 'requested':
      return 'bg-amber-100 text-amber-700';
    case 'quoted':
      return 'bg-sky-100 text-sky-700';
    case 'awarded':
      return 'bg-emerald-100 text-emerald-700';
    case 'closed':
      return 'bg-slate-200 text-slate-700';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}

function statusLabel(status: ShopRfqRecord['status']): string {
  switch (status) {
    case 'requested':
      return 'รอราคากลับ';
    case 'quoted':
      return 'มีราคากลับแล้ว';
    case 'awarded':
      return 'เลือกเจ้าแล้ว';
    case 'closed':
      return 'ปิด RFQ แล้ว';
    default:
      return status;
  }
}

function vendorStatusLabel(status: ShopVendorQuoteStatus): string {
  switch (status) {
    case 'requested':
      return 'รอตอบกลับ';
    case 'received':
      return 'ได้รับราคาแล้ว';
    case 'awarded':
      return 'ได้งาน';
    case 'declined':
      return 'ปฏิเสธ';
    default:
      return status;
  }
}

function vendorStatusBadge(status: ShopVendorQuoteStatus): string {
  switch (status) {
    case 'received':
      return 'bg-sky-100 text-sky-700';
    case 'awarded':
      return 'bg-emerald-100 text-emerald-700';
    case 'declined':
      return 'bg-rose-100 text-rose-700';
    default:
      return 'bg-slate-100 text-slate-600';
  }
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

function parseNumber(value: string, fallback = 0): number {
  const parsed = Number(value.replace(/,/g, '').trim());
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function RfqInbox({
  rfqs,
  currentProjectName,
  busyRfqId,
  isCloudMode,
  onCreateRfq,
  onMarkQuoted,
  onSaveVendorQuote,
  onAwardVendor,
  onCloseRfq,
  onOpenVendorPortal,
}: RfqInboxProps) {
  const [editingQuoteKey, setEditingQuoteKey] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, QuoteFormDraft>>({});

  const openQuoteEditor = (rfqId: string, quote: ShopVendorQuoteRecord) => {
    const key = `${rfqId}:${quote.vendorId}`;
    setEditingQuoteKey(key);
    setDrafts((current) => (
      current[key]
        ? current
        : { ...current, [key]: createDraftFromQuote(quote) }
    ));
  };

  const updateDraft = (key: string, patch: Partial<QuoteFormDraft>) => {
    setDrafts((current) => ({
      ...current,
      [key]: {
        ...(current[key] || {
          channel: 'admin_call',
          materialSubtotal: '0',
          shippingFee: '0',
          etaDays: '1',
          status: 'requested',
          notes: '',
        }),
        ...patch,
      },
    }));
  };

  const handleSaveDraft = async (rfq: ShopRfqRecord, quote: ShopVendorQuoteRecord) => {
    const key = `${rfq.id}:${quote.vendorId}`;
    const draft = drafts[key] || createDraftFromQuote(quote);
    await onSaveVendorQuote(rfq, quote.vendorId, {
      channel: draft.channel,
      materialSubtotal: parseNumber(draft.materialSubtotal, quote.materialSubtotal),
      shippingFee: parseNumber(draft.shippingFee, quote.shippingFee),
      etaDays: Math.max(1, parseNumber(draft.etaDays, quote.etaDays)),
      status: draft.status,
      notes: draft.notes,
    });
    setEditingQuoteKey(null);
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">RFQ Inbox</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">คุมรอบขอราคาแบบ no-API จากหน้าเดียว</h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-500">
              สร้าง RFQ จาก BOQ, ยิงไปยังร้านในรัศมีที่เหมาะกับ order size, ตามราคากลับผ่าน LINE / ฟอร์ม / โทรกลับ,
              แล้วเลือกเจ้าที่ landed cost เหมาะสุดได้จากหน้านี้
              {currentProjectName ? ` ตอนนี้อ้างอิงโครงการ "${currentProjectName}"` : ''}
            </p>
          </div>
          <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
            <span className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-medium ${
              isCloudMode ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
            }`}>
              {isCloudMode ? 'ซิงก์ RFQ กับระบบกลาง' : 'ใช้ RFQ ชั่วคราวในเครื่องนี้'}
            </span>
            <button
              onClick={onCreateRfq}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-emerald-700"
            >
              <ClipboardList className="h-4 w-4" />
              สร้าง RFQ จาก BOQ ปัจจุบัน
            </button>
          </div>
        </div>
      </section>

      {rfqs.length === 0 ? (
        <section className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-slate-100 text-slate-500">
            <MessageSquareQuote className="h-7 w-7" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-slate-900">ยังไม่มี RFQ ใน inbox</h3>
          <p className="mt-2 text-sm text-slate-500">
            เริ่มจากกดสร้าง RFQ จาก BOQ เพื่อให้ระบบแปลง purchase list, เลือกร้าน, และสร้างรอบขอราคาให้พร้อมติดตาม
          </p>
        </section>
      ) : (
        <div className="space-y-5">
          {rfqs.map((rfq) => {
            const isBusy = busyRfqId === rfq.id;
            const bestQuote = rfq.vendorQuotes
              .filter((quote) => quote.status !== 'declined')
              .sort((left, right) => left.landedCost - right.landedCost)[0];
            const awardedVendorId = rfq.awardedVendorId || rfq.vendorQuotes.find((quote) => quote.status === 'awarded')?.vendorId;

            return (
              <section key={rfq.id} className="rounded-3xl border border-slate-200 bg-white p-6">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-slate-500">
                        {rfq.id}
                      </span>
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${statusBadge(rfq.status)}`}>
                        {statusLabel(rfq.status)}
                      </span>
                    </div>
                    <h3 className="mt-3 text-xl font-semibold text-slate-900">{rfq.title}</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      {rfq.projectName} • สร้างโดย {rfq.createdByName} • อัปเดตล่าสุด {formatDateTime(rfq.updatedAt)}
                    </p>
                    {rfq.notes && <p className="mt-2 text-sm text-slate-500">{rfq.notes}</p>}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[360px]">
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs text-slate-500">รายการซื้อ</p>
                      <p className="mt-2 text-2xl font-semibold text-slate-900">{rfq.purchaseList.lines.length}</p>
                      <p className="mt-1 text-xs text-slate-500">match {rfq.purchaseList.matchedLines} / review {rfq.purchaseList.reviewLines}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs text-slate-500">ร้านที่ยิง</p>
                      <p className="mt-2 text-2xl font-semibold text-slate-900">{rfq.vendorQuotes.length}</p>
                      <p className="mt-1 text-xs text-slate-500">รัศมี {rfq.searchRadiusKm} กม.</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs text-slate-500">ประมาณการวัสดุ</p>
                      <p className="mt-2 text-2xl font-semibold text-emerald-700">฿{rfq.purchaseList.estimatedSubtotal.toLocaleString('th-TH')}</p>
                      <p className="mt-1 text-xs text-slate-500">ก่อนค่าส่ง</p>
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
                  {rfq.vendorQuotes.map((quote) => {
                    const isAwarded = awardedVendorId === quote.vendorId;
                    const isRecommended = rfq.recommendedVendorId === quote.vendorId && !isAwarded;
                    const editorKey = `${rfq.id}:${quote.vendorId}`;
                    const isEditing = editingQuoteKey === editorKey;
                    const form = drafts[editorKey] || createDraftFromQuote(quote);

                    return (
                      <div
                        key={`${rfq.id}-${quote.vendorId}`}
                        className={`rounded-2xl border p-4 ${
                          isAwarded
                            ? 'border-emerald-300 bg-emerald-50'
                            : 'border-slate-200 bg-slate-50'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <Store className="h-4 w-4 text-slate-500" />
                              <p className="font-semibold text-slate-900">{quote.vendorName}</p>
                            </div>
                            <p className="mt-1 text-xs text-slate-500">{getVendorCoverageLabel(quote.vendorId)}</p>
                          </div>
                          <div className="flex flex-wrap items-center justify-end gap-1.5">
                            <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${vendorStatusBadge(quote.status)}`}>
                              {vendorStatusLabel(quote.status)}
                            </span>
                            {isRecommended && (
                              <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-emerald-700">
                                ต่ำสุดตอนนี้
                              </span>
                            )}
                            {isAwarded && (
                              <span className="rounded-full bg-emerald-600 px-2.5 py-1 text-[11px] font-medium text-white">
                                Selected
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="mt-3 space-y-2 text-xs text-slate-500">
                          <div className="flex items-center gap-2">
                            <MessageSquareQuote className="h-3.5 w-3.5" />
                            {describeQuoteChannel(quote.channel)}
                          </div>
                          <div className="flex items-center gap-2">
                            <Truck className="h-3.5 w-3.5" />
                            ETA {quote.etaDays} วัน • ค่าส่ง ฿{quote.shippingFee.toLocaleString('th-TH')}
                          </div>
                          <div className="flex items-center gap-2">
                            <PhoneCall className="h-3.5 w-3.5" />
                            สถานะร้าน: {vendorStatusLabel(quote.status)}
                          </div>
                          {quote.respondedAt && (
                            <div className="text-[11px] text-slate-400">
                              อัปเดตราคาล่าสุด {formatDateTime(quote.respondedAt)}
                            </div>
                          )}
                        </div>

                        <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                          <div className="rounded-xl bg-white px-3 py-2">
                            <p className="text-slate-500">วัสดุ</p>
                            <p className="mt-1 font-semibold text-slate-900">฿{quote.materialSubtotal.toLocaleString('th-TH')}</p>
                          </div>
                          <div className="rounded-xl bg-white px-3 py-2">
                            <p className="text-slate-500">Landed</p>
                            <p className="mt-1 font-semibold text-slate-900">฿{quote.landedCost.toLocaleString('th-TH')}</p>
                          </div>
                          <div className="rounded-xl bg-white px-3 py-2">
                            <p className="text-slate-500">Confidence</p>
                            <p className="mt-1 font-semibold text-slate-900">{Math.round(quote.confidenceScore * 100)}%</p>
                          </div>
                        </div>

                        {quote.notes && (
                          <div className="mt-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
                            {quote.notes}
                          </div>
                        )}

                        <div className="mt-4 flex flex-wrap gap-2">
                          {onOpenVendorPortal && (
                            <button
                              onClick={() => onOpenVendorPortal(rfq.id, quote.vendorId)}
                              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
                            >
                              เปิด vendor portal
                            </button>
                          )}
                          <button
                            onClick={() => {
                              if (isEditing) {
                                setEditingQuoteKey(null);
                                return;
                              }
                              openQuoteEditor(rfq.id, quote);
                            }}
                            disabled={isBusy}
                            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-100 disabled:opacity-60"
                          >
                            <span className="inline-flex items-center gap-1.5">
                              <PencilLine className="h-3.5 w-3.5" />
                              {isEditing ? 'ซ่อนฟอร์มราคา' : 'กรอกราคาจริง'}
                            </span>
                          </button>
                          {rfq.status === 'quoted' && !isAwarded && quote.status !== 'declined' && (
                            <button
                              onClick={() => onAwardVendor(rfq, quote.vendorId)}
                              disabled={isBusy}
                              className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-emerald-700 disabled:opacity-60"
                            >
                              {isBusy ? 'กำลังบันทึก...' : 'เลือกเจ้านี้'}
                            </button>
                          )}
                          {isAwarded && (
                            <span className="inline-flex items-center gap-1 rounded-xl bg-white px-3 py-2 text-xs font-medium text-emerald-700">
                              <CircleCheckBig className="h-3.5 w-3.5" />
                              พร้อมออก PO
                            </span>
                          )}
                        </div>

                        {isEditing && (
                          <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                            <div className="grid gap-3 sm:grid-cols-2">
                              <label className="space-y-1 text-xs text-slate-500">
                                <span>ช่องทางรับราคา</span>
                                <select
                                  value={form.channel}
                                  onChange={(event) => updateDraft(editorKey, { channel: event.target.value as QuoteIntakeChannel })}
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
                                  value={form.status}
                                  onChange={(event) => updateDraft(editorKey, { status: event.target.value as ShopVendorQuoteStatus })}
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
                                  value={form.materialSubtotal}
                                  onChange={(event) => updateDraft(editorKey, { materialSubtotal: event.target.value })}
                                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-slate-400"
                                />
                              </label>
                              <label className="space-y-1 text-xs text-slate-500">
                                <span>ค่าส่ง</span>
                                <input
                                  type="number"
                                  min="0"
                                  step="1"
                                  value={form.shippingFee}
                                  onChange={(event) => updateDraft(editorKey, { shippingFee: event.target.value })}
                                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-slate-400"
                                />
                              </label>
                              <label className="space-y-1 text-xs text-slate-500">
                                <span>ETA (วัน)</span>
                                <input
                                  type="number"
                                  min="1"
                                  step="1"
                                  value={form.etaDays}
                                  onChange={(event) => updateDraft(editorKey, { etaDays: event.target.value })}
                                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-slate-400"
                                />
                              </label>
                              <div className="rounded-xl bg-slate-50 px-3 py-2">
                                <p className="text-[11px] uppercase tracking-[0.14em] text-slate-400">Landed Cost ใหม่</p>
                                <p className="mt-1 text-lg font-semibold text-slate-900">
                                  ฿{(parseNumber(form.materialSubtotal) + parseNumber(form.shippingFee)).toLocaleString('th-TH')}
                                </p>
                              </div>
                            </div>
                            <label className="mt-3 block space-y-1 text-xs text-slate-500">
                              <span>หมายเหตุ</span>
                              <textarea
                                rows={3}
                                value={form.notes}
                                onChange={(event) => updateDraft(editorKey, { notes: event.target.value })}
                                placeholder="เช่น รวมยกของขึ้นชั้น, ต้องนัดรอบส่งเช้า, สินค้าบางรายการรอของเข้า"
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                              />
                            </label>
                            <div className="mt-4 flex flex-wrap gap-2">
                              <button
                                onClick={() => void handleSaveDraft(rfq, quote)}
                                disabled={isBusy}
                                className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
                              >
                                <span className="inline-flex items-center gap-1.5">
                                  {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                                  บันทึกราคาจริง
                                </span>
                              </button>
                              <button
                                onClick={() => {
                                  setDrafts((current) => ({
                                    ...current,
                                    [editorKey]: createDraftFromQuote(quote),
                                  }));
                                  setEditingQuoteKey(null);
                                }}
                                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
                              >
                                <span className="inline-flex items-center gap-1.5">
                                  <X className="h-3.5 w-3.5" />
                                  ยกเลิก
                                </span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-3">
                  {rfq.status === 'requested' && (
                    <button
                      onClick={() => onMarkQuoted(rfq)}
                      disabled={isBusy}
                      className="inline-flex items-center gap-2 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-2.5 text-sm font-medium text-sky-700 transition hover:bg-sky-100 disabled:opacity-60"
                    >
                      {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquareQuote className="h-4 w-4" />}
                      บันทึกราคากลับชุด baseline
                    </button>
                  )}
                  {rfq.status === 'quoted' && bestQuote && (
                    <button
                      onClick={() => onAwardVendor(rfq, bestQuote.vendorId)}
                      disabled={isBusy}
                      className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-60"
                    >
                      {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CircleCheckBig className="h-4 w-4" />}
                      เลือกเจ้า landed cost ต่ำสุด
                    </button>
                  )}
                  {rfq.status === 'awarded' && (
                    <button
                      onClick={() => onCloseRfq(rfq)}
                      disabled={isBusy}
                      className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:opacity-60"
                    >
                      {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardList className="h-4 w-4" />}
                      ปิด RFQ รอบนี้
                    </button>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
