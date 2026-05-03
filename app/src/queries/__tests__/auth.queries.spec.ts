import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useMutationFn, smartUseMutation, useQueryClientFn } from '@/tests/mocks/composables.mock'
import apiClient from '@/lib/axios'

// The global composables.setup replaces '@/queries/auth.queries' — undo it to
// test the real wiring through the factory.
vi.unmock('@/queries/auth.queries')

vi.mock('@/lib/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn()
  }
}))

describe('auth.queries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useMutationFn.mockImplementation(smartUseMutation)
    useQueryClientFn.mockReturnValue({
      invalidateQueries: vi.fn().mockResolvedValue(undefined),
      getQueryData: vi.fn(),
      setQueryData: vi.fn(),
      removeQueries: vi.fn()
    })
  })

  it('exports authKeys.all', async () => {
    const { authKeys } = await vi.importActual<typeof import('../auth.queries')>('../auth.queries')
    expect(authKeys.all).toEqual(['auth'])
  })

  it('useSiweAuthMutation POSTs to /auth/siwe with the SIWE payload', async () => {
    const mod = await vi.importActual<typeof import('../auth.queries')>('../auth.queries')
    vi.mocked(apiClient.post).mockResolvedValue({ data: { accessToken: 'jwt.token' } })

    const mutation = mod.useSiweAuthMutation()
    const result = await mutation.mutateAsync({
      body: { message: 'siwe message', signature: '0xsig' }
    })

    expect(apiClient.post).toHaveBeenCalledWith(
      'auth/siwe',
      { message: 'siwe message', signature: '0xsig' },
      undefined
    )
    expect(result).toEqual({ accessToken: 'jwt.token' })
  })

  it('propagates API errors from useSiweAuthMutation', async () => {
    const mod = await vi.importActual<typeof import('../auth.queries')>('../auth.queries')
    const err = Object.assign(new Error('unauthorized'), {
      isAxiosError: true,
      response: { status: 401 }
    })
    vi.mocked(apiClient.post).mockRejectedValue(err)

    const mutation = mod.useSiweAuthMutation()
    await expect(mutation.mutateAsync({ body: { message: 'm', signature: 's' } })).rejects.toBe(err)
  })
})
