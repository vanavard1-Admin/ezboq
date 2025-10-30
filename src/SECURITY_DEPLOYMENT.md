# 🔐 Security & Deployment Guide - EZBOQ

## 📝 Overview

เอกสารนี้รวบรวมแนวทางการรักษาความปลอดภัยและการ deploy แอปพลิเคชัน EZBOQ อย่างถูกต้อง

## 🛡️ Security Configuration

### 1. Environment Variables Structure

#### ไฟล์ `.env` (Local Only - ห้าม commit!)
```bash
VITE_SUPABASE_URL=https://cezwqajbkjhvumbhpsgy.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SENTRY_DSN=
APP_ENV=production
DEBUG=false
```

#### ไฟล์ `.env.example` (Safe to commit)
```bash
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_KEY
SENTRY_DSN=
APP_ENV=production
DEBUG=false
```

### 2. Git Security (.gitignore)

สำคัญมาก! ป้องกันไฟล์ sensitive ขึ้น Git:

```gitignore
# Environment - อันตราย! ห้าม commit
.env
.env.*
!.env.example

# Dependencies
node_modules/

# Build
dist/
build/

# Private docs
docs-private/

# OS
.DS_Store

# Test files
test-*.html
```

### 3. Content Security Policy (CSP)

ใน `index.html`:
```html
<meta http-equiv="Content-Security-Policy" 
  content="default-src 'self'; 
           img-src 'self' data: https:; 
           script-src 'self' 'unsafe-inline' 'unsafe-eval'; 
           style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; 
           font-src 'self' https://fonts.gstatic.com; 
           connect-src 'self' https://*.supabase.co https://api.sentry.io; 
           frame-src 'self'; 
           object-src 'none'; 
           base-uri 'self';">
```

#### CSP Breakdown:
- `default-src 'self'` → อนุญาตเฉพาะ same-origin
- `img-src` → รูปภาพจาก self, data URLs, HTTPS
- `script-src` → JavaScript (Vite ต้องการ unsafe-eval)
- `connect-src` → API calls ไป Supabase + Sentry
- `object-src 'none'` → ป้องกัน Flash/plugins
- `base-uri 'self'` → ป้องกัน base tag injection

### 4. Supabase Client Configuration

ใช้ singleton pattern ป้องกัน multiple instances:

```typescript
// utils/supabase/client.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from './info';

let supabaseInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!supabaseInstance) {
    supabaseInstance = createClient(
      `https://${projectId}.supabase.co`,
      publicAnonKey,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storageKey: 'boq-pro-auth',
        },
      }
    );
  }
  return supabaseInstance;
}
```

## 🚀 Deployment Process

### Step 1: Pre-Deploy Verification

```bash
# 1. Clean install
npm ci

# 2. Type check
npm run type-check

# 3. Build test
npm run build

# 4. Preview
npm run preview
```

### Step 2: Git Security Check

```bash
# ตรวจสอบว่า .env ไม่ถูก track
git status | grep "\.env$" && echo "❌ DANGER: .env is tracked!" || echo "✅ Safe"

# ลบ .env จาก cache ถ้าเคย commit
git rm --cached .env 2>/dev/null || true

# ตรวจสอบว่าไม่มี hardcoded keys
git grep -n "eyJhbGc" src/ && echo "❌ Found JWT in code!" || echo "✅ No hardcoded keys"

# ตรวจสอบว่าไม่มี Supabase URL ใน code (ยกเว้น utils/supabase)
git grep -n "cezwqajbkjhvumbhpsgy" src/ --exclude-dir=supabase && echo "❌ Hardcoded URL found!" || echo "✅ Clean"
```

### Step 3: Commit & Push

```bash
git add .
git commit -m "feat: production ready v2.2.1 with security hardening"
git push origin main
```

### Step 4: Deploy to Platform

#### Option A: Vercel
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod

# Set environment variables in Vercel Dashboard:
# Settings → Environment Variables
```

#### Option B: Netlify
```bash
# Install Netlify CLI
npm i -g netlify-cli

# Deploy
netlify deploy --prod

# Set environment variables in Netlify Dashboard:
# Site settings → Build & deploy → Environment
```

#### Option C: Cloudflare Pages
1. Connect GitHub repo via Dashboard
2. Build command: `npm run build`
3. Build output: `dist`
4. Set environment variables in Dashboard

### Step 5: Configure Environment on Host

ทุก platform ต้องตั้งค่า:

```bash
VITE_SUPABASE_URL=https://cezwqajbkjhvumbhpsgy.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNlendxYWpia2podnVtYmhwc2d5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1Nzc1OTIsImV4cCI6MjA3NzE1MzU5Mn0.nr4IZv_hoaTH9rvSUtNrMi_wL37_fUnNdXZ1ft8-gRE
APP_ENV=production
DEBUG=false
```

⚠️ **สำคัญ**: ไม่ต้องตั้ง `SENTRY_DSN` ถ้าไม่ได้ใช้ Sentry

## 🔒 Supabase Security

### Row Level Security (RLS)

เปิด RLS ทุกตาราง และสร้าง policies:

```sql
-- Example: User data table
create policy "Users can read own data"
on public.user_profiles for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can update own data"
on public.user_profiles for update
to authenticated
using (auth.uid() = user_id);

-- Example: Public catalog
create policy "Anyone can read catalog"
on public.catalog for select
to anon, authenticated
using (true);
```

### API Configuration

1. **Auth Settings** (Supabase Dashboard)
   - Authentication → Providers → Enable/Disable
   - URL Configuration → Add allowed redirect URLs
   - Email Templates → Customize (optional)

2. **Allowed Origins**
   ```
   http://localhost:5173
   http://localhost:5174
   https://yourdomain.com
   https://www.yourdomain.com
   ```

3. **API Keys** (Never expose Service Role Key!)
   - ✅ `anon` key → Safe for frontend
   - ❌ `service_role` key → Backend only!

## 📊 Monitoring & Error Tracking

### Sentry (Optional)

```typescript
// App.tsx
import { init } from '@sentry/react';

// เปิดใช้เฉพาะเมื่อมี DSN
if (import.meta.env.SENTRY_DSN) {
  init({
    dsn: import.meta.env.SENTRY_DSN,
    environment: import.meta.env.APP_ENV || 'production',
    tracesSampleRate: 0.1,
  });
}
```

### Performance Monitoring

```typescript
// Conditional logging
if (import.meta.env.DEV) {
  console.log('[DEBUG]', data);
}

// Production error logging (safe)
if (error) {
  console.error('[ERROR]', error.message); // ไม่เปิดเผย sensitive data
}
```

## 🔧 Troubleshooting

### Problem: "Failed to fetch"
**Solution**: ตรวจสอบ CSP และ CORS
```bash
# ดู Network tab ใน DevTools
# ตรวจสอบว่า request ถูก block หรือไม่
```

### Problem: "Body stream already read"
**Solution**: ใช้ `response.clone()` ก่อน read
```typescript
const res = await fetch(url);
const clone = res.clone();
return clone.json();
```

### Problem: "Invalid JWT"
**Solution**: ตรวจสอบว่า JWT ref ตรงกับ Supabase URL
```bash
# URL: https://cezwqajbkjhvumbhpsgy.supabase.co
# JWT ref ต้องเป็น: cezwqajbkjhvumbhpsgy
```

### Problem: RLS blocking queries
**Solution**: 
1. ตรวจสอบ auth status
2. ตรวจสอบ policy conditions
3. ใช้ `supabase.auth.getUser()` verify

## ✅ Security Checklist

- [ ] ไฟล์ `.env` ไม่ถูก commit
- [ ] ไม่มี hardcoded keys ในโค้ด
- [ ] CSP header ถูกตั้งค่าแล้ว
- [ ] RLS เปิดใช้งานทุกตาราง
- [ ] Service Role Key ไม่ถูกใช้ใน frontend
- [ ] Allowed origins ถูกตั้งค่าใน Supabase
- [ ] Environment variables ถูกตั้งค่าบน hosting platform
- [ ] Build ผ่าน type-check
- [ ] ไม่มี console.log ที่ sensitive ใน production

## 📚 Additional Resources

- [Supabase Security Best Practices](https://supabase.com/docs/guides/auth/row-level-security)
- [CSP Guidelines](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)

---

**Document Version**: 1.0  
**Last Updated**: October 29, 2025  
**App Version**: 2.2.1
