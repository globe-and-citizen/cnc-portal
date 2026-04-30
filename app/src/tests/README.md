# Test Utilities Guide

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
