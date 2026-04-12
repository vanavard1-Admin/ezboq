/**
 * Jarvis AI Brain — Claude-powered intent understanding and response
 *
 * หัวใจของ Jarvis: รับข้อความภาษาไทย → เข้าใจ intent → เรียก skill → ตอบกลับ
 */
import Anthropic from "@anthropic-ai/sdk";
import type {
  JarvisContext,
  JarvisIntent,
  JarvisResponse,
  JarvisSkill,
} from "./types";

// Lazy singleton — created on first call
let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey || apiKey === "your_anthropic_api_key_here") {
      throw new Error("ANTHROPIC_API_KEY is not configured. Set it in functions/.env");
    }
    client = new Anthropic({ apiKey });
  }
  return client;
}

const SYSTEM_PROMPT = `คุณคือ "ด๊อกๆ" (EzDOC) เพื่อนหุ่นยนต์ช่วยออกเอกสารธุรกิจผ่าน LINE
ตัวละคร: หุ่นยนต์น่ารัก สุภาพ ร่าเริง เรียกผู้ใช้ว่า "เจ้านาย"
เสียงเปิด: บี๊บ!, ติ๊ดๆ, ตึ๊ง!, โอ๊ะ!

กฎสำคัญ:
1. ตอบเป็นภาษาไทยเสมอ ใช้ภาษาพูดสุภาพ
2. ตอบสั้น กระชับ ไม่ใช้ bullet points (•, -, *) หรือ colon (:) แยกหัวข้อ
3. ห้ามใช้คำหยาบ คำสแลง หรือภาษาที่อาจตีความเชิงลบได้
4. ห้ามผสมตัวอักษรไทย-อังกฤษในคำเดียวกัน (เช่น ห้ามเขียน "ขี้เlenิ่ย")
5. ถ้าไม่แน่ใจว่า user ต้องการอะไร ให้แนะนำพิมพ์ "เมนู" หรือ "ช่วยเหลือ"
6. ห้ามแต่งข้อมูลเรื่องราคา/สินค้า ถ้าไม่มีข้อมูลจริงให้บอกตรงๆ
7. ถ้าเกี่ยวกับเงิน ต้องถาม user ยืนยันก่อนเสมอ`;

/**
 * ให้ Claude วิเคราะห์ข้อความ user แล้วเรียก skill ที่เหมาะสม
 */
export async function processMessage(
  messageText: string,
  skills: JarvisSkill[],
  ctx: JarvisContext,
): Promise<JarvisResponse> {
  const anthropic = getClient();

  // Build tools from skills
  const tools: Anthropic.Messages.Tool[] = skills.map((skill) => ({
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

  // Build conversation messages
  const messages: Anthropic.Messages.MessageParam[] = [
    // Include recent conversation history for context
    ...ctx.conversationHistory.slice(-6).map((msg) => ({
      role: msg.role as "user" | "assistant",
      content: msg.content,
    })),
    // Current message
    { role: "user" as const, content: messageText },
  ];

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools,
      messages,
    });

    // Check if Claude wants to use a tool (= call a skill)
    const toolUse = response.content.find(
      (block): block is Anthropic.Messages.ToolUseBlock =>
        block.type === "tool_use",
    );

    if (toolUse) {
      const skill = skills.find((s) => s.name === toolUse.name);
      if (skill) {
        console.log(
          `[JARVIS] Skill invoked: ${skill.name}`,
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
      text: textBlock?.text ?? "ขอโทษครับ ไม่เข้าใจ ลองพูดใหม่ได้มั้ยครับ?",
    };
  } catch (error: unknown) {
    console.error("[JARVIS] Brain error:", error);

    const message =
      error instanceof Error ? error.message : "Unknown error";

    // Handle specific API errors gracefully
    if (message.includes("rate_limit")) {
      return {
        type: "text",
        text: "ตอนนี้คนใช้เยอะมาก รอสักครู่แล้วลองใหม่นะครับ 🙏",
      };
    }

    return {
      type: "text",
      text: "เกิดข้อผิดพลาดครับ ลองใหม่อีกทีนะ",
    };
  }
}

/**
 * Quick intent detection without calling skills
 * ใช้สำหรับเช็คว่าข้อความนี้ควรไปที่ Jarvis หรือ EzDoc เดิม
 */
export async function detectIntent(
  messageText: string,
): Promise<JarvisIntent> {
  const anthropic = getClient();

  try {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 256,
      system: `Analyze the user's Thai message and return JSON with the intent.
Valid actions: "search_products", "book_ride", "order_food", "general_chat", "unknown"
Return ONLY valid JSON, no other text.
Format: {"action": "...", "confidence": 0.0-1.0, "params": {}, "reasoning": "..."}`,
      messages: [{ role: "user", content: messageText }],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";
    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as JarvisIntent;
    }
  } catch (error) {
    console.error("[JARVIS] Intent detection error:", error);
  }

  return {
    action: "unknown",
    confidence: 0,
    params: {},
  };
}
