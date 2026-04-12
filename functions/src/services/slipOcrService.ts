import { getDb } from '../core/firebaseAdmin';
/**
 * EzDoc - Slip OCR Service
 * 
 * REAL OCR implementation using Google Cloud Vision API
 * for PromptPay payment slip verification.
 * 
 * Flow:
 * 1) User uploads slip image via LINE
 * 2) System OCRs the slip using Google Cloud Vision
 * 3) System parses Thai bank slip text
 * 4) System validates OCR result against pending purchase
 * 5) If valid → auto-confirm and apply entitlement
 * 6) If partial → mark for manual review
 * 7) If invalid → reject
 */

import * as admin from 'firebase-admin';
import { ImageAnnotatorClient } from '@google-cloud/vision';
import { createHash } from 'crypto';
import { CreditPurchase } from './purchaseService';

const db = getDb();

// ========================
// RECEIVER VALIDATION
// ========================
const VALID_RECEIVER_PATTERNS = [
  'นายฉัตรดนัย',
  'ฉัตรดนัย จิตต์เพ็ชร',
  'ฉัตรดนัย จิตต์เพ็ชร',
  'ฉัตรดนัย',
  'CHATDANAI',
];

// Expected PromptPay ID suffix (last 4 digits)
const PROMPTPAY_SUFFIX = '9990'; // From 0933299990

// ========================
// OCR RESULT INTERFACES
// ========================
export interface ParsedSlipData {
  amount: number | null;
  receiverMatched: boolean;
  suffixMatched: boolean;
  ref: string | null;
  transaction_datetime: Date | null;
}

export interface SlipOcrResult {
  rawText: string;
  confidence: number;
  parsed: ParsedSlipData;
}

export interface SlipVerificationResult {
  verified: boolean;
  status: 'PAID' | 'PENDING_REVIEW' | 'REJECTED';
  reason?: string;
  ocrResult: SlipOcrResult;
}

// ========================
// GOOGLE CLOUD VISION CLIENT
// ========================
let visionClient: ImageAnnotatorClient | null = null;

function getVisionClient(): ImageAnnotatorClient {
  if (!visionClient) {
    // Uses service account credentials from environment (default Firebase Admin)
    visionClient = new ImageAnnotatorClient();
  }
  return visionClient;
}

/**
 * Download image from URL (signed URL or public URL)
 */
async function downloadImageFromUrl(url: string): Promise<Buffer> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.status} ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error('[slipOcrService] Error downloading image:', error);
    throw error;
  }
}

/**
 * Perform OCR on slip image using Google Cloud Vision
 */
async function performVisionOcr(imageBuffer: Buffer): Promise<{ text: string; confidence?: number }> {
  try {
    const client = getVisionClient();

    const [result] = await client.textDetection({
      image: { content: imageBuffer },
    });

    const detections = result.textAnnotations;
    if (!detections || detections.length === 0) {
      console.warn('[slipOcrService] No text detected in image');
      return { text: '', confidence: 0 };
    }

    // Get full text annotation (first item contains all text)
    const fullText = detections[0].description || '';

    // Calculate average confidence from word-level annotations
    let totalConfidence = 0;
    let confidenceCount = 0;

    for (let i = 1; i < detections.length; i++) {
      const detection = detections[i];
      // Confidence might be in different places depending on API version
      if (detection.confidence !== undefined && detection.confidence !== null) {
        totalConfidence += detection.confidence;
        confidenceCount++;
      }
    }

    const avgConfidence = confidenceCount > 0 ? totalConfidence / confidenceCount : 0.8; // Default to 0.8 if no confidence data

    console.log(`[slipOcrService] OCR completed: ${fullText.length} chars, confidence: ${avgConfidence.toFixed(2)}`);

    return {
      text: fullText,
      confidence: avgConfidence,
    };
  } catch (error) {
    console.error('[slipOcrService] Vision API error:', error);
    throw error;
  }
}

/**
 * Parse Thai bank slip text to extract payment information
 */
export function parseThaiSlipText(rawText: string): ParsedSlipData {
  const result: ParsedSlipData = {
    amount: null,
    receiverMatched: false,
    suffixMatched: false,
    ref: null,
    transaction_datetime: null,
  };

  // Normalize text (remove extra whitespace, convert to lowercase for matching)
  const normalizedText = rawText.replace(/\s+/g, ' ').trim();
  const lowerText = normalizedText.toLowerCase();

  // Extract amount (look for patterns like "99.00", "299.00", "99.00 บาท", "99.00 THB")
  const amountPatterns = [
    /(?:฿|thb|บาท|จำนวน|amount|ยอด)[:\s]*(\d+(?:,\d{3})*(?:\.\d{2})?)/i,
    /(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:฿|thb|บาท)/i,
    /\b(\d+(?:,\d{3})*(?:\.\d{2})?)\s*บาท/i,
    /\b(\d+\.\d{2})\b/,
    /\b(\d+)\s*(?:บาท|บาท\.|\.00)/i,
  ];

  for (const pattern of amountPatterns) {
    const match = normalizedText.match(pattern);
    if (match && match[1]) {
      const amountStr = match[1].replace(/,/g, '');
      const amount = parseFloat(amountStr);
      if (!isNaN(amount) && amount > 0) {
        result.amount = amount;
        break;
      }
    }
  }

  // Check receiver name (must match one of the valid patterns)
  for (const pattern of VALID_RECEIVER_PATTERNS) {
    // Check both original and normalized text
    if (normalizedText.includes(pattern) || lowerText.includes(pattern.toLowerCase())) {
      result.receiverMatched = true;
      break;
    }
  }

  // Check PromptPay suffix (last 4 digits: 9990)
  // Look for patterns like: xxx-xxx-9990, xxx-xxxx-9990, 0933299990, etc.
  const suffixPatterns = [
    new RegExp(`[\\d-]{4,}${PROMPTPAY_SUFFIX}\\b`, 'i'),
    new RegExp(`[\\d-]{6,}${PROMPTPAY_SUFFIX}`, 'i'),
    new RegExp(`\\d{4,}${PROMPTPAY_SUFFIX}`, 'i'),
    new RegExp(PROMPTPAY_SUFFIX, 'i'), // Last resort: just check for the suffix
  ];

  for (const pattern of suffixPatterns) {
    if (normalizedText.match(pattern)) {
      result.suffixMatched = true;
      break;
    }
  }

  // Extract reference number (transaction ID)
  const refPatterns = [
    /(?:เลขที่รายการ|reference|ref|transaction)[:\s]*([A-Z0-9-]+)/i,
    /(?:Ref)[:\s]*([A-Z]{2,}\d{6,})/i,
    /\b([A-Z]{2,}\d{8,})\b/,
  ];

  for (const pattern of refPatterns) {
    const match = normalizedText.match(pattern);
    if (match && match[1]) {
      result.ref = match[1].trim();
      break;
    }
  }

  // Extract transaction datetime
  // Patterns: "วันที่ทำรายการ: 02/01/2026  03:04:19", "Date: 02/01/2026 03:04:19", etc.
  const datetimePatterns = [
    /(?:วันที่ทำรายการ|วันที่|date|เวลา|time)[:\s]*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\s+(\d{1,2}:\d{2}(?::\d{2})?)/i,
    /(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\s+(\d{1,2}:\d{2}(?::\d{2})?)/,
  ];

  for (const pattern of datetimePatterns) {
    const match = normalizedText.match(pattern);
    if (match && match[1] && match[2]) {
      try {
        // Parse date: DD/MM/YYYY or DD-MM-YYYY
        const dateStr = match[1].replace(/-/g, '/');
        const timeStr = match[2];
        const dateParts = dateStr.split('/');

        if (dateParts.length === 3) {
          const day = parseInt(dateParts[0], 10);
          const month = parseInt(dateParts[1], 10) - 1; // JS months are 0-indexed
          let year = parseInt(dateParts[2], 10);

          // Handle 2-digit years
          if (year < 100) {
            year += 2000;
          }

          // Parse time: HH:MM:SS or HH:MM
          const timeParts = timeStr.split(':');
          const hour = parseInt(timeParts[0], 10);
          const minute = parseInt(timeParts[1], 10);
          const second = timeParts[2] ? parseInt(timeParts[2], 10) : 0;

          const parsedDate = new Date(year, month, day, hour, minute, second);

          // Validate date
          if (!isNaN(parsedDate.getTime())) {
            result.transaction_datetime = parsedDate;
            break;
          }
        }
      } catch (error) {
        console.warn('[slipOcrService] Failed to parse datetime:', error);
        // Continue to next pattern
      }
    }
  }

  console.log(`[slipOcrService] Parsed slip: amount=${result.amount}, receiver=${result.receiverMatched}, suffix=${result.suffixMatched}, ref=${result.ref}, datetime=${result.transaction_datetime}`);

  return result;
}

/**
 * Generate SHA256 hash from image buffer
 */
function generateSlipHash(imageBuffer: Buffer): string {
  return createHash('sha256').update(imageBuffer).digest('hex');
}

/**
 * Run OCR on slip image and verify against purchase
 * Main entry point for OCR verification
 */
export async function runSlipOcrAndVerify(params: {
  imageUrl: string;
  expectedAmount: number;
  expectedPromptPayName: string;
  purchaseId: string;
}): Promise<SlipVerificationResult> {
  const { imageUrl, expectedAmount, purchaseId } = params;

  console.log(`[slipOcrService] Starting OCR for purchase ${purchaseId}, expectedAmount=${expectedAmount}`);

  // ✅ Telemetry: Log OCR started
  try {
    const purchaseRef = db.collection('credit_purchases').doc(purchaseId);
    const purchaseDoc = await purchaseRef.get();
    if (purchaseDoc.exists) {
      const purchase = purchaseDoc.data() as CreditPurchase;
      const { logOcrStarted } = await import('./paymentTelemetry');
      await logOcrStarted(
        purchase.userId,
        purchaseId,
        imageUrl,
        expectedAmount
      );
    }
  } catch (telemetryError) {
    // Don't block OCR on telemetry failure
    console.warn(`[slipOcrService] Failed to log OCR started:`, telemetryError);
  }

  try {
    // Download image
    const imageBuffer = await downloadImageFromUrl(imageUrl);
    console.log(`[slipOcrService] Downloaded image: ${imageBuffer.length} bytes`);

    // Generate slip hash (anti-fraud: deduplication)
    const slipHash = generateSlipHash(imageBuffer);

    // Check for duplicate slip hash (fraud detection)
    const { checkDuplicateSlipHash, checkDuplicateTransactionRef, calculateFraudScore } = await import('./fraudScoreService');
    const isDuplicateHash = await checkDuplicateSlipHash(slipHash, purchaseId);
    if (isDuplicateHash) {
      console.warn(`[slipOcrService] Duplicate slip hash detected for purchase ${purchaseId}`);
      const purchaseRef = db.collection('credit_purchases').doc(purchaseId);
      await purchaseRef.update({
        status: 'REJECTED',
        slip_hash: slipHash,
        fraud_score: 0,
        fraud_flags: ['DUPLICATE_SLIP_HASH'],
        fraud_reason: 'Duplicate slip hash - slip already used',
      });

      return {
        verified: false,
        status: 'REJECTED',
        reason: 'Duplicate slip hash - slip already used',
        ocrResult: {
          rawText: '',
          confidence: 0,
          parsed: {
            amount: null,
            receiverMatched: false,
            suffixMatched: false,
            ref: null,
            transaction_datetime: null,
          },
        },
      };
    }

    // Perform OCR
    const { text, confidence } = await performVisionOcr(imageBuffer);

    if (!text || text.trim().length === 0) {
      console.warn(`[slipOcrService] No text extracted from image for purchase ${purchaseId}`);
      // Still store hash even if OCR fails
      await db.collection('credit_purchases').doc(purchaseId).update({
        slip_hash: slipHash,
        status: 'PENDING_REVIEW',
        fraud_flags: ['OCR_PARSE_FAILED'],
      });

      return {
        verified: false,
        status: 'PENDING_REVIEW',
        reason: 'No text detected in image',
        ocrResult: {
          rawText: '',
          confidence: 0,
          parsed: {
            amount: null,
            receiverMatched: false,
            suffixMatched: false,
            ref: null,
            transaction_datetime: null,
          },
        },
      };
    }

    // Get purchase document for createdAt
    const purchaseRef = db.collection('credit_purchases').doc(purchaseId);
    const purchaseDoc = await purchaseRef.get();
    if (!purchaseDoc.exists) {
      throw new Error(`Purchase ${purchaseId} not found`);
    }
    const purchaseData = purchaseDoc.data() as CreditPurchase;
    const purchaseCreatedAt = purchaseData.createdAt;

    // Parse slip text
    const parsed = parseThaiSlipText(text);

    // Check for duplicate transaction reference (fraud detection)
    const isDuplicateRef = parsed.ref ? await checkDuplicateTransactionRef(parsed.ref, purchaseId) : false;
    if (isDuplicateRef) {
      console.warn(`[slipOcrService] Duplicate transaction ref detected: ${parsed.ref}`);
      await purchaseRef.update({
        status: 'REJECTED',
        slip_hash: slipHash,
        slip_transaction_ref: parsed.ref,
        fraud_score: 0,
        fraud_flags: ['DUPLICATE_TRANSACTION_REF'],
        fraud_reason: 'Duplicate transaction reference',
      });

      return {
        verified: false,
        status: 'REJECTED',
        reason: 'Duplicate transaction reference',
        ocrResult: {
          rawText: text,
          confidence: confidence || 0.5,
          parsed: {
            ...parsed,
            transaction_datetime: parsed.transaction_datetime || null,
          },
        },
      };
    }

    // Create OCR result
    const ocrResult: SlipOcrResult = {
      rawText: text,
      confidence: confidence || 0.5, // Default to 0.5 if confidence not available
      parsed,
    };

    // Calculate fraud score (with time validation)
    const fraudScoreResult = calculateFraudScore({
      parsedData: parsed,
      expectedAmount,
      hasDuplicateHash: false, // Already checked above
      hasDuplicateTransactionRef: false, // Already checked above
      purchaseCreatedAt,
      ocrConfidence: ocrResult.confidence,
    });

    const { getManualSlipReview } = await import('../shared/config');
    const manualSlipReview = getManualSlipReview();
    const verifiedBy = !manualSlipReview && fraudScoreResult.status === 'PAID' ? 'OCR' : null;

    // Update purchase document with OCR results, fraud score, and flags
    await purchaseRef.update({
      slip_hash: slipHash,
      slip_transaction_ref: parsed.ref || null,
      slip_ocr_raw_text: text,
      slip_ocr_confidence: ocrResult.confidence,
      slip_parsed_result: {
        amount: parsed.amount,
        receiverMatched: parsed.receiverMatched,
        suffixMatched: parsed.suffixMatched,
        ref: parsed.ref,
        transaction_datetime: parsed.transaction_datetime ? admin.firestore.Timestamp.fromDate(parsed.transaction_datetime) : null,
      },
      fraud_score: fraudScoreResult.score,
      fraud_flags: fraudScoreResult.fraud_flags,
      time_check_result: fraudScoreResult.time_check_result,
      verified_by: verifiedBy,
      auto_verification_status: fraudScoreResult.status,
      auto_verification_reason: fraudScoreResult.reason || null,
    });

    console.log(`[slipOcrService] Fraud score for ${purchaseId}: ${fraudScoreResult.score.toFixed(2)}, status: ${fraudScoreResult.status}, reason: ${fraudScoreResult.reason}`);

    // Create full verification result
    return {
      verified: fraudScoreResult.status === 'PAID',
      status: fraudScoreResult.status,
      reason: fraudScoreResult.reason,
      ocrResult,
    };
  } catch (error) {
    console.error(`[slipOcrService] Error in OCR verification for purchase ${purchaseId}:`, error);

    // On OCR error (API failure, timeout, quota, etc.), set to PENDING_REVIEW for manual review
    // Slip is already uploaded and accepted - don't reject it
    await db.collection('credit_purchases').doc(purchaseId).update({
      status: 'PENDING_REVIEW',
      slip_ocr_raw_text: null,
      slip_ocr_confidence: 0,
      slip_parsed_result: null,
      verified_by: null,
      fraud_flags: ['OCR_PARSE_FAILED'],
    });

    // Return a PENDING_REVIEW result so applyVerificationResult can send the appropriate message
    return {
      verified: false,
      status: 'PENDING_REVIEW',
      reason: `OCR processing error: ${error instanceof Error ? error.message : String(error)}`,
      ocrResult: {
        rawText: '',
        confidence: 0,
        parsed: {
          amount: null,
          receiverMatched: false,
          suffixMatched: false,
          ref: null,
          transaction_datetime: null,
        },
      },
    };
  }
}

/**
 * Apply verification result to purchase (update status and grant entitlement)
 */
export async function applyVerificationResult(
  purchaseId: string,
  verification: SlipVerificationResult
): Promise<void> {
  const purchaseRef = db.collection('credit_purchases').doc(purchaseId);
  const purchaseDoc = await purchaseRef.get();

  if (!purchaseDoc.exists) {
    throw new Error(`Purchase ${purchaseId} not found`);
  }

  const purchase = purchaseDoc.data() as CreditPurchase;
  const { getManualSlipReview } = await import('../shared/config');

  if (getManualSlipReview()) {
    // Keep manual review in control; do not auto-settle or auto-reject.
    if (purchase.status !== 'PAID' && purchase.status !== 'REJECTED') {
      await purchaseRef.update({
        status: 'PENDING_REVIEW',
        manual_review_required: true,
        auto_verification_status: verification.status,
        auto_verification_reason: verification.reason || null,
      });
    }
    return;
  }

  // Task D3: If verified, settle payment FIRST using settlement service
  if (verification.verified && verification.status === 'PAID') {
    console.log(`[slipOcrService] Settling payment for purchase ${purchaseId}`);

    // ✅ Task D3: Use settlement service for atomic, idempotent settlement
    const { settleVerifiedPurchase } = await import('./paymentSettlementService');
    const traceId = purchase.settlement_trace_id || `slipOcr_${Date.now()}_${purchaseId}`;

    const settlementResult = await settleVerifiedPurchase({
      purchaseId,
      verifiedBy: 'OCR',
      traceId,
    });

    if (!settlementResult.ok) {
      console.error(`[slipOcrService] Settlement failed for purchase ${purchaseId}`);
      throw new Error(`Settlement failed for purchase ${purchaseId}`);
    } else if (settlementResult.alreadySettled) {
      console.log(`[slipOcrService] Purchase already settled: purchaseId=${purchaseId}, reason=${settlementResult.reason}`);
    } else {
      console.log(`[slipOcrService] ✅ Payment settled successfully: purchaseId=${purchaseId}`);
    }

    // ✅ Task D3: Ensure purchase.status remains 'PAID' after settlement
    await purchaseRef.update({
      status: 'PAID',
    });

    // ✅ Telemetry: Log subscription activated (if not already settled)
    if (!settlementResult.alreadySettled) {
      try {
        const { logSubscriptionActivated } = await import('./paymentTelemetry');
        const { getPackagePlan, getPackageSeats } = await import('./purchaseService');
        const plan = getPackagePlan(purchase.packageType);
        const seats = getPackageSeats(purchase.packageType);
        await logSubscriptionActivated(
          purchase.userId,
          purchaseId,
          plan,
          seats,
          purchase.packageType,
          'OCR'
        );
      } catch (telemetryError) {
        console.warn(`[slipOcrService] Failed to log subscription activated:`, telemetryError);
      }
    }
  } else {
    // Update status for non-PAID statuses
    await purchaseRef.update({
      status: verification.status,
    });
  }

  // ✅ Task D4: Delivery idempotency - Re-read purchase doc before sending message
  const purchaseDocAfter = await purchaseRef.get();
  if (!purchaseDocAfter.exists) {
    throw new Error(`Purchase ${purchaseId} not found after settlement`);
  }
  const purchaseAfter = purchaseDocAfter.data() as CreditPurchase;

  const terminalStatus = verification.status;
  const subscriptionExperienceComplete = Boolean(
    purchaseAfter.subscription_success_message_sent_at &&
    purchaseAfter.subscription_receipt_sent_at
  );

  // For PAID purchases, we need both the formal success message and the receipt.
  // Legacy delivery_sent alone is not enough because older purchases may have
  // been acknowledged without the new receipt experience.
  if (
    terminalStatus !== 'PAID' &&
    purchaseAfter.delivery_sent === true &&
    purchaseAfter.delivery_sent_status === terminalStatus
  ) {
    console.log(`[slipOcrService] ⏭️  Delivery already sent for purchaseId=${purchaseId}, status=${terminalStatus}, skipping duplicate message`);
    return;
  }

  if (
    terminalStatus === 'PAID' &&
    purchaseAfter.delivery_sent === true &&
    purchaseAfter.delivery_sent_status === terminalStatus &&
    subscriptionExperienceComplete
  ) {
    console.log(`[slipOcrService] ⏭️  Delivery already sent for purchaseId=${purchaseId}, status=${terminalStatus}, skipping duplicate message`);
    return;
  }

  // ✅ Push notification to user with payment UX copy
  try {
    const { pushLineMessage } = await import('./lineService');
    const { 
      getPaymentFailureMessage,
      getPaymentRetryQuickReply,
      getMaxRetriesReachedMessage,
      getPaymentPendingReviewQuickReply
    } = await import('./paymentUXCopy');
    const { hasReachedMaxRetries, resetRetryCount, getRetryCount } = await import('./paymentRetryService');

    let message = '';
    let quickReply: Array<{ type: 'action'; action: { type: 'message'; label: string; text: string } }> | undefined;

    if (verification.status === 'PAID') {
      await resetRetryCount(purchaseId);

      const { sendSubscriptionSuccessExperience } = await import('./subscriptionReceiptService');
      const { getPackagePlan } = await import('./purchaseService');
      const planName = getPackagePlan(purchase.packageType) === 'TEAM' ? 'Team' : 'Pro';
      const deliveryResult = await sendSubscriptionSuccessExperience(purchaseId);
      console.log(
        `[slipOcrService] ✅ Payment verified: purchaseId=${purchaseId}, status=PAID, successMessageSent=${deliveryResult.successMessageSent}, receiptSent=${deliveryResult.receiptSent}`
      );

      await purchaseRef.set({
        delivery_sent: true,
        delivery_sent_at: admin.firestore.FieldValue.serverTimestamp(),
        delivery_sent_status: 'PAID',
      }, { merge: true });

      if (deliveryResult.successMessageSent || deliveryResult.receiptSent) {
        const { logPaymentSuccessSent } = await import('./paymentTelemetry');
        await logPaymentSuccessSent(
          purchase.userId,
          purchaseId,
          planName,
          purchase.packageType
        );

        // Also log delivery event (if appendPaymentEvent exists)
        // Note: paymentAuditService may not exist - this is optional
        // Using dynamic import with type assertion to avoid compile-time error
        try {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const paymentAuditModule = require('./paymentAuditService') as { appendPaymentEvent?: (purchaseId: string, data: { event: string; traceId?: string | null; verifiedBy: string }) => Promise<void> } | undefined;
          if (paymentAuditModule?.appendPaymentEvent) {
            await paymentAuditModule.appendPaymentEvent(purchaseId, {
              event: 'DELIVERY_SENT',
              traceId: purchase.settlement_trace_id || null,
              verifiedBy: 'OCR',
            }).catch((err: unknown) => {
              console.warn(`[slipOcrService] Failed to log DELIVERY_SENT (non-blocking):`, err);
            });
          }
        } catch {
          // paymentAuditService doesn't exist - this is fine, it's optional
          // Silently ignore
        }
      }
    } else if (verification.status === 'PENDING_REVIEW') {
      // OCR unclear - admin review needed
      // Create/update review queue entry
      try {
        const { upsertReviewQueue } = await import('./reviewQueueService');
        await upsertReviewQueue(purchaseId, {
          userId: purchase.userId,
          lineUserId: purchase.lineUserId,
          amount: purchase.amount,
          slip_image_url: purchase.slip_image_url || null,
          slip_hash: purchase.slip_hash || null,
          fraud_flags: purchase.fraud_flags || [],
          reason: verification.reason || 'OCR verification unclear',
        });
        console.log(`[slipOcrService] ✅ Review queue entry created/updated: purchaseId=${purchaseId}`);
      } catch (reviewQueueError) {
        console.error(`[slipOcrService] ❌ Failed to create review queue entry:`, reviewQueueError);
        // Don't throw - continue with message sending
      }

      // C3) PENDING_REVIEW: ต้องมี "อยู่ระหว่างตรวจ / ไม่ต้องโอนซ้ำ / ติดต่อแอดมิน + ref purchaseId"
      message = `⏳ อยู่ระหว่างตรวจสอบค่ะ  
🚫 ไม่ต้องโอนซ้ำ  
📞 ถ้าต้องการด่วนให้ติดต่อแอดมิน  
📝 Ref: ${purchaseId}`;
      quickReply = getPaymentPendingReviewQuickReply();
      console.log(`[slipOcrService] ⏳ Payment pending review: purchaseId=${purchaseId}, reason=${verification.reason}`);
    } else {
      // REJECTED status - check retry count
      const maxRetriesReached = await hasReachedMaxRetries(purchaseId);

      if (maxRetriesReached) {
        // Max retries reached - show admin contact message
        message = getMaxRetriesReachedMessage();
        // REFACTORED: Use ui/quickReplies.ts (Single Source of Truth)
        const { getPaymentPendingReviewButtons } = await import('../ui/quickReplies');
        quickReply = getPaymentPendingReviewButtons();
      } else {
        // Still can retry - use payment UX copy
        message = getPaymentFailureMessage();
        quickReply = getPaymentRetryQuickReply();

        // C4) DUPLICATE SLIP: ต้องมี "สลิปนี้ถูกใช้แล้ว / ไม่ต้องโอนซ้ำ / ติดต่อแอดมิน + ref purchaseId"
        if (verification.reason?.includes('Duplicate') || verification.reason?.includes('duplicate')) {
          message = `⚠️ ระบบพบว่าสลิปนี้ถูกใช้แล้วค่ะ  
🚫 ไม่ต้องโอนซ้ำ  
📞 ถ้าคิดว่าเป็นความผิดพลาดให้ติดต่อแอดมิน  
📝 Ref: ${purchaseId}`;
        }
      }

      console.log(`[slipOcrService] ❌ Payment rejected: purchaseId=${purchaseId}, reason=${verification.reason}, retries=${await getRetryCount(purchaseId)}`);
    }

    // ✅ Task D4: Send message (for non-PAID statuses, PAID already sent above)
    if (verification.status !== 'PAID') {
      await pushLineMessage(purchase.lineUserId, message, undefined, quickReply);

      // ✅ Task D4: Set delivery_sent and delivery_sent_at after successful push
      await purchaseRef.update({
        delivery_sent: true,
        delivery_sent_at: admin.firestore.FieldValue.serverTimestamp(),
        delivery_sent_status: verification.status,
      });

      console.log(`[slipOcrService] ✅ User notified: purchaseId=${purchaseId}, status=${verification.status}`);
    }
  } catch (error) {
    console.error(`[slipOcrService] ❌ Failed to notify user for purchase ${purchaseId}:`, error);
    // Don't throw - notification failure shouldn't block the process
    // But log it for monitoring
  }
}
