import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import fetch from "node-fetch";
import crypto from "crypto";
import { getDb } from './core/firebaseAdmin';
import { getLineLoginChannelId } from "./shared/config";

/**
 * Cloud Function: Start LINE account linking flow
 * 
 * Flow:
 * 1. Verify LINE ID token
 * 2. Generate temporary link code (5-minute expiry, single-use)
 * 3. Return code to LIFF
 * 4. LIFF opens external browser to /link/complete?code=XXX
 * 
 * POST /linkLineStart
 * Body: { idToken: string }
 * Returns: { ok: true, code: string, expiresIn: number }
 */
export const linkLineStart = functions
  .region("asia-southeast1")
  .runWith({
    secrets: ["LINE_LOGIN_CHANNEL_ID"],
  })
  .https.onRequest(async (req: functions.https.Request, res: functions.Response) => {
    // CORS
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Line-Access-Token");

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    if (req.method !== "POST") {
      res.status(405).json({ ok: false, error: "Method not allowed" });
      return;
    }

    const traceId = crypto.randomBytes(8).toString("hex");
    console.log(`[LINK_START_BEGIN] ${traceId}`);

    try {
      // ✅ FIX 3: Standardize auth - check Authorization header first
      const authHeader = req.headers.authorization;
      let idToken: string | undefined;
      let accessToken: string | undefined;

      if (authHeader && authHeader.startsWith('Bearer ')) {
        idToken = authHeader.substring(7);
      } else {
        // Fallback to body (backward compatibility)
        const body = req.body as { idToken?: string; accessToken?: string };
        idToken = body.idToken;
        accessToken = body.accessToken;
      }

      if (!accessToken) {
        const headerAccess = req.headers["x-line-access-token"];
        if (typeof headerAccess === "string") {
          accessToken = headerAccess;
        }
      }

      if (!idToken && !accessToken) {
        console.error(`[LINK_START_FAIL] ${traceId} Missing LINE auth token`);
        res.status(401).json({ 
          ok: false, 
          error: "Missing authentication token",
          code: 'ERR_MISSING_AUTH_HEADER',
        });
        return;
      }

      // Verify LINE ID token
      const clientId = getLineLoginChannelId();
      if (!clientId) {
        console.error(`[LINK_START_FAIL] ${traceId} LINE_LOGIN_CHANNEL_ID not set`);
        res.status(500).json({ ok: false, error: "Server configuration error" });
        return;
      }

      let lineUserId: string | undefined;

      if (idToken) {
        console.log(`[LINK_START_VERIFY] ${traceId} Verifying LINE ID token...`);
        const verifyParams = new URLSearchParams();
        verifyParams.append("id_token", idToken);
        verifyParams.append("client_id", clientId);

        const verifyResponse = await fetch(
          "https://api.line.me/oauth2/v2.1/verify",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: verifyParams.toString(),
          }
        );

        if (verifyResponse.ok) {
          const verifyData = (await verifyResponse.json()) as {
            sub?: string;
            error_description?: string;
          };
          lineUserId = verifyData.sub;
        } else {
          const errorText = await verifyResponse.text();
          console.error(`[LINK_START_WARN] ${traceId} LINE verify failed:`, {
            status: verifyResponse.status,
            error: errorText,
          });
        }
      }

      if (!lineUserId && accessToken) {
        const profileRes = await fetch("https://api.line.me/v2/profile", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
        if (!profileRes.ok) {
          const errorText = await profileRes.text();
          console.error(`[LINK_START_FAIL] ${traceId} LINE profile failed:`, {
            status: profileRes.status,
            error: errorText,
          });
          res.status(401).json({ ok: false, error: "Invalid LINE access token" });
          return;
        }
        const profile = (await profileRes.json()) as { userId?: string };
        lineUserId = profile.userId;
      }

      if (!lineUserId) {
        console.error(`[LINK_START_FAIL] ${traceId} No sub in verify response`);
        res.status(401).json({ ok: false, error: "Invalid token payload" });
        return;
      }

      console.log(`[LINK_START_VERIFIED] ${traceId} LINE user: ${lineUserId}`);

      // Generate link code (32 chars)
      const linkCode = crypto.randomBytes(16).toString("hex");
      const expiresAt = admin.firestore.Timestamp.fromMillis(
        Date.now() + 5 * 60 * 1000 // 5 minutes
      );

      // Store in Firestore
      const db = getDb();
      await db.collection("link_codes").doc(linkCode).set({
        lineUserId,
        expiresAt,
        used: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        traceId,
      });

      console.log(`[LINK_START_OK] ${traceId} Created link code for ${lineUserId}`, {
        code: `${linkCode.substring(0, 8)}...`,
        expiresIn: 300,
      });

      res.status(200).json({
        ok: true,
        code: linkCode,
        expiresIn: 300, // seconds
      });
    } catch (err) {
      console.error(`[LINK_START_FAIL] ${traceId} Error:`, err);
      res.status(500).json({
        ok: false,
        error: err instanceof Error ? err.message : "Internal error",
      });
    }
  });
