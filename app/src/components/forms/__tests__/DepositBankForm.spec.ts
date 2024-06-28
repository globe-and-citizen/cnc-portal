import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import DepositBankForm from '@/components/forms/DepositBankForm.vue'
import { NETWORK } from '@/constant'

describe('DepositBankModal.vue', () => {
  describe('render', () => {
    it('renders correctly', () => {
      const wrapper = mount(DepositBankForm, {
        props: { loading: false }
      })

      expect(wrapper.find('h1').text()).toBe('Deposit to Team Bank Contract')
      expect(wrapper.find('h3').text()).toContain(
        `This will deposit 0 ${NETWORK.currencySymbol} to the team bank contract.`
      )
    })
    it('shows loading button when loading is true', () => {
      const wrapper = mount(DepositBankForm, {
        props: { loading: true }
      })

      expect(wrapper.findComponent({ name: 'LoadingButton' }).exists()).toBe(true)
    })

    it('shows deposit button when loading is false', () => {
      const wrapper = mount(DepositBankForm, {
        props: { loading: false }
      })

      expect(wrapper.findComponent({ name: 'LoadingButton' }).exists()).toBe(false)
      expect(wrapper.find('.btn-primary').exists()).toBe(true)
    })
  })
  describe('emits', () => {
    it('emits deposit with the correct amount when Deposit button is clicked', async () => {
      const wrapper = mount(DepositBankForm, {
        props: { loading: false }
      })

      const amountInput = wrapper.find('input')
      await amountInput.setValue('100')
      await wrapper.find('.btn-primary').trigger('click')
      expect(wrapper.emitted()).toHaveProperty('deposit')
      expect(wrapper.emitted('deposit')?.[0]).toEqual(['100'])
    })
  })
})
