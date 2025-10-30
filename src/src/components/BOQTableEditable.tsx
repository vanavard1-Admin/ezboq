import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { BOQItem } from "../types/boq";
import { Trash2, GripVertical } from "lucide-react";
import { useState } from "react";

interface BOQTableEditableProps {
  items: BOQItem[];
  onUpdate: (id: string, updates: Partial<BOQItem>) => void;
  onRemove: (id: string) => void;
}

export function BOQTableEditable({ items, onUpdate, onRemove }: BOQTableEditableProps) {
  const [focusedCell, setFocusedCell] = useState<string | null>(null);

  const handleCellUpdate = (id: string, field: keyof BOQItem, value: any) => {
    if (field === 'quantity' || field === 'material' || field === 'labor') {
      const numValue = parseFloat(value);
      if (!isNaN(numValue) && numValue >= 0) {
        onUpdate(id, { [field]: numValue });
      }
    } else {
      onUpdate(id, { [field]: value });
    }
  };

  return (
    <div className="border rounded-lg bg-card shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-12"></TableHead>
            <TableHead className="w-16">ลำดับ</TableHead>
            <TableHead className="min-w-[250px]">รายการ</TableHead>
            <TableHead className="min-w-[150px]">หมวดหมู่</TableHead>
            <TableHead className="min-w-[150px]">หมวดย่อย</TableHead>
            <TableHead className="text-right min-w-[100px]">จำนวน</TableHead>
            <TableHead className="text-center w-20">หน่วย</TableHead>
            <TableHead className="text-right min-w-[120px]">ค่าวัสดุ/หน่วย</TableHead>
            <TableHead className="text-right min-w-[120px]">ค่าแรง/หน่วย</TableHead>
            <TableHead className="text-right min-w-[120px]">รวม/หน่วย</TableHead>
            <TableHead className="text-right min-w-[140px]">รวมทั้งหมด</TableHead>
            <TableHead className="min-w-[200px]">หมายเหตุ</TableHead>
            <TableHead className="w-20 text-center">ลบ</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={13} className="text-center py-12 text-muted-foreground">
                <div className="flex flex-col items-center gap-2">
                  <div className="text-4xl">📋</div>
                  <div>ยังไม่มีรายการ กรุณาเพิ่มรายการวัสดุ</div>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            items.map((item, index) => {
              const unitPrice = item.material + item.labor;
              const totalPrice = unitPrice * item.quantity;

              return (
                <TableRow key={item.id} className="hover:bg-muted/30">
                  <TableCell className="cursor-move">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                  </TableCell>
                  <TableCell className="text-center">{index + 1}</TableCell>
                  
                  {/* Name - Editable */}
                  <TableCell>
                    <Input
                      value={item.name}
                      onChange={(e) => handleCellUpdate(item.id, 'name', e.target.value)}
                      onFocus={() => setFocusedCell(`${item.id}-name`)}
                      onBlur={() => setFocusedCell(null)}
                      className={`h-8 ${focusedCell === `${item.id}-name` ? 'ring-2 ring-primary' : 'border-transparent bg-transparent'}`}
                    />
                  </TableCell>
                  
                  {/* Category - Editable */}
                  <TableCell>
                    <Input
                      value={item.category}
                      onChange={(e) => handleCellUpdate(item.id, 'category', e.target.value)}
                      onFocus={() => setFocusedCell(`${item.id}-category`)}
                      onBlur={() => setFocusedCell(null)}
                      className={`h-8 ${focusedCell === `${item.id}-category` ? 'ring-2 ring-primary' : 'border-transparent bg-transparent'}`}
                    />
                  </TableCell>
                  
                  {/* Subcategory - Editable */}
                  <TableCell>
                    <Input
                      value={item.subcategory}
                      onChange={(e) => handleCellUpdate(item.id, 'subcategory', e.target.value)}
                      onFocus={() => setFocusedCell(`${item.id}-subcategory`)}
                      onBlur={() => setFocusedCell(null)}
                      className={`h-8 ${focusedCell === `${item.id}-subcategory` ? 'ring-2 ring-primary' : 'border-transparent bg-transparent'}`}
                    />
                  </TableCell>
                  
                  {/* Quantity - Editable */}
                  <TableCell className="text-right">
                    <Input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={item.quantity}
                      onChange={(e) => handleCellUpdate(item.id, 'quantity', e.target.value)}
                      onFocus={() => setFocusedCell(`${item.id}-quantity`)}
                      onBlur={() => setFocusedCell(null)}
                      className={`h-8 text-right ${focusedCell === `${item.id}-quantity` ? 'ring-2 ring-primary' : 'border-transparent bg-transparent'}`}
                    />
                  </TableCell>
                  
                  {/* Unit - Editable */}
                  <TableCell>
                    <Input
                      value={item.unit}
                      onChange={(e) => handleCellUpdate(item.id, 'unit', e.target.value)}
                      onFocus={() => setFocusedCell(`${item.id}-unit`)}
                      onBlur={() => setFocusedCell(null)}
                      className={`h-8 text-center ${focusedCell === `${item.id}-unit` ? 'ring-2 ring-primary' : 'border-transparent bg-transparent'}`}
                    />
                  </TableCell>
                  
                  {/* Material Price - Editable */}
                  <TableCell className="text-right">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.material}
                      onChange={(e) => handleCellUpdate(item.id, 'material', e.target.value)}
                      onFocus={() => setFocusedCell(`${item.id}-material`)}
                      onBlur={() => setFocusedCell(null)}
                      className={`h-8 text-right ${focusedCell === `${item.id}-material` ? 'ring-2 ring-primary' : 'border-transparent bg-transparent'}`}
                    />
                  </TableCell>
                  
                  {/* Labor Price - Editable */}
                  <TableCell className="text-right">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.labor}
                      onChange={(e) => handleCellUpdate(item.id, 'labor', e.target.value)}
                      onFocus={() => setFocusedCell(`${item.id}-labor`)}
                      onBlur={() => setFocusedCell(null)}
                      className={`h-8 text-right ${focusedCell === `${item.id}-labor` ? 'ring-2 ring-primary' : 'border-transparent bg-transparent'}`}
                    />
                  </TableCell>
                  
                  {/* Unit Price - Calculated */}
                  <TableCell className="text-right bg-muted/20">
                    ฿{unitPrice.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                  </TableCell>
                  
                  {/* Total Price - Calculated */}
                  <TableCell className="text-right bg-muted/30">
                    ฿{totalPrice.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                  </TableCell>
                  
                  {/* Notes - Editable */}
                  <TableCell>
                    <Input
                      value={item.notes || ""}
                      onChange={(e) => handleCellUpdate(item.id, 'notes', e.target.value)}
                      onFocus={() => setFocusedCell(`${item.id}-notes`)}
                      onBlur={() => setFocusedCell(null)}
                      placeholder="หมายเหตุ..."
                      className={`h-8 ${focusedCell === `${item.id}-notes` ? 'ring-2 ring-primary' : 'border-transparent bg-transparent'}`}
                    />
                  </TableCell>
                  
                  {/* Delete Button */}
                  <TableCell className="text-center">
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => onRemove(item.id)}
                      className="h-8 w-8 p-0 hover:bg-destructive hover:text-destructive-foreground"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
