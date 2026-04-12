import { getDb } from '../core/firebaseAdmin';
/**
 * EzDoc - Monitoring Service
 * 
 * Collects key metrics for system health monitoring.
 * 
 * Metrics:
 * - stuck_paid_no_credit: PAID purchases without credit_applied
 * - pending_review_over_3min: PENDING_REVIEW purchases older than 3 minutes
 * - median slip_received→credit_applied: Time from slip upload to credit application
 * - pdf_failed_rate: Percentage of PDF generation failures
 * - top_5_error_codes: Most common error codes
 * - duplicate_block_count: Number of duplicate settlements blocked
 */

import * as admin from 'firebase-admin';

const db = getDb();

export interface MonitoringMetrics {
  timestamp: admin.firestore.Timestamp;
  stuck_paid_no_credit: number;
  pending_review_over_3min: number;
  median_slip_to_credit_ms: number | null; // milliseconds
  pdf_failed_rate: number; // 0-100 percentage
  top_5_error_codes: Array<{ code: string; count: number }>;
  duplicate_block_count: number;
}

/**
 * Collect all monitoring metrics
 */
export async function collectMonitoringMetrics(): Promise<MonitoringMetrics> {
  const now = admin.firestore.Timestamp.now();
  const threeMinutesAgo = admin.firestore.Timestamp.fromMillis(
    now.toMillis() - 3 * 60 * 1000
  );
  const oneHourAgo = admin.firestore.Timestamp.fromMillis(
    now.toMillis() - 60 * 60 * 1000
  );

  // 1. stuck_paid_no_credit
  const stuckPaidQuery = await db
    .collection('credit_purchases')
    .where('status', '==', 'PAID')
    .where('credit_applied', '!=', true)
    .limit(1000)
    .get();
  const stuckPaidNoCredit = stuckPaidQuery.size;

  // 2. pending_review_over_3min
  const pendingReviewQuery = await db
    .collection('credit_purchases')
    .where('status', '==', 'PENDING_REVIEW')
    .where('slip_uploaded_at', '<', threeMinutesAgo)
    .limit(1000)
    .get();
  const pendingReviewOver3min = pendingReviewQuery.size;

  // 3. median slip_received→credit_applied
  const recentPaidQuery = await db
    .collection('credit_purchases')
    .where('status', '==', 'PAID')
    .where('credit_applied', '==', true)
    .where('slip_uploaded_at', '>=', oneHourAgo)
    .where('credit_applied_at', '!=', null)
    .limit(100)
    .get();

  const slipToCreditTimes: number[] = [];
  for (const doc of recentPaidQuery.docs) {
    const data = doc.data();
    const slipUploaded = data.slip_uploaded_at as admin.firestore.Timestamp | undefined;
    const creditApplied = data.credit_applied_at as admin.firestore.Timestamp | undefined;

    if (slipUploaded && creditApplied) {
      const diffMs = creditApplied.toMillis() - slipUploaded.toMillis();
      if (diffMs > 0 && diffMs < 24 * 60 * 60 * 1000) { // Sanity check: < 24 hours
        slipToCreditTimes.push(diffMs);
      }
    }
  }

  const medianSlipToCredit = slipToCreditTimes.length > 0
    ? calculateMedian(slipToCreditTimes)
    : null;

  // 4. pdf_failed_rate (last hour)
  const pdfJobsQuery = await db
    .collection('pdf_generation_jobs')
    .where('createdAt', '>=', oneHourAgo)
    .limit(1000)
    .get();

  let pdfTotal = 0;
  let pdfFailed = 0;
  for (const doc of pdfJobsQuery.docs) {
    const data = doc.data();
    pdfTotal++;
    if (data.status === 'FAILED' || data.status === 'ERROR') {
      pdfFailed++;
    }
  }
  const pdfFailedRate = pdfTotal > 0 ? (pdfFailed / pdfTotal) * 100 : 0;

  // 5. top_5_error_codes (from payment_events, last hour)
  const errorEventsQuery = await db
    .collectionGroup('payment_events')
    .where('createdAt', '>=', oneHourAgo)
    .where('result_code', '!=', 'OK')
    .limit(500)
    .get();

  const errorCodeCounts: Record<string, number> = {};
  for (const doc of errorEventsQuery.docs) {
    const data = doc.data();
    const code = data.result_code as string | undefined;
    if (code && code !== 'OK') {
      errorCodeCounts[code] = (errorCodeCounts[code] || 0) + 1;
    }
  }

  const top5ErrorCodes = Object.entries(errorCodeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([code, count]) => ({ code, count }));

  // 6. duplicate_block_count (last hour)
  const duplicateEventsQuery = await db
    .collectionGroup('payment_events')
    .where('createdAt', '>=', oneHourAgo)
    .where('event', '==', 'DUPLICATE_SETTLEMENT_BLOCKED')
    .limit(1000)
    .get();
  const duplicateBlockCount = duplicateEventsQuery.size;

  return {
    timestamp: now,
    stuck_paid_no_credit: stuckPaidNoCredit,
    pending_review_over_3min: pendingReviewOver3min,
    median_slip_to_credit_ms: medianSlipToCredit,
    pdf_failed_rate: Math.round(pdfFailedRate * 100) / 100, // Round to 2 decimals
    top_5_error_codes: top5ErrorCodes,
    duplicate_block_count: duplicateBlockCount,
  };
}

/**
 * Calculate median of number array
 */
function calculateMedian(numbers: number[]): number {
  if (numbers.length === 0) return 0;

  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  } else {
    return sorted[mid];
  }
}

/**
 * Format metrics for CEO report
 */
export function formatMetricsReport(metrics: MonitoringMetrics): string {
  const timestamp = metrics.timestamp.toDate().toLocaleString('th-TH', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const medianTime = metrics.median_slip_to_credit_ms
    ? `${Math.round(metrics.median_slip_to_credit_ms / 1000)}s`
    : 'N/A';

  const errorCodesText = metrics.top_5_error_codes.length > 0
    ? metrics.top_5_error_codes.map(e => `${e.code} (${e.count})`).join(', ')
    : 'None';

  return `📊 EzDoc Monitoring Report
━━━━━━━━━━━━━━━━━━━━
⏰ ${timestamp}

🔴 Critical Issues:
  • Stuck PAID (no credit): ${metrics.stuck_paid_no_credit}
  • PENDING_REVIEW > 3min: ${metrics.pending_review_over_3min}

⏱️ Performance:
  • Slip → Credit (median): ${medianTime}
  • PDF Failed Rate: ${metrics.pdf_failed_rate.toFixed(2)}%

🛡️ Security:
  • Duplicate Blocks: ${metrics.duplicate_block_count}

❌ Top Errors:
  ${errorCodesText || 'None'}

━━━━━━━━━━━━━━━━━━━━`;
}

/**
 * Store metrics in Firestore for historical tracking
 */
export async function storeMetrics(metrics: MonitoringMetrics): Promise<void> {
  try {
    const metricsRef = db.collection('monitoring_metrics').doc();
    await metricsRef.set(metrics);
    console.log(`[monitoring] Metrics stored: ${metricsRef.id}`);
  } catch (error) {
    console.error(`[monitoring] Failed to store metrics:`, error);
  }
}


