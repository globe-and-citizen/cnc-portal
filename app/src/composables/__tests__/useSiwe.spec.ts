import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { flushPromises } from '@vue/test-utils'
import { UserRejectedRequestError, SwitchChainError } from 'viem'
import { AxiosError, AxiosHeaders } from 'axios'

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
vi.mock('@wagmi/core', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    getConnection: vi.fn(),
    connect: vi.fn(),
    switchChain: vi.fn(),
    signMessage: vi.fn()
  }
})
import {
  useSiweMutation,
  WalletConnectRejectedError,
  ChainSwitchRejectedError,
  SignatureRejectedError
} from '@/composables/useSiwe'
import { useMutationFn, smartUseMutation } from '@/tests/mocks'
import { mockToast } from '@/tests/mocks/store.mock'
import router from '@/router'
import * as userApi from '@/api/user.api'
import * as authApi from '@/api/auth.api'
import * as wagmiCore from '@wagmi/core'

const mockRouterPush = vi.mocked(router.push)
const ADDRESS = '0x1234567890123456789012345678901234567890'

const makeAxiosError = (url: string) => {
  const err = new AxiosError('boom')
  err.config = { url, headers: new AxiosHeaders() }
  return err
}

const connectedReturn = {
  address: ADDRESS,
  addresses: [ADDRESS],
  chain: undefined,
  chainId: 1,
  connector: {} as never,
  isConnected: true,
  isConnecting: false,
  isDisconnected: false,
  isReconnecting: false,
  status: 'connected'
} as unknown as ReturnType<typeof wagmiCore.getConnection>

const disconnectedReturn = {
  address: undefined,
  addresses: undefined,
  chain: undefined,
  chainId: undefined,
  connector: undefined,
  isConnected: false,
  isConnecting: false,
  isDisconnected: true,
  isReconnecting: false,
  status: 'disconnected'
} as unknown as ReturnType<typeof wagmiCore.getConnection>

describe('useSiweMutation', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    useMutationFn.mockImplementation(smartUseMutation)
    vi.mocked(wagmiCore.getConnection).mockReturnValue(connectedReturn)
    vi.mocked(wagmiCore.connect).mockResolvedValue(undefined as never)
    vi.mocked(wagmiCore.switchChain).mockResolvedValue(undefined as never)
    vi.mocked(wagmiCore.signMessage).mockResolvedValue('0xsignature')
    vi.mocked(userApi.getUserNonce).mockResolvedValue({ nonce: 'abcdef1234567890' })
    vi.mocked(authApi.siweAuth).mockResolvedValue({ accessToken: 'jwt.token' })
    vi.mocked(userApi.getUser).mockResolvedValue({
      address: ADDRESS,
      name: 'Alice',
      nonce: 'abcdef1234567890',
      imageUrl: 'https://example.com/a.png'
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('runs the full SIWE flow and redirects on success', async () => {
    const { mutateAsync } = useSiweMutation()
    await mutateAsync()
    await flushPromises()

    expect(wagmiCore.connect).not.toHaveBeenCalled() // already connected
    expect(wagmiCore.switchChain).toHaveBeenCalled()
    expect(userApi.getUserNonce).toHaveBeenCalledWith(ADDRESS)
    expect(wagmiCore.signMessage).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ message: expect.stringContaining('Sign in with Ethereum') })
    )
    expect(authApi.siweAuth).toHaveBeenCalledWith({
      message: expect.any(String),
      signature: '0xsignature'
    })
    expect(userApi.getUser).toHaveBeenCalledWith(ADDRESS)
    expect(mockRouterPush).toHaveBeenCalledWith('/teams')
  })

  it('calls connect first when the wallet is not yet connected', async () => {
    // First read sees disconnected; reads after `connect()` see connected.
    vi.mocked(wagmiCore.getConnection)
      .mockReturnValueOnce(disconnectedReturn)
      .mockReturnValue(connectedReturn)
    const { mutateAsync } = useSiweMutation()
    await mutateAsync()
    expect(wagmiCore.connect).toHaveBeenCalled()
  })

  it('throws WalletConnectRejectedError and toasts when user rejects connection', async () => {
    vi.mocked(wagmiCore.getConnection).mockReturnValue(disconnectedReturn)
    vi.mocked(wagmiCore.connect).mockRejectedValueOnce(
      new UserRejectedRequestError(new Error('rejected'))
    )
    const { mutateAsync } = useSiweMutation()
    await expect(mutateAsync()).rejects.toBeInstanceOf(WalletConnectRejectedError)
    expect(mockToast.add).toHaveBeenCalledWith(
      expect.objectContaining({ title: expect.stringContaining('Wallet connection rejected') })
    )
  })

  it('throws ChainSwitchRejectedError and toasts when user rejects chain switch', async () => {
    vi.mocked(wagmiCore.switchChain).mockRejectedValueOnce(
      new UserRejectedRequestError(new Error('rejected'))
    )
    const { mutateAsync } = useSiweMutation()
    await expect(mutateAsync()).rejects.toBeInstanceOf(ChainSwitchRejectedError)
    expect(mockToast.add).toHaveBeenCalledWith(
      expect.objectContaining({ title: expect.stringContaining('Network switch rejected') })
    )
  })

  it('toasts "Failed switch network" on a non-rejection SwitchChainError', async () => {
    vi.mocked(wagmiCore.switchChain).mockRejectedValueOnce(
      new SwitchChainError(new Error('rpc down'))
    )
    const { mutateAsync } = useSiweMutation()
    await expect(mutateAsync()).rejects.toBeInstanceOf(SwitchChainError)
    expect(mockToast.add).toHaveBeenCalledWith(
      expect.objectContaining({ title: expect.stringContaining('Failed switch network') })
    )
  })

  it('toasts "Failed to fetch nonce" when the nonce request fails', async () => {
    vi.mocked(userApi.getUserNonce).mockRejectedValue(makeAxiosError('/api/user/nonce'))
    const { mutateAsync } = useSiweMutation()
    await expect(mutateAsync()).rejects.toBeInstanceOf(AxiosError)
    expect(mockToast.add).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Failed to fetch nonce' })
    )
  })

  it('throws SignatureRejectedError when user rejects the wallet signature prompt', async () => {
    vi.mocked(wagmiCore.signMessage).mockRejectedValueOnce(
      new UserRejectedRequestError(new Error('rejected'))
    )
    const { mutateAsync } = useSiweMutation()
    await expect(mutateAsync()).rejects.toBeInstanceOf(SignatureRejectedError)
    expect(mockToast.add).toHaveBeenCalledWith(
      expect.objectContaining({ title: expect.stringContaining('Message sign rejected') })
    )
  })

  it('toasts "Failed to get authentication token" when /auth/siwe fails', async () => {
    vi.mocked(authApi.siweAuth).mockRejectedValueOnce(makeAxiosError('/api/auth/siwe'))
    const { mutateAsync } = useSiweMutation()
    await expect(mutateAsync()).rejects.toBeInstanceOf(AxiosError)
    expect(mockToast.add).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Failed to get authentication token' })
    )
  })

  it('toasts "Failed to fetch user data" when getUser fails after auth', async () => {
    vi.mocked(userApi.getUser).mockRejectedValueOnce(makeAxiosError('/api/user/profile'))
    const { mutateAsync } = useSiweMutation()
    await expect(mutateAsync()).rejects.toBeInstanceOf(AxiosError)
    expect(mockToast.add).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Failed to fetch user data' })
    )
  })

  it('falls back to a generic toast on unknown errors', async () => {
    vi.mocked(userApi.getUser).mockRejectedValueOnce(new Error('mystery'))
    const { mutateAsync } = useSiweMutation()
    await expect(mutateAsync()).rejects.toThrow('mystery')
    expect(mockToast.add).toHaveBeenCalledWith(
      expect.objectContaining({ title: expect.stringContaining('Failed to sign in') })
    )
  })

  it('rejection error classes expose the original cause', () => {
    const cause = new Error('underlying')
    expect(new WalletConnectRejectedError(cause).cause).toBe(cause)
    expect(new ChainSwitchRejectedError(cause).cause).toBe(cause)
    expect(new SignatureRejectedError(cause).cause).toBe(cause)
  })
})
