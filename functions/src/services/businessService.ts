import { getDb } from '../core/firebaseAdmin';
/**
 * EzDoc - Business Service
 * 
 * Handles business profile management and setup checklist.
 */


const db = getDb();

const LIST_CACHE_TTL_MS = 15000;
const CHECKLIST_CACHE_TTL_MS = 15000;
const listCache = new Map<string, { expiresAt: number; value: BusinessSummary[] }>();
const checklistCache = new Map<string, { expiresAt: number; value: BusinessChecklist }>();

const getListCacheKey = (userId: string, limit: number): string => `${userId}:${limit}`;
const getChecklistCacheKey = (userId: string, businessId: string): string => `${userId}:${businessId}`;

const getCachedList = (key: string): BusinessSummary[] | null => {
  const entry = listCache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    listCache.delete(key);
    return null;
  }
  return entry.value;
};

const setCachedList = (key: string, value: BusinessSummary[]): void => {
  listCache.set(key, { value, expiresAt: Date.now() + LIST_CACHE_TTL_MS });
};

const getCachedChecklist = (key: string): BusinessChecklist | null => {
  const entry = checklistCache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    checklistCache.delete(key);
    return null;
  }
  return entry.value;
};

const setCachedChecklist = (key: string, value: BusinessChecklist): void => {
  checklistCache.set(key, { value, expiresAt: Date.now() + CHECKLIST_CACHE_TTL_MS });
};

export interface BusinessChecklistItem {
  field: string;
  label: string;
  value: string | null;
  completed: boolean;
}

export interface BusinessChecklist {
  items: BusinessChecklistItem[];
  completedCount: number;
  totalCount: number;
  percentComplete: number;
}

export interface BusinessSummary {
  id: string;
  name: string;
}

export async function listRecentBusinesses(
  userId: string,
  limit: number = 3
): Promise<BusinessSummary[]> {
  return listBusinesses(userId, limit);
}

export async function listBusinesses(
  userId: string,
  limit: number = 8
): Promise<BusinessSummary[]> {
  const cacheKey = getListCacheKey(userId, limit);
  const cached = getCachedList(cacheKey);
  if (cached) return cached;

  try {
    const snap = await db
      .collection(`users/${userId}/businesses`)
      .orderBy('updatedAt', 'desc')
      .limit(limit)
      .get();

    if (snap.empty) return [];
    const businesses = snap.docs.map((doc) => ({
      id: doc.id,
      name: String(doc.data().name || 'ธุรกิจ'),
    }));
    setCachedList(cacheKey, businesses);
    return businesses;
  } catch (error) {
    console.warn('[businessService] listBusinesses failed, fallback to createdAt', error);
    const snap = await db
      .collection(`users/${userId}/businesses`)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();
    const businesses = snap.docs.map((doc) => ({
      id: doc.id,
      name: String(doc.data().name || 'ธุรกิจ'),
    }));
    setCachedList(cacheKey, businesses);
    return businesses;
  }
}

export function formatRecentBusinessList(businesses: BusinessSummary[]): string {
  if (businesses.length === 0) {
    return 'โอ๊ะ! ยังไม่พบบันทึกธุรกิจในระบบครับเจ้านาย';
  }

  const lines = businesses.map((b, idx) => `${idx + 1}) ${b.name}`);
  return [
    '⭐ ธุรกิจล่าสุดครับเจ้านาย',
    '',
    ...lines,
  ].join('\n');
}

export function formatBusinessList(businesses: BusinessSummary[]): string {
  if (businesses.length === 0) {
    return 'โอ๊ะ! ยังไม่พบบันทึกธุรกิจในระบบครับเจ้านาย';
  }

  const lines = businesses.map((b, idx) => `${idx + 1}) ${b.name}`);
  return [
    '📋 รายการธุรกิจที่พบครับเจ้านาย',
    '',
    ...lines,
  ].join('\n');
}

/**
 * Get business setup checklist
 */
export async function getBusinessChecklist(
  userId: string,
  businessId: string
): Promise<BusinessChecklist> {
  const cacheKey = getChecklistCacheKey(userId, businessId);
  const cached = getCachedChecklist(cacheKey);
  if (cached) return cached;

  // Load business profile
  const bizDoc = await db
    .collection('users')
    .doc(userId)
    .collection('businesses')
    .doc(businessId)
    .get();

  const bizData = bizDoc.exists ? bizDoc.data() : {};

  // Load payment settings
  let paymentData: Record<string, unknown> = {};
  try {
    const paymentDoc = await db
      .doc(`users/${userId}/businesses/${businessId}/settings/payment`)
      .get();
    if (paymentDoc.exists) {
      paymentData = paymentDoc.data() || {};
    }
  } catch {
    // Ignore
  }

  // Define checklist items
  const items: BusinessChecklistItem[] = [
    {
      field: 'name',
      label: 'ชื่อธุรกิจ',
      value: bizData?.name || bizData?.business_name || null,
      completed: !!(bizData?.name || bizData?.business_name),
    },
    {
      field: 'address',
      label: 'ที่อยู่',
      value: bizData?.address || null,
      completed: !!bizData?.address,
    },
    {
      field: 'tax_id',
      label: 'เลขผู้เสียภาษี',
      value: bizData?.tax_id || null,
      completed: !!bizData?.tax_id,
    },
    {
      field: 'phone',
      label: 'โทร',
      value: bizData?.phone || null,
      completed: !!bizData?.phone,
    },
    {
      field: 'email',
      label: 'อีเมล',
      value: bizData?.email || null,
      completed: !!bizData?.email,
    },
    {
      field: 'bank_account',
      label: 'บัญชีธนาคาร',
      value: paymentData?.bank_account ? `${paymentData.bank_code} ${paymentData.bank_account}` : null,
      completed: !!paymentData?.bank_account,
    },
    {
      field: 'promptpay_account',
      label: 'พร้อมเพย์',
      value: paymentData?.promptpay_account || null,
      completed: !!paymentData?.promptpay_account,
    },
    {
      field: 'logo_url',
      label: 'โลโก้',
      value: bizData?.logo_url || null,
      completed: !!bizData?.logo_url,
    },
    {
      field: 'signature_url',
      label: 'ลายเซ็น',
      value: bizData?.signature_url || null,
      completed: !!bizData?.signature_url,
    },
    {
      field: 'stamp_url',
      label: 'ตราประทับ',
      value: bizData?.stamp_url || null,
      completed: !!bizData?.stamp_url,
    },
  ];

  const completedCount = items.filter(item => item.completed).length;

  const checklist: BusinessChecklist = {
    items,
    completedCount,
    totalCount: items.length,
    percentComplete: Math.round((completedCount / items.length) * 100),
  };
  setCachedChecklist(cacheKey, checklist);
  return checklist;
}

/**
 * Format business checklist for LINE message
 */
export function formatBusinessChecklist(checklist: BusinessChecklist): string {
  const { items, completedCount, totalCount, percentComplete } = checklist;

  let response = `📋 ตั้งค่าธุรกิจ\n\n`;
  response += `สถานะ: ${completedCount}/${totalCount} (${percentComplete}%)\n\n`;

  for (const item of items) {
    const icon = item.completed ? '✅' : '❌';
    const value = item.value ? ` - ${truncate(item.value, 20)}` : '';
    response += `${icon} ${item.label}${value}\n`;
  }

  response += `\n━━━━━━━━━━━━━━━━━━━━\n`;
  response += `📝 วิธีตั้งค่า:\n\n`;

  // Show instructions for missing items
  const missing = items.filter(i => !i.completed);
  if (missing.length > 0) {
    const first3 = missing.slice(0, 3);
    for (const item of first3) {
      response += getFieldInstruction(item.field);
    }
  } else {
    response += `✅ ข้อมูลครบถ้วนแล้ว!`;
  }

  return response;
}

/**
 * Get instruction for a specific field
 */
function getFieldInstruction(field: string): string {
  const instructions: Record<string, string> = {
    name: 'ส่ง ชื่อธุรกิจ [ชื่อ]\n',
    address: 'ส่ง ที่อยู่ [ที่อยู่]\n',
    tax_id: 'ส่ง เลขผู้เสียภาษี [เลข]\n',
    phone: 'ส่ง โทร [เบอร์]\n',
    email: 'ส่ง อีเมล [email]\n',
    bank_account: 'ส่ง ตั้งค่าธนาคาร [รหัส] [เลข] [ชื่อ]\n',
    promptpay_account: 'ส่ง ตั้งค่าพร้อมเพย์ [เลข]\n',
    logo_url: 'ส่งรูป แล้วพิมพ์ โลโก้\n',
    signature_url: 'ส่งรูป แล้วพิมพ์ ลายเซ็น\n',
    stamp_url: 'ส่งรูป แล้วพิมพ์ ตราประทับ\n',
  };

  return instructions[field] || '';
}

/**
 * Get missing fields warning for document issuance
 * Returns simple message (guided resolution with buttons is in BUSINESS_SETUP intent)
 */
export async function getMissingFieldsInfo(
  userId: string,
  businessId: string
): Promise<{ warning: string | null; missingFields: string[] }> {
  const checklist = await getBusinessChecklist(userId, businessId);

  // Critical fields that should show warning
  const criticalFields = ['name', 'address', 'phone'];
  const missingCritical = checklist.items
    .filter(item => criticalFields.includes(item.field) && !item.completed);

  if (missingCritical.length === 0) {
    return { warning: null, missingFields: [] };
  }

  const missingLabels = missingCritical.map(item => item.label);
  const missingFields = missingCritical.map(item =>
    item.field === 'name' ? 'business_name' : item.field
  );

  return {
    warning:
      `โอ๊ะ! ข้อมูลธุรกิจยังไม่ครบครับเจ้านาย (${missingLabels.length} รายการ)\n\n` +
      `ข้อมูลที่ขาดจะไม่ปรากฏใน PDF นะครับ`,
    missingFields,
  };
}

export async function getMissingFieldsWarning(
  userId: string,
  businessId: string
): Promise<string | null> {
  const info = await getMissingFieldsInfo(userId, businessId);
  return info.warning;
}

/**
 * Truncate string with ellipsis
 */
function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.substring(0, maxLen - 3) + '...';
}
