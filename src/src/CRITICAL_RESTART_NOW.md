# 🚨 CRITICAL: RESTART SERVER NOW!

## ⚠️ ปัญหา: 404 Error

```
❌ API Error (404): 404 Not Found
```

## ✅ Solution: ทุกอย่างเสร็จแล้ว - แค่ต้อง RESTART!

### ✅ เช็คแล้ว:

1. ✅ **Endpoints มีครบ** ใน `/supabase/functions/server/index.tsx`
   - GET `/make-server-6e95bca3/profile/:userId` (line 2663)
   - PUT `/make-server-6e95bca3/profile/:userId` (line 2751)
   - GET `/make-server-6e95bca3/team/members/:userId` (line 2803)

2. ✅ **ProfilePage เรียกถูก** (`/pages/ProfilePage.tsx`)
   - `api.get('/profile/${userId}')` ← ถูกต้อง

3. ✅ **API utils ถูกต้อง** (`/utils/api.ts`)
   - Auto-prefix `/make-server-6e95bca3`

**ปัญหาคือ:** Server ยังโหลด code เก่าที่ไม่มี endpoints!

---

## 🔥 แก้ไขทันที (30 วินาที)

### 1. หา Terminal ที่รัน Server

ดูที่ VS Code หรือ Command Line ที่คุณรัน `npm run dev`

---

### 2. STOP Server

กด:
```
Ctrl + C
```

(Mac: `Cmd + C` หรือ `Ctrl + C`)

---

### 3. START Server

```bash
npm run dev
```

**รอจนเห็น:**
```
Server started on port 54321
✓ ready in XXXms
```

---

### 4. Test

```bash
# Test health first
curl http://localhost:54321/functions/v1/make-server-6e95bca3/health

# Should get: {"status":"ok"}

# Test profile endpoint
curl http://localhost:54321/functions/v1/make-server-6e95bca3/profile/test-user

# Should get: {"profile":null,"membership":{"plan":"free",...}}
```

หรือเปิด:
```
http://localhost:5173/test-profile-endpoint.html
```

กด "🚀 Test All Endpoints"

---

## 💡 ทำไมต้อง Restart?

```typescript
// Server Memory BEFORE Restart ❌:
{
  '/health': ✅ Loaded
  '/documents': ✅ Loaded
  '/profile/:userId': ❌ NOT LOADED → 404!
  '/team/members/:userId': ❌ NOT LOADED → 404!
}

// Server Memory AFTER Restart ✅:
{
  '/health': ✅ Loaded
  '/documents': ✅ Loaded
  '/profile/:userId': ✅ LOADED → 200 OK!
  '/team/members/:userId': ✅ LOADED → 200 OK!
}
```

Server เป็น **long-running process** ที่ต้อง restart เพื่อโหลด code ใหม่!

---

## ✅ Expected Results

### After Restart:

**1. Test File:**
```
✅ Test 1: Health Check - SUCCESS
✅ Test 2: Get Profile - SUCCESS (Free Plan created!)
✅ Test 3: Update Profile - SUCCESS
✅ Test 4: Team Members - SUCCESS
```

**2. Profile Page:**
- ✅ Page loads (no 404)
- ✅ Badge shows "Free Plan"
- ✅ Form is editable
- ✅ Save button works

**3. Console Logs:**
```javascript
✅ Profile loaded successfully
✅ Created default Free Plan for user: abc123
✅ Membership: { plan: 'free', status: 'active', ... }
```

**4. No 404 Errors!**

---

## 🐛 If Still 404 After Restart

### Check 1: Server Actually Started?

```bash
# In terminal, you MUST see:
Server started on port 54321
✓ ready in XXXms
```

If not, check for errors in terminal.

---

### Check 2: Test Health Endpoint

```bash
curl http://localhost:54321/functions/v1/make-server-6e95bca3/health
```

**Should get:** `{"status":"ok"}`

**If connection refused:** Server not running!

---

### Check 3: Correct Port?

Default is `54321`. If you changed it, update test URLs.

---

### Check 4: Process Stuck?

```bash
# Kill stuck process (Mac/Linux)
lsof -ti:54321 | xargs kill -9

# Kill stuck process (Windows)
netstat -ano | findstr :54321
taskkill /PID <PID> /F

# Then start again
npm run dev
```

---

## 🎯 Quick Commands

```bash
# 1. STOP
Ctrl + C

# 2. START  
npm run dev

# 3. WAIT
# "Server started on port 54321"

# 4. TEST
curl http://localhost:54321/functions/v1/make-server-6e95bca3/profile/test

# 5. VERIFY
# Should NOT be 404!
# Should have "membership" object!
```

---

## 📊 Verification Steps

### ✅ Success Indicators:

1. Server terminal shows "Server started"
2. Health endpoint returns `{"status":"ok"}`
3. Profile endpoint returns `{"membership":{...}}`
4. Test file shows all ✅ GREEN
5. Profile page loads without errors
6. Console has no 404 errors

**All OK?** → **FIXED!** 🎉

---

## 🚀 DO IT NOW!

**Time Required**: 30 seconds  
**Difficulty**: ⭐ Very Easy  
**Impact**: 🔥 Fixes 404!

---

**STATUS**: ⚠️ **WAITING FOR RESTART**  
**ACTION**: 🔥 **RESTART NOW!**

---

## 📁 Files to Verify After Restart

### Test Files:
- `/test-profile-endpoint.html` ← Open this first!

### Code Files (Already Fixed):
- ✅ `/supabase/functions/server/index.tsx` (lines 2660-2855)
- ✅ `/pages/ProfilePage.tsx` (lines 260-269)
- ✅ `/utils/api.ts` (working correctly)

---

## 🎁 What You'll Get

### Free Plan Auto-Creation:

When user first visits Profile page:
```json
{
  "plan": "free",
  "status": "active",
  "features": {
    "maxProjects": 10,
    "maxTeamMembers": 1,
    "maxStorageGB": 1,
    "pdfExport": true
  }
}
```

**Automatic!** No setup required!

---

**RESTART SERVER NOW TO FIX 404!** 🚨
