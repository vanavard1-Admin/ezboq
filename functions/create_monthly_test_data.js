/**
 * Create test data for pushMonthlyReport testing
 * Creates:
 * - lineUsers/{lineUserId} document
 * - users/{uid}/businesses/{businessId} 
 * - users/{uid}/businesses/{businessId}/documents with CONFIRMED status
 */

const admin = require('firebase-admin');

admin.initializeApp({
  projectId: 'ezdoc-v1-th'
});

const db = admin.firestore();

async function createMonthlyReportTestData() {
  try {
    const TEST_UID = 'test-monthly-user-' + Date.now();
    const TEST_LINE_ID = 'Uc044c147f51798d1fb71560fa48acecb'; // Real LINE userId
    const businessId = 'test-monthly-biz-' + Date.now();
    
    console.log('Creating test data for pushMonthlyReport...\n');
    
    // 1. Create lineUsers/{lineUserId} - This is what pushMonthlyReport queries
    await db.doc(`lineUsers/${TEST_LINE_ID}`).set({
      lineUserId: TEST_LINE_ID,
      firebaseUid: TEST_UID,
      defaultBusinessId: businessId,
      lineDisplayName: 'Test Monthly User',
      linkedAt: admin.firestore.Timestamp.now(),
      lastActiveAt: admin.firestore.Timestamp.now(),
    });
    console.log(`✅ Created lineUsers/${TEST_LINE_ID}`);
    
    // 2. Create users/{uid}
    await db.doc(`users/${TEST_UID}`).set({
      id: TEST_UID,
      lineUserId: TEST_LINE_ID,
      displayName: 'Test Monthly User',
      plan: 'FREE',
      createdAt: admin.firestore.Timestamp.now(),
    });
    console.log(`✅ Created users/${TEST_UID}`);
    
    // 3. Create business
    await db.doc(`users/${TEST_UID}/businesses/${businessId}`).set({
      id: businessId,
      name: 'ร้านทดสอบ Monthly Report',
      address: '123 ถ.ทดสอบ',
      phone: '081-234-5678',
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    });
    console.log(`✅ Created business: ${businessId}`);
    
    // 4. Create some CONFIRMED documents for December 2024
    const dec2024 = new Date('2024-12-15T10:00:00Z');
    
    // Document 1: QUO
    const doc1 = 'test-quo-' + Date.now();
    await db.doc(`users/${TEST_UID}/businesses/${businessId}/documents/${doc1}`).set({
      id: doc1,
      docNo: 'QUO-2024-001',
      docType: 'QUO',
      status: 'CONFIRMED',
      issueDate: '2024-12-10',
      money: {
        subtotal: 10000,
        vat: 700,
        grand_total: 10700,
      },
      createdAt: admin.firestore.Timestamp.fromDate(dec2024),
    });
    console.log(`✅ Created document: ${doc1} (QUO ฿10,700)`);
    
    // Document 2: BILL
    const doc2 = 'test-bill-' + Date.now();
    await db.doc(`users/${TEST_UID}/businesses/${businessId}/documents/${doc2}`).set({
      id: doc2,
      docNo: 'BILL-2024-001',
      docType: 'BILL',
      status: 'CONFIRMED',
      issueDate: '2024-12-15',
      money: {
        subtotal: 25000,
        vat: 1750,
        grand_total: 26750,
      },
      createdAt: admin.firestore.Timestamp.fromDate(new Date('2024-12-16T10:00:00Z')),
    });
    console.log(`✅ Created document: ${doc2} (BILL ฿26,750)`);
    
    // Document 3: RECEIPT
    const doc3 = 'test-receipt-' + Date.now();
    await db.doc(`users/${TEST_UID}/businesses/${businessId}/documents/${doc3}`).set({
      id: doc3,
      docNo: 'RC-2024-001',
      docType: 'RECEIPT',
      status: 'CONFIRMED',
      issueDate: '2024-12-20',
      money: {
        subtotal: 15000,
        vat: 1050,
        grand_total: 16050,
      },
      createdAt: admin.firestore.Timestamp.fromDate(new Date('2024-12-21T10:00:00Z')),
    });
    console.log(`✅ Created document: ${doc3} (RECEIPT ฿16,050)`);
    
    console.log('\n📋 Test data created successfully!');
    console.log(`LINE_USER_ID="${TEST_LINE_ID}"`);
    console.log(`USER_ID="${TEST_UID}"`);
    console.log(`BUSINESS_ID="${businessId}"`);
    console.log(`\nTotal: 3 documents, ฿53,500`);
    console.log('\n🚀 Now run pushMonthlyReport with ?yearMonth=2024-12');
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    console.error(err);
    process.exit(1);
  }
}

createMonthlyReportTestData();
