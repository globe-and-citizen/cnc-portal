import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useSiwe } from '@/composables/useSiwe'
import { setActivePinia, createPinia } from 'pinia'
import { flushPromises } from '@vue/test-utils'
import * as utils from '@/utils'
import {
  mockUseFetch,
  mockUseWalletChecks,
  mockUseSignMessage,
  mockUseConnect,
  mockUseChainId
} from '@/tests/mocks'

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
  mockSiwe: {
    mockSiweMessage: vi.fn(),
    mockConstructor: vi.fn(),
    mockPrepareMessage: vi.fn(() => 'Siwe message')
  }
}))

describe('useSiwe', () => {
  const logErrorSpy = vi.spyOn(utils.log, 'error')
  const logInfoSpy = vi.spyOn(utils.log, 'info')
  beforeEach(() => {
    setActivePinia(createPinia())
    mockUseConnect.connectors = [{ name: 'MetaMask', getChainId: () => 31137 }]
    mockUseChainId.value = 123
    mockUseWalletChecks.performChecks.mockImplementation(() => true)
    mockUseWalletChecks.performChecks.mockImplementation(
      () => (mockUseWalletChecks.isSuccess.value = true)
    )
  })
  afterEach(() => {
    vi.clearAllMocks()
    mockUseSignMessage.data.value = undefined
    mockUseWalletChecks.isSuccess.value = false
  })
  it.skip('should return the correct data', async () => {
    mocks.mockSlSiweMessageCreator.create.mockImplementation(() => 'Siwe message')
    mockUseSignMessage.mutateAsync.mockImplementation(
      () => (mockUseSignMessage.data.value = '0xSignature')
    )
    // mocks.mockHasInstalledWallet.mockImplementation(() => true)
    mockUseFetch.get.execute.mockImplementation(
      () =>
        (mockUseFetch.get.data.value = {
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
      domain: 'http://localhost:3000',
      uri: 'http://localhost:3000'
    })
    expect(mockUseSignMessage.mutateAsync).toBeCalledWith({ message: 'Siwe message' })
    await flushPromises()
  })
  it.skip('should display error when signature error', async () => {
    mockUseSignMessage.mutateAsync.mockImplementation(
      () => (mockUseSignMessage.error.value = new Error('Sign message error'))
    )
    const { isProcessing, siwe } = useSiwe()
    await siwe()
    await flushPromises()
    expect(isProcessing.value).toBe(false)
    expect(logErrorSpy).toBeCalledWith('signMessageError.value', new Error('Sign message error'))
    mockUseSignMessage.error.value = null
    mockUseSignMessage.mutateAsync.mockReset()
    logErrorSpy.mockClear()
    const error = new Error('A new sign error')
    error.name = 'UserRejectedRequestError'
    mockUseSignMessage.mutateAsync.mockImplementation(
      () => (mockUseSignMessage.error.value = error)
    )
    await siwe()
    await flushPromises()
    expect(isProcessing.value).toBe(false)
    expect(logErrorSpy).toBeCalledWith('signMessageError.value', error)
  })
  it.skip('should notify error if error posting siwe data', async () => {
    mockUseSignMessage.mutateAsync.mockReset()
    mockUseSignMessage.mutateAsync.mockImplementation(
      () => (mockUseSignMessage.data.value = '0xSignature')
    )

    mockUseFetch.post.execute.mockImplementation(() => {
      mockUseFetch.post.error.value = new Error('Error posting auth data')
    })
    const { isProcessing, siwe } = useSiwe()
    await siwe()
    await flushPromises()
    expect(mockUseFetch.post.execute).toBeCalled()
    expect(isProcessing.value).toBe(false)
    expect(logInfoSpy).toBeCalledWith('siweError.value', new Error('Error posting auth data'))
  })
  it.skip('should notify error if fetch nonce error', async () => {
    mockUseFetch.get.execute.mockReset()
    mockUseFetch.get.data.value = null
    mockUseFetch.get.execute.mockImplementation(() => {
      mockUseFetch.get.error.value = new Error('Error getting data')
    })
    const { isProcessing, siwe } = useSiwe()
    await siwe()
    await flushPromises()
    expect(logInfoSpy).toBeCalledWith('fetchError.value', new Error('Error getting data'))
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
  it.skip('should handle missing authentication token', async () => {
    mockUseFetch.get.execute.mockImplementation(() => {
      mockUseFetch.get.data.value = { nonce: 'xyz' }
    })
    mockUseSignMessage.mutateAsync.mockImplementation(
      () => (mockUseSignMessage.data.value = '0xSignature')
    )
    // Mock failed token fetch
    mockUseFetch.post.execute.mockImplementation(() => {
      mockUseFetch.post.data.value = { accessToken: null }
    })
    const { isProcessing, siwe } = useSiwe()
    await siwe()
    await flushPromises()
    expect(isProcessing.value).toBe(false)
  })
  it.skip('should handle missing user data', async () => {
    console.log('Mock Imple')
    mockUseFetch.get.execute.mockImplementation(() => {
      mockUseFetch.get.data.value = { nonce: 'xyz' }
    })
    mockUseSignMessage.mutateAsync.mockImplementation(
      () => (mockUseSignMessage.data.value = '0xSignature')
    )
    mockUseFetch.post.execute.mockImplementation(() => {
      mockUseFetch.post.data.value = { accessToken: 'valid-token' }
    })
    console.log('Mock Imple 2')
    mockUseFetch.get.execute
      .mockImplementationOnce(() => {
        mockUseFetch.get.data.value = { nonce: 'xyz' }
      })
      .mockImplementationOnce(() => {
        mockUseFetch.get.data.value = null
      })
    const { isProcessing, siwe } = useSiwe()
    console.log('Mock Imple 3')
    await siwe()
    await flushPromises()
    console.log("Mock Imple '")
    expect(isProcessing.value).toBe(false)
  })
})
