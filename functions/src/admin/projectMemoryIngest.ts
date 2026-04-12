import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import { assertAdminFirebaseUid } from "../services/adminAuthService";
import {
  ALL_MEMORY_COLLECTIONS,
  ingestMemoryEntries,
  syncMemoryEntries,
  type MemoryEntryInput,
} from "../services/projectMemoryIngestService";

interface IngestRequest {
  entries: MemoryEntryInput[];
  dryRun?: boolean;
  fullSync?: boolean;
}

const MAX_STANDARD_ENTRIES = 200;
const MAX_FULL_SYNC_ENTRIES = 2000;

async function requireAdminUid(req: functions.https.Request): Promise<string> {
  const authHeader = req.headers.authorization || "";
  if (!authHeader.startsWith("Bearer ")) {
    throw new Error("UNAUTHORIZED");
  }

  const idToken = authHeader.replace("Bearer ", "").trim();
  if (!idToken) {
    throw new Error("UNAUTHORIZED");
  }

  let decoded: admin.auth.DecodedIdToken;
  try {
    decoded = await admin.auth().verifyIdToken(idToken);
  } catch {
    throw new Error("UNAUTHORIZED");
  }

  await assertAdminFirebaseUid(decoded.uid, decoded.email || null);
  return decoded.uid;
}

const ALLOWED_ORIGINS = new Set([
  "https://doc.ezboq.com",
  "https://ezdoc-v1-th.web.app",
  "https://ezdoc-v1-th.firebaseapp.com",
  "http://localhost:3000",
]);

function applyCors(req: functions.https.Request, res: functions.Response): void {
  const origin = typeof req.headers.origin === "string" ? req.headers.origin : "";
  const allowOrigin = origin && ALLOWED_ORIGINS.has(origin) ? origin : "";
  if (allowOrigin) {
    res.set("Access-Control-Allow-Origin", allowOrigin);
    res.set("Vary", "Origin");
  }
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Authorization, Content-Type");
}

export const projectMemoryIngest = functions
  .region("asia-southeast1")
  .runWith({
    timeoutSeconds: 120,
    memory: "256MB",
  })
  .https.onRequest(async (req: functions.https.Request, res: functions.Response) => {
    if (req.method === "OPTIONS") {
      applyCors(req, res);
      res.status(204).send("");
      return;
    }

    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed. Use POST." });
      return;
    }

    try {
      applyCors(req, res);
      await requireAdminUid(req);
      const body = req.body as IngestRequest;
      const entries = Array.isArray(body.entries) ? body.entries : [];
      const fullSync = Boolean(body.fullSync);
      if (entries.length === 0) {
        res.status(400).json({ error: "Missing entries array." });
        return;
      }
      const maxEntries = fullSync ? MAX_FULL_SYNC_ENTRIES : MAX_STANDARD_ENTRIES;
      if (entries.length > maxEntries) {
        res.status(400).json({
          error: fullSync
            ? `Too many entries. Max ${MAX_FULL_SYNC_ENTRIES} per full sync request.`
            : `Too many entries. Max ${MAX_STANDARD_ENTRIES} per request.`,
        });
        return;
      }
      const ingestResult = fullSync
        ? await syncMemoryEntries(entries, {
          dryRun: Boolean(body.dryRun),
          batchSize: 200,
          syncCollections: ALL_MEMORY_COLLECTIONS,
        })
        : await ingestMemoryEntries(entries, {
          dryRun: Boolean(body.dryRun),
          batchSize: 200,
        });

      res.status(200).json({
        success: true,
        dryRun: Boolean(body.dryRun),
        fullSync,
        total: ingestResult.total,
        deactivated: ingestResult.deactivated,
        results: ingestResult.results,
      });
    } catch (error: any) {
      const message = error?.message || "Unknown error";
      const status = message === "UNAUTHORIZED" ? 401 : 500;
      res.status(status).json({ error: message });
    }
  });
