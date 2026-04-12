import { getDb } from '../core/firebaseAdmin';
/**
 * EzDoc - Business Setup Wizard Service
 * 
 * Step-by-step guided wizard for business setup.
 * Stores progress in userStateService.
 */

import * as admin from 'firebase-admin';
import { QuickReplyAction } from '../shared/lineQuickReply';
import { getWizardButtons } from '../ui/quickReplies';

const db = getDb();

export type WizardStep = 
  | 'BUSINESS_NAME'
  | 'ADDRESS'
  | 'TAX_ID'
  | 'PHONE'
  | 'EMAIL'
  | 'COMPLETE'
  | null;

export interface WizardState {
  step: WizardStep;
  completed: string[]; // List of completed field names
  data: {
    business_name?: string;
    address?: string;
    tax_id?: string;
    phone?: string;
    email?: string;
  };
}

/**
 * Get current wizard state for user
 */
export async function getWizardState(userId: string): Promise<WizardState | null> {
  const userDoc = await db.collection('users').doc(userId).get();
  if (!userDoc.exists) return null;

  const wizard = userDoc.data()?.business_setup_wizard;
  if (!wizard) return null;

  return {
    step: wizard.step || null,
    completed: wizard.completed || [],
    data: wizard.data || {},
  };
}

/**
 * Set wizard state for user
 */
export async function setWizardState(userId: string, state: WizardState): Promise<void> {
  await db.collection('users').doc(userId).set({
    business_setup_wizard: state,
    updated_at: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });
}

/**
 * Start wizard (reset to first step)
 */
export async function startWizard(userId: string): Promise<void> {
  await setWizardState(userId, {
    step: 'BUSINESS_NAME',
    completed: [],
    data: {},
  });
}

/**
 * Advance wizard to next step
 */
export async function advanceWizardStep(userId: string, currentStep: WizardStep, fieldValue: string): Promise<WizardStep> {
  const state = await getWizardState(userId);
  if (!state) return null;

  // Update data for current step
  const fieldMap: Record<string, keyof WizardState['data']> = {
    'BUSINESS_NAME': 'business_name',
    'ADDRESS': 'address',
    'TAX_ID': 'tax_id',
    'PHONE': 'phone',
    'EMAIL': 'email',
  };

  const fieldKey = fieldMap[currentStep || ''];
  if (fieldKey) {
    state.data[fieldKey] = fieldValue;
    state.completed.push(currentStep || '');
  }

  // Determine next step
  const steps: WizardStep[] = ['BUSINESS_NAME', 'ADDRESS', 'TAX_ID', 'PHONE', 'EMAIL'];
  const currentIndex = steps.indexOf(currentStep || 'BUSINESS_NAME');
  const nextStep = currentIndex < steps.length - 1 ? steps[currentIndex + 1] : 'COMPLETE';

  state.step = nextStep;
  await setWizardState(userId, state);

  return nextStep;
}

/**
 * Skip current step (optional fields only)
 */
export async function skipWizardStep(userId: string, currentStep: WizardStep): Promise<WizardStep> {
  const optionalSteps: WizardStep[] = ['TAX_ID', 'EMAIL'];
  if (!currentStep || !optionalSteps.includes(currentStep)) {
    return currentStep; // Cannot skip required steps
  }

  return await advanceWizardStep(userId, currentStep, '');
}

/**
 * Go back to previous step
 */
export async function goBackWizardStep(userId: string, currentStep: WizardStep): Promise<WizardStep> {
  const state = await getWizardState(userId);
  if (!state) return null;

  const steps: WizardStep[] = ['BUSINESS_NAME', 'ADDRESS', 'TAX_ID', 'PHONE', 'EMAIL'];
  const currentIndex = steps.indexOf(currentStep || 'BUSINESS_NAME');
  if (currentIndex <= 0) return currentStep; // Already at first step

  const prevStep = steps[currentIndex - 1];
  state.step = prevStep;
  await setWizardState(userId, state);

  return prevStep;
}

/**
 * Complete wizard and save to business profile
 */
export async function completeWizard(userId: string, businessId: string): Promise<void> {
  const state = await getWizardState(userId);
  if (!state) return;

  // Save to business profile
  const businessRef = db.collection('users').doc(userId).collection('businesses').doc(businessId);
  await businessRef.set({
    name: state.data.business_name || '',
    address: state.data.address || null,
    tax_id: state.data.tax_id || null,
    phone: state.data.phone || null,
    email: state.data.email || null,
    updated_at: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });

  // Mark onboarding as completed (user has completed business setup)
  const { completeOnboarding } = await import('./onboardingService');
  await completeOnboarding(userId);

  // Clear wizard state
  await setWizardState(userId, {
    step: 'COMPLETE',
    completed: [],
    data: {},
  });
}

/**
 * Get question text for wizard step
 */
export function getWizardQuestion(step: WizardStep): string {
  switch (step) {
    case 'BUSINESS_NAME':
      return 'ติ๊ดๆ ชื่อธุรกิจของเจ้านายคืออะไรครับ?';
    case 'ADDRESS':
      return 'ติ๊ดๆ ที่อยู่ของธุรกิจอยู่ที่ไหนครับ?';
    case 'TAX_ID':
      return 'ติ๊ดๆ เลขผู้เสียภาษี (ถ้ามี) ครับ\nพิมพ์ "ข้าม" เพื่อข้ามขั้นตอนนี้ได้เลย';
    case 'PHONE':
      return 'ติ๊ดๆ เบอร์โทรศัพท์ติดต่อคืออะไรครับ?';
    case 'EMAIL':
      return 'ติ๊ดๆ อีเมล (ถ้ามี) ครับ\nพิมพ์ "ข้าม" เพื่อข้ามขั้นตอนนี้ได้เลย';
    default:
      return '';
  }
}

/**
 * Get quick reply buttons for wizard step
 * 
 * REFACTORED: Uses ui/quickReplies.ts (Single Source of Truth)
 * 
 * HARDENING v2: Changed to sync function with static import
 * - No circular dependency: ui/quickReplies does NOT import wizardService
 * - contextualQuickReply imports wizardService (dynamic), but ui/quickReplies does NOT
 * - Safe to use static import for better performance and type safety
 */
export function getWizardQuickReply(step: WizardStep): QuickReplyAction[] {
  const isOptionalField = step === 'TAX_ID' || step === 'EMAIL';
  return getWizardButtons(isOptionalField);
}
