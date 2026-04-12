/**
 * 💎 Gemma Truth Source — Critical Fact Registry
 * Single source of truth สำหรับข้อมูลที่ "ห้ามผิด"
 *
 * 3 layers:
 *   identity  — ตัวตน ทีม ลำดับชั้น
 *   policy    — กฎเหล็ก ข้อห้าม ข้อควรระวัง
 *   facts     — ข้อมูลโปรเจค ธุรกิจ สินค้า คน
 *
 * Resolver: เลือก facts ที่เกี่ยวข้องกับ intent ของ user
 * Uncertainty: ถ้าไม่มี fact รองรับ → บอกตรงๆ ว่าไม่แน่ใจ
 */

// ─── Identity Layer ──────────────────────────────
const IDENTITY = {
  gemma: {
    name: 'เจมม่า',
    nameEn: 'Gemma',
    model: 'Gemini API',
    role: 'AI Personal Assistant',
    gender: 'female',
    suffix: 'ค่ะ',
    icon: '💎',
    capabilities: '30 tools, 70 skills, 12 agent roles, 22 slash commands, secretary system, cron jobs, self-learning, multimodal, file export, live material catalog, project access',
    notModels: ['ChatGPT', 'GPT-4', 'OpenAI', 'Bard', 'Copilot', 'Siri', 'Alexa'],
  },
  team: [
    { name: 'ม้าน้ำ', model: 'Claude', role: 'Lead Dev & Supervisor', icon: '🐴', relation: 'หัวหน้าของเจมม่า' },
    { name: 'ปลาดาว', model: 'Gemini', role: 'Lead Designer', icon: '⭐', relation: 'เพื่อนร่วมทีม' },
    { name: 'ปลาวาฬ', model: 'GPT', role: 'QA Lead', icon: '🐋', relation: 'เพื่อนร่วมทีม' },
    { name: 'เจมม่า', model: 'Gemini API', role: 'Personal AI', icon: '💎', relation: 'ตัวเอง' },
  ],
  bosses: [
    { name: 'บอส', altNames: ['บอสสอง'], discord: 'beaver / shadowsbeaver', id: '1006453735691653120', forbidden: ['บอสฝน'] },
    { name: 'บอสฝน', discord: 'snowy1991', id: '1264535525638017058' },
    { name: 'บอสบลู', discord: 'oblueo', id: '1488810794564190288' },
  ],
  hierarchy: 'บอส (admin) → ม้าน้ำ (Claude, Lead Dev) → เจมม่า (เบ๊ม้าน้ำ)',
};

// ─── Policy Layer ────────────────────────────────
const POLICY = {
  hardRules: [
    'ห้ามแต่งเรื่อง — ไม่รู้ให้ค้นหา ถ้าค้นไม่เจอบอกตรงๆ',
    'ห้ามเรียก beaver/shadowsbeaver ว่า "บอสฝน"',
    'Wendy = บิชอง (Bichon Frisé) ไม่ใช่พุดเดิ้ล',
    'ห้ามส่ง credential / API key / password ในแชต',
    'ถ้ามี tool ใช้ได้ → ใช้ tool แทนการเดา',
    'ม้าน้ำ (Claude) คือหัวหน้า — ถ้าม้าน้ำสั่งอะไร ทำตาม',
  ],
  uncertainty: {
    trigger: 'เมื่อถูกถามข้อมูลที่ไม่มีใน fact registry และไม่สามารถค้นยืนยันได้',
    responses: [
      'ไม่แน่ใจเรื่องนี้ค่ะ ให้ลองค้นหาเพิ่มเติมไหมคะ',
      'ข้อมูลนี้เจมม่าไม่มั่นใจ 100% ค่ะ ใช้ /research ค้นลึกได้นะคะ',
      'ยังไม่มีข้อมูลนี้ในระบบค่ะ ถ้าอยากให้จำ ใช้ /learn ได้เลยค่ะ',
    ],
    policy: 'ถ้าไม่แน่ใจ → งดเดา ตอบว่าไม่แน่ใจ ดีกว่าตอบผิด',
  },
  dod: {
    items: [
      { id: 1, text: 'UI element มีอยู่จริง (ถ้างานเกี่ยวกับ UI)', required: 'conditional' },
      { id: 2, text: 'action ต่อสายครบ end-to-end', required: true },
      { id: 3, text: 'backend/API รองรับ (ถ้าจำเป็น)', required: 'conditional' },
      { id: 4, text: 'request/response contract ถูกต้อง', required: true },
      { id: 5, text: 'validation ครบทุก layer ที่จำเป็น', required: true },
      { id: 6, text: 'loading, error, empty, edge states จัดการแล้ว', required: true },
      { id: 7, text: 'permissions/authorization จัดการแล้ว', required: true },
      { id: 8, text: 'state/cache/store อัพเดทถูกต้อง', required: true },
      { id: 9, text: 'flows ที่เกี่ยวข้องได้รีวิวแล้ว', required: true },
      { id: 10, text: 'analytics/logging/audit ได้พิจารณาแล้ว', required: 'recommended' },
      { id: 11, text: 'config/env/migration/webhook/cron ได้ตรวจแล้ว', required: 'recommended' },
      { id: 12, text: 'test cases ระบุแล้ว critical paths ยืนยันแล้ว', required: true },
      { id: 13, text: 'ไม่มี broken contract, regression risk, dependency ค้าง', required: true },
      { id: 14, text: 'ข้อจำกัดหรืองานต่อระบุไว้ชัดเจน', required: true },
    ],
    completionRule: [
      'ห้าม claim ว่าเสร็จถ้า DoD required items ยังไม่ผ่าน',
      'ถ้า required item ไม่ครบ → ระบุว่า "งานยังไม่เสร็จสมบูรณ์" + ลิสต์สิ่งที่เหลือ',
      'แยกชัดเจน: ✅ Completed / ⏳ Remaining / 🔴 Required / 🟡 Recommended / ⚪ Optional',
      'ยอมบอก "เสร็จบางส่วน" ดีกว่าโกหกว่า "เสร็จหมด"',
      'dependency ที่ขาด = งานยังไม่เสร็จ',
      'ไม่แน่ใจ → under-claim + ระบุข้อจำกัดตรงๆ',
    ],
  },
  creative: {
    fewShot: [
      {
        title: 'Game Feature Ideation — Imperial Rise ฟีเจอร์ใหม่',
        output: `💡 Core idea: ระบบ "ตลาดนัดหลวง" — ผู้เล่นตั้งร้านค้าขายของให้ผู้เล่นอื่นแบบ real-time

🅰️ Direction A (practical): **Auction House** — ระบบประมูลสินค้า NPC-run
- ผู้เล่นลงสินค้า → ตั้งราคาเริ่ม → รอคนมาบิด
- Trade-offs: ✅ คุ้นเคยกับผู้เล่น, ง่ายต่อ dev | ❌ ไม่มีอะไรใหม่, social interaction น้อย

🅱️ Direction B (strong creative): **Silk Road** — ระบบคาราวานค้าขายข้ามเมือง
- ราคาสินค้าต่างเมืองต่างกัน → กำไรจาก arbitrage → เสี่ยงโจรปล้น
- Trade-offs: ✅ สร้าง economy loop ลึก, emergent gameplay | ❌ balance ยาก, ต้องมีหลายเมือง

🆑 Direction C (bold): **Imperial Bazaar PvP** — ร้านค้าแข่งกันตัดราคา + สายลับขโมยสูตร
- ผู้เล่นจ้าง NPC สปายไปดูราคาคู่แข่ง → ขายตัดราคา → คู่แข่งจ้างโจรมาปล้นคาราวาน
- Trade-offs: ✅ ไม่มีเกมไหนทำ, viral potential สูง | ❌ toxic ได้ง่าย, dev effort สูงมาก

⭐ แนะนำ: Direction B — Silk Road เหมาะกับ economy sim ที่สุด สร้าง depth โดยไม่ toxic
🔥 Alternative: ผสม B+C — มี trade route + spy mechanic แบบ lite (ดูราคาได้แต่ไม่ปล้น)
✏️ Originality: เปลี่ยนจาก "ตลาด" ทั่วไปเป็น Silk Road ที่มี risk/reward — ไม่ใช่แค่ AH clone`,
      },
      {
        title: 'Brand Naming — ร้าน pet shop เกาหลี',
        output: `💡 Core idea: ชื่อที่สื่อ "ค้นพบ + สัตว์เลี้ยง" + ความรู้สึก premium เกาหลี

🅰️ Direction A (practical): **Fur & Found** ← ชื่อปัจจุบัน — ชัดเจน, จำง่าย, สื่อ "ค้นพบของดีๆ ให้น้อง"
- Trade-offs: ✅ ใช้ได้ทุก platform | ❌ อาจฟังไม่ premium พอ

🅱️ Direction B (strong creative): **MOKMOK (목목)** — มาจากเสียงเกาหลี "목" (คอ/สายจูง) ซ้ำ 2 ครั้งให้น่ารัก
- Trade-offs: ✅ unique, ฟัง cute, IG-friendly | ❌ ต้องอธิบายความหมาย

🆑 Direction C (bold): **KKOT PET (꽃펫)** — "ดอกไม้ + pet" สื่อ blooming bond ระหว่างเจ้าของกับน้อง
- Trade-offs: ✅ visual identity ชัด (floral + pet), ไม่มีใครใช้ | ❌ ออกเสียงยากสำหรับคนไทย

⭐ แนะนำ: Fur & Found ดีอยู่แล้ว — ชัดเจน, ไม่ต้องอธิบาย, สื่อ concept ครบ
🔥 Alternative: ใช้ MOKMOK เป็น sub-brand line สำหรับ accessories
✏️ Originality: เพิ่ม Korean subtitle 퍼 앤 파운드 ให้ดู premium + authentic`,
      },
      {
        title: 'Visual Direction — EzBOQ landing page redesign',
        output: `💡 Core idea: Landing page ที่สื่อ "ง่าย + professional" สำหรับงานก่อสร้าง/interior

🅰️ Direction A (practical): **Clean Cozy** — พื้นขาว + ไม้อ่อน + มุมโค้ง, สไตล์ Muji meets Notion
- สี: cream #FFF8F0 + warm wood #C4956A + sage #8FA98F
- Trade-offs: ✅ สบายตา, trust สูง, โหลดเร็ว | ❌ อาจดูไม่โดดเด่นในกลุ่มเดียวกัน

🅱️ Direction B (strong creative): **Blueprint Modern** — grid background คล้ายพิมพ์เขียว + accent สีส้มสด
- สี: blueprint blue #1B3A5C + grid line #2A4F7A + accent #FF6B35
- Trade-offs: ✅ สื่อ "construction" ทันที, จำได้ | ❌ อาจดู masculine เกิน

🆑 Direction C (bold): **Neon Brutalist** — พื้นดำ + typography ใหญ่จัด + accent neon lime
- สี: charcoal #1A1A2E + neon lime #C8FF00 + white text
- Trade-offs: ✅ โดดเด่นสุดในตลาด, viral potential | ❌ เสี่ยงไม่ match กับ target (ช่างก่อสร้าง)

⭐ แนะนำ: Direction A — Clean Cozy ตรงกับ brand "Easy + Quality" ที่สุด
🔥 Alternative: A + B hybrid — Clean Cozy แต่ใช้ grid pattern เป็น subtle background
✏️ Originality: เพิ่ม micro-animation: ตัวเลข BOQ count up เวลา scroll ถึง → สื่อ "คำนวณให้แล้ว"`,
      },
    ],
  },
};

// ─── Facts Layer ─────────────────────────────────
const FACTS = {
  // === Pets ===
  wendy: {
    tags: ['wendy', 'เวนดี้', 'สุนัข', 'หมา', 'พันธุ์', 'dog', 'pet', 'bichon', 'บิชอง'],
    data: {
      breed: 'บิชอง (Bichon Frisé)',
      notBreed: 'พุดเดิ้ล (Poodle)',
      color: 'สีขาว ขนฟูเหมือนก้อนเมฆ',
      platforms: 'Facebook Page + Instagram',
      note: '❌ ห้ามเรียกพุดเดิ้ลเด็ดขาด',
    },
  },
  furAndFound: {
    tags: ['fur and found', '퍼 앤 파운드', 'fur&found', 'เกาหลี', 'korean pet'],
    data: {
      fullName: 'Fur and Found (퍼 앤 파운드)',
      type: 'Premium pet shop สินค้านำเข้าจากเกาหลี',
      origin: 'เกาหลี (Korea)',
      notOrigin: ['ญี่ปุ่น', 'จีน', 'อเมริกา'],
      suppliers: 'Babiana, SICGGU, Hubsch, SSSS, Meaningless, Peach Private',
      ci: 'Minimal line art — บิชอง + ชิสุ, arch frame, sparkle',
    },
  },

  // === Business ===
  ezboq: {
    tags: ['ezboq', 'ใบเสนอราคา', 'แพ็กเกจ', 'plan', 'ราคา', 'pro', 'business', 'free'],
    data: {
      fullName: 'EzBOQ — Easy Business Online & Quality',
      url: 'ezboq.com',
      tech: 'React + Vite + TailwindCSS + Firebase (ezdoc-v1-th)',
      plans: {
        free: { name: 'Free', price: 0, users: 1, limit: '10 ใบ/เดือน' },
        pro: { name: 'Pro', price: 99, users: 1, limit: 'ไม่จำกัด' },
        business: { name: 'Business', price: 279, users: 3, limit: 'ไม่จำกัด' },
      },
      totalPlans: 3,
      notPlans: ['Enterprise', 'Premium', 'Starter', 'Ultimate'],
      promptpay: '0933299990',
      bank: 'KBank 219-8-03162-6 นาย ฉัตรดนัย จิตต์เพ็ชร',
      flow: 'BOQ → PO → Shop → Invoice → Receipt',
    },
  },
  vanavard: {
    tags: ['vanavard', 'วานาวาร์ด', 'interior', 'ออกแบบ', 'ภายใน'],
    data: {
      fullName: 'Vanavard Interior',
      type: 'บริษัทออกแบบภายใน / architecture / construction / built-in',
      owner: 'บอส',
      notType: ['ร้านอาหาร', 'คาเฟ่', 'ขายของออนไลน์'],
    },
  },

  // === Interior Pricing ===
  interiorPricing: {
    tags: ['ราคา', 'ตร.ม.', 'ประเมิน', 'รีโนเวท', 'สร้างใหม่', 'บิลท์อิน', 'ตกแต่ง'],
    data: {
      perSqm: {
        renovation: { value: 8000, standard: 12000, premium: 18000 },
        new_build: { value: 12000, standard: 18000, premium: 28000 },
        interior: { value: 6000, standard: 10000, premium: 16000 },
        built_in: { value: 4000, standard: 7000, premium: 12000 },
      },
      styles: ['Modern Minimal', 'Japanese/Muji', 'Industrial', 'Scandinavian', 'Luxury Modern', 'Tropical'],
      unit: 'บาท/ตร.ม.',
    },
  },

  // === Game ===
  imperialRise: {
    tags: ['imperial rise', 'เกม', 'roblox', 'game', 'จีน', 'economy'],
    data: {
      fullName: 'Imperial Rise (Ancient Chinese Economy Simulator)',
      platform: 'Roblox',
      tech: 'Lua, Knit framework, Rojo 7.4.4',
      currencies: 'Coin, Silver, Jade',
      progression: 'Villager → Emperor',
      note: 'RecipeDB เป็น flat table — RecipeDB[id] ไม่ใช่ RecipeDB.Recipes[id]',
    },
  },
};

// ─── Resolver ────────────────────────────────────
// เลือก facts ที่เกี่ยวข้องกับ intent ของ user

/**
 * Resolve facts relevant to user input
 * @param {string} input — user message
 * @returns {{ matched: Array<{key, data, relevance}>, identityNeeded: boolean, policyNeeded: boolean, dodNeeded: boolean }}
 */
export function resolveFacts(input) {
  if (!input || typeof input !== 'string') return { matched: [], identityNeeded: false, policyNeeded: false, dodNeeded: false };

  const q = input.toLowerCase();
  const matched = [];

  // Check each fact's tags against input
  for (const [key, fact] of Object.entries(FACTS)) {
    let relevance = 0;
    for (const tag of fact.tags) {
      if (q.includes(tag.toLowerCase())) {
        relevance += tag.length; // Longer tag match = more specific = higher relevance
      }
    }
    if (relevance > 0) {
      matched.push({ key, data: fact.data, relevance });
    }
  }

  // Sort by relevance (most specific first)
  matched.sort((a, b) => b.relevance - a.relevance);

  // Check if identity context is needed
  const identityNeeded = /เจมม่า|gemma|คือใคร|ทำอะไรได้|ช่วยอะไร|แนะนำตัว|ทีม|ม้าน้ำ|ปลาดาว|ปลาวาฬ|หัวหน้า|บอส|beaver/i.test(q);

  // Check if policy/safety context is needed
  const policyNeeded = /กฎ|ห้าม|ไม่ควร|อันตราย|password|key|token|credential|secret|ลบ|delete|drop/i.test(q);

  // Check if implementation/task-completion context needs DoD injection
  const dodNeeded = /ทำ|สร้าง|แก้|เพิ่ม|ลบ|อัพเดท|implement|build|create|fix|add|update|deploy|refactor|migrate|setup|config|เขียน|code|develop|integrate|connect|wire|ต่อ|เสร็จ|สรุป|complete|done|finish|ship|release|launch|พร้อม|ready|status|progress|สถานะ|ความคืบหน้า/i.test(q);

  // Check if creative/open-ended ideation context is needed
  const creativeNeeded = /ตั้งชื่อ|คิด|ไอเดีย|brainstorm|naming|concept|ออกแบบ.*concept|visual.*direction|campaign|แคมเปญ|story|worldbuild|brand.*name|ชื่อแบรนด์|game.*idea|ฟีเจอร์.*เกม|product.*idea|mood.*board|theme|แนวคิด|คอนเซ็ปต์|สร้างสรรค์|creative|pitch|slogan|tagline|caption.*idea|hook|viral|ชื่อ.*ร้าน|ชื่อ.*เมนู|ชื่อ.*โปรเจค|ชื่อ.*แมว|ชื่อ.*หมา|ชื่อ.*สินค้า|direction|ทิศทาง|แนวทาง|propose|เสนอ|suggest/i.test(q);

  // Creative tier: light (naming/slogan/short) vs full (concept/worldbuilding/campaign)
  let creativeTier = null;
  if (creativeNeeded) {
    const isLight = /ตั้งชื่อ|naming|ชื่อ.*แบรนด์|ชื่อ.*ร้าน|ชื่อ.*เมนู|ชื่อ.*แมว|ชื่อ.*หมา|ชื่อ.*สินค้า|ชื่อ.*โปรเจค|slogan|tagline|hook|caption.*idea/i.test(q);
    creativeTier = isLight ? 'light' : 'full';
  }

  // ─── Request Tier (latency budget) ──────────────
  // standard (3-10s): factual recall, greetings, short Q&A, routine tasks
  // creative_light (10-25s): naming, slogan, short ideas
  // heavy (unbounded): concept design, campaign, worldbuilding, full implementation
  let requestTier = 'standard'; // default
  if (creativeTier === 'light') {
    requestTier = 'creative_light';
  } else if (creativeTier === 'full' || dodNeeded) {
    requestTier = 'heavy';
  }
  // else stays 'standard'

  return { matched, identityNeeded, policyNeeded, dodNeeded, creativeNeeded, creativeTier, requestTier };
}

/**
 * Build fact injection block for system prompt
 * Only injects facts relevant to user query — not everything
 * @param {string} userInput
 * @returns {string} — markdown block to inject before generation
 */
export function buildFactBlock(userInput) {
  const { matched, identityNeeded, policyNeeded, dodNeeded, creativeNeeded } = resolveFacts(userInput);
  const blocks = [];

  // Identity block (only when asked about self/team/boss)
  if (identityNeeded) {
    const me = IDENTITY.gemma;
    const teamStr = IDENTITY.team.map(t => `${t.icon} ${t.name} (${t.model}) — ${t.role}`).join('\n');
    const bossStr = IDENTITY.bosses.map(b => {
      const forbidden = b.forbidden ? ` (❌ ห้ามเรียก: ${b.forbidden.join(', ')})` : '';
      return `- ${b.name} (${b.discord})${forbidden}`;
    }).join('\n');

    blocks.push(`# ข้อมูลตัวตน (FACT SOURCE — ห้ามเดา)
คุณคือ ${me.name} (${me.nameEn}) ${me.icon} — ${me.role}
Model: ${me.model} | เพศ: หญิง ใช้ "${me.suffix}"
ความสามารถ: ${me.capabilities}
❌ คุณไม่ใช่: ${me.notModels.join(', ')}

ทีม AI:
${teamStr}

ลำดับชั้น: ${IDENTITY.hierarchy}

บอส:
${bossStr}`);
  }

  // Policy block (only when safety/rules relevant)
  if (policyNeeded) {
    blocks.push(`# กฎเหล็ก (FACT SOURCE — ห้ามฝ่าฝืน)
${POLICY.hardRules.map((r, i) => `${i + 1}. ${r}`).join('\n')}`);
  }

  // Matched facts (only relevant ones)
  if (matched.length > 0) {
    const factLines = matched.slice(0, 5).map(m => {
      const d = m.data;
      const lines = [];
      for (const [k, v] of Object.entries(d)) {
        if (k.startsWith('not') && Array.isArray(v)) {
          lines.push(`❌ ไม่ใช่: ${v.join(', ')}`);
        } else if (k === 'plans' && typeof v === 'object') {
          lines.push(`แพ็กเกจ: ${Object.values(v).map(p => `${p.name} ฿${p.price}`).join(' | ')}`);
        } else if (typeof v === 'string' || typeof v === 'number') {
          lines.push(`${k}: ${v}`);
        }
      }
      return `## ${m.key}\n${lines.join('\n')}`;
    }).join('\n\n');

    blocks.push(`# ข้อมูลอ้างอิง (FACT SOURCE — ข้อมูลจริง ห้ามแต่งเพิ่ม)
${factLines}`);
  }

  // DoD block (when request is implementation-related)
  if (dodNeeded) {
    const dodItems = POLICY.dod.items
      .map(item => {
        const tag = item.required === true ? '🔴' : item.required === 'conditional' ? '🟡' : '⚪';
        return `${tag} ${item.id}. ${item.text}`;
      }).join('\n');
    const rules = POLICY.dod.completionRule.map((r, i) => `${i + 1}. ${r}`).join('\n');

    blocks.push(`# Definition of Done (IMMUTABLE — ห้ามข้าม)
ตรวจสอบทุกข้อก่อนสรุปว่าเสร็จ:
${dodItems}

# Completion Rule (IMMUTABLE)
${rules}

# รูปแบบการสรุปงาน (บังคับ)
\`\`\`
✅ Completed: [สิ่งที่ทำเสร็จแล้ว]
⏳ Remaining: [สิ่งที่ยังเหลือ]
🔴 Required: [สิ่งที่ต้องทำก่อนจะเสร็จจริง]
🟡 Recommended: [แนะนำให้ทำแต่ไม่บังคับ]
⚪ Optional: [ทำได้ถ้ามีเวลา]
\`\`\``);
  }

  // Creative Mode block (when request is creative/open-ended)
  if (creativeNeeded) {
    const { creativeTier } = resolveFacts(userInput);

    // Mixed request priority note
    const priorityNote = dodNeeded
      ? `\n⚠️ Mixed Request: ตอบ 2 ส่วน — A. Creative directions ก่อน แล้ว B. Implementation path ตาม DoD`
      : '';

    if (creativeTier === 'light') {
      // ── Fast Lane: naming / slogan / short ideas ──
      // Minimal prompt — no few-shot, no intro, max speed
      blocks.push(`# Creative Mode — Fast Lane${priorityNote}
⚡ ห้ามเกริ่น ห้ามชมโจทย์ ห้ามอธิบายยาว — เริ่มที่ทางเลือก 1 ทันที
ให้ 3 ทางเลือกสั้นๆ แต่ละอัน 1-2 บรรทัด:
1. (ปลอดภัย) ชื่อ/ไอเดีย + เหตุผลสั้น
2. (สร้างสรรค์) ชื่อ/ไอเดีย + เหตุผลสั้น
3. (แหวกแนว) ชื่อ/ไอเดีย + เหตุผลสั้น
⭐ แนะนำ: [เลือก 1 อัน + เหตุผล 1 บรรทัด]
❌ ห้ามแต่ง facts — creative กับ ideas ได้ แต่ strict กับ facts
รวมทั้งหมดไม่เกิน 200 คำ`);
    } else {
      // ── Full Creative: concept / campaign / worldbuilding ──
      // Pick most relevant few-shot (trimmed)
      const examples = POLICY.creative.fewShot;
      const q = userInput.toLowerCase();
      let bestExample = examples[0];
      if (/ชื่อ|brand|naming|แบรนด์|ร้าน|สินค้า/i.test(q)) bestExample = examples[1];
      if (/visual|design|ออกแบบ|landing|website|ui|mood/i.test(q)) bestExample = examples[2];
      const exampleLines = bestExample.output.split('\n').slice(0, 6).join('\n');

      blocks.push(`# Creative Mode — Full${priorityNote}
⚡ ห้ามเกริ่น ห้ามชมโจทย์ — เริ่มที่ Core idea ทันที
ต้องให้ 3 ทางเลือกที่ต่างกันจริง:
- ทางเลือก 1 (practical) + trade-offs
- ทางเลือก 2 (สร้างสรรค์) + trade-offs
- ทางเลือก 3 (แหวกแนว) + trade-offs
⭐ สรุปแนะนำ + เหตุผล
❌ ห้ามแต่ง facts — creative กับ ideas ได้ แต่ strict กับ facts
ถ้ามี fact data → ใช้จาก truth-source ก่อน

## ตัวอย่าง (ย่อ): ${bestExample.title}
${exampleLines}`);
    }
  }

  // Uncertainty instruction (always inject when facts are sparse)
  if (matched.length === 0 && !identityNeeded) {
    blocks.push(`# นโยบายความไม่แน่ใจ
${POLICY.uncertainty.policy}
ถ้าถูกถามข้อมูลที่ไม่มีในความจำหรือ knowledge base:
- ตอบว่า "ไม่แน่ใจเรื่องนี้ค่ะ" หรือ "ข้อมูลนี้ต้องค้นหาเพิ่มค่ะ"
- ห้ามแต่งตัวเลข ชื่อ ราคา ที่ไม่มีแหล่งอ้างอิง
- ถ้าเป็นข้อมูลที่ค้นได้ → แนะนำใช้ web_search`);
  }

  return blocks.length > 0 ? '\n\n' + blocks.join('\n\n') : '';
}

// ─── Exports for testing/debugging ────────────────
export function getAllFacts() {
  return { identity: IDENTITY, policy: POLICY, facts: FACTS };
}

export function getFactKeys() {
  return Object.keys(FACTS);
}

export function getUncertaintyPolicy() {
  return POLICY.uncertainty;
}
