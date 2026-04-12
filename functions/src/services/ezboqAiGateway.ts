import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  DEFAULT_MEMORY_NAMESPACE,
  searchProjectMemoryWithLoaders,
  type ProjectMemoryLoader,
} from "./projectMemoryService";

const GEMINI_MODEL_ID = "gemini-2.5-flash";
const DEFAULT_MAX_RESULTS = 3;
const DEFAULT_TEMPERATURE = 0.3;
const DEFAULT_MAX_TOKENS = 2048;
const MAX_RESULTS = 8;

const SYSTEM_PROMPT = `คุณคือ "EzBOQ AI" ผู้เชี่ยวชาญด้านก่อสร้างและประเมินราคา

กฎสำคัญ:
1. ตอบภาษาไทยเสมอ กระชับ ตรงประเด็น
2. ใช้ข้อมูลจาก Project Memory เป็นหลักถ้ามีบริบทเกี่ยวข้อง
3. คำนวณให้เห็นขั้นตอน: ปริมาณ × ราคา/หน่วย = รวม + waste factor
4. แยกระดับราคา (ประหยัด/กลาง/พรีเมียม) เมื่อเป็นไปได้
5. ระบุ waste factor ทุกครั้ง (เช่น กระเบื้อง +10%, ปูน +5%)
6. ถ้าไม่มีข้อมูลราคาที่แน่นอน ให้ระบุช่วงราคาและบอกว่าเป็นราคาประมาณการ
7. ห้ามแต่งข้อมูลราคา ถ้าไม่รู้จริงให้บอกตรงๆ
8. จบด้วยคำแนะนำสั้นๆ (1-2 ประโยค)`;

export interface EzboqAiGatewayOptions {
  maxResults?: number;
  temperature?: number;
  maxTokens?: number;
  memoryNamespace?: string;
  loaders?: ProjectMemoryLoader[];
}

export interface EzboqAiGatewaySource {
  id: string;
  title: string;
  category: string;
  source: "gemma_project_memory";
  score: number;
  updatedAt?: string;
}

export interface EzboqAiGatewayResponse {
  answer: string;
  sources: EzboqAiGatewaySource[];
  model: string;
  tokensUsed?: number;
  retrieval: {
    provider: "project_memory_firestore";
    namespace: string;
    matched: number;
    loaders: ProjectMemoryLoader[];
  };
}

let genai: GoogleGenerativeAI | null = null;

function getGenAI(): GoogleGenerativeAI {
  if (!genai) {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured. Set it in functions/.env");
    }
    genai = new GoogleGenerativeAI(apiKey);
  }
  return genai;
}

function buildPrompt(question: string, contextBlocks: string): string {
  if (!contextBlocks) {
    return [
      "# คำถามผู้ใช้",
      question,
      "",
      "# ข้อกำหนด",
      "- ไม่มีบริบทจาก Project Memory สำหรับคำถามนี้",
      "- ตอบแบบประมาณการที่ปลอดภัย และระบุสมมติฐานให้ชัดเจน",
    ].join("\n");
  }

  return [
    "# ข้อมูลอ้างอิงจาก Project Memory (Gemma-backed)",
    contextBlocks,
    "",
    "---",
    "",
    "# คำถามผู้ใช้",
    question,
  ].join("\n");
}

export async function askEzboqAiGateway(
  question: string,
  options?: EzboqAiGatewayOptions,
): Promise<EzboqAiGatewayResponse> {
  const trimmedQuestion = question.trim();
  const maxResults = Math.max(
    1,
    Math.min(Math.floor(options?.maxResults || DEFAULT_MAX_RESULTS), MAX_RESULTS),
  );
  const temperature = typeof options?.temperature === "number"
    ? Math.max(0, Math.min(options.temperature, 1))
    : DEFAULT_TEMPERATURE;
  const maxTokens = typeof options?.maxTokens === "number"
    ? Math.max(256, Math.min(Math.floor(options.maxTokens), 4096))
    : DEFAULT_MAX_TOKENS;
  const memoryNamespace = String(options?.memoryNamespace || "").trim() || DEFAULT_MEMORY_NAMESPACE;

  const loaders: ProjectMemoryLoader[] = options?.loaders && options.loaders.length > 0
    ? options.loaders
    : ["project_memory"];

  const memoryHits = await searchProjectMemoryWithLoaders(trimmedQuestion, {
    namespace: memoryNamespace,
    limit: maxResults,
    loaders,
  });

  const contextBlocks = memoryHits
    .map((hit, index) =>
      [
        `## Memory ${index + 1}: ${hit.title} [${hit.category}]`,
        hit.content,
      ].join("\n")
    )
    .join("\n\n---\n\n");

  const prompt = buildPrompt(trimmedQuestion, contextBlocks);
  const ai = getGenAI();
  const model = ai.getGenerativeModel({
    model: GEMINI_MODEL_ID,
    systemInstruction: SYSTEM_PROMPT,
    generationConfig: {
      temperature,
      maxOutputTokens: maxTokens,
    },
  });

  const result = await model.generateContent(prompt);
  const response = result.response;

  return {
    answer: response.text(),
    sources: memoryHits.map((hit) => ({
      id: hit.id,
      title: hit.title,
      category: hit.category,
      source: hit.source,
      score: hit.score,
      updatedAt: hit.updatedAt,
    })),
    model: GEMINI_MODEL_ID,
    tokensUsed: response.usageMetadata?.totalTokenCount,
    retrieval: {
      provider: "project_memory_firestore",
      namespace: memoryNamespace,
      matched: memoryHits.length,
      loaders,
    },
  };
}
