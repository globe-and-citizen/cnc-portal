import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  useVestingAddVestingWrite,
  useVestingReleaseWrite,
  useVestingStopVestingWrite
} from '../writes'
import { mockInvalidateQueries, mockTeamStore, useQueryClientFn } from '@/tests/mocks'

const { mockUseContractWritesV3 } = vi.hoisted(() => ({
  mockUseContractWritesV3: vi.fn((config) => config)
}))

vi.unmock('@/composables/vesting/writes')
vi.mock('@/composables/contracts/useContractWritesV3', async (importOriginal) => {
  const actual: object = await importOriginal()
  return { ...actual, useContractWritesV3: mockUseContractWritesV3 }
})

const INVESTOR_ADDRESS = '0x2000000000000000000000000000000000000002'

describe('Vesting write factories', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockTeamStore.getInvestorAddress.mockReturnValue(INVESTOR_ADDRESS)
    useQueryClientFn.mockReturnValue({
      invalidateQueries: mockInvalidateQueries,
      getQueryData: vi.fn(),
      setQueryData: vi.fn(),
      removeQueries: vi.fn()
    })
  })

  it('configures each write against the Vesting ABI function', () => {
    useVestingAddVestingWrite()
    useVestingStopVestingWrite()
    useVestingReleaseWrite()

    expect(mockUseContractWritesV3.mock.calls.map(([config]) => config.functionName)).toEqual([
      'addVesting',
      'stopVesting',
      'release'
    ])
    expect(mockUseContractWritesV3.mock.calls[0]?.[0].contractAddress.value).toBe(
      '0x1000000000000000000000000000000000000001'
    )
  })

  it.each([useVestingStopVestingWrite, useVestingReleaseWrite])(
    'invalidates Investor reads after a share-minting Vesting write',
    async (useWrite) => {
      useWrite()
      const config = mockUseContractWritesV3.mock.calls.at(-1)?.[0]

      await config.onSuccess()

      const predicate = mockInvalidateQueries.mock.calls[0]?.[0].predicate
      expect(
        predicate({ queryKey: ['readContract', { address: INVESTOR_ADDRESS.toUpperCase() }] })
      ).toBe(true)
      expect(
        predicate({
          queryKey: ['readContract', { address: '0x3000000000000000000000000000000000000003' }]
        })
      ).toBe(false)
      expect(predicate({ queryKey: ['balance', { address: INVESTOR_ADDRESS }] })).toBe(false)
    }
  )

  it('does not add cross-contract invalidation to schedule creation', () => {
    useVestingAddVestingWrite()

    expect(mockUseContractWritesV3.mock.calls[0]?.[0].onSuccess).toBeUndefined()
  })
})
