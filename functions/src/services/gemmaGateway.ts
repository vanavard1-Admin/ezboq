/**
 * Gemma Gateway — unified AI runtime entrypoint
 *
 * Phase 1: wrap existing Gemini RAG for construction Q&A while keeping
 * a stable contract for future memory-backed retrieval.
 */
import Anthropic from "@anthropic-ai/sdk";
import { askEzboqAiGateway } from "./ezboqAiGateway";
import type { ProjectMemoryLoader } from "./projectMemoryService";

export type GemmaTask =
  | "construction_qa"
  | "document_chat"
  | "fallback_reply"
  | "intent_classification"
  | "draft_extraction";

export type GemmaChannel = "web_callable" | "line" | "voice" | "http_api" | "internal";

export interface GemmaGatewayRequest {
  task: GemmaTask;
  channel: GemmaChannel;
  actor: {
    uid?: string;
    lineUserId?: string;
    businessId?: string;
  };
  input: {
    text: string;
    history?: Array<{ role: "user" | "assistant"; content: string }>;
    meta?: Record<string, unknown>;
  };
  context?: {
    loaders?: ProjectMemoryLoader[];
    maxKnowledgeItems?: number;
    maxDocs?: number;
  };
  tools?: {
    enabled?: string[];
    dryRun?: boolean;
  };
  output?: {
    format?: "text" | "jarvis_response" | "json";
  };
  trace?: {
    requestId?: string;
    source?: string;
  };
}

export interface GemmaGatewayResponse {
  ok: boolean;
  output: {
    text?: string;
    jarvisResponse?: unknown;
    json?: unknown;
  };
  sources: Array<{ loader: string; ref: string; title?: string }>;
  model: { provider: string; name: string };
  usage?: { totalTokens?: number };
  warnings?: string[];
  retrieval?: {
    provider: string;
    namespace?: string;
    matched?: number;
  };
}

const ALLOWED_TASKS_BY_CHANNEL: Record<GemmaChannel, GemmaTask[]> = {
  web_callable: ["construction_qa"],
  line: ["construction_qa", "document_chat"],
  voice: ["document_chat"],
  http_api: ["construction_qa", "document_chat"],
  internal: ["construction_qa", "document_chat", "intent_classification", "draft_extraction", "fallback_reply"],
};

function enforcePolicy(request: GemmaGatewayRequest): { allowed: boolean; warnings: string[] } {
  const warnings: string[] = [];
  const allowedTasks = ALLOWED_TASKS_BY_CHANNEL[request.channel] || [];
  if (!allowedTasks.includes(request.task)) {
    return {
      allowed: false,
      warnings: [`Task '${request.task}' not allowed for channel '${request.channel}'`],
    };
  }

  return { allowed: true, warnings };
}

export async function runGemmaGateway(
  request: GemmaGatewayRequest,
): Promise<GemmaGatewayResponse> {
  const task = request.task;
  const text = request.input?.text?.trim() || "";
  const policy = enforcePolicy(request);

  if (!policy.allowed) {
    return {
      ok: false,
      output: {},
      sources: [],
      model: { provider: "policy", name: "denied" },
      warnings: policy.warnings,
    };
  }

  if (!text) {
    return {
      ok: false,
      output: {},
      sources: [],
      model: { provider: "gemini", name: "gemini-2.5-flash" },
      warnings: ["Empty input text"],
    };
  }

  const meta = request.input?.meta || {};

  switch (task) {
    case "construction_qa": {
      const result = await askEzboqAiGateway(text, {
        maxResults: request.context?.maxKnowledgeItems ?? 3,
        loaders: request.context?.loaders,
      });

      return {
        ok: true,
        output: { text: result.answer },
        sources: result.sources.map((source) => ({
          loader: source.source,
          ref: source.id,
          title: source.title,
        })),
        model: { provider: "gemini", name: result.model },
        usage: { totalTokens: result.tokensUsed },
        retrieval: result.retrieval,
      };
    }
    case "document_chat": {
      const { processUnifiedMessage } = await import("../jarvis/unifiedBrain");
      const { skills, ctx, businessContext } = meta as {
        skills?: unknown;
        ctx?: unknown;
        businessContext?: string;
      };

      if (!skills || !ctx) {
        return {
          ok: false,
          output: {},
          sources: [],
          model: { provider: "gateway", name: "document_chat" },
          warnings: ["Missing skills or context for document_chat"],
        };
      }

      const response = await processUnifiedMessage(
        text,
        skills as Parameters<typeof processUnifiedMessage>[1],
        ctx as Parameters<typeof processUnifiedMessage>[2],
        businessContext,
      );

      return {
        ok: true,
        output: {
          jarvisResponse: response,
          text: response.type === "text" ? response.text : undefined,
        },
        sources: [],
        model: { provider: "anthropic", name: "unifiedBrain" },
      };
    }
    case "intent_classification": {
      const result = await classifyIntentWithAnthropic(text, meta);
      if (!result) {
        return {
          ok: false,
          output: {},
          sources: [],
          model: { provider: "anthropic", name: "claude-haiku-4-5-20251001" },
          warnings: ["Intent classification unavailable"],
        };
      }

      return {
        ok: true,
        output: { json: result },
        sources: [],
        model: { provider: "anthropic", name: "claude-haiku-4-5-20251001" },
      };
    }
    case "draft_extraction": {
      const result = await extractDraftPayloadWithAnthropic(text, meta);
      if (!result) {
        return {
          ok: false,
          output: {},
          sources: [],
          model: { provider: "anthropic", name: "claude-haiku-4-5-20251001" },
          warnings: ["Draft extraction unavailable"],
        };
      }

      return {
        ok: true,
        output: { json: result },
        sources: [],
        model: { provider: "anthropic", name: "claude-haiku-4-5-20251001" },
      };
    }
    default:
      return {
        ok: false,
        output: {},
        sources: [],
        model: { provider: "gemini", name: "gemini-2.5-flash" },
        warnings: [`Task '${task}' is not wired yet`],
      };
  }
}

let anthropicClient: Anthropic | null = null;

function getAnthropicClient(): Anthropic | null {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === "your_anthropic_api_key_here") {
    return null;
  }

  if (!anthropicClient) {
    anthropicClient = new Anthropic({ apiKey });
  }

  return anthropicClient;
}

function extractJsonObject(raw: string): Record<string, unknown> | null {
  const trimmed = raw.trim();
  const direct = trimmed.match(/\{[\s\S]*\}$/);
  const candidate = direct ? direct[0] : trimmed.match(/\{[\s\S]*\}/)?.[0];

  if (!candidate) {
    return null;
  }

  try {
    return JSON.parse(candidate) as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function classifyIntentWithAnthropic(
  text: string,
  meta: Record<string, unknown>,
): Promise<Record<string, unknown> | null> {
  const client = getAnthropicClient();
  if (!client) {
    return null;
  }

  const mode = String(meta.mode || "general");
  const systemPrompt =
    "You classify short Thai LINE messages for EzDOC into a small fixed intent set.\n" +
    "Return JSON only.\n" +
    "Allowed intents: NONE, GREETING, MENU, HELP_GUIDE, DOC_EXAMPLES, WELCOME_REPLAY, BUSINESS_SETUP_FORM, THEME_HELP, LINK_ACCOUNT, PACKAGE_STATUS, UPGRADE_PRO, UPGRADE_TEAM, PAYMENT_HELP, PAYMENT_CLAIM, LATEST_DOC, TEAM_INVITE, CREATE_QUOTATION, CREATE_INVOICE, CREATE_RECEIPT.\n" +
    "Rules:\n" +
    "- Prefer MENU for messages asking to show the menu or main options.\n" +
    "- Prefer DOC_EXAMPLES for messages asking to see sample/template/PDF/examples.\n" +
    "- Prefer WELCOME_REPLAY for messages asking to resend welcome card/onboarding/start card.\n" +
    "- Prefer HELP_GUIDE for messages asking how to use, teach me, start guide.\n" +
    "- Prefer THEME_HELP for messages asking how to change theme/color/document style.\n" +
    "- Prefer PACKAGE_STATUS for messages asking remaining free quota or current package/plan.\n" +
    "- Prefer PAYMENT_CLAIM when the user says they already paid but status did not update.\n" +
    "- Prefer LATEST_DOC for messages asking to open or view the latest document.\n" +
    "- Prefer TEAM_INVITE for messages asking how to invite teammates or use team features.\n" +
    "- Prefer CREATE_* only when the user clearly wants to create that document.\n" +
    "- If unclear, return NONE.\n" +
    "JSON schema: {\"intent\":\"...\",\"confidence\":0.0-1.0}";

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 120,
    temperature: 0,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: `mode=${mode}\nmessage=${text}`,
      },
    ],
  });

  const textBlock = response.content.find(
    (block): block is Anthropic.Messages.TextBlock => block.type === "text",
  );

  return textBlock?.text ? extractJsonObject(textBlock.text) : null;
}

async function extractDraftPayloadWithAnthropic(
  text: string,
  meta: Record<string, unknown>,
): Promise<Record<string, unknown> | null> {
  const client = getAnthropicClient();
  if (!client) {
    return null;
  }

  const systemPrompt =
    "You extract structured customer and line-item data for EzDOC business documents.\n" +
    "Return JSON only.\n" +
    "Never invent customer names, items, quantity, or prices.\n" +
    "Ignore utility messages like menu, help, welcome card, examples, connect account, package pricing, and payment instructions.\n" +
    "If nothing useful is present, return empty values.\n" +
    "Schema: {\"customer_name\":string|null,\"items\":[{\"name\":string,\"qty\":number,\"price\":number}],\"confidence\":0.0-1.0}";

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 220,
    temperature: 0,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content:
          `has_active_draft=${meta.has_active_draft ? "true" : "false"}\n` +
          `has_customer=${meta.has_customer ? "true" : "false"}\n` +
          `has_items=${meta.has_items ? "true" : "false"}\n` +
          `last_item_name=${meta.last_item_name || ""}\n` +
          `message=${text}`,
      },
    ],
  });

  const textBlock = response.content.find(
    (block): block is Anthropic.Messages.TextBlock => block.type === "text",
  );

  return textBlock?.text ? extractJsonObject(textBlock.text) : null;
}
