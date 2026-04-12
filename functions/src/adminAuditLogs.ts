import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import { getDb } from './core/firebaseAdmin';
import { AdminAuthorizationError, assertAdminFirebaseUid } from './services/adminAuthService';

interface AuditLogEntry {
  id: string;
  event: 'link' | 'relink' | 'unlink';
  lineUserId: string;
  uid: string;
  timestamp: FirebaseFirestore.Timestamp;
  traceId?: string;
  metadata?: {
    linkMethod?: string;
    code?: string;
    isRelink?: boolean;
    unlinkMethod?: string;
    linkedAt?: FirebaseFirestore.Timestamp;
  };
}

interface AuditLogsResponse {
  ok: boolean;
  logs?: AuditLogEntry[];
  pagination?: {
    total: number;
    page: number;
    perPage: number;
    hasNext: boolean;
  };
  error?: string;
}

/**
 * Admin API: Get audit logs for LINE account linking/unlinking
 * 
 * Security:
 * - Requires Firebase Auth
 * - Admin role check (custom claims)
 * 
 * Query params:
 * - event: 'link' | 'relink' | 'unlink' (optional)
 * - startDate: ISO date string (optional)
 * - endDate: ISO date string (optional)
 * - uid: Firebase UID (optional)
 * - lineUserId: LINE user ID (optional)
 * - page: number (default: 1)
 * - perPage: number (default: 50, max: 100)
 * - orderBy: 'timestamp' (default: 'timestamp')
 * - orderDirection: 'asc' | 'desc' (default: 'desc')
 */
export const adminAuditLogs = functions
  .region('asia-southeast1')
  .runWith({
    timeoutSeconds: 60,
  })
  .https.onRequest(async (req, res) => {
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
    res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      if (origin && !allowOrigin) {
        res.status(403).send('');
        return;
      }
      res.status(204).send('');
      return;
    }

    if (req.method !== 'GET') {
      res.status(405).json({ ok: false, error: 'Method not allowed' });
      return;
    }

    try {
      // 1. Verify Firebase Auth
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ ok: false, error: 'Unauthorized - missing token' });
        return;
      }

      const idToken = authHeader.substring(7);
      let decodedToken: admin.auth.DecodedIdToken;
      try {
        decodedToken = await admin.auth().verifyIdToken(idToken);
      } catch {
        res.status(401).json({ ok: false, error: 'Unauthorized - invalid token' });
        return;
      }
      const uid = decodedToken.uid;

      console.log('[ADMIN_AUDIT_REQUEST]', uid);

      // 2. Check admin role
      await assertAdminFirebaseUid(uid, decodedToken.email || null);

      // 3. Parse query parameters
      const requestedEvent = req.query.event as string | undefined;
      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;
      const filterUid = req.query.uid as string | undefined;
      const lineUserId = req.query.lineUserId as string | undefined;
      const page = Math.max(parseInt(req.query.page as string || '1', 10), 1);
      const perPage = Math.min(Math.max(parseInt(req.query.perPage as string || '50', 10), 1), 100);
      const orderBy = 'timestamp';
      const requestedOrderDirection = req.query.orderDirection as string | undefined;
      const orderDirection: 'asc' | 'desc' = requestedOrderDirection === 'asc' ? 'asc' : 'desc';
      const event = requestedEvent === 'link' || requestedEvent === 'relink' || requestedEvent === 'unlink'
        ? requestedEvent
        : undefined;

      console.log('[ADMIN_AUDIT_PARAMS]', {
        event,
        startDate,
        endDate,
        filterUid,
        lineUserId,
        page,
        perPage,
        orderBy,
        orderDirection,
      });

      // 4. Build Firestore query
      const db = getDb();
      let query: admin.firestore.Query = db.collection('line_audit_logs');

      // Apply filters
      if (event) {
        query = query.where('event', '==', event);
      }

      if (filterUid) {
        query = query.where('uid', '==', filterUid);
      }

      if (lineUserId) {
        query = query.where('lineUserId', '==', lineUserId);
      }

      // Date range filtering (requires composite index)
      if (startDate) {
        const startTimestamp = admin.firestore.Timestamp.fromDate(new Date(startDate));
        query = query.where('timestamp', '>=', startTimestamp);
      }

      if (endDate) {
        const endTimestamp = admin.firestore.Timestamp.fromDate(new Date(endDate));
        query = query.where('timestamp', '<=', endTimestamp);
      }

      // Order and pagination
      query = query.orderBy(orderBy, orderDirection);

      // Get total count (for pagination)
      const countSnapshot = await query.count().get();
      const total = countSnapshot.data().count;

      // Apply pagination
      const offset = (page - 1) * perPage;
      query = query.offset(offset).limit(perPage);

      // 5. Execute query
      const snapshot = await query.get();

      const logs: AuditLogEntry[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data() as Omit<AuditLogEntry, 'id'>,
      }));

      console.log('[ADMIN_AUDIT_OK]', `Retrieved ${logs.length} logs (page ${page}/${Math.ceil(total / perPage)})`);

      // 6. Return results
      const response: AuditLogsResponse = {
        ok: true,
        logs,
        pagination: {
          total,
          page,
          perPage,
          hasNext: offset + perPage < total,
        },
      };

      res.status(200).json(response);
    } catch (err) {
      if (err instanceof AdminAuthorizationError) {
        res.status(403).json({
          ok: false,
          error: 'Forbidden - admin role required',
        });
        return;
      }
      const error = err as Error;
      console.error('[ADMIN_AUDIT_FAIL]', error);
      res.status(500).json({
        ok: false,
        error: error.message || 'Internal server error',
      });
    }
  });
