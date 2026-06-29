import { describe, it, expect, vi, beforeEach } from 'vitest'
import { parseEventLogs, type Address } from 'viem'

// Local getConnections mock — not covered by the shared wagmi setup.
const { mockGetConnections } = vi.hoisted(() => ({ mockGetConnections: vi.fn() }))
vi.mock('@wagmi/core', async (importOriginal) => {
  const actual = (await importOriginal()) as object
  return {
    ...actual,
    getConnections: mockGetConnections
  }
})

// `parseEventLogs` is globally stubbed in tests/setup/viem.setup.ts (keccak256
// is mocked there, so real event decoding can't run). We just drive its return.
const mockParseEventLogs = vi.mocked(parseEventLogs)
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
    getDeploymentConfigs: vi.fn(() => [])
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
      receipt: { blockNumber: 42n, logs: [] } as never,
      simulation: {} as never
    })
    mockParseEventLogs.mockReturnValue([
      { args: { proxy: OFFICER_PROXY, deployer: USER } }
    ] as never)
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

  it('throws when no BeaconProxyCreated event is found in the receipt', async () => {
    mockParseEventLogs.mockReturnValue([])

    await expect(
      deployOfficer({ investorInput: { name: 'Shares', symbol: 'SH' } })
    ).rejects.toThrow(/extract Officer proxy address/)
  })

  it('decodes the proxy address from the receipt logs (no extra RPC)', async () => {
    await deployOfficer({ investorInput: { name: 'Shares', symbol: 'SH' } })

    expect(mockParseEventLogs).toHaveBeenCalledWith(
      expect.objectContaining({ eventName: 'BeaconProxyCreated', logs: [] })
    )
  })
})

describe('useDeployOfficer (TanStack wrapper)', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    setConnectedUser(USER)
    vi.mocked(executeContractWrite).mockResolvedValue({
      hash: TX_HASH,
      receipt: { blockNumber: 42n, logs: [] } as never,
      simulation: {} as never
    })
    mockParseEventLogs.mockReturnValue([
      { args: { proxy: OFFICER_PROXY, deployer: USER } }
    ] as never)

    useMutationFn.mockImplementation(smartUseMutation)
    useQueryClientFn.mockReturnValue({
      invalidateQueries: mockInvalidateQueries,
      getQueryData: vi.fn(),
      setQueryData: vi.fn(),
      removeQueries: vi.fn()
    })
  })

  it('invalidates teamKeys.all + contractKeys.all on success', async () => {
    const m = useDeployOfficer()
    await m.mutateAsync({ investorInput: { name: 'Shares', symbol: 'SH' }, teamId: 7 })

    const keys = mockInvalidateQueries.mock.calls.map((c) => c[0]?.queryKey)
    expect(keys).toContainEqual(['teams'])
    expect(keys).toContainEqual(['contracts'])
    // The legacy singular `['team', id]` key matched no registered query and
    // was removed in favor of the `teamKeys.all` prefix (which covers detail).
    expect(keys).not.toContainEqual(['team', 7])
  })

  it('invalidates the same keys regardless of teamId shape (string or number)', async () => {
    const m = useDeployOfficer()
    await m.mutateAsync({ investorInput: { name: 'Shares', symbol: 'SH' }, teamId: '13' })

    const keys = mockInvalidateQueries.mock.calls.map((c) => c[0]?.queryKey)
    expect(keys).toContainEqual(['teams'])
    expect(keys).toContainEqual(['contracts'])
  })

  it('still invalidates when teamId is omitted', async () => {
    const m = useDeployOfficer()
    await m.mutateAsync({ investorInput: { name: 'Shares', symbol: 'SH' } })

    const keys = mockInvalidateQueries.mock.calls.map((c) => c[0]?.queryKey)
    expect(keys).toContainEqual(['teams'])
    expect(keys).toContainEqual(['contracts'])
  })

  it('skips invalidation entirely when composed with { skipInvalidation: true }', async () => {
    const m = useDeployOfficer({ skipInvalidation: true })
    await m.mutateAsync({ investorInput: { name: 'Shares', symbol: 'SH' }, teamId: 7 })

    expect(mockInvalidateQueries).not.toHaveBeenCalled()
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

  it('invalidates teamKeys.all + contractKeys.all (covers team detail transitively)', async () => {
    const invalidate = useInvalidateOfficerQueries()
    await invalidate(5)

    const keys = mockInvalidateQueries.mock.calls.map((c) => c[0]?.queryKey)
    expect(keys).toContainEqual(['teams'])
    expect(keys).toContainEqual(['contracts'])
    expect(keys).not.toContainEqual(['team', 5])
  })

  it('invalidates the same keys when called without a teamId', async () => {
    const invalidate = useInvalidateOfficerQueries()
    await invalidate()

    const keys = mockInvalidateQueries.mock.calls.map((c) => c[0]?.queryKey)
    expect(keys).toContainEqual(['teams'])
    expect(keys).toContainEqual(['contracts'])
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
