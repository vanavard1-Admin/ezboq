import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import fetch from 'node-fetch';
import { getDb } from './core/firebaseAdmin';
import { buildStarterQuotaStatus } from './core/lineLinkService';
import { getLineLoginChannelId } from './shared/config';

// LINE Login channel ID (params/env)

interface CheckLineLinkRequest {
  idToken: string; // LINE ID token from LIFF
}

interface CheckLineLinkResponse {
  ok: boolean;
  linked: boolean;
  uid?: string;
  email?: string;
  linkedAt?: string; // ISO timestamp
  linkMethod?: string;
  lineUserId?: string;
  trial?: { used: number; quota: number };
  error?: string;
}

/**
 * Check if a LINE account is linked to a Firebase user
 * 
 * Flow:
 * 1. Verify LINE ID token to get lineUserId
 * 2. Check if line_links/{lineUserId} exists
 * 3. If exists, fetch Firebase user info (email)
 * 4. Return link status and details
 * 
 * Used by:
 * - LIFF page to show current link status
 * - Webhook to determine if user needs to link first
 */
export const checkLineLink = functions
  .region('asia-southeast1')
  .runWith({
    secrets: ['LINE_LOGIN_CHANNEL_ID'],
    timeoutSeconds: 30,
  })
  .https.onRequest(async (req, res) => {
    // Generate trace ID for logging
    const traceId = Math.random().toString(36).substring(2, 15);
    console.log('[CHECK_LINK_START]', traceId);

    // CORS headers
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Line-Access-Token');

    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    if (req.method !== 'POST') {
      res.status(405).json({ ok: false, error: 'Method not allowed' });
      return;
    }

    try {
      // ✅ FIX 3: Standardize auth - check Authorization header first
      const authHeader = req.headers.authorization;
      let idToken: string | undefined;
      let accessToken: string | undefined;

      if (authHeader && authHeader.startsWith('Bearer ')) {
        idToken = authHeader.substring(7);
      } else {
        // Fallback to body (backward compatibility)
        const body = req.body as CheckLineLinkRequest & { accessToken?: string };
        idToken = body.idToken;
        accessToken = body.accessToken;
      }
      if (!accessToken) {
        const headerAccess = req.headers['x-line-access-token'];
        if (typeof headerAccess === 'string') {
          accessToken = headerAccess;
        }
      }

      if (!idToken && !accessToken) {
        console.log('[CHECK_LINK_FAIL]', traceId, 'Missing LINE auth token');
        res.status(401).json({ 
          ok: false, 
          error: 'Missing authentication token',
          code: 'ERR_MISSING_AUTH_HEADER',
        });
        return;
      }

      // ✅ FIX 3: Never log tokens
      console.log('[CHECK_LINK_VERIFY]', traceId, 'Verifying LINE ID token...');

      // Verify LINE ID token with LINE Platform
      const channelId = getLineLoginChannelId();
      if (!channelId) {
        throw new Error('LINE_LOGIN_CHANNEL_ID not configured');
      }

      let lineUserId: string | undefined;

      if (idToken) {
        // Validate LINE ID token format (JWT with 3 parts)
        const dotCount = (idToken.match(/\./g) || []).length;
        if (dotCount === 2) {
          const verifyUrl = 'https://api.line.me/oauth2/v2.1/verify';
          const verifyParams = new URLSearchParams({
            id_token: idToken,
            client_id: channelId,
          });

          const verifyRes = await fetch(verifyUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: verifyParams.toString(),
          });

          if (verifyRes.ok) {
            const verifyData = (await verifyRes.json()) as { sub: string; email?: string };
            lineUserId = verifyData.sub;
          } else {
            const errorText = await verifyRes.text();
            console.log('[CHECK_LINK_WARN]', traceId, 'LINE verify failed:', verifyRes.status, errorText);
          }
        } else {
          console.log('[CHECK_LINK_WARN]', traceId, `Invalid ID token format: ${dotCount} dots`);
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
          console.log('[CHECK_LINK_FAIL]', traceId, 'LINE profile failed:', profileRes.status, errorText);
          res.status(401).json({ ok: false, error: 'Invalid LINE access token' });
          return;
        }
        const profile = (await profileRes.json()) as { userId?: string };
        lineUserId = profile.userId;
      }

      if (!lineUserId) {
        console.log('[CHECK_LINK_FAIL]', traceId, 'No sub in verify response');
        res.status(401).json({ ok: false, error: 'Invalid LINE ID token' });
        return;
      }

      console.log('[CHECK_LINK_VERIFIED]', traceId, `LINE user: ${lineUserId}`);

      // Check if this LINE account is linked
      const db = getDb();
      const linkDoc = await db.collection('line_links').doc(lineUserId).get();

      if (!linkDoc.exists) {
        console.log('[CHECK_LINK_OK]', traceId, 'Not linked');
        const response: CheckLineLinkResponse = {
          ok: true,
          linked: false,
          lineUserId,
        };
        res.status(200).json(response);
        return;
      }

      // Link exists - get Firebase user details
      const linkData = linkDoc.data();
      if (!linkData || !linkData.uid) {
        console.log('[CHECK_LINK_FAIL]', traceId, 'Invalid link data');
        res.status(500).json({ ok: false, error: 'Invalid link data' });
        return;
      }

      // ✅ Guest trial should not be treated as a full link
      if (linkData.isGuest) {
        const starterQuota = buildStarterQuotaStatus(linkData.trialQuota, linkData.trialUsed);
        const response: CheckLineLinkResponse = {
          ok: true,
          linked: false,
          lineUserId,
          trial: {
            used: starterQuota.used,
            quota: starterQuota.quota,
          },
        };
        res.status(200).json(response);
        return;
      }

      // Check if link is active (soft unlink support)
      const status = String(linkData.status || 'ACTIVE').toUpperCase(); // Default to ACTIVE for old records
      if (status !== 'ACTIVE') {
        console.log('[CHECK_LINK_REVOKED]', traceId, `Link is ${status}`);
        const response: CheckLineLinkResponse = {
          ok: true,
          linked: false,
          lineUserId,
        };
        res.status(200).json(response);
        return;
      }

      const uid = linkData.uid;
      console.log('[CHECK_LINK_FOUND]', traceId, `Linked to uid: ${uid}`);

      // Get Firebase user email
      let email: string | undefined;
      try {
        const userRecord = await admin.auth().getUser(uid);
        email = userRecord.email;
      } catch (err) {
        console.log('[CHECK_LINK_WARN]', traceId, `Could not fetch user ${uid}:`, err);
        // Continue without email - user might be deleted but link still exists
      }

      console.log('[CHECK_LINK_OK]', traceId, `Linked to ${email || uid}`);

      const response: CheckLineLinkResponse = {
        ok: true,
        linked: true,
        uid,
        email,
        linkedAt: linkData.linkedAt?.toDate?.()?.toISOString() || linkData.linkedAt,
        linkMethod: linkData.linkMethod || linkData.provider,
        lineUserId,
      };

      res.status(200).json(response);
    } catch (err) {
      const error = err as Error;
      console.error('[CHECK_LINK_FAIL]', traceId, error);
      res.status(500).json({
        ok: false,
        error: error.message || 'Internal server error',
      });
    }
  });
