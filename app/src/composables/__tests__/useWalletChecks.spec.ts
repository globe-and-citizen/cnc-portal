import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useWalletChecks } from '@/composables'
import { setActivePinia, createPinia } from 'pinia'
import { ref } from 'vue'
import { flushPromises } from '@vue/test-utils'
import * as utils from '@/utils'
import { NETWORK } from '@/constant'
import { mockToastStore } from '@/tests/mocks/store.mock'

const mocks = vi.hoisted(() => ({
  mockUseToastStore: {
    addErrorToast: vi.fn()
  },
  mockUseChainId: vi.fn(() => ref(123)),
  mockInjected: vi.fn(() => 'connector')
}))
const mockUseAccount = {
  address: ref('0xUserAddress'),
  isConnected: ref(true)
}

const mockUseConnect = {
  error: ref<Error | null>(null),
  isPending: ref(true),
  mutate: vi.fn()
}

const mockUseSwitchChain = {
  mutate: vi.fn(),
  error: ref<Error | null>(null)
}

vi.mock('@wagmi/vue', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    useAccount: vi.fn(() => mockUseAccount),
    useConnect: vi.fn(() => mockUseConnect),
    useConnection: vi.fn(() => ({
      address: mockUseAccount.address,
      chainId: ref(123),
      isConnected: mockUseAccount.isConnected
    })),
    useSwitchChain: vi.fn(() => mockUseSwitchChain),
    useChainId: mocks.mockUseChainId,
    injected: mocks.mockInjected
  }
})

describe('useWalletChecks', () => {
  const logErrorSpy = vi.spyOn(utils.log, 'error')
  beforeEach(() => {
    setActivePinia(createPinia())
  })
  afterEach(() => {
    vi.clearAllMocks()
  })
  it('should return the correct data', async () => {
    const { isProcessing, performChecks, isSuccess } = useWalletChecks()
    await performChecks()
    await flushPromises()
    expect(isProcessing.value).toBe(true)
    expect(isSuccess.value).toBe(true)
  })
  it('should give an error if an error connecting', async () => {
    mockUseAccount.isConnected.value = false
    mockUseConnect.mutate.mockImplementation(
      () => (mockUseConnect.error.value = new Error('Wallet not installed'))
    )
    const { isProcessing, performChecks, isSuccess } = useWalletChecks()
    await performChecks()
    await flushPromises()
    expect(/*mocks.mockUseToastStore*/ mockToastStore.addErrorToast).toBeCalledWith(
      'Something went wrong: Failed to connect wallet'
    )
    expect(isProcessing.value).toBe(false)
    expect(isSuccess.value).toBe(false)
    mockUseConnect.mutate.mockReset()
  })
  it('should connect wallet if not connected', async () => {
    mockUseSwitchChain.mutate.mockImplementation(() => (mockUseAccount.isConnected.value = true))
    const { isProcessing, performChecks } = useWalletChecks()
    await performChecks()
    await flushPromises()
    expect(mockUseConnect.mutate).toBeCalledWith({
      connector: 'connector',
      chainId: parseInt(NETWORK.chainId)
    })
    expect(isProcessing.value).toBe(true)
    expect(isProcessing.value).toBe(true)
    mockUseAccount.isConnected.value = true
  })
  it('should switch networks if user on different network', async () => {
    const { isProcessing, performChecks, isSuccess } = useWalletChecks()
    await performChecks()
    expect(mockUseSwitchChain.mutate).toBeCalledWith({
      chainId: parseInt(NETWORK.chainId)
    })
    expect(isProcessing.value).toBe(true)
    expect(isSuccess.value).toBe(true)
  })
  it('should notify error if error switching network', async () => {
    const error = new Error('Error switching network')
    error.name = 'UserRejectedRequestError'
    mockUseSwitchChain.mutate.mockImplementation(() => {
      mockUseSwitchChain.error.value = error
      mockUseAccount.isConnected.value = false
    })
    const { isProcessing, performChecks, isSuccess } = useWalletChecks()
    await performChecks()
    await flushPromises()
    expect(/*mocks.mockUseToastStore*/ mockToastStore.addErrorToast).toBeCalledWith(
      'Network switch rejected: You need to switch to the correct network to use the CNC Portal'
    )
    expect(logErrorSpy).toBeCalledWith('switchChainError.value', error)
    expect(isProcessing.value).toBe(false)
    expect(isSuccess.value).toBe(false)
    mockUseSwitchChain.error.value = null
    error.name = 'CustomError'
    mockUseSwitchChain.mutate.mockReset()
    mockUseSwitchChain.mutate.mockImplementation(() => (mockUseSwitchChain.error.value = error))
    await performChecks()
    await flushPromises()
    expect(/*mocks.mockUseToastStore*/ mockToastStore.addErrorToast).toBeCalledWith(
      'Network switch rejected: You need to switch to the correct network to use the CNC Portal'
    )
    expect(logErrorSpy).toBeCalledWith('switchChainError.value', error)
    expect(isProcessing.value).toBe(false)
    expect(isSuccess.value).toBe(false)
  })
  it('should notify error if error connecting wallet', async () => {
    let error = new Error('Error connecting wallet')
    error.name = 'UserRejectedRequestError'
    mockUseConnect.mutate.mockImplementation(() => {
      mockUseConnect.error.value = error
      mockUseAccount.isConnected.value = false
    })
    const { isProcessing, performChecks, isSuccess } = useWalletChecks()
    await performChecks()
    await flushPromises()
    expect(mockToastStore.addErrorToast).toBeCalledWith(
      'Wallet connection rejected: You need to connect your wallet to use the CNC Portal.'
    )
    expect(logErrorSpy).toBeCalledWith('connectError.value', error)
    expect(isProcessing.value).toBe(false)
    expect(isSuccess.value).toBe(false)

    //reset values
    mockUseConnect.error.value = null
    mocks.mockUseToastStore.addErrorToast.mockClear()
    error = new Error('A new error has occurred')
    error.name = 'ProviderNotFoundError'
    mockUseConnect.mutate.mockReset()

    mockUseConnect.mutate.mockImplementation(() => (mockUseConnect.error.value = error))
    await performChecks()
    await flushPromises()

    expect(/*mocks.mockUseToastStore*/ mockToastStore.addErrorToast).toBeCalledWith(
      'No wallet detected: You need to install a wallet like metamask to use the CNC Portal'
    )
    expect(logErrorSpy).toBeCalledWith('connectError.value', error)
    expect(isProcessing.value).toBe(false)
    expect(isSuccess.value).toBe(false)
  })
  it('should set return false if network invalid', async () => {
    mockUseConnect.mutate.mockImplementation(() => {
      mockUseAccount.isConnected.value = false
      mockUseConnect.isPending.value = false
    })
    const { isProcessing, performChecks, isSuccess } = useWalletChecks()
    await performChecks()
    await flushPromises()

    expect(isProcessing.value).toBe(false)
    expect(isSuccess.value).toBe(false)
  })
})
