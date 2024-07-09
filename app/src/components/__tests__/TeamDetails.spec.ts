// TeamDetails.spec.ts
import { it, expect, describe, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import TeamDetails from '../TeamDetails.vue'

describe('TeamDetails.vue', () => {
  let wrapper: ReturnType<typeof mount>

  beforeEach(() => {
    wrapper = mount(TeamDetails, {
      props: {
        team: {
          name: 'Test Team',
          description: 'Test description',
          ownerAddress: '0xUserAddress'
        },
        teamBalance: 1000,
        balanceLoading: false
      }
    })
  })
  describe('Renders ', () => {
    it('renders team name and description correctly', () => {
      expect(wrapper.find('h2').text()).toBe('Test Team')
      expect(wrapper.find('p').text()).toBe('Test description')
    })

    it('renders Employee badge if the user is not the owner', async () => {
      vi.mock('@/stores/user', () => ({
        useUserDataStore: vi.fn(() => ({ address: '0xAnotherAddress' }))
      }))
      wrapper = mount(TeamDetails, {
        props: {
          team: {
            name: 'Test Team',
            description: 'Test description',
            ownerAddress: '0xUserAddress'
          },
          teamBalance: 1000,
          balanceLoading: false
        }
      })
      await wrapper.vm.$nextTick()
      const ownerBadge = wrapper.find('.badge-primary')
      const employeeBadge = wrapper.find('.badge-secondary')
      expect(ownerBadge.exists()).toBe(false)
      expect(employeeBadge.exists()).toBe(true)
    })
  })
})
