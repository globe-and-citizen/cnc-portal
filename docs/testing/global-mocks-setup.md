# Global Mocks Setup Guide

Comprehensive guide for understanding and using the centralized mock system for TanStack Vue Query and Axios.

## Overview

The CNC Portal uses a centralized mocking system that provides consistent, reusable mocks for all query and mutation hooks. This ensures:

- **Consistency** - All tests use the same mock data structure
- **Maintainability** - Mock data is defined in one place
- **Flexibility** - Easy to override mocks for specific tests
- **Type Safety** - Fully typed with TypeScript

## Architecture

The mock system consists of three main components:

### 1. Mock Data Objects (`query.mock.ts`)

Pre-defined data objects representing various entities:

```typescript
// Team data
export const mockTeamData: Team = {
  id: '1',
  name: 'Test Team',
  description: 'Test Team Description',
  members: [...],
  teamContracts: [...],
  ownerAddress: '0x1234...',
  officerAddress: '0x0987...'
}

// Arrays for list operations
export const mockTeamsData: Team[] = [mockTeamData]

// Other domains
export const mockWageData: Wage[] = [...]
export const mockNotificationData: Notification[] = [...]
export const mockHealthCheckData: HealthCheckResponse = {...}
```

### 2. Factory Functions

Helper functions that create consistent response structures:

```typescript
/**
 * Create query response with optional loading/error states
 * @param data - The actual data to return
 * @param isLoading - Whether query is loading (default: false)
 * @param error - Error object if query failed (default: null)
 */
export const createMockQueryResponse = <T>(
  data: T,
  isLoading: boolean = false,
  error: Error | null = null
): Record<string, unknown> => ({
  data: ref(data),
  isLoading: ref(isLoading),
  isPending: ref(isLoading),
  error: ref(error),
  isSuccess: ref(!error),
  isFetched: ref(true),
  refetch: vi.fn(),
});

/**
 * Create mutation response
 */
export const createMockMutationResponse = (): Record<string, unknown> => ({
  mutate: vi.fn(),
  mutateAsync: vi.fn((data: unknown) => Promise.resolve(data)),
  isPending: ref(false),
  isError: ref(false),
  error: ref(null),
  data: ref(null),
  reset: vi.fn(),
});
```

### 3. Query Mocks Object

Central registry of all available mocks:

```typescript
export const queryMocks = {
  // Team queries
  useTeamsQuery: () => createMockQueryResponse(mockTeamsData),
  useTeamQuery: () => createMockQueryResponse(mockTeamData),
  useCreateTeam: () => createMockMutationResponse(),
  useUpdateTeam: () => createMockMutationResponse(),
  useDeleteTeam: () => createMockMutationResponse(),

  // Member queries
  useAddMembersQuery: () => createMockMutationResponse(),
  useDeleteMemberQuery: () => createMockMutationResponse(),

  // ... and more
};
```

### 4. Global Setup (`composables.setup.ts`)

Automatically applies all mocks globally before tests run:

```typescript
vi.mock("@/queries/team.queries", () => ({
  useTeamsQuery: vi.fn(queryMocks.useTeamsQuery),
  useTeamQuery: vi.fn(queryMocks.useTeamQuery),
  // ...
}));

vi.mock("@/queries/member.queries", () => ({
  useAddMembersQuery: vi.fn(queryMocks.useAddMembersQuery),
  // ...
}));

// ... and more query modules
```

## Query Modules Reference

| Module                    | Hooks                                                                              | Purpose                      |
| ------------------------- | ---------------------------------------------------------------------------------- | ---------------------------- |
| `team.queries.ts`         | `useTeamsQuery`, `useTeamQuery`, `useCreateTeam`, `useUpdateTeam`, `useDeleteTeam` | Team CRUD operations         |
| `member.queries.ts`       | `useAddMembersQuery`, `useDeleteMemberQuery`                                       | Team member management       |
| `wage.queries.ts`         | `useTeamWages`, `useSetMemberWage`                                                 | Wage configuration           |
| `notification.queries.ts` | `useNotificationsQuery`, `useAddBulkNotificationsQuery`, `useUpdateNotification`   | Notification management      |
| `expense.queries.ts`      | `useExpensesQuery`                                                                 | Expense queries              |
| `user.queries.ts`         | `useUser`, `useUserNonce`                                                          | User data and authentication |
| `action.queries.ts`       | `useCreateAction`, `useUpdateActionQuery`                                          | Action mutations             |
| `auth.queries.ts`         | `useValidateTokenQuery`                                                            | Token validation             |
| `contract.queries.ts`     | `useCreateContractQuery`                                                           | Contract creation            |
| `health.queries.ts`       | `useBackendHealthQuery`                                                            | Backend health status        |

## Response Structure

### Query Response Structure

```typescript
{
  data: ref(T),                    // The actual query data
  isLoading: ref(boolean),         // Currently loading
  isPending: ref(boolean),         // Currently pending (same as loading)
  error: ref(Error | null),        // Error if query failed
  isSuccess: ref(boolean),         // Whether query succeeded
  isFetched: ref(boolean),         // Whether data has been fetched
  refetch: vi.fn()                 // Function to refetch data
}
```

**Example usage in component:**

```typescript
const { data: teams, isLoading, error } = useTeamsQuery();

// Access the data
const teamList = computed(() => teams.value);

// Check loading state
if (isLoading.value) {
  // Show loader
}

// Check for errors
if (error.value) {
  // Show error message
}
```

### Mutation Response Structure

```typescript
{
  mutate: vi.fn(),                 // Sync mutation trigger
  mutateAsync: vi.fn(),            // Async mutation trigger
  isPending: ref(boolean),         // Currently mutating
  isError: ref(boolean),           // Whether mutation errored
  error: ref(Error | null),        // Error if mutation failed
  data: ref(any),                  // Mutation result data
  reset: vi.fn()                   // Reset mutation state
}
```

**Example usage in component:**

```typescript
const { mutateAsync, isPending } = useCreateTeam();

const handleCreateTeam = async (teamData) => {
  try {
    const newTeam = await mutateAsync(teamData);
    // Handle success
  } catch (error) {
    // Handle error
  }
};
```

## Usage Examples

### Default Mock Usage

By default, all tests automatically use the global mocks:

```typescript
import { mount } from "@vue/test-utils";
import { createTestingPinia } from "@pinia/testing";
import { VueQueryPlugin, QueryClient } from "@tanstack/vue-query";
import TeamsComponent from "@/views/team/ListIndex.vue";

describe("TeamsComponent", () => {
  it("should display teams", () => {
    const queryClient = new QueryClient();

    const wrapper = mount(TeamsComponent, {
      global: {
        plugins: [
          createTestingPinia({ createSpy: vi.fn }),
          [VueQueryPlugin, { queryClient }],
        ],
      },
    });

    // mockTeamsData is automatically used by useTeamsQuery()
    expect(wrapper.text()).toContain("Test Team");
  });
});
```

### Overriding with Custom Data

For specific tests, override the default mock:

```typescript
import { useTeamsQuery } from "@/queries/team.queries";
import { createMockQueryResponse } from "@/tests/mocks/query.mock";
import { vi } from "vitest";

describe("TeamsComponent - Custom Data", () => {
  it("should handle empty teams list", () => {
    const customTeams: Team[] = [];

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

    expect(wrapper.find('[data-test="empty-state"]').exists()).toBe(true);
  });
});
```

### Testing Loading State

```typescript
it("should show loading spinner", () => {
  vi.mocked(useTeamsQuery).mockReturnValue(
    createMockQueryResponse([], true, null) // isLoading = true
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
```

### Testing Error State

```typescript
it("should display error message", () => {
  const error = new Error("Failed to fetch teams");

  vi.mocked(useTeamsQuery).mockReturnValue(
    createMockQueryResponse(null, false, error)
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
```

### Testing Mutations

```typescript
import { useCreateTeam } from "@/queries/team.queries";
import { createMockMutationResponse } from "@/tests/mocks/query.mock";

describe("CreateTeam", () => {
  it("should handle team creation", async () => {
    const mockMutation = createMockMutationResponse();
    const newTeam = { id: "2", name: "New Team" };

    (mockMutation.mutateAsync as any).mockResolvedValue(newTeam);

    vi.mocked(useCreateTeam).mockReturnValue(mockMutation);

    const wrapper = mount(CreateTeamComponent, {
      global: {
        plugins: [
          createTestingPinia({ createSpy: vi.fn }),
          [VueQueryPlugin, { queryClient }],
        ],
      },
    });

    await wrapper.find('[data-test="submit"]').trigger("click");
    await flushPromises();

    expect(mockMutation.mutateAsync).toHaveBeenCalled();
  });

  it("should handle mutation errors", async () => {
    const mockMutation = createMockMutationResponse();
    const error = new Error("Team creation failed");

    (mockMutation.mutateAsync as any).mockRejectedValue(error);

    vi.mocked(useCreateTeam).mockReturnValue(mockMutation);

    // Test error handling
  });
});
```

## Adding New Mocks

When you create a new query hook, add it to the mock system:

### Step 1: Define Mock Data

In `src/tests/mocks/query.mock.ts`:

```typescript
export const mockMyFeatureData = {
  id: "1",
  name: "Test Data",
  // ... other fields
};
```

### Step 2: Add to queryMocks

```typescript
export const queryMocks = {
  // ... existing mocks
  useMyFeature: () => createMockQueryResponse(mockMyFeatureData),
  useUpdateMyFeature: () => createMockMutationResponse(),
};
```

### Step 3: Register in Setup

In `src/tests/setup/composables.setup.ts`:

```typescript
/**
 * Mock My Feature Queries (my-feature.queries.ts)
 */
vi.mock("@/queries/my-feature.queries", () => ({
  useMyFeature: vi.fn(queryMocks.useMyFeature),
  useUpdateMyFeature: vi.fn(queryMocks.useUpdateMyFeature),
}));
```

## Best Practices

### 1. Use Mock Data Consistently

```typescript
// ✅ Good: Use predefined mock data
import { mockTeamsData } from "@/tests/mocks/query.mock";

const wrapper = mount(Component, {
  // ... uses mockTeamsData automatically
});

// ❌ Avoid: Creating ad-hoc test data
const testData = [{ id: "1", name: "Test" }];
```

### 2. Override Only What's Needed

```typescript
// ✅ Good: Override specific test case
vi.mocked(useTeamsQuery).mockReturnValue(
  createMockQueryResponse([]) // Just override this test
);

// ❌ Avoid: Modifying global mock data
mockTeamsData[0].name = "Modified";
```

### 3. Clear Mocks Between Tests

```typescript
// ✅ Good: Use beforeEach
beforeEach(() => {
  vi.clearAllMocks();
});

// ❌ Avoid: Leaving mocks in modified state
```

### 4. Test Different States

```typescript
// ✅ Good: Test all states
it("should show loader while loading", () => {});
it("should show data when loaded", () => {});
it("should show error when failed", () => {});

// ❌ Avoid: Only testing happy path
```

## Common Patterns

### Multi-State Testing

```typescript
describe("Data Loading States", () => {
  const createWrapper = (state: "loading" | "success" | "error") => {
    const stateMap = {
      loading: () => createMockQueryResponse([], true),
      success: () => createMockQueryResponse(mockTeamsData),
      error: () => createMockQueryResponse(null, false, new Error("Failed")),
    };

    vi.mocked(useTeamsQuery).mockReturnValue(stateMap[state]());

    return mount(TeamsComponent, {
      global: {
        plugins: [
          createTestingPinia({ createSpy: vi.fn }),
          [VueQueryPlugin, { queryClient }],
        ],
      },
    });
  };

  it("should show loader in loading state", () => {
    const wrapper = createWrapper("loading");
    expect(wrapper.find('[data-test="loader"]').exists()).toBe(true);
  });

  it("should show data in success state", () => {
    const wrapper = createWrapper("success");
    expect(wrapper.text()).toContain("Test Team");
  });

  it("should show error in error state", () => {
    const wrapper = createWrapper("error");
    expect(wrapper.find('[data-test="error"]').exists()).toBe(true);
  });
});
```

### Testing Query Invalidation

```typescript
it("should invalidate team queries after update", async () => {
  const mockMutation = createMockMutationResponse();
  (mockMutation.mutateAsync as any).mockResolvedValue(updatedTeam);

  vi.mocked(useUpdateTeam).mockReturnValue(mockMutation);

  const wrapper = mount(UpdateTeamComponent, {
    global: {
      plugins: [
        createTestingPinia({ createSpy: vi.fn }),
        [VueQueryPlugin, { queryClient }],
      ],
    },
  });

  // The mock's onSuccess callback should invalidate queries
  await wrapper.find('[data-test="submit"]').trigger("click");
  await flushPromises();

  // Verify invalidation occurred
});
```

## Troubleshooting

### Mock Not Being Used

```typescript
// ✅ Correct: Mock is applied before component mounts
beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(useTeamsQuery).mockReturnValue(createMockQueryResponse([]))
})

const wrapper = mount(Component) // Now uses the mock

// ❌ Wrong: Mocking after component mounts
const wrapper = mount(Component)
vi.mocked(useTeamsQuery).mockReturnValue(...) // Too late!
```

### Async Mock Issues

```typescript
// ✅ Correct: Use flushPromises() to resolve pending promises
await flushPromises();

// ❌ Wrong: Without flushPromises(), mutations may not complete
await wrapper.find('[data-test="submit"]').trigger("click");
// Mutation not yet resolved
```

## Resources

- [Global Mocks Implementation](../../src/tests/mocks/)
- [Unit Testing Guide](./unit-testing.md)
- [TanStack Vue Query Docs](https://tanstack.com/query/latest/docs/vue/overview)
- [Vitest Documentation](https://vitest.dev/)
