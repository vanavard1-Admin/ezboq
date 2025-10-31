# 🧪 End-to-End Testing Guide
## การทดสอบระบบ BOQ Application แบบครบวงจร

> **User Account สำหรับทดสอบ**: song141@gmail.com  
> **วันที่**: October 30, 2025

---

## 📋 Test Flow Overview

```
Login → Dashboard → Profile → Create BOQ → SmartBOQ/Template → 
Add Items → Quotation → Invoice → Receipt → Export PDF → 
History → Reports → Tax Management → Customers → Partners
```

---

## ✅ Step 1: Login & Authentication

### 🔐 Test Cases

#### 1.1 Email/Password Login
```
URL: /
Action: กรอก email + password → คลิก "เข้าสู่ระบบ"
Expected: เข้าสู่ Dashboard สำเร็จ
```

**โค้ดที่เกี่ยวข้อง**: `/components/LoginPage.tsx`

✅ **Issues Fixed:**
- Auto-fix email not confirmed errors
- Better error messages for invalid credentials
- Loading state with spinner

#### 1.2 Social Login (Google/Facebook)
```
Action: คลิก "เข้าสู่ระบบด้วย Google/Facebook"
Expected: Redirect to provider → กลับมา Dashboard
Warning: ⚠️ ต้อง setup Provider ใน Supabase ก่อน!
```

**Setup Required:**
- Google: https://supabase.com/docs/guides/auth/social-login/auth-google
- Facebook: https://supabase.com/docs/guides/auth/social-login/auth-facebook

---

## ✅ Step 2: Dashboard

### 📊 Test Cases

#### 2.1 Dashboard Loading
```
Action: หลัง login เข้ามาที่ Dashboard
Expected: 
- แสดง stats cards (โครงการ, รายได้, กำไร, มูลค่าเฉลี่ย)
- แสดง charts (รายได้6เดือน, ประเภทโครงการ)
- แสดง Quick Actions (สร้าง BOQ, ลูกค้า, พาร์ทเนอร์, ประวัติ)
- Loading time: < 2 วินาที
```

✅ **Issues Fixed:**
- ลด re-render loops (useEffect dependencies)
- Cache profile/membership in localStorage
- Show error toast แทน block UI
- Parallel loading (Promise.all)

#### 2.2 Stats Cards
```
Test: ตรวจสอบค่า stats
Expected:
- ผู้ใช้ใหม่: แสดง 0 (ไม่แสดง fake data)
- ผู้ใช้ที่มีข้อมูล: แสดงค่าจริงจาก Analytics API
- Trend badges: แสดง +/- % หรือ "ใหม่"
```

#### 2.3 Quick Actions
```
Test: คลิกทุกปุ่ม Quick Actions
Expected:
- "สร้าง BOQ" → ไปหน้า Document Selector
- "ลูกค้า" → ไปหน้า Customers
- "พาร์ทเนอร์" → ไปหน้า Partners  
- "ประวัติ" → ไปหน้า History
```

---

## ✅ Step 3: Profile Editor

### 👤 Test Cases

#### 3.1 Open Profile
```
Action: คลิก "แก้ไขโปรไฟล์" หรือ Avatar
Expected: เปิดหน้า Profile
```

#### 3.2 Edit Company Info
```
Test: แก้ไข
- ชื่อบริษัท
- ที่อยู่
- เลขผู้เสียภาษี
- เบอร์โทร, อีเมล
- อัพโหลดโลโก้
```

**Expected**: บันทึกลง API `/profile/{userId}` สำเร็จ

#### 3.3 Bank Info & QR Code
```
Test:
- เลือกธนาคาร (13 ธนาคารหลัก)
- กรอกเลขบัญชี
- อัพโหลด QR Code พร้อมเพย์
```

#### 3.4 Calculation Settings
```
Test: แก้ไข Profile (ProfileEditor)
- ค่าของเสีย (wastePct): 3%
- ค่าดำเนินการ (opexPct): 5%
- ค่าคลาดเคลื่อน (errorPct): 2%
- กำไร (markupPct): 10%
- VAT: 7%
```

**Expected**: บันทึกและใช้ในการคำนวณ BOQ

---

## ✅ Step 4: BOQ Creation Flow

### 📝 Test Cases

#### 4.1 Start New BOQ
```
Action: คลิก "สร้าง BOQ" จาก Dashboard
Expected: เปิด DocumentSelectorPage
```

#### 4.2 Select Document Type
```
Options:
- [x] BOQ (ถอดวัสดุ)
- [ ] Quotation (มี BOQ แล้ว)
- [ ] Invoice (มี Quotation แล้ว)  
- [ ] Receipt (มี Invoice แล้ว)

Action: คลิก "BOQ" card
Expected: ไปหน้า BOQPage
```

#### 4.3 BOQPage - Customer/Partner Selection
```
Test: เลือกประเภทผู้รับ
- [x] Customer (ลูกค้า) - default
- [ ] Partner (พาร์ทเนอร์)

Action: 
- หาก Customer: เลือกจากรายการหรือสร้างใหม่
- หาก Partner: เลือก Partner + กรอก Main Project Tag
```

✅ **Issues to Fix:**
- เพิ่ม Customer/Partner selection dialog
- Connect to `/customers` และ `/partners` API
- Validation: ต้องเลือกก่อนไป next step

#### 4.4 BOQPage - Project Details
```
Test: กรอกข้อมูลโครงการ
- ชื่อโครงการ (required)
- รายละเอียด
- สถานที่ (location)
```

#### 4.5 BOQPage - Add Items (Manual)
```
Action: คลิก "เพิ่มรายการ" (AddItemDialogEnhanced)
Method 1: ค้นหาจาก Catalog (750+ รายการ)
Method 2: กรอกเอง (Custom Item)

Fields:
- รายการ/คำอธิบาย
- ปริมาณ
- หน่วย
- ราคาต่อหน่วย (unit price)

Expected: เพิ่มเข้า boqItems array
```

#### 4.6 BOQPage - SmartBOQ (AI Generate)
```
Action: คลิก "SmartBOQ" button
Dialog: SmartBOQDialog

Options:
1. เลือกประเภทโครงการ (10 ประเภท):
   - บ้านเดี่ยว
   - ทาวน์เฮ้าส์  
   - อาคารพาณิชย์
   - โรงงาน
   - ... และอีก 6 ประเภท

2. กรอกข้อมูล:
   - พื้นที่ (ตร.ม.)
   - จำนวนชั้น
   - Specifications เพิ่มเติม

Action: คลิก "สร้าง BOQ"
Expected: 
- AI generate รายการวัสดุอัตโนมัติ
- เพิ่มทุกรายการเข้า boqItems
- แสดง BOQTable พร้อมรายการ
```

**โค้ดที่เกี่ยวข้อง**: `/utils/smartBOQ.ts`

#### 4.7 BOQPage - Use Template
```
Action: คลิก "Template" button
Dialog: TemplateDialog

Options: 40+ templates แยกตามหมวดหมู่
- งานโครงสร้าง
- งานสถาปัตย์
- งานระบบ
- งานตกแต่ง

Action: เลือก template → คลิก "ใช้ Template"
Expected: 
- โหลดรายการจาก template
- แสดงใน BOQTable
```

**โค้ดที่เกี่ยวข้อง**: `/data/boqTemplates.ts`

#### 4.8 BOQPage - BOQTable (Edit/Delete)
```
Test: 
- แก้ไขปริมาณ → ราคาอัพเดทอัตโนมัติ
- แก้ไข unit price → total อัพเดท
- ลบรายการ
- Grouped by category
```

**Component**: `/components/BOQTableGrouped.tsx`

#### 4.9 BOQPage - BOQSummary
```
Test: ตรวจสอบสรุปราคา
- Subtotal (รวมทุกรายการ)
- + ค่าของเสีย 3%
- + ค่าดำเนินการ 5%
- + ค่าคลาดเคลื่อน 2%
- + กำไร 10%
- = Grand Total (ก่อน VAT)

Expected: คำนวณถูกต้องตาม profile settings
```

**โค้ดที่เกี่ยวข้อง**: `/utils/calculations.ts`

#### 4.10 BOQPage - Next Step
```
Action: คลิก "ยืนยัน BOQ และดำเนินการต่อ"

Validation:
- ✅ มีรายการอย่างน้อย 1 รายการ
- ✅ เลือก Customer/Partner แล้ว
- ✅ กรอกชื่อโครงการแล้ว

Expected:
- บันทึก BOQ document ไป API `/documents` (POST)
- Navigate to QuotationPage
```

---

## ✅ Step 5: Quotation Page

### 💰 Test Cases

#### 5.1 Quotation Display
```
Expected: แสดง
- BOQTable (read-only หรือ editable)
- BOQSummary with prices
- Discount section
- Quotation notes
- Payment conditions
```

#### 5.2 Add Discount
```
Test: DiscountSection
Options:
- Discount type: % หรือ Fixed Amount
- Discount value
- Promo Code (optional)

Expected: Grand Total ลดลงตาม discount
```

#### 5.3 Quotation Notes & Conditions
```
Test: แก้ไข
- หมายเหตุใบเสนอราคา (Quotation Notes)
- เงื่อนไขการชำระเงิน (Payment Conditions)

Default:
- "ใบเสนอราคานี้มีผลบังคับใช้ 30 วัน..."
- "ชำระเต็มจำนวนภายใน 7 วัน..."
```

#### 5.4 Next to Invoice
```
Action: คลิก "ยืนยันและไปขั้นตอนถัดไป"

Expected:
- บันทึก Quotation document (PUT `/documents/{id}`)
- Navigate to InvoicePage
```

---

## ✅ Step 6: Invoice Page

### 🧾 Test Cases

#### 6.1 Bank Info Section
```
Test: BankInfoSection
- เลือกธนาคาร (13 ธนาคาร)
- เลขที่บัญชี
- ชื่อบัญชี
- อัพโหลด QR Code พร้อมเพย์

Expected: บันทึกใน bankInfo state
```

#### 6.2 Payment Terms (แบ่งงวด)
```
Test: PaymentTermsSection

Method 1: Manual (กำหนดเอง)
- เพิ่มงวดชำระ
- % ของแต่ละงวด
- วันที่กำหนดชำระ

Method 2: Quick Installments (แบ่งงวดด่วน)
Options:
- 2 งวด: 50% / 50%
- 3 งวด: 30% / 40% / 30%
- 4 งวด: 25% / 25% / 25% / 25%

Expected:
- Total % ต้อง = 100%
- Validation: ไม่ให้ next ถ้าไม่ครบ 100%
```

#### 6.3 Withholding Tax (ถ้าเป็น Partner)
```
Test: (เฉพาะเมื่อ recipientType === 'partner')
- เลือกประเภทภาษีหัก ณ ที่จ่าย
- อัตรา: 1%, 2%, 3%, 5%

Expected: 
- หักจาก Grand Total
- แสดงยอดชำระสุทธิ (Net Amount)
```

#### 6.4 Next to Receipt
```
Action: คลิก "ยืนยันใบวางบิลและขั้นตอนถัดไป"

Validation:
- ✅ กรอก Bank Info แล้ว
- ✅ Payment Terms = 100%

Expected:
- บันทึก Invoice document
- Navigate to ReceiptPage
```

---

## ✅ Step 7: Receipt/Tax Invoice Page

### 🧾 Test Cases

#### 7.1 Tax Invoice Section
```
Test: TaxInvoiceSection
- Invoice Number (auto-generate)
- Issue Date
- Receipt Number (auto-generate)
- Payment Method: 
  - เงินสด (Cash)
  - เงินโอน (Transfer)
  - เช็ค (Cheque)
```

#### 7.2 Installment Selection
```
Test: เลือกงวดที่จะออกใบเสร็จ
- แสดงรายการงวดทั้งหมด
- % และจำนวนเงินของแต่ละงวด
- สถานะ: ยังไม่ชำระ / ชำระแล้ว

Action: เลือกงวดที่ 1
Expected: แสดงยอดเงินงวดนั้น
```

#### 7.3 Record Payment
```
Action: คลิก "บันทึกการชำระงวดนี้"

Expected:
- Mark installment เป็น "ชำระแล้ว"
- Update paymentTerms state
- Show success toast
```

#### 7.4 Export Receipt PDF (Single Installment)
```
Action: คลิก "Export ใบเสร็จงวดนี้"

Expected:
- Generate PDF ใบเสร็จสำหรับงวดที่เลือก
- แสดงรายละเอียด:
  - รายการวัสดุ (BOQ items)
  - ยอดชำระงวดนี้
  - Bank info + QR Code
  - ภาษีหัก ณ ที่จ่าย (ถ้ามี)
  - Signatures
```

**Component**: `/components/PDFExportWrapper.tsx`

#### 7.5 Save Document
```
Action: คลิก "บันทึกเอกสาร"

Expected:
- บันทึก Receipt document
- Show CompletionSummaryDialog
```

---

## ✅ Step 8: Export & Print

### 🖨️ Test Cases

#### 8.1 Export Full Document Set
```
Action: คลิก "ส่งออกเอกสารทั้งชุด"

Expected: Download ZIP ประกอบด้วย:
- BOQ.pdf
- Quotation.pdf
- Invoice.pdf
- Receipt_งวด1.pdf
- Receipt_งวด2.pdf (ถ้ามี)
- ...
```

#### 8.2 Large BOQ Export
```
Test: BOQ ที่มีรายการมาก (100+ items)

Action: ใช้ LargeBOQExportDialog
Features:
- Pagination (แบ่งหน้าอัตโนมัติ)
- Page breaks ที่เหมาะสม
- Table headers ทุกหน้า
- Summary ตอนท้าย

Expected: PDF ออกมาสวย ไม่ตัดแถว
```

**Component**: `/components/LargeBOQExportDialog.tsx`

#### 8.3 Print Preview
```
Test: คลิก Print (Ctrl+P)
Expected: 
- PDF-like layout
- @media print styles ทำงาน
- ซ่อน navigation และ buttons
```

---

## ✅ Step 9: History & Management

### 📁 Test Cases

#### 9.1 History Page
```
Action: ไปที่ "ประวัติ" จาก Navigation

Expected: แสดงรายการเอกสารทั้งหมด
- Filter by type: BOQ, Quotation, Invoice, Receipt
- Search by project name
- Sort by date
- Status badges: draft, sent, approved, paid
```

#### 9.2 Edit Document
```
Action: คลิกที่เอกสาร → "แก้ไข"

Expected:
- Load document data
- Navigate to BOQPage with editingDocument
- แก้ไขได้ปกติ
- Save = PUT `/documents/{id}`
```

#### 9.3 Delete Document
```
Action: คลิก "ลบ" → ยืนยัน

Expected:
- DELETE `/documents/{id}`
- รีเฟรช list
```

---

## ✅ Step 10: Reports & Analytics

### 📊 Test Cases

#### 10.1 Reports Page
```
Action: ไปที่ "รายงาน"

Expected: แสดง
- Monthly comparison charts
  - รายได้
  - ต้นทุน  
  - กำไรสุทธิ
- Bar charts (6 เดือน)
- Line charts (trends)
- Project breakdown by type
```

**Component**: `/pages/ReportsPageEnhanced.tsx`

#### 10.2 Filter & Date Range
```
Test:
- เลือกช่วงเวลา: สัปดาห์, เดือน, 6 เดือน, ปี
- Export รายงานเป็น Excel/CSV
```

---

## ✅ Step 11: Tax Management

### 💼 Test Cases

#### 11.1 Tax Management Page
```
Action: ไปที่ "จัดการภาษี"

Expected: แสดง
- VAT summary (รวม VAT ทั้งหมด)
- ภาษีหัก ณ ที่จ่าย (Withholding Tax)
- รายการแยกตามเดือน
- สถานะ: รอดำเนินการ / บันทึกแล้ว
```

#### 11.2 VAT Report
```
Test:
- รายการเอกสารที่มี VAT
- ยอดรวม VAT ต่อเดือน
- Export ใบรายงาน VAT
```

#### 11.3 Withholding Tax Report
```
Test: (Partner documents only)
- รายการหัก ณ ที่จ่าย
- แยกตามอัตรา (1%, 2%, 3%, 5%)
- Export ใบรายงานภาษีหัก ณ ที่จ่าย
```

---

## ✅ Step 12: Customers Management

### 👥 Test Cases

#### 12.1 Customers Page
```
Action: ไปที่ "ลูกค้า"

Expected:
- รายการลูกค้าทั้งหมด
- Search by name
- Card layout with company info
```

#### 12.2 Add Customer
```
Action: คลิก "เพิ่มลูกค้า"

Fields:
- ชื่อ-นามสกุล / ชื่อบริษัท
- เลขผู้เสียภาษี (Tax ID)
- ที่อยู่
- เบอร์โทร
- อีเมล

Expected: POST `/customers`
```

#### 12.3 Edit/Delete Customer
```
Test:
- แก้ไขข้อมูล → PUT `/customers/{id}`
- ลบ → DELETE `/customers/{id}`
```

---

## ✅ Step 13: Partners Management

### 🤝 Test Cases

#### 13.1 Partners Page
```
Action: ไปที่ "พาร์ทเนอร์"

Expected:
- รายการพาร์ทเนอร์ทั้งหมด
- แสดง commission rate
- Search by name
```

#### 13.2 Add Partner
```
Action: คลิก "เพิ่มพาร์ทเนอร์"

Fields:
- ชื่อ-นามสกุล / บริษัท
- ความเชี่ยวชาญ (specialty)
- Commission Rate (%)
- เบอร์โทร, อีเมล

Expected: POST `/partners`
```

#### 13.3 Create BOQ for Partner
```
Action: คลิก "สร้าง BOQ" จากการ์ดพาร์ทเนอร์

Expected:
- Navigate to BOQPage
- recipientType = 'partner'
- selectedPartner = partner data
- แสดง Withholding Tax section ใน Invoice
```

---

## 🐛 Known Issues & Fixes

### Issue 1: Dashboard Re-renders
✅ **Fixed**: useEffect deps = [user?.id] only

### Issue 2: Profile Not Saving
❌ **TODO**: เพิ่ม Save button ใน ProfileEditor → call API

### Issue 3: Customer/Partner Selection Missing
❌ **TODO**: เพิ่ม Popover dialog ใน BOQPage

### Issue 4: Cache Poisoning
✅ **Fixed**: User-specific cache isolation (`setApiUserId`)

### Issue 5: Social Login Not Working
⚠️ **Warning**: ต้อง setup Google/Facebook Provider ใน Supabase Dashboard

---

## 📝 Test Checklist

### Pre-Deployment Checklist

- [ ] Login with email/password works
- [ ] Dashboard loads < 2s
- [ ] Profile save/load works
- [ ] Create BOQ manually (add items)
- [ ] Create BOQ with SmartBOQ
- [ ] Create BOQ with Template
- [ ] Edit BOQ items (quantity, price)
- [ ] Go to Quotation (add discount)
- [ ] Go to Invoice (bank info + installments)
- [ ] Go to Receipt (record payment)
- [ ] Export PDF (single installment)
- [ ] Export full document set (ZIP)
- [ ] Large BOQ export (100+ items)
- [ ] View History (list all documents)
- [ ] Edit existing document
- [ ] Delete document
- [ ] View Reports (charts work)
- [ ] Tax Management (VAT + withholding)
- [ ] Add/Edit/Delete Customer
- [ ] Add/Edit/Delete Partner
- [ ] Create BOQ for Partner (withholding tax)
- [ ] Mobile responsive
- [ ] Print preview works
- [ ] Cache works (fast reload)
- [ ] No console errors
- [ ] No memory leaks

---

## 🚀 Performance Benchmarks

### Loading Times
- Login → Dashboard: < 2s
- Dashboard → BOQ: < 0.5s
- Save BOQ (< 100 items): < 500ms
- Save BOQ (100+ items): < 2s
- Export PDF: < 3s
- Load History: < 1s

### Cache Hit Rates
- Profile: > 90%
- Customers: > 80%
- Partners: > 80%
- Documents: > 70%
- Analytics: > 60%

---

## 📞 Support

หากพบปัญหา:
1. เช็ค Browser Console (F12) สำหรับ errors
2. เช็ค Network Tab สำหรับ failed requests
3. เปิด CacheDebugger (Settings) เพื่อดู cache stats
4. Report bug พร้อม screenshot + console logs

---

**Last Updated**: October 30, 2025  
**Testing by**: BOQ Dev Team  
**Status**: ✅ Ready for Production Testing

