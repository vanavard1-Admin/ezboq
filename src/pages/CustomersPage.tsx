import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '../components/ui/dialog';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Textarea } from '../components/ui/textarea';
import {
  Users,
  Plus,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  Building2,
  User,
  Phone,
  Mail,
  MapPin,
  FileText,
  TrendingUp,
  Calendar,
  ArrowLeft,
  Tag,
} from 'lucide-react';
import { Customer } from '../types/boq';
import { toast } from 'sonner@2.0.3';
import { api } from '../utils/api';

interface CustomersPageProps {
  onBack: () => void;
}

export function CustomersPage({ onBack }: CustomersPageProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<'all' | 'individual' | 'company'>('all');

  // Form state
  const [formData, setFormData] = useState({
    type: 'individual' as 'individual' | 'company',
    name: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
    taxId: '',
    notes: '',
    tags: [] as string[],
  });

  useEffect(() => {
    loadCustomers();
  }, []);

  useEffect(() => {
    filterCustomers();
  }, [searchQuery, customers, filterType]);

  const loadCustomers = async () => {
    const startTime = Date.now();
    try {
      setLoading(true);
      const response = await api.get('/customers');

      if (response.ok) {
        const data = await response.json();
        setCustomers(data.customers || []);
        
        const duration = Date.now() - startTime;
        if (duration > 1000) {
          console.warn(`⚠️ Slow load: Customers took ${duration}ms`);
        } else {
          console.log(`✅ Customers loaded in ${duration}ms`);
        }
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`Failed to load customers (${duration}ms):`, error);
      toast.error('ไม่สามารถโหลดข้อมูลลูกค้าได้');
    } finally {
      setLoading(false);
    }
  };

  const filterCustomers = () => {
    let filtered = customers;

    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter(c => c.type === filterType);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        c =>
          c.name.toLowerCase().includes(query) ||
          c.phone.includes(query) ||
          c.email?.toLowerCase().includes(query) ||
          c.address.toLowerCase().includes(query)
      );
    }

    setFilteredCustomers(filtered);
  };

  const handleAdd = async () => {
    if (!formData.name || !formData.phone) {
      toast.error('กรุณากรอกชื่อและเบอร์โทรศัพท์');
      return;
    }

    try {
      const newCustomerData: any = {
        id: `customer-${Date.now()}`,
        name: formData.name,
      };
      
      // Only include optional fields if they have values
      if (formData.phone) newCustomerData.phone = formData.phone;
      if (formData.address) newCustomerData.address = formData.address;
      if (formData.taxId) newCustomerData.taxId = formData.taxId;
      if (formData.contactPerson) newCustomerData.contactPerson = formData.contactPerson;
      if (formData.email && formData.email.includes('@')) newCustomerData.email = formData.email;

      const newCustomer: Customer = {
        ...newCustomerData,
        type: formData.type,
        notes: formData.notes,
        tags: formData.tags,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        totalProjects: 0,
        totalRevenue: 0,
      };

      const response = await api.post('/customers', newCustomerData);

      if (response.ok) {
        setCustomers([...customers, newCustomer]);
        setIsAddDialogOpen(false);
        resetForm();
        toast.success('เพิ่มลูกค้าสำเร็จ!');
      }
    } catch (error) {
      console.error('Failed to add customer:', error);
      toast.error('ไม่สามารถเพิ่มลูกค้าได้');
    }
  };

  const handleEdit = async () => {
    if (!selectedCustomer || !formData.name || !formData.phone) {
      toast.error('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }

    try {
      const updatedCustomerData: any = {
        id: selectedCustomer.id,
        name: formData.name,
      };
      
      // Only include optional fields if they have values
      if (formData.phone) updatedCustomerData.phone = formData.phone;
      if (formData.address) updatedCustomerData.address = formData.address;
      if (formData.taxId) updatedCustomerData.taxId = formData.taxId;
      if (formData.contactPerson) updatedCustomerData.contactPerson = formData.contactPerson;
      if (formData.email && formData.email.includes('@')) updatedCustomerData.email = formData.email;

      const updatedCustomer: Customer = {
        ...selectedCustomer,
        ...updatedCustomerData,
        type: formData.type,
        notes: formData.notes,
        tags: formData.tags,
        updatedAt: Date.now(),
      };

      const response = await api.put(`/customers/${selectedCustomer.id}`, updatedCustomerData);

      if (response.ok) {
        setCustomers(
          customers.map(c => (c.id === selectedCustomer.id ? updatedCustomer : c))
        );
        setIsEditDialogOpen(false);
        setSelectedCustomer(null);
        resetForm();
        toast.success('แก้ไขข้อมูลสำเร็จ!');
      }
    } catch (error) {
      console.error('Failed to edit customer:', error);
      toast.error('ไม่สามารถแก้ไขข้อมูลได้');
    }
  };

  const handleDelete = async () => {
    if (!selectedCustomer) return;

    try {
      const response = await api.delete(`/customers/${selectedCustomer.id}`);

      if (response.ok) {
        setCustomers(customers.filter(c => c.id !== selectedCustomer.id));
        setIsDeleteDialogOpen(false);
        setSelectedCustomer(null);
        toast.success('ลบลูกค้าสำเร็จ!');
      }
    } catch (error) {
      console.error('Failed to delete customer:', error);
      toast.error('ไม่สามารถลบลูกค้าได้');
    }
  };

  const resetForm = () => {
    setFormData({
      type: 'individual',
      name: '',
      contactPerson: '',
      email: '',
      phone: '',
      address: '',
      taxId: '',
      notes: '',
      tags: [],
    });
  };

  const openEditDialog = (customer: Customer) => {
    setSelectedCustomer(customer);
    setFormData({
      type: customer.type,
      name: customer.name,
      contactPerson: customer.contactPerson || '',
      email: customer.email || '',
      phone: customer.phone,
      address: customer.address,
      taxId: customer.taxId || '',
      notes: customer.notes || '',
      tags: customer.tags || [],
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsDeleteDialogOpen(true);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4 sm:p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 sm:mb-8">
          <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
            <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-xl sm:text-2xl md:text-3xl truncate">จัดการลูกค้า</h1>
                <p className="text-xs sm:text-sm text-muted-foreground truncate">
                  จัดการข้อมูลลูกค้าและประวัติการทำงาน
                </p>
              </div>
            </div>
          </div>
          <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2 w-full sm:w-auto">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">เพิ่มลูกค้าใหม่</span>
            <span className="sm:hidden">เพิ่มลูกค้า</span>
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
          <Card className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                <Users className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-muted-foreground truncate">ลูกค้าทั้งหมด</p>
                <p className="text-lg sm:text-xl md:text-2xl">{customers.length}</p>
              </div>
            </div>
          </Card>
          <Card className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-muted-foreground truncate">รายได้รวม</p>
                <p className="text-sm sm:text-base md:text-xl truncate">
                  {formatCurrency(
                    customers.reduce((sum, c) => sum + (c.totalRevenue || 0), 0)
                  )}
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-muted-foreground truncate">โครงการทั้งหมด</p>
                <p className="text-lg sm:text-xl md:text-2xl">
                  {customers.reduce((sum, c) => sum + (c.totalProjects || 0), 0)}
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-orange-100 flex items-center justify-center shrink-0">
                <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-muted-foreground truncate">บริษัท</p>
                <p className="text-lg sm:text-xl md:text-2xl">
                  {customers.filter(c => c.type === 'company').length}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Search and Filter */}
        <Card className="p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="ค้นหาลูกค้า..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Tabs value={filterType} onValueChange={(v: any) => setFilterType(v)}>
              <TabsList>
                <TabsTrigger value="all">ทั้งหมด</TabsTrigger>
                <TabsTrigger value="individual">บุคคล</TabsTrigger>
                <TabsTrigger value="company">บริษัท</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </Card>

        {/* Customers Table - Desktop */}
        <Card className="hidden md:block">
          <ScrollArea className="h-[600px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ประเภท</TableHead>
                  <TableHead>ชื่อ</TableHead>
                  <TableHead>ติดต่อ</TableHead>
                  <TableHead>ที่อยู่</TableHead>
                  <TableHead className="text-right">โครงการ</TableHead>
                  <TableHead className="text-right">รายได้</TableHead>
                  <TableHead className="text-right">เพิ่มเมื่อ</TableHead>
                  <TableHead className="text-center">จัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        <span>กำลังโหลด...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredCustomers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12">
                      <Users className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                      <p className="text-muted-foreground">ไม่พบข้อมูลลูกค้า</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCustomers.map((customer, index) => (
                    <motion.tr
                      key={customer.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <TableCell>
                        <Badge
                          variant={
                            customer.type === 'company' ? 'default' : 'secondary'
                          }
                          className="gap-1"
                        >
                          {customer.type === 'company' ? (
                            <Building2 className="w-3 h-3" />
                          ) : (
                            <User className="w-3 h-3" />
                          )}
                          {customer.type === 'company' ? 'บริษัท' : 'บุคคล'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p>{customer.name}</p>
                          {customer.contactPerson && (
                            <p className="text-sm text-muted-foreground">
                              {customer.contactPerson}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="w-3 h-3 text-muted-foreground" />
                            {customer.phone}
                          </div>
                          {customer.email && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Mail className="w-3 h-3" />
                              {customer.email}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-start gap-2 max-w-xs">
                          <MapPin className="w-3 h-3 text-muted-foreground mt-1 flex-shrink-0" />
                          <span className="text-sm line-clamp-2">
                            {customer.address}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {customer.totalProjects || 0}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(customer.totalRevenue || 0)}
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {formatDate(customer.createdAt)}
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
                              onClick={() => openEditDialog(customer)}
                              className="gap-2"
                            >
                              <Edit className="w-4 h-4" />
                              แก้ไข
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => openDeleteDialog(customer)}
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

        {/* Customers Cards - Mobile */}
        <div className="md:hidden space-y-4">
          {loading ? (
            <Card className="p-8">
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <span>กำลังโหลด...</span>
              </div>
            </Card>
          ) : filteredCustomers.length === 0 ? (
            <Card className="p-12">
              <div className="text-center">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">ไม่พบข้อมูลลูกค้า</p>
              </div>
            </Card>
          ) : (
            filteredCustomers.map((customer, index) => (
              <motion.div
                key={customer.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="p-4">
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge
                            variant={
                              customer.type === 'company' ? 'default' : 'secondary'
                            }
                            className="gap-1"
                          >
                            {customer.type === 'company' ? (
                              <Building2 className="w-3 h-3" />
                            ) : (
                              <User className="w-3 h-3" />
                            )}
                            {customer.type === 'company' ? 'บริษัท' : 'บุคคล'}
                          </Badge>
                        </div>
                        <h3 className="font-medium text-lg">{customer.name}</h3>
                        {customer.contactPerson && (
                          <p className="text-sm text-muted-foreground">
                            {customer.contactPerson}
                          </p>
                        )}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => openEditDialog(customer)}
                            className="gap-2"
                          >
                            <Edit className="w-4 h-4" />
                            แก้ไข
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => openDeleteDialog(customer)}
                            className="gap-2 text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                            ลบ
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <Separator />

                    {/* Contact Info */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <span>{customer.phone}</span>
                      </div>
                      {customer.email && (
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="w-4 h-4 text-muted-foreground" />
                          <span className="truncate">{customer.email}</span>
                        </div>
                      )}
                      <div className="flex items-start gap-2 text-sm">
                        <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <span className="line-clamp-2">{customer.address}</span>
                      </div>
                    </div>

                    <Separator />

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">
                          โครงการ
                        </div>
                        <div className="font-medium">{customer.totalProjects || 0}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">
                          รายได้
                        </div>
                        <div className="font-medium text-sm">
                          {formatCurrency(customer.totalRevenue || 0)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">
                          เพิ่มเมื่อ
                        </div>
                        <div className="font-medium text-sm">
                          {formatDate(customer.createdAt)}
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Add Customer Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>เพิ่มลูกค้าใหม่</DialogTitle>
            <DialogDescription>
              กรอกข้อมูลลูกค้าเพื่อเพิ่มเข้าระบบ
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>ประเภทลูกค้า *</Label>
              <Tabs
                value={formData.type}
                onValueChange={(v: any) => setFormData({ ...formData, type: v })}
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="individual">บุคคลธรรมดา</TabsTrigger>
                  <TabsTrigger value="company">นิติบุคคล</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>
                  ชื่อ{formData.type === 'company' ? 'บริษัท' : ''} *
                </Label>
                <Input
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder={
                    formData.type === 'company'
                      ? 'บริษัท ABC จำกัด'
                      : 'คุณสมชาย ใจดี'
                  }
                />
              </div>
              {formData.type === 'company' && (
                <div>
                  <Label>ผู้ติดต่อ</Label>
                  <Input
                    value={formData.contactPerson}
                    onChange={e =>
                      setFormData({ ...formData, contactPerson: e.target.value })
                    }
                    placeholder="คุณสมหญิง ผู้จัดการ"
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>เบอร์โทรศัพท์ *</Label>
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
                  placeholder="example@email.com"
                />
              </div>
            </div>

            <div>
              <Label>ที่อยู่</Label>
              <Textarea
                value={formData.address}
                onChange={e => setFormData({ ...formData, address: e.target.value })}
                placeholder="123 ถนนสุขุมวิท แขวงคลองเตย เขตคลองเตย กรุงเทพฯ 10110"
                rows={3}
              />
            </div>

            {formData.type === 'company' && (
              <div>
                <Label>เลขประจำตัวผู้เสียภาษี</Label>
                <Input
                  value={formData.taxId}
                  onChange={e => setFormData({ ...formData, taxId: e.target.value })}
                  placeholder="0-1234-56789-01-2"
                />
              </div>
            )}

            <div>
              <Label>หมายเหตุ</Label>
              <Textarea
                value={formData.notes}
                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                placeholder="บันทึกเพิ่มเติมเกี่ยวกับลูกค้า"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              ยกเลิก
            </Button>
            <Button onClick={handleAdd}>เพิ่มลูกค้า</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Customer Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>แก้ไขข้อมูลลูกค้า</DialogTitle>
            <DialogDescription>
              แก้ไขข้อมูลลูกค้า {selectedCustomer?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>ประเภทลูกค้า *</Label>
              <Tabs
                value={formData.type}
                onValueChange={(v: any) => setFormData({ ...formData, type: v })}
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="individual">บุคคลธรรมดา</TabsTrigger>
                  <TabsTrigger value="company">นิติบุคคล</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>
                  ชื่อ{formData.type === 'company' ? 'บริษัท' : ''} *
                </Label>
                <Input
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              {formData.type === 'company' && (
                <div>
                  <Label>ผู้ติดต่อ</Label>
                  <Input
                    value={formData.contactPerson}
                    onChange={e =>
                      setFormData({ ...formData, contactPerson: e.target.value })
                    }
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>เบอร์โทรศัพท์ *</Label>
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
                rows={3}
              />
            </div>

            {formData.type === 'company' && (
              <div>
                <Label>เลขประจำตัวผู้เสียภาษี</Label>
                <Input
                  value={formData.taxId}
                  onChange={e => setFormData({ ...formData, taxId: e.target.value })}
                />
              </div>
            )}

            <div>
              <Label>หมายเหตุ</Label>
              <Textarea
                value={formData.notes}
                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              ยกเลิก
            </Button>
            <Button onClick={handleEdit}>บันทึกการแก้ไข</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ยืนยันการลบ</DialogTitle>
            <DialogDescription>
              คุณต้องการลบลูกค้า "{selectedCustomer?.name}" ใช่หรือไม่?
              การดำเนินการนี้ไม่สามารถย้อนกลับได้
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              ยกเลิก
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              ลบลูกค้า
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
