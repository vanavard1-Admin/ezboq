# DO THIS NOW - 20 Minutes to Complete

## ⏱️ Time: 20 Minutes | Goal: 7 Files

**Location**: `/Users/l168/Documents/EzDoc/web/manual-evidence-20260105-185643/`

---

## 🚀 Step-by-Step (Follow Exactly)

### Step 1: Open Browser & DevTools (2 min)

1. **Open Terminal** and start dev server (if not running):
   ```bash
   cd /Users/l168/Documents/EzDoc/web
   npm run dev
   ```
   Wait for: `Local: http://localhost:3000`

2. **Open Browser** → Go to: `http://localhost:3000`

3. **Open DevTools**:
   - Press **F12** (Windows/Linux)
   - Or **Cmd+Option+I** (Mac)

4. **Setup DevTools**:
   - Go to **Network** tab
   - Click **Clear** (trash icon) - clears network log
   - Go to **Console** tab
   - Click **Clear** (trash icon) - clears console

---

### Step 2: Collect 5 Screenshots (12 min)

**IMPORTANT**: Save with **EXACT filenames** (case-sensitive!)

#### Screenshot 1: Documents List (2 min)
1. Navigate to: `http://localhost:3000/dashboard/documents`
2. Wait for page to fully load
3. Take screenshot:
   - **Mac**: Cmd+Shift+4, select area, save
   - **Windows**: Win+Shift+S, save
   - **Browser**: Right click → Inspect → Screenshot tool
4. **Save as**: `01-documents-list.png`
5. **Save to**: `/Users/l168/Documents/EzDoc/web/manual-evidence-20260105-185643/screenshots/01-documents-list.png`
6. ✅ Verify: File exists and size > 10KB

#### Screenshot 2: Create Document (2 min)
1. Navigate to: `http://localhost:3000/dashboard/documents/new`
2. Wait for form to load
3. Take screenshot
4. **Save as**: `02-create-document.png`
5. **Save to**: `/Users/l168/Documents/EzDoc/web/manual-evidence-20260105-185643/screenshots/02-create-document.png`
6. ✅ Verify: File exists

#### Screenshot 3: Draft Document (3 min)
1. Go back to documents list: `http://localhost:3000/dashboard/documents`
2. Click on any **DRAFT** document (or navigate to draft URL)
3. Wait for draft to load
4. Take screenshot
5. **Save as**: `03-draft-document.png`
6. **Save to**: `/Users/l168/Documents/EzDoc/web/manual-evidence-20260105-185643/screenshots/03-draft-document.png`
7. ✅ Verify: File exists

#### Screenshot 4: Confirm Document (3 min)
1. On the draft page, click **"Confirm"** button
2. Wait for confirmation dialog or success message
3. Take screenshot (of dialog or success page)
4. **Save as**: `04-confirm-document.png`
5. **Save to**: `/Users/l168/Documents/EzDoc/web/manual-evidence-20260105-185643/screenshots/04-confirm-document.png`
6. ✅ Verify: File exists

#### Screenshot 5: Report (2 min)
1. Navigate to: `http://localhost:3000/dashboard/reports` (or your report page URL)
2. Wait for report to load
3. Take screenshot
4. **Save as**: `05-report.png`
5. **Save to**: `/Users/l168/Documents/EzDoc/web/manual-evidence-20260105-185643/screenshots/05-report.png`
6. ✅ Verify: File exists

---

### Step 3: Export Network Logs (5 min)

#### 3.1 Export HAR File (2 min)
1. Go to **Network** tab in DevTools
2. **Right click** anywhere in the network log list
3. Select **"Save all as HAR with content"**
4. **Save to**: `/Users/l168/Documents/EzDoc/web/manual-evidence-20260105-185643/network-logs/network.har`
5. ✅ Verify: File exists and size > 1KB

#### 3.2 Export Console Logs (3 min)
1. Go to **Console** tab in DevTools
2. **Select all** text: Cmd+A (Mac) or Ctrl+A (Windows)
3. **Copy**: Cmd+C (Mac) or Ctrl+C (Windows)
4. Open text editor (TextEdit, Notepad, etc.)
5. **Paste** content
6. **Save as**: `console.log`
7. **Save to**: `/Users/l168/Documents/EzDoc/web/manual-evidence-20260105-185643/network-logs/console.log`
8. ✅ Verify: File exists and has content

---

### Step 4: Update Summary (1 min)

1. Open file: `EVIDENCE_SUMMARY.md`
2. Find all: `⏳ **TO BE COLLECTED**`
3. Replace with: `✅ **COLLECTED**`
4. Save file

---

### Step 5: Verify (1 min)

```bash
cd /Users/l168/Documents/EzDoc/web/manual-evidence-20260105-185643
./verify-evidence.sh
```

**Expected Output**:
```
✅ All evidence files present!
✅ Ready for delivery!
```

**If errors**: Fix missing files and run again

---

### Step 6: Copy to CEO Package (1 min)

**Only if verification PASSES!**

```bash
cd /Users/l168/Documents/EzDoc
./qa-evidence/CEO_SUBMISSION_PACKAGE/copy-frontend-evidence.sh
```

**Expected Output**:
```
✅ Verification PASSED
✅ Copy successful
✅ Frontend evidence copied successfully!
```

---

## ✅ Final Checklist

Before submitting, verify:

- [ ] `screenshots/01-documents-list.png` exists (> 10KB)
- [ ] `screenshots/02-create-document.png` exists (> 10KB)
- [ ] `screenshots/03-draft-document.png` exists (> 10KB)
- [ ] `screenshots/04-confirm-document.png` exists (> 10KB)
- [ ] `screenshots/05-report.png` exists (> 10KB)
- [ ] `network-logs/network.har` exists (> 1KB)
- [ ] `network-logs/console.log` exists (> 100 bytes)
- [ ] `EVIDENCE_SUMMARY.md` updated (⏳ → ✅)
- [ ] `./verify-evidence.sh` shows ✅ All files present
- [ ] Copied to CEO package successfully

---

## 📋 Exact File Paths (Copy-Paste Ready)

### Screenshots
```
/Users/l168/Documents/EzDoc/web/manual-evidence-20260105-185643/screenshots/01-documents-list.png
/Users/l168/Documents/EzDoc/web/manual-evidence-20260105-185643/screenshots/02-create-document.png
/Users/l168/Documents/EzDoc/web/manual-evidence-20260105-185643/screenshots/03-draft-document.png
/Users/l168/Documents/EzDoc/web/manual-evidence-20260105-185643/screenshots/04-confirm-document.png
/Users/l168/Documents/EzDoc/web/manual-evidence-20260105-185643/screenshots/05-report.png
```

### Network Logs
```
/Users/l168/Documents/EzDoc/web/manual-evidence-20260105-185643/network-logs/network.har
/Users/l168/Documents/EzDoc/web/manual-evidence-20260105-185643/network-logs/console.log
```

---

## ⚠️ Important Notes

1. **Exact filenames** - Must match exactly (01-05, not 1-5)
2. **Case-sensitive** - `01-documents-list.png` not `01-Documents-List.png`
3. **File sizes** - Screenshots should be > 10KB (real screenshots, not placeholders)
4. **Verify first** - Don't copy until verification passes
5. **Update summary** - Change ⏳ to ✅ in EVIDENCE_SUMMARY.md

---

## 🎯 Definition of Done

- [x] All 7 files collected
- [x] Exact filenames
- [x] File sizes correct
- [x] Summary updated
- [x] Verification passes
- [x] Copied to CEO package

**Status**: ⏳ **READY TO START - 20 MINUTES**






