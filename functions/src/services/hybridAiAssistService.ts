import {
  ParsedActionType,
  type ParsedAction,
  type ParsingContext,
} from '../core/forgivingParser';
import { runGemmaGateway } from './gemmaGateway';

export type HybridIntent =
  | 'NONE'
  | 'GREETING'
  | 'MENU'
  | 'HELP_GUIDE'
  | 'DOC_EXAMPLES'
  | 'WELCOME_REPLAY'
  | 'BUSINESS_SETUP_FORM'
  | 'THEME_HELP'
  | 'LINK_ACCOUNT'
  | 'PACKAGE_STATUS'
  | 'UPGRADE_PRO'
  | 'UPGRADE_TEAM'
  | 'PAYMENT_HELP'
  | 'PAYMENT_CLAIM'
  | 'LATEST_DOC'
  | 'TEAM_INVITE'
  | 'CREATE_QUOTATION'
  | 'CREATE_INVOICE'
  | 'CREATE_RECEIPT';

export interface HybridIntentResult {
  intent: HybridIntent;
  confidence: number;
  canonicalText?: string;
  source: 'heuristic' | 'ai' | 'none';
}

export interface DraftActionResult {
  actions: ParsedAction[];
  confidence: number;
  source: 'ai' | 'none';
}

type IntentMode = 'first_turn' | 'general' | 'draft';

const CANONICAL_TEXT_BY_INTENT: Partial<Record<HybridIntent, string>> = {
  MENU: 'เมนู',
  HELP_GUIDE: 'วิธีใช้งาน',
  DOC_EXAMPLES: 'ตัวอย่างเอกสาร',
  WELCOME_REPLAY: 'ส่งwelcome cardมาอีกรอบ',
  BUSINESS_SETUP_FORM: 'ตั้งค่าธุรกิจแบบฟอร์ม',
  THEME_HELP: 'ตั้งค่าธีม',
  LINK_ACCOUNT: 'เชื่อมต่อ',
  PACKAGE_STATUS: 'สถานะแพ็ค',
  UPGRADE_PRO: 'ซื้อแพ็ค 99',
  UPGRADE_TEAM: 'ซื้อแพ็ค 279',
  PAYMENT_HELP: 'จ่ายเงินยังไง',
  PAYMENT_CLAIM: 'จ่ายเงินไปแล้วทำไมยังฟรี',
  LATEST_DOC: 'เอกสารล่าสุด',
  TEAM_INVITE: 'เชิญทีม',
  CREATE_QUOTATION: 'ทำใบเสนอราคา',
  CREATE_INVOICE: 'ทำใบวางบิล',
  CREATE_RECEIPT: 'ทำใบเสร็จ',
};

function sanitizeIntentText(text: string): string {
  return text.trim().replace(/\s+/g, ' ');
}

function normalizeIntent(intent: unknown): HybridIntent {
  const value = String(intent || '').trim().toUpperCase();
  const allowed = new Set<HybridIntent>([
    'NONE',
    'GREETING',
    'MENU',
    'HELP_GUIDE',
    'DOC_EXAMPLES',
    'WELCOME_REPLAY',
    'BUSINESS_SETUP_FORM',
    'THEME_HELP',
    'LINK_ACCOUNT',
    'PACKAGE_STATUS',
    'UPGRADE_PRO',
    'UPGRADE_TEAM',
    'PAYMENT_HELP',
    'PAYMENT_CLAIM',
    'LATEST_DOC',
    'TEAM_INVITE',
    'CREATE_QUOTATION',
    'CREATE_INVOICE',
    'CREATE_RECEIPT',
  ]);

  return allowed.has(value as HybridIntent) ? (value as HybridIntent) : 'NONE';
}

function normalizeConfidence(value: unknown, fallback = 0): number {
  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(num)) return fallback;
  if (num < 0) return 0;
  if (num > 1) return 1;
  return num;
}

function detectIntentHeuristically(input: string): HybridIntentResult | null {
  const text = sanitizeIntentText(input);
  const normalized = text.toLowerCase();

  if (!text) return null;

  const rules: Array<{ pattern: RegExp; intent: HybridIntent; confidence?: number }> = [
    {
      pattern: /(?:ขอ|ส่ง|เอา|โชว์|เปิด|ส่งให้|ส่งมา).*(?:welcome(?:\s*card)?|การ์ด(?:ต้อนรับ|เริ่มต้น)?|welcome card)|(?:welcome(?:\s*card)?|การ์ด(?:ต้อนรับ|เริ่มต้น)?).*(?:อีกครั้ง|อีกรอบ|ใหม่|ซ้ำ)/i,
      intent: 'WELCOME_REPLAY',
      confidence: 0.98,
    },
    {
      pattern: /(?:อยาก|ขอ|ดู|เปิด|ส่ง).*(?:ตัวอย่าง|sample|template|เทมเพลต|pdf).*(?:เอกสาร|ใบเสนอราคา|ใบวางบิล|ใบเสร็จ)?|(?:ตัวอย่าง(?:เอกสาร|pdf|ใบเสนอราคา|ใบวางบิล|ใบเสร็จ))/i,
      intent: 'DOC_EXAMPLES',
      confidence: 0.97,
    },
    {
      pattern: /(?:ช่วยสอน|สอนใช้|สอนหน่อย|ขอวิธีใช้|วิธีใช้|ใช้ยังไง|ใช้งานยังไง|เริ่มยังไง|เริ่มต้นยังไง|ช่วยแนะนำหน่อย|มือใหม่)/i,
      intent: 'HELP_GUIDE',
      confidence: 0.96,
    },
    {
      pattern: /(?:ขอ|เปิด|เอา|ดู)?\s*(?:เมนู|menu)(?:\s*(?:หน่อย|ใหม่|หลัก|ให้หน่อย|อีกรอบ))?$/i,
      intent: 'MENU',
      confidence: 0.95,
    },
    {
      pattern: /(?:ตั้งค่า|แก้|กรอก).*(?:ธุรกิจ|โลโก้|ที่อยู่|ภาษี|เลขภาษี|ธนาคาร|พร้อมเพย์|promptpay|อีเมล|email|โทร|เบอร์)|(?:ตั้งค่าธุรกิจแบบฟอร์ม|business setup)/i,
      intent: 'BUSINESS_SETUP_FORM',
      confidence: 0.95,
    },
    {
      pattern: /(?:เปลี่ยน|ตั้งค่า|เลือก).*(?:ธีม|theme|สีเอกสาร|ขาวดำ)|(?:ธีม|theme).*(?:ยังไง|อย่างไร|ไง|คืออะไร|ทำไง)|(?:ตั้งค่าธีม|เปลี่ยนธีม)/i,
      intent: 'THEME_HELP',
      confidence: 0.95,
    },
    {
      pattern: /(?:เชื่อม(?:ต่อ)?|ล็อก(?:อิน)?|login|sign in|เข้าสู่ระบบ).*(?:บัญชี|line|google)?/i,
      intent: 'LINK_ACCOUNT',
      confidence: 0.93,
    },
    {
      pattern: /(?:สถานะ|เช็ค|ดู).*(?:แพ็ก|แพ็ค|แพค|แพลน|plan)|(?:แพ็ก|แพ็ค|แพค|แพลน).*(?:อะไร|ไหน|ยังไง)|(?:ฉัน|ผม|เรา)?.*(?:เหลือ|ใช้ฟรีไป|ใช้ฟรีได้|เหลือฟรี).*(?:กี่|เท่าไหร่|อีกกี่).*(?:ใบ|ฉบับ)|(?:เหลือกี่(?:ใบ|ฉบับ)|ใช้ฟรีไปเท่าไหร่|ไม่จำกัดไหม|ยังออกได้ไหม)/i,
      intent: 'PACKAGE_STATUS',
      confidence: 0.94,
    },
    {
      pattern: /(?:ซื้อ|สมัคร|อัปเกรด|upgrade|ต่ออายุ).*(?:99|pro|โปร)|(?:pro|โปร).*(?:ยังไง|สมัคร|ซื้อ|อัปเกรด|ต่ออายุ|แพ็ก)/i,
      intent: 'UPGRADE_PRO',
      confidence: 0.92,
    },
    {
      pattern: /(?:เชิญทีม|ชวนทีม|invite\s*team|เพิ่ม(?:สมาชิก|คน)ในทีม|ทีมยังไง|เข้าทีมยังไง)/i,
      intent: 'TEAM_INVITE',
      confidence: 0.92,
    },
    {
      pattern: /(?:ซื้อ|สมัคร|อัปเกรด|upgrade|ต่ออายุ|อยากได้|ขอ).*(?:279|team|ทีม|แพ็กทีม)|(?:team|ทีม|แพ็กทีม).*(?:ยังไง|สมัคร|ซื้อ|อัปเกรด|ต่ออายุ|แพ็ก|หน่อย)/i,
      intent: 'UPGRADE_TEAM',
      confidence: 0.92,
    },
    {
      pattern: /(?:จ่าย|ชำระ|โอน).*(?:ยังไง|อย่างไร|ทางไหน|แบบไหน)|(?:ส่ง|แนบ).*(?:สลิป).*(?:ยังไง|อย่างไร)?/i,
      intent: 'PAYMENT_HELP',
      confidence: 0.9,
    },
    {
      pattern: /(?:(?:จ่าย|โอน|ชำระ).*(?:แล้ว).*(?:ยังไม่|ไม่ขึ้น|ทำไม|แต่|อยู่ฟรี)|(?:ซื้อ|สมัคร).*(?:แล้ว).*(?:ยังไม่|ไม่ขึ้น|ทำไม|แต่|อยู่ฟรี)|ทำไม.*(?:ฟรี|free|ไม่ขึ้น|ไม่อัพเกรด)|(?:อ้าว|เอ๊ะ).*(?:จ่าย|โอน|สมัคร))/i,
      intent: 'PAYMENT_CLAIM',
      confidence: 0.95,
    },
    {
      pattern: /(?:เปิด|ดู|ขอ|ส่ง).*(?:เอกสารล่าสุด|ล่าสุด)|(?:latest\s*doc|latest\s*document)/i,
      intent: 'LATEST_DOC',
      confidence: 0.94,
    },
    {
      pattern: /(?:ขอ|ช่วย|ฝาก|อยาก|จะ)?\s*(?:ทำ|สร้าง|ออก)?\s*(?:ใบเสนอราคา|quotation|เสนอราคา)/i,
      intent: 'CREATE_QUOTATION',
      confidence: 0.9,
    },
    {
      pattern: /(?:ขอ|ช่วย|ฝาก|อยาก|จะ)?\s*(?:ทำ|สร้าง|ออก)?\s*(?:ใบวางบิล|invoice|ใบแจ้งหนี้|วางบิล|บิล)(?:.*)?$|^(?:invoice|บิล)$/i,
      intent: 'CREATE_INVOICE',
      confidence: 0.9,
    },
    {
      pattern: /(?:ขอ|ช่วย|ฝาก|อยาก|จะ)?\s*(?:ทำ|สร้าง|ออก)?\s*(?:ใบเสร็จ|receipt|ใบเสร็จรับเงิน)/i,
      intent: 'CREATE_RECEIPT',
      confidence: 0.9,
    },
    {
      pattern: /(?:^|\s)(?:สวัสดี|หวัดดี|hello|hi|hey|โย่ว?|ฮัลโหล|ดีครับ|ดีค่ะ)(?:$|\s)/i,
      intent: 'GREETING',
      confidence: normalized.length <= 40 ? 0.88 : 0.76,
    },
  ];

  for (const rule of rules) {
    if (rule.pattern.test(text)) {
      return {
        intent: rule.intent,
        confidence: rule.confidence || 0.9,
        canonicalText: CANONICAL_TEXT_BY_INTENT[rule.intent],
        source: 'heuristic',
      };
    }
  }

  return null;
}

function shouldUseAiIntentClassifier(text: string, mode: IntentMode): boolean {
  const trimmed = sanitizeIntentText(text);
  if (!trimmed) return false;
  if (trimmed.length < 4 || trimmed.length > 240) return false;
  if (/\n{2,}/.test(trimmed)) return false;
  if (/https?:\/\//i.test(trimmed)) return false;
  if (mode === 'draft' && /^[\d\s.,฿บาท]+$/i.test(trimmed)) return false;
  return true;
}

async function classifyIntentWithAI(text: string, mode: IntentMode): Promise<HybridIntentResult | null> {
  if (!shouldUseAiIntentClassifier(text, mode)) {
    return null;
  }

  try {
    const response = await runGemmaGateway({
      task: 'intent_classification',
      channel: 'internal',
      actor: {},
      input: {
        text,
        meta: { mode },
      },
      output: { format: 'json' },
      trace: { source: 'hybridAiAssistService' },
    });

    const parsed = response.output.json as Record<string, unknown> | undefined;
    if (!parsed) return null;

    const intent = normalizeIntent(parsed.intent);
    const confidence = normalizeConfidence(parsed.confidence, 0);
    if (intent === 'NONE' || confidence < 0.76) {
      return null;
    }

    return {
      intent,
      confidence,
      canonicalText: CANONICAL_TEXT_BY_INTENT[intent],
      source: 'ai',
    };
  } catch (error) {
    console.warn('[hybridAiAssist] classifyIntentWithAI failed:', error);
    return null;
  }
}

export async function classifyConversationalIntent(
  input: string,
  options: {
    mode?: IntentMode;
  } = {},
): Promise<HybridIntentResult> {
  const mode = options.mode || 'general';
  const heuristic = detectIntentHeuristically(input);
  if (heuristic) {
    return heuristic;
  }

  const ai = await classifyIntentWithAI(input, mode);
  if (ai) {
    return ai;
  }

  return {
    intent: 'NONE',
    confidence: 0,
    source: 'none',
  };
}

function shouldUseAiDraftExtraction(input: string, context: ParsingContext): boolean {
  const text = input.trim();
  if (!text) return false;
  if (text.length < 6 || text.length > 800) return false;
  if (/https?:\/\//i.test(text)) return false;
  if (!context.hasActiveDraft && !/(ใบเสนอราคา|ใบวางบิล|ใบเสร็จ|quotation|invoice|receipt)/i.test(text)) {
    return false;
  }
  return true;
}

function parseNumericValue(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return value;
  }

  const raw = String(value || '').replace(/[,\s฿บาท]/gi, '').trim();
  if (!raw) return null;
  const num = Number(raw);
  if (!Number.isFinite(num) || num <= 0) return null;
  return num;
}

function buildParsedActionsFromAiPayload(payload: Record<string, unknown>): DraftActionResult {
  const actions: ParsedAction[] = [];

  const customerName = String(payload.customer_name || '').trim();
  if (customerName) {
    actions.push({
      type: ParsedActionType.SET_CUSTOMER_NAME,
      confidence: 0.84,
      payload: { customerName },
    });
  }

  const rawItems = Array.isArray(payload.items) ? payload.items : [];
  for (const rawItem of rawItems.slice(0, 10)) {
    const item = rawItem as Record<string, unknown>;
    const name = String(item?.name || '').trim();
    const price = parseNumericValue(item?.price);
    const qty = parseNumericValue(item?.qty) || 1;

    if (!name || !price) continue;

    actions.push({
      type: ParsedActionType.ADD_ITEM,
      confidence: 0.82,
      payload: {
        item: {
          name,
          qty,
          price,
        },
      },
    });
  }

  const confidence = normalizeConfidence(payload.confidence, actions.length > 0 ? 0.8 : 0);

  return {
    actions,
    confidence,
    source: actions.length > 0 ? 'ai' : 'none',
  };
}

export async function extractDraftActionsWithAI(
  input: string,
  context: ParsingContext,
): Promise<DraftActionResult> {
  if (!shouldUseAiDraftExtraction(input, context)) {
    return { actions: [], confidence: 0, source: 'none' };
  }

  try {
    const response = await runGemmaGateway({
      task: 'draft_extraction',
      channel: 'internal',
      actor: {},
      input: {
        text: input,
        meta: {
          has_active_draft: context.hasActiveDraft,
          has_customer: context.hasCustomer,
          has_items: context.hasItems,
          last_item_name: context.lastItemName || '',
        },
      },
      output: { format: 'json' },
      trace: { source: 'hybridAiAssistService' },
    });

    const parsed = response.output.json as Record<string, unknown> | undefined;
    if (!parsed) {
      return { actions: [], confidence: 0, source: 'none' };
    }

    const result = buildParsedActionsFromAiPayload(parsed);
    if (result.actions.length === 0 || result.confidence < 0.72) {
      return { actions: [], confidence: result.confidence, source: 'none' };
    }

    return result;
  } catch (error) {
    console.warn('[hybridAiAssist] extractDraftActionsWithAI failed:', error);
    return { actions: [], confidence: 0, source: 'none' };
  }
}
