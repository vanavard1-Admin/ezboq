import { auth } from './firebase';

const DEFAULT_FUNCTIONS_BASE = 'https://asia-southeast1-ezdoc-v1-th.cloudfunctions.net';
const envBase = (import.meta.env.VITE_FUNCTIONS_BASE_URL as string | undefined)?.trim();
const FUNCTIONS_BASE = envBase && envBase.length > 0
  ? envBase.replace(/\/+$/, '')
  : DEFAULT_FUNCTIONS_BASE;

function buildUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${FUNCTIONS_BASE}/${path.replace(/^\/+/, '')}`;
}

async function getAuthHeaders(): Promise<HeadersInit> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('กรุณาเข้าสู่ระบบด้วยบัญชี EzBOQ ก่อนใช้งาน');
  }
  const token = await user.getIdToken();
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

export type MemoryCollection =
  | 'project_memory'
  | 'code_index'
  | 'incidents'
  | 'project_issues'
  | 'test_observations';

export interface ProjectMemoryEntry {
  id: string;
  collection: MemoryCollection;
  title: string;
  content: string;
  category?: string;
  tags?: string[];
  priority?: number;
  active?: boolean;
  source?: string | null;
  namespace?: string | null;
  updatedAt?: string | null;
}

export async function queryProjectMemory(params: {
  collection: MemoryCollection;
  namespace?: string;
  category?: string;
  tag?: string;
  q?: string;
  active?: boolean;
  limit?: number;
}): Promise<{ items: ProjectMemoryEntry[]; total: number }> {
  const headers = await getAuthHeaders();
  const query = new URLSearchParams();
  query.set('collection', params.collection);
  if (params.namespace) query.set('namespace', params.namespace);
  if (params.category) query.set('category', params.category);
  if (params.tag) query.set('tag', params.tag);
  if (params.q) query.set('q', params.q);
  if (params.active !== undefined) query.set('active', params.active ? 'true' : 'false');
  if (params.limit) query.set('limit', String(params.limit));

  const response = await fetch(buildUrl(`projectMemoryAdmin?${query.toString()}`), {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || 'ดึงข้อมูล memory ไม่สำเร็จ');
  }

  const payload = await response.json();
  return { items: payload.items || [], total: payload.total || 0 };
}

export async function ingestProjectMemory(
  entries: Record<string, unknown>[],
  options?: { dryRun?: boolean; fullSync?: boolean },
): Promise<{ total: number; deactivated: number; fullSync: boolean; dryRun: boolean }> {
  const headers = await getAuthHeaders();
  const response = await fetch(buildUrl('projectMemoryIngest'), {
    method: 'POST',
    headers,
    body: JSON.stringify({
      entries,
      dryRun: Boolean(options?.dryRun),
      fullSync: Boolean(options?.fullSync),
    }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || 'Ingest ไม่สำเร็จ');
  }

  const payload = await response.json().catch(() => ({}));
  return {
    total: Number(payload.total || 0),
    deactivated: Number(payload.deactivated || 0),
    fullSync: Boolean(payload.fullSync),
    dryRun: Boolean(payload.dryRun),
  };
}
