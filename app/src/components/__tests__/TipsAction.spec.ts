import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import TipsAction from '@/components/TipsAction.vue'
import { NETWORK } from '@/constant'

describe('TipsAction.vue', () => {
  it('renders correctly', () => {
    const wrapper = mount(TipsAction, {
      props: {
        pushTipLoading: false,
        sendTipLoading: false
      }
    })

    expect(wrapper.find('label[for="tip-amount"]').text()).toBe('Total Amount')
    expect(wrapper.find('input').attributes('placeholder')).toBe('Input tip amount per member')
    expect(wrapper.find('label.text-center.self-center.mt-7').text()).toBe(NETWORK.currencySymbol)
    expect(wrapper.find('label[for="tip-amount"]').text()).toBe('Total Amount')
  })

  it('emits pushTip with correct amount when Push Tips button is clicked', async () => {
    const wrapper = mount(TipsAction, {
      props: {
        pushTipLoading: false,
        sendTipLoading: false
      }
    })

    const input = wrapper.find('input')
    await input.setValue('100')
    await wrapper.find('button.btn-primary').trigger('click')

    expect(wrapper.emitted()).toHaveProperty('pushTip')
    expect(wrapper.emitted('pushTip')?.[0]).toEqual(['100'])
  })

  it('emits sendTip with correct amount when Send Tips button is clicked', async () => {
    const wrapper = mount(TipsAction, {
      props: {
        pushTipLoading: false,
        sendTipLoading: false
      }
    })

    const input = wrapper.find('input')
    await input.setValue('100')
    await wrapper.find('button.btn-secondary').trigger('click')

    expect(wrapper.emitted()).toHaveProperty('sendTip')
    expect(wrapper.emitted('sendTip')?.[0]).toEqual(['100'])
  })

  it('shows LoadingButton when pushTipLoading is true', () => {
    const wrapper = mount(TipsAction, {
      props: {
        pushTipLoading: true,
        sendTipLoading: false
      }
    })

    expect(wrapper.findComponent({ name: 'LoadingButton' }).exists()).toBe(true)
    expect(wrapper.find('button.btn-primary.w-full.text-white').exists()).toBe(false)
  })

  it('shows Push Tips button when pushTipLoading is false', () => {
    const wrapper = mount(TipsAction, {
      props: {
        pushTipLoading: false,
        sendTipLoading: false
      }
    })

    expect(wrapper.findComponent({ name: 'LoadingButton' }).exists()).toBe(false)
    expect(wrapper.find('button.btn-primary').exists()).toBe(true)
  })

  it('shows LoadingButton when sendTipLoading is true', () => {
    const wrapper = mount(TipsAction, {
      props: {
        pushTipLoading: false,
        sendTipLoading: true
      }
    })

    expect(wrapper.findComponent({ name: 'LoadingButton' }).isVisible()).toBe(true)
    expect(wrapper.find('button.btn.btn-secondary.w-full.text-white').exists()).toBe(false)
  })

  it('shows Send Tips button when sendTipLoading is false', () => {
    const wrapper = mount(TipsAction, {
      props: {
        pushTipLoading: false,
        sendTipLoading: false
      }
    })

    expect(wrapper.findComponent({ name: 'LoadingButton' }).exists()).toBe(false)
    expect(wrapper.find('button.btn-secondary').exists()).toBe(true)
  })
})
