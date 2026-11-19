import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockTeamStore, mockUserStore } from '@/tests/mocks'
import CreateVesting from '@/components/sections/VestingView/forms/CreateVesting.vue'
import VestingActions from '@/components/sections/VestingView/VestingActions.vue'
import { createTestingPinia } from '@pinia/testing'
import { mount } from '@vue/test-utils'

const mountComponent = () =>
  mount(VestingActions, {
    global: { plugins: [createTestingPinia({ createSpy: vi.fn })] }
  })

describe('[US-VESTING-001] VestingActions.vue', () => {
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

  it('closes the creation modal after a successful creation', async () => {
    const wrapper = mountComponent()
    await wrapper.get('[data-test="createAddVesting"]').trigger('click')
    wrapper.getComponent(CreateVesting).vm.$emit('closeAddVestingModal')
    await wrapper.vm.$nextTick()

    expect(wrapper.findComponent(CreateVesting).exists()).toBe(false)
  })
})
