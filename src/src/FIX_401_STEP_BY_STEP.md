# 🔧 แก้ 401 Error - 3 ขั้นตอน

## Error ที่เจอ:
```
❌ API Error (401): {"code":401,"message":"Invalid JWT"}
❌ Network Error for /partners
```

---

## ✅ วิธีแก้ (3 ขั้นตอน)

### Step 1: ตรวจสอบไฟล์ `.env`

```bash
cat .env
```

**ต้องมีเนื้อหานี้:**
```
VITE_SUPABASE_URL=https://cezwqajbkjhvumbhpsgy.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNlendxYWpia2podnVtYmhwc2d5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1Nzc1OTIsImV4cCI6MjA3NzE1MzU5Mn0.nr4IZv_hoaTH9rvSUtNrMi_wL37_fUnNdXZ1ft8-gRE
```

✅ ผมสร้างไฟล์ให้คุณแล้ว!

---

### Step 2: RESTART Dev Server

```bash
# ⚠️ ต้องหยุดก่อน!
# กด Ctrl+C (Windows/Linux) หรือ Cmd+C (Mac)

# แล้วรันใหม่:
npm run dev
```

**⏱️ รอ dev server start (5-10 วินาที)**

---

### Step 3: Refresh Browser

```bash
# กด F5
# หรือ Cmd+R (Mac)
```

---

## ✅ ตรวจสอบว่าแก้สำเร็จ

เปิด Browser Console (F12):

**ก่อนแก้ไข ❌:**
```
❌ API Error (401): Invalid JWT
❌ Network Error for /partners
```

**หลังแก้ไข ✅:**
```
✅ Profile loaded successfully
✅ ⚡ CACHE HIT: /partners in <1ms
✅ No errors!
```

---

## 🔄 ถ้ายังไม่หาย?

### ลอง Hard Reload:

1. เปิด DevTools (F12)
2. Right-click Refresh button  
3. "Empty Cache and Hard Reload"

---

### หรือลบ Vite Cache:

```bash
# หยุด dev server (Ctrl+C)
rm -rf node_modules/.vite
npm run dev
```

---

## 📚 อ่านเพิ่มเติม

- [URGENT_RESTART_NOW.md](./URGENT_RESTART_NOW.md) - คำแนะนำเร่งด่วน
- [CHECK_IF_FIXED.md](./CHECK_IF_FIXED.md) - วิธีตรวจสอบ
- [FIX_401_JWT_ERROR.md](./FIX_401_JWT_ERROR.md) - คู่มือครบถ้วน

---

**⏱️ เวลาทั้งหมด**: 30 วินาที  
**ความยาก**: ⭐ ง่ายมาก  
**วันที่**: 29 ตุลาคม 2025
