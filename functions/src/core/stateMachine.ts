import { getDb } from './firebaseAdmin';
/**
 * Document State Machine (Spec v1.0)
 * STRICT ENFORCEMENT - Do not modify logic without changing spec.
 */

import * as admin from 'firebase-admin';

// 1) Canonical States (Enum)
export enum DocumentState {
    DRAFT = "DRAFT",                 // Editable by user
    READY = "READY",                 // Draft complete, editable
    ISSUED = "ISSUED",               // User confirmed, frozen
    PDF_RENDERING = "PDF_RENDERING", // System only
    PDF_READY = "PDF_READY",         // PDF generated
    DELIVERED = "DELIVERED",         // LINE sent
    VOID = "VOID"                    // Terminal
}

export class InvalidStateTransitionError extends Error {
    constructor(from: string, to: string) {
        super(`Invalid state transition: ${from} -> ${to}`);
        this.name = 'InvalidStateTransitionError';
    }
}

// 2) Allowed Transitions Table & 4) Transition Guard
const ALLOWED: Record<DocumentState, DocumentState[]> = {
    [DocumentState.DRAFT]: [DocumentState.READY, DocumentState.VOID],
    [DocumentState.READY]: [DocumentState.DRAFT, DocumentState.ISSUED, DocumentState.VOID],
    [DocumentState.ISSUED]: [DocumentState.PDF_RENDERING, DocumentState.VOID],
    // System Transitions
    [DocumentState.PDF_RENDERING]: [
        DocumentState.PDF_READY,
        DocumentState.ISSUED // Allow rollback to ISSUED on failure for retry (Spec Section 8)
    ],
    [DocumentState.PDF_READY]: [
        DocumentState.DELIVERED,
        DocumentState.VOID // Spec says ANY -> VOID
    ],
    [DocumentState.DELIVERED]: [
        DocumentState.VOID // Spec says ANY -> VOID
    ],
    [DocumentState.VOID]: []
};

// 4) Transition Guard
export function assertTransition(from: DocumentState, to: DocumentState): void {
    const targets = ALLOWED[from];
    if (!targets || !targets.includes(to)) {
        throw new InvalidStateTransitionError(from, to);
    }
}

// Helper to get enum from string (safe parsing)
export function parseDocumentState(status: string): DocumentState {
    if (Object.values(DocumentState).includes(status as DocumentState)) {
        return status as DocumentState;
    }
    throw new Error(`Invalid DocumentState: ${status}`);
}

/**
 * Get the action name for a transition
 */
export function getTransitionAction(from: string, to: string): string {
    // Basic mapping, can be enriched
    if (to === DocumentState.VOID) return 'void';
    if (from === DocumentState.DRAFT && to === DocumentState.READY) return 'ready';
    if (from === DocumentState.READY && to === DocumentState.DRAFT) return 'unready';
    if (to === DocumentState.ISSUED) return 'confirm'; // or retry
    if (to === DocumentState.PDF_RENDERING) return 'render_pdf';
    if (to === DocumentState.PDF_READY) return 'pdf_complete';
    if (to === DocumentState.DELIVERED) return 'deliver';
    return 'unknown_transition';
}

// 5) Audit Logging
export async function logStatusTransition(params: {
    docId: string;
    docPath: string;
    userId: string;
    businessId: string;
    fromStatus: string;
    toStatus: string;
    action: string;
    metadata?: Record<string, unknown>;
}): Promise<void> {
    const db = getDb();

    // Valid transitions only (assertTransition should be called before this)

    const auditEntry = {
        type: 'STATUS_TRANSITION',
        docId: params.docId,
        docPath: params.docPath,
        userId: params.userId,
        businessId: params.businessId,
        fromStatus: params.fromStatus,
        toStatus: params.toStatus,
        action: params.action,
        metadata: params.metadata || {},
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        expiresAt: admin.firestore.Timestamp.fromDate(
            new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000)
        ),
    };

    await db.collection('auditLogs').add(auditEntry);

    console.log('[STATE_TRANSITION]', JSON.stringify({
        docId: params.docId,
        from: params.fromStatus,
        to: params.toStatus,
        action: params.action
    }));
}
