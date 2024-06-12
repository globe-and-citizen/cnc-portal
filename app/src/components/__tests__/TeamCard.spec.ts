import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import TeamCard from '@/components/TeamCard.vue'

describe('TeamCard', () => {
  // Mock props
  const props = {
    team: {
      name: 'Team A',
      description: 'This is a description of Team A.',
      bankAddress: null,
      id: '1',
      members: [],
      ownerAddress: '0x123'
    }
  }

  const wrapper = mount(TeamCard, { props })

  describe('Render', () => {
    it('Should render the component', () => {
      expect(wrapper.exists()).toBeTruthy()
    })

    it('Should display team name and description', () => {
      expect(wrapper.text()).toContain(props.team.name)
      expect(wrapper.text()).toContain(props.team.description)
    })
  })
})
