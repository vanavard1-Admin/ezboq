import { createHash } from "crypto";
import * as admin from "firebase-admin";
import { getDb } from "../core/firebaseAdmin";
import {
  DEFAULT_MEMORY_NAMESPACE,
  PROJECT_CODE_INDEX_COLLECTION,
  PROJECT_INCIDENTS_COLLECTION,
  PROJECT_MEMORY_COLLECTION,
  PROJECT_PROJECT_ISSUES_COLLECTION,
  PROJECT_TEST_OBSERVATIONS_COLLECTION,
} from "./projectMemoryService";

export type MemoryCollection =
  | "project_memory"
  | "code_index"
  | "incidents"
  | "project_issues"
  | "test_observations";

export interface MemoryEntryInput {
  id?: string;
  collection: MemoryCollection;
  namespace?: string;
  title: string;
  content: string;
  category?: string;
  tags?: string[];
  priority?: number;
  active?: boolean;
  source?: string;
  metadata?: Record<string, unknown>;
}

export interface IngestResult {
  id: string;
  collection: MemoryCollection;
  status: "created" | "updated" | "skipped";
}

export interface IngestSummary {
  total: number;
  written: number;
  deactivated: number;
  results: IngestResult[];
}

const COLLECTION_MAP: Record<MemoryCollection, string> = {
  project_memory: PROJECT_MEMORY_COLLECTION,
  code_index: PROJECT_CODE_INDEX_COLLECTION,
  incidents: PROJECT_INCIDENTS_COLLECTION,
  project_issues: PROJECT_PROJECT_ISSUES_COLLECTION,
  test_observations: PROJECT_TEST_OBSERVATIONS_COLLECTION,
};

const db = getDb();
export const ALL_MEMORY_COLLECTIONS: MemoryCollection[] = [
  "project_memory",
  "code_index",
  "incidents",
  "project_issues",
  "test_observations",
];

function getMetadataIdentifier(metadata: Record<string, unknown> | undefined): string {
  if (!metadata) return "";
  return String(
    metadata.identifier ||
    metadata.path ||
    metadata.original_id ||
    metadata.issueId ||
    "",
  ).trim();
}

export function buildDeterministicMemoryEntryId(entry: MemoryEntryInput): string {
  const namespace = String(entry.namespace || "").trim() || DEFAULT_MEMORY_NAMESPACE;
  const key = [
    entry.collection,
    namespace,
    String(entry.source || "").trim(),
    String(entry.title || "").trim(),
    getMetadataIdentifier(entry.metadata),
  ].join("||");

  return createHash("sha1").update(key).digest("hex");
}

function normalizeEntry(entry: MemoryEntryInput): MemoryEntryInput | null {
  const title = String(entry.title || "").trim();
  const content = String(entry.content || "").trim();
  if (!title || !content) {
    return null;
  }

  return {
    ...entry,
    namespace: String(entry.namespace || "").trim() || DEFAULT_MEMORY_NAMESPACE,
    title,
    content,
    category: entry.category ? String(entry.category).trim() : undefined,
    tags: Array.isArray(entry.tags) ? entry.tags.map((t) => String(t).trim()).filter(Boolean) : undefined,
    priority: Number.isFinite(Number(entry.priority)) ? Number(entry.priority) : undefined,
    active: entry.active !== false,
  };
}

export function resolveCollectionPath(collection: MemoryCollection): string | null {
  return COLLECTION_MAP[collection] || null;
}

export function normalizeEntries(entries: MemoryEntryInput[]): Array<{
  entry: MemoryEntryInput;
  collectionPath: string;
  docId: string;
}> {
  const normalized: Array<{ entry: MemoryEntryInput; collectionPath: string; docId: string }> = [];
  for (const raw of entries) {
    const normalizedEntry = normalizeEntry(raw);
    if (!normalizedEntry) {
      continue;
    }

    const collectionPath = COLLECTION_MAP[normalizedEntry.collection];
    if (!collectionPath) {
      continue;
    }

    normalized.push({
      entry: normalizedEntry,
      collectionPath,
      docId: normalizedEntry.id || buildDeterministicMemoryEntryId(normalizedEntry),
    });
  }
  return normalized;
}

async function writeNormalizedEntries(
  normalized: Array<{ entry: MemoryEntryInput; collectionPath: string; docId: string }>,
  batchSize: number,
): Promise<IngestResult[]> {
  const results: IngestResult[] = [];

  for (let i = 0; i < normalized.length; i += batchSize) {
    const slice = normalized.slice(i, i + batchSize);
    const batch = db.batch();

    for (const item of slice) {
      const { entry, collectionPath, docId } = item;
      const docRef = db.collection(collectionPath).doc(docId);

      batch.set(
        docRef,
        {
          namespace: entry.namespace || DEFAULT_MEMORY_NAMESPACE,
          title: entry.title,
          content: entry.content,
          category: entry.category || null,
          tags: entry.tags || [],
          priority: entry.priority ?? 5,
          active: entry.active !== false,
          source: entry.source || null,
          metadata: entry.metadata || {},
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      results.push({
        id: docId,
        collection: entry.collection,
        status: entry.id ? "updated" : "created",
      });
    }

    await batch.commit();
  }

  return results;
}

async function deactivateStaleEntries(
  normalized: Array<{ entry: MemoryEntryInput; collectionPath: string; docId: string }>,
  batchSize: number,
  syncCollections: MemoryCollection[],
): Promise<number> {
  const desiredByScope = new Map<string, Set<string>>();
  const namespaces = new Set<string>();

  for (const item of normalized) {
    const namespace = String(item.entry.namespace || "").trim() || DEFAULT_MEMORY_NAMESPACE;
    const scopeKey = `${item.entry.collection}||${namespace}`;
    namespaces.add(namespace);
    if (!desiredByScope.has(scopeKey)) {
      desiredByScope.set(scopeKey, new Set<string>());
    }
    desiredByScope.get(scopeKey)!.add(item.docId);
  }

  if (namespaces.size === 0) {
    namespaces.add(DEFAULT_MEMORY_NAMESPACE);
  }

  const staleRefs: FirebaseFirestore.DocumentReference[] = [];

  for (const namespace of namespaces) {
    for (const collection of syncCollections) {
      const collectionPath = COLLECTION_MAP[collection];
      const desiredIds = desiredByScope.get(`${collection}||${namespace}`) || new Set<string>();
      const snapshot = await db.collection(collectionPath).where("active", "==", true).limit(5000).get();

      for (const doc of snapshot.docs) {
        const rawNamespace = String(doc.get("namespace") || "").trim();
        const docNamespace = rawNamespace || DEFAULT_MEMORY_NAMESPACE;
        if (docNamespace !== namespace) {
          continue;
        }
        if (desiredIds.has(doc.id)) {
          continue;
        }
        staleRefs.push(doc.ref);
      }
    }
  }

  for (let i = 0; i < staleRefs.length; i += batchSize) {
    const slice = staleRefs.slice(i, i + batchSize);
    const batch = db.batch();
    for (const ref of slice) {
      batch.set(ref, {
        active: false,
        staleAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
    }
    await batch.commit();
  }

  return staleRefs.length;
}

export async function ingestMemoryEntries(
  entries: MemoryEntryInput[],
  options?: { dryRun?: boolean; batchSize?: number },
): Promise<IngestSummary> {
  const normalized = normalizeEntries(entries);
  const batchSize = options?.batchSize && options.batchSize > 0 ? options.batchSize : 200;
  const results: IngestResult[] = [];

  if (options?.dryRun) {
    return {
      total: normalized.length,
      written: 0,
      deactivated: 0,
      results,
    };
  }

  const writtenResults = await writeNormalizedEntries(normalized, batchSize);
  results.push(...writtenResults);

  return {
    total: normalized.length,
    written: results.length,
    deactivated: 0,
    results,
  };
}

export async function syncMemoryEntries(
  entries: MemoryEntryInput[],
  options?: { dryRun?: boolean; batchSize?: number; syncCollections?: MemoryCollection[] },
): Promise<IngestSummary> {
  const normalized = normalizeEntries(entries);
  const batchSize = options?.batchSize && options.batchSize > 0 ? options.batchSize : 200;
  const syncCollections = options?.syncCollections && options.syncCollections.length > 0
    ? options.syncCollections
    : ALL_MEMORY_COLLECTIONS;

  if (options?.dryRun) {
    return {
      total: normalized.length,
      written: 0,
      deactivated: 0,
      results: [],
    };
  }

  const results = await writeNormalizedEntries(normalized, batchSize);
  const deactivated = await deactivateStaleEntries(normalized, batchSize, syncCollections);

  return {
    total: normalized.length,
    written: results.length,
    deactivated,
    results,
  };
}
