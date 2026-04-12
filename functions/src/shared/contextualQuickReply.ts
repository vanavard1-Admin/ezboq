/**
 * EzDoc - Contextual Quick Reply System
 * 
 * Provides persistent, context-aware Quick Reply buttons for better UX.
 * Buttons change based on user state to minimize manual typing.
 * 
 * REFACTORED: Now uses ui/quickReplies.ts as Single Source of Truth
 */

import type { QuickReplyAction } from './lineQuickReply';
import {
  getGlobalMenuButtons,
  getDraftEditorButtons,
  getEmptyDraftButtons,
  getDraftWithItemsButtons,
  getWizardButtons,
  getIncompleteSetupButtons,
  getPaymentRetryButtons,
  getPaymentSuccessButtons,
  getSuccessButtons,
  getEmptyButtons,
} from '../ui/quickReplies';

export type QuickReplyContext = 
  | 'GLOBAL'           // Default state - show main menu
  | 'WIZARD'           // User is in wizard flow
  | 'INCOMPLETE_SETUP' // Business setup incomplete
  | 'SUCCESS'          // After successful action
  | 'DRAFT_EDITING'    // User is editing a draft
  | 'PAYMENT'          // Payment flow (suppress buttons)
  | 'PAYMENT_RETRY'    // Payment retry flow
  | 'PAYMENT_SUCCESS';  // Payment success

export interface QuickReplyContextParams {
  context: QuickReplyContext;
  wizardStep?: string | null;  // For WIZARD context
  missingFields?: string[];   // For INCOMPLETE_SETUP context
  isOptionalField?: boolean;   // For WIZARD context (current field is optional)
  hasUndo?: boolean;           // For DRAFT_EDITING context
  hasItems?: boolean;          // For DRAFT_EDITING context
}

/**
 * Get contextual Quick Reply buttons based on user state
 * 
 * DETERMINISTIC: Same input = same output
 * Payment flow ALWAYS suppresses buttons (returns empty array)
 * 
 * This is the single source of truth for Quick Reply button decisions.
 * All message sending should use this function to ensure consistent UX.
 */
export function getContextualQuickReply(params: QuickReplyContextParams): QuickReplyAction[] {
  const { context, missingFields, isOptionalField, hasUndo, hasItems } = params;

  switch (context) {
    case 'PAYMENT':
      // CRITICAL: Payment flow MUST suppress buttons
      return getEmptyButtons();

    case 'PAYMENT_RETRY':
      return getPaymentRetryButtons();

    case 'PAYMENT_SUCCESS':
      return getPaymentSuccessButtons();

    case 'WIZARD':
      return getWizardButtons(isOptionalField || false);

    case 'INCOMPLETE_SETUP':
      return getIncompleteSetupButtons(missingFields || []);

    case 'SUCCESS':
      return getSuccessButtons();

    case 'DRAFT_EDITING':
      if (hasItems === false) {
        return getEmptyDraftButtons();
      }
      if (hasItems === true) {
        return getDraftWithItemsButtons(hasUndo || false);
      }
      // Default draft editing
      return getDraftEditorButtons(hasUndo || false);

    case 'GLOBAL':
    default:
      return getGlobalMenuButtons();
  }
  }

// All button builders moved to ui/quickReplies.ts
// This file now only handles context determination

/**
 * Helper: Determine context from user state
 * 
 * DETERMINISTIC: Same user state = same context
 * Payment flow ALWAYS returns PAYMENT context (suppresses buttons)
 * 
 * This function analyzes user state and returns the appropriate context.
 * Used by conversation handler to decide which buttons to show.
 */
export async function determineQuickReplyContext(params: {
  userId: string;
  businessId?: string; // Optional: Skip checklist check if missing
  hasActiveDraft?: boolean;
  draftHasItems?: boolean;
  draftHasUndo?: boolean;
  paymentState?: 'PROCESSING' | 'RETRY' | 'SUCCESS' | null;
  traceId?: string; // Optional trace ID for logging
}): Promise<QuickReplyContextParams> {
  const startTime = Date.now();
  const { userId, businessId, hasActiveDraft, draftHasItems, draftHasUndo, paymentState, traceId } = params;

  // CRITICAL: Payment flow MUST suppress buttons
  if (paymentState === 'PROCESSING') {
    return {
      context: 'PAYMENT', // Returns empty buttons
    };
  }
  
  if (paymentState === 'RETRY') {
    return {
      context: 'PAYMENT_RETRY',
    };
  }
  
  if (paymentState === 'SUCCESS') {
    return {
      context: 'PAYMENT_SUCCESS',
    };
  }

  // Check payment state service (fallback if paymentState not provided)
  try {
    const { isInPaymentFlow } = await import('../services/paymentStateService');
    const inPaymentFlow = await isInPaymentFlow(userId);
    if (inPaymentFlow) {
      return {
        context: 'PAYMENT', // Returns empty buttons
      };
    }
  } catch (paymentErr) {
    console.warn(`[contextualQuickReply] Failed to check payment state:`, paymentErr);
    // Continue - don't block button determination
  }

  // Check for active wizard
  const { getWizardState } = await import('../services/wizardService');
  const wizardState = await getWizardState(userId);
  
  if (wizardState && wizardState.step && wizardState.step !== 'COMPLETE') {
    // User is in wizard
    const optionalSteps = ['TAX_ID', 'EMAIL'];
    return {
      context: 'WIZARD',
      wizardStep: wizardState.step,
      isOptionalField: optionalSteps.includes(wizardState.step),
    };
  }

  // Check for active draft
  if (hasActiveDraft) {
    return {
      context: 'DRAFT_EDITING',
      hasItems: draftHasItems,
      hasUndo: draftHasUndo,
    };
  }

  // Check for incomplete business setup (only if businessId is provided)
  if (businessId) {
    const { getBusinessChecklist } = await import('../services/businessService');
    const checklist = await getBusinessChecklist(userId, businessId);
    
    const criticalFields = ['name', 'address', 'phone'];
    const missingFields = checklist.items
      .filter(item => criticalFields.includes(item.field) && !item.completed)
      .map(item => item.field === 'name' ? 'business_name' : item.field);
    
    if (missingFields.length > 0) {
      return {
        context: 'INCOMPLETE_SETUP',
        missingFields,
      };
    }
  }

  // Default: Global context
  const durationMs = Date.now() - startTime;
  if (traceId) {
    console.log(JSON.stringify({
      tag: '[determineQuickReplyContext]',
      traceId,
      userId,
      durationMs,
      context: 'GLOBAL',
    }));
  }
  
  return {
    context: 'GLOBAL',
  };
}

