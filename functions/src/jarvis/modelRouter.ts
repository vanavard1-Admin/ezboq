/**
 * Model Router — Smart model selection based on message complexity
 *
 * วิเคราะห์ข้อความแล้วเลือก Claude model ที่เหมาะสม:
 * - simple → Haiku (เร็ว 3x, ถูก 10x)
 * - moderate → Sonnet
 * - complex → Sonnet (max tokens สูงกว่า)
 */

export type MessageComplexity = "simple" | "moderate" | "complex";

/**
 * Classify message complexity without API call (pure regex/keyword)
 */
export function classifyComplexity(message: string): MessageComplexity {
  const text = message.trim().toLowerCase();

  // ===== SIMPLE: greetings, menu, yes/no, short messages =====
  const simplePatterns = [
    /^(สวัสดี|หวัดดี|ดี|ดีครับ|ดีค่ะ|hi|hello|hey|yo|โย่ว?|เฮ้?|ว่า(ไง|ไร)|ทัก|555+|หวัด)$/i,
    /^(เมนู|menu|help|ช่วยเหลือ|วิธีใช้|ทำอะไรได้บ้าง)$/i,
    /^(ใช่|ไม่|ไม่ใช่|ok|ได้|ไม่ได้|ยกเลิก|ยืนยัน|cancel|yes|no|ครับ|ค่ะ)$/i,
    /^(ขอบคุณ|ขอบใจ|thanks|thank you|thx)$/i,
    /^(ปิด|exit|quit|bye|บาย|ลา|ไปแล้ว)$/i,
    /^(ปิด\s*jarvis|exit\s*jarvis|\/ezdoc)$/i,
  ];
  if (simplePatterns.some((p) => p.test(text)) || text.length < 5) {
    return "simple";
  }

  // ===== COMPLEX: document creation, reports, trip planning, writing =====
  const complexPatterns = [
    // EzDoc document creation
    /ออก(ใบ|เอกสาร)|สร้าง(ใบ|เอกสาร)/,
    /ใบเสนอราคา|ใบวางบิล|ใบเสร็จ|ใบลดหนี้|ใบเพิ่มหนี้/,
    // Reports
    /รายงาน|สรุปยอด|ยอดขาย|ลูกค้าท็อป|ค้างชำระ|สถิติ/,
    // Trip planning
    /วางแผน(เที่ยว|ทริป)|จัดทริป|แพลนเที่ยว|ที่เที่ยว/,
    // Writing
    /เขียน(ข้อความ|อีเมล|จดหมาย|รีวิว|แคปชั่น|บทความ)/,
    // Long explanations
    /อธิบาย.{10,}|สอน.{10,}/,
    // Receipt from invoice
    /ออกใบเสร็จจาก|สร้างใบเสร็จจาก/,
  ];
  if (complexPatterns.some((p) => p.test(text)) || text.length > 100) {
    return "complex";
  }

  // ===== MODERATE: everything else =====
  return "moderate";
}

/**
 * Select Claude model based on complexity
 */
export function selectModel(complexity: MessageComplexity): string {
  void complexity;
  // ใช้ Haiku ทุก task — ถูกที่สุด, เร็วที่สุด
  // AI chat ฟรี ไม่จำกัด, ต้นทุนต่ำสุด
  return "claude-haiku-4-5-20251001";
}

/**
 * Get max tokens for response based on complexity
 */
export function getMaxTokens(complexity: MessageComplexity): number {
  switch (complexity) {
    case "simple":
      return 256;
    case "moderate":
      return 768;
    case "complex":
      return 1536;
  }
}
