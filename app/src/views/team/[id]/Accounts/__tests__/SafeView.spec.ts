import { describe, expect, it } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import SafeView from '../SafeView.vue'
import { mockTeamData, mockTeamStore } from '@/tests/mocks'

describe('SafeView.vue', () => {
  it('keeps the loading state visible while the team Safe is being resolved', () => {
    mockTeamStore.currentTeamId = mockTeamData.id
    mockTeamStore.currentTeamMeta = {
      isPending: true,
      data: undefined
    } as typeof mockTeamStore.currentTeamMeta
    mockTeamStore.getContractAddressByType.mockReturnValue(undefined)

    const wrapper = shallowMount(SafeView)

    expect(wrapper.find('[data-test="safe-loading-state"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="safe-setup-view"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="safe-wallet-view"]').exists()).toBe(false)
  })

  it('shows the setup only after a team without a Safe has loaded', () => {
    mockTeamStore.currentTeamId = mockTeamData.id
    mockTeamStore.currentTeamMeta = {
      isPending: false,
      data: mockTeamData
    }
    mockTeamStore.getContractAddressByType.mockReturnValue(undefined)

    const wrapper = shallowMount(SafeView)

    expect(wrapper.find('[data-test="safe-setup-view"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="safe-loading-state"]').exists()).toBe(false)
  })

  it('shows the Safe wallet when its address is available', () => {
    mockTeamStore.getContractAddressByType.mockReturnValue(
      '0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB'
    )

    const wrapper = shallowMount(SafeView)

    expect(wrapper.find('[data-test="safe-wallet-view"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="safe-setup-view"]').exists()).toBe(false)
  })
})
