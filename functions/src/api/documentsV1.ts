import { getDb } from '../core/firebaseAdmin';
/**
 * Documents API v1 - Service-to-Service Endpoints
 * For PDF Service and other internal services
 */

import express, { Request, Response } from 'express';
import * as admin from 'firebase-admin';
import {
  pdfServiceAuthMiddleware,
  ServiceAuthRequest
} from '../middleware/serviceAuth';
import { enqueueLineDelivery } from '../services/deliveryQueueService';
import { saveDocumentVerificationRecordFromSnapshot } from '../services/verificationService';
import { signPdfPath } from '../shared/pdfSigning';
import { assertTransition, logStatusTransition, DocumentState } from '../core/stateMachine'; // Spec v1.0

const router = express.Router();

async function handleGetNestedDocument(params: {
  userId: string;
  businessId: string;
  docId: string;
  includeItems: boolean;
  res: Response;
}): Promise<void> {
  const { userId, businessId, docId, includeItems, res } = params;

  console.log(
    `[Documents API] GET /v1/users/${userId}/businesses/${businessId}/documents/${docId} (includeItems=${includeItems})`
  );

  const db = getDb();
  const docRef = db.doc(`users/${userId}/businesses/${businessId}/documents/${docId}`);
  const docSnap = await docRef.get();

  if (!docSnap.exists) {
    res.status(404).json({
      success: false,
      error: 'NOT_FOUND',
      message: `Document ${docId} not found`,
    });
    return;
  }

  const docData = docSnap.data()!;
  const items = includeItems ? (docData.items || []) : undefined;

  res.json({
    success: true,
    data: {
      id: docSnap.id,
      userId,
      businessId,
      docType: docData.doc_type,
      docNo: docData.doc_no,
      docDate: docData.issue_date?.toDate()?.toISOString().split('T')[0] || null,
      status: docData.status,
      priceType: docData.price_type || null,
      lumpSumAmount: docData.lump_sum_amount || null,
      scopeOfWork: docData.scope_of_work || [],
      paymentMilestones: docData.payment_milestones || [],

      customerName: docData.customer_snapshot?.name || docData.customer_name,
      customerAddress: docData.customer_snapshot?.address || null,
      customerTaxId: docData.customer_snapshot?.tax_id || docData.customer_tax_id,

      items: includeItems ? items : undefined,

      subTotal: docData.sub_total_amount || 0,
      discountAmount: docData.discount_amount || 0,
      vatAmount: docData.vat_amount || 0,
      vatPercent: docData.tax_snapshot?.vat_percent || docData.vat_percent || 7,
      totalAmount: docData.total_amount || 0,

      dueDate: docData.due_date?.toDate()?.toISOString().split('T')[0] || null,
      paymentMethod: docData.payment_method || null,
      paymentDate: docData.payment_date?.toDate()?.toISOString().split('T')[0] || null,
      paymentRefNo: docData.payment_ref_no || null,
      notes: docData.notes || null,

      paymentSnapshot: docData.payment_snapshot || null,

      business: {
        name: docData.business_snapshot?.name || 'ไม่ระบุ',
        address: docData.business_snapshot?.address || null,
        taxId: docData.business_snapshot?.tax_id || docData.business_snapshot?.taxId || null,
        branch: docData.business_snapshot?.branch || null,
        phone: docData.business_snapshot?.phone || null,
        email: docData.business_snapshot?.email || null,
        logoUrl: docData.business_snapshot?.logo_url || docData.business_snapshot?.logoUrl || null,
        bankName:
          docData.business_snapshot?.bank_name ||
          docData.business_snapshot?.bankName ||
          null,
        bankAccountNo:
          docData.business_snapshot?.bank_account_no ||
          docData.business_snapshot?.bankAccountNo ||
          null,
        bankAccountName:
          docData.business_snapshot?.bank_account_name ||
          docData.business_snapshot?.bankAccountName ||
          null,
        promptpayAccount:
          docData.business_snapshot?.promptpay_account ||
          docData.business_snapshot?.promptpayAccount ||
          null,
        promptpayName:
          docData.business_snapshot?.promptpay_name ||
          docData.business_snapshot?.promptpayName ||
          null,
        promptpayQrUrl:
          docData.business_snapshot?.promptpay_qr_url ||
          docData.business_snapshot?.promptpayQrUrl ||
          null,
      },

      createdAt: docData.created_at,
      updatedAt: docData.updated_at,
    },
  });
}

async function handlePdfCompleteNested(params: {
  userId: string;
  businessId: string;
  docId: string;
  pdfPath: string;
  fingerprint?: string;
  renderVersion?: string;
  templateVersion?: string;
  res: Response;
}): Promise<void> {
  const { userId, businessId, docId, pdfPath, fingerprint, renderVersion, templateVersion, res } = params;

  console.log(`[Documents API] POST /v1/users/${userId}/businesses/${businessId}/documents/${docId}/pdf-complete`);
  console.log(`[Documents API] PDF Path: ${pdfPath}`);

  if (!pdfPath) {
    res.status(400).json({
      success: false,
      error: 'INVALID_REQUEST',
      message: 'Missing pdfPath',
    });
    return;
  }

  const db = getDb();
  const docRef = db.doc(`users/${userId}/businesses/${businessId}/documents/${docId}`);
  const docSnap = await docRef.get();

  if (!docSnap.exists) {
    res.status(404).json({
      success: false,
      error: 'NOT_FOUND',
      message: `Document ${docId} not found`,
    });
    return;
  }

  const docData = docSnap.data()!;
  const currentStatus = docData.status;

  if (currentStatus === DocumentState.PDF_READY) {
    console.log(`[Documents API] Document ${docId} already PDF_READY. Skipping state update.`);
  } else {
    try {
      assertTransition(currentStatus as DocumentState, DocumentState.PDF_READY);
    } catch (e: any) {
      console.error(`[Documents API] State mismatch for ${docId}: ${e.message}`);
      res.status(409).json({ error: e.message, status: currentStatus });
      return;
    }

    await docRef.update({
      status: DocumentState.PDF_READY,
      pdf_path: pdfPath,
      ...(fingerprint
        ? {
            pdf_verification_fingerprint: fingerprint,
            pdf_verification_kind: 'document',
          }
        : {}),
      ...(renderVersion ? { pdf_render_version: renderVersion } : {}),
      ...(templateVersion ? { pdf_template_version: templateVersion } : {}),
      pdf_generated_at: admin.firestore.FieldValue.serverTimestamp(),
      pdf_delivery_status: 'PENDING',
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    });

    await logStatusTransition({
      docId,
      docPath: docRef.path,
      userId,
      businessId,
      fromStatus: currentStatus,
      toStatus: DocumentState.PDF_READY,
      action: 'pdf_complete',
      metadata: { source: 'PDF_SERVICE_CALLBACK' },
    });
  }

  console.log(`[Documents API] Document updated with PDF path (no URL stored)`);

  const signedUrl = await signPdfPath(String(pdfPath));

  try {
    await enqueueLineDelivery({
      userId,
      docId,
      docType: docData.doc_type,
      docNo: docData.doc_no,
      pdfUrl: signedUrl, // Fresh signed URL (not stored)
    });
    console.log(`[Documents API] LINE delivery task enqueued`);
  } catch (deliveryError: any) {
    console.error(`[Documents API] Failed to enqueue delivery:`, deliveryError);
    await docRef.update({
      pdf_delivery_status: 'FAILED',
      pdf_delivery_error: deliveryError.message,
    });
  }

  if (fingerprint) {
    try {
      await saveDocumentVerificationRecordFromSnapshot({
        fingerprint,
        userId,
        businessId,
        documentId: docId,
        storagePath: pdfPath,
        renderVersion: renderVersion || null,
        templateVersion: templateVersion || null,
        source: 'pdf-complete-callback',
        docData,
      });
    } catch (verificationError) {
      console.warn(
        `[Documents API] Failed to save verification record for ${docId}: ${verificationError}`
      );
    }
  }

  res.json({
    success: true,
    message: 'PDF complete notification received',
    data: { docId, pdfPath, fingerprint: fingerprint || null },
  });
}

/**
 * Health check for service-to-service endpoints
 * No auth required
 */
router.get('/documents/health', (_req: Request, res: Response) => {
  res.json({
    ok: true,
    service: 'documents-api-v1',
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /v1/documents/:id
 * 
 * Load document with optional items from Firestore
 * 
 * Query params:
 *   - includeItems=1 : Include items array
 * 
 * Auth: PDF Service only
 * 
 * Response: Document data with audit-safe snapshots
 */
router.get(
  '/users/:userId/businesses/:businessId/documents/:docId',
  pdfServiceAuthMiddleware,
  async (req: ServiceAuthRequest, res: Response) => {
    const { userId, businessId, docId } = req.params as { userId: string; businessId: string; docId: string };
    const includeItems = req.query.includeItems === '1';

    try {
      await handleGetNestedDocument({ userId, businessId, docId, includeItems, res });

    } catch (error: any) {
      console.error(`[Documents API] Error loading document ${docId}:`, error?.message);
      res.status(500).json({
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Internal server error',
      });
    }
  }
);

/**
 * Legacy compatibility: /v1/documents/:id
 *
 * System of Record is nested documents only:
 *   users/{userId}/businesses/{businessId}/documents/{docId}
 *
 * This legacy endpoint requires query params:
 *   ?userId=...&businessId=...
 *
 * (We DO NOT read top-level documents/{id} as source of truth.)
 */
router.get(
  '/documents/:id',
  pdfServiceAuthMiddleware,
  async (req: ServiceAuthRequest, res: Response) => {
    const { id } = req.params;
    const userId = String(req.query.userId || '').trim();
    const businessId = String(req.query.businessId || '').trim();
    if (!userId || !businessId) {
      res.status(400).json({
        success: false,
        error: 'MISSING_CONTEXT',
        message: 'Provide ?userId=...&businessId=... (nested documents are the only source of truth)',
      });
      return;
    }
    try {
      const includeItems = req.query.includeItems === '1';
      await handleGetNestedDocument({ userId, businessId, docId: id as string, includeItems, res });
    } catch (error: any) {
      console.error(`[Documents API] Error loading document ${id}:`, error?.message);
      res.status(500).json({
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Internal server error',
      });
    }
  }
);

/**
 * POST /v1/documents/:id/pdf-complete
 * 
 * Notify that PDF generation is complete
 * Updates document with PDF path (storage path only, no signed URL)
 * 
 * Body:
 *   {
 *     pdfPath: string,  // e.g., "pdfs/doc_123.pdf" (Cloud Storage path)
 *   }
 * 
 * Auth: PDF Service only
 * 
 * Note: We don't store signed URLs (they expire). 
 * Generate fresh signed URLs on-demand from pdf_path.
 */
router.post(
  '/users/:userId/businesses/:businessId/documents/:docId/pdf-complete',
  pdfServiceAuthMiddleware,
  async (req: ServiceAuthRequest, res: Response) => {
    const { userId, businessId, docId } = req.params as { userId: string; businessId: string; docId: string };
    const { pdfPath, fingerprint, renderVersion, templateVersion } = req.body;

    try {
      await handlePdfCompleteNested({
        userId,
        businessId,
        docId,
        pdfPath,
        fingerprint: typeof fingerprint === 'string' ? fingerprint : undefined,
        renderVersion: typeof renderVersion === 'string' ? renderVersion : undefined,
        templateVersion: typeof templateVersion === 'string' ? templateVersion : undefined,
        res,
      });

    } catch (error: any) {
      console.error(`[Documents API] Error in pdf-complete for ${docId}:`, error?.message);
      res.status(500).json({
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Internal server error',
      });
    }
  }
);

/**
 * Legacy compatibility: /v1/documents/:id/pdf-complete
 * Requires ?userId=...&businessId=... (nested documents only).
 */
router.post(
  '/documents/:id/pdf-complete',
  pdfServiceAuthMiddleware,
  async (req: ServiceAuthRequest, res: Response) => {
    const { id } = req.params;
    const userId = String(req.query.userId || '').trim();
    const businessId = String(req.query.businessId || '').trim();
    if (!userId || !businessId) {
      res.status(400).json({
        success: false,
        error: 'MISSING_CONTEXT',
        message: 'Provide ?userId=...&businessId=... (nested documents are the only source of truth)',
      });
      return;
    }
    try {
      const { pdfPath, fingerprint, renderVersion, templateVersion } = req.body;
      await handlePdfCompleteNested({
        userId,
        businessId,
        docId: id as string,
        pdfPath,
        fingerprint: typeof fingerprint === 'string' ? fingerprint : undefined,
        renderVersion: typeof renderVersion === 'string' ? renderVersion : undefined,
        templateVersion: typeof templateVersion === 'string' ? templateVersion : undefined,
        res,
      });
    } catch (error: any) {
      console.error(`[Documents API] Error in pdf-complete for ${id}:`, error?.message);
      res.status(500).json({
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Internal server error',
      });
    }
  }
);

export default router;
