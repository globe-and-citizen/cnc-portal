import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import App from '@/App.vue'
import { mockUseConnection, mockUserStore } from '@/tests/mocks'

describe('App', () => {
  const mountApp = () =>
    mount(App, {
      global: {
        stubs: {
          UApp: { template: '<div><slot /></div>' },
          UDashboardGroup: { template: '<div><slot /></div>' },
          UDashboardPanel: { template: '<div><slot name="header" /><slot name="body" /></div>' },
          UDashboardNavbar: {
            template:
              '<div><slot name="leading" /><slot name="trailing" /><slot name="right" /></div>'
          },
          UDashboardSidebarCollapse: { template: '<div />' },
          SidebarLayout: { template: '<div data-test="sidebar-layout" />' },
          TeamSelectMenu: { template: '<div data-test="team-select" />' },
          NavBar: { template: '<div data-test="navbar" />' },
          VueQueryDevtools: { template: '<div data-test="query-devtools" />' },
          LockScreen: { template: '<div data-test="lock-screen" />' },
          RouterView: { template: '<div data-test="router-view" />' }
        }
      }
    })

  beforeEach(() => {
    mockUserStore.isAuth = true
    mockUserStore.address = '0x1234567890123456789012345678901234567890'
    mockUseConnection.address.value = '0x1234567890123456789012345678901234567890'
  })

  it('renders main dashboard when wallet matches authenticated user', () => {
    const wrapper = mountApp()

    expect(wrapper.find('[data-test="lock-screen"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="sidebar-layout"]').exists()).toBe(true)
  })

  it('renders lock screen when wallet address differs from authenticated user', () => {
    mockUseConnection.address.value = '0x9999999999999999999999999999999999999999'

    const wrapper = mountApp()

    expect(wrapper.find('[data-test="lock-screen"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="sidebar-layout"]').exists()).toBe(false)
  })
})
