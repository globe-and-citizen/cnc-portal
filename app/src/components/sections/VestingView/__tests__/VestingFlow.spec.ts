import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import VestingFlow from '@/components/sections/VestingView/VestingFlow.vue'
import VestingActionReviewModal from '@/components/sections/VestingView/VestingActionReviewModal.vue'
import VestingScheduleList from '@/components/sections/VestingView/VestingScheduleList.vue'
import { mockTeamStore, mockUserStore } from '@/tests/mocks'
import type { VestingSchedule } from '@/types/vesting'

const MEMBER = mockUserStore.address
const schedule: VestingSchedule = {
  member: MEMBER,
  index: 3n,
  start: 1_700_000_000,
  cliffEnd: 1_700_000_000,
  end: 1_800_000_000,
  totalAmount: 10_000_000n,
  vestedAmount: 6_000_000n,
  claimableAmount: 4_000_000n,
  releasedAmount: 2_000_000n,
  unvestedAmount: 4_000_000n,
  active: true,
  progress: 60,
  state: 'claimable'
}

const mountComponent = (overrides: Record<string, unknown> = {}) =>
  mount(VestingFlow, {
    props: {
      schedules: [schedule],
      tokenSymbol: 'SHR',
      isLoading: false,
      error: null,
      ...overrides
    },
    global: { plugins: [createTestingPinia({ createSpy: vi.fn })] }
  })

describe('VestingFlow.vue', () => {
  beforeEach(() => {
    mockTeamStore.currentTeam = { ...mockTeamStore.currentTeam, ownerAddress: MEMBER }
    mockUserStore.address = MEMBER
  })

  it('passes visible schedules and permissions to the responsive list', () => {
    const list = mountComponent().getComponent(VestingScheduleList)
    expect(list.props('schedules')).toEqual([schedule])
    expect(list.props('canRelease')(schedule)).toBe(true)
    expect(list.props('canStop')(schedule)).toBe(true)
  })

  it('shows loading, error, and retry states', async () => {
    const loading = mountComponent({ isLoading: true })
    expect(loading.find('[data-test="vesting-loading"]').exists()).toBe(true)

    const failed = mountComponent({ error: new Error('read failed') })
    expect(failed.find('[data-test="vesting-error"]').exists()).toBe(true)
    await failed.get('[data-test="vesting-retry"]').trigger('click')
    expect(failed.emitted('retry')).toBeTruthy()
  })

  it('opens an action review instead of writing immediately', async () => {
    const wrapper = mountComponent()
    wrapper.getComponent(VestingScheduleList).vm.$emit('action', 'release', schedule)
    await wrapper.vm.$nextTick()

    const review = wrapper.getComponent(VestingActionReviewModal)
    expect(review.props('open')).toBe(true)
    expect(review.props('kind')).toBe('release')
    expect(review.props('schedule')).toEqual(schedule)
  })

  it('keeps an open review synchronized with the latest schedule state', async () => {
    const wrapper = mountComponent()
    wrapper.getComponent(VestingScheduleList).vm.$emit('action', 'release', schedule)
    await wrapper.vm.$nextTick()

    const updatedSchedule = {
      ...schedule,
      vestedAmount: 8_000_000n,
      claimableAmount: 6_000_000n,
      progress: 80
    }
    await wrapper.setProps({ schedules: [updatedSchedule] })

    const review = wrapper.getComponent(VestingActionReviewModal)
    expect(review.props('open')).toBe(true)
    expect(review.props('schedule')).toEqual(updatedSchedule)
  })
})
