import { useCallback, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  LoaderCircle,
  Plus,
  Printer,
  Send,
  Trash2,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';
import {
  docsApi,
  type Customer,
  type DocType,
  type EzDocument,
  type PaymentMilestone,
  type DocumentItem,
} from './docsApi';
import { loadCompanyProfile } from '../../utils/companyProfile';
import { useDocumentAutoSave } from './useDocumentAutoSave';

interface DocumentEditorProps {
  documentId?: string;
  onBack: () => void;
  onIssued: () => void;
}

type EditorStatus = EzDocument['status'] | 'LOADING';

const DEFAULT_ITEM: DocumentItem = {
  line_no: 1,
  description_th: '',
  qty: 1,
  unit: 'รายการ',
  unit_price: 0,
  amount: 0,
};

const STEPS = [
  { id: 1, label: 'ข้อมูลลูกค้า' },
  { id: 2, label: 'รายการ' },
  { id: 3, label: 'สรุปยอด' },
];

const currencyFormatter = new Intl.NumberFormat('th-TH', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatMoney(value: number) {
  return currencyFormatter.format(value || 0);
}

function normalizeDocType(type?: DocType | 'CREDIT_NOTE' | 'DEBIT_NOTE'): DocType {
  if (type === 'CREDIT_NOTE') return 'CN';
  if (type === 'DEBIT_NOTE') return 'DN';
  return type ?? 'QUO';
}

export function DocumentEditor({ documentId, onBack, onIssued }: DocumentEditorProps) {
  const [hydrating, setHydrating] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);

  const [docIds, setDocId] = useState<string | undefined>(documentId);
  const [isNew, setIsNew] = useState(!documentId);
  const [revision, setRevision] = useState(0);
  const [status, setStatus] = useState<EditorStatus>(documentId ? 'LOADING' : 'DRAFT');

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const [docType, setDocType] = useState<DocType>('QUO');
  const [customerId, setCustomerId] = useState('');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [subjectTh, setSubjectTh] = useState('');
  const [items, setItems] = useState<DocumentItem[]>([DEFAULT_ITEM]);
  const [paymentMilestones, setPaymentMilestones] = useState<PaymentMilestone[]>([]);
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState<'amount' | 'percent'>('amount');
  const [discountPct, setDiscountPct] = useState(0);
  const [extraFee, setExtraFee] = useState(0);
  const [vatEnabled, setVatEnabled] = useState(false);
  const [vatRate, setVatRate] = useState(() => {
    const cp = loadCompanyProfile();
    return cp.vatExempt ? 0 : Math.round((cp.defaultVatRate ?? 0.07) * 100 * 10) / 10;
  });
  const [whtEnabled, setWhtEnabled] = useState(false);
  const [whtRate, setWhtRate] = useState(3);

  const hydrateFromDocument = useCallback((document: EzDocument) => {
    setDocId(document.id);
    setIsNew(false);
    setRevision(document.revision || 0);
    setStatus(document.status);
    setDocType(normalizeDocType(document.docType));
    setCustomerId(document.customerId || '');
    setIssueDate(document.issueDate || new Date().toISOString().slice(0, 10));
    setSubjectTh(document.subjectTh || '');
    setItems(document.items?.length ? document.items : [DEFAULT_ITEM]);
    setPaymentMilestones(document.payment_milestones || []);
    // Restore discount: separate line-item discounts from doc-level discount
    const lineDiscTotal = document.money?.line_discount_total || 0;
    const storedDocDiscType = document.money?.discount_type ?? 'amount';
    setDiscountType(storedDocDiscType);
    setDiscountPct(document.money?.discount_pct || 0);
    setDiscount(storedDocDiscType === 'amount'
      ? Math.max(0, (document.money?.discount_amount || 0) - lineDiscTotal)
      : 0);
    setExtraFee(document.money?.extra_fee_amount || 0);
    setVatEnabled(document.taxSnapshot?.vatEnabled ?? (document.docType === 'QUO' ? false : true));
    if (document.taxSnapshot?.vatRate !== undefined) {
      setVatRate(document.taxSnapshot.vatRate);
    } else {
      const cp = loadCompanyProfile();
      setVatRate(cp.vatExempt ? 0 : Math.round((cp.defaultVatRate ?? 0.07) * 100 * 10) / 10);
    }
    setWhtEnabled(document.taxSnapshot?.whtEnabled ?? false);
    setWhtRate(document.taxSnapshot?.whtRate ?? 3);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setHydrating(true);
      setError(null);
      try {
        const [customersResponse, document] = await Promise.all([
          docsApi.listCustomers({ limit: 200 }),
          documentId ? docsApi.getDocument(documentId) : Promise.resolve(null),
        ]);

        if (cancelled) return;

        setCustomers(customersResponse.customers || []);

        if (document) {
          hydrateFromDocument(document);
        } else {
          setStatus('DRAFT');
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'ไม่สามารถโหลดโมดูลเอกสารได้');
        }
      } finally {
        if (!cancelled) setHydrating(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [documentId, hydrateFromDocument]);

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + (Number(item.qty) * Number(item.unit_price)), 0),
    [items],
  );
  const lineItemDiscountTotal = useMemo(
    () => items.reduce((sum, item) => {
      const pct = Number(item.discount_pct) || 0;
      return pct > 0 ? sum + (Number(item.qty) * Number(item.unit_price)) * (pct / 100) : sum;
    }, 0),
    [items],
  );
  const subtotalAfterItems = subtotal - lineItemDiscountTotal;
  const safeExtraFee = Number(extraFee) || 0;
  const safeVatRate = Number(vatRate) || 0;
  const safeWhtRate = Number(whtRate) || 0;
  const docDiscountAmount = discountType === 'percent'
    ? subtotalAfterItems * ((Number(discountPct) || 0) / 100)
    : (Number(discount) || 0);
  const afterDiscount = subtotalAfterItems - docDiscountAmount + safeExtraFee;
  const vatAmount = vatEnabled ? afterDiscount * (safeVatRate / 100) : 0;
  const totalAmount = afterDiscount + vatAmount;
  const whtAmount = whtEnabled ? afterDiscount * (safeWhtRate / 100) : 0;
  const netReceive = totalAmount - whtAmount;

  useEffect(() => {
    if (docType !== 'BILL' && paymentMilestones.length > 0) {
      setPaymentMilestones([]);
    }
  }, [docType, paymentMilestones.length]);

  const currentData = useMemo(() => ({
    docType,
    customerId,
    issueDate,
    subjectTh,
    items,
    payment_milestones: paymentMilestones,
    discount_amount: discountType === 'amount' ? (Number(discount) || 0) : 0,
    discount_type: discountType,
    discount_pct: Number(discountPct) || 0,
    extra_fee_amount: extraFee,
    taxSnapshot: {
      vatEnabled,
      vatRate,
      whtEnabled,
      whtRate,
      whtBase: 'BEFORE_VAT' as const,
    },
    revision,
  }), [
    customerId,
    discount,
    discountPct,
    discountType,
    docType,
    extraFee,
    issueDate,
    items,
    paymentMilestones,
    revision,
    subjectTh,
    vatEnabled,
    vatRate,
    whtEnabled,
    whtRate,
  ]);

  const handleServerSync = useCallback((serverDoc: EzDocument) => {
    setRevision(serverDoc.revision || 0);
    setStatus(serverDoc.status);
    if (serverDoc.items) setItems(serverDoc.items);
    setPaymentMilestones(serverDoc.payment_milestones || []);
    if (serverDoc.money) {
      const lineDiscTotal = serverDoc.money.line_discount_total || 0;
      const syncDiscType = serverDoc.money.discount_type ?? 'amount';
      setDiscountType(syncDiscType);
      setDiscountPct(serverDoc.money.discount_pct || 0);
      setDiscount(syncDiscType === 'amount'
        ? Math.max(0, (serverDoc.money.discount_amount || 0) - lineDiscTotal)
        : 0);
      setExtraFee(serverDoc.money.extra_fee_amount || 0);
    }
  }, []);

  const {
    saving,
    lastSaved,
    error: autosaveError,
    isDirty,
    saveNow,
  } = useDocumentAutoSave({
    docId: docIds,
    data: currentData as Partial<EzDocument>,
    enabled: !isNew && status === 'DRAFT',
    onSaveSuccess: handleServerSync,
  });

  const isReadOnly = !isNew && status !== 'DRAFT';

  const syncEditorHash = (nextDocId: string) => {
    if (typeof window === 'undefined') return;
    const url = `${window.location.pathname}${window.location.search}#docs/edit/${nextDocId}`;
    window.history.replaceState(null, '', url);
  };

  const handleNext = async () => {
    if (currentStep === 1) {
      if (!customerId) {
        setError('กรุณาเลือกลูกค้าก่อนเริ่มทำเอกสาร');
        return;
      }
      if (!subjectTh.trim()) {
        setError('กรุณากรอกหัวข้อเอกสาร');
        return;
      }

      if (isNew) {
        setLoading(true);
        setIsCreating(true);
        try {
          const created = await docsApi.createDocument(currentData);
          setDocId(created.id);
          setIsNew(false);
          hydrateFromDocument(created);
          syncEditorHash(created.id);
          setCurrentStep(2);
        } catch (createError) {
          setError(createError instanceof Error ? createError.message : 'ไม่สามารถสร้างร่างเอกสารได้');
        } finally {
          setLoading(false);
          setIsCreating(false);
        }
        return;
      }
    }

    if (currentStep === 2 && !isNew) {
      setLoading(true);
      try {
        if (isDirty) {
          const updated = await saveNow();
          if (!updated) {
            setError('บันทึกข้อมูลไม่สำเร็จ กรุณาลองอีกครั้ง');
            return;
          }
        }
      } finally {
        setLoading(false);
      }
    }

    setCurrentStep((step) => Math.min(step + 1, 3));
  };

  const handleGeneratePdf = async () => {
    if (!docIds || isGeneratingPdf) return;
    // eslint-disable-next-line no-alert
    if (!window.confirm('ล็อกรายการปัจจุบันและเริ่มสร้าง PDF ใช่หรือไม่')) return;

    setLoading(true);
    setIsGeneratingPdf(true);
    try {
      if (isDirty) await saveNow();
      await docsApi.generatePdf(docIds);
      setError(null);
    } catch (generateError) {
      setError(generateError instanceof Error ? generateError.message : 'ไม่สามารถเริ่มสร้าง PDF ได้');
    } finally {
      setLoading(false);
      setIsGeneratingPdf(false);
    }
  };

  const handleConfirm = async () => {
    if (!docIds || isConfirming || status !== 'DRAFT') return;
    setLoading(true);
    setIsConfirming(true);
    try {
      if (isDirty) await saveNow();
      await docsApi.markReady(docIds);
      await docsApi.confirmDocument(docIds);
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem('ezboq-documents-notice', 'confirmed');
      }
      onIssued();
    } catch (confirmError) {
      setError(confirmError instanceof Error ? confirmError.message : 'ไม่สามารถออกเอกสารได้');
    } finally {
      setLoading(false);
      setIsConfirming(false);
    }
  };

  const statusLine = useMemo(() => {
    if (isNew) return 'ยังไม่ได้สร้างร่างเอกสาร';
    if (saving) return 'กำลังบันทึกอัตโนมัติ...';
    if (autosaveError) return 'บันทึกอัตโนมัติไม่สำเร็จ';
    if (lastSaved) return `บันทึกแล้ว ${lastSaved.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}`;
    return 'พร้อมทำงาน';
  }, [autosaveError, isNew, lastSaved, saving]);

  if (hydrating) {
    return (
      <div className="ez-suite-shell py-10">
        <Card className="ez-suite-card">
          <CardContent className="flex items-center justify-center gap-3 py-12">
            <LoaderCircle className="h-5 w-5 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">กำลังโหลด editor เอกสาร...</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ez-suite-shell py-10">
        <Card className="ez-suite-card border-rose-200 bg-rose-50/80">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-rose-700">
              <AlertTriangle className="h-5 w-5" />
              ดำเนินการไม่สำเร็จ
            </CardTitle>
            <CardDescription className="text-rose-700/80">{error}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={() => setError(null)}>
              ลองใหม่
            </Button>
            <Button onClick={onBack}>กลับไปเอกสารทั้งหมด</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="ez-suite-shell py-10">
      <div className="ez-suite-stack">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <Button variant="outline" size="icon" onClick={onBack} className="mt-1 rounded-full">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <p className="ez-suite-kicker">EzBOQ Documents</p>
              <h1 className="mt-2 text-3xl ez-suite-title">
                {docType} {isNew ? 'Draft' : docIds ? `#${docIds.slice(0, 8)}` : ''}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge variant={status === 'DRAFT' ? 'secondary' : 'default'}>
                  {status === 'DRAFT' ? 'Draft' : status}
                </Badge>
                <span className="text-sm text-muted-foreground">{statusLine}</span>
              </div>
            </div>
          </div>

          <Card className="ez-suite-card-soft w-full max-w-md border-border shadow-none">
            <CardContent className="px-5 py-4">
              <div className="flex items-center gap-3">
                {STEPS.map((step, index) => (
                  <div key={step.id} className="flex items-center gap-3">
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold ${
                        currentStep === step.id
                          ? 'bg-[var(--doc-primary)] text-white'
                          : currentStep > step.id
                            ? 'bg-emerald-600 text-white'
                            : 'bg-secondary text-muted-foreground'
                      }`}
                    >
                      {currentStep > step.id ? '✓' : step.id}
                    </div>
                    <span className={`hidden text-sm lg:inline ${currentStep === step.id ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {step.label}
                    </span>
                    {index < STEPS.length - 1 && <div className="h-px w-4 bg-border" />}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {currentStep === 1 && (
          <StepClient
            customers={customers}
            customerId={customerId}
            docType={docType}
            issueDate={issueDate}
            isNew={isNew}
            isReadOnly={isReadOnly}
            setCustomerId={setCustomerId}
            setDocType={setDocType}
            setIssueDate={setIssueDate}
            setSubjectTh={setSubjectTh}
            subjectTh={subjectTh}
          />
        )}

        {currentStep === 2 && (
          <StepItems
            isReadOnly={isReadOnly}
            items={items}
            setItems={setItems}
          />
        )}

        {currentStep === 3 && (
          <StepReview
            discount={discount}
            discountType={discountType}
            discountPct={discountPct}
            docType={docType}
            extraFee={extraFee}
            isReadOnly={isReadOnly}
            lineItemDiscountTotal={lineItemDiscountTotal}
            netReceive={netReceive}
            paymentMilestones={paymentMilestones}
            setDiscount={setDiscount}
            setDiscountType={setDiscountType}
            setDiscountPct={setDiscountPct}
            setExtraFee={setExtraFee}
            setPaymentMilestones={setPaymentMilestones}
            setVatEnabled={setVatEnabled}
            setVatRate={setVatRate}
            setWhtEnabled={setWhtEnabled}
            setWhtRate={setWhtRate}
            subtotal={subtotal}
            totalAmount={totalAmount}
            vatAmount={vatAmount}
            vatEnabled={vatEnabled}
            vatRate={vatRate}
            whtAmount={whtAmount}
            whtEnabled={whtEnabled}
            whtRate={whtRate}
          />
        )}

        <Card className="ez-suite-card sticky bottom-4">
          <CardContent className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-muted-foreground">
              {isReadOnly
                ? 'เอกสารนี้ถูกออกแล้วและเปิดแบบ read-only'
                : 'ระบบจะ auto-save เมื่อข้อมูลเปลี่ยน และใช้ revision ล่าสุดจาก backend'}
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              {currentStep > 1 && (
                <Button variant="outline" onClick={() => setCurrentStep((step) => Math.max(step - 1, 1))} disabled={loading}>
                  ย้อนกลับ
                </Button>
              )}

              {currentStep < 3 ? (
                <Button onClick={() => void handleNext()} disabled={loading || isCreating}>
                  {(loading || isCreating) && <LoaderCircle className="h-4 w-4 animate-spin" />}
                  ถัดไป
                  <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <>
                  {status === 'DRAFT' && (
                    <Button variant="outline" onClick={() => void handleGeneratePdf()} disabled={loading || saving || isGeneratingPdf}>
                      {(loading || isGeneratingPdf) && <LoaderCircle className="h-4 w-4 animate-spin" />}
                      <Printer className="h-4 w-4" />
                      สร้าง PDF
                    </Button>
                  )}
                  <Button onClick={() => void handleConfirm()} disabled={loading || isConfirming || status !== 'DRAFT'}>
                    {(loading || isConfirming) && <LoaderCircle className="h-4 w-4 animate-spin" />}
                    <Send className="h-4 w-4" />
                    {status === 'DRAFT' ? 'ยืนยันและออกเอกสาร' : 'ออกแล้ว'}
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

interface StepClientProps {
  docType: DocType;
  setDocType: (value: DocType) => void;
  issueDate: string;
  setIssueDate: (value: string) => void;
  customerId: string;
  setCustomerId: (value: string) => void;
  customers: Customer[];
  subjectTh: string;
  setSubjectTh: (value: string) => void;
  isReadOnly: boolean;
  isNew: boolean;
}

function StepClient({
  customers,
  customerId,
  docType,
  issueDate,
  isNew,
  isReadOnly,
  setCustomerId,
  setDocType,
  setIssueDate,
  setSubjectTh,
  subjectTh,
}: StepClientProps) {
  return (
    <Card className="ez-suite-card">
      <CardHeader>
        <CardTitle>ข้อมูลลูกค้าและประเภทเอกสาร</CardTitle>
        <CardDescription>ตั้งฐานข้อมูลก่อนเริ่มสร้าง draft เพื่อให้เลขเอกสารและ customer snapshot ถูกต้องตั้งแต่ต้น</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5 md:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm text-muted-foreground">ประเภทเอกสาร</span>
          <select
            value={docType}
            onChange={(event) => setDocType(event.target.value as DocType)}
            disabled={!isNew}
            className="flex h-11 w-full rounded-xl border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-ring"
          >
            <option value="QUO">ใบเสนอราคา</option>
            <option value="BILL">ใบวางบิล</option>
            <option value="RECEIPT">ใบเสร็จรับเงิน</option>
            <option value="CN">ใบลดหนี้</option>
            <option value="DN">ใบเพิ่มหนี้</option>
          </select>
          {!isNew && <p className="text-xs text-muted-foreground">หลังสร้าง draft แล้วจะไม่เปลี่ยนประเภทเอกสาร</p>}
        </label>

        <label className="space-y-2">
          <span className="text-sm text-muted-foreground">วันที่ออกเอกสาร</span>
          <Input type="date" value={issueDate} onChange={(event) => setIssueDate(event.target.value)} disabled={isReadOnly} className="h-11 rounded-xl" />
        </label>

        <label className="space-y-2 md:col-span-2">
          <span className="text-sm text-muted-foreground">ลูกค้า</span>
          <select
            value={customerId}
            onChange={(event) => setCustomerId(event.target.value)}
            disabled={isReadOnly}
            className="flex h-11 w-full rounded-xl border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-ring"
          >
            <option value="">เลือกลูกค้าที่จะผูกกับเอกสารนี้</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.displayName} ({customer.type === 'COMPANY' ? 'บริษัท' : 'บุคคล'})
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2 md:col-span-2">
          <span className="text-sm text-muted-foreground">หัวข้อเอกสาร</span>
          <Textarea
            value={subjectTh}
            onChange={(event) => setSubjectTh(event.target.value)}
            disabled={isReadOnly}
            placeholder="เช่น งานตกแต่งภายในโครงการ Centro Ratchapruek"
            className="min-h-24 rounded-2xl"
          />
        </label>
      </CardContent>
    </Card>
  );
}

interface StepItemsProps {
  items: DocumentItem[];
  setItems: Dispatch<SetStateAction<DocumentItem[]>>;
  isReadOnly: boolean;
}

function StepItems({ items, setItems, isReadOnly }: StepItemsProps) {
  const handleItemChange = (index: number, field: keyof DocumentItem, value: string | number) => {
    setItems((current) => current.map((item, itemIndex) => {
      if (itemIndex !== index) return item;
      const next = { ...item, [field]: value };
      if (field === 'qty' || field === 'unit_price') {
        next.amount = Number(next.qty || 0) * Number(next.unit_price || 0);
      }
      return next;
    }));
  };

  const addItem = () => {
    setItems((current) => [...current, { ...DEFAULT_ITEM, line_no: current.length + 1 }]);
  };

  const removeItem = (index: number) => {
    setItems((current) => current.length === 1
      ? current
      : current
          .filter((_, itemIndex) => itemIndex !== index)
          .map((item, itemIndex) => ({ ...item, line_no: itemIndex + 1 })));
  };

  return (
    <Card className="ez-suite-card">
      <CardHeader>
        <CardTitle>รายการสินค้าและบริการ</CardTitle>
        <CardDescription>ใช้ชุดรายการเดียวกับ backend เพื่อให้ยอดรวม, VAT, และ net receive ถูกคำนวณจาก source เดียว</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.map((item, index) => (
          <div key={item.line_no} className="rounded-[1.35rem] border border-border bg-secondary/60 p-4">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-medium text-foreground">รายการ {index + 1}</p>
              {!isReadOnly && (
                <Button variant="ghost" size="sm" onClick={() => removeItem(index)} disabled={items.length === 1}>
                  <Trash2 className="h-4 w-4 text-rose-500" />
                  ลบ
                </Button>
              )}
            </div>

            <div className="grid gap-3 md:grid-cols-[minmax(0,1.8fr)_120px_120px_160px_100px]">
              <label className="space-y-2">
                <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">รายละเอียด</span>
                <Input
                  value={item.description_th}
                  onChange={(event) => handleItemChange(index, 'description_th', event.target.value)}
                  disabled={isReadOnly}
                  className="h-11 rounded-xl"
                />
              </label>

              <label className="space-y-2">
                <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">จำนวน</span>
                <Input
                  type="number"
                  value={item.qty}
                  onChange={(event) => handleItemChange(index, 'qty', Number(event.target.value) || 0)}
                  disabled={isReadOnly}
                  className="h-11 rounded-xl text-right"
                />
              </label>

              <label className="space-y-2">
                <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">หน่วย</span>
                <Input
                  value={item.unit}
                  onChange={(event) => handleItemChange(index, 'unit', event.target.value)}
                  disabled={isReadOnly}
                  className="h-11 rounded-xl"
                />
              </label>

              <label className="space-y-2">
                <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">ราคา / หน่วย</span>
                <Input
                  type="number"
                  value={item.unit_price}
                  onChange={(event) => handleItemChange(index, 'unit_price', Number(event.target.value) || 0)}
                  disabled={isReadOnly}
                  className="h-11 rounded-xl text-right"
                />
              </label>

              <label className="space-y-2">
                <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">ส่วนลด %</span>
                <Input
                  type="number"
                  value={item.discount_pct ?? 0}
                  onChange={(event) => handleItemChange(index, 'discount_pct', Number(event.target.value) || 0)}
                  disabled={isReadOnly}
                  className="h-11 rounded-xl text-right"
                  min={0}
                  max={100}
                  placeholder="0"
                />
              </label>
            </div>

            <div className="mt-4 flex items-center justify-end gap-4 text-sm text-muted-foreground">
              {(item.discount_pct ?? 0) > 0 && (
                <span className="text-rose-600">
                  ลด ฿{formatMoney(item.amount * ((item.discount_pct ?? 0) / 100))}
                </span>
              )}
              <span>
                ยอดรวมรายการนี้:{' '}
                <span className="font-medium text-foreground">
                  ฿{formatMoney(item.amount * (1 - (item.discount_pct ?? 0) / 100))}
                </span>
              </span>
            </div>
          </div>
        ))}

        {!isReadOnly && (
          <Button variant="outline" onClick={addItem}>
            <Plus className="h-4 w-4" />
            เพิ่มรายการ
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

interface StepReviewProps {
  docType: DocType;
  subtotal: number;
  lineItemDiscountTotal: number;
  discount: number;
  discountType: 'amount' | 'percent';
  discountPct: number;
  setDiscount: Dispatch<SetStateAction<number>>;
  setDiscountType: Dispatch<SetStateAction<'amount' | 'percent'>>;
  setDiscountPct: Dispatch<SetStateAction<number>>;
  extraFee: number;
  setExtraFee: Dispatch<SetStateAction<number>>;
  vatEnabled: boolean;
  setVatEnabled: Dispatch<SetStateAction<boolean>>;
  vatRate: number;
  setVatRate: Dispatch<SetStateAction<number>>;
  whtEnabled: boolean;
  setWhtEnabled: Dispatch<SetStateAction<boolean>>;
  whtRate: number;
  setWhtRate: Dispatch<SetStateAction<number>>;
  totalAmount: number;
  netReceive: number;
  vatAmount: number;
  whtAmount: number;
  paymentMilestones: PaymentMilestone[];
  setPaymentMilestones: Dispatch<SetStateAction<PaymentMilestone[]>>;
  isReadOnly: boolean;
}

function StepReview({
  discount,
  discountPct,
  discountType,
  docType,
  extraFee,
  isReadOnly,
  lineItemDiscountTotal,
  netReceive,
  paymentMilestones,
  setDiscount,
  setDiscountPct,
  setDiscountType,
  setExtraFee,
  setPaymentMilestones,
  setVatEnabled,
  setVatRate,
  setWhtEnabled,
  setWhtRate,
  subtotal,
  totalAmount,
  vatAmount,
  vatEnabled,
  vatRate,
  whtAmount,
  whtEnabled,
  whtRate,
}: StepReviewProps) {
  const addMilestone = () => {
    setPaymentMilestones((current) => [
      ...current,
      { label: `งวดที่ ${current.length + 1}`, percent: null, amount: null, note: '' },
    ]);
  };

  const updateMilestone = (index: number, key: keyof PaymentMilestone, value: string | number | null) => {
    setPaymentMilestones((current) => current.map((milestone, milestoneIndex) => {
      if (milestoneIndex !== index) return milestone;
      const next = { ...milestone, [key]: value };
      if (key === 'percent') {
        const percentValue = Number(value) || 0;
        if (!next.amount && percentValue > 0) {
          next.amount = Math.round((totalAmount * (percentValue / 100)) * 100) / 100;
        }
      }
      return next;
    }));
  };

  const removeMilestone = (index: number) => {
    setPaymentMilestones((current) => current.filter((_, milestoneIndex) => milestoneIndex !== index));
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_360px]">
      <Card className="ez-suite-card">
        <CardHeader>
          <CardTitle>ภาษีและเงื่อนไขรับเงิน</CardTitle>
          <CardDescription>กำหนด logic ของ VAT, หัก ณ ที่จ่าย และ payment milestone ให้ตรงกับ flow เอกสารจริง</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-[1.35rem] border border-border bg-secondary/60 p-4">
              <label className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-foreground">VAT</p>
                  <p className="text-sm text-muted-foreground">ใช้กับเอกสารที่ต้องรวมภาษีมูลค่าเพิ่ม</p>
                </div>
                <input type="checkbox" checked={vatEnabled} onChange={(event) => setVatEnabled(event.target.checked)} disabled={isReadOnly} />
              </label>
              {vatEnabled && (
                <label className="mt-4 block space-y-2">
                  <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">VAT Rate</span>
                  <Input type="number" value={vatRate} onChange={(event) => setVatRate(Number(event.target.value) || 0)} disabled={isReadOnly} className="h-11 rounded-xl text-right" />
                </label>
              )}
            </div>

            <div className="rounded-[1.35rem] border border-border bg-secondary/60 p-4">
              <label className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-foreground">หัก ณ ที่จ่าย</p>
                  <p className="text-sm text-muted-foreground">ใช้คำนวณ net receive ที่ลูกค้าจ่ายจริง</p>
                </div>
                <input type="checkbox" checked={whtEnabled} onChange={(event) => setWhtEnabled(event.target.checked)} disabled={isReadOnly} />
              </label>
              {whtEnabled && (
                <label className="mt-4 block space-y-2">
                  <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">WHT Rate</span>
                  <Input type="number" value={whtRate} onChange={(event) => setWhtRate(Number(event.target.value) || 0)} disabled={isReadOnly} className="h-11 rounded-xl text-right" />
                </label>
              )}
            </div>
          </div>

          {docType === 'BILL' && (
            <div className="rounded-[1.35rem] border border-border bg-card p-4">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">Payment Milestones</p>
                  <p className="text-sm text-muted-foreground">ใช้กับใบวางบิลเพื่อแยกยอดตามงวด</p>
                </div>
                {!isReadOnly && (
                  <Button variant="outline" size="sm" onClick={addMilestone}>
                    <Plus className="h-4 w-4" />
                    เพิ่มงวด
                  </Button>
                )}
              </div>

              <div className="space-y-3">
                {paymentMilestones.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-border bg-secondary/60 px-4 py-5 text-sm text-muted-foreground">
                    ยังไม่ได้แยกงวด ระบบจะใช้ยอดรวมของเอกสารนี้ทั้งก้อน
                  </div>
                )}

                {paymentMilestones.map((milestone, index) => (
                  <div key={`${milestone.label || 'milestone'}-${index}`} className="grid gap-3 rounded-2xl border border-border bg-secondary/60 p-4 md:grid-cols-[1.3fr_120px_160px_1.3fr_auto]">
                    <Input value={milestone.label || ''} onChange={(event) => updateMilestone(index, 'label', event.target.value)} disabled={isReadOnly} className="h-11 rounded-xl" />
                    <Input type="number" value={milestone.percent ?? ''} onChange={(event) => updateMilestone(index, 'percent', event.target.value ? Number(event.target.value) : null)} disabled={isReadOnly} className="h-11 rounded-xl text-right" />
                    <Input type="number" value={milestone.amount ?? ''} onChange={(event) => updateMilestone(index, 'amount', event.target.value ? Number(event.target.value) : null)} disabled={isReadOnly} className="h-11 rounded-xl text-right" />
                    <Input value={milestone.note || ''} onChange={(event) => updateMilestone(index, 'note', event.target.value)} disabled={isReadOnly} className="h-11 rounded-xl" />
                    {!isReadOnly && (
                      <Button variant="ghost" size="icon" onClick={() => removeMilestone(index)}>
                        <Trash2 className="h-4 w-4 text-rose-500" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="ez-suite-card">
        <CardHeader>
          <CardTitle>ยอดสรุป</CardTitle>
          <CardDescription>ตัวเลขฝั่งนี้จะถูกส่งไป backend เพื่อใช้เป็น source of truth ตอนออกเอกสารจริง</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ReviewRow label="รวมรายการ (ก่อนลด)" value={subtotal} />
          {lineItemDiscountTotal > 0 && (
            <ReviewRow label="ส่วนลดต่อรายการ" value={-lineItemDiscountTotal} accent="text-rose-600" />
          )}

          {/* Document-level discount */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-muted-foreground">ส่วนลดรวม</span>
              {!isReadOnly && (
                <div className="flex rounded-xl border border-border overflow-hidden text-xs">
                  <button
                    type="button"
                    onClick={() => setDiscountType('amount')}
                    className={`px-3 py-1 transition-colors ${discountType === 'amount' ? 'bg-primary text-white' : 'bg-card text-muted-foreground hover:bg-secondary'}`}
                  >
                    ฿
                  </button>
                  <button
                    type="button"
                    onClick={() => setDiscountType('percent')}
                    className={`px-3 py-1 transition-colors ${discountType === 'percent' ? 'bg-primary text-white' : 'bg-card text-muted-foreground hover:bg-secondary'}`}
                  >
                    %
                  </button>
                </div>
              )}
            </div>
            {discountType === 'amount' ? (
              <ReviewNumberInput label="" value={discount} onChange={setDiscount} disabled={isReadOnly} />
            ) : (
              <label className="flex items-center justify-between gap-4">
                <span className="text-sm text-muted-foreground" />
                <Input
                  type="number"
                  value={discountPct}
                  onChange={(event) => setDiscountPct(Number(event.target.value) || 0)}
                  disabled={isReadOnly}
                  className="h-10 w-36 rounded-xl text-right"
                  placeholder="0"
                />
              </label>
            )}
          </div>

          <ReviewNumberInput label="ค่าธรรมเนียมเพิ่ม" value={extraFee} onChange={setExtraFee} disabled={isReadOnly} />
          {vatEnabled && <ReviewRow label={`VAT ${vatRate}%`} value={vatAmount} />}
          <div className="border-t border-border pt-4">
            <ReviewRow label="ยอดรวมทั้งหมด" value={totalAmount} strong />
          </div>
          {whtEnabled && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
              <ReviewRow label={`หัก ณ ที่จ่าย ${whtRate}%`} value={-whtAmount} accent="text-amber-700" />
            </div>
          )}
          <div className="rounded-[1.35rem] bg-primary px-4 py-5 text-white">
            <div className="text-xs uppercase tracking-[0.22em] text-muted-foreground/80">Net Receive</div>
            <div className="mt-2 text-3xl font-light">฿{formatMoney(netReceive)}</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ReviewRow({
  label,
  value,
  strong,
  accent,
}: {
  label: string;
  value: number;
  strong?: boolean;
  accent?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className={`text-sm ${strong ? 'font-medium text-foreground' : 'text-muted-foreground'} ${accent || ''}`}>{label}</span>
      <span className={`text-sm ${strong ? 'font-semibold text-foreground' : 'text-foreground'} ${accent || ''}`}>฿{formatMoney(value)}</span>
    </div>
  );
}

function ReviewNumberInput({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: number;
  onChange: Dispatch<SetStateAction<number>>;
  disabled: boolean;
}) {
  return (
    <label className="flex items-center justify-between gap-4">
      <span className="text-sm text-muted-foreground">{label}</span>
      <Input
        type="number"
        value={value}
        onChange={(event) => onChange(Number(event.target.value) || 0)}
        disabled={disabled}
        className="h-10 w-36 rounded-xl text-right"
      />
    </label>
  );
}
