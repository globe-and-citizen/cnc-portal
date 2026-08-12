---
name: cnc-contract-change
description: Implement and validate CNC Portal Solidity contract changes. Use for work under contract/, deployment or upgrade validation, contract ABI changes, and contract-related frontend artifact updates.
---

# CNC contract change

Treat each contract edit as a security-sensitive change with an explicit interface and validation path.

## Before editing

- Read `.github/copilot-instructions/solidity-audit-checklist.md` and the relevant contract tests before changing behaviour.
- Confirm the target contract version and deployment context. Do not deploy or upgrade a contract without explicit user authorization.
- Identify every frontend ABI, address artifact, indexer, and documentation surface affected by the interface change.

## Implement and validate

1. Add or update tests covering the changed invariant, failure path, permissions, and upgrade implications where applicable.
2. Run `npm run generate-abi` after any ABI change and commit `app/src/artifacts/abi/generated.ts` when it changes.
3. Run the complete `contract/` gate from `AGENTS.md`: lint, format check, compile, and test.
4. Review the Solidity audit checklist before publishing. CI Slither findings are release blockers for new high or medium findings.
