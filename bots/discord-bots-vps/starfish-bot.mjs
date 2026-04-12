// ปลาดาว (Starfish) — Gemini Discord Bot Bridge (Full Mode)
import { Client, GatewayIntentBits, Partials } from "discord.js";
import { spawn } from "child_process";
import https from "https";
import { starfishConfig } from "./starfish-config.mjs";
import { buildStarfishSystemPrompt } from "./starfish-soul.mjs";
import { buildWorkspacePromptBlock, formatWorkspaceLog, resolveWorkspace } from "./workspace-router.mjs";

let BOT_ID = null;
let busy = false;

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
  console.log(`${starfishConfig.bot.name} (${client.user.tag}) online!`);
  console.log(`Bot ID: ${BOT_ID} | Intents: ${client.options.intents.bitfield} | Guilds: ${client.guilds.cache.size}`);
  console.log(`Model: ${starfishConfig.runtime.model} (${starfishConfig.bot.modelLabel})`);
  console.log("Soul: Lead Designer persona loaded");
});

client.on("raw", async (packet) => {
  if (packet.t !== "MESSAGE_CREATE") return;
  const d = packet.d;
  if (d.author.bot || d.author.id === BOT_ID) return;

  const isDM = !d.guild_id;
  const mentioned = d.mentions?.some((m) => m.id === BOT_ID);
  if (!isDM && starfishConfig.behavior.requireMentionInGuild && !mentioned) return;
  if (isDM && !starfishConfig.behavior.allowDm) return;

  console.log(`[MSG] ${d.author.username}: ${d.content?.slice(0, 100)} (${isDM ? "DM" : "guild"})`);

  const prompt = d.content?.replace(/<@!?\d+>/g, "").trim();
  if (!prompt) {
    await restReply(d.channel_id, d.id, starfishConfig.behavior.emptyPromptReply);
    return;
  }

  if (busy) {
    await restReply(d.channel_id, d.id, starfishConfig.behavior.busyReply);
    return;
  }

  busy = true;
  const thinkingId = await restReply(d.channel_id, d.id, starfishConfig.behavior.thinkingReply);

  const startTime = Date.now();
  const phases = ["กำลังวิเคราะห์", "กำลังออกแบบ", "กำลังเขียน", "ใกล้เสร็จแล้ว"];
  const heartbeat = thinkingId ? setInterval(async () => {
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    const phase = phases[Math.min(Math.floor(elapsed / 30), phases.length - 1)];
    try {
      await restEdit(d.channel_id, thinkingId, `⭐ ${phase}... (${elapsed}s)`);
    } catch {}
  }, 15000) : null;

  try {
    const workspace = resolveWorkspace({
      config: starfishConfig,
      prompt,
      channelId: d.channel_id,
    });
    console.log(`[WORKSPACE] ${formatWorkspaceLog(workspace)}`);
    const result = await runGemini(prompt, {
      userName: d.author.username,
      guildName: d.guild_id || "DM",
      isDM,
      workspace,
    });
    if (heartbeat) clearInterval(heartbeat);
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    const chunks = splitMessage(result || "ไม่มีผลลัพธ์ค่ะ");
    if (thinkingId) await restEdit(d.channel_id, thinkingId, chunks[0]);
    for (let i = 1; i < chunks.length; i += 1) {
      await restSend(d.channel_id, chunks[i]);
    }
    console.log(`[DONE] ${elapsed}s | ${(result || "").length} chars`);
  } catch (err) {
    if (heartbeat) clearInterval(heartbeat);
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    console.error(`[ERR] ${elapsed}s | ${err.message}`);
    const isTimeout = err.message.includes("TIMEOUT") || err.message.includes("Exit code null") || elapsed >= (starfishConfig.runtime.timeoutMs / 1000 - 5);
    const errorMsg = isTimeout
      ? `⭐ ขอโทษค่ะ ใช้เวลานานเกินไป (${elapsed}s) ลองถามใหม่สั้นๆ กว่านี้นะคะ`
      : `❌ Error: ${err.message.slice(0, 300)}`;
    if (thinkingId) await restEdit(d.channel_id, thinkingId, errorMsg);
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
        Authorization: `Bot ${starfishConfig.bot.token}`,
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

function runGemini(prompt, context = {}) {
  return new Promise((resolve, reject) => {
    if (!starfishConfig.runtime.geminiApiKey) {
      reject(new Error("Missing STARFISH_GEMINI_API_KEY"));
      return;
    }

    const systemPrompt = buildStarfishSystemPrompt(context);
    const workspaceBlock = buildWorkspacePromptBlock(context.workspace);
    const fullPrompt = [systemPrompt, workspaceBlock, "# User Request", prompt].filter(Boolean).join("\n\n");
    const proc = spawn("gemini", ["-p", fullPrompt, "-m", starfishConfig.runtime.model, "--approval-mode", "yolo"], {
      cwd: context.workspace?.cwd || starfishConfig.runtime.cwd,
      timeout: starfishConfig.runtime.timeoutMs,
      env: {
        ...process.env,
        TERM: "dumb",
        GEMINI_API_KEY: starfishConfig.runtime.geminiApiKey,
        HOME: "/root",
      },
    });
    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (chunk) => { stdout += chunk; });
    proc.stderr.on("data", (chunk) => { stderr += chunk; });
    proc.on("close", (code) => {
      if (code === 0) resolve(stdout.trim());
      else reject(new Error(stderr.trim().slice(0, 200) || `Exit code ${code}`));
    });
    proc.on("error", reject);
  });
}

function splitMessage(text, maxLen = 1900) {
  const safeLen = starfishConfig.behavior.maxReplyLen || maxLen;
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

client.login(starfishConfig.bot.token);
