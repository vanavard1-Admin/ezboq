/**
 * Real Skills — อัปเกรด mock skills ให้ทำงานจริง
 *
 * Skills ที่ต้องการ AI generation (แปลภาษา, เขียนข้อความ, อธิบาย, แนะนำ, วางแผนเที่ยว)
 * จะเรียก Claude Haiku ภายใน skill เพื่อความเร็วและประหยัด
 *
 * Integration:
 * ```
 * import { realSkills, realSkillNames } from "./realSkills";
 * const upgraded = allSkills.map(s =>
 *   realSkillNames.has(s.name) ? realSkills.find(r => r.name === s.name)! : s
 * );
 * ```
 */
import Anthropic from "@anthropic-ai/sdk";
import type { JarvisSkill } from "./types";

// ============ Shared Helpers ============

let _client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!_client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");
    _client = new Anthropic({ apiKey });
  }
  return _client;
}

async function quickAI(prompt: string, maxTokens = 512): Promise<string> {
  try {
    const res = await getClient().messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    });
    const block = res.content.find((b) => b.type === "text");
    return block && block.type === "text" ? block.text : "";
  } catch (error) {
    console.error("[JARVIS:SKILL] AI error:", error);
    return "";
  }
}

// ============ 1. Translate (REAL) ============

export const realTranslateSkill: JarvisSkill = {
  name: "translate",
  description:
    "แปลภาษา — แปลข้อความเป็นภาษาอื่น เช่น อังกฤษ ญี่ปุ่น เกาหลี จีน ฝรั่งเศส",
  parameters: {
    text: { type: "string", description: "ข้อความที่ต้องการแปล", required: true },
    target_language: { type: "string", description: "ภาษาปลายทาง", required: true },
    context: { type: "string", description: "บริบท เช่น formal, casual, business", required: false },
  },
  execute: async (params) => {
    const text = params.text as string;
    const lang = params.target_language as string;
    const ctx = (params.context as string) || "general";

    const result = await quickAI(
      `แปลข้อความต่อไปนี้เป็นภาษา${lang} (บริบท: ${ctx}):\n\n"${text}"\n\nตอบเฉพาะคำแปล ไม่ต้องอธิบาย`,
      256,
    );

    if (!result) return { type: "text", text: "❌ แปลไม่สำเร็จ ลองใหม่ครับ" };

    return {
      type: "text",
      text: `🌐 **แปลเป็น${lang}**\n\n📝 ต้นฉบับ: ${text}\n✅ คำแปล: ${result}`,
      quickReplies: ["แปลเป็นอังกฤษ", "แปลเป็นญี่ปุ่น", "แปลเป็นเกาหลี"],
    };
  },
};

// ============ 2. Write Text (REAL) ============

export const realWriteTextSkill: JarvisSkill = {
  name: "write_text",
  description:
    "เขียนข้อความ — อีเมล แคปชั่น ข้อความลา รีวิว จดหมาย หรือข้อความอื่นๆ",
  parameters: {
    type: { type: "string", description: "ประเภทข้อความ", required: false, enum: ["email", "caption", "leave_request", "review", "letter", "message", "other"] },
    topic: { type: "string", description: "หัวข้อหรือเนื้อหาที่ต้องการ", required: true },
    tone: { type: "string", description: "โทนเสียง", required: false, enum: ["formal", "casual", "friendly", "professional"] },
    language: { type: "string", description: "ภาษา (default: ไทย)", required: false },
  },
  execute: async (params) => {
    const type = (params.type as string) || "message";
    const topic = params.topic as string;
    const tone = (params.tone as string) || "professional";
    const lang = (params.language as string) || "ไทย";

    const typeNames: Record<string, string> = {
      email: "อีเมล", caption: "แคปชั่น", leave_request: "ข้อความลา",
      review: "รีวิว", letter: "จดหมาย", message: "ข้อความ", other: "ข้อความ",
    };

    const result = await quickAI(
      `เขียน${typeNames[type]}ภาษา${lang} โทน${tone} เกี่ยวกับ: ${topic}\n\nเขียนให้ใช้ได้เลย ไม่ต้องอธิบาย ความยาวพอเหมาะ`,
      512,
    );

    if (!result) return { type: "text", text: "❌ เขียนไม่สำเร็จ ลองใหม่ครับ" };

    return {
      type: "text",
      text: `✍️ **${typeNames[type]}**\n\n${result}`,
      quickReplies: ["เขียนอีเมล", "เขียนแคปชั่น", "เขียนข้อความลา"],
    };
  },
};

// ============ 3. Explain (REAL) ============

export const realExplainSkill: JarvisSkill = {
  name: "explain",
  description: "อธิบาย สอน ให้ความรู้ — ตอบคำถามทั่วไป อธิบายแนวคิด สอนวิธีทำ",
  parameters: {
    topic: { type: "string", description: "หัวข้อที่ต้องการเรียนรู้", required: true },
    depth: { type: "string", description: "ระดับความลึก", required: false, enum: ["simple", "medium", "detailed"] },
    format: { type: "string", description: "รูปแบบ", required: false, enum: ["explain", "steps", "pros_cons", "comparison", "recipe"] },
  },
  execute: async (params) => {
    const topic = params.topic as string;
    const depth = (params.depth as string) || "medium";
    const format = (params.format as string) || "explain";

    const depthMap: Record<string, string> = {
      simple: "อธิบายง่ายๆ สั้นๆ", medium: "อธิบายพอเหมาะ", detailed: "อธิบายละเอียด มีตัวอย่าง",
    };
    const formatMap: Record<string, string> = {
      explain: "อธิบายเล่าเรื่อง", steps: "แบ่งเป็นขั้นตอน", pros_cons: "ข้อดี/ข้อเสีย",
      comparison: "เปรียบเทียบ", recipe: "ส่วนผสมและวิธีทำ",
    };

    const tokens = depth === "detailed" ? 800 : depth === "simple" ? 256 : 512;
    const result = await quickAI(
      `อธิบายเรื่อง "${topic}"\n${depthMap[depth]}\n${formatMap[format]}\nตอบเป็นภาษาไทย`,
      tokens,
    );

    if (!result) return { type: "text", text: "❌ ไม่สามารถอธิบายได้ ลองถามใหม่ครับ" };
    return { type: "text", text: `💡 **${topic}**\n\n${result}` };
  },
};

// ============ 4. Recommend (REAL) ============

export const realRecommendSkill: JarvisSkill = {
  name: "recommend",
  description: "แนะนำ — ร้านอาหาร หนัง เพลง ซีรีส์ เกม หนังสือ คาเฟ่ กิจกรรม",
  parameters: {
    category: { type: "string", description: "หมวดหมู่", required: true, enum: ["movie", "music", "restaurant", "book", "game", "series", "cafe", "activity", "other"] },
    query: { type: "string", description: "รายละเอียด ความชอบ", required: true },
    mood: { type: "string", description: "อารมณ์ เช่น สนุก เศร้า ตื่นเต้น", required: false },
  },
  execute: async (params) => {
    const category = params.category as string;
    const query = params.query as string;
    const mood = (params.mood as string) || "";

    const emoji: Record<string, string> = {
      movie: "🎬", music: "🎵", restaurant: "🍽️", book: "📚",
      game: "🎮", series: "📺", cafe: "☕", activity: "🎯", other: "✨",
    };

    const result = await quickAI(
      `แนะนำ${category} เกี่ยวกับ: ${query}${mood ? ` (mood: ${mood})` : ""}\n\nแนะนำ 3-5 อย่าง พร้อมเหตุผลสั้นๆ ภาษาไทย ใช้ emoji`,
      512,
    );

    if (!result) return { type: "text", text: "❌ แนะนำไม่ได้ ลองใหม่ครับ" };
    return { type: "text", text: `${emoji[category] || "✨"} **แนะนำ**\n\n${result}` };
  },
};

// ============ 5. Plan Trip (REAL) ============

export const realPlanTripSkill: JarvisSkill = {
  name: "plan_trip",
  description: "วางแผนเที่ยว จัดทริป — วางแผนการเดินทาง แนะนำที่เที่ยว ที่พัก ร้านอาหาร",
  parameters: {
    destination: { type: "string", description: "จุดหมายปลายทาง", required: true },
    duration: { type: "string", description: "ระยะเวลา เช่น 3 วัน 2 คืน", required: false },
    budget: { type: "string", description: "งบประมาณ", required: false },
    interests: { type: "string", description: "ความสนใจ", required: false },
    travel_style: { type: "string", description: "สไตล์ เช่น backpacker luxury family", required: false },
  },
  execute: async (params) => {
    const dest = params.destination as string;
    const duration = (params.duration as string) || "3 วัน 2 คืน";
    const budget = (params.budget as string) || "ไม่จำกัด";
    const interests = (params.interests as string) || "ทั่วไป";
    const style = (params.travel_style as string) || "ทั่วไป";

    const result = await quickAI(
      `วางแผนเที่ยว ${dest} ${duration} งบ ${budget} บาท สไตล์: ${style} สนใจ: ${interests}\n\nวางแผน day-by-day แต่ละวันมี เช้า/บ่าย/เย็น แนะนำที่เที่ยว ร้านอาหาร ประมาณค่าใช้จ่าย ภาษาไทย ใช้ emoji`,
      1024,
    );

    if (!result) return { type: "text", text: "❌ วางแผนเที่ยวไม่สำเร็จ ลองใหม่ครับ" };

    return {
      type: "text",
      text: `✈️ **แพลนเที่ยว ${dest}** (${duration})\n\n${result}`,
      quickReplies: ["หาตั๋วเครื่องบิน", "หาที่พัก", "แนะนำร้านอาหาร"],
    };
  },
};

// ============ 6. Daily Briefing (REAL) ============

export const realDailyBriefingSkill: JarvisSkill = {
  name: "daily_briefing",
  description: "สรุปเช้า daily brief — สรุปประจำวัน อัตราแลกเปลี่ยน",
  parameters: {
    include: { type: "string", description: "ข้อมูลที่ต้องการ", required: false, enum: ["all", "business", "exchange_rate"] },
  },
  execute: async () => {
    const now = new Date();
    const hour = now.getHours();
    const greeting = hour < 12 ? "สวัสดีตอนเช้า ☀️" : hour < 17 ? "สวัสดีตอนบ่าย 🌤️" : "สวัสดีตอนเย็น 🌅";

    const thaiMonths = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
    const thaiDays = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];
    const thaiYear = now.getFullYear() + 543;

    return {
      type: "text",
      text:
        `${greeting}\n\n` +
        `📅 วัน${thaiDays[now.getDay()]}ที่ ${now.getDate()} ${thaiMonths[now.getMonth()]} ${thaiYear}\n\n` +
        `💱 **อัตราแลกเปลี่ยน** (โดยประมาณ)\n` +
        `🇺🇸 USD ≈ ฿34.5 | 🇪🇺 EUR ≈ ฿37.5\n` +
        `🇯🇵 JPY ≈ ฿0.23 | 🇨🇳 CNY ≈ ฿4.8\n` +
        `🇬🇧 GBP ≈ ฿43.5 | 🇰🇷 KRW ≈ ฿0.025\n\n` +
        `📊 ดูสรุปธุรกิจ พิมพ์ "ยอดขายเดือนนี้"`,
      quickReplies: ["ยอดขายเดือนนี้", "ใบค้างชำระ", "เมนู"],
    };
  },
};

// ============ 7. Weather (REAL with AI) ============

export const realCheckWeatherSkill: JarvisSkill = {
  name: "check_weather",
  description: "เช็คอากาศ พยากรณ์อากาศ — ดูสภาพอากาศปัจจุบัน",
  parameters: {
    location: { type: "string", description: "สถานที่ เช่น กรุงเทพ เชียงใหม่ Tokyo", required: false },
    when: { type: "string", description: "เวลา เช่น วันนี้ พรุ่งนี้", required: false },
  },
  execute: async (params) => {
    const location = (params.location as string) || "กรุงเทพ";
    const when = (params.when as string) || "วันนี้";
    const encoded = encodeURIComponent(location);

    const info = await quickAI(
      `ให้ข้อมูลสภาพอากาศทั่วไปของ ${location} ในช่วง ${when}\nบอกอุณหภูมิโดยประมาณ สภาพอากาศ คำแนะนำแต่งตัว\nตอบสั้นๆ 2-3 ประโยค ภาษาไทย`,
      200,
    );

    return {
      type: "text",
      text:
        `🌤️ **อากาศ ${location}** (${when})\n\n` +
        `${info || "ไม่สามารถดึงข้อมูลอากาศได้"}\n\n` +
        `🔗 ดูเพิ่มเติม:\n` +
        `• weather.com: https://weather.com/weather/today/l/${encoded}\n` +
        `• windy.com: https://www.windy.com/?${encoded}`,
      quickReplies: ["อากาศพรุ่งนี้", "อากาศเชียงใหม่", "อากาศภูเก็ต"],
    };
  },
};

// ============ 8. Currency Exchange (Enhanced) ============

export const realCurrencyExchangeSkill: JarvisSkill = {
  name: "currency_exchange",
  description: "แปลงค่าเงิน อัตราแลกเปลี่ยน — คำนวณอัตราแลกเปลี่ยนเงินตรา",
  parameters: {
    amount: { type: "number", description: "จำนวนเงิน", required: true },
    from_currency: { type: "string", description: "สกุลเงินต้นทาง เช่น USD, JPY, THB", required: true },
    to_currency: { type: "string", description: "สกุลเงินปลายทาง (default: THB)", required: false },
  },
  execute: async (params) => {
    const amount = params.amount as number;
    const from = (params.from_currency as string).toUpperCase();
    const to = ((params.to_currency as string) || "THB").toUpperCase();

    // THB per 1 unit of foreign currency
    const rateToTHB: Record<string, number> = {
      THB: 1, USD: 34.5, EUR: 37.5, GBP: 43.5, JPY: 0.23,
      CNY: 4.8, KRW: 0.025, AUD: 22.5, SGD: 25.5, HKD: 4.4,
      TWD: 1.05, MYR: 7.5, IDR: 0.0022, PHP: 0.62, VND: 0.0014,
      INR: 0.41, CHF: 38.5, CAD: 25.0, NZD: 20.5, SEK: 3.3,
      DKK: 5.0, NOK: 3.2,
    };

    const fromRate = rateToTHB[from];
    const toRate = rateToTHB[to];

    if (!fromRate || !toRate) {
      const supported = Object.keys(rateToTHB).join(", ");
      return {
        type: "text",
        text: `❌ ไม่รองรับ ${from} → ${to}\n\nรองรับ: ${supported}\n🔗 https://www.xe.com/`,
      };
    }

    const inTHB = amount * fromRate;
    const result = inTHB / toRate;
    const rate = result / amount;

    const flags: Record<string, string> = {
      USD: "🇺🇸", EUR: "🇪🇺", GBP: "🇬🇧", JPY: "🇯🇵", CNY: "🇨🇳",
      KRW: "🇰🇷", AUD: "🇦🇺", SGD: "🇸🇬", HKD: "🇭🇰", TWD: "🇹🇼",
      THB: "🇹🇭", MYR: "🇲🇾", IDR: "🇮🇩", PHP: "🇵🇭", VND: "🇻🇳",
      INR: "🇮🇳", CHF: "🇨🇭", CAD: "🇨🇦", NZD: "🇳🇿",
    };

    const decimals = result > 100 ? 0 : result > 1 ? 2 : 4;

    return {
      type: "text",
      text:
        `💱 **แปลงค่าเงิน**\n\n` +
        `${flags[from] || ""} ${amount.toLocaleString()} ${from}\n` +
        `= ${flags[to] || ""} **${result.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })} ${to}**\n\n` +
        `📊 อัตรา: 1 ${from} ≈ ${rate.toFixed(4)} ${to}\n` +
        `⚠️ อัตราโดยประมาณ\n` +
        `🔗 อัตราจริง: xe.com | ธปท.`,
      quickReplies: ["100 USD กี่บาท", "10000 JPY กี่บาท", "1000 KRW กี่บาท"],
    };
  },
};

// ============ 9. Set Reminder (Honest) ============

export const realSetReminderSkill: JarvisSkill = {
  name: "set_reminder",
  description: "ตั้งเตือน เตือนความจำ — บันทึกสิ่งที่ต้องทำ",
  parameters: {
    message: { type: "string", description: "ข้อความเตือน", required: true },
    time: { type: "string", description: "เวลา เช่น 14:00, บ่าย 2", required: true },
    date: { type: "string", description: "วันที่ เช่น พรุ่งนี้, วันจันทร์", required: false },
  },
  execute: async (params) => {
    const message = params.message as string;
    const time = params.time as string;
    const date = (params.date as string) || "วันนี้";

    return {
      type: "text",
      text:
        `⏰ **บันทึกเตือน**\n\n` +
        `📝 ${message}\n` +
        `📅 ${date} เวลา ${time}\n\n` +
        `⚠️ ระบบแจ้งเตือน push กำลังพัฒนา\n` +
        `แนะนำใช้ LINE Remind คู่กันไปก่อนครับ:\n` +
        `พิมพ์ @remind ในแชท LINE ได้เลย`,
    };
  },
};

// ============ Export ============

export const realSkills: JarvisSkill[] = [
  realTranslateSkill,
  realWriteTextSkill,
  realExplainSkill,
  realRecommendSkill,
  realPlanTripSkill,
  realDailyBriefingSkill,
  realCheckWeatherSkill,
  realCurrencyExchangeSkill,
  realSetReminderSkill,
];

export const realSkillNames = new Set(realSkills.map((s) => s.name));
