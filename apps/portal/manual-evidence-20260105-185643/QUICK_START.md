# Quick Start - Collect Evidence in 10 Minutes

## 🚀 Fast Track (5 Steps)

### Step 1: Open Browser & DevTools
```bash
# Dev server should be running (check: http://localhost:3000)
# Open browser → http://localhost:3000
# Press F12 (or Cmd+Option+I) to open DevTools
```

### Step 2: Setup DevTools
1. Go to **Network** tab
2. Click **Clear** (trash icon) to clear network log
3. Go to **Console** tab  
4. Click **Clear** (trash icon) to clear console

### Step 3: Navigate & Screenshot (5 pages)

**Page 1: Documents List**
- Navigate to: `http://localhost:3000/dashboard/documents`
- Wait for page to load
- Take screenshot → Save as: `screenshots/01-documents-list.png`

**Page 2: Create Document**
- Navigate to: `http://localhost:3000/dashboard/documents/new`
- Wait for form to load
- Take screenshot → Save as: `screenshots/02-create-document.png`

**Page 3: Draft Document**
- Click on any draft document (or navigate to draft URL)
- Wait for draft to load
- Take screenshot → Save as: `screenshots/03-draft-document.png`

**Page 4: Confirm Document**
- On draft page, click "Confirm" button
- Wait for confirmation (or take screenshot of confirm dialog)
- Take screenshot → Save as: `screenshots/04-confirm-document.png`

**Page 5: Report**
- Navigate to: `http://localhost:3000/dashboard/reports` (or report page)
- Wait for report to load
- Take screenshot → Save as: `screenshots/05-report.png`

### Step 4: Export Network Logs

**HAR File**:
1. Go to **Network** tab in DevTools
2. Right click anywhere in the network log
3. Select **"Save all as HAR with content"**
4. Save to: `network-logs/network.har`

**Console Logs**:
1. Go to **Console** tab
2. Select all text (Cmd+A / Ctrl+A)
3. Copy (Cmd+C / Ctrl+C)
4. Create file: `network-logs/console.log`
5. Paste content and save

### Step 5: Fill Summary

1. Open `EVIDENCE_SUMMARY.md`
2. Change all `✅/❌` to `✅` for completed items
3. Fill in API verification details (check HAR file for API calls)
4. Save file

## ✅ Verification

After collection, verify:

```bash
cd /Users/l168/Documents/EzDoc/web/manual-evidence-20260105-185643

# Check screenshots
ls -la screenshots/
# Should see: 01-05 .png files

# Check network logs
ls -la network-logs/
# Should see: network.har and console.log

# Check summary
cat EVIDENCE_SUMMARY.md | grep "✅"
# Should see all items checked
```

## 📤 Delivery

Once complete, attach entire folder:
```
web/manual-evidence-20260105-185643/
```

**Done!** ✅






