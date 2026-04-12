/**
 * Firestore Trigger: Sync subscription status between collections
 *
 * When credit_purchases/{purchaseId} transitions to PAID (from LINE bot flow),
 * also update workspaces/{userId}/subscription/current for the web frontend.
 *
 * This bridges the gap between:
 * - LINE bot flow: writes to credit_purchases + subscriptions/{userId}
 * - Web frontend: reads from workspaces/{wsId}/subscription/current
 */

import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import { sendSubscriptionConfirmationEmail } from '../services/subscriptionEmailService';

interface CreditPurchase {
  userId: string;
  status: string;
  plan?: string;
  packageKind?: string;
  packageType?: number;
  amount?: number;
  paidAt?: admin.firestore.Timestamp;
  payment_verified_at?: admin.firestore.Timestamp;
  seat_total?: number;
}

const PLAN_MAP: Record<string, string> = {
  PRO: 'solo',
  TEAM: 'team',
};

export const onCreditPurchasePaid = functions
  .region('asia-southeast1')
  .runWith({
    secrets: ['SENDGRID_API_KEY', 'SENDGRID_FROM_EMAIL'],
    memory: '256MB',
    timeoutSeconds: 30,
  })
  .firestore.document('credit_purchases/{purchaseId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data() as CreditPurchase;
    const after = change.after.data() as CreditPurchase;

    // Only trigger on status transition to PAID
    if (before.status === 'PAID' || after.status !== 'PAID') return;
    // Only for subscription purchases
    if (after.packageKind !== 'SUBSCRIPTION') return;

    const userId = after.userId;
    if (!userId) return;

    const purchaseId = context.params.purchaseId;
    console.log(`[subscriptionSync] Syncing PAID purchase ${purchaseId} for user ${userId}`);

    const db = admin.firestore();

    // Determine plan and duration
    const planId = PLAN_MAP[after.plan || 'PRO'] || 'solo';
    const now = new Date();
    const paidAt = after.paidAt?.toDate() || after.payment_verified_at?.toDate() || now;
    const endDate = new Date(paidAt);
    endDate.setDate(endDate.getDate() + 30);

    // Get user info for subscription record
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();
    const workspaceId = userData?.workspaceId || userId;

    const subData = {
      plan: planId,
      status: 'active',
      startDate: paidAt.toISOString(),
      endDate: endDate.toISOString(),
      approvedBy: 'line_payment_sync',
      approvedAt: now.toISOString(),
      userName: userData?.name || '',
      userEmail: userData?.email || userData?.lineEmail || '',
      workspaceId,
      paymentHistory: [{
        amount: after.amount || 0,
        date: paidAt.toISOString(),
        method: 'promptpay' as const,
        note: `LINE Bot payment (${purchaseId})`,
      }],
      createdAt: paidAt.toISOString(),
    };

    // Update workspace subscription (what the web frontend reads)
    const subRef = db.collection('workspaces').doc(workspaceId)
      .collection('subscription').doc('current');

    await subRef.set(subData, { merge: true });

    console.log(`[subscriptionSync] Synced: workspace=${workspaceId}, plan=${planId}, endDate=${endDate.toISOString()}`);

    // Send confirmation email to user
    const userEmail = (userData?.email || userData?.lineEmail || '') as string;
    const userName = (userData?.name || '') as string;
    if (userEmail) {
      await sendSubscriptionConfirmationEmail({
        email: userEmail,
        name: userName,
        plan: planId,
        startDate: paidAt.toISOString(),
        endDate: endDate.toISOString(),
        amount: after.amount || 0,
      }).catch((err) => console.warn('[subscriptionSync] Email send failed:', err));
    }
  });
