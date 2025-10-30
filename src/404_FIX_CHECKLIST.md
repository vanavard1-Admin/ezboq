# ✅ Checklist: แก้ 404 Error

**Status**: ⚠️ **RESTART PENDING**

---

## 📋 Pre-Restart Checklist

### ✅ Code Changes (DONE!)

- [x] เพิ่ม GET /profile/:userId endpoint
- [x] เพิ่ม PUT /profile/:userId endpoint  
- [x] เพิ่ม GET /team/members/:userId endpoint
- [x] เพิ่ม Free Plan auto-creation logic
- [x] เพิ่ม input validation
- [x] เพิ่ม XSS sanitization
- [x] เพิ่ม cache support
- [x] เพิ่ม error handling
- [x] แก้ไข ProfilePage.tsx (user ID fallback)

**Total Lines Added**: ~196 lines

---

## 🔥 Restart Checklist

### Step 1: STOP Server

- [ ] เปิด Terminal ที่รัน dev server
- [ ] กด `Ctrl + C`
- [ ] เห็นข้อความ "Server stopped" หรือ prompt กลับมา
- [ ] ตรวจสอบว่าไม่มี process ค้างอยู่

**If stuck**:
```bash
# Force kill (Mac/Linux)
lsof -ti:54321 | xargs kill -9

# Force kill (Windows)
netstat -ano | findstr :54321
taskkill /PID <PID> /F
```

---

### Step 2: START Server

- [ ] รันคำสั่ง `npm run dev`
- [ ] รอจนเห็น "Server started on port 54321"
- [ ] เห็น "✓ ready in XXXms"
- [ ] ไม่มี error messages

**Expected Output**:
```bash
> npm run dev

Server started on port 54321
✓ ready in 245ms
```

**Common Errors**:
```bash
# Error: Port in use
→ Kill process (see Step 1)

# Error: Command not found  
→ Run: npm install

# Error: Module not found
→ Run: npm install
```

---

## ✅ Test Checklist

### Test 1: Health Endpoint

**Method**: curl or browser

- [ ] รัน: `curl http://localhost:54321/functions/v1/make-server-6e95bca3/health`
- [ ] ได้ response: `{"status":"ok"}`
- [ ] Status code: 200

**If 404**: Server ยังไม่ทำงาน!

---

### Test 2: Profile Endpoint (NEW!)

**Method**: curl or test file

- [ ] รัน: `curl http://localhost:54321/functions/v1/make-server-6e95bca3/profile/test-123`
- [ ] ได้ response มี `membership` object
- [ ] `membership.plan` = "free"
- [ ] Status code: 200
- [ ] **NO 404 ERROR!**

**Expected**:
```json
{
  "profile": null,
  "membership": {
    "plan": "free",
    "status": "active",
    "features": { ... }
  }
}
```

**If 404**: Server ยังไม่ได้ restart!

---

### Test 3: Update Profile Endpoint (NEW!)

**Method**: curl with POST data

- [ ] Test PUT request works
- [ ] ได้ response มี `success: true`
- [ ] Status code: 200
- [ ] **NO 404 ERROR!**

**Test Command**:
```bash
curl -X PUT \
  http://localhost:54321/functions/v1/make-server-6e95bca3/profile/test-123 \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com"}'
```

---

### Test 4: Team Members Endpoint (NEW!)

**Method**: curl or browser

- [ ] รัน: `curl http://localhost:54321/functions/v1/make-server-6e95bca3/team/members/test-123`
- [ ] ได้ response: `{"members":[]}`
- [ ] Status code: 200
- [ ] **NO 404 ERROR!**

---

### Test 5: Test HTML Page

**Method**: Browser

- [ ] เปิด: `http://localhost:5173/test-profile-endpoint.html`
- [ ] กด "🚀 Test All Endpoints"
- [ ] Test 1 (Health): ✅ SUCCESS
- [ ] Test 2 (Profile): ✅ SUCCESS
- [ ] Test 3 (Update): ✅ SUCCESS
- [ ] Test 4 (Team): ✅ SUCCESS
- [ ] **ALL GREEN!**

---

### Test 6: Profile Page

**Method**: Browser

- [ ] เปิด: `http://localhost:5173/profile`
- [ ] Page โหลดได้ (ไม่มี 404)
- [ ] Form แสดงผล
- [ ] เห็น Membership badge "Free Plan"
- [ ] Console ไม่มี 404 errors
- [ ] กรอกข้อมูล + Save ได้

**Console Expected**:
```javascript
✅ Profile loaded successfully
✅ Membership: { plan: 'free', status: 'active', ... }
✅ Profile saved successfully
```

---

## 📊 Server Log Checklist

### During Profile Load:

- [ ] เห็น `[xxx] Profile loaded in XXms`
- [ ] เห็น `[xxx] Created default Free Plan for user: ...` (first time)
- [ ] เห็น `[xxx] ⚡ CACHE HIT` (second time)
- [ ] ไม่มี error messages

---

### During Profile Save:

- [ ] เห็น `[xxx] Profile updated for user: ...`
- [ ] เห็น `✅ Profile updated`
- [ ] ไม่มี validation errors
- [ ] ไม่มี 404 errors

---

## 🐛 Error Checklist

### If Still 404:

- [ ] ✅ Server ได้ restart แล้วจริงๆ?
- [ ] ✅ เห็น "Server started" message?
- [ ] ✅ Health endpoint ทำงาน?
- [ ] ✅ ใช้ port ถูกต้อง? (54321)
- [ ] ✅ ไม่มี typo ใน URL?

---

### If 500 Error:

- [ ] ✅ เช็ค server logs
- [ ] ✅ เช็ค environment variables
- [ ] ✅ เช็ค KV store working
- [ ] ✅ เช็ค syntax errors

---

### If Validation Error:

- [ ] ✅ เช็ค input data format
- [ ] ✅ เช็ค required fields
- [ ] ✅ เช็ค data types
- [ ] ✅ เช็ค console logs

---

## ✅ Success Indicators

### All These Must Be TRUE:

- [x] โค้ดเพิ่มเสร็จแล้ว
- [ ] Server restarted
- [ ] Health endpoint: 200 OK
- [ ] Profile endpoint: 200 OK (ไม่ใช่ 404!)
- [ ] Update endpoint: 200 OK (ไม่ใช่ 404!)
- [ ] Team endpoint: 200 OK (ไม่ใช่ 404!)
- [ ] Test file: ALL GREEN
- [ ] Profile page: LOADS
- [ ] Free Plan: AUTO-CREATED
- [ ] Save: WORKS
- [ ] Console: NO 404 ERRORS

**Missing**: RESTART! 🔥

---

## 🎯 Quick Verification

### 30-Second Test:

```bash
# 1. Restart
Ctrl + C
npm run dev

# 2. Test (wait for server to start)
curl http://localhost:54321/functions/v1/make-server-6e95bca3/profile/test

# 3. Check result
# ✅ Should NOT be 404!
# ✅ Should have "membership" object!
# ✅ Should have "plan": "free"!
```

---

## 📈 Before vs After

### BEFORE (❌):

```
GET /profile/abc123
  → 404 Not Found
  → "Endpoint not found"
  
Profile Page
  → Console: ❌ API Error (404)
  → Page: Loading error
```

---

### AFTER (✅):

```
GET /profile/abc123
  → 200 OK
  → { profile: {...}, membership: {plan: 'free', ...} }
  
Profile Page
  → Console: ✅ Profile loaded successfully
  → Page: Form loads, Free Plan badge visible
```

---

## 🔥 DO NOW!

### Immediate Actions:

1. **[ ] STOP SERVER** (Ctrl+C)
2. **[ ] START SERVER** (npm run dev)
3. **[ ] WAIT** (see "Server started")
4. **[ ] TEST** (curl or test file)
5. **[ ] VERIFY** (no 404!)

**Time Required**: 30-60 seconds  
**Difficulty**: ⭐ Very Easy  
**Impact**: 🔥 CRITICAL

---

## 📚 Documentation

### Read These:

- `/FIX_404_FINAL_SUMMARY.md` - Complete fix summary
- `/RESTART_SERVER_NOW.md` - Restart instructions
- `/PROFILE_ENDPOINTS_ADDED.md` - Endpoint details

### Use These:

- `/test-profile-endpoint.html` - Test utility
- `curl` commands - Quick tests

---

## ✅ Final Checklist

- [x] Code added ✅
- [ ] Server restarted
- [ ] Endpoints working
- [ ] 404 errors gone
- [ ] Free Plan created
- [ ] Profile page loads
- [ ] Everything tested

**ACTION**: 🔥 **RESTART SERVER NOW!**

---

**Current Status**: ⚠️ RESTART PENDING  
**Next Action**: Stop and start server  
**Expected Time**: 30 seconds  
**Expected Result**: NO MORE 404! ✅

---

**GO RESTART NOW!** 🚀
