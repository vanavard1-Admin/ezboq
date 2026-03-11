import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { calculateBOQSummary } from '../utils/calculations';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';
import { ScrollArea } from '../components/ui/scroll-area';
import {
  Calculator,
  ArrowLeft,
  Plus,
  FileText,
  DollarSign,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Search,
  Download,
  Edit,
  Trash2,
  MoreVertical,
  Receipt,
  PieChart,
  FileCheck,
  RefreshCw,
  Filter,
  Eye,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '../components/ui/dropdown-menu';
import { toast } from 'sonner';
import { api, getUserLocalStorage, setUserLocalStorage } from '../utils/api'; // 🔒 Add user-specific localStorage helpers

interface TaxManagementPageProps {
  onBack: () => void;
}

interface QuotationTax {
  id: string;
  documentId: string;
  documentNumber: string;
  customerId: string;
  customerName: string;
  projectTitle: string;
  recipientType?: 'customer' | 'partner';
  subtotal: number;
  vatRate: number;
  vatAmount: number;
  grandTotal: number;
  issueDate: string;
  status: 'draft' | 'sent' | 'approved' | 'completed' | 'paid' | 'overdue' | 'cancelled';
  createdAt: number;
  updatedAt: number;
}

interface TaxRecord {
  id: string;
  documentId: string;
  documentNumber: string;
  customerId: string;
  customerName: string;
  customerTaxId?: string;
  projectTitle: string;
  paymentAmount: number;
  
  // VAT (ภาษีมูลค่าเพิ่ม)
  vatRate: number;
  vatAmount: number;
  
  // Withholding Tax (หัก ณ ที่จ่าย)
  withholdingTaxRate?: number;
  withholdingTaxAmount?: number;
  withholdingTaxType?: string;
  
  netPayment: number;
  paymentDate: string;
  taxDocumentNumber?: string;
  withholdingTaxDocumentNumber?: string;
  status: 'pending' | 'paid' | 'filed';
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export function TaxManagementPage({ onBack }: TaxManagementPageProps) {
  const [activeTab, setActiveTab] = useState<'quotations' | 'records'>('quotations');
  const [quotationTaxes, setQuotationTaxes] = useState<QuotationTax[]>([]);
  const [taxRecords, setTaxRecords] = useState<TaxRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Dialog states
  const [isAddTaxDialogOpen, setIsAddTaxDialogOpen] = useState(false);
  const [isEditTaxDialogOpen, setIsEditTaxDialogOpen] = useState(false);
  const [isDeleteTaxDialogOpen, setIsDeleteTaxDialogOpen] = useState(false);
  const [isDeleteQuotationDialogOpen, setIsDeleteQuotationDialogOpen] = useState(false);
  
  const [selectedTaxRecord, setSelectedTaxRecord] = useState<TaxRecord | null>(null);
  const [selectedQuotation, setSelectedQuotation] = useState<QuotationTax | null>(null);
  
  const [customers, setCustomers] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);

  const [taxFormData, setTaxFormData] = useState({
    customerId: '',
    documentId: '',
    paymentAmount: 0,
    vatRate: 7,
    withholdingTaxRate: 0,
    withholdingTaxType: '',
    paymentDate: new Date().toISOString().split('T')[0],
    taxDocumentNumber: '',
    withholdingTaxDocumentNumber: '',
    notes: '',
  });

  useEffect(() => {
    // 🔒 CRITICAL: AbortController for race condition prevention
    let isMounted = true;
    
    // 2.1 seed จาก cache ต่อ-ยูส ให้ UI ไม่ว่างเปล่า
    try {
      const raw = getUserLocalStorage('cache-tax-withholding');
      if (raw && isMounted) {
        const data = JSON.parse(raw);
        setTaxRecords(data.records || []);
        setLoading(false);
      }
    } catch {}

    // 2.2 subscribe ให้ UI อัปเดตทันทีเมื่อ background refresh เสร็จ
    const unsubscribe = api.cache.subscribe('tax-withholding', (data) => {
      if (!isMounted) return; // 🔒 Guard: Don't update if unmounted
      setTaxRecords(data.records || []);
      // sync เก็บกลับ localStorage ต่อ-ยูส
      try { 
        setUserLocalStorage('cache-tax-withholding', JSON.stringify(data)); 
      } catch {}
    });

    // 2.3 ยิงโหลดปกติหนึ่งครั้ง (with mounted check)
    loadData().catch(err => {
      if (isMounted) {
        console.error('loadData error:', err);
      }
    });

    return () => {
      isMounted = false; // 🔒 Mark as unmounted
      unsubscribe();
    };
  }, []);

  const loadData = async () => {
    try {
      console.log('🔄 TaxManagementPage: Loading all data...');
      setLoading(true);
      await Promise.all([
        loadQuotationTaxes(),
        loadTaxRecords(),
        loadCustomers(),
        loadDocuments(),
      ]);
      console.log('✅ TaxManagementPage: All data loaded successfully');
    } catch (error) {
      console.error('❌ TaxManagementPage: Failed to load data:', error);
      toast.error('ไม่สามารถโหลดข้อมูลได้');
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    try {
      setRefreshing(true);
      await loadData();
      toast.success('รีเฟรชข้อมูลสำเร็จ');
    } catch (error) {
      toast.error('ไม่สามารถรีเฟรชข้อมูลได้');
    } finally {
      setRefreshing(false);
    }
  };

  const loadQuotationTaxes = async () => {
    try {
      // ⚡ Cache-first with database fallback
      console.log('📊 Loading quotation taxes (cache-first)...');
      const data = await api.get('/documents?type=quotation&limit=50');

      if (data?.documents) {
        console.log(`📊 Documents loaded:`, data.documents?.length || 0);
        
        // Filter for quotation type only
        const allQuotations = (data.documents || []).filter((doc: any) => doc.type === 'quotation');
        console.log('📋 Quotations found:', allQuotations.length);
        
        if (allQuotations.length > 0) {
          const quotations = allQuotations.map((doc: any) => {
            const profile = doc.profile || {};
            const vatRate = profile.vatPct || 7;
            const summary = calculateDocumentSummary(doc);
            
            return {
              id: doc.id,
              documentId: doc.id,
              documentNumber: doc.documentNumber,
              customerId: doc.customerId || doc.partnerId || '',
              customerName: doc.customerName || doc.partnerName || '',
              projectTitle: doc.projectTitle || '',
              recipientType: doc.recipientType || 'customer',
              subtotal: summary.totalBeforeVat,
              vatRate: vatRate,
              vatAmount: summary.vat,
              grandTotal: summary.grandTotal,
              issueDate: doc.issueDate || new Date().toISOString().split('T')[0],
              status: doc.status || 'draft',
              createdAt: doc.createdAt || Date.now(),
              updatedAt: doc.updatedAt || Date.now(),
            };
          });
          
          setQuotationTaxes(quotations);
          console.log('✅ Quotation taxes set:', quotations.length);
        } else {
          // Empty result from server
          setQuotationTaxes([]);
          console.log('ℹ️ No quotations available');
        }
      } else {
        // API error
        setQuotationTaxes([]);
        console.log('⚠️ API error, showing empty state');
      }
    } catch (error) {
      console.error('❌ Failed to load quotation taxes:', error);
      setQuotationTaxes([]);
    }
  };

  const calculateDocumentSummary = (doc: any) => {
    const items = doc.boqItems || [];
    const profile = doc.profile || { wastePct: 3, opexPct: 5, errorPct: 2, markupPct: 10, vatPct: 7 };
    const discount = doc.discount;
    
    const summary = calculateBOQSummary(items, profile, discount);
    
    return { 
      totalBeforeVat: summary.totalBeforeVat, 
      vat: summary.vat, 
      grandTotal: summary.totalAfterDiscount 
    };
  };

  const loadTaxRecords = async () => {
    try {
      console.log('🔍 Loading tax records...');
      const data = await api.get('/tax-records');

      if (data?.taxRecords) {
        console.log('✅ Tax records loaded:', data.taxRecords?.length || 0);
        setTaxRecords(data.taxRecords || []);
        
        // Save to localStorage for future use (user-specific)
        if (data.taxRecords) {
          setUserLocalStorage('boq_tax_records', JSON.stringify(data.taxRecords));
        }
      }
    } catch (error) {
      console.error('❌ Failed to load tax records:', error);
      // Try localStorage fallback (user-specific)
      const stored = getUserLocalStorage('boq_tax_records');
      if (stored) {
        const taxRecords = JSON.parse(stored);
        setTaxRecords(taxRecords || []);
        console.log('✅ Loaded', taxRecords.length, 'tax records from localStorage (fallback)');
      }
    }
  };

  const loadCustomers = async () => {
    try {
      const data = await api.get('/customers');
      if (data?.customers) {
        setCustomers(data.customers || []);
        
        // Save to localStorage
        if (data.customers) {
          setUserLocalStorage('boq_customers', JSON.stringify(data.customers));
        }
      }
    } catch (error) {
      console.error('Failed to load customers:', error);
      // Try localStorage fallback
      const stored = getUserLocalStorage('boq_customers');
      if (stored) {
        setCustomers(JSON.parse(stored));
      }
    }
  };

  const loadDocuments = async () => {
    try {
      // ⚡ NUCLEAR MODE: Use cache-only, return empty if no cache
      console.log('📊 Loading documents from cache...');
      const data = await api.get('/documents?type=quotation&limit=50').catch(err => {
        console.log('⚠️ Documents cache miss, using empty data');
        return null;
      });
      
      if (data?.documents) {
        const quotations = (data.documents || []).filter((doc: any) => doc.type === 'quotation');
        setDocuments(quotations);
        console.log('✅ Loaded', quotations.length, 'quotations from cache');
        
        // Save to localStorage (user-specific)
        if (quotations.length > 0) {
          setUserLocalStorage('boq_tax_documents', JSON.stringify(quotations));
        }
      } else {
        // No cache available - try localStorage (user-specific)
        const stored = getUserLocalStorage('boq_tax_documents');
        if (stored) {
          setDocuments(JSON.parse(stored));
        } else {
          setDocuments([]);
          console.log('ℹ️ No cached documents available');
        }
      }
    } catch (error) {
      console.error('Failed to load documents:', error);
      // Try localStorage fallback (user-specific)
      const stored = getUserLocalStorage('boq_tax_documents');
      if (stored) {
        setDocuments(JSON.parse(stored));
      } else {
        setDocuments([]);
      }
    }
  };

  const handleAddTaxRecord = async () => {
    if (!taxFormData.customerId || !taxFormData.documentId || !taxFormData.paymentAmount) {
      toast.error('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }

    if (taxFormData.vatRate < 0 || taxFormData.vatRate > 100) {
      toast.error('อัตรา VAT ต้องอยู่ระหว่าง 0-100%');
      return;
    }

    if (taxFormData.withholdingTaxRate < 0 || taxFormData.withholdingTaxRate > 100) {
      toast.error('อัตราหัก ณ ที่จ่าย ต้องอยู่ระหว่าง 0-100%');
      return;
    }

    try {
      const customer = customers.find(c => c.id === taxFormData.customerId);
      const document = documents.find(d => d.id === taxFormData.documentId);

      const vatAmount = (taxFormData.paymentAmount * taxFormData.vatRate) / 100;
      const withholdingTaxAmount = (taxFormData.paymentAmount * taxFormData.withholdingTaxRate) / 100;
      const netPayment = taxFormData.paymentAmount + vatAmount - withholdingTaxAmount;

      const newTax: TaxRecord = {
        id: `tax-${Date.now()}`,
        documentId: taxFormData.documentId,
        documentNumber: document?.documentNumber || '',
        customerId: taxFormData.customerId,
        customerName: customer?.name || '',
        customerTaxId: customer?.taxId,
        projectTitle: document?.projectTitle || '',
        paymentAmount: taxFormData.paymentAmount,
        vatRate: taxFormData.vatRate,
        vatAmount,
        withholdingTaxRate: taxFormData.withholdingTaxRate,
        withholdingTaxAmount,
        withholdingTaxType: taxFormData.withholdingTaxType,
        netPayment,
        paymentDate: taxFormData.paymentDate,
        taxDocumentNumber: taxFormData.taxDocumentNumber,
        withholdingTaxDocumentNumber: taxFormData.withholdingTaxDocumentNumber,
        status: 'pending',
        notes: taxFormData.notes,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const response = await api.post('/tax-records', newTax);

      if (response.ok) {
        setTaxRecords([...taxRecords, newTax]);
        setIsAddTaxDialogOpen(false);
        resetTaxForm();
        toast.success('เพิ่มบันทึกภาษีสำเร็จ!');
      }
    } catch (error) {
      console.error('Failed to add tax record:', error);
      toast.error('ไม่สามารถเพิ่มข้อมูลได้');
    }
  };

  const handleEditTaxRecord = async () => {
    if (!selectedTaxRecord) return;

    try {
      const customer = customers.find(c => c.id === taxFormData.customerId);
      const document = documents.find(d => d.id === taxFormData.documentId);

      const vatAmount = (taxFormData.paymentAmount * taxFormData.vatRate) / 100;
      const withholdingTaxAmount = (taxFormData.paymentAmount * taxFormData.withholdingTaxRate) / 100;
      const netPayment = taxFormData.paymentAmount + vatAmount - withholdingTaxAmount;

      const updatedTax: TaxRecord = {
        ...selectedTaxRecord,
        documentId: taxFormData.documentId,
        documentNumber: document?.documentNumber || '',
        customerId: taxFormData.customerId,
        customerName: customer?.name || '',
        customerTaxId: customer?.taxId,
        projectTitle: document?.projectTitle || '',
        paymentAmount: taxFormData.paymentAmount,
        vatRate: taxFormData.vatRate,
        vatAmount,
        withholdingTaxRate: taxFormData.withholdingTaxRate,
        withholdingTaxAmount,
        withholdingTaxType: taxFormData.withholdingTaxType,
        netPayment,
        paymentDate: taxFormData.paymentDate,
        taxDocumentNumber: taxFormData.taxDocumentNumber,
        withholdingTaxDocumentNumber: taxFormData.withholdingTaxDocumentNumber,
        notes: taxFormData.notes,
        updatedAt: Date.now(),
      };

      const response = await api.put(`/tax-records/${selectedTaxRecord.id}`, updatedTax);

      if (response.ok) {
        setTaxRecords(
          taxRecords.map(t => (t.id === selectedTaxRecord.id ? updatedTax : t))
        );
        setIsEditTaxDialogOpen(false);
        setSelectedTaxRecord(null);
        resetTaxForm();
        toast.success('แก้ไขบันทึกภาษีสำเร็จ!');
      }
    } catch (error) {
      console.error('Failed to edit tax record:', error);
      toast.error('ไม่สามารถแก้ไขข้อมูลได้');
    }
  };

  const handleDeleteTaxRecord = async () => {
    if (!selectedTaxRecord) return;

    try {
      const response = await api.delete(`/tax-records/${selectedTaxRecord.id}`);

      if (response.ok) {
        setTaxRecords(taxRecords.filter(t => t.id !== selectedTaxRecord.id));
        setIsDeleteTaxDialogOpen(false);
        setSelectedTaxRecord(null);
        toast.success('ลบบันทึกภาษีสำเร็จ!');
      }
    } catch (error) {
      console.error('Failed to delete tax record:', error);
      toast.error('ไม่สามารถลบข้อมูลได้');
    }
  };

  const handleDeleteQuotation = async () => {
    if (!selectedQuotation) return;

    try {
      const response = await api.delete(`/documents/${selectedQuotation.documentId}`);

      if (response.ok) {
        setQuotationTaxes(quotationTaxes.filter(q => q.id !== selectedQuotation.id));
        setIsDeleteQuotationDialogOpen(false);
        setSelectedQuotation(null);
        toast.success('ลบใบเสนอราคาสำเร็จ!');
      }
    } catch (error) {
      console.error('Failed to delete quotation:', error);
      toast.error('ไม่สามารถลบเอกสารได้');
    }
  };

  const handleSelectDocument = (documentId: string) => {
    const document = documents.find(d => d.id === documentId);
    if (document && document.profile) {
      setTaxFormData({
        ...taxFormData,
        documentId,
        vatRate: document.profile.vatPct || 7,
      });
      toast.success(`อัตรา VAT จากใบเสนอราคา: ${document.profile.vatPct || 7}%`);
    } else {
      setTaxFormData({
        ...taxFormData,
        documentId,
      });
    }
  };

  const openEditTaxDialog = (record: TaxRecord) => {
    setSelectedTaxRecord(record);
    setTaxFormData({
      customerId: record.customerId,
      documentId: record.documentId,
      paymentAmount: record.paymentAmount,
      vatRate: record.vatRate,
      withholdingTaxRate: record.withholdingTaxRate || 0,
      withholdingTaxType: record.withholdingTaxType || '',
      paymentDate: record.paymentDate,
      taxDocumentNumber: record.taxDocumentNumber || '',
      withholdingTaxDocumentNumber: record.withholdingTaxDocumentNumber || '',
      notes: record.notes || '',
    });
    setIsEditTaxDialogOpen(true);
  };

  const openDeleteTaxDialog = (record: TaxRecord) => {
    setSelectedTaxRecord(record);
    setIsDeleteTaxDialogOpen(true);
  };

  const openDeleteQuotationDialog = (quotation: QuotationTax) => {
    setSelectedQuotation(quotation);
    setIsDeleteQuotationDialogOpen(true);
  };

  const resetTaxForm = () => {
    setTaxFormData({
      customerId: '',
      documentId: '',
      paymentAmount: 0,
      vatRate: 7,
      withholdingTaxRate: 0,
      withholdingTaxType: '',
      paymentDate: new Date().toISOString().split('T')[0],
      taxDocumentNumber: '',
      withholdingTaxDocumentNumber: '',
      notes: '',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getTotalStats = () => {
    const totalVatAmount = taxRecords.reduce((sum, tax) => sum + (tax.vatAmount || 0), 0);
    const totalWithholdingTax = taxRecords.reduce((sum, tax) => sum + (tax.withholdingTaxAmount || 0), 0);
    const totalVat = quotationTaxes.reduce((sum, q) => sum + (q.vatAmount || 0), 0);
    const totalRevenue = quotationTaxes.reduce((sum, q) => sum + (q.grandTotal || 0), 0);
    const pendingVat = taxRecords.filter(t => t.status === 'pending').reduce((sum, t) => sum + (t.vatAmount || 0), 0);

    return { totalVatAmount, totalWithholdingTax, totalVat, totalRevenue, pendingVat };
  };

  const stats = getTotalStats();

  const filteredQuotationTaxes = quotationTaxes.filter(tax => {
    const matchesSearch = searchQuery
      ? tax.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tax.documentNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tax.projectTitle.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    const matchesStatus = statusFilter === 'all' || tax.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredTaxRecords = taxRecords.filter(tax => {
    const matchesSearch = searchQuery
      ? tax.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tax.documentNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tax.projectTitle.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    const matchesStatus = statusFilter === 'all' || tax.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { label: 'ร่าง', variant: 'outline' as const, className: 'bg-gray-100 text-gray-700' },
      sent: { label: 'ส่งแล้ว', variant: 'secondary' as const, className: 'bg-blue-500 text-white' },
      approved: { label: 'อนุมัติแล้ว', variant: 'default' as const, className: 'bg-green-500 text-white' },
      completed: { label: 'เสร็จสิ้น', variant: 'default' as const, className: 'bg-green-600 text-white' },
      paid: { label: 'ชำระแล้ว', variant: 'default' as const, className: 'bg-emerald-500 text-white' },
      overdue: { label: 'เกินกำหนด', variant: 'destructive' as const, className: 'bg-red-500 text-white' },
      cancelled: { label: 'ยกเลิก', variant: 'outline' as const, className: 'bg-red-100 text-red-700' },
      pending: { label: 'รอดำเนินการ', variant: 'outline' as const, className: 'bg-amber-100 text-amber-700' },
      filed: { label: 'ยื่นแล้ว', variant: 'default' as const, className: 'bg-green-500 text-white' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    return (
      <Badge variant={config.variant} className={config.className}>
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 p-3 sm:p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:gap-4 mb-4 sm:mb-6 md:mb-8">
          <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onBack} 
              className="shrink-0 hover:bg-purple-100"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shrink-0">
                <Calculator className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl truncate">จัดการภาษีและเอกสาร</h1>
                <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
                  ติดตามและบริหารภาษีมูลค่าเพิ่ม (VAT) และเอกสารใบเสนอราคา
                </p>
              </div>
            </div>
            <Button
              onClick={refreshData}
              variant="outline"
              size="icon"
              className="shrink-0"
              disabled={refreshing}
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          {(quotationTaxes.length > 0 || taxRecords.length > 0) && !loading && (
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300 text-xs">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                <span className="hidden sm:inline">ข้อมูลถูกบันทึกอัตโนมัติ</span>
                <span className="sm:hidden">บันทึกอัตโนมัติ</span>
              </Badge>
              <Badge variant="outline" className="text-xs">
                {quotationTaxes.length} ใบเสนอราคา
              </Badge>
              <Badge variant="outline" className="text-xs">
                {taxRecords.length} บันทึกภาษี
              </Badge>
            </div>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-4 sm:mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="p-4 sm:p-6 bg-gradient-to-br from-blue-500 to-cyan-600 text-white shadow-lg hover:shadow-xl transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <DollarSign className="w-8 h-8 sm:w-10 sm:h-10 opacity-80" />
                <div className="p-2 bg-white/20 rounded-lg">
                  <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
              </div>
              <p className="text-xs sm:text-sm opacity-90 mb-1">รายได้รวม</p>
              <p className="text-xl sm:text-2xl lg:text-3xl">{formatCurrency(stats.totalRevenue)}</p>
              <p className="text-xs opacity-75 mt-1">จากใบเสนอราคา</p>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="p-4 sm:p-6 bg-gradient-to-br from-purple-500 to-pink-600 text-white shadow-lg hover:shadow-xl transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <Calculator className="w-8 h-8 sm:w-10 sm:h-10 opacity-80" />
                <div className="p-2 bg-white/20 rounded-lg">
                  <PieChart className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
              </div>
              <p className="text-xs sm:text-sm opacity-90 mb-1">VAT รวม</p>
              <p className="text-xl sm:text-2xl lg:text-3xl">{formatCurrency(stats.totalVat)}</p>
              <p className="text-xs opacity-75 mt-1">{quotationTaxes.length} รายการ</p>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="p-4 sm:p-6 bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-lg hover:shadow-xl transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle2 className="w-8 h-8 sm:w-10 sm:h-10 opacity-80" />
                <div className="p-2 bg-white/20 rounded-lg">
                  <Receipt className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
              </div>
              <p className="text-xs sm:text-sm opacity-90 mb-1">VAT บันทึกแล้ว</p>
              <p className="text-xl sm:text-2xl lg:text-3xl">{formatCurrency(stats.totalVatAmount)}</p>
              <p className="text-xs opacity-75 mt-1">{taxRecords.length} รายการ</p>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="p-4 sm:p-6 bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg hover:shadow-xl transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <Receipt className="w-8 h-8 sm:w-10 sm:h-10 opacity-80" />
                <div className="p-2 bg-white/20 rounded-lg">
                  <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
              </div>
              <p className="text-xs sm:text-sm opacity-90 mb-1">หัก ณ ที่จ่าย</p>
              <p className="text-xl sm:text-2xl lg:text-3xl">{formatCurrency(stats.totalWithholdingTax)}</p>
              <p className="text-xs opacity-75 mt-1">ภาษีหักรวม</p>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card className="p-4 sm:p-6 bg-gradient-to-br from-red-500 to-rose-600 text-white shadow-lg hover:shadow-xl transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <AlertCircle className="w-8 h-8 sm:w-10 sm:h-10 opacity-80" />
                <div className="p-2 bg-white/20 rounded-lg">
                  <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
              </div>
              <p className="text-xs sm:text-sm opacity-90 mb-1">VAT ค้าง</p>
              <p className="text-xl sm:text-2xl lg:text-3xl">{formatCurrency(stats.pendingVat)}</p>
              <p className="text-xs opacity-75 mt-1">ต้องดำเนินการ</p>
            </Card>
          </motion.div>
        </div>

        {/* Search and Filter */}
        <Card className="p-3 sm:p-4 mb-4 sm:mb-6 shadow-md">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="ค้นหา (ชื่อ, เลขที่เอกสาร, โครงการ)"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="สถานะ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทั้งหมด</SelectItem>
                <SelectItem value="draft">ร่าง</SelectItem>
                <SelectItem value="sent">ส่งแล้ว</SelectItem>
                <SelectItem value="approved">อนุมัติแล้ว</SelectItem>
                <SelectItem value="completed">เสร็จสิ้น</SelectItem>
                <SelectItem value="pending">รอดำเนินการ</SelectItem>
                <SelectItem value="paid">ชำระแล้ว</SelectItem>
                <SelectItem value="filed">ยื่นแล้ว</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-4">
            <TabsList className="bg-white shadow-sm w-full sm:w-auto">
              <TabsTrigger value="quotations" className="gap-2 flex-1 sm:flex-initial">
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">ใบเสนอราคา</span>
                <span className="sm:hidden">เสนอราคา</span>
                <Badge variant="secondary" className="ml-1">{quotationTaxes.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="records" className="gap-2 flex-1 sm:flex-initial">
                <Receipt className="w-4 h-4" />
                <span className="hidden sm:inline">บันทึกภาษี</span>
                <span className="sm:hidden">บันทึก</span>
                <Badge variant="secondary" className="ml-1">{taxRecords.length}</Badge>
              </TabsTrigger>
            </TabsList>
            {activeTab === 'records' && (
              <Button
                onClick={() => setIsAddTaxDialogOpen(true)}
                className="gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 w-full sm:w-auto"
                size="sm"
              >
                <Plus className="w-4 h-4" />
                เพิ่มบันทึกภาษี
              </Button>
            )}
          </div>

          {/* Quotation Tax Tab */}
          <TabsContent value="quotations" className="mt-0">
            {/* Desktop Table View */}
            <Card className="shadow-lg hidden md:block">
              <ScrollArea className="h-[600px]">
                <Table>
                  <TableHeader className="bg-gray-50 sticky top-0 z-10">
                    <TableRow>
                      <TableHead className="w-[100px]">วันที่</TableHead>
                      <TableHead className="w-[140px]">เอกสาร</TableHead>
                      <TableHead className="w-[100px]">ประเภท</TableHead>
                      <TableHead>ชื่อ</TableHead>
                      <TableHead>โครงการ</TableHead>
                      <TableHead className="text-right">มูลค่าก่อนภาษี</TableHead>
                      <TableHead className="text-right w-[80px]">VAT</TableHead>
                      <TableHead className="text-right">ภาษี</TableHead>
                      <TableHead className="text-right">รวมทั้งสิ้น</TableHead>
                      <TableHead className="text-center w-[100px]">สถานะ</TableHead>
                      <TableHead className="text-center w-[70px]">จัดการ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={11} className="text-center py-12">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                            <span className="text-muted-foreground">กำลังโหลดข้อมูล...</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : filteredQuotationTaxes.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={11} className="text-center py-16">
                          <div className="flex flex-col items-center justify-center gap-4">
                            <div className="w-20 h-20 rounded-full bg-purple-100 flex items-center justify-center">
                              <FileText className="w-10 h-10 text-purple-600" />
                            </div>
                            <div>
                              <p className="text-lg font-medium mb-1">
                                {quotationTaxes.length === 0 ? 'ยังไม่มีใบเสนอราคา' : 'ไม่พบข้อมูล'}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {quotationTaxes.length === 0
                                  ? 'กลับไปที่หน้าหลักเพื่อสร้าง BOQ → Quotation'
                                  : 'ไม่พบข้อมูลที่ตรงกับเงื่อนไขการค้นหา'}
                              </p>
                            </div>
                            {quotationTaxes.length === 0 && (
                              <Button onClick={onBack} variant="outline" className="gap-2">
                                <ArrowLeft className="w-4 h-4" />
                                กลับหน้าหลัก
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredQuotationTaxes.map((tax, index) => (
                        <motion.tr
                          key={tax.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.03 }}
                          className="hover:bg-purple-50/50 transition-colors"
                        >
                          <TableCell className="text-sm">{formatDate(tax.issueDate)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="p-1.5 bg-purple-100 rounded">
                                <FileText className="w-3.5 h-3.5 text-purple-600" />
                              </div>
                              <span className="text-sm font-medium">{tax.documentNumber}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant="outline" 
                              className={tax.recipientType === 'partner' ? 'bg-orange-100 text-orange-700 border-orange-300' : 'bg-blue-100 text-blue-700 border-blue-300'}
                            >
                              {tax.recipientType === 'partner' ? 'พาร์ทเนอร์' : 'ลูกค้า'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <p className="text-sm font-medium truncate max-w-[150px]">{tax.customerName}</p>
                          </TableCell>
                          <TableCell>
                            <p className="text-sm truncate text-muted-foreground max-w-[200px]">{tax.projectTitle}</p>
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            {formatCurrency(tax.subtotal)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                              {tax.vatRate}%
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right text-purple-600 font-medium">
                            {formatCurrency(tax.vatAmount)}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(tax.grandTotal)}
                          </TableCell>
                          <TableCell className="text-center">
                            {getStatusBadge(tax.status)}
                          </TableCell>
                          <TableCell className="text-center">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem className="gap-2">
                                  <Eye className="w-4 h-4" />
                                  ดูรายละเอียด
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => openDeleteQuotationDialog(tax)}
                                  className="gap-2 text-red-600"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  ลบเอกสาร
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </motion.tr>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </Card>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-3">
              <AnimatePresence mode="wait">
                {loading ? (
                  <Card className="p-6">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                      <span className="text-muted-foreground">กำลังโหลดข้อมูล...</span>
                    </div>
                  </Card>
                ) : filteredQuotationTaxes.length === 0 ? (
                  <Card className="p-6">
                    <div className="flex flex-col items-center justify-center gap-4">
                      <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center">
                        <FileText className="w-8 h-8 text-purple-600" />
                      </div>
                      <div className="text-center">
                        <p className="font-medium mb-1">
                          {quotationTaxes.length === 0 ? 'ยังไม่มีใบเสนอราคา' : 'ไม่พบข้อมูล'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {quotationTaxes.length === 0
                            ? 'กลับไปที่หน้าหล��กเพื่อสร้าง BOQ → Quotation'
                            : 'ไม่พบข้อมูลที่ตรงกับเงื่อนไขการค้นหา'}
                        </p>
                      </div>
                      {quotationTaxes.length === 0 && (
                        <Button onClick={onBack} variant="outline" className="gap-2 w-full">
                          <ArrowLeft className="w-4 h-4" />
                          กลับหน้าหลัก
                        </Button>
                      )}
                    </div>
                  </Card>
                ) : (
                  filteredQuotationTaxes.map((tax, index) => (
                    <motion.div
                      key={tax.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ delay: index * 0.03 }}
                    >
                      <Card className="p-4 hover:shadow-md transition-shadow">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <div className="p-1.5 bg-purple-100 rounded shrink-0">
                                <FileText className="w-3.5 h-3.5 text-purple-600" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium truncate">{tax.documentNumber}</p>
                                <p className="text-xs text-muted-foreground">{formatDate(tax.issueDate)}</p>
                              </div>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="shrink-0">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem className="gap-2">
                                  <Eye className="w-4 h-4" />
                                  ดูรายละเอียด
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => openDeleteQuotationDialog(tax)}
                                  className="gap-2 text-red-600"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  ลบเอกสาร
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>

                          <div className="flex items-center justify-between gap-2">
                            {getStatusBadge(tax.status)}
                            <Badge 
                              variant="outline" 
                              className={tax.recipientType === 'partner' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}
                            >
                              {tax.recipientType === 'partner' ? 'พาร์ทเนอร์' : 'ลูกค้า'}
                            </Badge>
                          </div>

                          <div>
                            <p className="text-sm font-medium">{tax.customerName}</p>
                            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{tax.projectTitle}</p>
                          </div>

                          <div className="border-t pt-3 space-y-2">
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div>
                                <p className="text-xs text-muted-foreground">มูลค่าก่อนภาษี</p>
                                <p className="font-medium">{formatCurrency(tax.subtotal)}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">VAT {tax.vatRate}%</p>
                                <p className="font-medium text-purple-600">{formatCurrency(tax.vatAmount)}</p>
                              </div>
                            </div>
                            
                            <div className="bg-purple-50 -mx-4 -mb-4 px-4 py-2.5 rounded-b-lg">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">รวมทั้งสิ้น</span>
                                <span className="text-lg font-medium text-purple-700">{formatCurrency(tax.grandTotal)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </TabsContent>

          {/* Tax Records Tab */}
          <TabsContent value="records" className="mt-0">
            {/* Desktop Table View */}
            <Card className="shadow-lg hidden md:block">
              <ScrollArea className="h-[600px]">
                <Table>
                  <TableHeader className="bg-gray-50 sticky top-0 z-10">
                    <TableRow>
                      <TableHead className="w-[100px]">วันที่</TableHead>
                      <TableHead className="w-[120px]">เอกสาร</TableHead>
                      <TableHead>ลูกค้า</TableHead>
                      <TableHead>โครงการ</TableHead>
                      <TableHead className="text-right">ยอดก่อนภาษี</TableHead>
                      <TableHead className="text-right w-[70px]">VAT</TableHead>
                      <TableHead className="text-right">VAT (฿)</TableHead>
                      <TableHead className="text-right w-[70px]">หัก ณ ฯ</TableHead>
                      <TableHead className="text-right">หัก ณ ฯ (฿)</TableHead>
                      <TableHead className="text-right">จ่ายสุทธิ</TableHead>
                      <TableHead className="text-center w-[90px]">สถานะ</TableHead>
                      <TableHead className="text-center w-[70px]">จัดการ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={12} className="text-center py-12">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                            <span className="text-muted-foreground">กำลังโหลดข้อมูล...</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : filteredTaxRecords.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={12} className="text-center py-16">
                          <div className="flex flex-col items-center justify-center gap-4">
                            <div className="w-20 h-20 rounded-full bg-indigo-100 flex items-center justify-center">
                              <Receipt className="w-10 h-10 text-indigo-600" />
                            </div>
                            <div>
                              <p className="text-lg font-medium mb-1">
                                {taxRecords.length === 0 ? 'ยังไม่มีบันทึกภาษี' : 'ไม่พบข้อมูล'}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {taxRecords.length === 0
                                  ? 'คลิก "เพิ่มบันทึกภาษี" เพื่อเริ่มต้นบันทึกข้อมูลภาษี'
                                  : 'ไม่พบข้อมูลที่ตรงกับเงื่อนไขการค้นหา'}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredTaxRecords.map((tax, index) => (
                        <motion.tr
                          key={tax.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.03 }}
                          className="hover:bg-purple-50/50 transition-colors"
                        >
                          <TableCell className="text-sm">{formatDate(tax.paymentDate)}</TableCell>
                          <TableCell>
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <div className="p-1.5 bg-indigo-100 rounded">
                                  <FileText className="w-3.5 h-3.5 text-indigo-600" />
                                </div>
                                <span className="text-sm font-medium">{tax.documentNumber}</span>
                              </div>
                              {tax.taxDocumentNumber && (
                                <p className="text-xs text-muted-foreground ml-8 truncate">
                                  ภ.ง.ด.: {tax.taxDocumentNumber}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="text-sm font-medium truncate max-w-[150px]">{tax.customerName}</p>
                              {tax.customerTaxId && (
                                <p className="text-xs text-muted-foreground truncate">
                                  {tax.customerTaxId}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <p className="text-sm truncate text-muted-foreground max-w-[200px]">{tax.projectTitle}</p>
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            {formatCurrency(tax.paymentAmount)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                              {tax.vatRate}%
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right text-green-600">
                            +{formatCurrency(tax.vatAmount)}
                          </TableCell>
                          <TableCell className="text-right">
                            {tax.withholdingTaxRate ? (
                              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                                {tax.withholdingTaxRate}%
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right text-red-600">
                            {tax.withholdingTaxAmount ? (
                              <>-{formatCurrency(tax.withholdingTaxAmount)}</>
                            ) : (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(tax.netPayment)}
                          </TableCell>
                          <TableCell className="text-center">
                            {getStatusBadge(tax.status)}
                          </TableCell>
                          <TableCell className="text-center">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => openEditTaxDialog(tax)}
                                  className="gap-2"
                                >
                                  <Edit className="w-4 h-4" />
                                  แก้ไข
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => openDeleteTaxDialog(tax)}
                                  className="gap-2 text-red-600"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  ลบ
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </motion.tr>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </Card>

            {/* Mobile Card View for Tax Records */}
            <div className="md:hidden space-y-3">
              <AnimatePresence mode="wait">
                {loading ? (
                  <Card className="p-6">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                      <span className="text-muted-foreground">กำลังโหลดข้อมูล...</span>
                    </div>
                  </Card>
                ) : filteredTaxRecords.length === 0 ? (
                  <Card className="p-6">
                    <div className="flex flex-col items-center justify-center gap-4">
                      <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center">
                        <Receipt className="w-8 h-8 text-purple-600" />
                      </div>
                      <div className="text-center">
                        <p className="font-medium mb-1">
                          {taxRecords.length === 0 ? 'ยังไม่มีบันทึกภาษี' : 'ไม่พบข้อมูล'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {taxRecords.length === 0
                            ? 'คลิก "เพิ่มบันทึกภาษี" เพื่อเริ่มต้นบันทึก'
                            : 'ไม่พบข้อมูลที่ตรงกับเงื่อนไขการค้นหา'}
                        </p>
                      </div>
                    </div>
                  </Card>
                ) : (
                  filteredTaxRecords.map((tax, index) => (
                    <motion.div
                      key={tax.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ delay: index * 0.03 }}
                    >
                      <Card className="p-4 hover:shadow-md transition-shadow">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <div className="p-1.5 bg-purple-100 rounded shrink-0">
                                <Receipt className="w-3.5 h-3.5 text-purple-600" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium truncate">{tax.documentNumber}</p>
                                <p className="text-xs text-muted-foreground">{formatDate(tax.paymentDate)}</p>
                              </div>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="shrink-0">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => openEditTaxDialog(tax)}
                                  className="gap-2"
                                >
                                  <Edit className="w-4 h-4" />
                                  แก้ไข
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => openDeleteTaxDialog(tax)}
                                  className="gap-2 text-red-600"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  ลบ
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>

                          <div className="flex items-center justify-between">
                            {getStatusBadge(tax.status)}
                          </div>

                          <div>
                            <p className="text-sm font-medium">{tax.customerName}</p>
                            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{tax.projectTitle}</p>
                          </div>

                          <div className="border-t pt-3 space-y-2">
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div>
                                <p className="text-xs text-muted-foreground">ยอดก่อนภาษี</p>
                                <p className="font-medium">{formatCurrency(tax.paymentAmount)}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">VAT {tax.vatRate}%</p>
                                <p className="font-medium text-purple-600">{formatCurrency(tax.vatAmount)}</p>
                              </div>
                              {(tax.withholdingTaxRate ?? 0) > 0 && (
                                <div className="col-span-2">
                                  <p className="text-xs text-muted-foreground">หัก ณ ที่จ่าย {tax.withholdingTaxRate}%</p>
                                  <p className="font-medium text-red-600">-{formatCurrency(tax.withholdingTaxAmount || 0)}</p>
                                </div>
                              )}
                            </div>
                            
                            <div className="bg-purple-50 -mx-4 -mb-4 px-4 py-2.5 rounded-b-lg">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">จ่ายสุทธิ</span>
                                <span className="text-lg font-medium text-purple-700">{formatCurrency(tax.netPayment)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Add Tax Record Dialog */}
      <Dialog open={isAddTaxDialogOpen} onOpenChange={setIsAddTaxDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Plus className="w-5 h-5 text-purple-600" />
              </div>
              เพิ่มบันทึกภาษี
            </DialogTitle>
            <DialogDescription>
              บันทึกรายการภาษีจากใบเสนอราคา ระบบจะดึงอัตราภาษีมาให้อัตโนมัติ
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>ลูกค้า *</Label>
                <Select
                  value={taxFormData.customerId}
                  onValueChange={v => setTaxFormData({ ...taxFormData, customerId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกลูกค้า" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map(customer => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>ใบเสนอราคา *</Label>
                <Select
                  value={taxFormData.documentId}
                  onValueChange={handleSelectDocument}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกเอกสาร" />
                  </SelectTrigger>
                  <SelectContent>
                    {documents.map(doc => (
                      <SelectItem key={doc.id} value={doc.id}>
                        {doc.documentNumber} - {doc.projectTitle}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>ยอดเงินก่อนภาษี *</Label>
              <Input
                type="number"
                value={taxFormData.paymentAmount}
                onChange={e =>
                  setTaxFormData({
                    ...taxFormData,
                    paymentAmount: Number(e.target.value),
                  })
                }
                placeholder="50000"
              />
            </div>

            {/* VAT Section */}
            <div className="space-y-3 p-4 bg-purple-50 rounded-lg border border-purple-200">
              <h4 className="text-sm font-semibold text-purple-700">ภาษีมูลค่าเพิ่ม (VAT)</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>อัตรา VAT (0-100%) *</Label>
                  <Input
                    type="number"
                    value={taxFormData.vatRate}
                    onChange={e =>
                      setTaxFormData({ ...taxFormData, vatRate: Number(e.target.value) })
                    }
                    placeholder="7"
                    min="0"
                    max="100"
                    step="0.01"
                  />
                </div>
                <div>
                  <Label>เลขที่ใบกำกับภาษี (VAT)</Label>
                  <Input
                    value={taxFormData.taxDocumentNumber}
                    onChange={e =>
                      setTaxFormData({ ...taxFormData, taxDocumentNumber: e.target.value })
                    }
                    placeholder="เลขที่ใบกำกับภาษี"
                  />
                </div>
              </div>
            </div>

            {/* Withholding Tax Section */}
            <div className="space-y-3 p-4 bg-amber-50 rounded-lg border border-amber-200">
              <h4 className="text-sm font-semibold text-amber-700">หัก ณ ที่จ่าย (Withholding Tax)</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>อัตราหัก ณ ฯ (0-100%)</Label>
                  <Input
                    type="number"
                    value={taxFormData.withholdingTaxRate}
                    onChange={e =>
                      setTaxFormData({ ...taxFormData, withholdingTaxRate: Number(e.target.value) })
                    }
                    placeholder="3"
                    min="0"
                    max="100"
                    step="0.01"
                  />
                </div>
                <div>
                  <Label>ประเภทภาษีหัก ณ ฯ</Label>
                  <Select
                    value={taxFormData.withholdingTaxType}
                    onValueChange={v => setTaxFormData({ ...taxFormData, withholdingTaxType: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="เลือกประเภท" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ภ.ง.ด.3">ภ.ง.ด.3 (นิติบุคคล)</SelectItem>
                      <SelectItem value="ภ.ง.ด.53">ภ.ง.ด.53 (บุคคลธรรมดา)</SelectItem>
                      <SelectItem value="ภ.ง.ด.54">ภ.ง.ด.54 (กิจการที่ไม่มีสถานประกอบการ)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-full">
                  <Label>เลขที่หนังสือรับรองฯ (ภ.ง.ด.)</Label>
                  <Input
                    value={taxFormData.withholdingTaxDocumentNumber}
                    onChange={e =>
                      setTaxFormData({ ...taxFormData, withholdingTaxDocumentNumber: e.target.value })
                    }
                    placeholder="เลขที่หนังสือรับรองหัก ณ ที่จ่าย"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>วันที่จ่าย *</Label>
                <Input
                  type="date"
                  value={taxFormData.paymentDate}
                  onChange={e =>
                    setTaxFormData({ ...taxFormData, paymentDate: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>หมายเหตุ</Label>
                <Input
                  value={taxFormData.notes}
                  onChange={e => setTaxFormData({ ...taxFormData, notes: e.target.value })}
                  placeholder="บันทึกเพิ่มเติม"
                />
              </div>
            </div>

            {/* Calculation Preview */}
            {taxFormData.paymentAmount > 0 && (
              <Card className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200">
                <h4 className="text-sm font-semibold mb-3 text-purple-700">สรุปการคำนวณ</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">ยอดก่อนภาษี:</span>
                    <span className="font-semibold">{formatCurrency(taxFormData.paymentAmount)}</span>
                  </div>
                  <div className="flex justify-between items-center text-green-600">
                    <span className="text-sm">+ VAT {taxFormData.vatRate}%:</span>
                    <span className="font-semibold">
                      +{formatCurrency((taxFormData.paymentAmount * taxFormData.vatRate) / 100)}
                    </span>
                  </div>
                  {taxFormData.withholdingTaxRate > 0 && (
                    <div className="flex justify-between items-center text-red-600">
                      <span className="text-sm">- หัก ณ ฯ {taxFormData.withholdingTaxRate}%:</span>
                      <span className="font-semibold">
                        -{formatCurrency((taxFormData.paymentAmount * taxFormData.withholdingTaxRate) / 100)}
                      </span>
                    </div>
                  )}
                  <div className="pt-2 border-t border-purple-200"></div>
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-purple-700">จ่ายสุทธิ:</span>
                    <span className="text-lg font-bold text-purple-700">
                      {formatCurrency(
                        taxFormData.paymentAmount +
                          (taxFormData.paymentAmount * taxFormData.vatRate) / 100 -
                          (taxFormData.paymentAmount * taxFormData.withholdingTaxRate) / 100
                      )}
                    </span>
                  </div>
                </div>
              </Card>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsAddTaxDialogOpen(false)}>
              ยกเลิก
            </Button>
            <Button 
              onClick={handleAddTaxRecord}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              เพิ่มข้อมูล
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Tax Record Dialog */}
      <Dialog open={isEditTaxDialogOpen} onOpenChange={setIsEditTaxDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Edit className="w-5 h-5 text-blue-600" />
              </div>
              แก้ไขบันทึกภาษี
            </DialogTitle>
            <DialogDescription>
              แก้ไขข้อมูลบันทึกภาษี {selectedTaxRecord?.documentNumber}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>ลูกค้า *</Label>
                <Select
                  value={taxFormData.customerId}
                  onValueChange={v => setTaxFormData({ ...taxFormData, customerId: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map(customer => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>ใบเสนอราคา *</Label>
                <Select
                  value={taxFormData.documentId}
                  onValueChange={handleSelectDocument}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {documents.map(doc => (
                      <SelectItem key={doc.id} value={doc.id}>
                        {doc.documentNumber} - {doc.projectTitle}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>ยอดเงินก่อนภาษี *</Label>
              <Input
                type="number"
                value={taxFormData.paymentAmount}
                onChange={e =>
                  setTaxFormData({
                    ...taxFormData,
                    paymentAmount: Number(e.target.value),
                  })
                }
                placeholder="50000"
              />
            </div>

            {/* VAT Section */}
            <div className="space-y-3 p-4 bg-purple-50 rounded-lg border border-purple-200">
              <h4 className="text-sm font-semibold text-purple-700">ภาษีมูลค่าเพิ่ม (VAT)</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>อัตรา VAT (0-100%) *</Label>
                  <Input
                    type="number"
                    value={taxFormData.vatRate}
                    onChange={e =>
                      setTaxFormData({ ...taxFormData, vatRate: Number(e.target.value) })
                    }
                    min="0"
                    max="100"
                    step="0.01"
                  />
                </div>
                <div>
                  <Label>เลขที่ใบกำกับภาษี (VAT)</Label>
                  <Input
                    value={taxFormData.taxDocumentNumber}
                    onChange={e =>
                      setTaxFormData({ ...taxFormData, taxDocumentNumber: e.target.value })
                    }
                    placeholder="เลขที่ใบกำกับภาษี"
                  />
                </div>
              </div>
            </div>

            {/* Withholding Tax Section */}
            <div className="space-y-3 p-4 bg-amber-50 rounded-lg border border-amber-200">
              <h4 className="text-sm font-semibold text-amber-700">หัก ณ ที่จ่าย (Withholding Tax)</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>อัตราหัก ณ ฯ (0-100%)</Label>
                  <Input
                    type="number"
                    value={taxFormData.withholdingTaxRate}
                    onChange={e =>
                      setTaxFormData({ ...taxFormData, withholdingTaxRate: Number(e.target.value) })
                    }
                    min="0"
                    max="100"
                    step="0.01"
                  />
                </div>
                <div>
                  <Label>ประเภทภาษีหัก ณ ฯ</Label>
                  <Select
                    value={taxFormData.withholdingTaxType}
                    onValueChange={v => setTaxFormData({ ...taxFormData, withholdingTaxType: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="เลือกประเภท" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ภ.ง.ด.3">ภ.ง.ด.3 (นิติบุคคล)</SelectItem>
                      <SelectItem value="ภ.ง.ด.53">ภ.ง.ด.53 (บุคคลธรรมดา)</SelectItem>
                      <SelectItem value="ภ.ง.ด.54">ภ.ง.ด.54 (กิจการที่ไม่มีสถานประกอบการ)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-full">
                  <Label>เลขที่หนังสือรับรองฯ (ภ.ง.ด.)</Label>
                  <Input
                    value={taxFormData.withholdingTaxDocumentNumber}
                    onChange={e =>
                      setTaxFormData({ ...taxFormData, withholdingTaxDocumentNumber: e.target.value })
                    }
                    placeholder="เลขที่หนังสือรับรองหัก ณ ที่จ่าย"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>วันที่จ่าย *</Label>
                <Input
                  type="date"
                  value={taxFormData.paymentDate}
                  onChange={e =>
                    setTaxFormData({ ...taxFormData, paymentDate: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>หมายเหตุ</Label>
                <Input
                  value={taxFormData.notes}
                  onChange={e => setTaxFormData({ ...taxFormData, notes: e.target.value })}
                  placeholder="บันทึกเพิ่มเติม"
                />
              </div>
            </div>

            {/* Calculation Preview */}
            {taxFormData.paymentAmount > 0 && (
              <Card className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200">
                <h4 className="text-sm font-semibold mb-3 text-purple-700">สรุปการคำนวณ</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">ยอดก่อนภาษี:</span>
                    <span className="font-semibold">{formatCurrency(taxFormData.paymentAmount)}</span>
                  </div>
                  <div className="flex justify-between items-center text-green-600">
                    <span className="text-sm">+ VAT {taxFormData.vatRate}%:</span>
                    <span className="font-semibold">
                      +{formatCurrency((taxFormData.paymentAmount * taxFormData.vatRate) / 100)}
                    </span>
                  </div>
                  {taxFormData.withholdingTaxRate > 0 && (
                    <div className="flex justify-between items-center text-red-600">
                      <span className="text-sm">- หัก ณ ฯ {taxFormData.withholdingTaxRate}%:</span>
                      <span className="font-semibold">
                        -{formatCurrency((taxFormData.paymentAmount * taxFormData.withholdingTaxRate) / 100)}
                      </span>
                    </div>
                  )}
                  <div className="pt-2 border-t border-purple-200"></div>
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-purple-700">จ่ายสุทธิ:</span>
                    <span className="text-lg font-bold text-purple-700">
                      {formatCurrency(
                        taxFormData.paymentAmount +
                          (taxFormData.paymentAmount * taxFormData.vatRate) / 100 -
                          (taxFormData.paymentAmount * taxFormData.withholdingTaxRate) / 100
                      )}
                    </span>
                  </div>
                </div>
              </Card>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsEditTaxDialogOpen(false)}>
              ยกเลิก
            </Button>
            <Button 
              onClick={handleEditTaxRecord}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              <FileCheck className="w-4 h-4 mr-2" />
              บันทึกการแก้ไข
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Tax Record Alert Dialog */}
      <AlertDialog open={isDeleteTaxDialogOpen} onOpenChange={setIsDeleteTaxDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <div className="p-2 bg-red-100 rounded-lg">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              ยืนยันการลบบันทึกภาษี
            </AlertDialogTitle>
            <AlertDialogDescription>
              คุณแน่ใจหรือไม่ว่าต้องการลบบันทึกภาษี "{selectedTaxRecord?.documentNumber}"? 
              การกระทำนี้ไม่สามารถย้อนกลับได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTaxRecord}
              className="bg-red-600 hover:bg-red-700"
            >
              ลบบันทึก
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Quotation Alert Dialog */}
      <AlertDialog open={isDeleteQuotationDialogOpen} onOpenChange={setIsDeleteQuotationDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <div className="p-2 bg-red-100 rounded-lg">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              ยืนยันการลบเอกสารใบเสนอราคา
            </AlertDialogTitle>
            <AlertDialogDescription>
              คุณแน่ใจหรือไม่ว่าต้องการลบเอกสาร "{selectedQuotation?.documentNumber}"? 
              การกระทำนี้จะลบเอกสารออกจากระบบอย่างถาวร และไม่สามารถย้อนกลับได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteQuotation}
              className="bg-red-600 hover:bg-red-700"
            >
              ลบเอกสาร
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
