/**
 * Cache Warmup Indicator
 * Shows a small toast when cache warmup is in progress
 * Auto-hides when complete
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, CheckCircle, Clock } from 'lucide-react';
import { log } from '../utils/logger';

export function CacheWarmupIndicator() {
  const [warming, setWarming] = useState(false);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    // Check if warmup is needed (cache is empty or mostly empty)
    const stats = api.cache.stats();
    
    // 🎯 Check for critical analytics endpoints specifically
    const hasCriticalCache = stats.entries.some(e => 
      e.endpoint.includes('/analytics?range=month') || 
      e.endpoint.includes('/analytics?range=6months')
    );
    
    if (!hasCriticalCache || stats.size < 8) {
      // Cache is cold, warmup probably starting
      setWarming(true);
      log.debug('🔥 Cache warmup indicator: Starting...');
      
      // Check periodically
      const checkInterval = setInterval(() => {
        const newStats = api.cache.stats();
        const hasAnalyticsNow = newStats.entries.some(e => 
          e.endpoint.includes('/analytics?range=month') || 
          e.endpoint.includes('/analytics?range=6months')
        );
        
        // ✅ Consider warmed up when we have analytics endpoints cached
        if (hasAnalyticsNow && newStats.size >= 8) {
          setWarming(false);
          setCompleted(true);
          log.debug('✅ Cache warmup complete! Analytics ready.');
          
          // Hide success message after 2 seconds
          setTimeout(() => setCompleted(false), 2000);
          
          clearInterval(checkInterval);
        }
      }, 500); // Check every 500ms (faster detection)
      
      // Stop checking after 10 seconds regardless
      setTimeout(() => {
        clearInterval(checkInterval);
        if (warming) {
          log.debug('⚡ Cache warmup timeout - continuing in background');
          setWarming(false);
        }
      }, 10000);
      
      return () => clearInterval(checkInterval);
    } else {
      log.debug('✅ Cache already warm! Analytics available.');
    }
  }, []);

  if (completed) {
    return (
      <div className="fixed top-4 right-4 z-50 animate-in fade-in slide-in-from-top-2">
        <div className="bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
          <span className="text-lg">⚡</span>
          <span className="text-sm font-medium">Analytics ready - Dashboard loaded!</span>
        </div>
      </div>
    );
  }

  if (!warming) return null;

  return (
    <div className="fixed top-4 right-4 z-50 animate-in fade-in slide-in-from-top-2">
      <div className="bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm font-medium">Loading analytics...</span>
      </div>
    </div>
  );
}