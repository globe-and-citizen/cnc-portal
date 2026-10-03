# Development Guide

Comprehensive guides for developing features in the CNC Portal project.

## Contents

### Development Workflow

- **[Development Relationship Validation](./relationship-validation.md)** - Required relationship checks from issue scoping through final
  merge validation, with evidence and completion proposals

### Database Tooling

- **[Database Seeding](./database-seeding/README.md)** - Current flags, safety boundaries, and execution flow

### Static Analysis

- **[Knip unused-export analysis](./static-analysis.md)** - Read-only TypeScript export audit and triage process

### Autonomous Agent Audits

- **[Autonomous semantic audit contracts](./autonomous-audits/README.md)** - Shared evidence, reporting, issue, and remediation contract for
  recurring AI-agent audits

### Testing

- **[Testing Overview](../testing/)** - Main testing guide
  - [Unit Testing](../testing/unit-testing.md) - How to write unit tests
  - [Mock System](../testing/MOCK_SYSTEM.md) - Current centralized mock system

### Code Standards

- **[Vue.js Component Standards](../../.github/copilot-instructions/vue-component-standards.md)** - Component development guidelines
- **[Testing Overview](../../.github/copilot-instructions/testing-overview.md)** - Repository test conventions

## Quick Links

- [Architecture Overview](../platform/architecture.md)
- [Development Standards](../platform/development-standards.md)
- [Security Guidelines](../platform/security.md)
- [Performance Guidelines](../platform/performance.md)

## Getting Started

1. **Setup Development Environment**
   - Install Node.js v22.18.0+
   - Install dependencies: `npm install`
   - Setup environment variables (see `.env.example`)

2. **Run Development Server**

   ```bash
   cd app
   npm run dev
   ```

3. **Run Tests**

   ```bash
   # Unit tests
   npm run test:unit

   # Watch mode
   npm run test:watch

   # Coverage report
   npm run test:unit:coverage
   ```

4. **Check Code Quality**

   ```bash
   # Type checking
   npm run type-check

   # Linting
   npm run lint
   ```

## Development Workflow

### Creating a New Feature

Follow [Development Relationship Validation](./relationship-validation.md) throughout the change:

1. **Scope the issue** against canonical expectations and identify affected relationships and consumers.
2. **Implement the change** using the affected area's guides, reassessing relationships after each logical change.
3. **Validate and document** the actual guarantees and record evidence or completion proposals in the PR.
4. **Submit for independent review** using the review checklist and relationship results.
5. **Revalidate before merge** against the current PR head and target revision.

### File Organization

```
src/
├── components/          # Vue components
│   └── __tests__/      # Component tests
├── views/              # Route components
│   └── __tests__/      # View tests
├── composables/        # Vue composables
│   └── __tests__/      # Composable tests
├── stores/             # Pinia stores
├── queries/            # TanStack Query hooks
├── types/              # TypeScript types
├── utils/              # Utility functions
└── tests/
    └── mocks/          # Centralized mocks
```

## Common Tasks

### Adding a New Query Hook

See the [Mock System guide](../testing/MOCK_SYSTEM.md#adding-a-global-mock) and the [test utilities guide](../../app/src/tests/README.md).

### Adding a New Component

1. Create component in `src/components/`
2. Create test in `src/components/__tests__/ComponentName.spec.ts`
3. Add proper TypeScript types
4. Use `data-test` attributes for all interactive elements

### Adding a New Store

1. Create store file in `src/stores/`
2. Use Pinia composition API with TypeScript
3. Export store interface for use in components
4. Add to `src/stores/index.ts`

## Code Review Checklist

Before submitting a PR:

- [ ] Relationship results, evidence, applicability reasons, and completion proposals follow the
      [relationship-validation guide](./relationship-validation.md).
- [ ] All tests pass (`npm run test:unit`)
- [ ] TypeScript compiles without errors (`npm run type-check`)
- [ ] No ESLint errors (`npm run lint`)
- [ ] Coverage meets thresholds (80%+ for new code)
- [ ] Component has proper accessibility (ARIA labels, keyboard nav)
- [ ] No console errors or warnings
- [ ] Documentation updated if API changed
- [ ] Commit messages follow [Conventional Commits](../../.github/copilot-instructions/commit-conventions.md)

## Resources

- **Testing**: [Vitest](https://vitest.dev/) | [Vue Test Utils](https://test-utils.vuejs.org/)
- **State Management**: [Pinia](https://pinia.vuejs.org/)
- **Data Fetching**: [TanStack Vue Query](https://tanstack.com/query/latest/docs/vue/overview)
- **HTTP Client**: [Axios](https://axios-http.com/)
- **Web3**: [Wagmi](https://wagmi.sh/) | [Viem](https://viem.sh/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) | [daisyUI](https://daisyui.com/)

## Troubleshooting

### Tests Failing

1. Clear mock cache: `vi.clearAllMocks()`
2. Check if mocks are registered in `composables.setup.ts`
3. Verify component uses correct test attributes (`data-test`)
4. Check for async operations with `await flushPromises()`

### TypeScript Errors

1. Ensure types are imported correctly
2. Check for circular dependencies
3. Update IDE cache if types seem wrong
4. Run `npm run type-check` to validate

### Component Not Rendering

1. Verify Pinia store is provided in test
2. Check for missing async operations resolution
3. Ensure VueQueryPlugin is registered
4. Verify props are passed correctly

## Contributing

Follow the development workflow and code review checklist when contributing. See [CONTRIBUTION.md](../../CONTRIBUTION.md) for full
guidelines.
