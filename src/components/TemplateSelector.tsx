import React, { useState, useMemo } from "react";
import { TemplateMetadata, TemplateMainCategory } from "../types/template";
import { templateMetadata } from "../data/boqTemplates";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { Home, DoorOpen, Wrench, Sofa, Trees, Store, Search, X, TrendingUp, Clock, Building2 } from "lucide-react";
import { toast } from "sonner";

interface TemplateSelectorProps {
  onSelectTemplate: (template: TemplateMetadata) => void;
  onClose?: () => void;
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
  easy: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  hard: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

const difficultyLabels = {
  easy: "ง่าย",
  medium: "ปานกลาง",
  hard: "ซับซ้อน",
};

export function TemplateSelector({ onSelectTemplate, onClose }: TemplateSelectorProps) {
  const [selectedCategory, setSelectedCategory] = useState<TemplateMainCategory | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [previewTemplate, setPreviewTemplate] = useState<TemplateMetadata | null>(null);
  const [addedCount, setAddedCount] = useState(0);

  // Filter templates
  const filteredTemplates = useMemo(() => {
    let templates = [...templateMetadata];

    // Filter by category
    if (selectedCategory !== "all") {
      templates = templates.filter(t => t.mainCategory === selectedCategory);
    }

    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      templates = templates.filter(t =>
        t.name.toLowerCase().includes(query) ||
        t.description.toLowerCase().includes(query) ||
        t.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Sort by usage (most popular first)
    templates.sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0));

    return templates;
  }, [selectedCategory, searchQuery]);

  const handleClickTemplate = (template: TemplateMetadata) => {
    setPreviewTemplate(template);
  };

  const handleConfirmAdd = () => {
    if (!previewTemplate) return;
    
    onSelectTemplate(previewTemplate);
    setAddedCount(prev => prev + 1);
    toast.success(`เพิ่ม Template: ${previewTemplate.name}`, {
      description: `เพิ่มรายการ ${previewTemplate.items.length} รายการเข้า BOQ แล้ว`
    });
    setPreviewTemplate(null);
  };

  const handleCancelPreview = () => {
    setPreviewTemplate(null);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // If showing preview, display confirmation screen
  if (previewTemplate) {
    return (
      <div className="flex flex-col h-full">
        {/* Preview Header */}
        <div className="flex-shrink-0 p-6 border-b bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={handleCancelPreview}>
                ← กลับ
              </Button>
              <div>
                <h2 className="text-xl">ยืนยันการเพิ่ม Template</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  ตรวจสอบรายการก่อนเพิ่มเข้า BOQ
                </p>
              </div>
            </div>
            {addedCount > 0 && (
              <Badge variant="default" className="text-sm gap-1">
                ✓ เพิ่มแล้ว {addedCount} Template
              </Badge>
            )}
          </div>
        </div>

        {/* Preview Content */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
          <div className="max-w-2xl mx-auto space-y-6">
            {/* Template Info Card */}
            <Card className="border-2 border-blue-500">
              <CardHeader>
                <div className="flex items-start gap-3">
                  <div className="p-3 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 text-white flex-shrink-0">
                    {categoryIcons[previewTemplate.mainCategory]}
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-xl mb-2">{previewTemplate.name}</CardTitle>
                    <CardDescription>{previewTemplate.description}</CardDescription>
                    <div className="flex flex-wrap gap-2 mt-3">
                      <Badge variant="secondary" className={difficultyColors[previewTemplate.difficulty || 'medium']}>
                        {difficultyLabels[previewTemplate.difficulty || 'medium']}
                      </Badge>
                      <Badge variant="outline">{categoryNames[previewTemplate.mainCategory]}</Badge>
                      {previewTemplate.usageCount && previewTemplate.usageCount > 50 && (
                        <Badge variant="secondary" className="gap-1">
                          <TrendingUp className="h-3 w-3" />
                          ยอดนิยม
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Separator />
                
                {/* Stats Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {previewTemplate.area && (
                    <div className="text-center p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                      <div className="text-2xl mb-1">{previewTemplate.area}</div>
                      <div className="text-xs text-muted-foreground">ตารางเมตร</div>
                    </div>
                  )}
                  {previewTemplate.estimatedCost && (
                    <div className="text-center p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                      <div className="text-lg mb-1 text-blue-600 dark:text-blue-400">
                        {formatCurrency(previewTemplate.estimatedCost)}
                      </div>
                      <div className="text-xs text-muted-foreground">ราคาประมาณ</div>
                    </div>
                  )}
                  <div className="text-center p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg">
                    <div className="text-2xl mb-1">{previewTemplate.items.length}</div>
                    <div className="text-xs text-muted-foreground">รายการ</div>
                  </div>
                  {previewTemplate.estimatedDays && (
                    <div className="text-center p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                      <div className="text-2xl mb-1">{previewTemplate.estimatedDays}</div>
                      <div className="text-xs text-muted-foreground">วัน</div>
                    </div>
                  )}
                </div>

                {/* Tags */}
                {previewTemplate.tags.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <div className="text-sm mb-2">🏷️ แท็ก:</div>
                      <div className="flex flex-wrap gap-2">
                        {previewTemplate.tags.map((tag, index) => (
                          <Badge key={index} variant="outline">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Item Preview */}
                <Separator />
                <div>
                  <div className="text-sm mb-2">📝 ตัวอย่างรายการ (แสดง 5 รายการแรก):</div>
                  <div className="space-y-1 text-sm bg-gray-50 dark:bg-gray-900 p-3 rounded-lg max-h-48 overflow-y-auto scrollbar-thin">
                    {previewTemplate.items.slice(0, 5).map((item, index) => (
                      <div key={index} className="flex justify-between py-1 border-b last:border-0">
                        <span>{item.name}</span>
                        <span className="text-muted-foreground">{item.quantity} {item.unit}</span>
                      </div>
                    ))}
                    {previewTemplate.items.length > 5 && (
                      <div className="text-center text-muted-foreground py-2">
                        ... และอีก {previewTemplate.items.length - 5} รายการ
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                size="lg"
                onClick={handleCancelPreview}
                className="flex-1"
              >
                ยกเลิก
              </Button>
              <Button
                size="lg"
                onClick={handleConfirmAdd}
                className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                ✓ ยืนยันเพิ่มรายการเข้า BOQ
              </Button>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg p-4 text-sm">
              <div className="flex items-start gap-2">
                <div className="text-blue-600 dark:text-blue-400 mt-0.5">💡</div>
                <div className="text-blue-900 dark:text-blue-100">
                  <div className="font-medium mb-1">คุณสามารถเพิ่มได้หลาย Template!</div>
                  <div className="text-blue-700 dark:text-blue-300">
                    หลังจากกดยืนยัน คุณจะกลับมาเลือก template อื่นๆ เพิ่มได้อีก (เช่น เพิ่มห้องน้ำ แล้วเพิ่มห้องนอน)
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 p-6 border-b bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl">📋 เลือก Template BOQ</h2>
            <p className="text-sm text-muted-foreground mt-1">
              เลือก template สำเร็จรูปเพื่อเริ่มต้นอย่างรวดเร็ว
            </p>
          </div>
          <div className="flex items-center gap-2">
            {addedCount > 0 && (
              <Badge variant="default" className="text-sm gap-1">
                ✓ เพิ่มแล้ว {addedCount} Template
              </Badge>
            )}
            <Badge variant="secondary" className="text-sm">
              {templateMetadata.length} Templates
            </Badge>
          </div>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex-shrink-0 p-4 border-b bg-white dark:bg-gray-950 space-y-3">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="ค้นหา template... (เช่น บ้าน, ห้องน้ำ, ร้านกาแฟ)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-9"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Category Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <Button
            variant={selectedCategory === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory("all")}
            className="rounded-full flex-shrink-0"
          >
            ✨ ทั้งหมด
          </Button>
          {Object.entries(categoryNames).map(([key, name]) => (
            <Button
              key={key}
              variant={selectedCategory === key ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(key as TemplateMainCategory)}
              className="rounded-full flex-shrink-0 gap-1"
            >
              {categoryIcons[key as TemplateMainCategory]}
              {name}
            </Button>
          ))}
        </div>

        {/* Results count and Finish Button */}
        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            พบ {filteredTemplates.length} templates
            {searchQuery && ` จากการค้นหา "${searchQuery}"`}
          </div>
          {addedCount > 0 && (
            <Button
              variant="default"
              size="sm"
              onClick={onClose}
              className="h-7 gap-1"
            >
              ✓ เสร็จสิ้น ({addedCount} Templates)
            </Button>
          )}
        </div>
      </div>

      {/* Template Grid */}
      <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
        {filteredTemplates.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-lg mb-2">ไม่พบ Template</h3>
            <p className="text-sm text-muted-foreground">
              ลองเปลี่ยนคำค้นหาหรือหมวดหมู่
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map((template) => (
              <Card
                key={template.id}
                className="cursor-pointer hover:border-blue-500 hover:shadow-lg transition-all group"
                onClick={() => handleClickTemplate(template)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1">
                      <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 text-white flex-shrink-0">
                        {categoryIcons[template.mainCategory]}
                      </div>
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-sm line-clamp-1">
                          {template.name}
                        </CardTitle>
                        <div className="flex items-center gap-1 mt-1">
                          {template.difficulty && (
                            <Badge 
                              variant="secondary" 
                              className={`text-xs ${difficultyColors[template.difficulty]}`}
                            >
                              {difficultyLabels[template.difficulty]}
                            </Badge>
                          )}
                          {template.usageCount && template.usageCount > 50 && (
                            <Badge variant="secondary" className="text-xs gap-1">
                              <TrendingUp className="h-3 w-3" />
                              ยอดนิยม
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  <CardDescription className="text-xs line-clamp-2 min-h-[2.5rem]">
                    {template.description}
                  </CardDescription>

                  <Separator />

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {template.area && (
                      <div>
                        <div className="text-muted-foreground">พื้นที่</div>
                        <div>{template.area} ตร.ม.</div>
                      </div>
                    )}
                    {template.estimatedCost && (
                      <div>
                        <div className="text-muted-foreground">ราคาประมาณ</div>
                        <div className="text-blue-600 dark:text-blue-400">
                          {formatCurrency(template.estimatedCost)}
                        </div>
                      </div>
                    )}
                    <div>
                      <div className="text-muted-foreground">รายการ</div>
                      <div>{template.items.length} รายการ</div>
                    </div>
                    {template.estimatedDays && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <div>
                          <div className="text-muted-foreground">ระยะเวลา</div>
                          <div>{template.estimatedDays} วัน</div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Tags */}
                  {template.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {template.tags.slice(0, 3).map((tag, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Action Button */}
                  <Button 
                    size="sm" 
                    className="w-full group-hover:bg-blue-600 group-hover:text-white transition-colors"
                    variant="outline"
                  >
                    เลือก Template นี้
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
