# TanStack Query Standards

This document defines the standards for TanStack Query hooks in the CNC Portal frontend application.

## Table of Contents

- [Overview](#overview)
- [File Structure](#file-structure)
- [Naming Conventions](#naming-conventions)
- [Parameter Structure](#parameter-structure)
- [Reactivity](#reactivity)
- [Query Key Factories](#query-key-factories)
- [Examples](#examples)

---

## Overview

All API interactions in the frontend use TanStack Query hooks. These hooks provide:

- Automatic caching and cache invalidation
- Loading and error states
- Reactive parameter support
- Consistent patterns across the codebase

---

## File Structure

Each query file follows this structure:

```typescript
// 1. Imports
import { useQuery, useMutation, useQueryClient } from "@tanstack/vue-query";
import apiClient from "@/lib/axios";
import type { MaybeRefOrGetter } from "vue";
import { toValue } from "vue";

// 2. Query key factory
export const domainKeys = {
  all: ["domain"] as const,
  // ... key definitions
};

// 3. Hook sections (one per endpoint)
// ============================================================================
// METHOD /endpoint - Description
// ============================================================================

export interface HookParams {
  /* ... */
}

export const useHookName = (params: HookParams) => {
  /* ... */
};
```

---

## Naming Conventions

### Hook Names

| Operation    | Pattern                     | Example                    |
| ------------ | --------------------------- | -------------------------- |
| Fetch single | `useGet{Domain}Query`       | `useGetTeamQuery`          |
| Fetch list   | `useGet{Domain}sQuery`      | `useGetTeamsQuery`         |
| Create       | `useCreate{Domain}Mutation` | `useCreateTeamMutation`    |
| Update       | `useUpdate{Domain}Mutation` | `useUpdateTeamMutation`    |
| Delete       | `useDelete{Domain}Mutation` | `useDeleteTeamMutation`    |
| Sync         | `useSync{Domain}Mutation`   | `useSyncContractsMutation` |

### Parameter Interfaces

| Type          | Pattern                | Example            |
| ------------- | ---------------------- | ------------------ |
| Query params  | `Get{Domain}Params`    | `GetTeamParams`    |
| Create params | `Create{Domain}Params` | `CreateTeamParams` |
| Update params | `Update{Domain}Params` | `UpdateTeamParams` |
| Delete params | `Delete{Domain}Params` | `DeleteTeamParams` |
| Request body  | `{Action}{Domain}Body` | `CreateTeamBody`   |

### Query Key Factories

```typescript
export const domainKeys = {
  all: ["domain"] as const,
  lists: () => [...domainKeys.all, "list"] as const,
  list: (filters) => [...domainKeys.lists(), filters] as const,
  details: () => [...domainKeys.all, "detail"] as const,
  detail: (id) => [...domainKeys.details(), { id }] as const,
};
```

---

## Parameter Structure

### Standard Structure

All hooks use a single `params` object with `pathParams` and `queryParams`:

```typescript
export interface GetResourceParams {
  pathParams?: {
    // URL path segments (e.g., /resource/{id})
  };
  queryParams?: {
    // URL query string (e.g., ?filter=value)
  };
}
```

### Rules

1. **`pathParams`**: Required when endpoint has URL path parameters
2. **`queryParams`**: Required when endpoint accepts query string parameters
3. **Inline types**: Define types inline, no separate interfaces for pathParams/queryParams
4. **Optional marker**: Use `?` for optional params objects (e.g., `pathParams?: {}`)

### Examples by Endpoint Type

#### No parameters

```typescript
// GET /health
export interface GetHealthParams {
  pathParams?: {};
  queryParams?: {};
}
```

#### Path parameters only

```typescript
// GET /teams/{teamId}
export interface GetTeamParams {
  pathParams: {
    teamId: MaybeRefOrGetter<string | null>;
  };
}
```

#### Query parameters only

```typescript
// GET /actions?teamId=xxx&isExecuted=xxx
export interface GetBodActionsParams {
  pathParams?: {};
  queryParams: {
    teamId: MaybeRefOrGetter<string | null>;
    isExecuted?: MaybeRefOrGetter<boolean | undefined>;
  };
}
```

#### Both path and query parameters

```typescript
// GET /teams/{teamId}/members?role=xxx
export interface GetTeamMembersParams {
  pathParams: {
    teamId: MaybeRefOrGetter<string | null>;
  };
  queryParams?: {
    role?: MaybeRefOrGetter<string | undefined>;
  };
}
```

---

## Reactivity

### All Parameters Should Be Reactive

Use `MaybeRefOrGetter<T>` for all parameter values that might change:

```typescript
interface GetTeamParams {
  pathParams: {
    // ✅ Reactive - allows refs, computed, or getter functions
    teamId: MaybeRefOrGetter<string | null>;
  };
}
```

### Why `MaybeRefOrGetter`?

| Type                  | Accepts                     |
| --------------------- | --------------------------- |
| `MaybeRef<T>`         | `T` or `Ref<T>`             |
| `MaybeRefOrGetter<T>` | `T`, `Ref<T>`, or `() => T` |

`MaybeRefOrGetter` is more flexible - it accepts getter functions from stores:

```typescript
// All these work:
useGetTeamQuery({ pathParams: { teamId: "123" } }); // plain value
useGetTeamQuery({ pathParams: { teamId: teamIdRef } }); // ref
useGetTeamQuery({ pathParams: { teamId: () => store.currentTeamId } }); // getter
```

### Unwrapping in Hooks

Always use `toValue()` to unwrap reactive parameters:

```typescript
export const useGetTeamQuery = (params: GetTeamParams) => {
  const { pathParams } = params;

  return useQuery({
    queryKey: teamKeys.detail(toValue(pathParams.teamId)),
    queryFn: async () => {
      const teamId = toValue(pathParams.teamId);
      const { data } = await apiClient.get(`teams/${teamId}`);
      return data;
    },
    enabled: () => !!toValue(pathParams.teamId),
  });
};
```

---

## Query Key Factories

### Purpose

Query key factories provide:

- Consistent key structure across the codebase
- Type-safe key generation
- Easy cache invalidation at any level

### Standard Factory Structure

```typescript
export const teamKeys = {
  // Base key for all team queries
  all: ["teams"] as const,

  // List queries
  lists: () => [...teamKeys.all, "list"] as const,
  list: (userAddress?: string | null) =>
    [...teamKeys.lists(), { userAddress }] as const,

  // Detail queries
  details: () => [...teamKeys.all, "detail"] as const,
  detail: (teamId: string | null) =>
    [...teamKeys.details(), { teamId }] as const,
};
```

### Cache Invalidation

```typescript
// Invalidate all team queries
queryClient.invalidateQueries({ queryKey: teamKeys.all });

// Invalidate only team lists
queryClient.invalidateQueries({ queryKey: teamKeys.lists() });

// Invalidate specific team
queryClient.invalidateQueries({ queryKey: teamKeys.detail(teamId) });
```

---

## Examples

### Complete Query Example

```typescript
// ============================================================================
// GET /teams/{teamId} - Fetch single team
// ============================================================================

/**
 * Parameters for useGetTeamQuery
 */
export interface GetTeamParams {
  pathParams: {
    /** Team ID */
    teamId: MaybeRefOrGetter<string | null>;
  };
}

/**
 * Fetch a single team by ID
 *
 * @endpoint GET /teams/{teamId}
 * @pathParams { teamId: string }
 * @queryParams none
 * @body none
 */
export const useGetTeamQuery = (params: GetTeamParams) => {
  const { pathParams } = params;

  return useQuery<Team, AxiosError>({
    queryKey: teamKeys.detail(toValue(pathParams.teamId)),
    queryFn: async () => {
      const teamId = toValue(pathParams.teamId);
      const { data } = await apiClient.get<Team>(`teams/${teamId}`);
      return data;
    },
    enabled: () => !!toValue(pathParams.teamId),
    staleTime: 180000,
    gcTime: 300000,
  });
};
```

### Complete Mutation Example

```typescript
// ============================================================================
// PUT /teams/{id} - Update team
// ============================================================================

/**
 * Request body for updating a team
 */
export interface UpdateTeamBody extends Partial<Team> {}

/**
 * Parameters for useUpdateTeamMutation
 */
export interface UpdateTeamParams {
  pathParams: {
    /** Team ID */
    id: string;
  };
  body: UpdateTeamBody;
}

/**
 * Update an existing team
 *
 * @endpoint PUT /teams/{id}
 * @pathParams { id: string }
 * @queryParams none
 * @body UpdateTeamBody
 */
export const useUpdateTeamMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<Team, AxiosError, UpdateTeamParams>({
    mutationFn: async (params: UpdateTeamParams) => {
      const { pathParams, body } = params;
      const { data } = await apiClient.put<Team>(
        `teams/${pathParams.id}`,
        body,
      );
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: teamKeys.detail(variables.pathParams.id),
      });
      queryClient.invalidateQueries({ queryKey: teamKeys.all });
    },
  });
};
```

---

## Checklist for New Hooks

- [ ] Hook follows naming convention (`useGet*Query`, `useCreate*Mutation`, etc.)
- [ ] Parameters interface uses `pathParams`/`queryParams` structure
- [ ] All parameter values use `MaybeRefOrGetter<T>` for reactivity
- [ ] Query key uses the domain's key factory
- [ ] JSDoc comments document the endpoint, path params, query params, and body
- [ ] Section header comment identifies the HTTP method and endpoint
