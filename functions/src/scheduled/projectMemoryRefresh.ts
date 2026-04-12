import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import { initAdmin } from "../core/firebaseAdmin";
import {
  ALL_MEMORY_COLLECTIONS,
  syncMemoryEntries,
  type MemoryEntryInput,
} from "../services/projectMemoryIngestService";

const DEFAULT_GCS_OBJECT = "project-memory/latest.json";

function parseGcsUri(uri: string): { bucket: string; object: string } | null {
  if (!uri.startsWith("gs://")) return null;
  const stripped = uri.replace("gs://", "");
  const parts = stripped.split("/");
  if (parts.length < 2) return null;
  return { bucket: parts[0], object: parts.slice(1).join("/") };
}

async function loadEntriesFromGcs(): Promise<MemoryEntryInput[]> {
  initAdmin();
  const gcsUri = process.env.PROJECT_MEMORY_GCS_URI?.trim() || "";
  const storageBucket =
    process.env.STORAGE_BUCKET ||
    admin.app().options.storageBucket ||
    "ezdoc-v1-th.firebasestorage.app";

  const target = gcsUri ? parseGcsUri(gcsUri) : { bucket: storageBucket, object: DEFAULT_GCS_OBJECT };
  if (!target) {
    throw new Error("Invalid PROJECT_MEMORY_GCS_URI");
  }

  const bucket = admin.storage().bucket(target.bucket);
  const [contents] = await bucket.file(target.object).download();
  const payload = JSON.parse(contents.toString("utf-8"));
  const entries = Array.isArray(payload) ? payload : payload?.entries;

  if (!Array.isArray(entries)) {
    throw new Error("Invalid ingestion payload in GCS");
  }

  return entries as MemoryEntryInput[];
}

export const projectMemoryRefreshScheduled = functions
  .region("asia-southeast1")
  .pubsub
  .schedule("every 24 hours")
  .timeZone("Asia/Bangkok")
  .onRun(async (context) => {
    void context;
    console.log("[PROJECT_MEMORY_REFRESH] starting scheduled refresh");

    try {
      const entries = await loadEntriesFromGcs();
      const result = await syncMemoryEntries(entries, {
        batchSize: 200,
        syncCollections: ALL_MEMORY_COLLECTIONS,
      });
      console.log("[PROJECT_MEMORY_REFRESH] completed", {
        total: result.total,
        written: result.written,
        deactivated: result.deactivated,
      });
      return result;
    } catch (error) {
      console.error("[PROJECT_MEMORY_REFRESH] failed:", error);
      throw error;
    }
  });
