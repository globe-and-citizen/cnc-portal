import { describe, it, expect, beforeEach } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import VestingSummary from '@/components/sections/VestingView/VestingSummary.vue'
import type { VestingCreation } from '@/types/vesting'

describe('VestingSummary.vue', () => {
  let wrapper: VueWrapper
  const defaultVesting: VestingCreation = {
    member: {
      name: 'Test User',
      address: '0x120000000000000000000000000000000000dead'
    },
    startDate: new Date('2025-06-13'),
    duration: {
      years: 1,
      months: 2,
      days: 3
    },
    durationInDays: 428, // 1 year, 2 months, 3 days
    cliff: 30,
    totalAmount: 1000
  }
  const mountComponent = (props = {}) => {
    return mount(VestingSummary, {
      props: {
        vesting: defaultVesting,
        loading: false,
        ...props
      }
    })
  }

  beforeEach(() => {
    wrapper = mountComponent()
  })

  describe('Rendering', () => {
    it('displays member information correctly', () => {
      const memberInfo = wrapper.find('.grid > div:first-child')
      expect(memberInfo.text()).toContain('Test User')
      expect(memberInfo.text()).toContain('1000 Tokens')
    })

    it('displays dates correctly', () => {
      const dateInfo = wrapper.find('.grid > div:nth-child(3)')
      expect(dateInfo.text()).toContain('13/06/2025')
    })

    it('displays duration correctly', () => {
      const durationInfo = wrapper.find('.grid > div:nth-child(4)')
      expect(durationInfo.text()).toContain('1 years, 2 months, 3 days')
    })

    it('displays cliff period correctly', () => {
      const cliffInfo = wrapper.find('.grid > div:nth-child(5)')
      expect(cliffInfo.text()).toContain('30 days')
    })

    it('displays vesting rate correctly', () => {
      const rateInfo = wrapper.find('.grid > div:nth-child(6)')
      // 1000 tokens / 428 days ≈ 2.34 tokens/day
      expect(rateInfo.text()).toContain('2.34')
      expect(rateInfo.text()).toContain('tokens/day')
    })
  })

  describe('Button States', () => {
    it('enables buttons when not loading', () => {
      const confirmBtn = wrapper.find('[data-test="confirm-btn"]')
      expect(confirmBtn.attributes('disabled')).toBeUndefined()
    })

    it('disables confirm button when loading', async () => {
      wrapper = mountComponent({ loading: true })
      const confirmBtn = wrapper.find('[data-test="confirm-btn"]')
      expect(confirmBtn.attributes('class')).toContain('btn-disabled')
    })
  })

  describe('Events', () => {
    it('emits back event when clicking back button', async () => {
      const backBtn = wrapper.find('button:first-child')
      await backBtn.trigger('click')
      expect(wrapper.emitted('back')).toBeTruthy()
      expect(wrapper.emitted('back')).toHaveLength(1)
    })

    it('emits confirm event when clicking confirm button', async () => {
      const confirmBtn = wrapper.find('[data-test="confirm-btn"]')
      await confirmBtn.trigger('click')
      expect(wrapper.emitted('confirm')).toBeTruthy()
      expect(wrapper.emitted('confirm')).toHaveLength(1)
    })
  })

  describe('Edge Cases', () => {
    it('handles empty member name correctly', () => {
      const vestingWithoutName = {
        ...defaultVesting,
        member: {
          name: '',
          address: '0x120000000000000000000000000000000000dead'
        }
      }
      wrapper = mountComponent({ vesting: vestingWithoutName })
      const memberInfo = wrapper.find('.grid > div:first-child')
      expect(memberInfo.text()).toContain('0x120000000000000000000000000000000000dead')
    })

    it('formats duration correctly with zero values', () => {
      const vestingZeroDuration = {
        ...defaultVesting,
        duration: {
          years: 0,
          months: 0,
          days: 0
        }
      }
      wrapper = mountComponent({ vesting: vestingZeroDuration })
      const durationInfo = wrapper.find('.grid > div:nth-child(4)')
      expect(durationInfo.text()).toContain('0 days')
    })

    it('handles partial duration values', () => {
      const vestingPartialDuration = {
        ...defaultVesting,
        duration: {
          years: 1,
          months: 0,
          days: 5
        }
      }
      wrapper = mountComponent({ vesting: vestingPartialDuration })
      const durationInfo = wrapper.find('.grid > div:nth-child(4)')
      expect(durationInfo.text()).toContain('1 years, 5 days')
      expect(durationInfo.text()).not.toContain('months')
    })
  })
})
