import { Discount } from "../types/boq";
import { Card } from "./ui/card";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Percent, DollarSign } from "lucide-react";
import { Switch } from "./ui/switch";

interface DiscountSectionProps {
  discount: Discount | null;
  totalBeforeDiscount: number;
  onUpdate: (discount: Discount | null) => void;
}

export function DiscountSection({ discount, totalBeforeDiscount, onUpdate }: DiscountSectionProps) {
  const handleToggle = (enabled: boolean) => {
    if (enabled) {
      onUpdate({ type: "percent", value: 0, description: "" });
    } else {
      onUpdate(null);
    }
  };

  const handleTypeChange = (type: "percent" | "fixed") => {
    if (discount) {
      onUpdate({ ...discount, type, value: 0 });
    }
  };

  const handleValueChange = (value: string) => {
    if (discount) {
      onUpdate({ ...discount, value: parseFloat(value) || 0 });
    }
  };

  const handleDescriptionChange = (description: string) => {
    if (discount) {
      onUpdate({ ...discount, description });
    }
  };

  const calculateDiscountAmount = (): number => {
    if (!discount) return 0;
    if (discount.type === "percent") {
      return totalBeforeDiscount * (discount.value / 100);
    }
    return discount.value;
  };

  const discountAmount = calculateDiscountAmount();
  const totalAfterDiscount = totalBeforeDiscount - discountAmount;

  return (
    <Card className="p-6 bg-white/80 backdrop-blur-sm shadow-lg border-green-100">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
            ส่วนลด
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            กำหนดส่วนลดให้ลูกค้า (ถ้ามี)
          </p>
        </div>
        <Switch checked={discount !== null} onCheckedChange={handleToggle} />
      </div>

      {discount && (
        <div className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>ประเภทส่วนลด</Label>
              <Select value={discount.type} onValueChange={handleTypeChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percent">
                    <div className="flex items-center gap-2">
                      <Percent className="h-4 w-4" />
                      <span>เปอร์เซ็นต์ (%)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="fixed">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      <span>จำนวนเงิน (฿)</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>
                {discount.type === "percent" ? "ส่วนลด (%)" : "ส่วนลด (฿)"}
              </Label>
              <Input
                type="number"
                min="0"
                step={discount.type === "percent" ? "0.01" : "1"}
                max={discount.type === "percent" ? "100" : undefined}
                value={discount.value}
                onChange={(e) => handleValueChange(e.target.value)}
                className="bg-white"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>รายละเอียดส่วนลด (ถ้ามี)</Label>
            <Input
              value={discount.description || ""}
              onChange={(e) => handleDescriptionChange(e.target.value)}
              placeholder="เช่น ส่วนลดพิเศษลูกค้าประจำ, โปรโมชั่น..."
              className="bg-white"
            />
          </div>

          <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-muted-foreground mb-1">ยอดก่อนส่วนลด</div>
                <div className="text-lg">
                  ฿{totalBeforeDiscount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">ส่วนลด</div>
                <div className="text-lg text-red-600">
                  - ฿{discountAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-green-300">
              <div className="text-sm text-muted-foreground mb-1">ยอดหลังหักส่วนลด</div>
              <div className="text-2xl text-green-600">
                ฿{totalAfterDiscount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        </div>
      )}

      {!discount && (
        <div className="text-center py-8 text-muted-foreground">
          <p>ไม่มีส่วนลด</p>
          <p className="text-xs mt-1">เปิดใช้งานเพื่อเพิ่มส่วนลดให้ลูกค้า</p>
        </div>
      )}
    </Card>
  );
}
