# Query Factory Documentation

This document explains the Query Factory pattern used in CNC Portal for creating standardized TanStack Query hooks.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Type System](#type-system)
- [Factory Functions](#factory-functions)
- [Utility Functions](#utility-functions)
- [Query Presets](#query-presets)
- [Usage Examples](#usage-examples)
- [Migration Guide](#migration-guide)

---

## Overview

The Query Factory provides generic builder functions that reduce boilerplate when creating TanStack Query hooks while maintaining full type safety and Vue reactivity support.

### Benefits

- **~80% less code** per hook (from ~50 lines to ~10 lines)
- **Consistent patterns** across all API interactions
- **Type-safe** with full TypeScript inference
- **Reactive** with automatic `MaybeRefOrGetter` unwrapping
- **Centralized** cache invalidation logic

### High-Level Flow

```mermaid
flowchart LR
    subgraph "Definition Time"
        A[QueryConfig] --> B[createQueryHook]
        B --> C[useGetEntityQuery]
    end

    subgraph "Runtime"
        C --> D[Component calls hook]
        D --> E[Hook returns TanStack Query result]
    end

    style A fill:#e1f5fe
    style C fill:#c8e6c9
    style E fill:#fff3e0
```

---

## Architecture

### Component Diagram

```mermaid
classDiagram
    class QueryFactory {
        +createQueryHook()
        +createMutationHook()
    }

    class Utilities {
        +unwrapParams()
        +buildEndpoint()
        +buildRequestConfig()
    }

    class QueryPresets {
        +stable
        +moderate
        +dynamic
        +once
    }

    class TanStackQuery {
        +useQuery()
        +useMutation()
        +useQueryClient()
    }

    class AxiosClient {
        +get()
        +post()
        +put()
        +delete()
    }

    QueryFactory --> Utilities : uses
    QueryFactory --> TanStackQuery : wraps
    QueryFactory --> AxiosClient : calls
    QueryFactory --> QueryPresets : applies
```

### Request Flow - Query

```mermaid
sequenceDiagram
    participant C as Component
    participant H as useGetEntityQuery
    participant F as createQueryHook
    participant U as Utilities
    participant A as apiClient
    participant S as Server

    C->>H: Call hook with params
    H->>F: Execute factory-generated function
    F->>U: unwrapParams(pathParams)
    F->>U: buildEndpoint(template, params)
    F->>U: buildRequestConfig(queryParams)
    F->>A: GET request
    A->>S: HTTP GET /endpoint
    S-->>A: Response data
    A-->>F: Axios response
    F-->>H: Transformed data
    H-->>C: Query result (data, loading, error)
```

### Request Flow - Mutation

```mermaid
sequenceDiagram
    participant C as Component
    participant H as useUpdateEntityMutation
    participant F as createMutationHook
    participant U as Utilities
    participant A as apiClient
    participant Q as QueryClient
    participant S as Server

    C->>H: Call mutation.mutate(params)
    H->>F: Execute mutationFn
    F->>U: buildEndpoint(template, params)
    F->>A: PUT/POST/DELETE request
    A->>S: HTTP request with body
    S-->>A: Response
    A-->>F: Success response
    F->>Q: invalidateQueries(keys)
    Q-->>F: Cache invalidated
    F-->>H: Mutation result
    H-->>C: Success callback
```

---

## Type System

### Type Hierarchy

```mermaid
classDiagram
    class BaseQueryParams {
        +pathParams?: Record~string, unknown~
        +queryParams?: Record~string, unknown~
    }

    class BaseMutationParams {
        +pathParams?: Record~string, unknown~
        +queryParams?: Record~string, unknown~
        +body?: unknown
    }

    class QueryConfig {
        +endpoint: string | Function
        +queryKey: Function
        +enabled?: Function
        +transformResponse?: Function
        +options?: UseQueryOptions
    }

    class MutationConfig {
        +method: HttpMethod
        +endpoint: string | Function
        +invalidateKeys?: QueryKey[] | Function
        +transformResponse?: Function
        +options?: UseMutationOptions
        +onSuccess?: Function
    }

    BaseQueryParams <|-- BaseMutationParams
    QueryConfig --> BaseQueryParams : uses
    MutationConfig --> BaseMutationParams : uses
```

### Generic Type Parameters (Simplified)

The factory now uses only **2 generic parameters**, making it simpler to use:

```mermaid
flowchart TB
    subgraph "createQueryHook&lt;TResponse, TParams&gt;"
        TR[TResponse] --> |"API response type"| OUT[Hook output type]
        TP[TParams] --> |"Full params interface\nwith inline types"| IN[Hook input type]
    end

    style TR fill:#e8f5e9
    style TP fill:#e3f2fd
```

### Parameter Structure

```mermaid
flowchart LR
    subgraph Params["GetTeamParams"]
        subgraph PathParams["pathParams"]
            teamId["teamId: MaybeRefOrGetter&lt;string&gt;"]
        end
        subgraph QueryParams["queryParams"]
            filter["filter?: MaybeRefOrGetter&lt;string&gt;"]
        end
    end

    Params --> |"unwrapParams()"| Unwrapped["{ teamId: '123', filter: 'active' }"]
    Unwrapped --> |"buildEndpoint()"| URL["teams/123?filter=active"]
```

---

## Factory Functions

### createQueryHook

Creates a typed `useQuery` hook for GET requests.

```mermaid
flowchart TB
    subgraph Input["QueryConfig"]
        E[endpoint]
        QK[queryKey]
        EN[enabled?]
        TR[transformResponse?]
        O[options?]
    end

    subgraph Factory["createQueryHook()"]
        direction TB
        P1[Parse endpoint template]
        P2[Build query key]
        P3[Create queryFn]
        P4[Apply options]
    end

    subgraph Output["Generated Hook"]
        H["useGetEntityQuery(params)"]
        R["{ data, isLoading, error, ... }"]
    end

    Input --> Factory
    Factory --> Output
    H --> R
```

**Signature:**

```typescript
function createQueryHook<
  TResponse, // API response type
  TParams extends BaseQueryParams // Hook parameters type (with inline pathParams/queryParams)
>(config: QueryConfig): (params: TParams) => UseQueryReturnType
```

### createMutationHook

Creates a typed `useMutation` hook for POST/PUT/PATCH/DELETE requests.

```mermaid
flowchart TB
    subgraph Input["MutationConfig"]
        M[method: POST|PUT|DELETE]
        E[endpoint]
        IK[invalidateKeys?]
        OS[onSuccess?]
        O[options?]
    end

    subgraph Factory["createMutationHook()"]
        direction TB
        P1[Create mutationFn]
        P2[Setup cache invalidation]
        P3[Wire onSuccess callback]
    end

    subgraph Output["Generated Hook"]
        H["useUpdateEntityMutation()"]
        R["{ mutate, mutateAsync, isPending, ... }"]
    end

    Input --> Factory
    Factory --> Output
    H --> R
```

**Signature:**

```typescript
function createMutationHook<
  TResponse, // API response type
  TParams extends BaseMutationParams // Mutation parameters type (with inline pathParams/queryParams/body)
>(config: MutationConfig): () => UseMutationReturnType
```

---

## Utility Functions

### Data Flow Through Utilities

```mermaid
flowchart LR
    subgraph Input
        PP["pathParams: { teamId: ref('123') }"]
        QP["queryParams: { status: 'active' }"]
        EP["endpoint: 'teams/{teamId}'"]
    end

    subgraph Utilities
        UP["unwrapParams()"]
        BE["buildEndpoint()"]
        BRC["buildRequestConfig()"]
    end

    subgraph Output
        URL["'teams/123'"]
        CFG["{ params: { status: 'active' } }"]
    end

    PP --> UP
    UP --> BE
    EP --> BE
    BE --> URL

    QP --> UP
    UP --> BRC
    BRC --> CFG
```

### unwrapParams()

Converts reactive `MaybeRefOrGetter` values to plain values.

```mermaid
flowchart LR
    subgraph Before
        R1["ref('value')"]
        R2["computed(() => 'value')"]
        R3["() => 'value'"]
        R4["'value'"]
    end

    subgraph "unwrapParams()"
        TV["toValue()"]
    end

    subgraph After
        V["'value'"]
    end

    R1 --> TV
    R2 --> TV
    R3 --> TV
    R4 --> TV
    TV --> V
```

### buildEndpoint()

Replaces `{param}` placeholders with actual values.

```mermaid
flowchart LR
    T["'teams/{teamId}/members/{memberId}'"]
    P["{ teamId: '123', memberId: '456' }"]

    T --> BE["buildEndpoint()"]
    P --> BE
    BE --> R["'teams/123/members/456'"]
```

### buildRequestConfig()

Creates Axios config from query parameters.

```mermaid
flowchart LR
    Q["{ status: 'active', limit: 10, page: undefined }"]

    Q --> BRC["buildRequestConfig()"]
    BRC --> F["Filter undefined"]
    F --> R["{ params: { status: 'active', limit: 10 } }"]
```

---

## Query Presets

Pre-configured options for common use cases.

```mermaid
flowchart TB
    subgraph Presets
        S["stable"]
        M["moderate"]
        D["dynamic"]
        O["once"]
    end

    subgraph "Use Cases"
        S --> S1["User profiles"]
        S --> S2["Team info"]
        S --> S3["Static data"]

        M --> M1["Lists"]
        M --> M2["Aggregations"]

        D --> D1["Notifications"]
        D --> D2["Real-time data"]

        O --> O1["Token validation"]
        O --> O2["One-time checks"]
    end

    style S fill:#c8e6c9
    style M fill:#fff3e0
    style D fill:#ffccbc
    style O fill:#e1f5fe
```

| Preset     | staleTime | gcTime | refetchOnWindowFocus | Use Case             |
| ---------- | --------- | ------ | -------------------- | -------------------- |
| `stable`   | 3 min     | 5 min  | false                | Rarely changing data |
| `moderate` | 1 min     | 2 min  | false                | Moderately changing  |
| `dynamic`  | 10 sec    | 1 min  | true                 | Frequently changing  |
| `once`     | Infinity  | -      | false                | One-time fetches     |

---

## Usage Examples

### Simple Query (No Parameters)

```typescript
// health.queries.ts
export const useGetBackendHealthQuery = createQueryHook<HealthResponse, {}>({
  endpoint: 'health',
  queryKey: () => healthKeys.all,
  options: queryPresets.once
})
```

### Query with Path Parameters

```typescript
// team.queries.ts
// Define params with inline types - no separate interface needed
interface GetTeamParams {
  pathParams: { teamId: MaybeRefOrGetter<number | null> }
}

export const useGetTeamQuery = createQueryHook<Team, GetTeamParams>({
  endpoint: 'teams/{teamId}',
  queryKey: (params) => teamKeys.detail(toValue(params.pathParams?.teamId)),
  enabled: (params) => !!toValue(params.pathParams?.teamId),
  options: queryPresets.stable
})
```

### Query with Query Parameters

```typescript
// action.queries.ts
// Define params with inline types
interface GetActionsParams {
  queryParams: {
    teamId: MaybeRefOrGetter<string | null>
    isExecuted?: MaybeRefOrGetter<boolean>
  }
}

export const useGetActionsQuery = createQueryHook<Action[], GetActionsParams>({
  endpoint: 'actions',
  queryKey: (params) =>
    actionKeys.list(toValue(params.queryParams?.teamId), toValue(params.queryParams?.isExecuted)),
  enabled: (params) => !!toValue(params.queryParams?.teamId),
  options: queryPresets.moderate
})
```

### Mutation with Cache Invalidation

```typescript
// team.queries.ts
// Define params with inline types - simpler!
interface UpdateTeamParams {
  pathParams: { id: number }
  body: { name?: string; description?: string }
}

export const useUpdateTeamMutation = createMutationHook<Team, UpdateTeamParams>({
  method: 'PUT',
  endpoint: 'teams/{id}',
  invalidateKeys: (params) => [teamKeys.detail(params.pathParams.id), teamKeys.all]
})
```

### Mutation with Dynamic Endpoint

```typescript
// contract.queries.ts
interface CreateContractParams {
  body: { teamId: number; contractType: string; address: string }
}

export const useCreateContractMutation = createMutationHook<void, CreateContractParams>({
  method: 'POST',
  endpoint: (params) => `teams/${params.body?.teamId}/contracts`,
  invalidateKeys: [contractKeys.all, ['teams']]
})
```

---

## Migration Guide

### Before (Manual Hook)

```typescript
export const useGetTeamQuery = (params: GetTeamParams) => {
  const { pathParams } = params

  return useQuery<Team, AxiosError>({
    queryKey: teamKeys.detail(toValue(pathParams.teamId)),
    queryFn: async () => {
      const teamId = toValue(pathParams.teamId)
      const { data } = await apiClient.get<Team>(`teams/${teamId}`)
      return data
    },
    enabled: () => !!toValue(pathParams.teamId),
    staleTime: 180000,
    gcTime: 300000,
    refetchOnWindowFocus: false,
    refetchOnMount: false
  })
}
```

### After (Factory Hook)

```typescript
// Only 2 generics needed: Response type and Params type
interface GetTeamParams {
  pathParams: { teamId: MaybeRefOrGetter<number | null> }
}

export const useGetTeamQuery = createQueryHook<Team, GetTeamParams>({
  endpoint: 'teams/{teamId}',
  queryKey: (params) => teamKeys.detail(toValue(params.pathParams?.teamId)),
  enabled: (params) => !!toValue(params.pathParams?.teamId),
  options: queryPresets.stable
})
```

### Migration Checklist

```mermaid
flowchart TD
    A[Identify hook type] --> B{Query or Mutation?}

    B -->|Query| C[Define single Params interface with inline types]
    B -->|Mutation| D[Define single Params interface with inline types]

    C --> E[Choose endpoint pattern]
    D --> E

    E --> F[Define queryKey function]
    F --> G[Define enabled condition]
    G --> H[Choose preset or custom options]

    H --> I[Replace manual hook with factory call]
    I --> J[Test in component]
    J --> K[Verify TypeScript types]

    style A fill:#e8f5e9
    style I fill:#fff3e0
    style K fill:#c8e6c9
```

---

## Decision Tree

```mermaid
flowchart TD
    START[New API hook needed] --> Q1{Fetch or Mutate?}

    Q1 -->|Fetch| Q2{Has path params?}
    Q1 -->|Mutate| M1{HTTP Method?}

    Q2 -->|Yes| Q3["endpoint: 'resource/{id}'"]
    Q2 -->|No| Q4["endpoint: 'resource'"]

    Q3 --> Q5{Has query params?}
    Q4 --> Q5

    Q5 -->|Yes| Q6[Define TQueryParams]
    Q5 -->|No| Q7[Use createQueryHook]
    Q6 --> Q7

    M1 -->|POST| M2["method: 'POST'"]
    M1 -->|PUT| M3["method: 'PUT'"]
    M1 -->|DELETE| M4["method: 'DELETE'"]

    M2 --> M5{Needs cache invalidation?}
    M3 --> M5
    M4 --> M5

    M5 -->|Yes| M6[Define invalidateKeys]
    M5 -->|No| M7[Use createMutationHook]
    M6 --> M7

    style START fill:#e1f5fe
    style Q7 fill:#c8e6c9
    style M7 fill:#c8e6c9
```
