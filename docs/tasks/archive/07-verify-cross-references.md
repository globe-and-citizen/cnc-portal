# Step 7: Verify Cross-References

**Priority**: MEDIUM  
**Estimated Time**: 30-45 minutes  
**Impact**: Ensures all documentation links work correctly

## Problem

After creating new files and restructuring documentation, we need to verify that all cross-references between documentation files work correctly. Broken links create a poor user experience and make documentation harder to navigate.

## Solution

Systematically check all markdown links across the documentation and fix any broken references.

## AI Prompt

```
I need to verify and fix all cross-references in the CNC Portal documentation at /Users/test/Documents/data/gc/cnc-portal/docs/

Please perform a comprehensive link verification:

1. **Find all markdown links**: Search for links in all .md files in the docs/ folder:
   - Relative links: [text](./path/to/file.md)
   - Relative links: [text](../path/to/file.md)
   - Anchor links: [text](#section-name)
   - Cross-file anchors: [text](./file.md#section)

2. **Verify each link**:
   - Check if the target file exists
   - Check if anchor targets exist in the target file
   - Verify relative paths are correct

3. **Check these files specifically** (likely to have many cross-references):
   - /docs/README.md
   - /docs/platform/architecture.md
   - /docs/platform/feature-specification-guide.md
   - /docs/platform/security.md
   - /docs/platform/testing-strategy.md
   - /docs/platform/performance.md
   - /docs/platform/deployment.md (newly created)
   - /docs/platform/development-standards.md (newly created)
   - /docs/features/stats/functional-specification.md

4. **Fix broken links**:
   - Update paths that are incorrect
   - Add missing files if they should exist
   - Remove links to deleted files (like REORGANIZATION-SUMMARY.md)
   - Fix anchor references to renamed sections

5. **Standardize link format**:
   - Use relative paths consistently
   - Use .md extension for all markdown links
   - Use lowercase with hyphens for anchors (#section-name)

Please create a report showing:
- Total links found
- Links verified as working
- Broken links found and how to fix them
- Any recommendations for improvement

Then fix all broken links.
```

## Verification Commands

After completion, run these verification checks:

```bash
# Find all markdown links
grep -r -h '\[.*\](.*\.md)' /Users/test/Documents/data/gc/cnc-portal/docs/ | sort | uniq

# Check for broken relative links (files that don't exist)
cd /Users/test/Documents/data/gc/cnc-portal/docs/
for file in $(find . -name "*.md"); do
  echo "Checking links in $file"
  grep -o '\](\.\.*/[^)]*\.md)' "$file" | sed 's/](\(.*\))/\1/' | while read link; do
    if [ ! -f "$(dirname $file)/$link" ]; then
      echo "  BROKEN: $link"
    fi
  done
done

# Check for references to deleted files
grep -r "REORGANIZATION-SUMMARY" /Users/test/Documents/data/gc/cnc-portal/docs/
# Should return nothing if properly cleaned up
```

## Manual Verification

Manually verify critical navigation paths work:

1. Open `/docs/README.md` in VS Code or browser
2. Click through major navigation links
3. Verify "See also" references work
4. Check that newly created files (deployment.md, development-standards.md) are properly linked

## Expected Result

- All cross-references verified and working
- No broken links in documentation
- Consistent link format throughout
- Newly created files properly integrated into navigation
- Report of verification results

## Next Step

After completing this step, proceed to `08-add-architecture-diagrams.md`

## Phase 3 Progress

✅ Steps 1-5 (Phases 1-2): Critical and high-priority completed  
✅ Step 6: README navigation improved  
✅ Step 7: Cross-references verified  
⏳ Step 8: Architecture diagrams (next)
