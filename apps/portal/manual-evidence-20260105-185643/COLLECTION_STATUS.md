# Manual Evidence Collection Status

**Date:** 2026-01-05  
**Status:** ⚠️ IN PROGRESS  
**Path:** B (Manual Evidence - No E2E credentials)

---

## ✅ Completed

1. **Evidence B Script Run:**
   - ✅ Script executed: `npx ts-node --esm scripts/qa-evidence-b-buy-pack-happy.ts`
   - ✅ Output: `qa-evidence/CEO_SUBMISSION_PACKAGE/evidence-b-buy-pack-happy.md`
   - ⚠️ Note: Found test purchase (test-del-1767610682595) - may need real purchase

2. **Directory Structure:**
   - ✅ `web/manual-evidence-20260105-185643/` created
   - ✅ `verify-evidence.sh` ready
   - ✅ Documentation files ready

---

## ⏳ Pending (ต้องทำใน 18 นาที)

### Screenshots (5 files)
- [ ] `screenshots/01-documents-list.png`
- [ ] `screenshots/02-create-document.png`
- [ ] `screenshots/03-draft-document.png`
- [ ] `screenshots/04-confirm-document.png`
- [ ] `screenshots/05-report.png`

### Network Logs (2 files)
- [ ] `network-logs/network.har`
- [ ] `network-logs/console.log`

### Documentation Updates
- [ ] Update `EVIDENCE_SUMMARY.md` (change ⏳ to ✅)
- [ ] Update `EVIDENCE_CHECKLIST.md` (mark items complete)

---

## 📋 Quick Collection Guide

### Step 1: Collect Screenshots (5 minutes)
1. Open browser DevTools (F12)
2. Navigate to each page:
   - `/dashboard/documents` → Screenshot → Save as `01-documents-list.png`
   - `/dashboard/documents/new` → Screenshot → Save as `02-create-document.png`
   - View draft document → Screenshot → Save as `03-draft-document.png`
   - Confirm document → Screenshot → Save as `04-confirm-document.png`
   - `/dashboard/reports` → Screenshot → Save as `05-report.png`
3. Save all to `screenshots/` folder

### Step 2: Export Network Logs (3 minutes)
1. Open DevTools → Network tab
2. Navigate through all 5 pages
3. Right-click in Network tab → "Save all as HAR" → Save as `network-logs/network.har`
4. Copy console output → Save as `network-logs/console.log`

### Step 3: Update Documentation (2 minutes)
1. Open `EVIDENCE_SUMMARY.md`
2. Change all ⏳ to ✅ for completed items
3. Fill in API verification details from HAR file
4. Update `EVIDENCE_CHECKLIST.md` - mark all items as [x]

### Step 4: Verify (1 minute)
```bash
cd /Users/l168/Documents/EzDoc/web/manual-evidence-20260105-185643
./verify-evidence.sh
```

**Expected:** ✅ All evidence files present!

---

## 🎯 DoD Checklist

- [x] Evidence B script run (backend evidence collected)
- [ ] Screenshots 01-05 collected (5 files)
- [ ] Network logs collected (HAR + console.log)
- [ ] EVIDENCE_SUMMARY.md updated (all ⏳ → ✅)
- [ ] EVIDENCE_CHECKLIST.md updated (all [ ] → [x])
- [ ] verify-evidence.sh PASS (0 errors)

---

## ⚠️ Notes

1. **Evidence B Purchase:** Current purchase (test-del-1767610682595) is a test purchase. May need to find a real purchase with payment_events for better evidence.

2. **Time Limit:** 18 minutes total for manual evidence collection

3. **Fallback:** If screenshots cannot be collected, document the reason in EVIDENCE_SUMMARY.md

---

**Last Updated:** 2026-01-05T19:20:00.000Z






