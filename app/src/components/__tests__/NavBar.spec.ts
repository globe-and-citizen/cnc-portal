import { describe, expect, it, vi } from 'vitest'

import NavBar from '../NavBar.vue'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { ref } from 'vue'

const mockUseWriteContract = {
  writeContract: vi.fn(),
  error: ref(null),
  isPending: ref(false),
  data: ref(null)
}

const mockUseWaitForTransactionReceipt = {
  isLoading: ref(false),
  isSuccess: ref(false)
}

// Mocking wagmi functions
vi.mock('@wagmi/vue', async (importOriginal) => {
  const actual: Object = await importOriginal()
  return {
    ...actual,
    useWriteContract: vi.fn(() => mockUseWriteContract),
    useWaitForTransactionReceipt: vi.fn(() => mockUseWaitForTransactionReceipt)
  }
})

vi.mock('vue-router', () => ({
  useRoute: vi.fn(() => ({
    params: {
      id: 0
    }
  }))
}))

describe('NavBar', () => {
  const props = {
    withdrawLoading: false,
    balanceLoading: false,
    balance: '1.23456789',
    isCollapsed: false
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

    it('renders the Ethereum Logo', () => {
      expect(wrapper.find('img').attributes('src')).toBe('/src/assets/Ethereum.png')
    })

    it('Should renders balance correctly', () => {
      expect(wrapper.find("[data-test='balance-with-symbol']").text()).toContain('1.234')
    })
    it('Should renders Withdraw Button', () => {
      expect(wrapper.find('[data-test="withdraw"]').text()).toContain('Withdraw Tips')
    })
  })

  // Check if the component emits the right events
  describe('Emits', () => {
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
      expect(wrapper.find("[data-test='balance-loading']")).toBeTruthy()
    })
  })
})
