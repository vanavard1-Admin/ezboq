import { useState, useEffect } from "react";
import { BankInfo } from "../types/boq";
import { Card } from "./ui/card";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Button } from "./ui/button";
import { Building2, Upload, X, Save, History, Trash2 } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "./ui/dialog";
import { toast } from "sonner";

// Thai Bank Logos (Local Assets) - All 13 Thai Banks ✨
import bblLogo from "figma:asset/fadd9dc0740fb66d5a878e5c893baa40b7dcb1bc.png";
import kbankLogo from "figma:asset/488b498ba5935792d919b439aab3dac5bf9d4ff4.png";
import scbLogo from "figma:asset/88947f66cf09dfc5ffdea36a46589f96795afa79.png";
import ktbLogo from "figma:asset/cb8c26bebb82791967f0d4e43dd3fbef38107e6f.png";
import bayLogo from "figma:asset/c5b09aad632975bb81cee4f20a313533f1e71c08.png";
import ttbLogo from "figma:asset/da88111e2b08fde4744254a4c261ba41a71a3661.png";
import gsbLogo from "figma:asset/fd7d0e259ebb09f87a7f38ea990cdee44cce9c91.png";
import ghbLogo from "figma:asset/940641362518fdabc2f6a603989b034988c49647.png";
import kkpLogo from "figma:asset/231ed4fbf6b1517160b9564cf0f729a7f1fdfe8a.png";
import cimbLogo from "figma:asset/2cb98a6456fc73f067bf1f0d0cb01acc0ed0992c.png";
import tiscoLogo from "figma:asset/f4ce5ef98724bf191ce5a2414bc326bdda5115d5.png";
import uobLogo from "figma:asset/78c39903cf6bd383a0f776334b51a795cc3c41f1.png";
import lhbankLogo from "figma:asset/8f8338e7187ebdaacd59ce542b79ffa3d34aeb6c.png";

// Payment Method Logos
import trueMoneyLogo from "figma:asset/eeb594d4395f2af7623a575c1bec7e2c709b92b3.png";
import promptPayLogo from "figma:asset/75587e1403b3bf124bee9f0fc393116b64b04b69.png";

interface BankInfoSectionProps {
  bankInfo: BankInfo | null;
  onUpdate: (info: BankInfo | null) => void;
}

interface SavedBankAccount extends BankInfo {
  id: string;
  savedAt: number;
}

const THAI_BANKS = [
  "ธนาคารกรุงเทพ",
  "ธนาคารกสิกรไทย",
  "ธนาคารไทยพาณิชย์",
  "ธนาคารกรุงไทย",
  "ธนาคารกรุงศรีอยุธยา",
  "ธนาคารทหารไทยธนชาต",
  "ธนาคารออมสิน",
  "ธนาคารอาคารสงเคราะห์",
  "ธนาคารเกียรตินาคินภัทร",
  "ธนาคารซีไอเอ็มบี ไทย",
  "ธนาคารทิสโก้",
  "ธนาคารยูโอบี",
  "ธนาคารแลนด์ แอนด์ เฮ้าส์",
];

// Bank logos mapping - ALL 13 Thai banks with local high-quality logos! 🎉💯
const BANK_LOGOS: Record<string, string> = {
  "ธนาคารกรุงเทพ": bblLogo,
  "ธนาคารกสิกรไทย": kbankLogo,
  "ธนาคารไทยพาณิชย์": scbLogo,
  "ธนาคารกรุงไทย": ktbLogo,
  "ธนาคารกรุงศรีอยุธยา": bayLogo,
  "ธนาคารทหารไทยธนชาต": ttbLogo,
  "ธนาคารออมสิน": gsbLogo,
  "ธนาคารอาคารสงเคราะห์": ghbLogo,
  "ธนาคารเกียรตินาคินภัทร": kkpLogo,
  "ธนาคารซีไอเอ็มบี ไทย": cimbLogo,
  "ธนาคารทิสโก้": tiscoLogo,
  "ธนาคารยูโอบี": uobLogo,
  "ธนาคารแลนด์ แอนด์ เฮ้าส์": lhbankLogo,
};

const STORAGE_KEY = "boq_saved_bank_accounts";

export function BankInfoSection({ bankInfo, onUpdate }: BankInfoSectionProps) {
  const [qrPreview, setQrPreview] = useState<string | null>(bankInfo?.qrCodeUrl || null);
  const [savedAccounts, setSavedAccounts] = useState<SavedBankAccount[]>([]);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);

  useEffect(() => {
    loadSavedAccounts();
  }, []);

  const loadSavedAccounts = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setSavedAccounts(JSON.parse(saved));
      }
    } catch (error) {
      console.error("Failed to load saved accounts:", error);
    }
  };

  const saveCurrentAccount = () => {
    if (!bankInfo || !bankInfo.bankName || !bankInfo.accountNumber) {
      toast.error("กรุณากรอกข้อมูลธนาคารและเลขบัญชีให้ครบ");
      return;
    }

    const newAccount: SavedBankAccount = {
      ...bankInfo,
      id: `bank-${Date.now()}`,
      savedAt: Date.now(),
    };

    const updated = [newAccount, ...savedAccounts.filter(
      acc => acc.accountNumber !== bankInfo.accountNumber
    )];

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setSavedAccounts(updated);
    toast.success("บันทึกข้อมูลบัญชีเรียบร้อย!");
  };

  const loadAccount = (account: SavedBankAccount) => {
    onUpdate({
      bankName: account.bankName,
      accountName: account.accountName,
      accountNumber: account.accountNumber,
      branch: account.branch,
      qrCodeUrl: account.qrCodeUrl,
    });
    setQrPreview(account.qrCodeUrl || null);
    setIsHistoryDialogOpen(false);
    toast.success("โหลดข้อมูลบัญชีเรียบร้อย!");
  };

  const deleteAccount = (id: string) => {
    const updated = savedAccounts.filter(acc => acc.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setSavedAccounts(updated);
    toast.success("ลบบัญชีเรียบร้อย!");
  };

  const handleFieldChange = (field: keyof BankInfo, value: string) => {
    onUpdate({
      bankName: bankInfo?.bankName || "",
      accountName: bankInfo?.accountName || "",
      accountNumber: bankInfo?.accountNumber || "",
      branch: bankInfo?.branch,
      qrCodeUrl: bankInfo?.qrCodeUrl,
      [field]: value,
    });
  };

  const handleQRUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setQrPreview(base64);
        handleFieldChange("qrCodeUrl", base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveQR = () => {
    setQrPreview(null);
    handleFieldChange("qrCodeUrl", "");
  };

  return (
    <>
      <Card className="p-6 bg-white/80 backdrop-blur-sm shadow-lg border-blue-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-lg">
              <Building2 className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                ข้อมูลบัญชีธนาคาร
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                สำหรับรับชำระเงิน
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            {savedAccounts.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsHistoryDialogOpen(true)}
                className="gap-2"
              >
                <History className="h-4 w-4" />
                ประวัติ ({savedAccounts.length})
              </Button>
            )}
            <Button
              variant="default"
              size="sm"
              onClick={saveCurrentAccount}
              className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600"
            >
              <Save className="h-4 w-4" />
              บันทึก
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          {/* Selected Bank Display with Logo */}
          {bankInfo?.bankName && BANK_LOGOS[bankInfo.bankName] && (
            <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-200">
              <div className="shrink-0 w-16 h-16 flex items-center justify-center bg-white rounded-lg shadow-sm p-2">
                <img 
                  src={BANK_LOGOS[bankInfo.bankName]} 
                  alt={bankInfo.bankName}
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground">ธนาคารที่เลือก</p>
                <p className="font-semibold text-blue-700 truncate">{bankInfo.bankName}</p>
              </div>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>ธนาคาร *</Label>
              <Select 
                value={bankInfo?.bankName || ""} 
                onValueChange={(value) => handleFieldChange("bankName", value)}
              >
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="เลือกธนาคาร" />
                </SelectTrigger>
                <SelectContent>
                  {THAI_BANKS.map((bank) => (
                    <SelectItem key={bank} value={bank}>
                      <div className="flex items-center gap-2">
                        {BANK_LOGOS[bank] && (
                          <img 
                            src={BANK_LOGOS[bank]} 
                            alt={bank}
                            className="w-6 h-6 object-contain"
                          />
                        )}
                        <span>{bank}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>สาขา (ถ้ามี)</Label>
              <Input
                value={bankInfo?.branch || ""}
                onChange={(e) => handleFieldChange("branch", e.target.value)}
                placeholder="เช่น สาขาสีลม"
                className="bg-white"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>ชื่อบัญชี *</Label>
            <Input
              value={bankInfo?.accountName || ""}
              onChange={(e) => handleFieldChange("accountName", e.target.value)}
              placeholder="ระบุชื่อบัญชี"
              className="bg-white"
            />
          </div>

          <div className="space-y-2">
            <Label>เลขที่บัญชี *</Label>
            <Input
              value={bankInfo?.accountNumber || ""}
              onChange={(e) => handleFieldChange("accountNumber", e.target.value)}
              placeholder="xxx-x-xxxxx-x"
              className="bg-white"
            />
          </div>

          <div className="space-y-2">
            <Label>QR Code พร้อมเพย์ (ถ้ามี)</Label>
            
            {/* Payment Methods Icons */}
            <div className="flex items-center gap-3 mb-3 p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
              <span className="text-sm text-muted-foreground">รองรับ:</span>
              <div className="flex items-center gap-2">
                <img src={promptPayLogo} alt="PromptPay" className="h-8 w-8 object-contain" title="PromptPay" />
                <img src={trueMoneyLogo} alt="TrueMoney Wallet" className="h-8 object-contain" title="TrueMoney Wallet" />
                <span className="text-xs text-muted-foreground ml-1">และช่องทางอื่นๆ</span>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              {qrPreview ? (
                <div className="relative">
                  <img 
                    src={qrPreview} 
                    alt="QR Code" 
                    className="w-40 h-40 object-contain border rounded-lg bg-white"
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                    onClick={handleRemoveQR}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <label className="flex-1 cursor-pointer">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 hover:bg-blue-50/50 transition-colors">
                    <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm text-muted-foreground">
                      คลิกเพื่ออัพโหลด QR Code
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      PNG, JPG (แนะนำ 500x500px)
                    </p>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleQRUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-700">
              💡 <strong>คำแนะนำ:</strong> คลิกปุ่ม "บันทึก" เพื่อเก็บข้อมูลบัญชีไว้ใช้ครั้งถัดไป - ไม่ต้องกรอกใหม่ทุกครั้ง!
            </p>
          </div>
        </div>
      </Card>

      {/* History Dialog */}
      <Dialog open={isHistoryDialogOpen} onOpenChange={setIsHistoryDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              บัญชีธนาคารที่บันทึกไว้
            </DialogTitle>
            <DialogDescription>
              เลือกบัญชีที่ต้องการใช้งาน
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {savedAccounts.map((account) => (
              <Card
                key={account.id}
                className="p-4 hover:bg-blue-50 transition-colors cursor-pointer"
                onClick={() => loadAccount(account)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {BANK_LOGOS[account.bankName] ? (
                        <img 
                          src={BANK_LOGOS[account.bankName]} 
                          alt={account.bankName}
                          className="w-8 h-8 object-contain"
                        />
                      ) : (
                        <Building2 className="w-4 h-4 text-blue-600" />
                      )}
                      <p className="font-semibold">{account.bankName}</p>
                      {account.branch && (
                        <span className="text-sm text-muted-foreground">
                          ({account.branch})
                        </span>
                      )}
                    </div>
                    <p className="text-sm">
                      <span className="text-muted-foreground">ชื่อบัญชี:</span>{" "}
                      {account.accountName}
                    </p>
                    <p className="text-sm">
                      <span className="text-muted-foreground">เลขที่:</span>{" "}
                      {account.accountNumber}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      บันทึกเมื่อ:{" "}
                      {new Date(account.savedAt).toLocaleDateString("th-TH")}
                    </p>
                  </div>

                  <div className="flex items-start gap-2">
                    {account.qrCodeUrl && (
                      <img
                        src={account.qrCodeUrl}
                        alt="QR"
                        className="w-16 h-16 object-contain border rounded"
                      />
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteAccount(account.id);
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsHistoryDialogOpen(false)}
            >
              ปิด
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
