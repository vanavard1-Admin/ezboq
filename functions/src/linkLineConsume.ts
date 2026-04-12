import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import { getDb } from './core/firebaseAdmin';
import {
  activateLineLink,
  canClaimLineLink,
  ensureUserDocAndBusiness,
  LineIdentityProfile,
} from './services/lineProvisioningService';

/**
 * Cloud Function: Consume link code and complete LINE account linking
 * 
 * Flow:
 * 1. User must be authenticated (Firebase Auth)
 * 2. Validate link code (not used, not expired)
 * 3. Create line_links/{lineUserId} → uid mapping
 * 4. Mark code as used
 * 
 * POST /linkLineConsume
 * Headers: Authorization: Bearer <Firebase ID token>
 * Body: { code: string }
 * Returns: { ok: true, lineUserId: string, uid: string }
 */
export const linkLineConsume = functions
  .region("asia-southeast1")
  .runWith({
    secrets: ["LINE_CHANNEL_ACCESS_TOKEN"],
  })
  .https.onRequest(async (req: functions.https.Request, res: functions.Response) => {
    // CORS
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    if (req.method !== "POST") {
      res.status(405).json({ ok: false, error: "Method not allowed" });
      return;
    }

    try {
      // Verify Firebase Auth token
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        console.error("[LINK_CONSUME_FAIL] Missing or invalid Authorization header");
        res.status(401).json({ ok: false, error: "Unauthorized" });
        return;
      }

      const idToken = authHeader.split("Bearer ")[1];
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      const uid = decodedToken.uid;

      console.log(`[LINK_CONSUME_START] User ${uid} consuming link code`);

      // Get link code from body
      const { code } = req.body;
      if (!code) {
        console.error(`[LINK_CONSUME_FAIL] Missing code parameter`);
        res.status(400).json({ ok: false, error: "Missing code" });
        return;
      }

      // Load link code from Firestore
      const db = getDb();
      const codeDoc = await db.collection("link_codes").doc(code).get();

      if (!codeDoc.exists) {
        console.error(`[LINK_CONSUME_FAIL] Code not found: ${code}`);
        res.status(404).json({ ok: false, error: "Invalid or expired code" });
        return;
      }

      const codeData = codeDoc.data()!;

      // Check if already used
      if (codeData.used) {
        console.error(`[LINK_CONSUME_FAIL] Code already used: ${code}`, {
          usedAt: codeData.usedAt,
          usedByUid: codeData.usedByUid,
        });
        res.status(400).json({ ok: false, error: "Code already used" });
        return;
      }

      // Check if expired
      const now = admin.firestore.Timestamp.now();
      if (codeData.expiresAt.toMillis() < now.toMillis()) {
        console.error(`[LINK_CONSUME_FAIL] Code expired: ${code}`, {
          expiresAt: codeData.expiresAt.toDate(),
          now: now.toDate(),
        });
        res.status(400).json({ ok: false, error: "Code expired" });
        return;
      }

      const lineUserId = codeData.lineUserId;
      console.log(`[LINK_CONSUME_VALID] Linking ${lineUserId} → ${uid}`);

      // Check if link already exists (might be soft-deleted)
      const existingLink = await db.collection("line_links").doc(lineUserId).get();
      const isRelink = existingLink.exists;
      const existingLinkData = existingLink.data() as {
        uid?: string;
        status?: string;
        isGuest?: boolean;
      } | undefined;

      if (isRelink) {
        console.log(`[LINK_CONSUME_RELINK] Reactivating existing link for ${lineUserId}`);
      }

      if (!canClaimLineLink(existingLinkData, uid)) {
        console.error(`[LINK_CONSUME_FAIL] LINE already linked to another account: ${lineUserId}`, {
          currentUid: existingLinkData?.uid,
          requestedUid: uid,
          status: existingLinkData?.status,
        });
        res.status(409).json({ ok: false, error: "LINE account is already linked to another EzDOC account" });
        return;
      }

      const userEmail = decodedToken.email || null;
      const profile: LineIdentityProfile = {
        lineUserId,
        email: userEmail,
      };
      const ensured = await ensureUserDocAndBusiness({
        uid,
        profile,
        fallbackBusinessName: userEmail
          ? `Business (${String(userEmail).split('@')[0]})`
          : 'My Business',
      });
      const activeBusinessId = ensured.businessId;

      await activateLineLink({
        profile,
        uid,
        businessId: activeBusinessId,
        linkMethod: "external_browser",
      });

      // Mark code as used
      await db.collection("link_codes").doc(code).update({
        used: true,
        usedAt: admin.firestore.FieldValue.serverTimestamp(),
        usedByUid: uid,
      });

      // Write audit log
      try {
        await db.collection("line_audit_logs").add({
          event: isRelink ? "relink" : "link",
          lineUserId,
          uid,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          traceId: codeData.traceId,
          metadata: {
            linkMethod: "external_browser",
            code,
            isRelink,
          },
        });
      } catch (auditErr) {
        console.error("[LINK_CONSUME_AUDIT_FAIL]", auditErr);
        // Don't fail the request if audit log fails
      }

      // Notify user in LINE (non-blocking)
      try {
        const { pushLineMessage } = await import('./services/lineService');
        await pushLineMessage(
          lineUserId,
          "บี๊บ! เชื่อมต่อบัญชีสำเร็จแล้วครับเจ้านาย\nกลับไปแชทได้เลยนะครับ"
        );
      } catch (pushErr) {
        console.warn('[LINK_CONSUME_PUSH_FAIL]', pushErr);
      }

      console.log(`[LINK_CONSUME_OK] Successfully linked ${lineUserId} → ${uid}`);

      // Send onboarding to new users (non-blocking)
      try {
        const { needsOnboarding, sendOnboardingAsync } = await import('./services/onboardingService');
        const needs = await needsOnboarding(uid);
        if (needs) {
          void sendOnboardingAsync(lineUserId, uid);
        }
      } catch (onboardErr) {
        console.warn('[LINK_CONSUME_ONBOARDING_FAIL]', onboardErr);
      }

      res.status(200).json({
        ok: true,
        lineUserId,
        uid,
      });
    } catch (err) {
      console.error("[LINK_CONSUME_FAIL] Error:", err);
      res.status(500).json({
        ok: false,
        error: err instanceof Error ? err.message : "Internal error",
      });
    }
  });
