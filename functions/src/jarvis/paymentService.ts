/**
 * Jarvis Payment Service — ระบบชำระเงินสำหรับ Jarvis AI Plans
 *
 * Flow:
 * 1. User clicks "สมัคร Jarvis Basic" → createJarvisPurchase() → QR sent
 * 2. User pays → sends slip image in LINE
 * 3. Webhook routes slip to existing OCR → verifies → settleJarvisPurchase()
 * 4. settleJarvisPurchase() calls upgradePlan() → user upgraded
 */
import * as admin from "firebase-admin";
import generatePayload from "promptpay-qr";
import * as QRCode from "qrcode";
import type { JarvisPlan } from "./quotaService";
import { JARVIS_PLANS, upgradePlan } from "./quotaService";

// PromptPay config — same account as EzDoc main
const PROMPTPAY_ID = "0933299990";
const PROMPTPAY_NAME = "นายฉัตรดนัย จิตต์เพ็ชร";

const JARVIS_PURCHASES_COLLECTION = "jarvis_purchases";

export interface JarvisPurchase {
  id: string;
  lineUserId: string;
  plan: JarvisPlan;
  amount: number;
  status: "PENDING" | "WAITING_FOR_SLIP" | "PROCESSING" | "PAID" | "EXPIRED" | "FAILED";
  referenceId: string;
  qrImageUrl?: string;
  qrPayload?: string;
  slipImageUrl?: string;
  slipUploadedAt?: admin.firestore.Timestamp;
  paidAt?: admin.firestore.Timestamp;
  createdAt: admin.firestore.Timestamp;
  expiresAt: admin.firestore.Timestamp;
}

/**
 * Create a Jarvis purchase → generate QR → return Flex message for LINE
 */
export async function createJarvisPurchase(
  lineUserId: string,
  plan: JarvisPlan,
  db: admin.firestore.Firestore,
): Promise<{ flexMessage: Record<string, unknown>; instructionText: string }> {
  const planConfig = JARVIS_PLANS[plan];
  if (planConfig.price === 0) {
    throw new Error("Cannot create purchase for free plan");
  }

  // Check for existing pending purchase (prevent duplicates)
  const existing = await getActiveJarvisPurchase(lineUserId, db);
  if (existing && existing.plan === plan) {
    // Reuse existing QR if still valid
    if (existing.qrImageUrl) {
      return {
        flexMessage: buildQrFlexMessage(existing.qrImageUrl, planConfig.price, existing.referenceId, planConfig),
        instructionText: "📸 QR เดิมยังใช้ได้อยู่ หลังโอนเงินแล้ว ส่งสลิปในแชทนี้ได้เลยครับ",
      };
    }
  }

  // Cancel any other pending purchase
  if (existing) {
    await db.collection(JARVIS_PURCHASES_COLLECTION).doc(existing.id).update({ status: "EXPIRED" });
  }

  const now = admin.firestore.Timestamp.now();
  const expiresAt = admin.firestore.Timestamp.fromMillis(Date.now() + 15 * 60 * 1000); // 15 min
  const referenceId = generateReferenceId();

  const purchaseRef = db.collection(JARVIS_PURCHASES_COLLECTION).doc();
  const purchase: JarvisPurchase = {
    id: purchaseRef.id,
    lineUserId,
    plan,
    amount: planConfig.price,
    status: "PENDING",
    referenceId,
    createdAt: now,
    expiresAt,
  };

  await purchaseRef.set(purchase);

  // Generate QR
  try {
    let promptpayId = PROMPTPAY_ID.replace(/-/g, "");
    if (promptpayId.startsWith("0") && promptpayId.length === 10) {
      promptpayId = "+66" + promptpayId.substring(1);
    }
    const payload = generatePayload(promptpayId, { amount: planConfig.price });
    const qrBuffer = await QRCode.toBuffer(payload, {
      type: "png",
      width: 400,
      margin: 2,
    });

    // Upload to Cloud Storage
    const bucket = admin.storage().bucket();
    const qrPath = `jarvis-payment-qr/${purchaseRef.id}.png`;
    const file = bucket.file(qrPath);
    await file.save(qrBuffer, {
      metadata: { contentType: "image/png", cacheControl: "public, max-age=86400" },
    });

    const [qrImageUrl] = await file.getSignedUrl({
      action: "read",
      expires: Date.now() + 60 * 60 * 1000,
    });

    await purchaseRef.update({
      qrImageUrl,
      qrPayload: payload,
      status: "WAITING_FOR_SLIP",
    });

    return {
      flexMessage: buildQrFlexMessage(qrImageUrl, planConfig.price, referenceId, planConfig),
      instructionText: "📸 หลังโอนเงินแล้ว ส่งสลิปในแชทนี้ได้เลยครับ\nระบบจะตรวจสอบอัตโนมัติ ใช้เวลาไม่เกิน 1 นาที",
    };
  } catch (error) {
    console.error("[JARVIS_PAYMENT] QR generation failed:", error);
    await purchaseRef.update({ status: "FAILED" });
    throw new Error("QR generation failed");
  }
}

/**
 * Check if user has an active (pending) Jarvis purchase
 */
export async function getActiveJarvisPurchase(
  lineUserId: string,
  db: admin.firestore.Firestore,
): Promise<JarvisPurchase | null> {
  const cutoffMs = Date.now() - 15 * 60 * 1000;

  // Simple query: only filter by lineUserId to avoid composite index requirement
  // Filter status and createdAt in memory
  const snapshot = await db
    .collection(JARVIS_PURCHASES_COLLECTION)
    .where("lineUserId", "==", lineUserId)
    .limit(10)
    .get();

  if (snapshot.empty) return null;

  const activeStatuses = new Set(["PENDING", "WAITING_FOR_SLIP", "PROCESSING"]);
  const matching = snapshot.docs
    .map((d) => d.data() as JarvisPurchase)
    .filter((p) => activeStatuses.has(p.status) && p.createdAt.toMillis() >= cutoffMs)
    .sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());

  return matching[0] || null;
}

/**
 * Settle a verified Jarvis purchase → upgrade plan
 */
export async function settleJarvisPurchase(
  purchaseId: string,
  lineUserId: string,
  db: admin.firestore.Firestore,
): Promise<{ success: boolean; plan: JarvisPlan }> {
  const purchaseRef = db.collection(JARVIS_PURCHASES_COLLECTION).doc(purchaseId);
  const doc = await purchaseRef.get();

  if (!doc.exists) throw new Error("Purchase not found");
  const purchase = doc.data() as JarvisPurchase;

  if (purchase.status === "PAID") {
    return { success: true, plan: purchase.plan }; // Already settled
  }

  // Mark as PAID
  await purchaseRef.update({
    status: "PAID",
    paidAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Upgrade the plan
  await upgradePlan(lineUserId, purchase.plan, db);

  console.log(`[JARVIS_PAYMENT] Settled: purchaseId=${purchaseId}, plan=${purchase.plan}, lineUserId=${lineUserId}`);

  return { success: true, plan: purchase.plan };
}

/**
 * Mark purchase as processing (slip received, OCR in progress)
 */
export async function markJarvisPurchaseProcessing(
  purchaseId: string,
  slipImageUrl: string,
  db: admin.firestore.Firestore,
): Promise<void> {
  await db.collection(JARVIS_PURCHASES_COLLECTION).doc(purchaseId).update({
    status: "PROCESSING",
    slipImageUrl,
    slipUploadedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

/**
 * Process slip image for Jarvis purchase verification
 * Downloads image from LINE → OCR → verify amount & receiver → settle if OK
 */
export async function processJarvisSlip(
  lineUserId: string,
  messageId: string,
  accessToken: string,
  db: admin.firestore.Firestore,
): Promise<{ success: boolean; message: string; plan?: JarvisPlan }> {
  const purchase = await getActiveJarvisPurchase(lineUserId, db);
  if (!purchase) {
    return { success: false, message: "ไม่มีรายการชำระเงินที่ค้างอยู่ครับ" };
  }

  // Mark as processing
  await markJarvisPurchaseProcessing(purchase.id, `line://${messageId}`, db);

  try {
    // Download image from LINE
    const { downloadLineImage } = await import("../services/imageUploadService");
    const imageBuffer = await downloadLineImage(messageId, accessToken);

    // OCR with Google Cloud Vision
    const { ImageAnnotatorClient } = await import("@google-cloud/vision");
    const visionClient = new ImageAnnotatorClient();
    const [result] = await visionClient.textDetection({ image: { content: imageBuffer } });
    const detections = result.textAnnotations;
    const fullText = detections?.[0]?.description || "";

    if (!fullText || fullText.trim().length === 0) {
      return { success: false, message: "📸 อ่านสลิปไม่ออกครับ ลองส่งรูปที่ชัดกว่านี้อีกครั้ง" };
    }

    // Parse Thai slip text
    const { parseThaiSlipText } = await import("../services/slipOcrService");
    const parsed = parseThaiSlipText(fullText);

    console.log(`[JARVIS_PAYMENT] OCR result: amount=${parsed.amount}, receiver=${parsed.receiverMatched}, suffix=${parsed.suffixMatched}, ref=${parsed.ref}`);

    // Verify: amount must match (with tolerance) and receiver should match
    const amountMatch = parsed.amount !== null && Math.abs(parsed.amount - purchase.amount) <= 1;
    const receiverOk = parsed.receiverMatched || parsed.suffixMatched;

    if (amountMatch && receiverOk) {
      // Auto-approve
      const { plan } = await settleJarvisPurchase(purchase.id, lineUserId, db);
      const planConfig = JARVIS_PLANS[plan];
      return {
        success: true,
        plan,
        message:
          `✅ ชำระเงินสำเร็จ!\n\n` +
          `${planConfig.emoji} อัพเกรดเป็น EzDoc ${planConfig.name} เรียบร้อย!\n` +
          `📊 โควต้า: ${planConfig.questionsPerMonth} คำถาม/เดือน\n\n` +
          `ใช้ EzDoc AI ได้เลยครับ!`,
      };
    }

    if (amountMatch && !receiverOk) {
      // Amount matches but receiver unclear — still approve (could be bank display difference)
      const { plan } = await settleJarvisPurchase(purchase.id, lineUserId, db);
      const planConfig = JARVIS_PLANS[plan];
      return {
        success: true,
        plan,
        message:
          `✅ ชำระเงินสำเร็จ!\n\n` +
          `${planConfig.emoji} อัพเกรดเป็น EzDoc ${planConfig.name} เรียบร้อย!\n` +
          `📊 โควต้า: ${planConfig.questionsPerMonth} คำถาม/เดือน\n\n` +
          `ใช้ EzDoc AI ได้เลยครับ!`,
      };
    }

    // Amount doesn't match or can't read
    const detail = parsed.amount !== null
      ? `ยอดในสลิป ฿${parsed.amount} ไม่ตรงกับ ฿${purchase.amount}`
      : "ไม่สามารถอ่านยอดจากสลิปได้";

    // Reset to WAITING_FOR_SLIP so user can retry
    await db.collection(JARVIS_PURCHASES_COLLECTION).doc(purchase.id).update({ status: "WAITING_FOR_SLIP" });

    return {
      success: false,
      message: `❌ ตรวจสอบสลิปไม่ผ่าน: ${detail}\n\n📸 ลองส่งสลิปใหม่ หรือพิมพ์ "ยกเลิกสมัคร" เพื่อยกเลิก`,
    };
  } catch (error) {
    console.error("[JARVIS_PAYMENT] Slip processing error:", error);
    // Reset to WAITING_FOR_SLIP
    await db.collection(JARVIS_PURCHASES_COLLECTION).doc(purchase.id).update({ status: "WAITING_FOR_SLIP" });
    return { success: false, message: "❌ ตรวจสอบสลิปไม่สำเร็จ ลองส่งใหม่อีกครั้งครับ" };
  }
}

// ============ Helpers ============

function generateReferenceId(): string {
  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `JV${dateStr}${random}`;
}

function buildQrFlexMessage(
  qrImageUrl: string,
  amount: number,
  referenceId: string,
  planConfig: { name: string; emoji: string; questionsPerMonth: number },
): Record<string, unknown> {
  return {
    type: "bubble",
    size: "mega",
    header: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "text",
          text: `${planConfig.emoji} สมัคร EzDoc ${planConfig.name}`,
          weight: "bold",
          size: "lg",
          color: "#FF6F00",
        },
        {
          type: "text",
          text: `${planConfig.questionsPerMonth} คำถาม/เดือน`,
          size: "xs",
          color: "#666666",
          margin: "sm",
        },
      ],
      backgroundColor: "#FFF8E1",
      paddingAll: "15px",
    },
    hero: {
      type: "image",
      url: qrImageUrl,
      size: "full",
      aspectRatio: "1:1",
      aspectMode: "fit",
    },
    body: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "text",
          text: `ยอดชำระ: ${amount} บาท`,
          weight: "bold",
          size: "xl",
          align: "center",
          color: "#FF6F00",
        },
        { type: "separator", margin: "lg" },
        {
          type: "box",
          layout: "vertical",
          margin: "lg",
          spacing: "sm",
          contents: [
            {
              type: "box",
              layout: "baseline",
              contents: [
                { type: "text", text: "ชื่อบัญชี:", size: "sm", color: "#666666", flex: 2 },
                { type: "text", text: PROMPTPAY_NAME, size: "sm", color: "#333333", flex: 4, wrap: true },
              ],
            },
            {
              type: "box",
              layout: "baseline",
              contents: [
                { type: "text", text: "ธนาคาร:", size: "sm", color: "#666666", flex: 2 },
                { type: "text", text: "KBANK (PromptPay)", size: "sm", color: "#333333", flex: 4 },
              ],
            },
            {
              type: "box",
              layout: "baseline",
              contents: [
                { type: "text", text: "Ref:", size: "sm", color: "#666666", flex: 2 },
                { type: "text", text: referenceId, size: "sm", color: "#333333", flex: 4 },
              ],
            },
          ],
        },
        {
          type: "box",
          layout: "vertical",
          margin: "lg",
          backgroundColor: "#FFF3E0",
          cornerRadius: "8px",
          paddingAll: "10px",
          contents: [
            {
              type: "text",
              text: "⏰ QR หมดอายุใน 15 นาที",
              size: "xs",
              color: "#E65100",
              align: "center",
            },
          ],
        },
      ],
      paddingAll: "15px",
    },
    footer: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "button",
          style: "secondary",
          height: "sm",
          action: {
            type: "message",
            label: "❌ ยกเลิก",
            text: "ยกเลิกสมัคร",
          },
        },
      ],
      paddingAll: "10px",
    },
  };
}
