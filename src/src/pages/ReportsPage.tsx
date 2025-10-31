import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Users,
  FileText,
  Calendar,
  ArrowLeft,
  Download,
  PieChart,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart as RePieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { AnalyticsData } from '../types/boq';
import { toast } from 'sonner';
import { api } from '../utils/api';

interface ReportsPageProps {
  onBack: () => void;
}

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#10b981', '#06b6d4'];

export function ReportsPage({ onBack }: ReportsPageProps) {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('month');

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/analytics?range=${timeRange}`);

      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error('Failed to load analytics:', error);
      toast.error('ไม่สามารถโหลดข้อมูลรายงานได้');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const exportReport = () => {
    toast.success('กำลังส่งออกรายงาน...', {
      description: 'รายงานจะถูกดาวน์โหลดในรูปแบบ PDF',
    });
    // TODO: Implement PDF export
  };

  if (loading || !analytics) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-lg">กำลังโหลดข้อมูล...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl">รายงานและวิเคราะห์</h1>
                  <p className="text-muted-foreground">
                    สรุปข้อมูลและสถิติการทำงานของคุณ
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Tabs value={timeRange} onValueChange={(v: any) => setTimeRange(v)}>
              <TabsList>
                <TabsTrigger value="week">7 วัน</TabsTrigger>
                <TabsTrigger value="month">30 วัน</TabsTrigger>
                <TabsTrigger value="year">1 ปี</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button onClick={exportReport} className="gap-2">
              <Download className="w-4 h-4" />
              ส่งออกรายงาน
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="p-6 bg-gradient-to-br from-blue-500 to-blue-600 text-white">
              <div className="flex items-center justify-between mb-2">
                <DollarSign className="w-8 h-8 opacity-80" />
                <TrendingUp className="w-5 h-5" />
              </div>
              <p className="text-sm opacity-90 mb-1">กำไร (ยอดขาย)</p>
              <p className="text-2xl">{formatCurrency(analytics.totalRevenue)}</p>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <Card className="p-6 bg-gradient-to-br from-red-500 to-red-600 text-white">
              <div className="flex items-center justify-between mb-2">
                <DollarSign className="w-8 h-8 opacity-80" />
                <TrendingUp className="w-5 h-5" />
              </div>
              <p className="text-sm opacity-90 mb-1">ต้นทุน (พาร์ทเนอร์)</p>
              <p className="text-2xl">{formatCurrency(analytics.totalCost || 0)}</p>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="p-6 bg-gradient-to-br from-green-500 to-green-600 text-white">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="w-8 h-8 opacity-80" />
                <TrendingUp className="w-5 h-5" />
              </div>
              <p className="text-sm opacity-90 mb-1">รายได้สุทธิ</p>
              <p className="text-2xl">{formatCurrency((analytics.totalRevenue || 0) - (analytics.totalCost || 0))}</p>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <Card className="p-6 bg-gradient-to-br from-purple-500 to-purple-600 text-white">
              <div className="flex items-center justify-between mb-2">
                <FileText className="w-8 h-8 opacity-80" />
                <TrendingUp className="w-5 h-5" />
              </div>
              <p className="text-sm opacity-90 mb-1">โครงการทั้งหมด</p>
              <p className="text-3xl">{analytics.totalProjects}</p>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="p-6 bg-gradient-to-br from-pink-500 to-pink-600 text-white">
              <div className="flex items-center justify-between mb-2">
                <Users className="w-8 h-8 opacity-80" />
                <TrendingUp className="w-5 h-5" />
              </div>
              <p className="text-sm opacity-90 mb-1">ลูกค้าทั้งหมด</p>
              <p className="text-3xl">{analytics.totalCustomers}</p>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
          >
            <Card className="p-6 bg-gradient-to-br from-orange-500 to-orange-600 text-white">
              <div className="flex items-center justify-between mb-2">
                <Calendar className="w-8 h-8 opacity-80" />
                <TrendingUp className="w-5 h-5" />
              </div>
              <p className="text-sm opacity-90 mb-1">มูลค่าเฉลี่ย/โครงการ</p>
              <p className="text-2xl">
                {formatCurrency(analytics.averageProjectValue)}
              </p>
            </Card>
          </motion.div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 gap-6 mb-6">
          {/* Profit vs Cost Comparison by Month */}
          <Card className="p-6">
            <h3 className="text-lg mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-500" />
              เปรียบเทียบรายเดือน: กำไร vs ต้นทุน vs รายได้สุทธิ
            </h3>
            <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">• </span>
                  <span className="text-blue-700">กำไร = </span>
                  <span className="text-muted-foreground">ยอดขาย (ใบเสนอราคาลูกค้า)</span>
                </div>
                <div>
                  <span className="text-muted-foreground">• </span>
                  <span className="text-red-700">ต้นทุน = </span>
                  <span className="text-muted-foreground">ใบเสนอราคาของพาร์ทเนอร์</span>
                </div>
                <div>
                  <span className="text-muted-foreground">• </span>
                  <span className="text-green-700">รายได้สุทธิ = </span>
                  <span className="text-muted-foreground">กำไร - ต้นทุน</span>
                </div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={analytics.revenueByMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Legend />
                <Bar dataKey="revenue" fill="#3b82f6" name="กำไร (ยอดขาย)" radius={[8, 8, 0, 0]} />
                <Bar dataKey="cost" fill="#ef4444" name="ต้นทุน (พาร์ทเนอร์)" radius={[8, 8, 0, 0]} />
                <Bar dataKey="netIncome" fill="#10b981" name="รายได้สุทธิ" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Revenue Trend Line Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="text-lg mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-500" />
                แนวโน้มรายได้สุทธิ
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={analytics.revenueByMonth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" stroke="#6b7280" />
                  <YAxis stroke="#6b7280" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="netIncome" 
                    stroke="#10b981" 
                    strokeWidth={3}
                    name="รายได้สุทธิ"
                    dot={{ fill: '#10b981', r: 5 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    name="ยอดขาย"
                    dot={{ fill: '#3b82f6', r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Card>

            {/* Revenue by Category */}
            <Card className="p-6">
              <h3 className="text-lg mb-4 flex items-center gap-2">
                <PieChart className="w-5 h-5 text-purple-500" />
                รายได้ตามหมวดหมู่
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <RePieChart>
                  <Pie
                    data={analytics.revenueByCategory}
                    dataKey="revenue"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={(entry) => `${entry.category} (${entry.percentage}%)`}
                  >
                    {analytics.revenueByCategory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                </RePieChart>
              </ResponsiveContainer>
            </Card>
          </div>
        </div>

        {/* Top Customers & Recent Documents */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Customers */}
          <Card className="p-6">
            <h3 className="text-lg mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-green-500" />
              ลูกค้าอันดับต้น (Top 5)
            </h3>
            <div className="space-y-3">
              {analytics.topCustomers.slice(0, 5).map((customer, index) => (
                <motion.div
                  key={customer.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white">
                      {index + 1}
                    </div>
                    <div>
                      <p>{customer.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {customer.totalProjects} โครงการ
                      </p>
                    </div>
                  </div>
                  <p>{formatCurrency(customer.totalRevenue)}</p>
                </motion.div>
              ))}
            </div>
          </Card>

          {/* Recent Documents */}
          <Card className="p-6">
            <h3 className="text-lg mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-orange-500" />
              เอกสารล่าสุด
            </h3>
            <div className="space-y-3">
              {analytics.recentDocuments.slice(0, 5).map((doc, index) => (
                <motion.div
                  key={doc.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="line-clamp-1">{doc.projectTitle}</p>
                    <p className="text-sm text-muted-foreground">
                      {doc.customerName} • {doc.documentNumber}
                    </p>
                  </div>
                  <p className="text-sm">{formatCurrency(doc.totalAmount)}</p>
                </motion.div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
