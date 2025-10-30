# Large BOQ Export - Integration Guide

## Quick Start Integration

### Step 1: Import Required Components

```typescript
// In your BOQ page component
import { useState } from 'react';
import { LargeBOQExportDialog } from '../components/LargeBOQExportDialog';
import { 
  exportLargeBOQ, 
  cancelExport,
  pickExportMode,
  shouldOfferAutoSplit,
  type LargeBOQExportOptions 
} from '../utils/pdfExportLarge';
import { Button } from '../components/ui/button';
import { Download, FileText } from 'lucide-react';
```

### Step 2: Add State Management

```typescript
function BOQPage() {
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [boqItems, setBoqItems] = useState<BOQItem[]>([]);
  
  // ... your existing state
}
```

### Step 3: Create Export Handler

```typescript
const handleExportPDF = () => {
  // Check item count and show appropriate UI
  const itemCount = boqItems.length;
  const mode = pickExportMode(itemCount);
  
  if (itemCount === 0) {
    toast.error('ไม่มีรายการในเอกสาร');
    return;
  }
  
  if (itemCount > 1000) {
    const confirmed = confirm(
      `เอกสารมี ${itemCount} รายการ ซึ่งมากเกินไป\n\n` +
      `แนะนำให้ลดจำนวนรายการหรือแบ่งเป็นหลายเอกสาร\n\n` +
      `ต้องการดำเนินการต่อหรือไม่? (อาจใช้เวลานาน)`
    );
    
    if (!confirmed) return;
  }
  
  // Open dialog
  setExportDialogOpen(true);
};
```

### Step 4: Prepare Export Options

```typescript
// In your component
const exportOptions: LargeBOQExportOptions = {
  projectTitle,
  projectDescription,
  company: companyInfo,
  customer: customerInfo,
  profile: userProfile,
  items: boqItems,
  summary: calculatedSummary,
  filename: projectTitle || 'BOQ',
  elementId: 'boq-export-section', // For canvas mode
};
```

### Step 5: Add UI Button

```typescript
return (
  <div>
    {/* Your existing BOQ UI */}
    
    {/* Export Button */}
    <Button
      onClick={handleExportPDF}
      className="gap-2"
      disabled={boqItems.length === 0}
    >
      <Download className="w-4 h-4" />
      ส่งออก PDF
      {boqItems.length >= 300 && (
        <span className="text-xs opacity-70">
          (โหมด AutoTable)
        </span>
      )}
    </Button>
    
    {/* Export Dialog */}
    <LargeBOQExportDialog
      open={exportDialogOpen}
      onClose={() => setExportDialogOpen(false)}
      exportOptions={exportOptions}
    />
  </div>
);
```

## Advanced Integration

### Show Export Info Before Opening Dialog

```typescript
const handleExportPDF = () => {
  const itemCount = boqItems.length;
  const mode = pickExportMode(itemCount);
  const shouldSplit = shouldOfferAutoSplit(itemCount);
  
  // Show info toast
  toast.info('กำลังเตรียมข้อมูล...', {
    description: `${itemCount} รายการ | โหมด: ${mode === 'canvas' ? 'ภาพสวย' : 'ตารางอัตโนมัติ'}`,
  });
  
  setExportDialogOpen(true);
};
```

### Direct Export (Without Dialog)

```typescript
const handleQuickExport = async () => {
  try {
    await exportLargeBOQ({
      ...exportOptions,
      onProgress: (current, total, status) => {
        // Show progress toast or update state
        console.log(`${current}/${total} - ${status}`);
      },
    });
    
    toast.success('ส่งออก PDF สำเร็จ');
  } catch (error: any) {
    toast.error('ส่งออกล้มเหลว', {
      description: error.message,
    });
  }
};
```

### With Custom Progress UI

```typescript
const [exporting, setExporting] = useState(false);
const [exportProgress, setExportProgress] = useState(0);
const [exportStatus, setExportStatus] = useState('');

const handleExportWithProgress = async () => {
  setExporting(true);
  setExportProgress(0);
  
  try {
    await exportLargeBOQ({
      ...exportOptions,
      onProgress: (current, total, status) => {
        setExportProgress(current);
        setExportStatus(status);
      },
    });
  } catch (error) {
    // Handle error
  } finally {
    setExporting(false);
  }
};

// In JSX
{exporting && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <Card className="p-6 max-w-md w-full">
      <div className="space-y-4">
        <h3>กำลังส่งออก PDF...</h3>
        <Progress value={exportProgress} />
        <p className="text-sm text-muted-foreground">{exportStatus}</p>
        <Button onClick={() => cancelExport()} variant="destructive">
          ยกเลิก
        </Button>
      </div>
    </Card>
  </div>
)}
```

### Split Export Example

```typescript
import { splitByCategory } from '../utils/pdfExportLarge';

const handleSplitExport = async () => {
  const grouped = splitByCategory(boqItems);
  const categories = Array.from(grouped.keys());
  
  if (categories.length === 0) {
    toast.error('ไม่พบหมวดหมู่');
    return;
  }
  
  const confirmed = confirm(
    `พบ ${categories.length} หมวดหมู่:\n` +
    categories.map(c => `- ${c}`).join('\n') +
    `\n\nต้องการส่งออกแยกตามหมวดหมู่หรือไม่?`
  );
  
  if (!confirmed) return;
  
  // Export will automatically split
  setExportDialogOpen(true);
};
```

## Integration Checklist

- [ ] Import components และ utilities
- [ ] เพิ่ม state สำหรับ dialog
- [ ] สร้าง export options object
- [ ] เพิ่มปุ่ม Export ใน UI
- [ ] เพิ่ม LargeBOQExportDialog component
- [ ] ทดสอบกับ < 300 รายการ (Canvas mode)
- [ ] ทดสอบกับ ≥ 300 รายการ (AutoTable mode)
- [ ] ทดสอบกับ ≥ 600 รายการ (Auto split)
- [ ] ทดสอบการยกเลิก
- [ ] ทดสอบหลายแท็บพร้อมกัน (Lock)
- [ ] เช็ค telemetry ว่าทำงานถูกต้อง

## Migration from Old Export

### Before (Old API)

```typescript
import { exportToPDF } from '../utils/pdfExport';

await exportToPDF('boq-export-section', {
  filename: 'BOQ',
  format: 'a4',
  orientation: 'portrait',
});
```

### After (New API)

```typescript
import { exportLargeBOQ } from '../utils/pdfExportLarge';

await exportLargeBOQ({
  projectTitle: 'โครงการ ABC',
  company: companyInfo,
  customer: customerInfo,
  profile: userProfile,
  items: boqItems,
  summary: calculatedSummary,
  filename: 'BOQ',
  elementId: 'boq-export-section',
});
```

### Gradual Migration Strategy

1. **Phase 1**: เพิ่ม new API ควบคู่กับ old API
2. **Phase 2**: ให้ผู้ใช้เลือกระหว่าง "โหมดเก่า" และ "โหมดใหม่"
3. **Phase 3**: Default ให้ใช้ new API สำหรับ ≥ 300 รายการ
4. **Phase 4**: เปลี่ยนเป็น new API ทั้งหมด

```typescript
const handleExport = async () => {
  const itemCount = boqItems.length;
  
  // Auto select based on item count
  if (itemCount >= 300) {
    // Use new API
    await exportLargeBOQ({ ... });
  } else {
    // Use old API (optional)
    await exportToPDF('boq-export-section', { ... });
  }
};
```

## Testing Guide

### Unit Tests

```typescript
import { pickExportMode, pickScale, shouldOfferAutoSplit } from '../utils/pdfExportLarge';

describe('Large BOQ Export', () => {
  test('pickExportMode returns canvas for < 300 items', () => {
    expect(pickExportMode(100)).toBe('canvas');
    expect(pickExportMode(299)).toBe('canvas');
  });
  
  test('pickExportMode returns autotable for >= 300 items', () => {
    expect(pickExportMode(300)).toBe('autotable');
    expect(pickExportMode(500)).toBe('autotable');
  });
  
  test('shouldOfferAutoSplit returns true for >= 600 items', () => {
    expect(shouldOfferAutoSplit(599)).toBe(false);
    expect(shouldOfferAutoSplit(600)).toBe(true);
  });
});
```

### Manual Testing

1. **Small BOQ (< 100 items)**
   - Should complete in < 10s
   - Uses canvas mode
   - High quality output

2. **Medium BOQ (100-300 items)**
   - Should complete in 20-40s
   - Uses canvas mode
   - May show progress

3. **Large BOQ (300-500 items)**
   - Should complete in 30-60s
   - Uses AutoTable mode
   - Clear table format

4. **Very Large BOQ (500-600 items)**
   - Should complete in 40-70s
   - Uses AutoTable mode
   - May take 1 minute

5. **Huge BOQ (≥ 600 items)**
   - Should offer split option
   - Multiple files if split accepted
   - Each file < 60s

6. **Cancellation Test**
   - Start export of large BOQ
   - Click cancel mid-way
   - Should abort immediately
   - No leftover elements in DOM

7. **Multi-tab Test**
   - Open 2 tabs
   - Try export in both simultaneously
   - Second one should show "already in progress"

## Troubleshooting Common Integration Issues

### Issue: Dialog ไม่เปิด

```typescript
// ตรวจสอบ state
console.log('exportDialogOpen:', exportDialogOpen);

// ตรวจสอบ props
console.log('exportOptions:', exportOptions);

// เช็ค error console
```

### Issue: Progress ไม่อัพเดต

```typescript
// ตรวจสอบ callback
onProgress: (current, total, status) => {
  console.log('Progress:', { current, total, status });
  setProgress(current);
},
```

### Issue: Export ไม่สำเร็จ

```typescript
// เช็ค element ID
const element = document.getElementById(exportOptions.elementId);
console.log('Export element:', element);

// เช็ค data
console.log('Items:', exportOptions.items.length);
console.log('Summary:', exportOptions.summary);
```

### Issue: Memory leak

```typescript
// เช็ค leftover elements
console.log('Export containers:', 
  document.querySelectorAll('.export-skinny').length
);

// Manual cleanup
document.querySelectorAll('.export-skinny').forEach(el => el.remove());
```

## Performance Optimization Tips

### 1. Lazy Load Export Code

```typescript
// Only load when needed
const handleExport = async () => {
  const { exportLargeBOQ } = await import('../utils/pdfExportLarge');
  await exportLargeBOQ({ ... });
};
```

### 2. Memoize Export Options

```typescript
import { useMemo } from 'react';

const exportOptions = useMemo(() => ({
  projectTitle,
  company,
  customer,
  profile,
  items: boqItems,
  summary,
  filename,
}), [projectTitle, company, customer, profile, boqItems, summary, filename]);
```

### 3. Debounce Multiple Clicks

```typescript
import { debounce } from 'lodash';

const handleExport = debounce(async () => {
  await exportLargeBOQ({ ... });
}, 1000, { leading: true, trailing: false });
```

## Support & Resources

- **Documentation**: `/LARGE_BOQ_GUIDE.md`
- **Source Code**: `/utils/pdfExportLarge.ts`
- **UI Component**: `/components/LargeBOQExportDialog.tsx`
- **Issue Tracker**: GitHub Issues
- **Discord**: #pdf-export channel

---

**Last Updated**: 2025-10-28
