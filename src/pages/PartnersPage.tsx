import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '../components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '../components/ui/sheet';
import { Badge } from '../components/ui/badge';
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
  DropdownMenuSeparator,
} from '../components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Handshake,
  Plus,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  Phone,
  Mail,
  MapPin,
  TrendingUp,
  ArrowLeft,
  Zap,
  Droplet,
  Home,
  Building2,
  Store,
  FileText,
  Download,
  Upload,
  Filter,
  X,
  Calendar,
  DollarSign,
  Activity,
  Eye,
  ArrowUpDown,
  ChevronRight,
  Briefcase,
  User,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { Partner, ProposerType } from '../types/boq';
import { toast } from 'sonner';
import { api } from '../utils/api';
import { ScrollArea } from '../components/ui/scroll-area';

interface PartnersPageProps {
  onBack: () => void;
  onCreateBOQForPartner?: (partnerId: string, partnerName: string) => void;
}

const proposerTypeIcons: Record<ProposerType, any> = {
  electrician: Zap,
  plumber: Droplet,
  glass_company: Building2,
  contractor: Home,
  material_store: Store,
  other: Handshake,
};

const proposerTypeLabels: Record<ProposerType, string> = {
  electrician: 'ช่างไฟฟ้า',
  plumber: 'ช่างประปา',
  glass_company: 'บริษัทขายกระจก',
  contractor: 'ช่างรับเหมาก่อสร้าง',
  material_store: 'ร้านค้าวัสดุ',
  other: 'อื่นๆ',
};

const proposerTypeColors: Record<ProposerType, string> = {
  electrician: 'bg-orange-100 text-orange-700 border-orange-300',
  plumber: 'bg-blue-100 text-blue-700 border-blue-300',
  glass_company: 'bg-purple-100 text-purple-700 border-purple-300',
  contractor: 'bg-green-100 text-green-700 border-green-300',
  material_store: 'bg-amber-100 text-amber-700 border-amber-300',
  other: 'bg-gray-100 text-gray-700 border-gray-300',
};

type ViewMode = 'grid' | 'table';
type SortBy = 'name' | 'recent' | 'revenue' | 'projects';

export function PartnersPage({ onBack, onCreateBOQForPartner }: PartnersPageProps) {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [filteredPartners, setFilteredPartners] = useState<Partner[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<ProposerType | 'all'>('all');
  const [sortBy, setSortBy] = useState<SortBy>('recent');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [isDetailSheetOpen, setIsDetailSheetOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [partnerDocuments, setPartnerDocuments] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('all');
  const [isEditDocumentDialogOpen, setIsEditDocumentDialogOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<any>(null);

  const [formData, setFormData] = useState({
    name: '',
    type: 'contractor' as ProposerType,
    company: '',
    phone: '',
    email: '',
    address: '',
    commission: 0,
    notes: '',
  });

  useEffect(() => {
    loadPartners();
  }, []);

  useEffect(() => {
    filterAndSortPartners();
  }, [searchQuery, selectedType, sortBy, partners]);

  const loadPartnerDocuments = async (partnerId: string) => {
    try {
      // ⚡ NUCLEAR MODE: Cache-only, don't trigger slow query
      console.log(`📊 Loading documents for partner ${partnerId} from cache...`);
      const response = await api.get(`/documents?partnerId=${partnerId}`).catch(err => {
        console.log('⚠️ Partner documents cache miss, skipping');
        return null;
      });

      if (response?.ok) {
        const data = await response.json();
        const docs = data.documents || [];
        setPartnerDocuments(docs);
        
        // Calculate real totals from documents
        if (selectedPartner) {
          const totalRevenue = docs.reduce((sum: number, doc: any) => sum + (doc.totalAmount || 0), 0);
          const totalProjects = docs.length;
          
          // Update selected partner with real data
          setSelectedPartner({
            ...selectedPartner,
            totalRevenue,
            totalProjects,
          });
          
          // Also update in partners list
          setPartners(prev => prev.map(p => 
            p.id === partnerId 
              ? { ...p, totalRevenue, totalProjects }
              : p
          ));
        }
        console.log(`✅ Loaded ${docs.length} partner documents from cache`);
      } else {
        // No cache - just show empty
        setPartnerDocuments([]);
        console.log('ℹ️ No cached partner documents');
      }
    } catch (error) {
      console.error('Failed to load partner documents:', error);
      setPartnerDocuments([]); // Fail gracefully
    }
  };

  const loadPartners = async () => {
    const startTime = Date.now();
    try {
      setLoading(true);
      
      // 🔥 NUCLEAR MODE: Try localStorage first (instant load)
      const cached = localStorage.getItem('cache-partners');
      if (cached) {
        try {
          const data = JSON.parse(cached);
          setPartners(data.partners || []);
          console.log('⚡ Partners loaded from cache (instant)');
          setLoading(false);
          
          // Still fetch in background to update cache
          fetchPartnersInBackground();
          return;
        } catch (e) {
          console.warn('Failed to parse partners cache:', e);
        }
      }
      
      // If no cache, fetch normally
      console.log('📊 Loading partners from API...');
      const [partnersResponse, allDocsResponse] = await Promise.all([
        api.get('/partners').catch(err => {
          console.log('⚠️ Partners API error:', err);
          return null;
        }),
        api.get('/documents?recipientType=partner&limit=20').catch(err => {
          console.log('⚠️ Partner documents API error:', err);
          return null;
        })
      ]);

      if (partnersResponse?.ok) {
        const data = await partnersResponse.json();
        const loadedPartners = data.partners || [];
        
        // Get all partner documents once
        let allPartnerDocs: any[] = [];
        if (allDocsResponse?.ok) {
          const docsData = await allDocsResponse.json();
          allPartnerDocs = docsData.documents || [];
        }
        
        // Calculate stats from the pre-loaded documents (in-memory, very fast!)
        const partnersWithStats = loadedPartners.map((partner: Partner) => {
          const docs = allPartnerDocs.filter(doc => doc.partnerId === partner.id);
          const totalRevenue = docs.reduce((sum: number, doc: any) => sum + (doc.totalAmount || 0), 0);
          const totalProjects = docs.length;
          
          return {
            ...partner,
            totalRevenue,
            totalProjects,
          };
        });
        
        setPartners(partnersWithStats);
        
        // 🔥 Save to localStorage for next time
        try {
          localStorage.setItem('cache-partners', JSON.stringify({ partners: partnersWithStats }));
        } catch (e) {
          console.warn('Failed to cache partners:', e);
        }
        
        const duration = Date.now() - startTime;
        if (duration > 1000) {
          console.warn(`⚠️ Slow load: Partners took ${duration}ms`);
        } else {
          console.log(`✅ Partners loaded in ${duration}ms`);
        }
      } else {
        // 🔥 Fallback to cache even on error
        const cached = localStorage.getItem('cache-partners');
        if (cached) {
          try {
            const data = JSON.parse(cached);
            setPartners(data.partners || []);
            console.log('⚡ Using cached partners (offline mode)');
            return;
          } catch (e) {
            console.warn('Failed to use cached partners:', e);
          }
        }
        
        // No cache available - show empty state
        setPartners([]);
        console.log('ℹ️ No cached partners available');
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`Failed to load partners (${duration}ms):`, error);
      
      // 🔥 Final fallback to cache
      const cached = localStorage.getItem('cache-partners');
      if (cached) {
        try {
          const data = JSON.parse(cached);
          setPartners(data.partners || []);
          console.log('⚡ Using cached partners (error recovery)');
        } catch (e) {
          console.warn('Failed to use cached partners:', e);
        }
      } else {
        setPartners([]);
      }
    } finally {
      setLoading(false);
    }
  };
  
  // 🔥 Background fetch to update cache
  const fetchPartnersInBackground = async () => {
    try {
      const [partnersResponse, allDocsResponse] = await Promise.all([
        api.get('/partners'),
        api.get('/documents?recipientType=partner&limit=20')
      ]);

      if (partnersResponse?.ok) {
        const data = await partnersResponse.json();
        const loadedPartners = data.partners || [];
        
        let allPartnerDocs: any[] = [];
        if (allDocsResponse?.ok) {
          const docsData = await allDocsResponse.json();
          allPartnerDocs = docsData.documents || [];
        }
        
        const partnersWithStats = loadedPartners.map((partner: Partner) => {
          const docs = allPartnerDocs.filter(doc => doc.partnerId === partner.id);
          const totalRevenue = docs.reduce((sum: number, doc: any) => sum + (doc.totalAmount || 0), 0);
          const totalProjects = docs.length;
          
          return {
            ...partner,
            totalRevenue,
            totalProjects,
          };
        });
        
        // Update state if data changed
        setPartners(partnersWithStats);
        
        // Update cache
        localStorage.setItem('cache-partners', JSON.stringify({ partners: partnersWithStats }));
        console.log('🔄 Partners cache updated in background');
      }
    } catch (error) {
      console.log('Background fetch failed (not critical):', error);
    }
  };

  const filterAndSortPartners = () => {
    let filtered = [...partners];

    // Filter by type
    if (selectedType !== 'all') {
      filtered = filtered.filter(p => p.type === selectedType);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        p =>
          p.name.toLowerCase().includes(query) ||
          p.phone.includes(query) ||
          p.email?.toLowerCase().includes(query) ||
          p.company?.toLowerCase().includes(query)
      );
    }

    // Sort
    switch (sortBy) {
      case 'name':
        filtered.sort((a, b) => a.name.localeCompare(b.name, 'th'));
        break;
      case 'recent':
        filtered.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
        break;
      case 'revenue':
        filtered.sort((a, b) => b.totalRevenue - a.totalRevenue);
        break;
      case 'projects':
        filtered.sort((a, b) => b.totalProjects - a.totalProjects);
        break;
    }

    setFilteredPartners(filtered);
  };

  const handleAdd = async () => {
    if (!formData.name || !formData.phone) {
      toast.error('กรุณากรอกชื่อและเบอร์โทรศัพท์');
      return;
    }

    try {
      const newPartnerData: any = {
        id: `partner-${Date.now()}`,
        name: formData.name,
      };
      
      // Only include optional fields if they have values
      if (formData.phone) newPartnerData.phone = formData.phone;
      if (formData.address) newPartnerData.address = formData.address;
      if (formData.company) newPartnerData.companyName = formData.company;
      if (formData.email && formData.email.includes('@')) newPartnerData.email = formData.email;

      const newPartner: Partner = {
        ...newPartnerData,
        type: formData.type,
        company: formData.company,
        commission: formData.commission,
        notes: formData.notes,
        totalProjects: 0,
        totalRevenue: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const response = await api.post('/partners', newPartnerData);

      if (response.ok) {
        setPartners([...partners, newPartner]);
        setIsAddDialogOpen(false);
        resetForm();
        toast.success('เพิ่มพาร์ทเนอร์สำเร็จ!');
      }
    } catch (error) {
      console.error('Failed to add partner:', error);
      toast.error('ไม่สามารถเพิ่มพาร์ทเนอร์ได้');
    }
  };

  const handleEdit = async () => {
    if (!selectedPartner || !formData.name || !formData.phone) {
      toast.error('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }

    try {
      const updatedPartnerData: any = {
        id: selectedPartner.id,
        name: formData.name,
      };
      
      // Only include optional fields if they have values
      if (formData.phone) updatedPartnerData.phone = formData.phone;
      if (formData.address) updatedPartnerData.address = formData.address;
      if (formData.company) updatedPartnerData.companyName = formData.company;
      if (formData.email && formData.email.includes('@')) updatedPartnerData.email = formData.email;

      const updatedPartner: Partner = {
        ...selectedPartner,
        ...updatedPartnerData,
        type: formData.type,
        company: formData.company,
        commission: formData.commission,
        notes: formData.notes,
        updatedAt: Date.now(),
      };

      const response = await api.put(`/partners/${selectedPartner.id}`, updatedPartnerData);

      if (response.ok) {
        setPartners(
          partners.map(p => (p.id === selectedPartner.id ? updatedPartner : p))
        );
        setIsEditDialogOpen(false);
        setSelectedPartner(null);
        resetForm();
        toast.success('แก้ไขข้อมูลสำเร็จ!');
      }
    } catch (error) {
      console.error('Failed to edit partner:', error);
      toast.error('ไม่สามารถแก้ไขข้อมูลได้');
    }
  };

  const handleDelete = async () => {
    if (!selectedPartner) return;

    try {
      const response = await api.delete(`/partners/${selectedPartner.id}`);

      if (response.ok) {
        setPartners(partners.filter(p => p.id !== selectedPartner.id));
        setIsDeleteDialogOpen(false);
        setIsDetailSheetOpen(false);
        setSelectedPartner(null);
        toast.success('ลบพาร์ทเนอร์สำเร็จ!');
      }
    } catch (error) {
      console.error('Failed to delete partner:', error);
      toast.error('ไม่สามารถลบพาร์ทเนอร์ได้');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'contractor',
      company: '',
      phone: '',
      email: '',
      address: '',
      commission: 0,
      notes: '',
    });
  };

  const openEditDialog = (partner: Partner) => {
    setSelectedPartner(partner);
    setFormData({
      name: partner.name,
      type: partner.type,
      company: partner.company || '',
      phone: partner.phone,
      email: partner.email || '',
      address: partner.address || '',
      commission: partner.commission || 0,
      notes: partner.notes || '',
    });
    setIsEditDialogOpen(true);
  };

  const openDetailSheet = (partner: Partner) => {
    setSelectedPartner(partner);
    loadPartnerDocuments(partner.id);
    setIsDetailSheetOpen(true);
  };

  const handleCreateBOQForPartner = (partner: Partner) => {
    setIsDetailSheetOpen(false);
    if (onCreateBOQForPartner) {
      onCreateBOQForPartner(partner.id, partner.name);
      toast.success(`เริ่มสร้าง BOQ สำหรับพาร์ทเนอร์: ${partner.name}`);
    }
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

  const getPartnersByType = () => {
    const counts: Record<ProposerType, number> = {
      electrician: 0,
      plumber: 0,
      glass_company: 0,
      contractor: 0,
      material_store: 0,
      other: 0,
    };

    partners.forEach(p => {
      counts[p.type]++;
    });

    return counts;
  };

  const partnerTypeCounts = getPartnersByType();

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6"
        >
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-blue-500 flex items-center justify-center shadow-lg">
                <Handshake className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl">จัดการพาร์ทเนอร์</h1>
                <p className="text-muted-foreground text-sm">
                  จัดการข้อมูลพาร์ทเนอร์ทางธุรกิจและผู้ร่วมงาน
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="gap-2">
              <Upload className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" className="gap-2">
              <Download className="w-4 h-4" />
            </Button>
            <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              <span className="hidden md:inline">เพิ่มพาร์ทเนอร์</span>
            </Button>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6"
        >
          <Card className="p-3 sm:p-4 hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center shrink-0">
                <Handshake className="w-4 h-4 sm:w-5 sm:h-5 text-green-700" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground truncate">พาร์ทเนอร์ทั้งหมด</p>
                <p className="text-lg sm:text-xl md:text-2xl">{partners.length}</p>
              </div>
            </div>
          </Card>

          <Card className="p-3 sm:p-4 hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center shrink-0">
                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-blue-700" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground truncate">รายได้รวม</p>
                <p className="text-sm sm:text-base md:text-xl truncate">
                  {formatCurrency(
                    partners.reduce((sum, p) => sum + (p.totalRevenue || 0), 0)
                  )}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-3 sm:p-4 hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center shrink-0">
                <Briefcase className="w-4 h-4 sm:w-5 sm:h-5 text-purple-700" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground truncate">โครงการร่วม</p>
                <p className="text-lg sm:text-xl md:text-2xl">
                  {partners.reduce((sum, p) => sum + (p.totalProjects || 0), 0)}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-3 sm:p-4 hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center shrink-0">
                <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-orange-700" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground truncate">พาร์ทเนอร์ Active</p>
                <p className="text-lg sm:text-xl md:text-2xl">
                  {partners.filter(p => p.totalProjects > 0).length}
                </p>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full md:w-auto grid-cols-3 md:inline-flex">
            <TabsTrigger value="all">ทั้งหมด</TabsTrigger>
            <TabsTrigger value="by-type">แบ่งตามประเภท</TabsTrigger>
            <TabsTrigger value="analytics">สถิติ</TabsTrigger>
          </TabsList>

          {/* All Partners Tab */}
          <TabsContent value="all" className="space-y-4">
            {/* Filters & Search */}
            <Card className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="ค้นหาพาร์ทเนอร์ (ชื่อ, เบอร์โทร, อีเมล, บริษัท)..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                  {searchQuery && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7"
                      onClick={() => setSearchQuery('')}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>

                <Select value={selectedType} onValueChange={(v: any) => setSelectedType(v)}>
                  <SelectTrigger className="w-full md:w-[200px]">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="ประเภท" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">ทุกประเภท</SelectItem>
                    {Object.entries(proposerTypeLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={sortBy} onValueChange={(v: SortBy) => setSortBy(v)}>
                  <SelectTrigger className="w-full md:w-[200px]">
                    <ArrowUpDown className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="เรียงตาม" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recent">อัพเดตล่าสุด</SelectItem>
                    <SelectItem value="name">ชื่อ A-Z</SelectItem>
                    <SelectItem value="revenue">รายได้สูงสุด</SelectItem>
                    <SelectItem value="projects">โครงการมากสุด</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Active Filters */}
              {(searchQuery || selectedType !== 'all') && (
                <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                  <span className="text-sm text-muted-foreground">กรองโดย:</span>
                  {searchQuery && (
                    <Badge variant="secondary" className="gap-1">
                      ค้นหา: {searchQuery}
                      <X
                        className="w-3 h-3 cursor-pointer"
                        onClick={() => setSearchQuery('')}
                      />
                    </Badge>
                  )}
                  {selectedType !== 'all' && (
                    <Badge variant="secondary" className="gap-1">
                      {proposerTypeLabels[selectedType as ProposerType]}
                      <X
                        className="w-3 h-3 cursor-pointer"
                        onClick={() => setSelectedType('all')}
                      />
                    </Badge>
                  )}
                </div>
              )}
            </Card>

            {/* Partners Table */}
            <Card>
              <ScrollArea className="w-full">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ประเภท</TableHead>
                      <TableHead>ชื่อ-บริษัท</TableHead>
                      <TableHead>ติดต่อ</TableHead>
                      <TableHead className="text-right">Commission</TableHead>
                      <TableHead className="text-right">โครงการ</TableHead>
                      <TableHead className="text-right">รายได้</TableHead>
                      <TableHead className="text-center">จัดการ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-12">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                            <span>กำลังโหลด...</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : filteredPartners.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-12">
                          <Handshake className="w-12 h-12 text-muted-foreground mx-auto mb-2 opacity-20" />
                          <p className="text-muted-foreground">
                            {searchQuery || selectedType !== 'all'
                              ? 'ไม่พบพาร์ทเนอร์ที่ตรงกับการค้นหา'
                              : 'ยังไม่มีพาร์ทเนอร์'}
                          </p>
                          {!searchQuery && selectedType === 'all' && (
                            <Button
                              onClick={() => setIsAddDialogOpen(true)}
                              className="mt-4"
                              size="sm"
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              เพิ่มพาร์ทเนอร์แรก
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredPartners.map((partner, index) => {
                        const TypeIcon = proposerTypeIcons[partner.type];
                        return (
                          <motion.tr
                            key={partner.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.03 }}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => openDetailSheet(partner)}
                          >
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={`gap-1 ${proposerTypeColors[partner.type]}`}
                              >
                                <TypeIcon className="w-3 h-3" />
                                <span className="hidden md:inline">
                                  {proposerTypeLabels[partner.type]}
                                </span>
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">{partner.name}</p>
                                {partner.company && (
                                  <p className="text-xs text-muted-foreground">
                                    {partner.company}
                                  </p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 text-sm">
                                  <Phone className="w-3 h-3 text-muted-foreground" />
                                  {partner.phone}
                                </div>
                                {partner.email && (
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Mail className="w-3 h-3" />
                                    {partner.email}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge variant="secondary">{partner.commission || 0}%</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Briefcase className="w-3 h-3 text-muted-foreground" />
                                {partner.totalProjects}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(partner.totalRevenue)}
                            </TableCell>
                            <TableCell
                              className="text-center"
                              onClick={e => e.stopPropagation()}
                            >
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreVertical className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() => openDetailSheet(partner)}
                                    className="gap-2"
                                  >
                                    <Eye className="w-4 h-4" />
                                    ดูรายละเอียด
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleCreateBOQForPartner(partner)}
                                    className="gap-2"
                                  >
                                    <Plus className="w-4 h-4" />
                                    สร้าง BOQ ใหม่
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => openEditDialog(partner)}
                                    className="gap-2"
                                  >
                                    <Edit className="w-4 h-4" />
                                    แก้ไข
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedPartner(partner);
                                      setIsDeleteDialogOpen(true);
                                    }}
                                    className="gap-2 text-red-600"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                    ลบ
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </motion.tr>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>

              {/* Results count */}
              {!loading && filteredPartners.length > 0 && (
                <div className="px-4 py-3 border-t text-sm text-muted-foreground">
                  แสดง {filteredPartners.length} จาก {partners.length} พาร์ทเนอร์
                </div>
              )}
            </Card>
          </TabsContent>

          {/* By Type Tab */}
          <TabsContent value="by-type" className="space-y-6">
            {Object.entries(proposerTypeLabels).map(([type, label]) => {
              const typePartners = partners.filter(p => p.type === type);
              const TypeIcon = proposerTypeIcons[type as ProposerType];

              if (typePartners.length === 0) return null;

              return (
                <motion.div
                  key={type}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card className="overflow-hidden">
                    <div className="p-4 bg-muted/50 border-b flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-lg flex items-center justify-center ${proposerTypeColors[type as ProposerType]}`}
                        >
                          <TypeIcon className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-lg font-medium">{label}</h3>
                          <p className="text-sm text-muted-foreground">
                            {typePartners.length} พาร์ทเนอร์
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">รายได้รวม</p>
                        <p className="text-lg">
                          {formatCurrency(
                            typePartners.reduce((sum, p) => sum + (p.totalRevenue || 0), 0)
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="divide-y">
                      {typePartners.map(partner => (
                        <div
                          key={partner.id}
                          className="p-4 hover:bg-muted/50 cursor-pointer transition-colors flex items-center justify-between"
                          onClick={() => openDetailSheet(partner)}
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-100 to-blue-100 flex items-center justify-center">
                                <User className="w-5 h-5 text-green-700" />
                              </div>
                              <div>
                                <p className="font-medium">{partner.name}</p>
                                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Phone className="w-3 h-3" />
                                    {partner.phone}
                                  </span>
                                  {partner.company && (
                                    <span className="flex items-center gap-1">
                                      <Building2 className="w-3 h-3" />
                                      {partner.company}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-6">
                            <div className="text-right">
                              <p className="text-sm text-muted-foreground">โครงการ</p>
                              <p className="text-lg">{partner.totalProjects}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-muted-foreground">รายได้</p>
                              <p className="text-lg">{formatCurrency(partner.totalRevenue)}</p>
                            </div>
                            <ChevronRight className="w-5 h-5 text-muted-foreground" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(proposerTypeLabels).map(([type, label]) => {
                const count = partnerTypeCounts[type as ProposerType];
                const typePartners = partners.filter(p => p.type === type);
                const totalRevenue = typePartners.reduce(
                  (sum, p) => sum + p.totalRevenue,
                  0
                );
                const totalProjects = typePartners.reduce(
                  (sum, p) => sum + p.totalProjects,
                  0
                );
                const TypeIcon = proposerTypeIcons[type as ProposerType];

                return (
                  <motion.div
                    key={type}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.05 }}
                  >
                    <Card className="p-6 hover:shadow-lg transition-shadow">
                      <div className="flex items-start justify-between mb-4">
                        <div
                          className={`w-12 h-12 rounded-xl flex items-center justify-center ${proposerTypeColors[type as ProposerType]}`}
                        >
                          <TypeIcon className="w-6 h-6" />
                        </div>
                        <Badge variant="secondary">{count}</Badge>
                      </div>

                      <h3 className="font-medium mb-4">{label}</h3>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground flex items-center gap-1">
                            <Briefcase className="w-3 h-3" />
                            โครงการทั้งหมด
                          </span>
                          <span className="font-medium">{totalProjects}</span>
                        </div>

                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />
                            รายได้รวม
                          </span>
                          <span className="font-medium">{formatCurrency(totalRevenue)}</span>
                        </div>

                        {count > 0 && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground flex items-center gap-1">
                              <TrendingUp className="w-3 h-3" />
                              เฉลี่ย/คน
                            </span>
                            <span className="font-medium">
                              {formatCurrency(totalRevenue / count)}
                            </span>
                          </div>
                        )}
                      </div>

                      {count > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full mt-4"
                          onClick={() => {
                            setSelectedType(type as ProposerType);
                            setActiveTab('all');
                          }}
                        >
                          ดูพาร์ทเนอร์ทั้งหมด
                          <ChevronRight className="w-4 h-4 ml-2" />
                        </Button>
                      )}
                    </Card>
                  </motion.div>
                );
              })}
            </div>

            {/* Top Performers */}
            <Card className="p-6">
              <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                พาร์ทเนอร์ที่ทำรายได้สูงสุด Top 5
              </h3>
              <div className="space-y-3">
                {[...partners]
                  .sort((a, b) => b.totalRevenue - a.totalRevenue)
                  .slice(0, 5)
                  .map((partner, index) => {
                    const TypeIcon = proposerTypeIcons[partner.type];
                    return (
                      <div
                        key={partner.id}
                        className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => openDetailSheet(partner)}
                      >
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-yellow-100 to-orange-100 text-orange-700 font-medium">
                          #{index + 1}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{partner.name}</p>
                            <Badge
                              variant="outline"
                              className={`gap-1 ${proposerTypeColors[partner.type]}`}
                            >
                              <TypeIcon className="w-3 h-3" />
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {partner.totalProjects} โครงการ
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-medium">
                            {formatCurrency(partner.totalRevenue)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Partner Detail Sheet */}
      <Sheet open={isDetailSheetOpen} onOpenChange={setIsDetailSheetOpen}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          {selectedPartner && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-3">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      proposerTypeColors[selectedPartner.type]
                    }`}
                  >
                    {(() => {
                      const Icon = proposerTypeIcons[selectedPartner.type];
                      return <Icon className="w-6 h-6" />;
                    })()}
                  </div>
                  <div>
                    <p className="text-xl">{selectedPartner.name}</p>
                    <Badge
                      variant="outline"
                      className={`mt-1 ${proposerTypeColors[selectedPartner.type]}`}
                    >
                      {proposerTypeLabels[selectedPartner.type]}
                    </Badge>
                  </div>
                </SheetTitle>
                <SheetDescription>
                  รายละเอียดพาร์ทเนอร์และประวัติการทำงานร่วมกัน
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-6 mt-6">
                {/* Quick Actions */}
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={() => handleCreateBOQForPartner(selectedPartner)}
                    className="gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    สร้าง BOQ ใหม่
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => openEditDialog(selectedPartner)}
                    className="gap-2"
                  >
                    <Edit className="w-4 h-4" />
                    แก้ไขข้อมูล
                  </Button>
                </div>

                {/* Summary Stats */}
                <div className="grid grid-cols-3 gap-4">
                  <Card className="p-4">
                    <div className="text-center">
                      <Briefcase className="w-5 h-5 text-muted-foreground mx-auto mb-2" />
                      <p className="text-2xl">{selectedPartner.totalProjects}</p>
                      <p className="text-xs text-muted-foreground">โครงการ</p>
                    </div>
                  </Card>
                  <Card className="p-4">
                    <div className="text-center">
                      <DollarSign className="w-5 h-5 text-muted-foreground mx-auto mb-2" />
                      <p className="text-lg">{formatCurrency(selectedPartner.totalRevenue)}</p>
                      <p className="text-xs text-muted-foreground">รายได้รวม</p>
                    </div>
                  </Card>
                  <Card className="p-4">
                    <div className="text-center">
                      <TrendingUp className="w-5 h-5 text-muted-foreground mx-auto mb-2" />
                      <p className="text-2xl">{selectedPartner.commission || 0}%</p>
                      <p className="text-xs text-muted-foreground">Commission</p>
                    </div>
                  </Card>
                </div>

                {/* Contact Information */}
                <Card className="p-4">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <User className="w-4 h-4" />
                    ข้อมูลติดต่อ
                  </h4>
                  <div className="space-y-3">
                    {selectedPartner.company && (
                      <div className="flex items-start gap-3">
                        <Building2 className="w-4 h-4 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm text-muted-foreground">บริษัท</p>
                          <p>{selectedPartner.company}</p>
                        </div>
                      </div>
                    )}
                    <div className="flex items-start gap-3">
                      <Phone className="w-4 h-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm text-muted-foreground">เบอร์โทรศัพท์</p>
                        <a href={`tel:${selectedPartner.phone}`} className="text-blue-600 hover:underline">
                          {selectedPartner.phone}
                        </a>
                      </div>
                    </div>
                    {selectedPartner.email && (
                      <div className="flex items-start gap-3">
                        <Mail className="w-4 h-4 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm text-muted-foreground">อีเมล</p>
                          <a
                            href={`mailto:${selectedPartner.email}`}
                            className="text-blue-600 hover:underline"
                          >
                            {selectedPartner.email}
                          </a>
                        </div>
                      </div>
                    )}
                    {selectedPartner.address && (
                      <div className="flex items-start gap-3">
                        <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm text-muted-foreground">ที่อยู่</p>
                          <p className="text-sm">{selectedPartner.address}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </Card>

                {/* Notes */}
                {selectedPartner.notes && (
                  <Card className="p-4">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      หมายเหตุ
                    </h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {selectedPartner.notes}
                    </p>
                  </Card>
                )}

                {/* Documents History */}
                <Card className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      ประวัติเอกสาร
                    </h4>
                    <Badge variant="secondary">{partnerDocuments.length}</Badge>
                  </div>

                  {partnerDocuments.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="w-12 h-12 mx-auto mb-2 opacity-20" />
                      <p className="text-sm">ยังไม่มีเอกสาร</p>
                    </div>
                  ) : (
                    <ScrollArea className="h-[300px]">
                      <div className="space-y-3">
                        {partnerDocuments.map(doc => {
                          const getDocTypeLabel = (type: string) => {
                            switch (type) {
                              case 'boq': return 'BOQ';
                              case 'quotation': return 'ใบเสนอราคา';
                              case 'invoice': return 'ใบวางบิล';
                              case 'receipt': return 'ใบเสร็จ';
                              default: return type;
                            }
                          };

                          const getStatusBadge = (status: string) => {
                            switch (status) {
                              case 'draft':
                                return <Badge variant="outline" className="bg-gray-100">แบบร่าง</Badge>;
                              case 'sent':
                                return <Badge variant="outline" className="bg-blue-100 text-blue-700">ส่งแล้ว</Badge>;
                              case 'paid':
                                return <Badge variant="outline" className="bg-green-100 text-green-700">ชำระแล้ว</Badge>;
                              default:
                                return <Badge variant="outline">{status}</Badge>;
                            }
                          };

                          return (
                            <div
                              key={doc.id}
                              className="p-3 border rounded-lg hover:bg-muted/50 transition-colors group"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                                    <Badge variant="outline" className="text-xs">
                                      {getDocTypeLabel(doc.type)}
                                    </Badge>
                                    <span className="text-sm font-medium">
                                      {doc.documentNumber}
                                    </span>
                                    {doc.status && getStatusBadge(doc.status)}
                                  </div>
                                  <p className="text-sm font-medium">{doc.projectTitle}</p>
                                  {doc.mainProjectTag && (
                                    <Badge variant="secondary" className="mt-1 text-xs">
                                      {doc.mainProjectTag}
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-medium">
                                    {formatCurrency(doc.totalAmount || 0)}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {formatDate(doc.createdAt)}
                                  </p>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="mt-1 h-6 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      // TODO: Implement edit document
                                      toast.info('ฟีเจอร์แก้ไขเอกสารกำลังพัฒนา', {
                                        description: `จะสามารถแก้ไข ${doc.documentNumber} ได้ในอนาคต`,
                                      });
                                    }}
                                  >
                                    <Edit className="w-3 h-3 mr-1" />
                                    แก้ไข
                                  </Button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  )}
                </Card>

                {/* Timeline */}
                <Card className="p-4">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Timeline
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-green-500 mt-2" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">เพิ่มพาร์ทเนอร์</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(selectedPartner.createdAt)}
                        </p>
                      </div>
                    </div>
                    {selectedPartner.updatedAt !== selectedPartner.createdAt && (
                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 rounded-full bg-blue-500 mt-2" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">อัพเดตข้อมูล</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(selectedPartner.updatedAt || selectedPartner.createdAt)}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </Card>

                {/* Danger Zone */}
                <Card className="p-4 border-red-200 bg-red-50/50">
                  <h4 className="font-medium mb-2 text-red-700 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    Danger Zone
                  </h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    การลบพาร์ทเนอร์จะไม่ส่งผลต่อเอกสารที่เคยสร้างไว้
                  </p>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      setIsDeleteDialogOpen(true);
                    }}
                    className="gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    ลบพาร์ทเนอร์
                  </Button>
                </Card>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Add Partner Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>เพิ่มพาร์ทเนอร์ใหม่</DialogTitle>
            <DialogDescription>กรอกข้อมูลพาร์ทเนอร์เพื่อเพิ่มเข้าระบบ</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>
                  ชื่อพาร์ทเนอร์ <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="นายสมชาย ช่างฝีมือ"
                />
              </div>
              <div>
                <Label>
                  ประเภท <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.type}
                  onValueChange={(v: ProposerType) => setFormData({ ...formData, type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(proposerTypeLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>บริษัท/ห้างหุ้นส่วน</Label>
              <Input
                value={formData.company}
                onChange={e => setFormData({ ...formData, company: e.target.value })}
                placeholder="บริษัท XYZ จำกัด"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>
                  เบอร์โทรศัพท์ <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="081-234-5678"
                />
              </div>
              <div>
                <Label>อีเมล</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  placeholder="partner@email.com"
                />
              </div>
            </div>

            <div>
              <Label>ที่อยู่</Label>
              <Textarea
                value={formData.address}
                onChange={e => setFormData({ ...formData, address: e.target.value })}
                placeholder="123 ถนนสุขุมวิท..."
                rows={2}
              />
            </div>

            <div>
              <Label>Commission (%)</Label>
              <Input
                type="number"
                value={formData.commission}
                onChange={e => setFormData({ ...formData, commission: Number(e.target.value) })}
                placeholder="10"
                min="0"
                max="100"
              />
            </div>

            <div>
              <Label>หมายเหตุ</Label>
              <Textarea
                value={formData.notes}
                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                placeholder="บันทึกเพิ่มเติม"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAddDialogOpen(false);
                resetForm();
              }}
            >
              ยกเลิก
            </Button>
            <Button onClick={handleAdd}>เพิ่มพาร์ทเนอร์</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>แก้ไขข้อมูลพาร์ทเนอร์</DialogTitle>
            <DialogDescription>
              แก้ไขข้อมูลพาร์ทเนอร์ของคุณ
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>
                  ชื่อพาร์ทเนอร์ <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div>
                <Label>
                  ประเภท <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.type}
                  onValueChange={(v: ProposerType) => setFormData({ ...formData, type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(proposerTypeLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>บริษัท/ห้างหุ้นส่วน</Label>
              <Input
                value={formData.company}
                onChange={e => setFormData({ ...formData, company: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>
                  เบอร์โทรศัพท์ <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div>
                <Label>อีเมล</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label>ที่อยู่</Label>
              <Textarea
                value={formData.address}
                onChange={e => setFormData({ ...formData, address: e.target.value })}
                rows={2}
              />
            </div>

            <div>
              <Label>Commission (%)</Label>
              <Input
                type="number"
                value={formData.commission}
                onChange={e => setFormData({ ...formData, commission: Number(e.target.value) })}
                min="0"
                max="100"
              />
            </div>

            <div>
              <Label>หมายเหตุ</Label>
              <Textarea
                value={formData.notes}
                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditDialogOpen(false);
                resetForm();
              }}
            >
              ยกเลิก
            </Button>
            <Button onClick={handleEdit}>บันทึกการแก้ไข</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              ยืนยันการลบ
            </DialogTitle>
            <DialogDescription className="space-y-2">
              <p>คุณต้องการลบพาร์ทเนอร์ "{selectedPartner?.name}" ใช่หรือไม่?</p>
              <p className="text-sm text-muted-foreground">
                * การลบจะไม่ส่งผลต่อเอกสารที่เคยสร้างไว้
              </p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              ยกเลิก
            </Button>
            <Button variant="destructive" onClick={handleDelete} className="gap-2">
              <Trash2 className="w-4 h-4" />
              ลบพาร์ทเนอร์
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Document Dialog */}
      <Dialog open={isEditDocumentDialogOpen} onOpenChange={setIsEditDocumentDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>แก้ไขเอกสารพาร์ทเนอร์</DialogTitle>
            <DialogDescription>
              แก้ไขข้อมูลเอกสาร {selectedDocument?.documentNumber || ''}
            </DialogDescription>
          </DialogHeader>
          
          {selectedDocument && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>เลขที่เอกสาร</Label>
                  <Input value={selectedDocument.documentNumber} disabled className="bg-gray-50" />
                </div>
                <div>
                  <Label>ประเภทเอกสาร</Label>
                  <Input value={selectedDocument.type} disabled className="bg-gray-50" />
                </div>
              </div>
              
              <div>
                <Label>ชื่อโครงการ</Label>
                <Input 
                  value={selectedDocument.projectTitle || ''} 
                  onChange={(e) => setSelectedDocument({ ...selectedDocument, projectTitle: e.target.value })}
                />
              </div>
              
              <div>
                <Label>Tag โครงการหลัก (เช่น "โครงการบ้านคุณสมชาย")</Label>
                <Input 
                  value={selectedDocument.mainProjectTag || ''} 
                  onChange={(e) => setSelectedDocument({ ...selectedDocument, mainProjectTag: e.target.value })}
                  placeholder="ระบุชื่อโครงการหลักที่เกี่ยวข้อง"
                />
              </div>
              
              <div>
                <Label>ยอดรวม (บาท)</Label>
                <Input 
                  type="number"
                  value={selectedDocument.totalAmount || 0} 
                  onChange={(e) => setSelectedDocument({ ...selectedDocument, totalAmount: parseFloat(e.target.value) || 0 })}
                />
              </div>
              
              <div>
                <Label>สถานะ</Label>
                <Select
                  value={selectedDocument.status || 'draft'}
                  onValueChange={(v) => setSelectedDocument({ ...selectedDocument, status: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">แบบร่าง</SelectItem>
                    <SelectItem value="sent">ส่งแล้ว</SelectItem>
                    <SelectItem value="paid">ชำระแล้ว</SelectItem>
                    <SelectItem value="cancelled">ยกเลิก</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>คำอธิบายโครงการ</Label>
                <Textarea 
                  value={selectedDocument.projectDescription || ''} 
                  onChange={(e) => setSelectedDocument({ ...selectedDocument, projectDescription: e.target.value })}
                  rows={3}
                  placeholder="รายละเอียดเพิ่มเติม..."
                />
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsEditDocumentDialogOpen(false);
              setSelectedDocument(null);
            }}>
              ยกเลิก
            </Button>
            <Button onClick={async () => {
              if (!selectedDocument) return;
              
              try {
                selectedDocument.updatedAt = Date.now();
                // ⚡ Use api.put for cache management
                const response = await api.put(`/documents/${selectedDocument.id}`, selectedDocument);
                
                if (response.ok) {
                  toast.success('แก้ไขเอกสารสำเร็จ!');
                  setIsEditDocumentDialogOpen(false);
                  setSelectedDocument(null);
                  // Reload documents
                  if (selectedPartner) {
                    loadPartnerDocuments(selectedPartner.id);
                  }
                } else {
                  toast.error('ไม่สามารถแก้ไขเอกสารได้');
                }
              } catch (error) {
                console.error('Error updating document:', error);
                toast.error('เกิดข้อผิดพลาดในการแก้ไขเอกสาร');
              }
            }}>
              <Edit className="w-4 h-4 mr-2" />
              บันทึกการแก้ไข
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
