# 🧪 Large BOQ Export - Test Plan

## Test Objectives

ทดสอบว่าระบบ PDF Export สำหรับ BOQ ขนาดใหญ่ทำงานได้ถูกต้องและเสถียรตามเป้าหมาย P0

## Test Environment

- **Browser**: Chrome 120+, Safari 17+, Firefox 120+
- **Device**: Desktop (Windows/Mac), Mobile (iOS/Android)
- **Network**: Fast (100+ Mbps), Slow (3G simulation)
- **Data**: 100, 300, 500, 680, 1000 รายการ

## 🎯 P0 Critical Tests

### Test 1: Mode Selection

**Objective**: ตรวจสอบว่าระบบเลือก export mode ถูกต้อง

**Steps**:
1. สร้าง BOQ 100 รายการ
2. กด Export PDF
3. เช็ค console log ว่าใช้ mode ไหน

**Expected**:
- 100 รายการ → Canvas mode
- 299 รายการ → Canvas mode  
- 300 รายการ → AutoTable mode
- 500 รายการ → AutoTable mode

**Pass Criteria**:
- ✅ Mode selection ถูกต้อง 100%
- ✅ แสดง mode badge ใน UI ถูกต้อง

---

### Test 2: Small BOQ Export (< 300 items)

**Objective**: ทดสอบ Canvas mode กับเอกสารขนาดเล็ก

**Test Cases**:

#### 2.1: 50 รายการ
- สร้าง BOQ 50 รายการ
- Export PDF
- **Expected**: < 10 วินาที, ภาพคมชัด, ไม่มี error

#### 2.2: 100 รายการ
- สร้าง BOQ 100 รายการ  
- Export PDF
- **Expected**: 10-15 วินาที, ภาพคมชัด

#### 2.3: 299 รายการ (Edge case)
- สร้าง BOQ 299 รายการ
- Export PDF
- **Expected**: 30-40 วินาที, ใช้ Canvas mode

**Pass Criteria**:
- ✅ p95 < 40 วินาที
- ✅ PDF คุณภาพสูง ตัวอักษรชัดเจน
- ✅ ไม่มี memory leak

---

### Test 3: Medium BOQ Export (300-500 items)

**Objective**: ทดสอบ AutoTable mode กับเอกสารขนาดกลาง

**Test Cases**:

#### 3.1: 300 รายการ (Mode switch threshold)
- สร้าง BOQ 300 รายการ
- Export PDF
- **Expected**: ใช้ AutoTable mode, 20-30 วินาที

#### 3.2: 400 รายการ
- สร้าง BOQ 400 รายการ
- Export PDF  
- **Expected**: 30-40 วินาที

#### 3.3: 500 รายการ (Target benchmark)
- สร้าง BOQ 500 รายการ
- Export PDF
- **Expected**: ≤ 60 วินาที (p95)

**Pass Criteria**:
- ✅ p95 ≤ 60 วินาที สำหรับ 500 รายการ
- ✅ ตาราง format ถูกต้อง
- ✅ Page breaks เหมาะสม
- ✅ Summary ถูกต้อง

---

### Test 4: Large BOQ Export (680 items)

**Objective**: ทดสอบกับจำนวนรายการ catalog เต็ม (680+ รายการ)

**Steps**:
1. สร้าง BOQ 680 รายการ (ใช้ catalog ทั้งหมด)
2. กด Export PDF
3. รอจนเสร็จ
4. บันทึกเวลา

**Expected**:
- ใช้ AutoTable mode
- ≤ 70 วินาที (p95)
- PDF สมบูรณ์ ไม่มีรายการหาย
- ไฟล์ขนาด < 5 MB

**Pass Criteria**:
- ✅ p95 ≤ 70 วินาที
- ✅ ทุกรายการครบถ้วน
- ✅ Summary คำนวณถูกต้อง
- ✅ ไม่มี timeout error

---

### Test 5: Very Large BOQ (≥ 600 items)

**Objective**: ทดสอบ auto-split suggestion

**Test Cases**:

#### 5.1: 600 รายการ (Split threshold)
- สร้าง BOQ 600 รายการ
- กด Export
- **Expected**: แสดง warning และเสนอให้ split

#### 5.2: 1000 รายการ
- สร้าง BOQ 1000 รายการ
- เลือก "Split by category"
- **Expected**: สร้างหลายไฟล์ ตามหมวดหมู่

#### 5.3: 1000 รายการ (No split)
- สร้าง BOQ 1000 รายการ  
- เลือก "Export ไฟล์เดียว"
- **Expected**: ≤ 90 วินาที หรือสำเร็จ

**Pass Criteria**:
- ✅ Split suggestion แสดงที่ ≥ 600 รายการ
- ✅ Split export สำเร็จทุกหมวด
- ✅ Single file export สำเร็จ (may be slow)
- ✅ ทุกไฟล์มี summary ถูกต้อง

---

### Test 6: Cancellation

**Objective**: ทดสอบการยกเลิกระหว่าง export

**Steps**:
1. สร้าง BOQ 500 รายการ
2. กด Export PDF
3. รอ progress 30-50%
4. กดปุ่ม "ยกเลิก"

**Expected**:
- Export หยุดทันที
- แสดง "ยกเลิกโดยผู้ใช้"
- ไม่มี export container ค้างใน DOM
- สามารถ export ใหม่ได้ทันที

**Pass Criteria**:
- ✅ Cancellation ใช้งานได้ภายใน 1 วินาที
- ✅ Cleanup สมบูรณ์
- ✅ ไม่มี memory leak
- ✅ Export ใหม่ได้ปกติ

---

### Test 7: Multi-Tab Lock

**Objective**: ทดสอบ export queue lock ข้ามแท็บ

**Steps**:
1. เปิด 2 แท็บ browser
2. แท็บ 1: เริ่ม export BOQ 500 รายการ
3. แท็บ 2: พยายาม export ในขณะที่แท็บ 1 กำลัง export
4. รอแท็บ 1 เสร็จ
5. แท็บ 2: ลอง export อีกครั้ง

**Expected**:
- แท็บ 2 แสดง "มีการส่งออกอยู่แล้ว" (ขณะแท็บ 1 ทำงาน)
- แท็บ 2 export สำเร็จหลังแท็บ 1 เสร็จ

**Pass Criteria**:
- ✅ Lock ป้องกัน concurrent export
- ✅ Lock release หลังเสร็จหรือ error
- ✅ แท็บที่ 2 export ได้หลัง lock release

---

### Test 8: Memory Management

**Objective**: ตรวจสอบ memory leak และ cleanup

**Steps**:
1. เปิด DevTools → Memory tab
2. Take heap snapshot (Before)
3. Export BOQ 500 รายการ
4. รอเสร็จ
5. Take heap snapshot (After)
6. Compare

**Expected**:
- Memory increase < 50 MB
- ไม่มี detached DOM nodes จำนวนมาก
- `.export-skinny` elements = 0

**Tools**:
```javascript
// Check DOM cleanup
console.log(
  'Export containers:',
  document.querySelectorAll('.export-skinny').length
);

// Check memory (estimate)
if (performance.memory) {
  console.log(
    'Used JS Heap:',
    (performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(2),
    'MB'
  );
}
```

**Pass Criteria**:
- ✅ ไม่มี `.export-skinny` ค้างหลัง export
- ✅ Memory ไม่เพิ่มเกิน 100 MB หลัง export
- ✅ Garbage collection ทำงานถูกต้อง

---

### Test 9: Telemetry Tracking

**Objective**: ตรวจสอบว่า telemetry บันทึกข้อมูลถูกต้อง

**Steps**:
```typescript
import { getTelemetry, getTelemetryStats } from '../utils/pdfExportLarge';

// Export BOQ 500 รายการ
await exportLargeBOQ({ ... });

// Check telemetry
const telemetry = getTelemetry();
const stats = getTelemetryStats();

console.log('Latest export:', telemetry[telemetry.length - 1]);
console.log('Stats:', stats);
```

**Expected Telemetry Data**:
```typescript
{
  startTime: number,
  endTime: number,
  ttfbRender: number,    // < 5000ms
  totalTime: number,     // < 60000ms for 500 items
  pages: number,         // > 0
  itemCount: 500,
  mode: 'autotable',
  cancelled: false,
  error: undefined
}
```

**Pass Criteria**:
- ✅ Telemetry บันทึกทุกครั้งที่ export
- ✅ ข้อมูลครบถ้วน (startTime, endTime, totalTime)
- ✅ Stats calculation ถูกต้อง
- ✅ Failure rate tracking ใช้งานได้

---

### Test 10: Cross-Browser Compatibility

**Objective**: ทดสอบใน browser ต่างๆ

**Browsers**:
- Chrome 120+ (Desktop)
- Safari 17+ (Mac)
- Firefox 120+ (Desktop)
- Mobile Safari (iOS 17+)
- Chrome Mobile (Android)

**Test Case**: Export BOQ 300 รายการ

**Expected**:
- สำเร็จใน browser ทั้งหมด
- เวลาใกล้เคียงกัน (± 20%)
- PDF เปิดได้ใน PDF viewer ทั้งหมด

**Pass Criteria**:
- ✅ สำเร็จ 100% ใน modern browsers
- ✅ Mobile browser ใช้งานได้ (may be slower)
- ✅ PDF compatible กับ Adobe Reader, Preview, etc.

---

## 📊 Performance Benchmarks

### Target Metrics (p95)

| รายการ | Canvas Mode | AutoTable Mode | Status |
|--------|-------------|----------------|--------|
| 50 | ≤ 10s | N/A | ⏱️ |
| 100 | ≤ 15s | N/A | ⏱️ |
| 300 | N/A | ≤ 30s | ⏱️ |
| 500 | N/A | ≤ 60s | 🎯 |
| 680 | N/A | ≤ 70s | 🎯 |
| 1000 (split) | N/A | ≤ 90s | 🎯 |

### Failure Rate Targets

- **Overall**: < 5% in 24h
- **Spike**: < 10% in 1h
- **Timeout rate**: < 2%

### Memory Targets

- **Peak usage**: < 500 MB
- **Cleanup**: 100% (no leaks)
- **GC time**: < 10% of total time

---

## 🔧 Testing Tools

### Console Commands

```javascript
// Check current export state
console.log('Export in progress:', exportInProgress);

// Manual cleanup
document.querySelectorAll('.export-skinny').forEach(el => el.remove());

// Check telemetry
import { getTelemetry } from './utils/pdfExportLarge';
console.table(getTelemetry());

// Clear telemetry
import { clearTelemetry } from './utils/pdfExportLarge';
clearTelemetry();

// Force memory cleanup
if (global.gc) global.gc();
```

### Chrome DevTools Settings

1. **Performance**:
   - Record → Start export → Stop
   - Check flame chart for long tasks

2. **Memory**:
   - Take snapshot before/after
   - Compare allocations
   - Find detached nodes

3. **Network**:
   - Disable cache
   - Throttle to Slow 3G (mobile test)

### Test Data Generator

```typescript
// Generate test BOQ
function generateTestBOQ(count: number): BOQItem[] {
  const categories = ['โครงสร้าง', 'สถาปัตย์', 'ระบบ MEP', 'ตกแต่ง', 'อื่นๆ'];
  
  return Array.from({ length: count }, (_, i) => ({
    id: `item-${i + 1}`,
    name: `รายการทดสอบที่ ${i + 1}`,
    category: categories[i % categories.length],
    unit: 'ชุด',
    quantity: Math.random() * 100 + 1,
    unitPrice: Math.random() * 10000 + 100,
    totalPrice: 0, // Will be calculated
  }));
}

// Usage
const testItems = generateTestBOQ(500);
```

---

## 📝 Test Report Template

### Test Session Info
- **Date**: YYYY-MM-DD
- **Tester**: Name
- **Browser**: Chrome 120.0
- **OS**: Windows 11 / macOS 14
- **Network**: Fast / Slow

### Results Summary

| Test ID | Description | Items | Time | Status | Notes |
|---------|-------------|-------|------|--------|-------|
| T1 | Mode Selection | N/A | N/A | ✅ PASS | Correct mode for all counts |
| T2.1 | Small BOQ | 50 | 8s | ✅ PASS | High quality |
| T3.2 | Medium BOQ | 400 | 35s | ✅ PASS | AutoTable clear |
| T4 | Large BOQ | 680 | 65s | ✅ PASS | Within target |
| T5.2 | Split Export | 1000 | 85s | ✅ PASS | 7 files created |
| T6 | Cancellation | 500 | - | ✅ PASS | Clean abort |
| T7 | Multi-tab | - | - | ✅ PASS | Lock working |
| T8 | Memory | 500 | - | ⚠️ WARN | 60 MB increase |
| T9 | Telemetry | - | - | ✅ PASS | Data correct |
| T10 | Cross-browser | 300 | 28s | ✅ PASS | All browsers OK |

### Issues Found

1. **[Minor]** Memory increase 60 MB for 500 items (target 50 MB)
   - Severity: Low
   - Action: Monitor, acceptable for now

### Recommendations

- ✅ Ready for production
- 🔍 Monitor telemetry for first week
- 📊 Track p95 times in production

---

## Automated Test Script

```typescript
// test-large-boq.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Large BOQ Export', () => {
  test('should export 500 items within 60s', async ({ page }) => {
    await page.goto('/boq');
    
    // Generate test data
    await page.evaluate(() => {
      // Add 500 test items
      window.addTestItems(500);
    });
    
    // Start export
    const startTime = Date.now();
    await page.click('[data-testid="export-pdf"]');
    
    // Wait for completion
    await page.waitForSelector('[data-testid="export-complete"]', {
      timeout: 70000, // 70s max
    });
    
    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(60000); // 60s target
  });
  
  test('should clean up DOM after export', async ({ page }) => {
    await page.goto('/boq');
    await page.evaluate(() => window.addTestItems(100));
    
    await page.click('[data-testid="export-pdf"]');
    await page.waitForSelector('[data-testid="export-complete"]');
    
    // Check no leftover containers
    const containers = await page.locator('.export-skinny').count();
    expect(containers).toBe(0);
  });
});
```

---

## Sign-off Checklist

### Before Production Release

- [ ] All P0 tests passed (T1-T10)
- [ ] Performance targets met
- [ ] Cross-browser tested
- [ ] Mobile tested
- [ ] Memory leak checked
- [ ] Telemetry working
- [ ] Documentation complete
- [ ] Integration guide reviewed
- [ ] Emergency rollback plan ready

### Production Monitoring (Week 1)

- [ ] Monitor telemetry daily
- [ ] Check failure rate < 5%
- [ ] Review p95 times
- [ ] User feedback collected
- [ ] No critical bugs reported

---

**Test Plan Version**: 1.0  
**Last Updated**: 2025-10-28  
**Status**: ✅ Ready for Testing
