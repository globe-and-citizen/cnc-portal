# Static Analysis

## Scope

Knip identifies TypeScript exports that are not statically referenced from the configured entry points. It complements TypeScript and
ESLint, which report unused variables and parameters within a module but cannot prove that an exported symbol is unused across the
repository.

The root configuration covers `app`, `backend`, `contract`, `dashboard`, and `ponder`. The Graph project is AssemblyScript, so it is outside
this TypeScript-export audit.

## Commands

Install root development dependencies, then run one of these commands from the repository root:

```bash
npm install
npm run knip:report
```

`knip:report` always completes successfully and is the appropriate starting point for an existing codebase. `npm run knip` exits non-zero
when candidates are found, which makes it suitable for a focused local cleanup after the baseline has been reviewed.

Neither command changes source files. Do not use Knip's automatic fix mode in this repository.

## Triage

Each result is a candidate, not proof that code is dead. Before deleting an export, verify:

1. references in the same file;
2. test-only references, which may be intentional test helpers;
3. framework, generated-code, configuration, or dynamic-runtime consumption; and
4. the relevant user journey and automated checks.

If a result is intentionally retained, document the reason in the focused cleanup issue before adding a narrowly scoped configuration
exception. A dead-code deletion remains a separate change with its own issue, tests, and review.
