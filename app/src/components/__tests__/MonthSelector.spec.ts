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
          ButtonUI: {
            template: '<button><slot /></button>'
          },
          VueDatePicker: {
            template: '<div><slot name="trigger" /></div>',
            props: ['modelValue', 'monthPicker', 'yearPicker', 'autoApply']
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

  describe('Watcher', () => {
    it('updates model when monthPicked changes', async () => {
      const wrapper = createWrapper()
      const setup = (wrapper.vm as unknown as { $?: { setupState?: Record<string, unknown> } }).$
        ?.setupState
      const payload = { month: 2, year: 2023 }
      if (!setup) throw new Error('setupState not available')
      ;(setup as { monthPicked?: unknown }).monthPicked = payload
      await wrapper.vm.$nextTick()

      const emitted = wrapper.emitted('update:modelValue')?.[0]?.[0]
      const d = dayjs.utc().year(2023).month(2).startOf('month')
      expect(emitted).toEqual({
        month: 2,
        year: 2023,
        isoWeek: d.isoWeek(),
        formatted: formatIsoWeekRange(d),
        isoString: d.toISOString()
      })
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
      const prevButton = wrapper.findAll('button')[0]

      await prevButton.trigger('click')
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
      const prevButton = wrapper.findAll('button')[0]

      await prevButton.trigger('click')
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
      const nextButton = wrapper.findAll('button')[2]

      await nextButton.trigger('click')
      await wrapper.vm.$nextTick()

      const emitted = wrapper.emitted('update:modelValue')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const newValue = (emitted?.[0] as any[])[0]
      expect(newValue.month).toBe(0) // January
      expect(newValue.year).toBe(2025)
    })
  })
})
