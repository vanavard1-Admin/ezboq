# 🚀 Quick Start - Deploy EZBOQ ใน 5 นาที

## ⚡ TL;DR (คำสั่งเดียวจบ)

```bash
# 1. ตรวจสอบ + Build
bash verify-security.sh

# 2. Deploy (เลือก 1 แบบ)
vercel --prod              # Vercel
netlify deploy --prod      # Netlify
# หรือ push ไป GitHub แล้วให้ Cloudflare Pages build
```

---

## 📋 Checklist 5 ข้อ (ก่อน Deploy)

```bash
# ✅ 1. ไฟล์ .env ไม่ถูก track
git status | grep "\.env$" || echo "✅ Safe"

# ✅ 2. ไม่มี hardcoded keys
git grep -n "eyJhbGc" src/ || echo "✅ No keys"

# ✅ 3. TypeScript OK
npm run type-check

# ✅ 4. Build OK
npm run build

# ✅ 5. ใช้สคริปต์อัตโนมัติ
bash verify-security.sh
```

---

## 🎯 Deploy แบบเร็ว (แต่ละ Platform)

### Option 1: Vercel (แนะนำ - ง่ายสุด)

```bash
# Install CLI (ครั้งแรกเท่านั้น)
npm i -g vercel

# Deploy
cd /path/to/ezboq
vercel --prod

# ตั้งค่า Environment Variables
# → ไปที่ Vercel Dashboard
# → Project Settings → Environment Variables
# → เพิ่มทั้ง 4 ตัว (ดูด้านล่าง)
```

**Environment Variables สำหรับ Vercel:**
```
VITE_SUPABASE_URL = https://cezwqajbkjhvumbhpsgy.supabase.co
VITE_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNlendxYWpia2podnVtYmhwc2d5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1Nzc1OTIsImV4cCI6MjA3NzE1MzU5Mn0.nr4IZv_hoaTH9rvSUtNrMi_wL37_fUnNdXZ1ft8-gRE
APP_ENV = production
DEBUG = false
```

---

### Option 2: Netlify

```bash
# Install CLI (ครั้งแรกเท่านั้น)
npm i -g netlify-cli

# Login
netlify login

# Deploy
cd /path/to/ezboq
netlify deploy --prod --dir=dist

# ตั้งค่า Environment Variables
# → ไปที่ Netlify Dashboard
# → Site Settings → Build & Deploy → Environment
# → เพิ่มทั้ง 4 ตัว (เหมือน Vercel)
```

**Build Settings สำหรับ Netlify:**
```
Build command: npm run build
Publish directory: dist
```

---

### Option 3: Cloudflare Pages

**ผ่าน Dashboard (ไม่ต้องใช้ CLI):**

1. **Push โค้ดไป GitHub**
   ```bash
   git add .
   git commit -m "feat: ready for cloudflare deployment"
   git push origin main
   ```

2. **สร้าง Project ใน Cloudflare**
   - ไปที่: https://dash.cloudflare.com/
   - Pages → Create a project
   - Connect to Git → เลือก repo

3. **ตั้งค่า Build**
   ```
   Framework preset: Vite
   Build command: npm run build
   Build output directory: dist
   ```

4. **เพิ่ม Environment Variables**
   - Settings → Environment Variables
   - เพิ่มทั้ง 4 ตัว (เหมือน Vercel)

5. **Deploy**
   - กด "Save and Deploy"
   - รอ 2-3 นาที
   - เสร็จ!

---

## 🔑 Environment Variables (ทุก Platform ใช้เหมือนกัน)

**ตั้งค่าทั้ง 4 ตัวนี้:**

| Variable | Value |
|----------|-------|
| `VITE_SUPABASE_URL` | `https://cezwqajbkjhvumbhpsgy.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNlendxYWpia2podnVtYmhwc2d5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1Nzc1OTIsImV4cCI6MjA3NzE1MzU5Mn0.nr4IZv_hoaTH9rvSUtNrMi_wL37_fUnNdXZ1ft8-gRE` |
| `APP_ENV` | `production` |
| `DEBUG` | `false` |

⚠️ **Important:** อย่าเพิ่ม `SENTRY_DSN` ถ้าไม่ได้ใช้ Sentry!

---

## 🎨 Custom Domain (Optional)

### Vercel
```
Dashboard → Domains → Add Domain → ใส่ yourdomain.com
```

### Netlify
```
Dashboard → Domain Settings → Add custom domain → ใส่ yourdomain.com
```

### Cloudflare
```
Dashboard → Custom domains → Set up a custom domain
```

**DNS Setup (ทุก Platform):**
```
Type: CNAME
Name: www
Value: <platform-domain>.vercel.app  (หรือ netlify.app, pages.dev)
```

---

## ✅ ตรวจสอบหลัง Deploy

### 1. เว็บโหลดได้
```
https://your-project.vercel.app
```

### 2. Features ทำงาน
- [ ] Login ได้
- [ ] สร้าง BOQ ได้
- [ ] คำนวณราคาถูกต้อง
- [ ] Export PDF ได้
- [ ] Cache ทำงาน (ดู Console: "📦 Restored X cache entries")

### 3. Console ไม่มี Error
```javascript
// เปิด DevTools (F12) → Console
// ต้องไม่เห็น:
❌ "Failed to fetch"
❌ "CORS error"
❌ "CSP violation"
```

### 4. Performance OK
```
// DevTools → Lighthouse
// ควรได้:
Performance:    > 90
Accessibility:  > 90
Best Practices: > 90
SEO:            > 90
```

---

## 🔧 แก้ปัญหาเร็ว

### ❌ "Failed to fetch" หลัง Deploy
**สาเหตุ**: ยังไม่ตั้งค่า Environment Variables

**แก้:**
1. ไปที่ Dashboard ของ platform
2. เพิ่ม Environment Variables ทั้ง 4 ตัว
3. Redeploy (หรือกด "Redeploy" button)

---

### ❌ หน้าเว็บขาว/ไม่มีอะไร
**สาเหตุ**: Build output directory ผิด

**แก้:**
1. ตรวจสอบว่า Build output = `dist`
2. Redeploy

---

### ❌ CORS Error
**สาเหตุ**: ยังไม่เพิ่ม Allowed Origins ใน Supabase

**แก้:**
1. ไปที่ Supabase Dashboard
2. Settings → Auth → Redirect URLs
3. เพิ่ม: `https://your-project.vercel.app`
4. Save

---

## 📱 Deploy ให้เพื่อน/ลูกค้า

### เตรียม Domain
1. ซื้อ domain จาก Namecheap, GoDaddy, etc.
2. Point CNAME ไปที่ platform
3. รอ DNS propagate (5-30 นาที)

### ส่งมอบ
```
Website: https://yourdomain.com
Admin Email: admin@example.com
Admin Password: (ส่งแยกทาง secure channel)

Features:
✅ BOQ สร้างได้ไม่จำกัด
✅ Quotation, Invoice, Receipt
✅ PDF Export ภาษาไทยสวย
✅ 750+ รายการ Catalog
✅ 10 ประเภท SmartBOQ
✅ Monthly Reports
```

---

## 🎯 สรุป (ขั้นตอนจริงๆ)

```bash
# 1. ตรวจสอบ
bash verify-security.sh

# 2. Deploy
vercel --prod

# 3. ตั้งค่า Environment Variables
# → ไปที่ Dashboard
# → เพิ่ม 4 ตัว

# 4. เสร็จ! 🎉
```

**เวลาทั้งหมด**: 5 นาที  
**ความ��าก**: ⭐⭐☆☆☆ (ง่าย)

---

## 📞 ต้องการความช่วยเหลือเพิ่มเติม?

- **Security**: ดู `SECURITY_DEPLOYMENT.md`
- **Full Checklist**: ดู `PRE_DEPLOY_CHECKLIST.md`
- **Details**: ดู `PRODUCTION_SECURITY_READY.md`

---

**Happy Deploying! 🚀**
