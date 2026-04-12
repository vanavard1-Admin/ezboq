import { getDb } from '../core/firebaseAdmin';
/**
 * Authentication Middleware
 * Verify Firebase ID token from Authorization header
 */

import * as admin from 'firebase-admin';
import { Request, Response, NextFunction } from 'express';

// Extend Express Request to include authenticated user
export interface AuthenticatedRequest extends Request {
    user?: admin.auth.DecodedIdToken;
    userId?: string;
}

/**
 * Middleware to verify Firebase ID token
 * Expects: Authorization: Bearer <idToken>
 */
export async function verifyAuth(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Missing or invalid Authorization header' });
        return;
    }

    const idToken = authHeader.split('Bearer ')[1];

    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        req.user = decodedToken;
        req.userId = decodedToken.uid;
        next();
    } catch (error) {
        console.error('Token verification failed:', error);
        res.status(401).json({ error: 'Invalid or expired token' });
        return;
    }
}

/**
 * Get user's active business ID from Firestore
 */
export async function getActiveBusinessId(userId: string): Promise<string | null> {
    const db = getDb();
    const userSnap = await db.doc(`users/${userId}`).get();

    if (!userSnap.exists) return null;

    const data = userSnap.data();
    return (data?.activeBusinessId as string) || null;
}

/**
 * Verify user owns the business
 */
export async function verifyBusinessOwnership(
    userId: string,
    businessId: string
): Promise<boolean> {
    const db = getDb();
    const bizSnap = await db.doc(`users/${userId}/businesses/${businessId}`).get();
    return bizSnap.exists;
}

/**
 * Get or create user document for Firebase Auth user
 */
export async function ensureUserExists(
    uid: string,
    email?: string
): Promise<{ userId: string; activeBusinessId: string | null; plan: string }> {
    const db = getDb();

    // Check if user exists by uid
    const userSnap = await db.doc(`users/${uid}`).get();

    if (userSnap.exists) {
        const data = userSnap.data();
        return {
            userId: uid,
            activeBusinessId: (data?.activeBusinessId as string) || null,
            plan: (data?.plan as string) || 'FREE',
        };
    }

    // Create new user
    await db.doc(`users/${uid}`).set({
        email: email || null,
        plan: 'FREE',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        activeBusinessId: null,
    });

    return { userId: uid, activeBusinessId: null, plan: 'FREE' };
}
