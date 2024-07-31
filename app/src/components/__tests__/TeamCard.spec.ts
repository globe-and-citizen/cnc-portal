import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import TeamCard from '@/components/TeamCard.vue'
import { createTestingPinia } from '@pinia/testing'

describe('TeamCard', () => {
  const props = {
    team: {
      name: 'Team A',
      description: 'This is a description of Team A.',
      bankAddress: null,
      id: '1',
      members: [],
      ownerAddress: '0x4b6Bf5cD91446408290725879F5666dcd9785F62',
      votingAddress: null
    }
  }

  const wrapper = mount(TeamCard, {
    props,
    global: {
      plugins: [createTestingPinia({ createSpy: vi.fn })]
    }
  })

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
