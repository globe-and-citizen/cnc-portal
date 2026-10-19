# CNC Portal Mock System

**Scope:** Current Vitest mocks under `app/src/tests/`.

The application uses shared Vitest setup files so component and composable specs exercise stable, explicit boundaries. This guide describes
the current mock modules and the supported per-test override pattern. The [test utilities guide](../../app/src/tests/README.md) owns the
broader rules for component mounting and forbidden test patterns.

## Sources of truth

| Area                              | Current owner                                  |
| --------------------------------- | ---------------------------------------------- |
| Mock values and factories         | `app/src/tests/mocks/`                         |
| Global registrations              | `app/src/tests/setup/`                         |
| Provider-aware component mounting | `app/src/tests/helpers/renderWithProviders.ts` |
| ESLint enforcement                | `app/eslint.config.js`                         |

The public barrel is [`app/src/tests/mocks/index.ts`](../../app/src/tests/mocks/index.ts). Prefer importing override handles from
`@/tests/mocks` instead of importing an internal mock file directly.

## Mock modules

| Module                                                                 | Responsibility                                                                                          |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `query.mock.ts`                                                        | TanStack Query data, query responses, mutation responses, and reset helpers for supported query modules |
| `erc20.mock.ts`                                                        | Contract read and `useContractWritesV3`-shaped write mocks for token flows                              |
| `contract.mock.ts`                                                     | Shared contract read/write state used by contract-facing composables                                    |
| `composables.mock.ts`                                                  | Authentication, backend wake-up, deployment, upload, balance, and transaction state                     |
| `store.mock.ts`                                                        | Team, user, currency, and toast state                                                                   |
| `wagmi.vue.mock.ts` and `viem.actions.mock.ts`                         | Wallet and viem action boundaries                                                                       |
| `api.mock.ts`, `eventFeed.mock.ts`, `router.mock.ts`, and domain mocks | Focused API, event, navigation, and feature-specific boundaries                                         |

Global setup files register these mocks for the modules used by the app. A new mock belongs in `app/src/tests/setup/` only when several
specs need the same boundary; its supported override must also be exported from `app/src/tests/mocks/index.ts`.

## Default usage

Most specs need no mock registration. Mount components with `renderWithProviders`, then change only the state required by the scenario:

```ts
import { renderWithProviders, mockERC20Reads, resetERC20Mocks } from '@/tests/mocks'

beforeEach(() => resetERC20Mocks())

it('renders the available token balance', () => {
  mockERC20Reads.balanceOf.data.value = 500n * 10n ** 18n

  const wrapper = renderWithProviders(MyComponent)

  expect(wrapper.get('[data-test="token-balance"]').text()).toContain('500')
})
```

For write flows, use the mutation-shaped handle exposed by the shared mock:

```ts
import { mockERC20Writes } from '@/tests/mocks'

mockERC20Writes.approve.mutateAsync.mockResolvedValue(undefined)
```

The team store uses plain state fields rather than refs:

```ts
import { mockTeamStore } from '@/tests/mocks'

mockTeamStore.currentTeamId = '42'
```

Toast assertions use the shared `mockToast` handle:

```ts
import { mockToast } from '@/tests/mocks'

expect(mockToast.add).toHaveBeenCalledWith(
  expect.objectContaining({ color: 'success' })
)
```

## Reset and isolation

The global setup resets shared mutable state before each test. A spec that mutates a specialized mock should call its exported reset helper
in its own `beforeEach` when the global setup does not own that state. Current examples include:

- `resetERC20Mocks()` for token reads and writes;
- `resetComposableMocks()` for shared composable state;
- `resetNotificationsMock()` for the notification list;
- `resetMockRoute()` for the shared router state;
- `resetTeamStoreMock()` and `resetUserStoreMock()` for store state.

Use `vi.clearAllMocks()` for local spies, but do not rebuild or re-register the global mock graph in individual specs.

## Adding a global mock

1. Add a typed default value or factory to the relevant file in `app/src/tests/mocks/`.
2. Add a reset path for every mutable ref or spy that can leak between tests.
3. Register the production module in the appropriate file under `app/src/tests/setup/`.
4. Export the supported override from `app/src/tests/mocks/index.ts`.
5. Add a focused test that proves the default and overridden behaviour.
6. Run the app lint and unit test checks.

Do not add `vi.mock()` for a module already registered globally. ESLint enforces this through the `bannedGlobalMockPaths` list in
`app/eslint.config.js`. If only one spec needs a genuinely local mock, keep it local and use `vi.hoisted` when the factory references a mock
declared in the test.

## Boundary rules

- Mocks may replace external systems or a lower-level application boundary in unit and component tests.
- They must not be presented as integrated E2E evidence.
- A product outcome that depends on backend persistence or chain state belongs in the appropriate browser or integrated Playwright profile.
- Assertions should observe rendered output, emitted events, calls, or persisted results; they should not inspect private component state.

## References

- [Test utilities guide](../../app/src/tests/README.md)
- [Testing overview](../../.github/copilot-instructions/testing-overview.md)
- [Testing anti-patterns](../../.github/copilot-instructions/testing-anti-patterns.md)
