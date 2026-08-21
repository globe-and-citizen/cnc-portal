import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { CalendarDate, Time } from '@internationalized/date'
import { parseUnits } from 'viem'
import CreateVesting from '@/components/sections/VestingView/forms/CreateVesting.vue'
import SelectMemberInput from '@/components/utils/SelectMemberInput.vue'
import { mockInvestorReads, mockVestingWrites, resetContractMocks } from '@/tests/mocks'

describe('CreateVesting.vue — submission', () => {
  let wrapper: VueWrapper

  beforeEach(() => {
    vi.clearAllMocks()
    resetContractMocks()
    mockInvestorReads.symbol.data.value = 'SHR'
    mockVestingWrites.addVesting.mutateAsync.mockResolvedValue({ hash: '0xvesting' })
    wrapper = mount(CreateVesting, {
      global: { plugins: [createTestingPinia({ createSpy: vi.fn })] }
    })
  })

  async function fillGrant() {
    await wrapper.findComponent(SelectMemberInput).vm.$emit('selectMember', {
      name: 'Test User',
      address: '0x120000000000000000000000000000000000dead'
    })
    await wrapper.find('[data-test="total-amount"]').setValue('100000.125')

    const calendars = wrapper.findAllComponents({ name: 'UCalendar' })
    const times = wrapper.findAllComponents({ name: 'UInputTime' })
    await calendars[0].vm.$emit('update:modelValue', new CalendarDate(2026, 8, 21))
    await times[0].vm.$emit('update:modelValue', new Time(9, 37))
    await flushPromises()
  }

  async function reviewAndConfirm() {
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(wrapper.find('[data-test="confirm-btn"]').exists()).toBe(true)
    await wrapper.find('[data-test="confirm-btn"]').trigger('click')
    await flushPromises()
  }

  it('preserves the selected minute and submits exact duration and cliff seconds', async () => {
    await fillGrant()
    await wrapper.find('[data-test="duration-48"]').trigger('click')
    await wrapper.find('[data-test="cliff-12"]').trigger('click')

    expect(wrapper.find('[data-test="duration-readout"]').text()).toContain('4 years')
    expect(wrapper.find('[data-test="cliff-duration-readout"]').text()).toContain('1 year')
    expect(wrapper.find('[data-test="claim-preview"]').text()).toContain('24,982.919661 SHR')

    await reviewAndConfirm()

    const start = new Date(2026, 7, 21, 9, 37, 0, 0)
    const end = new Date(2030, 7, 21, 9, 37, 0, 0)
    const cliffEnd = new Date(2027, 7, 21, 9, 37, 0, 0)

    expect(mockVestingWrites.addVesting.mutateAsync).toHaveBeenCalledWith({
      args: [
        '0x120000000000000000000000000000000000dead',
        BigInt(Math.floor(start.getTime() / 1000)),
        BigInt((end.getTime() - start.getTime()) / 1000),
        BigInt((cliffEnd.getTime() - start.getTime()) / 1000),
        parseUnits('100000.125', 6)
      ]
    })
  })

  it('submits a zero-second cliff when no cliff is selected', async () => {
    await fillGrant()
    await wrapper.find('[data-test="duration-12"]').trigger('click')
    await reviewAndConfirm()

    const args = mockVestingWrites.addVesting.mutateAsync.mock.calls[0]?.[0].args
    expect(args[3]).toBe(0n)
  })

  it('rejects an end boundary less than one minute after the start', async () => {
    await fillGrant()

    const calendars = wrapper.findAllComponents({ name: 'UCalendar' })
    const times = wrapper.findAllComponents({ name: 'UInputTime' })
    await calendars[1].vm.$emit('update:modelValue', new CalendarDate(2026, 8, 21))
    await times[1].vm.$emit('update:modelValue', new Time(9, 37))
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.find('[data-test="confirm-btn"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('End must be at least one minute after start')
  })
})
