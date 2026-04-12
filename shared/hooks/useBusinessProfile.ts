import { useState, useEffect, useCallback } from 'react';
import { getBusinessProfile, updateBusinessProfile } from '../utils/apiService';
import type { Business } from '../types/index';

interface UseBusinessProfileReturn {
  business: Business | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  updateBusiness: (updates: Partial<Business>) => Promise<boolean>;
  isUpdating: boolean;
}

export function useBusinessProfile(userId: string): UseBusinessProfileReturn {
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchBusinessProfile = useCallback(async () => {
    if (!userId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await getBusinessProfile(userId);
      
      if (response.success && response.data) {
        setBusiness(response.data);
      } else {
        setError(response.error || 'Failed to load business profile');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const updateBusiness = useCallback(async (updates: Partial<Business>): Promise<boolean> => {
    if (!userId) return false;
    
    try {
      setIsUpdating(true);
      setError(null);
      
      const response = await updateBusinessProfile(userId, updates);
      
      if (response.success && response.data) {
        setBusiness(response.data);
        return true;
      } else {
        setError(response.error || 'Failed to update business profile');
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
      return false;
    } finally {
      setIsUpdating(false);
    }
  }, [userId]);

  const refetch = useCallback(async () => {
    await fetchBusinessProfile();
  }, [fetchBusinessProfile]);

  useEffect(() => {
    fetchBusinessProfile();
  }, [fetchBusinessProfile]);

  return {
    business,
    loading,
    error,
    refetch,
    updateBusiness,
    isUpdating,
  };
}
