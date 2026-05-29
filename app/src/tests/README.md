# Test Utilities Guide

## Global mocks are mandatory

The Vitest setup files under [`setup/`](./setup) call `vi.mock(...)` once for every commonly used dependency: wagmi (`@wagmi/vue`, `@wagmi/core`, `@/wagmi.config`), `viem`, TanStack Query, Apollo, Pinia stores (`@/stores/*`), the canned `@/queries/*.queries` hooks, the ERC20-style `@/composables/<domain>/{reads,writes}` modules, the stubbed Nuxt UI primitives (`Modal`, `Tooltip`, `SelectMenu`, `Icon`, `Button`, `Calendar`, `Popover`, `DropdownMenu`), `@/lib/axios`, `@/utils`, and more. Per-test override hooks (`mockTeamStore`, `mockERC20Reads`, `resetERC20Mocks`, …) are re-exported from [`@/tests/mocks`](./mocks).

**Specs must reuse the global mocks**, not re-declare them locally:

```typescript
// ❌ Don't — already mocked in src/tests/setup/wagmi.vue.setup.ts
vi.mock('@wagmi/vue', () => ({
  /* … */
}))

// ✅ Do — override the per-test value on the shared mock
import { mockERC20Reads, resetERC20Mocks } from '@/tests/mocks'

beforeEach(() => resetERC20Mocks())
mockERC20Reads.balanceOf.data.value = 1000n
```

ESLint enforces this via `no-restricted-syntax`: any `vi.mock('<globally-mocked-path>')` call in a spec file is an error. The list of banned paths and the legacy-offender allow-list live in [`app/eslint.config.js`](../../eslint.config.js) under `bannedGlobalMockPaths` / `globalMockLegacyFiles`. The full mock system is documented in [`docs/testing/MOCK_SYSTEM.md`](../../../docs/testing/MOCK_SYSTEM.md).

If you need to mock a module that **isn't** yet globally mocked but you're reaching for it across several specs, add it to `src/tests/setup/` and re-export the override hook from `src/tests/mocks/index.ts` rather than re-mocking it in each spec.

## Testing Components that Use Nuxt UI

### TL;DR

**Most Nuxt UI components are already stubbed globally.** Just `mount()` your component — no extra setup needed for `UButton`, `UIcon`, `UModal`, `UTooltip`, `USelectMenu`, `UDropdownMenu`, or `UCalendar`.

```typescript
import { mount } from '@vue/test-utils'
import MyComponent from '@/components/MyComponent.vue'

describe('MyComponent', () => {
  it('renders', () => {
    const wrapper = mount(MyComponent)
    expect(wrapper.text()).toContain('hello')
  })
})
```

### Globally Stubbed Components

These are replaced automatically in every test via `src/tests/setup/nuxt-ui.setup.ts`:

| Component       | Stub behavior                                                                                                                                                                                          |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `UButton`       | `<button>` with `disabled` set when `loading` or `disabled` prop is true. The `icon`/`trailingIcon` props render as `<span data-test="u-icon" data-icon="...">`. The `class` attribute passes through. |
| `UIcon`         | `<span data-test="u-icon" data-icon="{name}">` (no visible text)                                                                                                                                       |
| `UModal`        | Renders `<slot />` always. When `open=true`, also renders header/body slots plus a `data-test="close-wage-modal-button"` button that emits `update:open=false`.                                        |
| `UTooltip`      | Transparent wrapper — just renders the default slot                                                                                                                                                    |
| `USelectMenu`   | `<div data-test="u-select-menu">` with trigger button and item list when `open=true`                                                                                                                   |
| `UDropdownMenu` | `<div data-test="u-dropdown">` wrapping the default slot                                                                                                                                               |
| `UCalendar`     | `<div data-test="u-calendar" />`                                                                                                                                                                       |

### Components NOT Globally Stubbed

`UInput`, `UForm`, `UFormField`, `UTextarea`, `USelect`, `UCheckbox`, `USwitch`, `URadioGroup`, `UTable`, `UBadge`, `UAlert`, `UCard`, `UAvatar`, `USkeleton`, `USeparator`, etc. render their real implementation in tests. This keeps form/table/display behavior realistic.

If one of these causes issues in your test, stub it locally in your `mount()` call.

## Banned Test Patterns

Two patterns are flagged by ESLint and must not be added to new specs.

### 1. Asserting on Tailwind / utility classes

Tests that assert on framework-specific class names break on every styling refactor — a class rename in a Vue file triggers test failures unrelated to behavior.

```typescript
// ❌ Don't
expect(wrapper.classes()).toContain('bg-teal-50')
expect(badge.classes()).toContain('badge-warning')

// ✅ Prefer behavioral assertions
expect(wrapper.find('[data-test="confirm-button"]').exists()).toBe(true)
expect(wrapper.text()).toContain('Pending')
expect(wrapper.emitted('confirm')).toBeTruthy()
```

If a class genuinely encodes domain semantics (rare), use a `data-test`/`data-state` attribute on the element instead and assert against that.

### 2. Casting `wrapper.vm` to reach internal state

`wrapper.vm as XxxVm` couples tests to component internals — refs, computed properties, helper functions. The test passes whether or not the component is wired to the DOM, so it can't catch wiring regressions, and any rename inside the component breaks the test for no good reason.

```typescript
// ❌ Don't
const vm = wrapper.vm as unknown as { handleSelect: (id: string) => void; isOpen: boolean }
vm.handleSelect('usdc')
expect(vm.isOpen).toBe(true)

// ✅ Drive the component through its public surface
await wrapper.find('[data-test="token-select"]').setValue('usdc')
expect(wrapper.emitted('update:modelValue')?.at(-1)?.[0]).toEqual('usdc')
```

Use:

- `data-test` selectors and DOM events (`trigger('click')`, `setValue(...)`) to drive the component.
- `wrapper.emitted(...)` to assert outputs.
- `wrapper.setProps(...)` and rendered text/attributes to assert state.
- `wrapper.findComponent({ name: 'UFoo' }).props(...)` when you need to verify what a child receives — props are part of the contract, internal helpers are not.

`app/src/components/forms/__tests__/TokenAmount.spec.ts` is the reference example for the pattern.

## Migrating Legacy Specs Off `wrapper.vm as X`

When you touch an existing spec that's whitelisted in `vmCastLegacyFiles` / `vmCastLegacyExtraFiles` (in [`app/eslint.config.js`](../../eslint.config.js)), drain the casts as part of your change — don't leave them. Here's the recipe per cast type.

### Cast type 1 — state mutation

`(wrapper.vm as X).formData.name = 'foo'` / `vm.totalAmount = '100'`

Find the input bound to that field (`v-model="..."`) and drive it through its real surface:

- **Native input** — `wrapper.find('input[data-test="..."]').setValue('foo')`
- **Nuxt UI auto-imported component not in the global stub list** (`UInput`, `USelect`, `UTable`, …) — register a local mock to expose the stub under a queryable `name`, then emit `update:modelValue`:
  ```ts
  vi.mock('@nuxt/ui/components/Input.vue', () => ({
    default: defineComponent({
      name: 'UInput',
      props: ['modelValue'],
      emits: ['update:modelValue'],
      template: '<input />'
    })
  }))
  // …
  await wrapper.findComponent({ name: 'UInput' }).vm.$emit('update:modelValue', 'foo')
  ```
  Auto-imports bypass `global.stubs`; `vi.mock` is the reliable hook. See "Adding a New Global Stub" above for the canonical recipe.
- **Local child form component** — `wrapper.findComponent({ name: 'SelectMember' }).vm.$emit('update:modelValue', { address: '0x...' })`

### Cast type 2 — handler call

`(wrapper.vm as X).handleSubmit(payload)` / `vm.openModal()`

The parent listens to a child's emit (e.g. `@submit="handleSubmit"`). Drive the emit, or the user-action that triggers it:

```ts
// Drive the child form's submit emit
await wrapper.findComponent({ name: 'PayDividendsForm' }).vm.$emit('submit', payload)

// Or click the button that calls handleSubmit / openModal in the template
await wrapper.find('[data-test="pay-dividends-button"]').trigger('click')
```

If a button carries `:disabled` (e.g. a `coming soon` feature flag) and a DOM click is suppressed, emit the click on the component to bypass the HTML disabled while preserving the `@click` binding:

```ts
await wrapper.findComponent({ name: 'ActionButton' }).vm.$emit('click')
```

### Cast type 3 — state read

`(wrapper.vm as X).displayedTransactions` / `vm.errorMessage` / `vm.modal.show`

Read from the observable surface the parent passes downstream:

- **Computed passed to a child** — `wrapper.findComponent({ name: 'UTable' }).props('data')`
- **Error message rendered in UAlert** — `wrapper.text()` or `wrapper.findComponent({ name: 'UAlert' }).text()`
- **Modal open state** — `wrapper.findComponent({ name: 'UModal' }).props('open')`, or assert that the modal's slot content is rendered (`findComponent(InnerForm).exists()`)

### Cast type 4 — `defineExpose`'d public API

If a component does `defineExpose({ reset, openModalForDay })`, those methods are part of its contract — but `wrapper.vm.reset()` still trips the lint rule, and rightly so: the test should consume the API the way a real parent does.

**Preferred — `ParentHarness` pattern.** Mount through a tiny harness that holds a template ref:

```ts
const ParentHarness = defineComponent({
  components: { CreateAddCampaign },
  setup() {
    const child = ref<InstanceType<typeof CreateAddCampaign>>()
    return { child, callReset: () => child.value?.reset() }
  },
  template: '<CreateAddCampaign ref="child" />'
})

const wrapper = mount(ParentHarness)
wrapper.vm.callReset() // accesses the harness's own surface — not a cast
```

`app/src/components/sections/ContractManagementView/forms/__tests__/CreateAddCampaign.spec.ts` is the reference example.

**Fallback — scoped `eslint-disable` with a reason.** If a harness is overkill (the API has no real consumer yet), document inline:

```ts
// eslint-disable-next-line no-restricted-syntax -- defineExpose'd public API, no UI event triggers it
const vm = wrapper.vm as unknown as { openModalForDay: (day: Date) => void }
```

### When `eslint-disable` is acceptable

Sparingly, and always with a `-- <reason>` after the rule name:

- **Unreachable defensive branch.** A guard like `if (amount === 0)` in `submit()` that an upstream Zod schema already rejects. Either delete the dead guard, or keep the cast as proof the guard exists for defense-in-depth.
- **Pure computed without UI surface.** Values like `activeMembers`, `tokenBalance` consumed only by other internals; nothing observable renders them.
- **`defineExpose`'d API not yet wired to a parent.** See above.

Code review will quote the `--` reason, so make it specific.

### Reference examples by pattern

| Pattern                                      | Reference spec                                                                                     |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Canonical (DOM + emit + props)               | `app/src/components/forms/__tests__/TokenAmount.spec.ts`                                           |
| UTable / USelect / CustomDatePicker drive    | `app/src/components/sections/SherTokenView/__tests__/InvestorsTransaction.spec.ts`                 |
| Child form `$emit('submit', ...)`            | `app/src/components/sections/SherTokenView/InvestorActions/__tests__/PayDividendsAction.spec.ts`   |
| Heavy state mutation → DOM-driven helper     | `app/src/components/sections/VestingView/forms/__tests__/CreateVestingInitial.spec.ts`             |
| `defineExpose` via `ParentHarness`           | `app/src/components/sections/ContractManagementView/forms/__tests__/CreateAddCampaign.spec.ts`     |
| Bypass `:disabled` button via component emit | `app/src/components/sections/SherTokenView/InvestorActions/__tests__/DistributeMintAction.spec.ts` |

## Common Testing Patterns

### Finding stubbed buttons and icons

```typescript
// UButton with icon prop
expect(wrapper.find('[data-test="edit-button"]').exists()).toBe(true)
expect(wrapper.find('[data-test="u-icon"][data-icon="heroicons:pencil-square"]').exists()).toBe(
  true
)

// UIcon (standalone)
expect(wrapper.find('[data-test="u-icon"]').exists()).toBe(true)
```

**Do not** search for `svg` elements — the stubs render `<span>`, not SVG.

### Testing UModal

```typescript
// Modal body is rendered even when closed (stub renders the default slot unconditionally)
await wrapper.find('[data-test="open-modal"]').trigger('click')
await nextTick()
expect(wrapper.find('[role="dialog"]').exists()).toBe(false) // stub has no role="dialog"
expect(wrapper.findComponent({ name: 'MyModalContent' }).exists()).toBe(true)

// Close via built-in stub close button
await wrapper.find('[data-test="close-wage-modal-button"]').trigger('click')
```

### Testing USelectMenu

```typescript
// Open the menu
await wrapper.find('[data-test="select-trigger"]').trigger('click')
await nextTick()

// Click an item
const items = wrapper.findAll('li')
await items[0].trigger('click')
// emits update:modelValue and update:open
```

### When you need the REAL component

If your test specifically exercises the real Nuxt UI component's behavior (e.g. testing `USelectMenu`'s search/filter logic), override the stub locally:

```typescript
import { mount } from '@vue/test-utils'
import { vi } from 'vitest'

// Unmock the vi.mock() at the module level
vi.unmock('@nuxt/ui/components/SelectMenu.vue')

const wrapper = mount(MyComponent, {
  global: {
    stubs: {
      // Override the config.global.stubs entries
      USelectMenu: false,
      SelectMenu: false
    }
  }
})
```

Both steps are required: `vi.unmock()` restores the real module, and `stubs: { X: false }` disables the name-based global stubs.

## Provider Contexts (TooltipProvider)

Some reka-ui primitives require a `TooltipProvider` ancestor. `UTooltip` is already globally mocked, so you normally don't need this. But if you test a component that uses reka-ui primitives directly, use `mountWithProviders`:

```typescript
import { mountWithProviders } from '@/tests/setup/nuxt-ui.setup'

const wrapper = mountWithProviders(MyComponent, {
  global: {
    plugins: [createTestingPinia({ createSpy: vi.fn })]
  }
})
```

## Adding a New Global Stub

If you find yourself stubbing the same Nuxt UI component in many tests, add it to the global setup.

1. **Add the stub** in `src/tests/stubs/nuxt-ui.stubs.ts`:

   ```typescript
   export const UMyComponentStub = defineComponent({
     name: 'UMyComponent',
     props: ['modelValue', 'label'],
     emits: ['update:modelValue'],
     setup(props, { slots }) {
       return () => h('div', { 'data-test': 'u-my-component' }, slots.default?.())
     }
   })
   ```

2. **Register it** in `src/tests/setup/nuxt-ui.setup.ts`:

   ```typescript
   // For reliability, use vi.mock for the module path
   vi.mock('@nuxt/ui/components/MyComponent.vue', async () => {
     const { UMyComponentStub } = await import('../stubs/nuxt-ui.stubs')
     return { default: UMyComponentStub }
   })

   // Also add to config.global.stubs under BOTH keys (with and without U prefix)
   config.global.stubs = {
     ...config.global.stubs,
     UMyComponent: UMyComponentStub,
     MyComponent: UMyComponentStub
   }
   ```

**Why both?** Auto-imported components may be registered internally by filename (e.g. `MyComponent`) rather than by the auto-import alias (`UMyComponent`). Registering both keys ensures the stub is always matched.

**Why `vi.mock` AND `config.global.stubs`?**

- `vi.mock` intercepts module imports — catches components imported by other `@nuxt/ui` components internally.
- `config.global.stubs` matches by component name at render time — catches auto-imported components.
- Together they cover every import path.

## Stub Design Guidelines

When writing a stub:

- **Keep it simple** — stubs exist to remove complexity, not replicate behavior.
- **Forward relevant props/events** — if the parent test checks `modelValue` or emits, the stub must support them.
- **Use `data-test` attributes** for querying (e.g. `data-test="u-select-menu"`).
- **Don't render text content from icon names** — use `data-icon` attribute instead, to avoid polluting `.text()` assertions.
- **Don't declare `class` as a prop** — let it pass through as an attribute so parent `:class` bindings apply to the root element.
- **Reflect `loading` in `disabled`** for interactive stubs — matches real Nuxt UI behavior where loading implies disabled.

## Troubleshooting

### `wrapper.find('svg').exists()` returns false

Stubs render `<span data-test="u-icon">`, not SVG. Query `[data-test="u-icon"]` instead.

### `findComponent({ name: 'UXxx' })` returns an empty wrapper

Auto-imported components may be registered under the filename (without the `U` prefix). Try `findComponent({ name: 'Xxx' })` or import the stub directly and use `findComponent(UXxxStub)`.

### The real component renders despite a global stub

The component is likely auto-imported via a path not covered by `vi.mock()`. Add a `vi.mock()` entry for its module path, or add its filename-based name to `config.global.stubs` (e.g. `SelectMenu` alongside `USelectMenu`).

### My test checks Nuxt UI's CSS classes and they're missing

Stubs don't replicate Nuxt UI's theming classes. Either override the stub locally (`stubs: { UButton: false }`) or assert on the props/bound classes rather than the theme classes.
