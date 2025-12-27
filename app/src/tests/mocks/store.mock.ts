import type { User } from '@/types/user'
import { vi } from 'vitest'
export const mockTeamStore = {
  currentTeam: {
    id: '1',
    name: 'Team Name',
    description: 'Team Description',
    members: [
      {
        id: 'user-1',
        name: 'Alice',
        address: '0x1111111111111111111111111111111111111111'
      },
      {
        id: 'user-2',
        name: 'Bob',
        address: '0x2222222222222222222222222222222222222222'
      }
    ] as User[],
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
