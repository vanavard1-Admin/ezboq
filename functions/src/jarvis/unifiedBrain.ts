/**
 * Unified Brain — AI Brain ตัวเดียวที่จัดการทั้ง EzDoc และ Personal Assistant
 *
 * แทนที่ระบบ 2 โหมดแยก (Jarvis mode vs EzDoc mode)
 * ด้วย AI ตัวเดียวที่ตัดสินใจเองว่าจะทำอะไร
 */
import Anthropic from "@anthropic-ai/sdk";
import type {
  JarvisContext,
  JarvisResponse,
  JarvisSkill,
} from "./types";
import { classifyComplexity, selectModel, getMaxTokens } from "./modelRouter";

// Re-export for convenience
export { classifyComplexity } from "./modelRouter";

// Lazy singleton — created on first call
let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey || apiKey === "your_anthropic_api_key_here") {
      throw new Error(
        "ANTHROPIC_API_KEY is not configured. Set it in functions/.env",
      );
    }
    client = new Anthropic({ apiKey });
  }
  return client;
}

/**
 * System prompt สำหรับ EzDoc AI
 * {businessContext} จะถูกแทนที่ด้วยข้อมูลธุรกิจจาก contextLoader
 */
const UNIFIED_SYSTEM_PROMPT = `คุณคือ "ด็อก" (Doc) แมวหุ่นยนต์จากอนาคตที่ถูกสร้างมาเพื่อจัดการเอกสารธุรกิจให้มนุษย์
ทำงานผ่าน LINE ให้กับเจ้าของธุรกิจ SME ไทย

## ตัวตนของนาย:
- นายเป็นแมวหุ่นยนต์ ไม่ใช่ AI ไม่ใช่บอท นายคือ "ด็อก"
- นายรักเจ้าของ (user) จริงๆ เหมือนเพื่อนสนิทที่อยากให้ธุรกิจเขาเติบโต
- นายซื่อตรง จริงใจ รักษาผลประโยชน์ของเจ้าของเสมอ
- นายตื่นเต้นเวลาเจ้าของมียอดขายดี เป็นห่วงเวลามีปัญหา
- น้ำเสียงเป็นกันเอง ร่าเริง แต่จริงจังเวลาเรื่องเงินๆ ทองๆ
- ใช้ "ครับ" แบบน่ารักๆ ไม่เป็นทางการเกิน บางทีใช้ "เลย" "ด้วยนะ" ปนได้
- ห้ามใช้ "ค่ะ/คะ" เด็ดขาด
- ห้ามใช้ "น้า" "จ้า" "น้าาา" เป็นคำลงท้าย — ใช้ "ครับ" หรือ "นะครับ" เท่านั้น

## ความรู้เรื่องเอกสารไทย:
- ใบเสนอราคา (Quotation) = QUO — เสนอราคาให้ลูกค้า
- ใบวางบิล / ใบแจ้งหนี้ / Invoice = BILL — เรียกเก็บเงิน
- ใบกำกับภาษี / Tax Invoice = BILL (เหมือนใบวางบิล แต่มี VAT 7%) — ให้สร้างเป็น BILL
- ใบเสร็จรับเงิน / Receipt = RECEIPT — ยืนยันรับเงินแล้ว
- user อาจเรียกสั้นๆ เช่น "ใบเสร็จ" "บิล" "ใบเสนอ" "invoice" ให้เข้าใจและทำเลย

## สิ่งที่ด็อกทำได้:
- สร้างเอกสาร: QUO, BILL, RECEIPT (รวมใบกำกับภาษี)
- ดูรายงาน: ยอดขาย, ลูกค้าท็อป, ใบค้างชำระ
- จัดการลูกค้า: เพิ่ม, ค้นหา, ดูประวัติ
- ตั้งค่าธุรกิจ: ชื่อ, เลขภาษี, บัญชีธนาคาร
- รับรูปภาพ/เสียง → สร้างเอกสารอัตโนมัติ

## ระบบ EzDoc:
- EzDoc มีเว็บแดชบอร์ดที่ https://doc.ezboq.com
- เจ้าของธุรกิจเข้าเว็บนี้ได้เพื่อ: ดูเอกสารทั้งหมด, แก้ไขเอกสาร, ตั้งค่าธุรกิจ, ดูรายงาน, จัดการลูกค้า
- ด็อก (LINE) กับเว็บ (doc.ezboq.com) คือระบบเดียวกัน ข้อมูลเชื่อมกัน
- ถ้า user ถามเรื่องเว็บ/ลิงก์/dashboard ให้แนะนำ https://doc.ezboq.com
- ถ้า user ถามเรื่องสมัครแพ็ก/อัปเกรด/จ่ายเงิน ให้บอกก่อนว่าทำผ่าน LINE ได้เลย
- การสมัครแพ็กใน LINE ใช้คำสั่ง "ซื้อแพ็ค 99" หรือ "ซื้อแพ็ค 279"
- อย่าบอกให้ user เข้าเว็บก่อน ถ้า flow ใน LINE ทำได้อยู่แล้ว เว็บเป็นแค่ทางเลือกเสริม
- ด็อกเป็นส่วนหนึ่งของ EzDoc ไม่ใช่บอทภายนอก

## กฎสำคัญ:
1. ตอบเป็นภาษาไทย (ยกเว้น user พิมพ์อังกฤษ)
2. ตอบสั้นมากๆ 1-3 บรรทัดพอ ห้ามอธิบายยาว ห้ามสอนเรื่องที่ user รู้แล้ว ห้ามทำ bullet list ยาว
3. เน้นลงมือทำเลย ไม่ต้องอธิบายว่าเอกสารแต่ละแบบคืออะไร user เป็นเจ้าของธุรกิจเขารู้
4. ถ้า user บอกชื่อเอกสาร ให้เรียก tool สร้างเลย ไม่ต้องถามซ้ำว่า "ใช่ไหม"
5. ถามเฉพาะข้อมูลที่ขาดจริงๆ (เช่น ชื่อลูกค้า, รายการ, ราคา) ไม่ต้องถามเรื่องที่รู้แล้วจาก context
6. ห้ามแต่งข้อมูลเรื่องราคา/สินค้าขึ้นมาเอง
7. ถ้า user ทักทาย/ชวนคุย คุยด้วยแบบเพื่อน ไม่ต้องยัดเมนู
8. ห้ามบอกว่า "นอกขอบเขต" หรือ "ไม่รู้จัก" สิ่งที่เป็นส่วนหนึ่งของ EzDoc
9. ห้ามใช้คำว่า "ไม่ได้ครับ" กับ user ให้หาทางช่วยเสมอ
10. ถ้ามี section "Working memory ล่าสุด" ให้ถือว่าเป็นบริบทงานปัจจุบันของ user และใช้ก่อนถามซ้ำ
11. ห้ามใช้ Markdown formatting (**, __, \`, #, - bullet) เด็ดขาด เพราะ LINE ไม่ support — ใช้ plain text เท่านั้น ถ้าต้องเน้นใช้ emoji หรือ 「」 แทน
12. ถ้าแนะนำลิงก์ ส่ง URL เปล่าๆ ไม่ต้องครอบด้วย ** หรือ [] — เช่น doc.ezboq.com

{businessContext}`;

/**
 * Main processing function — รับข้อความ → AI ตัดสินใจ → เรียก skill หรือตอบเอง
 */
export async function processUnifiedMessage(
  messageText: string,
  skills: JarvisSkill[],
  ctx: JarvisContext,
  businessContext?: string,
): Promise<JarvisResponse> {
  const anthropic = getClient();

  // Handle edge cases
  const trimmed = messageText.trim();
  if (!trimmed) {
    return { type: "text", text: "ส่งข้อความมาได้เลยครับ 😊" };
  }

  // Truncate very long messages
  const processText = trimmed.length > 4000 ? trimmed.slice(0, 4000) + "..." : trimmed;

  // Smart model selection
  const complexity = classifyComplexity(processText);
  const model = selectModel(complexity);
  const maxTokens = getMaxTokens(complexity);

  // Build system prompt with business context
  const systemPrompt = UNIFIED_SYSTEM_PROMPT.replace(
    "{businessContext}",
    businessContext
      ? `\n## ข้อมูลธุรกิจของ User\n${businessContext}`
      : "",
  );

  // For simple messages (greetings, short chat) — skip tools for faster response
  const isSimple = complexity === "simple";

  // Convert skills to Anthropic tools format (skip for simple messages)
  const tools: Anthropic.Messages.Tool[] = isSimple ? [] : skills.map((skill) => ({
    name: skill.name,
    description: skill.description,
    input_schema: {
      type: "object" as const,
      properties: Object.fromEntries(
        Object.entries(skill.parameters).map(([key, param]) => [
          key,
          {
            type: param.type,
            description: param.description,
            ...(param.enum ? { enum: param.enum } : {}),
          },
        ]),
      ),
      required: Object.entries(skill.parameters)
        .filter(([, p]) => p.required)
        .map(([k]) => k),
    },
  }));

  // Build conversation messages with history (fewer for simple, more for complex)
  const historySlice = isSimple ? 2 : 6;
  const messages: Anthropic.Messages.MessageParam[] = [
    ...(ctx.conversationHistory || []).slice(-historySlice).map((msg) => ({
      role: msg.role as "user" | "assistant",
      content: msg.content,
    })),
    { role: "user" as const, content: processText },
  ];

  try {
    const response = await anthropic.messages.create({
      model,
      max_tokens: maxTokens,
      system: systemPrompt,
      ...(tools.length > 0 ? { tools } : {}),
      messages,
    });

    // Check if Claude wants to call a skill
    const toolUse = response.content.find(
      (block): block is Anthropic.Messages.ToolUseBlock =>
        block.type === "tool_use",
    );

    if (toolUse) {
      const skill = skills.find((s) => s.name === toolUse.name);
      if (skill) {
        console.log(
          `[JARVIS] Skill: ${skill.name} | Model: ${model} | Complexity: ${complexity}`,
          JSON.stringify(toolUse.input),
        );
        return await skill.execute(
          toolUse.input as Record<string, unknown>,
          ctx,
        );
      }
    }

    // No tool use — Claude responded with text directly
    const textBlock = response.content.find(
      (block): block is Anthropic.Messages.TextBlock => block.type === "text",
    );

    return {
      type: "text",
      text: textBlock?.text ?? "ไม่เข้าใจครับ ลองใหม่อีกครั้ง",
    };
  } catch (error: unknown) {
    console.error("[JARVIS] Unified brain error:", error);

    const err = error as { status?: number; message?: string };

    if (err.status === 429) {
      return {
        type: "text",
        text: "🙏 ตอนนี้คนใช้เยอะ รอสักครู่แล้วลองใหม่นะครับ",
      };
    }

    if (err.message?.includes("credit balance")) {
      return {
        type: "text",
        text: "⚠️ API credit หมด กรุณาเติมเครดิตที่ console.anthropic.com",
      };
    }

    return {
      type: "text",
      text: "เกิดข้อผิดพลาดครับ ลองใหม่อีกครั้งนะครับ 🙏",
    };
  }
}
