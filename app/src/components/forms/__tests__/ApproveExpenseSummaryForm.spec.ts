import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ApproveExpenseSummaryForm from '../ApproveExpenseSummaryForm.vue'
const START_DATE = Math.floor(new Date().getTime() / 1000)
const END_DATE = START_DATE + 86400 * 30 // 30 days later

describe('ApproveExpenseSummaryForm', () => {
  const createComponent = () => {
    return mount(ApproveExpenseSummaryForm, {
      props: {
        budgetLimit: {
          approvedAddress: '0x1234567890abcdef1234567890abcdef12345678',
          amount: 1000,
          frequencyType: 3,
          customFrequency: 0,
          startDate: START_DATE,
          endDate: END_DATE,
          tokenAddress: '0x0000000000000000000000000000000000000000'
        },
        loading: false
      }
    })
  }

  it('should render correctly', () => {
    const wrapper = createComponent()
    expect(wrapper.exists()).toBe(true)
    expect(wrapper.text()).toContain(
      `You are about to approve ${wrapper.props().budgetLimit.approvedAddress} with the following limits:`
    )
    expect(wrapper.text()).toContain('Amount: 1000 SepoliaETH')
    expect(wrapper.text()).toContain('Frequency: Monthly')
    expect(wrapper.text()).toContain(`Start Date: ${new Date(START_DATE * 1000).toLocaleString()}`)
    expect(wrapper.text()).toContain(`End Date: ${new Date(END_DATE * 1000).toLocaleString()}`)
  })

  it('should emit submit event on button click', async () => {
    const wrapper = createComponent()
    await wrapper.find('[data-test="approve-button"]').trigger('click')
    expect(wrapper.emitted()).toHaveProperty('submit')
  })

  it('should emit close event on close button click', async () => {
    const wrapper = createComponent()
    await wrapper.find('[data-test="cancel-button"]').trigger('click')
    expect(wrapper.emitted()).toHaveProperty('close')
  })
})
