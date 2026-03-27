import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { ref } from 'vue'
import { createTestingPinia } from '@pinia/testing'
import type { Address } from 'viem'
import InvestInSafeButton from '../InvestInSafeButton.vue'
import { mockTeamStore, resetContractMocks } from '@/tests/mocks'
import type { ContractType } from '@/types/teamContract'

// Hoisted mocks
const { mockUseSafeDepositRouterDepositsEnabled, mockUseSafeDepositRouterPaused } = vi.hoisted(
  () => ({
    mockUseSafeDepositRouterDepositsEnabled: vi.fn(),
    mockUseSafeDepositRouterPaused: vi.fn()
  })
)

// Mock composables
vi.mock('@/composables/safeDepositRouter/reads', () => ({
  useSafeDepositRouterDepositsEnabled: mockUseSafeDepositRouterDepositsEnabled,
  useSafeDepositRouterPaused: mockUseSafeDepositRouterPaused
}))

// Mock IconifyIcon
vi.mock('@iconify/vue', () => ({
  Icon: {
    name: 'IconifyIcon',
    template: '<span></span>',
    props: ['icon']
  }
}))

// Test constants
const SELECTORS = {
  button: '[data-test="invest-in-safe-button"]',
  modal: '[data-test="invest-in-safe-modal"]',
  tooltip: '.tooltip'
} as const

const MOCK_DATA = {
  safeAddress: '0x1234567890123456789012345678901234567890' as Address
} as const

describe('InvestInSafeButton', () => {
  let wrapper: VueWrapper

  const createWrapper = () => {
    return mount(InvestInSafeButton, {
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })],
        stubs: {
          UButton: {
            name: 'UButton',
            template: `
              <button 
                data-test="invest-in-safe-button"
                :disabled="disabled"
                @click="$emit('click')"
              >
                <slot name="prefix" />
                <slot />
              </button>
            `,
            props: ['variant', 'outline', 'disabled']
          },
          UModal: {
            name: 'UModal',
            template: `
              <div
                v-if="open"
                data-test="invest-in-safe-modal"
              >
                <slot name="body" />
              </div>
            `,
            props: ['open'],
            emits: ['update:open']
          },
          SafeDepositRouterForm: {
            name: 'SafeDepositRouterForm',
            template: '<div data-test="safe-deposit-router-form"></div>',
            props: ['safeAddress'],
            emits: ['closeModal']
          },
          IconifyIcon: true
        }
      }
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()
    resetContractMocks()

    // Setup default mock returns
    mockUseSafeDepositRouterDepositsEnabled.mockReturnValue({
      data: ref(true),
      isLoading: ref(false)
    })

    mockUseSafeDepositRouterPaused.mockReturnValue({
      data: ref(false),
      isLoading: ref(false)
    })

    // Setup team store with Safe address
    mockTeamStore.getContractAddressByType = vi.fn((type: ContractType) => {
      if (type === 'Safe') return MOCK_DATA.safeAddress
      return '0x0000000000000000000000000000000000000000'
    }) as unknown as typeof mockTeamStore.getContractAddressByType
  })

  afterEach(() => {
    if (wrapper) wrapper.unmount()
  })

  describe('Component Rendering', () => {
    it('should render the button', () => {
      wrapper = createWrapper()
      expect(wrapper.find(SELECTORS.button).exists()).toBe(true)
    })

    it('should render with correct text', () => {
      wrapper = createWrapper()
      expect(wrapper.find(SELECTORS.button).text()).toContain('Invest & Get SHER')
    })
  })

  describe('Button State - Deposits Enabled', () => {
    it('should enable button when deposits are enabled and contract is not paused', () => {
      mockUseSafeDepositRouterDepositsEnabled.mockReturnValue({
        data: ref(true),
        isLoading: ref(false)
      })
      mockUseSafeDepositRouterPaused.mockReturnValue({
        data: ref(false),
        isLoading: ref(false)
      })

      wrapper = createWrapper()
      const button = wrapper.find(SELECTORS.button)
      expect(button.attributes('disabled')).toBeUndefined()
    })

    it('should disable button when deposits are disabled', () => {
      mockUseSafeDepositRouterDepositsEnabled.mockReturnValue({
        data: ref(false),
        isLoading: ref(false)
      })
      mockUseSafeDepositRouterPaused.mockReturnValue({
        data: ref(false),
        isLoading: ref(false)
      })

      wrapper = createWrapper()
      const button = wrapper.find(SELECTORS.button)
      expect(button.attributes('disabled')).toBeDefined()
    })

    it('should disable button when contract is paused', () => {
      mockUseSafeDepositRouterDepositsEnabled.mockReturnValue({
        data: ref(true),
        isLoading: ref(false)
      })
      mockUseSafeDepositRouterPaused.mockReturnValue({
        data: ref(true),
        isLoading: ref(false)
      })

      wrapper = createWrapper()
      const button = wrapper.find(SELECTORS.button)
      expect(button.attributes('disabled')).toBeDefined()
    })

    it('should disable button when both deposits disabled and contract paused', () => {
      mockUseSafeDepositRouterDepositsEnabled.mockReturnValue({
        data: ref(false),
        isLoading: ref(false)
      })
      mockUseSafeDepositRouterPaused.mockReturnValue({
        data: ref(true),
        isLoading: ref(false)
      })

      wrapper = createWrapper()
      const button = wrapper.find(SELECTORS.button)
      expect(button.attributes('disabled')).toBeDefined()
    })
  })

  describe('Button State - Loading States', () => {
    it('should disable button while deposits enabled is loading', () => {
      mockUseSafeDepositRouterDepositsEnabled.mockReturnValue({
        data: ref(true),
        isLoading: ref(true)
      })
      mockUseSafeDepositRouterPaused.mockReturnValue({
        data: ref(false),
        isLoading: ref(false)
      })

      wrapper = createWrapper()
      const button = wrapper.find(SELECTORS.button)
      expect(button.attributes('disabled')).toBeDefined()
    })

    it('should disable button while paused state is loading', () => {
      mockUseSafeDepositRouterDepositsEnabled.mockReturnValue({
        data: ref(true),
        isLoading: ref(false)
      })
      mockUseSafeDepositRouterPaused.mockReturnValue({
        data: ref(false),
        isLoading: ref(true)
      })

      wrapper = createWrapper()
      const button = wrapper.find(SELECTORS.button)
      expect(button.attributes('disabled')).toBeDefined()
    })

    it('should disable button when both are loading', () => {
      mockUseSafeDepositRouterDepositsEnabled.mockReturnValue({
        data: ref(true),
        isLoading: ref(true)
      })
      mockUseSafeDepositRouterPaused.mockReturnValue({
        data: ref(false),
        isLoading: ref(true)
      })

      wrapper = createWrapper()
      const button = wrapper.find(SELECTORS.button)
      expect(button.attributes('disabled')).toBeDefined()
    })
  })

  describe('Tooltip Behavior', () => {
    it('should show tooltip when deposits are not available', () => {
      mockUseSafeDepositRouterDepositsEnabled.mockReturnValue({
        data: ref(false),
        isLoading: ref(false)
      })

      wrapper = createWrapper()
      const tooltipDiv = wrapper.find(SELECTORS.tooltip)
      expect(tooltipDiv.exists()).toBe(true)
      expect(tooltipDiv.attributes('data-tip')).toBe('SHER compensation deposits are not available')
    })

    it('should not show tooltip when deposits are available', () => {
      mockUseSafeDepositRouterDepositsEnabled.mockReturnValue({
        data: ref(true),
        isLoading: ref(false)
      })
      mockUseSafeDepositRouterPaused.mockReturnValue({
        data: ref(false),
        isLoading: ref(false)
      })

      wrapper = createWrapper()
      const tooltipDiv = wrapper.find(SELECTORS.tooltip)
      expect(tooltipDiv.exists()).toBe(false)
    })
  })

  describe('canDeposit Computed Property', () => {
    it('should return false when deposits loading', () => {
      mockUseSafeDepositRouterDepositsEnabled.mockReturnValue({
        data: ref(true),
        isLoading: ref(true)
      })
      mockUseSafeDepositRouterPaused.mockReturnValue({
        data: ref(false),
        isLoading: ref(false)
      })

      wrapper = createWrapper()
      expect(wrapper.vm.canDeposit).toBe(false)
    })

    it('should return false when paused loading', () => {
      mockUseSafeDepositRouterDepositsEnabled.mockReturnValue({
        data: ref(true),
        isLoading: ref(false)
      })
      mockUseSafeDepositRouterPaused.mockReturnValue({
        data: ref(false),
        isLoading: ref(true)
      })

      wrapper = createWrapper()
      expect(wrapper.vm.canDeposit).toBe(false)
    })

    it('should return true when deposits enabled and not paused', () => {
      mockUseSafeDepositRouterDepositsEnabled.mockReturnValue({
        data: ref(true),
        isLoading: ref(false)
      })
      mockUseSafeDepositRouterPaused.mockReturnValue({
        data: ref(false),
        isLoading: ref(false)
      })

      wrapper = createWrapper()
      expect(wrapper.vm.canDeposit).toBe(true)
    })

    it('should return false when deposits disabled', () => {
      mockUseSafeDepositRouterDepositsEnabled.mockReturnValue({
        data: ref(false),
        isLoading: ref(false)
      })
      mockUseSafeDepositRouterPaused.mockReturnValue({
        data: ref(false),
        isLoading: ref(false)
      })

      wrapper = createWrapper()
      expect(wrapper.vm.canDeposit).toBe(false)
    })

    it('should return false when contract is paused', () => {
      mockUseSafeDepositRouterDepositsEnabled.mockReturnValue({
        data: ref(true),
        isLoading: ref(false)
      })
      mockUseSafeDepositRouterPaused.mockReturnValue({
        data: ref(true),
        isLoading: ref(false)
      })

      wrapper = createWrapper()
      expect(wrapper.vm.canDeposit).toBe(false)
    })
  })
})
