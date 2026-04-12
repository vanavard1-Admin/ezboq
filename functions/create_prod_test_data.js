/**
 * Create test data for Monthly Report Production version
 * Creates:
 * - users/{uid} with lineUserId
 * - users/{uid}/businesses/{businessId} 
 * - businesses/{businessId}/stats_monthly/{YYYY-MM} (write-through stats)
 */

const admin = require('firebase-admin');

admin.initializeApp({
  projectId: 'ezdoc-v1-th'
});

const db = admin.firestore();

async function createProductionTestData() {
  try {
    const TEST_UID = 'test-prod-user-' + Date.now();
    const TEST_LINE_ID = 'Uc044c147f51798d1fb71560fa48acecb'; // Real LINE userId
    const businessId = 'test-prod-biz-' + Date.now();
    const yearMonth = '2025-12'; // Current month
    
    console.log('Creating production test data for pushMonthlyReport...\n');
    
    // 1. Create users/{uid} with lineUserId
    await db.doc(`users/${TEST_UID}`).set({
      id: TEST_UID,
      lineUserId: TEST_LINE_ID,
      displayName: 'Test Production User',
      plan: 'FREE',
      createdAt: admin.firestore.Timestamp.now(),
    });
    console.log(`✅ Created users/${TEST_UID} with lineUserId`);
    
    // 2. Create users/{uid}/businesses/{businessId}
    await db.doc(`users/${TEST_UID}/businesses/${businessId}`).set({
      id: businessId,
      name: 'ร้านทดสอบ Production',
      address: '123 ถ.ทดสอบ',
      phone: '081-234-5678',
      reporting_enabled: true,
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    });
    console.log(`✅ Created business: ${businessId}`);
    
    // 3. Create businesses/{businessId}/stats_monthly/{YYYY-MM} (write-through stats)
    await db.doc(`businesses/${businessId}/stats_monthly/${yearMonth}`).set({
      year_month: yearMonth,
      docs_total: 5,
      docs_by_type: {
        QUOTE: 2,
        INVOICE: 2,
        RECEIPT: 1,
      },
      total_amount_thb: 125000,
      credits_spent: 5,
      credit_purchased_amount_thb: 300,
      pdf_sent_total: 4,
      pdf_failed_total: 1,
      updated_at: admin.firestore.Timestamp.now(),
    });
    console.log(`✅ Created stats_monthly/${yearMonth} with:
       - docs_total: 5
       - total_amount: ฿125,000
       - pdf_sent: 4, failed: 1
       - credits_spent: 5`);
    
    console.log('\n📋 Test data created successfully!');
    console.log(`LINE_USER_ID="${TEST_LINE_ID}"`);
    console.log(`USER_ID="${TEST_UID}"`);
    console.log(`BUSINESS_ID="${businessId}"`);
    console.log(`YEAR_MONTH="${yearMonth}"`);
    console.log('\n🚀 Now run pushMonthlyReport with ?yearMonth=2025-12');
    console.log('curl -X POST "https://asia-southeast1-ezdoc-v1-th.cloudfunctions.net/pushMonthlyReport?yearMonth=2025-12" -H "Authorization: Bearer $(gcloud auth print-identity-token)"');
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    console.error(err);
    process.exit(1);
  }
}

createProductionTestData();
