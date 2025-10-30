/**
 * Debug Utility for Production-Ready Logging
 * 
 * Usage:
 * - In development: Set DEBUG=true in .env or localStorage
 * - In production: Set DEBUG=false to disable all debug logs
 * 
 * Only error logs will always be shown regardless of DEBUG setting
 */

// Check if in production mode
const IS_PRODUCTION = import.meta.env.PROD || import.meta.env.MODE === 'production';

// Check if debug is enabled (from localStorage or env)
const DEBUG_ENABLED = !IS_PRODUCTION && (
  localStorage?.getItem('DEBUG') === 'true' || 
  import.meta.env.VITE_DEBUG === 'true'
);

/**
 * Debug logger - only logs in development mode
 */
export const debug = {
  log: (...args: any[]) => {
    if (DEBUG_ENABLED) {
      console.log(...args);
    }
  },
  
  warn: (...args: any[]) => {
    if (DEBUG_ENABLED) {
      console.warn(...args);
    }
  },
  
  error: (...args: any[]) => {
    // Always show errors, even in production
    console.error(...args);
  },
  
  info: (...args: any[]) => {
    if (DEBUG_ENABLED) {
      console.info(...args);
    }
  },
  
  table: (data: any) => {
    if (DEBUG_ENABLED) {
      console.table(data);
    }
  },
  
  group: (label: string) => {
    if (DEBUG_ENABLED) {
      console.group(label);
    }
  },
  
  groupEnd: () => {
    if (DEBUG_ENABLED) {
      console.groupEnd();
    }
  },
  
  time: (label: string) => {
    if (DEBUG_ENABLED) {
      console.time(label);
    }
  },
  
  timeEnd: (label: string) => {
    if (DEBUG_ENABLED) {
      console.timeEnd(label);
    }
  }
};

/**
 * Check if debug mode is enabled
 */
export const isDebugEnabled = () => DEBUG_ENABLED;

/**
 * Enable debug mode (for testing)
 */
export const enableDebug = () => {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('DEBUG', 'true');
    window.location.reload();
  }
};

/**
 * Disable debug mode
 */
export const disableDebug = () => {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem('DEBUG');
    window.location.reload();
  }
};
