import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import TimelineIcon from '@/components/ui/TimelineIcon.vue'

describe('TimelineIcon.vue', () => {
  beforeEach(() => {
    // Clear any previous test state
  })

  describe('Props validation', () => {
    it('should accept all valid status values', () => {
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
