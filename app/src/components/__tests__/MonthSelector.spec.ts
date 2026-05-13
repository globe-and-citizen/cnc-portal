import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import MonthSelector from '@/components/MonthSelector.vue'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import isoWeek from 'dayjs/plugin/isoWeek'
import { formatIsoWeekRange } from '@/utils/dayUtils'

dayjs.extend(utc)
dayjs.extend(isoWeek)

describe('MonthSelector', () => {
  const createWrapper = (modelValue = {}) => {
    const today = dayjs.utc()
    const defaultModel = {
      month: today.month(),
      year: today.year(),
      isoWeek: today.isoWeek(),
      formatted: `${today.year()}-W${String(today.isoWeek()).padStart(2, '0')}`,
      isoString: today.toISOString(),
      ...modelValue
    }

    return mount(MonthSelector, {
      props: {
        modelValue: defaultModel,
        'onUpdate:modelValue': vi.fn()
      },
      global: {
        components: {
          UButton: {
            template:
              '<button :data-test="$attrs[\'data-test\']" @click="$emit(\'click\', $event)"><slot /></button>'
          },
          UPopover: {
            template: '<div><slot /><slot name="content" /></div>',
            props: ['open']
          },
          IconifyIcon: {
            template: '<span :class="icon" />',
            props: ['icon']
          }
        }
      }
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Month selection from picker', () => {
    it('emits updated model when a month is picked', async () => {
      const wrapper = createWrapper({ month: 5, year: 2024 })
      const marchButton = wrapper.find('[data-test="month-2"]')
      await marchButton.trigger('click')
      await wrapper.vm.$nextTick()

      const emitted = wrapper.emitted('update:modelValue')?.[0]?.[0]
      const d = dayjs.utc().year(2024).month(2).startOf('month')
      expect(emitted).toEqual({
        month: 2,
        year: 2024,
        isoWeek: d.isoWeek(),
        formatted: formatIsoWeekRange(d),
        isoString: d.startOf('isoWeek').toISOString()
      })
    })

    it('navigates view year forward and selects in the new year', async () => {
      const wrapper = createWrapper({ month: 5, year: 2024 })
      await wrapper.find('[data-test="next-year"]').trigger('click')
      await wrapper.find('[data-test="month-0"]').trigger('click')
      await wrapper.vm.$nextTick()

      const emitted = wrapper.emitted('update:modelValue')?.[0]?.[0] as {
        month: number
        year: number
      }
      expect(emitted.month).toBe(0)
      expect(emitted.year).toBe(2025)
    })
  })

  describe('Month Navigation - Previous', () => {
    it('should go to previous month when prev button is clicked', async () => {
      const initialModel = {
        month: 5, // June
        year: 2024,
        isoWeek: 23,
        formatted: '2024-W23',
        isoString: dayjs.utc('2024-06-01').toISOString()
      }

      const wrapper = createWrapper(initialModel)
      await wrapper.find('[data-test="prev-month"]').trigger('click')
      await wrapper.vm.$nextTick()

      const emitted = wrapper.emitted('update:modelValue')
      expect(emitted).toBeTruthy()
      expect(emitted?.[0]).toBeDefined()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const newValue = (emitted?.[0] as any[])[0]
      expect(newValue.month).toBe(4) // May
      expect(newValue.year).toBe(2024)
    })

    it('should handle year change from January to December', async () => {
      const initialModel = {
        month: 0, // January
        year: 2024,
        isoWeek: 1,
        formatted: '2024-W01',
        isoString: dayjs.utc('2024-01-01').toISOString()
      }

      const wrapper = createWrapper(initialModel)
      await wrapper.find('[data-test="prev-month"]').trigger('click')
      await wrapper.vm.$nextTick()

      const emitted = wrapper.emitted('update:modelValue')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const newValue = (emitted?.[0] as any[])[0]
      expect(newValue.month).toBe(11) // December
      expect(newValue.year).toBe(2023)
    })
  })

  describe('Month Navigation - Next', () => {
    it('should handle year change from December to January', async () => {
      const initialModel = {
        month: 11, // December
        year: 2024,
        isoWeek: 52,
        formatted: '2024-W52',
        isoString: dayjs.utc('2024-12-01').toISOString()
      }

      const wrapper = createWrapper(initialModel)
      await wrapper.find('[data-test="next-month"]').trigger('click')
      await wrapper.vm.$nextTick()

      const emitted = wrapper.emitted('update:modelValue')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const newValue = (emitted?.[0] as any[])[0]
      expect(newValue.month).toBe(0) // January
      expect(newValue.year).toBe(2025)
    })
  })

  describe('Model Updates Structure', () => {
    it('should emit correct model structure when month changes', async () => {
      const initialModel = {
        month: 5,
        year: 2024,
        isoWeek: 23,
        formatted: '2024-W23',
        isoString: dayjs.utc('2024-06-01').toISOString()
      }

      const wrapper = createWrapper(initialModel)
      await wrapper.find('[data-test="next-month"]').trigger('click')
      await wrapper.vm.$nextTick()

      const emitted = wrapper.emitted('update:modelValue')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const newValue = (emitted?.[0] as any[])[0]

      expect(newValue).toHaveProperty('month')
      expect(newValue).toHaveProperty('year')
      expect(newValue).toHaveProperty('isoWeek')
      expect(newValue).toHaveProperty('formatted')
      expect(newValue).toHaveProperty('isoString')
    })
  })
})
