import { useEffect, useRef } from 'react';

/**
 * 🔒 SECURITY: Prevent memory leaks and race conditions
 * 
 * This hook ensures that:
 * 1. Previous requests are aborted when component unmounts or deps change
 * 2. setState is never called after component unmounts
 * 3. AbortSignal is passed to fetch requests for proper cancellation
 * 
 * @example
 * useAbortableEffect((signal) => {
 *   let mounted = true;
 *   
 *   // Load from cache first
 *   const cached = getUserLocalStorage('cache-customers');
 *   if (cached && mounted) setData(JSON.parse(cached));
 *   
 *   // Subscribe to cache updates
 *   api.cache.subscribe('customers', (data) => mounted && setData(data));
 *   
 *   // Fetch with signal
 *   loadData({ signal }).catch(() => {});
 *   
 *   return () => { mounted = false; };
 * }, [dependencies]);
 */
export function useAbortableEffect(
  effect: (signal: AbortSignal) => void | (() => void),
  deps: React.DependencyList
): void {
  const ctrlRef = useRef<AbortController>();
  
  useEffect(() => {
    // Abort previous request if still running
    if (ctrlRef.current) {
      ctrlRef.current.abort();
    }
    
    // Create new AbortController for this effect
    const ctrl = new AbortController();
    ctrlRef.current = ctrl;
    
    // Run the effect with the signal
    const cleanup = effect(ctrl.signal);
    
    // Cleanup function
    return () => {
      // Abort the request
      ctrl.abort();
      
      // Run custom cleanup if provided
      if (typeof cleanup === 'function') {
        cleanup();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
