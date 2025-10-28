import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { ScrollArea } from '../components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
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
  FolderOpen,
  Handshake,
  Shield,
  TrendingDown,
  Search,
  Eye,
  ChevronRight,
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
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface ReportsPageEnhancedProps {
  onBack: () => void;
}

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#10b981', '#06b6d4'];

interface ProjectSummary {
  projectId: string;
  projectTitle: string;
  customerName: string;
  createdAt: number;
  documents: any[];
  customerRevenue: number;
  partnerCost: number;
  grossProfit: number;
  vatAmount: number;
  retentionAmount: number; // เงินประกัน
  warrantyAmount: number; // งานประกัน
  netProfitBeforeTax: number;
  netProfitAfterTax: number; // หลังหักภาษี 7%
  partners: string[];
}

export function ReportsPageEnhanced({ onBack }: ReportsPageEnhancedProps) {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [projectSummaries, setProjectSummaries] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('month');
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadAllData();
  }, [timeRange]);

  const loadAllData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadAnalytics(),
        loadProjectSummaries(),
      ]);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('ไม่สามารถโหลดข้อมูลรายงานได้');
    } finally {
      setLoading(false);
    }
  };

  const loadAnalytics = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-6e95bca3/analytics?range=${timeRange}`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error('Failed to load analytics:', error);
    }
  };

  const loadProjectSummaries = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-6e95bca3/documents`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        const allDocs = data.documents || [];
        
        // Group documents by project
        const projectMap = new Map<string, any[]>();
        allDocs.forEach((doc: any) => {
          const projectKey = doc.projectId || doc.id; // Use projectId or document id
          if (!projectMap.has(projectKey)) {
            projectMap.set(projectKey, []);
          }
          projectMap.get(projectKey)!.push(doc);
        });

        // Calculate summary for each project
        const summaries: ProjectSummary[] = [];
        projectMap.forEach((docs, projectId) => {
          const customerDocs = docs.filter(d => !d.recipientType || d.recipientType === 'customer');
          const partnerDocs = docs.filter(d => d.recipientType === 'partner');
          
          const customerRevenue = customerDocs.reduce((sum, d) => sum + (d.totalAmount || 0), 0);
          const partnerCost = partnerDocs.reduce((sum, d) => sum + (d.totalAmount || 0), 0);
          const grossProfit = customerRevenue - partnerCost;
          
          // Calculate retention (เงินประกัน) 5% of gross profit
          const retentionAmount = grossProfit * 0.05;
          
          // Calculate warranty (งานประกัน/รับประกัน) 3% of gross profit
          const warrantyAmount = grossProfit * 0.03;
          
          // Net profit before tax (after deducting retention and warranty)
          const netProfitBeforeTax = grossProfit - retentionAmount - warrantyAmount;
          
          // Calculate VAT 7% of net profit before tax
          const vatAmount = netProfitBeforeTax * 0.07;
          
          // Net profit after tax
          const netProfitAfterTax = netProfitBeforeTax - vatAmount;
          
          // Get unique partners
          const partners = [...new Set(partnerDocs.map(d => d.partnerName).filter(Boolean))];
          
          const firstDoc = docs[0];
          summaries.push({
            projectId,
            projectTitle: firstDoc.projectTitle || 'ไม่ระบุโครงการ',
            customerName: firstDoc.customerName || 'ไม่ระบุลูกค้า',
            createdAt: firstDoc.createdAt || Date.now(),
            documents: docs,
            customerRevenue,
            partnerCost,
            grossProfit,
            vatAmount,
            retentionAmount,
            warrantyAmount,
            netProfitBeforeTax,
            netProfitAfterTax,
            partners: partners as string[],
          });
        });

        setProjectSummaries(summaries.sort((a, b) => b.createdAt - a.createdAt));
      }
    } catch (error) {
      console.error('Failed to load project summaries:', error);
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

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const exportReport = () => {
    try {
      // Prepare CSV data
      const headers = [
        'โครงการ',
        'ลูกค้า',
        'พาร์ทเนอร์',
        'รายได้ลูกค้า',
        'ต้นทุนพาร์ทเนอร์',
        'กำไรขั้นต้น',
        'เงินประกัน (5%)',
        'งานประกัน (3%)',
        'VAT (7%)',
        'กำไรสุทธิ (หลังหักภาษี)',
        'วันที่สร้าง',
      ];

      const rows = projectSummaries.map(p => [
        p.projectTitle,
        p.customerName,
        p.partners.join(', ') || '-',
        p.customerRevenue.toFixed(2),
        p.partnerCost.toFixed(2),
        p.grossProfit.toFixed(2),
        p.retentionAmount.toFixed(2),
        p.warrantyAmount.toFixed(2),
        p.vatAmount.toFixed(2),
        p.netProfitAfterTax.toFixed(2),
        formatDate(p.createdAt),
      ]);

      // Add summary row
      rows.push([
        '=== สรุปรวม ===',
        '',
        '',
        totalStats.totalCustomerRevenue.toFixed(2),
        totalStats.totalPartnerCost.toFixed(2),
        totalStats.totalGrossProfit.toFixed(2),
        totalStats.totalRetention.toFixed(2),
        totalStats.totalWarranty.toFixed(2),
        totalStats.totalVAT.toFixed(2),
        totalStats.totalNetProfitAfterTax.toFixed(2),
        '',
      ]);

      // Convert to CSV
      const csvContent = [
        '\uFEFF' + headers.join(','), // Add BOM for Thai characters
        ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
      ].join('\n');

      // Download CSV
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      const fileName = `รายงานสรุป_${new Date().toLocaleDateString('th-TH')}.csv`;
      
      link.setAttribute('href', url);
      link.setAttribute('download', fileName);
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('ส่งออกรายงานสำเร็จ!', {
        description: `ดาวน์โหลด: ${fileName}`,
      });
    } catch (error) {
      console.error('Export report failed:', error);
      toast.error('ไม่สามารถส่งออกรายงานได้');
    }
  };

  const filteredProjects = projectSummaries.filter(p => 
    !searchQuery || 
    p.projectTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.customerName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalStats = {
    totalCustomerRevenue: projectSummaries.reduce((sum, p) => sum + p.customerRevenue, 0),
    totalPartnerCost: projectSummaries.reduce((sum, p) => sum + p.partnerCost, 0),
    totalGrossProfit: projectSummaries.reduce((sum, p) => sum + p.grossProfit, 0),
    totalVAT: projectSummaries.reduce((sum, p) => sum + p.vatAmount, 0),
    totalRetention: projectSummaries.reduce((sum, p) => sum + p.retentionAmount, 0),
    totalWarranty: projectSummaries.reduce((sum, p) => sum + p.warrantyAmount, 0),
    totalNetProfitAfterTax: projectSummaries.reduce((sum, p) => sum + p.netProfitAfterTax, 0),
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
                    สรุปข้อมูลและสถิติการทำงานของคุณ (รวมเงินประกัน/งานประกัน/กำไรสุทธิหลังหักภาษี)
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

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="overview" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              ภาพรวม
            </TabsTrigger>
            <TabsTrigger value="projects" className="gap-2">
              <FolderOpen className="w-4 h-4" />
              สรุปโครงการ ({projectSummaries.length})
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
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
                    <TrendingDown className="w-5 h-5" />
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
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <p className="text-sm opacity-90 mb-1">รายได้สุทธิ (หลังหักภาษี)</p>
                  <p className="text-2xl">{formatCurrency(totalStats.totalNetProfitAfterTax)}</p>
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
                    <FolderOpen className="w-5 h-5" />
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
                <Card className="p-6 bg-gradient-to-br from-amber-500 to-amber-600 text-white">
                  <div className="flex items-center justify-between mb-2">
                    <Shield className="w-8 h-8 opacity-80" />
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <p className="text-sm opacity-90 mb-1">เงินประกัน (5%)</p>
                  <p className="text-2xl">{formatCurrency(totalStats.totalRetention)}</p>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
              >
                <Card className="p-6 bg-gradient-to-br from-pink-500 to-pink-600 text-white">
                  <div className="flex items-center justify-between mb-2">
                    <Shield className="w-8 h-8 opacity-80" />
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <p className="text-sm opacity-90 mb-1">งานประกัน (3%)</p>
                  <p className="text-2xl">{formatCurrency(totalStats.totalWarranty)}</p>
                </Card>
              </motion.div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 gap-6">
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
                      <span className="text-muted-foreground">กำไร - ต้นทุน - ภาษี 7%</span>
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
          </TabsContent>

          {/* Project Summaries Tab */}
          <TabsContent value="projects" className="space-y-6">
            {/* Search Bar */}
            <Card className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="ค้นหาโครงการหรือลูกค้า..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </Card>

            {/* Summary Stats */}
            <Card className="p-6 bg-gradient-to-r from-blue-50 to-purple-50">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">รายได้จากลูกค้า</p>
                  <p className="text-2xl text-blue-700">{formatCurrency(totalStats.totalCustomerRevenue)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">ต้นทุนพาร์ทเนอร์</p>
                  <p className="text-2xl text-red-700">{formatCurrency(totalStats.totalPartnerCost)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">กำไรขั้นต้น</p>
                  <p className="text-2xl text-green-700">{formatCurrency(totalStats.totalGrossProfit)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">กำไรสุทธิ (หลังหักภาษี)</p>
                  <p className="text-2xl text-purple-700">{formatCurrency(totalStats.totalNetProfitAfterTax)}</p>
                </div>
              </div>
            </Card>

            {/* Projects Table */}
            <Card>
              <ScrollArea className="h-[600px]">
                <Table>
                  <TableHeader className="bg-gray-50 sticky top-0">
                    <TableRow>
                      <TableHead>โครงการ</TableHead>
                      <TableHead>ลูกค้า</TableHead>
                      <TableHead>พาร์ทเนอร์</TableHead>
                      <TableHead className="text-right">รายได้ลูกค้า</TableHead>
                      <TableHead className="text-right">ต้นทุนพาร์ทเนอร์</TableHead>
                      <TableHead className="text-right">เงินประกัน</TableHead>
                      <TableHead className="text-right">งานประกัน</TableHead>
                      <TableHead className="text-right">VAT 7%</TableHead>
                      <TableHead className="text-right">กำไรสุทธิ</TableHead>
                      <TableHead className="text-center">เอกสาร</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProjects.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center py-12">
                          <FolderOpen className="w-12 h-12 text-muted-foreground mx-auto mb-2 opacity-20" />
                          <p className="text-muted-foreground">ไม่พบโครงการ</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredProjects.map((project, index) => (
                        <motion.tr
                          key={project.projectId}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.03 }}
                          className="hover:bg-blue-50/50 transition-colors"
                        >
                          <TableCell>
                            <div>
                              <p className="font-medium">{project.projectTitle}</p>
                              <p className="text-xs text-muted-foreground">{formatDate(project.createdAt)}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <p className="text-sm">{project.customerName}</p>
                          </TableCell>
                          <TableCell>
                            {project.partners.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {project.partners.map((partner, idx) => (
                                  <Badge key={idx} variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200">
                                    <Handshake className="w-3 h-3 mr-1" />
                                    {partner}
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right text-blue-600">
                            {formatCurrency(project.customerRevenue)}
                          </TableCell>
                          <TableCell className="text-right text-red-600">
                            {formatCurrency(project.partnerCost)}
                          </TableCell>
                          <TableCell className="text-right text-amber-600">
                            {formatCurrency(project.retentionAmount)}
                          </TableCell>
                          <TableCell className="text-right text-pink-600">
                            {formatCurrency(project.warrantyAmount)}
                          </TableCell>
                          <TableCell className="text-right text-purple-600">
                            {formatCurrency(project.vatAmount)}
                          </TableCell>
                          <TableCell className="text-right">
                            <span className={project.netProfitAfterTax >= 0 ? 'text-green-600' : 'text-red-600'}>
                              {formatCurrency(project.netProfitAfterTax)}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary">{project.documents.length}</Badge>
                          </TableCell>
                        </motion.tr>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
