# คู่มือแก้ปัญหา BOQ Application

## ปัญหาที่พบบ่อย

### 1. ปัญหา Cache และ Performance

#### Cache ไม่ทำงาน
- **อาการ**: ข้อมูลโหลดช้า หรือไม่แสดงผล
- **วิธีแก้**: เปิด CacheDebugger ใน Settings และตรวจสอบ cache stats
- **การ Clear Cache**: กดปุ่ม "Clear All Cache" ใน Settings

#### Body Stream Already Read Error
- **แก้ไขแล้ว**: Response จะถูก clone ก่อนส่งกลับ
- **หากเกิดอีก**: Restart dev server

### 2. ปัญหา Authentication

#### 401 Unauthorized
- **สาเหตุ**: JWT token หมดอายุ
- **วิธีแก้**: Logout แล้ว Login ใหม่

#### Social Login ไม่ทำงาน
- **Google**: ตั้งค่าที่ https://supabase.com/docs/guides/auth/social-login/auth-google
- **Facebook**: ตั้งค่าที่ https://supabase.com/docs/guides/auth/social-login/auth-facebook

### 3. ปัญหา 404 Not Found

#### Profile Endpoints
- **แก้ไขแล้ว**: ทุก endpoints มี cache isolation แยกตาม userId
- **หากเกิดอีก**: ตรวจสอบว่า userId ถูกส่งไปในทุก API calls

### 4. ปัญหา PDF Export

#### PDF ไม่แสดงข้อมูลครบ
- **ตรวจสอบ**: ข้อมูลใน state ก่อน export
- **Large BOQ**: ใช้ LargeBOQExportDialog สำหรับ BOQ ขนาดใหญ่

### 5. ปัญหา Performance

#### หน้าเว็บโหลดช้า
- **Nuclear Mode**: ระบบใช้ cache-first strategy อัตโนมัติ
- **ตรวจสอบ**: เปิด Performance Monitor ใน Settings

#### Database Query ช้า
- **แก้ไขแล้ว**: ทุก GET endpoints ใช้ cache-first with database fallback
- **Cache Duration**: 5 นาทีสำหรับข้อมูลทั่วไป, 30 วินาทีสำหรับ dashboard

### 6. ปัญหา Mobile

#### UI แสดงผลไม่ถูกต้องบนมือถือ
- **ตรวจสอบ**: Responsive design อัตโนมัติ
- **Document Selector**: ใช้ Sheet แทน Dialog บน mobile

## การ Debug

### เปิด Debug Mode
1. ไปที่ Settings
2. เปิด "Show Cache Debugger"
3. เปิด "Enable Performance Monitor"

### ตรวจสอบ Logs
- Browser Console (F12)
- Network Tab สำหรับ API calls
- Cache Debugger สำหรับ cache stats

## ติดต่อ Support

หากพบปัญหาที่ไม่สามารถแก้ได้:
1. Capture screenshot
2. Export console logs
3. ส่งรายละเอียดมาที่ support

