import { vi } from 'vitest'
import * as mocks from '@/tests/mocks/store.mock'

vi.mock('@/stores', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    useToastStore: vi.fn(() => ({
      /*addErrorToast: vi.fn(), addSuccessToast: vi.fn()*/ ...mocks.mockToastStore
    })),
    useTeamStore: vi.fn(() => ({ ...mocks.mockTeamStore })),
    useExpenseDataStore: vi.fn(),
    useCryptoPrice: vi.fn(),
    useCurrencyStore: vi.fn(() => ({
      currency: {
        code: 'USD',
        symbol: '$'
      }
    }))
  }
})
