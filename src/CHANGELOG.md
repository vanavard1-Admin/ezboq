# 📝 Changelog - BOQ System

---

## [1.0.3] - 28 ตุลาคม 2568

### 🐛 Fixed

#### 1. แก้ไขหน้าจัดการภาษี - แสดงข้อมูล Quotation
**ไฟล์:** `/pages/QuotationPage.tsx`

**ปัญหา:**
- หน้าจัดการภาษีแสดง "Quotations found: 0" เสมอ
- ไม่มีข้อมูล quotation ในระบบเพราะผู้ใช้ไม่ได้กดปุ่มบันทึกก่อนไปขั้นตอนถัดไป

**การแก้ไข:**
- แก้ไขฟังก์ชัน `handleConfirm()` ให้บันทึก quotation document อัตโนมัติ
- ตรวจสอบว่ายังไม่ได้บันทึก (`!isSaved`) ก่อนบันทึกใหม่
- แสดงข้อความ "กำลังบันทึก..." ขณะบันทึก
- แสดง toast notification พร้อมเลขที่เอกสาร

**ผลลัพธ์:**
- ✅ Quotation documents ถูกบันทึกอัตโนมัติทุกครั้งที่ผ่านหน้า Quotation
- ✅ หน้าจัดการภาษีแสดงข้อมูล quotation ได้ปกติ
- ✅ ไม่ต้องกดปุ่มบันทึกแยกต่างหาก (แต่ยังกดได้ถ้าต้องการ)

---

#### 2. แก้ไขการส่งออกรายงาน
**ไฟล์:** `/pages/ReportsPageEnhanced.tsx`

**ปัญหา:**
- ปุ่ม "ส่งออกรายงาน" แค่แสดง toast แต่ไม่ได้ส่งออกจริง

**การแก้ไข:**
- เพิ่มฟังก์ชัน `exportReport()` ให้ส่งออกข้อมูลเป็นไฟล์ CSV
- รวมข้อมูล: โครงการ, ลูกค้า, พาร์ทเนอร์, รายได้, ต้นทุน, กำไร, เงินประกัน, งานประกัน, VAT, กำไรสุทธิ
- เพิ่ม BOM (Byte Order Mark) สำหรับการแสดงผลภาษาไทย
- ใช้ชื่อไฟล์เป็น `รายงานสรุป_[วันที่].csv`

**ผลลัพธ์:**
- ✅ ส่งออกรายงานเป็นไฟล์ CSV ได้
- ✅ รองรับภาษาไทย (UTF-8 with BOM)
- ✅ รวมข้อมูลสรุปท้ายตาราง

---

#### 3. แก้ไขการคำนวณเงินประกันและงานประกัน
**ไฟล์:** `/pages/ReportsPageEnhanced.tsx`

**ปัญหา:**
- การคำนวณเงินประกัน (5%) และงานประกัน (3%) อาจไม่ถูกต้อง
- VAT คำนวณจาก grossProfit แทนที่จะเป็น netProfitBeforeTax

**การแก้ไข:**
- เงินประกัน (retentionAmount) = 5% ของ grossProfit
- งานประกัน (warrantyAmount) = 3% ของ grossProfit
- netProfitBeforeTax = grossProfit - retentionAmount - warrantyAmount
- VAT (7%) = 7% ของ netProfitBeforeTax
- netProfitAfterTax = netProfitBeforeTax - VAT

**สูตรการคำนวณ:**
```
grossProfit = customerRevenue - partnerCost
retentionAmount = grossProfit × 0.05
warrantyAmount = grossProfit × 0.03
netProfitBeforeTax = grossProfit - retentionAmount - warrantyAmount
vatAmount = netProfitBeforeTax × 0.07
netProfitAfterTax = netProfitBeforeTax - vatAmount
```

**ผลลัพธ์:**
- ✅ คำนวณเงินประกันและงานประกันถูกต้อง
- ✅ VAT คำนวณจาก net profit ก่อนหักภาษี
- ✅ กำไรสุทธิหลังหักภาษีถูกต้อง

---

### 🗑️ Removed

#### ลบไฟล์ Markdown ที่ซ้ำซ้อน
- ❌ `/PDF_EXPORT_FIX.md` (รวมเข้า PDF_EXPORT_COMPLETE_FIX.md)
- ❌ `/PDF_EXPORT_FIX_FINAL_V2.md` (ข้อมูลเก่า)
- ❌ `/PDF_EXPORT_JPEG_FIX.md` (ข้อมูลเก่า)
- ❌ `/PDF_FIX_FINAL.md` (ข้อมูลเก่า)
- ❌ `/UPDATES_SUMMARY.md` (รวมเข้า CHANGELOG.md)

**เหลือเฉพาะ:**
- ✅ `/PDF_EXPORT_COMPLETE_FIX.md` (สรุปปัญหา PDF export)
- ✅ `/README.md` (ภาพรวมระบบ)
- ✅ `/README_WORKFLOW.md` (คู่มือ workflow)
- ✅ `/PRODUCTION_CHECKLIST.md` (checklist ก่อน deploy)
- ✅ `/PRODUCTION_READY.md` (สถานะพร้อมใช้งาน)
- ✅ `/BOQ_CATALOG_PRODUCTION_COMPLETE.md` (catalog วัสดุ)
- ✅ `/Attributions.md` (เครดิต)

---

### ✨ Added

#### สร้าง DOCUMENTATION_INDEX.md
**ไฟล์ใหม่:** `/DOCUMENTATION_INDEX.md`

**เนื้อหา:**
- สารบัญเอกสารทั้งหมด
- โครงสร้างโปรเจค
- ฟีเจอร์หลัก
- Quick start guide
- คำแนะนำสำหรับผู้พัฒนา
- Roadmap

**วัตถุประสงค์:**
- เป็นจุดเริ่มต้นสำหรับผู้ที่เข้ามาใหม่
- แนะนำว่าควรอ่านเอกสารไหนก่อน
- สรุปโครงสร้างโปรเจคทั้งหมด

---

### 📝 Updated

#### อัพเดท PRODUCTION_CHECKLIST.md
**ไฟล์:** `/PRODUCTION_CHECKLIST.md`

**การเปลี่ยนแปลง:**
- ✅ เพิ่มสรุปเร็ว (Quick Summary)
- ✅ ทำเครื่องหมาย Quotation features ที่เสร็จแล้ว
- ✅ ทำเครื่องหมาย Reports & Tax Management features ที่เสร็จแล้ว
- ✅ เพิ่ม TODO items ใหม่:
  - Advanced PDF Export (รายงาน PDF)
  - Supabase Social Login Setup
- ✅ อัพเดทวันที่เป็นปัจจุบัน

---

## [1.0.2] - 27 ตุลาคม 2568

### 🐛 Fixed

#### PDF Export - Complete Fix
**ไฟล์:** `/utils/pdfExport.ts`, `/components/PDFExportWrapper.tsx`

**ปัญหา:**
- PDF export ล้มเหลวด้วย error "wrong PNG signature"
- รูปภาพ QR Code ทำให้ canvas tainted

**การแก้ไข:**
- เปลี่ยน format จาก PNG เป็น JPEG
- ลบ media elements ทั้งหมดออกจาก cloned document
- ใช้ CSS class แทน inline style สำหรับการซ่อน elements
- เพิ่ม error handling และ logging

**ผลลัพธ์:**
- ✅ PDF export ทำงานได้ปกติทุก document type
- ✅ รองรับ multi-page documents
- ✅ ฟอนต์ไทยแสดงผลถูกต้อง

---

#### Tax Management Page - แสดงข้อมูล
**ไฟล์:** `/pages/TaxManagementPage.tsx`

**ปัญหา:**
- หน้าจัดการภาษีไม่แสดงข้อมูล quotation

**การแก้ไข:**
- เพิ่ม logging เพื่อ debug
- แก้ไข filter เพื่อดึงข้อมูล quotation ได้ถูกต้อง
- รองรับทั้ง customer และ partner quotations

**ผลลัพธ์:**
- ✅ แสดงข้อมูล quotation taxes
- ✅ คำนวณ VAT amount
- ✅ แสดง KPI cards

---

## [1.0.1] - 26 ตุลาคม 2568

### ✨ Added

#### Partner Management
**ไฟล์:** `/pages/PartnersPage.tsx`

**ฟีเจอร์:**
- เพิ่มพาร์ทเนอร์ใหม่
- แก้ไขข้อมูลพาร์ทเนอร์
- ลบพาร์ทเนอร์
- ดูประวัติเอกสารของพาร์ทเนอร์
- แก้ไขเอกสารของพาร์ทเนอร์

**ผลลัพธ์:**
- ✅ จัดการพาร์ทเนอร์ได้ครบถ้วน
- ✅ แสดงยอดรายได้จริงของพาร์ทเนอร์
- ✅ แก้ไขเอกสารย้อนหลังได้

---

#### Withholding Tax Support
**ไฟล์:** `/pages/InvoicePage.tsx`, `/pages/ReceiptPageEnhanced.tsx`

**ฟีเจอร์:**
- รองรับหัก ณ ที่จ่าย (Withholding Tax)
- คำนวณภาษีหัก ณ ที่จ่ายอัตโนมัติ
- แสดงในใบเสร็จ และ PDF

**ผลลัพธ์:**
- ✅ คำนวณหัก ณ ที่จ่ายถูกต้อง
- ✅ แสดงในเอกสาร PDF
- ✅ รองรับทั้งลูกค้าและพาร์ทเนอร์

---

## [1.0.0] - 25 ตุลาคม 2568

### 🎉 Initial Release

#### Core Features
- ✅ Workflow 4 ขั้นตอน (BOQ → Quotation → Invoice → Receipt)
- ✅ Customer Management
- ✅ Material Catalog (270+ items)
- ✅ PDF Export
- ✅ Authentication
- ✅ Membership System
- ✅ Reports & Analytics

---

## 📚 เอกสารที่เกี่ยวข้อง

- [DOCUMENTATION_INDEX.md](/DOCUMENTATION_INDEX.md) - สารบัญเอกสารทั้งหมด
- [PRODUCTION_CHECKLIST.md](/PRODUCTION_CHECKLIST.md) - Checklist ก่อน deploy
- [README.md](/README.md) - ภาพรวมและการติดตั้ง
- [README_WORKFLOW.md](/README_WORKFLOW.md) - คู่มือการใช้งาน

---

**Legend:**
- ✨ Added - ฟีเจอร์ใหม่
- 🐛 Fixed - แก้ไขปัญหา
- 📝 Updated - อัพเดทเอกสารหรือโค้ด
- 🗑️ Removed - ลบออก
- ⚠️ Deprecated - เลิกใช้ (จะลบในเวอร์ชันถัดไป)
