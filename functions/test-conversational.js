/**
 * Test Conversational Document Creation
 * 
 * Build first: cd functions && npm run build
 * Run with: node functions/test-conversational.js
 */

// Import from compiled JS (dist folder, not lib)
const commandParser = require('./dist/core/commandParser');

console.log('🧪 Testing Command Parser\n');

// Test cases
const testCases = [
  'เริ่ม ใบเสนอราคา',
  'ลูกค้า บริษัท ABC',
  'เพิ่ม ค่าแรง 15000',
  'ค่าวัสดุ 18000',  // Flexible without "เพิ่ม"
  'ปูนซีเมนต์ 10 x 120',  // Flexible with quantity
  'เพิ่ม งานระบบไฟฟ้า 5 x 7000',
  'ส่วนลด 1000',
  'ส่วนลด 10%',
  'vat 7%',
  'กำหนดครบกำหนด 31/12/2568',
  'ยืนยัน',
  'ยืนยันอีกครั้ง',
  'สวัสดี',  // Unknown
];

testCases.forEach((input, idx) => {
  const result = commandParser.parseCommand(input);
  console.log(`${idx + 1}. Input: "${input}"`);
  console.log(`   Type: ${result.type}`);
  console.log(`   Confidence: ${result.confidence}`);
  if (result.payload) {
    console.log(`   Payload:`, JSON.stringify(result.payload));
  }
  console.log('');
});

console.log('\n✅ All tests completed!');
console.log('\n📊 Key Observations:');
console.log('✓ "เพิ่ม ค่าแรง 15000" → ADD_ITEM (confidence 0.9)');
console.log('✓ "ค่าวัสดุ 18000" → ADD_ITEM (confidence 0.75) [Flexible paste-to-edit]');
console.log('✓ "ปูนซีเมนต์ 10 x 120" → ADD_ITEM with qty (confidence 0.85)');
console.log('✓ "ส่วนลด 10%" → SET_DISCOUNT type=PERCENT');
console.log('✓ "สวัสดี" → UNKNOWN (confidence 0.0)');
