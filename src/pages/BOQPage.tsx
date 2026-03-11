import { useState, useEffect } from "react";
import { AddItemDialogEnhanced } from "../components/AddItemDialogEnhanced";
import { BOQTableGrouped } from "../components/BOQTableGrouped";
import { ProfileEditor } from "../components/ProfileEditor";
import { BOQSummary } from "../components/BOQSummary";
import { SmartBOQDialog } from "../components/SmartBOQDialog";
import { catalog } from "../data/catalog";
import { catalogPatch } from "../data/catalogPatch";
import { templateMetadata } from "../data/boqTemplates";

// รวม catalog หลัก + patch เข้าด้วยกัน
const fullCatalog = [...catalog, ...catalogPatch];
import { TemplateDialogEnhanced } from "../components/TemplateDialogEnhanced";
import { TemplateMetadata } from "../types/template";
import { BOQItem, Profile, CompanyInfo, CustomerInfo, ProjectSettings } from "../types/boq";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Button } from "../components/ui/button";
import { 
  Building2, 
  User, 
  MapPin, 
  ArrowRight, 
  FileText, 
  Search, 
  Users, 
  Tag, 
  FileStack,
  Sparkles,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import { Separator } from "../components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Badge } from "../components/ui/badge";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../components/ui/popover";
import { projectId } from "../utils/supabase/info";
import { calculateBOQSummary } from "../utils/calculations";
import { ScrollArea } from "../components/ui/scroll-area";
import { api } from "../utils/api";

interface BOQPageProps {
  boqItems: BOQItem[];
  setBoqItems: (items: BOQItem[]) => void;
  profile: Profile;
  setProfile: (profile: Profile) => void;
  projectTitle: string;
  setProjectTitle: (title: string) => void;
  projectDescription: string;
  setProjectDescription: (desc: string) => void;
  projectLocation: string;
  setProjectLocation: (loc: string) => void;
  company: CompanyInfo;
  customer: CustomerInfo;
  setCustomer: (customer: CustomerInfo) => void;
  settings: ProjectSettings;
  onNext: () => void;
  userId?: string;
  
  // Partner support
  recipientType: 'customer' | 'partner';
  setRecipientType: (type: 'customer' | 'partner') => void;
  selectedPartner: any;
  setSelectedPartner: (partner: any) => void;
  mainProjectTag: string;
  setMainProjectTag: (tag: string) => void;
}

export function BOQPage({
  boqItems,
  setBoqItems,
  profile,
  setProfile,
  projectTitle,
  setProjectTitle,
  projectDescription,
  setProjectDescription,
  projectLocation,
  setProjectLocation,
  company,
  customer,
  setCustomer,
  settings,
  onNext,
  userId,
  recipientType,
  setRecipientType,
  selectedPartner,
  setSelectedPartner,
  mainProjectTag,
  setMainProjectTag,
}: BOQPageProps) {
  const [customers, setCustomers] = useState<CustomerInfo[]>([]);
  const [partners, setPartners] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [isCustomerPopoverOpen, setIsCustomerPopoverOpen] = useState(false);
  const [isPartnerPopoverOpen, setIsPartnerPopoverOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [isSmartBOQDialogOpen, setIsSmartBOQDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Customer inline editing states
  const [isEditingCustomer, setIsEditingCustomer] = useState(false);
  const [editCustomerName, setEditCustomerName] = useState('');
  const [editCustomerAddress, setEditCustomerAddress] = useState('');
  const [editCustomerPhone, setEditCustomerPhone] = useState('');
  
  // Partner inline editing states
  const [isEditingPartner, setIsEditingPartner] = useState(false);
  const [editPartnerName, setEditPartnerName] = useState('');
  const [editPartnerType, setEditPartnerType] = useState('');
  const [editPartnerPhone, setEditPartnerPhone] = useState('');

  useEffect(() => {
    loadCustomers();
    loadPartners();
    loadProjects();
    if (userId) {
      loadUserProfile();
    }
  }, [userId]);

  const loadUserProfile = async () => {
    if (!userId) return;
    
    try {
      // ✅ Use new /profile endpoint (no userId param needed)
      const data = await api.get(`/profile`);
      
      // 🔒 Check if data is valid and has profile (not an error response)
      if (!data || data.error) {
        console.log('⚠️ No profile data available:', data?.error || 'Unknown error');
        return;
      }
      
      if (data.profile) {
        setUserProfile(data.profile);
      }
    } catch (error) {
      console.error("Failed to load user profile:", error);
    }
  };

  const loadCustomers = async () => {
    try {
      // ✅ Use api.get to include X-User-Id header
      const data = await api.get('/customers');
      setCustomers(data.customers || []);
    } catch (error) {
      console.error("Failed to load customers:", error);
    }
  };

  const loadPartners = async () => {
    try {
      // ✅ Use api.get to include X-User-Id header
      const data = await api.get('/partners');
      setPartners(data.partners || []);
    } catch (error) {
      console.error("Failed to load partners:", error);
    }
  };

  const loadProjects = async () => {
    try {
      // ⚡ NUCLEAR MODE: Try cache first, if miss just return empty (no slow query!)
      console.log('📊 Loading projects from cache...');
      const data = await api.get('/documents?type=quotation&limit=50').catch(err => {
        console.log('⚠️ Projects cache miss, skipping load (will populate on next save)');
        return null;
      });

      if (data?.documents) {
        const uniqueProjects = Array.from(
          new Set((data.documents || []).map((d: any) => d.projectTitle))
        ).filter(Boolean);
        setProjects(uniqueProjects.map((title, idx) => ({ id: `proj-${idx}`, title })));
        console.log(`✅ Loaded ${uniqueProjects.length} projects from cache`);
      } else {
        // No cache, just use empty - fast!
        setProjects([]);
        console.log('✅ No cached projects, starting with empty list');
      }
    } catch (error) {
      console.error("Failed to load projects:", error);
      setProjects([]); // Fail gracefully with empty list
    }
  };

  const handleSelectCustomer = (selectedCustomer: CustomerInfo) => {
    setCustomer(selectedCustomer);
    setIsCustomerPopoverOpen(false);
    setIsEditingCustomer(false);
    setEditCustomerName(selectedCustomer.name);
    setEditCustomerAddress(selectedCustomer.address);
    setEditCustomerPhone(selectedCustomer.phone);
    toast.success("เลือกลูกค้าเรียบร้อย!", {
      description: selectedCustomer.name,
    });
  };
  
  const handleSaveCustomer = async () => {
    if (!editCustomerName || !editCustomerName.trim()) {
      toast.error("กรุณากรอกชื่อลูกค้า");
      return;
    }
    
    try {
      // Check if customer exists
      const existingCustomer = customers.find(c => 
        c.name === editCustomerName && 
        c.phone === (editCustomerPhone || '')
      );
      
      if (existingCustomer) {
        // Use existing customer
        setCustomer(existingCustomer);
        setIsEditingCustomer(false);
        toast.success("ใช้ข้อมูลลูกค้าที่มีอยู่แล้ว");
        return;
      }
      
      // Save new customer to database
      const newCustomerData: any = {
        id: `customer-${Date.now()}`,
        name: editCustomerName.trim(),
      };
      
      // Only include optional fields if they have values
      if (editCustomerPhone && editCustomerPhone.trim()) newCustomerData.phone = editCustomerPhone.trim();
      if (editCustomerAddress && editCustomerAddress.trim()) newCustomerData.address = editCustomerAddress.trim();
      
      // ✅ Use api.post to include X-User-Id header
      const data = await api.post('/customers', newCustomerData);
      
      if (data && data.customer) {
        const savedCustomer = data.customer;
        
        // Update local state
        setCustomers([...customers, savedCustomer]);
        setCustomer(savedCustomer);
        setIsEditingCustomer(false);
        
        toast.success("บันทึกข้อมูลลูกค้าเรียบร้อย!", {
          description: "ลูกค้าถูกเพิ่มในระบบจัดการลูกค้าแล้ว",
        });
      } else {
        toast.error("ไม่สามารถบันทึกข้อมูลลูกค้าได้");
      }
    } catch (error) {
      console.error("Failed to save customer:", error);
      // Still allow to continue with the data
      setCustomer({
        id: `temp-${Date.now()}`,
        name: editCustomerName?.trim() || '',
        address: editCustomerAddress?.trim() || '',
        phone: editCustomerPhone?.trim() || '',
        email: '',
        taxId: '',
        type: 'individual',
      });
      setIsEditingCustomer(false);
      toast.warning("บันทึกข้อมูลชั่วคราว", {
        description: "จะบันทึกในระบบเมื่อสร้างเอกสาร",
      });
    }
  };
  
  const handleStartEditingCustomer = () => {
    setIsEditingCustomer(true);
    setEditCustomerName(customer?.name || '');
    setEditCustomerAddress(customer?.address || '');
    setEditCustomerPhone(customer?.phone || '');
  };

  const handleSelectPartner = (partner: any) => {
    setSelectedPartner(partner);
    setIsPartnerPopoverOpen(false);
    toast.success("เลือกพาร์ทเนอร์เรียบร้อย!", {
      description: partner.name,
    });
  };
  
  const handleSavePartner = async () => {
    if (!editPartnerName || !editPartnerName.trim()) {
      toast.error("กรุณากรอกชื่อพาร์ทเนอร์");
      return;
    }
    
    try {
      // Check if partner exists
      const existingPartner = partners.find(p => 
        p.name === editPartnerName && 
        p.phone === (editPartnerPhone || '')
      );
      
      if (existingPartner) {
        // Use existing partner
        setSelectedPartner(existingPartner);
        setIsEditingPartner(false);
        toast.success("ใช้ข้อมูลพาร์ทเนอร์ที่มีอยู่แล้ว");
        return;
      }
      
      // Create new partner
      const newPartnerData: any = {
        id: `partner-${Date.now()}`,
        name: editPartnerName.trim(),
      };
      
      // Only include optional fields if they have values
      if (editPartnerPhone && editPartnerPhone.trim()) newPartnerData.phone = editPartnerPhone.trim();
      
      // ✅ Use api.post instead of direct fetch to include X-User-Id header
      const newPartner = await api.post('/partners', newPartnerData);
      
      setSelectedPartner(newPartner);
      setIsEditingPartner(false);
      
      // Reload partners list
      await loadPartners();
      
      toast.success("บันทึกข้อมูลพาร์ทเนอร์สำเร็จ!", {
        description: `${editPartnerName || 'ไม่ระบุชื่อ'}`,
      });
    } catch (error) {
      console.error('Error saving partner:', error);
      toast.error("เกิดข้อผิดพลาดในการบันทึกพาร์ทเนอร์");
    }
  };
  
  const handleStartEditingPartner = () => {
    setIsEditingPartner(true);
    if (selectedPartner) {
      setEditPartnerName(selectedPartner?.name || '');
      setEditPartnerType(selectedPartner?.type || '');
      setEditPartnerPhone(selectedPartner?.phone || '');
    } else {
      setEditPartnerName('');
      setEditPartnerType('');
      setEditPartnerPhone('');
    }
  };

  const handleAddItem = (
    name: string,
    category: string,
    subcategory: string,
    unit: string,
    material: number,
    labor: number,
    quantity: number,
    notes?: string
  ) => {
    const newItem: BOQItem = {
      id: `boq-${Date.now()}-${Math.random()}`,
      name,
      category,
      subcategory,
      unit,
      material,
      labor,
      quantity,
      notes,
    };
    setBoqItems([...boqItems, newItem]);
    toast.success("เพิ่มรายการสำเร็จ", {
      description: `${name} จำนวน ${quantity} ${unit}`,
    });
  };

  const handleAddMultipleItems = (items: Omit<BOQItem, "id">[]) => {
    const newItems: BOQItem[] = items.map((item, index) => ({
      ...item,
      id: `boq-${Date.now()}-${index}-${Math.random()}`,
    }));
    setBoqItems([...boqItems, ...newItems]);
    toast.success("เพิ่มรายการห้องสำเร็จ!", {
      description: `เพิ่ม ${items.length} รายการเข้า BOQ แล้ว`,
    });
  };

  const handleUpdateItem = (id: string, updates: Partial<BOQItem>) => {
    setBoqItems(boqItems.map(item => 
      item.id === id ? { ...item, ...updates } : item
    ));
  };

  const handleRemove = (id: string) => {
    setBoqItems(boqItems.filter(item => item.id !== id));
    toast.success("ลบรายการแล้ว");
  };

  const summary = calculateBOQSummary(boqItems, profile, null);

  const handleConfirm = async () => {
    if (boqItems.length === 0) {
      toast.error("กรุณาเพิ่มรายการอย่างน้อย 1 รายการ");
      return;
    }
    if (!projectTitle.trim()) {
      toast.error("กรุณากรอกชื่อโครงการ");
      return;
    }
    
    setIsSaving(true);
    toast.loading("กำลังบันทึก BOQ...", { id: "saving-boq" });
    
    try {
      await onNext();
      toast.success("BOQ บันทึกเสร็จสมบูรณ์!", { id: "saving-boq" });
    } catch (error) {
      console.error("Failed to save BOQ:", error);
      toast.error("เกิดข้อผิดพลาดในการบันทึก กรุณาลองอีกครั้ง", { id: "saving-boq" });
      setIsSaving(false);
    }
  };

  const handleSelectTemplate = (template: TemplateMetadata) => {
    const newItems = template.items.map(item => ({
      ...item,
      id: `boq-${Date.now()}-${Math.random()}`,
    }));
    
    // เพิ่มรายการใหม่ต่อจากรายการเดิม (ไม่แทนที่)
    setBoqItems([...boqItems, ...newItems]);
    
    // อัพเดท title และ description เฉพาะถ้ายังว่างอยู่
    if (!projectTitle) {
      setProjectTitle(template.name);
    }
    if (!projectDescription) {
      setProjectDescription(template.description);
    }
    
    toast.success("เพิ่ม Template สำเร็จ!", {
      description: `${template.name} - เพิ่ม ${newItems.length} รายการ`,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Modern Header */}
      <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-600 text-white shadow-2xl">
        <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="flex items-start sm:items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-md">
                <FileText className="h-7 w-7 sm:h-8 sm:w-8" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl mb-1">BOQ - Bill of Quantities</h1>
                <p className="text-sm sm:text-base text-blue-100">
                  ระบบจัดทำรายการถอดวัสดุก่อสร้าง • EZBOQ.COM
                </p>
              </div>
            </div>
            <Badge className="bg-white text-blue-600 hover:bg-white px-3 py-1.5 text-sm">
              Step 1/4
            </Badge>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Info Cards Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Company Info */}
          <Card className="p-5 bg-white/90 backdrop-blur-sm shadow-lg border-2 hover:shadow-xl transition-shadow">
            <div className="flex items-center gap-3 mb-4 pb-3 border-b">
              <div className="p-2.5 bg-blue-100 rounded-lg">
                <Building2 className="h-5 w-5 text-blue-600" />
              </div>
              <h3 className="text-lg">ข้อมูลผู้เสนอราคา</h3>
            </div>
            
            {settings.showLogo && (
              <div className="mb-4 flex justify-center">
                {userProfile?.company?.logoUrl ? (
                  <img 
                    src={userProfile.company.logoUrl} 
                    alt="Company Logo" 
                    className="h-20 w-auto object-contain rounded-lg shadow-sm"
                  />
                ) : userProfile?.avatarUrl ? (
                  <img 
                    src={userProfile.avatarUrl} 
                    alt="Avatar" 
                    className="h-20 w-20 rounded-full object-cover shadow-md border-4 border-blue-100"
                  />
                ) : (
                  <div className="h-20 w-20 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white shadow-md">
                    <Building2 className="h-10 w-10" />
                  </div>
                )}
              </div>
            )}
            
            <div className="space-y-2.5 text-sm">
              <div className="grid grid-cols-[100px_1fr] gap-2">
                <span className="text-muted-foreground">ผู้เสนอ:</span>
                <span className="font-medium">{userProfile?.proposerName || company.name}</span>
              </div>
              
              {userProfile?.company?.name && (
                <div className="grid grid-cols-[100px_1fr] gap-2">
                  <span className="text-muted-foreground">บริษัท:</span>
                  <span>{userProfile.company.name}</span>
                </div>
              )}
              
              <div className="grid grid-cols-[100px_1fr] gap-2">
                <span className="text-muted-foreground">ที่อยู่:</span>
                <span className="text-sm">{userProfile?.company?.address || company.address}</span>
              </div>
              
              {userProfile?.company?.taxId && (
                <div className="grid grid-cols-[100px_1fr] gap-2">
                  <span className="text-muted-foreground">เลขภาษี:</span>
                  <span>{userProfile.company.taxId}</span>
                </div>
              )}
              
              <div className="grid grid-cols-[100px_1fr] gap-2">
                <span className="text-muted-foreground">โทร:</span>
                <span>{userProfile?.company?.phone || company.phone}</span>
              </div>
              
              <div className="grid grid-cols-[100px_1fr] gap-2">
                <span className="text-muted-foreground">อีเมล:</span>
                <span className="text-sm">{userProfile?.company?.email || company.email}</span>
              </div>
            </div>
          </Card>

          {/* Customer/Partner Info */}
          <Card className="p-5 bg-white/90 backdrop-blur-sm shadow-lg border-2 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-4 pb-3 border-b">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-100 rounded-lg">
                  {recipientType === 'customer' ? (
                    <User className="h-5 w-5 text-indigo-600" />
                  ) : (
                    <Users className="h-5 w-5 text-purple-600" />
                  )}
                </div>
                <h3 className="text-lg">
                  {recipientType === 'customer' ? 'ข้อมูลลูกค้า' : 'ข้อมูลพาร์ทเนอร์'}
                </h3>
              </div>
            </div>
            
            <Tabs value={recipientType} onValueChange={(v: any) => setRecipientType(v)} className="mb-4">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="customer" className="gap-2">
                  <User className="w-4 h-4" />
                  ลูกค้า
                </TabsTrigger>
                <TabsTrigger value="partner" className="gap-2">
                  <Users className="w-4 h-4" />
                  พาร์ทเนอร์
                </TabsTrigger>
              </TabsList>

              <TabsContent value="customer" className="space-y-3">
                <Popover open={isCustomerPopoverOpen} onOpenChange={setIsCustomerPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full gap-2 border-2">
                      <Search className="w-4 h-4" />
                      เลือกลูกค้า
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0" align="end">
                    <Command>
                      <CommandInput placeholder="ค้นหาลูกค้า..." />
                      <CommandList>
                        <CommandEmpty>ไม่พบลูกค้า</CommandEmpty>
                        <CommandGroup>
                          {customers.map((cust) => (
                            <CommandItem
                              key={cust.id}
                              onSelect={() => handleSelectCustomer(cust)}
                              className="cursor-pointer"
                            >
                              <div className="flex flex-col">
                                <span>{cust.name}</span>
                                <span className="text-xs text-muted-foreground">
                                  {cust.phone}
                                </span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                
                {!isEditingCustomer ? (
                  <div className="space-y-2.5">
                    <div className="space-y-2.5 text-sm">
                      <div className="grid grid-cols-[100px_1fr] gap-2">
                        <span className="text-muted-foreground">ชื่อ:</span>
                        <span className="font-medium">{customer.name}</span>
                      </div>
                      <div className="grid grid-cols-[100px_1fr] gap-2">
                        <span className="text-muted-foreground">ที่อยู่:</span>
                        <span className="text-sm">{customer.address}</span>
                      </div>
                      <div className="grid grid-cols-[100px_1fr] gap-2">
                        <span className="text-muted-foreground">โทร:</span>
                        <span>{customer.phone}</span>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full gap-2 mt-2"
                      onClick={handleStartEditingCustomer}
                    >
                      <FileText className="w-4 h-4" />
                      แก้ไข / กรอกข้อมูลใหม่
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="customerName" className="text-sm">ชื่อ-นามสกุล *</Label>
                      <Input
                        id="customerName"
                        value={editCustomerName || ''}
                        onChange={(e) => setEditCustomerName(e.target.value)}
                        placeholder="ระบุชื่อลูกค้า..."
                        className="bg-white border-2"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="customerAddress" className="text-sm">ที่อยู่</Label>
                      <Textarea
                        id="customerAddress"
                        value={editCustomerAddress || ''}
                        onChange={(e) => setEditCustomerAddress(e.target.value)}
                        placeholder="ระบุที่อยู่ลูกค้า..."
                        rows={2}
                        className="bg-white border-2"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="customerPhone" className="text-sm">เบอร์โทร</Label>
                      <Input
                        id="customerPhone"
                        value={editCustomerPhone || ''}
                        onChange={(e) => setEditCustomerPhone(e.target.value)}
                        placeholder="ระบุเบอร์โทรศัพท์..."
                        className="bg-white border-2"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => setIsEditingCustomer(false)}
                      >
                        ยกเลิก
                      </Button>
                      <Button 
                        size="sm" 
                        className="flex-1 gap-2"
                        onClick={handleSaveCustomer}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        บันทึก
                      </Button>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="partner" className="space-y-3">
                <Popover open={isPartnerPopoverOpen} onOpenChange={setIsPartnerPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full gap-2 border-2">
                      <Search className="w-4 h-4" />
                      เลือกพาร์ทเนอร์
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0" align="end">
                    <Command>
                      <CommandInput placeholder="ค้นหาพาร์ทเนอร์..." />
                      <CommandList>
                        <CommandEmpty>ไม่พบพาร์ทเนอร์</CommandEmpty>
                        <CommandGroup>
                          {partners.map((partner) => (
                            <CommandItem
                              key={partner.id}
                              onSelect={() => handleSelectPartner(partner)}
                              className="cursor-pointer"
                            >
                              <div className="flex flex-col">
                                <span>{partner.name}</span>
                                <span className="text-xs text-muted-foreground">
                                  {partner.phone}
                                </span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                
                {!isEditingPartner ? (
                  selectedPartner ? (
                    <div className="space-y-2.5">
                      <div className="space-y-2.5 text-sm">
                        <div className="grid grid-cols-[100px_1fr] gap-2">
                          <span className="text-muted-foreground">ชื่อ:</span>
                          <span className="font-medium">{selectedPartner.name}</span>
                        </div>
                        <div className="grid grid-cols-[100px_1fr] gap-2">
                          <span className="text-muted-foreground">ประเภท:</span>
                          <Badge variant="secondary" className="w-fit">
                            {selectedPartner.type}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-[100px_1fr] gap-2">
                          <span className="text-muted-foreground">โทร:</span>
                          <span>{selectedPartner.phone}</span>
                        </div>
                      </div>
                      
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full gap-2 mt-2"
                        onClick={handleStartEditingPartner}
                      >
                        <FileText className="w-4 h-4" />
                        แก้ไข / กรอกข้อมูลใหม่
                      </Button>
                      
                      <div className="pt-3 border-t">
                        <Label htmlFor="mainProjectTag" className="text-xs flex items-center gap-2 mb-2">
                          <Tag className="w-4 h-4 text-purple-600" />
                          <span>Tag โครงการหลัก</span>
                        </Label>
                        <Input
                          id="mainProjectTag"
                          value={mainProjectTag}
                          onChange={(e) => setMainProjectTag(e.target.value)}
                          placeholder="เช่น โครงการบ้านคุณสมชาย"
                          className="bg-white text-sm border-2"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          ใช้เพื่อจัดกลุ่ม BOQ ตามโครงการ
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-30 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground mb-3">กรุณาเลือกพาร์ทเนอร์</p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="gap-2"
                        onClick={handleStartEditingPartner}
                      >
                        <FileText className="w-4 h-4" />
                        กรอกข้อมูลพาร์ทเนอร์ใหม่
                      </Button>
                    </div>
                  )
                ) : (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="partnerName" className="text-sm">ชื่อพาร์ทเนอร์ *</Label>
                      <Input
                        id="partnerName"
                        value={editPartnerName || ''}
                        onChange={(e) => setEditPartnerName(e.target.value)}
                        placeholder="ระบุชื่อพาร์ทเนอร์..."
                        className="bg-white border-2"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="partnerType" className="text-sm">ประเภท</Label>
                      <Input
                        id="partnerType"
                        value={editPartnerType || ''}
                        onChange={(e) => setEditPartnerType(e.target.value)}
                        placeholder="เช่น ผู้รับเหมา, ช่าง, ซัพพลายเออร์"
                        className="bg-white border-2"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="partnerPhone" className="text-sm">เบอร์โทร</Label>
                      <Input
                        id="partnerPhone"
                        value={editPartnerPhone || ''}
                        onChange={(e) => setEditPartnerPhone(e.target.value)}
                        placeholder="ระบุเบอร์โทรศัพท์..."
                        className="bg-white border-2"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => setIsEditingPartner(false)}
                      >
                        ยกเลิก
                      </Button>
                      <Button 
                        size="sm" 
                        className="flex-1 gap-2"
                        onClick={handleSavePartner}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        บันทึก
                      </Button>
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </Card>
        </div>

        {/* Project Info */}
        <Card className="p-5 bg-white/90 backdrop-blur-sm shadow-lg border-2">
          <div className="flex items-center gap-3 mb-4 pb-3 border-b">
            <div className="p-2.5 bg-purple-100 rounded-lg">
              <MapPin className="h-5 w-5 text-purple-600" />
            </div>
            <h3 className="text-lg">รายละเอียดโครงการ</h3>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="projectTitle" className="text-sm">
                ชื่อโครงการ <span className="text-red-500">*</span>
              </Label>
              <Input
                id="projectTitle"
                value={projectTitle}
                onChange={(e) => setProjectTitle(e.target.value)}
                placeholder="ระบุชื่อโครงการ..."
                className="bg-white border-2"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="projectLocation" className="text-sm">สถานที่</Label>
              <Input
                id="projectLocation"
                value={projectLocation}
                onChange={(e) => setProjectLocation(e.target.value)}
                placeholder="ระบุสถานที่โครงการ..."
                className="bg-white border-2"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="projectDescription" className="text-sm">รายละเอียด</Label>
              <Textarea
                id="projectDescription"
                value={projectDescription}
                onChange={(e) => setProjectDescription(e.target.value)}
                placeholder="รายละเอียดโครงการ..."
                rows={2}
                className="bg-white border-2"
              />
            </div>
          </div>
        </Card>

        <Separator />

        {/* Items Section */}
        <div className="space-y-4">
          {/* Header with Actions */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white/90 backdrop-blur-sm p-4 rounded-lg shadow-md border-2">
            <div>
              <h2 className="text-xl flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-blue-600" />
                รายการวัสดุและค่าใช้จ่าย
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {boqItems.length > 0 ? (
                  <>รายการทั้งหมด <Badge variant="secondary">{boqItems.length}</Badge> รายการ</>
                ) : (
                  "เริ่มต้นโดยเลือก Template หรือเพิ่มรายการใหม่"
                )}
              </p>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              {/* SmartBOQ Button - AI Auto-generate */}
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-2 flex-1 sm:flex-none border-2 border-purple-300 bg-gradient-to-r from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100"
                onClick={() => setIsSmartBOQDialogOpen(true)}
              >
                <Sparkles className="w-4 h-4 text-purple-600" />
                <span className="hidden sm:inline bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent font-medium">SmartBOQ</span>
                <span className="sm:hidden bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent font-medium">Smart</span>
              </Button>
              
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-2 flex-1 sm:flex-none border-2"
                onClick={() => setIsTemplateDialogOpen(true)}
              >
                <FileStack className="w-4 h-4" />
                <span className="hidden sm:inline">เลือก Template</span>
                <span className="sm:hidden">Template</span>
              </Button>
              
              <AddItemDialogEnhanced 
                catalog={fullCatalog} 
                onAdd={handleAddItem}
                onAddMultiple={handleAddMultipleItems}
              />
            </div>
          </div>

          <TemplateDialogEnhanced
            open={isTemplateDialogOpen}
            onOpenChange={setIsTemplateDialogOpen}
            onSelectTemplate={handleSelectTemplate}
            currentBOQItems={boqItems}
          />

          <SmartBOQDialog
            open={isSmartBOQDialogOpen}
            onOpenChange={setIsSmartBOQDialogOpen}
            onGenerate={(items) => {
              setBoqItems([...boqItems, ...items]);
              toast.success(`เพิ่มรายการ SmartBOQ ${items.length} รายาร`);
            }}
          />

          {/* Items Table */}
          <BOQTableGrouped
            items={boqItems}
            onUpdate={handleUpdateItem}
            onRemove={handleRemove}
          />

          {/* Summary & Profile */}
          {boqItems.length > 0 && (
            <>
              <Separator />
              <div className="grid gap-4 lg:grid-cols-3">
                <div className="lg:col-span-2">
                  <ProfileEditor profile={profile} onUpdate={setProfile} />
                </div>
                <BOQSummary summary={summary} />
              </div>
            </>
          )}
        </div>

        {/* Confirm Button */}
        <div className="sticky bottom-4 z-10">
          <Card className="p-4 bg-white/95 backdrop-blur-md shadow-2xl border-2 border-blue-200">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-sm text-muted-foreground text-center sm:text-left">
                {boqItems.length === 0 ? (
                  <div className="flex items-center gap-2 text-amber-600">
                    <AlertCircle className="h-4 w-4" />
                    <span>กรุณาเพิ่มรายการอย่างน้อย 1 รายการ</span>
                  </div>
                ) : !projectTitle.trim() ? (
                  <div className="flex items-center gap-2 text-amber-600">
                    <AlertCircle className="h-4 w-4" />
                    <span>กรุณากรอกชื่อโครงการ</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>พร้อมดำเนินการต่อ</span>
                  </div>
                )}
              </div>
              
              <Button
                onClick={handleConfirm}
                size="lg"
                className="w-full sm:w-auto gap-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 px-8 shadow-xl hover:shadow-2xl transition-all disabled:opacity-50"
                disabled={boqItems.length === 0 || !projectTitle.trim() || isSaving}
              >
                {isSaving ? (
                  <>
                    <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>กำลังบันทึก...</span>
                  </>
                ) : (
                  <>
                    <span>ยืนยัน BOQ และดำเนินการต่อ</span>
                    <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}