import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import CompensationAmountInput from '../CompensationAmountInput.vue'
import { nextTick } from 'vue'
import { mockInvestorReads } from '@/tests/mocks'

// Test constants
const SELECTORS = {
  compensationAmount: '[data-test="compensation-amount"]',
  compensationInput: '[data-test="compensation-input"]',
  labelTextAlt: '[data-test="compensation-label-text-alt"]',
  labelText: '[data-test="compensation-label-text"]'
} as const

const MOCK_DATA = {
  tokenSymbol: 'SHER',
  depositSymbol: 'USDC',
  defaultRate: '1.5'
} as const

describe('CompensationAmountInput - Advanced Features', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockInvestorReads.symbol.data.value = MOCK_DATA.tokenSymbol
  })

  const createWrapper = (props = {}) => {
    return mount(CompensationAmountInput, {
      props: {
        modelValue: '0',
        depositTokenSymbol: MOCK_DATA.depositSymbol,
        rate: MOCK_DATA.defaultRate,
        ...props
      }
    })
  }

  describe('Rapid State Changes', () => {
    it('handles rapid input changes', async () => {
      const wrapper = createWrapper()
      const input = wrapper.find(SELECTORS.compensationInput)

      await input.setValue('10')
      await input.setValue('100')
      await input.setValue('1000')
      await nextTick()

      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
      const emissions = wrapper.emitted('update:modelValue') as string[][]
      expect(emissions[emissions.length - 1][0]).toBe('1000')
    })

    it('handles rapid prop changes', async () => {
      const wrapper = createWrapper({
        modelValue: '100'
      })

      for (let i = 0; i < 10; i++) {
        await wrapper.setProps({ modelValue: `${100 + i}` })
      }
      await nextTick()

      const input = wrapper.find(SELECTORS.compensationInput)
      expect(input.element.value).toContain('109')
    })

    it('updates when deposit token symbol changes', async () => {
      const wrapper = createWrapper({
        depositTokenSymbol: 'USDC'
      })

      await wrapper.setProps({ depositTokenSymbol: 'DAI' })
      await nextTick()

      const labelAltText = wrapper.find(SELECTORS.labelTextAlt)
      expect(labelAltText.text()).toContain('DAI')
    })
  })

  describe('Slot Customization', () => {
    it('allows custom label via slot', () => {
      const wrapper = mount(CompensationAmountInput, {
        props: {
          modelValue: '0',
          rate: '1.5'
        },
        slots: {
          label: '<span class="custom-label">Custom Label</span>'
        }
      })

      expect(wrapper.find('.custom-label').exists()).toBe(true)
      expect(wrapper.find('.custom-label').text()).toBe('Custom Label')
    })

    it('uses default label when slot is not provided', () => {
      const wrapper = createWrapper()

      const labelText = wrapper.find(SELECTORS.labelText)
      expect(labelText.exists()).toBe(true)
      expect(labelText.text()).toContain('to Receive')
    })
  })

  describe('Edge Cases - Extreme Values', () => {
    it('handles very small decimal values', () => {
      const wrapper = createWrapper({
        modelValue: '0.0000000001',
        decimals: 10
      })

      const input = wrapper.find(SELECTORS.compensationInput)
      expect(input.element.value).toBeDefined()
    })

    it('handles very large values', () => {
      const wrapper = createWrapper({
        modelValue: '999999999999999'
      })

      const input = wrapper.find(SELECTORS.compensationInput)
      expect(input.element.value).toBeDefined()
    })

    it('handles missing investor symbol', () => {
      mockInvestorReads.symbol.data.value = undefined
      const wrapper = createWrapper()

      expect(wrapper.find(SELECTORS.compensationAmount).exists()).toBe(true)
    })
  })

  describe('Integration with Investor Composable', () => {
    it('fetches and displays the token symbol from the composable', () => {
      mockInvestorReads.symbol.data.value = 'TESTSHER'
      const wrapper = createWrapper()

      const labelText = wrapper.find(SELECTORS.labelText)
      expect(labelText.text()).toContain('TESTSHER')
    })

    it('handles loading state of token symbol', () => {
      mockInvestorReads.symbol.data.value = undefined
      mockInvestorReads.symbol.isLoading.value = true
      const wrapper = createWrapper()

      expect(wrapper.find(SELECTORS.compensationAmount).exists()).toBe(true)
    })

    it('updates when token symbol is loaded', async () => {
      mockInvestorReads.symbol.data.value = undefined
      const wrapper = createWrapper()

      mockInvestorReads.symbol.data.value = 'LOADEDSHER'
      await nextTick()

      const labelText = wrapper.find(SELECTORS.labelText)
      expect(labelText.text()).toContain('LOADEDSHER')
    })

    it('updates aria-label when token symbol changes', async () => {
      const wrapper = createWrapper()

      mockInvestorReads.symbol.data.value = 'NEWTOKEN'
      await nextTick()

      const input = wrapper.find(SELECTORS.compensationInput)
      expect(input.attributes('aria-label')).toContain('NEWTOKEN')
    })
  })

  describe('Props Validation', () => {
    it('accepts string rate prop', () => {
      const wrapper = createWrapper({
        rate: '1.5'
      })

      expect(wrapper.props('rate')).toBe('1.5')
    })

    it('accepts number rate prop', () => {
      const wrapper = createWrapper({
        rate: 2.5
      })

      expect(wrapper.props('rate')).toBe(2.5)
    })

    it('uses default values for optional props', () => {
      const wrapper = mount(CompensationAmountInput, {
        props: {
          modelValue: '0',
          rate: '1'
        }
      })

      expect(wrapper.props('depositTokenSymbol')).toBe('USDC')
      expect(wrapper.props('disabled')).toBe(false)
      expect(wrapper.props('showEstimate')).toBe(false)
      expect(wrapper.props('decimals')).toBe(6)
    })
  })

  describe('Error Handling', () => {
    it('falls back safely when numeric props contain invalid values', () => {
      const wrapper = mount(CompensationAmountInput, {
        props: {
          modelValue: '0',
          // @ts-expect-error Testing invalid prop type
          rate: null,
          depositTokenSymbol: 'USDC'
        }
      })

      expect(wrapper.find(SELECTORS.compensationAmount).exists()).toBe(true)
    })

    it('handles undefined decimals prop', () => {
      const wrapper = mount(CompensationAmountInput, {
        props: {
          modelValue: '100.123456',
          rate: '1.5',
          // @ts-expect-error Testing undefined decimals
          decimals: undefined
        }
      })

      const input = wrapper.find(SELECTORS.compensationInput)
      expect(input.element.value).toBeDefined()
    })
  })

  describe('Component Lifecycle', () => {
    it('unmounts after rendering the compensation input', () => {
      const wrapper = createWrapper()
      expect(wrapper.find(SELECTORS.compensationAmount).exists()).toBe(true)

      expect(() => wrapper.unmount()).not.toThrow()
    })

    it('handles multiple mount/unmount cycles', () => {
      for (let i = 0; i < 5; i++) {
        const wrapper = createWrapper()
        expect(wrapper.find(SELECTORS.compensationAmount).exists()).toBe(true)
        wrapper.unmount()
      }
    })
  })
})
