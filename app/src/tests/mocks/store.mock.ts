import { vi } from 'vitest'
export const mockTeamStore = {
  currentTeam: {
    id: '1',
    name: 'Team Name',
    description: 'Team Description',
    members: [],
    teamContracts: [
      {
        address: '0xTeamContractAddress',
        admins: [],
        type: 'ContractType',
        deployer: '0xDeployerAddress'
      }
    ],
    ownerAddress: '0xOwnerAddress'
  },
  currentTeamMeta: {
    teamIsFetching: false
  },
  teamsMeta: {
    reloadTeams: vi.fn()
  },
  getContractAddressByType: vi.fn((type) => {
    // console.log('getContractAddressByType called with type:', type)
    return type ? '0xTeamContractAddress' : undefined
    // return mockTeamStore.currentTeam.teamContracts.find((contract) => contract.type === type)?.address
  }),
  fetchTeam: vi.fn()
}

export const mockToastStore = {
  addErrorToast: vi.fn(),
  addSuccessToast: vi.fn()
}
