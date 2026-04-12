# Gemma Discord Bot — VPS Server Setup

> Current runtime note (2026-04-09): Gemma bot now runs on **Gemini API**, not Ollama. Any Ollama-based instructions below should be treated as legacy notes only.

## Server Info
| Item | Detail |
|---|---|
| **Provider** | Contabo Cloud VPS 10 — Singapore |
| **IP** | 194.233.88.67 |
| **OS** | Ubuntu 24.04 |
| **Spec** | 4 vCPU, 8GB RAM, 75GB NVMe |
| **SSH** | `ssh root@194.233.88.67` (key-based) |
| **Bot Path** | `/root/projects/gemma-discord/` |

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Contabo VPS (24/7)                  │
│                                                     │
│  ┌──────────┐    ┌──────────────┐    ┌───────────┐  │
│  │  Gemini   │◄──│  Gemma Bot   │──►│  Discord   │  │
│  │ API Key   │    │  (Node.js)   │    │  4 servers │  │
│  │  3 Pro    │    │              │    └───────────┘  │
│  └──────────┘    │  SQLite DB   │                   │
│                  │  - knowledge  │    ┌───────────┐  │
│                  │  - training   │──►│  Firebase  │  │
│                  │  - autonomy   │    │  Gemini    │  │
│                  └──────────────┘    │  RAG API   │  │
│                                     └───────────┘  │
└─────────────────────────────────────────────────────┘
```

## Services (systemd)

### Gemini Runtime
- No local Ollama service is required for the main Gemma chat runtime.
- Keep runtime secrets in `/etc/gemma-discord.env` and let `gemma-discord.service` read that file first.
- Keep non-secret runtime options in `/root/projects/gemma-discord/.env`.

### Gemma Bot — Discord Bot
```bash
# Service file: /etc/systemd/system/gemma-discord.service
systemctl status gemma-discord    # ดูสถานะ
systemctl restart gemma-discord   # รีสตาร์ท
journalctl -u gemma-discord -f    # ดู logs
```

Gemma service ควรตั้ง auto-start on boot + auto-restart on failure

## Secret Environment (/etc/gemma-discord.env)
```bash
DISCORD_BOT_TOKEN=<gemma-bot-token>
GEMINI_API_KEY=<gemini-api-key>
```

## Project Environment (/root/projects/gemma-discord/.env)
```
LLM_PROVIDER=gemini
GEMINI_MODEL=gemini-3-pro-preview
GEMINI_FALLBACK_MODEL=gemini-2.5-pro
GEMINI_TIMEOUT_MS=120000
```

## Model
- **gemini-3-pro-preview** เป็น model หลักของ Gemma runtime
- **gemini-2.5-pro** ใช้เป็น fallback
- ถ้าทีมเรียกกันว่า `Gemini 3.1 Pro` ให้ map เป็น `gemini-3-pro-preview` ตอนตั้งค่า env
- การประมวลผลเกิดผ่าน Gemini API ไม่กิน RAM แบบ local model เหมือน setup เดิม

## Knowledge Harvesting Flow

```
                    ┌─────────────────────┐
                    │   Autonomy Loop     │
                    │   (every 5 min)     │
                    └──────┬──────────────┘
                           │
                    ┌──────▼──────────────┐
                    │  Pick next task     │
                    │  from Goal #6 or #7 │
                    └──────┬──────────────┘
                           │
              ┌────────────▼────────────────┐
              │  Gemma processes task:      │
              │  1. Web search (DuckDuckGo) │
              │  2. Analyze + summarize     │
              │  3. Save to knowledge_base  │
              └────────────┬────────────────┘
                           │
                    ┌──────▼──────────────┐
                    │  knowledge_base     │
                    │  (SQLite, 135+ rows)│
                    └──────┬──────────────┘
                           │
                    ┌──────▼──────────────┐
                    │  Export JSON        │
                    │  → Firebase Gemini  │
                    │  RAG API            │
                    └─────────────────────┘
```

### Goals ที่ทำงานอยู่

| Goal | ชื่อ | Status | Tasks |
|---|---|---|---|
| #6 | Level 3 — ความรู้ละเอียดทุกหมวดงานบ้าน | active | 6 done / 15 pending |
| #7 | Knowledge Harvester — หาข้อมูลต่อเนื่อง | active | 0 done / 20 pending |

### Goal #6 Tasks (งานบ้าน 1 หลัง)
- ฐานราก, โครงสร้าง, หลังคา, ก่อผนัง, พื้น ✅
- ห้องน้ำ, ประปา, ไฟฟ้า, ประตู-หน้าต่าง, ทาสี ⏳
- ฝ้าเพดาน, ครัว, รั้ว, งานดิน, แอร์, เหล็กดัด ⏳
- บันได, บิ้วอิน, ถังน้ำ, BOQ สรุป ⏳

### Goal #7 Tasks (Knowledge Harvester)
- ราคาวัสดุ 2026 (ปูน/เหล็ก/กระเบื้อง/สี/ประตู/ไฟฟ้า/ประปา/แอร์)
- ค่าแรงช่างทุกประเภท
- สูตรคำนวณ BOQ + waste factor
- กฎหมาย/มาตรฐานก่อสร้าง
- เปรียบเทียบวัสดุ
- Template BOQ (บ้าน 2 ชั้น, ทาวน์เฮ้าส์, รีโนเวท)
- ปัญหาก่อสร้าง + วิธีแก้
- ขั้นตอนสร้างบ้าน timeline

## Data Pipeline: Gemma → Gemini RAG

1. **Gemma** วนลูปเก็บข้อมูล → เขียนลง `knowledge_base` table (SQLite)
2. **Export** ด้วย script → `knowledge-base.json`
3. **Deploy** ไป Firebase Functions → Gemini Flash ใช้เป็น RAG context
4. **Users** ถาม EzBOQ AI → Gemini ตอบโดยอ้างอิง knowledge base

### Export command (จากเครื่อง local)
```bash
# Sync DB กลับจาก server
rsync -avz root@194.233.88.67:/root/projects/gemma-discord/gemma-memory.db \
  ~/Documents/ใบเสนอราคา/bots/gemma-discord/gemma-memory.db

# Export to JSON (ใช้ script ใน functions/)
cd ~/Documents/ใบเสนอราคา/bots/gemma-discord
node --input-type=module -e "
import Database from 'better-sqlite3';
import { writeFileSync } from 'fs';
const db = new Database('gemma-memory.db', {readonly:true});
const rows = db.prepare('SELECT * FROM knowledge_base').all();
writeFileSync('../../../functions/src/jarvis/knowledge-base.json', JSON.stringify(rows, null, 2));
console.log('Exported', rows.length, 'entries');
"

# Deploy to Firebase
cd ~/Documents/ใบเสนอราคา && firebase deploy --only functions
```

## Performance Notes
- CPU-only: ~1 token/s → คำตอบสั้น 30-60s, ยาว 3-5 min
- Autonomy loop ทุก 5 นาที แต่ task อาจใช้ 5-8 นาที → concurrency guard ป้องกันซ้อน
- Gemini API runtime ไม่ต้อง warm local model เหมือน setup เดิม
- RAM ใช้หลักๆ กับ Node.js + SQLite ไม่ได้บวมจาก local model แล้ว

## Troubleshooting

### Bot ไม่ตอบ
```bash
systemctl status gemma-discord
journalctl -u gemma-discord -n 50
systemctl restart gemma-discord
```

### Legacy Ollama Setup (old only)
```bash
systemctl status ollama
journalctl -u ollama -n 20
systemctl restart ollama
```

### RAM เต็ม
```bash
free -h
# ถ้า memory ตันผิดปกติ ให้เช็ค process ของ Node และ worker อื่นๆ ก่อน
ps aux | grep node
```

### อัพเดทโค้ดจาก local
```bash
# จากเครื่อง Mac
rsync -avz --exclude 'node_modules' --exclude '.DS_Store' --exclude 'gemma-memory.db' --exclude '.env' \
  ~/Documents/ใบเสนอราคา/bots/gemma-discord/ \
  root@194.233.88.67:/root/projects/gemma-discord/

# แล้ว restart บน server
ssh root@194.233.88.67 "systemctl restart gemma-discord"
```

หรือใช้ script กลางจากในโปรเจ็กต์:
```bash
cd ~/Documents/ใบเสนอราคา/bots/gemma-discord
npm run deploy:vps
```

## ดูสถานะ Autonomy
ใช้คำสั่ง `/autonomy` ใน Discord หรือ:
```bash
ssh root@194.233.88.67 "cd /root/projects/gemma-discord && node --input-type=module -e \"
import Database from 'better-sqlite3';
const db = new Database('gemma-memory.db', {readonly:true});
const goals = db.prepare(\\\"SELECT id,title,status,iterations_used,max_iterations FROM autonomous_goals WHERE status='active'\\\").all();
goals.forEach(g => console.log('Goal #'+g.id, g.title, g.iterations_used+'/'+g.max_iterations));
const kb = db.prepare('SELECT COUNT(*) as c FROM knowledge_base').get();
console.log('Knowledge base:', kb.c, 'entries');
\""
```

---
*Last updated: 2026-04-07 by ม้าน้ำ (Claude)*
