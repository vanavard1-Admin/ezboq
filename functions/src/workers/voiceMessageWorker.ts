import * as admin from "firebase-admin";
import { getDb } from "../core/firebaseAdmin";
import { getLineLink } from "../core/lineLinkService";
import { transcribeAudio } from "../jarvis/voiceService";
import { handleJarvisMessage } from "../jarvis";
import { downloadLineContent } from "../services/imageUploadService";
import { pushLineMessage, pushLineMessages } from "../services/lineService";
import { getLineChannelAccessToken } from "../shared/config";
import { safePushMessage } from "../utils/asyncSafety";

const JOBS_COLLECTION = "voice_message_jobs";

interface VoiceMessageJob {
  id?: string;
  line_user_id?: string;
  message_id?: string;
  status?: "PENDING" | "PROCESSING" | "DONE" | "FAILED";
  attempts?: number;
  traceId?: string;
}

export async function processVoiceMessageJob(jobId: string): Promise<void> {
  const db = getDb();
  const jobRef = db.collection(JOBS_COLLECTION).doc(jobId);

  const claimResult = await db.runTransaction(async (tx) => {
    const snap = await tx.get(jobRef);
    if (!snap.exists) {
      console.warn(`[VOICE_JOB_NOT_FOUND] jobId=${jobId}`);
      return { claimed: false as const };
    }

    const job = snap.data() as VoiceMessageJob;
    if (job.status !== "PENDING") {
      console.log(`[VOICE_JOB_SKIPPED] jobId=${jobId}, status=${job.status || "unknown"}`);
      return { claimed: false as const };
    }

    const attempts = (job.attempts || 0) + 1;
    tx.update(jobRef, {
      status: "PROCESSING",
      attempts,
      processing_started_at: admin.firestore.FieldValue.serverTimestamp(),
      error: admin.firestore.FieldValue.delete(),
    });

    return { claimed: true as const, job, attempts };
  });

  if (!claimResult.claimed) {
    return;
  }

  const { job } = claimResult;
  const lineUserId = job.line_user_id || "";
  const messageId = job.message_id || "";
  const traceId = job.traceId || `voice-${jobId}`;
  const accessToken = getLineChannelAccessToken();

  let contentType: string | null = null;
  let transcript = "";

  try {
    if (!lineUserId || !messageId) {
      throw new Error("VOICE_JOB_INVALID_PAYLOAD");
    }
    if (!accessToken) {
      throw new Error("LINE_CHANNEL_ACCESS_TOKEN not configured");
    }

    const { buffer, contentType: downloadedContentType } = await downloadLineContent(messageId, accessToken);
    contentType = downloadedContentType;

    await jobRef.set(
      {
        content_type: contentType,
        content_bytes: buffer.length,
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    transcript = await transcribeAudio(buffer, { contentType, traceId });

    if (!transcript || transcript.length < 2) {
      await pushLineMessage(
        lineUserId,
        "🎤 ฟังไม่ออกครับ ลองพูดใหม่ช้าๆ หรือพิมพ์ข้อความแทนได้เลย",
        accessToken
      );

      await jobRef.set(
        {
          status: "DONE",
          result: "NO_TRANSCRIPT",
          transcript: "",
          completed_at: admin.firestore.FieldValue.serverTimestamp(),
          updated_at: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      return;
    }

    await pushLineMessage(lineUserId, `🎤 ได้ยินว่า: "${transcript}"`, accessToken);

    const lineLink = await getLineLink(lineUserId);
    const userId = lineLink?.uid?.trim() ? lineLink.uid : lineUserId;

    await handleJarvisMessage({
      lineUserId,
      userId,
      messageText: transcript,
      pushMessage: async (text: string) => {
        await pushLineMessage(lineUserId, text, accessToken);
      },
      pushMessages: async (messages: Array<{ type: string; [key: string]: unknown }>) => {
        await pushLineMessages(lineUserId, messages as Array<Record<string, unknown>>, accessToken);
      },
      traceId,
      db,
    });

    await jobRef.set(
      {
        status: "DONE",
        result: "OK",
        transcript,
        user_id: userId,
        completed_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    console.log(
      `[VOICE_JOB_DONE] jobId=${jobId}, lineUserId=${lineUserId.slice(0, 8)}..., transcript_len=${transcript.length}`
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[VOICE_JOB_FAILED] jobId=${jobId}, traceId=${traceId}:`, error);

    await jobRef.set(
      {
        status: "FAILED",
        error: errorMessage,
        content_type: contentType,
        transcript,
        failed_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    if (lineUserId && accessToken) {
      await safePushMessage(
        lineUserId,
        "❌ ถอดเสียงไม่สำเร็จ ลองพิมพ์ข้อความแทนครับ",
        accessToken,
        {
          traceId,
          lineUserId,
          eventType: "voice_job",
          stage: "failed",
        }
      );
    }
  }
}
