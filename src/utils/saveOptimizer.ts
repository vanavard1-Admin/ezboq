/**
 * Save Optimizer
 * ===============
 * Optimizes save operations with debouncing, payload compression, and performance monitoring
 */

import { log } from './logger';

interface DebouncedSaveOptions {
  delay?: number;
  maxWait?: number;
  leading?: boolean;
}

/**
 * Debounced save function
 * Delays save operations to reduce server load
 */
export class DebouncedSave {
  private timeoutId: NodeJS.Timeout | null = null;
  private maxWaitTimeoutId: NodeJS.Timeout | null = null;
  private lastCallTime: number = 0;
  private pendingArgs: any[] = [];

  constructor(
    private fn: (...args: any[]) => Promise<any>,
    private options: DebouncedSaveOptions = {}
  ) {
    this.options = {
      delay: 1000, // 1 second default
      maxWait: 5000, // 5 seconds max wait
      leading: false,
      ...options,
    };
  }

  async execute(...args: any[]): Promise<any> {
    this.pendingArgs = args;
    const now = Date.now();

    // Clear existing timeout
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }

    // Leading edge execution
    if (this.options.leading && !this.lastCallTime) {
      this.lastCallTime = now;
      return this.fn(...args);
    }

    // Set max wait timeout if not already set
    if (this.options.maxWait && !this.maxWaitTimeoutId) {
      this.maxWaitTimeoutId = setTimeout(() => {
        this.flush();
      }, this.options.maxWait);
    }

    // Return promise that resolves when save completes
    return new Promise((resolve, reject) => {
      this.timeoutId = setTimeout(async () => {
        try {
          const result = await this.flush();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      }, this.options.delay);
    });
  }

  async flush(): Promise<any> {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    if (this.maxWaitTimeoutId) {
      clearTimeout(this.maxWaitTimeoutId);
      this.maxWaitTimeoutId = null;
    }

    if (this.pendingArgs.length > 0) {
      const args = this.pendingArgs;
      this.pendingArgs = [];
      this.lastCallTime = Date.now();
      return this.fn(...args);
    }
  }

  cancel(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    if (this.maxWaitTimeoutId) {
      clearTimeout(this.maxWaitTimeoutId);
      this.maxWaitTimeoutId = null;
    }
    this.pendingArgs = [];
  }
}

/**
 * Payload size analyzer
 * Logs warnings for large payloads
 */
export function analyzePayloadSize(data: any, name: string = 'payload'): number {
  const jsonString = JSON.stringify(data);
  const sizeBytes = new Blob([jsonString]).size;
  const sizeKB = Math.round(sizeBytes / 1024);
  const sizeMB = (sizeBytes / (1024 * 1024)).toFixed(2);

  if (sizeBytes > 1024 * 1024) {
    // > 1MB
    log.warn(`⚠️ LARGE ${name}: ${sizeMB}MB (${sizeBytes} bytes)`);
    log.warn(`💡 Consider splitting into smaller chunks or using compression`);
  } else if (sizeBytes > 100 * 1024) {
    // > 100KB
    log.info(`📦 Medium ${name}: ${sizeKB}KB`);
  } else {
    log.debug(`📦 Small ${name}: ${sizeKB}KB`);
  }

  return sizeBytes;
}

/**
 * Simple payload compression using delta encoding
 * Only sends changed fields
 */
export function createDelta(oldData: any, newData: any): any {
  if (!oldData) return newData;

  const delta: any = {};
  let hasChanges = false;

  for (const key in newData) {
    if (JSON.stringify(oldData[key]) !== JSON.stringify(newData[key])) {
      delta[key] = newData[key];
      hasChanges = true;
    }
  }

  return hasChanges ? delta : null;
}

/**
 * Performance monitor for save operations
 */
export class SavePerformanceMonitor {
  private saves: Array<{ timestamp: number; duration: number; size: number }> = [];
  private readonly MAX_HISTORY = 20;

  record(duration: number, size: number): void {
    this.saves.push({
      timestamp: Date.now(),
      duration,
      size,
    });

    // Keep only recent saves
    if (this.saves.length > this.MAX_HISTORY) {
      this.saves.shift();
    }

    this.analyze();
  }

  private analyze(): void {
    if (this.saves.length < 3) return;

    const recent = this.saves.slice(-5);
    const avgDuration = recent.reduce((sum, s) => sum + s.duration, 0) / recent.length;
    const avgSize = recent.reduce((sum, s) => sum + s.size, 0) / recent.length;

    if (avgDuration > 3000) {
      log.warn(`📊 Average save time: ${Math.round(avgDuration)}ms (Slow)`);
      log.warn(`📊 Average payload: ${Math.round(avgSize / 1024)}KB`);
      log.warn(`💡 Recommendations:`);
      
      if (avgSize > 500 * 1024) {
        log.warn(`  - Reduce payload size (currently ${Math.round(avgSize / 1024)}KB)`);
      }
      if (avgDuration > 5000) {
        log.warn(`  - Check server performance and database queries`);
      }
      log.warn(`  - Consider enabling auto-save debouncing`);
    }
  }

  getStats() {
    if (this.saves.length === 0) return null;

    const durations = this.saves.map(s => s.duration);
    const sizes = this.saves.map(s => s.size);

    return {
      count: this.saves.length,
      avgDuration: Math.round(durations.reduce((a, b) => a + b, 0) / durations.length),
      maxDuration: Math.max(...durations),
      minDuration: Math.min(...durations),
      avgSize: Math.round(sizes.reduce((a, b) => a + b, 0) / sizes.length / 1024),
      maxSize: Math.round(Math.max(...sizes) / 1024),
    };
  }
}

// Global performance monitor
export const saveMonitor = new SavePerformanceMonitor();

/**
 * Optimistic update helper
 * Updates UI immediately while save is in progress
 */
export class OptimisticUpdate<T> {
  private rollbackData: T | null = null;

  start(currentData: T): void {
    this.rollbackData = JSON.parse(JSON.stringify(currentData));
  }

  async commit(saveFn: () => Promise<void>): Promise<boolean> {
    try {
      await saveFn();
      this.rollbackData = null;
      return true;
    } catch (error) {
      log.error('❌ Save failed, rolling back:', error);
      return false;
    }
  }

  getRollbackData(): T | null {
    return this.rollbackData;
  }

  clear(): void {
    this.rollbackData = null;
  }
}

/**
 * Batch save operations
 * Combines multiple saves into one
 */
export class BatchSaver {
  private pending: Map<string, any> = new Map();
  private timeoutId: NodeJS.Timeout | null = null;
  private readonly BATCH_DELAY = 500;

  add(key: string, data: any): void {
    this.pending.set(key, data);
    
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }

    this.timeoutId = setTimeout(() => {
      this.flush();
    }, this.BATCH_DELAY);
  }

  async flush(): Promise<void> {
    if (this.pending.size === 0) return;

    const batch = Array.from(this.pending.entries());
    this.pending.clear();

    log.debug(`📦 Flushing batch save (${batch.length} items)`);
    
    // Process batch
    // Implementation depends on your API
  }
}
