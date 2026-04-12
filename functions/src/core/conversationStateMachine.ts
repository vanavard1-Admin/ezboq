/**
 * Button-First State Machine
 * 
 * Defines explicit states for conversation flows
 * Each state defines:
 * - Allowed actions
 * - Visible buttons
 * - Next states
 * 
 * RULES:
 * - Buttons drive transitions
 * - Text input is used ONLY for actual data entry
 * - Never show irrelevant or disabled buttons
 * 
 * REFACTORED: All button builders use ui/quickReplies.ts (Single Source of Truth)
 */

import { ConversationState } from './conversationOrchestrator';
import type { QuickReplyAction } from '../shared/lineQuickReply';
import {
  getDraftEmptyButtons,
  getAwaitingItemInputButtons,
  getItemAddedButtons,
  getItemsExistButtons,
  getAwaitingCustomerInputButtons,
  getReviewReadyButtons,
  getAwaitConfirmButtons,
  getIssuedButtons,
  getCompletedButtons,
} from '../ui/quickReplies';

/**
 * Conversation states with button definitions
 */
export enum ButtonState {
  // Initial states
  IDLE = 'IDLE',
  DRAFT_EMPTY = 'DRAFT_EMPTY',
  
  // Item management
  AWAITING_ITEM_INPUT = 'AWAITING_ITEM_INPUT',
  ITEM_ADDED = 'ITEM_ADDED',
  ITEMS_EXIST = 'ITEMS_EXIST',
  
  // Customer management
  AWAITING_CUSTOMER_INPUT = 'AWAITING_CUSTOMER_INPUT',
  CUSTOMER_SET = 'CUSTOMER_SET',
  
  // Review and confirmation
  REVIEW_READY = 'REVIEW_READY',
  AWAIT_CONFIRM = 'AWAIT_CONFIRM',
  
  // Final states
  ISSUED = 'ISSUED',
  COMPLETED = 'COMPLETED',
}

/**
 * Get buttons for a specific state
 */
export function getButtonsForState(
  state: ButtonState,
  hasItems: boolean = false,
  hasCustomer: boolean = false
): QuickReplyAction[] {
  void hasItems;
  switch (state) {
    case ButtonState.IDLE:
      // Main menu - will be filtered by plan
      return [];

    case ButtonState.DRAFT_EMPTY:
      return getDraftEmptyButtons(hasCustomer);

    case ButtonState.AWAITING_ITEM_INPUT:
      return getAwaitingItemInputButtons();

    case ButtonState.ITEM_ADDED:
      return getItemAddedButtons();

    case ButtonState.ITEMS_EXIST:
      return getItemsExistButtons(hasCustomer);

    case ButtonState.AWAITING_CUSTOMER_INPUT:
      return getAwaitingCustomerInputButtons();

    case ButtonState.REVIEW_READY:
      return getReviewReadyButtons();

    case ButtonState.AWAIT_CONFIRM:
      return getAwaitConfirmButtons();

    case ButtonState.ISSUED:
      return getIssuedButtons();

    case ButtonState.COMPLETED:
      return getCompletedButtons();

    default:
      return [];
  }
}

/**
 * Map ConversationState to ButtonState
 */
export function mapToButtonState(
  conversationState: ConversationState,
  hasItems: boolean,
  hasCustomer: boolean
): ButtonState {
  switch (conversationState) {
    case ConversationState.IDLE:
      return ButtonState.IDLE;

    case ConversationState.DRAFTING_QUO:
    case ConversationState.DRAFTING_INVOICE:
    case ConversationState.DRAFTING_RECEIPT:
      if (!hasItems && !hasCustomer) {
        return ButtonState.DRAFT_EMPTY;
      }
      if (hasItems) {
        return ButtonState.ITEMS_EXIST;
      }
      return ButtonState.DRAFT_EMPTY;

    case ConversationState.AWAIT_CONFIRM:
      return ButtonState.AWAIT_CONFIRM;

    case ConversationState.ISSUING:
      return ButtonState.ISSUED;

    case ConversationState.COMPLETED:
      return ButtonState.COMPLETED;

    default:
      return ButtonState.IDLE;
  }
}
