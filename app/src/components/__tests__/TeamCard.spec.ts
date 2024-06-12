import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import TeamCard from '@/components/TeamCard.vue'

describe('TeamCard', () => {
  // Mock props
  const props = {
    team: {
      name: 'Team A',
      description: 'This is a description of Team A.',
      id: '1',
      members: []
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
