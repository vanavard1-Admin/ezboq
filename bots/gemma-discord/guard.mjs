/**
 * 💎 Gemma Hallucination Guard — Critical Fact Registry
 * Post-processing filter: ตรวจคำตอบก่อนส่ง ถ้าชน forbidden fact → rewrite/block
 *
 * ไม่ guard ทุกประโยค — เฉพาะ facts ที่ "ห้ามผิด"
 */

// ─── Critical Fact Registry ──────────────────────
// แต่ละ fact มี: key, context patterns (เมื่อไหร่ควรเช็ค), allowed, forbidden, rewrite
const CRITICAL_FACTS = [
  // === Identity ===
  {
    key: 'gemma_identity',
    context: /เจมม่า|gemma|คือใคร|ทำอะไรได้|ช่วยอะไร|แนะนำตัว/i,
    forbidden: [/ChatGPT/i, /GPT-4/i, /OpenAI/i, /Bard/i, /Copilot/i],
    rewrite: (text) => text
      .replace(/ChatGPT/gi, 'เจมม่า')
      .replace(/GPT-4/gi, 'Gemini')
      .replace(/OpenAI/gi, 'Gemini API'),
  },
  {
    key: 'gemma_gender',
    context: /เจมม่า|gemma/i,
    forbidden: [/เจมม่า.*ครับ/i, /ผม.*เจมม่า/i],
    // Gemma = female, uses ค่ะ/คะ
    note: 'soft — ไม่ block แค่ log',
  },

  // === Team ===
  {
    key: 'seahorse_model',
    context: /ม้าน้ำ|seahorse|lead dev/i,
    forbidden: [/ม้าน้ำ.*GPT/i, /ม้าน้ำ.*Gemini/i, /ม้าน้ำ.*Gemma/i],
    allowed: [/ม้าน้ำ.*Claude/i, /Claude.*ม้าน้ำ/i],
    rewrite: (text) => text.replace(/ม้าน้ำ\s*\(?(GPT|Gemini|Gemma)\)?/gi, 'ม้าน้ำ (Claude)'),
  },
  {
    key: 'beaver_name',
    context: /beaver|shadowsbeaver|บอส/i,
    forbidden: [/beaver.*บอสฝน/i, /shadowsbeaver.*บอสฝน/i, /เรียก.*beaver.*ฝน/i],
    rewrite: (text) => text.replace(/บอสฝน/g, 'บอส'),
  },
  {
    key: 'no_user_redirect_to_team',
    context: /./,
    forbidden: [
      /แนะนำให้ถาม\s*ม้าน้ำ/i,
      /บอสสามารถพิมพ์สั่งหัวหน้าม้าน้ำ/i,
      /รบกวนให้พี่ม้าน้ำ/i,
      /ให้\s*ม้าน้ำ.*ช่วยอัปเดตโค้ด/i,
      /ให้\s*Claude.*ช่วยอัปเดตโค้ด/i,
      /ไปคุยกับ\s*(Claude|ม้าน้ำ|ปลาดาว|ปลาวาฬ)/i,
      /ไปสั่ง\s*(Claude|ม้าน้ำ|ปลาดาว|ปลาวาฬ)/i,
    ],
    rewrite: (text) => {
      const cleaned = text
        .split('\n')
        .filter(line => !/แนะนำให้ถาม\s*ม้าน้ำ|บอสสามารถพิมพ์สั่งหัวหน้าม้าน้ำ|รบกวนให้พี่ม้าน้ำ|ให้\s*ม้าน้ำ.*ช่วยอัปเดตโค้ด|ให้\s*Claude.*ช่วยอัปเดตโค้ด|ไปคุยกับ\s*(Claude|ม้าน้ำ|ปลาดาว|ปลาวาฬ)|ไปสั่ง\s*(Claude|ม้าน้ำ|ปลาดาว|ปลาวาฬ)/i.test(line))
        .join('\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

      return cleaned || 'ถ้าต้องการความสามารถนี้ ต้องอัปเดตระบบเพิ่มก่อนค่ะ ตอนนี้เจมม่าจะช่วยตามที่ runtime ปัจจุบันรองรับให้ก่อน';
    },
  },
  {
    key: 'no_push_user_to_locate_repo',
    context: /ezboq|repo|project|โปรเจกต์|ไฟล์โค้ด|source|liff|routing|bug/i,
    forbidden: [
      /รบกวนคุณช่วยระบุตำแหน่งโฟลเดอร์/i,
      /ช่วยระบุ.*โปรเจกต์ที่เก็บโค้ด/i,
      /ผมไม่มีซอร์สโค้ดส่วน.*ที่ถูกต้อง/i,
      /ทำให้.*แก้บั๊กต่อไม่ได้/i,
    ],
    rewrite: (text) => text
      .split('\n')
      .filter(line => !/รบกวนคุณช่วยระบุตำแหน่งโฟลเดอร์|ช่วยระบุ.*โปรเจกต์ที่เก็บโค้ด|ผมไม่มีซอร์สโค้ดส่วน.*ที่ถูกต้อง|ทำให้.*แก้บั๊กต่อไม่ได้/i.test(line))
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim(),
  },

  // === Wendy / Pets ===
  {
    key: 'wendy_breed',
    context: /wendy|เวนดี้|สุนัข|หมา|dog|pet|พันธุ์/i,
    forbidden: [/พุดเดิ้ล/i, /poodle/i, /toy poodle/i, /พุดเดิล/i],
    allowed: [/บิชอง/i, /bichon/i, /Bichon Frisé/i],
    rewrite: (text) => text
      .replace(/พุดเดิ้ล/gi, 'บิชอง (Bichon Frisé)')
      .replace(/พุดเดิล/gi, 'บิชอง (Bichon Frisé)')
      .replace(/[Pp]oodle/gi, 'Bichon Frisé')
      .replace(/[Tt]oy [Pp]oodle/gi, 'Bichon Frisé'),
  },

  // === EzBOQ ===
  {
    key: 'ezboq_plans',
    context: /แพ็กเกจ|plan|EzBOQ|ราคา.*แพ็ก/i,
    forbidden: [/Enterprise/i, /Premium.*plan/i, /แพ็กเกจ.*4/i, /แพ็กเกจ.*5/i],
    // Only 3 plans: Free, Pro (99), Business (279)
    note: 'EzBOQ มี 3 แพ็กเกจเท่านั้น: Free, Pro ฿99, Business ฿279',
  },
  {
    key: 'ezboq_pricing',
    context: /Pro.*ราคา|ราคา.*Pro|฿.*Pro|Business.*ราคา/i,
    forbidden: [/Pro.*199/i, /Pro.*299/i, /Pro.*499/i, /Business.*199/i, /Business.*499/i, /Business.*999/i],
    // Pro = 99, Business = 279
  },
  {
    key: 'promptpay',
    context: /promptpay|พร้อมเพย์|โอนเงิน|ชำระเงิน/i,
    allowed: [/0933299990/],
    forbidden: [/09[0-9]{8}(?!33299990)/], // wrong PromptPay numbers
  },

  // === Vanavard ===
  {
    key: 'vanavard_business',
    context: /vanavard|วานาวาร์ด/i,
    forbidden: [/ร้านอาหาร/i, /คาเฟ่/i, /ขายของ.*ออนไลน์/i],
    allowed: [/interior/i, /ออกแบบ/i, /ภายใน/i, /สถาปัตย์/i, /ก่อสร้าง/i],
  },

  // === Fur and Found ===
  {
    key: 'fur_and_found',
    context: /fur and found|퍼 앤 파운드/i,
    forbidden: [/ญี่ปุ่น/i, /จีน/i, /อเมริกา/i],
    allowed: [/เกาหลี/i, /korean/i, /สัตว์เลี้ยง/i, /pet/i],
  },

  // === Credentials / Safety ===
  {
    key: 'no_credentials',
    context: /./,  // Always check
    forbidden: [
      /sk-[a-zA-Z0-9]{20,}/,           // OpenAI-style keys
      /MTQ[a-zA-Z0-9]{50,}/,            // Discord tokens
      /ghp_[a-zA-Z0-9]{30,}/,           // GitHub tokens
      /PyevmaezOQO7/,                    // Lazada app secret
      /r8ZMKhPxu1JZ/,                   // Lazada affiliate secret
      /AIza[a-zA-Z0-9_-]{30,}/,         // Google API keys
    ],
    rewrite: (text) => text
      .replace(/sk-[a-zA-Z0-9]{20,}/g, '[key redacted]')
      .replace(/MTQ[a-zA-Z0-9]{50,}/g, '[token redacted]')
      .replace(/ghp_[a-zA-Z0-9]{30,}/g, '[token redacted]')
      .replace(/PyevmaezOQO7\w*/g, '[secret redacted]')
      .replace(/r8ZMKhPxu1JZ\w*/g, '[secret redacted]')
      .replace(/AIza[a-zA-Z0-9_-]{30,}/g, '[key redacted]'),
  },

  // === Interior Pricing ===
  {
    key: 'interior_pricing',
    context: /ราคา.*ตร\.?ม|บาท.*ตร\.?ม|ตร\.?ม.*บาท|ประเมินราคา/i,
    forbidden: [
      /รีโนเว.*[3-9]0,000/i,  // renovation ไม่ควรเกิน 18,000/ตร.ม.
      /สร้าง.*ใหม่.*[4-9]0,000/i,  // new build ไม่ควรเกิน 28,000/ตร.ม.
    ],
    note: 'ราคาสูงสุด: renovation 18K, new_build 28K, interior 16K, built_in 12K ต่อ ตร.ม.',
  },
];

// ─── Guard Engine ────────────────────────────────

/**
 * Check response against critical facts
 * @param {string} response — Gemma's raw response
 * @param {string} userInput — User's original question
 * @returns {{ clean: string, violations: Array, rewritten: boolean }}
 */
export function guardResponse(response, userInput = '') {
  if (!response || typeof response !== 'string') {
    return { clean: response || '', violations: [], rewritten: false };
  }

  const violations = [];
  let clean = response;
  let rewritten = false;

  for (const fact of CRITICAL_FACTS) {
    // Skip if context doesn't match user input OR response
    if (fact.context && !fact.context.test(userInput) && !fact.context.test(response)) {
      continue;
    }

    // Check forbidden patterns
    if (fact.forbidden) {
      for (const pattern of fact.forbidden) {
        if (pattern.test(clean)) {
          violations.push({
            key: fact.key,
            pattern: pattern.source,
            severity: fact.note ? 'warning' : 'critical',
          });

          // Apply rewrite if available
          if (fact.rewrite) {
            clean = fact.rewrite(clean);
            rewritten = true;
          }
        }
      }
    }
  }

  // Log violations
  if (violations.length > 0) {
    const critical = violations.filter(v => v.severity === 'critical').length;
    const warning = violations.filter(v => v.severity === 'warning').length;
    console.log(`[GUARD] ⚠️ ${violations.length} violations (${critical} critical, ${warning} warning): ${violations.map(v => v.key).join(', ')}`);
    if (rewritten) {
      console.log(`[GUARD] ✏️ Response rewritten to fix violations`);
    }
  }

  return { clean, violations, rewritten };
}

/**
 * Get all registered critical facts (for debugging/display)
 */
export function getCriticalFacts() {
  return CRITICAL_FACTS.map(f => ({
    key: f.key,
    hasForbidden: (f.forbidden?.length || 0),
    hasRewrite: !!f.rewrite,
    note: f.note || null,
  }));
}

/**
 * Quick test: run guard against a test string
 */
export function testGuard(text, context = '') {
  return guardResponse(text, context);
}
