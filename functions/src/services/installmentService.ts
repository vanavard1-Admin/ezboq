import { getDb } from '../core/firebaseAdmin';
/**
 * EzDoc - Installment Service
 * 
 * Handles multi-installment billing from QUO to INV.
 * Features:
 * - One QUO → multiple INV (installments)
 * - Sum validation (cannot exceed QUO total)
 * - Auto-close QUO when fully billed
 * - Near-complete notification
 */

import * as admin from 'firebase-admin';

export interface InstallmentInfo {
  installmentNo: number;
  amount: number;
  invId: string;
  invNo: string;
  status: string;
  createdAt: admin.firestore.Timestamp;
}

export interface InstallmentSummary {
  quoId: string;
  quoNo: string;
  quoTotal: number;
  issuedTotal: number;
  remainingBalance: number;
  installments: InstallmentInfo[];
  status: 'OPEN' | 'NEAR_COMPLETE' | 'CLOSED';
  isNearComplete: boolean;
}

/**
 * Get installment summary for a QUO
 */
export async function getInstallmentSummary(
  userId: string,
  businessId: string,
  quoNo: string
): Promise<InstallmentSummary | null> {
  const db = getDb();
  // Find QUO
  const quoQuery = await db
    .collection('users')
    .doc(userId)
    .collection('businesses')
    .doc(businessId)
    .collection('documents')
    .where('doc_no', '==', quoNo)
    .where('doc_type', '==', 'QUOTATION')
    .limit(1)
    .get();

  if (quoQuery.empty) {
    return null;
  }

  const quoDoc = quoQuery.docs[0];
  const quoData = quoDoc.data();
  const quoTotal = quoData.total || quoData.total_amount || 0;

  // Find all INVs linked to this QUO
  const invQuery = await db
    .collection('users')
    .doc(userId)
    .collection('businesses')
    .doc(businessId)
    .collection('documents')
    .where('source_doc_id', '==', quoDoc.id)
    .get();

  const installments: InstallmentInfo[] = [];
  let issuedTotal = 0;

  const invDocs = invQuery.docs.filter((doc) => {
    const data = doc.data();
    return data.source_doc_type === 'QUO' && data.doc_type === 'BILL';
  }).sort((a, b) => {
    const aNo = a.data().installment_no || 0;
    const bNo = b.data().installment_no || 0;
    return aNo - bNo;
  });

  for (const invDoc of invDocs) {
    const invData = invDoc.data();
    // Only count ISSUED invoices toward total
    if (invData.status === 'ISSUED' || invData.status === 'PAID') {
      const amount = invData.installment_total || invData.total || invData.total_amount || 0;
      issuedTotal += amount;
      installments.push({
        installmentNo: invData.installment_no || 1,
        amount,
        invId: invDoc.id,
        invNo: invData.doc_no,
        status: invData.status,
        createdAt: invData.created_at,
      });
    }
  }

  const remainingBalance = Math.max(0, quoTotal - issuedTotal);
  const isNearComplete = remainingBalance > 0 && remainingBalance <= quoTotal * 0.1;

  let status: 'OPEN' | 'NEAR_COMPLETE' | 'CLOSED' = 'OPEN';
  if (quoData.status === 'CLOSED' || remainingBalance === 0) {
    status = 'CLOSED';
  } else if (isNearComplete) {
    status = 'NEAR_COMPLETE';
  }

  return {
    quoId: quoDoc.id,
    quoNo,
    quoTotal,
    issuedTotal,
    remainingBalance,
    installments,
    status,
    isNearComplete,
  };
}

/**
 * Get next installment number for a QUO
 */
export async function getNextInstallmentNo(
  userId: string,
  businessId: string,
  quoId: string
): Promise<number> {
  const db = getDb();
  const invQuery = await db
    .collection('users')
    .doc(userId)
    .collection('businesses')
    .doc(businessId)
    .collection('documents')
    .where('source_doc_id', '==', quoId)
    .get();

  const invDocs = invQuery.docs.filter((doc) => {
    const data = doc.data();
    return data.source_doc_type === 'QUO' && data.doc_type === 'BILL';
  });

  let maxNo = 0;
  for (const doc of invDocs) {
    const no = doc.data().installment_no || 0;
    if (no > maxNo) maxNo = no;
  }

  return maxNo + 1;
}

/**
 * Validate installment can be created
 */
export async function validateInstallment(
  userId: string,
  businessId: string,
  quoId: string,
  installmentNo: number,
  installmentTotal: number
): Promise<{ valid: boolean; error?: string; remainingBalance?: number }> {
  const db = getDb();
  const quoDoc = await db
    .collection('users')
    .doc(userId)
    .collection('businesses')
    .doc(businessId)
    .collection('documents')
    .doc(quoId)
    .get();

  if (!quoDoc.exists) {
    return { valid: false, error: 'QUO not found' };
  }

  const quoData = quoDoc.data()!;

  if (quoData.status === 'CLOSED') {
    return { valid: false, error: 'QUO is already closed (fully billed)' };
  }

  const quoTotal = quoData.total || quoData.total_amount || 0;

  // Check existing installments
  const invQuery = await db
    .collection('users')
    .doc(userId)
    .collection('businesses')
    .doc(businessId)
    .collection('documents')
    .where('source_doc_id', '==', quoId)
    .get();

  let issuedTotal = 0;
  const usedInstallmentNos: number[] = [];

  const invDocs = invQuery.docs.filter((doc) => {
    const data = doc.data();
    return data.source_doc_type === 'QUO' && data.doc_type === 'BILL';
  });

  for (const invDoc of invDocs) {
    const invData = invDoc.data();
    if (invData.status === 'ISSUED' || invData.status === 'PAID') {
      issuedTotal += invData.installment_total || invData.total || invData.total_amount || 0;
    }
    if (invData.installment_no) {
      usedInstallmentNos.push(invData.installment_no);
    }
  }

  // Check installment_no uniqueness
  if (usedInstallmentNos.includes(installmentNo)) {
    return { valid: false, error: `งวดที่ ${installmentNo} มีอยู่แล้ว` };
  }

  const remainingBalance = quoTotal - issuedTotal;

  if (remainingBalance <= 0) {
    return { valid: false, error: 'ออกบิลครบแล้ว ไม่สามารถเพิ่มงวดได้' };
  }

  if (installmentTotal > remainingBalance) {
    return { 
      valid: false, 
      error: `ยอดงวดเกินยอดคงเหลือ (คงเหลือ ${remainingBalance.toLocaleString('th-TH')} บาท)`,
      remainingBalance 
    };
  }

  return { valid: true, remainingBalance };
}

/**
 * Check if INV already has a REC
 */
export async function hasReceiptFromInvoice(
  userId: string,
  businessId: string,
  invId: string
): Promise<boolean> {
  const db = getDb();
  const recQuery = await db
    .collection('users')
    .doc(userId)
    .collection('businesses')
    .doc(businessId)
    .collection('documents')
    .get();

  const recDocs = recQuery.docs.filter((doc) => {
    const data = doc.data();
    return data.source_doc_id === invId && data.source_doc_type === 'INV' && data.doc_type === 'RECEIPT';
  });

  return recDocs.length > 0;
}

/**
 * Auto-close QUO if fully billed
 * Called after INV is issued
 */
export async function checkAndCloseQuo(
  userId: string,
  businessId: string,
  quoId: string,
  lineUserId?: string
): Promise<{ closed: boolean; nearComplete: boolean }> {
  const db = getDb();
  const quoRef = db
    .collection('users')
    .doc(userId)
    .collection('businesses')
    .doc(businessId)
    .collection('documents')
    .doc(quoId);

  const quoDoc = await quoRef.get();
  if (!quoDoc.exists) {
    return { closed: false, nearComplete: false };
  }

  const quoData = quoDoc.data()!;
  if (quoData.status === 'CLOSED') {
    return { closed: true, nearComplete: false };
  }

  const quoTotal = quoData.total || quoData.total_amount || 0;
  const quoNo = quoData.doc_no;

  // Sum all ISSUED installments
  const invQuery = await db
    .collection('users')
    .doc(userId)
    .collection('businesses')
    .doc(businessId)
    .collection('documents')
    .get();

  const invDocs = invQuery.docs.filter((doc) => {
    const data = doc.data();
    return data.source_doc_id === quoId && data.source_doc_type === 'QUO' && data.doc_type === 'BILL';
  });

  let issuedTotal = 0;
  for (const invDoc of invDocs) {
    const invData = invDoc.data();
    if (invData.status === 'ISSUED' || invData.status === 'PAID') {
      issuedTotal += invData.installment_total || invData.total || invData.total_amount || 0;
    }
  }

  const remainingBalance = quoTotal - issuedTotal;
  const isNearComplete = remainingBalance > 0 && remainingBalance <= quoTotal * 0.1;

  // Auto-close if fully billed
  if (remainingBalance <= 0) {
    await quoRef.update({
      status: 'CLOSED',
      closed_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`[installmentService] Auto-closed QUO ${quoNo} (fully billed)`);

    // Optionally push LINE notification
    if (lineUserId) {
      try {
        const { pushLineMessage } = await import('./lineService');
        await pushLineMessage(lineUserId, `✅ ${quoNo} ปิดแล้ว (ออกใบวางบิลครบ)`);
      } catch (e) {
        console.warn('[installmentService] Failed to push close notification:', e);
      }
    }

    return { closed: true, nearComplete: false };
  }

  // Near-complete notification
  if (isNearComplete && !quoData.quo_near_complete_notified) {
    await quoRef.update({
      quo_near_complete_notified: true,
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`[installmentService] QUO ${quoNo} is near complete (remaining: ${remainingBalance})`);

    if (lineUserId) {
      try {
        const { pushLineMessage } = await import('./lineService');
        const remaining = remainingBalance.toLocaleString('th-TH', { minimumFractionDigits: 2 });
        await pushLineMessage(lineUserId, `⚠️ ${quoNo} ใกล้ครบแล้ว (คงเหลือ ${remaining}฿)`);
      } catch (e) {
        console.warn('[installmentService] Failed to push near-complete notification:', e);
      }
    }

    return { closed: false, nearComplete: true };
  }

  return { closed: false, nearComplete: isNearComplete };
}

/**
 * Format installment summary for LINE response
 */
export function formatInstallmentSummary(summary: InstallmentSummary): string {
  const { quoNo, quoTotal, issuedTotal, remainingBalance, installments, status } = summary;

  const totalFmt = quoTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 });
  const issuedFmt = issuedTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 });
  const remainingFmt = remainingBalance.toLocaleString('th-TH', { minimumFractionDigits: 2 });

  const statusEmoji = status === 'CLOSED' ? '✅' : status === 'NEAR_COMPLETE' ? '⚠️' : '📋';
  const statusText = status === 'CLOSED' ? 'ปิดแล้ว' : status === 'NEAR_COMPLETE' ? 'ใกล้ครบ' : 'เปิดอยู่';

  const lines = [
    `📊 สรุปงวดของ ${quoNo}`,
    ``,
    `💰 ยอดรวม: ${totalFmt} บาท`,
    `📝 ออกบิลแล้ว: ${issuedFmt} บาท`,
    `📍 คงเหลือ: ${remainingFmt} บาท`,
    `${statusEmoji} สถานะ: ${statusText}`,
  ];

  if (installments.length > 0) {
    lines.push('', '📋 รายการงวด:');
    for (const inst of installments) {
      const amtFmt = inst.amount.toLocaleString('th-TH');
      const statusIcon = inst.status === 'PAID' ? '✅' : inst.status === 'ISSUED' ? '📄' : '⏳';
      lines.push(`  ${statusIcon} งวด ${inst.installmentNo}: ${amtFmt}฿ (${inst.invNo})`);
    }
  } else {
    lines.push('', 'โอ๊ะ! ยังไม่มีใบวางบิลจาก QUO นี้ครับเจ้านาย');
  }

  return lines.join('\n');
}

/**
 * Format installment dashboard for LINE response
 */
export function formatInstallmentDashboard(summary: InstallmentSummary): string {
  const { quoNo, quoTotal, issuedTotal, remainingBalance, installments, status } = summary;

  const totalFmt = quoTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 });
  const issuedFmt = issuedTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 });
  const remainingFmt = remainingBalance.toLocaleString('th-TH', { minimumFractionDigits: 2 });
  const pctComplete = quoTotal > 0 ? Math.round((issuedTotal / quoTotal) * 100) : 0;

  const statusEmoji = status === 'CLOSED' ? '✅' : status === 'NEAR_COMPLETE' ? '⚠️' : '📋';
  const statusText = status === 'CLOSED' ? 'ปิดแล้ว' : status === 'NEAR_COMPLETE' ? 'ใกล้ครบ' : 'เปิดอยู่';

  // Progress bar
  const barLength = 10;
  const filled = Math.round((pctComplete / 100) * barLength);
  const progressBar = '█'.repeat(filled) + '░'.repeat(barLength - filled);

  return [
    `📊 แดชบอร์ด ${quoNo}`,
    ``,
    `${statusEmoji} ${statusText}`,
    ``,
    `[${progressBar}] ${pctComplete}%`,
    ``,
    `💰 ยอดรวม: ${totalFmt} บาท`,
    `📝 ออกบิล: ${issuedFmt} บาท`,
    `📍 คงเหลือ: ${remainingFmt} บาท`,
    `📋 จำนวนงวด: ${installments.length} งวด`,
  ].join('\n');
}
