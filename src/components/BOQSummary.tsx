import { Card } from "./ui/card";
import { BOQSummary as BOQSummaryType } from "../types/boq";

interface BOQSummaryProps {
  summary: BOQSummaryType;
}

export function BOQSummary({ summary }: BOQSummaryProps) {
  // Safe number formatting
  const formatNumber = (value: number | undefined) => {
    const safeValue = typeof value === 'number' && isFinite(value) ? value : 0;
    return safeValue.toLocaleString('th-TH', { minimumFractionDigits: 2 });
  };

  return (
    <Card className="p-6">
      <h3 className="mb-4">สรุปยอดรวม</h3>
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>รวมค่าวัสดุ:</span>
          <span>฿{formatNumber(summary.subtotalMaterial)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>รวมค่าแรง:</span>
          <span>฿{formatNumber(summary.subtotalLabor)}</span>
        </div>
        <div className="flex justify-between border-t pt-2">
          <span>รวมย่อย:</span>
          <span>฿{formatNumber(summary.subtotal)}</span>
        </div>
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>+ ค่าของเสีย (3%):</span>
          <span>฿{formatNumber(summary.waste)}</span>
        </div>
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>+ ค่าดำเนินการ (5%):</span>
          <span>฿{formatNumber(summary.opex)}</span>
        </div>
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>+ ค่าความคลาดเคลื่อน (2%):</span>
          <span>฿{formatNumber(summary.error)}</span>
        </div>
        <div className="flex justify-between border-t pt-2">
          <span>รวมก่อนกำไร:</span>
          <span>฿{formatNumber(summary.totalBeforeMarkup)}</span>
        </div>
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>+ กำไร (10%):</span>
          <span>฿{formatNumber(summary.markup)}</span>
        </div>
        <div className="flex justify-between border-t pt-2">
          <span>รวมก่อน VAT:</span>
          <span>฿{formatNumber(summary.totalBeforeVat)}</span>
        </div>
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>+ VAT (7%):</span>
          <span>฿{formatNumber(summary.vat)}</span>
        </div>
        <div className="flex justify-between border-t-2 pt-3 mt-3">
          <span>ราคารวมทั้งสิ้น:</span>
          <span className="text-xl text-primary">
            ฿{formatNumber(summary.grandTotal)}
          </span>
        </div>
      </div>
    </Card>
  );
}
