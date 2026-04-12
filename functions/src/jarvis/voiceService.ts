/**
 * Voice Service — ถอดเสียงภาษาไทยจาก LINE voice message
 *
 * ใช้ Google Cloud Speech-to-Text v2 with auto decoding so LINE audio
 * formats like m4a/mp4/aac do not require manual codec guesses.
 */

type SpeechV2Client = InstanceType<typeof import("@google-cloud/speech").v2.SpeechClient>;

let speechClient: SpeechV2Client | null = null;
let speechProjectIdPromise: Promise<string> | null = null;

function getSpeechClient(): SpeechV2Client {
  if (!speechClient) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { v2 } = require("@google-cloud/speech") as typeof import("@google-cloud/speech");
    speechClient = new v2.SpeechClient();
  }
  return speechClient;
}

async function getSpeechProjectId(): Promise<string> {
  if (!speechProjectIdPromise) {
    speechProjectIdPromise = getSpeechClient().getProjectId();
  }
  return speechProjectIdPromise;
}

function extractTranscript(response: unknown): string {
  if (!response || typeof response !== "object") {
    return "";
  }

  const results = (response as { results?: Array<{ alternatives?: Array<{ transcript?: string }> }> }).results;
  if (!Array.isArray(results)) {
    return "";
  }

  return results
    .map((result) => result.alternatives?.[0]?.transcript || "")
    .join(" ")
    .trim();
}

export async function transcribeAudio(
  audioBuffer: Buffer,
  options: {
    contentType?: string | null;
    traceId?: string;
  } = {}
): Promise<string> {
  const client = getSpeechClient();
  const projectId = await getSpeechProjectId();
  const recognizer = `projects/${projectId}/locations/global/recognizers/_`;

  console.log("[VOICE_TRANSCRIBE_START]", {
    traceId: options.traceId || "n/a",
    bytes: audioBuffer.length,
    contentType: options.contentType || "unknown",
    recognizer,
  });

  const [response] = await client.recognize({
    recognizer,
    config: {
      autoDecodingConfig: {},
      languageCodes: ["th-TH", "en-US"],
      features: {
        enableAutomaticPunctuation: true,
      },
    },
    content: audioBuffer,
  });

  const transcript = extractTranscript(response);

  console.log("[VOICE_TRANSCRIBE_DONE]", {
    traceId: options.traceId || "n/a",
    contentType: options.contentType || "unknown",
    transcriptLength: transcript.length,
  });

  return transcript;
}
