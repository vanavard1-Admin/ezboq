# 🚨 START HERE: แก้ 404 Error

**เวลา**: 16:35  
**สถานะ**: ⚠️ **ต้อง RESTART SERVER!**

---

## ⚡ Quick Fix (30 วินาที)

### 1️⃣ STOP Server

```bash
# กดใน Terminal ที่รัน server
Ctrl + C
```

---

### 2️⃣ START Server

```bash
npm run dev
```

**รอจนเห็น:**
```
Server started on port 54321
✓ ready in XXXms
```

---

### 3️⃣ Test

```bash
curl http://localhost:54321/functions/v1/make-server-6e95bca3/profile/test
```

**ถ้าเห็น `"membership"` และ `"plan": "free"`** → **✅ สำเร็จ!**

**ถ้ายัง 404** → อ่านต่อด้านล่าง ⬇️

---

## 🎯 สิ่งที่เพิ่งแก้

### เพิ่ม 3 Endpoints ใหม่:

1. ✅ **GET /profile/:userId** - ดึงข้อมูล + สร้าง Free Plan อัตโนมัติ
2. ✅ **PUT /profile/:userId** - บันทึกข้อมูล
3. ✅ **GET /team/members/:userId** - ดึงสมาชิกทีม

**แต่!** Server ยังโหลด code เก่า → **ต้อง restart!**

---

## 🔍 ทดสอบว่าสำเร็จหรือไม่

### วิธีที่ 1: ใช้ Test File (แนะนำ!)

```
http://localhost:5173/test-profile-endpoint.html
```

**กด**: "🚀 Test All Endpoints"

**ผลลัพธ์ที่ต้องการ:**
```
✅ Test 1: Health Check - SUCCESS
✅ Test 2: Get Profile - SUCCESS
✅ Test 3: Update Profile - SUCCESS
✅ Test 4: Team Members - SUCCESS
```

---

### วิธีที่ 2: เปิด Profile Page

```
http://localhost:5173/profile
```

**ผลลัพธ์ที่ต้องการ:**
- ✅ Page โหลดได้ (ไม่มี 404)
- ✅ เห็น badge "Free Plan"
- ✅ Console ไม่มี error

---

### วิธีที่ 3: ใช้ curl

```bash
# Test profile endpoint
curl http://localhost:54321/functions/v1/make-server-6e95bca3/profile/test-123

# ต้องได้:
# {"profile":null,"membership":{"plan":"free",...}}

# ไม่ใช่:
# 404 Not Found
```

---

## 🎁 Free Plan Auto-Creation

**ทุกคน** ได้ Free Plan อัตโนมัติ!

```json
{
  "plan": "free",
  "features": {
    "maxProjects": 10,       // ← 10 โครงการ
    "maxTeamMembers": 1,     // ← 1 คน
    "maxStorageGB": 1,       // ← 1 GB
    "pdfExport": true,       // ← Export PDF ได้!
    "advancedReports": false,
    "prioritySupport": false
  }
}
```

**ไม่ต้องทำอะไร** - สร้างอัตโนมัติเมื่อเข้า Profile ครั้งแรก!

---

## 🐛 ถ้ายัง 404 อยู่

### Check 1: Server Start แล้วหรือยัง?

```bash
# ต้องเห็น message นี้:
Server started on port 54321
✓ ready in XXXms
```

**ถ้าไม่เห็น** → Server ยังไม่ทำงาน!

---

### Check 2: Port ถูกต้องหรือไม่?

```bash
# Default: 54321
# เช็คว่าใช้ port อะไร

# Test health:
curl http://localhost:54321/functions/v1/make-server-6e95bca3/health

# ต้องได้: {"status":"ok"}
```

---

### Check 3: Process ค้างหรือไม่?

```bash
# Mac/Linux:
lsof -ti:54321 | xargs kill -9

# Windows:
netstat -ano | findstr :54321
taskkill /PID <PID> /F

# จากนั้น start ใหม่
npm run dev
```

---

## 📚 เอกสารเพิ่มเติม

อ่านละเอียดเพิ่มที่:

- **`/FIX_404_FINAL_SUMMARY.md`** - สรุปครบถ้วน
- **`/RESTART_SERVER_NOW.md`** - คำสั่ง restart
- **`/404_FIX_CHECKLIST.md`** - Checklist ทั้งหมด
- **`/PROFILE_ENDPOINTS_ADDED.md`** - Endpoint details

---

## ✅ Checklist

- [x] Code เพิ่มเสร็จแล้ว ✅
- [ ] Server restarted
- [ ] Test passed
- [ ] 404 หายแล้ว
- [ ] Free Plan ถูกสร้าง
- [ ] Profile page โหลดได้

**ขาดแค่**: RESTART SERVER! 🔥

---

## 🚀 ทำเลย!

```bash
# 1. STOP
Ctrl + C

# 2. START
npm run dev

# 3. TEST
curl http://localhost:54321/functions/v1/make-server-6e95bca3/profile/test

# 4. ✅ DONE!
```

---

**เวลาทั้งหมด**: 30 วินาที  
**ความยาก**: ⭐ ง่ายมาก  
**ผลลัพธ์**: ✅ ไม่มี 404 อีกต่อไป!

---

**RESTART NOW!** 🔥
