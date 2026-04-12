import { getDb } from '../core/firebaseAdmin';
import * as admin from 'firebase-admin';

type TemplateReportRow = {
  docNo: string;
  docType: string;
  templateVersion: string;
  renderVersion: string;
  theme: string;
  createdAt?: admin.firestore.Timestamp;
};

function formatDate(ts?: admin.firestore.Timestamp): string {
  if (!ts) return '-';
  return ts.toDate().toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export async function getTemplateReport(params: {
  businessId: string;
  limit?: number;
}): Promise<string> {
  const { businessId, limit = 20 } = params;
  const db = getDb();

  const snap = await db
    .collectionGroup('documents')
    .where('business_id', '==', businessId)
    .limit(Math.max(limit * 3, 50))
    .get();

  if (snap.empty) {
    return 'ยังไม่มีเอกสารสำหรับรายงานเทมเพลต';
  }

  const rows: TemplateReportRow[] = snap.docs.map((doc) => {
    const data = doc.data() as Record<string, unknown>;
    const createdAt = (data.created_at ||
      data.issued_at ||
      data.updated_at ||
      data.updatedAt) as admin.firestore.Timestamp | undefined;

    return {
      docNo: String(data.doc_no || doc.id),
      docType: String(data.doc_type || 'UNKNOWN'),
      templateVersion: String(data.pdf_template_version || data.pdf_render_version || 'unknown'),
      renderVersion: String(data.pdf_render_version || 'unknown'),
      theme: String(data.pdf_theme || 'unknown'),
      createdAt,
    };
  });

  rows.sort((a, b) => {
    const ta = a.createdAt ? a.createdAt.toMillis() : 0;
    const tb = b.createdAt ? b.createdAt.toMillis() : 0;
    return tb - ta;
  });

  const picked = rows.slice(0, limit);
  const counts: Record<string, number> = {};
  for (const row of picked) {
    const key = `${row.templateVersion} | ${row.theme}`;
    counts[key] = (counts[key] || 0) + 1;
  }

  const lines: string[] = [];
  lines.push(`📊 รายงานเทมเพลตเอกสาร (ล่าสุด ${picked.length} รายการ)`);
  lines.push('');
  lines.push('สรุปเวอร์ชัน:');
  Object.entries(counts).forEach(([key, count]) => {
    lines.push(`• ${key}: ${count}`);
  });
  lines.push('');
  lines.push('รายการ:');

  picked.forEach((row) => {
    lines.push(
      `• ${row.docNo} (${row.docType}) | template v${row.templateVersion} | render v${row.renderVersion} | theme ${row.theme} | ${formatDate(row.createdAt)}`
    );
  });

  return lines.join('\n');
}
