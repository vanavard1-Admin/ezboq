/**
 * 💎 Gemma Discord Bot — Tools v2 (30 Functions)
 * BOQ/Interior + Business/Sales + Research/Web + Self-Upgrade + Agent Company (12 roles)
 */

import { promises as fs } from 'fs';
import { resolve, dirname, extname, basename } from 'path';
import { fileURLToPath } from 'url';
import { config } from './config.mjs';
import {
  webSearch, webFetch, readOwnFile, saveKnowledge, searchMyKnowledge, getMyRecentKnowledge, appendToSoul, getUpgradeLog,
  listProjectFiles, readProjectFile, searchProjectFiles,
} from './research.mjs';
import { runAgents, planAndExecute, multiResearch, companyMeeting, expertPanel, getCompanyRoles, chainOfAgents, debate, tournament } from './agents.mjs';
import { buildMaterialCatalog } from './material-catalog.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const GENERATED_FILES_DIR = resolve(__dirname, 'generated-files');

// ─── Tool Definitions ───────────────────────────
export const toolDefinitions = [
  // === Construction & Interior ===
  {
    type: 'function',
    function: {
      name: 'calculate_boq',
      description: 'คำนวณราคางานก่อสร้าง/ตกแต่งภายใน จากพื้นที่และประเภทงาน',
      parameters: {
        type: 'object',
        properties: {
          area_sqm: { type: 'number', description: 'พื้นที่ (ตร.ม.)' },
          work_type: { type: 'string', enum: ['renovation', 'new_build', 'interior', 'built_in'], description: 'ประเภทงาน' },
          tier: { type: 'string', enum: ['value', 'standard', 'premium'], description: 'ระดับวัสดุ (default: standard)' },
          include_vat: { type: 'boolean', description: 'รวม VAT 7% (default: true)' },
        },
        required: ['area_sqm', 'work_type'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_material_price',
      description: 'ราคาวัสดุก่อสร้าง/ตกแต่งอ้างอิงแบบเร็ว (static reference) สำหรับตอบสั้นๆ ถ้าต้องการ source จริงหรือหลายไฟล์ให้ใช้ build_material_catalog',
      parameters: {
        type: 'object',
        properties: {
          material: { type: 'string', description: 'ชื่อวัสดุ เช่น ปูนซีเมนต์, กระเบื้อง, สีทาบ้าน' },
        },
        required: ['material'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'estimate_room',
      description: 'ประเมินราคาตกแต่งห้อง (ห้องนอน, ห้องน้ำ, ห้องครัว, ห้องนั่งเล่น)',
      parameters: {
        type: 'object',
        properties: {
          room_type: { type: 'string', enum: ['bedroom', 'bathroom', 'kitchen', 'living', 'office', 'closet'], description: 'ประเภทห้อง' },
          area_sqm: { type: 'number', description: 'พื้นที่ห้อง (ตร.ม.)' },
          style: { type: 'string', enum: ['minimal', 'japanese', 'industrial', 'scandinavian', 'luxury', 'tropical'], description: 'สไตล์' },
          tier: { type: 'string', enum: ['value', 'standard', 'premium'] },
        },
        required: ['room_type', 'area_sqm'],
      },
    },
  },

  // === Math & Conversion ===
  {
    type: 'function',
    function: {
      name: 'calculate',
      description: 'คำนวณทั่วไป: ส่วนลด, VAT, กำไร, margin, commission, พื้นที่, ปริมาตร',
      parameters: {
        type: 'object',
        properties: {
          expression: { type: 'string', description: 'สูตรคำนวณ เช่น "250000 * 0.93" หรือ "15% of 1200000"' },
          context: { type: 'string', description: 'บริบท เช่น "ส่วนลด", "commission", "VAT"' },
        },
        required: ['expression'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'convert_unit',
      description: 'แปลงหน่วย: ตร.ม.↔ตร.วา↔ไร่, ม.↔ฟุต↔นิ้ว, kg↔lb, ℃↔℉',
      parameters: {
        type: 'object',
        properties: {
          value: { type: 'number', description: 'ค่าที่ต้องการแปลง' },
          from_unit: { type: 'string' },
          to_unit: { type: 'string' },
        },
        required: ['value', 'from_unit', 'to_unit'],
      },
    },
  },

  // === Business & Sales ===
  {
    type: 'function',
    function: {
      name: 'get_plan_info',
      description: 'ข้อมูลแพ็กเกจ EzBOQ (Free/Pro/Business)',
      parameters: {
        type: 'object',
        properties: {
          plan_id: { type: 'string', enum: ['free', 'solo', 'team', 'all'] },
        },
        required: ['plan_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'calculate_commission',
      description: 'คำนวณ affiliate commission จาก Lazada/Shopee',
      parameters: {
        type: 'object',
        properties: {
          sale_amount: { type: 'number', description: 'ยอดขาย (บาท)' },
          commission_rate: { type: 'number', description: 'อัตรา commission (%)' },
          platform: { type: 'string', enum: ['lazada', 'shopee', 'tiktok'], description: 'แพลตฟอร์ม' },
        },
        required: ['sale_amount'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'generate_caption',
      description: 'สร้าง caption สำหรับโพสขายของ/content social media',
      parameters: {
        type: 'object',
        properties: {
          product: { type: 'string', description: 'สินค้า/หัวข้อ' },
          platform: { type: 'string', enum: ['facebook', 'instagram', 'tiktok', 'line', 'lazada'], description: 'แพลตฟอร์ม' },
          style: { type: 'string', enum: ['hook', 'storytelling', 'review', 'promotion', 'educational', 'funny'], description: 'สไตล์เขียน' },
          include_hashtags: { type: 'boolean', description: 'ใส่ hashtag หรือไม่' },
        },
        required: ['product'],
      },
    },
  },

  // === Translation & Language ===
  {
    type: 'function',
    function: {
      name: 'translate',
      description: 'แปลภาษา: ไทย↔อังกฤษ↔ญี่ปุ่น↔เกาหลี↔จีน',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'ข้อความที่ต้องการแปล' },
          from_lang: { type: 'string', enum: ['th', 'en', 'ja', 'ko', 'zh'], description: 'ภาษาต้นทาง (auto-detect ถ้าไม่ระบุ)' },
          to_lang: { type: 'string', enum: ['th', 'en', 'ja', 'ko', 'zh'], description: 'ภาษาปลายทาง' },
        },
        required: ['text', 'to_lang'],
      },
    },
  },

  // === Date & Schedule ===
  {
    type: 'function',
    function: {
      name: 'get_datetime',
      description: 'วันที่/เวลาปัจจุบัน, คำนวณวัน (กี่วันจากนี้, วันอะไร)',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'เช่น "now", "next friday", "+30 days", "2026-05-01 to 2026-06-15"' },
        },
        required: ['query'],
      },
    },
  },

  // === Summarize & Analyze ===
  {
    type: 'function',
    function: {
      name: 'summarize',
      description: 'สรุปข้อความยาว ให้สั้นกระชับ',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'ข้อความที่ต้องการสรุป' },
          style: { type: 'string', enum: ['bullets', 'paragraph', 'action_items', 'tldr'], description: 'รูปแบบสรุป' },
          max_points: { type: 'number', description: 'จำนวน bullet points สูงสุด' },
        },
        required: ['text'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_file',
      description: 'สร้างไฟล์สำหรับส่งใน Discord เช่น CSV, TXT, Markdown, JSON, HTML หรือไฟล์ที่เปิดใน Excel ได้',
      parameters: {
        type: 'object',
        properties: {
          filename: { type: 'string', description: 'ชื่อไฟล์ เช่น material-prices-apr-2026.csv' },
          content: { type: 'string', description: 'เนื้อหาไฟล์' },
          format: { type: 'string', enum: ['txt', 'md', 'csv', 'tsv', 'json', 'html', 'xlsx'], description: 'ชนิดไฟล์ที่ต้องการ' },
          description: { type: 'string', description: 'คำอธิบายสั้นๆ ของไฟล์' },
        },
        required: ['filename', 'content', 'format'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'build_material_catalog',
      description: 'ดึง catalog ราคาวัสดุก่อสร้างจาก source จริงหลาย provider เช่น HomePro, DoHome, SCG HOME และสร้าง master catalog + แยกหลายหมวดหลายไฟล์พร้อมลิงก์อ้างอิงสินค้า',
      parameters: {
        type: 'object',
        properties: {
          categories: {
            type: 'array',
            description: 'หมวดที่ต้องการ เช่น cement-mortar, tiles-flooring, paint-waterproofing, roofing-ceiling, plumbing-sanitary, electrical, doors-windows, masonry-blocks',
            items: { type: 'string' },
          },
          max_items_per_category: { type: 'number', description: 'จำนวนรายการสูงสุดต่อหมวด (default: 180)' },
          provider: {
            type: 'string',
            enum: ['homepro', 'dohome', 'scg', 'thaiwatsadu', 'all'],
            description: 'source provider เดี่ยว หรือ all (Thai Watsadu ใช้ readable mirror ของ official pages ใน server-side runtime)',
          },
          providers: {
            type: 'array',
            description: 'ระบุหลาย provider พร้อมกัน เช่น [homepro, dohome, scg]',
            items: { type: 'string', enum: ['homepro', 'dohome', 'scg', 'thaiwatsadu', 'all'] },
          },
          filename_prefix: { type: 'string', description: 'prefix ของชื่อไฟล์ เช่น ezboq-material-catalog' },
        },
      },
    },
  },

  // === Research & Web ===
  {
    type: 'function',
    function: {
      name: 'web_search',
      description: 'ค้นหาข้อมูลจากอินเทอร์เน็ต (DuckDuckGo) เพื่อตอบคำถามที่ต้องการข้อมูลใหม่',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'คำค้น เช่น "ราคาปูนซีเมนต์ 2026" หรือ "discord.js v14 tutorial"' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'web_fetch',
      description: 'ดึงเนื้อหาจาก URL (เว็บไซต์/API) แล้วแปลงเป็น text',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'URL ที่ต้องการดึงข้อมูล' },
          max_chars: { type: 'number', description: 'จำนวนตัวอักษรสูงสุด (default: 3000)' },
        },
        required: ['url'],
      },
    },
  },

  // === Self-Knowledge ===
  {
    type: 'function',
    function: {
      name: 'save_knowledge',
      description: 'บันทึกข้อมูลที่ค้นมาได้ลง knowledge base เพื่อจำไว้ใช้ทีหลัง',
      parameters: {
        type: 'object',
        properties: {
          topic: { type: 'string', description: 'หัวข้อ เช่น "ราคาปูนซีเมนต์ 2026"' },
          content: { type: 'string', description: 'เนื้อหาที่ต้องการจำ' },
          source: { type: 'string', description: 'แหล่งที่มา (URL หรือชื่อ)' },
        },
        required: ['topic', 'content'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_knowledge',
      description: 'ค้นหาจาก knowledge base ที่เคยบันทึกไว้',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'คำค้น' },
        },
        required: ['query'],
      },
    },
  },

  // === Self-Upgrade ===
  {
    type: 'function',
    function: {
      name: 'read_own_file',
      description: 'อ่านไฟล์ source code ของตัวเอง (เพื่อเข้าใจความสามารถปัจจุบัน)',
      parameters: {
        type: 'object',
        properties: {
          filename: { type: 'string', enum: ['bot.mjs', 'config.mjs', 'soul.mjs', 'tools.mjs', 'memory.mjs', 'skills.mjs', 'research.mjs', 'agents.mjs', 'rag.mjs', 'secretary.mjs', 'cron.mjs', 'evolution.mjs', 'training.mjs', 'workflows.mjs', 'logger.mjs', 'eval.mjs', 'package.json'], description: 'ชื่อไฟล์' },
        },
        required: ['filename'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_project_files',
      description: 'ไล่ดูไฟล์ใน project surface ที่อนุญาต เช่น ezboq, game, vanavard, pet, self เพื่อให้เจมม่าอ่าน repo ได้กว้างกว่าเดิม',
      parameters: {
        type: 'object',
        properties: {
          project: { type: 'string', enum: ['self', 'ezboq', 'game', 'vanavard', 'pet'], description: 'โปรเจกต์ที่ต้องการดู' },
          path: { type: 'string', description: 'path ภายใน project เช่น apps/web/src หรือ functions/src' },
          depth: { type: 'number', description: 'ความลึกในการไล่ดูไฟล์ (default: 3)' },
          max_results: { type: 'number', description: 'จำนวนไฟล์สูงสุดที่ต้องการ (default: 80)' },
        },
        required: ['project'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'read_project_file',
      description: 'อ่านไฟล์จริงจาก project surface ที่อนุญาต พร้อมเลือกช่วงบรรทัด เช่น ezboq/functions/src/index.ts',
      parameters: {
        type: 'object',
        properties: {
          project: { type: 'string', enum: ['self', 'ezboq', 'game', 'vanavard', 'pet'], description: 'โปรเจกต์ที่ต้องการอ่าน' },
          file_path: { type: 'string', description: 'path ของไฟล์ภายใน project' },
          start_line: { type: 'number', description: 'บรรทัดเริ่มต้น (default: 1)' },
          max_lines: { type: 'number', description: 'จำนวนบรรทัดสูงสุด (default: 120)' },
        },
        required: ['project', 'file_path'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_project_files',
      description: 'ค้นข้อความในไฟล์ของ project surface ที่อนุญาต เช่น หา endpoint, component, config, TODO, error string',
      parameters: {
        type: 'object',
        properties: {
          project: { type: 'string', enum: ['self', 'ezboq', 'game', 'vanavard', 'pet'], description: 'โปรเจกต์ที่ต้องการค้น' },
          query: { type: 'string', description: 'ข้อความที่ต้องการค้น' },
          path_prefix: { type: 'string', description: 'จำกัด path ภายใน project เช่น apps/web/src' },
          max_results: { type: 'number', description: 'จำนวน match สูงสุด (default: 20)' },
        },
        required: ['project', 'query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'upgrade_knowledge',
      description: 'เพิ่มความรู้ใหม่เข้า soul (personality/knowledge) ถาวร — จะมีผลหลัง restart',
      parameters: {
        type: 'object',
        properties: {
          section: { type: 'string', description: 'หมวด เช่น "interior", "construction", "general"' },
          content: { type: 'string', description: 'ความรู้ใหม่ที่จะเพิ่ม' },
        },
        required: ['section', 'content'],
      },
    },
  },

  // === Parallel Agents (Company Team) ===
  {
    type: 'function',
    function: {
      name: 'spawn_agents',
      description: 'ส่งทีมเอเจ้นท์ทำงานพร้อมกัน (สูงสุด 10 ตัว) แต่ละตัวมีบทบาทต่างกัน เช่น researcher, analyst, designer',
      parameters: {
        type: 'object',
        properties: {
          tasks: {
            type: 'array',
            description: 'รายการงาน — แต่ละงานเป็น string หรือ object {task, role, temperature}',
            items: {
              type: 'object',
              properties: {
                task: { type: 'string', description: 'งานที่ต้องทำ' },
                role: { type: 'string', description: 'บทบาท เช่น researcher, analyst, designer, writer, planner, reviewer, estimator, advisor, critic, summarizer' },
                temperature: { type: 'number', description: 'ความคิดสร้างสรรค์ 0.1-1.0 (default 0.7)' },
              },
              required: ['task'],
            },
          },
        },
        required: ['tasks'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'research_topic',
      description: 'วิจัยหัวข้อจาก 4 มุมมองพร้อมกัน (researcher/analyst/estimator/advisor) — ได้ครบทุกแง่มุม',
      parameters: {
        type: 'object',
        properties: {
          topic: { type: 'string', description: 'หัวข้อที่ต้องการวิจัย เช่น "พื้น SPC vs Laminate"' },
        },
        required: ['topic'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'plan_and_execute',
      description: 'วิเคราะห์งานซับซ้อน แบ่งเป็น subtasks อัตโนมัติ แล้วส่งเอเจ้นท์ทำพร้อมกัน',
      parameters: {
        type: 'object',
        properties: {
          complex_task: { type: 'string', description: 'งานซับซ้อนที่ต้องการแบ่งแล้วทำ' },
        },
        required: ['complex_task'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'company_meeting',
      description: 'ประชุมบริษัทเจมม่า — ส่ง 10 ผู้บริหาร (CEO/นักวิจัย/นักวิเคราะห์/นักออกแบบ/นักเขียน/นักวางแผน/นักประเมิน/นักการตลาด/ที่ปรึกษา/นักวิจารณ์) ถกประเด็นพร้อมกัน',
      parameters: {
        type: 'object',
        properties: {
          agenda: { type: 'string', description: 'วาระประชุม/ประเด็นที่ต้องการให้ทีมถก' },
        },
        required: ['agenda'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'expert_panel',
      description: 'เรียกผู้เชี่ยวชาญเฉพาะทางมาตอบ — เลือกได้ว่าจะเอาตำแหน่งไหน',
      parameters: {
        type: 'object',
        properties: {
          question: { type: 'string', description: 'คำถามหรือประเด็น' },
          roles: {
            type: 'array',
            description: 'ตำแหน่งที่ต้องการ: ceo, researcher, analyst, designer, writer, planner, reviewer, estimator, advisor, marketer, critic, summarizer',
            items: { type: 'string' },
          },
        },
        required: ['question'],
      },
    },
  },

  // === Advanced Agent Modes ===
  {
    type: 'function',
    function: {
      name: 'chain_agents',
      description: 'สายพานการผลิต — agents ต่อกันเป็น pipeline แต่ละตัวเห็นผลคนก่อน (researcher→analyst→writer→reviewer→summarizer)',
      parameters: {
        type: 'object',
        properties: {
          task: { type: 'string', description: 'งานที่ต้องทำ' },
          pipeline: {
            type: 'array',
            description: 'ลำดับตำแหน่ง เช่น ["researcher","analyst","writer"] (default: researcher→analyst→writer→reviewer→summarizer)',
            items: { type: 'string' },
          },
        },
        required: ['task'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'debate_topic',
      description: 'โต้วาที — 2 ฝ่ายถกประเด็น + rebuttal + กรรมการตัดสิน ได้คำตอบ balanced',
      parameters: {
        type: 'object',
        properties: {
          topic: { type: 'string', description: 'ประเด็นโต้วาที เช่น "ควรใช้ SPC หรือ Laminate?"' },
        },
        required: ['topic'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'tournament_answer',
      description: 'แข่งขัน — หลาย agents ตอบคำถามเดียวกัน กรรมการเลือก best answer',
      parameters: {
        type: 'object',
        properties: {
          question: { type: 'string', description: 'คำถามที่ต้องการคำตอบคุณภาพสูง' },
          contestants: { type: 'number', description: 'จำนวนผู้แข่งขัน (default: 5, max: 9)' },
        },
        required: ['question'],
      },
    },
  },
];

// ─── Tool Implementations ───────────────────────

const PRICE_TABLE = {
  renovation:  { value: 8000,  standard: 12000, premium: 18000 },
  new_build:   { value: 12000, standard: 18000, premium: 28000 },
  interior:    { value: 6000,  standard: 10000, premium: 16000 },
  built_in:    { value: 4000,  standard: 7000,  premium: 12000 },
};

const WORK_LABEL = { renovation: 'รีโนเวชั่น', new_build: 'สร้างบ้านใหม่', interior: 'ตกแต่งภายใน', built_in: 'บิลท์อิน' };
const TIER_LABEL = { value: 'ประหยัด', standard: 'มาตรฐาน', premium: 'พรีเมียม' };

function fmt(n) { return new Intl.NumberFormat('th-TH').format(Math.round(n)); }

function calculate_boq({ area_sqm, work_type, tier = 'standard', include_vat = true }) {
  const prices = PRICE_TABLE[work_type];
  if (!prices) return { error: `ไม่รู้จักประเภทงาน: ${work_type}` };
  const rate = prices[tier] || prices.standard;
  const subtotal = area_sqm * rate;
  const vat = include_vat ? subtotal * 0.07 : 0;
  return {
    summary: `${WORK_LABEL[work_type]} ${area_sqm} ตร.ม. (${TIER_LABEL[tier]})`,
    rate_per_sqm: fmt(rate),
    subtotal: fmt(subtotal),
    vat_7: include_vat ? fmt(vat) : 'ไม่รวม',
    total: fmt(subtotal + vat),
    breakdown: {
      material_est: fmt(subtotal * 0.55),
      labor_est: fmt(subtotal * 0.35),
      overhead_est: fmt(subtotal * 0.10),
    },
    note: 'ราคาประเมินเบื้องต้น ขึ้นกับขอบเขตงานจริง',
  };
}

const MATERIALS = {
  'ปูนซีเมนต์': { price: '160-200 บาท/ถุง (50kg)', brands: 'TPI, ปูนอินทรี, ปูนนกอินทรี', tip: 'ปูนถุงเขียว = งานทั่วไป, ปูนถุงแดง = เทพื้น/โครงสร้าง' },
  'เหล็กเส้น': { price: '18-25 บาท/กก.', note: 'DB12-DB25', tip: 'เหล็ก SD40 ทนแรงดึงดีกว่า SR24' },
  'กระเบื้อง': { price: '150-800 บาท/ตร.ม.', brands: 'COTTO, CAMPANA, Dynasty', tip: 'กระเบื้อง 60x60 ดูกว้าง, 80x80 ดูหรู, 30x60 เหมาะผนัง' },
  'สีทาบ้าน': { price: '600-2,500 บาท/ถัง', brands: 'TOA, Beger, Jotun, Dulux', tip: 'สี Sheen กึ่งเงา ทำความสะอาดง่าย เหมาะผนังภายใน' },
  'ไม้อัด': { price: '300-800 บาท/แผ่น (4x8 ฟุต)', tip: 'ไม้อัดเกรด A = หน้าเรียบ เหมาะงาน laminate' },
  'อิฐมวลเบา': { price: '25-35 บาท/ก้อน', brands: 'Q-CON, Super Block', tip: 'น้ำหนักเบา ฉนวนกันร้อนดี เหมาะผนังชั้น 2+' },
  'ท่อ PVC': { price: '80-300 บาท/เส้น (4ม.)', tip: 'ท่อสีฟ้า = ประปา, ท่อสีเหลือง = ร้อยสาย, ท่อสีเทา = ระบายน้ำ' },
  'สายไฟ': { price: '8-25 บาท/เมตร', brands: 'Thai Yazaki, BCC, Phelps Dodge', tip: '1.5mm² = แสงสว่าง, 2.5mm² = เต้ารับ, 4mm² = แอร์' },
  'หลังคาเมทัลชีท': { price: '120-250 บาท/ตร.ม.', tip: 'ความหนา 0.40mm ขึ้นไป กันฝนดี' },
  'ประตู PVC': { price: '1,500-3,000 บาท/บาน', tip: 'ประตูห้องน้ำ ใช้ PVC กันน้ำ' },
  'หน้าต่างอลูมิเนียม': { price: '2,000-8,000 บาท/ชุด', tip: 'บานเลื่อน ประหยัดพื้นที่, บานเปิด ระบายอากาศดี' },
  'ฝ้าเพดาน': { price: '80-200 บาท/ตร.ม.', tip: 'ยิปซัม = ราคาถูก, แคลเซียมซิลิเกต = กันชื้น เหมาะห้องน้ำ' },
  'พื้นลามิเนต': { price: '300-800 บาท/ตร.ม.', brands: 'QuickStep, Lamett', tip: 'ความหนา 8mm+ ดูดีทนทาน' },
  'พื้น SPC': { price: '500-1,200 บาท/ตร.ม.', tip: 'กันน้ำ 100% ทนกว่าลามิเนต เหมาะห้องน้ำ/ครัว' },
  'สุขภัณฑ์': { price: '3,000-15,000 บาท/ชุด', brands: 'COTTO, American Standard, TOTO', tip: 'สุขภัณฑ์แบบแขวนผนัง ทำความสะอาดง่าย ดูโมเดิร์น' },
  'ตู้ครัว': { price: '15,000-80,000 บาท/เมตร', tip: 'ครัว built-in เริ่ม ~40,000/เมตร, สำเร็จรูป ~15,000/เมตร' },
  'แอร์': { price: '12,000-35,000 บาท/เครื่อง', brands: 'Daikin, Mitsubishi, Carrier', tip: 'BTU = พื้นที่ x 800, Inverter ประหยัดไฟ 30-40%' },
};

function get_material_price({ material }) {
  if (MATERIALS[material]) return { material, ...MATERIALS[material] };
  const matches = Object.entries(MATERIALS)
    .filter(([k]) => k.includes(material) || material.includes(k))
    .map(([k, v]) => ({ material: k, ...v }));
  if (matches.length > 0) return matches.length === 1 ? matches[0] : matches;
  return { error: `ไม่มีข้อมูล "${material}"`, available: Object.keys(MATERIALS) };
}

const ROOM_BASE = {
  bedroom:  { value: 3500, standard: 6000, premium: 12000 },
  bathroom: { value: 8000, standard: 15000, premium: 30000 },
  kitchen:  { value: 10000, standard: 20000, premium: 45000 },
  living:   { value: 4000, standard: 8000, premium: 15000 },
  office:   { value: 5000, standard: 9000, premium: 16000 },
  closet:   { value: 6000, standard: 12000, premium: 25000 },
};
const ROOM_LABEL = { bedroom: 'ห้องนอน', bathroom: 'ห้องน้ำ', kitchen: 'ห้องครัว', living: 'ห้องนั่งเล่น', office: 'ห้องทำงาน', closet: 'ห้องแต่งตัว/walk-in closet' };

function estimate_room({ room_type, area_sqm, style = 'minimal', tier = 'standard' }) {
  const base = ROOM_BASE[room_type];
  if (!base) return { error: `ไม่รู้จักประเภทห้อง: ${room_type}` };
  const rate = base[tier] || base.standard;
  const styleMultiplier = { minimal: 0.9, japanese: 1.0, scandinavian: 1.0, industrial: 0.95, luxury: 1.4, tropical: 1.1 };
  const mult = styleMultiplier[style] || 1.0;
  const total = area_sqm * rate * mult;
  return {
    room: ROOM_LABEL[room_type],
    area: `${area_sqm} ตร.ม.`,
    style,
    tier: TIER_LABEL[tier],
    estimated_cost: `฿${fmt(total)}`,
    range: `฿${fmt(total * 0.8)} - ฿${fmt(total * 1.2)}`,
    note: 'รวมวัสดุ + ค่าแรง ไม่รวมเฟอร์นิเจอร์ลอยตัว',
  };
}

function calculate({ expression, context = '' }) {
  try {
    // Parse "X% of Y"
    const pctMatch = expression.match(/(\d+(?:\.\d+)?)\s*%\s*of\s*(\d+(?:,?\d+)*(?:\.\d+)?)/i);
    if (pctMatch) {
      const pct = parseFloat(pctMatch[1]);
      const base = parseFloat(pctMatch[2].replace(/,/g, ''));
      const result = base * (pct / 100);
      return { expression: `${pct}% of ${fmt(base)}`, result: fmt(result), context };
    }
    // Safe eval for basic math
    const sanitized = expression.replace(/[^0-9+\-*/().,%\s]/g, '').replace(/%/g, '/100*');
    const result = Function(`"use strict"; return (${sanitized})`)();
    return { expression, result: typeof result === 'number' ? fmt(result) : result, context };
  } catch {
    return { error: `คำนวณไม่ได้: ${expression}`, tip: 'ลองใช้ format เช่น "250000 * 0.07" หรือ "15% of 1200000"' };
  }
}

const UNIT_FACTORS = {
  'sqm_sqwa': 0.25, 'sqwa_sqm': 4, 'sqm_rai': 1/1600, 'rai_sqm': 1600,
  'sqm_sqft': 10.7639, 'sqft_sqm': 0.092903,
  'm_ft': 3.28084, 'ft_m': 0.3048,
  'cm_inch': 0.393701, 'inch_cm': 2.54,
  'kg_lb': 2.20462, 'lb_kg': 0.453592,
  'c_f': null, 'f_c': null, // special handling
  'wah_m': 2, 'm_wah': 0.5,
};

function convert_unit({ value, from_unit, to_unit }) {
  const f = from_unit.toLowerCase().replace(/[.\s°]/g, '');
  const t = to_unit.toLowerCase().replace(/[.\s°]/g, '');
  if ((f === 'c' || f === 'celsius') && (t === 'f' || t === 'fahrenheit')) return { input: `${value}°C`, result: `${(value * 9/5 + 32).toFixed(1)}°F` };
  if ((f === 'f' || f === 'fahrenheit') && (t === 'c' || t === 'celsius')) return { input: `${value}°F`, result: `${((value - 32) * 5/9).toFixed(1)}°C` };
  const key = `${f}_${t}`;
  const factor = UNIT_FACTORS[key];
  if (!factor) return { error: `ไม่รองรับ ${from_unit} → ${to_unit}`, supported: 'ตร.ม./ตร.วา/ไร่, ม./ฟุต, cm/inch, kg/lb, °C/°F' };
  return { input: `${value} ${from_unit}`, result: `${(value * factor).toFixed(4)} ${to_unit}` };
}

function get_plan_info({ plan_id }) {
  const plans = config.ezboq.plans;
  if (plan_id === 'all') {
    return Object.entries(plans).map(([id, p]) => ({ id, ...p }));
  }
  return plans[plan_id] || { error: `ไม่รู้จักแพ็กเกจ: ${plan_id}` };
}

function calculate_commission({ sale_amount, commission_rate = 5, platform = 'lazada' }) {
  const rates = { lazada: { min: 2, max: 8, default: 5 }, shopee: { min: 1, max: 6, default: 4 }, tiktok: { min: 3, max: 10, default: 6 } };
  const p = rates[platform] || rates.lazada;
  const rate = commission_rate || p.default;
  const commission = sale_amount * (rate / 100);
  return {
    platform,
    sale_amount: fmt(sale_amount),
    commission_rate: `${rate}%`,
    commission: fmt(commission),
    platform_range: `${p.min}-${p.max}%`,
    note: `ยอดขาย ฿${fmt(sale_amount)} × ${rate}% = ฿${fmt(commission)} commission`,
  };
}

function generate_caption({ product, platform = 'facebook', style = 'hook', include_hashtags = true }) {
  // This returns context for Gemma to generate the actual caption
  return {
    instruction: 'Generate a Thai social media caption based on these parameters',
    product,
    platform,
    style,
    include_hashtags,
    style_guide: {
      hook: 'เริ่มด้วยคำถามหรือ statement ที่ดึงดูด',
      storytelling: 'เล่าเรื่องสั้นๆ ที่เชื่อมกับสินค้า',
      review: 'รีวิวจากมุมผู้ใช้จริง',
      promotion: 'เน้นส่วนลด/โปรโมชั่น',
      educational: 'ให้ความรู้แล้วเชื่อมกับสินค้า',
      funny: 'อารมณ์ขัน relatable',
    },
  };
}

function translate({ text, from_lang, to_lang }) {
  const langNames = { th: 'ไทย', en: 'English', ja: '日本語', ko: '한국어', zh: '中文' };
  return {
    instruction: `Translate this text from ${langNames[from_lang] || 'auto'} to ${langNames[to_lang]}`,
    text,
    from: from_lang || 'auto',
    to: to_lang,
    note: 'Gemma will translate using its language model',
  };
}

function get_datetime({ query }) {
  const now = new Date();
  const bkkNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));

  if (query === 'now' || query === 'ตอนนี้') {
    return {
      date: bkkNow.toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
      time: bkkNow.toLocaleTimeString('th-TH'),
      iso: bkkNow.toISOString(),
      timezone: 'Asia/Bangkok (GMT+7)',
    };
  }

  // "+N days"
  const daysMatch = query.match(/\+\s*(\d+)\s*(day|days|วัน)/i);
  if (daysMatch) {
    const future = new Date(bkkNow);
    future.setDate(future.getDate() + parseInt(daysMatch[1]));
    return {
      from: bkkNow.toLocaleDateString('th-TH'),
      to: future.toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
      days: parseInt(daysMatch[1]),
    };
  }

  // Date range "A to B"
  const rangeMatch = query.match(/(\d{4}-\d{2}-\d{2})\s*(?:to|ถึง|-)\s*(\d{4}-\d{2}-\d{2})/);
  if (rangeMatch) {
    const d1 = new Date(rangeMatch[1]);
    const d2 = new Date(rangeMatch[2]);
    const diff = Math.ceil((d2 - d1) / (1000 * 60 * 60 * 24));
    return { from: rangeMatch[1], to: rangeMatch[2], days_between: diff, weeks: (diff / 7).toFixed(1) };
  }

  return { now: bkkNow.toLocaleDateString('th-TH'), query, note: 'ลองใช้ format: "now", "+30 days", "2026-05-01 to 2026-06-15"' };
}

function summarize({ text, style = 'bullets', max_points = 5 }) {
  return {
    instruction: `Summarize this text in ${style} format, max ${max_points} points`,
    text: text.slice(0, 3000),
    style,
    max_points,
  };
}

function sanitizeFilename(filename = 'export') {
  const safe = String(filename || 'export')
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
  return safe || 'export';
}

function getFileFormatMeta(format = 'txt') {
  const normalized = String(format || 'txt').trim().toLowerCase();
  switch (normalized) {
    case 'md':
      return { extension: '.md', mimeType: 'text/markdown; charset=utf-8' };
    case 'csv':
      return { extension: '.csv', mimeType: 'text/csv; charset=utf-8' };
    case 'tsv':
      return { extension: '.tsv', mimeType: 'text/tab-separated-values; charset=utf-8' };
    case 'json':
      return { extension: '.json', mimeType: 'application/json; charset=utf-8' };
    case 'html':
      return { extension: '.html', mimeType: 'text/html; charset=utf-8' };
    case 'xlsx':
      return { extension: '.csv', mimeType: 'text/csv; charset=utf-8', fallbackFrom: 'xlsx' };
    case 'txt':
    default:
      return { extension: '.txt', mimeType: 'text/plain; charset=utf-8' };
  }
}

async function create_file({ filename, content, format = 'txt', description = '' }) {
  const text = String(content ?? '');
  if (!text.trim()) {
    return { error: 'ไม่มีเนื้อหาไฟล์ให้สร้าง' };
  }

  const meta = getFileFormatMeta(format);
  const requestedFormat = String(format || 'txt').trim().toLowerCase();
  const safeBase = sanitizeFilename(filename);
  const hasExtension = extname(safeBase) !== '';
  const finalName = hasExtension ? safeBase : `${safeBase}${meta.extension}`;
  const stampedName = `${Date.now()}-${basename(finalName)}`;
  const absolutePath = resolve(GENERATED_FILES_DIR, stampedName);

  await fs.mkdir(GENERATED_FILES_DIR, { recursive: true });

  let fileContent = text;
  if (requestedFormat === 'json') {
    try {
      fileContent = JSON.stringify(JSON.parse(text), null, 2);
    } catch {
      fileContent = JSON.stringify({ content: text }, null, 2);
    }
  }

  if (requestedFormat === 'csv' || requestedFormat === 'tsv' || requestedFormat === 'xlsx') {
    fileContent = `\uFEFF${fileContent.replace(/^\uFEFF/, '')}`;
  }

  await fs.writeFile(absolutePath, fileContent, 'utf8');
  const stats = await fs.stat(absolutePath);
  const normalizedForCount = fileContent.replace(/^\uFEFF/, '');
  const nonEmptyLines = normalizedForCount.split(/\r?\n/).filter((line) => line.trim().length > 0);
  const lineCount = nonEmptyLines.length;
  const isTabular = ['csv', 'tsv', 'xlsx'].includes(requestedFormat);
  const dataRows = isTabular ? Math.max(0, lineCount - 1) : undefined;

  return {
    status: meta.fallbackFrom
      ? `สร้างไฟล์ ${requestedFormat} ต้นฉบับไม่ตรง runtime เลยส่งเป็น ${meta.extension.slice(1).toUpperCase()} ที่เปิดใน Excel ได้แทน`
      : `สร้างไฟล์ ${meta.extension.slice(1).toUpperCase()} เรียบร้อย`,
    file: {
      filename: basename(finalName.endsWith(meta.extension) ? finalName : `${safeBase}${meta.extension}`),
      absolutePath,
      requestedFormat,
      actualFormat: meta.extension.replace(/^\./, ''),
      mimeType: meta.mimeType,
      sizeBytes: stats.size,
      lineCount,
      dataRows,
      description: description || undefined,
    },
    preview: text.slice(0, 200),
  };
}

// ─── Tool Router ────────────────────────────────
const SYNC_TOOLS = {
  calculate_boq, get_material_price, estimate_room,
  calculate, convert_unit,
  get_plan_info, calculate_commission, generate_caption,
  translate, get_datetime, summarize,
  read_own_file: (args) => readOwnFile(args.filename),
  list_project_files: (args) => listProjectFiles(args.project, args.path, args.depth, args.max_results),
  read_project_file: (args) => readProjectFile(args.project, args.file_path, args.start_line, args.max_lines),
  search_project_files: (args) => searchProjectFiles(args.project, args.query, args.path_prefix, args.max_results),
  save_knowledge: (args) => saveKnowledge(args.topic, args.content, args.source || 'user'),
  search_knowledge: (args) => searchMyKnowledge(args.query),
  upgrade_knowledge: (args) => appendToSoul(args.section, args.content),
};

const ASYNC_TOOLS = {
  create_file,
  build_material_catalog: (args) => buildMaterialCatalog(args),
  web_search: (args) => webSearch(args.query),
  web_fetch: (args) => webFetch(args.url, args.max_chars),
  spawn_agents: (args) => runAgents(args.tasks),
  research_topic: (args) => multiResearch(args.topic),
  plan_and_execute: (args) => planAndExecute(args.complex_task),
  company_meeting: (args) => companyMeeting(args.agenda),
  expert_panel: (args) => expertPanel(args.question, args.roles),
  chain_agents: (args) => chainOfAgents(args.task, args.pipeline),
  debate_topic: (args) => debate(args.topic),
  tournament_answer: (args) => tournament(args.question, args.contestants || 5),
};

export function executeTool(name, args) {
  const fn = SYNC_TOOLS[name];
  if (fn) {
    try { return fn(args); }
    catch (err) { return { error: `Tool error: ${err.message}` }; }
  }
  return { error: `Unknown tool: ${name}` };
}

export async function executeToolAsync(name, args) {
  // Try async tools first
  const asyncFn = ASYNC_TOOLS[name];
  if (asyncFn) {
    try { return await asyncFn(args); }
    catch (err) { return { error: `Async tool error: ${err.message}` }; }
  }
  // Fallback to sync tools
  return executeTool(name, args);
}
