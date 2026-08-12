---
name: cnc-pr-review
description: Review CNC Portal pull requests for both issue conformance and code quality. Use when asked to review a PR, verify that an issue was delivered, audit review readiness, or post actionable review feedback.
---

# CNC PR review

Review two independent questions. A PR must pass both before it is ready.

## Establish the review surface

1. Resolve the PR, its base branch, linked issue, changed files, checks, and review threads.
2. Read the issue acceptance criteria before examining implementation details.
3. For a contract change, read `.github/copilot-instructions/solidity-audit-checklist.md` as well.

## Review both axes

- **Conformance:** Compare every acceptance criterion with the branch. Flag unmet criteria, regressions, and out-of-scope changes.
- **Quality:** Inspect correctness, security, tests, maintainability, and project conventions. Use `.github/copilot-instructions/review-checklist.md` and the relevant domain skill.

When the task explicitly supports parallel research, one read-only reviewer may assess conformance while another assesses the diff. They report evidence to the primary reviewer; they do not post comments or alter the checkout.

## Publish a useful review

- Put each actionable finding inline on the relevant changed line. The overall review body summarizes the conformance verdict.
- Explain what is wrong, why it matters, and the reusable principle. Do not write the replacement code unless asked.
- Use `REQUEST_CHANGES` for a real bug or unmet acceptance criterion; use `COMMENT` for observations and nits. Never auto-approve.
- If no finding remains, report the evidence reviewed rather than claiming certainty beyond the available checks.
