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
  connectAsync: vi.fn(),
  error: ref<Error | null>(null),
  isPending: ref(true)
}

const mockUseSwitchChain = {
  switchChainAsync: vi.fn(),
  error: ref<Error | null>(null)
}

vi.mock('@wagmi/vue', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    useAccount: vi.fn(() => mockUseAccount),
    useConnect: vi.fn(() => mockUseConnect),
    useSwitchChain: vi.fn(() => mockUseSwitchChain),
    useChainId: mocks.mockUseChainId,
    injected: mocks.mockInjected
  }
})

// vi.mock('@/stores/user', async (importOriginal) => {
//   const actual: object = await importOriginal()
//   return {
//     ...actual,
//     useToastStore: vi.fn(() => ({ addErrorToast: mocks.mockUseToastStore.addErrorToast }))
//   }
// })

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
    mockUseConnect.connectAsync.mockImplementation(
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
    mockUseConnect.connectAsync.mockReset()
  })
  it('should connect wallet if not connected', async () => {
    mockUseSwitchChain.switchChainAsync.mockImplementation(
      () => (mockUseAccount.isConnected.value = true)
    )
    const { isProcessing, performChecks } = useWalletChecks()
    await performChecks()
    await flushPromises()
    expect(mockUseConnect.connectAsync).toBeCalledWith({
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
    expect(mockUseSwitchChain.switchChainAsync).toBeCalledWith({
      chainId: parseInt(NETWORK.chainId)
    })
    expect(isProcessing.value).toBe(true)
    expect(isSuccess.value).toBe(true)
  })
  it('should notify error if error switching network', async () => {
    const error = new Error('Error switching network')
    error.name = 'UserRejectedRequestError'
    mockUseSwitchChain.switchChainAsync.mockImplementation(() => {
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
    mockUseSwitchChain.switchChainAsync.mockReset()
    mockUseSwitchChain.switchChainAsync.mockImplementation(
      () => (mockUseSwitchChain.error.value = error)
    )
    await performChecks()
    await flushPromises()
    expect(/*mocks.mockUseToastStore*/ mockToastStore.addErrorToast).toBeCalledWith(
      'Something went wrong: Failed switch network'
    )
    expect(logErrorSpy).toBeCalledWith('switchChainError.value', error)
    expect(isProcessing.value).toBe(false)
    expect(isSuccess.value).toBe(false)
  })
  it('should notify error if error connecting wallet', async () => {
    let error = new Error('Error connecting wallet')
    error.name = 'UserRejectedRequestError'
    mockUseConnect.connectAsync.mockImplementation(() => {
      mockUseConnect.error.value = error
      mockUseAccount.isConnected.value = false
    })
    const { isProcessing, performChecks, isSuccess } = useWalletChecks()
    await performChecks()
    await flushPromises()
    expect(/*mocks.mockUseToastStore*/ mockToastStore.addErrorToast).toBeCalledWith(
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
    mockUseConnect.connectAsync.mockReset()

    mockUseConnect.connectAsync.mockImplementation(() => (mockUseConnect.error.value = error))
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
    mockUseConnect.connectAsync.mockImplementation(() => {
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
