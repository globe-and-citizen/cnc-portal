import { vi } from 'vitest'
import { ref } from 'vue'

export const useToastStore = vi.fn().mockReturnValue({
  currentTeamId: ref(1),
  fetchTeam: vi.fn(),
  setCurrentTeamId: vi.fn(),
  currentTeam: {
    id: 1,
    name: 'Team 1'
  }
})
