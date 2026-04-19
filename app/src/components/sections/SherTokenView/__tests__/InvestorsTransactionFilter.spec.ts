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

  interface FilterVm {
    selectedType: string
    typeOptions: Array<{ label: string; value: string }>
  }

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

    it('displays type filter select with default "all" value', () => {
      const select = wrapper.find(`[data-test="${defaultProps.dataTestPrefix}-type-filter"]`)
      expect(select.exists()).toBeTruthy()
      expect((wrapper.vm as unknown as FilterVm).selectedType).toBe('all')
    })
  })

  describe('Type Filter Options', () => {
    it('displays all type options including "All Types"', () => {
      const vm = wrapper.vm as unknown as FilterVm
      expect(vm.typeOptions).toHaveLength(defaultProps.uniqueTypes.length + 1)
      expect(vm.typeOptions[0]).toEqual({ label: 'All Types', value: 'all' })
      defaultProps.uniqueTypes.forEach((type, index) => {
        expect(vm.typeOptions[index + 1]).toEqual({ label: type, value: type })
      })
    })
  })

  describe('Events', () => {
    it('emits update:selectedType when selectedType changes', async () => {
      ;(wrapper.vm as unknown as FilterVm).selectedType = defaultProps.uniqueTypes[0]
      await wrapper.vm.$nextTick()

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

  describe('Edge Cases', () => {
    it('handles empty uniqueTypes array', () => {
      wrapper = mountComponent({ ...defaultProps, uniqueTypes: [] })
      const vm = wrapper.vm as unknown as FilterVm
      expect(vm.typeOptions).toEqual([{ label: 'All Types', value: 'all' }])
    })

    it('preserves selected type while component remains mounted', async () => {
      const vm = wrapper.vm as unknown as FilterVm
      vm.selectedType = defaultProps.uniqueTypes[0]
      await wrapper.vm.$nextTick()
      expect(vm.selectedType).toBe(defaultProps.uniqueTypes[0])
    })
  })
})
