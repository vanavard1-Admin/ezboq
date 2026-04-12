import { useCallback, useEffect, useRef, useState } from 'react';
import { docsApi, type EzDocument } from './docsApi';

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
  onSaveError,
}: UseDocumentAutoSaveProps) {
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [isDirty, setIsDirty] = useState(false);

  const dataRef = useRef(data);
  const lastSerializedRef = useRef('');
  const lastSavedHashRef = useRef('');
  const timeoutRef = useRef<number | null>(null);
  const savePromiseRef = useRef<Promise<EzDocument | null> | null>(null);

  useEffect(() => {
    dataRef.current = data;
    const { revision: _revision, ...dataToCompare } = data;
    const serialized = JSON.stringify(dataToCompare);

    if (serialized !== lastSerializedRef.current) {
      lastSerializedRef.current = serialized;
      if (enabled && docId) {
        setIsDirty(serialized !== lastSavedHashRef.current);
      }
    }
  }, [data, docId, enabled]);

  const save = useCallback(async () => {
    if (!docId || !enabled) return null;
    if (savePromiseRef.current) return savePromiseRef.current;

    const promise = (async () => {
      setSaving(true);
      setError(null);
      try {
        const updatedDoc = await docsApi.updateDocument(docId, dataRef.current);
        setLastSaved(new Date());
        setIsDirty(false);
        lastSavedHashRef.current = lastSerializedRef.current;
        onSaveSuccess?.(updatedDoc);
        return updatedDoc;
      } catch (saveError) {
        setError(saveError);
        onSaveError?.(saveError);
        return null;
      } finally {
        setSaving(false);
        savePromiseRef.current = null;
      }
    })();

    savePromiseRef.current = promise;
    return promise;
  }, [docId, enabled, onSaveError, onSaveSuccess]);

  useEffect(() => {
    if (!isDirty || !enabled || !docId) return undefined;
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);

    timeoutRef.current = window.setTimeout(() => {
      void save();
    }, 2000);

    return () => {
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    };
  }, [docId, enabled, isDirty, save]);

  const saveNow = useCallback(async () => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    return save();
  }, [save]);

  return {
    saving,
    lastSaved,
    error,
    isDirty,
    saveNow,
  };
}
