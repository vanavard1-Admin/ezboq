# 🚨 Troubleshooting: "Failed to Fetch" Error

## ปัญหา

```
❌ Network Error for /profile/...: {
  "message": "Failed to fetch",
  "name": "TypeError"
}
```

## สาเหตุที่เป็นไปได้

### 1. ⛔ CORS Blocking (มักเจอที่สุด)
Server ไม่อนุญาตให้ origin นี้เรียก API

**วิธีตรวจสอบ:**
- เปิด Browser Console
- ดูว่ามี error ข้อความ "blocked by CORS policy" หรือไม่

**วิธีแก้:**
1. เปิด Supabase Dashboard
2. ไป Edge Functions → make-server-6e95bca3 → Logs
3. ดูว่ามีข้อความ "CORS" หรือไม่
4. ตรวจสอบ `middleware.ts` ว่ามี origin ที่ต้องการหรือไม่

### 2. 🔴 Edge Function ไม่ได้ Deploy
Function ยังไม่ได้ deploy หรือ deploy ผิดพลาด

**วิธีตรวจสอบ:**
1. เปิด Supabase Dashboard
2. ไป Edge Functions
3. หา function ชื่อ "make-server-6e95bca3"
4. ดูว่า Status เป็น "Active" หรือไม่

**วิธีแก้:**
```bash
# Deploy function ใหม่
cd supabase/functions/server
supabase functions deploy make-server-6e95bca3
```

### 3. 💥 Edge Function Crashed
Function มี error ตอน startup หรือตอน runtime

**วิธีตรวจสอบ:**
1. เปิด Supabase Dashboard → Edge Functions → Logs
2. ดู error messages สีแดง
3. ดูว่ามี "TypeError", "ReferenceError" หรือไม่

**วิธีแก้:**
- แก้ไข error ตาม log
- Deploy ใหม่

### 4. 🌐 Network Connectivity
ปัญหาอินเทอร์เน็ต หรือ firewall blocking

**วิธีตรวจสอบ:**
```bash
# Test connectivity
curl -I https://cezwqajbkjhvumbhpsgy.supabase.co/functions/v1/make-server-6e95bca3/health
```

**Expected Output:**
```
HTTP/2 200
content-type: application/json
```

### 5. ⚙️ Invalid Configuration
Project ID หรือ anon key ผิด

**วิธีตรวจสอบ:**
- เปิด `/utils/supabase/info.tsx`
- ตรวจสอบ `projectId` และ `publicAnonKey`
- ตรวจสอบว่า match กับ Supabase Dashboard

---

## 🔧 วิธีแก้ไขขั้นตอนที่ 1: ใช้ API Diagnostics Tool

เปิด Browser Console แล้วรัน:

```javascript
apiTest.runDiagnostics()
```

Tool จะทดสอบ:
- ✅ Configuration
- ✅ Health endpoint
- ✅ Version endpoint
- ✅ CORS preflight
- ✅ Authenticated endpoint

**ผลลัพธ์:**
```
🔬 Starting API Diagnostics...
============================================================

📋 Configuration Check
  Project ID: cezwqajbkjhvumbhpsgy
  API Base: https://cezwqajbkjhvumbhpsgy.supabase.co/functions/v1/...
  Anon Key length: 203 chars
  Origin: https://www.figma.com

🏥 Testing Health Endpoint (no auth required)...
  ✅ Health endpoint: 200 OK
  Response: { status: "ok" }

📦 Testing Version Endpoint (no auth required)...
  ✅ Version endpoint: 200 OK
  Response: { version: "2.0.0", ... }

🔀 Testing CORS Preflight (OPTIONS)...
  ✅ OPTIONS request: 204 No Content
  CORS Headers:
    Allow-Origin: *
    Allow-Methods: GET,POST,PUT,DELETE,OPTIONS
    Allow-Headers: Content-Type,Authorization,Idempotency-Key,...

🔐 Testing Authenticated Endpoint (GET /customers)...
  ✅ Customers endpoint: 200 OK
  Response: { customers: [...] }

============================================================
📊 Diagnostic Summary

✅ All tests passed! Your API is working correctly.
```

---

## 🔧 วิธีแก้ไขขั้นตอนที่ 2: ตรวจสอบ Supabase Logs

### เปิด Logs

1. Supabase Dashboard
2. Edge Functions → make-server-6e95bca3
3. Click "Logs"

### ดู Log Messages

**✅ ถ้าเห็นแบบนี้ = ปกติ:**
```
[req-xxx] → GET /customers
[req-xxx] 🔓 CORS: Dev mode - allowing origin: https://www.figma.com
[req-xxx] ← 200 GET /customers (45ms)
```

**❌ ถ้าเห็นแบบนี้ = มีปัญหา:**
```
TypeError: Hono is not defined
    at index.tsx:25:12
```

```
Response with null body status cannot have body
    at initializeAResponse
```

```
❌ Invalid Content-Type: text/plain
```

---

## 🔧 วิธีแก้ไขขั้นตอนที่ 3: Test ด้วย curl

### Test Health Endpoint

```bash
curl https://cezwqajbkjhvumbhpsgy.supabase.co/functions/v1/make-server-6e95bca3/health
```

**Expected:**
```json
{"status":"ok"}
```

### Test CORS Preflight

```bash
curl -X OPTIONS \
  -H "Origin: https://www.figma.com" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: Content-Type,Authorization" \
  -I \
  https://cezwqajbkjhvumbhpsgy.supabase.co/functions/v1/make-server-6e95bca3/customers
```

**Expected:**
```
HTTP/2 204
access-control-allow-origin: *
access-control-allow-methods: GET,POST,PUT,DELETE,OPTIONS
```

### Test Authenticated Endpoint

```bash
curl -X GET \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "apikey: YOUR_ANON_KEY" \
  https://cezwqajbkjhvumbhpsgy.supabase.co/functions/v1/make-server-6e95bca3/customers
```

**Expected:**
```json
{"customers":[...]}
```

---

## 🔧 วิธีแก้ไขขั้นตอนที่ 4: แก้ไข Code

### แก้ CORS Issue

**ไฟล์:** `/supabase/functions/server/middleware.ts`

```typescript
// บรรทัด 20-27
const ALLOWED_ORIGINS = new Set([
  "https://ezboq.com",
  "https://www.ezboq.com",
  "http://localhost:5173",
  "https://www.figma.com",  // ✅ เพิ่มถ้ายังไม่มี
]);
```

### แก้ Import Issue

**ไฟล์:** `/supabase/functions/server/index.tsx`

```typescript
// บรรทัด 1
import { Hono } from "npm:hono@4.10.3";  // ✅ ต้องมี
```

### แก้ 204 Response Issue

**ไฟล์:** `/supabase/functions/server/middleware.ts`

```typescript
// บรรทัด 72-84
if (method === 'OPTIONS') {
  return new Response(null, {  // ✅ ใช้ null ไม่ใช่ ''
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': allowedOrigin || '*',
      // ...
    },
  });
}
```

---

## 🔧 วิธีแก้ไขขั้นตอนที่ 5: Deploy ใหม่

```bash
# 1. ตรวจสอบว่าแก้ไขแล้ว
git status
git diff

# 2. Deploy Edge Function
supabase functions deploy make-server-6e95bca3

# 3. รอประมาณ 10 วินาที

# 4. Test ใหม่
curl https://YOUR_PROJECT.supabase.co/functions/v1/make-server-6e95bca3/health
```

---

## ✅ Checklist

ก่อน deploy ตรวจสอบ:

- [ ] ✅ ไฟล์ `index.tsx` มี `import { Hono }` ที่ด้านบน
- [ ] ✅ ไฟล์ `middleware.ts` ใช้ `new Response(null, { status: 204 })`
- [ ] ✅ ALLOWED_ORIGINS มี origin ที่ต้องการ
- [ ] ✅ Environment variables ครบ (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
- [ ] ✅ Test local ผ่าน `apiTest.runDiagnostics()`

หลัง deploy ตรวจสอบ:

- [ ] ✅ Health endpoint ตอบกลับ 200 OK
- [ ] ✅ CORS preflight ตอบกลับ 204 No Content
- [ ] ✅ Authenticated endpoint ทำงานได้
- [ ] ✅ Logs ไม่มี error สีแดง

---

## 📚 เอกสารเพิ่มเติม

- **ERROR_FIX_SUMMARY.md** - สรุปการแก้ไข 204 response error
- **DEBUG_API.md** - คู่มือ debug API แบบละเอียด
- **DEPLOYMENT_GUIDE.md** - วิธี deploy Edge Functions

---

## 💡 Tips

### ใช้ Browser Console

```javascript
// Test quick
apiTest.quickTest()  // Returns true/false

// Test specific endpoint
apiTest.testEndpoint('/customers')
apiTest.testEndpoint('/profile/demo-123')
```

### Enable Verbose Logging

```typescript
// In index.tsx
const DEBUG_LOG = true;  // Force enable
```

### Monitor Real-time Logs

Supabase Dashboard → Edge Functions → Logs → Enable "Auto-refresh"

---

## 🆘 ยังแก้ไม่ได้?

1. **ดู Logs อีกครั้ง** - มักมีคำตอบในนั้น
2. **Test ด้วย curl** - ช่วยแยกปัญหา browser vs server
3. **Check Supabase Status** - ไป https://status.supabase.com
4. **ลอง Deploy ใหม่** - บางครั้งแค่ redeploy ก็แก้ได้
5. **Check Network Tab** - ดู request/response headers

---

**Last Updated:** 2025-10-28  
**Status:** ✅ Solutions Documented
