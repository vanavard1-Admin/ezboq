# 🚀 EZBOQ Deployment Guide

**Domain:** EZBOQ.COM  
**วันที่:** 28 ตุลาคม 2568  
**Status:** Ready to Deploy! 🎉

---

## 📋 Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Hosting Options](#hosting-options)
3. [Step-by-Step: Deploy to Vercel](#deploy-to-vercel)
4. [Step-by-Step: Deploy to Netlify](#deploy-to-netlify)
5. [Custom Domain Setup (EZBOQ.COM)](#custom-domain-setup)
6. [Environment Variables](#environment-variables)
7. [Post-Deployment Testing](#post-deployment-testing)
8. [Monitoring & Analytics](#monitoring--analytics)
9. [Troubleshooting](#troubleshooting)

---

## ✅ Pre-Deployment Checklist

### 1. Code Ready
- [x] All features complete (260+ tests passed)
- [x] No TypeScript errors
- [x] No console errors
- [x] Performance optimized
- [x] Thai font support working

### 2. Supabase Setup
- [ ] Supabase project created
- [ ] Database (KV Store) ready
- [ ] Edge Functions deployed
- [ ] Row Level Security (RLS) enabled
- [ ] Backup policy configured

### 3. Environment Variables
- [ ] `SUPABASE_URL` ready
- [ ] `SUPABASE_ANON_KEY` ready
- [ ] `SUPABASE_SERVICE_ROLE_KEY` ready (server-side only)

### 4. Domain
- [x] **EZBOQ.COM** registered! 🎉
- [ ] DNS settings accessible
- [ ] SSL/HTTPS certificate (auto by Vercel/Netlify)

---

## 🏢 Hosting Options

### แนะนำ: Vercel (ดีที่สุดสำหรับ React)

**ข้อดี:**
- ✅ Deploy ง่าย 1 คำสั่ง
- ✅ Auto SSL/HTTPS
- ✅ CDN global
- ✅ Serverless functions support
- ✅ Custom domain free
- ✅ Auto preview deployments
- ✅ ไม่เสียเงิน (Hobby plan)

**ข้อเสีย:**
- ⚠️ Build time limit (Free: 100 hours/month)

---

### ทางเลือก 2: Netlify

**ข้อดี:**
- ✅ Deploy ง่าย
- ✅ Auto SSL/HTTPS
- ✅ CDN global
- ✅ Custom domain free
- ✅ Forms & Functions
- ✅ ไม่เสียเงิน (Starter plan)

**ข้อเสีย:**
- ⚠️ Build minutes limit (Free: 300 minutes/month)

---

### ทางเลือก 3: Cloudflare Pages

**ข้อดี:**
- ✅ Unlimited bandwidth (Free)
- ✅ Fast CDN (Cloudflare network)
- ✅ Auto SSL
- ✅ No build time limit

**ข้อเสีย:**
- ⚠️ Serverless functions ต้องใช้ Workers (complex)

---

## 🚀 Step-by-Step: Deploy to Vercel

### ขั้นตอนที่ 1: Install Vercel CLI

```bash
npm install -g vercel
```

### ขั้นตอนที่ 2: Build โปรเจค

```bash
# ทดสอบ build ก่อน
npm run build

# ถ้า build สำเร็จ ไม่มี error
# ไฟล์จะอยู่ใน /dist
```

### ขั้นตอนที่ 3: Login Vercel

```bash
vercel login
```

เลือกวิธี login:
- GitHub
- GitLab
- Email

### ขั้นตอนที่ 4: Deploy

```bash
# Deploy to preview (testing)
vercel

# หรือ Deploy to production ทันที
vercel --prod
```

**Vercel จะถาม:**
```
? Set up and deploy "~/ezboq"? [Y/n] Y
? Which scope do you want to deploy to? Your Account
? Link to existing project? [y/N] N
? What's your project's name? ezboq
? In which directory is your code located? ./
```

### ขั้นตอนที่ 5: Configure Build Settings

Vercel จะ auto-detect React + Vite

**Build Settings:**
- **Framework Preset:** Vite
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Install Command:** `npm install`

### ขั้นตอนที่ 6: Add Environment Variables

ไปที่ Vercel Dashboard:
1. เลือกโปรเจค **ezboq**
2. Settings → Environment Variables
3. เพิ่มตัวแปร:

```
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6Ikp...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6Ikp... (server-side only)
```

**สำคัญ:** เลือก Environment:
- ✅ Production
- ✅ Preview
- ✅ Development

### ขั้นตอนที่ 7: Redeploy

หลังเพิ่ม Environment Variables:
```bash
vercel --prod
```

### ขั้นตอนที่ 8: Custom Domain (EZBOQ.COM)

1. ไปที่ Vercel Dashboard → โปรเจค **ezboq**
2. Settings → Domains
3. คลิก **Add Domain**
4. พิมพ์: `ezboq.com`
5. คลิก **Add**

**Vercel จะแสดง DNS settings:**

#### ถ้าใช้ Vercel DNS (แนะนำ):
```
Nameservers:
ns1.vercel-dns.com
ns2.vercel-dns.com
```

#### ถ้าใช้ DNS Provider อื่น (เช่น GoDaddy, Namecheap):

**A Record:**
```
Type: A
Name: @
Value: 76.76.21.21
TTL: Auto
```

**CNAME Record:**
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
TTL: Auto
```

6. ไปที่ Domain Provider (ที่จด ezboq.com)
7. เปลี่ยน DNS settings ตามที่ Vercel แนะนำ
8. รอ 5-60 นาที (DNS propagation)
9. ✅ เสร็จ! https://ezboq.com พร้อมใช้งาน

---

## 🌐 Step-by-Step: Deploy to Netlify

### ขั้นตอนที่ 1: Install Netlify CLI

```bash
npm install -g netlify-cli
```

### ขั้นตอนที่ 2: Login Netlify

```bash
netlify login
```

### ขั้นตอนที่ 3: Initialize

```bash
netlify init
```

**Netlify จะถาม:**
```
? What would you like to do? Create & configure a new site
? Team: Your team
? Site name (optional): ezboq
? Build command: npm run build
? Directory to deploy: dist
? Netlify functions folder: (leave empty)
```

### ขั้นตอนที่ 4: Add Environment Variables

```bash
# ใช้ UI
netlify open

# หรือใช้ CLI
netlify env:set SUPABASE_URL "https://xxxxx.supabase.co"
netlify env:set SUPABASE_ANON_KEY "eyJhbGciOiJIUzI1NiIsInR5cCI6Ikp..."
```

### ขั้นตอนที่ 5: Deploy

```bash
# Deploy to preview
netlify deploy

# Deploy to production
netlify deploy --prod
```

### ขั้นตอนที่ 6: Custom Domain (EZBOQ.COM)

1. Netlify Dashboard → Site → Domain settings
2. คลิก **Add custom domain**
3. พิมพ์: `ezboq.com`
4. Follow DNS instructions (similar to Vercel)

---

## 🔐 Environment Variables

### ที่ต้องตั้งค่า:

| Variable | ค่า | ใช้ที่ |
|----------|-----|--------|
| `SUPABASE_URL` | https://xxxxx.supabase.co | Frontend |
| `SUPABASE_ANON_KEY` | eyJhbGci... (public) | Frontend |
| `SUPABASE_SERVICE_ROLE_KEY` | eyJhbGci... (secret!) | Server only |

### วิธีหา Keys จาก Supabase:

1. ไปที่ [Supabase Dashboard](https://app.supabase.com)
2. เลือก Project
3. Settings → API
4. **Project URL** = `SUPABASE_URL`
5. **anon public** = `SUPABASE_ANON_KEY`
6. **service_role** = `SUPABASE_SERVICE_ROLE_KEY` ⚠️ **ห้าม leak!**

---

## 🔧 Custom Domain Setup (EZBOQ.COM)

### DNS Configuration

#### Option 1: ใช้ Vercel DNS (แนะนำ)

**ข้อดี:**
- ✅ Setup ง่ายที่สุด
- ✅ Auto SSL
- ✅ Fast propagation

**วิธี:**
1. ไปที่ Domain Provider (ที่จด ezboq.com)
2. เปลี่ยน Nameservers เป็น:
   ```
   ns1.vercel-dns.com
   ns2.vercel-dns.com
   ```
3. Save changes
4. รอ 5-60 นาที

---

#### Option 2: ใช้ DNS Provider ปัจจุบัน

**เพิ่ม Records เหล่านี้:**

**สำหรับ Vercel:**
```
Type: A
Name: @
Value: 76.76.21.21
TTL: Auto

Type: CNAME
Name: www
Value: cname.vercel-dns.com
TTL: Auto
```

**สำหรับ Netlify:**
```
Type: A
Name: @
Value: 75.2.60.5
TTL: Auto

Type: CNAME
Name: www
Value: [your-site].netlify.app
TTL: Auto
```

---

### SSL Certificate

**Automatic (Vercel/Netlify):**
- ✅ SSL certificate จะถูกสร้างอัตโนมัติ
- ✅ Let's Encrypt (ฟรี)
- ✅ Auto-renew ทุก 90 วัน
- ✅ HTTPS บังคับ (HTTP → HTTPS redirect)

**ตรวจสอบ:**
- ✅ https://ezboq.com (ขึ้น 🔒 Lock icon)
- ✅ https://www.ezboq.com (ถ้าตั้งค่า www)

---

## 🧪 Post-Deployment Testing

### 1. Smoke Tests

เปิด https://ezboq.com แล้วทดสอบ:

- [ ] หน้าแรกโหลดได้
- [ ] สมัครสมาชิกได้
- [ ] Login ได้
- [ ] สร้าง BOQ ได้
- [ ] Export PDF ได้ (ฟอนต์ไทยถูกต้อง)
- [ ] QR Code แสดงได้

### 2. Performance Tests

ใช้ [PageSpeed Insights](https://pagespeed.web.dev/):
```
https://pagespeed.web.dev/report?url=https://ezboq.com
```

**Target:**
- ✅ Performance: 90+
- ✅ Accessibility: 90+
- ✅ Best Practices: 90+
- ✅ SEO: 90+

### 3. Cross-browser Tests

- [ ] Chrome (Desktop)
- [ ] Firefox (Desktop)
- [ ] Safari (Desktop)
- [ ] Edge (Desktop)
- [ ] Chrome (Mobile)
- [ ] Safari (iOS)

### 4. Mobile Responsive

- [ ] iPhone (375px)
- [ ] iPad (768px)
- [ ] Desktop (1920px)

### 5. Security Tests

- [ ] HTTPS working (🔒 Lock icon)
- [ ] No console errors
- [ ] API keys not exposed
- [ ] RLS working (user เห็นเฉพาะข้อมูลตัวเอง)

---

## 📊 Monitoring & Analytics

### 1. Vercel Analytics (Recommended)

**Setup:**
1. Vercel Dashboard → Project → Analytics
2. Enable **Vercel Analytics**
3. ดูข้อมูล:
   - Page views
   - Unique visitors
   - Top pages
   - Realtime users

---

### 2. Google Analytics (Optional)

**Setup:**
1. สร้าง GA4 property
2. เพิ่ม tracking code ใน `index.html`:

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

### 3. Error Tracking: Sentry (Optional)

**Setup:**
1. สร้าง account ที่ [sentry.io](https://sentry.io)
2. Install SDK:

```bash
npm install @sentry/react
```

3. เพิ่มใน `App.tsx`:

```typescript
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "https://xxxxx@sentry.io/xxxxx",
  environment: "production",
  tracesSampleRate: 1.0,
});
```

---

### 4. Uptime Monitoring

**Free Tools:**
- [UptimeRobot](https://uptimerobot.com) - ฟรี 50 monitors
- [Freshping](https://www.freshworks.com/website-monitoring/) - ฟรี unlimited
- [StatusCake](https://www.statuscake.com) - ฟรี 10 monitors

**Setup:**
- Add URL: `https://ezboq.com`
- Interval: 5 minutes
- Alert: Email เมื่อ down

---

## 🐛 Troubleshooting

### ปัญหาที่พบบ่อย

#### 1. Build Failed

**Error:** `npm run build` failed

**แก้:**
```bash
# ลบ node_modules แล้วติดตั้งใหม่
rm -rf node_modules
npm install
npm run build
```

---

#### 2. Environment Variables ไม่ทำงาน

**Error:** Cannot connect to Supabase

**แก้:**
1. ตรวจสอบว่าตั้งค่าครบ 3 ตัวแปร
2. ตรวจสอบว่าเลือก Environment: Production
3. Redeploy:
   ```bash
   vercel --prod
   ```

---

#### 3. Domain ยังไม่ขึ้น

**Error:** DNS_PROBE_FINISHED_NXDOMAIN

**แก้:**
1. ตรวจสอบ DNS settings ถูกต้อง
2. รอ DNS propagation (5-60 นาที)
3. ล้าง DNS cache:
   ```bash
   # macOS
   sudo dscacheutil -flushcache
   
   # Windows
   ipconfig /flushdns
   ```
4. ตรวจสอบ DNS:
   ```bash
   nslookup ezboq.com
   ```

---

#### 4. SSL Certificate ไม่ทำงา���

**Error:** NET::ERR_CERT_COMMON_NAME_INVALID

**แก้:**
1. รอ 5-10 นาที (SSL provisioning)
2. ถ้ายังไม่ได้ ลบ domain แล้วเพิ่มใหม่
3. Force SSL renewal (Vercel Dashboard → Domains → Refresh)

---

#### 5. PDF Export ฟอนต์ไทยผิด

**Error:** ฟอนต์แสดงผิด หรือเป็น replacement characters

**แก้:**
1. ตรวจสอบ Google Fonts ใน `index.html`
2. ล้าง cache browser (Ctrl+Shift+Del)
3. ทดสอบใน Incognito mode

---

#### 6. Supabase Edge Functions ไม่ทำงาน

**Error:** 404 Not Found: /make-server-6e95bca3/...

**แก้:**
1. ตรวจสอบว่า Deploy edge functions แล้ว:
   ```bash
   supabase functions deploy server
   ```
2. ตรวจสอบ URL pattern: `/functions/v1/make-server-6e95bca3/...`
3. ตรวจสอบ CORS settings

---

#### 7. Performance ช้า

**Problem:** Page load > 5s

**แก้:**
1. Enable caching (Vercel/Netlify auto)
2. Optimize images (ใช้ WebP)
3. Code splitting (already done with React)
4. ใช้ CDN (Vercel/Netlify มีอยู่แล้ว)

---

## 📋 Deployment Checklist

### Pre-Deployment

- [x] Code complete & tested
- [ ] Supabase project ready
- [ ] Environment variables prepared
- [x] Domain registered (EZBOQ.COM)
- [x] Build test passed locally

### Deployment

- [ ] Choose hosting (Vercel/Netlify)
- [ ] Deploy to preview first
- [ ] Test preview URL
- [ ] Add environment variables
- [ ] Deploy to production
- [ ] Configure custom domain (ezboq.com)
- [ ] Wait for DNS propagation
- [ ] Verify SSL certificate

### Post-Deployment

- [ ] Smoke tests passed
- [ ] Performance tests > 90
- [ ] Cross-browser tests passed
- [ ] Mobile responsive verified
- [ ] Security checks passed
- [ ] Setup monitoring (Analytics + Uptime)
- [ ] Share with team! 🎉

---

## 🎯 Quick Commands

### Vercel

```bash
# Login
vercel login

# Deploy preview
vercel

# Deploy production
vercel --prod

# View logs
vercel logs

# Open dashboard
vercel open
```

### Netlify

```bash
# Login
netlify login

# Deploy preview
netlify deploy

# Deploy production
netlify deploy --prod

# View logs
netlify logs

# Open dashboard
netlify open
```

---

## 🎉 Success Checklist

เมื่อเสร็จทุกอย่าง คุณควรมี:

- ✅ https://ezboq.com ขึ้นแล้ว (🔒 HTTPS)
- ✅ Login/Signup ทำงาน
- ✅ สร้าง BOQ ได้
- ✅ Export PDF สวยงาม (ฟอนต์ไทยถูกต้อง)
- ✅ Performance > 90
- ✅ Mobile responsive
- ✅ Monitoring setup

**🚀 Ready to Launch!**

---

## 📞 Support

### ปัญหาเกี่ยวกับ:

**Vercel:**
- Docs: https://vercel.com/docs
- Support: https://vercel.com/support

**Netlify:**
- Docs: https://docs.netlify.com
- Support: https://www.netlify.com/support

**Supabase:**
- Docs: https://supabase.com/docs
- Support: https://supabase.com/support

**EZBOQ System:**
- อ่าน: `FINAL_REVIEW.md`
- อ่าน: `PRODUCTION_CHECKLIST.md`
- อ่าน: `USER_MANUAL.md`

---

## 🎊 Next Steps After Launch

1. **Week 1: Monitor**
   - ดู Analytics ทุกวัน
   - ตรวจสอบ errors (Sentry)
   - รับ feedback จาก users

2. **Week 2: Optimize**
   - แก้ bugs ที่พบ
   - ปรับปรุง UX
   - เพิ่ม features ตาม feedback

3. **Month 1: Scale**
   - Marketing (SEO, Ads)
   - เพิ่ม users
   - Setup payment gateway
   - Setup email service

4. **Phase 2: Enhance**
   - ดู FINAL_REVIEW.md → Phase 2 features
   - Email notifications
   - Payment gateway
   - Mobile app?

---

**สร้างโดย:** Figma Make AI  
**Domain:** EZBOQ.COM  
**สถานะ:** ✅ Ready to Deploy!

---

Made with ❤️ for Thai Construction Industry 🇹🇭

**🚀 LET'S LAUNCH EZBOQ.COM! 🚀**
