import { useMemo, useState } from 'react';
import { ChevronLeft, Database, RefreshCw, UploadCloud } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Switch } from './ui/switch';
import { Progress } from './ui/progress';
import {
  ingestProjectMemory,
  queryProjectMemory,
  type MemoryCollection,
  type ProjectMemoryEntry,
} from '../utils/adminMemory';

interface AdminMemoryPanelProps {
  onBack?: () => void;
}

const DEFAULT_NAMESPACE = 'ezboq-construction';

export function AdminMemoryPanel({ onBack }: AdminMemoryPanelProps) {
  const [collection, setCollection] = useState<MemoryCollection>('project_memory');
  const [namespace, setNamespace] = useState(DEFAULT_NAMESPACE);
  const [queryText, setQueryText] = useState('');
  const [onlyActive, setOnlyActive] = useState(true);
  const [limit, setLimit] = useState(50);
  const [entries, setEntries] = useState<ProjectMemoryEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const [uploadEntries, setUploadEntries] = useState<Record<string, unknown>[]>([]);
  const [uploadName, setUploadName] = useState<string>('');
  const [ingesting, setIngesting] = useState(false);
  const [ingestProgress, setIngestProgress] = useState(0);
  const [dryRun, setDryRun] = useState(false);
  const [fullSync, setFullSync] = useState(false);

  const uploadSummary = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const entry of uploadEntries) {
      const collectionName = String((entry as { collection?: string }).collection || 'unknown');
      counts[collectionName] = (counts[collectionName] || 0) + 1;
    }
    return counts;
  }, [uploadEntries]);

  const handleLoad = async () => {
    setLoading(true);
    try {
      const result = await queryProjectMemory({
        collection,
        namespace: namespace || undefined,
        q: queryText || undefined,
        active: onlyActive,
        limit,
      });
      setEntries(result.items);
    } catch (error) {
      console.error('Failed to query memory', error);
      toast.error(error instanceof Error ? error.message : 'โหลด memory ไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  const handleFile = async (file?: File) => {
    if (!file) return;
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const items = Array.isArray(json) ? json : json.entries;
      if (!Array.isArray(items)) {
        throw new Error('ไฟล์ต้องเป็น array หรือมี entries[]');
      }
      setUploadEntries(items as Record<string, unknown>[]);
      setUploadName(file.name);
      toast.success('โหลดไฟล์เรียบร้อย');
    } catch (error) {
      console.error('Failed to parse memory file', error);
      toast.error('ไฟล์ไม่ถูกต้อง');
    }
  };

  const handleIngest = async () => {
    if (uploadEntries.length === 0) {
      toast.error('ยังไม่มีข้อมูลที่จะ ingest');
      return;
    }
    setIngesting(true);
    setIngestProgress(0);
    try {
      if (fullSync) {
        const result = await ingestProjectMemory(uploadEntries, { dryRun, fullSync: true });
        setIngestProgress(100);
        toast.success(
          dryRun
            ? `Dry-run full sync สำเร็จ (${result.total} entries)`
            : `Full sync สำเร็จ (${result.total} entries, ปิดของเก่า ${result.deactivated} รายการ)`,
        );
        return;
      }

      const batchSize = 50;
      const totalBatches = Math.ceil(uploadEntries.length / batchSize);
      for (let i = 0; i < totalBatches; i++) {
        const batch = uploadEntries.slice(i * batchSize, (i + 1) * batchSize);
        await ingestProjectMemory(batch, { dryRun });
        setIngestProgress(Math.round(((i + 1) / totalBatches) * 100));
      }
      toast.success(dryRun ? 'Dry-run สำเร็จ' : 'Ingest สำเร็จ');
    } catch (error) {
      console.error('Ingest failed', error);
      toast.error(error instanceof Error ? error.message : 'Ingest ไม่สำเร็จ');
    } finally {
      setIngesting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="sticky top-0 z-50 flex items-center gap-3 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur-sm">
        {onBack && (
          <button onClick={onBack} className="flex items-center gap-1 rounded-lg p-1.5 text-slate-600 transition hover:bg-slate-100">
            <ChevronLeft className="h-5 w-5" />
            <span className="text-sm">กลับ</span>
          </button>
        )}
        <div className="flex-1 text-center">
          <h1 className="text-sm font-semibold text-slate-900">AI Memory Admin</h1>
        </div>
        {onBack && <div className="w-14" />}
      </div>

      <div className="mx-auto max-w-4xl space-y-6 px-4 py-6">
        <Card>
          <CardContent className="space-y-4 p-4">
            <div className="flex items-center gap-2">
              <UploadCloud className="h-4 w-4 text-slate-500" />
              <div className="text-sm font-semibold text-slate-900">นำเข้า Project Memory</div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Input
                type="file"
                accept=".json"
                onChange={(event) => handleFile(event.target.files?.[0])}
              />
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Switch checked={dryRun} onCheckedChange={(value) => setDryRun(value)} />
                Dry-run
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Switch checked={fullSync} onCheckedChange={(value) => setFullSync(value)} />
                Full sync + cleanup
              </div>
              <Button onClick={handleIngest} disabled={ingesting} className="gap-2">
                <Database className="h-4 w-4" />
                {ingesting ? (fullSync ? 'กำลัง full sync...' : 'กำลัง ingest...') : (fullSync ? 'Full Sync' : 'Ingest')}
              </Button>
            </div>
            {fullSync && (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                โหมดนี้จะส่งไฟล์ทั้งก้อนไปยัง backend ครั้งเดียว และปิด `active` ของ memory เก่าที่ไม่อยู่ในไฟล์ปัจจุบันด้วย
              </div>
            )}
            {uploadName && (
              <div className="text-xs text-slate-500">ไฟล์: {uploadName}</div>
            )}
            {Object.keys(uploadSummary).length > 0 && (
              <div className="flex flex-wrap gap-2">
                {Object.entries(uploadSummary).map(([key, count]) => (
                  <Badge key={key} variant="outline">{key}: {count}</Badge>
                ))}
              </div>
            )}
            {ingesting && (
              <div className="space-y-2">
                <Progress value={ingestProgress} />
                <div className="text-xs text-slate-500">ความคืบหน้า {ingestProgress}%</div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4 p-4">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-slate-500" />
              <div className="text-sm font-semibold text-slate-900">ค้นหา Memory</div>
            </div>
            <div className="grid gap-3 md:grid-cols-4">
              <div className="space-y-1">
                <label className="text-xs text-slate-500">Collection</label>
                <select
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                  value={collection}
                  onChange={(event) => setCollection(event.target.value as MemoryCollection)}
                >
                  <option value="project_memory">project_memory</option>
                  <option value="code_index">code_index</option>
                  <option value="incidents">incidents</option>
                  <option value="project_issues">project_issues</option>
                  <option value="test_observations">test_observations</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-500">Namespace</label>
                <Input value={namespace} onChange={(event) => setNamespace(event.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-500">คำค้นหา</label>
                <Input value={queryText} onChange={(event) => setQueryText(event.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-500">Limit</label>
                <Input
                  type="number"
                  min={1}
                  max={200}
                  value={limit}
                  onChange={(event) => setLimit(Number(event.target.value || 50))}
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Switch checked={onlyActive} onCheckedChange={(value) => setOnlyActive(value)} />
                เฉพาะ Active
              </div>
              <Button variant="outline" size="sm" onClick={handleLoad} className="gap-1.5">
                <RefreshCw className="h-3.5 w-3.5" /> รีเฟรช
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3">
          {loading ? (
            <Card>
              <CardContent className="py-12 text-center text-sm text-slate-400">กำลังโหลด...</CardContent>
            </Card>
          ) : entries.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-sm text-slate-400">ยังไม่มีข้อมูล</CardContent>
            </Card>
          ) : (
            entries.map((entry) => (
              <Card key={entry.id}>
                <CardContent className="space-y-2 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-medium text-slate-900">{entry.title}</div>
                    <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                      {entry.category && <Badge variant="outline">{entry.category}</Badge>}
                      {entry.updatedAt && <span>{new Date(entry.updatedAt).toLocaleString('th-TH')}</span>}
                    </div>
                  </div>
                  <div className="text-xs text-slate-600 line-clamp-3">{entry.content}</div>
                  {entry.tags && entry.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {entry.tags.slice(0, 6).map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-[10px]">{tag}</Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
