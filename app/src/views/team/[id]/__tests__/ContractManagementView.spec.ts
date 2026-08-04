import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { useGetTeamOfficersQuery, type TeamOfficerWithContracts } from '@/queries/contract.queries'
import { mockTeamStore, renderWithProviders } from '@/tests/mocks'
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

  it('shows real team counts and opens each management view', async () => {
    const wrapper = renderWithProviders(ContractManagementView, { pinia: false })

    expect(wrapper.text()).toContain('Contract Management')
    expect(wrapper.text()).toContain('Deployment history')
    expect(wrapper.find('[data-test="current-panel"]').exists()).toBe(true)

    const campaignsButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes('Campaigns'))
    await campaignsButton?.trigger('click')
    expect(wrapper.find('[data-test="campaigns-panel"]').exists()).toBe(true)

    const historyButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes('Deployment history'))
    await historyButton?.trigger('click')
    expect(wrapper.find('[data-test="history-panel"]').exists()).toBe(true)
  })
})
