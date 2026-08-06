import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick, ref } from 'vue'
import { useGetTeamOfficersQuery, type TeamOfficerWithContracts } from '@/queries/contract.queries'
import { mockRouterReplace, mockTeamStore, renderWithProviders } from '@/tests/mocks'
import ContractManagementView from '@/views/team/[id]/ContractManagementView.vue'

vi.mock('@/components/sections/ContractManagementView/MainContractSection.vue', () => ({
  default: {
    props: ['generation'],
    template: '<div data-test="current-panel">Current panel</div>'
  }
}))

vi.mock('@/components/sections/ContractManagementView/AdvertiseContractSection.vue', () => ({
  default: { template: '<div data-test="campaigns-panel">Campaigns panel</div>' }
}))

vi.mock('@/components/sections/ContractManagementView/DeploymentHistorySection.vue', () => ({
  default: {
    props: ['generations'],
    template: '<div data-test="history-panel">History panel</div>'
  }
}))

const legacyOfficer: TeamOfficerWithContracts = {
  id: 2,
  address: '0x2222222222222222222222222222222222222222',
  version: 'v0.9',
  teamId: 1,
  deployer: mockTeamStore.currentTeam.ownerAddress,
  deployBlockNumber: '10',
  deployedAt: '2026-01-01T00:00:00.000Z',
  previousOfficerId: null,
  isCurrent: false,
  contracts: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z'
}

describe('ContractManagementView.vue', () => {
  beforeEach(() => {
    vi.mocked(useGetTeamOfficersQuery).mockReturnValue({
      data: ref([legacyOfficer]),
      isPending: ref(false),
      isError: ref(false),
      refetch: vi.fn()
    } as unknown as ReturnType<typeof useGetTeamOfficersQuery>)
  })

  it('shows real team counts and stores the active management view in the route', async () => {
    const wrapper = renderWithProviders(ContractManagementView, { pinia: false })

    expect(wrapper.text()).toContain('Contract Management')
    expect(wrapper.text()).toContain('Deployment history')
    expect(wrapper.find('[data-test="current-panel"]').exists()).toBe(true)

    const campaignsButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes('Manage campaigns'))
    await campaignsButton?.trigger('click')
    await nextTick()
    expect(mockRouterReplace).toHaveBeenLastCalledWith({ query: { tab: 'campaigns' } })
    expect(wrapper.find('[data-test="campaigns-panel"]').exists()).toBe(true)

    wrapper.findComponent({ name: 'Tabs' }).vm.$emit('update:modelValue', 'history')
    await nextTick()
    expect(mockRouterReplace).toHaveBeenLastCalledWith({ query: { tab: 'history' } })
  })

  it.each([
    ['campaigns', 'campaigns-panel'],
    ['history', 'history-panel']
  ])('restores the %s management view from the route after a reload', (tab, panel) => {
    const wrapper = renderWithProviders(ContractManagementView, {
      pinia: false,
      route: { query: { tab } }
    })

    expect(wrapper.find(`[data-test="${panel}"]`).exists()).toBe(true)
    expect(wrapper.find('[data-test="current-panel"]').exists()).toBe(false)
  })

  it('falls back to current contracts when the route tab is invalid', () => {
    const wrapper = renderWithProviders(ContractManagementView, {
      pinia: false,
      route: { query: { tab: 'unknown' } }
    })

    expect(wrapper.find('[data-test="current-panel"]').exists()).toBe(true)
  })
})
