import { mount } from '@vue/test-utils'
import GenericSelect from '@/components/SelectComponent.vue'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { nextTick } from 'vue'

describe('GenericSelect', () => {
  const options = [
    { value: 'ETH', label: 'Ethereum' },
    { value: 'USDC', label: 'USD Coin' },
    { value: 'BTC', label: 'Bitcoin' }
  ]

  it('emits initial value when no modelValue is provided', async () => {
    const wrapper = mount(GenericSelect, {
      props: { options }
    })

    await nextTick()

    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['ETH'])
    expect(wrapper.text()).toContain('Ethereum')
  })

  it('does not emit initial value when modelValue is provided', async () => {
    const wrapper = mount(GenericSelect, {
      props: {
        options,
        modelValue: 'BTC'
      }
    })

    await nextTick()

    expect(wrapper.emitted('update:modelValue')).toBeFalsy()
    expect(wrapper.text()).toContain('Bitcoin')
  })

  it('renders with default first option when no modelValue provided', () => {
    const wrapper = mount(GenericSelect, {
      props: {
        options
      }
    })

    expect(wrapper.text()).toContain('Ethereum')
  })

  it('renders with modelValue when provided', () => {
    const wrapper = mount(GenericSelect, {
      props: {
        options,
        modelValue: 'USDC'
      }
    })

    expect(wrapper.text()).toContain('USD Coin')
  })

  it('applies formatValue function to displayed text', () => {
    const wrapper = mount(GenericSelect, {
      props: {
        options,
        modelValue: 'ETH',
        formatValue: (val: string) => `[${val}]`
      }
    })

    expect(wrapper.text()).toContain('[Ethereum]')
  })

  it('shows dropdown when clicked', async () => {
    const wrapper = mount(GenericSelect, {
      props: { options }
    })

    await wrapper.find('[data-test="generic-selector"]').trigger('click')
    await nextTick() // Ensure dropdown is rendered
    expect(wrapper.find('[data-test="options-dropdown"]').exists()).toBe(true)
  })

  it('does not show dropdown when disabled', async () => {
    const wrapper = mount(GenericSelect, {
      props: {
        options,
        disabled: true
      }
    })

    await wrapper.trigger('click')
    expect(wrapper.find('[data-test="options-dropdown"]').exists()).toBe(false)
  })

  it('emits update:modelValue when option is selected', async () => {
    const options = [
      { value: 'ETH', label: 'Ethereum' },
      { value: 'USDC', label: 'USD Coin' }
    ]

    // Start with no modelValue
    const wrapper = mount(GenericSelect, {
      props: {
        options,
        modelValue: undefined // Explicitly undefined
      }
    })

    // Wait for initial emission if any
    await nextTick()

    // Perform selection
    await wrapper.find('[data-test="generic-selector"]').trigger('click')
    await wrapper.findAll('li')[1].trigger('click') // Select USDC

    // Verify emissions
    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')).toHaveLength(2)
    expect(wrapper.emitted('update:modelValue')?.[1]).toEqual(['USDC'])
  })

  it('closes dropdown after selection', async () => {
    const wrapper = mount(GenericSelect, {
      props: { options }
    })

    await wrapper.find('[data-test="generic-selector"]').trigger('click')
    await wrapper.findAll('li')[0].trigger('click')
    await nextTick()

    expect(wrapper.find('[data-test="options-dropdown"]').exists()).toBe(false)
  })

  it('displays value instead of label when label is missing', () => {
    const wrapper = mount(GenericSelect, {
      props: {
        options: [
          { value: 'XRP' }, // No label
          { value: 'SOL', label: 'Solana' }
        ],
        modelValue: 'XRP'
      }
    })

    expect(wrapper.text()).toContain('XRP')
    expect(wrapper.text()).not.toContain('undefined')
  })

  it('reacts to external modelValue changes', async () => {
    const wrapper = mount(GenericSelect, {
      props: {
        options: [
          { value: 'ETH', label: 'Ethereum' },
          { value: 'BTC', label: 'Bitcoin' }
        ],
        modelValue: 'ETH'
      }
    })

    // Initial state
    expect(wrapper.text()).toContain('Ethereum')

    // Change the value from parent
    wrapper.setProps({ modelValue: 'BTC' })
    await nextTick()

    // Verify component updated
    expect(wrapper.text()).toContain('Bitcoin')
  })

  describe('Keyboard Navigation', () => {
    it('opens dropdown on Enter key', async () => {
      const wrapper = mount(GenericSelect, {
        props: { options }
      })

      await wrapper.find('[data-test="generic-selector"]').trigger('keydown.enter')
      await nextTick()

      expect(wrapper.find('[data-test="options-dropdown"]').exists()).toBe(true)
    })

    it('opens dropdown on Space key', async () => {
      const wrapper = mount(GenericSelect, {
        props: { options }
      })

      await wrapper.find('[data-test="generic-selector"]').trigger('keydown.space')
      await nextTick()

      expect(wrapper.find('[data-test="options-dropdown"]').exists()).toBe(true)
    })

    it('closes dropdown on Escape key', async () => {
      const wrapper = mount(GenericSelect, {
        props: { options }
      })

      // Open dropdown
      await wrapper.find('[data-test="generic-selector"]').trigger('click')
      await nextTick()
      expect(wrapper.find('[data-test="options-dropdown"]').exists()).toBe(true)

      // Close with Escape
      await wrapper.find('[data-test="generic-selector"]').trigger('keydown.escape')
      await nextTick()
      expect(wrapper.find('[data-test="options-dropdown"]').exists()).toBe(false)
    })

    it('navigates options with arrow keys and highlights focused option', async () => {
      const wrapper = mount(GenericSelect, {
        props: { options }
      })

      // Open dropdown
      await wrapper.find('[data-test="generic-selector"]').trigger('click')
      await nextTick()

      // Navigate down
      await wrapper.find('[data-test="generic-selector"]').trigger('keydown', { key: 'ArrowDown' })
      await nextTick()

      // Check if second option is focused (has focus class on anchor)
      const anchors = wrapper.findAll('a')
      expect(anchors[1].classes()).toContain('focus')

      // Navigate up
      await wrapper.find('[data-test="generic-selector"]').trigger('keydown', { key: 'ArrowUp' })
      await nextTick()

      // Check if first option is focused
      expect(anchors[0].classes()).toContain('focus')
    })

    it('handles keyboard navigation logic', async () => {
      const wrapper = mount(GenericSelect, {
        props: { options, modelValue: 'ETH' }
      })

      await nextTick()

      // Test that keyboard navigation exists and works at a basic level
      expect(wrapper.vm).toBeDefined()
      
      // Test basic dropdown opening with keyboard
      await wrapper.find('[data-test="generic-selector"]').trigger('keydown.enter')
      await nextTick()
      expect(wrapper.find('[data-test="options-dropdown"]').exists()).toBe(true)
      
      // Test dropdown closing with escape
      await wrapper.find('[data-test="generic-selector"]').trigger('keydown.escape')
      await nextTick()
      expect(wrapper.find('[data-test="options-dropdown"]').exists()).toBe(false)
    })

    it('does not navigate beyond option boundaries', async () => {
      const wrapper = mount(GenericSelect, {
        props: { options }
      })

      // Open dropdown
      await wrapper.find('[data-test="generic-selector"]').trigger('click')
      await nextTick()

      // Try to navigate above first option
      await wrapper.find('[data-test="generic-selector"]').trigger('keydown', { key: 'ArrowUp' })
      await nextTick()

      const anchors = wrapper.findAll('a')
      expect(anchors[0].classes()).toContain('focus')

      // Navigate to last option
      await wrapper.find('[data-test="generic-selector"]').trigger('keydown', { key: 'ArrowDown' })
      await wrapper.find('[data-test="generic-selector"]').trigger('keydown', { key: 'ArrowDown' })
      await wrapper.find('[data-test="generic-selector"]').trigger('keydown', { key: 'ArrowDown' }) // Try to go beyond
      await nextTick()

      // Should stay at last option
      expect(anchors[2].classes()).toContain('focus')
    })

    it('ignores keyboard events when dropdown is closed', async () => {
      const wrapper = mount(GenericSelect, {
        props: { options }
      })

      // Try arrow keys when closed
      await wrapper.find('[data-test="generic-selector"]').trigger('keydown', { key: 'ArrowDown' })
      await nextTick()

      // Should not open dropdown or change anything
      expect(wrapper.find('[data-test="options-dropdown"]').exists()).toBe(false)
    })
  })

  describe('Error Handling', () => {
    it('handles empty options array gracefully', () => {
      const wrapper = mount(GenericSelect, {
        props: {
          options: [],
          modelValue: 'test'
        }
      })

      expect(wrapper.text()).toBe('')
    })

    it('handles formatValue function errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      
      const wrapper = mount(GenericSelect, {
        props: {
          options,
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

    it('prevents selection when disabled', async () => {
      const wrapper = mount(GenericSelect, {
        props: {
          options,
          disabled: true,
          modelValue: 'ETH'
        }
      })

      // Try to open dropdown
      await wrapper.find('[data-test="generic-selector"]').trigger('click')
      await nextTick()

      expect(wrapper.find('[data-test="options-dropdown"]').exists()).toBe(false)
    })
  })
})
