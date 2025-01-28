import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useWalletChecks } from '@/composables'
import { setActivePinia, createPinia } from 'pinia'
import { ref } from 'vue'
import { flushPromises } from '@vue/test-utils'
import * as utils from '@/utils'
import { NETWORK } from '@/constant'

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
  switchChainAsync: vi.fn()
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

vi.mock('@/stores/user', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    useToastStore: vi.fn(() => ({ addErrorToast: mocks.mockUseToastStore.addErrorToast }))
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
    mockUseConnect.connectAsync.mockImplementation(
      () => (mockUseConnect.error.value = new Error('Wallet not installed'))
    )
    const { isProcessing, performChecks, isSuccess } = useWalletChecks()
    await performChecks()
    await flushPromises()
    expect(mocks.mockUseToastStore.addErrorToast).toBeCalledWith('Wallet not installed')
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
  it('should notify error if error connecting or switching', async () => {
    mockUseSwitchChain.switchChainAsync.mockRejectedValue(new Error('Error switching network'))
    const { isProcessing, performChecks, isSuccess } = useWalletChecks()
    await performChecks()
    await flushPromises()
    expect(mocks.mockUseToastStore.addErrorToast).toBeCalledWith(
      'Failed to validate wallet and network.'
    )
    expect(logErrorSpy).toBeCalledWith('performChecks.catch', 'Error switching network')
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
