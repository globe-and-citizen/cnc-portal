# Step 1: Remove Duplicate Contracts Content from Main README

**Priority**: CRITICAL  
**Estimated Time**: 10-15 minutes  
**Impact**: Removes 300+ lines of duplicate content

## Problem

The main README at `/docs/README.md` contains a complete copy of the contracts documentation (lines 265-573). This creates:

- Maintenance burden (changes must be made in two places)
- Confusion about which is the authoritative source
- Unnecessarily long README (573 lines instead of ~250)

## Solution

Remove the duplicate contracts content and replace it with a simple reference link to the actual contracts documentation.

## AI Prompt

```
I need to remove duplicate content from /Users/test/Documents/data/gc/cnc-portal/docs/README.md

The file currently contains contracts documentation duplicated from lines 265-573. 

Please:

1. Read the current README.md file (lines 265-573) to see the duplicate content
2. Remove lines 265-573 entirely
3. The README should end after the Glossary section (around line 264)
4. Verify the contracts documentation still exists in its proper location at /docs/contracts/

After this change:
- README will be reduced from 573 lines to approximately 264 lines
- Users can access contracts documentation through the navigation links already present in the README
- No duplicate content between files

Do NOT modify the contracts documentation files themselves - only remove the duplicate from README.md
```

## Verification

After completion, verify:

```bash
# Check new line count (should be ~264 lines, not 573)
wc -l /Users/test/Documents/data/gc/cnc-portal/docs/README.md

# Verify contracts docs still exist in proper location
ls -la /Users/test/Documents/data/gc/cnc-portal/docs/contracts/

# Check the end of README (should end with glossary, not contracts content)
tail -20 /Users/test/Documents/data/gc/cnc-portal/docs/README.md
```

## Expected Result

- `/docs/README.md` reduced from 573 to ~264 lines
- No contracts documentation content in main README
- Navigation links to contracts docs remain intact
- `/docs/contracts/` documentation unchanged and accessible

## Next Step

After completing this step, proceed to `02-fix-duplicate-headings.md`
