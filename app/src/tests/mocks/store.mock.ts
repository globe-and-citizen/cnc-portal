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
  currentTeamId: '1',
  currentTeamMeta: {
    isPending: false
  },
  teamsMeta: {
    reloadTeams: vi.fn()
  },
  getContractAddressByType: vi.fn((type) => {
    return type ? '0xTeamContractAddress' : undefined
  }),
  fetchTeam: vi.fn()
}

export const mockToastStore = {
  addErrorToast: vi.fn(),
  addSuccessToast: vi.fn()
}

export const mockUserStore = {
  address: '0xUserAddress'
}
