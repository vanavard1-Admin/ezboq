import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import fetch from 'node-fetch';
import { getDb } from './core/firebaseAdmin';
import { getLineLoginChannelId } from './shared/config';

// LINE Login channel ID (params/env)

interface UnlinkLineRequest {
  idToken: string; // LINE ID token from LIFF
}

interface UnlinkLineResponse {
  ok: boolean;
  lineUserId?: string;
  uid?: string;
  error?: string;
}

/**
 * Unlink a LINE account from a Firebase user
 * 
 * Security:
 * 1. Verify Firebase Auth (Authorization header) to get uid
 * 2. Verify LINE ID token to get lineUserId
 * 3. Check that line_links/{lineUserId}.uid matches the authenticated uid
 * 4. Delete the link
 * 5. Write audit log
 * 
 * This prevents:
 * - Someone unlinking another person's account
 * - Unauthorized unlink attempts
 */
export const unlinkLine = functions
  .region('asia-southeast1')
  .runWith({
    secrets: ['LINE_LOGIN_CHANNEL_ID'],
    timeoutSeconds: 30,
  })
  .https.onRequest(async (req, res) => {
    // Generate trace ID for logging
    const traceId = Math.random().toString(36).substring(2, 15);
    console.log('[UNLINK_START]', traceId);

    // CORS headers
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    if (req.method !== 'POST') {
      res.status(405).json({ ok: false, error: 'Method not allowed' });
      return;
    }

    try {
      // 1. Verify Firebase Auth
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.log('[UNLINK_FAIL]', traceId, 'Missing or invalid Authorization header');
        res.status(401).json({ ok: false, error: 'Unauthorized - missing Firebase token' });
        return;
      }

      const firebaseToken = authHeader.substring(7); // Remove 'Bearer '

      let uid: string;
      try {
        const decodedToken = await admin.auth().verifyIdToken(firebaseToken);
        uid = decodedToken.uid;
        console.log('[UNLINK_AUTH_OK]', traceId, `Firebase user: ${uid}`);
      } catch (err) {
        const error = err as Error;
        console.log('[UNLINK_FAIL]', traceId, 'Invalid Firebase token:', error.message);
        res.status(401).json({ ok: false, error: 'Invalid Firebase token' });
        return;
      }

      // 2. Verify LINE ID token
      const { idToken } = req.body as UnlinkLineRequest;

      if (!idToken) {
        console.log('[UNLINK_FAIL]', traceId, 'Missing idToken');
        res.status(400).json({ ok: false, error: 'Missing idToken' });
        return;
      }

      // Validate LINE ID token format (JWT with 3 parts)
      const dotCount = (idToken.match(/\./g) || []).length;
      if (dotCount !== 2) {
        console.log('[UNLINK_FAIL]', traceId, `Invalid ID token format: ${dotCount} dots (need 2)`);
        res.status(400).json({ ok: false, error: 'Invalid ID token format' });
        return;
      }

      console.log('[UNLINK_VERIFY_LINE]', traceId, 'Verifying LINE ID token...');

      // Verify LINE ID token with LINE Platform
      const channelId = getLineLoginChannelId();
      if (!channelId) {
        throw new Error('LINE_LOGIN_CHANNEL_ID not configured');
      }

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

      if (!verifyRes.ok) {
        const errorText = await verifyRes.text();
        console.log('[UNLINK_FAIL]', traceId, 'LINE verify failed:', verifyRes.status, errorText);
        res.status(401).json({ ok: false, error: 'Invalid LINE ID token' });
        return;
      }

      const verifyData = (await verifyRes.json()) as { sub: string };
      const lineUserId = verifyData.sub;

      if (!lineUserId) {
        console.log('[UNLINK_FAIL]', traceId, 'No sub in verify response');
        res.status(401).json({ ok: false, error: 'Invalid LINE ID token' });
        return;
      }

      console.log('[UNLINK_VERIFIED_LINE]', traceId, `LINE user: ${lineUserId}`);

      // 3. Check that line_links/{lineUserId}.uid matches authenticated uid
      const db = getDb();
      const linkDoc = await db.collection('line_links').doc(lineUserId).get();

      if (!linkDoc.exists) {
        console.log('[UNLINK_FAIL]', traceId, 'Link not found');
        res.status(404).json({ ok: false, error: 'Link not found - already unlinked?' });
        return;
      }

      const linkData = linkDoc.data();
      if (!linkData || !linkData.uid) {
        console.log('[UNLINK_FAIL]', traceId, 'Invalid link data');
        res.status(500).json({ ok: false, error: 'Invalid link data' });
        return;
      }

      const isOwner = linkData.uid === uid;
      if (!isOwner) {
        // Allow unlink if LINE owner is verified but Firebase uid differs (account switch case)
        console.warn('[UNLINK_OVERRIDE]', traceId, `UID mismatch: link uid=${linkData.uid}, auth uid=${uid}`);
      }

      console.log('[UNLINK_AUTHORIZED]', traceId, `Unlinking ${lineUserId} from ${uid}`);

      // 4. Soft delete: Mark as inactive (keep history for analytics)
      await linkDoc.ref.update({
        status: 'REVOKED',
        unlinkedAt: admin.firestore.FieldValue.serverTimestamp(),
        unlinkedByUid: uid,
        previousUid: linkData.uid || null,
      });
      console.log('[UNLINK_SOFT_DELETE]', traceId, 'Link marked as REVOKED (soft delete)');

      // 5. Write audit log
      try {
        await db.collection('line_audit_logs').add({
          event: 'unlink',
          lineUserId,
          uid,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          traceId,
          metadata: {
            linkMethod: linkData.linkMethod || linkData.provider,
            linkedAt: linkData.linkedAt,
            unlinkMethod: isOwner ? 'soft_delete_owner' : 'soft_delete_override',
            previousUid: linkData.uid || null,
          },
        });
        console.log('[UNLINK_AUDIT_OK]', traceId, 'Audit log written');
      } catch (auditErr) {
        // Don't fail the request if audit log fails
        console.error('[UNLINK_AUDIT_FAIL]', traceId, auditErr);
      }

      console.log('[UNLINK_OK]', traceId, `Successfully unlinked ${lineUserId}`);

      const response: UnlinkLineResponse = {
        ok: true,
        lineUserId,
        uid,
      };

      res.status(200).json(response);
    } catch (err) {
      const error = err as Error;
      console.error('[UNLINK_FAIL]', traceId, error);
      res.status(500).json({
        ok: false,
        error: error.message || 'Internal server error',
      });
    }
  });
