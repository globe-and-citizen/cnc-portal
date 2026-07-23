import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Address, Hex } from 'viem'
import { executeContractWrite } from '@/composables/contracts/useContractWritesV3'
import { claimMigration, useClaimMigrationMutation } from '../useClaimMigration'
import { useMutationFn, smartUseMutation } from '@/tests/mocks/composables.mock'

vi.mock('@/composables/contracts/useContractWritesV3', async (importOriginal) => {
  const actual = (await importOriginal()) as object
  return {
    ...actual,
    executeContractWrite: vi.fn()
  }
})

const INVESTOR = '0x3333333333333333333333333333333333333333' as Address
const PROOF = ['0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'] as Hex[]

describe('claimMigration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(executeContractWrite).mockResolvedValue({
      hash: '0xhash' as never,
      receipt: { status: 'success' } as never,
      simulation: {} as never
    })
  })

  it('claims the caller migrated balance with a Merkle proof', async () => {
    const receipt = await claimMigration({
      investorV2Address: INVESTOR,
      amount: 100n,
      proof: PROOF
    })

    expect(receipt).toEqual({ status: 'success' })
    expect(executeContractWrite).toHaveBeenCalledWith({
      address: INVESTOR,
      abi: expect.anything(),
      functionName: 'claim',
      args: [100n, PROOF]
    })
  })
})

describe('useClaimMigrationMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useMutationFn.mockImplementation(smartUseMutation)
    vi.mocked(executeContractWrite).mockResolvedValue({
      hash: '0xhash' as never,
      receipt: { status: 'success' } as never,
      simulation: {} as never
    })
  })

  it('exposes a mutation that runs claimMigration', async () => {
    const mutation = useClaimMigrationMutation()
    const receipt = await mutation.mutateAsync({
      investorV2Address: INVESTOR,
      amount: 100n,
      proof: PROOF
    })

    expect(receipt).toEqual({ status: 'success' })
    expect(executeContractWrite).toHaveBeenCalledWith(
      expect.objectContaining({ functionName: 'claim' })
    )
  })
})
