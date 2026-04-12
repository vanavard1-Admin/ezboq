/**
 * 💎 Gemma Workflow Engine — Multi-step automated workflows
 * Simple BPMN-like engine: define steps, execute sequentially with branching
 * Uses SQLite gemma-memory.db (shared with memory.mjs, rag.mjs)
 */

import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { getDb } from './memory.mjs';
import { generateText } from './llm.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

const db = getDb();

// ─── Schema ─────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS workflows (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id    TEXT NOT NULL,
    name        TEXT NOT NULL,
    description TEXT,
    steps       TEXT NOT NULL,   -- JSON string
    created_by  TEXT,
    created_at  TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS workflow_runs (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    workflow_id   INTEGER NOT NULL,
    guild_id      TEXT,
    channel_id    TEXT,
    user_id       TEXT,
    status        TEXT NOT NULL DEFAULT 'running' CHECK(status IN ('running','completed','failed','paused')),
    current_step  INTEGER NOT NULL DEFAULT 0,
    context       TEXT NOT NULL DEFAULT '{}',  -- JSON accumulated data
    started_at    TEXT DEFAULT (datetime('now')),
    completed_at  TEXT,
    FOREIGN KEY (workflow_id) REFERENCES workflows(id)
  );

  CREATE INDEX IF NOT EXISTS idx_wf_guild ON workflows(guild_id);
  CREATE INDEX IF NOT EXISTS idx_wfr_status ON workflow_runs(status);
  CREATE INDEX IF NOT EXISTS idx_wfr_workflow ON workflow_runs(workflow_id);
`);

// ─── Prepared Statements ────────────────────────────
const stmtInsertWorkflow = db.prepare(`
  INSERT INTO workflows (guild_id, name, description, steps, created_by)
  VALUES (?, ?, ?, ?, ?)
`);
const stmtGetWorkflow = db.prepare(`SELECT * FROM workflows WHERE id = ?`);
const stmtListWorkflows = db.prepare(`
  SELECT id, name, description, created_by, created_at FROM workflows
  WHERE guild_id = ?
  ORDER BY created_at DESC
`);
const stmtInsertRun = db.prepare(`
  INSERT INTO workflow_runs (workflow_id, guild_id, channel_id, user_id, context)
  VALUES (?, ?, ?, ?, ?)
`);
const stmtGetRun = db.prepare(`SELECT * FROM workflow_runs WHERE id = ?`);
const stmtUpdateRun = db.prepare(`
  UPDATE workflow_runs SET status = ?, current_step = ?, context = ?, completed_at = ?
  WHERE id = ?
`);

// ─── Built-in Workflow Templates ────────────────────
const BUILTIN_WORKFLOWS = [
  {
    name: 'customer_inquiry',
    description: 'สอบถามลูกค้า: งบ → พื้นที่ → สไตล์ → คำนวณ BOQ → สรุป',
    steps: [
      {
        type: 'prompt',
        action: 'ถามลูกค้าว่างบประมาณโดยรวมของโปรเจคอยู่ที่เท่าไหร่ ตอบสุภาพ เป็นกันเอง',
        role: 'advisor',
        next_on_success: 1,
        next_on_fail: null,
      },
      {
        type: 'wait',
        action: 'รอลูกค้าตอบงบประมาณ',
        role: null,
        next_on_success: 2,
        next_on_fail: null,
      },
      {
        type: 'prompt',
        action: 'ถามลูกค้าว่าพื้นที่ทั้งหมดกี่ตารางเมตร และห้องที่ต้องการตกแต่งมีอะไรบ้าง',
        role: 'advisor',
        next_on_success: 3,
        next_on_fail: null,
      },
      {
        type: 'wait',
        action: 'รอลูกค้าตอบพื้นที่',
        role: null,
        next_on_success: 4,
        next_on_fail: null,
      },
      {
        type: 'prompt',
        action: 'ถามลูกค้าว่าชอบสไตล์แบบไหน (minimal, japanese, industrial, scandinavian, luxury, tropical) พร้อมอธิบายแต่ละแบบสั้นๆ',
        role: 'designer',
        next_on_success: 5,
        next_on_fail: null,
      },
      {
        type: 'wait',
        action: 'รอลูกค้าตอบสไตล์',
        role: null,
        next_on_success: 6,
        next_on_fail: null,
      },
      {
        type: 'tool',
        action: 'calculate_boq',
        role: 'estimator',
        next_on_success: 7,
        next_on_fail: 7,
      },
      {
        type: 'prompt',
        action: 'สรุปข้อมูลลูกค้าทั้งหมดจาก context: งบ, พื้นที่, สไตล์, ราคาประเมิน เขียนเป็นรายงานสวยๆ พร้อมคำแนะนำ',
        role: 'summarizer',
        next_on_success: null,
        next_on_fail: null,
      },
    ],
  },
  {
    name: 'content_creation',
    description: 'สร้าง content: คิดหัวข้อ → เขียน draft → review → caption → hashtag',
    steps: [
      {
        type: 'prompt',
        action: 'คิดหัวข้อ content 5 ไอเดียสำหรับธุรกิจ จากบริบทใน context ตอบเป็นรายการ 1-5',
        role: 'writer',
        next_on_success: 1,
        next_on_fail: null,
      },
      {
        type: 'wait',
        action: 'รอผู้ใช้เลือกหัวข้อ (ตอบเลข 1-5)',
        role: null,
        next_on_success: 2,
        next_on_fail: null,
      },
      {
        type: 'prompt',
        action: 'เขียน draft content จากหัวข้อที่เลือกใน context ความยาว 200-400 คำ โทนเป็นกันเอง มี call to action',
        role: 'writer',
        next_on_success: 3,
        next_on_fail: null,
      },
      {
        type: 'prompt',
        action: 'review draft ใน context หาจุดปรับปรุง ตรวจ tone, flow, ข้อเท็จจริง ให้ feedback 3-5 ข้อ แล้วเขียน revised version',
        role: 'reviewer',
        next_on_success: 4,
        next_on_fail: null,
      },
      {
        type: 'prompt',
        action: 'สร้าง caption สำหรับ social media จาก content ใน context กระชับ ดึงดูด มี emoji เหมาะสม',
        role: 'marketer',
        next_on_success: 5,
        next_on_fail: null,
      },
      {
        type: 'prompt',
        action: 'แนะนำ hashtag 10-15 ตัว สำหรับ content ใน context ทั้งไทยและอังกฤษ เรียงจากเจาะจง → กว้าง',
        role: 'marketer',
        next_on_success: null,
        next_on_fail: null,
      },
    ],
  },
  {
    name: 'market_research',
    description: 'วิจัยตลาด: research → วิเคราะห์คู่แข่ง → ประเมินราคา → สรุปแนะนำ',
    steps: [
      {
        type: 'prompt',
        action: 'วิจัยตลาดของสินค้า/บริการจาก context: ขนาดตลาด, กลุ่มเป้าหมาย, แนวโน้ม, โอกาส ให้ข้อมูลเชิงลึก',
        role: 'researcher',
        next_on_success: 1,
        next_on_fail: null,
      },
      {
        type: 'prompt',
        action: 'วิเคราะห์คู่แข่ง 3-5 ราย จาก context: จุดแข็ง จุดอ่อน ราคา USP ช่องว่างในตลาด',
        role: 'analyst',
        next_on_success: 2,
        next_on_fail: null,
      },
      {
        type: 'prompt',
        action: 'ประเมินราคาที่เหมาะสมจาก context: pricing strategy, ต้นทุน, margin, เปรียบเทียบคู่แข่ง แนะนำ 3 ระดับราคา',
        role: 'estimator',
        next_on_success: 3,
        next_on_fail: null,
      },
      {
        type: 'condition',
        action: 'context.step_results && context.step_results.length >= 3',
        role: null,
        next_on_success: 4,
        next_on_fail: 4,
      },
      {
        type: 'prompt',
        action: 'สรุปผลวิจัยตลาดทั้งหมดจาก context: findings, คู่แข่ง, ราคา ให้คำแนะนำเชิงกลยุทธ์ 5 ข้อ เรียงตามความสำคัญ',
        role: 'ceo',
        next_on_success: null,
        next_on_fail: null,
      },
    ],
  },
];

// ─── LLM Call (same pattern as agents.mjs) ──────────
async function callLlm(prompt, role = 'assistant', temperature = 0.7) {
  const COMPANY_ROLES = {
    ceo:        'คุณคือ CEO ตัดสินใจเชิงกลยุทธ์ มองภาพรวม',
    researcher: 'คุณคือนักวิจัย ค้นหาข้อมูล ให้ข้อมูลที่ถูกต้อง',
    analyst:    'คุณคือนักวิเคราะห์ วิเคราะห์ข้อดี-ข้อเสีย',
    designer:   'คุณคือนักออกแบบ คิด concept แนะนำ style',
    writer:     'คุณคือ content writer เขียนเนื้อหาดึงดูดใจ',
    planner:    'คุณคือ project planner วางแผนงาน timeline',
    reviewer:   'คุณคือ QA/reviewer ตรวจสอบคุณภาพ ให้ feedback',
    estimator:  'คุณคือนักประเมินราคา คำนวณต้นทุน ให้แม่นยำ',
    advisor:    'คุณคือที่ปรึกษาอาวุโส ให้คำแนะนำ best practices',
    marketer:   'คุณคือนักการตลาด คิด strategy targeting',
    critic:     'คุณคือ devil\'s advocate มองมุมตรงข้าม',
    summarizer: 'คุณคือนักสรุป รวบรวมข้อมูล สรุปกระชับ',
  };

  const rolePrompt = COMPANY_ROLES[role] || `บทบาท: ${role}`;
  const systemPrompt = `คุณคือ AI agent ในทีม "บริษัทเจมม่า" กำลังทำงานใน workflow อัตโนมัติ ตอบภาษาไทย กระชับ ตรงประเด็น\n${rolePrompt}\nกฎ: ตอบเฉพาะสิ่งที่ถูกถาม ให้ข้อมูลที่ actionable`;

  try {
    return await generateText(systemPrompt, prompt, {
      temperature,
      maxOutputTokens: 1024,
    });
  } catch (err) {
    throw new Error(`LLM call failed: ${err.message}`);
  }
}

// ─── Workflow CRUD ──────────────────────────────────

export function createWorkflow(guildId, name, description, steps, createdBy) {
  const stepsJson = typeof steps === 'string' ? steps : JSON.stringify(steps);
  const info = stmtInsertWorkflow.run(guildId, name, description, stepsJson, createdBy);
  console.log(`[WORKFLOW] Created "${name}" (id: ${info.lastInsertRowid}) for guild ${guildId}`);
  return { id: info.lastInsertRowid, name, description };
}

export function getWorkflow(id) {
  const row = stmtGetWorkflow.get(id);
  if (!row) return null;
  return { ...row, steps: JSON.parse(row.steps) };
}

export function listWorkflows(guildId) {
  return stmtListWorkflows.all(guildId);
}

// ─── Workflow Execution ─────────────────────────────

export function startWorkflow(workflowId, guildId, channelId, userId, initialContext = {}) {
  const workflow = getWorkflow(workflowId);
  if (!workflow) throw new Error(`Workflow ${workflowId} not found`);

  const ctx = {
    workflow_name: workflow.name,
    step_results: [],
    user_inputs: [],
    ...initialContext,
  };

  const info = stmtInsertRun.run(
    workflowId, guildId, channelId, userId, JSON.stringify(ctx)
  );

  console.log(`[WORKFLOW] Started run ${info.lastInsertRowid} for workflow "${workflow.name}"`);
  return {
    runId: info.lastInsertRowid,
    workflowName: workflow.name,
    totalSteps: workflow.steps.length,
    status: 'running',
  };
}

export async function executeStep(runId) {
  const run = stmtGetRun.get(runId);
  if (!run) throw new Error(`Run ${runId} not found`);
  if (run.status === 'completed' || run.status === 'failed') {
    return { runId, status: run.status, message: 'Workflow already finished' };
  }

  const workflow = getWorkflow(run.workflow_id);
  if (!workflow) throw new Error(`Workflow ${run.workflow_id} not found`);

  const context = JSON.parse(run.context);
  const stepIndex = run.current_step;
  const step = workflow.steps[stepIndex];

  if (!step) {
    // No more steps — workflow complete
    stmtUpdateRun.run('completed', stepIndex, JSON.stringify(context), new Date().toISOString(), runId);
    return { runId, status: 'completed', context, message: 'Workflow completed' };
  }

  console.log(`[WORKFLOW] Run ${runId} — executing step ${stepIndex} (${step.type}: ${step.action.slice(0, 50)}...)`);

  let result;
  let success = true;

  try {
    switch (step.type) {
      case 'prompt': {
        // Build prompt with accumulated context
        const contextSummary = buildContextSummary(context);
        const fullPrompt = `${step.action}\n\n--- Context ---\n${contextSummary}`;
        result = await callLlm(fullPrompt, step.role || 'assistant');
        context.step_results.push({ step: stepIndex, type: 'prompt', role: step.role, result });
        break;
      }

      case 'tool': {
        // Execute tool by name — resolve from context data
        result = await executeTool(step.action, context);
        context.step_results.push({ step: stepIndex, type: 'tool', tool: step.action, result });
        break;
      }

      case 'wait': {
        // Pause workflow, wait for user input
        stmtUpdateRun.run('paused', stepIndex, JSON.stringify(context), null, runId);
        return {
          runId,
          status: 'paused',
          step: stepIndex,
          message: step.action,
          prompt: step.action,
          context,
        };
      }

      case 'condition': {
        // Evaluate condition against context
        success = evaluateCondition(step.action, context);
        context.step_results.push({ step: stepIndex, type: 'condition', expression: step.action, result: success });
        break;
      }

      default:
        throw new Error(`Unknown step type: ${step.type}`);
    }
  } catch (err) {
    console.error(`[WORKFLOW] Step ${stepIndex} failed:`, err.message);
    success = false;
    result = err.message;
    context.step_results.push({ step: stepIndex, type: step.type, error: err.message });
  }

  // Determine next step
  const nextStep = success
    ? (step.next_on_success ?? stepIndex + 1)
    : (step.next_on_fail ?? null);

  if (nextStep === null || nextStep >= workflow.steps.length) {
    // Workflow complete
    stmtUpdateRun.run('completed', stepIndex, JSON.stringify(context), new Date().toISOString(), runId);
    return { runId, status: 'completed', step: stepIndex, result, context };
  }

  // Advance to next step
  stmtUpdateRun.run('running', nextStep, JSON.stringify(context), null, runId);
  return { runId, status: 'running', step: stepIndex, nextStep, result, context };
}

export async function resumeWorkflow(runId, userInput) {
  const run = stmtGetRun.get(runId);
  if (!run) throw new Error(`Run ${runId} not found`);
  if (run.status !== 'paused') {
    return { runId, status: run.status, message: 'Workflow is not paused' };
  }

  const workflow = getWorkflow(run.workflow_id);
  if (!workflow) throw new Error(`Workflow ${run.workflow_id} not found`);

  const context = JSON.parse(run.context);
  const currentStep = workflow.steps[run.current_step];

  // Store user input
  context.user_inputs.push({
    step: run.current_step,
    input: userInput,
    timestamp: new Date().toISOString(),
  });
  context.step_results.push({
    step: run.current_step,
    type: 'wait',
    result: userInput,
  });
  // Also store as latest_input for easy access
  context.latest_input = userInput;

  // Determine next step
  const nextStep = currentStep.next_on_success ?? (run.current_step + 1);

  if (nextStep >= workflow.steps.length) {
    stmtUpdateRun.run('completed', run.current_step, JSON.stringify(context), new Date().toISOString(), runId);
    return { runId, status: 'completed', context };
  }

  // Resume — set to running at next step
  stmtUpdateRun.run('running', nextStep, JSON.stringify(context), null, runId);
  console.log(`[WORKFLOW] Run ${runId} resumed at step ${nextStep}`);

  return { runId, status: 'running', nextStep, context };
}

export function getWorkflowRun(runId) {
  const run = stmtGetRun.get(runId);
  if (!run) return null;
  return { ...run, context: JSON.parse(run.context) };
}

// ─── Built-in Templates ─────────────────────────────

export function getBuiltinWorkflows() {
  return BUILTIN_WORKFLOWS.map(w => ({
    name: w.name,
    description: w.description,
    stepCount: w.steps.length,
    steps: w.steps.map((s, i) => ({
      index: i,
      type: s.type,
      action: s.action.slice(0, 80),
      role: s.role,
    })),
  }));
}

export function seedBuiltinWorkflows(guildId) {
  const results = [];
  for (const template of BUILTIN_WORKFLOWS) {
    // Check if already exists
    const existing = db.prepare(
      `SELECT id FROM workflows WHERE guild_id = ? AND name = ?`
    ).get(guildId, template.name);

    if (existing) {
      results.push({ name: template.name, status: 'exists', id: existing.id });
      continue;
    }

    const created = createWorkflow(
      guildId,
      template.name,
      template.description,
      template.steps,
      'gemma_builtin'
    );
    results.push({ name: template.name, status: 'created', id: created.id });
  }
  console.log(`[WORKFLOW] Seeded ${results.filter(r => r.status === 'created').length} workflows for guild ${guildId}`);
  return results;
}

// ─── Helpers ────────────────────────────────────────

function buildContextSummary(context) {
  const parts = [];

  if (context.user_inputs?.length > 0) {
    parts.push('คำตอบจากผู้ใช้:');
    for (const input of context.user_inputs) {
      parts.push(`  Step ${input.step}: ${input.input}`);
    }
  }

  if (context.step_results?.length > 0) {
    parts.push('ผลลัพธ์ก่อนหน้า:');
    for (const sr of context.step_results) {
      const val = sr.result || sr.error || '(no data)';
      const trimmed = typeof val === 'string' ? val.slice(0, 500) : JSON.stringify(val).slice(0, 500);
      parts.push(`  Step ${sr.step} (${sr.type}): ${trimmed}`);
    }
  }

  // Include any extra context keys
  const skipKeys = new Set(['workflow_name', 'step_results', 'user_inputs', 'latest_input']);
  for (const [k, v] of Object.entries(context)) {
    if (skipKeys.has(k)) continue;
    parts.push(`${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`);
  }

  return parts.length > 0 ? parts.join('\n') : '(ยังไม่มีข้อมูล)';
}

async function executeTool(toolName, context) {
  // Minimal inline tool execution for workflow steps
  // For complex tools, the caller should integrate with tools.mjs
  switch (toolName) {
    case 'calculate_boq': {
      // Extract area and type from context
      const latestInput = context.latest_input || '';
      const allInputs = (context.user_inputs || []).map(u => u.input).join(' ');
      const combined = `${allInputs} ${latestInput}`;

      // Try to extract numbers for area
      const areaMatch = combined.match(/(\d+(?:\.\d+)?)\s*(?:ตร\.?ม\.?|ตารางเมตร|sqm|sq\.?m)/i);
      const area = areaMatch ? parseFloat(areaMatch[1]) : 30;

      // Rough BOQ estimation inline
      const rates = { value: 15000, standard: 25000, premium: 45000 };
      const tier = combined.includes('premium') ? 'premium' : combined.includes('value') ? 'value' : 'standard';
      const subtotal = area * rates[tier];
      const vat = subtotal * 0.07;
      const total = subtotal + vat;

      return `ประเมินราคาเบื้องต้น:\nพื้นที่: ${area} ตร.ม.\nระดับ: ${tier}\nราคาก่อน VAT: ${subtotal.toLocaleString()} บาท\nVAT 7%: ${vat.toLocaleString()} บาท\nรวมทั้งหมด: ${total.toLocaleString()} บาท\n(ราคาประเมินเบื้องต้น ราคาจริงอาจแตกต่างตามรายละเอียดงาน)`;
    }

    case 'web_search': {
      return `(web search is not available in workflow context — use prompt step with researcher role instead)`;
    }

    default:
      return `(tool "${toolName}" executed — integrate with tools.mjs for full functionality)`;
  }
}

function evaluateCondition(expression, context) {
  try {
    // Safe evaluation: only allow context property access and basic comparisons
    // We build a limited scope function
    const fn = new Function('context', `try { return !!(${expression}); } catch { return false; }`);
    return fn(context);
  } catch {
    console.warn(`[WORKFLOW] Condition eval failed: ${expression}`);
    return false;
  }
}
