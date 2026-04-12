import { ClipboardCheck, MessageSquareQuote, PhoneCall, Truck, UserRound } from 'lucide-react';
import type { CartItem } from './Cart';
import type { PurchaseListSummary, VendorQuoteLine, VendorQuoteOption } from '../../utils/rfqMarketplace';
import { describeQuoteChannel } from '../../utils/rfqMarketplace';

interface CheckoutProps {
  projectName?: string;
  items: CartItem[];
  purchaseList: PurchaseListSummary;
  quotes: VendorQuoteOption[];
  preferredQuoteLines: VendorQuoteLine[];
  onCreateRfq: () => void;
  onOpenRfqInbox: () => void;
  onBackToCatalog: () => void;
}

export function Checkout({
  projectName,
  items,
  purchaseList,
  quotes,
  preferredQuoteLines,
  onCreateRfq,
  onOpenRfqInbox,
  onBackToCatalog,
}: CheckoutProps) {
  const bestQuote = quotes[0];
  const cartTotal = items.reduce((sum, item) => sum + item.quantity * item.product.price, 0);
  const checkoutLines = preferredQuoteLines.length > 0 ? preferredQuoteLines : items.map((item) => ({
    vendorId: item.product.vendorId,
    productId: item.product.id,
    productName: item.product.name,
    quantity: item.quantity,
    unit: item.product.unit,
    unitPrice: item.product.price,
    amount: item.quantity * item.product.price,
    etaDays: item.product.leadTimeDays,
  }));

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
      <div className="space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Checkout / RFQ</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">สรุปคำขอราคาวัสดุ</h2>
              <p className="mt-2 text-sm text-slate-500">
                ใช้หน้าเดียวสรุป purchase list, ร้านที่ควรยิงก่อน, ช่องทางรับราคา, และเงื่อนไขส่งเข้าหน้างาน
                {projectName ? ` สำหรับโครงการ "${projectName}"` : ''}
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                onClick={onOpenRfqInbox}
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                เปิด RFQ Inbox
              </button>
              <button
                onClick={onCreateRfq}
                className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-emerald-700"
              >
                สร้าง RFQ รอบนี้
              </button>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs text-slate-500">Purchase List</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{purchaseList.lines.length}</p>
              <p className="mt-1 text-xs text-slate-500">รายการจาก BOQ + cart</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs text-slate-500">Matched Vendors</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{quotes.length}</p>
              <p className="mt-1 text-xs text-slate-500">ร้านที่พร้อมรับ RFQ</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs text-slate-500">Current Estimate</p>
              <p className="mt-2 text-2xl font-semibold text-emerald-700">฿{cartTotal.toLocaleString('th-TH')}</p>
              <p className="mt-1 text-xs text-slate-500">จากของใน cart ตอนนี้</p>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
              <ClipboardCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">รายการที่จะส่งขอราคา</h3>
              <p className="text-sm text-slate-500">ร้านจะเห็นจำนวน หน่วย ราคากลาง และเงื่อนไขจัดส่งที่หน้างาน</p>
            </div>
          </div>

          <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
            <div className="grid grid-cols-[minmax(0,1.5fr)_90px_90px_110px] gap-3 bg-slate-50 px-4 py-3 text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
              <span>รายการ</span>
              <span>จำนวน</span>
              <span>หน่วย</span>
              <span className="text-right">รวม</span>
            </div>
            <div className="divide-y divide-slate-200">
              {checkoutLines.length > 0 ? checkoutLines.map((line) => (
                <div key={`${line.vendorId}-${line.productId}`} className="grid grid-cols-[minmax(0,1.5fr)_90px_90px_110px] gap-3 px-4 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-900">{line.productName}</p>
                    <p className="mt-1 text-xs text-slate-500">ETA {line.etaDays} วัน</p>
                  </div>
                  <span className="text-slate-700">{line.quantity.toLocaleString('th-TH')}</span>
                  <span className="text-slate-500">{line.unit}</span>
                  <span className="text-right font-medium text-slate-900">฿{line.amount.toLocaleString('th-TH')}</span>
                </div>
              )) : (
                <div className="px-4 py-8 text-center text-sm text-slate-500">
                  ยังไม่มีรายการใน cart หรือ purchase list
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      <div className="space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6">
          <h3 className="text-lg font-semibold text-slate-900">ร้านแนะนำรอบแรก</h3>
          <div className="mt-4 space-y-3">
            {quotes.length > 0 ? quotes.slice(0, 3).map((quote) => (
              <div key={quote.vendorId} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{quote.vendorName}</p>
                    <p className="mt-1 text-xs text-slate-500">{describeQuoteChannel(quote.channel)}</p>
                  </div>
                  <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-medium text-emerald-700">
                    ETA {quote.etaDays} วัน
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-slate-500">
                  <div>
                    <p>ค่าวัสดุ</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">฿{quote.materialSubtotal.toLocaleString('th-TH')}</p>
                  </div>
                  <div>
                    <p>ค่าส่ง</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">฿{quote.shippingFee.toLocaleString('th-TH')}</p>
                  </div>
                  <div>
                    <p>Landed Cost</p>
                    <p className="mt-1 text-sm font-semibold text-emerald-700">฿{quote.landedCost.toLocaleString('th-TH')}</p>
                  </div>
                </div>
              </div>
            )) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                ยังไม่มีร้านที่พร้อมเทียบราคา เพราะ purchase list ยังจับคู่สินค้าได้ไม่พอ
              </div>
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6">
          <h3 className="text-lg font-semibold text-slate-900">ช่องทางรับราคากลับแบบ no-API</h3>
          <div className="mt-4 space-y-3">
            {[
              { icon: MessageSquareQuote, title: 'LINE OA / LINE Group', text: 'ส่ง RFQ พร้อม Purchase List ไปที่ร้าน แล้วให้ร้านตอบราคา/ค่าส่ง/ETA กลับในแชต' },
              { icon: UserRound, title: 'Google Form', text: 'ร้านกรอกฟอร์มกลับเองเมื่อยังไม่มีระบบหลังบ้านของร้าน' },
              { icon: PhoneCall, title: 'แอดมินโทรกลับ', text: 'แอดมินของ EzBOQ โทรยืนยันราคาและกรอกกลับเข้าระบบแทนร้าน' },
              { icon: Truck, title: 'Logistics Confirmation', text: 'ยืนยันรอบส่ง, site contact, เวลายกของลง, และข้อจำกัดหน้างานก่อนออก PO' },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="flex items-start gap-3 rounded-2xl bg-slate-50 p-4">
                  <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-200 text-slate-700">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                    <p className="mt-1 text-sm text-slate-500">{item.text}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <button
            onClick={onBackToCatalog}
            className="mt-5 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            กลับไปเลือกสินค้าเพิ่ม
          </button>
        </section>

        {bestQuote && (
          <section className="rounded-3xl border border-emerald-100 bg-emerald-50 p-6">
            <p className="text-[11px] uppercase tracking-[0.2em] text-emerald-600">Recommended Vendor</p>
            <h3 className="mt-2 text-lg font-semibold text-emerald-900">{bestQuote.vendorName}</h3>
            <p className="mt-2 text-sm text-emerald-800">
              เริ่มยิง RFQ ร้านนี้ก่อน เพราะ landed cost ต่ำสุดในรอบนี้และมี ETA {bestQuote.etaDays} วัน
            </p>
          </section>
        )}
      </div>
    </div>
  );
}
