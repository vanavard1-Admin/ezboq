import { useState, useEffect, useCallback } from 'react';
import { getDocuments, createDocument, updateDocument } from '../utils/apiService';
import type { DocumentPipelineData, ProjectStatus } from '../types/index';

interface UseDocumentsOptions {
  limit?: number;
  status?: ProjectStatus;
  businessId?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface UseDocumentsReturn {
  documents: DocumentPipelineData[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createNewDocument: (document: Partial<DocumentPipelineData>) => Promise<DocumentPipelineData | null>;
  updateDocumentById: (documentId: string, updates: Partial<DocumentPipelineData>) => Promise<DocumentPipelineData | null>;
  isCreating: boolean;
  isUpdating: boolean;
  totalCount: number;
}

export function useDocuments(userId: string, options: UseDocumentsOptions = {}): UseDocumentsReturn {
  const [documents, setDocuments] = useState<DocumentPipelineData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  const {
    limit = 50,
    status,
    businessId,
    autoRefresh = false,
    refreshInterval = 30000, // 30 seconds
  } = options;

  const fetchDocuments = useCallback(async () => {
    if (!userId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await getDocuments(userId, {
        limit,
        status,
        businessId,
      });
      
      if (response.success && response.data) {
        setDocuments(response.data);
        setTotalCount(response.data.length);
      } else {
        setError(response.error || 'Failed to load documents');
        setDocuments([]);
        setTotalCount(0);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      setDocuments([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [userId, limit, status, businessId]);

  const createNewDocument = useCallback(async (document: Partial<DocumentPipelineData>): Promise<DocumentPipelineData | null> => {
    if (!userId) return null;
    
    try {
      setIsCreating(true);
      setError(null);
      
      const response = await createDocument(userId, document);
      
      if (response.success && response.data) {
        // Add to local state for immediate feedback
        setDocuments(prev => [response.data!, ...prev]);
        setTotalCount(prev => prev + 1);
        return response.data;
      } else {
        setError(response.error || 'Failed to create document');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Creation failed');
      return null;
    } finally {
      setIsCreating(false);
    }
  }, [userId]);

  const updateDocumentById = useCallback(async (documentId: string, updates: Partial<DocumentPipelineData>): Promise<DocumentPipelineData | null> => {
    if (!userId || !documentId) return null;
    
    try {
      setIsUpdating(true);
      setError(null);
      
      const response = await updateDocument(userId, documentId, updates);
      
      if (response.success && response.data) {
        // Update local state
        setDocuments(prev => 
          prev.map(doc => 
            doc.id === documentId ? { ...doc, ...response.data } : doc
          )
        );
        return response.data;
      } else {
        setError(response.error || 'Failed to update document');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
      return null;
    } finally {
      setIsUpdating(false);
    }
  }, [userId]);

  const refetch = useCallback(async () => {
    await fetchDocuments();
  }, [fetchDocuments]);

  // Initial fetch
  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh || refreshInterval <= 0) return;

    const interval = setInterval(() => {
      fetchDocuments();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchDocuments]);

  return {
    documents,
    loading,
    error,
    refetch,
    createNewDocument,
    updateDocumentById,
    isCreating,
    isUpdating,
    totalCount,
  };
}
