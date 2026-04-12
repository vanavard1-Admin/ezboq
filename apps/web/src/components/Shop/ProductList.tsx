import { useMemo, useState } from 'react';
import type { ShopCategory, ShopProduct, ShopVendor } from '../../utils/shopCatalog';
import { ProductImage } from './ProductImage';

function getOriginLabel(product: ShopProduct): string {
  if (product.priceOrigin === 'official-index') return 'ดัชนีทางการ';
  if (product.priceOrigin === 'retail-snapshot') return 'Retail snapshot';
  return 'Benchmark ตลาด';
}

interface ProductListProps {
  categories: ShopCategory[];
  products: ShopProduct[];
  vendors: ShopVendor[];
  onSelectProduct: (product: ShopProduct) => void;
  onAddToCart: (product: ShopProduct) => void;
}

export function ProductList({ categories, products, vendors, onSelectProduct, onAddToCart }: ProductListProps) {
  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState('all');

  const categoryName = (nextCategoryId: string) => (
    categories.find((category) => category.id === nextCategoryId)?.name || nextCategoryId
  );

  const vendorName = (vendorId: string) => (
    vendors.find((vendor) => vendor.id === vendorId)?.name || vendorId
  );

  const filtered = useMemo(() => products.filter((product) => {
    const q = query.trim().toLowerCase();
    const passQuery = !q || [
      product.name,
      product.sku,
      product.brand || '',
      product.sourceLabel || '',
      ...(product.aliases || []),
    ].join(' ').toLowerCase().includes(q);
    const passCategory = categoryId === 'all' || product.categoryId === categoryId;
    return passQuery && passCategory;
  }), [categoryId, products, query]);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="grid gap-3 md:grid-cols-3">
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ค้นหาชื่อสินค้า / SKU / alias / แบรนด์" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option value="all">ทุกหมวด</option>
            {categories.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
          </select>
          <div className="text-sm text-slate-500 flex items-center">พบ {filtered.length} รายการ</div>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((product) => (
          <div
            key={product.id}
            className="group rounded-xl border border-slate-200 bg-white p-4 transition-all duration-200 hover:border-emerald-300 hover:shadow-lg hover:shadow-emerald-100/50"
          >
            <div className="flex gap-4">
              <ProductImage
                categoryId={product.categoryId}
                brand={product.brand}
                name={product.name}
                size="md"
              />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-mono text-slate-400 tracking-wider">{product.sku}</p>
                <h4 className="mt-1 text-sm font-semibold text-slate-900 leading-snug line-clamp-2">{product.name}</h4>
                <p className="mt-1.5 text-xs text-slate-500">{categoryName(product.categoryId)}</p>
                <p className="text-xs text-slate-400">{vendorName(product.vendorId)}</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                    {getOriginLabel(product)}
                  </span>
                  {product.lastCheckedAt && (
                    <span className="text-[10px] text-slate-400">เช็ก {product.lastCheckedAt}</span>
                  )}
                </div>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
              <div>
                <p className="text-lg font-bold text-emerald-700">฿{product.price.toLocaleString('th-TH')}<span className="text-xs font-normal text-slate-400">/{product.unit}</span></p>
                <p className="text-[10px] text-slate-400">Stock {product.stock} • Lead {product.leadTimeDays} วัน</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => onSelectProduct(product)} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-600 transition hover:bg-white hover:border-slate-300">ดูเพิ่ม</button>
                <button onClick={() => onAddToCart(product)} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-emerald-700 active:scale-95">+ ตะกร้า</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
