/**
 * OIDC Token Verification for Cloud Scheduler
 * =============================================
 * Verifies that incoming requests are from authorized Cloud Scheduler jobs
 * 
 * Usage:
 *   const authResult = await verifySchedulerAuth(req);
 *   if (!authResult.valid) {
 *     res.status(401).json({ error: authResult.error });
 *     return;
 *   }
 */

import { OAuth2Client } from 'google-auth-library';
import { getDevBypassSecret } from '../shared/config';

const PROJECT_ID = process.env.GCLOUD_PROJECT || 'ezdoc-v1-th';

// Service accounts allowed to invoke this function
const ALLOWED_SERVICE_ACCOUNTS = [
  `${PROJECT_ID}@appspot.gserviceaccount.com`,  // Default App Engine SA (Cloud Scheduler default)
  `scheduler-sa@${PROJECT_ID}.iam.gserviceaccount.com`,  // Custom scheduler SA if created
];

// OAuth2 client for token verification
const authClient = new OAuth2Client();

export interface AuthResult {
  valid: boolean;
  email?: string;
  error?: string;
}

/**
 * Verify OIDC token from Cloud Scheduler
 * 
 * Cloud Scheduler sends OIDC token in Authorization header:
 * Authorization: Bearer <OIDC_TOKEN>
 * 
 * The token contains:
 * - iss: https://accounts.google.com
 * - aud: Function URL (must match)
 * - email: Service account email
 * - email_verified: true
 */
export async function verifySchedulerAuth(
  req: { headers: { authorization?: string }; url?: string },
  expectedAudience?: string
): Promise<AuthResult> {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return { valid: false, error: 'Missing Authorization header' };
  }
  
  if (!authHeader.startsWith('Bearer ')) {
    return { valid: false, error: 'Invalid Authorization header format' };
  }
  
  const token = authHeader.substring(7); // Remove 'Bearer '
  
  try {
    // Verify the token
    const ticket = await authClient.verifyIdToken({
      idToken: token,
      audience: expectedAudience, // Optional: verify audience matches function URL
    });
    
    const payload = ticket.getPayload();
    
    if (!payload) {
      return { valid: false, error: 'Invalid token payload' };
    }
    
    const email = payload.email;
    const emailVerified = payload.email_verified;
    
    // Check email is verified
    if (!emailVerified) {
      return { valid: false, error: 'Email not verified' };
    }
    
    // Check if service account is in allowed list
    if (!email || !ALLOWED_SERVICE_ACCOUNTS.includes(email)) {
      console.warn(`[Auth] Rejected: ${email} not in allowed list`);
      return { valid: false, error: `Unauthorized service account: ${email}` };
    }
    
    console.log(`[Auth] Verified: ${email}`);
    return { valid: true, email };
    
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error(`[Auth] Token verification failed:`, errMsg);
    return { valid: false, error: `Token verification failed: ${errMsg}` };
  }
}

/**
 * Check if request is from internal/dev environment
 * Allows bypass for local testing with special header
 */
export function isDevBypass(req: { headers: Record<string, unknown> }): boolean {
  // Only allow dev bypass in non-production or with specific header
  const bypassHeader = req.headers['x-dev-bypass'];
  const devSecret = getDevBypassSecret();
  
  // If no secret configured, dev bypass is disabled
  if (!devSecret) {
    return false;
  }
  
  return bypassHeader === devSecret;
}
