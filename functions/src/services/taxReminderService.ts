import * as admin from 'firebase-admin';
import { getDb } from '../core/firebaseAdmin';
import { getTaxStatusReport, getVatSummary } from '../core/taxReportService';
import { pushLineMessage } from './lineService';

const db = getDb();

const REMINDER_COOLDOWN_HOURS = 72; // avoid spamming
const MAX_SETTINGS_SCAN = 500;

type ReminderSettings = {
  type?: string;
  enabled?: boolean;
  businessId?: string;
  updatedAt?: string;
  lastSentAt?: admin.firestore.Timestamp | string | null;
  lastSentMonthKey?: string | null;
};

const toDate = (value: unknown): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'string') {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof value === 'object') {
    const ts = value as { toDate?: () => Date; _seconds?: number };
    if (typeof ts.toDate === 'function') {
      const d = ts.toDate();
      return isNaN(d.getTime()) ? null : d;
    }
    if (typeof ts._seconds === 'number') {
      const d = new Date(ts._seconds * 1000);
      return isNaN(d.getTime()) ? null : d;
    }
  }
  return null;
};

const getCurrentMonthKey = (): string => {
  const now = new Date();
  const thaiYear = now.getFullYear() + 543;
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${thaiYear}_${month}`;
};

const monthKeyToLabel = (monthKey: string): string => {
  const [yearStr, monthStr] = monthKey.split('_');
  const monthIdx = Math.max(1, Math.min(12, Number(monthStr))) - 1;
  const thaiMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  return `${thaiMonths[monthIdx]} ${yearStr}`;
};

const formatMoney = (value: number): string => {
  const v = Number.isFinite(value) ? value : 0;
  return `${v.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿`;
};

function parseSettingsPath(path: string): { userId: string; businessId: string } | null {
  const parts = path.split('/');
  // users/{uid}/businesses/{businessId}/settings/{docId}
  if (parts.length < 6) return null;
  if (parts[0] !== 'users' || parts[2] !== 'businesses' || parts[4] !== 'settings') return null;
  return { userId: parts[1], businessId: parts[3] };
}

export async function processTaxReminders(accessToken: string): Promise<{
  sent: number;
  skipped: number;
  errors: number;
}> {
  const monthKey = getCurrentMonthKey();
  const now = Date.now();

  let sent = 0;
  let skipped = 0;
  let errors = 0;

  const settingsSnap = await db
    .collectionGroup('settings')
    .where('type', '==', 'tax_reminder')
    .where('enabled', '==', true)
    .limit(MAX_SETTINGS_SCAN)
    .get();

  for (const doc of settingsSnap.docs) {
    try {
      const settings = doc.data() as ReminderSettings;
      const ids = parseSettingsPath(doc.ref.path);
      if (!ids) {
        skipped += 1;
        continue;
      }

      const { userId, businessId } = ids;
      const userSnap = await db.collection('users').doc(userId).get();
      const lineUserId = userSnap.data()?.lineUserId as string | undefined;
      if (!lineUserId) {
        skipped += 1;
        continue;
      }

      const lastSentAt = toDate(settings.lastSentAt);
      const lastSentMonthKey = settings.lastSentMonthKey || null;
      if (lastSentAt && lastSentMonthKey === monthKey) {
        const diffHours = (now - lastSentAt.getTime()) / (1000 * 60 * 60);
        if (diffHours < REMINDER_COOLDOWN_HOURS) {
          skipped += 1;
          continue;
        }
      }

      const [statusReport, vatSummary] = await Promise.all([
        getTaxStatusReport(businessId, monthKey),
        getVatSummary(userId, businessId, monthKey),
      ]);

      const vatPending = statusReport.vat.status !== 'FILED';
      const whtPending = statusReport.wht.status !== 'FILED';

      if (!vatPending && !whtPending) {
        skipped += 1;
        continue;
      }

      const vatAmount = vatSummary ? Math.max(vatSummary.payable, 0) : 0;
      const monthLabel = monthKeyToLabel(monthKey);
      const message = [
        `🔔 เตือนภาษี (${monthLabel})`,
        vatPending ? `❌ VAT ยังไม่ยื่น • ยอดคาดการณ์ ${formatMoney(vatAmount)}` : '✅ VAT ยื่นแล้ว',
        whtPending ? '❌ WHT ยังไม่ยื่น' : '✅ WHT ยื่นแล้ว',
        '',
        'พิมพ์: ภาษีค้าง / สรุปหัก ณ ที่จ่าย / ภาษี เดือนนี้',
      ].join('\n');

      await pushLineMessage(lineUserId, message, accessToken);

      await doc.ref.set(
        {
          lastSentAt: admin.firestore.FieldValue.serverTimestamp(),
          lastSentMonthKey: monthKey,
        },
        { merge: true }
      );

      sent += 1;
    } catch (error) {
      errors += 1;
      console.error('[taxReminderService] Failed to send reminder:', error);
    }
  }

  return { sent, skipped, errors };
}
