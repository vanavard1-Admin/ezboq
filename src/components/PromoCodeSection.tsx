import { useState } from 'react';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import {
  Tag,
  UserPlus,
  DollarSign,
  AlertCircle,
  Loader2,
  CheckCircle2,
  X,
  Gift,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';
import { projectId } from '../utils/supabase/info';
import { supabase } from '../utils/supabase/client';
import { log } from '../utils/logger';

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

interface PromoCodeSectionProps {
  onCodeValidated: (affiliate: AffiliateCode | null) => void;
  validatedAffiliate: AffiliateCode | null;
  discountAmount?: number;
}

export function PromoCodeSection({ onCodeValidated, validatedAffiliate, discountAmount }: PromoCodeSectionProps) {
  const [promoCode, setPromoCode] = useState('');
  const [isValidatingCode, setIsValidatingCode] = useState(false);
  const [codeError, setCodeError] = useState('');

  const validatePromoCode = async () => {
    if (!promoCode.trim()) {
      setCodeError('กรุณาใส่โค้ดส่วนลด');
      return;
    }

    setIsValidatingCode(true);
    setCodeError('');

    try {
      // 🔒 Get access token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('กรุณาเข้าสู่ระบบใหม่');
        setIsValidatingCode(false);
        return;
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-6e95bca3/affiliate/validate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ code: promoCode.trim().toUpperCase() }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        onCodeValidated(data.affiliate);
        toast.success(`🎉 รับส่วนลด ${data.affiliate.discountPercent}% จาก ${data.affiliate.ownerName}!`);
      } else {
        const error = await response.json();
        setCodeError(error.message || 'รหัสไม่ถูกต้องหรือหมดอายุ');
        onCodeValidated(null);
        toast.error('รหัสส่วนลดไม่ถูกต้อง');
      }
    } catch (error) {
      log.error('Failed to validate code:', error);
      setCodeError('ไม่สามารถตรวจสอบรหัสได้ กรุณาลองใหม่');
      onCodeValidated(null);
    } finally {
      setIsValidatingCode(false);
    }
  };

  const removePromoCode = () => {
    setPromoCode('');
    onCodeValidated(null);
    setCodeError('');
    toast.info('ยกเลิกรหัสส่วนลดแล้ว');
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-base flex items-center gap-2">
          <Tag className="w-4 h-4 text-purple-600" />
          รหัสส่วนลด / Affiliate Code
        </Label>
        {validatedAffiliate && (
          <Badge className="bg-green-100 text-green-700 border-0">
            <Check className="w-3 h-3 mr-1" />
            ใช้งานแล้ว
          </Badge>
        )}
      </div>

      {!validatedAffiliate ? (
        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                placeholder="ใส่รหัสส่วนลด เช่น INFLUENCER10"
                value={promoCode}
                onChange={(e) => {
                  setPromoCode(e.target.value.toUpperCase());
                  setCodeError('');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    validatePromoCode();
                  }
                }}
                className="border-2 uppercase"
                disabled={isValidatingCode}
              />
            </div>
            <Button
              onClick={validatePromoCode}
              disabled={!promoCode.trim() || isValidatingCode}
              className="bg-purple-600 hover:bg-purple-700 min-w-[100px]"
            >
              {isValidatingCode ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ตรวจสอบ
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  ใช้งาน
                </>
              )}
            </Button>
          </div>

          {codeError && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{codeError}</p>
            </div>
          )}

          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-2">
              <UserPlus className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-blue-700">
                <p className="font-semibold mb-1">💡 ระบบ Affiliate Marketing</p>
                <p>ใส่รหัสจาก Influencer หรือพาร์ทเนอร์เพื่อรับส่วนลดพิเศษ! ทั้งคุณและผู้แนะนำจะได้รับประโยชน์ร่วมกัน</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                <Gift className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-semibold text-green-900">รหัสส่วนลดใช้งานได้!</p>
                <p className="text-sm text-green-700">ส่วนลด {validatedAffiliate.discountPercent}%</p>
              </div>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={removePromoCode}
              className="text-red-600 hover:text-red-700 hover:bg-red-100"
            >
              <X className="w-4 h-4 mr-1" />
              ยกเลิก
            </Button>
          </div>
          
          <div className="space-y-2 pl-13">
            <div className="flex items-center gap-2 text-sm">
              <Tag className="w-3 h-3 text-green-700" />
              <span className="font-mono font-semibold text-green-900">{validatedAffiliate.code}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-green-700">
              <UserPlus className="w-3 h-3" />
              <span>แนะนำโดย: {validatedAffiliate.ownerName}</span>
            </div>
            {discountAmount !== undefined && discountAmount > 0 && (
              <div className="flex items-center gap-2 text-sm text-green-700">
                <DollarSign className="w-3 h-3" />
                <span>ประหยัด ฿{discountAmount.toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}