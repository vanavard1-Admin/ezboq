import { getDb } from '../core/firebaseAdmin';
/**
 * EzDoc - User State Service
 * 
 * Manages user state, especially image_mode for image upload intent.
 */

import * as admin from 'firebase-admin';

const db = getDb();

export type ImageMode = 'SLIP' | 'LOGO' | 'SIGNATURE' | 'STAMP' | null;

/**
 * Get user image mode
 */
export async function getUserImageMode(userId: string): Promise<ImageMode> {
  const userDoc = await db.collection('users').doc(userId).get();
  if (!userDoc.exists) {
    return null;
  }
  const data = userDoc.data();
  return (data?.image_mode as ImageMode) || null;
}

/**
 * Set user image mode
 */
export async function setUserImageMode(userId: string, mode: ImageMode): Promise<void> {
  await db.collection('users').doc(userId).set(
    { image_mode: mode, updated_at: admin.firestore.FieldValue.serverTimestamp() },
    { merge: true }
  );
}

/**
 * Clear user image mode
 */
export async function clearUserImageMode(userId: string): Promise<void> {
  await setUserImageMode(userId, null);
}

