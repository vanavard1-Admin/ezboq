# Test Plan: Document Number Generation Fix

## 📋 Test Overview

ทดสอบว่าการแก้ไข Emergency Fallback ใช้งานได้ถูกต้อง

## ✅ Test Cases

### Test 1: Normal Document Creation (Single Request)

**วัตถุประสงค์**: ทดสอบการสร้างเอกสารปกติ 1 รายการ

**Steps**:
1. เปิด console ใน browser (F12)
2. สร้าง BOQ ใหม่ผ่าน UI
3. ตรวจสอบ logs ใน console

**Expected Result**:
```
✅ Generated document number: BOQ-2025-10-0001 in <1000ms
```

**Logs ที่ควรเห็น**:
- `🔢 Starting document number generation`
- `🔒 Lock acquired after 1 attempts`
- `📊 Counter retrieved in XXXms`
- `✅ Generated document number`
- ไม่มี ⚠️ warnings หรือ ❌ errors

---

### Test 2: Multiple Documents (Sequential)

**วัตถุประสงค์**: ทดสอบการสร้างเอกสารหลายรายการตามลำดับ

**Steps**:
1. สร้าง BOQ 5 รายการ (ทีละรายการ)
2. บันทึกและดู document numbers

**Expected Result**:
```
BOQ-2025-10-0001
BOQ-2025-10-0002
BOQ-2025-10-0003
BOQ-2025-10-0004
BOQ-2025-10-0005
```

**Checks**:
- [ ] เลขที่ต่อเนื่องกัน (ไม่กระโดด)
- [ ] ไม่มี duplicate
- [ ] ไม่มี 9999

---

### Test 3: Concurrent Creation (Stress Test)

**วัตถุประสงค์**: ทดสอบการสร้างเอกสารพร้อมกัน

**Steps** (ใช้ Browser Console):

```javascript
// Test concurrent creation
async function testConcurrentCreation(count = 10) {
  console.log(`🧪 Testing ${count} concurrent document creations...`);
  
  const promises = [];
  const startTime = Date.now();
  
  for (let i = 0; i < count; i++) {
    const promise = fetch('/api/documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'boq',
        projectTitle: `Test ${i}`,
        items: []
      })
    }).then(r => r.json());
    
    promises.push(promise);
  }
  
  const results = await Promise.all(promises);
  const endTime = Date.now();
  
  // Extract document numbers
  const docNumbers = results.map(r => r.document?.documentNumber);
  
  // Check for duplicates
  const uniqueNumbers = new Set(docNumbers);
  const hasDuplicates = uniqueNumbers.size !== docNumbers.length;
  
  console.log('Results:', {
    total: count,
    unique: uniqueNumbers.size,
    duplicates: hasDuplicates,
    time: `${endTime - startTime}ms`,
    avgTime: `${(endTime - startTime) / count}ms per request`,
    numbers: Array.from(uniqueNumbers).sort()
  });
  
  if (hasDuplicates) {
    console.error('❌ FAIL: Duplicates found!');
    const duplicates = docNumbers.filter((n, i) => docNumbers.indexOf(n) !== i);
    console.error('Duplicate numbers:', duplicates);
  } else {
    console.log('✅ PASS: All numbers are unique');
  }
  
  return { hasDuplicates, docNumbers: Array.from(uniqueNumbers) };
}

// Run test
testConcurrentCreation(10);
```

**Expected Result**:
```javascript
{
  total: 10,
  unique: 10,
  duplicates: false,
  time: "2500ms",
  avgTime: "250ms per request",
  numbers: ["BOQ-2025-10-0001", ..., "BOQ-2025-10-0010"]
}
```

**Checks**:
- [ ] ไม่มี duplicates
- [ ] Total time < 10 วินาที (สำหรับ 10 requests)
- [ ] ไม่มี 9999 ใน document numbers

---

### Test 4: Database Slow Response Simulation

**วัตถุประสงค์**: ทดสอบ circuit breaker และ fallback

**Note**: ไม่สามารถทดสอบได้โดยตรง แต่สามารถ monitor logs ใน production

**What to Monitor**:
```
# ถ้า database ช้า ควรเห็น:
⚠️ KV is marked unhealthy (3 failures, last XXXms ago)
🔄 Attempting KV health recovery...

# ถ้า recovery สำเร็จ:
✅ KV health restored after operation: generateDocumentNumber:getCounter
```

**Checks**:
- [ ] Circuit breaker activate เมื่อมีปัญหา
- [ ] Auto-recovery ภายใน 30 วินาที
- [ ] Fallback ใช้ timestamp (ไม่ใช่ 9999)

---

### Test 5: Month Transition

**วัตถุประสงค์**: ทดสอบการเปลี่ยนเดือน counter ต้อง reset

**Steps**:
1. สร้าง BOQ ในเดือนปัจจุบัน → ได้ `BOQ-2025-10-0001`
2. (จำลอง) ถ้าเดือนหน้า → ควรได้ `BOQ-2025-11-0001`

**Manual Test** (ถ้าใกล้สิ้นเดือน):
- สร้าง BOQ วันสุดท้ายของเดือน
- รอเลย 00:00 ของเดือนใหม่
- สร้าง BOQ ใหม่
- ตรวจสอบว่า counter reset เป็น 0001

**Expected**:
```
เดือน 10: BOQ-2025-10-0042
เดือน 11: BOQ-2025-11-0001  ← reset counter
```

---

### Test 6: Lock Cleanup (Stale Lock)

**วัตถุประสงค์**: ทดสอบว่า stale locks ถูก cleanup

**Scenario**: 
- Server crash ขณะถือ lock
- Lock ค้างไว้ใน database
- Request ใหม่ต้อง detect และ cleanup

**Expected Behavior**:
```
⚠️ Stale lock detected (age: 35000ms), attempting to clear
🔒 Lock acquired after clearing stale lock
```

**Note**: ยากต่อการจำลอง แต่ระบบมี auto-cleanup สำหรับ locks อายุ > 30 วินาที

---

## 🔍 Monitoring Checklist

### During Testing

ตรวจสอบ logs ใน browser console:

- [ ] ✅ ไม่มี `🚨 CRITICAL: Emergency fallback triggered`
- [ ] ✅ ไม่มี `⚠️ All 15 attempts failed`
- [ ] ✅ Lock acquisition สำเร็จใน attempt แรก (> 90%)
- [ ] ✅ Response time < 1 วินาทีสำหรับ normal requests
- [ ] ✅ Document numbers ไม่ซ้ำกัน

### Performance Metrics

| Metric | Target | Your Result | Pass/Fail |
|--------|--------|-------------|-----------|
| Lock Acquisition (1st attempt) | > 90% | ___% | _____ |
| Avg Response Time | < 1s | ___ms | _____ |
| P95 Response Time | < 2s | ___ms | _____ |
| P99 Response Time | < 5s | ___ms | _____ |
| Success Rate | > 99% | ___% | _____ |
| Duplicates | 0 | ___ | _____ |
| Emergency Fallbacks | 0 | ___ | _____ |

---

## 📊 Success Criteria

### Must Have (P0)
- ✅ ไม่มี duplicate document numbers
- ✅ ไม่มี emergency fallback (9999 หรือ timestamp fallback)
- ✅ เลขที่เอกสารเพิ่มขึ้นตามลำดับ
- ✅ Response time < 5 วินาที (P99)

### Should Have (P1)
- ✅ Lock acquisition สำเร็จใน attempt แรก (> 90%)
- ✅ Response time < 1 วินาที (P50)
- ✅ รองรับ concurrent requests (10+ simultaneous)
- ✅ Circuit breaker ทำงานถูกต้อง

### Nice to Have (P2)
- ✅ Detailed performance logs
- ✅ Automatic stale lock cleanup
- ✅ Health status tracking

---

## 🐛 Common Issues & Solutions

### Issue 1: ยังเห็น 9999 ใน document numbers

**Symptoms**: `BOQ-2025-10-9999`

**Root Cause**: Code เก่ายังไม่ deploy หรือ cache issue

**Solution**:
```bash
# Clear browser cache
Ctrl+Shift+R (hard reload)

# Verify server code
curl https://your-api/version
# ควรเห็น version 2.0.0
```

---

### Issue 2: Duplicate Document Numbers

**Symptoms**: หลาย documents มี number เดียวกัน

**Root Cause**: Lock mechanism ล้มเหลว

**Debug**:
```javascript
// Check logs สำหรับ:
"Lock acquired after X attempts"
"Lock verification failed"
```

**Solution**: Check database performance และ index

---

### Issue 3: Slow Response Time (> 10s)

**Symptoms**: ใช้เวลานานในการสร้าง document

**Root Cause**: Database slow หรือ timeout issues

**Debug**:
```javascript
// Check logs สำหรับ timing:
"Counter retrieved in XXXms"  // ควร < 1000ms
"Uniqueness check completed in XXXms"  // ควร < 2000ms
```

**Solution**:
1. Check database connection
2. Check Supabase dashboard สำหรับ performance
3. พิจารณา increase timeout หรือ upgrade plan

---

### Issue 4: Circuit Breaker Always Open

**Symptoms**: 
```
⚠️ KV is marked unhealthy
```

**Root Cause**: Database มีปัญหาต่อเนื่อง

**Solution**:
1. Check Supabase status
2. Verify database indexes
3. Check network connectivity
4. Review recent changes

---

## 📝 Test Report Template

```markdown
# Document Number Fix Test Report

**Date**: _____________
**Tester**: _____________
**Environment**: Production / Staging / Development

## Test Results

| Test Case | Status | Notes |
|-----------|--------|-------|
| Single Document Creation | ✅/❌ | |
| Sequential Creation (5 docs) | ✅/❌ | |
| Concurrent Creation (10 docs) | ✅/❌ | |
| No Duplicates | ✅/❌ | |
| No 9999 Numbers | ✅/❌ | |

## Performance

- Avg Response Time: ___ms
- P95 Response Time: ___ms
- P99 Response Time: ___ms
- Lock Success Rate (1st attempt): ___%

## Issues Found

1. ___________________
2. ___________________

## Recommendations

1. ___________________
2. ___________________

## Conclusion

✅ PASS / ❌ FAIL

**Approved for Production**: YES / NO
```

---

## 🚀 Quick Test Commands

```javascript
// 1. Quick single test
fetch('/api/documents', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ type: 'boq', projectTitle: 'Test', items: [] })
}).then(r => r.json()).then(console.log);

// 2. Quick concurrent test (paste in console)
Promise.all(Array(10).fill(0).map((_, i) => 
  fetch('/api/documents', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'boq', projectTitle: `Test ${i}`, items: [] })
  }).then(r => r.json())
)).then(results => {
  const numbers = results.map(r => r.document?.documentNumber);
  console.log('Numbers:', numbers);
  console.log('Unique:', new Set(numbers).size === numbers.length ? '✅' : '❌ FAIL');
});

// 3. Check version
fetch('/api/version').then(r => r.json()).then(console.log);
```

---

**Happy Testing! 🎉**
