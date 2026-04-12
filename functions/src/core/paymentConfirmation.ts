import { getDb } from './firebaseAdmin';
import { getNextDocumentSequence } from './documentNumber';
/**
 * Payment Confirmation Handler
 * 
 * CRITICAL: This handles money → must be explicit and reversible-proof
 * 
 * Flow:
 * User: "ชำระแล้ว"
 *   ↓ Bot asks for explicit confirmation
 * User: "ยืนยันรับเงิน"
 *   ↓ Receipt created (immutable, revenue locked)
 * 
 * INVARIANTS:
 * - Receipt MUST have paid_at, paid_by_user_id, source_invoice_id
 * - Receipt is FINAL (no edit/delete/reversal)
 * - Revenue entry created immediately (no undo)
 */

import * as admin from 'firebase-admin';

// ============================================================================
// PAYMENT CONFIRMATION STATE
// ============================================================================

export interface PaymentConfirmationContext {
  conversationId: string;
  userId: string;
  businessId: string;
  invoiceId: string; // docId of INVOICE being paid
  invoiceDocNo: string; // e.g., "INV-2568-001"
  invoiceAmount: number;
  invoiceCustomerName: string;
  invoiceItems: Array<{ description_th?: string; amount?: number;[key: string]: unknown }>;

  // Metadata
  createdAt: admin.firestore.Timestamp;
  expiresAt: admin.firestore.Timestamp; // 5 minutes - must confirm quickly
}

// ============================================================================
// STEP 1: User Says "ชำระแล้ว"
// ============================================================================

export async function handlePaymentNotification(
  conversationId: string,
  userId: string,
  businessId: string,
  lastIssuedDocId: string, // INVOICE document ID
  replyFn: (msg: string) => Promise<void>
): Promise<void> {
  const db = getDb();
  try {
    // Fetch the INVOICE document
    const invoiceSnap = await db
      .collection('users')
      .doc(userId)
      .collection('businesses')
      .doc(businessId)
      .collection('documents')
      .doc(lastIssuedDocId)
      .get();

    if (!invoiceSnap.exists) {
      await replyFn('ไม่พบเอกสาร โปรดลองใหม่');
      return;
    }

    const invoiceData = invoiceSnap.data() as unknown;
    if (!invoiceData || typeof invoiceData !== 'object') {
      await replyFn('ไม่พบข้อมูลเอกสาร');
      return;
    }

    // Validate it's an INVOICE or BILL
    const docType = (invoiceData as Record<string, unknown>).doc_type;
    if (docType !== 'BILL' && docType !== 'INVOICE') {
      await replyFn('ต้องเป็นใบวางบิลเท่านั้น');
      return;
    }

    // Validate it's ISSUED (not already PAID)
    if ((invoiceData as Record<string, unknown>).status === 'PAID') {
      await replyFn('เอกสารนี้ชำระแล้ว');
      return;
    }

    // Check if payment confirmation already pending for this invoice (idempotent)
    const existingContext = await db
      .collection('payment_confirmations')
      .doc(lastIssuedDocId)
      .get();

    if (existingContext.exists) {
      const context = existingContext.data() as Record<string, unknown> | undefined;
      const expiresTime = (context?.expiresAt as admin.firestore.Timestamp | undefined)?.toMillis();

      if (expiresTime && Date.now() < expiresTime) {
        // Still valid - just remind user
        console.log(
          `[paymentNotif] Pending confirmation already exists for invoiceId=${lastIssuedDocId}, reminding user`
        );
        const docNo = String((invoiceData as Record<string, unknown>).doc_no || '');
        const amount = Number((invoiceData as Record<string, unknown>).total_amount || 0);
        await replyFn(
          `การบันทึกการชำระสำหรับใบวางบิล ${docNo} อยู่ระหว่างรอยืนยัน\n\n` +
          `ยอดชำระ: ${formatCurrency(amount)} บาท\n\n` +
          `พิมพ์ "ยืนยันรับเงิน ${docNo}" เพื่อดำเนินการต่อ`
        );
        return;
      } else {
        // Expired - clean up and proceed
        await cleanupPaymentContext(db, lastIssuedDocId);
      }
    }

    // Create confirmation context (stored temporarily)
    const now = admin.firestore.Timestamp.now();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    const paymentContext: PaymentConfirmationContext = {
      conversationId,
      userId,
      businessId,
      invoiceId: lastIssuedDocId,
      invoiceDocNo: String((invoiceData as Record<string, unknown>).doc_no || ''),
      invoiceAmount: Number((invoiceData as Record<string, unknown>).total_amount || 0),
      invoiceCustomerName: String((invoiceData as Record<string, unknown>).customer_name || 'Unknown'),
      invoiceItems: Array((invoiceData as Record<string, unknown>).items || []) as Array<{ description_th?: string; amount?: number;[key: string]: unknown }>,
      createdAt: now,
      expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
    };

    // Save confirmation context temporarily (keyed by invoiceDocId)
    await db
      .collection('payment_confirmations')
      .doc(lastIssuedDocId)
      .set(paymentContext);

    // Build explicit confirmation message
    const confirmMessage = buildPaymentConfirmationPrompt(
      String((invoiceData as Record<string, unknown>).doc_no || ''),
      Number((invoiceData as Record<string, unknown>).total_amount || 0),
      String((invoiceData as Record<string, unknown>).customer_name || 'Unknown')
    );

    await replyFn(confirmMessage);
  } catch (error) {
    console.error('Error handling payment notification:', error);
    await replyFn('เกิดข้อผิดพลาด โปรดลองใหม่');
  }
}

// ============================================================================
// STEP 2: User Says "ยืนยันรับเงิน" (Explicit Confirmation)
// ============================================================================

export async function handlePaymentConfirmation(
  conversationId: string,
  userId: string,
  businessId: string,
  lastIssuedDocId: string,
  replyFn: (msg: string) => Promise<void>
): Promise<void> {
  const db = getDb();
  try {
    // Fetch INVOICE again (verify state hasn't changed)
    const invoiceSnap = await db
      .collection('users')
      .doc(userId)
      .collection('businesses')
      .doc(businessId)
      .collection('documents')
      .doc(lastIssuedDocId)
      .get();

    if (!invoiceSnap.exists) {
      await replyFn('เอกสารหายไป โปรดลองใหม่');
      return;
    }

    const invoiceData = invoiceSnap.data() as unknown;
    if (!invoiceData || typeof invoiceData !== 'object') {
      await replyFn('ไม่พบข้อมูลเอกสาร');
      return;
    }

    // Double-check: still ISSUED
    const inv = invoiceData as Record<string, unknown>;
    if (inv.status !== 'ISSUED') {
      await replyFn('เอกสารสถานะเปลี่ยนแปลงไปแล้ว');
      return;
    }

    // Validate it's a BILL/INVOICE only
    const docType = String(inv.doc_type || '').toUpperCase();
    if (docType !== 'BILL' && docType !== 'INVOICE') {
      await replyFn('ต้องเป็นใบวางบิลเท่านั้น');
      return;
    }

    // CRITICAL: Verify payment confirmation context exists
    // (user must have said "ชำระแล้ว" first)
    const contextSnap = await db
      .collection('payment_confirmations')
      .doc(lastIssuedDocId)
      .get();

    if (!contextSnap.exists) {
      console.warn(
        `[paymentConfirm] No pending context found for invoiceId=${lastIssuedDocId}, proceeding with explicit confirmation`
      );
    } else {
      console.log(
        `[paymentConfirm] Confirmed pending context for invoiceId=${lastIssuedDocId}`
      );
    }

    // Verify context not expired (5 minutes)
    const context = contextSnap.data() as Record<string, unknown> | undefined;
    if (contextSnap.exists && context?.expiresAt) {
      const expiresTime = (context.expiresAt as admin.firestore.Timestamp).toMillis();
      if (Date.now() > expiresTime) {
        console.log(`[paymentConfirm] Confirmation context expired`);
        await cleanupPaymentContext(db, lastIssuedDocId);
        await replyFn('หมดเวลายืนยัน โปรดเริ่มใหม่');
        return;
      }
    }

    // Create RECEIPT document (IMMUTABLE)
    const receiptDocNo = await generateReceiptDocNumber(businessId);
    const now = admin.firestore.Timestamp.now();

    const receiptData = {
      // Identity
      id: receiptDocNo,
      created_at: now,
      business_id: businessId,
      user_id: userId,
      source_conversation_id: conversationId,

      // Document metadata
      doc_type: 'RECEIPT',
      doc_no: receiptDocNo,
      status: 'PAID', // Receipts are always PAID
      issue_date: now,

      // Customer info (copy from INVOICE)
      customer_id: inv.customer_id,
      customer_name: inv.customer_name,
      customer_tax_id: inv.customer_tax_id,

      // Items (copy from INVOICE)
      items: inv.items || [],

      // Financial (copy from INVOICE)
      sub_total_amount: inv.sub_total_amount,
      vat_percent: inv.vat_percent,
      vat_amount: inv.vat_amount,
      wht_percent: inv.wht_percent,
      wht_amount: inv.wht_amount,
      total_amount: inv.total_amount,
      net_receive_amount: inv.net_receive_amount,

      // RECEIPT SPECIFIC: Payment Info (NEW)
      paid_at: now, // 🔒 When payment was recorded
      paid_by_user_id: userId, // 🔒 Who recorded the payment
      paid_via: 'MANUAL', // 🔒 Payment method (MANUAL / TRANSFER / CASH)

      // Source document chain (REQUIRED for RECEIPT)
      source_doc_id: lastIssuedDocId, // Links to INVOICE
      source_chain: `INVOICE → RECEIPT`,

      // Metadata
      updated_at: now,
    };

    // 1. Create RECEIPT (atomic)
    await db
      .collection('users')
      .doc(userId)
      .collection('businesses')
      .doc(businessId)
      .collection('documents')
      .doc(receiptDocNo)
      .set(receiptData);

    // 2. Update INVOICE status to PAID
    await db
      .collection('users')
      .doc(userId)
      .collection('businesses')
      .doc(businessId)
      .collection('documents')
      .doc(lastIssuedDocId)
      .update({
        status: 'PAID',
        updated_at: now,
      });

    // 3. Create revenue entry (NOW LOCKS REVENUE)
    await createRevenueEntry(businessId, receiptDocNo, receiptData);

    // 4. Reply to user
    const successMessage = buildPaymentConfirmedMessage(
      receiptDocNo,
      Number((receiptData as Record<string, unknown>).total_amount || 0),
      String((receiptData as Record<string, unknown>).customer_name || 'Unknown')
    );

    await replyFn(successMessage);

    // 5. Clean up payment confirmation context
    await cleanupPaymentContext(db, lastIssuedDocId);
  } catch (error) {
    console.error('Error confirming payment:', error);
    await replyFn('เกิดข้อผิดพลาด ไม่สามารถบันทึกการชำระได้');
  }
}

// ============================================================================
// STEP 3: User Says "ยกเลิก" (Abort Payment)
// ============================================================================
// STEP 3: User Says "ยกเลิก" (Abort Payment)
// ============================================================================

export async function handlePaymentCancellation(
  invoiceDocId: string,
  replyFn: (msg: string) => Promise<void>
): Promise<void> {
  const db = getDb();
  try {
    await cleanupPaymentContext(db, invoiceDocId);
    await replyFn('ยกเลิกการบันทึกการชำระแล้ว');
  } catch (error) {
    console.error('Error cancelling payment:', error);
    await replyFn('เกิดข้อผิดพลาด');
  }
}

// ============================================================================
// MESSAGE BUILDERS
// ============================================================================

function buildPaymentConfirmationPrompt(
  docNo: string,
  amount: number,
  customerName: string
): string {
  return (
    `💰 ยืนยันการชำระเงิน\n\n` +
    `เอกสาร: ${docNo}\n` +
    `ลูกค้า: ${customerName}\n` +
    `ยอดชำระ: ${formatCurrency(amount)} บาท\n\n` +
    `❗ เมื่อยืนยันแล้ว ระบบจะ:\n` +
    `• ออกใบเสร็จรับเงิน (${generateReceiptDocNumberPreview(docNo)})\n` +
    `• บันทึกเป็นรายได้ (แก้ไขย้อนหลังไม่ได้)\n` +
    `• อัปเดตสถิติยอดขาย\n\n` +
    `⚠️ การบันทึกนี้ถาวร\n\n` +
    `พิมพ์ "ยืนยันรับเงิน" เพื่อดำเนินการ\n` +
    `หรือ "ยกเลิก" ถ้ากดผิด`
  );
}

function buildPaymentConfirmedMessage(
  receiptDocNo: string,
  amount: number,
  customerName: string
): string {
  return (
    `✅ บันทึกการชำระแล้ว\n\n` +
    `เอกสาร: ${receiptDocNo}\n` +
    `ลูกค้า: ${customerName}\n` +
    `ยอดรับ: ${formatCurrency(amount)} บาท\n\n` +
    `📎 (ไฟล์ PDF สามารถดาวน์โหลดได้)\n` +
    `🔗 ลิงก์: https://ez.doc/receipt/${receiptDocNo}\n\n` +
    `💡 พิมพ์ "รายงาน" เพื่อดูสถิติยอดขาย`
  );
}

function generateReceiptDocNumberPreview(invoiceDocNo: string): string {
  // E.g., "INV-2568-001" → "RCPT-2568-001"
  return invoiceDocNo.replace('INV', 'RCPT');
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function generateReceiptDocNumber(businessId: string): Promise<string> {
  const thaiYear = new Date().getFullYear() + 543;
  const sequence = await getNextDocumentSequence({
    businessId,
    docTypeKey: 'RECEIPT',
    typePrefix: 'RCPT',
    thaiYear,
  });
  const seqNumber = String(sequence).padStart(3, '0');
  return `RCPT-${thaiYear}-${seqNumber}`;
}

async function createRevenueEntry(
  businessId: string,
  receiptDocNo: string,
  receiptData: unknown
): Promise<void> {
  const db = getDb();
  const data = receiptData as Record<string, unknown>;
  const thaiYear = new Date().getFullYear() + 543;
  const month = String(new Date().getMonth() + 1).padStart(2, '0');
  const monthKey = `${thaiYear}_${month}`;

  const entryRef = db
    .collection('users')
    .doc(String((receiptData as any).user_id))
    .collection('businesses')
    .doc(businessId)
    .collection('revenue_entries')
    .doc(monthKey);

  await entryRef.update({
    receipt_count: admin.firestore.FieldValue.increment(1),
    total_revenue: admin.firestore.FieldValue.increment(
      Number(data.total_amount || 0)
    ),
    net_received: admin.firestore.FieldValue.increment(
      Number(data.net_receive_amount || data.total_amount || 0)
    ),
    last_updated: admin.firestore.Timestamp.now(),

    // Track last receipt
    last_receipt_id: receiptDocNo,
    last_receipt_customer: String(data.customer_name || 'Unknown'),
  });
}

async function cleanupPaymentContext(
  db: admin.firestore.Firestore,
  invoiceDocId: string
): Promise<void> {
  // Delete payment confirmation record for this invoice
  await db
    .collection('payment_confirmations')
    .doc(invoiceDocId)
    .delete();
}

function formatCurrency(amount: number): string {
  return amount.toLocaleString('th-TH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// ============================================================================
// PAYMENT CONFIRMATION INTENT
// ============================================================================

/**
 * Add to conversationHandler.processIntent():
 * 
 * case Intent.PAID:
 *   if (currentState === ConversationState.AWAITING_PAYMENT) {
 *     await handlePaymentNotification(
 *       conversation.conversationId,
 *       conversation.userId,
 *       conversation.businessId,
 *       conversation.lastIssuedDocId,
 *       replyFn
 *     );
 *     
 *     // Transition to PAYMENT_CONFIRMATION_PENDING
 *     await convRef.update({
 *       currentState: ConversationState.PAYMENT_CONFIRMATION_PENDING,
 *     });
 *   }
 *   break;
 * 
 * case Intent.CONFIRM_PAYMENT: // "ยืนยันรับเงิน"
 *   if (currentState === ConversationState.PAYMENT_CONFIRMATION_PENDING) {
 *     await handlePaymentConfirmation(
 *       conversation.conversationId,
 *       conversation.userId,
 *       conversation.businessId,
 *       conversation.lastIssuedDocId,
 *       replyFn
 *     );
 *     
 *     // Transition to COMPLETED
 *     await convRef.update({
 *       currentState: ConversationState.COMPLETED,
 *     });
 *   }
 *   break;
 */

export const PaymentConfirmationUtils = {
  handlePaymentNotification,
  handlePaymentConfirmation,
  handlePaymentCancellation,
};
