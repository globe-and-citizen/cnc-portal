# Testing Overview

> **Canonical references in the codebase** (read these instead of trusting outdated snippets):
>
> - Component spec — `app/src/components/ui/inputs/__tests__/SelectMemberWithTokenInput.spec.ts`
> - Composable spec with `vi.hoisted` — `app/src/composables/__tests__/useContractFunction.spec.ts`
> - Web3 / wagmi spec — `app/src/__tests__/wagmi.spec.ts`
> - Pure-utility spec — `app/src/utils/currency/__tests__/display.spec.ts`
> - Mutation + query spec — `app/src/queries/__tests__/weeklyClaim.queries.spec.ts`

This file documents _principles_. When you need to write a new test, copy the structure from the closest canonical reference above — those
files are the source of truth and stay correct because CI runs them.

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
src/utils/foo/model.ts
src/utils/foo/__tests__/model.spec.ts
```

Naming:

- `Foo.spec.ts` — basic
- `Foo.advanced.spec.ts` — complex / edge cases
- `Foo.integration.spec.ts` — multi-component / store interaction
- E2E in `app/test/e2e/`

## Core principles

- **Use `data-test` attributes**, never CSS classes or DOM structure, to query elements. The component standard requires `data-test` on
  every interactive element.
- **Test what users see**, not `wrapper.vm.someInternalRef`.
- **One responsibility per test**, with a concise declarative title in the present tense
  (`emits update:modelValue when an option is selected`, not `should emit ...` or `works correctly`). The title completes the implicit
  phrase `it ...`, so `should` only repeats what the test API already expresses.
- **Cover, for each component**: rendering with different props, user interactions, prop/state changes, event emissions, error states,
  loading states, accessibility, edge cases.

## Acceptance traceability in test names

Use acceptance identifiers only on representative tests whose assertions directly prove the criterion. Follow the complete traceability
contract in the [Feature Documentation Guide](../../docs/platform/feature-specification-guide.md#acceptance-criteria-and-traceability).

- When a test represents exactly one canonical ID, put it in the title rather than a comment. Prefer the most specific ID: prefix the test
  title with its single AC, or the enclosing suite title with its single US. Example:
  `it('[AC-US-COMPANIES-004-02] rejects metadata updates from a non-owner', ...)`.
- When one coherent test proves two or more canonical IDs, keep the title readable and list the IDs in a structured `Covers` block
  immediately above the test. A single-ID `Covers` block is invalid.
- For E2E journeys, put a single user-story ID in the enclosing suite, prefix a path title when it proves one AC, and use a `Covers` block
  only when the path proves multiple criteria.
- An identifier records traceability; the assertions remain the evidence. Do not tag incidental tests merely to increase reported coverage.

Run `npm run report:acceptance-coverage` from the repository root for the complete local audit. The Git-ignored report inventories test
files across frontend, backend, contract, dashboard, and E2E layers. A test file is attached to a feature either by a direct `US-*` or
`AC-US-*` marker or by a test path linked from that feature's canonical Implementation Evidence. The report labels those mapping sources:
canonical evidence establishes feature support only, while a direct marker establishes story traceability and, for an AC, representative
criterion evidence. Links from canonical contract or implementation documentation classify technical-only support separately. Files with
none of these mappings remain visible in the unmapped checklist until reviewed. The feature overview separates feature-only support, direct
story links, and representative AC evidence, with counts for each repository layer and both E2E integration modes.

Review feature-only and technical-only tests as a documentation discovery surface. A test may reveal an existing US/AC whose representative
evidence is not linked, or a stable user-visible outcome absent from the feature contract. Verify the assertions, implementation, current
journey, and intended product boundary before changing documentation. Add a new AC only for an observable product outcome or business rule;
add a new US only for a distinct actor goal. Keep implementation details under technical ownership, and do not turn stale or accidental test
behavior into a product promise.

## Mocking conventions

**Reuse the global mocks. Do not re-mock them locally.** `app/vitest.config.ts` loads setup files from `app/src/tests/setup/` that
`vi.mock(...)` every commonly used dependency (wagmi, viem, TanStack Query, Pinia stores, the `@/composables/<domain>/{reads,writes}`
modules, the stubbed Nuxt UI primitives, `@/lib/axios`, `@/lib/logging`, `@/utils/expenses/model`, `@/queries/*.queries`, …). Per-test
override hooks (`mockTeamStore`, `mockERC20Reads`, `resetERC20Mocks`, …) come from `@/tests/mocks`. ESLint blocks
`vi.mock('<globally-mocked-path>')` in specs (`bannedGlobalMockPaths` in `app/eslint.config.js`); see
[`testing-anti-patterns.md`](./testing-anti-patterns.md) and `app/src/tests/README.md`.

The canonical pattern is `vi.hoisted` for mocks that need to be referenced inside `vi.mock` factories. See lines 9–19 of
`useContractFunction.spec.ts` for the exact shape. Use it only for modules **not** already covered by a global setup file.

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

Coverage is a smell detector, not a goal. A 95%-covered component with no behavioral assertions is worse than 70% coverage that exercises
the contract.

## Local quality gate

Before pushing, run the per-subproject lint / type-check / test commands documented in [`AGENTS.md`](../../AGENTS.md). The repo does not
configure a commit-message linting hook, so this gate is enforced manually plus by CI on PRs.

## Performance hygiene

- Mock heavy deps; don't network in unit tests.
- Tests must be independent — no shared mutable state across files.
- Use `vi.clearAllMocks()` in `beforeEach`, not full re-creation.
- For very heavy components, `shallowMount` is acceptable when you're only testing the wrapper's contract.
