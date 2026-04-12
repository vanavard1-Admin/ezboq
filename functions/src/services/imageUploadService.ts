import { getDb } from '../core/firebaseAdmin';
/**
 * EzDoc - Image Upload Service
 * 
 * Handles LINE image uploads for logo, signature, and stamp.
 */

import * as admin from 'firebase-admin';
import { randomUUID } from 'crypto';

const db = getDb();

// Image types we support
export type ImageType = 'logo' | 'signature' | 'stamp';

// Storage paths
const STORAGE_PATH = 'business-assets';

// Pending image session object
interface PendingImageSession {
  messageId: string;
  timestamp: number;
  used: boolean;
}

// Temporary image storage (in-memory cache with TTL)
const pendingImages: Map<string, PendingImageSession> = new Map();
const PENDING_IMAGE_TTL = 5 * 60 * 1000; // 5 minutes

const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> => {
  let timeoutId: NodeJS.Timeout | null = null;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
};

/**
 * Store a pending image for a user
 */
export function storePendingImage(userId: string, messageId: string): void {
  pendingImages.set(userId, { messageId, timestamp: Date.now(), used: false });

  // Clean up old entries
  cleanupPendingImages();
}

/**
 * Get pending image if available and not used
 */
export function getPendingImage(userId: string): string | null {
  const entry = pendingImages.get(userId);
  if (!entry || entry.used) return null;

  // Check if expired
  if (Date.now() - entry.timestamp > PENDING_IMAGE_TTL) {
    pendingImages.delete(userId);
    return null;
  }

  // Mark as used
  entry.used = true;
  return entry.messageId;
}

/**
 * Check if user has a pending image (not used)
 */
export function hasPendingImage(userId: string): boolean {
  const entry = pendingImages.get(userId);
  if (!entry || entry.used) return false;

  if (Date.now() - entry.timestamp > PENDING_IMAGE_TTL) {
    pendingImages.delete(userId);
    return false;
  }

  return true;
}

/**
 * Mark pending image as used (without retrieving)
 */
export function markPendingImageUsed(userId: string): void {
  const entry = pendingImages.get(userId);
  if (entry) {
    entry.used = true;
  }
}

/**
 * Clean up expired pending images
 */
function cleanupPendingImages(): void {
  const now = Date.now();
  for (const [userId, entry] of pendingImages.entries()) {
    if (now - entry.timestamp > PENDING_IMAGE_TTL) {
      pendingImages.delete(userId);
    }
  }
}

/**
 * Download raw message content from LINE
 */
export async function downloadLineContent(
  messageId: string,
  accessToken: string
): Promise<{ buffer: Buffer; contentType: string | null }> {
  const url = `https://api-data.line.me/v2/bot/message/${messageId}/content`;
  const controller = new AbortController();
  const timeoutMs = 15_000;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Failed to download LINE image: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return {
      buffer: Buffer.from(arrayBuffer),
      contentType: response.headers.get('content-type'),
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('LINE image download timeout');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Download image from LINE
 */
export async function downloadLineImage(messageId: string, accessToken: string): Promise<Buffer> {
  const { buffer } = await downloadLineContent(messageId, accessToken);
  return buffer;
}

/**
 * Upload image to Cloud Storage
 */
export async function uploadBusinessImage(
  businessId: string,
  imageType: ImageType,
  imageBuffer: Buffer,
  contentType: string = 'image/png'
): Promise<string> {
  const storage = admin.storage();
  const bucket = storage.bucket();

  // Determine file extension from content type
  let extension = 'png';
  if (contentType.includes('jpeg') || contentType.includes('jpg')) {
    extension = 'jpg';
  } else if (contentType.includes('webp')) {
    extension = 'webp';
  }

  const filePath = `${STORAGE_PATH}/${businessId}/${imageType}.${extension}`;
  const file = bucket.file(filePath);
  const downloadToken = randomUUID();

  await file.save(imageBuffer, {
    resumable: false,
    metadata: {
      contentType,
      cacheControl: 'public, max-age=3600',
      metadata: {
        firebaseStorageDownloadTokens: downloadToken,
      },
    },
  });

  // Firebase-style download URL (works even with uniform bucket-level access)
  const encodedPath = encodeURIComponent(filePath);
  const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodedPath}?alt=media&token=${downloadToken}`;

  // Sanitize URL before logging (prevent PII/token leakage)
  const { sanitizeUrlForLogging } = await import("../utils/logSanitization");
  const sanitizedUrl = sanitizeUrlForLogging(publicUrl);
  console.log(`[imageUpload] Uploaded ${imageType} for business ${businessId}: ${sanitizedUrl}`);

  return publicUrl;
}

/**
 * Save image URL to business profile
 */
export async function saveImageToProfile(
  userId: string,
  businessId: string,
  imageType: ImageType,
  imageUrl: string
): Promise<void> {
  const field = `${imageType}_url`;

  // Update business profile
  await db
    .collection('users')
    .doc(userId)
    .collection('businesses')
    .doc(businessId)
    .set({ [field]: imageUrl, updated_at: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });

  // Sanitize URL before logging (prevent PII/token leakage)
  const { sanitizeUrlForLogging } = await import("../utils/logSanitization");
  const sanitizedImageUrl = sanitizeUrlForLogging(imageUrl);
  console.log(`[imageUpload] Saved ${field}=${sanitizedImageUrl} for user=${userId}, business=${businessId}`);
}

/**
 * Process image upload with keyword
 */
export async function processImageWithKeyword(
  userId: string,
  businessId: string,
  keyword: string,
  accessToken: string
): Promise<{ success: boolean; message: string }> {
  // Get pending image
  const messageId = getPendingImage(userId);
  if (!messageId) {
    // Determine intent from keyword for better error message
    const keywordLower = keyword.toLowerCase().trim();
    let thaiName = 'รูปภาพ';
    if (keywordLower === 'โลโก้' || keywordLower === 'logo') {
      thaiName = 'โลโก้';
    } else if (keywordLower === 'ลายเซ็น' || keywordLower === 'signature') {
      thaiName = 'ลายเซ็น';
    } else if (keywordLower === 'ตราประทับ' || keywordLower === 'stamp') {
      thaiName = 'ตราประทับ';
    }

    return {
      success: false,
      message: `โอ๊ะ! ยังไม่พบรูป${thaiName}ครับเจ้านาย\nส่งรูป${thaiName}ก่อน แล้วพิมพ์ "${keyword}" อีกครั้งนะครับ`,
    };
  }

  // Determine image type from keyword
  const keywordLower = keyword.toLowerCase().trim();
  let imageType: ImageType;
  let thaiName: string;

  if (keywordLower === 'โลโก้' || keywordLower === 'logo') {
    imageType = 'logo';
    thaiName = 'โลโก้';
  } else if (keywordLower === 'ลายเซ็น' || keywordLower === 'signature') {
    imageType = 'signature';
    thaiName = 'ลายเซ็น';
  } else if (keywordLower === 'ตราประทับ' || keywordLower === 'stamp') {
    imageType = 'stamp';
    thaiName = 'ตราประทับ';
  } else {
    return {
      success: false,
      message: `โอ๊ะ! ยังไม่รู้จักคำสั่ง "${keyword}" ครับเจ้านาย\n\nพิมพ์ได้เลย\n1. โลโก้\n2. ลายเซ็น\n3. ตราประทับ`,
    };
  }

  try {
    // Check if asset already exists
    const bizRef = db.doc(`users/${userId}/businesses/${businessId}`);
    const bizSnap = await bizRef.get();
    const bizData = bizSnap.data() || {};
    const existingField = `${imageType}_url`;
    const existingUrl = bizData[existingField];
    const hasExisting = !!existingUrl;

    // Download image from LINE
    const imageBuffer = await downloadLineImage(messageId, accessToken);

    // Upload to Cloud Storage
    const imageUrl = await withTimeout(
      uploadBusinessImage(businessId, imageType, imageBuffer),
      20_000,
      'Storage upload timeout'
    );

    // Save to business profile
    await withTimeout(
      saveImageToProfile(userId, businessId, imageType, imageUrl),
      8_000,
      'Profile save timeout'
    );

    const message = hasExisting
      ? `บี๊บ! อัปเดต${thaiName}สำเร็จแล้วครับเจ้านาย (ทับของเดิม)\n\n${thaiName}จะปรากฏในเอกสารที่สร้างใหม่ครับ`
      : `บี๊บ! บันทึก${thaiName}สำเร็จแล้วครับเจ้านาย!\n\n${thaiName}จะปรากฏในเอกสารที่สร้างใหม่ครับ`;

    return {
      success: true,
      message,
    };
  } catch (error) {
    console.error(`[imageUpload] Error processing image:`, error);
    return {
      success: false,
      message: 'โอ๊ะ! อัปโหลดรูปภาพไม่สำเร็จครับ\nลองส่งใหม่ได้เลยนะเจ้านาย',
    };
  }
}

/**
 * Get message for image without keyword
 */
export function getImageWithoutKeywordMessage(): string {
  return `ติ๊ดๆ ได้รับรูปภาพแล้วครับเจ้านาย!\n\nพิมพ์เพื่อบันทึก\n1. "โลโก้" ตั้งเป็นโลโก้ธุรกิจ\n2. "ลายเซ็น" ลายเซ็นในเอกสาร\n3. "ตราประทับ" ตราประทับบริษัท`;
}

/**
 * Process image with explicit mode (direct upload without keyword)
 */
export async function processImageWithMode(
  userId: string,
  businessId: string,
  imageType: 'logo' | 'signature' | 'stamp',
  messageId: string,
  accessToken: string
): Promise<{ success: boolean; message: string }> {
  try {
    // Download image from LINE
    const imageBuffer = await downloadLineImage(messageId, accessToken);

    // Upload to Cloud Storage
    const imageUrl = await withTimeout(
      uploadBusinessImage(businessId, imageType, imageBuffer),
      20_000,
      'Storage upload timeout'
    );

    // Save to business profile
    await withTimeout(
      saveImageToProfile(userId, businessId, imageType, imageUrl),
      8_000,
      'Profile save timeout'
    );

    const thaiName = imageType === 'logo' ? 'โลโก้' : imageType === 'signature' ? 'ลายเซ็น' : 'ตราประทับ';

    return {
      success: true,
      message: `บี๊บ! บันทึก${thaiName}สำเร็จแล้วครับเจ้านาย!\n\n${thaiName}จะปรากฏในเอกสารที่สร้างใหม่ครับ`,
    };
  } catch (error) {
    console.error(`[imageUpload] Error processing image:`, error);
    return {
      success: false,
      message: 'โอ๊ะ! อัปโหลดรูปภาพไม่สำเร็จครับ\nลองส่งใหม่ได้เลยนะเจ้านาย',
    };
  }
}

/**
 * Check if user has a purchase waiting for slip (handles race condition)
 * Uses hasRecentPendingPurchase to catch purchases in PENDING or WAITING_FOR_SLIP state
 */
export async function hasWaitingForSlipPurchase(userId: string): Promise<boolean> {
  const { hasRecentPendingPurchase } = await import('./purchaseService');
  const result = await hasRecentPendingPurchase(userId, 15);
  return result !== null;
}

/**
 * Get the most recent pending purchase for slip processing
 */
export async function getRecentPendingPurchase(userId: string): Promise<{ purchase: any; purchaseId: string } | null> {
  const { hasRecentPendingPurchase } = await import('./purchaseService');
  return await hasRecentPendingPurchase(userId, 15);
}

/**
 * Get message for immediate reply when receiving slip
 * 
 * CRITICAL: This must be payment-specific and reassuring
 */
// C1) ACK หลังส่งสลิป: ต้องมี "รับแล้ว / กำลังตรวจ / ไม่ต้องโอนซ้ำ"
// Note: This function is kept for backward compatibility but should use paymentUXCopy.getSlipReceivedMessage() instead
export function getSlipReceivedMessage(purchaseId?: string): string {
  const { getSlipReceivedMessage: getMessage } = require('./paymentUXCopy');
  return getMessage(purchaseId);
}

/**
 * Process image as payment slip
 * Always accepts the slip first, then processes OCR async
 * 
 * @param purchaseId - Optional purchaseId to process deterministically. If provided, loads that purchase directly.
 */
export async function processSlipUpload(
  userId: string,
  lineUserId: string,
  messageId: string,
  accessToken: string,
  purchaseId?: string
): Promise<{ success: boolean; message: string; quickReply?: import('../shared/lineQuickReply').QuickReplyAction[] }> {
  console.log(`[imageUpload] 🔄 Processing slip upload: userId=${userId}, messageId=${messageId}, purchaseId=${purchaseId || 'auto'}`);

  try {
    let purchaseRef: admin.firestore.DocumentReference;
    let purchaseData: any;
    let purchaseIdFinal: string;

    // Task D1: If purchaseId provided, load that purchase directly
    if (purchaseId) {
      purchaseRef = db.collection('credit_purchases').doc(purchaseId);
      const purchaseDoc = await purchaseRef.get();

      if (!purchaseDoc.exists) {
        console.log(`[imageUpload] ❌ Purchase not found: purchaseId=${purchaseId}`);
        return {
          success: false,
          message: 'โอ๊ะ! ไม่พบรายการซื้อครับเจ้านาย\nสั่งซื้อก่อนแล้วค่อยส่งสลิปได้เลยครับ',
        };
      }

      purchaseData = purchaseDoc.data();
      purchaseIdFinal = purchaseId;

      // Validate ownership - userId must match purchase.userId
      if (purchaseData.userId !== userId) {
        console.error(`[imageUpload] ❌ Ownership mismatch: purchase.userId=${purchaseData.userId}, provided userId=${userId}, purchaseId=${purchaseId}`);
        return {
          success: false,
          message: '❌ ไม่มีสิทธิ์เข้าถึงรายการนี้',
        };
      }

      // Validate status - accept WAITING_FOR_SLIP, PENDING, or PENDING_REVIEW (retry)
      const validStatuses = ['WAITING_FOR_SLIP', 'PENDING', 'PENDING_REVIEW'];
      if (!validStatuses.includes(purchaseData.status)) {
        if (purchaseData.status === 'PAID') {
          return {
            success: false,
            message: '✅ รายการนี้ชำระเงินแล้ว',
          };
        }
        if (purchaseData.status === 'EXPIRED') {
          return {
            success: false,
            message: 'โอ๊ะ! QR หมดอายุแล้วครับเจ้านาย\nสั่งซื้อใหม่ได้เลยนะครับ',
          };
        }
        if (purchaseData.status === 'REJECTED') {
          // Allow retry for REJECTED status
          console.log(`[imageUpload] Retry for REJECTED purchase: purchaseId=${purchaseId}`);
        } else {
          console.log(`[imageUpload] ❌ Invalid status: purchaseId=${purchaseId}, status=${purchaseData.status}`);
          return {
            success: false,
            message: `❌ สถานะรายการไม่ถูกต้อง (${purchaseData.status})`,
          };
        }
      }

      // Check slip_image_url idempotency
      if (purchaseData.slip_image_url && purchaseData.status !== 'REJECTED') {
        console.log(`[imageUpload] ⏭️  Slip already uploaded for purchaseId=${purchaseId}, skipping duplicate upload`);
        return {
          success: false,
          message: 'ติ๊ดๆ รับสลิปแล้วครับเจ้านาย กำลังตรวจสอบอยู่นะครับ',
        };
      }

      console.log(`[imageUpload] ✅ Using provided purchaseId: purchaseId=${purchaseId}, status=${purchaseData.status}`);
    } else {
      // Fallback to existing behavior: get recent pending purchase
      const recentPurchase = await getRecentPendingPurchase(userId);

      if (!recentPurchase) {
        console.log(`[imageUpload] ❌ No recent purchase found for userId=${userId}`);
        return {
          success: false,
          message: 'โอ๊ะ! ไม่พบรายการรอชำระครับเจ้านาย\nสั่งซื้อก่อนแล้วค่อยส่งสลิปได้เลยนะครับ',
        };
      }

      purchaseRef = db.collection('credit_purchases').doc(recentPurchase.purchaseId);
      purchaseIdFinal = recentPurchase.purchaseId;
      purchaseData = recentPurchase.purchase;

      console.log(`[imageUpload] ✅ Found purchase: purchaseId=${purchaseIdFinal}, status=${purchaseData.status}`);

      // Check slip_image_url idempotency
      if (purchaseData.slip_image_url && purchaseData.status !== 'REJECTED') {
        console.log(`[imageUpload] ⏭️  Slip already uploaded for purchaseId=${purchaseIdFinal}, skipping duplicate upload`);
        return {
          success: false,
          message: 'ติ๊ดๆ รับสลิปแล้วครับเจ้านาย กำลังตรวจสอบอยู่นะครับ',
        };
      }
    }

    // Download image from LINE
    console.log(`[imageUpload] 📥 Downloading image from LINE: messageId=${messageId}`);
    const imageBuffer = await downloadLineImage(messageId, accessToken);
    console.log(`[imageUpload] ✅ Image downloaded: ${imageBuffer.length} bytes`);

    // ✅ Pre-OCR: Check image quality
    try {
      const { checkImageQuality, getQualityWarningMessage } = await import('./imageQualityService');
      const qualityResult = await checkImageQuality(imageBuffer);

      console.log(`[imageUpload] Image quality check: score=${qualityResult.score}, passed=${qualityResult.passed}`);

      if (!qualityResult.passed) {
        // Quality too low - warn user but still accept
        const warning = getQualityWarningMessage(qualityResult);
        if (warning) {
          // Send warning but continue processing
          const { pushLineMessage } = await import('./lineService');
          await pushLineMessage(lineUserId, warning).catch(err => {
            console.warn(`[imageUpload] Failed to send quality warning:`, err);
          });
        }

        // Store quality result for analysis
        await purchaseRef.update({
          image_quality_score: qualityResult.score,
          image_quality_issues: qualityResult.issues,
        }).catch(err => {
          console.warn(`[imageUpload] Failed to store quality result:`, err);
        });
      }
    } catch (qualityError) {
      // Don't block on quality check failure
      console.warn(`[imageUpload] Image quality check failed:`, qualityError);
    }

    // ✅ Increment retry count if this is a retry (status is PENDING_REVIEW or REJECTED)
    const { incrementRetryCount } = await import('./paymentRetryService');
    let retryCount = 0;
    if (purchaseData.status === 'PENDING_REVIEW' || purchaseData.status === 'REJECTED') {
      retryCount = await incrementRetryCount(purchaseIdFinal);
      console.log(`[imageUpload] Retry detected: purchaseId=${purchaseIdFinal}, retryCount=${retryCount}`);

      // ✅ Telemetry: Log retry attempted
      const { logRetryAttempted } = await import('./paymentTelemetry');
      await logRetryAttempted(
        userId,
        purchaseIdFinal,
        retryCount,
        purchaseData.status
      );
    }

    // Upload slip (always succeeds - slip is accepted)
    const { uploadSlipAndMarkPendingReview } = await import('./purchaseService');
    console.log(`[imageUpload] 📤 Uploading slip to storage: purchaseId=${purchaseIdFinal}`);
    const uploadResult = await uploadSlipAndMarkPendingReview(
      purchaseIdFinal,
      userId,
      imageBuffer
    );

    if (!uploadResult.success) {
      console.warn(`[imageUpload] Slip upload rejected: purchaseId=${purchaseIdFinal}, message=${uploadResult.message}`);
      return {
        success: false,
        message: uploadResult.message,
      };
    }

    console.log(`[imageUpload] ✅ Slip uploaded: purchaseId=${purchaseIdFinal}`);

    // ✅ OCR is triggered automatically by uploadSlipAndMarkPendingReview
    // No need to trigger here - purchaseService handles it
    console.log(`[imageUpload] ✅ Slip uploaded, OCR will be triggered by purchaseService`);

    // Slip is always accepted at this point
    // OCR will run async and update status accordingly
    console.log(`[imageUpload] ✅ Slip processing complete: purchaseId=${purchaseIdFinal}`);
    // C1) ACK หลังส่งสลิป: ต้องมี "รับแล้ว / กำลังตรวจ / ไม่ต้องโอนซ้ำ" + ref purchaseId
    return {
      success: true,
      message: getSlipReceivedMessage(purchaseIdFinal),
    };
  } catch (error) {
    console.error(`[imageUpload] ❌ Error processing slip: userId=${userId}, messageId=${messageId}:`, error);
    // Even on error, we should try to be graceful
    // But if we can't accept the slip, we need to inform user
    return {
      success: false,
      message: 'โอ๊ะ! รับสลิปไม่สำเร็จครับ\nลองส่งใหม่ได้เลยนะเจ้านาย',
      quickReply: (await import('../ui/quickReplies')).getPaymentRetryButtons(),
    };
  }
}
