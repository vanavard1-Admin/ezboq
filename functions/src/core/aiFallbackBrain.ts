/**
 * AI Fallback Brain — Claude Haiku ตอบเมื่อ intent = UNKNOWN
 *
 * Architecture: Deterministic-first, AI-fallback
 * - 95% ของข้อความใช้ regex intent → handler เดิม (เร็ว, ไม่มี cost)
 * - ~5% UNKNOWN → AI fallback (module นี้) → Claude Haiku
 * - ถ้า AI พัง / API key ไม่มี → fall through to state-aware fallback เดิม
 */

export interface AIFallbackResult {
  handled: boolean;
  message: string;
}

function isConstructionQuery(messageText: string): boolean {
  const text = messageText.trim().toLowerCase();
  if (!text) return false;

  const patterns = [
    /boq|bill\s*of\s*quantity/i,
    /วัสดุ|ก่อสร้าง|โครงการ|ไซต์งาน|งานระบบ/,
    /ราคาวัสดุ|วัสดุก่อสร้าง|ต้นทุน|ประมาณราคา/,
    /คอนกรีต|ปูน|เหล็ก|กระเบื้อง|สี|ท่อ|สายไฟ/,
  ];

  return patterns.some((pattern) => pattern.test(text));
}

/**
 * ลองให้ AI ตอบข้อความที่ regex ไม่เข้าใจ
 * คืน { handled: true, message } ถ้า AI ตอบได้
 * คืน { handled: false } ถ้าตอบไม่ได้ → caller ใช้ state-aware fallback เดิม
 */
export async function handleWithAIFallback(params: {
  userId: string;
  businessId: string;
  lineUserId: string;
  messageText: string;
  traceId?: string;
}): Promise<AIFallbackResult> {
  const { userId, businessId, lineUserId, messageText, traceId } = params;

  try {
    if (isConstructionQuery(messageText)) {
      const { runGemmaGateway } = await import("../services/gemmaGateway");
      const gemmaResult = await runGemmaGateway({
        task: "construction_qa",
        channel: "line",
        actor: { uid: userId, lineUserId, businessId },
        input: { text: messageText },
        context: {
          maxKnowledgeItems: 3,
          loaders: ["project_memory", "code_index", "incidents", "project_issues", "test_observations"],
        },
        output: { format: "text" },
        trace: { source: "aiFallbackBrain" },
      });

      if (gemmaResult.ok && gemmaResult.output.text) {
        return { handled: true, message: gemmaResult.output.text };
      }
    }

    // Lazy imports to avoid cold-start penalty when AI not needed
    const { loadBusinessContext, formatContextForPrompt } = await import("../jarvis/contextLoader");
    const { buildAIFallbackSkills } = await import("./aiFallbackSkills");
    const { runGemmaGateway } = await import("../services/gemmaGateway");

    // Load business context for AI system prompt injection
    const bizCtx = await loadBusinessContext(lineUserId);
    const businessContext = bizCtx ? formatContextForPrompt(bizCtx) : undefined;

    // Build skills that write to legacy line_drafts (not jarvis_drafts)
    const skills = buildAIFallbackSkills(userId, businessId);

    // Build JarvisContext (no history for fallback — keep it fast)
    const ctx = {
      userId,
      lineUserId,
      traceId: traceId || "",
      conversationHistory: [],
    };

    const gemmaResult = await runGemmaGateway({
      task: "document_chat",
      channel: "line",
      actor: { uid: userId, lineUserId, businessId },
      input: { text: messageText, meta: { skills, ctx, businessContext } },
      output: { format: "jarvis_response" },
      trace: { source: "aiFallbackBrain" },
    });

    if (gemmaResult.ok && gemmaResult.output.jarvisResponse) {
      const result = gemmaResult.output.jarvisResponse as { type?: string; text?: string };
      if ((result.type === "text" || result.type === "confirm") && result.text) {
        console.log(`[GEMMA_GATEWAY] handled: "${messageText.slice(0, 40)}" → ${result.type}`);
        return { handled: true, message: result.text };
      }
    }

    return { handled: false, message: "" };
  } catch (err) {
    console.error("[UNIFIED_BRAIN] AI fallback error:", err);
    return { handled: false, message: "" };
  }
}
