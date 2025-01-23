import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useSiwe } from '@/composables/useSiwe'
import { setActivePinia, createPinia } from 'pinia'
import { ref, type Ref } from 'vue'
import { flushPromises } from '@vue/test-utils'
import * as utils from '@/utils'

const mocks = vi.hoisted(() => ({
  mockSlSiweMessageCreator: {
    constructor: vi.fn(),
    create: vi.fn()
  },
  mockUserDataStore: {
    setUserData: vi.fn(),
    setAuthStatus: vi.fn()
  },
  mockHasInstalledWallet: vi.fn(),
  mockUseToastStore: {
    addErrorToast: vi.fn()
  },
  mockUseChainId: vi.fn(() => ref(123)),
  mockSiwe: {
    mockSiweMessage: vi.fn(),
    mockConstructor: vi.fn(),
    mockPrepareMessage: vi.fn(() => 'Siwe message')
  }
}))
const mockUseAccount = {
  address: ref('0xUserAddress'),
  isConnected: ref(true)
}

const mockUseSignMessage = {
  data: ref<string | undefined>(undefined),
  error: ref<null | Error>(null),
  signMessage: vi.fn()
}

const mockUseConnect = {
  connect: vi.fn(),
  connectors: [] as unknown,
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
    useSignMessage: vi.fn(() => mockUseSignMessage),
    useConnect: vi.fn(() => mockUseConnect),
    useSwitchChain: vi.fn(() => mockUseSwitchChain),
    useChainId: mocks.mockUseChainId
  }
})

vi.mock('siwe', async (importOriginal) => {
  const actual: object = await importOriginal()
  const SiweMessage = mocks.mockSiwe.mockSiweMessage
  SiweMessage.prototype.constructor = mocks.mockSiwe.mockConstructor
  SiweMessage.prototype.prepareMessage = mocks.mockSiwe.mockPrepareMessage
  return {
    ...actual,
    SiweMessage
  }
})

vi.mock('@/stores/user', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    useUserDataStore: vi.fn(() => ({
      setUserData: mocks.mockUserDataStore.setUserData,
      setAuthStatus: mocks.mockUserDataStore.setAuthStatus
    })),
    useToastStore: vi.fn(() => ({ addErrorToast: mocks.mockUseToastStore.addErrorToast }))
  }
})

vi.mock('@/adapters/siweMessageCreatorAdapter', async (importOriginal) => {
  const actual: object = await importOriginal()

  const SLSiweMessageCreator = mocks.mockSlSiweMessageCreator.constructor
  SLSiweMessageCreator.prototype.constructor = mocks.mockSlSiweMessageCreator.constructor
  SLSiweMessageCreator.prototype.create = mocks.mockSlSiweMessageCreator.create
  return { ...actual, SLSiweMessageCreator }
})

vi.mock('@/utils/web3Util', async (importOriginal) => {
  const actual: object = await importOriginal()

  const MetaMaskUtil = vi.fn()
  //@ts-expect-error: mock test function
  MetaMaskUtil['hasInstalledWallet'] = mocks.mockHasInstalledWallet

  return { ...actual, MetaMaskUtil }
})

const mockUseWalletChecks = {
  isProcessing: ref(false),
  performChecks: vi.fn()
}

vi.mock('@/composables', () => {
  return {
    useWalletChecks: vi.fn(() => mockUseWalletChecks)
  }
})

const mockCustomFetch = {
  post: {
    error: ref<null | Error>(null),
    execute: vi.fn()
  },
  get: {
    url: '',
    data: ref<unknown>(null),
    execute: vi.fn(),
    error: ref<null | Error>(null)
  }
}

vi.mock('@/composables/useCustomFetch', () => ({
  useCustomFetch: vi.fn((url: Ref<string>) => {
    const data = ref<unknown>(null)
    mockCustomFetch.get.url = url.value
    return {
      json: () => ({
        data,
        execute: vi.fn(),
        error: ref(null)
      }),
      put: () => ({
        json: () => ({
          execute: vi.fn()
        })
      }),
      get: () => ({
        json: () => ({
          data: mockCustomFetch.get.data,
          execute: mockCustomFetch.get.execute,
          error: mockCustomFetch.get.error
        })
      }),
      post: () => ({
        json: () => ({
          data: ref({ accessToken: 'token' }),
          execute: mockCustomFetch.post.execute,
          error: mockCustomFetch.post.error
        })
      })
    }
  })
}))

describe('useSiwe', () => {
  const logErrorSpy = vi.spyOn(utils.log, 'error')
  const logInfoSpy = vi.spyOn(utils.log, 'info')
  beforeEach(() => {
    setActivePinia(createPinia())
    mockUseConnect.connectors = [{ name: 'MetaMask', getChainId: () => 31137 }]
    mockUseWalletChecks.performChecks.mockImplementation(() => true)
  })
  afterEach(() => {
    vi.clearAllMocks()
    mockUseSignMessage.data.value = undefined
  })
  it('should return the correct data', async () => {
    mocks.mockSlSiweMessageCreator.create.mockImplementation(() => 'Siwe message')
    mockUseSignMessage.signMessage.mockImplementation(
      () => (mockUseSignMessage.data.value = '0xSignature')
    )
    mocks.mockHasInstalledWallet.mockImplementation(() => true)
    mockCustomFetch.get.execute.mockImplementation(
      () =>
        (mockCustomFetch.get.data.value = {
          name: 'User Name',
          address: '0xUserAddress',
          nonce: 'xyz' //'41vj7bz5Ow8oT5xaE'
        })
    )
    const { siwe } = useSiwe()
    await siwe()
    expect(mocks.mockSiwe.mockPrepareMessage).toBeCalled()
    expect(mocks.mockSiwe.mockSiweMessage).toBeCalledWith({
      address: '0xUserAddress',
      statement: 'Sign in with Ethereum to the app.',
      nonce: 'xyz',
      version: '1',
      chainId: 123,
      domain: 'localhost:3000',
      uri: 'http://localhost:3000'
    })
    expect(mockUseSignMessage.signMessage).toBeCalledWith({ message: 'Siwe message' })
    await flushPromises()
    expect(mocks.mockUserDataStore.setUserData).toBeCalledWith('User Name', '0xUserAddress', 'xyz')
    expect(mocks.mockUserDataStore.setAuthStatus).toBeCalledWith(true)
  })
  it('should report an error if error processing', async () => {
    mockCustomFetch.get.execute.mockRejectedValue(new Error('Error fetching something...'))
    const { siwe } = useSiwe()
    await siwe()
    expect(mocks.mockUseToastStore.addErrorToast).toBeCalledWith(`Couldn't authenticate with SIWE`)
    expect(logErrorSpy).toBeCalledWith('Error fetching something...')
    mockCustomFetch.get.execute.mockReset()
  })
  it('should display error when signature error', async () => {
    mockUseSignMessage.signMessage.mockImplementation(
      () => (mockUseSignMessage.error.value = new Error('Sign message error'))
    )
    const { isProcessing, siwe } = useSiwe()
    await siwe()
    expect(mocks.mockUseToastStore.addErrorToast).toBeCalledWith('Unable to sign SIWE message')
    expect(isProcessing.value).toBe(false)
    expect(logErrorSpy).toBeCalledWith('signMessageError.value', new Error('Sign message error'))
    mockUseSignMessage.error.value = null
  })
  it('should notify error if error posting siwe data', async () => {
    mockUseSignMessage.signMessage.mockReset()
    mockUseSignMessage.signMessage.mockImplementation(
      () => (mockUseSignMessage.data.value = '0xSignature')
    )

    mockCustomFetch.post.execute.mockImplementation(() => {
      mockCustomFetch.post.error.value = new Error('Error posting auth data')
    })
    const { isProcessing, siwe } = useSiwe()
    await siwe()
    await flushPromises()
    expect(mockCustomFetch.post.execute).toBeCalled()
    expect(mocks.mockUseToastStore.addErrorToast).toBeCalledWith('Unable to authenticate with SIWE')
    expect(isProcessing.value).toBe(false)
    expect(logInfoSpy).toBeCalledWith('siweError.value', new Error('Error posting auth data'))
  })
  it('should notify error if fetch nonce error', async () => {
    mockCustomFetch.get.execute.mockReset()
    mockCustomFetch.get.data.value = null
    mockCustomFetch.get.execute.mockImplementation(() => {
      mockCustomFetch.get.error.value = new Error('Error getting data')
    })
    const { isProcessing, siwe } = useSiwe()
    await siwe()
    await flushPromises()
    expect(logInfoSpy).toBeCalledWith('fetchError.value', new Error('Error getting data'))
    expect(mocks.mockUseToastStore.addErrorToast).toBeCalledWith('Unable to fetch nonce')
    expect(isProcessing.value).toBe(false)
  })
  it('should update isProcessing to false if checks failed', async () => {
    mockUseWalletChecks.performChecks.mockReset()
    mockUseWalletChecks.performChecks.mockImplementation(() => false)
    const { isProcessing, siwe } = useSiwe()
    await siwe()
    await flushPromises()
    expect(isProcessing.value).toBe(false)
  })
})
