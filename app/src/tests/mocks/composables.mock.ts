import { vi } from 'vitest'
import { ref } from 'vue'

/**
 * Mock useContractBalance composable
 */
export const mockUseContractBalance = {
  balances: ref([
    {
      amount: 0.5,
      token: {
        id: 'native',
        name: 'SepoliaETH',
        symbol: 'SepoliaETH',
        code: 'SepoliaETH',
        coingeckoId: 'ethereum',
        decimals: 18,
        address: '0x0000000000000000000000000000000000000000'
      },
      values: {
        USD: {
          value: 500,
          formated: '$500',
          id: 'usd',
          code: 'USD',
          symbol: '$',
          price: 1000,
          formatedPrice: '$1K'
        }
      }
    },
    {
      amount: 50,
      token: {
        id: 'usdc',
        name: 'USD Coin',
        symbol: 'USDC',
        code: 'USDC',
        coingeckoId: 'usd-coin',
        decimals: 6,
        address: '0xA3492D046095AFFE351cFac15de9b86425E235dB'
      },
      values: {
        USD: {
          value: 50000,
          formated: '$50K',
          id: 'usd',
          code: 'USD',
          symbol: '$',
          price: 1000,
          formatedPrice: '$1K'
        }
      }
    }
  ]),
  total: ref({
    USD: {
      value: 50500,
      formated: '$50.5K',
      id: 'usd',
      code: 'USD',
      symbol: '$',
      price: 1000,
      formatedPrice: '$1K'
    }
  }),
  dividendsTotal: ref({
    USD: {
      value: 100,
      formated: '$100',
      id: 'usd',
      code: 'USD',
      symbol: '$',
      price: 1000,
      formatedPrice: '$1K'
    }
  }),
  isLoading: ref(false),
  error: ref(null)
}

/**
 * Mock native transaction states
 */
export const mockTransactionStates = {
  nativeReceipt: ref<{ status: string } | null>(null),
  isNativeDepositLoading: ref(false),
  isNativeDepositConfirmed: ref(false)
}

/**
 * Mock native transaction functions
 */
export const mockTransactionFunctions = {
  mockSendTransaction: vi.fn(),
  mockWriteContractAsync: vi.fn(),
  mockWaitForTransactionReceipt: vi.fn()
}

/**
 * Mock native transaction composable
 */
export const mockUseSafeSendTransaction = {
  sendTransaction: mockTransactionFunctions.mockSendTransaction,
  isLoading: mockTransactionStates.isNativeDepositLoading,
  isConfirmed: mockTransactionStates.isNativeDepositConfirmed,
  receipt: mockTransactionStates.nativeReceipt
}

/**
 * Mock useBackendWake composable
 * Returns a function that does nothing - individual tests can override if needed
 */
export const mockUseBackendWake = vi.fn(() => {
  // No-op - just prevent the real implementation from being called
})

/**
 * Mock useAuth composable
 */
export const mockUseAuth = {
  logout: vi.fn(),
  login: vi.fn(),
  validateToken: vi.fn()
}

/**
 * Reset function for composable mocks
 */
export const resetComposableMocks = () => {
  // Reset contract balance loading state
  mockUseContractBalance.isLoading.value = false
  mockUseContractBalance.error.value = null

  // Reset native transaction states
  mockTransactionStates.isNativeDepositLoading.value = false
  mockTransactionStates.isNativeDepositConfirmed.value = false
  mockTransactionStates.nativeReceipt.value = null

  // Clear all native transaction function mocks
  Object.values(mockTransactionFunctions).forEach(mock => {
    if (vi.isMockFunction(mock)) {
      mock.mockClear()
    }
  })

  // Set default mock return values for transactions
  mockTransactionFunctions.mockSendTransaction.mockResolvedValue({ hash: '0xnativetx' })
  mockTransactionFunctions.mockWriteContractAsync.mockResolvedValue('0xtransfertx')
  mockTransactionFunctions.mockWaitForTransactionReceipt.mockResolvedValue({ status: 'success' })

  // Reset auth mock functions
  if (vi.isMockFunction(mockUseAuth.logout)) {
    mockUseAuth.logout.mockClear()
  }
  if (vi.isMockFunction(mockUseAuth.login)) {
    mockUseAuth.login.mockClear()
  }
  if (vi.isMockFunction(mockUseAuth.validateToken)) {
    mockUseAuth.validateToken.mockClear()
  }

  // Reset backend wake mock
  if (vi.isMockFunction(mockUseBackendWake)) {
    mockUseBackendWake.mockClear()
  }
}

// Keep for backwards compatibility
export const resetTransactionMocks = resetComposableMocks