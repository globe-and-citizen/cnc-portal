import { vi } from 'vitest'
import { ref } from 'vue'
import { createContractReadMock, createContractWriteMock } from './erc20.mock'

export const mockSafeDepositRouterAddress = ref('0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB')

export const mockSafeDepositRouterReads = {
  paused: createContractReadMock(false),
  owner: createContractReadMock('0x742d35Cc6bF8C55C6C2e013e5492D2b6637e0886'),
  depositsEnabled: createContractReadMock(true),
  safeAddress: createContractReadMock('0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB'),
  investorAddress: createContractReadMock('0x2222222222222222222222222222222222222222'),
  multiplier: createContractReadMock(1000000n),
  minMultiplier: createContractReadMock(1000000n),
  supportedTokens: createContractReadMock(true),
  tokenDecimals: createContractReadMock(6),
  calculateCompensation: createContractReadMock(0n)
}

export const mockSafeDepositRouterWrites = {
  enableDeposits: createContractWriteMock(),
  disableDeposits: createContractWriteMock(),
  pause: createContractWriteMock(),
  unpause: createContractWriteMock(),
  renounceOwnership: createContractWriteMock(),
  transferOwnership: createContractWriteMock(),
  setSafeAddress: createContractWriteMock(),
  setInvestorAddress: createContractWriteMock(),
  setMultiplier: createContractWriteMock(),
  addTokenSupport: createContractWriteMock(),
  removeTokenSupport: createContractWriteMock(),
  deposit: createContractWriteMock(),
  depositWithSlippage: createContractWriteMock(),
  recoverERC20: createContractWriteMock()
}

export const resetSafeDepositRouterMocks = () => {
  Object.values(mockSafeDepositRouterReads).forEach((mock) => {
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

  Object.values(mockSafeDepositRouterWrites).forEach((mock) => {
    mock.writeResult.data.value = null
    mock.writeResult.error.value = null
    mock.writeResult.isLoading.value = false
    mock.writeResult.isSuccess.value = false
    mock.writeResult.isError.value = false
    mock.writeResult.isPending.value = false
    mock.writeResult.status.value = 'idle'

    mock.receiptResult.data.value = null
    mock.receiptResult.error.value = null
    mock.receiptResult.isLoading.value = false
    mock.receiptResult.isSuccess.value = false
    mock.receiptResult.isError.value = false
    mock.receiptResult.isPending.value = false
    mock.receiptResult.status.value = 'idle'

    if (vi.isMockFunction(mock.executeWrite)) {
      mock.executeWrite.mockClear()
      mock.executeWrite.mockResolvedValue(undefined)
    }
  })

  mockSafeDepositRouterAddress.value = '0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB'
  mockSafeDepositRouterReads.depositsEnabled.data.value = true
  mockSafeDepositRouterReads.paused.data.value = false
  mockSafeDepositRouterReads.multiplier.data.value = 1000000n
}
