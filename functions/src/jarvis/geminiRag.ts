/**
 * Gemini RAG — Construction Knowledge AI
 *
 * ค้นหา knowledge base → ส่ง Gemini Flash ตอบ
 * ใช้สำหรับ EzBOQ AI Assistant (เว็บ / LINE / Discord)
 */
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  DEFAULT_MEMORY_NAMESPACE,
  searchProjectMemoryWithLoaders,
} from "../services/projectMemoryService";

// ─── Types ──────────────────────────────────────
interface KnowledgeEntry {
  id: string;
  category: string;
  title: string;
  content: string;
}

interface RagResult {
  entry: KnowledgeEntry;
  score: number;
}

export interface GeminiRagResponse {
  answer: string;
  sources: { id: string; title: string; category: string }[];
  model: string;
  tokensUsed?: number;
}

// ─── RAG Search ─────────────────────────────────
export async function searchKnowledge(query: string, limit = 3): Promise<RagResult[]> {
  const hits = await searchProjectMemoryWithLoaders(query, {
    namespace: DEFAULT_MEMORY_NAMESPACE,
    limit,
    loaders: ["project_memory", "code_index", "incidents", "project_issues", "test_observations"],
  });

  return hits.map((hit) => ({
    entry: {
      id: hit.id,
      category: hit.category,
      title: hit.title,
      content: hit.content,
    },
    score: hit.score,
  }));
}

// ─── Gemini Client ──────────────────────────────
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

const SYSTEM_PROMPT = `คุณคือ "EzBOQ AI" ผู้เชี่ยวชาญด้านก่อสร้างและประเมินราคา

กฎสำคัญ:
1. ตอบภาษาไทยเสมอ กระชับ ตรงประเด็น
2. ถ้ามีข้อมูลจาก Knowledge Base ให้ใช้เป็นหลัก อ้างอิงตัวเลข/ราคาจากข้อมูลที่ให้
3. คำนวณให้เห็นขั้นตอน: ปริมาณ × ราคา/หน่วย = รวม + waste factor
4. แยกระดับราคา (ประหยัด/กลาง/พรีเมียม) เมื่อเป็นไปได้
5. ระบุ waste factor ทุกครั้ง (เช่น กระเบื้อง +10%, ปูน +5%)
6. ถ้าไม่มีข้อมูลราคาที่แน่นอน ให้ระบุช่วงราคาและบอกว่าเป็นราคาประมาณการ
7. ห้ามแต่งข้อมูลราคา ถ้าไม่รู้จริงให้บอกตรงๆ
8. จบด้วยคำแนะนำสั้นๆ (1-2 ประโยค)`;

/**
 * Ask Gemini with RAG context
 */
export async function askGeminiRag(
  question: string,
  options?: {
    maxResults?: number;
    temperature?: number;
    maxTokens?: number;
  },
): Promise<GeminiRagResponse> {
  const { maxResults = 3, temperature = 0.3, maxTokens = 2048 } = options || {};

  // 1. RAG search
  const ragResults = await searchKnowledge(question, maxResults);

  // 2. Build context
  const ragContext = ragResults.length > 0
    ? ragResults.map((r) =>
      `## ${r.entry.title} [${r.entry.category}]\n${r.entry.content}`
    ).join("\n\n---\n\n")
    : "";

  const prompt = ragContext
    ? `# ข้อมูลอ้างอิงจาก Knowledge Base (ใช้ข้อมูลนี้ตอบเป็นหลัก)\n\n${ragContext}\n\n---\n\n# คำถาม\n${question}`
    : question;

  // 3. Call Gemini Flash
  const ai = getGenAI();
  const model = ai.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: SYSTEM_PROMPT,
    generationConfig: {
      temperature,
      maxOutputTokens: maxTokens,
    },
  });

  const result = await model.generateContent(prompt);
  const response = result.response;
  const answer = response.text();

  return {
    answer,
    sources: ragResults.map((r) => ({
      id: r.entry.id,
      title: r.entry.title,
      category: r.entry.category,
    })),
    model: "gemini-2.5-flash",
    tokensUsed: response.usageMetadata?.totalTokenCount,
  };
}
