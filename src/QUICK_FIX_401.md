# ⚡ Quick Fix: 401 JWT Error

**Error**: `API Error (401): {"code":401,"message":"Invalid JWT"}`

---

## 🚀 วิธีแก้ไข (30 วินาที)

### 1️⃣ ตรวจสอบไฟล์ `.env`

```bash
cat .env
```

**ต้องมีบรรทัดนี้**:
```
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNlendxYWpia2podnVtYmhwc2d5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1Nzc1OTIsImV4cCI6MjA3NzE1MzU5Mn0.nr4IZv_hoaTH9rvSUtNrMi_wL37_fUnNdXZ1ft8-gRE
```

---

### 2️⃣ ถ้าไม่มีไฟล์ `.env` → สร้างใหม่

```bash
cp .env.example .env
```

---

### 3️⃣ RESTART Dev Server

```bash
# กด Ctrl+C เพื่อหยุด
# แล้วรันใหม่:
npm run dev
```

---

### 4️⃣ Refresh Browser

```
กด F5 หรือ Cmd+R
```

---

## ✅ ตรวจสอบว่าแก้สำเร็จ

เปิด Browser Console ดู:

**ก่อนแก้ไข ❌**:
```
❌ API Error (401): Invalid JWT
```

**หลังแก้ไข ✅**:
```
✅ Profile loaded successfully
⚡ CACHE HIT: /profile in <1ms
```

---

## 🔍 ยังไม่หาย?

### ลอง Hard Reload:

1. เปิด DevTools (F12)
2. Right-click Refresh
3. "Empty Cache and Hard Reload"

---

### หรือลบ Vite Cache:

```bash
rm -rf node_modules/.vite
npm run dev
```

---

## 📚 อ่านเพิ่มเติม

- [FIX_401_JWT_ERROR.md](./FIX_401_JWT_ERROR.md) - คู่มือครบถ้วน
- [ENVIRONMENT_SETUP.md](./ENVIRONMENT_SETUP.md) - Environment setup
- [RESTART_DEV_SERVER.md](./RESTART_DEV_SERVER.md) - วิธี restart

---

**⏱️ เวลาที่ใช้**: ~30 วินาที  
**วันที่**: 29 ตุลาคม 2025
