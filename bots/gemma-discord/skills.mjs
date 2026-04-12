/**
 * 💎 Gemma Discord Bot — Skills Registry
 * แสดง/จัดการความสามารถทั้งหมดของเจมม่า
 */

// ─── Skill Categories ────────────────────────────
const SKILLS = {
  construction: {
    icon: '🏗️',
    name: 'Construction & BOQ',
    skills: [
      { name: 'คำนวณ BOQ', desc: 'ประเมินราคางานก่อสร้าง/ตกแต่งจากพื้นที่', cmd: '/boq' },
      { name: 'ราคาวัสดุ', desc: 'ดูราคาวัสดุก่อสร้างอ้างอิง 15+ รายการ', cmd: '/material' },
      { name: 'ประเมินห้อง', desc: 'คำนวณราคาตกแต่งห้องตาม style', cmd: '/room' },
      { name: 'แปลงหน่วย', desc: 'ตร.ม.↔ตร.วา↔ไร่, ม.↔ฟุต, kg↔lb', cmd: '/convert' },
    ],
  },

  interior: {
    icon: '🏠',
    name: 'Interior Design',
    skills: [
      { name: 'แนะนำ Style', desc: 'Minimal, Japanese, Industrial, Scandinavian, Luxury, Tropical' },
      { name: 'เลือกวัสดุ', desc: 'เปรียบเทียบข้อดี-ข้อเสีย แนะนำตาม budget' },
      { name: 'ประเมินราคา', desc: 'รีโนเวท/สร้างใหม่/บิลท์อิน 3 ระดับราคา' },
      { name: 'Scope of Work', desc: 'ช่วยเขียน SOW + ข้อกำหนด' },
      { name: 'Color Palette', desc: 'แนะนำโทนสีตาม style + ความรู้สึก' },
      { name: 'Layout Ideas', desc: 'แนะนำ floor plan + arrangement' },
    ],
  },

  sales: {
    icon: '📊',
    name: 'Sales & Marketing',
    skills: [
      { name: 'Content Creator', desc: 'คิด caption, hook, hashtag ทุก platform' },
      { name: 'คำนวณ Commission', desc: 'Lazada affiliate 2-8% ตาม category' },
      { name: 'Pricing Strategy', desc: 'Charm pricing, bundle, urgency, free trial' },
      { name: 'Ad Copy', desc: 'เขียน ad copy FB/IG/TikTok/Lazada' },
      { name: 'Product Desc', desc: 'เขียน description สินค้าดึงดูดใจ' },
      { name: 'AIDA/PAS', desc: 'สูตร content marketing ที่ได้ผล' },
    ],
  },

  assistant: {
    icon: '📅',
    name: 'Personal Assistant',
    skills: [
      { name: 'จัดตาราง', desc: 'วางแผนวัน/สัปดาห์ สรุปสิ่งที่ต้องทำ' },
      { name: 'เตือนนัด', desc: 'ตั้งเตือนล่วงหน้า', cmd: '/remind' },
      { name: 'Todo List', desc: 'จัดการงานค้าง', cmd: '/todo' },
      { name: 'บันทึกโน้ต', desc: 'จด/ค้น/ลบโน้ต', cmd: '/note' },
      { name: 'จำข้อมูลผู้ใช้', desc: 'จำชื่อ งาน ความชอบ', cmd: '/learn' },
      { name: 'สรุป', desc: 'สรุปบทสนทนา ข้อความยาว เนื้อหา' },
    ],
  },

  general: {
    icon: '🧠',
    name: 'General Intelligence',
    skills: [
      { name: 'คำนวณทั่วไป', desc: 'ส่วนลด, VAT, กำไร, margin, พื้นที่' },
      { name: 'แปลภาษา', desc: 'TH↔EN↔JP↔KR↔CN' },
      { name: 'วันเวลา', desc: 'วันที่ปัจจุบัน timezone ต่างๆ' },
      { name: 'อธิบาย Code', desc: 'อธิบาย concept, ช่วยคิด feature' },
      { name: 'EzBOQ Info', desc: 'ดูแพ็กเกจ ราคา วิธีใช้', cmd: '/plan' },
    ],
  },

  socialMedia: {
    icon: '📱',
    name: 'Social Media Management',
    skills: [
      { name: 'Facebook Page', desc: 'โพส, ad, insights, engagement, targeting' },
      { name: 'Instagram', desc: 'Reels, Stories, Carousel, hashtag strategy' },
      { name: 'TikTok', desc: 'Hook, trending sounds, posting schedule' },
      { name: 'Content Calendar', desc: 'วางแผน content รายสัปดาห์/เดือน' },
      { name: 'Analytics', desc: 'อ่าน insights, วัด engagement, KPIs' },
      { name: 'Ad Copy', desc: 'เขียน ad copy ทุก platform' },
    ],
  },

  lifestyle: {
    icon: '💪',
    name: 'Lifestyle & Health Coach',
    skills: [
      { name: 'Morning Routine', desc: 'วางแผนตื่นเช้า, deep work, productivity' },
      { name: 'สุขภาพ', desc: 'กฎ 20-20-20, ergonomics, น้ำดื่ม, นอน' },
      { name: 'อาหาร', desc: 'Meal planning, Thai food, macro counting' },
      { name: 'ออกกำลังกาย', desc: 'Desk worker exercises, yoga, bodyweight' },
      { name: 'Stress Management', desc: 'Burnout prevention, work-life balance' },
      { name: 'Digital Detox', desc: 'ลดการใช้โทรศัพท์, mindfulness' },
    ],
  },

  research: {
    icon: '🔍',
    name: 'Research & Self-Upgrade',
    skills: [
      { name: 'Web Search', desc: 'ค้นหาข้อมูลจากอินเทอร์เน็ต (DuckDuckGo)' },
      { name: 'Web Fetch', desc: 'ดึงเนื้อหาจาก URL/เว็บไซต์/API' },
      { name: 'Save Knowledge', desc: 'บันทึกข้อมูลที่ค้นได้ลง knowledge base' },
      { name: 'Search Knowledge', desc: 'ค้นจากความรู้ที่เคยบันทึก' },
      { name: 'Read Own Code', desc: 'อ่าน source code ตัวเอง' },
      { name: 'Self-Upgrade', desc: 'เพิ่มความรู้ใหม่เข้า soul ถาวร' },
    ],
  },

  fileOps: {
    icon: '📎',
    name: 'File Export',
    skills: [
      { name: 'CSV Export', desc: 'สร้างไฟล์ CSV ที่เปิดใน Excel ได้' },
      { name: 'TXT/MD Export', desc: 'ส่งโน้ต รายงาน หรือสรุปเป็นไฟล์แนบ' },
      { name: 'JSON Export', desc: 'ส่งข้อมูล structured เป็นไฟล์ JSON' },
      { name: 'HTML Export', desc: 'สร้างไฟล์ HTML สำหรับเปิดดูหรือแชร์ต่อ' },
    ],
  },

  pets: {
    icon: '🐾',
    name: 'Pet Content',
    skills: [
      { name: 'Caption น่ารัก', desc: 'เขียน caption สัตว์เลี้ยง TH/EN' },
      { name: 'Hashtag Trends', desc: 'แนะนำ hashtag trending สำหรับ pet page' },
      { name: 'Product Description', desc: 'เขียน desc สินค้า Fur and Found' },
      { name: 'Engagement', desc: 'แนะนำ strategy เพิ่ม engagement' },
    ],
  },

  agents: {
    icon: '🏢',
    name: 'Agent Company (ส่งทีม AI ทำงาน)',
    skills: [
      { name: 'ประชุมบริษัท', desc: 'ส่ง 10 ผู้บริหารถกประเด็นพร้อมกัน (CEO/วิจัย/วิเคราะห์/ออกแบบ/เขียน/วางแผน/ประเมิน/ตลาด/ที่ปรึกษา/วิจารณ์)', cmd: '/meeting' },
      { name: 'วิจัยเชิงลึก', desc: 'วิจัยจาก 4 มุมมอง (นักวิจัย+วิเคราะห์+ประเมิน+ที่ปรึกษา)', cmd: '/research' },
      { name: 'โต้วาที', desc: '2 ฝ่ายถกประเด็น + rebuttal + กรรมการตัดสิน', cmd: '/debate' },
      { name: 'แข่งขันตอบ', desc: 'หลาย agents แข่งตอบคำถามเดียวกัน เลือก best answer', cmd: '/tournament' },
      { name: 'สายพาน Pipeline', desc: 'agents ต่อกัน researcher→analyst→writer→reviewer→summarizer' },
      { name: 'วางแผน+ทำ', desc: 'แบ่งงานซับซ้อนอัตโนมัติ ส่ง agents ทำพร้อมกัน' },
    ],
  },

  secretary: {
    icon: '📂',
    name: 'Secretary & Project Management',
    skills: [
      { name: 'ผู้เชี่ยวชาญ 4 สาย', desc: 'EzBOQ, Imperial Rise, Vanavard, Pet — สแกนไฟล์จริง ตอบจากข้อมูลจริง', cmd: '/secretary' },
      { name: 'มอบหมายงาน', desc: 'สั่งงานผู้เชี่ยวชาญเฉพาะทาง + ติดตาม priority', cmd: '/assign' },
      { name: 'Morning Briefing', desc: 'สรุปงาน+tasks+ไอเดียทุกเช้า 07:00', cmd: '/briefing' },
      { name: 'Deep Scan', desc: 'สแกนโปรเจคทุก 6 ชม. บันทึกลง knowledge' },
      { name: 'วิเคราะห์รูปภาพ', desc: 'ส่งรูปมาวิเคราะห์ ประเมินราคา ดู mood board (multimodal)' },
    ],
  },

  automation: {
    icon: '⚙️',
    name: 'Automation & Self-Learning',
    skills: [
      { name: 'Cron Jobs', desc: 'ตั้งงานอัตโนมัติ (briefing/scan/health/evening/weekly)', cmd: '/cron' },
      { name: 'Evolution Score', desc: 'วัดพัฒนาการ — tools ที่ใช้, knowledge ที่สะสม', cmd: '/evolve' },
      { name: 'Training Data', desc: 'เก็บ feedback สำหรับปรับปรุงคำตอบ', cmd: '/train' },
      { name: 'RAG Knowledge', desc: 'ดึงความรู้จาก knowledge base มาตอบอัตโนมัติ' },
      { name: 'Self-Learning', desc: 'ค้นเว็บ → บันทึกลง knowledge อัตโนมัติ' },
      { name: 'อ่าน/แก้ Code ตัวเอง', desc: 'อ่าน source code 9 ไฟล์ + เพิ่มความรู้ถาวร' },
    ],
  },
};

// ─── Mode → Skills Mapping ───────────────────────
const MODE_SKILLS = {
  'personal-assistant': ['assistant', 'lifestyle', 'general', 'socialMedia', 'research', 'construction', 'interior', 'sales', 'agents', 'secretary', 'automation'],
  'sales-assistant': ['sales', 'socialMedia', 'general', 'research', 'assistant', 'agents', 'automation'],
  'interior-expert': ['interior', 'construction', 'general', 'research', 'assistant', 'agents', 'secretary', 'automation'],
  'dev-assistant': ['general', 'research', 'assistant', 'agents', 'secretary', 'automation'],
  'pet-content': ['pets', 'sales', 'socialMedia', 'general', 'research', 'assistant', 'agents', 'automation'],
};

// ─── Public API ──────────────────────────────────

/**
 * Get formatted skill list for a guild mode
 */
export function getSkillList(mode = 'dev-assistant') {
  const categories = MODE_SKILLS[mode] || MODE_SKILLS['dev-assistant'];
  let output = `💎 **ความสามารถของเจมม่า**\n`;

  for (const catKey of categories) {
    const cat = SKILLS[catKey];
    if (!cat) continue;
    output += `\n${cat.icon} **${cat.name}**\n`;
    for (const skill of cat.skills) {
      output += `• ${skill.name}${skill.cmd ? ` \`${skill.cmd}\`` : ''} — ${skill.desc}\n`;
    }
  }

  output += `\n✨ **สรุป:** 30 tools | ${Object.values(SKILLS).reduce((s, c) => s + c.skills.length, 0)} skills | 12 agents | 22 slash commands | Gemini API runtime | จำถาวร (SQLite) | วิเคราะห์รูปได้ | เรียนรู้เอง`;
  return output;
}

/**
 * Count total skills
 */
export function getSkillCount() {
  return Object.values(SKILLS).reduce((sum, cat) => sum + cat.skills.length, 0);
}

/**
 * Search skills
 */
export function searchSkills(query) {
  const q = query.toLowerCase();
  const results = [];
  for (const cat of Object.values(SKILLS)) {
    for (const skill of cat.skills) {
      if (skill.name.toLowerCase().includes(q) || skill.desc.toLowerCase().includes(q)) {
        results.push({ category: cat.name, ...skill });
      }
    }
  }
  return results;
}
