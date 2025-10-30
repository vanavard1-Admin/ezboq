# 🎯 ระบบ Affiliate / Referral Code

## 📌 ภาพรวม

ระบบส่วนลดและ Affiliate Marketing แบบ **Win-Win-Win**:
- 👥 **ผู้ใช้** ได้ส่วนลดพิเศษ (10-25%)
- 💰 **Influencer/Partner** ได้คอมมิชชั่น (20-30%)
- 📈 **เรา** ได้ผู้ใช้เพิ่ม ผ่านการตลาดแบบ Affiliate

## ✨ ฟีเจอร์

### 1. การใช้งานสำหรับผู้ใช้
- ✅ ใส่รหัสส่วนลดในหน้า Membership ก่อนชำระเงิน
- ✅ ระบบตรวจสอบความถูกต้องแบบ Real-time
- ✅ แสดงข้อมูลผู้แนะนำและส่วนลดที่ได้
- ✅ คำนวณราคาหลังหักส่วนลดทันที
- ✅ สามารถยกเลิกและใส่รหัสใหม่ได้

### 2. ประเภทรหัสส่วนลด

#### System Promo Codes (ไม่มีคอมมิชชั่น)
- `WELCOME10` - ส่วนลด 10% สำหรับผู้ใช้ใหม่
- `NEWYEAR2025` - ส่วนลด 25% โปรโมชั่นปีใหม่

#### Influencer Codes (มีคอมมิชชั่น)
- `INFLUENCER15` - ส่วนลด 15%, คอมมิชชั่น 25%
- `PARTNER20` - ส่วนลด 20%, คอมมิชชั่น 30%

### 3. ระบบติดตาม (Tracking)
- ✅ นับจำนวนการใช้งานอัตโนมัติ
- ✅ บันทึกคอมมิชชั่นทุกครั้งที่มีการชำระเงิน
- ✅ ข้อมูล: ราคาปกติ, ราคาหลังส่วนลด, คอมมิชชั่น
- ✅ เก็บข้อมูลผู้ใช้และ timestamp

## 🚀 การสร้างรหัสส่วนลด

### วิธีที่ 1: ผ่าน Browser Console

```javascript
// เปิด Browser Console (F12)

// สร้างรหัสเดี่ยว
await createAffiliateCode({
  code: 'MYCODE10',
  ownerId: 'user-123',
  ownerName: 'John Doe',
  discountPercent: 10,      // ส่วนลดให้ผู้ใช้ 10%
  commissionPercent: 20,    // คอมมิชชั่นให้ผู้แนะนำ 20%
  maxUsage: 100,            // จำกัด 100 ครั้ง (optional)
  expiresAt: Date.now() + 30*24*60*60*1000  // หมดอายุ 30 วัน (optional)
});

// สร้างรหัสตัวอย่างทั้งหมด
await createExampleAffiliateCodes();
```

### วิธีที่ 2: ผ่าน API

```bash
# POST https://YOUR_PROJECT.supabase.co/functions/v1/make-server-6e95bca3/affiliate/create
# Headers: 
#   Content-Type: application/json
#   Authorization: Bearer YOUR_ANON_KEY

curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/make-server-6e95bca3/affiliate/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{
    "code": "MYCODE10",
    "ownerId": "user-123",
    "ownerName": "John Doe",
    "discountPercent": 10,
    "commissionPercent": 20
  }'
```

## 📊 โครงสร้างข้อมูล

### Affiliate Code
```typescript
{
  code: string;              // "INFLUENCER10"
  ownerId: string;           // User ID ของผู้แนะนำ
  ownerName: string;         // "John Doe"
  discountPercent: number;   // 10-100
  commissionPercent: number; // 0-100
  usageCount: number;        // จำนวนครั้งที่ใช้
  active: boolean;           // เปิด/ปิดใช้งาน
  maxUsage?: number;         // จำกัดจำนวนครั้ง
  expiresAt?: number;        // วันหมดอายุ (timestamp)
  createdAt: number;         // วันที่สร้าง
}
```

### Commission Record
```typescript
{
  affiliateCode: string;     // รหัสที่ใช้
  ownerId: string;           // ผู้แนะนำ
  ownerName: string;         
  userId: string;            // ผู้ใช้ที่ซื้อ
  originalPrice: number;     // ราคาปกติ
  finalPrice: number;        // ราคาหลังส่วนลด
  discountAmount: number;    // จำนวนเงินส่วนลด
  discountPercent: number;   
  commissionPercent: number; 
  commissionAmount: number;  // คอมมิชชั่นที่จะได้รับ
  timestamp: number;         // เวลาที่ทำรายการ
}
```

## 🎨 UI Components

### 1. `<PromoCodeSection>`
- Input field สำหรับใส่รหัส
- ปุ่มตรวจสอบความถูกต้อง
- แสดง error messages
- แสดงข้อมูลรหัสที่ใช้งาน
- ปุ่มยกเลิกรหัส

### 2. `<PriceSummaryWithDiscount>`
- แสดงราคาปกติ
- แสดงส่วนลด (%)
- แสดงราคาหลังหักส่วนลด
- แสดงข้อมูลผู้แนะนำ

## 📈 การดูรายงาน

### รายงานการใช้งานรหัส
```javascript
// ดูข้อมูลรหัสส่วนลด
const response = await fetch(
  'https://YOUR_PROJECT.supabase.co/functions/v1/make-server-6e95bca3/affiliate/validate',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer YOUR_ANON_KEY'
    },
    body: JSON.stringify({ code: 'INFLUENCER10' })
  }
);
const data = await response.json();
console.log('Usage count:', data.affiliate.usageCount);
```

## 🔒 การรักษาความปลอดภัย

- ✅ Validation ทั้ง Frontend และ Backend
- ✅ ตรวจสอบอายุและจำนวนการใช้งาน
- ✅ ป้องกันการใช้รหัสซ้ำในรอบเดียว
- ✅ Sanitize input ป้องกัน injection

## 🎯 Best Practices

### สำหรับระบบ
1. ตั้งค่าส่วนลดไม่เกิน 25% เพื่อรักษาผลกำไร
2. ตั้งค่าคอมมิชชั่นในระดับที่จูงใจ (20-30%)
3. ใช้ maxUsage เพื่อควบคุมงบประมาณ
4. ตั้ง expiresAt สำหรับโปรโมชั่นระยะสั้น

### สำหรับ Influencer
1. เลือกรหัสที่จดจำง่าย เช่น `YOURNAME10`
2. แชร์รหัสผ่านช่องทางของตัวเอง
3. ติดตามผลการใช้งานเป็นประจำ

## 📝 ตัวอย่างการใช้งาน

### Scenario 1: ผู้ใช้ใหม่
```
1. เข้าหน้า Membership
2. เลือก Pro Plan (฿129/เดือน)
3. ใส่รหัส "WELCOME10"
4. ได้ส่วนลด 10% = จ่ายเพียง ฿116
```

### Scenario 2: Influencer Marketing
```
1. Influencer แชร์รหัส "INFLUENCER15"
2. ผู้ใช้ใช้รหัสซื้อ Pro Plan ฿129
3. ผู้ใช้ได้ส่วนลด 15% = จ่าย ฿110
4. Influencer ได้คอมมิชชั่น 25% จาก ฿110 = ฿27.50
```

## 🚦 API Endpoints

### POST `/affiliate/validate`
ตรวจสอบความถูกต้องของรหัส

**Request:**
```json
{
  "code": "INFLUENCER10"
}
```

**Response (Success):**
```json
{
  "success": true,
  "affiliate": {
    "code": "INFLUENCER10",
    "ownerId": "user-123",
    "ownerName": "John Doe",
    "discountPercent": 15,
    "commissionPercent": 25,
    "usageCount": 42,
    "active": true
  }
}
```

**Response (Error):**
```json
{
  "success": false,
  "message": "รหัสไม่ถูกต้องหรือหมดอายุ"
}
```

### POST `/affiliate/create`
สร้างรหัสใหม่

**Request:**
```json
{
  "code": "MYCODE10",
  "ownerId": "user-123",
  "ownerName": "John Doe",
  "discountPercent": 10,
  "commissionPercent": 20,
  "maxUsage": 100,
  "expiresAt": 1735689600000
}
```

### POST `/membership`
อัพเดท Membership (พร้อมติดตามการใช้รหัส)

**Request:**
```json
{
  "membership": { /* membership object */ },
  "affiliate": {
    "code": "INFLUENCER10",
    "ownerId": "user-123",
    "ownerName": "John Doe",
    "originalPrice": 129,
    "finalPrice": 110,
    "discountAmount": 19,
    "discountPercent": 15,
    "commissionPercent": 25
  }
}
```

## 🎉 สรุป

ระบบ Affiliate/Referral Code นี้ช่วยให้:
- **ผู้ใช้** ได้ส่วนลดและรู้สึกคุ้มค่า
- **Influencer** ได้รายได้เสริมจากการแนะนำ  
- **ธุรกิจ** เติบโตผ่าน Word-of-Mouth Marketing

สร้าง win-win-win situation สำหรับทุกฝ่าย! 🚀
