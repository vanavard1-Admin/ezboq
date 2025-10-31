import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { ScrollArea } from "./ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { roomTemplates, getRoomCategories, getTemplatesByRoom, type RoomTemplate } from "../data/roomTemplates";
import { BOQItem } from "../types/boq";
import { Bath, ChefHat, Bed, Sofa, CheckCircle2, AlertCircle } from "lucide-react";

interface RoomTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTemplate: (items: Omit<BOQItem, "id">[]) => void;
}

const categoryIcons: Record<string, React.ReactNode> = {
  "ห้องน้ำ": <Bath className="h-5 w-5" />,
  "ห้องครัว": <ChefHat className="h-5 w-5" />,
  "ห้องนอน": <Bed className="h-5 w-5" />,
  "ห้องนั่งเล่น": <Sofa className="h-5 w-5" />,
};

export function RoomTemplateDialog({ open, onOpenChange, onSelectTemplate }: RoomTemplateDialogProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("ห้องน้ำ");
  const [selectedTemplate, setSelectedTemplate] = useState<RoomTemplate | null>(null);
  const categories = getRoomCategories();

  const handleSelectTemplate = (template: RoomTemplate) => {
    setSelectedTemplate(template);
  };

  const handleConfirm = () => {
    if (selectedTemplate) {
      onSelectTemplate(selectedTemplate.items);
      onOpenChange(false);
      setSelectedTemplate(null);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("th-TH").format(amount);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-2xl">🏠</span>
            เลือกห้องพร้อมรายการวัสดุ
          </DialogTitle>
          <DialogDescription>
            เลือก Template ห้องที่ต้องการ ระบบจะเพิ่มรายการวัสดุครบชุดให้อัตโนมัติ
          </DialogDescription>
        </DialogHeader>

        <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            {categories.map((cat) => (
              <TabsTrigger key={cat} value={cat} className="flex items-center gap-2">
                {categoryIcons[cat]}
                {cat}
              </TabsTrigger>
            ))}
          </TabsList>

          {categories.map((cat) => (
            <TabsContent key={cat} value={cat} className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Template List */}
                <ScrollArea className="h-[500px] pr-4">
                  <div className="space-y-3">
                    {getTemplatesByRoom(cat).map((template) => (
                      <Card
                        key={template.id}
                        className={`cursor-pointer transition-all hover:shadow-md ${
                          selectedTemplate?.id === template.id
                            ? "border-2 border-blue-500 shadow-md"
                            : "border"
                        }`}
                        onClick={() => handleSelectTemplate(template)}
                      >
                        <CardHeader className="pb-3">
                          <CardTitle className="flex items-center gap-2 text-lg">
                            <span className="text-2xl">{template.icon}</span>
                            {template.name}
                            {selectedTemplate?.id === template.id && (
                              <CheckCircle2 className="h-5 w-5 text-blue-500 ml-auto" />
                            )}
                          </CardTitle>
                          <CardDescription>{template.description}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">ราคาประมาณ:</span>
                            <span className="font-medium">
                              ฿{formatCurrency(template.estimatedCost.min)} - ฿
                              {formatCurrency(template.estimatedCost.max)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">จำนวนรายการ:</span>
                            <Badge variant="secondary">{template.items.length} รายการ</Badge>
                          </div>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {template.tags.map((tag) => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>

                {/* Template Detail */}
                <div className="border rounded-lg p-4">
                  {selectedTemplate ? (
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-semibold text-lg flex items-center gap-2 mb-2">
                          <span className="text-2xl">{selectedTemplate.icon}</span>
                          {selectedTemplate.name}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-3">
                          {selectedTemplate.description}
                        </p>
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                          <div className="flex items-start gap-2">
                            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                            <div className="text-sm text-blue-900">
                              <p className="font-medium mb-1">รายการที่จะถูกเพิ่ม:</p>
                              <p>ระบบจะเพิ่ม <strong>{selectedTemplate.items.length} รายการ</strong> เข้า BOQ ของคุณ</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <ScrollArea className="h-[320px]">
                        <div className="space-y-2 pr-4">
                          <h4 className="font-semibold text-sm mb-2">รายการวัสดุทั้งหมด:</h4>
                          {selectedTemplate.items.map((item, index) => (
                            <div
                              key={index}
                              className="flex items-start gap-2 text-sm p-2 rounded bg-gray-50 hover:bg-gray-100 transition-colors"
                            >
                              <div className="h-5 w-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-medium flex-shrink-0">
                                {index + 1}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{item.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {item.quantity} {item.unit} × ฿{formatCurrency(item.unitPrice)} = ฿
                                  {formatCurrency(item.amount)}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>

                      <div className="pt-3 border-t space-y-2">
                        <div className="flex items-center justify-between font-semibold">
                          <span>รวมทั้งหมด:</span>
                          <span className="text-lg text-blue-600">
                            ฿
                            {formatCurrency(
                              selectedTemplate.items.reduce((sum, item) => sum + item.amount, 0)
                            )}
                          </span>
                        </div>
                        <Button onClick={handleConfirm} className="w-full" size="lg">
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          เพิ่มรายการทั้งหมดเข้า BOQ
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground">
                      <div className="text-6xl mb-4">👈</div>
                      <p className="text-lg font-medium">เลือก Template ด้านซ้าย</p>
                      <p className="text-sm">เพื่อดูรายละเอียดและรายการวัสดุ</p>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
