import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import type { AuthUser } from '../../../../shared/types/index';
import { db } from '../utils/firebase';
import { getProjectGrandTotal, type ProjectData, type QuotationItem } from '../utils/projectData';

interface HomePageProps {
  user: AuthUser;
  onNavigate: (path: string) => void;
}

interface HomeStats {
  projects: number;
  documents: number;
  customers: number;
  sales: number;
}

export const HomePage: React.FC<HomePageProps> = ({ user, onNavigate }) => {
  const [stats, setStats] = useState<HomeStats>({
    projects: 0,
    documents: 0,
    customers: 0,
    sales: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const loadStats = async () => {
      setStatsLoading(true);
      try {
        const projectsRef = collection(db, 'workspaces', user.workspaceId, 'projects');
        const projectsQuery = user.hasFullProjectAccess
          ? query(projectsRef)
          : query(projectsRef, where('assignedUserIds', 'array-contains', user.id));
        const snapshot = await getDocs(projectsQuery);

        let documentCount = 0;
        let salesTotal = 0;
        const uniqueCustomers = new Set<string>();

        snapshot.forEach((docSnap) => {
          const raw = docSnap.data() as Partial<ProjectData> & {
            documentPipeline?: { readyDocuments?: string[] };
          };

          const owner = typeof raw.owner === 'string' ? raw.owner.trim() : '';
          if (owner && owner !== '-') {
            uniqueCustomers.add(owner.toLowerCase());
          }

          const readyDocuments = Array.isArray(raw.documentPipeline?.readyDocuments)
            ? raw.documentPipeline.readyDocuments.length
            : 0;
          documentCount += readyDocuments;

          const quotationData = Array.isArray(raw.quotationData)
            ? (raw.quotationData as QuotationItem[])
            : [];
          const operatingRate = typeof raw.operatingRate === 'number' ? raw.operatingRate : 0.05;

          const fallbackSales = getProjectGrandTotal({
            quotationData,
            markupRate: typeof raw.markupRate === 'number' ? raw.markupRate : undefined,
            discountConfig: raw.discountConfig,
            operatingCost: typeof raw.operatingCost === 'number' ? raw.operatingCost : undefined,
            operatingRate,
          });

          const salesFromLockedPrice = typeof raw.customerPrice === 'number' && raw.customerPrice > 0
            ? raw.customerPrice + (
              typeof raw.operatingCost === 'number'
                ? raw.operatingCost
                : Math.round(raw.customerPrice * operatingRate)
            )
            : 0;

          salesTotal += salesFromLockedPrice > 0 ? salesFromLockedPrice : fallbackSales;
        });

        if (!active) return;
        setStats({
          projects: snapshot.size,
          documents: documentCount,
          customers: uniqueCustomers.size,
          sales: Math.round(salesTotal),
        });
      } catch (error) {
        console.error('Failed to load HomePage stats:', error);
        if (!active) return;
        setStats({
          projects: 0,
          documents: 0,
          customers: 0,
          sales: 0,
        });
      } finally {
        if (active) {
          setStatsLoading(false);
        }
      }
    };

    void loadStats();

    return () => {
      active = false;
    };
  }, [user.hasFullProjectAccess, user.id, user.workspaceId]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('th-TH', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const services = [
    {
      id: 'boq',
      title: 'BOQ',
      subtitle: 'Bill of Quantities',
      description: 'สร้างใบเสนอราคา, สัญญา, ใบแจ้งหนี้',
      icon: '📋',
      path: '/workspace', // เดิม WorkspaceShell จะเป็นหน้า BOQ
      available: true,
      features: ['ใบเสนอราคา', 'สัญญาก่อสร้าง', 'ใบแจ้งหนี้', 'รายงานต้นทุน']
    },
    {
      id: 'documents',
      title: 'Documents',
      subtitle: 'EzBOQ Documents',
      description: 'ออกเอกสาร, สร้าง PDF, ส่งผ่าน LINE จากโมดูลเดียวใน EzBOQ',
      icon: '📄',
      path: '/docs',
      available: true,
      features: ['สร้าง draft / issue document', 'สร้าง PDF', 'ส่งผ่าน LINE OA', 'ใช้ auth + backend ชุดเดียวกับ EzBOQ']
    },
    {
      id: 'shop',
      title: 'Shop',
      subtitle: 'RFQ Marketplace',
      description: 'ซื้อวัสดุ, ขอราคา, เทียบ landed cost, แล้วออก PO',
      icon: '🛒',
      path: '/shop',
      available: true,
      features: ['Material Catalog', 'Purchase List จาก BOQ', 'RFQ no-API', 'เทียบราคา + ETA']
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-slate-900 mb-4">
              EzBOQ Platform
            </h1>
            <p className="text-xl text-slate-600 mb-2">
              Easy Business Online & Quality
            </p>
            <p className="text-slate-500">
              ยินดีต้อนรับ, {user.name} | {user.workspaceName}
            </p>
          </div>
        </div>
      </div>

      {/* Hero CTA: สร้างโปรเจคใหม่ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div
          onClick={() => onNavigate('/workspace#pipeline')}
          className="relative bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-8 text-white cursor-pointer hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg hover:shadow-xl"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-200 text-sm font-medium mb-1">BOQ-to-Cash Pipeline</p>
              <h2 className="text-2xl sm:text-3xl font-bold mb-2">
                สร้างโปรเจคใหม่ — ครบ Flow คลิกเดียว
              </h2>
              <p className="text-blue-100 text-sm sm:text-base max-w-xl">
                เลือก Template → ใส่ข้อมูล → ระบบสร้างเอกสารครบทุกอย่าง: ใบเสนอราคา, สัญญา, แบ่งงวด, PO, แผนงาน, ภาษี, ใบเสร็จ
              </p>
            </div>
            <div className="hidden sm:flex items-center justify-center w-20 h-20 bg-white/20 rounded-2xl">
              <span className="text-4xl">🚀</span>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {['เลือก Template', 'ใบเสนอราคา', 'แบ่งงวด', 'PO', 'สัญญาช่าง', 'ภาษี', 'ใบเสร็จ'].map((tag) => (
              <span key={tag} className="px-2.5 py-1 bg-white/15 rounded-full text-xs font-medium">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Services Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((service) => (
            <div
              key={service.id}
              className={`relative bg-white rounded-2xl shadow-sm border border-slate-200 p-8 transition-all duration-200 ${
                service.available
                  ? 'hover:shadow-lg hover:-translate-y-1 cursor-pointer'
                  : 'opacity-75'
              }`}
              onClick={() => service.available && onNavigate(service.path)}
            >
              {/* Service Header */}
              <div className="flex items-center mb-6">
                <div className="text-4xl mr-4">{service.icon}</div>
                <div>
                  <h3 className="text-xl font-semibold text-slate-900">
                    {service.title}
                  </h3>
                  <p className="text-sm text-slate-500">{service.subtitle}</p>
                </div>
              </div>

              {/* Description */}
              <p className="text-slate-600 mb-6">
                {service.description}
              </p>

              {/* Features */}
              <div className="space-y-2 mb-6">
                {service.features.map((feature, index) => (
                  <div key={index} className="flex items-center text-sm text-slate-600">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-3"></div>
                    {feature}
                  </div>
                ))}
              </div>

              {/* Action Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (service.available) onNavigate(service.path);
                }}
                disabled={!service.available}
                className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                  service.available
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                }`}
              >
                {service.available ? 'เข้าใช้งาน' : 'ยังไม่พร้อม'}
              </button>
            </div>
          ))}
        </div>

        {/* Quick Stats */}
        <div className="mt-12 bg-white rounded-2xl border border-slate-200 p-8">
          <h2 className="text-lg font-semibold text-slate-900 mb-6">
            สถิติการใช้งาน
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {statsLoading ? '...' : stats.projects.toLocaleString('th-TH')}
              </div>
              <div className="text-sm text-slate-600">โปรเจค BOQ</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {statsLoading ? '...' : stats.documents.toLocaleString('th-TH')}
              </div>
              <div className="text-sm text-slate-600">เอกสารทั้งหมด</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {statsLoading ? '...' : stats.customers.toLocaleString('th-TH')}
              </div>
              <div className="text-sm text-slate-600">ลูกค้า</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {statsLoading ? '...' : `${formatCurrency(stats.sales)} บาท`}
              </div>
              <div className="text-sm text-slate-600">ยอดขายรวม</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
