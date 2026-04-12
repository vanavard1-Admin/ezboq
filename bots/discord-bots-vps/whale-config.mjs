import { firstEnv, readNumberEnv, requireEnv } from "./runtime-env.mjs";

const rootCwd = firstEnv(["DISCORD_BOTS_ROOT_CWD", "WHALE_CWD"], "/root/projects");
const defaultWorkspace = firstEnv(["WHALE_DEFAULT_WORKSPACE"], "ezboq");

export const whaleConfig = {
  bot: {
    token: requireEnv("WHALE_DISCORD_TOKEN"),
    name: "ปลาวาฬ",
    icon: "🐋",
    role: "QA Lead",
    modelLabel: "GPT-5.4 Max",
  },
  runtime: {
    model: firstEnv(["WHALE_MODEL"], "gpt-5.4"),
    reasoningEffort: firstEnv(["WHALE_REASONING_EFFORT"], "xhigh"),
    timeoutMs: readNumberEnv(["WHALE_TIMEOUT_MS"], 180000),
    defaultWorkspace,
    cwd: rootCwd,
  },
  workspaces: {
    ezboq: {
      name: "EzBOQ",
      cwd: `${rootCwd}/ezboq`,
      keywords: ["ezboq", "ez boq", "boq", "quotation", "quote builder", "ใบเสนอราคา"],
    },
    imperial_rise: {
      name: "Imperial Rise",
      cwd: `${rootCwd}/imperial-rise`,
      keywords: ["imperial rise", "imperial-rise"],
    },
    vanavard_website: {
      name: "Vanavard Website",
      cwd: `${rootCwd}/vanavard-website`,
      keywords: ["vanavard website", "vanavard", "va website"],
    },
    discord_bots: {
      name: "Discord Bots",
      cwd: `${rootCwd}/discord-bots`,
      keywords: ["discord bots", "discord-bots", "bot bridge", "whale-bot", "starfish-bot"],
    },
    gemma_discord: {
      name: "Gemma Discord",
      cwd: `${rootCwd}/gemma-discord`,
      keywords: ["gemma-discord", "gemma discord"],
    },
  },
  behavior: {
    maxReplyLen: 1900,
    requireMentionInGuild: true,
    allowDm: true,
    emptyPromptReply: "ส่งข้อความมาด้วยครับ 🐋",
    busyReply: "กำลังทำงานอยู่ครับ รอแป๊บนึง 🐋",
    thinkingReply: "🐋 กำลังคิด...",
  },
  team: [
    { name: "ม้าน้ำ", role: "Lead Dev", model: "Claude", icon: "🐴", strength: "Code, Backend, Deploy" },
    { name: "ปลาดาว", role: "Lead Designer", model: "Gemini 3.1 Pro", icon: "⭐", strength: "UI/UX, Image Gen, Social Media" },
    { name: "ปลาวาฬ", role: "QA Lead", model: "GPT-5.4", icon: "🐋", strength: "Testing, Docs, Security, Verification" },
    { name: "เจมม่า", role: "Personal AI", model: "Gemini 3 Pro", icon: "💎", strength: "Tools, Memory, Coordination" },
  ],
  bosses: [
    { name: "บอสสอง", discord: "beaver / shadowsbeaver" },
    { name: "บอสฝน", discord: "snowy1991" },
    { name: "บอสบลู", discord: "oblueo" },
  ],
  projects: [
    "EzBOQ",
    "Imperial Rise",
    "Vanavard Interior",
    "Wendy",
    "Fur and Found",
  ],
};
