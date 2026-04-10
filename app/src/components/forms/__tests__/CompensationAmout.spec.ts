import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import CompensationAmount from '../CompensationAmount.vue'
import { nextTick } from 'vue'
import { mockInvestorReads, resetContractMocks } from '@/tests/mocks'

// Test constants
const SELECTORS = {
  compensationAmount: '[data-test="compensation-amount"]',
  compensationInput: '[data-test="compensation-input"]',
  tokenSymbolBadge: '[data-test="token-symbol-badge"]',
  labelText: '.label-text',
  labelTextAlt: '.label-text-alt'
} as const

const MOCK_DATA = {
  defaultValue: '0',
  validAmount: '100.5',
  largeAmount: '1000000.123456',
  smallAmount: '0.000001',
  invalidAmount: '-50',
  emptyString: '',
  zeroValue: '0',
  tokenSymbol: 'SHER',
  depositSymbol: 'USDC',
  defaultRate: '1.5',
  zeroRate: '0',
  highRate: '2.5'
} as const

describe('CompensationAmount', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetContractMocks()
    mockInvestorReads.symbol.data.value = MOCK_DATA.tokenSymbol
  })

  afterEach(() => {
    resetContractMocks()
  })

  const createWrapper = (props = {}) => {
    return mount(CompensationAmount, {
      props: {
        modelValue: MOCK_DATA.defaultValue,
        depositTokenSymbol: MOCK_DATA.depositSymbol,
        rate: MOCK_DATA.defaultRate,
        ...props
      }
    })
  }

  describe('Component Rendering', () => {
    it('should render the component with all required elements', () => {
      const wrapper = createWrapper()

      expect(wrapper.find(SELECTORS.compensationAmount).exists()).toBe(true)
      expect(wrapper.find(SELECTORS.compensationInput).exists()).toBe(true)
      expect(wrapper.find(SELECTORS.tokenSymbolBadge).exists()).toBe(true)
    })

    it('should display correct label text with token symbol', () => {
      const wrapper = createWrapper()

      const labelText = wrapper.find(SELECTORS.labelText)
      expect(labelText.text()).toContain(`${MOCK_DATA.tokenSymbol} to Receive`)
    })

    it('should display rate information in label alt text', () => {
      const wrapper = createWrapper()

      const labelAltText = wrapper.find(SELECTORS.labelTextAlt)
      expect(labelAltText.text()).toContain('Rate: 1')
      expect(labelAltText.text()).toContain(MOCK_DATA.depositSymbol)
      expect(labelAltText.text()).toContain(MOCK_DATA.tokenSymbol)
    })

    it('should display token symbol in badge', () => {
      const wrapper = createWrapper()

      const badge = wrapper.find(SELECTORS.tokenSymbolBadge)
      expect(badge.text()).toBe(MOCK_DATA.tokenSymbol.toUpperCase())
    })
  })

  describe('Input Value Display', () => {
    it('should display formatted value for valid amount', () => {
      const wrapper = createWrapper({
        modelValue: MOCK_DATA.validAmount
      })

      const input = wrapper.find(SELECTORS.compensationInput)
      expect(input.element.value).toBe('100.5')
    })

    it('should display zero for empty or zero value', () => {
      const wrapper = createWrapper({
        modelValue: MOCK_DATA.zeroValue
      })

      const input = wrapper.find(SELECTORS.compensationInput)
      expect(input.element.value).toBe('0')
    })

    it('should format large amounts correctly', () => {
      const wrapper = createWrapper({
        modelValue: MOCK_DATA.largeAmount,
        decimals: 6
      })

      const input = wrapper.find(SELECTORS.compensationInput)
      expect(input.element.value).toContain('1,000,000.123456')
    })

    it('should format small amounts with proper decimals', () => {
      const wrapper = createWrapper({
        modelValue: MOCK_DATA.smallAmount,
        decimals: 6
      })

      const input = wrapper.find(SELECTORS.compensationInput)
      expect(input.element.value).toBe('0.000001')
    })

    it('should update display value when modelValue prop changes', async () => {
      const wrapper = createWrapper({
        modelValue: '50'
      })

      await wrapper.setProps({ modelValue: '75' })
      await nextTick()

      const input = wrapper.find(SELECTORS.compensationInput)
      expect(input.element.value).toContain('75')
    })
  })

  describe('Rate Formatting', () => {
    it('should format rate as string correctly', () => {
      const wrapper = createWrapper({
        rate: MOCK_DATA.defaultRate
      })

      const labelAltText = wrapper.find(SELECTORS.labelTextAlt)
      expect(labelAltText.text()).toContain('1.5')
    })

    it('should format rate as number correctly', () => {
      const wrapper = createWrapper({
        rate: 2.5
      })

      const labelAltText = wrapper.find(SELECTORS.labelTextAlt)
      expect(labelAltText.text()).toContain('2.5')
    })

    it('should handle zero rate', () => {
      const wrapper = createWrapper({
        rate: MOCK_DATA.zeroRate
      })

      const labelAltText = wrapper.find(SELECTORS.labelTextAlt)
      expect(labelAltText.text()).toContain('0')
    })

    it('should respect decimals prop for rate formatting', () => {
      const wrapper = createWrapper({
        rate: '1.123456789',
        decimals: 4
      })

      const labelAltText = wrapper.find(SELECTORS.labelTextAlt)
      expect(labelAltText.text()).toContain('1.1235')
    })
  })

  describe('User Input Handling', () => {
    it('should emit update:modelValue when user types valid amount', async () => {
      const wrapper = createWrapper()
      const input = wrapper.find(SELECTORS.compensationInput)

      await input.setValue('150')
      await nextTick()

      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
      expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['150'])
    })

    it('should emit zero when input is cleared', async () => {
      const wrapper = createWrapper({
        modelValue: '100'
      })
      const input = wrapper.find(SELECTORS.compensationInput)

      await input.setValue('')
      await nextTick()

      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
      expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['0'])
    })

    it('should handle decimal input', async () => {
      const wrapper = createWrapper()
      const input = wrapper.find(SELECTORS.compensationInput)

      await input.setValue('123.456')
      await nextTick()

      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
      expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['123.456'])
    })

    it('should not emit for negative values', async () => {
      const wrapper = createWrapper()
      const input = wrapper.find(SELECTORS.compensationInput)

      await input.setValue(MOCK_DATA.invalidAmount)
      await nextTick()

      expect(wrapper.emitted('update:modelValue')).toBeFalsy()
    })

    it('should not emit for non-numeric values', async () => {
      const wrapper = createWrapper()
      const input = wrapper.find(SELECTORS.compensationInput)

      await input.setValue('abc')
      await nextTick()

      expect(wrapper.emitted('update:modelValue')).toBeFalsy()
    })
  })

  describe('Disabled State', () => {
    it('should disable input when disabled prop is true', () => {
      const wrapper = createWrapper({
        disabled: true
      })

      const input = wrapper.find(SELECTORS.compensationInput)
      expect(input.attributes('disabled')).toBeDefined()
    })

    it('should enable input when disabled prop changes to false', async () => {
      const wrapper = createWrapper({
        disabled: true
      })

      await wrapper.setProps({ disabled: false })
      await nextTick()

      const input = wrapper.find(SELECTORS.compensationInput)
      expect(input.attributes('disabled')).toBeUndefined()
    })
  })

  describe('Custom Decimals', () => {
    it('should use custom decimals for formatting', () => {
      const wrapper = createWrapper({
        modelValue: '100.123456789',
        decimals: 2
      })

      const input = wrapper.find(SELECTORS.compensationInput)
      expect(input.element.value).toContain('100.12')
    })

    it('should handle decimals prop change', async () => {
      const wrapper = createWrapper({
        modelValue: '100.123456',
        decimals: 2
      })

      await wrapper.setProps({ decimals: 4 })
      await nextTick()

      const input = wrapper.find(SELECTORS.compensationInput)
      expect(input.element.value).toContain('100.1235')
    })

    it('should use default decimals when not specified', () => {
      const wrapper = createWrapper({
        modelValue: '100.123456789'
      })

      const input = wrapper.find(SELECTORS.compensationInput)
      expect(input.element.value).toContain('100.123457')
    })
  })

  describe('Accessibility', () => {
    it('should have proper aria-label for input', () => {
      const wrapper = createWrapper()

      const input = wrapper.find(SELECTORS.compensationInput)
      expect(input.attributes('aria-label')).toContain(MOCK_DATA.tokenSymbol)
      expect(input.attributes('aria-label')).toContain('amount to receive')
    })

    it('should have proper aria-label for token badge', () => {
      const wrapper = createWrapper()

      const badge = wrapper.find(SELECTORS.tokenSymbolBadge)
      expect(badge.attributes('aria-label')).toContain('Token symbol:')
      expect(badge.attributes('aria-label')).toContain(MOCK_DATA.tokenSymbol)
    })
  })
})
