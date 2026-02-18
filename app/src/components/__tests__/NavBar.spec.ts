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

  // Check if the component is rendered properly
  describe('Render', () => {
    it('Should Render the component', () => {
      expect(wrapper.exists()).toBe(true)
    })
  })

  it('Should logout the user', async () => {
    await wrapper.find('[data-test="logout"]').trigger('click')
    // TODO: check a user is connected, then check if he is logged out
  })
  // TODO: click on logout
})
