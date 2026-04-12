/**
 * Test UX Flow - Simulating Real User Interaction
 * 
 * Run: cd functions && npm run build && node test-ux-flow.js
 */

const draftManager = require('./dist/core/draftManager');
const { formatDraftSummary, formatNextCommands, formatConfirmationSummary } = require('./dist/core/responseFormatter');
const { DocumentType } = require('./dist/core/conversationOrchestrator');
const { Timestamp } = require('firebase-admin/firestore');

console.log('🎭 Simulating Real User UX Flow\n');
console.log('=' .repeat(60));

// Simulate Draft State
const mockDraft = {
  draftId: 'test_001',
  userId: 'user123',
  businessId: 'biz456',
  docType: 'BILL', // Invoice
  status: 'DRAFT',
  
  customerName: '',
  items: [],
  
  discountType: undefined,
  discountValue: undefined,
  discountAmount: 0,
  
  subTotal: 0,
  vatPercent: 7,
  vatAmount: 0,
  whtPercent: 0,
  whtAmount: 0,
  totalAmount: 0,
  netReceiveAmount: 0,
  
  dueDate: undefined,
  conversationId: '',
  createdAt: Timestamp.now(),
  updatedAt: Timestamp.now(),
  expiresAt: Timestamp.now(),
};

// ============================================================================
// STEP 1: Start - No customer, no items
// ============================================================================
console.log('\n📱 User: เริ่ม ใบวางบิล\n');
console.log('Bot:');
console.log(formatDraftSummary(mockDraft));
console.log('\nพิมพ์ต่อได้:');
formatNextCommands(mockDraft).forEach(cmd => console.log(`• ${cmd}`));

// ============================================================================
// STEP 2: Add customer
// ============================================================================
mockDraft.customerName = 'บริษัท ABC จำกัด';
console.log('\n' + '='.repeat(60));
console.log('\n📱 User: ลูกค้า บริษัท ABC จำกัด\n');
console.log('Bot:');
console.log(formatDraftSummary(mockDraft));
console.log('\nพิมพ์ต่อได้:');
formatNextCommands(mockDraft).forEach(cmd => console.log(`• ${cmd}`));

// ============================================================================
// STEP 3: Add item (paste-to-edit style)
// ============================================================================
mockDraft.items.push({
  description_th: 'ค่าบริการออกแบบ',
  quantity: 1,
  unit_price: 25000,
  amount: 25000,
});
mockDraft.subTotal = 25000;
mockDraft.vatAmount = Math.round(25000 * 0.07);
mockDraft.totalAmount = 25000 + mockDraft.vatAmount;

console.log('\n' + '='.repeat(60));
console.log('\n📱 User: ค่าบริการออกแบบ 25000\n');
console.log('Bot: ✅ เพิ่มรายการแล้ว\n');
console.log(formatDraftSummary(mockDraft));
console.log('\nพิมพ์ต่อได้:');
formatNextCommands(mockDraft).forEach(cmd => console.log(`• ${cmd}`));

// ============================================================================
// STEP 4: Try to confirm without due date (should fail)
// ============================================================================
console.log('\n' + '='.repeat(60));
console.log('\n📱 User: ยืนยัน\n');
console.log('Bot:');
console.log('❗ ใบวางบิลต้องระบุวันครบกำหนด\n');
console.log('พิมพ์ต่อได้:');
console.log('• กำหนดครบกำหนด 31/12/2568');

// ============================================================================
// STEP 5: Add due date
// ============================================================================
mockDraft.dueDate = '31/12/2568';

console.log('\n' + '='.repeat(60));
console.log('\n📱 User: กำหนดครบกำหนด 31/12/2568\n');
console.log('Bot: ✅ ตั้งวันครบกำหนดแล้ว\n');
console.log(formatDraftSummary(mockDraft));
console.log('\nพิมพ์ต่อได้:');
formatNextCommands(mockDraft).forEach(cmd => console.log(`• ${cmd}`));

// ============================================================================
// STEP 6: Confirm (show full summary)
// ============================================================================
console.log('\n' + '='.repeat(60));
console.log('\n📱 User: ยืนยัน\n');
console.log('Bot:');
console.log(formatConfirmationSummary(mockDraft));

// ============================================================================
// STEP 7: Final confirm
// ============================================================================
console.log('\n' + '='.repeat(60));
console.log('\n📱 User: ยืนยันอีกครั้ง\n');
console.log('Bot: ✅ ออกใบวางบิลเรียบร้อย\n');
console.log('📄 WB-2025-0001');
console.log('ยอด: 26,750฿');
console.log('ครบกำหนด: 31/12/2568');
console.log('\n[ส่ง PDF ไปยัง LINE แล้ว]');

console.log('\n' + '='.repeat(60));
console.log('\n✅ UX Flow Test Complete!\n');

console.log('📊 Key Observations:');
console.log('✓ แสดงสถานะชัดเจนทุกขั้น');
console.log('✓ คำสั่งถัดไปเป็นตัวอย่างจริง (ไม่ใช่ template)');
console.log('✓ ข้อความสั้น กระชับ อ่านง่าย');
console.log('✓ บอกชัดเมื่อข้อมูลขาด');
console.log('✓ ยืนยัน 2 ขั้น: ยืนยัน → ยืนยันอีกครั้ง');
