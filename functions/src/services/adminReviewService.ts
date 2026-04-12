import { getDb } from '../core/firebaseAdmin';
/**
 * EzDoc - Admin Review Service
 * 
 * Handles admin review commands for credit purchase slips.
 */

import * as admin from 'firebase-admin';
import { CreditPurchase, getPackageDefinition } from './purchaseService';
import { logAdminAction } from './adminAuthService';

const db = getDb();

/**
 * List pending review purchases
 */
export async function listPendingReviews(): Promise<string> {
  const pendingQuery = await db
    .collection('credit_purchases')
    .where('status', '==', 'PENDING_REVIEW')
    .orderBy('createdAt', 'desc')
    .limit(10)
    .get();

  if (pendingQuery.empty) {
    return '📋 ไม่มีงานค้าง';
  }

  const lines = ['📋 งานค้าง (ล่าสุด 10 รายการ)', ''];

  for (const doc of pendingQuery.docs) {
    const p = doc.data() as CreditPurchase;
    const date = p.createdAt.toDate().toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const pkg = getPackageDefinition(p.packageType);
    const amount = p.amount;
    const refId = p.referenceId;

    lines.push(`🔍 ${doc.id}`);
    lines.push(`   Ref: ${refId}`);
    lines.push(`   ${pkg?.name || 'แพ็ค'} - ${amount} บาท`);
    lines.push(`   ${date}`);
    lines.push('');
  }

  lines.push('💡 "admin ดู <purchaseId>" - ดูรายละเอียด');
  lines.push('💡 "admin ยืนยัน <purchaseId>" - อนุมัติ');
  lines.push('💡 "admin ปฏิเสธ <purchaseId> <เหตุผล>" - ปฏิเสธ');

  return lines.join('\n');
}

/**
 * Get slip details for review
 */
export async function getSlipDetails(purchaseId: string): Promise<string> {
  const purchaseDoc = await db.collection('credit_purchases').doc(purchaseId).get();

  if (!purchaseDoc.exists) {
    return `❌ ไม่พบรายการ ID: ${purchaseId}`;
  }

  const p = purchaseDoc.data() as CreditPurchase;

  const lines: string[] = [];

  lines.push(`📄 สลิป: ${purchaseId}`);
  lines.push(`📝 Ref: ${p.referenceId}`);
  lines.push(`💰 จำนวน: ${p.amount} บาท`);
  const pkg = getPackageDefinition(p.packageType);
  lines.push(`📦 แพ็ค: ${pkg?.name || 'N/A'}`);
  lines.push(`📅 สร้างเมื่อ: ${p.createdAt.toDate().toLocaleString('th-TH')}`);
  lines.push('');

  if (p.slip_image_url) {
    lines.push(`🖼️ ภาพสลิป: ${p.slip_image_url}`);
  }

  if (p.slip_ocr_confidence !== undefined) {
    lines.push(`📊 ความมั่นใจ OCR: ${(p.slip_ocr_confidence * 100).toFixed(1)}%`);
  }

  if (p.fraud_score !== undefined) {
    lines.push(`🎯 Fraud Score: ${(p.fraud_score * 100).toFixed(1)}%`);
  }

  if (p.slip_parsed_result) {
    const parsed = p.slip_parsed_result;
    lines.push('');
    lines.push('📋 ข้อมูลที่สกัดได้:');
    lines.push(`   จำนวนเงิน: ${parsed.amount || 'ไม่พบ'}`);
    lines.push(`   ชื่อผู้รับ: ${parsed.receiverMatched ? '✅ ตรง' : '❌ ไม่ตรง'}`);
    lines.push(`   Suffix: ${parsed.suffixMatched ? '✅ ตรง' : '❌ ไม่ตรง'}`);
    lines.push(`   Ref: ${parsed.ref || 'ไม่พบ'}`);
  }

  if (p.slip_transaction_ref) {
    lines.push(`🔖 Transaction Ref: ${p.slip_transaction_ref}`);
  }

  if (p.fraud_reason) {
    lines.push('');
    lines.push(`⚠️ เหตุผลปฏิเสธ: ${p.fraud_reason}`);
  }

  lines.push('');
  lines.push('💡 "admin ยืนยัน <purchaseId>" - อนุมัติ');
  lines.push('💡 "admin ปฏิเสธ <purchaseId> <เหตุผล>" - ปฏิเสธ');
  lines.push('💡 "admin ยืนยันอีเมล <purchaseId> <email text>" - ยืนยันผ่านอีเมล');

  return lines.join('\n');
}

/**
 * Approve slip (admin action)
 */
export async function approveSlip(purchaseId: string, adminLineUserId: string): Promise<string> {
  const purchaseRef = db.collection('credit_purchases').doc(purchaseId);
  const purchaseDoc = await purchaseRef.get();

  if (!purchaseDoc.exists) {
    return `❌ ไม่พบรายการ ID: ${purchaseId}`;
  }

  const purchase = purchaseDoc.data() as CreditPurchase;

  if (purchase.status === 'PAID') {
    return `✅ รายการนี้ชำระเงินแล้ว`;
  }

  if (purchase.status === 'REJECTED') {
    return `❌ รายการนี้ถูกปฏิเสธแล้ว`;
  }

  // ✅ C-FIX-1: Call settlement FIRST (atomic), then update admin fields
  // Settlement will set status=PAID and credit_applied=true atomically in transaction
  const { settleVerifiedPurchase } = await import('./paymentSettlementService');
  const settlementResult = await settleVerifiedPurchase({
    purchaseId,
    verifiedBy: 'ADMIN',
    traceId: `admin_approve_${Date.now()}_${purchaseId}`,
  });

  if (!settlementResult.ok) {
    throw new Error(`Settlement failed for purchase ${purchaseId}: ${settlementResult.reason || 'unknown'}`);
  }

  // Log admin action
  await logAdminAction({
    adminLineUserId,
    action: 'APPROVE_SLIP',
    targetId: purchaseId,
    details: { purchaseId, amount: purchase.amount },
  });

  // Update admin-specific fields (status and credit_applied already set by settlement)
  const now = admin.firestore.Timestamp.now();
  await purchaseRef.update({
    verified_by: 'ADMIN',
    reviewed_by: adminLineUserId,
    reviewed_at: now,
    paidAt: now,
  });

  // Notify user
  let notificationWarning = '';
  try {
    const { sendSubscriptionSuccessExperience } = await import('./subscriptionReceiptService');
    await sendSubscriptionSuccessExperience(purchaseId);
    await purchaseRef.set({
      delivery_sent: true,
      delivery_sent_at: admin.firestore.FieldValue.serverTimestamp(),
      delivery_sent_status: 'PAID',
    }, { merge: true });
  } catch (error) {
    console.error(`[adminReviewService] Failed to notify user:`, error);
    notificationWarning = ' แต่การส่งข้อความยืนยันและใบเสร็จให้ลูกค้ายังไม่ครบ';
  }

  return `✅ อนุมัติสลิปสำเร็จ (${purchaseId})${notificationWarning}`;
}

/**
 * Reject slip (admin action)
 */
export async function rejectSlip(purchaseId: string, adminLineUserId: string, reason: string): Promise<string> {
  const purchaseRef = db.collection('credit_purchases').doc(purchaseId);
  const purchaseDoc = await purchaseRef.get();

  if (!purchaseDoc.exists) {
    return `❌ ไม่พบรายการ ID: ${purchaseId}`;
  }

  const purchase = purchaseDoc.data() as CreditPurchase;

  if (purchase.status === 'PAID') {
    return `❌ รายการนี้ชำระเงินแล้ว ไม่สามารถปฏิเสธได้`;
  }

  // Update purchase status
  const now = admin.firestore.Timestamp.now();
  await purchaseRef.update({
    status: 'REJECTED',
    fraud_reason: reason || 'ปฏิเสธโดยผู้ดูแลระบบ',
    reviewed_by: adminLineUserId,
    reviewed_at: now,
  });

  // Log admin action
  await logAdminAction({
    adminLineUserId,
    action: 'REJECT_SLIP',
    targetId: purchaseId,
    details: { purchaseId, reason },
  });

  // Notify user
  try {
    const { pushLineMessage } = await import('./lineService');
    await pushLineMessage(
      purchase.lineUserId,
      `❌ สลิปถูกปฏิเสธ\n\nเหตุผล: ${reason || 'ไม่ผ่านการตรวจสอบ'}`
    );
  } catch (error) {
    console.error(`[adminReviewService] Failed to notify user:`, error);
  }

  return `❌ ปฏิเสธสลิปสำเร็จ (${purchaseId})`;
}

/**
 * Manual credit adjustment (admin action)
 */
export async function addManualCredits(
  userId: string,
  credits: number,
  adminLineUserId: string,
  reason?: string
): Promise<string> {
  if (!userId) {
    return '❌ ไม่พบ userId';
  }

  if (!Number.isFinite(credits) || credits <= 0) {
    return '❌ จำนวนเครดิตต้องมากกว่า 0';
  }

  const refId = `admin_manual_${Date.now()}_${userId}`;
  const note = reason || 'Admin manual credit';

  const { adjustCreditsWithLedger } = await import('./creditsLedger');
  await adjustCreditsWithLedger(userId, credits, note, refId, 'ADMIN', {
    adminLineUserId,
  });

  await logAdminAction({
    adminLineUserId,
    action: 'ADD_CREDITS',
    targetId: userId,
    details: { userId, credits, reason: note },
  });

  return `✅ เติมเครดิต ${credits} ให้ ${userId} แล้ว`;
}

/**
 * Confirm purchase via email text (admin action)
 * Admin pastes full bank email text, system parses and validates
 */
export async function confirmViaEmail(purchaseId: string, adminLineUserId: string, emailText: string): Promise<string> {
  const purchaseRef = db.collection('credit_purchases').doc(purchaseId);
  const purchaseDoc = await purchaseRef.get();

  if (!purchaseDoc.exists) {
    return `❌ ไม่พบรายการ ID: ${purchaseId}`;
  }

  const purchase = purchaseDoc.data() as CreditPurchase;

  if (purchase.status === 'PAID') {
    return `✅ รายการนี้ชำระเงินแล้ว`;
  }

  if (purchase.status === 'REJECTED') {
    return `❌ รายการนี้ถูกปฏิเสธแล้ว`;
  }

  // Parse email text (simple extraction - can be enhanced)
  // Extract amount
  const amountMatch = emailText.match(/(?:จำนวน|amount|ยอด)[:\s]*(\d+(?:,\d{3})*(?:\.\d{2})?)/i);
  const parsedAmount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : null;

  // Extract transaction ref
  const refMatch = emailText.match(/(?:เลขที่รายการ|transaction|ref)[:\s]*([A-Z0-9-]+)/i);
  const transactionRef = refMatch ? refMatch[1] : null;

  // Check if amount matches
  if (parsedAmount !== null && parsedAmount !== purchase.amount) {
    return `❌ จำนวนเงินไม่ตรง (Email: ${parsedAmount}, Purchase: ${purchase.amount})`;
  }

  // Check for duplicate transaction ref
  if (transactionRef) {
    const { checkDuplicateTransactionRef } = await import('./fraudScoreService');
    const isDuplicate = await checkDuplicateTransactionRef(transactionRef, purchaseId);
    if (isDuplicate) {
      return `❌ Transaction reference ซ้ำกับรายการอื่น`;
    }
  }

  // ✅ C-FIX-1: Call settlement FIRST (atomic), then update admin fields
  // Settlement will set status=PAID and credit_applied=true atomically in transaction
  const { settleVerifiedPurchase } = await import('./paymentSettlementService');
  const settlementResult = await settleVerifiedPurchase({
    purchaseId,
    verifiedBy: 'ADMIN',
    traceId: `admin_email_${Date.now()}_${purchaseId}`,
  });

  if (!settlementResult.ok) {
    throw new Error(`Settlement failed for purchase ${purchaseId}: ${settlementResult.reason || 'unknown'}`);
  }

  // Log admin action
  await logAdminAction({
    adminLineUserId,
    action: 'CONFIRM_VIA_EMAIL',
    targetId: purchaseId,
    details: { purchaseId, transactionRef },
  });

  // Update admin-specific fields (status and credit_applied already set by settlement)
  const now = admin.firestore.Timestamp.now();
  await purchaseRef.update({
    verified_by: 'ADMIN',
    reviewed_by: adminLineUserId,
    reviewed_at: now,
    paidAt: now,
    slip_transaction_ref: transactionRef || null,
    fraud_reason: 'Confirmed via email',
  });

  // Notify user
  let notificationWarning = '';
  try {
    const { sendSubscriptionSuccessExperience } = await import('./subscriptionReceiptService');
    await sendSubscriptionSuccessExperience(purchaseId);
    await purchaseRef.set({
      delivery_sent: true,
      delivery_sent_at: admin.firestore.FieldValue.serverTimestamp(),
      delivery_sent_status: 'PAID',
    }, { merge: true });
  } catch (error) {
    console.error(`[adminReviewService] Failed to notify user:`, error);
    notificationWarning = ' แต่การส่งข้อความยืนยันและใบเสร็จให้ลูกค้ายังไม่ครบ';
  }

  return `✅ ยืนยันสลิปสำเร็จ (${purchaseId})${notificationWarning}`;
}
