# Axios + TanStack Query Migration Summary

## Overview
This document summarizes the migration from `useCustomFetch` to Axios + TanStack Query for the CNC Portal application.

## What Was Migrated

### Core Infrastructure
- ✅ Created Axios client instance (`src/lib/axios.ts`) with authentication interceptors
- ✅ Created query files in `src/queries/` directory
- ✅ Added central export file (`src/queries/index.ts`)

### Stores
- ✅ `teamStore.ts` - Migrated to use `useTeams` and `useTeam` queries
- ✅ `notificationStore.ts` - Migrated to use `useNotifications`, `useAddBulkNotifications`, and `useUpdateNotification`
- ✅ `expenseStore.ts` - Migrated to use `useExpenses` query

### Composables
- ✅ `useAuth.ts` - Migrated to use `useValidateToken` query
- ✅ `useSiwe.ts` - Migrated to use `useUser` query (kept useFetch for non-authenticated endpoints)
- ✅ `useBod.ts` - Migrated to use `useCreateAction` and `useUpdateAction` mutations
- ✅ `bod/functions.ts` - Migrated to use `useCreateAction` and `useUpdateAction` mutations
- ✅ `bod.ts` - Migrated to use `useCreateAction` mutation

### Services
- ✅ `AddCampaignService.ts` - Migrated to use `useCreateContract` mutation

### Query Files Created
1. **auth.queries.ts** - Authentication token validation
2. **team.queries.ts** - Team CRUD operations (list, get, create, update, delete)
3. **user.queries.ts** - User data fetching by address, nonce retrieval
4. **notification.queries.ts** - Notification management (list, bulk add, update)
5. **action.queries.ts** - Board action creation and updates
6. **expense.queries.ts** - Expense data fetching
7. **contract.queries.ts** - Contract creation

## Benefits of This Migration

1. **Better Caching** - TanStack Query automatically caches data and manages cache invalidation
2. **Automatic Refetching** - Queries can automatically refetch on window focus, reconnect, etc.
3. **Loading & Error States** - Built-in loading and error state management
4. **Optimistic Updates** - Easy to implement optimistic UI updates with mutations
5. **Type Safety** - Better TypeScript integration with strongly typed query/mutation hooks
6. **Standardization** - Axios is industry standard with better error handling than native fetch
7. **Request/Response Interceptors** - Centralized auth token handling and error handling

## What Remains Using useCustomFetch

The following components still use `useCustomFetch` but are less critical and can be migrated incrementally:

### Components
- `NotificationDropdown.vue` - Notification updates
- `SelectMemberInput.vue` - User search
- `AddTeamForm.vue` - Team creation form
- `EditUserForm.vue` - User profile updates
- `CreateAddCampaign.vue` - Campaign contract creation
- `MainContractSection.vue` - Contract reset
- `ApprovedExpensesSection.vue` - Expense submission
- `WeeklyClaimActionDropdown.vue` - Claim actions
- Various other components in views

### Recommendation
These components can be migrated incrementally as part of future work. The core infrastructure is now in place, making it easy to create new query/mutation hooks as needed.

## Testing Updates

### Updated Tests
- ✅ `notificationStore.spec.ts` - Updated to mock TanStack Query hooks
- ✅ `AddCampaignService.spec.ts` - Updated to mock `useCreateContract`

### Test Strategy
Tests now mock TanStack Query hooks instead of `useCustomFetch`. This provides:
- More realistic test scenarios
- Better type safety in tests
- Easier to mock query/mutation states

## Breaking Changes

### Store API Changes
1. **teamStore.ts**
   - Removed `statusCode` from return (now computed from error)
   - `teams` is now a computed ref from TanStack Query
   - `executeFetchTeams` is now `refetch` from TanStack Query

2. **notificationStore.ts**
   - Similar API but backed by TanStack Query
   - `isLoading` and `error` now come from queries

3. **expenseStore.ts**
   - Removed `allExpenseDataStatusCode` from return
   - Query automatically refetches when teamId changes

### Migration Notes
- Views using `statusCode` were updated to use computed values from error state
- Components are backward compatible as store interfaces remain similar

## Usage Examples

### Using Queries in Components
```typescript
import { useTeams } from '@/queries'
import { computed } from 'vue'

export default {
  setup() {
    const userAddress = computed(() => '0x...')
    const { data: teams, isLoading, error, refetch } = useTeams(userAddress)
    
    return { teams, isLoading, error, refetch }
  }
}
```

### Using Mutations in Components
```typescript
import { useCreateTeam } from '@/queries'

export default {
  setup() {
    const createTeam = useCreateTeam()
    
    const handleSubmit = async (teamData) => {
      try {
        await createTeam.mutateAsync(teamData)
        // Teams list will automatically refetch
      } catch (error) {
        console.error('Failed to create team:', error)
      }
    }
    
    return { 
      handleSubmit, 
      isCreating: createTeam.isPending 
    }
  }
}
```

## Configuration

### Axios Instance
Located in `src/lib/axios.ts`:
- Base URL from environment variable
- Automatic auth token injection from localStorage
- JSON content-type by default
- Global error interceptor for 401 handling

### TanStack Query Setup
Located in `src/main.ts`:
- Refetch interval: 20 seconds
- Refetch on window focus: enabled
- Retry on failure: 2 attempts

## Future Work

1. Migrate remaining components incrementally
2. Add more query files as needed (wages, elections, stats, etc.)
3. Consider adding React Query Devtools for development
4. Implement optimistic updates for better UX
5. Add request deduplication for concurrent requests
6. Consider deprecating `useCustomFetch` entirely

## Resources

- [TanStack Query Docs](https://tanstack.com/query/latest/docs/vue/overview)
- [Axios Docs](https://axios-http.com/docs/intro)
- Project: `/home/runner/work/cnc-portal/cnc-portal/app`
