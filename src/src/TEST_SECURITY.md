# 🧪 Security & Health Testing Guide

## ทดสอบ Backend Security Features

### ข้อกำหนดก่อนทดสอบ
1. Deploy server ไปที่ Supabase แล้ว
2. มี `SUPABASE_URL` และ `SUPABASE_ANON_KEY`
3. ติดตั้ง `curl` หรือ `httpie` หรือใช้ Postman

---

## 1️⃣ ทดสอบ Health Endpoints

### 1.1 Liveness Probe (ตรวจสอบว่า service ทำงาน)
```bash
curl https://YOUR_PROJECT_ID.supabase.co/functions/v1/make-server-6e95bca3/livez
```

**ผลลัพธ์ที่คาดหวัง**: 
```
ok
```

**Status Code**: `200 OK`

---

### 1.2 Readiness Probe (ตรวจสอบว่า service พร้อมรับ traffic)
```bash
curl https://YOUR_PROJECT_ID.supabase.co/functions/v1/make-server-6e95bca3/readyz
```

**ผลลัพธ์ที่คาดหวัง**: 
```
ok
```

**Status Code**: `200 OK`

**หากเกิดปัญหา database**:
```
not ready
```
**Status Code**: `503 Service Unavailable`

---

### 1.3 Version Endpoint (ข้อมูล build และ features)
```bash
curl https://YOUR_PROJECT_ID.supabase.co/functions/v1/make-server-6e95bca3/version
```

**ผลลัพธ์ที่คาดหวัง**:
```json
{
  "version": "1.0.0",
  "buildDate": "2025-01-28",
  "environment": "production",
  "features": [
    "decimal-js-calculations",
    "idempotency-support",
    "partner-management",
    "tax-records",
    "analytics"
  ]
}
```

---

## 2️⃣ ทดสอบ Idempotency Protection

### 2.1 สร้าง Document โดยไม่มี Idempotency Key (ควรสร้างได้ซ้ำ)

```bash
# Request ครั้งที่ 1
curl -X POST \
  https://YOUR_PROJECT_ID.supabase.co/functions/v1/make-server-6e95bca3/documents \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "doc-test-001",
    "type": "quotation",
    "projectTitle": "Test Project",
    "status": "draft"
  }'

# Request ครั้งที่ 2 (ข้อมูลเดียวกัน แต่ไม่มี idempotency key)
curl -X POST \
  https://YOUR_PROJECT_ID.supabase.co/functions/v1/make-server-6e95bca3/documents \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "doc-test-002",
    "type": "quotation",
    "projectTitle": "Test Project",
    "status": "draft"
  }'
```

**ผลลัพธ์ที่คาดหวัง**: 
- ทั้ง 2 requests จะสร้าง document ที่แยกกัน (doc-test-001 และ doc-test-002)
- ไม่มี error

---

### 2.2 สร้าง Document ด้วย Idempotency Key (ครั้งที่ 2 ควร return cached response)

```bash
# ตั้งค่า Idempotency Key
IDEMPOTENCY_KEY="create-doc-$(date +%s)-test"

# Request ครั้งที่ 1
curl -X POST \
  https://YOUR_PROJECT_ID.supabase.co/functions/v1/make-server-6e95bca3/documents \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: ${IDEMPOTENCY_KEY}" \
  -d '{
    "id": "doc-idempotent-001",
    "type": "invoice",
    "projectTitle": "Idempotent Test Project",
    "status": "draft"
  }'

# Request ครั้งที่ 2 (idempotency key เดียวกัน)
curl -X POST \
  https://YOUR_PROJECT_ID.supabase.co/functions/v1/make-server-6e95bca3/documents \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: ${IDEMPOTENCY_KEY}" \
  -d '{
    "id": "doc-idempotent-002",
    "type": "invoice",
    "projectTitle": "Different Project",
    "status": "published"
  }'
```

**ผลลัพธ์ที่คาดหวัง**:
- Request ครั้งที่ 1: สร้าง document ID `doc-idempotent-001` สำเร็จ
- Request ครั้งที่ 2: **ไม่สร้าง** `doc-idempotent-002` แต่ return ผลลัพธ์เดิม (doc-idempotent-001)
- ทั้ง 2 requests return response เหมือนกัน 100%

**ตรวจสอบใน logs**:
```
🔁 Idempotency: Returning cached response for key: create-doc-xxx-test
```

---

### 2.3 ทดสอบ Idempotency กับ Customer Creation

```bash
IDEMPOTENCY_KEY="create-customer-$(date +%s)"

# Request ครั้งที่ 1
curl -X POST \
  https://YOUR_PROJECT_ID.supabase.co/functions/v1/make-server-6e95bca3/customers \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: ${IDEMPOTENCY_KEY}" \
  -d '{
    "id": "cust-001",
    "name": "บริษัท ทดสอบ จำกัด",
    "taxId": "1234567890123",
    "phone": "02-123-4567"
  }'

# Request ครั้งที่ 2 (double-click simulation)
curl -X POST \
  https://YOUR_PROJECT_ID.supabase.co/functions/v1/make-server-6e95bca3/customers \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: ${IDEMPOTENCY_KEY}" \
  -d '{
    "id": "cust-002",
    "name": "บริษัท อื่น จำกัด",
    "taxId": "9999999999999",
    "phone": "02-999-9999"
  }'
```

**ผลลัพธ์ที่คาดหวัง**:
- มี customer เดียวคือ `cust-001`
- **ไม่มี** `cust-002`

---

### 2.4 ทดสอบ Idempotency Expiry (24 ชั่วโมง)

```bash
# Request ครั้งที่ 1
IDEMPOTENCY_KEY="expire-test-$(date +%s)"

curl -X POST \
  https://YOUR_PROJECT_ID.supabase.co/functions/v1/make-server-6e95bca3/documents \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: ${IDEMPOTENCY_KEY}" \
  -d '{
    "id": "doc-expire-001",
    "type": "boq",
    "projectTitle": "Expiry Test",
    "status": "draft"
  }'

# รอ 24 ชั่วโมง หรือ manually ลบ key จาก KV store
# kv.del(`idempotency:${IDEMPOTENCY_KEY}`)

# Request ครั้งที่ 2 (หลังจาก 24 ชั่วโมง)
curl -X POST \
  https://YOUR_PROJECT_ID.supabase.co/functions/v1/make-server-6e95bca3/documents \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: ${IDEMPOTENCY_KEY}" \
  -d '{
    "id": "doc-expire-002",
    "type": "boq",
    "projectTitle": "Expiry Test 2",
    "status": "draft"
  }'
```

**ผลลัพธ์ที่คาดหวัง**:
- หลัง 24 ชั่วโมง: สร้าง `doc-expire-002` ได้ (idempotency key หมดอายุแล้ว)

---

## 3️⃣ ทดสอบ Rate Limiting (หากมี)

### 3.1 ส่ง request ติดต่อกันหลาย ๆ ครั้ง

```bash
# ส่ง 150 requests ภายใน 1 นาที
for i in {1..150}; do
  curl -X GET \
    https://YOUR_PROJECT_ID.supabase.co/functions/v1/make-server-6e95bca3/documents \
    -H "Authorization: Bearer YOUR_ANON_KEY" &
done
```

**ผลลัพธ์ที่คาดหวัง** (หาก rate limiting เปิด):
- Request 1-100: `200 OK`
- Request 101-150: `429 Too Many Requests`

**หากยังไม่มี rate limiting**:
- ทุก request ได้ `200 OK`
- ⚠️ **แนะนำให้เพิ่ม rate limiting ด่วน!**

---

## 4️⃣ ทดสอบ CORS

### 4.1 ทดสอบจาก browser (เปิด DevTools → Console)

```javascript
fetch('https://YOUR_PROJECT_ID.supabase.co/functions/v1/make-server-6e95bca3/version', {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
  }
})
.then(r => r.json())
.then(data => console.log('✅ CORS works:', data))
.catch(err => console.error('❌ CORS error:', err));
```

**ผลลัพธ์ที่คาดหวัง**:
```
✅ CORS works: {version: "1.0.0", ...}
```

**หากเกิด CORS error**:
```
❌ CORS error: Failed to fetch
Access to fetch at '...' from origin '...' has been blocked by CORS policy
```

---

## 5️⃣ ทดสอบ Demo Session Isolation

### 5.1 สร้าง customer ใน demo session 1

```bash
curl -X POST \
  https://YOUR_PROJECT_ID.supabase.co/functions/v1/make-server-6e95bca3/customers \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "X-Demo-Session-Id: demo-session-001" \
  -d '{
    "id": "cust-demo-1",
    "name": "ลูกค้า Demo Session 1"
  }'
```

### 5.2 เรียกดู customer จาก demo session 2

```bash
curl -X GET \
  https://YOUR_PROJECT_ID.supabase.co/functions/v1/make-server-6e95bca3/customers \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "X-Demo-Session-Id: demo-session-002"
```

**ผลลัพธ์ที่คาดหวัง**:
```json
{
  "customers": []
}
```
(ไม่เห็น `cust-demo-1` เพราะอยู่คนละ session)

### 5.3 เรียกดู customer จาก demo session 1 (ควรเห็น)

```bash
curl -X GET \
  https://YOUR_PROJECT_ID.supabase.co/functions/v1/make-server-6e95bca3/customers \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "X-Demo-Session-Id: demo-session-001"
```

**ผลลัพธ์ที่คาดหวัง**:
```json
{
  "customers": [
    {
      "id": "cust-demo-1",
      "name": "ลูกค้า Demo Session 1"
    }
  ]
}
```

---

## 6️⃣ Load Testing (Optional)

### ใช้ Apache Bench (ab)

```bash
# ติดตั้ง Apache Bench
sudo apt-get install apache2-utils  # Ubuntu/Debian
brew install ab                      # macOS

# ทดสอบ 1000 requests, 10 concurrent
ab -n 1000 -c 10 \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  https://YOUR_PROJECT_ID.supabase.co/functions/v1/make-server-6e95bca3/livez
```

**ผลลัพธ์ที่ควรได้**:
- Requests per second: > 100 req/s
- Failed requests: 0
- 95th percentile: < 100ms

---

## 7️⃣ Security Penetration Testing

### 7.1 ทดสอบ SQL Injection (ควร fail ถ้าใช้ KV store)

```bash
curl -X GET \
  "https://YOUR_PROJECT_ID.supabase.co/functions/v1/make-server-6e95bca3/customers?id=1' OR '1'='1" \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

**ผลลัพธ์ที่คาดหวัง**:
- **ควร return error หรือ empty**
- **ไม่ควร** return ข้อมูลทั้งหมด

### 7.2 ทดสอบ XSS (Cross-Site Scripting)

```bash
curl -X POST \
  https://YOUR_PROJECT_ID.supabase.co/functions/v1/make-server-6e95bca3/customers \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "cust-xss",
    "name": "<script>alert(\"XSS\")</script>",
    "address": "<img src=x onerror=alert(1)>"
  }'
```

**ผลลัพธ์ที่คาดหวัง**:
- ข้อมูลถูก **sanitized** หรือ **escaped**
- เมื่อ fetch กลับมา ควรได้ plain text ไม่ใช่ executable script

---

## 8️⃣ Monitoring & Alerts Setup

### 8.1 ตั้งค่า Uptime Monitor (Vercel, UptimeRobot, Pingdom)

**Example: UptimeRobot**
1. Monitor Type: `HTTP(s)`
2. URL: `https://YOUR_PROJECT_ID.supabase.co/functions/v1/make-server-6e95bca3/livez`
3. Interval: `5 minutes`
4. Alert Contacts: Email/SMS

**Expected Response**:
- Status: `200 OK`
- Content: `ok`

### 8.2 ตั้งค่า Error Rate Alert

**ใช้ Supabase Logs Dashboard**:
1. ไป Supabase Dashboard → Logs → Edge Functions
2. Filter: `status >= 500` (Server errors)
3. ตั้ง Alert: หาก error rate > 5% ใน 5 นาที → ส่ง email

---

## ✅ Checklist ก่อน Production

- [ ] Health endpoints (`/livez`, `/readyz`, `/version`) ทำงานถูกต้อง
- [ ] Idempotency protection ทำงานถูกต้อง (ทดสอบ double-click)
- [ ] CORS ตั้งค่าถูกต้อง (เฉพาะ domain ที่อนุญาต)
- [ ] Demo session isolation ทำงานถูกต้อง
- [ ] Rate limiting เปิดใช้งาน (แนะนำ 100 req/min/IP)
- [ ] ไม่มี SQL injection vulnerability
- [ ] ไม่มี XSS vulnerability
- [ ] Uptime monitoring ตั้งค่าแล้ว
- [ ] Error rate alerts ตั้งค่าแล้ว
- [ ] Backup ทดสอบแล้ว (สามารถ restore ได้)
- [ ] HTTPS บังคับ (ไม่อนุญาต HTTP)

---

## 📚 เอกสารเพิ่มเติม

- [SECURITY_RLS_GUIDE.md](./SECURITY_RLS_GUIDE.md) - Row Level Security Setup
- [Supabase Edge Functions Docs](https://supabase.com/docs/guides/functions)
- [Hono.js Middleware](https://hono.dev/docs/guides/middleware)

---

**Created by**: EZBOQ Development Team  
**Last Updated**: 28 January 2025  
**Version**: 1.0.0
