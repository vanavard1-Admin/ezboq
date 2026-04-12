import { getDb } from '../core/firebaseAdmin';
/**
 * EzDoc - Fraud Score Service
 * 
 * Score-based fraud verification for credit purchase slips.
 */

import * as admin from 'firebase-admin';
import { ParsedSlipData } from './slipOcrService';

const db = getDb();

export interface FraudScoreResult {
  score: number; // 0.0 - 1.0
  status: 'PAID' | 'PENDING_REVIEW' | 'REJECTED';
  reason: string;
  fraud_flags: string[];
  time_check_result: 'PASS' | 'FAIL' | 'UNKNOWN';
  signals: {
    amountMatch: boolean;
    receiverMatch: boolean;
    suffixMatch: boolean;
    transactionRefExtracted: boolean;
    duplicateHash: boolean;
    duplicateTransactionRef: boolean;
  };
}

/**
 * Calculate fraud score based on verification signals
 */
export function calculateFraudScore(params: {
  parsedData: ParsedSlipData;
  expectedAmount: number;
  hasDuplicateHash: boolean;
  hasDuplicateTransactionRef: boolean;
  purchaseCreatedAt: admin.firestore.Timestamp;
  ocrConfidence?: number;
}): FraudScoreResult {
  const { parsedData, expectedAmount, hasDuplicateHash, hasDuplicateTransactionRef, purchaseCreatedAt, ocrConfidence = 0.5 } = params;

  const fraud_flags: string[] = [];

  // Immediate rejection for duplicates
  if (hasDuplicateHash) {
    return {
      score: 0,
      status: 'REJECTED',
      reason: 'Duplicate slip hash detected',
      fraud_flags: ['DUPLICATE_SLIP_HASH'],
      time_check_result: 'UNKNOWN',
      signals: {
        amountMatch: false,
        receiverMatch: false,
        suffixMatch: false,
        transactionRefExtracted: !!parsedData.ref,
        duplicateHash: true,
        duplicateTransactionRef: false,
      },
    };
  }

  if (hasDuplicateTransactionRef) {
    return {
      score: 0,
      status: 'REJECTED',
      reason: 'Duplicate transaction reference detected',
      fraud_flags: ['DUPLICATE_TRANSACTION_REF'],
      time_check_result: 'UNKNOWN',
      signals: {
        amountMatch: false,
        receiverMatch: false,
        suffixMatch: false,
        transactionRefExtracted: !!parsedData.ref,
        duplicateHash: false,
        duplicateTransactionRef: true,
      },
    };
  }

  // Time validation
  const timeCheckResult = validateTransactionTime(parsedData.transaction_datetime, purchaseCreatedAt);
  if (timeCheckResult === 'FAIL') {
    fraud_flags.push('TIME_MISMATCH');
  }

  // Amount match check
  const amountMatch = parsedData.amount !== null && parsedData.amount === expectedAmount;
  if (!amountMatch && parsedData.amount !== null) {
    fraud_flags.push('AMOUNT_MISMATCH');
  }

  // Receiver name check
  if (!parsedData.receiverMatched) {
    fraud_flags.push('RECEIVER_NAME_MISMATCH');
  }

  // PromptPay suffix check
  if (!parsedData.suffixMatched) {
    fraud_flags.push('PROMPTPAY_SUFFIX_MISMATCH');
  }

  // OCR confidence check
  if (ocrConfidence < 0.4) {
    fraud_flags.push('OCR_LOW_CONFIDENCE');
  }

  // Calculate score from signals
  let score = 0;

  // Amount match (strict) - 30 points
  if (amountMatch) {
    score += 0.3;
  }

  // Receiver name match - 25 points
  if (parsedData.receiverMatched) {
    score += 0.25;
  }

  // PromptPay suffix match - 25 points
  if (parsedData.suffixMatched) {
    score += 0.25;
  }

  // Transaction ref extracted - 10 points
  if (parsedData.ref) {
    score += 0.1;
  }

  // Bonus: All critical fields match - 10 points
  if (amountMatch && parsedData.receiverMatched && parsedData.suffixMatched) {
    score += 0.1;
  }

  // Time check penalty: reduce score significantly if FAIL
  if (timeCheckResult === 'FAIL') {
    score *= 0.3; // Reduce to 30% of original score
  } else if (timeCheckResult === 'UNKNOWN') {
    score *= 0.8; // Slight reduction for unknown time
  }

  // Cap at 1.0
  score = Math.min(score, 1.0);

  // Determine status based on score
  // CANNOT auto-confirm if time check fails
  let status: 'PAID' | 'PENDING_REVIEW' | 'REJECTED';
  let reason: string;

  if (timeCheckResult === 'FAIL') {
    // Time mismatch - must go to review
    status = 'PENDING_REVIEW';
    reason = 'Transaction time outside allowed window';
  } else if (score >= 0.75 && timeCheckResult === 'PASS') {
    status = 'PAID';
    reason = 'High confidence verification (score >= 0.75)';
  } else if (score >= 0.40) {
    status = 'PENDING_REVIEW';
    reason = `Partial match (score: ${score.toFixed(2)})`;
  } else {
    status = 'REJECTED';
    reason = `Low confidence (score: ${score.toFixed(2)})`;
  }

  return {
    score,
    status,
    reason,
    fraud_flags,
    time_check_result: timeCheckResult,
    signals: {
      amountMatch,
      receiverMatch: parsedData.receiverMatched,
      suffixMatch: parsedData.suffixMatched,
      transactionRefExtracted: !!parsedData.ref,
      duplicateHash: false,
      duplicateTransactionRef: false,
    },
  };
}

/**
 * Check for duplicate slip hash
 */
export async function checkDuplicateSlipHash(slipHash: string, excludePurchaseId: string): Promise<boolean> {
  const duplicateQuery = await db
    .collection('credit_purchases')
    .where('status', '==', 'PAID')
    .where('slip_hash', '==', slipHash)
    .limit(1)
    .get();

  if (duplicateQuery.empty) {
    return false;
  }

  // Check if it's a different purchase
  for (const doc of duplicateQuery.docs) {
    if (doc.id !== excludePurchaseId) {
      return true;
    }
  }

  return false;
}

/**
 * Check for duplicate transaction reference
 */
export async function checkDuplicateTransactionRef(transactionRef: string, excludePurchaseId: string): Promise<boolean> {
  if (!transactionRef) {
    return false;
  }

  const duplicateQuery = await db
    .collection('credit_purchases')
    .where('slip_transaction_ref', '==', transactionRef)
    .limit(1)
    .get();

  if (duplicateQuery.empty) {
    return false;
  }

  // Check if it's a different purchase
  for (const doc of duplicateQuery.docs) {
    if (doc.id !== excludePurchaseId) {
      return true;
    }
  }

  return false;
}

/**
 * Validate transaction time against purchase window
 * Window: createdAt - 2 minutes to createdAt + 20 minutes
 * Returns: PASS | FAIL | UNKNOWN
 */
export function validateTransactionTime(
  transactionDateTime: Date | null,
  purchaseCreatedAt: admin.firestore.Timestamp
): 'PASS' | 'FAIL' | 'UNKNOWN' {
  if (!transactionDateTime) {
    return 'UNKNOWN';
  }

  const createdDate = purchaseCreatedAt.toDate();

  // Allowed window: createdAt - 2 minutes to createdAt + 20 minutes
  const windowStart = new Date(createdDate.getTime() - 2 * 60 * 1000);
  const windowEnd = new Date(createdDate.getTime() + 20 * 60 * 1000);

  // Check if within window
  if (transactionDateTime >= windowStart && transactionDateTime <= windowEnd) {
    return 'PASS';
  }

  // Outside window → REJECT
  return 'FAIL';
}

