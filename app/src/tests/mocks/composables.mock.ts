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
  dividends: ref([]),
  isLoading: ref(false),
  error: ref(null)
}

/**
 * Mock Apollo useQuery result
 */
export const mockUseApolloQuery = {
  result: ref(null),
  error: ref<Error | null>(null),
  loading: ref(false)
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
  isLoading: ref(false),
  isConfirmed: ref(false),
  receipt: ref<{ status: string } | null>(null)
}

/**
 * Mock useSafeOwnerManagement composable
 */
export const mockUseSafeOwnerManagement = {
  isUpdating: ref(false),
  updateOwners: vi.fn()
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
 * Mock useClipboard composable from @vueuse/core
 */
export const mockUseClipboard = {
  copy: vi.fn(),
  copied: ref(false),
  isSupported: ref(true)
}

/**
 * Mock useSafeDeployment composable
 */
export const mockUseSafeDeployment = {
  deploySafe: vi.fn(),
  isDeploying: ref(false),
  error: ref<Error | null>(null)
}

/**
 * Mock useGetDividendBalances composable
 */
export const mockUseGetDividendBalances = {
  data: ref([]),
  isLoading: ref(false),
  error: ref(null)
}

/**
 * Mock useClaimDividend composable (for native token claims)
 */
export const mockUseClaimDividend = {
  claimWrite: vi.fn(),
  isLoading: ref(false),
  error: ref(null)
}

/**
 * Mock useClaimTokenDividend composable (for token claims)
 */
export const mockUseClaimTokenDividend = {
  tokenClaimWrite: vi.fn(),
  isLoading: ref(false),
  error: ref(null)
}

/**
 * Mock useDepositDividends composable
 */
export const mockUseDepositDividends = {
  depositWrite: vi.fn(),
  isLoading: ref(false),
  error: ref(null)
}

/**
 * Mock useDepositTokenDividends composable
 */
export const mockUseDepositTokenDividends = {
  tokenDepositWrite: vi.fn(),
  isLoading: ref(false),
  error: ref(null)
}

/**
 * Mock useBodAddAction composable
 */
export const mockUseBodAddAction = {
  addActionWrite: vi.fn(),
  isLoading: ref(false),
  error: ref(null)
}

/**
 * Mock useBodIsBodAction composable
 */
export const mockUseBodIsBodAction = {
  isBod: ref(false),
  isLoading: ref(false),
  error: ref(null)
}

/**
 * Reset function for composable mocks
 */
export const resetComposableMocks = () => {
  // Reset contract balance loading state
  mockUseContractBalance.isLoading.value = false
  mockUseContractBalance.error.value = null
  mockUseContractBalance.dividends.value = []

  // Reset native transaction states
  mockUseSafeSendTransaction.isLoading.value = false
  mockUseSafeSendTransaction.isConfirmed.value = false
  mockUseSafeSendTransaction.receipt.value = null

  // Clear all native transaction function mocks
  Object.values(mockTransactionFunctions).forEach((mock) => {
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

  mockUseSafeOwnerManagement.isUpdating.value = false
  if (vi.isMockFunction(mockUseSafeOwnerManagement.updateOwners)) {
    mockUseSafeOwnerManagement.updateOwners.mockClear()
  }

  // Reset clipboard mock
  mockUseClipboard.copied.value = false
  if (vi.isMockFunction(mockUseClipboard.copy)) {
    mockUseClipboard.copy.mockClear()
  }

  // Reset Safe deployment mock
  mockUseSafeDeployment.isDeploying.value = false
  mockUseSafeDeployment.error.value = null
  if (vi.isMockFunction(mockUseSafeDeployment.deploySafe)) {
    mockUseSafeDeployment.deploySafe.mockClear()
  }

  // Reset dividend-related composables
  mockUseGetDividendBalances.data.value = []
  mockUseGetDividendBalances.isLoading.value = false
  mockUseGetDividendBalances.error.value = null

  mockUseClaimDividend.isLoading.value = false
  mockUseClaimDividend.error.value = null
  if (vi.isMockFunction(mockUseClaimDividend.claimWrite)) {
    mockUseClaimDividend.claimWrite.mockClear()
  }

  mockUseClaimTokenDividend.isLoading.value = false
  mockUseClaimTokenDividend.error.value = null
  if (vi.isMockFunction(mockUseClaimTokenDividend.tokenClaimWrite)) {
    mockUseClaimTokenDividend.tokenClaimWrite.mockClear()
  }

  mockUseDepositDividends.isLoading.value = false
  mockUseDepositDividends.error.value = null
  if (vi.isMockFunction(mockUseDepositDividends.depositWrite)) {
    mockUseDepositDividends.depositWrite.mockClear()
  }

  mockUseDepositTokenDividends.isLoading.value = false
  mockUseDepositTokenDividends.error.value = null
  if (vi.isMockFunction(mockUseDepositTokenDividends.tokenDepositWrite)) {
    mockUseDepositTokenDividends.tokenDepositWrite.mockClear()
  }

  mockUseBodAddAction.isLoading.value = false
  mockUseBodAddAction.error.value = null
  if (vi.isMockFunction(mockUseBodAddAction.addActionWrite)) {
    mockUseBodAddAction.addActionWrite.mockClear()
  }

  mockUseBodIsBodAction.isBod.value = false
  mockUseBodIsBodAction.isLoading.value = false
  mockUseBodIsBodAction.error.value = null

  // Reset Apollo query mock
  mockUseApolloQuery.result.value = null
  mockUseApolloQuery.error.value = null
  mockUseApolloQuery.loading.value = false
}

// Keep for backwards compatibility
export const resetTransactionMocks = resetComposableMocks
