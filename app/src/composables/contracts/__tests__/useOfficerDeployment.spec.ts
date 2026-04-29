import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Address } from 'viem'

// Local getConnections mock — not covered by the shared wagmi setup.
const { mockGetConnections } = vi.hoisted(() => ({ mockGetConnections: vi.fn() }))
vi.mock('@wagmi/core', async (importOriginal) => {
  const actual = (await importOriginal()) as object
  return {
    ...actual,
    getConnections: mockGetConnections
  }
})
import {
  deployOfficer,
  useDeployOfficer,
  useInvalidateOfficerQueries,
  formatDeployError
} from '../useOfficerDeployment'
import { executeContractWrite } from '../useContractWritesV3'
import {
  useMutationFn,
  smartUseMutation,
  useQueryClientFn,
  mockInvalidateQueries
} from '@/tests/mocks/composables.mock'
import { mockGetLogs } from '@/tests/mocks/viem.actions.mock'
import { mockParseError } from '@/tests/mocks/utils.mock'

const USER = '0x1234567890123456789012345678901234567890' as Address
const OFFICER_PROXY = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as Address
const TX_HASH = '0xdeadbeef00000000000000000000000000000000000000000000000000000000' as const

// Stub out the V3 executor dependency — we're testing the deployment helper,
// not its simulate/write/wait plumbing.
vi.mock('../useContractWritesV3', async (importOriginal) => {
  const actual = (await importOriginal()) as object
  return {
    ...actual,
    executeContractWrite: vi.fn()
  }
})

// Fix OFFICER_BEACON so the `if (!OFFICER_BEACON)` guard doesn't fire.
vi.mock('@/constant', async (importOriginal) => {
  const actual = (await importOriginal()) as object
  return {
    ...actual,
    OFFICER_BEACON: '0xbeac00000000000000000000000000000000beac' as Address,
    validateAddresses: vi.fn()
  }
})

// Stub beacon / deployment config helpers so we don't pull env.
vi.mock('@/utils/contractDeploymentUtil', async (importOriginal) => {
  const actual = (await importOriginal()) as object
  return {
    ...actual,
    validateBeaconAddresses: vi.fn(),
    getBeaconConfigs: vi.fn(() => []),
    getDeploymentConfigs: vi.fn(() => []),
    handleBeaconProxyCreatedLogs: vi.fn()
  }
})

const setConnectedUser = (address: Address | null) => {
  mockGetConnections.mockReturnValue(address ? [{ accounts: [address] }] : [])
}

describe('deployOfficer (pure)', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    setConnectedUser(USER)
    vi.mocked(executeContractWrite).mockResolvedValue({
      hash: TX_HASH,
      receipt: { blockNumber: 42n } as never,
      simulation: {} as never
    })
    mockGetLogs.mockResolvedValue([
      { args: { deployer: USER, proxy: OFFICER_PROXY }, transactionHash: TX_HASH }
    ] as never)
    const utils = await import('@/utils/contractDeploymentUtil')
    vi.mocked(utils.handleBeaconProxyCreatedLogs).mockReturnValue(OFFICER_PROXY)
  })

  it('throws when no wallet is connected', async () => {
    setConnectedUser(null)
    await expect(
      deployOfficer({ investorInput: { name: 'Shares', symbol: 'SH' } })
    ).rejects.toThrow(/Wallet not connected/)
  })

  it('returns metadata with officer address and block number on success', async () => {
    const before = Date.now()
    const res = await deployOfficer({ investorInput: { name: 'Shares', symbol: 'SH' } })

    expect(res.hash).toBe(TX_HASH)
    expect(res.officerAddress).toBe(OFFICER_PROXY)
    expect(res.deployBlockNumber).toBe(42)
    expect(res.deployedAt).toBeInstanceOf(Date)
    expect(res.deployedAt.getTime()).toBeGreaterThanOrEqual(before)
  })

  it('throws when the proxy address cannot be extracted from event logs', async () => {
    const utils = await import('@/utils/contractDeploymentUtil')
    vi.mocked(utils.handleBeaconProxyCreatedLogs).mockReturnValue(null)

    await expect(
      deployOfficer({ investorInput: { name: 'Shares', symbol: 'SH' } })
    ).rejects.toThrow(/extract Officer proxy address/)
  })

  it('queries logs for the exact deployment block', async () => {
    await deployOfficer({ investorInput: { name: 'Shares', symbol: 'SH' } })

    const call = mockGetLogs.mock.calls[0]
    expect(call).toBeDefined()
    const params = call![1]
    expect(params).toMatchObject({ fromBlock: 42n, toBlock: 42n })
  })
})

describe('useDeployOfficer (TanStack wrapper)', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    setConnectedUser(USER)
    vi.mocked(executeContractWrite).mockResolvedValue({
      hash: TX_HASH,
      receipt: { blockNumber: 42n } as never,
      simulation: {} as never
    })
    mockGetLogs.mockResolvedValue([
      { args: { deployer: USER, proxy: OFFICER_PROXY }, transactionHash: TX_HASH }
    ] as never)
    const utils = await import('@/utils/contractDeploymentUtil')
    vi.mocked(utils.handleBeaconProxyCreatedLogs).mockReturnValue(OFFICER_PROXY)

    useMutationFn.mockImplementation(smartUseMutation)
    useQueryClientFn.mockReturnValue({
      invalidateQueries: mockInvalidateQueries,
      getQueryData: vi.fn(),
      setQueryData: vi.fn(),
      removeQueries: vi.fn()
    })
  })

  it('invalidates team + teams + contracts when teamId is provided', async () => {
    const m = useDeployOfficer()
    await m.mutateAsync({ investorInput: { name: 'Shares', symbol: 'SH' }, teamId: 7 })

    const keys = mockInvalidateQueries.mock.calls.map((c) => c[0]?.queryKey)
    expect(keys).toContainEqual(['team', 7])
    expect(keys).toContainEqual(['teams'])
    expect(keys).toContainEqual(['contracts'])
  })

  it('parses string teamId to a number before invalidating', async () => {
    const m = useDeployOfficer()
    await m.mutateAsync({ investorInput: { name: 'Shares', symbol: 'SH' }, teamId: '13' })

    const keys = mockInvalidateQueries.mock.calls.map((c) => c[0]?.queryKey)
    expect(keys).toContainEqual(['team', 13])
  })

  it('only invalidates contracts when teamId is omitted', async () => {
    const m = useDeployOfficer()
    await m.mutateAsync({ investorInput: { name: 'Shares', symbol: 'SH' } })

    const keys = mockInvalidateQueries.mock.calls.map((c) => c[0]?.queryKey)
    expect(keys).toContainEqual(['contracts'])
    expect(keys).not.toContainEqual(['teams'])
  })
})

describe('useInvalidateOfficerQueries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useQueryClientFn.mockReturnValue({
      invalidateQueries: mockInvalidateQueries,
      getQueryData: vi.fn(),
      setQueryData: vi.fn(),
      removeQueries: vi.fn()
    })
  })

  it('invalidates team + teams + contracts for a numeric teamId', async () => {
    const invalidate = useInvalidateOfficerQueries()
    await invalidate(5)

    const keys = mockInvalidateQueries.mock.calls.map((c) => c[0]?.queryKey)
    expect(keys).toContainEqual(['team', 5])
    expect(keys).toContainEqual(['teams'])
    expect(keys).toContainEqual(['contracts'])
  })

  it('coerces string teamId to number', async () => {
    const invalidate = useInvalidateOfficerQueries()
    await invalidate('21')

    const keys = mockInvalidateQueries.mock.calls.map((c) => c[0]?.queryKey)
    expect(keys).toContainEqual(['team', 21])
  })

  it('only invalidates contracts when teamId is omitted', async () => {
    const invalidate = useInvalidateOfficerQueries()
    await invalidate()

    const keys = mockInvalidateQueries.mock.calls.map((c) => c[0]?.queryKey)
    expect(keys).toEqual([['contracts']])
  })
})

describe('formatDeployError', () => {
  it('delegates to parseError with the factory beacon ABI', () => {
    mockParseError.mockReturnValue('Parsed!')
    const result = formatDeployError(new Error('boom'))
    expect(result).toBe('Parsed!')
    expect(mockParseError).toHaveBeenCalled()
  })
})
