// TeamDetails.spec.ts
import { it, expect, describe, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import TeamDetails from '@/components/sections/DashboardView/TeamDetails.vue'
import { useUserDataStore } from '@/stores/user'
import type { Team } from '@/types/team'
import { createTestingPinia } from '@pinia/testing'
import { ref } from 'vue'

vi.mock('@/stores/user')

const mockTeam = {
  id: '1',
  name: 'Test Team',
  description: 'Test description',
  ownerAddress: '0xUserAddress',
  members: [],
  teamContracts: []
} as Team
vi.mock('@/stores', async (imporOriginal) => {
  const original: object = await imporOriginal()
  return {
    ...original,
    useTeamStore: vi.fn(() => ({
      currentTeam: ref(mockTeam)
    }))
  }
})

describe('TeamDetails.vue', () => {
  const createWrapper = (userAddress: string) => {
    // @ts-expect-error: mocked
    vi.mocked(useUserDataStore).mockReturnValue({ address: userAddress })
    return mount(TeamDetails, {
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })]
      }
    })
  }

  describe('Owner View', () => {
    let wrapper: ReturnType<typeof mount>

    beforeEach(() => {
      wrapper = createWrapper('0xUserAddress')
    })

    it('renders team name and description correctly', () => {
      expect(wrapper.find('h2').text()).toBe('Test Team')
      expect(wrapper.find('p').text()).toBe('Test description')
    })

    it('renders Owner badge', () => {
      const ownerBadge = wrapper.find('.badge-primary')
      const employeeBadge = wrapper.find('.badge-secondary')
      expect(ownerBadge.exists()).toBe(true)
      expect(ownerBadge.text()).toBe('Owner')
      expect(employeeBadge.exists()).toBe(false)
    })

    it('shows and handles owner action buttons', async () => {
      const buttons = wrapper.findAll('button')
      expect(buttons).toHaveLength(2)
      expect(buttons[0].text()).toBe('Update')
      expect(buttons[1].text()).toBe('Delete')

      await buttons[0].trigger('click')
      expect(wrapper.emitted('updateTeamModalOpen')).toBeTruthy()

      await buttons[1].trigger('click')
      expect(wrapper.emitted('deleteTeam')).toBeTruthy()
    })
  })

  describe('Employee View', () => {
    let wrapper: ReturnType<typeof mount>

    beforeEach(() => {
      wrapper = createWrapper('0xAnotherAddress')
    })

    it('renders team name and description correctly', () => {
      expect(wrapper.find('h2').text()).toBe('Test Team')
      expect(wrapper.find('p').text()).toBe('Test description')
    })

    it('renders Employee badge', () => {
      const ownerBadge = wrapper.find('.badge-primary')
      const employeeBadge = wrapper.find('.badge-secondary')
      expect(ownerBadge.exists()).toBe(false)
      expect(employeeBadge.exists()).toBe(true)
      expect(employeeBadge.text()).toBe('Employee')
    })

    it('hides owner action buttons', () => {
      const buttons = wrapper.findAll('button')
      expect(buttons).toHaveLength(0)
    })
  })
})
