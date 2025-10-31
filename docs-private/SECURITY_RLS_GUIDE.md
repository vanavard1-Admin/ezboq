# 🔒 Row Level Security (RLS) Setup Guide

## ⚠️ CRITICAL: User Data Isolation

ปัจจุบันระบบ EZBOQ ใช้ **KV Store** (key-value database) ซึ่งไม่มี RLS ในตัว  
**ปัญหา**: ผู้ใช้ที่มี `publicAnonKey` สามารถเรียกดูข้อมูลของผู้ใช้อื่นได้

---

## 🎯 สถานการณ์ปัจจุบัน

### ✅ สิ่งที่ทำแล้ว
1. **Demo Session Isolation** - แยกข้อมูล demo แต่ละ session ด้วย `X-Demo-Session-Id`
2. **Key Prefix Strategy** - ใช้ prefix แยกตามประเภทข้อมูล (`customer:`, `document:`, `partner:`)
3. **Idempotency Protection** - ป้องกัน double-click สร้างข้อมูลซ้ำ

### ❌ สิ่งที่ยังไม่มี
1. **User-based Access Control** - ไม่มีการตรวจสอบว่าผู้ใช้ A เข้าถึงข้อมูลของผู้ใช้ B ได้หรือไม่
2. **Authentication Enforcement** - endpoint บางตัวไม่บังคับให้ login
3. **Authorization Check** - ไม่มีการตรวจสอบสิทธิ์ว่าผู้ใช้มีสิทธิ์ดำเนินการหรือไม่

---

## 🚨 รูปแบบการโจมตี (Attack Vectors)

### 1. Data Enumeration Attack
```bash
# ผู้โจมตีสามารถเรียกดูข้อมูลลูกค้าทั้งหมดได้
curl -H "Authorization: Bearer ${ANON_KEY}" \
  https://xxx.supabase.co/functions/v1/make-server-6e95bca3/customers
```

**ผลกระทบ**: เห็นข้อมูลลูกค้าของผู้ใช้อื่น (ชื่อ, ที่อยู่, เบอร์โทร, เลขประจำตัวผู้เสียภาษี)

### 2. Document Access Attack
```bash
# ผู้โจมตีสามารถดูใบเสนอราคา/ใบวางบิลของผู้ใช้อื่นได้
curl -H "Authorization: Bearer ${ANON_KEY}" \
  https://xxx.supabase.co/functions/v1/make-server-6e95bca3/documents
```

**ผลกระทบ**: เห็นราคาเสนอ, กำไร, ข้อมูลทางการเงินของธุรกิจคู่แข่ง

### 3. Tax Record Leak
```bash
# ผู้โจมตีสามารถดูข้อมูลภาษีของผู้ใช้อื่นได้
curl -H "Authorization: Bearer ${ANON_KEY}" \
  https://xxx.supabase.co/functions/v1/make-server-6e95bca3/tax-records
```

**ผลกระทบ**: เห็นข้อมูลภาษี, รายได้, ค่าใช้จ่าย - **ผิดกฎหมายข้อมูลส่วนบุคคล PDPA**

---

## ✅ แนวทางแก้ไข (Recommended Solutions)

### วิธีที่ 1: เพิ่ม User ID Prefix (Quick Fix - 30 นาที)

**ข้อดี**: 
- แก้ไขได้เร็ว ไม่ต้องเปลี่ยน database schema
- รองรับ demo mode ที่มีอยู่

**ข้อเสีย**:
- ไม่ป้องกัน enumeration attack 100%
- ยังพึ่ง client-side validation อยู่

**วิธีทำ**:
1. เพิ่ม `userId` ในทุก API request
2. แก้ไข `getKeyPrefix()` ให้รวม userId
3. ตรวจสอบ JWT token และดึง user ID

```typescript
// ตัวอย่าง: เพิ่ม userId prefix
function getKeyPrefix(c: any, basePrefix: string, userId?: string): string {
  const demoSessionId = c.req.header('X-Demo-Session-Id');
  
  if (demoSessionId) {
    return `demo-${demoSessionId}-${basePrefix}`;
  }
  
  // เพิ่มส่วนนี้
  if (userId) {
    return `user-${userId}-${basePrefix}`;
  }
  
  return basePrefix;
}
```

---

### วิธีที่ 2: ย้ายไปใช้ Postgres + RLS (Recommended - 2-3 ชม.)

**ข้อดี**:
- **Security มาตรฐาน enterprise**
- ป้องกัน SQL injection, enumeration attacks
- รองรับ complex queries และ joins
- Backup/Recovery ง่ายกว่า

**ข้อเสีย**:
- ต้องสร้าง schema และ migration
- ต้องแก้โค้ดทั้งหมดจาก KV → SQL

**ขั้นตอน**:

#### 1. สร้าง Tables ใน Supabase Dashboard

```sql
-- Enable RLS
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_records ENABLE ROW LEVEL SECURITY;

-- Documents table
CREATE TABLE documents (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  document_number TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('boq', 'quotation', 'invoice', 'receipt')),
  status TEXT NOT NULL DEFAULT 'draft',
  project_title TEXT NOT NULL,
  customer_id TEXT,
  partner_id TEXT,
  recipient_type TEXT CHECK (recipient_type IN ('customer', 'partner')),
  total_amount DECIMAL(15,2) DEFAULT 0,
  boq_items JSONB DEFAULT '[]',
  profile JSONB,
  company JSONB,
  discount JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS Policies for documents
CREATE POLICY "Users can view own documents"
  ON documents FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own documents"
  ON documents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own documents"
  ON documents FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own documents"
  ON documents FOR DELETE
  USING (auth.uid() = user_id);

-- Customers table
CREATE TABLE customers (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL,
  tax_id TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS Policies for customers
CREATE POLICY "Users can view own customers"
  ON customers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own customers"
  ON customers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own customers"
  ON customers FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own customers"
  ON customers FOR DELETE
  USING (auth.uid() = user_id);

-- Partners table (same pattern)
CREATE TABLE partners (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL,
  company_name TEXT,
  tax_id TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  total_projects INTEGER DEFAULT 0,
  total_revenue DECIMAL(15,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS Policies for partners (same as customers)
CREATE POLICY "Users can view own partners" ON partners FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own partners" ON partners FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own partners" ON partners FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own partners" ON partners FOR DELETE USING (auth.uid() = user_id);

-- Tax records table
CREATE TABLE tax_records (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  document_id TEXT,
  invoice_number TEXT,
  receipt_number TEXT,
  customer_name TEXT,
  issue_date DATE,
  total_before_vat DECIMAL(15,2),
  vat_amount DECIMAL(15,2),
  grand_total DECIMAL(15,2),
  withholding_tax_amount DECIMAL(15,2) DEFAULT 0,
  net_payable DECIMAL(15,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS Policies for tax_records
CREATE POLICY "Users can view own tax records" ON tax_records FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own tax records" ON tax_records FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tax records" ON tax_records FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own tax records" ON tax_records FOR DELETE USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_documents_user_id ON documents(user_id);
CREATE INDEX idx_documents_created_at ON documents(created_at);
CREATE INDEX idx_documents_document_number ON documents(document_number);
CREATE INDEX idx_customers_user_id ON customers(user_id);
CREATE INDEX idx_partners_user_id ON partners(user_id);
CREATE INDEX idx_tax_records_user_id ON tax_records(user_id);
```

#### 2. แก้ไข Server Code

```typescript
// ใช้ Supabase client แทน KV store
import { createClient } from "jsr:@supabase/supabase-js@2.49.8";

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

// ตัวอย่าง: Get documents
app.get("/make-server-6e95bca3/documents", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user } } = await supabase.auth.getUser(accessToken);
    
    if (!user) {
      return c.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // RLS จะกรองให้เห็นแค่เอกสารของ user นี้เท่านั้น
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('user_id', user.id);
    
    if (error) throw error;
    
    return c.json({ documents: data });
  } catch (error: any) {
    console.error("Get documents error:", error);
    return c.json({ error: error.message }, { status: 500 });
  }
});
```

---

### วิธีที่ 3: เพิ่ม Middleware ตรวจสอบ User (Medium - 1 ชม.)

**ข้อดี**:
- ใช้ KV store เดิมต่อได้
- เพิ่ม security layer โดยไม่ต้องเปลี่ยน schema

**ข้อเสีย**:
- ยังต้องพึ่ง manual validation
- Performance ต่ำกว่า RLS

**วิธีทำ**:

```typescript
// Middleware ตรวจสอบ authentication
async function requireAuth(c: any) {
  const accessToken = c.req.header('Authorization')?.split(' ')[1];
  
  if (!accessToken) {
    return c.json({ error: "Missing authorization token" }, { status: 401 });
  }
  
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!
  );
  
  const { data: { user }, error } = await supabase.auth.getUser(accessToken);
  
  if (error || !user) {
    return c.json({ error: "Invalid or expired token" }, { status: 401 });
  }
  
  return user;
}

// ใช้งาน
app.get("/make-server-6e95bca3/documents", async (c) => {
  const user = await requireAuth(c);
  if (!user.id) {
    return user; // Return error response
  }
  
  // ดึงข้อมูลที่มี userId ตรงกันเท่านั้น
  const prefix = `user-${user.id}-document:`;
  const documents = await kv.getByPrefix(prefix);
  
  return c.json({ documents });
});
```

---

## 📋 ขั้นตอนถัดไป (Action Items)

### Phase 1: Quick Security Fixes (ทำทันที - 1 ชม.)
1. ✅ เพิ่ม `requireAuth` middleware
2. ✅ เพิ่ม `userId` prefix ในทุก KV key
3. ✅ ตรวจสอบ JWT token ในทุก protected endpoint
4. ✅ เพิ่ม rate limiting (ป้องกัน brute force)

### Phase 2: Database Migration (สัปดาห์หน้า - 4-6 ชม.)
1. ⏳ สร้าง Postgres tables + RLS policies
2. ⏳ Migrate ข้อมูลจาก KV → Postgres
3. ⏳ แก้โค้ด server ทั้งหมดให้ใช้ SQL
4. ⏳ ทดสอบ security กับ penetration testing

### Phase 3: Compliance & Monitoring (เดือนหน้า - 2-3 ชม.)
1. ⏳ เพิ่ม audit logging (บันทึกว่าใครเข้าถึงข้อมูลอะไรเมื่อไหร่)
2. ⏳ ตั้ง alerts เมื่อมี suspicious activity
3. ⏳ เตรียม PDPA compliance documents
4. ⏳ Security audit โดย third-party

---

## 🎯 คำแนะนำจาก AI

**สำหรับ Production (EZBOQ.COM):**  
→ **ใช้วิธีที่ 2: Postgres + RLS** เพราะเป็นมาตรฐาน enterprise และปลอดภัยที่สุด

**สำหรับ MVP/Testing:**  
→ **ใช้วิธีที่ 1 + 3 รวมกัน** (userId prefix + auth middleware) เพื่อ deploy ได้เร็ว

**อย่าลืม**:
- ✅ ทดสอบ security ก่อน launch
- ✅ เปิด HTTPS บังคับ (ไม่อนุญาต HTTP)
- ✅ ตั้ง rate limiting = 100 requests/minute/IP
- ✅ Monitor logs สม่ำเสมอ
- ✅ Backup database ทุกวัน

---

## 📞 Contact & Support

หากต้องการความช่วยเหลือเรื่อง security:
- 📧 ติดต่อทีม Supabase Support
- 📚 อ่าน [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- 🔐 ปรึกษา Security Consultant

---

**สร้างโดย**: EZBOQ Development Team  
**วันที่ปรับปรุง**: 28 มกราคม 2025  
**Version**: 1.0.0
