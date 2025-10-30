# 📦 Large BOQ Export Guide - P0 Production

## Overview

ระบบ PDF Export รุ่นใหม่ที่รองรับ BOQ ขนาดใหญ่ (500-1,000+ รายการ) ด้วยประสิทธิภาพสูงและเสถียร

## ✅ Key Features

### 1. Auto Mode Switching
- **< 300 รายการ**: Canvas Mode (html2canvas) - ภาพความละเอียดสูง สวยงาม
- **≥ 300 รายการ**: AutoTable Mode (jsPDF AutoTable) - เร็ว กินแรมน้อย เสถียร

### 2. Incremental Rendering
- แบ่งหน้าและเรนเดอร์ทีละหน้า
- เคลียร์หน่วยความจำหลังแต่ละหน้า
- ใช้ `requestAnimationFrame()` เพื่อให้ main thread ไม่ค้าง

### 3. Optimized DOM for Export
- สร้าง "skinny container" ที่ตัดสไตล์ที่ไม่จำเป็นออก
- ไม่มี `box-shadow`, `filter`, `text-shadow`
- ใช้ `position: static` ทั้งหมด
- ฟอนต์เดียว (Sarabun/Noto Sans Thai)

### 4. Cancellation Support
- ปุ่มยกเลิกที่ใช้งานได้จริง
- ใช้ flag `cancelled` ตรวจสอบทุกรอบ
- Hard-abort ทันทีพร้อม cleanup

### 5. Export Queue Lock
- ใช้ `BroadcastChannel` ป้องกันชนกันหลายแท็บ
- Lock ทำงานข้ามแท็บ browser
- Auto release เมื่อเสร็จหรือ error

### 6. Adaptive Scale & Quality
- **Desktop**: `min(2, devicePixelRatio)`
- **Mobile หรือ >500 รายการ**: scale 1.5, quality 0.85
- ปรับอัตโนมัติตามขนาดเอกสาร

### 7. Auto Document Splitting
- **≥ 600 รายการ**: เสนอให้แบ่งตามหมวดหมู่
- รันหลายไฟล์อัตโนมัติ
- คำนวณ summary ใหม่สำหรับแต่ละหมวด

### 8. Telemetry Tracking
- บันทึก: `ttfb_render`, `t_total_export`, `pages`, `itemCount`, `mode`
- ติดตาม failure rate และ p95 performance
- แสดงสถิติใน UI

## 📊 Performance Targets (P95)

| รายการ | เวลาเป้าหมาย | โหมด |
|--------|-------------|------|
| 100 รายการ | ≤ 10s | Canvas |
| 300 รายการ | ≤ 40s | Canvas |
| 500 รายการ | ≤ 60s | AutoTable |
| 680 รายการ | ≤ 70s | AutoTable |
| 1,000 รายการ | ≤ 90s | AutoTable + Split |

## 🚀 Usage

### Basic Usage

```typescript
import { exportLargeBOQ } from './utils/pdfExportLarge';

await exportLargeBOQ({
  projectTitle: 'โครงการ ABC',
  company: companyInfo,
  customer: customerInfo,
  profile: userProfile,
  items: boqItems,
  summary: calculatedSummary,
  filename: 'BOQ_ABC',
  onProgress: (current, total, status) => {
    console.log(`Progress: ${current}/${total} - ${status}`);
  },
  elementId: 'boq-export-section', // Required for canvas mode only
});
```

### With React Component

```typescript
import { LargeBOQExportDialog } from './components/LargeBOQExportDialog';

function MyComponent() {
  const [exportOpen, setExportOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setExportOpen(true)}>
        ส่งออก PDF
      </Button>

      <LargeBOQExportDialog
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        exportOptions={{
          projectTitle,
          company,
          customer,
          profile,
          items: boqItems,
          summary,
          filename: 'BOQ',
        }}
      />
    </>
  );
}
```

### Cancellation

```typescript
import { cancelExport } from './utils/pdfExportLarge';

// ในส่วน UI
<Button onClick={() => cancelExport()}>
  ยกเลิก
</Button>
```

### Check Mode

```typescript
import { pickExportMode, getExportConfig } from './utils/pdfExportLarge';

const itemCount = boqItems.length;
const mode = pickExportMode(itemCount); // 'canvas' | 'autotable'
const config = getExportConfig(itemCount);

console.log(`Mode: ${config.mode}, Scale: ${config.scale}, Quality: ${config.imageQuality}`);
```

### Auto Split

```typescript
import { shouldOfferAutoSplit, splitByCategory } from './utils/pdfExportLarge';

if (shouldOfferAutoSplit(itemCount)) {
  const grouped = splitByCategory(boqItems);
  console.log(`Can split into ${grouped.size} categories`);
  
  // The export function will automatically prompt user
}
```

### Telemetry

```typescript
import { getTelemetry, getTelemetryStats, clearTelemetry } from './utils/pdfExportLarge';

// Get all telemetry data
const allExports = getTelemetry();

// Get aggregated stats
const stats = getTelemetryStats();
console.log(`Avg time: ${stats.avgTimeMs}ms`);
console.log(`Failure rate: ${(stats.failureRate * 100).toFixed(1)}%`);

// Clear old data
clearTelemetry();
```

## 🛠️ Technical Implementation

### Mode Selection Logic

```typescript
function pickExportMode(itemCount: number): ExportMode {
  return itemCount >= 300 ? 'autotable' : 'canvas';
}

function pickScale(itemCount: number, mobile: boolean): number {
  if (mobile || itemCount > 500) return 1.5;
  return Math.min(2, window.devicePixelRatio || 1);
}
```

### Incremental Rendering Pattern

```typescript
for (const page of pages) {
  if (cancelled) throw new Error("ยกเลิกโดยผู้ใช้");
  
  await renderPageChunk(page);
  
  // Cleanup
  canvas.width = canvas.height = 0;
  imgData = null;
  
  await nextFrame(); // Release main thread
}
```

### Skinny Container

```typescript
function createSkinnyContainer(sourceElement: HTMLElement): HTMLElement {
  const container = document.createElement('div');
  container.className = 'export-skinny';
  
  const clone = sourceElement.cloneNode(true);
  
  // Strip heavy styles
  stripHeavyStyles(clone);
  
  container.appendChild(clone);
  document.body.appendChild(container);
  
  return container;
}
```

### Export Lock

```typescript
const exportChannel = new BroadcastChannel('ezboq-export');

async function acquireExportLock(): Promise<boolean> {
  if (exportInProgress) return false;
  
  exportChannel.postMessage({ type: 'lock-request' });
  await new Promise(resolve => setTimeout(resolve, 100));
  
  exportInProgress = true;
  return true;
}

function releaseExportLock(): void {
  exportInProgress = false;
  exportChannel.postMessage({ type: 'lock-released' });
}
```

## 📈 Monitoring & Alerts

### Metrics to Track

1. **Export Duration** (`t_total_export`)
   - Alert if p95 > 90s
   - Alert if p99 > 120s

2. **Failure Rate**
   - Alert if > 5% in 24h
   - Alert if > 10% in 1h

3. **Memory Usage** (`mem_peak_est`)
   - Estimate based on canvas size
   - Alert if consistently high

4. **Mode Distribution**
   - Track canvas vs autotable usage
   - Verify threshold working correctly

### Telemetry Schema

```typescript
interface ExportTelemetry {
  startTime: number;
  endTime?: number;
  ttfbRender?: number;      // Time to first byte (render)
  totalTime?: number;       // Total export time
  pages: number;            // Number of PDF pages
  itemCount: number;        // Number of BOQ items
  mode: ExportMode;         // 'canvas' | 'autotable'
  memPeakEst?: number;      // Estimated peak memory
  cancelled: boolean;       // Was cancelled?
  error?: string;           // Error message if failed
}
```

## 🎯 Best Practices

### For Users

1. **< 300 รายการ**: ใช้โหมด Canvas - ภาพสวยที่สุด
2. **300-500 รายการ**: ใช้โหมด AutoTable - เร็วและเสถียร
3. **500-600 รายการ**: ใช้โหมด AutoTable - อาจใช้เวลา 1 นาที
4. **≥ 600 รายการ**: ควรแบ่งเอกสารตามหมวด - เร็วและปลอดภัย

### For Developers

1. **Always use the new API**: `exportLargeBOQ()` instead of old `exportToPDF()`
2. **Handle progress callbacks**: Show loading UI
3. **Support cancellation**: Add cancel button
4. **Monitor telemetry**: Track failures and performance
5. **Test at scale**: Test with 500, 680, 1000 items

## 🔧 Configuration

### Environment Variables

```bash
# Production mode (strict CORS, etc.)
ENV=production

# Dev mode (relaxed for testing)
ENV=development
```

### CSS Classes

```css
/* Skinny export container */
.export-skinny {
  position: fixed !important;
  top: -9999px !important;
  width: 210mm !important;
  background: #ffffff !important;
  font-family: "Sarabun", "Noto Sans Thai", sans-serif !important;
}

.export-skinny * {
  box-shadow: none !important;
  filter: none !important;
  text-shadow: none !important;
  position: static !important;
  transform: none !important;
  background-image: none !important;
}
```

## 🐛 Troubleshooting

### Issue: Export ช้ามาก (> 2 นาที)

**Solutions:**
1. ตรวจสอบ itemCount - ถ้า > 600 ควรแบ่งเอกสาร
2. ปิด DevTools (การ debug ทำให้ช้า)
3. ปิดแท็บอื่นใน browser
4. ลองใช้ AutoTable mode (ถ้ายังเป็น Canvas)

### Issue: Out of Memory

**Solutions:**
1. แบ่งเอกสารเป็นหลายไฟล์
2. ลด scale ลง (แก้ใน `getExportConfig`)
3. ลด imageQuality ลง (0.7-0.8)
4. ใช้ AutoTable mode

### Issue: PDF ไฟล์ใหญ่เกินไป

**Solutions:**
1. เปิด compression: `compress: true`
2. ลด imageQuality
3. ใช้ AutoTable mode (ไฟล์เล็กกว่า Canvas มาก)

### Issue: ยกเลิกแล้วยังมี element ค้างใน DOM

**Solutions:**
1. ตรวจสอบ cleanup ใน `finally` block
2. เช็ค `.export-skinny` elements: `document.querySelectorAll('.export-skinny')`
3. ลบ manual: `element.remove()`

### Issue: Export ล้มเหลวบ่อย

**Solutions:**
1. ดู telemetry: `getTelemetryStats()`
2. เช็ค error patterns
3. ลด concurrent exports (ใช้ lock)
4. เพิ่ม timeout

## 📚 Related Files

- `/utils/pdfExportLarge.ts` - Main export logic
- `/components/LargeBOQExportDialog.tsx` - UI component
- `/styles/globals.css` - Export styles
- `/utils/pdfExport.ts` - Legacy export (still used)
- `/utils/calculations.ts` - BOQ calculations

## 🎓 Learning Resources

### jsPDF AutoTable
- Docs: https://github.com/simonbengtsson/jsPDF-AutoTable
- Examples: https://github.com/simonbengtsson/jsPDF-AutoTable/tree/master/examples

### html2canvas
- Docs: https://html2canvas.hertzen.com/
- Configuration: https://html2canvas.hertzen.com/configuration

### BroadcastChannel
- MDN: https://developer.mozilla.org/en-US/docs/Web/API/Broadcast_Channel_API

## 🔮 Future Enhancements

### Phase 2
- Web Worker for image encoding/compression
- Server-side PDF generation for 1,000+ items
- Better pagination heuristics (keep table headers)
- Per-category subtotals

### Phase 3
- PDF streaming (start download before complete)
- Progressive rendering preview
- Smart page breaks (avoid splitting items)
- Custom templates

## 📝 Changelog

### v2.0.0 (2025-10-28) - P0 Release
- ✅ Auto mode switching (canvas < 300, autotable ≥ 300)
- ✅ Incremental rendering with memory cleanup
- ✅ Cancellation support with hard-abort
- ✅ Export queue lock (BroadcastChannel)
- ✅ Adaptive scale and quality
- ✅ Auto document splitting for 600+ items
- ✅ Telemetry tracking
- ✅ Skinny DOM container
- ✅ Performance targets: 500 items ≤ 60s, 680 items ≤ 70s

### v1.0.0 (Previous)
- Basic PDF export with html2canvas
- Single mode only
- No cancellation
- No telemetry

---

**Maintained by**: EZBOQ Development Team  
**Last Updated**: 2025-10-28  
**Status**: ✅ Production Ready
