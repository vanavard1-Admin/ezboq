import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { BOQItem } from "../types/boq";
import { Trash2, Edit2, Check, X } from "lucide-react";
import { useState } from "react";

interface BOQTableProps {
  items: BOQItem[];
  onUpdateQuantity: (id: string, quantity: number) => void;
  onUpdateNotes: (id: string, notes: string) => void;
  onRemove: (id: string) => void;
}

export function BOQTable({ items, onUpdateQuantity, onUpdateNotes, onRemove }: BOQTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQuantity, setEditQuantity] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const startEdit = (item: BOQItem) => {
    setEditingId(item.id);
    setEditQuantity(item.quantity.toString());
    setEditNotes(item.notes || "");
  };

  const saveEdit = (id: string) => {
    const qty = parseFloat(editQuantity);
    if (qty > 0) {
      onUpdateQuantity(id, qty);
      onUpdateNotes(id, editNotes);
    }
    setEditingId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">ลำดับ</TableHead>
            <TableHead>รายการ</TableHead>
            <TableHead>หมวดหมู่</TableHead>
            <TableHead className="text-right">จำนวน</TableHead>
            <TableHead className="text-right">หน่วย</TableHead>
            <TableHead className="text-right">ราคาวัสดุ/หน่วย</TableHead>
            <TableHead className="text-right">ราคาแรง/หน่วย</TableHead>
            <TableHead className="text-right">ราคารวม/หน่วย</TableHead>
            <TableHead className="text-right">ราคารวมทั้งหมด</TableHead>
            <TableHead>หมายเหตุ</TableHead>
            <TableHead className="w-24">จัดการ</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                ยังไม่มีรายการ กรุณาเพิ่มรายการวัสดุ
              </TableCell>
            </TableRow>
          ) : (
            items.map((item, index) => {
              const unitPrice = item.catalogItem.material + item.catalogItem.labor;
              const totalPrice = unitPrice * item.quantity;
              const isEditing = editingId === item.id;

              return (
                <TableRow key={item.id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{item.catalogItem.name}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{item.catalogItem.category}</div>
                      <div className="text-muted-foreground">{item.catalogItem.subcategory}</div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {isEditing ? (
                      <Input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={editQuantity}
                        onChange={(e) => setEditQuantity(e.target.value)}
                        className="w-24 text-right"
                      />
                    ) : (
                      item.quantity.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                    )}
                  </TableCell>
                  <TableCell className="text-right">{item.catalogItem.unit}</TableCell>
                  <TableCell className="text-right">
                    ฿{item.catalogItem.material.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-right">
                    ฿{item.catalogItem.labor.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-right">
                    ฿{unitPrice.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-right">
                    ฿{totalPrice.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell>
                    {isEditing ? (
                      <Input
                        value={editNotes}
                        onChange={(e) => setEditNotes(e.target.value)}
                        placeholder="หมายเหตุ..."
                        className="w-32"
                      />
                    ) : (
                      <span className="text-sm text-muted-foreground">{item.notes || "-"}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {isEditing ? (
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => saveEdit(item.id)}>
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={cancelEdit}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => startEdit(item)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => onRemove(item.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
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
