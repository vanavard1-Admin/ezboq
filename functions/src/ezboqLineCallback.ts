import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import fetch from "node-fetch";
import { getLineLoginChannelId } from "./shared/config";

/**
 * EzBOQ LINE Login OAuth Callback
 * 
 * Flow:
 * 1. EzBOQ redirects user to LINE authorize URL
 * 2. LINE redirects to this function with ?code=xxx&state=xxx
 * 3. This function exchanges code for tokens, verifies LINE identity
 * 4. Creates/finds Firebase user, mints customToken
 * 5. Returns HTML that postMessages customToken to opener (popup flow)
 */
export const ezboqLineCallback = functions
  .region("asia-southeast1")
  .runWith({ timeoutSeconds: 30, memory: "256MB", secrets: ["LINE_LOGIN_CHANNEL_SECRET"] })
  .https.onRequest(async (req, res) => {
    const code = req.query.code as string | undefined;
    const state = req.query.state as string | undefined;
    const error = req.query.error as string | undefined;

    if (error) {
      res.status(200).send(buildResultPage(null, `LINE login cancelled: ${error}`));
      return;
    }

    if (!code) {
      res.status(400).send(buildResultPage(null, "Missing authorization code"));
      return;
    }

    try {
      const channelId = getLineLoginChannelId();
      const channelSecret = process.env.LINE_LOGIN_CHANNEL_SECRET || process.env.LINE_CHANNEL_SECRET || "";

      if (!channelId || !channelSecret) {
        console.error("[EZBOQ_LINE] Missing LINE credentials");
        res.status(500).send(buildResultPage(null, "Server configuration error"));
        return;
      }

      // Exchange code for tokens
      const callbackUrl = "https://asia-southeast1-ezdoc-v1-th.cloudfunctions.net/ezboqLineCallback";
      const tokenParams = new URLSearchParams();
      tokenParams.append("grant_type", "authorization_code");
      tokenParams.append("code", code);
      tokenParams.append("redirect_uri", callbackUrl);
      tokenParams.append("client_id", channelId);
      tokenParams.append("client_secret", channelSecret);

      const tokenRes = await fetch("https://api.line.me/oauth2/v2.1/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: tokenParams.toString(),
      });

      if (!tokenRes.ok) {
        const errText = await tokenRes.text();
        console.error("[EZBOQ_LINE] Token exchange failed:", errText);
        res.status(200).send(buildResultPage(null, "LINE token exchange failed"));
        return;
      }

      const tokenData = await tokenRes.json() as {
        access_token?: string;
        id_token?: string;
      };

      let lineUserId: string | undefined;
      let lineEmail: string | null = null;
      let displayName: string | null = null;

      // Verify id_token
      if (tokenData.id_token) {
        const verifyParams = new URLSearchParams();
        verifyParams.append("id_token", tokenData.id_token);
        verifyParams.append("client_id", channelId);

        const verifyRes = await fetch("https://api.line.me/oauth2/v2.1/verify", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: verifyParams.toString(),
        });

        if (verifyRes.ok) {
          const verifyData = await verifyRes.json() as {
            sub?: string;
            email?: string;
            name?: string;
          };
          lineUserId = verifyData.sub;
          lineEmail = verifyData.email || null;
          displayName = verifyData.name || null;
        }
      }

      // Fallback: use access_token to get profile
      if (!lineUserId && tokenData.access_token) {
        const profileRes = await fetch("https://api.line.me/v2/profile", {
          headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });
        if (profileRes.ok) {
          const profile = await profileRes.json() as {
            userId?: string;
            displayName?: string;
          };
          lineUserId = profile.userId;
          displayName = profile.displayName || null;
        }
      }

      if (!lineUserId) {
        res.status(200).send(buildResultPage(null, "Could not verify LINE identity"));
        return;
      }

      console.log("[EZBOQ_LINE] Verified LINE user:", lineUserId);

      // Find or create Firebase user
      const db = admin.firestore();
      
      // Check ezboq_line_users mapping first
      const ezboqSnap = await db.collection("ezboq_line_users").doc(lineUserId).get();
      let targetUid = ezboqSnap.exists ? (ezboqSnap.data()?.uid as string) : undefined;

      if (!targetUid) {
        // Also check line_links (EzDoc shared mapping)
        const linkSnap = await db.collection("line_links").doc(lineUserId).get();
        if (linkSnap.exists && linkSnap.data()?.uid) {
          targetUid = linkSnap.data()?.uid as string;
        }
      }

      if (!targetUid) {
        // Create new Firebase Auth user
        const newUser = await admin.auth().createUser({
          displayName: displayName || "LINE User",
          ...(lineEmail ? { email: lineEmail } : {}),
        });
        targetUid = newUser.uid;

        // Store mapping
        await db.collection("ezboq_line_users").doc(lineUserId).set({
          uid: targetUid,
          lineUserId,
          displayName,
          email: lineEmail,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Create user doc
        await db.collection("users").doc(targetUid).set({
          displayName: displayName || "LINE User",
          email: lineEmail || "",
          provider: "line",
          lineUserId,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });

        console.log("[EZBOQ_LINE] Created new user:", targetUid);
      }

      // Mint Firebase custom token
      const customToken = await admin.auth().createCustomToken(targetUid, {
        lineUserId,
        provider: "line_ezboq",
      });

      console.log("[EZBOQ_LINE] Token minted for:", targetUid);
      res.status(200).send(buildResultPage(customToken, null, state, lineUserId));

    } catch (err) {
      console.error("[EZBOQ_LINE] Error:", err);
      res.status(200).send(buildResultPage(null, "Internal error during LINE login"));
    }
  });

function buildResultPage(
  customToken: string | null,
  error: string | null,
  state?: string | null,
  lineUserId?: string | null,
): string {
  const payload = customToken
    ? JSON.stringify({ type: "ezboq-line-login", customToken, lineUserId, state })
    : JSON.stringify({ type: "ezboq-line-login", error: error || "Unknown error", state });

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>EzBOQ - LINE Login</title>
  <style>
    body { font-family: -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f8fafc; }
    .card { text-align: center; padding: 2rem; }
    .spinner { width: 40px; height: 40px; border: 4px solid #e2e8f0; border-top-color: #06c755; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 1rem; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .error { color: #dc2626; }
    p { color: #64748b; font-size: 14px; }
  </style>
</head>
<body>
  <div class="card">
    ${customToken ? '<div class="spinner"></div><p>กำลังเข้าสู่ระบบ...</p>' : `<p class="error">${error || "เกิดข้อผิดพลาด"}</p>`}
  </div>
  <script>
    (function() {
      var payload = ${payload};
      if (window.opener) {
        window.opener.postMessage(payload, '*');
        setTimeout(function() { window.close(); }, 1500);
      } else {
        try { sessionStorage.setItem('ezboq-line-result', JSON.stringify(payload)); } catch(e) {}
        window.location.href = 'https://ezboq.com/#line-callback';
      }
    })();
  </script>
</body>
</html>`;
}
