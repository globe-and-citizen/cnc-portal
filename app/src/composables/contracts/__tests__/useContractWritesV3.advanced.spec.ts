import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { type Abi, type Address } from 'viem'
import { simulateContract, writeContract, waitForTransactionReceipt } from '@wagmi/core'
import { ABI, ADDRESS, HASH, okSimulation, successReceipt } from './useContractWritesV3.test-utils'

// Same harness as the main V3 spec — duplicated here because vi.hoisted/vi.mock
// must run at module top and cannot be shared from a regular helper file.
const { mockInvalidateQueries, mockUseMutation, mockUseQueryClient } = vi.hoisted(() => {
  const mockInvalidateQueries = vi.fn().mockResolvedValue(undefined)
  const mockUseQueryClient = vi.fn(() => ({ invalidateQueries: mockInvalidateQueries }))

  type MutationOptions<TData, TVariables> = {
    mutationFn: (vars: TVariables) => Promise<TData>
    onSuccess?: (data: TData, vars: TVariables, ctx: unknown) => unknown
    onError?: (err: unknown, vars: TVariables, ctx: unknown) => unknown
  }

  const mockUseMutation = vi.fn(<TData, TVariables>(options: MutationOptions<TData, TVariables>) => {
    return {
      mutate: vi.fn(),
      mutateAsync: async (variables: TVariables) => {
        try {
          const data = await options.mutationFn(variables)
          if (options.onSuccess) await options.onSuccess(data, variables, undefined)
          return data
        } catch (err) {
          if (options.onError) await options.onError(err, variables, undefined)
          throw err
        }
      },
      isPending: ref(false),
      isSuccess: ref(false),
      isError: ref(false),
      error: ref(null),
      data: ref(null),
      reset: vi.fn()
    }
  })

  return { mockInvalidateQueries, mockUseMutation, mockUseQueryClient }
})

vi.mock('@tanstack/vue-query', async (importOriginal) => {
  const actual = (await importOriginal()) as object
  return {
    ...actual,
    useMutation: mockUseMutation,
    useQueryClient: mockUseQueryClient
  }
})

import { useContractWritesV3, type ContractWriteV3Config } from '../useContractWritesV3'

beforeEach(() => {
  vi.clearAllMocks()
  mockInvalidateQueries.mockResolvedValue(undefined)
})

const baseConfig = (
  overrides: Partial<ContractWriteV3Config> = {}
): ContractWriteV3Config => ({
  contractAddress: ADDRESS,
  abi: ABI as unknown as Abi,
  functionName: 'foo',
  ...overrides
})

describe('useContractWritesV3 — onSuccess invalidation predicate', () => {
  type Predicate = (q: { queryKey: unknown[] }) => boolean

  const stubSuccessfulWrite = () => {
    vi.mocked(simulateContract).mockResolvedValueOnce(okSimulation)
    vi.mocked(writeContract).mockResolvedValueOnce(HASH)
    vi.mocked(waitForTransactionReceipt).mockResolvedValueOnce(successReceipt())
  }

  const captureInvalidationPredicate = async (
    cfg: ContractWriteV3Config
  ): Promise<Predicate> => {
    stubSuccessfulWrite()
    const m = useContractWritesV3(cfg)
    await m.mutateAsync({})
    const call = mockInvalidateQueries.mock.calls[0]
    expect(call, 'invalidateQueries was not called').toBeDefined()
    const arg = call![0] as { predicate: Predicate }
    expect(typeof arg.predicate).toBe('function')
    return arg.predicate
  }

  it('matches readContract queries with the same address', async () => {
    const predicate = await captureInvalidationPredicate(baseConfig({ chainId: 1 }))
    expect(predicate({ queryKey: ['readContract', { address: ADDRESS, chainId: 1 }] })).toBe(true)
  })

  it('ignores queries that do not start with "readContract"', async () => {
    const predicate = await captureInvalidationPredicate(baseConfig())
    expect(
      predicate({ queryKey: ['simulateContract', { address: ADDRESS, chainId: 1 }] })
    ).toBe(false)
    expect(predicate({ queryKey: ['readContract'] })).toBe(false)
  })

  it('matches addresses regardless of case (checksum drift)', async () => {
    const predicate = await captureInvalidationPredicate(
      baseConfig({ contractAddress: ADDRESS.toUpperCase() as Address })
    )
    expect(
      predicate({ queryKey: ['readContract', { address: ADDRESS.toLowerCase(), chainId: 1 }] })
    ).toBe(true)
  })

  it('only invalidates the pinned chainId when one is configured', async () => {
    const predicate = await captureInvalidationPredicate(baseConfig({ chainId: 31337 }))
    expect(
      predicate({ queryKey: ['readContract', { address: ADDRESS, chainId: 31337 }] })
    ).toBe(true)
    expect(predicate({ queryKey: ['readContract', { address: ADDRESS, chainId: 1 }] })).toBe(false)
  })

  it('matches across all chains when chainId is omitted (documented cross-chain behaviour)', async () => {
    const predicate = await captureInvalidationPredicate(baseConfig())
    expect(predicate({ queryKey: ['readContract', { address: ADDRESS, chainId: 1 }] })).toBe(true)
    expect(predicate({ queryKey: ['readContract', { address: ADDRESS, chainId: 31337 }] })).toBe(
      true
    )
  })

  it('rejects malformed query keys defensively', async () => {
    const predicate = await captureInvalidationPredicate(baseConfig())
    expect(predicate({ queryKey: 'not-an-array' as unknown as unknown[] })).toBe(false)
    expect(predicate({ queryKey: ['readContract', null as unknown as object] })).toBe(false)
    expect(
      predicate({ queryKey: ['readContract', { address: 12345 as unknown as string }] })
    ).toBe(false)
  })

  it('skips invalidation entirely when the reactive address goes undefined between write and onSuccess', async () => {
    // Defensive guard scenario: mutationFn captures address at call-time so the
    // tx fires fine, but the reactive ref flips to undefined before onSuccess
    // runs — e.g. the user navigated to another team mid-flight.
    const address = ref<Address | undefined>(ADDRESS)
    vi.mocked(simulateContract).mockResolvedValueOnce(okSimulation)
    vi.mocked(writeContract).mockImplementationOnce(async () => {
      address.value = undefined
      return HASH
    })
    vi.mocked(waitForTransactionReceipt).mockResolvedValueOnce(successReceipt())

    const m = useContractWritesV3(baseConfig({ contractAddress: address }))
    await m.mutateAsync({})

    expect(mockInvalidateQueries).not.toHaveBeenCalled()
  })
})
