import { getDb } from '../core/firebaseAdmin';
/**
 * Service-to-Service Authentication Middleware
 * Verifies Google Identity Tokens from service accounts
 */

import { Request, Response, NextFunction } from 'express';
import { OAuth2Client } from 'google-auth-library';

const client = new OAuth2Client();

// Get project configuration
const PROJECT_ID = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT;
const PDF_SERVICE_ACCOUNT = `pdf-service@${PROJECT_ID}.iam.gserviceaccount.com`;

// Expected audience (your Backend API URL)
const EXPECTED_AUDIENCE = process.env.BACKEND_API_AUDIENCE || 
  `https://asia-southeast1-${PROJECT_ID}.cloudfunctions.net/api`;

export interface ServiceAuthRequest extends Request {
  serviceAccount?: string;
  serviceEmail?: string;
}

/**
 * Middleware to verify Google Identity Token from service accounts
 * 
 * Usage:
 *   app.get('/v1/internal/...', serviceAuthMiddleware, handler);
 * 
 * After verification, req.serviceAccount contains the service account email
 */
export async function serviceAuthMiddleware(
  req: ServiceAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ 
        error: 'UNAUTHORIZED', 
        message: 'Missing or invalid Authorization header' 
      });
      return;
    }

    const token = authHeader.substring(7); // Remove "Bearer "

    // Verify the token
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: EXPECTED_AUDIENCE,
    });

    const payload = ticket.getPayload();

    if (!payload) {
      res.status(401).json({ 
        error: 'UNAUTHORIZED', 
        message: 'Invalid token payload' 
      });
      return;
    }

    // Extract service account email
    const serviceEmail = payload.email;

    if (!serviceEmail) {
      res.status(401).json({ 
        error: 'UNAUTHORIZED', 
        message: 'Token missing email claim' 
      });
      return;
    }

    // Verify it's a service account (ends with .iam.gserviceaccount.com)
    if (!serviceEmail.endsWith('.iam.gserviceaccount.com')) {
      res.status(403).json({ 
        error: 'FORBIDDEN', 
        message: 'Only service accounts allowed' 
      });
      return;
    }

    // Log successful authentication
    console.log(`[Service Auth] Authenticated: ${serviceEmail}`);

    // Attach to request
    req.serviceAccount = serviceEmail;
    req.serviceEmail = serviceEmail;

    next();

  } catch (error: any) {
    console.error('[Service Auth] Verification failed:', error.message);

    res.status(401).json({ 
      error: 'UNAUTHORIZED', 
      message: 'Token verification failed'
    });
  }
}

/**
 * Middleware to verify that the caller is the PDF Service specifically
 * Use this for PDF-specific endpoints
 */
export async function pdfServiceAuthMiddleware(
  req: ServiceAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  // First verify it's a valid service account
  await serviceAuthMiddleware(req, res, () => {
    // Then check if it's specifically the PDF service account
    if (req.serviceAccount !== PDF_SERVICE_ACCOUNT) {
      res.status(403).json({
        error: 'FORBIDDEN',
        message: 'Only PDF Service can access this endpoint',
      });
      return;
    }

    next();
  });
}

/**
 * Helper to check if a service account has access to a business
 * For future use when we have multi-business service accounts
 */
export async function checkBusinessAccess(
  serviceAccount: string,
  businessId: string
): Promise<boolean> {
  // For now, PDF service has access to all businesses
  if (serviceAccount === PDF_SERVICE_ACCOUNT) {
    return true;
  }

  // Future: Check Firestore for service account → business mappings
  const db = getDb();
  const serviceAccountDoc = await db
    .collection('service_accounts')
    .doc(serviceAccount)
    .get();

  if (!serviceAccountDoc.exists) {
    return false;
  }

  const allowedBusinesses = serviceAccountDoc.data()?.businesses || [];
  return allowedBusinesses.includes(businessId);
}
