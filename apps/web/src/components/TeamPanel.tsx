import { useCallback, useEffect, useMemo, useState } from 'react';
import { Crown, Mail, Plus, Shield, Trash2, User, Users } from 'lucide-react';
import type { AuthUser, UserRole } from '../utils/authSession';
import { PLANS, checkSubscription, getSubscriptionPlanLabel, type SubscriptionStatus } from '../utils/subscription';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  joinedAt: string;
}

interface PendingInvite {
  id: string;
  email: string;
  role: UserRole;
  sentAt: string;
}

interface TeamPanelProps {
  user: AuthUser;
  isOwner: boolean;
}

const ROLE_LABELS: Record<UserRole, { label: string; color: string; icon: typeof Crown }> = {
  owner: { label: 'เจ้าของ', color: 'bg-amber-100 text-amber-700', icon: Crown },
  member: { label: 'สมาชิก', color: 'bg-blue-100 text-blue-700', icon: Shield },
  client: { label: 'ลูกค้า', color: 'bg-slate-100 text-slate-600', icon: User },
};

export function TeamPanel({ user, isOwner }: TeamPanelProps) {
  // Current user as first member
  const [members, setMembers] = useState<TeamMember[]>([
    {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      joinedAt: new Date().toISOString(),
    },
  ]);

  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('member');
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void checkSubscription(user)
      .then((sub) => {
        if (!cancelled) setSubscription(sub);
      })
      .catch(() => {
        if (!cancelled) setSubscription(null);
      })
      .finally(() => {
        if (!cancelled) setSubscriptionLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  const activePlan = useMemo(() => PLANS.find((plan) => plan.id === subscription?.plan) ?? null, [subscription]);
  const subscriptionIsActive = Boolean(
    subscription &&
      subscription.status === 'active' &&
      (!subscription.endDate || new Date(subscription.endDate) >= new Date()),
  );
  const teamPlanUnlocked = subscriptionIsActive && activePlan?.id === 'team';

  const maxUsers = teamPlanUnlocked ? (activePlan?.maxUsers ?? 3) : 1;

  const handleInvite = useCallback(() => {
    if (!inviteEmail.trim() || !teamPlanUnlocked) return;

    const newInvite: PendingInvite = {
      id: `invite-${Date.now()}`,
      email: inviteEmail.trim(),
      role: inviteRole,
      sentAt: new Date().toISOString(),
    };

    setPendingInvites((prev) => [...prev, newInvite]);
    setInviteEmail('');
    setShowInviteForm(false);
  }, [inviteEmail, inviteRole, teamPlanUnlocked]);

  const handleCancelInvite = useCallback((id: string) => {
    setPendingInvites((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const handleRemoveMember = useCallback((id: string) => {
    if (id === user.id) return; // can't remove self
    setMembers((prev) => prev.filter((m) => m.id !== id));
  }, [user.id]);

  const handleChangeRole = useCallback((id: string, role: UserRole) => {
    if (id === user.id) return;
    setMembers((prev) => prev.map((m) => m.id === id ? { ...m, role } : m));
  }, [user.id]);

  const totalUsers = members.length + pendingInvites.length;
  const canInvite = teamPlanUnlocked && totalUsers < maxUsers;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            ทีม — {user.workspaceName}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {members.length}/{maxUsers} คน · {teamPlanUnlocked ? 'Business plan' : subscriptionLoading ? 'กำลังตรวจสอบแพ็กเกจ' : 'Pro/ไม่มีแพ็กเกจ'}
          </p>
        </div>
        {/* Usage bar */}
        <div className="text-right">
          <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${totalUsers >= maxUsers ? 'bg-red-500' : 'bg-blue-500'}`}
              style={{ width: `${Math.min((totalUsers / maxUsers) * 100, 100)}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">{totalUsers}/{maxUsers}</p>
        </div>
      </div>

      {/* Members list */}
      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">สมาชิก</h3>
        {members.map((member) => {
          const roleInfo = ROLE_LABELS[member.role];
          const RoleIcon = roleInfo.icon;
          const isSelf = member.id === user.id;

          return (
            <div key={member.id} className="bg-white border border-slate-200 rounded-xl p-3 flex items-center gap-3">
              {/* Avatar */}
              <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-semibold text-blue-700">
                  {member.name.charAt(0).toUpperCase()}
                </span>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">
                  {member.name}
                  {isSelf && <span className="text-xs text-slate-400 ml-1">(คุณ)</span>}
                </p>
                <p className="text-xs text-slate-400 truncate">{member.email}</p>
              </div>

              {/* Role badge / editor */}
              {isOwner && !isSelf ? (
                <select
                  value={member.role}
                  onChange={(e) => handleChangeRole(member.id, e.target.value as UserRole)}
                  className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white text-slate-600 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 focus:outline-none"
                >
                  <option value="member">สมาชิก</option>
                  <option value="client">ลูกค้า</option>
                </select>
              ) : (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${roleInfo.color}`}>
                  <RoleIcon className="w-3 h-3 inline mr-0.5" />
                  {roleInfo.label}
                </span>
              )}

              {/* Remove */}
              {isOwner && !isSelf && (
                <button
                  onClick={() => handleRemoveMember(member.id)}
                  className="p-1.5 text-slate-300 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Pending invites */}
      {pendingInvites.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">รอตอบรับ</h3>
          {pendingInvites.map((invite) => (
            <div key={invite.id} className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                <Mail className="w-4 h-4 text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-700 truncate">{invite.email}</p>
                <p className="text-[10px] text-amber-600">
                  {ROLE_LABELS[invite.role].label} · ส่งเมื่อ {new Date(invite.sentAt).toLocaleDateString('th-TH')}
                </p>
              </div>
              {isOwner && (
                <button
                  onClick={() => handleCancelInvite(invite.id)}
                  className="text-xs text-red-500 hover:text-red-700 font-medium"
                >
                  ยกเลิก
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Invite form */}
      {isOwner && (
        <div>
          {!teamPlanUnlocked && !subscriptionLoading && (
            <p className="mb-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg">
              การเชิญสมาชิกใช้ได้เฉพาะแพ็กเกจ Business ที่ active เท่านั้น — กรุณาอัปเกรด/ต่ออายุในแท็บแพ็กเกจ
            </p>
          )}
          {!showInviteForm ? (
            <button
              onClick={() => canInvite && setShowInviteForm(true)}
              disabled={!canInvite}
              className={`flex items-center gap-1.5 text-sm font-medium ${
                canInvite
                  ? 'text-blue-600 hover:text-blue-700'
                  : 'text-slate-300 cursor-not-allowed'
              }`}
            >
              <Plus className="w-4 h-4" />
              เชิญสมาชิก
            </button>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
              <h4 className="text-sm font-semibold text-slate-700">เชิญสมาชิกใหม่</h4>

              <div>
                <label className="block text-xs text-slate-500 mb-1">อีเมล</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-500 mb-1">สิทธิ์</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setInviteRole('member')}
                    className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                      inviteRole === 'member'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <Shield className="w-3.5 h-3.5 inline mr-1" />
                    สมาชิก
                  </button>
                  <button
                    onClick={() => setInviteRole('client')}
                    className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                      inviteRole === 'client'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <User className="w-3.5 h-3.5 inline mr-1" />
                    ลูกค้า
                  </button>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleInvite}
                  disabled={!inviteEmail.trim()}
                  className="flex-1 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ส่งคำเชิญ
                </button>
                <button
                  onClick={() => { setShowInviteForm(false); setInviteEmail(''); }}
                  className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700"
                >
                  ยกเลิก
                </button>
              </div>

              <p className="text-[10px] text-slate-400">
                แผนปัจจุบันรองรับสูงสุด {maxUsers} คน ({totalUsers}/{maxUsers} ใช้อยู่) {teamPlanUnlocked ? '' : `· ต้องใช้แพ็ก ${getSubscriptionPlanLabel('team')} เพื่อเชิญสมาชิก`}
              </p>
            </div>
          )}

          {!canInvite && !showInviteForm && (
            <p className="text-xs text-amber-600 mt-2 bg-amber-50 px-3 py-2 rounded-lg">
              {teamPlanUnlocked
                ? `ถึงจำนวนผู้ใช้สูงสุดของแผนนี้แล้ว (${maxUsers} คน) — อัพเกรดแผนเพื่อเพิ่มสมาชิก`
                : 'ต้องเปิดใช้งานแพ็กเกจ Business ก่อน จึงจะเชิญสมาชิกได้'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
