#!/usr/bin/env bash
# Audit AI-agent docs for drift against the current codebase.
# Usage:  scripts/audit-doc-drift.sh
# Exits non-zero if drift is detected, so it's safe to wire into CI.

set -u
cd "$(dirname "$0")/.."

YELLOW='\033[1;33m'; RED='\033[0;31m'; GREEN='\033[0;32m'; NC='\033[0m'
fail=0
warn=0

DOC_PATHS=(
  "AGENTS.md"
  "CLAUDE.md"
  ".github/copilot-instructions.md"
  ".github/copilot-instructions"
)

# 1. Forbidden / stale terms ----------------------------------------------------
# When a pattern is removed from the codebase, add its name here so the docs
# can never silently re-introduce it. Keep this list short and intentional.
FORBIDDEN=(
  'useToastStore'
  'addSuccessToast'
  'addErrorToast'
  'daisyUI'
  'commitlint'
  '163 tests'
  '350+ tests'
)

echo "── Forbidden terms ──────────────────────────────────────────"
section_fail=0
for term in "${FORBIDDEN[@]}"; do
  hits=$(grep -rn --include='*.md' -- "$term" "${DOC_PATHS[@]}" 2>/dev/null \
         | grep -v 'audit-doc-drift.sh' \
         | grep -vE 'does not|no longer|removed|not currently|never|deprecated|\bdead\b|legacy' \
         || true)
  if [ -n "$hits" ]; then
    echo -e "${RED}✖ '$term' found in docs:${NC}"
    echo "$hits"
    section_fail=1
  fi
done
if [ $section_fail -eq 0 ]; then
  echo -e "${GREEN}✓ no forbidden terms${NC}"
else
  fail=1
fi

# 2. Broken intra-doc links -----------------------------------------------------
echo
echo "── Broken markdown links ────────────────────────────────────"
broken=0
while IFS= read -r f; do
  while IFS= read -r link; do
    # strip ()
    rel="${link#(}"; rel="${rel%)}"
    # skip http(s), anchors, mailto
    case "$rel" in http*|mailto*|'#'*) continue;; esac
    # strip anchor
    rel_path="${rel%%#*}"
    [ -z "$rel_path" ] && continue
    target="$(dirname "$f")/$rel_path"
    if [ ! -e "$target" ]; then
      echo -e "${RED}✖ $f → $rel${NC}"
      broken=1
    fi
  done < <(grep -oE '\]\(([^)]+\.md[^)]*)\)' "$f" 2>/dev/null | sed 's/^\](//')
done < <(find AGENTS.md CLAUDE.md .github/copilot-instructions.md .github/copilot-instructions -type f -name '*.md' 2>/dev/null)
if [ $broken -eq 0 ]; then
  echo -e "${GREEN}✓ no broken links${NC}"
else
  fail=1
fi

# 3. Canonical references must still exist --------------------------------------
echo
echo "── Canonical reference files ────────────────────────────────"
CANONICAL=(
  "app/src/components/__tests__/SelectComponent.spec.ts"
  "app/src/composables/__tests__/useContractFunction.spec.ts"
  "app/src/__tests__/wagmi.spec.ts"
  "app/src/utils/__tests__/currencyUtil.spec.ts"
  "app/src/composables/useSiwe.ts"
)
section_fail=0
for f in "${CANONICAL[@]}"; do
  if [ ! -e "$f" ]; then
    echo -e "${RED}✖ canonical reference missing: $f${NC}"
    echo "    → docs may point to a renamed/deleted file. Update the pointers."
    section_fail=1
  fi
done
if [ $section_fail -eq 0 ]; then
  echo -e "${GREEN}✓ all canonical references exist${NC}"
else
  fail=1
fi

# 4. Soft warnings (non-blocking) ----------------------------------------------
echo
echo "── Soft warnings ────────────────────────────────────────────"
# Hard-coded test counts (any "N tests" or "N+ tests" claim is suspicious)
counts=$(grep -rnE --include='*.md' '\b[0-9]{2,}\+? tests\b' "${DOC_PATHS[@]}" 2>/dev/null \
         | grep -v 'audit-doc-drift.sh' || true)
if [ -n "$counts" ]; then
  echo -e "${YELLOW}⚠ hard-coded test counts (drift-prone):${NC}"
  echo "$counts"
  warn=1
fi

# Toast pattern: any toast example must use color: success|error
toast_calls=$(grep -rnE --include='*.md' "toast\.add\(\{.*color:" "${DOC_PATHS[@]}" 2>/dev/null \
              | grep -vE "color: ['\"](success|error|info|warning|primary|neutral)['\"]" || true)
if [ -n "$toast_calls" ]; then
  echo -e "${YELLOW}⚠ toast.add examples without a recognised color:${NC}"
  echo "$toast_calls"
  warn=1
fi

[ $warn -eq 0 ] && echo -e "${GREEN}✓ no warnings${NC}"

echo
if [ $fail -ne 0 ]; then
  echo -e "${RED}DRIFT DETECTED — fix the items above and re-run.${NC}"
  exit 1
fi
if [ $warn -ne 0 ]; then
  echo -e "${YELLOW}Audit passed with warnings.${NC}"
  exit 0
fi
echo -e "${GREEN}Audit clean.${NC}"
