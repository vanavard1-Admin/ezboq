import type { ShopProduct, ShopVendor } from '../../utils/shopCatalog';
import { ProductImage } from './ProductImage';

function getOriginLabel(product: ShopProduct): string {
  if (product.priceOrigin === 'official-index') return 'ราคาอ้างอิงจากดัชนีวัสดุก่อสร้าง';
  if (product.priceOrigin === 'retail-snapshot') return 'ราคาอ้างอิงจาก retail snapshot';
  return 'ราคา benchmark ตลาด / ร้านวัสดุโครงการ';
}

interface ProductDetailProps {
  product: ShopProduct;
  vendors: ShopVendor[];
  categoryName: string;
  onBack: () => void;
  onAddToCart: (product: ShopProduct) => void;
}

export function ProductDetail({ product, vendors, categoryName, onBack, onAddToCart }: ProductDetailProps) {
  const vendorName = (vendorId: string) => (
    vendors.find((vendor) => vendor.id === vendorId)?.name || vendorId
  );

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <button onClick={onBack} className="mb-4 inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-600 transition hover:bg-white">← กลับ</button>

      <div className="flex flex-col gap-6 md:flex-row">
        {/* Product Image */}
        <ProductImage
          categoryId={product.categoryId}
          brand={product.brand}
          name={product.name}
          size="lg"
        />

        {/* Product Info */}
        <div className="flex-1">
          <p className="text-[10px] font-mono text-slate-400 tracking-wider">{product.sku}</p>
          <h3 className="mt-1 text-xl font-semibold text-slate-900">{product.name}</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">{categoryName}</span>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">{product.unit}</span>
            {product.brand && (
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">{product.brand}</span>
            )}
          </div>
          <p className="mt-3 text-sm text-slate-600">
            ผู้ขายหลัก: <span className="font-medium text-slate-800">{vendorName(product.vendorId)}</span> • Stock {product.stock} • Lead {product.leadTimeDays} วัน
          </p>
          <p className="mt-3 text-3xl font-bold text-emerald-700">
            ฿{product.price.toLocaleString('th-TH')}
            <span className="text-sm font-normal text-slate-400">/{product.unit}</span>
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <h4 className="text-sm font-semibold text-slate-900">เปรียบเทียบราคาผู้ขาย</h4>
        <div className="mt-3 space-y-2 text-sm">
          <div className="flex items-center justify-between rounded-xl bg-white p-3 border border-emerald-200">
            <div className="flex items-center gap-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-700">✓</span>
              <span className="font-medium text-slate-900">{vendorName(product.vendorId)}</span>
            </div>
            <div className="text-right">
              <span className="font-semibold text-emerald-700">฿{product.price.toLocaleString('th-TH')}</span>
              <span className="ml-2 text-xs text-slate-400">Lead {product.leadTimeDays} วัน</span>
            </div>
          </div>
          {product.alternateOffers?.map((offer) => (
            <div key={offer.vendorId} className="flex items-center justify-between rounded-xl bg-white p-3 border border-slate-100">
              <span className="font-medium text-slate-700">{vendorName(offer.vendorId)}</span>
              <div className="text-right">
                <span className="font-semibold text-slate-900">฿{offer.price.toLocaleString('th-TH')}</span>
                <span className="ml-2 text-xs text-slate-400">Lead {offer.leadTimeDays} วัน</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
        <h4 className="text-sm font-semibold text-slate-900">ที่มาราคาอ้างอิง</h4>
        <div className="mt-3 space-y-2 text-sm text-slate-600">
          <p>{getOriginLabel(product)}</p>
          {product.sourceLabel && (
            <p className="text-slate-500">
              แหล่งข้อมูล: <span className="font-medium text-slate-700">{product.sourceLabel}</span>
            </p>
          )}
          {product.lastCheckedAt && (
            <p className="text-slate-500">ตรวจล่าสุด: {product.lastCheckedAt}</p>
          )}
          {product.sourceUrl && (
            <a
              href={product.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-emerald-700 transition hover:text-emerald-800"
            >
              เปิดแหล่งอ้างอิง
            </a>
          )}
          <p className="text-xs text-slate-400">
            ใช้เป็นราคา benchmark สำหรับเริ่ม RFQ และควรยืนยันราคาจริงกับร้านก่อนออก PO
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          onClick={() => onAddToCart(product)}
          className="rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-700 active:scale-[0.98]"
        >
          เพิ่มลง BOQ
        </button>

      </div>
    </div>
  );
}
