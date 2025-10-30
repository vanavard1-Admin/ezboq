import { useState, useEffect, useMemo, useCallback } from 'react';
import { api } from '../utils/api';
import { motion, AnimatePresence } from "motion/react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Badge } from "./ui/badge";
import type { User } from "@supabase/supabase-js";
import { 
  TrendingUp, 
  TrendingDown, 
  FileText, 
  DollarSign, 
  Users,
  Crown,
  Calendar,
  BarChart3,
  Plus,
  UserPlus,
  FileEdit,
  Handshake,
  Zap,
  ArrowUp,
  Activity,
  Target,
  Award,
  Clock,
  Star,
  Quote,
  Building2,
  Sparkles,
  CheckCircle,
  ArrowRight,
  TrendingUpIcon,
  Rocket,
  Shield,
  CircleDollarSign,
  Briefcase,
  TrendingDownIcon,
  Eye,
  Timer,
} from "lucide-react";
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart,
  RadialBarChart,
  RadialBar,
} from "recharts";
import { UserProfile, Membership } from "../types/boq";
import { isDemoMode } from "../utils/demoStorage";
import { toast } from "sonner@2.0.3";

interface DashboardProps {
  onLogout: () => void;
  onStartBOQ: () => void;
  onOpenProfile: () => void;
  onOpenCustomers: () => void;
  onOpenPartners: () => void;
  onOpenHistory: () => void;
  user: User | null;
}

// Reviews Data
const REVIEWS = [
  {
    id: 1,
    name: "คุณสมชาย ใจดี",
    company: "บริษัท รับเหมาก่อสร้าง ABC จำกัด",
    role: "ผู้จัดการโครงการ",
    rating: 5,
    comment: "ระบบ EZ BOQ ช่วยประหยัดเวลาทำเอกสารได้มากกว่า 70% ตอนนี้สามารถออกใบเสนอราคาได้ภายใน 15 นาที ทีมงานชอบมาก!",
    avatar: "SC",
    date: "3 วันที่แล้ว",
    gradient: "from-blue-500 to-cyan-500",
  },
  {
    id: 2,
    name: "คุณวิภา สร้างสรรค์",
    company: "ห้างหุ้นส่วน วิภาคอนสตรัคชั่น",
    role: "เจ้าของกิจการ",
    rating: 5,
    comment: "SmartBOQ ช่วยประเมินราคาได้แม่นยำมาก ลดความผิดพลาดในการคำนวณ และระบบใบกำกับภาษีครบถ้วนตามกฎหมาย ประทับใจสุดๆ!",
    avatar: "VS",
    date: "1 สัปดาห์ที่แล้ว",
    gradient: "from-purple-500 to-pink-500",
  },
  {
    id: 3,
    name: "คุณประยุทธ์ มั่นคง",
    company: "บริษัท เอ็นจิเนียริ่ง โซลูชั่น จำกัด",
    role: "วิศวกรโครงสร้าง",
    rating: 5,
    comment: "Catalog 900+ รายการครบทุกอย่าง ไม่ต้องเสียเวลาหาข้อมูล แค่เลือกแล้วคำนวณอัตโนมัติ ตอนนี้ทำงานได้เร็วขึ้นเป็นเท่าตัว!",
    avatar: "PM",
    date: "2 สัปดาห์ที่แล้ว",
    gradient: "from-orange-500 to-red-500",
  },
  {
    id: 4,
    name: "คุณสุดา ชัยชนะ",
    company: "ห้างหุ้นส่วน ชัยชนะ ดีไซน์",
    role: "สถาปนิก",
    rating: 5,
    comment: "ระบบแบ่งงวดชำระเงินและ QR Code PromptPay ทำให้ลูกค้าจ่ายเงินง่ายขึ้น เก็บเงินได้เร็วขึ้นมาก ระบบครบจบในที่เดียวจริงๆ!",
    avatar: "SD",
    date: "3 สัปดาห์ที่แล้ว",
    gradient: "from-green-500 to-emerald-500",
  },
];

export function Dashboard({ 
  onLogout, 
  onStartBOQ, 
  onOpenProfile,
  onOpenCustomers,
  onOpenPartners,
  onOpenHistory,
  user 
}: DashboardProps) {
  console.log('🎨 Dashboard component mounted with user:', user?.email);
  
  const [stats, setStats] = useState({
    totalProjects: 0,
    totalRevenue: 0,
    totalProfit: 0,
    avgProjectValue: 0,
  });
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState<any>({
    monthlyRevenue: [],
    projectTypes: []
  });

  useEffect(() => {
    const loadData = async () => {
      console.log('📊 Starting to load dashboard data...');
      setLoading(true);
      
      try {
        // ⚡ NUCLEAR MODE: Load only essential data in parallel
        await Promise.all([
          loadUserData(),
          loadAnalytics(),
          loadStats() // Load stats from analytics only, no documents query
        ]);
        console.log('✅ All dashboard data loaded successfully!');
      } catch (error) {
        console.error('❌ Error loading dashboard data:', error);
      } finally {
        setLoading(false);
        console.log('✅ Dashboard loading complete');
      }
    };
    
    if (user?.id) {
      loadData();
    } else {
      console.log('⚠️ No user, skipping data load');
      setLoading(false);
    }
  }, [user?.id]); // ✅ FIX: Only re-run when user ID changes, not on every user object change

  const loadUserData = async () => {
    if (!user) {
      console.log('⚠️ No user found in loadUserData');
      return;
    }

    try {
      // ✅ ALWAYS load real user profile data
      console.log('👤 Loading real user profile for:', user.email);
      const response = await api.get(`/profile/${user.id}`);

      if (response.ok) {
        try {
          const data = await response.json();
          console.log('✅ User profile loaded:', data);
          setProfile(data.profile);
          setMembership(data.membership);
        } catch (jsonError) {
          console.error('❌ Failed to parse profile JSON:', jsonError);
          // ✅ FIX: Try localStorage first before using fallback
          const localStorageKey = `boq_profile_${user.id}`;
          const localMembershipKey = `boq_membership_${user.id}`;
          const storedProfile = localStorage.getItem(localStorageKey);
          const storedMembership = localStorage.getItem(localMembershipKey);
          
          if (storedProfile) {
            setProfile(JSON.parse(storedProfile));
            console.log('✅ Loaded profile from localStorage (parse error fallback)');
          } else {
            // Last resort: use minimal default
            setProfile({
              name: user.user_metadata?.name || '',
              email: user.email || '',
              companyName: '',
              address: '',
              phone: '',
              taxId: '',
              wastagePercentage: 3,
              operationPercentage: 5,
            });
          }
          
          if (storedMembership) {
            setMembership(JSON.parse(storedMembership));
            console.log('✅ Loaded membership from localStorage (parse error fallback)');
          } else {
            // ✅ FIX: Use 'tier' instead of 'plan'
            setMembership({ tier: 'free', expiresAt: null, features: [] });
          }
        }
      } else {
        console.warn('⚠️ Profile API failed, using localStorage fallback');
        // ✅ FIX: Try localStorage first before using fallback
        const localStorageKey = `boq_profile_${user.id}`;
        const localMembershipKey = `boq_membership_${user.id}`;
        const storedProfile = localStorage.getItem(localStorageKey);
        const storedMembership = localStorage.getItem(localMembershipKey);
        
        if (storedProfile) {
          setProfile(JSON.parse(storedProfile));
          console.log('✅ Loaded profile from localStorage (API failed)');
        } else {
          // Last resort: set minimal profile
          setProfile({
            name: user.user_metadata?.name || '',
            email: user.email || '',
            companyName: '',
            address: '',
            phone: '',
            taxId: '',
            wastagePercentage: 3,
            operationPercentage: 5,
            errorPercentage: 2,
            profitPercentage: 10,
            bankName: '',
            bankAccountNumber: '',
            bankAccountName: '',
            promptpayQR: '',
          });
        }
        
        if (storedMembership) {
          setMembership(JSON.parse(storedMembership));
          console.log('✅ Loaded membership from localStorage (API failed)');
        } else {
          // ✅ FIX: Use 'tier' instead of 'plan'
          setMembership({
            tier: 'free',
            expiresAt: null,
            features: [],
          });
        }
      }
    } catch (error) {
      console.error("Failed to load user data:", error);
    }
  };

  const loadStats = async () => {
    try {
      // ✅ ALWAYS load real data from Analytics API (same as Reports page)
      console.log('📊 Loading analytics data for Dashboard stats...');
      const analyticsResponse = await api.get('/analytics?range=month').catch(err => {
        console.log('⚡ Analytics loading (may use cache or warmup):', err.message);
        return null;
      });
      
      if (analyticsResponse?.ok) {
        try {
          const analytics = await analyticsResponse.json();
          
          // Use analytics data for stats (consistent with Reports page)
          const newStats = {
            totalProjects: analytics.totalProjects || 0,
            totalRevenue: analytics.totalRevenue || 0,
            totalProfit: analytics.netProfitAfterTax || analytics.grossProfit || 0,
            avgProjectValue: analytics.averageProjectValue || 0,
          };
          
          console.log('✅ Dashboard stats loaded:', newStats.totalProjects > 0 ? 'with data' : 'empty (new user or cache warming up)');
          setStats(newStats);
        } catch (jsonError) {
          console.error('❌ Failed to parse analytics JSON:', jsonError);
          setStats({
            totalProjects: 0,
            totalRevenue: 0,
            totalProfit: 0,
            avgProjectValue: 0,
          });
        }
      } else {
        console.log('⚡ Analytics loading... (cache warmup in progress or new user)');
        // Set empty stats gracefully (normal for new users or during warmup)
        setStats({
          totalProjects: 0,
          totalRevenue: 0,
          totalProfit: 0,
          avgProjectValue: 0,
        });
      }
    } catch (error) {
      console.error("❌ Failed to load analytics:", error);
      // On error, set stats to 0 (graceful degradation - no fake data)
      setStats({
        totalProjects: 0,
        totalRevenue: 0,
        totalProfit: 0,
        avgProjectValue: 0,
      });
    }
  };

  const loadAnalytics = async () => {
    try {
      // ✅ ALWAYS load real data from Analytics API
      console.log('📊 Loading analytics charts data...');
      const response = await api.get('/analytics?range=6months').catch(err => {
        console.log('⚡ Analytics charts loading (may use cache or warmup)');
        return null;
      });
      
      if (response?.ok) {
        try {
          const data = await response.json();
          console.log('✅ Analytics charts loaded:', data.revenueByMonth?.length > 0 ? 'with data' : 'empty (new user or cache warming up)');
          
          // Calculate trends from month-over-month data
          const revenueByMonth = data.revenueByMonth || [];
          let projectTrend = null;
          let revenueTrend = null;
          let profitTrend = null;
          let avgProjectTrend = null;
          
          if (revenueByMonth.length >= 2) {
            const currentMonth = revenueByMonth[revenueByMonth.length - 1];
            const previousMonth = revenueByMonth[revenueByMonth.length - 2];
            
            // Calculate percentage changes (only if previous month had data)
            if (previousMonth.projects > 0 && currentMonth.projects !== previousMonth.projects) {
              projectTrend = ((currentMonth.projects - previousMonth.projects) / previousMonth.projects) * 100;
            }
            if (previousMonth.revenue > 0 && currentMonth.revenue !== previousMonth.revenue) {
              revenueTrend = ((currentMonth.revenue - previousMonth.revenue) / previousMonth.revenue) * 100;
            }
            if (previousMonth.netIncome > 0 && currentMonth.netIncome !== previousMonth.netIncome) {
              profitTrend = ((currentMonth.netIncome - previousMonth.netIncome) / previousMonth.netIncome) * 100;
            }
            
            // Calculate avg project value trend
            const currentAvg = currentMonth.projects > 0 ? currentMonth.revenue / currentMonth.projects : 0;
            const previousAvg = previousMonth.projects > 0 ? previousMonth.revenue / previousMonth.projects : 0;
            if (previousAvg > 0 && currentAvg !== previousAvg) {
              avgProjectTrend = ((currentAvg - previousAvg) / previousAvg) * 100;
            }
          }
          
          // Ensure the data has required fields with safe defaults
          setAnalyticsData({
            monthlyRevenue: revenueByMonth,
            projectTypes: data.projectTypes || [],
            projectTrend,
            revenueTrend,
            profitTrend,
            avgProjectTrend,
            ...data
          });
        } catch (jsonError) {
          console.error('❌ Failed to parse analytics charts JSON:', jsonError);
          setAnalyticsData({
            monthlyRevenue: [],
            projectTypes: [],
            projectTrend: null,
            revenueTrend: null,
            profitTrend: null,
            avgProjectTrend: null,
          });
        }
      } else {
        console.log('⚡ Analytics charts loading... (cache warmup in progress or new user)');
        // Set empty data structure gracefully (normal for new users or during warmup)
        setAnalyticsData({
          monthlyRevenue: [],
          projectTypes: [],
          projectTrend: null,
          revenueTrend: null,
          profitTrend: null,
          avgProjectTrend: null,
        });
      }
    } catch (error) {
      console.error("❌ Failed to load analytics charts:", error);
      // Set empty data structure instead of null
      setAnalyticsData({
        monthlyRevenue: [],
        projectTypes: [],
        projectTrend: null,
        revenueTrend: null,
        profitTrend: null,
        avgProjectTrend: null,
      });
    }
  };

  const getInitials = useCallback((name: string) => {
    if (!name) return "U";
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }, []);

  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }, []);

  // Memoize profit margin calculation
  const profitMargin = useMemo(() => {
    return stats.totalRevenue > 0 
      ? ((stats.totalProfit / stats.totalRevenue) * 100).toFixed(1)
      : 0;
  }, [stats.totalRevenue, stats.totalProfit]);

  // Memoize stats cards data
  const statsCards = useMemo(() => [
    {
      icon: Briefcase,
      label: "โครงการทั้งหมด",
      value: stats.totalProjects.toLocaleString(),
      subtitle: "โครงการที่ทำ",
      trendValue: analyticsData?.projectTrend,
      gradient: "from-blue-500 to-cyan-400",
      delay: 0.5,
    },
    {
      icon: CircleDollarSign,
      label: "รายได้รวม",
      value: formatCurrency(stats.totalRevenue),
      subtitle: "มูลค่ารวมทั้งหมด",
      trendValue: analyticsData?.revenueTrend,
      gradient: "from-green-500 to-emerald-400",
      delay: 0.6,
    },
    {
      icon: TrendingUpIcon,
      label: "กำไรสุทธิ",
      value: formatCurrency(stats.totalProfit),
      subtitle: `${profitMargin}% Margin`,
      trendValue: analyticsData?.profitTrend,
      gradient: "from-purple-500 to-pink-400",
      delay: 0.7,
    },
    {
      icon: Target,
      label: "มูลค่าเฉลี่ย",
      value: formatCurrency(stats.avgProjectValue),
      subtitle: "ต่อโครงการ",
      trendValue: analyticsData?.avgProjectTrend,
      gradient: "from-orange-500 to-red-400",
      delay: 0.8,
    },
  ], [stats, analyticsData, formatCurrency, profitMargin]);

  // Memoize quick actions data
  const quickActions = useMemo(() => [
    { 
      icon: Plus, 
      label: "สร้าง BOQ", 
      subtitle: "เริ่มโครงการใหม่",
      gradient: "from-blue-600 to-cyan-500", 
      onClick: onStartBOQ,
      glow: "shadow-blue-500/50",
    },
    { 
      icon: UserPlus, 
      label: "ลูกค้า", 
      subtitle: "จัดการข้อมูล",
      gradient: "from-green-600 to-emerald-500", 
      onClick: onOpenCustomers,
      glow: "shadow-green-500/50",
    },
    { 
      icon: Handshake, 
      label: "พาร์ทเนอร์", 
      subtitle: "ผู้ร่วมงาน",
      gradient: "from-orange-600 to-red-500", 
      onClick: onOpenPartners,
      glow: "shadow-orange-500/50",
    },
    { 
      icon: FileText, 
      label: "ประวัติ", 
      subtitle: "เอกสารทั้งหมด",
      gradient: "from-purple-600 to-pink-500", 
      onClick: onOpenHistory,
      glow: "shadow-purple-500/50",
    },
  ], [onStartBOQ, onOpenCustomers, onOpenPartners, onOpenHistory]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <motion.div
            animate={{ 
              rotate: 360,
              scale: [1, 1.2, 1]
            }}
            transition={{ 
              rotate: { duration: 1, repeat: Infinity, ease: "linear" },
              scale: { duration: 0.5, repeat: Infinity, ease: "easeInOut" }
            }}
            className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full mx-auto mb-6"
          />
          <p className="text-white text-xl font-semibold">กำลังโหลดข้อมูล...</p>
          <p className="text-white/60 text-sm mt-2">เตรียมพบกับประสบการณ์ใหม่</p>
        </motion.div>
      </div>
    );
  }

  const COLORS = ['#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-pink-50 relative overflow-hidden">
      {/* Animated Background Elements - ⚡ GPU Accelerated */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear"
          }}
          style={{ willChange: 'transform' }}
          className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            rotate: [0, -90, 0],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "linear"
          }}
          style={{ willChange: 'transform' }}
          className="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-gradient-to-br from-blue-400/20 to-cyan-400/20 rounded-full blur-3xl"
        />
      </div>

      {/* Hero Section - Mega Impressive */}
      <div className="relative bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 overflow-hidden">
        {/* Animated Background Pattern */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjEiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-20" />
        </div>

        <div className="container mx-auto px-4 sm:px-6 py-12 relative z-10">
          {/* User Info Section */}
          <motion.div
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col md:flex-row items-center justify-between gap-6 mb-12"
          >
            <div className="flex items-center gap-6">
              <motion.div
                whileHover={{ scale: 1.05, rotate: 5 }}
                whileTap={{ scale: 0.95 }}
              >
                <Avatar 
                  className="w-24 h-24 border-4 border-white/40 shadow-2xl cursor-pointer ring-4 ring-white/20"
                  onClick={onOpenProfile}
                >
                  <AvatarImage src={profile?.avatarUrl} />
                  <AvatarFallback className="bg-gradient-to-br from-white/30 to-white/10 text-white text-3xl backdrop-blur-sm">
                    {profile?.name ? getInitials(profile.name) : "U"}
                  </AvatarFallback>
                </Avatar>
              </motion.div>
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <motion.h1 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    className="text-3xl md:text-4xl font-bold text-white"
                  >
                    {profile?.name || "ยังไม่ได้ตั้งชื่อ"}
                  </motion.h1>
                  {membership?.tier !== "free" && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.2, type: "spring" }}
                    >
                      <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white border-0 shadow-xl text-base px-3 py-1">
                        <Crown className="w-4 h-4 mr-1" />
                        VIP
                      </Badge>
                    </motion.div>
                  )}
                </div>
                <motion.p 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-white/90 text-lg"
                >
                  {user?.email}
                </motion.p>
                {profile?.companyName && (
                  <motion.p 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-white/70 text-sm mt-1 flex items-center gap-2"
                  >
                    <Building2 className="w-4 h-4" />
                    {profile.companyName}
                  </motion.p>
                )}
              </div>
            </div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Button 
                onClick={onOpenProfile}
                size="lg"
                className="bg-white/20 hover:bg-white/30 backdrop-blur-sm border-2 border-white/40 text-white shadow-xl"
              >
                <FileEdit className="w-5 h-5 mr-2" />
                แก้ไขโปรไฟล์
              </Button>
            </motion.div>
          </motion.div>

          {/* Big Stats Cards - Hero Style */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {statsCards.map((stat, index) => {
              // Calculate trend display
              const trend = stat.trendValue;
              const hasTrend = trend !== null && trend !== undefined;
              const isPositive = trend && trend > 0;
              const isNegative = trend && trend < 0;
              const trendText = hasTrend ? `${isPositive ? '+' : ''}${trend.toFixed(1)}%` : 'ใหม่';
              const TrendIcon = isNegative ? TrendingDown : TrendingUp;
              const trendColor = isNegative ? 'bg-red-100 text-red-700' : hasTrend ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600';
              
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: stat.delay }}
                  whileHover={{ y: -8, scale: 1.02 }}
                  className="group"
                >
                  <Card className="relative overflow-hidden bg-white/95 backdrop-blur-xl border-2 border-white/60 shadow-2xl hover:shadow-3xl transition-all">
                    {/* Gradient Background */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-0 group-hover:opacity-10 transition-opacity`} />
                    
                    <div className="p-6 relative z-10">
                      <div className="flex items-start justify-between mb-4">
                        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                          <stat.icon className="w-7 h-7 text-white" />
                        </div>
                        {hasTrend && (
                          <Badge className={`${trendColor} border-0 font-semibold`}>
                            <TrendIcon className="w-3 h-3 mr-1" />
                            {trendText}
                          </Badge>
                        )}
                      </div>
                      <h3 className="text-sm text-gray-600 mb-2">{stat.label}</h3>
                      <p className="text-2xl md:text-3xl font-bold mb-1 bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                        {stat.value}
                      </p>
                      <p className="text-xs text-gray-500">{stat.subtitle}</p>
                    </div>

                    {/* Sparkle Effect */}
                    <motion.div
                      className="absolute top-2 right-2"
                      animate={{
                        opacity: [0, 1, 0],
                        scale: [0.8, 1.2, 0.8],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        delay: index * 0.2,
                      }}
                    >
                      <Sparkles className="w-4 h-4 text-yellow-400" />
                    </motion.div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 sm:px-6 py-12 relative z-10">
        {/* Quick Actions - Premium Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="mb-12"
        >
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
            <Zap className="w-7 h-7 text-purple-600" />
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {quickActions.map((action, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1 + i * 0.1 }}
                whileHover={{ scale: 1.05, y: -5 }}
                whileTap={{ scale: 0.95 }}
              >
                <Card 
                  className={`p-6 bg-gradient-to-br ${action.gradient} text-white cursor-pointer shadow-xl hover:shadow-2xl ${action.glow} transition-all group relative overflow-hidden`}
                  onClick={action.onClick}
                >
                  {/* Animated Shine Effect */}
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                    animate={{
                      x: ['-200%', '200%'],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                  />
                  
                  <div className="relative z-10 flex flex-col items-center text-center gap-3">
                    <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-sm group-hover:bg-white/30 transition-all group-hover:scale-110 group-hover:rotate-12 shadow-lg">
                      <action.icon className="w-8 h-8" />
                    </div>
                    <div>
                      <p className="font-bold text-lg mb-1">{action.label}</p>
                      <p className="text-xs text-white/80">{action.subtitle}</p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Charts Section - Premium Style */}
        {analyticsData && (analyticsData.monthlyRevenue?.length > 0 || analyticsData.projectTypes?.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.4 }}
            className="grid lg:grid-cols-2 gap-8 mb-12"
          >
            {/* Revenue Chart */}
            <Card className="p-8 shadow-xl hover:shadow-2xl transition-all border-2 border-purple-100">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <BarChart3 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">รายได้และกำไร</h3>
                    <p className="text-sm text-muted-foreground">6 เดือนล่าสุด</p>
                  </div>
                </div>
                <Badge className="bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 border-0">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  เติบโต 25%
                </Badge>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={analyticsData?.monthlyRevenue || []}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" stroke="#888" fontSize={12} />
                  <YAxis stroke="#888" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '2px solid #e5e7eb',
                      borderRadius: '12px',
                      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'
                    }}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" name="รายได้" />
                  <Area type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorProfit)" name="กำไร" />
                </AreaChart>
              </ResponsiveContainer>
            </Card>

            {/* Project Types Chart */}
            <Card className="p-8 shadow-xl hover:shadow-2xl transition-all border-2 border-blue-100">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                    <Activity className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">ประเภทโครงการ</h3>
                    <p className="text-sm text-muted-foreground">การกระจายตัว</p>
                  </div>
                </div>
                <Badge className="bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-700 border-0">
                  {analyticsData?.projectTypes?.length || 0} ประเภท
                </Badge>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={analyticsData?.projectTypes || []}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {(analyticsData?.projectTypes || []).map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </motion.div>
        )}

        {/* Reviews Section - Premium Design */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.6 }}
          className="mb-12"
        >
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg">
                <Star className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                  รีวิวจากผู้ใช้งานจริง
                </h2>
                <p className="text-muted-foreground">ความประทับใจจาก 1,000+ ผู้ใช้งาน</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-gradient-to-r from-yellow-50 to-orange-50 px-6 py-3 rounded-2xl border-2 border-yellow-200">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-6 h-6 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <div>
                <span className="text-3xl font-bold text-yellow-600">4.9</span>
                <span className="text-sm text-gray-600">/5</span>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {REVIEWS.map((review, index) => (
              <motion.div
                key={review.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.7 + index * 0.1 }}
                whileHover={{ y: -6 }}
              >
                <Card className="p-6 hover:shadow-2xl transition-all border-2 hover:border-purple-200 h-full relative overflow-hidden group">
                  {/* Gradient Accent */}
                  <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${review.gradient}`} />
                  
                  <div className="flex items-start gap-4 mb-4">
                    <Avatar className={`w-16 h-16 border-3 border-white shadow-xl ring-2 ring-offset-2 ring-purple-200`}>
                      <AvatarFallback className={`bg-gradient-to-br ${review.gradient} text-white text-xl font-bold`}>
                        {review.avatar}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-bold text-lg">{review.name}</h4>
                          <p className="text-sm text-gray-600">{review.role}</p>
                        </div>
                        <div className="flex gap-0.5">
                          {[...Array(review.rating)].map((_, i) => (
                            <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          ))}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mb-3">
                        <Building2 className="w-3 h-3" />
                        {review.company}
                      </p>
                    </div>
                  </div>
                  
                  <div className="relative mb-4">
                    <Quote className="absolute -top-2 -left-2 w-10 h-10 text-purple-200" />
                    <p className="text-gray-700 leading-relaxed pl-8">
                      {review.comment}
                    </p>
                  </div>
                  
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {review.date}
                    </p>
                    <Badge className="bg-green-100 text-green-700 border-0">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      ผู้ใช้จริง
                    </Badge>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* CTA Section - Mega Impressive */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 2 }}
        >
          <Card className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 text-white border-0 shadow-2xl">
            {/* Animated Background */}
            <div className="absolute inset-0">
              <motion.div
                animate={{
                  backgroundPosition: ['0% 0%', '100% 100%'],
                }}
                transition={{
                  duration: 20,
                  repeat: Infinity,
                  ease: "linear"
                }}
                className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9InBhdHRlcm4iIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMiIgZmlsbD0id2hpdGUiIGZpbGwtb3BhY2l0eT0iMC4yIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI3BhdHRlcm4pIi8+PC9zdmc+')] opacity-30"
                style={{ backgroundSize: '40px 40px' }}
              />
            </div>

            <div className="relative z-10 p-12">
              <div className="text-center mb-8">
                <motion.div
                  animate={{
                    rotate: [0, 360],
                  }}
                  transition={{
                    duration: 20,
                    repeat: Infinity,
                    ease: "linear"
                  }}
                  className="inline-block mb-6"
                >
                  <Rocket className="w-20 h-20" />
                </motion.div>
                <h2 className="text-4xl md:text-5xl font-bold mb-4">
                  ทำไมต้องเลือก EZ BOQ?
                </h2>
                <p className="text-xl text-white/90">
                  ระบบ BOQ ที่ครบครันที่สุด สำหรับธุรกิจก่อสร้างยุคใหม่
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-8 mb-8">
                {[
                  {
                    icon: Zap,
                    title: "ประหยัดเวลา 70%",
                    description: "ทำเอกสารได้ใน 15 นาที ไม่ต้องคำนวณเอง",
                    color: "from-yellow-400 to-orange-400",
                  },
                  {
                    icon: Shield,
                    title: "ถูกต้องตามกฎหมาย",
                    description: "ใบกำกับภาษี หัก ณ ที่จ่าย ครบถ้วน",
                    color: "from-blue-400 to-cyan-400",
                  },
                  {
                    icon: Sparkles,
                    title: "900+ รายการ",
                    description: "Catalog ครบทุกอย่าง พร้อม SmartBOQ AI",
                    color: "from-pink-400 to-purple-400",
                  },
                ].map((feature, i) => (
                  <motion.div
                    key={i}
                    whileHover={{ scale: 1.05, y: -5 }}
                    className="text-center group"
                  >
                    <div className={`w-20 h-20 rounded-3xl bg-gradient-to-br ${feature.color} flex items-center justify-center mx-auto mb-4 shadow-2xl group-hover:shadow-3xl transition-all group-hover:scale-110`}>
                      <feature.icon className="w-10 h-10 text-white" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                    <p className="text-white/80">{feature.description}</p>
                  </motion.div>
                ))}
              </div>

              <div className="text-center">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    size="lg"
                    onClick={onStartBOQ}
                    className="bg-white text-purple-600 hover:bg-gray-100 shadow-2xl text-lg px-8 py-6"
                  >
                    <Rocket className="w-5 h-5 mr-2" />
                    เริ่มสร้าง BOQ ตอนนี้
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </motion.div>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}