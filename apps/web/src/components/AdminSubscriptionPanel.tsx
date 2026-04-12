import { useEffect, useState } from 'react';
import { Check, ChevronLeft, Clock, User, Building2, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import {
  getAllPendingSubscriptions,
  getSubscriptionPlanLabel,
  approveSubscription,
  type SubscriptionStatus,
} from '../utils/subscription';

interface AdminSubscriptionPanelProps {
  onBack?: () => void;
}

export function AdminSubscriptionPanel({ onBack }: AdminSubscriptionPanelProps) {
  const [requests, setRequests] = useState<SubscriptionStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const data = await getAllPendingSubscriptions();
      setRequests(data);
    } catch (err) {
      console.error('Failed to load subscription requests:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleApprove = async (workspaceId: string) => {
    if (!workspaceId) return;
    setApprovingId(workspaceId);
    try {
      await approveSubscription(workspaceId);
      setRequests((prev) => prev.filter((r) => r.workspaceId !== workspaceId));
    } catch (err) {
      console.error('Failed to approve:', err);
    } finally {
      setApprovingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* App header */}
      <div className="sticky top-0 z-50 flex items-center gap-3 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur-sm">
        {onBack && (
          <button onClick={onBack} className="flex items-center gap-1 rounded-lg p-1.5 text-slate-600 transition hover:bg-slate-100">
            <ChevronLeft className="h-5 w-5" />
            <span className="text-sm">กลับ</span>
          </button>
        )}
        <div className="flex-1 text-center">
          <h1 className="text-sm font-semibold text-slate-900">อนุมัติ Subscription</h1>
        </div>
        {onBack && <div className="w-14" />}
      </div>

      <div className="mx-auto max-w-3xl space-y-6 px-4 py-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">รายการรออนุมัติ</h2>
          <p className="text-xs text-slate-500">อนุมัติการสมัครสมาชิกที่รอตรวจสอบ</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadRequests} className="gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" /> รีเฟรช
        </Button>
      </div>

      {loading ? (
        <div className="py-12 text-center text-sm text-slate-400">กำลังโหลด...</div>
      ) : requests.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
              <Check className="h-6 w-6 text-slate-400" />
            </div>
            <p className="text-sm text-slate-500">ไม่มีรายการที่รออนุมัติ</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => (
            <Card key={req.workspaceId}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-slate-400" />
                    <span className="font-medium text-slate-900">
                      {req.userName || 'ไม่ระบุชื่อ'}
                    </span>
                    <Badge variant="outline" className="gap-1 text-xs">
                      <Clock className="h-3 w-3" /> รอตรวจสอบ
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span>{req.userEmail}</span>
                    <span className="flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      {req.workspaceName || req.workspaceId}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500">
                    แพ็คเกจ: <strong>{getSubscriptionPlanLabel(req.plan)} ({req.plan === 'team' ? '฿279' : '฿99'})</strong>
                    {' · '}
                    สมัครเมื่อ: {new Date(req.createdAt).toLocaleDateString('th-TH')}
                  </div>
                </div>
                <Button
                  size="sm"
                  disabled={approvingId === req.workspaceId}
                  onClick={() => handleApprove(req.workspaceId!)}
                  className="gap-1.5"
                >
                  <Check className="h-3.5 w-3.5" />
                  {approvingId === req.workspaceId ? 'กำลังอนุมัติ...' : 'อนุมัติ'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
    </div>
  );
}
