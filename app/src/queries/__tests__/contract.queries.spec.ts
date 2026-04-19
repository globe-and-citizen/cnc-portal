import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useMutationFn, smartUseMutation, useQueryClientFn } from '@/tests/mocks/composables.mock'
import apiClient from '@/lib/axios'

// The global composables.setup replaces '@/queries/contract.queries' (and its
// team.queries dep for invalidateKeys) — undo both so we test the real wiring.
vi.unmock('@/queries/contract.queries')
vi.unmock('@/queries/team.queries')

// Stub axios so mutationFn doesn't hit the network.
vi.mock('@/lib/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn()
  }
}))

describe('contract.queries', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    useMutationFn.mockImplementation(smartUseMutation)
    useQueryClientFn.mockReturnValue({
      invalidateQueries: vi.fn().mockResolvedValue(undefined),
      getQueryData: vi.fn(),
      setQueryData: vi.fn(),
      removeQueries: vi.fn()
    })
  })

  it('exports contractKeys.all', async () => {
    const { contractKeys } = await vi.importActual<typeof import('../contract.queries')>(
      '../contract.queries'
    )
    expect(contractKeys.all).toEqual(['contracts'])
  })

  it('useCreateContractMutation POSTs to /contract', async () => {
    const mod = await vi.importActual<typeof import('../contract.queries')>('../contract.queries')
    vi.mocked(apiClient.post).mockResolvedValue({ data: { id: 1 } })

    const mutation = mod.useCreateContractMutation()
    await mutation.mutateAsync({
      body: {
        teamId: '1',
        contractAddress: '0xC0FFEE',
        contractType: 'Voting',
        deployer: '0xdeadbeef'
      }
    })

    expect(apiClient.post).toHaveBeenCalledWith(
      'contract',
      expect.objectContaining({ contractAddress: '0xC0FFEE', contractType: 'Voting' }),
      undefined
    )
  })

  it('useSyncContractsMutation PUTs /contract/sync with { teamId }', async () => {
    const mod = await vi.importActual<typeof import('../contract.queries')>('../contract.queries')
    vi.mocked(apiClient.put).mockResolvedValue({ data: undefined })

    const mutation = mod.useSyncContractsMutation()
    await mutation.mutateAsync({ body: { teamId: '42' } })

    expect(apiClient.put).toHaveBeenCalledWith('contract/sync', { teamId: '42' }, undefined)
  })

  it('useCreateOfficerMutation POSTs to /contract/officer and returns the response data', async () => {
    const mod = await vi.importActual<typeof import('../contract.queries')>('../contract.queries')
    const payload = {
      officer: { id: 9, address: '0xNEW' },
      previousOfficer: null,
      contractsCreated: 2
    }
    vi.mocked(apiClient.post).mockResolvedValue({ data: payload })

    const mutation = mod.useCreateOfficerMutation()
    const res = await mutation.mutateAsync({
      body: {
        teamId: 1,
        address: '0xNEW',
        deployBlockNumber: 42,
        deployedAt: '2026-04-14T10:00:00Z'
      }
    })

    expect(apiClient.post).toHaveBeenCalledWith(
      'contract/officer',
      expect.objectContaining({
        teamId: 1,
        address: '0xNEW',
        deployBlockNumber: 42,
        deployedAt: '2026-04-14T10:00:00Z'
      }),
      undefined
    )
    expect(res).toEqual(payload)
  })

  it('propagates API errors from the mutation', async () => {
    const mod = await vi.importActual<typeof import('../contract.queries')>('../contract.queries')
    const err = Object.assign(new Error('conflict'), { isAxiosError: true, response: { status: 409 } })
    vi.mocked(apiClient.post).mockRejectedValue(err)

    const mutation = mod.useCreateOfficerMutation()
    await expect(
      mutation.mutateAsync({ body: { teamId: 1, address: '0xdup' } })
    ).rejects.toBe(err)
  })
})
