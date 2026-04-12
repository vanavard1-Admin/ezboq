/**
 * 💎 Gemma LLM Runtime — Gemini API adapter
 * Normalizes chat, tool calling, and multimodal requests for the bot runtime.
 */

import { Buffer } from 'buffer';
import { config, resolveGeminiModelName } from './config.mjs';

let currentKeyIndex = 0;

const RETRYABLE_STATUSES = new Set([429, 500, 503]);
const RETRY_PASSES = 3;
const RETRY_BASE_DELAY_MS = 1500;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function assertGeminiProvider() {
  if (config.llm.provider !== 'gemini') {
    throw new Error(`Unsupported LLM provider: ${config.llm.provider}`);
  }
}

function getApiKeys() {
  return config.llm.apiKeys.filter(Boolean);
}

function getModelCandidates(preferredModel) {
  return [...new Set([
    resolveGeminiModelName(preferredModel, config.llm.model),
    resolveGeminiModelName(config.llm.fallbackModel),
  ].filter(Boolean))];
}

function normalizeText(value) {
  if (typeof value === 'string') return value;
  if (value == null) return '';
  return JSON.stringify(value);
}

function normalizeToolArgs(args) {
  if (args && typeof args === 'object' && !Array.isArray(args)) return args;
  if (typeof args === 'string') {
    try { return JSON.parse(args); } catch { return { value: args }; }
  }
  return {};
}

function normalizeToolResponse(content) {
  if (!content) return {};
  if (typeof content === 'object') return content;
  try {
    return JSON.parse(content);
  } catch {
    return { text: String(content) };
  }
}

function buildGeminiTools(toolDefinitions = []) {
  const declarations = toolDefinitions
    .map((tool) => tool?.function)
    .filter(Boolean)
    .map((fn) => ({
      name: fn.name,
      description: fn.description,
      parameters: fn.parameters || { type: 'object', properties: {} },
    }));

  return declarations.length > 0
    ? [{ functionDeclarations: declarations }]
    : undefined;
}

function extractSystemInstruction(messages) {
  const parts = messages
    .filter((msg) => msg?.role === 'system')
    .map((msg) => normalizeText(msg.content).trim())
    .filter(Boolean);

  return parts.join('\n\n').trim();
}

function toGeminiContents(messages) {
  const contents = [];

  for (const msg of messages) {
    if (!msg || msg.role === 'system') continue;

    if (msg.role === 'tool') {
      contents.push({
        role: 'user',
        parts: [{
          functionResponse: {
            name: msg.name || 'tool',
            response: normalizeToolResponse(msg.content),
          },
        }],
      });
      continue;
    }

    if ((msg.role === 'assistant' || msg.role === 'model') && Array.isArray(msg._geminiParts) && msg._geminiParts.length > 0) {
      contents.push({
        role: 'model',
        parts: msg._geminiParts,
      });
      continue;
    }

    if (Array.isArray(msg.tool_calls) && msg.tool_calls.length > 0) {
      const parts = [];
      const text = normalizeText(msg.content).trim();
      if (text) parts.push({ text });

      for (const call of msg.tool_calls) {
        const name = call?.function?.name;
        if (!name) continue;
        parts.push({
          functionCall: {
            name,
            args: normalizeToolArgs(call.function.arguments),
          },
        });
      }

      if (parts.length > 0) contents.push({ role: 'model', parts });
      continue;
    }

    const text = normalizeText(msg.content).trim();
    if (!text) continue;

    contents.push({
      role: msg.role === 'assistant' || msg.role === 'model' ? 'model' : 'user',
      parts: [{ text }],
    });
  }

  return contents;
}

async function requestGemini(buildBody, { model, timeoutMs = config.llm.timeoutMs } = {}) {
  assertGeminiProvider();
  const apiKeys = getApiKeys();
  if (apiKeys.length === 0) {
    throw new Error('GEMINI_API_KEY not set');
  }

  const models = getModelCandidates(model);
  let lastError = null;
  let lastRetryable = false;

  for (let pass = 0; pass < RETRY_PASSES; pass++) {
    lastRetryable = false;

    for (const candidateModel of models) {
      for (let ki = 0; ki < apiKeys.length; ki++) {
        const keyIndex = (currentKeyIndex + ki) % apiKeys.length;
        const apiKey = apiKeys[keyIndex];
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${candidateModel}:generateContent?key=${apiKey}`;

        try {
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(buildBody(candidateModel)),
            signal: AbortSignal.timeout(timeoutMs),
          });

          if (!res.ok) {
            const errText = await res.text().catch(() => '');
            const error = new Error(`Gemini[${candidateModel}] ${res.status}: ${errText.slice(0, 200)}`);
            error.status = res.status;
            throw error;
          }

          currentKeyIndex = keyIndex;
          return await res.json();
        } catch (err) {
          lastError = err;
          const status = err?.status;
          const retryable = RETRYABLE_STATUSES.has(status) || /429|500|503|aborted due to timeout|timed out/i.test(err?.message || '');
          lastRetryable = lastRetryable || retryable;
          if (retryable) continue;
          throw err;
        }
      }
    }

    if (!lastRetryable || pass >= RETRY_PASSES - 1) break;
    await sleep(RETRY_BASE_DELAY_MS * (pass + 1));
  }

  throw lastError || new Error('All Gemini models/keys exhausted');
}

function normalizeGeminiResponse(data) {
  const candidate = data?.candidates?.[0] || {};
  const parts = candidate?.content?.parts || [];
  const content = parts
    .filter((part) => typeof part.text === 'string')
    .map((part) => part.text)
    .join('\n')
    .trim();

  const tool_calls = parts
    .filter((part) => part.functionCall)
    .map((part) => ({
      function: {
        name: part.functionCall.name,
        arguments: normalizeToolArgs(part.functionCall.args),
      },
    }));

  return {
    message: {
      role: 'assistant',
      content,
      tool_calls,
      _geminiParts: parts,
      _finishReason: candidate?.finishReason || '',
    },
    finishReason: candidate?.finishReason || '',
    raw: data,
  };
}

export function assertLlmConfigured() {
  assertGeminiProvider();
  if (getApiKeys().length === 0) {
    throw new Error('GEMINI_API_KEY not set');
  }
}

export function getLlmStatusSummary() {
  return {
    provider: config.llm.provider,
    model: config.llm.model,
    fallbackModel: config.llm.fallbackModel,
    keyCount: getApiKeys().length,
  };
}

export async function chatLlm(messages, {
  tools = [],
  useTools = true,
  temperature = config.llm.generationConfig.temperature,
  maxOutputTokens = config.llm.generationConfig.maxOutputTokens,
  timeoutMs = config.llm.timeoutMs,
  model,
} = {}) {
  const systemInstruction = extractSystemInstruction(messages);
  const contents = toGeminiContents(messages);
  const geminiTools = useTools ? buildGeminiTools(tools) : undefined;

  const data = await requestGemini(() => ({
    contents,
    systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
    generationConfig: {
      temperature,
      maxOutputTokens,
      topP: config.llm.generationConfig.topP,
    },
    tools: geminiTools,
  }), { model, timeoutMs });

  return normalizeGeminiResponse(data);
}

export async function generateText(systemPrompt, userPrompt, options = {}) {
  const result = await chatLlm([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ], {
    useTools: false,
    ...options,
  });

  return result.message?.content || '';
}

export async function analyzeImageWithLlm(imageUrl, prompt = 'วิเคราะห์รูปนี้ให้หน่อย', { mimeType } = {}) {
  const imgRes = await fetch(imageUrl);
  if (!imgRes.ok) {
    throw new Error(`Image fetch failed: ${imgRes.status}`);
  }

  const buffer = await imgRes.arrayBuffer();
  const base64 = Buffer.from(buffer).toString('base64');
  const resolvedMimeType = mimeType || imgRes.headers.get('content-type') || 'image/jpeg';

  const data = await requestGemini((model) => ({
    contents: [{
      role: 'user',
      parts: [
        { text: prompt },
        { inlineData: { mimeType: resolvedMimeType, data: base64 } },
      ],
    }],
    generationConfig: {
      temperature: 0.5,
      maxOutputTokens: 1024,
      topP: config.llm.generationConfig.topP,
    },
  }), { model: config.llm.model });

  return normalizeGeminiResponse(data).message?.content || '';
}
