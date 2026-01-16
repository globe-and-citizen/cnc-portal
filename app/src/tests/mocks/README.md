# Global Mocks Setup

This directory contains centralized mock definitions for testing across the application using TanStack Vue Query and Axios.

## Quick Overview

All query and mutation mocks are centralized in `query.mock.ts` and globally applied via `setup/composables.setup.ts`. This ensures consistency across all tests without needing to define mocks individually in each test file.

## Key Files

- **`query.mock.ts`** - Mock data objects and factory functions for creating query/mutation responses
- **`setup/composables.setup.ts`** - Global mock registration that applies to all tests

## Quick Start

Most tests automatically use the global mocks:

```typescript
const wrapper = mount(MyComponent, {
  global: {
    plugins: [createTestingPinia({ createSpy: vi.fn }), [VueQueryPlugin, { queryClient }]]
  }
})
// Global mocks are already active!
```

## Comprehensive Guide

For detailed documentation on:

- How the mock system works
- How to override mocks in specific tests
- Complete response structure reference
- Common testing patterns and best practices

👉 **See [Global Mocks Setup Guide in docs/testing/](../../../../docs/testing/global-mocks-setup.md)**

## Available Mocks

The system mocks all query hooks from:

| Module                    | Mocks                                                                                             |
| ------------------------- | ------------------------------------------------------------------------------------------------- |
| `team.queries.ts`         | `useTeamsQuery`, `useTeamQuery`, `useCreateTeamQuery`, `useUpdateTeamQuery`, `useDeleteTeamQuery` |
| `member.queries.ts`       | `useAddMembersQuery`, `useDeleteMemberQuery`                                                      |
| `wage.queries.ts`         | `useTeamWagesQuery`, `useSetMemberWageQuery`                                                      |
| `notification.queries.ts` | `useNotificationsQuery`, `useAddBulkNotificationsQuery`, `useUpdateNotification`                  |
| `expense.queries.ts`      | `useExpensesQuery`                                                                                |
| `user.queries.ts`         | `useUserQuery`, `useUserNonceQuery`                                                               |
| `action.queries.ts`       | `useCreateActionQuery`, `useUpdateActionQuery`                                                    |
| `auth.queries.ts`         | `useValidateTokenQuery`                                                                           |
| `contract.queries.ts`     | `useCreateContractQuery`                                                                          |
| `health.queries.ts`       | `useBackendHealthQuery`                                                                           |

## Common Tasks

### Override Mock Data for Specific Test

```typescript
import { useTeamsQuery } from '@/queries/team.queries'
import { createMockQueryResponse } from '@/tests/mocks/query.mock'

vi.mocked(useTeamsQuery).mockReturnValue(
  createMockQueryResponse([{ id: '1', name: 'Custom Team' }])
)
```

### Test Loading State

```typescript
vi.mocked(useTeamsQuery).mockReturnValue(
  createMockQueryResponse([], true) // isLoading = true
)
```

### Test Error State

```typescript
vi.mocked(useTeamsQuery).mockReturnValue(createMockQueryResponse(null, false, new Error('Failed')))
```

## Related Documentation

- [Unit Testing Guide](../../../../docs/testing/unit-testing.md) - How to write unit tests
- [Testing Overview](../../../../docs/testing/) - Full testing documentation
- [Development Guide](../../../../docs/development-guide/) - General development guidelines
