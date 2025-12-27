import { mockTeamData } from '@/tests/mocks/index'
import { vi } from 'vitest'
export const mockTeamStore = {
  currentTeam: mockTeamData,
  currentTeamId: mockTeamData.id,
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
  address: '0x1234567890123456789012345678901234567890',
  name: 'Test User',
  imageUrl: 'https://example.com/avatar.jpg',
  isAuth: true
}
