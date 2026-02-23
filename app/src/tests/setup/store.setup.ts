import { vi } from 'vitest'
import * as mocks from '@/tests/mocks/store.mock'

// Mock the barrel export for components/composables that use @/stores
vi.mock('@/stores', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    useToastStore: vi.fn(() => mocks.mockToastStore),
    useTeamStore: vi.fn(() => ({ ...mocks.mockTeamStore })),
    useCurrencyStore: vi.fn(() => mocks.mockUseCurrencyStore()),
    useUserDataStore: vi.fn(() => ({ ...mocks.mockUserStore }))
  }
})
;(globalThis as { __mockToastStore?: typeof mocks.mockToastStore }).__mockToastStore =
  mocks.mockToastStore

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

vi.mock('@/stores/useToastStore', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    useToastStore: vi.fn(() => mocks.mockToastStore)
  }
})
