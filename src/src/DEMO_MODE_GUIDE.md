# 🎮 Demo Mode Guide - EZBOQ

**ทดลองใช้งาน EZBOQ ได้ทันที โดยไม่ต้องตั้งค่า Supabase!**

---

## 🎯 Demo Mode คืออะไร?

**Demo Mode** เป็นโหมดทดลองใช้งานที่ช่วยให้คุณ:
- ✅ ทดสอบระบบ EZBOQ ได้เต็มรูปแบบ
- ✅ ไม่ต้องสมัครสมาชิก
- ✅ ไม่ต้องตั้งค่า Supabase
- ✅ ข้อมูลเก็บใน Local Storage (เครื่องคุณ)
- ⚠️ ข้อมูลจะหายเมื่อล้าง browser cache

**เหมาะสำหรับ:**
- 👨‍💻 Developer ที่ต้องการทดสอบโค้ด
- 🎨 Designer ที่ต้องการดู UI/UX
- 💼 ผู้ใช้ทั่วไปที่อยากดูก่อนสมัคร
- 🏢 นำเสนอลูกค้า (Demo/Presentation)

---

## 🚀 วิธีใช้งาน Demo Mode

### วิธีที่ 1: ผ่านหน้า Login (แนะนำ!)

1. เปิดเว็บ EZBOQ
2. หน้า Login จะมีปุ่ม **"ทดลองใช้งานทันที (Demo Mode)"**
3. คลิกปุ่มสีส้ม
4. ✅ เข้าสู่ระบบ Demo Mode ทันที!

---

### วิธีที่ 2: ผ่าน Browser Console (สำหรับ Developer)

เปิด Console (F12) แล้วรันคำสั่ง:

```javascript
// เข้า Demo Mode
localStorage.setItem('demo-mode', 'true');
localStorage.setItem('demo-user', JSON.stringify({
  id: 'demo-user-123',
  email: 'demo@ezboq.com',
  user_metadata: {
    name: 'ผู้ใช้ทดลอง'
  }
}));
window.location.reload();

// ออกจาก Demo Mode
localStorage.removeItem('demo-mode');
localStorage.removeItem('demo-user');
window.location.reload();
```

---

## 🎨 ฟีเจอร์ที่ใช้ได้ใน Demo Mode

### ✅ ใช้งานได้เต็มรูปแบบ

| ฟีเจอร์ | สถานะ | คำอธิบาย |
|---------|-------|----------|
| **Dashboard** | ✅ | ดู Dashboard พร้อมข้อมูลตัวอย่าง |
| **สร้าง BOQ** | ✅ | สร้างรายการวัสดุ (680+ items) |
| **Quotation** | ✅ | สร้างใบเสนอราคา |
| **Invoice** | ✅ | สร้างใบวางบิล |
| **Receipt** | ✅ | สร้างใบเสร็จ/ใบกำกับภาษี |
| **PDF Export** | ✅ | Export PDF ทุกประเภท |
| **Catalog** | ✅ | เลือกรายการจาก Catalog |
| **Profile** | ✅ | แก้ไข Profile (บันทึก local) |
| **Customers** | ✅ | จัดการลูกค้า (local) |
| **Partners** | ✅ | จัดการพาร์ทเนอร์ (local) |

### ⚠️ ข้อจำกัด

| สิ่งที่ไม่มี | เหตุผล |
|-------------|--------|
| **Save ถาวร** | ข้อมูลอยู่ใน Local Storage |
| **Sync ข้ามเครื่อง** | ไม่มี cloud backend |
| **History แท้จริง** | ไม่มี database |
| **Reports แท้จริง** | แสดงข้อมูล mock |
| **Email notifications** | ไม่มี server |

---

## 📊 ข้อมูลตัวอย่างใน Demo Mode

### Profile

```typescript
{
  name: 'ผู้ใช้ทดลอง',
  email: 'demo@ezboq.com',
  companyName: 'บริษัท ทดสอบระบบ จำกัด',
  address: '123 ถนนทดสอบ เขตทดลอง กรุงเทพฯ 10100',
  phone: '02-123-4567',
  taxId: '0000000000000',
  
  // Default Percentages
  wastagePercentage: 3,
  operationPercentage: 5,
  errorPercentage: 2,
  profitPercentage: 10,
  
  // Bank Info
  bankName: 'ธนาคารกรุงเทพ',
  bankAccountNumber: '123-4-56789-0',
  bankAccountName: 'บริษัท ทดสอบระบบ จำกัด'
}
```

### Stats (Dashboard)

```typescript
{
  totalProjects: 5,
  totalRevenue: 2,500,000,  // 2.5 ล้านบาท
  totalProfit: 375,000,      // 375,000 บาท
  avgProjectValue: 500,000   // 500,000 บาท/โครงการ
}
```

### Monthly Revenue Data

```typescript
[
  { month: 'ม.ค.', revenue: 350000, profit: 52500 },
  { month: 'ก.พ.', revenue: 420000, profit: 63000 },
  { month: 'มี.ค.', revenue: 480000, profit: 72000 },
  { month: 'เม.ย.', revenue: 550000, profit: 82500 },
  { month: 'พ.ค.', revenue: 520000, profit: 78000 },
  { month: 'มิ.ย.', revenue: 680000, profit: 102000 }
]
```

---

## 🎯 Use Cases

### 1. Developer Testing

**Scenario:** คุณกำลัง develop feature ใหม่

```bash
# 1. เปิด project
npm run dev

# 2. เข้า Demo Mode (คลิกปุ่มบนหน้า Login)

# 3. ทดสอบ feature
- สร้าง BOQ
- Export PDF
- ทดสอบ responsive

# 4. ออกจาก Demo (คลิกปุ่ม "ออกจาก Demo")

# 5. Deploy ตามปกติ
```

---

### 2. Client Presentation

**Scenario:** นำเสนอระบบให้ลูกค้า

**ขั้นตอน:**
1. เปิดเว็บบน projector/screen share
2. เข้า Demo Mode
3. แสดง workflow ทั้งหมด:
   - Dashboard
   - สร้าง BOQ
   - Quotation
   - Invoice
   - Receipt
   - Export PDF
4. ✅ ลูกค้าเห็นภาพรวมระบบ

**ข้อดี:**
- ไม่ต้องสร้างข้อมูลจริง
- Presentation ราบรื่น
- ข้อมูลสวยงาม ready-to-show

---

### 3. UI/UX Review

**Scenario:** ต้องการ review design

**ขั้นตอน:**
1. เข้า Demo Mode
2. ไล่ดูทุกหน้า
3. ทดสอบ responsive (mobile/tablet)
4. ตรวจสอบ animations
5. ทดสอบ user flow

**Note:** ไม่ต้องกังวลเรื่องข้อมูลเสีย

---

### 4. Training/Tutorial

**Scenario:** สอนพนักงานใช้ระบบ

**ขั้นตอน:**
1. เปิด Demo Mode
2. ให้พนักงานลองใช้
3. ข้อมูลหาย = เริ่มใหม่ได้เลย
4. ไม่กระทบข้อมูลจริง

---

## 🔧 การทำงานเบื้องหลัง

### Technical Details

**1. Authentication**

```typescript
// AppWithAuth.tsx
useEffect(() => {
  // Check Demo Mode first
  const isDemoMode = localStorage.getItem('demo-mode') === 'true';
  
  if (isDemoMode) {
    const demoUser = JSON.parse(localStorage.getItem('demo-user'));
    setUser(demoUser);
    setView('dashboard');
    return; // Skip Supabase auth
  }
  
  // Normal Supabase auth...
}, []);
```

**2. Data Loading**

```typescript
// Dashboard.tsx
const loadUserData = async () => {
  const isDemoMode = localStorage.getItem('demo-mode') === 'true';
  
  if (isDemoMode) {
    setProfile(DEMO_PROFILE);
    setMembership(DEMO_MEMBERSHIP);
    return; // Skip API call
  }
  
  // Normal API call...
};
```

**3. Logout**

```typescript
const handleLogout = async () => {
  const isDemoMode = localStorage.getItem('demo-mode') === 'true';
  
  if (isDemoMode) {
    localStorage.removeItem('demo-mode');
    localStorage.removeItem('demo-user');
    window.location.reload();
  } else {
    await supabase.auth.signOut();
  }
};
```

---

## 🎨 UI Indicators

### Demo Mode Banner

เมื่ออยู่ใน Demo Mode จะเห็น:

```
┌────────────────────────────────────────────────────┐
│ ⚡ โหมดทดลอง (Demo Mode)                           │
│ • ข้อมูลจะไม่ถูกบันทึกถาวร                         │
│ • เหมาะสำหรับทดลองใช้งาน          [ออกจาก Demo] │
└────────────────────────────────────────────────────┘
```

**สี:** Amber/Orange (สะดุดตา)  
**ตำแหน่ง:** ด้านบนสุดของหน้า  
**มีปุ่ม:** "ออกจาก Demo" สำหรับออกทันที

---

## ⚠️ ข้อควรระวัง

### 1. ข้อมูลไม่ถาวร

```
❌ อย่า: ใช้ Demo Mode ทำงานจริง
✅ ทำ: ใช้ Demo Mode เพื่อทดลองเท่านั้น
```

**ข้อมูลจะหายเมื่อ:**
- ล้าง browser cache
- ล้าง Local Storage
- เปลี่ยนเบราว์เซอร์
- เปลี่ยนเครื่อง

---

### 2. ไม่มี Sync

```
❌ อย่า: คาดหวังว่าข้อมูลจะ sync ข้ามเครื่อง
✅ ทำ: รู้ว่าข้อมูลอยู่เฉพาะเครื่องนี้
```

---

### 3. Performance

```
✅ Demo Mode เร็วกว่า (ไม่มี API call)
⚠️ แต่ไม่สะท้อนความเร็วจริงใน production
```

---

## 🔄 เปรียบเทียบ Demo Mode vs Production

| Feature | Demo Mode | Production |
|---------|-----------|------------|
| **ความเร็ว** | เร็วมาก (local) | ปกติ (API calls) |
| **ข้อมูล** | Mock data | ข้อมูลจริง |
| **Sync** | ไม่ได้ | ✅ Sync ข้าม device |
| **ถาวร** | ไม่ถาวร | ✅ ถาวร |
| **Auth** | Bypass | ✅ Supabase Auth |
| **PDF Export** | ✅ ทำงาน | ✅ ทำงาน |
| **Reports** | Mock charts | ✅ ข้อมูลจริง |
| **History** | ไม่มี | ✅ เก็บ database |

---

## 💡 Best Practices

### 1. สำหรับ Development

```bash
# ใช้ Demo Mode ตอน:
✅ ทดสอบ UI/UX
✅ Debug frontend
✅ ทดสอบ responsive
✅ ถ่าย screenshots

# ใช้ Production Mode ตอน:
✅ ทดสอบ API
✅ ทดสอบ auth flow
✅ ทดสอบ database
✅ Performance testing
```

---

### 2. สำหรับ Presentation

```bash
# เตรียมก่อนนำเสนอ:
1. เข้า Demo Mode
2. ทดสอบ workflow ทั้งหมด
3. ปิด browser tabs อื่น
4. เตรียม backup (ถ้าต้อง refresh)

# ระหว่างนำเสนอ:
1. อธิบายว่าเป็น Demo Mode
2. แสดงฟีเจอร์ทีละอย่าง
3. ไม่ต้องรอโหลด (เร็ว!)
4. ข้อมูลสวยพร้อมแสดง
```

---

### 3. สำหรับ Training

```bash
# Setup:
1. เปิด multiple tabs (แต่ละคนคนละ tab)
2. ทุกคนเข้า Demo Mode
3. ให้ลองทำตาม

# ข้อดี:
- ไม่กังวลข้อมูลเสีย
- Reset ง่าย (refresh)
- ไม่กระทบ production data
```

---

## 🐛 Troubleshooting

### ปัญหา: กดปุ่ม Demo แล้วไม่เข้า

**วิธีแก้:**
```javascript
// เปิด Console (F12) แล้วรัน:
localStorage.setItem('demo-mode', 'true');
localStorage.setItem('demo-user', JSON.stringify({
  id: 'demo-user-123',
  email: 'demo@ezboq.com',
  user_metadata: { name: 'ผู้ใช้ทดลอง' }
}));
window.location.reload();
```

---

### ปัญหา: อยากออกจาก Demo แต่ปุ่มหาย

**วิธีแก้:**
```javascript
// Console:
localStorage.removeItem('demo-mode');
localStorage.removeItem('demo-user');
window.location.reload();
```

---

### ปัญหา: ข้อมูลหาย

**คำตอบ:**
- ✅ ปกติครับ! Demo Mode ไม่ได้เก็บถาวร
- วิธีแก้: ใช้ Production Mode แทน (สมัครสมาชิก)

---

## 📞 FAQ

### Q: Demo Mode ปลอดภัยไหม?

**A:** ปลอดภัย 100%! 
- ข้อมูลอยู่เฉพาะเครื่องคุณ
- ไม่ส่งข้อมูลไปที่ไหน
- ไม่มี API calls

---

### Q: ข้อมูลใน Demo Mode เก็บไว้ที่ไหน?

**A:** Local Storage ในเบราว์เซอร์
- F12 → Application → Local Storage
- Key: `demo-mode`, `demo-user`

---

### Q: ทำไมต้องมี Demo Mode?

**A:** 
1. ให้ทดลองก่อนสมัคร
2. ไม่ต้องตั้งค่า Supabase (สะดวกขณะ dev)
3. เหมาะกับการ demo/present
4. ทดสอบได้ทันที

---

### Q: Production จะเร็วกว่า Demo ไหม?

**A:** Demo Mode เร็วกว่า!
- Demo: ไม่มี API call (instant)
- Production: มี API call (realistic)

---

### Q: จะแปลง Demo → Production ได้ไหม?

**A:** ไม่ได้โดยตรง
- ข้อมูล Demo ไม่ได้เก็บในฐานข้อมูล
- ต้องสร้างใหม่ใน Production

---

## 🎊 Summary

**Demo Mode เหมาะกับ:**
- ✅ Developer ทดสอบโค้ด
- ✅ Designer review UI/UX
- ✅ Sales demo ให้ลูกค้า
- ✅ Training พนักงาน
- ✅ ผู้ใช้ทั่วไปที่อยากลอง

**Production Mode เหมาะกับ:**
- ✅ การใช้งานจริง
- ✅ เก็บข้อมูลถาวร
- ✅ Sync ข้ามเครื่อง
- ✅ Reports แท้จริง

---

**กดปุ่มสีส้ม "ทดลองใช้งานทันที" แล้วสัมผัสระบบ EZBOQ เลย!** 🚀

---

**Created by:** Figma Make AI  
**Domain:** [EZBOQ.COM](https://ezboq.com)  
**Date:** 28 ตุลาคม 2568  
**Status:** 🎮 Demo Mode Ready!

---

Made with ❤️ for Thai Construction Industry 🇹🇭

**🎮 DEMO MODE ACTIVATED! 🎮**
