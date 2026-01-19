# Unit Testing Guide

Comprehensive guide for writing unit tests in the CNC Portal project using Vitest, Vue Test Utils, and TanStack Vue Query.

## Overview

This project uses:

- **Vitest** - Fast unit test framework
- **Vue Test Utils** - Vue component testing utilities
- **TanStack Vue Query** - Server state management
- **Pinia** - State management with `@pinia/testing`
- **Axios** - HTTP client (mocked in tests)

## Test Structure

### Test File Location

Test files are placed in a `__tests__` directory next to the source file:

```
src/
├── components/
│   ├── ButtonUI.vue
│   └── __tests__/
│       └── ButtonUI.spec.ts
```

### Test File Naming

- Unit tests: `FileName.spec.ts`
- Integration tests: `FileName.integration.spec.ts`
- Advanced/Edge cases: `FileName.advanced.spec.ts`

## Basic Test Structure

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { createTestingPinia } from "@pinia/testing";
import MyComponent from "@/components/MyComponent.vue";

describe("MyComponent", () => {
  let wrapper;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (wrapper) wrapper.unmount();
  });

  describe("Component Rendering", () => {
    it("should render component correctly", () => {
      wrapper = mount(MyComponent, {
        global: {
          plugins: [createTestingPinia({ createSpy: vi.fn })],
        },
      });

      expect(wrapper.exists()).toBe(true);
    });
  });
});
```

## Component Testing

### Mounting Components

```typescript
import { mount, shallowMount } from "@vue/test-utils";

// Full mount - renders all child components
const wrapper = mount(MyComponent, {
  props: { message: "Hello" },
  global: {
    plugins: [createTestingPinia({ createSpy: vi.fn })],
    stubs: { ChildComponent: true },
  },
});

// Shallow mount - only renders the component, not children
const wrapper = shallowMount(MyComponent);
```

### Accessing Component Elements

```typescript
// Use data-test attributes for stable selection
const button = wrapper.find('[data-test="submit-button"]');
const items = wrapper.findAll('[data-test="item"]');

// Check if element exists
expect(button.exists()).toBe(true);

// Get text content
expect(button.text()).toBe("Submit");

// Get attributes
expect(button.attributes("disabled")).toBeDefined();

// Get classes
expect(button.classes()).toContain("btn-primary");
```

### Testing Props and Emits

```typescript
describe("Props", () => {
  it("should accept and display props", () => {
    const wrapper = mount(MyComponent, {
      props: {
        title: "Test Title",
        count: 5,
      },
    });

    expect(wrapper.text()).toContain("Test Title");
  });

  it("should emit events with correct payload", async () => {
    const wrapper = mount(MyComponent);

    await wrapper.find('[data-test="button"]').trigger("click");

    expect(wrapper.emitted("submit")).toBeTruthy();
    expect(wrapper.emitted("submit")[0]).toEqual([expectedData]);
  });
});
```

### Testing User Interactions

```typescript
describe("User Interactions", () => {
  it("should handle click events", async () => {
    const wrapper = mount(MyComponent);

    await wrapper.find('[data-test="button"]').trigger("click");

    expect(wrapper.vm.clicked).toBe(true);
  });

  it("should handle keyboard events", async () => {
    const wrapper = mount(MyComponent);

    await wrapper.find('[data-test="input"]').trigger("keydown.enter");

    // Assert expected behavior
  });

  it("should handle form submission", async () => {
    const wrapper = mount(MyComponent);

    await wrapper.find('[data-test="form"]').trigger("submit");

    expect(wrapper.emitted("submit")).toBeTruthy();
  });
});
```

## Testing with TanStack Vue Query

All query hooks are automatically mocked globally. Use `createMockQueryResponse` to override:

```typescript
import { useTeamsQuery } from "@/queries/team.queries";
import { createMockQueryResponse } from "@/tests/mocks/query.mock";
import { VueQueryPlugin, QueryClient } from "@tanstack/vue-query";
import { vi } from "vitest";

describe("Teams Component", () => {
  it("should display teams from query", () => {
    const queryClient = new QueryClient();
    const customTeams = [
      { id: "1", name: "Team A" },
      { id: "2", name: "Team B" },
    ];

    vi.mocked(useTeamsQuery).mockReturnValue(
      createMockQueryResponse(customTeams)
    );

    const wrapper = mount(TeamsComponent, {
      global: {
        plugins: [
          createTestingPinia({ createSpy: vi.fn }),
          [VueQueryPlugin, { queryClient }],
        ],
      },
    });

    expect(wrapper.text()).toContain("Team A");
    expect(wrapper.text()).toContain("Team B");
  });

  it("should handle loading state", () => {
    const queryClient = new QueryClient();

    vi.mocked(useTeamsQuery).mockReturnValue(
      createMockQueryResponse([], true) // isLoading = true
    );

    const wrapper = mount(TeamsComponent, {
      global: {
        plugins: [
          createTestingPinia({ createSpy: vi.fn }),
          [VueQueryPlugin, { queryClient }],
        ],
      },
    });

    expect(wrapper.find('[data-test="loader"]').exists()).toBe(true);
  });

  it("should handle error state", () => {
    const queryClient = new QueryClient();
    const error = new Error("Failed to fetch teams");

    vi.mocked(useTeamsQuery).mockReturnValue(
      createMockQueryResponse([], false, error)
    );

    const wrapper = mount(TeamsComponent, {
      global: {
        plugins: [
          createTestingPinia({ createSpy: vi.fn }),
          [VueQueryPlugin, { queryClient }],
        ],
      },
    });

    expect(wrapper.find('[data-test="error-message"]').exists()).toBe(true);
  });
});
```

## Testing with Pinia

```typescript
import { useTeamStore } from "@/stores/teamStore";
import { createTestingPinia } from "@pinia/testing";

describe("Component with Pinia Store", () => {
  it("should access store state", () => {
    const wrapper = mount(MyComponent, {
      global: {
        plugins: [
          createTestingPinia({
            createSpy: vi.fn,
            initialState: {
              team: {
                currentTeamId: "1",
                teams: [{ id: "1", name: "Team A" }],
              },
            },
          }),
        ],
      },
    });

    const store = useTeamStore();
    expect(store.currentTeamId).toBe("1");
  });

  it("should call store actions", async () => {
    const wrapper = mount(MyComponent, {
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })],
      },
    });

    const store = useTeamStore();
    await wrapper.find('[data-test="load-button"]').trigger("click");

    expect(store.loadTeams).toHaveBeenCalled();
  });
});
```

## Testing Async Operations

```typescript
import { nextTick, flushPromises } from "vue";

describe("Async Operations", () => {
  it("should handle async data loading", async () => {
    const wrapper = mount(MyComponent);

    // Wait for component to render
    await nextTick();

    // Wait for all pending promises
    await flushPromises();

    // Assert after async operations complete
    expect(wrapper.text()).toContain("Loaded Data");
  });

  it("should handle promise resolution", async () => {
    const mockApi = vi.fn().mockResolvedValue({ data: "test" });

    const wrapper = mount(MyComponent, {
      props: { apiCall: mockApi },
    });

    await flushPromises();

    expect(mockApi).toHaveBeenCalled();
    expect(wrapper.vm.result).toEqual({ data: "test" });
  });
});
```

## Testing Computed Properties and Watchers

```typescript
describe("Reactivity", () => {
  it("should update computed property", async () => {
    const wrapper = mount(MyComponent, {
      props: { count: 5 },
    });

    expect(wrapper.vm.doubledCount).toBe(10);

    await wrapper.setProps({ count: 10 });

    expect(wrapper.vm.doubledCount).toBe(20);
  });

  it("should trigger watchers", async () => {
    const wrapper = mount(MyComponent);

    await wrapper.setData({ value: "new" });
    await nextTick();

    expect(wrapper.vm.watching).toBe(true);
  });
});
```

## Common Testing Patterns

### Testing Conditional Rendering

```typescript
it("should show element when condition is true", async () => {
  const wrapper = mount(MyComponent, {
    data: () => ({ isVisible: false }),
  });

  expect(wrapper.find('[data-test="secret"]').exists()).toBe(false);

  await wrapper.setData({ isVisible: true });

  expect(wrapper.find('[data-test="secret"]').exists()).toBe(true);
});
```

### Testing List Rendering

```typescript
it("should render list items", () => {
  const items = [
    { id: 1, name: "Item 1" },
    { id: 2, name: "Item 2" },
    { id: 3, name: "Item 3" },
  ];

  const wrapper = mount(ListComponent, {
    props: { items },
  });

  const listItems = wrapper.findAll('[data-test="item"]');
  expect(listItems).toHaveLength(3);
  expect(listItems[0].text()).toContain("Item 1");
});
```

### Testing Form Validation

```typescript
it("should validate required fields", async () => {
  const wrapper = mount(FormComponent);

  await wrapper.find('[data-test="submit"]').trigger("click");

  expect(wrapper.find('[data-test="email-error"]').exists()).toBe(true);
  expect(wrapper.find('[data-test="email-error"]').text()).toContain(
    "required"
  );
});
```

## Coverage Requirements

Target coverage thresholds:

- **Statements**: 80%+
- **Branches**: 75%+
- **Functions**: 80%+
- **Lines**: 80%+

Run coverage report:

```bash
npm run test:coverage
```

## Best Practices

1. **Arrange-Act-Assert Pattern**

   ```typescript
   it("should do something", () => {
     // Arrange
     const wrapper = mount(Component);

     // Act
     await wrapper.find('[data-test="button"]').trigger("click");

     // Assert
     expect(wrapper.emitted("event")).toBeTruthy();
   });
   ```

2. **Use Descriptive Test Names**

   - ✅ `should display error message when validation fails`
   - ❌ `should work`

3. **Keep Tests Focused**

   - Test one thing per test
   - Use descriptive assertions
   - Avoid testing implementation details

4. **Mock External Dependencies**

   - Use centralized mocks from `src/tests/mocks/`
   - Don't make real API calls
   - Don't test third-party libraries

5. **Clean Up Properly**
   - Use `beforeEach` and `afterEach`
   - Clear all mocks between tests
   - Unmount components after tests

## Debugging Tests

```bash
# Run tests in debug mode with inspector
node --inspect-brk ./node_modules/vitest/vitest.mjs run

# Run single test file
npm run test:unit src/components/__tests__/MyComponent.spec.ts

# Run tests matching pattern
npm run test:unit -- --grep "should display"

# Watch mode for development
npm run test:watch
```

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Vue Test Utils API](https://test-utils.vuejs.org/)
- [Testing Library Best Practices](https://testing-library.com/)
- [CNC Portal Testing Patterns](./testing-patterns.md)
- [Global Mocks Setup Guide](./global-mocks-setup.md)
