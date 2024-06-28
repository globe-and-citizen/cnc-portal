import { it, expect, describe } from 'vitest'
import { mount } from '@vue/test-utils'
import ProposalCard from '../ProposalCard.vue'

describe('ProposalCard.vue', () => {
  const proposalDirective = {
    title: 'Directive',
    draftedBy: 'Ravioli',
    description: 'This is a test directive.',
    isElection: false,
    votes: {
      yes: 10,
      no: 5,
      abstain: 3
    },
    votersForUsers: []
  }

  const proposalElection = {
    title: 'Election',
    draftedBy: 'Beerbelliez',
    description: 'This is a test election.',
    isElection: true,
    votesForUsers: [
      { name: 'Ravioli', address: '0x1', votes: 0 },
      { name: 'Herm', address: '0x2', votes: 1 }
    ]
  }
  describe('render', () => {
    it('renders correctly for directive proposal', () => {
      const wrapper = mount(ProposalCard, {
        props: { proposal: proposalDirective }
      })
      expect(wrapper.find('.card-title').text()).toBe(proposalDirective.title)
      expect(wrapper.find('.badge-primary').text()).toContain(proposalDirective.draftedBy)
      expect(wrapper.find('.text-sm').text()).toContain(proposalDirective.description)
      expect(wrapper.findAll('progress').length).toBe(3) // 3 progress bars for Yes, No, Abstain
      expect(wrapper.classes()).toContain('bg-blue-100') // blue background for directive
    })

    it('renders correctly for election proposal', () => {
      const wrapper = mount(ProposalCard, {
        props: { proposal: proposalElection }
      })
      expect(wrapper.find('.card-title').text()).toBe(proposalElection.title)
      expect(wrapper.find('.badge-primary').text()).toContain(proposalElection.draftedBy)
      expect(wrapper.find('.text-sm').text()).toContain(proposalElection.description)
      expect(wrapper.findAll('progress').length).toBe(proposalElection.votesForUsers.length) // 1 progress bar per user
      proposalElection.votesForUsers.forEach((user) => {
        expect(wrapper.text()).toContain(user.name)
      })
      expect(wrapper.classes()).toContain('bg-green-100') // green background for election
    })
    it('has Vote and View buttons', () => {
      const wrapper = mount(ProposalCard, {
        props: { proposal: proposalDirective }
      })
      const buttons = wrapper.findAll('button')
      expect(buttons.length).toBe(2)
      expect(buttons[0].text()).toBe('Vote')
      expect(buttons[1].text()).toBe('View')
    })
  })
})
