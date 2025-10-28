import { useState } from "react";
import { PaymentTerms, PaymentTerm } from "../types/boq";
import { Card } from "./ui/card";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { CalendarDays, Plus, Trash2, Percent, DollarSign } from "lucide-react";
import { Badge } from "./ui/badge";

interface PaymentTermsSectionProps {
  paymentTerms: PaymentTerms | null;
  grandTotal: number;
  onUpdate: (terms: PaymentTerms | null) => void;
}

export function PaymentTermsSection({ paymentTerms, grandTotal, onUpdate }: PaymentTermsSectionProps) {
  const [mode, setMode] = useState<"percent" | "amount">("percent");

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

  const calculateTermAmount = (term: PaymentTerm): number => {
    if (term.percentage !== undefined) {
      return grandTotal * (term.percentage / 100);
    }
    return term.amount || 0;
  };

  const totalAllocated = paymentTerms?.terms.reduce((sum, term) => {
    return sum + calculateTermAmount(term);
  }, 0) || 0;

  const remaining = grandTotal - totalAllocated;

  return (
    <Card className="p-6 bg-white/80 backdrop-blur-sm shadow-lg border-orange-100">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
            แผนการชำระเงิน
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            กำหนดงวดการชำระเงิน (ถ้าต้องการแบ่งชำระ)
          </p>
        </div>
        <div className="flex items-center gap-2">
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
                          value={`฿${calculateTermAmount(term).toLocaleString('th-TH', { minimumFractionDigits: 2 })}`}
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
            {remaining !== 0 && (
              <div className="mt-2 text-xs text-center">
                {remaining > 0 ? (
                  <span className="text-orange-700">⚠️ ยังจัดสรรไม่ครบ กรุณาเพิ่มงวดหรือปรับจำนวน</span>
                ) : (
                  <span className="text-red-700">⚠️ จัดสรรเกินยอดรวม กรุณาปรับจำนวน</span>
                )}
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
