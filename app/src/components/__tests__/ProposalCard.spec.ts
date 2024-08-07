import { it, expect, describe, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ProposalCard from '@/components/sections/SingleTeamView/ProposalCard.vue'
import { ref } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
// Create a router instance
const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: { template: '<div>Home</div>' } } // Basic route
  ] // Define your routes here if needed
})
vi.mock('../PieChart.vue', () => ({ default: { template: '<span>Success PieChart</span>' } }))

vi.mock('@/stores/useToastStore', () => {
  return {
    useToastStore: vi.fn(() => ({
      addSuccessToast: vi.fn(),
      addErrorToast: vi.fn()
    }))
  }
})

vi.mock('@/composables/voting', () => {
  return {
    useVoteElection: vi.fn(() => ({
      execute: vi.fn(),
      isLoading: ref(true),
      error: vi.fn(),
      isSuccess: ref(true)
    })),
    useVoteDirective: vi.fn(() => ({
      execute: vi.fn(),
      isLoading: ref(true),
      error: vi.fn(),
      isSuccess: ref(true)
    })),
    useConcludeProposal: vi.fn(() => ({
      execute: vi.fn(),
      isLoading: ref(true),
      error: vi.fn(),
      isSuccess: ref(true)
    }))
  }
})

describe('ProposalCard.vue', () => {
  const proposalDirective = {
    id: 0,
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
  describe('render', () => {
    it('renders correctly for directive proposal', () => {
      const wrapper = mount(ProposalCard, {
        global: {
          plugins: [router] // Provide the router instance
        },
        props: { proposal: proposalDirective }
      })
      expect(wrapper.find('.card-title').text()).toBe(proposalDirective.title)
      expect(wrapper.find('.badge-primary').text()).toContain(proposalDirective.draftedBy)
      const expectedDescription =
        proposalDirective.description.length > 120
          ? proposalDirective.description.substring(0, 120) + '...'
          : proposalDirective.description
      expect(wrapper.find('.text-sm').text()).toContain(expectedDescription)
      expect(wrapper.classes()).toContain('bg-blue-100') // blue background for directive
    })

    it('renders correctly for election proposal', () => {
      const wrapper = mount(ProposalCard, {
        global: {
          plugins: [router] // Provide the router instance
        },
        props: { proposal: proposalElection }
      })
      expect(wrapper.find('.card-title').text()).toBe(proposalElection.title)
      const expectedDescription =
        proposalDirective.description.length > 120
          ? proposalDirective.description.substring(0, 120) + '...'
          : proposalDirective.description
      expect(wrapper.find('.text-sm').text()).toContain(expectedDescription)

      expect(wrapper.classes()).toContain('bg-green-100') // green background for election
    })
    it('has Vote and View buttons', () => {
      const wrapper = mount(ProposalCard, {
        global: {
          plugins: [router] // Provide the router instance
        },
        props: { proposal: proposalDirective }
      })
      const buttons = wrapper.findAll('button')
      expect(buttons[0].text()).toBe('Vote')
      expect(buttons[1].text()).toBe('View')
    })
  })
})
