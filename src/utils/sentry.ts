/**
 * 🔍 Sentry Error Tracking Configuration
 * 
 * EZBOQ v1.1.0 - Production Error Monitoring
 * 
 * Features:
 * - ✅ Frontend error tracking
 * - ✅ Performance monitoring
 * - ✅ Release tracking (ezboq@1.1.0)
 * - ✅ Environment tagging
 * - ✅ User context
 * - ✅ Breadcrumbs
 * 
 * @version 1.1.0
 * @since 2025-01-28
 */

import * as Sentry from "@sentry/react";

/**
 * EZBOQ Release Version
 * Update this when releasing new versions
 */
export const RELEASE_VERSION = "ezboq@1.1.0";

/**
 * Initialize Sentry (Frontend)
 * 
 * ⚠️ Call this ONCE in your app entry point (main.tsx or App.tsx)
 * 
 * @param dsn - Sentry DSN from your project settings
 */
export function initSentry(dsn?: string) {
  // Skip if already initialized or no DSN provided
  if (!dsn || typeof window === 'undefined') {
    console.warn('⚠️ Sentry not initialized: Missing DSN or running on server');
    return;
  }

  try {
    Sentry.init({
      dsn,
      
      // Release version for tracking
      release: RELEASE_VERSION,
      
      // Environment
      environment: import.meta.env.MODE || 'development',
      
      // Performance Monitoring
      integrations: [
        new Sentry.BrowserTracing({
          // Trace all page loads and navigation
          routingInstrumentation: Sentry.reactRouterV6Instrumentation(
            // @ts-ignore
            React.useEffect,
            // @ts-ignore
            useLocation,
            // @ts-ignore
            useNavigationType,
            // @ts-ignore
            createRoutesFromChildren,
            // @ts-ignore
            matchRoutes
          ),
        }),
        new Sentry.Replay({
          // Mask all text and input fields
          maskAllText: true,
          blockAllMedia: true,
        }),
      ],
      
      // Performance monitoring sample rate
      // 0.1 = 10% of transactions (reduce cost in production)
      tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
      
      // Session Replay sample rate
      // Only record 10% of sessions to reduce cost
      replaysSessionSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
      
      // Replay on error (always record sessions with errors)
      replaysOnErrorSampleRate: 1.0,
      
      // Filter sensitive data
      beforeSend(event, hint) {
        // Remove sensitive data from breadcrumbs
        if (event.breadcrumbs) {
          event.breadcrumbs = event.breadcrumbs.map(breadcrumb => {
            // Remove authorization headers
            if (breadcrumb.data?.headers) {
              delete breadcrumb.data.headers.Authorization;
              delete breadcrumb.data.headers['Idempotency-Key'];
            }
            return breadcrumb;
          });
        }
        
        // Remove sensitive data from request
        if (event.request?.headers) {
          delete event.request.headers.Authorization;
          delete event.request.headers['Idempotency-Key'];
        }
        
        return event;
      },
      
      // Ignore certain errors
      ignoreErrors: [
        // Browser extensions
        'top.GLOBALS',
        'ResizeObserver loop limit exceeded',
        'Non-Error promise rejection captured',
        
        // Network errors (user's connection issue)
        'Network request failed',
        'Failed to fetch',
        'NetworkError',
        
        // User cancellation
        'AbortError',
        'cancelled',
      ],
      
      // Deny URLs (don't report errors from these sources)
      denyUrls: [
        // Browser extensions
        /extensions\//i,
        /^chrome:\/\//i,
        /^moz-extension:\/\//i,
      ],
    });

    console.log(`✅ Sentry initialized (${RELEASE_VERSION})`);
  } catch (error) {
    console.error('❌ Failed to initialize Sentry:', error);
  }
}

/**
 * Set user context for Sentry
 * Call this after user logs in
 */
export function setSentryUser(userId: string, email?: string, name?: string) {
  Sentry.setUser({
    id: userId,
    email,
    username: name,
  });
}

/**
 * Clear user context
 * Call this after user logs out
 */
export function clearSentryUser() {
  Sentry.setUser(null);
}

/**
 * Add custom context to error reports
 */
export function setSentryContext(key: string, value: Record<string, any>) {
  Sentry.setContext(key, value);
}

/**
 * Manually capture exception
 * Use this for caught exceptions you want to report
 */
export function captureException(error: Error, context?: Record<string, any>) {
  if (context) {
    Sentry.withScope(scope => {
      Object.entries(context).forEach(([key, value]) => {
        scope.setExtra(key, value);
      });
      Sentry.captureException(error);
    });
  } else {
    Sentry.captureException(error);
  }
}

/**
 * Capture custom message
 */
export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info') {
  Sentry.captureMessage(message, level);
}

/**
 * Add breadcrumb (navigation trail)
 */
export function addBreadcrumb(message: string, category?: string, data?: Record<string, any>) {
  Sentry.addBreadcrumb({
    message,
    category: category || 'custom',
    level: 'info',
    data,
  });
}

/**
 * Start performance transaction
 * Use for measuring operation duration
 */
export function startTransaction(name: string, op: string) {
  return Sentry.startTransaction({
    name,
    op,
  });
}

/**
 * Sentry Error Boundary Component
 * Wrap your app with this to catch React errors
 * 
 * @example
 * <SentryErrorBoundary fallback={<ErrorFallback />}>
 *   <App />
 * </SentryErrorBoundary>
 */
export const SentryErrorBoundary = Sentry.ErrorBoundary;

export default {
  initSentry,
  setSentryUser,
  clearSentryUser,
  setSentryContext,
  captureException,
  captureMessage,
  addBreadcrumb,
  startTransaction,
  SentryErrorBoundary,
  RELEASE_VERSION,
};
