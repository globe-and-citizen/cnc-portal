import { describe, expect, it, vi } from 'vitest'

import NavBar from '@/components/NavBar.vue'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { useRouter } from 'vue-router'

vi.mock('vue-router', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    useRouter: vi.fn(() => ({
      push: vi.fn()
    })),
    useRoute: vi.fn(() => ({
      name: ''
    }))
  }
})

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

  // Check if the component emits the right events
  describe('Emits', () => {
    it('Should emits toggleEditUserModal event when Profile is clicked', async () => {
      await wrapper.find('[data-test="toggleEditUser"]').trigger('click')
      expect(wrapper.emitted('toggleEditUserModal')).toBeTruthy()
    })
  })

  it('Should logout the user', async () => {
    await wrapper.find('[data-test="logout"]').trigger('click')
    // TODO: check a user is connected, then check if he is logged out
  })
  // TODO: click on logout
})
