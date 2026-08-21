import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import VestingScheduleDetailsModal from '@/components/sections/VestingView/VestingScheduleDetailsModal.vue'
import type { VestingSchedule } from '@/types/vesting'

const cancelledSchedule: VestingSchedule = {
  member: '0x0000000000000000000000000000000000000001',
  index: 0n,
  start: 1_700_000_000,
  cliffEnd: 1_700_086_400,
  end: 1_800_000_000,
  totalAmount: 10_000_000n,
  vestedAmount: 4_000_000n,
  claimableAmount: 0n,
  releasedAmount: 4_000_000n,
  unvestedAmount: 6_000_000n,
  active: false,
  progress: 40,
  state: 'cancelled'
}

describe('VestingScheduleDetailsModal.vue', () => {
  it('shows the released and cancelled amounts with local and UTC boundaries', () => {
    const wrapper = mount(VestingScheduleDetailsModal, {
      props: {
        open: true,
        schedule: cancelledSchedule,
        tokenSymbol: 'SHR',
        memberName: () => 'Ada'
      }
    })

    expect(wrapper.text()).toContain('Released')
    expect(wrapper.text()).toContain('4 SHR')
    expect(wrapper.text()).toContain('Cancelled')
    expect(wrapper.text()).toContain('6 SHR')
    expect(wrapper.text()).toContain('Progress')
    expect(wrapper.text()).toContain('40%')
    expect(wrapper.text()).toContain('local')
    expect(wrapper.text()).toContain('UTC')
  })
})
