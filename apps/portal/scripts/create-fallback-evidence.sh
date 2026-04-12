#!/bin/bash
#
# Fallback Evidence Creator
# Creates manual evidence when Playwright tests cannot run
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WEB_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
EVIDENCE_DIR="$WEB_DIR/manual-evidence-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$EVIDENCE_DIR"

cd "$WEB_DIR"

echo "=========================================="
echo "Creating Fallback Evidence"
echo "=========================================="
echo ""
echo "Evidence directory: $EVIDENCE_DIR"
echo ""

# Create evidence structure
mkdir -p "$EVIDENCE_DIR/screenshots"
mkdir -p "$EVIDENCE_DIR/network-logs"
mkdir -p "$EVIDENCE_DIR/documentation"

# Create evidence checklist
cat > "$EVIDENCE_DIR/EVIDENCE_CHECKLIST.md" << 'EOF'
# Manual Evidence Checklist

## Required Evidence (5 Pages)

- [ ] 1. Documents List (`/dashboard/documents`)
- [ ] 2. Create Document (`/dashboard/documents/new`)
- [ ] 3. Draft Document (view draft)
- [ ] 4. Confirm Document (confirm action)
- [ ] 5. Report (monthly report view)

## Network Logs

- [ ] HAR file from DevTools (Network tab → Export HAR)
- [ ] Console logs showing API success

## Instructions

1. Open browser DevTools (F12)
2. Navigate to each page
3. Take screenshot (Cmd+Shift+4 on Mac, or browser screenshot)
4. Export HAR file: Network tab → Right click → Save all as HAR
5. Copy console logs showing API calls

## Files to Attach

- `screenshots/` - All 5 screenshots
- `network-logs/` - HAR file and console logs
- `documentation/` - This checklist and summary
EOF

# Create summary template
cat > "$EVIDENCE_DIR/EVIDENCE_SUMMARY.md" << 'EOF'
# Manual Evidence Summary

**Date**: $(date)
**Status**: Fallback Evidence (Playwright tests pending credentials)

## Evidence Provided

### Screenshots (5 pages)
1. Documents List - ✅/❌
2. Create Document - ✅/❌
3. Draft Document - ✅/❌
4. Confirm Document - ✅/❌
5. Report - ✅/❌

### Network Logs
- HAR File: ✅/❌
- Console Logs: ✅/❌

## Notes

- Playwright tests will be run tomorrow morning with valid credentials
- Manual evidence demonstrates all critical flows work
- API calls verified via network logs

## Next Steps

1. Run Playwright tests with credentials:
   ```bash
   export TEST_USER_EMAIL="real@ezdoc.app"
   export TEST_USER_PASSWORD="real-password"
   npm run e2e
   ```

2. Attach Playwright report when available
EOF

echo "✅ Evidence directory created: $EVIDENCE_DIR"
echo ""
echo "Next steps:"
echo "1. Open browser and navigate to each page"
echo "2. Take screenshots and save to: $EVIDENCE_DIR/screenshots/"
echo "3. Export HAR file to: $EVIDENCE_DIR/network-logs/"
echo "4. Fill in checklist: $EVIDENCE_DIR/EVIDENCE_CHECKLIST.md"
echo ""
echo "Evidence package ready for attachment"






