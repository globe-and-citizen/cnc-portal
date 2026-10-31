import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import App from '@/App.vue'
import { mockUseConnection, mockUserStore } from '@/tests/mocks'
import { mockUseConnectionEffect, mockUseSwitchChain } from '@/tests/mocks/wagmi.vue.mock'
import { mockUseAuth } from '@/tests/mocks/composables.mock'
import { configuredChainId } from '@/lib/walletNetwork'

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
          Devtools: { template: '<div data-test="query-devtools" />' },
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
    expect(wrapper.find('[data-test="sidebar-layout"]').exists()).toBe(false)
  })

  it('[AC-US-AUTH-003-09] locks the app when the connected wallet differs from the session', () => {
    mockUseConnection.address.value = '0x9999999999999999999999999999999999999999'

    const wrapper = mountApp()

    expect(wrapper.find('[data-test="lock-screen"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="sidebar-layout"]').exists()).toBe(false)
  })

  it('[AC-US-AUTH-004-03] removes the route surface on a mid-session network change', async () => {
    const wrapper = mountApp()
    expect(wrapper.find('[data-test="router-view"]').exists()).toBe(true)

    mockUseConnection.chainId.value = 1
    await nextTick()

    expect(wrapper.find('[data-test="network-lock-screen"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="router-view"]').exists()).toBe(false)
    expect(mockUseSwitchChain.mutate).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  /**
   * Covers:
   * - [AC-US-AUTH-004-01]
   * - [AC-US-AUTH-004-04]
   */
  it('resumes the same session after the wallet returns without requesting another action', async () => {
    mockUseConnection.chainId.value = 1
    const wrapper = mountApp()

    mockUseConnection.chainId.value = configuredChainId
    await nextTick()

    expect(wrapper.find('[data-test="network-lock-screen"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="router-view"]').exists()).toBe(true)
    expect(mockUserStore.isAuth).toBe(true)
    expect(mockUseSwitchChain.mutate).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('[AC-US-AUTH-004-03] locks an authenticated session with an unknown wallet network', () => {
    mockUseConnection.chainId.value = undefined
    const wrapper = mountApp()
    expect(wrapper.find('[data-test="network-lock-screen"]').exists()).toBe(true)
    wrapper.unmount()
  })

  it('[AC-US-AUTH-004-05] gives the account lock precedence over the network lock', () => {
    mockUseConnection.chainId.value = 1
    mockUseConnection.address.value = '0x9999999999999999999999999999999999999999'
    const wrapper = mountApp()
    expect(wrapper.find('[data-test="lock-screen"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="network-lock-screen"]').exists()).toBe(false)
    wrapper.unmount()
  })

  it('keeps login available before authentication on another network', () => {
    mockUserStore.isAuth = false
    mockUseConnection.chainId.value = 1
    const wrapper = mountApp()
    expect(wrapper.find('[data-test="network-lock-screen"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="router-view"]').exists()).toBe(true)
    wrapper.unmount()
  })

  it('[AC-US-AUTH-004-05] retains logout on wallet disconnect while network-locked', () => {
    mockUseConnection.chainId.value = 1
    const wrapper = mountApp()
    const effects = mockUseConnectionEffect.mock.calls.at(-1)?.[0] as { onDisconnect: () => void }
    effects.onDisconnect()
    expect(mockUseAuth.logout).toHaveBeenCalledOnce()
    wrapper.unmount()
  })
})
