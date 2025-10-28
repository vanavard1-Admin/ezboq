import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { AddItemDialogEnhanced } from "../components/AddItemDialogEnhanced";
import { BOQTableGrouped } from "../components/BOQTableGrouped";
import { ProfileEditor } from "../components/ProfileEditor";
import { BOQSummary } from "../components/BOQSummary";
import { catalog } from "../data/catalog";
import { BOQItem, Profile, CompanyInfo, CustomerInfo, ProjectSettings, BOQSummary as BOQSummaryType } from "../types/boq";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Button } from "../components/ui/button";
import { Building2, User, MapPin, ArrowRight, FileText, Search, Users, Tag } from "lucide-react";
import { toast } from "sonner@2.0.3";
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
import { projectId, publicAnonKey } from "../utils/supabase/info";
import { calculateBOQSummary } from "../utils/calculations";

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
  
  // Partner support - SEND BACK TO PARENT
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
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-6e95bca3/profile/${userId}`,
        {
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.profile) {
          setUserProfile(data.profile);
        }
      }
    } catch (error) {
      console.error("Failed to load user profile:", error);
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
      console.error("Failed to load customers:", error);
    }
  };

  const loadPartners = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-6e95bca3/partners`,
        {
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setPartners(data.partners || []);
      }
    } catch (error) {
      console.error("Failed to load partners:", error);
    }
  };

  const loadProjects = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-6e95bca3/documents?type=quotation`,
        {
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        // Get unique project titles for tagging
        const uniqueProjects = Array.from(
          new Set((data.documents || []).map((d: any) => d.projectTitle))
        ).filter(Boolean);
        setProjects(uniqueProjects.map((title, idx) => ({ id: `proj-${idx}`, title })));
      }
    } catch (error) {
      console.error("Failed to load projects:", error);
    }
  };

  const handleSelectCustomer = (selectedCustomer: CustomerInfo) => {
    setCustomer(selectedCustomer);
    setIsCustomerPopoverOpen(false);
    toast.success("เลือกลูกค้าเรียบร้อย!", {
      description: selectedCustomer.name,
    });
  };

  const handleSelectPartner = (partner: any) => {
    setSelectedPartner(partner);
    setIsPartnerPopoverOpen(false);
    toast.success("เลือกพาร์ทเนอร์เรียบร้อย!", {
      description: partner.name,
    });
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

  const handleConfirm = () => {
    if (boqItems.length === 0) {
      toast.error("กรุณาเพิ่มรายการอย่างน้อย 1 รายการ");
      return;
    }
    if (!projectTitle.trim()) {
      toast.error("กรุณากรอกชื่อโครงการ");
      return;
    }
    toast.success("BOQ เสร็จสมบูรณ์");
    onNext();
  };

  return (
    <motion.div 
      className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 pb-20"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Page Header */}
      <motion.div
        className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 sm:p-6 md:p-8 shadow-xl"
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="container mx-auto">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 mb-3">
            <motion.div
              className="p-2 sm:p-3 bg-white/20 rounded-lg backdrop-blur-sm"
              whileHover={{ rotate: 360 }}
              transition={{ duration: 0.6 }}
            >
              <FileText className="h-6 w-6 sm:h-8 sm:w-8" />
            </motion.div>
            <div className="flex-1">
              <h1 className="text-xl sm:text-2xl md:text-3xl mb-1">BOQ - รายการวัสดุและรายละเอียด</h1>
              <p className="text-sm sm:text-base text-blue-100">ขั้นตอนที่ 1: กรอกรายการวัสดุและข้อมูลโครงการ</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
            <div className="px-2 sm:px-3 py-1 bg-white/20 rounded-full backdrop-blur-sm whitespace-nowrap">
              Step 1 of 4
            </div>
            <span className="opacity-75 hidden xs:inline">→</span>
            <span className="opacity-75">ใบเสนอราคา</span>
            <span className="opacity-75 hidden xs:inline">→</span>
            <span className="opacity-75 hidden sm:inline">ใบวางบิล</span>
            <span className="opacity-75 hidden sm:inline">→</span>
            <span className="opacity-75 hidden sm:inline">ใบเสร็จ</span>
          </div>
        </div>
      </motion.div>

      <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <motion.div 
          id="boq-content"
          className="grid gap-4 sm:gap-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          {/* Company & Customer Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              <Card className="p-4 sm:p-6 bg-white/80 backdrop-blur-sm shadow-lg border-blue-100 hover:shadow-xl transition-shadow">
                <div className="flex items-center gap-2 mb-3 sm:mb-4">
                  <div className="p-2 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-lg">
                    <Building2 className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                  </div>
                  <h3 className="text-sm sm:text-base bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    ข้อมูลผู้เสนอราคา
                  </h3>
                </div>
                
                {/* Show Logo/Avatar if available */}
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
                
                <div className="space-y-2 text-xs sm:text-sm">
                  <div className="grid grid-cols-[80px_1fr] sm:grid-cols-[100px_1fr] gap-2">
                    <span className="text-muted-foreground">ผู้เสนอ:</span>
                    <span className="break-words">{userProfile?.proposerName || company.name}</span>
                  </div>
                  
                  {userProfile?.company?.name && (
                    <div className="grid grid-cols-[80px_1fr] sm:grid-cols-[100px_1fr] gap-2">
                      <span className="text-muted-foreground">บริษัท:</span>
                      <span className="break-words">{userProfile.company.name}</span>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-[80px_1fr] sm:grid-cols-[100px_1fr] gap-2">
                    <span className="text-muted-foreground">ที่อยู่:</span>
                    <span className="break-words">{userProfile?.company?.address || company.address}</span>
                  </div>
                  
                  {userProfile?.company?.taxId && (
                    <div className="grid grid-cols-[80px_1fr] sm:grid-cols-[100px_1fr] gap-2">
                      <span className="text-muted-foreground">เลขภาษี:</span>
                      <span>{userProfile.company.taxId}</span>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-[80px_1fr] sm:grid-cols-[100px_1fr] gap-2">
                    <span className="text-muted-foreground">โทร:</span>
                    <span>{userProfile?.company?.phone || company.phone}</span>
                  </div>
                  
                  <div className="grid grid-cols-[80px_1fr] sm:grid-cols-[100px_1fr] gap-2">
                    <span className="text-muted-foreground">อีเมล:</span>
                    <span className="break-words">{userProfile?.company?.email || company.email}</span>
                  </div>
                </div>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
            >
              <Card className="p-4 sm:p-6 bg-white/80 backdrop-blur-sm shadow-lg border-indigo-100 hover:shadow-xl transition-shadow">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-lg">
                      {recipientType === 'customer' ? (
                        <User className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-600" />
                      ) : (
                        <Users className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
                      )}
                    </div>
                    <h3 className="text-sm sm:text-base bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                      {recipientType === 'customer' ? 'ข้อมูลลูกค้า' : 'ข้อมูลพาร์ทเนอร์'}
                    </h3>
                  </div>
                </div>
                
                {/* Toggle between Customer and Partner */}
                <Tabs value={recipientType} onValueChange={(v: any) => setRecipientType(v)} className="mb-4">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="customer" className="gap-2">
                      <User className="w-4 h-4" />
                      ลูกค้า
                    </TabsTrigger>
                    <TabsTrigger value="partner" className="gap-2">
                      <Users className="w-4 h-4" />
                      พาร์ทเนอร์
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="customer" className="mt-4">
                    <div className="flex justify-end mb-3">
                      <Popover open={isCustomerPopoverOpen} onOpenChange={setIsCustomerPopoverOpen}>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" className="gap-2">
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
                                      <span className="font-semibold">{cust.name}</span>
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
                    </div>
                    
                    <div className="space-y-2 text-xs sm:text-sm">
                      <div className="grid grid-cols-[80px_1fr] sm:grid-cols-[100px_1fr] gap-2">
                        <span className="text-muted-foreground">ชื่อ:</span>
                        <span className="break-words">{customer.name}</span>
                      </div>
                      <div className="grid grid-cols-[80px_1fr] sm:grid-cols-[100px_1fr] gap-2">
                        <span className="text-muted-foreground">ที่อยู่:</span>
                        <span className="break-words">{customer.address}</span>
                      </div>
                      <div className="grid grid-cols-[80px_1fr] sm:grid-cols-[100px_1fr] gap-2">
                        <span className="text-muted-foreground">โทร:</span>
                        <span>{customer.phone}</span>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="partner" className="mt-4">
                    <div className="flex justify-end mb-3">
                      <Popover open={isPartnerPopoverOpen} onOpenChange={setIsPartnerPopoverOpen}>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" className="gap-2">
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
                                      <span className="font-semibold">{partner.name}</span>
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
                    </div>
                    
                    {selectedPartner ? (
                      <>
                        <div className="space-y-2 text-xs sm:text-sm mb-4">
                          <div className="grid grid-cols-[80px_1fr] sm:grid-cols-[100px_1fr] gap-2">
                            <span className="text-muted-foreground">ชื่อ:</span>
                            <span className="break-words">{selectedPartner.name}</span>
                          </div>
                          <div className="grid grid-cols-[80px_1fr] sm:grid-cols-[100px_1fr] gap-2">
                            <span className="text-muted-foreground">ประเภท:</span>
                            <Badge variant="secondary" className="w-fit">
                              {selectedPartner.type}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-[80px_1fr] sm:grid-cols-[100px_1fr] gap-2">
                            <span className="text-muted-foreground">โทร:</span>
                            <span>{selectedPartner.phone}</span>
                          </div>
                        </div>
                        
                        {/* Main Project Tag */}
                        <div className="pt-3 border-t">
                          <Label htmlFor="mainProjectTag" className="text-xs flex items-center gap-2 mb-2">
                            <Tag className="w-4 h-4 text-purple-600" />
                            <span>Tag โครงการหลัก (เพื่อจัดกลุ่ม)</span>
                          </Label>
                          <Input
                            id="mainProjectTag"
                            value={mainProjectTag}
                            onChange={(e) => setMainProjectTag(e.target.value)}
                            placeholder="เช่น โครงการบ้านคุณสมชาย"
                            className="bg-white text-sm"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            ใช้เพื่อแยก BOQ ของพาร์ทเนอร์ตามโครงการ
                          </p>
                        </div>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        กรุณาเลือกพาร์ทเนอร์
                      </p>
                    )}
                  </TabsContent>
                </Tabs>
              </Card>
            </motion.div>
          </div>

          {/* Project Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            <Card className="p-4 sm:p-6 bg-white/80 backdrop-blur-sm shadow-lg border-purple-100 hover:shadow-xl transition-shadow">
              <div className="flex items-center gap-2 mb-3 sm:mb-4">
                <div className="p-2 bg-gradient-to-br from-purple-100 to-pink-100 rounded-lg">
                  <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
                </div>
                <h3 className="text-sm sm:text-base bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  รายละเอียดโครงการ
                </h3>
              </div>
              <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="projectTitle" className="text-xs sm:text-sm">ชื่อโครงการ *</Label>
                  <Input
                    id="projectTitle"
                    value={projectTitle}
                    onChange={(e) => setProjectTitle(e.target.value)}
                    placeholder="ระบุชื่อโครงการ..."
                    className="bg-white text-sm"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="projectLocation" className="text-xs sm:text-sm">สถานที่</Label>
                  <Input
                    id="projectLocation"
                    value={projectLocation}
                    onChange={(e) => setProjectLocation(e.target.value)}
                    placeholder="ระบุสถานที่โครงการ..."
                    className="bg-white text-sm"
                  />
                </div>
                <div className="grid gap-2 md:col-span-2">
                  <Label htmlFor="projectDescription" className="text-xs sm:text-sm">รายละเอียด</Label>
                  <Textarea
                    id="projectDescription"
                    value={projectDescription}
                    onChange={(e) => setProjectDescription(e.target.value)}
                    placeholder="รายละเอียดโครงการ..."
                    rows={2}
                    className="bg-white text-sm"
                  />
                </div>
              </div>
            </Card>
          </motion.div>

          <Separator />

          {/* Items */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
          >
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
              <div>
                <h2 className="text-lg sm:text-xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  รายการวัสดุและค่าใช้จ่าย
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  รายการทั้งหมด {boqItems.length} รายการ
                </p>
              </div>
              <AddItemDialogEnhanced catalog={catalog} onAdd={handleAddItem} />
            </div>

            <BOQTableGrouped
              items={boqItems}
              onUpdate={handleUpdateItem}
              onRemove={handleRemove}
            />
          </motion.div>

          {boqItems.length > 0 && (
            <>
              <Separator />
              <motion.div 
                className="grid gap-4 sm:gap-6 lg:grid-cols-3"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7, duration: 0.5 }}
              >
                <div className="lg:col-span-2">
                  <ProfileEditor profile={profile} onUpdate={setProfile} />
                </div>
                <BOQSummary summary={summary} />
              </motion.div>
            </>
          )}

          {/* Confirm Button */}
          <Separator />
          <motion.div 
            className="flex justify-center sm:justify-end"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.8, duration: 0.5 }}
          >
            <Button
              onClick={handleConfirm}
              size="lg"
              className="w-full sm:w-auto gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 px-6 sm:px-8 py-5 sm:py-6 text-base sm:text-lg shadow-lg hover:shadow-xl transition-all"
              disabled={boqItems.length === 0 || !projectTitle.trim()}
            >
              <span>ยืนยัน BOQ และไปขั้นตอนถัดไป</span>
              <motion.div
                animate={{ x: [0, 5, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5" />
              </motion.div>
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  );
}
