/**
 * BankInfoSection Component
 * PRODUCTION-READY (no figma:asset; static SVG only)
 * 
 * ✅ Security: No figma:asset imports
 * ✅ Performance: Static SVG assets with proper dimensions
 * ✅ CLS Prevention: width/height set in BankLogo component
 */

import React, { useState, useCallback } from "react";
import { cn } from "./ui/utils";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { BankLogo, type ThaiBank, BANK_NAMES } from "./BankLogo";
import { Upload, X, QrCode, Loader2 } from "lucide-react";
import { compressImage, getCompressionOptions } from "../utils/imageCompression";
import { toast } from "sonner";
import { analyzePayloadSize } from "../utils/saveOptimizer";

export type BankCode = ThaiBank;

const BANKS: { code: BankCode; name: string }[] = [
  { code: "bbl", name: "ธนาคารกรุงเทพ (BBL)" },
  { code: "kbank", name: "ธนาคารกสิกรไทย (KBANK)" },
  { code: "scb", name: "ธนาคารไทยพาณิชย์ (SCB)" },
  { code: "ktb", name: "ธนาคารกรุงไทย (KTB)" },
  { code: "bay", name: "ธนาคารกรุงศรีอยุธยา (BAY)" },
  { code: "ttb", name: "ธนาคารทหารไทยธนชาต (TTB)" },
  { code: "gsb", name: "ธนาคารออมสิน (GSB)" },
  { code: "ghb", name: "ธนาคารอาคารสงเคราะห์ (GHB)" },
  { code: "kkp", name: "ธนาคารเกียรตินาคินภัทร (KKP)" },
  { code: "cimb", name: "ธนาคารซีไอเอ็มบีไทย (CIMB)" },
  { code: "uob", name: "ธนาคารยูโอบี (UOB)" },
  { code: "tisco", name: "ธนาคารทิสโก้ (TISCO)" },
  { code: "lhbank", name: "ธนาคารแลนด์ แอนด์ เฮ้าส์ (LH Bank)" },
];

export type BankAccount = {
  bankCode: BankCode | "";
  accountName: string;
  accountNumber: string;
  branch?: string;
  qrCodeUrl?: string;
};

interface BankInfoSectionProps {
  value: BankAccount;
  onChange: (next: BankAccount) => void;
  onSave?: () => void;
  disabled?: boolean;
  className?: string;
}

export function BankInfoSection(props: BankInfoSectionProps) {
  const { value, onChange, onSave, disabled, className } = props;
  const [isUploadingQR, setIsUploadingQR] = useState(false);

  // 🔒 Safety: Ensure value is never undefined
  const safeValue = value || {
    bankCode: "",
    accountName: "",
    accountNumber: "",
    branch: "",
    qrCodeUrl: ""
  };

  // 🖼️ QR Code Upload Handler with Performance Monitoring
  const handleQRCodeUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('กรุณาเลือกไฟล์รูปภาพเท่านั้น');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('ไฟล์มีขนาดใหญ่เกิน 5MB');
      return;
    }

    setIsUploadingQR(true);
    const startTime = performance.now();

    try {
      // Compress image with optimized settings for QR Code
      const compressionOptions = getCompressionOptions('qrCode');
      const base64 = await compressImage(file, compressionOptions);

      // Analyze payload size
      const sizeBytes = analyzePayloadSize({ qrCodeUrl: base64 }, 'QR Code');
      const sizeKB = Math.round(sizeBytes / 1024);

      // Performance monitoring
      const duration = performance.now() - startTime;
      console.log(`⚡ QR Code upload: ${duration.toFixed(0)}ms (${sizeKB}KB)`);

      // Warn if QR code is still large
      if (sizeKB > 200) {
        console.warn(`⚠️ QR Code is ${sizeKB}KB (recommended < 150KB)`);
        toast.warning(`QR Code ขนาด ${sizeKB}KB`, {
          description: 'ขนาดใหญ่กว่าปกติ อาจทำให้บันทึกช้าลง แนะนำให้ใช้ไฟล์เล็กกว่า',
          duration: 5000
        });
      } else if (sizeKB > 150) {
        console.warn(`⚠️ QR Code is ${sizeKB}KB (recommended < 150KB)`);
      }

      // Update value with QR code
      onChange({ ...safeValue, qrCodeUrl: base64 });
      
      toast.success(`✅ อัพโหลด QR Code สำเร็จ (${sizeKB}KB)`, {
        description: duration > 1000 ? 'ใช้เวลาในการประมวลผล' : 'บีบอัดและปรับขนาดสำเร็จ'
      });
    } catch (error) {
      console.error('QR Code upload error:', error);
      toast.error('เกิดข้อผิดพลาดในการอัพโหลด QR Code');
    } finally {
      setIsUploadingQR(false);
      // Reset input for re-upload
      event.target.value = '';
    }
  }, [safeValue, onChange]);

  const handleRemoveQRCode = () => {
    onChange({ ...safeValue, qrCodeUrl: undefined });
    toast.success('ลบ QR Code แล้ว');
  };

  return (
    <section className={cn("space-y-4", className)}>
      {/* Bank Selection Grid */}
      <div>
        <Label className="mb-3 block">เลือกธนาคาร</Label>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {BANKS.map((bank) => {
            const isActive = safeValue.bankCode === bank.code;
            return (
              <button
                key={bank.code}
                type="button"
                onClick={() => onChange({ ...safeValue, bankCode: bank.code })}
                disabled={disabled}
                className={cn(
                  "flex flex-col items-center justify-center gap-2 rounded-xl border-2 p-4 transition-all",
                  "hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                  isActive
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border hover:bg-muted",
                  disabled && "cursor-not-allowed opacity-50"
                )}
                aria-pressed={isActive}
              >
                <BankLogo bank={bank.code} priority={isActive} />
                <span className={cn(
                  "text-xs text-center",
                  isActive ? "font-medium text-primary" : "text-muted-foreground"
                )}>
                  {bank.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bank Account Details */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="account-name">ชื่อบัญชี</Label>
          <Input
            id="account-name"
            value={safeValue.accountName}
            onChange={(e) => onChange({ ...safeValue, accountName: e.target.value })}
            placeholder="ชื่อ-นามสกุล หรือชื่อบริษัท"
            disabled={disabled}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="account-number">เลขที่บัญชี</Label>
          <Input
            id="account-number"
            value={safeValue.accountNumber}
            onChange={(e) => onChange({ ...safeValue, accountNumber: e.target.value })}
            placeholder="เช่น 123-4-56789-0"
            inputMode="numeric"
            disabled={disabled}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="branch">สาขา (ถ้ามี)</Label>
          <Input
            id="branch"
            value={safeValue.branch ?? ""}
            onChange={(e) => onChange({ ...safeValue, branch: e.target.value })}
            placeholder="สาขาที่เปิดบัญชี"
            disabled={disabled}
          />
        </div>
      </div>

      {/* QR Code Upload Section */}
      <div className="space-y-3 pt-2 border-t">
        <Label className="flex items-center gap-2">
          <QrCode className="h-4 w-4 text-green-600" />
          QR Code พร้อมเพย์ (ไม่บังคับ)
        </Label>
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">
            อัพโหลด QR Code พร้อมเพย์เพื่อแสดงในใบวางบิลและใบเสร็จ ลูกค้าสามารถสแกนจ่ายเงินได้ทันที
          </p>
          <p className="text-xs text-amber-600">
            ⚡ Tips: ควรใช้รูปภาพขนาดไม่เกิน 1MB เพื่อความเร็วในการบันทึก
          </p>
        </div>
        
        {safeValue.qrCodeUrl ? (
          <div className="flex items-start gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
            <img
              src={safeValue.qrCodeUrl}
              alt="QR Code พร้อมเพย์"
              className="w-24 h-24 object-contain bg-white p-1 rounded border"
              data-pdf-keep="true"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-green-900">QR Code พร้อมเพย์</p>
              <p className="text-xs text-green-700 mt-1">อัพโหลดแล้ว - จะแสดงในเอกสาร PDF</p>
              <p className="text-xs text-muted-foreground mt-1">
                ขนาด: ~{Math.round(safeValue.qrCodeUrl.length * 0.75 / 1024)}KB
                {(safeValue.qrCodeUrl.length * 0.75 / 1024) > 150 && ' (ขนาดใหญ่)'}
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRemoveQRCode}
                disabled={disabled}
                className="mt-2 h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <X className="h-3 w-3 mr-1" />
                ลบ QR Code
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Input
              id="qr-code-upload"
              type="file"
              accept="image/*"
              onChange={handleQRCodeUpload}
              disabled={disabled || isUploadingQR}
              className="hidden"
            />
            <Label
              htmlFor="qr-code-upload"
              className={cn(
                "flex items-center gap-2 px-4 py-2 border-2 border-dashed rounded-lg cursor-pointer transition-colors",
                "hover:bg-green-50 hover:border-green-300",
                (disabled || isUploadingQR) && "opacity-50 cursor-not-allowed pointer-events-none"
              )}
            >
              {isUploadingQR ? (
                <>
                  <Loader2 className="h-4 w-4 text-green-600 animate-spin" />
                  <span className="text-sm">กำลังประมวลผล QR Code...</span>
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 text-green-600" />
                  <span className="text-sm">เลือกไฟล์ QR Code</span>
                </>
              )}
            </Label>
            {isUploadingQR && (
              <p className="text-xs text-muted-foreground">
                ⚡ กำลังบีบอัดและปรับขนาดรูปภาพ...
              </p>
            )}
          </div>
        )}
      </div>

      {/* Save Button */}
      {onSave && (
        <div className="flex items-center justify-end gap-2">
          <Button
            onClick={onSave}
            disabled={disabled || !safeValue.bankCode || !safeValue.accountName || !safeValue.accountNumber}
          >
            บันทึกข้อมูลบัญชี
          </Button>
        </div>
      )}
    </section>
  );
}

export default BankInfoSection;
