import { it, expect, describe } from 'vitest'
import { mount } from '@vue/test-utils'
import PollDetails from '../PollDetails.vue'

describe('PollDetails.vue', () => {
  const proposalDirective = {
    title: 'Directive',
    description:
      'The Crypto Native Portal, an app that creates a mechanism to financially acknowledge the micro contributions of Open Source collaborators along with tools that promote effective governance.',
    isElection: false,
    votes: {
      yes: 10,
      no: 5,
      abstain: 3
    },
    candidates: []
  }

  const proposalElection = {
    title: 'Election',
    description:
      'The Crypto Native Portal, an app that creates a mechanism to financially acknowledge the micro contributions of Open Source collaborators along with tools that promote effective governance.',
    isElection: true,
    candidates: [
      { name: 'Ravioli', candidateAddress: '0x1', votes: 0 },
      { name: 'Herm', candidateAddress: '0x2', votes: 1 }
    ]
  }

  it('renders proposal title and description correctly', () => {
    const wrapper = mount(PollDetails, {
      props: { proposal: proposalDirective }
    })
    expect(wrapper.find('h2').text()).toBe(proposalDirective.title)
    expect(wrapper.find('.text-sm').text()).toContain(proposalDirective.description)
  })

  it('renders vote details correctly for non-election proposal', () => {
    const wrapper = mount(PollDetails, {
      props: { proposal: proposalDirective }
    })
    const voteDetails = wrapper.findAll('.text-sm')
    expect(voteDetails[1].text()).toContain(`Yes: ${proposalDirective.votes.yes}`)
    expect(voteDetails[2].text()).toContain(`No: ${proposalDirective.votes.no}`)
    expect(voteDetails[3].text()).toContain(`Abstain: ${proposalDirective.votes.abstain}`)
  })

  it('renders candidate details correctly for election proposal', () => {
    const wrapper = mount(PollDetails, {
      props: { proposal: proposalElection }
    })
    const candidateDetails = wrapper.findAll('.text-sm')
    proposalElection.candidates.forEach((candidate, index) => {
      expect(candidateDetails[index + 1].text()).toContain(`${candidate.name} : ${candidate.votes}`)
    })
  })
})
