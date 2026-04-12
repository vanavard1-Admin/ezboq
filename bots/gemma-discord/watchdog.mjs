/**
 * 🐴 Autonomy Watchdog — ม้าน้ำตรวจการบ้าน Gemma
 *
 * Runs as background process, checks every 30 min:
 * - Quality scores dropping? → pause + alert
 * - Tasks stuck (running > 10 min)? → reset
 * - Off-topic / hallucinated results? → flag
 * - All tasks done? → notify boss
 *
 * Alerts via Discord DM to boss channel
 *
 * Usage: node watchdog.mjs
 */

import Database from 'better-sqlite3';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = resolve(__dirname, 'gemma-memory.db');

// Boss DM channel — beaver (shadowsbeaver)
const BOSS_DM_CHANNEL = '1490709043826790490';
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

const CHECK_INTERVAL_MS = 30 * 60 * 1000; // 30 min
const STUCK_THRESHOLD_MS = 10 * 60 * 1000; // 10 min
const MIN_QUALITY = 4; // below this = bad
const QUALITY_DROP_THRESHOLD = 2; // drop of 2+ = warning

let lastCheckedTaskId = 0;
let lastQualityAvg = null;
let checkCount = 0;

function splitMessage(text, limit = 1900) {
  if (!text || text.length <= limit) return [text];
  const chunks = [];
  let rest = text;
  while (rest.length > 0) {
    if (rest.length <= limit) {
      chunks.push(rest);
      break;
    }
    let cut = rest.lastIndexOf('\n', limit);
    if (cut < limit * 0.3) cut = limit;
    chunks.push(rest.slice(0, cut));
    rest = rest.slice(cut).replace(/^\n/, '');
  }
  return chunks;
}

// ─── Discord Message ────────────────────────────

async function sendDiscord(channelId, message) {
  try {
    let ok = true;
    for (const chunk of splitMessage(message)) {
      const res = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bot ${BOT_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: chunk }),
      });
      if (!res.ok) {
        ok = false;
        console.error(`Discord send failed: ${res.status}`);
        break;
      }
    }
    return ok;
  } catch (err) {
    console.error(`Discord error: ${err.message}`);
    return false;
  }
}

// ─── Check Functions ────────────────────────────

function openDb() {
  return new Database(DB_PATH, { readonly: true });
}

function checkStuckTasks(db) {
  const issues = [];
  const running = db.prepare(
    "SELECT * FROM autonomous_tasks WHERE status = 'running'"
  ).all();

  for (const task of running) {
    // Check if running for too long (compare with created_at since we don't have started_at)
    const taskAge = Date.now() - new Date(task.created_at + 'Z').getTime();
    if (taskAge > STUCK_THRESHOLD_MS) {
      issues.push({
        type: 'stuck',
        taskId: task.id,
        title: task.title,
        ageMin: Math.round(taskAge / 60000),
      });
    }
  }
  return issues;
}

function checkQuality(db) {
  const issues = [];
  const recent = db.prepare(
    "SELECT * FROM autonomous_tasks WHERE status = 'done' AND quality_score IS NOT NULL ORDER BY completed_at DESC LIMIT 10"
  ).all();

  if (recent.length === 0) return issues;

  const avgQuality = recent.reduce((s, t) => s + t.quality_score, 0) / recent.length;

  // Check for low quality tasks
  for (const task of recent) {
    if (task.id > lastCheckedTaskId && task.quality_score < MIN_QUALITY) {
      issues.push({
        type: 'low_quality',
        taskId: task.id,
        title: task.title,
        quality: task.quality_score,
      });
    }
  }

  // Check for quality drop
  if (lastQualityAvg !== null && lastQualityAvg - avgQuality >= QUALITY_DROP_THRESHOLD) {
    issues.push({
      type: 'quality_drop',
      from: lastQualityAvg.toFixed(1),
      to: avgQuality.toFixed(1),
    });
  }

  lastQualityAvg = avgQuality;
  if (recent.length > 0) lastCheckedTaskId = Math.max(...recent.map(t => t.id));

  return issues;
}

function checkGoalStatus(db) {
  const issues = [];
  const goals = db.prepare(
    "SELECT * FROM autonomous_goals WHERE status = 'active' ORDER BY id DESC LIMIT 1"
  ).all();

  if (goals.length === 0) {
    issues.push({ type: 'no_active_goals' });
    return issues;
  }

  const goal = goals[0];
  const tasks = db.prepare(
    "SELECT status, COUNT(*) as cnt FROM autonomous_tasks WHERE goal_id = ? GROUP BY status"
  ).all(goal.id);

  const statusMap = {};
  for (const t of tasks) statusMap[t.status] = t.cnt;

  // All done?
  if ((statusMap.done || 0) > 0 && !statusMap.pending && !statusMap.running) {
    issues.push({
      type: 'goal_complete',
      goalId: goal.id,
      title: goal.title,
      done: statusMap.done,
    });
  }

  // Too many failures?
  if ((statusMap.failed || 0) >= 3) {
    issues.push({
      type: 'many_failures',
      goalId: goal.id,
      failed: statusMap.failed,
    });
  }

  // Check circuit breaker — consecutive errors
  const recentLogs = db.prepare(
    "SELECT * FROM execution_log WHERE goal_id = ? ORDER BY created_at DESC LIMIT 5"
  ).all(goal.id);
  const consecutiveErrors = recentLogs.findIndex(l => l.success === 1);
  if (consecutiveErrors >= 3 || (consecutiveErrors === -1 && recentLogs.length >= 3)) {
    issues.push({
      type: 'circuit_breaker',
      goalId: goal.id,
      errors: consecutiveErrors === -1 ? recentLogs.length : consecutiveErrors,
    });
  }

  return issues;
}

function checkOutputQuality(db) {
  const issues = [];
  // Check recent task outputs for hallucination signals
  const recent = db.prepare(
    "SELECT * FROM autonomous_tasks WHERE status = 'done' AND id > ? ORDER BY id"
  ).all(lastCheckedTaskId);

  for (const task of recent) {
    const output = task.output_result || '';

    // Red flags for hallucination
    const redFlags = [
      /ในฐานะ.*โมเดล|as an AI|I cannot/i,  // generic LLM response
      /ไม่สามารถเข้าถึง|cannot access/i,    // claims no access
      /ข้อมูลสมมติ|hypothetical|ตัวอย่าง.*สมมติ/i, // admits it's fake
    ];

    for (const flag of redFlags) {
      if (flag.test(output)) {
        issues.push({
          type: 'hallucination',
          taskId: task.id,
          title: task.title,
          match: output.match(flag)?.[0],
        });
        break;
      }
    }
  }
  return issues;
}

// ─── Build Report ───────────────────────────────

function buildReport(db) {
  const goal = db.prepare(
    "SELECT * FROM autonomous_goals WHERE status IN ('active','paused') ORDER BY id DESC LIMIT 1"
  ).get();

  if (!goal) return null;

  const tasks = db.prepare(
    "SELECT * FROM autonomous_tasks WHERE goal_id = ? ORDER BY id"
  ).all(goal.id);

  const done = tasks.filter(t => t.status === 'done');
  const pending = tasks.filter(t => t.status === 'pending');
  const failed = tasks.filter(t => t.status === 'failed');
  const running = tasks.filter(t => t.status === 'running');

  const avgQ = done.length > 0
    ? (done.reduce((s, t) => s + (t.quality_score || 0), 0) / done.length).toFixed(1)
    : '-';

  const taskLines = tasks.map(t => {
    const icon = { done: '✅', pending: '⏳', running: '⚙️', failed: '❌', blocked: '🔒' }[t.status] || '❓';
    const q = t.quality_score ? ` (${t.quality_score}/10)` : '';
    return `${icon} #${t.id} [${t.agent_role}] ${t.title}${q}`;
  }).join('\n');

  return `🐴 **ม้าน้ำ Watchdog Report #${checkCount}**
🎯 Goal: ${goal.title}
📊 Status: ${goal.status} | Iter: ${goal.iterations_used}/${goal.max_iterations}

✅ ${done.length} done | ⏳ ${pending.length} pending | ❌ ${failed.length} failed | ⚙️ ${running.length} running
📈 Avg quality: ${avgQ}/10

${taskLines}`;
}

// ─── Auto-fix ───────────────────────────────────

function autoFix(issues) {
  const fixes = [];
  const db = new Database(DB_PATH); // writable

  for (const issue of issues) {
    if (issue.type === 'stuck') {
      // Reset stuck task
      db.prepare("UPDATE autonomous_tasks SET status = 'pending' WHERE id = ? AND status = 'running'").run(issue.taskId);
      fixes.push(`Reset stuck task #${issue.taskId} (${issue.title})`);
    }
  }

  db.close();
  return fixes;
}

// ─── Main Check ─────────────────────────────────

async function runCheck() {
  checkCount++;
  console.log(`\n[WATCHDOG] Check #${checkCount} at ${new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}`);

  let db;
  try {
    db = openDb();
  } catch (err) {
    console.error(`[WATCHDOG] DB open failed: ${err.message}`);
    return;
  }

  const allIssues = [
    ...checkStuckTasks(db),
    ...checkQuality(db),
    ...checkGoalStatus(db),
    ...checkOutputQuality(db),
  ];

  const report = buildReport(db);
  db.close();

  // Auto-fix what we can
  const fixes = autoFix(allIssues.filter(i => i.type === 'stuck'));

  // Build alert message
  const criticalIssues = allIssues.filter(i =>
    ['circuit_breaker', 'many_failures', 'quality_drop', 'hallucination'].includes(i.type)
  );

  if (criticalIssues.length > 0) {
    const alertLines = criticalIssues.map(i => {
      if (i.type === 'circuit_breaker') return `🔴 Circuit breaker: ${i.errors} consecutive errors`;
      if (i.type === 'many_failures') return `🔴 ${i.failed} tasks failed`;
      if (i.type === 'quality_drop') return `⚠️ Quality dropped: ${i.from} → ${i.to}`;
      if (i.type === 'hallucination') return `⚠️ Hallucination in #${i.taskId}: "${i.match}"`;
      return `⚠️ ${i.type}`;
    });

    const alertMsg = `🚨 **Autonomy Alert!**\n${alertLines.join('\n')}\n${fixes.length > 0 ? `\n🔧 Auto-fix: ${fixes.join(', ')}` : ''}\n\n${report || ''}`;
    console.log(alertMsg);
    await sendDiscord(BOSS_DM_CHANNEL, alertMsg);
  } else if (checkCount % 2 === 0) {
    // Regular report every hour (every 2 checks at 30min intervals)
    if (report) {
      console.log(report);
      await sendDiscord(BOSS_DM_CHANNEL, report);
    }
  }

  // Goal complete notification
  const completeIssue = allIssues.find(i => i.type === 'goal_complete');
  if (completeIssue) {
    await sendDiscord(BOSS_DM_CHANNEL,
      `🎉 **Goal เสร็จแล้วครับบอส!**\n🎯 ${completeIssue.title}\n✅ ${completeIssue.done} tasks done\n\nรอบอสตรวจ + สั่ง goal ต่อไปครับ`
    );
  }

  // No active goals
  if (allIssues.find(i => i.type === 'no_active_goals')) {
    console.log('[WATCHDOG] No active goals — sleeping...');
  }

  console.log(`[WATCHDOG] Issues: ${allIssues.length} | Fixes: ${fixes.length} | Next check in 30 min`);
}

// ─── Entry Point ────────────────────────────────

console.log('🐴 ม้าน้ำ Watchdog starting...');
console.log(`   Monitoring: ${DB_PATH}`);
console.log(`   Check interval: ${CHECK_INTERVAL_MS / 60000} min`);
console.log(`   Alerts to: Discord channel ${BOSS_DM_CHANNEL}`);

// Run immediately
await runCheck();

// Then every 30 min
setInterval(runCheck, CHECK_INTERVAL_MS);
