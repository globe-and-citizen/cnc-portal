import { vi } from 'vitest'
import { ref } from 'vue'

/**
 * Generic mock factory for contract read operations
 * Can be used for ERC20, ERC721, or any contract read function
 * that uses useReadContract and returns the same structure
 */
export function createContractReadMock<T>(defaultValue?: T) {
  return {
    data: ref(defaultValue),
    error: ref<Error | null>(null),
    isLoading: ref(false),
    isSuccess: ref(true),
    isError: ref(false),
    isFetched: ref(true),
    isPending: ref(false),
    refetch: vi.fn(),
    queryKey: ref([]),
    status: ref<'idle' | 'pending' | 'error' | 'success'>('success')
  }
}

/**
 * Generic mock factory for contract write operations
 * Can be used for ERC20, ERC721, or any contract write function
 * that uses useContractWrite and returns the same structure
 */
export function createContractWriteMock() {
  return {
    executeWrite: vi.fn(),
    writeResult: {
      data: ref(null),
      error: ref<Error | null>(null),
      isLoading: ref(false),
      isSuccess: ref(false),
      isError: ref(false),
      isPending: ref(false),
      status: ref<'idle' | 'pending' | 'error' | 'success'>('idle')
    },
    receiptResult: {
      data: ref(null),
      error: ref<Error | null>(null),
      isLoading: ref(false),
      isSuccess: ref(false),
      isError: ref(false),
      isPending: ref(false),
      status: ref<'idle' | 'pending' | 'error' | 'success'>('idle')
    }
  }
}

/**
 * Pre-configured mock instances for common ERC20 operations
 */
export const mockERC20Reads = {
  // String values
  name: createContractReadMock('Mock Token'),
  symbol: createContractReadMock('MTK'),

  // Number values
  decimals: createContractReadMock(18),

  // BigInt values
  totalSupply: createContractReadMock(1000000n * 10n ** 18n),
  balanceOf: createContractReadMock(1000n * 10n ** 18n),
  allowance: createContractReadMock(1000000n * 10n ** 18n)
}

export const mockERC20Writes = {
  transfer: createContractWriteMock(),
  transferFrom: createContractWriteMock(),
  approve: createContractWriteMock()
}

/**
 * Reset function for ERC20 mocks
 */
export const resetERC20Mocks = () => {
  // Reset read mocks
  Object.values(mockERC20Reads).forEach((mock) => {
    mock.error.value = null
    mock.isLoading.value = false
    mock.isSuccess.value = true
    mock.isError.value = false
    mock.isFetched.value = true
    mock.isPending.value = false
    mock.status.value = 'success'

    if (vi.isMockFunction(mock.refetch)) {
      mock.refetch.mockClear()
    }
  })

  // Reset write mocks
  Object.values(mockERC20Writes).forEach((mock) => {
    // Reset write results
    mock.writeResult.data.value = null
    mock.writeResult.error.value = null
    mock.writeResult.isLoading.value = false
    mock.writeResult.isSuccess.value = false
    mock.writeResult.isError.value = false
    mock.writeResult.isPending.value = false
    mock.writeResult.status.value = 'idle'

    // Reset receipt results
    mock.receiptResult.data.value = null
    mock.receiptResult.error.value = null
    mock.receiptResult.isLoading.value = false
    mock.receiptResult.isSuccess.value = false
    mock.receiptResult.isError.value = false
    mock.receiptResult.isPending.value = false
    mock.receiptResult.status.value = 'idle'

    // Reset execute function
    if (vi.isMockFunction(mock.executeWrite)) {
      mock.executeWrite.mockClear()
      mock.executeWrite.mockResolvedValue(undefined)
    }
  })

  // Set default values for common scenarios
  mockERC20Reads.allowance.data.value = 1000000n * 10n ** 18n // High allowance by default
  mockERC20Reads.balanceOf.data.value = 1000n * 10n ** 18n // 1000 tokens balance
}
