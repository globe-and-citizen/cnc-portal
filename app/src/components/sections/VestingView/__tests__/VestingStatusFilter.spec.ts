import { describe, it, expect, beforeEach } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import VestingStatusFilter from '@/components/sections/VestingView/VestingStatusFilter.vue'
import type { VestingStatus } from '@/types/vesting'

const USelectStub = defineComponent({
  name: 'USelectStub',
  props: ['modelValue', 'items', 'id', 'size'],
  emits: ['update:modelValue'],
  setup() {
    return () => h('div')
  }
})

describe('VestingStatusFilter.vue', () => {
  let wrapper: VueWrapper

  const mountComponent = (props = {}) => {
    return mount(VestingStatusFilter, {
      props,
      global: {
        stubs: {
          USelect: USelectStub,
          Select: USelectStub
        }
      }
    })
  }

  const getSelect = () => wrapper.findComponent(USelectStub)

  beforeEach(() => {
    wrapper = mountComponent()
  })

  describe('Rendering', () => {
    it('passes all status options to the select', () => {
      const select = getSelect()
      const items = select.props('items') as Array<{ label: string; value: string }>
      const expectedOptions = ['All', 'Active', 'Completed', 'Cancelled']

      expect(items).toHaveLength(4)
      items.forEach((item, index) => {
        expect(item.label).toBe(expectedOptions[index])
      })
    })

    it('displays the label correctly', () => {
      const label = wrapper.find('label')
      expect(label.text()).toBe('Status:')
    })

    it('has correct select attributes', () => {
      const select = getSelect()
      expect(select.props('id')).toBe('vesting-status-select')
      expect(wrapper.find('[data-test="vesting-status-filter"]').exists()).toBe(true)
    })
  })

  describe('Default State', () => {
    it('initializes with "all" as default value', () => {
      expect(getSelect().props('modelValue')).toBe('all')
    })
  })

  describe('User Interaction', () => {
    it('emits statusChange event when selecting a new status', async () => {
      await getSelect().vm.$emit('update:modelValue', 'active')
      await wrapper.vm.$nextTick()

      expect(wrapper.emitted('statusChange')).toBeTruthy()
      expect(wrapper.emitted('statusChange')?.[0]).toEqual(['active'])
    })
  })

  describe('Model Update', () => {
    it('updates value when selecting different options', async () => {
      await getSelect().vm.$emit('update:modelValue', 'active')
      await wrapper.vm.$nextTick()
      expect(getSelect().props('modelValue')).toBe('active')

      await getSelect().vm.$emit('update:modelValue', 'completed')
      await wrapper.vm.$nextTick()
      expect(getSelect().props('modelValue')).toBe('completed')
    })
  })

  describe('Edge Cases', () => {
    it('handles rapid status changes correctly', async () => {
      const statuses: VestingStatus[] = ['active', 'completed', 'cancelled', 'all']

      for (const status of statuses) {
        await getSelect().vm.$emit('update:modelValue', status)
        await wrapper.vm.$nextTick()
      }

      const emittedEvents = wrapper.emitted('statusChange')
      expect(emittedEvents).toHaveLength(statuses.length)
      statuses.forEach((status, index) => {
        expect(emittedEvents?.[index]).toEqual([status])
      })
    })

    it('preserves selected value after component re-render', async () => {
      await getSelect().vm.$emit('update:modelValue', 'completed')
      await wrapper.vm.$nextTick()
      wrapper.vm.$forceUpdate()

      expect(getSelect().props('modelValue')).toBe('completed')
    })
  })
})
