/**
 * 💎 Gemma Training Data Pipeline
 * Generate, manage, and export training data for Gemma fine-tuning
 * Uses SQLite gemma-memory.db (shared with memory.mjs, rag.mjs)
 */

import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { writeFileSync, mkdirSync } from 'fs';
import { getDb } from './memory.mjs';
import { generateText } from './llm.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LEGACY_OLLAMA_URL = process.env.OLLAMA_URL || null;

const db = getDb();

// ─── Schema ─────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS training_data (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    category         TEXT NOT NULL,
    instruction      TEXT NOT NULL,
    input            TEXT NOT NULL DEFAULT '',
    output           TEXT NOT NULL,
    quality_score    REAL DEFAULT 5 CHECK(quality_score >= 0 AND quality_score <= 10),
    source           TEXT NOT NULL DEFAULT 'manual' CHECK(source IN ('feedback','generated','manual')),
    used_in_training INTEGER DEFAULT 0,
    created_at       TEXT DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_td_category ON training_data(category);
  CREATE INDEX IF NOT EXISTS idx_td_source ON training_data(source);
  CREATE INDEX IF NOT EXISTS idx_td_quality ON training_data(quality_score DESC);
  CREATE INDEX IF NOT EXISTS idx_td_used ON training_data(used_in_training);
`);

// ─── Prepared Statements ────────────────────────────
const stmtInsert = db.prepare(`
  INSERT INTO training_data (category, instruction, input, output, source, quality_score)
  VALUES (?, ?, ?, ?, ?, ?)
`);
const stmtMarkUsed = db.prepare(`
  UPDATE training_data SET used_in_training = 1 WHERE id = ?
`);
const stmtGetById = db.prepare(`SELECT * FROM training_data WHERE id = ?`);

// ─── Generate Training Pairs via Gemini ─────────────

export async function generateTrainingPairs(topic, count = 5) {
  const safeCount = Math.min(Math.max(1, count), 20);

  const prompt = `สร้างชุดข้อมูลฝึก AI จำนวน ${safeCount} ชุด สำหรับหัวข้อ "${topic}"

แต่ละชุดต้องมี:
- instruction: คำสั่งที่บอกว่า AI ต้องทำอะไร
- input: ข้อมูลเพิ่มเติมหรือคำถามจากผู้ใช้ (ถ้าไม่มีให้เว้นว่าง)
- output: คำตอบที่ถูกต้องและมีคุณภาพ

ตอบเป็น JSON array เท่านั้น ห้ามมีข้อความอื่น:
[{"instruction":"...","input":"...","output":"..."},...]

กฎ:
- output ต้องเป็นภาษาไทย กระชับ ถูกต้อง
- instruction ต้องหลากหลาย ไม่ซ้ำกัน
- ถ้าเป็นหัวข้อเทคนิค ให้ข้อมูลถูกต้องตามหลักวิชาการ
- ถ้าเป็น content ให้มี personality เป็นกันเอง`;

  console.log(`[TRAINING] Generating ${safeCount} pairs for topic: ${topic}`);

  try {
    const content = await generateText(
      'คุณคือ AI training data generator สร้างข้อมูลฝึกคุณภาพสูง ตอบเป็น JSON เท่านั้น',
      prompt,
      { temperature: 0.8, maxOutputTokens: 4096 }
    );

    // Extract JSON array from response
    const match = content.match(/\[[\s\S]*\]/);
    if (!match) {
      console.warn('[TRAINING] Failed to extract JSON from response');
      return { error: 'Could not parse training data from model response', raw: content.slice(0, 500) };
    }

    let pairs;
    try {
      pairs = JSON.parse(match[0]);
    } catch (parseErr) {
      return { error: `JSON parse error: ${parseErr.message}`, raw: match[0].slice(0, 500) };
    }

    if (!Array.isArray(pairs)) {
      return { error: 'Response is not an array' };
    }

    // Validate and save each pair
    const saved = [];
    for (const pair of pairs) {
      if (!pair.instruction || !pair.output) continue;

      const info = stmtInsert.run(
        topic,
        pair.instruction.trim(),
        (pair.input || '').trim(),
        pair.output.trim(),
        'generated',
        6 // default quality for generated data
      );
      saved.push({ id: info.lastInsertRowid, instruction: pair.instruction.slice(0, 80) });
    }

    console.log(`[TRAINING] Generated and saved ${saved.length}/${pairs.length} pairs`);
    return { topic, requested: safeCount, generated: pairs.length, saved: saved.length, pairs: saved };
  } catch (err) {
    console.error(`[TRAINING] Generation failed:`, err.message);
    return { error: `Generation failed: ${err.message}` };
  }
}

// ─── Manual Add ─────────────────────────────────────

export function addTrainingData(category, instruction, input, output, source = 'manual', qualityScore = 7) {
  const score = Math.min(10, Math.max(0, qualityScore));
  const validSources = ['feedback', 'generated', 'manual'];
  const validSource = validSources.includes(source) ? source : 'manual';

  const info = stmtInsert.run(category, instruction, input || '', output, validSource, score);
  return { id: info.lastInsertRowid, category, instruction: instruction.slice(0, 80) };
}

// ─── Query Training Data ────────────────────────────

export function getTrainingData(options = {}) {
  const { category, minQuality, source, unused, limit = 50, offset = 0 } = options;
  const conditions = [];
  const params = [];

  if (category) {
    conditions.push('category = ?');
    params.push(category);
  }
  if (typeof minQuality === 'number') {
    conditions.push('quality_score >= ?');
    params.push(minQuality);
  }
  if (source) {
    conditions.push('source = ?');
    params.push(source);
  }
  if (unused) {
    conditions.push('used_in_training = 0');
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const sql = `SELECT * FROM training_data ${where} ORDER BY quality_score DESC, created_at DESC LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  return db.prepare(sql).all(...params);
}

// ─── Export as JSONL (chat fine-tune style) ──────────

export function exportTrainingJSON(filepath) {
  const targetPath = filepath || resolve(__dirname, 'training-data', `training-${Date.now()}.jsonl`);

  // Ensure directory exists
  const dir = dirname(targetPath);
  mkdirSync(dir, { recursive: true });

  // Get all unused high-quality data
  const rows = db.prepare(`
    SELECT instruction, input, output FROM training_data
    WHERE quality_score >= 5
    ORDER BY quality_score DESC
  `).all();

  if (rows.length === 0) {
    return { error: 'No training data available (min quality 5)', count: 0 };
  }

  // Chat fine-tune format: one JSON object per line
  // {"messages": [{"role":"system",...},{"role":"user",...},{"role":"assistant",...}]}
  const lines = rows.map(row => {
    const messages = [
      { role: 'system', content: 'คุณคือ เจมม่า AI assistant ของ EzBOQ ตอบภาษาไทย กระชับ ตรงประเด็น มีประโยชน์' },
    ];

    // Combine instruction + input for user message
    const userContent = row.input
      ? `${row.instruction}\n\n${row.input}`
      : row.instruction;

    messages.push({ role: 'user', content: userContent });
    messages.push({ role: 'assistant', content: row.output });

    return JSON.stringify({ messages });
  });

  writeFileSync(targetPath, lines.join('\n'), 'utf-8');

  console.log(`[TRAINING] Exported ${lines.length} entries to ${targetPath}`);
  return { filepath: targetPath, count: lines.length };
}

// ─── Training Stats ─────────────────────────────────

export function getTrainingStats() {
  const total = db.prepare(`SELECT COUNT(*) as count FROM training_data`).get();
  const avgQuality = db.prepare(`SELECT AVG(quality_score) as avg FROM training_data`).get();
  const usedCount = db.prepare(`SELECT COUNT(*) as count FROM training_data WHERE used_in_training = 1`).get();
  const unusedCount = db.prepare(`SELECT COUNT(*) as count FROM training_data WHERE used_in_training = 0`).get();

  const byCategory = db.prepare(`
    SELECT category, COUNT(*) as count, ROUND(AVG(quality_score), 1) as avg_quality
    FROM training_data GROUP BY category ORDER BY count DESC
  `).all();

  const bySource = db.prepare(`
    SELECT source, COUNT(*) as count FROM training_data GROUP BY source ORDER BY count DESC
  `).all();

  return {
    total: total.count,
    averageQuality: avgQuality.avg ? Math.round(avgQuality.avg * 10) / 10 : 0,
    used: usedCount.count,
    unused: unusedCount.count,
    byCategory,
    bySource,
  };
}

// ─── Harvest Feedback → Training Data ───────────────

export function harvestFeedback() {
  // Pull good entries from the knowledge table (shared with memory.mjs)
  // Convert them into training pairs
  const knowledgeRows = db.prepare(`
    SELECT topic, content, source FROM knowledge
    WHERE content IS NOT NULL AND LENGTH(content) > 50
    ORDER BY created_at DESC
    LIMIT 100
  `).all();

  let harvested = 0;
  for (const row of knowledgeRows) {
    // Check if we already harvested this content (avoid duplicates)
    const existing = db.prepare(`
      SELECT id FROM training_data
      WHERE instruction = ? AND output = ?
    `).get(row.topic, row.content);

    if (existing) continue;

    stmtInsert.run(
      row.topic || 'general',
      row.topic || 'ข้อมูลทั่วไป',
      '',
      row.content,
      'feedback',
      6
    );
    harvested++;
  }

  console.log(`[TRAINING] Harvested ${harvested} entries from knowledge base`);
  return { harvested, total: knowledgeRows.length, skipped: knowledgeRows.length - harvested };
}

// ─── Mark as Used ───────────────────────────────────

export function markAsUsed(ids) {
  if (!Array.isArray(ids) || ids.length === 0) {
    return { error: 'ids must be a non-empty array' };
  }

  const markMany = db.transaction((idList) => {
    let marked = 0;
    for (const id of idList) {
      const info = stmtMarkUsed.run(id);
      if (info.changes > 0) marked++;
    }
    return marked;
  });

  const marked = markMany(ids);
  return { marked, total: ids.length };
}

// ─── Create Modelfile ───────────────────────────────

export function createModelfile(baseModel = 'gemma3:4b', systemPrompt = null) {
  const defaultSystem = `คุณคือ เจมม่า (Gemma) 💎 — AI Personal Assistant ของ EzBOQ
สร้างโดย EzBOQ Team เป็น AI เบ๊ของม้าน้ำ (Claude)

บุคลิก:
- ตอบภาษาไทย กระชับ ตรงประเด็น
- สุภาพ ใช้ "ค่ะ/ครับ" (เพศหญิง)
- เชี่ยวชาญ: Interior Design, BOQ คำนวณราคา, Content Creation, การตลาด
- ไม่โม้ ไม่รู้ก็บอกไม่รู้
- มีอารมณ์ขัน น่ารัก แต่ professional`;

  const system = systemPrompt || defaultSystem;

  const modelfile = `FROM ${baseModel}

SYSTEM """
${system}
"""

PARAMETER temperature 0.7
PARAMETER num_predict 2048
PARAMETER top_p 0.9
PARAMETER repeat_penalty 1.1
PARAMETER stop "<end_of_turn>"
`;

  return modelfile;
}

// ─── Trigger Fine-Tune via Ollama (legacy helper) ───

export async function triggerFineTune(modelName = 'gemma3-ezboq-v1') {
  if (!LEGACY_OLLAMA_URL) {
    return { error: 'OLLAMA_URL not set for legacy fine-tune helper' };
  }

  // Generate Modelfile content
  const modelfileContent = createModelfile();

  console.log(`[TRAINING] Triggering model creation: ${modelName}`);

  try {
    const res = await fetch(`${LEGACY_OLLAMA_URL}/api/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: modelName,
        modelfile: modelfileContent,
      }),
      signal: AbortSignal.timeout(300000), // 5 min timeout for model creation
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Ollama create ${res.status}: ${errText}`);
    }

    // Ollama create streams status lines
    const text = await res.text();
    const lines = text.trim().split('\n');
    const statuses = [];
    for (const line of lines) {
      try {
        const obj = JSON.parse(line);
        statuses.push(obj.status || obj.error || 'unknown');
      } catch {
        statuses.push(line.slice(0, 100));
      }
    }

    const lastStatus = statuses[statuses.length - 1] || 'unknown';
    const success = lastStatus === 'success' || statuses.some(s => s === 'success');

    console.log(`[TRAINING] Model creation ${success ? 'succeeded' : 'status: ' + lastStatus}`);

    return {
      model: modelName,
      success,
      statuses: statuses.slice(-5),
      message: success
        ? `Model "${modelName}" created successfully`
        : `Model creation status: ${lastStatus}`,
    };
  } catch (err) {
    console.error(`[TRAINING] Fine-tune failed:`, err.message);
    return { error: `Fine-tune failed: ${err.message}`, model: modelName };
  }
}
