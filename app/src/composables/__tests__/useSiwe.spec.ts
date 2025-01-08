import { describe, it, expect, vi } from 'vitest'
import { useSiwe } from '@/composables/useSiwe'
import { setActivePinia } from 'pinia'
import { ref, type Ref } from 'vue'
// import { useUserDataStore } from '@/stores/user'
import { createTestingPinia } from '@pinia/testing'

// import { SLSiweMessageCreator } from "@/adapters/siweMessageCreatorAdapter";

const mocks = vi.hoisted(() => ({
  mockSlSiweMessageCreator: {
    constructor: vi.fn(),
    create: vi.fn()
  },
  mockUserDataStore: {
    useUserDataStore: vi.fn(() => ({
      setUserData: mocks.mockUserDataStore.setUserData,
      setAuthStatus: mocks.mockUserDataStore.setAuthStatus
    })),
    setUserData: vi.fn(),
    setAuthStatus: vi.fn()
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

// vi.mock('@/stores/user', async (importOriginal) => {
//   const actual: Object = await importOriginal()
//   return {
//     ...actual,
//     useUserDataStore: mocks.mockUserDataStore.useUserDataStore
//     // useUserDataStore: vi.fn(() => ({
//     //   setUserData: mocks.mockUserDataStore.setUserData,
//     //   setAuthStatus: mocks.mockUserDataStore.setAuthStatus
//     // }))
//   }
// })

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
  MetaMaskUtil['hasInstalledWallet'] = vi.fn(() => true)

  return { ...actual, MetaMaskUtil }
})

// const mockUseCustomFetch = {
//   executeGet: vi.fn()
// }

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
    mockUseSignMessage.signMessage.mockImplementation(
      () => (mockUseSignMessage.data.value = '0xSignature')
    )
    const pinia = createTestingPinia({
      createSpy: vi.fn
    })
    setActivePinia(pinia)
    // const userStore = useUserDataStore()
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
    // expect(userStore.setUserData).toBeCalledWith('User Name', '0xUserAddress', 'xyz')
  })
})
