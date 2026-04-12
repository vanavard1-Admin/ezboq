import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import { getDb } from "../core/firebaseAdmin";
import { assertAdminFirebaseUid } from "../services/adminAuthService";
import {
  resolveCollectionPath,
  type MemoryCollection,
} from "../services/projectMemoryIngestService";

const db = getDb();

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
  res.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Authorization, Content-Type");
}

async function requireAdminUid(req: functions.https.Request): Promise<void> {
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
}

function parseBoolean(value: string | undefined): boolean | undefined {
  if (value === undefined) return undefined;
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

function toIsoTimestamp(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const maybeTimestamp = value as { toDate?: () => Date };
  if (typeof maybeTimestamp.toDate !== "function") return null;
  return maybeTimestamp.toDate().toISOString();
}

export const projectMemoryAdmin = functions
  .region("asia-southeast1")
  .runWith({ timeoutSeconds: 60, memory: "256MB" })
  .https.onRequest(async (req: functions.https.Request, res: functions.Response) => {
    if (req.method === "OPTIONS") {
      applyCors(req, res);
      res.status(204).send("");
      return;
    }

    if (req.method !== "GET") {
      res.status(405).json({ error: "Method not allowed. Use GET." });
      return;
    }

    try {
      applyCors(req, res);
      await requireAdminUid(req);

      const collection = String(req.query.collection || "project_memory").trim().toLowerCase() as MemoryCollection;
      const collectionPath = resolveCollectionPath(collection);
      if (!collectionPath) {
        res.status(400).json({ error: "Invalid collection." });
        return;
      }

      const namespace = String(req.query.namespace || "").trim();
      const category = String(req.query.category || "").trim().toLowerCase();
      const tag = String(req.query.tag || "").trim().toLowerCase();
      const q = String(req.query.q || "").trim().toLowerCase();
      const active = parseBoolean(typeof req.query.active === "string" ? req.query.active : undefined);
      const limitRaw = Number(req.query.limit);
      const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(limitRaw, 200)) : 50;

      let query: FirebaseFirestore.Query = db.collection(collectionPath);
      if (active !== undefined) {
        query = query.where("active", "==", active);
      }
      if (namespace) {
        query = query.where("namespace", "==", namespace);
      }

      query = query.orderBy("updatedAt", "desc").limit(limit);
      const snapshot = await query.get();

      let items = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          collection,
          title: data.title || "",
          content: data.content || "",
          category: data.category || "",
          tags: Array.isArray(data.tags) ? data.tags : [],
          priority: data.priority ?? 5,
          active: data.active !== false,
          source: data.source || null,
          namespace: data.namespace || null,
          updatedAt: toIsoTimestamp(data.updatedAt),
        };
      });

      if (category) {
        items = items.filter((item) => String(item.category || "").toLowerCase() === category);
      }
      if (tag) {
        items = items.filter((item) => item.tags.map((t: string) => t.toLowerCase()).includes(tag));
      }
      if (q) {
        items = items.filter((item) => {
          const haystack = `${item.title} ${item.content} ${item.category} ${item.tags.join(" ")}`.toLowerCase();
          return haystack.includes(q);
        });
      }

      res.status(200).json({
        ok: true,
        total: items.length,
        items,
      });
    } catch (error: any) {
      const message = error?.message || "Unknown error";
      const status = message === "UNAUTHORIZED" ? 401 : 500;
      res.status(status).json({ error: message });
    }
  });
