/**
 * 💎 Gemma Secretary System — เลขาส่วนตัว 4 ผู้เชี่ยวชาญ
 *
 * Specialist 1: EzBOQ Expert — frontend/backend/deployment/production
 * Specialist 2: Game Expert — Imperial Rise, bugs, models, balance
 * Specialist 3: Vanavard Manager — interior design, social media, clients
 * Specialist 4: Pet Manager — Wendy content + Fur and Found store
 *
 * ทุกเช้า 7:00 → morning briefing DM
 * ทุกวัน → เสนอ 1 idea ต่อ specialist → บอส approve
 * บอสสั่งงาน → assign ให้ specialist ที่เหมาะ
 */

import { resolve, dirname, relative } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { getDb } from './memory.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const db = getDb();
const LOCAL_EZBOQ_ROOT = resolve(__dirname, '..', '..');

function normalizeSecretaryTask(task = '') {
  return String(task || '')
    .replace(/\r/g, '')
    .split('\n')
    .map((line) => line.trimEnd())
    .filter((line, index, lines) => {
      if (index !== lines.length - 1) return true;
      return !/^(ต่อ|ต่อเลย|ทำต่อ|ทำต่อเลย|ทำต่อได้เลย|ทำต่อให้เสร็จ|ลุยต่อ|ไปต่อ|continue|resume)$/i.test(line.trim());
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function firstExistingPath(candidates = []) {
  const normalized = [...new Set(
    candidates
      .map((item) => String(item || '').trim())
      .filter(Boolean),
  )];

  for (const candidate of normalized) {
    if (existsSync(candidate)) {
      return resolve(candidate);
    }
  }

  return normalized[0] ? resolve(normalized[0]) : null;
}

function resolveSpecialistProjectPath(projectKey, fallbackCandidates = []) {
  const upper = String(projectKey || '').trim().toUpperCase();
  return firstExistingPath([
    process.env[`GEMMA_PROJECT_${upper}_PATH`],
    process.env[`${upper}_PROJECT_PATH`],
    ...fallbackCandidates,
  ]);
}

// ─── Schema ─────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS secretary_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    specialist TEXT NOT NULL,
    task TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending','in_progress','done','cancelled')),
    priority TEXT DEFAULT 'medium' CHECK(priority IN ('high','medium','low')),
    result TEXT,
    assigned_at TEXT DEFAULT (datetime('now')),
    completed_at TEXT
  );

  CREATE TABLE IF NOT EXISTS secretary_ideas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    specialist TEXT NOT NULL,
    idea TEXT NOT NULL,
    detail TEXT,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
    message_id TEXT,
    proposed_at TEXT DEFAULT (datetime('now')),
    decided_at TEXT
  );

  CREATE TABLE IF NOT EXISTS secretary_scans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    specialist TEXT NOT NULL,
    scan_data TEXT NOT NULL,
    scanned_at TEXT DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_tasks_spec ON secretary_tasks(specialist, status);
  CREATE INDEX IF NOT EXISTS idx_ideas_status ON secretary_ideas(status);
`);

function dedupePendingSecretaryTasks() {
  const rows = db.prepare(`
    SELECT id, specialist, task, status
    FROM secretary_tasks
    WHERE status IN ('pending','in_progress')
    ORDER BY id DESC
  `).all();

  const seen = new Set();
  let deduped = 0;

  for (const row of rows) {
    const key = `${row.specialist}::${normalizeSecretaryTask(row.task)}`;
    if (!key.trim()) continue;
    if (!seen.has(key)) {
      seen.add(key);
      continue;
    }

    db.prepare(`
      UPDATE secretary_tasks
      SET status = 'cancelled', result = COALESCE(result, 'deduped automatically')
      WHERE id = ?
    `).run(row.id);
    deduped++;
  }

  if (deduped > 0) {
    console.log(`[SECRETARY] 🧹 Deduped ${deduped} duplicate pending tasks`);
  }
}

dedupePendingSecretaryTasks();

// ─── Specialists ────────────────────────────────
export const SPECIALISTS = {
  ezboq: {
    icon: '🏗️',
    name: 'EzBOQ Expert',
    nameTh: 'ผู้เชี่ยวชาญ EzBOQ',
    description: 'รู้ทุกอย่างเกี่ยวกับ EzBOQ — React frontend, Firebase backend, deployment, LINE Bot, Shop Module',
    projectPath: resolveSpecialistProjectPath('ezboq', [
      '/root/projects/ezboq',
      LOCAL_EZBOQ_ROOT,
      '/Users/l168/Documents/ใบเสนอราคา',
    ]),
    scanFiles: [
      'apps/web/package.json',
      'apps/web/src/App.tsx',
      'apps/web/src/components',      // scan directory — 80+ components
      'firebase.json',
      'functions/package.json',
      'functions/src/index.ts',       // main entry — 80+ exports
      'functions/src/lineWebhookV1.ts',
      'functions/src/lazadaProductSearch.ts',
      'functions/src/core',           // scan directory — state machine, handlers
      'functions/src/scheduled',      // scan directory — cron jobs
      'shared/',                      // scan directory
    ],
    scanPatterns: ['**/*.jsx', '**/*.tsx', 'functions/**/*.js'],
    scanDepth: 3,
    basePrompt: `คุณคือ product manager + full-stack expert ของ EzBOQ (เว็บใบเสนอราคา+BOQ สำหรับผู้รับเหมา/interior designer ไทย)
Tech: React 18+Vite+TailwindCSS+Radix UI+Firebase (ezdoc-v1-th) | 80+ components, 80+ functions
Portal: Next.js 16 (EzDoc) | Domain: ezboq.com + doc.ezboq.com
Vision: "Easy Business Online & Quality" — BOQ → PO → Shop → Invoice → Receipt
Shop Module: วัสดุก่อสร้าง marketplace + Lazada affiliate (commission 2-4%)
Pipeline: ProjectSetup → Mapping → Procurement → Finance → Output (5 steps)
LINE Bot: webhook + LIFF + account linking + PDF delivery
AI: Anthropic Claude for smart reply + document drafting
สถานะ: ~70% production-ready
ปัญหาค้าง: Lazada token hardcoded, SendGrid ยังไม่ config, dev bypass active, TODO ใน functions 6+ จุด, Shop checkout ยัง stub`,
    ideaPrompt: `จากข้อมูลโครงการจริงที่ scan มา เสนอ 1 ไอเดียที่เจาะจง actionable ทำได้จริงภายใน 1 วัน ระบุไฟล์/function ที่ต้องแก้`,
    briefingPrompt: `จากข้อมูลที่ scan มา สรุปสถานะจริง 2-3 บรรทัด: อะไรพร้อม อะไรพัง อะไรต้องทำวันนี้`,
  },

  game: {
    icon: '🎮',
    name: 'Imperial Rise Expert',
    nameTh: 'ผู้เชี่ยวชาญเกม',
    description: 'รู้ทุกอย่างเกี่ยวกับ Imperial Rise — Roblox game, Lua, Knit, economy system, progression',
    projectPath: resolveSpecialistProjectPath('game', [
      '/root/projects/imperial-rise',
      '/Users/l168/Documents/Ancient Chinese Economy Simulator สำเนา',
    ]),
    scanFiles: [
      'IDENTITY.md',
      'GAME_FLOW.md',                 // complete game systems doc (560 lines)
      'PRODUCTION_CHECKLIST.md',       // bug tracking + launch readiness
      'STRUCTURE.md',                  // technical architecture
      'default.project.json',
      'src/shared/Data/RecipeDB.lua',
      'src/shared/Data/ItemDB.lua',
      'src/shared/Data/BuildingDB.lua',
      'src/shared/Data/CurrencyConfig.lua',
      'src/shared/Data/LevelConfig.lua',
      'src/shared/Data/RankDB.lua',
      'src/shared/Data/QuestDB.lua',
      'src/shared/Data/GachaDB.lua',
      'src/shared/Data/BalanceConfig.lua',
      'src/shared/Data/WorkerDB.lua',
      'src/shared/Config',            // scan directory
      'src/server/Services',          // scan directory
      'src/shared/Modules',           // scan directory
    ],
    scanPatterns: ['**/*.lua', '**/*.luau'],
    scanDepth: 4,
    basePrompt: `คุณคือ game designer + Lua developer ของ Imperial Rise (Roblox game — Ancient Chinese Economy Simulator)
Tech: Lua, Knit framework, Rojo 7.4.4 | 64 Services, 55 Controllers, 40+ Data files
Game Loop: MARKET→CRAFT→SHOP→PROFIT→STAFF/BUILD→WORLD/EMPIRE/QUEST/GACHA
3 สกุลเงิน: Coin (เหรียญทองแดง), Silver (เงินตำลึง), Jade (หยก) + Event Token
Progression: 农民(Lv1)→佃农(Lv10)→小贩(Lv20)→...→Emperor(Lv120+)
RecipeDB เป็น flat table — RecipeDB[id] ไม่ใช่ RecipeDB.Recipes[id] | 100+ recipes
Security: ทุก purchase ต้องผ่าน RateLimiter + DataValidator + HasActiveSession
สถานะ: ~85% production-ready
ปัญหาค้าง: 57 missing asset IDs, RankService exam stub, Bank Vault TODO, Gamepass content commented out, Tutorial gaps mid/late game, silent pcall errors 90+ files`,
    ideaPrompt: `จากข้อมูล source code จริง เสนอ 1 ไอเดีย feature/fix ที่เจาะจง — ระบุไฟล์และระบบที่เกี่ยวข้อง actionable ทำได้จริง`,
    briefingPrompt: `จากข้อมูล source code จริง สรุป 2-3 บรรทัด: ระบบไหนยังไม่สมบูรณ์ bug ไหนค้าง feature ไหนต้องทำต่อ`,
  },

  vanavard: {
    icon: '🏠',
    name: 'Vanavard Manager',
    nameTh: 'ผู้จัดการ Vanavard',
    description: 'จัดการทุกอย่างของ Vanavard Interior — เว็บไซต์, social media, content, client follow-up, portfolio',
    projectPath: resolveSpecialistProjectPath('vanavard', [
      '/root/projects/vanavard-website',
      '/root/projects/vanavard-website/next.js frontend/vanavard-web',
      '/Users/l168/Documents/VANAVARD website/next.js frontend/vanavard-web',
    ]),
    scanFiles: [
      'package.json',
      'app/site-config.ts',
      'app/layout.tsx',
      'app/page.tsx',
      'app/home-page.tsx',
      'app/work-data.ts',
      'app/work',                     // scan directory
      'app/portfolio',                // scan directory
      'app/globals.css',
      'app/project-media-map.json',
      'public',                       // scan directory
    ],
    scanPatterns: ['**/*.tsx', '**/*.ts'],
    scanDepth: 3,
    basePrompt: `คุณคือ web developer + social media manager ของ Vanavard Interior (บริษัทออกแบบตกแต่งภายใน ไทย)
Tech: Next.js 16 + React 19 + Tailwind CSS 4 | Deploy: Vercel (vanavard-web.vercel.app)
ติดต่อ: คุณซ่ง 093-329-9990, LINE @vanavard, email vanavard.interior@gmail.com
Social: Facebook, Instagram (@vanavard_interior), TikTok (@vanavard)
Discord Server: 1488474195414483104
บริการ: รับออกแบบภายใน ก่อสร้าง รีโนเวท งานบิ้วอิน — บ้านหรูและธุรกิจ
เป้าหมาย: เพิ่ม followers, สร้าง brand awareness, หาลูกค้า, อัพเดทเว็บ portfolio`,
    ideaPrompt: `จากข้อมูลเว็บและ portfolio จริง เสนอ 1 ไอเดีย content/campaign/เว็บปรับปรุง ที่ทำได้วันนี้ — ระบุ platform, format, caption สั้นๆ`,
    briefingPrompt: `จากข้อมูลเว็บจริง สรุป 2-3 บรรทัด: สถานะเว็บ, content ที่ควรโพสต์วันนี้, อะไรต้องอัพเดท`,
  },

  pet: {
    icon: '🐾',
    name: 'Pet Manager',
    nameTh: 'ผู้จัดการ Wendy & Fur and Found',
    description: 'จัดการ content Wendy (Bichon Frisé) + ร้าน Fur and Found (Korean pet shop)',
    projectPath: resolveSpecialistProjectPath('pet', [
      '/root/projects/pet-wendy',
      '/Users/l168/Documents/pet infu/wendy',
    ]),
    scanFiles: [
      'IDENTITY.md',
      'SOUL.md',
      'AGENTS.md',
      'HEARTBEAT.md',
      'USER.md',
      'TOOLS.md',
    ],
    scanPatterns: ['**/*.md', '**/*.json', '**/*.txt'],
    scanDepth: 2,
    basePrompt: `คุณดูแล 2 แบรนด์:
1. Wendy — pet influencer บิชอง (Bichon Frisé) สีขาว ขนฟูเหมือนก้อนเมฆ มีเพจ FB+IG
   ❌ ไม่ใช่พุดเดิ้ล! ต้องเรียกว่าบิชอง
2. Fur and Found (퍼 앤 파운드) — premium Korean pet shop สินค้านำเข้า
   CI: Minimal line art — บิชอง + ชิสุ, arch frame, sparkle
   Korean Suppliers: Babiana, SICGGU, Hubsch, SSSS, Meaningless, Peach Private`,
    ideaPrompt: `เสนอ 1 ไอเดีย content หรือ promotion ที่ทำได้วันนี้ — ระบุว่าสำหรับ Wendy หรือ Fur and Found`,
    briefingPrompt: `สรุปสิ่งที่ควรทำวันนี้สำหรับ Wendy page หรือ Fur and Found — 1-2 บรรทัด`,
  },
};

// ─── Deep Project Scanner ────────────────────────
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.next', '.cache', '.firebase', 'Packages']);
const MAX_FILE_READ = 1500;   // chars per file
const MAX_DIR_FILE_READ = 500; // chars for files read from directory scan
const MAX_SCAN_FILES = 50;    // max files to include in scan
const MAX_SCAN_SIZE = 20000;  // total chars for scan data

/** List files in a directory recursively, respecting depth and skip dirs */
function listFiles(dirPath, depth = 3, current = 0) {
  if (current >= depth || !existsSync(dirPath)) return [];
  const entries = [];
  try {
    for (const entry of readdirSync(dirPath, { withFileTypes: true })) {
      if (SKIP_DIRS.has(entry.name) || entry.name.startsWith('.')) continue;
      const full = resolve(dirPath, entry.name);
      if (entry.isDirectory()) {
        entries.push({ path: full, name: entry.name, type: 'dir' });
        entries.push(...listFiles(full, depth, current + 1));
      } else {
        entries.push({ path: full, name: entry.name, type: 'file' });
      }
    }
  } catch { /* permission denied etc */ }
  return entries;
}

/** Read a file safely, truncated */
function safeRead(filePath, maxChars = MAX_FILE_READ) {
  try {
    if (!existsSync(filePath)) return null;
    const stat = statSync(filePath);
    if (stat.size > 500_000) return `[file too large: ${(stat.size / 1024).toFixed(0)}KB]`;
    const content = readFileSync(filePath, 'utf-8');
    return content.slice(0, maxChars);
  } catch { return null; }
}

/** Extract TODOs, FIXMEs, bugs from source code */
function extractTodos(content) {
  const matches = [];
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/\b(TODO|FIXME|BUG|HACK|XXX|WARN)\b/i.test(line)) {
      matches.push({ line: i + 1, text: line.trim().slice(0, 120) });
    }
  }
  return matches;
}

/**
 * Deep scan a project — reads real files, lists structure, extracts TODOs.
 * Returns structured data that can be injected into Gemma prompts.
 */
export function scanProject(specialistId) {
  const spec = SPECIALISTS[specialistId];
  if (!spec || !spec.projectPath) return null;

  const scan = {
    structure: [],     // directory tree
    files: {},         // key file contents (truncated)
    todos: [],         // TODO/FIXME found in code
    stats: { totalFiles: 0, totalDirs: 0 },
  };

  let totalChars = 0;

  // Step 1: List project structure
  const allEntries = listFiles(spec.projectPath, spec.scanDepth || 3);
  for (const e of allEntries) {
    const rel = relative(spec.projectPath, e.path);
    if (e.type === 'dir') {
      scan.structure.push(`📁 ${rel}/`);
      scan.stats.totalDirs++;
    } else {
      scan.structure.push(`  ${rel}`);
      scan.stats.totalFiles++;
    }
  }

  // Step 2: Read specified scanFiles
  let fileCount = 0;
  for (const relPath of spec.scanFiles) {
    if (fileCount >= MAX_SCAN_FILES || totalChars >= MAX_SCAN_SIZE) break;
    const fullPath = resolve(spec.projectPath, relPath);

    try {
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        // Scan directory — list files + read first few
        const dirEntries = listFiles(fullPath, 1);
        const subFiles = dirEntries.filter(e => e.type === 'file').slice(0, 6);
        for (const f of subFiles) {
          if (fileCount >= MAX_SCAN_FILES || totalChars >= MAX_SCAN_SIZE) break;
          const rel = relative(spec.projectPath, f.path);
          const content = safeRead(f.path, MAX_DIR_FILE_READ);
          if (content) {
            scan.files[rel] = content;
            totalChars += content.length;
            fileCount++;
            const todos = extractTodos(content);
            for (const t of todos) scan.todos.push({ file: rel, ...t });
          }
        }
      } else {
        // Read single file
        const content = safeRead(fullPath, MAX_FILE_READ);
        if (content) {
          scan.files[relPath] = content;
          totalChars += content.length;
          fileCount++;
          const todos = extractTodos(content);
          for (const t of todos) scan.todos.push({ file: relPath, ...t });
        }
      }
    } catch { /* skip */ }
  }

  // Store scan in DB
  const scanJson = JSON.stringify(scan);
  db.prepare(`INSERT INTO secretary_scans (specialist, scan_data) VALUES (?, ?)`)
    .run(specialistId, scanJson);

  return scan;
}

/** Get latest scan for a specialist */
export function getLatestScan(specialistId) {
  const row = db.prepare(`SELECT scan_data, scanned_at FROM secretary_scans WHERE specialist = ? ORDER BY id DESC LIMIT 1`)
    .get(specialistId);
  if (!row) return null;
  try { return { data: JSON.parse(row.scan_data), scannedAt: row.scanned_at }; }
  catch { return null; }
}

/**
 * Build a context-rich prompt for a specialist by combining:
 * 1. basePrompt (static identity/knowledge)
 * 2. Real scan data (file structure, contents, TODOs)
 * 3. The specific question (briefing/idea/task)
 */
export function buildSpecialistPrompt(specialistId, question) {
  const spec = SPECIALISTS[specialistId];
  if (!spec) return question;

  let prompt = spec.basePrompt + '\n\n';

  // Inject real scan data if available
  const scan = getLatestScan(specialistId);
  if (scan?.data) {
    const d = scan.data;

    // Project structure
    if (d.structure?.length > 0) {
      prompt += `## โครงสร้างโปรเจค (scan: ${scan.scannedAt})\n`;
      prompt += d.structure.slice(0, 50).join('\n') + '\n\n';
    }

    // Key file contents
    if (d.files && Object.keys(d.files).length > 0) {
      prompt += `## ไฟล์สำคัญ\n`;
      for (const [path, content] of Object.entries(d.files)) {
        prompt += `### ${path}\n\`\`\`\n${content.slice(0, 600)}\n\`\`\`\n`;
      }
      prompt += '\n';
    }

    // TODOs / bugs
    if (d.todos?.length > 0) {
      prompt += `## TODO/FIXME ที่พบ\n`;
      for (const t of d.todos.slice(0, 10)) {
        prompt += `- ${t.file}:${t.line} — ${t.text}\n`;
      }
      prompt += '\n';
    }

    // Stats
    if (d.stats) {
      prompt += `[${d.stats.totalFiles} files, ${d.stats.totalDirs} dirs]\n\n`;
    }
  }

  prompt += question;
  return prompt;
}

// ─── Task Management ────────────────────────────
export function assignTask(specialistId, task, priority = 'medium') {
  const normalizedTask = normalizeSecretaryTask(task);
  const existing = db.prepare(`
    SELECT * FROM secretary_tasks
    WHERE specialist = ? AND task = ? AND status IN ('pending','in_progress')
    ORDER BY id DESC
    LIMIT 1
  `).get(specialistId, normalizedTask);

  if (existing) {
    return { id: existing.id, specialist: specialistId, task: existing.task, duplicate: true };
  }

  const result = db.prepare(`INSERT INTO secretary_tasks (specialist, task, priority) VALUES (?, ?, ?)`)
    .run(specialistId, normalizedTask, priority);
  return { id: result.lastInsertRowid, specialist: specialistId, task: normalizedTask };
}

export function getTasksBySpecialist(specialistId, status = null) {
  if (status) {
    return db.prepare(`SELECT * FROM secretary_tasks WHERE specialist = ? AND status = ? ORDER BY priority DESC, assigned_at DESC`)
      .all(specialistId, status);
  }
  return db.prepare(`SELECT * FROM secretary_tasks WHERE specialist = ? AND status != 'done' AND status != 'cancelled' ORDER BY priority DESC, assigned_at DESC`)
    .all(specialistId);
}

export function getAllPendingTasks() {
  return db.prepare(`SELECT * FROM secretary_tasks WHERE status IN ('pending','in_progress') ORDER BY priority DESC, assigned_at DESC`)
    .all();
}

export function completeTask(taskId, result = null) {
  return db.prepare(`UPDATE secretary_tasks SET status = 'done', result = ?, completed_at = datetime('now') WHERE id = ?`)
    .run(result, taskId);
}

export function updateTaskStatus(taskId, status) {
  return db.prepare(`UPDATE secretary_tasks SET status = ? WHERE id = ?`)
    .run(status, taskId);
}

// ─── Idea Management ────────────────────────────
export function proposeIdea(specialistId, idea, detail = null, messageId = null) {
  const result = db.prepare(`INSERT INTO secretary_ideas (specialist, idea, detail, message_id) VALUES (?, ?, ?, ?)`)
    .run(specialistId, idea, detail, messageId);
  return { id: result.lastInsertRowid };
}

export function approveIdea(ideaId) {
  return db.prepare(`UPDATE secretary_ideas SET status = 'approved', decided_at = datetime('now') WHERE id = ?`)
    .run(ideaId);
}

export function rejectIdea(ideaId) {
  return db.prepare(`UPDATE secretary_ideas SET status = 'rejected', decided_at = datetime('now') WHERE id = ?`)
    .run(ideaId);
}

export function getPendingIdeas() {
  return db.prepare(`SELECT * FROM secretary_ideas WHERE status = 'pending' ORDER BY proposed_at DESC`)
    .all();
}

export function getIdeaByMessageId(messageId) {
  return db.prepare(`SELECT * FROM secretary_ideas WHERE message_id = ?`)
    .get(messageId);
}

export function getTodayIdeas() {
  return db.prepare(`SELECT * FROM secretary_ideas WHERE date(proposed_at) = date('now') ORDER BY proposed_at DESC`)
    .all();
}

// ─── Morning Briefing Generator ─────────────────
export function generateBriefingData() {
  const now = new Date();
  const bkkDate = now.toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Bangkok' });

  // Pending tasks per specialist
  const pendingTasks = getAllPendingTasks();
  const tasksBySpec = {};
  for (const t of pendingTasks) {
    if (!tasksBySpec[t.specialist]) tasksBySpec[t.specialist] = [];
    tasksBySpec[t.specialist].push(t);
  }

  // Today's ideas (already proposed)
  const todayIdeas = getTodayIdeas();

  // Get todos from memory DB (shared)
  let todos = [];
  try {
    todos = db.prepare(`SELECT * FROM todos WHERE status = 'pending' ORDER BY priority DESC, created_at DESC LIMIT 10`).all();
  } catch { /* table might not exist in this connection */ }

  // Get reminders due today
  let reminders = [];
  try {
    reminders = db.prepare(`SELECT * FROM reminders WHERE status = 'pending' AND remind_at <= datetime('now', '+24 hours') ORDER BY remind_at ASC LIMIT 5`).all();
  } catch { /* table might not exist */ }

  return {
    date: bkkDate,
    pendingTasks,
    tasksBySpec,
    todayIdeas,
    todos,
    reminders,
    specialists: SPECIALISTS,
  };
}

// Format briefing into Discord message
export function formatMorningBriefing(briefingData, specialistInsights = {}) {
  const { date, pendingTasks, tasksBySpec, todos, reminders } = briefingData;

  let msg = `☀️ **สวัสดีตอนเช้าค่ะบอส**\n📅 ${date}\n\n`;

  // Tasks summary
  if (pendingTasks.length > 0) {
    msg += `⚠️ **งานค้าง (${pendingTasks.length}):**\n`;
    for (const t of pendingTasks.slice(0, 5)) {
      const icon = SPECIALISTS[t.specialist]?.icon || '📌';
      const pri = { high: '🔴', medium: '🟡', low: '🟢' }[t.priority] || '⚪';
      msg += `${icon} ${pri} ${t.task.slice(0, 60)}\n`;
    }
    msg += '\n';
  }

  // Todos
  if (todos.length > 0) {
    msg += `📋 **Todo (${todos.length}):**\n`;
    for (const t of todos.slice(0, 3)) {
      msg += `• ${t.task.slice(0, 50)}\n`;
    }
    msg += '\n';
  }

  // Reminders
  if (reminders.length > 0) {
    msg += `⏰ **เตือน:**\n`;
    for (const r of reminders.slice(0, 3)) {
      msg += `• ${r.message.slice(0, 50)}\n`;
    }
    msg += '\n';
  }

  // Specialist insights (from Gemma agents)
  if (Object.keys(specialistInsights).length > 0) {
    for (const [specId, insight] of Object.entries(specialistInsights)) {
      const spec = SPECIALISTS[specId];
      if (spec && insight) {
        msg += `${spec.icon} **${spec.name}:** ${insight.slice(0, 200)}\n`;
      }
    }
    msg += '\n';
  }

  // Health reminder
  msg += `💪 **สุขภาพ:** ดื่มน้ำ 8 แก้ว | พักสายตาทุก 2 ชม. | ยืดเส้น 5 นาที\n`;

  return msg.slice(0, 1900);
}

// ─── Daily Ideas Format ─────────────────────────
export function formatDailyIdeas(ideas) {
  let msg = `💡 **ไอเดียวันนี้จากทีมเลขา**\nกด ✅ เพื่อ approve | ❌ เพื่อ reject\n\n`;

  for (const idea of ideas) {
    const spec = SPECIALISTS[idea.specialist];
    msg += `${spec?.icon || '💡'} **${spec?.name || idea.specialist}**\n`;
    msg += `${idea.idea.slice(0, 300)}\n`;
    if (idea.detail) msg += `_${idea.detail.slice(0, 150)}_\n`;
    msg += `\`idea:${idea.id}\`\n\n`;
  }

  return msg.slice(0, 1900);
}

// ─── Auto-assign based on keyword ───────────────
export function detectSpecialist(text) {
  const lower = text.toLowerCase();
  if (/ezboq|ใบเสนอราคา|firebase|deploy|frontend|backend|line bot|webhook|api/.test(lower)) return 'ezboq';
  if (/game|เกม|roblox|imperial|craft|shop|coin|jade|silver|lua/.test(lower)) return 'game';
  if (/vanavard|interior|ออกแบบ|ตกแต่ง|รีโนเวท|เพจ va|fb va|ig va/.test(lower)) return 'vanavard';
  if (/wendy|pet|สัตว์เลี้ยง|บิชอง|fur and found|เกาหลี|korean/.test(lower)) return 'pet';
  return null;
}

// ─── Stats ──────────────────────────────────────
export function getSecretaryStats() {
  const taskStats = db.prepare(`
    SELECT specialist, status, COUNT(*) as count
    FROM secretary_tasks GROUP BY specialist, status
  `).all();

  const ideaStats = db.prepare(`
    SELECT specialist, status, COUNT(*) as count
    FROM secretary_ideas GROUP BY specialist, status
  `).all();

  const pendingCount = db.prepare(`SELECT COUNT(*) as count FROM secretary_tasks WHERE status IN ('pending','in_progress')`).get();
  const approvedIdeas = db.prepare(`SELECT COUNT(*) as count FROM secretary_ideas WHERE status = 'approved'`).get();

  return {
    pendingTasks: pendingCount.count,
    approvedIdeas: approvedIdeas.count,
    tasksBySpecialist: taskStats,
    ideasBySpecialist: ideaStats,
  };
}
