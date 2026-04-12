import { getDb } from './core/firebaseAdmin';
/**
 * Monthly Report Push (Production-Hardened)
 * ==========================================
 * Cloud Scheduler triggers on day 1 of each month at 00:10 Bangkok time
 * 
 * Security:
 * - OIDC token verification (only Cloud Scheduler can invoke)
 * - Rate limiting with exponential backoff
 * 
 * Efficiency:
 * - Uses line_report_recipients registry (no expensive != null queries)
 * - Business-level idempotency marker
 * 
 * Data model:
 * - line_report_recipients/{uid_businessId} → Recipients registry
 * - businesses/{businessId}/stats_monthly/{YYYY-MM} → Stats (write-through)
 * - businesses/{businessId}/reports_monthly/{YYYY-MM} → Idempotency marker
 */

import * as functions from 'firebase-functions/v2';
import * as admin from 'firebase-admin';
import fetch from 'node-fetch';
import { getMonthlyStats, type MonthlyStats } from './core/statsMonthly';
import { verifySchedulerAuth, isDevBypass } from './core/schedulerAuth';
import { getEnabledRecipients, markReportSent, type ReportRecipient } from './core/reportRecipients';
import { getLineChannelAccessToken } from './shared/config';

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

const LINE_API_URL = 'https://api.line.me/v2/bot/message/push';
const WEB_BASE_URL = 'https://doc.ezboq.com';

// Rate limiting config
const BATCH_SIZE = 10;           // Process N recipients per batch
const BATCH_DELAY_MS = 200;      // Delay between batches
const MAX_RETRIES = 3;           // Max retries per LINE push
const INITIAL_BACKOFF_MS = 1000; // Initial backoff for retry

// Document type labels
const DOC_TYPE_LABELS: { [key: string]: string } = {
  QUOTE: 'ใบเสนอราคา',
  INVOICE: 'ใบวางบิล',
  RECEIPT: 'ใบเสร็จ',
};

interface ReportMarker {
  yearMonth: string;
  processedAt: admin.firestore.Timestamp;
  sentTo: string[];       // lineUserIds that received the report
  status: 'SENT' | 'PARTIAL' | 'FAILED';
  stats_snapshot?: MonthlyStats | null;
  errors?: string[];
}

/**
 * Get previous month in YYYY-MM format
 */
function getPreviousMonth(): { yearMonth: string; displayTh: string } {
  const now = new Date();
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const year = prevMonth.getFullYear();
  const month = prevMonth.getMonth() + 1;
  const yearMonth = `${year}-${month.toString().padStart(2, '0')}`;

  const thaiMonths = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];
  const thaiYear = year + 543;
  const displayTh = `${thaiMonths[month - 1]} ${thaiYear}`;

  return { yearMonth, displayTh };
}

function formatCurrency(amount: number): string {
  return amount.toLocaleString('th-TH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Build monthly report Flex Message
 */
function buildMonthlyReportFlex(
  stats: MonthlyStats,
  businessId: string,
  businessName: string,
  displayMonth: string,
  yearMonth: string
): object {
  const typeBreakdown = Object.entries(stats.docs_by_type)
    .filter(([, count]) => count > 0)
    .map(([type, count]) => ({
      type: 'box',
      layout: 'horizontal',
      contents: [
        { type: 'text', text: DOC_TYPE_LABELS[type] || type, size: 'sm', color: '#555555', flex: 3 },
        { type: 'text', text: `${count} ฉบับ`, size: 'sm', color: '#111111', align: 'end', flex: 2 },
      ],
    }));

  return {
    type: 'flex',
    altText: `📊 สรุปเดือน${displayMonth} - ${businessName}`,
    contents: {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [
          { type: 'text', text: '📊 สรุปรายเดือน', weight: 'bold', size: 'lg', color: '#FFFFFF' },
          { type: 'text', text: displayMonth, size: 'md', color: '#FFFFFFCC', margin: 'xs' },
        ],
        backgroundColor: '#0367D3',
        paddingAll: '20px',
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          { type: 'text', text: businessName, weight: 'bold', size: 'md', margin: 'none' },
          { type: 'separator', margin: 'lg' },
          {
            type: 'box',
            layout: 'vertical',
            margin: 'lg',
            contents: [
              {
                type: 'box', layout: 'horizontal',
                contents: [
                  { type: 'text', text: 'เอกสารทั้งหมด', size: 'md', color: '#555555', flex: 3 },
                  { type: 'text', text: `${stats.docs_total} ฉบับ`, weight: 'bold', size: 'md', color: '#111111', align: 'end', flex: 2 },
                ],
              },
              {
                type: 'box', layout: 'horizontal', margin: 'md',
                contents: [
                  { type: 'text', text: 'ยอดรวม', size: 'md', color: '#555555', flex: 3 },
                  { type: 'text', text: `฿${formatCurrency(stats.total_amount_thb)}`, weight: 'bold', size: 'md', color: '#1DB446', align: 'end', flex: 2 },
                ],
              },
              {
                type: 'box', layout: 'horizontal', margin: 'md',
                contents: [
                  { type: 'text', text: 'ส่ง LINE', size: 'sm', color: '#555555', flex: 3 },
                  { type: 'text', text: `✓${stats.pdf_sent_total} ✗${stats.pdf_failed_total}`, size: 'sm', color: '#666666', align: 'end', flex: 2 },
                ],
              },
              {
                type: 'box', layout: 'horizontal', margin: 'sm',
                contents: [
                  { type: 'text', text: 'เอกสารที่ออก', size: 'sm', color: '#555555', flex: 3 },
                  { type: 'text', text: `${stats.credits_spent} รายการ`, size: 'sm', color: '#666666', align: 'end', flex: 2 },
                ],
              },
            ],
          },
          ...(typeBreakdown.length > 0 ? [
            { type: 'separator', margin: 'lg' },
            { type: 'text', text: 'แยกตามประเภท', size: 'sm', color: '#999999', margin: 'lg' },
            { type: 'box', layout: 'vertical', margin: 'md', spacing: 'sm', contents: typeBreakdown },
          ] : []),
        ],
        paddingAll: '20px',
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          {
            type: 'box', layout: 'horizontal', spacing: 'sm',
            contents: [
              {
                type: 'button', style: 'primary', height: 'sm', flex: 1, color: '#0367D3',
                action: { type: 'uri', label: '📋 ดูรายละเอียด', uri: `${WEB_BASE_URL}/reports/${yearMonth}?b=${businessId}` },
              },
              {
                type: 'button', style: 'secondary', height: 'sm', flex: 1,
                action: { type: 'uri', label: '📄 ประวัติเอกสาร', uri: `${WEB_BASE_URL}/history?b=${businessId}` },
              },
            ],
          },
          { type: 'text', text: 'ขอบคุณที่ใช้บริการ EzDoc 💙', size: 'xs', color: '#999999', align: 'center', margin: 'md' },
        ],
        paddingAll: '15px',
      },
    },
  };
}

/**
 * Build "no activity" message
 */
function buildNoActivityFlex(businessName: string, displayMonth: string): object {
  return {
    type: 'flex',
    altText: `📊 สรุปเดือน${displayMonth} - ${businessName}`,
    contents: {
      type: 'bubble',
      size: 'kilo',
      header: {
        type: 'box', layout: 'vertical', backgroundColor: '#0367D3', paddingAll: '20px',
        contents: [
          { type: 'text', text: '📊 สรุปรายเดือน', weight: 'bold', size: 'lg', color: '#FFFFFF' },
          { type: 'text', text: displayMonth, size: 'md', color: '#FFFFFFCC', margin: 'xs' },
        ],
      },
      body: {
        type: 'box', layout: 'vertical', paddingAll: '20px', justifyContent: 'center',
        contents: [
          { type: 'text', text: businessName, weight: 'bold', size: 'md', align: 'center' },
          { type: 'text', text: 'ไม่มีเอกสารในเดือนนี้', size: 'md', color: '#666666', align: 'center', margin: 'lg' },
          { type: 'text', text: 'พิมพ์ "สร้าง" เพื่อเริ่มต้นใช้งาน 😊', size: 'sm', color: '#999999', align: 'center', margin: 'md' },
        ],
      },
    },
  };
}

/**
 * Send LINE message with retry and exponential backoff
 */
async function sendLineFlexMessageWithRetry(
  lineUserId: string,
  flexMessage: object,
  token: string
): Promise<{ success: boolean; error?: string }> {
  let lastError = '';

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(LINE_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          to: lineUserId,
          messages: [flexMessage],
        }),
      });

      if (response.ok) {
        return { success: true };
      }

      const statusCode = response.status;
      const errorText = await response.text();
      lastError = `HTTP ${statusCode}: ${errorText}`;

      // Don't retry on 4xx client errors (except 429)
      if (statusCode >= 400 && statusCode < 500 && statusCode !== 429) {
        return { success: false, error: lastError };
      }

      // Retry on 429 (rate limit) or 5xx (server error)
      if (attempt < MAX_RETRIES) {
        const backoffMs = INITIAL_BACKOFF_MS * Math.pow(2, attempt - 1);
        console.log(`[LINE] Retry ${attempt}/${MAX_RETRIES} for ${lineUserId} after ${backoffMs}ms`);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
      }

    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);

      if (attempt < MAX_RETRIES) {
        const backoffMs = INITIAL_BACKOFF_MS * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
      }
    }
  }

  return { success: false, error: lastError };
}

/**
 * Main handler: Push Monthly Report
 */
export const pushMonthlyReport = functions.https.onRequest(
  {
    region: 'asia-southeast1',
    timeoutSeconds: 540,
    memory: '512MiB',
    secrets: ['LINE_CHANNEL_ACCESS_TOKEN'],
  },
  async (req, res) => {
    // ============================
    // 1. AUTHENTICATION
    // ============================
    const isDev = isDevBypass(req);

    if (!isDev) {
      const authResult = await verifySchedulerAuth(req);
      if (!authResult.valid) {
        console.warn(`[Monthly Report] Auth failed: ${authResult.error}`);
        res.status(401).json({ error: 'Unauthorized', detail: authResult.error });
        return;
      }
      console.log(`[Monthly Report] Auth OK: ${authResult.email}`);
    } else {
      console.log(`[Monthly Report] Dev bypass enabled`);
    }

    const db = getDb();
    const lineToken = getLineChannelAccessToken();

    if (!lineToken) {
      res.status(500).json({ error: 'LINE_CHANNEL_ACCESS_TOKEN not configured' });
      return;
    }

    // ============================
    // 2. DETERMINE TARGET MONTH
    // ============================
    let targetMonth: { yearMonth: string; displayTh: string };

    if (req.query.yearMonth && typeof req.query.yearMonth === 'string') {
      const [year, month] = req.query.yearMonth.split('-').map(Number);
      const thaiMonths = [
        'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
        'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
      ];
      targetMonth = {
        yearMonth: req.query.yearMonth,
        displayTh: `${thaiMonths[month - 1]} ${year + 543}`,
      };
      console.log(`[Monthly Report] Manual override: ${req.query.yearMonth}`);
    } else {
      targetMonth = getPreviousMonth();
    }

    const { yearMonth, displayTh } = targetMonth;
    console.log(`[Monthly Report] Processing: ${yearMonth} (${displayTh})`);

    // ============================
    // 3. GET RECIPIENTS (efficient registry query)
    // ============================
    const recipients = await getEnabledRecipients();
    console.log(`[Monthly Report] Found ${recipients.length} enabled recipients`);

    if (recipients.length === 0) {
      res.json({
        status: 'completed',
        yearMonth,
        displayMonth: displayTh,
        recipientsProcessed: 0,
        messagesSent: 0,
        skipped: 0,
        errorCount: 0,
      });
      return;
    }

    // ============================
    // 4. GROUP BY BUSINESS (for idempotency)
    // ============================
    const businessRecipients = new Map<string, ReportRecipient[]>();

    for (const recipient of recipients) {
      const bizId = recipient.businessId;
      if (!businessRecipients.has(bizId)) {
        businessRecipients.set(bizId, []);
      }
      businessRecipients.get(bizId)!.push(recipient);
    }

    console.log(`[Monthly Report] ${businessRecipients.size} unique businesses`);

    // ============================
    // 5. PROCESS EACH BUSINESS
    // ============================
    let recipientsProcessed = 0;
    let messagesSent = 0;
    let skipped = 0;
    const errors: string[] = [];

    let batchCount = 0;

    for (const [businessId, bizRecipients] of businessRecipients) {
      // Check business-level idempotency marker
      const markerRef = db.doc(`businesses/${businessId}/reports_monthly/${yearMonth}`);
      const markerSnap = await markerRef.get();

      if (markerSnap.exists) {
        const marker = markerSnap.data() as ReportMarker;
        // Skip if already fully sent
        if (marker.status === 'SENT') {
          console.log(`[Monthly Report] Skip ${businessId}: already sent`);
          skipped += bizRecipients.length;
          continue;
        }
      }

      // Get stats for this business
      const stats = await getMonthlyStats(businessId, yearMonth);
      const businessName = bizRecipients[0]?.businessName || 'ธุรกิจ';

      // Build message
      const flexMessage = (!stats || stats.docs_total === 0)
        ? buildNoActivityFlex(businessName, displayTh)
        : buildMonthlyReportFlex(stats, businessId, businessName, displayTh, yearMonth);

      // Send to all recipients for this business
      const sentTo: string[] = [];
      const bizErrors: string[] = [];

      for (const recipient of bizRecipients) {
        const result = await sendLineFlexMessageWithRetry(recipient.lineUserId, flexMessage, lineToken);

        if (result.success) {
          sentTo.push(recipient.lineUserId);
          messagesSent++;
          await markReportSent(recipient.lineUserId);
        } else {
          bizErrors.push(`${recipient.lineUserId}: ${result.error}`);
          errors.push(`${businessId}/${recipient.lineUserId}: ${result.error}`);
        }

        recipientsProcessed++;
      }

      // Update business-level marker
      const markerData: ReportMarker = {
        yearMonth,
        processedAt: admin.firestore.Timestamp.now(),
        sentTo,
        status: bizErrors.length === 0 ? 'SENT' : (sentTo.length > 0 ? 'PARTIAL' : 'FAILED'),
        stats_snapshot: stats || null,
      };
      if (bizErrors.length > 0) {
        markerData.errors = bizErrors.slice(0, 10);
      }
      await markerRef.set(markerData);

      // Rate limiting: delay between batches
      batchCount++;
      if (batchCount % BATCH_SIZE === 0) {
        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
      }
    }

    console.log(`[Monthly Report] Done: ${recipientsProcessed} processed, ${messagesSent} sent, ${skipped} skipped, ${errors.length} errors`);

    res.json({
      status: 'completed',
      yearMonth,
      displayMonth: displayTh,
      businessesProcessed: businessRecipients.size,
      recipientsProcessed,
      messagesSent,
      skipped,
      errorCount: errors.length,
    });
  }
);
