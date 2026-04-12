/**
 * 💎 Gemma Discord Bot — Self-Evolving Prompt System
 * Analyzes feedback (👍👎 reactions stored in knowledge table)
 * and suggests/applies prompt improvements automatically.
 */

import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { getDb } from './memory.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const db = getDb();

// ─── Schema ─────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS prompt_evolution (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    version INTEGER DEFAULT 1,
    prompt_section TEXT NOT NULL,
    original_prompt TEXT,
    evolved_prompt TEXT NOT NULL,
    score_before REAL,
    score_after REAL,
    applied INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_evolution_section ON prompt_evolution(prompt_section, applied);
`);

// ─── Prompt Sections ────────────────────────────
// Defines which sections of Gemma's behavior can evolve
const PROMPT_SECTIONS = [
  'personality',    // ตัวตน น้ำเสียง การตอบ
  'construction',   // ความรู้ก่อสร้าง interior
  'sales',          // ขายของ marketing content
  'schedule',       // ตาราง นัดหมาย เลขา
  'pets',           // สัตว์เลี้ยง Wendy Fur and Found
  'social_media',   // content creation โพส
  'general',        // ทั่วไป
];

// ─── Immutable Zones ─────────────────────────────
// These sections CANNOT be evolved — hard-locked for safety
// Evolve ได้เฉพาะ style/helpfulness/formatting
// ห้ามแตะ truth constraints, identity, safety rules
const IMMUTABLE_SECTIONS = new Set([
  'identity',         // ตัวตนเจมม่า ห้ามเปลี่ยน
  'safety',           // กฎเหล็ก ห้ามเปลี่ยน
  'critical_facts',   // facts สำคัญ (Wendy=Bichon, beaver=บอส)
  'role_definition',  // ลำดับชั้น ม้าน้ำ=หัวหน้า
  'credentials',      // ห้ามส่ง API key/token
  'team',             // ทีม AI ห้ามเปลี่ยนบทบาท
  'dod',              // Definition of Done — ห้ามลดเกณฑ์
  'completion_rule',  // Completion Rule — ห้ามเปลี่ยนกฎสรุปงาน
  'creative_mode',    // Creative Mode — ห้ามลดความครีเอทีฟกลับไป generic
]);

// ─── Prepared Statements ────────────────────────

// Feedback queries — reads from knowledge table
const stmtCountGoodFeedback = db.prepare(`
  SELECT COUNT(*) as count FROM knowledge WHERE topic LIKE 'feedback_good%'
`);

const stmtCountBadFeedback = db.prepare(`
  SELECT COUNT(*) as count FROM knowledge WHERE topic LIKE 'feedback_bad%'
`);

const stmtGetGoodFeedback = db.prepare(`
  SELECT topic, content, created_at FROM knowledge
  WHERE topic LIKE 'feedback_good%'
  ORDER BY created_at DESC
`);

const stmtGetBadFeedback = db.prepare(`
  SELECT topic, content, created_at FROM knowledge
  WHERE topic LIKE 'feedback_bad%'
  ORDER BY created_at DESC
`);

// Evolution table queries
const stmtInsertEvolution = db.prepare(`
  INSERT INTO prompt_evolution (version, prompt_section, original_prompt, evolved_prompt, score_before, score_after, applied)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

const stmtGetActive = db.prepare(`
  SELECT id, version, prompt_section, evolved_prompt, score_after, created_at
  FROM prompt_evolution
  WHERE applied = 1
  ORDER BY prompt_section, version DESC
`);

const stmtGetHistory = db.prepare(`
  SELECT id, version, prompt_section, original_prompt, evolved_prompt,
         score_before, score_after, applied, created_at
  FROM prompt_evolution
  ORDER BY created_at DESC
  LIMIT ?
`);

const stmtRollback = db.prepare(`
  UPDATE prompt_evolution SET applied = 0 WHERE id = ?
`);

const stmtGetById = db.prepare(`SELECT * FROM prompt_evolution WHERE id = ?`);

const stmtGetLatestVersion = db.prepare(`
  SELECT MAX(version) as max_version FROM prompt_evolution WHERE prompt_section = ?
`);

const stmtApply = db.prepare(`
  UPDATE prompt_evolution SET applied = 1 WHERE id = ?
`);

// ─── Feedback Analysis ──────────────────────────

/**
 * Count good/bad feedback from knowledge table, return stats per topic.
 * Feedback topics are expected in format: "feedback_good_<category>" or "feedback_bad_<category>"
 */
export function analyzeFeedback() {
  const goodRows = stmtGetGoodFeedback.all();
  const badRows = stmtGetBadFeedback.all();

  // Categorize feedback by extracting category from topic
  const categories = {};

  for (const row of goodRows) {
    const cat = extractCategory(row.topic, 'feedback_good');
    if (!categories[cat]) categories[cat] = { good: 0, bad: 0, goodSamples: [], badSamples: [] };
    categories[cat].good++;
    if (categories[cat].goodSamples.length < 5) {
      categories[cat].goodSamples.push(row.content);
    }
  }

  for (const row of badRows) {
    const cat = extractCategory(row.topic, 'feedback_bad');
    if (!categories[cat]) categories[cat] = { good: 0, bad: 0, goodSamples: [], badSamples: [] };
    categories[cat].bad++;
    if (categories[cat].badSamples.length < 5) {
      categories[cat].badSamples.push(row.content);
    }
  }

  return {
    totalGood: goodRows.length,
    totalBad: badRows.length,
    categories,
  };
}

/**
 * Extract category from a feedback topic string.
 * e.g. "feedback_good_construction" → "construction"
 * e.g. "feedback_bad" → "general"
 */
function extractCategory(topic, prefix) {
  const rest = topic.replace(prefix, '').replace(/^_/, '');
  if (!rest || rest.trim() === '') return 'general';
  // Map common keywords to known sections
  const lower = rest.toLowerCase();
  for (const section of PROMPT_SECTIONS) {
    if (lower.includes(section)) return section;
  }
  // Try to match by keyword
  if (/interior|ก่อสร้าง|วัสดุ|boq|ราคา|ห้อง|บิลท์/.test(lower)) return 'construction';
  if (/ขาย|lazada|affiliate|content|caption|hashtag|marketing/.test(lower)) return 'sales';
  if (/ตาราง|นัด|remind|todo|schedule|เตือน/.test(lower)) return 'schedule';
  if (/สัตว์|wendy|pet|บิชอง|fur/.test(lower)) return 'pets';
  if (/โพส|post|fb|ig|tiktok|social/.test(lower)) return 'social_media';
  if (/น้ำเสียง|ตอบ|personality|ค่ะ|emoji/.test(lower)) return 'personality';
  return 'general';
}

/**
 * Overall satisfaction score: good / (good + bad) * 100
 * Returns 100 if no feedback exists (optimistic default).
 */
export function getEvolutionScore() {
  const good = stmtCountGoodFeedback.get().count;
  const bad = stmtCountBadFeedback.get().count;
  const total = good + bad;

  if (total === 0) return { score: 100, good, bad, total };

  const score = Math.round((good / total) * 10000) / 100; // 2 decimal places
  return { score, good, bad, total };
}

/**
 * Analyze bad feedback patterns and return a list of suggested prompt improvements.
 * Each suggestion is an object with { section, issue, suggestion }.
 */
export function suggestImprovements() {
  const analysis = analyzeFeedback();
  const suggestions = [];

  for (const [category, stats] of Object.entries(analysis.categories)) {
    // Only suggest improvements if there's notable bad feedback
    if (stats.bad === 0) continue;

    const ratio = stats.good / (stats.good + stats.bad);

    // If satisfaction is below 70%, suggest improvement
    if (ratio < 0.7) {
      const section = PROMPT_SECTIONS.includes(category) ? category : 'general';
      const severity = ratio < 0.3 ? 'critical' : ratio < 0.5 ? 'needs_work' : 'could_improve';

      // Analyze bad feedback content for patterns
      const patterns = findPatterns(stats.badSamples);

      suggestions.push({
        section,
        severity,
        good: stats.good,
        bad: stats.bad,
        satisfaction: Math.round(ratio * 100),
        patterns,
        issue: `Section "${section}" has ${stats.bad} negative feedback (${Math.round(ratio * 100)}% satisfaction)`,
        suggestion: generateSuggestion(section, patterns, stats),
      });
    }
  }

  // Sort by severity (critical first)
  const severityOrder = { critical: 0, needs_work: 1, could_improve: 2 };
  suggestions.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return suggestions;
}

/**
 * Find common patterns/keywords in bad feedback samples.
 */
function findPatterns(samples) {
  if (samples.length === 0) return [];

  const wordFreq = {};
  const stopWords = new Set([
    'ที่', 'ไม่', 'ได้', 'ไม่ได้', 'มี', 'เป็น', 'ใน', 'ของ', 'จะ', 'ก็', 'ว่า',
    'the', 'is', 'a', 'an', 'and', 'or', 'but', 'to', 'of', 'in', 'for', 'not',
  ]);

  for (const sample of samples) {
    // Split by spaces and common delimiters
    const words = sample.toLowerCase().split(/[\s,.:;!?/\\]+/).filter(w => w.length > 1);
    const seen = new Set();
    for (const word of words) {
      if (stopWords.has(word) || seen.has(word)) continue;
      seen.add(word);
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    }
  }

  // Return words that appear in at least 2 samples (or all if only 1 sample)
  const threshold = Math.max(1, Math.floor(samples.length * 0.4));
  return Object.entries(wordFreq)
    .filter(([, count]) => count >= threshold)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word);
}

/**
 * Generate a human-readable suggestion for improving a prompt section.
 */
function generateSuggestion(section, patterns, stats) {
  const patternStr = patterns.length > 0 ? `Keywords found: ${patterns.join(', ')}` : '';

  const sectionSuggestions = {
    personality: `ปรับน้ำเสียง/การตอบ — อาจตอบเว่อร์เกินไป หรือไม่เป็นกันเองพอ ${patternStr}`,
    construction: `ปรับความรู้ก่อสร้าง/interior — ข้อมูลอาจไม่แม่น หรือราคาไม่อัพเดท ${patternStr}`,
    sales: `ปรับ content ขายของ — caption/hook อาจไม่ดึงดูด หรือไม่ตรง target ${patternStr}`,
    schedule: `ปรับการจัดตาราง — อาจลืมนัด หรือจัดลำดับความสำคัญไม่ดี ${patternStr}`,
    pets: `ปรับ content สัตว์เลี้ยง — อาจใช้ข้อมูลผิด (เช่น เรียกพุดเดิ้ลแทนบิชอง) ${patternStr}`,
    social_media: `ปรับ social media content — timing/format/platform อาจไม่เหมาะ ${patternStr}`,
    general: `ปรับการตอบทั่วไป — อาจตอบไม่ตรงคำถาม หรือยาวเกินไป ${patternStr}`,
  };

  return sectionSuggestions[section] || `ปรับ section "${section}" ตาม feedback ${patternStr}`;
}

// ─── Evolution Management ───────────────────────

/**
 * Save an evolved prompt to the prompt_evolution table.
 * @param {string} section - Prompt section name
 * @param {string} newPrompt - The improved prompt text
 * @param {string|null} originalPrompt - The original prompt (for reference)
 * @param {number|null} scoreBefore - Score before evolution
 * @param {number|null} scoreAfter - Score after evolution
 * @returns {{ id: number, version: number }}
 */
export function applyEvolution(section, newPrompt, originalPrompt = null, scoreBefore = null, scoreAfter = null) {
  // Enforce immutable zones — these sections cannot be evolved
  if (IMMUTABLE_SECTIONS.has(section)) {
    console.log(`[EVOLUTION] 🔒 BLOCKED: Section "${section}" is immutable — cannot evolve`);
    return { id: null, version: null, blocked: true, reason: `Section "${section}" is locked (immutable zone)` };
  }

  const latestVersion = stmtGetLatestVersion.get(section)?.max_version || 0;
  const nextVersion = latestVersion + 1;

  const result = stmtInsertEvolution.run(
    nextVersion,
    section,
    originalPrompt,
    newPrompt,
    scoreBefore,
    scoreAfter,
    1, // applied = true by default
  );

  console.log(`[EVOLUTION] ✅ Section "${section}" evolved to v${nextVersion}`);
  return { id: result.lastInsertRowid, version: nextVersion };
}

/**
 * Get all applied evolutions, grouped by section (latest version per section).
 * Use this to inject evolved prompts into the system prompt.
 */
export function getActivePrompts() {
  const rows = stmtGetActive.all();

  // Deduplicate: keep only the latest version per section
  const active = {};
  for (const row of rows) {
    if (!active[row.prompt_section] || row.version > active[row.prompt_section].version) {
      active[row.prompt_section] = row;
    }
  }

  return active;
}

/**
 * Get evolution history (all records, newest first).
 * @param {number} limit - Max records to return (default 20)
 */
export function getEvolutionHistory(limit = 20) {
  return stmtGetHistory.all(limit);
}

/**
 * Rollback an evolution by marking it as not applied.
 * @param {number} id - Evolution record ID
 */
export function rollbackEvolution(id) {
  const record = stmtGetById.get(id);
  if (!record) return { success: false, error: 'Evolution record not found' };

  stmtRollback.run(id);
  return { success: true, section: record.prompt_section, version: record.version };
}

/**
 * Re-apply a previously rolled-back evolution.
 * @param {number} id - Evolution record ID
 */
export function reapplyEvolution(id) {
  const record = stmtGetById.get(id);
  if (!record) return { success: false, error: 'Evolution record not found' };

  stmtApply.run(id);
  return { success: true, section: record.prompt_section, version: record.version };
}

/**
 * Build an evolution summary block for injection into Gemma's system prompt.
 * Returns a string of all active evolved prompts, or empty string if none.
 */
export function buildEvolutionBlock() {
  const active = getActivePrompts();
  const entries = Object.entries(active);
  if (entries.length === 0) return '';

  const lines = entries.map(([section, evo]) =>
    `## Evolved: ${section} (v${evo.version})\n${evo.evolved_prompt}`
  );

  return `\n# Self-Evolved Improvements\n${lines.join('\n\n')}`;
}

/**
 * Get a full evolution report: score, feedback stats, active evolutions, suggestions.
 */
export function getEvolutionReport() {
  const score = getEvolutionScore();
  const feedback = analyzeFeedback();
  const active = getActivePrompts();
  const suggestions = suggestImprovements();
  const history = getEvolutionHistory(10);

  return {
    score,
    feedback: {
      totalGood: feedback.totalGood,
      totalBad: feedback.totalBad,
      categories: Object.entries(feedback.categories).map(([cat, s]) => ({
        category: cat,
        good: s.good,
        bad: s.bad,
        satisfaction: s.good + s.bad > 0 ? Math.round((s.good / (s.good + s.bad)) * 100) : 100,
      })),
    },
    activeEvolutions: Object.keys(active).length,
    suggestions: suggestions.length,
    topSuggestions: suggestions.slice(0, 3),
    recentHistory: history.slice(0, 5),
  };
}
