import { getDb } from '../core/firebaseAdmin';
/**
 * Conversation State Service
 * 
 * Tracks conversation state for button-first UX
 * State machine is the SINGLE source of truth
 */

import * as admin from "firebase-admin";
import { ButtonState } from "../core/conversationStateMachine";

const db = getDb();

/**
 * Get current conversation state for user
 */
export async function getConversationState(userId: string): Promise<ButtonState> {
  try {
    const stateDoc = await db.collection("users").doc(userId).collection("conversation_state").doc("current").get();

    if (!stateDoc.exists) {
      return ButtonState.IDLE;
    }

    const data = stateDoc.data();

    // ✅ FIX 7: Check state TTL and auto-clear if expired
    const expiresAt = data?.expiresAt as admin.firestore.Timestamp | undefined;
    if (expiresAt && expiresAt.toMillis() < Date.now()) {
      console.log(`[conversationStateService] State expired for userId=${userId}, clearing`);
      await clearConversationState(userId);
      return ButtonState.IDLE;
    }

    const state = data?.state as ButtonState | undefined;

    if (state && Object.values(ButtonState).includes(state)) {
      return state;
    }

    return ButtonState.IDLE;
  } catch (error) {
    console.error(`[conversationStateService] Error getting state for userId=${userId}:`, error);
    return ButtonState.IDLE;
  }
}

/**
 * Set conversation state for user
 */
export async function setConversationState(
  userId: string,
  state: ButtonState,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    // ✅ FIX 7: Add state TTL (30 minutes)
    const expiresAt = admin.firestore.Timestamp.fromMillis(
      Date.now() + 30 * 60 * 1000 // 30 minutes
    );

    await db.collection("users").doc(userId).collection("conversation_state").doc("current").set({
      state,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt, // ✅ FIX 7: State TTL
      ...metadata,
    }, { merge: true });

    console.log(`[conversationStateService] State updated: userId=${userId}, state=${state}`);
  } catch (error) {
    console.error(`[conversationStateService] Error setting state:`, error);
    throw error;
  }
}

/**
 * Clear conversation state (return to IDLE)
 */
export async function clearConversationState(userId: string): Promise<void> {
  await setConversationState(userId, ButtonState.IDLE);
}

/**
 * Check if state uses buttons (button-capable state)
 */
export function usesButtons(state: ButtonState): boolean {
  return state !== ButtonState.IDLE && state !== ButtonState.COMPLETED;
}

/**
 * Get state metadata (e.g., pending item name, pending customer name)
 */
export async function getStateMetadata(userId: string): Promise<Record<string, unknown>> {
  try {
    const stateDoc = await db.collection("users").doc(userId).collection("conversation_state").doc("current").get();

    if (!stateDoc.exists) {
      return {};
    }

    const data = stateDoc.data() || {};
    // Remove internal fields
    const { state: _state, updatedAt: _updatedAt, ...metadata } = data;
    void _state;
    void _updatedAt;
    return metadata;
  } catch (error) {
    console.error(`[conversationStateService] Error getting metadata:`, error);
    return {};
  }
}

/**
 * Set state metadata
 */
export async function setStateMetadata(
  userId: string,
  metadata: Record<string, unknown>
): Promise<void> {
  try {
    const stateDoc = await db.collection("users").doc(userId).collection("conversation_state").doc("current");
    await stateDoc.set({
      ...metadata,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
  } catch (error) {
    console.error(`[conversationStateService] Error setting metadata:`, error);
    throw error;
  }
}
