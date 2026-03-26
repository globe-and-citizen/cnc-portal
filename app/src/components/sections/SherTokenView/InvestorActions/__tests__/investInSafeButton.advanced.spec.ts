import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { nextTick, ref } from 'vue'
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
  modal: '[data-test="invest-in-safe-modal"]'
} as const

const MOCK_DATA = {
  safeAddress: '0x1234567890123456789012345678901234567890' as Address
} as const

describe('InvestInSafeButton - Advanced Features', () => {
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
                <slot />
              </button>
            `,
            props: ['variant', 'outline', 'disabled']
          },
          ModalComponent: {
            name: 'ModalComponent',
            template: `
              <div 
                v-if="modelValue" 
                data-test="invest-in-safe-modal"
              >
                <slot />
              </div>
            `,
            props: ['modelValue'],
            emits: ['reset', 'update:modelValue']
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

  describe('Modal Interaction', () => {
    it('should not show modal initially', () => {
      wrapper = createWrapper()
      expect(wrapper.find(SELECTORS.modal).exists()).toBe(false)
    })

    it('should open modal when button is clicked', async () => {
      wrapper = createWrapper()
      await wrapper.find(SELECTORS.button).trigger('click')
      await nextTick()

      expect(wrapper.vm.modal.mount).toBe(true)
      expect(wrapper.vm.modal.show).toBe(true)
    })

    it('should show modal with SafeDepositRouterForm when opened', async () => {
      wrapper = createWrapper()
      await wrapper.find(SELECTORS.button).trigger('click')
      await nextTick()

      expect(wrapper.find(SELECTORS.modal).exists()).toBe(true)
      expect(wrapper.find('[data-test="safe-deposit-router-form"]').exists()).toBe(true)
    })

    it.skip('should pass Safe address to SafeDepositRouterForm', async () => {
      wrapper = createWrapper()
      await wrapper.find(SELECTORS.button).trigger('click')
      await nextTick()

      const depositForm = wrapper.findComponent({ name: 'SafeDepositRouterForm' })
      expect(depositForm.props('safeAddress')).toBe(MOCK_DATA.safeAddress)
    })

    it('should close modal when closeModal is called', async () => {
      wrapper = createWrapper()
      await wrapper.find(SELECTORS.button).trigger('click')
      await nextTick()

      expect(wrapper.vm.modal.show).toBe(true)

      wrapper.vm.closeModal()
      await nextTick()

      expect(wrapper.vm.modal.mount).toBe(false)
      expect(wrapper.vm.modal.show).toBe(false)
    })

    it('should close modal when SafeDepositRouterForm emits closeModal', async () => {
      wrapper = createWrapper()
      await wrapper.find(SELECTORS.button).trigger('click')
      await nextTick()

      const depositForm = wrapper.findComponent({ name: 'SafeDepositRouterForm' })
      await depositForm.vm.$emit('closeModal')
      await nextTick()

      expect(wrapper.vm.modal.mount).toBe(false)
      expect(wrapper.vm.modal.show).toBe(false)
    })
  })

  describe('Reactive State Changes', () => {
    it('should update button state when deposits enabled changes', async () => {
      const depositsEnabledRef = ref(true)
      mockUseSafeDepositRouterDepositsEnabled.mockReturnValue({
        data: depositsEnabledRef,
        isLoading: ref(false)
      })
      mockUseSafeDepositRouterPaused.mockReturnValue({
        data: ref(false),
        isLoading: ref(false)
      })

      wrapper = createWrapper()
      let button = wrapper.find('[data-test="invest-in-safe-button"]')
      expect((button.element as HTMLButtonElement).disabled).toBe(false)

      depositsEnabledRef.value = false
      await nextTick()

      button = wrapper.find('[data-test="invest-in-safe-button"]')
      expect((button.element as HTMLButtonElement).disabled).toBe(true)
    })

    it('should update button state when paused state changes', async () => {
      const pausedRef = ref(false)
      mockUseSafeDepositRouterDepositsEnabled.mockReturnValue({
        data: ref(true),
        isLoading: ref(false)
      })
      mockUseSafeDepositRouterPaused.mockReturnValue({
        data: pausedRef,
        isLoading: ref(false)
      })

      wrapper = createWrapper()
      let button = wrapper.find('[data-test="invest-in-safe-button"]')
      expect((button.element as HTMLButtonElement).disabled).toBe(false)

      pausedRef.value = true
      await nextTick()

      button = wrapper.find('[data-test="invest-in-safe-button"]')
      expect((button.element as HTMLButtonElement).disabled).toBe(true)
    })
  })

  describe('Edge Cases - Address Validation', () => {
    it('should not validate zero address - component accepts any truthy address', () => {
      mockTeamStore.getContractAddressByType = vi.fn(
        () => '0x0000000000000000000000000000000000000000'
      ) as unknown as typeof mockTeamStore.getContractAddressByType

      wrapper = createWrapper()
      const button = wrapper.find('[data-test="invest-in-safe-button"]')
      // Component currently doesn't validate zero address, button is enabled
      expect((button.element as HTMLButtonElement).disabled).toBe(false)
    })

    it('should disable button when Safe address is empty string', () => {
      mockTeamStore.getContractAddressByType = vi.fn(
        () => ''
      ) as unknown as typeof mockTeamStore.getContractAddressByType

      wrapper = createWrapper()
      const button = wrapper.find('[data-test="invest-in-safe-button"]')
      expect((button.element as HTMLButtonElement).disabled).toBe(true)
    })

    it('should disable button when Safe address is null', () => {
      mockTeamStore.getContractAddressByType = vi.fn(
        () => null
      ) as unknown as typeof mockTeamStore.getContractAddressByType

      wrapper = createWrapper()
      const button = wrapper.find('[data-test="invest-in-safe-button"]')
      expect((button.element as HTMLButtonElement).disabled).toBe(true)
    })

    it('should disable button when Safe address is undefined', () => {
      mockTeamStore.getContractAddressByType = vi.fn(
        () => undefined
      ) as unknown as typeof mockTeamStore.getContractAddressByType

      wrapper = createWrapper()
      const button = wrapper.find('[data-test="invest-in-safe-button"]')
      expect((button.element as HTMLButtonElement).disabled).toBe(true)
    })
  })

  describe('Edge Cases - Data States', () => {
    it('should handle undefined deposits enabled data', () => {
      mockUseSafeDepositRouterDepositsEnabled.mockReturnValue({
        data: ref(undefined),
        isLoading: ref(false)
      })
      mockUseSafeDepositRouterPaused.mockReturnValue({
        data: ref(false),
        isLoading: ref(false)
      })

      wrapper = createWrapper()
      const button = wrapper.find('[data-test="invest-in-safe-button"]')
      expect((button.element as HTMLButtonElement).disabled).toBe(true)
    })

    it('should handle undefined paused data', () => {
      mockUseSafeDepositRouterDepositsEnabled.mockReturnValue({
        data: ref(true),
        isLoading: ref(false)
      })
      mockUseSafeDepositRouterPaused.mockReturnValue({
        data: ref(undefined),
        isLoading: ref(false)
      })

      wrapper = createWrapper()
      const button = wrapper.find('[data-test="invest-in-safe-button"]')
      expect((button.element as HTMLButtonElement).disabled).toBe(true)
    })
  })

  describe('Edge Cases - Form Rendering', () => {
    it('should render SafeDepositRouterForm even with zero address', async () => {
      mockTeamStore.getContractAddressByType = vi.fn(
        () => '0x0000000000000000000000000000000000000000'
      ) as unknown as typeof mockTeamStore.getContractAddressByType

      wrapper = createWrapper()
      await wrapper.find(SELECTORS.button).trigger('click')
      await nextTick()

      // Component renders form for any truthy address including zero address
      expect(wrapper.find('[data-test="safe-deposit-router-form"]').exists()).toBe(true)
    })

    it('should not render SafeDepositRouterForm when Safe address is undefined', async () => {
      mockTeamStore.getContractAddressByType = vi.fn(
        () => undefined
      ) as unknown as typeof mockTeamStore.getContractAddressByType

      wrapper = createWrapper()
      wrapper.vm.modal = { mount: true, show: true }
      await nextTick()

      expect(wrapper.find('[data-test="safe-deposit-router-form"]').exists()).toBe(false)
    })
  })

  describe('Component Integration', () => {
    it('should call team store to get Safe address', () => {
      wrapper = createWrapper()
      expect(mockTeamStore.getContractAddressByType).toHaveBeenCalledWith('Safe')
    })

    it('should have ref to deposit form when modal is open', async () => {
      wrapper = createWrapper()
      await wrapper.find(SELECTORS.button).trigger('click')
      await nextTick()

      expect(wrapper.vm.$refs.depositFormRef).toBeDefined()
    })
  })
})
