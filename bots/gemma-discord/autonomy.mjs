/**
 * 💎 Gemma Autonomy Engine — "BabyGemma"
 * Self-tasking, self-improving autonomous loop
 *
 * Boss sets goal → CEO decomposes → Agents execute → Critic evaluates → Learn → Loop
 * ม้าน้ำ reviews hourly reports via Discord reactions
 *
 * Uses: agents.mjs (runAgent), memory.mjs (getDb), rag.mjs (knowledge), training.mjs (pairs)
 */

import { getDb } from './memory.mjs';
import { addKnowledgeEntry, searchKnowledgeBase } from './rag.mjs';
import { addTrainingData } from './training.mjs';
import { webSearch, webFetch } from './research.mjs';
import { generateText } from './llm.mjs';

const db = getDb();

// ─── Schema ─────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS autonomous_goals (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    title             TEXT NOT NULL,
    description       TEXT,
    goal_type         TEXT NOT NULL DEFAULT 'project'
                      CHECK(goal_type IN ('project','research','improvement','content','maintenance')),
    priority          TEXT DEFAULT 'medium' CHECK(priority IN ('critical','high','medium','low')),
    status            TEXT DEFAULT 'active'
                      CHECK(status IN ('active','paused','completed','cancelled','awaiting_approval')),
    created_by        TEXT NOT NULL DEFAULT 'boss',
    specialist        TEXT,
    max_iterations    INTEGER DEFAULT 50,
    iterations_used   INTEGER DEFAULT 0,
    report_channel_id TEXT,
    final_summary     TEXT,
    created_at        TEXT DEFAULT (datetime('now')),
    completed_at      TEXT
  );

  CREATE TABLE IF NOT EXISTS autonomous_tasks (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    goal_id         INTEGER NOT NULL,
    parent_task_id  INTEGER,
    title           TEXT NOT NULL,
    description     TEXT,
    agent_role      TEXT NOT NULL DEFAULT 'researcher',
    status          TEXT DEFAULT 'pending'
                    CHECK(status IN ('pending','running','done','failed','skipped','blocked')),
    priority        INTEGER DEFAULT 5 CHECK(priority BETWEEN 1 AND 10),
    depends_on      TEXT,
    input_context   TEXT,
    output_result   TEXT,
    quality_score   REAL,
    retry_count     INTEGER DEFAULT 0,
    max_retries     INTEGER DEFAULT 2,
    duration_ms     INTEGER,
    created_at      TEXT DEFAULT (datetime('now')),
    completed_at    TEXT,
    FOREIGN KEY (goal_id) REFERENCES autonomous_goals(id)
  );
  CREATE INDEX IF NOT EXISTS idx_at_goal ON autonomous_tasks(goal_id, status);

  CREATE TABLE IF NOT EXISTS execution_log (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    goal_id         INTEGER,
    task_id         INTEGER,
    action_type     TEXT NOT NULL,
    agent_role      TEXT,
    input_summary   TEXT,
    output_summary  TEXT,
    duration_ms     INTEGER,
    success         INTEGER DEFAULT 1,
    error_message   TEXT,
    created_at      TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS improvement_log (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    goal_id           INTEGER,
    improvement_type  TEXT NOT NULL,
    category          TEXT,
    description       TEXT NOT NULL,
    created_at        TEXT DEFAULT (datetime('now'))
  );
`);

// ─── Prepared Statements ────────────────────────
const stmt = {
  createGoal: db.prepare(`INSERT INTO autonomous_goals (title, description, goal_type, priority, created_by, specialist, max_iterations, report_channel_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`),
  getGoal: db.prepare(`SELECT * FROM autonomous_goals WHERE id = ?`),
  getActiveGoals: db.prepare(`SELECT * FROM autonomous_goals WHERE status = 'active' ORDER BY CASE priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END`),
  getLatestPausedGoal: db.prepare(`SELECT * FROM autonomous_goals WHERE status = 'paused' ORDER BY id DESC LIMIT 1`),
  updateGoalStatus: db.prepare(`UPDATE autonomous_goals SET status = ? WHERE id = ?`),
  updateGoalIteration: db.prepare(`UPDATE autonomous_goals SET iterations_used = ? WHERE id = ?`),
  completeGoal: db.prepare(`UPDATE autonomous_goals SET status = 'completed', final_summary = ?, completed_at = datetime('now') WHERE id = ?`),

  createTask: db.prepare(`INSERT INTO autonomous_tasks (goal_id, title, description, agent_role, priority, depends_on, input_context) VALUES (?, ?, ?, ?, ?, ?, ?)`),
  getTask: db.prepare(`SELECT * FROM autonomous_tasks WHERE id = ?`),
  getTasksByGoal: db.prepare(`SELECT * FROM autonomous_tasks WHERE goal_id = ? ORDER BY priority DESC, id ASC`),
  getPendingTasks: db.prepare(`SELECT * FROM autonomous_tasks WHERE goal_id = ? AND status = 'pending' ORDER BY priority DESC, id ASC`),
  getDoneTasks: db.prepare(`SELECT * FROM autonomous_tasks WHERE goal_id = ? AND status = 'done' ORDER BY completed_at DESC`),
  getFailedTasks: db.prepare(`SELECT * FROM autonomous_tasks WHERE goal_id = ? AND status = 'failed'`),
  updateTaskStatus: db.prepare(`UPDATE autonomous_tasks SET status = ? WHERE id = ?`),
  updateTaskResult: db.prepare(`UPDATE autonomous_tasks SET status = 'done', output_result = ?, quality_score = ?, duration_ms = ?, completed_at = datetime('now') WHERE id = ?`),
  updateTaskFailed: db.prepare(`UPDATE autonomous_tasks SET status = 'failed', output_result = ?, retry_count = retry_count + 1 WHERE id = ?`),
  resetTask: db.prepare(`UPDATE autonomous_tasks SET status = 'pending' WHERE id = ?`),

  logExec: db.prepare(`INSERT INTO execution_log (goal_id, task_id, action_type, agent_role, input_summary, output_summary, duration_ms, success, error_message) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`),
  logImprove: db.prepare(`INSERT INTO improvement_log (goal_id, improvement_type, category, description) VALUES (?, ?, ?, ?)`),
  getRecentLogs: db.prepare(`SELECT * FROM execution_log WHERE goal_id = ? ORDER BY created_at DESC LIMIT ?`),
  getImprovements: db.prepare(`SELECT * FROM improvement_log WHERE goal_id = ? ORDER BY created_at DESC LIMIT ?`),
};

// ─── Limits ─────────────────────────────────────
const LIMITS = {
  maxTaskDurationMs: 480_000,
  delayBetweenTasksMs: 3_000,
  yieldToChatMs: 5_000,
  staleChatBusyMs: 180_000,
  maxConsecutiveErrors: 5,
  maxActiveGoals: 1,
};

// ─── Loop State ─────────────────────────────────
const loopState = {
  running: false,
  goalId: null,
  consecutiveErrors: 0,
  lastTickAt: null,
  tasksDoneThisSession: 0,
};

// ─── Goal Management ────────────────────────────

export function createGoal(title, description = '', options = {}) {
  const {
    goalType = 'project',
    priority = 'medium',
    createdBy = 'boss',
    specialist = null,
    maxIterations = 50,
    reportChannelId = null,
  } = options;

  const result = stmt.createGoal.run(title, description, goalType, priority, createdBy, specialist, maxIterations, reportChannelId);
  console.log(`[AUTONOMY] 🎯 Goal #${result.lastInsertRowid} created: "${title}"`);
  return result.lastInsertRowid;
}

export function getGoal(goalId) {
  return stmt.getGoal.get(goalId);
}

export function getActiveGoals() {
  return stmt.getActiveGoals.all();
}

export function getLatestPausedGoal() {
  return stmt.getLatestPausedGoal.get();
}

export function pauseGoal(goalId) {
  stmt.updateGoalStatus.run('paused', goalId);
  loopState.running = false;
  console.log(`[AUTONOMY] ⏸️ Goal #${goalId} paused`);
}

export function resumeGoal(goalId) {
  stmt.updateGoalStatus.run('active', goalId);
  console.log(`[AUTONOMY] ▶️ Goal #${goalId} resumed`);
}

export function cancelGoal(goalId) {
  stmt.updateGoalStatus.run('cancelled', goalId);
  loopState.running = false;
  console.log(`[AUTONOMY] ❌ Goal #${goalId} cancelled`);
}

export function clearOutstandingWork() {
  const goals = db.prepare(`
    SELECT DISTINCT g.id, g.title, g.status
    FROM autonomous_goals g
    LEFT JOIN autonomous_tasks t ON t.goal_id = g.id
    WHERE g.status IN ('active', 'paused')
       OR t.status IN ('pending', 'running', 'failed', 'blocked')
    ORDER BY g.id DESC
  `).all();

  const activeOrPaused = new Set(['active', 'paused']);
  const tx = db.transaction((goalRows) => {
    const goalSummaries = [];
    let tasksCleared = 0;

    for (const goal of goalRows) {
      const taskInfo = db.prepare(`
        UPDATE autonomous_tasks
        SET status = 'skipped',
            output_result = COALESCE(output_result, '[cleared by admin]'),
            completed_at = COALESCE(completed_at, datetime('now'))
        WHERE goal_id = ?
          AND status IN ('pending', 'running', 'failed', 'blocked')
      `).run(goal.id);

      if (activeOrPaused.has(goal.status)) {
        db.prepare(`
          UPDATE autonomous_goals
          SET status = 'cancelled'
          WHERE id = ?
        `).run(goal.id);
      }

      tasksCleared += taskInfo.changes;
      goalSummaries.push({
        goalId: goal.id,
        title: goal.title,
        previousStatus: goal.status,
        tasksCleared: taskInfo.changes,
      });
    }

    return {
      goalsCleared: goalRows.filter((goal) => activeOrPaused.has(goal.status)).length,
      tasksCleared,
      goalSummaries: goalSummaries.filter((goal) => goal.tasksCleared > 0 || activeOrPaused.has(goal.previousStatus)),
    };
  });

  loopState.running = false;
  loopState.goalId = null;
  loopState.consecutiveErrors = 0;

  const summary = tx(goals);
  if (summary.tasksCleared > 0 || summary.goalsCleared > 0) {
    console.log(`[AUTONOMY] 🧹 Cleared ${summary.goalsCleared} goals / ${summary.tasksCleared} tasks`);
  }
  return summary;
}

// ─── Agent Call (Gemini API) ────────────────────

const ROLES = {
  ceo:        'คุณคือ CEO วิเคราะห์เป้าหมาย แตกงานเป็นขั้นตอน ระบุ agent role ที่เหมาะสม',
  researcher: 'คุณคือนักวิจัย ค้นหาข้อมูล ตรวจสอบข้อเท็จจริง สรุปให้กระชับ',
  analyst:    'คุณคือนักวิเคราะห์ วิเคราะห์ข้อดี-ข้อเสีย ความเสี่ยง ให้ข้อสรุปชัดเจน',
  planner:    'คุณคือนักวางแผน จัดลำดับความสำคัญ กำหนด dependency ประมาณเวลา',
  reviewer:   'คุณคือ QA ตรวจสอบคุณภาพ ให้คะแนน 0-10 พร้อมเหตุผล',
  critic:     'คุณคือนักวิจารณ์ หาจุดอ่อน ตั้งคำถามท้าทาย ให้ feedback ตรงไปตรงมา',
  writer:     'คุณคือนักเขียน สรุปรายงาน เขียนเนื้อหา กระชับ ตรงประเด็น',
  summarizer: 'คุณคือนักสรุป รวบรวมข้อมูลจากหลายแหล่ง สรุปเป็น bullet points',
  designer:   'คุณคือนักออกแบบ คิด concept ออกแบบ UX/UI แนะนำ style',
  estimator:  'คุณคือนักประเมิน คำนวณต้นทุน ราคา งบประมาณ ให้แม่นยำ',
  marketer:   'คุณคือนักการตลาด คิด strategy targeting content แนะนำ channel',
};

async function callAgent(role, task, { temperature = 0.7, maxTokens = 2048 } = {}) {
  const rolePrompt = ROLES[role] || ROLES.researcher;
  return generateText(
    `${rolePrompt}\nตอบภาษาไทยกระชับ ตรงประเด็น ให้ข้อมูลจริง ราคาจริง ปี 2026 ไม่เกิน 500 คำ`,
    task,
    {
      temperature,
      maxOutputTokens: maxTokens,
      timeoutMs: LIMITS.maxTaskDurationMs,
    }
  );
}

// ─── Goal Decomposition ─────────────────────────

export async function decomposeGoal(goalId) {
  const goal = stmt.getGoal.get(goalId);
  if (!goal) throw new Error(`Goal #${goalId} not found`);

  // Get existing knowledge for context
  const ragContext = goal.description
    ? searchKnowledgeBase(goal.description, null, 3).map(r => `- ${r.title}: ${r.content.slice(0, 150)}`).join('\n')
    : '';

  const prompt = `เป้าหมาย: ${goal.title}
${goal.description ? `รายละเอียด: ${goal.description}` : ''}
${ragContext ? `ข้อมูลที่มีอยู่:\n${ragContext}` : ''}

แตกเป้าหมายนี้เป็น tasks ย่อย 5-10 ข้อ ที่ทำได้จริง
แต่ละ task ระบุ:
1. title — ชื่องานสั้นๆ
2. description — อธิบายว่าต้องทำอะไร
3. agent_role — เลือกจาก: researcher, analyst, planner, designer, writer, estimator, marketer, reviewer, critic, summarizer
4. priority — 1-10 (10 = สำคัญสุด)
5. depends_on — array ของลำดับ task ที่ต้องทำก่อน (เช่น [1,2]) หรือ [] ถ้าไม่มี

ตอบเป็น JSON array เท่านั้น:
[{"title":"...","description":"...","agent_role":"...","priority":8,"depends_on":[]}]`;

  console.log(`[AUTONOMY] 🧠 CEO decomposing goal #${goalId}: "${goal.title}"`);
  const start = Date.now();

  const result = await callAgent('ceo', prompt, { temperature: 0.5, maxTokens: 2048 });

  // Parse JSON from response
  const tasks = parseJsonFromResponse(result);
  if (!tasks || tasks.length === 0) {
    stmt.logExec.run(goalId, null, 'decompose', 'ceo', goal.title, 'Failed to parse tasks', Date.now() - start, 0, 'JSON parse failed');
    throw new Error('CEO failed to decompose goal into tasks');
  }

  // Create tasks in DB
  const taskIds = [];
  for (let i = 0; i < tasks.length; i++) {
    const t = tasks[i];
    const depsResolved = (t.depends_on || []).map(d => taskIds[d - 1]).filter(Boolean);
    const id = stmt.createTask.run(
      goalId,
      t.title || `Task ${i + 1}`,
      t.description || '',
      t.agent_role || 'researcher',
      Math.min(10, Math.max(1, t.priority || 5)),
      depsResolved.length > 0 ? JSON.stringify(depsResolved) : null,
      null,
    ).lastInsertRowid;
    taskIds.push(id);
  }

  stmt.logExec.run(goalId, null, 'decompose', 'ceo', goal.title, `${taskIds.length} tasks created`, Date.now() - start, 1, null);
  console.log(`[AUTONOMY] ✅ Decomposed into ${taskIds.length} tasks`);
  return taskIds;
}

// ─── Web Research for Tasks ─────────────────────

const RESEARCH_ROLES = new Set(['researcher', 'analyst', 'estimator', 'planner']);

async function webResearchForTask(task, goal) {
  // Generate 2-3 search queries from task context
  const queries = buildSearchQueries(task, goal);
  const allResults = [];

  for (const q of queries.slice(0, 3)) {
    try {
      console.log(`[AUTONOMY] 🔍 Searching: "${q}"`);
      const res = await webSearch(q);
      if (res?.results?.length > 0) {
        for (const r of res.results.slice(0, 3)) {
          allResults.push(`[${r.title}] ${r.text || ''}`.slice(0, 300));
        }
      }
    } catch (err) {
      console.error(`[AUTONOMY] Search failed for "${q}": ${err.message}`);
    }
    // Small delay between searches
    await sleep(1000);
  }

  if (allResults.length === 0) return '';

  return `\n\n📊 ข้อมูลจากเว็บ (web search):\n${allResults.map((r, i) => `${i + 1}. ${r}`).join('\n')}\n\n⚠️ ใช้ข้อมูลจากเว็บด้านบนประกอบคำตอบ อ้างอิงตัวเลข/ราคาจากข้อมูลจริง ห้ามแต่งเอง`;
}

function buildSearchQueries(task, goal) {
  const queries = [];
  const title = task.title || '';
  const desc = task.description || '';
  const goalTitle = goal?.title || '';

  // Main query from task title
  queries.push(`${title} ไทย 2026`);

  // If about materials/prices, add specific queries
  if (/ราคา|วัสดุ|material|price/i.test(title + desc)) {
    queries.push(`ราคาวัสดุก่อสร้าง 2026 บุญถาวร โฮมโปร`);
    queries.push(`ราคาปูนซีเมนต์ เหล็กเส้น กระเบื้อง 2026`);
  }

  // If about law/tax
  if (/กฎหมาย|ภาษี|VAT|พ\.ร\.บ|law|tax/i.test(title + desc)) {
    queries.push(`กฎหมายก่อสร้าง พ.ร.บ.ควบคุมอาคาร 2566`);
    queries.push(`ภาษีผู้รับเหมา VAT หัก ณ ที่จ่าย`);
  }

  // If about workflow/process
  if (/ขั้นตอน|workflow|process|แผน/i.test(title + desc)) {
    queries.push(`ขั้นตอนงานรับเหมาก่อสร้าง ตั้งแต่ต้นจนจบ`);
  }

  // If about contract/document
  if (/สัญญา|เอกสาร|contract|document|งวดงาน/i.test(title + desc)) {
    queries.push(`ตัวอย่างสัญญาว่าจ้างก่อสร้าง งวดงาน`);
  }

  // If about cash flow/risk
  if (/เงินสด|cash flow|risk|ความเสี่ยง|กระแสเงิน/i.test(title + desc)) {
    queries.push(`cash flow management ผู้รับเหมาก่อสร้าง`);
    queries.push(`ความเสี่ยง ผู้รับเหมา risk management construction`);
  }

  // Fallback: use goal title as context
  if (queries.length < 2) {
    queries.push(`${goalTitle} ${title}`);
  }

  return [...new Set(queries)]; // dedupe
}

// ─── Task Execution ─────────────────────────────

export function getNextTask(goalId) {
  const pending = stmt.getPendingTasks.all(goalId);
  if (pending.length === 0) return null;

  // Find task with all dependencies met
  for (const task of pending) {
    if (!task.depends_on) return task;
    const deps = JSON.parse(task.depends_on);
    const allDone = deps.every(depId => {
      const dep = stmt.getTask.get(depId);
      return dep && dep.status === 'done';
    });
    if (allDone) return task;
  }

  // If all remaining tasks are blocked by deps, return first one anyway
  return pending[0];
}

export async function executeTask(taskId) {
  const task = stmt.getTask.get(taskId);
  if (!task) throw new Error(`Task #${taskId} not found`);

  const goal = stmt.getGoal.get(task.goal_id);
  stmt.updateTaskStatus.run('running', taskId);

  // Build context from previous results
  const doneTasks = stmt.getDoneTasks.all(task.goal_id).slice(0, 3);
  const prevContext = doneTasks.length > 0
    ? `ผลงานก่อนหน้า:\n${doneTasks.map(d => `- ${d.title}: ${(d.output_result || '').slice(0, 200)}`).join('\n')}`
    : '';

  // RAG context
  const ragResults = searchKnowledgeBase(task.title, null, 2);
  const ragContext = ragResults.length > 0
    ? `ความรู้ที่เกี่ยวข้อง:\n${ragResults.map(r => `- ${r.title}: ${r.content.slice(0, 150)}`).join('\n')}`
    : '';

  // RAG-first: pull related knowledge from our verified database
  // For construction/material tasks, inject ALL material data (17 categories, fits in context)
  const isMaterialTask = /วัสดุ|ราคา|BOQ|material|price|ก่อสร้าง|template|ปูน|เหล็ก|สี|กระเบื้อง|ไฟฟ้า|ประปา|แอร์/i.test(task.title + task.description);
  let ragDeep;
  if (isMaterialTask) {
    ragDeep = searchKnowledgeBase('ราคาวัสดุ', null, 15);
    const extra = searchKnowledgeBase(task.title, null, 3);
    const ids = new Set(ragDeep.map(r => r.id));
    for (const r of extra) { if (!ids.has(r.id)) ragDeep.push(r); }
  } else {
    ragDeep = searchKnowledgeBase(task.title + ' ' + (task.description || ''), null, 5);
  }
  // Cap total context to ~4000 chars to leave room for system prompt + output
  let ragDeepText = '';
  let charBudget = 4000;
  for (const r of ragDeep) {
    const entry = `${r.title}: ${r.content.slice(0, 300)}`;
    if (ragDeepText.length + entry.length > charBudget) break;
    ragDeepText += entry + '\n';
  }
  const ragDeepContext = ragDeepText
    ? `\n📚 ข้อมูลอ้างอิงที่มีอยู่:\n${ragDeepText}`
    : '';

  // Web research as supplement (may return empty for Thai queries)
  let webContext = '';
  if (RESEARCH_ROLES.has(task.agent_role) && ragDeep.length < 2) {
    try {
      webContext = await webResearchForTask(task, goal);
      console.log(`[AUTONOMY] 📊 Web research: ${webContext ? 'got results' : 'no results'}`);
    } catch (err) {
      console.error(`[AUTONOMY] Web research failed: ${err.message}`);
    }
  }

  const prompt = `เป้าหมายหลัก: ${goal.title}
${prevContext}
${ragContext}
${ragDeepContext}
${webContext}

งานของคุณ: ${task.title}
${task.description || ''}

⚠️ คำสั่ง:
- ใช้ความรู้ราคาตลาดจริงในไทยปี 2025-2026 (บุญถาวร, HomePro, ไทวัสดุ, SCG, CPAC)
- ถ้ามีข้อมูลอ้างอิงด้านบนให้ใช้ประกอบ แต่ห้ามอ้างว่า "ดึงจากฐานข้อมูล EzBOQ"
- ให้ราคาเป็นช่วง (range) ที่สมเหตุสมผล ห้ามแต่งตัวเลขมั่วๆ
- ถ้าไม่แน่ใจราคาให้ระบุว่า "ราคาโดยประมาณ" พร้อมแหล่งอ้างอิง
- ห้ามตอบว่า "ไม่มีข้อมูล" หรือ "ไม่สามารถดึงได้" — ต้องให้ข้อมูลที่ดีที่สุดเท่าที่มี
ตอบผลลัพธ์ที่ actionable มีตัวเลข/ราคา/ขั้นตอนชัดเจน`;

  console.log(`[AUTONOMY] ⚙️ Executing task #${taskId} (${task.agent_role}): "${task.title}"`);
  const start = Date.now();

  try {
    const result = await callAgent(task.agent_role, prompt);
    const durationMs = Date.now() - start;

    // Evaluate quality
    const quality = await evaluateResult(task, result);

    // Save result
    stmt.updateTaskResult.run(result, quality, durationMs, taskId);
    stmt.logExec.run(task.goal_id, taskId, 'execute', task.agent_role, task.title, result.slice(0, 200), durationMs, 1, null);

    // Learn from results (harvest all usable knowledge)
    if (quality >= 4) {
      harvestLearning(task, result, quality);
    }

    loopState.consecutiveErrors = 0;
    loopState.tasksDoneThisSession++;
    // Log preview (first 300 chars) so boss can see what was learned
    const preview = result.replace(/\n/g, ' ').slice(0, 300);
    console.log(`[AUTONOMY] ✅ Task #${taskId} done (quality: ${quality}/10, ${durationMs}ms)`);
    console.log(`[AUTONOMY] 📄 Preview: ${preview}...`);
    return { result, quality, durationMs };

  } catch (err) {
    const durationMs = Date.now() - start;
    stmt.updateTaskFailed.run(err.message, taskId);
    stmt.logExec.run(task.goal_id, taskId, 'execute', task.agent_role, task.title, null, durationMs, 0, err.message);
    loopState.consecutiveErrors++;
    console.error(`[AUTONOMY] ❌ Task #${taskId} failed: ${err.message}`);

    // Retry if possible
    const updated = stmt.getTask.get(taskId);
    if (updated.retry_count < updated.max_retries) {
      stmt.resetTask.run(taskId);
      console.log(`[AUTONOMY] 🔄 Task #${taskId} queued for retry (${updated.retry_count}/${updated.max_retries})`);
    }

    throw err;
  }
}

// ─── Quality Evaluation ─────────────────────────

async function evaluateResult(task, result) {
  try {
    // Quick heuristic scoring — saves an extra LLM call and avoids the "always 5" problem
    let score = 3; // base score

    const text = result || '';
    const titleLower = (task.title + ' ' + (task.description || '')).toLowerCase();

    // +1 ตอบยาวพอ (ไม่ใช่แค่ 1-2 บรรทัด)
    if (text.length > 200) score += 1;
    if (text.length > 500) score += 1;

    // +2 มีตัวเลข/ราคาจริง (ไม่ใช่แค่ text)
    const hasNumbers = (text.match(/\d[\d,.]+/g) || []).length;
    if (hasNumbers >= 3) score += 1;
    if (hasNumbers >= 8) score += 1;

    // +1 มีหน่วยวัด (ตร.ม., บาท, ถุง, เส้น, etc.)
    if (/ตร\.ม\.|บาท|ถุง|เส้น|ลบ\.ม\.|ตัว|ชุด|เมตร|BTU/i.test(text)) score += 1;

    // +1 มีโครงสร้างชัดเจน (bullet points, numbering)
    if (/^\s*[-•\d]/m.test(text)) score += 1;

    // -2 hallucination red flags
    if (/ในฐานะ.*โมเดล|as an AI|I cannot|ไม่สามารถเข้าถึง|cannot access|ข้อมูลสมมติ|hypothetical/i.test(text)) {
      score -= 2;
    }

    // -1 ถ้าสั้นเกินไป
    if (text.length < 50) score -= 2;

    return Math.min(10, Math.max(1, score));
  } catch {
    return 5;
  }
}

// ─── Learning Pipeline ──────────────────────────

function harvestLearning(task, result, quality) {
  // Save to RAG knowledge base
  try {
    addKnowledgeEntry(
      task.agent_role,
      task.title,
      result.slice(0, 2000),
      `autonomy,goal_${task.goal_id}`,
      'autonomy',
      Math.round(quality),
    );
    stmt.logImprove.run(task.goal_id, 'knowledge_added', task.agent_role, `${task.title} (score: ${quality})`);
    console.log(`[AUTONOMY] 📚 Knowledge saved: "${task.title}"`);
  } catch (err) {
    console.error(`[AUTONOMY] Knowledge save failed: ${err.message}`);
  }

  // Collect training pair for future LoRA
  if (quality >= 8) {
    try {
      addTrainingData(
        task.agent_role,
        task.description || task.title,
        '',
        result.slice(0, 2000),
        'generated',
        quality,
      );
      stmt.logImprove.run(task.goal_id, 'training_pair', task.agent_role, `Quality ${quality}/10: ${task.title}`);
      console.log(`[AUTONOMY] 🧪 Training pair collected (quality: ${quality})`);
    } catch (err) {
      console.error(`[AUTONOMY] Training pair save failed: ${err.message}`);
    }
  }
}

// ─── Autonomous Tick (called by cron) ───────────

export async function runAutonomyTick() {
  // Check if chat is busy
  if (globalThis._chatBusy) {
    const busySince = Number(globalThis._chatBusySince || 0);
    if (busySince > 0 && Date.now() - busySince > LIMITS.staleChatBusyMs) {
      console.warn(`[AUTONOMY] Clearing stale chat_busy flag after ${Date.now() - busySince}ms`);
      globalThis._chatBusy = false;
      globalThis._chatBusySince = 0;
    } else {
      console.log(`[AUTONOMY] 💬 Chat busy, yielding...`);
      return { skipped: true, reason: 'chat_busy' };
    }
  }

  // Prevent concurrent autonomy tasks — wait for previous to finish
  if (loopState.running) {
    console.log(`[AUTONOMY] ⏳ Previous task still running, skipping tick`);
    return { skipped: true, reason: 'task_running' };
  }

  const goals = getActiveGoals();
  if (goals.length === 0) {
    return { skipped: true, reason: 'no_active_goals' };
  }

  const goal = goals[0];

  // Check iteration limit
  if (goal.iterations_used >= goal.max_iterations) {
    pauseGoal(goal.id);
    return { skipped: true, reason: 'max_iterations', goalId: goal.id };
  }

  // Check consecutive errors → circuit breaker
  if (loopState.consecutiveErrors >= LIMITS.maxConsecutiveErrors) {
    pauseGoal(goal.id);
    console.log(`[AUTONOMY] 🔴 Circuit breaker: ${LIMITS.maxConsecutiveErrors} consecutive errors, pausing goal #${goal.id}`);
    return { skipped: true, reason: 'circuit_breaker', goalId: goal.id };
  }

  // Decompose if no tasks yet
  const allTasks = stmt.getTasksByGoal.all(goal.id);
  if (allTasks.length === 0) {
    try {
      await decomposeGoal(goal.id);
      stmt.updateGoalIteration.run(goal.iterations_used + 1, goal.id);
      return { action: 'decomposed', goalId: goal.id };
    } catch (err) {
      console.error(`[AUTONOMY] Decompose failed: ${err.message}`);
      return { skipped: true, reason: 'decompose_failed', error: err.message };
    }
  }

  // Get next task
  const task = getNextTask(goal.id);
  if (!task) {
    // All tasks done — check if complete
    const pending = stmt.getPendingTasks.all(goal.id);
    const failed = stmt.getFailedTasks.all(goal.id);
    if (pending.length === 0 && failed.length === 0) {
      const summary = await generateGoalSummary(goal.id);
      stmt.completeGoal.run(summary, goal.id);
      loopState.running = false;
      console.log(`[AUTONOMY] 🎉 Goal #${goal.id} completed!`);
      return { action: 'goal_completed', goalId: goal.id, summary };
    }
    return { skipped: true, reason: 'all_tasks_blocked', goalId: goal.id };
  }

  // Execute the task
  try {
    loopState.running = true;
    loopState.goalId = goal.id;
    const result = await executeTask(task.id);
    loopState.running = false;
    stmt.updateGoalIteration.run(goal.iterations_used + 1, goal.id);
    return { action: 'task_completed', goalId: goal.id, taskId: task.id, quality: result.quality };
  } catch (err) {
    loopState.running = false;
    stmt.updateGoalIteration.run(goal.iterations_used + 1, goal.id);
    return { action: 'task_failed', goalId: goal.id, taskId: task.id, error: err.message };
  }
}

// ─── Goal Summary ───────────────────────────────

async function generateGoalSummary(goalId) {
  const goal = stmt.getGoal.get(goalId);
  const doneTasks = stmt.getDoneTasks.all(goalId);
  const improvements = stmt.getImprovements.all(goalId, 20);

  const taskSummaries = doneTasks.map(t =>
    `- ${t.title} (${t.agent_role}, ${t.quality_score}/10): ${(t.output_result || '').slice(0, 100)}`
  ).join('\n');

  const prompt = `สรุปผลลัพธ์ของเป้าหมาย "${goal.title}":

งานที่เสร็จ (${doneTasks.length} ชิ้น):
${taskSummaries}

Knowledge เพิ่ม: ${improvements.filter(i => i.improvement_type === 'knowledge_added').length} รายการ
Training pairs: ${improvements.filter(i => i.improvement_type === 'training_pair').length} รายการ

สรุปกระชับ 3-5 bullet points ว่าได้เรียนรู้อะไร ผลลัพธ์คืออะไร`;

  return callAgent('summarizer', prompt, { temperature: 0.3, maxTokens: 512 });
}

// ─── Progress Report ────────────────────────────

export function generateProgressReport(goalId) {
  const goal = stmt.getGoal.get(goalId);
  if (!goal) return 'ไม่พบ goal';

  const allTasks = stmt.getTasksByGoal.all(goalId);
  const done = allTasks.filter(t => t.status === 'done');
  const pending = allTasks.filter(t => t.status === 'pending');
  const failed = allTasks.filter(t => t.status === 'failed');
  const running = allTasks.filter(t => t.status === 'running');

  const avgQuality = done.length > 0
    ? (done.reduce((s, t) => s + (t.quality_score || 0), 0) / done.length).toFixed(1)
    : '-';

  const improvements = stmt.getImprovements.all(goalId, 50);
  const knowledgeCount = improvements.filter(i => i.improvement_type === 'knowledge_added').length;
  const trainingCount = improvements.filter(i => i.improvement_type === 'training_pair').length;

  const recentDone = done.slice(0, 5).map(t => {
    const preview = (t.output_result || '').replace(/\n/g, ' ').slice(0, 120);
    return `  • **${t.title}** (${t.quality_score}/10)\n    ↳ ${preview}...`;
  }).join('\n');

  const nextTasks = pending.slice(0, 3).map(t =>
    `  • [${t.agent_role}] ${t.title}`
  ).join('\n');

  return `🤖 **Autonomy Report — Goal #${goal.id}**
🎯 **${goal.title}**
⏱️ Iterations: ${goal.iterations_used}/${goal.max_iterations} | Status: ${goal.status}

📊 **Progress:**
✅ ${done.length} done | ⏳ ${pending.length} pending | ❌ ${failed.length} failed | ⚙️ ${running.length} running
📈 Average quality: ${avgQuality}/10

📝 **เสร็จล่าสุด:**
${recentDone || '  (ยังไม่มี)'}

📚 Knowledge +${knowledgeCount} | 🧪 Training pairs +${trainingCount}

${failed.length > 0 ? `⚠️ **Failed:**\n${failed.map(t => `  • ${t.title}: ${(t.output_result || '').slice(0, 80)}`).join('\n')}` : ''}

🔄 **Next:**
${nextTasks || '  (หมดแล้ว)'}

React: ✅ continue | ⏸️ pause | ❌ cancel`;
}

// ─── Status ─────────────────────────────────────

export function getLoopStatus() {
  const goals = getActiveGoals();
  return {
    running: loopState.running,
    goalId: loopState.goalId,
    consecutiveErrors: loopState.consecutiveErrors,
    tasksDoneThisSession: loopState.tasksDoneThisSession,
    lastTickAt: loopState.lastTickAt,
    activeGoals: goals.length,
  };
}

export function getGoalProgress(goalId) {
  const goal = stmt.getGoal.get(goalId);
  if (!goal) return null;
  const tasks = stmt.getTasksByGoal.all(goalId);
  return {
    ...goal,
    tasks: tasks.map(t => ({
      id: t.id,
      title: t.title,
      role: t.agent_role,
      status: t.status,
      quality: t.quality_score,
    })),
  };
}

// ─── Helpers ────────────────────────────────────

function parseJsonFromResponse(text) {
  // Try to extract JSON array from response
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return null;
  try {
    return JSON.parse(jsonMatch[0]);
  } catch {
    // Try fixing common issues
    try {
      const cleaned = jsonMatch[0]
        .replace(/,\s*]/g, ']')
        .replace(/,\s*}/g, '}')
        .replace(/'/g, '"');
      return JSON.parse(cleaned);
    } catch {
      return null;
    }
  }
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}
