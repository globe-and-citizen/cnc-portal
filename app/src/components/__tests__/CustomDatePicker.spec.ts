import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { CalendarDate } from '@internationalized/date'
import CustomDatePicker from '../CustomDatePicker.vue'
import { UCalendarStub, UModalStub, USelectMenuStub } from '@/tests/stubs/nuxt-ui.stubs'

describe.skip('CustomDatePicker', () => {
  const mountComponent = (modelValue: [Date, Date] | null = null) =>
    mount(CustomDatePicker, {
      props: { modelValue, dataTestPrefix: 'test-date-picker' },
      global: {
        stubs: { USelectMenu: USelectMenuStub, UModal: UModalStub, UCalendar: UCalendarStub }
      }
    })

  const openDropdown = async (wrapper: ReturnType<typeof mountComponent>) => {
    await nextTick()
    await wrapper.find('[data-test="test-date-picker-date-select"]').trigger('click')
    await nextTick()
    await wrapper.find('[data-test="test-date-picker-date-select"]').trigger('click')
  }

  const openCustomRangeModal = async (wrapper: ReturnType<typeof mountComponent>) => {
    await openDropdown(wrapper)
    await wrapper.find('.cursor-pointer').trigger('click')
    await nextTick()
  }

  describe('rendering', () => {
    it('renders the select trigger with the correct data-test attribute', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('[data-test="test-date-picker-date-select"]').exists()).toBe(true)
    })

    it('shows the current month date range as display text by default', async () => {
      const wrapper = mountComponent()
      await nextTick()

      const today = new Date()
      const start = new Date(today.getFullYear(), today.getMonth(), 1)
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 0)
      const expected = `${start.toLocaleString('default', { month: 'long' })} 1 - ${end.toLocaleString('default', { month: 'long' })} ${end.getDate()}`

      expect(wrapper.find('span').text()).toBe(expected)
    })

    it('shows the provided date range as display text', async () => {
      const wrapper = mountComponent([new Date('2024-01-01'), new Date('2024-01-31')])
      await nextTick()

      expect(wrapper.find('span').text()).toBe('January 1 - January 31')
    })

    it('lists current and previous month as selectable options', async () => {
      const wrapper = mountComponent()
      console.log("Before opening dropdown: \n")
      console.log(wrapper.html())
      await openDropdown(wrapper)
      console.log("After opening dropdown: \n")
      console.log(wrapper.html())

      const items = wrapper.findAll('li')
      const currentMonth = new Date().toLocaleString('default', { month: 'long' })
      const previousMonth = new Date(
        new Date().getFullYear(),
        new Date().getMonth() - 1
      ).toLocaleString('default', { month: 'long' })

      expect(items).toHaveLength(2)
      expect(items[0].text()).toBe(currentMonth)
      expect(items[1].text()).toBe(previousMonth)
    })
  })

  describe('option selection', () => {
    it('emits the current month range when the current month option is selected', async () => {
      const wrapper = mountComponent()
      await nextTick()

      await openDropdown(wrapper)
      await wrapper.findAll('li')[0].trigger('click')
      await nextTick()

      const today = new Date()
      const emitted = wrapper.emitted('update:modelValue')!
      expect(emitted[emitted.length - 1]).toEqual([
        [
          new Date(today.getFullYear(), today.getMonth(), 1),
          new Date(today.getFullYear(), today.getMonth() + 1, 0)
        ]
      ])
    })

    it('emits the previous month range when the previous month option is selected', async () => {
      const wrapper = mountComponent()
      await nextTick()

      await openDropdown(wrapper)
      await wrapper.findAll('li')[1].trigger('click')
      await nextTick()

      const today = new Date()
      const emitted = wrapper.emitted('update:modelValue')!
      expect(emitted[emitted.length - 1]).toEqual([
        [
          new Date(today.getFullYear(), today.getMonth() - 1, 1),
          new Date(today.getFullYear(), today.getMonth(), 0)
        ]
      ])
    })

    it('updates the display text when an option is selected', async () => {
      const wrapper = mountComponent()
      await nextTick()

      await openDropdown(wrapper)
      await wrapper.findAll('li')[1].trigger('click')
      await nextTick()

      const previousMonth = new Date(
        new Date().getFullYear(),
        new Date().getMonth() - 1
      ).toLocaleString('default', { month: 'long' })
      expect(wrapper.find('span').text()).toContain(previousMonth)
    })
  })

  describe('modelValue prop change', () => {
    it('updates the display text when the modelValue prop changes', async () => {
      const wrapper = mountComponent()
      await wrapper.setProps({ modelValue: [new Date('2024-02-01'), new Date('2024-02-29')] })
      await nextTick()

      expect(wrapper.find('span').text()).toBe('February 1 - February 29')
    })

    it('emits the new range when modelValue prop changes', async () => {
      const wrapper = mountComponent()
      await nextTick()
      const initialEmitCount = wrapper.emitted('update:modelValue')?.length ?? 0

      const newRange: [Date, Date] = [new Date('2024-02-01'), new Date('2024-02-29')]
      await wrapper.setProps({ modelValue: newRange })
      await nextTick()

      const emitted = wrapper.emitted('update:modelValue')!
      expect(emitted.length).toBeGreaterThan(initialEmitCount)
      expect(emitted[emitted.length - 1]).toEqual([newRange])
    })
  })

  describe('custom range modal', () => {
    it('shows the custom range option in the dropdown when open', async () => {
      const wrapper = mountComponent()
      await openDropdown(wrapper)

      expect(wrapper.find('.cursor-pointer').text()).toBe('Custom Range')
    })

    it('opens the modal when "Custom Range" is clicked', async () => {
      const wrapper = mountComponent()
      await openCustomRangeModal(wrapper)

      expect(wrapper.find('[data-test="u-modal"]').exists()).toBe(true)
    })

    it('closes the dropdown when "Custom Range" is clicked', async () => {
      const wrapper = mountComponent()
      await openCustomRangeModal(wrapper)

      expect(wrapper.findAll('li')).toHaveLength(0)
    })

    it('emits the selected range when Apply is clicked', async () => {
      const wrapper = mountComponent()
      await openCustomRangeModal(wrapper)

      await wrapper.findComponent({ name: 'UCalendar' }).vm.$emit('update:modelValue', {
        start: new CalendarDate(2024, 3, 1),
        end: new CalendarDate(2024, 3, 31)
      })
      await nextTick()

      await wrapper.findAll('button').find((b) => b.text() === 'Apply')!.trigger('click')
      await nextTick()

      const emitted = wrapper.emitted('update:modelValue')!
      expect(emitted[emitted.length - 1]).toEqual([[new Date(2024, 2, 1), new Date(2024, 2, 31)]])
    })

    it('closes the modal when Apply is clicked', async () => {
      const wrapper = mountComponent()
      await openCustomRangeModal(wrapper)

      await wrapper.findComponent({ name: 'UCalendar' }).vm.$emit('update:modelValue', {
        start: new CalendarDate(2024, 3, 1),
        end: new CalendarDate(2024, 3, 31)
      })
      await nextTick()

      await wrapper.findAll('button').find((b) => b.text() === 'Apply')!.trigger('click')
      await nextTick()

      expect(wrapper.find('[data-test="u-modal"]').exists()).toBe(false)
    })

    it('closes the modal without emitting when Cancel is clicked', async () => {
      const wrapper = mountComponent()
      await openCustomRangeModal(wrapper)
      const emitCountBeforeCancel = wrapper.emitted('update:modelValue')?.length ?? 0

      await wrapper.findAll('button').find((b) => b.text() === 'Cancel')!.trigger('click')
      await nextTick()

      expect(wrapper.find('[data-test="u-modal"]').exists()).toBe(false)
      expect(wrapper.emitted('update:modelValue')?.length ?? 0).toBe(emitCountBeforeCancel)
    })

    it('keeps Apply disabled until a date range is selected in the calendar', async () => {
      const wrapper = mountComponent()
      await openCustomRangeModal(wrapper)

      const applyButton = wrapper.findAll('button').find((b) => b.text() === 'Apply')!
      expect(applyButton.attributes('disabled')).toBeDefined()

      await wrapper.findComponent({ name: 'UCalendar' }).vm.$emit('update:modelValue', {
        start: new CalendarDate(2024, 3, 1),
        end: new CalendarDate(2024, 3, 31)
      })
      await nextTick()

      expect(applyButton.attributes('disabled')).toBeUndefined()
    })
  })
})
