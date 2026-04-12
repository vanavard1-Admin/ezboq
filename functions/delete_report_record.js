/**
 * Delete idempotency record to allow re-test
 */
const admin = require('firebase-admin');

admin.initializeApp({
  projectId: 'ezdoc-v1-th'
});

const db = admin.firestore();

async function deleteReportRecord() {
  await db.doc('reports_monthly/2024-12').delete();
  console.log('✅ Deleted reports_monthly/2024-12');
  process.exit(0);
}

deleteReportRecord();
