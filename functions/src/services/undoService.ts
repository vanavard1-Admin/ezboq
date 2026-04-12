import { getDb } from '../core/firebaseAdmin';
/**
 * Undo Service
 * 
 * Implements safe, single-step undo system
 * 
 * RULES:
 * - Store minimal reversible payload
 * - Undo is single-step only
 * - No warnings or confirmations
 * - Hide undo if no undoable action exists
 */

import * as admin from "firebase-admin";
import type { QuickReplyAction } from '../shared/lineQuickReply';

/**
 * Undoable action types
 */
export enum UndoableAction {
  ADD_ITEM = 'ADD_ITEM',
  REMOVE_ITEM = 'REMOVE_ITEM',
  EDIT_ITEM = 'EDIT_ITEM',
  SET_CUSTOMER = 'SET_CUSTOMER',
}

/**
 * Undo payload structure
 */
export interface UndoPayload {
  action: UndoableAction;
  draftId: string;
  payload: Record<string, unknown>; // Action-specific data
  timestamp: admin.firestore.Timestamp;
}

/**
 * Store undo state
 */
export async function storeUndoState(
  userId: string,
  draftId: string,
  action: UndoableAction,
  payload: Record<string, unknown>
): Promise<void> {
  const db = getDb();
  const undoRef = db
    .collection('users')
    .doc(userId)
    .collection('drafts')
    .doc(draftId)
    .collection('undo')
    .doc('last');

  const undoPayload: UndoPayload = {
    action,
    draftId,
    payload,
    timestamp: admin.firestore.Timestamp.now(),
  };

  await undoRef.set(undoPayload);
}

/**
 * Get undo state
 */
export async function getUndoState(
  userId: string,
  draftId: string
): Promise<UndoPayload | null> {
  const db = getDb();
  const undoRef = db
    .collection('users')
    .doc(userId)
    .collection('drafts')
    .doc(draftId)
    .collection('undo')
    .doc('last');

  const snap = await undoRef.get();
  if (!snap.exists) {
    return null;
  }

  return snap.data() as UndoPayload;
}

/**
 * Clear undo state
 */
export async function clearUndoState(
  userId: string,
  draftId: string
): Promise<void> {
  const db = getDb();
  const undoRef = db
    .collection('users')
    .doc(userId)
    .collection('drafts')
    .doc(draftId)
    .collection('undo')
    .doc('last');

  await undoRef.delete();
}

/**
 * Check if undo is available
 */
export async function hasUndoAvailable(
  userId: string,
  draftId: string
): Promise<boolean> {
  const undoState = await getUndoState(userId, draftId);
  return undoState !== null;
}

/**
 * Get undo button (if available)
 */
export async function getUndoButton(
  userId: string,
  draftId: string
): Promise<QuickReplyAction | null> {
  const hasUndo = await hasUndoAvailable(userId, draftId);

  if (!hasUndo) {
    return null;
  }

  return {
    type: "action",
    action: {
      type: "message",
      label: "↩️ ย้อนกลับ",
      text: "ย้อนกลับ",
    },
  };
}

/**
 * Execute undo
 */
export async function executeUndo(
  userId: string,
  draftId: string
): Promise<{ success: boolean; message: string }> {
  const undoState = await getUndoState(userId, draftId);

  if (!undoState) {
    return {
      success: false,
      message: 'โอ๊ะ! ยังไม่มีรายการที่ย้อนกลับได้ครับเจ้านาย',
    };
  }

  // Import draft manager
  const draftManager = await import('../core/draftManager');

  try {
    switch (undoState.action) {
      case UndoableAction.ADD_ITEM: {
        // Remove the item that was added
        const addedItemName = undoState.payload.itemName as string;
        await draftManager.removeItem(draftId, addedItemName);
        break;
      }

      case UndoableAction.REMOVE_ITEM: {
        // Restore the item that was removed
        const removedItem = undoState.payload.item as {
          description_th: string;
          quantity: number;
          unit_price: number;
        };
        await draftManager.addItem(
          draftId,
          removedItem.description_th,
          removedItem.quantity,
          removedItem.unit_price
        );
        break;
      }

      case UndoableAction.EDIT_ITEM: {
        // Restore previous item state
        const previousItem = undoState.payload.previousItem as {
          description_th: string;
          quantity: number;
          unit_price: number;
        };
        await draftManager.updateItem(
          draftId,
          previousItem.description_th,
          previousItem.quantity,
          previousItem.unit_price
        );
        break;
      }

      case UndoableAction.SET_CUSTOMER: {
        // Restore previous customer
        const previousCustomer = undoState.payload.previousCustomer as string;
        await draftManager.setCustomer(draftId, previousCustomer);
        break;
      }

      default:
        return {
          success: false,
          message: 'โอ๊ะ! ย้อนกลับการกระทำนี้ไม่ได้ครับเจ้านาย',
        };
    }

    // Clear undo state after successful undo
    await clearUndoState(userId, draftId);

    return {
      success: true,
      message: 'ติ๊ดๆ ย้อนกลับรายการล่าสุดแล้วครับเจ้านาย',
    };
  } catch (error: any) {
    console.error('[undoService] Undo execution failed:', error);
    return {
      success: false,
      message: `โอ๊ะ! ระบบขัดข้องชั่วคราวครับเจ้านาย\nลองใหม่ได้เลยครับ`,
    };
  }
}
