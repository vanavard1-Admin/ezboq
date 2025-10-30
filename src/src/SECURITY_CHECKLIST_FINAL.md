# ✅ Security Checklist - Production Ready

## 🔐 Environment Variables Security

### สถานะ: ✅ PASS - ปลอดภัยแล้ว

#### ✅ ไฟล์ที่แก้ไขแล้ว:
1. **`/utils/supabase/info.tsx`** - เปลี่ยนจาก hardcode เป็นอ่านจาก env variables
2. **`/utils/supabase/client.ts`** - ใช้ info.tsx ที่อ่านจาก env แล้ว
3. **`/.gitignore`** - สร้างใหม่ ป้องกัน .env ทุกไฟล์ (ยกเว้น .env.example)
4. **`/.env.example`** - สร้าง template สำหรับ developers

---

## 📋 Pre-Deploy Checklist

### 1. ตรวจสอบไม่มีคีย์หลุดใน Code
```bash
# ค้นหา hardcoded credentials
git grep -i "supabase.co" src/ utils/ components/ pages/
git grep -i "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9" .

# ถ้าไม่มีผลลัพธ์ = ปลอดภัย ✅
```

### 2. ตรวจสอบ .env ไม่ถูก commit
```bash
# ต้องไม่เห็น .env ในรายการ
git status

# ถ้า .env โผล่มา ให้ลบออกจาก staging
git rm --cached .env
git rm --cached .env.local
git rm --cached .env.production
```

### 3. ตรวจสอบ Environment Variables ใน Production
ใน Hosting Platform (Vercel/Netlify/Cloudflare Pages) ตั้งค่า:
```
VITE_SUPABASE_URL=https://cezwqajbkjhvumbhpsgy.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNlendxYWpia2podnVtYmhwc2d5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1Nzc1OTIsImV4cCI6MjA3NzE1MzU5Mn0.nr4IZv_hoaTH9rvSUtNrMi_wL37_fUnNdXZ1ft8-gRE
SENTRY_DSN=
APP_ENV=production
DEBUG=false
```

---

## 🔒 Supabase Security Settings

### ตรวจสอบใน Supabase Dashboard

#### 1. Row Level Security (RLS)
- ไปที่ **Database → Tables**
- ตรวจสอบทุกตารางเปิด RLS: `✓ Enable RLS`
- สร้าง Policies สำหรับแต่ละตาราง:

```sql
-- ตัวอย่าง Policy สำหรับ kv_store_6e95bca3
CREATE POLICY "Users can read their own data"
ON kv_store_6e95bca3 FOR SELECT
TO authenticated
USING (
  (value->>'user_id')::text = auth.uid()::text 
  OR is_public = true
);

CREATE POLICY "Users can write their own data"
ON kv_store_6e95bca3 FOR INSERT
TO authenticated
WITH CHECK (
  (value->>'user_id')::text = auth.uid()::text
);

CREATE POLICY "Users can update their own data"
ON kv_store_6e95bca3 FOR UPDATE
TO authenticated
USING ((value->>'user_id')::text = auth.uid()::text)
WITH CHECK ((value->>'user_id')::text = auth.uid()::text);

CREATE POLICY "Users can delete their own data"
ON kv_store_6e95bca3 FOR DELETE
TO authenticated
USING ((value->>'user_id')::text = auth.uid()::text);
```

#### 2. API Settings
- ไปที่ **Project Settings → API**
- ตรวจสอบ:
  - ✅ Project URL: `https://cezwqajbkjhvumbhpsgy.supabase.co`
  - ✅ anon key: ใช้เป็น public key (ปลอดภัย)
  - ⚠️ service_role key: **ห้าม** expose ไปยัง frontend

#### 3. Auth Settings
- ไปที่ **Authentication → URL Configuration**
- เพิ่ม Site URL และ Redirect URLs:
```
Site URL: https://your-domain.com
Redirect URLs:
  - https://your-domain.com
  - https://your-domain.com/**
  - http://localhost:5173 (dev only)
```

#### 4. Edge Functions (Server)
- Service Role Key ใช้เฉพาะใน Edge Functions เท่านั้น
- ✅ อยู่ใน Environment Variables ของ Supabase Edge Functions
- ✅ ไม่ถูก expose ไปยัง frontend

---

## 🛡️ Content Security Policy (CSP)

### เพิ่มใน `index.html` (ถ้ายังไม่มี)

```html
<meta http-equiv="Content-Security-Policy" 
  content="default-src 'self'; 
           img-src 'self' data: https: blob:; 
           script-src 'self' 'unsafe-inline' 'unsafe-eval'; 
           style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; 
           font-src 'self' https://fonts.gstatic.com; 
           connect-src 'self' https://*.supabase.co https://api.sentry.io;">
```

---

## 🧪 Pre-Deployment Testing

### Local Development Test
```bash
# 1. สร้างไฟล์ .env ใหม่จาก template
cp .env.example .env

# 2. เติมค่าจริงใน .env (อย่า commit!)
nano .env

# 3. ทดสอบ build
npm run build

# 4. ทดสอบ preview
npm run preview

# 5. เช็ค console ไม่มี error เกี่ยวกับ env
```

### Production Environment Test
```bash
# Build production
npm run build

# ต้องไม่มี error เกี่ยวกับ missing env variables
# ต้อง build สำเร็จ
```

---

## 📊 Monitoring Setup (Optional แต่แนะนำ)

### Sentry Error Tracking
1. สมัคร https://sentry.io (ฟรี)
2. สร้าง project สำหรับ React
3. ใส่ DSN ใน environment variables:
```
SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx
```

---

## ✅ Final Verification

### ก่อน Deploy ให้ทำตามนี้:

```bash
# 1. Clean install dependencies
rm -rf node_modules package-lock.json
npm install

# 2. Type check
npm run type-check  # ถ้ามี script นี้

# 3. Build production
npm run build

# 4. ตรวจสอบ .gitignore ทำงาน
git status | grep .env
# ต้องไม่เห็น .env (ยกเว้น .env.example)

# 5. ค้นหา hardcoded secrets
git grep -n "cezwqajbkjhvumbhpsgy" src/ utils/ components/ pages/
git grep -n "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9" src/ utils/ components/ pages/
# ต้องไม่มีผลลัพธ์

# 6. Commit changes
git add .
git commit -m "Security: Remove hardcoded credentials, use env variables"

# 7. Push to repository
git push origin main
```

---

## 🚀 Deploy Commands

### Vercel
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod

# Set environment variables (one-time)
vercel env add VITE_SUPABASE_URL production
vercel env add VITE_SUPABASE_ANON_KEY production
```

### Netlify
```bash
# Install Netlify CLI
npm i -g netlify-cli

# Login
netlify login

# Deploy
netlify deploy --prod

# หรือใช้ netlify.toml
```

### Cloudflare Pages
```bash
# เชื่อมต่อ GitHub repository
# ตั้งค่า environment variables ใน Dashboard
# Auto deploy on push
```

---

## 🔄 Post-Deployment Checklist

1. ✅ เว็บโหลดได้ปกติ
2. ✅ Login/Signup ทำงานได้
3. ✅ ดึงข้อมูลจาก Supabase ได้
4. ✅ บันทึกข้อมูลได้
5. ✅ ไม่มี CORS errors
6. ✅ ไม่มี console errors เกี่ยวกับ authentication
7. ✅ ตรวจสอบ Network tab ไม่มี 401/403 errors

---

## 🆘 Troubleshooting

### ถ้า Build Error: "Missing VITE_SUPABASE_URL"
➡️ เพิ่ม environment variables ใน hosting platform

### ถ้า Runtime Error: "Invalid API key"
➡️ ตรวจสอบ VITE_SUPABASE_ANON_KEY ถูกต้องและไม่มีช่องว่างหรือ newline

### ถ้า CORS Error
➡️ ตั้งค่า Allowed Origins ใน Supabase Auth Settings

### ถ้า 401 Unauthorized
➡️ ตรวจสอบ RLS Policies ใน Supabase

---

## 📝 Summary

### สิ่งที่ทำไปแล้ว:
- ✅ ลบ hardcoded credentials ออกจาก `/utils/supabase/info.tsx`
- ✅ เปลี่ยนให้อ่านจาก environment variables
- ✅ สร้าง `.gitignore` ป้องกันไม่ให้ `.env` ถูก commit
- ✅ สร้าง `.env.example` เป็น template
- ✅ ระบบพร้อม deploy อย่างปลอดภัย

### ถัดไป:
1. สร้างไฟล์ `.env` ตามตัวอย่างใน `.env.example`
2. ใส่คีย์จริงใน `.env` (local only, ไม่ commit)
3. ตั้งค่า environment variables ใน hosting platform
4. Deploy!

---

**🎉 ระบบของคุณพร้อม Deploy อย่างปลอดภัยแล้ว!**
