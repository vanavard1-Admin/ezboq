import * as functions from 'firebase-functions/v1';
import { processPdfJob } from './pdfWorker';

/**
 * Fast-path trigger: start PDF generation immediately when a job is created.
 *
 * Safety:
 * - pdfWorkerScheduled remains as a backstop.
 * - processPdfJob() is atomic-claimed (PENDING -> PROCESSING) to prevent duplicates.
 */
export const pdfJobOnCreate = functions
  .region('asia-southeast1')
  .runWith({
    secrets: ['PDF_RENDER_URL', 'PDF_SERVICE_AUDIENCE'],
    memory: '512MB',
    timeoutSeconds: 300,
  })
  .firestore.document('pdf_generation_jobs/{jobId}')
  .onCreate(async (_snap, context) => {
    const jobId = context.params.jobId as string;
    console.log(`[pdfJobOnCreate] New job created: ${jobId} -> starting processing`);
    await processPdfJob(jobId);
  });


