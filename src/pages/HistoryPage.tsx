import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { ScrollArea } from '../components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  History,
  Search,
  Download,
  Eye,
  MoreVertical,
  FileText,
  Receipt,
  Calendar,
  ArrowLeft,
  Filter,
  TrendingUp,
  DollarSign,
  Users,
  Copy,
  Files,
  Edit,
  Trash2,
  FileEdit,
  AlertTriangle,
  AlertCircle,
} from 'lucide-react';
import { Document, DocumentType } from '../types/boq';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { exportWorkflowToPDF } from '../utils/pdfExport';
import { PDFExportWrapper } from '../components/PDFExportWrapper';

interface HistoryPageProps {
  onBack: () => void;
  onEditDocument?: (document: Document) => void;
}

export function HistoryPage({ onBack, onEditDocument }: HistoryPageProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<Document[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<'all' | DocumentType | 'receipt'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | Document['status']>('all');
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'customer'>('date');
  
  // Preview Dialog
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  
  // Duplicate Dialog
  const [duplicateDoc, setDuplicateDoc] = useState<Document | null>(null);
  const [isDuplicateDialogOpen, setIsDuplicateDialogOpen] = useState(false);
  const [newProjectTitle, setNewProjectTitle] = useState('');
  
  // Edit Dialog
  const [editDoc, setEditDoc] = useState<Document | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    projectTitle: '',
    projectDescription: '',
    status: 'draft' as Document['status'],
  });

  // Delete Dialogs (2-step confirmation)
  const [deleteDoc, setDeleteDoc] = useState<Document | null>(null);
  const [isDeleteStep1Open, setIsDeleteStep1Open] = useState(false);
  const [isDeleteStep2Open, setIsDeleteStep2Open] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  
  // PDF Export state
  const [exportingDoc, setExportingDoc] = useState<Document | null>(null);

  useEffect(() => {
    loadDocuments();
  }, []);

  useEffect(() => {
    filterAndSortDocuments();
  }, [searchQuery, documents, filterType, filterStatus, sortBy]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-6e95bca3/documents?recipientType=customer`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        // Filter เฉพาะเอกสารของลูกค้า
        const customerDocs = (data.documents || []).filter(
          (doc: Document) => !doc.recipientType || doc.recipientType === 'customer'
        );
        setDocuments(customerDocs);
      }
    } catch (error) {
      console.error('Failed to load documents:', error);
      toast.error('ไม่สามารถโหลดประวัติเอกสารได้');
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortDocuments = () => {
    let filtered = documents;

    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter(d => d.type === filterType);
    }

    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(d => d.status === filterStatus);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        d =>
          d.projectTitle.toLowerCase().includes(query) ||
          d.documentNumber.toLowerCase().includes(query) ||
          d.customerName?.toLowerCase().includes(query)
      );
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'amount':
          return b.totalAmount - a.totalAmount;
        case 'customer':
          return (a.customerName || '').localeCompare(b.customerName || '');
        default:
          return 0;
      }
    });

    setFilteredDocuments(filtered);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
    }).format(amount);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getTypeLabel = (type: DocumentType | 'receipt') => {
    const labels = {
      boq: 'BOQ',
      quotation: 'ใบเสนอราคา',
      invoice: 'ใบวางบิล',
      receipt: 'ใบเสร็จ',
    };
    return labels[type] || type;
  };

  const getStatusBadge = (status: Document['status']) => {
    const variants = {
      draft: { variant: 'secondary' as const, label: 'ร่าง' },
      sent: { variant: 'default' as const, label: 'ส่งแล้ว' },
      paid: { variant: 'default' as const, label: 'ชำระแล้ว', className: 'bg-green-500' },
      overdue: { variant: 'destructive' as const, label: 'เกินกำหนด' },
      cancelled: { variant: 'secondary' as const, label: 'ยกเลิก' },
    };
    const config = variants[status];
    return (
      <Badge variant={config.variant} className={config.className}>
        {config.label}
      </Badge>
    );
  };

  const handlePreview = (doc: Document) => {
    setPreviewDoc(doc);
    setIsPreviewOpen(true);
  };

  const handleDuplicate = (doc: Document) => {
    setDuplicateDoc(doc);
    setNewProjectTitle(`${doc.projectTitle} (สำเนา)`);
    setIsDuplicateDialogOpen(true);
  };

  const confirmDuplicate = async () => {
    if (!duplicateDoc || !newProjectTitle) {
      toast.error('กรุณากรอกชื่อโครงการ');
      return;
    }

    try {
      const newDoc: Document = {
        ...duplicateDoc,
        id: `doc-${Date.now()}`,
        documentNumber: `DOC-${Date.now()}`,
        projectTitle: newProjectTitle,
        status: 'draft',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-6e95bca3/documents`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify(newDoc),
        }
      );

      if (response.ok) {
        toast.success('คัดลอกเอกสารสำเร็จ!');
        setIsDuplicateDialogOpen(false);
        loadDocuments();
      }
    } catch (error) {
      console.error('Failed to duplicate document:', error);
      toast.error('ไม่สามารถคัดลอกเอกสารได้');
    }
  };

  const handleDownload = async (doc: Document) => {
    try {
      // Set exportingDoc to trigger PDFExportWrapper render
      setExportingDoc(doc);
      
      // Wait for PDFExportWrapper to render
      await new Promise(resolve => setTimeout(resolve, 500));
      
      let toastId: string | number | undefined;
      
      await exportWorkflowToPDF(doc.projectTitle, doc.type, (progress) => {
        // Dismiss previous toast
        if (toastId) {
          toast.dismiss(toastId);
        }
        // Show new progress toast
        toastId = toast.loading(`กำลังสร้าง PDF... (${progress.current}/${progress.total}) - ${progress.documentName}`, {
          description: `กำลังประมวลผล ${progress.documentName}`,
        });
      });
      
      // Dismiss loading toast
      if (toastId) {
        toast.dismiss(toastId);
      }
      
      toast.success('ดาวน์โหลด PDF สำเร็จ! 🎉', {
        duration: 3000,
      });
    } catch (error) {
      console.error('Failed to download PDF:', error);
      toast.error('ไม่สามารถสร้างไฟล์ PDF ได้');
    } finally {
      // Clear exportingDoc after export
      setTimeout(() => setExportingDoc(null), 1000);
    }
  };

  const handleDownloadAllDocuments = async (doc: Document) => {
    try {
      // Set exportingDoc to trigger PDFExportWrapper render
      setExportingDoc(doc);
      
      // Wait for PDFExportWrapper to render
      await new Promise(resolve => setTimeout(resolve, 500));
      
      let toastId: string | number | undefined;
      
      // Export all document types in sequence
      await exportWorkflowToPDF(doc.projectTitle, 'all', (progress) => {
        // Dismiss previous toast
        if (toastId) {
          toast.dismiss(toastId);
        }
        // Show new progress toast
        toastId = toast.loading(`กำลังสร้าง PDF... (${progress.current}/${progress.total}) - ${progress.documentName}`, {
          description: `กำลังประมวลผล ${progress.documentName}`,
        });
      });
      
      // Dismiss loading toast
      if (toastId) {
        toast.dismiss(toastId);
      }
      
      toast.success('ดาวน์โหลดเอกสารทั้งหมดสำเร็จ! 🎉', {
        description: 'ได้รับไฟล์ BOQ, ใบเสนอราคา, ใบวางบิล และใบเสร็จแล้ว',
        duration: 4000,
      });
    } catch (error) {
      console.error('Failed to download all documents:', error);
      toast.error('ไม่สามารถสร้างไฟล์ PDF ทั้งหมดได้', {
        description: 'กรุณาลองใหม่อีกครั้ง',
      });
    } finally {
      // Clear exportingDoc after export
      setTimeout(() => setExportingDoc(null), 1000);
    }
  };

  const handleEditFullDocument = (doc: Document) => {
    // Load full document into workflow for editing
    if (onEditDocument) {
      onEditDocument(doc);
      toast.success('กำลังโหลดเอกสารเพื่อแก้ไข...');
    }
  };

  const handleEdit = (doc: Document) => {
    setEditDoc(doc);
    setEditFormData({
      projectTitle: doc.projectTitle,
      projectDescription: doc.projectDescription || '',
      status: doc.status,
    });
    setIsEditDialogOpen(true);
  };

  const confirmEdit = async () => {
    if (!editDoc || !editFormData.projectTitle) {
      toast.error('กรุณากรอกชื่อโครงการ');
      return;
    }

    try {
      const updatedDoc: Document = {
        ...editDoc,
        projectTitle: editFormData.projectTitle,
        projectDescription: editFormData.projectDescription,
        status: editFormData.status,
        updatedAt: Date.now(),
      };

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-6e95bca3/documents/${editDoc.id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify(updatedDoc),
        }
      );

      if (response.ok) {
        toast.success('แก้ไขเอกสารสำเร็จ!');
        setIsEditDialogOpen(false);
        loadDocuments();
      } else {
        throw new Error('Failed to update document');
      }
    } catch (error) {
      console.error('Failed to update document:', error);
      toast.error('ไม่สามารถแก้ไขเอกสารได้');
    }
  };

  // Delete handlers (2-step confirmation)
  const handleDeleteStep1 = (doc: Document) => {
    setDeleteDoc(doc);
    setIsDeleteStep1Open(true);
  };

  const proceedToStep2 = () => {
    setIsDeleteStep1Open(false);
    setDeleteConfirmText('');
    setIsDeleteStep2Open(true);
  };

  const confirmDelete = async () => {
    if (!deleteDoc) return;

    // Check if user typed the document number correctly
    if (deleteConfirmText !== deleteDoc.documentNumber) {
      toast.error('กรุณาพิมพ์เลขที่เอกสารให้ถูกต้อง');
      return;
    }

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-6e95bca3/documents/${deleteDoc.id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (response.ok) {
        toast.success('ลบเอกสารสำเร็จ!');
        setIsDeleteStep2Open(false);
        setDeleteDoc(null);
        setDeleteConfirmText('');
        loadDocuments();
      } else {
        throw new Error('Failed to delete document');
      }
    } catch (error) {
      console.error('Failed to delete document:', error);
      toast.error('ไม่สามารถลบเอกสารได้');
    }
  };

  const cancelDelete = () => {
    setIsDeleteStep1Open(false);
    setIsDeleteStep2Open(false);
    setDeleteDoc(null);
    setDeleteConfirmText('');
  };

  const totalAmount = filteredDocuments.reduce((sum, d) => sum + (d.totalAmount || 0), 0);
  const paidAmount = filteredDocuments
    .filter(d => d.status === 'paid')
    .reduce((sum, d) => sum + (d.totalAmount || 0), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <History className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl">ประวัติเอกสาร</h1>
                  <p className="text-muted-foreground">
                    ดูและจัดการเอกสารทั้งหมดในระบบ
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">เอกสารทั้งหมด</p>
                  <p className="text-2xl">{documents.length}</p>
                </div>
              </div>
            </Card>
          </motion.div>
          
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">มูลค่ารวม</p>
                  <p className="text-xl">{formatCurrency(totalAmount)}</p>
                </div>
              </div>
            </Card>
          </motion.div>
          
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">ชำระแล้ว</p>
                  <p className="text-xl">{formatCurrency(paidAmount)}</p>
                </div>
              </div>
            </Card>
          </motion.div>
          
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                  <Users className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">ลูกค้า</p>
                  <p className="text-2xl">
                    {new Set(documents.map(d => d.customerId)).size}
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>

        {/* Filters & Search */}
        <Card className="p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="ค้นหาเอกสาร..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
              <SelectTrigger>
                <SelectValue placeholder="ประเภทเอกสาร" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทั้งหมด</SelectItem>
                <SelectItem value="boq">BOQ</SelectItem>
                <SelectItem value="quotation">ใบเสนอราคา</SelectItem>
                <SelectItem value="invoice">ใบวางบิล</SelectItem>
                <SelectItem value="receipt">ใบเสร็จ</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
              <SelectTrigger>
                <SelectValue placeholder="สถานะ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทั้งหมด</SelectItem>
                <SelectItem value="draft">ร่าง</SelectItem>
                <SelectItem value="sent">ส่งแล้ว</SelectItem>
                <SelectItem value="paid">ชำระแล้ว</SelectItem>
                <SelectItem value="overdue">เกินกำหนด</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
              <SelectTrigger>
                <SelectValue placeholder="เรียงตาม" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">วันที่</SelectItem>
                <SelectItem value="amount">มูลค่า</SelectItem>
                <SelectItem value="customer">ลูกค้า</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>

        {/* Documents Table */}
        <Card>
          <ScrollArea className="h-[600px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>เลขที่เอกสาร</TableHead>
                  <TableHead>โครงการ</TableHead>
                  <TableHead>ประเภท</TableHead>
                  <TableHead>ลูกค้า</TableHead>
                  <TableHead>วันที่</TableHead>
                  <TableHead className="text-right">มูลค่า</TableHead>
                  <TableHead>สถานะ</TableHead>
                  <TableHead className="text-right">จัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      กำลังโหลด...
                    </TableCell>
                  </TableRow>
                ) : filteredDocuments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      ไม่พบเอกสาร
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDocuments.map(doc => (
                    <TableRow key={doc.id}>
                      <TableCell className="font-mono text-sm">
                        {doc.documentNumber}
                      </TableCell>
                      <TableCell>{doc.projectTitle}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{getTypeLabel(doc.type)}</Badge>
                      </TableCell>
                      <TableCell>{doc.customerName || '-'}</TableCell>
                      <TableCell>{formatDate(doc.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(doc.totalAmount)}
                      </TableCell>
                      <TableCell>{getStatusBadge(doc.status)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handlePreview(doc)}>
                              <Eye className="w-4 h-4 mr-2" />
                              ดูพรีวิว
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditFullDocument(doc)}>
                              <FileEdit className="w-4 h-4 mr-2" />
                              แก้ไขทั้ง 4 ขั้นตอน
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(doc)}>
                              <Edit className="w-4 h-4 mr-2" />
                              แก้ไขข้อมูลพื้นฐาน
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDuplicate(doc)}>
                              <Files className="w-4 h-4 mr-2" />
                              ใช้เป็น Template
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDownload(doc)}>
                              <Download className="w-4 h-4 mr-2" />
                              ดาวน์โหลด PDF (เฉพาะประเภทนี้)
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDownloadAllDocuments(doc)} className="text-blue-600">
                              <Files className="w-4 h-4 mr-2" />
                              ส่งออกเอกสารทั้งชุด (BOQ-ใบเสร็จ)
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDeleteStep1(doc)}
                              className="text-red-600"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              ลบเอกสาร
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </Card>
      </div>

      {/* Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              พรีวิวเอกสาร
            </DialogTitle>
            <DialogDescription>
              {previewDoc?.documentNumber} - {previewDoc?.projectTitle}
            </DialogDescription>
          </DialogHeader>

          {previewDoc && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-muted-foreground">ประเภทเอกสาร</Label>
                  <p className="font-semibold">{getTypeLabel(previewDoc.type)}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">สถานะ</Label>
                  <div className="mt-1">{getStatusBadge(previewDoc.status)}</div>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">ลูกค้า</Label>
                  <p className="font-semibold">{previewDoc.customerName || '-'}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">วันที่สร้าง</Label>
                  <p className="font-semibold">{formatDate(previewDoc.createdAt)}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">มูลค่าเอกสาร</Label>
                  <p className="text-2xl text-green-600">
                    {formatCurrency(previewDoc.totalAmount)}
                  </p>
                </div>
              </div>

              <div className="bg-gray-100 p-6 rounded-lg text-center">
                <FileText className="w-16 h-16 mx-auto text-gray-400 mb-2" />
                <p className="text-sm text-muted-foreground">
                  พรีวิวเอกสารแบบเต็ม (ในเวอร์ชันจริงจะแสดงเนื้อหาเอกสารทั้งหมด)
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>
              ปิด
            </Button>
            <Button onClick={() => previewDoc && handleDuplicate(previewDoc)} className="gap-2">
              <Files className="w-4 h-4" />
              ใช้เป็น Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5" />
              แก้ไขเอกสาร
            </DialogTitle>
            <DialogDescription>
              {editDoc?.documentNumber} - {editDoc && getTypeLabel(editDoc.type)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>ชื่อโครงการ *</Label>
              <Input
                value={editFormData.projectTitle}
                onChange={e => setEditFormData({ ...editFormData, projectTitle: e.target.value })}
                placeholder="ระบุชื่อโครงการ"
              />
            </div>

            <div className="space-y-2">
              <Label>รายละเอียด</Label>
              <Textarea
                value={editFormData.projectDescription}
                onChange={e => setEditFormData({ ...editFormData, projectDescription: e.target.value })}
                placeholder="ระบุรายละเอียดเพิ่มเติม"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>สถานะเอกสาร</Label>
              <Select
                value={editFormData.status}
                onValueChange={(value: Document['status']) => setEditFormData({ ...editFormData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">ร่าง</SelectItem>
                  <SelectItem value="sent">ส่งแล้ว</SelectItem>
                  <SelectItem value="paid">ชำระแล้ว</SelectItem>
                  <SelectItem value="cancelled">ยกเลิก</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              ยกเลิก
            </Button>
            <Button onClick={confirmEdit} className="gap-2">
              <Edit className="w-4 h-4" />
              บันทึกการแก้ไข
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Duplicate Dialog */}
      <Dialog open={isDuplicateDialogOpen} onOpenChange={setIsDuplicateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Files className="w-5 h-5" />
              คัดลอกเอกสารเป็น Template
            </DialogTitle>
            <DialogDescription>
              สร้างเอกสารใหม่จากต้นฉบับเดิม
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-700">
                📋 <strong>ต้นฉบับ:</strong> {duplicateDoc?.projectTitle}
              </p>
              <p className="text-xs text-blue-600 mt-1">
                {duplicateDoc?.documentNumber} | {duplicateDoc && getTypeLabel(duplicateDoc.type)}
              </p>
            </div>

            <div className="space-y-2">
              <Label>ชื่อโครงการใหม่ *</Label>
              <Input
                value={newProjectTitle}
                onChange={e => setNewProjectTitle(e.target.value)}
                placeholder="ระบุชื่อโครงการใหม่"
              />
            </div>

            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <p className="text-sm text-green-700">
                ✅ <strong>ข้อมูลที่จะคัดลอก:</strong>
              </p>
              <ul className="text-xs text-green-600 mt-2 space-y-1 list-disc list-inside">
                <li>รายการวัสดุและค่าแรง</li>
                <li>ข้อมูลลูกค้า</li>
                <li>ส่วนลดและงวดชำระ</li>
                <li>ข้อมูลธนาคาร</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDuplicateDialogOpen(false)}>
              ยกเลิก
            </Button>
            <Button onClick={confirmDuplicate} className="gap-2">
              <Copy className="w-4 h-4" />
              สร้างเอกสารใหม่
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation - Step 1 */}
      <Dialog open={isDeleteStep1Open} onOpenChange={setIsDeleteStep1Open}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-yellow-600">
              <AlertTriangle className="w-6 h-6" />
              คำเตือน: คุณกำลังจะลบเอกสาร
            </DialogTitle>
            <DialogDescription>
              โปรดอ่านข้อมูลด้านล่างอย่างรอบคอบก่อนดำเนินการต่อ
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-yellow-50 p-4 rounded-lg border-2 border-yellow-300">
              <h4 className="font-semibold text-yellow-800 mb-2">เอกสารที่จะลบ:</h4>
              <div className="space-y-1 text-sm">
                <p><strong>เลขที่:</strong> {deleteDoc?.documentNumber}</p>
                <p><strong>โครงการ:</strong> {deleteDoc?.projectTitle}</p>
                <p><strong>ประเภท:</strong> {deleteDoc && getTypeLabel(deleteDoc.type)}</p>
                <p><strong>มูลค่า:</strong> {deleteDoc && formatCurrency(deleteDoc.totalAmount)}</p>
              </div>
            </div>

            <div className="bg-red-50 p-4 rounded-lg border-2 border-red-300">
              <h4 className="font-semibold text-red-800 mb-2 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                ผลกระทบจากการลบ:
              </h4>
              <ul className="text-sm text-red-700 space-y-1 list-disc list-inside">
                <li><strong>เอกสารจะถูกลบถาวร</strong> และไม่สามารถกู้คืนได้</li>
                <li>ข้อมูลทั้งหมดใน 4 ขั้นตอน (BOQ, Quotation, Invoice, Receipt) จะหายไป</li>
                <li>ประวัติการชำระเงินและรายละเอียดงวดจะถูกลบ</li>
                <li>หากเป็นเอกสารพาร์ทเนอร์ สถิติจะถูกอัพเดท</li>
              </ul>
            </div>

            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-700">
                💡 <strong>ทางเลือกอื่น:</strong> คุณสามารถ "เปลี่ยนสถานะเป็นยกเลิก" แทนการลบได้
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={cancelDelete}>
              ยกเลิก (ไม่ลบ)
            </Button>
            <Button variant="destructive" onClick={proceedToStep2} className="gap-2">
              <AlertTriangle className="w-4 h-4" />
              ดำเนินการต่อ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation - Step 2 */}
      <Dialog open={isDeleteStep2Open} onOpenChange={setIsDeleteStep2Open}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-6 h-6" />
              ยืนยันการลบเอกสารขั้นสุดท้าย
            </DialogTitle>
            <DialogDescription>
              กรุณาพิมพ์เลขที่เอกสารเพื่อยืนยันว่าคุณต้องการลบจริงๆ
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-red-100 p-4 rounded-lg border-2 border-red-400">
              <p className="text-sm text-red-800 mb-3">
                <strong>⚠️ นี่คือขั้นตอนสุดท้าย!</strong> เมื่อลบแล้วจะไม่สามารถกู้คืนได้
              </p>
              
              <div className="bg-white p-3 rounded border border-red-300 mb-3">
                <p className="text-xs text-gray-600 mb-1">พิมพ์เลขที่เอกสารนี้เพื่อยืนยัน:</p>
                <p className="text-lg font-mono font-bold text-red-600">
                  {deleteDoc?.documentNumber}
                </p>
              </div>

              <Input
                value={deleteConfirmText}
                onChange={e => setDeleteConfirmText(e.target.value)}
                placeholder="พิมพ์เลขที่เอกสารที่นี่..."
                className="border-red-300 focus:border-red-500"
              />

              {deleteConfirmText && deleteConfirmText !== deleteDoc?.documentNumber && (
                <p className="text-xs text-red-600 mt-2">
                  ❌ เลขที่เอกสารไม่ถูกต้อง โปรดตรวจสอบอีกครั้ง
                </p>
              )}

              {deleteConfirmText === deleteDoc?.documentNumber && (
                <p className="text-xs text-green-600 mt-2">
                  ✅ ถูกต้อง สามารถลบได้
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={cancelDelete}>
              ยกเลิก
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmDelete} 
              className="gap-2"
              disabled={deleteConfirmText !== deleteDoc?.documentNumber}
            >
              <Trash2 className="w-4 h-4" />
              ลบเอกสารถาวร
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PDF Export Wrapper - Rendered when preparing to export */}
      {exportingDoc && exportingDoc.boqItems && exportingDoc.company && exportingDoc.profile && (
        <PDFExportWrapper
          projectTitle={exportingDoc.projectTitle}
          projectDescription={exportingDoc.projectDescription || ''}
          projectLocation={exportingDoc.projectLocation || ''}
          company={exportingDoc.company}
          customer={exportingDoc.customer || {
            id: '',
            type: 'person',
            name: '',
            phone: '',
            address: '',
          }}
          profile={exportingDoc.profile}
          boqItems={exportingDoc.boqItems}
          discount={exportingDoc.discount || null}
          bankInfo={exportingDoc.bankInfo || null}
          paymentTerms={exportingDoc.paymentTerms || null}
          taxInvoice={exportingDoc.taxInvoice || {
            invoiceNumber: exportingDoc.documentNumber,
            receiptNumber: '',
            issueDate: new Date().toISOString().split('T')[0],
            paymentMethod: 'cash',
          }}
          recipientType={exportingDoc.partnerId ? 'partner' : 'customer'}
          selectedPartner={exportingDoc.partner}
          mainProjectTag={exportingDoc.mainProjectTag}
          withholdingTaxRate={exportingDoc.withholdingTaxRate || 0}
          withholdingTaxType={exportingDoc.withholdingTaxType || ''}
        />
      )}
    </div>
  );
}

function Label({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <p className={`text-sm font-medium ${className}`}>{children}</p>;
}
