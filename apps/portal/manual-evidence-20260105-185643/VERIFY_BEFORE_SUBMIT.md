# Verify Before Submit - Quick Checklist

## ⚠️ Do NOT submit until all checks pass!

### Quick Verification

```bash
cd /Users/l168/Documents/EzDoc/web/manual-evidence-20260105-185643
./verify-evidence.sh
```

**Must see**: `✅ All evidence files present!`

---

## Required Files (7 files)

### Screenshots (5 files)
```bash
ls -la screenshots/
```

Must have:
- ✅ `01-documents-list.png`
- ✅ `02-create-document.png`
- ✅ `03-draft-document.png`
- ✅ `04-confirm-document.png`
- ✅ `05-report.png`

### Network Logs (2 files)
```bash
ls -la network-logs/
```

Must have:
- ✅ `network.har` (not empty, > 1KB)
- ✅ `console.log` (has content, > 100 bytes)

---

## File Size Check

### Screenshots
Each screenshot should be:
- **Size**: > 10KB (not placeholder)
- **Format**: PNG
- **Content**: Actual page screenshot

### HAR File
- **Size**: > 1KB
- **Format**: JSON/HAR
- **Content**: Network requests

### Console Log
- **Size**: > 100 bytes
- **Format**: Text
- **Content**: Console output

---

## Summary Update Check

```bash
grep -c "✅ **COLLECTED**" EVIDENCE_SUMMARY.md
```

Should see: At least 5 ✅ (for 5 screenshots + 2 logs)

---

## Final Verification Command

```bash
cd /Users/l168/Documents/EzDoc/web/manual-evidence-20260105-185643

# Check all files exist
ls screenshots/*.png | wc -l  # Should be 5
ls network-logs/*.har network-logs/*.log | wc -l  # Should be 2

# Check file sizes
ls -lh screenshots/*.png | awk '{print $5}'  # Should all be > 10K
ls -lh network-logs/network.har | awk '{print $5}'  # Should be > 1K
ls -lh network-logs/console.log | awk '{print $5}'  # Should be > 100B

# Run verification script
./verify-evidence.sh
```

**All must pass!** ✅

---

## ❌ Common Errors

### Error: "screenshot missing"
**Fix**: Take screenshot and save with correct filename

### Error: "HAR file too small"
**Fix**: Make sure to navigate through all 5 pages before exporting

### Error: "console.log empty"
**Fix**: Make sure console has output, copy all text

### Error: "Summary not updated"
**Fix**: Change ⏳ to ✅ in EVIDENCE_SUMMARY.md

---

## ✅ Ready to Submit

When all checks pass:
1. ✅ All 7 files present
2. ✅ File sizes correct
3. ✅ Summary updated
4. ✅ Verification script passes

**Then submit entire folder!** 📤






