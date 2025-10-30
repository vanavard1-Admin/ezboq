import { Badge } from './ui/badge';
import { Gift, Tag } from 'lucide-react';

interface AffiliateCode {
  code: string;
  ownerId: string;
  ownerName: string;
  discountPercent: number;
  commissionPercent: number;
  usageCount: number;
  active: boolean;
  maxUsage?: number;
  expiresAt?: number;
}

interface PriceSummaryWithDiscountProps {
  planName: string;
  billingCycle: 'monthly' | 'yearly' | null;
  basePrice: number;
  planSavings?: number;
  validatedAffiliate: AffiliateCode | null;
}

export function PriceSummaryWithDiscount({
  planName,
  billingCycle,
  basePrice,
  planSavings,
  validatedAffiliate,
}: PriceSummaryWithDiscountProps) {
  const calculateFinalPrice = () => {
    if (!validatedAffiliate || basePrice === 0) {
      return { original: basePrice, discount: 0, final: basePrice, discountPercent: 0 };
    }

    const discountAmount = Math.round(basePrice * (validatedAffiliate.discountPercent / 100));
    const finalPrice = basePrice - discountAmount;

    return {
      original: basePrice,
      discount: discountAmount,
      final: finalPrice,
      discountPercent: validatedAffiliate.discountPercent,
    };
  };

  const pricing = calculateFinalPrice();

  return (
    <div className="bg-gradient-to-br from-purple-600 to-pink-600 text-white p-6 rounded-xl">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm opacity-90">แผนที่เลือก</span>
        <Badge className="bg-white/20 text-white border-0">
          {billingCycle === 'yearly' ? '1 ปี' : '1 เดือน'}
        </Badge>
      </div>
      <h3 className="text-2xl font-bold mb-4">{planName}</h3>
      
      {planSavings && (
        <div className="flex items-center gap-2 mb-4 p-3 bg-white/10 rounded-lg">
          <Gift className="w-4 h-4" />
          <span className="text-sm">ส่วนลด {planSavings}%</span>
        </div>
      )}

      {/* Promo Code Discount Display */}
      {validatedAffiliate && (
        <div className="mb-4 space-y-2">
          <div className="flex items-center gap-2 p-3 bg-white/10 rounded-lg">
            <Tag className="w-4 h-4" />
            <span className="text-sm">รหัสส่วนลด {validatedAffiliate.discountPercent}%</span>
          </div>
          <div className="text-sm opacity-90 pl-3">
            จาก: {validatedAffiliate.ownerName}
          </div>
        </div>
      )}

      <div className="border-t border-white/20 pt-4 space-y-2">
        {validatedAffiliate ? (
          <>
            <div className="flex justify-between items-center text-sm opacity-80">
              <span>ราคาปกติ</span>
              <span className="line-through">฿{pricing.original.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center text-sm text-yellow-300">
              <span>ส่วนลด ({pricing.discountPercent}%)</span>
              <span>-฿{pricing.discount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center text-lg font-bold pt-2 border-t border-white/20">
              <span>ยอดชำระ</span>
              <span className="text-4xl">฿{pricing.final.toLocaleString()}</span>
            </div>
          </>
        ) : (
          <div className="flex justify-between items-center">
            <span className="text-lg">ยอดชำระทั้งหมด</span>
            <span className="text-4xl font-bold">
              ฿{basePrice.toLocaleString()}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
