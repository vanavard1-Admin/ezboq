/**
 * Notifications Repository
 * Computes notifications client-side from reports data (overdue bills).
 * When a backend notification API exists, switch to fetching from it.
 */

import { reportsRepo, type OverdueInvoice } from './reports.repo';

export interface AppNotification {
    id: string;
    type: 'overdue' | 'payment' | 'opened' | 'info';
    title: string;
    description: string;
    time: string;
    href?: string;
    read: boolean;
}

const READ_KEY = 'ezdoc_notif_read';

function getReadIds(): Set<string> {
    try {
        const raw = localStorage.getItem(READ_KEY);
        return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch {
        return new Set();
    }
}

function saveReadIds(ids: Set<string>) {
    try {
        localStorage.setItem(READ_KEY, JSON.stringify([...ids]));
    } catch { /* ignore */ }
}

function overdueToNotification(inv: OverdueInvoice): AppNotification {
    return {
        id: `overdue-${inv.docNo}`,
        type: 'overdue',
        title: `บิลเกินกำหนด: ${inv.docNo}`,
        description: `${inv.customerName} — ฿${inv.amount.toLocaleString()} (เกิน ${inv.overdueByDays} วัน)`,
        time: `ครบกำหนด ${inv.dueDate}`,
        href: `/dashboard/documents`,
        read: false,
    };
}

export const notificationsRepo = {
    /**
     * Fetch notifications (currently computed from overdue bills)
     */
    async getNotifications(): Promise<AppNotification[]> {
        try {
            const summary = await reportsRepo.getSummary();
            const readIds = getReadIds();

            const notifications: AppNotification[] = (summary.overdue ?? []).map((inv) => {
                const notif = overdueToNotification(inv);
                notif.read = readIds.has(notif.id);
                return notif;
            });

            return notifications;
        } catch {
            return [];
        }
    },

    markAsRead(id: string) {
        const ids = getReadIds();
        ids.add(id);
        saveReadIds(ids);
    },

    markAllAsRead(notifications: AppNotification[]) {
        const ids = getReadIds();
        notifications.forEach((n) => ids.add(n.id));
        saveReadIds(ids);
    },
};
