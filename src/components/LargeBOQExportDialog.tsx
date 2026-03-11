/**
 * Large BOQ Export Dialog
 * 
 * ✅ Features:
 * - Auto mode detection (canvas < 300, AutoTable ≥ 300)
 * - Progress tracking
 * - Cancellation support
 * - Auto-split suggestion for 600+ items
 * - Telemetry display
 */

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Alert, AlertDescription } from './ui/alert';
import { 
  FileText, 
  Download, 
  AlertCircle, 
  CheckCircle, 
  XCircle, 
  Loader2,
  Zap,
  LayoutGrid
} from 'lucide-react';
import { 
  exportLargeBOQ, 
  cancelExport, 
  pickExportMode, 
  shouldOfferAutoSplit,
  getTelemetryStats,
  type LargeBOQExportOptions 
} from '../utils/pdfExportLarge';
import { toast } from 'sonner';
import { log } from '../utils/logger';

interface LargeBOQExportDialogProps {
  open: boolean;
  onClose: () => void;
  exportOptions: LargeBOQExportOptions;
}

type ExportStatus = 'idle' | 'preparing' | 'exporting' | 'success' | 'error' | 'cancelled';

export function LargeBOQExportDialog({
  open,
  onClose,
  exportOptions,
}: LargeBOQExportDialogProps) {
  const [status, setStatus] = useState<ExportStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [exportTime, setExportTime] = useState<number | null>(null);

  const itemCount = exportOptions.items.length;
  const mode = pickExportMode(itemCount);
  const shouldSplit = shouldOfferAutoSplit(itemCount);

  const handleExport = async () => {
    setStatus('preparing');
    setProgress(0);
    setError(null);
    setExportTime(null);

    const startTime = performance.now();

    try {
      await exportLargeBOQ({
        ...exportOptions,
        onProgress: (current, total, message) => {
          setProgress(current);
          setStatusMessage(message);
          setStatus('exporting');
        },
      });

      const endTime = performance.now();
      const duration = (endTime - startTime) / 1000;
      setExportTime(duration);
      setStatus('success');
      setStatusMessage('ส่งออกสำเร็จ');
      
      toast.success('ส่งออก PDF สำเร็จ', {
        description: `ใช้เวลา ${duration.toFixed(1)} วินาที`,
      });

      // Auto close after success
      setTimeout(() => {
        onClose();
      }, 2000);

    } catch (err: any) {
      log.error('Export error:', err);
      
      if (err.message.includes('ยกเลิก')) {
        setStatus('cancelled');
        setError('ยกเลิกการส่งออกแล้ว');
      } else {
        setStatus('error');
        setError(err.message || 'เกิดข้อผิดพลาดในการส่งออก');
      }
      
      toast.error('ส่งออก PDF ล้มเหลว', {
        description: err.message,
      });
    }
  };

  const handleCancel = () => {
    if (status === 'exporting' || status === 'preparing') {
      cancelExport();
      toast.info('กำลังยกเลิกการส่งออก...');
    } else {
      onClose();
    }
  };

  const handleClose = () => {
    if (status === 'exporting' || status === 'preparing') {
      const confirmed = confirm('กำลังส่งออกอยู่ ต้องการยกเลิกและปิดหน้าต่างนี้หรือไม่?');
      if (confirmed) {
        cancelExport();
        onClose();
      }
    } else {
      onClose();
    }
  };

  // Get telemetry stats
  const stats = getTelemetryStats();

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            ส่งออก PDF (BOQ)
          </DialogTitle>
          <DialogDescription>
            รายการ {itemCount.toLocaleString()} รายการ
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Mode Info */}
          <Alert>
            <Zap className="w-4 h-4" />
            <AlertDescription>
              <div className="space-y-1">
                <p className="font-medium">
                  {mode === 'canvas' ? '🎨 โหมดภาพความละเอียดสูง' : '📊 โหมดตารางอัตโนมัติ'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {mode === 'canvas' 
                    ? 'เหมาะสำหรับเอกสารน้อยกว่า 300 รายการ - ภาพสวยงาม'
                    : 'เหมาะสำหรับเอกสารขนาดใหญ่ - เร็ว กินแรมน้อย'}
                </p>
              </div>
            </AlertDescription>
          </Alert>

          {/* Split Suggestion */}
          {shouldSplit && status === 'idle' && (
            <Alert variant="destructive">
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>
                <div className="space-y-1">
                  <p className="font-medium">
                    ⚠️ เอกสารขนาดใหญ่มาก ({itemCount} รายการ)
                  </p>
                  <p className="text-xs">
                    แนะนำให้แบ่งเอกสารตามหมวดหมู่เพื่อความเสถียร<br />
                    ระบบจะถามเมื่อคุณกดส่งออก
                  </p>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Status Display */}
          {status !== 'idle' && (
            <div className="space-y-3">
              {/* Progress Bar */}
              {(status === 'preparing' || status === 'exporting') && (
                <div className="space-y-2">
                  <Progress value={progress} className="h-2" />
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {statusMessage}
                  </div>
                </div>
              )}

              {/* Success */}
              {status === 'success' && (
                <Alert className="border-green-500 bg-green-50">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <AlertDescription>
                    <div className="space-y-1">
                      <p className="font-medium text-green-900">
                        ส่งออกสำเร็จ!
                      </p>
                      {exportTime && (
                        <p className="text-xs text-green-700">
                          ใช้เวลา {exportTime.toFixed(1)} วินาที
                        </p>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* Error */}
              {status === 'error' && error && (
                <Alert variant="destructive">
                  <XCircle className="w-4 h-4" />
                  <AlertDescription>
                    <div className="space-y-1">
                      <p className="font-medium">เกิดข้อผิดพลาด</p>
                      <p className="text-xs">{error}</p>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* Cancelled */}
              {status === 'cancelled' && (
                <Alert>
                  <XCircle className="w-4 h-4" />
                  <AlertDescription>
                    <p className="font-medium">ยกเลิกการส่งออกแล้ว</p>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Telemetry Stats (if available) */}
          {stats && status === 'idle' && (
            <div className="text-xs text-muted-foreground bg-muted p-3 rounded-md">
              <p className="font-medium mb-1">📊 สถิติการส่งออก</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="opacity-70">ส่งออกทั้งหมด:</span>{' '}
                  <span className="font-medium">{stats.totalExports}</span>
                </div>
                <div>
                  <span className="opacity-70">สำเร็จ:</span>{' '}
                  <span className="font-medium">{stats.completedExports}</span>
                </div>
                <div>
                  <span className="opacity-70">เวลาเฉลี่ย:</span>{' '}
                  <span className="font-medium">{(stats.avgTimeMs / 1000).toFixed(1)}s</span>
                </div>
                <div>
                  <span className="opacity-70">เวลาสูงสุด:</span>{' '}
                  <span className="font-medium">{(stats.maxTimeMs / 1000).toFixed(1)}s</span>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            {status === 'idle' && (
              <Button
                onClick={handleExport}
                className="flex-1 gap-2"
              >
                <Download className="w-4 h-4" />
                เริ่มส่งออก
              </Button>
            )}

            {(status === 'preparing' || status === 'exporting') && (
              <Button
                onClick={handleCancel}
                variant="destructive"
                className="flex-1 gap-2"
              >
                <XCircle className="w-4 h-4" />
                ยกเลิก
              </Button>
            )}

            {(status === 'success' || status === 'error' || status === 'cancelled') && (
              <Button
                onClick={onClose}
                variant="outline"
                className="flex-1"
              >
                ปิด
              </Button>
            )}

            {(status === 'error' || status === 'cancelled') && (
              <Button
                onClick={handleExport}
                className="flex-1 gap-2"
              >
                <Download className="w-4 h-4" />
                ลองใหม่
              </Button>
            )}

            {status === 'idle' && (
              <Button
                onClick={handleClose}
                variant="outline"
                className="flex-1"
              >
                ยกเลิก
              </Button>
            )}
          </div>

          {/* Estimated Time */}
          {status === 'idle' && (
            <div className="text-center text-xs text-muted-foreground">
              {mode === 'canvas' && itemCount < 100 && (
                <p>⏱️ ประมาณ 5-10 วินาที</p>
              )}
              {mode === 'canvas' && itemCount >= 100 && itemCount < 300 && (
                <p>⏱️ ประมาณ 20-40 วินาที</p>
              )}
              {mode === 'autotable' && itemCount < 500 && (
                <p>⏱️ ประมาณ 15-30 วินาที</p>
              )}
              {mode === 'autotable' && itemCount >= 500 && itemCount < 1000 && (
                <p>⏱️ ประมาณ 40-70 วินาที</p>
              )}
              {itemCount >= 1000 && (
                <p>⏱️ อาจใช้เวลา 1-2 นาที หรือมากกว่า</p>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}