# Testing Guide

This directory contains comprehensive testing documentation and guides for the CNC Portal project.

## Contents

- **[Integrated E2E Checklist](./e2e-paths.md)** - G0 through G7 integrated test groups and paths
- **[Unit Testing Guide](./unit-testing.md)** - Guidelines for writing unit tests with Vue Test Utils and Vitest
- **[Global Mocks Setup](./global-mocks-setup.md)** - Centralized mock definitions for TanStack Vue Query and Axios

## Quick Start

### Running Tests

```bash
# Run all tests
npm run test:unit

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Browser acceptance and integrated E2E

Every Playwright profile targets services and fixtures that are already prepared. The integrated profile requires the frontend, backend,
migrated database, local chain, and contract infrastructure. Browser acceptance requires its frontend and deterministic local node, prepared
once with `npm run setup:e2e:browser`. Playwright has no server or infrastructure setup configuration.

```bash
cd app

# Real frontend, backend, database, and chain boundaries for every migrated path
npm run test:e2e

# Simulated backend, failure, and fixture-backed variants
npm run setup:e2e:browser
npm run test:browser:acceptance
```

CI exposes one `Full-stack E2E` job. The workflow starts the shared local node, explicitly provisions browser-acceptance contracts, and
starts the browser frontend before the first Playwright invocation. It then resets the same node and provisions the disposable database,
backend, integrated deployment manifest, and frontend before the `@integrated` invocation. The two phases keep separate logical state and
publish separate reports because only the integrated phase is E2E evidence.

The integrated database setup is guarded by `E2E_INTEGRATED_SETUP=true`. It disables the Payroll submission restriction only in that
disposable database so a completed-week claim can exercise the real approval and withdrawal lifecycle; it must not be run against shared
data.

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
- [CNC Portal Copilot Instructions](./.github/copilot-instructions/)
