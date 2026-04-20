import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Address } from 'viem'
import { useOfficerRedeploy } from '../useOfficerRedeploy'
import { InconsistentSupplyError } from '@/composables/investor/useShareholderMigration'
import { useTeamStore } from '@/stores'
import { useCreateOfficerMutation } from '@/queries/contract.queries'

// Hoisted refs so each mutation's exposed state can be flipped per test.
const {
  deployMock,
  migrateMock,
  invalidateMock,
  deployMutationRefs,
  registerMutationRefs,
  migrateMutationRefs
} = vi.hoisted(() => {
  const makeMutation = () => ({
    mutateAsync: vi.fn(),
    isPending: { value: false },
    isSuccess: { value: false },
    error: { value: null as Error | null },
    reset: vi.fn()
  })
  const d = makeMutation()
  const r = makeMutation()
  const m = makeMutation()
  return {
    deployMock: vi.fn(() => d),
    migrateMock: vi.fn(() => m),
    invalidateMock: vi.fn(),
    deployMutationRefs: d,
    registerMutationRefs: r,
    migrateMutationRefs: m
  }
})

// Stub dependent composables so we orchestrate them directly.
vi.mock('../useOfficerDeployment', () => ({
  useDeployOfficer: deployMock,
  useInvalidateOfficerQueries: () => invalidateMock
}))

vi.mock('@/composables/investor/useShareholderMigration', async () => {
  const actual = await vi.importActual<
    typeof import('@/composables/investor/useShareholderMigration')
  >('@/composables/investor/useShareholderMigration')
  return {
    ...actual,
    useMigrateShareholders: migrateMock
  }
})

// Stub the on-chain lookup inside useOfficerRedeploy.
const { mockReadContract } = vi.hoisted(() => ({ mockReadContract: vi.fn() }))
vi.mock('@wagmi/core', async (importOriginal) => {
  const actual = (await importOriginal()) as object
  return {
    ...actual,
    readContract: mockReadContract
  }
})

const NEW_OFFICER = '0xdddd000000000000000000000000000000000000' as Address
const PREV_OFFICER = '0xcccc000000000000000000000000000000000000' as Address
const NEW_INVESTOR = '0xaaaa000000000000000000000000000000000000' as Address

const resetMutation = (m: typeof deployMutationRefs) => {
  m.mutateAsync.mockReset()
  m.reset.mockReset()
  m.isPending.value = false
  m.isSuccess.value = false
  m.error.value = null
}

describe('useOfficerRedeploy', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetMutation(deployMutationRefs)
    resetMutation(registerMutationRefs)
    resetMutation(migrateMutationRefs)
    invalidateMock.mockResolvedValue(undefined)
    // Route the setup-level mock through our local registerMutationRefs so
    // tests can flip its state like deploy/migrate.
    vi.mocked(useCreateOfficerMutation).mockReturnValue(registerMutationRefs as never)
    // Default team context so `redeploy` proceeds past the teamId guard.
    vi.mocked(useTeamStore).mockReturnValue({
      currentTeamId: 42
    } as never)
  })

  it('returns early when there is no current team', async () => {
    vi.mocked(useTeamStore).mockReturnValue({ currentTeamId: null } as never)
    const { redeploy } = useOfficerRedeploy()
    await redeploy({ name: 'Shares', symbol: 'SH' })
    expect(deployMutationRefs.mutateAsync).not.toHaveBeenCalled()
  })

  it('aborts silently when deploy returns falsy (e.g. mutation threw and was swallowed)', async () => {
    deployMutationRefs.mutateAsync.mockResolvedValue(undefined)
    const { redeploy } = useOfficerRedeploy()
    await redeploy({ name: 'Shares', symbol: 'SH' })
    expect(registerMutationRefs.mutateAsync).not.toHaveBeenCalled()
  })

  it('aborts when register returns falsy', async () => {
    deployMutationRefs.mutateAsync.mockResolvedValue({
      hash: '0xhash',
      officerAddress: NEW_OFFICER,
      deployBlockNumber: 10,
      deployedAt: new Date()
    })
    registerMutationRefs.mutateAsync.mockResolvedValue(undefined)

    const { redeploy } = useOfficerRedeploy()
    await redeploy({ name: 'Shares', symbol: 'SH' })

    expect(migrateMutationRefs.mutateAsync).not.toHaveBeenCalled()
    expect(invalidateMock).not.toHaveBeenCalled()
  })

  it('invalidates queries directly when there is no previous officer (first deploy)', async () => {
    deployMutationRefs.mutateAsync.mockResolvedValue({
      hash: '0xhash',
      officerAddress: NEW_OFFICER,
      deployBlockNumber: 10,
      deployedAt: new Date('2026-01-01')
    })
    registerMutationRefs.mutateAsync.mockResolvedValue({
      officer: { id: 1, address: NEW_OFFICER },
      previousOfficer: null,
      contractsCreated: 3
    })

    const { redeploy } = useOfficerRedeploy()
    await redeploy({ name: 'Shares', symbol: 'SH' })

    // Shareholder migration should be skipped entirely on first deploy.
    expect(migrateMutationRefs.mutateAsync).not.toHaveBeenCalled()
    expect(invalidateMock).toHaveBeenCalledWith(42)
  })

  it('forwards deploy metadata to register in the right shape', async () => {
    const deployedAt = new Date('2026-01-02T03:04:05Z')
    deployMutationRefs.mutateAsync.mockResolvedValue({
      hash: '0xhash',
      officerAddress: NEW_OFFICER,
      deployBlockNumber: 99,
      deployedAt
    })
    registerMutationRefs.mutateAsync.mockResolvedValue({
      officer: { id: 1, address: NEW_OFFICER },
      previousOfficer: null,
      contractsCreated: 0
    })

    const { redeploy } = useOfficerRedeploy()
    await redeploy({ name: 'Shares', symbol: 'SH' })

    expect(registerMutationRefs.mutateAsync).toHaveBeenCalledWith({
      body: {
        teamId: 42,
        address: NEW_OFFICER,
        deployBlockNumber: 99,
        deployedAt: deployedAt.toISOString()
      }
    })
  })

  it('runs shareholder migration when a previous officer exists, then invalidates', async () => {
    deployMutationRefs.mutateAsync.mockResolvedValue({
      hash: '0xhash',
      officerAddress: NEW_OFFICER,
      deployBlockNumber: 10,
      deployedAt: new Date()
    })
    registerMutationRefs.mutateAsync.mockResolvedValue({
      officer: { id: 2, address: NEW_OFFICER },
      previousOfficer: { id: 1, address: PREV_OFFICER },
      contractsCreated: 0
    })
    mockReadContract.mockResolvedValue([
      { contractType: 'InvestorV1', contractAddress: NEW_INVESTOR }
    ])
    migrateMutationRefs.mutateAsync.mockImplementation(async () => {
      migrateMutationRefs.isSuccess.value = true
      return { kind: 'done', migratedCount: 1, shareholders: [] }
    })

    const { redeploy, migrationFailed } = useOfficerRedeploy()
    await redeploy({ name: 'Shares', symbol: 'SH' })

    expect(migrateMutationRefs.mutateAsync).toHaveBeenCalledWith({
      previousOfficerAddress: PREV_OFFICER,
      newInvestorAddress: NEW_INVESTOR
    })
    expect(migrationFailed.value).toBe(false)
    expect(invalidateMock).toHaveBeenCalledWith(42)
  })

  it('surfaces workflowError when the new InvestorV1 is missing from getTeam()', async () => {
    deployMutationRefs.mutateAsync.mockResolvedValue({
      hash: '0xhash',
      officerAddress: NEW_OFFICER,
      deployBlockNumber: 10,
      deployedAt: new Date()
    })
    registerMutationRefs.mutateAsync.mockResolvedValue({
      officer: { id: 2, address: NEW_OFFICER },
      previousOfficer: { id: 1, address: PREV_OFFICER },
      contractsCreated: 0
    })
    // InvestorV1 not present in the returned team contract list.
    mockReadContract.mockResolvedValue([{ contractType: 'Voting', contractAddress: '0xvoting' }])

    const { redeploy, workflowError } = useOfficerRedeploy()
    await redeploy({ name: 'Shares', symbol: 'SH' })

    expect(migrateMutationRefs.mutateAsync).not.toHaveBeenCalled()
    expect(invalidateMock).not.toHaveBeenCalled()
    expect(workflowError.value).toBeInstanceOf(Error)
    expect(workflowError.value?.message).toMatch(/InvestorV1 could not be located/)
  })

  it('marks migration as failed (not auto-invalidating) when migrate mutation throws', async () => {
    deployMutationRefs.mutateAsync.mockResolvedValue({
      hash: '0xhash',
      officerAddress: NEW_OFFICER,
      deployBlockNumber: 10,
      deployedAt: new Date()
    })
    registerMutationRefs.mutateAsync.mockResolvedValue({
      officer: { id: 2, address: NEW_OFFICER },
      previousOfficer: { id: 1, address: PREV_OFFICER },
      contractsCreated: 0
    })
    mockReadContract.mockResolvedValue([
      { contractType: 'InvestorV1', contractAddress: NEW_INVESTOR }
    ])
    const err = new InconsistentSupplyError(999n, 300n)
    // Don't throw — the wrapping tanstack mutation would set .error.value and
    // return undefined rather than rethrow in the real impl. Mirror that here.
    migrateMutationRefs.mutateAsync.mockImplementation(async () => {
      migrateMutationRefs.isSuccess.value = false
      migrateMutationRefs.error.value = err
      return undefined
    })

    const { redeploy, migrationFailed, isInconsistent, migrationError } = useOfficerRedeploy()
    await redeploy({ name: 'Shares', symbol: 'SH' })

    expect(migrationFailed.value).toBe(true)
    expect(isInconsistent.value).toBe(true)
    expect(migrationError.value).toBe(err)
    expect(invalidateMock).not.toHaveBeenCalled()
  })

  it('retryMigration re-runs using the held pending addresses and clears on success', async () => {
    // Seed a failed migration.
    deployMutationRefs.mutateAsync.mockResolvedValue({
      hash: '0xhash',
      officerAddress: NEW_OFFICER,
      deployBlockNumber: 10,
      deployedAt: new Date()
    })
    registerMutationRefs.mutateAsync.mockResolvedValue({
      officer: { id: 2, address: NEW_OFFICER },
      previousOfficer: { id: 1, address: PREV_OFFICER },
      contractsCreated: 0
    })
    mockReadContract.mockResolvedValue([
      { contractType: 'InvestorV1', contractAddress: NEW_INVESTOR }
    ])
    migrateMutationRefs.mutateAsync.mockImplementationOnce(async () => {
      migrateMutationRefs.error.value = new Error('boom')
      return undefined
    })

    const composable = useOfficerRedeploy()
    await composable.redeploy({ name: 'Shares', symbol: 'SH' })
    expect(composable.migrationFailed.value).toBe(true)

    // Now retry — this time the migration succeeds.
    migrateMutationRefs.mutateAsync.mockImplementationOnce(async (ctx) => {
      expect(ctx).toEqual({
        previousOfficerAddress: PREV_OFFICER,
        newInvestorAddress: NEW_INVESTOR
      })
      migrateMutationRefs.isSuccess.value = true
      return { kind: 'done', migratedCount: 0, shareholders: [] }
    })
    await composable.retryMigration()

    expect(composable.migrationFailed.value).toBe(false)
    expect(invalidateMock).toHaveBeenCalledWith(42)
  })

  it('skipMigration clears pending state and invalidates', async () => {
    deployMutationRefs.mutateAsync.mockResolvedValue({
      hash: '0xhash',
      officerAddress: NEW_OFFICER,
      deployBlockNumber: 10,
      deployedAt: new Date()
    })
    registerMutationRefs.mutateAsync.mockResolvedValue({
      officer: { id: 2, address: NEW_OFFICER },
      previousOfficer: { id: 1, address: PREV_OFFICER },
      contractsCreated: 0
    })
    mockReadContract.mockResolvedValue([
      { contractType: 'InvestorV1', contractAddress: NEW_INVESTOR }
    ])
    migrateMutationRefs.mutateAsync.mockImplementation(async () => {
      migrateMutationRefs.error.value = new Error('migrate boom')
      return undefined
    })

    const composable = useOfficerRedeploy()
    await composable.redeploy({ name: 'Shares', symbol: 'SH' })
    expect(composable.migrationFailed.value).toBe(true)

    await composable.skipMigration()

    expect(migrateMutationRefs.reset).toHaveBeenCalled()
    expect(composable.migrationFailed.value).toBe(false)
    expect(invalidateMock).toHaveBeenCalledWith(42)
  })

  it('reset clears workflow state and resets all child mutations', () => {
    const c = useOfficerRedeploy()
    c.reset()
    expect(deployMutationRefs.reset).toHaveBeenCalled()
    expect(registerMutationRefs.reset).toHaveBeenCalled()
    expect(migrateMutationRefs.reset).toHaveBeenCalled()
    expect(c.workflowError.value).toBeNull()
  })

  it('isRunning is false when no child mutation is pending', () => {
    const c = useOfficerRedeploy()
    expect(c.isRunning.value).toBe(false)
  })
})
