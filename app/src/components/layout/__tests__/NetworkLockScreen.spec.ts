import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { mockUseSwitchChain } from '@/tests/mocks/wagmi.vue.mock'
import { configuredChainId, configuredNetworkName } from '@/lib/walletNetwork'
import NetworkLockScreen from '../NetworkLockScreen.vue'

describe('NetworkLockScreen', () => {
  it('[AC-US-AUTH-004-02] requests the configured network only after a deliberate click', async () => {
    const wrapper = mount(NetworkLockScreen)
    expect(wrapper.text()).toContain(configuredNetworkName)
    expect(mockUseSwitchChain.mutate).not.toHaveBeenCalled()

    await wrapper.get('[data-test="switch-network"]').trigger('click')

    expect(mockUseSwitchChain.mutate).toHaveBeenCalledExactlyOnceWith({
      chainId: configuredChainId
    })
    wrapper.unmount()
  })

  it('[AC-US-AUTH-004-06] keeps a failed switch visible and permits a deliberate retry', async () => {
    mockUseSwitchChain.error.value = new Error('Wallet rejected the switch')
    const wrapper = mount(NetworkLockScreen)
    expect(wrapper.get('[data-test="network-switch-error"]').text()).toContain('try again')
    expect(mockUseSwitchChain.mutate).not.toHaveBeenCalled()

    await wrapper.get('[data-test="switch-network"]').trigger('click')
    expect(mockUseSwitchChain.mutate).toHaveBeenCalledOnce()
    expect(wrapper.find('[data-test="network-lock-screen"]').exists()).toBe(true)
    wrapper.unmount()
  })

  it('disables repeat requests while the wallet switch is pending', () => {
    mockUseSwitchChain.isPending.value = true
    const wrapper = mount(NetworkLockScreen)
    expect(wrapper.get('[data-test="switch-network"]').attributes('disabled')).toBeDefined()
    wrapper.unmount()
  })
})
