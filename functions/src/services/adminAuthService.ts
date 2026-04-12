import { getDb } from '../core/firebaseAdmin';
/**
 * EzDoc - Admin Authorization Service
 *
 * Fail-closed admin auth:
 * - Firebase custom claims (`admin === true` or `role === 'admin'`)
 * - User document (`isAdmin === true` or `role === 'admin'`)
 * - Optional env allowlists for bootstrap/emergency access
 */

import * as admin from 'firebase-admin';

const db = getDb();

type AdminAllowlistEntry = {
  email?: string;
  lineUserId?: string;
  firebaseUid?: string;
};

const parseCsvEnv = (value: string | undefined): string[] =>
  (value || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

function getConfiguredAdminFirebaseUids(): string[] {
  return parseCsvEnv(process.env.ADMIN_FIREBASE_UIDS || process.env.ADMIN_USER_IDS);
}

function getConfiguredAdminEmails(): string[] {
  return parseCsvEnv(
    process.env.ADMIN_EMAIL_ALLOWLIST ||
      process.env.ADMIN_EMAILS ||
      process.env.ADMIN_EMAIL_RECIPIENTS ||
      process.env.ADMIN_EMAIL
  ).map((email) => email.toLowerCase());
}

function getConfiguredAdminLineUserIds(): string[] {
  return parseCsvEnv(process.env.ADMIN_LINE_USER_IDS || process.env.ADMIN_LINE_USER_ID);
}

export class AdminAuthorizationError extends Error {
  name = 'AdminAuthorizationError';

  constructor(message: string) {
    super(message);
  }
}

async function getUserRecord(firebaseUid: string): Promise<admin.auth.UserRecord | null> {
  try {
    return await admin.auth().getUser(firebaseUid);
  } catch (error) {
    console.error('[adminAuthService] Failed to get user record:', error);
    return null;
  }
}

async function getUserDoc(firebaseUid: string): Promise<Record<string, unknown> | null> {
  try {
    const userDoc = await db.collection('users').doc(firebaseUid).get();
    return userDoc.exists ? (userDoc.data() || {}) : null;
  } catch (error) {
    console.error('[adminAuthService] Failed to get user doc:', error);
    return null;
  }
}

function isAdminClaim(claims: Record<string, unknown> | undefined): boolean {
  if (!claims) return false;
  return claims.admin === true || claims.role === 'admin';
}

function isAdminUserDoc(data: Record<string, unknown> | null): boolean {
  if (!data) return false;
  return data.isAdmin === true || data.role === 'admin';
}

async function getFirebaseUidByLineUserId(lineUserId: string): Promise<string | null> {
  const usersQuery = await db
    .collection('users')
    .where('lineUserId', '==', lineUserId)
    .limit(1)
    .get();

  if (!usersQuery.empty) {
    return usersQuery.docs[0].id;
  }

  const linkDoc = await db.collection('line_links').doc(lineUserId).get();
  if (linkDoc.exists) {
    const uid = linkDoc.data()?.uid;
    return typeof uid === 'string' && uid.trim() ? uid.trim() : null;
  }

  return null;
}

async function resolveAdminEvidence(firebaseUid: string, emailHint?: string | null): Promise<{
  email: string | null;
  lineUserId: string | null;
  authorized: boolean;
}> {
  const [userRecord, userDoc] = await Promise.all([
    getUserRecord(firebaseUid),
    getUserDoc(firebaseUid),
  ]);

  const email = (emailHint || userRecord?.email || (typeof userDoc?.email === 'string' ? userDoc.email : null) || null);
  const normalizedEmail = email?.toLowerCase() || null;
  const lineUserId =
    (typeof userDoc?.lineUserId === 'string' && userDoc.lineUserId.trim()) ||
    (typeof userDoc?.line_user_id === 'string' && userDoc.line_user_id.trim()) ||
    null;

  const configuredAdminUidSet = new Set(getConfiguredAdminFirebaseUids());
  const configuredAdminEmailSet = new Set(getConfiguredAdminEmails());
  const configuredAdminLineUserIdSet = new Set(getConfiguredAdminLineUserIds());

  const authorized =
    configuredAdminUidSet.has(firebaseUid) ||
    (normalizedEmail ? configuredAdminEmailSet.has(normalizedEmail) : false) ||
    (lineUserId ? configuredAdminLineUserIdSet.has(lineUserId) : false) ||
    isAdminClaim((userRecord?.customClaims || {}) as Record<string, unknown>) ||
    isAdminUserDoc(userDoc);

  return { email: normalizedEmail, lineUserId, authorized };
}

export async function assertAdminFirebaseUid(firebaseUid: string, emailHint?: string | null): Promise<void> {
  if (!firebaseUid) {
    throw new AdminAuthorizationError('Missing firebaseUid');
  }

  const evidence = await resolveAdminEvidence(firebaseUid, emailHint);
  if (!evidence.authorized) {
    throw new AdminAuthorizationError('User is not an admin');
  }
}

export async function isAdminFirebaseUid(firebaseUid: string, emailHint?: string | null): Promise<boolean> {
  try {
    await assertAdminFirebaseUid(firebaseUid, emailHint);
    return true;
  } catch {
    return false;
  }
}

export async function assertAdmin(lineUserId: string): Promise<void> {
  if (!lineUserId) {
    throw new AdminAuthorizationError('Missing lineUserId');
  }

  const firebaseUid = await getFirebaseUidByLineUserId(lineUserId);
  if (!firebaseUid) {
    throw new AdminAuthorizationError('User not found');
  }

  await assertAdminFirebaseUid(firebaseUid);
}

export async function isAdmin(lineUserId: string): Promise<boolean> {
  try {
    await assertAdmin(lineUserId);
    return true;
  } catch {
    return false;
  }
}

export async function requireAdmin(event: { source?: { userId?: string } }): Promise<boolean> {
  const lineUserId = event.source?.userId;
  if (!lineUserId) {
    throw new AdminAuthorizationError('Missing LINE userId');
  }

  await assertAdmin(lineUserId);
  return true;
}

export async function logAdminAction(params: {
  adminLineUserId: string;
  action: string;
  targetId?: string;
  details?: Record<string, unknown>;
}): Promise<void> {
  try {
    await db.collection('admin_logs').add({
      adminLineUserId: params.adminLineUserId,
      action: params.action,
      targetId: params.targetId || null,
      details: params.details || {},
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.error('[adminAuthService] Failed to log admin action:', error);
  }
}

export function getAdminLineUserIds(): string[] {
  return getConfiguredAdminLineUserIds();
}

export function getAdminEmailRecipients(): string[] {
  const recipients = new Set<string>(getConfiguredAdminEmails());

  if (recipients.size === 0) {
    recipients.add('admin@ezboq.com');
  }

  return Array.from(recipients);
}

export function getAdminFirebaseUids(): string[] {
  return getConfiguredAdminFirebaseUids();
}

export function getConfiguredAdminAllowlist(): AdminAllowlistEntry[] {
  return [
    ...getConfiguredAdminFirebaseUids().map((firebaseUid) => ({ firebaseUid })),
    ...getConfiguredAdminEmails().map((email) => ({ email })),
    ...getConfiguredAdminLineUserIds().map((lineUserId) => ({ lineUserId })),
  ];
}
