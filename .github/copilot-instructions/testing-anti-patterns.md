# Testing Anti-Patterns

## What to Avoid in Testing

This document outlines common testing anti-patterns and mistakes to avoid when writing tests for the CNC Portal project. Each anti-pattern is shown with examples of what NOT to do and the correct approach.

## Component Testing Anti-Patterns

### 1. Testing Implementation Details

❌ **Bad: Testing internal component state**

```typescript
it('should have correct internal state', () => {
  const wrapper = mount(Component)
  expect(wrapper.vm.internalValue).toBe('expected')
  expect(wrapper.vm.$data.privateProperty).toBeDefined()
})
```

✅ **Good: Testing user-visible behavior**

```typescript
it('should display selected value in trigger', () => {
  const wrapper = mount(Component, {
    props: { modelValue: 'test-value' }
  })
  expect(wrapper.find('[data-test="trigger"]').text()).toContain('Test Value')
})
```

### 2. Fragile Element Selection

❌ **Bad: Selecting by CSS classes or DOM structure**

```typescript
it('should render button', () => {
  const wrapper = mount(Component)
  expect(wrapper.find('.btn-primary').exists()).toBe(true)
  expect(wrapper.find('div > ul > li:first-child').exists()).toBe(true)
  expect(wrapper.find('button.submit').exists()).toBe(true)
})
```

✅ **Good: Using stable data-test attributes**

```typescript
it('should render button', () => {
  const wrapper = mount(Component)
  expect(wrapper.find('[data-test="submit-button"]').exists()).toBe(true)
  expect(wrapper.find('[data-test="option-list"]').exists()).toBe(true)
  expect(wrapper.find('[data-test="first-option"]').exists()).toBe(true)
})
```

### 3. Generic Test Descriptions

❌ **Bad: Non-descriptive test names**

```typescript
describe('Component', () => {
  it('works correctly', () => {})
  it('handles events', () => {})
  it('renders properly', () => {})
  it('does stuff', () => {})
  it('is functional', () => {})
})
```

✅ **Good: Specific behavior descriptions**

```typescript
describe('SelectComponent', () => {
  it('should emit update:modelValue event when option is selected', () => {})
  it('should disable submit button when form validation fails', () => {})
  it('should show error message for invalid email format', () => {})
  it('should close dropdown when clicking outside', () => {})
  it('should navigate options using arrow keys', () => {})
})
```

### 4. Testing Multiple Concerns in One Test

❌ **Bad: Multiple responsibilities in one test**

```typescript
it('should handle form submission and validation and error states and success states', async () => {
  const wrapper = mount(Form)
  
  // Testing validation
  expect(wrapper.find('[data-test="error"]').exists()).toBe(false)
  
  // Testing submission
  await wrapper.find('[data-test="submit"]').trigger('click')
  
  // Testing error handling
  expect(mockError).toHaveBeenCalled()
  
  // Testing success state
  expect(mockSuccess).toHaveBeenCalled()
  
  // Testing form reset
  expect(wrapper.vm.formData).toEqual({})
})
```

✅ **Good: Single responsibility per test**

```typescript
describe('Form Validation', () => {
  it('should show error message for required fields', () => {
    const wrapper = mount(Form, { props: { required: true } })
    expect(wrapper.find('[data-test="required-error"]').exists()).toBe(true)
  })
})

describe('Form Submission', () => {
  it('should emit submit event with form data', async () => {
    const wrapper = mount(Form)
    await wrapper.find('[data-test="submit"]').trigger('click')
    expect(wrapper.emitted('submit')).toBeTruthy()
  })
})

describe('Error Handling', () => {
  it('should display error toast when submission fails', async () => {
    mockSubmit.mockRejectedValue(new Error('Failed'))
    const wrapper = mount(Form)
    await wrapper.vm.handleSubmit()
    expect(mockToast.addError).toHaveBeenCalled()
  })
})
```

### 5. Ignoring Async Operations

❌ **Bad: Not waiting for async operations**

```typescript
it('should update data', () => {
  const wrapper = mount(Component)
  wrapper.vm.fetchData() // Async operation
  expect(wrapper.vm.data).toBe('new-data') // Won't work!
})

it('should handle click', () => {
  const wrapper = mount(Component)
  wrapper.find('button').trigger('click') // Returns promise
  expect(wrapper.emitted('click')).toBeTruthy() // Might fail
})
```

✅ **Good: Proper async testing**

```typescript
it('should update data after fetch completes', async () => {
  const wrapper = mount(Component)
  await wrapper.vm.fetchData()
  await nextTick()
  expect(wrapper.vm.data).toBe('new-data')
})

it('should handle click events correctly', async () => {
  const wrapper = mount(Component)
  await wrapper.find('[data-test="button"]').trigger('click')
  await nextTick()
  expect(wrapper.emitted('click')).toBeTruthy()
})
```

### 6. Insufficient Mock Cleanup

❌ **Bad: Not cleaning up mocks properly**

```typescript
describe('Component', () => {
  it('should work with mock A', () => {
    mockFunction.mockReturnValue('A')
    // Test logic
  })
  
  it('should work with mock B', () => {
    // mockFunction still returns 'A' from previous test!
    mockFunction.mockReturnValue('B')
    // Test might fail due to previous state
  })
})
```

✅ **Good: Proper mock cleanup**

```typescript
describe('Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })
  
  afterEach(() => {
    if (wrapper) wrapper.unmount()
  })
  
  it('should work with mock A', () => {
    mockFunction.mockReturnValue('A')
    // Test logic
  })
  
  it('should work with mock B', () => {
    mockFunction.mockReturnValue('B')
    // Clean slate for each test
  })
})
```

## Web3 Testing Anti-Patterns

### 7. Hardcoded Blockchain Values

❌ **Bad: Using hardcoded values without context**

```typescript
it('should transfer tokens', async () => {
  await contract.transfer('0x123', 1000000000000000000) // What is this number?
  expect(mockTransfer).toHaveBeenCalledWith('0x123', 1000000000000000000)
})
```

✅ **Good: Using descriptive constants and utilities**

```typescript
const TEST_ADDRESS = '0x1234567890123456789012345678901234567890'
const ONE_ETH = parseEther('1')

it('should transfer one ETH to recipient', async () => {
  await contract.transfer(TEST_ADDRESS, ONE_ETH)
  expect(mockTransfer).toHaveBeenCalledWith(TEST_ADDRESS, ONE_ETH)
})
```

### 8. Not Testing Error Scenarios

❌ **Bad: Only testing happy path**

```typescript
describe('Token Transfer', () => {
  it('should transfer tokens successfully', async () => {
    mockTransfer.mockResolvedValue({ hash: '0x123' })
    await wrapper.vm.transferTokens()
    expect(mockSuccess).toHaveBeenCalled()
  })
})
```

✅ **Good: Testing both success and error scenarios**

```typescript
describe('Token Transfer', () => {
  it('should transfer tokens successfully', async () => {
    mockTransfer.mockResolvedValue({ hash: '0x123' })
    await wrapper.vm.transferTokens()
    expect(mockSuccess).toHaveBeenCalled()
  })
  
  it('should handle insufficient funds error', async () => {
    mockTransfer.mockRejectedValue(new Error('Insufficient funds'))
    await wrapper.vm.transferTokens()
    expect(mockErrorToast).toHaveBeenCalledWith('Insufficient funds for transfer')
  })
  
  it('should handle user rejection', async () => {
    mockTransfer.mockRejectedValue(new Error('User rejected'))
    await wrapper.vm.transferTokens()
    expect(mockErrorToast).toHaveBeenCalledWith('Transaction was cancelled')
  })
})
```

### 9. Invalid Address Testing

❌ **Bad: Not validating addresses properly**

```typescript
it('should handle addresses', () => {
  const wrapper = mount(Component, {
    props: { address: 'invalid' } // This should be caught!
  })
  expect(wrapper.vm.isValidAddress).toBe(true) // This will fail
})
```

✅ **Good: Proper address validation testing**

```typescript
describe('Address Validation', () => {
  it('should accept valid Ethereum addresses', () => {
    const validAddresses = [
      '0x1234567890123456789012345678901234567890',
      '0xabcdefABCDEF1234567890123456789012345678'
    ]
    
    validAddresses.forEach(address => {
      expect(isAddress(address)).toBe(true)
    })
  })
  
  it('should reject invalid addresses', () => {
    const invalidAddresses = [
      'invalid-address',
      '0x123', // Too short
      '1234567890123456789012345678901234567890', // Missing 0x
      '0xGHIJKL1234567890123456789012345678901234' // Invalid hex
    ]
    
    invalidAddresses.forEach(address => {
      expect(isAddress(address)).toBe(false)
    })
  })
})
```

## State Management Anti-Patterns

### 10. Direct Store Mutation Testing

❌ **Bad: Testing store internals directly**

```typescript
it('should update store state', () => {
  const store = useTestStore()
  store.$state.value = 'new-value' // Direct mutation
  expect(store.$state.value).toBe('new-value')
})
```

✅ **Good: Testing through actions and getters**

```typescript
it('should update value through action', () => {
  const store = useTestStore()
  store.updateValue('new-value')
  expect(store.value).toBe('new-value')
})
```

### 11. Not Testing Store Integration

❌ **Bad: Only testing isolated components**

```typescript
it('should render component', () => {
  const wrapper = shallowMount(Component) // No store integration
  expect(wrapper.exists()).toBe(true)
})
```

✅ **Good: Testing component-store integration**

```typescript
it('should display data from store', () => {
  const wrapper = mount(Component, {
    global: {
      plugins: [createTestingPinia({
        initialState: {
          user: { name: 'John Doe' }
        }
      })]
    }
  })
  expect(wrapper.find('[data-test="user-name"]').text()).toBe('John Doe')
})
```

## Error Handling Anti-Patterns

### 12. Silent Error Handling

❌ **Bad: Not testing error scenarios**

```typescript
it('should call API', async () => {
  mockApi.mockResolvedValue({ data: 'success' })
  await wrapper.vm.callApi()
  expect(mockApi).toHaveBeenCalled()
  // What if the API fails? No error testing!
})
```

✅ **Good: Testing error handling**

```typescript
describe('API Calls', () => {
  it('should handle successful API response', async () => {
    mockApi.mockResolvedValue({ data: 'success' })
    await wrapper.vm.callApi()
    expect(mockSuccessToast).toHaveBeenCalled()
  })
  
  it('should handle API errors gracefully', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockApi.mockRejectedValue(new Error('Network error'))
    
    await wrapper.vm.callApi()
    
    expect(consoleErrorSpy).toHaveBeenCalledWith('API call failed:', expect.any(Error))
    expect(mockErrorToast).toHaveBeenCalledWith('Failed to load data')
    
    consoleErrorSpy.mockRestore()
  })
})
```

### 13. Not Testing Console Output

❌ **Bad: Ignoring console errors/warnings**

```typescript
it('should handle error', async () => {
  mockFunction.mockImplementation(() => {
    console.error('Something went wrong') // This should be tested!
    throw new Error('Failed')
  })
  
  await wrapper.vm.handleError()
  // No verification of console output
})
```

✅ **Good: Testing console output**

```typescript
it('should log error to console', async () => {
  const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  
  mockFunction.mockImplementation(() => {
    throw new Error('Failed')
  })
  
  await wrapper.vm.handleError()
  
  expect(consoleErrorSpy).toHaveBeenCalledWith(
    'Operation failed:',
    expect.any(Error)
  )
  
  consoleErrorSpy.mockRestore()
})
```

## Performance Anti-Patterns

### 14. Expensive Test Operations

❌ **Bad: Recreating heavy objects in each test**

```typescript
describe('Component', () => {
  it('should work with large dataset', () => {
    const largeDataset = Array.from({ length: 10000 }, (_, i) => ({
      id: i,
      name: `Item ${i}`,
      data: generateComplexData(i)
    })) // Created in every test!
    
    const wrapper = mount(Component, { props: { data: largeDataset } })
    expect(wrapper.exists()).toBe(true)
  })
})
```

✅ **Good: Reusing test data and using smaller datasets**

```typescript
describe('Component', () => {
  const mockData = [
    { id: 1, name: 'Item 1' },
    { id: 2, name: 'Item 2' },
    { id: 3, name: 'Item 3' }
  ]
  
  it('should render items correctly', () => {
    const wrapper = mount(Component, { props: { data: mockData } })
    expect(wrapper.findAll('[data-test="item"]')).toHaveLength(3)
  })
})
```

### 15. Not Using Shallow Mounting When Appropriate

❌ **Bad: Full mounting when testing isolated behavior**

```typescript
it('should emit event when clicked', () => {
  const wrapper = mount(ComplexComponent, {
    global: {
      components: { 
        HeavyChildComponent,
        AnotherHeavyComponent,
        YetAnotherComponent
      }
    }
  }) // Renders all child components unnecessarily
  
  wrapper.find('[data-test="button"]').trigger('click')
  expect(wrapper.emitted('click')).toBeTruthy()
})
```

✅ **Good: Using shallow mount for isolated testing**

```typescript
it('should emit event when clicked', () => {
  const wrapper = shallowMount(ComplexComponent)
  
  wrapper.find('[data-test="button"]').trigger('click')
  expect(wrapper.emitted('click')).toBeTruthy()
})
```

## Accessibility Testing Anti-Patterns

### 16. Ignoring ARIA Attributes

❌ **Bad: Not testing accessibility features**

```typescript
it('should render dropdown', () => {
  const wrapper = mount(DropdownComponent)
  expect(wrapper.find('[data-test="dropdown"]').exists()).toBe(true)
  // No accessibility testing
})
```

✅ **Good: Testing ARIA attributes and keyboard navigation**

```typescript
describe('Accessibility', () => {
  it('should have proper ARIA attributes', () => {
    const wrapper = mount(DropdownComponent)
    const trigger = wrapper.find('[data-test="trigger"]')
    
    expect(trigger.attributes('aria-expanded')).toBe('false')
    expect(trigger.attributes('aria-haspopup')).toBe('true')
    expect(trigger.attributes('role')).toBe('button')
  })
  
  it('should support keyboard navigation', async () => {
    const wrapper = mount(DropdownComponent)
    const trigger = wrapper.find('[data-test="trigger"]')
    
    await trigger.trigger('keydown.enter')
    expect(wrapper.find('[data-test="dropdown"]').exists()).toBe(true)
    
    await trigger.trigger('keydown.escape')
    expect(wrapper.find('[data-test="dropdown"]').exists()).toBe(false)
  })
})
```

## Test Organization Anti-Patterns

### 17. Poor Test Structure

❌ **Bad: Flat test structure without organization**

```typescript
describe('Component', () => {
  it('should render', () => {})
  it('should handle click', () => {})
  it('should validate email', () => {})
  it('should show error', () => {})
  it('should handle keyboard', () => {})
  it('should emit event', () => {})
  // All tests at the same level, hard to navigate
})
```

✅ **Good: Organized test structure**

```typescript
describe('Component', () => {
  describe('Rendering', () => {
    it('should render with default props', () => {})
    it('should render with custom props', () => {})
  })
  
  describe('User Interactions', () => {
    it('should handle click events', () => {})
    it('should handle keyboard navigation', () => {})
  })
  
  describe('Form Validation', () => {
    it('should validate email format', () => {})
    it('should show validation errors', () => {})
  })
  
  describe('Event Handling', () => {
    it('should emit correct events', () => {})
    it('should handle external events', () => {})
  })
})
```

### 18. Duplicate Test Logic

❌ **Bad: Repeating the same setup in multiple tests**

```typescript
it('should handle scenario A', () => {
  const wrapper = mount(Component, {
    props: { value: 'test', enabled: true },
    global: { plugins: [store] }
  })
  mockApi.mockResolvedValue('A')
  // Test logic
})

it('should handle scenario B', () => {
  const wrapper = mount(Component, {
    props: { value: 'test', enabled: true },
    global: { plugins: [store] }
  })
  mockApi.mockResolvedValue('B')
  // Test logic - lots of duplication!
})
```

✅ **Good: Reusable setup functions**

```typescript
describe('Component', () => {
  const createWrapper = (props = {}) => {
    return mount(Component, {
      props: { value: 'test', enabled: true, ...props },
      global: { plugins: [store] }
    })
  }
  
  it('should handle scenario A', () => {
    const wrapper = createWrapper()
    mockApi.mockResolvedValue('A')
    // Test logic
  })
  
  it('should handle scenario B', () => {
    const wrapper = createWrapper()
    mockApi.mockResolvedValue('B')
    // Test logic
  })
})
```

## Summary of Anti-Patterns to Avoid

1. **Don't test implementation details** - Test behavior, not internals
2. **Don't use fragile selectors** - Use data-test attributes
3. **Don't write generic test names** - Be specific about what you're testing
4. **Don't test multiple concerns in one test** - Keep tests focused
5. **Don't ignore async operations** - Properly await promises and state changes
6. **Don't skip mock cleanup** - Reset mocks between tests
7. **Don't hardcode blockchain values** - Use descriptive constants
8. **Don't only test happy paths** - Include error scenarios
9. **Don't ignore address validation** - Test both valid and invalid addresses
10. **Don't test store internals directly** - Use actions and getters
11. **Don't skip store integration testing** - Test component-store interaction
12. **Don't ignore error handling** - Test error scenarios and recovery
13. **Don't skip console output testing** - Verify logging behavior
14. **Don't create expensive operations in tests** - Use minimal test data
15. **Don't always use full mounting** - Use shallow mount when appropriate
16. **Don't ignore accessibility** - Test ARIA attributes and keyboard navigation
17. **Don't use flat test structure** - Organize tests logically
18. **Don't duplicate test setup** - Create reusable helper functions

Following these guidelines will help maintain high-quality, maintainable tests that provide reliable feedback about your code's behavior.
