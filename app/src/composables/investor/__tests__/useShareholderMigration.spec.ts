import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readContract } from '@wagmi/core'
import { zeroHash } from 'viem'
import { useMigrateShareholders } from '../useShareholderMigration'
import { executeContractWrite } from '@/composables/contracts/useContractWritesV3'
import {
  useCreateInvestorMigrationMutation,
  useGenerateMerkleSnapshotMutation
} from '@/queries/investorMigration.queries'
import { useMutationFn, smartUseMutation } from '@/tests/mocks/composables.mock'
import type { Address } from 'viem'

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
const SHAREHOLDER_A = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as Address
const SHAREHOLDER_B = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' as Address
const TX_HASH = '0xdeadbeef00000000000000000000000000000000000000000000000000000000' as const
const SOME_ROOT = '0x1234567800000000000000000000000000000000000000000000000000000000' as const

const shareholders = [
  { shareholder: SHAREHOLDER_A, amount: 100n },
  { shareholder: SHAREHOLDER_B, amount: 200n }
]

const snapshot = {
  root: SOME_ROOT,
  shareholders: [
    { address: SHAREHOLDER_A, amount: '100' },
    { address: SHAREHOLDER_B, amount: '200' }
  ],
  proofs: {
    [SHAREHOLDER_A.toLowerCase()]: [
      '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
    ],
    [SHAREHOLDER_B.toLowerCase()]: [
      '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
    ]
  },
  blockNumber: 42,
  totalSupply: '300'
}

function stubReads(opts: {
  oldInvestor?: Address | null
  shareholders?: readonly { shareholder: Address; amount: bigint }[]
  existingRoot?: `0x${string}`
}) {
  vi.mocked(readContract).mockImplementation(async (_config, params) => {
    const p = params as { functionName: string }
    if (p.functionName === 'getTeam') {
      return opts.oldInvestor === null
        ? []
        : [{ contractType: 'InvestorV1', contractAddress: opts.oldInvestor ?? OLD_INVESTOR }]
    }
    if (p.functionName === 'getShareholders') return opts.shareholders ?? shareholders
    if (p.functionName === 'getMigrationRoot') return opts.existingRoot ?? zeroHash
    throw new Error(`Unexpected readContract call: ${p.functionName}`)
  })
}

function configureSnapshotMutation() {
  const generateMutation = { mutateAsync: vi.fn().mockResolvedValue(snapshot) }
  const persistMutation = { mutateAsync: vi.fn().mockResolvedValue(snapshot) }
  vi.mocked(useGenerateMerkleSnapshotMutation).mockReturnValue(generateMutation as never)
  vi.mocked(useCreateInvestorMigrationMutation).mockReturnValue(persistMutation as never)
  return { generateMutation, persistMutation }
}

describe('useMigrateShareholders', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useMutationFn.mockImplementation(smartUseMutation)
    vi.mocked(executeContractWrite).mockResolvedValue({
      hash: TX_HASH,
      receipt: { status: 'success', blockNumber: 42n } as never,
      simulation: {} as never
    })
  })

  it('generates the snapshot, commits the root and persists the migration', async () => {
    stubReads({ existingRoot: zeroHash })
    const { generateMutation, persistMutation } = configureSnapshotMutation()

    const migration = useMigrateShareholders()
    const result = await migration.mutateAsync({
      teamId: 1,
      previousOfficerAddress: PREV_OFFICER,
      newInvestorAddress: NEW_INVESTOR
    })

    expect(generateMutation.mutateAsync).toHaveBeenCalledWith({
      body: { investorV1Address: OLD_INVESTOR }
    })
    expect(executeContractWrite).toHaveBeenCalledWith({
      address: NEW_INVESTOR,
      abi: expect.anything(),
      functionName: 'setMigrationRoot',
      args: [SOME_ROOT]
    })
    expect(persistMutation.mutateAsync).toHaveBeenCalledWith({
      body: {
        teamId: 1,
        previousInvestorAddress: OLD_INVESTOR,
        newInvestorAddress: NEW_INVESTOR,
        merkleRoot: SOME_ROOT,
        blockNumber: 42,
        shareholders: [
          { shareholder: SHAREHOLDER_A, amount: '100' },
          { shareholder: SHAREHOLDER_B, amount: '200' }
        ]
      }
    })
    expect(result).toMatchObject({ kind: 'done', migratedCount: 2 })
  })

  it('returns noop-empty when the previous Investor has no shareholders', async () => {
    stubReads({ shareholders: [] })
    const { generateMutation, persistMutation } = configureSnapshotMutation()

    const migration = useMigrateShareholders()
    const result = await migration.mutateAsync({
      teamId: 1,
      previousOfficerAddress: PREV_OFFICER,
      newInvestorAddress: NEW_INVESTOR
    })

    expect(result).toEqual({ kind: 'noop-empty' })
    expect(generateMutation.mutateAsync).not.toHaveBeenCalled()
    expect(persistMutation.mutateAsync).not.toHaveBeenCalled()
    expect(executeContractWrite).not.toHaveBeenCalled()
  })

  it('repairs a committed root when the previous persistence attempt failed', async () => {
    stubReads({ existingRoot: SOME_ROOT })
    const { persistMutation } = configureSnapshotMutation()

    const migration = useMigrateShareholders()
    const result = await migration.mutateAsync({
      teamId: 1,
      previousOfficerAddress: PREV_OFFICER,
      newInvestorAddress: NEW_INVESTOR
    })

    expect(result).toMatchObject({ kind: 'done', merkleRoot: SOME_ROOT })
    expect(executeContractWrite).not.toHaveBeenCalled()
    expect(persistMutation.mutateAsync).toHaveBeenCalledTimes(1)
  })

  it('rejects a committed root that does not match the regenerated snapshot', async () => {
    stubReads({
      existingRoot: '0x9999999900000000000000000000000000000000000000000000000000000000'
    })
    configureSnapshotMutation()

    const migration = useMigrateShareholders()
    await expect(
      migration.mutateAsync({
        teamId: 1,
        previousOfficerAddress: PREV_OFFICER,
        newInvestorAddress: NEW_INVESTOR
      })
    ).rejects.toThrow(/does not match/i)
  })

  it('throws when the previous Officer has no Investor contract', async () => {
    stubReads({ oldInvestor: null })
    configureSnapshotMutation()

    const migration = useMigrateShareholders()
    await expect(
      migration.mutateAsync({
        teamId: 1,
        previousOfficerAddress: PREV_OFFICER,
        newInvestorAddress: NEW_INVESTOR
      })
    ).rejects.toThrow(/no Investor contract/i)
  })
})
