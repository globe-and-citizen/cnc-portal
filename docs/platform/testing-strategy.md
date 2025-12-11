# CNC Portal - Testing Strategy

**Version:** 1.0.0  
**Last Updated:** December 7, 2025

---

## Testing Philosophy

The CNC Portal follows a comprehensive testing strategy prioritizing behavior-driven testing over implementation details. All features should have proper test coverage before deployment.

## Testing Framework Stack

**Unit & Component Testing:**

- Vitest for JavaScript/TypeScript testing
- Vue Test Utils for component testing
- Vitest mocking system

**E2E Testing:**

- Playwright for end-to-end testing
- Cross-browser compatibility testing

**Smart Contract Testing:**

- Hardhat testing framework
- TypeScript for test files
- Waffle for Ethereum testing utilities

## Coverage Requirements

### Minimum Coverage Targets

| Type | Target |
|------|--------|
| Unit Tests | 90% line coverage |
| Component Tests | 85% line coverage |
| Integration Tests | 70% line coverage |
| E2E Tests | Critical user flows only |

### Required Test Areas

For every feature, ensure coverage of:

1. **Initial Rendering** - Component displays correctly with different props
2. **User Interactions** - Clicks, keyboard navigation, form submissions
3. **State Changes** - Reactive updates and prop changes
4. **Event Emissions** - Correct events with proper payloads
5. **Error Handling** - Error states and fallback behaviors
6. **Loading States** - Async operations and loading indicators
7. **Accessibility** - ARIA attributes and keyboard support
8. **Edge Cases** - Empty data, invalid inputs, boundary conditions

## Test Organization

### Directory Structure

```
src/
├── components/
│   ├── ComponentName.vue
│   └── __tests__/
│       ├── ComponentName.spec.ts
│       └── ComponentName.advanced.spec.ts
├── composables/
│   ├── useComposable.ts
│   └── __tests__/
│       └── useComposable.spec.ts
└── utils/
    ├── helpers.ts
    └── __tests__/
        └── helpers.spec.ts
```

### Test Naming Conventions

**File Naming:**

- Basic tests: `ComponentName.spec.ts`
- Advanced tests: `ComponentName.advanced.spec.ts`
- Integration tests: `ComponentName.integration.spec.ts`
- E2E tests: `component-name.e2e.spec.ts`

**Test Structure:**

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

  describe('Error Handling', () => {
    // Error scenarios and fallbacks
  })
})
```

## Testing Principles

### 1. Test Behavior, Not Implementation

```typescript
// ✅ Good: Testing user-visible behavior
expect(wrapper.find('[data-test="display-value"]').text()).toBe('Expected Value')

// ❌ Bad: Testing internal state
expect(wrapper.vm.internalValue).toBe('expected')
```

### 2. Use Data-Test Attributes

```typescript
// ✅ Good: Stable test attributes
wrapper.find('[data-test="submit-button"]')

// ❌ Bad: Fragile selectors
wrapper.find('.btn-primary')
```

### 3. Descriptive Test Names

```typescript
// ✅ Good: Specific behavior descriptions
it('should emit update:modelValue when option is selected', () => {})

// ❌ Bad: Generic descriptions
it('works correctly', () => {})
```

### 4. Single Responsibility Per Test

Each test should verify one specific behavior or outcome.

## Unit Testing

### Backend Controller Tests

- Test each controller function independently
- Mock Prisma client
- Test with various input parameters
- Test error scenarios
- Achieve > 90% coverage

### Frontend Composable Tests

- Test composable functions
- Mock fetch API
- Test error handling
- Test authentication integration
- Achieve > 85% coverage

### Utility Function Tests

- Test pure functions
- Test edge cases
- Test error handling
- Test boundary conditions

## Integration Testing

### API Integration

- Test complete request/response cycle
- Test with real database (test database)
- Test authentication flow
- Test pagination and filtering

### Database Integration

- Test Prisma queries with real database
- Test aggregations
- Test complex joins
- Test transaction rollback

## E2E Testing

### Critical User Flows

- User authentication flow
- Main feature workflows
- Error handling and retry mechanisms
- Cross-browser compatibility

### Browser Testing

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Mobile viewports

## Smart Contract Testing

### Contract Unit Tests

- Test each contract function
- Test access control
- Test edge cases
- Test revert conditions
- Achieve > 90% coverage

### Integration Tests

- Test contract interactions
- Test upgrade mechanisms
- Test multi-contract workflows
- Test gas optimization

## Test Data Management

### Mock Data Organization

```typescript
// Constants for reusable test data
const MOCK_DATA = {
  validAddress: '0x1234567890123456789012345678901234567890',
  invalidAddress: 'invalid-address',
  users: [
    { id: 1, name: 'John Doe', address: '0x123...' }
  ]
} as const
```

### Test Selectors

```typescript
// Centralized selectors
const SELECTORS = {
  trigger: '[data-test="component-trigger"]',
  submitBtn: '[data-test="submit-btn"]'
} as const
```

## Performance Testing

### Load Testing

- Test with target concurrent users
- Measure response times (p50, p95, p99)
- Monitor resource usage
- Identify bottlenecks

### Stress Testing

- Test beyond normal load
- Identify breaking points
- Verify graceful degradation
- Test recovery mechanisms

## Pre-commit & CI/CD

### Pre-commit Hooks

- Run linting
- Run unit tests
- Check code coverage
- TypeScript compilation

### CI/CD Pipeline

- Run all tests on pull requests
- Generate coverage reports
- Block merge if tests fail
- Run E2E tests on staging

## Documentation

### Test Documentation

- Include JSDoc comments for complex setups
- Document unusual mock configurations
- Explain business logic being tested
- Provide examples for reusable utilities

---

For detailed testing patterns and examples, see `.github/copilot-instructions/testing-*.md` files.

For feature-specific testing requirements, see individual feature specifications.
