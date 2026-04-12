/**
 * 💎 Gemma Discord Bot — Configuration v2
 */

const DEFAULT_LLM_PROVIDER = 'gemini';
const DEFAULT_GEMINI_MODEL = 'gemini-3-pro-preview';
const DEFAULT_GEMINI_FALLBACK_MODEL = 'gemini-2.5-pro';
const DEFAULT_LLM_TIMEOUT_MS = 120000;
const DEFAULT_MAX_OUTPUT_TOKENS = Number(process.env.GEMINI_MAX_OUTPUT_TOKENS || 2048);

const GEMINI_MODEL_ALIASES = new Map([
  ['gemini-3.1-pro', 'gemini-3-pro-preview'],
  ['gemini-3.1-pro-preview', 'gemini-3-pro-preview'],
  ['gemini-3-pro', 'gemini-3-pro-preview'],
  ['gemini-3.1-flash', 'gemini-3-flash-preview'],
  ['gemini-3.1-flash-preview', 'gemini-3-flash-preview'],
  ['gemini-3-flash', 'gemini-3-flash-preview'],
]);

function normalizeModelAlias(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, '-');
}

export function resolveGeminiModelName(value, fallback = '') {
  const raw = String(value || fallback || '').trim();
  if (!raw) return '';
  return GEMINI_MODEL_ALIASES.get(normalizeModelAlias(raw)) || raw;
}

export const config = {
  // ─── LLM ──────────────────────────────────────
  llm: {
    provider: process.env.LLM_PROVIDER || DEFAULT_LLM_PROVIDER,
    model: resolveGeminiModelName(process.env.GEMINI_MODEL, DEFAULT_GEMINI_MODEL),
    fallbackModel: resolveGeminiModelName(process.env.GEMINI_FALLBACK_MODEL, DEFAULT_GEMINI_FALLBACK_MODEL),
    apiKeys: [
      process.env.GEMINI_API_KEY,
      process.env.GEMINI_API_KEY_BACKUP,
    ].filter(Boolean),
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: DEFAULT_MAX_OUTPUT_TOKENS,
      topP: 0.9,
    },
    timeoutMs: Number(process.env.GEMINI_TIMEOUT_MS || process.env.LLM_TIMEOUT_MS || DEFAULT_LLM_TIMEOUT_MS),
  },

  // ─── Discord ──────────────────────────────────
  discord: {
    token: process.env.DISCORD_BOT_TOKEN,
    appId: '1490704996189208718',

    // Server configs — per-guild behavior
    guilds: {
      '1485316770821836810': {
        name: 'ตารางงาน+ชีวิต Bevers',
        mode: 'personal-assistant',
        freeChat: true,  // ตอบทุกข้อความ ไม่ต้อง mention
        personality: 'เลขาส่วนตัว จัดตาราง เตือนนัด สรุปงาน',
      },
      '1488142264260624554': {
        name: 'ขายของ',
        mode: 'sales-assistant',
        freeChat: false,
        personality: 'ผู้เชี่ยวชาญ affiliate marketing, คิด content ขายของ, วิเคราะห์ตลาด',
      },
      '1489332588668649532': {
        name: 'VANAVARD interior',
        mode: 'interior-expert',
        freeChat: false,
        personality: 'ผู้เชี่ยวชาญ interior design, ประมาณราคา, แนะนำวัสดุ, ช่วยทำ mood board',
      },
      '1484982540925407455': {
        name: 'EzBOQ Dev',
        mode: 'dev-assistant',
        freeChat: false,
        personality: 'ผู้ช่วย dev team, ตอบคำถามเทคนิค, ช่วยคิด feature',
      },
      '1487317250930118767': {
        name: 'Wendy',
        mode: 'pet-content',
        freeChat: false,
        personality: 'ช่วยคิด content สัตว์เลี้ยง, caption น่ารัก, hashtag',
      },
      '1488474195414483104': {
        name: 'Va Interior',
        mode: 'interior-expert',
        freeChat: false,
        personality: 'ผู้เชี่ยวชาญออกแบบภายใน Vanavard',
      },
    },

    // Admin IDs — full control over Gemma
    admins: [
      '1006453735691653120',  // beaver (boss)
      '1264535525638017058',  // snowy1991 (boss ฝน)
      '1488810794564190288',  // oblueo (boss บลู)
    ],

    // Supervisor — ม้าน้ำ can upgrade/edit Gemma
    supervisor: {
      botId: '1484846328805851227',  // ม้าน้ำ (Claude)
      name: 'ม้าน้ำ',
      role: 'Lead Dev & Supervisor',
    },

    // DM channels — ตอบแชทส่วนตัว
    dmChannels: {
      '1490709043826790490': {
        name: 'Boss DM',
        mode: 'personal-assistant',
        freeChat: true,
      },
    },

    // Team bots
    teamBots: {
      claude:  '1484846328805851227',
      gemini:  '1484999407660437644',
      gpt:     '1484998870944452808',
      gemma:   '1490704996189208718',
    },
  },

  // ─── Behavior ─────────────────────────────────
  behavior: {
    maxResponseLen: 1900,
    maxHistoryPerChannel: 10,
    typingIntervalMs: 5000,
    respondToDM: true,
    respondToMention: true,
    respondToKeywords: ['gemma', 'เจมม่า', 'จีม่า', 'gem'],
    cooldownMs: 2000,
    // Auto-react to messages with certain keywords
    autoReactions: {
      'ขอบคุณ': '💎',
      'สวัสดี': '👋',
      'เก่ง': '✨',
    },
  },

  // ─── EzBOQ ────────────────────────────────────
  ezboq: {
    url: 'https://ezboq.com',
    firebaseProject: 'ezdoc-v1-th',
    functionsRegion: 'asia-southeast1',
    promptpayId: '0933299990',
    plans: {
      free: { name: 'Free', price: 0, maxUsers: 1, limit: '10 ใบ/เดือน' },
      solo: { name: 'Pro', price: 99, maxUsers: 1, limit: 'ไม่จำกัด' },
      team: { name: 'Business', price: 279, maxUsers: 3, limit: 'ไม่จำกัด' },
    },
  },
};
