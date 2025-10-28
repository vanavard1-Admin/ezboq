# 🚀 DEPLOY NOW - EZBOQ.COM

**Step-by-Step Deployment Instructions**  
**เวลาทั้งหมด:** ~30-45 นาที  
**Level:** Copy & Paste ได้เลย!

---

## 📋 สิ่งที่ต้องมี (Accounts - ทั้งหมดฟรี!)

- [ ] **GitHub Account** - https://github.com/signup
- [ ] **Vercel Account** - https://vercel.com/signup (ใช้ GitHub login)
- [ ] **Supabase Account** - https://supabase.com/dashboard (ใช้ GitHub login)
- [ ] **Google Account** - สำหรับ Search Console

---

## 🎯 STEP 1: Setup Supabase (10 นาที)

### 1.1 สร้าง Supabase Project

1. ไปที่ https://supabase.com/dashboard
2. คลิก **"New Project"**
3. กรอกข้อมูล:
   ```
   Name: ezboq
   Database Password: [สร้างรหัสผ่านที่แข็งแรง - เก็บไว้!]
   Region: Southeast Asia (Singapore)
   ```
4. คลิก **"Create new project"**
5. รอ 2-3 นาที (โหลดกาแฟ ☕)

---

### 1.2 เก็บ API Keys

1. เมื่อ project พร้อม → ไปที่ **Settings** (⚙️) → **API**
2. คัดลอก 3 ค่านี้:

```bash
# Project URL
SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co

# anon public key
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3Mi...

# service_role key (⚠️ เก็บเป็นความลับ!)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3Mi...
```

**เก็บใน Notepad/TextEdit ไว้ใช้ในขั้นตอนถัดไป!**

---

### 1.3 Deploy Edge Functions

เปิด Terminal/Command Prompt ใน folder โปรเจค:

```bash
# 1. Install Supabase CLI (ถ้ายังไม่มี)
npm install -g supabase

# 2. Login Supabase
npx supabase login

# 3. เอา Project Reference ID
# ไปที่ Supabase → Settings → General → Reference ID
# เช่น: abcdefghijklmnop

# 4. Link to project (แทน YOUR_PROJECT_REF ด้วย Reference ID)
npx supabase link --project-ref YOUR_PROJECT_REF

# 5. Deploy edge functions
npx supabase functions deploy server
```

✅ **ถ้าเห็น "Deployed successfully" = สำเร็จ!**

---

## 🎯 STEP 2: Push Code to GitHub (5 นาที)

### 2.1 Create GitHub Repository

1. ไปที่ https://github.com/new
2. กรอก:
   ```
   Repository name: ezboq
   Description: EZBOQ - ระบบถอดวัสดุก่อสร้างครบวงจร
   ✅ Private (แนะนำ)
   ❌ ไม่ต้อง tick "Initialize with README"
   ```
3. คลิก **"Create repository"**

---

### 2.2 Push Code

เปิด Terminal/Command Prompt ใน folder โปรเจค:

```bash
# 1. Initialize Git (ถ้ายังไม่มี .git folder)
git init

# 2. Add all files
git add .

# 3. Commit
git commit -m "Initial commit - EZBOQ ready for production"

# 4. Set main branch
git branch -M main

# 5. Add remote (แทน YOUR_USERNAME ด้วย GitHub username ของคุณ)
git remote add origin https://github.com/YOUR_USERNAME/ezboq.git

# 6. Push!
git push -u origin main
```

✅ **Refresh GitHub repo page → เห็นไฟล์ทั้งหมด = สำเร็จ!**

---

## 🎯 STEP 3: Deploy to Vercel (10 นาที)

### 3.1 Import Project to Vercel

1. ไปที่ https://vercel.com
2. คลิก **"Add New..."** → **"Project"**
3. เลือก **"Import Git Repository"**
4. ค้นหาและเลือก repo **"ezboq"**
5. คลิก **"Import"**

---

### 3.2 Configure Build Settings

Vercel จะ auto-detect → ตรวจสอบให้ตรงนี้:

```
Framework Preset: Vite
Build Command: npm run build
Output Directory: dist
Install Command: npm install
Root Directory: ./
```

✅ **ถูกต้อง? ไปขั้นตอนถัดไป**

---

### 3.3 Add Environment Variables ⚠️ สำคัญ!

ก่อนคลิก Deploy:

1. เลื่อนลงหา **"Environment Variables"**
2. เพิ่มทีละตัว (เอาจาก Notepad ที่เก็บไว้ตอน Step 1.2):

**Variable 1:**
```
Name: SUPABASE_URL
Value: https://xxxxxxxxxxxxx.supabase.co
Environment: Production, Preview, Development (tick ทั้ง 3)
```
คลิก **Add**

**Variable 2:**
```
Name: SUPABASE_ANON_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3Mi...
Environment: Production, Preview, Development (tick ทั้ง 3)
```
คลิก **Add**

**Variable 3:**
```
Name: SUPABASE_SERVICE_ROLE_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3Mi...
Environment: Production, Preview, Development (tick ทั้ง 3)
```
คลิก **Add**

✅ **ตรวจสอบมี 3 variables แล้ว!**

---

### 3.4 Deploy! 🚀

1. คลิก **"Deploy"**
2. รอ 2-3 นาที (ดูสี builds log สวยๆ 🌈)
3. เห็น **"Congratulations! Your project has been deployed."** = สำเร็จ! 🎉

**คุณจะได้ URL แบบนี้:**
```
https://ezboq.vercel.app
หรือ
https://ezboq-xxxxx.vercel.app
```

---

### 3.5 Test Preview URL

1. คลิก **"Visit"** หรือเปิด URL ที่ได้
2. ทดสอบ:
   - [ ] หน้าแรกโหลดได้
   - [ ] สมัครสมาชิกได้
   - [ ] Login ได้
   - [ ] สร้าง BOQ ได้ (เพิ่มรายการจาก Catalog)

✅ **ทุกอย่างทำงาน? ไปต่อ!**  
❌ **มีปัญหา? ดู Troubleshooting ด้านล่าง**

---

## 🎯 STEP 4: Add Custom Domain (5 นาที)

### 4.1 Add Domain in Vercel

1. ใน Vercel Dashboard → Project **"ezboq"**
2. ไปที่ **Settings** → **Domains**
3. คลิก **"Add"**
4. พิมพ์: `ezboq.com`
5. คลิก **"Add"**

---

### 4.2 Configure DNS

**Vercel จะแสดง instructions แบบนี้:**

```
To configure your domain, add the following records:

A Record:
Type: A
Name: @
Value: 76.76.21.21

CNAME Record:
Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

---

### 4.3 เพิ่ม DNS Records

**ไปที่ Domain Provider ที่คุณจด ezboq.com:**

1. หา **DNS Management** / **DNS Settings**
2. เพิ่ม/แก้ไข 2 records:

**A Record:**
```
Type: A
Name: @ (or root or leave blank)
Value: 76.76.21.21
TTL: Auto / 3600
```

**CNAME Record:**
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
TTL: Auto / 3600
```

3. **Save Changes**

---

### 4.4 รอ DNS Propagation

- ⏱️ รอ 5-60 นาที (ปกติ 10-15 นาที)
- ☕ พักกาแฟ / กินข้าว
- 🔄 Refresh Vercel domains page ทุก 5-10 นาที

**เมื่อพร้อม:**
- ✅ สถานะเป็น **"Valid Configuration"**
- ✅ SSL: **"Enabled"** (🔒 HTTPS ready)

---

### 4.5 Test Production URL

เปิดเบราว์เซอร์:

```
https://ezboq.com
```

**ตรวจสอบ:**
- [ ] เว็บขึ้น (ไม่ error)
- [ ] มี 🔒 lock icon (HTTPS)
- [ ] ทุกฟีเจอร์ทำงาน

✅ **Perfect! เว็บ Live แล้ว!** 🎉

---

## 🎯 STEP 5: Google Search Console (5 นาที)

### 5.1 Add Property

1. ไปที่ https://search.google.com/search-console
2. คลิก **"Add property"**
3. เลือก **"URL prefix"**
4. กรอก: `https://ezboq.com`
5. คลิก **"Continue"**

---

### 5.2 Verify Ownership

Vercel จะ verify อัตโนมัติ!

**วิธีที่ 1: HTML tag (แนะนำ - เราทำไว้แล้ว!)**

1. เลือก **"HTML tag"**
2. จะเห็น meta tag แบบนี้:
   ```html
   <meta name="google-site-verification" content="kdU_K2uLE83vvhrY-ntHK1VIOgMreP8u5myNL0vHp4g" />
   ```
3. **ไม่ต้องทำอะไร! เรามีอยู่แล้วใน index.html** ✅
4. คลิก **"Verify"**

✅ **เห็น "Ownership verified" = สำเร็จ!** 🎉

---

**วิธีที่ 2: Domain (ถ้าวิธีที่ 1 ไม่ได้)**

1. เลือก **"Domain name provider"**
2. เพิ่ม TXT record ที่ DNS
3. คลิก **"Verify"**

---

### 5.3 Submit Sitemap

1. ใน Google Search Console → เมนูด้านซ้าย → **"Sitemaps"**
2. กรอก: `sitemap.xml`
3. คลิก **"Submit"**

✅ **เห็น "Sitemap submitted successfully" = เสร็จแล้ว!**

**Google จะ:**
- Crawl sitemap ภายใน 24 ชม.
- Index หน้าต่างๆ ภายใน 1-7 วัน
- แสดงข้อมูลใน Coverage Report

---

### 5.4 Request Indexing (Optional แต่แนะนำ)

เร่งให้ Google index เร็วขึ้น:

1. ใน Search Console → **"URL Inspection"** (ด้านบน)
2. กรอก URL: `https://ezboq.com`
3. กด Enter
4. รอสักครู่
5. คลิก **"Request Indexing"**
6. รอ 1-2 นาที
7. ✅ เห็น "Indexing requested"

**ทำซ้ำกับหน้าสำคัญ (5-10 URLs):**
- https://ezboq.com/boq
- https://ezboq.com/quotation
- https://ezboq.com/invoice
- https://ezboq.com/membership
- https://ezboq.com/customers

**ใช้เวลา:** ~5 นาที

---

## 🎉 เสร็จแล้ว! Launch Complete!

**✅ Checklist:**

- [x] Supabase setup ✅
- [x] Code on GitHub ✅
- [x] Deployed to Vercel ✅
- [x] Custom domain (ezboq.com) ✅
- [x] HTTPS enabled (🔒) ✅
- [x] Google Search Console verified ✅
- [x] Sitemap submitted ✅

**🎊 EZBOQ.COM IS LIVE! 🎊**

---

## 🧪 Final Testing Checklist

เปิด https://ezboq.com แล้วทดสอบ:

### Authentication
- [ ] สมัครสมาชิกได้
- [ ] Login ได้
- [ ] Logout ได้

### Core Features
- [ ] สร้าง BOQ ได้
- [ ] เพิ่มรายการจาก Catalog (680+ items)
- [ ] คำนวณราคาถูกต้อง
- [ ] สร้าง Quotation ได้
- [ ] สร้าง Invoice ได้
- [ ] สร้าง Receipt ได้

### PDF Export
- [ ] Export BOQ เป็น PDF
- [ ] ฟอนต์ไทยแสดงถูกต้อง
- [ ] QR Code แสดงได้

### Management
- [ ] เพิ่ม Customer ได้
- [ ] เพิ่ม Partner ได้
- [ ] ดู History ได้
- [ ] ดู Reports ได้

### Mobile
- [ ] ทำงานบน Mobile (iPhone/Android)
- [ ] Responsive design ถูกต้อง

**ถ้าผ่านหมด = Production Ready! 🚀**

---

## 📊 Next Steps

### Day 1-7: Monitor

- [ ] ตรวจสอบ Vercel Analytics (built-in)
- [ ] ดู Google Search Console → Coverage
- [ ] ตรวจสอบไม่มี errors
- [ ] รับ feedback จาก users

### Week 2-4: Optimize

- [ ] แก้ bugs (ถ้ามี)
- [ ] ปรับปรุง UX
- [ ] เพิ่ม features ตาม feedback
- [ ] SEO optimization

### Month 2+: Grow

- [ ] Marketing (SEO, Social, Ads)
- [ ] Setup payment gateway
- [ ] Email notifications
- [ ] Phase 2 features

---

## 🐛 Troubleshooting

### Problem: Build Failed

**Error:** `npm run build` failed in Vercel

**Solution:**
```bash
# Test build locally first
npm install
npm run build

# ถ้า local ไม่มีปัญหา:
# 1. ตรวจสอบ Environment Variables ครบ 3 ตัว
# 2. Redeploy: Vercel Dashboard → Deployments → ⋮ → Redeploy
```

---

### Problem: Supabase Connection Error

**Error:** Cannot connect to Supabase / 401 Unauthorized

**Solution:**
1. ตรวจสอบ Environment Variables:
   - ✅ SUPABASE_URL ถูกต้อง
   - ✅ SUPABASE_ANON_KEY ถูกต้อง
   - ✅ SUPABASE_SERVICE_ROLE_KEY ถูกต้อง
2. ตรวจสอบ Supabase project ไม่ paused
3. ตรวจสอบ Edge Functions deployed:
   ```bash
   npx supabase functions list
   ```
4. Redeploy in Vercel

---

### Problem: Domain ยังไม่ขึ้น

**Error:** DNS_PROBE_FINISHED_NXDOMAIN

**Solution:**
1. รอ DNS propagation (5-60 นาที)
2. ตรวจสอบ DNS records ถูกต้อง:
   ```bash
   nslookup ezboq.com
   ```
3. ล้าง DNS cache:
   ```bash
   # Windows
   ipconfig /flushdns
   
   # Mac
   sudo dscacheutil -flushcache
   ```
4. ลองใน Incognito mode
5. ลองจากอุปกรณ์/Network อื่น

---

### Problem: SSL Certificate Pending

**Error:** NET::ERR_CERT_AUTHORITY_INVALID

**Solution:**
1. รอ SSL provisioning (5-10 นาที)
2. ใน Vercel → Domains → Refresh
3. ถ้ายังไม่ได้:
   - ลบ domain
   - เพิ่มใหม่
   - รอ 10 นาที

---

### Problem: Google Verification Failed

**Error:** Verification failed

**Solution:**
1. ตรวจสอบ meta tag ใน index.html:
   ```html
   <meta name="google-site-verification" content="kdU_K2uLE83vvhrY-ntHK1VIOgMreP8u5myNL0vHp4g" />
   ```
2. ตรวจสอบเว็บ deployed แล้ว (ไม่ใช่ local)
3. Inspect source code (Ctrl+U) → ดู meta tag อยู่
4. รอ 5-10 นาที แล้วลอง verify ใหม่

---

### Problem: ฟอนต์ไทยใน PDF ผิด

**Error:** ฟอนต์แสดงเป็น □□□□

**Solution:**
1. ล้าง browser cache (Ctrl+Shift+Del)
2. ลองใน Incognito mode
3. ตรวจสอบ Google Fonts ใน index.html
4. Redeploy

---

## 📞 Need Help?

### Documentation

- 📘 [USER_MANUAL.md](./USER_MANUAL.md) - คู่มือผู้ใช้
- 🚀 [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - Deploy ละเอียด
- 🔍 [GOOGLE_SEARCH_CONSOLE_SETUP.md](./GOOGLE_SEARCH_CONSOLE_SETUP.md) - SEO guide
- ✅ [PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md) - Production checklist

### External Resources

- **Vercel:** https://vercel.com/docs
- **Supabase:** https://supabase.com/docs
- **Google Search Console:** https://support.google.com/webmasters

---

## 🎊 Congratulations!

**คุณได้ Deploy EZBOQ.COM สำเร็จแล้ว!** 🎉

**ตอนนี้คุณมี:**
- ✅ เว็บไซต์ที่ https://ezboq.com
- ✅ HTTPS secure (🔒)
- ✅ Database ready (Supabase)
- ✅ Auto deployments (push to GitHub = auto deploy)
- ✅ Free hosting (Vercel Hobby plan)
- ✅ SEO ready (Google Search Console)

**ระบบพร้อมให้:**
- 🏗️ ผู้รับเหมา
- 👷 ช่าง
- 🏢 บริษัทก่อสร้าง

**สร้างเอกสาร BOQ ครบชุดใน 5 นาที!** ⚡

---

**Created by:** Figma Make AI  
**Domain:** [EZBOQ.COM](https://ezboq.com)  
**Date:** 28 ตุลาคม 2568  
**Status:** 🚀 **DEPLOYED!**

---

Made with ❤️ for Thai Construction Industry 🇹🇭

**🚀 WELCOME TO PRODUCTION! 🚀**
