/**
 * DashboardTab — project overview + quick actions
 * Extracted from AppShell.tsx (Phase 3 refactor)
 */
import { useState, useEffect } from 'react';
import {
  ChevronDown, Settings, AlertCircle, Loader2,
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import type { AuthSession } from '../utils/authSession';
import type { ProjectData } from '../utils/projectData';
import { getProjectCustomerAmount } from '../utils/projectData';
import type { InstallmentLine, ContractorAssignment } from '../features/pipeline/types';
import type { ViewableDocument } from '../features/pipeline/components/DocumentViewer';
import { EzBOQLogo } from './EzBOQLogo';
import { PartnerAds } from '../features/pipeline/components/PartnerAds';
import type { MainTab, SettingsTab } from './AppShellTypes';

function formatCurrency(v: number): string {
  return new Intl.NumberFormat('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);
}

// ── Action Card ───────────────────────────────────

export function ActionCard({ title, subtitle, image, color, onClick }: { title: string; subtitle: string; image: string; color: 'blue' | 'orange' | 'yellow' | 'emerald'; onClick: () => void }) {
  const colorStyles = {
    blue: "border-wood-200/60 bg-gradient-to-br from-kinari-50 to-wood-50/80 shadow-[0_4px_20px_rgba(87,74,61,0.08)] hover:border-wood-400 hover:shadow-[0_8px_30px_rgba(87,74,61,0.15)] hover:to-wood-100/60 text-wood-900",
    orange: "border-orange-100 bg-gradient-to-br from-white to-orange-50/80 shadow-[0_4px_20px_rgba(249,115,22,0.08)] hover:border-orange-300 hover:shadow-orange-200/50 hover:to-orange-100/60 text-orange-950",
    yellow: "border-amber-100 bg-gradient-to-br from-white to-amber-50/80 shadow-[0_4px_20px_rgba(245,158,11,0.08)] hover:border-amber-300 hover:shadow-amber-200/50 hover:to-amber-100/60 text-amber-950",
    emerald: "border-emerald-100 bg-gradient-to-br from-white to-emerald-50/80 shadow-[0_4px_20px_rgba(16,185,129,0.08)] hover:border-emerald-300 hover:shadow-emerald-200/50 hover:to-emerald-100/60 text-emerald-950"
  }[color];

  return (
    <button
      onClick={onClick}
      className={`group relative flex flex-col items-center justify-between p-4 rounded-3xl border transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${colorStyles}`}
    >
      {/* 3D Icon Container */}
      <div className="w-20 h-20 sm:w-24 sm:h-24 mb-3 relative z-10 transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:scale-110 group-hover:-translate-y-1.5 flex items-center justify-center">
        <img
          src={image}
          alt=""
          className="w-full h-full object-contain filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.15)] transition-all duration-500 group-hover:drop-shadow-[0_12px_24px_rgba(0,0,0,0.2)]"
          loading="lazy"
        />
      </div>

      {/* Text block */}
      <div className="relative z-10 flex flex-col items-center w-full">
        <h4 className="text-[13px] sm:text-[15px] font-extrabold text-center tracking-tight leading-loose mb-[-2px]">{title}</h4>
        <p className="text-[10px] sm:text-xs opacity-70 font-semibold text-center leading-snug">{subtitle}</p>
      </div>
    </button>
  );
}

// ── Dashboard Tab ─────────────────────────────────

export function DashboardTab({
  session,
  companyProfile,
  project,
  pricingSummary,
  installments,
  contractors,
  onNavigate,
  onViewDoc,
  onOpenSettings,
}: {
  session: AuthSession;
  companyProfile: { companyName?: string; phone?: string; address?: string };
  project: ProjectData;
  pricingSummary: { costTotal: number; costMaterial: number; costLabor: number; sellingTotal: number; sellingBeforeVat: number; vat: number; marginPercent: number; markup: number; operating: number } | null;
  installments: InstallmentLine[];
  contractors: ContractorAssignment[];
  onNavigate: (tab: MainTab) => void;
  onViewDoc: (type: ViewableDocument) => void;
  onOpenSettings: (tab: SettingsTab) => void;
}) {
  const profit = pricingSummary ? pricingSummary.sellingBeforeVat - pricingSummary.costTotal : 0;
  const [showHeroVideo, setShowHeroVideo] = useState(false);

  const isLineConnected = session.lineLinked || session.workspaceMode === 'line';
  const isProfileIncomplete = !companyProfile.companyName || !companyProfile.phone || !companyProfile.address;

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const win = window as Window & typeof globalThis & {
      requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
      cancelIdleCallback?: (handle: number) => void;
    };

    const prefersReducedMotion = win.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      return undefined;
    }

    let cancelled = false;
    let timeoutId: number | null = null;

    const enableVideo = () => {
      if (!cancelled) {
        setShowHeroVideo(true);
      }
    };

    if (typeof win.requestIdleCallback === 'function' && typeof win.cancelIdleCallback === 'function') {
      const idleId = win.requestIdleCallback(enableVideo, { timeout: 1800 });
      return () => {
        cancelled = true;
        win.cancelIdleCallback?.(idleId);
      };
    }

    timeoutId = win.setTimeout(enableVideo, 1200);
    return () => {
      cancelled = true;
      if (timeoutId !== null) {
        win.clearTimeout(timeoutId);
      }
    };
  }, []);

  const docs: { type: ViewableDocument; label: string; ready: boolean; image: string }[] = [
    { type: 'customer-quotation', label: 'ใบเสนอราคา', ready: !!pricingSummary, image: 'https://firebasestorage.googleapis.com/v0/b/ezdoc-v1-th.firebasestorage.app/o/partner%2FDashboard%20icon%2FGenerated_Image_March_31__2026_-_10_51PM-removebg-preview.png?alt=media&token=15069750-fa06-452a-8158-fefee8b7b72b' },
    { type: 'contract', label: 'สัญญาจ้าง', ready: !!pricingSummary, image: 'https://firebasestorage.googleapis.com/v0/b/ezdoc-v1-th.firebasestorage.app/o/partner%2FDashboard%20icon%2FGenerated_Image_March_31__2026_-_10_52PM-removebg-preview.png?alt=media&token=554d8aa8-5d3d-4861-b0dd-417f63560dec' },
    { type: 'invoice', label: 'ใบวางบิล', ready: installments.length > 0, image: 'https://firebasestorage.googleapis.com/v0/b/ezdoc-v1-th.firebasestorage.app/o/partner%2FDashboard%20icon%2FGenerated_Image_March_31__2026_-_10_52PM__1_-removebg-preview.png?alt=media&token=c679a491-fd16-48a2-b83d-f4c3c5dc9005' },
    { type: 'work-plan', label: 'แผนการทำงาน', ready: Boolean(project.workPlan), image: 'https://firebasestorage.googleapis.com/v0/b/ezdoc-v1-th.firebasestorage.app/o/partner%2FDashboard%20icon%2FGenerated_Image_March_31__2026_-_10_54PM-removebg-preview.png?alt=media&token=0c741648-5979-4499-81e6-a77c5aea7513' },
    { type: 'purchase-order', label: 'ใบสั่งซื้อ (PO)', ready: !!pricingSummary, image: 'https://firebasestorage.googleapis.com/v0/b/ezdoc-v1-th.firebasestorage.app/o/partner%2FDashboard%20icon%2FGenerated_Image_March_31__2026_-_10_55PM-removebg-preview.png?alt=media&token=2dd07832-db11-4e3c-93c8-63527b65975e' },
    { type: 'contractor-invoice', label: 'ใบเบิกช่าง', ready: contractors.length > 0, image: 'https://firebasestorage.googleapis.com/v0/b/ezdoc-v1-th.firebasestorage.app/o/partner%2FDashboard%20icon%2FGenerated_Image_March_31__2026_-_10_56PM-removebg-preview.png?alt=media&token=8ccdf244-a53c-4fef-bdf4-61653b56ff97' },
    { type: 'vat-invoice', label: 'ใบกำกับภาษี', ready: !!pricingSummary, image: 'https://firebasestorage.googleapis.com/v0/b/ezdoc-v1-th.firebasestorage.app/o/partner%2FDashboard%20icon%2FGenerated_Image_March_31__2026_-_10_58PM-removebg-preview.png?alt=media&token=e59ccfc0-e08d-4b23-b625-69c479f84cc7' },
    { type: 'withholding-tax', label: 'หัก ณ ที่จ่าย', ready: !!pricingSummary, image: 'https://firebasestorage.googleapis.com/v0/b/ezdoc-v1-th.firebasestorage.app/o/partner%2FDashboard%20icon%2FGenerated_Image_March_31__2026_-_10_58PM-removebg-preview.png?alt=media&token=e59ccfc0-e08d-4b23-b625-69c479f84cc7' },
    { type: 'receipt', label: 'ใบเสร็จ', ready: !!pricingSummary, image: 'https://firebasestorage.googleapis.com/v0/b/ezdoc-v1-th.firebasestorage.app/o/partner%2FDashboard%20icon%2FGenerated_Image_March_31__2026_-_11_00PM-removebg-preview.png?alt=media&token=f6bcd2dc-1be6-41b7-95b1-89048162ec75' },
  ];

  return (
    <div className="space-y-4">
      {/* ── Pending Actions Section ──────────────── */}
      {(isProfileIncomplete || !isLineConnected) && (
        <div className="grid gap-3 mb-4">
          {!isLineConnected && (
            <Alert variant="destructive" className="border-amber-200 bg-amber-50 text-amber-900 shadow-sm rounded-2xl overflow-hidden cursor-pointer hover:bg-amber-100 transition-colors" onClick={() => onOpenSettings('profile')}>
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <div className="flex items-center justify-between w-full">
                <div className="ml-2">
                  <AlertTitle className="text-sm font-bold text-left">Action Required: เชื่อมต่อ LINE</AlertTitle>
                  <AlertDescription className="text-xs text-amber-700 text-left">
                    กรุณาเชื่อมต่อบัญชี LINE เพื่อให้คุณสามารถส่งเอกสารให้ลูกค้าผ่านแอป LINE ได้ทันที
                  </AlertDescription>
                </div>
                <ChevronDown className="w-4 h-4 -rotate-90 text-amber-400" />
              </div>
            </Alert>
          )}

          {isProfileIncomplete && (
            <Alert className="border-wood-200 bg-wood-50 text-wood-900 shadow-sm rounded-2xl overflow-hidden cursor-pointer hover:bg-wood-100 transition-colors" onClick={() => onOpenSettings('company')}>
              <Settings className="h-4 w-4 text-primary" />
              <div className="flex items-center justify-between w-full">
                <div className="ml-2">
                  <AlertTitle className="text-sm font-bold text-left">Complete your profile: ข้อมูลบริษัท</AlertTitle>
                  <AlertDescription className="text-xs text-wood-700 text-left">
                    ระบุชื่อบริษัท เบอร์โทร และที่อยู่ เพื่อให้แสดงบนหัวเอกสารของคุณให้ครบถ้วน
                  </AlertDescription>
                </div>
                <ChevronDown className="w-4 h-4 -rotate-90 text-wood-400" />
              </div>
            </Alert>
          )}
        </div>
      )}
      {/* ── Hero Section ─────────────────────────── */}
      <div className="relative overflow-hidden rounded-[2rem] bg-card border border-border shadow-[0_8px_40px_-12px_rgba(87,74,61,0.08)] p-6 sm:p-8">
        {/* Animated subtle gradient mesh — warm wood tones */}
        <div className="absolute inset-0 opacity-40" style={{
          background: 'radial-gradient(circle at 15% 15%, rgba(168,146,121,0.10) 0%, transparent 40%), radial-gradient(circle at 85% 85%, rgba(77,143,94,0.06) 0%, transparent 40%), radial-gradient(circle at 50% 50%, rgba(196,165,115,0.04) 0%, transparent 50%)',
          animation: 'heroMesh 8s ease-in-out infinite alternate',
        }} />

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center text-center">
          {/* Animated Video Logo */}
          <div
            className="mb-2 relative w-48 h-48 sm:w-56 sm:h-56 flex items-center justify-center rounded-[2.5rem] overflow-hidden"
            style={{ animation: 'heroLogoEntry 1s cubic-bezier(0.34, 1.56, 0.64, 1) both' }}
          >
            {showHeroVideo ? (
              <video
                ref={(el) => {
                  if (el) {
                    el.defaultMuted = true;
                    el.muted = true;
                    const playPromise = el.play();
                    if (playPromise !== undefined) {
                      playPromise.catch(() => {});
                    }
                  }
                }}
                autoPlay
                loop
                muted
                playsInline
                preload="metadata"
                src="https://firebasestorage.googleapis.com/v0/b/ezdoc-v1-th.firebasestorage.app/o/partner%2FDashboard%20icon%2Fgemini_generated_video_D0CD683E.mov?alt=media&token=e46cdd94-4123-4216-a993-0561cb4eb732"
                className="w-full h-full object-cover pointer-events-none rounded-[2.5rem]"
                style={{ transform: 'translateZ(0)' }}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center rounded-[2.5rem] border border-wood-100/80 bg-[radial-gradient(circle_at_top,_rgba(168,146,121,0.12),_transparent_55%),linear-gradient(180deg,_rgba(254,253,251,1)_0%,_rgba(243,239,232,0.96)_55%,_rgba(243,248,244,0.9)_100%)]">
                <EzBOQLogo size="md" className="h-20 sm:h-24 w-auto drop-shadow-[0_10px_24px_rgba(87,74,61,0.12)]" />
              </div>
            )}
          </div>

          {/* Project name with slide-up animation */}
          <div style={{ animation: 'heroSlideUp 0.8s ease-out 0.3s both' }}>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
              {project.name}
            </h2>
            <p className="mt-1.5 text-xs sm:text-sm text-muted-foreground font-medium">
              {project.owner} <span className="text-wood-300 mx-1.5">|</span> {project.address}
            </p>
          </div>

          {/* Stats row with stagger animation */}
          {pricingSummary && (
            <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 w-full">
              {[
                { label: 'ราคาขาย', value: formatCurrency(pricingSummary.sellingTotal), color: 'text-primary', border: 'border-wood-100', bg: 'bg-wood-50' },
                { label: 'ต้นทุน', value: formatCurrency(pricingSummary.costTotal), color: 'text-foreground', border: 'border-border', bg: 'bg-card' },
                { label: 'กำไร', value: formatCurrency(profit), sub: `${pricingSummary.marginPercent}%`, color: 'text-emerald-700', subColor: 'text-emerald-500', border: 'border-emerald-100', bg: 'bg-emerald-50/50' },
                { label: 'งวด/ช่าง', value: `${installments.length}/${contractors.length}`, color: 'text-amber-700', border: 'border-amber-100', bg: 'bg-amber-50/50' },
              ].map((stat, i) => (
                <div
                  key={stat.label}
                  className={`rounded-2xl border ${stat.border} ${stat.bg} p-2.5 sm:p-4 text-center transition-all duration-300 hover:shadow-md hover:-translate-y-1`}
                  style={{ animation: `heroSlideUp 0.6s ease-out ${0.5 + i * 0.1}s both` }}
                >
                  <p className="text-[9px] sm:text-[10px] text-muted-foreground uppercase tracking-widest font-semibold mb-1">{stat.label}</p>
                  <p className={`text-sm sm:text-xl font-bold font-mono ${stat.color}`}>{stat.value}</p>
                  {stat.sub && <p className={`text-[10px] sm:text-xs font-semibold mt-0.5 ${stat.subColor || 'text-slate-400'}`}>{stat.sub}</p>}
                </div>
              ))}
            </div>
          )}

          {!pricingSummary && (
            <div className="mt-8 flex items-center gap-2 text-muted-foreground font-medium text-sm" style={{ animation: 'heroPulse 2s ease-in-out infinite' }}>
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              กำลังคำนวณราคา...
            </div>
          )}
        </div>
      </div>

      {/* Inject keyframes (only once) */}
      <style>{`
        @keyframes heroMesh {
          0% { transform: scale(1) rotate(0deg); }
          100% { transform: scale(1.15) rotate(3deg); }
        }
        @keyframes heroFloat {
          0% { transform: translateY(0) scale(1); opacity: 0.4; }
          100% { transform: translateY(-20px) scale(1.5); opacity: 0.8; }
        }
        @keyframes heroLogoEntry {
          0% { opacity: 0; transform: scale(0.3) translateY(30px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes heroLogoFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        @keyframes heroPulse {
          0%, 100% { opacity: 0.4; transform: scale(2); }
          50% { opacity: 0.7; transform: scale(2.3); }
        }
        @keyframes heroSlideUp {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* ── Cost vs Selling Breakdown ────────────── */}
      {pricingSummary && pricingSummary.costTotal > 0 && (() => {
        const items = project.quotationData;
        const categories: { no: string; name: string; cost: number; selling: number }[] = [];
        const seen = new Set<string>();

        for (const item of items) {
          const mainNo = item.no.split('.')[0];
          if (!mainNo || item.no.includes('.') || seen.has(mainNo)) continue;
          seen.add(mainNo);

          const catItems = items.filter(i => i.no.startsWith(mainNo + '.') && i.quantity !== '' && i.quantity !== undefined);
          if (catItems.length === 0) continue;

          let cost = 0;
          let selling = 0;
          for (const ci of catItems) {
            const qty = Number(ci.quantity) || 0;
            const tp = ci.totalPrice !== undefined && ci.totalPrice !== null && ci.totalPrice !== '' ? Number(ci.totalPrice) || 0 : null;
            cost += tp !== null ? qty * tp : qty * ((Number(ci.unitPrice) || 0) + (Number(ci.laborCost) || 0));
            selling += getProjectCustomerAmount(project, ci);
          }

          categories.push({ no: mainNo, name: item.description, cost: Math.round(cost), selling: Math.round(selling) });
        }

        const totalCost = categories.reduce((s, c) => s + c.cost, 0);
        const totalSelling = categories.reduce((s, c) => s + c.selling, 0);
        const totalProfit = totalSelling - totalCost;

        return (
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <button
              onClick={(e) => {
                const panel = (e.currentTarget as HTMLElement).nextElementSibling as HTMLElement;
                panel.classList.toggle('hidden');
              }}
              className="w-full flex items-center justify-between px-5 py-3 hover:bg-secondary transition-colors"
            >
              <h3 className="text-xs font-bold tracking-widest text-muted-foreground uppercase">ต้นทุน vs ราคาขาย แยกหมวด</h3>
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            </button>

            <div className="hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-secondary text-muted-foreground">
                    <th className="px-4 py-2 text-left font-semibold">หมวด</th>
                    <th className="px-3 py-2 text-right font-semibold">ต้นทุน</th>
                    <th className="px-3 py-2 text-right font-semibold">ราคาขาย</th>
                    <th className="px-3 py-2 text-right font-semibold">กำไร</th>
                    <th className="px-3 py-2 text-right font-semibold">%</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((cat) => {
                    const catProfit = cat.selling - cat.cost;
                    const catMargin = cat.selling > 0 ? Math.round((catProfit / cat.selling) * 100) : 0;
                    const hasCost = cat.cost > 0;
                    return (
                      <tr key={cat.no} className="border-t border-border hover:bg-secondary/50">
                        <td className="px-4 py-2 text-foreground">
                          <span className="font-semibold text-muted-foreground mr-1.5">{cat.no}.</span>
                          {cat.name}
                        </td>
                        <td className={`px-3 py-2 text-right font-mono ${hasCost ? 'text-foreground' : 'text-red-400'}`}>
                          {hasCost ? formatCurrency(cat.cost) : 'ยังไม่ใส่'}
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-primary">{formatCurrency(cat.selling)}</td>
                        <td className={`px-3 py-2 text-right font-mono font-semibold ${catProfit > 0 ? 'text-emerald-600' : catProfit < 0 ? 'text-red-600' : 'text-slate-400'}`}>
                          {hasCost ? formatCurrency(catProfit) : '-'}
                        </td>
                        <td className={`px-3 py-2 text-right text-[10px] font-semibold ${catMargin > 0 ? 'text-emerald-500' : 'text-slate-400'}`}>
                          {hasCost ? `${catMargin}%` : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border bg-secondary font-semibold text-sm">
                    <td className="px-4 py-2.5 text-foreground">รวม</td>
                    <td className="px-3 py-2.5 text-right font-mono text-foreground">{formatCurrency(totalCost)}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-primary">{formatCurrency(totalSelling)}</td>
                    <td className={`px-3 py-2.5 text-right font-mono ${totalProfit > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {formatCurrency(totalProfit)}
                    </td>
                    <td className="px-3 py-2.5 text-right text-xs text-emerald-500">
                      {totalSelling > 0 ? `${Math.round((totalProfit / totalSelling) * 100)}%` : '-'}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        );
      })()}

      {/* Quick document access */}
      <div>
        <h3 className="text-xs font-bold tracking-widest text-muted-foreground uppercase mb-4 mt-2 text-center">เอกสารทั้งหมด</h3>
        <div className="grid grid-cols-4 gap-2 sm:gap-3">
          {docs.map((doc) => (
            <button
              key={doc.type}
              onClick={() => doc.ready && onViewDoc(doc.type)}
              disabled={!doc.ready}
              className={`group relative flex flex-col items-center p-3 sm:p-4 rounded-[1.25rem] border transition-all duration-300 ${
                doc.ready
                  ? 'bg-gradient-to-bl from-kinari-50 via-card to-wood-50/90 border-wood-100/60 shadow-[0_4px_20px_-4px_rgba(87,74,61,0.08)] hover:border-wood-300 hover:shadow-[0_8px_30px_-6px_rgba(87,74,61,0.2)] hover:-translate-y-1 hover:to-wood-100/70'
                  : 'bg-secondary border-border opacity-80 cursor-not-allowed hover:bg-secondary'
              }`}
            >
              {/* 3D Icon */}
              <div className={`w-14 h-14 sm:w-16 sm:h-16 mb-2 transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${doc.ready ? 'group-hover:scale-110 group-hover:-translate-y-1' : ''}`}>
                <img
                  src={doc.image}
                  alt=""
                  className={`w-full h-full object-contain transition-all duration-500 ${doc.ready ? 'filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.15)] group-hover:drop-shadow-[0_12px_24px_rgba(59,130,246,0.3)]' : 'filter grayscale opacity-60'}`}
                  loading="lazy"
                />
              </div>

              {/* Label */}
              <p className={`text-[11px] sm:text-[12px] font-extrabold text-center leading-tight transition-colors duration-300 ${doc.ready ? 'text-foreground group-hover:text-primary' : 'text-muted-foreground'}`}>{doc.label}</p>

              {/* Status dot */}
              <div className="flex items-center justify-center w-full gap-1.5 mt-2">
                <span className={`w-[5px] h-[5px] rounded-full transition-all duration-300 ${doc.ready ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-300'}`} />
                <span className={`text-[9.5px] font-semibold tracking-wide ${doc.ready ? 'text-emerald-600' : 'text-slate-400'}`}>{doc.ready ? 'พร้อม' : 'ยังไม่พร้อม'}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Quick actions */}
      <div className="mt-8 mb-6">
        <h3 className="text-xs font-bold tracking-widest text-muted-foreground uppercase mb-4 text-center">ดำเนินการ (Workflow)</h3>
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <ActionCard
            title="เอกสารลูกค้า"
            subtitle="ทำใบเสนอราคา & งวด"
            image="https://firebasestorage.googleapis.com/v0/b/ezdoc-v1-th.firebasestorage.app/o/partner%2Ficon_customer_1774970225464-removebg-preview.png?alt=media&token=e56a5885-e2aa-4db6-b82c-52655396a88c"
            onClick={() => onNavigate('customer')}
            color="blue"
          />
          <ActionCard
            title="จัดซื้อวัสดุ"
            subtitle="เช็กราคา & สร้าง PO"
            image="https://firebasestorage.googleapis.com/v0/b/ezdoc-v1-th.firebasestorage.app/o/partner%2Ficon_procurement_1774970246009-removebg-preview.png?alt=media&token=c19374f8-b997-4c32-8122-532fb06a496f"
            onClick={() => onNavigate('procurement')}
            color="orange"
          />
          <ActionCard
            title="ผู้รับเหมา"
            subtitle="จัดหาช่าง & สัญญา"
            image="https://firebasestorage.googleapis.com/v0/b/ezdoc-v1-th.firebasestorage.app/o/partner%2Ficon_contractor_1774970262249-removebg-preview.png?alt=media&token=9fd27c45-0287-4df3-ad33-6d508109b7d7"
            onClick={() => onNavigate('contractor')}
            color="yellow"
          />
          <ActionCard
            title="การเงิน"
            subtitle="ภาษี, ลดหย่อน & ใบเสร็จ"
            image="https://firebasestorage.googleapis.com/v0/b/ezdoc-v1-th.firebasestorage.app/o/partner%2Ficon_finance_1774970285067-removebg-preview.png?alt=media&token=49af2547-f748-4e5e-b2f5-c62f21d483ff"
            onClick={() => onNavigate('finance')}
            color="emerald"
          />
        </div>
      </div>

      {/* Partner Ads */}
      <div style={{ contentVisibility: 'auto', containIntrinsicSize: '420px' }}>
        <PartnerAds />
      </div>
    </div>
  );
}
