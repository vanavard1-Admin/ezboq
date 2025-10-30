# 📖 Validation Schema Reference

## Quick Reference for EZBOQ Validation Rules

**Version**: 1.1.1  
**Last Updated**: 28 January 2025

---

## 📍 Location

All validation schemas: `/supabase/functions/server/validation.ts`

---

## 🔑 Key Principles

1. **Server-side Only**: Validation only happens on Edge Functions
2. **Flexible Content**: Accept real-world data formats
3. **Strict Format**: Enforce data types and lengths
4. **Security First**: XSS protection via sanitization
5. **User-friendly**: Optional fields where possible

---

## 📋 Common Schemas

### ID Schema

```typescript
z.string().min(1).max(100).regex(/^[a-zA-Z0-9_-]+$/)
```

**Valid**: `"doc-123"`, `"customer_001"`, `"boq-2025-01"`  
**Invalid**: `""`, `"doc 123"` (space), `"doc@123"` (special char)

---

### Name Schema

```typescript
z.string().min(1).max(200).trim()
```

**Valid**: `"John Doe"`, `"บริษัท ABC จำกัด"`  
**Invalid**: `""` (empty)

---

### Email Schema

```typescript
z.string().email().max(200)
```

**Valid**: `"user@example.com"`  
**Invalid**: `"not-an-email"`, `"user@"`

---

### Phone Schema

```typescript
z.string().max(50).optional()
```

**Valid**: `"02-123-4567"`, `"081-234-5678"`, `undefined`  
**Invalid**: (very long strings > 50 chars)

---

### Amount Schema

```typescript
z.number().min(0).max(1000000000)
```

**Valid**: `0`, `1000.50`, `999999999`  
**Invalid**: `-100` (negative), `1e10` (too large)

---

## 📦 Entity Schemas

### BOQ Item

```typescript
{
  id: string,                    // Required
  description: string,           // ✅ Optional (can be empty)
  quantity: number,              // Required, >= 0
  unit: string,                  // ✅ Optional
  material: number,              // ✅ Default: 0
  labor: number,                 // ✅ Default: 0
  category: string,              // Optional
}
```

**Example**:
```json
{
  "id": "item-001",
  "quantity": 10,
  "material": 150,
  "labor": 50
}
```

**Notes**:
- `description` can be empty (filled later)
- `unit`, `material`, `labor` auto-fill if missing

---

### Customer

```typescript
{
  id: string,                    // Required, alphanumeric + dash/underscore
  name: string,                  // Required, 1-200 chars
  taxId: string,                 // Optional
  address: string,               // Optional
  phone: string,                 // Optional
  email: string,                 // Optional, must be valid email
  contactPerson: string,         // Optional
  createdAt: number,             // Optional (auto-generated)
  updatedAt: number,             // Optional (auto-generated)
}
```

**Example**:
```json
{
  "id": "cust-001",
  "name": "บริษัท ABC จำกัด",
  "taxId": "0123456789012",
  "phone": "02-123-4567",
  "email": "contact@abc.com"
}
```

---

### Partner

```typescript
{
  id: string,                    // Required
  name: string,                  // Required
  companyName: string,           // Optional
  taxId: string,                 // Optional
  address: string,               // Optional
  phone: string,                 // Optional
  email: string,                 // Optional
  contactPerson: string,         // Optional
  totalProjects: number,         // Default: 0
  totalRevenue: number,          // Default: 0
  createdAt: number,             // Optional
  updatedAt: number,             // Optional
}
```

---

### Document

```typescript
{
  id: string,                    // Required
  documentNumber: string,        // Optional (auto-generated)
  type: enum,                    // Required: 'boq' | 'quotation' | 'invoice' | 'receipt'
  status: enum,                  // Required: 'draft' | 'approved' | 'completed' | 'cancelled'
  projectTitle: string,          // Required, 1-500 chars
  projectDescription: string,    // Optional
  projectLocation: string,       // Optional
  customerId: string,            // Optional
  customerName: string,          // Optional
  partnerId: string,             // Optional
  partnerName: string,           // Optional
  recipientType: enum,           // Optional: 'customer' | 'partner'
  totalAmount: number,           // Optional
  issueDate: string,             // Optional
  dueDate: string,               // Optional
  boqItems: array,               // Optional
  profile: object,               // Optional
  company: object,               // Optional
  customer: object,              // Optional
  partner: object,               // ✅ Optional + Nullable
  discount: object,              // ✅ Optional + Nullable
  notes: string,                 // Optional
  paymentConditions: string,     // Optional
  createdAt: number,             // Optional
  updatedAt: number,             // Optional
}
```

**Example**:
```json
{
  "id": "doc-001",
  "type": "boq",
  "status": "draft",
  "projectTitle": "โครงการก่อสร้าง ABC",
  "partner": null,
  "discount": null
}
```

---

### Company Info

```typescript
{
  name: string,                  // Required
  taxId: string,                 // Optional
  address: string,               // Optional
  phone: string,                 // Optional
  email: string,                 // Optional
  website: string,               // ✅ Optional (any format)
  logo: string,                  // Optional
}
```

**Example**:
```json
{
  "name": "บริษัท XYZ จำกัด",
  "taxId": "0123456789012",
  "website": "www.xyz.com",
  "phone": "02-123-4567"
}
```

**Notes**:
- `website` accepts any string (not strict URL validation)
- Can be `"www.example.com"`, `"example.com"`, or `"-"`

---

### Profile

```typescript
{
  wastePct: number,              // Default: 3, range: 0-100
  opexPct: number,               // Default: 5, range: 0-100
  errorPct: number,              // Default: 2, range: 0-100
  markupPct: number,             // Default: 10, range: 0-100
  vatPct: number,                // Default: 7, range: 0-100
}
```

**Example**:
```json
{
  "wastePct": 3,
  "opexPct": 5,
  "errorPct": 2,
  "markupPct": 10,
  "vatPct": 7
}
```

---

### Discount

```typescript
{
  type: enum,                    // Required: 'percent' | 'fixed'
  value: number,                 // Required, 0-100 (percent) or any amount (fixed)
  reason: string,                // Optional
}
```

**Example (Percent)**:
```json
{
  "type": "percent",
  "value": 10,
  "reason": "ส่วนลดลูกค้าประจำ"
}
```

**Example (Fixed)**:
```json
{
  "type": "fixed",
  "value": 5000,
  "reason": "ส่วนลดพิเศษ"
}
```

---

## ⚠️ Common Validation Errors

### 1. Required Field Missing

**Error**:
```json
{
  "path": "name",
  "message": "Required"
}
```

**Solution**: Provide the required field
```json
{
  "name": "Customer Name"
}
```

---

### 2. Invalid Enum Value

**Error**:
```json
{
  "path": "type",
  "message": "Invalid enum value. Expected 'boq' | 'quotation' | 'invoice' | 'receipt', received 'invalid'"
}
```

**Solution**: Use correct enum value
```json
{
  "type": "boq"
}
```

---

### 3. String Too Long

**Error**:
```json
{
  "path": "projectTitle",
  "message": "String must contain at most 500 character(s)"
}
```

**Solution**: Shorten the string
```json
{
  "projectTitle": "Short title..."
}
```

---

### 4. Invalid Email

**Error**:
```json
{
  "path": "email",
  "message": "Invalid email"
}
```

**Solution**: Use valid email format
```json
{
  "email": "user@example.com"
}
```

---

### 5. Negative Amount

**Error**:
```json
{
  "path": "totalAmount",
  "message": "Number must be greater than or equal to 0"
}
```

**Solution**: Use non-negative number
```json
{
  "totalAmount": 1000
}
```

---

### 6. Invalid ID Format

**Error**:
```json
{
  "path": "id",
  "message": "Invalid"
}
```

**Solution**: Use alphanumeric + dash/underscore only
```json
{
  "id": "doc-001"
}
```

---

## 🔧 Debugging Tips

### 1. Check Server Logs

```bash
# View Edge Function logs
supabase functions logs make-server-6e95bca3
```

Look for:
```
❌ Validation failed: [...]
```

---

### 2. Test with curl

```bash
curl -X POST \
  https://YOUR_PROJECT.supabase.co/functions/v1/make-server-6e95bca3/documents \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d @payload.json
```

---

### 3. Inspect Error Response

**Response Structure**:
```json
{
  "error": "Invalid document data",
  "details": [
    {
      "path": "boqItems.0.description",
      "message": "Required"
    }
  ]
}
```

**Interpretation**:
- `path`: Field location (nested: `boqItems.0.description` = first item's description)
- `message`: What's wrong

---

### 4. Common Fixes

| Error | Quick Fix |
|-------|-----------|
| "Required" | Add the field |
| "Invalid email" | Check email format |
| "Invalid enum" | Use correct value from docs |
| "String too long" | Shorten text |
| "Number too large" | Reduce amount |
| "Expected object, received null" | **Fixed in v1.1.1** |

---

## 🛡️ Security Features

### XSS Protection

All strings are sanitized:

**Input**:
```json
{
  "name": "<script>alert('XSS')</script>"
}
```

**Stored**:
```json
{
  "name": "<script>alert(&#x27;XSS&#x27;)</script>"
}
```

**Function**: `sanitizeObject()`

---

### SQL Injection Prevention

- ✅ Using KV store (not SQL)
- ✅ No raw SQL queries
- ✅ Key-value pairs only

---

### Type Safety

- ✅ Zod validation ensures correct types
- ✅ TypeScript types match Zod schemas
- ✅ Runtime validation catches errors

---

## 📚 Resources

- **Zod Documentation**: https://zod.dev/
- **Validation File**: `/supabase/functions/server/validation.ts`
- **Fix Summary**: `/VALIDATION_FIX_SUMMARY.md`
- **API Security**: `/API_SECURITY_GUIDE.md`

---

## 🔄 Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | Jan 2025 | Initial validation |
| 1.1.0 | Jan 28, 2025 | Added strict validation |
| 1.1.1 | Jan 28, 2025 | **Relaxed validation** |

---

**Created by**: EZBOQ Development Team  
**Last Updated**: 28 January 2025  
**Version**: 1.1.1
