import * as admin from 'firebase-admin';
import type { Transaction } from 'firebase-admin/firestore';
import { getDb } from './firebaseAdmin';

/**
 * LINE ↔ Firebase UID mapping service
 * Maintains bidirectional mapping: lineUserId ↔ uid
 * Also stores default businessId for convenience
 */

export interface LineUserMapping {
  lineUserId: string;
  firebaseUid: string; // Link to users/{uid}
  defaultBusinessId: string; // Default business for this user
  lineDisplayName?: string;
  linkedAt: admin.firestore.Timestamp;
  lastActiveAt: admin.firestore.Timestamp;
}

const db = getDb();
const LINE_USERS_COLLECTION = 'lineUsers';
const USERS_COLLECTION = 'users';
const MAPPING_CACHE_TTL_MS = 30 * 1000; // 30s cache to reduce reads
const LAST_ACTIVE_UPDATE_TTL_MS = 60 * 1000; // throttle lastActiveAt writes
const mappingCache = new Map<string, { mapping: LineUserMapping; expiresAt: number }>();
const lastActiveUpdate = new Map<string, number>();

const getCachedMapping = (lineUserId: string): LineUserMapping | null => {
  const entry = mappingCache.get(lineUserId);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    mappingCache.delete(lineUserId);
    return null;
  }
  return entry.mapping;
};

const setCachedMapping = (lineUserId: string, mapping: LineUserMapping): void => {
  mappingCache.set(lineUserId, { mapping, expiresAt: Date.now() + MAPPING_CACHE_TTL_MS });
};

const clearCachedMapping = (lineUserId: string): void => {
  mappingCache.delete(lineUserId);
  lastActiveUpdate.delete(lineUserId);
};

const scheduleLastActiveUpdate = (lineUserId: string): void => {
  const now = Date.now();
  const last = lastActiveUpdate.get(lineUserId) || 0;
  if (now - last < LAST_ACTIVE_UPDATE_TTL_MS) return;
  lastActiveUpdate.set(lineUserId, now);

  void db
    .collection(LINE_USERS_COLLECTION)
    .doc(lineUserId)
    .update({ lastActiveAt: admin.firestore.Timestamp.now() })
    .catch((err) => {
      console.warn('[lineUserMapping] Failed to update lastActiveAt:', err);
    });
};

/**
 * Link or update LINE user mapping
 * Creates/updates both directions:
 * - lineUsers/{lineUserId} → {firebaseUid, defaultBusinessId, ...}
 * - users/{firebaseUid} → {lineUserId}
 */
export async function linkLineUser(
  lineUserId: string,
  firebaseUid: string,
  defaultBusinessId: string,
  lineDisplayName?: string
): Promise<LineUserMapping> {
  const db_instance = db;

  const mapping: LineUserMapping = {
    lineUserId,
    firebaseUid,
    defaultBusinessId,
    lineDisplayName,
    linkedAt: admin.firestore.Timestamp.now(),
    lastActiveAt: admin.firestore.Timestamp.now(),
  };

  // Atomic: update both directions in transaction
  await db_instance.runTransaction(async (transaction: Transaction) => {
    // 1. Update lineUsers/{lineUserId} → firebaseUid
    const lineUserRef = db_instance.collection(LINE_USERS_COLLECTION).doc(lineUserId);
    transaction.set(lineUserRef, mapping, { merge: true });

    // 2. Update users/{firebaseUid} → lineUserId
    const userRef = db_instance.collection(USERS_COLLECTION).doc(firebaseUid);
    transaction.update(userRef, {
      lineUserId,
      lineUserId_linkedAt: admin.firestore.Timestamp.now(),
    });
  });

  console.log(`[lineUserMapping] Linked ${lineUserId} ↔ ${firebaseUid}`);
  setCachedMapping(lineUserId, mapping);
  return mapping;
}

/**
 * Get Firebase UID from LINE user ID
 * Throws error if not linked
 */
export async function getFirebaseUidFromLineUserId(lineUserId: string): Promise<string> {
  const db_instance = db;
  const cached = getCachedMapping(lineUserId);
  if (cached) {
    scheduleLastActiveUpdate(lineUserId);
    return cached.firebaseUid;
  }

  const snap = await db_instance.collection(LINE_USERS_COLLECTION).doc(lineUserId).get();

  if (!snap.exists) {
    throw new Error(
      `[lineUserMapping] No Firebase UID found for LINE user ${lineUserId}. ` +
      `User must be linked first (via LINE login with OAuth).`
    );
  }

  const mapping = snap.data() as LineUserMapping;

  setCachedMapping(lineUserId, mapping);
  scheduleLastActiveUpdate(lineUserId);

  return mapping.firebaseUid;
}

/**
 * Get LINE user ID from Firebase UID
 * Returns null if not linked
 */
export async function getLineUserIdFromFirebaseUid(firebaseUid: string): Promise<string | null> {
  const db_instance = db;
  const snap = await db_instance.collection(USERS_COLLECTION).doc(firebaseUid).get();

  if (!snap.exists) {
    return null;
  }

  const userData = snap.data() as { lineUserId?: string };
  return userData?.lineUserId || null;
}

/**
 * Get LINE user mapping (full record)
 * Throws error if not found
 */
export async function getLineUserMapping(lineUserId: string): Promise<LineUserMapping> {
  const db_instance = db;
  const cached = getCachedMapping(lineUserId);
  if (cached) {
    scheduleLastActiveUpdate(lineUserId);
    return cached;
  }

  const snap = await db_instance.collection(LINE_USERS_COLLECTION).doc(lineUserId).get();

  if (!snap.exists) {
    throw new Error(`[lineUserMapping] No mapping found for LINE user ${lineUserId}`);
  }

  const mapping = snap.data() as LineUserMapping;
  setCachedMapping(lineUserId, mapping);
  scheduleLastActiveUpdate(lineUserId);
  return mapping;
}

/**
 * Get default business ID for LINE user
 * Returns businessId or throws error if not linked
 */
export async function getDefaultBusinessId(lineUserId: string): Promise<string> {
  const mapping = await getLineUserMapping(lineUserId);
  return mapping.defaultBusinessId;
}

/**
 * Update default business ID for LINE user
 */
export async function setDefaultBusinessId(lineUserId: string, businessId: string): Promise<void> {
  const db_instance = db;
  await db_instance
    .collection(LINE_USERS_COLLECTION)
    .doc(lineUserId)
    .update({ defaultBusinessId: businessId, lastActiveAt: admin.firestore.Timestamp.now() });

  const cached = getCachedMapping(lineUserId);
  if (cached) {
    setCachedMapping(lineUserId, {
      ...cached,
      defaultBusinessId: businessId,
      lastActiveAt: admin.firestore.Timestamp.now(),
    });
  }

  console.log(`[lineUserMapping] Updated default business for ${lineUserId}: ${businessId}`);
}

/**
 * Unlink LINE user (cleanup)
 */
export async function unlinkLineUser(lineUserId: string): Promise<void> {
  const db_instance = db;
  const mapping = await getLineUserMapping(lineUserId);

  await db_instance.runTransaction(async (transaction: Transaction) => {
    // 1. Delete lineUsers/{lineUserId}
    transaction.delete(db_instance.collection(LINE_USERS_COLLECTION).doc(lineUserId));

    // 2. Remove lineUserId from users/{uid}
    transaction.update(
      db_instance.collection(USERS_COLLECTION).doc(mapping.firebaseUid),
      { lineUserId: admin.firestore.FieldValue.delete() }
    );
  });

  console.log(`[lineUserMapping] Unlinked ${lineUserId}`);
  clearCachedMapping(lineUserId);
}
