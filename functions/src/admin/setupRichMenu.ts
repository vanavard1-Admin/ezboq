/**
 * EzDoc - Rich Menu Setup (Admin Function)
 * 
 * HTTP endpoint to create/update Rich Menu.
 * Call this once after deployment to set up the Rich Menu.
 * 
 * Usage:
 * POST /setupRichMenu
 * Headers: Authorization: Bearer <admin-token>
 */

import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import { syncRichMenuWithQuickReply } from '../services/richMenuService';
import { AdminAuthorizationError, assertAdminFirebaseUid } from '../services/adminAuthService';
import { getLineChannelAccessToken } from '../shared/config';

async function requireAdminUid(
  req: functions.https.Request
): Promise<string> {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    throw new Error('UNAUTHORIZED');
  }

  const idToken = authHeader.replace('Bearer ', '').trim();
  if (!idToken) {
    throw new Error('UNAUTHORIZED');
  }

  let decoded: admin.auth.DecodedIdToken;
  try {
    decoded = await admin.auth().verifyIdToken(idToken);
  } catch {
    throw new Error('UNAUTHORIZED');
  }
  await assertAdminFirebaseUid(decoded.uid, decoded.email || null);
  return decoded.uid;
}

export const setupRichMenu = functions
  .region('asia-southeast1')
  .runWith({ secrets: ['LINE_CHANNEL_ACCESS_TOKEN'] })
  .https.onRequest(async (req: functions.https.Request, res: functions.Response) => {
    try {
      const allowedOrigins = [
        'https://doc.ezboq.com',
        'https://ezdoc-v1-th.web.app',
        'https://ezdoc-v1-th.firebaseapp.com',
        'http://localhost:3000',
      ];
      const origin = typeof req.headers.origin === 'string' ? req.headers.origin : '';
      const allowOrigin = origin && allowedOrigins.includes(origin) ? origin : '';
      if (allowOrigin) {
        res.set('Access-Control-Allow-Origin', allowOrigin);
        res.set('Vary', 'Origin');
      }
      res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.set('Access-Control-Allow-Headers', 'Authorization, Content-Type');
      if (req.method === 'OPTIONS') {
        if (origin && !allowOrigin) {
          res.status(403).send('');
          return;
        }
        res.status(204).send('');
        return;
      }
      if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed. Use POST.' });
        return;
      }

      await requireAdminUid(req);
      const accessToken = getLineChannelAccessToken();
      if (!accessToken) {
        res.status(500).json({ error: 'LINE_CHANNEL_ACCESS_TOKEN not configured' });
        return;
      }

      console.log('[SETUP_RICH_MENU] Starting Rich Menu setup...');
      const richMenuId = await syncRichMenuWithQuickReply(accessToken);
      
      res.json({
        success: true,
        richMenuId,
        message: 'Rich Menu created and set as default',
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'UNKNOWN_ERROR';
      if (message === 'UNAUTHORIZED') {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      if (message === 'FORBIDDEN' || err instanceof AdminAuthorizationError) {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }
      console.error('[SETUP_RICH_MENU] Error:', err);
      res.status(500).json({
        error: message,
      });
    }
  });
