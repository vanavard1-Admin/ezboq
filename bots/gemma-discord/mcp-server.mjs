/**
 * 💎 Gemma MCP Server — Expose Gemma as an MCP server for Claude Code
 * JSON-RPC 2.0 over stdin/stdout (stdio transport)
 * Run: node mcp-server.mjs
 */

import { createInterface } from 'readline';
import { runAgents, multiResearch, companyMeeting } from './agents.mjs';
import { searchKnowledgeBase } from './rag.mjs';
import { generateText, getLlmStatusSummary } from './llm.mjs';

// ─── Server Info ────────────────────────────────────
const SERVER_INFO = {
  name: 'gemma-mcp',
  version: '1.0.0',
};

const CAPABILITIES = {
  tools: {},
};

// ─── Tool Definitions ───────────────────────────────
const TOOLS = [
  {
    name: 'gemma_chat',
    description: 'Send a message to Gemma AI and get a response. Gemma is a Thai-speaking AI assistant specialized in interior design, BOQ estimation, content creation, and marketing.',
    inputSchema: {
      type: 'object',
      properties: {
        message: { type: 'string', description: 'The message to send to Gemma' },
        role: {
          type: 'string',
          description: 'Optional role/persona (e.g. researcher, designer, estimator, writer, advisor, marketer)',
          default: 'assistant',
        },
        temperature: {
          type: 'number',
          description: 'Temperature for response creativity (0.0-1.0)',
          default: 0.7,
        },
      },
      required: ['message'],
    },
  },
  {
    name: 'gemma_research',
    description: 'Multi-angle research using parallel Gemma agents. Sends 4 agents (researcher, analyst, estimator, advisor) to investigate a topic from different perspectives.',
    inputSchema: {
      type: 'object',
      properties: {
        topic: { type: 'string', description: 'The topic to research from multiple angles' },
      },
      required: ['topic'],
    },
  },
  {
    name: 'gemma_meeting',
    description: 'Simulate a company meeting with 10 AI executives (CEO, researcher, analyst, designer, writer, planner, estimator, marketer, advisor, critic) discussing an agenda.',
    inputSchema: {
      type: 'object',
      properties: {
        agenda: { type: 'string', description: 'The meeting agenda or topic to discuss' },
      },
      required: ['agenda'],
    },
  },
  {
    name: 'gemma_agents',
    description: 'Spawn parallel Gemma agents to work on multiple tasks simultaneously. Each task can have a different role. Max 10 agents.',
    inputSchema: {
      type: 'object',
      properties: {
        tasks: {
          type: 'array',
          description: 'Array of tasks. Each item can be a string or {task: "...", role: "..."}',
          items: {
            oneOf: [
              { type: 'string' },
              {
                type: 'object',
                properties: {
                  task: { type: 'string' },
                  role: { type: 'string' },
                  temperature: { type: 'number' },
                },
                required: ['task'],
              },
            ],
          },
        },
      },
      required: ['tasks'],
    },
  },
  {
    name: 'gemma_debate',
    description: 'Run a structured debate between two opposing Gemma agents on a topic. One argues for, one against, then a judge summarizes.',
    inputSchema: {
      type: 'object',
      properties: {
        topic: { type: 'string', description: 'The topic or proposition to debate' },
        rounds: { type: 'number', description: 'Number of debate rounds (1-3)', default: 2 },
      },
      required: ['topic'],
    },
  },
  {
    name: 'gemma_knowledge',
    description: 'Search Gemma\'s knowledge base. Contains data on interior design, construction materials, pricing, Thai business, and more.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query for the knowledge base' },
        category: {
          type: 'string',
          description: 'Optional category filter (e.g. interior_design, construction, marketing, ezboq)',
        },
        limit: { type: 'number', description: 'Max results to return', default: 5 },
      },
      required: ['query'],
    },
  },
];

// ─── Direct LLM Call ────────────────────────────────
async function chatWithGemma(message, role = 'assistant', temperature = 0.7) {
  const ROLE_PROMPTS = {
    assistant: 'คุณคือ เจมม่า AI assistant ตอบภาษาไทย กระชับ ตรงประเด็น',
    researcher: 'คุณคือนักวิจัย ค้นหาข้อมูล ให้ข้อมูลที่ถูกต้องมีแหล่งอ้างอิง',
    analyst: 'คุณคือนักวิเคราะห์ วิเคราะห์ข้อดี-ข้อเสีย ความเสี่ยง',
    designer: 'คุณคือนักออกแบบ คิด concept ออกแบบ UX/UI แนะนำ style',
    writer: 'คุณคือ content writer เขียนเนื้อหาดึงดูดใจ',
    estimator: 'คุณคือนักประเมินราคา คำนวณต้นทุน ราคาวัสดุ',
    advisor: 'คุณคือที่ปรึกษาอาวุโส ให้คำแนะนำจากประสบการณ์',
    marketer: 'คุณคือนักการตลาด คิด strategy targeting pricing',
  };

  const systemPrompt = ROLE_PROMPTS[role] || ROLE_PROMPTS.assistant;
  return generateText(systemPrompt, message, {
    temperature,
    maxOutputTokens: 2048,
  });
}

// ─── Debate Implementation ──────────────────────────
async function runDebate(topic, rounds = 2) {
  const safeRounds = Math.min(Math.max(1, rounds), 3);
  const debateLog = [];

  console.error(`[MCP-DEBATE] Topic: ${topic} — ${safeRounds} rounds`);

  // Opening arguments
  const [forArg, againstArg] = await Promise.all([
    chatWithGemma(
      `คุณเป็นฝ่ายสนับสนุน ให้เหตุผลว่าทำไม "${topic}" ถึงเป็นความคิดที่ดี ตอบ 3-5 ประเด็น`,
      'advisor', 0.7
    ),
    chatWithGemma(
      `คุณเป็นฝ่ายค้าน ให้เหตุผลว่าทำไม "${topic}" ถึงมีปัญหา ตอบ 3-5 ประเด็น`,
      'analyst', 0.7
    ),
  ]);

  debateLog.push({ round: 0, side: 'for', argument: forArg });
  debateLog.push({ round: 0, side: 'against', argument: againstArg });

  // Subsequent rounds — each side responds to the other
  for (let r = 1; r < safeRounds; r++) {
    const lastFor = debateLog.filter(d => d.side === 'for').pop().argument;
    const lastAgainst = debateLog.filter(d => d.side === 'against').pop().argument;

    const [rebuttalFor, rebuttalAgainst] = await Promise.all([
      chatWithGemma(
        `คุณเป็นฝ่ายสนับสนุน "${topic}"\nฝ่ายค้านพูดว่า:\n${lastAgainst}\n\nโต้แย้งกลับ 2-3 ประเด็น`,
        'advisor', 0.7
      ),
      chatWithGemma(
        `คุณเป็นฝ่ายค้าน "${topic}"\nฝ่ายสนับสนุนพูดว่า:\n${lastFor}\n\nโต้แย้งกลับ 2-3 ประเด็น`,
        'analyst', 0.7
      ),
    ]);

    debateLog.push({ round: r, side: 'for', argument: rebuttalFor });
    debateLog.push({ round: r, side: 'against', argument: rebuttalAgainst });
  }

  // Judge summarizes
  const allArguments = debateLog.map(d =>
    `[${d.side === 'for' ? 'สนับสนุน' : 'ค้าน'}] Round ${d.round}: ${d.argument}`
  ).join('\n\n');

  const judgment = await chatWithGemma(
    `คุณเป็นกรรมการตัดสิน debate หัวข้อ "${topic}"\n\nข้อโต้แย้งทั้งหมด:\n${allArguments}\n\nสรุป: ฝ่ายไหนมีเหตุผลน่าเชื่อถือกว่า ให้คะแนน 1-10 ทั้งสองฝ่าย พร้อมสรุปประเด็นสำคัญ`,
    'researcher', 0.5
  );

  return {
    topic,
    rounds: safeRounds,
    debate: debateLog,
    judgment,
  };
}

// ─── Tool Execution ─────────────────────────────────
async function executeTool(name, args) {
  switch (name) {
    case 'gemma_chat': {
      const response = await chatWithGemma(
        args.message,
        args.role || 'assistant',
        args.temperature ?? 0.7
      );
      return response;
    }

    case 'gemma_research': {
      const result = await multiResearch(args.topic);
      return formatAgentResults(result);
    }

    case 'gemma_meeting': {
      const result = await companyMeeting(args.agenda);
      return formatAgentResults(result);
    }

    case 'gemma_agents': {
      const result = await runAgents(args.tasks);
      return formatAgentResults(result);
    }

    case 'gemma_debate': {
      const result = await runDebate(args.topic, args.rounds || 2);
      return formatDebateResults(result);
    }

    case 'gemma_knowledge': {
      const results = searchKnowledgeBase(
        args.query,
        args.category || null,
        args.limit || 5
      );
      if (results.length === 0) {
        return `No knowledge found for: ${args.query}`;
      }
      return results.map(r =>
        `[${r.category}] ${r.title}\n${r.content}\n(source: ${r.source || 'n/a'})`
      ).join('\n\n---\n\n');
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// ─── Formatters ─────────────────────────────────────
function formatAgentResults(result) {
  if (result.error) return `Error: ${result.error}`;

  const header = `${result.company || 'Gemma Agents'} — ${result.agentCount} agents, ${result.elapsed}`;
  const body = (result.results || []).map(r =>
    `[${r.role}] ${r.task}\n${r.result || r.error || '(no output)'}`
  ).join('\n\n---\n\n');

  return `${header}\n\n${body}`;
}

function formatDebateResults(result) {
  const header = `Debate: ${result.topic} (${result.rounds} rounds)`;

  const body = result.debate.map(d => {
    const label = d.side === 'for' ? 'FOR (สนับสนุน)' : 'AGAINST (ค้าน)';
    return `[Round ${d.round} - ${label}]\n${d.argument}`;
  }).join('\n\n');

  return `${header}\n\n${body}\n\n=== JUDGMENT ===\n${result.judgment}`;
}

// ─── JSON-RPC 2.0 Handler ───────────────────────────
function makeResponse(id, result) {
  return { jsonrpc: '2.0', id, result };
}

function makeError(id, code, message, data) {
  const err = { jsonrpc: '2.0', id, error: { code, message } };
  if (data !== undefined) err.error.data = data;
  return err;
}

async function handleRequest(request) {
  const { id, method, params } = request;

  switch (method) {
    case 'initialize':
      return makeResponse(id, {
        protocolVersion: '2024-11-05',
        serverInfo: SERVER_INFO,
        capabilities: CAPABILITIES,
      });

    case 'notifications/initialized':
      // Client acknowledges initialization — no response needed for notifications
      return null;

    case 'tools/list':
      return makeResponse(id, { tools: TOOLS });

    case 'tools/call': {
      const toolName = params?.name;
      const toolArgs = params?.arguments || {};

      if (!toolName) {
        return makeError(id, -32602, 'Missing tool name');
      }

      const toolDef = TOOLS.find(t => t.name === toolName);
      if (!toolDef) {
        return makeError(id, -32602, `Unknown tool: ${toolName}`);
      }

      try {
        const result = await executeTool(toolName, toolArgs);
        return makeResponse(id, {
          content: [{ type: 'text', text: typeof result === 'string' ? result : JSON.stringify(result) }],
        });
      } catch (err) {
        return makeResponse(id, {
          content: [{ type: 'text', text: `Error: ${err.message}` }],
          isError: true,
        });
      }
    }

    case 'ping':
      return makeResponse(id, {});

    default:
      // Unknown method
      if (id !== undefined) {
        return makeError(id, -32601, `Method not found: ${method}`);
      }
      // Notifications (no id) for unknown methods are silently ignored
      return null;
  }
}

// ─── Stdio Transport ────────────────────────────────
function startServer() {
  const llm = getLlmStatusSummary();
  console.error('[MCP] Gemma MCP Server starting on stdio...');
  console.error(`[MCP] LLM: ${llm.provider} (${llm.model}${llm.fallbackModel ? ` → ${llm.fallbackModel}` : ''})`);

  const rl = createInterface({
    input: process.stdin,
    terminal: false,
  });

  let buffer = '';

  rl.on('line', async (line) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    let request;
    try {
      request = JSON.parse(trimmed);
    } catch {
      const errResp = makeError(null, -32700, 'Parse error');
      process.stdout.write(JSON.stringify(errResp) + '\n');
      return;
    }

    try {
      const response = await handleRequest(request);
      if (response !== null) {
        process.stdout.write(JSON.stringify(response) + '\n');
      }
    } catch (err) {
      console.error(`[MCP] Handler error:`, err.message);
      const errResp = makeError(request.id, -32603, `Internal error: ${err.message}`);
      process.stdout.write(JSON.stringify(errResp) + '\n');
    }
  });

  rl.on('close', () => {
    console.error('[MCP] stdin closed, shutting down');
    process.exit(0);
  });

  process.on('SIGINT', () => {
    console.error('[MCP] SIGINT received, shutting down');
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.error('[MCP] SIGTERM received, shutting down');
    process.exit(0);
  });
}

// ─── Main ───────────────────────────────────────────
startServer();
