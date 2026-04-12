import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import { getDb } from './core/firebaseAdmin';

// Initialize Firebase Admin SDK if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

import crypto from "crypto";
import {
  decideFirstMessageOrFallback,
} from "./core/lineFirstMessage";
import { handleConversationMessage } from "./core/conversationHandler";
import { getLineLink } from "./core/lineLinkService";
import { LINE_API, getLineChannelAccessToken, getLineChannelSecret, getLineLiffId } from "./shared/config";
import {
  generateTraceId,
  logWithTrace,
  withAsyncSafety,
  FALLBACK_MESSAGES,
  type TraceContext,
  extractEventId,
  acquireEventLock,
} from "./utils/asyncSafety";

// ============================================================================
// HELPER FUNCTIONS: Smart ACK Router, Unified Transport, Anti-Loop Guard
// ============================================================================

/**
 * LINE Message type for unified transport helper
 */
type LineMessage = {
  type: "text";
  text: string;
  quickReply?: { items: unknown[] };
} | {
  type: "flex";
  altText: string;
  contents: unknown;
} | {
  type: "template";
  altText: string;
  template: unknown;
} | {
  type: "image";
  originalContentUrl: string;
  previewImageUrl: string;
};

const toSafeId = (id?: string): string => {
  if (!id) return "n/a";
  return crypto.createHash("sha256").update(id).digest("hex").substring(0, 8);
};

const sanitizeInboundText = (text: string): string => {
  const trimmed = (text || '').trim();
  return trimmed.replace(/^text\s*[=:]\s*/i, '').trim();
};


/**
 * Smart ACK Router: Context-aware acknowledgment messages with cooldown
 * Returns appropriate ACK message based on intent and context
 */
async function getSmartAckMessage(
  messageText: string,
  intent: string,
  lineUserId: string,
  db: admin.firestore.Firestore
): Promise<string | null> {
  // Cooldown: 2-3 seconds per user to prevent ACK spam
  const ACK_COOLDOWN_MS = 2500;
  const cooldownKey = `ack_cooldown_${lineUserId}`;

  try {
    const cooldownRef = db.collection("_temp_ack_cooldown").doc(cooldownKey);
    const cooldownDoc = await cooldownRef.get();

    if (cooldownDoc.exists) {
      const lastAckAt = cooldownDoc.get("lastAckAt")?.toMillis() || 0;
      const elapsed = Date.now() - lastAckAt;

      if (elapsed < ACK_COOLDOWN_MS) {
        // Still in cooldown - return progress message instead
        return "ติ๊ดๆ กำลังทำให้อยู่ครับเจ้านาย รอสักครู่นะ";
      }
    }

    // Update cooldown (fire-and-forget)
    cooldownRef.set({
      lastAckAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: admin.firestore.Timestamp.fromMillis(Date.now() + 60000), // 1 min TTL
    }).catch((e: unknown) => { console.error("[ACK_COOLDOWN_SET_FAILED]", e); });
  } catch (err) {
    // Fail-open: proceed with ACK even if cooldown check fails
    console.warn("[ACK_COOLDOWN_FAILED]", err);
  }

  // Intent-based ACK messages (premium, human-first Thai)
  const { Intent } = await import("./core/conversationOrchestrator");

  // Document creation intents
  if (intent === Intent.CREATE_QUOTATION) {
    return "ติ๊ดๆ รับคำสั่งแล้วครับเจ้านาย กำลังเตรียมใบเสนอราคา";
  }
  if (intent === Intent.CREATE_INVOICE || intent === Intent.CREATE_INV_FROM_QUO) {
    return "ติ๊ดๆ รับคำสั่งแล้วครับเจ้านาย กำลังเตรียมใบวางบิล";
  }
  if (intent === Intent.CREATE_RECEIPT || intent === Intent.CREATE_REC_FROM_INV) {
    return "ติ๊ดๆ รับคำสั่งแล้วครับเจ้านาย กำลังเตรียมใบเสร็จ";
  }

  // Purchase intents
  if (intent === Intent.BUY_PACKAGE_199 || intent === Intent.BUY_PACKAGE_279 || intent === Intent.BUY_PACKAGE_3990) {
    return "ติ๊ดๆ กำลังเตรียม QR ชำระเงินให้ครับเจ้านาย";
  }

  if (intent === Intent.REPORT_ISSUE) {
    return "ติ๊ดๆ รับเรื่องแล้วครับเจ้านาย กำลังส่งให้แอดมิน";
  }

  // Slip/OCR related
  if (messageText.match(/สลิป|slip|ชำระเงิน/i)) {
    return "ติ๊ดๆ รับข้อมูลแล้วครับเจ้านาย กำลังตรวจสอบการชำระเงิน";
  }

  // Help/General
  if (intent === Intent.HELP || intent === Intent.USAGE_GUIDE) {
    return "บี๊บ! กำลังเตรียมข้อมูลช่วยเหลือให้ครับเจ้านาย";
  }

  // Report
  if (intent === Intent.REPORT) {
    return "ติ๊ดๆ กำลังสร้างรายงานให้ครับเจ้านาย";
  }

  // Settings
  if (intent === Intent.SETTINGS) {
    return "ติ๊ดๆ กำลังโหลดการตั้งค่าครับเจ้านาย";
  }

  // Default: Generic but professional
  return "ติ๊ดๆ รับข้อความแล้วครับเจ้านาย รอสักครู่นะ";
}

/**
 * Unified LINE Transport Helper: sendReplyOrPush
 * Uses REPLY API when replyToken exists (with 25s timeout), falls back to PUSH
 * Centralizes error handling, logging, and status codes
 */
async function sendReplyOrPush(params: {
  replyToken?: string;
  to: string;
  messages: LineMessage[];
  accessToken: string;
  traceContext: TraceContext;
}): Promise<{ success: boolean; method: "reply" | "push"; latencyMs: number }> {
  const { replyToken, to, messages, accessToken, traceContext } = params;
  const startTime = Date.now();

  // Try REPLY API first (free, no quota) when replyToken is available
  if (replyToken) {
    try {
      const replyResponse = await fetch(LINE_API.REPLY, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          replyToken,
          messages,
        }),
      });

      const latencyMs = Date.now() - startTime;

      if (replyResponse.ok) {
        logWithTrace(
          "[LINE_TRANSPORT_OK]",
          { ...traceContext, stage: "ack_sent" },
          `Message sent via REPLY API (${latencyMs}ms)`,
          { method: "reply", messageCount: messages.length }
        );
        return { success: true, method: "reply", latencyMs };
      }

      const replyBody = await replyResponse.text().catch(() => "");

      // Reply failed (token expired etc.) — fall through to push
      logWithTrace(
        "[LINE_TRANSPORT_REPLY_FAILED]",
        { ...traceContext, stage: "reply_failed" },
        `REPLY API failed: ${replyResponse.status}, falling back to PUSH`,
        { statusText: replyResponse.statusText, body: replyBody.slice(0, 500) }
      );
    } catch {
      logWithTrace(
        "[LINE_TRANSPORT_REPLY_ERROR]",
        { ...traceContext, stage: "reply_error" },
        `REPLY API error, falling back to PUSH`,
        {}
      );
    }
  }

  // Fallback to PUSH API
  try {
    const pushResponse = await fetch(LINE_API.PUSH, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        to,
        messages,
      }),
    });

    const latencyMs = Date.now() - startTime;

    if (!pushResponse.ok) {
      const pushBody = await pushResponse.text().catch(() => "");
      logWithTrace(
        "[LINE_TRANSPORT_PUSH_FAILED]",
        { ...traceContext, stage: "ack_failed" },
        `PUSH API failed: ${pushResponse.status}`,
        { statusText: pushResponse.statusText, messageCount: messages.length, body: pushBody.slice(0, 500) }
      );
      return { success: false, method: "push", latencyMs };
    }

    logWithTrace(
      "[LINE_TRANSPORT_OK]",
      { ...traceContext, stage: "ack_sent" },
      `Message sent via PUSH API (${latencyMs}ms)`,
      { method: "push", messageCount: messages.length }
    );
    return { success: true, method: "push", latencyMs };
  } catch (pushErr) {
    const latencyMs = Date.now() - startTime;
    logWithTrace(
      "[LINE_TRANSPORT_PUSH_ERROR]",
      { ...traceContext, stage: "ack_error" },
      `PUSH API error: ${pushErr instanceof Error ? pushErr.message : String(pushErr)}`,
      { latencyMs }
    );
    return { success: false, method: "push", latencyMs };
  }
}

/**
 * Anti-Loop Session Guard: Prevent sending identical messages repeatedly
 * Tracks lastBotMessageHash + lastBotAt per lineUserId
 * Returns true if message should be sent, false if it's a duplicate (should use progress instead)
 * 
 * NOTE: Prepared for integration into processMessageAsync to prevent loops like
 * "ยังไม่มีเอกสาร...พิมพ์ทำใบเสนอราคา" - can be integrated when needed
 * Exported for potential future use in other modules
 */
export async function shouldSendMessage(
  lineUserId: string,
  messageText: string,
  db: admin.firestore.Firestore
): Promise<boolean> {
  const SESSION_WINDOW_MS = 30000; // 30 seconds
  const guardKey = `bot_msg_guard_${lineUserId}`;

  try {
    // Create hash of message text (simple but effective)
    const crypto = await import("crypto");
    const messageHash = crypto.createHash("sha256").update(messageText).digest("hex").substring(0, 16);

    const guardRef = db.collection("_temp_bot_msg_guard").doc(guardKey);
    const guardDoc = await guardRef.get();

    if (guardDoc.exists) {
      const lastHash = guardDoc.get("lastHash") as string | undefined;
      const lastBotAt = guardDoc.get("lastBotAt")?.toMillis() || 0;
      const elapsed = Date.now() - lastBotAt;

      // Same message within session window = duplicate (loop detected)
      if (lastHash === messageHash && elapsed < SESSION_WINDOW_MS) {
        return false; // Don't send - it's a loop
      }
    }

    // Update guard (fire-and-forget)
    guardRef.set({
      lastHash: messageHash,
      lastBotAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: admin.firestore.Timestamp.fromMillis(Date.now() + 120000), // 2 min TTL
    }).catch((e: unknown) => { console.error("[RATE_LIMIT_SET_FAILED]", e); });

    return true; // OK to send
  } catch (err) {
    // Fail-open: allow message if guard check fails
    console.warn("[ANTI_LOOP_GUARD_FAILED]", err);
    return true;
  }
}

function verifyLineSignature(
  rawBody: Buffer,
  channelSecret: string,
  signature?: string
): boolean {
  if (!signature) return false;

  const hmac = crypto.createHmac("sha256", channelSecret);
  hmac.update(rawBody);

  const expected = hmac.digest(); // Buffer
  const received = Buffer.from(signature, "base64");

  if (expected.length !== received.length) return false;
  return crypto.timingSafeEqual(expected, received);
}

function getRawBody(req: functions.https.Request): Buffer | null {
  // runtime มี rawBody แต่ typings อาจไม่ declare → ใช้ unknown แบบปลอดภัย (ไม่ใช้ any)
  const candidate = (req as unknown as { rawBody?: unknown }).rawBody;
  return Buffer.isBuffer(candidate) ? candidate : null;
}

export const lineWebhookV1 = functions
  .region("asia-southeast1")
  .runWith({
    secrets: ["LINE_CHANNEL_SECRET", "LINE_CHANNEL_ACCESS_TOKEN", "WEB_URL", "LINE_LINK_STATE_SECRET", "ANTHROPIC_API_KEY", "SENDGRID_API_KEY", "SENDGRID_FROM_EMAIL"],
    memory: "2GB",
    minInstances: 1,
  })
  .https.onRequest(async (req: functions.https.Request, res: functions.Response) => {
    const t0 = Date.now(); // Start timing

    // Support GET for connectivity check
    if (req.method === "GET") {
      res.status(200).send("OK");
      return;
    }

    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    const secret = getLineChannelSecret().trim();
    if (!secret) {
      console.error("LINE_CHANNEL_SECRET missing in runtime env");
      res.status(500).send("Server misconfigured");
      return;
    }

    const raw = getRawBody(req);
    const sig = req.header("x-line-signature") || "";

    if (!raw) {
      console.warn("rawBody missing (cannot verify LINE signature)");
      res.status(400).send("Bad Request");
      return;
    }

    if (!verifyLineSignature(raw, secret, sig)) {
      console.warn("LINE signature invalid");
      res.status(401).send("Unauthorized");
      return;
    }

    // Parse and process webhook events
    const body = req.body || {};
    const events = body.events || [];

    console.log("[lineWebhookV1] Received", events.length, "events");

    // ✅ CRITICAL: Validate required secrets at startup (fail fast)
    const accessToken = getLineChannelAccessToken().trim();
    if (!accessToken) {
      console.error("[CRITICAL] LINE_CHANNEL_ACCESS_TOKEN missing in runtime env");
      res.status(500).json({ error: "Server misconfigured: missing LINE_CHANNEL_ACCESS_TOKEN" });
      return;
    }

    // Create LINE client (Pushed-based)
    const lineClient = {
      // ✅ PUSH only (standard)
      pushMessage: async (params: {
        to: string;
        messages: Array<{
          type: string;
          text?: string;
          quickReply?: { items: unknown[] };
        }>;
      }) => {
        const messageTypes = params.messages.map((m) => m.type).join(',');
        console.log(`[lineClient] Sending PUSH to LINE API`, {
          to: toSafeId(params.to),
          messageCount: params.messages.length,
          types: messageTypes,
        });
        const body = JSON.stringify(params);
        const response = await fetch(LINE_API.PUSH, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body,
        });
        if (!response.ok) {
          console.error(`[lineClient] LINE API Status: ${response.status}`);
          throw new Error(`LINE API error: ${response.status} ${response.statusText}`);
        }
      },

      // ❌ KEEP OPTIONAL but DO NOT USE
      replyMessage: async (_params: any) => {
        void _params;
        throw new Error("replyMessage is disabled; use pushMessage instead.");
      },
    };

    const db = getDb();

    // Collect async processing promises — await ALL before res.send()
    // to prevent Gen1 CPU throttling after response
    const asyncTasks: Promise<void>[] = [];

    // Process message events
    for (const event of events) {
      const userId = event.source?.userId;
      const eventType = event.type;

      if (userId) {
        console.log(
          `[lineWebhookV1] 🆔 userId detected: ${toSafeId(userId)} (event: ${eventType})`
        );
      }

      // Handle FOLLOW event (user adds friend)
      if (event.type === "follow") {
        const lineUserId = event.source?.userId;
        if (lineUserId) {
          const traceId = generateTraceId();
          const eventId = extractEventId(event);
          const context: TraceContext = {
            traceId,
            eventId,
            lineUserId: toSafeId(lineUserId),
            eventType: "follow_event",
            stage: "webhook_received",
          };

          const webhookReceivedMs = Date.now() - t0;
          logWithTrace(
            "[WEBHOOK_RECEIVED]",
            context,
            `Follow event received`,
            { latency_ms: webhookReceivedMs }
          );

          // Apply idempotency lock (prevent duplicate welcome messages)
          if (eventId) {
            const lockAcquired = await acquireEventLock(eventId, { ...context, stage: "lock_acquire" });
            if (!lockAcquired) {
              logWithTrace(
                "[EVENT_DUPLICATE]",
                { ...context, stage: "lock_acquired" },
                "Follow event already processed, skipping",
                { latency_ms: Date.now() - t0 }
              );
              continue;
            }
            logWithTrace(
              "[LOCK_ACQUIRED]",
              { ...context, stage: "lock_acquired" },
              "Follow event lock acquired",
              { latency_ms: Date.now() - t0 }
            );
          }

          // Follow events must never be silent.
          // Preferred UX: Welcome Card first, then examples.
          // If LINE rejects the flex welcome in follow context, fall back to text welcome.
          const {
            buildWelcomeFlexMessage,
            getWelcomeMessage,
            getWelcomeQuickReply,
          } = await import("./services/uxCopy");
          const { getDocumentExampleMessages } = await import("./services/documentExamplesService");

          const welcomeQuickReply = getWelcomeQuickReply("FREE");
          const welcomeFlexMessage = buildWelcomeFlexMessage("FREE");
          const welcomeTextMessage: LineMessage = {
            type: "text",
            text: getWelcomeMessage("FREE"),
            quickReply: {
              items: welcomeQuickReply.slice(0, 13) as unknown[],
            },
          };

          let ackResult = await sendReplyOrPush({
            replyToken: event.replyToken,
            to: lineUserId,
            messages: [welcomeFlexMessage as any],
            accessToken,
            traceContext: { ...context, stage: "ack_sent" },
          });

          if (!ackResult.success) {
            try {
              ackResult = await sendReplyOrPush({
                replyToken: event.replyToken,
                to: lineUserId,
                messages: [welcomeTextMessage],
                accessToken,
                traceContext: { ...context, stage: "ack_sent_fallback" },
              });

              if (!ackResult.success) {
                await new Promise((resolve) => setTimeout(resolve, 1200));
                const retryStart = Date.now();
                await lineClient.pushMessage({
                  to: lineUserId,
                  messages: [welcomeTextMessage as any],
                });
                ackResult = {
                  success: true,
                  method: "push",
                  latencyMs: Date.now() - retryStart,
                };
              }

              logWithTrace(
                "[FOLLOW_WELCOME_RETRY_OK]",
                { ...context, stage: "ack_sent" },
                "Follow welcome fallback succeeded",
                { latency_ms: ackResult.latencyMs }
              );
            } catch (retryErr) {
              logWithTrace(
                "[FOLLOW_WELCOME_RETRY_FAILED]",
                { ...context, stage: "ack_failed" },
                "Follow welcome fallback failed",
                { error: retryErr instanceof Error ? retryErr.message : String(retryErr) }
              );
            }
          }

          if (ackResult.success) {
            try {
              const exampleMessages = getDocumentExampleMessages();
              await lineClient.pushMessage({
                to: lineUserId,
                messages: exampleMessages as any,
              });
              logWithTrace(
                "[FOLLOW_EXAMPLES_SENT]",
                { ...context, stage: "processing_done" },
                "Follow example carousel pushed",
                { messageCount: exampleMessages.length }
              );
            } catch (exampleErr) {
              logWithTrace(
                "[FOLLOW_EXAMPLES_FAILED]",
                { ...context, stage: "processing_done" },
                "Follow example carousel push failed",
                { error: exampleErr instanceof Error ? exampleErr.message : String(exampleErr) }
              );
            }
          }

          logWithTrace(
            "[FOLLOW_WELCOME_SENT]",
            { ...context, stage: "processing_done" },
            `Welcome message sent via ${ackResult.method}`,
            {
              ack_latency_ms: ackResult.latencyMs,
              method: ackResult.method,
              success: ackResult.success,
            }
          );
        }
        continue;
      }

      // Handle TEXT message event
      if (event.type === "message" && event.message?.type === "text") {
        const lineUserId = event.source?.userId;
        const messageText = sanitizeInboundText(event.message.text);
        const replyToken = event.replyToken;

        // Generate trace ID for correlation (unique per processing attempt)
        const traceId = generateTraceId();

        // Extract eventId for idempotency (LINE's stable identifier)
        const eventId = extractEventId(event);

        const context: TraceContext = {
          traceId,
          eventId,
          lineUserId: toSafeId(lineUserId),
          eventType: "text_message",
          stage: "webhook_received",
        };

        const webhookReceivedMs = Date.now() - t0;
        logWithTrace(
          "[WEBHOOK_RECEIVED]",
          context,
          "Text message received",
          { latency_ms: webhookReceivedMs, message_length: messageText.length }
        );

        // Step 1: Check idempotency EARLY (before any side effects)
        if (eventId) {
          const lockAcquired = await acquireEventLock(eventId, { ...context, stage: "lock_acquire" });
          if (!lockAcquired) {
            logWithTrace(
              "[EVENT_DUPLICATE]",
              { ...context, stage: "lock_acquired" },
              "Event already processed, skipping",
              { latency_ms: Date.now() - t0 }
            );
            continue; // Skip this event - already processed
          }
          logWithTrace(
            "[LOCK_ACQUIRED]",
            { ...context, stage: "lock_acquired" },
            "Event lock acquired",
            { latency_ms: Date.now() - t0 }
          );
        }

        // Step 2: Send Smart ACK (context-aware, with cooldown)
        try {
          if (lineUserId) {
            const { getButtonAction } = await import("./core/buttonActionMap");
            const { recognizeIntent, Intent } = await import("./core/conversationOrchestrator");
            const buttonAction = getButtonAction(messageText);
            const intent = recognizeIntent(messageText);

            // Only send ACK if NOT a button action AND NOT LINK_ACCOUNT
            // Button actions and LINK_ACCOUNT get immediate meaningful response
            if (!buttonAction && intent !== Intent.LINK_ACCOUNT) {
              const ackMessage = await getSmartAckMessage(messageText, intent, lineUserId, db);

              if (ackMessage) {
                const ackResult = await sendReplyOrPush({
                  replyToken,
                  to: lineUserId,
                  messages: [{ type: "text", text: ackMessage }],
                  accessToken,
                  traceContext: { ...context, stage: "ack_sent" },
                });

                logWithTrace(
                  "[ACK_SENT]",
                  { ...context, stage: "ack_sent" },
                  `Smart ACK sent via ${ackResult.method}`,
                  {
                    ack_latency_ms: ackResult.latencyMs,
                    method: ackResult.method,
                    success: ackResult.success,
                  }
                );
              }
            }
          }

          // Step 3: Process asynchronously with full safety wrapper
          const asyncStartMs = Date.now() - t0;
          logWithTrace(
            "[ASYNC_DISPATCH]",
            { ...context, stage: "async_dispatch" },
            `Dispatching async processing`,
            { async_dispatch_ms: asyncStartMs }
          );

          // Process with full CPU (awaited before res.send to avoid Gen1 throttling)
          asyncTasks.push(
            withAsyncSafety(
              { ...context, stage: "async_processing" },
              accessToken,
              () => processMessageAsync(lineUserId, messageText, lineClient as any, db, accessToken, context),
              { fallbackMessage: FALLBACK_MESSAGES.GENERIC, skipIdempotencyCheck: true, sendTo: lineUserId }
            ).catch((err) => {
              logWithTrace(
                "[ASYNC_WRAPPER_LEAKED]",
                { ...context, stage: "catastrophic" },
                "Error leaked from async safety wrapper (should never happen)",
                { error: err instanceof Error ? err.message : String(err) }
              );
            })
          );

        } catch (error) {
          logWithTrace(
            "[ACK_FAILED]",
            { ...context, stage: "ack_error" },
            "Failed to send ACK",
            { error: error instanceof Error ? error.message : String(error) }
          );

          // Fallback: Try simple push
          const { safePushMessage } = await import("./utils/asyncSafety");
          await safePushMessage(
            lineUserId,
            `โอ๊ะ! ระบบขัดข้องชั่วคราวครับเจ้านาย\nลองใหม่ได้เลยนะ\n\nRef: ${traceId}`,
            accessToken,
            context
          );
        }
      }

      // Handle IMAGE message event (payment slip OR logo/signature/stamp upload)
      // Support all LINE image message types: 'image', 'file', 'imageSet'
      const isImageMessage = event.type === "message" &&
        (event.message?.type === "image" ||
          event.message?.type === "file" ||
          event.message?.type === "imageSet");

      if (isImageMessage) {
        const lineUserId = event.source?.userId;
        const messageId = event.message.id;
        const messageType = event.message?.type || 'unknown';
        const replyToken = event.replyToken;

        // Generate trace ID for correlation (unique per processing attempt)
        const traceId = generateTraceId();

        // Extract eventId for idempotency (LINE's stable identifier)
        const eventId = extractEventId(event);

        const context: TraceContext = {
          traceId,
          eventId,
          lineUserId: toSafeId(lineUserId),
          eventType: "image_message",
          stage: "webhook_received",
        };

        const webhookReceivedMs = Date.now() - t0;
        logWithTrace(
          "[WEBHOOK_RECEIVED]",
          context,
          "Image message received",
          { latency_ms: webhookReceivedMs, message_id: messageId, message_type: messageType }
        );

        // Step 1: Check idempotency EARLY (before any side effects like storePendingImage, setUserImageMode, enqueue OCR)
        if (eventId) {
          const lockAcquired = await acquireEventLock(eventId, { ...context, stage: "lock_acquire" });
          if (!lockAcquired) {
            logWithTrace(
              "[EVENT_DUPLICATE]",
              { ...context, stage: "lock_acquired" },
              "Image event already processed, skipping",
              { latency_ms: Date.now() - t0 }
            );
            continue; // Skip - already processed
          }
          logWithTrace(
            "[LOCK_ACQUIRED]",
            { ...context, stage: "lock_acquired" },
            "Image event lock acquired",
            { latency_ms: Date.now() - t0 }
          );
        }

        if (lineUserId) {
          try {
            const {
              storePendingImage,
            } = await import("./services/imageUploadService");

            // Get Firebase UID from line_links
            const lineLink = await getLineLink(lineUserId);

            // Validate lineLink status and uid (must be ACTIVE and have uid)
            if (!lineLink || lineLink.status !== 'ACTIVE' || !lineLink.uid || lineLink.uid.trim() === '') {
              // User not linked or link is invalid - send linking prompt
              const LIFF_ID = getLineLiffId() || "2008406529-Y6Bh2fT5";
              const linkUrl = `https://liff.line.me/${LIFF_ID}`;

              const ackResult = await sendReplyOrPush({
                replyToken,
                to: lineUserId,
                messages: [{
                  type: "template",
                  altText: "เชื่อมต่อบัญชีเพื่อใช้งาน",
                  template: {
                    type: "buttons",
                    text: "บี๊บ! ยังไม่ได้เชื่อมต่อบัญชีครับเจ้านาย\nกดปุ่มด้านล่างเพื่อเข้าสู่ระบบนะ",
                    actions: [{
                      type: "uri",
                      label: "🔗 เชื่อมต่อบัญชี",
                      uri: linkUrl,
                    }],
                  },
                }],
                accessToken,
                traceContext: { ...context, stage: "ack_sent" },
              });

              logWithTrace(
                "[IMAGE_LINK_PROMPT_SENT]",
                { ...context, stage: "processing_done" },
                `Link prompt sent via ${ackResult.method}`,
                { ack_latency_ms: ackResult.latencyMs, method: ackResult.method }
              );
              continue; // Stop processing - user needs to link first
            }

            const firebaseUid = lineLink.uid;

            if (firebaseUid) {
              const { getUserImageMode, setUserImageMode } = await import("./services/userStateService");
              const { hasRecentPendingPurchase, getWaitingForSlipPurchase } = await import("./services/purchaseService");

              // ✅ OPTIMIZATION: Parallelize Firestore queries to reduce latency
              // Get current image mode and purchase candidates in parallel
              const [imageMode, recentPurchase, waitingPurchase] = await Promise.all([
                getUserImageMode(firebaseUid),
                hasRecentPendingPurchase(firebaseUid, 15, lineUserId!),
                getWaitingForSlipPurchase(firebaseUid, lineUserId!),
              ]);
              const slipPurchase = recentPurchase || waitingPurchase;
              const slipPurchaseIsRecent = Boolean(recentPurchase);

              // PRIORITY: If user has explicit image_mode (LOGO/SIGNATURE/STAMP), process immediately
              // User intent overrides SLIP heuristic
              if (imageMode === 'LOGO' || imageMode === 'SIGNATURE' || imageMode === 'STAMP') {
                // lineLink already fetched above, reuse it
                if (!lineLink) {
                  await sendReplyOrPush({
                    replyToken,
                    to: lineUserId,
                    messages: [{ type: "text", text: "โอ๊ะ! ยังไม่ได้เชื่อมต่อบัญชี LINE นะเจ้านาย\nพิมพ์ \"เชื่อมต่อ\" เพื่อเริ่มได้เลยครับ" }],
                    accessToken,
                    traceContext: { ...context, stage: "ack_sent" },
                  });
                  continue;
                }

                const businessId = lineLink.businessId || 'default';
                const { processImageWithMode } = await import("./services/imageUploadService");
                const thaiName = imageMode === 'LOGO' ? 'โลโก้' : imageMode === 'SIGNATURE' ? 'ลายเซ็น' : 'ตราประทับ';

                const logoAckResult = await sendReplyOrPush({
                  replyToken,
                  to: lineUserId,
                  messages: [{ type: "text", text: `ติ๊ดๆ รับรูปแล้วครับ กำลังตั้งค่า${thaiName}บริษัท\nรอสักครู่นะเจ้านาย` }],
                  accessToken,
                  traceContext: { ...context, stage: "ack_sent" },
                });

                logWithTrace(
                  "[IMAGE_LOGO_ACK_SENT]",
                  { ...context, stage: "ack_sent" },
                  `Logo/signature/stamp ACK sent via ${logoAckResult.method}`,
                  { ack_latency_ms: logoAckResult.latencyMs, method: logoAckResult.method }
                );

                asyncTasks.push(
                  withAsyncSafety(
                    { ...context, stage: "async_image_upload" },
                    accessToken,
                    async () => {
                      const result = await processImageWithMode(
                        firebaseUid,
                        businessId,
                        imageMode.toLowerCase() as 'logo' | 'signature' | 'stamp',
                        messageId,
                        accessToken
                      );
                      await setUserImageMode(firebaseUid, null);
                      await sendReplyOrPush({
                        to: lineUserId!,
                        messages: [{ type: "text", text: result.message }],
                        accessToken,
                        traceContext: { ...context, stage: "image_saved" },
                      });
                    },
                    { fallbackMessage: (traceId: string) => `โอ๊ะ! อัปโหลดรูปไม่สำเร็จครับเจ้านาย\nส่งรูปใหม่ได้เลยนะ\n\nRef: ${traceId}`, sendTo: lineUserId, skipIdempotencyCheck: true }
                  )
                );

                continue;
              }

              // ✅ JARVIS: Check for pending Jarvis AI purchase (before EzDoc purchase check)
              {
                const { isJarvisUser } = await import("./jarvis");
                const isJarvis = await isJarvisUser(lineUserId!, db);
                if (isJarvis) {
                  const { getActiveJarvisPurchase, processJarvisSlip } = await import("./jarvis/paymentService");
                  const jarvisPurchase = await getActiveJarvisPurchase(lineUserId!, db);
                  if (jarvisPurchase) {
                    // ACK immediately
                    const jarvisAckResult = await sendReplyOrPush({
                      replyToken,
                      to: lineUserId,
                      messages: [{ type: "text", text: "📸 รับสลิปแล้ว กำลังตรวจสอบ..." }],
                      accessToken,
                      traceContext: { ...context, stage: "ack_sent" },
                    });
                    logWithTrace("[JARVIS_SLIP_ACK]", context, `Jarvis slip ACK sent via ${jarvisAckResult.method}`);

                    // Process slip async (fire-and-forget)
                    (async () => {
                      try {
                        const result = await processJarvisSlip(lineUserId!, messageId, accessToken, db);
                        await lineClient.pushMessage({
                          to: lineUserId!,
                          messages: [{ type: "text", text: result.message }],
                        });
                        logWithTrace("[JARVIS_SLIP_RESULT]", context, `Jarvis slip result: success=${result.success}, plan=${result.plan || 'none'}`);
                      } catch (err) {
                        console.error("[lineWebhookV1] Jarvis slip processing failed:", err);
                        await lineClient.pushMessage({
                          to: lineUserId!,
                          messages: [{ type: "text", text: "❌ ตรวจสอบสลิปไม่สำเร็จ ลองส่งใหม่อีกครั้งครับ" }],
                        });
                      }
                    })();

                    continue;
                  }
                }
              }

              // ✅ JARVIS: Photo → Document (OCR image → AI creates document draft)
              // Only when: Jarvis user + no pending Jarvis purchase + no EzDoc purchase
              if (!slipPurchase) {
                try {
                  const { isJarvisUser: isJarvisCheck } = await import("./jarvis");
                  const isJarvisForPhoto = await isJarvisCheck(lineUserId!, db);
                  if (isJarvisForPhoto) {
                    const { getActiveJarvisPurchase: getJarvisPurchaseCheck } = await import("./jarvis/paymentService");
                    const pendingJarvisPurchase = await getJarvisPurchaseCheck(lineUserId!, db);
                    if (!pendingJarvisPurchase) {
                      // ACK immediately
                      await sendReplyOrPush({
                        replyToken,
                        to: lineUserId,
                        messages: [{ type: "text", text: "📸 ได้รับรูปแล้ว กำลังอ่าน..." }],
                        accessToken,
                        traceContext: { ...context, stage: "ack_sent" },
                      });

                      // OCR → AI (fire-and-forget)
                      (async () => {
                        try {
                          const { downloadLineImage } = await import("./services/imageUploadService");
                          const imageBuffer = await downloadLineImage(messageId, accessToken);

                          const { ImageAnnotatorClient } = await import("@google-cloud/vision");
                          const visionClient = new ImageAnnotatorClient();
                          const [ocrResult] = await visionClient.textDetection({ image: { content: imageBuffer } });
                          const fullText = ocrResult.textAnnotations?.[0]?.description || "";

                          if (!fullText || fullText.trim().length < 5) {
                            await lineClient.pushMessage({
                              to: lineUserId!,
                              messages: [{ type: "text", text: "📸 อ่านข้อความในรูปไม่ออกครับ ลองส่งรูปที่ชัดกว่านี้ หรือพิมพ์ข้อความแทนได้เลย" }],
                            });
                            return;
                          }

                          // Pass OCR text to AI as if user typed it
                          const { handleJarvisMessage } = await import("./jarvis");
                          const linkDoc = await db.collection("line_links").doc(lineUserId!).get();
                          const userId = linkDoc.data()?.uid || lineUserId!;

                          await handleJarvisMessage({
                            lineUserId: lineUserId!,
                            userId,
                            messageText: `[ผู้ใช้ส่งรูปภาพ ข้อความในรูป:\n${fullText.slice(0, 1500)}\n]\nช่วยสร้างเอกสารจากข้อมูลในรูปนี้ให้หน่อย ถ้าข้อมูลไม่พอให้ถามเพิ่ม`,
                            pushMessage: async (text: string) => {
                              await lineClient.pushMessage({ to: lineUserId!, messages: [{ type: "text", text }] });
                            },
                            pushMessages: async (msgs: Array<{ type: string; [key: string]: unknown }>) => {
                              await lineClient.pushMessage({ to: lineUserId!, messages: msgs as never });
                            },
                            traceId: context.traceId,
                            db,
                          });
                        } catch (err) {
                          console.error("[JARVIS_PHOTO_DOC] Error:", err);
                          await lineClient.pushMessage({
                            to: lineUserId!,
                            messages: [{ type: "text", text: "❌ อ่านรูปไม่สำเร็จ ลองส่งใหม่หรือพิมพ์ข้อความแทนครับ" }],
                          });
                        }
                      })();

                      continue;
                    }
                  }
                } catch (err) {
                  console.error("[JARVIS_PHOTO_DOC] Check failed:", err);
                }
              }

              // If there is any active EzDoc purchase, force image into slip flow before Jarvis OCR.
              if (slipPurchase) {
                await setUserImageMode(firebaseUid, 'SLIP');
                logWithTrace(
                  slipPurchaseIsRecent ? "[IMAGE_MODE=SLIP]" : "[IMAGE_MODE=SLIP_EXPIRED]",
                  context,
                  `Forced SLIP mode: purchaseId=${slipPurchase.purchaseId}`
                );

                storePendingImage(firebaseUid, messageId);
                logWithTrace("[IMAGE_RECEIVED]", context, `Image stored as pending: messageId=${messageId}, purchaseId=${slipPurchase.purchaseId}`);

                const { getSlipReceivedMessage, getPaymentPendingQuickReply } = await import("./services/paymentUXCopy");
                const ackResult = await sendReplyOrPush({
                  replyToken,
                  to: lineUserId,
                  messages: [{
                    type: "text",
                    text: getSlipReceivedMessage(),
                    quickReply: { items: getPaymentPendingQuickReply() },
                  }],
                  accessToken,
                  traceContext: { ...context, stage: "ack_sent" },
                });

                logWithTrace(
                  slipPurchaseIsRecent ? "[IMAGE_SLIP_ACK_SENT]" : "[IMAGE_EXPIRED_SLIP_ACK_SENT]",
                  { ...context, stage: "ack_sent" },
                  `${slipPurchaseIsRecent ? 'Slip' : 'Recovered slip'} ACK sent via ${ackResult.method}`,
                  { ack_latency_ms: ackResult.latencyMs, method: ackResult.method, success: ackResult.success }
                );

                try {
                  const { recordSlipReceipt } = await import("./services/purchaseService");
                  const { enqueueSlipOcrTask } = await import("./services/slipOcrTaskService");
                  const { processSlipUpload } = await import("./services/imageUploadService");

                  const wasUpdated = await recordSlipReceipt(
                    slipPurchase.purchaseId,
                    messageId,
                    context.traceId
                  );

                  if (wasUpdated) {
                    logWithTrace("[SLIP_RECEIPT_RECORDED]", context, `Slip receipt recorded: purchaseId=${slipPurchase.purchaseId}`);
                  }

                  try {
                    const taskName = await enqueueSlipOcrTask({
                      userId: firebaseUid,
                      lineUserId: lineUserId!,
                      messageId,
                      purchaseId: slipPurchase.purchaseId,
                    });
                    logWithTrace("[OCR_JOB_ENQUEUED]", context, `OCR job enqueued: taskName=${taskName}, purchaseId=${slipPurchase.purchaseId}`);
                  } catch (enqueueErr) {
                    console.error(`[lineWebhookV1] Failed to enqueue OCR job: purchaseId=${slipPurchase.purchaseId}`, enqueueErr);

                    const result = await processSlipUpload(firebaseUid, lineUserId!, messageId, accessToken, slipPurchase.purchaseId);
                    logWithTrace("[SLIP_UPLOAD_FALLBACK_OK]", context, `Slip processed fallback: purchaseId=${slipPurchase.purchaseId}`);
                    if (!result.success && result.message) {
                      const { getPaymentRetryButtons } = await import("./ui/quickReplies");
                      await lineClient.pushMessage({
                        to: lineUserId!,
                        messages: [{
                          type: "text",
                          text: result.message,
                          quickReply: { items: getPaymentRetryButtons() },
                        }],
                      });
                    }
                  }
                } catch (markErr) {
                  console.error(`[lineWebhookV1] Failed to record slip/enqueue OCR: purchaseId=${slipPurchase.purchaseId}`, markErr);
                }

                continue;
              }

              // No purchase at all - store image as pending and ask what it's for.
              storePendingImage(firebaseUid, messageId);

              // No purchase at all - ask what image is for
              // Throttle image prompt (limit to once per 2 seconds)
              const { isActionAllowed } = await import("./services/userThrottleService");
              if (isActionAllowed(lineUserId || firebaseUid, 'image_prompt', 2000)) {
                // Send ACK (via sendReplyOrPush)
                const unknownAckResult = await sendReplyOrPush({
                  replyToken,
                  to: lineUserId,
                  messages: [{
                    type: "text",
                    text: "ติ๊ดๆ รูปนี้เอาไปใช้ทำอะไรดีครับเจ้านาย?\nพิมพ์ โลโก้ / ลายเซ็น / ตราประทับ",
                  }],
                  accessToken,
                  traceContext: { ...context, stage: "ack_sent" },
                });

                logWithTrace(
                  "[IMAGE_UNKNOWN_ACK_SENT]",
                  { ...context, stage: "ack_sent" },
                  `Unknown image ACK sent via ${unknownAckResult.method}`,
                  { ack_latency_ms: unknownAckResult.latencyMs, method: unknownAckResult.method }
                );
              }

              logWithTrace("[IMAGE_STORED]", context, `Pending image stored for user ${toSafeId(firebaseUid)}`);
              continue;
            }
          } catch (imgErr) {
            logWithTrace("[IMAGE_PROCESS_ERROR]", context, `Error processing image: ${imgErr}`);
          }
        }

        // For unlinked users, still send ACK - never stay silent
        if (lineUserId) {
          const unlinkedAckResult = await sendReplyOrPush({
            replyToken: event.replyToken,
            to: lineUserId,
            messages: [{
              type: "text",
              text: "โอ๊ะ! ยังไม่ได้เชื่อมต่อบัญชี LINE นะเจ้านาย\nพิมพ์ \"เชื่อมต่อ\" เพื่อเริ่มได้เลยครับ",
            }],
            accessToken,
            traceContext: { ...context, stage: "ack_sent" },
          });

          logWithTrace(
            "[IMAGE_UNLINKED_ACK_SENT]",
            { ...context, stage: "processing_done" },
            `Unlinked user ACK sent via ${unlinkedAckResult.method}`,
            { ack_latency_ms: unlinkedAckResult.latencyMs, method: unlinkedAckResult.method }
          );
        }

        logWithTrace("[IMAGE_STORED_UNLINKED]", context, "Image stored for unlinked user, ACK sent");
        continue;
      }

      // Handle non-text message types (sticker/audio/video/file/location)
      if (event.type === "message" && event.message?.type !== "text") {
        const lineUserId = event.source?.userId;
        const messageType = event.message?.type || 'unknown';
        const traceId = generateTraceId();
        const eventId = extractEventId(event);
        const context: TraceContext = {
          traceId,
          eventId,
          lineUserId: toSafeId(lineUserId),
          eventType: "non_text_message",
          stage: "webhook_received",
        };

        logWithTrace(
          "[WEBHOOK_RECEIVED]",
          context,
          "Non-text message received",
          { message_type: messageType }
        );

        // ✅ JARVIS: Voice → Document (Speech-to-Text → AI)
        if (messageType === "audio" && lineUserId) {
          try {
            const { isJarvisUser: isJarvisVoice } = await import("./jarvis");
            const isJarvisForVoice = await isJarvisVoice(lineUserId, db);
            if (isJarvisForVoice) {
              const audioMessageId = event.message?.id;
              if (audioMessageId) {
                // ACK immediately
                await sendReplyOrPush({
                  replyToken: event.replyToken,
                  to: lineUserId,
                  messages: [{ type: "text", text: "🎤 ได้ยินแล้ว กำลังถอดเสียง..." }],
                  accessToken,
                  traceContext: { ...context, stage: "ack_sent" },
                });

                try {
                  const voiceJobRef = db.collection("voice_message_jobs").doc(audioMessageId);
                  await voiceJobRef.create({
                    id: audioMessageId,
                    line_user_id: lineUserId,
                    message_id: audioMessageId,
                    status: "PENDING",
                    created_at: admin.firestore.FieldValue.serverTimestamp(),
                    attempts: 0,
                    source: "LINE_AUDIO",
                    traceId: context.traceId,
                  });

                  logWithTrace(
                    "[JARVIS_VOICE_ENQUEUED]",
                    { ...context, stage: "voice_job_queued" },
                    "Voice job queued for background processing",
                    { jobId: audioMessageId }
                  );
                } catch (queueErr) {
                  const queueCode =
                    typeof queueErr === "object" && queueErr !== null && "code" in queueErr
                      ? String((queueErr as { code?: unknown }).code ?? "")
                      : "";

                  if (queueCode === "6" || queueCode.toUpperCase() === "ALREADY_EXISTS") {
                    logWithTrace(
                      "[JARVIS_VOICE_DUPLICATE]",
                      { ...context, stage: "voice_job_exists" },
                      "Voice job already exists, skipping duplicate enqueue",
                      { jobId: audioMessageId }
                    );
                  } else {
                    console.error("[JARVIS_VOICE] Enqueue failed:", queueErr);
                    await lineClient.pushMessage({
                      to: lineUserId,
                      messages: [{ type: "text", text: "❌ ถอดเสียงไม่สำเร็จ ลองพิมพ์ข้อความแทนครับ" }],
                    });
                  }
                }

                continue;
              }
            }
          } catch (err) {
            console.error("[JARVIS_VOICE] Check failed:", err);
          }
        }

        // ✅ EZDOC AI: Sticker → ด็อกตอบน่ารักๆ
        if (messageType === "sticker" && lineUserId) {
          try {
            const { isJarvisUser: isStickerCheck } = await import("./jarvis");
            const isDocUser = await isStickerCheck(lineUserId, db);
            if (isDocUser) {
              const stickerResponses = [
                "🐱 เมี๊ยว~ ส่งสติ๊กเกอร์มาทักด็อกเหรอครับ ว่าไงๆ",
                "🐱 น่ารักจัง! ด็อกช่วยอะไรได้บ้างครับ?",
                "🐱 ด็อกรับสติ๊กเกอร์แล้วครับ อยากออกเอกสารมั้ย?",
                "🐱 ✨ ด็อกอยู่ตรงนี้เลยครับ บอกมาได้เลย~",
              ];
              const randomReply = stickerResponses[Math.floor(Math.random() * stickerResponses.length)];
              await sendReplyOrPush({
                replyToken: event.replyToken,
                to: lineUserId,
                messages: [{ type: "text", text: randomReply }],
                accessToken,
                traceContext: { ...context, stage: "sticker_reply" },
              });
              continue;
            }
          } catch (err) {
            console.error("[STICKER] Check failed:", err);
          }
        }

        if (lineUserId) {
          const [
            { getNonTextMessage },
            { getDraft, formatDraftForDisplay },
            { getMainMenuButtons, getDraftEditorButtons }
          ] = await Promise.all([
            import("./services/uxCopy"),
            import("./core/draftStore"),
            import("./ui/quickReplies"),
          ]);

          let summary = '';
          let hasDraft = false;
          const lineLink = await getLineLink(lineUserId);
          if (lineLink?.uid) {
            const draft = await getDraft(lineLink.uid);
            if (draft) {
              hasDraft = true;
              summary = `\n\n${formatDraftForDisplay(draft)}`;
            }
          }

          const message = `${getNonTextMessage(hasDraft)}${summary}`;
          const quickReply = hasDraft ? getDraftEditorButtons(false) : getMainMenuButtons();

          await sendReplyOrPush({
            replyToken: event.replyToken,
            to: lineUserId,
            messages: [{
              type: "text",
              text: message,
              quickReply: { items: quickReply },
            }],
            accessToken,
            traceContext: { ...context, stage: "ack_sent" },
          });
        }
        continue;
      }

    }

    // ✅ FIX: Await all async processing BEFORE sending 200
    // Gen1 throttles CPU after res.send() → causes 17-65s delay
    if (asyncTasks.length > 0) {
      await Promise.all(asyncTasks);
    }
    res.status(200).send("OK");
  });

/**
 * Process message asynchronously (after webhook returns 200)
 * Uses pushMessage instead of replyMessage for results
 */
async function processMessageAsync(
  lineUserId: string,
  messageText: string,
  lineClient: {
    pushMessage: (params: { to: string; messages: Array<{ type: string; text?: string; quickReply?: { items: unknown[] } }> }) => Promise<void>;
    replyMessage: (params: any) => Promise<void>;
  },
  db: admin.firestore.Firestore,
  accessToken: string,
  context: TraceContext
): Promise<void> {
  // ✅ OPTIMIZATION: Parallelize imports (avoid Firestore read for fast-path intents)
  const [
    { safePushMessage: safePush },
    { recognizeIntent, Intent },
  ] = await Promise.all([
    import("./utils/asyncSafety"),
    import("./core/conversationOrchestrator"),
  ]);

  logWithTrace("[ASYNC_START]", { ...context, stage: "processing_start" }, "Processing message", {
    message_length: messageText.length,
  });

  // Helper: Safe push message (never throws) - wrapped to match expected signature
  const pushMessage = async (text: string): Promise<void> => {
    await safePush(lineUserId, text, accessToken, context);
    // Return void regardless of success/failure (errors handled by safePush)
  };

  // ============ JARVIS AI ASSISTANT ============
  // When unified brain is enabled, skip Jarvis routing — AI is handled in UNKNOWN fallback instead
  const { getUnifiedBrainEnabled: _getUBrain } = await import("./shared/config");
  const _skipJarvisRouting = _getUBrain();

  // Check if user wants to activate EzDoc AI mode
  const jarvisTrimmed = messageText.trim();
  const preflightIntent = recognizeIntent(messageText);
  const {
    isExplicitJarvisActivation,
    shouldPreferDeterministicDocumentFlow,
  } = await import("./jarvis");
  const isJarvisActivation = !_skipJarvisRouting && isExplicitJarvisActivation(jarvisTrimmed);

  let hasActiveDeterministicDraft = false;
  if (!_skipJarvisRouting) {
    try {
      const { getLineLink } = await import("./core/lineLinkService");
      const linkedUser = await getLineLink(lineUserId);
      if (linkedUser?.status === "ACTIVE" && linkedUser.uid) {
        const { getDraft } = await import("./core/draftStore");
        hasActiveDeterministicDraft = !!(await getDraft(linkedUser.uid));
      }
    } catch (draftRouteErr) {
      console.warn("[JARVIS_ROUTE] Failed to check deterministic draft state:", draftRouteErr);
    }
  }

  const isCashPaymentPhrase = /^(?:จ่ายเงินสด|จ่ายสด|ชำระเงินสด|เงินสด)$/i.test(jarvisTrimmed);
  if (isCashPaymentPhrase) {
    await pushMessage(
      "ถ้าลูกค้าจ่ายแล้ว ให้พิมพ์ \"ชำระแล้ว INV-...\" หรือ \"ยืนยันรับเงิน INV-...\" ได้เลยครับ\n" +
      "ถ้ายังเป็นใบเสนอราคาอยู่ ให้ทำใบวางบิลก่อน แล้วค่อยบันทึกรับเงินครับ"
    );
    return;
  }

  const shouldBypassJarvisForDeterministicCommand =
    preflightIntent !== Intent.UNKNOWN ||
    shouldPreferDeterministicDocumentFlow(jarvisTrimmed) ||
    hasActiveDeterministicDraft;

  if (isJarvisActivation) {
    const { setJarvisMode } = await import("./jarvis");
    await setJarvisMode(lineUserId, true, db);
    await lineClient.pushMessage({
      to: lineUserId,
      messages: [{
        type: "text",
        text: "🤖 EzDoc AI พร้อมให้บริการครับ!\n\n" +
          "สั่งได้เลย เช่น:\n" +
          '• "ออกใบเสนอราคาให้คุณบูล 50,000"\n' +
          '• "ออกใบเสร็จให้ลูกค้า ABC 3 รายการ"\n' +
          '• "สรุปยอดขายเดือนนี้"\n\n' +
          'พิมพ์ "ปิด ai" เพื่อกลับโหมด EzDoc ปกติ',
        quickReply: {
          items: [
            { type: "action", action: { type: "message", label: "📋 ออกใบเสนอราคา", text: "ออกใบเสนอราคา" } },
            { type: "action", action: { type: "message", label: "🧾 ออกใบวางบิล", text: "ออกใบวางบิล" } },
            { type: "action", action: { type: "message", label: "💰 ออกใบเสร็จ", text: "ออกใบเสร็จ" } },
            { type: "action", action: { type: "message", label: "🔄 ปิด AI", text: "ปิด ai" } },
          ],
        },
      }],
    });
    return;
  }

  // Check if user is in Jarvis mode → route to Jarvis handler
  // (skipped when unified brain is active — all messages go through intent recognition first)
  if (!_skipJarvisRouting) {
    const _jarvisT0 = Date.now();
    const { isJarvisUser, isJarvisIntent, handleJarvisMessage, setJarvisMode } = await import("./jarvis");
    console.log(`[PERF] Jarvis import: ${Date.now() - _jarvisT0}ms`);
    const inJarvisMode = await isJarvisUser(lineUserId, db);

    if (shouldBypassJarvisForDeterministicCommand) {
      if (inJarvisMode) {
        await setJarvisMode(lineUserId, false, db);
        console.log(`[JARVIS_ROUTE] Switched ${toSafeId(lineUserId)} back to deterministic flow`);
      }
    } else if (inJarvisMode || isJarvisIntent(jarvisTrimmed)) {
      // Enable Jarvis mode only for explicit AI usage / non-deterministic intents
      if (!inJarvisMode && isJarvisIntent(jarvisTrimmed)) {
        await setJarvisMode(lineUserId, true, db);
      }

      const linkedJarvisUser = await getLineLink(lineUserId);
      const effectiveJarvisUserId =
        linkedJarvisUser?.status === 'ACTIVE' && linkedJarvisUser.uid
          ? linkedJarvisUser.uid
          : lineUserId;

      console.log(`[PERF] Jarvis routing total: ${Date.now() - _jarvisT0}ms`);
      await handleJarvisMessage({
        lineUserId,
        userId: effectiveJarvisUserId,
        messageText: jarvisTrimmed,
        pushMessage,
        pushMessages: async (messages) => {
          await lineClient.pushMessage({
            to: lineUserId,
            messages: messages as any,
          });
        },
        traceId: context.traceId,
        db,
      });
      return;
    }
  } // end !_skipJarvisRouting
  // ============ END JARVIS ============

  // Detect intent early to provide context-aware linking message
  const intent = preflightIntent;
  const trimmed = messageText.trim();
  const isMenuCommand = /^(เมนู|menu)$/i.test(trimmed);

  // ✅ FAST-PATH: Menu/Help/Usage (no Firestore reads)
  if (isMenuCommand || intent === Intent.HELP || intent === Intent.USAGE_GUIDE) {
    const { getHelpSummary, getUsageGuideSimple } = await import("./services/uxCopy");
    const { getMainMenuButtons } = await import("./ui/quickReplies");
    const quickReply = getMainMenuButtons();
    let plan: 'FREE' | 'PRO' | 'TEAM' = 'FREE';

    if (!isMenuCommand) {
      const lineLink = await getLineLink(lineUserId);
      if (lineLink?.uid) {
        const { getUserPlan } = await import("./core/planService");
        plan = await getUserPlan(lineLink.uid);
      }
    }

    const text = isMenuCommand
      ? "บี๊บ! เมนูพร้อมแล้วครับ เลือกได้เลย"
      : intent === Intent.HELP
        ? getHelpSummary(plan)
        : getUsageGuideSimple(plan);

    await lineClient.pushMessage({
      to: lineUserId,
      messages: [
        {
          type: "text",
          text,
          quickReply: { items: quickReply },
        },
      ],
    });
    return;
  }

  const lineLinkResult = await getLineLink(lineUserId);
  const isPurchaseIntent = intent === Intent.BUY_PACKAGE_199 || intent === Intent.BUY_PACKAGE_279 || intent === Intent.BUY_PACKAGE_3990;
  const packageType = isPurchaseIntent
    ? (intent === Intent.BUY_PACKAGE_199 ? 99 : intent === Intent.BUY_PACKAGE_279 ? 279 : 3990)
    : undefined;

  // Resolve Firebase UID from line_links (NEW: OAuth-based linking)
  let lineLink = lineLinkResult;

  // ✅ FIX 2: Validate lineLink status and uid (must be ACTIVE and have uid)
  if (!lineLink || lineLink.status !== 'ACTIVE' || !lineLink.uid || lineLink.uid.trim() === '') {
    // ✅ GUARD: Block purchase flow if user is not linked
    if (isPurchaseIntent) {
      console.log(`[BUY_FLOW_BLOCKED] reason=account_not_linked, lineUserId=${toSafeId(lineUserId)}, intent=${intent}`);

      // ✅ Analytics: Log purchase blocked event (fire-and-forget)
      (async () => {
        try {
          await db.collection('analytics_events').add({
            event: 'purchase_blocked_not_linked',
            lineUserId,
            packageType,
            reason: 'NOT_LINKED',
            source: 'LINE',
            traceId: context.traceId,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            expiresAt: admin.firestore.Timestamp.fromMillis(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year TTL
          });
        } catch (err) {
          // Non-blocking: analytics failure should not affect flow
          console.warn(`[analytics] Failed to log purchase_blocked_not_linked:`, err);
        }
      })();

      // Send explicit message for purchase intent
      await pushMessage("โอ๊ะ! ต้องเชื่อมต่อบัญชี LINE ก่อนซื้อแพ็คนะครับ\nพิมพ์ \"เชื่อมต่อ\" เพื่อเริ่มได้เลยเจ้านาย");
    }

    // ✅ TRIAL MODE: Allow 1 free quotation before forcing link
    const trialAllowedIntents = new Set([
      Intent.CREATE_QUOTATION,
      Intent.EDIT,
      Intent.CONFIRM,
      Intent.HELP,
      Intent.USAGE_GUIDE,
      Intent.UNKNOWN,
    ]);
    const allowGuestTrial = trialAllowedIntents.has(intent);

    if (allowGuestTrial) {
      try {
        const { getOrCreateGuestLink } = await import("./core/lineLinkService");
        lineLink = await getOrCreateGuestLink(lineUserId);
      } catch (guestErr) {
        console.warn("[GUEST_LINK_FAIL] Unable to create guest link:", guestErr);
      }
    }

    if (lineLink && lineLink.uid) {
      // Continue as guest trial (skip link prompt)
      logWithTrace(
        "[GUEST_TRIAL_LINKED]",
        { traceId: context.traceId, lineUserId: toSafeId(lineUserId), eventType: "guest_trial", stage: "linked" },
        "Guest trial link created"
      );
    } else {
      // ✅ FIX 3: Store original intent before linking (but NOT for LINK_ACCOUNT)
      // Only store intents that have real effects (purchase, document creation, etc.)
      if (intent !== Intent.LINK_ACCOUNT) {
        try {
          const crypto = await import("crypto");
          const intentHash = crypto.createHash('sha256').update(messageText).digest('hex');
          await db.collection('pending_intents').doc(lineUserId).set({
            intent: messageText,
            intentHash,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            expiresAt: admin.firestore.Timestamp.fromMillis(Date.now() + 10 * 60 * 1000),
            traceId: context.traceId,
            status: 'PENDING',
            resumeCount: 0,
          });
          logWithTrace(
            "[INTENT_STORED]",
            { ...context, eventType: "intent_stored" },
            "Stored intent for resume after linking",
            { intent_hash: intentHash.substring(0, 8) }
          );
        } catch (storeErr) {
          console.warn(`[INTENT_STORE_FAILED] Failed to store intent:`, storeErr);
        }
      } else {
        logWithTrace(
          "[INTENT_SKIPPED]",
          { ...context, eventType: "intent_skipped" },
          `Skipped storing intent ${intent} (LINK_ACCOUNT/HELP/USAGE_GUIDE should not be resumed)`
        );
      }

      // User not linked yet - send LIFF linking prompt via push message
      // LIFF URL: Use LINE's native LIFF app instead of web redirect
      const LIFF_ID = getLineLiffId() || "2008406529-Y6Bh2fT5";
      const linkUrl = `https://liff.line.me/${LIFF_ID}`;

      logWithTrace(
        "[LINK_PROMPT_URL]",
        { traceId: "n/a", lineUserId: toSafeId(lineUserId), eventType: "account_linking", stage: "url_generated" },
        "Generated link URL"
      );

      // Send button template message via push
      const buttonResponse = await fetch(LINE_API.PUSH, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          to: lineUserId,
          messages: [
            {
              type: "template",
              altText: "เชื่อมต่อบัญชีเพื่อใช้งาน",
              template: {
                type: "buttons",
                text: "บี๊บ! ยังไม่ได้เชื่อมต่อบัญชีครับเจ้านาย\nกดปุ่มด้านล่างเพื่อเข้าสู่ระบบนะ",
                actions: [
                  {
                    type: "uri",
                    label: "🔗 เชื่อมต่อบัญชี",
                    uri: linkUrl,
                  },
                ],
              },
            },
          ],
        }),
      });

      if (!buttonResponse.ok) {
        const errorText = await buttonResponse.text();
        logWithTrace(
          "[ASYNC_LINK_PROMPT_FAILED]",
          { traceId: "n/a", lineUserId, eventType: "account_linking", stage: "button_push_failed" },
          `LINE API error: ${buttonResponse.status}`,
          { statusText: buttonResponse.statusText, body: errorText, linkUrl }
        );
        throw new Error(`LINE API error: ${buttonResponse.status} ${buttonResponse.statusText}`);
      }

      logWithTrace(
        "[LINK_PROMPT_SENT]",
        { traceId: "n/a", lineUserId, eventType: "account_linking", stage: "button_sent" },
        `Link button sent successfully`
      );

      return;
    }
  }

  // ✅ GUARD: Check if lineLink exists but uid is missing/invalid
  if (!lineLink.uid || lineLink.uid.trim() === '') {
    console.log(`[BUY_FLOW_BLOCKED] reason=linked_but_missing_uid, line=${toSafeId(lineUserId)}, link_status=${lineLink.status}, has_uid=${!!lineLink.uid}`);

    if (isPurchaseIntent) {
      // ✅ Analytics: Log purchase blocked event (fire-and-forget)
      (async () => {
        try {
          await db.collection('analytics_events').add({
            event: 'purchase_blocked_not_linked',
            lineUserId,
            packageType,
            reason: 'NOT_LINKED',
            source: 'LINE',
            traceId: context.traceId,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            expiresAt: admin.firestore.Timestamp.fromMillis(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year TTL
          });
        } catch (err) {
          // Non-blocking: analytics failure should not affect flow
          console.warn(`[analytics] Failed to log purchase_blocked_not_linked:`, err);
        }
      })();

      await pushMessage("โอ๊ะ! ต้องเชื่อมต่อบัญชี LINE ก่อนซื้อแพ็คนะครับ\nพิมพ์ \"เชื่อมต่อ\" เพื่อเริ่มได้เลยเจ้านาย");
    }

    // Send LIFF linking prompt
    const LIFF_ID = getLineLiffId() || "2008406529-Y6Bh2fT5";
    const linkUrl = `https://liff.line.me/${LIFF_ID}`;

    const buttonResponse = await fetch(LINE_API.PUSH, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        to: lineUserId,
        messages: [
          {
            type: "template",
            altText: "เชื่อมต่อบัญชีเพื่อใช้งาน",
            template: {
              type: "buttons",
              text: "บี๊บ! ยังไม่ได้เชื่อมต่อบัญชีครับเจ้านาย\nกดปุ่มด้านล่างเพื่อเข้าสู่ระบบนะ",
              actions: [
                {
                  type: "uri",
                  label: "🔗 เชื่อมต่อบัญชี",
                  uri: linkUrl,
                },
              ],
            },
          },
        ],
      }),
    });

    if (!buttonResponse.ok) {
      const errorText = await buttonResponse.text();
      console.error(`[LINK_PROMPT_FAILED] LINE API error: ${buttonResponse.status}`, errorText);
    }

    return;
  }

  // ✅ FIX 1: Check for pending intent and resume
  try {
    const pendingIntentRef = db.collection('pending_intents').doc(lineUserId);
    // ✅ Use transaction for atomic resume
    const storedIntent = await db.runTransaction(async (tx) => {
      const pendingIntentDoc = await tx.get(pendingIntentRef);
      if (!pendingIntentDoc.exists) {
        return null;
      }

      const intentData = pendingIntentDoc.data();
      if (!intentData) {
        return null;
      }

      // Check expiration
      const expiresAt = intentData.expiresAt as admin.firestore.Timestamp | undefined;
      if (!expiresAt || expiresAt.toMillis() <= Date.now()) {
        tx.delete(pendingIntentRef); // Clean up expired
        return null;
      }

      // Check status (idempotency)
      const status = intentData.status as string | undefined;
      if (status === 'RESUMED') {
        // Already resumed, skip
        return null;
      }

      // Check resume count (prevent infinite retries)
      const resumeCount = (intentData.resumeCount as number | undefined) || 0;
      if (resumeCount >= 3) {
        tx.delete(pendingIntentRef); // Max retries reached
        return null;
      }

      // Atomic update: Mark as RESUMED and increment count
      tx.update(pendingIntentRef, {
        status: 'RESUMED',
        resumedAt: admin.firestore.FieldValue.serverTimestamp(),
        resumeCount: resumeCount + 1,
      });

      return intentData.intent as string;
    });

    if (storedIntent) {
      const intentHash = crypto.createHash('sha256').update(storedIntent).digest('hex').substring(0, 8);
      logWithTrace(
        "[INTENT_RESUMED]",
        { ...context, eventType: "intent_resumed" },
        "Resuming stored intent",
        { intent_hash: intentHash }
      );
      // Delete after successful processing (not before)
      await pendingIntentRef.delete();
      await processMessageAsync(lineUserId, storedIntent, lineClient, db, accessToken, context);
      return;
    }
  } catch (resumeErr) {
    console.warn(`[INTENT_RESUME_FAILED] Failed to resume intent:`, resumeErr);
    // Continue - process current message normally
  }

  const firebaseUserId = lineLink.uid;
  const businessId = lineLink.businessId;
  console.log(
    `[LINK_CONFIRMED] ✅ line=${toSafeId(lineUserId)} → uid=${toSafeId(firebaseUserId)}, business=${businessId ? businessId.substring(0, 6) : 'n/a'}`
  );

  // Note: firebaseUserId validation is already done above (linked_but_missing_uid guard)
  // This check is redundant but kept for safety
  if (!firebaseUserId || firebaseUserId.trim() === '') {
    console.log(`[BUY_FLOW_ABORTED] reason=missing_firebaseUserId_after_link, line=${toSafeId(lineUserId)}, link_status=${lineLink.status}, has_uid=${!!lineLink.uid}`);
    await pushMessage("โอ๊ะ! ไม่พบข้อมูลผู้ใช้ครับเจ้านาย\nเชื่อมต่อบัญชีอีกครั้งได้เลยนะ");
    return;
  }

  // Check if user needs onboarding (first-time user)
  // Send proactive welcome if first message and no onboarding completed
  try {
    const { needsOnboarding } = await import("./services/onboardingService");
    const needsOnboard = await needsOnboarding(firebaseUserId);
    if (needsOnboard) {
      console.log(`[ONBOARDING] 🆕 First-time user detected: ${firebaseUserId}`);

      // Send welcome message with buttons (proactive, non-blocking)
      // Only send if user hasn't sent a command yet (this is checked in decideFirstMessageOrFallback)
      // The welcome will be sent by decideFirstMessageOrFallback if needed
    }
  } catch (onboardErr) {
    console.warn(`[ONBOARDING] Error checking onboarding status: ${onboardErr}`);
  }

  // Intent already detected above (for purchase intent blocking)
  console.log(`[INTENT_RECOGNIZED] 🎯 intent=${intent}, user=${toSafeId(firebaseUserId)}`);

  // ✅ RENEWAL CONFIRMATION FLOW (explicit confirm/cancel)
  if (intent === Intent.CONFIRM_RENEWAL || intent === Intent.CANCEL) {
    try {
      const now = Date.now();
      const pendingRef = db.collection('pending_renewals').doc(firebaseUserId);
      const pendingDoc = await pendingRef.get();
      if (pendingDoc.exists) {
        const pending = pendingDoc.data() as {
          expiresAt?: admin.firestore.Timestamp;
          packageType?: number;
          lineUserId?: string;
        };
        const expiresAtMs = pending?.expiresAt?.toMillis() || 0;
        const isExpired = !expiresAtMs || expiresAtMs <= now;
        if (isExpired) {
          await pendingRef.delete();
        } else if (intent === Intent.CANCEL) {
          await pendingRef.delete();
          await pushMessage("โอเค ยกเลิกการต่ออายุแพ็กแล้วนะครับเจ้านาย");
          return;
        } else if (intent === Intent.CONFIRM_RENEWAL) {
          const packageType = (pending.packageType as 99 | 279 | 399 | 2790 | 3990 | 990 | undefined) || 99;
          const { createPurchase } = await import("./services/purchaseService");
          const result = await createPurchase({
            userId: firebaseUserId,
            lineUserId,
            packageType,
            allowRenewal: true,
          });
          await pendingRef.delete();
          await pushMessage(result.message || "โอ๊ะ! สร้างรายการต่ออายุไม่สำเร็จครับเจ้านาย\nลองใหม่ได้เลยนะ");
          return;
        }
      } else if (intent === Intent.CONFIRM_RENEWAL) {
        await pushMessage("โอ๊ะ! ไม่พบคำขอต่ออายุครับเจ้านาย\nพิมพ์ ซื้อแพ็ค 99 เพื่อเริ่มใหม่นะ");
        return;
      }
    } catch (renewErr) {
      console.warn('[RENEWAL_FLOW_FAILED]', renewErr);
      if (intent === Intent.CONFIRM_RENEWAL) {
        await pushMessage("โอ๊ะ! ต่ออายุไม่สำเร็จครับเจ้านาย\nลองใหม่ได้เลยนะ");
        return;
      }
    }
  }

  // Handle purchase intents (BUY_PACKAGE_199, BUY_PACKAGE_279, BUY_PACKAGE_3990)
  // ✅ GUARD: Only reachable if lineLink exists AND lineLink.uid is valid (checked above)
  if (intent === Intent.BUY_PACKAGE_199 || intent === Intent.BUY_PACKAGE_279 || intent === Intent.BUY_PACKAGE_3990) {
    console.log(`[PURCHASE_INTENT_DETECTED] 🎯 intent=${intent}, user=${toSafeId(firebaseUserId)}, line=${toSafeId(lineUserId)}`);
    await handlePurchaseIntent(firebaseUserId, lineUserId, intent, pushMessage, accessToken);
    return;
  }

  // Check for active draft only when needed for fallback (avoid extra read)
  let hasActiveDraft = false;
  const shouldLoadDraftForFallback = !intent || intent === Intent.UNKNOWN;
  if (shouldLoadDraftForFallback && firebaseUserId) {
    const { getDraft } = await import("./core/draftStore");
    const draft = await getDraft(firebaseUserId);
    hasActiveDraft = !!draft;
  }

  // Decide: welcome, fallback, or pass
  const decision = await decideFirstMessageOrFallback({
    db,
    userId: firebaseUserId || "",
    text: messageText,
    intent,
    hasActiveDraft,
  });

  // Handle decision
  // ✅ UNIFIED_BRAIN: Try AI fallback before sending generic FALLBACK messages
  // Skip when user has active draft — let conversationHandler + forgivingParser handle item/customer data
  if (decision.action === "REPLIED" && decision.kind === "FALLBACK" && !hasActiveDraft && firebaseUserId && lineUserId) {
    const { getUnifiedBrainEnabled } = await import("./shared/config");
    if (getUnifiedBrainEnabled()) {
      try {
        const { handleWithAIFallback } = await import("./core/aiFallbackBrain");
        const aiResult = await handleWithAIFallback({
          userId: firebaseUserId,
          businessId: businessId || "",
          lineUserId,
          messageText,
          traceId: context?.traceId || "",
        });
        if (aiResult.handled) {
          const { getMainMenuButtons } = await import("./ui/quickReplies");
          const qr = getMainMenuButtons();
          const aiMessages: Array<{ type: string; text: string; quickReply?: { items: unknown[] } }> = [
            { type: "text", text: aiResult.message, quickReply: { items: qr.slice(0, 13) } },
          ];
          await lineClient.pushMessage({ to: lineUserId, messages: aiMessages as any });
          console.log(`[ASYNC_REPLIED] 📤 Sent UNIFIED_BRAIN response to ${toSafeId(lineUserId)}`);
          return;
        }
      } catch (brainErr) {
        console.warn("[UNIFIED_BRAIN] lineFirstMessage fallback error:", brainErr);
      }
    }
  }

  // ✅ When FALLBACK + active draft → forward to conversationHandler so forgivingParser can handle items
  if (decision.action === "REPLIED" && decision.kind === "FALLBACK" && hasActiveDraft) {
    console.log(`[ASYNC_FORWARDING] ➡️ FALLBACK + active draft → forwarding to conversationHandler for forgivingParser`);
    try {
      await handleConversationMessage({
        userId: firebaseUserId || "",
        businessId,
        messageText,
        replyToken: "",
        lineUserId: lineUserId || undefined,
        traceId: context.traceId,
        lineClient: {
          replyMessage: async (params: {
            messages: Array<any>;
          }) => {
            if (lineUserId && params.messages && params.messages.length > 0) {
              await lineClient.pushMessage({
                to: lineUserId,
                messages: params.messages,
              });
            }
          },
        },
      });
    } catch (convErr) {
      console.error("[ASYNC_CONV_HANDLER] draft fallback error:", convErr);
    }
    return;
  }

  if (decision.action === "REPLIED") {
    // Send via push message with quickReply support
    if (lineUserId) {
      const messages: Array<{
        type: string;
        text: string;
        quickReply?: { items: unknown[] };
      }> = decision.messages.map((text) => ({
        type: "text",
        text,
      }));

      const structuredMessages = decision.structuredMessages || [];
      const outboundMessages = [
        ...messages,
        ...structuredMessages as Array<{
          type: string;
          text: string;
          quickReply?: { items: unknown[] };
        }>,
      ];

      // Add quickReply to last message if provided
      const lastMessage = outboundMessages[outboundMessages.length - 1];
      if (
        decision.quickReply &&
        decision.quickReply.length > 0 &&
        outboundMessages.length > 0 &&
        lastMessage?.type === "text"
      ) {
        outboundMessages[outboundMessages.length - 1].quickReply = {
          items: decision.quickReply.slice(0, 13),
        };
      }

      await lineClient.pushMessage({
        to: lineUserId,
        messages: outboundMessages as any,
      });
    }
    console.log(
      `[ASYNC_REPLIED] 📤 Sent ${decision.kind} response to ${toSafeId(lineUserId)}`
    );
    return;
  }

  if (decision.action === "FORWARD") {
    const forwardedText = decision.forwardText || messageText;
    // Pass to main conversation handler
    console.log(
      `[ASYNC_FORWARDING] ➡️ Intent recognized, forwarding to conversation handler`
    );
    try {
      await handleConversationMessage({
        userId: firebaseUserId || "",
        businessId,
        messageText: forwardedText,
        replyToken: "", // Not used in async mode
        lineUserId: lineUserId || undefined, // For admin auth
        traceId: context.traceId, // ✅ FIX 6: Pass correlation ID
        lineClient: {
          replyMessage: async (params: {
            messages: Array<any>; // Allow any message type (text, template, etc.)
          }) => {
            // Convert to push message - support text, template, and other message types
            if (lineUserId && params.messages && params.messages.length > 0) {
              // Pass messages directly to pushMessage (supports all LINE message types)
              await lineClient.pushMessage({
                to: lineUserId,
                messages: params.messages,
              });
            }
          },
        },
      });
    } catch (err) {
      console.error("[ASYNC_CONVERSATION_ERROR] ❌ Error in conversation handler:", err);
      await pushMessage(
        "โอ๊ะ! เกิดข้อผิดพลาดในการประมวลผลครับเจ้านาย\nลองใหม่ได้เลยนะ"
      );
    }
  }

  // NOTE: Error handling is done by withAsyncSafety wrapper
  // No need for try-catch here - any error will be caught and fallback sent automatically
}

/**
 * Handle purchase intent (BUY_PACKAGE_199, BUY_PACKAGE_279, BUY_PACKAGE_3990)
 * 
 * CRITICAL: Reply immediately (<300ms), then generate QR async
 * The purchaseService.createPurchase() handles async QR generation and push
 */
/**
 * Handle purchase intent (BUY_PACKAGE_199, BUY_PACKAGE_279, BUY_PACKAGE_3990)
 * 
 * CRITICAL: 
 * - Reply immediately (<300ms)
 * - QR generation is fire-and-forget (async, no await)
 * - Never block webhook on QR generation
 */
async function handlePurchaseIntent(
  uid: string,
  lineUserId: string,
  intent: string,
  pushMessage: (text: string, quickReply?: unknown) => Promise<void>,
  _accessToken: string
): Promise<void> {
  void _accessToken;
  const { Intent } = await import("./core/conversationOrchestrator");
  const { generateTraceId } = await import("./utils/asyncSafety");

  // ✅ D1: Generate traceId for buy pack flow
  const traceId = generateTraceId();

  // ✅ GUARD 1: Validate userId
  if (!uid || uid.trim() === '') {
    console.log(`[BUY_FLOW_ABORTED] traceId=${traceId}, reason=missing_userId, line=${toSafeId(lineUserId)}, intent=${intent}`);
    await pushMessage("โอ๊ะ! ไม่พบข้อมูลผู้ใช้ครับเจ้านาย\nเชื่อมต่อบัญชีอีกครั้งได้เลยนะ");
    return;
  }

  // ✅ GUARD 2: Validate lineUserId
  if (!lineUserId || lineUserId.trim() === '') {
    console.log(`[BUY_FLOW_ABORTED] traceId=${traceId}, reason=missing_lineUserId, user=${toSafeId(uid)}, intent=${intent}`);
    await pushMessage("โอ๊ะ! ไม่พบข้อมูล LINE ครับเจ้านาย\nลองใหม่ได้เลยนะ");
    return;
  }

  try {
    // Determine package type
    const packageType =
      intent === Intent.BUY_PACKAGE_199 ? 99 :
        intent === Intent.BUY_PACKAGE_3990 ? 3990 :
          279;

    console.log(`[BUY_FLOW_STARTED] traceId=${traceId}, user=${toSafeId(uid)}, line=${toSafeId(lineUserId)}, package=${packageType}, intent=${intent}`);

    // ✅ Renewal confirmation: allow early renewal but require explicit confirm
    try {
      const now = admin.firestore.Timestamp.now();
      const { getOrCreateSubscription } = await import("./core/subscriptionService");
      const { normalizePlan } = await import("./core/planService");
      const subscription = await getOrCreateSubscription(uid);
      const currentPlan = normalizePlan(subscription.plan as string);
      const targetPlan = packageType === 99 ? 'PRO' : 'TEAM';
      const periodEnd = subscription.periodEnd;
      const isActive =
        subscription.status === 'ACTIVE' &&
        periodEnd &&
        periodEnd.toMillis() > now.toMillis();
      const planRank: Record<string, number> = { FREE: 0, PRO: 1, TEAM: 2 };
      if (isActive) {
        const currentRank = planRank[currentPlan] ?? 0;
        const targetRank = planRank[targetPlan] ?? 0;
        if (targetRank < currentRank) {
          const until = periodEnd?.toDate().toLocaleDateString('th-TH') || 'ไม่ทราบ';
          const planLabel = currentPlan === 'TEAM' ? 'Team' : currentPlan === 'PRO' ? 'Pro' : 'Free';
          const targetLabel = targetPlan === 'TEAM' ? 'Team' : targetPlan === 'PRO' ? 'Pro' : 'Free';
          await pushMessage(
            `คุณมีแพ็ก ${planLabel} ใช้งานได้ถึง ${until}\n` +
            `ไม่สามารถดาวน์เกรดเป็น ${targetLabel} ได้ครับเจ้านาย`
          );
          return;
        }
        if (targetRank === currentRank) {
          const until = periodEnd?.toDate().toLocaleDateString('th-TH') || 'ไม่ทราบ';
          const planLabel = currentPlan === 'TEAM' ? 'Team' : currentPlan === 'PRO' ? 'Pro' : 'Free';
          const db = getDb();
          await db.collection('pending_renewals').doc(uid).set({
            userId: uid,
            lineUserId,
            packageType,
            currentPlan,
            targetPlan,
            periodEnd,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            expiresAt: admin.firestore.Timestamp.fromMillis(Date.now() + 30 * 60 * 1000),
          }, { merge: true });
          await pushMessage(
            `คุณมีแพ็ก ${planLabel} ใช้งานได้ถึง ${until}\n` +
            `ต้องการต่ออายุล่วงหน้าไหมครับเจ้านาย?\n\n` +
            `พิมพ์ ยืนยันต่ออายุแพ็ก\n` +
            `หรือพิมพ์ ยกเลิก`
          );
          return;
        }
      }
    } catch (renewCheckErr) {
      console.warn(`[handlePurchaseIntent] Renewal check failed (non-blocking):`, renewCheckErr);
    }

    // Create purchase record and trigger async QR generation
    // This returns immediately - QR generation is fire-and-forget
    const { createPurchase } = await import("./services/purchaseService");
    const result = await createPurchase({
      userId: uid,
      lineUserId,
      packageType: packageType as 99 | 279 | 399 | 2790 | 3990 | 990,
    });

    // ✅ D1: Log buy pack event (non-blocking)
    if (result.purchaseId) {
      const { appendPaymentEvent } = await import("./services/paymentEvents");
      appendPaymentEvent(result.purchaseId, {
        event: 'BUY_PACK_STARTED',
        traceId,
        handler: 'lineWebhookV1',
        result_code: result.purchaseId ? 'OK' : 'ERR_CREATE_FAILED',
        meta: {
          packageType,
          intent,
        },
      }).catch(err => {
        console.warn(`[handlePurchaseIntent] Failed to log event (non-blocking):`, err);
      });
    }

    // ✅ GUARD 3: Check if purchase creation failed
    if (!result.purchaseId || result.purchaseId === '') {
      console.log(`[BUY_FLOW_ABORTED] reason=purchase_creation_failed, user=${toSafeId(uid)}`);
      await pushMessage(result.message || "โอ๊ะ! สร้างรายการชำระเงินไม่สำเร็จครับเจ้านาย\nลองใหม่ได้เลยนะ");
      return;
    }

    console.log(`[PURCHASE_CREATED] ✅ purchaseId=${result.purchaseId}, user=${toSafeId(uid)}, package=${packageType}`);

    // Reply immediately (QR will be pushed async via separate LINE push)
    await pushMessage(result.message);

    console.log(`[PURCHASE_INITIATED] 📤 purchaseId=${result.purchaseId}, line=${toSafeId(lineUserId)}`);
  } catch (error) {
    console.error(`[BUY_FLOW_ABORTED] reason=exception, user=${toSafeId(uid)}, line=${toSafeId(lineUserId)}, error:`, error);
    await pushMessage(
      "โอ๊ะ! เกิดข้อผิดพลาดในการสร้าง QR ครับเจ้านาย\nลองใหม่ได้เลยนะ"
    );
    // Don't re-throw - webhook should still return 200
  }
}

/**
 * Process slip image asynchronously (after webhook returns 200)
 * Download from LINE, upload to storage, mark purchase as PENDING_REVIEW
 */
// REMOVED: processSlipImageAsync
// Slip processing is NEVER allowed on image receive
// All slip processing happens in text handler (conversationHandler) only
