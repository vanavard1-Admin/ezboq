import { getDb } from './firebaseAdmin';
/**
 * Business Management Module
 * Create, update, and manage business profiles
 */

import { firestore } from 'firebase-admin';

export interface PaymentMethods {
    banks?: string[];
    cards?: string[];
    wallets?: string[];
}

export interface BusinessData {
    name: string;
    address?: string;
    phone?: string;
    email?: string;
    taxId?: string;
    defaultVatEnabled?: boolean;
    defaultVatRate?: number;
    defaultVatType?: 'inclusive' | 'exclusive';
    defaultWhtEnabled?: boolean;
    defaultWhtRate?: number;
    bankName?: string;
    bankCode?: string;
    bankAccountNo?: string;
    bankAccountName?: string;
    promptpayAccount?: string;
    promptpayName?: string;
    promptpayQrUrl?: string;
    paymentMethods?: PaymentMethods;
    emailNotifications?: boolean;
    lineNotifications?: boolean;
    language?: 'th' | 'en';
}

/**
 * Create a new business for a user
 */
export async function createBusiness(
    userId: string,
    data: BusinessData
): Promise<string> {
    const db = getDb();

    const ref = await db.collection(`users/${userId}/businesses`).add({
        name: data.name,
        address: data.address || '',
        phone: data.phone || '',
        email: data.email || '',
        taxId: data.taxId || '',
        defaultVatEnabled: data.defaultVatEnabled ?? false,
        defaultVatRate: data.defaultVatRate ?? 7,
        defaultVatType: data.defaultVatType ?? 'exclusive',
        defaultWhtEnabled: data.defaultWhtEnabled ?? false,
        defaultWhtRate: data.defaultWhtRate ?? 3,
        bankName: data.bankName || '',
        bankCode: data.bankCode || '',
        bankAccountNo: data.bankAccountNo || '',
        bankAccountName: data.bankAccountName || '',
        promptpayAccount: data.promptpayAccount || '',
        promptpayName: data.promptpayName || '',
        promptpayQrUrl: data.promptpayQrUrl || null,
        emailNotifications: data.emailNotifications ?? false,
        lineNotifications: data.lineNotifications ?? true,
        language: data.language === 'en' ? 'en' : 'th',
        createdAt: firestore.FieldValue.serverTimestamp(),
        updatedAt: firestore.FieldValue.serverTimestamp(),
    });

    // Set as active business
    await db.doc(`users/${userId}`).update({
        activeBusinessId: ref.id,
        updatedAt: firestore.FieldValue.serverTimestamp(),
    });

    return ref.id;
}

/**
 * Update existing business data
 */
export async function updateBusiness(
    userId: string,
    businessId: string,
    data: Partial<BusinessData>
): Promise<void> {
    const db = getDb();

    await db.doc(`users/${userId}/businesses/${businessId}`).update({
        ...data,
        updatedAt: firestore.FieldValue.serverTimestamp(),
    });
}

/**
 * Get business data by ID
 */
export async function getBusiness(
    userId: string,
    businessId: string
): Promise<BusinessData | null> {
    const db = getDb();
    const snap = await db
        .doc(`users/${userId}/businesses/${businessId}`)
        .get();

    if (!snap.exists) return null;
    return snap.data() as BusinessData;
}

/**
 * Set active business for user
 */
export async function setActiveBusiness(
    userId: string,
    businessId: string
): Promise<void> {
    const db = getDb();
    await db.doc(`users/${userId}`).update({
        activeBusinessId: businessId,
        updatedAt: firestore.FieldValue.serverTimestamp(),
    });
}

/**
 * Parse business setup message
 * Format:
 * ตั้งค่าธุรกิจ
 * ชื่อ: บริษัท ABC
 * ที่อยู่: 123 ถ.สุขุมวิท
 * โทร: 02-123-4567
 */
export function parseBusinessSetup(text: string): Partial<BusinessData> | null {
    const lines = text.split('\n').map((l) => l.trim());
    const data: Partial<BusinessData> = {};

    for (const line of lines) {
        const kv = line.split(':');
        if (kv.length < 2) continue;

        const key = kv[0].trim().toLowerCase();
        const value = kv.slice(1).join(':').trim();

        if (['ชื่อ', 'ชื่อธุรกิจ', 'name', 'business'].includes(key)) {
            data.name = value;
        } else if (['ที่อยู่', 'address'].includes(key)) {
            data.address = value;
        } else if (['โทร', 'โทรศัพท์', 'phone', 'tel'].includes(key)) {
            data.phone = value;
        } else if (['อีเมล', 'email'].includes(key)) {
            data.email = value;
        } else if (
            ['เลขประจำตัวผู้เสียภาษี', 'tax', 'taxid', 'เลขที่'].includes(key)
        ) {
            data.taxId = value;
        } else if (['ธนาคาร', 'bank'].includes(key)) {
            data.bankName = value;
        } else if (['เลขบัญชี', 'account'].includes(key)) {
            data.bankAccountNo = value;
        } else if (['ชื่อบัญชี', 'account name'].includes(key)) {
            data.bankAccountName = value;
        }
    }

    // Require at least name
    if (!data.name) return null;
    return data;
}
