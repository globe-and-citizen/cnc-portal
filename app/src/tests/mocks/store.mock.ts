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
  }
}

export const mockToastStore = {
  addErrorToast: vi.fn(),
  addSuccessToast: vi.fn()
}
