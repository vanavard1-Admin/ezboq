import { getDb } from './firebaseAdmin';
/**
 * LINE Account Linking Service
 * Manages bidirectional mapping between LINE userId and Firebase UID
 * Generates and verifies cryptographically signed state for OAuth flow
 */

import * as crypto from 'crypto';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

/**
 * Firestore schema for line_links/{lineUserId}
 */
export interface LineLink {
  lineUserId: string;
  uid: string; // Firebase UID
  businessId: string; // Default business for this user
  linkedAt: Timestamp;
  provider: 'line-login' | 'line_liff' | 'guest';
  status: 'ACTIVE' | 'REVOKED';
  isGuest?: boolean;
  trialQuota?: number;
  trialUsed?: number;
}

export interface StarterQuotaStatus {
  quota: number;
  used: number;
  remaining: number;
}

/**
 * State payload structure for OAuth flow
 */
export interface LinkState {
  lineUserId: string;
  nonce: string;
  iat: number; // Issued at (seconds)
  exp: number; // Expires at (seconds)
  sig: string; // HMAC-SHA256 signature
}

const STATE_EXPIRE_SECONDS = 600; // 10 minutes
const NONCE_STORE_MINUTES = 15; // Store used nonces for 15 minutes
const LINK_CACHE_TTL_MS = 30 * 1000; // 30s cache to cut hot-path reads
export const STARTER_FREE_DOC_QUOTA = 10;
const linkCache = new Map<string, { link: LineLink; expiresAt: number }>();

const getCachedLink = (lineUserId: string): LineLink | null => {
  const entry = linkCache.get(lineUserId);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    linkCache.delete(lineUserId);
    return null;
  }
  return entry.link;
};

const setCachedLink = (lineUserId: string, link: LineLink): void => {
  linkCache.set(lineUserId, { link, expiresAt: Date.now() + LINK_CACHE_TTL_MS });
};

const clearCachedLink = (lineUserId: string): void => {
  linkCache.delete(lineUserId);
};

function normalizeStarterQuota(rawQuota: unknown): number {
  const parsed = Number(rawQuota);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return STARTER_FREE_DOC_QUOTA;
  }
  return Math.max(parsed, STARTER_FREE_DOC_QUOTA);
}

function normalizeStarterUsed(rawUsed: unknown): number {
  const parsed = Number(rawUsed);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }
  return Math.max(0, Math.floor(parsed));
}

export function buildStarterQuotaStatus(rawQuota: unknown, rawUsed: unknown): StarterQuotaStatus {
  const quota = normalizeStarterQuota(rawQuota);
  const used = Math.min(normalizeStarterUsed(rawUsed), quota);
  return {
    quota,
    used,
    remaining: Math.max(0, quota - used),
  };
}

/**
 * Generate a cryptographically signed state for LINE linking
 * Returns: state string (base64 encoded)
 */
export function generateLinkState(lineUserId: string, secret: string): string {
  const nonce = crypto.randomBytes(16).toString('hex');
  const now = Math.floor(Date.now() / 1000);
  const exp = now + STATE_EXPIRE_SECONDS;

  const payload = {
    lineUserId,
    nonce,
    iat: now,
    exp,
  };

  // Create signature from payload (without sig field)
  const payloadStr = JSON.stringify(payload);
  const sig = crypto.createHmac('sha256', secret).update(payloadStr).digest('hex');

  const stateObj: LinkState = {
    ...payload,
    sig,
  };

  return Buffer.from(JSON.stringify(stateObj)).toString('base64');
}

/**
 * Verify a signed state and check expiration
 * Returns: { valid: boolean, payload?: LinkState, error?: string }
 */
export function verifyLinkState(
  stateBase64: string,
  secret: string
): { valid: boolean; payload?: LinkState; error?: string } {
  try {
    const stateStr = Buffer.from(stateBase64, 'base64').toString('utf-8');
    const state: LinkState = JSON.parse(stateStr);

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (now > state.exp) {
      return { valid: false, error: 'State expired' };
    }

    // Verify signature
    const payloadForSig = {
      lineUserId: state.lineUserId,
      nonce: state.nonce,
      iat: state.iat,
      exp: state.exp,
    };
    const payloadStr = JSON.stringify(payloadForSig);
    const expectedSig = crypto.createHmac('sha256', secret).update(payloadStr).digest('hex');

    if (state.sig !== expectedSig) {
      return { valid: false, error: 'Invalid signature' };
    }

    return { valid: true, payload: state };
  } catch (err) {
    return { valid: false, error: `State parsing failed: ${err}` };
  }
}

/**
 * Record a used nonce to prevent replay attacks
 */
export async function recordUsedNonce(nonce: string): Promise<void> {
  const db = getDb();
  const nonceRef = db.collection('_line_link_nonces').doc(nonce);
  const ttl = Math.floor(Date.now() / 1000) + NONCE_STORE_MINUTES * 60;

  await nonceRef.set(
    {
      usedAt: Timestamp.now(),
      expiresAt: Timestamp.fromDate(new Date(ttl * 1000)),
    },
    { merge: true }
  );
}

/**
 * Check if nonce was already used
 */
export async function checkNonceUsed(nonce: string): Promise<boolean> {
  const db = getDb();
  const nonceRef = db.collection('_line_link_nonces').doc(nonce);
  const snap = await nonceRef.get();
  return snap.exists;
}

/**
 * Create or update line_links entry
 */
export async function linkLineUserToFirebase(
  lineUserId: string,
  uid: string,
  businessId: string
): Promise<LineLink> {
  const db = getDb();
  const linkRef = db.collection('line_links').doc(lineUserId);
  const userRef = db.collection('users').doc(uid);

  const link: LineLink = {
    lineUserId,
    uid,
    businessId,
    linkedAt: Timestamp.now(),
    provider: 'line-login',
    status: 'ACTIVE',
  };

  await db.runTransaction(async (tx) => {
    // Primary requirement: always persist to users/{uid}.lineUserId
    tx.set(
      userRef,
      {
        lineUserId,
        lineLinkedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    // Keep existing index doc for reverse lookup/audit
    tx.set(
      linkRef,
      {
        ...link,
        linkedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  });
  setCachedLink(lineUserId, link);
  return link;
}

/**
 * Create or reuse a guest link for free trial (no Google login yet)
 * - Creates a guest user + business if missing
 * - Gives starter free quota before upgrade
 */
export async function getOrCreateGuestLink(lineUserId: string): Promise<LineLink> {
  const existing = await getLineLink(lineUserId);
  if (existing) return existing;

  const db = getDb();
  const guestUid = `guest_${lineUserId}`;
  const userRef = db.collection('users').doc(guestUid);

  const userSnap = await userRef.get();
  let businessId = userSnap.data()?.activeBusinessId as string | undefined;

  if (!userSnap.exists) {
    await userRef.set(
      {
        plan: 'FREE',
        status: 'FREE',
        isGuest: true,
        trialQuota: STARTER_FREE_DOC_QUOTA,
        trialUsed: 0,
        lineUserId,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  }

  if (!businessId) {
    const { createBusiness } = await import('./businesses');
    businessId = await createBusiness(guestUid, { name: 'ทดลองใช้ฟรี' });
  }

  const link: LineLink = {
    lineUserId,
    uid: guestUid,
    businessId,
    linkedAt: Timestamp.now(),
    provider: 'guest',
    status: 'ACTIVE',
    isGuest: true,
    trialQuota: STARTER_FREE_DOC_QUOTA,
    trialUsed: 0,
  };

  await db.collection('line_links').doc(lineUserId).set(
    {
      ...link,
      linkedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  setCachedLink(lineUserId, link);
  return link;
}

/**
 * Get starter free document quota status for a user/LINE pair.
 */
export async function getStarterQuotaStatus(userId: string, lineUserId?: string | null): Promise<StarterQuotaStatus> {
  const db = getDb();
  const userSnap = await db.collection('users').doc(userId).get().catch(() => null);

  if (userSnap?.exists) {
    const data = userSnap.data() || {};
    return buildStarterQuotaStatus(data.trialQuota, data.trialUsed);
  }

  if (lineUserId) {
    const linkSnap = await db.collection('line_links').doc(lineUserId).get().catch(() => null);
    if (linkSnap?.exists) {
      const data = linkSnap.data() || {};
      return buildStarterQuotaStatus(data.trialQuota, data.trialUsed);
    }
  }

  return buildStarterQuotaStatus(undefined, undefined);
}

/**
 * Increment starter free quota usage after successful document issuance.
 */
export async function incrementGuestTrial(lineUserId: string, userId?: string | null): Promise<void> {
  const db = getDb();
  const linkRef = db.collection('line_links').doc(lineUserId);
  const userRef = userId ? db.collection('users').doc(userId) : null;

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(linkRef);
    const data = snap.exists ? (snap.data() as LineLink) : null;
    const quotaStatus = buildStarterQuotaStatus(data?.trialQuota, data?.trialUsed);
    const used = Math.min(quotaStatus.quota, quotaStatus.used + 1);

    tx.set(
      linkRef,
      {
        trialQuota: quotaStatus.quota,
        trialUsed: used,
        trialUsedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    const resolvedUserRef = userRef || (data?.uid ? db.collection('users').doc(data.uid) : null);
    if (resolvedUserRef) {
      tx.set(
        resolvedUserRef,
        {
          trialQuota: quotaStatus.quota,
          trialUsed: used,
          trialUsedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    }
  });
}

/**
 * Get line link by lineUserId
 * Only returns ACTIVE links (soft unlink support)
 */
export async function getLineLink(lineUserId: string): Promise<LineLink | null> {
  const cached = getCachedLink(lineUserId);
  if (cached) {
    return cached;
  }

  const db = getDb();
  const linkRef = db.collection('line_links').doc(lineUserId);
  const snap = await linkRef.get();

  if (!snap.exists) {
    // Legacy fallback: lineUsers mapping (pre line_links)
    const legacySnap = await db.collection('lineUsers').doc(lineUserId).get();
    if (!legacySnap.exists) {
      return null;
    }

    const legacy = legacySnap.data() as {
      firebaseUid?: string;
      defaultBusinessId?: string;
      businessId?: string;
    };

    if (!legacy?.firebaseUid) {
      return null;
    }

    const legacyBusinessId = legacy.defaultBusinessId || legacy.businessId || 'default';

    const link: LineLink = {
      lineUserId,
      uid: legacy.firebaseUid,
      businessId: legacyBusinessId,
      linkedAt: Timestamp.now(),
      provider: 'line-login',
      status: 'ACTIVE',
    };

    await db.runTransaction(async (tx) => {
      tx.set(
        linkRef,
        {
          ...link,
          linkedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      tx.set(
        db.collection('users').doc(legacy.firebaseUid as string),
        {
          lineUserId,
          lineLinkedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    });

    setCachedLink(lineUserId, link);
    return link;
  }

  const data = snap.data() as LineLink;
  const normalizedStatus = String(data.status || 'ACTIVE').toUpperCase();

  if (normalizedStatus !== 'ACTIVE') {
    return null;
  }

  if (data.status !== 'ACTIVE') {
    await linkRef.set({ status: 'ACTIVE' }, { merge: true });
  }

  const normalized: LineLink = { ...data, status: 'ACTIVE' as const };
  setCachedLink(lineUserId, normalized);
  return normalized;
}

/**
 * Get line link by Firebase UID (reverse lookup)
 */
export async function getLineLinkByUid(uid: string): Promise<LineLink | null> {
  const db = getDb();
  const snapshot = await db
    .collection('line_links')
    .where('uid', '==', uid)
    .where('status', '==', 'ACTIVE')
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }

  return snapshot.docs[0].data() as LineLink;
}

/**
 * Revoke line link
 */
export async function revokeLinkLineUser(lineUserId: string): Promise<void> {
  const db = getDb();
  const linkRef = db.collection('line_links').doc(lineUserId);
  await linkRef.update({ status: 'REVOKED' });
  clearCachedLink(lineUserId);
}
