# Testing Patterns

> **Read first**: [`testing-overview.md`](./testing-overview.md) for principles and the canonical-reference list.
>
> This file lists patterns by name and points to a real, currently-passing test that demonstrates each. Snippets here are deliberately small — the _full_ shape lives in the linked file, which CI keeps correct.

## Component rendering with `data-test`

→ `app/src/components/__tests__/SelectComponent.spec.ts` — full mount + selectors + props/emits.

Key shape (mirror this in new specs):

```ts
const SELECTORS = {
  trigger: '[data-test="component-trigger"]',
  submit: '[data-test="submit-btn"]'
} as const

const wrapper = mount(Component, { props: { ... } })
expect(wrapper.find(SELECTORS.submit).exists()).toBe(true)
```

## Hoisted mocks for composables and stores

→ `app/src/composables/__tests__/useContractFunction.spec.ts` lines 9–19 — canonical `vi.hoisted` block.

Rule: anything referenced inside a `vi.mock` factory must be declared with `vi.hoisted`, otherwise it's a `ReferenceError` at module-load time.

```ts
const { mockTeamStore } = vi.hoisted(() => ({
  mockTeamStore: {
    getContractAddressByType: vi.fn(() => "0x1234…"),
  },
}));
vi.mock("@/stores", () => ({ useTeamStore: () => mockTeamStore }));
```

## Mutation composables (`useXxxMutation` + TanStack Query)

→ `app/src/queries/__tests__/weeklyClaim.queries.spec.ts` (lines ~170–220) — file upload + invalidation + error.

Test the composable, not the component that uses it. Assert: `mutate(payload)` triggers the underlying call, `error` is reactive on failure, the right query keys are invalidated on success.

## Toast assertions

Mock `useToast()` once and assert on `mockToast.add`:

```ts
expect(mockToast.add).toHaveBeenCalledWith(
  expect.objectContaining({ color: "error", title: "Network error" }),
);
```

See [`testing-overview.md`](./testing-overview.md#mocking-conventions) for the full mock setup.

## Pure utilities

→ `app/src/utils/__tests__/currencyUtil.spec.ts` — short, no mocks, boundary cases (negative, zero, large numbers).

If your utility test needs mocks, the function is impure — push the side-effects out into a composable and re-test the pure part directly.

## Async / reactive assertions

```ts
await wrapper.find(SELECTORS.submit).trigger("click");
await flushPromises(); // pending promises (network, mutations)
await nextTick(); // pending Vue reactivity
```

`flushPromises` from `@vue/test-utils` is the right tool 95% of the time. Avoid arbitrary `setTimeout`-based waits.

## Error-path assertions

When testing error handling:

```ts
const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
// trigger error path…
expect(mockToast.add).toHaveBeenCalledWith(
  expect.objectContaining({ color: "error", title: "User-friendly message" }),
);
consoleSpy.mockRestore();
```

## Helpers worth extracting

If you find yourself repeating mount setup across specs, factor a `mountComponent(props, options)` helper at the top of the file. Don't extract to a shared `test-utils/` module unless 3+ specs need the exact same helper — premature shared helpers hide intent.

## Anti-patterns

See [`testing-anti-patterns.md`](./testing-anti-patterns.md). The most common ones:

- Asserting on `wrapper.vm.internalState`
- CSS-class or nth-child selectors
- Tests that pass when the component is removed entirely (no real assertion)
- Mocking the system under test
