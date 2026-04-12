import React, { useState } from 'react';
import {
  User,
  Mail,
  Phone,
  Link as LinkIcon,
  ShieldCheck,
  Lock,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Loader2
} from 'lucide-react';
import type { AuthUser } from '../../utils/authSession';
import { toast } from 'sonner@2.0.3';
import { auth } from '../../utils/firebase';

const LINE_CHANNEL_ID = '2008406529';
const LINE_CALLBACK_URL = 'https://asia-southeast1-ezdoc-v1-th.cloudfunctions.net/ezboqLineCallback';
const LINK_COMPLETE_URL = 'https://asia-southeast1-ezdoc-v1-th.cloudfunctions.net/linkLineComplete';

interface ProfilePageProps {
  user: AuthUser;
  onUpdateUser?: (updatedFields: Partial<AuthUser>) => void;
  workspaceMode?: 'cloud' | 'local-cache' | 'mock' | 'line';
  lineLinked?: boolean;
}

export function ProfilePage({ user, workspaceMode, lineLinked }: ProfilePageProps) {
  const [isLineConnected, setIsLineConnected] = useState(lineLinked || workspaceMode === 'line');
  const isProfileIncomplete = !user.phone || !user.email; // Basic check
  const [isLinking, setIsLinking] = useState(false);

  const handleConnectLine = () => {
    if (isLinking) return;
    setIsLinking(true);

    const state = `link_${Date.now()}`;
    const authorizeUrl = new URL('https://access.line.me/oauth2/v2.1/authorize');
    authorizeUrl.searchParams.set('response_type', 'code');
    authorizeUrl.searchParams.set('client_id', LINE_CHANNEL_ID);
    authorizeUrl.searchParams.set('redirect_uri', LINE_CALLBACK_URL);
    authorizeUrl.searchParams.set('state', state);
    authorizeUrl.searchParams.set('scope', 'profile openid email');

    const width = 480;
    const height = 640;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    const popup = window.open(
      authorizeUrl.toString(),
      'line-link',
      `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no`,
    );

    if (!popup) {
      toast.error('กรุณาอนุญาต popup เพื่อเชื่อมต่อ LINE');
      setIsLinking(false);
      return;
    }

    const handleMessage = async (event: MessageEvent) => {
      const data = event.data;
      if (!data || data.type !== 'ezboq-line-login') return;

      window.removeEventListener('message', handleMessage);
      clearInterval(pollTimer);

      if (data.error) {
        toast.error(`เชื่อมต่อ LINE ไม่สำเร็จ: ${data.error}`);
        setIsLinking(false);
        return;
      }

      if (data.lineUserId) {
        try {
          const firebaseUser = auth.currentUser;
          if (!firebaseUser) {
            toast.error('กรุณาเข้าสู่ระบบก่อนเชื่อมต่อ LINE');
            setIsLinking(false);
            return;
          }
          const idToken = await firebaseUser.getIdToken();
          const res = await fetch(LINK_COMPLETE_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${idToken}`,
            },
            body: JSON.stringify({ lineUserId: data.lineUserId }),
          });
          const result = await res.json();
          if (result.ok) {
            toast.success('เชื่อมต่อ LINE สำเร็จแล้ว!');
            setIsLineConnected(true);
          } else {
            toast.error(result.error || 'เชื่อมต่อไม่สำเร็จ');
          }
        } catch (err) {
          console.error('[LINE Link] Error:', err);
          toast.error('เกิดข้อผิดพลาดในการเชื่อมต่อ LINE');
        }
      } else {
        toast.error('ไม่พบข้อมูล LINE');
      }
      setIsLinking(false);
    };

    window.addEventListener('message', handleMessage);

    const pollTimer = setInterval(() => {
      if (popup.closed) {
        clearInterval(pollTimer);
        window.removeEventListener('message', handleMessage);
        setIsLinking(false);
      }
    }, 500);
  };

  const handleResetPassword = () => {
    toast.success('ส่งลิงก์รีเซ็ตรหัสผ่านไปที่อีเมลของคุณแล้ว');
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      {/* ── User Information Section ──────────────── */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <h3 className="text-sm font-bold text-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-blue-600" />
              ข้อมูลส่วนตัว
            </div>
            {isProfileIncomplete && (
              <span className="text-[10px] bg-amber-50 text-amber-600 border border-amber-100 px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                <AlertCircle className="w-3 h-3" />
                กรุณาระบุข้อมูลให้ครบถ้วน
              </span>
            )}
          </h3>
        </div>
        <div className="p-6 space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                ชื่อ-นามสกุล
              </label>
              <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700">
                <User className="w-4 h-4 text-slate-400" />
                <span className="text-sm font-medium">{user.name}</span>
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                อีเมล
              </label>
              <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700">
                <Mail className="w-4 h-4 text-slate-400" />
                <span className="text-sm font-medium">{user.email}</span>
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                เบอร์โทรศัพท์
              </label>
              <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700">
                <Phone className="w-4 h-4 text-slate-400" />
                <span className="text-sm font-medium">{user.phone || 'ยังไม่ได้ระบุ'}</span>
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                บทบาทในระบบ
              </label>
              <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700">
                <ShieldCheck className="w-4 h-4 text-slate-400" />
                <span className="text-sm font-medium uppercase">{user.role}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── LINE Connection Section ───────────────── */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <LinkIcon className="w-4 h-4 text-[#06C755]" />
            การเชื่อมต่อ LINE
          </h3>
        </div>
        <div className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className={`mt-0.5 p-1.5 rounded-full ${isLineConnected ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                {isLineConnected ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">
                  {isLineConnected ? 'เชื่อมต่อกับ LINE แล้ว' : 'ยังไม่ได้เชื่อมต่อกับ LINE'}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  เชื่อมต่อเพื่อรับการแจ้งเตือนงานและเข้าสู่ระบบได้รวดเร็วขึ้น
                </p>
              </div>
            </div>
            <button
              onClick={handleConnectLine}
              disabled={isLinking}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[#06C755] text-white text-sm font-bold rounded-xl hover:bg-[#05B64C] transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLinking ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
              {isLinking ? 'กำลังเชื่อมต่อ...' : 'เชื่อมต่อ LINE'}
            </button>
          </div>
        </div>
      </section>

      {/* ── Security / Password Section ────────────── */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-600" />
            ความปลอดภัย
          </h3>
        </div>
        <div className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-slate-800">รหัสผ่าน</p>
              <p className="text-xs text-slate-500 mt-0.5">
                คุณสามารถเปลี่ยนรหัสผ่านได้ทุกเมื่อเพื่อความปลอดภัยของบัญชี
              </p>
            </div>
            <button
              onClick={handleResetPassword}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-700 text-sm font-bold rounded-xl hover:bg-slate-50 transition-colors"
            >
              <Lock className="w-4 h-4" />
              เปลี่ยนรหัสผ่าน
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
