'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { teamRepo, type TeamMember, type TeamRole } from '@/lib/repos/team.repo';
import {
    Loader2,
    UserPlus,
    Shield,
    Edit3,
    Eye,
    Mail,
    Clock,
    ChevronDown,
    Users2,
    Info,
} from 'lucide-react';

const roleLabels: Record<TeamRole, string> = {
    ADMIN: 'แอดมิน',
    EDITOR: 'แก้ไขได้',
    VIEWER: 'ดูเท่านั้น',
};

const roleBadgeColors: Record<TeamRole, string> = {
    ADMIN: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    EDITOR: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    VIEWER: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
};

const roleDescriptions: Record<TeamRole, string> = {
    ADMIN: 'จัดการสมาชิก, สร้าง/แก้ไข/ลบเอกสาร, ดูรายงาน, ตั้งค่าธุรกิจ',
    EDITOR: 'สร้าง/แก้ไขเอกสาร, ดูลูกค้า, ดูรายงาน',
    VIEWER: 'ดูเอกสารและรายงานเท่านั้น ไม่สามารถแก้ไขได้',
};

export default function TeamPage() {
    const { profile } = useAuth();
    const [members, setMembers] = useState<TeamMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [apiAvailable, setApiAvailable] = useState(true);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState<TeamRole>('EDITOR');
    const [inviting, setInviting] = useState(false);
    const [showRoleInfo, setShowRoleInfo] = useState(false);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const res = await teamRepo.listMembers();
                setMembers(res);
            } catch {
                // API not available yet — show empty state
                setApiAvailable(false);
                // Show current user as the only member
                if (profile) {
                    setMembers([{
                        id: 'self',
                        email: profile.email || '',
                        displayName: profile.business?.name || 'คุณ',
                        role: 'ADMIN',
                        status: 'ACTIVE',
                    }]);
                }
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [profile]);

    const handleInvite = async () => {
        if (!inviteEmail.trim()) return;
        setInviting(true);
        try {
            await teamRepo.inviteMember(inviteEmail.trim(), inviteRole);
            setMembers((prev) => [
                ...prev,
                {
                    id: `pending-${Date.now()}`,
                    email: inviteEmail.trim(),
                    displayName: inviteEmail.trim(),
                    role: inviteRole,
                    status: 'PENDING',
                },
            ]);
            setInviteEmail('');
        } catch {
            alert('ไม่สามารถส่งคำเชิญได้ในขณะนี้');
        } finally {
            setInviting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-32">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">จัดการทีม</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">เชิญสมาชิกเข้าร่วมและกำหนดสิทธิ์การใช้งาน</p>
            </div>

            {!apiAvailable && (
                <div className="flex items-center gap-3 rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4">
                    <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                    <div>
                        <p className="text-sm font-medium text-amber-800 dark:text-amber-300">เร็วๆ นี้</p>
                        <p className="text-xs text-amber-600 dark:text-amber-400">ระบบทีมกำลังพัฒนาอยู่ คุณสามารถเตรียมโครงสร้างทีมได้ล่วงหน้า</p>
                    </div>
                </div>
            )}

            {/* Invite Form */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm">
                <h3 className="mb-4 text-sm font-semibold text-slate-900 dark:text-slate-100">เชิญสมาชิกใหม่</h3>
                <div className="flex flex-col gap-3 sm:flex-row">
                    <div className="flex-1">
                        <input
                            type="email"
                            placeholder="อีเมลสมาชิก"
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                    </div>
                    <select
                        value={inviteRole}
                        onChange={(e) => setInviteRole(e.target.value as TeamRole)}
                        className="rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-700 dark:text-slate-300 focus:border-emerald-500 focus:outline-none"
                    >
                        <option value="ADMIN">แอดมิน</option>
                        <option value="EDITOR">แก้ไขได้</option>
                        <option value="VIEWER">ดูเท่านั้น</option>
                    </select>
                    <button
                        onClick={handleInvite}
                        disabled={inviting || !inviteEmail.trim() || !apiAvailable}
                        className="flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                        ส่งคำเชิญ
                    </button>
                </div>
            </div>

            {/* Role Descriptions */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
                <button
                    onClick={() => setShowRoleInfo((v) => !v)}
                    className="flex w-full items-center justify-between px-6 py-4 text-sm font-semibold text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                >
                    <span className="flex items-center gap-2">
                        <Info className="h-4 w-4 text-slate-400" />
                        สิทธิ์การใช้งานแต่ละบทบาท
                    </span>
                    <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${showRoleInfo ? 'rotate-180' : ''}`} />
                </button>
                {showRoleInfo && (
                    <div className="border-t border-slate-100 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700">
                        {(Object.keys(roleDescriptions) as TeamRole[]).map((role) => {
                            const Icon = role === 'ADMIN' ? Shield : role === 'EDITOR' ? Edit3 : Eye;
                            return (
                                <div key={role} className="flex items-start gap-3 px-6 py-3">
                                    <div className={`mt-0.5 rounded-lg p-1.5 ${roleBadgeColors[role]}`}>
                                        <Icon className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{roleLabels[role]}</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">{roleDescriptions[role]}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Members List */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 px-6 py-4">
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                        <Users2 className="h-4 w-4 text-slate-400" />
                        สมาชิก ({members.length})
                    </h3>
                </div>
                {members.length === 0 ? (
                    <p className="px-6 py-8 text-center text-sm text-slate-400 dark:text-slate-500">ยังไม่มีสมาชิก</p>
                ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-700">
                        {members.map((member) => (
                            <div key={member.id} className="flex items-center justify-between px-6 py-4">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700 text-sm font-bold text-slate-600 dark:text-slate-300">
                                        {member.displayName.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                                            {member.displayName}
                                            {member.id === 'self' && <span className="ml-1 text-xs text-slate-400">(คุณ)</span>}
                                        </p>
                                        <p className="flex items-center gap-1 truncate text-xs text-slate-500 dark:text-slate-400">
                                            <Mail className="h-3 w-3" /> {member.email}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                    {member.status === 'PENDING' && (
                                        <span className="rounded-full bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300">
                                            รอตอบรับ
                                        </span>
                                    )}
                                    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${roleBadgeColors[member.role]}`}>
                                        {roleLabels[member.role]}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
