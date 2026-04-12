/**
 * 💎 Gemma Discord Bot v2 — EzBOQ AI Personal Assistant
 *
 * Features:
 * - Gemini API runtime (chat, tools, multimodal)
 * - SQLite persistent memory (conversations, user facts, notes, reminders)
 * - 27 function-calling tools (BOQ, agents, research, live catalog, self-upgrade)
 * - Per-server personality (interior/sales/personal assistant/dev/pet)
 * - 22 slash commands (/boq /research /meeting /debate /tournament /cron /secretary etc.)
 * - Secretary system with 4 specialists + deep project scanner
 * - Agent company (12 roles, parallel/pipeline/debate/tournament)
 * - Cron jobs (morning briefing, deep scan, health, evening, weekly)
 * - Self-learning from web search + RAG knowledge retrieval
 * - Multimodal image analysis
 * - Conversation summarization
 * - Output sanitization + auto-reminder checker
 *
 * Usage: npm start
 */

import { AttachmentBuilder, Client, GatewayIntentBits, Partials, ActivityType, REST, Routes, SlashCommandBuilder } from 'discord.js';

import { config } from './config.mjs';
import { identity, buildSystemPrompt, shouldDelegateToTeam } from './soul.mjs';
import { toolDefinitions, executeTool, executeToolAsync } from './tools.mjs';
import * as mem from './memory.mjs';
import { getSkillList, getSkillCount } from './skills.mjs';
import { searchKnowledgeBase } from './rag.mjs';
import { multiResearch, companyMeeting, getCompanyRoles, debate, tournament, chainOfAgents } from './agents.mjs';
import { addCronJob, listCronJobs, removeCronJob, toggleCronJob, getDueJobs, markJobRun, activateCronJob } from './cron.mjs';
import { getEvolutionScore, getEvolutionReport } from './evolution.mjs';
import { getBuiltinWorkflows, startWorkflow, executeStep, getWorkflowRun, seedBuiltinWorkflows } from './workflows.mjs';
import { getTrainingStats, harvestFeedback } from './training.mjs';
import {
  SPECIALISTS, generateBriefingData, formatMorningBriefing, formatDailyIdeas,
  proposeIdea, approveIdea, rejectIdea, getPendingIdeas, getIdeaByMessageId,
  assignTask, getAllPendingTasks, completeTask, getSecretaryStats, detectSpecialist,
  scanProject, buildSpecialistPrompt, getLatestScan,
} from './secretary.mjs';
import { runAgents } from './agents.mjs';
import { startTrace, logTool, logError, endTrace } from './logger.mjs';
import { guardResponse } from './guard.mjs';
import { buildFactBlock, resolveFacts } from './facts.mjs';
import { analyzeImageWithLlm, assertLlmConfigured, chatLlm, getLlmStatusSummary } from './llm.mjs';
import {
  createGoal, getActiveGoals, pauseGoal, resumeGoal, cancelGoal,
  clearOutstandingWork, getGoalProgress, generateProgressReport, getLatestPausedGoal, runAutonomyTick, getLoopStatus,
  decomposeGoal,
} from './autonomy.mjs';

// ─── Chat-busy flag (autonomy yields to chat) ──
globalThis._chatBusy = false;
globalThis._chatBusySince = 0;

function setChatBusy(isBusy) {
  globalThis._chatBusy = isBusy;
  globalThis._chatBusySince = isBusy ? Date.now() : 0;
}

const activeTypingLoops = new Map();
const latestExecutionSnapshots = new Map();

function startTypingLoop(channel, loopKey, {
  intervalMs = config.behavior.typingIntervalMs,
  maxDurationMs = 120000,
} = {}) {
  const existingStop = activeTypingLoops.get(loopKey);
  if (existingStop) existingStop();

  let stopped = false;
  const safeSendTyping = () => channel.sendTyping().catch(() => {});

  safeSendTyping();

  const intervalId = setInterval(safeSendTyping, intervalMs);
  const timeoutId = setTimeout(() => stop(), maxDurationMs);

  function stop() {
    if (stopped) return;
    stopped = true;
    clearInterval(intervalId);
    clearTimeout(timeoutId);
    if (activeTypingLoops.get(loopKey) === stop) {
      activeTypingLoops.delete(loopKey);
    }
  }

  activeTypingLoops.set(loopKey, stop);
  return stop;
}

// ─── Helpers ────────────────────────────────────
function splitMessage(text, limit = config.behavior.maxResponseLen) {
  if (text.length <= limit) return [text];
  const chunks = [];
  let rest = text;
  while (rest.length > 0) {
    if (rest.length <= limit) { chunks.push(rest); break; }
    // Try to split at last newline within limit
    let cut = rest.lastIndexOf('\n', limit);
    if (cut < limit * 0.3) cut = limit; // no good newline, hard cut
    chunks.push(rest.slice(0, cut));
    rest = rest.slice(cut).replace(/^\n/, '');
  }
  return chunks;
}

function chunkArray(items = [], size = 10) {
  const safeSize = Math.max(1, Number(size) || 1);
  const chunks = [];
  for (let index = 0; index < items.length; index += safeSize) {
    chunks.push(items.slice(index, index + safeSize));
  }
  return chunks;
}

function buildDiscordFiles(attachments = []) {
  return attachments
    .filter((item) => item?.absolutePath && item?.filename)
    .map((item) => new AttachmentBuilder(item.absolutePath, {
      name: item.filename,
      description: item.description,
    }));
}

function normalizeResponsePayload(response) {
  if (typeof response === 'string') {
    return { content: response, attachments: [] };
  }
  return {
    content: response?.content || '',
    attachments: Array.isArray(response?.attachments) ? response.attachments : [],
  };
}

async function sendMultipartResponse(sendFirst, sendFollowUp, text, attachments = [], {
  emptyText = 'ขอโทษค่ะ ไม่มีข้อความสำหรับส่ง',
  attachmentBatchSize = 10,
} = {}) {
  const chunks = splitMessage(sanitizeOutput(text || ''));
  const fileBatches = chunkArray(buildDiscordFiles(attachments), attachmentBatchSize);
  const totalMessages = Math.max(chunks.length, fileBatches.length, 1);

  for (let index = 0; index < totalMessages; index++) {
    const files = fileBatches[index] || [];
    let content = chunks[index] || '';

    if (!content && files.length > 0) {
      content = fileBatches.length > 1
        ? `แนบไฟล์ต่อชุดที่ ${index + 1}/${fileBatches.length} ให้แล้วค่ะ`
        : 'แนบไฟล์ให้แล้วค่ะ';
    }

    if (!content) {
      content = emptyText;
    }

    const payload = files.length > 0 ? { content, files } : { content };
    if (index === 0) {
      await sendFirst(payload);
    } else {
      await sendFollowUp(payload);
    }
  }
}

async function sendInteractionReply(interaction, text, attachments = []) {
  await sendMultipartResponse(
    (payload) => interaction.editReply(payload),
    (payload) => interaction.followUp(payload),
    text,
    attachments,
  );
}

async function sendChannelReply(channel, text, attachments = []) {
  await sendMultipartResponse(
    (payload) => channel.send(payload),
    (payload) => channel.send(payload),
    text,
    attachments,
  );
}

async function sendMessageReply(message, text, attachments = []) {
  await sendMultipartResponse(
    (payload) => message.reply(payload),
    (payload) => message.channel.send(payload),
    text,
    attachments,
  );
}

function isSelfStatusQuestion(text = '') {
  const normalized = String(text || '').trim();
  if (!normalized) return false;

  const asksAboutGemma = /เจมม่า|gemma|ตัวตน|ตัวเอง|เธอ|คุณ/.test(normalized);
  const asksAboutCapabilities = /ทำอะไรได้บ้าง|ความสามารถ|เข้าถึง|access|project|โครงการ|สถานะ|status|online|อธิบายตัวตน|รู้เรื่องอะไร/.test(normalized);

  return asksAboutGemma && asksAboutCapabilities;
}

function getReadableOwnFileCount() {
  const readOwnFileTool = toolDefinitions.find((tool) => tool?.function?.name === 'read_own_file');
  return readOwnFileTool?.function?.parameters?.properties?.filename?.enum?.length || 0;
}

function compactText(text = '', limit = 280) {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, limit);
}

function rememberLatestExecutionSnapshot(channelId, snapshot = {}) {
  const key = String(channelId || '').trim();
  if (!key) return;

  const previous = latestExecutionSnapshots.get(key) || {};
  latestExecutionSnapshots.set(key, {
    ...previous,
    ...snapshot,
    toolNames: Array.isArray(snapshot.toolNames) ? [...snapshot.toolNames] : (previous.toolNames || []),
    toolSummaries: Array.isArray(snapshot.toolSummaries) ? [...snapshot.toolSummaries] : (previous.toolSummaries || []),
    updatedAt: snapshot.updatedAt || Date.now(),
  });
}

function getLatestExecutionSnapshot(channelId) {
  const key = String(channelId || '').trim();
  if (!key) return null;
  return latestExecutionSnapshots.get(key) || null;
}

function formatBangkokDateTime(timestamp) {
  if (!timestamp) return '';
  try {
    return new Date(timestamp).toLocaleString('th-TH', {
      dateStyle: 'short',
      timeStyle: 'medium',
      timeZone: 'Asia/Bangkok',
    });
  } catch {
    return '';
  }
}

function normalizeToolSummary(summary = '') {
  return compactText(String(summary || '').replace(/\n+/g, ' | '), 320);
}

function buildSelfStatusReply(context = {}) {
  const llm = getLlmStatusSummary();
  const guildNames = Object.values(config.discord.guilds || {}).map((guild) => guild.name);
  const projectLines = Object.values(SPECIALISTS).map((spec) => {
    const pathLabel = spec.projectPath || 'not-configured';
    return `- ${spec.nameTh}: ${pathLabel}`;
  });
  const ownFileCount = getReadableOwnFileCount();
  const companyRoles = getCompanyRoles().length;

  const lines = [
    'ตอนนี้เจมม่าออนไลน์อยู่ค่ะ 💎 และข้อมูลชุดนี้เป็นสถานะจาก runtime จริง ไม่ได้เดาผ่านโมเดล',
    '',
    '**ตัวตน**',
    `- ชื่อ: ${identity.nameTh} (${identity.name})`,
    `- บทบาท: ${identity.role}`,
    `- Runtime: ${llm.provider} (${llm.model}${llm.fallbackModel ? ` → ${llm.fallbackModel}` : ''})`,
    `- ความจำ: SQLite ถาวร`,
    '',
    '**ทำอะไรได้บ้าง**',
    `- tools: ${toolDefinitions.length} ตัว`,
    `- skills: ${getSkillCount()} รายการ`,
    `- agent roles: ${companyRoles} ตำแหน่ง`,
    `- slash commands: ${slashCommands.length} คำสั่ง`,
    '- วิเคราะห์รูปภาพได้, ส่งไฟล์แนบได้, สร้าง material catalog หลายไฟล์ได้, เรียก agent company ได้',
    '',
    '**เข้าถึงอะไรได้จริง**',
    `- Discord runtime: DM บอส + ${guildNames.length} guild ที่ config ไว้ (${guildNames.join(', ')})`,
    `- อ่าน source ของตัวเองผ่าน \`read_own_file\` ได้ ${ownFileCount} ไฟล์`,
    '- อ่าน/ค้นไฟล์ใน project surface ที่อนุญาตได้ผ่าน `list_project_files`, `search_project_files`, `read_project_file`',
    '- สแกน surface ของโปรเจกต์ผ่าน secretary ได้ 4 สายหลัก:',
    ...projectLines,
    '- live material catalog: HomePro, DoHome, SCG HOME, Thai Watsadu',
    '',
    '**สถานะระบบตอนนี้**',
    '- คำถามแนวตัวตน/ความสามารถ/เข้าถึงอะไรได้ ตอบจาก runtime จริงโดยตรง ไม่ต้องผ่านโมเดล',
    '- งาน LLM มี retry/backoff หลายรอบข้าม model/key combo ก่อนค่อยยอมแพ้',
    '- ถ้ายังล้มจริง เจมม่าจะบอกสาเหตุตรงๆ เช่น 503 หรือ timeout ไม่ตอบกว้างๆ แบบเดิมแล้วค่ะ',
  ];

  if (context.guildName || context.channelName) {
    lines.splice(1, 0, `ตอนนี้ตอบอยู่ใน ${context.guildName || context.channelName || 'DM'} ค่ะ`);
  }

  return lines.join('\n');
}

function isLatestWorkStatusQuestion(text = '') {
  const normalized = String(text || '').trim();
  if (!normalized) return false;

  return /สรุปสถานะล่าสุด|สถานะล่าสุด|สรุปล่าสุด|คืบหน้า|progress|latest status|status ล่าสุด|งานถึงไหนแล้ว|ทำถึงไหนแล้ว|ถึงไหนแล้ว/i.test(normalized)
    || /^(เป็นไงบ้าง|เป็นไงมั่ง|อัปเดตล่าสุด|อัพเดตล่าสุด|สรุปสถานะ|สรุปหน่อย)$/i.test(normalized);
}

function findLastMeaningfulUserRequest(channelId, excludeQuery = '') {
  if (!channelId) return '';
  const excluded = compactText(excludeQuery, 500);
  const history = mem.getHistory(channelId, 16);
  const reversedUsers = history
    .filter((item) => item.role === 'user')
    .map((item) => compactText(item.content, 500))
    .reverse();

  return reversedUsers.find((item) =>
    item &&
    item !== excluded &&
    !isSelfStatusQuestion(item) &&
    !isLatestWorkStatusQuestion(item) &&
    !isContinuationCommand(item),
  ) || '';
}

function isContinuationCommand(text = '') {
  const normalized = String(text || '').trim();
  if (!normalized) return false;
  if (isSelfStatusQuestion(normalized) || isLatestWorkStatusQuestion(normalized)) return false;

  return /^(ต่อ|ต่อเลย|ทำต่อ|ทำต่อเลย|ทำต่อได้เลย|ทำต่อได้เลน|ทำต่อให้เสร็จ|ลุยต่อ|ไปต่อ|จัดการต่อ|เดินต่อ|continue|resume)$/i.test(normalized)
    || ((/ทำต่อ|continue|resume|เดินต่อ|ลุยต่อ|ไปต่อ|ให้เสร็จ/i.test(normalized)) && normalized.length <= 280);
}

function buildContinuationContext(channelId, currentText = '') {
  if (!isContinuationCommand(currentText)) return null;

  const snapshot = getLatestExecutionSnapshot(channelId);
  const baseRequest = (
    snapshot?.userQuery &&
    !isSelfStatusQuestion(snapshot.userQuery) &&
    !isLatestWorkStatusQuestion(snapshot.userQuery) &&
    !isContinuationCommand(snapshot.userQuery)
      ? snapshot.userQuery
      : ''
  ) || findLastMeaningfulUserRequest(channelId, currentText);

  if (!baseRequest && !snapshot) return null;

  const lines = [
    '# Continuation Directive',
    '- ผู้ใช้กำลังสั่งให้ทำงานเดิมต่อ ไม่ใช่ให้รายงานสถานะอย่างเดียว',
    '- ถ้ารอบก่อนมีผลจาก tool อยู่แล้ว ให้ใช้ผลนั้นต่อและสรุป actionable outcome กลับไปเลย',
  ];

  if (baseRequest) {
    lines.push(`- งานเดิมที่ต้องทำต่อ: ${compactText(baseRequest, 280)}`);
  }

  if (snapshot?.status === 'partial') {
    lines.push('- รอบก่อนทำงานได้บางส่วนแต่ข้อความสรุปสุดท้ายหลุด ห้ามตอบซ้ำเป็น status snapshot ถ้ายังสรุป actionable ได้');
  }

  if (Array.isArray(snapshot?.toolSummaries) && snapshot.toolSummaries.length > 0) {
    lines.push('- สิ่งที่ยืนยันได้จากรอบก่อน:');
    for (const summary of snapshot.toolSummaries.slice(0, 4)) {
      lines.push(`  - ${summary}`);
    }
  }

  return {
    baseRequest,
    effectiveUserMsg: baseRequest
      ? `${baseRequest}\n\n[คำสั่ง follow-up ล่าสุดจากผู้ใช้: ${currentText}]`
      : currentText,
    promptBlock: `\n\n${lines.join('\n')}`,
  };
}

function formatExecutionStatus(status = '') {
  switch (status) {
    case 'running': return 'กำลังรัน/กำลังประมวลผล';
    case 'completed': return 'ตอบกลับรอบล่าสุดสำเร็จ';
    case 'partial': return 'รันงานได้บางส่วน แต่ข้อความสรุปปลายทางหลุด';
    case 'error': return 'งานรอบล่าสุดสะดุด/ล้ม';
    default: return 'ยังไม่มีสถานะล่าสุดที่ยืนยันได้';
  }
}

function buildAutonomyStatusLines() {
  const activeGoals = getActiveGoals();
  const goal = activeGoals[0] || getLatestPausedGoal();
  if (!goal) return [];

  const progress = getGoalProgress(goal.id);
  const tasks = Array.isArray(progress?.tasks) ? progress.tasks : [];
  const done = tasks.filter((task) => task.status === 'done');
  const pending = tasks.filter((task) => task.status === 'pending');
  const failed = tasks.filter((task) => task.status === 'failed');
  const running = tasks.filter((task) => task.status === 'running');
  const blocked = tasks.filter((task) => task.status === 'blocked');
  const nextTasks = [...running, ...pending, ...blocked].slice(0, 3);

  const lines = [
    `- Goal #${goal.id}: ${goal.title} (${goal.status})`,
    `- ${done.length} done | ${pending.length} pending | ${failed.length} failed | ${running.length} running${blocked.length > 0 ? ` | ${blocked.length} blocked` : ''}`,
  ];

  if (typeof goal.iterations_used === 'number' && typeof goal.max_iterations === 'number') {
    lines.push(`- iterations: ${goal.iterations_used}/${goal.max_iterations}`);
  }

  for (const task of nextTasks) {
    lines.push(`- next [${task.role}] ${compactText(task.title, 90)} (${task.status})`);
  }

  return lines;
}

function buildSecretaryStatusLines() {
  const pendingTasks = getAllPendingTasks();
  if (!Array.isArray(pendingTasks) || pendingTasks.length === 0) return [];

  const lines = [`- secretary pending/in_progress ${pendingTasks.length} งาน`];
  for (const task of pendingTasks.slice(0, 4)) {
    const specialist = SPECIALISTS[task.specialist]?.nameTh || task.specialist;
    lines.push(`- ${specialist}: ${compactText(task.task, 90)} (${task.status})`);
  }
  return lines;
}

function buildLatestWorkStatusReply(context = {}, overrideSnapshot = null) {
  const snapshot = overrideSnapshot || getLatestExecutionSnapshot(context.channelId);
  const lastRequest = (
    snapshot?.userQuery &&
    !isSelfStatusQuestion(snapshot.userQuery) &&
    !isLatestWorkStatusQuestion(snapshot.userQuery)
      ? snapshot.userQuery
      : ''
  ) || findLastMeaningfulUserRequest(context.channelId, context.currentUserQuery);

  const lines = ['สถานะล่าสุดที่ยืนยันได้ตอนนี้ค่ะ'];

  if (lastRequest) {
    lines.push('', '**คำสั่งล่าสุด**');
    lines.push(`- ${compactText(lastRequest, 220)}`);
  }

  if (snapshot) {
    lines.push(`- สถานะ: ${formatExecutionStatus(snapshot.status)}`);
    if (snapshot.updatedAt) {
      lines.push(`- อัปเดตล่าสุด: ${formatBangkokDateTime(snapshot.updatedAt)}`);
    }
    if (Array.isArray(snapshot.toolNames) && snapshot.toolNames.length > 0) {
      lines.push(`- tools ที่เกี่ยวข้อง: ${snapshot.toolNames.join(', ')}`);
    }
    if (snapshot.attachmentsCount > 0) {
      lines.push(`- ไฟล์แนบจากรอบล่าสุด: ${snapshot.attachmentsCount} ไฟล์`);
    }
  }

  if (snapshot?.errorMessage) {
    lines.push(`- error ล่าสุด: ${compactText(snapshot.errorMessage, 180)}`);
  }

  if (Array.isArray(snapshot?.toolSummaries) && snapshot.toolSummaries.length > 0) {
    lines.push('', '**สิ่งที่ยืนยันได้จากรอบล่าสุด**');
    for (const summary of snapshot.toolSummaries.slice(0, 4)) {
      lines.push(`- ${summary}`);
    }
  } else if (snapshot?.replyPreview && snapshot.status !== 'running') {
    lines.push('', '**สรุปล่าสุดที่มี**');
    lines.push(snapshot.replyPreview);
  }

  const autonomyLines = buildAutonomyStatusLines();
  if (autonomyLines.length > 0) {
    lines.push('', '**Autonomy / Goal**');
    lines.push(...autonomyLines);
  }

  const secretaryLines = buildSecretaryStatusLines();
  if (secretaryLines.length > 0) {
    lines.push('', '**งานที่ assign ไว้**');
    lines.push(...secretaryLines);
  }

  if (snapshot?.status === 'partial') {
    lines.push('', 'รอบก่อนข้อความสรุปสุดท้ายของโมเดลหลุดจริง แต่สถานะด้านบนมาจาก state ที่อ่านได้ตอนนี้ ไม่ใช่ข้อความเดาค่ะ');
  }

  return lines.length > 1 ? lines.join('\n') : null;
}

function formatUserFacingError(err, { userQuery = '', context = {} } = {}) {
  const message = String(err?.message || '').trim();

  if (isSelfStatusQuestion(userQuery)) {
    return buildSelfStatusReply(context);
  }

  if (isLatestWorkStatusQuestion(userQuery)) {
    const directStatus = buildLatestWorkStatusReply({ ...context, currentUserQuery: userQuery });
    if (directStatus) return directStatus;
  }

  if (/503|UNAVAILABLE|high demand/i.test(message)) {
    const llm = getLlmStatusSummary();
    return `ขอโทษค่ะ รอบนี้ Gemini ฝั่ง runtime ตันจริง (${llm.model}${llm.fallbackModel ? ` → ${llm.fallbackModel}` : ''}) เลยตอบไม่จบค่ะ\nสาเหตุที่เจอมาคือ 503 / high demand ไม่ใช่เพราะข้อความคุณผิดนะคะ\nถ้าจะให้เจมม่าลองใหม่ ส่งคำสั่งเดิมซ้ำได้เลย หรือถ้าเป็นคำถามเชิงสถานะ/ความสามารถ เจมม่าจะตอบจาก runtime ตรงให้ได้ค่ะ`;
  }

  if (/aborted due to timeout|timed out|timeout/i.test(message)) {
    return 'ขอโทษค่ะ รอบนี้คำขอชน timeout ระหว่างประมวลผลจริงค่ะ ถ้าจะให้ลองใหม่ส่งคำสั่งเดิมซ้ำได้เลย หรือบีบ scope ให้แคบลงอีกนิดก็ได้ค่ะ';
  }

  return 'ขอโทษค่ะ งานเมื่อกี้สะดุดระหว่างประมวลผลจริง ถ้าจะให้ลองใหม่หรือให้เจมม่าสรุปจากข้อมูลที่มีตอนนี้ต่อ บอกได้เลยค่ะ';
}

function shouldAutoAssignSecretaryTask(text = '') {
  const normalized = String(text || '').trim();
  if (!normalized) return false;
  if (isSelfStatusQuestion(normalized) || isLatestWorkStatusQuestion(normalized) || isContinuationCommand(normalized)) {
    return false;
  }
  return /ช่วย|ทำ.*ให้|จัดการ|โพสต์|อัพเดท|เช็ค/.test(normalized);
}

// ─── LLM Runtime ────────────────────────────────
// Tier tuning controls Gemini generation settings by intent.
const TIER_OPTIONS = {
  standard:       { maxOutputTokens: 1536, temperature: 0.4 },
  creative_light: { maxOutputTokens: 2048, temperature: 0.7 },
  heavy:          { maxOutputTokens: 4096, temperature: 0.5 },
};

async function chatRuntime(messages, { useTools = true, timeout = config.llm.timeoutMs, tier = 'standard' } = {}) {
  const tierOpts = TIER_OPTIONS[tier] || TIER_OPTIONS.standard;
  return chatLlm(messages, {
    useTools,
    tools: toolDefinitions,
    temperature: tierOpts.temperature,
    maxOutputTokens: tierOpts.maxOutputTokens,
    timeoutMs: timeout,
  });
}

// ─── Image Analysis (Multimodal) ─────────────────
async function analyzeImage(imageUrl, prompt = 'วิเคราะห์รูปนี้ให้หน่อย') {
  try {
    const imagePrompt = `คุณคือ AI ผู้เชี่ยวชาญวิเคราะห์รูปภาพ ตอบภาษาไทย กระชับ ตรงประเด็น ถ้าเป็นรูปห้อง/interior ให้แนะนำ style วัสดุ สี layout ถ้าเป็นรูปสินค้าให้บอกรายละเอียดราคาประเมิน ถ้าเป็น screenshot ให้อ่านข้อความ\n\n${prompt}`;
    return await analyzeImageWithLlm(imageUrl, imagePrompt);
  } catch (err) {
    console.error('[IMAGE] Analysis failed:', err.message);
    return null;
  }
}

/** Summarize old messages into a compact context block */
function summarizeOldMessages(messages) {
  if (messages.length <= 4) return { summary: '', recent: messages };
  const cutoff = messages.length - 4;
  const old = messages.slice(0, cutoff);
  const recent = messages.slice(cutoff);

  const summaryLines = [];
  for (const m of old) {
    const who = m.role === 'user' ? 'User' : 'Gemma';
    const text = (m.content || '').slice(0, 80).replace(/\n/g, ' ');
    if (text) summaryLines.push(`${who}: ${text}`);
  }

  const summary = summaryLines.length > 0
    ? `\n\n# สรุปบทสนทนาก่อนหน้า\n${summaryLines.join('\n')}`
    : '';

  return { summary, recent };
}

function summarizeToolOutput(name, output) {
  if (name === 'spawn_agents' && output?.results) {
    const done = output.results.filter((item) => item.status === 'done').length;
    const errors = output.results.filter((item) => item.status !== 'done').length;
    const highlights = output.results
      .slice(0, 3)
      .map((item) => `- ${item.role}: ${item.result || item.status}`)
      .join('\n');

    return [
      `สั่งทีมเอเจ้นท์ทำงานต่อแล้วค่ะ (${done} สำเร็จ / ${errors} มีปัญหา)`,
      output.elapsed ? `ใช้เวลา ${output.elapsed}` : null,
      highlights || null,
    ].filter(Boolean).join('\n');
  }

  if (name === 'build_material_catalog' && output?.categories) {
    const providerLine = Array.isArray(output.providers) && output.providers.length > 0
      ? output.providers
        .map((provider) => `${provider.providerName || provider.provider}${provider.rows ? `=${provider.rows} แถว` : ''}`)
        .join(' | ')
      : (output.providerName || output.provider || 'source จริง');
    const categoryLines = output.categories
      .slice(0, 6)
      .map((category) => `- ${category.label}: ${category.rows} แถว`)
      .join('\n');

    return [
      `สร้าง catalog วัสดุจาก ${providerLine} แล้วค่ะ`,
      output.totalRows ? `รวม ${output.totalRows} แถวข้อมูล / ${output.files?.length || 0} ไฟล์` : null,
      categoryLines || null,
      Array.isArray(output.notes) && output.notes.length > 0 ? `หมายเหตุ: ${output.notes[0]}` : null,
    ].filter(Boolean).join('\n');
  }

  if (output?.status) return `${name}: ${output.status}`;
  if (output?.error) return `${name}: ${output.error}`;
  return `${name}: ${JSON.stringify(output).slice(0, 400)}`;
}

function buildToolFallbackReply(toolOutputs) {
  const summaries = toolOutputs
    .map((item) => summarizeToolOutput(item.name, item.output))
    .filter(Boolean);

  if (summaries.length === 0) {
    return 'งานถูกเริ่มให้แล้วค่ะ แต่การสรุปผลอัตโนมัติสะดุดนิดหน่อย ลองถามต่อได้เลยนะคะ';
  }

  return [
    'งานถูกรันต่อให้แล้วค่ะ แต่ขั้นสรุปผลอัตโนมัติสะดุด เจมม่าเลยรายงานสถานะดิบที่ได้ก่อนนะคะ',
    ...summaries,
  ].join('\n\n');
}

function listToolFiles(output) {
  const files = [];
  if (output?.file) files.push(output.file);
  if (Array.isArray(output?.files)) files.push(...output.files);
  return files.filter((file) => file?.absolutePath && file?.filename);
}

function extractToolAttachments(toolOutputs) {
  return toolOutputs.flatMap((item) => listToolFiles(item?.output));
}

function formatBytes(sizeBytes = 0) {
  if (!sizeBytes) return '0 B';
  if (sizeBytes < 1024) return `${sizeBytes} B`;
  const kb = sizeBytes / 1024;
  if (kb < 1024) return `${kb.toFixed(kb >= 10 ? 0 : 1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

function looksLikeTabularDump(text = '') {
  const cleaned = String(text || '')
    .replace(/^```[a-zA-Z]*\n?/, '')
    .replace(/\n?```$/, '')
    .trim();
  if (!cleaned) return false;

  const lines = cleaned.split('\n').filter((line) => line.trim());
  const tabularLines = lines.filter((line) => (line.includes(',') || line.includes('\t')) && line.length > 12);
  return tabularLines.length >= 3;
}

function buildMaterialCatalogReply(toolOutputs, modelContent = '') {
  const catalogRun = toolOutputs.find((item) => item?.name === 'build_material_catalog' && item?.output?.files?.length);
  if (!catalogRun) return null;

  const output = catalogRun.output;
  const providerLine = Array.isArray(output.providers) && output.providers.length > 0
    ? output.providers
      .map((provider) => `${provider.providerName || provider.provider}${provider.rows ? `=${provider.rows} แถว` : ''}`)
      .join(' | ')
    : (output.providerName || output.provider || 'live source');
  const lines = ['จัดชุด catalog ราคาวัสดุจาก source จริงให้แล้วค่ะ 💎'];
  lines.push(`แหล่งข้อมูล: ${providerLine}`);
  lines.push(`รวม ${output.totalRows || 0} แถวข้อมูล | ${output.totalCategories || output.categories?.length || 0} หมวด | ${output.files.length} ไฟล์`);

  if (Array.isArray(output.categories)) {
    for (const category of output.categories.slice(0, 8)) {
      lines.push(`- ${category.label}: ${category.rows} แถว`);
    }
  }

  if (Array.isArray(output.notes) && output.notes.length > 0) {
    lines.push(`หมายเหตุ: ${output.notes[0]}`);
  }

  lines.push('ในแต่ละแถวมี product_url และ search_url สำหรับย้อนกลับไปดู source จริงได้ค่ะ');
  lines.push('ไฟล์แนบมี master catalog, ไฟล์แยกตามหมวด, และ index สรุปจำนวนแถวต่อหมวด');

  const trimmedContent = String(modelContent || '').trim();
  if (trimmedContent && trimmedContent.length <= 500 && !looksLikeTabularDump(trimmedContent)) {
    lines.push(trimmedContent);
  }

  return lines.join('\n');
}

function buildCreateFileReply(toolOutputs, modelContent = '', userQuery = '') {
  const createdFiles = toolOutputs
    .filter((item) => item?.name === 'create_file' && item?.output?.file)
    .map((item) => ({ file: item.output.file, status: item.output.status }));

  if (createdFiles.length === 0) return null;
  const requestedFullDataset = /ฉบับเต็ม|ทั้งหมด|full|all|ครบ/i.test(String(userQuery || ''));

  const lines = ['จัดไฟล์ให้แล้วค่ะ 💎'];

  for (const { file, status } of createdFiles) {
    const formatLabel = file.actualFormat
      ? file.requestedFormat && file.requestedFormat !== file.actualFormat
        ? `${String(file.actualFormat).toUpperCase()} (แทน ${String(file.requestedFormat).toUpperCase()})`
        : String(file.actualFormat).toUpperCase()
      : 'FILE';
    const detailBits = [
      formatLabel,
      typeof file.dataRows === 'number' ? `${file.dataRows} แถวข้อมูล` : null,
      file.sizeBytes ? formatBytes(file.sizeBytes) : null,
    ].filter(Boolean);

    lines.push(`- \`${file.filename}\` | ${detailBits.join(' | ')}`);
    if (status && file.requestedFormat !== file.actualFormat) {
      lines.push(`  ${status}`);
    }
  }

  lines.push('เปิดไฟล์แนบใน Excel/Numbers ได้เลยค่ะ');
  if (requestedFullDataset) {
    lines.push('หมายเหตุ: ขนาดไฟล์และจำนวนแถวด้านบนคือสิ่งที่รวบรวมได้ในรอบนี้ตามไฟล์จริง ถ้าต้องการให้ขยายเพิ่มกว่านี้ สั่งต่อเป็นหมวดหรือจำนวนรายการได้เลยค่ะ');
  }

  const trimmedContent = String(modelContent || '').trim();
  if (trimmedContent && trimmedContent.length <= 500 && !looksLikeTabularDump(trimmedContent)) {
    lines.push(trimmedContent);
  } else {
    lines.push('ถ้าต้องการให้ขยายข้อมูลเพิ่มอีก บอกหมวดหรือจำนวนรายการที่อยากได้ต่อได้เลยค่ะ');
  }

  return lines.join('\n');
}

function hasStrongToolIntent(text = '') {
  return /ทำ|สร้าง|build|create|ดึง|fetch|search|ค้น|หา|คำนวณ|calculate|แปล|translate|ส่ง|แนบ|ไฟล์|csv|xlsx|excel|export|download|catalog|ฉบับเต็ม|หลายไฟล์|หลายหมวด|research|agent|ประชุม|meeting|debate|tournament|cron|scan|สแกน|วิเคราะห์|analyze|รูป|image|web/i.test(String(text || ''));
}

function isClarifyingQuestion(text = '') {
  return /ไหม|มั้ย|เหรอ|หรอ|หรือเปล่า|รึ|รึเปล่า|ใช่ไหม|ใช่มั้ย|\?|ปะ|ป่ะ|มีแค่|มีแต่|ใช้อยู่|ใช้อะไร|เท่านั้น/i.test(String(text || ''));
}

function shouldUseToolsForInitialPass(userText = '', requestTier = 'standard') {
  const text = String(userText || '');
  if (text.length < 80 && isClarifyingQuestion(text) && !hasStrongToolIntent(text)) {
    return false;
  }
  return true;
}

function looksLikeInternalToolLeak(text = '') {
  const normalized = String(text || '').trim();
  if (!normalized) return false;

  const mentionsToolName = /`?(build_material_catalog|create_file|web_search|web_fetch|get_material_price|spawn_agents)`?/i.test(normalized);
  const metaLanguage = /only use|usually,?\s*these tools|function|schema|directive|tool\b|tool call|function call|parameters?/i.test(normalized);
  const suspiciousFormatting = /[`()[\]]/.test(normalized) || /\.\.\./.test(normalized);

  return mentionsToolName && metaLanguage && suspiciousFormatting;
}

function looksAbruptlyCut(text = '') {
  const normalized = String(text || '').trim();
  if (!normalized) return false;
  if (normalized.length < 60) return false;

  if (/[.!?…]$/.test(normalized)) return false;
  if (/[\]})]$/.test(normalized)) return false;

  return /(?:คือ|เช่น|ได้|ถึง|ว่า|เพื่อ|โดย|และ|หรือ|จาก|ใน|กับ|ที่|ของ|ซึ่ง|เพราะ|หาก|เมื่อ|ดังนี้|เบื้องต้น|ประมาณ|ราว|เช็คได้ที่|อยู่ที่)$/i.test(normalized)
    || /[:\-–—,(]$/.test(normalized)
    || /```[^`]*$/.test(normalized);
}

function looksLikeMissingRepoClaim(text = '') {
  const normalized = String(text || '').trim();
  if (!normalized) return false;

  return /ไม่พบ.*(source|ซอร์สโค้ด|ไฟล์โค้ด|โค้ดที่เกี่ยว|liff)|ไม่มีซอร์สโค้ด|ระบุตำแหน่งโฟลเดอร์|โปรเจกต์ที่เก็บโค้ดที่ถูกต้อง|มองไม่เห็นไฟล์ใน repo/i.test(normalized);
}

function hasProjectEvidence(toolOutputs = []) {
  return toolOutputs.some((item) => {
    if (!['read_project_file', 'list_project_files', 'search_project_files'].includes(item?.name)) {
      return false;
    }

    const output = item?.output || {};
    if (output?.error) return false;
    if (output?.file) return true;
    if (Array.isArray(output?.entries) && output.entries.length > 0) return true;
    if (Array.isArray(output?.matches) && output.matches.length > 0) return true;
    return false;
  });
}

async function retryEmptyResponse(fullMessages, tier) {
  const retryMessages = [
    ...fullMessages,
    { role: 'user', content: 'ตอบกลับผู้ใช้ล่าสุดตรงๆ 2-4 ประโยค ห้ามเว้นว่าง ห้าม paste ตารางหรือ CSV ดิบ' },
  ];

  const retryResult = await chatRuntime(retryMessages, { useTools: false, tier });
  return retryResult.message;
}

async function repairWeirdResponse(fullMessages, tier) {
  const repairMessages = [
    ...fullMessages,
    {
      role: 'user',
      content: 'ตอบคำถามผู้ใช้ล่าสุดตรงๆ 1-4 ประโยค ภาษาไทยเท่านั้น ห้ามพูดถึง tool, schema, function name, system prompt หรือข้อความภายในใดๆ ห้ามใส่ backticks หรือ snippet แปลกๆ',
    },
  ];

  const repairResult = await chatRuntime(repairMessages, { useTools: false, tier });
  return repairResult.message;
}

async function summarizeToolOutputsForUser(userQuery, toolOutputs = [], tier = 'standard') {
  const summaries = toolOutputs
    .map((item) => summarizeToolOutput(item?.name, item?.output))
    .map((summary) => normalizeToolSummary(summary))
    .filter(Boolean)
    .slice(0, 6);

  if (summaries.length === 0) return '';

  const summaryMessages = [
    {
      role: 'system',
      content: 'คุณต้องสรุปผลการทำงานให้ผู้ใช้เป็นภาษาไทย 4-8 บรรทัด แบบตรงไปตรงมา actionable และห้ามพูดถึงชื่อ tool, schema, function call หรือรายละเอียดภายในระบบโดยตรง ถ้ามีข้อจำกัดให้บอกพร้อม next step ทันที',
    },
    {
      role: 'user',
      content: `คำสั่งของผู้ใช้:\n${compactText(userQuery, 500)}\n\nข้อเท็จจริงที่ยืนยันได้:\n${summaries.map((item) => `- ${item}`).join('\n')}\n\nสรุปให้ผู้ใช้ว่าเจออะไร ทำถึงไหนแล้ว และควรทำอะไรต่อทันที`,
    },
  ];

  const result = await chatRuntime(summaryMessages, {
    useTools: false,
    tier: tier === 'heavy' ? 'standard' : tier,
  });
  return result?.message?.content?.trim() || '';
}

async function rewriteAbruptReply(userQuery, draft, toolOutputs = [], tier = 'standard') {
  const summaries = toolOutputs
    .map((item) => summarizeToolOutput(item?.name, item?.output))
    .map((summary) => normalizeToolSummary(summary))
    .filter(Boolean)
    .slice(0, 6);

  const messages = [
    {
      role: 'system',
      content: 'คุณต้องเขียนคำตอบภาษาไทยให้จบสมบูรณ์ ชัดเจน ไม่ค้างกลางประโยค ห้ามพูดถึง tool, schema, function call หรือข้อความภายในระบบโดยตรง',
    },
    {
      role: 'user',
      content: [
        `คำสั่งผู้ใช้:\n${compactText(userQuery, 500)}`,
        draft ? `\nข้อความ draft ที่ค้าง:\n${draft}` : '',
        summaries.length > 0 ? `\nข้อเท็จจริงที่ยืนยันได้:\n${summaries.map((item) => `- ${item}`).join('\n')}` : '',
        '\nเขียนคำตอบใหม่ทั้งก้อนให้จบสมบูรณ์ 4-8 บรรทัด และถ้ามีข้อจำกัดให้บอกพร้อม next step',
      ].join('\n'),
    },
  ];

  const result = await chatRuntime(messages, {
    useTools: false,
    tier: tier === 'heavy' ? 'standard' : tier,
  });
  return result?.message?.content?.trim() || '';
}

async function rewriteProjectEvidenceReply(userQuery, draft, toolOutputs = [], tier = 'standard') {
  const summaries = toolOutputs
    .filter((item) => ['read_project_file', 'list_project_files', 'search_project_files'].includes(item?.name))
    .map((item) => summarizeToolOutput(item?.name, item?.output))
    .map((summary) => normalizeToolSummary(summary))
    .filter(Boolean)
    .slice(0, 6);

  if (summaries.length === 0) return '';

  const messages = [
    {
      role: 'system',
      content: 'คุณต้องเขียนคำตอบภาษาไทยใหม่โดยยึดหลักฐานจาก project tools เป็นหลัก ถ้ามีไฟล์/path จริง ห้ามพูดว่าไม่พบ source หรือขอให้ผู้ใช้ช่วยหาโฟลเดอร์ ให้สรุปว่าพบอะไรแล้ว กำลังติดตรงไหน และ next step คืออะไร',
    },
    {
      role: 'user',
      content: [
        `คำสั่งผู้ใช้:\n${compactText(userQuery, 500)}`,
        draft ? `\nข้อความ draft ที่ผิดทิศ:\n${draft}` : '',
        `\nหลักฐานจาก repo ที่ยืนยันได้:\n${summaries.map((item) => `- ${item}`).join('\n')}`,
        '\nเขียนคำตอบใหม่ 4-8 บรรทัด โดยอ้างอิงหลักฐานพวกนี้และเดินหน้าวิเคราะห์ต่อ',
      ].join('\n'),
    },
  ];

  const result = await chatRuntime(messages, {
    useTools: false,
    tier: tier === 'heavy' ? 'standard' : tier,
  });
  return result?.message?.content?.trim() || '';
}

async function continueTrimmedResponse(fullMessages, response, tier) {
  const initialContent = response?.content?.trim() || '';
  if ((!response?._finishReason || response._finishReason !== 'MAX_TOKENS') && !looksAbruptlyCut(initialContent)) {
    return response;
  }

  let current = response;
  let combined = initialContent;
  let attempts = 0;

  while ((current?._finishReason === 'MAX_TOKENS' || looksAbruptlyCut(combined)) && attempts < 2) {
    attempts++;
    fullMessages.push(current);
    fullMessages.push({
      role: 'user',
      content: looksAbruptlyCut(combined)
        ? 'ข้อความก่อนหน้าจบค้างกลางประโยค ให้เขียนใหม่หรือเขียนต่อให้จบสมบูรณ์ 3-8 ประโยค ห้ามเกริ่นใหม่ ห้ามตัดค้าง'
        : 'ตอบต่อจากข้อความก่อนหน้าทันที ห้ามเกริ่นใหม่ ห้ามทวนต้นเรื่อง ถ้ายังมีรายการหรือหัวข้อค้าง ให้เขียนต่อให้ครบ',
    });

    const nextResult = await chatRuntime(fullMessages, { useTools: false, tier });
    const nextResponse = nextResult.message;
    const nextContent = nextResponse?.content?.trim();
    if (!nextContent) break;

    combined = [combined, nextContent].filter(Boolean).join('\n');
    current = nextResponse;
  }

  return {
    ...current,
    content: combined,
  };
}

async function generateResponse(messages, context) {
  const trace = startTrace({
    userId: context.userId,
    userName: context.userName,
    channelId: context.channelId,
    guildId: context.guildId,
    source: 'message',
  });

  let lastUserMsg = '';
  try {
    lastUserMsg = messages.filter(m => m.role === 'user').pop()?.content || '';
    const continuation = buildContinuationContext(context.channelId, lastUserMsg);
    const effectiveUserMsg = continuation?.effectiveUserMsg || lastUserMsg;
    trace.input = effectiveUserMsg.slice(0, 100);

    if (isSelfStatusQuestion(lastUserMsg)) {
      const directReply = buildSelfStatusReply(context);
      endTrace(trace, directReply);
      return { content: directReply, attachments: [] };
    }

    if (isLatestWorkStatusQuestion(lastUserMsg)) {
      const directReply = buildLatestWorkStatusReply({ ...context, currentUserQuery: lastUserMsg });
      if (directReply) {
        endTrace(trace, directReply);
        return { content: directReply, attachments: [] };
      }
    }

    rememberLatestExecutionSnapshot(context.channelId, {
      userQuery: lastUserMsg,
      status: 'running',
      updatedAt: Date.now(),
      toolNames: [],
      toolSummaries: [],
      attachmentsCount: 0,
      errorMessage: '',
      replyPreview: '',
    });

    const systemPrompt = buildSystemPrompt(context);

    // Inject user facts if available
    const userFacts = context.userId ? mem.getUserFacts(context.userId) : [];
    trace.factsInjected = userFacts.length;
    const factsBlock = userFacts.length > 0
      ? `\n\n# ข้อมูลผู้ใช้คนนี้\n${userFacts.map(f => `- ${f}`).join('\n')}`
      : '';

    // Inject learned knowledge
    const recentKnowledge = mem.getRecentKnowledge();
    trace.knowledgeInjected = recentKnowledge.length;
    const knowledgeBlock = recentKnowledge.length > 0
      ? `\n\n# ความรู้ที่เรียนรู้มา\n${recentKnowledge.slice(0, 5).map(k => `- **${k.topic}:** ${k.content.slice(0, 200)}`).join('\n')}`
      : '';

    // RAG: search knowledge base for relevant context (with confidence threshold)
    const ragResults = effectiveUserMsg.length > 3 ? searchKnowledgeBase(effectiveUserMsg, null, 2) : [];
    trace.ragHits = ragResults.length;
    const ragBlock = ragResults.length > 0
      ? `\n\n# ข้อมูลอ้างอิงจาก Knowledge Base (ใช้ข้อมูลนี้ตอบเป็นหลัก)\n${ragResults.map(r => `## ${r.title}\n${r.content.slice(0, 800)}`).join('\n\n')}`
      : '';

    // Truth Source: inject verified facts relevant to user's question
    const truthBlock = buildFactBlock(effectiveUserMsg);
    const resolved = resolveFacts(effectiveUserMsg);
    const wantsMaterialCatalog = /ฉบับเต็ม|ทั้งหมด|full|catalog|หลายไฟล์|หลายหมวด|source จริง|แหล่งจริง|live source|ราคาจริง/i.test(effectiveUserMsg)
      && /วัสดุ|material|ราคา|ปูน|กระเบื้อง|สี|หลังคา|ประตู|หน้าต่าง|สุขภัณฑ์|ท่อ|สายไฟ/i.test(effectiveUserMsg);
    const wantsFileExport = /csv|xlsx|excel|export|download|แนบไฟล์|ส่งไฟล์|เป็นไฟล์|ไฟล์ให้หน่อย|ไฟล์หน่อย/i.test(effectiveUserMsg);
    const materialCatalogBlock = wantsMaterialCatalog
      ? '\n\n# Material Catalog Directive\nถ้าผู้ใช้ขอ catalog วัสดุฉบับเต็ม/หลายหมวด/หลายไฟล์/ดึงราคาจาก source จริง ให้เรียก build_material_catalog ก่อน ห้ามแต่งรายการหรือราคาเอง และห้ามเคลมว่า full ถ้ายังไม่ได้อ่านผล tool จริง'
      : '';
    const fileExportBlock = wantsFileExport
      ? '\n\n# File Export Directive\nถ้าผู้ใช้ต้องการไฟล์แนบหรือไฟล์สำหรับเปิดใน Excel ให้เรียก create_file ทันที ห้ามตอบว่าไม่มี tool โดยไม่ลองใช้ก่อน ถ้าถูกขอ XLSX ให้ส่งเป็น CSV ที่เปิดใน Excel ได้และอธิบายตรงๆ'
      : '';
    trace.factsResolved = resolved.matched.length;
    trace.dodChecked = resolved.dodNeeded;
    trace.creativeNeeded = resolved.creativeNeeded;
    trace.creativeTier = resolved.creativeTier || null;
    trace.creativeModeUsed = resolved.creativeNeeded && !resolved.dodNeeded;
    trace.requestTier = resolved.requestTier;

    // Summarize old messages to save context window
    const { summary: historySummary, recent: recentMessages } = summarizeOldMessages(messages);

    const systemContent = systemPrompt + (continuation?.promptBlock || '') + truthBlock + materialCatalogBlock + fileExportBlock + factsBlock + knowledgeBlock + ragBlock + historySummary;

    const recentMessagesForModel = continuation
      ? recentMessages.map((message, index) => (
        index === recentMessages.length - 1 && message.role === 'user'
          ? { ...message, content: effectiveUserMsg }
          : message
      ))
      : recentMessages;

    const fullMessages = [
      { role: 'system', content: systemContent },
      ...recentMessagesForModel,
    ];

    const initialUseTools = shouldUseToolsForInitialPass(effectiveUserMsg, resolved.requestTier);
    let result = await chatRuntime(fullMessages, { tier: resolved.requestTier, useTools: initialUseTools });
    let response = result.message;

    // Handle tool calls (max 3 rounds) — supports async tools (web_search, web_fetch)
    let rounds = 0;
    const latestToolOutputs = [];
    while (response?.tool_calls?.length > 0 && rounds < 3) {
      rounds++;
      fullMessages.push(response);
      for (const call of response.tool_calls) {
        const toolStart = Date.now();
        let toolSuccess = true;
        let toolError = null;
        try {
          const toolResult = await executeToolAsync(call.function.name, call.function.arguments);
          latestToolOutputs.push({ name: call.function.name, output: toolResult });
          fullMessages.push({ role: 'tool', name: call.function.name, content: JSON.stringify(toolResult, null, 2) });
        } catch (err) {
          toolSuccess = false;
          toolError = err.message;
          const toolResult = { error: err.message };
          latestToolOutputs.push({ name: call.function.name, output: toolResult });
          fullMessages.push({ role: 'tool', name: call.function.name, content: JSON.stringify(toolResult) });
        }
        logTool(trace, call.function.name, call.function.arguments, Date.now() - toolStart, toolSuccess, toolError);
      }
      try {
        result = await chatRuntime(fullMessages, { useTools: false, tier: resolved.requestTier });
        response = result.message;
      } catch (err) {
        if (latestToolOutputs.length > 0) {
          const toolNames = [...new Set(latestToolOutputs.map((item) => item?.name).filter(Boolean))];
          const toolSummaries = latestToolOutputs
            .map((item) => normalizeToolSummary(summarizeToolOutput(item.name, item.output)))
            .filter(Boolean);
          const snapshot = {
            userQuery: lastUserMsg,
            status: 'partial',
            updatedAt: Date.now(),
            toolNames,
            toolSummaries,
            attachmentsCount: extractToolAttachments(latestToolOutputs).length,
            replyPreview: compactText(buildToolFallbackReply(latestToolOutputs), 320),
            errorMessage: err.message || '',
          };
          rememberLatestExecutionSnapshot(context.channelId, snapshot);
          const fallback = isLatestWorkStatusQuestion(lastUserMsg)
            ? (buildLatestWorkStatusReply(
                { ...context, currentUserQuery: lastUserMsg },
                snapshot,
              ) || buildToolFallbackReply(latestToolOutputs))
            : buildToolFallbackReply(latestToolOutputs);
          endTrace(trace, fallback);
          return { content: fallback, attachments: extractToolAttachments(latestToolOutputs) };
        }
        throw err;
      }
    }
    trace.toolRounds = rounds;
    response = await continueTrimmedResponse(fullMessages, response, resolved.requestTier);
    const attachments = extractToolAttachments(latestToolOutputs);
    const toolNames = [...new Set(latestToolOutputs.map((item) => item?.name).filter(Boolean))];
    const toolSummaries = latestToolOutputs
      .map((item) => normalizeToolSummary(summarizeToolOutput(item.name, item.output)))
      .filter(Boolean);
    const catalogReply = buildMaterialCatalogReply(latestToolOutputs, response?.content || '');
    const createFileReply = buildCreateFileReply(latestToolOutputs, response?.content || '', lastUserMsg);
    if (!catalogReply && !createFileReply && !response?.tool_calls?.length && looksLikeInternalToolLeak(response?.content || '')) {
      try {
        response = await repairWeirdResponse(fullMessages, resolved.requestTier);
      } catch { /* keep original response below if repair fails */ }
    }
    if (!response?.content?.trim() && !response?.tool_calls?.length && !catalogReply && !createFileReply) {
      try {
        response = await retryEmptyResponse(fullMessages, resolved.requestTier);
      } catch { /* keep fallback below */ }
    }
    if (!response?.content?.trim() && toolSummaries.length > 0 && !catalogReply && !createFileReply && !isLatestWorkStatusQuestion(lastUserMsg)) {
      try {
        const summarized = await summarizeToolOutputsForUser(
          continuation?.baseRequest || effectiveUserMsg,
          latestToolOutputs,
          resolved.requestTier,
        );
        if (summarized) {
          response = { ...response, content: summarized };
        }
      } catch { /* keep fallback below */ }
    }

    const fallbackSnapshot = {
      userQuery: lastUserMsg,
      status: 'partial',
      updatedAt: Date.now(),
      toolNames,
      toolSummaries,
      attachmentsCount: attachments.length,
      replyPreview: compactText(buildToolFallbackReply(latestToolOutputs), 320),
      errorMessage: '',
    };
    let rawContent = catalogReply || createFileReply || response?.content?.trim() || (
      rounds > 0
        ? (
          isLatestWorkStatusQuestion(lastUserMsg)
            ? (buildLatestWorkStatusReply(
                { ...context, currentUserQuery: lastUserMsg },
                fallbackSnapshot,
              ) || buildToolFallbackReply(latestToolOutputs))
            : (
              attachments.length > 0
                ? 'จัดไฟล์ให้แล้วค่ะ แนบไว้กับข้อความนี้แล้ว ถ้าต้องการให้เจมม่าสรุปเนื้อหาในไฟล์เพิ่ม บอกได้เลยค่ะ'
                : buildToolFallbackReply(latestToolOutputs)
            )
        )
        : 'ขอโทษค่ะ ข้อความตอบกลับหลุดระหว่างประมวลผล ลองส่งอีกครั้งได้เลยค่ะ'
    );

    if (looksLikeMissingRepoClaim(rawContent) && hasProjectEvidence(latestToolOutputs)) {
      try {
        const repaired = await rewriteProjectEvidenceReply(
          continuation?.baseRequest || effectiveUserMsg,
          rawContent,
          latestToolOutputs,
          resolved.requestTier,
        );
        if (repaired) {
          rawContent = repaired;
        }
      } catch { /* keep original content if rewrite fails */ }
    }

    if (looksAbruptlyCut(rawContent) && !isLatestWorkStatusQuestion(lastUserMsg)) {
      try {
        const repaired = await rewriteAbruptReply(
          continuation?.baseRequest || effectiveUserMsg,
          rawContent,
          latestToolOutputs,
          resolved.requestTier,
        );
        if (repaired) {
          rawContent = repaired;
        }
      } catch { /* keep original content if rewrite fails */ }
    }

    // Critical Fact Guard — rewrite hallucinations before sending
    const userQuery = messages.filter(m => m.role === 'user').pop()?.content || '';
    const { clean: content, violations, rewritten } = guardResponse(rawContent, userQuery);
    if (violations.length > 0) {
      trace.guardViolations = violations.map(v => v.key);
    }

    rememberLatestExecutionSnapshot(context.channelId, {
      userQuery: lastUserMsg,
      status: (!response?.content?.trim() && rounds > 0 && !catalogReply && !createFileReply) ? 'partial' : 'completed',
      updatedAt: Date.now(),
      toolNames,
      toolSummaries,
      attachmentsCount: attachments.length,
      errorMessage: '',
      replyPreview: compactText(content, 320),
      rewritten,
    });

    endTrace(trace, content);
    return { content, attachments };
  } catch (err) {
    rememberLatestExecutionSnapshot(context.channelId, {
      userQuery: lastUserMsg,
      status: 'error',
      updatedAt: Date.now(),
      errorMessage: err.message || String(err),
    });
    logError(trace, 'generateResponse', err);
    endTrace(trace, '');
    throw err;
  }
}

// ─── Output Sanitization ────────────────────────
function sanitizeOutput(text) {
  return text
    .replace(/@everyone/g, '@\u200Beveryone')
    .replace(/@here/g, '@\u200Bhere')
    .replace(/discord\.gg\/\S+/gi, '[link removed]')
    .replace(/(sk-[a-zA-Z0-9]{20,})/g, '[key redacted]')
    .replace(/(MTQ\w{50,})/g, '[token redacted]')
    .replace(/(ghp_\w{30,})/g, '[token redacted]')
    // Force female identity — replace ครับ→ค่ะ, ผม→เจมม่า, ฉัน→เจมม่า
    .replace(/ค่ะ\/ครับ|ครับ\/ค่ะ|คะ\/ครับ|ครับ\/คะ/g, 'ค่ะ')
    .replace(/ฉัน\/ผม|ผม\/ฉัน/g, 'เจมม่า')
    .replace(/(?<=[ก-๙\s])ครับ(?=[\s\n.,!?😊✨💎🥺]|$)/g, 'ค่ะ');
}

// ─── Cooldowns ──────────────────────────────────
const cooldowns = new Map();
function isOnCooldown(userId) {
  const last = cooldowns.get(userId);
  if (!last) return false;
  return (Date.now() - last) < config.behavior.cooldownMs;
}

// ─── Slash Commands ─────────────────────────────
const slashCommands = [
  new SlashCommandBuilder()
    .setName('boq')
    .setDescription('คำนวณราคางาน BOQ')
    .addNumberOption(o => o.setName('area').setDescription('พื้นที่ (ตร.ม.)').setRequired(true))
    .addStringOption(o => o.setName('type').setDescription('ประเภทงาน')
      .addChoices(
        { name: 'รีโนเวชั่น', value: 'renovation' },
        { name: 'สร้างใหม่', value: 'new_build' },
        { name: 'ตกแต่งภายใน', value: 'interior' },
        { name: 'บิลท์อิน', value: 'built_in' },
      ).setRequired(true))
    .addStringOption(o => o.setName('tier').setDescription('ระดับวัสดุ')
      .addChoices(
        { name: 'ประหยัด', value: 'value' },
        { name: 'มาตรฐาน', value: 'standard' },
        { name: 'พรีเมียม', value: 'premium' },
      )),

  new SlashCommandBuilder()
    .setName('material')
    .setDescription('ดูราคาวัสดุก่อสร้าง')
    .addStringOption(o => o.setName('name').setDescription('ชื่อวัสดุ เช่น ปูนซีเมนต์, กระเบื้อง').setRequired(true)),

  new SlashCommandBuilder()
    .setName('convert')
    .setDescription('แปลงหน่วย')
    .addNumberOption(o => o.setName('value').setDescription('ค่า').setRequired(true))
    .addStringOption(o => o.setName('from').setDescription('จากหน่วย').setRequired(true))
    .addStringOption(o => o.setName('to').setDescription('เป็นหน่วย').setRequired(true)),

  new SlashCommandBuilder()
    .setName('plan')
    .setDescription('ดูแพ็กเกจ EzBOQ')
    .addStringOption(o => o.setName('id').setDescription('แพ็กเกจ')
      .addChoices(
        { name: 'ทั้งหมด', value: 'all' },
        { name: 'Free', value: 'free' },
        { name: 'Pro', value: 'solo' },
        { name: 'Business', value: 'team' },
      )),

  new SlashCommandBuilder()
    .setName('note')
    .setDescription('บันทึกโน้ต')
    .addSubcommand(sub => sub.setName('add').setDescription('เพิ่มโน้ต')
      .addStringOption(o => o.setName('content').setDescription('เนื้อหา').setRequired(true))
      .addStringOption(o => o.setName('title').setDescription('หัวข้อ'))
      .addStringOption(o => o.setName('tags').setDescription('แท็ก (คั่นด้วย ,)')))
    .addSubcommand(sub => sub.setName('list').setDescription('ดูโน้ตทั้งหมด'))
    .addSubcommand(sub => sub.setName('search').setDescription('ค้นหาโน้ต')
      .addStringOption(o => o.setName('query').setDescription('คำค้น').setRequired(true)))
    .addSubcommand(sub => sub.setName('delete').setDescription('ลบโน้ต')
      .addIntegerOption(o => o.setName('id').setDescription('ID โน้ต').setRequired(true))),

  new SlashCommandBuilder()
    .setName('remind')
    .setDescription('ตั้งเตือน')
    .addStringOption(o => o.setName('message').setDescription('ข้อความเตือน').setRequired(true))
    .addStringOption(o => o.setName('when').setDescription('เมื่อไหร่ เช่น "30m" "2h" "tomorrow 9am"').setRequired(true)),

  new SlashCommandBuilder()
    .setName('room')
    .setDescription('ประเมินราคาตกแต่งห้อง')
    .addStringOption(o => o.setName('type').setDescription('ประเภทห้อง')
      .addChoices(
        { name: 'ห้องนอน', value: 'bedroom' },
        { name: 'ห้องน้ำ', value: 'bathroom' },
        { name: 'ห้องครัว', value: 'kitchen' },
        { name: 'ห้องนั่งเล่น', value: 'living' },
        { name: 'ห้องทำงาน', value: 'office' },
        { name: 'Walk-in Closet', value: 'closet' },
      ).setRequired(true))
    .addNumberOption(o => o.setName('area').setDescription('พื้นที่ (ตร.ม.)').setRequired(true))
    .addStringOption(o => o.setName('style').setDescription('สไตล์')
      .addChoices(
        { name: 'Minimal', value: 'minimal' },
        { name: 'Japanese', value: 'japanese' },
        { name: 'Industrial', value: 'industrial' },
        { name: 'Scandinavian', value: 'scandinavian' },
        { name: 'Luxury', value: 'luxury' },
        { name: 'Tropical', value: 'tropical' },
      )),

  new SlashCommandBuilder()
    .setName('skill')
    .setDescription('ดูความสามารถทั้งหมดของเจมม่า'),

  new SlashCommandBuilder()
    .setName('learn')
    .setDescription('สอนเจมม่าให้จำข้อมูลเกี่ยวกับคุณ')
    .addStringOption(o => o.setName('fact').setDescription('ข้อมูลที่อยากให้จำ เช่น "ชื่อจริง สมชาย"').setRequired(true)),

  new SlashCommandBuilder()
    .setName('forget')
    .setDescription('ให้เจมม่าลืมข้อมูลบางอย่าง')
    .addStringOption(o => o.setName('keyword').setDescription('คำที่อยู่ในข้อมูลที่จะลบ').setRequired(true)),

  new SlashCommandBuilder()
    .setName('myfacts')
    .setDescription('ดูข้อมูลที่เจมม่าจำเกี่ยวกับคุณ'),

  new SlashCommandBuilder()
    .setName('research')
    .setDescription('ส่งทีมเอเจ้นท์วิจัยหัวข้อจาก 4 มุมมอง')
    .addStringOption(o => o.setName('topic').setDescription('หัวข้อที่ต้องการวิจัย').setRequired(true)),

  new SlashCommandBuilder()
    .setName('meeting')
    .setDescription('ประชุมบริษัทเจมม่า 10 ผู้บริหารถกประเด็น')
    .addStringOption(o => o.setName('agenda').setDescription('วาระประชุม').setRequired(true)),

  new SlashCommandBuilder()
    .setName('debate')
    .setDescription('โต้วาที 2 ฝ่าย + กรรมการตัดสิน')
    .addStringOption(o => o.setName('topic').setDescription('ประเด็น เช่น "SPC หรือ Laminate?"').setRequired(true)),

  new SlashCommandBuilder()
    .setName('tournament')
    .setDescription('แข่งขัน 5 agents ตอบคำถามเดียวกัน เลือก best answer')
    .addStringOption(o => o.setName('question').setDescription('คำถามที่ต้องการคำตอบคุณภาพสูง').setRequired(true))
    .addIntegerOption(o => o.setName('contestants').setDescription('จำนวนผู้แข่ง (default: 5)')),

  new SlashCommandBuilder()
    .setName('cron')
    .setDescription('ตั้งเวลาทำงานอัตโนมัติ')
    .addSubcommand(sub => sub.setName('add').setDescription('เพิ่มงาน cron')
      .addStringOption(o => o.setName('name').setDescription('ชื่องาน').setRequired(true))
      .addStringOption(o => o.setName('type').setDescription('ประเภท')
        .addChoices(
          { name: 'ทุกวัน (daily)', value: 'daily' },
          { name: 'ทุกสัปดาห์ (weekly)', value: 'weekly' },
          { name: 'ทุก X ชม. (interval)', value: 'interval' },
        ).setRequired(true))
      .addStringOption(o => o.setName('schedule').setDescription('เวลา เช่น "07:00" หรือ "monday 09:00" หรือ "3600000"').setRequired(true))
      .addStringOption(o => o.setName('task').setDescription('คำสั่งให้ Gemma ทำ').setRequired(true)))
    .addSubcommand(sub => sub.setName('list').setDescription('ดูงาน cron ทั้งหมด'))
    .addSubcommand(sub => sub.setName('remove').setDescription('ลบงาน cron')
      .addIntegerOption(o => o.setName('id').setDescription('ID งาน').setRequired(true)))
    .addSubcommand(sub => sub.setName('toggle').setDescription('เปิด/ปิดงาน cron')
      .addIntegerOption(o => o.setName('id').setDescription('ID งาน').setRequired(true))),

  new SlashCommandBuilder()
    .setName('assign')
    .setDescription('สั่งงานให้ผู้เชี่ยวชาญ')
    .addStringOption(o => o.setName('specialist').setDescription('ผู้เชี่ยวชาญ')
      .addChoices(
        { name: '🏗️ EzBOQ Expert', value: 'ezboq' },
        { name: '🎮 Game Expert', value: 'game' },
        { name: '🏠 Vanavard Manager', value: 'vanavard' },
        { name: '🐾 Pet Manager', value: 'pet' },
      ).setRequired(true))
    .addStringOption(o => o.setName('task').setDescription('งานที่ต้องทำ').setRequired(true))
    .addStringOption(o => o.setName('priority').setDescription('ความสำคัญ')
      .addChoices(
        { name: '🔴 สูง', value: 'high' },
        { name: '🟡 ปกติ', value: 'medium' },
        { name: '🟢 ต่ำ', value: 'low' },
      )),

  new SlashCommandBuilder()
    .setName('secretary')
    .setDescription('ดูสถานะทีมเลขา + งานค้าง + ไอเดีย'),

  new SlashCommandBuilder()
    .setName('briefing')
    .setDescription('เรียก morning briefing ตอนนี้เลย'),

  new SlashCommandBuilder()
    .setName('evolve')
    .setDescription('ดูสถานะวิวัฒนาการ prompt ของเจมม่า'),

  new SlashCommandBuilder()
    .setName('train')
    .setDescription('ดูสถานะ training data'),

  new SlashCommandBuilder()
    .setName('todo')
    .setDescription('จัดการ Todo List')
    .addSubcommand(sub => sub.setName('add').setDescription('เพิ่มงาน')
      .addStringOption(o => o.setName('task').setDescription('งานที่ต้องทำ').setRequired(true))
      .addStringOption(o => o.setName('priority').setDescription('ความสำคัญ')
        .addChoices(
          { name: '🔴 สูง', value: 'high' },
          { name: '🟡 ปกติ', value: 'medium' },
          { name: '🟢 ต่ำ', value: 'low' },
        ))
      .addStringOption(o => o.setName('due').setDescription('กำหนด เช่น "tomorrow" "2d" "2026-04-10"')))
    .addSubcommand(sub => sub.setName('list').setDescription('ดูงานค้าง'))
    .addSubcommand(sub => sub.setName('done').setDescription('เสร็จแล้ว')
      .addIntegerOption(o => o.setName('id').setDescription('ID งาน').setRequired(true)))
    .addSubcommand(sub => sub.setName('delete').setDescription('ลบงาน')
      .addIntegerOption(o => o.setName('id').setDescription('ID งาน').setRequired(true))),

  new SlashCommandBuilder()
    .setName('autonomy')
    .setDescription('🤖 BabyGemma — Autonomous self-improvement loop')
    .addSubcommand(sub => sub.setName('start').setDescription('ตั้งเป้าหมายใหม่ ให้เจมม่าลุยเอง')
      .addStringOption(o => o.setName('goal').setDescription('เป้าหมาย').setRequired(true))
      .addStringOption(o => o.setName('description').setDescription('รายละเอียดเพิ่มเติม'))
      .addStringOption(o => o.setName('type').setDescription('ประเภท')
        .addChoices(
          { name: '🏗️ Project', value: 'project' },
          { name: '🔬 Research', value: 'research' },
          { name: '📈 Improvement', value: 'improvement' },
          { name: '📝 Content', value: 'content' },
        ))
      .addIntegerOption(o => o.setName('max').setDescription('จำนวนรอบสูงสุด (default: 50)')))
    .addSubcommand(sub => sub.setName('status').setDescription('ดูสถานะ loop'))
    .addSubcommand(sub => sub.setName('report').setDescription('สร้างรายงาน')
      .addIntegerOption(o => o.setName('goal_id').setDescription('Goal ID')))
    .addSubcommand(sub => sub.setName('pause').setDescription('หยุดชั่วคราว'))
    .addSubcommand(sub => sub.setName('resume').setDescription('ทำต่อ'))
    .addSubcommand(sub => sub.setName('clear').setDescription('เคลียร์ goal/task ค้างทั้งหมด'))
    .addSubcommand(sub => sub.setName('cancel').setDescription('ยกเลิก')
      .addIntegerOption(o => o.setName('goal_id').setDescription('Goal ID'))),
];

async function registerSlashCommands(client) {
  const rest = new REST().setToken(config.discord.token);
  try {
    await rest.put(
      Routes.applicationCommands(config.discord.appId),
      { body: slashCommands.map(c => c.toJSON()) },
    );
    console.log(`   Slash commands: ${slashCommands.map(c => '/' + c.name).join(', ')}`);
  } catch (err) {
    console.error('   ⚠️ Slash command registration failed:', err.message?.slice(0, 100));
  }
}

// ─── Parse reminder time ────────────────────────
function parseReminderTime(when) {
  const now = new Date();
  // "30m", "2h", "1d"
  const relMatch = when.match(/^(\d+)\s*(m|min|h|hr|hour|d|day)/i);
  if (relMatch) {
    const n = parseInt(relMatch[1]);
    const unit = relMatch[2][0].toLowerCase();
    const ms = { m: 60000, h: 3600000, d: 86400000 }[unit] || 60000;
    return new Date(now.getTime() + n * ms);
  }
  // "tomorrow"
  if (/tomorrow|พรุ่งนี้/i.test(when)) {
    const t = new Date(now);
    t.setDate(t.getDate() + 1);
    t.setHours(9, 0, 0, 0);
    return t;
  }
  // Try ISO date
  const parsed = new Date(when);
  if (!isNaN(parsed.getTime())) return parsed;
  // Default: 1 hour
  return new Date(now.getTime() + 3600000);
}

// ─── Auto-Learn Facts ───────────────────────────
const FACT_PATTERNS = [
  { pattern: /(?:ชื่อ|เรียกผม|เรียกฉัน|ผมชื่อ|ชื่อจริง)\s*(?:ว่า|คือ)?\s*(.{2,30})/i, template: (m) => `ชื่อ: ${m[1].trim()}` },
  { pattern: /(?:ทำงาน|อาชีพ|เป็น)\s*(?:เป็น|ที่)?\s*(นักออกแบบ|ช่าง|วิศวกร|สถาปนิก|โปรแกรมเมอร์|ผู้รับเหมา|เจ้าของ|แม่ค้า|พ่อค้า|ฟรีแลนซ์|.{3,30})/i, template: (m) => `อาชีพ: ${m[1].trim()}` },
  { pattern: /(?:งบ|budget)\s*(?:ประมาณ|ราว|ราวๆ|ไม่เกิน)?\s*([\d,]+(?:\.\d+)?)\s*(บาท|ล้าน)?/i, template: (m) => `งบประมาณ: ${m[1]}${m[2] || ''}`},
  { pattern: /(?:ชอบ|สนใจ|ถนัด)\s*(?:สไตล์|style)?\s*(minimal|japanese|industrial|scandinavian|luxury|tropical|มินิมอล|ญี่ปุ่น|ลอฟท์)/i, template: (m) => `สไตล์ที่ชอบ: ${m[1].trim()}` },
  { pattern: /(?:บ้าน|คอนโด|ที่อยู่|อยู่ที่|อยู่)\s*(?:ที่|ย่าน|แถว|ซอย)?\s*(.{3,40})/i, template: (m) => `ที่อยู่: ${m[1].trim()}` },
];

function autoLearnFacts(userId, content) {
  for (const { pattern, template } of FACT_PATTERNS) {
    const match = content.match(pattern);
    if (match) {
      try {
        const fact = template(match);
        if (fact && fact.length < 100) {
          mem.addUserFact(userId, fact, 'auto_learned');
        }
      } catch { /* ignore parse errors */ }
    }
  }
}

// ─── Discord Client ─────────────────────────────
const token = config.discord.token;
if (!token) { console.error('❌ DISCORD_BOT_TOKEN not set'); process.exit(1); }

// Check Gemini API config
try {
  assertLlmConfigured();
  const llm = getLlmStatusSummary();
  console.log(`✅ LLM: ${llm.provider} (${llm.model}${llm.fallbackModel ? ` → ${llm.fallbackModel}` : ''}) | keys: ${llm.keyCount}`);
} catch (err) { console.error(`❌ LLM config invalid: ${err.message}`); process.exit(1); }

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.DirectMessageReactions,
    GatewayIntentBits.DirectMessageTyping,
  ],
  partials: [Partials.Channel, Partials.Message, Partials.User, Partials.Reaction],
});

client.on('ready', async () => {
  const llm = getLlmStatusSummary();
  console.log(`\n${identity.icon} ${identity.nameTh} v2 online — ${client.user.tag}`);
  console.log(`   LLM: ${llm.provider} (${llm.model}${llm.fallbackModel ? ` → ${llm.fallbackModel}` : ''})`);
  console.log(`   Guilds: ${client.guilds.cache.map(g => g.name).join(', ') || '(none)'}`);
  console.log(`   Tools: ${toolDefinitions.length} functions`);
  console.log(`   Skills: ${getSkillCount()} skills across 12 categories`);
  console.log(`   Agents: 10 company roles (บริษัทเจมม่า)`);
  console.log(`   Memory: SQLite (persistent)`);

  await registerSlashCommands(client);
  client.user.setActivity('💎 /boq /material /room', { type: ActivityType.Listening });

  // Start reminder checker
  setInterval(checkReminders, 60000);
  console.log(`   Reminders: checking every 60s`);

  // Start cron job checker
  setInterval(checkCronJobs, 60000);
  console.log(`   Cron: checking every 60s`);

  // Evolution score
  try {
    const evoScore = getEvolutionScore();
    console.log(`   Evolution: ${evoScore.score}% satisfaction (${evoScore.good}👍 ${evoScore.bad}👎)`);
  } catch { /* first run */ }

  // Training stats
  try {
    const tStats = getTrainingStats();
    console.log(`   Training: ${tStats.total} pairs (avg quality: ${tStats.averageQuality})`);
  } catch { /* first run */ }

  console.log();
});

// ─── Reminder Checker ───────────────────────────
async function checkReminders() {
  const due = mem.getDueReminders();
  for (const r of due) {
    try {
      const channel = await client.channels.fetch(r.channel_id).catch(() => null);
      if (channel) {
        await channel.send(`⏰ **เตือน** <@${r.user_id}>: ${r.message}`);
      }
      mem.markReminderSent(r.id);
    } catch { mem.markReminderSent(r.id); }
  }
}

// ─── Boss DM Channel (for secretary) ────────────
const BOSS_DM_CHANNEL = '1490709043826790490';
const BOSS_USER_ID = '1006453735691653120';

// ─── Cron Job Checker ───────────────────────────
async function checkCronJobs() {
  try {
    const due = getDueJobs();
    for (const job of due) {
      const channelId = job.channel_id || BOSS_DM_CHANNEL;
      try {
        const channel = await client.channels.fetch(channelId).catch(() => null);
        if (!channel) { markJobRun(job.id); continue; }

        console.log(`[CRON] Running: ${job.name}`);

        // Special handling for morning_briefing
        if (job.name === 'morning_briefing') {
          await runMorningBriefing(channel);
          markJobRun(job.id);
          continue;
        }

        // Special handling for deep_scan
        if (job.name === 'deep_scan') {
          await runDeepScan();
          markJobRun(job.id);
          continue;
        }

        // Autonomy tick — execute one task from active goal
        if (job.name === 'autonomy_tick') {
          const tickResult = await runAutonomyTick();
          console.log(`[AUTONOMY] tick:`, tickResult.action || tickResult.reason || 'ok');
          markJobRun(job.id);
          continue;
        }

        // Autonomy hourly report
        if (job.name === 'autonomy_report') {
          const goals = getActiveGoals();
          if (goals.length > 0) {
            const report = generateProgressReport(goals[0].id);
            for (const chunk of splitMessage(report)) {
              await channel.send(chunk);
            }
          }
          markJobRun(job.id);
          continue;
        }

        await channel.sendTyping().catch(() => {});

        const response = await generateResponse(
          [{ role: 'user', content: job.task_prompt }],
          { channelId: channel.id, channelName: channel.name || 'cron', guildId: job.guild_id, guildName: 'cron', isAdmin: true, userId: job.user_id || 'system', userName: 'Cron' }
        );

        const payload = normalizeResponsePayload(response);
        const reply = sanitizeOutput(payload.content);
        await sendChannelReply(channel, `⏰ **[${job.name}]**\n${reply}`, payload.attachments);
        markJobRun(job.id);
      } catch (err) {
        console.error(`[CRON] Error running ${job.name}:`, err.message);
        markJobRun(job.id);
      }
    }
  } catch { /* ignore */ }
}

// ─── Morning Briefing (Secretary) ───────────────
async function runMorningBriefing(channel) {
  console.log(`[SECRETARY] 🌅 Running morning briefing...`);
  await channel.sendTyping().catch(() => {});

  // Step 1: Deep scan all projects (read real source code)
  console.log(`[SECRETARY] 📂 Scanning projects...`);
  const specIds = Object.keys(SPECIALISTS);
  for (const specId of specIds) {
    try {
      scanProject(specId);
      console.log(`[SECRETARY] ✅ Scanned: ${specId}`);
    } catch (err) {
      console.error(`[SECRETARY] Scan failed for ${specId}:`, err.message);
    }
  }

  // Step 2: Collect briefing data (tasks, todos, reminders)
  const briefingData = generateBriefingData();

  // Step 3: Ask each specialist for insight with REAL project context
  const specTasks = specIds.map(id => ({
    task: buildSpecialistPrompt(id, SPECIALISTS[id].briefingPrompt),
    role: 'planner',
    temperature: 0.5,
  }));

  let specialistInsights = {};
  try {
    const agentResults = await runAgents(specTasks);
    for (let i = 0; i < specIds.length; i++) {
      const r = agentResults.results?.[i];
      if (r?.status === 'done') {
        specialistInsights[specIds[i]] = r.result;
      }
    }
  } catch (err) {
    console.error('[SECRETARY] Agent insights failed:', err.message);
  }

  // Step 4: Format and send briefing
  const briefing = formatMorningBriefing(briefingData, specialistInsights);
  await channel.send(briefing);

  // Step 5: Generate daily ideas with REAL project context
  console.log(`[SECRETARY] 💡 Generating daily ideas...`);
  try {
    const ideaTasks = specIds.map(id => ({
      task: buildSpecialistPrompt(id, SPECIALISTS[id].ideaPrompt),
      role: 'advisor',
      temperature: 0.7,
    }));

    const ideaResults = await runAgents(ideaTasks);
    const newIdeas = [];

    for (let i = 0; i < specIds.length; i++) {
      const r = ideaResults.results?.[i];
      if (r?.status === 'done' && r.result) {
        const idea = proposeIdea(specIds[i], r.result.slice(0, 500));
        newIdeas.push({ ...idea, specialist: specIds[i], idea: r.result.slice(0, 500) });
      }
    }

    if (newIdeas.length > 0) {
      const ideasMsg = formatDailyIdeas(newIdeas);
      const sentMsg = await channel.send(ideasMsg);
      await sentMsg.react('✅').catch(() => {});
      await sentMsg.react('❌').catch(() => {});
    }
  } catch (err) {
    console.error('[SECRETARY] Ideas generation failed:', err.message);
  }

  console.log(`[SECRETARY] ✅ Morning briefing done`);
}

// ─── Deep Scan (Change-Based) ────────────────────
// Only scans projects that actually changed since last scan
import { execSync } from 'child_process';

const lastScanHashes = new Map(); // specId → hash of project state

function getProjectHash(projectPath) {
  try {
    // Check git diff for tracked changes + stat for untracked
    const diff = execSync(`git -C "${projectPath}" diff --stat HEAD 2>/dev/null || echo "no-git"`, { encoding: 'utf-8', timeout: 5000 }).trim();
    const status = execSync(`git -C "${projectPath}" status --porcelain 2>/dev/null | head -20 || echo ""`, { encoding: 'utf-8', timeout: 5000 }).trim();
    // Simple hash: combine diff + status length as fingerprint
    const combined = `${diff.length}:${status.length}:${diff.slice(0, 200)}`;
    // Basic hash
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      hash = ((hash << 5) - hash + combined.charCodeAt(i)) | 0;
    }
    return hash.toString(36);
  } catch {
    return `ts_${Date.now()}`; // Fallback: always scan if git fails
  }
}

async function runDeepScan() {
  console.log(`[SECRETARY] 🔍 Running change-based deep scan...`);
  const specIds = Object.keys(SPECIALISTS);
  let scanned = 0;
  let skipped = 0;

  for (const specId of specIds) {
    try {
      const spec = SPECIALISTS[specId];
      const projectPath = spec.projectPath;

      // Change detection: compare project hash with last scan
      const currentHash = getProjectHash(projectPath);
      const lastHash = lastScanHashes.get(specId);

      if (lastHash === currentHash) {
        console.log(`[SECRETARY] ⏭️ ${specId}: no changes, skipping`);
        skipped++;
        continue;
      }

      const scan = scanProject(specId);
      if (scan) {
        console.log(`[SECRETARY] 📊 ${specId}: ${scan.stats.totalFiles} files, ${scan.todos.length} TODOs (changed)`);

        const analysisPrompt = buildSpecialistPrompt(specId,
          `วิเคราะห์โปรเจคที่ scan มา สรุปใน 3-5 bullet points: สถานะปัจจุบัน, สิ่งที่ต้องทำ, ปัญหาที่พบ, ไอเดียที่น่าสนใจ`
        );

        const result = await chatRuntime([
          { role: 'system', content: spec.basePrompt },
          { role: 'user', content: analysisPrompt },
        ], { useTools: false });

        if (result?.message?.content) {
          try {
            mem.addKnowledge(`deep_scan_${specId}`, result.message.content, 'secretary', 'gemma');
          } catch { /* ignore */ }
          console.log(`[SECRETARY] 💡 ${specId} analysis stored`);
        }

        lastScanHashes.set(specId, currentHash);
        scanned++;
      }
    } catch (err) {
      console.error(`[SECRETARY] Deep scan ${specId} failed:`, err.message);
    }
  }
  console.log(`[SECRETARY] ✅ Deep scan: ${scanned} scanned, ${skipped} skipped (no changes)`);
}

// ─── Slash Command Handler ──────────────────────
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName, options } = interaction;
  await interaction.deferReply();

  try {
    let result;

    switch (commandName) {
      case 'boq':
        result = executeTool('calculate_boq', {
          area_sqm: options.getNumber('area'),
          work_type: options.getString('type'),
          tier: options.getString('tier') || 'standard',
        });
        break;

      case 'material':
        result = executeTool('get_material_price', { material: options.getString('name') });
        break;

      case 'convert':
        result = executeTool('convert_unit', {
          value: options.getNumber('value'),
          from_unit: options.getString('from'),
          to_unit: options.getString('to'),
        });
        break;

      case 'plan':
        result = executeTool('get_plan_info', { plan_id: options.getString('id') || 'all' });
        break;

      case 'room':
        result = executeTool('estimate_room', {
          room_type: options.getString('type'),
          area_sqm: options.getNumber('area'),
          style: options.getString('style') || 'minimal',
        });
        break;

      case 'note': {
        const sub = options.getSubcommand();
        if (sub === 'add') {
          mem.addNote(
            interaction.guildId, interaction.user.id, interaction.user.displayName,
            options.getString('title') || '', options.getString('content'),
            options.getString('tags') || '',
          );
          result = { status: '✅ บันทึกโน้ตแล้วค่ะ' };
        } else if (sub === 'list') {
          const notes = mem.getNotes(interaction.guildId);
          result = notes.length > 0
            ? notes.map(n => `**#${n.id}** ${n.title || '(ไม่มีหัวข้อ)'}\n${n.content.slice(0, 100)}${n.tags ? ` [${n.tags}]` : ''}\n_${n.author_name} · ${n.created_at}_`).join('\n\n')
            : 'ยังไม่มีโน้ตค่ะ';
        } else if (sub === 'search') {
          const found = mem.searchNotes(interaction.guildId, options.getString('query'));
          result = found.length > 0
            ? found.map(n => `**#${n.id}** ${n.title || ''}: ${n.content.slice(0, 100)}`).join('\n')
            : 'ไม่พบโน้ตที่ตรงค่ะ';
        } else if (sub === 'delete') {
          mem.deleteNote(options.getInteger('id'));
          result = { status: '🗑️ ลบโน้ตแล้วค่ะ' };
        }
        break;
      }

      case 'remind': {
        const msg = options.getString('message');
        const when = options.getString('when');
        const remindAt = parseReminderTime(when);
        mem.addReminder(
          interaction.guildId, interaction.channelId,
          interaction.user.id, interaction.user.displayName,
          msg, remindAt.toISOString(),
        );
        result = { status: `⏰ จะเตือน "${msg}" ตอน ${remindAt.toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })} ค่ะ` };
        break;
      }

      case 'skill': {
        const guildConf = config.discord.guilds[interaction.guildId];
        const mode = guildConf?.mode || 'dev-assistant';
        result = getSkillList(mode);
        break;
      }

      case 'learn': {
        const fact = options.getString('fact');
        mem.addUserFact(interaction.user.id, fact, 'user_taught');
        result = { status: `💎 จำได้แล้วค่ะ: "${fact}"` };
        break;
      }

      case 'forget': {
        const keyword = options.getString('keyword');
        mem.removeUserFact(interaction.user.id, keyword);
        result = { status: `🗑️ ลืมข้อมูลที่เกี่ยวกับ "${keyword}" แล้วค่ะ` };
        break;
      }

      case 'myfacts': {
        const facts = mem.getUserFacts(interaction.user.id);
        result = facts.length > 0
          ? `💎 **ข้อมูลที่จำได้:**\n${facts.map((f, i) => `${i + 1}. ${f}`).join('\n')}\n\nใช้ \`/learn\` เพื่อเพิ่ม หรือ \`/forget\` เพื่อลบค่ะ`
          : 'ยังไม่มีข้อมูลค่ะ ใช้ `/learn` เพื่อสอนได้เลย!';
        break;
      }

      case 'research': {
        const topic = options.getString('topic');
        await interaction.editReply(`🔍 กำลังส่งทีม 4 คน วิจัยเรื่อง "${topic}"...`);
        const researchResult = await multiResearch(topic);
        let researchReply = `🔍 **ผลวิจัย: ${topic}**\n⏱️ ${researchResult.elapsed}\n\n`;
        for (const r of researchResult.results || []) {
          researchReply += `**${r.role}:** ${(r.result || r.error || '').slice(0, 1200)}\n\n`;
        }
        result = researchReply;
        break;
      }

      case 'meeting': {
        const agenda = options.getString('agenda');
        await interaction.editReply(`🏢 กำลังประชุมบริษัทเจมม่า 10 ผู้บริหาร...\nวาระ: ${agenda}`);
        const meetingResult = await companyMeeting(agenda);
        let meetingReply = `🏢 **ประชุมบริษัทเจมม่า**\n📋 ${agenda}\n⏱️ ${meetingResult.elapsed}\n\n`;
        for (const r of meetingResult.results || []) {
          meetingReply += `**${r.role}:** ${(r.result || r.error || '').slice(0, 900)}\n\n`;
        }
        result = meetingReply;
        break;
      }

      case 'debate': {
        const debateTopic = options.getString('topic');
        await interaction.editReply(`⚔️ กำลังจัดโต้วาที: "${debateTopic}"\n2 ฝ่ายถก + rebuttal + กรรมการ CEO ตัดสิน...`);
        const debateResult = await debate(debateTopic);
        let debateReply = `⚔️ **โต้วาที: ${debateTopic}**\n⏱️ ${debateResult.elapsed}\n\n`;
        debateReply += `**✅ ฝ่ายสนับสนุน:**\n${debateResult.rounds.pro?.slice(0, 1100)}\n\n`;
        debateReply += `**❌ ฝ่ายคัดค้าน:**\n${debateResult.rounds.con?.slice(0, 1100)}\n\n`;
        debateReply += `**⚖️ คำตัดสิน (CEO):**\n${debateResult.verdict?.slice(0, 1300)}`;
        result = debateReply;
        break;
      }

      case 'tournament': {
        const tQuestion = options.getString('question');
        const tCount = options.getInteger('contestants') || 5;
        await interaction.editReply(`🏆 แข่งขัน ${tCount} agents: "${tQuestion}"\nกำลังแข่งขัน...`);
        const tResult = await tournament(tQuestion, tCount);
        let tReply = `🏆 **Tournament: ${tQuestion}**\n👥 ${tResult.contestants} ผู้แข่ง | ⏱️ ${tResult.elapsed}\n\n`;
        tReply += `**🥇 ผู้ชนะ:**\n${tResult.winner?.slice(0, 2000)}`;
        result = tReply;
        break;
      }

      case 'assign': {
        const specId = options.getString('specialist');
        const taskText = options.getString('task');
        const pri = options.getString('priority') || 'medium';
        const spec = SPECIALISTS[specId];
        const t = assignTask(specId, taskText, pri);
        const priIcon = { high: '🔴', medium: '🟡', low: '🟢' }[pri];
        result = { status: `${spec.icon} ${priIcon} สั่งงาน **${spec.name}**: "${taskText.slice(0, 60)}" (ID: #${t.id})` };
        break;
      }

      case 'secretary': {
        const stats = getSecretaryStats();
        const pending = getAllPendingTasks();
        const ideas = getPendingIdeas();

        let secReply = `💎 **ทีมเลขาเจมม่า**\n`;
        secReply += `📋 งานค้าง: ${stats.pendingTasks} | ✅ ไอเดีย approved: ${stats.approvedIdeas}\n\n`;

        for (const [id, spec] of Object.entries(SPECIALISTS)) {
          const specTasks = pending.filter(t => t.specialist === id);
          secReply += `${spec.icon} **${spec.name}** — ${specTasks.length} งาน\n`;
          for (const t of specTasks.slice(0, 2)) {
            secReply += `  └ ${t.task.slice(0, 50)}\n`;
          }
        }

        if (ideas.length > 0) {
          secReply += `\n💡 **ไอเดียรอ approve (${ideas.length}):**\n`;
          for (const i of ideas.slice(0, 3)) {
            secReply += `• ${SPECIALISTS[i.specialist]?.icon || '💡'} ${i.idea.slice(0, 80)}\n`;
          }
        }

        result = secReply;
        break;
      }

      case 'briefing': {
        await interaction.editReply('🌅 กำลังสร้าง morning briefing...');
        try {
          const channel = interaction.channel;
          await runMorningBriefing(channel);
          result = '✅ Morning briefing sent!';
        } catch (err) {
          result = `❌ ${err.message}`;
        }
        break;
      }

      case 'cron': {
        const sub = options.getSubcommand();
        if (sub === 'add') {
          const job = addCronJob(
            interaction.guildId, interaction.channelId, interaction.user.id,
            options.getString('name'), options.getString('type'),
            options.getString('schedule'), options.getString('task')
          );
          result = { status: `⏰ เพิ่ม cron job "${options.getString('name')}" แล้วค่ะ (${options.getString('type')}: ${options.getString('schedule')})` };
        } else if (sub === 'list') {
          const jobs = listCronJobs(interaction.guildId);
          if (jobs.length === 0) {
            result = 'ยังไม่มี cron job ค่ะ ใช้ `/cron add` เพื่อเพิ่ม';
          } else {
            result = `⏰ **Cron Jobs** (${jobs.length})\n` +
              jobs.map(j => `${j.enabled ? '🟢' : '🔴'} **#${j.id}** ${j.name} — ${j.schedule_type}: ${j.schedule_value}\n  └ ${j.task_prompt.slice(0, 60)}...`).join('\n');
          }
        } else if (sub === 'remove') {
          removeCronJob(options.getInteger('id'));
          result = { status: '🗑️ ลบ cron job แล้วค่ะ' };
        } else if (sub === 'toggle') {
          const id = options.getInteger('id');
          const job = toggleCronJob(id);
          result = { status: `${job?.enabled ? '🟢 เปิด' : '🔴 ปิด'} cron job #${id} แล้วค่ะ` };
        }
        break;
      }

      case 'evolve': {
        const report = getEvolutionReport();
        result = `📈 **สถานะวิวัฒนาการเจมม่า**\n` +
          `คะแนน: ${report.score.score}% (${report.score.good}👍 ${report.score.bad}👎)\n` +
          `เวอร์ชันที่ applied: ${report.history.filter(h => h.applied).length}\n` +
          (report.feedback.length > 0
            ? `\nFeedback ล่าสุด:\n${report.feedback.slice(0, 5).map(f => `• ${f.topic}: ${f.count} ครั้ง`).join('\n')}`
            : '\nยังไม่มี feedback ค่ะ');
        break;
      }

      case 'train': {
        const stats = getTrainingStats();
        result = `🧬 **Training Data**\n` +
          `รวม: ${stats.total} pairs | คุณภาพเฉลี่ย: ${stats.averageQuality}/10\n` +
          `ใช้แล้ว: ${stats.used} | ยังไม่ใช้: ${stats.unused}\n` +
          (stats.byCategory.length > 0
            ? `\nหมวด:\n${stats.byCategory.map(c => `• ${c.category}: ${c.count} (avg: ${c.avg_quality})`).join('\n')}`
            : '');
        break;
      }

      case 'autonomy': {
        const sub = options.getSubcommand();
        if (sub === 'start') {
          const goalTitle = options.getString('goal');
          const desc = options.getString('description') || '';
          const goalType = options.getString('type') || 'project';
          const maxIter = options.getInteger('max') || 50;
          const goalId = createGoal(goalTitle, desc, {
            goalType, maxIterations: maxIter,
            reportChannelId: interaction.channelId,
            createdBy: 'boss',
          });
          // Decompose immediately
          try {
            await decomposeGoal(goalId);
            const progress = getGoalProgress(goalId);
            const taskList = progress.tasks.map(t => `  • [${t.role}] ${t.title}`).join('\n');
            result = `🎯 **Goal #${goalId} created!**\n"${goalTitle}"\n\n📋 Tasks:\n${taskList}\n\n⏱️ Autonomy tick ทุก 5 นาที (max ${maxIter} รอบ)`;
          } catch (err) {
            result = `🎯 Goal #${goalId} created แต่ decompose failed: ${err.message}\nลอง /autonomy resume`;
          }
        } else if (sub === 'status') {
          const status = getLoopStatus();
          const goals = getActiveGoals();
          if (goals.length === 0) {
            result = '💤 ไม่มี active goal — ใช้ /autonomy start เพื่อตั้งเป้าหมายค่ะ';
          } else {
            const g = goals[0];
            const progress = getGoalProgress(g.id);
            const done = progress.tasks.filter(t => t.status === 'done').length;
            const total = progress.tasks.length;
            result = `🤖 **BabyGemma Status**\n🎯 Goal #${g.id}: "${g.title}"\n📊 ${done}/${total} tasks done | Iteration ${g.iterations_used}/${g.max_iterations}\n🔄 Errors: ${status.consecutiveErrors} | Running: ${status.running ? 'Yes' : 'No'}`;
          }
        } else if (sub === 'report') {
          const goalId = options.getInteger('goal_id') || getActiveGoals()[0]?.id;
          if (!goalId) { result = '❌ ไม่มี active goal'; break; }
          result = generateProgressReport(goalId);
        } else if (sub === 'pause') {
          const goals = getActiveGoals();
          if (goals.length === 0) { result = '❌ ไม่มี active goal'; break; }
          pauseGoal(goals[0].id);
          result = `⏸️ Paused goal #${goals[0].id}: "${goals[0].title}"`;
        } else if (sub === 'resume') {
          // Find paused goal
          const paused = getLatestPausedGoal();
          if (!paused) { result = '❌ ไม่มี paused goal'; break; }
          resumeGoal(paused.id);
          result = `▶️ Resumed goal #${paused.id}: "${paused.title}"`;
        } else if (sub === 'cancel') {
          const goalId = options.getInteger('goal_id') || getActiveGoals()[0]?.id;
          if (!goalId) { result = '❌ ไม่มี active goal'; break; }
          cancelGoal(goalId);
          result = `❌ Cancelled goal #${goalId}`;
        } else if (sub === 'clear') {
          const summary = clearOutstandingWork();
          result = `🧹 Cleared ${summary.goalsCleared} goals / ${summary.tasksCleared} tasks\n${summary.goalSummaries.map(g => `• Goal #${g.goalId} "${g.title}" → ${g.tasksCleared} tasks`).join('\n') || 'ไม่มีงานค้างค่ะ'}`;
        }
        break;
      }

      case 'todo': {
        const sub = options.getSubcommand();
        if (sub === 'add') {
          const task = options.getString('task');
          const priority = options.getString('priority') || 'medium';
          const dueStr = options.getString('due');
          const dueAt = dueStr ? parseReminderTime(dueStr).toISOString() : null;
          mem.addTodo(interaction.guildId, interaction.user.id, interaction.user.displayName, task, priority, dueAt);
          const priIcon = { high: '🔴', medium: '🟡', low: '🟢' }[priority];
          result = { status: `✅ เพิ่มงาน ${priIcon} "${task}"${dueAt ? ` กำหนด ${new Date(dueAt).toLocaleDateString('th-TH')}` : ''} แล้วค่ะ` };
        } else if (sub === 'list') {
          const todos = mem.getTodos(interaction.user.id);
          if (todos.length === 0) {
            result = '✨ ไม่มีงานค้างค่ะ!';
          } else {
            const priIcon = { high: '🔴', medium: '🟡', low: '🟢' };
            result = `📋 **Todo List** (${todos.length} รายการ)\n` +
              todos.map(t => `${priIcon[t.priority] || '⚪'} **#${t.id}** ${t.task}${t.due_at ? ` ⏰ ${new Date(t.due_at).toLocaleDateString('th-TH')}` : ''}`).join('\n') +
              `\n\nใช้ \`/todo done <id>\` เมื่อเสร็จค่ะ`;
          }
        } else if (sub === 'done') {
          mem.completeTodo(options.getInteger('id'));
          result = { status: `🎉 เสร็จแล้ว! ยินดีด้วยค่ะ` };
        } else if (sub === 'delete') {
          mem.deleteTodo(options.getInteger('id'));
          result = { status: `🗑️ ลบงานแล้วค่ะ` };
        }
        break;
      }
    }

    const reply = typeof result === 'string' ? result :
      result?.status ? result.status :
      '```json\n' + JSON.stringify(result, null, 2).slice(0, 1800) + '\n```';

    await sendInteractionReply(interaction, reply);
  } catch (err) {
    await interaction.editReply(`❌ ${err.message.slice(0, 200)}`).catch(() => {});
  }
});

// ─── DM Fix: raw event → manual DM handling ──────
// discord.js v14 drops messageCreate for uncached DM channels
// even with Partials.Channel — handle DMs from raw gateway event
client.on('raw', async (packet) => {
  if (packet.t !== 'MESSAGE_CREATE') return;
  if (packet.d.guild_id) return; // guild messages handled by messageCreate
  if (packet.d.author?.bot) return;

  const data = packet.d;
  console.log(`[DM] ${data.author.username} (${data.author.id}): "${(data.content || '').slice(0, 50)}"`);

  // Process DM through same pipeline as guild messages
  let stopTyping = () => {};
  let channel = null;
  let requestText = '';
  try {
    const channelId = data.channel_id;
    const userId = data.author.id;
    const userName = data.author.username;
    const content = (data.content || '').trim();
    if (!content) return;
    requestText = content;

    const isAdmin = config.discord.admins.includes(userId);
    const dmConfig = config.discord.dmChannels[channelId];

    // Cooldown
    if (isOnCooldown(userId)) return;
    cooldowns.set(userId, Date.now());

    // Fetch the DM channel for sending
    channel = await client.channels.fetch(channelId).catch(() => null);
    if (!channel) { console.log('[DM] Cannot fetch channel', channelId); return; }

    // Typing indicator
    stopTyping = startTypingLoop(channel, `channel:${channelId}`);

    // Save to memory
    mem.addMessage(channelId, null, userId, userName, 'user', content);

    // Auto-learn facts
    autoLearnFacts(userId, content);

    // Auto-assign: if boss says "ช่วย...ให้หน่อย" or "ทำ...ให้" → detect specialist and assign
    if (isAdmin && shouldAutoAssignSecretaryTask(content)) {
      const specId = detectSpecialist(content);
      if (specId) {
        assignTask(specId, content, 'medium');
        console.log(`[SECRETARY] Auto-assigned to ${specId}: ${content.slice(0, 50)}`);
      }
    }

    // Get history
    const history = mem.getHistory(channelId, config.behavior.maxHistoryPerChannel);

    const context = {
      channelId,
      channelName: dmConfig?.name || 'DM',
      guildId: null,
      guildName: dmConfig?.name || 'DM',
      isAdmin,
      userId,
      userName,
    };

    setChatBusy(true);
    try {
      const response = await generateResponse(history, context);
      const payload = normalizeResponsePayload(response);
      let reply = sanitizeOutput(payload.content);

      mem.addMessage(channelId, null, null, identity.nameTh, 'assistant', reply);
      await sendChannelReply(channel, reply, payload.attachments);

      console.log(`[DM] replied to ${userName}: ${reply.slice(0, 50)}...`);
    } finally {
      setChatBusy(false);
    }
  } catch (err) {
    console.error('[DM ERROR]', err.message);
    if (channel) {
      await channel.send(formatUserFacingError(err, {
        userQuery: requestText,
        context: {
          channelId: channel?.id || data?.channel_id,
          channelName: channel?.name || 'DM',
          guildId: null,
          guildName: 'DM',
        },
      })).catch(() => {});
    }
  } finally {
    stopTyping();
    setChatBusy(false);
  }
});

// ─── Message Handler ────────────────────────────
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const guildId = message.guild?.id;
  const guildConfig = config.discord.guilds[guildId];
  const isDM = !message.guild;
  const dmConfig = isDM ? config.discord.dmChannels[message.channel.id] : null;
  const isMentioned = message.mentions.has(client.user);
  const hasKeyword = config.behavior.respondToKeywords.some(kw =>
    message.content.toLowerCase().includes(kw));
  const isFreeChat = guildConfig?.freeChat === true || dmConfig?.freeChat === true;

  if (!isDM && !isMentioned && !hasKeyword && !isFreeChat) return;
  if (isOnCooldown(message.author.id)) return;
  cooldowns.set(message.author.id, Date.now());

  // Auto-reactions
  for (const [keyword, emoji] of Object.entries(config.behavior.autoReactions)) {
    if (message.content.includes(keyword)) {
      message.react(emoji).catch(() => {});
    }
  }

  let content = message.content
    .replace(new RegExp(`<@!?${client.user.id}>`, 'g'), '')
    .trim();

  // Image Analysis: check for image attachments
  const imageAttachment = message.attachments?.find(a =>
    a.contentType?.startsWith('image/') || /\.(png|jpg|jpeg|gif|webp)$/i.test(a.name || '')
  );

  if (!content && !imageAttachment) {
    await message.reply(`สวัสดีค่ะ ${identity.icon} มีอะไรให้ช่วยมั้ยคะ?`);
    return;
  }

  // If image attached, analyze it
  if (imageAttachment) {
    const imagePrompt = content || 'วิเคราะห์รูปนี้ให้หน่อย บอกรายละเอียดทุกอย่างที่เห็น';
    await message.channel.sendTyping().catch(() => {});
    const imageResult = await analyzeImage(imageAttachment.url, imagePrompt);
    if (imageResult) {
      content = `[ผู้ใช้ส่งรูปภาพ: ${imageAttachment.name}]\nผลวิเคราะห์: ${imageResult}\n\nคำถามเพิ่มเติมจากผู้ใช้: ${content || '(ไม่มี แค่ส่งรูป)'}`;
    }
  }

  // Auto-learn: extract facts when users share personal info
  autoLearnFacts(message.author.id, content);

  // Check delegation
  const delegation = shouldDelegateToTeam(content);
  if (delegation) {
    content += `\n[System: เรื่องนี้อาจต้องใช้ ${delegation.agent} เป็นบริบทภายในเท่านั้น ห้ามบอกให้ผู้ใช้ไปสั่งบอทอื่น ให้ตอบข้อจำกัดและทางออกด้วยตัวเอง]`;
  }

  // Typing indicator
  const stopTyping = startTypingLoop(message.channel, `channel:${message.channel.id}`);

  try {
    const channelId = message.channel.id;
    const isAdmin = config.discord.admins.includes(message.author.id);

    // Save to SQLite
    mem.addMessage(channelId, guildId, message.author.id, message.author.displayName, 'user', content);

    // Get history from SQLite
    const history = mem.getHistory(channelId, config.behavior.maxHistoryPerChannel);

    const context = {
      channelId,
      channelName: message.channel.name || dmConfig?.name || 'DM',
      guildId,
      guildName: message.guild?.name || dmConfig?.name || 'DM',
      isAdmin,
      userId: message.author.id,
      userName: message.author.displayName,
    };

    setChatBusy(true);
    try {
      const response = await generateResponse(history, context);
      const payload = normalizeResponsePayload(response);
      let reply = sanitizeOutput(payload.content);

      // Save assistant response
      mem.addMessage(channelId, guildId, null, identity.nameTh, 'assistant', reply);

      // Discord limit 2000 chars — split into chunks if needed
      await sendMessageReply(message, reply, payload.attachments);
    } finally {
      setChatBusy(false);
    }

    // Log
    console.log(`[${new Date().toLocaleTimeString('th-TH')}] ${message.guild?.name || 'DM'}/#${message.channel.name || 'dm'} ${message.author.displayName}: ${content.slice(0, 50)}...`);
  } catch (err) {
    console.error('Error:', err.message);
    await message.reply(formatUserFacingError(err, {
      userQuery: content,
      context: {
        channelId: message.channel.id,
        channelName: message.channel.name || dmConfig?.name || 'DM',
        guildId,
        guildName: message.guild?.name || dmConfig?.name || 'DM',
      },
    })).catch(() => {});
  } finally {
    stopTyping();
    setChatBusy(false);
  }
});

// ─── Feedback Loop: 👍👎 Reaction Tracking ──────
client.on('messageReactionAdd', async (reaction, user) => {
  if (user.bot) return;
  // Only track reactions on bot's own messages
  const msg = reaction.message.partial ? await reaction.message.fetch().catch(() => null) : reaction.message;
  if (!msg || msg.author?.id !== client.user.id) return;

  const emoji = reaction.emoji.name;

  // Idea approval system: ✅ approve, ❌ reject
  if ((emoji === '✅' || emoji === '❌') && msg.content?.includes('idea:')) {
    // Only boss can approve
    if (!config.discord.admins.includes(user.id)) return;

    const ideaMatch = msg.content.match(/idea:(\d+)/g);
    if (ideaMatch) {
      for (const m of ideaMatch) {
        const ideaId = parseInt(m.replace('idea:', ''));
        if (emoji === '✅') {
          approveIdea(ideaId);
          console.log(`[SECRETARY] ✅ Idea #${ideaId} approved by ${user.tag}`);
        } else {
          rejectIdea(ideaId);
          console.log(`[SECRETARY] ❌ Idea #${ideaId} rejected by ${user.tag}`);
        }
      }
    }
    return;
  }

  if (emoji === '👍' || emoji === '👎') {
    const quality = emoji === '👍' ? 'good' : 'bad';
    console.log(`[FEEDBACK] ${quality} from ${user.tag} on: "${msg.content?.slice(0, 50)}..."`);

    try {
      mem.addKnowledge(
        `feedback_${quality}`,
        `Q: ${msg.reference ? '(reply)' : '(direct)'} → A: ${msg.content?.slice(0, 500)}`,
        `discord_${user.id}`,
        'feedback'
      );
    } catch { /* ignore */ }
  }
});

// ─── Cross-Bot Command ──────────────────────────
// ส่งข้อความหาบอทอื่นผ่าน Discord channel
async function crossBotCommand(channelId, targetBotId, message) {
  try {
    const channel = await client.channels.fetch(channelId).catch(() => null);
    if (!channel) return { error: 'ไม่พบ channel' };
    await channel.send(`<@${targetBotId}> ${message}`);
    return { status: 'sent', target: targetBotId, message: message.slice(0, 100) };
  } catch (err) {
    return { error: err.message };
  }
}

// Team bot IDs for cross-bot
const TEAM_BOTS = {
  'ปลาดาว': '1484999407660437644',
  'ปลาวาฬ': '1484998870944452808',
  'ม้าน้ำ': '1484846328805851227',
};

// ─── Cleanup & Shutdown ─────────────────────────
// Weekly cleanup of old conversations
setInterval(() => mem.cleanup(), 86400000);

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    console.log(`\n👋 ${identity.nameTh} shutting down...`);
    mem.close();
    client.destroy();
    process.exit(0);
  });
}

// ─── Global Error Handlers ───────────────────────
process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught:', err.message, err.stack?.slice(0, 300));
});
process.on('unhandledRejection', (err) => {
  console.error('[WARN] Unhandled rejection:', err?.message || err);
});
client.on('error', (err) => {
  console.error('[CLIENT ERROR]:', err.message);
});

client.login(token);
