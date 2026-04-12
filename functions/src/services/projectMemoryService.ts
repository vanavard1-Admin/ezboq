import * as admin from "firebase-admin";

export const PROJECT_MEMORY_COLLECTION = "project_memory_entries";
export const PROJECT_CODE_INDEX_COLLECTION = "project_code_index_entries";
export const PROJECT_INCIDENTS_COLLECTION = "project_incident_entries";
export const PROJECT_PROJECT_ISSUES_COLLECTION = "project_issue_entries";
export const PROJECT_TEST_OBSERVATIONS_COLLECTION = "project_test_observation_entries";
export const DEFAULT_MEMORY_NAMESPACE = "ezboq-construction";

const DEFAULT_LIMIT = 3;
const MAX_LIMIT = 8;
const MAX_SCAN_DOCS = 300;

const STOPWORDS = new Set([
  "ของ", "ที่", "ใน", "จะ", "ได้", "ให้", "มี", "เป็น", "กับ", "และ",
  "แต่", "หรือ", "ไม่", "ก็", "ด้วย", "จาก", "ถ้า", "แล้ว", "ยัง",
  "อยู่", "ไป", "มา", "คือ", "นี้", "นั้น", "ทำ", "ว่า", "บ้าง",
  "อะไร", "เท่าไหร่", "กี่", "ราคา", "ต้อง", "ขอ", "ช่วย", "อยาก",
  "the", "and", "for", "from", "with", "that", "this", "into", "your",
]);

interface ProjectMemoryDoc {
  id: string;
  namespace: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  priority: number;
  updatedAt?: string;
  loader: ProjectMemoryLoader;
}

export type ProjectMemoryLoader =
  | "project_memory"
  | "code_index"
  | "incidents"
  | "project_issues"
  | "test_observations";

export interface ProjectMemorySearchOptions {
  namespace?: string;
  limit?: number;
}

export interface ProjectMemoryHit {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  score: number;
  source: "gemma_project_memory";
  namespace: string;
  updatedAt?: string;
  loader: ProjectMemoryLoader;
}

function normalizeTags(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((tag) => String(tag || "").trim().toLowerCase())
      .filter((tag) => tag.length > 0);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((tag) => tag.trim().toLowerCase())
      .filter((tag) => tag.length > 0);
  }

  return [];
}

function toIsoTimestamp(value: unknown): string | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const maybeTimestamp = value as { toDate?: () => Date };
  if (typeof maybeTimestamp.toDate !== "function") {
    return undefined;
  }

  return maybeTimestamp.toDate().toISOString();
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\u0E00-\u0E7Fa-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 1 && !STOPWORDS.has(token));
}

function toMemoryDoc(
  id: string,
  raw: admin.firestore.DocumentData,
  loader: ProjectMemoryLoader,
  fallbackCategory: string,
): ProjectMemoryDoc | null {
  const title = String(raw.title || "").trim();
  const content = String(raw.content || raw.summary || "").trim();
  if (!title || !content) {
    return null;
  }

  const namespace = String(raw.namespace || "").trim() || DEFAULT_MEMORY_NAMESPACE;
  const category = String(raw.category || raw.domain || fallbackCategory || "general")
    .trim()
    .toLowerCase();
  const tags = normalizeTags(raw.tags);
  const priorityRaw = Number(raw.priority);
  const priority = Number.isFinite(priorityRaw) ? Math.max(1, Math.min(priorityRaw, 10)) : 5;

  return {
    id,
    namespace,
    title,
    content,
    category,
    tags,
    priority,
    updatedAt: toIsoTimestamp(raw.updatedAt),
    loader,
  };
}

const LOADER_CONFIG: Record<ProjectMemoryLoader, {
  collection: string;
  supportsNamespace: boolean;
  fallbackCategory: string;
}> = {
  project_memory: {
    collection: PROJECT_MEMORY_COLLECTION,
    supportsNamespace: true,
    fallbackCategory: "general",
  },
  code_index: {
    collection: PROJECT_CODE_INDEX_COLLECTION,
    supportsNamespace: false,
    fallbackCategory: "code_index",
  },
  incidents: {
    collection: PROJECT_INCIDENTS_COLLECTION,
    supportsNamespace: false,
    fallbackCategory: "incident",
  },
  project_issues: {
    collection: PROJECT_PROJECT_ISSUES_COLLECTION,
    supportsNamespace: false,
    fallbackCategory: "project_issue",
  },
  test_observations: {
    collection: PROJECT_TEST_OBSERVATIONS_COLLECTION,
    supportsNamespace: false,
    fallbackCategory: "test_observation",
  },
};

function normalizeLoaders(loaders?: string[]): ProjectMemoryLoader[] {
  if (!loaders || loaders.length === 0) {
    return ["project_memory"];
  }

  const normalized = loaders
    .map((loader) => String(loader || "").trim().toLowerCase())
    .filter((loader) => loader.length > 0);

  const resolved = normalized
    .map((loader): ProjectMemoryLoader | null => {
      if (loader === "project_memory") return "project_memory";
      if (loader === "code_index") return "code_index";
      if (loader === "incidents") return "incidents";
      if (loader === "project_issues") return "project_issues";
      if (loader === "test_observations") return "test_observations";
      return null;
    })
    .filter((loader): loader is ProjectMemoryLoader => loader !== null);

  return resolved.length > 0 ? resolved : ["project_memory"];
}

async function fetchEntriesForLoader(
  loader: ProjectMemoryLoader,
  namespace: string,
): Promise<ProjectMemoryDoc[]> {
  const db = admin.firestore();
  const config = LOADER_CONFIG[loader];

  let query = db.collection(config.collection).where("active", "==", true);
  if (config.supportsNamespace) {
    query = query.where("namespace", "==", namespace);
  }

  const snapshot = await query.limit(MAX_SCAN_DOCS).get();

  return snapshot.docs
    .map((doc) =>
      toMemoryDoc(
        loader === "project_memory" ? doc.id : `${loader}:${doc.id}`,
        doc.data(),
        loader,
        config.fallbackCategory,
      ),
    )
    .filter((doc): doc is ProjectMemoryDoc => doc !== null);
}

function scoreDocument(doc: ProjectMemoryDoc, queryTokens: string[]): number {
  const titleText = doc.title.toLowerCase();
  const categoryText = doc.category.toLowerCase();
  const tagsText = doc.tags.join(" ");
  const contentText = doc.content.toLowerCase();

  let score = 0;

  for (const token of queryTokens) {
    if (titleText.includes(token)) score += 3;
    if (categoryText.includes(token)) score += 2;
    if (tagsText.includes(token)) score += 2;
    if (contentText.includes(token)) score += 1;
  }

  if (score === 0) {
    return 0;
  }

  const priorityBoost = 1 + doc.priority * 0.08;
  return score * priorityBoost;
}

export async function searchProjectMemoryWithLoaders(
  query: string,
  options?: ProjectMemorySearchOptions & { loaders?: string[] },
): Promise<ProjectMemoryHit[]> {
  const trimmedQuery = query.trim();
  if (trimmedQuery.length < 2) {
    return [];
  }

  const requestedLimit = Number(options?.limit);
  const limit = Number.isFinite(requestedLimit)
    ? Math.max(1, Math.min(Math.floor(requestedLimit), MAX_LIMIT))
    : DEFAULT_LIMIT;

  const namespace = String(options?.namespace || "").trim() || DEFAULT_MEMORY_NAMESPACE;
  const namespaces = namespace === DEFAULT_MEMORY_NAMESPACE
    ? [namespace]
    : [namespace, DEFAULT_MEMORY_NAMESPACE];
  const loaders = normalizeLoaders(options?.loaders);

  const queryTokens = tokenize(trimmedQuery);
  if (queryTokens.length === 0) {
    return [];
  }

  const byId = new Map<string, ProjectMemoryDoc>();

  try {
    for (const loader of loaders) {
      const config = LOADER_CONFIG[loader];
      const effectiveNamespaces = config.supportsNamespace ? namespaces : [DEFAULT_MEMORY_NAMESPACE];
      for (const currentNamespace of effectiveNamespaces) {
        const entries = await fetchEntriesForLoader(loader, currentNamespace);
        for (const entry of entries) {
          if (!byId.has(entry.id)) {
            byId.set(entry.id, entry);
          }
        }
      }
    }
  } catch (error) {
    console.warn("[projectMemoryService] Firestore fetch failed:", error);
    return [];
  }

  return Array.from(byId.values())
    .map((entry) => ({
      entry,
      score: scoreDocument(entry, queryTokens),
    }))
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((result) => ({
      id: result.entry.id,
      title: result.entry.title,
      content: result.entry.content,
      category: result.entry.category,
      tags: result.entry.tags,
      score: Number(result.score.toFixed(3)),
      source: "gemma_project_memory",
      namespace: result.entry.namespace,
      updatedAt: result.entry.updatedAt,
      loader: result.entry.loader,
    }));
}

export async function searchProjectMemory(
  query: string,
  options?: ProjectMemorySearchOptions,
): Promise<ProjectMemoryHit[]> {
  return searchProjectMemoryWithLoaders(query, options);
}
