# 🔐 EZBOQ Security & Deployment Guide

> **Version**: 2.2.1 - Production Security Ready  
> **Status**: ✅ Ready for Production Deployment  
> **Security Level**: 🔒 High

---

## 📚 เอกสารทั้งหมด

| เอกสาร | รายละเอียด | เหมาะสำหรับ |
|--------|-----------|-------------|
| **DEPLOY_QUICK_START.md** | Deploy ใน 5 นาที | 🚀 ผู้ที่ต้องการ deploy เร็ว |
| **PRE_DEPLOY_CHECKLIST.md** | Checklist ก่อน deploy | ✅ ทุกครั้งก่อน deploy |
| **SECURITY_DEPLOYMENT.md** | คู่มือความปลอดภัยฉบับเต็ม | 🔒 Admin/DevOps |
| **PRODUCTION_SECURITY_READY.md** | สรุปสถานะความพร้อม | 📊 Overview ทั้งหมด |

---

## ⚡ Quick Start (เริ่มต้นเร็ว)

### สำหรับคนที่รีบ (5 นาที)

```bash
# 1. ตรวจสอบความปลอดภัย
bash verify-security.sh

# 2. Deploy
vercel --prod
# หรือ netlify deploy --prod
# หรือ push to GitHub แล้วใช้ Cloudflare Pages

# 3. ตั้งค่า Environment Variables ใน Dashboard
# → เพิ่มค่าทั้ง 4 ตัว (ดู DEPLOY_QUICK_START.md)

# 4. เสร็จ! 🎉
```

**อ่านรายละเอียด**: `DEPLOY_QUICK_START.md`

---

## 🛡️ Security Features

### ✅ ติดตั้งแล้ว

1. **Git Security**
   - `.gitignore` - ป้องกันไฟล์ sensitive
   - `.env.example` - Template ปลอดภัย

2. **Content Security Policy (CSP)**
   - ป้องกัน XSS attacks
   - ป้องกัน code injection
   - ควบคุม resource loading

3. **Environment Variables**
   - ไม่มี hardcoded keys
   - ใช้ environment variables ทั้งหมด
   - Protected files ใน `.gitignore`

4. **Build Security**
   - Type-check ก่อน build
   - Node version requirements
   - Dependencies locked

5. **Automated Verification**
   - `verify-security.sh` - สคริปต์ตรวจสอบอัตโนมัติ

---

## 🚨 สิ่งที่ห้ามทำ (NEVER DO)

### ❌ ห้ามเด็ดขาด

```bash
# 1. ห้าม commit .env
git add .env  # ❌ อันตราย!

# 2. ห้าม hardcode secrets
const apiKey = "eyJhbGc..."  # ❌ อันตราย!

# 3. ห้ามใช้ Service Role Key ใน Frontend
const key = process.env.SUPABASE_SERVICE_ROLE_KEY  # ❌ อันตราย!

# 4. ห้าม disable RLS
alter table users disable row level security;  # ❌ อันตราย!

# 5. ห้าม expose sensitive errors
console.log(error.stack)  # ❌ อันตราย ใน production!
```

---

## ✅ สิ่งที่ควรทำ (BEST PRACTICES)

### ✅ แนะนำ

```bash
# 1. ใช้ environment variables
const apiUrl = import.meta.env.VITE_SUPABASE_URL  # ✅ ดี!

# 2. ใช้ conditional logging
if (import.meta.env.DEV) {
  console.log('Debug info')  # ✅ ดี!
}

# 3. Type-check ก่อน deploy
npm run type-check  # ✅ ดี!

# 4. ใช้ automated verification
bash verify-security.sh  # ✅ ดี!

# 5. Enable RLS
create policy "policy_name" on table_name  # ✅ ดี!
```

---

## 📋 Pre-Deploy Checklist (ย่อ)

```bash
# ความปลอดภัย
□ .env ไม่ถูก track (git status)
□ ไม่มี hardcoded keys (git grep)
□ CSP header อยู่ใน index.html

# โค้ด
□ TypeScript OK (npm run type-check)
□ Build OK (npm run build)
□ ไม่มี console.log sensitive ใน production

# Supabase
□ RLS เปิดทุกตาราง
□ Allowed origins ตั้งค่าแล้ว

# Deploy
□ Environment variables ตั้งค่าบน platform
□ Build settings ถูกต้อง
```

**Checklist ฉบับเต็ม**: `PRE_DEPLOY_CHECKLIST.md`

---

## 🔧 การใช้งานสคริปต์

### verify-security.sh

สคริปต์ตรวจสอบความปลอดภัยอัตโนมัติ 8 ข้อ:

```bash
# รันสคริปต์
bash verify-security.sh

# Expected output:
📁 [1/8] Checking .env file...
✅ .env is not tracked
✅ .env file exists locally

📋 [2/8] Checking .env.example...
✅ .env.example exists

🚫 [3/8] Checking .gitignore...
✅ .gitignore exists
✅ .gitignore includes .env

🔍 [4/8] Scanning for hardcoded credentials...
✅ No hardcoded JWT found in src/
✅ No unexpected Supabase URLs

🛡️  [5/8] Checking Content Security Policy...
✅ CSP meta tag found

📦 [6/8] Checking package.json...
✅ Node version specified in engines
✅ type-check script exists

🔊 [7/8] Checking for console.log (production)...
✅ Console.log usage looks OK

🔨 [8/8] Running TypeScript check and build...
✅ No TypeScript errors
✅ Build successful
📊 Build size: 2.5M

==============================
📊 Verification Summary
==============================
✨ Perfect! All checks passed!

🚀 Ready to deploy!
```

---

## 🎯 ตรวจสอบด้วยตัวเอง (Manual)

### 1. Git Status
```bash
git status
# ต้องไม่เห็น .env
```

### 2. Hardcoded Keys
```bash
# ค้นหา JWT tokens
git grep -n "eyJhbGc" src/
# ต้องไม่เจออะไร

# ค้นหา Supabase URLs
git grep -n "cezwqajbkjhvumbhpsgy" src/ --exclude-dir=supabase
# ต้องไม่เจออะไร (ยกเว้น utils/supabase)
```

### 3. Environment Template
```bash
# ตรวจสอบว่า .env.example ไม่มีค่าจริง
cat .env.example | grep "cezwqajbkjhvumbhpsgy"
# ต้องไม่เจออะไร

cat .env.example | grep "eyJhbGc"
# ต้องไม่เจออะไร
```

### 4. Build Test
```bash
npm ci
npm run type-check
npm run build
npm run preview
```

---

## 🚀 Platform-Specific Setup

### Vercel
```bash
# CLI Deploy
vercel --prod

# Environment Variables
# Dashboard → Settings → Environment Variables
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
APP_ENV=production
DEBUG=false
```

### Netlify
```bash
# CLI Deploy
netlify deploy --prod --dir=dist

# Build Settings
Build command: npm run build
Publish directory: dist

# Environment Variables
# Dashboard → Site Settings → Build & Deploy → Environment
```

### Cloudflare Pages
```bash
# Git-based Deploy
git push origin main

# Build Configuration
Framework: Vite
Build command: npm run build
Build output: dist

# Environment Variables
# Dashboard → Settings → Environment Variables
```

---

## 📊 ตรวจสอบหลัง Deploy

### ✅ Application Health
```
□ เว็บโหลดได้
□ Login ทำงาน
□ สร้าง BOQ ได้
□ Export PDF ได้
□ Cache ทำงาน
```

### ✅ Console (DevTools)
```javascript
// ควรเห็น
✅ "📦 Restored X cache entries from localStorage"
✅ "✅ Cache hit for ..."

// ไม่ควรเห็น
❌ "Failed to fetch"
❌ "CORS error"
❌ "CSP violation"
```

### ✅ Performance
```
// Lighthouse Score
Performance:    > 90
Accessibility:  > 90
Best Practices: > 90
SEO:            > 90
```

### ✅ Security Headers
```bash
# ทดสอบที่
https://securityheaders.com/?q=https://yourdomain.com

# ควรได้ Grade A หรือ B
```

---

## 🆘 Troubleshooting

### ปัญหาที่พบบ่อย

#### 1. "Failed to fetch" หลัง Deploy
**สาเหตุ**: ยังไม่ตั้งค่า Environment Variables

**แก้:**
```
1. ไปที่ Platform Dashboard
2. Settings → Environment Variables
3. เพิ่มทั้ง 4 ตัว
4. Redeploy
```

#### 2. CORS Error
**สาเหตุ**: ยังไม่เพิ่ม Allowed Origins ใน Supabase

**แก้:**
```
1. Supabase Dashboard
2. Settings → Auth → Redirect URLs
3. เพิ่ม: https://your-project.vercel.app
4. Save
```

#### 3. "Invalid JWT"
**สาเหตุ**: JWT ref ไม่ตรงกับ Supabase URL

**แก้:**
```bash
# ตรวจสอบว่า ref ตรงกัน
URL:     https://cezwqajbkjhvumbhpsgy.supabase.co
JWT ref: cezwqajbkjhvumbhpsgy
         ^^^^^^^^^^^^^^^^^^^^^ ต้องเหมือนกัน
```

#### 4. Build Failed
**สาเหตุ**: TypeScript errors

**แก้:**
```bash
npm run type-check
# แก้ errors ที่เจอ
npm run build
```

---

## 📞 ต้องการความช่วยเหลือ?

### เอกสารเพิ่มเติม
1. **DEPLOY_QUICK_START.md** - วิธี deploy แบบเร็ว
2. **PRE_DEPLOY_CHECKLIST.md** - Checklist ฉบับเต็ม
3. **SECURITY_DEPLOYMENT.md** - คู่มือความปลอดภัยละเอียด
4. **PRODUCTION_SECURITY_READY.md** - สถานะความพร้อม

### การติดต่อ
- GitHub Issues
- Email: support@ezboq.com
- Documentation: ดู `USER_MANUAL.md`

---

## 🎉 สรุป

### การันตีความปลอดภัย
- ✅ ไม่มี hardcoded secrets
- ✅ Environment variables ปลอดภัย
- ✅ CSP ป้องกัน XSS
- ✅ Git security ครบถ้วน
- ✅ Automated verification

### พร้อม Deploy เมื่อ
```bash
bash verify-security.sh  # ผ่านทุกข้อ
npm run build           # Build สำเร็จ
```

### คำสั่งเดียวจบ
```bash
bash verify-security.sh && npm run build && echo "✅ READY!"
```

---

**Last Updated**: October 29, 2025  
**Version**: 2.2.1 (Production Security Ready)  
**Security Status**: ✅ Verified  
**Deployment Status**: 🚀 Ready

**Happy & Secure Deploying! 🔐🚀**
