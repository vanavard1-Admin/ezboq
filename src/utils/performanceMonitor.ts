/**
 * Performance Monitor Utility
 * Tracks and logs performance metrics
 */

import { isProd } from './isProd';
import { getEnv } from './config';

interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
  type: 'load' | 'render' | 'api' | 'cache';
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private timers: Map<string, number> = new Map();
  private enabled: boolean = true;
  private slowLoadThreshold: number = 3000; // 3 seconds (lenient for slow networks)
  private logWarnings: boolean = false; // ⚡ Disable warnings by default
  private debugUnknown: boolean = false; // ⚡ Debug mode for finding UUID sources

  constructor() {
    // Enable only in development or when explicitly enabled
    const isExplicitlyEnabled = typeof window !== 'undefined' && 
                                window.localStorage?.getItem('PERFORMANCE_MONITOR') === 'true';
    
    if (!isProd() && !isExplicitlyEnabled) {
      return;
    }
    
    // ⚡ Enable warnings only if explicitly requested
    this.logWarnings = typeof window !== 'undefined' && 
                       typeof localStorage !== 'undefined' &&
                       localStorage.getItem('enablePerfWarnings') === 'true';
    
    // ⚡ Enable unknown operation debugging if requested
    this.debugUnknown = typeof window !== 'undefined' && 
                        typeof localStorage !== 'undefined' &&
                        localStorage.getItem('debugUnknownOps') === 'true';
    
    this.enabled = !isProd() || isExplicitlyEnabled;
  }

  /**
   * Start timing an operation
   */
  start(name: string): void {
    if (!this.enabled) return;
    
    // ⚡ Block unknown UUID/hash operations from being tracked
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(name);
    const isHash = /^[0-9a-f]{32,}$/i.test(name);
    
    if (isUUID || isHash) {
      // ⚡ Debug mode: Log who's calling with UUIDs
      if (this.debugUnknown) {
        console.log('🔍 Unknown operation detected:', name);
        console.trace('Stack trace:');
      }
      
      // Silently ignore unless warnings enabled
      if (!this.logWarnings) {
        return;
      }
    }
    
    this.timers.set(name, performance.now());
  }

  /**
   * End timing an operation and log if slow
   */
  end(name: string, type: PerformanceMetric['type'] = 'load'): number | null {
    if (!this.enabled) return null;

    const startTime = this.timers.get(name);
    if (!startTime) {
      // ⚡ Silently ignore - might be from external systems
      return null;
    }

    const duration = performance.now() - startTime;
    this.timers.delete(name);

    const metric: PerformanceMetric = {
      name,
      duration,
      timestamp: Date.now(),
      type,
    };

    this.metrics.push(metric);

    // ⚡ Filter out UUID patterns (likely from build system/modules)
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(name);
    const isHash = /^[0-9a-f]{32,}$/i.test(name);
    const isUnknown = isUUID || isHash;

    // ⚡ Don't log unknown system operations AT ALL (unless warnings explicitly enabled)
    if (isUnknown) {
      // Only log if warnings are explicitly enabled
      if (this.logWarnings) {
        const isSlow = duration > this.slowLoadThreshold;
        if (isSlow) {
          console.warn(`⚠️ Slow ${type}: ${name} took ${duration.toFixed(0)}ms (external system)`);
        } else {
          console.log(`🔍 ${type}: ${name} took ${duration.toFixed(0)}ms (tracked)`);
        }
      }
      // Otherwise, silently track and return
      return duration;
    }

    // Log with context-aware thresholds for KNOWN operations only
    const isSlow = duration > this.slowLoadThreshold;
    const isFast = duration < 300;
    
    if (isFast) {
      console.log(`⚡ Lightning ${type}: ${name} took ${duration.toFixed(0)}ms`);
    } else if (isSlow) {
      // Always warn for slow KNOWN operations (these are our operations!)
      console.warn(`⚠️ Slow ${type}: ${name} took ${duration.toFixed(0)}ms`);
    } else {
      console.log(`✅ ${type}: ${name} took ${duration.toFixed(0)}ms`);
    }

    return duration;
  }

  /**
   * Measure a function execution time
   */
  async measure<T>(
    name: string,
    fn: () => Promise<T>,
    type: PerformanceMetric['type'] = 'load'
  ): Promise<T> {
    this.start(name);
    try {
      const result = await fn();
      this.end(name, type);
      return result;
    } catch (error) {
      this.end(name, type);
      throw error;
    }
  }

  /**
   * Get all metrics
   */
  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  /**
   * Get slow operations
   */
  getSlowOperations(): PerformanceMetric[] {
    return this.metrics.filter((m) => m.duration > this.slowLoadThreshold);
  }

  /**
   * Get average duration by type
   */
  getAverageDuration(type?: PerformanceMetric['type']): number {
    const filtered = type
      ? this.metrics.filter((m) => m.type === type)
      : this.metrics;

    if (filtered.length === 0) return 0;

    const total = filtered.reduce((sum, m) => sum + m.duration, 0);
    return total / filtered.length;
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = [];
    this.timers.clear();
  }

  /**
   * Print summary report
   */
  printReport(): void {
    if (!this.enabled) return;

    console.group('📊 Performance Report');
    console.log(`Total operations: ${this.metrics.length}`);
    console.log(`Slow operations: ${this.getSlowOperations().length}`);
    console.log(`Average load time: ${this.getAverageDuration('load').toFixed(0)}ms`);
    console.log(`Average render time: ${this.getAverageDuration('render').toFixed(0)}ms`);
    console.log(`Average API time: ${this.getAverageDuration('api').toFixed(0)}ms`);
    
    const slowOps = this.getSlowOperations();
    if (slowOps.length > 0) {
      console.group('⚠️ Slow Operations:');
      slowOps.forEach((op) => {
        console.log(`  - ${op.name}: ${op.duration.toFixed(0)}ms (${op.type})`);
      });
      console.groupEnd();
    }
    
    console.groupEnd();
  }

  /**
   * Enable/disable monitoring
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      if (enabled) {
        localStorage.setItem('enablePerfMonitor', 'true');
      } else {
        localStorage.removeItem('enablePerfMonitor');
      }
    }
  }

  /**
   * Enable/disable warning logs
   */
  setLogWarnings(enabled: boolean): void {
    this.logWarnings = enabled;
    
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      if (enabled) {
        localStorage.setItem('enablePerfWarnings', 'true');
      } else {
        localStorage.removeItem('enablePerfWarnings');
      }
    }
  }

  /**
   * Set slow load threshold
   */
  setSlowLoadThreshold(ms: number): void {
    this.slowLoadThreshold = ms;
  }

  /**
   * Enable/disable debug mode for unknown operations
   */
  setDebugUnknown(enabled: boolean): void {
    this.debugUnknown = enabled;
    
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      if (enabled) {
        localStorage.setItem('debugUnknownOps', 'true');
        console.log('🔍 Debug mode enabled - will trace UUID/hash operations');
      } else {
        localStorage.removeItem('debugUnknownOps');
        console.log('🔇 Debug mode disabled');
      }
    }
  }
}

// Singleton instance
export const perfMonitor = new PerformanceMonitor();

// Helper functions
export function measureLoad<T>(name: string, fn: () => Promise<T>): Promise<T> {
  return perfMonitor.measure(name, fn, 'load');
}

export function measureRender<T>(name: string, fn: () => Promise<T>): Promise<T> {
  return perfMonitor.measure(name, fn, 'render');
}

export function measureApi<T>(name: string, fn: () => Promise<T>): Promise<T> {
  return perfMonitor.measure(name, fn, 'api');
}

// Auto-print report on page unload (dev only)
if (typeof window !== 'undefined' && getEnv('DEV') === 'true') {
  window.addEventListener('beforeunload', () => {
    perfMonitor.printReport();
  });
  
  // ⚡ Expose to window for debugging
  (window as any).perfMonitor = perfMonitor;
  
  console.log(
    '%c🔍 Performance Monitor Active',
    'color: #00bcd4; font-weight: bold;',
    '\n\n📊 Commands:',
    '\n  perfMonitor.setLogWarnings(true)   - Enable warning logs',
    '\n  perfMonitor.setLogWarnings(false)  - Disable warning logs (default)',
    '\n  perfMonitor.setDebugUnknown(true)  - Debug UUID operations (find source)',
    '\n  perfMonitor.printReport()          - Show performance report',
    '\n  perfMonitor.getSlowOperations()    - Get slow operations',
    '\n\n⚡ Status:',
    '\n  Warnings: ' + (perfMonitor.logWarnings ? 'ON' : 'OFF (default)'),
    '\n  UUID Filter: ' + (perfMonitor.logWarnings ? 'OFF' : 'ON (blocking UUIDs)'),
    '\n\n💡 Note: UUID/hash operations are filtered by default to reduce noise.'
  );
}