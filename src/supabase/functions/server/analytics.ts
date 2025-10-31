/**
 * Analytics Calculator
 * Calculate analytics from cached documents
 */

interface Document {
  id: string;
  type: string;
  isApproved?: boolean;
  totalAmount?: number;
  createdAt?: number;
  customerId?: string;
  customerName?: string;
  projectId?: string;
  recipientType?: string;
  projectTitle?: string;
  boqItems?: any[];
}

interface AnalyticsData {
  totalProjects: number;
  totalRevenue: number;
  totalCost: number;
  netIncome: number;
  grossProfit: number;
  retentionAmount: number;
  warrantyAmount: number;
  vatAmount: number;
  netProfitBeforeTax: number;
  netProfitAfterTax: number;
  totalCustomers: number;
  averageProjectValue: number;
  revenueByMonth: any[];
  revenueByCategory: any[];
  topCustomers: any[];
  recentDocuments: any[];
}

export function calculateAnalytics(documents: Document[], customers: any[]): AnalyticsData {
  // Separate customer and partner documents
  const customerDocs = documents.filter((doc: any) => !doc.recipientType || doc.recipientType === 'customer');
  const partnerDocs = documents.filter((doc: any) => doc.recipientType === 'partner');
  
  // ✅ Calculate total revenue (from customers = profit)
  // Only count APPROVED documents using isApproved flag
  const totalRevenue = customerDocs.reduce((sum: number, doc: any) => {
    // Skip BOQ (internal document)
    if (doc.type === 'boq') return sum;
    
    // Only count approved documents
    if (doc.isApproved) {
      return sum + (typeof doc?.totalAmount === 'number' ? doc.totalAmount : 0);
    }
    return sum;
  }, 0);
  
  // ✅ Calculate total cost (from partners)
  const totalCost = partnerDocs.reduce((sum: number, doc: any) => {
    if (doc.type === 'boq') return sum;
    if (doc.isApproved) {
      return sum + (typeof doc?.totalAmount === 'number' ? doc.totalAmount : 0);
    }
    return sum;
  }, 0);
  
  // Calculate net income
  const netIncome = totalRevenue - totalCost;
  
  // Total projects - count unique projects
  const uniqueProjectIds = new Set<string>();
  documents.forEach((doc: any) => {
    if (doc?.projectId) {
      uniqueProjectIds.add(doc.projectId);
    } else if (doc?.id) {
      uniqueProjectIds.add(doc.id);
    }
  });
  const totalProjects = uniqueProjectIds.size;
  
  // Total customers
  const totalCustomers = customers.length;
  
  // Average project value
  const averageProjectValue = totalProjects > 0 ? totalRevenue / totalProjects : 0;
  
  // Calculate revenue by month
  const monthlyData = new Map<string, { revenue: number; cost: number; netIncome: number }>();
  const thaiMonths = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
  
  customerDocs.forEach((doc: any) => {
    if (doc?.createdAt && doc.isApproved && doc.type !== 'boq') {
      const date = new Date(doc.createdAt);
      if (!isNaN(date.getTime())) {
        const monthKey = thaiMonths[date.getMonth()];
        const amount = typeof doc.totalAmount === 'number' ? doc.totalAmount : 0;
        
        if (!monthlyData.has(monthKey)) {
          monthlyData.set(monthKey, { revenue: 0, cost: 0, netIncome: 0 });
        }
        
        const current = monthlyData.get(monthKey)!;
        current.revenue += amount;
        current.netIncome += amount;
      }
    }
  });
  
  // Add partner costs to monthly data
  partnerDocs.forEach((doc: any) => {
    if (doc?.createdAt && doc.isApproved && doc.type !== 'boq') {
      const date = new Date(doc.createdAt);
      if (!isNaN(date.getTime())) {
        const monthKey = thaiMonths[date.getMonth()];
        const amount = typeof doc.totalAmount === 'number' ? doc.totalAmount : 0;
        
        if (!monthlyData.has(monthKey)) {
          monthlyData.set(monthKey, { revenue: 0, cost: 0, netIncome: 0 });
        }
        
        const current = monthlyData.get(monthKey)!;
        current.cost += amount;
        current.netIncome -= amount;
      }
    }
  });
  
  const revenueByMonth = Array.from(monthlyData.entries()).map(([month, data]) => ({
    month,
    revenue: data.revenue,
    cost: data.cost,
    netIncome: data.netIncome,
  }));
  
  // Revenue by category (from BOQ items)
  const categoryData = new Map<string, number>();
  documents.forEach((doc: any) => {
    if (doc?.boqItems && doc.isApproved && doc.type !== 'boq') {
      doc.boqItems.forEach((item: any) => {
        if (item?.category) {
          const current = categoryData.get(item.category) || 0;
          const itemTotal = (item.quantity || 0) * (item.unitPrice || 0);
          categoryData.set(item.category, current + itemTotal);
        }
      });
    }
  });
  
  const revenueByCategory = Array.from(categoryData.entries()).map(([category, value]) => ({
    category,
    value,
  }));
  
  // Top customers by total spend
  const customerSpending = new Map<string, { name: string; total: number }>();
  customerDocs.forEach((doc: any) => {
    if (doc?.customerId && doc?.customerName && doc.isApproved && doc.type !== 'boq') {
      const current = customerSpending.get(doc.customerId);
      const amount = typeof doc.totalAmount === 'number' ? doc.totalAmount : 0;
      
      if (current) {
        current.total += amount;
      } else {
        customerSpending.set(doc.customerId, { name: doc.customerName, total: amount });
      }
    }
  });
  
  const topCustomers = Array.from(customerSpending.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);
  
  // Recent approved documents
  const recentDocuments = documents
    .filter((doc: any) => doc.isApproved && doc.type !== 'boq')
    .sort((a: any, b: any) => b.createdAt - a.createdAt)
    .slice(0, 10)
    .map((doc: any) => ({
      id: doc.id,
      projectTitle: doc.projectTitle,
      type: doc.type,
      totalAmount: doc.totalAmount,
      createdAt: doc.createdAt,
    }));
  
  return {
    totalProjects,
    totalRevenue,
    totalCost,
    netIncome,
    grossProfit: netIncome,
    retentionAmount: 0,
    warrantyAmount: 0,
    vatAmount: totalRevenue * 0.07,
    netProfitBeforeTax: netIncome,
    netProfitAfterTax: netIncome * 0.8,
    totalCustomers,
    averageProjectValue,
    revenueByMonth,
    revenueByCategory,
    topCustomers,
    recentDocuments,
  };
}
