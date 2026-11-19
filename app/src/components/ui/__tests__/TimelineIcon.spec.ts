import { beforeEach, describe, expect, it } from 'vitest'
import TimelineIcon from '@/components/ui/TimelineIcon.vue'
import { mount } from '@vue/test-utils'

describe('TimelineIcon.vue', () => {
  beforeEach(() => {
    // Clear any previous test state
  })

  describe('Props validation', () => {
    it('accepts all valid status values', () => {
      const validStatuses = ['pending', 'active', 'completed', 'error'] as const

      validStatuses.forEach((status) => {
        const wrapper = mount(TimelineIcon, {
          props: {
            status
          },
          global: {
            stubs: {
              Icon: true
            }
          }
        })

        expect(wrapper.vm.status).toBe(status)
      })
    })
  })
})
