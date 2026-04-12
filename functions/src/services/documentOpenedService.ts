import { getDb } from '../core/firebaseAdmin';
/**
 * Document Opened Detection Service
 * 
 * Tracks when clients open document links and notifies document owners
 * 
 * Rules:
 * - Track FIRST open per document only
 * - Store: documentOpenedAt, openedByClient = true
 * - Notify owner via LINE (professional, reassuring tone)
 * - Never sell or add urgency
 */

import * as admin from "firebase-admin";
import { pushLineMessage } from "./lineService";

/**
 * Record document opened event (idempotent - only first open counts)
 */
export async function recordDocumentOpened(
  docId: string,
  userId: string,
  businessId: string,
  isClientAccess: boolean = true
): Promise<{ recorded: boolean; alreadyOpened: boolean }> {
  const db = getDb();
  const docRef = db
    .collection("users")
    .doc(userId)
    .collection("businesses")
    .doc(businessId)
    .collection("documents")
    .doc(docId);

  try {
    // Use transaction to ensure idempotency
    const result = await db.runTransaction(async (tx) => {
      const docSnap = await tx.get(docRef);

      if (!docSnap.exists) {
        throw new Error(`Document ${docId} not found`);
      }

      const docData = docSnap.data()!;

      // Check if already opened by client
      if (docData.openedByClient && isClientAccess) {
        return { recorded: false, alreadyOpened: true };
      }

      // Record first open
      const now = admin.firestore.Timestamp.now();
      const updates: Record<string, unknown> = {
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      if (isClientAccess) {
        // First client open
        updates.documentOpenedAt = now;
        updates.openedByClient = true;
      } else {
        // Owner access (for tracking, but don't notify)
        if (!docData.documentOpenedAt) {
          updates.documentOpenedAt = now;
        }
      }

      tx.update(docRef, updates);

      return { recorded: true, alreadyOpened: false };
    });

    // If this is the first client open, notify owner
    if (result.recorded && isClientAccess && !result.alreadyOpened) {
      await notifyDocumentOpened(docId, userId, businessId).catch((err) => {
        // Non-blocking - log error but don't fail the request
        console.error(`[DOCUMENT_OPENED_NOTIFY_FAIL] docId=${docId}:`, err);
      });
    }

    return result;
  } catch (error) {
    console.error(`[DOCUMENT_OPENED_RECORD_FAIL] docId=${docId}:`, error);
    // Don't throw - this is non-critical
    return { recorded: false, alreadyOpened: false };
  }
}

/**
 * Notify document owner via LINE when client opens document
 */
async function notifyDocumentOpened(
  docId: string,
  userId: string,
  businessId: string
): Promise<void> {
  const db = getDb();

  // Load document to get docNo and docType
  const docRef = db
    .collection("users")
    .doc(userId)
    .collection("businesses")
    .doc(businessId)
    .collection("documents")
    .doc(docId);

  const docSnap = await docRef.get();
  if (!docSnap.exists) {
    throw new Error(`Document ${docId} not found`);
  }

  const docData = docSnap.data()!;
  const docNo = docData.docNo || docData.doc_no || docId;
  const docType = docData.docType || docData.doc_type || "เอกสาร";

  // Get LINE userId from user account
  const userDoc = await db.collection("users").doc(userId).get();
  if (!userDoc.exists) {
    throw new Error(`User ${userId} not found`);
  }

  const userData = userDoc.data()!;
  const lineUserId = userData.lineUserId || userData.line_user_id;

  if (!lineUserId) {
    console.log(`[DOCUMENT_OPENED_NO_LINE] userId=${userId} has no LINE account linked`);
    return; // User not linked to LINE, skip notification
  }

  // Document type display names
  const docTypeNames: Record<string, string> = {
    QUO: "ใบเสนอราคา",
    QUOTATION: "ใบเสนอราคา",
    INV: "ใบวางบิล",
    BILL: "ใบวางบิล",
    INVOICE: "ใบวางบิล",
    REC: "ใบเสร็จรับเงิน",
    RECEIPT: "ใบเสร็จรับเงิน",
  };

  const docTypeName = docTypeNames[docType.toUpperCase()] || "เอกสาร";

  // Professional, reassuring notification message
  const message = `แจ้งให้ทราบนะครับ\n\nลูกค้าได้เปิด${docTypeName} ${docNo} ของคุณแล้ว`;

  // Quick Reply buttons (plan-aware, no sales)
  const quickReply = [
    {
      type: "action" as const,
      action: {
        type: "message" as const,
        label: "📂 ดูเอกสาร",
        text: `ดู${docTypeName} ${docNo}`,
      },
    },
    {
      type: "action" as const,
      action: {
        type: "message" as const,
        label: "📄 ออกใบวางบิล",
        text: "สร้างใบวางบิล",
      },
    },
    {
      type: "action" as const,
      action: {
        type: "message" as const,
        label: "🏠 เมนูหลัก",
        text: "เมนู",
      },
    },
  ];

  // Send LINE message
  await pushLineMessage(lineUserId, message, undefined, quickReply);

  console.log(
    `[DOCUMENT_OPENED_NOTIFIED] ✅ docId=${docId}, docNo=${docNo}, lineUserId=${lineUserId}`
  );
}

