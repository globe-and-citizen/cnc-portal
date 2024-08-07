import { describe, expect, it, vi } from 'vitest'

import { NETWORK } from '@/constant/index'
import NavBar from '../NavBar.vue'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'

describe('NavBar', () => {
  const props = {
    withdrawLoading: false,
    balanceLoading: false,
    balance: '1.23456789'
  }
  const wrapper = mount(NavBar, {
    props,
    global: {
      plugins: [createTestingPinia({ createSpy: vi.fn })]
    }
  })

  // Check if the component is rendered properly
  describe('Render', () => {
    it('Should Render the component', () => {
      expect(wrapper.exists()).toBe(true)
    })

    it('renders the logo', () => {
      expect(wrapper.find('img').attributes('src')).toBe('/src/assets/Logo.png')
    })

    it('Should renders balance correctly', () => {
      expect(wrapper.find('.btn span').text()).toContain('1.234')
    })
    it('Should renders Withdraw Button', () => {
      expect(wrapper.find('[data-test="withdraw"]').text()).toContain('Withdraw Tips')
    })
  })

  // Check if the component emits the right events
  describe('Emits', () => {
    it('Should emits toggleSideButton when hamburger button is clicked', async () => {
      await wrapper.find('[data-test="toggleSideButton"]').trigger('click')
      expect(wrapper.emitted('toggleSideButton')).toBeTruthy()
    })

    it('Should emits withdraw event when withdraw is clicked', async () => {
      await wrapper.find('[data-test="withdraw"]').trigger('click')
      expect(wrapper.emitted('withdraw')).toBeTruthy()
    })
    it('Should emits toggleEditUserModal event when Profile is clicked', async () => {
      await wrapper.find('[data-test="toggleEditUser"]').trigger('click')
      expect(wrapper.emitted('toggleEditUserModal')).toBeTruthy()
    })
  })

  // Check if the component has the right behavior for loading
  describe('Loading', () => {
    it('Should render withdraw loading state', () => {
      const wrapper = mount(NavBar, { props: { ...props, withdrawLoading: true } })
      expect(wrapper.find('.dropdown-content li a').text()).toBe('Processing')
    })
    it('Should render loading state for balance', () => {
      const wrapper = mount(NavBar, { props: { ...props, balanceLoading: true } })
      expect(wrapper.find('.btn div').text()).toBe(NETWORK.currencySymbol)
    })
  })
})
