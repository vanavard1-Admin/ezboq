'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { EzDocument as Document, DocumentItem, PaymentMilestone, documentsRepo } from '@/lib/repos/documents.repo';
import { Customer, customersRepo } from '@/lib/repos/customers.repo';
import { ArrowLeft, ArrowRight, CheckCircle2, AlertCircle, Loader2, Printer, Send } from 'lucide-react';
import Link from 'next/link';

// Step Components
import { StepClient } from './editors/StepClient';
import { StepItems } from './editors/StepItems';
import { StepReview } from './editors/StepReview';
import { useDocumentAutoSave } from '@/hooks/use-document-auto-save';
import { ErrorState } from './error-state';

interface DocumentEditorProps {
    initialData?: Document;
    isNew?: boolean;
}

type LegacyDocument = Document & {
    paymentMilestones?: PaymentMilestone[] | null;
};

const DEFAULT_ITEM: DocumentItem = {
    line_no: 1,
    description_th: '',
    qty: 1,
    unit: 'รายการ',
    unit_price: 0,
    amount: 0,
};

const STEPS = [
    { id: 1, name: 'ข้อมูลลูกค้า' },
    { id: 2, name: 'รายการ' },
    { id: 3, name: 'สรุปยอด' },
];

export default function DocumentEditor({ initialData, isNew: initialIsNew = false }: DocumentEditorProps) {
    const router = useRouter();
    const legacyInitialData = initialData as LegacyDocument | undefined;

    // Core Identity
    const [docIds, setDocId] = useState<string | undefined>(initialData?.id);
    const [isNew, setIsNew] = useState(initialIsNew);
    const [revision, setRevision] = useState(initialData?.revision || 0);

    // UX State
    const [loading, setLoading] = useState(false);
    const [currentStep, setCurrentStep] = useState(1);
    // B1: Double Action Prevention - Separate states for each action
    const [isConfirming, setIsConfirming] = useState(false);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    // B3: Error State
    const [error, setError] = useState<Error | null>(null);

    // Data State - Level 1 (Client)
    const [customers, setCustomers] = useState<Customer[]>([]);
    // Normalization helper for legacy drafts
    const normalizeDocType = (
        t?: Document['docType'] | 'CREDIT_NOTE' | 'DEBIT_NOTE'
    ): Document['docType'] => {
        if (t === 'CREDIT_NOTE') return 'CN';
        if (t === 'DEBIT_NOTE') return 'DN';
        return t ?? 'QUO';
    };

    const [docType, setDocType] = useState<'QUO' | 'BILL' | 'RECEIPT' | 'CN' | 'DN'>(normalizeDocType(initialData?.docType));
    const [customerId, setCustomerId] = useState<string>(initialData?.customerId || '');
    const [issueDate, setIssueDate] = useState<string>(initialData?.issueDate || new Date().toISOString().slice(0, 10));
    const [subjectTh, setSubjectTh] = useState(initialData?.subjectTh || '');

    // Data State - Level 2 (Items)
    const [items, setItems] = useState<DocumentItem[]>(initialData?.items || [DEFAULT_ITEM]);
    const [paymentMilestones, setPaymentMilestones] = useState<PaymentMilestone[]>(
        legacyInitialData?.payment_milestones ||
        legacyInitialData?.paymentMilestones ||
        []
    );

    // Data State - Level 3 (Calculated/Review)
    const [status] = useState(initialData?.status || 'DRAFT');
    const [discount, setDiscount] = useState(initialData?.money?.discount_amount || 0);
    const [extraFee, setExtraFee] = useState(initialData?.money?.extra_fee_amount || 0);
    const [vatEnabled, setVatEnabled] = useState(
        initialData?.taxSnapshot?.vatEnabled ?? (docType === 'QUO' ? false : true)
    );
    const [vatRate, setVatRate] = useState(initialData?.taxSnapshot?.vatRate ?? 7);
    const [whtEnabled, setWhtEnabled] = useState(
        initialData?.taxSnapshot?.whtEnabled ?? false
    );
    const [whtRate, setWhtRate] = useState(initialData?.taxSnapshot?.whtRate ?? 3);

    // Derived Client-Side Totals (For Display Only - Server is Truth)
    const subtotal = useMemo(() => items.reduce((sum, item) => sum + (Number(item.qty) * Number(item.unit_price)), 0), [items]);
    const safeDiscount = Number(discount) || 0;
    const safeExtraFee = Number(extraFee) || 0;
    const safeVatRate = Number(vatRate) || 0;
    const safeWhtRate = Number(whtRate) || 0;
    const afterDiscount = subtotal - safeDiscount + safeExtraFee;
    const vatAmount = vatEnabled ? afterDiscount * (safeVatRate / 100) : 0;
    const totalAmount = afterDiscount + vatAmount;
    const whtAmount = whtEnabled ? afterDiscount * (safeWhtRate / 100) : 0;
    const netReceive = totalAmount - whtAmount;

    useEffect(() => {
        if (docType !== 'BILL' && paymentMilestones.length > 0) {
            setPaymentMilestones([]);
        }
    }, [docType, paymentMilestones.length]);

    // Load Customers
    useEffect(() => {
        customersRepo.listCustomers().then(res => setCustomers(res.customers));
    }, []);

    // -------------------------------------------------------------------------
    // Auto-Save Engine
    // -------------------------------------------------------------------------

    // Construct payload strictly
    const currentData = useMemo(() => ({
        docType,
        customerId,
        issueDate,
        subjectTh,
        items,
        payment_milestones: paymentMilestones,
        discount_amount: discount,
        extra_fee_amount: extraFee,
        taxSnapshot: {
            vatEnabled,
            vatRate,
            whtEnabled,
            whtRate,
            whtBase: 'BEFORE_VAT' as const,
        },
        revision, // Include Revision for Optimistic Locking
    }), [docType, customerId, issueDate, subjectTh, items, paymentMilestones, discount, extraFee, vatEnabled, vatRate, whtEnabled, whtRate, revision]);

    // Handle Server Sync
    const handleServerSync = useCallback((serverDoc: Document) => {
        // Sync Revision (Critical)
        if (serverDoc.revision) setRevision(serverDoc.revision);

        // Sync Calculated Fields (Source of Truth)
        if (serverDoc.items) setItems(serverDoc.items);
        const legacyServerDoc = serverDoc as LegacyDocument;
        const serverMilestones =
            legacyServerDoc.payment_milestones ||
            legacyServerDoc.paymentMilestones ||
            [];
        if (Array.isArray(serverMilestones)) {
            setPaymentMilestones(serverMilestones);
        }
        if (serverDoc.money) {
            setDiscount(serverDoc.money.discount_amount);
            setExtraFee(serverDoc.money.extra_fee_amount);
            // Note: We don't sync subtotal etc directly as they are derived, 
            // but syncing items+discounts ensures local calc matches server calc.
        }
    }, []);

    const { saving, lastSaved, error: autosaveError, isDirty, saveNow } = useDocumentAutoSave({
        docId: docIds,
        data: currentData,
        enabled: !isNew && status === 'DRAFT',
        onSaveSuccess: handleServerSync,
        onSaveError: (err) => {
            console.error('Auto-save error:', err);
            // If conflict (409), we might need to reload. 
            // Ideally we prompt user, but for now we just log.
        }
    });

    // -------------------------------------------------------------------------
    // Wizard Logic
    // -------------------------------------------------------------------------

    const handleNext = async () => {
        // Validation Step 1
        if (currentStep === 1) {
            if (!customerId) return alert('กรุณาเลือกลูกค้า');
            if (!subjectTh) return alert('กรุณากรอกหัวข้อเอกสาร');

            if (isNew) {
                // B1: Prevent double action
                if (isCreating) return;
                setIsCreating(true);
                setLoading(true);
                try {
                    // Create Draft Immediately
                    const res = await documentsRepo.createDocument(currentData);
                    setDocId(res.id);
                    setIsNew(false);
                    setRevision(res.revision); // Init Version
                    // Persist ID in URL
                    window.history.replaceState(null, '', `/dashboard/documents/editor?id=${res.id}`);
                    setCurrentStep(2);
                } catch (err) {
                    console.error(err);
                    setError(err instanceof Error ? err : new Error('ไม่สามารถสร้างเอกสารได้'));
                } finally {
                    setLoading(false);
                    setIsCreating(false);
                }
            } else {
                // Moving 1 -> 2
                if (isDirty) await saveNow();
                setCurrentStep(2);
            }
        }
        // Validation Step 2 -> 3
        else if (currentStep === 2) {
            // MUST Save & Recalc before Review
            setLoading(true); // Show momentary loading
            try {
                const updatedDoc = await saveNow();
                if (updatedDoc) {
                    // Sync done in hook, but we double checking existence
                    setCurrentStep(3);
                } else if (!isDirty) {
                    // Clean, just move
                    setCurrentStep(3);
                } else {
                    // Error saving
                    alert('ไม่สามารถบันทึกข้อมูลได้ กรุณาลองอีกครั้ง');
                }
            } finally {
                setLoading(false);
            }
        }
    };

    const handleBack = () => {
        setCurrentStep(prev => Math.max(1, prev - 1));
    };

    // -------------------------------------------------------------------------
    // Actions
    // -------------------------------------------------------------------------

    const handleGeneratePdf = async () => {
        // B1: Prevent double action
        if (!docIds || isGeneratingPdf) return;
        if (confirm('ล็อครายการและสร้าง PDF?')) {
            setIsGeneratingPdf(true);
            setLoading(true);
            try {
                if (isDirty) await saveNow();
                await documentsRepo.generatePdf(docIds);
                alert('กำลังสร้าง PDF');
                router.refresh();
            } catch (e) {
                console.error(e);
                setError(e instanceof Error ? e : new Error('เกิดข้อผิดพลาดในการสร้าง PDF'));
            } finally {
                setLoading(false);
                setIsGeneratingPdf(false);
            }
        }
    };

    const handleConfirm = async () => {
        // B1: Prevent double action
        if (!docIds || isConfirming) return;
        // if (!confirm('ยืนยันและออกเอกสาร? ไม่สามารถแก้ไขได้หลังจากนี้')) return;
        setIsConfirming(true);
        setLoading(true);
        try {
            // Step 1: Save any pending changes
            if (isDirty) await saveNow();

            // Step 2: Mark as READY (DRAFT -> READY)
            await documentsRepo.markReady(docIds);

            // Step 3: Confirm and Issue (READY -> ISSUED)
            await documentsRepo.confirmDocument(docIds);

            // Force hard navigation to ensure we don't get stuck
            window.location.href = '/dashboard/documents?notice=confirmed';
        } catch (e: unknown) {
            console.error(e);
            const message = e instanceof Error ? e.message : 'ไม่สามารถออกเอกสารได้';
            setError(e instanceof Error ? e : new Error(message));
        } finally {
            setLoading(false);
            setIsConfirming(false);
        }
    };

    const isReadOnly = status !== 'DRAFT' && !isNew;

    // -------------------------------------------------------------------------
    // Render
    // -------------------------------------------------------------------------

    // B3: Show error state if error exists
    if (error) {
        return (
            <div className="max-w-5xl mx-auto pb-32">
                <ErrorState
                    title="เกิดข้อผิดพลาด"
                    message="ไม่สามารถดำเนินการได้ กรุณาลองอีกครั้ง"
                    error={error}
                    actions={{
                        retry: () => {
                            setError(null);
                            // Retry last action based on context
                            if (isCreating) {
                                handleNext();
                            } else if (isGeneratingPdf) {
                                handleGeneratePdf();
                            } else if (isConfirming) {
                                handleConfirm();
                            }
                        },
                        back: '/dashboard/documents',
                        contactAdmin: true,
                    }}
                />
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto pb-32">
            {/* Header & Status Bar */}
            <div className="flex items-center justify-between mb-8 pt-6">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/documents" className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full text-gray-500 dark:text-slate-400">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
                            {docType} {status !== 'DRAFT' ? initialData?.docNo : <span className="text-gray-400 dark:text-slate-400 font-normal">ร่างใหม่</span>}
                        </h1>
                        <div className="flex items-center gap-3 text-sm mt-1 h-5">
                            {/* Auto-save Indicator */}
                            {!isNew && status === 'DRAFT' && (
                                <>
                                    {saving ? (
                                        <span className="flex items-center gap-1 text-gray-500 dark:text-slate-400">
                                            <Loader2 className="w-3 h-3 animate-spin" /> กำลังบันทึก...
                                        </span>
                                    ) : autosaveError ? (
                                        <span className="flex items-center gap-1 text-red-600 font-medium">
                                            <AlertCircle className="w-3 h-3" /> บันทึกไม่สำเร็จ
                                        </span>
                                    ) : lastSaved ? (
                                        <span className="flex items-center gap-1 text-green-600">
                                            <CheckCircle2 className="w-3 h-3" /> บันทึกแล้ว
                                        </span>
                                    ) : (
                                        <span className="text-gray-400 dark:text-slate-400">บันทึกข้อมูลแล้ว</span>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Step Indicator */}
                <div className="hidden md:flex items-center gap-2 bg-gray-50 dark:bg-slate-800 px-4 py-2 rounded-lg border border-gray-200 dark:border-slate-700">
                    {STEPS.map((s, idx) => (
                        <div key={s.id} className="flex items-center">
                            <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${currentStep === s.id ? 'bg-indigo-600 text-white' :
                                currentStep > s.id ? 'bg-green-500 text-white' : 'bg-gray-300 dark:bg-slate-600 text-white'
                                }`}>
                                {currentStep > s.id ? '✓' : s.id}
                            </div>
                            <span className={`ml-2 text-sm ${currentStep === s.id ? 'font-semibold text-gray-900 dark:text-slate-100' : 'text-gray-500 dark:text-slate-400'}`}>
                                {s.name}
                            </span>
                            {idx < STEPS.length - 1 && <div className="w-8 h-px bg-gray-300 dark:bg-slate-600 mx-3" />}
                        </div>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="bg-white dark:bg-slate-900 min-h-[400px]">
                {currentStep === 1 && (
                    <StepClient
                        docType={docType} setDocType={setDocType}
                        customerId={customerId} setCustomerId={setCustomerId}
                        issueDate={issueDate} setIssueDate={setIssueDate}
                        subjectTh={subjectTh} setSubjectTh={setSubjectTh}
                        customers={customers} isReadOnly={isReadOnly} isNew={isNew}
                    />
                )}
                {currentStep === 2 && (
                    <StepItems items={items} setItems={setItems} isReadOnly={isReadOnly} />
                )}
                {currentStep === 3 && (
                    <StepReview
                        docType={docType}
                        subtotal={subtotal} totalAmount={totalAmount} netReceive={netReceive}
                        vatAmount={vatAmount} whtAmount={whtAmount}
                        discount={discount} setDiscount={setDiscount}
                        extraFee={extraFee} setExtraFee={setExtraFee}
                        vatEnabled={vatEnabled} setVatEnabled={setVatEnabled} vatRate={vatRate} setVatRate={setVatRate}
                        whtEnabled={whtEnabled} setWhtEnabled={setWhtEnabled} whtRate={whtRate} setWhtRate={setWhtRate}
                        paymentMilestones={paymentMilestones}
                        setPaymentMilestones={setPaymentMilestones}
                        isReadOnly={isReadOnly}
                    />
                )}
            </div>

            {/* Footer Controls */}
            <div className="fixed bottom-0 right-0 left-0 lg:left-72 bg-white dark:bg-slate-900 border-t dark:border-slate-700 p-4 z-[100] shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
                <div className="max-w-5xl mx-auto flex justify-between items-center">
                    <div className="flex-shrink-0">
                        {currentStep > 1 && (
                            <button
                                onClick={handleBack}
                                disabled={loading || isCreating || isConfirming || isGeneratingPdf}
                                className="px-4 sm:px-5 py-2 border dark:border-slate-700 rounded-md hover:bg-gray-50 dark:hover:bg-slate-800 disabled:bg-gray-100 dark:disabled:bg-slate-700 disabled:text-gray-400 dark:disabled:text-slate-500 disabled:cursor-not-allowed text-gray-700 dark:text-slate-200 font-medium text-sm sm:text-base"
                                data-testid="back-button"
                            >
                                ย้อนกลับ
                            </button>
                        )}
                    </div>
                    <div className="flex gap-2 sm:gap-3 flex-1 justify-end">
                        {currentStep < 3 ? (
                            <button
                                onClick={handleNext}
                                disabled={loading || isCreating}
                                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-md font-medium flex items-center gap-2"
                                data-testid="next-step-button"
                            >
                                {(loading || isCreating) && <Loader2 className="w-4 h-4 animate-spin" />}
                                ถัดไป <ArrowRight className="w-4 h-4" />
                            </button>
                        ) : (
                            // Final Actions
                            <>
                                {status === 'DRAFT' && (
                                    <button
                                        onClick={handleGeneratePdf}
                                        disabled={loading || saving || isGeneratingPdf}
                                        className="px-6 py-2 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 disabled:bg-gray-100 dark:disabled:bg-slate-700 disabled:text-gray-400 dark:disabled:text-slate-500 disabled:cursor-not-allowed rounded-md font-medium flex items-center gap-2"
                                        data-testid="generate-pdf-button"
                                    >
                                        {(loading || isGeneratingPdf) && <Loader2 className="w-4 h-4 animate-spin" />}
                                        <Printer className="w-4 h-4" /> สร้าง PDF
                                    </button>
                                )}
                                <button
                                    onClick={handleConfirm}
                                    disabled={loading || isConfirming || status !== 'DRAFT'}
                                    className={`px-6 py-2 rounded-md font-medium flex items-center gap-2 text-white disabled:cursor-not-allowed ${status === 'ISSUED' || loading || isConfirming
                                        ? 'bg-gray-400 cursor-not-allowed'
                                        : 'bg-green-600 hover:bg-green-700'
                                        }`}
                                    data-testid="confirm-document-button"
                                >
                                    {(loading || isConfirming) && <Loader2 className="w-4 h-4 animate-spin" />}
                                    <Send className="w-4 h-4" /> {status === 'ISSUED' ? 'ออกแล้ว' : 'ยืนยันและออกเอกสาร'}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
