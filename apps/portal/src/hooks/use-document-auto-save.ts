import { useState, useEffect, useRef, useCallback } from 'react';
import { documentsRepo, EzDocument } from '@/lib/repos/documents.repo';

interface UseDocumentAutoSaveProps {
    docId?: string;
    data: Partial<EzDocument>;
    enabled?: boolean;
    onSaveSuccess?: (updatedDoc: EzDocument) => void;
    onSaveError?: (error: unknown) => void;
}

export function useDocumentAutoSave({
    docId,
    data,
    enabled = true,
    onSaveSuccess,
    onSaveError
}: UseDocumentAutoSaveProps) {
    const [saving, setSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [error, setError] = useState<unknown>(null);
    const [isDirty, setIsDirty] = useState(false);

    const dataRef = useRef(data);
    const lastSerializedRef = useRef<string>('');
    const lastSavedHashRef = useRef<string>('');
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const savedDocRef = useRef<EzDocument | null>(null);

    // Keep dataRef current
    useEffect(() => {
        dataRef.current = data;
        // Exclude revision from dirty check to prevent loop (Save -> New Rev -> Dirty -> Save)
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { revision, ...dataToCompare } = data;
        const serialized = JSON.stringify(dataToCompare);

        if (serialized !== lastSerializedRef.current) {
            lastSerializedRef.current = serialized;
            if (enabled && docId) {
                setIsDirty(serialized !== lastSavedHashRef.current);
            }
        }
    }, [data, enabled, docId]);

    const savePromiseRef = useRef<Promise<EzDocument | null> | null>(null);

    const save = useCallback(async () => {
        // Guard: No ID or disabled
        if (!docId || !enabled) return null;

        // Prevent parallel saves - join existing promise
        if (savePromiseRef.current) {
            return savePromiseRef.current;
        }

        const promise = (async () => {
            setSaving(true);
            setError(null);

            try {
                // Optimistic Lock: The data payload should ideally include 'revision' from the consumer
                const updatedDoc = await documentsRepo.updateDocument(docId, dataRef.current);

                setLastSaved(new Date());
                setIsDirty(false);
                savedDocRef.current = updatedDoc;

                lastSavedHashRef.current = lastSerializedRef.current;
                if (onSaveSuccess) onSaveSuccess(updatedDoc);
                return updatedDoc;
            } catch (err: unknown) {
                console.error('[AutoSave] Failed:', err);
                setError(err);
                if (onSaveError) onSaveError(err);
                return null;
            } finally {
                setSaving(false);
                savePromiseRef.current = null;
            }
        })();

        savePromiseRef.current = promise;
        return promise;
    }, [docId, enabled, onSaveSuccess, onSaveError]);

    // Debounce Logic
    useEffect(() => {
        if (!isDirty || !enabled || !docId) return;

        if (timeoutRef.current) clearTimeout(timeoutRef.current);

        timeoutRef.current = setTimeout(() => {
            save();
        }, 2000); // 2000ms debounce as requested

        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [isDirty, enabled, docId, save]);

    // Manual Save (Immediate)
    const saveNow = useCallback(async () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        return await save();
    }, [save]);

    return {
        saving,
        lastSaved,
        error,
        isDirty,
        saveNow
    };
}
