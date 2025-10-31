import { useState } from "react";
import { PaymentTerms, PaymentTerm } from "../types/boq";
import { Card } from "./ui/card";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { CalendarDays, Plus, Trash2, Percent, DollarSign, Sparkles, Zap } from "lucide-react";
import { Badge } from "./ui/badge";
import { calculatePaymentTermAmount, calculateBalancedPaymentTerms, validatePaymentBalance } from "../utils/calculations";
import { toast } from "sonner@2.0.3";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";

interface PaymentTermsSectionProps {
  paymentTerms: PaymentTerms | null;
  grandTotal: number;
  onUpdate: (terms: PaymentTerms | null) => void;
}

export function PaymentTermsSection({ paymentTerms, grandTotal, onUpdate }: PaymentTermsSectionProps) {
  const [mode, setMode] = useState<"percent" | "amount">("percent");

  // 🎯 Quick Split Presets - แบ่งงวดแบบยอดนิยม
  const quickSplitPresets = [
    { label: "2 งวด (50-50)", installments: [50, 50] },
    { label: "2 งวด (70-30)", installments: [70, 30] },
    { label: "2 งวด (80-20)", installments: [80, 20] },
    { label: "3 งวด (30-40-30)", installments: [30, 40, 30] },
    { label: "3 งวด (40-40-20)", installments: [40, 40, 20] },
    { label: "3 งวด (50-40-10)", installments: [50, 40, 10] },
    { label: "3 งวด (33-33-34)", installments: [33.33, 33.33, 33.34] },
    { label: "4 งวด (30-30-30-10)", installments: [30, 30, 30, 10] },
    { label: "4 งวด (25-25-25-25)", installments: [25, 25, 25, 25] },
    { label: "5 งวด (25-25-25-15-10)", installments: [25, 25, 25, 15, 10] },
    { label: "5 งวด (20-20-20-20-20)", installments: [20, 20, 20, 20, 20] },
  ];

  const applyQuickSplit = (percentages: number[]) => {
    const newTerms: PaymentTerm[] = percentages.map((pct, index) => ({
      id: `term-${Date.now()}-${index}`,
      installment: index + 1,
      percentage: pct,
      description: `งวดที่ ${index + 1}`,
    }));

    onUpdate({
      totalInstallments: newTerms.length,
      terms: newTerms,
    });

    toast.success(`✨ แบ่งงวดชำระเป็น ${percentages.length} งวดแล้ว`);
  };

  const handleAddTerm = () => {
    const newTerm: PaymentTerm = {
      id: `term-${Date.now()}`,
      installment: (paymentTerms?.terms.length || 0) + 1,
      percentage: mode === "percent" ? 0 : undefined,
      amount: mode === "amount" ? 0 : undefined,
      description: `งวดที่ ${(paymentTerms?.terms.length || 0) + 1}`,
    };

    if (paymentTerms) {
      onUpdate({
        ...paymentTerms,
        totalInstallments: paymentTerms.totalInstallments + 1,
        terms: [...paymentTerms.terms, newTerm],
      });
    } else {
      onUpdate({
        totalInstallments: 1,
        terms: [newTerm],
      });
    }
  };

  const handleRemoveTerm = (id: string) => {
    if (!paymentTerms) return;
    const newTerms = paymentTerms.terms.filter(t => t.id !== id);
    // Re-number installments
    newTerms.forEach((term, index) => {
      term.installment = index + 1;
    });
    
    if (newTerms.length === 0) {
      onUpdate(null);
    } else {
      onUpdate({
        totalInstallments: newTerms.length,
        terms: newTerms,
      });
    }
  };

  const handleUpdateTerm = (id: string, updates: Partial<PaymentTerm>) => {
    if (!paymentTerms) return;
    onUpdate({
      ...paymentTerms,
      terms: paymentTerms.terms.map(t => t.id === id ? { ...t, ...updates } : t),
    });
  };

  // ✅ Use centralized calculation with Decimal.js
  const calculateTermAmount = (term: PaymentTerm): number => {
    return calculatePaymentTermAmount(grandTotal, term.percentage, term.amount);
  };

  // ✅ Smart balancing calculation
  const balancedAmounts = paymentTerms?.terms 
    ? calculateBalancedPaymentTerms(grandTotal, paymentTerms.terms)
    : [];

  const validation = validatePaymentBalance(
    grandTotal,
    balancedAmounts
  );

  const totalAllocated = validation.totalAllocated;
  const remaining = validation.difference;

  // ฟังก์ชันปรับงวดสุดท้ายให้ลงตัว
  const handleAutoBalance = () => {
    if (!paymentTerms || paymentTerms.terms.length === 0) {
      toast.error("ไม่มีงวดชำระให้ปรับสมดุล");
      return;
    }

    // คำนวณยอดที่ถูกต้องด้วย Smart Balancing
    const balanced = calculateBalancedPaymentTerms(grandTotal, paymentTerms.terms);
    
    // อัปเดตงวดสุดท้ายให้เป็นจำนวนที่ถูกต้อง
    const updatedTerms = paymentTerms.terms.map((term, index) => {
      if (index === paymentTerms.terms.length - 1) {
        // งวดสุดท้าย - ใช้ยอดที่คำนวณแล้ว
        return {
          ...term,
          amount: balanced[index],
          percentage: undefined, // เปลี่ยนจาก % เป็นจำนวนเงินคงที่
        };
      }
      return term;
    });

    onUpdate({
      ...paymentTerms,
      terms: updatedTerms,
    });

    toast.success("✨ ปรับงวดสุดท้ายให้ลงตัวแล้ว!");
  };

  return (
    <Card className="p-6 bg-white/80 backdrop-blur-sm shadow-lg border-orange-100">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h3 className="bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
            แผนการชำระเงิน
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            กำหนดงวดการชำระเงิน (ถ้าต้องการแบ่งชำระ)
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={mode} onValueChange={(v: "percent" | "amount") => setMode(v)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="percent">
                <div className="flex items-center gap-2">
                  <Percent className="h-4 w-4" />
                  <span>เปอร์เซ็นต์</span>
                </div>
              </SelectItem>
              <SelectItem value="amount">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  <span>จำนวนเงิน</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Quick Split Presets */}
          <Popover>
            <PopoverTrigger asChild>
              <Button size="sm" variant="outline" className="gap-2 border-purple-300 hover:bg-purple-50">
                <Zap className="h-4 w-4 text-purple-500" />
                <span className="hidden sm:inline">แบ่งงวดด่วน</span>
                <span className="sm:hidden">งวดด่วน</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-3 max-h-[400px] overflow-y-auto">
              <div className="space-y-3">
                <div>
                  <h4 className="text-sm font-semibold mb-1 text-purple-900">⚡ แบ่งงวดด่วน</h4>
                  <p className="text-xs text-muted-foreground">เลือกรูปแบบแบ่งงวดที่ต้องการ</p>
                </div>
                
                {/* 2 งวด */}
                <div className="space-y-1">
                  <p className="text-xs font-medium text-purple-700 px-2">2 งวด</p>
                  {quickSplitPresets
                    .filter(p => p.installments.length === 2)
                    .map((preset, idx) => (
                      <Button
                        key={idx}
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start text-xs hover:bg-purple-50 h-8"
                        onClick={() => applyQuickSplit(preset.installments)}
                      >
                        {preset.label}
                      </Button>
                    ))}
                </div>

                {/* 3 งวด */}
                <div className="space-y-1">
                  <p className="text-xs font-medium text-purple-700 px-2">3 งวด</p>
                  {quickSplitPresets
                    .filter(p => p.installments.length === 3)
                    .map((preset, idx) => (
                      <Button
                        key={idx}
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start text-xs hover:bg-purple-50 h-8"
                        onClick={() => applyQuickSplit(preset.installments)}
                      >
                        {preset.label}
                      </Button>
                    ))}
                </div>

                {/* 4 งวด */}
                <div className="space-y-1">
                  <p className="text-xs font-medium text-purple-700 px-2">4 งวด</p>
                  {quickSplitPresets
                    .filter(p => p.installments.length === 4)
                    .map((preset, idx) => (
                      <Button
                        key={idx}
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start text-xs hover:bg-purple-50 h-8"
                        onClick={() => applyQuickSplit(preset.installments)}
                      >
                        {preset.label}
                      </Button>
                    ))}
                </div>

                {/* 5 งวด */}
                <div className="space-y-1">
                  <p className="text-xs font-medium text-purple-700 px-2">5 งวด</p>
                  {quickSplitPresets
                    .filter(p => p.installments.length === 5)
                    .map((preset, idx) => (
                      <Button
                        key={idx}
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start text-xs hover:bg-purple-50 h-8"
                        onClick={() => applyQuickSplit(preset.installments)}
                      >
                        {preset.label}
                      </Button>
                    ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {paymentTerms && paymentTerms.terms.length > 0 && !validation.balanced && (
            <Button 
              onClick={handleAutoBalance} 
              size="sm" 
              variant="outline"
              className="gap-2 bg-gradient-to-r from-amber-50 to-orange-50 border-orange-300 hover:from-amber-100 hover:to-orange-100"
            >
              <Sparkles className="h-4 w-4 text-orange-500" />
              <span>ปรับให้ลงตัว</span>
            </Button>
          )}
          <Button onClick={handleAddTerm} size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            เพิ่มงวด
          </Button>
        </div>
      </div>

      {paymentTerms && paymentTerms.terms.length > 0 ? (
        <div className="space-y-4">
          <div className="space-y-3">
            {paymentTerms.terms.map((term, index) => (
              <div
                key={term.id}
                className="p-4 border rounded-lg bg-gradient-to-r from-orange-50 to-red-50"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <Badge className="bg-gradient-to-r from-orange-500 to-red-500">
                      งวดที่ {term.installment}
                    </Badge>
                  </div>
                  <div className="flex-1 grid gap-3">
                    <div className="grid md:grid-cols-3 gap-3">
                      {mode === "percent" ? (
                        <div className="space-y-1">
                          <Label className="text-xs">เปอร์เซ็นต์ (%)</Label>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            value={term.percentage || 0}
                            onChange={(e) => handleUpdateTerm(term.id, { 
                              percentage: parseFloat(e.target.value) || 0,
                              amount: undefined 
                            })}
                            className="bg-white"
                          />
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <Label className="text-xs">จำนวนเงิน (฿)</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={term.amount || 0}
                            onChange={(e) => handleUpdateTerm(term.id, { 
                              amount: parseFloat(e.target.value) || 0,
                              percentage: undefined 
                            })}
                            className="bg-white"
                          />
                        </div>
                      )}
                      <div className="space-y-1">
                        <Label className="text-xs">จำนวนเงินงวดนี้</Label>
                        <Input
                          value={`฿${balancedAmounts[index]?.toLocaleString('th-TH', { minimumFractionDigits: 2 }) || '0.00'}`}
                          disabled
                          className="bg-muted"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">กำหนดชำระ</Label>
                        <div className="relative">
                          <CalendarDays className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            type="date"
                            value={term.dueDate || ""}
                            onChange={(e) => handleUpdateTerm(term.id, { dueDate: e.target.value })}
                            className="bg-white pl-8"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">รายละเอียด</Label>
                      <div className="flex gap-2">
                        <Input
                          value={term.description}
                          onChange={(e) => handleUpdateTerm(term.id, { description: e.target.value })}
                          placeholder="เช่น มัดจำ, งวดดำเนินการ, งวดส่งมอบ..."
                          className="bg-white flex-1"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleRemoveTerm(term.id)}
                          className="flex-shrink-0 hover:bg-red-50 hover:text-red-600 hover:border-red-300"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-gradient-to-r from-orange-100 to-red-100 p-4 rounded-lg border-2 border-orange-300">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="text-sm text-muted-foreground mb-1">ยอดรวมทั้งหมด</div>
                <div className="text-lg">
                  ฿{grandTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">จัดสรรแล้ว</div>
                <div className={`text-lg ${remaining < 0 ? 'text-red-600' : 'text-green-600'}`}>
                  ฿{totalAllocated.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">
                  {remaining > 0 ? 'คงเหลือ' : remaining < 0 ? 'เกิน!' : 'สมดุล'}
                </div>
                <div className={`text-lg ${
                  remaining > 0 ? 'text-orange-600' : 
                  remaining < 0 ? 'text-red-600' : 
                  'text-green-600'
                }`}>
                  ฿{Math.abs(remaining).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>
            {!validation.balanced && (
              <div className="mt-2 text-xs text-center">
                {remaining > 0 ? (
                  <span className="text-orange-700">
                    ⚠️ ยังจัดสรรไม่ครบ {Math.abs(remaining).toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท - 
                    <button 
                      onClick={handleAutoBalance}
                      className="ml-1 underline hover:text-orange-900"
                    >
                      คลิกเพื่อปรับอัตโนมัติ
                    </button>
                  </span>
                ) : (
                  <span className="text-red-700">
                    ⚠️ จัดสรรเกินยอดรวม {Math.abs(remaining).toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท - 
                    <button 
                      onClick={handleAutoBalance}
                      className="ml-1 underline hover:text-red-900"
                    >
                      คลิกเพื่อปรับอัตโนมัติ
                    </button>
                  </span>
                )}
              </div>
            )}
            {validation.balanced && (
              <div className="mt-2 text-xs text-center text-green-700">
                ✅ งวดชำระสมดุลแล้ว
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <p>ไม่มีงวดการชำระ</p>
          <p className="text-xs mt-1">คลิก "เพิ่มงวด" เพื่อกำหนดแผนชำระเงิน</p>
        </div>
      )}
    </Card>
  );
}
