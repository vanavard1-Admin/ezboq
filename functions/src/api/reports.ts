import { Router, Response } from 'express';
import {
    AuthenticatedRequest,
    verifyAuth,
    getActiveBusinessId,
    verifyBusinessOwnership,
} from './auth';
import {
    getMonthlySalesReport,
    getOverdueInvoicesReport,
    getTopCustomersReport,
    getPopularServicesReport,
    getFinancialReport,
    preloadBusinessDocuments,
} from '../core/reportService';
import {
    getVatSummary,
    getWhtSummary,
    getTaxStatusReport,
    setTaxFilingStatus,
    getAnnualTaxSummary,
} from '../core/taxReportService';
import { getDb } from '../core/firebaseAdmin';
import { generateTaxSummaryPdf, generateWhtCertificatePdf } from '../services/taxPdfService';
import { pushLineMessages } from '../services/lineService';
import { buildReportFlexMessageWithShortLink } from '../shared/pdfFlexMessage';

const router = Router();
const db = getDb();

const resolveLineUserId = async (uid: string): Promise<string | null> => {
    const userSnap = await db.collection('users').doc(uid).get();
    if (userSnap.exists) {
        const data = userSnap.data() as { lineUserId?: string; line_user_id?: string } | undefined;
        const lineUserId = data?.lineUserId || data?.line_user_id;
        if (lineUserId) return String(lineUserId);
    }

    const linkSnap = await db.collection('line_links').where('uid', '==', uid).limit(1).get();
    if (!linkSnap.empty) {
        return linkSnap.docs[0].id;
    }

    const lineUsersSnap = await db.collection('lineUsers').where('firebaseUid', '==', uid).limit(1).get();
    if (!lineUsersSnap.empty) {
        return lineUsersSnap.docs[0].id;
    }

    return null;
};

const getCurrentMonthKey = (): string => {
    const now = new Date();
    const thaiYear = now.getFullYear() + 543;
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${thaiYear}_${month}`;
};

const monthKeyToLabel = (monthKey: string): string => {
    const [yearStr, monthStr] = monthKey.split('_');
    const monthIdx = Math.max(1, Math.min(12, Number(monthStr))) - 1;
    const thaiMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    return `${thaiMonths[monthIdx]} ${yearStr}`;
};

/**
 * GET /v1/reports/summary
 * Returns summary reports for the active business.
 * Optional query:
 *  - businessId
 *  - monthKey (ex: 2569_01)
 *  - limit (top lists)
 */
router.get('/reports/summary', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const uid = req.userId!;
        let businessId = req.query.businessId as string;
        const monthKey = (req.query.monthKey as string) || undefined;
        const limit = Math.min(Number(req.query.limit) || 5, 20);

        if (!businessId) {
            businessId = (await getActiveBusinessId(uid)) || '';
        }

        if (!businessId) {
            res.status(400).json({ error: 'No business specified or active' });
            return;
        }

        const owns = await verifyBusinessOwnership(uid, businessId);
        if (!owns) {
            res.status(404).json({ error: 'Business not found' });
            return;
        }

        const docs = await preloadBusinessDocuments(uid, businessId);
        const [monthly, overdue, topCustomers, popularServices] = await Promise.all([
            getMonthlySalesReport(uid, businessId, monthKey, { docs }),
            getOverdueInvoicesReport(uid, businessId, { docs }),
            getTopCustomersReport(uid, businessId, limit, monthKey, { docs }),
            getPopularServicesReport(uid, businessId, limit, monthKey, { docs }),
        ]);

        res.json({
            businessId,
            monthKey: monthKey || monthly?.monthKey || null,
            monthly,
            overdue,
            topCustomers,
            popularServices,
        });
    } catch (error) {
        console.error('GET /v1/reports/summary error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /v1/reports/financial
 * Returns profit/loss report
 */
router.get('/reports/financial', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const uid = req.userId!;
        let businessId = req.query.businessId as string;
        const monthKey = (req.query.monthKey as string) || undefined;
        const startDate = (req.query.startDate as string) || undefined;
        const endDate = (req.query.endDate as string) || undefined;

        if (!businessId) {
            businessId = (await getActiveBusinessId(uid)) || '';
        }

        if (!businessId) {
            res.status(400).json({ error: 'No business specified or active' });
            return;
        }

        const owns = await verifyBusinessOwnership(uid, businessId);
        if (!owns) {
            res.status(404).json({ error: 'Business not found' });
            return;
        }

        const report = await getFinancialReport(uid, businessId, { monthKey, startDate, endDate });
        res.json(report);
    } catch (error) {
        console.error('GET /v1/reports/financial error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /v1/reports/tax/vat
 */
router.get('/reports/tax/vat', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const uid = req.userId!;
        let businessId = req.query.businessId as string;
        const monthKey = (req.query.monthKey as string) || undefined;

        if (!businessId) {
            businessId = (await getActiveBusinessId(uid)) || '';
        }
        if (!businessId) {
            res.status(400).json({ error: 'No business specified or active' });
            return;
        }
        const owns = await verifyBusinessOwnership(uid, businessId);
        if (!owns) {
            res.status(404).json({ error: 'Business not found' });
            return;
        }

        const summary = await getVatSummary(uid, businessId, monthKey);
        res.json({ businessId, monthKey: summary?.monthKey || monthKey || null, summary });
    } catch (error) {
        console.error('GET /v1/reports/tax/vat error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /v1/reports/tax/wht
 */
router.get('/reports/tax/wht', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const uid = req.userId!;
        let businessId = req.query.businessId as string;
        const monthKey = (req.query.monthKey as string) || undefined;

        if (!businessId) {
            businessId = (await getActiveBusinessId(uid)) || '';
        }
        if (!businessId) {
            res.status(400).json({ error: 'No business specified or active' });
            return;
        }
        const owns = await verifyBusinessOwnership(uid, businessId);
        if (!owns) {
            res.status(404).json({ error: 'Business not found' });
            return;
        }

        const summary = await getWhtSummary(uid, businessId, monthKey);
        res.json({ businessId, monthKey: summary?.monthKey || monthKey || null, summary });
    } catch (error) {
        console.error('GET /v1/reports/tax/wht error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /v1/reports/tax/status
 */
router.get('/reports/tax/status', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const uid = req.userId!;
        let businessId = req.query.businessId as string;
        const monthKey = (req.query.monthKey as string) || undefined;

        if (!businessId) {
            businessId = (await getActiveBusinessId(uid)) || '';
        }
        if (!businessId) {
            res.status(400).json({ error: 'No business specified or active' });
            return;
        }
        const owns = await verifyBusinessOwnership(uid, businessId);
        if (!owns) {
            res.status(404).json({ error: 'Business not found' });
            return;
        }

        const report = await getTaxStatusReport(businessId, monthKey);
        res.json({ businessId, ...report });
    } catch (error) {
        console.error('GET /v1/reports/tax/status error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /v1/reports/tax/filings
 */
router.post('/reports/tax/filings', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const uid = req.userId!;
        let businessId = req.body.businessId as string;
        const type = (req.body.type as string)?.toUpperCase();
        const monthKey = req.body.monthKey as string;
        const status = (req.body.status as string)?.toUpperCase();

        if (!businessId) {
            businessId = (await getActiveBusinessId(uid)) || '';
        }
        if (!businessId) {
            res.status(400).json({ error: 'No business specified or active' });
            return;
        }
        const owns = await verifyBusinessOwnership(uid, businessId);
        if (!owns) {
            res.status(404).json({ error: 'Business not found' });
            return;
        }

        if (!type || !['VAT', 'WHT'].includes(type)) {
            res.status(400).json({ error: 'Invalid type (VAT/WHT)' });
            return;
        }
        if (!monthKey) {
            res.status(400).json({ error: 'monthKey is required' });
            return;
        }
        if (!status || !['FILED', 'PENDING'].includes(status)) {
            res.status(400).json({ error: 'Invalid status (FILED/PENDING)' });
            return;
        }

        const record = await setTaxFilingStatus({
            userId: uid,
            businessId,
            type: type as 'VAT' | 'WHT',
            monthKey,
            status: status as 'FILED' | 'PENDING',
        });
        res.json({ businessId, record });
    } catch (error) {
        console.error('POST /v1/reports/tax/filings error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /v1/reports/tax/annual
 */
router.get('/reports/tax/annual', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const uid = req.userId!;
        let businessId = req.query.businessId as string;
        const year = Number(req.query.year);

        if (!businessId) {
            businessId = (await getActiveBusinessId(uid)) || '';
        }
        if (!businessId) {
            res.status(400).json({ error: 'No business specified or active' });
            return;
        }
        const owns = await verifyBusinessOwnership(uid, businessId);
        if (!owns) {
            res.status(404).json({ error: 'Business not found' });
            return;
        }
        if (!Number.isFinite(year)) {
            res.status(400).json({ error: 'year (Thai year) is required' });
            return;
        }

        const report = await getAnnualTaxSummary(uid, businessId, year);
        res.json({ businessId, report });
    } catch (error) {
        console.error('GET /v1/reports/tax/annual error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /v1/reports/tax/pdf/summary
 * Generates tax summary PDF and optionally sends to LINE
 */
router.post('/reports/tax/pdf/summary', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const uid = req.userId!;
        let businessId = req.body.businessId as string;
        const monthKey = (req.body.monthKey as string) || getCurrentMonthKey();
        const sendToLine = Boolean(req.body.sendToLine);

        if (!businessId) {
            businessId = (await getActiveBusinessId(uid)) || '';
        }
        if (!businessId) {
            res.status(400).json({ error: 'No business specified or active' });
            return;
        }
        const owns = await verifyBusinessOwnership(uid, businessId);
        if (!owns) {
            res.status(404).json({ error: 'Business not found' });
            return;
        }

        const { url, storagePath } = await generateTaxSummaryPdf(uid, businessId, monthKey);

        let lineSent = false;
        let lineReason: string | null = null;
        if (sendToLine) {
            const lineUserId = await resolveLineUserId(uid);
            if (lineUserId) {
                try {
                    const reportName = `สรุปภาษี ${monthKeyToLabel(monthKey)}`;
                    const reportId = `tax_summary_${businessId}_${monthKey}`;
                    const { flexMessage, shortUrl } = await buildReportFlexMessageWithShortLink({
                        reportId,
                        reportName,
                        reportType: 'TAX_SUMMARY',
                        pdfPath: storagePath,
                        userId: uid,
                        businessId,
                    });
                    await pushLineMessages(lineUserId, [
                        flexMessage,
                        { type: 'text', text: `🔗 ลิงก์สั้นสำหรับแชร์: ${shortUrl}` },
                    ]);
                    lineSent = true;
                } catch (err) {
                    console.error('[reports] Failed to push tax summary PDF to LINE:', err);
                    lineReason = 'LINE_PUSH_FAILED';
                }
            } else {
                lineReason = 'LINE_NOT_LINKED';
            }
        }

        res.json({ businessId, monthKey, url, lineSent, lineReason });
    } catch (error) {
        console.error('POST /v1/reports/tax/pdf/summary error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /v1/reports/tax/pdf/wht-certificate
 * Generates WHT certificate (50 ทวิ) PDF and optionally sends to LINE
 */
router.post('/reports/tax/pdf/wht-certificate', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const uid = req.userId!;
        let businessId = req.body.businessId as string;
        const monthKey = (req.body.monthKey as string) || getCurrentMonthKey();
        const supplierName = String(req.body.supplierName || '').trim();
        const sendToLine = Boolean(req.body.sendToLine);

        if (!businessId) {
            businessId = (await getActiveBusinessId(uid)) || '';
        }
        if (!businessId) {
            res.status(400).json({ error: 'No business specified or active' });
            return;
        }
        const owns = await verifyBusinessOwnership(uid, businessId);
        if (!owns) {
            res.status(404).json({ error: 'Business not found' });
            return;
        }
        if (!supplierName) {
            res.status(400).json({ error: 'supplierName is required' });
            return;
        }

        const { url, storagePath } = await generateWhtCertificatePdf(uid, businessId, supplierName, monthKey);

        let lineSent = false;
        let lineReason: string | null = null;
        if (sendToLine) {
            const lineUserId = await resolveLineUserId(uid);
            if (lineUserId) {
                try {
                    const safeSupplier = supplierName.replace(/[^a-zA-Z0-9ก-๙_-]/g, '_');
                    const reportName = `50 ทวิ ${supplierName} (${monthKeyToLabel(monthKey)})`;
                    const reportId = `wht_${businessId}_${monthKey}_${safeSupplier}`;
                    const { flexMessage, shortUrl } = await buildReportFlexMessageWithShortLink({
                        reportId,
                        reportName,
                        reportType: 'WHT_CERT',
                        pdfPath: storagePath,
                        userId: uid,
                        businessId,
                    });
                    await pushLineMessages(lineUserId, [
                        flexMessage,
                        { type: 'text', text: `🔗 ลิงก์สั้นสำหรับแชร์: ${shortUrl}` },
                    ]);
                    lineSent = true;
                } catch (err) {
                    console.error('[reports] Failed to push WHT certificate PDF to LINE:', err);
                    lineReason = 'LINE_PUSH_FAILED';
                }
            } else {
                lineReason = 'LINE_NOT_LINKED';
            }
        }

        res.json({ businessId, monthKey, supplierName, url, lineSent, lineReason });
    } catch (error) {
        console.error('POST /v1/reports/tax/pdf/wht-certificate error:', error);
        const message = error instanceof Error ? error.message : 'Internal server error';
        if (message.includes('ไม่พบข้อมูลหัก ณ ที่จ่าย')) {
            res.status(404).json({ error: message, code: 'WHT_NOT_FOUND' });
            return;
        }
        res.status(500).json({ error: message });
    }
});

export default router;
