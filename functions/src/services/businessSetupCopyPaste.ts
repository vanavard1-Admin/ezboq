import { getDb } from '../core/firebaseAdmin';
/**
 * Business Setup Copy-Paste Flow
 * 
 * Human-first business setup that accepts copy-paste input
 * 
 * PRINCIPLES:
 * - No step-by-step questions
 * - Accept "paste whole block" input
 * - Forgiving parser (keyword-based, not position-based)
 * - Summary + confirm before save
 * - Never silent
 */

import * as admin from "firebase-admin";
import { BusinessData, createBusiness, updateBusiness } from "../core/businesses";
import { CLEAR_TOKEN } from "./businessDataParser";

const db = getDb();

/**
 * Business setup state
 */
export type BusinessSetupState = 
  | 'IDLE'
  | 'WAITING_FOR_DATA'  // Sent template, waiting for user input
  | 'SHOWING_SUMMARY';   // Showing summary, waiting for confirm

/**
 * Get business setup template message
 */
export function getBusinessSetupTemplate(prefill?: Partial<BusinessData>): string {
  const v = (value?: string): string =>
    value && value !== CLEAR_TOKEN && value.trim().length > 0 ? ` ${value}` : '';
  return `ติ๊ดๆ ก๊อป-แก้-ส่งได้เลยนะ  
ก๊อปข้อความด้านล่าง แล้วแก้ข้อมูลของคุณแทนที่

━━━━━━━━━━━━━━
ชื่อธุรกิจ:${v(prefill?.name)}
ที่อยู่:${v(prefill?.address)}
เบอร์โทร:${v(prefill?.phone)}
เลขผู้เสียภาษี:${v(prefill?.taxId)}
อีเมล:${v(prefill?.email)}
ธนาคาร:${v(prefill?.bankName)}
เลขบัญชี:${v(prefill?.bankAccountNo)}
ชื่อบัญชี:${v(prefill?.bankAccountName)}
━━━━━━━━━━━━━━

แก้เสร็จแล้วส่งกลับมาได้เลยครับเจ้านาย`;
}

/**
 * Get summary message
 */
export function getBusinessSetupSummary(
  parsed: Partial<BusinessData>,
  diffLines?: string[]
): string {
  const lines: string[] = [];
  lines.push(`ติ๊ดๆ ด๊อกๆ สรุปข้อมูลธุรกิจให้แล้วนะ เจ้านาย\n`);

  lines.push(`ชื่อธุรกิจ: ${parsed.name || '—'}`);
  lines.push(`ที่อยู่: ${parsed.address || '—'}`);
  lines.push(`เบอร์โทร: ${parsed.phone || '—'}`);
  lines.push(`เลขผู้เสียภาษี: ${parsed.taxId || '—'}`);
  lines.push(`อีเมล: ${parsed.email || '—'}\n`);
  lines.push(`ธนาคาร: ${parsed.bankName || '—'}`);
  lines.push(`เลขบัญชี: ${parsed.bankAccountNo || '—'}`);
  lines.push(`ชื่อบัญชี: ${parsed.bankAccountName || '—'}\n`);

  if (diffLines && diffLines.length > 0) {
    lines.push('อัปเดตที่เปลี่ยน:');
    lines.push(...diffLines.map((l, i) => `${i + 1}. ${l}`));
    lines.push('');
  }

  lines.push(`ถูกต้องไหมครับเจ้านาย`);

  return lines.join('\n');
}

/**
 * Get save success message
 */
export function getBusinessSetupSaveSuccess(): string {
  return `บันทึกข้อมูลธุรกิจเรียบร้อยแล้วค่ะ ✅  
สามารถใช้งานออกเอกสารได้เลยนะคะ`;
}

/**
 * Get business setup state for user
 */
export async function getBusinessSetupState(userId: string): Promise<BusinessSetupState> {
  try {
    const stateDoc = await db
      .collection("users")
      .doc(userId)
      .collection("conversation_state")
      .doc("business_setup")
      .get();

    if (!stateDoc.exists) {
      return 'IDLE';
    }

    const data = stateDoc.data();
    return (data?.state as BusinessSetupState) || 'IDLE';
  } catch (error) {
    console.error(`[businessSetupCopyPaste] Error getting state:`, error);
    return 'IDLE';
  }
}

/**
 * Get prefill data from business profile + payment settings
 */
export async function getBusinessSetupPrefillData(
  userId: string,
  businessId: string
): Promise<Partial<BusinessData>> {
  try {
    const bizRef = db
      .collection("users")
      .doc(userId)
      .collection("businesses")
      .doc(businessId);
    const bizSnap = await bizRef.get();
    const bizData = bizSnap.exists ? (bizSnap.data() || {}) : {};

    const paymentRef = db.doc(`users/${userId}/businesses/${businessId}/settings/payment`);
    const paymentSnap = await paymentRef.get();
    const paymentData = paymentSnap.exists ? (paymentSnap.data() || {}) : {};

    const bankName =
      (paymentData.bank_name as string | undefined) ||
      (paymentData.bank_code as string | undefined) ||
      (bizData.bankName as string | undefined) ||
      (bizData.bank_name as string | undefined) ||
      undefined;

    return {
      name: (bizData.name as string | undefined) || undefined,
      address: (bizData.address as string | undefined) || undefined,
      phone: (bizData.phone as string | undefined) || undefined,
      email: (bizData.email as string | undefined) || undefined,
      taxId: (bizData.taxId as string | undefined) || (bizData.tax_id as string | undefined) || undefined,
      bankName,
      bankAccountNo:
        (paymentData.bank_account as string | undefined) ||
        (bizData.bankAccountNo as string | undefined) ||
        (bizData.bank_account as string | undefined) ||
        undefined,
      bankAccountName:
        (paymentData.bank_account_name as string | undefined) ||
        (bizData.bankAccountName as string | undefined) ||
        (bizData.bank_account_name as string | undefined) ||
        undefined,
    };
  } catch (error) {
    console.error(`[businessSetupCopyPaste] Error getting prefill:`, error);
    return {};
  }
}

/**
 * Merge parsed data into existing data (keep existing if incoming empty)
 */
export function mergeBusinessData(
  existing: Partial<BusinessData>,
  incoming: Partial<BusinessData>
): Partial<BusinessData> {
  const pick = (next?: string, prev?: string): string | undefined => {
    if (next === CLEAR_TOKEN) return '';
    if (next && next.trim().length > 0) return next;
    if (prev && prev.trim().length > 0) return prev;
    return undefined;
  };

  return {
    name: pick(incoming.name, existing.name),
    address: pick(incoming.address, existing.address),
    phone: pick(incoming.phone, existing.phone),
    email: pick(incoming.email, existing.email),
    taxId: pick(incoming.taxId, existing.taxId),
    bankName: pick(incoming.bankName, existing.bankName),
    bankAccountNo: pick(incoming.bankAccountNo, existing.bankAccountNo),
    bankAccountName: pick(incoming.bankAccountName, existing.bankAccountName),
  };
}

/**
 * Build human-readable diff lines
 */
export function getBusinessSetupDiff(
  existing: Partial<BusinessData>,
  updated: Partial<BusinessData>
): string[] {
  const normalize = (v?: string): string => (v ? v.trim() : '');
  const diff: Array<{ label: string; from: string; to: string }> = [];
  const compare = (label: string, prev?: string, next?: string): void => {
    const a = normalize(prev);
    const b = normalize(next);
    if (!a && !b) return;
    if (a === b) return;
    diff.push({ label, from: a || '—', to: b || '—' });
  };

  compare('ชื่อธุรกิจ', existing.name, updated.name);
  compare('ที่อยู่', existing.address, updated.address);
  compare('เบอร์โทร', existing.phone, updated.phone);
  compare('เลขผู้เสียภาษี', existing.taxId, updated.taxId);
  compare('อีเมล', existing.email, updated.email);
  compare('ธนาคาร', existing.bankName, updated.bankName);
  compare('เลขบัญชี', existing.bankAccountNo, updated.bankAccountNo);
  compare('ชื่อบัญชี', existing.bankAccountName, updated.bankAccountName);

  return diff.map((d) => `${d.label}: ${d.from} → ${d.to}`);
}

/**
 * Set business setup state
 */
export async function setBusinessSetupState(
  userId: string,
  state: BusinessSetupState,
  parsedData?: Partial<BusinessData>
): Promise<void> {
  try {
    const stateRef = db
      .collection("users")
      .doc(userId)
      .collection("conversation_state")
      .doc("business_setup");

    const updateData: any = {
      state,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (parsedData) {
      updateData.parsedData = parsedData;
    }

    await stateRef.set(updateData, { merge: true });
  } catch (error) {
    console.error(`[businessSetupCopyPaste] Error setting state:`, error);
    throw error;
  }
}

/**
 * Get parsed data from state
 */
export async function getParsedBusinessData(userId: string): Promise<Partial<BusinessData> | null> {
  try {
    const stateDoc = await db
      .collection("users")
      .doc(userId)
      .collection("conversation_state")
      .doc("business_setup")
      .get();

    if (!stateDoc.exists) {
      return null;
    }

    const data = stateDoc.data();
    return data?.parsedData || null;
  } catch (error) {
    console.error(`[businessSetupCopyPaste] Error getting parsed data:`, error);
    return null;
  }
}

/**
 * Clear business setup state
 */
export async function clearBusinessSetupState(userId: string): Promise<void> {
  try {
    await db
      .collection("users")
      .doc(userId)
      .collection("conversation_state")
      .doc("business_setup")
      .delete();
  } catch (error) {
    console.error(`[businessSetupCopyPaste] Error clearing state:`, error);
  }
}

/**
 * Save business data
 */
export async function saveBusinessData(
  userId: string,
  businessId: string,
  data: Partial<BusinessData>
): Promise<{ success: boolean; message: string }> {
  try {
    const { findBankByName } = await import("./bankMasterService");
    const { setBankTransfer } = await import("../core/businessSettings");

    // Check if business exists
    const businessRef = db
      .collection("users")
      .doc(userId)
      .collection("businesses")
      .doc(businessId);

    const businessDoc = await businessRef.get();
    let targetBusinessId = businessId;

    if (businessDoc.exists) {
      // Update existing
      await updateBusiness(userId, businessId, data as BusinessData);
    } else {
      // Create new
      targetBusinessId = await createBusiness(userId, data as BusinessData);
    }

    // Persist bank settings if provided
    const hasBankData = Boolean(data.bankName || data.bankAccountNo || data.bankAccountName);
    const hasBankClear = [data.bankName, data.bankAccountNo, data.bankAccountName].some(
      (v) => v === ''
    );
    if (hasBankData) {
      const bankName = data.bankName || '';
      const bankAccountNo = data.bankAccountNo || '';
      const bankAccountName = data.bankAccountName || '';
      const bank = bankName ? findBankByName(bankName) : null;

      if (bank && bankAccountNo) {
        await setBankTransfer(userId, targetBusinessId, bank.code, bankAccountNo, bankAccountName || bank.name_th);
      } else {
        // Save raw fields into business profile for fallback display
        await updateBusiness(userId, targetBusinessId, {
          bankName: bankName || undefined,
          bankAccountNo: bankAccountNo || undefined,
          bankAccountName: bankAccountName || undefined,
        });
      }
    } else if (hasBankClear) {
      const paymentRef = db.doc(`users/${userId}/businesses/${targetBusinessId}/settings/payment`);
      await paymentRef.set(
        {
          bank_code: null,
          bank_name: null,
          bank_account: null,
          bank_account_name: null,
          bank_logo_url: null,
          updated_at: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      await updateBusiness(userId, targetBusinessId, {
        bankName: '',
        bankAccountNo: '',
        bankAccountName: '',
      });
    }

    // Clear state
    await clearBusinessSetupState(userId);

    return {
      success: true,
      message: getBusinessSetupSaveSuccess(),
    };
  } catch (error) {
    console.error(`[businessSetupCopyPaste] Error saving business:`, error);
    return {
      success: false,
      message: 'โอ๊ะ! บันทึกไม่สำเร็จตอนนี้ครับ\nลองใหม่ได้เลยนะเจ้านาย',
    };
  }
}
