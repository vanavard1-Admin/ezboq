import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { CheckCircle2, FileText, Receipt, TrendingUp, Home } from "lucide-react";
import { motion } from "motion/react";

interface CompletionSummaryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentType: "quotation" | "invoice" | "receipt";
  documentNumber: string;
  onNavigate: (destination: "history" | "tax" | "reports" | "dashboard") => void;
}

export function CompletionSummaryDialog({
  open,
  onOpenChange,
  documentType,
  documentNumber,
  onNavigate,
}: CompletionSummaryDialogProps) {
  const documentTypeNames = {
    quotation: "ใบเสนอราคา",
    invoice: "ใบวางบิล",
    receipt: "ใบเสร็จ/ใบกำกับภาษี",
  };

  const documentName = documentTypeNames[documentType];

  const handleNavigate = (destination: "history" | "tax" | "reports" | "dashboard") => {
    onNavigate(destination);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="mx-auto mb-4"
          >
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
            </div>
          </motion.div>
          <DialogTitle className="text-center text-2xl">
            บันทึกสำเร็จ! 🎉
          </DialogTitle>
          <DialogDescription className="text-center">
            เอกสารของคุณได้รับการบันทึกเรียบร้อยแล้ว
          </DialogDescription>
        </DialogHeader>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-6"
        >
          {/* Document Info */}
          <div className="text-center space-y-2">
            <p className="text-muted-foreground">
              บันทึก{documentName}เรียบร้อยแล้ว
            </p>
            <p className="text-sm font-mono bg-muted px-3 py-1.5 rounded-md inline-block">
              {documentNumber}
            </p>
          </div>

          {/* Navigation Options */}
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground text-center mb-4">
              คุณต้องการทำอะไรต่อ?
            </p>

            {/* History Button - For Quotation and Invoice */}
            {(documentType === "quotation" || documentType === "invoice") && (
              <Button
                onClick={() => handleNavigate("history")}
                className="w-full h-auto py-4 flex items-start gap-4"
                variant="outline"
              >
                <FileText className="w-5 h-5 mt-0.5 shrink-0" />
                <div className="text-left flex-1">
                  <div className="font-medium">ดูประวัติเอกสาร</div>
                  <div className="text-sm text-muted-foreground">
                    ตรวจสอบและจัดการเอกสารทั้งหมด
                  </div>
                </div>
              </Button>
            )}

            {/* Tax Management - Only for Receipt */}
            {documentType === "receipt" && (
              <Button
                onClick={() => handleNavigate("tax")}
                className="w-full h-auto py-4 flex items-start gap-4 bg-primary hover:bg-primary/90"
              >
                <Receipt className="w-5 h-5 mt-0.5 shrink-0 text-white" />
                <div className="text-left flex-1 text-white">
                  <div className="font-medium">จัดการภาษี</div>
                  <div className="text-sm opacity-90">
                    ดูรายการภาษี หัก ณ ที่จ่าย และภาษีมูลค่าเพิ่ม
                  </div>
                </div>
              </Button>
            )}

            {/* Reports - Available for all */}
            <Button
              onClick={() => handleNavigate("reports")}
              className="w-full h-auto py-4 flex items-start gap-4"
              variant="outline"
            >
              <TrendingUp className="w-5 h-5 mt-0.5 shrink-0" />
              <div className="text-left flex-1">
                <div className="font-medium">ดูรายงาน</div>
                <div className="text-sm text-muted-foreground">
                  วิเคราะห์รายได้และสถิติการขาย
                </div>
              </div>
            </Button>

            {/* Dashboard */}
            <Button
              onClick={() => handleNavigate("dashboard")}
              className="w-full h-auto py-4 flex items-start gap-4"
              variant="outline"
            >
              <Home className="w-5 h-5 mt-0.5 shrink-0" />
              <div className="text-left flex-1">
                <div className="font-medium">กลับหน้าหลัก</div>
                <div className="text-sm text-muted-foreground">
                  ดู Dashboard และสร้างเอกสารใหม่
                </div>
              </div>
            </Button>

            {/* History for Receipt */}
            {documentType === "receipt" && (
              <Button
                onClick={() => handleNavigate("history")}
                className="w-full h-auto py-4 flex items-start gap-4"
                variant="ghost"
              >
                <FileText className="w-5 h-5 mt-0.5 shrink-0" />
                <div className="text-left flex-1">
                  <div className="font-medium">ดูประวัติเอกสาร</div>
                  <div className="text-sm text-muted-foreground">
                    ตรวจสอบและจัดการเอกสารทั้งหมด
                  </div>
                </div>
              </Button>
            )}
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}