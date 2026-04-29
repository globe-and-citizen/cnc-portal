import { vi } from 'vitest'
import * as mocks from '@/tests/mocks/store.mock'

// Mock the barrel export for components/composables that use @/stores
vi.mock('@/stores', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    useTeamStore: vi.fn(() => ({ ...mocks.mockTeamStore })),
    useCurrencyStore: vi.fn(() => mocks.mockUseCurrencyStore()),
    useUserDataStore: vi.fn(() => ({ ...mocks.mockUserStore }))
  }
})

vi.mock('@nuxt/ui', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    useToast: vi.fn(() => mocks.mockToast)
  }
})

vi.mock('@/stores/user', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    useUserDataStore: vi.fn(() => ({ ...mocks.mockUserDataStore }))
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
