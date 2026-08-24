import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { BaseError, UserRejectedRequestError } from 'viem'
import VestingActionReviewModal from '@/components/sections/VestingView/VestingActionReviewModal.vue'
import { mockToast, mockVestingWrites } from '@/tests/mocks'
import type { VestingSchedule } from '@/types/vesting'

const schedule: VestingSchedule = {
  member: '0x0000000000000000000000000000000000000001',
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

const mountComponent = (kind: 'release' | 'stop' = 'release') =>
  mount(VestingActionReviewModal, {
    props: {
      open: true,
      kind,
      schedule,
      tokenSymbol: 'SHR',
      memberName: () => 'Ada'
    }
  })

describe('VestingActionReviewModal.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockVestingWrites.release.mutateAsync.mockResolvedValue(undefined)
    mockVestingWrites.stopVesting.mutateAsync.mockResolvedValue(undefined)
  })

  it('reviews and confirms the exact claimable release', async () => {
    const wrapper = mountComponent()
    expect(wrapper.text()).toContain('4 SHR')
    await wrapper.get('[data-test="vesting-action-confirm"]').trigger('click')
    await flushPromises()

    expect(mockVestingWrites.release.mutateAsync).toHaveBeenCalledWith({ args: [3n] })
    expect(wrapper.emitted('success')).toEqual([['release']])
    expect(mockToast.add).toHaveBeenCalledWith({
      title: 'Claimable shares released',
      color: 'success'
    })
  })

  it('shows the stop settlement before confirming cancellation', async () => {
    const wrapper = mountComponent('stop')
    expect(wrapper.text()).toContain('Unvested amount cancelled')
    expect(wrapper.text()).toContain('4 SHR')
    await wrapper.get('[data-test="vesting-action-confirm"]').trigger('click')
    await flushPromises()

    expect(mockVestingWrites.stopVesting.mutateAsync).toHaveBeenCalledWith({
      args: [schedule.member, 3n]
    })
    expect(wrapper.emitted('success')).toEqual([['stop']])
  })

  it('keeps the modal open and explains a rejected wallet request', async () => {
    mockVestingWrites.release.mutateAsync.mockRejectedValue(
      new BaseError('rejected', { cause: new UserRejectedRequestError(new Error('rejected')) })
    )
    const wrapper = mountComponent()
    await wrapper.get('[data-test="vesting-action-confirm"]').trigger('click')
    await flushPromises()

    expect(wrapper.get('[data-test="vesting-action-error"]').text()).toContain('No changes')
    expect(wrapper.emitted('success')).toBeUndefined()
  })

  it('shows the exact smallest claimable amount', () => {
    const wrapper = mount(VestingActionReviewModal, {
      props: {
        open: true,
        kind: 'release',
        schedule: { ...schedule, claimableAmount: 1n },
        tokenSymbol: 'SHR',
        memberName: () => 'Ada'
      }
    })

    expect(wrapper.text()).toContain('0.000001 SHR')
  })
})
