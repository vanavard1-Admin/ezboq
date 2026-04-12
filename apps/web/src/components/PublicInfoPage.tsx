import {
  ArrowLeft,
  BookOpenText,
  CheckCircle2,
  CircleHelp,
  Database,
  FileText,
  HardDriveDownload,
  ShieldCheck,
  Sparkles,
  Workflow,
} from 'lucide-react';
import { EzBOQLogo } from './EzBOQLogo';

export type PublicInfoView = 'guide' | 'faq' | 'privacy';

interface PublicInfoPageProps {
  view: PublicInfoView;
  isAuthenticated: boolean;
  onNavigate: (view: PublicInfoView) => void;
  onBack: () => void;
}

const viewMeta: Record<PublicInfoView, { title: string; description: string }> = {
  guide: {
    title: 'คู่มือใช้งาน EzBOQ',
    description: 'คู่มือแบบละเอียดตั้งแต่สร้างโครงการจาก template ไปจนถึงออกเอกสารทั้งชุด',
  },
  faq: {
    title: 'QA / คำถามที่พบบ่อย',
    description: 'อธิบายคำถามที่ผู้ใช้มักเจอเวลาสร้าง BOQ คุมเอกสาร และตรวจยอดรวม',
  },
  privacy: {
    title: 'นโยบายความเป็นส่วนตัว',
    description: 'อธิบายว่าระบบเก็บข้อมูลอะไร ใช้งานอย่างไร และข้อจำกัดของเวอร์ชันปัจจุบัน',
  },
};

const guideSections = [
  {
    title: '1. เริ่มต้นใช้งาน',
    points: [
      'ล็อกอินด้วยอีเมล/รหัสผ่านบน Firebase หรือ social provider ที่ระบบรองรับ',
      'ก่อนออกเอกสาร ให้เข้าไปกรอกข้อมูลในหน้า "ตั้งค่าบริษัท" ให้ครบ เช่น ชื่อบริษัท โลโก้ ลายเซ็น เลขผู้เสียภาษี และช่องทางติดต่อ',
      'ข้อมูลบริษัทจะถูกใช้ร่วมกันกับเอกสารหลัก เช่น ใบเสนอราคา ใบวางบิล ใบกำกับภาษี ใบหัก ณ ที่จ่าย และใบสั่งซื้อ',
    ],
  },
  {
    title: '2. สร้างโครงการจาก Template',
    points: [
      'ไปที่หน้า "จัดการโครงการ" แล้วกด "สร้างจาก Template"',
      'เลือกประเภทโครงการ เช่น บ้านเดี่ยว ทาวน์เฮ้าส์ คอนโดรีโนเวท หรืออาคารพาณิชย์',
      'กรอกชื่อโครงการ เจ้าของ เบอร์โทร ที่อยู่ พื้นที่ใช้สอย งบประมาณ และจำนวนห้อง',
      'เลือกหมวดงานเพิ่มเติมที่ต้องการรวมหรือไม่รวมใน BOQ ก่อนกดสร้าง',
    ],
  },
  {
    title: '3. Full Auto Document Pipeline',
    points: [
      'เมื่อสร้างโครงการจาก template ระบบจะสร้าง BOQ ตั้งต้นให้อัตโนมัติ',
      'ระบบจะต่อยอดจาก BOQ ไปเป็นตัวเลขต้นทุน ราคาลูกค้า ค่าดำเนินการ แผนงาน งวดชำระ ภาษี และ presentation defaults ให้อัตโนมัติ',
      'หน้า "หน้าโครงการ" จะสรุปว่าเอกสารใดพร้อมใช้งานแล้ว และมีข้อมูลใดที่ยังควรเติม เช่น รูป presentation หรือข้อมูลลูกค้า',
      'ถ้าแก้ BOQ ภายหลัง ระบบจะ sync metadata หลักของเอกสารให้อัตโนมัติจาก BOQ ล่าสุด',
    ],
  },
  {
    title: '4. ลำดับงานที่แนะนำ',
    points: [
      'เริ่มจาก "ต้นทุน / BOQ" เพื่อตรวจรายการ ปริมาณ และราคาต้นทุน',
      'ถ้าต้องซื้อวัสดุ ให้เปิด "ใบสั่งซื้อ" ระบบจะดึงเฉพาะรายการวัสดุที่มีต้นทุนวัสดุและตัดรายการค่าแรงล้วนออก',
      'ต่อด้วย "เอกสารลูกค้า" และ "Presentation" สำหรับใช้เสนอราคาและพรีเซนต์งาน',
      'จากนั้นใช้ "ใบวางบิล", "สัญญา", "แผนงาน", "ใบกำกับภาษี" และ "หัก ณ ที่จ่าย" ตาม flow การเก็บเงินและส่งมอบ',
    ],
  },
  {
    title: '5. แก้ BOQ ให้ถูกวิธี',
    points: [
      'หน้า "แก้ไข BOQ" เหมาะสำหรับเพิ่มรายการ ลบรายการ ย้ายลำดับ และแก้หลายแถวพร้อมกัน',
      'ถ้าแก้เฉพาะตัวเลขต้นทุนหรือจำนวน ระบบเอกสารจะอัปเดตตาม BOQ โดยอัตโนมัติ',
      'ถ้าต้องการรีเซ็ตเอกสารตั้งต้นใหม่ทั้งชุดจาก BOQ ล่าสุด ให้กด "เตรียมเอกสารทั้งชุด" บนหน้าโครงการ',
      'ถ้ามีการตั้งราคาเฉพาะลูกค้าเป็นเลข override ต่อหน่วย เอกสารลูกค้าจะอิงค่าดังกล่าวแทนการคูณ markup ปกติ',
    ],
  },
  {
    title: '6. Presentation Board',
    points: [
      'หน้า Presentation ใช้สำหรับพรีเซนต์ mood, ภาพ before/after, render หรือ reference images ให้ลูกค้า',
      'ใส่รูป hero และรูป feature เพื่อให้ระบบจัด layout แบบพรีเซนต์โดยอัตโนมัติ',
      'ถ้ายังไม่ใส่รูป ระบบจะยังเตรียม layout และข้อความตั้งต้นไว้ให้ แต่ pipeline จะแจ้งว่าควรเติมรูปก่อนใช้งานจริง',
    ],
  },
  {
    title: '7. Export และเก็บสำรอง',
    points: [
      'ปุ่ม export จะรวมเอกสารหลักออกเป็นไฟล์ PDF ตามเอกสารที่เปิดใช้งานได้',
      'หน้าแก้ไข BOQ รองรับ export/import JSON เพื่อสำรองหรือย้ายข้อมูลโครงการ',
      'หากต้องการความปลอดภัยสูง ควร export JSON หรือ PDF เก็บสำรองเป็นระยะ โดยเฉพาะก่อนเปลี่ยนเครื่องหรือเคลียร์ browser',
    ],
  },
  {
    title: '8. ข้อควรระวัง',
    points: [
      'เวอร์ชันปัจจุบันใช้ Firebase Authentication และซิงก์ข้อมูลโครงการ/ข้อมูลบริษัทขึ้นระบบกลาง โดย browser จะเก็บ cache ล่าสุดไว้ช่วยให้เปิดงานต่อได้เร็วขึ้น',
      'ถ้าอินเทอร์เน็ตสะดุด ระบบอาจเปิดข้อมูลล่าสุดในเครื่องให้ทำงานต่อชั่วคราว แล้วค่อยกลับไปซิงก์เมื่อเชื่อมต่อได้อีกครั้ง',
      'แม้ข้อมูลหลักจะอยู่บนระบบกลางแล้ว แต่ยังแนะนำให้ export JSON หรือ PDF สำหรับ milestone สำคัญก่อนแก้เอกสารชุดใหญ่',
      'ก่อนออกเอกสารจริง ควรตรวจเลขเอกสาร วันที่ ข้อมูลบริษัท ข้อมูลลูกค้า งวดชำระ ภาษี และ wording สัญญาอีกครั้ง',
    ],
  },
];

const faqItems = [
  {
    q: 'ทำไมสร้างโครงการจาก template แล้วเอกสารขึ้นมาทันทีหลายหน้า?',
    a: 'เพราะระบบใช้ BOQ เป็น source of truth และเตรียม metadata ของเอกสารหลักให้ตั้งแต่ตอนสร้างโครงการ เช่น แผนงาน งวดชำระ ภาษี และ presentation defaults',
  },
  {
    q: 'ถ้าแก้ BOQ แล้วใบเสนอราคาไม่ตรงเดิม ถือว่าปกติไหม?',
    a: 'ปกติ ถ้าโปรเจกต์เปิด auto pipeline ระบบจะ recalculation ตัวเลขหลักจาก BOQ ล่าสุด เพื่อไม่ให้เอกสารต้นทุนกับเอกสารลูกค้าหลุดคนละชุด',
  },
  {
    q: 'ใบสั่งซื้อเอารายการอะไรมาแสดง?',
    a: 'ใบสั่งซื้อจะคัดเฉพาะรายการที่มีต้นทุนวัสดุจริง เช่น unit price หรือ total price ฝั่งวัสดุ และจะไม่นำรายการค่าแรงล้วนหรือรายการที่ลูกค้าจัดหาเองมาแสดง',
  },
  {
    q: 'ทำไม pipeline ยังขึ้นเตือนทั้งที่เอกสารพร้อมแล้ว?',
    a: 'ระบบอาจเตือนเรื่องข้อมูลประกอบ เช่น เจ้าของโครงการ ที่อยู่ เบอร์โทร หรือรูปสำหรับ Presentation Board ซึ่งไม่จำเป็นต่อทุกเอกสาร แต่แนะนำให้เติมก่อนใช้งานจริง',
  },
  {
    q: 'ค่าดำเนินการกับกำไรต่างกันอย่างไร?',
    a: 'กำไรเกิดจาก markup ของ BOQ และราคาลูกค้า ส่วนค่าดำเนินการเป็นค่าใช้จ่ายเพิ่มเติมระดับโครงการที่บางเอกสารจะบวกเข้า grand total ตามที่ตั้งไว้',
  },
  {
    q: 'ทำไมยอดในใบเสนอราคากับใบวางบิลควรใกล้กัน?',
    a: 'เพราะทั้งสองหน้าอ่านจากข้อมูลโครงการชุดเดียวกัน โดยเฉพาะ customer pricing, BOQ และ operating cost ถ้าตัวเลขต่างกันมาก แปลว่ามี override หรือ manual wording ที่ควรตรวจ',
  },
  {
    q: 'ถ้าต้องการล็อกงวดชำระเอง ทำอย่างไร?',
    a: 'คุณสามารถเข้าไปแก้ payment schedule ของโครงการได้ แล้วระบบจะใช้ schedule นั้นกับใบวางบิลและสัญญาแทนชุดที่ระบบแนะนำอัตโนมัติ',
  },
  {
    q: 'ข้อมูลหายเมื่อเปลี่ยนเครื่องเป็นเพราะอะไร?',
    a: 'ถ้าล็อกอินด้วยบัญชีเดียวกัน ข้อมูลหลักควรถูกดึงจากระบบกลางขึ้นมาได้ แต่ถ้ายังไม่ขึ้น ให้ตรวจสถานะ sync, อินเทอร์เน็ต, หรือ sign out / sign in ใหม่อีกครั้ง และยังควร export สำรองไว้สำหรับ milestone สำคัญ',
  },
  {
    q: 'หน้าภาษีใช้ข้อมูลจากไหน?',
    a: 'VAT และ WHT ใช้ข้อมูลจาก taxData, ชื่อบริษัท, เลขผู้เสียภาษี และยอดรวมที่ derive จาก BOQ กับ pricing settings ของโครงการ',
  },
  {
    q: 'เอกสารบางหน้าพิมพ์สวยแต่แก้ข้อความแล้วไม่จำตอนรีเฟรช ทำไม?',
    a: 'หลายหน้าใช้ inline edit เพื่อแก้ wording ในโหมด preview/print เป็นหลัก ไม่ได้บันทึกกลับเข้า model ทุกช่องเสมอไป หากต้องการให้ persist จริง ควรแก้จากข้อมูลโครงการหรือ BOQ ต้นทาง',
  },
];

const privacySections = [
  {
    title: '1. ข้อมูลที่ระบบเก็บ',
    points: [
      'ข้อมูลการเข้าสู่ระบบ เช่น อีเมล ผู้ให้บริการเข้าสู่ระบบ และ Firebase UID ตาม provider ที่ใช้',
      'ข้อมูลโครงการ เช่น ชื่อโครงการ ที่อยู่ เจ้าของ เบอร์โทร BOQ ราคา แผนงาน งวดชำระ ภาษี และ presentation data',
      'ข้อมูลบริษัท เช่น ชื่อบริษัท โลโก้ ลายเซ็น เลขผู้เสียภาษี อีเมล และเบอร์โทรสำหรับใช้ออกเอกสาร',
    ],
  },
  {
    title: '2. วิธีการเก็บข้อมูล',
    points: [
      'Authentication ใช้ Firebase Authentication สำหรับยืนยันตัวตน',
      'ข้อมูลโครงการและข้อมูลบริษัทจะซิงก์ขึ้นระบบกลางตาม workspace ของผู้ใช้ โดย browser เก็บ cache ล่าสุดไว้เพื่อช่วยให้เปิดงานต่อได้เร็วขึ้น',
      'ถ้าซิงก์ระบบกลางสะดุดชั่วคราว ระบบอาจ fallback ไปใช้ข้อมูลล่าสุดในเครื่องก่อน แล้วค่อยเชื่อมต่อกลับภายหลัง',
      'การ export PDF/JSON เป็นการสร้างไฟล์บนเครื่องผู้ใช้ตามที่ผู้ใช้สั่งเอง',
    ],
  },
  {
    title: '3. สิ่งที่ระบบยังไม่ทำในเวอร์ชันปัจจุบัน',
    points: [
      'ยังไม่มี revision history หรือ rollback ระดับ server สำหรับย้อนไปยังฉบับก่อนหน้าแบบละเอียด',
      'ยังไม่มี shared workspace/invite flow สำหรับ collaboration หลายคนแบบเต็มรูปแบบใน UI',
      'ยังไม่มีการรับประกันว่าการแก้ข้อความแบบ inline edit บนบางเอกสารจะถูกบันทึกกลับเข้า model ทุกช่องเสมอไป',
    ],
  },
  {
    title: '4. การใช้งานข้อมูล',
    points: [
      'ข้อมูลโครงการจะถูกใช้เพื่อคำนวณต้นทุน ราคาลูกค้า และสร้างเอกสารใน workflow ของระบบ',
      'ข้อมูลบริษัทจะถูกดึงไปใช้แสดงบนเอกสารที่เกี่ยวข้องเท่านั้น',
      'ข้อมูลรูปภาพที่อัปโหลดใน presentation ถูกใช้เพื่อจัด layout งานนำเสนอของโครงการนั้น',
    ],
  },
  {
    title: '5. คำแนะนำด้านความปลอดภัย',
    points: [
      'อย่าใช้เครื่องสาธารณะในการเก็บข้อมูลโครงการสำคัญโดยไม่ sign out และล้าง browser session หลังใช้งาน',
      'ควร export JSON หรือ PDF สำรองก่อนล้าง cache, reset browser, หรือย้ายเครื่อง',
      'ตรวจสอบสิทธิ์ผู้ใช้และขอบเขตการเข้าถึงทุกครั้งก่อนใช้กับข้อมูลลูกค้าจริง',
    ],
  },
];

function TabButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-sm transition-colors ${
        active
          ? 'bg-[var(--doc-primary)] text-white'
          : 'border border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
      }`}
    >
      {label}
    </button>
  );
}

export function PublicInfoPage({
  view,
  isAuthenticated,
  onNavigate,
  onBack,
}: PublicInfoPageProps) {
  const meta = viewMeta[view];

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#f0f7f2,transparent_38%),linear-gradient(180deg,#f8faf8_0%,#f4f6f3_100%)] px-4 py-6">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-stone-200 bg-white/90 px-5 py-4 shadow-sm backdrop-blur">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-4 py-2 text-sm text-stone-600 transition hover:bg-stone-50"
            >
              <ArrowLeft className="h-4 w-4" />
              {isAuthenticated ? 'กลับสู่ Workspace' : 'กลับหน้าเข้าสู่ระบบ'}
            </button>
            <div className="flex items-center gap-3">
              <EzBOQLogo size="sm" className="text-stone-800" />
              <div>
                <p className="text-[11px] uppercase tracking-[0.24em] text-stone-400">Help Center</p>
                <h1 className="text-lg text-stone-900">{meta.title}</h1>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <TabButton active={view === 'guide'} label="คู่มือใช้งาน" onClick={() => onNavigate('guide')} />
            <TabButton active={view === 'faq'} label="QA" onClick={() => onNavigate('faq')} />
            <TabButton active={view === 'privacy'} label="Privacy" onClick={() => onNavigate('privacy')} />
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
          <aside className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
            <div className="rounded-2xl bg-emerald-50 px-4 py-4">
              <p className="text-[11px] uppercase tracking-[0.22em] text-emerald-700">Overview</p>
              <h2 className="mt-2 text-xl text-stone-900">{meta.title}</h2>
              <p className="mt-2 text-sm leading-6 text-stone-600">{meta.description}</p>
            </div>

            <div className="mt-5 space-y-3">
              <div className="rounded-2xl border border-stone-200 p-4">
                <div className="flex items-center gap-2 text-stone-800">
                  <Workflow className="h-4 w-4 text-[var(--doc-primary)]" />
                  <span className="text-sm">Full Auto Pipeline</span>
                </div>
                <p className="mt-2 text-xs leading-5 text-stone-500">
                  สร้างโครงการจาก template แล้วระบบจะตั้ง BOQ, งวดชำระ, แผนงาน, ภาษี และ presentation defaults ให้พร้อมก่อน
                </p>
              </div>

              <div className="rounded-2xl border border-stone-200 p-4">
                <div className="flex items-center gap-2 text-stone-800">
                  <Database className="h-4 w-4 text-[var(--doc-primary)]" />
                  <span className="text-sm">การเก็บข้อมูล</span>
                </div>
                <p className="mt-2 text-xs leading-5 text-stone-500">
                  เวอร์ชันปัจจุบันใช้ Firebase สำหรับ auth และเก็บข้อมูลโครงการ/ข้อมูลบริษัทบนระบบกลาง โดย browser เก็บ cache ล่าสุดไว้เพื่อช่วยให้เปิดงานต่อได้เร็วขึ้น
                </p>
              </div>

              <div className="rounded-2xl border border-stone-200 p-4">
                <div className="flex items-center gap-2 text-stone-800">
                  <HardDriveDownload className="h-4 w-4 text-[var(--doc-primary)]" />
                  <span className="text-sm">สำรองข้อมูล</span>
                </div>
                <p className="mt-2 text-xs leading-5 text-stone-500">
                  ถึงข้อมูลหลักจะอยู่บนระบบกลางแล้ว แต่ยังแนะนำให้ export JSON หรือ PDF สำหรับ milestone สำคัญก่อนแก้เอกสารชุดใหญ่
                </p>
              </div>
            </div>
          </aside>

          <main className="space-y-5">
            {view === 'guide' && (
              <>
                <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center gap-2 text-stone-800">
                    <BookOpenText className="h-5 w-5 text-[var(--doc-primary)]" />
                    <h2 className="text-xl">ภาพรวมการใช้งาน</h2>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-stone-400">Step 1</p>
                      <p className="mt-2 text-sm text-stone-800">สร้างโครงการจาก template</p>
                    </div>
                    <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-stone-400">Step 2</p>
                      <p className="mt-2 text-sm text-stone-800">ตรวจ BOQ และ flow เอกสาร</p>
                    </div>
                    <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-stone-400">Step 3</p>
                      <p className="mt-2 text-sm text-stone-800">แก้ wording รายหน้าและ export</p>
                    </div>
                  </div>
                </section>

                {guideSections.map((section) => (
                  <section key={section.title} className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
                    <h2 className="text-lg text-stone-900">{section.title}</h2>
                    <div className="mt-4 space-y-3">
                      {section.points.map((point) => (
                        <div key={point} className="flex items-start gap-3 text-sm leading-6 text-stone-700">
                          <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-700" />
                          <span>{point}</span>
                        </div>
                      ))}
                    </div>
                  </section>
                ))}
              </>
            )}

            {view === 'faq' && (
              <>
                <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center gap-2 text-stone-800">
                    <CircleHelp className="h-5 w-5 text-[var(--doc-primary)]" />
                    <h2 className="text-xl">คำถามที่พบบ่อย</h2>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-stone-600">
                    ถ้าระบบดูแปลก ยอดรวมไม่ตรง หรือไม่แน่ใจว่าเอกสารถูก generate จากชุดข้อมูลไหน ให้เช็กจาก BOQ และหน้าโครงการก่อนเสมอ
                  </p>
                </section>

                {faqItems.map((item, index) => (
                  <section key={item.q} className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-stone-400">Q{index + 1}</p>
                    <h2 className="mt-2 text-lg text-stone-900">{item.q}</h2>
                    <p className="mt-3 text-sm leading-7 text-stone-700">{item.a}</p>
                  </section>
                ))}
              </>
            )}

            {view === 'privacy' && (
              <>
                <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center gap-2 text-stone-800">
                    <ShieldCheck className="h-5 w-5 text-[var(--doc-primary)]" />
                    <h2 className="text-xl">หลักการสำคัญ</h2>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                      <div className="flex items-center gap-2 text-sm text-stone-800">
                        <FileText className="h-4 w-4 text-[var(--doc-primary)]" />
                        ข้อมูลใช้ออกเอกสาร
                      </div>
                    </div>
                    <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                      <div className="flex items-center gap-2 text-sm text-stone-800">
                        <Database className="h-4 w-4 text-[var(--doc-primary)]" />
                        Auth ผ่าน Firebase
                      </div>
                    </div>
                    <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                      <div className="flex items-center gap-2 text-sm text-stone-800">
                        <Sparkles className="h-4 w-4 text-[var(--doc-primary)]" />
                        Project data sync ผ่าน cloud
                      </div>
                    </div>
                  </div>
                </section>

                {privacySections.map((section) => (
                  <section key={section.title} className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
                    <h2 className="text-lg text-stone-900">{section.title}</h2>
                    <div className="mt-4 space-y-3">
                      {section.points.map((point) => (
                        <div key={point} className="flex items-start gap-3 text-sm leading-6 text-stone-700">
                          <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-700" />
                          <span>{point}</span>
                        </div>
                      ))}
                    </div>
                  </section>
                ))}
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
