import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { flushPromises } from '@vue/test-utils'

vi.mock('@/router', () => ({
  default: { push: vi.fn() }
}))
vi.mock('@/api/user.api', () => ({
  getUserNonce: vi.fn(),
  getUser: vi.fn()
}))
vi.mock('@/api/auth.api', () => ({
  siweAuth: vi.fn()
}))

import { useSiweMutation, SiweError } from '@/composables/useSiwe'
import {
  mockUseWalletChecks,
  mockUseSignMessage,
  mockUseConnect,
  mockUseChainId,
  useMutationFn,
  smartUseMutation
} from '@/tests/mocks'
import { mockToast } from '@/tests/mocks/store.mock'
import router from '@/router'
import * as userApi from '@/api/user.api'
import * as authApi from '@/api/auth.api'

const mockRouterPush = vi.mocked(router.push)

describe('useSiweMutation', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    useMutationFn.mockImplementation(smartUseMutation)
    mockUseConnect.connectors = [{ name: 'MetaMask', getChainId: () => 31137 }]
    mockUseChainId.value = 123
    mockUseWalletChecks.performChecks.mockImplementation(
      () => (mockUseWalletChecks.isSuccess.value = true)
    )
    mockUseSignMessage.mutateAsync.mockResolvedValue('0xsignature')
    vi.mocked(userApi.getUserNonce).mockResolvedValue({ nonce: 'abcdef1234567890' })
    vi.mocked(authApi.siweAuth).mockResolvedValue({ accessToken: 'jwt.token' })
    vi.mocked(userApi.getUser).mockResolvedValue({
      address: '0x1234567890123456789012345678901234567890',
      name: 'Alice',
      nonce: 'abcdef1234567890',
      imageUrl: 'https://example.com/a.png'
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
    mockUseWalletChecks.isSuccess.value = false
  })

  it('runs the full SIWE flow and redirects on success', async () => {
    const { mutateAsync } = useSiweMutation()
    await mutateAsync()
    await flushPromises()

    expect(userApi.getUserNonce).toHaveBeenCalledWith('0x1234567890123456789012345678901234567890')
    expect(mockUseSignMessage.mutateAsync).toHaveBeenCalledWith({
      message: expect.stringContaining('Sign in with Ethereum to the app.')
    })
    expect(authApi.siweAuth).toHaveBeenCalledWith({
      message: expect.any(String),
      signature: '0xsignature'
    })
    expect(userApi.getUser).toHaveBeenCalledWith('0x1234567890123456789012345678901234567890')
    expect(mockRouterPush).toHaveBeenCalledWith('/teams')
  })

  it('throws SiweError("wallet-check") and toasts when checks fail', async () => {
    mockUseWalletChecks.performChecks.mockImplementationOnce(
      () => (mockUseWalletChecks.isSuccess.value = false)
    )
    const { mutateAsync } = useSiweMutation()
    await expect(mutateAsync()).rejects.toMatchObject({ step: 'wallet-check' })
    expect(mockToast.add).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Wallet checks failed', color: 'error' })
    )
  })

  it('throws SiweError("fetch-nonce") when nonce request fails', async () => {
    vi.mocked(userApi.getUserNonce).mockRejectedValueOnce(new Error('boom'))
    const { mutateAsync } = useSiweMutation()
    await expect(mutateAsync()).rejects.toMatchObject({ step: 'fetch-nonce' })
    expect(mockToast.add).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Failed to fetch nonce' })
    )
  })

  it('throws SiweError("sign-rejected") when user rejects the wallet prompt', async () => {
    const rejection = Object.assign(new Error('rejected'), {
      name: 'UserRejectedRequestError'
    })
    mockUseSignMessage.mutateAsync.mockRejectedValueOnce(rejection)
    const { mutateAsync } = useSiweMutation()
    await expect(mutateAsync()).rejects.toMatchObject({ step: 'sign-rejected' })
    expect(mockToast.add).toHaveBeenCalledWith(
      expect.objectContaining({
        title: expect.stringContaining('Message sign rejected')
      })
    )
  })

  it('throws SiweError("sign-message") on other signing errors', async () => {
    mockUseSignMessage.mutateAsync.mockRejectedValueOnce(new Error('wallet down'))
    const { mutateAsync } = useSiweMutation()
    await expect(mutateAsync()).rejects.toMatchObject({ step: 'sign-message' })
    expect(mockToast.add).toHaveBeenCalledWith(
      expect.objectContaining({ title: expect.stringContaining('Unable to sign') })
    )
  })

  it('throws SiweError("auth") when /auth/siwe fails', async () => {
    vi.mocked(authApi.siweAuth).mockRejectedValueOnce(new Error('500'))
    const { mutateAsync } = useSiweMutation()
    await expect(mutateAsync()).rejects.toMatchObject({ step: 'auth' })
    expect(mockToast.add).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Failed to get authentication token' })
    )
  })

  it('throws SiweError("fetch-user") when getUser fails after auth', async () => {
    vi.mocked(userApi.getUser).mockRejectedValueOnce(new Error('404'))
    const { mutateAsync } = useSiweMutation()
    await expect(mutateAsync()).rejects.toMatchObject({ step: 'fetch-user' })
    expect(mockToast.add).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Failed to fetch user data' })
    )
  })

  it('SiweError exposes the failing step and original cause', () => {
    const cause = new Error('underlying')
    const err = new SiweError('auth', cause)
    expect(err.step).toBe('auth')
    expect((err as { cause?: unknown }).cause).toBe(cause)
  })
})
