/**
 * EzBOQ AI — Shared AI gateway + Gemma-backed project memory
 *
 * Callable function สำหรับถามคำถามเรื่องก่อสร้าง/ประเมินราคา
 * ใช้ได้จาก: EzBOQ เว็บ, LINE, Discord
 */
import * as functions from "firebase-functions/v1";
import { askEzboqAiGateway } from "../services/ezboqAiGateway";

export const ezboqAi = functions
  .region("asia-southeast1")
  .runWith({
    secrets: ["GEMINI_API_KEY"],
    memory: "256MB",
    timeoutSeconds: 30,
  })
  .https.onCall(async (data, context) => {
    const { question, maxResults, temperature } = data;

    if (!context.auth) {
      throw new functions.https.HttpsError("unauthenticated", "Must be signed in");
    }

    if (!question || typeof question !== "string" || question.trim().length < 2) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "question ต้องเป็นข้อความอย่างน้อย 2 ตัวอักษร",
      );
    }

    if (question.trim().length > 500) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "question ต้องไม่เกิน 500 ตัวอักษร",
      );
    }

    try {
      const safeMaxResults = typeof maxResults === "number"
        ? Math.max(1, Math.min(Math.floor(maxResults), 8))
        : 3;
      const safeTemperature = typeof temperature === "number"
        ? Math.max(0, Math.min(temperature, 1))
        : 0.3;

      const result = await askEzboqAiGateway(question.trim(), {
        maxResults: safeMaxResults,
        temperature: safeTemperature,
      });

      return {
        success: true,
        answer: result.answer,
        sources: result.sources,
        model: result.model,
        tokensUsed: result.tokensUsed,
        retrieval: result.retrieval,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("[ezboqAi] Error:", message);
      throw new functions.https.HttpsError("internal", `AI error: ${message}`);
    }
  });
