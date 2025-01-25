import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { createRouter, createWebHistory } from 'vue-router'
import TeamView from '../TeamView.vue'
import type { ComponentPublicInstance } from 'vue'

interface TeamData {
  team: {
    name: string
    description: string
    members: Array<{ name: string; address: string }>
  }
  investorContract: {
    name: string
    symbol: string
  }
}

// Mock wagmi hooks
vi.mock('@wagmi/vue', () => ({
  useWriteContract: () => ({
    isPending: false,
    data: undefined,
    error: null,
    writeContract: vi.fn()
  }),
  useWaitForTransactionReceipt: () => ({
    isLoading: false,
    isSuccess: false
  }),
  useWatchContractEvent: () => ({})
}))

// Create router instance
const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/teams/:id',
      name: 'SingleTeamView',
      component: { template: '<div>Team View</div>' }
    }
  ]
})

describe('TeamView', () => {
  let wrapper: VueWrapper<
    ComponentPublicInstance & {
      handleAddTeam: (data: TeamData) => Promise<void>
      loadingCreateTeam: boolean
    }
  >

  const mountComponent = (options = {}) => {
    return mount(TeamView, {
      global: {
        plugins: [
          createTestingPinia({
            createSpy: vi.fn,
            initialState: {
              user: { name: 'Test User', address: '0x123' }
            }
          }),
          router
        ]
      },
      ...options
    }) as VueWrapper<
      ComponentPublicInstance & {
        handleAddTeam: (data: TeamData) => Promise<void>
        loadingCreateTeam: boolean
      }
    >
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('handles team creation process', async () => {
    wrapper = mountComponent()

    // Mock successful officer contract deployment
    const mockTeamData: TeamData = {
      team: {
        name: 'New Team',
        description: 'Test team',
        members: [{ name: 'Member 1', address: '0x789' }]
      },
      investorContract: {
        name: 'Test Token',
        symbol: 'TST'
      }
    }

    await wrapper.vm.handleAddTeam(mockTeamData)
    expect(wrapper.vm.loadingCreateTeam).toBe(false)
  })
})
