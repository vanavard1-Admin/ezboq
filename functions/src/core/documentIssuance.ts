import { getDb } from './firebaseAdmin';
/**
 * Document Issuance Service
 * 
 * Converts drafts from conversation orchestrator into actual documents
 * Handles the RECEIPT → INVOICE → QUO source chain validation
 * 
 * CRITICAL RULES:
 * - RECEIPT ONLY counts as revenue (source_doc_id must be INVOICE)
 * - INVOICE source_doc_id can reference QUO (optional)
 * - QUO source_doc_id must be null (root document)
 * - All chains are immutable and auditable
 */

import * as admin from 'firebase-admin';
import { DraftData, DocumentType } from './conversationOrchestrator';
import { getNextDocumentSequence } from './documentNumber';
import { DocumentState } from './stateMachine';
import { DocNumberPrefixes } from '../shared/schemas';

const db = getDb();
const DOCUMENTS_COLLECTION = 'documents';

// ============================================================================
// DOCUMENT TYPE DEFINITIONS
// ============================================================================

export interface DocumentRecord {
  // Auto-generated
  id: string;
  created_at: admin.firestore.Timestamp;

  // Business & User info
  business_id: string;
  user_id: string; // Firebase UID of creator
  source_conversation_id?: string; // Back-reference to conversation

  // Document metadata
  doc_type: 'QUO' | 'BILL' | 'RECEIPT';
  doc_no: string; // e.g., "QUO-2568-001", "INV-2568-001", "RCP-2568-001"
  status: DocumentState;
  issue_date: admin.firestore.Timestamp;

  // ✅ AUDIT-SAFE SNAPSHOTS (NEW - Immutable)
  business_snapshot: {
    id: string;
    name: string;
    tax_id?: string;
    address?: string;
    branch?: string;
    phone?: string;
    email?: string;
    logo_url?: string;
  };

  customer_snapshot: {
    id?: string;
    name: string;
    tax_id?: string;
    address?: string;
    phone?: string;
    email?: string;
  };

  tax_snapshot: {
    vat_percent: number;
    vat_type: 'inclusive' | 'exclusive';
    withholding_percent?: number;
  };

  // Legacy fields (keep for backward compatibility)
  customer_id?: string;
  customer_name: string;
  customer_tax_id?: string;

  // Items
  items: {
    description_th: string;
    description_en?: string;
    quantity: number;
    unit_price: number;
    amount: number;
    tax_percent?: number;
    tax_amount?: number;
  }[];

  // Financial totals
  sub_total_amount: number;
  vat_percent: number;
  vat_amount: number;
  wht_percent?: number;
  wht_amount?: number;
  total_amount: number;
  net_receive_amount?: number; // For RECEIPT: total - WHT

  // Payment info (for RECEIPT/PAID documents)
  payment_date?: admin.firestore.Timestamp;
  payment_method?: string;
  reference_no?: string;

  // SOURCE DOC CHAIN (NEW - Phase 5A)
  source_doc_id?: string;
  source_chain?: string;

  // ✅ PDF Delivery Fields (NEW)
  pdf_path?: string; // Cloud Storage path
  pdf_url?: string; // ⚠️ DEPRECATED: Don't use (signed URLs expire)
  pdf_generated_at?: admin.firestore.Timestamp;
  pdf_delivery_status?: 'PENDING' | 'SENDING' | 'SENT' | 'FAILED';
  pdf_delivery_claimed_at?: admin.firestore.Timestamp; // When SENDING was claimed
  pdf_delivery_error?: string;
  pdf_delivered_at?: admin.firestore.Timestamp;
  pdf_delivery_attempts?: number;

  // Metadata
  updated_at: admin.firestore.Timestamp;
}

// ============================================================================
// DOCUMENT NUMBER GENERATION
// ============================================================================

async function generateDocumentNumber(
  businessId: string,
  docType: DocumentType
): Promise<string> {
  const typePrefix =
    DocNumberPrefixes[docType as keyof typeof DocNumberPrefixes] || 'DOC';

  // Thai year (Buddhist calendar)
  const now = new Date();
  const thaiYear = now.getFullYear() + 543;

  const sequence = await getNextDocumentSequence({
    businessId,
    docTypeKey: docType,
    typePrefix,
    thaiYear,
  });
  const seqNumber = String(sequence).padStart(3, '0');
  return `${typePrefix}-${thaiYear}-${seqNumber}`;
}

// ============================================================================
// SOURCE DOC VALIDATION
// ============================================================================

async function validateSourceDoc(
  businessId: string,
  docType: DocumentType,
  sourceDocId?: string
): Promise<{ valid: boolean; error?: string }> {
  // QUO cannot have source_doc_id
  if (docType === DocumentType.QUOTATION && sourceDocId) {
    return { valid: false, error: 'ใบเสนอราคาต้องเป็นเอกสารหลัก' };
  }

  // RECEIPT must have source_doc_id pointing to INVOICE
  if (docType === DocumentType.RECEIPT && !sourceDocId) {
    return { valid: false, error: 'ใบเสร็จต้องอ้างอิงจากใบวางบิล' };
  }

  if (docType === DocumentType.RECEIPT && sourceDocId) {
    const sourceDoc = await db
      .collection(DOCUMENTS_COLLECTION)
      .doc(sourceDocId)
      .get();

    if (!sourceDoc.exists) {
      return { valid: false, error: 'ไม่พบใบวางบิลที่อ้างอิง' };
    }

    const sourceData = sourceDoc.data() as DocumentRecord;

    // Validate source is INVOICE
    if (sourceData.doc_type !== 'BILL') {
      return { valid: false, error: 'ต้องอ้างอิงจากใบวางบิลเท่านั้น' };
    }

    // Validate same business
    if (sourceData.business_id !== businessId) {
      return { valid: false, error: 'เอกสารต้องอยู่ในธุรกิจเดียวกัน' };
    }

    // INVOICE must be ISSUED or PAID
    if (sourceData.status === 'DRAFT') {
      return {
        valid: false,
        error: 'ต้องใช้ใบวางบิลที่ออกแล้ว',
      };
    }

    return { valid: true };
  }

  // INVOICE can optionally have source_doc_id pointing to QUO
  if (docType === DocumentType.INVOICE && sourceDocId) {
    const sourceDoc = await db
      .collection(DOCUMENTS_COLLECTION)
      .doc(sourceDocId)
      .get();

    if (!sourceDoc.exists) {
      return { valid: false, error: 'ไม่พบใบเสนอราคาที่อ้างอิง' };
    }

    const sourceData = sourceDoc.data() as DocumentRecord;

    if (sourceData.doc_type !== 'QUO') {
      return { valid: false, error: 'ต้องอ้างอิงจากใบเสนอราคาเท่านั้น' };
    }

    if (sourceData.business_id !== businessId) {
      return { valid: false, error: 'เอกสารต้องอยู่ในธุรกิจเดียวกัน' };
    }
  }

  return { valid: true };
}

// ============================================================================
// SOURCE CHAIN BUILDING
// ============================================================================

async function buildSourceChain(
  sourceDocId?: string,
  docType?: DocumentType
): Promise<string> {
  if (!sourceDocId) {
    return docType === DocumentType.QUOTATION ? 'QUO' : 'STANDALONE';
  }

  const sourceDoc = await db
    .collection(DOCUMENTS_COLLECTION)
    .doc(sourceDocId)
    .get();

  if (!sourceDoc.exists) {
    return 'UNKNOWN';
  }

  const sourceData = sourceDoc.data() as DocumentRecord;
  const previousChain = sourceData.source_chain || sourceData.doc_type;

  return `${previousChain} → ${docType === DocumentType.INVOICE ? 'BILL' : 'RECEIPT'}`;
}

// ============================================================================
// CREATE DOCUMENT FROM DRAFT
// ============================================================================

export async function createDocumentFromDraft(
  draft: DraftData,
  businessId: string,
  userId: string
): Promise<string> {
  try {
    // 1. Validate source document chain
    const validation = await validateSourceDoc(
      businessId,
      draft.docType,
      draft.sourceDocId
    );

    if (!validation.valid) {
      throw new Error(validation.error || 'Invalid source document');
    }

    // 2. Generate document number
    const docNo = await generateDocumentNumber(businessId, draft.docType);

    // 3. Build source chain
    const sourceChain = await buildSourceChain(draft.sourceDocId, draft.docType);

    // ✅ 4. Load business snapshot (MUST exist)
    const businessDoc = await db.collection('businesses').doc(businessId).get();
    if (!businessDoc.exists) {
      throw new Error(`Business ${businessId} not found`);
    }
    const businessData = businessDoc.data()!;
    const businessSnapshot = {
      id: businessId,
      name: businessData.name || 'ไม่ระบุ',
      tax_id: businessData.taxId || businessData.tax_id,
      address: businessData.address,
      branch: businessData.branch,
      phone: businessData.phone,
      email: businessData.email,
      logo_url: businessData.logoUrl || businessData.logo_url,
    };

    // ✅ 5. Load customer snapshot (Hybrid: DB if customerId, else draft)
    let customerSnapshot: {
      id?: string;
      name: string;
      legal_name?: string;
      branch?: string;
      contact_name?: string;
      tax_id?: string;
      address?: string;
      phone?: string;
      email?: string;
    };

    if (draft.customerId) {
      // Load from customers collection
      const customerDoc = await db
        .collection('customers')
        .doc(draft.customerId)
        .get();

      if (!customerDoc.exists) {
        throw new Error(`Customer ${draft.customerId} not found`);
      }

      const customerData = customerDoc.data()!;

      // ✅ SECURITY: Check customer belongs to this business
      if (customerData.businessId && customerData.businessId !== businessId) {
        throw new Error(
          `Customer ${draft.customerId} does not belong to business ${businessId}`
        );
      }

      customerSnapshot = {
        id: draft.customerId,
        name: customerData.name || draft.customerName,
        legal_name: customerData.legal_name || draft.customerLegalName,
        branch: customerData.branch || draft.customerBranch,
        contact_name: customerData.contact_name || draft.customerContactName,
        tax_id: customerData.taxId || customerData.tax_id,
        address: customerData.address,
        phone: customerData.phone,
        email: customerData.email,
      };
    } else {
      // No customerId - use draft data (ad-hoc customer)
      customerSnapshot = {
        name: draft.customerName,
        legal_name: draft.customerLegalName,
        branch: draft.customerBranch,
        contact_name: draft.customerContactName,
        tax_id: draft.customerTaxId,
        address: draft.customerAddress,
      };
    }

    // ✅ 6. Create tax snapshot (current tax settings)
    const taxSnapshot = {
      vat_percent: draft.vatPercent || 7,
      vat_type: (businessData.defaultVatType as 'inclusive' | 'exclusive') || 'exclusive',
      withholding_percent: draft.whtPercent,
    };

    // 7. Create document record
    const now = admin.firestore.Timestamp.now();

    const docRecord: DocumentRecord = {
      id: docNo, // Use doc_no as document ID for simplicity
      created_at: now,
      business_id: businessId,
      user_id: userId,
      source_conversation_id: draft.conversationId,

      // Document metadata
      doc_type:
        draft.docType === DocumentType.QUOTATION
          ? 'QUO'
          : draft.docType === DocumentType.INVOICE
            ? 'BILL'
            : 'RECEIPT',
      doc_no: docNo,
      status: DocumentState.ISSUED,
      issue_date: now,

      // ✅ AUDIT-SAFE SNAPSHOTS (Immutable)
      business_snapshot: businessSnapshot,
      customer_snapshot: customerSnapshot,
      tax_snapshot: taxSnapshot,

      // Legacy customer fields (backward compat)
      customer_id: draft.customerId,
      customer_name: draft.customerName,
      customer_tax_id: draft.customerTaxId,

      // Items
      items: draft.items.map((item) => ({
        description_th: item.description_th,
        description_en: item.description_en,
        quantity: item.quantity,
        unit_price: item.unit_price,
        amount: item.amount,
        tax_percent: item.tax_percent,
        tax_amount: item.tax_amount,
      })),

      // Financial totals
      sub_total_amount: draft.subTotal,
      vat_percent: draft.vatPercent,
      vat_amount: draft.vatAmount,
      wht_percent: draft.whtPercent,
      wht_amount: draft.whtAmount,
      total_amount: draft.totalAmount,
      net_receive_amount: draft.netReceiveAmount,

      // Payment info (for RECEIPT)
      payment_date: draft.paymentDate,
      payment_method: draft.paymentMethod,
      reference_no: draft.referenceNo,

      // Source doc chain
      source_doc_id: draft.sourceDocId,
      source_chain: sourceChain,

      // PDF delivery (initialized as empty)
      pdf_delivery_status: undefined,
      pdf_delivery_attempts: 0,

      // Metadata
      updated_at: now,
    };

    // 8. Save to Firestore
    await db
      .collection(DOCUMENTS_COLLECTION)
      .doc(docNo)
      .set(docRecord);

    // 9. Create index entry if RECEIPT (for revenue reports)
    if (draft.docType === DocumentType.RECEIPT) {
      await createRevenueEntry(businessId, userId, docNo, docRecord);
    }

    console.log(
      `✅ Created ${draft.docType} document: ${docNo} for ${businessId} (with snapshots)`
    );

    return docNo;
  } catch (error) {
    console.error('Error creating document from draft:', error);
    throw error;
  }
}

// ============================================================================
// REVENUE TRACKING (RECEIPT ONLY)
// ============================================================================

async function createRevenueEntry(
  businessId: string,
  userId: string,
  docId: string,
  doc: DocumentRecord
): Promise<void> {
  // Only RECEIPT documents count as revenue
  if (doc.doc_type !== 'RECEIPT') {
    return;
  }

  const monthKey = formatMonthKey(doc.issue_date.toDate());

  await db
    .collection('revenue_entries')
    .doc(businessId)
    .collection('monthly')
    .doc(monthKey)
    .update({
      receipt_count: admin.firestore.FieldValue.increment(1),
      total_revenue: admin.firestore.FieldValue.increment(
        doc.total_amount || 0
      ),
      net_received: admin.firestore.FieldValue.increment(
        doc.net_receive_amount || 0
      ),
      last_updated: admin.firestore.Timestamp.now(),
    });
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatMonthKey(date: Date): string {
  const thaiYear = date.getFullYear() + 543;
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${thaiYear}_${month}`;
}
