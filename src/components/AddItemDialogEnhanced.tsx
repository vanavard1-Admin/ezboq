import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Textarea } from "./ui/textarea";
import { CatalogItem } from "../types/boq";
import { Plus, Search, DollarSign, Package, Calculator, Sparkles } from "lucide-react";
import { Badge } from "./ui/badge";
import { Card } from "./ui/card";
import { getCategories } from "../data/catalog";

interface AddItemDialogEnhancedProps {
  catalog: CatalogItem[];
  onAdd: (
    name: string,
    category: string,
    subcategory: string,
    unit: string,
    material: number,
    labor: number,
    quantity: number,
    notes?: string
  ) => void;
}

export function AddItemDialogEnhanced({ catalog, onAdd }: AddItemDialogEnhancedProps) {
  const [open, setOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<CatalogItem | null>(null);
  const [itemName, setItemName] = useState<string>("");
  const [quantity, setQuantity] = useState<string>("1");
  const [material, setMaterial] = useState<string>("0");
  const [labor, setLabor] = useState<string>("0");
  const [notes, setNotes] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const categories = getCategories();
  const allCategories = ["all", ...categories];
  
  const filteredCatalog = catalog.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.subcategory.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleSelectItem = (item: CatalogItem) => {
    setSelectedItem(item);
    setItemName(item.name);
    setMaterial(item.material.toString());
    setLabor(item.labor.toString());
  };

  const handleAdd = () => {
    if (selectedItem && itemName.trim() && parseFloat(quantity) > 0) {
      onAdd(
        itemName.trim(),
        selectedItem.category,
        selectedItem.subcategory,
        selectedItem.unit,
        parseFloat(material) || 0,
        parseFloat(labor) || 0,
        parseFloat(quantity),
        notes
      );
      handleReset();
      setOpen(false);
    }
  };

  const handleReset = () => {
    setSelectedItem(null);
    setItemName("");
    setQuantity("1");
    setMaterial("0");
    setLabor("0");
    setNotes("");
    setSearchTerm("");
    setSelectedCategory("all");
  };

  const totalUnitPrice = (parseFloat(material) || 0) + (parseFloat(labor) || 0);
  const totalPrice = totalUnitPrice * (parseFloat(quantity) || 0);

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      setOpen(newOpen);
      if (!newOpen) handleReset();
    }}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl transition-all">
          <Plus className="h-4 w-4" />
          เพิ่มรายการวัสดุ
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl p-0 gap-0 max-h-[90vh] flex flex-col">
        {/* Header - Fixed */}
        <div className="px-6 pt-6 pb-4 border-b flex-shrink-0 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <Package className="h-6 w-6 text-blue-600" />
              เพิ่มรายการวัสดุ
              <Badge variant="secondary" className="ml-2">
                {catalog.length.toLocaleString()} รายการ
              </Badge>
            </DialogTitle>
            <DialogDescription>
              เลือกรายการจากแคตตาล็อก หรือค้นหาด้วยชื่อ/หมวดหมู่ จากนั้นปรับราคาและระบุจำนวน
            </DialogDescription>
          </DialogHeader>
        </div>
        
        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto min-h-0 px-6 py-4">
          <div className="space-y-6">
            {/* Search and Filter */}
            <Card className="p-4 border-2 border-blue-100 shadow-sm">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Search className="h-4 w-4" />
                    ค้นหารายการ
                  </Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="พิมพ์ชื่อรายการ, หมวดหมู่, หรือคำค้นหา..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 border-2"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>กรองตามหมวดหมู่</Label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="border-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      <SelectItem value="all">
                        <span className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4" />
                          ทั้งหมด ({catalog.length})
                        </span>
                      </SelectItem>
                      {categories.map(category => {
                        const count = catalog.filter(item => item.category === category).length;
                        return (
                          <SelectItem key={category} value={category}>
                            {category} ({count})
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Card>

            {/* Item List */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-base">
                  รายการวัสดุ
                  <Badge variant="outline" className="ml-2">
                    {filteredCatalog.length} รายการ
                  </Badge>
                </Label>
                {selectedCategory !== "all" && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setSelectedCategory("all")}
                  >
                    ล้างตัวกรอง
                  </Button>
                )}
              </div>

              <div className="border-2 rounded-lg p-3 max-h-[280px] overflow-y-auto space-y-2 bg-gray-50/50">
                {filteredCatalog.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p className="text-lg">ไม่พบรายการที่ค้นหา</p>
                    <p className="text-sm">ลองเปลี่ยนคำค้นหาหรือเลือกหมวดหมู่อื่น</p>
                  </div>
                )}

                {filteredCatalog.map(item => (
                  <div
                    key={item.id}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all hover:scale-[1.01] ${
                      selectedItem?.id === item.id 
                        ? 'bg-blue-50 border-blue-500 shadow-md dark:bg-blue-950/30' 
                        : 'bg-white hover:bg-blue-50/50 hover:border-blue-300 border-gray-200'
                    }`}
                    onClick={() => handleSelectItem(item)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="mb-2 line-clamp-2">{item.name}</div>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="outline" className="text-xs">
                            {item.category}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {item.subcategory}
                          </Badge>
                          <Badge className="text-xs bg-green-100 text-green-700 hover:bg-green-100">
                            {item.unit}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="font-semibold text-lg text-blue-600">
                          ฿{(item.material + item.labor).toLocaleString()}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          /{item.unit}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                          <div>วัสดุ ฿{item.material.toLocaleString()}</div>
                          <div>แรง ฿{item.labor.toLocaleString()}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Selected Item Details */}
            {selectedItem && (
              <Card className="p-5 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-2 border-blue-200 shadow-lg">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-3 border-b border-blue-200">
                    <Calculator className="h-5 w-5 text-blue-600" />
                    <h4 className="text-lg">ปรับแต่งรายการ</h4>
                    <Badge className="ml-auto">
                      {selectedItem.category} → {selectedItem.subcategory}
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="itemName">ชื่อรายการ (สามารถแก้ไขได้)</Label>
                    <Input
                      id="itemName"
                      value={itemName}
                      onChange={(e) => setItemName(e.target.value)}
                      placeholder="ชื่อรายการ..."
                      className="bg-white dark:bg-gray-900 border-2"
                    />
                    <p className="text-xs text-muted-foreground">
                      📝 ต้นฉบับ: {selectedItem.name}
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="quantity">
                        จำนวน
                        <Badge variant="outline" className="ml-2 text-xs">
                          {selectedItem.unit}
                        </Badge>
                      </Label>
                      <Input
                        id="quantity"
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        className="bg-white dark:bg-gray-900 border-2"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="material">ค่าวัสดุ/หน่วย</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">฿</span>
                        <Input
                          id="material"
                          type="number"
                          min="0"
                          step="0.01"
                          value={material}
                          onChange={(e) => setMaterial(e.target.value)}
                          className="bg-white dark:bg-gray-900 border-2 pl-7"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="labor">ค่าแรง/หน่วย</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">฿</span>
                        <Input
                          id="labor"
                          type="number"
                          min="0"
                          step="0.01"
                          value={labor}
                          onChange={(e) => setLabor(e.target.value)}
                          className="bg-white dark:bg-gray-900 border-2 pl-7"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">หมายเหตุ</Label>
                    <Textarea
                      id="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="ระบุรายละเอียดเพิ่มเติม เช่น สี, ขนาด, ยี่ห้อ..."
                      rows={2}
                      className="bg-white dark:bg-gray-900 border-2"
                    />
                  </div>

                  {/* Price Summary */}
                  <div className="p-4 bg-white/60 dark:bg-gray-900/60 rounded-lg border-2 border-blue-300">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-muted-foreground">ราคา/หน่วย:</span>
                        <div className="text-lg">
                          ฿{totalUnitPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-muted-foreground">รวมทั้งหมด:</span>
                        <div className="text-2xl text-blue-600">
                          ฿{totalPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 pt-2 border-t text-xs text-muted-foreground">
                      {parseFloat(quantity) || 0} {selectedItem.unit} × ฿{totalUnitPrice.toLocaleString()} = ฿{totalPrice.toLocaleString()}
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {!selectedItem && (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>👆 เลือกรายการจากด้านบนเพื่อเริ่มต้น</p>
              </div>
            )}
          </div>
        </div>
        
        {/* Footer - Fixed */}
        <div className="px-6 py-4 border-t flex-shrink-0 bg-gray-50 dark:bg-gray-900/50">
          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => setOpen(false)}
              className="border-2"
            >
              ยกเลิก
            </Button>
            <Button 
              onClick={handleAdd}
              disabled={!selectedItem || !itemName.trim() || parseFloat(quantity) <= 0}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 gap-2 shadow-lg"
            >
              <Plus className="h-4 w-4" />
              เพิ่มรายการ
              {selectedItem && parseFloat(quantity) > 0 && (
                <Badge variant="secondary" className="ml-1">
                  ฿{totalPrice.toLocaleString()}
                </Badge>
              )}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
