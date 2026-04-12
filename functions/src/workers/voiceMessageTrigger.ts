import * as functions from "firebase-functions/v1";
import { processVoiceMessageJob } from "./voiceMessageWorker";

export const voiceMessageJobOnCreate = functions
  .region("asia-southeast1")
  .runWith({
    secrets: ["LINE_CHANNEL_ACCESS_TOKEN"],
    memory: "1GB",
    timeoutSeconds: 300,
  })
  .firestore.document("voice_message_jobs/{jobId}")
  .onCreate(async (_snap, context) => {
    const jobId = context.params.jobId as string;
    console.log(`[voiceMessageJobOnCreate] New job created: ${jobId}`);
    await processVoiceMessageJob(jobId);
  });
