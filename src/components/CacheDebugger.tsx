/**
 * Cache Debugger Component
 * Shows frontend cache statistics for debugging
 * 🚀 Nuclear Mode Performance Monitor
 */

import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { api } from '../utils/api';
import { RefreshCw, Trash2, Info } from 'lucide-react';

export function CacheDebugger() {
  const [stats, setStats] = useState<any>(null);
  const [visible, setVisible] = useState(false);
  const [warming, setWarming] = useState(false);

  const loadStats = () => {
    const cacheStats = api.cache.stats();
    setStats(cacheStats);
  };
  
  const handleWarmup = async () => {
    setWarming(true);
    try {
      await api.cache.warmup();
      loadStats();
    } finally {
      setTimeout(() => setWarming(false), 2000);
    }
  };

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 2000); // Update every 2s
    return () => clearInterval(interval);
  }, []);

  // Hide by default - press Shift+Ctrl+D to toggle
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.shiftKey && e.ctrlKey && e.key === 'D') {
        setVisible(v => !v);
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  if (!visible) {
    return (
      <div 
        className="fixed bottom-4 right-4 bg-green-500 text-white px-3 py-2 rounded-full text-xs cursor-pointer hover:bg-green-600 transition-colors shadow-lg"
        onClick={() => setVisible(true)}
        title="Click to open Cache Debugger (or press Shift+Ctrl+D)"
      >
        ⚡ Nuclear Mode Active
      </div>
    );
  }

  return (
    <Card className="fixed bottom-4 right-4 w-96 p-4 shadow-2xl z-50 bg-white">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <h3 className="font-semibold">🚀 Frontend Cache (Nuclear Mode)</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setVisible(false)}
        >
          ✕
        </Button>
      </div>

      {stats && (
        <div className="space-y-3">
          <div className="flex items-center justify-between p-2 bg-green-50 rounded">
            <span className="text-sm">Cached Endpoints</span>
            <span className="font-mono font-bold text-green-600">{stats.size}</span>
          </div>

          {stats.size > 0 && (
            <div className="max-h-64 overflow-y-auto space-y-1">
              {stats.entries.map((entry: any, idx: number) => (
                <div 
                  key={idx}
                  className="text-xs p-2 bg-gray-50 rounded flex justify-between items-center"
                >
                  <span className="truncate flex-1 font-mono">
                    {entry.endpoint.split('?')[0]}
                  </span>
                  <span className={`ml-2 px-2 py-0.5 rounded ${
                    entry.age < 60 ? 'bg-green-100 text-green-700' :
                    entry.age < 300 ? 'bg-yellow-100 text-yellow-700' :
                    'bg-orange-100 text-orange-700'
                  }`}>
                    {entry.age}s
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2">
            <Button
              variant="default"
              size="sm"
              onClick={handleWarmup}
              disabled={warming}
              className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
            >
              {warming ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Warming cache...
                </>
              ) : (
                <>
                  🔥 Warm Up Cache
                </>
              )}
            </Button>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={loadStats}
                className="flex-1"
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                Refresh
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  api.cache.clear();
                  loadStats();
                }}
                className="flex-1"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Clear
              </Button>
            </div>
          </div>

          <div className="text-xs text-gray-500 border-t pt-2 space-y-1">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold mb-1">How it works:</p>
                <ul className="space-y-0.5 ml-2">
                  <li>• <strong>Warm Up</strong>: Preloads all critical data</li>
                  <li>• 1st request: ~1-2s (queries server)</li>
                  <li>• 2nd+ requests: <strong>&lt;1ms</strong> (from cache)</li>
                  <li>• Auto-warming on app start</li>
                  <li>• Persists across browser restarts</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="text-xs text-center text-gray-400 border-t pt-2">
            Press <kbd className="px-1 bg-gray-200 rounded">Shift+Ctrl+D</kbd> to toggle
          </div>
        </div>
      )}
    </Card>
  );
}
