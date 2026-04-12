import type { ShopProduct } from '../../utils/shopCatalog';

export interface CartItem {
  product: ShopProduct;
  quantity: number;
}

interface CartProps {
  items: CartItem[];
  onRemove: (productId: string) => void;
  onCheckout: () => void;
}

export function Cart({ items, onRemove, onCheckout }: CartProps) {
  const total = items.reduce((sum, item) => sum + (item.quantity * item.product.price), 0);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="text-lg font-semibold">ตะกร้าสินค้า</h3>
      <div className="mt-3 space-y-2">
        {items.length === 0 && <p className="text-sm text-slate-500">ยังไม่มีสินค้าในตะกร้า</p>}
        {items.map((item) => (
          <div key={item.product.id} className="flex items-center justify-between rounded-lg bg-slate-50 p-2 text-sm">
            <span>{item.product.name} x {item.quantity}</span>
            <div className="flex items-center gap-3">
              <span>฿{(item.product.price * item.quantity).toLocaleString('th-TH')}</span>
              <button onClick={() => onRemove(item.product.id)} className="text-red-600">ลบ</button>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 border-t pt-3 flex items-center justify-between">
        <span className="font-semibold">รวม</span>
        <span className="font-bold text-emerald-700">฿{total.toLocaleString('th-TH')}</span>
      </div>
      <button disabled={items.length === 0} onClick={onCheckout} className="mt-3 w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white disabled:bg-slate-300">ไปหน้า Checkout</button>
    </div>
  );
}
