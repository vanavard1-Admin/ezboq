# Copy to CEO Package - Instructions

## ⚠️ Important: Verify First!

**Do NOT copy until verification passes!**

## Step 1: Verify Evidence

```bash
cd /Users/l168/Documents/EzDoc/web/manual-evidence-20260105-185643
./verify-evidence.sh
```

**Must see**: `✅ All evidence files present!`

**If missing files**: Complete evidence collection first!

## Step 2: Copy to CEO Package

Once verification passes, run:

```bash
cd /Users/l168/Documents/EzDoc
./qa-evidence/CEO_SUBMISSION_PACKAGE/copy-frontend-evidence.sh
```

This script will:
1. ✅ Verify evidence passes
2. ✅ Create target directory
3. ✅ Copy entire folder
4. ✅ Verify copied files

## Target Location

Evidence will be copied to:
```
qa-evidence/CEO_SUBMISSION_PACKAGE/frontend-evidence/manual-evidence-20260105-185643/
```

## Manual Copy (If Script Fails)

If script fails, you can copy manually:

```bash
cd /Users/l168/Documents/EzDoc
mkdir -p qa-evidence/CEO_SUBMISSION_PACKAGE/frontend-evidence
cp -R web/manual-evidence-20260105-185643 qa-evidence/CEO_SUBMISSION_PACKAGE/frontend-evidence/
```

## Verification After Copy

After copying, verify:

```bash
cd qa-evidence/CEO_SUBMISSION_PACKAGE/frontend-evidence/manual-evidence-20260105-185643
./verify-evidence.sh
```

Should still show: `✅ All evidence files present!`

---

**Remember**: Only copy if verification passes! ✅






