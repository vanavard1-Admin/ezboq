/**
 * Cached Dynamic Imports (Issue #7)
 * 
 * Move heavy imports out of hot path by caching at module scope.
 * Pattern: let cached: Promise<typeof mod> | null = null;
 *          function getMod(){ return cached ??= import('...'); }
 * 
 * Results:
 * - Lighter cold-start
 * - Better latency tail (p95/p99)
 * - Reduce chance of delay breaking reply deadline
 */

// Cache for payment state service
let paymentStateServiceCache: Promise<typeof import('../services/paymentStateService')> | null = null;
export function getPaymentStateService() {
  return paymentStateServiceCache ??= import('../services/paymentStateService');
}

// Cache for conversation orchestrator
let conversationOrchestratorCache: Promise<typeof import('./conversationOrchestrator')> | null = null;
export function getConversationOrchestrator() {
  return conversationOrchestratorCache ??= import('./conversationOrchestrator');
}

// Cache for command router
let commandRouterCache: Promise<typeof import('./commandRouter')> | null = null;
export function getCommandRouter() {
  return commandRouterCache ??= import('./commandRouter');
}

// Cache for draft store
let draftStoreCache: Promise<typeof import('./draftStore')> | null = null;
export function getDraftStore() {
  return draftStoreCache ??= import('./draftStore');
}

// Cache for human first copy
let humanFirstCopyCache: Promise<typeof import('../services/humanFirstCopy')> | null = null;
export function getHumanFirstCopy() {
  return humanFirstCopyCache ??= import('../services/humanFirstCopy');
}

// Cache for trust commands
let trustCommandsCache: Promise<typeof import('../services/trustCommands')> | null = null;
export function getTrustCommands() {
  return trustCommandsCache ??= import('../services/trustCommands');
}

// Cache for plan aware UI
let planAwareUICache: Promise<typeof import('../services/planAwareUI')> | null = null;
export function getPlanAwareUI() {
  return planAwareUICache ??= import('../services/planAwareUI');
}

// Cache for help copy
let helpCopyCache: Promise<typeof import('../services/helpCopy')> | null = null;
export function getHelpCopy() {
  return helpCopyCache ??= import('../services/helpCopy');
}

// Cache for contextual quick reply
let contextualQuickReplyCache: Promise<typeof import('../shared/contextualQuickReply')> | null = null;
export function getContextualQuickReply() {
  return contextualQuickReplyCache ??= import('../shared/contextualQuickReply');
}

// Cache for payment state mapper
let paymentStateMapperCache: Promise<typeof import('../utils/paymentStateMapper')> | null = null;
export function getPaymentStateMapper() {
  return paymentStateMapperCache ??= import('../utils/paymentStateMapper');
}

// Cache for human first allowlist
let humanFirstAllowlistCache: Promise<typeof import('./humanFirstAllowlist')> | null = null;
export function getHumanFirstAllowlist() {
  return humanFirstAllowlistCache ??= import('./humanFirstAllowlist');
}

// Cache for config
let configCache: Promise<typeof import('../shared/config')> | null = null;
export function getConfig() {
  return configCache ??= import('../shared/config');
}

