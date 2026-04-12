import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions/v1';
import { GoogleAuth } from 'google-auth-library';
import { getPdfRenderUrl, getPdfServiceAudience, getPdfTemplateVersion } from '../shared/config';
import { buildPaymentSnapshot, PaymentSnapshot } from '../shared/paymentAssets';
import { getDb } from '../core/firebaseAdmin';
import { saveDocumentVerificationRecord } from '../services/verificationService';

/**
 * PDF Generation Worker
 * Scheduled function that processes PENDING PDF jobs:
 * 1. Fetch job from pdf_generation_jobs
 * 2. Call pdf-service to render PDF
 * 3. Upload to Cloud Storage
 * 4. Update job: PENDING → DONE (+ pdfUrl)
 * 5. Trigger LINE delivery notification
 */

// Initialize Firebase Admin SDK if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = getDb();
const storage = admin.storage();
const JOBS_COLLECTION = 'pdf_generation_jobs';
// const BUCKET_NAME is removed; using default bucket from initializeApp

const auth = new GoogleAuth();

interface PdfJob {
  id: string;
  user_id: string;
  business_id: string;
  document_id: string;
  document_no: string;
  doc_type?: string;
  status: 'PENDING' | 'PROCESSING' | 'DONE' | 'FAILED';
  created_at: admin.firestore.Timestamp;
  attempts: number;
  max_attempts: number;
  error?: string;
  pdfUrl?: string;
  pdf_path?: string;
  completedAt?: admin.firestore.Timestamp;
  traceId?: string; // For correlation (optional)
  correlationId?: string; // Alias for traceId (optional)
}

function formatThaiPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10 && digits.startsWith('0')) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return phone;
}

/**
 * Process single PDF generation job
 * Fetches document, calls pdf-service, uploads result
 */
export async function processPdfJob(jobId: string): Promise<void> {
  const jobRef = db.collection(JOBS_COLLECTION).doc(jobId);
  // Atomically "claim" the job only if status == PENDING.
  // This prevents double-processing between:
  // - Firestore onCreate fast-path trigger
  // - Scheduled polling worker
  // - Manual trigger
  const claimResult = await db.runTransaction(async (tx) => {
    const snap = await tx.get(jobRef);
    if (!snap.exists) {
      console.warn(`[PDF_JOB_NOT_FOUND] ⚠️ jobId=${jobId}`);
      return { claimed: false as const };
    }

    const job = snap.data() as PdfJob;

    if (job.status !== 'PENDING') {
      console.log(`[PDF_JOB_SKIPPED] ℹ️ jobId=${jobId}, status=${job.status}`);
      return { claimed: false as const };
    }

    const attemptNumber = (job.attempts || 0) + 1;

    tx.update(jobRef, {
      status: 'PROCESSING',
      attempts: attemptNumber,
      processing_started_at: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { claimed: true as const, job, attemptNumber };
  });

  if (!claimResult.claimed) return;

  const { job, attemptNumber } = claimResult;

  // ✅ FIX 1: Enqueue timeout task when job transitions to PROCESSING
  // This ensures timeout notification is sent even if job gets stuck and doesn't trigger onUpdate
  try {
    const { enqueuePdfTimeoutTask } = await import('./pdfTimeoutEnqueue');
    await enqueuePdfTimeoutTask(jobId).catch((err) => {
      // Non-blocking: Log but continue processing
      console.warn(`[PDF_WORKER] Failed to enqueue timeout task: ${err}`);
    });
  } catch (importErr) {
    // Non-blocking: Continue even if import fails
    console.warn(`[PDF_WORKER] Failed to import timeout enqueue: ${importErr}`);
  }

  // ✅ FIX 6: Log correlation ID
  const traceId = job.traceId || job.correlationId || 'n/a';
  console.log(
    `[PDF_JOB_PROCESSING] 🔄 jobId=${jobId}, doc_no=${job.document_no}, attempt=${attemptNumber}, traceId=${traceId}`
  );

  try {
    // Fetch document from Firestore (contains all snapshot data)
    const docRef = db
      .collection('users')
      .doc(job.user_id)
      .collection('businesses')
      .doc(job.business_id)
      .collection('documents')
      .doc(job.document_id);

    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      throw new Error(`Document not found: ${job.document_id}`);
    }

    const normalizeStoragePath = (raw?: unknown): string | null => {
      if (!raw || typeof raw !== 'string') return null;
      if (raw.startsWith('gs://')) {
        return raw.replace(/^gs:\/\/[^/]+\//, '');
      }
      const firebaseMatch = raw.match(/https:\/\/firebasestorage\.googleapis\.com\/v0\/b\/[^/]+\/o\/([^?]+)/);
      if (firebaseMatch?.[1]) {
        return decodeURIComponent(firebaseMatch[1]);
      }
      const gcsMatch = raw.match(/https:\/\/storage\.googleapis\.com\/[^/]+\/([^?]+)/);
      if (gcsMatch?.[1]) {
        return decodeURIComponent(gcsMatch[1]);
      }
      return null;
    };

    const docData = docSnap.data() || {};
    const previousPdfPath = normalizeStoragePath(
      (docData as any).pdf_path ||
      (docData as any).pdfPath ||
      (docData as any).pdfUrl ||
      (docData as any).pdf_url
    );

    // ✅ Get user plan for watermark control
    const { getUserPlan } = await import('../core/planService');
    const userPlan = await getUserPlan(job.user_id);

    // ✅ Get business profile for pdfTheme
    const businessRef = db
      .collection('users')
      .doc(job.user_id)
      .collection('businesses')
      .doc(job.business_id);
    const businessSnap = await businessRef.get();
    const businessData = businessSnap.exists ? businessSnap.data() : {};
    const pdfTheme = businessData?.pdfTheme || null;
    const docTypeForTheme = String(docData.doc_type || job.doc_type || 'QUOTATION').toUpperCase();
    const themeByDocType: Record<string, string | null> = {
      QUOTATION: businessData?.pdfThemeQuo || null,
      QUO: businessData?.pdfThemeQuo || null,
      BILL: businessData?.pdfThemeBill || null,
      INVOICE: businessData?.pdfThemeBill || null,
      RECEIPT: businessData?.pdfThemeReceipt || null,
      REC: businessData?.pdfThemeReceipt || null,
      CREDIT_NOTE: businessData?.pdfThemeQuo || null, // Default to QUO theme or generic
      CN: businessData?.pdfThemeQuo || null,
      DEBIT_NOTE: businessData?.pdfThemeQuo || null,
      DN: businessData?.pdfThemeQuo || null,
    };
    const docTheme = themeByDocType[docTypeForTheme] || null;

    // Build full payload for PDF service (no Firestore access needed in pdf-service)
    const pdfPayload = buildPdfPayload(docData, job, userPlan, pdfTheme, docTheme, businessData);

    // Theme resolution for logging
    const themeCandidate = (docData.theme as string) || docTheme || pdfTheme || 'green';
    const themeResolved = (['green', 'red', 'blue', 'mono'].includes(themeCandidate) ? themeCandidate : 'green');

    // Log PDF render start with theme info
    console.log(JSON.stringify({
      tag: "[PDF_RENDER_START]",
      trace_id: traceId,
      doc_id: job.document_id,
      doc_type: docData.doc_type || job.doc_type,
      doc_no: job.document_no,
      theme_candidate: themeCandidate,
      theme_resolved: themeResolved,
      render_version: "2026-01-20",
      render_url: getPdfRenderUrl(),
      timestamp: new Date().toISOString(),
    }));



    // Generate PDF by calling the real PDF service (Cloud Run).
    let pdfBuffer: Buffer;
    let fingerprint: string | undefined;
    let renderVersion: string | undefined;
    let templateVersion: string | undefined;
    try {
      console.log(`[processPdfJob] 🚀 invoke renderPdfViaService...`);
      // REMOVED Promise.race to debug silent return issues
      const renderResult = await renderPdfViaService({
        payload: pdfPayload,
        jobId: jobId,
      });
      console.log(`[processPdfJob] ✅ renderPdfViaService returned`);

      pdfBuffer = renderResult.buffer;
      fingerprint = renderResult.fingerprint;
      renderVersion = renderResult.renderVersion;
      templateVersion = renderResult.templateVersion;
    } catch (renderErr: any) {
      console.error(`[processPdfJob] ❌ renderPdfViaService failed: ${renderErr.message}`);
      throw renderErr;
    }

    // Upload to Cloud Storage
    // Option B: store deterministic object path (source of truth)
    const storagePath = `users/${job.user_id}/businesses/${job.business_id}/documents/${job.document_id}.pdf`;
    const bucket = storage.bucket();
    const file = bucket.file(storagePath);

    await file.save(pdfBuffer, {
      metadata: {
        contentType: 'application/pdf',
        metadata: {
          documentNo: job.document_no,
          userId: job.user_id,
          businessId: job.business_id,
          docId: job.document_id,
          jobId,
        },
      },
      resumable: false,
    });

    console.log(`[pdfWorker] PDF uploaded: ${storagePath} (${pdfBuffer.length} bytes)`);

    // Update job: PENDING → DONE
    const fallbackVersion = getPdfTemplateVersion();
    const resolvedRenderVersion = renderVersion || templateVersion || fallbackVersion || null;
    const resolvedTemplateVersion = templateVersion || renderVersion || fallbackVersion || null;

    await jobRef.update({
      status: 'DONE',
      pdf_path: storagePath,
      pdf_render_version: resolvedRenderVersion,
      pdf_template_version: resolvedTemplateVersion,
      pdf_theme: themeResolved,
      completedAt: admin.firestore.Timestamp.now(),
    });

    // Write-through: Option B source of truth is pdf_path (signed URLs expire).
    await docRef.set(
      {
        pdf_path: storagePath,
        pdfReady: true, // Explicitly enable buttons on Web
        pdfState: 'READY', // Clear Loading state
        pdf_generated_at: admin.firestore.Timestamp.now(),
        pdf_render_version: resolvedRenderVersion,
        pdf_template_version: resolvedTemplateVersion,
        pdf_theme: themeResolved,
        pdf_verification_fingerprint: fingerprint || admin.firestore.FieldValue.delete(),
        pdf_verification_kind: fingerprint ? 'document' : admin.firestore.FieldValue.delete(),
        // Clear legacy URL fields to avoid stale signed links
        pdfUrl: admin.firestore.FieldValue.delete(),
        pdf_url: admin.firestore.FieldValue.delete(),
        pdfPath: admin.firestore.FieldValue.delete(),
      },
      { merge: true }
    );

    console.log(
      `[PDF_JOB_DONE] ✅ jobId=${jobId}, doc_no=${job.document_no}, pdf_path=${storagePath}, traceId=${traceId}`
    );

    if (fingerprint) {
      try {
        await saveDocumentVerificationRecord({
          fingerprint,
          userId: job.user_id,
          businessId: job.business_id,
          storagePath,
          renderVersion: resolvedRenderVersion,
          templateVersion: resolvedTemplateVersion,
          source: 'pdf-worker',
          payload: pdfPayload,
        });
      } catch (verificationError) {
        console.warn(
          `[pdfWorker] Failed to persist verification record for ${job.document_id}: ${verificationError}`
        );
      }
    }

    // Best-effort cleanup of legacy PDF objects if path changed
    try {
      if (previousPdfPath && previousPdfPath !== storagePath) {
        await storage.bucket().file(previousPdfPath).delete({ ignoreNotFound: true });
        console.log(`[pdfWorker] Removed legacy PDF: ${previousPdfPath}`);
      }
    } catch (cleanupErr) {
      console.warn(`[pdfWorker] Failed to cleanup legacy PDF: ${cleanupErr}`);
    }

    // Delivery is handled by Firestore trigger `onPdfJobCompleted` (best-effort LINE push).
  } catch (err) {
    console.error(`[PDF_JOB_FAILED] ❌ jobId=${jobId}, error:`, err);

    const attempts = attemptNumber || (job.attempts || 0);
    const maxAttempts = job.max_attempts || 3;

    if (attempts >= maxAttempts) {
      // Give up
      await jobRef.update({
        status: 'FAILED',
        error: String(err),
        attempts,
        completedAt: admin.firestore.Timestamp.now(),
      });
      console.error(`[pdfWorker] Job exhausted retries: ${jobId}`);

      // ✅ FIX: Mark document as FAILED so user knows
      try {
        await db
          .collection('users')
          .doc(job.user_id)
          .collection('businesses')
          .doc(job.business_id)
          .collection('documents')
          .doc(job.document_id)
          .update({
            pdfState: 'FAILED',
            pdf_delivery_error: `สร้าง PDF ไม่สำเร็จ: ${(err as any).message || String(err)}`,
            updated_at: admin.firestore.FieldValue.serverTimestamp(),
          });
      } catch (docErr) {
        console.error(`[pdfWorker] Failed to update doc status: ${docErr}`);
      }

    } else {
      // Retry next time
      await jobRef.update({
        status: 'PENDING',
        error: String(err),
        attempts,
      });
      console.warn(`[pdfWorker] Job will retry (${attempts}/${maxAttempts}): ${jobId}`);
    }
  }
}

/**
 * Build complete PDF payload from document data
 * This is sent to pdf-service so it doesn't need to read Firestore
 * 
 * @param userPlan - User's plan (FREE, PRO, TEAM) for watermark control
 */
function buildPdfPayload(
  docData: Record<string, unknown>,
  job: PdfJob,
  userPlan: string = 'FREE',
  pdfTheme?: string | null,
  docTheme?: string | null,
  businessData?: Record<string, unknown> | null
): Record<string, unknown> {
  // Extract or default snapshots
  const businessSnapshot =
    (docData.business_snapshot as Record<string, unknown>) ||
    (docData.businessSnapshot as Record<string, unknown>) ||
    {};
  const customerSnapshot =
    (docData.customer_snapshot as Record<string, unknown>) ||
    (docData.customerSnapshot as Record<string, unknown>) ||
    {};
  const taxSnapshot =
    (docData.tax_snapshot as Record<string, unknown>) ||
    (docData.taxSnapshot as Record<string, unknown>) ||
    {};
  const paymentSnapshotRaw =
    (docData.payment_snapshot as Record<string, unknown>) ||
    (docData.paymentSnapshot as Record<string, unknown>) ||
    null;

  const paymentFallback = {
    method: (businessData as Record<string, unknown> | null | undefined)?.paymentMethod as string,
    promptpay_account:
      (businessData as Record<string, unknown> | null | undefined)?.promptpayAccount as string ||
      (businessData as Record<string, unknown> | null | undefined)?.promptpay_account as string,
    promptpay_name:
      (businessData as Record<string, unknown> | null | undefined)?.promptpayName as string ||
      (businessData as Record<string, unknown> | null | undefined)?.promptpay_name as string,
    promptpay_qr_url:
      (businessData as Record<string, unknown> | null | undefined)?.promptpayQrUrl as string ||
      (businessData as Record<string, unknown> | null | undefined)?.promptpay_qr_url as string,
    bank_code:
      (businessData as Record<string, unknown> | null | undefined)?.bankCode as string ||
      (businessData as Record<string, unknown> | null | undefined)?.bank_code as string ||
      (businessData as Record<string, unknown> | null | undefined)?.bankName as string ||
      (businessData as Record<string, unknown> | null | undefined)?.bank_name as string,
    bank_account:
      (businessData as Record<string, unknown> | null | undefined)?.bankAccountNo as string ||
      (businessData as Record<string, unknown> | null | undefined)?.bank_account_no as string ||
      (businessData as Record<string, unknown> | null | undefined)?.bank_account as string,
    bank_account_name:
      (businessData as Record<string, unknown> | null | undefined)?.bankAccountName as string ||
      (businessData as Record<string, unknown> | null | undefined)?.bank_account_name as string,
  };
  const paymentFallbackSnapshot = buildPaymentSnapshot(paymentFallback);

  const paymentSnapshotBase =
    (paymentSnapshotRaw as unknown as PaymentSnapshot | null) ||
    paymentFallbackSnapshot;
  const paymentSnapshot = paymentSnapshotBase
    ? ({
        ...paymentSnapshotBase,
        promptpay_account: paymentSnapshotBase.promptpay_account || paymentFallback.promptpay_account || null,
        promptpay_name: paymentSnapshotBase.promptpay_name || paymentFallback.promptpay_name || null,
        promptpay_qr_url: paymentSnapshotBase.promptpay_qr_url || paymentFallback.promptpay_qr_url || null,
        bank_code: paymentSnapshotBase.bank_code || paymentFallback.bank_code || null,
        bank_name:
          paymentSnapshotBase.bank_name ||
          paymentFallbackSnapshot?.bank_name ||
          (businessSnapshot as Record<string, unknown>).bankName ||
          (businessSnapshot as Record<string, unknown>).bank_name ||
          (businessData as Record<string, unknown> | null | undefined)?.bankName ||
          (businessData as Record<string, unknown> | null | undefined)?.bank_name ||
          null,
        bank_account: paymentSnapshotBase.bank_account || paymentFallback.bank_account || null,
        bank_account_name: paymentSnapshotBase.bank_account_name || paymentFallback.bank_account_name || null,
        bank_logo_url:
          paymentSnapshotBase.bank_logo_url ||
          paymentFallbackSnapshot?.bank_logo_url ||
          null,
      } as PaymentSnapshot)
    : paymentSnapshotBase;
  const termsSnapshot = (docData.terms as Record<string, unknown>) || {};

  // Get document type for terms
  let docType = String(docData.doc_type || docData.docType || job.doc_type || 'QUOTATION').toUpperCase();

  // Normalize docType to ensure we use the correct template (QUOTATION vs QUO)
  // The PDF service likely maps QUOTATION -> New Template, QUO -> Old Template
  if (docType === 'QUO') docType = 'QUOTATION';
  if (docType === 'BILL' || docType === 'INV') docType = 'INVOICE';
  if (docType === 'REC' || docType === 'RCP' || docType === 'RCPT') docType = 'RECEIPT';
  if (docType === 'CN') docType = 'CREDIT_NOTE';
  if (docType === 'DN') docType = 'DEBIT_NOTE';

  // Resolve terms based on document type
  let documentTerms = String(termsSnapshot.custom_terms || '');
  if (!documentTerms) {
    if (docType === 'QUOTATION' || docType === 'QUO') {
      documentTerms = String(termsSnapshot.quotation_terms || 'ราคานี้มีอายุ 30 วันนับจากวันที่ออกเอกสาร');
    } else if (docType === 'INVOICE' || docType === 'BILL') {
      documentTerms = String(termsSnapshot.invoice_terms || 'กรุณาชำระเงินภายในวันที่กำหนด');
    } else if (docType === 'RECEIPT') {
      documentTerms = String(termsSnapshot.receipt_terms || 'ขอบคุณที่ใช้บริการ');
    }
  }

  const rawBusinessPhone = String(
    businessSnapshot.phone || businessData?.phone || (docData as any).businessPhone || ''
  ).trim();
  const businessPhone = formatThaiPhone(rawBusinessPhone);
  if (documentTerms && businessPhone) {
    // Replace explicit placeholder or existing phone numbers with business phone
    documentTerms = documentTerms
      .replace(/\{\{\s*phone\s*\}\}/gi, businessPhone)
      .replace(/\b0\d{1,2}[-\s]?\d{3}[-\s]?\d{4}\b/g, businessPhone);
  }

  // Resolve asset URLs with robust fallbacks (snake_case vs camelCase)
  // 1. Try businessSnapshot snake_case (legacy)
  // 2. Try businessSnapshot camelCase (new)
  // 3. Try live businessData (camelCase)
  const logoUrl = businessSnapshot.logo_url || businessSnapshot.logoUrl || businessData?.logoUrl || null;
  const signatureUrl = businessSnapshot.signature_url || businessSnapshot.signatureUrl || businessData?.signatureUrl || null;
  const stampUrl = businessSnapshot.stamp_url || businessSnapshot.stampUrl || businessData?.stampUrl || null;

  // Build standardized payload
  return {
    // Document metadata
    doc: {
      id: job.document_id,
      type: docType,
      no: docData.doc_no || docData.docNo || job.document_no,
      status: docData.status,
      issue_date:
        docData.issued_at ||
        docData.issue_date ||
        docData.issueDate ||
        docData.created_at ||
        docData.createdAt,
      due_date: docData.due_date || docData.dueDate || null,
      created_at: docData.created_at || docData.createdAt,
      notes: docData.notes || '',
      terms: documentTerms,
      subject_th: (docData as any).subject_th || (docData as any).subjectTh || null,
      subject_en: (docData as any).subject_en || (docData as any).subjectEn || null,
      price_type: (docData as any).price_type || (docData as any).priceType || null,
      lump_sum_amount: (docData as any).lump_sum_amount || (docData as any).lumpSumAmount || null,
      scope_of_work: Array.isArray((docData as any).scope_of_work)
        ? (docData as any).scope_of_work
        : Array.isArray((docData as any).scopeOfWork)
          ? (docData as any).scopeOfWork
          : [],
      payment_milestones: Array.isArray((docData as any).payment_milestones)
        ? (docData as any).payment_milestones
        : Array.isArray((docData as any).paymentMilestones)
          ? (docData as any).paymentMilestones
          : [],
      installment_no: docData.installment_no || null,
      installment_total: docData.installment_total || null,
      installment_remaining: docData.installment_remaining || null,
      installment_issued_total: docData.installment_issued_total || null,
      source_doc_no: docData.source_doc_no || null,
      theme: (docData.theme as string) || docTheme || null,
      // ✅ Plan info for watermark control
      user_plan: userPlan,
      // ✅ Explicit title overrides
      title_th: docType === 'CREDIT_NOTE' ? 'ใบลดหนี้' : docType === 'DEBIT_NOTE' ? 'ใบเพิ่มหนี้' :
        docType === 'RECEIPT' ? 'ใบเสร็จรับเงิน' : docType === 'INVOICE' ? 'ใบวางบิล/ใบแจ้งหนี้' : 'ใบเสนอราคา',
      title_en: docType === 'CREDIT_NOTE' ? 'Credit Note' : docType === 'DEBIT_NOTE' ? 'Debit Note' :
        docType === 'RECEIPT' ? 'Receipt' : docType === 'INVOICE' ? 'Invoice' : 'Quotation',
    },

    // Business snapshot (frozen at issuance) - includes signature/stamp
    business: {
      id: businessSnapshot.id || job.business_id,
      name: businessSnapshot.name || businessData?.name || (docData as any).businessName || 'ไม่ระบุ',
      address: businessSnapshot.address || businessData?.address || (docData as any).businessAddress || null,
      tax_id: businessSnapshot.tax_id || businessData?.taxId || (docData as any).businessTaxId || null,
      branch: businessSnapshot.branch || businessData?.branch || (docData as any).businessBranch || null,
      phone: businessSnapshot.phone || businessData?.phone || (docData as any).businessPhone || null,
      email: businessSnapshot.email || businessData?.email || (docData as any).businessEmail || null,

      // Send both snake_case and camelCase to satisfy potentially different versions of PDF service
      logo_url: logoUrl,
      logoUrl: logoUrl,

      signature_url: signatureUrl,
      signatureUrl: signatureUrl,

      stamp_url: stampUrl,
      stampUrl: stampUrl,

      signatory_name: businessSnapshot.signatory_name || null,
      signatory_title: businessSnapshot.signatory_title || null,
      // ✅ PDF theme from business profile
      pdfTheme: pdfTheme || null,
      payment_methods:
        (businessSnapshot as any).payment_methods ||
        (businessSnapshot as any).paymentMethods ||
        (businessData as any)?.paymentMethods ||
        null,
    },

    // Customer snapshot (frozen at issuance)
    customer: {
      id: customerSnapshot.id || docData.customer_id || null,
      name:
        customerSnapshot.name ||
        (customerSnapshot as any).displayName ||
        (docData as any).customer_name ||
        (docData as any).customerName ||
        'ไม่ระบุ',
      legal_name:
        customerSnapshot.legal_name ||
        (customerSnapshot as any).legalName ||
        (docData as any).customer_legal_name ||
        (docData as any).customerLegalName ||
        null,
      branch:
        customerSnapshot.branch ||
        (customerSnapshot as any).branchName ||
        (docData as any).customer_branch ||
        (docData as any).customerBranch ||
        null,
      contact_name:
        customerSnapshot.contact_name ||
        (customerSnapshot as any).contactName ||
        (docData as any).customer_contact_name ||
        (docData as any).customerContactName ||
        null,
      address:
        customerSnapshot.address ||
        (docData as any).customer_address ||
        (docData as any).customerAddress ||
        null,
      tax_id:
        customerSnapshot.tax_id ||
        (docData as any).customer_tax_id ||
        (docData as any).customerTaxId ||
        null,
      phone:
        customerSnapshot.phone ||
        (docData as any).customer_phone ||
        (docData as any).customerPhone ||
        null,
      email:
        customerSnapshot.email ||
        (docData as any).customer_email ||
        (docData as any).customerEmail ||
        null,
    },

    // Line items (normalize to canonical schema)
    items: Array.isArray(docData.items)
      ? (docData.items as Array<Record<string, unknown>>).map((item) => {
        const qty = Number((item as any).qty ?? (item as any).quantity ?? (item as any).count ?? 1) || 1;
        const price = Number((item as any).unit_price ?? (item as any).unitPrice ?? (item as any).price ?? 0) || 0;
        const amount =
          Number((item as any).amount) ||
          Number((item as any).total) ||
          qty * price;
        const name =
          (item as any).name ||
          (item as any).description_th ||
          (item as any).description ||
          (item as any).title ||
          '';
        return {
          name,
          description: (item as any).description || (item as any).description_en || '',
          qty,
          price,
          amount,
          unit: (item as any).unit || 'งาน',
        };
      })
      : [],

    // Totals (support both legacy + money snapshot)
    totals: (() => {
      const money = (docData.money as Record<string, unknown>) || {};
      return {
        sub_total:
          (money.subtotal as number) ||
          (money.sub_total as number) ||
          (docData as any).sub_total_amount ||
          (docData as any).subtotal ||
          0,
        vat:
          (money.vat_amount as number) ||
          (docData as any).vat_amount ||
          (docData as any).vat ||
          0,
        vat_percent:
          (taxSnapshot.vat_percent as number) ||
          (docData as any).vat_percent ||
          (money.vat_rate_pct as number) ||
          7,
        discount:
          (money.discount_amount as number) ||
          (docData as any).discount_amount ||
          0,
        wht:
          (money.wht_amount as number) ||
          (docData as any).wht ||
          0,
        total:
          (money.total_amount as number) ||
          (docData as any).total_amount ||
          (docData as any).total ||
          0,
      };
    })(),

    // Payment info (for rendering payment section + QR code)
    payment: paymentSnapshot ? {
      method: paymentSnapshot.method,
      promptpay_account: paymentSnapshot.promptpay_account || null,
      promptpay_name: paymentSnapshot.promptpay_name || null,
      promptpay_logo_url: paymentSnapshot.promptpay_logo_url || null,
      promptpay_qr_url: paymentSnapshot.promptpay_qr_url || null,
      bank_code: paymentSnapshot.bank_code || null,
      bank_name: paymentSnapshot.bank_name || null,
      bank_account: paymentSnapshot.bank_account || null,
      bank_account_name: paymentSnapshot.bank_account_name || null,
      bank_logo_url: paymentSnapshot.bank_logo_url || null,
      // Amount for QR code generation
      amount: docData.total_amount || docData.total || 0,
      paid_at:
        (docData as any).payment_date ||
        (docData as any).paymentDate ||
        null,
      reference_no:
        (docData as any).reference_no ||
        (docData as any).referenceNo ||
        null,
    } : null,

    // Asset URLs for rendering
    assets: {
      business_logo_url: logoUrl,
      signature_url: signatureUrl,
      stamp_url: stampUrl,
      bank_logo_url: paymentSnapshot?.bank_logo_url || null,
      promptpay_logo_url: paymentSnapshot?.promptpay_logo_url || null,
    },
  };
}

/**
 * Call PDF service with full payload (no Firestore access in pdf-service)
 */
async function renderPdfViaService(params: {
  payload: Record<string, unknown>;
  jobId: string;
}): Promise<{ buffer: Buffer; fingerprint?: string; renderVersion?: string; templateVersion?: string }> {
  const { payload, jobId } = params;

  // PDF_SERVICE_URL should point to the Cloud Run endpoint that returns PDF bytes
  // e.g. https://<cloud-run-service>/jobs/render-buffer
  const pdfRenderUrl = getPdfRenderUrl();
  if (!pdfRenderUrl) {
    throw new Error('PDF_RENDER_URL not configured');
  }

  // Audience should match Cloud Run URL for OIDC auth; fallback to URL if not provided
  const audience = getPdfServiceAudience() || getPdfRenderUrl();
  const client = await auth.getIdTokenClient(audience);

  // Security: Log only identifiers, not full payload
  const docNo = (payload.doc as Record<string, unknown>)?.no || 'unknown';
  console.log(`[pdfWorker] Calling PDF service: jobId=${jobId}, doc_no=${docNo}`);

  try {
    const resp = await client.request<ArrayBuffer>({
      url: pdfRenderUrl,
      method: 'POST',
      data: payload,
      responseType: 'arraybuffer',
      timeout: 120_000,
      validateStatus: (status) => status < 500, // Don't throw on 4xx, we'll handle it
    });

    // ✅ FIX: Check status code and content-type before processing
    const contentType = resp.headers['content-type'] || resp.headers['Content-Type'] || '';
    const isPdf = contentType.includes('application/pdf');
    const isJson = contentType.includes('application/json') || !isPdf;

    // If error status or JSON response, try to parse error message
    if (resp.status >= 400 || isJson) {
      let errorMessage = 'PDF service returned error';
      try {
        // Try to parse JSON error from ArrayBuffer
        const errorText = Buffer.from(resp.data).toString('utf-8');
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error || errorJson.message || errorMessage;
        if (errorJson.status) {
          errorMessage += ` (status: ${errorJson.status})`;
        }
      } catch {
        // If parsing fails, use status code
        errorMessage = `PDF service error: ${resp.status} ${resp.statusText || 'Unknown error'}`;
      }
      throw new Error(errorMessage);
    }

    const headerValue = (key: string): string | undefined => {
      const lower = key.toLowerCase();
      const value = (resp.headers as Record<string, string | undefined>)[lower];
      return value || (resp.headers as Record<string, string | undefined>)[key] || undefined;
    };
    const renderVersion = headerValue('x-pdf-render-version');
    const templateVersion = headerValue('x-pdf-template-version');
    const fingerprint = headerValue('x-pdf-fingerprint');

    // Validate PDF buffer
    const buf = Buffer.from(resp.data);
    if (buf.length < 1000) {
      // Safety: reject obviously invalid PDFs (prevents uploading placeholders)
      throw new Error(`PDF buffer too small (${buf.length} bytes) from PDF service`);
    }

    // ✅ FIX: Validate PDF magic bytes to ensure it's actually a PDF
    // PDF files start with "%PDF-" (hex: 25 50 44 46 2D)
    const pdfMagicBytes = buf.slice(0, 5).toString('ascii');
    if (pdfMagicBytes !== '%PDF-') {
      // Likely got JSON response instead of PDF (wrong endpoint?)
      const preview = buf.slice(0, 200).toString('utf-8').replace(/\n/g, ' ').substring(0, 100);
      throw new Error(
        `Invalid PDF format: expected PDF buffer but got non-PDF response. ` +
        `First bytes: ${pdfMagicBytes}. Preview: ${preview}... ` +
        `Check that PDF_RENDER_URL points to /jobs/render-buffer endpoint.`
      );
    }

    // ✅ FIX: Log PDF render success
    console.log(JSON.stringify({
      tag: "[PDF_RENDER_DONE]",
      status_code: resp.status,
      pdf_bytes: buf.length,
      render_version: renderVersion || null,
      template_version: templateVersion || null,
      fingerprint: fingerprint || null,
      trace_id: params.jobId,
      timestamp: new Date().toISOString(),
    }));

    return { buffer: buf, fingerprint, renderVersion, templateVersion };
  } catch (err: any) {
    // ✅ FIX: Better error handling for ArrayBuffer conversion issues
    if (err.message && err.message.includes('ArrayBuffer')) {
      throw new Error(`PDF service returned invalid response (expected PDF buffer, got error response). Check PDF_RENDER_URL endpoint. Original error: ${err.message}`);
    }
    // Re-throw with context
    throw new Error(`PDF render failed: ${err.message || String(err)}`);
  }
}

/**
 * Pubsub trigger: Process all PENDING jobs
 * Run on schedule (e.g., every 5 minutes)
 */
export const pdfWorkerScheduled = functions
  .region('asia-southeast1')
  .runWith({
    secrets: ['PDF_RENDER_URL', 'PDF_SERVICE_AUDIENCE'],
    memory: '512MB',
    timeoutSeconds: 300,
  })
  .pubsub.schedule('every 5 minutes')
  .onRun(async () => {
    console.log('[pdfWorkerScheduled] Starting PDF worker');

    try {
      const jobsSnap = await db
        .collection(JOBS_COLLECTION)
        .where('status', '==', 'PENDING')
        .limit(10)
        .get();

      console.log(`[pdfWorkerScheduled] Found ${jobsSnap.docs.length} pending jobs`);

      if (jobsSnap.docs.length === 0) {
        // Debug: check all jobs summary
        const allJobsSnap = await db.collection(JOBS_COLLECTION).limit(50).get();
        const stats: Record<string, number> = {};
        allJobsSnap.docs.forEach(d => {
          const s = d.data().status || 'N/A';
          stats[s] = (stats[s] || 0) + 1;
        });
        console.log(`[pdfWorkerScheduled] Debug Stats (limit 50):`, JSON.stringify(stats));
      }

      for (const jobDoc of jobsSnap.docs) {
        try {
          await processPdfJob(jobDoc.id);
        } catch (err) {
          console.error(`[pdfWorkerScheduled] Error processing job ${jobDoc.id}:`, err);
        }
      }

      console.log('[pdfWorkerScheduled] Completed');
    } catch (err) {
      console.error('[pdfWorkerScheduled] Error:', err);
    }
  });

/**
 * HTTP trigger: Manually process a specific job
 * For testing/debugging
 */
export const pdfWorkerManual = functions
  .region('asia-southeast1')
  .runWith({
    secrets: ['PDF_RENDER_URL', 'PDF_SERVICE_AUDIENCE'],
    memory: '512MB',
    timeoutSeconds: 120,
  })
  .https.onRequest(async (req, res) => {
    const { jobId } = req.query;

    if (!jobId || typeof jobId !== 'string') {
      res.status(400).send('Missing jobId parameter');
      return;
    }

    try {
      await processPdfJob(jobId);
      res.json({ success: true, jobId });
    } catch (err) {
      console.error('[pdfWorkerManual] Error:', err);
      res.status(500).json({ error: String(err) });
    }
  });
