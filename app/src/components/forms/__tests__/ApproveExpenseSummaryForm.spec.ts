import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ApproveExpenseSummaryForm from '../ApproveExpenseSummaryForm.vue'

describe('ApproveExpenseSummaryForm', () => {
  const createComponent = () => {
    return mount(ApproveExpenseSummaryForm, {
      props: {
        budgetLimit: {
          approvedAddress: '0x1234567890abcdef1234567890abcdef12345678',
          budgetData: [
            {
              budgetType: 0,
              value: 1000
            },
            {
              budgetType: 1,
              value: 2000
            },
            {
              budgetType: 2,
              value: 3000
            }
          ],
          expiry: 1672531199000,
          tokenAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdef'
        },
        loading: false
      }
    })
  }

  it('should render correctly', () => {
    const wrapper = createComponent()
    expect(wrapper.exists()).toBe(true)
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
