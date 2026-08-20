import { describe, it, expect, vi, beforeEach } from 'vitest'
import { parseEventLogs, type Address } from 'viem'
import { getConnections } from '@wagmi/core'

// Both `@wagmi/core` (incl. getConnections) and `parseEventLogs` are globally
// stubbed in tests/setup (wagmi.vue.setup.ts / viem.setup.ts). encodeFunctionData
// is stubbed too (always returns '0xEncodedData'), so real ABI encoding can't
// run — we just assert the call shape.
const mockGetConnections = vi.mocked(getConnections)
const mockParseEventLogs = vi.mocked(parseEventLogs)
import { deploySafe, useDeploySafe } from '../useSafeDeployment'
import { executeContractWrite } from '@/composables/contracts/useContractWritesV3'
import {
  useMutationFn,
  smartUseMutation,
  useQueryClientFn,
  mockInvalidateQueries
} from '@/tests/mocks/composables.mock'

const OWNER = '0x1111111111111111111111111111111111111111' as Address
const SAFE_ADDRESS = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as Address
const SINGLETON = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' as Address
const PROXY_FACTORY = '0xcccccccccccccccccccccccccccccccccccccccc' as Address
const FALLBACK_HANDLER = '0xdddddddddddddddddddddddddddddddddddddddd' as Address
const TX_HASH = '0xdeadbeef00000000000000000000000000000000000000000000000000000000' as const

// Stub out the V3 executor dependency — we're testing the deployment helper,
// not its simulate/write/wait plumbing.
vi.mock('@/composables/contracts/useContractWritesV3', async (importOriginal) => {
  const actual = (await importOriginal()) as object
  return {
    ...actual,
    executeContractWrite: vi.fn()
  }
})

// Fix the Safe infra addresses so tests don't depend on chain/network config.
vi.mock('@/constant', async (importOriginal) => {
  const actual = (await importOriginal()) as object
  return {
    ...actual,
    getSafeInfraAddresses: vi.fn(() => ({
      singleton: SINGLETON,
      proxyFactory: PROXY_FACTORY,
      fallbackHandler: FALLBACK_HANDLER
    }))
  }
})

const setConnectedUser = (address: Address | null) => {
  mockGetConnections.mockReturnValue(address ? ([{ accounts: [address] }] as never) : [])
}

describe('deploySafe (pure)', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    setConnectedUser(OWNER)
    vi.mocked(executeContractWrite).mockResolvedValue({
      hash: TX_HASH,
      receipt: { logs: [] } as never,
      simulation: {} as never
    })
    mockParseEventLogs.mockReturnValue([
      { eventName: 'ProxyCreation', args: { proxy: SAFE_ADDRESS, singleton: SINGLETON } }
    ] as never)
  })

  it('throws when no wallet is connected', async () => {
    setConnectedUser(null)
    await expect(deploySafe({ owners: [OWNER], threshold: 1 })).rejects.toThrow(
      /Wallet not connected/
    )
  })

  it('throws when owners list is empty', async () => {
    await expect(deploySafe({ owners: [], threshold: 1 })).rejects.toThrow(
      /At least one owner required/
    )
  })

  it('throws when threshold exceeds owner count', async () => {
    await expect(deploySafe({ owners: [OWNER], threshold: 2 })).rejects.toThrow(/Threshold/)
  })

  it('throws when an owner address is invalid', async () => {
    await expect(
      deploySafe({ owners: ['not-an-address' as Address], threshold: 1 })
    ).rejects.toThrow(/Invalid owner address/)
  })

  it('calls createProxyWithNonce on the resolved proxy factory with the singleton and encoded initializer', async () => {
    await deploySafe({ owners: [OWNER], threshold: 1 })

    expect(executeContractWrite).toHaveBeenCalledWith(
      expect.objectContaining({
        address: PROXY_FACTORY,
        functionName: 'createProxyWithNonce'
      })
    )
    const call = vi.mocked(executeContractWrite).mock.calls[0][0]
    expect(call.args?.[0]).toBe(SINGLETON)
    expect(call.args?.[1]).toBe('0xEncodedData')
    expect(typeof call.args?.[2]).toBe('bigint')
  })

  it('returns the deployed Safe address decoded from the ProxyCreation event', async () => {
    const result = await deploySafe({ owners: [OWNER], threshold: 1 })

    expect(result.hash).toBe(TX_HASH)
    expect(result.safeAddress).toBe(SAFE_ADDRESS)
  })

  it('throws when no ProxyCreation event is found in the receipt', async () => {
    mockParseEventLogs.mockReturnValue([])

    await expect(deploySafe({ owners: [OWNER], threshold: 1 })).rejects.toThrow(
      /extract Safe proxy address/
    )
  })

  it('propagates a deployment failure from executeContractWrite', async () => {
    vi.mocked(executeContractWrite).mockRejectedValue(new Error('Transaction reverted on-chain'))

    await expect(deploySafe({ owners: [OWNER], threshold: 1 })).rejects.toThrow(
      /Transaction reverted on-chain/
    )
  })
})

describe('useDeploySafe (TanStack wrapper)', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    setConnectedUser(OWNER)
    vi.mocked(executeContractWrite).mockResolvedValue({
      hash: TX_HASH,
      receipt: { logs: [] } as never,
      simulation: {} as never
    })
    mockParseEventLogs.mockReturnValue([
      { eventName: 'ProxyCreation', args: { proxy: SAFE_ADDRESS, singleton: SINGLETON } }
    ] as never)

    useMutationFn.mockImplementation(smartUseMutation)
    useQueryClientFn.mockReturnValue({
      invalidateQueries: mockInvalidateQueries,
      getQueryData: vi.fn(),
      setQueryData: vi.fn(),
      removeQueries: vi.fn()
    })
  })

  it('invalidates safeKeys.info(safeAddress) on success', async () => {
    const m = useDeploySafe()
    await m.mutateAsync({ owners: [OWNER], threshold: 1 })

    const keys = mockInvalidateQueries.mock.calls.map((c) => c[0]?.queryKey)
    expect(keys).toContainEqual(['safe', 'info', { safeAddress: SAFE_ADDRESS }])
  })
})
