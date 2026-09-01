import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  useVestingAddress,
  useVestingGetAllArchivedVestingsFlat,
  useVestingGetVestingsWithMembers
} from '../reads'
import { mockTeamStore, useReadContractFn } from '@/tests/mocks'

vi.unmock('@/composables/vesting/reads')

const VESTING_ADDRESS = '0x1000000000000000000000000000000000000001'

describe('Vesting read factories', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockTeamStore.getContractAddressByType.mockImplementation((type) =>
      type === 'Vesting' ? VESTING_ADDRESS : undefined
    )
  })

  it('uses the validated Vesting address for the current and archived ABI reads', () => {
    expect(useVestingAddress().value).toBe(VESTING_ADDRESS)

    useVestingGetVestingsWithMembers()
    useVestingGetAllArchivedVestingsFlat()

    const [active, archived] = useReadContractFn.mock.calls.slice(-2).map(([config]) => config)
    expect(active).toMatchObject({ functionName: 'getVestingsWithMembers' })
    expect(active.address.value).toBe(VESTING_ADDRESS)
    expect(active.query.enabled.value).toBe(true)
    expect(archived).toMatchObject({ functionName: 'getAllArchivedVestingsFlat' })
    expect(archived.address.value).toBe(VESTING_ADDRESS)
    expect(archived.query.enabled.value).toBe(true)
  })

  it('disables reads for an invalid Vesting address', () => {
    mockTeamStore.getContractAddressByType.mockReturnValue('invalid')

    useVestingGetVestingsWithMembers()

    const config = useReadContractFn.mock.calls.at(-1)?.[0]
    expect(config.address.value).toBeUndefined()
    expect(config.query.enabled.value).toBe(false)
  })
})
