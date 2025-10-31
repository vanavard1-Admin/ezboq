import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { CompanyInfo, CustomerInfo, ProjectSettings, Profile } from "../types/boq";
import { Settings, Building2, User, FileText, Percent, Upload, X } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Switch } from "./ui/switch";
import { Textarea } from "./ui/textarea";
import { Card } from "./ui/card";

interface SettingsDialogProps {
  company: CompanyInfo;
  customer: CustomerInfo;
  settings: ProjectSettings;
  profile: Profile;
  onUpdateCompany: (company: CompanyInfo) => void;
  onUpdateCustomer: (customer: CustomerInfo) => void;
  onUpdateSettings: (settings: ProjectSettings) => void;
  onUpdateProfile: (profile: Profile) => void;
}

export function SettingsDialog({
  company,
  customer,
  settings,
  profile,
  onUpdateCompany,
  onUpdateCustomer,
  onUpdateSettings,
  onUpdateProfile,
}: SettingsDialogProps) {
  const [open, setOpen] = useState(false);
  const [localCompany, setLocalCompany] = useState(company);
  const [localCustomer, setLocalCustomer] = useState(customer);
  const [localSettings, setLocalSettings] = useState(settings);
  const [localProfile, setLocalProfile] = useState(profile);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLocalSettings({ ...localSettings, logoUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const clearLogo = () => {
    setLocalSettings({ ...localSettings, logoUrl: undefined });
  };

  const handleSave = () => {
    onUpdateCompany(localCompany);
    onUpdateCustomer(localCustomer);
    onUpdateSettings(localSettings);
    onUpdateProfile(localProfile);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Settings className="h-4 w-4" />
          ตั้งค่า
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>ตั้งค่าโครงการ</DialogTitle>
          <DialogDescription>
            จัดการข้อมูลบริษัท ลูกค้า การตั้งค่าเอกสาร และการคำนวณ
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="company" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="company" className="gap-2">
              <Building2 className="h-4 w-4" />
              บริษัท
            </TabsTrigger>
            <TabsTrigger value="customer" className="gap-2">
              <User className="h-4 w-4" />
              ลูกค้า
            </TabsTrigger>
            <TabsTrigger value="document" className="gap-2">
              <FileText className="h-4 w-4" />
              เอกสาร
            </TabsTrigger>
            <TabsTrigger value="calculation" className="gap-2">
              <Percent className="h-4 w-4" />
              การคำนวณ
            </TabsTrigger>
          </TabsList>

          {/* Company Tab */}
          <TabsContent value="company" className="space-y-4">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="companyName">ชื่อบริษัท *</Label>
                <Input
                  id="companyName"
                  value={localCompany.name}
                  onChange={(e) => setLocalCompany({ ...localCompany, name: e.target.value })}
                  placeholder="บริษัท ABC จำกัด"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="companyAddress">ที่อยู่ *</Label>
                <Textarea
                  id="companyAddress"
                  value={localCompany.address}
                  onChange={(e) => setLocalCompany({ ...localCompany, address: e.target.value })}
                  placeholder="123 ถนน... แขวง... เขต... กรุงเทพฯ 10000"
                  rows={3}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="companyTaxId">เลขที่ผู้เสียภาษี *</Label>
                <Input
                  id="companyTaxId"
                  value={localCompany.taxId}
                  onChange={(e) => setLocalCompany({ ...localCompany, taxId: e.target.value })}
                  placeholder="0-0000-00000-00-0"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="companyPhone">เบอร์โทร *</Label>
                  <Input
                    id="companyPhone"
                    value={localCompany.phone}
                    onChange={(e) => setLocalCompany({ ...localCompany, phone: e.target.value })}
                    placeholder="02-xxx-xxxx"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="companyEmail">อีเมล *</Label>
                  <Input
                    id="companyEmail"
                    type="email"
                    value={localCompany.email}
                    onChange={(e) => setLocalCompany({ ...localCompany, email: e.target.value })}
                    placeholder="info@company.com"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="companyWebsite">เว็บไซต์</Label>
                <Input
                  id="companyWebsite"
                  value={localCompany.website || ""}
                  onChange={(e) => setLocalCompany({ ...localCompany, website: e.target.value })}
                  placeholder="www.company.com"
                />
              </div>
            </div>
          </TabsContent>

          {/* Customer Tab */}
          <TabsContent value="customer" className="space-y-4">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label>ประเภทลูกค้า *</Label>
                <RadioGroup
                  value={localCustomer.type}
                  onValueChange={(value: "individual" | "company") =>
                    setLocalCustomer({ ...localCustomer, type: value })
                  }
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="individual" id="individual" />
                    <Label htmlFor="individual">บุคคลธรรมดา</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="company" id="company" />
                    <Label htmlFor="company">นิติบุคคล</Label>
                  </div>
                </RadioGroup>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="customerName">
                  {localCustomer.type === "individual" ? "ชื่อ-นามสกุล" : "ชื่อบริษัท"} *
                </Label>
                <Input
                  id="customerName"
                  value={localCustomer.name}
                  onChange={(e) => setLocalCustomer({ ...localCustomer, name: e.target.value })}
                  placeholder={localCustomer.type === "individual" ? "นาย/นาง..." : "บริษัท..."}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="customerAddress">ที่อยู่ *</Label>
                <Textarea
                  id="customerAddress"
                  value={localCustomer.address}
                  onChange={(e) => setLocalCustomer({ ...localCustomer, address: e.target.value })}
                  placeholder="ที่อยู่ลูกค้า..."
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="customerPhone">เบอร์โทร *</Label>
                  <Input
                    id="customerPhone"
                    value={localCustomer.phone}
                    onChange={(e) => setLocalCustomer({ ...localCustomer, phone: e.target.value })}
                    placeholder="08x-xxx-xxxx"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="customerEmail">อีเมล</Label>
                  <Input
                    id="customerEmail"
                    type="email"
                    value={localCustomer.email || ""}
                    onChange={(e) => setLocalCustomer({ ...localCustomer, email: e.target.value })}
                    placeholder="customer@email.com"
                  />
                </div>
              </div>
              {localCustomer.type === "company" && (
                <div className="grid gap-2">
                  <Label htmlFor="customerTaxId">เลขที่ผู้เสียภาษี</Label>
                  <Input
                    id="customerTaxId"
                    value={localCustomer.taxId || ""}
                    onChange={(e) => setLocalCustomer({ ...localCustomer, taxId: e.target.value })}
                    placeholder="0-0000-00000-00-0"
                  />
                </div>
              )}
            </div>
          </TabsContent>

          {/* Document Settings Tab */}
          <TabsContent value="document" className="space-y-4">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label>ขนาดกระดาษ</Label>
                <RadioGroup
                  value={localSettings.paperSize}
                  onValueChange={(value: "A3" | "A4") =>
                    setLocalSettings({ ...localSettings, paperSize: value })
                  }
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="A4" id="a4" />
                    <Label htmlFor="a4">A4 (210 x 297 มม.)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="A3" id="a3" />
                    <Label htmlFor="a3">A3 (297 x 420 มม.)</Label>
                  </div>
                </RadioGroup>
              </div>
              
              <div className="grid gap-2">
                <Label>การวางกระดาษ</Label>
                <RadioGroup
                  value={localSettings.orientation}
                  onValueChange={(value: "portrait" | "landscape") =>
                    setLocalSettings({ ...localSettings, orientation: value })
                  }
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="portrait" id="portrait" />
                    <Label htmlFor="portrait">แนวตั้ง (Portrait)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="landscape" id="landscape" />
                    <Label htmlFor="landscape">แนวนอน (Landscape)</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="grid gap-2">
                <Label>โลโก้บริษัท</Label>
                {localSettings.logoUrl ? (
                  <Card className="p-4 relative">
                    <img 
                      src={localSettings.logoUrl} 
                      alt="Company Logo" 
                      className="max-h-32 mx-auto"
                    />
                    <Button
                      size="sm"
                      variant="destructive"
                      className="absolute top-2 right-2"
                      onClick={clearLogo}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Card>
                ) : (
                  <div className="border-2 border-dashed rounded-lg p-6 text-center">
                    <input
                      type="file"
                      accept="image/*"
                      id="logo-upload"
                      className="hidden"
                      onChange={handleLogoUpload}
                    />
                    <label htmlFor="logo-upload" className="cursor-pointer">
                      <Upload className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">คลิกเพื่ออัพโหลดโลโก้บริษัท</p>
                      <p className="text-xs text-muted-foreground mt-1">PNG, JPG (แนะนำขนาด 300x100 px)</p>
                    </label>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>แสดงโลโก้</Label>
                  <div className="text-sm text-muted-foreground">
                    แสดงโลโก้บริษัทในเอกสาร
                  </div>
                </div>
                <Switch
                  checked={localSettings.showLogo}
                  onCheckedChange={(checked) =>
                    setLocalSettings({ ...localSettings, showLogo: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>แสดงเลขที่ผู้เสียภาษี</Label>
                  <div className="text-sm text-muted-foreground">
                    แสดงเลขที่ผู้เสียภาษีในเอกสาร
                  </div>
                </div>
                <Switch
                  checked={localSettings.showTaxId}
                  onCheckedChange={(checked) =>
                    setLocalSettings({ ...localSettings, showTaxId: checked })
                  }
                />
              </div>
            </div>
          </TabsContent>

          {/* Calculation Tab */}
          <TabsContent value="calculation" className="space-y-4">
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="wastePct">ค่าของเสีย (%)</Label>
                  <Input
                    id="wastePct"
                    type="number"
                    min="0"
                    step="0.1"
                    value={localProfile.wastePct}
                    onChange={(e) =>
                      setLocalProfile({ ...localProfile, wastePct: parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="opexPct">ค่าดำเนินการ (%)</Label>
                  <Input
                    id="opexPct"
                    type="number"
                    min="0"
                    step="0.1"
                    value={localProfile.opexPct}
                    onChange={(e) =>
                      setLocalProfile({ ...localProfile, opexPct: parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="errorPct">ค่าความคลาดเคลื่อน (%)</Label>
                  <Input
                    id="errorPct"
                    type="number"
                    min="0"
                    step="0.1"
                    value={localProfile.errorPct}
                    onChange={(e) =>
                      setLocalProfile({ ...localProfile, errorPct: parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="markupPct">กำไร (%)</Label>
                  <Input
                    id="markupPct"
                    type="number"
                    min="0"
                    step="0.1"
                    value={localProfile.markupPct}
                    onChange={(e) =>
                      setLocalProfile({ ...localProfile, markupPct: parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="vatPct">VAT (%)</Label>
                <Input
                  id="vatPct"
                  type="number"
                  min="0"
                  step="0.1"
                  value={localProfile.vatPct}
                  onChange={(e) =>
                    setLocalProfile({ ...localProfile, vatPct: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex gap-2 justify-end pt-4 border-t">
          <Button variant="outline" onClick={() => setOpen(false)}>
            ยกเลิก
          </Button>
          <Button onClick={handleSave}>บันทึก</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
