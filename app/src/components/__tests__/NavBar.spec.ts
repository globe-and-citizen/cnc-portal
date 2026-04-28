import { describe, expect, it, vi, beforeEach } from 'vitest'

import NavBar from '@/components/NavBar.vue'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { mockUseAuth } from '@/tests/mocks/composables.mock'

describe('NavBar', () => {
  const createWrapper = () =>
    mount(NavBar, {
      props: {
        isCollapsed: false
      },
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })],
        stubs: {
          EditUserForm: true,
          NotificationDropdown: true
        }
      }
    })

  beforeEach(() => {
    if (vi.isMockFunction(mockUseAuth.logout)) {
      mockUseAuth.logout.mockReset()
    }
  })

  // Check if the component is rendered properly
  describe('Render', () => {
    it('Should Render the component', () => {
      const wrapper = createWrapper()
      expect(wrapper.exists()).toBe(true)
    })
  })

  it('opens profile modal when settings item is selected', async () => {
    const wrapper = createWrapper()
    const profileItems = (
      wrapper.vm as unknown as { profileItems: Array<{ onSelect: () => void }> }
    ).profileItems

    profileItems[0].onSelect()
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-test="close-wage-modal-button"]').exists()).toBe(true)
  })

  it('calls logout when logout item is selected', () => {
    const wrapper = createWrapper()
    const profileItems = (
      wrapper.vm as unknown as { profileItems: Array<{ onSelect: () => void }> }
    ).profileItems

    profileItems[1].onSelect()

    expect(mockUseAuth.logout).toHaveBeenCalledTimes(1)
  })
})
