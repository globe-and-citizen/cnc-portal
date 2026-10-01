# Testing Guide

This directory contains comprehensive testing documentation and guides for the CNC Portal project.

## Contents

- **[Integrated E2E Paths](./e2e-paths.md)** - G0 technical diagnostic, G1 through G8 business paths, and current evidence status
- **[Playwright E2E Fixture Catalogue](./e2e-fixtures.md)** - Shared fixtures, boundary rules, cleanup, and complete spec audit
- **[Application E2E Guide](../../app/test/README.md)** - Playwright profiles, setup commands, and authoring conventions
- **[Unit Testing Guide](./unit-testing.md)** - Guidelines for writing unit tests with Vue Test Utils and Vitest
- **[Mock System](./MOCK_SYSTEM.md)** - Current centralized Vitest mocks and per-test overrides

## Quick Start

### Running Tests

```bash
# Run all app unit tests once
npm run test:unit -- --run

# Run tests in watch mode
npm run test:watch

# Run unit tests with coverage
npm run test:unit:coverage
```

### Browser acceptance and integrated E2E

Every Playwright profile targets services and shared infrastructure that are already prepared. The integrated profile requires the frontend,
backend, migrated database, local chain, and contract infrastructure. Individual integrated paths may use an authenticated Node-side factory
to prepare isolated domain data before browser actions; these setup calls are not product-flow evidence. Browser acceptance requires its
frontend and deterministic local node, prepared once with `npm run setup:e2e:browser`. Playwright has no server or shared-infrastructure
setup configuration.

Chain-backed browser and integrated tests run inside an automatic chain snapshot. Fully simulated browser scenarios skip Hardhat entirely
and may run with file-level parallelism. Integrated tests can additionally request authenticated owner/member pages, operational teams, and
disposable team feature overrides. See the [fixture catalogue](./e2e-fixtures.md) before adding setup to an individual spec.

```bash
cd app

# Verify the prepared integrated stack (set CNC_E2E_BACKEND_URL to its local origin first)
npm run preflight:e2e:integrated

# Real frontend, backend, database, and chain boundaries for every migrated path
npm run test:e2e

# Simulated backend, failure, and fixture-backed variants
npm run setup:e2e:browser
npm run test:browser:acceptance
```

Prepare each profile's services and fixtures before invoking Playwright. Browser acceptance first runs `@parallel-safe` simulated files on
three workers, then runs chain-backed files on one worker and merges both reports. Run browser acceptance and integrated E2E separately so
their reports remain distinct. Browser acceptance is evidence for browser-boundary behaviour; only the integrated profile is evidence for a
full-stack business journey.

CI runs independent `Browser acceptance` and `Integrated journeys` jobs, then exposes one lightweight `Full-stack E2E` aggregate check. The
browser job prepares its own local node, contracts, and frontend. The integrated job prepares a separate local node, disposable database,
backend, deployment manifest, and frontend. Its [technical preflight](../../app/scripts/check-integrated-readiness.mjs) verifies frontend
reachability, backend database/chain readiness, chain identity, and shared Officer/Bank/token code before Playwright. The G0 browser test
remains an independent diagnostic; SIWE is exercised by the dedicated authentication test. The profiles publish separate reports because
only the integrated phase is E2E evidence.

The Vite development server ignores generated `coverage/` artifacts so per-page coverage snapshots do not trigger hot reloads during an
active browser suite.

### Test Structure

Tests are organized alongside their source files:

```
src/
├── components/
│   ├── MyComponent.vue
│   └── __tests__/
│       └── MyComponent.spec.ts
├── views/
│   ├── MyView.vue
│   └── __tests__/
│       └── MyView.spec.ts
└── composables/
    ├── useMyComposable.ts
    └── __tests__/
        └── useMyComposable.spec.ts
```

## Testing Best Practices

1. **Use data-test attributes** - For stable element selection instead of classes or structure
2. **Test behavior, not implementation** - Focus on what users see and interact with
3. **Mock external dependencies** - Use centralized mocks from `src/tests/mocks/`
4. **Organize tests logically** - Group related tests with describe blocks
5. **Keep tests isolated** - Each test should be independent and not affect others

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Vue Test Utils](https://test-utils.vuejs.org/)
- [TanStack Vue Query](https://tanstack.com/query/latest/docs/vue/overview)
- [Testing Overview](../../.github/copilot-instructions/testing-overview.md)
