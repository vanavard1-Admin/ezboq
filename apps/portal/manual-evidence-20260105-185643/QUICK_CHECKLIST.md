# Quick Checklist - 7 Files

## ⏱️ 20 Minutes Total

### ✅ Screenshots (5 files) - 12 min
- [ ] `screenshots/01-documents-list.png` - Navigate to `/dashboard/documents`
- [ ] `screenshots/02-create-document.png` - Navigate to `/dashboard/documents/new`
- [ ] `screenshots/03-draft-document.png` - Click any draft document
- [ ] `screenshots/04-confirm-document.png` - Click confirm on draft
- [ ] `screenshots/05-report.png` - Navigate to `/dashboard/reports`

### ✅ Network Logs (2 files) - 5 min
- [ ] `network-logs/network.har` - DevTools → Network → Save all as HAR
- [ ] `network-logs/console.log` - DevTools → Console → Copy all → Save

### ✅ Update & Verify (3 min)
- [ ] Update `EVIDENCE_SUMMARY.md` (⏳ → ✅)
- [ ] Run `./verify-evidence.sh` → Must see ✅ All files present
- [ ] Run copy script → Must see ✅ Copy successful

---

## 🚀 Quick Commands

### Verify
```bash
cd /Users/l168/Documents/EzDoc/web/manual-evidence-20260105-185643
./verify-evidence.sh
```

### Copy (Only if PASS)
```bash
cd /Users/l168/Documents/EzDoc
./qa-evidence/CEO_SUBMISSION_PACKAGE/copy-frontend-evidence.sh
```

---

**Time**: 20 minutes  
**Status**: ⏳ Start now!






