# Testing Patterns

## Core Testing Patterns

This document contains the essential testing patterns used throughout the CNC Portal project. Each pattern includes examples and explanations of when to use them.

## Component Testing Structure

### Basic Test Structure

```typescript
describe('ComponentName', () => {
  let wrapper: ReturnType<typeof mount>

  // Test data constants
  const mockOptions = [
    { value: 'ETH', label: 'Ethereum' },
    { value: 'USDC', label: 'USD Coin' }
  ]

  // Test selectors
  const SELECTORS = {
    trigger: '[data-test="component-trigger"]',
    dropdown: '[data-test="component-dropdown"]',
    submitBtn: '[data-test="submit-btn"]'
  } as const

  // Setup and cleanup
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    if (wrapper) wrapper.unmount()
  })

  // Helper function for component creation
  const mountComponent = (props = {}) => {
    return mount(Component, {
      props: { ...defaultProps, ...props },
      global: {
        components: { ChildComponent },
        plugins: [createTestingPinia({ createSpy: vi.fn })]
      }
    })
  }

  describe('Component Rendering', () => {
    it('should render the component with all required elements', () => {
      wrapper = mountComponent()
      expect(wrapper.find('[data-test="main-element"]').exists()).toBe(true)
    })
  })
})
```

### Mock Management with Hoisted Variables

```typescript
// Hoisted variables for mocks (before vi.mock calls)
const { mockReadContract, mockWriteContract, mockTeamStore, mockToastStore } = vi.hoisted(() => ({
  mockReadContract: vi.fn(),
  mockWriteContract: vi.fn(),
  mockTeamStore: {
    getContractAddressByType: vi.fn((type) => {
      if (type === 'InvestorsV1') return '0x1234567890123456789012345678901234567890'
      return undefined
    })
  },
  mockToastStore: {
    addErrorToast: vi.fn(),
    addSuccessToast: vi.fn()
  }
}))

// Mock external dependencies
vi.mock('@wagmi/core', () => ({
  readContract: mockReadContract,
  writeContract: mockWriteContract
}))

vi.mock('@/stores', () => ({
  useTeamStore: vi.fn(() => mockTeamStore),
  useToastStore: vi.fn(() => mockToastStore)
}))

// Reset mocks between tests
beforeEach(() => {
  vi.clearAllMocks()
})
```

## Component Testing Patterns

### Initial Rendering Tests

```typescript
describe('Initial Rendering and Value Handling', () => {
  it('should emit initial value when no modelValue is provided', async () => {
    const wrapper = mountComponent({ options: mockOptions })
    await nextTick()

    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['ETH'])
    expect(wrapper.text()).toContain('Ethereum')
  })

  it('should not emit initial value when modelValue is explicitly provided', async () => {
    const wrapper = mountComponent({
      options: mockOptions,
      modelValue: 'BTC'
    })
    await nextTick()

    expect(wrapper.emitted('update:modelValue')).toBeFalsy()
    expect(wrapper.text()).toContain('Bitcoin')
  })

  it('should react to external modelValue changes', async () => {
    const wrapper = mountComponent({
      options: mockOptions,
      modelValue: 'ETH'
    })

    expect(wrapper.text()).toContain('Ethereum')

    await wrapper.setProps({ modelValue: 'BTC' })
    await nextTick()

    expect(wrapper.text()).toContain('Bitcoin')
  })
})
```

### User Interaction Testing

```typescript
describe('User Interactions', () => {
  it('should emit correct events when button is clicked', async () => {
    wrapper = mountComponent()
    await wrapper.find(SELECTORS.submitBtn).trigger('click')
    expect(wrapper.emitted('submit')).toBeTruthy()
  })

  it('should show dropdown when trigger is clicked', async () => {
    const wrapper = mountComponent()

    await wrapper.find(SELECTORS.trigger).trigger('click')
    await nextTick()

    expect(wrapper.find(SELECTORS.dropdown).exists()).toBe(true)
  })

  it('should close dropdown after option selection', async () => {
    const wrapper = mountComponent()

    await wrapper.find(SELECTORS.trigger).trigger('click')
    await wrapper.findAll('[data-test="option"]')[0].trigger('click')
    await nextTick()

    expect(wrapper.find(SELECTORS.dropdown).exists()).toBe(false)
  })
})
```

### Form Input Testing

```typescript
describe('Form Input Handling', () => {
  it('should update model value when input changes', async () => {
    const wrapper = mountComponent()
    const input = wrapper.find('[data-test="address-input"]')
    
    await input.setValue('0x1234567890123456789012345678901234567890')
    
    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['0x1234567890123456789012345678901234567890'])
  })

  it('should validate input on blur', async () => {
    const wrapper = mountComponent()
    const input = wrapper.find('[data-test="address-input"]')
    
    await input.setValue('invalid-address')
    await input.trigger('blur')
    await nextTick()
    
    expect(wrapper.find('[data-test="error-message"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="error-message"]').text()).toBe('Invalid address')
  })
})
```

### Async Operation Testing

```typescript
describe('Async Operations', () => {
  it('should handle async operations correctly', async () => {
    mockAsyncFunction.mockResolvedValue(expectedResult)
    wrapper = mountComponent()
    
    await wrapper.find('[data-test="submit-btn"]').trigger('click')
    await nextTick()
    await flushPromises()
    
    expect(wrapper.emitted('submit')).toBeTruthy()
    expect(mockAsyncFunction).toHaveBeenCalledWith(expectedArgs)
  })

  it('should show loading state during async operations', async () => {
    let resolvePromise: (value: unknown) => void
    const pendingPromise = new Promise((resolve) => {
      resolvePromise = resolve
    })
    mockAsyncFunction.mockReturnValue(pendingPromise)

    wrapper = mountComponent()
    const button = wrapper.find('[data-test="submit-btn"]')
    await button.trigger('click')

    // Check loading state
    expect(wrapper.findComponent(ButtonUI).props('loading')).toBe(true)
    
    resolvePromise!({})
    await flushPromises()
    
    // Check loading state is cleared
    expect(wrapper.findComponent(ButtonUI).props('loading')).toBe(false)
  })
})
```

### Error Handling Testing

```typescript
describe('Error Handling', () => {
  it('should handle contract errors gracefully', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockWriteContract.mockRejectedValue(new Error('Transaction failed'))
    
    wrapper = mountComponent()
    await wrapper.find('[data-test="submit-btn"]').trigger('click')
    await flushPromises()

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Error message prefix:',
      expect.any(Error)
    )
    expect(mockToastStore.addErrorToast).toHaveBeenCalledWith(
      'User-friendly error message'
    )
    
    consoleErrorSpy.mockRestore()
  })

  it('should handle function errors gracefully with fallbacks', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    
    wrapper = mountComponent({
      formatValue: () => { throw new Error('Format error') }
    })
    
    expect(wrapper.text()).toContain('fallback-value')
    expect(consoleSpy).toHaveBeenCalledWith(
      'Error formatting select value:', 
      expect.any(Error)
    )
    
    consoleSpy.mockRestore()
  })
})
```

## Keyboard Navigation Testing

```typescript
describe('Keyboard Navigation', () => {
  it('should open dropdown when Enter key is pressed', async () => {
    const wrapper = mountComponent()

    await wrapper.find(SELECTORS.trigger).trigger('keydown.enter')
    await nextTick()

    expect(wrapper.find(SELECTORS.dropdown).exists()).toBe(true)
  })

  it('should navigate options with arrow keys', async () => {
    const wrapper = mountComponent()

    await wrapper.find(SELECTORS.trigger).trigger('click')
    await nextTick()

    // Navigate down to second option
    await wrapper.find(SELECTORS.trigger).trigger('keydown', { key: 'ArrowDown' })
    await nextTick()

    const anchors = wrapper.findAll('[data-test="option-anchor"]')
    expect(anchors[1].classes()).toContain('focus')
  })

  it('should respect option boundaries during navigation', async () => {
    const wrapper = mountComponent()
    await wrapper.find(SELECTORS.trigger).trigger('click')
    await nextTick()

    const anchors = wrapper.findAll('[data-test="option-anchor"]')
    const trigger = wrapper.find(SELECTORS.trigger)

    // Try to navigate above first option - should stay at first
    await trigger.trigger('keydown', { key: 'ArrowUp' })
    await nextTick()
    expect(anchors[0].classes()).toContain('focus')

    // Navigate to last option and try to go beyond
    for (let i = 0; i < anchors.length; i++) {
      await trigger.trigger('keydown', { key: 'ArrowDown' })
    }
    await nextTick()

    expect(anchors[anchors.length - 1].classes()).toContain('focus')
  })
})
```

## Component Communication Testing

```typescript
describe('Component Communication', () => {
  it('should pass correct props to child components', () => {
    wrapper = mountComponent({ options: mockOptions })
    const selectComponent = wrapper.findComponent(SelectComponent)
    
    expect(selectComponent.exists()).toBe(true)
    expect(selectComponent.props('options')).toEqual(mockOptions)
  })

  it('should handle child component events', async () => {
    wrapper = mountComponent()
    const selectComponent = wrapper.findComponent(SelectComponent)
    
    // Simulate child component emitting event
    await selectComponent.vm.$emit('update:modelValue', 'new-value')
    await nextTick()
    
    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
  })

  it('should render conditional child components', async () => {
    wrapper = mountComponent({ showChild: false })
    expect(wrapper.findComponent(ChildComponent).exists()).toBe(false)

    await wrapper.setProps({ showChild: true })
    await nextTick()
    
    expect(wrapper.findComponent(ChildComponent).exists()).toBe(true)
  })
})
```

## State Management Testing

```typescript
describe('State Management', () => {
  it('should react to external prop changes', async () => {
    wrapper = mountComponent({ modelValue: 'initial' })
    expect(wrapper.text()).toContain('Initial Value')

    await wrapper.setProps({ modelValue: 'updated' })
    await nextTick()
    
    expect(wrapper.text()).toContain('Updated Value')
  })

  it('should enable button when form is valid', async () => {
    wrapper = mountComponent()
    
    await wrapper.setProps({
      formData: { 
        requiredField: 'valid-value',
        addressField: '0x1234567890123456789012345678901234567890'
      }
    })
    await nextTick()
    
    expect(wrapper.findComponent(ButtonUI).props('disabled')).toBe(false)
  })
})
```

## Loading States Testing

```typescript
describe('Loading States', () => {
  it('should show loading spinner when data is fetching', () => {
    wrapper = mountComponent({ loading: true })
    expect(wrapper.find('[data-test="loading-spinner"]').exists()).toBe(true)
  })

  it('should hide content during loading', () => {
    wrapper = mountComponent({ loading: true })
    expect(wrapper.find('[data-test="main-content"]').exists()).toBe(false)
  })

  it('should show content after loading completes', async () => {
    wrapper = mountComponent({ loading: true })
    
    await wrapper.setProps({ loading: false })
    await nextTick()
    
    expect(wrapper.find('[data-test="loading-spinner"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="main-content"]').exists()).toBe(true)
  })
})
```

## Edge Cases and Boundary Testing

```typescript
describe('Edge Cases and Boundaries', () => {
  it('should handle empty options array gracefully', () => {
    wrapper = mountComponent({ options: [] })
    expect(wrapper.text()).toBe('')
  })

  it('should handle invalid addresses', () => {
    wrapper = mountComponent({ address: 'invalid-address' })
    expect(wrapper.find('[data-test="error-message"]').exists()).toBe(true)
  })

  it('should handle undefined/null values safely', () => {
    wrapper = mountComponent({ value: null })
    expect(wrapper.text()).toContain('No value selected')
  })

  it('should maintain component stability during rapid prop changes', async () => {
    wrapper = mountComponent({ value: 'initial' })

    // Rapidly change props
    for (let i = 0; i < 10; i++) {
      await wrapper.setProps({ value: `value-${i}` })
    }
    await nextTick()

    expect(wrapper.text()).toContain('value-9')
  })
})
```

## Disabled State Testing

```typescript
describe('Disabled State Behavior', () => {
  it('should prevent all interactions when disabled', async () => {
    wrapper = mountComponent({ disabled: true })
    
    // Test click interaction
    await wrapper.find(SELECTORS.trigger).trigger('click')
    await nextTick()
    expect(wrapper.find(SELECTORS.dropdown).exists()).toBe(false)
    
    // Test keyboard interactions
    await wrapper.find(SELECTORS.trigger).trigger('keydown.enter')
    await nextTick()
    expect(wrapper.find(SELECTORS.dropdown).exists()).toBe(false)
  })

  it('should show disabled styling', () => {
    wrapper = mountComponent({ disabled: true })
    const trigger = wrapper.find(SELECTORS.trigger)
    
    expect(trigger.classes()).toContain('disabled')
    expect(trigger.attributes('aria-disabled')).toBe('true')
  })
})
```

## Utility Functions for Testing

### Common Test Helpers

```typescript
// Centralized test selectors and constants
const SELECTORS = {
  trigger: '[data-test="generic-selector"]',
  dropdown: '[data-test="options-dropdown"]',
  options: 'li',
  optionAnchors: 'a',
  submitBtn: '[data-test="submit-btn"]',
  loadingSpinner: '[data-test="loading-spinner"]'
} as const

const MOCK_DATA = {
  validAddress: '0x1234567890123456789012345678901234567890',
  invalidAddress: 'invalid-address',
  options: [
    { value: 'ETH', label: 'Ethereum' },
    { value: 'USDC', label: 'USD Coin' }
  ]
} as const

// Reusable test helpers
const waitForAsyncOperation = async () => {
  await nextTick()
  await flushPromises()
}

const expectToastMessage = (type: 'success' | 'error', message: string) => {
  if (type === 'success') {
    expect(mockToastStore.addSuccessToast).toHaveBeenCalledWith(message)
  } else {
    expect(mockToastStore.addErrorToast).toHaveBeenCalledWith(message)
  }
}

// Component mounting with defaults
const createWrapper = (props = {}, options = {}) => {
  return mount(Component, {
    props: { ...defaultProps, ...props },
    global: {
      components: { RequiredChildComponent },
      plugins: [createTestingPinia({ createSpy: vi.fn })],
      ...options.global
    }
  })
}
```

### Form Testing Helpers

```typescript
// Form interaction helpers
const fillForm = async (wrapper: any, formData: Record<string, any>) => {
  for (const [field, value] of Object.entries(formData)) {
    const input = wrapper.find(`[data-test="${field}-input"]`)
    await input.setValue(value)
  }
}

const submitForm = async (wrapper: any) => {
  await wrapper.find('[data-test="submit-btn"]').trigger('click')
  await waitForAsyncOperation()
}

// Validation helpers
const expectFormError = (wrapper: any, field: string, message: string) => {
  const errorElement = wrapper.find(`[data-test="error-${field}"]`)
  expect(errorElement.exists()).toBe(true)
  expect(errorElement.text()).toBe(message)
}

const expectFormValid = (wrapper: any) => {
  expect(wrapper.find('[data-test="submit-btn"]').props('disabled')).toBe(false)
  expect(wrapper.findAll('[data-test^="error-"]')).toHaveLength(0)
}
```
