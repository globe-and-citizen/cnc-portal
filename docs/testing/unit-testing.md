# Unit Testing Guide

**Scope:** Vitest unit, composable, utility, and Vue component tests under `app/src/`.

The repository's detailed conventions live in the [test utilities guide](../../app/src/tests/README.md), the
[testing overview](../../.github/copilot-instructions/testing-overview.md), and the
[testing patterns](../../.github/copilot-instructions/testing-patterns.md). This page keeps the shortest practical recipe for adding or
updating an app unit test.

## Test locations and names

Place a spec beside the code it covers:

```text
app/src/components/Foo.vue
app/src/components/__tests__/Foo.spec.ts
app/src/composables/useFoo.ts
app/src/composables/__tests__/useFoo.spec.ts
app/src/utils/foo/model.ts
app/src/utils/foo/__tests__/model.spec.ts
```

Use `.spec.ts` for unit and component tests. Use `.integration.spec.ts` only when the test intentionally exercises several application
boundaries together. Playwright journeys live under `app/test/e2e/` and follow the separate [E2E guide](../../app/test/README.md).

## Component mounting

Use `renderWithProviders` for the default component setup. It installs the shared test providers and lets a spec override only what it
needs:

```ts
import { renderWithProviders } from '@/tests/mocks'

const wrapper = renderWithProviders(MyComponent, {
  props: { loading: false },
  global: { stubs: { LocalChild: true } }
})

expect(wrapper.find('[data-test="submit-button"]').exists()).toBe(true)
```

Use `mount` directly only when the test intentionally needs a different provider setup. Prefer `data-test` attributes, rendered text,
emitted events, accessible roles, and public child props over CSS classes or private component state.

## Shared mocks

Global Vitest setup files already mock the commonly used wagmi, viem, TanStack Query, Pinia, API, composable, and Nuxt UI boundaries. Reuse
the exported handles from `@/tests/mocks`; do not register the same module again in a spec.

```ts
import { mockERC20Reads, resetERC20Mocks } from '@/tests/mocks'

beforeEach(() => resetERC20Mocks())

it('renders a token balance', () => {
  mockERC20Reads.balanceOf.data.value = 500n

  const wrapper = renderWithProviders(TokenBalance)

  expect(wrapper.find('[data-test="token-balance"]').text()).toContain('500')
})
```

For the complete module catalogue, reset rules, and global-mock extension procedure, read [`MOCK_SYSTEM.md`](./MOCK_SYSTEM.md).

## Query and mutation tests

Use the current query names and mutation contract. For example, the team module exposes `useGetTeamsQuery` and `useCreateTeamMutation`, not
the older `useTeamsQuery` or `useCreateTeamQuery` names:

```ts
import { vi } from 'vitest'
import ListIndex from '@/views/team/ListIndex.vue'
import { useGetTeamsQuery } from '@/queries/team.queries'
import { renderWithProviders, mockTeamsData, createMockQueryResponse } from '@/tests/mocks'

it('renders the returned companies', () => {
  vi.mocked(useGetTeamsQuery).mockReturnValue(
    createMockQueryResponse(mockTeamsData)
  )

  const wrapper = renderWithProviders(ListIndex)

  expect(wrapper.text()).toContain('Test Team')
})
```

When testing a mutation composable, assert the payload sent to the underlying operation, the error state, and the invalidated query keys.
Use the real query-key factory when the contract requires a specific cache boundary.

## Observable behaviour

Each test should have one focused, declarative outcome:

```ts
it('emits the selected token when the user changes the field', async () => {
  const wrapper = renderWithProviders(TokenSelector)

  await wrapper.find('[data-test="token-select"]').setValue('usdc')

  expect(wrapper.emitted('update:modelValue')?.at(-1)?.[0]).toBe('usdc')
})
```

For asynchronous behaviour, use `await nextTick()` for Vue updates and `await flushPromises()` for pending promises. Avoid arbitrary timeout
delays. For failures, assert the user-visible error or the domain error mapped by the tested boundary.

## Acceptance traceability

Put one canonical acceptance ID in the representative test title when one test proves one criterion. Use a structured `Covers` block only
when one coherent test proves several criteria. The identifier is traceability metadata; the assertions remain the proof. Follow the
complete [acceptance traceability contract](../../docs/platform/feature-specification-guide.md#acceptance-criteria-and-traceability).

Run the repository-level inventory from the repository root:

```bash
npm run report:acceptance-coverage
```

The generated report is an audit inventory, not evidence that the latest test run passed.

## Coverage and local commands

Coverage targets are advisory quality signals, not a substitute for behavioural assertions. The app exposes these commands:

```bash
cd app

# Run all app unit tests once
npm run test:unit -- --run

# Watch unit tests without updating snapshots implicitly
npm run test:unit -- --watch

# Generate the app unit-test coverage report
npm run test:unit:coverage

# Type-check and lint the app
npm run type-check
npm run lint
```

The repository-level validation commands and required pre-push checks remain defined in [`AGENTS.md`](../../AGENTS.md).

## References

- [Test utilities and global setup](../../app/src/tests/README.md)
- [Mock system](./MOCK_SYSTEM.md)
- [Testing overview](../../.github/copilot-instructions/testing-overview.md)
- [Testing patterns](../../.github/copilot-instructions/testing-patterns.md)
- [Testing anti-patterns](../../.github/copilot-instructions/testing-anti-patterns.md)
- [Vue Test Utils](https://test-utils.vuejs.org/)
- [Vitest](https://vitest.dev/)
