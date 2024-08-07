import { mount } from '@vue/test-utils'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import TeamMeta from '@/components/sections/SingleTeamView/Team/TeamMeta.vue'
import TeamDetails from '@/components/sections/SingleTeamView/Team/TeamDetails.vue'
import { useRoute, useRouter } from 'vue-router'
import { useToastStore } from '@/stores/useToastStore'
import { setActivePinia, createPinia } from 'pinia'

vi.mock('vue-router', () => ({
  useRoute: vi.fn(),
  useRouter: vi.fn()
}))

vi.mock('@/stores/useToastStore', () => ({
  useToastStore: vi.fn()
}))

describe('TeamMeta.vue ', () => {
  let wrapper: ReturnType<typeof mount>

  const teamMock = {
    id: '1',
    name: 'Team',
    description: 'Description',
    bankAddress: '0x892323',
    members: [{ name: 'Alice', address: '0x8238923' }]
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
    setActivePinia(createPinia())
    ;(useRoute as any).mockReturnValue(mockRoute)
    ;(useRouter as any).mockReturnValue(mockRouter)
    ;(useToastStore as any).mockReturnValue({
      addSuccessToast,
      addErrorToast
    })

    wrapper = mount(TeamMeta, {
      props: {
        team: teamMock
      }
    })
  })

  it('renders team name correctly', () => {
    expect(wrapper.text()).toContain('Team')
  })

  it('renders team description correctly', () => {
    expect(wrapper.text()).toContain('Description')
  })
  it('should update team input data when updateTeamModalOpen is called', async () => {
    const teamDetails = wrapper.findComponent(TeamDetails)
    teamDetails.vm.$emit('updateTeamModalOpen')

    expect((wrapper.vm as any).updateTeamInput.name).toBe('Team')
    expect((wrapper.vm as any).updateTeamInput.description).toBe('Description')
    expect((wrapper.vm as any).updateTeamInput.bankAddress).toBe('0x892323')
  })
  it('opens delete confirmation modal when deleteTeam event is emitted', async () => {
    const teamDetails = wrapper.findComponent(TeamDetails)
    teamDetails.vm.$emit('deleteTeam')

    expect((wrapper.vm as any).showDeleteTeamConfirmModal).toBe(true)
  })
})
