import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Textarea } from "./ui/textarea";
import { CatalogItem } from "../types/boq";
import { Plus, Search } from "lucide-react";
import { ScrollArea } from "./ui/scroll-area";
import { Badge } from "./ui/badge";

interface AddItemDialogProps {
  catalog: CatalogItem[];
  onAdd: (item: CatalogItem, quantity: number, notes?: string) => void;
  onAddCustom?: (name: string, category: string, subcategory: string, unit: string, material: number, labor: number, quantity: number, notes?: string) => void;
}

export function AddItemDialog({ catalog, onAdd, onAddCustom }: AddItemDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<CatalogItem | null>(null);
  const [quantity, setQuantity] = useState<string>("1");
  const [notes, setNotes] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const categories = ["all", ...Array.from(new Set(catalog.map(item => item.category)))];
  
  const filteredCatalog = catalog.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.subcategory.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleAdd = () => {
    if (selectedItem && parseFloat(quantity) > 0) {
      onAdd(selectedItem, parseFloat(quantity), notes);
      setSelectedItem(null);
      setQuantity("1");
      setNotes("");
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          เพิ่มรายการ
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>เพิ่มรายการวัสดุ</DialogTitle>
          <DialogDescription>
            เลือกรายการวัสดุจากแคตตาล็อก หรือสร้างรายการใหม่
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label>ค้นหารายการ</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="ค้นหาชื่อรายการ, หมวดหมู่..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label>หมวดหมู่</Label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทั้งหมด</SelectItem>
                {categories.filter(c => c !== "all").map(category => (
                  <SelectItem key={category} value={category}>{category}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>เลือกรายการ</Label>
            <ScrollArea className="h-[200px] border rounded-md">
              <div className="p-2 space-y-2">
                {filteredCatalog.map(item => (
                  <div
                    key={item.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedItem?.id === item.id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                    }`}
                    onClick={() => setSelectedItem(item)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div>{item.name}</div>
                        <div className="flex gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">{item.category}</Badge>
                          <Badge variant="outline" className="text-xs">{item.subcategory}</Badge>
                        </div>
                      </div>
                      <div className="text-right text-sm">
                        <div>฿{(item.material + item.labor).toLocaleString()}/{item.unit}</div>
                        <div className="text-xs opacity-70">วัสดุ ฿{item.material.toLocaleString()} + แรง ฿{item.labor.toLocaleString()}</div>
                      </div>
                    </div>
                  </div>
                ))}
                {filteredCatalog.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    ไม่พบรายการที่ค้นหา
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          {selectedItem && (
            <>
              <div className="grid gap-2">
                <Label htmlFor="quantity">จำนวน ({selectedItem.unit})</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="notes">หมายเหตุ (ถ้ามี)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="ระบุรายละเอียดเพิ่มเติม..."
                  rows={2}
                />
              </div>

              <div className="bg-muted p-3 rounded-lg">
                <div className="flex justify-between items-center">
                  <span>ราคารวม:</span>
                  <span className="text-lg">
                    ฿{((selectedItem.material + selectedItem.labor) * parseFloat(quantity || "0")).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </>
          )}

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setOpen(false)}>
              ยกเลิก
            </Button>
            <Button onClick={handleAdd} disabled={!selectedItem || parseFloat(quantity) <= 0}>
              เพิ่มรายการ
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
