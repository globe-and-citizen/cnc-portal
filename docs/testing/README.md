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

### Company browser tests

The Company suites target a frontend that is already running. The integrated profile also expects the backend, migrated database, local
chain, and required contract infrastructure to be ready; Playwright does not start or mutate that infrastructure.

```bash
cd app

# Real frontend, backend, database, and chain boundaries
npm run test:e2e:company:integrated

# Injected validation and failure variants
npm run test:e2e:company:mocked
```

CI keeps these evidence levels separate. The regular Playwright job runs mocked and fixture-backed browser coverage, while the Company
integration job prepares a disposable stack before executing only the `@integrated` paths.

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
