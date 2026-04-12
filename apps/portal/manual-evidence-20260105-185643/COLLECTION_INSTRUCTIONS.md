# Evidence Collection Instructions

## Quick Start

1. **Open browser** and navigate to app (http://localhost:3000)
2. **Open DevTools** (F12 or Cmd+Option+I)
3. **Follow steps below** for each page
4. **Save files** to this folder structure

## Step-by-Step Collection

### 1. Documents List Screenshot

1. Navigate to: `/dashboard/documents`
2. Wait for page to load completely
3. Take screenshot:
   - **Mac**: Cmd+Shift+4, select area
   - **Windows**: Win+Shift+S
   - **Browser**: Right click → Inspect → Screenshot
4. Save as: `screenshots/01-documents-list.png`
5. Verify: Can see document list

### 2. Create Document Screenshot

1. Navigate to: `/dashboard/documents/new`
2. Wait for form to load
3. Take screenshot
4. Save as: `screenshots/02-create-document.png`
5. Verify: Form fields visible

### 3. Draft Document Screenshot

1. Navigate to: `/dashboard/documents` (or click on a draft)
2. Open a draft document
3. Take screenshot
4. Save as: `screenshots/03-draft-document.png`
5. Verify: Draft content visible

### 4. Confirm Document Screenshot

1. Open a draft document
2. Click "Confirm" button
3. Take screenshot (before or after confirmation)
4. Save as: `screenshots/04-confirm-document.png`
5. Verify: Confirm action visible

### 5. Report Screenshot

1. Navigate to: `/dashboard/reports` (or report page)
2. Wait for report to load
3. Take screenshot
4. Save as: `screenshots/05-report.png`
5. Verify: Report data visible

## Network Logs Collection

### HAR File Export

1. **Open DevTools** (F12)
2. Go to **Network** tab
3. **Clear network log** (trash icon)
4. **Navigate through all 5 pages**:
   - Documents list
   - Create document
   - Draft document
   - Confirm document
   - Report
5. **Right click** in Network tab
6. Select **"Save all as HAR with content"**
7. Save to: `network-logs/network.har`

### Console Logs Export

1. **Open DevTools** (F12)
2. Go to **Console** tab
3. **Clear console** (trash icon)
4. **Navigate through all 5 pages** (same as above)
5. **Select all** console output (Cmd+A / Ctrl+A)
6. **Copy** (Cmd+C / Ctrl+C)
7. **Paste** into text file
8. Save to: `network-logs/console.log`

## Verification Checklist

After collection, verify:

- [ ] All 5 screenshots saved in `screenshots/` folder
- [ ] HAR file saved in `network-logs/` folder
- [ ] Console log saved in `network-logs/` folder
- [ ] Screenshots show correct pages
- [ ] Network logs show API calls
- [ ] Console logs show API success messages
- [ ] `EVIDENCE_SUMMARY.md` filled out

## Troubleshooting

### Screenshot Issues
- Use browser DevTools screenshot tool if system screenshot doesn't work
- Make sure page is fully loaded before screenshot
- Include full page if possible

### Network Log Issues
- Make sure to clear network log before starting
- Navigate through pages slowly to capture all requests
- Check that HAR file is not empty

### Console Log Issues
- Make sure console is cleared before starting
- Copy all output, including errors (if any)
- Verify console.log file is not empty

## File Structure After Collection

```
manual-evidence-20260105-185643/
├── README.md
├── EVIDENCE_CHECKLIST.md
├── EVIDENCE_SUMMARY.md
├── COLLECTION_INSTRUCTIONS.md (this file)
├── screenshots/
│   ├── 01-documents-list.png ✅
│   ├── 02-create-document.png ✅
│   ├── 03-draft-document.png ✅
│   ├── 04-confirm-document.png ✅
│   └── 05-report.png ✅
└── network-logs/
    ├── network.har ✅
    └── console.log ✅
```

## Completion

Once all files are collected:
1. Fill out `EVIDENCE_SUMMARY.md`
2. Check off items in `EVIDENCE_CHECKLIST.md`
3. Verify all files are present
4. Attach entire folder to deliverable






