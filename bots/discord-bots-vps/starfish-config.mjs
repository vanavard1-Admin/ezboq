import { firstEnv, readNumberEnv, requireEnv } from "./runtime-env.mjs";

const rootCwd = firstEnv(["DISCORD_BOTS_ROOT_CWD", "STARFISH_CWD"], "/root/projects");
const defaultWorkspace = firstEnv(["STARFISH_DEFAULT_WORKSPACE"], "ezboq");

export const starfishConfig = {
  bot: {
    token: requireEnv("STARFISH_DISCORD_TOKEN"),
    name: "ปลาดาว",
    icon: "⭐",
    role: "Lead Designer",
    modelLabel: "Gemini 3.1 Pro",
  },
  runtime: {
    model: firstEnv(["STARFISH_MODEL"], "gemini-3.1-pro-preview"),
    timeoutMs: readNumberEnv(["STARFISH_TIMEOUT_MS"], 300000),
    defaultWorkspace,
    cwd: rootCwd,
    geminiApiKey: firstEnv(["STARFISH_GEMINI_API_KEY", "GEMINI_API_KEY"], ""),
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
    emptyPromptReply: "ส่งข้อความมาด้วยค่ะ ⭐",
    busyReply: "กำลังทำงานอยู่ค่ะ รอแป๊บนึงนะคะ ⭐",
    thinkingReply: "⭐ กำลังคิด...",
  },
  team: [
    { name: "ม้าน้ำ", role: "Lead Dev", model: "Claude", icon: "🐴", strength: "Code, Backend, Deploy" },
    { name: "ปลาดาว", role: "Lead Designer", model: "Gemini 3.1 Pro", icon: "⭐", strength: "UI/UX, Brand, Image Gen, Social Media" },
    { name: "ปลาวาฬ", role: "QA Lead", model: "GPT-5.4", icon: "🐋", strength: "Testing, Docs, Security" },
    { name: "เจมม่า", role: "Personal AI", model: "Gemini 3 Pro", icon: "💎", strength: "Tools, Memory, Coordination" },
  ],
  bosses: [
    { name: "บอสสอง", discord: "beaver / shadowsbeaver" },
    { name: "บอสฝน", discord: "snowy1991" },
    { name: "บอสนิด้า", discord: "nidasgap" },
    { name: "บอสบลู", discord: "oblueo" },
  ],
  projects: [
    "EzBOQ",
    "Imperial Rise",
    "Wendy",
    "Fur and Found",
    "Vanavard Interior",
  ],
};
