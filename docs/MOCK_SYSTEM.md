# Using Centralized Global Mocks

## Overview

The CNC Portal now has a centralized mock system that makes testing consistent and easy to maintain. All query and composable mocks are defined once and applied globally across all tests.

## What Changed

### Before

Each test file would define its own mocks locally:

```typescript
// In each test file
vi.mock("@/queries/team.queries", () => ({
  useTeamsQuery: vi.fn(() => ({
    data: ref([]),
    isLoading: ref(false),
    error: ref(null),
    refetch: vi.fn(),
  })),
  // ... repeat for every query
}));
```

### After

All mocks are centralized and imported once in the setup:

```typescript
// In src/tests/setup/composables.setup.ts
import { queryMocks } from "@/tests/mocks/query.mock";

vi.mock("@/queries/team.queries", () => ({
  useTeamsQuery: vi.fn(queryMocks.useTeamsQuery),
  // ... clean and DRY
}));
```

## Key Benefits

✅ **Single Source of Truth** - Mock data and factories defined in one place  
✅ **Consistency** - All tests use the same mock structure  
✅ **Maintainability** - Changes to mock structure only need to be made once  
✅ **AxiosResponse Support** - Full response objects with status, headers, etc.  
✅ **Type Safety** - Properly typed with TypeScript  
✅ **Easy Overrides** - Individual tests can still override when needed

## Mock Structure

### Factory Functions

**`createMockAxiosResponse<T>(data, status, statusText)`**

- Creates a mock AxiosResponse with proper structure
- Returns: `{ data, status, statusText, headers, config }`
- Used internally by all query response factories

**`createMockQueryResponse<T>(data, isLoading, error)`**

- Creates a TanStack Query response for read operations
- Returns: `{ data: ref(AxiosResponse<T>), isLoading, error, refetch, ... }`

**`createMockMutationResponse()`**

- Creates a TanStack Query response for write operations
- Returns: `{ mutateAsync, isPending, error, data, ... }`

### Mock Data Objects

Pre-configured data that matches real API responses:

- `mockTeamData` - Sample team with members and contracts
- `mockTeamsData` - Array of teams
- `mockWageData` - Wage information with rates
- `mockNotificationData` - Notification messages
- And response wrappers: `mockTeamResponse`, `mockTeamsResponse`, etc.

### The `queryMocks` Object

Contains every query/mutation hook function:

```typescript
export const queryMocks = {
  useTeamsQuery: () => createMockQueryResponse(mockTeamsData),
  useTeamQuery: () => createMockQueryResponse(mockTeamData),
  useCreateTeam: () => createMockMutationResponse(),
  // ... all other queries
};
```

## Using in Tests

### 1. Basic Usage (Most Tests)

No setup needed! Mocks are automatically applied globally:

```typescript
import { mount } from "@vue/test-utils";
import MyComponent from "@/components/MyComponent.vue";
import { createTestingPinia } from "@pinia/testing";

describe("MyComponent", () => {
  it("should render teams", () => {
    const wrapper = mount(MyComponent, {
      global: {
        plugins: [createTestingPinia()],
      },
    });

    // useTeamsQuery() query is already mocked with mockTeamsData
    expect(wrapper.find('[data-test="teams"]').exists()).toBe(true);
  });
});
```

### 2. Custom Mock Data in Specific Tests

Override the mock for a single test:

```typescript
import { useTeamsQuery } from '@/queries/team.queries'
import { vi } from 'vitest'
import { createMockAxiosResponse } from '@/tests/mocks/query.mock'

describe('CustomTeamsTest', () => {
  it('should handle custom team data', () => {
    const customTeam = { id: '999', name: 'Custom Team', ... }

    vi.mocked(useTeamsQuery).mockReturnValueOnce({
      data: ref(createMockAxiosResponse([customTeam])),
      isLoading: ref(false),
      error: ref(null),
      refetch: vi.fn(),
      isFetched: ref(true),
      isPending: ref(false),
      isSuccess: ref(true)
    })

    // Test with custom data
  })
})
```

### 3. Accessing Response Data in Tests

Components now access the AxiosResponse structure:

```typescript
// The mock returns AxiosResponse, so:
// response.data.value = AxiosResponse
// response.data.value.data = Team[] (the actual data)
// response.data.value.status = 200
// response.data.value.headers = {}

// In the team store, this is handled:
const currentTeam = computed(() => {
  return currentTeamMeta.data.value?.data; // Extracts Team from AxiosResponse
});

// In components:
{
  {
    teamStore.currentTeam?.name;
  }
} // Works correctly
```

## Adding New Query Mocks

When you create a new query file, add its mock:

### 1. Add Mock Data (query.mock.ts)

```typescript
export const mockMyData: MyType = {
  /* data */
};
export const mockMyResponse = createMockAxiosResponse(mockMyData);
```

### 2. Add to queryMocks (query.mock.ts)

```typescript
export const queryMocks = {
  // ... existing
  useMyQuery: () => createMockQueryResponse(mockMyData),
  useMyMutation: () => createMockMutationResponse(),
};
```

### 3. Add Mock Setup (composables.setup.ts)

```typescript
vi.mock("@/queries/my.queries", () => ({
  useMyQuery: vi.fn(queryMocks.useMyQuery),
  useMyMutation: vi.fn(queryMocks.useMyMutation),
}));
```

Done! The mock is now globally available to all tests.

## Common Patterns

### Testing Query Loading State

```typescript
it("should show loading state", async () => {
  vi.mocked(useTeamsQuery).mockReturnValueOnce({
    data: ref(null),
    isLoading: ref(true),
    error: ref(null),
    // ...
  });

  const wrapper = mount(MyComponent);
  expect(wrapper.find('[data-test="loading"]').exists()).toBe(true);
});
```

### Testing Query Error State

```typescript
it("should handle errors", async () => {
  const mockError = new Error("Network failed");

  vi.mocked(useTeamsQuery).mockReturnValueOnce({
    data: ref(null),
    isLoading: ref(false),
    error: ref(mockError),
    // ...
  });

  const wrapper = mount(MyComponent);
  expect(wrapper.find('[data-test="error"]').exists()).toBe(true);
});
```

### Testing Mutation Success

```typescript
it('should create team successfully', async () => {
  const mockNewTeam = { id: '10', name: 'New Team', ... }

  vi.mocked(useCreateTeam).mockReturnValueOnce({
    mutateAsync: vi.fn(() =>
      Promise.resolve(createMockAxiosResponse(mockNewTeam))
    ),
    isPending: ref(false),
    error: ref(null),
    // ...
  })

  // Test mutation call
})
```

## Testing with Different Response Statuses

Since we're returning full AxiosResponse objects, you can test different status codes:

```typescript
it("should handle 401 unauthorized", () => {
  const unauthorizedResponse = createMockAxiosResponse(
    { error: "Unauthorized" },
    401,
    "Unauthorized"
  );

  vi.mocked(useTeamsQuery).mockReturnValueOnce({
    data: ref(unauthorizedResponse),
    isLoading: ref(false),
    error: ref(new Error("401")),
    // ...
  });

  // Test unauthorized handling
});
```

## Files Location

- **Mock Definitions**: `/app/src/tests/mocks/query.mock.ts`
- **Mock Setup**: `/app/src/tests/setup/composables.setup.ts`
- **Mock Index**: `/app/src/tests/mocks/index.ts`
- **Store Mocks**: `/app/src/tests/mocks/store.mock.ts`
- **Documentation**: `/app/src/tests/mocks/README.md`

## Troubleshooting

**Q: Tests are getting old mock data**  
A: Clear mocks between tests: `vi.clearAllMocks()` in `beforeEach()`

**Q: Mock not being applied**  
A: Ensure the mock is defined in `queryMocks` and applied in `composables.setup.ts`

**Q: TypeScript errors with mock structure**  
A: Use `any` type when needed: `vi.mocked(useTeamsQuery as any).mockReturnValue(...)`

**Q: Need to test with real API response**  
A: Create a proper response object: `createMockAxiosResponse(realData, 200)`

## Summary

The new mock system makes testing easier and more maintainable by:

1. ✅ Centralizing all mock definitions
2. ✅ Providing factory functions for common patterns
3. ✅ Supporting full AxiosResponse structure
4. ✅ Allowing easy overrides when needed
5. ✅ Reducing code duplication across tests
6. ✅ Maintaining type safety with TypeScript

Start using these mocks in your tests and enjoy a more consistent testing experience!
