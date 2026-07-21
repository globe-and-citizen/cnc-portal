import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readContract } from '@wagmi/core'
import { zeroHash } from 'viem'
import { migrateShareholders, useMigrateShareholders } from '../useShareholderMigration'
import { executeContractWrite } from '@/composables/contracts/useContractWritesV3'
import {
  useMutationFn,
  smartUseMutation,
  useQueryClientFn,
  mockInvalidateQueries
} from '@/tests/mocks/composables.mock'
import type { Address } from 'viem'

// Stub out the V3 executor — we're testing the migration helper, not its
// simulate/write/wait plumbing.
vi.mock('@/composables/contracts/useContractWritesV3', async (importOriginal) => {
  const actual = (await importOriginal()) as object
  return {
    ...actual,
    executeContractWrite: vi.fn()
  }
})

const PREV_OFFICER = '0x1111111111111111111111111111111111111111' as Address
const OLD_INVESTOR = '0x2222222222222222222222222222222222222222' as Address
const NEW_INVESTOR = '0x3333333333333333333333333333333333333333' as Address
const SHAREHOLDER_A = '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' as Address
const SHAREHOLDER_B = '0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB' as Address
const TX_HASH = '0xdeadbeef00000000000000000000000000000000000000000000000000000000' as const
const SOME_ROOT = '0x1234567800000000000000000000000000000000000000000000000000000000' as const

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
  existingRoot?: `0x${string}`
}) {
  vi.mocked(readContract).mockImplementation(async (_config, params) => {
    const p = params as { address: Address; functionName: string }
    if (p.functionName === 'getTeam') {
      return opts.oldInvestor === null
        ? []
        : [{ contractType: 'InvestorV1', contractAddress: opts.oldInvestor ?? OLD_INVESTOR }]
    }
    if (p.functionName === 'getShareholders') return opts.shareholders ?? []
    if (p.functionName === 'getMigrationRoot') return opts.existingRoot ?? zeroHash
    throw new Error(`Unexpected readContract call: ${p.functionName}`)
  })
}

describe('migrateShareholders (pure)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('sets the migration root on the new Investor when none is set yet', async () => {
    stubReads({ shareholders, existingRoot: zeroHash })
    vi.mocked(executeContractWrite).mockResolvedValue({
      hash: TX_HASH,
      receipt: { status: 'success', blockNumber: 42n } as never,
      simulation: {} as never
    })

    const res = await migrateShareholders({
      teamId: 1,
      previousOfficerAddress: PREV_OFFICER,
      newInvestorAddress: NEW_INVESTOR
    })

    expect(res).toMatchObject({
      kind: 'done',
      migratedCount: 2,
      previousInvestorAddress: OLD_INVESTOR,
      blockNumber: 42n
    })
    expect(executeContractWrite).toHaveBeenCalledWith(
      expect.objectContaining({
        address: NEW_INVESTOR,
        functionName: 'setMigrationRoot'
      })
    )
  })

  it('returns noop-empty when the previous InvestorV1 has no shareholders', async () => {
    stubReads({ shareholders: [] })

    const res = await migrateShareholders({
      teamId: 1,
      previousOfficerAddress: PREV_OFFICER,
      newInvestorAddress: NEW_INVESTOR
    })

    expect(res).toEqual({ kind: 'noop-empty' })
    expect(executeContractWrite).not.toHaveBeenCalled()
  })

  it('returns noop-already-migrated when a migration root is already set', async () => {
    stubReads({ shareholders, existingRoot: SOME_ROOT })

    const res = await migrateShareholders({
      teamId: 1,
      previousOfficerAddress: PREV_OFFICER,
      newInvestorAddress: NEW_INVESTOR
    })

    expect(res).toEqual({ kind: 'noop-already-migrated' })
    expect(executeContractWrite).not.toHaveBeenCalled()
  })

  it('throws when the previous Officer has no InvestorV1 sub-contract', async () => {
    stubReads({ oldInvestor: null })

    await expect(
      migrateShareholders({
        teamId: 1,
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

  it('resolves with done result and persists the snapshot when no root is set', async () => {
    stubReads({ shareholders, existingRoot: zeroHash })
    vi.mocked(executeContractWrite).mockResolvedValue({
      hash: TX_HASH,
      receipt: { status: 'success', blockNumber: 42n } as never,
      simulation: {} as never
    })

    const m = useMigrateShareholders()
    const res = await m.mutateAsync({
      teamId: 1,
      previousOfficerAddress: PREV_OFFICER,
      newInvestorAddress: NEW_INVESTOR
    })

    expect(res).toMatchObject({ kind: 'done', migratedCount: 2 })
  })

  it('resolves with noop-already-migrated when a root is already set', async () => {
    stubReads({ shareholders, existingRoot: SOME_ROOT })

    const m = useMigrateShareholders()
    const res = await m.mutateAsync({
      teamId: 1,
      previousOfficerAddress: PREV_OFFICER,
      newInvestorAddress: NEW_INVESTOR
    })

    expect(res).toEqual({ kind: 'noop-already-migrated' })
  })

  it('resolves with noop-empty when there are no previous shareholders', async () => {
    stubReads({ shareholders: [] })

    const m = useMigrateShareholders()
    const res = await m.mutateAsync({
      teamId: 1,
      previousOfficerAddress: PREV_OFFICER,
      newInvestorAddress: NEW_INVESTOR
    })

    expect(res).toEqual({ kind: 'noop-empty' })
  })
})
