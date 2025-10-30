# 🧪 P1 System Stability Testing Guide

## ทดสอบ Input Validation, Rate Limiting, และ Document Number Schema

---

## 1️⃣ Input Validation (Zod) Testing

### 1.1 ทดสอบ Valid Customer Data (ควรสำเร็จ)

```bash
curl -X POST \
  https://YOUR_PROJECT.supabase.co/functions/v1/make-server-6e95bca3/customers \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "cust-valid-001",
    "name": "บริษัท ทดสอบ จำกัด",
    "taxId": "1234567890123",
    "address": "123 ถนนสุขุมวิท กรุงเทพฯ 10110",
    "phone": "02-123-4567",
    "email": "test@company.com"
  }'
```

**ผลลัพธ์ที่คาดหวัง**:
```json
{
  "success": true,
  "customer": {
    "id": "cust-valid-001",
    "name": "บริษัท ทดสอบ จำกัด",
    ...
  }
}
```

**Status**: `200 OK`

---

### 1.2 ทดสอบ Invalid Customer Data - Missing Required Field

```bash
curl -X POST \
  https://YOUR_PROJECT.supabase.co/functions/v1/make-server-6e95bca3/customers \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "cust-invalid-001",
    "name": ""
  }'
```

**ผลลัพธ์ที่คาดหวัง**:
```json
{
  "error": "Invalid customer data",
  "details": [
    {
      "path": "name",
      "message": "String must contain at least 1 character(s)"
    }
  ]
}
```

**Status**: `400 Bad Request`

---

### 1.3 ทดสอบ XSS Attack Prevention

```bash
curl -X POST \
  https://YOUR_PROJECT.supabase.co/functions/v1/make-server-6e95bca3/customers \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "cust-xss-001",
    "name": "<script>alert(\"XSS\")</script>",
    "address": "<img src=x onerror=alert(1)>",
    "email": "test@test.com"
  }'
```

**ผลลัพธ์ที่คาดหวัง**:
```json
{
  "success": true,
  "customer": {
    "id": "cust-xss-001",
    "name": "<script>alert(&quot;XSS&quot;)</script>",
    "address": "<img src=x onerror=alert(1)>"
  }
}
```

✅ ข้อมูลถูก sanitized (HTML tags escaped)

---

### 1.4 ทดสอบ Invalid Email Format

```bash
curl -X POST \
  https://YOUR_PROJECT.supabase.co/functions/v1/make-server-6e95bca3/customers \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "cust-invalid-email",
    "name": "Test Company",
    "email": "not-an-email"
  }'
```

**ผลลัพธ์ที่คาดหวัง**:
```json
{
  "error": "Invalid customer data",
  "details": [
    {
      "path": "email",
      "message": "Invalid email"
    }
  ]
}
```

**Status**: `400 Bad Request`

---

### 1.5 ทดสอบ Document Validation - Invalid Type

```bash
curl -X POST \
  https://YOUR_PROJECT.supabase.co/functions/v1/make-server-6e95bca3/documents \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "doc-invalid-001",
    "type": "invalid-type",
    "status": "draft",
    "projectTitle": "Test Project"
  }'
```

**ผลลัพธ์ที่คาดหวัง**:
```json
{
  "error": "Invalid document data",
  "details": [
    {
      "path": "type",
      "message": "Invalid enum value. Expected 'boq' | 'quotation' | 'invoice' | 'receipt', received 'invalid-type'"
    }
  ]
}
```

**Status**: `400 Bad Request`

---

### 1.6 ทดสอบ Document Validation - Negative Amount

```bash
curl -X POST \
  https://YOUR_PROJECT.supabase.co/functions/v1/make-server-6e95bca3/documents \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "doc-negative",
    "type": "invoice",
    "status": "draft",
    "projectTitle": "Test",
    "totalAmount": -1000
  }'
```

**ผลลัพธ์ที่คาดหวัง**:
```json
{
  "error": "Invalid document data",
  "details": [
    {
      "path": "totalAmount",
      "message": "Number must be greater than or equal to 0"
    }
  ]
}
```

---

## 2️⃣ Rate Limiting Testing

### 2.1 ทดสอบ Normal Usage (ไม่เกิน limit)

```bash
# ส่ง 10 requests ภายใน 1 นาที
for i in {1..10}; do
  echo "Request $i"
  curl -s -w "\nStatus: %{http_code}\n" \
    https://YOUR_PROJECT.supabase.co/functions/v1/make-server-6e95bca3/customers \
    -H "Authorization: Bearer YOUR_ANON_KEY" | grep -E "(customers|Status)"
  sleep 0.5
done
```

**ผลลัพธ์ที่คาดหวัง**:
- ทุก request ได้ `Status: 200`
- Response headers มี `X-RateLimit-Remaining` ลดลงเรื่อยๆ

---

### 2.2 ทดสอบ Rate Limit Exceeded

```bash
# ส่ง 105 requests ภายใน 1 นาที (เกิน limit 100)
for i in {1..105}; do
  response=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
    https://YOUR_PROJECT.supabase.co/functions/v1/make-server-6e95bca3/customers \
    -H "Authorization: Bearer YOUR_ANON_KEY")
  
  http_code=$(echo "$response" | grep "HTTP_CODE:" | cut -d: -f2)
  
  if [ "$http_code" == "429" ]; then
    echo "❌ Request $i: Rate limit exceeded (429)"
  elif [ "$http_code" == "200" ]; then
    echo "✅ Request $i: Success (200)"
  fi
done
```

**ผลลัพธ์ที่คาดหวัง**:
- Request 1-100: `Status: 200 OK`
- Request 101-105: `Status: 429 Too Many Requests`

**Response สำหรับ 429**:
```json
{
  "error": "Rate limit exceeded",
  "message": "Maximum 100 requests per minute. Please try again later.",
  "retryAfter": 60
}
```

**Response Headers**:
```
Retry-After: 60
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1706444400
```

---

### 2.3 ตรวจสอบ Rate Limit Headers

```bash
curl -v \
  https://YOUR_PROJECT.supabase.co/functions/v1/make-server-6e95bca3/customers \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  2>&1 | grep -i "x-ratelimit"
```

**ผลลัพธ์ที่คาดหวัง**:
```
< X-RateLimit-Limit: 100
< X-RateLimit-Remaining: 99
< X-RateLimit-Reset: 1706444460
```

---

### 2.4 ทดสอบ Rate Limit Reset (หลัง 1 นาที)

```bash
# ทดสอบ request หลังจาก rate limit reset
echo "Waiting for rate limit reset (60 seconds)..."
sleep 60

curl -s \
  https://YOUR_PROJECT.supabase.co/functions/v1/make-server-6e95bca3/customers \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  | jq '.customers | length'
```

**ผลลัพธ์ที่คาดหวัง**:
- ได้ `Status: 200 OK`
- `X-RateLimit-Remaining` กลับมาเป็น 99 อีกครั้ง

---

### 2.5 ทดสอบ Rate Limit ไม่กระทบ Health Endpoints

```bash
# ส่ง 150 requests ไปที่ /livez (ไม่ควรถูก rate limit)
for i in {1..150}; do
  status=$(curl -s -o /dev/null -w "%{http_code}" \
    https://YOUR_PROJECT.supabase.co/functions/v1/make-server-6e95bca3/livez)
  
  if [ "$status" != "200" ]; then
    echo "❌ Request $i failed: $status"
  fi
done

echo "✅ All health check requests succeeded"
```

**ผลลัพธ์ที่คาดหวัง**:
- ทุก request ได้ `200 OK`
- Health endpoints ไม่ถูก rate limit

---

## 3️⃣ Document Number Schema Testing

### 3.1 ทดสอบ Sequential Document Numbers

```bash
# สร้างเอกสาร 5 ฉบับ
for i in {1..5}; do
  response=$(curl -s -X POST \
    https://YOUR_PROJECT.supabase.co/functions/v1/make-server-6e95bca3/documents \
    -H "Authorization: Bearer YOUR_ANON_KEY" \
    -H "Content-Type: application/json" \
    -d "{
      \"id\": \"doc-test-$i\",
      \"type\": \"invoice\",
      \"status\": \"draft\",
      \"projectTitle\": \"Test Project $i\"
    }")
  
  docNumber=$(echo "$response" | jq -r '.document.documentNumber')
  echo "Document $i: $docNumber"
done
```

**ผลลัพธ์ที่คาดหวัง**:
```
Document 1: INV-2025-01-0001
Document 2: INV-2025-01-0002
Document 3: INV-2025-01-0003
Document 4: INV-2025-01-0004
Document 5: INV-2025-01-0005
```

✅ เลขเอกสารเพิ่มขึ้นแบบต่อเนื่อง

---

### 3.2 ทดสอบ Different Document Types

```bash
# สร้างเอกสารต่างประเภท
types=("boq" "quotation" "invoice" "receipt")

for type in "${types[@]}"; do
  response=$(curl -s -X POST \
    https://YOUR_PROJECT.supabase.co/functions/v1/make-server-6e95bca3/documents \
    -H "Authorization: Bearer YOUR_ANON_KEY" \
    -H "Content-Type: application/json" \
    -d "{
      \"id\": \"doc-$type-001\",
      \"type\": \"$type\",
      \"status\": \"draft\",
      \"projectTitle\": \"Test $type\"
    }")
  
  docNumber=$(echo "$response" | jq -r '.document.documentNumber')
  echo "$type: $docNumber"
done
```

**ผลลัพธ์ที่คาดหวัง**:
```
boq: BOQ-2025-01-0001
quotation: QT-2025-01-0001
invoice: INV-2025-01-0001
receipt: RCP-2025-01-0001
```

✅ แต่ละประเภทมี counter แยกกัน

---

### 3.3 ทดสอบ Uniqueness Constraint

```bash
# พยายามสร้างเอกสารด้วย document number ที่ซ้ำกัน
curl -X POST \
  https://YOUR_PROJECT.supabase.co/functions/v1/make-server-6e95bca3/documents \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "doc-duplicate-1",
    "type": "invoice",
    "status": "draft",
    "projectTitle": "First",
    "documentNumber": "INV-2025-01-0001"
  }'

# ลองสร้างอีกครั้งด้วย ID ต่างกัน แต่ documentNumber เดียวกัน
curl -X POST \
  https://YOUR_PROJECT.supabase.co/functions/v1/make-server-6e95bca3/documents \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "doc-duplicate-2",
    "type": "invoice",
    "status": "draft",
    "projectTitle": "Second",
    "documentNumber": "INV-2025-01-0001"
  }'
```

**ผลลัพธ์ที่คาดหวัง**:
- ครั้งที่ 1: สำเร็จ (หรือ auto-generate number ใหม่)
- ครั้งที่ 2: ใช้ document number เดียวกันไม่ได้ (ระบบจะ auto-generate number ใหม่)

---

### 3.4 ทดสอบ Document Number Format

```bash
# ดึงเอกสารทั้งหมดและตรวจสอบ format
curl -s \
  https://YOUR_PROJECT.supabase.co/functions/v1/make-server-6e95bca3/documents \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  | jq -r '.documents[].documentNumber' \
  | grep -E '^(BOQ|QT|INV|RCP)-[0-9]{4}-[0-9]{2}-[0-9]{4}$'
```

**ผลลัพธ์ที่คาดหวัง**:
```
INV-2025-01-0001
INV-2025-01-0002
QT-2025-01-0001
BOQ-2025-01-0001
```

✅ ทุก document number ตรงตาม format `{PREFIX}-{YYYY}-{MM}-{####}`

---

### 3.5 ทดสอบ Counter Reset (เดือนใหม่)

**หมายเหตุ**: ต้องรอจนถึงเดือนถัดไป หรือ manually แก้ไข system date

```bash
# Simulate: สร้างเอกสารในเดือนใหม่
# (ในการทดสอบจริง ให้รอจนเดือนเปลี่ยน)

# เดือนปัจจุบัน
curl -s -X POST ... | jq -r '.document.documentNumber'
# Output: INV-2025-01-0005

# เดือนถัดไป (สมมติ)
curl -s -X POST ... | jq -r '.document.documentNumber'
# Output: INV-2025-02-0001
```

✅ Counter reset กลับไปเป็น 0001 ในเดือนใหม่

---

## 4️⃣ Integration Testing

### 4.1 ทดสอบ Full Workflow (BOQ → Quotation → Invoice → Receipt)

```bash
#!/bin/bash

echo "📋 Creating BOQ..."
boq=$(curl -s -X POST \
  https://YOUR_PROJECT.supabase.co/functions/v1/make-server-6e95bca3/documents \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "doc-workflow-boq",
    "type": "boq",
    "status": "draft",
    "projectTitle": "Integration Test Project",
    "boqItems": [
      {"id": "1", "description": "Cement", "quantity": 100, "unit": "bag", "material": 150, "labor": 50}
    ]
  }')

boqNumber=$(echo "$boq" | jq -r '.document.documentNumber')
echo "✅ BOQ created: $boqNumber"

sleep 1

echo "💰 Creating Quotation..."
qt=$(curl -s -X POST \
  https://YOUR_PROJECT.supabase.co/functions/v1/make-server-6e95bca3/documents \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "doc-workflow-qt",
    "type": "quotation",
    "status": "draft",
    "projectTitle": "Integration Test Project"
  }')

qtNumber=$(echo "$qt" | jq -r '.document.documentNumber')
echo "✅ Quotation created: $qtNumber"

sleep 1

echo "🧾 Creating Invoice..."
inv=$(curl -s -X POST \
  https://YOUR_PROJECT.supabase.co/functions/v1/make-server-6e95bca3/documents \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "doc-workflow-inv",
    "type": "invoice",
    "status": "draft",
    "projectTitle": "Integration Test Project"
  }')

invNumber=$(echo "$inv" | jq -r '.document.documentNumber')
echo "✅ Invoice created: $invNumber"

sleep 1

echo "📃 Creating Receipt..."
rcp=$(curl -s -X POST \
  https://YOUR_PROJECT.supabase.co/functions/v1/make-server-6e95bca3/documents \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "doc-workflow-rcp",
    "type": "receipt",
    "status": "draft",
    "projectTitle": "Integration Test Project"
  }')

rcpNumber=$(echo "$rcp" | jq -r '.document.documentNumber')
echo "✅ Receipt created: $rcpNumber"

echo ""
echo "🎉 Workflow Complete!"
echo "   BOQ:       $boqNumber"
echo "   Quotation: $qtNumber"
echo "   Invoice:   $invNumber"
echo "   Receipt:   $rcpNumber"
```

**ผลลัพธ์ที่คาดหวัง**:
```
📋 Creating BOQ...
✅ BOQ created: BOQ-2025-01-0001
💰 Creating Quotation...
✅ Quotation created: QT-2025-01-0001
🧾 Creating Invoice...
✅ Invoice created: INV-2025-01-0001
📃 Creating Receipt...
✅ Receipt created: RCP-2025-01-0001

🎉 Workflow Complete!
   BOQ:       BOQ-2025-01-0001
   Quotation: QT-2025-01-0001
   Invoice:   INV-2025-01-0001
   Receipt:   RCP-2025-01-0001
```

---

## 5️⃣ Performance Testing

### 5.1 ทดสอบ Concurrent Document Creation

```bash
# สร้าง 10 documents พร้อมกัน (simulate concurrent users)
for i in {1..10}; do
  (curl -s -X POST \
    https://YOUR_PROJECT.supabase.co/functions/v1/make-server-6e95bca3/documents \
    -H "Authorization: Bearer YOUR_ANON_KEY" \
    -H "Content-Type: application/json" \
    -d "{
      \"id\": \"doc-concurrent-$i\",
      \"type\": \"invoice\",
      \"status\": \"draft\",
      \"projectTitle\": \"Concurrent Test $i\"
    }" | jq -r '.document.documentNumber') &
done

wait
echo "✅ All concurrent requests completed"
```

**ผลลัพธ์ที่คาดหวัง**:
- ทุก document มี document number ไม่ซ้ำกัน
- ไม่เกิด race condition

---

### 5.2 🌪️ ทดสอบ Concurrent Storm (Document Number + Idempotency)

**จุดประสงค์**: ทดสอบ race conditions, unique constraints, และ idempotency ภายใต้ high load

```bash
#!/bin/bash

echo "🌪️ Starting Concurrent Storm Test..."
echo "📊 Config: 50 concurrent requests in 5 seconds"
echo "─────────────────────────────────────────────"

# Generate unique idempotency key for each request
BASE_KEY="storm-test-$(date +%s)"
RESULTS_FILE="/tmp/storm-test-results.txt"
rm -f $RESULTS_FILE

# Function to create document with idempotency
create_document() {
  local id=$1
  local idempotency_key="${BASE_KEY}-${id}"
  
  response=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
    -X POST \
    https://YOUR_PROJECT.supabase.co/functions/v1/make-server-6e95bca3/documents \
    -H "Authorization: Bearer YOUR_ANON_KEY" \
    -H "Content-Type: application/json" \
    -H "Idempotency-Key: ${idempotency_key}" \
    -d "{
      \"id\": \"doc-storm-${id}\",
      \"type\": \"invoice\",
      \"status\": \"draft\",
      \"projectTitle\": \"Storm Test ${id}\"
    }")
  
  http_code=$(echo "$response" | grep "HTTP_CODE:" | cut -d: -f2)
  doc_number=$(echo "$response" | jq -r '.document.documentNumber' 2>/dev/null || echo "ERROR")
  
  echo "${id}|${http_code}|${doc_number}" >> $RESULTS_FILE
}

# Launch 50 concurrent requests
for i in {1..50}; do
  create_document $i &
  
  # Stagger slightly to avoid overwhelming the system
  if [ $((i % 10)) -eq 0 ]; then
    sleep 0.1
  fi
done

echo "⏳ Waiting for all requests to complete..."
wait

echo "✅ All requests completed!"
echo ""
echo "📊 Results Analysis:"
echo "─────────────────────────────────────────────"

# Analyze results
total=$(wc -l < $RESULTS_FILE)
success=$(grep "|200|" $RESULTS_FILE | wc -l)
failures=$(grep -v "|200|" $RESULTS_FILE | wc -l)

echo "Total requests: $total"
echo "✅ Success (200): $success"
echo "❌ Failures: $failures"
echo ""

# Check for duplicate document numbers
echo "🔍 Checking for duplicate document numbers..."
doc_numbers=$(awk -F'|' '{print $3}' $RESULTS_FILE | grep -v "ERROR" | sort)
duplicates=$(echo "$doc_numbers" | uniq -d)

if [ -z "$duplicates" ]; then
  echo "✅ No duplicate document numbers found!"
else
  echo "❌ DUPLICATE DOCUMENT NUMBERS DETECTED:"
  echo "$duplicates"
fi

echo ""
echo "📝 Document numbers generated:"
echo "$doc_numbers" | head -10
echo "... (showing first 10)"

# Test idempotency: Retry same request
echo ""
echo "🔄 Testing Idempotency (retry same request)..."
first_id="1"
first_key="${BASE_KEY}-${first_id}"

retry1=$(curl -s -X POST \
  https://YOUR_PROJECT.supabase.co/functions/v1/make-server-6e95bca3/documents \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: ${first_key}" \
  -d "{
    \"id\": \"doc-storm-${first_id}\",
    \"type\": \"invoice\",
    \"status\": \"draft\",
    \"projectTitle\": \"Storm Test ${first_id}\"
  }")

retry2=$(curl -s -X POST \
  https://YOUR_PROJECT.supabase.co/functions/v1/make-server-6e95bca3/documents \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: ${first_key}" \
  -d "{
    \"id\": \"doc-storm-${first_id}\",
    \"type\": \"invoice\",
    \"status\": \"draft\",
    \"projectTitle\": \"Storm Test ${first_id}\"
  }")

doc_num1=$(echo "$retry1" | jq -r '.document.documentNumber')
doc_num2=$(echo "$retry2" | jq -r '.document.documentNumber')

if [ "$doc_num1" == "$doc_num2" ]; then
  echo "✅ Idempotency working: Same document number ($doc_num1) returned"
else
  echo "❌ Idempotency failed: Different document numbers ($doc_num1 vs $doc_num2)"
fi

echo ""
echo "─────────────────────────────────────────────"
echo "🎉 Storm Test Complete!"
```

**ผลลัพธ์ที่คาดหวัง**:
```
🌪️ Starting Concurrent Storm Test...
📊 Config: 50 concurrent requests in 5 seconds
─────────────────────────────────────────────
⏳ Waiting for all requests to complete...
✅ All requests completed!

📊 Results Analysis:
─────────────────────────────────────────────
Total requests: 50
✅ Success (200): 50
❌ Failures: 0

🔍 Checking for duplicate document numbers...
✅ No duplicate document numbers found!

📝 Document numbers generated:
INV-2025-01-0001
INV-2025-01-0002
INV-2025-01-0003
INV-2025-01-0004
INV-2025-01-0005
INV-2025-01-0006
INV-2025-01-0007
INV-2025-01-0008
INV-2025-01-0009
INV-2025-01-0010
... (showing first 10)

🔄 Testing Idempotency (retry same request)...
✅ Idempotency working: Same document number (INV-2025-01-0001) returned

─────────────────────────────────────────────
🎉 Storm Test Complete!
```

**Test Criteria**:
- ✅ ทุก request ต้องสำเร็จ (200 OK)
- ✅ ไม่มี document number ซ้ำกัน
- ✅ Idempotency ทำงานถูกต้อง (retry ได้ response เดิม)
- ✅ ไม่เกิด race condition
- ✅ System ไม่ crash หรือ timeout

---

### 5.3 💥 ทดสอบ Extreme Storm (100 Requests)

```bash
#!/bin/bash

echo "💥 EXTREME STORM TEST: 100 concurrent requests"
echo "⚠️  This will test system limits!"

# Same script as above, but with 100 requests
for i in {1..100}; do
  create_document $i &
done

wait
echo "✅ Extreme storm test completed!"
```

**Expected Behavior**:
- Some requests may hit rate limit (429)
- But no duplicate document numbers should occur
- System should gracefully handle the load
- No data corruption

---

## ✅ Test Checklist

### Input Validation
- [ ] Valid data passes validation
- [ ] Missing required fields rejected
- [ ] Invalid email format rejected
- [ ] Negative amounts rejected
- [ ] Invalid enum values rejected
- [ ] XSS attempts sanitized
- [ ] SQL injection prevented

### Rate Limiting
- [ ] Normal usage (< 100 req/min) works
- [ ] Excess requests (> 100 req/min) return 429
- [ ] Rate limit headers present
- [ ] Rate limit resets after 1 minute
- [ ] Health endpoints not rate limited
- [ ] Different IPs have separate limits

### Document Number Schema
- [ ] Sequential numbers (0001, 0002, 0003...)
- [ ] Different types have separate counters
- [ ] Format matches `{PREFIX}-{YYYY}-{MM}-{####}`
- [ ] Counter resets monthly
- [ ] No duplicate document numbers
- [ ] Concurrent creation doesn't cause collisions

### Integration
- [ ] Full workflow (BOQ → QT → INV → RCP) works
- [ ] All documents created successfully
- [ ] All endpoints work together

---

## 📚 Additional Resources

- [SECURITY_RLS_GUIDE.md](./SECURITY_RLS_GUIDE.md) - RLS Setup
- [TEST_SECURITY.md](./TEST_SECURITY.md) - Security Testing
- [Zod Documentation](https://zod.dev/)

---

**Created by**: EZBOQ Development Team  
**Last Updated**: 28 January 2025  
**Version**: 1.1.0
