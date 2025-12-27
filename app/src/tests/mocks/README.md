# Global Mocks Setup

This directory contains centralized mock definitions for testing across the application.

## Overview

All query and composable mocks are now centralized in `query.mock.ts` and are globally applied via `setup/composables.setup.ts`. This ensures consistency across all tests without needing to define mocks individually in each test file.

## Structure

### `query.mock.ts`

Contains all the mock factories and data:

1. **`createMockAxiosResponse<T>(data, status, statusText)`**
   - Factory function to create a mock `AxiosResponse` object
   - Used internally by all query mocks
   - Returns: `AxiosResponse<T>` with proper structure (data, status, statusText, headers, config)

2. **Mock Data Objects**
   - `mockTeamData` - Sample team data
   - `mockTeamsData` - Array of teams
   - `mockWageData` - Sample wage data
   - `mockNotificationData` - Sample notifications
   - Pre-created response objects: `mockTeamResponse`, `mockTeamsResponse`, etc.

3. **Factory Functions**
   - `createMockQueryResponse<T>(data, isLoading, error)` - Creates a TanStack Query response
   - `createMockMutationResponse()` - Creates a TanStack Query mutation response

4. **`queryMocks` Object**
   - Single source of truth for all query/mutation hooks
   - Contains functions for every query/mutation hook
   - Each returns proper TanStack Query response structure

### `setup/composables.setup.ts`

Global mock configuration:

- Applies all mocks from `query.mock.ts` globally
- Runs automatically before all tests via Vitest setup
- Uses `queryMocks` object to avoid code duplication

## Usage

### In Tests

Most tests don't need custom mocks - they use the global defaults:

```typescript
import { mount } from '@vue/test-utils'
import MyComponent from '@/components/MyComponent.vue'

describe('MyComponent', () => {
  it('should work', () => {
    const wrapper = mount(MyComponent)
    // Mocks are already applied globally!
  })
})
```

### Overriding Mocks in Specific Tests

If you need different mock data for a specific test, use `vi.mocked()`:

```typescript
import { useTeams } from '@/queries/team.queries'
import { vi } from 'vitest'

describe('CustomTeamsTest', () => {
  it('should handle custom team data', () => {
    const mockedUseTeams = vi.mocked(useTeams)
    mockedUseTeams.mockReturnValueOnce({
      data: ref(createMockAxiosResponse([customTeamData])),
      isLoading: ref(false),
      error: ref(null)
      // ... other properties
    })

    // Test with custom data
  })
})
```

### Adding New Mocks

When adding a new query hook:

1. Add data to `query.mock.ts`:

   ```typescript
   export const mockMyData = {
     /* data */
   }
   export const mockMyResponse = createMockAxiosResponse(mockMyData)
   ```

2. Add function to `queryMocks`:

   ```typescript
   export const queryMocks = {
     // ... existing
     useMyQuery: () => createMockQueryResponse(mockMyData),
     useMyMutation: () => createMockMutationResponse()
   }
   ```

3. Add mock to `setup/composables.setup.ts`:

   ```typescript
   vi.mock('@/queries/my.queries', () => ({
     useMyQuery: vi.fn(queryMocks.useMyQuery),
     useMyMutation: vi.fn(queryMocks.useMyMutation)
   }))
   ```

## Key Points

- **AxiosResponse Structure**: All query mocks return proper `AxiosResponse` objects with `.data`, `.status`, `.statusText`, etc.
- **Consistency**: Using centralized mocks ensures all tests have consistent behavior
- **Easy Maintenance**: Changes to mock structure only need to be made in one place
- **Flexibility**: Individual tests can still override mocks when needed
- **Type Safety**: All mocks are properly typed with TypeScript

## Testing with AxiosResponse Data

Components accessing query data now need to handle the AxiosResponse structure:

```typescript
// In composables.setup.ts, the mock returns:
// useTeams().data.value = AxiosResponse<Team[]> = {
//   data: Team[],
//   status: 200,
//   statusText: 'OK',
//   ...
// }

// In components using the query:
// teamStore.currentTeam = computed(() => currentTeamMeta.data.value?.data)
// Now safely accesses Team[] from the AxiosResponse.data property
```

This structure allows components and composables to access:

- Response data: `.data.value.data`
- Response status: `.data.value.status`
- Response metadata: `.data.value.headers`, `.data.value.config`, etc.
