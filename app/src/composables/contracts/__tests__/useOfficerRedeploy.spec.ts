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
    expect(invalidateMock).toHaveBeenCalledWith()
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
    mockWagmiCore.readContract.mockResolvedValue([
      { contractType: 'Investor', contractAddress: NEW_INVESTOR }
    ])
    migrateMutationRefs.mutateAsync.mockImplementation(async () => {
      migrateMutationRefs.isSuccess.value = true
      return { kind: 'done', migratedCount: 1, shareholders: [] }
    })

    const { redeploy, migrationFailed } = useOfficerRedeploy()
    await redeploy({ name: 'Shares', symbol: 'SH' })

    expect(migrateMutationRefs.mutateAsync).toHaveBeenCalledWith({
      teamId: 42,
      previousOfficerAddress: PREV_OFFICER,
      newInvestorAddress: NEW_INVESTOR
    })
    expect(migrationFailed.value).toBe(false)
    expect(invalidateMock).toHaveBeenCalledWith()
  })

  it('surfaces workflowError when the previous Investor is missing from getTeam()', async () => {
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
    // The previous Officer's getTeam() has no Investor/InvestorV1 entry at all.
    mockWagmiCore.readContract.mockResolvedValueOnce([
      { contractType: 'Voting', contractAddress: '0xvoting' }
    ])

    const { redeploy, workflowError } = useOfficerRedeploy()
    await redeploy({ name: 'Shares', symbol: 'SH' })

    expect(migrateMutationRefs.mutateAsync).not.toHaveBeenCalled()
    expect(invalidateMock).not.toHaveBeenCalled()
    expect(workflowError.value).toBeInstanceOf(Error)
    expect(workflowError.value?.message).toMatch(/could not locate previous investor/i)
  })

  it('surfaces workflowError when the new Investor is missing from getTeam()', async () => {
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
    // The previous Officer resolves, but the newly deployed Officer has no Investor.
    mockWagmiCore.readContract
      .mockResolvedValueOnce([{ contractType: 'Investor', contractAddress: NEW_INVESTOR }])
      .mockResolvedValueOnce([{ contractType: 'Voting', contractAddress: '0xvoting' }])

    const { redeploy, workflowError } = useOfficerRedeploy()
    await redeploy({ name: 'Shares', symbol: 'SH' })

    expect(migrateMutationRefs.mutateAsync).not.toHaveBeenCalled()
    expect(invalidateMock).not.toHaveBeenCalled()
    expect(workflowError.value).toBeInstanceOf(Error)
    expect(workflowError.value?.message).toMatch(/Investor could not be located/)
  })
})
