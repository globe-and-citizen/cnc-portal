import { beforeEach, vi } from 'vitest'
import * as mocks from '@/tests/mocks/store.mock'

// Restore the shared user-store mock to its defaults before every test so that
// per-spec mutations (e.g. `mockUserStore.address = '0x…'`) never leak across
// tests. The mock below returns the SAME object reference on every call, so a
// mutation made before mounting is reliably visible to the component.
beforeEach(() => {
  mocks.resetUserStoreMock()
})

// Convention: mock individual store submodules, not the `@/stores` barrel.
// `@/stores/index.ts` re-exports each submodule via `export *`, so a mock on
// `@/stores/<name>` propagates to consumers that import from either path.
// Mocking the barrel as well risks duplicate `vi.mock` declarations whose
// resolution order is non-deterministic.

vi.mock('@/stores/user', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    useUserDataStore: vi.fn(() => mocks.mockUserStore)
  }
})

vi.mock('@/stores/teamStore', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    useTeamStore: vi.fn(() => ({ ...mocks.mockTeamStore }))
  }
})

vi.mock('@/stores/currencyStore', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    useCurrencyStore: vi.fn(() => mocks.mockUseCurrencyStore())
  }
})

vi.mock('@nuxt/ui', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    useToast: vi.fn(() => mocks.mockToast)
  }
})

vi.mock('@nuxt/ui/composables', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    useToast: vi.fn(() => mocks.mockToast)
  }
})
