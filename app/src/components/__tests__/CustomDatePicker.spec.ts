import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { CalendarDate } from '@internationalized/date'
import CustomDatePicker from '../CustomDatePicker.vue'

interface IWrapper {
  dateRange: [Date, Date] | null
  isDropdownOpen: boolean
  isModalOpen: boolean
  displayDateRange: string
  selectedOption: string
  calendarRange: { start: CalendarDate; end: CalendarDate } | undefined
  openCustomRangeModal: () => void
  applyCustomRange: () => void
  options: { value: string; label: string }[]
}

describe('CustomDatePicker', () => {
  let wrapper: ReturnType<typeof mount<typeof CustomDatePicker>>

  const mountComponent = (modelValue: [Date, Date] | null = null) =>
    mount(CustomDatePicker, {
      props: { modelValue, dataTestPrefix: 'test-date-picker' }
    })

  beforeEach(() => {
    wrapper = mountComponent()
  })

  describe('rendering', () => {
    it('renders the select trigger with the correct data-test attribute', () => {
      expect(wrapper.find('[data-test="test-date-picker-date-select"]').exists()).toBe(true)
    })

    it('renders two predefined options (current and previous month)', () => {
      const vm = wrapper.vm as unknown as IWrapper
      expect(vm.options).toHaveLength(2)
      expect(vm.options[0].value).toBe('current')
      expect(vm.options[1].value).toBe('previous')
    })

    it('shows current and previous month names in options labels', () => {
      const vm = wrapper.vm as unknown as IWrapper
      const currentMonth = new Date().toLocaleString('default', { month: 'long' })
      const previousMonth = new Date(
        new Date().getFullYear(),
        new Date().getMonth() - 1
      ).toLocaleString('default', { month: 'long' })

      expect(vm.options[0].label).toBe(currentMonth)
      expect(vm.options[1].label).toBe(previousMonth)
    })
  })

  describe('initialisation', () => {
    it('defaults to current month range when no modelValue is provided', () => {
      const today = new Date()
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
      const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)

      expect((wrapper.vm as unknown as IWrapper).dateRange).toEqual([firstDayOfMonth, lastDayOfMonth])
    })

    it('uses the provided modelValue as initial dateRange', () => {
      const customRange: [Date, Date] = [new Date('2024-01-01'), new Date('2024-01-31')]
      wrapper = mountComponent(customRange)

      expect((wrapper.vm as unknown as IWrapper).dateRange).toEqual(customRange)
    })

    it('defaults selectedOption to "current"', () => {
      expect((wrapper.vm as unknown as IWrapper).selectedOption).toBe('current')
    })
  })

  describe('selectedOption watcher', () => {
    it('sets current month range when selectedOption changes to "current"', async () => {
      const vm = wrapper.vm as unknown as IWrapper
      vm.selectedOption = 'previous'
      await wrapper.vm.$nextTick()
      vm.selectedOption = 'current'
      await wrapper.vm.$nextTick()

      const today = new Date()
      expect(vm.dateRange).toEqual([
        new Date(today.getFullYear(), today.getMonth(), 1),
        new Date(today.getFullYear(), today.getMonth() + 1, 0)
      ])
    })

    it('sets previous month range when selectedOption changes to "previous"', async () => {
      const vm = wrapper.vm as unknown as IWrapper
      vm.selectedOption = 'previous'
      await wrapper.vm.$nextTick()

      const today = new Date()
      expect(vm.dateRange).toEqual([
        new Date(today.getFullYear(), today.getMonth() - 1, 1),
        new Date(today.getFullYear(), today.getMonth(), 0)
      ])
    })
  })

  describe('dateRange watcher', () => {
    it('emits update:modelValue when dateRange changes', async () => {
      const customRange: [Date, Date] = [new Date('2024-03-01'), new Date('2024-03-31')]
      await wrapper.vm.$nextTick()

      ;(wrapper.vm as unknown as IWrapper).dateRange = customRange
      await wrapper.vm.$nextTick()

      const emitted = wrapper.emitted('update:modelValue')
      expect(emitted).toBeTruthy()
      expect(emitted?.[emitted.length - 1]).toEqual([customRange])
    })
  })

  describe('modelValue prop watcher', () => {
    it('updates dateRange when modelValue prop changes after mount', async () => {
      const newRange: [Date, Date] = [new Date('2024-02-01'), new Date('2024-02-29')]
      await wrapper.setProps({ modelValue: newRange })
      await wrapper.vm.$nextTick()

      expect((wrapper.vm as unknown as IWrapper).dateRange).toEqual(newRange)
    })
  })

  describe('displayDateRange computed', () => {
    it('formats the date range as "Month Day - Month Day"', () => {
      ;(wrapper.vm as unknown as IWrapper).dateRange = [
        new Date('2024-01-01'),
        new Date('2024-01-31')
      ]
      expect((wrapper.vm as unknown as IWrapper).displayDateRange).toBe('January 1 - January 31')
    })

    it('returns an empty string when dateRange is null', () => {
      ;(wrapper.vm as unknown as IWrapper).dateRange = null
      expect((wrapper.vm as unknown as IWrapper).displayDateRange).toBe('')
    })
  })

  describe('openCustomRangeModal', () => {
    it('opens the modal and closes the dropdown', async () => {
      const vm = wrapper.vm as unknown as IWrapper
      vm.isDropdownOpen = true
      await wrapper.vm.$nextTick()

      vm.openCustomRangeModal()
      await wrapper.vm.$nextTick()

      expect(vm.isModalOpen).toBe(true)
      expect(vm.isDropdownOpen).toBe(false)
    })

    it('pre-populates calendarRange from the current dateRange', async () => {
      const vm = wrapper.vm as unknown as IWrapper
      const range: [Date, Date] = [new Date('2024-06-01'), new Date('2024-06-30')]
      vm.dateRange = range
      await wrapper.vm.$nextTick()

      vm.openCustomRangeModal()
      await wrapper.vm.$nextTick()

      expect(vm.calendarRange?.start).toEqual(new CalendarDate(2024, 6, 1))
      expect(vm.calendarRange?.end).toEqual(new CalendarDate(2024, 6, 30))
    })
  })

  describe('applyCustomRange', () => {
    it('converts calendarRange to dateRange and closes the modal', async () => {
      const vm = wrapper.vm as unknown as IWrapper
      vm.isModalOpen = true
      vm.calendarRange = {
        start: new CalendarDate(2024, 5, 15),
        end: new CalendarDate(2024, 5, 20)
      }
      await wrapper.vm.$nextTick()

      vm.applyCustomRange()
      await wrapper.vm.$nextTick()

      expect(vm.dateRange).toEqual([new Date(2024, 4, 15), new Date(2024, 4, 20)])
      expect(vm.isModalOpen).toBe(false)
    })

    it('does not update dateRange when calendarRange is incomplete', async () => {
      const vm = wrapper.vm as unknown as IWrapper
      const originalRange = vm.dateRange
      vm.isModalOpen = true
      vm.calendarRange = undefined
      await wrapper.vm.$nextTick()

      vm.applyCustomRange()
      await wrapper.vm.$nextTick()

      expect(vm.dateRange).toEqual(originalRange)
      expect(vm.isModalOpen).toBe(false)
    })
  })
})
