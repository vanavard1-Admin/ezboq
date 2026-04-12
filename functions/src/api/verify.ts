import express, { Request, Response } from 'express';

import {
  lookupVerification,
  normalizeFingerprint,
  normalizeVerificationKind,
} from '../services/verificationService';

const router = express.Router();

router.get('/verify', async (req: Request, res: Response) => {
  try {
    res.set('Cache-Control', 'private, no-store');

    const kind = normalizeVerificationKind(req.query.kind);
    const fingerprint = normalizeFingerprint(req.query.fp);
    const documentId = String(req.query.id || '').trim();
    const documentNo = String(req.query.no || '').trim();
    const monthKey = String(req.query.month || '').trim();
    const periodKey = String(req.query.period || '').trim();

    if (!kind) {
      res.status(400).json({
        ok: false,
        verified: false,
        code: 'INVALID_KIND',
        message: 'kind is required',
      });
      return;
    }

    if (!fingerprint || fingerprint.length < 12) {
      res.status(400).json({
        ok: false,
        verified: false,
        code: 'INVALID_FINGERPRINT',
        message: 'fp is required',
      });
      return;
    }

    const result = await lookupVerification({
      kind,
      fingerprint,
      documentId: documentId || undefined,
      documentNo: documentNo || undefined,
      monthKey: monthKey || undefined,
      periodKey: periodKey || undefined,
    });

    if (!result.verified) {
      res.status(404).json({
        ok: false,
        verified: false,
        code: result.code,
        message: result.message,
      });
      return;
    }

    res.json({
      ok: true,
      verified: true,
      source: result.source,
      record: result.record,
    });
  } catch (error) {
    console.error('GET /v1/verify error:', error);
    res.status(500).json({
      ok: false,
      verified: false,
      code: 'INTERNAL_ERROR',
      message: 'Internal server error',
    });
  }
});

export default router;
