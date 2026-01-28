import { vi } from 'vitest'
import { ref } from 'vue'

// Mock native transaction states
export const mockTransactionStates = {
  nativeReceipt: ref<{ status: string } | null>(null),
  isNativeDepositLoading: ref(false),
  isNativeDepositConfirmed: ref(false)
}

// Mock native transaction functions
export const mockTransactionFunctions = {
  mockSendTransaction: vi.fn(),
  mockWriteContractAsync: vi.fn(),
  mockWaitForTransactionReceipt: vi.fn()
}

// Mock native transaction composable
export const mockUseSafeSendTransaction = {
  sendTransaction: mockTransactionFunctions.mockSendTransaction,
  isLoading: mockTransactionStates.isNativeDepositLoading,
  isConfirmed: mockTransactionStates.isNativeDepositConfirmed,
  receipt: mockTransactionStates.nativeReceipt
}

// Reset function for native transaction mocks
export const resetTransactionMocks = () => {
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

  // Set default mock return values
  mockTransactionFunctions.mockSendTransaction.mockResolvedValue({ hash: '0xnativetx' })
  mockTransactionFunctions.mockWriteContractAsync.mockResolvedValue('0xtransfertx')
  mockTransactionFunctions.mockWaitForTransactionReceipt.mockResolvedValue({ status: 'success' })
}