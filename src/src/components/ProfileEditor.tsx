import { Card } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Profile } from "../types/boq";
import { Percent, TrendingUp, AlertCircle, DollarSign, Receipt } from "lucide-react";

interface ProfileEditorProps {
  profile: Profile;
  onUpdate: (profile: Profile) => void;
}

export function ProfileEditor({ profile, onUpdate }: ProfileEditorProps) {
  const handleChange = (field: keyof Profile, value: string) => {
    const numValue = parseFloat(value) || 0;
    onUpdate({ ...profile, [field]: numValue });
  };

  return (
    <Card className="p-6 bg-white/80 backdrop-blur-sm shadow-lg border-amber-100">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 bg-gradient-to-br from-amber-100 to-orange-100 rounded-lg">
          <Percent className="h-5 w-5 text-amber-600" />
        </div>
        <div>
          <h3 className="bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
            การคำนวณและกำไร
          </h3>
          <p className="text-xs text-muted-foreground">แก้ไขเปอร์เซ็นต์ตามต้องการ</p>
        </div>
      </div>

      <div className="grid gap-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="wastePct" className="flex items-center gap-2 text-sm">
              <AlertCircle className="h-3 w-3 text-orange-600" />
              ค่าของเสีย (%)
            </Label>
            <Input
              id="wastePct"
              type="number"
              min="0"
              step="0.1"
              value={profile.wastePct}
              onChange={(e) => handleChange('wastePct', e.target.value)}
              className="bg-white"
            />
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="opexPct" className="flex items-center gap-2 text-sm">
              <DollarSign className="h-3 w-3 text-blue-600" />
              ค่าดำเนินการ (%)
            </Label>
            <Input
              id="opexPct"
              type="number"
              min="0"
              step="0.1"
              value={profile.opexPct}
              onChange={(e) => handleChange('opexPct', e.target.value)}
              className="bg-white"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="errorPct" className="flex items-center gap-2 text-sm">
              <AlertCircle className="h-3 w-3 text-red-600" />
              ค่าความคลาดเคลื่อน (%)
            </Label>
            <Input
              id="errorPct"
              type="number"
              min="0"
              step="0.1"
              value={profile.errorPct}
              onChange={(e) => handleChange('errorPct', e.target.value)}
              className="bg-white"
            />
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="markupPct" className="flex items-center gap-2 text-sm">
              <TrendingUp className="h-3 w-3 text-green-600" />
              กำไร (%)
            </Label>
            <Input
              id="markupPct"
              type="number"
              min="0"
              step="0.1"
              value={profile.markupPct}
              onChange={(e) => handleChange('markupPct', e.target.value)}
              className="bg-white"
            />
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="vatPct" className="flex items-center gap-2 text-sm">
            <Receipt className="h-3 w-3 text-purple-600" />
            VAT (%)
          </Label>
          <Input
            id="vatPct"
            type="number"
            min="0"
            step="0.1"
            value={profile.vatPct}
            onChange={(e) => handleChange('vatPct', e.target.value)}
            className="bg-white"
          />
        </div>

        <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-3 rounded-lg border border-amber-200">
          <div className="text-xs text-muted-foreground mb-1">ตัวอย่างการคำนวณ (ฐาน ฿100,000)</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>ค่าของเสีย: ฿{(100000 * profile.wastePct / 100).toLocaleString('th-TH', {maximumFractionDigits: 0})}</div>
            <div>ค่าดำเนินการ: ฿{(100000 * profile.opexPct / 100).toLocaleString('th-TH', {maximumFractionDigits: 0})}</div>
            <div>ค่าความคลาดเคลื่อน: ฿{(100000 * profile.errorPct / 100).toLocaleString('th-TH', {maximumFractionDigits: 0})}</div>
            <div>กำไร: ฿{(100000 * (1 + (profile.wastePct + profile.opexPct + profile.errorPct) / 100) * profile.markupPct / 100).toLocaleString('th-TH', {maximumFractionDigits: 0})}</div>
          </div>
        </div>
      </div>
    </Card>
  );
}
