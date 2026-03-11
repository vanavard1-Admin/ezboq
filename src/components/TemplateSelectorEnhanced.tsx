import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { TemplateMetadata, TemplateMainCategory } from "../types/template";
import { templateMetadata } from "../data/boqTemplates";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { 
  Home, 
  DoorOpen, 
  Wrench, 
  Sofa, 
  Trees, 
  Store, 
  Search, 
  X, 
  TrendingUp, 
  Clock, 
  Building2,
  Plus,
  Trash2,
  Edit3,
  Sparkles,
  CheckCircle2,
  Filter,
  Eye,
  Grid3x3,
  List,
  Package,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import { BOQItem } from "../types/boq";
import { api } from "../utils/api";
import { log } from "../utils/logger";

interface TemplateSelectorEnhancedProps {
  onSelectTemplate: (template: TemplateMetadata) => void;
  onClose?: () => void;
  currentBOQItems?: BOQItem[];
}

interface CustomTemplate extends TemplateMetadata {
  id: string;
  userId: string;
  createdAt: number;
  updatedAt: number;
  isCustom: true;
}

const categoryIcons: Record<TemplateMainCategory, React.ReactNode> = {
  house: <Home className="w-4 h-4" />,
  room: <DoorOpen className="w-4 h-4" />,
  renovation: <Wrench className="w-4 h-4" />,
  builtin: <Sofa className="w-4 h-4" />,
  landscape: <Trees className="w-4 h-4" />,
  commercial: <Building2 className="w-4 h-4" />,
};

const categoryNames: Record<TemplateMainCategory, string> = {
  house: "บ้านเดี่ยว",
  room: "ห้องต่างๆ",
  renovation: "รีโนเวท",
  builtin: "งานบิ้วอิน",
  landscape: "ภูมิทัศน์",
  commercial: "ตึกแถว",
};

const difficultyColors = {
  easy: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30",
  medium: "bg-amber-500/10 text-amber-700 border-amber-500/30",
  hard: "bg-rose-500/10 text-rose-700 border-rose-500/30",
};

const difficultyLabels = {
  easy: "ง่าย",
  medium: "ปานกลาง",
  hard: "ซับซ้อน",
};

type ViewMode = 'grid' | 'list';
type SortMode = 'popular' | 'newest' | 'name' | 'items';

export function TemplateSelectorEnhanced({ 
  onSelectTemplate, 
  onClose,
  currentBOQItems = [] 
}: TemplateSelectorEnhancedProps) {
  const [customTemplates, setCustomTemplates] = useState<CustomTemplate[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<TemplateMainCategory | "all">("all");
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortMode, setSortMode] = useState<SortMode>('popular');
  const [previewTemplate, setPreviewTemplate] = useState<TemplateMetadata | CustomTemplate | null>(null);
  const [addedCount, setAddedCount] = useState(0);
  
  // Custom template dialogs
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<CustomTemplate | null>(null);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateDesc, setNewTemplateDesc] = useState("");
  const [newTemplateCategory, setNewTemplateCategory] = useState<TemplateMainCategory>("house");
  const [isLoading, setIsLoading] = useState(false);

  // Load custom templates
  useEffect(() => {
    loadCustomTemplates();
  }, []);

  const loadCustomTemplates = async () => {
    try {
      const templates = await api.get<CustomTemplate[]>('custom-templates');
      setCustomTemplates(templates || []);
    } catch (error) {
      log.error('Failed to load custom templates:', error);
    }
  };

  // Filter and sort templates
  const filteredSystemTemplates = useMemo(() => {
    let filtered = templateMetadata.filter(template => {
      const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          template.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === "all" || template.mainCategory === selectedCategory;
      return matchesSearch && matchesCategory;
    });

    // Sort
    if (sortMode === 'popular') {
      filtered.sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0));
    } else if (sortMode === 'name') {
      filtered.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortMode === 'items') {
      filtered.sort((a, b) => b.items.length - a.items.length);
    }

    return filtered;
  }, [searchQuery, selectedCategory, sortMode]);

  const filteredCustomTemplates = useMemo(() => {
    return customTemplates.filter(template => {
      const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          template.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === "all" || template.mainCategory === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [customTemplates, searchQuery, selectedCategory]);

  const handleClickTemplate = (template: TemplateMetadata | CustomTemplate) => {
    setPreviewTemplate(template);
  };

  const handleConfirmAdd = () => {
    if (previewTemplate) {
      onSelectTemplate(previewTemplate);
      setAddedCount(prev => prev + 1);
      toast.success(`✅ เพิ่ม ${previewTemplate.items.length} รายการเข้า BOQ`);
      setPreviewTemplate(null);
    }
  };

  const handleCancelPreview = () => {
    setPreviewTemplate(null);
  };

  const handleCreateTemplate = async () => {
    if (!newTemplateName.trim()) {
      toast.error("กรุณาใส่ชื่อ Template");
      return;
    }

    if (currentBOQItems.length === 0) {
      toast.error("ไม่มีรายการใน BOQ");
      return;
    }

    setIsLoading(true);
    try {
      const newTemplate: Omit<CustomTemplate, 'id' | 'userId' | 'createdAt' | 'updatedAt'> = {
        name: newTemplateName,
        description: newTemplateDesc || `Template ที่สร้างจาก BOQ ปัจจุบัน`,
        mainCategory: newTemplateCategory,
        items: currentBOQItems.map(item => ({
          id: item.id,
          name: item.name,
          category: item.category,
          subcategory: item.subcategory,
          unit: item.unit,
          quantity: item.quantity,
          labor: item.labor,
          material: item.material,
          notes: item.notes,
        })),
        tags: [newTemplateCategory, 'custom'],
        difficulty: currentBOQItems.length > 50 ? 'hard' : currentBOQItems.length > 20 ? 'medium' : 'easy',
        isCustom: true,
      };

      const created = await api.post<CustomTemplate>('custom-templates', newTemplate);
      setCustomTemplates(prev => [created, ...prev]);
      
      toast.success("✅ สร้าง Template สำเร็จ!", {
        description: `บันทึก ${currentBOQItems.length} รายการแล้ว`
      });

      setShowCreateDialog(false);
      setNewTemplateName("");
      setNewTemplateDesc("");
      setNewTemplateCategory("house");
    } catch (error) {
      log.error('Failed to create template:', error);
      toast.error("เกิดข้อผิดพลาดในการสร้าง Template");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditTemplate = async () => {
    if (!editingTemplate || !newTemplateName.trim()) {
      toast.error("กรุณาใส่ชื่อ Template");
      return;
    }

    setIsLoading(true);
    try {
      const updated = await api.put<CustomTemplate>(`custom-templates/${editingTemplate.id}`, {
        name: newTemplateName,
        description: newTemplateDesc,
        mainCategory: newTemplateCategory,
      });

      setCustomTemplates(prev => prev.map(t => t.id === updated.id ? updated : t));
      toast.success("✅ แก้ไข Template สำเร็จ!");
      
      setShowEditDialog(false);
      setEditingTemplate(null);
      setNewTemplateName("");
      setNewTemplateDesc("");
    } catch (error) {
      log.error('Failed to update template:', error);
      toast.error("เกิดข้อผิดพลาดในการแก้ไข Template");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTemplate = async (template: CustomTemplate) => {
    if (!confirm(`ต้องการลบ Template "${template.name}" ใช่หรือไม่?`)) {
      return;
    }

    try {
      await api.delete(`custom-templates/${template.id}`);
      setCustomTemplates(prev => prev.filter(t => t.id !== template.id));
      toast.success("🗑️ ลบ Template สำเร็จ");
    } catch (error) {
      log.error('Failed to delete template:', error);
      toast.error("เกิดข้อผิดพลาดในการลบ Template");
    }
  };

  const openEditDialog = (template: CustomTemplate) => {
    setEditingTemplate(template);
    setNewTemplateName(template.name);
    setNewTemplateDesc(template.description);
    setNewTemplateCategory(template.mainCategory);
    setShowEditDialog(true);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const calculateTemplateTotal = (template: TemplateMetadata | CustomTemplate) => {
    return template.items.reduce((sum, item) => {
      const itemTotal = (item.quantity || 1) * ((item.labor || 0) + (item.material || 0));
      return sum + itemTotal;
    }, 0);
  };

  // Preview Screen
  if (previewTemplate) {
    const isCustom = 'isCustom' in previewTemplate && previewTemplate.isCustom;
    const total = calculateTemplateTotal(previewTemplate);

    return (
      <div className="flex flex-col h-full bg-gradient-to-br from-slate-50 to-white">
        {/* Header */}
        <div className="flex-shrink-0 px-6 py-4 border-b bg-white">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={handleCancelPreview} className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                กลับ
              </Button>
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Eye className="w-5 h-5 text-blue-600" />
                  ตรวจสอบ Template
                </h2>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {addedCount > 0 && (
                <Badge className="bg-emerald-600">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  เพิ่มแล้ว {addedCount}
                </Badge>
              )}
              <Button onClick={handleConfirmAdd} className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                <Plus className="w-4 h-4" />
                เพิ่มเข้า BOQ
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="max-w-6xl mx-auto">
            {/* Template Info Card */}
            <Card className="border-2 shadow-xl mb-6">
              <div className="h-2 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />
              <CardHeader className="bg-gradient-to-br from-blue-50/50 to-purple-50/30">
                <div className="flex items-start gap-4">
                  <div className="p-4 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg">
                    <div className="w-10 h-10 flex items-center justify-center">
                      {categoryIcons[previewTemplate.mainCategory]}
                    </div>
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-2xl mb-2 flex items-center gap-2 flex-wrap">
                      <span>{previewTemplate.name}</span>
                      {isCustom && (
                        <Badge className="bg-gradient-to-r from-purple-600 to-pink-600">
                          <Sparkles className="w-3 h-3 mr-1" />
                          My Template
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="text-base mb-3">
                      {previewTemplate.description}
                    </CardDescription>
                    
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary" className={difficultyColors[previewTemplate.difficulty || 'medium']}>
                        {difficultyLabels[previewTemplate.difficulty || 'medium']}
                      </Badge>
                      <Badge variant="outline" className="gap-1.5">
                        {categoryIcons[previewTemplate.mainCategory]}
                        {categoryNames[previewTemplate.mainCategory]}
                      </Badge>
                      {!isCustom && previewTemplate.usageCount && previewTemplate.usageCount > 50 && (
                        <Badge className="gap-1.5 bg-orange-500/10 text-orange-700 border-orange-500/30">
                          <TrendingUp className="w-3 h-3" />
                          ยอดนิยม
                        </Badge>
                      )}
                      <Badge variant="outline" className="gap-1.5">
                        <Package className="w-3 h-3" />
                        {previewTemplate.items.length} รายการ
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="p-6">
                {/* Summary Stats */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <Card className="border-2">
                    <CardContent className="p-4 text-center">
                      <div className="text-4xl mb-2">📦</div>
                      <div className="text-2xl font-bold mb-1">{previewTemplate.items.length}</div>
                      <div className="text-sm text-muted-foreground">รายการ</div>
                    </CardContent>
                  </Card>
                  <Card className="border-2">
                    <CardContent className="p-4 text-center">
                      <div className="text-4xl mb-2">💰</div>
                      <div className="text-lg font-bold mb-1">{formatCurrency(total)}</div>
                      <div className="text-sm text-muted-foreground">ราคารวม</div>
                    </CardContent>
                  </Card>
                </div>

                <Separator className="my-6" />

                {/* Items List */}
                <div>
                  <h3 className="font-bold mb-4 flex items-center gap-2">
                    <List className="w-5 h-5" />
                    รายการทั้งหมด ({previewTemplate.items.length} รายการ)
                  </h3>
                  <div className="max-h-96 overflow-y-auto space-y-2 pr-2">
                    {previewTemplate.items.map((item, idx) => {
                      const itemTotal = (item.quantity || 1) * ((item.labor || 0) + (item.material || 0));
                      return (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.01 }}
                        >
                          <Card className="p-3 hover:shadow-md transition-shadow border-l-4 border-l-blue-500">
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge variant="outline" className="text-xs">
                                    {item.category}
                                  </Badge>
                                  <span className="font-medium">{item.description}</span>
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {item.quantity} {item.unit} × {formatCurrency((item.labor || 0) + (item.material || 0))}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-bold text-blue-600">{formatCurrency(itemTotal)}</div>
                              </div>
                            </div>
                          </Card>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Main Template Selection Screen
  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-slate-50 to-white">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 bg-white border-b">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg">
                <Sparkles className="w-7 h-7" />
              </div>
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                เลือก Template BOQ
              </span>
            </h1>
            <p className="text-muted-foreground mt-1">
              เลือก Template สำเร็จรูป หรือสร้าง Template ของคุณเอง
            </p>
          </div>
          <div className="flex items-center gap-3">
            {addedCount > 0 && (
              <Badge className="text-base px-4 py-2 gap-2 bg-emerald-600">
                <CheckCircle2 className="w-4 h-4" />
                เพิ่มแล้ว {addedCount}
              </Badge>
            )}
            {onClose && (
              <Button variant="outline" onClick={onClose} className="gap-2">
                <X className="w-4 h-4" />
                ปิด
              </Button>
            )}
          </div>
        </div>

        {/* Search & Filters */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="ค้นหา Template..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as SortMode)}
              className="h-10 px-3 border rounded-md bg-background"
            >
              <option value="popular">ยอดนิยม</option>
              <option value="name">ชื่อ</option>
              <option value="items">จำนวนรายการ</option>
            </select>
          </div>

          <div className="flex border rounded-md">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="rounded-r-none"
            >
              <Grid3x3 className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="rounded-l-none"
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Tabs defaultValue="system" className="flex-1 flex flex-col">
          <div className="flex-shrink-0 px-6 pt-4 bg-white/50">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="system" className="gap-2">
                <Package className="w-4 h-4" />
                System Templates
              </TabsTrigger>
              <TabsTrigger value="custom" className="gap-2">
                <Sparkles className="w-4 h-4" />
                My Templates ({customTemplates.length})
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Category Filters */}
          <div className="flex-shrink-0 px-6 py-4">
            <div className="flex gap-2 overflow-x-auto pb-2">
              <Button
                variant={selectedCategory === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory("all")}
              >
                ทั้งหมด
              </Button>
              {(Object.keys(categoryNames) as TemplateMainCategory[]).map((cat) => (
                <Button
                  key={cat}
                  variant={selectedCategory === cat ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(cat)}
                  className="gap-2 whitespace-nowrap"
                >
                  {categoryIcons[cat]}
                  {categoryNames[cat]}
                </Button>
              ))}
            </div>
          </div>

          {/* System Templates Tab */}
          <TabsContent value="system" className="flex-1 mt-0 overflow-hidden">
            <div className="h-full overflow-y-auto px-6 pb-6">
              <AnimatePresence mode="wait">
                {filteredSystemTemplates.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-center py-20"
                  >
                    <div className="text-6xl mb-4">🔍</div>
                    <h3 className="text-xl font-bold mb-2">ไม่พบ Template ที่ตรงกับเงื่อนไข</h3>
                    <p className="text-muted-foreground">ลองเปลี่ยนคำค้นหาหรือหมวดหมู่</p>
                  </motion.div>
                ) : (
                  <motion.div
                    key="system-grid"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className={viewMode === 'grid' 
                      ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4 w-full"
                      : "space-y-3 w-full"
                    }
                  >
                    {filteredSystemTemplates.map((template, idx) => (
                      <TemplateCard
                        key={template.name}
                        template={template}
                        onClick={() => handleClickTemplate(template)}
                        viewMode={viewMode}
                        delay={idx * 0.02}
                      />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </TabsContent>

          {/* Custom Templates Tab */}
          <TabsContent value="custom" className="flex-1 mt-0 overflow-hidden">
            <div className="h-full overflow-y-auto px-6 pb-6">
              {/* Create Button */}
              <div className="mb-6">
                <Button
                  onClick={() => setShowCreateDialog(true)}
                  size="lg"
                  className="w-full gap-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 h-16 shadow-xl"
                  disabled={currentBOQItems.length === 0}
                >
                  <Plus className="w-5 h-5" />
                  <div className="text-left">
                    <div className="font-bold">สร้าง Template ใหม่</div>
                    <div className="text-sm opacity-90">
                      {currentBOQItems.length > 0 
                        ? `จาก BOQ ปัจจุบัน (${currentBOQItems.length} รายการ)`
                        : 'กรุณาเพิ่มรายการใน BOQ ก่อน'
                      }
                    </div>
                  </div>
                </Button>
              </div>

              <AnimatePresence mode="wait">
                {filteredCustomTemplates.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-center py-20"
                  >
                    <div className="text-6xl mb-4">✨</div>
                    <h3 className="text-xl font-bold mb-2">ยังไม่มี Template ของคุณ</h3>
                    <p className="text-muted-foreground mb-4">สร้าง Template จาก BOQ ที่คุณใช้บ่อยๆ เพื่อประหยัดเวลา</p>
                    <Button
                      onClick={() => setShowCreateDialog(true)}
                      className="gap-2"
                      disabled={currentBOQItems.length === 0}
                    >
                      <Plus className="w-4 h-4" />
                      สร้าง Template แรก
                    </Button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="custom-grid"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className={viewMode === 'grid' 
                      ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4 w-full"
                      : "space-y-3 w-full"
                    }
                  >
                    {filteredCustomTemplates.map((template, idx) => (
                      <CustomTemplateCard
                        key={template.id}
                        template={template}
                        onClick={() => handleClickTemplate(template)}
                        onEdit={() => openEditDialog(template)}
                        onDelete={() => handleDeleteTemplate(template)}
                        viewMode={viewMode}
                        delay={idx * 0.02}
                      />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Create Template Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              สร้าง Template ใหม่
            </DialogTitle>
            <DialogDescription>
              สร้าง Template จาก BOQ ปัจจุบัน ({currentBOQItems.length} รายการ)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="template-name">ชื่อ Template *</Label>
              <Input
                id="template-name"
                placeholder="เช่น บ้านเดี่ยว 2 ชั้น มาตรฐาน"
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="template-desc">คำอธิบาย</Label>
              <Textarea
                id="template-desc"
                placeholder="คำอธิบาย Template (ไม่บังคับ)"
                value={newTemplateDesc}
                onChange={(e) => setNewTemplateDesc(e.target.value)}
                className="mt-1"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="template-category">หมวดหมู่ *</Label>
              <select
                id="template-category"
                value={newTemplateCategory}
                onChange={(e) => setNewTemplateCategory(e.target.value as TemplateMainCategory)}
                className="w-full h-10 px-3 border rounded-md mt-1"
              >
                {(Object.keys(categoryNames) as TemplateMainCategory[]).map((cat) => (
                  <option key={cat} value={cat}>{categoryNames[cat]}</option>
                ))}
              </select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              ยกเลิก
            </Button>
            <Button 
              onClick={handleCreateTemplate} 
              disabled={isLoading || !newTemplateName.trim()}
              className="gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              <Plus className="w-4 h-4" />
              {isLoading ? "กำลังสร้าง..." : "สร้าง Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Template Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-blue-600" />
              แก้ไข Template
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="edit-template-name">ชื่อ Template *</Label>
              <Input
                id="edit-template-name"
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="edit-template-desc">คำอธิบาย</Label>
              <Textarea
                id="edit-template-desc"
                value={newTemplateDesc}
                onChange={(e) => setNewTemplateDesc(e.target.value)}
                className="mt-1"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="edit-template-category">หมวดหมู่ *</Label>
              <select
                id="edit-template-category"
                value={newTemplateCategory}
                onChange={(e) => setNewTemplateCategory(e.target.value as TemplateMainCategory)}
                className="w-full h-10 px-3 border rounded-md mt-1"
              >
                {(Object.keys(categoryNames) as TemplateMainCategory[]).map((cat) => (
                  <option key={cat} value={cat}>{categoryNames[cat]}</option>
                ))}
              </select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              ยกเลิก
            </Button>
            <Button 
              onClick={handleEditTemplate} 
              disabled={isLoading || !newTemplateName.trim()}
              className="gap-2"
            >
              <Edit3 className="w-4 h-4" />
              {isLoading ? "กำลังบันทึก..." : "บันทึก"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Template Card Component
interface TemplateCardProps {
  template: TemplateMetadata;
  onClick: () => void;
  viewMode: ViewMode;
  delay: number;
}

function TemplateCard({ template, onClick, viewMode, delay }: TemplateCardProps) {
  const total = template.items.reduce((sum, item) => {
    return sum + (item.quantity || 1) * ((item.labor || 0) + (item.material || 0));
  }, 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (viewMode === 'list') {
    return (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay }}
      >
        <Card 
          className="p-4 hover:shadow-lg hover:border-blue-500 transition-all cursor-pointer"
          onClick={onClick}
        >
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 text-white">
              {categoryIcons[template.mainCategory]}
            </div>
            <div className="flex-1">
              <h3 className="font-bold mb-1">{template.name}</h3>
              <p className="text-sm text-muted-foreground line-clamp-1">{template.description}</p>
            </div>
            <div className="text-right">
              <div className="font-bold text-blue-600">{formatCurrency(total)}</div>
              <div className="text-sm text-muted-foreground">{template.items.length} รายการ</div>
            </div>
          </div>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      whileHover={{ y: -4 }}
    >
      <Card 
        className="h-full p-5 hover:shadow-xl hover:border-blue-500 transition-all cursor-pointer group"
        onClick={onClick}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-start justify-between mb-3">
            <div className="p-3 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-md group-hover:scale-110 transition-transform">
              {categoryIcons[template.mainCategory]}
            </div>
            {template.usageCount && template.usageCount > 50 && (
              <Badge className="bg-orange-500/10 text-orange-700 border-orange-500/30">
                <TrendingUp className="w-3 h-3 mr-1" />
                ยอดนิยม
              </Badge>
            )}
          </div>

          <h3 className="font-bold mb-2 line-clamp-2">{template.name}</h3>
          <p className="text-sm text-muted-foreground line-clamp-2 mb-4 flex-1">
            {template.description}
          </p>

          <div className="space-y-2 pt-3 border-t">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">ราคารวม</span>
              <span className="font-bold text-blue-600">{formatCurrency(total)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">จำนวน</span>
              <Badge variant="outline">{template.items.length} รายการ</Badge>
            </div>
            <div className="flex gap-1.5 flex-wrap">
              <Badge variant="secondary" className={difficultyColors[template.difficulty || 'medium']}>
                {difficultyLabels[template.difficulty || 'medium']}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {categoryNames[template.mainCategory]}
              </Badge>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

// Custom Template Card Component
interface CustomTemplateCardProps {
  template: CustomTemplate;
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
  viewMode: ViewMode;
  delay: number;
}

function CustomTemplateCard({ template, onClick, onEdit, onDelete, viewMode, delay }: CustomTemplateCardProps) {
  const total = template.items.reduce((sum, item) => {
    return sum + (item.quantity || 1) * ((item.labor || 0) + (item.material || 0));
  }, 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (viewMode === 'list') {
    return (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay }}
      >
        <Card className="p-4 border-purple-200 bg-gradient-to-r from-purple-50/50 to-pink-50/50">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-gradient-to-br from-purple-600 to-pink-600 text-white">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="flex-1 cursor-pointer" onClick={onClick}>
              <h3 className="font-bold mb-1">{template.name}</h3>
              <p className="text-sm text-muted-foreground line-clamp-1">{template.description}</p>
            </div>
            <div className="text-right cursor-pointer" onClick={onClick}>
              <div className="font-bold text-purple-600">{formatCurrency(total)}</div>
              <div className="text-sm text-muted-foreground">{template.items.length} รายการ</div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
              >
                <Edit3 className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      whileHover={{ y: -4 }}
    >
      <Card className="h-full p-5 border-purple-200 bg-gradient-to-br from-purple-50/30 to-pink-50/30 hover:shadow-xl hover:border-purple-500 transition-all group">
        <div className="flex flex-col h-full">
          <div className="flex items-start justify-between mb-3">
            <div className="p-3 rounded-lg bg-gradient-to-br from-purple-600 to-pink-600 text-white shadow-md group-hover:scale-110 transition-transform">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                className="h-8 w-8 p-0"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          <div className="cursor-pointer flex-1 flex flex-col" onClick={onClick}>
            <h3 className="font-bold mb-2 line-clamp-2">{template.name}</h3>
            <p className="text-sm text-muted-foreground line-clamp-2 mb-4 flex-1">
              {template.description}
            </p>

            <div className="space-y-2 pt-3 border-t">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">ราคารวม</span>
                <span className="font-bold text-purple-600">{formatCurrency(total)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">จำนวน</span>
                <Badge variant="outline">{template.items.length} รายการ</Badge>
              </div>
              <div className="flex gap-1.5 flex-wrap">
                <Badge className="bg-gradient-to-r from-purple-600 to-pink-600 text-xs">
                  My Template
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {categoryNames[template.mainCategory]}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}