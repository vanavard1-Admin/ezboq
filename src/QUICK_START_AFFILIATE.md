# 🎯 Quick Start: สร้างรหัสส่วนลด Affiliate

## 📌 วิธีสร้างรหัสส่วนลด (3 นาทีเสร็จ!)

### วิธีที่ 1: ผ่าน Browser Console (แนะนำ!)

1. **เปิดเว็บแอปของคุณ** (https://ezboq.com)

2. **กด F12** เพื่อเปิด Developer Console

3. **วาง Code นี้แล้วกด Enter**:

```javascript
// สร้างรหัสตัวอย่างทั้งหมดพร้อมกัน
await createExampleAffiliateCodes();
```

**เสร็จแล้ว!** ระบบจะสร้างรหัสพร้อมใช้งาน 4 รหัส:
- ✅ `WELCOME10` - ส่วนลด 10% (ไม่มีคอมมิชชั่น)
- ✅ `INFLUENCER15` - ส่วนลด 15%, คอมมิชชั่น 25%
- ✅ `PARTNER20` - ส่วนลด 20%, คอมมิชชั่น 30%
- ✅ `NEWYEAR2025` - ส่วนลด 25% (หมดอายุ 31/12/2025)

---

### วิธีที่ 2: สร้างรหัสเอง (Custom)

```javascript
// สร้างรหัสตามต้องการ
await createAffiliateCode({
  code: 'MYCODE10',           // รหัสที่ต้องการ (ตัวพิมพ์ใหญ่)
  ownerId: 'user-001',        // User ID ของเจ้าของรหัส
  ownerName: 'John Doe',      // ชื่อเจ้าของ
  discountPercent: 10,        // ส่วนลด 10%
  commissionPercent: 20,      // คอมมิชชั่น 20%
  maxUsage: 100,              // จำกัด 100 ครั้ง (optional)
  expiresAt: Date.now() + 30*24*60*60*1000  // หมดอายุ 30 วัน (optional)
});
```

---

## 🎨 ตัวอย่างรหัสสำหรับกรณีต่างๆ

### 1. รหัสต้อนรับผู้ใช้ใหม่
```javascript
await createAffiliateCode({
  code: 'FIRSTTIME15',
  ownerId: 'system',
  ownerName: 'BOQ System',
  discountPercent: 15,
  commissionPercent: 0,  // ไม่มีคอมมิชชั่น
  maxUsage: 1000
});
```

### 2. รหัสสำหรับ Influencer
```javascript
await createAffiliateCode({
  code: 'INFLUENCER25',
  ownerId: 'influencer-001',
  ownerName: 'Top Influencer',
  discountPercent: 25,      // ส่วนลด 25%
  commissionPercent: 30,    // คอมมิชชั่น 30%
});
```

### 3. รหัสโปรโมชั่นจำกัดเวลา
```javascript
await createAffiliateCode({
  code: 'FLASHSALE50',
  ownerId: 'system',
  ownerName: 'Flash Sale',
  discountPercent: 50,
  commissionPercent: 0,
  maxUsage: 50,                              // จำกัด 50 คนแรก
  expiresAt: Date.now() + 7*24*60*60*1000   // หมดอายุใน 7 วัน
});
```

### 4. รหัสสำหรับ Partner/Reseller
```javascript
await createAffiliateCode({
  code: 'PARTNER30',
  ownerId: 'partner-xyz',
  ownerName: 'Business Partner XYZ',
  discountPercent: 20,
  commissionPercent: 35,    // คอมมิชชั่นสูงสำหรับ partner
});
```

---

## 🔍 ตรวจสอบรหัสที่สร้างแล้ว

```javascript
// ดูข้อมูลรหัส
const response = await fetch(
  'https://YOUR_PROJECT.supabase.co/functions/v1/make-server-6e95bca3/affiliate/validate',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer YOUR_ANON_KEY'
    },
    body: JSON.stringify({ code: 'WELCOME10' })
  }
);
const data = await response.json();
console.log('รหัส:', data.affiliate);
```

---

## 💰 โครงสร้างคอมมิชชั่น (แนะนำ)

### ส่วนลดและคอมมิชชั่นที่สมดุล

| Type | Discount | Commission | Example |
|------|----------|-----------|---------|
| Welcome Code | 10-15% | 0% | WELCOME10 |
| Micro Influencer | 15-20% | 20-25% | MICRO15 |
| Influencer | 20-25% | 25-30% | INFLUENCER20 |
| Partner/Reseller | 15-20% | 30-35% | PARTNER20 |
| Flash Sale | 30-50% | 0% | FLASH30 |

### หลักการคำนวณ
- **ส่วนลด** = ส่วนที่ผู้ใช้ได้รับ (ลดจากราคาปกติ)
- **คอมมิชชั่น** = % จากราคาหลังหักส่วนลดที่ influencer ได้รับ

**ตัวอย่าง:**
- ราคาปกติ: ฿129
- ส่วนลด 20%: ผู้ใช้จ่าย ฿103.20
- คอมมิชชั่น 30%: Influencer ได้ ฿30.96

---

## 📊 วิธีแชร์รหัส

### 1. ใน Social Media
```
🎉 พิเศษ! รับส่วนลด 15% สำหรับ BOQ System
👉 ใช้รหัส: INFLUENCER15
🔗 ลิงก์: https://ezboq.com/membership
⏰ จำนวนจำกัด!
```

### 2. ใน Email/Newsletter
```
สวัสดีครับ/ค่ะ

ผม/ดิฉันอยากแนะนำ EZBOQ - ระบบทำ BOQ ที่ดีที่สุด!

🎁 พิเศษสำหรับคุณ: ส่วนลด 15%
รหัส: INFLUENCER15

👉 สมัครที่: https://ezboq.com/membership
```

### 3. ใน YouTube Description
```
📦 EZBOQ - ระบบทำ BOQ มืออาชีพ
💰 รับส่วนลด 15% ด้วยรหัส: INFLUENCER15
🔗 https://ezboq.com/membership

#BOQ #Construction #Discount
```

---

## ⚠️ สิ่งที่ต้องระวัง

1. **รหัสต้องเป็นตัวพิมพ์ใหญ่เท่านั้น** (A-Z, 0-9)
2. **ไม่ควรตั้งส่วนลดเกิน 50%** (ไม่คุ้มทุน)
3. **คอมมิชชั่นควรอยู่ที่ 20-35%** (สมดุล)
4. **ตั้ง maxUsage** สำหรับรหัสทดลอง
5. **ตั้ง expiresAt** สำหรับโปรโมชั่นระยะสั้น

---

## 🎯 Tips สำหรับความสำเร็จ

### 1. เลือกชื่อรหัสที่จำง่าย
- ✅ `JOHN10`, `BUILDER20`, `NEWYEAR25`
- ❌ `XJKL2024ABC`, `PROMO123456`

### 2. แชร์ผ่านหลายช่องทาง
- Social Media (Facebook, Instagram, TikTok)
- YouTube (Description + Pinned Comment)
- Email/Newsletter
- Blog/Website
- กลุ่ม Line/Discord

### 3. ติดตามผล
- ดูจำนวนการใช้งาน (usageCount)
- คำนวณคอมมิชชั่นที่ได้
- ปรับ discount/commission ตามผล

### 4. สร้าง Urgency
- จำกัดจำนวน (maxUsage)
- จำกัดเวลา (expiresAt)
- "ด่วน! เหลือ 20 สิทธิ์"

---

## 🚀 พร้อมแล้ว!

สร้างรหัสส่วนลดตอนนี้และเริ่มสร้างรายได้กันเลย!

**คำถาม?** อ่าน [AFFILIATE_SYSTEM.md](./AFFILIATE_SYSTEM.md) สำหรับรายละเอียดเพิ่มเติม

---

**Happy Marketing! 🎉**
