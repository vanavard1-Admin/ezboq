import * as admin from 'firebase-admin';
import * as crypto from 'crypto';
import { createBusiness } from '../core/businesses';
import { getDb } from '../core/firebaseAdmin';
import { STARTER_FREE_DOC_QUOTA } from '../core/lineLinkService';

export interface LineIdentityProfile {
  lineUserId: string;
  displayName?: string | null;
  pictureUrl?: string | null;
  email?: string | null;
}

export interface StoredLineLinkLike {
  uid?: string | null;
  status?: string | null;
  isGuest?: boolean | null;
}

export interface ProvisioningDecision {
  uid: string;
  reusedExistingUid: boolean;
  reactivated: boolean;
  upgradedGuest: boolean;
}

const AUTO_PROVISION_PREFIX = 'line_';
const AUTO_PROVISION_HASH_LENGTH = 24;

export function buildAutoProvisionUid(lineUserId: string): string {
  const hash = crypto.createHash('sha256').update(lineUserId).digest('hex');
  return `${AUTO_PROVISION_PREFIX}${hash.slice(0, AUTO_PROVISION_HASH_LENGTH)}`;
}

export function canClaimLineLink(existingLink: StoredLineLinkLike | null | undefined, uid: string): boolean {
  if (!existingLink?.uid) return true;
  if (existingLink.uid === uid) return true;
  if (existingLink.isGuest) return true;

  const status = String(existingLink.status || 'ACTIVE').toUpperCase();
  return status !== 'ACTIVE';
}

export function decideProvisioningUid(
  lineUserId: string,
  existingLink: StoredLineLinkLike | null | undefined
): ProvisioningDecision {
  if (existingLink?.uid) {
    const status = String(existingLink.status || 'ACTIVE').toUpperCase();
    return {
      uid: existingLink.uid,
      reusedExistingUid: true,
      reactivated: status !== 'ACTIVE',
      upgradedGuest: Boolean(existingLink.isGuest),
    };
  }

  return {
    uid: buildAutoProvisionUid(lineUserId),
    reusedExistingUid: false,
    reactivated: false,
    upgradedGuest: false,
  };
}

function buildDefaultBusinessName(profile: LineIdentityProfile, fallbackName?: string | null): string {
  const preferred =
    profile.displayName?.trim() ||
    fallbackName?.trim() ||
    (profile.email ? `Business (${profile.email.split('@')[0]})` : '') ||
    '';

  return preferred || 'ธุรกิจของฉัน';
}

export async function ensureUserDocAndBusiness(params: {
  uid: string;
  profile: LineIdentityProfile;
  fallbackBusinessName?: string | null;
}): Promise<{ businessId: string; createdUser: boolean }> {
  const { uid, profile, fallbackBusinessName } = params;
  const db = getDb();
  const userRef = db.doc(`users/${uid}`);
  const userSnap = await userRef.get();
  const now = admin.firestore.FieldValue.serverTimestamp();

  if (!userSnap.exists) {
    await userRef.set({
      email: null,
      lineEmail: profile.email || null,
      lineUserId: profile.lineUserId,
      lineLinkedAt: now,
      displayName: profile.displayName || null,
      photoUrl: profile.pictureUrl || null,
      authProvider: 'line_liff',
      plan: 'FREE',
      status: 'FREE',
      trialQuota: STARTER_FREE_DOC_QUOTA,
      trialUsed: 0,
      createdAt: now,
      updatedAt: now,
      activeBusinessId: null,
    });
  } else {
    const currentData = userSnap.data() || {};
    const currentTrialQuota = Number(currentData.trialQuota);
    const currentTrialUsed = Number(currentData.trialUsed);
    await userRef.set({
      lineEmail: profile.email || admin.firestore.FieldValue.delete(),
      lineUserId: profile.lineUserId,
      lineLinkedAt: now,
      displayName: profile.displayName || admin.firestore.FieldValue.delete(),
      photoUrl: profile.pictureUrl || admin.firestore.FieldValue.delete(),
      authProvider: 'line_liff',
      trialQuota: Number.isFinite(currentTrialQuota)
        ? Math.max(currentTrialQuota, STARTER_FREE_DOC_QUOTA)
        : STARTER_FREE_DOC_QUOTA,
      trialUsed: Number.isFinite(currentTrialUsed) && currentTrialUsed >= 0 ? currentTrialUsed : 0,
      updatedAt: now,
    }, { merge: true });
  }

  let activeBusinessId = userSnap.exists
    ? (userSnap.data()?.activeBusinessId as string | null) || null
    : null;

  if (!activeBusinessId) {
    const bizQuery = await db.collection(`users/${uid}/businesses`).limit(1).get();
    if (bizQuery.empty) {
      activeBusinessId = await createBusiness(uid, {
        name: buildDefaultBusinessName(profile, fallbackBusinessName),
        email: profile.email || undefined,
      });
    } else {
      activeBusinessId = bizQuery.docs[0].id;
      await userRef.set({
        activeBusinessId,
        updatedAt: now,
      }, { merge: true });
    }
  }

  return {
    businessId: activeBusinessId,
    createdUser: !userSnap.exists,
  };
}

export async function activateLineLink(params: {
  profile: LineIdentityProfile;
  uid: string;
  businessId: string;
  linkMethod: string;
}): Promise<void> {
  const { profile, uid, businessId, linkMethod } = params;
  const db = getDb();
  const now = admin.firestore.FieldValue.serverTimestamp();
  const existingLinkSnap = await db.collection('line_links').doc(profile.lineUserId).get();
  const existingLink = existingLinkSnap.exists ? (existingLinkSnap.data() || {}) : {};
  const existingUserSnap = await db.collection('users').doc(uid).get();
  const existingUser = existingUserSnap.exists ? (existingUserSnap.data() || {}) : {};
  const existingTrialQuota = Number(existingLink.trialQuota);
  const existingTrialUsed = Number(existingLink.trialUsed);
  const userTrialQuota = Number(existingUser.trialQuota);
  const userTrialUsed = Number(existingUser.trialUsed);
  const resolvedTrialQuota = Math.max(
    Number.isFinite(existingTrialQuota) ? existingTrialQuota : 0,
    Number.isFinite(userTrialQuota) ? userTrialQuota : 0,
    STARTER_FREE_DOC_QUOTA,
  );
  const resolvedTrialUsed = Math.max(
    Number.isFinite(existingTrialUsed) && existingTrialUsed >= 0 ? existingTrialUsed : 0,
    Number.isFinite(userTrialUsed) && userTrialUsed >= 0 ? userTrialUsed : 0,
  );

  await db.collection('line_links').doc(profile.lineUserId).set({
    lineUserId: profile.lineUserId,
    uid,
    businessId,
    provider: 'line_liff',
    linkedAt: now,
    linkMethod,
    status: 'ACTIVE',
    isGuest: false,
    trialQuota: resolvedTrialQuota,
    trialUsed: Math.min(resolvedTrialUsed, resolvedTrialQuota),
    updatedAt: now,
  }, { merge: true });

  await db.collection('users').doc(uid).set({
    lineUserId: profile.lineUserId,
    lineLinkedAt: now,
    trialQuota: resolvedTrialQuota,
    trialUsed: Math.min(resolvedTrialUsed, resolvedTrialQuota),
    updatedAt: now,
  }, { merge: true });
}
