import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import fetch from "node-fetch";
import { getDb } from "./core/firebaseAdmin";
import { getLineLoginChannelId } from "./shared/config";
import {
  activateLineLink,
  decideProvisioningUid,
  ensureUserDocAndBusiness,
  LineIdentityProfile,
} from "./services/lineProvisioningService";

/**
 * Cloud Function: Verify LINE ID token and mint Firebase custom token
 * Uses LINE Login channel (not Messaging API channel)
 * 
 * POST /auth/line/verify
 * Body: { idToken: string }
 * Returns: { ok: true, lineUserId: string, customToken: string }
 */
export const authLineVerify = functions
  .region("asia-southeast1")
  .runWith({
    secrets: ["LINE_LOGIN_CHANNEL_ID"],
  })
  .https.onRequest(async (req: functions.https.Request, res: functions.Response) => {
    // CORS (allowlist for LIFF + web)
    const allowedOrigins = [
      "https://doc.ezboq.com",
      "https://ezdoc-v1-th.web.app",
      "https://ezdoc-v1-th.firebaseapp.com",
      "https://doc.ezboq.com",
    ];
    const origin = req.headers.origin as string | undefined;
    const allowOrigin = origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
    res.set("Access-Control-Allow-Origin", allowOrigin);
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, X-Line-Access-Token");

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    if (req.method !== "POST") {
      res.status(405).json({ ok: false, error: "Method not allowed" });
      return;
    }

    try {
      // Read idToken from body (support both idToken and id_token keys)
      const idToken = req.body?.idToken ?? req.body?.id_token ?? "";
      const accessToken =
        (req.body?.accessToken as string | undefined) ??
        (req.headers["x-line-access-token"] as string | undefined) ??
        "";
      const autoCreate = req.body?.autoCreate === true;
      
      // Detailed validation
      const idTokenLength = idToken ? String(idToken).length : 0;
      const dotCount = idToken ? (String(idToken).match(/\./g) || []).length : 0;

      if (!idToken && !accessToken) {
        console.error("[AUTH_LINE_VERIFY_FAIL] Missing LINE auth token");
        res.status(400).json({ 
          ok: false, 
          error: "Missing LINE auth token",
        });
        return;
      }

      // Get LINE Login channel ID (not Messaging API channel)
      const clientId = getLineLoginChannelId();
      if (!clientId) {
        console.error("[AUTH_LINE_VERIFY_FAIL] LINE_LOGIN_CHANNEL_ID secret not set");
        res.status(500).json({ ok: false, error: "Server configuration error" });
        return;
      }

      // Mask client_id for logging (show first 4 and last 2 digits)
      const maskedClientId = clientId.length > 6 
        ? `${clientId.substring(0, 4)}****${clientId.substring(clientId.length - 2)}`
        : "****";

      console.log("[AUTH_LINE_VERIFY_START] Starting verification", {
        client_id: maskedClientId,
        idTokenLength,
        dotCount,
      });

      let lineUserId: string | undefined;
      let lineEmail: string | null = null;
      let displayName: string | null = null;
      let pictureUrl: string | null = null;

      if (idToken) {
        if (dotCount !== 2) {
          console.error("[AUTH_LINE_VERIFY_WARN] Invalid idToken format - not JWT", {
            idTokenLength,
            dotCount,
            expected: 2,
          });
        } else {
          const verifyParams = new URLSearchParams();
          verifyParams.append('id_token', idToken);
          verifyParams.append('client_id', clientId);

          const verifyResponse = await fetch(
            'https://api.line.me/oauth2/v2.1/verify',
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
              },
              body: verifyParams.toString(),
            }
          );

          if (verifyResponse.ok) {
            const verifyData = await verifyResponse.json() as {
              sub?: string;
              email?: string;
              error_description?: string;
            };
            lineUserId = verifyData.sub;
            lineEmail = verifyData.email || null;
          } else {
            await verifyResponse.text();
            console.error("[AUTH_LINE_VERIFY_WARN] LINE verify API failed", {
              status: verifyResponse.status,
              statusText: verifyResponse.statusText,
              idTokenLength,
              dotCount,
            });
          }
        }
      }

      if (!lineUserId && accessToken) {
        const profileRes = await fetch('https://api.line.me/v2/profile', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
        if (!profileRes.ok) {
          const errorText = await profileRes.text();
          console.error("[AUTH_LINE_VERIFY_FAIL] LINE profile failed", {
            status: profileRes.status,
            error: errorText,
          });
          res.status(401).json({ 
            ok: false, 
            error: "LINE profile rejected token",
          });
          return;
        }
        const profileData = await profileRes.json() as { userId?: string };
        lineUserId = profileData.userId;
      }

      if (!lineUserId) {
        console.error("[AUTH_LINE_VERIFY_FAIL] No LINE userId resolved");
        res.status(401).json({ ok: false, error: "Invalid token payload" });
        return;
      }

      console.log("[AUTH_LINE_VERIFY_OK] LINE user verified", {
        lineUserId,
        client_id: maskedClientId,
        autoCreate,
      });

      if (accessToken) {
        try {
          const profileRes = await fetch("https://api.line.me/v2/profile", {
            method: "GET",
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          });
          if (profileRes.ok) {
            const profileData = await profileRes.json() as {
              userId?: string;
              displayName?: string;
              pictureUrl?: string;
            };
            displayName = profileData.displayName || null;
            pictureUrl = profileData.pictureUrl || null;
          }
        } catch (profileErr) {
          console.warn("[AUTH_LINE_VERIFY_WARN] Failed to load LINE profile", profileErr);
        }
      }

      const db = getDb();
      const linkSnap = await db.collection("line_links").doc(lineUserId).get();
      const linkData = linkSnap.exists ? linkSnap.data() : undefined;
      const linkedUid = linkData?.uid as string | undefined;
      const linkStatus = String(linkData?.status || "ACTIVE").toUpperCase();
      const isGuestLink = Boolean(linkData?.isGuest);
      const isActiveLinkedAccount = Boolean(linkedUid) && linkStatus === "ACTIVE" && !isGuestLink;

      if (!isActiveLinkedAccount && !autoCreate) {
        console.error("[AUTH_LINE_VERIFY_FAIL] LINE account not linked", { lineUserId, linkStatus, isGuestLink });
        res.status(403).json({
          ok: false,
          error: "LINE account not linked. Please link your LINE account first.",
          code: "LINE_NOT_LINKED",
        });
        return;
      }

      const profile: LineIdentityProfile = {
        lineUserId,
        email: lineEmail,
        displayName,
        pictureUrl,
      };

      const decision = decideProvisioningUid(lineUserId, {
        uid: linkedUid || null,
        status: linkStatus,
        isGuest: isGuestLink,
      });
      const targetUid = decision.uid;
      let businessId = linkData?.businessId as string | undefined;
      let created = false;

      const ensured = await ensureUserDocAndBusiness({
        uid: targetUid,
        profile,
      });
      businessId = ensured.businessId;
      created = ensured.createdUser;

      const shouldActivateLink =
        autoCreate ||
        !isActiveLinkedAccount ||
        linkData?.businessId !== businessId ||
        linkData?.uid !== targetUid;

      if (businessId && shouldActivateLink) {
        await activateLineLink({
          profile,
          uid: targetUid,
          businessId,
          linkMethod: autoCreate
            ? (decision.upgradedGuest ? "liff_auto_upgrade_guest" : decision.reactivated ? "liff_auto_reactivate" : "liff_auto_create")
            : "liff_signin",
        });
      }

      // Create Firebase custom token for the linked user
      const customToken = await admin.auth().createCustomToken(targetUid, {
        lineUserId,
        provider: "line_liff",
      });

      console.log("[AUTH_LINE_VERIFY_OK] Custom token created for uid:", targetUid, {
        created,
        reactivated: decision.reactivated,
        upgradedGuest: decision.upgradedGuest,
      });

      res.status(200).json({
        ok: true,
        lineUserId,
        uid: targetUid,
        created,
        reactivated: decision.reactivated,
        upgradedGuest: decision.upgradedGuest,
        customToken,
      });
    } catch (err) {
      console.error("[AUTH_LINE_VERIFY_FAIL] Error:", err);
      res.status(500).json({ 
        ok: false, 
        error: err instanceof Error ? err.message : "Internal error" 
      });
    }
  });
