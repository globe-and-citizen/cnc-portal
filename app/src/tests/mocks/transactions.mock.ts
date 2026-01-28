import { vi } from 'vitest'
import { ref } from 'vue'
import { createERC20ReadMock, createERC20WriteMock } from './erc20.mock'

// Mock transaction states
export const mockTransactionStates = {
  nativeReceipt: ref<{ status: string } | null>(null),
  isNativeDepositLoading: ref(false),
  isNativeDepositConfirmed: ref(false),
  transferHash: ref<string | undefined>(undefined),
  approveHash: ref<string | undefined>(undefined)
}

// Mock transaction functions
export const mockTransactionFunctions = {
  mockSendTransaction: vi.fn(),
  mockExecuteApprove: vi.fn(),
  mockWriteContractAsync: vi.fn(),
  mockWaitForTransactionReceipt: vi.fn()
}

// Mock composable returns
export const mockUseSafeSendTransaction = {
  sendTransaction: mockTransactionFunctions.mockSendTransaction,
  isLoading: mockTransactionStates.isNativeDepositLoading,
  isConfirmed: mockTransactionStates.isNativeDepositConfirmed,
  receipt: mockTransactionStates.nativeReceipt
}

// Use generic ERC20 mock factories
export const mockUseERC20Approve = createERC20WriteMock()
export const mockUseErc20Allowance = createERC20ReadMock(1000000n)

// Reset function for tests
export const resetTransactionMocks = () => {
  // Reset transaction states
  mockTransactionStates.isNativeDepositLoading.value = false
  mockTransactionStates.isNativeDepositConfirmed.value = false
  mockTransactionStates.nativeReceipt.value = null
  mockTransactionStates.transferHash.value = undefined
  mockTransactionStates.approveHash.value = undefined

  // Clear all function mocks
  Object.values(mockTransactionFunctions).forEach(mock => {
    if (vi.isMockFunction(mock)) {
      mock.mockClear()
    }
  })

  // Reset ERC20 mocks using generic reset pattern
  mockUseErc20Allowance.data.value = 1000000n
  mockUseErc20Allowance.error.value = null
  mockUseErc20Allowance.isLoading.value = false
  mockUseErc20Allowance.isSuccess.value = true
  mockUseErc20Allowance.isError.value = false

  // Reset ERC20 approve mock
  mockUseERC20Approve.writeResult.data.value = null
  mockUseERC20Approve.writeResult.error.value = null
  mockUseERC20Approve.writeResult.isLoading.value = false
  mockUseERC20Approve.writeResult.isSuccess.value = false
  mockUseERC20Approve.receiptResult.data.value = null
  mockUseERC20Approve.receiptResult.error.value = null
  mockUseERC20Approve.receiptResult.isLoading.value = false
  mockUseERC20Approve.receiptResult.isSuccess.value = false

  if (vi.isMockFunction(mockUseERC20Approve.executeWrite)) {
    mockUseERC20Approve.executeWrite.mockClear()
    mockUseERC20Approve.executeWrite.mockResolvedValue(undefined)
  }

  // Set default mock return values
  mockTransactionFunctions.mockSendTransaction.mockResolvedValue({ hash: '0xnativetx' })
  mockTransactionFunctions.mockExecuteApprove.mockResolvedValue(undefined)
  mockTransactionFunctions.mockWriteContractAsync.mockResolvedValue('0xtransfertx')
  mockTransactionFunctions.mockWaitForTransactionReceipt.mockResolvedValue({ status: 'success' })
}