/**
 * AutoFlow API Router (Lane 1)
 * 
 * Endpoints:
 * POST /v1/autoflow/ingest-boq - Ingest Excel file and return normalized BOQ payload
 */

import { Router, Response } from 'express';
import { AuthenticatedRequest, verifyAuth, getActiveBusinessId } from './auth';
import { BoqIngestService } from '../services/boqIngestService';

const router = Router();
const boqService = new BoqIngestService();

/**
 * POST /v1/autoflow/ingest-boq
 * Accepts multipart/form-data with 'file' field
 * Or raw body with content-type application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
 */
router.post('/autoflow/ingest-boq', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const uid = req.userId!;
    const businessId = req.query.businessId as string || await getActiveBusinessId(uid);

    if (!businessId) {
      res.status(400).json({ error: 'No business specified or active' });
      return;
    }

    // Support both raw body and potentially multipart (via middleware if added later)
    // For now, assuming raw binary if content-type matches XLSX
    let buffer: Buffer;
    if (req.body instanceof Buffer) {
      buffer = req.body;
    } else if (req.headers['content-type']?.includes('spreadsheetml')) {
      // In Firebase Functions, the body might be parsed as Buffer if we use rawBody
      buffer = (req as any).rawBody || req.body;
    } else {
      res.status(400).json({ error: 'Unsupported content-type. Please upload an Excel (.xlsx) file.' });
      return;
    }

    if (!buffer || buffer.length === 0) {
      res.status(400).json({ error: 'Empty file' });
      return;
    }

    const result = await boqService.parseExcel(buffer);

    // Prepare generated document payloads (BOQ + invoice draft)
    const boqPayload = {
      businessId,
      docType: 'BOQ',
      items: result.rows.map(r => ({
        description_th: r.description,
        qty: r.qty,
        unit: r.unit,
        unit_price: r.unitPrice,
        amount: r.amount,
      })),
      money: {
        subtotal: result.summary.totalAmount,
        total_amount: result.summary.totalAmount,
      },
      metadata: {
        ingestSource: 'autoflow_excel',
        originalSheet: result.summary.sheetName,
      }
    };

    const invoicePayload = {
      businessId,
      docType: 'BILL',
      items: boqPayload.items,
      money: boqPayload.money,
      metadata: {
        ingestSource: 'autoflow_excel',
        relation: 'BOQ_MATCH',
      }
    };

    res.json({
      success: true,
      data: {
        ingest: result,
        payloads: {
          boq: boqPayload,
          invoice: invoicePayload,
        }
      }
    });

  } catch (error: any) {
    console.error('[AUTOFLOW_INGEST_ERROR]', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

export default router;
