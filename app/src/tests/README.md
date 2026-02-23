# Test Utilities Guide

## Mounting Components with Nuxt UI Support

### Problem

Nuxt UI components like `UTooltip`, `UPopover`, etc., use `reka-ui` internally which requires provider contexts. Without these providers, tests fail with errors like:

```
Error: Injection `Symbol(TooltipProviderContext)` not found.
Component must be used within `TooltipProvider`
```

### Solution

Use `mountWithProviders` instead of `mount` from `@vue/test-utils`.

## Usage

### Basic Example

```typescript
import { mountWithProviders } from '@/tests/mocks'
import MyComponent from '@/components/MyComponent.vue'

describe('MyComponent', () => {
  it('should render correctly', () => {
    const wrapper = mountWithProviders(MyComponent, {
      props: {
        title: 'Test Title'
      }
    })

    expect(wrapper.text()).toContain('Test Title')
  })
})
```

### With Testing Pinia

```typescript
import { mountWithProviders } from '@/tests/mocks'
import { createTestingPinia } from '@pinia/testing'
import EditUserForm from '@/components/forms/EditUserForm.vue'

const createWrapper = () =>
  mountWithProviders(EditUserForm, {
    global: {
      plugins: [createTestingPinia({ createSpy: vi.fn })],
      stubs: {
        SomeChildComponent: true
      }
    }
  })

describe('EditUserForm', () => {
  it('should work with stores', () => {
    const wrapper = createWrapper()
    // Test your component
  })
})
```

### What It Does

`mountWithProviders` automatically wraps your component with:

- ✅ `TooltipProvider` from reka-ui (enables UTooltip, UPopover, etc.)
- ✅ Future providers can be added as needed

This means **all Nuxt UI components work out of the box** in your tests without manual provider setup!

## When to Use

- ✅ **Always** - Use `mountWithProviders` for all component tests
- ✅ When testing components that use Nuxt UI components
- ✅ When you see provider context errors in tests

## When NOT to Use

- ❌ Don't use if you specifically need to test provider absence
- ❌ Don't use for unit testing pure functions (no mounting needed)

## Implementation Details

The helper is defined in [src/tests/setup/nuxt-ui.setup.ts](./setup/nuxt-ui.setup.ts) and automatically loaded via vitest.config.ts setup files.

## Troubleshooting

### Still getting provider errors?

1. Make sure you're importing from `@/tests/mocks`
2. Check that vitest.config.ts includes `nuxt-ui.setup.ts` in setup files
3. Verify reka-ui is installed: `npm list reka-ui`

### TypeScript errors?

The function has the same signature as `mount` from `@vue/test-utils`, so it should work as a drop-in replacement.
