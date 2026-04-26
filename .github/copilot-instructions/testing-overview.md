# Testing Overview

> **Canonical references in the codebase** (read these instead of trusting outdated snippets):
>
> - Component spec — `app/src/components/__tests__/SelectComponent.spec.ts`
> - Composable spec with `vi.hoisted` — `app/src/composables/__tests__/useContractFunction.spec.ts`
> - Web3 / wagmi spec — `app/src/__tests__/wagmi.spec.ts`
> - Pure-utility spec — `app/src/utils/__tests__/currencyUtil.spec.ts`
> - Mutation + query spec — `app/src/queries/__tests__/weeklyClaim.queries.spec.ts`

This file documents _principles_. When you need to write a new test, copy the structure from the closest canonical reference above — those files are the source of truth and stay correct because CI runs them.

## Philosophy

Behavior over implementation. Tests should fail when the user-visible contract breaks, not when an internal variable is renamed.

## Stack

- **Unit & component**: Vitest
- **Test utilities**: `@vue/test-utils`
- **Mocking**: Vitest (`vi.hoisted`, `vi.mock`)
- **E2E**: Playwright (+ Synpress for wallet flows)
- **Coverage**: Vitest istanbul

## File layout

Co-locate tests with the code they cover, in `__tests__/`:

```text
src/components/Foo.vue
src/components/__tests__/Foo.spec.ts
src/composables/useFoo.ts
src/composables/__tests__/useFoo.spec.ts
src/utils/foo.ts
src/utils/__tests__/foo.spec.ts
```

Naming:

- `Foo.spec.ts` — basic
- `Foo.advanced.spec.ts` — complex / edge cases
- `Foo.integration.spec.ts` — multi-component / store interaction
- E2E in `app/test/e2e/`

## Core principles

- **Use `data-test` attributes**, never CSS classes or DOM structure, to query elements. The component standard requires `data-test` on every interactive element.
- **Test what users see**, not `wrapper.vm.someInternalRef`.
- **One responsibility per test**, descriptive name (`should emit update:modelValue when option is selected`, not `works correctly`).
- **Cover, for each component**: rendering with different props, user interactions, prop/state changes, event emissions, error states, loading states, accessibility, edge cases.

## Mocking conventions

The canonical pattern is `vi.hoisted` for mocks that need to be referenced inside `vi.mock` factories. See lines 9–19 of `useContractFunction.spec.ts` for the exact shape.

Toast notifications use Nuxt UI's `useToast()`. Mock it once per spec (auto-import path varies per setup — usually `#imports`):

```ts
const { mockToast } = vi.hoisted(() => ({ mockToast: { add: vi.fn() } }));
vi.mock("#imports", () => ({ useToast: () => mockToast }));

// assertion
expect(mockToast.add).toHaveBeenCalledWith(
  expect.objectContaining({ title: "Saved", color: "success" }),
);
```

For wagmi, mock `@wagmi/core` directly:

```ts
const { mockReadContract, mockWriteContract } = vi.hoisted(() => ({
  mockReadContract: vi.fn(),
  mockWriteContract: vi.fn(),
}));
vi.mock("@wagmi/core", () => ({
  readContract: mockReadContract,
  writeContract: mockWriteContract,
}));
```

Reset between tests:

```ts
beforeEach(() => vi.clearAllMocks());
afterEach(() => wrapper?.unmount());
```

## Coverage targets

- Unit: ~90% line
- Component: ~85% line
- Integration: ~70% line

Coverage is a smell detector, not a goal. A 95%-covered component with no behavioral assertions is worse than 70% coverage that exercises the contract.

## Local quality gate

Before pushing, run the per-subproject lint / type-check / test commands documented in [`AGENTS.md`](../../AGENTS.md). The repo does not configure husky/commitlint, so this gate is enforced manually plus by CI on PRs.

## Performance hygiene

- Mock heavy deps; don't network in unit tests.
- Tests must be independent — no shared mutable state across files.
- Use `vi.clearAllMocks()` in `beforeEach`, not full re-creation.
- For very heavy components, `shallowMount` is acceptable when you're only testing the wrapper's contract.
