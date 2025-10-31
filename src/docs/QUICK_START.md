# คู่มือเริ่มต้นใช้งาน BOQ Application

## การติดตั้งและรัน

### Development Mode
```bash
npm install
npm run dev
```

### Production Deployment
```bash
npm run build
# Deploy to your hosting service
```

## การเริ่มต้นใช้งาน

### 1. Login
- Email/Password
- Google Login (ต้องตั้งค่า OAuth credentials)
- Facebook Login (ต้องตั้งค่า App credentials)

### 2. ตั้งค่า Profile
1. ไปที่ Settings > Profile
2. กรอกข้อมูลบริษัท
3. อัพโหลดโลโก้
4. เพิ่มข้อมูลธนาคาร
5. อัพโหลด QR Code พร้อมเพย์

### 3. สร้าง BOQ แรก

#### แบบ Manual
1. คลิก "New BOQ" ที่ Dashboard
2. กรอกข้อมูลโครงการ
3. เพิ่มรายการวัสดุ (Add Item)
4. Save BOQ

#### แบบ SmartBOQ (แนะนำ)
1. คลิก "SmartBOQ"
2. เลือกประเภทโครงการ (10 ประเภท)
3. กรอกข้อมูลพื้นที่
4. ระบบจะสร้าง BOQ อัตโนมัติ
5. ปรับแต่งตามต้องการ

#### แบบ Template
1. คลิก "Use Template"
2. เลือกจาก 40+ templates
3. Customize ตามต้องการ

### 4. Workflow 4 ขั้นตอน

```
Step 1: BOQ (ถอดวัสดุ)
   ↓
Step 2: Quotation (ใบเสนอราคา)
   ↓
Step 3: Invoice (ใบแจ้งหนี้)
   ↓
Step 4: Tax Invoice/Receipt (ใบกำกับภาษี/ใบเสร็จ)
```

### 5. จัดการลูกค้าและพาร์ทเนอร์

#### เพิ่มลูกค้า
1. ไปที่ Customers
2. คลิก "Add Customer"
3. กรอกข้อมูล
4. Save

#### เพิ่มพาร์ทเนอร์
1. ไปที่ Partners
2. คลิก "Add Partner"  
3. กรอกข้อมูล
4. กำหนด commission rate
5. Save

### 6. Export PDF

#### Export แบบธรรมดา
- คลิกปุ่ม "Export PDF" ในแต่ละหน้า

#### Export BOQ ขนาดใหญ่
- ใช้ "Large BOQ Export" สำหรับ BOQ ที่มีรายการมาก (100+ items)
- รองรับ pagination และ page breaks อัตโนมัติ

## Features หลัก

### Catalog (750+ รายการ)
- 40 หมวดหมู่
- ค้นหาวัสดุได้รวดเร็ว
- ราคาปรับตาม profile

### SmartBOQ
- บ้านเดี่ยว
- ทาวน์เฮ้าส์
- อาคารพาณิชย์
- โรงงาน
- และอีก 6 ประเภท

### การคำนวณ
- ราคาอัตโนมัติตาม profile
- ส่วนลดหลายรูปแบบ
- ภาษี VAT 7%
- ภาษีหัก ณ ที่จ่าย (1%, 2%, 3%, 5%)

### ระบบแบ่งงวด
- กำหนดงวดชำระได้ไม่จำกัด
- คำนวณเปอร์เซ็นต์อัตโนมัติ
- Track สถานะการชำระ

### รายงาน
- เปรียบเทียบรายเดือน
- กราฟแสดงแนวโน้ม
- Export เป็น Excel

## Performance

### Cache System
- **Cache-First Strategy**: ทุก GET requests
- **Auto Invalidation**: เมื่อมีการแก้ไขข้อมูล
- **User Isolation**: Cache แยกตาม user อัตโนมัติ

### Optimization
- **Nuclear Mode**: Enabled โดยอัตโนมัติ
- **Lazy Loading**: Components โหลดเมื่อต้องใช้
- **Image Preloading**: รูปภาพโหลดล่วงหน้า

## Tips การใช้งาน

1. **ใช้ SmartBOQ** แทนการสร้าง BOQ เอง = ประหยัดเวลา 80%
2. **ใช้ Template** สำหรับโครงการที่ซ้ำๆ
3. **เปิด Cache Debugger** เพื่อ monitor performance
4. **Export PDF แบบ Large** สำหรับ BOQ ใหญ่ๆ
5. **ใช้ Promo Code** เพื่อส่วนลดพิเศษ

## Next Steps

- อ่าน [User Manual](./USER_MANUAL.md) สำหรับรายละเอียดเพิ่มเติม
- ดู [Template Guide](./TEMPLATE_GUIDE.md) สำหรับการใช้ template
- ศึกษา [Performance Guide](./PERFORMANCE_OPTIMIZATION.md)
- ตรวจสอบ [Security Guide](./SECURITY_README.md)

