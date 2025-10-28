import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
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
  TrendingUp,
  Shield,
  Award,
  Users,
  FileText,
  Clock,
  HelpCircle,
  Star,
  Infinity as InfinityIcon,
  Mail,
  Phone,
} from 'lucide-react';

const Infinity = InfinityIcon;
import { Membership, MembershipTier, MembershipPlan, PaymentRecord, BillingCycle } from '../types/boq';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface MembershipPageProps {
  onBack: () => void;
  user: SupabaseUser | null;
}

// Plans Configuration - ราคาพิเศษปีแรก!
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
    name: 'เดี่ยว',
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
    name: 'เดี่ยว',
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
      '✨ ประหยัด 17% (฿258)',
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
    name: 'ทีม',
    price: 499,
    billingCycle: 'monthly',
    features: [
      '👥 5 ที่นั่งในทีม',
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
    name: 'ทีม',
    price: 4990,
    billingCycle: 'yearly',
    savings: 17,
    features: [
      '👥 5 ที่นั่งในทีม',
      'สร้าง BOQ ไม่จำกัด',
      'ใบเสนอราคา + ใบแจ้งหนี้',
      'ใบกำกับภาษี/ใบเสร็จ',
      'อัพโหลดโลโก้และ QR Code',
      'จัดการลูกค้าและพาร์ทเนอร์',
      'ระบบหัก ณ ที่จ่าย',
      'รายงานและสถิติแบบทีม',
      'แชร์เทมเพลตภายในทีม',
      '✨ ประหยัด 17% (฿998)',
      '🎁 รับฟีเจอร์พิเศษก่อนใคร',
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
  const [qrCodeFile, setQrCodeFile] = useState<File | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'promptpay' | 'credit_card' | 'bank_transfer'>('promptpay');

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

    try {
      // In production, integrate with payment gateway
      const paymentRecord: PaymentRecord = {
        id: `payment-${Date.now()}`,
        amount: selectedPlan.price,
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

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-6e95bca3/membership`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify(updatedMembership),
        }
      );

      if (response.ok) {
        toast.success(`🎉 อัพเกรดเป็น ${selectedPlan.name} สำเร็จ!`);
        setIsPaymentDialogOpen(false);
        setSelectedPlan(null);
        loadMembership();
      } else {
        throw new Error('Failed to upgrade');
      }
    } catch (error) {
      console.error('Payment failed:', error);
      toast.error('การชำระเงินล้มเหลว กรุณาลองใหม่อีกครั้ง');
    }
  };

  const getCurrentPlan = (): MembershipPlan => {
    return MEMBERSHIP_PLANS.find(p => p.tier === membership?.tier) || MEMBERSHIP_PLANS[0];
  };

  const getDisplayPlans = () => {
    // Always show free plan
    const freePlan = MEMBERSHIP_PLANS.find(p => p.tier === 'free');
    
    // Get individual plan based on billing cycle
    const individualPlan = MEMBERSHIP_PLANS.find(p => 
      p.tier === (isYearly ? 'individual_year' : 'individual_month')
    );
    
    // Get team plan based on billing cycle
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
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <Crown className="w-16 h-16 text-purple-500 mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  const currentPlan = getCurrentPlan();
  const daysRemaining = getDaysRemaining();

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <Crown className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl">สมาชิก VIP</h1>
                  <p className="text-muted-foreground">
                    เลือกแผนที่เหมาะกับคุณ
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Current Plan Status */}
        {membership && membership.tier !== 'free' && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <Card className="p-6 bg-gradient-to-r from-purple-500 to-pink-500 text-white">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <Star className="w-8 h-8" />
                  </div>
                  <div>
                    <p className="text-sm opacity-90">แผนปัจจุบันของคุณ</p>
                    <h2 className="text-2xl mb-1">{currentPlan.name}</h2>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        เหลืออีก {daysRemaining} วัน
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {currentPlan.limits.users} ที่นั่ง
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-3xl">{formatPrice(currentPlan.price, currentPlan.billingCycle)}</p>
                  <p className="text-sm opacity-90">
                    ต่ออายุอัตโนมัติ: {membership.autoRenew ? 'เปิด' : 'ปิด'}
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Special Offer Badge */}
        <div className="flex justify-center mb-6">
          <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-6 py-2 text-base">
            🔥 ราคาพิเศษปีแรก! ลดสูงสุด 35%
          </Badge>
        </div>

        {/* Billing Toggle */}
        <div className="flex justify-center mb-8">
          <Card className="p-2 inline-flex items-center gap-4">
            <span className={`text-sm ${!isYearly ? 'font-semibold' : 'text-muted-foreground'}`}>
              รายเดือน
            </span>
            <Switch
              checked={isYearly}
              onCheckedChange={setIsYearly}
            />
            <span className={`text-sm ${isYearly ? 'font-semibold' : 'text-muted-foreground'}`}>
              รายปี
              <Badge variant="secondary" className="ml-2 bg-green-100 text-green-700">
                ประหยัด 17%
              </Badge>
            </span>
          </Card>
        </div>

        {/* Pricing Cards - 3 Columns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {getDisplayPlans().map((plan, index) => {
            const isTeamPlan = plan.tier.startsWith('team');
            const isFreePlan = plan.tier === 'free';
            
            return (
              <motion.div
                key={plan.tier}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={isTeamPlan ? 'md:transform md:scale-105' : ''}
              >
                <Card className={`p-6 relative h-full flex flex-col ${
                  isTeamPlan
                    ? 'bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white border-2 border-purple-400 shadow-2xl'
                    : plan.popular 
                      ? 'border-2 border-purple-500 shadow-xl' 
                      : 'border'
                }`}>
                  {/* Background Pattern for Team Plan */}
                  {isTeamPlan && (
                    <div className="absolute inset-0 opacity-10 rounded-lg overflow-hidden">
                      <div className="absolute inset-0" style={{
                        backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
                        backgroundSize: '20px 20px'
                      }} />
                    </div>
                  )}

                  {/* Popular Badge */}
                  {plan.popular && !isTeamPlan && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-1">
                        ⭐ แนะนำ
                      </Badge>
                    </div>
                  )}

                  {/* Team Badge */}
                  {isTeamPlan && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-slate-900 px-4 py-1">
                        👥 สำหรับทีม
                      </Badge>
                    </div>
                  )}

                  <div className="relative z-10 flex-1 flex flex-col">
                    {/* Header */}
                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className={`text-2xl ${isTeamPlan ? 'text-white' : ''}`}>
                          {plan.name}
                        </h3>
                        {plan.limits.users > 1 && (
                          <Badge variant="outline" className={`gap-1 ${
                            isTeamPlan ? 'border-white/30 text-white bg-white/10' : ''
                          }`}>
                            <Users className="w-3 h-3" />
                            {plan.limits.users}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-baseline gap-1">
                        {isFreePlan ? (
                          <span className="text-4xl">ฟรี</span>
                        ) : (
                          <>
                            <span className="text-4xl">฿{plan.price.toLocaleString()}</span>
                            <span className={isTeamPlan ? 'text-white/70' : 'text-muted-foreground'}>
                              /{plan.billingCycle === 'yearly' ? 'ปี' : 'เดือน'}
                            </span>
                          </>
                        )}
                      </div>

                      {plan.savings && (
                        <p className={`text-sm mt-1 ${
                          isTeamPlan ? 'text-green-300' : 'text-green-600'
                        }`}>
                          💰 ประหยัด {plan.savings}% (
                          {plan.tier === 'individual_year' && '฿258'}
                          {plan.tier === 'team_year' && '฿998'})
                        </p>
                      )}
                    </div>

                    {/* Features */}
                    <div className="space-y-3 mb-6 flex-1">
                      {plan.features.map((feature, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <Check className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                            isTeamPlan ? 'text-green-400' : 'text-green-500'
                          }`} />
                          <span className={`text-sm ${isTeamPlan ? 'text-white/90' : ''}`}>
                            {feature}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Limits */}
                    <div className={`space-y-2 mb-6 p-3 rounded-lg ${
                      isTeamPlan ? 'bg-white/10 backdrop-blur-sm' : 'bg-gray-50'
                    }`}>
                      <div className="flex justify-between text-sm">
                        <span className={isTeamPlan ? 'text-white/70' : 'text-muted-foreground'}>
                          BOQ ต่อเดือน:
                        </span>
                        <span className={isTeamPlan ? 'text-white font-semibold' : 'font-semibold'}>
                          {plan.limits.boqPerMonth === 'unlimited' ? (
                            <span className="flex items-center gap-1">
                              <Infinity className="w-4 h-4" /> ไม่จำกัด
                            </span>
                          ) : (
                            plan.limits.boqPerMonth
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className={isTeamPlan ? 'text-white/70' : 'text-muted-foreground'}>
                          พื้นที่เก็บข้อมูล:
                        </span>
                        <span className={isTeamPlan ? 'text-white font-semibold' : 'font-semibold'}>
                          {plan.limits.storage}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className={isTeamPlan ? 'text-white/70' : 'text-muted-foreground'}>
                          การสนับสนุน:
                        </span>
                        <span className={isTeamPlan ? 'text-white font-semibold' : 'font-semibold'}>
                          {plan.limits.support === 'email' && '📧 Email'}
                          {plan.limits.support === 'priority' && '⚡ ลำดับสำคัญ'}
                          {plan.limits.support === 'dedicated' && '👑 เฉพาะคุณ'}
                        </span>
                      </div>
                    </div>

                    {/* CTA Button */}
                    <Button
                      onClick={() => handleSelectPlan(plan)}
                      className={`w-full ${
                        isTeamPlan
                          ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-slate-900 hover:from-yellow-500 hover:to-orange-600'
                          : plan.popular
                            ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600'
                            : ''
                      }`}
                      size="lg"
                      disabled={membership?.tier === plan.tier}
                    >
                      {membership?.tier === plan.tier ? (
                        '✓ แผนปัจจุบัน'
                      ) : (
                        <>
                          {isFreePlan ? (
                            <>ทดลองใช้ฟรี</>
                          ) : (
                            <>
                              <Zap className="w-4 h-4 mr-2" />
                              เลือกแผนนี้
                            </>
                          )}
                        </>
                      )}
                    </Button>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* FAQ Section */}
        <Card className="p-8 mb-8">
          <h2 className="text-2xl mb-6 flex items-center gap-2">
            <HelpCircle className="w-6 h-6 text-purple-500" />
            คำถามที่พบบ่อย
          </h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-2">🔥 ทำไมราคาถูกมาก?</h3>
              <p className="text-sm text-muted-foreground">
                นี่คือ<strong> ราคาพิเศษปีแรก</strong> เพื่อให้ทุกคนเข้าถึงระบบ BOQ คุณภาพได้ง่ายขึ้น 
                เมื่อระบบเสถียรจะค่อยปรับราคาตามความเหมาะสม
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">📦 แผนทีมคืออะไร?</h3>
              <p className="text-sm text-muted-foreground">
                แผนทีมให้คุณเพิ่มสมาชิกในทีมได้สูงสุด 5 คน สามารถแชร์เทมเพลต เอกสาร และดูรายงานร่วมกันได้
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">💳 ชำระเงินอย่างไร?</h3>
              <p className="text-sm text-muted-foreground">
                รับชำระผ่าน PromptPay QR Code, บัตรเครดิต/เดบิต และการโอนเงิน
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">🔄 ยกเลิกได้ไหม?</h3>
              <p className="text-sm text-muted-foreground">
                สามารถยกเลิกได้ทุกเมื่อ ไม่มีค่าปรับ แต่ใช้งานได้จนครบรอบชำระเงิน
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">⬆️ เปลี่ยนแผนได้ไหม?</h3>
              <p className="text-sm text-muted-foreground">
                สามารถอัพเกรดหรือดาวน์เกรดแผนได้ทุกเมื่อ ค่าใช้จ่ายจะถูกคำนวณตามสัดส่วน
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">💾 ข้อมูลปลอดภัยไหม?</h3>
              <p className="text-sm text-muted-foreground">
                ข้อมูลทั้งหมดเก็บบน Supabase (Postgres) มีระบบสำรองข้อมูลอัตโนมัติ และเข้ารหัสด้วย SSL/TLS
              </p>
            </div>
          </div>
        </Card>

        {/* Payment History */}
        {membership && membership.paymentHistory && membership.paymentHistory.length > 0 && (
          <Card className="p-6">
            <h2 className="text-xl mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-purple-500" />
              ประวัติการชำระเงิน
            </h2>
            
            <div className="space-y-3">
              {membership.paymentHistory.slice(0, 5).map((payment) => (
                <div key={payment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-semibold">{payment.planName || 'VIP Membership'}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(payment.date).toLocaleDateString('th-TH', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg">฿{payment.amount.toLocaleString()}</p>
                    <Badge variant={payment.status === 'completed' ? 'default' : 'secondary'}>
                      {payment.status === 'completed' ? '✓ สำเร็จ' : payment.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              ชำระเงิน - {selectedPlan?.name}
            </DialogTitle>
            <DialogDescription>
              เลือกวิธีการชำระเงินที่สะดวกสำหรับคุณ
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Price Summary */}
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-lg border border-purple-200">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-muted-foreground">แผนที่เลือก:</span>
                <span className="font-semibold">{selectedPlan?.name}</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-muted-foreground">ระยะเวลา:</span>
                <span className="font-semibold">
                  {selectedPlan?.billingCycle === 'yearly' ? '1 ปี' : '1 เดือน'}
                </span>
              </div>
              {selectedPlan?.savings && (
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-green-600">ส่วนลด:</span>
                  <span className="font-semibold text-green-600">
                    -{selectedPlan.savings}%
                  </span>
                </div>
              )}
              <div className="border-t border-purple-200 mt-3 pt-3 flex justify-between items-center">
                <span className="font-semibold">ยอดชำระทั้งหมด:</span>
                <span className="text-2xl text-purple-600">
                  ฿{selectedPlan?.price.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Payment Method Selection */}
            <div className="space-y-3">
              <Label>เลือกวิธีการชำระเงิน</Label>
              
              <div className="grid gap-3">
                <button
                  onClick={() => setPaymentMethod('promptpay')}
                  className={`p-4 border-2 rounded-lg flex items-center gap-3 transition-all ${
                    paymentMethod === 'promptpay'
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-purple-300'
                  }`}
                >
                  <QrCode className="w-6 h-6 text-purple-500" />
                  <div className="text-left flex-1">
                    <p className="font-semibold">PromptPay QR Code</p>
                    <p className="text-xs text-muted-foreground">
                      สแกน QR จ่ายผ่านแอปธนาคาร
                    </p>
                  </div>
                  {paymentMethod === 'promptpay' && (
                    <Check className="w-5 h-5 text-purple-500" />
                  )}
                </button>

                <button
                  onClick={() => setPaymentMethod('credit_card')}
                  className={`p-4 border-2 rounded-lg flex items-center gap-3 transition-all ${
                    paymentMethod === 'credit_card'
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-purple-300'
                  }`}
                >
                  <CreditCard className="w-6 h-6 text-purple-500" />
                  <div className="text-left flex-1">
                    <p className="font-semibold">บัตรเครดิต/เดบิต</p>
                    <p className="text-xs text-muted-foreground">
                      Visa, MasterCard, JCB
                    </p>
                  </div>
                  {paymentMethod === 'credit_card' && (
                    <Check className="w-5 h-5 text-purple-500" />
                  )}
                </button>

                <button
                  onClick={() => setPaymentMethod('bank_transfer')}
                  className={`p-4 border-2 rounded-lg flex items-center gap-3 transition-all ${
                    paymentMethod === 'bank_transfer'
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-purple-300'
                  }`}
                >
                  <TrendingUp className="w-6 h-6 text-purple-500" />
                  <div className="text-left flex-1">
                    <p className="font-semibold">โอนเงินผ่านธนาคาร</p>
                    <p className="text-xs text-muted-foreground">
                      โอนเงินแล้วแนบสลิป
                    </p>
                  </div>
                  {paymentMethod === 'bank_transfer' && (
                    <Check className="w-5 h-5 text-purple-500" />
                  )}
                </button>
              </div>
            </div>

            {/* Demo Notice */}
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-700">
                💡 <strong>โหมดทดสอบ:</strong> การชำระเงินจะเป็นไปอัตโนมัติในเวอร์ชันนี้
                ในเวอร์ชันจริงจะเชื่อมต่อกับ Payment Gateway
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>
              ยกเลิก
            </Button>
            <Button 
              onClick={handlePayment}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              ชำระเงิน ฿{selectedPlan?.price.toLocaleString()}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
