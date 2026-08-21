import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import CreateVesting from '@/components/sections/VestingView/forms/CreateVesting.vue'
import SelectMemberInput from '@/components/utils/SelectMemberInput.vue'
import { resetContractMocks } from '@/tests/mocks'

describe('CreateVesting.vue — configuration', () => {
  let wrapper: VueWrapper

  beforeEach(() => {
    vi.clearAllMocks()
    resetContractMocks()
    wrapper = mount(CreateVesting, {
      global: { plugins: [createTestingPinia({ createSpy: vi.fn })] }
    })
  })

  it('presents the configure stage with minute-precision boundaries', () => {
    expect(wrapper.text()).toContain('Configure')
    expect(wrapper.text()).toContain('Review')
    expect(wrapper.find('[data-test="member"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="total-amount"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="vesting-start-date"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="vesting-start-time"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="vesting-end-date"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="vesting-end-time"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="submit-btn"]').text()).toContain('Review schedule')
  })

  it('replaces the search field with one selected-member card and can change it', async () => {
    await wrapper.findComponent(SelectMemberInput).vm.$emit('selectMember', {
      name: 'Ada Lovelace',
      address: '0x120000000000000000000000000000000000dead'
    })
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-test="selected-member"]').text()).toContain('Ada Lovelace')
    expect(wrapper.find('[data-test="member"]').exists()).toBe(false)

    await wrapper.find('[data-test="change-member"]').trigger('click')
    expect(wrapper.find('[data-test="member"]').exists()).toBe(true)
  })

  it('shows field feedback instead of silently ignoring an invalid review action', async () => {
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.findComponent({ name: 'VestingSummary' }).exists()).toBe(false)
    expect(wrapper.text()).toContain('Choose a valid team member')
    expect(wrapper.text()).toContain('Enter the total number of shares')
    expect(wrapper.text()).toContain('Choose an end date and time')
  })
})
