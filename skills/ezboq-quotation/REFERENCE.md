# EzBOQ Quotation — Reference Guide

## Project Architecture

### Monorepo Structure
```
~/Documents/ใบเสนอราคา/
├── apps/
│   ├── web/                    # Landing page (React + Vite)
│   │   └── src/App.tsx
│   └── portal/                 # Dashboard + Document Editor (Next.js)
│       └── src/
│           ├── app/dashboard/  # หน้า dashboard
│           ├── components/
│           │   ├── document-editor.tsx      # ✨ หน้าแก้ไขเอกสาร
│           │   ├── editors/StepItems.tsx    # Step: กรอกรายการ
│           │   ├── editors/StepClient.tsx   # Step: เลือกลูกค้า
│           │   ├── editors/StepReview.tsx   # Step: review ก่อน submit
│           │   └── pdf-preview-modal.tsx    # Preview PDF
│           ├── hooks/
│           │   └── use-document-auto-save.ts
│           └── lib/
│               ├── api-client.ts           # API calls
│               └── repos/                  # Repository pattern
│                   ├── business.repo.ts
│                   ├── customers.repo.ts
│                   └── tax.repo.ts
├── functions/                  # Firebase Cloud Functions
│   └── src/
│       ├── api/
│       │   ├── documents.ts    # Document CRUD API
│       │   ├── customers.ts    # Customer API
│       │   ├── business.ts     # Business settings API
│       │   └── reports.ts      # Report generation
│       ├── core/
│       │   ├── documentIssuance.ts   # ออกเอกสารอย่างเป็นทางการ
│       │   ├── documentNumber.ts     # Auto-gen เลขที่เอกสาร
│       │   ├── draftManager.ts       # จัดการ draft
│       │   ├── money.ts              # Currency formatting
│       │   └── parse.ts              # Parse input text
│       ├── services/
│       │   ├── installmentService.ts # จัดการงวดชำระ
│       │   └── taxPdfService.ts      # PDF สำหรับภาษี
│       ├── workers/
│       │   ├── pdfWorker.ts          # Render PDF
│       │   ├── pdfDelivery.ts        # ส่ง PDF
│       │   └── pdfJobTrigger.ts      # Trigger PDF job
│       └── jarvis/                   # AI assistant (LINE bot)
│           ├── brain.ts              # AI brain
│           ├── skills.ts             # AI skills
│           └── documentRenderer.ts   # Render document for AI
├── shared/                     # Shared types & utils
│   ├── types/index.ts          # ⭐ Types ที่ใช้ร่วมกัน
│   ├── utils/
│   │   ├── firebase.ts         # Firebase config
│   │   └── apiService.ts       # API helper
│   └── hooks/
│       ├── useBusinessProfile.ts
│       └── useDocuments.ts
├── firestore.rules             # Security rules
└── storage.rules               # Storage rules
```

## API Endpoints

### Documents API (`functions/src/api/documents.ts`)
```
GET    /api/documents           → list documents (with filters)
POST   /api/documents           → create new document
GET    /api/documents/:id       → get single document
PUT    /api/documents/:id       → update document
DELETE /api/documents/:id       → delete document
POST   /api/documents/:id/issue → issue document (make official)
POST   /api/documents/:id/pdf   → trigger PDF generation
```

### Customers API (`functions/src/api/customers.ts`)
```
GET    /api/customers           → list customers
POST   /api/customers           → create customer
GET    /api/customers/:id       → get customer
PUT    /api/customers/:id       → update customer
```

### Business API (`functions/src/api/business.ts`)
```
GET    /api/business             → get business profile
PUT    /api/business             → update business profile
```

## ราคาอ้างอิงงาน Interior (ประมาณการ — ปี 2025-2026)

### งาน Built-in
| รายการ | ราคาวัสดุ (บาท/ฟุต) | ค่าแรง (บาท/ฟุต) | หมายเหตุ |
|--------|---------------------|-------------------|----------|
| ตู้เสื้อผ้า Melamine | 800-1,200 | 400-600 | ไม่รวมอุปกรณ์ |
| ตู้ครัว Melamine | 1,000-1,500 | 500-700 | ไม่รวม hardware |
| ตู้ครัว Laminate | 1,200-1,800 | 500-700 | |
| ชั้นวาง/ตู้โชว์ | 800-1,200 | 300-500 | |
| โต๊ะทำงาน Built-in | 1,000-1,500 | 400-600 | |

### งานระบบ
| รายการ | ราคา (บาท/จุด) | หมายเหตุ |
|--------|----------------|----------|
| เดินไฟฟ้าใหม่ | 1,500-2,500 | รวมสาย+ท่อ |
| ย้ายจุดไฟ | 800-1,500 | |
| เดินท่อประปาใหม่ | 2,000-3,500 | |
| ติดตั้งแอร์ | 3,000-5,000 | ค่าแรงอย่างเดียว |

### งานพื้น/ผนัง
| รายการ | ราคา (บาท/ตร.ม.) | หมายเหตุ |
|--------|-------------------|----------|
| กระเบื้อง 60x60 | 400-800 | รวมปูและยาแนว |
| ไม้ลามิเนต | 500-900 | รวมปู |
| วอลเปเปอร์ | 300-800 | รวมติด |
| ทาสี | 150-250 | รวมรองพื้น 2 รอบ |
| ฝ้าเพดาน Gypsum | 350-550 | รวมโครง |

### งานอื่นๆ
| รายการ | ราคา (บาท) | หมายเหตุ |
|--------|------------|----------|
| ทุบรื้อห้องน้ำ | 8,000-15,000 | ต่อห้อง |
| ทุบรื้อครัว | 5,000-12,000 | ต่อชุด |
| ผ้าม่าน (ม่านพับ) | 300-600/ตร.ม. | |
| ผ้าม่าน (ม่านจีบ) | 500-1,200/ตร.ม. | |
| หินท็อป Quartz | 4,000-8,000/เมตร | หน้ากว้าง 60cm |

> ⚠️ ราคาเป็นการประมาณ — ควรตรวจสอบกับ supplier จริงก่อนเสนอ

## Document Number Format

ระบบ auto-gen เลขที่เอกสารจาก `functions/src/core/documentNumber.ts`:
```
QUO-202604-001  → ใบเสนอราคา เมษายน 2026 ลำดับที่ 1
INV-202604-001  → ใบแจ้งหนี้
REC-202604-001  → ใบเสร็จรับเงิน
```

## LINE Bot Integration (Jarvis)

EzBOQ มี LINE Bot ที่ช่วยสร้างใบเสนอราคาผ่าน chat:
- `functions/src/jarvis/` — AI brain + skills
- `functions/src/core/conversationHandler.ts` — จัดการ conversation
- `functions/src/core/forgivingParser.ts` — parse input ภาษาไทยแบบ fuzzy

## Deployment

```bash
# Deploy functions
npm run build:functions
firebase deploy --only functions

# Deploy portal
npm run build:portal
firebase deploy --only hosting:portal

# Deploy web
npm run build:web
firebase deploy --only hosting:web
```

## Testing

```bash
# E2E tests (portal)
cd apps/portal
npx playwright test

# Test cases:
# tc-01-quo-to-pdf.spec.ts  → สร้าง quotation → export PDF
# tc-02-bill-to-pdf.spec.ts → สร้าง bill → export PDF
# tc-03-receipt-to-pdf.spec.ts → สร้าง receipt → export PDF
# tc-04-confirm-document.spec.ts → confirm document flow
```
