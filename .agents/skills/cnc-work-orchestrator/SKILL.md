---
name: cnc-work-orchestrator
description: Coordinate CNC Portal work across repository skills. Use for issue-driven implementation, cross-surface changes, dependency-aware planning, or audits that can benefit from bounded multi-agent research while retaining one integration owner.
---

# CNC work orchestrator

Keep one agent accountable for the working tree, external writes, and final evidence. Use other agents only to produce
independent, bounded evidence.

## Route the work

1. Read `AGENTS.md`, `todolist.md`, the relevant issue or PR, and the touched paths.
2. Mark the active todo item and identify blockers before beginning implementation.
3. Select only the needed skills:
   - GitHub artifacts or publishing → `cnc-github-flow`
   - PR review → `cnc-pr-review`
   - Agent or implementation docs → `cnc-docs-governance`
   - `app/` changes → `cnc-frontend-change`
   - `contract/` changes → `cnc-contract-change`
4. Keep the work sequential when a task depends on another task's result.

## Delegate safely

- Delegate only bounded, independent investigation or review work. Good examples: trace a separate user journey, compare
  acceptance criteria to a diff, or inspect a distinct subsystem.
- A delegated task states its exact scope, expected evidence, and whether it is read-only.
- Subagents do not edit shared files, stage changes, commit, push, create issues, or post reviews unless the user
  explicitly assigns that authority.
- Do not delegate a task marked blocked, nor split a single coherent implementation merely to use more agents.

## Integrate and finish

The primary agent evaluates all evidence, integrates the changes, runs the required checks, and owns commits and PR
state. Mark the todo complete only after the agreed outcome and validation are complete.
