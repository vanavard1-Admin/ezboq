// ปลาวาฬ (Whale) — Codex/GPT Discord Bot Bridge (Fixed)
import { Client, GatewayIntentBits, Partials } from "discord.js";
import { spawn } from "child_process";
import https from "https";
import { whaleConfig } from "./whale-config.mjs";
import { buildWhaleSystemPrompt } from "./whale-soul.mjs";
import { buildWorkspacePromptBlock, formatWorkspaceLog, resolveWorkspace } from "./workspace-router.mjs";

let BOT_ID = null;
let busy = false;
const conversationHistory = new Map();
const MAX_HISTORY_TURNS = 8;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel, Partials.Message, Partials.User],
});

client.once("ready", () => {
  BOT_ID = client.user.id;
  console.log(`${whaleConfig.bot.name} (${client.user.tag}) online!`);
  console.log(`Bot ID: ${BOT_ID} | Intents: ${client.options.intents.bitfield} | Guilds: ${client.guilds.cache.size}`);
  console.log(`Model: ${whaleConfig.runtime.model} + ${whaleConfig.runtime.reasoningEffort} reasoning (${whaleConfig.bot.modelLabel})`);
  console.log("Soul: QA Lead persona loaded");
});

client.on("raw", async (packet) => {
  if (packet.t !== "MESSAGE_CREATE") return;
  const d = packet.d;
  if (d.author.bot || d.author.id === BOT_ID) return;

  const isDM = !d.guild_id;
  const mentioned = d.mentions?.some((m) => m.id === BOT_ID);
  if (!isDM && whaleConfig.behavior.requireMentionInGuild && !mentioned) return;
  if (isDM && !whaleConfig.behavior.allowDm) return;

  console.log(`[MSG] ${d.author.username}: ${d.content?.slice(0, 100)} (${isDM ? "DM" : "guild"})`);

  const prompt = d.content?.replace(/<@!?\d+>/g, "").trim();
  if (!prompt) {
    await restReply(d.channel_id, d.id, whaleConfig.behavior.emptyPromptReply);
    return;
  }

  if (busy) {
    await restReply(d.channel_id, d.id, whaleConfig.behavior.busyReply);
    return;
  }

  busy = true;
  const thinkingId = await restReply(d.channel_id, d.id, whaleConfig.behavior.thinkingReply);

  const startTime = Date.now();
  const phases = ["กำลังวิเคราะห์", "กำลังตรวจสอบ", "กำลังเขียน", "ใกล้เสร็จแล้ว"];
  const heartbeat = thinkingId ? setInterval(async () => {
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    const phase = phases[Math.min(Math.floor(elapsed / 30), phases.length - 1)];
    try {
      await restEdit(d.channel_id, thinkingId, `🐋 ${phase}... (${elapsed}s)`);
    } catch {}
  }, 15000) : null;

  try {
    const recentHistory = getRecentConversation(d.channel_id);
    const workspace = resolveWorkspace({
      config: whaleConfig,
      prompt,
      channelId: d.channel_id,
      recentHistory,
    });
    console.log(`[WORKSPACE] ${formatWorkspaceLog(workspace)}`);
    const result = await runCodex(prompt, {
      userName: d.author.username,
      guildName: d.guild_id || "DM",
      isDM,
      recentHistory,
      workspace,
    });
    if (heartbeat) clearInterval(heartbeat);
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    const chunks = splitMessage(result || "ไม่มีผลลัพธ์ครับ");
    if (thinkingId) await restEdit(d.channel_id, thinkingId, chunks[0]);
    for (let i = 1; i < chunks.length; i += 1) {
      await restSend(d.channel_id, chunks[i]);
    }
    rememberConversationTurn(d.channel_id, "user", prompt);
    rememberConversationTurn(d.channel_id, "assistant", result || "ไม่มีผลลัพธ์ครับ");
    console.log(`[DONE] ${elapsed}s | ${(result || "").length} chars`);
  } catch (err) {
    if (heartbeat) clearInterval(heartbeat);
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    console.error(`[ERR] ${elapsed}s | ${err.message}`);
    const isTimeout = err.message.includes("TIMEOUT") || err.message.includes("Exit code null") || elapsed >= (whaleConfig.runtime.timeoutMs / 1000 - 5);
    const errorReply = isTimeout
      ? `🐋 ขอโทษครับ ใช้เวลานานเกินไป (${elapsed}s) ลองถามใหม่สั้นๆ กว่านี้ครับ`
      : `❌ Error: ${err.message.slice(0, 300)}`;
    if (thinkingId) await restEdit(d.channel_id, thinkingId, errorReply);
    rememberConversationTurn(d.channel_id, "user", prompt);
    rememberConversationTurn(d.channel_id, "assistant", errorReply);
  } finally {
    busy = false;
  }
});

function restRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = https.request({
      hostname: "discord.com",
      path: `/api/v10${path}`,
      method,
      headers: {
        Authorization: `Bot ${whaleConfig.bot.token}`,
        "Content-Type": "application/json",
        ...(data ? { "Content-Length": Buffer.byteLength(data) } : {}),
      },
    }, (res) => {
      let responseBody = "";
      res.on("data", (chunk) => { responseBody += chunk; });
      res.on("end", () => {
        try {
          resolve(JSON.parse(responseBody));
        } catch {
          resolve({});
        }
      });
    });
    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}

async function restReply(chId, msgId, content) {
  const response = await restRequest("POST", `/channels/${chId}/messages`, { content, message_reference: { message_id: msgId } });
  return response.id;
}

async function restEdit(chId, msgId, content) {
  await restRequest("PATCH", `/channels/${chId}/messages/${msgId}`, { content });
}

async function restSend(chId, content) {
  await restRequest("POST", `/channels/${chId}/messages`, { content });
}

function rememberConversationTurn(channelId, role, content) {
  const key = String(channelId || "");
  const normalized = String(content || "").replace(/\s+/g, " ").trim();
  if (!key || !normalized) return;

  const history = conversationHistory.get(key) || [];
  history.push({
    role,
    content: normalized.slice(0, 1800),
    ts: Date.now(),
  });

  while (history.length > MAX_HISTORY_TURNS) {
    history.shift();
  }

  conversationHistory.set(key, history);
}

function getRecentConversation(channelId) {
  return [...(conversationHistory.get(String(channelId || "")) || [])];
}

function formatRecentConversation(recentHistory = []) {
  if (!Array.isArray(recentHistory) || recentHistory.length === 0) return "";
  const lines = recentHistory.map((item) => {
    const speaker = item.role === "assistant" ? whaleConfig.bot.name : "User";
    return `- ${speaker}: ${item.content}`;
  });
  return `# Recent Conversation\n${lines.join("\n")}`;
}

function runCodex(prompt, context = {}) {
  return new Promise((resolve, reject) => {
    const systemPrompt = buildWhaleSystemPrompt(context);
    const workspaceBlock = buildWorkspacePromptBlock(context.workspace);
    const historyBlock = formatRecentConversation(context.recentHistory);
    const fullPrompt = [
      systemPrompt,
      workspaceBlock,
      historyBlock,
      "# User Request",
      prompt,
    ].filter(Boolean).join("\n\n");
    const proc = spawn("codex", [
      "exec",
      "-m", whaleConfig.runtime.model,
      "-c", `model_reasoning_effort="${whaleConfig.runtime.reasoningEffort}"`,
      "--skip-git-repo-check",
      "--dangerously-bypass-approvals-and-sandbox",
      "--json", "--",
    ], {
      cwd: context.workspace?.cwd || whaleConfig.runtime.cwd,
      timeout: whaleConfig.runtime.timeoutMs,
      env: { ...process.env, TERM: "dumb", HOME: "/root" },
    });

    proc.stdin.end(fullPrompt);

    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (chunk) => { stdout += chunk; });
    proc.stderr.on("data", (chunk) => { stderr += chunk; });
    proc.on("close", (code) => {
      console.log(`[CODEX] exit=${code} stdout=${stdout.length}b`);

      let lastAgentMessage = "";
      for (const line of stdout.split("\n")) {
        try {
          const obj = JSON.parse(line);
          if (obj.type === "item.completed" && obj.item?.type === "agent_message" && obj.item?.text) {
            lastAgentMessage = obj.item.text;
          }
        } catch {}
      }

      const result = lastAgentMessage.trim();
      if (result) resolve(result);
      else if (stderr.trim()) resolve(stderr.trim());
      else reject(new Error(`No response from Codex (exit ${code})`));
    });
    proc.on("error", reject);
  });
}

function splitMessage(text, maxLen = 1900) {
  const safeLen = whaleConfig.behavior.maxReplyLen || maxLen;
  const chunks = [];
  let remaining = String(text || "");

  while (remaining.length > 0) {
    if (remaining.length <= safeLen) {
      chunks.push(remaining);
      break;
    }
    let idx = remaining.lastIndexOf("\n", safeLen);
    if (idx === -1) idx = safeLen;
    chunks.push(remaining.slice(0, idx));
    remaining = remaining.slice(idx).trimStart();
  }
  return chunks;
}

client.login(whaleConfig.bot.token);
