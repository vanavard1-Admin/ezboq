# Manual Evidence Package

## Purpose

This package contains manual evidence for E2E test flows when Playwright automated tests cannot run due to credential requirements.

## Status

**Created**: 2025-01-05  
**Playwright Status**: Code complete, pending valid credentials  
**Evidence Status**: Ready for collection

## Required Evidence

### 1. Screenshots (5 pages)

Save screenshots to `screenshots/` folder:

1. **01-documents-list.png** - Documents list page (`/dashboard/documents`)
2. **02-create-document.png** - Create document form (`/dashboard/documents/new`)
3. **03-draft-document.png** - Draft document view
4. **04-confirm-document.png** - Confirm document action
5. **05-report.png** - Report page

### 2. Network Logs

Save to `network-logs/` folder:

1. **network.har** - Export from DevTools Network tab
2. **console.log** - Copy from DevTools Console tab

## How to Collect Evidence

### Screenshots

1. Open browser and navigate to app
2. For each page:
   - Navigate to the page
   - Take screenshot (Cmd+Shift+4 on Mac, or browser screenshot tool)
   - Save with correct filename to `screenshots/` folder

### Network Logs

1. Open DevTools (F12)
2. Go to Network tab
3. Navigate through all 5 pages
4. Right click in Network tab → "Save all as HAR"
5. Save to `network-logs/network.har`
6. Go to Console tab
7. Copy all console output
8. Save to `network-logs/console.log`

## Verification

After collecting evidence, verify:

- [ ] All 5 screenshots present
- [ ] HAR file shows API calls
- [ ] Console logs show API success
- [ ] Checklist completed (`EVIDENCE_CHECKLIST.md`)
- [ ] Summary filled (`EVIDENCE_SUMMARY.md`)

## Delivery

Attach entire `manual-evidence-*/` folder to deliverable.

## Note

Playwright automated tests will be run tomorrow morning with valid credentials. This manual evidence demonstrates that all critical flows work correctly.






