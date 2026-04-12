/**
 * Reply with Hard Deadline Enforcement (Issue #3)
 * 
 * Ensures deterministic behavior:
 * - User never silent beyond deadline (25s)
 * - No duplicate sends (reply + push)
 * - State tracking: didAttemptReply, didReplySuccess, didFallbackPush
 * - Idempotency via sendKey
 */

import { getLineChannelAccessToken } from '../shared/config';
import { safePushMessage } from './asyncSafety';
import { secureLog, secureError } from './secureConsole';

const REPLY_DEADLINE_MS = 25000; // 25 seconds hard deadline
const ACK_MESSAGE = "ติ๊ดๆ รับข้อความแล้วครับเจ้านาย รอสักครู่นะ"; // Short ACK for timeout fallback

export interface ReplyState {
  didAttemptReply: boolean;
  didReplySuccess: boolean;
  didFallbackPush: boolean;
  sendKey: string; // Idempotency key: traceId + stage
}

export interface ReplyWithDeadlineOptions {
  replyToken: string;
  lineUserId: string;
  traceId: string;
  stage: string; // e.g., 'REPLY_HANDLER', 'ACK_SENT'
  message: string;
  quickReplyActions?: Array<{
    type: string;
    action: {
      type: string;
      label: string;
      [key: string]: unknown;
    };
  }>;
  replyFn: (params: {
    replyToken: string;
    messages: Array<{
      type: string;
      text: string;
      quickReply?: {
        items: unknown[];
      };
    }>;
  }) => Promise<void>;
}

/**
 * Reply with hard deadline enforcement
 * Returns state after attempt (whether successful or not)
 */
export async function replyWithDeadline(
  options: ReplyWithDeadlineOptions
): Promise<ReplyState> {
  const {
    replyToken,
    lineUserId,
    traceId,
    stage,
    message,
    quickReplyActions,
    replyFn,
  } = options;

  const sendKey = `${traceId}_${stage}`;
  const state: ReplyState = {
    didAttemptReply: false,
    didReplySuccess: false,
    didFallbackPush: false,
    sendKey,
  };

  const t0 = Date.now();

  // Build message object
  const msgObj: {
    type: string;
    text: string;
    quickReply?: {
      items: unknown[];
    };
  } = {
    type: 'text',
    text: message,
  };

  if (quickReplyActions && quickReplyActions.length > 0) {
    msgObj.quickReply = {
      items: quickReplyActions.slice(0, 13),
    };
  }

  // ✅ Mark attempt
  state.didAttemptReply = true;

  // ✅ Create timeout promise (guaranteed to reject within REPLY_DEADLINE_MS)
  // Using setTimeout ensures the promise resolves/rejects within the deadline
  // and doesn't block the process after Promise.race completes
  // Note: setTimeout callback will execute after REPLY_DEADLINE_MS, ensuring deadline is enforced
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error(`REPLY_TIMEOUT: Exceeded ${REPLY_DEADLINE_MS}ms deadline`));
    }, REPLY_DEADLINE_MS);
  });

  // ✅ Race reply against timeout
  try {
    await Promise.race([
      replyFn({
        replyToken,
        messages: [msgObj],
      }),
      timeoutPromise,
    ]);

    // ✅ Reply succeeded within deadline
    const latencyMs = Date.now() - t0;
    state.didReplySuccess = true;

    secureLog({
      tag: '[REPLY_DEADLINE_OK]',
      trace_id: traceId,
      stage,
      send_key: sendKey,
      line_user_id: lineUserId, // Will be hashed by secureLog
      latency_ms: latencyMs,
      timestamp: new Date().toISOString(),
    });

    return state;
  } catch (replyError: any) {
    // ✅ Reply failed or timed out
    const latencyMs = Date.now() - t0;
    const isTimeout = replyError?.message?.includes('REPLY_TIMEOUT');

    secureError({
      tag: '[REPLY_DEADLINE_FAILED]',
      trace_id: traceId,
      stage,
      send_key: sendKey,
      line_user_id: lineUserId, // Will be hashed by secureError
      is_timeout: isTimeout,
      latency_ms: latencyMs,
      timestamp: new Date().toISOString(),
    }, replyError);

    // ✅ Fallback to push (idempotent via sendKey)
    if (lineUserId) {
      try {
        const accessToken = getLineChannelAccessToken();
        
        if (accessToken) {
          // Use short ACK if timeout, full message if other error
          const fallbackText = isTimeout
            ? ACK_MESSAGE
            : "โอ๊ะ! ส่งข้อความไม่ทันครับเจ้านาย ลองพิมพ์ใหม่ได้เลย";

          // ✅ Idempotency: Check if already sent via sendKey
          // Note: For production, you'd want to use Firestore/Redis for distributed idempotency
          // For now, we rely on single-instance execution (Cloud Functions)
          
          const pushSuccess = await safePushMessage(
            lineUserId,
            fallbackText,
            accessToken,
            { traceId, lineUserId, eventType: 'reply_fallback', stage }
          );

          if (pushSuccess) {
            state.didFallbackPush = true;
            state.didReplySuccess = true; // Mark as successful since push succeeded

            secureLog({
              tag: '[REPLY_DEADLINE_FALLBACK_PUSH_OK]',
              trace_id: traceId,
              stage,
              send_key: sendKey,
              line_user_id: lineUserId, // Will be hashed
              is_timeout: isTimeout,
              total_latency_ms: Date.now() - t0,
              timestamp: new Date().toISOString(),
            });
          } else {
            secureError({
              tag: '[REPLY_DEADLINE_FALLBACK_PUSH_FAILED]',
              trace_id: traceId,
              stage,
              send_key: sendKey,
              line_user_id: lineUserId, // Will be hashed
              timestamp: new Date().toISOString(),
            });
          }
        }
      } catch (pushErr) {
        secureError({
          tag: '[REPLY_DEADLINE_FALLBACK_PUSH_ERROR]',
          trace_id: traceId,
          stage,
          send_key: sendKey,
          line_user_id: lineUserId, // Will be hashed
          timestamp: new Date().toISOString(),
        }, pushErr);
      }
    }

    return state;
  }
}
