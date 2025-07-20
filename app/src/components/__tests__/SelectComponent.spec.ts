import { mount } from '@vue/test-utils'
import GenericSelect from '@/components/SelectComponent.vue'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { nextTick } from 'vue'

describe('SelectComponent', () => {
  // Test data constants
  const mockOptions = [
    { value: 'ETH', label: 'Ethereum' },
    { value: 'USDC', label: 'USD Coin' },
    { value: 'BTC', label: 'Bitcoin' }
  ]

  const mockOptionsWithoutLabels = [
    { value: 'XRP' },
    { value: 'SOL', label: 'Solana' }
  ]

  // Test selectors
  const SELECTORS = {
    trigger: '[data-test="generic-selector"]',
    dropdown: '[data-test="options-dropdown"]',
    options: 'li',
    optionAnchors: 'a'
  } as const

  describe('Initial Rendering and Value Handling', () => {
    it('should emit initial value when no modelValue is provided', async () => {
      const wrapper = mount(GenericSelect, {
        props: { options: mockOptions }
      })

      await nextTick()

      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
      expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['ETH'])
      expect(wrapper.text()).toContain('Ethereum')
    })

    it('should not emit initial value when modelValue is explicitly provided', async () => {
      const wrapper = mount(GenericSelect, {
        props: {
          options: mockOptions,
          modelValue: 'BTC'
        }
      })

      await nextTick()

      expect(wrapper.emitted('update:modelValue')).toBeFalsy()
      expect(wrapper.text()).toContain('Bitcoin')
    })

    it('should render first option by default when no modelValue provided', () => {
      const wrapper = mount(GenericSelect, {
        props: { options: mockOptions }
      })

      expect(wrapper.text()).toContain('Ethereum')
    })

    it('should render selected option when modelValue is provided', () => {
      const wrapper = mount(GenericSelect, {
        props: {
          options: mockOptions,
          modelValue: 'USDC'
        }
      })

      expect(wrapper.text()).toContain('USD Coin')
    })

    it('should display value when label is missing', () => {
      const wrapper = mount(GenericSelect, {
        props: {
          options: mockOptionsWithoutLabels,
          modelValue: 'XRP'
        }
      })

      expect(wrapper.text()).toContain('XRP')
      expect(wrapper.text()).not.toContain('undefined')
    })

    it('should react to external modelValue changes', async () => {
      const wrapper = mount(GenericSelect, {
        props: {
          options: [
            { value: 'ETH', label: 'Ethereum' },
            { value: 'BTC', label: 'Bitcoin' }
          ],
          modelValue: 'ETH'
        }
      })

      expect(wrapper.text()).toContain('Ethereum')

      await wrapper.setProps({ modelValue: 'BTC' })
      await nextTick()

      expect(wrapper.text()).toContain('Bitcoin')
    })
  })

  describe('Format Value Function', () => {
    it('should apply formatValue function to displayed text', () => {
      const wrapper = mount(GenericSelect, {
        props: {
          options: mockOptions,
          modelValue: 'ETH',
          formatValue: (val: string) => `[${val}]`
        }
      })

      expect(wrapper.text()).toContain('[Ethereum]')
    })
  })

  describe('Dropdown Interaction', () => {
    it('should show dropdown when trigger is clicked', async () => {
      const wrapper = mount(GenericSelect, {
        props: { options: mockOptions }
      })

      await wrapper.find(SELECTORS.trigger).trigger('click')
      await nextTick()
      
      expect(wrapper.find(SELECTORS.dropdown).exists()).toBe(true)
    })

    it('should not show dropdown when component is disabled', async () => {
      const wrapper = mount(GenericSelect, {
        props: {
          options: mockOptions,
          disabled: true
        }
      })

      await wrapper.find(SELECTORS.trigger).trigger('click')
      await nextTick()
      
      expect(wrapper.find(SELECTORS.dropdown).exists()).toBe(false)
    })

    it('should close dropdown after option selection', async () => {
      const wrapper = mount(GenericSelect, {
        props: { options: mockOptions }
      })

      await wrapper.find(SELECTORS.trigger).trigger('click')
      await wrapper.findAll(SELECTORS.options)[0].trigger('click')
      await nextTick()

      expect(wrapper.find(SELECTORS.dropdown).exists()).toBe(false)
    })

    it('should emit update:modelValue when option is selected', async () => {
      const testOptions = [
        { value: 'ETH', label: 'Ethereum' },
        { value: 'USDC', label: 'USD Coin' }
      ]

      const wrapper = mount(GenericSelect, {
        props: {
          options: testOptions,
          modelValue: undefined
        }
      })

      await nextTick() // Wait for initial emission

      // Perform selection
      await wrapper.find(SELECTORS.trigger).trigger('click')
      await wrapper.findAll(SELECTORS.options)[1].trigger('click')

      const emissions = wrapper.emitted('update:modelValue')
      expect(emissions).toBeTruthy()
      expect(emissions).toHaveLength(2) // Initial + selection
      expect(emissions?.[1]).toEqual(['USDC'])
    })
  })

  describe('Keyboard Navigation', () => {
    it('should open dropdown when Enter key is pressed', async () => {
      const wrapper = mount(GenericSelect, {
        props: { options: mockOptions }
      })

      await wrapper.find(SELECTORS.trigger).trigger('keydown.enter')
      await nextTick()

      expect(wrapper.find(SELECTORS.dropdown).exists()).toBe(true)
    })

    it('should open dropdown when Space key is pressed', async () => {
      const wrapper = mount(GenericSelect, {
        props: { options: mockOptions }
      })

      await wrapper.find(SELECTORS.trigger).trigger('keydown.space')
      await nextTick()

      expect(wrapper.find(SELECTORS.dropdown).exists()).toBe(true)
    })

    it('should close dropdown when Escape key is pressed', async () => {
      const wrapper = mount(GenericSelect, {
        props: { options: mockOptions }
      })

      // Open dropdown first
      await wrapper.find(SELECTORS.trigger).trigger('click')
      await nextTick()
      expect(wrapper.find(SELECTORS.dropdown).exists()).toBe(true)

      // Close with Escape
      await wrapper.find(SELECTORS.trigger).trigger('keydown.escape')
      await nextTick()
      expect(wrapper.find(SELECTORS.dropdown).exists()).toBe(false)
    })

    it('should navigate options with arrow keys and highlight focused option', async () => {
      const wrapper = mount(GenericSelect, {
        props: { options: mockOptions }
      })

      await wrapper.find(SELECTORS.trigger).trigger('click')
      await nextTick()

      // Navigate down to second option
      await wrapper.find(SELECTORS.trigger).trigger('keydown', { key: 'ArrowDown' })
      await nextTick()

      const anchors = wrapper.findAll(SELECTORS.optionAnchors)
      expect(anchors[1].classes()).toContain('focus')

      // Navigate back up to first option
      await wrapper.find(SELECTORS.trigger).trigger('keydown', { key: 'ArrowUp' })
      await nextTick()

      expect(anchors[0].classes()).toContain('focus')
    })

    it('should respect option boundaries during keyboard navigation', async () => {
      const wrapper = mount(GenericSelect, {
        props: { options: mockOptions }
      })

      await wrapper.find(SELECTORS.trigger).trigger('click')
      await nextTick()

      const anchors = wrapper.findAll(SELECTORS.optionAnchors)
      const trigger = wrapper.find(SELECTORS.trigger)

      // Try to navigate above first option - should stay at first
      await trigger.trigger('keydown', { key: 'ArrowUp' })
      await nextTick()
      expect(anchors[0].classes()).toContain('focus')

      // Navigate to last option and try to go beyond
      await trigger.trigger('keydown', { key: 'ArrowDown' })
      await trigger.trigger('keydown', { key: 'ArrowDown' })
      await trigger.trigger('keydown', { key: 'ArrowDown' }) // Try to go beyond last
      await nextTick()

      expect(anchors[2].classes()).toContain('focus') // Should stay at last option
    })

    it('should ignore keyboard navigation when dropdown is closed', async () => {
      const wrapper = mount(GenericSelect, {
        props: { options: mockOptions }
      })

      await wrapper.find(SELECTORS.trigger).trigger('keydown', { key: 'ArrowDown' })
      await nextTick()

      expect(wrapper.find(SELECTORS.dropdown).exists()).toBe(false)
    })

    it('should handle basic keyboard functionality correctly', async () => {
      const wrapper = mount(GenericSelect, {
        props: { options: mockOptions, modelValue: 'ETH' }
      })

      await nextTick()

      expect(wrapper.vm).toBeDefined()
      
      // Test dropdown opening with keyboard
      await wrapper.find(SELECTORS.trigger).trigger('keydown.enter')
      await nextTick()
      expect(wrapper.find(SELECTORS.dropdown).exists()).toBe(true)
      
      // Test dropdown closing with escape
      await wrapper.find(SELECTORS.trigger).trigger('keydown.escape')
      await nextTick()
      expect(wrapper.find(SELECTORS.dropdown).exists()).toBe(false)
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle empty options array gracefully', () => {
      const wrapper = mount(GenericSelect, {
        props: {
          options: [],
          modelValue: 'test'
        }
      })

      expect(wrapper.text()).toBe('')
    })

    it('should handle formatValue function errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      
      const wrapper = mount(GenericSelect, {
        props: {
          options: mockOptions,
          modelValue: 'ETH',
          formatValue: () => {
            throw new Error('Format error')
          }
        }
      })

      expect(wrapper.text()).toContain('Ethereum')
      expect(consoleSpy).toHaveBeenCalledWith('Error formatting select value:', expect.any(Error))
      
      consoleSpy.mockRestore()
    })

    it('should prevent interaction when component is disabled', async () => {
      const wrapper = mount(GenericSelect, {
        props: {
          options: mockOptions,
          disabled: true,
          modelValue: 'ETH'
        }
      })

      await wrapper.find(SELECTORS.trigger).trigger('click')
      await nextTick()

      expect(wrapper.find(SELECTORS.dropdown).exists()).toBe(false)
    })
  })
})
