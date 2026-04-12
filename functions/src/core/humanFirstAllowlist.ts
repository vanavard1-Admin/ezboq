import { getDb } from './firebaseAdmin';
/**
 * Human-First UX Allowlist
 * 
 * Controls which users have access to human-first UX feature
 * 
 * Precedence rules (deterministic):
 * 1. If HUMAN_FIRST_UX_ALLOWLIST env var exists and has values (length > 0):
 *    → Use env allowlist ONLY (overrides Firestore)
 * 2. If env allowlist is empty/missing:
 *    → Check Firestore feature_flags/{lineUserId}/human_first_ux_enabled
 * 3. If both are empty/missing:
 *    → Return false (not in allowlist)
 * 
 * Cache Strategy:
 * - Firestore reads are NOT cached (reads on every request)
 * - This ensures kill switch works immediately (no TTL delay)
 * - Trade-off: Higher Firestore read cost but immediate effect
 * 
 * Usage:
 * - Set HUMAN_FIRST_UX_ALLOWLIST="Uxxx,Uyyy" for testing (requires redeploy to change)
 * - Or set in Firestore: feature_flags/{lineUserId}/human_first_ux_enabled = true (no redeploy needed)
 */

import * as admin from 'firebase-admin';
import { getHumanFirstUxEnabled } from '../shared/config';

const FEATURE_FLAGS_COLLECTION = 'feature_flags';

/**
 * Check if user is in allowlist
 * 
 * IMPORTANT: When HUMAN_FIRST_UX_ENABLED=false, this function is NOT called
 * (no Firestore reads occur)
 * 
 * @param lineUserId - LINE user ID (e.g., "U1234567890abcdef")
 * @returns true if user should have human-first UX enabled
 */
export async function isUserInAllowlist(lineUserId: string): Promise<boolean> {
  // Global flag must be enabled first
  // If false, this function should not be called (no-op at call site)
  if (!getHumanFirstUxEnabled()) {
    return false;
  }

  // Priority 1: Environment variable allowlist (if exists and non-empty, overrides Firestore)
  const envAllowlist = process.env.HUMAN_FIRST_UX_ALLOWLIST;
  if (envAllowlist && envAllowlist.trim().length > 0) {
    const allowlist = envAllowlist.split(',').map(id => id.trim()).filter(Boolean);
    // Wildcard: allow all users
    if (allowlist.includes('*') || allowlist.includes('all')) {
      return true;
    }
    // If env allowlist exists and has values, use it exclusively
    return allowlist.includes(lineUserId);
  }

  // Priority 2: Firestore feature flag (only if env allowlist is empty/missing)
  // NOTE: No cache - reads Firestore on every request for immediate kill switch effect
  try {
    const db = getDb();
    const flagDoc = await db
      .collection(FEATURE_FLAGS_COLLECTION)
      .doc(lineUserId)
      .get();

    if (flagDoc.exists) {
      const data = flagDoc.data();
      if (data?.human_first_ux_enabled === true) {
        return true;
      }
    }
  } catch (error) {
    console.warn(`[humanFirstAllowlist] Error checking Firestore flag for ${lineUserId}:`, error);
    // Fail-safe: if Firestore error, return false
  }

  // Default: not in allowlist
  return false;
}

/**
 * Set user allowlist status (for testing/admin)
 * 
 * @param lineUserId - LINE user ID
 * @param enabled - Enable or disable human-first UX for this user
 */
export async function setUserAllowlistStatus(
  lineUserId: string,
  enabled: boolean
): Promise<void> {
  const db = getDb();
  await db
    .collection(FEATURE_FLAGS_COLLECTION)
    .doc(lineUserId)
    .update({
      human_first_ux_enabled: enabled,
      updated_at: admin.firestore.Timestamp.now(),
    });
}
