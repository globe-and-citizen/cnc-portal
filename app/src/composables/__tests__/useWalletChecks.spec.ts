import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useWalletChecks } from '@/composables'
import { setActivePinia, createPinia } from 'pinia'
import { ref, type Ref } from 'vue'
import { flushPromises } from '@vue/test-utils'
import * as utils from '@/utils'
import { NETWORK } from '@/constant'
import type { number } from 'echarts/core'

const mocks = vi.hoisted(() => ({
  //   mockSlSiweMessageCreator: {
  //     constructor: vi.fn(),
  //     create: vi.fn()
  //   },
  //   mockUserDataStore: {
  //     setUserData: vi.fn(),
  //     setAuthStatus: vi.fn()
  //   },
  //   mockHasInstalledWallet: vi.fn(),
  mockUseToastStore: {
    addErrorToast: vi.fn()
  },
  mockUseChainId: vi.fn(() => ref(123))
  //   mockSiwe: {
  //     mockSiweMessage: vi.fn(),
  //     mockConstructor: vi.fn(),
  //     mockPrepareMessage: vi.fn(() => 'Siwe message')
  //   }
}))
const mockUseAccount = {
  address: ref('0xUserAddress'),
  isConnected: ref(true)
}

// const mockUseSignMessage = {
//   data: ref<string | undefined>(undefined),
//   error: ref<null | Error>(null),
//   signMessage: vi.fn()
// }

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
    // useSignMessage: vi.fn(() => mockUseSignMessage),
    useConnect: vi.fn(() => mockUseConnect),
    useSwitchChain: vi.fn(() => mockUseSwitchChain),
    useChainId: mocks.mockUseChainId
  }
})
// vi.mock('siwe', async (importOriginal) => {
//   const actual: object = await importOriginal()
//   const SiweMessage = mocks.mockSiwe.mockSiweMessage
//   SiweMessage.prototype.constructor = mocks.mockSiwe.mockConstructor
//   SiweMessage.prototype.prepareMessage = mocks.mockSiwe.mockPrepareMessage
//   return {
//     ...actual,
//     SiweMessage
//   }
// })

vi.mock('@/stores/user', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    // useUserDataStore: vi.fn(() => ({
    //   setUserData: mocks.mockUserDataStore.setUserData,
    //   setAuthStatus: mocks.mockUserDataStore.setAuthStatus
    // })),
    useToastStore: vi.fn(() => ({ addErrorToast: mocks.mockUseToastStore.addErrorToast }))
  }
})

// vi.mock('@/adapters/siweMessageCreatorAdapter', async (importOriginal) => {
//   const actual: object = await importOriginal()

//   const SLSiweMessageCreator = mocks.mockSlSiweMessageCreator.constructor
//   SLSiweMessageCreator.prototype.constructor = mocks.mockSlSiweMessageCreator.constructor
//   SLSiweMessageCreator.prototype.create = mocks.mockSlSiweMessageCreator.create
//   return { ...actual, SLSiweMessageCreator }
// })

// vi.mock('@/utils/web3Util', async (importOriginal) => {
//   const actual: object = await importOriginal()

//   const MetaMaskUtil = vi.fn()
//   //@ts-expect-error: mock test function
//   MetaMaskUtil['hasInstalledWallet'] = mocks.mockHasInstalledWallet

//   return { ...actual, MetaMaskUtil }
// })

// const mockCustomFetch = {
//   post: {
//     error: ref<null | Error>(null),
//     execute: vi.fn()
//   },
//   get: {
//     url: '',
//     data: ref<unknown>(null),
//     execute: vi.fn(),
//     error: ref<null | Error>(null)
//   }
// }

// vi.mock('@/composables/useCustomFetch', () => ({
//   useCustomFetch: vi.fn((url: Ref<string>) => {
//     const data = ref<unknown>(null)
//     mockCustomFetch.get.url = url.value
//     return {
//       json: () => ({
//         data,
//         execute: vi.fn(),
//         error: ref(null)
//       }),
//       put: () => ({
//         json: () => ({
//           execute: vi.fn()
//         })
//       }),
//       get: () => ({
//         json: () => ({
//           data: mockCustomFetch.get.data,
//           execute: mockCustomFetch.get.execute,
//           // execute: vi.fn(() => {
//           //   if (url.value === `user/nonce/0xUserAddress`) data.value = { nonce: `xyz` }
//           //   else
//           //     data.value = {
//           //       name: 'User Name',
//           //       address: '0xUserAddress',
//           //       nonce: 'xyz'
//           //     }
//           // }),
//           error: mockCustomFetch.get.error
//         })
//       }),
//       post: () => ({
//         json: () => ({
//           data: ref({ accessToken: 'token' }),
//           execute: mockCustomFetch.post.execute,
//           error: mockCustomFetch.post.error
//         })
//       })
//     }
//   })
// }))

describe('useWalletChecks', () => {
  const logErrorSpy = vi.spyOn(utils.log, 'error')
  const logInfoSpy = vi.spyOn(utils.log, 'info')
  beforeEach(() => {
    setActivePinia(createPinia())
    mockUseConnect.connectors = [{ name: 'MetaMask', getChainId: vi.fn(() => 31137) }]
  })
  afterEach(() => {
    vi.clearAllMocks()
    // mockUseSignMessage.data.value = undefined
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
    // mockUseSignMessage.signMessage.mockReset()
    // mockUseSignMessage.signMessage.mockImplementation(
    //   () => (mockUseSignMessage.data.value = '0xSignature')
    // )
    // mocks.mockSlSiweMessageCreator.create.mockImplementation(() => 'Siwe message')
    mockUseConnect.connectors = [
      {
        name: 'MetaMask',
        getChainId: vi.fn().mockRejectedValue(new Error('Error getting Chain ID'))
      }
    ]
    // mockCustomFetch.post.execute.mockImplementation(() => {
    //   mockCustomFetch.post.error.value = new Error('Error posting auth data')
    // })
    const { isProcessing, performChecks } = useWalletChecks()
    const checksResult = await performChecks()
    await flushPromises()
    // expect(mockCustomFetch.post.execute).toBeCalled()
    expect(mocks.mockUseToastStore.addErrorToast).toBeCalledWith(
      'Failed to validate wallet and network.'
    )
    expect(logErrorSpy).toBeCalledWith('performChecks.catch', 'Error getting Chain ID')
    expect(isProcessing.value).toBe(false)
    expect(checksResult).toBe(false)
  })
})
