# Collect Evidence Now - Step by Step

## ⏱️ Time: 18 Minutes

**Location**: `/Users/l168/Documents/EzDoc/web/manual-evidence-20260105-185643/`

---

## Step 1: Open Browser & DevTools (2 min)

### 1.1 Start Dev Server (if not running)
```bash
cd /Users/l168/Documents/EzDoc/web
npm run dev
# Wait for: "Local: http://localhost:3000"
```

### 1.2 Open Browser
- Open browser → `http://localhost:3000`
- Press **F12** (or Cmd+Option+I on Mac) to open DevTools

### 1.3 Setup DevTools
1. Go to **Network** tab
2. Click **Clear** (trash icon) - clears network log
3. Go to **Console** tab
4. Click **Clear** (trash icon) - clears console

---

## Step 2: Collect Screenshots (10 min)

### 2.1 Documents List
1. Navigate to: `http://localhost:3000/dashboard/documents`
2. Wait for page to fully load
3. Take screenshot:
   - **Mac**: Cmd+Shift+4, select area
   - **Windows**: Win+Shift+S
   - **Browser**: Right click → Inspect → Screenshot tool
4. **Save as**: `screenshots/01-documents-list.png`
   - **Full path**: `/Users/l168/Documents/EzDoc/web/manual-evidence-20260105-185643/screenshots/01-documents-list.png`
5. ✅ Verify file exists

### 2.2 Create Document
1. Navigate to: `http://localhost:3000/dashboard/documents/new`
2. Wait for form to load
3. Take screenshot
4. **Save as**: `screenshots/02-create-document.png`
5. ✅ Verify file exists

### 2.3 Draft Document
1. Go back to documents list
2. Click on any **DRAFT** document
3. Wait for draft to load
4. Take screenshot
5. **Save as**: `screenshots/03-draft-document.png`
6. ✅ Verify file exists

### 2.4 Confirm Document
1. On the draft page, click **"Confirm"** button
2. Wait for confirmation dialog/success message
3. Take screenshot
4. **Save as**: `screenshots/04-confirm-document.png`
5. ✅ Verify file exists

### 2.5 Report
1. Navigate to: `http://localhost:3000/dashboard/reports` (or your report page URL)
2. Wait for report to load
3. Take screenshot
4. **Save as**: `screenshots/05-report.png`
5. ✅ Verify file exists

---

## Step 3: Export Network Logs (5 min)

### 3.1 Export HAR File
1. Go to **Network** tab in DevTools
2. **Right click** anywhere in the network log list
3. Select **"Save all as HAR with content"**
4. **Save to**: `network-logs/network.har`
   - **Full path**: `/Users/l168/Documents/EzDoc/web/manual-evidence-20260105-185643/network-logs/network.har`
5. ✅ Verify file exists and is not empty

### 3.2 Export Console Logs
1. Go to **Console** tab in DevTools
2. **Select all** text (Cmd+A / Ctrl+A)
3. **Copy** (Cmd+C / Ctrl+C)
4. Create new file: `network-logs/console.log`
5. **Paste** content and save
6. ✅ Verify file exists and has content

---

## Step 4: Update Summary (1 min)

1. Open `EVIDENCE_SUMMARY.md`
2. Find all `⏳ **TO BE COLLECTED**`
3. Replace with `✅ **COLLECTED**`
4. Check HAR file for API calls
5. Fill in API verification section (optional)
6. Save file

---

## Step 5: Verify (1 min)

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

## ✅ Final Checklist

Before submitting, verify:

- [ ] `screenshots/01-documents-list.png` exists
- [ ] `screenshots/02-create-document.png` exists
- [ ] `screenshots/03-draft-document.png` exists
- [ ] `screenshots/04-confirm-document.png` exists
- [ ] `screenshots/05-report.png` exists
- [ ] `network-logs/network.har` exists (not empty)
- [ ] `network-logs/console.log` exists (has content)
- [ ] `EVIDENCE_SUMMARY.md` updated (⏳ → ✅)
- [ ] `./verify-evidence.sh` shows ✅ All files present

---

## 📤 Delivery

Once verified, attach entire folder:
```
/Users/l168/Documents/EzDoc/web/manual-evidence-20260105-185643/
```

**Done!** ✅






