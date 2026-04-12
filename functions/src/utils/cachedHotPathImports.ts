/**
 * Cached Hot Path Imports (Issue #7)
 * 
 * Move heavy dynamic imports out of hot path to module scope.
 * Reduces cold-start latency and improves P95/P99 latency.
 * 
 * Pattern:
 *   let cached: Promise<typeof mod> | null = null;
 *   function getMod() { return cached ??= import('...'); }
 * 
 * Usage:
 *   const mod = await getCachedModule();
 */

// Cached imports for hot path (conversationHandler)
let cachedSecureConsole: Promise<typeof import('./secureConsole')> | null = null;
export function getSecureConsole() {
  return cachedSecureConsole ??= import('./secureConsole');
}

let cachedReplyWithDeadline: Promise<typeof import('./replyWithDeadline')> | null = null;
export function getReplyWithDeadline() {
  return cachedReplyWithDeadline ??= import('./replyWithDeadline');
}

let cachedAsyncSafety: Promise<typeof import('./asyncSafety')> | null = null;
export function getAsyncSafety() {
  return cachedAsyncSafety ??= import('./asyncSafety');
}

let cachedContextualQuickReply: Promise<typeof import('../shared/contextualQuickReply')> | null = null;
export function getContextualQuickReply() {
  return cachedContextualQuickReply ??= import('../shared/contextualQuickReply');
}

let cachedPaymentStateMapper: Promise<typeof import('./paymentStateMapper')> | null = null;
export function getPaymentStateMapper() {
  return cachedPaymentStateMapper ??= import('./paymentStateMapper');
}

let cachedDraftStore: Promise<typeof import('../core/draftStore')> | null = null;
export function getDraftStore() {
  return cachedDraftStore ??= import('../core/draftStore');
}

let cachedCommandRouter: Promise<typeof import('../core/commandRouter')> | null = null;
export function getCommandRouter() {
  return cachedCommandRouter ??= import('../core/commandRouter');
}

let cachedConversationOrchestrator: Promise<typeof import('../core/conversationOrchestrator')> | null = null;
export function getConversationOrchestrator() {
  return cachedConversationOrchestrator ??= import('../core/conversationOrchestrator');
}

let cachedPaymentStateService: Promise<typeof import('../services/paymentStateService')> | null = null;
export function getPaymentStateService() {
  return cachedPaymentStateService ??= import('../services/paymentStateService');
}

let cachedConfig: Promise<typeof import('../shared/config')> | null = null;
export function getConfig() {
  return cachedConfig ??= import('../shared/config');
}

