import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import NavBar from '../NavBar.vue'
import IconHamburgerMenu from '@/components/icons/IconHamburgerMenu.vue'
import IconBell from '@/components/icons/IconBell.vue'
import { getNetwork } from '@/constant/network'

describe('NavBar', () => {
  const props = {
    withdrawLoading: false,
    balanceLoading: false,
    balance: '1.23456789'
  }
  const wrapper = mount(NavBar, { props })

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
    expect(wrapper.find('.dropdown-content li a').text()).toBe('Processing...')
  })
  it('shows loading state for balance', () => {
    const wrapper = mount(NavBar, { props: { ...props, balanceLoading: true } })
    expect(wrapper.find('.btn div').text()).toBe('XXX ' + getNetwork().currencySymbol)
  })
})
