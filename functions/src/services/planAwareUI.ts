/**
 * Plan-Aware UI Service
 * 
 * Controls feature visibility based on user plan
 * 
 * CORE PRINCIPLE:
 * - If a feature cannot be used by the plan, it must not exist in the UI at all
 * - No disabled buttons, no lock icons, no upgrade hints inside flow
 * 
 * REFACTORED: Now uses ui/quickReplies.ts
 */

import { getUserPlan, type Plan } from '../core/planService';
import type { QuickReplyAction } from '../shared/lineQuickReply';
import { getPlanAwareMainMenu as getPlanAwareMainMenuFromUI } from '../ui/quickReplies';

/**
 * Get plan-aware main menu buttons
 * 
 * FREE: Only Quotation
 * PRO/TEAM: Full flow (Quotation, Invoice, Receipt)
 * 
 * REFACTORED: Delegates to ui/quickReplies.ts
 */
export async function getPlanAwareMainMenu(userId: string): Promise<QuickReplyAction[]> {
  return getPlanAwareMainMenuFromUI(userId);
}

/**
 * Check if user can access a document type
 */
export async function canAccessDocumentType(
  userId: string,
  docType: 'QUO' | 'INV' | 'REC'
): Promise<boolean> {
  const plan = await getUserPlan(userId);
  
  if (docType === 'QUO') {
    return true; // All plans can create quotations
  }
  
  if (docType === 'INV' || docType === 'REC') {
    return plan === 'PRO' || plan === 'TEAM';
  }
  
  return false;
}

/**
 * Get plan-aware document creation buttons
 * Used when user wants to create a document
 * 
 * REFACTORED: Uses getPlanAwareMainMenu (same buttons)
 */
export async function getPlanAwareDocumentButtons(userId: string): Promise<QuickReplyAction[]> {
  // Same as main menu (filtered by plan)
  return getPlanAwareMainMenu(userId);
}

/**
 * Filter buttons based on plan
 * Removes buttons for features user cannot access
 */
export function filterButtonsByPlan(
  buttons: QuickReplyAction[],
  plan: Plan
): QuickReplyAction[] {
  // Filter out Invoice/Receipt buttons for FREE users
  if (plan === 'FREE') {
    return buttons.filter(btn => {
      const text = btn.action.text.toLowerCase();
      return !text.includes('ใบวางบิล') && !text.includes('ใบเสร็จ') && !text.includes('invoice') && !text.includes('receipt');
    });
  }
  
  return buttons;
}

