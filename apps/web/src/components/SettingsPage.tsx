/**
 * SettingsPage — in-app settings (profile, company, subscription, team)
 * Extracted from AppShell.tsx (Phase 3 refactor)
 */
import { Suspense, lazy, useState, useCallback, type ComponentType } from 'react';
import { toast } from 'sonner@2.0.3';
import type { AuthSession } from '../utils/authSession';
import type { CompanyProfile } from '../utils/companyProfile';
import { loadThemeId, getThemeById, applyTheme, saveThemeId } from '../utils/themePresets';
import { SubscriptionPanel } from './SubscriptionPanel';
import { TeamPanel } from './TeamPanel';
import type { PlanTier, SettingsTab } from './AppShellTypes';

function lazyNamed<TModule, TKey extends keyof TModule>(
  loader: () => Promise<TModule>,
  key: TKey,
) {
  return lazy(() =>
    loader().then((module) => ({
      default: module[key] as ComponentType<Record<string, unknown>>,
    })),
  );
}

const ProfilePage = lazyNamed(() => import('../features/profile/ProfilePage'), 'ProfilePage');
const CompanyProfileSettings = lazyNamed(() => import('./CompanyProfileSettings'), 'CompanyProfileSettings');

export function SettingsPage({
  session,
  companyProfile,
  onSaveCompanyProfile,
  onSignOut,
  onBack,
  planTier,
  onOpenPricing,
  onOpenAdminSub,
  onOpenAdminMemory,
  initialTab = 'profile',
}: {
  session: AuthSession;
  companyProfile: CompanyProfile;
  onSaveCompanyProfile: (p: CompanyProfile) => void;
  onSignOut: () => void;
  onBack: () => void;
  planTier: PlanTier;
  onOpenPricing?: () => void;
  onOpenAdminSub?: () => void;
  onOpenAdminMemory?: () => void;
  initialTab?: SettingsTab;
}) {
  const [tab, setTab] = useState<SettingsTab>(initialTab);
  const isOwner = session.user.role === 'owner';
  const isFreeTier = planTier === 'free';

  const handleTabChange = useCallback((nextTab: SettingsTab) => {
    if (nextTab === 'team' && isFreeTier) {
      toast.message('ฟีเจอร์ทีมอยู่ในแพ็ก Business', {
        description: 'อัปเกรดเพื่อเชิญสมาชิกและจัดการทีม',
      });
      setTab('subscription');
      onOpenPricing?.();
      return;
    }
    setTab(nextTab);
  }, [isFreeTier, onOpenPricing]);

  const tabs: { key: SettingsTab; label: string }[] = [
    { key: 'profile', label: 'โปรไฟล์' },
    { key: 'company', label: 'บริษัท' },
    { key: 'subscription', label: 'แผนสมาชิก' },
    { key: 'team', label: 'ทีม' },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-20 bg-white border-b border-slate-200">
        <div className="px-4 py-3 flex items-center justify-between">
          <button onClick={onBack} className="text-sm text-blue-600 font-medium">
            กลับ
          </button>
          <h1 className="text-sm font-semibold text-slate-800">ตั้งค่า</h1>
          <div className="w-10" />
        </div>
        {/* Sub-tabs */}
        <div className="flex px-4 gap-1 -mb-px">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => handleTabChange(t.key)}
              className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${
                tab === t.key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </header>

      <Suspense fallback={<div className="p-6 text-center text-sm text-slate-400">กำลังโหลด...</div>}>
        {tab === 'profile' && (
          <ProfilePage user={session.user} workspaceMode={session.workspaceMode} lineLinked={session.lineLinked} />
        )}
        {tab === 'company' && (
          <CompanyProfileSettings
            profile={{ ...companyProfile, bankAccounts: companyProfile.bankAccounts || [] }}
            onSave={onSaveCompanyProfile}
            currentThemeId={loadThemeId()}
            onThemeChange={(id: string) => { saveThemeId(id); applyTheme(getThemeById(id)); }}
          />
        )}
        {tab === 'subscription' && (
          <>
            <SubscriptionPanel user={session.user} />
            {isOwner && (onOpenAdminSub || onOpenAdminMemory) && (
              <div className="max-w-lg mx-auto px-4 pb-4 space-y-2">
                {onOpenAdminSub && (
                  <button
                    onClick={onOpenAdminSub}
                    className="w-full py-3 rounded-xl border-2 border-dashed border-slate-300 text-sm font-medium text-slate-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                  >
                    จัดการคำขอสมัครสมาชิก (Admin)
                  </button>
                )}
                {onOpenAdminMemory && (
                  <button
                    onClick={onOpenAdminMemory}
                    className="w-full py-3 rounded-xl border-2 border-dashed border-slate-300 text-sm font-medium text-slate-500 hover:border-emerald-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                  >
                    จัดการ AI Memory (Admin)
                  </button>
                )}
              </div>
            )}
          </>
        )}
        {tab === 'team' && (
          <TeamPanel user={session.user} isOwner={isOwner} />
        )}
      </Suspense>

      {/* Footer links */}
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-2">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">อื่นๆ</h3>
        <a href="#privacy" className="block px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 hover:bg-slate-50">
          นโยบายความเป็นส่วนตัว
        </a>
        <a href="#guide" className="block px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 hover:bg-slate-50">
          คู่มือใช้งาน
        </a>
        <a href="#faq" className="block px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 hover:bg-slate-50">
          คำถามที่พบบ่อย
        </a>
        <a href="#docs" className="block px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 hover:bg-slate-50">
          โมดูลเอกสาร EzDoc
        </a>
        <button
          onClick={onSignOut}
          className="w-full px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 font-medium hover:bg-red-100"
        >
          ออกจากระบบ
        </button>
        <p className="text-center text-[10px] text-slate-300 pt-2">EzBOQ v2.0</p>
      </div>
    </div>
  );
}
