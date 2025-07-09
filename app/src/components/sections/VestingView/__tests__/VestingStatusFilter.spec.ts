import { describe, it, expect, beforeEach } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import VestingStatusFilter from '@/components/sections/VestingView/VestingStatusFilter.vue'
import type { VestingStatus } from '@/types/vesting'

describe('VestingStatusFilter.vue', () => {
  let wrapper: VueWrapper

  const mountComponent = (props = {}) => {
    return mount(VestingStatusFilter, {
      props
    })
  }

  beforeEach(() => {
    wrapper = mountComponent()
  })

  describe('Rendering', () => {
    it('displays all status options', () => {
      const options = wrapper.findAll('option')
      const expectedOptions = ['All', 'Active', 'Completed', 'Cancelled']

      expect(options).toHaveLength(4)
      options.forEach((option, index) => {
        expect(option.text()).toBe(expectedOptions[index])
      })
    })

    it('displays the label correctly', () => {
      const label = wrapper.find('label')
      expect(label.text()).toBe('Status:')
    })

    it('has correct select element attributes', () => {
      const select = wrapper.find('select')
      expect(select.attributes('id')).toBe('vesting-status-select')
      expect(select.attributes('class')).toContain('select')
      expect(select.attributes('class')).toContain('select-bordered')
      expect(select.attributes('class')).toContain('select-sm')
    })
  })

  describe('Default State', () => {
    it('initializes with "all" as default value', () => {
      const select = wrapper.find('select')
      expect(select.element.value).toBe('all')
    })
  })

  describe('User Interaction', () => {
    it('emits statusChange event when selecting a new status', async () => {
      const select = wrapper.find('[data-test="vesting-status-filter"]')
      await select.setValue('active')

      expect(wrapper.emitted('statusChange')).toBeTruthy()
      expect(wrapper.emitted('statusChange')?.[0]).toEqual(['active'])
    })
  })

  describe('Model Update', () => {
    it('updates v-model value when selecting different options', async () => {
      const select = wrapper.find('select')

      await select.setValue('active')
      expect(select.element.value).toBe('active')

      await select.setValue('completed')
      expect(select.element.value).toBe('completed')
    })
  })

  describe('Edge Cases', () => {
    it('handles rapid status changes correctly', async () => {
      const select = wrapper.find('[data-test="vesting-status-filter"]')
      const statuses: VestingStatus[] = ['active', 'completed', 'cancelled', 'all']

      for (const status of statuses) {
        await select.setValue(status)
      }

      const emittedEvents = wrapper.emitted('statusChange')
      expect(emittedEvents).toHaveLength(statuses.length)
      statuses.forEach((status, index) => {
        expect(emittedEvents?.[index]).toEqual([status])
      })
    })

    it('preserves selected value after component re-render', async () => {
      const select = wrapper.find('select')
      await select.setValue('completed')
      wrapper.vm.$forceUpdate()

      expect(select.element.value).toBe('completed')
    })
  })
})
