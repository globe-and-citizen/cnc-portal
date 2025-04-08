import { mount } from '@vue/test-utils'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import TeamMeta from '@/components/sections/DashboardView/TeamMetaSection.vue'
import TeamDetails from '@/components/sections/DashboardView/TeamDetails.vue'
import { useRoute, useRouter } from 'vue-router'
import { useToastStore } from '@/stores/useToastStore'
import { setActivePinia, createPinia } from 'pinia'
import type { Team } from '@/types/team'

interface ComponentData {
  updateTeamInput: {
    name: string
    description: string
  }
  showDeleteTeamConfirmModal: boolean
}
vi.mock('vue-router', () => ({
  useRoute: vi.fn(),
  useRouter: vi.fn()
}))

vi.mock('@/stores/useToastStore', () => ({
  useToastStore: vi.fn()
}))

describe('TeamMeta.vue ', () => {
  let wrapper: ReturnType<typeof mount>

  const teamMock: Team = {
    id: '1',
    name: 'Team',
    description: 'Description',
    members: [{
      name: 'Alice', address: '0x8238923',
      id: '',
      teamId: 0
    }],
    ownerAddress: '0xOwnerAddress',
    teamContracts: []
  }

  const mockRoute = {
    params: {
      id: '1'
    }
  }

  const mockRouter = {
    push: vi.fn()
  }

  const addSuccessToast = vi.fn()
  const addErrorToast = vi.fn()

  // Setup before each test
  beforeEach(() => {
    interface mockReturn {
      mockReturnValue: (address: object) => {}
    }
    setActivePinia(createPinia())
    ;(useRoute as unknown as mockReturn).mockReturnValue(mockRoute)
    ;(useRouter as unknown as mockReturn).mockReturnValue(mockRouter)
    ;(useToastStore as unknown as mockReturn).mockReturnValue({
      addSuccessToast,
      addErrorToast
    })

    wrapper = mount(TeamMeta, {
      props: {
        team: teamMock
      }
    })
  })
  describe('renders', () => {
    it('renders team name correctly', () => {
      expect(wrapper.text()).toContain('Team')
    })

    it('renders team description correctly', () => {
      expect(wrapper.text()).toContain('Description')
    })
  })
  describe('Actions', () => {
    it('should update team input data when updateTeamModalOpen is called', async () => {
      const teamDetails = wrapper.findComponent(TeamDetails)
      teamDetails.vm.$emit('updateTeamModalOpen')

      expect((wrapper.vm as unknown as ComponentData).updateTeamInput.name).toBe('Team')
      expect((wrapper.vm as unknown as ComponentData).updateTeamInput.description).toBe(
        'Description'
      )
    })
    it('opens delete confirmation modal when deleteTeam event is emitted', async () => {
      const teamDetails = wrapper.findComponent(TeamDetails)
      teamDetails.vm.$emit('deleteTeam')

      expect((wrapper.vm as unknown as ComponentData).showDeleteTeamConfirmModal).toBe(true)
    })
  })
})
