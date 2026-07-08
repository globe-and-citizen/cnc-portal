import { vi } from 'vitest'
import { ref } from 'vue'
import { createContractReadMock, createContractWriteV3Mock } from './erc20.mock'

export const mockSafeDepositRouterAddress = ref('0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB')

export const mockSafeDepositRouterReads = {
  paused: createContractReadMock(false),
  owner: createContractReadMock('0x742d35Cc6bF8C55C6C2e013e5492D2b6637e0886'),
  depositsEnabled: createContractReadMock(true),
  safeAddress: createContractReadMock('0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB'),
  officerAddress: createContractReadMock('0x2222222222222222222222222222222222222222'),
  multiplier: createContractReadMock(1000000n),
  minMultiplier: createContractReadMock(1000000n),
  isTokenSupported: createContractReadMock(true),
  tokenDecimals: createContractReadMock(6),
  calculateCompensation: createContractReadMock(0n)
}

export const mockSafeDepositRouterWrites = {
  enableDeposits: createContractWriteV3Mock(),
  disableDeposits: createContractWriteV3Mock(),
  pause: createContractWriteV3Mock(),
  unpause: createContractWriteV3Mock(),
  renounceOwnership: createContractWriteV3Mock(),
  transferOwnership: createContractWriteV3Mock(),
  setSafeAddress: createContractWriteV3Mock(),
  setMultiplier: createContractWriteV3Mock(),
  addTokenSupport: createContractWriteV3Mock(),
  removeTokenSupport: createContractWriteV3Mock(),
  deposit: createContractWriteV3Mock(),
  depositWithSlippage: createContractWriteV3Mock(),
  recoverERC20: createContractWriteV3Mock()
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
    mock.data.value = null
    mock.error.value = null
    mock.isPending.value = false
    mock.isSuccess.value = false
    mock.isError.value = false
    mock.status.value = 'idle'

    if (vi.isMockFunction(mock.mutate)) mock.mutate.mockClear()
    if (vi.isMockFunction(mock.mutateAsync)) {
      mock.mutateAsync.mockClear()
      mock.mutateAsync.mockResolvedValue(undefined)
    }
    if (vi.isMockFunction(mock.reset)) mock.reset.mockClear()
  })

  mockSafeDepositRouterAddress.value = '0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB'
  mockSafeDepositRouterReads.depositsEnabled.data.value = true
  mockSafeDepositRouterReads.paused.data.value = false
  mockSafeDepositRouterReads.multiplier.data.value = 1000000n
}
