# 🚀 คู่มือ Deploy EZBOQ - ฉบับภาษาไทย

## 📋 สารบัญ
1. [เตรียมความพร้อมก่อน Deploy](#-1-เตรียมความพร้อมก่อน-deploy)
2. [ตั้งค่า Environment Variables](#-2-ตั้งค่า-environment-variables)
3. [Deploy ไป Vercel](#-3-deploy-ไป-vercel-แนะนำ)
4. [Deploy ไป Netlify](#-4-deploy-ไป-netlify)
5. [Deploy ไป Cloudflare Pages](#-5-deploy-ไป-cloudflare-pages)
6. [ตรวจสอบหลัง Deploy](#-6-ตรวจสอบหลัง-deploy)
7. [Troubleshooting](#-7-troubleshooting)

---

## ✅ 1. เตรียมความพร้อมก่อน Deploy

### ตรวจสอบความปลอดภัย
```bash
# รัน security check
chmod +x verify-security-final.sh
./verify-security-final.sh

# ต้องผ่านทุกข้อ ไม่มี error
```

### สร้างไฟล์ .env สำหรับ Development
```bash
# คัดลอก template
cp .env.example .env

# เปิดแก้ไขใส่คีย์จริง (ห้าม commit!)
nano .env
```

ใส่ข้อมูลจริงใน `.env`:
```env
VITE_SUPABASE_URL=https://cezwqajbkjhvumbhpsgy.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNlendxYWpia2podnVtYmhwc2d5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1Nzc1OTIsImV4cCI6MjA3NzE1MzU5Mn0.nr4IZv_hoaTH9rvSUtNrMi_wL37_fUnNdXZ1ft8-gRE
SENTRY_DSN=
APP_ENV=production
DEBUG=false
```

### ทดสอบ Build Local
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install

# Type check
npm run type-check

# Build
npm run build

# ทดสอบ preview
npm run preview
# เปิด http://localhost:4173 ทดสอบทุกฟีเจอร์
```

### ตรวจสอบไฟล์ที่จะ Commit
```bash
# ดู status - ต้องไม่เห็น .env
git status

# ถ้าเห็น .env ให้ลบออก
git rm --cached .env

# Add files ที่แก้ไข
git add .
git commit -m "feat: secure deployment with environment variables"
git push origin main
```

---

## 🔧 2. ตั้งค่า Environment Variables

ก่อน Deploy ต้องเตรียม Environment Variables เหล่านี้:

```env
VITE_SUPABASE_URL=https://cezwqajbkjhvumbhpsgy.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNlendxYWpia2podnVtYmhwc2d5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1Nzc1OTIsImV4cCI6MjA3NzE1MzU5Mn0.nr4IZv_hoaTH9rvSUtNrMi_wL37_fUnNdXZ1ft8-gRE
SENTRY_DSN=
APP_ENV=production
DEBUG=false
```

---

## 🟢 3. Deploy ไป Vercel (แนะนำ)

### ขั้นตอนที่ 1: เชื่อม GitHub
1. ไปที่ https://vercel.com/
2. Sign up/Login ด้วย GitHub
3. คลิก **"Add New Project"**
4. เลือก repository **ezboq**
5. คลิก **"Import"**

### ขั้นตอนที่ 2: Configure Project
1. **Framework Preset**: Vite
2. **Root Directory**: `./` (ปล่อยว่างหรือเลือก root)
3. **Build Command**: `npm run build`
4. **Output Directory**: `dist`
5. **Install Command**: `npm install`

### ขั้นตอนที่ 3: เพิ่ม Environment Variables
ใน Vercel Dashboard → Project Settings → Environment Variables

เพิ่ม 5 ตัวนี้:

| Name | Value |
|------|-------|
| `VITE_SUPABASE_URL` | `https://cezwqajbkjhvumbhpsgy.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (full key) |
| `SENTRY_DSN` | (ปล่อยว่างหรือใส่ Sentry DSN) |
| `APP_ENV` | `production` |
| `DEBUG` | `false` |

**Environment**: เลือก **Production, Preview, Development** ทั้งหมด

### ขั้นตอนที่ 4: Deploy
1. คลิก **"Deploy"**
2. รอ 2-3 นาที
3. เมื่อเสร็จจะได้ URL: `https://ezboq.vercel.app`

### ขั้นตอนที่ 5: ตั้งค่า Custom Domain (Optional)
1. ไปที่ Project Settings → Domains
2. เพิ่ม domain ของคุณ (เช่น `ezboq.com`)
3. Update DNS records ตามที่ Vercel บอก
4. รอ DNS propagate (5-30 นาที)

---

## 🟠 4. Deploy ไป Netlify

### ขั้นตอนที่ 1: เชื่อม GitHub
1. ไปที่ https://netlify.com/
2. Sign up/Login ด้วย GitHub
3. คลิก **"Add new site"** → **"Import an existing project"**
4. เลือก **GitHub** → เลือก repository **ezboq**

### ขั้นตอนที่ 2: Build Settings
```
Build command: npm run build
Publish directory: dist
```

### ขั้นตอนที่ 3: Environment Variables
ไปที่ Site settings → Environment variables

เพิ่มทั้ง 5 ตัว:
```
VITE_SUPABASE_URL=https://cezwqajbkjhvumbhpsgy.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SENTRY_DSN=
APP_ENV=production
DEBUG=false
```

### ขั้นตอนที่ 4: Deploy
1. คลิก **"Deploy site"**
2. รอ 2-3 นาที
3. เมื่อเสร็จจะได้ URL: `https://ezboq.netlify.app`

### สร้าง netlify.toml (Optional)
สร้างไฟล์ `/netlify.toml`:
```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[build.environment]
  NODE_VERSION = "18"
```

---

## 🟡 5. Deploy ไป Cloudflare Pages

### ขั้นตอนที่ 1: สร้าง Project
1. ไปที่ https://dash.cloudflare.com/
2. เลือก **Workers & Pages**
3. คลิก **"Create application"** → **"Pages"** → **"Connect to Git"**
4. เลือก repository **ezboq**

### ขั้นตอนที่ 2: Build Configuration
```
Framework preset: Vite
Build command: npm run build
Build output directory: dist
```

### ขั้นตอนที่ 3: Environment Variables
ใน Settings → Environment variables

เพิ่มทั้ง 5 ตัวใน **Production** และ **Preview**:
```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
SENTRY_DSN
APP_ENV
DEBUG
```

### ขั้นตอนที่ 4: Deploy
1. คลิก **"Save and Deploy"**
2. รอ 2-3 นาที
3. เมื่อเสร็จจะได้ URL: `https://ezboq.pages.dev`

---

## ✅ 6. ตรวจสอบหลัง Deploy

### Checklist หลัง Deploy
- [ ] เว็บโหลดได้ไม่มี error
- [ ] สามารถ Login ได้
- [ ] สามารถ Signup ได้
- [ ] สามารถสร้าง BOQ ได้
- [ ] สามารถบันทึกข้อมูลได้
- [ ] ข้อมูลแสดงผลถูกต้อง
- [ ] ไม่มี console errors
- [ ] ไม่มี 401/403 errors ใน Network tab

### ตรวจสอบ Browser Console (F12)
เปิด DevTools → Console → ต้องไม่มี:
```
❌ Failed to fetch
❌ 401 Unauthorized
❌ 403 Forbidden
❌ CORS error
❌ Invalid API key
```

### ตรวจสอบ Network Tab
เปิด DevTools → Network → ดู requests ไป Supabase:
```
✅ Status 200 OK
✅ Authorization header มี Bearer token
✅ Response มีข้อมูลถูกต้อง
```

---

## 🆘 7. Troubleshooting

### ❌ Build Failed: "Missing VITE_SUPABASE_URL"

**สาเหตุ**: ไม่ได้ตั้ง environment variables

**แก้ไข**:
1. ไปที่ hosting platform dashboard
2. Project Settings → Environment Variables
3. เพิ่ม `VITE_SUPABASE_URL` และ `VITE_SUPABASE_ANON_KEY`
4. Re-deploy

---

### ❌ Runtime Error: "Invalid API key"

**สาเหตุ**: Environment variable มีช่องว่างหรือ newline

**แก้ไข**:
1. Copy key ใหม่จาก Supabase Dashboard
2. ลบ environment variable เก่า
3. เพิ่มใหม่โดยระวังไม่ให้มีช่องว่างหรือ newline
4. Re-deploy

---

### ❌ CORS Error

**สาเหตุ**: Domain ยังไม่ได้เพิ่มใน Supabase Allowed Origins

**แก้ไข**:
1. ไปที่ Supabase Dashboard
2. Project Settings → Authentication → URL Configuration
3. เพิ่ม Redirect URLs:
   ```
   https://ezboq.vercel.app
   https://ezboq.vercel.app/**
   https://your-custom-domain.com
   https://your-custom-domain.com/**
   ```
4. บันทึกแล้วรอ 1-2 นาที
5. ลอง refresh เว็บใหม่

---

### ❌ 401 Unauthorized

**สาเหตุ**: Row Level Security (RLS) policies ไม่ถูกต้อง

**แก้ไข**:
1. ไปที่ Supabase Dashboard
2. Database → Tables → เลือกตาราง `kv_store_6e95bca3`
3. ตรวจสอบ RLS policies:

```sql
-- Read policy
CREATE POLICY "Users can read their own data"
ON kv_store_6e95bca3 FOR SELECT
TO authenticated
USING (
  (value->>'user_id')::text = auth.uid()::text 
  OR (value->>'is_public')::boolean = true
);

-- Write policy
CREATE POLICY "Users can write their own data"
ON kv_store_6e95bca3 FOR INSERT
TO authenticated
WITH CHECK ((value->>'user_id')::text = auth.uid()::text);
```

---

### ❌ Fonts ไม่แสดงผลใน PDF

**สาเหตุ**: Thai fonts ไม่ load

**แก้ไข**: 
1. ตรวจสอบ `/index.html` มี Google Fonts:
```html
<link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&family=Noto+Sans+Thai:wght@300;400;500;600;700&display=swap" rel="stylesheet">
```

2. ตรวจสอบ `/styles/globals.css` มี font-family:
```css
body {
  font-family: 'Sarabun', 'Noto Sans Thai', sans-serif;
}
```

---

### ❌ Slow Performance

**แก้ไข**:
1. ตรวจสอบ cache ทำงาน (ดู `/utils/api.ts`)
2. ตรวจสอบ images มี optimization
3. ตรวจสอบ bundle size:
```bash
npm run build -- --mode production
# ดู dist/ size ต้องไม่เกิน 5 MB
```

---

## 📊 Monitoring & Analytics (Optional)

### เพิ่ม Sentry Error Tracking
1. สมัคร https://sentry.io (Free tier)
2. สร้าง React project
3. Copy DSN
4. เพิ่ม `SENTRY_DSN` ใน environment variables
5. Re-deploy

### เพิ่ม Google Analytics
เพิ่มใน `/index.html`:
```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

---

## 🎯 Performance Optimization

### Lighthouse Score เป้าหมาย
- Performance: 90+
- Accessibility: 95+
- Best Practices: 95+
- SEO: 100

### ทดสอบ
```bash
# Install Lighthouse CLI
npm install -g @lhci/cli

# Run test
lhci autorun --url=https://ezboq.vercel.app
```

---

## 🔄 CI/CD Auto Deploy

### สำหรับ Vercel/Netlify/Cloudflare
✅ Auto deploy เมื่อ push ไป `main` branch

### Manual Deploy
```bash
# Vercel
vercel --prod

# Netlify
netlify deploy --prod

# Cloudflare
wrangler pages publish dist
```

---

## 📞 ติดต่อ Support

หากมีปัญหาในการ Deploy:

1. ตรวจสอบ error logs ใน hosting platform
2. ดู `/SECURITY_CHECKLIST_FINAL.md`
3. ดู error messages ใน browser console
4. ตรวจสอบ Supabase Dashboard → Logs

---

## ✅ สรุป

### ขั้นตอนสั้นๆ:
1. ✅ Run `./verify-security-final.sh`
2. ✅ สร้าง `.env` ใส่คีย์จริง (local only)
3. ✅ Test build: `npm run build`
4. ✅ Push to GitHub
5. ✅ เชื่อม hosting platform (Vercel แนะนำ)
6. ✅ เพิ่ม environment variables
7. ✅ Deploy!
8. ✅ ตรวจสอบเว็บทำงานถูกต้อง

### ระยะเวลา:
- First time: 15-30 นาที
- Re-deploy: 2-3 นาที (auto)

### ค่าใช้จ่าย:
- Vercel/Netlify/Cloudflare: **ฟรี** (Free tier เพียงพอ)
- Supabase: **ฟรี** (Free tier: 500MB database, 2GB file storage)
- Domain (optional): ~300-500 บาท/ปี

---

**🎉 ขอให้ Deploy สำเร็จ!**

มีคำถามเพิ่มเติมดูได้ที่:
- `/SECURITY_CHECKLIST_FINAL.md` - Security details
- `/PRODUCTION_SECURITY_READY.md` - Production checklist
- `/TROUBLESHOOTING_FAILED_TO_FETCH.md` - API issues
