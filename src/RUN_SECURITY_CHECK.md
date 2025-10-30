# 🔐 วิธีรันสคริปต์ตรวจสอบความปลอดภัย

## ⚡ Quick Start

```bash
# รันสคริปต์ทันที
bash verify-security.sh
```

## 🔧 ถ้าไม่สามารถรันได้

### วิธีที่ 1: ใช้ bash
```bash
bash verify-security.sh
```

### วิธีที่ 2: เพิ่มสิทธิ์ execute
```bash
# เพิ่มสิทธิ์
chmod +x verify-security.sh

# รันได้เลย
./verify-security.sh
```

### วิธีที่ 3: ใช้ sh
```bash
sh verify-security.sh
```

## 📊 Expected Output

### ✅ ผ่านทุกข้อ (Success)
```bash
🔐 EZBOQ Security Verification
==============================

📁 [1/8] Checking .env file...
✅ .env is not tracked
✅ .env file exists locally

📋 [2/8] Checking .env.example...
✅ .env.example exists

🚫 [3/8] Checking .gitignore...
✅ .gitignore exists
✅ .gitignore includes .env
✅ .gitignore includes node_modules

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

Next steps:
  1. git add .
  2. git commit -m 'feat: production ready'
  3. git push origin main
  4. Deploy to your hosting platform
```

### ⚠️ มี Warning (แต่ยังใช้ได้)
```bash
...
⚠️  .env file not found (create from .env.example)
⚠️  CSP meta tag not found in index.html
...

==============================
📊 Verification Summary
==============================
⚠️  Passed with 2 warning(s)

You can deploy, but consider fixing warnings.
```

### ❌ มี Error (ต้องแก้ไข)
```bash
...
❌ ERROR: .env is tracked by git!
   Run: git rm --cached .env
❌ ERROR: Found hardcoded JWT in source code!
...

==============================
📊 Verification Summary
==============================
❌ Failed with 2 error(s) and 0 warning(s)

Please fix all errors before deploying!
```

## 🔧 แก้ไขปัญหาที่พบบ่อย

### ❌ .env is tracked by git
```bash
# แก้ไข
git rm --cached .env
git commit -m "fix: remove .env from tracking"
```

### ❌ .env file not found
```bash
# สร้างจาก template
cp .env.example .env

# แก้ไขให้ใส่ค่าจริง
nano .env
# หรือ
code .env
```

### ❌ TypeScript errors
```bash
# ดู errors
npm run type-check

# แก้ไข errors ที่เจอ
# จากนั้น build ใหม่
npm run build
```

### ❌ Build failed
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install

# Try build again
npm run build
```

## 📋 Manual Checks (ทำเอง)

### 1. ตรวจสอบ Git Status
```bash
git status

# ต้องไม่เห็น:
# - .env
# - node_modules/
# - dist/
```

### 2. ตรวจสอบ Hardcoded Keys
```bash
# ค้นหา JWT tokens
git grep -n "eyJhbGc" src/
# ควรไม่เจออะไร

# ค้นหา Supabase URLs (นอกจาก utils/supabase)
git grep -n "cezwqajbkjhvumbhpsgy" src/ --exclude-dir=supabase
# ควรไม่เจออะไร
```

### 3. ตรวจสอบ Build
```bash
npm ci
npm run type-check
npm run build
npm run preview
```

## 🎯 Next Steps หลังผ่าน Verification

```bash
# 1. Commit changes
git add .
git commit -m "feat: production ready v2.2.1"

# 2. Push to GitHub
git push origin main

# 3. Deploy
vercel --prod
# หรือ
netlify deploy --prod
# หรือ push to GitHub for Cloudflare Pages

# 4. ตั้งค่า Environment Variables บน hosting platform
```

## 📚 เอกสารที่เกี่ยวข้อง

1. **DEPLOY_QUICK_START.md** - Deploy ใน 5 นาที
2. **SECURITY_README.md** - Security Guide
3. **PRE_DEPLOY_CHECKLIST.md** - Full Checklist
4. **SECURITY_DEPLOYMENT.md** - Deployment Guide

## 💡 Tips

### สำหรับ Windows
```bash
# ใช้ Git Bash
bash verify-security.sh

# หรือ WSL
wsl bash verify-security.sh
```

### สำหรับ macOS/Linux
```bash
# สามารถรันตรงได้
bash verify-security.sh

# หรือเพิ่ม execute permission
chmod +x verify-security.sh
./verify-security.sh
```

### ใน CI/CD Pipeline
```yaml
# GitHub Actions
- name: Security Check
  run: bash verify-security.sh

# GitLab CI
security_check:
  script:
    - bash verify-security.sh
```

## 🆘 ยังไม่ได้?

### ลองวิธีนี้:
```bash
# 1. ตรวจสอบว่าไฟล์มีอยู่
ls -la verify-security.sh

# 2. ดูเนื้อหาในไฟล์
cat verify-security.sh

# 3. รัน command โดยตรง
bash verify-security.sh

# 4. ถ้ายังไม่ได้ ให้เช็คทีละข้อ manually
# ดู PRE_DEPLOY_CHECKLIST.md
```

---

**ควรรันเมื่อไหร่?**
- ✅ ทุกครั้งก่อน deploy
- ✅ หลังแก้โค้ดสำคัญ
- ✅ ก่อน commit ถ้าเปลี่ยน environment setup
- ✅ เมื่อทำ security update

**เวลาที่ใช้:** ~2 นาที (รวม build)

---

**Made with ❤️ for secure deployments**
