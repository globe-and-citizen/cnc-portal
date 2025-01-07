import { describe, it, expect, vi, beforeAll, afterAll, vitest } from 'vitest'
import { useSiwe } from '@/composables/useSiwe'
import { useCustomFetch } from '../useCustomFetch'
import { setActivePinia, createPinia } from 'pinia'
import { ref, type Ref } from 'vue'
// import { SLSiweMessageCreator } from "@/adapters/siweMessageCreatorAdapter";



const mocks = vi.hoisted(() => ({
  mockSlSiweMessageCreator: {
    constructor: vi.fn(),
    create: vi.fn()
  }
}))
const mockUseAccount = {
  address: { value: '0xUserAddress' }
}

const mockUseSignMessage = {
  data: ref<string | undefined>(undefined),
  error: null,
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

const mockSlSiweMessageCreator = {
  constructor: vi.fn()
}

vi.mock('@/adapters/siweMessageCreatorAdapter', async (importOriginal) => {
  const actual: Object = await importOriginal()

  const SLSiweMessageCreator = mocks.mockSlSiweMessageCreator.constructor
  SLSiweMessageCreator.prototype.constructor =  mocks.mockSlSiweMessageCreator.constructor
  SLSiweMessageCreator.prototype.create = mocks.mockSlSiweMessageCreator.create
  return { ...actual, SLSiweMessageCreator }
})

vi.mock('@/utils/web3Util', async (importOriginal) => {
  const actual: Object = await importOriginal()

  const MetaMaskUtil = vi.fn()
  //@ts-expect-error: mock test function
  MetaMaskUtil['hasInstalledWallet'] = vi.fn(() => true)

  return { ...actual, MetaMaskUtil }
})

const executeMock = vi.fn()

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
            if (url.value === `user/nonce/0xUserAddress`)
              data.value = {nonce: `xyz`}
          }),
          error: ref(null)
        })
      }),
      post: () => ({
        json: () => ({
          data: ref({ accessToken: 'token' }),
          execute: vi.fn(),
          error: ref(null)
        })
      })
    }
  }
}))

describe('useSiwe', () => {
  it('should return the correct data', async () => {
    mocks.mockSlSiweMessageCreator.create.mockImplementation(() => 'Siwe message')
    mockUseSignMessage.signMessage.mockImplementation(() => mockUseSignMessage.data.value = '0xSignature')
    setActivePinia(createPinia())
    const { isProcessing, siwe } = useSiwe()
    await siwe()
    expect(mocks.mockSlSiweMessageCreator.create).toBeCalled()
    expect(mocks.mockSlSiweMessageCreator.constructor).toBeCalledWith({
      address: '0xUserAddress',
      statement: 'Sign in with Ethereum to the app.',
      nonce: 'xyz',
      version: '1',
      chainId: 1
    })
    expect(mockUseSignMessage.signMessage).toBeCalledWith({message: 'Siwe message'})
  })
})