# Development Guide

Comprehensive guides for developing features in the CNC Portal project.

## Contents

### Testing

- **[Testing Overview](../testing/)** - Main testing guide
  - [Unit Testing](../testing/unit-testing.md) - How to write unit tests
  - [Global Mocks Setup](../testing/global-mocks-setup.md) - Mock system documentation

### Code Standards

- **[Vue.js Component Standards](./.github/copilot-instructions/vue-component-standards.md)** - Component development guidelines
- **[TypeScript Guidelines](./.github/copilot-instructions/typescript-guidelines.md)** - TypeScript best practices
- **[Web3 Integration](./.github/copilot-instructions/web3-integration.md)** - Web3 patterns and utilities

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
   npm run test:coverage
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

1. **Create component** with proper structure
2. **Write tests** following unit testing guide
3. **Update mocks** if adding new queries
4. **Update documentation** for public APIs
5. **Submit for review** using review checklist

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

See [Global Mocks Setup Guide](../testing/global-mocks-setup.md#adding-new-mocks)

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

- [ ] All tests pass (`npm run test:unit`)
- [ ] TypeScript compiles without errors (`npm run type-check`)
- [ ] No ESLint errors (`npm run lint`)
- [ ] Coverage meets thresholds (80%+ for new code)
- [ ] Component has proper accessibility (ARIA labels, keyboard nav)
- [ ] No console errors or warnings
- [ ] Documentation updated if API changed
- [ ] Commit messages follow [Conventional Commits](../.github/copilot-instructions/commit-conventions.md)

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

Follow the development workflow and code review checklist when contributing. See [CONTRIBUTION.md](../../CONTRIBUTION.md) for full guidelines.
