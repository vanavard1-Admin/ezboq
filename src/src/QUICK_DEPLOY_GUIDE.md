# 🚀 Quick Deploy Guide - EZBOQ

## เริ่มต้น Deploy ภายใน 10 นาที

### Step 1: Security Check (1 นาที)
```bash
chmod +x verify-security-final.sh
./verify-security-final.sh
```
✅ ต้องผ่านทุกข้อ

---

### Step 2: สร้าง .env Local (1 นาที)
```bash
cp .env.example .env
nano .env
```

ใส่ข้อมูลจริง:
```env
VITE_SUPABASE_URL=https://cezwqajbkjhvumbhpsgy.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNlendxYWpia2podnVtYmhwc2d5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1Nzc1OTIsImV4cCI6MjA3NzE1MzU5Mn0.nr4IZv_hoaTH9rvSUtNrMi_wL37_fUnNdXZ1ft8-gRE
APP_ENV=production
DEBUG=false
```

---

### Step 3: Test Build (2 นาที)
```bash
npm install
npm run build
npm run preview
```
เปิด http://localhost:4173 ทดสอบ Login

---

### Step 4: Push to GitHub (1 นาที)
```bash
git add .
git commit -m "chore: security improvements for deployment"
git push origin main
```

---

### Step 5: Deploy to Vercel (5 นาที)

#### A. เชื่อม Repository
1. ไป https://vercel.com/new
2. Import repository **ezboq**
3. Framework: **Vite**

#### B. Environment Variables
เพิ่ม 5 ตัวนี้:

```
VITE_SUPABASE_URL=https://cezwqajbkjhvumbhpsgy.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNlendxYWpia2podnVtYmhwc2d5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1Nzc1OTIsImV4cCI6MjA3NzE1MzU5Mn0.nr4IZv_hoaTH9rvSUtNrMi_wL37_fUnNdXZ1ft8-gRE
SENTRY_DSN=
APP_ENV=production
DEBUG=false
```

Environment: เลือก **Production, Preview, Development** ทั้งหมด

#### C. Deploy!
คลิก **Deploy** → รอ 2-3 นาที → เสร็จ!

---

### Step 6: ตั้งค่า Supabase (2 นาที)

#### A. เพิ่ม Redirect URLs
1. Supabase Dashboard → Authentication → URL Configuration
2. เพิ่ม:
```
https://ezboq.vercel.app
https://ezboq.vercel.app/**
```

#### B. ตรวจสอบ RLS (ถ้ายังไม่ได้ตั้ง)
Database → Tables → `kv_store_6e95bca3` → Enable RLS

---

## ✅ เสร็จแล้ว!

เว็บของคุณพร้อมใช้งานที่: **https://ezboq.vercel.app**

---

## 📝 Checklist หลัง Deploy

- [ ] เว็บโหลดได้
- [ ] Login/Signup ทำงาน
- [ ] สร้าง BOQ ได้
- [ ] บันทึกข้อมูลได้
- [ ] ไม่มี console errors

---

## 🆘 มีปัญหา?

### Build Error: Missing env
→ ตรวจสอบ Environment Variables ใน Vercel

### CORS Error
→ เพิ่ม domain ใน Supabase → Auth → Redirect URLs

### 401 Error
→ ตรวจสอบ RLS policies ใน Supabase

---

## 📚 เอกสารเพิ่มเติม

- **ละเอียด**: `/DEPLOY_INSTRUCTIONS_TH.md`
- **Security**: `/SECURITY_CHECKLIST_FINAL.md`
- **Troubleshooting**: `/TROUBLESHOOTING_FAILED_TO_FETCH.md`

---

**🎉 Happy Deploying!**
