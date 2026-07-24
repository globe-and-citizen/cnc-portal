import { describe, expect, it, vi, beforeEach } from 'vitest'

import NavBar from '@/components/NavBar.vue'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { mockUseAuth } from '@/tests/mocks/composables.mock'
import { nextTick } from 'vue'
import { latestDeployedVersionForChain } from '@/artifacts/registry'
import { currentChainId, NETWORK } from '@/constant'

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

  describe('Render', () => {
    it('Should Render the component', () => {
      const wrapper = createWrapper()
      expect(wrapper.exists()).toBe(true)
    })

    it('shows the latest contract version deployed on the current network in development', () => {
      const wrapper = createWrapper()
      const badge = wrapper.find('[data-test="contract-version-badge"]')
      const tooltip = wrapper.findComponent({ name: 'UTooltip' })

      expect(import.meta.env.DEV).toBe(true)
      expect(badge.text()).toContain(latestDeployedVersionForChain(currentChainId))
      expect(tooltip.props('text')).toBe(
        `Latest contract version deployed on ${NETWORK.networkName}`
      )
    })
  })

  it('opens profile modal when settings item is selected', async () => {
    const wrapper = createWrapper()
    const dropdown = wrapper.findComponent({ name: 'UDropdown' })
    const items = dropdown.props('items') as Array<{ onSelect?: () => void }>

    items[0]?.onSelect?.()
    await nextTick()

    expect(wrapper.find('[data-test="close-wage-modal-button"]').exists()).toBe(true)
  })

  it('calls logout when logout item is selected', () => {
    const wrapper = createWrapper()
    const dropdown = wrapper.findComponent({ name: 'UDropdown' })
    const items = dropdown.props('items') as Array<{ onSelect?: () => void }>

    items[1]?.onSelect?.()

    expect(mockUseAuth.logout).toHaveBeenCalledTimes(1)
  })
})
