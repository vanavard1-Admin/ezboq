---
name: ezboq-quotation
description: "ใช้ skill นี้เมื่อผู้ใช้ต้องการสร้าง แก้ไข หรือจัดการใบเสนอราคา (Quotation) สำหรับงาน Interior Design, Built-in, Renovation รวมถึงคำนวณราคา material + labor, สร้าง work plan, แบ่งงวดชำระเงิน และ export เป็น PDF ผ่านระบบ EzBOQ ของบริษัท Vanavard Interior"
---

# EzBOQ Quotation — คู่มือสร้างใบเสนอราคา

## Overview

EzBOQ เป็นระบบสร้างใบเสนอราคา (Quotation) สำหรับงาน Interior Design ของบริษัท **Vanavard Interior**
- **Stack:** Firebase + React/Next.js monorepo
- **Project path:** `~/Documents/ใบเสนอราคา/`
- **Apps:** `apps/web` (landing), `apps/portal` (dashboard + document editor)
- **Backend:** `functions/` (Firebase Cloud Functions + LINE integration)
- **Shared types:** `shared/types/index.ts`

## โครงสร้าง Data Types (สำคัญ!)

### QuotationItem — รายการงานแต่ละรายการ
```typescript
interface QuotationItem {
  no: string;              // ลำดับ เช่น "1", "1.1"
  description: string;     // รายละเอียดงาน
  unit: string;            // หน่วย เช่น "ชุด", "ตร.ม.", "จุด"
  quantity: number;        // จำนวน
  unitPrice: number;       // ราคาวัสดุต่อหน่วย (บาท)
  laborCost?: number;      // ค่าแรงต่อหน่วย (บาท)
  customerUnitPrice?: number; // ราคาขายลูกค้าต่อหน่วย
  scopeDetails?: string;   // รายละเอียดขอบเขตงาน
  totalPrice?: number;     // ราคารวม = quantity × (unitPrice + laborCost)
}
```

### DocumentPipelineData — เอกสารใบเสนอราคา
```typescript
interface DocumentPipelineData {
  id?: string;
  projectName: string;           // ชื่อโปรเจค
  status: 'active' | 'archived' | 'draft' | 'completed';
  quotationItems: QuotationItem[];
  workPlan?: WorkPlanConfig;     // แผนงาน Gantt chart
  paymentInstallments?: PaymentInstallment[];  // งวดชำระ
  businessId?: string;
  customerId?: string;
  totalAmount?: number;
  notes?: string;
}
```

### PaymentInstallment — งวดชำระเงิน
```typescript
interface PaymentInstallment {
  no: number;
  description: string;     // เช่น "งวดที่ 1 - เริ่มงาน"
  percentage: number;       // เช่น 30
  amount?: number;          // คำนวณจาก percentage × totalAmount
  condition?: string;       // เงื่อนไข เช่น "เมื่อเริ่มงานติดตั้ง"
  dueDate?: string;
}
```

## การสร้างใบเสนอราคา — Step by Step

### Step 1: รวบรวมข้อมูลจากผู้ใช้
ถามข้อมูลเหล่านี้:
1. **ชื่อโปรเจค** — เช่น "ตกแต่งคอนโด Park Origin 2BR"
2. **ประเภทงาน** — built-in / renovation / full interior
3. **รายการงาน** — ผู้ใช้อาจพิมพ์เป็นข้อความ หรือส่งเป็น list
4. **ข้อมูลลูกค้า** — ชื่อ, ที่อยู่, เบอร์โทร

### Step 2: จัดรายการงานเป็น QuotationItem[]
แปลงข้อมูลที่ได้เป็นโครงสร้างมาตรฐาน:

```typescript
const items: QuotationItem[] = [
  {
    no: "1",
    description: "งานทุบรื้อถอน",
    unit: "ชุด",
    quantity: 1,
    unitPrice: 0,
    laborCost: 15000,
    totalPrice: 15000
  },
  {
    no: "2",
    description: "งาน Built-in ตู้เสื้อผ้า Walk-in Closet",
    unit: "ชุด",
    quantity: 1,
    unitPrice: 45000,
    laborCost: 12000,
    totalPrice: 57000
  }
];
```

### Step 3: คำนวณราคา

**สูตรคำนวณ:**
```
ราคาต่อรายการ = quantity × (unitPrice + laborCost)
ราคารวมทั้งหมด = ΣรายการทุกรายการTotalPrice
VAT 7% (ถ้ามี) = totalAmount × 0.07
Grand Total = totalAmount + VAT
```

**Markup สำหรับลูกค้า (ถ้าใช้):**
```
customerUnitPrice = (unitPrice + laborCost) × (1 + markupPercent/100)
```

### Step 4: สร้างงวดชำระเงิน (Payment Terms)

**Template มาตรฐาน Vanavard — 3 งวด:**

| งวด | % | เงื่อนไข |
|-----|---|----------|
| 1 | 40% | เมื่อตกลงและเริ่มสั่งของ |
| 2 | 30% | เมื่อเริ่มติดตั้ง |
| 3 | 30% | เมื่อส่งมอบงานเรียบร้อย |

**หรือ 4 งวด:** 40% → 20% → 20% → 20%

### Step 5: สร้าง Work Plan (แผนงาน)

```typescript
const workPlan: WorkPlanConfig = {
  totalWeeks: 8,
  startDate: "2026-05-01",
  items: [
    { no: "1", task: "ทุบรื้อถอน", duration: "1 สัปดาห์", weekCells: ["W1"], status: "planned" },
    { no: "2", task: "งานโครงสร้าง", duration: "2 สัปดาห์", weekCells: ["W2","W3"], status: "planned" },
    { no: "3", task: "งาน Built-in", duration: "3 สัปดาห์", weekCells: ["W3","W4","W5"], status: "planned" },
    { no: "4", task: "งานทาสี/ผนัง", duration: "1 สัปดาห์", weekCells: ["W6"], status: "planned" },
    { no: "5", task: "งานติดตั้ง", duration: "1 สัปดาห์", weekCells: ["W7"], status: "planned" },
    { no: "6", task: "ส่งมอบ", duration: "1 สัปดาห์", weekCells: ["W8"], status: "planned" }
  ]
};
```

## Templates ตามประเภทงาน

### 🔨 งาน Built-in (ตู้, ชั้นวาง, ครัว)
หมวดหลัก:
- งานทุบรื้อถอน (ถ้ามี)
- งานไม้ Built-in (ตู้เสื้อผ้า, ตู้ครัว, ชั้นวาง, โต๊ะ)
- งานหินท็อป (Quartz/Granite)
- อุปกรณ์ Hardware (บานพับ, รางลิ้นชัก, มือจับ)
- งานทาสี/เคลือบผิว

### 🏗 งาน Renovation (ปรับปรุงห้อง)
หมวดหลัก:
- งานทุบรื้อถอน
- งานโครงสร้าง (ฝ้าเพดาน, ผนัง)
- งานระบบไฟฟ้า
- งานระบบประปา
- งานปูพื้น/กระเบื้อง
- งาน Built-in
- งานทาสี
- งานทำความสะอาด

### 🏠 งาน Full Interior Design
หมวดหลัก:
- Design Fee (ค่าออกแบบ)
- งานทุบรื้อถอน
- งานโครงสร้าง
- งานระบบ (ไฟฟ้า, ประปา, แอร์)
- งาน Built-in ทั้งหมด
- งานพื้น/ผนัง/ฝ้า
- งานทาสี
- เฟอร์นิเจอร์ลอย (Loose Furniture)
- ผ้าม่าน/วอลเปเปอร์
- งานตกแต่ง (Accessories)
- งานทำความสะอาด + ส่งมอบ

## การ Export PDF

EzBOQ ใช้ Cloud Functions render PDF:
- `functions/src/tasks/deliverPdf.ts` — task queue สร้าง PDF
- `functions/src/workers/pdfWorker.ts` — worker render
- `functions/src/workers/pdfDelivery.ts` — ส่ง PDF ให้ลูกค้า

**Portal app:** `apps/portal/src/components/pdf-preview-modal.tsx`

**API Endpoint:**
```
POST /api/documents  → สร้าง/อัพเดทเอกสาร
GET  /api/documents/:id  → ดึงเอกสาร
```

## Firestore Structure

```
businesses/{businessId}/
  ├── documents/{docId}     → DocumentPipelineData
  ├── customers/{custId}    → Customer
  └── settings/             → Business settings
```

## หน่วยที่ใช้บ่อย

| หน่วย | ใช้กับ |
|-------|--------|
| ชุด | งาน built-in, เฟอร์นิเจอร์ |
| ตร.ม. | พื้น, ผนัง, ฝ้าเพดาน |
| จุด | ไฟฟ้า, ประปา |
| เมตร | ท่อ, สายไฟ, บัว |
| ตัว | แอร์, สุขภัณฑ์ |
| งาน | ทุบรื้อ, ทาสี |

## ข้อควรระวัง

1. **ราคาต้องเป็นตัวเลข** — ไม่ใช่ string ใน calculation
2. **VAT 7% ต้องแยกบรรทัด** — อย่ารวมใน unitPrice
3. **Labor cost แยกจาก material** — ลูกค้าเห็น customerUnitPrice เท่านั้น
4. **เลขที่เอกสาร** — format: `QUO-YYYYMM-XXX` (auto-gen โดย `documentNumber.ts`)
5. **Currency:** บาท (THB) — format ด้วย comma เช่น 1,250,000

## Quick Reference — สร้างใบเสนอราคาแบบเร็ว

เมื่อผู้ใช้บอกรายการงานมา ให้:
1. จัดหมวดหมู่ตาม template ข้างบน
2. ประเมินราคา material + labor ตาม scope
3. คำนวณ total
4. เสนอ payment terms 3 งวด (40-30-30)
5. สร้าง work plan ตามระยะเวลาที่เหมาะสม
6. แสดงตารางสรุปให้ผู้ใช้ review ก่อน export

ดูรายละเอียดเพิ่มเติมที่ REFERENCE.md
