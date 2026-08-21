import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import VestingActions from '@/components/sections/VestingView/VestingActions.vue'
import CreateVesting from '@/components/sections/VestingView/forms/CreateVesting.vue'
import { mockTeamStore, mockUserStore } from '@/tests/mocks'

const mountComponent = () =>
  mount(VestingActions, {
    global: { plugins: [createTestingPinia({ createSpy: vi.fn })] }
  })

describe('VestingActions.vue', () => {
  beforeEach(() => {
    mockTeamStore.currentTeam = {
      ...mockTeamStore.currentTeam,
      id: 1,
      ownerAddress: mockUserStore.address
    }
    mockTeamStore.currentTeamId = '1'
  })

  it('shows schedule creation only to the team owner', () => {
    expect(mountComponent().find('[data-test="createAddVesting"]').exists()).toBe(true)

    mockUserStore.address = '0x0000000000000000000000000000000000000002'
    expect(mountComponent().find('[data-test="createAddVesting"]').exists()).toBe(false)
  })

  it('opens the existing minute-precise form from the new hero action', async () => {
    const wrapper = mountComponent()
    await wrapper.get('[data-test="createAddVesting"]').trigger('click')
    expect(wrapper.findComponent(CreateVesting).exists()).toBe(true)
  })

  it('propagates a successful creation so the shared read model refreshes', async () => {
    const wrapper = mountComponent()
    await wrapper.get('[data-test="createAddVesting"]').trigger('click')
    wrapper.getComponent(CreateVesting).vm.$emit('reload')
    expect(wrapper.emitted('reload')).toBeTruthy()
  })
})
