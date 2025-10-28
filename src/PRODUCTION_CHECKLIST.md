# ✅ Production Checklist - BOQ System

รายการตรวจสอบก่อน Deploy สู่ Production

**อัพเดทล่าสุด:** 28 ตุลาคม 2568

---

## 🎯 สรุปเร็ว

ระบบ BOQ มีฟีเจอร์หลัก:
- ✅ Workflow 4 ขั้นตอน: BOQ → Quotation → Invoice → Receipt
- ✅ รองรับลูกค้า (Customer) และพาร์ทเนอร์ (Partner)
- ✅ ระบบหัก ณ ที่จ่าย (Withholding Tax)
- ✅ PDF Export ทุก document type
- ✅ Tax Management สำหรับติดตามภาษี
- ✅ Reports & Analytics พร้อมกราฟ
- ✅ Catalog 270+ รายการวัสดุก่อสร้าง

---

## 🔐 1. Security & Auth

- [ ] ตรวจสอบ Supabase API Keys
  - [ ] SUPABASE_URL กำหนดค่าถูกต้อง
  - [ ] SUPABASE_ANON_KEY ใช้ anon key (ไม่ใช่ service role)
  - [ ] SUPABASE_SERVICE_ROLE_KEY เก็บใน server เท่านั้น (ห้ามรั่วไปยัง frontend)
  
- [ ] Row Level Security (RLS)
  - [ ] ตาราง `kv_store_6e95bca3` มี RLS Policy
  - [ ] ตรวจสอบว่า user เข้าถึงได้เฉพาะข้อมูลของตัวเอง

- [ ] Authentication
  - [ ] Email verification ปิดอยู่ (`email_confirm: true` ใน signup)
  - [ ] Password policy: ขั้นต่ำ 6 ตัวอักษร
  - [ ] Session timeout กำหนดค่าเหมาะสม

## 🎨 2. UI/UX

- [ ] ฟอนต์ไทย
  - [x] เพิ่ม Google Fonts (Sarabun + Noto Sans Thai)
  - [x] กำหนด `font-family` ใน body
  - [x] PDF export รองรับฟอนต์ไทย

- [ ] Responsive Design
  - [ ] ทดสอบบนมือถือ (320px - 768px)
  - [ ] ทดสอบบน Tablet (768px - 1024px)
  - [ ] ทดสอบบน Desktop (1024px+)

- [ ] Loading States
  - [x] แสดง Spinner เมื่อโหลดข้อมูล
  - [x] แสดง Progress Bar เมื่อ Export PDF
  - [x] Disable ปุ่มเมื่อกำลังทำงาน

- [ ] Error Handling
  - [x] แสดง Toast Notification เมื่อเกิด Error
  - [x] ข้อความ Error เป็นภาษาไทย
  - [ ] Log Error ไปยัง Console

## 📊 3. Features Testing

### BOQ Workflow
- [ ] สร้าง BOQ ใหม่
- [ ] เพิ่ม/แก้ไข/ลบรายการวัสดุ
- [ ] คำนวณราคาอัตโนมัติ (ค่าของเสีย, ค่าดำเนินการ, กำไร, VAT)
- [ ] บันทึก BOQ

### Quotation
- [x] เพิ่มส่วนลด (%)
- [x] คำนวณยอดสุทธิถูกต้อง
- [x] แสดงข้อมูลลูกค้า (นิติบุคคล/บุคคลธรรมดา)
- [x] รองรับพาร์ทเนอร์ (Partner)
- [x] บันทึก Quotation อัตโนมัติเมื่อไปขั้นตอนถัดไป
- [x] แสดงข้อมูล Quotation ในหน้าจัดการภาษี

### Invoice
- [ ] แบ่งงวดชำระ (% หรือจำนวนเงิน)
- [ ] คำนวณยอดคงเหลือถูกต้อง
- [ ] เลือกธนาคาร
- [ ] อัพโหลด QR Code
- [ ] แสดง QR Code ใน PDF

### Tax Invoice/Receipt
- [x] คำนวณหัก ณ ที่จ่าย (WHT)
- [x] แสดงเลขที่ผู้เสียภาษี (สำหรับนิติบุคคล)
- [x] ลายเซ็น (ผู้เสนอราคา/ลูกค้า/พยาน)
- [x] ระบบชำระงวด
  - [x] แสดงสถานะแต่ละงวด (paid/pending)
  - [x] Disable งวดถัดไปถ้ายังไม่ชำระงวดก่อน
  - [x] แสดงยอดชำระแล้ว และคงเหลือ
  - [x] ปุ่ม Export ใบเสร็จแต่ละงวด
  - [x] แสดงวันที่ชำระ และเลขที่ใบเสร็จ

### Customers
- [ ] เพิ่มลูกค้าใหม่ (บุคคลธรรมดา)
- [ ] เพิ่มลูกค้าใหม่ (นิติบุคคล พร้อมเลขที่ผู้เสียภาษี)
- [ ] แก้ไขลูกค้า
- [ ] ลบลูกค้า
- [ ] ค้นหาลูกค้า

### Partners
- [ ] เพิ่มพาร์ทเนอร์ใหม่
- [ ] แก้ไขพาร์ทเนอร์
- [ ] ลบพาร์ทเนอร์
- [ ] ดูประวัติเอกสารของพาร์ทเนอร์

### History
- [ ] ดูเอกสารย้อนหลัง
- [ ] กรองตามลูกค้า
- [ ] กรองตามพาร์ทเนอร์
- [ ] ค้นหาเอกสาร

### Profile
- [ ] อัพเดทข้อมูลส่วนตัว
- [ ] เลือกประเภทผู้ประกอบการ (100+ ประเภท)
- [ ] อัพโหลด Avatar
- [ ] กรอกข้อมูลบริษัท
- [ ] อัพโหลดโลโก้

### Team Management
- [ ] เชิญสมาชิกเข้าทีม (แผนทีมเท่านั้น)
- [ ] แสดงรายชื่อสมาชิก
- [ ] ลบสมาชิกออกจากทีม
- [ ] Redirect ไปหน้า Membership (ถ้าไม่ใช่แผนทีม)

### Membership
- [ ] แสดง 3 แผน (ฟรี, เดี่ยว, ทีม)
- [ ] Toggle รายเดือน/รายปี
- [ ] คำนวณส่วนลด 17% (แผนรายปี)
- [ ] อัพเกรดแผน (Mock - จริงต้องต่อ Payment Gateway)
- [ ] ตรวจสอบสิทธิ์สร้าง BOQ

### Reports & Tax Management
- [x] Dashboard แสดงสถิติ
- [x] กราฟรายได้ (Bar Chart, Line Chart, Pie Chart)
- [x] ตารางโครงการล่าสุด
- [x] คำนวณเงินประกัน (5%) และงานประกัน (3%)
- [x] แสดงกำไรสุทธิหลังหักภาษี
- [x] ส่งออกรายงานเป็น CSV
- [x] Tax Management - ติดตามภาษี VAT
- [x] Tax Management - แสดงข้อมูล Quotation
- [x] Tax Management - บันทึกภาษี

## 📄 4. PDF Export

- [x] ฟอนต์ไทยแสดงผลถูกต้อง
  - [x] Preload fonts ใน index.html
  - [x] กำหนด font-family ทั้ง body และ PDF sections
  - [x] ใช้ scale 4 สำหรับความคมชัด
  - [x] Force Thai fonts ใน html2canvas onclone
  - [x] รอ document.fonts.ready ก่อน export
  - [x] ใช้ PNG แทน JPEG
- [ ] BOQ PDF
  - [ ] Header (โลโก้, ข้อมูลบริษัท)
  - [ ] ข้อมูลลูกค้า (แยกบุคคลธรรมดา/นิติบุคคล)
  - [ ] ตารางรายการวัสดุ
  - [ ] สรุปยอดรวม
- [ ] Quotation PDF
  - [ ] แสดงส่วนลด
  - [ ] ยอดสุทธิ
- [ ] Invoice PDF
  - [ ] งวดชำระ
  - [ ] QR Code
  - [ ] ข้อมูลธนาคาร
- [ ] Receipt PDF
  - [x] หัก ณ ที่จ่าย
  - [x] เลขที่ผู้เสียภาษี
  - [x] ลายเซ็น
  - [x] แสดงงวดชำระ พร้อมสถานะ (ชำระแล้ว/รอชำระ)
  - [x] แสดงยอดชำระแล้ว และยอดคงเหลือ
  - [x] แสดงวันที่ชำระ และเลขที่ใบเสร็จ (ถ้ามี)

## 🗄️ 5. Database

- [ ] Backup Policy
  - [ ] ตั้งค่า Automatic Backup บน Supabase
  - [ ] ความถี่: Daily

- [ ] Data Validation
  - [ ] ตรวจสอบ Schema ของ KV Store
  - [ ] Key naming convention: `customer:`, `partner:`, `document:`, `profile:`, `membership:`, `team:`

- [ ] Performance
  - [ ] ใช้ `getByPrefix()` สำหรับ query หลายรายการ
  - [ ] ใช้ `mget()`, `mset()` สำหรับ bulk operations

## 🚀 6. Backend API

- [ ] Health Check
  - [ ] `/make-server-6e95bca3/health` response 200 OK

- [ ] CORS
  - [x] กำหนด `origin: "*"` (หรือระบุ domain จริง)
  - [x] Allow Methods: GET, POST, PUT, DELETE, OPTIONS

- [ ] Error Logging
  - [x] `console.log` ทุก endpoint
  - [x] แสดง error message ที่มีประโยชน์

- [ ] Authorization
  - [ ] Protected routes ต้องมี `Authorization` header
  - [ ] ใช้ `publicAnonKey` สำหรับ frontend
  - [ ] ใช้ `serviceRoleKey` สำหรับ admin operations (server-side only)

## 📱 7. Membership System

- [ ] Free Plan
  - [ ] จำกัด 1 BOQ
  - [ ] ตรวจสอบที่ Backend
  - [ ] แสดง Upgrade CTA

- [ ] Individual Plan
  - [ ] ไม่จำกัด BOQ
  - [ ] 1 ที่นั่ง
  - [ ] รายเดือน: ฿129
  - [ ] รายปี: ฿1,290 (ประหยัด 17%)

- [ ] Team Plan
  - [ ] ไม่จำกัด BOQ
  - [ ] 5 ที่นั่ง
  - [ ] รายเดือน: ฿499
  - [ ] รายปี: ฿4,990 (ประหยัด 17%)
  - [ ] Team Management

## 🧪 8. Testing

- [ ] Manual Testing
  - [ ] Happy Path: ทดสอบ workflow ปกติ
  - [ ] Edge Cases: ทดสอบกรณีพิเศษ (เช่น ลบลูกค้าที่มีเอกสาร)
  - [ ] Error Cases: ทดสอบกรณี error (เช่น network error)

- [ ] Cross-browser Testing
  - [ ] Chrome
  - [ ] Firefox
  - [ ] Safari
  - [ ] Edge

- [ ] Mobile Testing
  - [ ] iOS Safari
  - [ ] Android Chrome

## 📦 9. Deployment

- [ ] Environment Variables
  - [ ] ตั้งค่า `.env` บน Production server
  - [ ] ห้ามเก็บ secrets ใน code

- [ ] Build & Deploy
  - [ ] `npm run build` ไม่มี error/warning
  - [ ] Test บน staging environment ก่อน
  - [ ] Deploy ไป production

- [ ] Post-deployment
  - [ ] ตรวจสอบ `/health` endpoint
  - [ ] ลอง Login/Signup
  - [ ] ทดสอบ core features

## 📊 10. Monitoring

- [ ] Error Tracking
  - [ ] ติดตั้ง Sentry หรือ error tracking service
  - [ ] Monitor error rate

- [ ] Analytics (Optional)
  - [ ] จำนวน User
  - [ ] จำนวน BOQ/Quotation/Invoice สร้างต่อวัน
  - [ ] อัตราการแปลง Free → Paid

- [ ] Performance
  - [ ] Page load time < 3s
  - [ ] API response time < 500ms

## 🔄 11. Maintenance

- [ ] Regular Updates
  - [ ] อัพเดท dependencies ทุก 1-2 เดือน
  - [ ] ตรวจสอบ security vulnerabilities

- [ ] Backup
  - [ ] ทดสอบ restore จาก backup

- [ ] Documentation
  - [x] README.md
  - [x] PRODUCTION_CHECKLIST.md
  - [ ] API Documentation

## ⚠️ 12. Known Limitations & TODO

- [ ] **Email Invitation**
  - ยังไม่มี email service (Team invitation ใช้ mock)
  - TODO: ติดตั้ง SendGrid/Mailgun

- [ ] **Payment Gateway**
  - ยังไม่ต่อระบบชำระเงิน
  - TODO: ติดตั้ง Omise/2C2P/PayPal

- [ ] **File Storage**
  - โลโก้ + QR Code เก็บแบบ Base64 ใน Database
  - TODO: ย้ายไป Supabase Storage (สำหรับไฟล์ขนาดใหญ่)

- [ ] **Advanced PDF Export**
  - Export รายงานเป็น PDF (ปัจจุบันเป็น CSV)
  - TODO: ใช้ jsPDF สร้าง PDF report ที่ซับซ้อน

- [ ] **Supabase Social Login Setup**
  - ถ้าใช้ Social Login (Google, Facebook) ต้อง setup ที่ Supabase Console
  - TODO: ดูเอกสาร https://supabase.com/docs/guides/auth/social-login/

## 🎯 Final Check

- [ ] ✅ ทดสอบครบทุก features
- [ ] ✅ ฟอนต์ไทยแสดงผลถูกต้องใน PDF
- [ ] ✅ Security checks ผ่าน
- [ ] ✅ Performance ผ่าน
- [ ] ✅ Documentation ครบ
- [ ] ✅ Backup policy กำหนดแล้ว
- [ ] ✅ Monitoring setup แล้ว

---

## 🚀 Ready for Production!

เมื่อทำครบทุกข้อแล้ว ระบบพร้อม Deploy!

**Important**: อย่าลืมทดสอบบน Staging Environment ก่อน Deploy ไป Production
