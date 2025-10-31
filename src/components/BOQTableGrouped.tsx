import { BOQItem } from "../types/boq";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Trash2, GripVertical } from "lucide-react";
import { useState } from "react";

interface BOQTableGroupedProps {
  items: BOQItem[];
  onUpdate: (id: string, updates: Partial<BOQItem>) => void;
  onRemove: (id: string) => void;
}

export function BOQTableGrouped({ items, onUpdate, onRemove }: BOQTableGroupedProps) {
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null);

  // Group items by category
  const groupedItems = items.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, BOQItem[]>);

  const categories = Object.keys(groupedItems);

  const handleCellClick = (id: string, field: string) => {
    setEditingCell({ id, field });
  };

  const handleCellBlur = () => {
    setEditingCell(null);
  };

  const handleCellChange = (id: string, field: keyof BOQItem, value: any) => {
    onUpdate(id, { [field]: value });
  };

  const renderEditableCell = (item: BOQItem, field: keyof BOQItem, value: any, type: "text" | "number" = "text") => {
    const isEditing = editingCell?.id === item.id && editingCell?.field === field;

    if (isEditing) {
      if (field === "notes") {
        return (
          <Textarea
            value={value || ""}
            onChange={(e) => handleCellChange(item.id, field, e.target.value)}
            onBlur={handleCellBlur}
            autoFocus
            rows={2}
            className="min-w-[200px]"
          />
        );
      }
      return (
        <Input
          type={type}
          value={value}
          onChange={(e) => {
            const newValue = type === "number" ? parseFloat(e.target.value) || 0 : e.target.value;
            handleCellChange(item.id, field, newValue);
          }}
          onBlur={handleCellBlur}
          autoFocus
          step={type === "number" ? "0.01" : undefined}
          min={type === "number" ? "0" : undefined}
          className="min-w-[100px]"
        />
      );
    }

    return (
      <div
        onClick={() => handleCellClick(item.id, field as string)}
        className="cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-950/20 p-2 rounded min-h-[2rem] flex items-center"
      >
        {type === "number" && typeof value === "number"
          ? value.toLocaleString('th-TH', { minimumFractionDigits: 2 })
          : value || "-"}
      </div>
    );
  };

  let runningNo = 1;

  return (
    <div className="space-y-6">
      {categories.map((category, catIndex) => {
        const categoryItems = groupedItems[category];
        const categoryTotal = categoryItems.reduce((sum, item) => 
          sum + ((item.material + item.labor) * item.quantity), 0
        );

        return (
          <Card key={category} className="overflow-hidden border-2">
            {/* Category Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge className="bg-white text-blue-600 hover:bg-white">
                    หมวดที่ {catIndex + 1}
                  </Badge>
                  <h3 className="text-lg">{category}</h3>
                  <span className="text-sm opacity-90">({categoryItems.length} รายการ)</span>
                </div>
                <div className="text-right">
                  <div className="text-sm opacity-90">รวมหมวดนี้</div>
                  <div className="text-xl">
                    ฿{categoryTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            </div>

            {/* Desktop Table View */}
            <div className="overflow-x-auto hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-12 text-center">#</TableHead>
                    <TableHead className="min-w-[250px]">รายการ</TableHead>
                    <TableHead className="min-w-[150px]">หมวดย่อย</TableHead>
                    <TableHead className="w-20 text-center">หน่วย</TableHead>
                    <TableHead className="w-28 text-right">จำนวน</TableHead>
                    <TableHead className="w-32 text-right">ค่าวัสดุ/หน่วย</TableHead>
                    <TableHead className="w-32 text-right">ค่าแรง/หน่วย</TableHead>
                    <TableHead className="w-32 text-right">ราคา/หน่วย</TableHead>
                    <TableHead className="w-36 text-right">ราคารวม</TableHead>
                    <TableHead className="min-w-[200px]">หมายเหตุ</TableHead>
                    <TableHead className="w-20 print:hidden"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categoryItems.map((item) => {
                    const unitPrice = item.material + item.labor;
                    const totalPrice = unitPrice * item.quantity;
                    const itemNo = runningNo++;

                    return (
                      <TableRow key={item.id} className="hover:bg-muted/30">
                        <TableCell className="text-center text-muted-foreground">
                          {itemNo}
                        </TableCell>
                        <TableCell>{renderEditableCell(item, "name", item.name, "text")}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs">
                            {item.subcategory}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">{item.unit}</TableCell>
                        <TableCell className="text-right">
                          {renderEditableCell(item, "quantity", item.quantity, "number")}
                        </TableCell>
                        <TableCell className="text-right">
                          {renderEditableCell(item, "material", item.material, "number")}
                        </TableCell>
                        <TableCell className="text-right">
                          {renderEditableCell(item, "labor", item.labor, "number")}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          ฿{unitPrice.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-blue-600">
                          ฿{totalPrice.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell>{renderEditableCell(item, "notes", item.notes, "text")}</TableCell>
                        <TableCell className="print:hidden">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onRemove(item.id)}
                            className="hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}

                  {/* Category Subtotal */}
                  <TableRow className="bg-gradient-to-r from-blue-50 to-indigo-50 border-t-2 border-blue-300">
                    <TableCell colSpan={8} className="text-right font-semibold">
                      รวม{category}:
                    </TableCell>
                    <TableCell className="text-right font-semibold text-blue-600 text-lg">
                      ฿{categoryTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell colSpan={2}></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden p-3 space-y-3">
              {categoryItems.map((item) => {
                const unitPrice = item.material + item.labor;
                const totalPrice = unitPrice * item.quantity;
                const itemNo = runningNo++;

                return (
                  <Card key={item.id} className="p-3 bg-gradient-to-br from-white to-blue-50/30 border shadow-sm">
                    <div className="space-y-2">
                      {/* Item Number & Delete Button */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300">
                            #{itemNo}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {item.subcategory}
                          </Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onRemove(item.id)}
                          className="h-7 w-7 hover:bg-red-50 hover:text-red-600 shrink-0"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>

                      {/* Item Name */}
                      <div>
                        <p className="text-xs text-muted-foreground">รายการ</p>
                        <p className="text-sm font-medium">{item.name}</p>
                      </div>

                      {/* Quantity & Unit */}
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-xs text-muted-foreground">จำนวน</p>
                          <p className="font-medium">{item.quantity.toLocaleString('th-TH', { minimumFractionDigits: 2 })} {item.unit}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">ราคา/หน่วย</p>
                          <p className="font-medium">฿{unitPrice.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</p>
                        </div>
                      </div>

                      {/* Material & Labor */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <p className="text-muted-foreground">ค่าวัสดุ/หน่วย</p>
                          <p className="font-medium">฿{item.material.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">ค่าแรง/หน่วย</p>
                          <p className="font-medium">฿{item.labor.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</p>
                        </div>
                      </div>

                      {/* Notes */}
                      {item.notes && (
                        <div>
                          <p className="text-xs text-muted-foreground">หมายเหตุ</p>
                          <p className="text-xs">{item.notes}</p>
                        </div>
                      )}

                      {/* Total Price */}
                      <div className="bg-blue-100 -mx-3 -mb-3 px-3 py-2 rounded-b-lg border-t-2 border-blue-300">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-blue-700">ราคารวม</span>
                          <span className="text-base font-semibold text-blue-700">฿{totalPrice.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}

              {/* Category Subtotal for Mobile */}
              <div className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white p-3 rounded-lg mt-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">รวม{category}</span>
                  <span className="text-lg font-semibold">฿{categoryTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>
          </Card>
        );
      })}

      {items.length === 0 && (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">ยังไม่มีรายการ</p>
          <p className="text-sm text-muted-foreground mt-1">คลิก "เพิ่มรายการ" เพื่อเริ่มต้น</p>
        </Card>
      )}
    </div>
  );
}
