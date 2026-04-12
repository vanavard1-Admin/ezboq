// functions/src/core/lineFirstMessage.ts
// EzDoc - Phase 5B-0: First-message handler + fallback (PRODUCTION READY)
// Phase 5B-0.1: Quick reply integration

import * as admin from "firebase-admin";
import {
  type QuickReplyAction,
} from "../shared/lineQuickReply";
import { getPlanAwareMainMenu } from "../services/planAwareUI";

export type LineMessageEvent = {
  type: "message";
  message: { type: "text"; text: string };
  replyToken: string;
  source: { userId?: string };
};

export type FirstMessageDecision =
  | {
      kind: "WELCOME";
      action: "REPLIED";
      messages: string[];
      structuredMessages?: Array<Record<string, unknown>>;
      quickReply?: QuickReplyAction[];
    }
  | {
      kind: "FALLBACK";
      action: "REPLIED";
      messages: string[];
      structuredMessages?: Array<Record<string, unknown>>;
      quickReply?: QuickReplyAction[];
    }
  | {
      kind: "GREETING";
      action: "REPLIED";
      messages: string[];
      structuredMessages?: Array<Record<string, unknown>>;
      quickReply?: QuickReplyAction[];
    }
  | { kind: "PASS"; action: "FORWARD"; forwardText?: string };

type Options = {
  welcomeCooldownHours?: number; // default 24
};

type LineClient = {
  replyMessage(params: {
    replyToken: string;
    messages: Array<{
      type: string;
      text: string;
      quickReply?: {
        items: QuickReplyAction[];
      };
    }>;
  }): Promise<void>;
};

const DEFAULT_WELCOME_COOLDOWN_HOURS = 24;

function hoursToMs(h: number) {
  return h * 60 * 60 * 1000;
}

function nowMs() {
  return Date.now();
}

function normalizeText(s: string) {
  return (s || "").trim();
}

async function buildWelcomeMessages(userId: string): Promise<{
  messages: string[];
  structuredMessages?: Array<Record<string, unknown>>;
  quickReply: QuickReplyAction[];
}> {
  const { getUserPlan } = await import("../core/planService");
  const { getWelcomeQuickReply, buildWelcomeFlexMessage } = require("../services/uxCopy");
  const { buildDocumentExamplesFlexMessage } = require("../services/documentExamplesService");
  const plan = await getUserPlan(userId);
  const quickReply = getWelcomeQuickReply(plan);
  return {
    messages: [],
    structuredMessages: [buildWelcomeFlexMessage(plan), buildDocumentExamplesFlexMessage()],
    quickReply: quickReply,
  };
}

async function buildGreetingMessages(userId: string, hasActiveDraft: boolean): Promise<{
  messages: string[];
  quickReply: QuickReplyAction[];
}> {
  const { getUserPlan } = await import("../core/planService");
  const { getWelcomeQuickReply } = require("../services/uxCopy");
  const plan = await getUserPlan(userId);

  const message = hasActiveDraft
    ? 'บี๊บ! ด๊อกๆ อยู่ตรงนี้ครับ 🐾\n\nงานล่าสุดยังค้างอยู่ ถ้าจะทำต่อพิมพ์ข้อมูลเพิ่ม หรือกดปุ่มด้านล่างได้เลย'
    : plan === 'FREE'
      ? `บี๊บ! ด๊อกๆ พร้อมช่วยแล้วครับ 🐾\n\nเริ่มไวสุด พิมพ์ "ทำใบเสนอราคา"\nหรือกดดูตัวอย่าง/เชื่อมต่อจากปุ่มด้านล่างได้เลย`
      : `บี๊บ! ด๊อกๆ พร้อมช่วยต่อครับ 🐾\n\nถ้าจะทำเอกสารใหม่ พิมพ์ "ทำใบเสนอราคา" ได้เลย`;

  return {
    messages: [message],
    quickReply: getWelcomeQuickReply(plan),
  };
}

async function buildFallbackMessages(
  userId: string,
  hasActiveDraft: boolean
): Promise<{
  messages: string[];
  quickReply: QuickReplyAction[];
}> {
  const { getUserPlan } = await import("../core/planService");
  const { getFallbackMessage, getWelcomeQuickReply } = require("../services/uxCopy");
  const plan = await getUserPlan(userId);
  const message = getFallbackMessage(hasActiveDraft, plan);
  const quickReply = hasActiveDraft
    ? await getPlanAwareMainMenu(userId)
    : getWelcomeQuickReply(plan);

  return {
    messages: [message],
    quickReply,
  };
}

/**
 * Decide whether to welcome, fallback, or pass to main handler.
 *
 * @param db Firestore instance
 * @param userId Firebase UID
 * @param text Message text
 * @param intent Intent from orchestrator ("NONE" if not recognized)
 * @param hasActiveDraft Whether user has active draft
 * @param options Optional settings (welcomeCooldownHours)
 */
export async function decideFirstMessageOrFallback(params: {
  db: admin.firestore.Firestore;
  userId: string;
  text: string;
  intent: string | undefined;
  hasActiveDraft: boolean;
  options?: Options;
}): Promise<FirstMessageDecision> {
  const { db, userId, text, intent, hasActiveDraft } = params;
  const welcomeCooldownHours =
    params.options?.welcomeCooldownHours ??
    DEFAULT_WELCOME_COOLDOWN_HOURS;

  // A) Log input (no raw text to avoid PII)
  console.log(`[lineFirstMessage] text_len=${text.length}, intent="${intent}"`);

  const msg = normalizeText(text);
  if (!msg) {
    // empty message -> fallback
    const fallback = await buildFallbackMessages(userId, hasActiveDraft);
    return {
      kind: "FALLBACK",
      action: "REPLIED",
      messages: fallback.messages,
      quickReply: fallback.quickReply,
    };
  }

  const { classifyConversationalIntent } = await import("../services/hybridAiAssistService");
  const aiIntent = await classifyConversationalIntent(msg, {
    mode: "first_turn",
  });

  if (aiIntent.intent === 'DOC_EXAMPLES') {
    const { buildDocumentExamplesFlexMessage } = await import("../services/documentExamplesService");
    return {
      kind: "FALLBACK",
      action: "REPLIED",
      messages: [],
      structuredMessages: [buildDocumentExamplesFlexMessage()],
    };
  }

  if (aiIntent.intent === 'WELCOME_REPLAY') {
    const welcome = await buildWelcomeMessages(userId);
    return {
      kind: "WELCOME",
      action: "REPLIED",
      messages: welcome.messages,
      structuredMessages: welcome.structuredMessages,
      quickReply: welcome.quickReply,
    };
  }

  if (aiIntent.intent === 'HELP_GUIDE') {
    const { getHelpMessageShort } = await import("../services/helpCopy");
    const { getUserPlan } = await import("../core/planService");
    const { getWelcomeQuickReply } = require("../services/uxCopy");
    const plan = await getUserPlan(userId);
    return {
      kind: "FALLBACK",
      action: "REPLIED",
      messages: [getHelpMessageShort(plan)],
      quickReply: getWelcomeQuickReply(plan),
    };
  }

  if (
    aiIntent.intent === 'MENU' ||
    aiIntent.intent === 'BUSINESS_SETUP_FORM' ||
    aiIntent.intent === 'THEME_HELP' ||
    aiIntent.intent === 'LINK_ACCOUNT' ||
    aiIntent.intent === 'PACKAGE_STATUS' ||
    aiIntent.intent === 'UPGRADE_PRO' ||
    aiIntent.intent === 'UPGRADE_TEAM' ||
    aiIntent.intent === 'PAYMENT_HELP' ||
    aiIntent.intent === 'PAYMENT_CLAIM' ||
    aiIntent.intent === 'LATEST_DOC' ||
    aiIntent.intent === 'TEAM_INVITE'
  ) {
    return {
      kind: "PASS",
      action: "FORWARD",
      forwardText: aiIntent.canonicalText,
    };
  }

  if (
    aiIntent.intent === 'CREATE_QUOTATION' ||
    aiIntent.intent === 'CREATE_INVOICE' ||
    aiIntent.intent === 'CREATE_RECEIPT'
  ) {
    return { kind: "PASS", action: "FORWARD" };
  }

  // 1) If intent is recognized by orchestrator -> PASS (normal flow)
  if (intent && intent !== "NONE" && intent !== "") {
    console.log(`[lineFirstMessage] decision=FORWARD, intent=${intent}`);
    return { kind: "PASS", action: "FORWARD" };
  }

  // 2) Determine if user is "new" or "never greeted"
  const userRef = db.collection("users").doc(userId);
  const snap = await userRef.get();

  const userExists = snap.exists;
  const onboarding = snap.exists ? (snap.get("onboarding") as unknown) : undefined;
  const firstMessagedAt = onboarding && typeof onboarding === 'object' && 'firstMessagedAt' in onboarding
    ? ((onboarding as { firstMessagedAt?: { toDate?: () => Date } }).firstMessagedAt?.toDate?.()?.getTime?.() || undefined)
    : undefined;

  // If no user doc => treat as new (WELCOME)
  // If user exists but never greeted => WELCOME
  const isNewOrNeverGreeted = !userExists || !firstMessagedAt;

  if (aiIntent.intent === 'GREETING' && isNewOrNeverGreeted) {
    await userRef.set(
      {
        onboarding: {
          firstMessagedAt: new Date(),
          lastHelpAt: new Date(),
        },
        updatedAt: new Date(),
      },
      { merge: true }
    );

    const welcome = await buildWelcomeMessages(userId);
    return {
      kind: "WELCOME",
      action: "REPLIED",
      messages: welcome.messages,
      structuredMessages: welcome.structuredMessages,
      quickReply: welcome.quickReply,
    };
  }

  if (isNewOrNeverGreeted) {
    // write firstMessagedAt (merge)
    await userRef.set(
      {
        onboarding: {
          firstMessagedAt: new Date(),
          lastHelpAt: new Date(),
        },
        updatedAt: new Date(),
      },
      { merge: true }
    );

    console.log(`[lineFirstMessage] Decision: WELCOME (reason: new or never greeted)`);
    const welcome = await buildWelcomeMessages(userId);
    return {
      kind: "WELCOME",
      action: "REPLIED",
      messages: welcome.messages,
      quickReply: welcome.quickReply,
    };
  }

  // 3) If greeted recently, do fallback instead of spamming welcome
  const cooldownMs = hoursToMs(welcomeCooldownHours);
  const inCooldown =
    firstMessagedAt && nowMs() - firstMessagedAt < cooldownMs;

  if (inCooldown) {
    if (aiIntent.intent === 'GREETING') {
      const greeting = await buildGreetingMessages(userId, hasActiveDraft);
      return {
        kind: "GREETING",
        action: "REPLIED",
        messages: greeting.messages,
        quickReply: greeting.quickReply,
      };
    }

    await userRef.set(
      {
        onboarding: { lastHelpAt: new Date() },
        updatedAt: new Date(),
      },
      { merge: true }
    );
    const fallback = await buildFallbackMessages(userId, hasActiveDraft);
    return {
      kind: "FALLBACK",
      action: "REPLIED",
      messages: fallback.messages,
      quickReply: fallback.quickReply,
    };
  }

  // 4) Past cooldown -> fallback to reduce annoyance
  if (aiIntent.intent === 'GREETING') {
    const greeting = await buildGreetingMessages(userId, hasActiveDraft);
    return {
      kind: "GREETING",
      action: "REPLIED",
      messages: greeting.messages,
      quickReply: greeting.quickReply,
    };
  }

  await userRef.set(
    {
      onboarding: { lastHelpAt: new Date() },
      updatedAt: new Date(),
    },
    { merge: true }
  );
  const fallback = await buildFallbackMessages(userId, hasActiveDraft);
  return {
    kind: "FALLBACK",
    action: "REPLIED",
    messages: fallback.messages,
    quickReply: fallback.quickReply,
  };
}

/**
 * Send multiple LINE reply messages with optional quick reply.
 *
 * @param lineClient LINE bot client
 * @param replyToken Token for replying
 * @param texts Message texts (max 5)
 * @param quickReplyActions Optional quick reply buttons (added to last message)
 */
export async function replyTexts(params: {
  lineClient: LineClient;
  replyToken: string;
  texts: string[];
  quickReplyActions?: QuickReplyAction[];
}): Promise<void> {
  const { lineClient, replyToken, texts, quickReplyActions } = params;

  // Build message objects with proper typing
  const messages: Array<{
    type: string;
    text: string;
    quickReply?: {
      items: QuickReplyAction[];
    };
  }> = texts.slice(0, 5).map((t) => ({
    type: "text",
    text: t,
  }));

  // Add quick reply to the last message if provided
  if (
    quickReplyActions &&
    quickReplyActions.length > 0 &&
    messages.length > 0
  ) {
    const lastMsg = messages[messages.length - 1];
    lastMsg.quickReply = {
      items: quickReplyActions.slice(0, 13),
    };
  }

  await lineClient.replyMessage({
    replyToken,
    messages,
  });
}
