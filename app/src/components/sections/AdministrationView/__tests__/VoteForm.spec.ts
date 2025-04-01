import { it, expect, describe, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import VoteForm from '@/components/sections/AdministrationView/forms/VoteForm.vue'
vi.mock('vue-router', () => ({
  useRoute: vi.fn(() => ({
    params: {
      id: 0
    }
  }))
}))

describe('VoteForm.vue', () => {
  const proposalDirective = {
    id: 0,
    teamId: 0,
    title: 'Directive',
    draftedBy: 'Ravioli',
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
    id: 1,
    teamId: 0,
    title: 'Election',
    draftedBy: 'Beerbelliez',
    description:
      'The Crypto Native Portal, an app that creates a mechanism to financially acknowledge the micro contributions of Open Source collaborators along with tools that promote effective governance.',

    isElection: true,
    candidates: [
      { name: 'Ravioli', candidateAddress: '0x1', votes: 0 },
      { name: 'Herm', candidateAddress: '0x2', votes: 1 }
    ]
  }
  describe('Renders ', () => {
    it('renders form correctly for election proposal', () => {
      const wrapper = mount(VoteForm, {
        props: {
          proposal: proposalElection,
          isLoading: false,
          team: {
            id: '1',
            name: 'team1',
            description: 'team1',
            teamContracts: [],
            members: [
              {
                id: '1',
                name: 'member1',
                address: '0x1',
                teamId: 0
              }
            ],
            ownerAddress: '0x1'
          }
        }
      })
      const candidates = wrapper.findAll('.form-control')
      expect(candidates.length).toBe(proposalElection.candidates.length)
      proposalElection.candidates.forEach((candidate, index) => {
        expect(candidates[index].text()).toContain(candidate.candidateAddress)
      })
    })

    it('renders form correctly for non-election proposal', () => {
      const wrapper = mount(VoteForm, {
        props: {
          proposal: proposalDirective,
          isLoading: false,
          team: {
            id: '1',
            name: 'team1',
            description: 'team1',
            teamContracts: [],
            members: [
              {
                id: '1',
                name: 'member1',
                address: '0x1',
                teamId: 0
              }
            ],
            ownerAddress: '0x1'
          }
        }
      })
      const options = wrapper.findAll('.form-control')
      expect(options.length).toBe(3) // Yes, No, Abstain
      expect(options[0].text()).toContain('Yes')
      expect(options[1].text()).toContain('No')
      expect(options[2].text()).toContain('Abstain')
    })
  })
  describe('Actions', () => {
    it('casts vote for election proposal', async () => {
      const wrapper = mount(VoteForm, {
        props: {
          proposal: proposalElection,
          isLoading: false,
          team: {
            id: '1',
            name: 'team1',
            description: 'team1',
            teamContracts: [],
            members: [
              {
                id: '1',
                name: 'member1',
                address: '0x1',
                teamId: 0
              }
            ],
            ownerAddress: '0x1'
          }
        }
      })
      const radioButtons = wrapper.findAll('input[type="radio"]')
      await radioButtons[0].setValue() // Select first candidate
      await wrapper.find('button').trigger('click')

      const emitted = wrapper.emitted()
      expect(emitted.voteElection).toBeTruthy()
      expect(emitted.voteElection[0]).toEqual([
        {
          teamId: 0,
          proposalId: 1,
          candidateAddress: proposalElection.candidates[0].candidateAddress
        }
      ])
    })

    it('casts vote of type yes for a directive proposal', async () => {
      const wrapper = mount(VoteForm, {
        props: {
          proposal: proposalDirective,
          isLoading: false,
          team: {
            id: '1',
            name: 'team1',
            description: 'team1',
            teamContracts: [],
            members: [
              {
                id: '1',
                name: 'member1',
                address: '0x1',
                teamId: 0
              }
            ],
            ownerAddress: '0x1'
          }
        }
      })
      const yesButton = wrapper.find('[data-test="yesButton"]')
      await yesButton.setValue()
      await wrapper.find('button').trigger('click')

      const emitted = wrapper.emitted()
      expect(emitted.voteDirective).toBeTruthy()
      expect(emitted.voteDirective[0]).toEqual([
        {
          teamId: 0,
          proposalId: 0,
          option: 1
        }
      ])
    })
    it('casts vote of type no for a directive proposal', async () => {
      const wrapper = mount(VoteForm, {
        props: {
          proposal: proposalDirective,
          isLoading: false,
          team: {
            id: '1',
            name: 'team1',
            description: 'team1',
            teamContracts: [],
            members: [
              {
                id: '1',
                name: 'member1',
                address: '0x1',
                teamId: 0
              }
            ],
            ownerAddress: '0x1'
          }
        }
      })
      const noButton = wrapper.find('[data-test="noButton"]')
      await noButton.setValue()
      await wrapper.find('button').trigger('click')

      const emitted = wrapper.emitted()
      expect(emitted.voteDirective).toBeTruthy()
      expect(emitted.voteDirective[0]).toEqual([
        {
          teamId: 0,
          proposalId: 0,
          option: 0
        }
      ])
    })
    it('casts vote of type abstain for a directive proposal', async () => {
      const wrapper = mount(VoteForm, {
        props: {
          proposal: proposalDirective,
          isLoading: false,
          team: {
            id: '1',
            name: 'team1',
            description: 'team1',
            members: [
              {
                id: '1',
                name: 'member1',
                address: '0x1',
                teamId: 0
              }
            ],
            teamContracts: [],
            ownerAddress: '0x1'
          }
        }
      })
      const abstainButton = wrapper.find('[data-test="abstainButton"]')
      await abstainButton.setValue()
      await wrapper.find('button').trigger('click')

      const emitted = wrapper.emitted()
      expect(emitted.voteDirective).toBeTruthy()
      expect(emitted.voteDirective[0]).toEqual([
        {
          teamId: 0,
          proposalId: 0,
          option: 2
        }
      ])
    })
  })
})
