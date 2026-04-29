import { vi } from 'vitest'
import * as mocks from '@/tests/mocks/store.mock'

// Mock each Pinia store submodule individually rather than the `@/stores`
// barrel. `@/stores/index.ts` re-exports each submodule via `export *`, so a
// submodule mock propagates to consumers that import from either path while
// avoiding duplicate `vi.mock` declarations with non-deterministic resolution
// order.

const withActual = async <T extends object>(
  importOriginal: () => Promise<unknown>,
  overrides: T
) => ({ ...((await importOriginal()) as object), ...overrides })

vi.mock('@/stores/user', (orig) =>
  withActual(orig, { useUserDataStore: vi.fn(() => ({ ...mocks.mockUserStore })) })
)
vi.mock('@/stores/teamStore', (orig) =>
  withActual(orig, { useTeamStore: vi.fn(() => ({ ...mocks.mockTeamStore })) })
)
vi.mock('@/stores/currencyStore', (orig) =>
  withActual(orig, { useCurrencyStore: vi.fn(() => mocks.mockUseCurrencyStore()) })
)

vi.mock('@nuxt/ui', (orig) => withActual(orig, { useToast: vi.fn(() => mocks.mockToast) }))
