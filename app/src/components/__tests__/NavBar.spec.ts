import { describe, expect, it, vi } from 'vitest'

import NavBar from '@/components/NavBar.vue'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'

describe('NavBar', () => {
  const props = {
    isCollapsed: false
  }
  const wrapper = mount(NavBar, {
    props,
    global: {
      plugins: [createTestingPinia({ createSpy: vi.fn })]
    }
  })

  describe('Render', () => {
    it('Should Render the component', () => {
      expect(wrapper.exists()).toBe(true)
    })
  })
})
