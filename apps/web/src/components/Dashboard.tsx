import React, { useState, useEffect } from 'react';
import { getDashboardStats } from '../../../../shared/utils/apiService';
import type { AuthUser } from '../../../../shared/types/index';

interface DashboardProps {
  user: AuthUser;
  onNavigate: (path: string) => void;
}

interface DashboardStats {
  totalDocuments: number;
  totalCustomers: number;
  totalRevenue: number;
  recentDocuments: Array<{
    id?: string;
    projectName: string;
    status: string;
    totalAmount?: number;
    updatedAt?: string;
  }>;
  pendingPayments: number;
  monthlyStats: Array<{
    month: string;
    documents: number;
    revenue: number;
  }>;
}

export const Dashboard: React.FC<DashboardProps> = ({ user, onNavigate }) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [comingSoonNotice, setComingSoonNotice] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await getDashboardStats(user.id);
        
        if (response.success && response.data) {
          setStats(response.data);
        } else {
          setError(response.error || 'Failed to load dashboard data');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user.id]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const showComingSoon = (label: string) => {
    setComingSoonNotice(`ฟีเจอร์ "${label}" กำลังอยู่ระหว่างพัฒนา`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-lg mb-4">⚠️ เกิดข้อผิดพลาด</div>
          <p className="text-slate-600">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            ลองใหม่
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Dashboard
          </h1>
          <p className="text-slate-600">
            ภาพรวมข้อมูลธุรกิจ - {user.workspaceName}
          </p>
        </div>

        {comingSoonNotice && (
          <div className="mb-6 flex items-start justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <span>{comingSoonNotice}</span>
            <button
              onClick={() => setComingSoonNotice(null)}
              className="shrink-0 font-medium text-amber-700 hover:text-amber-900"
            >
              ปิด
            </button>
          </div>
        )}

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center">
              <div className="text-3xl mr-4">📋</div>
              <div>
                <p className="text-sm font-medium text-slate-600">ใบเสนอราคาทั้งหมด</p>
                <p className="text-2xl font-bold text-slate-900">
                  {stats?.totalDocuments || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center">
              <div className="text-3xl mr-4">👥</div>
              <div>
                <p className="text-sm font-medium text-slate-600">ลูกค้าทั้งหมด</p>
                <p className="text-2xl font-bold text-slate-900">
                  {stats?.totalCustomers || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center">
              <div className="text-3xl mr-4">💰</div>
              <div>
                <p className="text-sm font-medium text-slate-600">ยอดขายรวม</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(stats?.totalRevenue || 0)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center">
              <div className="text-3xl mr-4">⏰</div>
              <div>
                <p className="text-sm font-medium text-slate-600">รอการชำระ</p>
                <p className="text-2xl font-bold text-orange-600">
                  {stats?.pendingPayments || 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Documents */}
          <div className="bg-white rounded-xl border border-slate-200">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900">
                  เอกสารล่าสุด
                </h3>
                <button 
                  onClick={() => onNavigate('/workspace')}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  ดูทั้งหมด →
                </button>
              </div>
            </div>
            <div className="p-6">
              {stats?.recentDocuments?.length ? (
                <div className="space-y-4">
                  {stats.recentDocuments.slice(0, 5).map((doc, index) => (
                    <div key={doc.id ?? `${doc.projectName}-${index}`} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-slate-900">{doc.projectName}</p>
                        <p className="text-sm text-slate-500">
                          {formatDate(doc.updatedAt)} • {doc.status}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-slate-900">
                          {doc.totalAmount ? formatCurrency(doc.totalAmount) : '-'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <div className="text-4xl mb-2">📄</div>
                  <p>ยังไม่มีเอกสาร</p>
                  <button 
                    onClick={() => onNavigate('/workspace')}
                    className="mt-3 text-blue-600 hover:text-blue-700 text-sm"
                  >
                    สร้างเอกสารแรก
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl border border-slate-200">
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">
                การดำเนินการด่วน
              </h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 gap-4">
                <button 
                  onClick={() => onNavigate('/workspace')}
                  className="flex items-center p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-left"
                >
                  <div className="text-2xl mr-4">📋</div>
                  <div>
                    <p className="font-medium text-slate-900">สร้างใบเสนอราคาใหม่</p>
                    <p className="text-sm text-slate-500">เริ่มโครงการใหม่</p>
                  </div>
                </button>

                <button 
                  onClick={() => onNavigate('/docs')}
                  className="flex items-center p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-left"
                >
                  <div className="text-2xl mr-4">📄</div>
                  <div>
                    <p className="font-medium text-slate-900">จัดการเอกสาร</p>
                    <p className="text-sm text-slate-500">ส่งผ่าน LINE หรือจัดเก็บ</p>
                  </div>
                </button>

                <button 
                  onClick={() => showComingSoon('ดูรายงาน')}
                  className="flex items-center p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-left opacity-75"
                >
                  <div className="text-2xl mr-4">📊</div>
                  <div>
                    <p className="font-medium text-slate-900">ดูรายงาน</p>
                    <p className="text-sm text-slate-500">วิเคราะห์ข้อมูลธุรกิจ</p>
                  </div>
                </button>

                <button 
                  onClick={() => showComingSoon('เพิ่มลูกค้าใหม่')}
                  className="flex items-center p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-left opacity-75"
                >
                  <div className="text-2xl mr-4">👥</div>
                  <div>
                    <p className="font-medium text-slate-900">เพิ่มลูกค้าใหม่</p>
                    <p className="text-sm text-slate-500">จัดการข้อมูลลูกค้า</p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
