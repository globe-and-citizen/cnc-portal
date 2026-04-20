import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readContract, writeContract, waitForTransactionReceipt } from '@wagmi/core'
import {
  migrateShareholders,
  useMigrateShareholders,
  InconsistentSupplyError
} from '../useShareholderMigration'
import {
  useMutationFn,
  smartUseMutation,
  useQueryClientFn,
  mockInvalidateQueries
} from '@/tests/mocks/composables.mock'
import type { Address } from 'viem'

const PREV_OFFICER = '0x1111111111111111111111111111111111111111' as Address
const OLD_INVESTOR = '0x2222222222222222222222222222222222222222' as Address
const NEW_INVESTOR = '0x3333333333333333333333333333333333333333' as Address
const SHAREHOLDER_A = '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' as Address
const SHAREHOLDER_B = '0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB' as Address
const TX_HASH = '0xdeadbeef00000000000000000000000000000000000000000000000000000000' as const

const shareholders = [
  { shareholder: SHAREHOLDER_A, amount: 100n },
  { shareholder: SHAREHOLDER_B, amount: 200n }
]

/**
 * Helper: configure readContract to reply based on which contract+fn is called.
 * Order-insensitive so tests stay readable.
 */
function stubReads(opts: {
  oldInvestor?: Address | null
  shareholders?: readonly { shareholder: Address; amount: bigint }[]
  newSupply?: bigint
}) {
  vi.mocked(readContract).mockImplementation(async (_config, params) => {
    const p = params as { address: Address; functionName: string }
    if (p.functionName === 'getTeam') {
      return opts.oldInvestor === null
        ? []
        : [{ contractType: 'InvestorV1', contractAddress: opts.oldInvestor ?? OLD_INVESTOR }]
    }
    if (p.functionName === 'getShareholders') return opts.shareholders ?? []
    if (p.functionName === 'totalSupply') return opts.newSupply ?? 0n
    throw new Error(`Unexpected readContract call: ${p.functionName}`)
  })
}

describe('migrateShareholders (pure)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('mints on the new InvestorV1 when supply is 0', async () => {
    stubReads({ shareholders, newSupply: 0n })
    vi.mocked(writeContract).mockResolvedValue(TX_HASH)
    vi.mocked(waitForTransactionReceipt).mockResolvedValue({ status: 'success' } as never)

    const res = await migrateShareholders({
      previousOfficerAddress: PREV_OFFICER,
      newInvestorAddress: NEW_INVESTOR
    })

    expect(res).toEqual({ kind: 'done', migratedCount: 2, shareholders })
    expect(writeContract).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        address: NEW_INVESTOR,
        functionName: 'distributeMint',
        args: [
          [
            { shareholder: SHAREHOLDER_A, amount: 100n },
            { shareholder: SHAREHOLDER_B, amount: 200n }
          ]
        ]
      })
    )
    expect(waitForTransactionReceipt).toHaveBeenCalledWith(expect.anything(), { hash: TX_HASH })
  })

  it('returns noop-empty when the previous InvestorV1 has no shareholders', async () => {
    stubReads({ shareholders: [] })

    const res = await migrateShareholders({
      previousOfficerAddress: PREV_OFFICER,
      newInvestorAddress: NEW_INVESTOR
    })

    expect(res).toEqual({ kind: 'noop-empty' })
    expect(writeContract).not.toHaveBeenCalled()
  })

  it('returns noop-already-migrated when supply matches sum', async () => {
    stubReads({ shareholders, newSupply: 300n })

    const res = await migrateShareholders({
      previousOfficerAddress: PREV_OFFICER,
      newInvestorAddress: NEW_INVESTOR
    })

    expect(res).toEqual({ kind: 'noop-already-migrated', matchedCount: 2 })
    expect(writeContract).not.toHaveBeenCalled()
  })

  it('throws InconsistentSupplyError when supply is non-zero and differs', async () => {
    stubReads({ shareholders, newSupply: 999n })

    await expect(
      migrateShareholders({
        previousOfficerAddress: PREV_OFFICER,
        newInvestorAddress: NEW_INVESTOR
      })
    ).rejects.toBeInstanceOf(InconsistentSupplyError)
    expect(writeContract).not.toHaveBeenCalled()
  })

  it('exposes newSupply and expectedSupply on the error', async () => {
    stubReads({ shareholders, newSupply: 999n })

    try {
      await migrateShareholders({
        previousOfficerAddress: PREV_OFFICER,
        newInvestorAddress: NEW_INVESTOR
      })
      throw new Error('should have thrown')
    } catch (e) {
      expect(e).toBeInstanceOf(InconsistentSupplyError)
      expect((e as InconsistentSupplyError).newSupply).toBe(999n)
      expect((e as InconsistentSupplyError).expectedSupply).toBe(300n)
      expect((e as InconsistentSupplyError).message).toContain('double-minting')
    }
  })

  it('throws when the previous Officer has no InvestorV1 sub-contract', async () => {
    stubReads({ oldInvestor: null })

    await expect(
      migrateShareholders({
        previousOfficerAddress: PREV_OFFICER,
        newInvestorAddress: NEW_INVESTOR
      })
    ).rejects.toThrow(/no InvestorV1/i)
  })
})

describe('useMigrateShareholders (TanStack wrapper)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useMutationFn.mockImplementation(smartUseMutation)
    useQueryClientFn.mockReturnValue({
      invalidateQueries: mockInvalidateQueries,
      getQueryData: vi.fn(),
      setQueryData: vi.fn(),
      removeQueries: vi.fn()
    })
  })

  it('resolves with done result when supply is 0', async () => {
    stubReads({ shareholders, newSupply: 0n })
    vi.mocked(writeContract).mockResolvedValue(TX_HASH)
    vi.mocked(waitForTransactionReceipt).mockResolvedValue({ status: 'success' } as never)

    const m = useMigrateShareholders()
    const res = await m.mutateAsync({
      previousOfficerAddress: PREV_OFFICER,
      newInvestorAddress: NEW_INVESTOR
    })

    expect(res).toMatchObject({ kind: 'done', migratedCount: 2 })
  })

  it('resolves with noop-already-migrated when supply matches', async () => {
    stubReads({ shareholders, newSupply: 300n })

    const m = useMigrateShareholders()
    const res = await m.mutateAsync({
      previousOfficerAddress: PREV_OFFICER,
      newInvestorAddress: NEW_INVESTOR
    })

    expect(res).toEqual({ kind: 'noop-already-migrated', matchedCount: 2 })
  })

  it('resolves with noop-empty when there are no previous shareholders', async () => {
    stubReads({ shareholders: [] })

    const m = useMigrateShareholders()
    const res = await m.mutateAsync({
      previousOfficerAddress: PREV_OFFICER,
      newInvestorAddress: NEW_INVESTOR
    })

    expect(res).toEqual({ kind: 'noop-empty' })
  })

  it('rethrows InconsistentSupplyError from the mutation', async () => {
    stubReads({ shareholders, newSupply: 999n })

    const m = useMigrateShareholders()
    await expect(
      m.mutateAsync({
        previousOfficerAddress: PREV_OFFICER,
        newInvestorAddress: NEW_INVESTOR
      })
    ).rejects.toBeInstanceOf(InconsistentSupplyError)
  })
})
