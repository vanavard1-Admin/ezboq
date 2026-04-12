/**
 * Human-First UX State Machine
 * 
 * Simplified 3-state model:
 * - IDLE: No draft
 * - IN_DOCUMENT: Has draft (editing)
 * - WAITING_CONFIRM: Draft ready (has customer + at least 1 item)
 */

import type { QuickReplyAction } from '../shared/lineQuickReply';
import { getDraftEditorButtons, getMainMenuButtons } from '../ui/quickReplies';
import { getHumanFirstUxEnabled } from '../shared/config';

export enum HumanFirstState {
  IDLE = 'IDLE',
  IN_DOCUMENT = 'IN_DOCUMENT',
  WAITING_CONFIRM = 'WAITING_CONFIRM',
}

/**
 * Determine state from draft status
 */
export function determineHumanFirstState(
  hasDraft: boolean,
  hasCustomer: boolean,
  hasItems: boolean
): HumanFirstState {
  if (!hasDraft) {
    return HumanFirstState.IDLE;
  }
  
  if (hasCustomer && hasItems) {
    return HumanFirstState.WAITING_CONFIRM;
  }
  
  return HumanFirstState.IN_DOCUMENT;
}

/**
 * Get buttons for human-first state
 */
export function getHumanFirstButtons(state: HumanFirstState): QuickReplyAction[] {
  if (!getHumanFirstUxEnabled()) {
    return []; // Fallback to old system
  }
  
  switch (state) {
    case HumanFirstState.IDLE:
      // Main menu
      return getMainMenuButtons();
      
    case HumanFirstState.IN_DOCUMENT:
      // Editing buttons aligned with UX copy
      return getDraftEditorButtons(false);
      
    case HumanFirstState.WAITING_CONFIRM:
      // Ready to confirm (same button set for consistency)
      return getDraftEditorButtons(false);
      
    default:
      return [];
  }
}
