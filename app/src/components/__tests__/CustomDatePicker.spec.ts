import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import CustomDatePicker from '../CustomDatePicker.vue'

describe('CustomDatePicker', () => {
  let wrapper: ReturnType<typeof mount<typeof CustomDatePicker>>

  beforeEach(() => {
    wrapper = mount(CustomDatePicker, {
      props: {
        modelValue: null,
        dataTestPrefix: 'test-date-picker'
      }
    })
  })
  interface IWrapper {
    dateRange: [Date, Date] | null
    isDropdownOpen: boolean
    displayDateRange: string
    selectedOption: string
  }

  it('renders correctly with default props', () => {
    expect(wrapper.exists()).toBe(true)
    expect(wrapper.find('[data-test="test-date-picker-date-select"]').exists()).toBe(true)
  })

  it('initializes with current month range when no modelValue is provided', () => {
    const today = new Date()
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)

    expect((wrapper.vm as unknown as IWrapper).dateRange).toEqual([firstDayOfMonth, lastDayOfMonth])
  })

  it('initializes with provided modelValue', () => {
    const customRange: [Date, Date] = [new Date('2024-01-01'), new Date('2024-01-31')]

    wrapper = mount(CustomDatePicker, {
      props: {
        modelValue: customRange,
        dataTestPrefix: 'test-date-picker'
      }
    })

    expect((wrapper.vm as unknown as IWrapper).dateRange).toEqual(customRange)
  })

  it('opens dropdown when clicking the button', async () => {
    const button = wrapper.find('[data-test="test-date-picker-date-select"]')
    await button.trigger('click')
    expect((wrapper.vm as unknown as IWrapper).isDropdownOpen).toBe(true)
  })

  it('displays correct options in dropdown', async () => {
    const button = wrapper.find('[data-test="test-date-picker-date-select"]')
    await button.trigger('click')

    const options = wrapper.findAll('li')
    expect(options.length).toBeGreaterThan(0)

    // Check for current and previous month options
    const currentMonth = new Date().toLocaleString('default', { month: 'long' })
    const previousMonth = new Date(
      new Date().getFullYear(),
      new Date().getMonth() - 1
    ).toLocaleString('default', { month: 'long' })

    expect(options[0].text()).toContain(currentMonth)
    expect(options[1].text()).toContain(previousMonth)
  })

  it('updates date range when selecting current month option', async () => {
    const button = wrapper.find('[data-test="test-date-picker-date-select"]')
    await button.trigger('click')

    const options = wrapper.findAll('li')
    await options[0].trigger('click')

    const today = new Date()
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)

    expect((wrapper.vm as unknown as IWrapper).dateRange).toEqual([firstDayOfMonth, lastDayOfMonth])
  })

  it.skip('updates date range when selecting current week option', async () => {
    const button = wrapper.find('[data-test="test-date-picker-date-select"]')
    await button.trigger('click')

    const options = wrapper.findAll('li')
    await options[2].trigger('click')

    const today = new Date()
    const firstDayOfWeek = new Date(today)
    firstDayOfWeek.setDate(today.getDate() - today.getDay())
    const lastDayOfWeek = new Date(firstDayOfWeek)
    lastDayOfWeek.setDate(firstDayOfWeek.getDate() + 6)

    expect((wrapper.vm as unknown as IWrapper).dateRange).toEqual([firstDayOfWeek, lastDayOfWeek])
  })

  it('updates date range when selecting previous month option', async () => {
    const button = wrapper.find('[data-test="test-date-picker-date-select"]')
    await button.trigger('click')

    const options = wrapper.findAll('li')
    await options[1].trigger('click')

    const today = new Date()
    const firstDayOfPrevMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
    const lastDayOfPrevMonth = new Date(today.getFullYear(), today.getMonth(), 0)

    expect((wrapper.vm as unknown as IWrapper).dateRange).toEqual([
      firstDayOfPrevMonth,
      lastDayOfPrevMonth
    ])
  })

  it('emits update:modelValue when date range changes', async () => {
    const customRange: [Date, Date] = [new Date('2024-01-01'), new Date('2024-01-31')]

    // Wait for initial setup
    await wrapper.vm.$nextTick()

    // Set custom range
    ;(wrapper.vm as unknown as IWrapper).dateRange = customRange
    await wrapper.vm.$nextTick()

    const emitted = wrapper.emitted('update:modelValue')
    expect(emitted).toBeTruthy()
    expect(emitted?.[emitted.length - 1]).toEqual([customRange])
  })

  it('keeps dropdown open for custom option and initializes range if null', async () => {
    const button = wrapper.find('[data-test="test-date-picker-date-select"]')
    await button.trigger('click')
    ;(wrapper.vm as unknown as IWrapper).dateRange = null
    await wrapper.vm.$nextTick()
    ;(wrapper.vm as unknown as IWrapper).selectedOption = 'custom'
    await wrapper.vm.$nextTick()

    expect((wrapper.vm as unknown as IWrapper).isDropdownOpen).toBe(true)

    const today = new Date()
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)
    expect((wrapper.vm as unknown as IWrapper).dateRange).toEqual([firstDayOfMonth, lastDayOfMonth])
  })

  it('formats display date range correctly', () => {
    const customRange: [Date, Date] = [new Date('2024-01-01'), new Date('2024-01-31')]

    ;(wrapper.vm as unknown as IWrapper).dateRange = customRange
    expect((wrapper.vm as unknown as IWrapper).displayDateRange).toBe('January 1 - January 31')
  })

  it('updates date range when modelValue prop changes after mount', async () => {
    const newRange: [Date, Date] = [new Date('2024-02-01'), new Date('2024-02-29')]
    await wrapper.setProps({ modelValue: newRange })
    await wrapper.vm.$nextTick()
    expect((wrapper.vm as unknown as IWrapper).dateRange).toEqual(newRange)
  })

  it('toggles dropdown open/close via the button and closes on outside click', async () => {
    const button = wrapper.find('[data-test="test-date-picker-date-select"]')

    // Toggle open
    await button.trigger('click')
    expect((wrapper.vm as unknown as IWrapper).isDropdownOpen).toBe(true)

    // Toggle close
    await button.trigger('click')
    expect((wrapper.vm as unknown as IWrapper).isDropdownOpen).toBe(false)

    // Open again then click outside to close
    await button.trigger('click')
    expect((wrapper.vm as unknown as IWrapper).isDropdownOpen).toBe(true)

    document.body.click()
    await wrapper.vm.$nextTick()
    expect((wrapper.vm as unknown as IWrapper).isDropdownOpen).toBe(false)
  })
})
