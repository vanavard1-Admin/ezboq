# 🔐 API Security Best Practices Guide

## คู่มือสำหรับนักพัฒนา EZBOQ

---

## 📋 Table of Contents

1. [Input Validation](#input-validation)
2. [Rate Limiting](#rate-limiting)
3. [Idempotency](#idempotency)
4. [Document Number Schema](#document-number-schema)
5. [Error Handling](#error-handling)
6. [Security Headers](#security-headers)

---

## 1️⃣ Input Validation

### ✅ DO: Validate ทุก input ก่อนบันทึก

```typescript
import { validate, schemas } from '../utils/validation';

// Example: Validate customer data
const validation = validate(schemas.customer, rawData);

if (!validation.success) {
  return c.json({ 
    error: "Invalid customer data", 
    details: validation.errors 
  }, { status: 400 });
}

// ใช้ validated data
const customer = validation.data;
```

### ✅ DO: Sanitize string เพื่อป้องกัน XSS

```typescript
import { sanitizeObject } from '../utils/validation';

// Sanitize ทุก field ที่เป็น string
const safeData = sanitizeObject(rawData);
```

### ❌ DON'T: เชื่อถือ client-side data

```typescript
// ❌ ไม่ดี - ไม่มี validation
app.post('/customers', async (c) => {
  const customer = await c.req.json();
  await kv.set(`customer:${customer.id}`, customer); // Dangerous!
});

// ✅ ดี - มี validation
app.post('/customers', async (c) => {
  const rawData = await c.req.json();
  const validation = validate(schemas.customer, rawData);
  
  if (!validation.success) {
    return c.json({ error: "Invalid data" }, { status: 400 });
  }
  
  const customer = sanitizeObject(validation.data);
  await kv.set(`customer:${customer.id}`, customer);
});
```

---

## 2️⃣ Rate Limiting

### Current Limits
- **100 requests per minute** per IP address
- Health endpoints (`/livez`, `/readyz`, `/version`) **ไม่ถูก rate limit**

### Response Headers

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1706444460
```

### Handling Rate Limit Errors (Client-side)

```typescript
async function apiCallWithRetry(url: string, options: RequestInit) {
  const response = await fetch(url, options);
  
  if (response.status === 429) {
    const retryAfter = response.headers.get('Retry-After') || '60';
    console.warn(`Rate limited. Retry after ${retryAfter}s`);
    
    // แสดง toast แจ้งผู้ใช้
    toast.error(`คำขอมากเกินไป กรุณารอ ${retryAfter} วินาที`);
    
    // หรือ auto-retry
    await new Promise(resolve => setTimeout(resolve, parseInt(retryAfter) * 1000));
    return fetch(url, options);
  }
  
  return response;
}
```

### Testing Rate Limits

```bash
# ทดสอบว่าเกิน limit หรือไม่
for i in {1..105}; do
  curl -s -o /dev/null -w "%{http_code}\n" \
    https://YOUR_PROJECT.supabase.co/functions/v1/make-server-6e95bca3/customers \
    -H "Authorization: Bearer $ANON_KEY"
done
```

---

## 3️⃣ Idempotency

### การใช้งาน Idempotency Key

**Client-side** (ใน `/utils/api.ts`):

```typescript
import { api, generateIdempotencyKey } from './utils/api';

// วิธีที่ 1: Manual idempotency key
const idempotencyKey = generateIdempotencyKey('create-customer');
await api.post('/customers', customerData, idempotencyKey);

// วิธีที่ 2: Auto-generate idempotency key
await api.createWithIdempotency('/customers', customerData, 'create-customer');
```

**Server-side** (ใน `/supabase/functions/server/index.tsx`):

```typescript
// Wrap endpoint ด้วย handleIdempotency
app.post("/make-server-6e95bca3/documents", async (c) => {
  return await handleIdempotency(c, async () => {
    // Your logic here
    const document = await c.req.json();
    // ...
    return c.json({ success: true, document });
  });
});
```

### ตัวอย่างการป้องกัน Double-Click

```typescript
// ใน Component
const [isSaving, setIsSaving] = useState(false);
const idempotencyKeyRef = useRef<string | null>(null);

const handleSave = async () => {
  if (isSaving) return; // ป้องกัน double-click
  
  setIsSaving(true);
  
  try {
    // Generate idempotency key once
    if (!idempotencyKeyRef.current) {
      idempotencyKeyRef.current = generateIdempotencyKey('save-document');
    }
    
    await api.post('/documents', documentData, idempotencyKeyRef.current);
    toast.success('บันทึกสำเร็จ!');
  } finally {
    setIsSaving(false);
  }
};
```

---

## 4️⃣ Document Number Schema

### Format

```
{PREFIX}-{YYYY}-{MM}-{####}
```

**ตัวอย่าง**:
- `BOQ-2025-01-0001` - BOQ เดือนมกราคม 2025 ฉบับที่ 1
- `INV-2025-01-0042` - Invoice เดือนมกราคม 2025 ฉบับที่ 42
- `QT-2025-02-0123` - Quotation เดือนกุมภาพันธ์ 2025 ฉบับที่ 123

### Prefixes

| Document Type | Prefix |
|--------------|--------|
| BOQ          | `BOQ`  |
| Quotation    | `QT`   |
| Invoice      | `INV`  |
| Receipt      | `RCP`  |

### Auto-generation

```typescript
// Server จะ auto-generate หาก documentNumber ไม่มีหรือเป็น 'DOC-...'
const document = {
  id: 'doc-001',
  type: 'invoice',
  // documentNumber ไม่ต้องใส่ - server จะ generate ให้
};

// Server response:
{
  "document": {
    "id": "doc-001",
    "documentNumber": "INV-2025-01-0005"
  }
}
```

### Counter Reset

- Counter **reset เป็น 0001** ทุกต้นเดือน
- แต่ละ **document type** มี counter แยกกัน
- แต่ละ **demo session** มี counter แยกกัน

---

## 5️⃣ Error Handling

### Standard Error Response Format

```json
{
  "error": "Error message",
  "details": [
    {
      "path": "field.name",
      "message": "Detailed error message"
    }
  ]
}
```

### HTTP Status Codes

| Code | Meaning | Use Case |
|------|---------|----------|
| `200` | OK | Successful request |
| `400` | Bad Request | Invalid input (validation failed) |
| `401` | Unauthorized | Missing/invalid auth token |
| `403` | Forbidden | User doesn't have permission |
| `404` | Not Found | Resource not found |
| `429` | Too Many Requests | Rate limit exceeded |
| `500` | Internal Server Error | Server-side error |
| `503` | Service Unavailable | Service not ready (health check fail) |

### Example: Proper Error Handling

```typescript
// Client-side
try {
  const response = await api.post('/customers', customerData);
  
  if (!response.ok) {
    const error = await response.json();
    
    if (response.status === 400) {
      // Validation error
      toast.error('ข้อมูลไม่ถูกต้อง', {
        description: error.details?.map(d => d.message).join(', ')
      });
    } else if (response.status === 429) {
      // Rate limit
      toast.error('คำขอมากเกินไป กรุณารอสักครู่');
    } else {
      // Other errors
      toast.error('เกิดข้อผิดพลาด', {
        description: error.error
      });
    }
    
    return;
  }
  
  const data = await response.json();
  toast.success('บันทึกสำเร็จ!');
} catch (err) {
  console.error('Network error:', err);
  toast.error('ไม่สามารถเชื่อมต่อ server ได้');
}
```

---

## 6️⃣ Security Headers

### CORS Headers (Auto-configured)

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Headers: Content-Type, Authorization, X-Demo-Session-Id, Idempotency-Key
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
```

### Rate Limit Headers

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1706444460
```

### Security Best Practices

1. **HTTPS Only** - ไม่อนุญาตให้ใช้ HTTP
2. **Authorization Header** - ใส่ `Bearer ${token}` ในทุก request
3. **Content-Type** - ใช้ `application/json` สำหรับ POST/PUT
4. **X-Demo-Session-Id** - แยก demo session ไม่ให้ปนกัน
5. **Idempotency-Key** - ป้องกัน duplicate operations

---

## 📝 Validation Schemas Reference

### Available Schemas

```typescript
import { schemas } from '../utils/validation';

schemas.customer       // Customer validation
schemas.partner        // Partner validation
schemas.document       // Document validation
schemas.taxRecord      // Tax record validation
schemas.boqItem        // BOQ item validation
schemas.profile        // Profile validation
schemas.companyInfo    // Company info validation
schemas.discount       // Discount validation
schemas.membership     // Membership validation
```

### Custom Validation

```typescript
import { z } from 'npm:zod@3.23.8';
import { validate } from '../utils/validation';

// Define custom schema
const customSchema = z.object({
  name: z.string().min(1).max(100),
  amount: z.number().min(0),
  tags: z.array(z.string()).optional(),
});

// Validate
const validation = validate(customSchema, rawData);

if (!validation.success) {
  console.error('Validation errors:', validation.errors);
}
```

---

## 🚨 Common Security Issues & Solutions

### Issue #1: XSS (Cross-Site Scripting)

**Problem**:
```typescript
// User input: <script>alert('XSS')</script>
const customer = { name: userInput };
```

**Solution**:
```typescript
import { sanitizeObject } from '../utils/validation';

const customer = sanitizeObject({ name: userInput });
// Result: { name: "<script>alert('XSS')</script>" }
```

---

### Issue #2: SQL Injection

**Problem**: ใช้ KV store แทน SQL → ไม่มี SQL injection risk ✅

**หมายเหตุ**: หากย้ายไป Postgres ต้องใช้ parameterized queries:

```typescript
// ✅ ดี - Parameterized
const { data } = await supabase
  .from('customers')
  .select('*')
  .eq('id', customerId);

// ❌ ไม่ดี - String concatenation
const query = `SELECT * FROM customers WHERE id = '${customerId}'`;
```

---

### Issue #3: Mass Assignment

**Problem**:
```typescript
// User sends: { id: "1", name: "Test", isAdmin: true }
const customer = await c.req.json();
await kv.set(`customer:${customer.id}`, customer); // Dangerous!
```

**Solution**:
```typescript
// Use schema validation
const validation = validate(schemas.customer, rawData);
// Schema จะ strip out ค่าที่ไม่ได้ define ไว้

const customer = validation.data; // isAdmin field removed
```

---

### Issue #4: CSRF (Cross-Site Request Forgery)

**Current Status**: ⚠️ ไม่มี CSRF protection

**Solution**: เพิ่ม CSRF token (future enhancement)

```typescript
// Temporary workaround: ใช้ Idempotency-Key + Origin check
const origin = c.req.header('Origin');
if (origin && !allowedOrigins.includes(origin)) {
  return c.json({ error: 'Invalid origin' }, { status: 403 });
}
```

---

## 📊 Monitoring & Logging

### ตรวจสอบ Security Events

```bash
# ดู rate limit events
grep "Rate limit exceeded" /var/log/server.log

# ดู validation errors
grep "Validation failed" /var/log/server.log

# ดู authentication failures
grep "Unauthorized" /var/log/server.log
```

### Recommended Alerts

1. **Rate Limit Alert**: หาก IP ใดโดน rate limit > 10 ครั้ง/วัน
2. **Validation Error Alert**: หาก validation fail rate > 5%
3. **Error Rate Alert**: หาก 5xx errors > 1%

---

## ✅ Security Checklist

### Before Production

- [ ] ✅ Input validation enabled (Zod)
- [ ] ✅ Rate limiting enabled (100 req/min)
- [ ] ✅ Idempotency support enabled
- [ ] ✅ XSS protection enabled (sanitization)
- [ ] ✅ CORS properly configured
- [ ] ✅ HTTPS enforced
- [ ] ⏳ RLS enabled (see SECURITY_RLS_GUIDE.md)
- [ ] ⏳ Authentication required for sensitive endpoints
- [ ] ⏳ Audit logging enabled
- [ ] ⏳ Backup & recovery tested

### Testing

- [ ] Run `/TEST_SECURITY.md` tests
- [ ] Run `/TEST_P1_FEATURES.md` tests
- [ ] Penetration testing completed
- [ ] Load testing passed

---

## 🔗 Related Guides

- [SECURITY_RLS_GUIDE.md](./SECURITY_RLS_GUIDE.md) - RLS Setup
- [TEST_SECURITY.md](./TEST_SECURITY.md) - Security Testing
- [TEST_P1_FEATURES.md](./TEST_P1_FEATURES.md) - P1 Features Testing

---

## 📞 Support

หากพบช่องโหว่ด้านความปลอดภัย:
1. **อย่า** เปิดเผยใน public issue
2. ส่ง email ไปที่: security@ezboq.com
3. ติดต่อ development team โดยตรง

---

**Created by**: EZBOQ Development Team  
**Last Updated**: 28 January 2025  
**Version**: 1.1.0  
**Security Level**: P1 Compliant ✅
