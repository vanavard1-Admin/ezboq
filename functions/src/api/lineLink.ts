import { getDb } from '../core/firebaseAdmin';
/**
 * LINE Account Linking Endpoints
 * POST /auth/line-link/complete - Complete the linking process
 * GET /auth/line-link/start - Generate state and redirect to login
 */

import * as express from 'express';
import * as admin from 'firebase-admin';
import { getLineLiffId, getLineLinkStateSecret } from '../shared/config';
import {
  verifyLinkState,
  recordUsedNonce,
  checkNonceUsed,
  linkLineUserToFirebase,
  generateLinkState,
} from '../core/lineLinkService';

const router = express.Router();

/**
 * Get and validate LINE_LINK_STATE_SECRET at runtime
 */
function getStateSecret(): string {
  const secret = getLineLinkStateSecret();
  if (!secret) {
    console.error('FATAL: LINE_LINK_STATE_SECRET not set in environment');
    throw new Error('LINE_LINK_STATE_SECRET environment variable not set');
  }
  return secret;
}

/**
 * POST /auth/line-link/complete
 * Body: { idToken: string, state: string }
 * Response: { success: boolean, message: string, link?: { uid, businessId, lineUserId } }
 */
router.post('/complete', async (req: express.Request, res: express.Response) => {
  try {
    const { idToken, state } = req.body;

    if (!idToken || !state) {
      return res.status(400).json({ success: false, message: 'Missing idToken or state' });
    }

    // Step 1: Verify Firebase ID token
    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(idToken);
    } catch (err) {
      console.error('[line-link/complete] ID token verification failed:', err);
      return res.status(401).json({ success: false, message: 'Invalid ID token' });
    }

    const uid = decodedToken.uid;
    console.log(`[line-link/complete] Token verified for uid=${uid}`);

    // Step 2: Verify state signature and expiration
    const stateVerify = verifyLinkState(state, getStateSecret());
    if (!stateVerify.valid || !stateVerify.payload) {
      console.error('[line-link/complete] State verification failed:', stateVerify.error);
      return res.status(400).json({ success: false, message: `Invalid state: ${stateVerify.error}` });
    }

    const lineUserId = stateVerify.payload.lineUserId;
    const nonce = stateVerify.payload.nonce;

    // Step 3: Check nonce was not already used
    const nonceUsed = await checkNonceUsed(nonce);
    if (nonceUsed) {
      console.error('[line-link/complete] Nonce replay detected:', nonce);
      return res.status(400).json({ success: false, message: 'State already used (nonce replay)' });
    }

    // Step 4: Record nonce as used
    await recordUsedNonce(nonce);

    // Step 5: Resolve default businessId for this Firebase user
    const db = getDb();
    const userBusinessesSnap = await db
      .collection('users')
      .doc(uid)
      .collection('businesses')
      .limit(1)
      .get();

    let businessId = 'default';
    if (!userBusinessesSnap.empty) {
      businessId = userBusinessesSnap.docs[0].id;
    }

    // Step 6: Create or update line_links entry
    const link = await linkLineUserToFirebase(lineUserId, uid, businessId);
    console.log(
      `[line-link/complete] Linked: lineUserId=${lineUserId}, uid=${uid}, businessId=${businessId}`
    );

    return res.status(200).json({
      success: true,
      message: 'LINE account linked successfully',
      link: {
        lineUserId: link.lineUserId,
        uid: link.uid,
        businessId: link.businessId,
      },
    });
  } catch (err) {
    console.error('[line-link/complete] Error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * GET /auth/line-link/start
 * Query: { lineUserId: string }
 * Returns: { state: string, loginUrl: string } or redirect to web
 */
router.get('/start', async (req: express.Request, res: express.Response) => {
  try {
    const { lineUserId, redirectUrl } = req.query as { lineUserId?: string; redirectUrl?: string };

    if (!lineUserId) {
      return res.status(400).json({ success: false, message: 'Missing lineUserId' });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Missing Authorization header' });
    }

    const idToken = authHeader.split('Bearer ')[1];
    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(idToken);
    } catch (err) {
      console.error('[line-link/start] ID token verification failed:', err);
      return res.status(401).json({ success: false, message: 'Invalid ID token' });
    }

    const uid = decodedToken.uid;
    const db = getDb();
    const userSnap = await db.doc(`users/${uid}`).get();
    const storedLineUserId = userSnap.exists ? (userSnap.data()?.lineUserId as string | undefined) : undefined;

    if (!storedLineUserId || storedLineUserId !== lineUserId) {
      return res.status(403).json({
        success: false,
        message: 'LINE userId mismatch. Please use the LIFF linking flow.',
      });
    }

    const state = generateLinkState(lineUserId as string, getStateSecret());
    const LIFF_ID = getLineLiffId() || '2008406529-Y6Bh2fT5';
    const webLinkUrl = `https://liff.line.me/${LIFF_ID}`;

    console.log(`[line-link/start] Generated state for uid=${uid}`);

    // If redirectUrl provided, redirect immediately
    if (redirectUrl) {
      return res.redirect(webLinkUrl);
    }

    // Otherwise return state for client to use
    return res.status(200).json({
      success: true,
      state,
      loginUrl: webLinkUrl,
    });
  } catch (err) {
    console.error('[line-link/start] Error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

export const lineLinkRouter = router;
