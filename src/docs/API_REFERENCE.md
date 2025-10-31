# API Reference

## Overview

BOQ Application ใช้ Hono web server running on Supabase Edge Functions พร้อม cache-first strategy

**Base URL**: `https://${projectId}.supabase.co/functions/v1/make-server-6e95bca3`

**Authorization**: `Bearer ${publicAnonKey}` (หรือ access_token สำหรับ authenticated requests)

## Cache Strategy

### GET Requests
- **Cache-First**: ตรวจสอบ cache ก่อน, fallback to database
- **Cache Duration**: 
  - Profile, Customers, Partners: 5 นาที
  - Dashboard, Analytics: 30 วินาที
  - Documents: 2 นาที
- **Cache Isolation**: แยกตาม userId อัตโนมัติ

### POST/PUT/DELETE Requests
- **Idempotency**: รองรับ idempotency key อัตโนมัติ
- **Cache Invalidation**: ลบ cache ที่เกี่ยวข้องทันที

## Endpoints

### Profile

#### GET /profile
ดึงข้อมูล profile ของ user ปัจจุบัน

**Response**:
```json
{
  "id": "uuid",
  "userId": "uuid",
  "companyName": "string",
  "companyAddress": "string",
  "taxId": "string",
  "phone": "string",
  "email": "string",
  "logo": "string (base64)",
  "signature": "string (base64)",
  "bankInfo": {
    "bankName": "string",
    "accountNumber": "string",
    "accountName": "string"
  },
  "qrCode": "string (base64)",
  "defaultMargin": 15,
  "defaultDiscount": 0,
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

#### PUT /profile
อัพเดท profile

**Request Body**: Same as GET response

**Idempotency**: Auto-generated

### Customers

#### GET /customers
ดึงรายการลูกค้าทั้งหมด

**Response**:
```json
[
  {
    "id": "uuid",
    "userId": "uuid",
    "name": "string",
    "companyName": "string",
    "taxId": "string",
    "address": "string",
    "phone": "string",
    "email": "string",
    "createdAt": "timestamp"
  }
]
```

#### POST /customers
สร้างลูกค้าใหม่

**Request Body**:
```json
{
  "name": "string",
  "companyName": "string",
  "taxId": "string",
  "address": "string",
  "phone": "string",
  "email": "string"
}
```

#### PUT /customers/:id
อัพเดทข้อมูลลูกค้า

#### DELETE /customers/:id
ลบลูกค้า

### Partners

#### GET /partners
ดึงรายการพาร์ทเนอร์ทั้งหมด

**Response**:
```json
[
  {
    "id": "uuid",
    "userId": "uuid",
    "name": "string",
    "companyName": "string",
    "commissionRate": 10,
    "phone": "string",
    "email": "string",
    "createdAt": "timestamp"
  }
]
```

#### POST /partners
สร้างพาร์ทเนอร์ใหม่

#### PUT /partners/:id
อัพเดทพาร์ทเนอร์

#### DELETE /partners/:id
ลบพาร์ทเนอร์

### Documents

#### GET /documents
ดึงรายการ documents ทั้งหมด

**Query Parameters**:
- `type`: 'boq' | 'quotation' | 'invoice' | 'receipt'
- `limit`: number (default: 100)
- `offset`: number (default: 0)

**Response**:
```json
[
  {
    "id": "uuid",
    "userId": "uuid",
    "type": "string",
    "number": "string",
    "customerId": "uuid",
    "projectName": "string",
    "projectAddress": "string",
    "items": [...],
    "subtotal": 100000,
    "discount": 5000,
    "vat": 6650,
    "total": 101650,
    "status": "draft" | "sent" | "approved" | "paid",
    "createdAt": "timestamp",
    "updatedAt": "timestamp"
  }
]
```

#### POST /documents
สร้าง document ใหม่

**Request Body**: Same as GET response (without id, timestamps)

#### PUT /documents/:id
อัพเดท document

#### DELETE /documents/:id
ลบ document

### Analytics

#### GET /analytics/dashboard
ดึงข้อมูล dashboard

**Response**:
```json
{
  "totalRevenue": 1000000,
  "totalDocuments": 150,
  "totalCustomers": 45,
  "revenueByMonth": [...],
  "documentsByType": {...},
  "topCustomers": [...]
}
```

#### GET /analytics/reports
ดึงรายงานเปรียบเทียบ

**Query Parameters**:
- `startDate`: ISO date string
- `endDate`: ISO date string
- `groupBy`: 'month' | 'week' | 'day'

### Templates

#### GET /templates
ดึง BOQ templates

**Response**:
```json
[
  {
    "id": "string",
    "name": "string",
    "category": "string",
    "items": [...],
    "estimatedTotal": 100000
  }
]
```

### SmartBOQ

#### POST /smartboq/generate
สร้าง BOQ จาก project type

**Request Body**:
```json
{
  "projectType": "house" | "townhouse" | "commercial" | ...,
  "area": 150,
  "floors": 2,
  "specifications": {...}
}
```

**Response**:
```json
{
  "items": [...],
  "estimatedTotal": 1500000,
  "recommendations": [...]
}
```

## Error Responses

### 400 Bad Request
```json
{
  "error": "Validation error",
  "details": "..."
}
```

### 401 Unauthorized
```json
{
  "error": "Unauthorized",
  "message": "Invalid or expired token"
}
```

### 404 Not Found
```json
{
  "error": "Not found",
  "resource": "customer",
  "id": "uuid"
}
```

### 409 Conflict (Idempotency)
```json
{
  "error": "Duplicate request",
  "message": "Request already processed",
  "originalResponse": {...}
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error",
  "message": "...",
  "requestId": "uuid"
}
```

## Rate Limiting

- **Default**: 100 requests/minute per user
- **Burst**: 20 requests/second

## Best Practices

### 1. Use Idempotency
```typescript
await api.post('/documents', data, {
  idempotent: true // Auto-generates idempotency key
});
```

### 2. Handle Cache
```typescript
// Force refresh
await api.get('/profile', { cache: 'reload' });

// Use cache only
await api.get('/customers', { cache: 'force-cache' });
```

### 3. Error Handling
```typescript
try {
  const data = await api.get('/documents');
} catch (error) {
  if (error.status === 401) {
    // Redirect to login
  } else if (error.status === 404) {
    // Show not found message
  } else {
    // Log error and show generic message
  }
}
```

### 4. Batch Requests
```typescript
// Use Promise.all for independent requests
const [profile, customers, partners] = await Promise.all([
  api.get('/profile'),
  api.get('/customers'),
  api.get('/partners')
]);
```

### 5. Cache Invalidation
```typescript
// After update, invalidate related cache
await api.put('/profile', data);
// Cache auto-invalidated for /profile
```

## Performance Tips

1. **Enable Cache**: ใช้ default cache strategy (cache-first)
2. **Batch Requests**: รวม requests ที่ไม่ depend กัน
3. **Pagination**: ใช้ limit/offset สำหรับ list endpoints
4. **Selective Fields**: (TODO) รองรับ field selection ในอนาคต
5. **Compression**: Response ถูก compress ด้วย gzip อัตโนมัติ

