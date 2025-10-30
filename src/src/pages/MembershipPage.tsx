import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Switch } from '../components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Crown,
  Zap,
  Check,
  X,
  Sparkles,
  ArrowLeft,
  CreditCard,
  QrCode,
  Calendar,
  Shield,
  Award,
  Users,
  Clock,
  HelpCircle,
  Star,
  Infinity as InfinityIcon,
  Smartphone,
  Building2,
  Wallet,
  Rocket,
  ChevronRight,
  CheckCircle2,
  Gift,
  Percent,
  TrendingUp,
  BarChart3,
  Globe,
  Mail,
  Tag,
  UserPlus,
  DollarSign,
  AlertCircle,
  Loader2,
} from 'lucide-react';

const Infinity = InfinityIcon;
import { Membership, MembershipTier, MembershipPlan, PaymentRecord, BillingCycle } from '../types/boq';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { PromoCodeSection } from '../components/PromoCodeSection';
import { PriceSummaryWithDiscount } from '../components/PriceSummaryWithDiscount';

// Payment Logos
import rabbitLinePayLogo from "figma:asset/86cf8fc704ee6de528b1740bbb16b755bc58e1a7.png";
import promptPayLogo from "figma:asset/75587e1403b3bf124bee9f0fc393116b64b04b69.png";
import trueMoneyLogo from "figma:asset/eeb594d4395f2af7623a575c1bec7e2c709b92b3.png";
import visaLogo from "figma:asset/6bacbd0043d5da09fa7981176d681a1ac34e46a9.png";
import mastercardLogo from "figma:asset/2cfbe92ee0a389f49e219f6e934de83576301123.png";

interface MembershipPageProps {
  onBack: () => void;
  user: SupabaseUser | null;
}

// Affiliate Code Interface
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

// Plans Configuration
const MEMBERSHIP_PLANS: MembershipPlan[] = [
  {
    tier: 'free',
    name: 'ฟรี',
    price: 0,
    billingCycle: null,
    features: [
      'ทดลองสร้าง BOQ ได้ 1 ครั้ง',
      'ส่งออก PDF พื้นฐาน',
      'เทมเพลตมาตรฐาน',
      'การสนับสนุนทาง Email',
    ],
    limits: {
      boqPerMonth: 1,
      users: 1,
      storage: '100 MB',
      support: 'email',
    },
  },
  {
    tier: 'individual_month',
    name: 'Pro',
    price: 129,
    billingCycle: 'monthly',
    popular: true,
    features: [
      'สร้าง BOQ ไม่จำกัด',
      'ใบเสนอราคา + ใบแจ้งหนี้',
      'ใบกำกับภาษี/ใบเสร็จ',
      'อัพโหลดโลโก้และ QR Code',
      'จัดการลูกค้าและพาร์ทเนอร์',
      'ระบบหัก ณ ที่จ่าย',
      'รายงานและสถิติ',
      'การสนับสนุนลำดับความสำคัญ',
    ],
    limits: {
      boqPerMonth: 'unlimited',
      users: 1,
      storage: '5 GB',
      support: 'priority',
    },
  },
  {
    tier: 'individual_year',
    name: 'Pro',
    price: 1290,
    billingCycle: 'yearly',
    popular: true,
    savings: 17,
    features: [
      'สร้าง BOQ ไม่จำกัด',
      'ใบเสนอราคา + ใบแจ้งหนี้',
      'ใบกำกับภาษี/ใบเสร็จ',
      'อัพโหลดโลโก้และ QR Code',
      'จัดการลูกค้าและพาร์ทเนอร์',
      'ระบบหัก ณ ที่จ่าย',
      'รายงานและสถิติ',
      'ประหยัด 17%',
      'การสนับสนุนลำดับความสำคัญ',
    ],
    limits: {
      boqPerMonth: 'unlimited',
      users: 1,
      storage: '5 GB',
      support: 'priority',
    },
  },
  {
    tier: 'team_month',
    name: 'Team',
    price: 499,
    billingCycle: 'monthly',
    features: [
      '5 ที่นั่งในทีม',
      'สร้าง BOQ ไม่จำกัด',
      'ใบเสนอราคา + ใบแจ้งหนี้',
      'ใบกำกับภาษี/ใบเสร็จ',
      'อัพโหลดโลโก้และ QR Code',
      'จัดการลูกค้าและพาร์ทเนอร์',
      'ระบบหัก ณ ที่จ่าย',
      'รายงานและสถิติแบบทีม',
      'แชร์เทมเพลตภายในทีม',
      'การสนับสนุนลำดับความสำคัญ',
    ],
    limits: {
      boqPerMonth: 'unlimited',
      users: 5,
      storage: '20 GB',
      support: 'priority',
    },
  },
  {
    tier: 'team_year',
    name: 'Team',
    price: 4990,
    billingCycle: 'yearly',
    savings: 17,
    features: [
      '5 ที่นั่งในทีม',
      'สร้าง BOQ ไม่จำกัด',
      'ใบเสนอราคา + ใบแจ้งหนี้',
      'ใบกำกับภาษี/ใบเสร็จ',
      'อัพโหลดโลโก้และ QR Code',
      'จัดการลูกค้าและพาร์ทเนอร์',
      'ระบบหัก ณ ที่จ่าย',
      'รายงานและสถิติแบบทีม',
      'แชร์เทมเพลตภายในทีม',
      'ประหยัด 17%',
      'รับฟีเจอร์พิเศษก่อนใคร',
      'การสนับสนุนแบบเฉพาะ',
    ],
    limits: {
      boqPerMonth: 'unlimited',
      users: 5,
      storage: '50 GB',
      support: 'dedicated',
    },
  },
];

export function MembershipPage({ onBack, user }: MembershipPageProps) {
  const [membership, setMembership] = useState<Membership | null>(null);
  const [loading, setLoading] = useState(true);
  const [isYearly, setIsYearly] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<MembershipPlan | null>(null);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'promptpay' | 'credit_card' | 'rabbit_linepay' | 'truemoney' | 'mobile_banking' | 'internet_banking'>('promptpay');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Affiliate/Promo Code States
  const [promoCode, setPromoCode] = useState('');
  const [isValidatingCode, setIsValidatingCode] = useState(false);
  const [validatedAffiliate, setValidatedAffiliate] = useState<AffiliateCode | null>(null);
  const [codeError, setCodeError] = useState('');

  useEffect(() => {
    loadMembership();
  }, [user]);

  const loadMembership = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-6e95bca3/membership/${user.id}`,
        {
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setMembership(data.membership);
      }
    } catch (error) {
      console.error('Failed to load membership:', error);
      toast.error('ไม่สามารถโหลดข้อมูลสมาชิกได้');
    } finally {
      setLoading(false);
    }
  };

  const validatePromoCode = async () => {
    if (!promoCode.trim()) {
      setCodeError('กรุณาใส่โค้ดส่วนลด');
      return;
    }

    setIsValidatingCode(true);
    setCodeError('');

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-6e95bca3/affiliate/validate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({ code: promoCode.trim().toUpperCase() }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setValidatedAffiliate(data.affiliate);
        toast.success(`🎉 รับส่วนลด ${data.affiliate.discountPercent}% จาก ${data.affiliate.ownerName}!`);
      } else {
        const error = await response.json();
        setCodeError(error.message || 'รหัสไม่ถูกต้องหรือหมดอายุ');
        setValidatedAffiliate(null);
        toast.error('รหัสส่วนลดไม่ถูกต้อง');
      }
    } catch (error) {
      console.error('Failed to validate code:', error);
      setCodeError('ไม่สามารถตรวจสอบรหัสได้ กรุณาลองใหม่');
      setValidatedAffiliate(null);
    } finally {
      setIsValidatingCode(false);
    }
  };

  const removePromoCode = () => {
    setPromoCode('');
    setValidatedAffiliate(null);
    setCodeError('');
    toast.info('ยกเลิกรหัสส่วนลดแล้ว');
  };

  const calculateFinalPrice = (basePrice: number): { original: number; discount: number; final: number; discountPercent: number } => {
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

  const handleSelectPlan = (plan: MembershipPlan) => {
    if (plan.tier === 'free') {
      toast.info('คุณอยู่ในแผนฟรีอยู่แล้ว');
      return;
    }
    setSelectedPlan(plan);
    setIsPaymentDialogOpen(true);
  };

  const handlePayment = async () => {
    if (!user || !selectedPlan) return;

    setIsProcessing(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const pricing = calculateFinalPrice(selectedPlan.price);
      
      const paymentRecord: PaymentRecord = {
        id: `payment-${Date.now()}`,
        amount: pricing.final,
        date: Date.now(),
        method: paymentMethod,
        status: 'completed',
        planName: selectedPlan.name,
        billingCycle: selectedPlan.billingCycle,
      };

      const subscriptionDuration = selectedPlan.billingCycle === 'yearly' ? 365 : 30;
      const subscriptionEnd = Date.now() + subscriptionDuration * 24 * 60 * 60 * 1000;

      const updatedMembership: Membership = {
        userId: user.id,
        tier: selectedPlan.tier,
        freeBoqUsed: true,
        subscriptionStart: Date.now(),
        subscriptionEnd,
        autoRenew: true,
        paymentHistory: [...(membership?.paymentHistory || []), paymentRecord],
        boqUsedThisMonth: 0,
      };

      const requestBody: any = {
        membership: updatedMembership,
      };

      // Include affiliate data if code was used
      if (validatedAffiliate) {
        requestBody.affiliate = {
          code: validatedAffiliate.code,
          ownerId: validatedAffiliate.ownerId,
          ownerName: validatedAffiliate.ownerName,
          discountPercent: validatedAffiliate.discountPercent,
          commissionPercent: validatedAffiliate.commissionPercent,
          discountAmount: pricing.discount,
          originalPrice: pricing.original,
          finalPrice: pricing.final,
        };
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-6e95bca3/membership`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify(requestBody),
        }
      );

      if (response.ok) {
        const successMessage = validatedAffiliate 
          ? `🎉 ยินดีด้วย! อัพเกรดเป็น ${selectedPlan.name} สำเร็จ! ประหยัด ฿${pricing.discount.toLocaleString()}`
          : `🎉 ยินดีด้วย! อัพเกรดเป็น ${selectedPlan.name} สำเร็จ!`;
        toast.success(successMessage);
        setIsPaymentDialogOpen(false);
        setSelectedPlan(null);
        setPromoCode('');
        setValidatedAffiliate(null);
        loadMembership();
      } else {
        throw new Error('Failed to upgrade');
      }
    } catch (error) {
      console.error('Payment failed:', error);
      toast.error('การชำระเงินล้มเหลว กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsProcessing(false);
    }
  };

  const getCurrentPlan = (): MembershipPlan => {
    return MEMBERSHIP_PLANS.find(p => p.tier === membership?.tier) || MEMBERSHIP_PLANS[0];
  };

  const getDisplayPlans = () => {
    const freePlan = MEMBERSHIP_PLANS.find(p => p.tier === 'free');
    const individualPlan = MEMBERSHIP_PLANS.find(p => 
      p.tier === (isYearly ? 'individual_year' : 'individual_month')
    );
    const teamPlan = MEMBERSHIP_PLANS.find(p => 
      p.tier === (isYearly ? 'team_year' : 'team_month')
    );
    
    return [freePlan, individualPlan, teamPlan].filter(Boolean) as MembershipPlan[];
  };

  const formatPrice = (price: number, billingCycle: BillingCycle | null) => {
    if (price === 0) return 'ฟรี';
    if (billingCycle === 'yearly') {
      return `฿${price.toLocaleString()}/ปี`;
    }
    return `฿${price.toLocaleString()}/เดือน`;
  };

  const getDaysRemaining = () => {
    if (!membership?.subscriptionEnd) return 0;
    const now = Date.now();
    const daysRemaining = Math.ceil((membership.subscriptionEnd - now) / (1000 * 60 * 60 * 24));
    return Math.max(0, daysRemaining);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: 999999, ease: "linear" }}
            className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full mx-auto mb-4"
          />
          <p className="text-muted-foreground">กำลังโหลด...</p>
        </motion.div>
      </div>
    );
  }

  const currentPlan = getCurrentPlan();
  const daysRemaining = getDaysRemaining();

  return (
    <div className="min-h-screen bg-white">
      {/* Compact Header */}
      <div className="border-b bg-white sticky top-0 z-50 backdrop-blur-sm bg-white/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={onBack} className="hover:bg-gray-100">
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
                  <Crown className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold">สมาชิก VIP</h1>
                  <p className="text-sm text-muted-foreground">เลือกแผนที่เหมาะกับคุณ</p>
                </div>
              </div>
            </div>

            {/* Current Plan Badge (if exists) */}
            {membership && membership.tier !== 'free' && (
              <Badge className="bg-purple-100 text-purple-700 border-purple-200">
                <Crown className="w-3 h-3 mr-1" />
                {currentPlan.name}
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Promo Banner */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="bg-gradient-to-r from-orange-500 to-pink-500 rounded-2xl p-4 text-white text-center">
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <Sparkles className="w-5 h-5" />
              <span className="font-semibold">ออกแคมเปญพิเศษ! ลดสูงสุด 35% สำหรับผู้ใช้งานปีแรก</span>
              <Gift className="w-5 h-5" />
            </div>
          </div>
        </motion.div>

        {/* Billing Toggle */}
        <div className="flex justify-center mb-12">
          <div className="inline-flex items-center gap-4 bg-gray-100 rounded-full p-1.5">
            <button
              onClick={() => setIsYearly(false)}
              className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all ${
                !isYearly
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              รายเดือน
            </button>
            <button
              onClick={() => setIsYearly(true)}
              className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                isYearly
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              รายปี
              <Badge className="bg-green-500 text-white border-0 text-xs">-17%</Badge>
            </button>
          </div>
        </div>

        {/* Pricing Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          {getDisplayPlans().map((plan, index) => {
            const isTeamPlan = plan.tier.startsWith('team');
            const isFreePlan = plan.tier === 'free';
            const isCurrentPlan = membership?.tier === plan.tier;
            
            return (
              <motion.div
                key={plan.tier}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={isTeamPlan ? 'md:scale-105 md:-mt-4' : ''}
              >
                <Card className={`relative overflow-hidden h-full flex flex-col ${
                  isTeamPlan
                    ? 'border-2 border-purple-600 shadow-xl shadow-purple-200'
                    : plan.popular
                      ? 'border-2 border-purple-300 shadow-lg'
                      : 'border shadow-sm'
                }`}>
                  {/* Popular Badge */}
                  {plan.popular && !isTeamPlan && (
                    <div className="absolute top-0 right-0 bg-purple-600 text-white px-4 py-1 rounded-bl-lg text-xs font-medium">
                      แนะนำ
                    </div>
                  )}

                  {/* Team Badge */}
                  {isTeamPlan && (
                    <div className="absolute top-0 right-0 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-1 rounded-bl-lg text-xs font-medium">
                      ยอดนิยม
                    </div>
                  )}

                  <div className="p-8 flex-1 flex flex-col">
                    {/* Plan Name */}
                    <div className="mb-6">
                      <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                      
                      {/* Price */}
                      <div className="flex items-baseline gap-2">
                        {isFreePlan ? (
                          <span className="text-4xl font-bold">฿0</span>
                        ) : (
                          <>
                            <span className="text-4xl font-bold">฿{plan.price.toLocaleString()}</span>
                            <span className="text-muted-foreground">
                              /{plan.billingCycle === 'yearly' ? 'ปี' : 'เดือน'}
                            </span>
                          </>
                        )}
                      </div>

                      {/* Savings Badge */}
                      {plan.savings && (
                        <div className="mt-2">
                          <Badge className="bg-green-100 text-green-700 border-0">
                            ประหยัด {plan.savings}%
                          </Badge>
                        </div>
                      )}
                    </div>

                    {/* Features */}
                    <div className="space-y-3 mb-8 flex-1">
                      {plan.features.slice(0, 6).map((feature, i) => (
                        <div key={i} className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center mt-0.5">
                            <Check className="w-3 h-3 text-purple-600" />
                          </div>
                          <span className="text-sm text-gray-700">{feature}</span>
                        </div>
                      ))}
                      {plan.features.length > 6 && (
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center mt-0.5">
                            <Sparkles className="w-3 h-3 text-purple-600" />
                          </div>
                          <span className="text-sm text-gray-700">+ อีก {plan.features.length - 6} ฟีเจอร์</span>
                        </div>
                      )}
                    </div>

                    {/* CTA Button */}
                    <Button
                      onClick={() => handleSelectPlan(plan)}
                      className={`w-full h-12 ${
                        isTeamPlan
                          ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700'
                          : plan.popular
                            ? 'bg-purple-600 hover:bg-purple-700'
                            : 'bg-gray-900 hover:bg-gray-800'
                      }`}
                      disabled={isCurrentPlan}
                    >
                      {isCurrentPlan ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          แผนปัจจุบัน
                        </>
                      ) : (
                        <>
                          {isFreePlan ? 'เริ่มต้นใช้ฟรี' : 'เลือกแผนนี้'}
                          <ChevronRight className="w-4 h-4 ml-2" />
                        </>
                      )}
                    </Button>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Comparison Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mb-16"
        >
          <Card className="p-8">
            <h2 className="text-2xl font-bold mb-8 text-center">เปรียบเทียบแผนทั้งหมด</h2>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-left py-4 px-4 font-semibold">ฟีเจอร์</th>
                    <th className="text-center py-4 px-4 font-semibold min-w-[120px]">
                      ฟรี
                    </th>
                    <th className="text-center py-4 px-4 font-semibold min-w-[120px] bg-purple-50">
                      <div className="flex flex-col items-center gap-1">
                        <span>Pro</span>
                        <Badge className="bg-purple-600 text-white text-xs">แนะนำ</Badge>
                      </div>
                    </th>
                    <th className="text-center py-4 px-4 font-semibold min-w-[120px] bg-gradient-to-br from-purple-50 to-pink-50">
                      <div className="flex flex-col items-center gap-1">
                        <span>Team</span>
                        <Badge className="bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs">ยอดนิยม</Badge>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { 
                      feature: 'BOQ ต่อเดือน', 
                      free: '1', 
                      pro: <div className="flex items-center justify-center gap-1"><Infinity className="w-4 h-4" /> ไม่จำกัด</div>, 
                      team: <div className="flex items-center justify-center gap-1"><Infinity className="w-4 h-4" /> ไม่จำกัด</div> 
                    },
                    { 
                      feature: 'ใบเสนอราคา', 
                      free: <X className="w-5 h-5 text-red-500 mx-auto" />, 
                      pro: <Check className="w-5 h-5 text-green-600 mx-auto" />, 
                      team: <Check className="w-5 h-5 text-green-600 mx-auto" /> 
                    },
                    { 
                      feature: 'ใบแจ้งหนี้ (Invoice)', 
                      free: <X className="w-5 h-5 text-red-500 mx-auto" />, 
                      pro: <Check className="w-5 h-5 text-green-600 mx-auto" />, 
                      team: <Check className="w-5 h-5 text-green-600 mx-auto" /> 
                    },
                    { 
                      feature: 'ใบกำกับภาษี/ใบเสร็จ', 
                      free: <X className="w-5 h-5 text-red-500 mx-auto" />, 
                      pro: <Check className="w-5 h-5 text-green-600 mx-auto" />, 
                      team: <Check className="w-5 h-5 text-green-600 mx-auto" /> 
                    },
                    { 
                      feature: 'จำนวนผู้ใช้งาน', 
                      free: '1', 
                      pro: '1', 
                      team: <div className="flex items-center justify-center gap-1"><Users className="w-4 h-4" /> 5 คน</div> 
                    },
                    { 
                      feature: 'พื้นที่จัดเก็บข้อมูล', 
                      free: '100 MB', 
                      pro: '5 GB', 
                      team: <strong>50 GB</strong> 
                    },
                    { 
                      feature: 'SmartBOQ (AI)', 
                      free: <X className="w-5 h-5 text-red-500 mx-auto" />, 
                      pro: <Check className="w-5 h-5 text-green-600 mx-auto" />, 
                      team: <Check className="w-5 h-5 text-green-600 mx-auto" /> 
                    },
                    { 
                      feature: 'รายงานและสถิติ', 
                      free: 'พื้นฐาน', 
                      pro: 'ครบถ้วน', 
                      team: <strong>ครบถ้วน + ทีม</strong> 
                    },
                    { 
                      feature: 'แชร์เทมเพลตในทีม', 
                      free: <X className="w-5 h-5 text-red-500 mx-auto" />, 
                      pro: <X className="w-5 h-5 text-red-500 mx-auto" />, 
                      team: <Check className="w-5 h-5 text-green-600 mx-auto" /> 
                    },
                    { 
                      feature: 'จัดการลูกค้า/พาร์ทเนอร์', 
                      free: <X className="w-5 h-5 text-red-500 mx-auto" />, 
                      pro: <Check className="w-5 h-5 text-green-600 mx-auto" />, 
                      team: <Check className="w-5 h-5 text-green-600 mx-auto" /> 
                    },
                    { 
                      feature: 'ระบบหัก ณ ที่จ่าย', 
                      free: <X className="w-5 h-5 text-red-500 mx-auto" />, 
                      pro: <Check className="w-5 h-5 text-green-600 mx-auto" />, 
                      team: <Check className="w-5 h-5 text-green-600 mx-auto" /> 
                    },
                    { 
                      feature: 'การสนับสนุน', 
                      free: <div className="flex items-center justify-center gap-1 text-xs"><Mail className="w-3 h-3" /> Email</div>, 
                      pro: <div className="flex items-center justify-center gap-1 text-xs"><Zap className="w-3 h-3" /> ลำดับสำคัญ</div>, 
                      team: <div className="flex items-center justify-center gap-1 text-xs"><Crown className="w-3 h-3" /> เฉพาะคุณ</div> 
                    },
                  ].map((row, i) => (
                    <motion.tr
                      key={i}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.6 + i * 0.05 }}
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                      <td className="py-3 px-4 text-sm font-medium">{row.feature}</td>
                      <td className="py-3 px-4 text-sm text-center">{row.free}</td>
                      <td className="py-3 px-4 text-sm text-center bg-purple-50">{row.pro}</td>
                      <td className="py-3 px-4 text-sm text-center bg-gradient-to-br from-purple-50 to-pink-50">
                        {row.team}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </motion.div>

        {/* Feature Highlight Grid - Bento Style */}
        <div className="grid md:grid-cols-4 gap-4 mb-16">
          {[
            { icon: Shield, title: 'ปลอดภัย 100%', desc: 'SSL/TLS + PCI DSS', color: 'from-green-500 to-emerald-500' },
            { icon: Zap, title: 'รวดเร็วทันใจ', desc: 'ระบบประมวลผลเร็ว', color: 'from-yellow-500 to-orange-500' },
            { icon: Users, title: '1,000+ ผู้ใช้', desc: 'ไว้วางใจเรา', color: 'from-blue-500 to-cyan-500' },
            { icon: Star, title: 'คะแนน 4.9/5', desc: 'จากผู้ใช้จริง', color: 'from-purple-500 to-pink-500' },
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + i * 0.1 }}
              whileHover={{ y: -4 }}
              className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-all cursor-default"
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center mb-4`}>
                <item.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-semibold mb-1">{item.title}</h3>
              <p className="text-sm text-muted-foreground">{item.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* Payment Methods - Compact */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <Card className="p-8 mb-16">
            <h2 className="text-2xl font-bold mb-6 text-center">ช่องทางการชำระเงิน</h2>
            
            <div className="grid md:grid-cols-3 gap-6">
              {/* Cards */}
              <div className="text-center">
                <div className="flex justify-center items-center gap-3 mb-3">
                  <img src={visaLogo} alt="Visa" className="h-8 object-contain" />
                  <img src={mastercardLogo} alt="Mastercard" className="h-10 object-contain" />
                  <Badge className="bg-blue-800 text-white">JCB</Badge>
                </div>
                <p className="text-sm text-muted-foreground">บัตรเครดิต/เดบิต</p>
              </div>

              {/* E-Wallets */}
              <div className="text-center">
                <div className="flex justify-center items-center gap-3 mb-3">
                  <img src={promptPayLogo} alt="PromptPay" className="h-8 object-contain" />
                  <img src={trueMoneyLogo} alt="TrueMoney" className="h-8 object-contain" />
                  <img src={rabbitLinePayLogo} alt="Rabbit LINE Pay" className="h-8 object-contain" />
                </div>
                <p className="text-sm text-muted-foreground">E-Wallet</p>
              </div>

              {/* Banking */}
              <div className="text-center">
                <div className="flex justify-center items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                    <Smartphone className="w-6 h-6 text-purple-600" />
                  </div>
                  <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">Mobile/Internet Banking</p>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t text-center">
              <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
                <Shield className="w-4 h-4 text-green-600" />
                <span>ปลอดภัยด้วย <strong className="text-purple-600">Omise (Opn)</strong> - มาตรฐาน PCI DSS Level 1</span>
              </p>
            </div>
          </Card>
        </motion.div>

        {/* FAQ - Compact */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <Card className="p-8 mb-16">
            <h2 className="text-2xl font-bold mb-6 text-center">คำถามที่พบบ่อย</h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              {[
                { q: 'ทำไมราคาถูก?', a: 'ราคาพิเศษปีแรกเพื่อให้ทุกคนเข้าถึงระบบ BOQ คุณภาพได้ง่าย' },
                { q: 'ยกเลิกได้ไหม?', a: 'ยกเลิกได้ทุกเมื่อ ไม่มีค่าปรับ ใช้งานได้จนครบรอบชำระเงิน' },
                { q: 'เปลี่ยนแผนได้ไหม?', a: 'อัพเกรดหรือดาวน์เกรดได้ทุกเมื่อ คำนวณค่าใช้จ่ายตามสัดส่วน' },
                { q: 'ข้อมูลปลอดภัยไหม?', a: 'เก็บบน Supabase มีระบบสำรองอัตโนมัติ เข้ารหัสด้วย SSL/TLS' },
              ].map((faq, i) => (
                <div key={i} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <h3 className="font-semibold mb-2">{faq.q}</h3>
                  <p className="text-sm text-muted-foreground">{faq.a}</p>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>

        {/* Payment History */}
        <AnimatePresence>
          {membership && membership.paymentHistory && membership.paymentHistory.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Card className="p-8">
                <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-purple-600" />
                  ประวัติการชำระเงิน
                </h2>
                
                <div className="space-y-3">
                  {membership.paymentHistory.slice(0, 5).map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div>
                        <p className="font-medium">{payment.planName || 'VIP Membership'}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(payment.date).toLocaleDateString('th-TH')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-purple-600">฿{payment.amount.toLocaleString()}</p>
                        <Badge className="bg-green-100 text-green-700 border-0">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          สำเร็จ
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Payment Dialog - Clean & Modern */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-white" />
              </div>
              <div>
                <div>ชำระเงิน - {selectedPlan?.name}</div>
                <p className="text-sm text-muted-foreground font-normal">เลือกวิธีการชำระเงินที่สะดวก</p>
              </div>
            </DialogTitle>
            <DialogDescription>
              เลือกวิธีการชำระเงินที่สะดวก และใส่รหัสส่วนลดถ้ามี
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Price Summary with Discount */}
            {selectedPlan && (
              <PriceSummaryWithDiscount
                planName={selectedPlan.name}
                billingCycle={selectedPlan.billingCycle}
                basePrice={selectedPlan.price}
                planSavings={selectedPlan.savings}
                validatedAffiliate={validatedAffiliate}
              />
            )}

            {/* Promo/Affiliate Code Section */}
            <PromoCodeSection
              onCodeValidated={setValidatedAffiliate}
              validatedAffiliate={validatedAffiliate}
              discountAmount={selectedPlan && validatedAffiliate ? calculateFinalPrice(selectedPlan.price).discount : undefined}
            />

            {/* Payment Methods */}
            <div className="space-y-3">
              <Label className="text-base">เลือกวิธีการชำระเงิน</Label>
              
              <div className="grid gap-3">
                {/* PromptPay */}
                <button
                  onClick={() => setPaymentMethod('promptpay')}
                  className={`p-4 border-2 rounded-xl flex items-center gap-4 transition-all ${
                    paymentMethod === 'promptpay'
                      ? 'border-purple-600 bg-purple-50'
                      : 'border-gray-200 hover:border-purple-300'
                  }`}
                >
                  <img src={promptPayLogo} alt="PromptPay" className="w-12 h-12 object-contain" />
                  <div className="text-left flex-1">
                    <p className="font-medium">PromptPay</p>
                    <p className="text-xs text-muted-foreground">สแกน QR จ่ายผ่านแอปธนาคาร</p>
                  </div>
                  {paymentMethod === 'promptpay' && (
                    <div className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}
                </button>

                {/* Credit Card */}
                <button
                  onClick={() => setPaymentMethod('credit_card')}
                  className={`p-4 border-2 rounded-xl flex items-center gap-4 transition-all ${
                    paymentMethod === 'credit_card'
                      ? 'border-purple-600 bg-purple-50'
                      : 'border-gray-200 hover:border-purple-300'
                  }`}
                >
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
                    <CreditCard className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-left flex-1">
                    <p className="font-medium">บัตรเครดิต/เดบิต</p>
                    <div className="flex gap-2 mt-2">
                      <img src={visaLogo} alt="Visa" className="h-5 object-contain" />
                      <img src={mastercardLogo} alt="Mastercard" className="h-6 object-contain" />
                      <Badge className="bg-blue-800 text-white text-xs border-0">JCB</Badge>
                    </div>
                  </div>
                  {paymentMethod === 'credit_card' && (
                    <div className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}
                </button>

                {/* Other Methods */}
                <details className="group">
                  <summary className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                    <span className="text-sm font-medium">ช่องทางอื่นๆ</span>
                    <ChevronRight className="w-4 h-4 group-open:rotate-90 transition-transform" />
                  </summary>
                  
                  <div className="mt-2 space-y-2 pl-2">
                    {[
                      { id: 'rabbit_linepay', logo: rabbitLinePayLogo, name: 'Rabbit LINE Pay' },
                      { id: 'truemoney', logo: trueMoneyLogo, name: 'TrueMoney Wallet' },
                    ].map((method) => (
                      <button
                        key={method.id}
                        onClick={() => setPaymentMethod(method.id as any)}
                        className={`w-full p-3 border rounded-lg flex items-center gap-3 transition-all ${
                          paymentMethod === method.id
                            ? 'border-purple-600 bg-purple-50'
                            : 'border-gray-200 hover:border-purple-300'
                        }`}
                      >
                        <img src={method.logo} alt={method.name} className="h-8 object-contain" />
                        <span className="text-sm flex-1 text-left">{method.name}</span>
                        {paymentMethod === method.id && <Check className="w-4 h-4 text-purple-600" />}
                      </button>
                    ))}
                  </div>
                </details>
              </div>
            </div>

            {/* Security Notice */}
            <div className="bg-green-50 border border-green-200 p-4 rounded-xl">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium text-green-900 mb-1">ปลอดภัย 100%</h4>
                  <p className="text-sm text-green-700">
                    ชำระเงินผ่าน <strong>Omise (Opn)</strong> มาตรฐาน PCI DSS Level 1
                  </p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-3">
            <Button 
              variant="outline" 
              onClick={() => setIsPaymentDialogOpen(false)}
              disabled={isProcessing}
            >
              ยกเลิก
            </Button>
            <Button 
              onClick={handlePayment}
              className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <motion.div
                    className="w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: 999999, ease: "linear" }}
                  />
                  กำลังประมวลผล...
                </>
              ) : (
                <>
                  ชำระเงิน ฿{selectedPlan?.price.toLocaleString()}
                  <ChevronRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
