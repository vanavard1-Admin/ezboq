/**
 * State-Aware Fallback Messages
 * 
 * CRITICAL: Never resets conversation state on unrecognized input.
 * Provides context-specific help based on current user state.
 */

import { QuickReplyAction } from '../shared/lineQuickReply';

export interface UserState {
  conversationState?: string;
  hasActiveDraft?: boolean;
  paymentState?: string;
  wizardStep?: string | null;
  missingBusinessFields?: string[];
}

/**
 * Get state-aware fallback message
 * 
 * ✅ FIX 4: Never resets state, always provides context-specific help
 * 
 * @param userId - User ID
 * @param state - User state
 * @param traceId - Optional trace ID for logging
 */
export async function getStateAwareFallback(
  userId: string,
  state: UserState,
  traceId?: string
): Promise<{ message: string; quickReply?: QuickReplyAction[] }> {
  const startTime = Date.now();
  const { conversationState, hasActiveDraft, paymentState, wizardStep, missingBusinessFields } = state;

  // Priority 1: Payment flow (highest priority - never interrupt)
  if (paymentState && paymentState !== 'NO_PAYMENT') {
    const { getPaymentStatusMessage } = await import('../services/paymentStateService');
    const paymentMessage = await getPaymentStatusMessage(userId);
    if (paymentMessage) {
      return {
        message: paymentMessage,
        // No quick reply during payment (buttons would be confusing)
      };
    }
  }

  // Priority 2: Wizard flow
  if (wizardStep && wizardStep !== 'COMPLETE') {
    const wizardStartTime = Date.now();
    const { getWizardQuestion, getWizardQuickReply } = await import('../services/wizardService');
    // wizardStep is string | null, but getWizardQuestion expects WizardStep type
    // Type assertion is safe here because we already checked wizardStep !== 'COMPLETE'
    const question = getWizardQuestion(wizardStep as any);
    const buttons = getWizardQuickReply(wizardStep as any); // HARDENING v2: Now sync function
    const wizardDurationMs = Date.now() - wizardStartTime;
    
    if (traceId) {
      console.log(JSON.stringify({
        tag: '[stateAwareFallback]',
        traceId,
        userId,
        path: 'wizard',
        durationMs: wizardDurationMs,
        step: wizardStep,
      }));
    }
    
    return {
      message: question || 'โอ๊ะ! ตอบคำถามด้านบนนิดนึงนะครับเจ้านาย',
      quickReply: buttons,
    };
  }

  // Priority 3: Draft editing state
  if (hasActiveDraft || conversationState) {
    const draftStartTime = Date.now();
    const { determineQuickReplyContext, getContextualQuickReply } = await import('../shared/contextualQuickReply');
    const { getPaymentStateParam } = await import('../utils/paymentStateMapper');
    
    // CRITICAL: Get payment state to ensure deterministic payment flow
    // HARDENING v3: Use fast-path cache (no DB reads in fallback)
    const paymentStateParam = await getPaymentStateParam(userId, true, traceId); // useCache=true for fallback
    
    // HARDENING v2: Do NOT read Firestore/lineLink in fallback path (latency risk)
    // businessId is optional - determineQuickReplyContext will skip checklist check if missing
    const contextStartTime = Date.now();
    const contextParams = await determineQuickReplyContext({
      userId,
      // businessId omitted - rely on guard in determineQuickReplyContext()
      hasActiveDraft,
      paymentState: paymentStateParam, // CRITICAL: Send payment state
    });
    const contextDurationMs = Date.now() - contextStartTime;
    const buttons = getContextualQuickReply(contextParams);
    const draftDurationMs = Date.now() - draftStartTime;
    
    if (traceId) {
      console.log(JSON.stringify({
        tag: '[stateAwareFallback]',
        traceId,
        userId,
        path: 'draft',
        durationMs: draftDurationMs,
        contextDurationMs,
        hasActiveDraft,
        conversationState,
      }));
    }
    
    return {
      message: 'ติ๊ดๆ ด๊อกๆ ยังจับไม่ครบ แต่ร่างยังอยู่ครับเจ้านาย\n\n' +
        'ลองพิมพ์แบบนี้ได้เลยครับ\n' +
        '1. ลูกค้า แมวจร (หรือ ลูกค้าแมวจร)\n' +
        '2. อาหารแมว 3000 (หรือ อาหารแมว3000)\n' +
        '3. เพิ่มรายการ ชื่อรายการ ราคา',
      quickReply: buttons,
    };
  }

  // Priority 4: Incomplete business setup
  if (missingBusinessFields && missingBusinessFields.length > 0) {
    const { getContextualQuickReply } = await import('../shared/contextualQuickReply');
    
    // HARDENING v2: Do NOT read Firestore/lineLink in fallback path (latency risk)
    // Note: missingBusinessFields already provided, so we can use INCOMPLETE_SETUP context directly
    // Override to show business setup button prominently (missingBusinessFields already known)
    const buttons = getContextualQuickReply({
      context: 'INCOMPLETE_SETUP',
      missingFields: missingBusinessFields,
    });
    
    return {
      message: 'โอ๊ะ! ยังตั้งค่าธุรกิจไม่ครบครับเจ้านาย\n' +
        'เลือกปุ่มด้านล่างได้เลยครับ',
      quickReply: buttons,
    };
  }

  // Priority 5: Global fallback (no active state)
  const globalStartTime = Date.now();
  const { getPlanAwareMainMenu } = await import('../services/planAwareUI');
  const buttons = await getPlanAwareMainMenu(userId);
  const globalDurationMs = Date.now() - globalStartTime;
  
  const totalDurationMs = Date.now() - startTime;
  if (traceId) {
    console.log(JSON.stringify({
      tag: '[stateAwareFallback]',
      traceId,
      userId,
      path: 'global',
      durationMs: totalDurationMs,
      globalDurationMs,
    }));
  }
  
  return {
    message: 'ติ๊ดๆ ด๊อกๆ ช่วยต่อให้ได้นะครับเจ้านาย\n\n' +
      'เลือกได้เลยครับ\n' +
      '1. สร้างเอกสาร (ใบเสนอราคา/ใบวางบิล/ใบเสร็จ)\n' +
      '2. ตั้งค่าธุรกิจ\n' +
      '3. ดูรายงาน',
    quickReply: buttons,
  };
}

/**
 * Check if input should preserve current state
 * Returns true if input is ambiguous/unrecognized but state should be preserved
 */
export function shouldPreserveState(intent: string, state: UserState): boolean {
  // If intent is UNKNOWN and user has active state, preserve it
  if (intent === 'UNKNOWN') {
    return !!(state.conversationState || state.hasActiveDraft || state.wizardStep || 
              (state.paymentState && state.paymentState !== 'NO_PAYMENT'));
  }
  
  // Explicit reset commands should NOT preserve state
  const resetCommands = ['HELP', 'BUSINESS_SETUP'];
  if (resetCommands.includes(intent)) {
    return false;
  }
  
  return true;
}
