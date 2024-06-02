import { describe, expect, it } from 'vitest'

import IconBell from '@/components/icons/IconBell.vue'
import IconHamburgerMenu from '@/components/icons/IconHamburgerMenu.vue'
import { NETWORK } from '@/constant/index'
import NavBar from '../NavBar.vue'
import { mount } from '@vue/test-utils'

describe.only('NavBar', () => {
  const props = {
    withdrawLoading: false,
    balanceLoading: false,
    balance: '1.23456789'
  }
  const props2 = {
    withdrawLoading: true,
    balanceLoading: true,
    balance: '1.23456789'
  }
  const wrapper = mount(NavBar, { props })
  const wrapper2 = mount(NavBar, { props: props2 })

  //TODO
  // First check if the component is mounted
  // Check if we have the right behavior
  // Difference balance and withdraw loading state

  it('Should have loading state for Balance and Withr', () => {})
  it('renders navbar with static elements', () => {
    expect(wrapper.find('img[alt="Logo"]').exists()).toBe(true)

    expect(wrapper.findComponent(IconHamburgerMenu).exists()).toBe(true)

    expect(wrapper.find('img[alt="Ethereum Icon"]').exists()).toBe(true)

    expect(wrapper.findComponent(IconBell).exists()).toBe(true)

    expect(wrapper.find('.avatar img').exists()).toBe(true)
  })

  it('renders balance correctly', () => {
    expect(wrapper.find('.btn span').text()).toContain('1.234')
  })

  it('emits toggleSideButton when hamburger button is clicked', async () => {
    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('toggleSideButton')).toBeTruthy()
  })

  it('emits withdraw event when withdraw is clicked', async () => {
    await wrapper.find('.dropdown-content li a').trigger('click')
    expect(wrapper.emitted('withdraw')).toBeTruthy()
  })

  it('renders withdraw loading state', () => {
    const wrapper = mount(NavBar, { props: { ...props, withdrawLoading: true } })
    expect(wrapper.find('.dropdown-content li a').text()).toBe('Processing')
  })
  it('shows loading state for balance', () => {
    const wrapper = mount(NavBar, { props: { ...props, balanceLoading: true } })
    expect(wrapper.find('.btn div').text()).toBe(NETWORK.currencySymbol)
  })
})
