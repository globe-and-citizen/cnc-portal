import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import TeamCard from '@/components/TeamCard.vue'
import type { Team } from '@/types'

describe('TeamCard.vue', () => {
  const team: Team = {
    id: '1',
    name: 'Test Team',
    description: 'This is a test team description.',
    members: []
  }
  it('renders team name and description', () => {
    const wrapper = mount(TeamCard, {
      props: { team }
    })

    expect(wrapper.find('.card-title').text()).toBe(team.name)
    expect(wrapper.find('p').text()).toBe(team.description)
  })
})
