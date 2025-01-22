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
  mockUseChainId: vi.fn(() => ref(123))
}))
const mockUseAccount = {
  address: ref('0xUserAddress'),
  isConnected: ref(true)
}

const mockUseConnect = {
  connect: vi.fn(),
  connectors: [] as { name: string; getChainId: () => number | Error }[],
  error: ref(null)
}

const mockUseSwitchChain = {
  switchChain: vi.fn()
}

vi.mock('@wagmi/vue', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    useAccount: vi.fn(() => mockUseAccount),
    useConnect: vi.fn(() => mockUseConnect),
    useSwitchChain: vi.fn(() => mockUseSwitchChain),
    useChainId: mocks.mockUseChainId
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
    mockUseConnect.connectors = [{ name: 'MetaMask', getChainId: vi.fn(() => 31137) }]
  })
  afterEach(() => {
    vi.clearAllMocks()
  })
  it('should return the correct data', async () => {
    const { isProcessing, performChecks } = useWalletChecks()
    const checksResult = await performChecks()
    await flushPromises()
    expect(isProcessing.value).toBe(true)
    expect(checksResult).toBe(true)
  })
  it('should give an error when MetaMask is not installed', async () => {
    mockUseConnect.connectors = []
    const { isProcessing, performChecks } = useWalletChecks()
    const checksResult = await performChecks()
    expect(mocks.mockUseToastStore.addErrorToast).toBeCalledWith(
      'MetaMask is not installed. Please install MetaMask to continue.'
    )
    expect(isProcessing.value).toBe(false)
    expect(checksResult).toBe(false)
  })
  it('should connect wallet if not connected', async () => {
    mockUseAccount.isConnected.value = false
    const { isProcessing, performChecks } = useWalletChecks()
    const checksResult = await performChecks()
    expect(mockUseConnect.connect).toBeCalledWith({
      connector: mockUseConnect.connectors[0],
      chainId: parseInt(NETWORK.chainId)
    })
    expect(isProcessing.value).toBe(true)
    expect(checksResult).toBe(true)
    mockUseAccount.isConnected.value = true
  })
  it('should switch networks if user on different network', async () => {
    const { isProcessing, performChecks } = useWalletChecks()
    const checksResult = await performChecks()
    expect(mockUseSwitchChain.switchChain).toBeCalledWith({
      connector: mockUseConnect.connectors[0],
      chainId: parseInt(NETWORK.chainId)
    })
    expect(isProcessing.value).toBe(true)
    expect(checksResult).toBe(true)
  })
  it('should notify error if error posting validating wallet and network', async () => {
    mockUseConnect.connectors = [
      {
        name: 'MetaMask',
        getChainId: vi.fn().mockRejectedValue(new Error('Error getting Chain ID'))
      }
    ]
    const { isProcessing, performChecks } = useWalletChecks()
    const checksResult = await performChecks()
    await flushPromises()
    expect(mocks.mockUseToastStore.addErrorToast).toBeCalledWith(
      'Failed to validate wallet and network.'
    )
    expect(logErrorSpy).toBeCalledWith('performChecks.catch', 'Error getting Chain ID')
    expect(isProcessing.value).toBe(false)
    expect(checksResult).toBe(false)
  })
})
