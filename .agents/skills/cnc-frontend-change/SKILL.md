---
name: cnc-frontend-change
description: Implement and validate CNC Portal Vue and Nuxt frontend changes. Use for work under app/ or dashboard/, including components, composables, API queries, client-side Web3 writes, formatting, and frontend tests.
---

# CNC frontend change

Use the focused guides instead of re-deriving local patterns.

## Select the surface

- **`app/`:** follow the client workflow below.
- **`dashboard/`:** inspect the dashboard's local README and `package.json`; use its Nuxt conventions and `~/utils/format` for display values. Run every applicable dashboard script exposed by its package manifest.

## Client workflow (`app/`)

- Read `app/src/queries/README.md` for API queries and mutations.
- Read `.github/copilot-instructions/vue-component-standards.md` for components and `.github/copilot-instructions/testing-overview.md` for tests.
- Read `.github/copilot-instructions/formatting-standards.md` before rendering a value.
- For an on-chain write, read `app/src/composables/contracts/README.md`; use `useContractWritesV3` only.

## Implement

- Reuse an existing utility, composable, query hook, and formatter before creating a new one.
- Keep server state in its query cache. A mutation is a pure request function wrapped by one `useXxxMutation` composable; actions sharing one endpoint reuse that hook.
- Keep components declarative. Move pure shaping to utilities and reactive behaviour to focused composables.
- Reuse global frontend mocks and override them through `@/tests/mocks`; never re-declare a globally mocked module per spec.

## Validate the client

Run the full `app/` gate from `AGENTS.md`: lint, format check, type-check, and unit tests. Add focused tests for the behaviour changed; use E2E only when the user journey needs browser-level evidence.
