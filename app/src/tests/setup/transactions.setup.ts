import { vi } from 'vitest'
import { mockUseSafeSendTransaction } from '../mocks/transactions.mock'

/**
 * Mock useSafeSendTransaction composable
 */
vi.mock('@/composables/transactions/useSafeSendTransaction', () => ({
  useSafeSendTransaction: vi.fn(() => mockUseSafeSendTransaction)
}))