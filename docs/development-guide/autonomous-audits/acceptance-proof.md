# Acceptance Proof Audit

**Audit ID:** `acceptance-proof`

## Objective

Determine whether representative tests genuinely prove the user stories and acceptance criteria they claim, rather than merely containing a
traceability identifier or touching adjacent code.

## Required Inputs

- canonical feature README and its proof-strategy catalogue;
- every test directly marked with the scoped US or AC;
- feature-only and technical-only evidence linked by the README;
- relevant implementation across frontend, backend, contracts, database, dashboard, and indexers;
- the generated acceptance-coverage report as an inventory, not as proof.

## Audit Questions

- Does each marked test assert the observable outcome described by the AC?
- Does the test exercise the layer responsible for that outcome?
- Does a mock replace the exact responsibility the test claims to prove?
- Is a browser scenario incorrectly described as integrated evidence?
- Does one test claim unrelated ACs without proving each one?
- Are multiple tests redundant while an important boundary remains untested?
- Does existing behaviour or a stable test reveal a missing product rule that needs human documentation review?
- Is an AC obsolete, ambiguous, implementation-specific, or contradicted by the current journey?

## Valid Findings

- false or overstated US/AC coverage;
- representative test with insufficient assertions;
- wrong proof mode or responsible layer;
- meaningful undocumented behaviour requiring a product decision;
- obsolete or contradictory acceptance wording;
- redundant evidence whose consolidation preserves all unique guarantees.

Raw coverage percentage, an unreferenced test, or a missing AC identifier is not independently a semantic finding.

## Remediation

The agent may autonomously improve assertions, move a misplaced identifier, add a missing test, or correct a coverage classification when
the expected behaviour is explicit. New or materially changed acceptance criteria use `assisted-pr`. Deleting an AC or weakening its
guarantee is `report-only` until a human product decision exists.

## Completion Evidence

The report maps each finding to the exact US/AC, responsibility, proof mode, assertions inspected, and validation result. A correction is
complete only when the representative test fails against the broken behaviour and passes against the remediation.
