# 📦 Export EZBOQ to Local Machine

**วิธีนำโปรเจคจาก Figma Make ไปยังเครื่องของคุณ**

---

## 🎯 Overview

ตอนนี้โปรเจค EZBOQ อยู่ใน **Figma Make Environment** (cloud-based)  
คุณต้อง **download/export** ไปยังเครื่องของคุณเพื่อ:
- Deploy to Vercel/Netlify
- Run locally
- Push to GitHub
- Edit with your IDE

---

## 📋 วิธีที่ 1: Export ZIP File (แนะนำ - ง่ายที่สุด)

### Step 1: Export Project

ใน Figma Make interface:

1. มองหา **"Export"** หรือ **"Download"** button
2. เลือก **"Download as ZIP"**
3. ไฟล์จะ download เป็น `ezboq.zip`

---

### Step 2: Extract ZIP

**Windows:**
```
1. คลิกขวาที่ ezboq.zip
2. เลือก "Extract All..."
3. เลือกโฟลเดอร์ เช่น C:\Users\YourName\Documents\ezboq
4. คลิก Extract
```

**Mac:**
```
1. Double-click ezboq.zip
2. Finder จะ extract อัตโนมัติ
3. ย้ายโฟลเดอร์ไปที่ ~/Documents/ezboq
```

---

### Step 3: Open in Terminal

**Windows (Command Prompt):**
```cmd
cd C:\Users\YourName\Documents\ezboq
```

**Mac/Linux (Terminal):**
```bash
cd ~/Documents/ezboq
```

---

### Step 4: ตรวจสอบไฟล์

```bash
# ดูไฟล์ทั้งหมด
ls
# หรือ (Windows)
dir

# ควรเห็นไฟล์เหล่านี้:
# - package.json
# - index.html
# - App.tsx
# - README.md
# - DEPLOY_NOW.md
# - และอื่นๆ
```

✅ **พร้อมแล้ว! ไปขั้นตอน Deploy!**

---

## 📋 วิธีที่ 2: Copy-Paste Files Manually

ถ้าไม่มี Export button ให้ทำแบบนี้:

### Step 1: สร้างโฟลเดอร์ใหม่

```bash
# Mac/Linux
mkdir -p ~/Documents/ezboq
cd ~/Documents/ezboq

# Windows
mkdir C:\Users\YourName\Documents\ezboq
cd C:\Users\YourName\Documents\ezboq
```

---

### Step 2: สร้าง package.json

สร้างไฟล์ `package.json`:

```json
{
  "name": "ezboq",
  "version": "1.0.0",
  "description": "EZBOQ - ระบบถอดวัสดุก่อสร้างครบวงจร",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "@supabase/supabase-js": "^2.39.3",
    "jspdf": "^2.5.1",
    "html2canvas": "^1.4.1",
    "lucide-react": "^0.263.1",
    "date-fns": "^2.30.0",
    "recharts": "^2.10.3",
    "react-hook-form": "^7.55.0",
    "@hookform/resolvers": "^3.3.4",
    "zod": "^3.22.4",
    "sonner": "^2.0.3"
  },
  "devDependencies": {
    "@types/react": "^18.3.1",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.2.1",
    "typescript": "^5.3.3",
    "vite": "^5.1.0",
    "tailwindcss": "^4.0.0",
    "autoprefixer": "^10.4.17",
    "postcss": "^8.4.33"
  }
}
```

---

### Step 3: สร้าง vite.config.ts

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      './components': './components',
      './pages': './pages',
      './utils': './utils',
      './types': './types',
      './data': './data',
      './styles': './styles'
    }
  }
})
```

---

### Step 4: สร้าง tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["**/*.ts", "**/*.tsx"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

---

### Step 5: สร้าง tsconfig.node.json

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
```

---

### Step 6: Copy ไฟล์ทั้งหมด

จาก Figma Make, copy เนื้อหาไฟล์เหล่านี้:

**Required Files:**
- `index.html`
- `App.tsx`
- `AppWithAuth.tsx`
- `AppWorkflow.tsx`
- `/components/**/*.tsx`
- `/pages/**/*.tsx`
- `/utils/**/*.ts`
- `/types/**/*.ts`
- `/data/**/*.ts`
- `/styles/globals.css`
- `/public/sitemap.xml`
- `/public/robots.txt`

**Documentation (optional):**
- `README.md`
- `DEPLOY_NOW.md`
- `QUICK_START.md`
- etc.

---

## 🚀 หลัง Export เสร็จ - ทำอะไรต่อ?

### Step 1: Install Dependencies

```bash
cd ~/Documents/ezboq  # หรือ path ที่คุณ extract

# Install packages
npm install
```

**รอ 2-5 นาที** (ขึ้นกับความเร็ว internet)

---

### Step 2: ทดสอบ Run Local

```bash
npm run dev
```

**ควรเห็น:**
```
VITE v5.1.0  ready in 500 ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

เปิดเบราว์เซอร์: `http://localhost:5173/`

✅ **เว็บขึ้น = Success!**

---

### Step 3: ตรวจสอบ Build

```bash
npm run build
```

**ถ้า build สำเร็จ:**
```
✓ built in 10s
dist/index.html                  0.5 kB
dist/assets/index-*.js           500 kB
```

✅ **Ready to deploy!**

---

## 📂 โครงสร้างโฟลเดอร์ที่ควรได้

```
~/Documents/ezboq/
├── node_modules/           (หลัง npm install)
├── dist/                   (หลัง npm run build)
├── public/
│   ├── robots.txt
│   └── sitemap.xml
├── components/
│   ├── ui/
│   ├── figma/
│   └── *.tsx
├── pages/
│   └── *.tsx
├── utils/
│   ├── supabase/
│   └── *.ts
├── supabase/
│   └── functions/
├── styles/
│   └── globals.css
├── types/
│   └── boq.ts
├── data/
│   └── catalog.ts
├── index.html
├── App.tsx
├── package.json
├── vite.config.ts
├── tsconfig.json
└── README.md
```

---

## 🎯 Next: Deploy!

หลังจาก export และ test local แล้ว:

1. **อ่าน:** `DEPLOY_NOW.md`
2. **Follow:** 5 steps
3. **Deploy:** ไปยัง Vercel
4. **Live:** https://ezboq.com

---

## 🐛 Troubleshooting

### Problem: npm install ล้ม

**Error:** `npm ERR! code ENOTFOUND`

**Fix:**
```bash
# ตรวจสอบ internet connection
ping google.com

# ลองใช้ registry อื่น
npm config set registry https://registry.npmjs.org/

# ลองใหม่
npm install
```

---

### Problem: npm run dev ไม่ขึ้น

**Error:** `Error: Cannot find module 'vite'`

**Fix:**
```bash
# ลบแล้วติดตั้งใหม่
rm -rf node_modules package-lock.json
npm install
npm run dev
```

---

### Problem: TypeScript errors

**Error:** `Cannot find module './components/...'`

**Fix:**
ตรวจสอบ import paths ใน `.tsx` files:
```typescript
// ✅ Correct
import { Button } from './components/ui/button'

// ❌ Wrong
import { Button } from 'components/ui/button'
```

---

### Problem: Supabase connection failed (local)

**Error:** `Failed to fetch`

**Fix:**

เพิ่มไฟล์ `.env.local`:
```bash
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
```

**Note:** ใช้ `VITE_` prefix สำหรับ Vite environment variables

---

## 💡 Quick Reference

### Essential Commands

```bash
# Navigate to project
cd ~/Documents/ezboq

# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Git commands
git status
git add .
git commit -m "message"
git push
```

---

### Project Paths

**Mac/Linux:**
```bash
~/Documents/ezboq
~/Desktop/ezboq
~/Projects/ezboq
```

**Windows:**
```cmd
C:\Users\YourName\Documents\ezboq
C:\Users\YourName\Desktop\ezboq
C:\Projects\ezboq
```

---

## ✅ Checklist

### After Export

- [ ] โฟลเดอร์ถูก extract แล้ว
- [ ] `package.json` มีอยู่
- [ ] ไฟล์ทั้งหมด copy ครบ
- [ ] `npm install` สำเร็จ
- [ ] `npm run dev` ทำงาน
- [ ] `npm run build` สำเร็จ

### Ready to Deploy

- [ ] Local test ผ่าน
- [ ] No TypeScript errors
- [ ] No console errors
- [ ] All features working
- [ ] Read `DEPLOY_NOW.md`

---

## 📞 Need Help?

ถ้ามีปัญหาตอน export/setup:

1. ตรวจสอบ Node.js version:
   ```bash
   node -v  # ควรเป็น v18+
   npm -v   # ควรเป็น v9+
   ```

2. ถ้ายังไม่มี Node.js:
   - Download: https://nodejs.org/
   - เลือก LTS version
   - Install แล้ว restart terminal

3. ตรวจสอบ Git:
   ```bash
   git --version  # ควรเป็น 2.x+
   ```

4. ถ้ายังไม่มี Git:
   - Download: https://git-scm.com/
   - Install แล้ว restart terminal

---

## 🎉 สรุป

**3 Steps หลัก:**

1. **Export** โปรเจคจาก Figma Make → เครื่องของคุณ
2. **Test** locally: `npm install` → `npm run dev`
3. **Deploy** ตาม `DEPLOY_NOW.md`

**Total Time:** ~1 hour

**Result:** EZBOQ.COM live! 🚀

---

**Created by:** Figma Make AI  
**Date:** 28 ตุลาคม 2568  
**Status:** Ready to Export!

---

Made with ❤️ for Thai Construction Industry 🇹🇭
