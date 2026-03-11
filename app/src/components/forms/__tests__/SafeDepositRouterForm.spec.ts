import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { nextTick, ref } from 'vue'
import { type Address } from 'viem'
import SafeDepositRouterForm from '@/components/forms/SafeDepositRouterForm.vue'
import {
  mockERC20Reads,
  resetERC20Mocks,
  mockInvestorReads,
  mockUseContractBalance
} from '@/tests/mocks'

// Hoisted mocks - ONLY mock functions, NO refs
const { mockUseSafeDepositRouterAddress, mockUseSafeDepositRouterMultiplier, mockUseDeposit } =
  vi.hoisted(() => ({
    mockUseSafeDepositRouterAddress: vi.fn(),
    mockUseSafeDepositRouterMultiplier: vi.fn(),
    mockUseDeposit: vi.fn()
  }))

// Mock SafeDepositRouter composables
vi.mock('@/composables/safeDepositRouter/reads', () => ({
  useSafeDepositRouterAddress: mockUseSafeDepositRouterAddress,
  useSafeDepositRouterMultiplier: mockUseSafeDepositRouterMultiplier
}))

vi.mock('@/composables/safeDepositRouter/writes', () => ({
  useDeposit: mockUseDeposit
}))

// Create reactive refs AFTER imports - outside hoisted scope
const mockMultiplierData = ref(1500000n)
const mockRouterAddressValue = ref('0xRouter0000000000000000000000000000000000' as Address)
const mockMultiplierIsLoading = ref(false)

// Test constants
const SELECTORS = {
  tokenAmount: '[data-test="token-amount"]',
  compensationAmount: '.label-text',
  cancelButton: '[data-test="cancel-button"]',
  depositButton: '[data-test="deposit-button"]',
  steps: '.steps',
  step: '.step'
} as const

const MOCK_DATA = {
  safeDepositRouterAddress: '0xRouter0000000000000000000000000000000000' as Address,
  multiplier: 1500000n, // 1.5x in 6 decimals
  tokenSymbol: 'SHER',
  amount: '100',
  sherAmount: '150'
} as const

describe('SafeDepositRouterForm', () => {
  const mockDepositWrite = {
    executeWrite: vi.fn(),
    writeResult: {
      isPending: ref(false),
      error: ref(null)
    },
    receiptResult: {
      isSuccess: ref(false)
    }
  }

  const createWrapper = (overrides = {}) =>
    mount(SafeDepositRouterForm, {
      props: { ...overrides },
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })]
      }
    })

  // Helper function to set TokenAmount values
  const setTokenAmount = async (
    wrapper: ReturnType<typeof createWrapper>,
    value: string,
    isValid: boolean = true
  ): Promise<void> => {
    const tokenAmount = wrapper.findComponent({ name: 'TokenAmount' })
    await tokenAmount.vm.$emit('update:modelValue', value)
    await tokenAmount.vm.$emit('validation', isValid)
    await nextTick()
  }

  beforeEach(() => {
    vi.clearAllMocks()
    resetERC20Mocks()

    // Reset reactive refs
    mockMultiplierData.value = MOCK_DATA.multiplier
    mockRouterAddressValue.value = MOCK_DATA.safeDepositRouterAddress
    mockMultiplierIsLoading.value = false
    mockDepositWrite.writeResult.isPending.value = false
    mockDepositWrite.writeResult.error.value = null
    mockDepositWrite.receiptResult.isSuccess.value = false

    // Reset contract balance loading state
    mockUseContractBalance.isLoading.value = false

    // Setup default mock returns with reactive refs
    mockUseSafeDepositRouterAddress.mockReturnValue(mockRouterAddressValue)

    mockUseSafeDepositRouterMultiplier.mockReturnValue({
      data: mockMultiplierData,
      error: ref(null),
      isLoading: mockMultiplierIsLoading
    })

    mockInvestorReads.symbol.data.value = MOCK_DATA.tokenSymbol
    mockInvestorReads.symbol.isLoading.value = false

    mockUseDeposit.mockReturnValue(mockDepositWrite)

    mockERC20Reads.allowance.data.value = 0n
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Component Rendering', () => {
    it('should render the component with all required elements', () => {
      const wrapper = createWrapper()

      expect(wrapper.find(SELECTORS.steps).exists()).toBe(true)
      expect(wrapper.findComponent({ name: 'TokenAmount' }).exists()).toBe(true)
      expect(wrapper.findComponent({ name: 'CompensationAmount' }).exists()).toBe(true)
      expect(wrapper.find(SELECTORS.cancelButton).exists()).toBe(true)
      expect(wrapper.find(SELECTORS.depositButton).exists()).toBe(true)
    })

    it('should display correct title with token symbol', () => {
      const wrapper = createWrapper()

      expect(wrapper.text()).toContain(`Invest in Safe & Earn ${MOCK_DATA.tokenSymbol}`)
    })

    it('should show three steps for deposit workflow', () => {
      const wrapper = createWrapper()

      const steps = wrapper.findAll(SELECTORS.step)
      expect(steps).toHaveLength(3)
      expect(steps[0].text()).toBe('Amount')
      expect(steps[1].text()).toBe('Approval')
      expect(steps[2].text()).toBe('Deposit')
    })

    it('should highlight current step', async () => {
      const wrapper = createWrapper()

      const steps = wrapper.findAll(SELECTORS.step)
      expect(steps[0].classes()).toContain('step-primary')
      expect(steps[1].classes()).not.toContain('step-primary')
    })
  })

  describe('Token Amount Input', () => {
    it('should update amount when TokenAmount emits update', async () => {
      const wrapper = createWrapper()
      await setTokenAmount(wrapper, MOCK_DATA.amount, true)

      expect(wrapper.vm.amount).toBe(MOCK_DATA.amount)
    })

    it('should calculate SHER compensation when amount changes', async () => {
      const wrapper = createWrapper()
      await setTokenAmount(wrapper, MOCK_DATA.amount, true)

      // 100 USDC * 1.5 multiplier = 150 SHER
      expect(wrapper.vm.sherAmount).toBe(MOCK_DATA.sherAmount)
    })

    it('should update validation state from TokenAmount', async () => {
      const wrapper = createWrapper()
      await setTokenAmount(wrapper, MOCK_DATA.amount, true)

      expect(wrapper.vm.isAmountValid).toBe(true)
    })

    it('should handle zero amount correctly', async () => {
      const wrapper = createWrapper()
      await setTokenAmount(wrapper, '0', false)

      expect(wrapper.vm.sherAmount).toBe('0')
    })
  })

  describe('Compensation Amount Display', () => {
    it('should display calculated SHER compensation', async () => {
      const wrapper = createWrapper()
      await setTokenAmount(wrapper, MOCK_DATA.amount, true)

      const compensationAmount = wrapper.findComponent({ name: 'CompensationAmount' })
      expect(compensationAmount.props('modelValue')).toBe(MOCK_DATA.sherAmount)
    })

    it('should show correct deposit token symbol', async () => {
      const wrapper = createWrapper()

      const compensationAmount = wrapper.findComponent({ name: 'CompensationAmount' })
      expect(compensationAmount.props('depositTokenSymbol')).toBe('USDC')
    })

    it('should show formatted multiplier rate', async () => {
      const wrapper = createWrapper()

      const compensationAmount = wrapper.findComponent({ name: 'CompensationAmount' })
      expect(compensationAmount.props('rate')).toBe('1.5')
    })

    it('should disable compensation input when loading', async () => {
      // Set balance loading to trigger isLoading computed
      mockUseContractBalance.isLoading.value = true
      const wrapper = createWrapper()
      await nextTick()

      const compensationAmount = wrapper.findComponent({ name: 'CompensationAmount' })
      expect(compensationAmount.props('disabled')).toBe(true)
    })
  })

  describe('Bidirectional Amount Calculation', () => {
    it('should update deposit amount when SHER amount changes', async () => {
      const wrapper = createWrapper()

      const compensationAmount = wrapper.findComponent({ name: 'CompensationAmount' })
      await compensationAmount.vm.$emit('update:modelValue', MOCK_DATA.sherAmount)
      await nextTick()

      // 150 SHER / 1.5 multiplier = 100 USDC
      expect(wrapper.vm.amount).toBe(MOCK_DATA.amount)
    })

    it('should handle SHER amount input of zero', async () => {
      const wrapper = createWrapper()

      const compensationAmount = wrapper.findComponent({ name: 'CompensationAmount' })
      await compensationAmount.vm.$emit('update:modelValue', '0')
      await nextTick()

      expect(wrapper.vm.amount).toBe('0')
    })

    it('should recalculate SHER when multiplier changes', async () => {
      const wrapper = createWrapper()
      await setTokenAmount(wrapper, MOCK_DATA.amount, true)

      // Verify initial calculation
      expect(wrapper.vm.sherAmount).toBe('150')

      // Change multiplier to 2.0x using the reactive ref
      mockMultiplierData.value = 2000000n
      await nextTick()
      await flushPromises()

      // Should recalculate: 100 * 2.0 = 200
      expect(wrapper.vm.sherAmount).toBe('200')
    })
  })

  describe('Form Reset', () => {
    it('should reset form when cancel button is clicked', async () => {
      const wrapper = createWrapper()
      await setTokenAmount(wrapper, MOCK_DATA.amount, true)

      await wrapper.find(SELECTORS.cancelButton).trigger('click')
      await nextTick()

      expect(wrapper.vm.amount).toBe('')
      expect(wrapper.vm.sherAmount).toBe('0')
      expect(wrapper.vm.currentStep).toBe(1)
      expect(wrapper.emitted('closeModal')).toBeTruthy()
    })

    it('should expose reset method', () => {
      const wrapper = createWrapper()

      expect(typeof wrapper.vm.reset).toBe('function')
      expect(() => wrapper.vm.reset()).not.toThrow()
    })

    it('should reset all state when reset is called', async () => {
      const wrapper = createWrapper()
      await setTokenAmount(wrapper, MOCK_DATA.amount, true)

      wrapper.vm.reset()
      await nextTick()

      expect(wrapper.vm.amount).toBe('')
      expect(wrapper.vm.sherAmount).toBe('0')
      expect(wrapper.vm.selectedTokenId).toBe('usdc')
      expect(wrapper.vm.currentStep).toBe(1)
      expect(wrapper.vm.submitting).toBe(false)
      expect(wrapper.vm.isAmountValid).toBe(false)
    })

    it('should reset step to 1 when amount changes', async () => {
      const wrapper = createWrapper()
      wrapper.vm.currentStep = 3
      await nextTick()

      await setTokenAmount(wrapper, '50', true)
      await nextTick()

      expect(wrapper.vm.currentStep).toBe(1)
    })
  })
})
