import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import { ensureUserDocAndBusiness, activateLineLink } from './services/lineProvisioningService';

/**
 * Cloud Function: Complete LINE account linking
 * 
 * POST /link/line/complete
 * Headers: Authorization: Bearer <firebaseIdToken>
 * Body: { lineUserId?: string } (optional, will read from custom claims if not provided)
 * Returns: { ok: true }
 */
export const linkLineComplete = functions
  .region("asia-southeast1")
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

    console.log("[LINK_COMPLETE_START] Starting LINE link completion");

    try {
      // Verify Firebase ID token
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        console.error("[LINK_COMPLETE_FAIL] Missing or invalid Authorization header");
        res.status(401).json({ ok: false, error: "Unauthorized" });
        return;
      }

      const idToken = authHeader.split("Bearer ")[1];
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      const uid = decodedToken.uid;

      console.log("[LINK_COMPLETE] Verified Firebase user:", uid);

      // Get lineUserId from body or custom claims
      let lineUserId = req.body.lineUserId;
      if (!lineUserId && decodedToken.lineUserId) {
        lineUserId = decodedToken.lineUserId;
      }

      if (!lineUserId) {
        console.error("[LINK_COMPLETE_FAIL] No lineUserId available");
        res.status(400).json({ ok: false, error: "Missing lineUserId" });
        return;
      }

      console.log("[LINK_COMPLETE] Linking:", { uid, lineUserId });

      const lineProfile = {
        lineUserId,
        email: decodedToken.email || null,
      };
      const { businessId } = await ensureUserDocAndBusiness({
        uid,
        profile: lineProfile,
      });

      await activateLineLink({
        profile: lineProfile,
        uid,
        businessId,
        linkMethod: 'firebase_link_complete',
      });

      console.log("[LINK_COMPLETE_OK] Successfully linked LINE account:", lineUserId);

      // Send onboarding to new users (non-blocking)
      try {
        const { needsOnboarding, sendOnboardingAsync } = await import('./services/onboardingService');
        const needs = await needsOnboarding(uid);
        if (needs) {
          void sendOnboardingAsync(lineUserId, uid);
        }
      } catch (onboardErr) {
        console.warn('[LINK_COMPLETE_ONBOARDING_FAIL]', onboardErr);
      }

      res.status(200).json({
        ok: true,
        lineUserId,
        uid,
      });
    } catch (err) {
      console.error("[LINK_COMPLETE_FAIL] Error:", err);
      res.status(500).json({ 
        ok: false, 
        error: err instanceof Error ? err.message : "Internal error" 
      });
    }
  });
