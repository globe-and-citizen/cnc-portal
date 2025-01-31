import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import CashRemunerationCard from '../CashRemunerationCard.vue'

describe('CashRemunerationCard', () => {
  it('should renders balance card', async () => {
    const wrapper = mount(CashRemunerationCard, {
      props: {
        cardType: 'balance',
        amount: 1000,
        isLoading: false
      }
    })

    expect(wrapper.find("[data-test='card'").classes()).toContain('bg-base-200')
    expect(wrapper.find("[data-test='amount'").text()).toBe('1000')
  })

  it('should renders month-claims card', async () => {
    const wrapper = mount(CashRemunerationCard, {
      props: {
        cardType: 'month-claims',
        amount: 1000,
        isLoading: false
      }
    })

    expect(wrapper.find("[data-test='card'").classes()).toContain('bg-blue-100')
    expect(wrapper.find("[data-test='card'").classes()).toContain('text-blue-800')
    expect(wrapper.find("[data-test='amount'").text()).toBe('1000')
  })

  it('should renders month-claims card', async () => {
    const wrapper = mount(CashRemunerationCard, {
      props: {
        cardType: 'approved-claims',
        amount: 1000,
        isLoading: false
      }
    })

    expect(wrapper.find("[data-test='card'").classes()).toContain('bg-orange-200')
    expect(wrapper.find("[data-test='card'").classes()).toContain('text-orange-800')
    expect(wrapper.find("[data-test='amount'").text()).toBe('1000')
  })

  it('should renders loading spinner', async () => {
    const wrapper = mount(CashRemunerationCard, {
      props: {
        cardType: 'balance',
        amount: 1000,
        isLoading: true
      }
    })

    expect(wrapper.find("[data-test='loading-spinner'").exists()).toBeTruthy()
    expect(wrapper.find("[data-test='amount'").exists()).toBeFalsy()
  })
})
