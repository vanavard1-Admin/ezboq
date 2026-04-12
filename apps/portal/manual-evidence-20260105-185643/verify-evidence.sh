#!/bin/bash
#
# Evidence Verification Script
# Checks if all required evidence files are present
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "=========================================="
echo "Evidence Verification"
echo "=========================================="
echo ""

ERRORS=0

# Check screenshots
echo "Checking screenshots..."
SCREENSHOTS=(
  "screenshots/01-documents-list.png"
  "screenshots/02-create-document.png"
  "screenshots/03-draft-document.png"
  "screenshots/04-confirm-document.png"
  "screenshots/05-report.png"
)

for file in "${SCREENSHOTS[@]}"; do
  if [ -f "$file" ]; then
    SIZE=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null || echo "0")
    if [ "$SIZE" -gt 1000 ]; then
      echo "  ✅ $file ($(numfmt --to=iec-i --suffix=B $SIZE 2>/dev/null || echo "${SIZE} bytes"))"
    else
      echo "  ⚠️  $file (too small, may be placeholder)"
      ERRORS=$((ERRORS + 1))
    fi
  else
    echo "  ❌ $file (missing)"
    ERRORS=$((ERRORS + 1))
  fi
done

echo ""
echo "Checking network logs..."

# Check HAR file
if [ -f "network-logs/network.har" ]; then
  SIZE=$(stat -f%z "network-logs/network.har" 2>/dev/null || stat -c%s "network-logs/network.har" 2>/dev/null || echo "0")
  if [ "$SIZE" -gt 1000 ]; then
    echo "  ✅ network-logs/network.har ($(numfmt --to=iec-i --suffix=B $SIZE 2>/dev/null || echo "${SIZE} bytes"))"
  else
    echo "  ⚠️  network-logs/network.har (too small)"
    ERRORS=$((ERRORS + 1))
  fi
else
  echo "  ❌ network-logs/network.har (missing)"
  ERRORS=$((ERRORS + 1))
fi

# Check console log
if [ -f "network-logs/console.log" ]; then
  SIZE=$(stat -f%z "network-logs/console.log" 2>/dev/null || stat -c%s "network-logs/console.log" 2>/dev/null || echo "0")
  if [ "$SIZE" -gt 100 ]; then
    echo "  ✅ network-logs/console.log ($(numfmt --to=iec-i --suffix=B $SIZE 2>/dev/null || echo "${SIZE} bytes"))"
  else
    echo "  ⚠️  network-logs/console.log (too small or empty)"
    ERRORS=$((ERRORS + 1))
  fi
else
  echo "  ❌ network-logs/console.log (missing)"
  ERRORS=$((ERRORS + 1))
fi

echo ""
echo "Checking documentation..."

# Check summary
if [ -f "EVIDENCE_SUMMARY.md" ]; then
  CHECKED=$(grep -c "✅" EVIDENCE_SUMMARY.md || echo "0")
  if [ "$CHECKED" -gt 0 ]; then
    echo "  ✅ EVIDENCE_SUMMARY.md (has $CHECKED checked items)"
  else
    echo "  ⚠️  EVIDENCE_SUMMARY.md (no checked items, may need to fill)"
  fi
else
  echo "  ❌ EVIDENCE_SUMMARY.md (missing)"
  ERRORS=$((ERRORS + 1))
fi

# Check checklist
if [ -f "EVIDENCE_CHECKLIST.md" ]; then
  echo "  ✅ EVIDENCE_CHECKLIST.md"
else
  echo "  ❌ EVIDENCE_CHECKLIST.md (missing)"
  ERRORS=$((ERRORS + 1))
fi

echo ""
echo "=========================================="
if [ $ERRORS -eq 0 ]; then
  echo "✅ All evidence files present!"
  echo "✅ Ready for delivery!"
  exit 0
else
  echo "❌ Missing $ERRORS required file(s)"
  echo "Please complete evidence collection"
  exit 1
fi






