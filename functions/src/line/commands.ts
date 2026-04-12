import { getDb } from '../core/firebaseAdmin';
/**
 * LINE Command Handler - Business Setup Wizard
 * Multi-step state machine for collecting business information
 */

import * as admin from 'firebase-admin';
import { createBusiness, BusinessData } from '../core/businesses';
import { DRAFT_EXPIRE_MINUTES } from '../shared/config';

// Wizard step definitions
export type BizSetupStep =
    | 'ASK_NAME'
    | 'ASK_ADDRESS'
    | 'ASK_TAX_ID'
    | 'ASK_PHONE'
    | 'ASK_EMAIL'
    | 'ASK_VAT'
    | 'ASK_WHT'
    | 'ASK_BANK'
    | 'CONFIRM';

// Wizard session data stored in drafts collection
export interface BizSetupSession {
    stage: 'BIZ_SETUP';
    step: BizSetupStep;
    payload: Partial<BusinessData>;
    expiresAt: admin.firestore.Timestamp;
    createdAt: admin.firestore.FieldValue;
    updatedAt: admin.firestore.FieldValue;
}

// Step order for navigation
const STEP_ORDER: BizSetupStep[] = [
    'ASK_NAME',
    'ASK_ADDRESS',
    'ASK_TAX_ID',
    'ASK_PHONE',
    'ASK_EMAIL',
    'ASK_VAT',
    'ASK_WHT',
    'ASK_BANK',
    'CONFIRM',
];

// Messages for each step
const STEP_MESSAGES: Record<BizSetupStep, string> = {
    ASK_NAME: `บี๊บ! เริ่มตั้งค่าธุรกิจแล้วครับเจ้านาย

พิมพ์ **ชื่อธุรกิจ** ได้เลยนะครับ
(เช่น "บริษัท ABC จำกัด" หรือ "ร้านกาแฟ XYZ")`,

    ASK_ADDRESS: `ติ๊ดๆ ส่ง **ที่อยู่** สำหรับใส่ในเอกสารได้เลยครับ
(เช่น "123 ถ.สุขุมวิท แขวงคลองเตย เขตคลองเตย กทม. 10110")`,

    ASK_TAX_ID: `ติ๊ดๆ เลขผู้เสียภาษี (13 หลัก) ถ้ามีครับ
(เช่น "0105561234567")
พิมพ์ "ข้าม" ได้ถ้าไม่มี`,

    ASK_PHONE: `ติ๊ดๆ เบอร์โทรศัพท์ติดต่อคืออะไรครับเจ้านาย
(เช่น "02-123-4567" หรือ "089-123-4567")`,

    ASK_EMAIL: `ติ๊ดๆ อีเมลติดต่อคืออะไรครับเจ้านาย
(เช่น "info@company.co.th")`,

    ASK_VAT: `ติ๊ดๆ ธุรกิจของเจ้านายจด VAT ไหมครับ?

พิมพ์ "มี" หรือ "มี 7%" เปิด VAT 7%
พิมพ์ "ไม่มี" ไม่คิด VAT
พิมพ์ "ข้าม" ใช้ค่าเริ่มต้น`,

    ASK_WHT: `ติ๊ดๆ เปิดหัก ณ ที่จ่าย (WHT) ไหมครับ?

พิมพ์ "มี" หรือ "มี 3%" เปิด WHT 3%
พิมพ์ "ไม่มี" ไม่หัก ณ ที่จ่าย
พิมพ์ "ข้าม" ใช้ค่าเริ่มต้น`,

    ASK_BANK: `ติ๊ดๆ ส่งข้อมูลบัญชีรับเงิน (บรรทัดเดียว) ครับ
รูปแบบ ชื่อธนาคาร เลขบัญชี ชื่อบัญชี

ตัวอย่าง "กสิกร 020314744 นายสมชาย ใจดี"`,

    CONFIRM: '', // Generated dynamically
};

/**
 * Check if text is a skip command
 */
export function isSkipCommand(text: string): boolean {
    const lower = text.toLowerCase().trim();
    return ['ข้าม', 'skip', '-', 'ไม่ใส่', 'ไม่มี', 'no'].includes(lower);
}

/**
 * Check if text is a cancel command
 */
export function isCancelCommand(text: string): boolean {
    const lower = text.toLowerCase().trim();
    return ['ยกเลิก', 'cancel', 'ออก', 'exit'].includes(lower);
}

/**
 * Check if text is a business setup start command
 */
export function isBusinessSetupCommand(text: string): boolean {
    const lower = text.toLowerCase().trim();
    return (
        lower.startsWith('ตั้งค่าธุรกิจ') ||
        lower.startsWith('set business') ||
        lower.startsWith('setup business') ||
        lower === 'ธุรกิจ' ||
        lower === 'business'
    );
}

/**
 * Get next step in wizard
 */
function getNextStep(currentStep: BizSetupStep): BizSetupStep | null {
    const idx = STEP_ORDER.indexOf(currentStep);
    if (idx < 0 || idx >= STEP_ORDER.length - 1) return null;
    return STEP_ORDER[idx + 1];
}

/**
 * Get active business setup session for user
 */
export async function getActiveSession(
    userId: string
): Promise<{ id: string; data: BizSetupSession } | null> {
    const db = getDb();
    const query = await db
        .collection(`users/${userId}/drafts`)
        .where('stage', '==', 'BIZ_SETUP')
        .limit(1)
        .get();

    if (query.empty) return null;

    const doc = query.docs[0];
    const data = doc.data() as BizSetupSession;

    // Check if expired
    if (data.expiresAt && data.expiresAt.toDate() < new Date()) {
        await doc.ref.delete();
        return null;
    }

    return { id: doc.id, data };
}

/**
 * Create new business setup session
 */
export async function createSession(userId: string): Promise<string> {
    const db = getDb();

    // Delete any existing sessions first
    const existing = await getActiveSession(userId);
    if (existing) {
        await db.doc(`users/${userId}/drafts/${existing.id}`).delete();
    }

    const ref = await db.collection(`users/${userId}/drafts`).add({
        stage: 'BIZ_SETUP',
        step: 'ASK_NAME',
        payload: {},
        expiresAt: admin.firestore.Timestamp.fromDate(
            new Date(Date.now() + 1000 * 60 * DRAFT_EXPIRE_MINUTES)
        ),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return ref.id;
}

/**
 * Update session step and payload
 */
export async function updateSession(
    userId: string,
    sessionId: string,
    step: BizSetupStep,
    payload: Partial<BusinessData>
): Promise<void> {
    const db = getDb();
    await db.doc(`users/${userId}/drafts/${sessionId}`).update({
        step,
        payload,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
}

/**
 * Delete session
 */
export async function deleteSession(
    userId: string,
    sessionId: string
): Promise<void> {
    const db = getDb();
    await db.doc(`users/${userId}/drafts/${sessionId}`).delete();
}

/**
 * Parse VAT input
 */
function parseVatInput(
    text: string
): { enabled: boolean; rate?: number } | null {
    const lower = text.toLowerCase().trim();

    // No VAT
    if (['ไม่มี', 'no', 'ไม่', '0', 'false'].includes(lower)) {
        return { enabled: false };
    }

    // Yes VAT
    if (['มี', 'yes', 'ใช่', 'true'].includes(lower)) {
        return { enabled: true, rate: 7 };
    }

    // VAT with rate: "vat 7", "7%", "มี 7%"
    const rateMatch = text.match(/(\d+(\.\d+)?)\s*%?/);
    if (rateMatch) {
        const rate = Number(rateMatch[1]);
        if (rate > 0 && rate <= 100) {
            return { enabled: true, rate };
        }
    }

    return null;
}

/**
 * Parse WHT input (same logic as VAT)
 */
function parseWhtInput(
    text: string
): { enabled: boolean; rate?: number } | null {
    const lower = text.toLowerCase().trim();

    if (['ไม่มี', 'no', 'ไม่', '0', 'false', 'ไม่หัก'].includes(lower)) {
        return { enabled: false };
    }

    if (['มี', 'yes', 'ใช่', 'true', 'หัก'].includes(lower)) {
        return { enabled: true, rate: 3 };
    }

    const rateMatch = text.match(/(\d+(\.\d+)?)\s*%?/);
    if (rateMatch) {
        const rate = Number(rateMatch[1]);
        if (rate > 0 && rate <= 100) {
            return { enabled: true, rate };
        }
    }

    return null;
}

/**
 * Parse bank info from single line
 * Format: "ธนาคาร เลขบัญชี ชื่อบัญชี"
 */
function parseBankInput(
    text: string
): { bankName: string; bankAccountNo: string; bankAccountName: string } | null {
    const parts = text.trim().split(/\s+/);

    if (parts.length < 3) {
        // Try to extract account number (numeric part)
        const numMatch = text.match(/(\d[\d-]+\d)/);
        if (numMatch) {
            const accountNo = numMatch[1].replace(/-/g, '');
            const rest = text.replace(numMatch[0], '').trim();
            const restParts = rest.split(/\s+/).filter(Boolean);

            if (restParts.length >= 1) {
                return {
                    bankName: restParts[0] || '',
                    bankAccountNo: accountNo,
                    bankAccountName: restParts.slice(1).join(' ') || '',
                };
            }
        }
        return null;
    }

    // Assume format: bank number name...
    return {
        bankName: parts[0],
        bankAccountNo: parts[1].replace(/-/g, ''),
        bankAccountName: parts.slice(2).join(' '),
    };
}

/**
 * Build confirmation summary message
 */
export function buildConfirmMessage(payload: Partial<BusinessData>): string {
    const lines = [
        `✅ สรุปข้อมูลธุรกิจ`,
        ``,
        `🏢 ชื่อ: ${payload.name || '-'}`,
        `📍 ที่อยู่: ${payload.address || '-'}`,
        `📋 เลขผู้เสียภาษี: ${payload.taxId || '-'}`,
        `📞 โทร: ${payload.phone || '-'}`,
        `📧 อีเมล: ${payload.email || '-'}`,
        ``,
    ];

    // VAT/WHT
    if (payload.defaultVatEnabled) {
        lines.push(`💰 VAT: ${payload.defaultVatRate || 7}%`);
    } else {
        lines.push(`💰 VAT: ไม่มี`);
    }

    if (payload.defaultWhtEnabled) {
        lines.push(`🧾 หัก ณ ที่จ่าย: ${payload.defaultWhtRate || 3}%`);
    } else {
        lines.push(`🧾 หัก ณ ที่จ่าย: ไม่หัก`);
    }

    // Bank
    if (payload.bankName || payload.bankAccountNo) {
        lines.push(``);
        lines.push(`🏦 ธนาคาร: ${payload.bankName || '-'}`);
        lines.push(`   เลขบัญชี: ${payload.bankAccountNo || '-'}`);
        lines.push(`   ชื่อบัญชี: ${payload.bankAccountName || '-'}`);
    }

    lines.push(``);
    lines.push(`พิมพ์ "ยืนยัน" เพื่อบันทึก หรือ "ยกเลิก" เพื่อยกเลิก`);

    return lines.join('\n');
}

/**
 * Get message for current step
 */
export function getStepMessage(step: BizSetupStep, payload?: Partial<BusinessData>): string {
    if (step === 'CONFIRM' && payload) {
        return buildConfirmMessage(payload);
    }
    return STEP_MESSAGES[step] || '';
}

/**
 * Process user input for current step
 * Returns: { nextStep, updatedPayload, message, done, cancelled }
 */
export interface ProcessResult {
    nextStep: BizSetupStep | null;
    updatedPayload: Partial<BusinessData>;
    message: string;
    done: boolean;
    cancelled: boolean;
    error?: string;
}

export function processStepInput(
    step: BizSetupStep,
    input: string,
    currentPayload: Partial<BusinessData>
): ProcessResult {
    const text = input.trim();
    const payload = { ...currentPayload };

    // Handle cancel
    if (isCancelCommand(text)) {
        return {
            nextStep: null,
            updatedPayload: payload,
            message: 'ติ๊ดๆ ยกเลิกการตั้งค่าธุรกิจแล้วครับเจ้านาย',
            done: false,
            cancelled: true,
        };
    }

    // Handle confirm at CONFIRM step
    if (step === 'CONFIRM') {
        const lower = text.toLowerCase();
        if (['ยืนยัน', 'confirm', 'ok', 'ตกลง', 'บันทึก', 'save'].includes(lower)) {
            if (!payload.name) {
                return {
                    nextStep: 'ASK_NAME',
                    updatedPayload: payload,
                    message: 'โอ๊ะ! ยังไม่มีชื่อธุรกิจนะ\n\n' + STEP_MESSAGES.ASK_NAME,
                    done: false,
                    cancelled: false,
                };
            }
            return {
                nextStep: null,
                updatedPayload: payload,
                message: '', // Will be set by caller after save
                done: true,
                cancelled: false,
            };
        }

        // Any other input at confirm → show confirm message again
        return {
            nextStep: 'CONFIRM',
            updatedPayload: payload,
            message: 'โอ๊ะ! ถ้าพร้อมแล้วพิมพ์ "ยืนยัน" ได้เลยนะครับเจ้านาย',
            done: false,
            cancelled: false,
        };
    }

    // Handle skip for optional steps
    if (isSkipCommand(text) && step !== 'ASK_NAME') {
        const nextStep = getNextStep(step);
        if (nextStep) {
            return {
                nextStep,
                updatedPayload: payload,
                message: getStepMessage(nextStep, payload),
                done: false,
                cancelled: false,
            };
        }
    }

    // Process each step
    switch (step) {
        case 'ASK_NAME': {
            if (!text || text.length < 2) {
                return {
                    nextStep: step,
                    updatedPayload: payload,
                    message: 'โอ๊ะ! ชื่อธุรกิจสั้นไปนิดนะครับ (อย่างน้อย 2 ตัวอักษร)',
                    done: false,
                    cancelled: false,
                    error: 'INVALID_NAME',
                };
            }
            payload.name = text;
            const nextStep = getNextStep(step)!;
            return {
                nextStep,
                updatedPayload: payload,
                message: getStepMessage(nextStep, payload),
                done: false,
                cancelled: false,
            };
        }

        case 'ASK_ADDRESS': {
            payload.address = text;
            const nextStep = getNextStep(step)!;
            return {
                nextStep,
                updatedPayload: payload,
                message: getStepMessage(nextStep, payload),
                done: false,
                cancelled: false,
            };
        }

        case 'ASK_TAX_ID': {
            // Validate tax ID (should be 13 digits)
            const cleaned = text.replace(/\D/g, '');
            if (cleaned && cleaned.length !== 13) {
                return {
                    nextStep: step,
                    updatedPayload: payload,
                    message: 'โอ๊ะ! เลขผู้เสียภาษีต้องมี 13 หลักนะครับ\nลองส่งใหม่ หรือพิมพ์ "ข้าม" ได้เลย',
                    done: false,
                    cancelled: false,
                    error: 'INVALID_TAX_ID',
                };
            }
            payload.taxId = cleaned || undefined;
            const nextStep = getNextStep(step)!;
            return {
                nextStep,
                updatedPayload: payload,
                message: getStepMessage(nextStep, payload),
                done: false,
                cancelled: false,
            };
        }

        case 'ASK_PHONE': {
            payload.phone = text;
            const nextStep = getNextStep(step)!;
            return {
                nextStep,
                updatedPayload: payload,
                message: getStepMessage(nextStep, payload),
                done: false,
                cancelled: false,
            };
        }

        case 'ASK_EMAIL': {
            // Basic email validation
            if (text && !text.includes('@')) {
                return {
                    nextStep: step,
                    updatedPayload: payload,
                    message: 'โอ๊ะ! รูปแบบอีเมลยังไม่ถูกต้องนะครับ\nลองส่งใหม่ หรือพิมพ์ "ข้าม" ได้เลย',
                    done: false,
                    cancelled: false,
                    error: 'INVALID_EMAIL',
                };
            }
            payload.email = text || undefined;
            const nextStep = getNextStep(step)!;
            return {
                nextStep,
                updatedPayload: payload,
                message: getStepMessage(nextStep, payload),
                done: false,
                cancelled: false,
            };
        }

        case 'ASK_VAT': {
            const vatResult = parseVatInput(text);
            if (vatResult) {
                payload.defaultVatEnabled = vatResult.enabled;
                if (vatResult.rate) {
                    payload.defaultVatRate = vatResult.rate;
                }
            }
            const nextStep = getNextStep(step)!;
            return {
                nextStep,
                updatedPayload: payload,
                message: getStepMessage(nextStep, payload),
                done: false,
                cancelled: false,
            };
        }

        case 'ASK_WHT': {
            const whtResult = parseWhtInput(text);
            if (whtResult) {
                payload.defaultWhtEnabled = whtResult.enabled;
                if (whtResult.rate) {
                    payload.defaultWhtRate = whtResult.rate;
                }
            }
            const nextStep = getNextStep(step)!;
            return {
                nextStep,
                updatedPayload: payload,
                message: getStepMessage(nextStep, payload),
                done: false,
                cancelled: false,
            };
        }

        case 'ASK_BANK': {
            const bankResult = parseBankInput(text);
            if (bankResult) {
                payload.bankName = bankResult.bankName;
                payload.bankAccountNo = bankResult.bankAccountNo;
                payload.bankAccountName = bankResult.bankAccountName;
            }
            const nextStep = getNextStep(step)!;
            return {
                nextStep,
                updatedPayload: payload,
                message: getStepMessage(nextStep, payload),
                done: false,
                cancelled: false,
            };
        }

        default:
            return {
                nextStep: null,
                updatedPayload: payload,
                message: 'โอ๊ะ! มีบางอย่างสะดุดครับ ลองเริ่มใหม่ได้เลยนะเจ้านาย',
                done: false,
                cancelled: true,
            };
    }
}

/**
 * Handle business setup wizard
 * Main entry point for the wizard flow
 */
export async function handleBusinessSetup(
    userId: string,
    text: string
): Promise<{ message: string; done: boolean }> {
    // Check for existing session
    let session = await getActiveSession(userId);

    // If starting new setup
    if (isBusinessSetupCommand(text)) {
        await createSession(userId);
        session = await getActiveSession(userId);

        if (!session) {
            return {
                message: 'โอ๊ะ! เริ่มตั้งค่าไม่สำเร็จตอนนี้ครับ ลองใหม่ได้เลยนะเจ้านาย',
                done: true,
            };
        }

        return {
            message: getStepMessage('ASK_NAME'),
            done: false,
        };
    }

    // If no active session
    if (!session) {
        return {
            message: '',
            done: true, // Not in wizard, let webhook handle normally
        };
    }

    // Process input for current step
    const result = processStepInput(session.data.step, text, session.data.payload);

    // If cancelled
    if (result.cancelled) {
        await deleteSession(userId, session.id);
        return {
            message: result.message,
            done: true,
        };
    }

    // If done (confirmed)
    if (result.done) {
        // Create business
        try {
            await createBusiness(userId, result.updatedPayload as BusinessData);
            await deleteSession(userId, session.id);

            return {
                message: `ตึ๊ง! บันทึกข้อมูลธุรกิจเรียบร้อยแล้วครับเจ้านาย

🏢 ${result.updatedPayload.name}`,
                done: true,
            };
        } catch (error) {
            console.error('Failed to create business:', error);
            return {
                message: 'โอ๊ะ! บันทึกข้อมูลไม่สำเร็จตอนนี้ครับ\nลองใหม่ได้เลยนะเจ้านาย',
                done: true,
            };
        }
    }

    // Update session and continue
    if (result.nextStep) {
        await updateSession(userId, session.id, result.nextStep, result.updatedPayload);
    }

    return {
        message: result.message,
        done: false,
    };
}
