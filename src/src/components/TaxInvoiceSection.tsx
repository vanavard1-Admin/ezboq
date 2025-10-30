import { TaxInvoice } from "../types/boq";
import { Card } from "./ui/card";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { FileSpreadsheet, CalendarDays } from "lucide-react";

interface TaxInvoiceSectionProps {
  taxInvoice: TaxInvoice;
  grandTotal: number;
  onUpdate: (invoice: TaxInvoice) => void;
}

export function TaxInvoiceSection({ taxInvoice, grandTotal, onUpdate }: TaxInvoiceSectionProps) {
  const handleFieldChange = (field: keyof TaxInvoice, value: string | number) => {
    onUpdate({
      ...taxInvoice,
      [field]: value,
    });
  };

  const remaining = grandTotal - (taxInvoice.paidAmount || 0);

  return (
    <Card className="p-6 bg-white/80 backdrop-blur-sm shadow-lg border-indigo-100">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-lg">
          <FileSpreadsheet className="h-5 w-5 text-indigo-600" />
        </div>
        <div>
          <h3 className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            ใบกำกับภาษี / ใบเสร็จรับเงิน
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            ออกใบกำกับภาษีและใบเสร็จ
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>เลขที่ใบกำกับภาษี *</Label>
            <Input
              value={taxInvoice.invoiceNumber}
              onChange={(e) => handleFieldChange("invoiceNumber", e.target.value)}
              placeholder="เช่น INV-2025-0001"
              className="bg-white"
            />
          </div>

          <div className="space-y-2">
            <Label>เลขที่ใบเสร็จ</Label>
            <Input
              value={taxInvoice.receiptNumber || ""}
              onChange={(e) => handleFieldChange("receiptNumber", e.target.value)}
              placeholder="เช่น REC-2025-0001"
              className="bg-white"
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>วันที่ออกเอกสาร *</Label>
            <div className="relative">
              <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                value={taxInvoice.issueDate}
                onChange={(e) => handleFieldChange("issueDate", e.target.value)}
                className="bg-white pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>กำหนดชำระ</Label>
            <div className="relative">
              <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                value={taxInvoice.dueDate || ""}
                onChange={(e) => handleFieldChange("dueDate", e.target.value)}
                className="bg-white pl-10"
              />
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>วิธีการชำระเงิน *</Label>
            <Select 
              value={taxInvoice.paymentMethod} 
              onValueChange={(value: any) => handleFieldChange("paymentMethod", value)}
            >
              <SelectTrigger className="bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">เงินสด</SelectItem>
                <SelectItem value="transfer">โอนเงิน</SelectItem>
                <SelectItem value="check">เช็ค</SelectItem>
                <SelectItem value="other">อื่นๆ</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>จำนวนเงินที่ชำระ</Label>
            <Input
              type="number"
              value={taxInvoice.paidAmount || ""}
              onChange={(e) => handleFieldChange("paidAmount", parseFloat(e.target.value) || 0)}
              placeholder="0.00"
              className="bg-white"
            />
            {taxInvoice.paidAmount && taxInvoice.paidAmount > 0 && (
              <p className="text-xs text-green-600 mt-1">
                ✓ ชำระสำเร็จ (คงเหลือ: ฿{(remaining).toLocaleString('th-TH', { minimumFractionDigits: 2 })})
              </p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label>หมายเหตุ</Label>
          <Textarea
            value={taxInvoice.notes || ""}
            onChange={(e) => handleFieldChange("notes", e.target.value)}
            placeholder="ระบุรายละเอียดเพิ่มเติม..."
            rows={3}
            className="bg-white"
          />
        </div>
      </div>
    </Card>
  );
}
