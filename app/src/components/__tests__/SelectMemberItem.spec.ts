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

vi.mock('@/stores', () => ({
  useTeamStore: vi.fn(() => mockTeamStore)
}))

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
      const wrapper = createWrapper({ modelValue: mockTeamStore.currentTeam.members[0].address })

      const trigger = wrapper.find('[data-test="select-member-item-trigger"]')
      expect(trigger.exists()).toBe(true)

      // Initially closed
      expect(wrapper.find('[data-test="select-member-item-dropdown"]').exists()).toBe(false)
      await trigger.trigger('click')
      expect(wrapper.find('[data-test="select-member-item-dropdown"]').exists()).toBe(true)
    })

    it('should display selected user in trigger when modelValue matches a member', () => {
      const selectedAddress = mockTeamStore.currentTeam.members[1].address
      const wrapper = createWrapper({ modelValue: selectedAddress })

      const selectedUser = wrapper.find('[data-test="select-member-item-selected-user"]')
      expect(selectedUser.exists()).toBe(true)
    })
  })

  describe('Selection Behavior', () => {
    it('should emit update:modelValue and change when a member is selected', async () => {
      const wrapper = createWrapper()

      // Open dropdown
      await wrapper.find('[data-test="select-member-item-trigger"]').trigger('click')

      const options = wrapper.findAll('[data-test="select-member-item-option"]')
      expect(options.length).toBeGreaterThan(0)

      const targetMember = mockTeamStore.currentTeam.members[0]

      await options[0].trigger('click')

      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
      expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([targetMember.address])

      expect(wrapper.emitted('change')).toBeTruthy()
      const emittedMember = wrapper.emitted('change')?.[0][0] as User
      expect(emittedMember.address).toBe(targetMember.address)
    })
  })
})
