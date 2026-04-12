/**
 * 💎 Gemma Discord Bot — Cron / Scheduled Task System
 * Runs tasks automatically on schedule using SQLite.
 * Supports: interval (ms), daily (HH:MM), weekly (day HH:MM)
 * All times in Asia/Bangkok (GMT+7)
 */

import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { getDb } from './memory.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const db = getDb();

// ─── Schema ─────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS cron_jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT,
    channel_id TEXT,
    user_id TEXT,
    name TEXT NOT NULL,
    schedule_type TEXT NOT NULL CHECK(schedule_type IN ('interval', 'daily', 'weekly')),
    schedule_value TEXT NOT NULL,
    task_prompt TEXT NOT NULL,
    enabled INTEGER DEFAULT 1,
    last_run TEXT,
    next_run TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_cron_guild ON cron_jobs(guild_id);
  CREATE INDEX IF NOT EXISTS idx_cron_next ON cron_jobs(next_run, enabled);
`);

// ─── Bangkok Timezone Helpers ────────────────────
const BANGKOK_OFFSET_H = 7; // Asia/Bangkok = UTC+7, no DST

/** Get ISO string for current UTC time */
function nowISO() {
  return new Date().toISOString();
}

/**
 * Get current hour/minute/day-of-week in Bangkok timezone.
 * Uses Intl.DateTimeFormat for reliable timezone conversion.
 */
function getBangkokNow() {
  const now = new Date();
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false, weekday: 'long',
  });
  const parts = {};
  for (const { type, value } of fmt.formatToParts(now)) {
    parts[type] = value;
  }
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour === '24' ? 0 : parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
    weekday: parts.weekday.toLowerCase(),
    utcMs: now.getTime(),
  };
}

/**
 * Build a UTC Date from Bangkok date components + target hour:minute.
 * Bangkok = UTC+7, so UTC = Bangkok - 7h.
 */
function bangkokToUtc(year, month, day, hour, minute) {
  // Construct date as if it were UTC, then subtract the offset
  const utc = new Date(Date.UTC(year, month - 1, day, hour - BANGKOK_OFFSET_H, minute, 0, 0));
  return utc;
}

/** Parse "HH:MM" and return next occurrence as UTC ISO string */
function nextDailyRun(timeStr) {
  const [targetH, targetM] = timeStr.split(':').map(Number);
  const bkk = getBangkokNow();

  let { year, month, day } = bkk;
  const alreadyPassed = (bkk.hour > targetH) || (bkk.hour === targetH && bkk.minute >= targetM);

  if (alreadyPassed) {
    // Advance to tomorrow
    const tomorrow = new Date(Date.UTC(year, month - 1, day + 1));
    year = tomorrow.getUTCFullYear();
    month = tomorrow.getUTCMonth() + 1;
    day = tomorrow.getUTCDate();
  }

  return bangkokToUtc(year, month, day, targetH, targetM).toISOString();
}

/** Parse "dayname HH:MM" and return next occurrence as UTC ISO string */
function nextWeeklyRun(scheduleValue) {
  const parts = scheduleValue.toLowerCase().split(/\s+/);
  const dayName = parts[0];
  const timeStr = parts[1] || '09:00';
  const [targetH, targetM] = timeStr.split(':').map(Number);

  const dayMap = {
    sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
    thursday: 4, friday: 5, saturday: 6,
  };
  const dayNameToNum = {
    sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
    thursday: 4, friday: 5, saturday: 6,
  };
  const targetDay = dayNameToNum[dayName];
  if (targetDay === undefined) {
    throw new Error(`Invalid day name: ${dayName}`);
  }

  const bkk = getBangkokNow();
  const currentDayNum = dayMap[bkk.weekday];

  let daysUntil = targetDay - currentDayNum;
  if (daysUntil < 0) daysUntil += 7;
  if (daysUntil === 0) {
    const alreadyPassed = (bkk.hour > targetH) || (bkk.hour === targetH && bkk.minute >= targetM);
    if (alreadyPassed) daysUntil = 7;
  }

  const target = new Date(Date.UTC(bkk.year, bkk.month - 1, bkk.day + daysUntil));
  return bangkokToUtc(
    target.getUTCFullYear(), target.getUTCMonth() + 1, target.getUTCDate(),
    targetH, targetM,
  ).toISOString();
}

/** Next interval run: now + interval ms */
function nextIntervalRun(intervalMs) {
  return new Date(Date.now() + Number(intervalMs)).toISOString();
}

// ─── Core: calculateNextRun ──────────────────────
/**
 * Calculate the next run time based on schedule type and value.
 * @param {string} scheduleType - 'interval' | 'daily' | 'weekly'
 * @param {string} scheduleValue - ms for interval, "HH:MM" for daily, "dayname HH:MM" for weekly
 * @returns {string} ISO date string (UTC)
 */
export function calculateNextRun(scheduleType, scheduleValue) {
  switch (scheduleType) {
    case 'interval':
      return nextIntervalRun(scheduleValue);
    case 'daily':
      return nextDailyRun(scheduleValue);
    case 'weekly':
      return nextWeeklyRun(scheduleValue);
    default:
      throw new Error(`Unknown schedule type: ${scheduleType}`);
  }
}

// ─── Prepared Statements ────────────────────────
const stmtInsert = db.prepare(`
  INSERT INTO cron_jobs (guild_id, channel_id, user_id, name, schedule_type, schedule_value, task_prompt, next_run)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

const stmtDelete = db.prepare(`DELETE FROM cron_jobs WHERE id = ?`);

const stmtList = db.prepare(`
  SELECT id, guild_id, channel_id, user_id, name, schedule_type, schedule_value,
         task_prompt, enabled, last_run, next_run, created_at
  FROM cron_jobs
  WHERE guild_id = ? OR guild_id IS NULL
  ORDER BY next_run ASC
`);

const stmtToggle = db.prepare(`UPDATE cron_jobs SET enabled = ? WHERE id = ?`);

const stmtGetDue = db.prepare(`
  SELECT id, guild_id, channel_id, user_id, name, schedule_type, schedule_value,
         task_prompt, last_run, next_run
  FROM cron_jobs
  WHERE enabled = 1 AND next_run <= ?
`);

const stmtMarkRun = db.prepare(`
  UPDATE cron_jobs SET last_run = ?, next_run = ? WHERE id = ?
`);

const stmtCountAll = db.prepare(`SELECT COUNT(*) as count FROM cron_jobs`);

const stmtGetById = db.prepare(`SELECT * FROM cron_jobs WHERE id = ?`);

const stmtUpdateChannelGuild = db.prepare(`
  UPDATE cron_jobs SET guild_id = ?, channel_id = ? WHERE id = ?
`);

// ─── CRUD Functions ─────────────────────────────

/**
 * Create a new cron job.
 * @returns {{ id: number }} The inserted job's info
 */
export function addCronJob(guildId, channelId, userId, name, scheduleType, scheduleValue, taskPrompt) {
  const nextRun = calculateNextRun(scheduleType, scheduleValue);
  const result = stmtInsert.run(guildId, channelId, userId, name, scheduleType, scheduleValue, taskPrompt, nextRun);
  return { id: result.lastInsertRowid, nextRun };
}

/**
 * Delete a cron job by ID.
 */
export function removeCronJob(id) {
  return stmtDelete.run(id);
}

/**
 * List all cron jobs for a guild (including global jobs with guild_id=null).
 */
export function listCronJobs(guildId) {
  return stmtList.all(guildId);
}

/**
 * Enable or disable a cron job.
 * @param {number} id
 * @param {boolean|number} enabled - true/1 to enable, false/0 to disable
 */
export function toggleCronJob(id, enabled) {
  return stmtToggle.run(enabled ? 1 : 0, id);
}

/**
 * Get all jobs that are due to run (next_run <= now and enabled=1).
 */
export function getDueJobs() {
  return stmtGetDue.all(nowISO());
}

/**
 * Mark a job as run: update last_run to now, recalculate next_run.
 */
export function markJobRun(id) {
  const job = stmtGetById.get(id);
  if (!job) return null;

  const now = nowISO();
  const nextRun = calculateNextRun(job.schedule_type, job.schedule_value);
  stmtMarkRun.run(now, nextRun, id);
  return { lastRun: now, nextRun };
}

/**
 * Get a single job by ID.
 */
export function getCronJob(id) {
  return stmtGetById.get(id);
}

/**
 * Activate a default job by assigning it a guild_id and channel_id.
 */
export function activateCronJob(id, guildId, channelId) {
  return stmtUpdateChannelGuild.run(guildId, channelId, id);
}

// ─── Seed Default Jobs ──────────────────────────
const DEFAULT_JOBS = [
  {
    name: 'morning_briefing',
    schedule_type: 'daily',
    schedule_value: '07:00',
    task_prompt: 'สรุปตารางวันนี้ เตือนนัดหมาย แนะนำ 3 สิ่งที่ควรทำวันนี้',
  },
  {
    name: 'evening_summary',
    schedule_type: 'daily',
    schedule_value: '18:00',
    task_prompt: 'สรุปสิ่งที่เกิดขึ้นวันนี้ ยอดขาย engagement ข่าวสำคัญ',
  },
  {
    name: 'weekly_report',
    schedule_type: 'weekly',
    schedule_value: 'monday 09:00',
    task_prompt: 'สรุปรายสัปดาห์ ความก้าวหน้า ปัญหา แผนสัปดาห์หน้า',
  },
  {
    name: 'health_reminder',
    schedule_type: 'daily',
    schedule_value: '12:00',
    task_prompt: 'เตือนพักสายตา ดื่มน้ำ ยืดเส้น ออกกำลังกาย',
  },
  {
    name: 'deep_scan',
    schedule_type: 'interval',
    schedule_value: '21600000',  // 6 hours
    task_prompt: 'Deep scan all specialist projects — read source code, find TODOs, analyze status',
  },
];

function seedDefaultJobs() {
  const count = stmtCountAll.get().count;
  if (count > 0) return; // Already has jobs, skip seeding

  const insertDefault = db.prepare(`
    INSERT INTO cron_jobs (guild_id, channel_id, user_id, name, schedule_type, schedule_value, task_prompt, enabled, next_run)
    VALUES (NULL, NULL, NULL, ?, ?, ?, ?, 1, ?)
  `);

  const seedAll = db.transaction(() => {
    for (const job of DEFAULT_JOBS) {
      const nextRun = calculateNextRun(job.schedule_type, job.schedule_value);
      insertDefault.run(job.name, job.schedule_type, job.schedule_value, job.task_prompt, nextRun);
    }
  });

  seedAll();
}

// Run seed on import
seedDefaultJobs();
