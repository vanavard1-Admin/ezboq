import { useState, useEffect } from "react";
import { motion } from "motion/react";
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
  Clock
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
  AreaChart
} from "recharts";
import { UserProfile, Membership } from "../types/boq";
import { projectId, publicAnonKey } from "../utils/supabase/info";
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

export function Dashboard({ 
  onLogout, 
  onStartBOQ, 
  onOpenProfile,
  onOpenCustomers,
  onOpenPartners,
  onOpenHistory,
  user 
}: DashboardProps) {
  const [stats, setStats] = useState({
    totalProjects: 0,
    totalRevenue: 0,
    totalProfit: 0,
    avgProjectValue: 0,
  });
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<any[]>([]);
  const [analyticsData, setAnalyticsData] = useState<any>(null);

  useEffect(() => {
    loadUserData();
    loadDocuments();
    loadAnalytics();
  }, [user]);

  const loadUserData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-6e95bca3/profile/${user.id}`,
        {
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setProfile(data.profile);
        setMembership(data.membership);
      }
    } catch (error) {
      console.error("Failed to load user data:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadDocuments = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-6e95bca3/documents`,
        {
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        const docs = data.documents || [];
        setDocuments(docs);

        // Calculate real stats from documents
        const totalProjects = docs.length;
        const totalRevenue = docs.reduce((sum: number, doc: any) => sum + (doc.totalAmount || 0), 0);
        const paidDocs = docs.filter((doc: any) => doc.status === 'paid');
        const totalPaid = paidDocs.reduce((sum: number, doc: any) => sum + (doc.totalAmount || 0), 0);
        
        // Estimate profit (assume 26% margin based on profile defaults: 10% markup + VAT)
        const totalProfit = totalRevenue * 0.26;
        const avgProjectValue = totalProjects > 0 ? totalRevenue / totalProjects : 0;

        setStats({
          totalProjects,
          totalRevenue,
          totalProfit,
          avgProjectValue,
        });
      }
    } catch (error) {
      console.error("Failed to load documents:", error);
    }
  };

  const loadAnalytics = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-6e95bca3/analytics?range=month`,
        {
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setAnalyticsData(data);
      }
    } catch (error) {
      console.error("Failed to load analytics:", error);
    }
  };

  const handleQuickNewBOQ = async () => {
    if (!user) return;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-6e95bca3/quick-actions/new-boq`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({ userId: user.id, customerId: null }),
        }
      );

      const data = await response.json();

      if (response.status === 403 && data.requiresUpgrade) {
        toast.error("คุณใช้ BOQ ฟรีหมดแล้ว กรุณาอัพเกรด VIP");
        return;
      }

      if (response.ok) {
        toast.success("สร้าง BOQ ใหม่สำเร็จ!");
        onStartBOQ();
      }
    } catch (error) {
      console.error("Quick new BOQ failed:", error);
      toast.error("ไม่สามารถสร้าง BOQ ได้");
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const profitMargin = ((stats.totalProfit / stats.totalRevenue) * 100) || 0;

  // Use real data from analytics if available
  const monthlyData = analyticsData?.revenueByMonth || [];
  const categoryData = analyticsData?.revenueByCategory?.map((cat: any, index: number) => ({
    name: cat.category,
    value: cat.revenue,
    color: ['#3b82f6', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#06b6d4'][index % 6],
  })) || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Enhanced User Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 sm:mb-8"
        >
          <Card className="p-4 sm:p-6 bg-gradient-to-br from-white via-blue-50 to-indigo-50 border-2 border-blue-100 shadow-xl overflow-hidden relative">
            {/* Decorative background */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-400/10 to-indigo-400/10 rounded-full blur-3xl -z-0" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-purple-400/10 to-pink-400/10 rounded-full blur-3xl -z-0" />
            
            <div className="relative z-10">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3 sm:gap-4">
                  <Avatar 
                    className="w-14 h-14 sm:w-20 sm:h-20 border-4 border-white shadow-xl cursor-pointer hover:scale-105 transition-transform ring-2 ring-blue-200"
                    onClick={onOpenProfile}
                  >
                    <AvatarImage src={profile?.avatarUrl} />
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-lg sm:text-2xl">
                      {profile?.name ? getInitials(profile.name) : "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                      <h2 className="text-xl sm:text-2xl md:text-3xl">
                        {profile?.name || "ยังไม่ได้ตั้งชื่อ"}
                      </h2>
                      {membership?.tier === "vip" && (
                        <Badge className="gap-1 bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-lg">
                          <Crown className="w-3 h-3" />
                          VIP Member
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm sm:text-base text-muted-foreground">{user?.email}</p>
                    {profile?.proposerName && (
                      <p className="text-xs sm:text-sm text-blue-600 mt-1 flex items-center gap-1">
                        <Award className="w-3 h-3 sm:w-4 sm:h-4" />
                        {profile.proposerName}
                      </p>
                    )}
                  </div>
                </div>
                <Button 
                  onClick={onOpenProfile}
                  variant="outline"
                  className="gap-2 shadow-md hover:shadow-lg transition-all border-2 border-blue-200 hover:border-blue-300"
                >
                  <FileEdit className="w-4 h-4" />
                  <span className="hidden sm:inline">แก้ไขโปรไฟล์</span>
                  <span className="sm:hidden">แก้ไข</span>
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>

        <div className="grid gap-4 sm:gap-6">
          {/* Enhanced Quick Actions with Gradient Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card 
                className="p-4 sm:p-6 bg-gradient-to-br from-blue-500 to-indigo-600 text-white cursor-pointer hover:scale-105 hover:shadow-2xl transition-all shadow-lg group relative overflow-hidden"
                onClick={onStartBOQ}
              >
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10">
                  <div className="flex items-center gap-2 sm:gap-3 mb-2">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm group-hover:bg-white/30 transition-colors">
                      <Plus className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                  </div>
                  <p className="text-[10px] sm:text-sm opacity-90 mb-1">Quick Action</p>
                  <p className="text-sm sm:text-base">สร้าง BOQ ใหม่</p>
                </div>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card 
                className="p-4 sm:p-6 bg-gradient-to-br from-green-500 to-emerald-600 text-white cursor-pointer hover:scale-105 hover:shadow-2xl transition-all shadow-lg group relative overflow-hidden"
                onClick={onOpenCustomers}
              >
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10">
                  <div className="flex items-center gap-2 sm:gap-3 mb-2">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm group-hover:bg-white/30 transition-colors">
                      <UserPlus className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                  </div>
                  <p className="text-[10px] sm:text-sm opacity-90 mb-1">Quick Action</p>
                  <p className="text-sm sm:text-base">เพิ่มลูกค้า</p>
                </div>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card 
                className="p-4 sm:p-6 bg-gradient-to-br from-purple-500 to-pink-600 text-white cursor-pointer hover:scale-105 hover:shadow-2xl transition-all shadow-lg group relative overflow-hidden"
                onClick={onOpenHistory}
              >
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10">
                  <div className="flex items-center gap-2 sm:gap-3 mb-2">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm group-hover:bg-white/30 transition-colors">
                      <FileText className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                  </div>
                  <p className="text-[10px] sm:text-sm opacity-90 mb-1">Quick Action</p>
                  <p className="text-sm sm:text-base">ประวัติเอกสาร</p>
                </div>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card 
                className="p-4 sm:p-6 bg-gradient-to-br from-orange-500 to-red-600 text-white cursor-pointer hover:scale-105 hover:shadow-2xl transition-all shadow-lg group relative overflow-hidden"
                onClick={onOpenPartners}
              >
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10">
                  <div className="flex items-center gap-2 sm:gap-3 mb-2">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm group-hover:bg-white/30 transition-colors">
                      <Handshake className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                  </div>
                  <p className="text-[10px] sm:text-sm opacity-90 mb-1">Quick Action</p>
                  <p className="text-sm sm:text-base">พาร์ทเนอร์</p>
                </div>
              </Card>
            </motion.div>
          </div>

          {/* Enhanced Stats Cards with Glass Morphism Effect */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Card className="p-4 sm:p-6 bg-white/90 backdrop-blur-sm shadow-xl border-2 border-blue-100 hover:shadow-2xl transition-all group">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground mb-1">จำนวนโครงการ</p>
                    <p className="text-2xl sm:text-3xl mb-2">{stats.totalProjects}</p>
                    <div className="flex items-center gap-1 text-xs sm:text-sm text-green-600">
                      <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span>+12.5%</span>
                    </div>
                  </div>
                  <div className="p-3 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl group-hover:scale-110 transition-transform">
                    <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                  </div>
                </div>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <Card className="p-4 sm:p-6 bg-white/90 backdrop-blur-sm shadow-xl border-2 border-green-100 hover:shadow-2xl transition-all group">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground mb-1">รายได้รวม</p>
                    <p className="text-2xl sm:text-3xl mb-2">
                      ฿{(stats.totalRevenue / 1000).toFixed(0)}K
                    </p>
                    <div className="flex items-center gap-1 text-xs sm:text-sm text-green-600">
                      <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span>+18.2%</span>
                    </div>
                  </div>
                  <div className="p-3 bg-gradient-to-br from-green-100 to-emerald-100 rounded-xl group-hover:scale-110 transition-transform">
                    <DollarSign className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
                  </div>
                </div>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
            >
              <Card className="p-4 sm:p-6 bg-white/90 backdrop-blur-sm shadow-xl border-2 border-purple-100 hover:shadow-2xl transition-all group">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground mb-1">กำไร</p>
                    <p className="text-2xl sm:text-3xl mb-2">
                      ฿{(stats.totalProfit / 1000).toFixed(0)}K
                    </p>
                    <div className="flex items-center gap-1 text-xs sm:text-sm text-green-600">
                      <Activity className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span>{profitMargin.toFixed(1)}%</span>
                    </div>
                  </div>
                  <div className="p-3 bg-gradient-to-br from-purple-100 to-pink-100 rounded-xl group-hover:scale-110 transition-transform">
                    <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600" />
                  </div>
                </div>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
            >
              <Card className="p-4 sm:p-6 bg-white/90 backdrop-blur-sm shadow-xl border-2 border-orange-100 hover:shadow-2xl transition-all group">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground mb-1">มูลค่าเฉลี่ย</p>
                    <p className="text-2xl sm:text-3xl mb-2">
                      ฿{(stats.avgProjectValue / 1000).toFixed(0)}K
                    </p>
                    <div className="flex items-center gap-1 text-xs sm:text-sm text-green-600">
                      <ArrowUp className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span>+5.4%</span>
                    </div>
                  </div>
                  <div className="p-3 bg-gradient-to-br from-orange-100 to-red-100 rounded-xl group-hover:scale-110 transition-transform">
                    <BarChart3 className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600" />
                  </div>
                </div>
              </Card>
            </motion.div>
          </div>

          {/* Enhanced Charts Row with Better Styling */}
          <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Revenue Trend with Area Chart */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
            >
              <Card className="p-4 sm:p-6 bg-white/90 backdrop-blur-sm shadow-xl border-2 border-blue-100">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base sm:text-lg flex items-center gap-2">
                    <div className="p-2 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-lg">
                      <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                    </div>
                    <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                      แนวโน้มรายได้รายเดือน
                    </span>
                  </h3>
                  <Badge variant="secondary" className="text-xs">6 เดือน</Badge>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={monthlyData}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                      </linearGradient>
                      <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="month" stroke="#6b7280" style={{ fontSize: '12px' }} />
                    <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                        border: '2px solid #e5e7eb',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                      }}
                      formatter={(value: number) => `฿${value.toLocaleString()}`}
                    />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="revenue" 
                      name="รายได้" 
                      stroke="#3b82f6" 
                      fill="url(#colorRevenue)"
                      strokeWidth={3}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="profit" 
                      name="กำไร" 
                      stroke="#10b981" 
                      fill="url(#colorProfit)"
                      strokeWidth={3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </Card>
            </motion.div>

            {/* Category Distribution with Better Pie Chart */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.0 }}
            >
              <Card className="p-4 sm:p-6 bg-white/90 backdrop-blur-sm shadow-xl border-2 border-purple-100">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base sm:text-lg flex items-center gap-2">
                    <div className="p-2 bg-gradient-to-br from-purple-100 to-pink-100 rounded-lg">
                      <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
                    </div>
                    <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                      รายได้ตามประเภทงาน
                    </span>
                  </h3>
                  <Badge variant="secondary" className="text-xs">ทั้งหมด</Badge>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={(entry) => `${entry.name}`}
                      labelLine={true}
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                        border: '2px solid #e5e7eb',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                      }}
                      formatter={(value: number) => `฿${value.toLocaleString()}`}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Legend */}
                <div className="grid grid-cols-2 gap-2 mt-4">
                  {categoryData.map((item, index) => (
                    <div key={index} className="flex items-center gap-2 text-xs sm:text-sm">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-muted-foreground">{item.name}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>
          </div>

          {/* Enhanced Monthly Comparison */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1 }}
          >
            <Card className="p-4 sm:p-6 bg-white/90 backdrop-blur-sm shadow-xl border-2 border-indigo-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base sm:text-lg flex items-center gap-2">
                  <div className="p-2 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-lg">
                    <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-600" />
                  </div>
                  <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    เปรียบเทียบรายเดือน
                  </span>
                </h3>
                <Badge variant="secondary" className="text-xs flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  อัพเดตล่าสุด
                </Badge>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" stroke="#6b7280" style={{ fontSize: '12px' }} />
                  <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                      border: '2px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                    }}
                    formatter={(value: number) => `฿${value.toLocaleString()}`}
                  />
                  <Legend />
                  <Bar dataKey="revenue" name="รายได้" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="cost" name="ต้นทุน" fill="#ef4444" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="profit" name="กำไร" fill="#10b981" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
