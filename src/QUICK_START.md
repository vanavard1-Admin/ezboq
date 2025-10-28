# ⚡ EZBOQ Quick Start Guide

**Domain:** [EZBOQ.COM](https://ezboq.com)  
**ใช้เวลา:** 15 นาที  
**Level:** Beginner-friendly

---

## 🎯 เป้าหมาย

Deploy EZBOQ.COM ให้ทำงานได้ภายใน **15 นาที!**

---

## 📋 สิ่งที่ต้องเตรียม

- [x] **Domain:** EZBOQ.COM (จดแล้ว! ✅)
- [ ] **Supabase Account** (ฟรี)
- [ ] **Vercel Account** (ฟรี)
- [ ] **GitHub Account** (ฟรี)

**ไม่ต้องใช้เงินสักบาท!** 🎉

---

## 🚀 5 ขั้นตอนสู่ Production

### ขั้นตอน 1: Setup Supabase (5 นาที)

#### 1.1 สร้าง Project

1. ไปที่ [supabase.com](https://supabase.com)
2. Sign up / Login
3. คลิก **"New Project"**
4. กรอก:
   - **Name:** `ezboq`
   - **Database Password:** สร้างรหัสผ่านที่แข็งแรง (เก็บไว้!)
   - **Region:** Southeast Asia (Singapore)
5. คลิก **"Create new project"**
6. รอ 2-3 นาที (provisioning)

#### 1.2 เก็บ API Keys

1. ไปที่ **Settings** → **API**
2. คัดลอก 3 อันนี้:

```
SUPABASE_URL = https://xxxxx.supabase.co
SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6Ikp...
SUPABASE_SERVICE_ROLE_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6Ikp... (⚠️ เก็บเป็นความลับ!)
```

3. เก็บใน notepad ไว้ใช้ในขั้นตอนถัดไป

#### 1.3 Deploy Edge Functions

```bash
# Login Supabase CLI
npx supabase login

# Link to project
npx supabase link --project-ref xxxxx

# Deploy edge functions
npx supabase functions deploy server
```

✅ **Supabase พร้อม!**

---

### ขั้นตอน 2: Push Code to GitHub (2 นาที)

#### 2.1 Create GitHub Repo

1. ไปที่ [github.com/new](https://github.com/new)
2. **Repository name:** `ezboq`
3. **Public** หรือ **Private** (แนะนำ Private)
4. **ไม่ต้อง** tick "Initialize with README"
5. คลิก **"Create repository"**

#### 2.2 Push Code

```bash
# ใน folder โปรเจค
git init
git add .
git commit -m "Initial commit - EZBOQ ready for production"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/ezboq.git
git push -u origin main
```

✅ **Code on GitHub!**

---

### ขั้นตอน 3: Deploy to Vercel (3 นาที)

#### 3.1 Import Project

1. ไปที่ [vercel.com](https://vercel.com)
2. Sign up / Login (ใช้ GitHub account)
3. คลิก **"Add New..."** → **"Project"**
4. เลือก repo **"ezboq"**
5. คลิก **"Import"**

#### 3.2 Configure Project

**Framework Preset:** Vite (auto-detected ✅)

**Build Settings:**
- Build Command: `npm run build`
- Output Directory: `dist`
- Install Command: `npm install`

#### 3.3 Add Environment Variables

คลิก **"Environment Variables"**

เพิ่ม 3 ตัวนี้ (จาก Supabase ขั้นตอน 1.2):

```
Name: SUPABASE_URL
Value: https://xxxxx.supabase.co

Name: SUPABASE_ANON_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6Ikp...

Name: SUPABASE_SERVICE_ROLE_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6Ikp...
```

#### 3.4 Deploy!

คลิก **"Deploy"**

รอ 2-3 นาที... 🚀

✅ **Deployed! คุณจะได้ URL:** `https://ezboq.vercel.app`

---

### ขั้นตอน 4: Add Custom Domain (3 นาที)

#### 4.1 Add Domain in Vercel

1. ใน Vercel Dashboard → Project **"ezboq"**
2. **Settings** → **Domains**
3. คลิก **"Add"**
4. พิมพ์: `ezboq.com`
5. คลิก **"Add"**

#### 4.2 Configure DNS

**Vercel จะแสดง DNS settings:**

**วิธีที่ 1: ใช้ Vercel DNS (ง่ายสุด) ⭐ แนะนำ**

ไปที่ Domain Provider (ที่จด ezboq.com):
- เปลี่ยน **Nameservers** เป็น:
  ```
  ns1.vercel-dns.com
  ns2.vercel-dns.com
  ```

**วิธีที่ 2: ใช้ DNS Provider ปัจจุบัน**

เพิ่ม **A Record:**
```
Type: A
Name: @
Value: 76.76.21.21
TTL: Auto
```

เพิ่ม **CNAME Record:**
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
TTL: Auto
```

#### 4.3 รอ DNS Propagation

- ⏱️ รอ 5-60 นาที
- ✅ SSL Certificate จะสร้างอัตโนมัติ

---

### ขั้นตอน 5: Test! (2 นาที)

#### 5.1 เปิด https://ezboq.com

ตรวจสอบ:
- [ ] เว็บขึ้น (ไม่ error)
- [ ] มี 🔒 HTTPS (secure)
- [ ] สมัครสมาชิกได้
- [ ] Login ได้

#### 5.2 ทดสอบฟีเจอร์หลัก

- [ ] สร้าง BOQ ได้
- [ ] เพิ่มรายการวัสดุได้ (จาก Catalog)
- [ ] คำนวณราคาถูกต้อง
- [ ] Export PDF ได้
- [ ] ฟอนต์ไทยแสดงถูกต้อง

✅ **ถ้าผ่านหมด = Success! 🎉**

---

## 🎉 สำเร็จแล้ว!

**คุณมี:**
- ✅ https://ezboq.com ขึ้นแล้ว
- ✅ HTTPS secure (🔒)
- ✅ Database ready (Supabase)
- ✅ Auto deploy (push to GitHub = auto deploy!)
- ✅ Free hosting!

**รวมเวลา: ~15 นาที!** ⚡

---

## 🔄 ขั้นตอนถัดไป

### 1. Test ให้ละเอียด (30 นาที)

อ่าน: `PRODUCTION_CHECKLIST.md`

ทดสอบ:
- [ ] ทุกฟีเจอร์ (4 workflows)
- [ ] Cross-browser (Chrome, Safari, Firefox)
- [ ] Mobile responsive
- [ ] PDF export quality

### 2. Setup Monitoring (15 นาที)

เพิ่ม:
- **Vercel Analytics** (built-in, free)
- **UptimeRobot** (uptime monitoring, free)
- **Google Analytics** (optional)

### 3. Share with Team! 🎊

- แชร์ URL: https://ezboq.com
- แชร์ User Manual: `USER_MANUAL.md`
- รับ feedback

### 4. Marketing (ถ้าพร้อม)

- SEO optimization
- Social media
- Google Ads (optional)
- Content marketing

---

## 🐛 Troubleshooting

### ปัญหา: Build failed

**แก้:**
```bash
# Test build locally first
npm install
npm run build

# ถ้า local ไม่มีปัญหา แต่ Vercel fail
# ตรวจสอบ Environment Variables
```

### ปัญหา: Domain ยังไม่ขึ้น

**แก้:**
- รอ DNS propagation (5-60 นาที)
- ล้าง DNS cache: `ipconfig /flushdns` (Windows) หรือ `sudo dscacheutil -flushcache` (Mac)
- ตรวจสอบ: `nslookup ezboq.com`

### ปัญหา: Supabase connection error

**แก้:**
- ตรวจสอบ Environment Variables ถูกต้อง
- ตรวจสอบ Supabase project ไม่ paused
- ตรวจสอบ Edge Functions deployed

### ปัญหา: PDF ฟอนต์ไทยผิด

**แก้:**
- ล้าง browser cache (Ctrl+Shift+Del)
- ลองใน Incognito mode
- ตรวจสอบ Google Fonts load ได้

---

## 📚 เอกสารเพิ่มเติม

**ต้องการรายละเอียดเพิ่ม?**

- 📘 **USER_MANUAL.md** - คู่มือผู้ใช้ 100+ หน้า
- 🚀 **DEPLOYMENT_GUIDE.md** - คู่มือ deploy ฉบับละเอียด
- 🎯 **FINAL_REVIEW.md** - Final review + test results
- ✅ **PRODUCTION_CHECKLIST.md** - Checklist ก่อน launch

---

## 🎊 ยินดีด้วย!

**EZBOQ.COM พร้อมใช้งานแล้ว!** 🚀

ตอนนี้คุณมีระบบถอดวัสดุก่อสร้างครบวงจรที่:
- ⚡ เร็ว (< 3s page load)
- 🔒 ปลอดภัย (HTTPS + RLS)
- 📱 Responsive (mobile-friendly)
- 🇹🇭 รองรับภาษาไทย 100%
- 💰 ฟรี! (ไม่ต้องจ่ายค่า hosting)

**Good luck! 🍀**

---

**Created by:** Figma Make AI  
**Domain:** [EZBOQ.COM](https://ezboq.com)  
**Status:** ✅ Ready to Launch!

---

Made with ❤️ for Thai Construction Industry 🇹🇭
