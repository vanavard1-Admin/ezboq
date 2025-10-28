import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
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
  Eye,
  Edit,
  Trash2,
  MoreVertical,
  Receipt,
  PieChart,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';

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
  status: 'draft' | 'sent' | 'approved';
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
  withholdingTaxType?: string; // เช่น "ภ.ง.ด.53" "ภ.ง.ด.3" "ภ.ง.ด.54"
  
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
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  const [isAddTaxDialogOpen, setIsAddTaxDialogOpen] = useState(false);
  const [isEditTaxDialogOpen, setIsEditTaxDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedTaxRecord, setSelectedTaxRecord] = useState<TaxRecord | null>(null);
  
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
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadQuotationTaxes(),
        loadTaxRecords(),
        loadCustomers(),
        loadDocuments(),
      ]);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('ไม่สามารถโหลดข้อมูลได้');
    } finally {
      setLoading(false);
    }
  };

  const loadQuotationTaxes = async () => {
    try {
      // Load all quotations (both customer and partner)
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
        console.log('📊 Total documents loaded:', data.documents?.length || 0);
        
        // Debug: แสดงประเภทของเอกสารทั้งหมด
        const typeCounts = (data.documents || []).reduce((acc: any, doc: any) => {
          acc[doc.type || 'undefined'] = (acc[doc.type || 'undefined'] || 0) + 1;
          return acc;
        }, {});
        console.log('📈 Document types breakdown:', typeCounts);
        console.log('📄 All document types:', (data.documents || []).map((d: any) => ({ 
          id: d.id, 
          type: d.type, 
          docNum: d.documentNumber,
          recipientType: d.recipientType
        })));
        
        // Filter for quotation type only (includes both customer and partner)
        const allQuotations = (data.documents || []).filter((doc: any) => doc.type === 'quotation');
        console.log('📋 Quotations found:', allQuotations.length);
        console.log('📝 Quotations details:', allQuotations.map((q: any) => ({ 
          id: q.id, 
          type: q.type,
          recipientType: q.recipientType,
          customerName: q.customerName,
          partnerName: q.partnerName,
          documentNumber: q.documentNumber
        })));
        
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
            recipientType: doc.recipientType || 'customer', // เพิ่มเพื่อแยกประเภท
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
        console.error('❌ Failed to fetch documents:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('❌ Failed to load quotation taxes:', error);
    }
  };

  const calculateDocumentSummary = (doc: any) => {
    const items = doc.boqItems || [];
    const profile = doc.profile || { wastePct: 3, opexPct: 5, errorPct: 2, markupPct: 10, vatPct: 7 };
    const discount = doc.discount;
    
    const subtotalMaterial = items.reduce((sum: number, item: any) => 
      sum + (item.material * item.quantity), 0
    );
    const subtotalLabor = items.reduce((sum: number, item: any) => 
      sum + (item.labor * item.quantity), 0
    );
    const subtotal = subtotalMaterial + subtotalLabor;

    const waste = subtotal * (profile.wastePct / 100);
    const opex = subtotal * (profile.opexPct / 100);
    const error = subtotal * (profile.errorPct / 100);
    const totalBeforeMarkup = subtotal + waste + opex + error;

    const markup = totalBeforeMarkup * (profile.markupPct / 100);
    const totalBeforeVat = totalBeforeMarkup + markup;

    const vat = totalBeforeVat * (profile.vatPct / 100);
    let grandTotal = totalBeforeVat + vat;

    if (discount) {
      const discountAmount = discount.type === 'percent' 
        ? grandTotal * (discount.value / 100)
        : discount.value;
      grandTotal -= discountAmount;
    }

    return { totalBeforeVat, vat, grandTotal };
  };

  const loadTaxRecords = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-6e95bca3/tax-records`,
        {
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setTaxRecords(data.taxRecords || []);
      }
    } catch (error) {
      console.error('Failed to load tax records:', error);
    }
  };

  const loadCustomers = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-6e95bca3/customers`,
        {
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setCustomers(data.customers || []);
      }
    } catch (error) {
      console.error('Failed to load customers:', error);
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
        setDocuments((data.documents || []).filter((doc: any) => doc.type === 'quotation'));
      }
    } catch (error) {
      console.error('Failed to load documents:', error);
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

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-6e95bca3/tax-records`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify(newTax),
        }
      );

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

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-6e95bca3/tax-records/${selectedTaxRecord.id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify(updatedTax),
        }
      );

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
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-6e95bca3/tax-records/${selectedTaxRecord.id}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (response.ok) {
        setTaxRecords(taxRecords.filter(t => t.id !== selectedTaxRecord.id));
        setIsDeleteDialogOpen(false);
        setSelectedTaxRecord(null);
        toast.success('ลบบันทึกภาษีสำเร็จ!');
      }
    } catch (error) {
      console.error('Failed to delete tax record:', error);
      toast.error('ไม่สามารถลบข้อมูลได้');
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

  const openEditDialog = (record: TaxRecord) => {
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

  const openDeleteDialog = (record: TaxRecord) => {
    setSelectedTaxRecord(record);
    setIsDeleteDialogOpen(true);
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
    const totalVatAmount = taxRecords.reduce((sum, tax) => sum + tax.vatAmount, 0);
    const totalWithholdingTax = taxRecords.reduce((sum, tax) => sum + (tax.withholdingTaxAmount || 0), 0);
    const totalVat = quotationTaxes.reduce((sum, q) => sum + q.vatAmount, 0);
    const totalRevenue = quotationTaxes.reduce((sum, q) => sum + q.grandTotal, 0);
    const pendingVat = taxRecords.filter(t => t.status === 'pending').reduce((sum, t) => sum + t.vatAmount, 0);

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg">
                  <Calculator className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl">จัดการภาษีใบเสนอราคา</h1>
                  <p className="text-muted-foreground">
                    ติดตามและบริหารภาษีมูลค่าเพิ่ม (VAT) จากใบเสนอราคาทั้งหมด
                  </p>
                </div>
              </div>
            </div>
          </div>
          <Button
            onClick={() => {/* Export Report */}}
            variant="outline"
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            Export รายงาน
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="p-6 bg-gradient-to-br from-blue-500 to-cyan-600 text-white shadow-lg hover:shadow-xl transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <DollarSign className="w-10 h-10 opacity-80" />
                <div className="p-2 bg-white/20 rounded-lg">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
              <p className="text-sm opacity-90 mb-1">รายได้รวม (รวมภาษี)</p>
              <p className="text-3xl">{formatCurrency(stats.totalRevenue)}</p>
              <p className="text-xs opacity-75 mt-1">จากใบเสนอราคาทั้งหมด</p>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="p-6 bg-gradient-to-br from-purple-500 to-pink-600 text-white shadow-lg hover:shadow-xl transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <Calculator className="w-10 h-10 opacity-80" />
                <div className="p-2 bg-white/20 rounded-lg">
                  <PieChart className="w-5 h-5" />
                </div>
              </div>
              <p className="text-sm opacity-90 mb-1">VAT รวม (ใบเสนอราคา)</p>
              <p className="text-3xl">{formatCurrency(stats.totalVat)}</p>
              <p className="text-xs opacity-75 mt-1">{quotationTaxes.length} รายการ</p>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="p-6 bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-lg hover:shadow-xl transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle2 className="w-10 h-10 opacity-80" />
                <div className="p-2 bg-white/20 rounded-lg">
                  <Receipt className="w-5 h-5" />
                </div>
              </div>
              <p className="text-sm opacity-90 mb-1">VAT บันทึกแล้ว</p>
              <p className="text-3xl">{formatCurrency(stats.totalVatAmount)}</p>
              <p className="text-xs opacity-75 mt-1">{taxRecords.length} รายการ</p>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="p-6 bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg hover:shadow-xl transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <Receipt className="w-10 h-10 opacity-80" />
                <div className="p-2 bg-white/20 rounded-lg">
                  <FileText className="w-5 h-5" />
                </div>
              </div>
              <p className="text-sm opacity-90 mb-1">หัก ณ ที่จ่าย</p>
              <p className="text-3xl">{formatCurrency(stats.totalWithholdingTax)}</p>
              <p className="text-xs opacity-75 mt-1">ภาษีหัก ณ ที่จ่ายรวม</p>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card className="p-6 bg-gradient-to-br from-red-500 to-rose-600 text-white shadow-lg hover:shadow-xl transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <AlertCircle className="w-10 h-10 opacity-80" />
                <div className="p-2 bg-white/20 rounded-lg">
                  <FileText className="w-5 h-5" />
                </div>
              </div>
              <p className="text-sm opacity-90 mb-1">VAT ค้างดำเนินการ</p>
              <p className="text-3xl">{formatCurrency(stats.pendingVat)}</p>
              <p className="text-xs opacity-75 mt-1">ต้องดำเนินการ</p>
            </Card>
          </motion.div>
        </div>

        {/* Search and Filter */}
        <Card className="p-4 mb-6 shadow-md">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative col-span-2">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="ค้นหา (ชื่อลูกค้า, เลขที่เอกสาร, โครงการ)"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="สถานะ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทั้งหมด</SelectItem>
                <SelectItem value="draft">ร่าง</SelectItem>
                <SelectItem value="sent">ส่งแล้ว</SelectItem>
                <SelectItem value="approved">อนุมัติแล้ว</SelectItem>
                <SelectItem value="pending">รอดำเนินการ</SelectItem>
                <SelectItem value="paid">ชำระแล้ว</SelectItem>
                <SelectItem value="filed">ยื่นแล้ว</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)}>
          <div className="flex items-center justify-between mb-4">
            <TabsList className="bg-white shadow-sm">
              <TabsTrigger value="quotations" className="gap-2">
                <FileText className="w-4 h-4" />
                ภาษีจากใบเสนอราคา ({quotationTaxes.length})
              </TabsTrigger>
              <TabsTrigger value="records" className="gap-2">
                <Receipt className="w-4 h-4" />
                บันทึกภาษี ({taxRecords.length})
              </TabsTrigger>
            </TabsList>
            {activeTab === 'records' && (
              <Button
                onClick={() => setIsAddTaxDialogOpen(true)}
                className="gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
              >
                <Plus className="w-4 h-4" />
                เพิ่มบันทึกภาษี
              </Button>
            )}
          </div>

          {/* Quotation Tax Tab */}
          <TabsContent value="quotations">
            <Card className="shadow-lg">
              <ScrollArea className="h-[600px]">
                <Table>
                  <TableHeader className="bg-gray-50 sticky top-0">
                    <TableRow>
                      <TableHead className="w-[100px]">วันที่</TableHead>
                      <TableHead className="w-[140px]">เอกสาร</TableHead>
                      <TableHead className="w-[120px]">ประเภท</TableHead>
                      <TableHead>ชื่อ</TableHead>
                      <TableHead>โครงการ</TableHead>
                      <TableHead className="text-right">มูลค่าก่อนภาษี</TableHead>
                      <TableHead className="text-right w-[80px]">VAT</TableHead>
                      <TableHead className="text-right">ภาษี</TableHead>
                      <TableHead className="text-right">รวมทั้งสิ้น</TableHead>
                      <TableHead className="text-center w-[100px]">สถานะ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-12">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                            <span className="text-muted-foreground">กำลังโหลดข้อมูล...</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : filteredQuotationTaxes.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center py-16">
                          <div className="flex flex-col items-center justify-center gap-4">
                            <div className="w-20 h-20 rounded-full bg-purple-100 flex items-center justify-center">
                              <FileText className="w-10 h-10 text-purple-600" />
                            </div>
                            <div>
                              <p className="text-lg font-medium mb-1">ยังไม่มีข้อมูลใบเสนอราคา</p>
                              <p className="text-sm text-muted-foreground mb-4">
                                {quotationTaxes.length === 0 
                                  ? 'กรุณาสร้างใบเสนอราคาสำหรับลูกค้าหรือพาร์ทเนอร์เพื่อติดตามภาษี'
                                  : 'ไม่พบข้อมูลที่ตรงกับเงื่อนไขการค้นหา'}
                              </p>
                            </div>
                            {quotationTaxes.length === 0 && (
                              <div className="flex gap-3 mt-2">
                                <Button onClick={onBack} variant="outline" className="gap-2">
                                  <ArrowLeft className="w-4 h-4" />
                                  กลับหน้าหลัก
                                </Button>
                                <Button 
                                  onClick={() => window.location.reload()} 
                                  variant="default"
                                  className="gap-2 bg-purple-600 hover:bg-purple-700"
                                >
                                  <FileText className="w-4 h-4" />
                                  รีเฟรชข้อมูล
                                </Button>
                              </div>
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
                              className={(tax as any).recipientType === 'partner' ? 'bg-orange-100 text-orange-700 border-orange-300' : 'bg-blue-100 text-blue-700 border-blue-300'}
                            >
                              {(tax as any).recipientType === 'partner' ? 'พาร์ทเนอร์' : 'ลูกค้า'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <p className="text-sm font-medium">{tax.customerName}</p>
                          </TableCell>
                          <TableCell className="max-w-[200px]">
                            <p className="text-sm truncate text-muted-foreground">{tax.projectTitle}</p>
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
                            <Badge
                              variant={
                                tax.status === 'approved'
                                  ? 'default'
                                  : tax.status === 'sent'
                                  ? 'secondary'
                                  : 'outline'
                              }
                              className={
                                tax.status === 'approved'
                                  ? 'bg-green-500'
                                  : tax.status === 'sent'
                                  ? 'bg-blue-500'
                                  : ''
                              }
                            >
                              {tax.status === 'approved'
                                ? 'อนุมัติแล้ว'
                                : tax.status === 'sent'
                                ? 'ส่งแล้ว'
                                : 'ร่าง'}
                            </Badge>
                          </TableCell>
                        </motion.tr>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </Card>
          </TabsContent>

          {/* Tax Records Tab */}
          <TabsContent value="records">
            <Card className="shadow-lg">
              <ScrollArea className="h-[600px]">
                <Table>
                  <TableHeader className="bg-gray-50 sticky top-0">
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
                        <TableCell colSpan={12} className="text-center py-12">
                          <Receipt className="w-16 h-16 text-muted-foreground mx-auto mb-3 opacity-50" />
                          <p className="text-muted-foreground">ไม่พบข้อมูลบันทึกภาษี</p>
                          <p className="text-sm text-muted-foreground mt-1">คลิก "เพิ่มบันทึกภาษี" เพื่อเริ่มต้น</p>
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
                                <p className="text-xs text-muted-foreground ml-8">
                                  ภ.ง.ด.: {tax.taxDocumentNumber}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="text-sm font-medium">{tax.customerName}</p>
                              {tax.customerTaxId && (
                                <p className="text-xs text-muted-foreground">
                                  เลขผู้เสียภาษี: {tax.customerTaxId}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="max-w-[200px]">
                            <p className="text-sm truncate text-muted-foreground">{tax.projectTitle}</p>
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
                          <TableCell className="text-right">
                            {formatCurrency(tax.netPayment)}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant={
                                tax.status === 'filed'
                                  ? 'default'
                                  : tax.status === 'paid'
                                  ? 'secondary'
                                  : 'outline'
                              }
                              className={
                                tax.status === 'filed'
                                  ? 'bg-green-500'
                                  : tax.status === 'paid'
                                  ? 'bg-blue-500'
                                  : 'bg-orange-100 text-orange-700 border-orange-300'
                              }
                            >
                              {tax.status === 'filed'
                                ? 'ยื่นแล้ว'
                                : tax.status === 'paid'
                                ? 'จ่ายแล้ว'
                                : 'รอดำเนินการ'}
                            </Badge>
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
                                  onClick={() => openEditDialog(tax)}
                                  className="gap-2"
                                >
                                  <Edit className="w-4 h-4" />
                                  แก้ไข
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => openDeleteDialog(tax)}
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
          </TabsContent>
        </Tabs>
      </div>

      {/* Add Tax Record Dialog */}
      <Dialog open={isAddTaxDialogOpen} onOpenChange={setIsAddTaxDialogOpen}>
        <DialogContent className="max-w-2xl">
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
            <div className="grid grid-cols-2 gap-4">
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

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
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
            </div>

            {/* VAT Section */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
              <div className="col-span-2">
                <h4 className="text-sm font-semibold text-purple-700 mb-3">ภาษีมูลค่าเพิ่ม (VAT)</h4>
              </div>
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

            {/* Withholding Tax Section */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
              <div className="col-span-2">
                <h4 className="text-sm font-semibold text-amber-700 mb-3">หัก ณ ที่จ่าย (Withholding Tax)</h4>
              </div>
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
              <div className="col-span-2">
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

            <div className="grid grid-cols-2 gap-4">
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

            <div>
              <Label>หมายเหตุ</Label>
              <Input
                value={taxFormData.notes}
                onChange={e => setTaxFormData({ ...taxFormData, notes: e.target.value })}
                placeholder="บันทึกเพิ่มเติม"
              />
            </div>

            {/* Calculation Preview */}
            {taxFormData.paymentAmount > 0 && (
              <Card className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200">
                <h4 className="text-sm font-semibold mb-3 text-purple-700">สรุปการคำนวณ</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">ยอดจ่าย:</span>
                    <span className="font-semibold">{formatCurrency(taxFormData.paymentAmount)}</span>
                  </div>
                  <div className="flex justify-between items-center text-red-600">
                    <span className="text-sm">หักภาษี {taxFormData.taxRate}%:</span>
                    <span className="font-semibold">
                      -{formatCurrency((taxFormData.paymentAmount * taxFormData.taxRate) / 100)}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-purple-200"></div>
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-purple-700">จ่ายสุทธิ:</span>
                    <span className="text-lg font-bold text-purple-700">
                      {formatCurrency(
                        taxFormData.paymentAmount -
                          (taxFormData.paymentAmount * taxFormData.taxRate) / 100
                      )}
                    </span>
                  </div>
                </div>
              </Card>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddTaxDialogOpen(false)}>
              ยกเลิก
            </Button>
            <Button 
              onClick={handleAddTaxRecord}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
            >
              เพิ่มข้อมูล
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Tax Record Dialog */}
      <Dialog open={isEditTaxDialogOpen} onOpenChange={setIsEditTaxDialogOpen}>
        <DialogContent className="max-w-2xl">
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
            <div className="grid grid-cols-2 gap-4">
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>ยอดเงินที่จ่าย *</Label>
                <Input
                  type="number"
                  value={taxFormData.paymentAmount}
                  onChange={e =>
                    setTaxFormData({
                      ...taxFormData,
                      paymentAmount: Number(e.target.value),
                    })
                  }
                />
              </div>
              <div>
                <Label>อัตราภาษี (0-100%) *</Label>
                <Input
                  type="number"
                  value={taxFormData.taxRate}
                  onChange={e =>
                    setTaxFormData({ ...taxFormData, taxRate: Number(e.target.value) })
                  }
                  min="0"
                  max="100"
                  step="0.01"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
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
                <Label>เลขที่หนังสือรับรองฯ (ภ.ง.ด.)</Label>
                <Input
                  value={taxFormData.taxDocumentNumber}
                  onChange={e =>
                    setTaxFormData({ ...taxFormData, taxDocumentNumber: e.target.value })
                  }
                />
              </div>
            </div>

            <div>
              <Label>หมายเหตุ</Label>
              <Input
                value={taxFormData.notes}
                onChange={e => setTaxFormData({ ...taxFormData, notes: e.target.value })}
              />
            </div>

            {taxFormData.paymentAmount > 0 && (
              <Card className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
                <h4 className="text-sm font-semibold mb-3 text-blue-700">สรุปการคำนวณ</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">ยอดจ่าย:</span>
                    <span className="font-semibold">{formatCurrency(taxFormData.paymentAmount)}</span>
                  </div>
                  <div className="flex justify-between text-red-600">
                    <span className="text-sm">หักภาษี {taxFormData.taxRate}%:</span>
                    <span className="font-semibold">
                      -{formatCurrency((taxFormData.paymentAmount * taxFormData.taxRate) / 100)}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-blue-200"></div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-blue-700">จ่ายสุทธิ:</span>
                    <span className="text-lg font-bold text-blue-700">
                      {formatCurrency(
                        taxFormData.paymentAmount -
                          (taxFormData.paymentAmount * taxFormData.taxRate) / 100
                      )}
                    </span>
                  </div>
                </div>
              </Card>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditTaxDialogOpen(false)}>
              ยกเลิก
            </Button>
            <Button onClick={handleEditTaxRecord}>บันทึกการแก้ไข</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              ยืนยันการลบ
            </DialogTitle>
            <DialogDescription>
              คุณต้องการลบบันทึกภาษี "{selectedTaxRecord?.documentNumber}" ใช่หรือไม่?
              การดำเนินการนี้ไม่สามารถย้อนกลับได้
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              ยกเลิก
            </Button>
            <Button variant="destructive" onClick={handleDeleteTaxRecord}>
              ลบบันทึกภาษี
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
