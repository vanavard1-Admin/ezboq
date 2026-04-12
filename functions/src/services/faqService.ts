import type { QuickReplyAction } from '../shared/lineQuickReply';
import {
  CMD_ADD_ITEM,
  CMD_BUSINESS_SETUP,
  CMD_BUSINESS_SETUP_FORM,
  CMD_CREATE_INVOICE,
  CMD_CREATE_INVOICE_FROM_QUOTATION,
  CMD_CREATE_QUOTATION,
  CMD_CREATE_RECEIPT,
  CMD_EDIT_ITEM,
  CMD_HELP,
  CMD_MENU,
  CMD_REPORT,
  CMD_REPORT_LAST_MONTH,
  CMD_REPORT_THIS_MONTH,
  CMD_REMOVE_ITEM,
  CMD_SETTINGS_BANK,
  CMD_SETTINGS_LOGO,
  CMD_SETTINGS_PROMPTPAY,
  CMD_SETTINGS_SIGNATURE,
  CMD_SETTINGS_STAMP,
  CMD_UNDO,
  CMD_VIEW_LATEST_DOCUMENT,
  CMD_BUY_PACK_199,
  CMD_BUY_PACK_279,
  getCanonicalCommand,
} from '../shared/commands';
import {
  buildPackagePricingMessage,
  buildPackageRecommendationMessage,
  buildPackageTrialMessage,
  isPackagePricingQuestion,
} from './packagePricingService';
import {
  buildSubscriptionPaymentHelpMessage,
  isSubscriptionPaymentHelpQuestion,
} from './subscriptionPaymentHelpService';

export enum FaqCategory {
  GETTING_STARTED = 'GETTING_STARTED',
  CONFUSED = 'CONFUSED',
  PRICING = 'PRICING',
  PROMO = 'PROMO',
  DOCUMENTS = 'DOCUMENTS',
  HOWTO = 'HOWTO',
  ACCOUNT = 'ACCOUNT',
  TROUBLESHOOTING = 'TROUBLESHOOTING',
  GREETING = 'GREETING',
}

export interface FaqEntry {
  id: string;
  category: FaqCategory;
  patterns: RegExp[];
  keywords: string[];
  response: string;
  quickReplies?: ReadonlyArray<QuickReplySpec>;
  structuredMessages?: (
    quickReplies?: QuickReplyAction[]
  ) => Array<Record<string, unknown>>;
}

interface QuickReplySpec {
  label: string;
  text: string;
}

const QR = {
  START: [
    { label: '📝 ทำใบเสนอราคา', text: CMD_CREATE_QUOTATION },
    { label: '⚙️ ตั้งค่าธุรกิจ', text: CMD_BUSINESS_SETUP },
    { label: '📱 เมนู', text: CMD_MENU },
  ],
  MENU_HELP: [
    { label: '📱 เมนู', text: CMD_MENU },
    { label: '❓ ช่วยเหลือ', text: CMD_HELP },
    { label: '📝 ทำใบเสนอราคา', text: CMD_CREATE_QUOTATION },
  ],
  PRICING: [
    { label: '💰 ซื้อแพ็ค 99', text: CMD_BUY_PACK_199 },
    { label: '👥 ซื้อแพ็ค 279', text: CMD_BUY_PACK_279 },
    { label: '📱 เมนู', text: CMD_MENU },
  ],
  PROMO: [
    { label: '🎟️ คูปอง', text: 'คูปอง' },
    { label: '👥 แนะนำเพื่อน', text: 'แนะนำเพื่อน' },
    { label: '📱 เมนู', text: CMD_MENU },
  ],
  DOCS: [
    { label: '📄 ทำใบเสนอราคา', text: CMD_CREATE_QUOTATION },
    { label: '🧾 ทำใบวางบิล', text: CMD_CREATE_INVOICE },
    { label: '🧾 ทำใบเสร็จ', text: CMD_CREATE_RECEIPT },
  ],
  DOCS_EXAMPLES: [
    { label: '📄 ทำใบเสนอราคา', text: CMD_CREATE_QUOTATION },
    { label: '🏢 ตั้งค่าธุรกิจ', text: CMD_BUSINESS_SETUP_FORM },
    { label: '🔗 เชื่อมต่อ', text: 'เชื่อมต่อ' },
  ],
  HOWTO_ASSETS: [
    { label: '⚙️ ตั้งค่าธุรกิจ', text: CMD_BUSINESS_SETUP },
    { label: '🖼️ โลโก้', text: CMD_SETTINGS_LOGO },
    { label: '✍️ ลายเซ็น', text: CMD_SETTINGS_SIGNATURE },
    { label: '🖋️ ตราประทับ', text: CMD_SETTINGS_STAMP },
    { label: '📱 เมนู', text: CMD_MENU },
  ],
  CONNECT: [
    { label: '🔗 เชื่อมต่อ', text: 'เชื่อมต่อ' },
    { label: '📱 เมนู', text: CMD_MENU },
  ],
  TROUBLE: [
    { label: '🔄 ลองใหม่', text: 'ลองใหม่' },
    { label: '📱 เมนู', text: CMD_MENU },
    { label: '👨‍💼 ติดต่อแอดมิน', text: 'ติดต่อแอดมิน' },
  ],
  PDF: [
    { label: '📤 ขอ PDF', text: 'ขอ PDF' },
    { label: '🔄 ส่งเอกสารอีกครั้ง', text: 'ส่งเอกสารอีกครั้ง' },
    { label: '📱 เมนู', text: CMD_MENU },
  ],
  END: [
    { label: '📱 เมนู', text: CMD_MENU },
    { label: '📝 ทำใบเสนอราคา', text: CMD_CREATE_QUOTATION },
  ],
  PRODUCTS: [
    { label: '📦 สินค้า/บริการ', text: 'สินค้า/บริการ' },
    { label: '➕ เพิ่มรายการ', text: CMD_ADD_ITEM },
    { label: '📱 เมนู', text: CMD_MENU },
  ],
  REPORTS: [
    { label: '📊 รายงาน', text: CMD_REPORT },
    { label: '📁 เอกสารล่าสุด', text: CMD_VIEW_LATEST_DOCUMENT },
    { label: '📱 เมนู', text: CMD_MENU },
  ],
  REPORTS_RANGE: [
    { label: '📊 รายงานเดือนนี้', text: CMD_REPORT_THIS_MONTH },
    { label: '📊 รายงานเดือนก่อน', text: CMD_REPORT_LAST_MONTH },
    { label: '📊 รายงาน', text: CMD_REPORT },
  ],
  DOCS_CHAIN: [
    { label: '🧾 ใบวางบิล จากใบเสนอราคา', text: CMD_CREATE_INVOICE_FROM_QUOTATION },
    { label: '💰 ทำใบเสร็จ', text: CMD_CREATE_RECEIPT },
    { label: '📁 เอกสารล่าสุด', text: CMD_VIEW_LATEST_DOCUMENT },
  ],
  SETTINGS_PAYMENT: [
    { label: '🏦 ตั้งค่าธนาคาร', text: CMD_SETTINGS_BANK },
    { label: '📌 ตั้งค่าพร้อมเพย์', text: CMD_SETTINGS_PROMPTPAY },
    { label: '📱 เมนู', text: CMD_MENU },
  ],
  SETTINGS_THEME: [
    { label: '🎨 ตั้งค่าธีม', text: 'ตั้งค่าธีม' },
    { label: '⚙️ ตั้งค่าธุรกิจ', text: CMD_BUSINESS_SETUP },
    { label: '📱 เมนู', text: CMD_MENU },
  ],
  TEMPLATE: [
    { label: '📝 แบบฟอร์ม', text: 'แบบฟอร์ม' },
    { label: '📱 เมนู', text: CMD_MENU },
  ],
  SLIP: [
    { label: '🔎 เช็คสลิป', text: 'เช็คสลิป' },
    { label: '👨‍💼 ติดต่อแอดมิน', text: 'ติดต่อแอดมิน' },
    { label: '📱 เมนู', text: CMD_MENU },
  ],
  PACKAGE_STATUS: [
    { label: '📦 สถานะแพ็ค', text: 'สถานะแพ็ค' },
    { label: '💰 ซื้อแพ็ค 99', text: CMD_BUY_PACK_199 },
    { label: '📱 เมนู', text: CMD_MENU },
  ],
} as const;

const ROBOT = {
  INTRO: ['บี๊บ! 🤖', 'ติ๊ด! 🦾', 'ระบบพร้อมช่วยแล้ว... 📊', 'รับคำสั่งแล้ว! 📡'],
  POSITIVE: ['เสร็จสิ้น! ✨', 'สำเร็จแล้ว! 🎉', 'พร้อมใช้งาน! ⚡', 'เรียบร้อย! ✅'],
  THINKING: ['กำลังวิเคราะห์... 🔍', 'คำนวณข้อมูล... 🧮', 'ค้นหาคำตอบ... 🤔'],
};

function pickRandom(list: string[]): string {
  return list[Math.floor(Math.random() * list.length)];
}

function normalizeText(text: string): string {
  return text.replace(/\s+/g, ' ').trim().toLowerCase();
}

function formatNextSteps(): string {
  // Quick reply buttons already provide navigation — no need for text suffix
  return '';
}

function createQuickReplyAction(spec: QuickReplySpec): QuickReplyAction {
  const cleaned = spec.text.replace(/\s+/g, ' ').trim();
  const text = getCanonicalCommand(cleaned);
  return {
    type: 'action',
    action: {
      type: 'message',
      label: spec.label,
      text,
    },
  };
}

function buildQuickReplies(specs?: ReadonlyArray<QuickReplySpec>): QuickReplyAction[] | undefined {
  if (!specs || specs.length === 0) return undefined;
  const actions = specs.map(createQuickReplyAction).slice(0, 13);
  return actions.length > 0 ? actions : undefined;
}

export const FAQ_ENTRIES: FaqEntry[] = [
  {
    id: 'start_how_to_use',
    category: FaqCategory.GETTING_STARTED,
    patterns: [/(ใช้(ยังไง|ไง|อย่างไร)|เริ่ม(ยังไง|ไง|ต้นยังไง))/i],
    keywords: ['ใช้ยังไง', 'ใช้ไง', 'เริ่มยังไง', 'เริ่มต้น'],
    response:
      `${pickRandom(ROBOT.THINKING)} คู่มือเริ่มต้น EzDOC\n\n` +
      '📌 ถ้าอยากเริ่มไว: ตั้งค่าธุรกิจให้ครบ แล้วเริ่มทำใบเสนอราคาได้ทันที',
    quickReplies: QR.START,
  },
  {
    id: 'start_what_can_do',
    category: FaqCategory.GETTING_STARTED,
    patterns: [/(ทำอะไรได้บ้าง|ทำได้อะไรบ้าง|มีคำสั่งอะไรบ้าง|ทำไรได้)/i],
    keywords: ['ทำอะไรได้บ้าง', 'ทำได้อะไร', 'คำสั่ง', 'ทำไรได้'],
    response:
      `${pickRandom(ROBOT.INTRO)} EzDOC ช่วยออกเอกสารครบชุดให้ได้\n\n` +
      '📌 ทำได้หลัก ๆ คือ: ใบเสนอราคา / ใบวางบิล / ใบเสร็จ และรายงานยอดขาย',
    quickReplies: [
      { label: '📝 ทำใบเสนอราคา', text: CMD_CREATE_QUOTATION },
      { label: '🧾 ทำใบวางบิล', text: CMD_CREATE_INVOICE },
      { label: '🧾 ทำใบเสร็จ', text: CMD_CREATE_RECEIPT },
      { label: '📱 เมนู', text: CMD_MENU },
    ],
  },
  {
    id: 'start_what_is_ezdoc',
    category: FaqCategory.GETTING_STARTED,
    patterns: [/(EzDoc คืออะไร|EzDOC คืออะไร|บอทอะไร|นี่คืออะไร|คืออะไร)/i],
    keywords: ['ezdoc', 'บอท', 'คืออะไร', 'นี่คืออะไร'],
    response:
      `${pickRandom(ROBOT.INTRO)} ด๊อกๆ คือ EzDOC เพื่อนหุ่นช่วยออกเอกสารผ่าน LINE ให้เจ้านาย\n\n` +
      '📌 พิมพ์ข้อมูลสั้น ๆ แล้วสั่งออกเอกสารได้ทันที',
    quickReplies: QR.START,
  },
  {
    id: 'confused_general',
    category: FaqCategory.CONFUSED,
    patterns: [/(งง|ไม่เข้าใจ|สับสน|ไม่รู้|ทำไง|ยังไง)/i],
    keywords: ['งง', 'ไม่เข้าใจ', 'สับสน', 'ไม่รู้'],
    response:
      'โอ๊ะ…เหมือนยังสับสนอยู่ 😅\n\n' +
      '📌 ไม่เป็นไร ด๊อกๆ พาไปต่อให้ได้ เจ้านายเลือกทางได้เลย',
    quickReplies: QR.MENU_HELP,
  },
  {
    id: 'confused_cant_find',
    category: FaqCategory.CONFUSED,
    patterns: [/(หาไม่เจอ|ไม่เจอ|หาอะไร)/i],
    keywords: ['ไม่เจอ', 'หาไม่เจอ', 'หาอะไร'],
    response:
      `${pickRandom(ROBOT.THINKING)} ด๊อกๆ กำลังช่วยค้นหาให้ครับ\n\n` +
      '📌 บอกด๊อกๆ ได้เลยว่าอยากหาอะไร เดี๋ยวพาไปจุดนั้น',
    quickReplies: QR.MENU_HELP,
  },
  {
    id: 'confused_wrong_input',
    category: FaqCategory.CONFUSED,
    patterns: [/(พิมพ์ผิด|ไม่ใช่|ผิด)/i],
    keywords: ['พิมพ์ผิด', 'ไม่ใช่', 'ผิด'],
    response:
      'รับทราบครับ ไม่ต้องกังวล 😊\n\n' +
      '📌 ถ้าข้อมูลเริ่มเพี้ยน ให้ยกเลิกหรือกลับเมนูก่อน แล้วค่อยเริ่มใหม่',
    quickReplies: [
      { label: '🚫 ยกเลิก', text: 'ยกเลิก' },
      { label: '📱 เมนู', text: CMD_MENU },
      { label: '📝 ทำใบเสนอราคา', text: CMD_CREATE_QUOTATION },
    ],
  },
  {
    id: 'pricing_cost',
    category: FaqCategory.PRICING,
    patterns: [/^(?:ราคา(?:เท่าไหร่|เท่าไร)?|ค่าใช้จ่าย(?:เท่าไหร่|เท่าไร)?|ค่าบริการ(?:เท่าไหร่|เท่าไร)?|เสียเงินไหม|เสียตังไหม)$/i],
    keywords: ['ราคาเท่าไหร่', 'ค่าใช้จ่าย', 'ค่าบริการ', 'เสียเงินไหม', 'เสียตังไหม'],
    response: buildPackagePricingMessage(),
    quickReplies: QR.PRICING,
  },
  {
    id: 'pricing_free_trial',
    category: FaqCategory.PRICING,
    patterns: [/(ฟรีไหม|ใช้ฟรีได้ไหม|ทดลองใช้)/i],
    keywords: ['ฟรีไหม', 'ใช้ฟรี', 'ทดลองใช้'],
    response: buildPackageTrialMessage(),
    quickReplies: QR.PRICING,
  },
  {
    id: 'pricing_pick_package',
    category: FaqCategory.PRICING,
    patterns: [/(แพ็คเกจ|แพ็คไหนดี|เลือกแพ็คไหน|แพ็คอะไรดี)/i],
    keywords: ['แพ็คเกจ', 'แพ็คไหนดี', 'เลือกแพ็ค'],
    response: buildPackageRecommendationMessage(),
    quickReplies: QR.PRICING,
  },
  {
    id: 'pricing_credit_meaning',
    category: FaqCategory.PRICING,
    patterns: [/(เครดิตคืออะไร|เครดิตใช้ทำอะไร|1\s*เครดิต|หนึ่งเครดิต)/i],
    keywords: ['เครดิต', '1 เครดิต', 'เครดิตคืออะไร'],
    response:
      '📌 ตอนนี้ระบบเป็นแพ็กแบบรายเดือน\n' +
      'ไม่ต้องใช้เครดิต แค่สมัครแพ็กก็ใช้งานได้ไม่จำกัดเอกสาร',
    quickReplies: QR.PRICING,
  },
  {
    id: 'promo_referral_coupon',
    category: FaqCategory.PROMO,
    patterns: [/(คูปอง|โค้ดส่วนลด|ส่วนลด|โปรโมชั่น|โปรโมชัน|แนะนำเพื่อน)/i],
    keywords: ['คูปอง', 'ส่วนลด', 'โปรโมชั่น', 'โปรโมชัน', 'แนะนำเพื่อน'],
    response:
      `${pickRandom(ROBOT.THINKING)} โปรโมชันแนะนำเพื่อนมาแล้ว\n\n` +
      '📌 วิธีรับคูปอง:\n' +
      '1) เปิดหน้า "คูปอง" ในบัญชี @ezdoc\n' +
      '2) กดรับคูปองแนะนำเพื่อน\n' +
      '3) ส่งคูปองให้เพื่อนสมัครแพ็ก 99\n\n' +
      '📌 ถ้ามีโค้ดส่วนลด:\n' +
      'พิมพ์: ใช้โค้ด ABC123\n\n' +
      '📌 เงื่อนไขหลัก:\n' +
      'ใช้ได้ 1 ครั้ง/คน, แพ็ก 99 เท่านั้น, คูปองอายุ 30 วัน\n\n' +
      formatNextSteps(),
    quickReplies: QR.PROMO,
  },
  {
    id: 'team_invite',
    category: FaqCategory.HOWTO,
    patterns: [/(เชิญทีม|เข้าทีม|ชวนทีม|ทีมใช้งาน|invite team|join team)/i],
    keywords: ['เชิญทีม', 'เข้าทีม', 'ชวนทีม', 'ทีมใช้งาน'],
    response:
      'บี๊บ! EzDOC Team เหมาะกับการใช้งานหลายผู้ใช้ และออกเอกสารได้ไม่จำกัดครับ\n\n' +
      'ถ้าจะเริ่มแพ็กทีม\n' +
      '1) พิมพ์ "ซื้อแพ็ค 279"\n' +
      '2) หลังเปิดแพ็กแล้ว พิมพ์ "เชิญทีม"\n' +
      '3) ให้เพื่อนพิมพ์ "เข้าทีม <โค้ด>" เพื่อเข้าร่วมทีม\n\n' +
      formatNextSteps(),
    quickReplies: [
      { label: '👥 ซื้อแพ็ค 279', text: CMD_BUY_PACK_279 },
      { label: '🤝 เชิญทีม', text: 'เชิญทีม' },
      { label: '📱 เมนู', text: CMD_MENU },
    ],
  },
  {
    id: 'docs_types',
    category: FaqCategory.DOCUMENTS,
    patterns: [/(ออกเอกสารได้กี่ประเภท|มีเอกสารอะไรบ้าง|เอกสารอะไรบ้าง)/i],
    keywords: ['กี่ประเภท', 'เอกสารอะไรบ้าง', 'มีเอกสาร'],
    response:
      `${pickRandom(ROBOT.INTRO)} เอกสารหลักมี 3 แบบ\n\n` +
      '1) ใบเสนอราคา\n' +
      '2) ใบวางบิล\n' +
      '3) ใบเสร็จ',
    quickReplies: QR.DOCS,
  },
  {
    id: 'docs_quotation',
    category: FaqCategory.DOCUMENTS,
    patterns: [/(ใบเสนอราคา.*คืออะไร|quotation.*คือ)/i],
    keywords: ['ใบเสนอราคา', 'quotation'],
    response:
      '📌 ใบเสนอราคา = สรุปงาน/สินค้าและราคา เพื่อเสนอให้ลูกค้า',
    quickReplies: [
      { label: '📝 ทำใบเสนอราคา', text: CMD_CREATE_QUOTATION },
      { label: '📱 เมนู', text: CMD_MENU },
    ],
  },
  {
    id: 'docs_examples',
    category: FaqCategory.DOCUMENTS,
    patterns: [/(ตัวอย่างเอกสาร|ขอดูตัวอย่าง|ตัวอย่างใบเสนอราคา|ตัวอย่างใบวางบิล|ตัวอย่างใบเสร็จ)/i],
    keywords: ['ตัวอย่างเอกสาร', 'ขอดูตัวอย่าง', 'ตัวอย่างใบเสนอราคา', 'ตัวอย่างใบวางบิล', 'ตัวอย่างใบเสร็จ'],
    response:
      '📄 ตัวอย่างเอกสารจริง 3 แบบ\n' +
      'กดเปิดดูหรือดาวน์โหลดได้เลยครับ',
    quickReplies: QR.DOCS_EXAMPLES,
    structuredMessages: (quickReplies) => {
      const { getDocumentExampleMessages } = require('./documentExamplesService');
      return getDocumentExampleMessages(quickReplies);
    },
  },
  {
    id: 'docs_invoice',
    category: FaqCategory.DOCUMENTS,
    patterns: [/(ใบวางบิล.*คืออะไร|ใบแจ้งหนี้.*คือ|invoice.*คือ)/i],
    keywords: ['ใบวางบิลคือ', 'ใบแจ้งหนี้คือ', 'invoice คือ'],
    response:
      '📌 ใบวางบิล/ใบแจ้งหนี้ = เอกสารเรียกเก็บเงินจากลูกค้า',
    quickReplies: [
      { label: '🧾 ทำใบวางบิล', text: CMD_CREATE_INVOICE },
      { label: '📱 เมนู', text: CMD_MENU },
    ],
  },
  {
    id: 'docs_receipt',
    category: FaqCategory.DOCUMENTS,
    patterns: [/(ใบเสร็จ.*คืออะไร|receipt.*คือ)/i],
    keywords: ['ใบเสร็จคือ', 'receipt คือ'],
    response:
      '📌 ใบเสร็จ = เอกสารยืนยันว่าได้รับเงินแล้ว',
    quickReplies: [
      { label: '💰 ทำใบเสร็จ', text: CMD_CREATE_RECEIPT },
      { label: '📱 เมนู', text: CMD_MENU },
    ],
  },
  {
    id: 'docs_chain_invoice',
    category: FaqCategory.DOCUMENTS,
    patterns: [/(ใบวางบิลจาก|ใบวางบิล จาก|ออกใบวางบิลต่อ|ต่อจากใบเสนอราคา|แปลงใบเสนอราคา)/i],
    keywords: ['ใบวางบิลจาก', 'ต่อจากใบเสนอราคา', 'แปลงใบเสนอราคา'],
    response:
      '📌 ถ้าจะออกใบวางบิลต่อจากใบเสนอราคา ให้พิมพ์:\n' +
      'ใบวางบิล จากใบเสนอราคา',
    quickReplies: QR.DOCS_CHAIN,
  },
  {
    id: 'docs_chain_receipt',
    category: FaqCategory.DOCUMENTS,
    patterns: [/(ใบเสร็จจาก|ใบเสร็จ จาก|ออกใบเสร็จต่อ|ต่อจากใบวางบิล)/i],
    keywords: ['ใบเสร็จจาก', 'ต่อจากใบวางบิล'],
    response:
      '📌 ถ้าจะออกใบเสร็จต่อจากใบวางบิล ให้พิมพ์ "ใบเสร็จ"\n' +
      'ระบบจะให้เลือกใบวางบิลที่ต้องการ',
    quickReplies: QR.DOCS_CHAIN,
  },
  {
    id: 'docs_full_chain',
    category: FaqCategory.DOCUMENTS,
    patterns: [/(ออกครบชุด|ครบชุดเอกสาร|ครบชุดจาก)/i],
    keywords: ['ออกครบชุด', 'ครบชุด'],
    response:
      '📌 ถ้าจะออกครบชุดจากใบเสนอราคา ให้พิมพ์:\n' +
      'ออกครบชุดจาก QUO-2569-001',
    quickReplies: [
      { label: '📁 เอกสารล่าสุด', text: CMD_VIEW_LATEST_DOCUMENT },
      { label: '🧾 ใบวางบิล จากใบเสนอราคา', text: CMD_CREATE_INVOICE_FROM_QUOTATION },
      { label: '📱 เมนู', text: CMD_MENU },
    ],
  },
  {
    id: 'howto_business_setup',
    category: FaqCategory.HOWTO,
    patterns: [/(ตั้งค่าธุรกิจ(ยังไง|ไง)|ตั้งค่ายังไง)/i],
    keywords: ['ตั้งค่าธุรกิจ', 'ตั้งค่า'],
    response:
      '⚙️ ตั้งค่าธุรกิจให้ครบก่อน จะทำให้เอกสารถูกต้อง\n\n' +
      '📌 ควรมี: ชื่อบริษัท / ที่อยู่ / เลขภาษี / เบอร์โทร',
    quickReplies: [
      { label: '⚙️ ตั้งค่าธุรกิจ', text: CMD_BUSINESS_SETUP },
      { label: '📱 เมนู', text: CMD_MENU },
    ],
  },
  {
    id: 'howto_logo',
    category: FaqCategory.HOWTO,
    patterns: [/(เพิ่มโลโก้|ใส่โลโก้|อัปโหลดโลโก้)/i],
    keywords: ['โลโก้', 'เพิ่มโลโก้', 'ใส่โลโก้', 'อัปโหลดโลโก้'],
    response:
      '🖼️ อัปโหลดโลโก้ทำได้แบบนี้\n\n' +
      '1) ส่งไฟล์รูป\n' +
      '2) พิมพ์คำว่า "โลโก้"\n' +
      `3) ${pickRandom(ROBOT.POSITIVE)}`,
    quickReplies: QR.HOWTO_ASSETS,
  },
  {
    id: 'howto_payment_info',
    category: FaqCategory.HOWTO,
    patterns: [/(ตั้งค่าธนาคาร|ตั้งค่าพร้อมเพย์|เลขบัญชี|บัญชีธนาคาร|พร้อมเพย์)/i],
    keywords: ['ตั้งค่าธนาคาร', 'พร้อมเพย์', 'เลขบัญชี'],
    response:
      '📌 ตั้งค่ารับชำระเงินได้ด้วยคำสั่ง:\n' +
      'ตั้งค่าธนาคาร ชื่อ เลขบัญชี ชื่อบัญชี\n' +
      'ตั้งค่าพร้อมเพย์ เลขพร้อมเพย์',
    quickReplies: QR.SETTINGS_PAYMENT,
  },
  {
    id: 'howto_signature_stamp',
    category: FaqCategory.HOWTO,
    patterns: [/(ลายเซ็น|ตราประทับ|ผู้ลงนาม|ตำแหน่งผู้ลงนาม)/i],
    keywords: ['ลายเซ็น', 'ตราประทับ', 'ผู้ลงนาม'],
    response:
      '📌 ถ้าจะใส่ลายเซ็น/ตราประทับ:\n' +
      '1) ส่งรูปภาพ\n' +
      '2) พิมพ์ว่า "ลายเซ็น" หรือ "ตราประทับ"\n' +
      '3) ตั้งผู้ลงนามได้ด้วย: ตั้งผู้ลงนาม <ชื่อ> ตำแหน่ง <ตำแหน่ง>',
    quickReplies: [
      { label: '✍️ ลายเซ็น', text: CMD_SETTINGS_SIGNATURE },
      { label: '🖋️ ตราประทับ', text: CMD_SETTINGS_STAMP },
      { label: '📱 เมนู', text: CMD_MENU },
    ],
  },
  {
    id: 'howto_theme',
    category: FaqCategory.HOWTO,
    patterns: [/(ธีม|theme|สีเอกสาร|ขาวดำ|เปลี่ยนสี|เปลี่ยน theme)/i],
    keywords: ['ธีม', 'theme', 'สีเอกสาร', 'ขาวดำ'],
    response:
      '🎨 เปลี่ยนธีมเอกสารใน LINE ได้เลยครับ\n' +
      'พิมพ์:\n' +
      'ตั้งค่าธีม เขียว | แดง | น้ำเงิน | ขาวดำ\n' +
      'หรือเฉพาะเอกสาร:\n' +
      'ตั้งค่าธีม ใบเสนอราคา แดง\n' +
      'ถ้าถนัดอังกฤษก็ใช้:\n' +
      'ตั้งค่าtheme red',
    quickReplies: QR.SETTINGS_THEME,
  },
  {
    id: 'howto_template',
    category: FaqCategory.HOWTO,
    patterns: [/(แบบฟอร์ม|ก๊อป|copy|template)/i],
    keywords: ['แบบฟอร์ม', 'ก๊อป', 'template'],
    response:
      '📌 อยากก๊อป-แก้-ส่ง ให้พิมพ์คำว่า "แบบฟอร์ม"\n' +
      'ระบบจะส่งบล็อกที่แก้ไขแล้วส่งกลับได้ทันที',
    quickReplies: QR.TEMPLATE,
  },
  {
    id: 'howto_item_format',
    category: FaqCategory.HOWTO,
    patterns: [/(เพิ่มรายการยังไง|พิมพ์รายการยังไง|ใส่รายการยังไง|รูปแบบรายการ|จำนวนก่อนราคา)/i],
    keywords: ['เพิ่มรายการยังไง', 'รูปแบบรายการ', 'จำนวนก่อนราคา'],
    response:
      '📌 รูปแบบรายการที่แนะนำ:\n' +
      'อาหารแมว 3000\n' +
      'อาหารแมว 2 x 1500\n' +
      'ค่าขนส่ง 1 300',
    quickReplies: [
      { label: '➕ เพิ่มรายการ', text: CMD_ADD_ITEM },
      { label: '📱 เมนู', text: CMD_MENU },
    ],
  },
  {
    id: 'howto_edit_items',
    category: FaqCategory.HOWTO,
    patterns: [/(แก้ไขรายการ|แก้รายการ|ลบรายการ|ลบล่าสุด|ย้อนกลับรายการ|undo)/i],
    keywords: ['แก้ไขรายการ', 'ลบรายการ', 'ย้อนกลับ'],
    response:
      '📌 ถ้าจะปรับรายการ:\n' +
      'แก้ไข → พิมพ์รายการใหม่แทนได้เลย\n' +
      'ลบล่าสุด → พิมพ์ "ลบ"\n' +
      'ย้อนกลับ → พิมพ์ "ย้อนกลับ"',
    quickReplies: [
      { label: '✏️ แก้ไขรายการ', text: CMD_EDIT_ITEM },
      { label: '🗑 ลบรายการ', text: CMD_REMOVE_ITEM },
      { label: '↩️ ย้อนกลับ', text: CMD_UNDO },
    ],
  },
  {
    id: 'account_link',
    category: FaqCategory.ACCOUNT,
    patterns: [/(เชื่อมต่อ(ยังไง|บัญชี|บัญชียังไง))/i],
    keywords: ['เชื่อมต่อ', 'เชื่อมต่อบัญชี'],
    response:
      '🔗 ถ้ายังไม่เชื่อมต่อ ให้พิมพ์ "เชื่อมต่อ" แล้วทำตามขั้นตอนเข้าสู่ระบบ\n\n' +
      '📌 หลังเชื่อมต่อจะเก็บเอกสารและรายงานไว้ครบ',
    quickReplies: QR.CONNECT,
  },
  {
    id: 'account_package_status',
    category: FaqCategory.ACCOUNT,
    patterns: [/(สถานะแพ็ค|เช็คแพ็ค|ดูแพ็ค|ต่ออายุ|หมดอายุ|ยกเลิกแพ็ค|แพ็กหมด)/i],
    keywords: ['สถานะแพ็ค', 'เช็คแพ็ค', 'ดูแพ็ค', 'ต่ออายุ', 'หมดอายุ'],
    response:
      '📌 ดูแพ็กและรอบต่ออายุได้ด้วยคำสั่ง "สถานะแพ็ค"\n' +
      'ถ้าต้องการอัปเกรด สามารถซื้อแพ็กใหม่ได้เลย',
    quickReplies: QR.PACKAGE_STATUS,
  },
  {
    id: 'reports_range',
    category: FaqCategory.DOCUMENTS,
    patterns: [/(รายงานเดือนนี้|รายงานเดือนก่อน|รายงานรายเดือน|ยอดขายเดือน)/i],
    keywords: ['รายงานเดือนนี้', 'รายงานเดือนก่อน', 'ยอดขายเดือน'],
    response:
      '📌 ดูรายงานรายเดือนได้จากคำสั่ง:\n' +
      'รายงาน เดือนนี้ / รายงาน เดือนก่อน',
    quickReplies: QR.REPORTS_RANGE,
  },
  {
    id: 'trouble_not_working',
    category: FaqCategory.TROUBLESHOOTING,
    patterns: [/(ไม่ได้|ทำไม่ได้|ไม่ทำงาน|ไม่เวิร์ค|ไม่ work)/i],
    keywords: ['ทำไม่ได้', 'ไม่ทำงาน', 'ไม่เวิร์ค', 'ไม่ได้'],
    response:
      '🔧 รับทราบปัญหาแล้วนะครับ\n\n' +
      'ลองพิมพ์ใหม่แบบสั้น ๆ หรือกลับเมนูก่อน แล้วค่อยเริ่มใหม่',
    quickReplies: QR.TROUBLE,
  },
  {
    id: 'trouble_payment_pending',
    category: FaqCategory.TROUBLESHOOTING,
    patterns: [/(เช็คสลิป|ตรวจสลิป|สลิปไม่ผ่าน|สลิปค้าง|โอนแล้ว|จ่ายแล้วแต่|เครดิตไม่เข้า)/i],
    keywords: ['เช็คสลิป', 'สลิปค้าง', 'เครดิตไม่เข้า', 'โอนแล้ว'],
    response:
      '📌 ถ้าโอนแล้วแต่ยังไม่อัปเดต ให้พิมพ์ "เช็คสลิป"\n' +
      'ด๊อกๆ จะสรุปสถานะล่าสุดให้เจ้านายทันที',
    quickReplies: QR.SLIP,
  },
  {
    id: 'trouble_pdf_missing',
    category: FaqCategory.TROUBLESHOOTING,
    patterns: [/(เอกสารไม่ออก|PDF ไม่มา|ไม่ได้เอกสาร|ขอ pdf)/i],
    keywords: ['pdf ไม่มา', 'เอกสารไม่ออก', 'ไม่ได้เอกสาร', 'ขอ pdf'],
    response:
      '📤 ถ้า PDF ยังไม่มา ให้ลองขอใหม่ได้ครับ\n\n' +
      'โดยปกติเอกสารจะมาในไม่กี่วินาที',
    quickReplies: QR.PDF,
  },
  {
    id: 'trouble_pdf_link',
    category: FaqCategory.TROUBLESHOOTING,
    patterns: [/(ลิงก์ pdf|ลิงก์ยาว|ลิ้งค์ยาว|ส่งลิงก์)/i],
    keywords: ['ลิงก์ pdf', 'ลิงก์ยาว', 'ลิ้งค์ยาว'],
    response:
      '📌 ลิงก์ PDF เป็นแบบชั่วคราวเพื่อความปลอดภัย\n' +
      'ถ้าลิงก์หาย ให้พิมพ์ "ส่งเอกสารอีกครั้ง"',
    quickReplies: QR.PDF,
  },
  {
    id: 'greet_hi',
    category: FaqCategory.GREETING,
    patterns: [/(สวัสดี|หวัดดี|hello|hi)\b/i],
    keywords: ['สวัสดี', 'หวัดดี', 'hello', 'hi'],
    response:
      'บี๊บ! ด๊อกๆ สวัสดีเจ้านายครับ 🤖\n\n' +
      'ด๊อกๆ พร้อมช่วยออกเอกสารให้ไว ๆ ใน 3 ขั้นตอน:\n' +
      '1) ตั้งค่าธุรกิจ\n2) เลือกเอกสาร\n3) ได้ PDF ทันที',
    quickReplies: QR.START,
  },
  {
    id: 'greet_thanks',
    category: FaqCategory.GREETING,
    patterns: [/(ขอบคุณ|ขอบใจ|thanks|thank)/i],
    keywords: ['ขอบคุณ', 'ขอบใจ', 'thanks', 'thank'],
    response:
      'ยินดีบริการครับ 😊\n\n' +
      'ถ้ามีอะไรให้ช่วยอีก พิมพ์มาได้เลย',
    quickReplies: QR.END,
  },
  {
    id: 'howto_multiple_items',
    category: FaqCategory.HOWTO,
    patterns: [/(หลายรายการ|สินค้าหลายอย่าง|เพิ่มหลายชิ้น)/i],
    keywords: ['หลายรายการ', 'สินค้าหลายอย่าง', 'หลายชิ้น'],
    response:
      'เพิ่มหลายรายการได้แบบนี้ครับ\n\n' +
      'อาหารแมว 1000\nค่าขนส่ง 300\nค่าแรง 2 x 1500',
    quickReplies: QR.PRODUCTS,
  },
  {
    id: 'docs_history',
    category: FaqCategory.DOCUMENTS,
    patterns: [/(ดูเอกสารเก่า|เอกสารที่แล้ว|ประวัติเอกสาร)/i],
    keywords: ['เอกสารเก่า', 'ประวัติ', 'ที่แล้ว'],
    response:
      'ดูเอกสารเก่าได้จากรายงานหรือเอกสารล่าสุดครับ',
    quickReplies: QR.REPORTS,
  },
  {
    id: 'howto_discount',
    category: FaqCategory.HOWTO,
    patterns: [/(ลดราคา|ส่วนลด|discount|โปรโมชั่น)/i],
    keywords: ['ลดราคา', 'ส่วนลด', 'discount', 'โปรโมชั่น'],
    response:
      'เพิ่มส่วนลดได้ด้วยคำสั่งนี้\n\n' +
      'ส่วนลด 5%\nลดราคา 200',
    quickReplies: [
      { label: '💰 ส่วนลด', text: 'ส่วนลด' },
      { label: '📝 ออกเอกสาร', text: 'ออกเอกสาร' },
      { label: '📱 เมนู', text: CMD_MENU },
    ],
  },
  {
    id: 'trouble_connection',
    category: FaqCategory.TROUBLESHOOTING,
    patterns: [/(อินเตอร์เน็ต|เน็ต|connection|ต่อไม่ติด)/i],
    keywords: ['อินเตอร์เน็ต', 'เน็ต', 'connection', 'ต่อไม่ติด'],
    response:
      'ดูเหมือนสัญญาณไม่เสถียรนะครับ\n\n' +
      'ลองเช็กเน็ตแล้วพิมพ์ใหม่อีกครั้ง',
    quickReplies: [
      { label: '🔁 ลองใหม่', text: 'ลองใหม่' },
      { label: '📱 เมนู', text: CMD_MENU },
      { label: '👨‍💼 ติดต่อแอดมิน', text: 'ติดต่อแอดมิน' },
    ],
  },
  {
    id: 'greet_morning',
    category: FaqCategory.GREETING,
    patterns: [/(อรุณสวัสดิ์|เช้าดี|good morning)/i],
    keywords: ['อรุณสวัสดิ์', 'เช้าดี', 'good morning'],
    response:
      '🌅 อรุณสวัสดิ์ครับ! วันนี้จะออกเอกสารอะไรดี',
    quickReplies: QR.START,
  },
  {
    id: 'greet_evening',
    category: FaqCategory.GREETING,
    patterns: [/(สวัสดีตอนเย็น|เย็นดี|good evening)/i],
    keywords: ['ตอนเย็น', 'เย็นดี', 'good evening'],
    response:
      '🌇 สวัสดีตอนเย็นครับ! ยังช่วยออกเอกสารได้เหมือนเดิม',
    quickReplies: QR.END,
  },
];

export function getFaqResponse(
  input: string
): {
  message: string;
  quickReplies?: QuickReplyAction[];
  structuredMessages?: Array<Record<string, unknown>>;
} | null {
  const normalized = normalizeText(input);
  if (!normalized) return null;

  if (isPackagePricingQuestion(input)) {
    return {
      message: buildPackagePricingMessage(),
      quickReplies: buildQuickReplies(QR.PRICING),
    };
  }

  if (isSubscriptionPaymentHelpQuestion(input)) {
    return {
      message: buildSubscriptionPaymentHelpMessage(),
      quickReplies: buildQuickReplies(QR.PRICING),
    };
  }

  let matched: FaqEntry | null = null;
  for (const entry of FAQ_ENTRIES) {
    if (entry.patterns.some((pattern) => pattern.test(input))) {
      matched = entry;
      break;
    }
    if (entry.keywords.some((kw) => normalized.includes(kw.toLowerCase()))) {
      matched = entry;
      break;
    }
  }

  if (!matched) return null;

  const quickReplies = buildQuickReplies(matched.quickReplies);
  const suffix = formatNextSteps();
  const message = suffix ? `${matched.response}\n\n${suffix}` : matched.response;
  const structuredMessages = matched.structuredMessages?.(quickReplies);
  return { message, quickReplies, structuredMessages };
}
