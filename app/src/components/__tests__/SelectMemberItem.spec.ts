import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import SelectMemberItem from '@/components/SelectMemberItem.vue'
import type { User } from '@/types'

const mockTeamStore = {
  currentTeam: {
    id: '1',
    name: 'Team A',
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
    ] as User[]
  }
}

const mockRouterPush = vi.fn()

vi.mock('@/stores', () => ({
  useTeamStore: vi.fn(() => mockTeamStore)
}))

vi.mock('vue-router', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    useRouter: vi.fn(() => ({
      push: mockRouterPush
    }))
  }
})

describe('SelectMemberItem', () => {
  const createWrapper = (props: Record<string, unknown> = {}) => {
    return mount(SelectMemberItem, {
      props,
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })]
      }
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Component Rendering', () => {
    it('should render trigger and open dropdown on click', async () => {
      const wrapper = createWrapper({ address: mockTeamStore.currentTeam.members[0].address })

      const trigger = wrapper.find('[data-test="select-member-item-trigger"]')
      expect(trigger.exists()).toBe(true)

      // Initially closed
      expect(wrapper.find('[data-test="select-member-item-dropdown"]').exists()).toBe(false)
      await trigger.trigger('click')
      expect(wrapper.find('[data-test="select-member-item-dropdown"]').exists()).toBe(true)
    })

    it('should display selected user in trigger when modelValue matches a member', () => {
      const selectedAddress = mockTeamStore.currentTeam.members[1].address
      const wrapper = createWrapper({ address: selectedAddress })

      const selectedUser = wrapper.find('[data-test="select-member-item-selected-user"]')
      expect(selectedUser.exists()).toBe(true)
    })
  })

  describe('Selection Behavior', () => {
    it('should navigate to selected member claim history on click', async () => {
      const wrapper = createWrapper({ address: mockTeamStore.currentTeam.members[0].address })

      // Open dropdown
      await wrapper.find('[data-test="select-member-item-trigger"]').trigger('click')

      const options = wrapper.findAll('[data-test="select-member-item-option"]')
      expect(options.length).toBeGreaterThan(0)

      await options[0].trigger('click')

      expect(mockRouterPush).toHaveBeenCalledWith({
        name: 'claim-history',
        params: {
          id: mockTeamStore.currentTeam.id,
          memberAddress: mockTeamStore.currentTeam.members[0].address
        }
      })
    })
  })
})
