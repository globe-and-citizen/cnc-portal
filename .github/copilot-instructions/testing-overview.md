# Testing Overview

## Testing Philosophy

The CNC Portal project follows a comprehensive testing strategy that ensures code reliability, maintainability, and user experience quality. Our testing approach prioritizes behavior-driven testing over implementation details.

## Testing Framework Stack

- **Unit & Component Testing**: Vitest
- **Test Utilities**: Vue Test Utils
- **Mocking**: Vitest mocking system
- **E2E Testing**: Playwright
- **Coverage**: Built-in Vitest coverage

## Test File Organization

### Directory Structure

```text
src/
├── components/
│   ├── ComponentName.vue
│   └── __tests__/
│       ├── ComponentName.spec.ts          # Basic functionality tests
│       └── ComponentName.advanced.spec.ts # Complex features & edge cases
├── composables/
│   ├── useCustomComposable.ts
│   └── __tests__/
│       └── useCustomComposable.spec.ts
└── utils/
    ├── helpers.ts
    └── __tests__/
        └── helpers.spec.ts
```

### Test Categories

#### 1. Unit Tests (`*.spec.ts`)

- Pure functions and utilities
- Individual component behavior
- Composable functions
- Store actions and getters

#### 2. Integration Tests (`*.integration.spec.ts`)

- Component interaction with stores
- API integration with composables
- Multi-component workflows

#### 3. E2E Tests (`test/e2e/`)

- Full user journeys
- Cross-browser compatibility
- Real blockchain interaction testing

## Test Naming Conventions

### File Naming

- **Basic tests**: `ComponentName.spec.ts`
- **Advanced tests**: `ComponentName.advanced.spec.ts`
- **Integration tests**: `ComponentName.integration.spec.ts`
- **E2E tests**: `component-name.e2e.spec.ts`

### Test Structure

```typescript
describe('ComponentName', () => {
  describe('Component Rendering', () => {
    // Basic rendering tests
  })

  describe('User Interactions', () => {
    // Click, keyboard, form interactions
  })

  describe('State Management', () => {
    // Props, emits, reactive state
  })

  describe('Loading States', () => {
    // Async operations and loading indicators
  })

  describe('Error Handling', () => {
    // Error scenarios and fallbacks
  })

  describe('Edge Cases', () => {
    // Boundary conditions and unusual inputs
  })
})
```

## Test Data Management

### Mock Data Organization

```typescript
// Constants for reusable test data
const MOCK_DATA = {
  validAddress: '0x1234567890123456789012345678901234567890',
  invalidAddress: 'invalid-address',
  options: [
    { value: 'ETH', label: 'Ethereum' },
    { value: 'USDC', label: 'USD Coin' }
  ],
  userProfiles: [
    { id: 1, name: 'John Doe', address: '0x123...' },
    { id: 2, name: 'Jane Doe', address: '0x456...' }
  ]
} as const
```

### Test Selectors

```typescript
// Centralized selectors for consistent element targeting
const SELECTORS = {
  trigger: '[data-test="component-trigger"]',
  dropdown: '[data-test="options-dropdown"]',
  submitBtn: '[data-test="submit-btn"]',
  loadingSpinner: '[data-test="loading-spinner"]',
  errorMessage: '[data-test="error-message"]'
} as const
```

## Testing Principles

### 1. Test Behavior, Not Implementation

```typescript
// ❌ Bad: Testing internal state
expect(wrapper.vm.internalValue).toBe('expected')

// ✅ Good: Testing user-visible behavior
expect(wrapper.find('[data-test="display-value"]').text()).toBe('Expected Value')
```

### 2. Use Data-Test Attributes

```typescript
// ❌ Bad: Fragile selectors
wrapper.find('.btn-primary')
wrapper.find('div > ul > li:first-child')

// ✅ Good: Stable test attributes
wrapper.find('[data-test="submit-button"]')
wrapper.find('[data-test="first-option"]')
```

### 3. Descriptive Test Names

```typescript
// ❌ Bad: Generic descriptions
it('works correctly', () => {})
it('handles events', () => {})

// ✅ Good: Specific behavior descriptions
it('should emit update:modelValue when option is selected', () => {})
it('should disable submit button when form validation fails', () => {})
```

### 4. Single Responsibility Per Test

```typescript
// ❌ Bad: Multiple concerns
it('should handle form submission and validation and error states', () => {
  // Too many responsibilities
})

// ✅ Good: Single responsibility
it('should validate required fields before submission', () => {})
it('should show error message when submission fails', () => {})
it('should reset form after successful submission', () => {})
```

## Test Coverage Requirements

### Minimum Coverage Targets

- **Unit Tests**: 90% line coverage
- **Component Tests**: 85% line coverage
- **Integration Tests**: 70% line coverage

### Required Test Areas

For every component, ensure coverage of:

1. **Initial Rendering** - Component displays correctly with different props
2. **User Interactions** - Clicks, keyboard navigation, form submissions
3. **State Changes** - Reactive updates and prop changes
4. **Event Emissions** - Correct events with proper payloads
5. **Error Handling** - Error states and fallback behaviors
6. **Loading States** - Async operations and loading indicators
7. **Accessibility** - ARIA attributes and keyboard support
8. **Edge Cases** - Empty data, invalid inputs, boundary conditions
9. **Component Communication** - Parent-child component interaction
10. **Conditional Rendering** - Dynamic content based on state/props

## Testing Tools and Utilities

### Component Test Helpers

```typescript
// Reusable component mounting function
const mountComponent = (props = {}, options = {}) => {
  return mount(Component, {
    props: { ...defaultProps, ...props },
    global: {
      components: { RequiredChildComponent },
      plugins: [createTestingPinia({ createSpy: vi.fn })],
      ...options.global
    }
  })
}

// Async operation helpers
const waitForAsyncOperation = async () => {
  await nextTick()
  await flushPromises()
}

// Toast message verification
const expectToastMessage = (type: 'success' | 'error', message: string) => {
  if (type === 'success') {
    expect(mockToastStore.addSuccessToast).toHaveBeenCalledWith(message)
  } else {
    expect(mockToastStore.addErrorToast).toHaveBeenCalledWith(message)
  }
}
```

### Mock Management

```typescript
// Hoisted mock variables for consistency
const { mockReadContract, mockWriteContract, mockToastStore } = vi.hoisted(() => ({
  mockReadContract: vi.fn(),
  mockWriteContract: vi.fn(),
  mockToastStore: {
    addErrorToast: vi.fn(),
    addSuccessToast: vi.fn()
  }
}))

// Proper mock setup and cleanup
beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  if (wrapper) wrapper.unmount()
})
```

## Performance Considerations

### Test Performance Best Practices

- Use `shallowMount` for isolated component testing
- Mock heavy dependencies and external services
- Reuse component instances when testing multiple scenarios
- Clean up properly to prevent memory leaks
- Use `vi.clearAllMocks()` instead of recreating mocks

### Parallel Test Execution

- Design tests to be independent and stateless
- Avoid shared global state between tests
- Use unique test data for each test case
- Properly clean up after each test

## Quality Assurance

### Pre-commit Hooks

Tests are automatically run before commits to ensure:

- All tests pass
- Code coverage thresholds are met
- No lint errors in test files
- TypeScript compilation succeeds

### CI/CD Integration

- Tests run on all pull requests
- Coverage reports are generated and tracked
- E2E tests run on staging deployments
- Test results are reported in PR comments

## Documentation Standards

### Test Documentation

- Include JSDoc comments for complex test setups
- Document the purpose of unusual mock configurations
- Explain business logic being tested
- Provide examples for reusable test utilities

### README Updates

- Update component README files with testing examples
- Document testing patterns for new features
- Include troubleshooting guides for common test issues
- Maintain examples of proper test structure
