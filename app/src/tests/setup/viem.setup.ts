import { vi } from 'vitest'

/**
 * Mock viem utility functions
 * Provides mocked versions of common viem functions used in tests
 */
vi.mock('viem', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    // isAddress: vi.fn((address: string) => {
    //   // Return true for all test addresses
    //   return !!address && typeof address === 'string'
    // }), // No need to mock this function because we will allway use a real address in tests, and the real function will work fine with that. If we need to test invalid addresses, we can do that on a case by case basis in individual tests.
    encodeFunctionData: vi.fn(() => '0xEncodedData'),
    // zeroAddress: '0x0000000000000000000000000000000000000000' // No need to mock this constant, we can just use the real value in tests without issue. If we need to test with a different zero address for some reason, we can do that on a case by case basis in individual tests.
  }
})
