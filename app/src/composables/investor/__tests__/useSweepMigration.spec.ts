import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Address, Hex } from 'viem'
import { executeContractWrite } from '@/composables/contracts/useContractWritesV3'
import { completeMigration, sweepMigration } from '../useSweepMigration'

vi.mock('@/composables/contracts/useContractWritesV3', async (importOriginal) => {
  const actual = (await importOriginal()) as object
  return {
    ...actual,
    executeContractWrite: vi.fn()
  }
})

const INVESTOR = '0x3333333333333333333333333333333333333333' as Address
const HOLDER = '0x4444444444444444444444444444444444444444' as Address
const PROOF = ['0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'] as Hex[]

describe('sweepMigration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(executeContractWrite).mockResolvedValue({
      hash: '0xhash' as never,
      receipt: { status: 'success' } as never,
      simulation: {} as never
    })
  })

  it('bulk claims with proofs without closing the migration', async () => {
    await sweepMigration({
      investorV2Address: INVESTOR,
      holders: [HOLDER],
      amounts: [100n],
      proofs: [PROOF]
    })

    expect(executeContractWrite).toHaveBeenNthCalledWith(1, {
      address: INVESTOR,
      abi: expect.anything(),
      functionName: 'bulkClaim',
      args: [[HOLDER], [100n], [PROOF]]
    })
    expect(executeContractWrite).toHaveBeenCalledTimes(1)
  })

  it('closes the migration in a separate owner transaction', async () => {
    await completeMigration(INVESTOR)

    expect(executeContractWrite).toHaveBeenCalledWith({
      address: INVESTOR,
      abi: expect.anything(),
      functionName: 'completeMigration',
      args: []
    })
  })
})
