import React, { useMemo, useState } from 'react';
import { FileText, DollarSign, Calendar, FileSignature, ArrowLeft, Home, Package, Grid3x3, RefreshCw } from 'lucide-react';
import { loadCompanyProfile } from '../utils/companyProfile';
import { Villa175CustomerQuotationDocument } from './Villa175CustomerQuotationDocument';
import { Villa175CostQuotationDocument } from './Villa175CostQuotationDocument';
import { Villa175InvoiceDocument } from './Villa175InvoiceDocument';
import { Villa175WorkPlanDocument } from './Villa175WorkPlanDocument';
import { Villa175PurchaseOrderDocument } from './Villa175PurchaseOrderDocument';
import { ContractDocument } from './ContractDocument';
import {
  clearProjectUiState,
  loadProjectById,
  resetToDefault,
  selectWorkspaceProject,
  setSpecialPageState,
} from '../utils/storageUtils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';

type DocumentType = 'customer-quotation' | 'cost-quotation' | 'invoice' | 'work-plan' | 'purchase-order' | 'contract' | null;

export function Villa175DocumentsPage() {
  const [selectedDoc, setSelectedDoc] = useState<DocumentType>(null);
  const [showProjectMenu, setShowProjectMenu] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const co = loadCompanyProfile();
  const project = useMemo(
    () => loadProjectById('villa-ratchathewi-room175'),
    [],
  );

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center max-w-md">
          <p className="text-slate-500 text-sm">ไม่พบข้อมูลโครงการ</p>
          <p className="text-slate-400 text-xs mt-2">กรุณาสร้างโครงการใหม่จากหน้าหลัก</p>
          <button
            onClick={() => { setSpecialPageState(false); window.location.reload(); }}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
          >
            กลับหน้าหลัก
          </button>
        </div>
      </div>
    );
  }

  const handleBackToMain = () => {
    if (typeof window !== 'undefined') {
      setSpecialPageState(false);
      window.location.reload();
    }
  };

  const handleResetProjects = () => {
    resetToDefault();
    clearProjectUiState();

    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  const handleGoToConstruction = () => {
    if (typeof window !== 'undefined') {
      selectWorkspaceProject('construction-floor-masonry', { showSpecialPage: true });
      window.location.reload();
    }
  };

  const documents = [
    {
      id: 'customer-quotation' as DocumentType,
      name: 'ใบเสนอราคาลูกค้า',
      nameEn: 'Customer Quotation',
      description: 'ฉบับละเอียด แสดงรายการครบถ้วน (ส่งลูกค้า)',
      icon: FileText,
      color: 'purple',
      component: Villa175CustomerQuotationDocument,
    },
    {
      id: 'cost-quotation' as DocumentType,
      name: 'ใบเสนอราคาต้นทุน',
      nameEn: 'Cost Quotation',
      description: 'ฉบับภายใน แสดงต้นทุน+กำไร (มีปุ่มซ่อนราคา)',
      icon: DollarSign,
      color: 'red',
      component: Villa175CostQuotationDocument,
    },
    {
      id: 'invoice' as DocumentType,
      name: 'ใบวางบิล + แผนชำระ',
      nameEn: 'Invoice & Payment Plan',
      description: 'แบ่งชำระ 5 งวดตาม Phase งาน',
      icon: FileText,
      color: 'emerald',
      component: Villa175InvoiceDocument,
    },
    {
      id: 'work-plan' as DocumentType,
      name: 'แผนการทำงาน',
      nameEn: 'Work Plan',
      description: '13 สัปดาห์ + แผนการสั่งซื้อวัสดุ',
      icon: Calendar,
      color: 'blue',
      component: Villa175WorkPlanDocument,
    },
    {
      id: 'purchase-order' as DocumentType,
      name: 'ใบสั่งซื้อวัสดุ',
      nameEn: 'Customer Purchase Order',
      description: 'รายการที่ลูกค้าต้องซื้อเอง (กระเบื้อง, Top หิน)',
      icon: Package,
      color: 'orange',
      component: Villa175PurchaseOrderDocument,
    },
    {
      id: 'contract' as DocumentType,
      name: 'สัญญารับเหมาก่อสร้าง',
      nameEn: 'Construction Contract',
      description: 'สัญญาครบ 9 หมวด พร้อมลงนาม',
      icon: FileSignature,
      color: 'slate',
      component: ContractDocument,
    },
  ];

  if (selectedDoc) {
    const doc = documents.find(d => d.id === selectedDoc);
    if (doc) {
      const DocComponent = doc.component;
      return (
        <div className="min-h-screen bg-slate-100">
          <div className="print:hidden bg-white border-b shadow-sm sticky top-0 z-50">
            <div className="max-w-[210mm] mx-auto px-4 py-3 flex items-center justify-between">
              <button
                onClick={() => setSelectedDoc(null)}
                className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm">กลับไปเลือกเอกสาร</span>
              </button>
              <div className="text-right">
                <p className="text-sm text-slate-600">{doc.name}</p>
                <p className="text-xs text-slate-500">{doc.nameEn}</p>
              </div>
            </div>
          </div>
          <div className="py-8">
            <DocComponent project={project} />
          </div>
        </div>
      );
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header with Project Switcher */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBackToMain}
              className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow hover:shadow-md transition-all text-slate-700 hover:text-slate-900"
            >
              <Home className="w-4 h-4" />
              <span className="text-sm">หน้าหลัก</span>
            </button>
            
            <button
              onClick={() => setResetDialogOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg hover:bg-amber-100 transition-all"
              title="รีเซ็ตโครงการกลับเป็นค่าเริ่มต้น"
            >
              <RefreshCw className="w-4 h-4" />
              <span className="text-sm">รีเซ็ตโครงการ</span>
            </button>
          </div>
          
          <div className="relative">
            <button
              onClick={() => setShowProjectMenu(!showProjectMenu)}
              className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow hover:shadow-md transition-all text-slate-700 hover:text-slate-900"
            >
              <Grid3x3 className="w-4 h-4" />
              <span className="text-sm">เปลี่ยนโครงการ</span>
            </button>
            
            {showProjectMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-slate-200 overflow-hidden z-50">
                <div className="p-2 bg-slate-50 border-b border-slate-200">
                  <p className="text-xs text-slate-600">เลือกโครงการอื่น:</p>
                </div>
                <button
                  onClick={handleGoToConstruction}
                  className="w-full text-left px-4 py-3 hover:bg-orange-50 transition-colors border-b border-slate-100"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-700 rounded-lg flex items-center justify-center">
                      <FileText className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-800">งานก่อสร้าง</p>
                      <p className="text-xs text-slate-500">ปรับปรุงพื้น ก่อ-ฉาบ กันซึม</p>
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => {
                    if (typeof window !== 'undefined') {
                      selectWorkspaceProject('villa-ratchathewi-2br-room175');
                      window.location.reload();
                    }
                  }}
                  className="w-full text-left px-4 py-3 hover:bg-purple-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-700 rounded-lg flex items-center justify-center">
                      <FileText className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-800">Villa 2BR (เก่า)</p>
                      <p className="text-xs text-slate-500">โครงการรีโนเวทคอนโด</p>
                    </div>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>

        <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>รีเซ็ตข้อมูลโครงการนี้?</AlertDialogTitle>
              <AlertDialogDescription>
                ระบบจะคืนค่าข้อมูลกลับเป็นค่าเริ่มต้น และล้างการแก้ไขที่ยังเก็บไว้ในเครื่องนี้
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
              <AlertDialogAction onClick={handleResetProjects}>รีเซ็ต</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl mb-2 text-slate-800">ระบบเอกสารโครงการ</h1>
          <h2 className="text-2xl mb-4 text-blue-800">VILLA Ratchathewi (2BR ROOM 175)</h2>
          <p className="text-slate-600">
            งานรีโนเวทคอนโด 2 ห้องนอน (ครบวงจร) • ระยะเวลา 13 สัปดาห์ • ราคา 1,400,000 บาท
          </p>
        </div>

        {/* Document Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {documents.map((doc) => {
            const Icon = doc.icon;
            const colorClasses = {
              purple: 'from-purple-500 to-purple-700 hover:from-purple-600 hover:to-purple-800',
              red: 'from-red-500 to-red-700 hover:from-red-600 hover:to-red-800',
              emerald: 'from-emerald-500 to-emerald-700 hover:from-emerald-600 hover:to-emerald-800',
              blue: 'from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800',
              orange: 'from-orange-500 to-orange-700 hover:from-orange-600 hover:to-orange-800',
              slate: 'from-slate-600 to-slate-800 hover:from-slate-700 hover:to-slate-900',
            };

            return (
              <button
                key={doc.id}
                onClick={() => setSelectedDoc(doc.id)}
                className={`bg-gradient-to-br ${colorClasses[doc.color as keyof typeof colorClasses]} text-white rounded-xl shadow-lg hover:shadow-2xl transition-all transform hover:-translate-y-1 p-6 text-left group`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="bg-white/20 backdrop-blur-sm p-3 rounded-lg group-hover:bg-white/30 transition-colors">
                    <Icon className="w-8 h-8" />
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm px-3 py-1 rounded-full text-xs">
                    คลิกเพื่อดู
                  </div>
                </div>
                <h3 className="text-xl mb-1">{doc.name}</h3>
                <p className="text-sm opacity-90 mb-3">{doc.nameEn}</p>
                <p className="text-xs opacity-80">{doc.description}</p>
              </button>
            );
          })}
        </div>

        {/* Quick Summary */}
        <div className="mt-12 bg-white rounded-xl shadow-lg p-8">
          <h3 className="text-xl text-slate-800 mb-6 text-center">สรุปโครงการ</h3>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <p className="text-sm text-purple-700 mb-1">ต้นทุนรวม</p>
              <p className="text-2xl text-purple-900">1,116,000 ฿</p>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-700 mb-1">ราคาลูกค้า</p>
              <p className="text-2xl text-blue-900">1,400,000 ฿</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-green-700 mb-1">กำไรสุทธิ</p>
              <p className="text-2xl text-green-900">284,000 ฿ (25.4%)</p>
            </div>
          </div>

          <div className="mt-8 grid md:grid-cols-2 gap-6 text-sm text-slate-700">
            <div>
              <h4 className="text-base text-slate-800 mb-3">รายละเอียดงาน:</h4>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-0.5">•</span>
                  <span>งานทั่วไป (A-K): 433,500 บาท</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-0.5">•</span>
                  <span>Built-in ทั้งหมด: 682,500 บาท</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-0.5">•</span>
                  <span>ค่าดำเนินการ 5%: 66,660 บาท</span>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-base text-slate-800 mb-3">แผนการชำระเงิน:</h4>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">•</span>
                  <span>งวดที่ 1 (20%): มัดจำเริ่มงาน</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">•</span>
                  <span>งวดที่ 2 (20%): โครงสร้าง+ระบบ</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">•</span>
                  <span>งวดที่ 3 (30%): ห้องน้ำ+ฝ้า+พื้น+สี</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">•</span>
                  <span>งวดที่ 4 (20%): Built-in 50%</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">•</span>
                  <span>งวดที่ 5 (10%): ส่งมอบงาน</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-slate-600">
          <p>{co.companyName || co.companyNameTh || 'ชื่อบริษัท'} • {co.tagline || 'Interior Design & Construction'}</p>
          <p className="mt-1">{co.phone || '-'} • {co.email || '-'}</p>
        </div>
      </div>
    </div>
  );
}
