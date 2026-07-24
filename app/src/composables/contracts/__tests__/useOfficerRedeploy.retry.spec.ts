import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useOfficerRedeploy } from '../useOfficerRedeploy'
import { useTeamStore } from '@/stores'
import { useCreateOfficerMutation } from '@/queries/contract.queries'
import { mockWagmiCore } from '@/tests/mocks'
import {
  resetMutation,
  NEW_OFFICER,
  PREV_OFFICER,
  NEW_INVESTOR
} from './useOfficerRedeploy.fixture'

// Hoisted refs so each mutation's exposed state can be flipped per test.
// vi.mock() factories are hoisted above imports, so these can't live in the
// shared fixture — see useOfficerRedeploy.fixture.ts.
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

describe('useOfficerRedeploy — migration failure, retry, skip, reset', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetMutation(deployMutationRefs)
    resetMutation(registerMutationRefs)
    resetMutation(migrateMutationRefs)
    invalidateMock.mockResolvedValue(undefined)
    vi.mocked(useCreateOfficerMutation).mockReturnValue(registerMutationRefs as never)
    vi.mocked(useTeamStore).mockReturnValue({
      currentTeamId: 42
    } as never)
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
    mockWagmiCore.readContract.mockResolvedValue([
      { contractType: 'Investor', contractAddress: NEW_INVESTOR }
    ])
    const err = new Error('setMigrationRoot reverted')
    // Don't throw — the wrapping tanstack mutation would set .error.value and
    // return undefined rather than rethrow in the real impl. Mirror that here.
    migrateMutationRefs.mutateAsync.mockImplementation(async () => {
      migrateMutationRefs.isSuccess.value = false
      migrateMutationRefs.error.value = err
      return undefined
    })

    const { redeploy, migrationFailed, migrationError } = useOfficerRedeploy()
    await redeploy({ name: 'Shares', symbol: 'SH' })

    expect(migrationFailed.value).toBe(true)
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
    mockWagmiCore.readContract.mockResolvedValue([
      { contractType: 'Investor', contractAddress: NEW_INVESTOR }
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
        teamId: 42,
        previousOfficerAddress: PREV_OFFICER,
        newInvestorAddress: NEW_INVESTOR
      })
      migrateMutationRefs.isSuccess.value = true
      return { kind: 'done', migratedCount: 0, shareholders: [] }
    })
    await composable.retryMigration()

    expect(composable.migrationFailed.value).toBe(false)
    expect(invalidateMock).toHaveBeenCalledWith()
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
    mockWagmiCore.readContract.mockResolvedValue([
      { contractType: 'Investor', contractAddress: NEW_INVESTOR }
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
    expect(invalidateMock).toHaveBeenCalledWith()
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
