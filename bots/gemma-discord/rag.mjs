/**
 * RAG (Retrieval Augmented Generation) Module — Gemma Discord Bot
 * Knowledge base with SQLite backend, pre-loaded with comprehensive Thai/EN data
 * Uses same DB as memory.mjs (gemma-memory.db) via separate connection
 */

import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { getDb } from './memory.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const db = getDb();

// ─── Schema ─────────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS knowledge_base (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    category    TEXT NOT NULL,
    title       TEXT NOT NULL,
    content     TEXT NOT NULL,
    keywords    TEXT,            -- comma-separated
    source      TEXT,
    priority    INTEGER DEFAULT 5 CHECK(priority BETWEEN 1 AND 10),
    created_at  TEXT DEFAULT (datetime('now')),
    updated_at  TEXT DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_kb_category  ON knowledge_base(category);
  CREATE INDEX IF NOT EXISTS idx_kb_priority  ON knowledge_base(priority DESC);
  CREATE INDEX IF NOT EXISTS idx_kb_title     ON knowledge_base(title);
`);

// ─── Seed Data ───────────────────────────────────────────────────────────────
const KNOWLEDGE_SEED = [

  // ════════════════════════════════════════════════════════════
  // CATEGORY: interior_design
  // ════════════════════════════════════════════════════════════
  {
    category: 'interior_design',
    title: 'ราคาวัสดุก่อสร้าง 2026 — ปูนซีเมนต์',
    content: `ปูนซีเมนต์ปอร์ตแลนด์ (2026):
- ปูนถุง 50 กก. ราคาปลีก: 185-210 บาท/ถุง (แล้วแต่แบรนด์)
- SCG (ตราช้าง): ปูนเทรดีมิกซ์ถุงเล็ก 195 บาท / ถุงใหญ่ 200 บาท
- TPI (ตราทีพีไอ): 185-190 บาท/ถุง 50 กก.
- INSEE (ตราสามเหลี่ยม): 190-205 บาท/ถุง
- ปูนผสมสำเร็จ (ready-mix): 1,800-2,200 บาท/ลบ.ม. ส่งถึงหน้างาน
- ปูนก่ออิฐ: 180-195 บาท/ถุง
- ปูนฉาบ: 170-185 บาท/ถุง
- ปูนกาวกระเบื้อง: 200-250 บาท/ถุง 20 กก.
- ปูนยาแนว: 120-180 บาท/ถุง 5 กก.
เทคนิค: สั่งปูน ready-mix คุ้มกว่าถ้างานเกิน 5 ลบ.ม. ประหยัดแรงงานได้ 30-40%`,
    keywords: 'ปูนซีเมนต์,ราคาปูน,SCG,TPI,INSEE,ready-mix,ปูนถุง,วัสดุก่อสร้าง,ราคาวัสดุ',
    source: 'market_research_2026',
    priority: 9,
  },
  {
    category: 'interior_design',
    title: 'ราคาวัสดุก่อสร้าง 2026 — เหล็ก',
    content: `เหล็กก่อสร้าง (2026):
- เหล็กเส้นกลม (Round Bar) 6 มม.: 28-32 บาท/เมตร
- เหล็กเส้นกลม 9 มม.: 55-65 บาท/เมตร
- เหล็กเส้นกลม 12 มม.: 90-105 บาท/เมตร
- เหล็กข้ออ้อย (Deformed Bar) DB10: 65-75 บาท/เมตร
- เหล็กข้ออ้อย DB12: 95-110 บาท/เมตร
- เหล็กข้ออ้อย DB16: 165-185 บาท/เมตร
- เหล็กข้ออ้อย DB20: 255-285 บาท/เมตร
- เหล็กแผ่น 4 มม. (1.2x2.4 ม.): 1,200-1,400 บาท/แผ่น
- เหล็ก C-Channel 75x45: 380-420 บาท/เมตร
- เหล็กกล่อง 50x50x2 มม.: 280-320 บาท/เมตร
- ราคาเหล็กผันผวนตาม LME (London Metal Exchange) ควรตรวจสอบก่อนสั่ง
- ส่วนลดสำหรับออเดอร์ใหญ่ (เกิน 5 ตัน): 3-8%`,
    keywords: 'เหล็ก,เหล็กเส้น,เหล็กข้ออ้อย,DB,ราคาเหล็ก,วัสดุก่อสร้าง,เหล็กกล่อง,C-Channel',
    source: 'market_research_2026',
    priority: 9,
  },
  {
    category: 'interior_design',
    title: 'ราคาวัสดุก่อสร้าง 2026 — กระเบื้อง',
    content: `กระเบื้อง (2026):
กระเบื้องพื้น:
- กระเบื้องเซรามิก 30x30: 85-150 บาท/ตร.ม.
- กระเบื้องเซรามิก 60x60: 180-350 บาท/ตร.ม.
- กระเบื้องพอร์ซเลน 60x60: 250-600 บาท/ตร.ม.
- กระเบื้องพอร์ซเลน 60x120: 450-900 บาท/ตร.ม.
- กระเบื้องหินขัด (terrazzo): 350-700 บาท/ตร.ม.
- กระเบื้องไวนิล SPC: 280-550 บาท/ตร.ม.
กระเบื้องผนัง:
- กระเบื้องผนังเซรามิก 30x60: 120-250 บาท/ตร.ม.
- กระเบื้องซับเวย์ (subway tile) 7.5x15: 180-380 บาท/ตร.ม.
- กระเบื้องหินอ่อน (marble look): 400-1,200 บาท/ตร.ม.
กระเบื้องหลังคา:
- กระเบื้องคอนกรีต SCG: 18-25 บาท/แผ่น
- กระเบื้องเคลือบ: 22-35 บาท/แผ่น
- เมทัลชีท (Metal Sheet): 180-350 บาท/ตร.ม.
เคล็ดลับ: ซื้อเผื่อ 10-15% สำหรับการตัดและเสียหาย`,
    keywords: 'กระเบื้อง,ราคากระเบื้อง,พอร์ซเลน,เซรามิก,กระเบื้องพื้น,กระเบื้องผนัง,กระเบื้องหลังคา,ไวนิล,SPC',
    source: 'market_research_2026',
    priority: 9,
  },
  {
    category: 'interior_design',
    title: 'ราคาวัสดุก่อสร้าง 2026 — สี',
    content: `สีทาบ้าน (2026):
สีน้ำ (Interior):
- TOA ซุปเปอร์ชิลด์ (ถัง 18 ลิตร): 1,200-1,500 บาท
- TOA Platina (ถัง 18 ลิตร): 2,800-3,200 บาท
- Nippon Paint รุ่นมาตรฐาน (18 ลิตร): 1,100-1,400 บาท
- Beger Pastel (18 ลิตร): 950-1,200 บาท
- Dulux Weathershield (18 ลิตร): 1,600-2,000 บาท
สีน้ำ (Exterior):
- TOA Weather-Guard (18 ลิตร): 1,800-2,200 บาท
- Nippon Weatherbond (18 ลิตร): 1,700-2,100 บาท
- ความครอบคลุม: สีน้ำ 1 ลิตร ≈ 10-12 ตร.ม. (2 ชั้น)
สีอื่นๆ:
- สีรองพื้น (18 ลิตร): 600-900 บาท
- สีสเปรย์ (aerosol 400 มล.): 120-220 บาท
- สีพ่น (automotive): 350-800 บาท/ลิตร
- สีทองคำ/สีพิเศษ: 500-1,500 บาท/ลิตร
เทคนิค: ทาสีเองประหยัดได้ 40-60% เทียบกับจ้างช่าง แต่ต้องเตรียมพื้นผิวให้ดี`,
    keywords: 'สีทาบ้าน,ราคาสี,TOA,Nippon,Beger,Dulux,สีน้ำ,สีรองพื้น,Interior,Exterior',
    source: 'market_research_2026',
    priority: 8,
  },
  {
    category: 'interior_design',
    title: 'ราคาวัสดุก่อสร้าง 2026 — ไม้และหิน',
    content: `ไม้ก่อสร้างและตกแต่ง (2026):
ไม้จริง:
- ไม้สัก 2x4 นิ้ว (เมตร): 180-280 บาท
- ไม้สัก 4x4 นิ้ว (เมตร): 350-500 บาท
- ไม้ยางพารา (ตร.ม.): 800-1,200 บาท (แผ่นพื้น)
- ไม้โอ๊ค (พื้น ตร.ม.): 1,500-3,500 บาท
ไม้อัด/วัสดุทดแทน:
- ไม้อัด 18 มม. (1.22x2.44 ม.): 550-750 บาท/แผ่น
- MDF 18 มม.: 480-620 บาท/แผ่น
- Particle Board 18 มม.: 380-480 บาท/แผ่น
- Plywood Marine 18 มม.: 850-1,100 บาท/แผ่น
- เมลามีน (ผิวลามิเนต): เพิ่มอีก 150-300 บาท/แผ่น
หิน (2026):
- หินอ่อนจริง (ตร.ม.): 2,500-8,000 บาท
- หินแกรนิตจริง (ตร.ม.): 1,800-5,000 บาท
- หินเทียม (Engineered Stone): 2,200-6,000 บาท/ตร.ม.
- หินปูถนน/กรวด: 150-350 บาท/ตร.ม.`,
    keywords: 'ไม้,ราคาไม้,ไม้สัก,ไม้อัด,MDF,Plywood,หิน,หินอ่อน,แกรนิต,วัสดุก่อสร้าง',
    source: 'market_research_2026',
    priority: 8,
  },
  {
    category: 'interior_design',
    title: 'ราคาวัสดุก่อสร้าง 2026 — กระจก อิฐ ฉนวน ท่อ PVC',
    content: `กระจก (2026):
- กระจกใส 6 มม. (ตร.ม.): 450-600 บาท
- กระจกใส 10 มม. (ตร.ม.): 850-1,100 บาท
- กระจกเทมเปอร์ 8 มม. (ตร.ม.): 1,200-1,800 บาท
- กระจก Low-E (ตร.ม.): 1,800-3,500 บาท
- กระจกลามิเนต (ตร.ม.): 2,200-4,000 บาท

อิฐมวลเบา/อิฐก่อ (2026):
- อิฐมวลเบา SCG 7.5 ซม. (ก้อน): 18-25 บาท
- อิฐมวลเบา 10 ซม. (ก้อน): 22-30 บาท
- อิฐแดงมอญ: 4-7 บาท/ก้อน
- อิฐบล็อก (มาตรฐาน): 12-18 บาท/ก้อน

ฉนวนกันความร้อน:
- ฉนวนใยแก้ว (Fiberglass) 50 มม.: 120-180 บาท/ตร.ม.
- ฉนวน Rockwool 50 มม.: 180-250 บาท/ตร.ม.
- ฉนวนโฟม EPS (ตร.ม.): 80-150 บาท
- Aluminium Foil ฉนวน: 45-90 บาท/ตร.ม.
- ฉนวน SPF (Spray Polyurethane Foam): 350-550 บาท/ตร.ม.

ท่อ PVC:
- ท่อ PVC 1/2 นิ้ว (เมตร): 18-25 บาท
- ท่อ PVC 1 นิ้ว (เมตร): 35-50 บาท
- ท่อ PVC 2 นิ้ว (เมตร): 75-100 บาท
- ท่อ PVC 4 นิ้ว (เมตร): 180-250 บาท
- ท่อ UPVC ระบบน้ำดื่ม: เพิ่มอีก 30-50% จากท่อปกติ`,
    keywords: 'กระจก,อิฐ,อิฐมวลเบา,ฉนวน,ท่อ PVC,ราคาวัสดุ,กระจกเทมเปอร์,Low-E',
    source: 'market_research_2026',
    priority: 8,
  },
  {
    category: 'interior_design',
    title: 'สไตล์การออกแบบภายใน — Modern Minimalist',
    content: `Modern Minimalist (มินิมอล):
คอนเซ็ปต์: "Less is More" พื้นที่โล่ง สะอาด ไม่ยุ่งเหยิง
สีหลัก: ขาว เทา ดำ เบจ ครีม
วัสดุ: คอนกรีตขัดมัน, ไม้อ่อน, กระจก, โลหะ
ข้อดี:
- ดูทันสมัยตลอดกาล
- ทำความสะอาดง่าย
- ห้องดูกว้างขึ้น
ข้อเสีย:
- อาจดูเย็นชา/ขาดความอบอุ่น
- ของใช้ต้องเก็บซ่อน (ต้องการ storage เยอะ)
- ราคาของตกแต่งที่ดูดีต้องลงทุนสูง
ราคางบประมาณ: 8,000-18,000 บาท/ตร.ม. (รวมค่าออกแบบ)
เหมาะกับ: คนโสด/คู่รัก, พื้นที่จำกัด, คอนโดเมือง
ตัวอย่างแบรนด์เฟอร์นิเจอร์: IKEA, Index Living Mall, SB Design Square`,
    keywords: 'minimalist,มินิมอล,สไตล์ออกแบบ,interior design,modern,โมเดิร์น,ตกแต่งบ้าน',
    source: 'design_guide_2026',
    priority: 8,
  },
  {
    category: 'interior_design',
    title: 'สไตล์การออกแบบภายใน — Japanese Wabi-Sabi / Japandi',
    content: `Japandi / Wabi-Sabi (ญี่ปุ่น-สแกนดิเนเวีย):
คอนเซ็ปต์: ความงามในความไม่สมบูรณ์ เรียบง่าย ธรรมชาติ
สีหลัก: ครีม ทราย น้ำตาลอ่อน เขียวมอส เทาอุ่น ขาวหม่น
วัสดุ: ไม้สีอ่อน, ผ้าลินิน, เซรามิกด้าน, ไม้ไผ่, หิน
ข้อดี:
- อบอุ่น สงบ ผ่อนคลาย
- ทนกาลเวลา ไม่ล้าสมัย
- สอดคล้องกับ wellness lifestyle
ข้อเสีย:
- ของแต่งราคาสูงถ้าต้องการของแท้ญี่ปุ่น
- ต้องการการจัดวางที่พิถีพิถัน
ราคางบประมาณ: 10,000-25,000 บาท/ตร.ม.
เหมาะกับ: ทุกวัย, คอนโด, บ้าน, ต้องการ calm space
เฟอร์นิเจอร์แนะนำ: Muji, Zara Home, IKEA Scandinavian line
ต้นไม้แนะนำ: ต้นปาล์ม, มอนสเตอร์รา, ไผ่ญี่ปุ่น, เฟิร์น`,
    keywords: 'Japandi,wabi-sabi,ญี่ปุ่น,สแกนดิเนเวีย,สไตล์ออกแบบ,ธรรมชาติ,อบอุ่น,ตกแต่งบ้าน',
    source: 'design_guide_2026',
    priority: 8,
  },
  {
    category: 'interior_design',
    title: 'สไตล์การออกแบบภายใน — Industrial และ Loft',
    content: `Industrial / Loft Style:
คอนเซ็ปต์: โรงงานเก่า ท่อเหล็กเปลือย อิฐเปลือย แสงสลัว
สีหลัก: เทาเข้ม ดำ น้ำตาลสนิม เงิน ทอง
วัสดุ: เหล็ก, อิฐแดง, คอนกรีต, หนัง, ไม้เก่า (reclaimed wood)
ข้อดี:
- Character ชัด บุคลิกแข็งแกร่ง
- ไม่ต้องพยายามซ่อนโครงสร้าง ประหยัดงบได้
- เหมาะกับพื้นที่เพดานสูง
ข้อเสีย:
- ดูแลรักษายาก (เหล็กเป็นสนิม, ฝุ่นจับง่าย)
- ไม่เหมาะกับครอบครัวเด็กเล็ก (มุมคม)
ราคางบประมาณ: 7,000-15,000 บาท/ตร.ม.
เหมาะกับ: พื้นที่เพดานสูง, ร้านกาแฟ, สตูดิโอ, loft คอนโด

Bohemian / Boho:
คอนเซ็ปต์: อิสระ, สีสัน, ผสมผสานหลายวัฒนธรรม
สีหลัก: ส้มอิฐ, ทอง, เขียวเข้ม, ม่วง, แดง
วัสดุ: พรม, มาโครเม่, ผ้า, โลหะทอง, พืช
ราคางบประมาณ: 5,000-12,000 บาท/ตร.ม.`,
    keywords: 'Industrial,Loft,โรงงาน,อิฐเปลือย,Bohemian,Boho,สไตล์ออกแบบ,ตกแต่งบ้าน',
    source: 'design_guide_2026',
    priority: 7,
  },
  {
    category: 'interior_design',
    title: 'สไตล์การออกแบบภายใน — Tropical, Classic, Contemporary',
    content: `Tropical / Resort Style:
คอนเซ็ปต์: บรรยากาศรีสอร์ท ใกล้ชิดธรรมชาติ
สีหลัก: เขียว, น้ำตาลไม้, ขาว, เบจ, ฟ้าน้ำทะเล
วัสดุ: ไม้ธรรมชาติ, หวาย, ใบไม้สาน, หินธรรมชาติ
งบประมาณ: 8,000-20,000 บาท/ตร.ม.
เหมาะกับ: บ้านมีสวน, บ้านพักตากอากาศ, โรงแรม

Classic / Traditional:
คอนเซ็ปต์: หรูหรา ยิ่งใหญ่ ทรงคุณค่า
สีหลัก: ทอง, ขาวครีม, น้ำเงินเข้ม, เขียวเข้ม
วัสดุ: หินอ่อน, ไม้สัก, ผ้าไหม, ทอง
งบประมาณ: 15,000-50,000+ บาท/ตร.ม.

Contemporary:
คอนเซ็ปต์: ทันสมัย ยืดหยุ่น ผสม modern กับ classic
สีหลัก: เทา ขาว ดำ accent สีสด
งบประมาณ: 9,000-20,000 บาท/ตร.ม.
เหมาะกับ: บ้านทั่วไป, ต้องการ timeless look`,
    keywords: 'Tropical,Resort,Classic,Traditional,Contemporary,สไตล์ออกแบบ,ตกแต่งบ้าน,งบประมาณ',
    source: 'design_guide_2026',
    priority: 7,
  },
  {
    category: 'interior_design',
    title: 'กฎหมายก่อสร้างและอาคาร — พ.ร.บ. ควบคุมอาคาร',
    content: `พ.ร.บ. ควบคุมอาคาร พ.ศ. 2522 (และฉบับแก้ไข):
สิ่งที่ต้องขออนุญาต:
- ก่อสร้างอาคารใหม่
- ดัดแปลงอาคาร (เปลี่ยนแปลงโครงสร้าง หรือพื้นที่)
- รื้อถอนอาคาร (บางกรณี)
- เปลี่ยนการใช้งานอาคาร

ที่ไม่ต้องขออนุญาต (ทั่วไป):
- ซ่อมแซมในลักษณะเดิม ไม่เปลี่ยนโครงสร้าง
- งานภายในที่ไม่กระทบโครงสร้าง (เช่น ทาสี วอลเปเปอร์)
- สิ่งปลูกสร้างขนาดเล็ก <10 ตร.ม. (แล้วแต่ท้องถิ่น)

ค่าธรรมเนียม:
- ค่าธรรมเนียมการขออนุญาต: 50-1,000 บาท/ตร.ม. (แล้วแต่ประเภทอาคาร)
- ใบอนุญาตบ้านพักอาศัยทั่วไป: ฟรี-2,000 บาท

โทษถ้าฝ่าฝืน:
- ปรับ 10,000-300,000 บาท
- จำคุกไม่เกิน 3 ปี (กรณีร้ายแรง)
- อาจถูกสั่งรื้อถอน

ติดต่อ: กองช่างของ อบต./เทศบาล/กทม. ในพื้นที่`,
    keywords: 'กฎหมายก่อสร้าง,พ.ร.บ. อาคาร,ใบอนุญาตก่อสร้าง,ดัดแปลงอาคาร,ควบคุมอาคาร',
    source: 'building_law_thailand',
    priority: 9,
  },
  {
    category: 'interior_design',
    title: 'กฎหมายก่อสร้าง — Setback, FAR, BCR',
    content: `ระยะถอยร่น (Setback) — มาตรฐานทั่วไป:
- ถอยร่นจากถนนสาธารณะ: ≥ 3 เมตร (ถนน <10 ม.) หรือ ≥ 6 เมตร (ถนน ≥10 ม.)
- ถอยร่นจากเขตที่ดิน: ≥ 50 ซม. (ด้านข้าง/หลัง)
- กทม.: setback ตามผังเมือง แต่ละโซนต่างกัน

FAR (Floor Area Ratio) — อัตราส่วนพื้นที่อาคารต่อที่ดิน:
- โซนสีเหลือง (พักอาศัยหนาแน่นน้อย): FAR ≤ 2.0
- โซนสีส้ม (พักอาศัยหนาแน่นปานกลาง): FAR ≤ 4.0
- โซนสีแดง (พาณิชยกรรม): FAR ≤ 7.0-10.0
- ยิ่ง FAR สูง ยิ่งสร้างได้มาก

BCR (Building Coverage Ratio) — อัตราส่วนพื้นที่ก่อสร้างต่อที่ดิน:
- บ้านเดี่ยวในเมือง: BCR ≤ 50-60%
- อาคารพาณิชย์: BCR ≤ 70-80%

ความสูงอาคาร:
- บ้านเดี่ยวทั่วไป: ไม่เกิน 15 เมตร (ไม่ต้องมีลิฟต์)
- อาคารเกิน 23 เมตร: ต้องมีระบบดับเพลิง, ลิฟต์ดับเพลิง
- อาคารสูง (>23 ม.): ต้องผ่าน EIA

ตรวจสอบผังเมือง: gis.dpt.go.th หรือ LineID ของ กทม./อบต.`,
    keywords: 'setback,ถอยร่น,FAR,BCR,ผังเมือง,อาคาร,กฎหมาย,ความสูง,โซนสี',
    source: 'building_law_thailand',
    priority: 9,
  },
  {
    category: 'interior_design',
    title: 'ขั้นตอนรีโนเวทบ้าน — Step-by-Step',
    content: `ขั้นตอนรีโนเวทบ้านอย่างมีระบบ:

1. วางแผนและงบประมาณ (1-2 สัปดาห์)
   - กำหนด scope งาน (รีโนเวทส่วนไหนบ้าง)
   - ตั้งงบประมาณ + buffer 15-20%
   - หา reference (Pinterest, IG) อย่างน้อย 20 ภาพ

2. ว่าจ้างผู้ออกแบบ (ถ้าจำเป็น)
   - สถาปนิก: 5-15% ของงบก่อสร้าง
   - Interior designer: 500-1,500 บาท/ตร.ม.
   - ขอ quotation อย่างน้อย 3 เจ้า

3. ขออนุญาตก่อสร้าง (ถ้าจำเป็น)
   - ใช้เวลา 30-90 วัน
   - เตรียมเอกสาร: แบบแปลน, โฉนด, ทะเบียนบ้าน

4. รื้อถอน/เตรียมพื้นที่ (1-2 สัปดาห์)
   - รื้อของเก่าออก
   - ตรวจสอบโครงสร้าง
   - งานระบบไฟฟ้า/ประปา (ต้องทำก่อนปิดผนัง)

5. งานโครงสร้าง (2-4 สัปดาห์)
   - ก่ออิฐ, เทพื้น, งานคอนกรีต

6. งานระบบ (1-3 สัปดาห์)
   - ไฟฟ้า, ประปา, ระบบปรับอากาศ

7. งานตกแต่งผิว (2-4 สัปดาห์)
   - ฉาบปูน, ปูกระเบื้อง, ทาสี, พื้น

8. ติดตั้งงานระบบสุดท้าย + เฟอร์นิเจอร์
   - สุขภัณฑ์, ไฟ, สวิตช์, เฟอร์นิเจอร์

9. QC และส่งงาน
   - ตรวจงานกับแบบ
   - แก้ไข defect list
   - รับประกันงาน 1 ปี (มาตรฐาน)

Timeline รวม: 2-6 เดือน แล้วแต่ขนาดงาน`,
    keywords: 'รีโนเวท,ขั้นตอนก่อสร้าง,รีโนเวทบ้าน,timeline,ก่อสร้าง,แปลน,งบประมาณก่อสร้าง',
    source: 'construction_guide',
    priority: 9,
  },

  // ════════════════════════════════════════════════════════════
  // CATEGORY: sales_marketing
  // ════════════════════════════════════════════════════════════
  {
    category: 'sales_marketing',
    title: 'Facebook Content Strategy — เวลาโพสต์ที่ดีที่สุด',
    content: `Facebook Posting Strategy 2026:
เวลาที่ดีที่สุดสำหรับคนไทย:
- วันจันทร์-ศุกร์: 06:00-08:00 น. (ตื่นมาเช็คโทรศัพท์)
- วันจันทร์-ศุกร์: 12:00-13:00 น. (พักเที่ยง)
- ทุกวัน: 19:00-22:00 น. (เวลาว่างหลังเลิกงาน)
- เสาร์อาทิตย์: 10:00-12:00 น.

ประเภท Content ที่ Engagement ดี:
- Video (Reels/Short): Reach สูงสุด ปัจจุบัน
- Carousel (สไลด์): Share ได้มาก เหมาะ Tips/How-to
- Photo: ยังดีถ้าภาพสวย
- Text-only: Engagement ดีถ้า copy แรง
- Live: Organic reach สูงมาก

Hashtag Facebook:
- ใช้ 3-5 hashtag ไม่เกิน 10
- Mix: broad (2) + niche (2) + brand (1)
- ตัวอย่าง: #ออกแบบบ้าน #รีโนเวทบ้าน #VanavardInterior

อัลกอริทึม Facebook ปัจจุบัน:
- ชอบ Content ที่คนดูนาน (watch time)
- Comments > Reactions > Shares > Likes
- ตอบ comment ใน 1 ชั่วโมงแรกสำคัญมาก`,
    keywords: 'Facebook,โพสต์,เวลา,content strategy,engagement,hashtag,อัลกอริทึม,social media',
    source: 'social_media_guide_2026',
    priority: 9,
  },
  {
    category: 'sales_marketing',
    title: 'Instagram Strategy — Growth Hacking 2026',
    content: `Instagram Growth Strategy 2026:
Format ที่ Algorithm ชอบตาม priority:
1. Reels (60-90 วินาที) — Reach ใหม่สูงสุด
2. Carousel (3-10 สไลด์) — Saves สูง บอก algo ว่า valuable
3. Story (24 ชั่วโมง) — Keep warm audience
4. Static Post — ยังดีถ้าภาพสวย

เวลาโพสต์ที่ดี (Thailand):
- 07:00-09:00 น. (ก่อนไปทำงาน)
- 12:00-14:00 น. (พักเที่ยง)
- 19:00-21:30 น. (ช่วงดึก)

Hashtag Instagram:
- ใช้ 20-30 hashtag (Reels ใช้ 5-10 ก็พอ)
- เน้น niche hashtag (100K-1M post) ดีกว่า mega hashtag
- ตัวอย่าง interior: #บ้านสวย #DesignInterior #Vanavard #ตกแต่งบ้าน #รีโนเวทบ้าน

Reels Hook (3 วินาทีแรก):
- "5 ความผิดพลาดที่ทำให้บ้านดูถูก..."
- "ก่อน vs หลัง รีโนเวท..."
- ถามคำถามที่คนอยากตอบ

CTA ที่ดี:
- "Save ไว้ก่อนนะ" (เพิ่ม save = signal ดี)
- "Tag เพื่อนที่กำลังรีโนเวทบ้าน"
- "Comment ตัวเลข X ถ้าอยากได้ข้อมูลเพิ่ม"`,
    keywords: 'Instagram,Reels,growth,hashtag,engagement,CTA,โพสต์,social media,story',
    source: 'social_media_guide_2026',
    priority: 9,
  },
  {
    category: 'sales_marketing',
    title: 'TikTok Content Strategy — Hook & Viral Techniques',
    content: `TikTok Strategy 2026:
Hook 3 วินาทีแรก (สำคัญที่สุด):
- ตั้งคำถามที่ทำให้สงสัย: "รู้ไหมว่าทำไม..."
- Visual shock: Before/After ที่น่าตกใจ
- Bold claim: "วิธีนี้ประหยัดได้ 50%"
- POV narrative: "POV: คุณรีโนเวทบ้านด้วยเงิน 100,000 บาท"

เวลาโพสต์ TikTok Thailand:
- 06:00-09:00 น.
- 12:00-15:00 น.
- 18:00-23:00 น. (prime time)
- ควรโพสต์ 1-3 ครั้ง/วัน

ความยาว VDO:
- 7-15 วินาที: Viral potential สูงสุด
- 30-60 วินาที: Tutorial/How-to
- 1-3 นาที: Documentary/Deep-dive

Trending Sound:
- ใช้เสียงที่ Trending ใน 7 วันล่าสุด
- ดู "For You" ว่า sound อะไรกำลัง viral
- Duet และ Stitch กับ content ที่ trending

Hashtag TikTok:
- 3-5 hashtag พอ
- #บ้านสวย #รีโนเวท #อินทีเรียดีไซน์ #interiordesign

Caption:
- สั้น กระชับ 1-2 บรรทัด
- จบด้วย CTA เช่น "Follow ไว้ไม่พลาด"`,
    keywords: 'TikTok,hook,viral,content,โพสต์,hashtag,reels,sound,trending,social media',
    source: 'social_media_guide_2026',
    priority: 9,
  },
  {
    category: 'sales_marketing',
    title: 'Lazada Affiliate Marketing — อัตราค่าคอมมิชชัน 2026',
    content: `Lazada Affiliate Program — Commission Rates 2026:
หมวดหมู่และ Commission:
- Electronics (มือถือ, laptop): 1-3%
- Home & Living (เฟอร์นิเจอร์, ของแต่งบ้าน): 4-8%
- Fashion (เสื้อผ้า, กระเป๋า): 5-10%
- Beauty & Personal Care: 6-10%
- Mother & Baby: 5-8%
- Pet Supplies: 5-8%
- Sports & Outdoors: 4-7%
- Automotive: 3-5%
- Food & Grocery: 2-4%
- Health & Wellness: 5-9%
- Tools & Home Improvement: 4-7%
- Books & Stationery: 3-6%

วิธีสร้าง Affiliate Link:
1. เข้า lazada.co.th → เลือกสินค้า
2. ใช้ Lazada Partner API หรือ App Affiliate
3. แปลง URL ด้วย App Key (LiteApp Key: 105827)
4. Link จะมีตัวแปร: &sub_aff_id=[your_id]

เคล็ดลับเพิ่ม Conversion:
- โพสต์รีวิวสินค้าจริง ไม่ใช่แค่โฆษณา
- เพิ่มรูปจริงที่ใช้สินค้า
- บอกราคาเปรียบเทียบ (ถูกกว่าร้านแค่ไหน)
- ใส่ใน Story IG/TikTok ระหว่าง sale season
- เลือกสินค้าราคา 500-3,000 บาท (conversion ดี)

Sale Season สำคัญ:
- 11.11, 12.12 (commission อาจเพิ่มพิเศษ)
- Flash Sale ทุกวัน 12.00 น. และ 20.00 น.`,
    keywords: 'Lazada,affiliate,commission,ค่าคอมมิชชัน,affiliate link,partnership,รายได้,passive income',
    source: 'lazada_affiliate_guide_2026',
    priority: 9,
  },
  {
    category: 'sales_marketing',
    title: 'Content Formulas — AIDA, PAS, BAB, SPIN',
    content: `Content & Copywriting Formulas:

AIDA (Attention → Interest → Desire → Action):
- Attention: "บ้านคุณดูเก่าลงทุกปี..."
- Interest: "มีเทคนิครีโนเวทต้นทุนต่ำที่..."
- Desire: "ลูกค้าเราประหยัดได้กว่า 40%..."
- Action: "ปรึกษาฟรีวันนี้ โทร..."

PAS (Problem → Agitate → Solution):
- Problem: "งบก่อสร้างบานปลายทุกครั้ง?"
- Agitate: "ยิ่งนานยิ่งแพง ช่างโกงราคา ไม่รู้จะเริ่มยังไง"
- Solution: "เราช่วยวางแผนงบประมาณและควบคุมงานให้"

BAB (Before → After → Bridge):
- Before: "ก่อนหน้านี้บ้านคุณ..."
- After: "หลังรีโนเวท..."
- Bridge: "วิธีที่ทำให้เกิดความเปลี่ยนแปลงนี้คือ..."

4Ps (Picture → Promise → Prove → Push):
- Picture: สร้างภาพในหัว
- Promise: สัญญาว่าจะได้อะไร
- Prove: หลักฐาน (testimonial, data)
- Push: กระตุ้นให้ทำ action

SPIN Selling (Situation → Problem → Implication → Need-payoff):
ใช้ในการขาย face-to-face หรือ DM:
- S: ถามสถานการณ์ "คุณกำลังมองหาออกแบบสไตล์ไหนอยู่?"
- P: ถามปัญหา "มีส่วนไหนที่ยังไม่ถูกใจ?"
- I: แสดง implication "ถ้าไม่แก้ตอนนี้จะยิ่ง..."
- N: แสดง value "ถ้าแก้ได้จะ..."`,
    keywords: 'AIDA,PAS,BAB,SPIN,copywriting,content formula,การขาย,marketing,โฆษณา',
    source: 'marketing_playbook',
    priority: 8,
  },
  {
    category: 'sales_marketing',
    title: 'Ad Copy Templates — Facebook, IG, TikTok',
    content: `Ad Copy Templates ที่ใช้งานได้จริง:

Facebook Ad (Lead Gen):
"[Pain Point] อยากรีโนเวทบ้านแต่กลัวงบบาน?
→ เราช่วยวางแผนงบ + ออกแบบฟรีไม่มีข้อผูกมัด
→ ผลงาน 200+ โปรเจค | รีวิว 5 ดาว
→ DM หรือคลิก [CTA Button]"

Instagram Caption:
"Before → After ✨
ห้องนี้ใช้งบแค่ [ราคา] บาท ใช้เวลา [X] วัน
สไตล์ [Japandi/Modern] ดูเพิ่มเติมใน story 👆
#รีโนเวทบ้าน #ออกแบบภายใน #บ้านสวย"

TikTok Script Template:
Hook: "[เลข] อย่างที่คนส่วนใหญ่ไม่รู้เรื่องรีโนเวทบ้าน"
Body: รายการแต่ละข้อ พร้อมภาพประกอบ
CTA: "Follow ไว้ก่อน เดี๋ยวทำ Part 2"

Pricing Psychology Techniques:
- Charm Pricing: 9,990 แทน 10,000 บาท
- Anchoring: แสดงราคาสูงก่อน แล้วบอกราคาจริง
- Bundle: รวมบริการ เพิ่ม perceived value
- Urgency: "ราคานี้ถึงวันที่ XX เท่านั้น"
- Social Proof: "200+ ครอบครัวเลือกใช้บริการ"
- Risk Reversal: "รับประกัน 1 ปี ถ้าไม่พอใจ refund"`,
    keywords: 'ad copy,โฆษณา,Facebook ads,IG ads,TikTok,template,copywriting,pricing psychology,FOMO',
    source: 'marketing_playbook',
    priority: 8,
  },

  // ════════════════════════════════════════════════════════════
  // CATEGORY: lifestyle_health
  // ════════════════════════════════════════════════════════════
  {
    category: 'lifestyle_health',
    title: 'Morning Routine สำหรับ Entrepreneur',
    content: `Morning Routine ที่พิสูจน์แล้วว่าได้ผล:

5:30-6:00 น. — Wake up
- อย่าดูโทรศัพท์ทันที (ใช้นาฬิกาปลุกแยก)
- ดื่มน้ำเปล่า 500 มล. ทันที (เติม electrolyte ถ้าได้)

6:00-6:30 น. — Physical
- ออกกำลังกาย 20-30 นาที
- Options: yoga เบาๆ, เดิน, push-up/squat 3 sets
- ไม่ต้องเต็มที่ทุกวัน แค่ขยับร่างกาย

6:30-7:00 น. — Mindset
- Journal 5 นาที: ขอบคุณ 3 อย่าง + เป้าหมายวันนี้ 1 อย่าง
- อ่านหนังสือ/บทความ 10 นาที
- Meditation 5-10 นาที (Calm, Headspace app)

7:00-8:00 น. — Prep & Fuel
- อาบน้ำ
- อาหารเช้าที่มีโปรตีน: ไข่ 2-3 ฟอง + ผัก + carb ปานกลาง
- วางแผนงานวันนี้ TOP 3 tasks

ทำไม morning routine ถึงสำคัญ:
- สร้าง momentum ตั้งแต่ต้นวัน
- ลด decision fatigue
- เวลาเช้าเป็น "sacred time" ไม่มีใครรบกวน`,
    keywords: 'morning routine,entrepreneur,ตื่นเช้า,สุขภาพ,productivity,จัดเวลา,ชีวิตดี',
    source: 'lifestyle_guide',
    priority: 8,
  },
  {
    category: 'lifestyle_health',
    title: 'Pomodoro Technique และ Time Blocking',
    content: `Pomodoro Technique:
วิธีใช้:
1. เลือก task 1 อย่าง
2. ตั้งเวลา 25 นาที — ทำงาน 100% ไม่มีรบกวน
3. หยุดพัก 5 นาที (ลุก ยืดเส้น ดื่มน้ำ)
4. ทำซ้ำ 4 รอบ → พักยาว 15-30 นาที

เคล็ดลับ:
- ปิดโทรศัพท์ / ใส่ Do Not Disturb
- ใช้ app: Forest, Be Focused, Pomodoro Timer
- งานที่ใช้สมาธิ: code, เขียน, ออกแบบ — เหมาะมาก
- งาน email/LINE: รวมไว้ block เดียว

Time Blocking:
วิธีใช้:
- แบ่งวันเป็น block 1-2 ชั่วโมง
- แต่ละ block assign task เฉพาะ
- Block "Deep Work" ตอนเช้า (สมองแหลมคม)
- Block "Admin/Email" ตอนบ่าย
- Block "Meeting/Call" ตอนบ่ายหรือเย็น

ตัวอย่าง Time Block:
- 08:00-10:00: Deep Work (งานสำคัญที่สุด)
- 10:00-10:15: Break
- 10:15-12:00: Deep Work 2
- 12:00-13:00: Lunch + Rest
- 13:00-15:00: Admin, Email, LINE
- 15:00-17:00: Meeting / Client calls
- 17:00-18:00: Review + วางแผนวันพรุ่งนี้`,
    keywords: 'Pomodoro,time blocking,productivity,จัดเวลา,deep work,สมาธิ,ทำงาน',
    source: 'lifestyle_guide',
    priority: 8,
  },
  {
    category: 'lifestyle_health',
    title: 'สุขภาพสำหรับคนทำงานหน้าจอ — Ergonomics และดูแลสายตา',
    content: `Ergonomics สำหรับ Desk Worker:
การตั้งโต๊ะที่ถูกต้อง:
- หน้าจอ: อยู่ในระดับสายตา ห่างจากหน้า 50-70 ซม.
- เก้าอี้: ปรับให้เท้าวางราบบนพื้น เข่า 90°
- แขน: Keyboard ควรอยู่ระดับ elbow
- หลัง: พิงพนักพิงตลอด (lumbar support)
- หัวไหล่: ผ่อนคลาย ไม่ยกขึ้น

ท่าออกกำลังกายสำหรับ desk worker (ทำได้ทุกชั่วโมง):
- Neck roll: หมุนคอช้าๆ 5 รอบแต่ละทาง
- Shoulder shrug: ยักไหล่ขึ้นลง 10 ครั้ง
- Chest opener: ยืดอก ดึงแขนไปข้างหลัง
- Seated cat-cow: นั่งโก่งหลัง-โค้งหลัง 10 ครั้ง
- Standing calf raise: ยืนยกส้นเท้า 15 ครั้ง

ดูแลสายตา — 20-20-20 Rule:
- ทุก 20 นาที → มองจุดที่ห่าง 20 ฟุต นาน 20 วินาที
- ปรับ brightness จอให้เท่ากับแสงรอบข้าง
- ใช้ Night Mode / Blue Light filter หลัง 19:00 น.
- หยดตา artificial tears ถ้าตาแห้ง (Optrex, Clear Eyes)
- ตรวจสายตาทุกปี

Sleep Hygiene:
- นอน 7-8 ชั่วโมง ในเวลาเดิมทุกวัน
- งดหน้าจอ 1 ชั่วโมงก่อนนอน
- ห้องนอนควรมืด เย็น (22-24°C) เงียบ
- ไม่ดื่มกาแฟหลัง 14:00 น.`,
    keywords: 'ergonomics,สายตา,20-20-20,desk worker,สุขภาพ,นอนหลับ,sleep,คอเมื่อย,ปวดหลัง',
    source: 'health_guide',
    priority: 8,
  },
  {
    category: 'lifestyle_health',
    title: 'Meal Planning — อาหารไทยและ Macro Counting',
    content: `Meal Planning สำหรับ Entrepreneur ไทย:

Macro เป้าหมาย (ทั่วไป 70 กก. ออกกำลังกาย 3x/สัปดาห์):
- โปรตีน: 140-180 กรัม/วัน (2-2.5g/kg)
- Carb: 200-300 กรัม/วัน
- Fat: 60-80 กรัม/วัน
- แคลอรี่: 2,000-2,500 kcal/วัน

อาหารไทยที่โปรตีนสูง:
- ไข่ดาว/ต้ม: 6-7g โปรตีน ราคา 5-8 บาท
- ไก่ผัด/ต้ม 100g: 25-30g โปรตีน
- ปลาทูต้ม 100g: 20-25g โปรตีน ราคา 20-35 บาท
- เต้าหู้แข็ง 100g: 10-15g โปรตีน ราคา 10-15 บาท
- กุ้งสด 100g: 18-22g โปรตีน

Meal Plan ง่ายๆ สำหรับวันธรรมดา:
เช้า: ไข่ 3 ฟอง + ข้าวกล้อง 1 ทัพพี + ผัก = 500-600 kcal
กลางวัน: ข้าวกับเมนูโปรตีน (ไก่/ปลา/กุ้ง) + ผัก = 600-800 kcal
เย็น: Salad หรือเมนูเบา + โปรตีนปานกลาง = 400-600 kcal
Snack: ถั่ว, กล้วย, โยเกิร์ต = 200-300 kcal

App แนะนำ: MyFitnessPal (track macro), Yazio (ภาษาไทย)`,
    keywords: 'meal planning,อาหาร,macro,โปรตีน,แคลอรี่,สุขภาพ,อาหารไทย,ลดน้ำหนัก,กล้ามเนื้อ',
    source: 'health_guide',
    priority: 7,
  },
  {
    category: 'lifestyle_health',
    title: 'ออกกำลังกายสำหรับ Desk Worker — Home Workout',
    content: `Home Workout สำหรับคนทำงานออฟฟิศ/ทำงานที่บ้าน:

ไม่ต้องใช้อุปกรณ์ (20-30 นาที):
Warm up (5 นาที): jumping jack 30 วิ + arm circles + leg swings

Upper Body:
- Push-up: 3 sets x 10-15 reps
- Pike push-up: 3 sets x 8-12 reps (สำหรับไหล่)
- Diamond push-up: 3 sets x 8-10 reps (triceps)

Core:
- Plank: 3 sets x 30-60 วินาที
- Crunches: 3 sets x 20 reps
- Russian twist: 3 sets x 20 reps

Lower Body:
- Squat: 3 sets x 20 reps
- Lunges: 3 sets x 12 reps (แต่ละข้าง)
- Glute bridge: 3 sets x 15 reps

Cardio ง่าย:
- เดิน 10,000 ก้าว/วัน (ใช้ step counter)
- Skip rope 10-15 นาที
- HIIT 20 นาที (YouTube: MrandMrsMuscle, Chloe Ting)

ความถี่แนะนำ:
- Beginner: 3 ครั้ง/สัปดาห์
- Intermediate: 4-5 ครั้ง/สัปดาห์
- Rest day สำคัญมาก — กล้ามเนื้อโตตอนพัก`,
    keywords: 'workout,ออกกำลังกาย,home workout,push-up,squat,cardio,สุขภาพ,desk worker,ฟิต',
    source: 'health_guide',
    priority: 7,
  },
  {
    category: 'lifestyle_health',
    title: 'Mental Health — Burnout Prevention สำหรับ Entrepreneur',
    content: `สัญญาณ Burnout ที่ต้องระวัง:
- เหนื่อยล้าเรื้อรัง แม้นอนพักแล้ว
- ไม่มี motivation ทำงานที่เคยชอบ
- หงุดหวิดบ่อย ทนคนน้อยลง
- ความจำแย่ลง สมาธิสั้น
- ปวดหัว ปวดท้อง ป่วยบ่อยโดยไม่มีสาเหตุ

วิธีป้องกัน Burnout:
1. กำหนด working hours ชัดเจน — อย่าทำงาน 24/7
2. "No" ต้องพูดเป็น — ปฏิเสธงาน/คนที่ drain พลังงาน
3. Hobby time ทุกสัปดาห์ — งานอดิเรกที่ไม่เกี่ยวธุรกิจ
4. ออกไปข้างนอก — แค่เดิน 30 นาที/วัน
5. Digital detox — อย่างน้อย 1 วัน/สัปดาห์ ลดใช้โซเชียล

เทคนิค reset ระหว่างวัน:
- Box breathing: หายใจเข้า 4 วิ → กลั้น 4 วิ → หายใจออก 4 วิ → กลั้น 4 วิ ทำ 5 รอบ
- Gratitude journal เช้า-เย็น (ขอบคุณ 3 อย่าง)
- Power nap 20 นาที (13:00-14:00 น.)

การขอความช่วยเหลือ:
- สายด่วนสุขภาพจิต: 1323 (กรมสุขภาพจิต ไทย)
- Therapist ออนไลน์: Ooca (แอป), Chulacare
- กลุ่มสนับสนุน: FB Group "นักธุรกิจ SME ไทย"`,
    keywords: 'burnout,mental health,สุขภาพจิต,entrepreneur,stress,ความเครียด,ป้องกัน,detox',
    source: 'health_guide',
    priority: 8,
  },

  // ════════════════════════════════════════════════════════════
  // CATEGORY: social_media_management
  // ════════════════════════════════════════════════════════════
  {
    category: 'social_media_management',
    title: 'Facebook Page Management — Best Practices',
    content: `Facebook Page Management 2026:

ตั้งค่า Page ให้ครบก่อน:
- Profile picture: โลโก้ ขนาด 400x400 px
- Cover photo: 1640x924 px (mobile friendly)
- Username (@): จำง่าย ตรงกับชื่อแบรนด์
- About: ใส่ keyword ที่คนค้นหา (SEO ใน FB ด้วย)
- CTA Button: "ส่งข้อความ" หรือ "โทรเลย"

Posting Frequency แนะนำ:
- อย่างน้อย 3-5 โพสต์/สัปดาห์
- Story: ทุกวัน (เนื้อหาง่ายๆ ไม่ต้องสมบูรณ์)
- Reels: 3-4 ครั้ง/สัปดาห์

Insights ที่ต้องดูทุกสัปดาห์:
- Reach (จำนวนคนที่เห็น)
- Engagement Rate (Likes+Comments+Shares / Reach × 100%)
- Page Likes growth
- Best performing post

Ad Targeting ที่ดีสำหรับ Interior:
- อายุ 25-45 ปี
- สนใจ: Home & Garden, Renovation, Interior Design
- Location: กรุงเทพ + ปริมณฑล หรือจังหวัดเป้าหมาย
- Behavior: Recently Moved, Homeowners
- Lookalike audience จาก customer list

Meta Business Suite:
- ใช้ Meta Business Suite ในการจัดการทุกอย่าง
- Schedule post ล่วงหน้าทั้งสัปดาห์
- ตอบ comment/inbox จาก dashboard เดียว`,
    keywords: 'Facebook page,management,insights,ad targeting,Meta,โพสต์,engagement,reach',
    source: 'social_media_guide_2026',
    priority: 8,
  },
  {
    category: 'social_media_management',
    title: 'Content Calendar Template — การวางแผนคอนเทนต์รายสัปดาห์',
    content: `Content Calendar Template รายสัปดาห์:

จันทร์ — Motivation/Educational
- FB: Tips อินทีเรียดีไซน์ (Carousel 5-7 สไลด์)
- IG: Reel "5 วิธีทำให้บ้านดูกว้างขึ้น"
- TikTok: Before/After ห้องไหนสักห้อง

อังคาร — Product/Service Showcase
- FB: โพสต์ผลงานล่าสุดพร้อม caption บอกรายละเอียด
- IG: Carousel "ขั้นตอนการออกแบบ"
- Story: Poll "สไตล์ไหนที่คุณชอบ?"

พุธ — Engagement Day
- FB: Ask me anything / Q&A
- IG: Story "This or That" สไตล์ต่างๆ
- TikTok: React/Stitch กับ trending interior content

พฤหัสบดี — Behind the Scenes
- FB: Live หรือ VDO ขั้นตอนงาน
- IG: Reels ถ่ายทำระหว่างงาน
- TikTok: Day in the life as interior designer

ศุกร์ — Community + Promotion
- FB: Share testimonial ลูกค้า + CTA
- IG: Giveaway หรือ collaboration
- Story: ส่วนลดพิเศษ weekend

เสาร์ — Lifestyle Content
- FB: Mood board / Inspiration
- IG: Aesthetic photo + hashtag heavy

อาทิตย์ — Light / Personal
- Story: behind the scene personal
- IG: Quote หรือ moodboard

Tools: Later, Buffer, Meta Business Suite (schedule)`,
    keywords: 'content calendar,วางแผน,โพสต์,content plan,social media,schedule,weekly',
    source: 'social_media_guide_2026',
    priority: 8,
  },
  {
    category: 'social_media_management',
    title: 'Analytics Metrics — ตัวเลขที่ต้องติดตาม',
    content: `KPI และ Metrics สำหรับ Social Media ธุรกิจ:

Facebook Analytics:
- Reach: จำนวน unique คนที่เห็น (เป้า: เพิ่มขึ้น 10%/เดือน)
- Impressions: จำนวนครั้งที่โพสต์ถูกแสดง
- Engagement Rate: (Reactions+Comments+Shares)/Reach × 100%
  * ดีมาก: >5% | ดี: 2-5% | ต้องปรับ: <2%
- Page Growth: Like/Follow เพิ่มกี่คน/สัปดาห์
- Reach by Post Type: Reel/Photo/Video ไหนดีกว่า

Instagram Analytics:
- Reach & Impressions (แยกตาม post/story/reel)
- Saves (สัญญาณที่ดีที่สุด — algo ชอบ)
- Profile Visits จาก post
- Website clicks
- Follower growth rate
- Story Views / Completion Rate (>60% ดี)

TikTok Analytics:
- Views (เป้า: 1,000+ views/video)
- Watch Time / Average Watch Percentage (>50% = ดี)
- Followers gained
- Profile Views
- Shares (viral signal)

Business Metrics ที่สำคัญกว่า vanity:
- DM/Inquiries จาก social
- Conversion Rate (inquiry → client)
- Cost per Lead (ถ้ายิงโฆษณา)
- Revenue attributed to social
- ROI of social media effort`,
    keywords: 'analytics,metrics,KPI,engagement rate,reach,TikTok,Instagram,Facebook,insights,วัดผล',
    source: 'social_media_guide_2026',
    priority: 7,
  },

  // ════════════════════════════════════════════════════════════
  // CATEGORY: pet_business
  // ════════════════════════════════════════════════════════════
  {
    category: 'pet_business',
    title: 'Fur and Found — Brand Guide',
    content: `Fur and Found | 퍼 앤 파운드 — Brand Guide:

Brand Identity:
- ชื่อ: Fur and Found (อังกฤษ) | 퍼 앤 파운드 (เกาหลี)
- Concept: Premium pet shop สินค้านำเข้าจากเกาหลี
- Target: เจ้าของสัตว์เลี้ยงที่ใส่ใจคุณภาพ อายุ 22-40 ปี
- Positioning: Premium แต่ accessible — ไม่ใช่ luxury ที่แพงเกินเอื้อม

Visual Identity:
- Style: Minimal line art
- สัตว์นำ: บิชอง (Bichon Frisé) + ชิสุ (Shih Tzu)
- Element: Arch frame, sparkle/star motif
- สี: Off-white, soft pink, sage green, gold accent
- Font: Clean sans-serif + Korean element

Brand Voice:
- อบอุ่น ใส่ใจ ให้ความรู้สึก "คนรักสัตว์"
- ใช้ภาษาเป็นกันเอง ไม่เป็นทางการมากเกินไป
- Mix ไทย-อังกฤษ-เกาหลีเล็กน้อย (K-pop culture)

Korean Suppliers:
- Babiana — อาหาร + ขนมสัตว์เลี้ยง organic
- SICGGU — fashion สัตว์เลี้ยง (เสื้อผ้า/accessories)
- Hubsch — ของแต่งบ้าน/ของเล่น lifestyle
- SSSS — premium grooming products
- Meaningless — streetwear pet fashion
- Peach Private — soft goods / bedding

Platform ที่เหมาะ:
- IG: showcase สินค้า + lifestyle
- TikTok: unboxing, pet fashion haul
- LINE OA: customer service + order tracking`,
    keywords: 'Fur and Found,pet shop,เกาหลี,Korean,brand guide,บิชอง,ชิสุ,สัตว์เลี้ยง,premium',
    source: 'brand_guide_fur_and_found',
    priority: 9,
  },
  {
    category: 'pet_business',
    title: 'Korean Pet Product Trends 2026',
    content: `Korean Pet Product Trends 2026:

1. Humanization Trend:
- สัตว์เลี้ยงถูกมองเป็นสมาชิกครอบครัว
- Products: ชุดนอน, รองเท้า, outfit matching กับเจ้าของ
- Food: Gourmet meals, birthday cake สำหรับสัตว์

2. Wellness & Health Focus:
- Probiotic treats สำหรับย่อยอาหาร
- Joint supplements (glucosamine)
- Dental care products (toothpaste, dental chews)
- Mental enrichment toys (puzzle feeders)

3. K-Style Pet Fashion:
- Streetwear inspired (แบรนด์เดียวกับ human fashion)
- Seasonal collections (spring/summer, fall/winter)
- Accessories: beret, glasses, bow tie
- Color palette: pastel, monochrome, Y2K

4. Eco-Friendly / Sustainable:
- Biodegradable packaging
- Natural ingredient treats
- Organic cotton clothing
- Recycled material toys

5. Smart Pet Tech:
- GPS collar tracker
- Auto feeder ควบคุมผ่านแอป
- Pet camera + treat dispenser
- Smart litter box (แมว)

Price Range ที่ขายดีในไทย:
- Snack/treat: 150-450 บาท/ชิ้น
- เสื้อผ้า: 350-1,500 บาท
- Accessories: 250-800 บาท
- Grooming products: 300-900 บาท`,
    keywords: 'Korean pet,trend 2026,สัตว์เลี้ยง,เกาหลี,pet fashion,wellness,สุขภาพสัตว์',
    source: 'pet_market_research_2026',
    priority: 8,
  },
  {
    category: 'pet_business',
    title: 'Pet Content Strategy — Engagement Tips',
    content: `Pet Content Strategy สำหรับธุรกิจสัตว์เลี้ยง:

Content ที่ Perform ดีที่สุด:
1. Video สัตว์เลี้ยงน่ารัก + ตลก (viral potential สูง)
2. Transformation: ก่อน-หลัง grooming
3. Unboxing สินค้าใหม่ (กล้องจับปฏิกิริยาสัตว์)
4. Day in the life ของสัตว์เลี้ยง
5. Pet fashion haul (แต่งตัวลอง)
6. Tips/Educational: สุขภาพ, grooming, โภชนาการ

Caption Formula:
"[ชื่อสัตว์] wearing [ชื่อสินค้า] 🐾
Available now: [ลิงก์ หรือ DM]
[2-3 hashtag]"

Hashtag Pet Business ไทย:
#ฟาร์แอนด์ฟาวด์ #สัตว์เลี้ยงไทย #น้องหมาน่ารัก
#BichonFrise #บิชอง #PetFashion #KoreanPet
#DogMom #CatMom #สัตว์เลี้ยงสุดรัก

Community Building:
- สร้าง Pet community ใน FB Group
- Repost customer photos (UGC — user generated content)
- Host pet photo contest ทุกเดือน
- Collaborate กับ pet influencer ไทย
- IG Story: "Feature a Follower" โชว์ลูกค้า

TikTok Ideas สำหรับ Fur and Found:
- "Rating my dog in different outfits"
- "Korean pet products review"
- "Unboxing Korean dog snacks"
- "My dog tries X for the first time"`,
    keywords: 'pet content,สัตว์เลี้ยง,TikTok,Instagram,hashtag,engagement,UGC,community',
    source: 'pet_marketing_guide',
    priority: 8,
  },
  {
    category: 'pet_business',
    title: 'Wendy — Bichon Frisé Content Ideas',
    content: `Wendy — Bichon Frisé สีขาวขนฟู (ไม่ใช่พุดเดิ้ล!)

ข้อมูลสายพันธุ์สำหรับ Content:
Bichon Frisé ลักษณะ:
- ขนสีขาว ฟู นุ่มเหมือนก้อนเมฆ / ลูกบอลขนฟู
- น้ำหนัก 3-5 กก. | ส่วนสูง 23-30 ซม.
- อายุขัย 12-15 ปี
- ไม่ผลัดขน (hypoallergenic) เหมาะคนแพ้ขน
- นิสัย: ร่าเริง เป็นมิตร ชอบอยู่ใกล้คน

Content Ideas สำหรับ Wendy:
Lifestyle:
- "Day in the life กับ Wendy"
- "Wendy ตื่นนอน morning routine"
- "Wendy กินอาหาร + review อาหารสัตว์"
- "Wendy ไปเที่ยว" (pet-friendly cafe/place)

Educational + Engagement:
- "5 facts เกี่ยวกับ Bichon Frisé ที่คุณอาจไม่รู้"
- "Wendy grooming day — ขั้นตอนตัดขน"
- "วิธีดูแลขน Bichon ให้ขาวฟู"

Viral Potential:
- "Wendy กับ outfit สไตล์ต่างๆ"
- "Wendy react กับอาหารใหม่"
- "Wendy vs บิชองคนอื่น — cute competition"

Caption ประจำ Wendy:
"Hi I'm Wendy ✨ Bichon Frisé | Bangkok 🇹🇭
[เนื้อหา]
#Wendy #BichonFrise #BichonFriseThailand #น้องหมา"`,
    keywords: 'Wendy,Bichon Frise,บิชอง,สุนัข,ขาว,content,น้องหมา,pet influencer',
    source: 'wendy_content_guide',
    priority: 8,
  },

];

// ─── Pre-load Knowledge (idempotent) ─────────────────────────────────────────
const stmtCheckExists = db.prepare(
  `SELECT id FROM knowledge_base WHERE category = ? AND title = ? LIMIT 1`
);
const stmtInsertKB = db.prepare(`
  INSERT INTO knowledge_base (category, title, content, keywords, source, priority)
  VALUES (@category, @title, @content, @keywords, @source, @priority)
`);

const seedKnowledge = db.transaction(() => {
  let inserted = 0;
  for (const entry of KNOWLEDGE_SEED) {
    const existing = stmtCheckExists.get(entry.category, entry.title);
    if (!existing) {
      stmtInsertKB.run(entry);
      inserted++;
    }
  }
  return inserted;
});

const seeded = seedKnowledge();
if (seeded > 0) {
  console.log(`[RAG] Seeded ${seeded} knowledge entries into knowledge_base`);
}

// ─── Prepared Statements ──────────────────────────────────────────────────────
const stmtGetByCategory = db.prepare(`
  SELECT id, category, title, content, keywords, source, priority, created_at
  FROM knowledge_base
  WHERE category = ?
  ORDER BY priority DESC, id ASC
  LIMIT ?
`);

const stmtGetAllCategories = db.prepare(`
  SELECT category, COUNT(*) as count
  FROM knowledge_base
  GROUP BY category
  ORDER BY category ASC
`);

const stmtGetTop = db.prepare(`
  SELECT id, category, title, content, keywords, source, priority, created_at
  FROM knowledge_base
  ORDER BY priority DESC, id ASC
  LIMIT ?
`);

const stmtInsertEntry = db.prepare(`
  INSERT INTO knowledge_base (category, title, content, keywords, source, priority)
  VALUES (@category, @title, @content, @keywords, @source, @priority)
`);

const stmtGetById = db.prepare(`SELECT * FROM knowledge_base WHERE id = ?`);

// ─── Export Functions ─────────────────────────────────────────────────────────

/**
 * Search the knowledge base using keyword matching with priority weighting.
 * @param {string} query - The search query
 * @param {string|null} category - Optional category filter
 * @param {number} limit - Max results to return
 * @returns {Array} Sorted results by relevance (match count * priority)
 */
export function searchKnowledgeBase(query, category = null, limit = 5) {
  if (!query || !query.trim()) return [];

  // Split query into keywords, filter empty and very short tokens
  const keywords = query
    .toLowerCase()
    .split(/[\s,，。、]+/)
    .map(k => k.trim())
    .filter(k => k.length > 1);

  if (keywords.length === 0) return [];

  // Fetch candidates: if category specified, narrow down; else pull top 200 by priority
  let candidates;
  if (category) {
    candidates = db.prepare(`
      SELECT id, category, title, content, keywords, source, priority
      FROM knowledge_base
      WHERE category = ?
      ORDER BY priority DESC
    `).all(category);
  } else {
    candidates = db.prepare(`
      SELECT id, category, title, content, keywords, source, priority
      FROM knowledge_base
      ORDER BY priority DESC
      LIMIT 200
    `).all();
  }

  // Score each entry
  const scored = candidates.map(row => {
    const searchText = [
      row.title || '',
      row.content || '',
      row.keywords || '',
      row.category || '',
    ].join(' ').toLowerCase();

    let matchCount = 0;
    for (const kw of keywords) {
      if (searchText.includes(kw)) matchCount++;
    }

    const relevance = matchCount * row.priority;
    return { ...row, matchCount, relevance };
  });

  // Filter by confidence threshold — single keyword + priority 9 = 9, must pass
  const MIN_RELEVANCE = 5;
  return scored
    .filter(r => r.matchCount > 0 && r.relevance >= MIN_RELEVANCE)
    .sort((a, b) => b.relevance - a.relevance || b.priority - a.priority)
    .slice(0, limit)
    .map(({ matchCount, relevance, ...row }) => row); // strip scoring fields
}

/**
 * Get all entries in a specific category.
 * @param {string} category
 * @param {number} limit
 */
export function getKnowledgeByCategory(category, limit = 10) {
  return stmtGetByCategory.all(category, limit);
}

/**
 * Add a new knowledge entry.
 * @param {string} category
 * @param {string} title
 * @param {string} content
 * @param {string} keywords - comma-separated
 * @param {string} source
 * @param {number} priority - 1-10
 */
export function addKnowledgeEntry(category, title, content, keywords = '', source = 'manual', priority = 5) {
  return stmtInsertEntry.run({ category, title, content, keywords, source, priority });
}

/**
 * Update an existing knowledge entry by id.
 * @param {number} id
 * @param {Object} updates - Partial fields: category, title, content, keywords, source, priority
 */
export function updateKnowledgeEntry(id, updates) {
  const existing = stmtGetById.get(id);
  if (!existing) throw new Error(`knowledge_base entry id=${id} not found`);

  const merged = { ...existing, ...updates };
  db.prepare(`
    UPDATE knowledge_base
    SET category  = @category,
        title     = @title,
        content   = @content,
        keywords  = @keywords,
        source    = @source,
        priority  = @priority,
        updated_at = datetime('now')
    WHERE id = @id
  `).run({
    id,
    category: merged.category,
    title:    merged.title,
    content:  merged.content,
    keywords: merged.keywords,
    source:   merged.source,
    priority: merged.priority,
  });

  return stmtGetById.get(id);
}

/**
 * Get all categories with their entry counts.
 * @returns {Array<{category: string, count: number}>}
 */
export function getAllCategories() {
  return stmtGetAllCategories.all();
}

/**
 * Get the highest priority knowledge entries across all categories.
 * @param {number} limit
 */
export function getTopKnowledge(limit = 10) {
  return stmtGetTop.all(limit);
}
