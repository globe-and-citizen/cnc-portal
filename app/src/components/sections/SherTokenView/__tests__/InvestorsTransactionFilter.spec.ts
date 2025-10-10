import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import InvestorsTransactionFilter from '../InvestorsTransactionFilter.vue'

describe('InvestorsTransactionFilter.vue', () => {
  let wrapper: VueWrapper

  const defaultProps = {
    uniqueTypes: ['dividend', 'mint', 'transfer'],
    showDateFilter: true,
    dataTestPrefix: 'test'
  }

  const mountComponent = (props = defaultProps) => {
    return mount(InvestorsTransactionFilter, {
      props
    })
  }

  beforeEach(() => {
    wrapper = mountComponent()
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('displays date picker when showDateFilter is true', () => {
      const datePicker = wrapper.findComponent({ name: 'CustomDatePicker' })
      expect(datePicker.exists()).toBeTruthy()
    })

    it('hides date picker when showDateFilter is false', () => {
      wrapper = mountComponent({ ...defaultProps, showDateFilter: false })
      const datePicker = wrapper.findComponent({ name: 'CustomDatePicker' })
      expect(datePicker.exists()).toBeFalsy()
    })

    it('displays type filter button with correct label', () => {
      const button = wrapper.find(`[data-test="${defaultProps.dataTestPrefix}-type-filter"]`)
      expect(button.exists()).toBeTruthy()
      expect(button.text()).toBe('All Types')
    })
  })

  describe('Type Filter Dropdown', () => {
    it('shows dropdown when clicking type filter button', async () => {
      const button = wrapper.find(`[data-test="${defaultProps.dataTestPrefix}-type-filter"]`)
      await button.trigger('click')

      const dropdown = wrapper.find('ul')
      expect(dropdown.exists()).toBeTruthy()
    })

    it('displays all type options including "All Types"', async () => {
      const button = wrapper.find(`[data-test="${defaultProps.dataTestPrefix}-type-filter"]`)
      await button.trigger('click')

      const options = wrapper.findAll('li')
      expect(options).toHaveLength(defaultProps.uniqueTypes.length + 1) // +1 for "All Types"
      expect(options[0].text()).toBe('All Types')
      defaultProps.uniqueTypes.forEach((type, index) => {
        expect(options[index + 1].text()).toBe(type)
      })
    })

    it('closes dropdown when selecting a type', async () => {
      const button = wrapper.find(`[data-test="${defaultProps.dataTestPrefix}-type-filter"]`)
      await button.trigger('click')

      const typeOption = wrapper.findAll('li')[1]
      await typeOption.trigger('click')

      const dropdown = wrapper.find('ul')
      expect(dropdown.exists()).toBeFalsy()
    })
  })

  describe('Events', () => {
    it('emits update:selectedType when selecting a type', async () => {
      const button = wrapper.find(`[data-test="${defaultProps.dataTestPrefix}-type-filter"]`)
      await button.trigger('click')

      const typeOption = wrapper.findAll('li')[1]
      await typeOption.trigger('click')

      expect(wrapper.emitted('update:selectedType')).toBeTruthy()
      expect(wrapper.emitted('update:selectedType')?.[0]).toEqual([defaultProps.uniqueTypes[0]])
    })

    it.skip('emits update:dateRange when date range changes', async () => {
      const datePicker = wrapper.findComponent({ name: 'CustomDatePicker' })
      const dateRange: [Date, Date] = [new Date(), new Date()]

      await datePicker.vm.$emit('update:modelValue', dateRange)

      expect(wrapper.emitted('update:dateRange')).toBeTruthy()
      expect(wrapper.emitted('update:dateRange')?.[0]).toEqual([dateRange])
    })
  })

  describe('Default Props', () => {
    it('uses default props when not provided', () => {
      const wrapper = mount(InvestorsTransactionFilter, {
        props: {
          uniqueTypes: ['dividend']
        }
      })

      expect(wrapper.props('showDateFilter')).toBe(true)
      expect(wrapper.props('dataTestPrefix')).toBe('investor-transaction-history')
    })
  })

  //   describe('Outside Click', () => {
  //     it('registers onClickOutside handler', () => {
  //       expect(onClickOutside).toHaveBeenCalled()
  //     })

  //     it('closes dropdown when clicking outside', async () => {
  //       const button = wrapper.find(`[data-test="${defaultProps.dataTestPrefix}-type-filter"]`)
  //       await button.trigger('click')

  //       // Simulate outside click by calling the handler directly
  //       const handler = vi.mocked(onClickOutside).mock.calls[0][1]
  //       handler()

  //       await wrapper.vm.$nextTick()
  //       const dropdown = wrapper.find('ul')
  //       expect(dropdown.exists()).toBeFalsy()
  //     })
  //   })

  describe('Edge Cases', () => {
    it('handles empty uniqueTypes array', () => {
      wrapper = mountComponent({ ...defaultProps, uniqueTypes: [] })
      const button = wrapper.find(`[data-test="${defaultProps.dataTestPrefix}-type-filter"]`)
      expect(button.exists()).toBeTruthy()
    })

    it('preserves selected type after dropdown reopens', async () => {
      const button = wrapper.find(`[data-test="${defaultProps.dataTestPrefix}-type-filter"]`)
      await button.trigger('click')

      const typeOption = wrapper.findAll('li')[1]
      await typeOption.trigger('click')

      await button.trigger('click')
      expect(button.text()).toBe(defaultProps.uniqueTypes[0])
    })
  })
})
