/**
 * 💎 Gemma Observability — Structured Request Logging
 * Traces every interaction: request_id, tools, latency, errors
 * Writes JSON lines to gemma-audit.log + console summary
 */

import { appendFileSync, readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOG_PATH = resolve(__dirname, 'gemma-audit.log');

let requestCounter = 0;

// ─── Generate Request ID ─────────────────────────
function genRequestId() {
  return `req_${Date.now().toString(36)}_${(++requestCounter).toString(36)}`;
}

// ─── Request Trace Object ─────────────────────────
export function startTrace(context = {}) {
  return {
    requestId: genRequestId(),
    startedAt: Date.now(),
    userId: context.userId || null,
    userName: context.userName || null,
    channelId: context.channelId || null,
    guildId: context.guildId || null,
    source: context.source || 'message', // 'message' | 'slash' | 'cron' | 'deep_scan'
    input: null,
    toolsCalled: [],
    agentChain: [],
    ragHits: 0,
    factsInjected: 0,
    knowledgeInjected: 0,
    toolRounds: 0,
    errors: [],
    fallbackUsed: false,
    responseLength: 0,
  };
}

// ─── Log Tool Call ────────────────────────────────
export function logTool(trace, toolName, args, durationMs, success, error = null) {
  trace.toolsCalled.push({
    tool: toolName,
    args: typeof args === 'object' ? Object.keys(args) : [],
    durationMs,
    success,
    error: error?.slice?.(0, 100) || null,
  });
}

// ─── Log Agent ────────────────────────────────────
export function logAgent(trace, role, durationMs, success) {
  trace.agentChain.push({ role, durationMs, success });
}

// ─── Log Error ────────────────────────────────────
export function logError(trace, stage, error) {
  trace.errors.push({
    stage,
    message: (error?.message || String(error)).slice(0, 200),
    at: Date.now(),
  });
}

// ─── Finalize & Write ─────────────────────────────
export function endTrace(trace, responseContent = '') {
  trace.responseLength = responseContent?.length || 0;
  trace.durationMs = Date.now() - trace.startedAt;
  trace.finishedAt = new Date().toISOString();
  trace.success = trace.errors.length === 0;

  // Write JSON line to audit log
  try {
    const line = JSON.stringify({
      id: trace.requestId,
      ts: trace.finishedAt,
      user: trace.userName,
      channel: trace.channelId,
      guild: trace.guildId,
      source: trace.source,
      durationMs: trace.durationMs,
      tools: trace.toolsCalled.map(t => t.tool),
      toolRounds: trace.toolRounds,
      factsResolved: trace.factsResolved || 0,
      factsInjected: trace.factsInjected || 0,
      dodChecked: trace.dodChecked || false,
      creativeNeeded: trace.creativeNeeded || false,
      creativeTier: trace.creativeTier || null,
      creativeModeUsed: trace.creativeModeUsed || false,
      requestTier: trace.requestTier || 'standard',
      ragHits: trace.ragHits,
      errors: trace.errors.length,
      responseLen: trace.responseLength,
      success: trace.success,
    }) + '\n';
    appendFileSync(LOG_PATH, line);
  } catch { /* don't crash on log failure */ }

  // Console summary (one line)
  const toolNames = trace.toolsCalled.map(t => t.tool).join(',') || 'none';
  const status = trace.success ? '✅' : '❌';
  console.log(
    `[TRACE] ${status} ${trace.requestId} | ${trace.requestTier || 'std'} | ${trace.durationMs}ms | tools:[${toolNames}] | facts:${trace.factsResolved || 0} | dod:${trace.dodChecked ? 'Y' : 'N'} | creative:${trace.creativeNeeded ? 'Y' : 'N'} | rag:${trace.ragHits} | err:${trace.errors.length} | len:${trace.responseLength}`
  );

  return trace;
}

// ─── Get Recent Logs (for /evolve or debugging) ──
export function getRecentLogs(limit = 20) {
  try {
    const content = readFileSync(LOG_PATH, 'utf-8');
    const lines = content.trim().split('\n').slice(-limit);
    return lines.map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  } catch { return []; }
}

// ─── Aggregate Stats ──────────────────────────────
export function getLogStats(logs) {
  if (!logs || logs.length === 0) return { count: 0 };
  const total = logs.length;
  const successes = logs.filter(l => l.success).length;
  const avgDuration = Math.round(logs.reduce((s, l) => s + (l.durationMs || 0), 0) / total);
  const toolCounts = {};
  for (const l of logs) {
    for (const t of (l.tools || [])) {
      toolCounts[t] = (toolCounts[t] || 0) + 1;
    }
  }
  const topTools = Object.entries(toolCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const errorRate = Math.round((1 - successes / total) * 100);

  return {
    count: total,
    successRate: `${Math.round(successes / total * 100)}%`,
    errorRate: `${errorRate}%`,
    avgDurationMs: avgDuration,
    topTools,
  };
}
