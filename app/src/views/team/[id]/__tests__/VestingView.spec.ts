import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, type VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import VestingView from '../VestingView.vue'
import VestingFlow from '@/components/sections/VestingView/VestingFlow.vue'
import VestingStats from '@/components/sections/VestingView/VestingStats.vue'
import {
  mockBlockTimestamp,
  mockInvestorReads,
  mockVestingReads,
  renderWithProviders,
  resetContractMocks
} from '@/tests/mocks'

const MEMBER = '0x0000000000000000000000000000000000000001'
const ARCHIVED_MEMBER = '0x0000000000000000000000000000000000000002'
let wrapper: VueWrapper | undefined

const mountView = () => {
  wrapper = renderWithProviders(VestingView)
  return wrapper
}

describe('VestingView.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetContractMocks()
    mockBlockTimestamp.value = 1_700_005_000n
    mockInvestorReads.symbol.data.value = 'SHR'
    mockVestingReads.vestingsWithMembers.data.value = [
      [MEMBER],
      [0n],
      [
        {
          start: 1_700_000_000n,
          duration: 100_000n,
          cliff: 10_000n,
          totalAmount: 10_000_000n,
          released: 0n,
          active: true
        }
      ]
    ]
    mockVestingReads.archivedVestingsFlat.data.value = [[], [], []]
  })

  afterEach(() => wrapper?.unmount())

  it('renders the vesting hero without an implementation-version label', () => {
    const wrapper = mountView()
    expect(wrapper.text()).not.toContain('V2')
    expect(wrapper.findComponent(VestingStats).exists()).toBe(true)
    expect(wrapper.findComponent(VestingFlow).exists()).toBe(true)
  })

  it('updates the visible schedule totals from the reactive chain timestamp', async () => {
    const wrapper = mountView()

    expect(wrapper.get('[data-test="vesting-vested"]').text()).toBe('0 SHR')

    mockBlockTimestamp.value = 1_700_050_000n
    await nextTick()

    expect(wrapper.get('[data-test="vesting-vested"]').text()).toBe('5 SHR')
    expect(wrapper.get('[data-test="vesting-claimable"]').text()).toBe('5 SHR')
  })

  it('combines active and archived schedules in the visible totals', () => {
    mockVestingReads.archivedVestingsFlat.data.value = [
      [ARCHIVED_MEMBER],
      [1n],
      [
        {
          start: 1_699_900_000n,
          duration: 50_000n,
          cliff: 0n,
          totalAmount: 2_000_000n,
          released: 1_000_000n,
          active: false
        }
      ]
    ]

    const wrapper = mountView()

    expect(wrapper.get('[data-test="vesting-promised"]').text()).toBe('12 SHR')
    expect(wrapper.get('[data-test="vesting-released"]').text()).toBe('1 SHR')
  })

  it('refetches active and archived schedules from the visible retry action', async () => {
    mockVestingReads.vestingsWithMembers.error.value = new Error('read failed')
    const wrapper = mountView()

    await wrapper.get('[data-test="vesting-retry"]').trigger('click')
    await flushPromises()

    expect(mockVestingReads.vestingsWithMembers.refetch).toHaveBeenCalledOnce()
    expect(mockVestingReads.archivedVestingsFlat.refetch).toHaveBeenCalledOnce()
  })
})
