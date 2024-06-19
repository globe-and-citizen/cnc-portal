import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import DepositBankForm from '@/components/modals/DepositBankForm.vue'
import { NETWORK } from '@/constant'

describe('DepositBankModal.vue', () => {
  it('renders correctly', () => {
    const wrapper = mount(DepositBankForm, {
      props: { loading: false }
    })

    expect(wrapper.find('h1').text()).toBe('Deposit to Team Bank Contract')
    expect(wrapper.find('h3').text()).toContain(
      `This will deposit 0 ${NETWORK.currencySymbol} to the team bank contract.`
    )
    expect(wrapper.find('.modal').exists()).toBe(true)
  })

  it('emits closeModal when close button is clicked', async () => {
    const wrapper = mount(DepositBankForm, {
      props: { loading: false }
    })

    await wrapper.find('.btn-circle').trigger('click')
    expect(wrapper.emitted()).toHaveProperty('closeModal')
  })

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

  it('shows loading button when loading is true', () => {
    const wrapper = mount(DepositBankForm, {
      props: { loading: true }
    })

    expect(wrapper.findComponent({ name: 'LoadingButton' }).exists()).toBe(true)
    expect(wrapper.find('button.btn.btn-primary').isVisible()).toBe(false)
  })

  it('shows deposit button when loading is false', () => {
    const wrapper = mount(DepositBankForm, {
      props: { loading: false }
    })

    expect(wrapper.findComponent({ name: 'LoadingButton' }).exists()).toBe(false)
    expect(wrapper.find('.btn-primary').exists()).toBe(true)
  })

  it('emits closeModal when cancel button is clicked', async () => {
    const wrapper = mount(DepositBankForm, {
      props: { loading: false }
    })

    await wrapper.find('.btn-error').trigger('click')
    expect(wrapper.emitted()).toHaveProperty('closeModal')
  })
})
