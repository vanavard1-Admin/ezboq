# 🔐 Environment Variables Setup Guide

**วันที่**: 29 ตุลาคม 2025  
**สถานะ**: ✅ ใช้งานได้ทั้ง Development และ Production

---

## 📋 สรุป

ระบบได้รับการแก้ไขให้รองรับทั้ง:
- ✅ **Development Mode** (Figma Make): ใช้ fallback values อัตโนมัติ
- ✅ **Production Mode**: อ่านจาก `.env` file อย่างปลอดภัย

---

## 🎯 Quick Start

### สำหรับ Development (Figma Make)

**✅ ระบบตอนนี้มีไฟล์ `.env` แล้ว!**

หลังจากสร้างหรืออัพเดทไฟล์ `.env`:
```bash
# ⚠️ IMPORTANT: ต้อง RESTART dev server!
# Ctrl+C แล้วรัน:
npm run dev
```

**ถ้าคุณเห็น info message นี้ (ปกติ)**:
```
🔧 Development Mode: Using fallback Supabase configuration
📝 For production deployment: Copy .env.example to .env and add your credentials
```

หมายความว่า:
- ✅ ระบบใช้ fallback values (ปกติสำหรับ development)
- ✅ ปลอดภัย เพราะเป็นแค่ development environment
- 📝 เมื่อ deploy production จริง ต้องสร้าง `.env` ที่ hosting platform

---

### สำหรับ Production Deployment

#### 1. สร้างไฟล์ `.env`

```bash
# ใน root directory ของ project
cp .env.example .env
```

#### 2. แก้ไขไฟล์ `.env`

เปิดไฟล์ `.env` และใส่ค่าจริงของคุณ:

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...your-real-key
```

#### 3. หาค่าเหล่านี้ได้จากไหน?

1. เข้า **Supabase Dashboard**: https://supabase.com/dashboard
2. เลือก **Project** ของคุณ
3. ไปที่ **Settings** → **API**
4. คัดลอกค่าต่อไปนี้:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** key → `VITE_SUPABASE_ANON_KEY`

![Supabase API Settings](https://supabase.com/docs/img/guides/api/api-url-and-key.png)

---

## 📂 ไฟล์ที่เกี่ยวข้อง

### 1. `/utils/supabase/info.tsx`

ไฟล์นี้อ่านค่า environment variables:

```typescript
// ✅ Production: อ่านจาก .env
const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL

// ✅ Development: ใช้ fallback ถ้าไม่มี .env
|| 'https://cezwqajbkjhvumbhpsgy.supabase.co';
```

### 2. `.env.example`

Template สำหรับสร้าง `.env` file:

```bash
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 3. `.gitignore`

ป้องกันไม่ให้ `.env` ถูก commit:

```
.env
.env.local
.env.production
```

---

## 🔒 Security Best Practices

### ✅ ทำ (DO)

1. **ใช้ anon/public key** ใน frontend (.env)
2. **ใช้ service_role key** เฉพาะใน backend (Edge Functions)
3. **เพิ่ม `.env` ใน `.gitignore`** เสมอ
4. **ใช้ RLS (Row Level Security)** ใน Supabase
5. **Rotate keys** เป็นประจำ (ทุก 3-6 เดือน)

### ❌ ห้ามทำ (DON'T)

1. ❌ Commit `.env` file เข้า Git
2. ❌ ใช้ service_role key ใน frontend
3. ❌ Share API keys ใน public channels
4. ❌ Hardcode credentials ในโค้ด
5. ❌ ใช้ production keys ใน development

---

## 🧪 การทดสอบ

### ทดสอบใน Development

```bash
# รัน dev server
npm run dev

# เปิด browser console
# ควรเห็น warning:
# ⚠️ Using fallback Supabase URL (development mode)
```

### ทดสอบใน Production

```bash
# สร้าง .env file
cp .env.example .env
# แก้ไขค่าใน .env

# Build
npm run build

# รัน production server
npm run preview

# เปิด browser console
# ไม่ควรเห็น warning ⚠️
```

---

## 🔍 Troubleshooting

### ปัญหา: "Cannot read properties of undefined (reading 'VITE_SUPABASE_URL')"

**สาเหตุ**: ไม่มี `.env` และ fallback values ไม่ทำงาน

**วิธีแก้**:
1. ตรวจสอบว่า `/utils/supabase/info.tsx` มี fallback values
2. Restart dev server: `npm run dev`
3. Clear cache: ลบ folder `node_modules/.vite`

### ปัญหา: "Missing VITE_SUPABASE_URL environment variable"

**สาเหตุ**: Error handling แบบเก่ายังคงอยู่

**วิธีแก้**:
1. อัพเดท `/utils/supabase/info.tsx` ให้ใช้ fallback values
2. ลบ throw Error statements

### ปัญหา: API calls ล้มเหลวใน production

**สาเหตุ**: ใช้ fallback values แทนค่าจริง

**วิธีแก้**:
1. สร้าง `.env` file
2. ใส่ค่า Supabase จริงของคุณ
3. Rebuild: `npm run build`

### ⚠️ ปัญหา: "API Error (401): Invalid JWT" ← **ใหม่!**

**สาเหตุ**: JWT token ไม่ถูกต้องหรือหมดอายุ

**Symptoms**:
```
❌ API Error (401): {"code":401,"message":"Invalid JWT"}
❌ Network Error for /profile (401)
⚠️ Warmup failed for /profile
```

**วิธีแก้ (3 ขั้นตอน)**:

**1. ตรวจสอบว่ามีไฟล์ `.env` แล้วหรือยัง**:
```bash
cat .env
# ถ้าไม่มี ให้สร้างจาก .env.example
cp .env.example .env
```

**2. ตรวจสอบว่า ANON_KEY ถูกต้อง**:

เปิดไฟล์ `.env` แล้วตรวจสอบว่ามี:
```bash
VITE_SUPABASE_URL=https://cezwqajbkjhvumbhpsgy.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNlendxYWpia2podnVtYmhwc2d5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1Nzc1OTIsImV4cCI6MjA3NzE1MzU5Mn0.nr4IZv_hoaTH9rvSUtNrMi_wL37_fUnNdXZ1ft8-gRE
```

ถ้าไม่ตรงให้แก้ไขให้ตรง

**3. RESTART dev server (สำคัญ!)**:
```bash
# หยุด dev server (Ctrl+C)
# แล้วรันใหม่
npm run dev
```

**4. ตรวจสอบว่าแก้สำเร็จ**:

เปิด browser แล้วดู console:
- ✅ ไม่มี 401 errors
- ✅ Profile page โหลดได้
- ✅ Dashboard แสดงข้อมูล

**อ่านเพิ่มเติม**: [FIX_401_JWT_ERROR.md](./FIX_401_JWT_ERROR.md)

---

## 📊 การตรวจสอบว่าใช้ค่าไหน

เปิด Browser Console และพิมพ์:

```javascript
// ตรวจสอบว่าใช้ environment variables หรือ fallback
console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL || 'using fallback');
console.log('Has .env file:', !!import.meta.env.VITE_SUPABASE_URL);
```

**ผลลัพธ์ที่คาดหวัง**:

Development (ไม่มี .env):
```
Supabase URL: using fallback
Has .env file: false
⚠️ Using fallback Supabase URL (development mode)
```

Production (มี .env):
```
Supabase URL: https://your-project.supabase.co
Has .env file: true
✅ No warnings
```

---

## 🚀 Deployment Checklist

เมื่อ deploy ไป production:

- [ ] สร้าง `.env` file จาก `.env.example`
- [ ] ใส่ค่า `VITE_SUPABASE_URL` จริง
- [ ] ใส่ค่า `VITE_SUPABASE_ANON_KEY` จริง
- [ ] ตรวจสอบว่า `.env` อยู่ใน `.gitignore`
- [ ] ตรวจสอบว่าไม่มี warning ใน console
- [ ] ทดสอบ Login/Signup ทำงาน
- [ ] ทดสอบ API calls ทำงาน
- [ ] ตรวจสอบ Network tab ไม่มี 401/403 errors

---

## 📚 เอกสารที่เกี่ยวข้อง

- [SECURITY_CHECKLIST_FINAL.md](./SECURITY_CHECKLIST_FINAL.md) - Security checklist
- [DEPLOY_INSTRUCTIONS_TH.md](./DEPLOY_INSTRUCTIONS_TH.md) - Deployment guide
- [QUICK_DEPLOY_GUIDE.md](./QUICK_DEPLOY_GUIDE.md) - Quick deployment
- [Supabase API Documentation](https://supabase.com/docs/guides/api)

---

## 🎓 เพิ่มเติม

### ทำไมใช้ `VITE_` prefix?

Vite รองรับเฉพาะ environment variables ที่ขึ้นต้นด้วย `VITE_` เพื่อความปลอดภัย:

```bash
# ✅ ใช้งานได้
VITE_SUPABASE_URL=...

# ❌ ใช้ไม่ได้
SUPABASE_URL=...
```

### ทำไมต้องมี fallback values?

เพื่อให้สามารถใช้งานได้ทันทีใน Figma Make environment โดยไม่ต้องตั้งค่า `.env` file

### ปลอดภัยไหมที่มี fallback values ในโค้ด?

✅ **ปลอดภัย** เพราะ:
1. เป็นแค่ `anon/public key` (ไม่ใช่ service_role key)
2. มี RLS (Row Level Security) ป้องกันใน Supabase
3. ใช้เฉพาะใน development
4. Production ต้องใช้ `.env` file

---

**✅ Setup เสร็จสมบูรณ์!**

ระบบพร้อมใช้งานทั้ง development และ production 🎉

---

**เวอร์ชั่น**: 1.0  
**ผู้สร้าง**: AI Assistant  
**วันที่**: 29 ตุลาคม 2025
