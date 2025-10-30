# 🚀 Pre-Deploy Checklist - EZBOQ

## ✅ Security Checklist

### 1. Environment Variables
- [ ] ไฟล์ `.env` ไม่ถูก commit (ตรวจสอบด้วย `git status`)
- [ ] ไฟล์ `.env.example` มีโครงสร้างที่ถูกต้อง (ไม่มีค่าจริง)
- [ ] ตรวจสอบว่าไม่มี hardcoded keys ในโค้ด:
  ```bash
  git grep -n "supabase.co" src/ --exclude-dir=utils/supabase
  ```

### 2. Supabase Configuration
- [ ] ตรวจสอบ Supabase URL และ Anon Key ใน env ตรงกับ JWT
  - โดเมน: `cezwqajbkjhvumbhpsgy.supabase.co`
  - JWT ref: `cezwqajbkjhvumbhpsgy` (ต้องตรงกัน ✅)

- [ ] เปิด Row Level Security (RLS) ทุกตาราง
  ```sql
  -- ตัวอย่าง RLS policy
  create policy "read_own_or_public"
  on public.your_table for select
  to anon, authenticated
  using (is_public = true or owner_id = auth.uid());
  ```

- [ ] ตั้งค่า Allowed Origins ใน Supabase Dashboard
  - Settings → Auth → Redirect URLs
  - เพิ่ม: `http://localhost:5173` (dev)
  - เพิ่ม: `https://yourdomain.com` (production)

### 3. Build & Type Check
```bash
# ติดตั้ง dependencies
npm ci

# ตรวจสอบ TypeScript errors
npm run type-check

# Build production
npm run build

# ทดสอบ preview
npm run preview
```

### 4. Code Quality
- [ ] ไม่มี `console.log` ที่ไม่จำเป็นในโค้ด production
- [ ] ใช้ conditional logging:
  ```typescript
  if (import.meta.env.DEV) {
    console.log('Debug info');
  }
  ```

### 5. Dependencies
```bash
# Lock dependencies version
npm shrinkwrap

# หรือใช้ exact versions
npm install --save-exact
```

## 🔍 Pre-Commit Verification

```bash
# 1. ลบ .env จาก git cache (ถ้าเคย commit ไปแล้ว)
git rm --cached .env 2>/dev/null || true

# 2. ตรวจสอบ status
git status

# 3. ตรวจสอบว่าไม่มี hardcoded keys
git grep -n "eyJhbGc" src/ || echo "✅ No hardcoded JWT found"

# 4. ตรวจสอบว่าไม่มี .env ใน staged files
git diff --cached --name-only | grep -E "^\.env$" && echo "❌ .env is staged!" || echo "✅ .env not staged"
```

## 🌐 CSP Verification

Content Security Policy ใน `index.html`:
- ✅ `default-src 'self'` - อนุญาตเฉพาะ origin เดียวกัน
- ✅ `img-src 'self' data: https:` - รูปภาพจาก self, data URLs, HTTPS
- ✅ `connect-src https://*.supabase.co` - API calls ไป Supabase
- ✅ `font-src https://fonts.gstatic.com` - Google Fonts
- ✅ `object-src 'none'` - ป้องกัน Flash/Java

## 📦 Production Build Size

```bash
# Build และดู bundle size
npm run build

# Expected output:
# dist/index.html                  x.xx kB
# dist/assets/index-xxxxxx.css    xx.xx kB
# dist/assets/index-xxxxxx.js    xxx.xx kB
```

## 🎯 Performance Checklist

- ✅ Frontend cache enabled (Nuclear Mode)
- ✅ Cache warmup on login
- ✅ localStorage persistence
- ✅ Request deduplication
- ✅ Stale-while-revalidate strategy

## 🔐 Security Best Practices

### Never Commit:
- `.env` - Environment variables
- `node_modules/` - Dependencies
- `dist/` - Build output
- `docs-private/` - Private docs
- API keys, tokens, secrets

### Always Review:
- Git diff before commit
- Environment variables usage
- API endpoints security
- Error messages (no sensitive data)

## 📋 Deployment Steps

### 1. Final Check
```bash
npm ci
npm run type-check
npm run build
```

### 2. Verify Git Status
```bash
git status
# ต้องไม่เห็น:
# - .env
# - node_modules/
# - dist/
```

### 3. Commit Changes
```bash
git add .
git commit -m "feat: production ready with security hardening"
git push origin main
```

### 4. Deploy to Hosting
- **Vercel**: `vercel --prod`
- **Netlify**: `netlify deploy --prod`
- **Cloudflare Pages**: Connect via Dashboard

### 5. Environment Variables on Host
ตั้งค่าใน Dashboard ของ hosting:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `APP_ENV=production`
- `DEBUG=false`

## ⚠️ Common Mistakes to Avoid

1. ❌ Commit `.env` file
2. ❌ Hardcode API keys in code
3. ❌ Forget to enable RLS on Supabase tables
4. ❌ Deploy without type-check
5. ❌ Expose SUPABASE_SERVICE_ROLE_KEY to frontend
6. ❌ Leave debug logs in production
7. ❌ Not set NODE_ENV=production

## 🎉 Ready to Deploy!

เมื่อผ่านทุก checklist แล้ว คุณพร้อม deploy!

```bash
# Final command
npm run build && echo "✅ BUILD SUCCESS - READY TO DEPLOY!"
```

---

**Last Updated**: October 29, 2025  
**Version**: 2.2.1 (Production Ready)
