import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import {
  Eye,
  FileText,
  LoaderCircle,
  Send,
  Search,
  Sparkles,
  Wallet,
  CheckCircle2,
  Download,
  X,
  ArrowRight,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import type { AuthSession } from '../../utils/authSession';
import { DocumentEditor } from './DocumentEditor';
import {
  docsApi,
  hasDocsAccessSession,
  type DocType,
  type EzDocument,
  type UserProfile,
} from './docsApi';

interface DocumentsModulePageProps {
  route: `/docs${'' | `/${string}`}`;
  session: AuthSession;
  onNavigate: (path: string) => void;
}

const moneyFormatter = new Intl.NumberFormat('th-TH', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

function formatMoney(value: number) {
  return moneyFormatter.format(value || 0);
}

function formatDocType(type: DocType) {
  switch (type) {
    case 'QUO':
      return 'ใบเสนอราคา';
    case 'BILL':
      return 'ใบวางบิล';
    case 'RECEIPT':
      return 'ใบเสร็จ';
    case 'CN':
      return 'ใบลดหนี้';
    case 'DN':
      return 'ใบเพิ่มหนี้';
    default:
      return type;
  }
}

function formatDocStatus(status: EzDocument['status']) {
  switch (status) {
    case 'DRAFT':
      return 'Draft';
    case 'READY':
      return 'Ready';
    case 'ISSUED':
      return 'Issued';
    case 'PAID':
      return 'Paid';
    case 'CANCELLED':
      return 'Cancelled';
    default:
      return status;
  }
}

function getStatusVariant(status: EzDocument['status']): 'default' | 'secondary' | 'outline' | 'destructive' {
  switch (status) {
    case 'ISSUED':
    case 'PAID':
      return 'default';
    case 'DRAFT':
    case 'READY':
      return 'secondary';
    case 'CANCELLED':
      return 'destructive';
    default:
      return 'outline';
  }
}

export function DocumentsModulePage({ route, session, onNavigate }: DocumentsModulePageProps) {
  const isCreateRoute = route === '/docs/new';
  const editId = route.startsWith('/docs/edit/') ? route.slice('/docs/edit/'.length) : '';
  const isEditorRoute = isCreateRoute || Boolean(editId);
  const isListRoute = !isEditorRoute;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [documents, setDocuments] = useState<EzDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [previewDoc, setPreviewDoc] = useState<EzDocument | null>(null);
  const [deliveringId, setDeliveringId] = useState<string | null>(null);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [notice, setNotice] = useState('');

  const loadProfile = useCallback(async () => {
    let nextProfile = await docsApi.getMe();
    if (!nextProfile.activeBusinessId) {
      await docsApi.bootstrapBusiness();
      nextProfile = await docsApi.getMe();
    }
    setProfile(nextProfile);
    return nextProfile;
  }, []);

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await loadProfile();
      const response = await docsApi.listDocuments({
        limit: 100,
        type: filterType || undefined,
        status: filterStatus || undefined,
      });
      setDocuments(response.documents || []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'โหลดรายการเอกสารไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterType, loadProfile]);

  useEffect(() => {
    if (!isListRoute) return;
    void loadDocuments();
  }, [isListRoute, loadDocuments]);

  useEffect(() => {
    if (!isListRoute || typeof window === 'undefined') return;
    const storedNotice = window.sessionStorage.getItem('ezboq-documents-notice');
    if (storedNotice === 'confirmed') {
      setNotice('ออกเอกสารสำเร็จแล้ว กำลังสร้าง PDF ให้ใน background');
      window.sessionStorage.removeItem('ezboq-documents-notice');
    }
  }, [isListRoute]);

  const filteredDocuments = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const nextDocs = query
      ? documents.filter((doc) => [
          doc.docNo,
          doc.issueDate,
          doc.customerSnapshot?.displayName,
          doc.subjectTh,
          formatDocType(doc.docType),
          formatDocStatus(doc.status),
        ].filter(Boolean).join(' ').toLowerCase().includes(query))
      : documents;

    return [...nextDocs].sort((left, right) => {
      const leftDate = new Date(left.issueDate || '1970-01-01').getTime();
      const rightDate = new Date(right.issueDate || '1970-01-01').getTime();
      if (leftDate !== rightDate) return rightDate - leftDate;
      return (right.docNo || '').localeCompare(left.docNo || '');
    });
  }, [documents, searchQuery]);

  const summary = useMemo(() => {
    const issued = documents.filter((doc) => doc.status === 'ISSUED' || doc.status === 'PAID');
    const paid = documents.filter((doc) => doc.status === 'PAID');
    const readyPdf = documents.filter((doc) => doc.pdfReady);

    return {
      total: documents.length,
      issued: issued.length,
      readyPdf: readyPdf.length,
      netReceive: issued.reduce((sum, doc) => sum + (doc.money?.net_receive_amount || 0), 0),
      paid: paid.length,
    };
  }, [documents]);

  const handleGeneratePdf = async (docId: string) => {
    setGeneratingId(docId);
    try {
      await docsApi.generatePdf(docId);
      await loadDocuments();
    } catch (generateError) {
      setError(generateError instanceof Error ? generateError.message : 'เริ่มสร้าง PDF ไม่สำเร็จ');
    } finally {
      setGeneratingId(null);
    }
  };

  const handleDeliver = async (docId: string) => {
    if (!profile?.activeBusinessId) {
      setError('ยังไม่พบบัญชีธุรกิจสำหรับส่งเอกสาร');
      return;
    }

    setDeliveringId(docId);
    try {
      await docsApi.deliverDocument(docId, profile.activeBusinessId);
      setNotice('ส่งลิงก์เอกสารไปที่ LINE แล้ว');
    } catch (deliverError) {
      setError(deliverError instanceof Error ? deliverError.message : 'ส่งเอกสารไป LINE ไม่สำเร็จ');
    } finally {
      setDeliveringId(null);
    }
  };

  if (!hasDocsAccessSession()) {
    return (
      <div className="ez-suite-shell py-10">
        <Card className="ez-suite-hero">
          <CardHeader>
            <CardTitle className="text-3xl ez-suite-title">EzBOQ Documents</CardTitle>
            <CardDescription className="text-base ez-suite-subtitle">
              โมดูลเอกสารใช้ Firebase token ชุดเดียวกับ EzBOQ เพื่อคุยกับ backend ของเอกสารโดยตรง
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              session ปัจจุบันยังไม่พร้อมสำหรับโมดูลเอกสาร จึงยังเปิดรายการเอกสารในหน้านี้ไม่ได้
            </p>
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => onNavigate('/')}>กลับหน้า Home</Button>
              <Button variant="outline" onClick={() => window.location.reload()}>
                ลองเชื่อมต่อใหม่
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isEditorRoute) {
    return (
      <DocumentEditor
        documentId={editId || undefined}
        onBack={() => onNavigate('/docs')}
        onIssued={() => {
          onNavigate('/docs');
          void loadDocuments();
        }}
      />
    );
  }

  return (
    <div className="ez-suite-shell py-10">
      <div className="ez-suite-stack">
        <Card className="ez-suite-hero overflow-hidden">
          <CardHeader className="border-b border-border/70">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="ez-suite-kicker">EzBOQ Module</p>
                <CardTitle className="mt-3 text-4xl ez-suite-title">Documents</CardTitle>
                <CardDescription className="mt-3 max-w-3xl text-base leading-7 ez-suite-subtitle">
                  EzDOC ถูกดึงเข้ามาเป็นโมดูลเอกสารของ EzBOQ แล้วในหน้านี้ ใช้ auth, route, และ backend ชุดเดียวกับระบบหลักโดยตรง
                </CardDescription>
                <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <Badge variant="secondary" className="rounded-full px-3 py-1">Workspace: {session.user.workspaceName}</Badge>
                  <Badge variant="outline" className="rounded-full px-3 py-1">Business: {profile?.business?.name || 'กำลังโหลด...'}</Badge>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button onClick={() => onNavigate('/docs/new')}>
                  <Sparkles className="h-4 w-4" />
                  สร้างเอกสารใหม่
                </Button>
                <Button variant="outline" onClick={() => onNavigate('/workspace')}>
                  กลับไป BOQ Workspace
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 py-6 md:grid-cols-2 xl:grid-cols-5">
            <MetricCard label="เอกสารทั้งหมด" value={String(summary.total)} icon={<FileText className="h-4 w-4" />} />
            <MetricCard label="ออกเอกสารแล้ว" value={String(summary.issued)} icon={<CheckCircle2 className="h-4 w-4" />} />
            <MetricCard label="PDF พร้อมใช้งาน" value={String(summary.readyPdf)} icon={<Eye className="h-4 w-4" />} />
            <MetricCard label="เก็บเงินแล้ว" value={String(summary.paid)} icon={<Wallet className="h-4 w-4" />} />
            <MetricCard label="ยอดรับสุทธิ" value={`฿${formatMoney(summary.netReceive)}`} icon={<Sparkles className="h-4 w-4" />} />
          </CardContent>
        </Card>

        {notice && (
          <Card className="ez-suite-card border-emerald-200 bg-emerald-50/80 shadow-none">
            <CardContent className="flex items-center justify-between gap-3 px-5 py-4">
              <p className="text-sm text-emerald-700">{notice}</p>
              <Button variant="outline" size="sm" onClick={() => setNotice('')}>ปิดข้อความ</Button>
            </CardContent>
          </Card>
        )}

        {error && (
          <Card className="ez-suite-card border-rose-200 bg-rose-50/80 shadow-none">
            <CardContent className="px-5 py-4 text-sm text-rose-700">{error}</CardContent>
          </Card>
        )}

        <Card className="ez-suite-card">
          <CardHeader>
            <CardTitle>รายการเอกสาร</CardTitle>
            <CardDescription>search, filter, preview PDF, และส่งเข้า LINE จากหน้า EzBOQ ได้เลย</CardDescription>
            <CardAction className="w-full max-w-lg">
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/80" />
                  <Input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="ค้นหาจากเลขเอกสาร, ลูกค้า, หัวข้อ"
                    className="h-11 rounded-xl pl-9"
                  />
                </div>
                <select
                  value={filterType}
                  onChange={(event) => setFilterType(event.target.value)}
                  className="h-11 min-w-[160px] rounded-xl border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-ring"
                >
                  <option value="">ทุกประเภท</option>
                  <option value="QUO">ใบเสนอราคา</option>
                  <option value="BILL">ใบวางบิล</option>
                  <option value="RECEIPT">ใบเสร็จ</option>
                  <option value="CN">ใบลดหนี้</option>
                  <option value="DN">ใบเพิ่มหนี้</option>
                </select>
                <select
                  value={filterStatus}
                  onChange={(event) => setFilterStatus(event.target.value)}
                  className="h-11 min-w-[150px] rounded-xl border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-ring"
                >
                  <option value="">ทุกสถานะ</option>
                  <option value="DRAFT">Draft</option>
                  <option value="READY">Ready</option>
                  <option value="ISSUED">Issued</option>
                  <option value="PAID">Paid</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>
            </CardAction>
          </CardHeader>

          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center gap-3 py-16 text-sm text-muted-foreground">
                <LoaderCircle className="h-5 w-5 animate-spin" />
                กำลังโหลดรายการเอกสาร...
              </div>
            ) : filteredDocuments.length === 0 ? (
              <div className="rounded-[1.5rem] border border-dashed border-border bg-secondary/60 px-6 py-14 text-center">
                <p className="text-lg font-light text-foreground">ยังไม่มีเอกสารใน workspace นี้</p>
                <p className="mt-2 text-sm text-muted-foreground">เริ่มจากสร้าง draft ใบเสนอราคา หรือดึงลูกค้าเข้ามาก่อนก็ได้</p>
                <Button className="mt-5" onClick={() => onNavigate('/docs/new')}>สร้างเอกสารแรก</Button>
              </div>
            ) : (
              <div className="rounded-[1.5rem] border border-border bg-card">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="pl-5">เลขที่ / หัวข้อ</TableHead>
                      <TableHead>ลูกค้า</TableHead>
                      <TableHead>ประเภท</TableHead>
                      <TableHead>สถานะ</TableHead>
                      <TableHead className="text-right">ยอดรับสุทธิ</TableHead>
                      <TableHead className="pr-5 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDocuments.map((doc) => {
                      const canDeliverToLine = doc.status !== 'DRAFT' && doc.pdfReady && Boolean(doc.pdfUrl);
                      const lineDisabledReason = doc.status === 'DRAFT'
                        ? 'ต้องออกเอกสารก่อนจึงจะส่งเข้า LINE ได้'
                        : !doc.pdfReady || !doc.pdfUrl
                          ? 'ต้องสร้าง PDF ให้พร้อมก่อนจึงจะส่งเข้า LINE ได้'
                          : undefined;

                      return (
                        <TableRow key={doc.id}>
                          <TableCell className="pl-5 align-top">
                            <div className="space-y-1">
                              <button
                                type="button"
                                onClick={() => onNavigate(`/docs/edit/${doc.id}`)}
                                className="text-left text-sm font-medium text-foreground transition hover:text-muted-foreground"
                              >
                                {doc.docNo || 'Draft without number'}
                              </button>
                              <p className="max-w-[24rem] truncate text-xs text-muted-foreground">{doc.subjectTh || '-'}</p>
                              <p className="text-xs text-muted-foreground/80">{doc.issueDate}</p>
                            </div>
                          </TableCell>
                          <TableCell className="align-top text-sm text-muted-foreground">
                            {doc.customerSnapshot?.displayName || '-'}
                          </TableCell>
                          <TableCell className="align-top text-sm text-muted-foreground">
                            {formatDocType(doc.docType)}
                          </TableCell>
                          <TableCell className="align-top">
                            <div className="space-y-2">
                              <Badge variant={getStatusVariant(doc.status)}>{formatDocStatus(doc.status)}</Badge>
                              {doc.pdfState && (
                                <p className="text-xs text-muted-foreground/80">PDF: {doc.pdfState}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="align-top text-right text-sm font-medium text-foreground">
                            ฿{formatMoney(doc.money?.net_receive_amount || 0)}
                          </TableCell>
                          <TableCell className="pr-5 align-top">
                            <div className="flex flex-wrap justify-end gap-2">
                              <Button variant="outline" size="sm" onClick={() => onNavigate(`/docs/edit/${doc.id}`)}>
                                เปิด
                              </Button>
                              {doc.pdfReady && doc.pdfUrl ? (
                                <Button variant="outline" size="sm" onClick={() => setPreviewDoc(doc)}>
                                  <Eye className="h-4 w-4" />
                                  PDF
                                </Button>
                              ) : (
                                <Button variant="outline" size="sm" onClick={() => void handleGeneratePdf(doc.id)} disabled={generatingId === doc.id}>
                                  {generatingId === doc.id && <LoaderCircle className="h-4 w-4 animate-spin" />}
                                  สร้าง PDF
                                </Button>
                              )}
                              <Button
                                size="sm"
                                onClick={() => void handleDeliver(doc.id)}
                                disabled={deliveringId === doc.id || !canDeliverToLine}
                                title={lineDisabledReason}
                              >
                                {deliveringId === doc.id && <LoaderCircle className="h-4 w-4 animate-spin" />}
                                <Send className="h-4 w-4" />
                                LINE
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {previewDoc?.pdfUrl && (
        <PdfPreviewModal
          docNo={previewDoc.docNo || previewDoc.subjectTh || 'Preview'}
          pdfUrl={previewDoc.pdfUrl}
          onClose={() => setPreviewDoc(null)}
        />
      )}
    </div>
  );
}

function MetricCard({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return (
    <div className="rounded-[1.5rem] border border-border bg-card px-5 py-5">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-3 text-2xl font-light text-foreground">{value}</div>
    </div>
  );
}

function PdfPreviewModal({
  docNo,
  pdfUrl,
  onClose,
}: {
  docNo: string;
  pdfUrl: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-sm">
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-white/10 bg-primary/95 px-5 py-4 text-white">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground/80">PDF Preview</p>
            <p className="mt-1 text-sm font-medium">{docNo}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild className="border-white/15 bg-transparent text-white hover:bg-card/10 hover:text-white">
              <a href={pdfUrl} target="_blank" rel="noreferrer">
                <Download className="h-4 w-4" />
                ดาวน์โหลด
              </a>
            </Button>
            <Button variant="outline" size="icon" onClick={onClose} className="border-white/15 bg-transparent text-white hover:bg-card/10 hover:text-white">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="relative flex-1 p-4">
          <iframe title={docNo} src={pdfUrl} className="h-full w-full rounded-[1.5rem] border border-white/10 bg-card shadow-2xl" />
        </div>
      </div>
    </div>,
    document.body,
  );
}
