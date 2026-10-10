# TanStack Query Hooks

This folder contains all TanStack Query hooks for API interactions in the CNC Portal frontend.

## Quick Reference

| File                             | Domain        | Description                             |
| -------------------------------- | ------------- | --------------------------------------- |
| `action.queries.ts`              | Actions       | BOD actions and election notifications  |
| `auth.queries.ts`                | Auth          | Token validation                        |
| `blockTimestamp.queries.ts`      | Chain data    | Immutable block timestamp cache         |
| `contract.queries.ts`            | Contracts     | Smart contract management               |
| `expense.queries.ts`             | Expenses      | Expense account operations              |
| `health.queries.ts`              | Health        | Backend health checks                   |
| `coingecko.queries.ts`           | Market data   | Current, contract and historical prices |
| `investorPermissions.queries.ts` | Chain data    | Verified Investor role-holder evidence  |
| `member.queries.ts`              | Members       | Team member management                  |
| `notification.queries.ts`        | Notifications | User notifications                      |
| `queryClient.ts`                 | Shared cache  | Application-wide query client           |
| `safe.queries.ts`                | Safe          | Gnosis Safe operations                  |
| `safeClient.queries.ts`          | Safe holdings | Gateway balances and fiat valuations    |
| `team.queries.ts`                | Teams         | Team CRUD operations                    |
| `user.queries.ts`                | Users         | User profile management                 |
| `wage.queries.ts`                | Wages         | Member wage settings                    |
| `weeklyClaim.queries.ts`         | Claims        | Weekly claim operations                 |

## Naming Conventions

- **Queries**: `useGet{Domain}Query` (e.g., `useGetTeamQuery`)
- **Mutations**: `useCreate{Domain}Mutation`, `useUpdate{Domain}Mutation`, `useDelete{Domain}Mutation`
- **Parameters**: `{Action}{Domain}Params` with `pathParams` and `queryParams` structure

## Endpoint and mutation architecture

- A mutation is a pure async request function wrapped by one `useXxxMutation` composable. Components use its callbacks and reactive state
  rather than orchestrating request state with local `try`/`catch` blocks.
- Create one query or mutation hook per HTTP method and endpoint. Actions that differ only by request data or query parameters reuse that
  hook at the call site; do not create `useArchiveXxxMutation` and `useUnarchiveXxxMutation` when both update the same resource.
- Query data is the server-state source of truth. Do not mirror it into a Pinia store merely to make it easier to consume.
- External CoinGecko, Safe Transaction Service and Safe Client Gateway requests live in their query modules and use the external Axios
  client with the query cancellation signal. Pure response interpretation belongs in utilities; observer cache, polling and retry settings
  remain with the queries.
- External queries inherit freshness from `queryPresets.moderate` or `queryPresets.once` without local `staleTime` overrides.
  `refetchInterval` is the observer polling cadence, and `retryDelay` waits between failed attempts only when `retry` permits one. These
  values do not limit the initial number of provider requests.
- CoinGecko endpoints use ordinary `useQuery` or `useQueries` observers with direct Axios calls and raw cached responses. Each query
  forwards cancellation and exposes its own error; `retry: false` avoids automatic retries. The existing Accounting data layer consumes
  those queries directly, resolves rates through pure utilities and refreshes failed observers, preserving successful immutable date
  snapshots.

## Full Documentation

For complete standards and patterns, see: [Query Standards Documentation](../../../docs/QUERY_STANDARDS.md)
