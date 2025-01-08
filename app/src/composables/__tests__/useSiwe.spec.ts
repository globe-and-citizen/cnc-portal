import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useSiwe } from '@/composables/useSiwe'
import { setActivePinia, createPinia } from 'pinia'
import { ref, type Ref } from 'vue'
import { flushPromises } from '@vue/test-utils'
import * as utils from '@/utils'
import * as useCustomFetch from "@/composables/useCustomFetch";
import { afterEach } from 'node:test'

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
  }
}))
const mockUseAccount = {
  address: { value: '0xUserAddress' }
}

const mockUseSignMessage = {
  data: ref<string | undefined>(undefined),
  error: ref<null | Error>(null),
  signMessage: vi.fn()
}

vi.mock('@wagmi/vue', async (importOriginal) => {
  const actual: Object = await importOriginal()
  return {
    ...actual,
    useAccount: vi.fn(() => mockUseAccount),
    useSignMessage: vi.fn(() => mockUseSignMessage)
  }
})

vi.mock('@/stores/user', async (importOriginal) => {
  const actual: Object = await importOriginal()
  return {
    ...actual,
    // useUserDataStore: mocks.mockUserDataStore.useUserDataStore
    useUserDataStore: vi.fn(() => ({
      setUserData: mocks.mockUserDataStore.setUserData,
      setAuthStatus: mocks.mockUserDataStore.setAuthStatus
    })),
    useToastStore: vi.fn(() => ({ addErrorToast: mocks.mockUseToastStore.addErrorToast }))
  }
})

vi.mock('@/adapters/siweMessageCreatorAdapter', async (importOriginal) => {
  const actual: Object = await importOriginal()

  const SLSiweMessageCreator = mocks.mockSlSiweMessageCreator.constructor
  SLSiweMessageCreator.prototype.constructor = mocks.mockSlSiweMessageCreator.constructor
  SLSiweMessageCreator.prototype.create = mocks.mockSlSiweMessageCreator.create
  return { ...actual, SLSiweMessageCreator }
})

vi.mock('@/utils/web3Util', async (importOriginal) => {
  const actual: Object = await importOriginal()

  const MetaMaskUtil = vi.fn()
  //@ts-expect-error: mock test function
  MetaMaskUtil['hasInstalledWallet'] = mocks.mockHasInstalledWallet //vi.fn(() => true)

  return { ...actual, MetaMaskUtil }
})

// const mockUseCustomFetch = {
//   executeGet: vi.fn()
// }
const mockCustomFetchError = {
  error: ref<null | Error>(null),
  execute: vi.fn()
}

vi.mock('@/composables/useCustomFetch', () => ({
  useCustomFetch: (url: Ref<string>) => {
    const data = ref<unknown>(null)
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
          data,
          execute: vi.fn(() => {
            if (url.value === `user/nonce/0xUserAddress`) data.value = { nonce: `xyz` }
            else
              data.value = {
                name: 'User Name',
                address: '0xUserAddress',
                nonce: 'xyz'
              }
          }),
          error: ref(null)
        })
      }),
      post: () => ({
        json: () => ({
          data: ref({ accessToken: 'token' }),
          execute: mockCustomFetchError.execute,//vi.fn(),
          error: mockCustomFetchError.error//ref(null)
        })
      })
    }
  }
}))

describe('useSiwe', () => {
  const logErrorSpy = vi.spyOn(utils.log, 'error')
  beforeEach(() => {
    setActivePinia(createPinia())
  })
  afterEach(() => {
    vi.clearAllMocks()
  })
  it('should return the correct data', async () => {
    mocks.mockSlSiweMessageCreator.create.mockImplementation(() => 'Siwe message')
    mockUseSignMessage.signMessage.mockImplementation(
      () => (mockUseSignMessage.data.value = '0xSignature')
    )
    mocks.mockHasInstalledWallet.mockImplementation(() => true)

    const { siwe } = useSiwe()
    await siwe()
    expect(mocks.mockSlSiweMessageCreator.create).toBeCalled()
    expect(mocks.mockSlSiweMessageCreator.constructor).toBeCalledWith({
      address: '0xUserAddress',
      statement: 'Sign in with Ethereum to the app.',
      nonce: 'xyz',
      version: '1',
      chainId: 1
    })
    expect(mockUseSignMessage.signMessage).toBeCalledWith({ message: 'Siwe message' })
    await flushPromises()
    expect(mocks.mockUserDataStore.setUserData).toBeCalledWith('User Name', '0xUserAddress', 'xyz')
    expect(mocks.mockUserDataStore.setAuthStatus).toBeCalledWith(true)
  })
  it('should give an error when MetaMask is not installed', async () => {
    mocks.mockHasInstalledWallet.mockReset()
    mocks.mockHasInstalledWallet.mockImplementation(() => false)
    const { isProcessing, siwe } = useSiwe()
    await siwe()
    expect(mocks.mockUseToastStore.addErrorToast).toBeCalledWith(
      'MetaMask is not installed, Please install MetaMask to continue'
    )
    expect(isProcessing.value).toBe(false)
  })
  it('should report an error if error processing', async () => {
    mocks.mockHasInstalledWallet.mockReset()
    mocks.mockHasInstalledWallet.mockImplementation(() => true)
    mocks.mockSlSiweMessageCreator.create.mockReset()
    mocks.mockSlSiweMessageCreator.create.mockRejectedValue(new Error('Error creating message'))
    const { siwe } = useSiwe()
    await siwe()
    expect(mocks.mockUseToastStore.addErrorToast).toBeCalledWith(`Couldn't authenticate with SIWE`)
    expect(logErrorSpy).toBeCalledWith('Error creating message')
  })
  it('should display error when signature error', async () => {
    mocks.mockHasInstalledWallet.mockReset()
    mocks.mockSlSiweMessageCreator.create.mockReset()
    mocks.mockHasInstalledWallet.mockImplementation(() => true)
    mockUseSignMessage.signMessage.mockImplementation(
      () => (mockUseSignMessage.error.value = new Error('Sign message error'))
    )
    const { isProcessing, siwe } = useSiwe()
    await siwe()
    expect(mocks.mockUseToastStore.addErrorToast).toBeCalledWith('Unable to sign SIWE message')
    expect(isProcessing.value).toBe(false)
    expect(logErrorSpy).toBeCalledWith('signMessageError.value', new Error('Sign message error'))
  })
  it('should if notify error if error posting siwe data', async () => {
  
  })
})
