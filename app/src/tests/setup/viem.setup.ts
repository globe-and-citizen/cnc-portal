import { vi } from 'vitest'

/**
 * Mock viem utility functions
 * Provides mocked versions of common viem functions used in tests
 */
vi.mock('viem', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    isAddress: vi.fn((address: string) => {
      // Return true for all test addresses
      return !!address && typeof address === 'string'
    }),
    encodeFunctionData: vi.fn((config) => '0xEncodedData'),
    zeroAddress: '0x0000000000000000000000000000000000000000'
  }
})
