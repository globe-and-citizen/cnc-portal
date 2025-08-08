# Unit Testing Guidelines for CNC Portal

## Overview

This document outlines the standardized unit testing practices for the CNC Portal application to ensure consistent, maintainable, and comprehensive test coverage.

## Testing Framework

- **Testing Framework**: Vitest 3.x
- **Vue Testing**: Vue Test Utils 2.x
- **Mocking**: Vitest built-in mocking capabilities
- **Coverage**: Istanbul provider
- **State Management**: Pinia with @pinia/testing

## Project Structure

```
src/
├── components/
├── composables/
│   ├── __tests__/
│   │   ├── composableName.spec.ts
│   └── __mocks__/
├── stores/
│   ├── __tests__/
│   │   ├── storeName.spec.ts
│   └── __mocks__/
├── utils/
│   ├── __tests__/
│   │   ├── utilName.spec.ts
│   └── __mocks__/
└── tests/
    ├── mocks/
    └── setup/
```

## Naming Conventions

- **Test Files**: `[name].spec.ts` or `[name].test.ts`
- **Mock Files**: `[name].mock.ts` in `__mocks__` directory
- **Test Suites**: Use descriptive names that match the module being tested
- **Test Cases**: Use "should" statements that describe the expected behavior

## Test File Structure

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia' // For store tests
import { shallowMount } from '@vue/test-utils' // For component tests

// Mock dependencies
vi.mock('@/path/to/dependency')

describe('ModuleName', () => {
  beforeEach(() => {
    // Setup code
    setActivePinia(createPinia()) // For stores
    vi.clearAllMocks()
  })

  afterEach(() => {
    // Cleanup code
  })

  describe('feature group', () => {
    it('should describe expected behavior', () => {
      // Arrange
      // Act
      // Assert
    })
  })
})
```

## Testing Patterns

### 1. Store Testing

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useMyStore } from '../myStore'

// Mock external dependencies
vi.mock('@wagmi/vue', () => ({
  useAccount: vi.fn(() => ({ chainId: ref(11155111) }))
}))

describe('useMyStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('should initialize with default values', () => {
    const store = useMyStore()
    expect(store.someState).toBe(defaultValue)
  })

  it('should update state correctly', () => {
    const store = useMyStore()
    store.someAction(newValue)
    expect(store.someState).toBe(newValue)
  })
})
```

### 2. Composable Testing

```typescript
import { describe, it, expect, vi } from 'vitest'
import { useMyComposable } from '../useMyComposable'

// Mock dependencies
vi.mock('@/stores/myStore', () => ({
  useMyStore: vi.fn(() => ({
    someMethod: vi.fn()
  }))
}))

describe('useMyComposable', () => {
  it('should return expected interface', () => {
    const composable = useMyComposable()
    
    expect(composable).toHaveProperty('method1')
    expect(composable).toHaveProperty('method2')
    expect(typeof composable.method1).toBe('function')
  })

  it('should handle async operations', async () => {
    const { asyncMethod } = useMyComposable()
    const result = await asyncMethod()
    
    expect(result).toBeDefined()
  })
})
```

### 3. Utility Function Testing

```typescript
import { describe, it, expect } from 'vitest'
import { utilityFunction } from '../myUtil'

describe('utilityFunction', () => {
  it('should handle normal cases', () => {
    const result = utilityFunction(validInput)
    expect(result).toBe(expectedOutput)
  })

  it('should handle edge cases', () => {
    expect(utilityFunction(null)).toBe(defaultValue)
    expect(utilityFunction(undefined)).toBe(defaultValue)
    expect(utilityFunction('')).toBe(defaultValue)
  })

  it('should throw appropriate errors', () => {
    expect(() => utilityFunction(invalidInput)).toThrow('Expected error message')
  })
})
```

### 4. Component Testing

```typescript
import { describe, it, expect, vi } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import MyComponent from '../MyComponent.vue'

describe('MyComponent', () => {
  it('should render correctly', () => {
    const wrapper = shallowMount(MyComponent, {
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })]
      },
      props: {
        requiredProp: 'value'
      }
    })

    expect(wrapper.find('[data-testid="my-element"]').exists()).toBe(true)
  })

  it('should emit events correctly', async () => {
    const wrapper = shallowMount(MyComponent)
    
    await wrapper.find('button').trigger('click')
    
    expect(wrapper.emitted('my-event')).toBeTruthy()
  })
})
```

## Mocking Guidelines

### 1. External Dependencies

```typescript
// Mock entire modules
vi.mock('@wagmi/vue', () => ({
  useAccount: vi.fn(),
  useReadContract: vi.fn()
}))

// Mock specific exports
vi.mock('@/utils/myUtil', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    specificFunction: vi.fn()
  }
})
```

### 2. Vue Router

```typescript
vi.mock('vue-router', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn()
  }))
}))
```

### 3. Environment Variables

```typescript
vi.stubGlobal('import.meta', {
  env: { MODE: 'test' }
})
```

## Coverage Goals

- **Target Coverage**: 80% overall
- **Critical Modules**: 90%+ coverage for:
  - Store actions and getters
  - Utility functions
  - Core composables
  - Business logic components

## Testing Checklist

### For Each Test Suite
- [ ] All public methods/functions tested
- [ ] Edge cases covered (null, undefined, empty values)
- [ ] Error conditions tested
- [ ] Async operations properly awaited
- [ ] Mocks properly cleaned up
- [ ] State changes verified
- [ ] Side effects validated

### For Stores
- [ ] Initial state tested
- [ ] All actions tested
- [ ] All getters tested
- [ ] State mutations verified
- [ ] External dependencies mocked

### For Composables
- [ ] Return interface validated
- [ ] Reactive state tested
- [ ] Dependencies properly mocked
- [ ] Lifecycle behavior tested

### For Utils
- [ ] Pure function behavior tested
- [ ] Input validation tested
- [ ] Error handling tested
- [ ] Edge cases covered

## Best Practices

### 1. Test Organization
- Group related tests with `describe` blocks
- Use descriptive test names that explain the expected behavior
- Follow Arrange-Act-Assert pattern

### 2. Mocking Strategy
- Mock external dependencies at the module level
- Use shared mocks for common patterns
- Clear mocks between tests to avoid interference

### 3. Assertions
- Use specific assertions (`toBe`, `toEqual`, `toMatchObject`)
- Test both positive and negative cases
- Verify state changes and side effects

### 4. Performance
- Use `shallowMount` instead of `mount` when possible
- Mock heavy dependencies
- Use `vi.useFakeTimers()` for time-dependent tests

### 5. Maintainability
- Keep tests focused and simple
- Avoid testing implementation details
- Update tests when refactoring code

## Common Patterns

### Testing Reactive State
```typescript
it('should update reactive state', async () => {
  const { state } = useComposable()
  
  state.value = newValue
  await nextTick()
  
  expect(state.value).toBe(newValue)
})
```

### Testing Async Operations
```typescript
it('should handle async operations', async () => {
  const mockResponse = { data: 'test' }
  global.fetch = vi.fn(() => Promise.resolve({
    json: () => Promise.resolve(mockResponse)
  }))

  const result = await asyncFunction()
  
  expect(result).toEqual(mockResponse)
})
```

### Testing Error Handling
```typescript
it('should handle errors gracefully', async () => {
  global.fetch = vi.fn(() => Promise.reject(new Error('Network error')))

  const { error } = await functionThatFetches()
  
  expect(error.value).toMatchObject({ message: 'Network error' })
})
```

## Running Tests

```bash
# Run all tests
npm run test:unit

# Run with coverage
npm run test:unit:coverage

# Run in watch mode
npm run test:watch

# Run specific test file
npx vitest run path/to/test.spec.ts
```

## Coverage Reports

Coverage reports are generated in the `coverage/` directory and can be viewed by running:

```bash
npm run coverage
```

## Continuous Integration

Tests should:
- Run on every PR
- Block merging if coverage drops below threshold
- Report coverage statistics
- Fail on any test failures

## Migration Guide

When adding tests to existing modules:

1. Start with the most critical functionality
2. Add tests for edge cases and error conditions
3. Mock external dependencies consistently
4. Follow the established patterns in existing tests
5. Update shared mocks as needed
6. Ensure all new code includes corresponding tests

---

This guide should be updated as testing practices evolve and new patterns emerge.