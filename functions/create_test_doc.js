const admin = require('firebase-admin');

admin.initializeApp({
  projectId: 'ezdoc-v1-th'
});

const db = admin.firestore();

async function createTestDoc() {
  try {
    const TEST_UID = 'WLGfXFStQYdzk56JdRHyLi0qlLT2';
    const TEST_LINE_ID = 'Uc044c147f51798d1fb71560fa48acecb'; // Real LINE userId from STEP 1
    
    // Create business
    const businessId = 'test-biz-' + Date.now();
    await db.doc(`users/${TEST_UID}/businesses/${businessId}`).set({
      id: businessId,
      name: 'Test Business',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    
    console.log(`✅ Created business: ${businessId}`);
    
    // Create document
    const docId = 'test-doc-' + Date.now();
    await db.doc(`users/${TEST_UID}/businesses/${businessId}/documents/${docId}`).set({
      id: docId,
      title: 'Test PDF Document',
      pdfState: 'READY',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    
    console.log(`✅ Created document: ${docId}`);
    
    // Set up user profile with lineUserId
    // Store lineUserId directly on the users/{uid} document
    const userRef = db.collection('users').doc(TEST_UID);
    await userRef.set({
      id: TEST_UID,
      lineUserId: TEST_LINE_ID,
      displayName: 'Test User',
      lineConnectedAt: new Date(),
      createdAt: new Date(),
    }, { merge: true });
    
    console.log(`✅ Set up user profile with lineUserId: ${TEST_LINE_ID}`);
    
    console.log('\n📋 Use these for testing:');
    console.log(`TEST_UID="${TEST_UID}"`);
    console.log(`BUSINESS_ID="${businessId}"`);
    console.log(`DOC_ID="${docId}"`);
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    console.error(err);
    process.exit(1);
  }
}

createTestDoc();
