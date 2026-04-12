import { useMemo } from 'react';
import { ArrowRight, PackageCheck, ReceiptText, Store, Truck } from 'lucide-react';
import {
  describeQuoteChannel,
  type PurchaseListSummary,
  type VendorQuoteOption,
} from '../../utils/rfqMarketplace';
import { getProductReferenceStats, shopProducts, type ShopCategory, type ShopProduct, type ShopVendor } from '../../utils/shopCatalog';
import { ProductImage } from './ProductImage';

interface ShopHomeProps {
  projectName?: string;
  categories: ShopCategory[];
  vendors: ShopVendor[];
  purchaseList: PurchaseListSummary;
  quotes: VendorQuoteOption[];
  rfqCount: number;
  onOpenCatalog: () => void;
  onOpenCheckout: () => void;
  onOpenRfqInbox: () => void;
  onOpenProduct: (product: ShopProduct) => void;
}

export function ShopHome({
  projectName,
  categories,
  vendors,
  purchaseList,
  quotes,
  rfqCount,
  onOpenCatalog,
  onOpenCheckout,
  onOpenRfqInbox,
  onOpenProduct,
}: ShopHomeProps) {
  const featuredProducts = useMemo(() => shopProducts.filter((p) => p.featured).slice(0, 4), []);
  const bestQuote = quotes[0];
  const referenceStats = getProductReferenceStats();

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-800 px-6 py-7 text-white shadow-sm">
        <p className="text-[11px] uppercase tracking-[0.24em] text-emerald-200/80">RFQ Marketplace</p>
        <h2 className="mt-3 text-3xl font-semibold leading-tight">
          แปลง BOQ เป็น Purchase List แล้วขอราคาจากร้านวัสดุใกล้ไซต์งานแบบ no-API
        </h2>
        <p className="mt-3 max-w-3xl text-sm text-emerald-100/85">
          ใช้ catalog สำหรับเริ่มสั่งซื้อทันที และใช้ RFQ flow สำหรับร้าน local ที่ตอบราคาผ่าน LINE OA, ฟอร์ม, หรือแอดมินโทรกลับได้
          {projectName ? ` ตอนนี้อ้างอิงจากโครงการ "${projectName}"` : ''}
        </p>
        <div className="mt-4 inline-flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-white/8 px-3 py-2 text-xs text-emerald-100/90">
          <span className="font-medium">{referenceStats.seriesLabel}</span>
          <span>อัปเดต {referenceStats.updatedAt}</span>
          <span>{referenceStats.skuCount} SKU</span>
          <span>{referenceStats.categoryCount} หมวด</span>
        </div>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <button
            onClick={onOpenCatalog}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-medium text-emerald-900 transition hover:bg-emerald-50"
          >
            ดู catalog และเทียบราคา
            <ArrowRight className="h-4 w-4" />
          </button>
          <button
            onClick={onOpenCheckout}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-300/40 bg-emerald-900/20 px-5 py-3 text-sm font-medium text-white transition hover:bg-emerald-900/35"
          >
            เปิด RFQ / Checkout
            <ReceiptText className="h-4 w-4" />
          </button>
          <button
            onClick={onOpenRfqInbox}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/15"
          >
            RFQ Inbox {rfqCount > 0 ? `(${rfqCount})` : ''}
            <Store className="h-4 w-4" />
          </button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Purchase List</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">{purchaseList.lines.length}</p>
          <p className="mt-2 text-sm text-slate-500">
            {purchaseList.matchedLines} match ตรง, {purchaseList.reviewLines} ต้องรีวิว, {purchaseList.unmatchedLines} ยังไม่จับคู่
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Estimated Material</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">
            ฿{purchaseList.estimatedSubtotal.toLocaleString('th-TH')}
          </p>
          <p className="mt-2 text-sm text-slate-500">ยอดวัสดุประมาณการจาก BOQ ที่ match กับ catalog</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Vendor Reach</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">{vendors.length}</p>
          <p className="mt-2 text-sm text-slate-500">ร้านวัสดุที่พร้อมรับ RFQ ในรัศมี 10–30 กม.</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Best Landed Cost</p>
          <p className="mt-3 text-3xl font-semibold text-emerald-700">
            {bestQuote ? `฿${bestQuote.landedCost.toLocaleString('th-TH')}` : '-'}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            {bestQuote ? `${bestQuote.vendorName} • ETA ${bestQuote.etaDays} วัน` : 'ยังไม่มี quote comparison'}
          </p>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Workflow</p>
              <h3 className="mt-2 text-xl font-semibold text-slate-900">RFQ flow สำหรับร้านวัสดุ local</h3>
            </div>
            <Store className="h-6 w-6 text-emerald-600" />
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {[
              { icon: PackageCheck, title: '1. BOQ → Purchase List', text: 'จับคู่รายการวัสดุใน BOQ กับ catalog และระบุรายการที่ต้องรีวิว' },
              { icon: Store, title: '2. ยิง RFQ ตามรัศมี', text: 'เลือกร้านในรัศมี 10–30 กม. ตามมูลค่า order และประเภทวัสดุ' },
              { icon: ReceiptText, title: '3. รับราคาแบบ no-API', text: 'ร้านตอบผ่าน LINE OA, Google Form หรือแอดมินโทรคอนเฟิร์ม' },
              { icon: Truck, title: '4. เทียบ landed cost', text: 'ตัดสินใจจากราคาวัสดุ + ค่าส่ง + ETA พร้อมแผนจัดส่งเข้าหน้างาน' },
            ].map((step) => {
              const Icon = step.icon;
              return (
                <div key={step.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{step.title}</p>
                      <p className="mt-1 text-sm text-slate-500">{step.text}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6">
          <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Quote Board</p>
          <h3 className="mt-2 text-xl font-semibold text-slate-900">ร้านที่ควรยิงก่อน</h3>
          <div className="mt-4 space-y-3">
            {quotes.length > 0 ? quotes.slice(0, 3).map((quote) => (
              <div key={quote.vendorId} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{quote.vendorName}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {describeQuoteChannel(quote.channel)} • รัศมี {quote.radiusKm} กม.
                    </p>
                  </div>
                  <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-medium text-emerald-700">
                    ETA {quote.etaDays} วัน
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-slate-500">
                  <div>
                    <p>วัสดุ</p>
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
                ยังไม่มี quote comparison เพราะยังไม่เจอรายการวัสดุจาก BOQ ที่ match กับ catalog
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Featured Materials</p>
            <h3 className="mt-2 text-xl font-semibold text-slate-900">สินค้าแนะนำสำหรับเริ่ม marketplace</h3>
          </div>
          <button
            onClick={onOpenCatalog}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
          >
            ดูทั้งหมด
          </button>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {featuredProducts.length === 0 ? (
            <div className="col-span-full rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-slate-500">
              <p className="text-lg">ยังไม่มีสินค้าแนะนำ</p>
              <p className="mt-2 text-sm">ค้นหาสินค้าได้จากแคตตาล็อกทั้งหมด</p>
            </div>
          ) : (
            featuredProducts.map((product) => (
              <button
                key={product.id}
                onClick={() => onOpenProduct(product)}
                className="group rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition-all duration-200 hover:border-emerald-300 hover:bg-white hover:shadow-lg hover:shadow-emerald-100/50"
              >
                <div className="flex items-start gap-3">
                  <ProductImage
                    categoryId={product.categoryId}
                    brand={product.brand}
                    name={product.name}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-mono text-slate-400 tracking-wider">{product.sku}</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900 leading-snug line-clamp-2">{product.name}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-end justify-between border-t border-slate-100 pt-3">
                  <div>
                    <p className="text-xs text-slate-500">{product.brand || 'แบรนด์มาตรฐานงานโครงการ'}</p>
                  </div>
                  <p className="text-lg font-bold text-emerald-700">฿{product.price.toLocaleString('th-TH')}</p>
                </div>
              </button>
            ))
          )}
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {categories.map((category) => (
            <span key={category.id} className="rounded-full bg-slate-100 px-3 py-1.5 text-xs text-slate-600">
              {category.name}
            </span>
          ))}
        </div>
        <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
          ฐานสินค้าใน Shop ใช้ราคากลางแบบผสม: ดัชนีวัสดุก่อสร้าง, retail snapshot, และ benchmark ร้านวัสดุโครงการ เพื่อใช้เริ่ม RFQ ไม่ใช่การรับประกันราคาสดหน้าร้าน
        </div>
      </section>
    </div>
  );
}
