import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import type { Address } from 'viem'
import BodElectionDetailsView from '@/views/team/[id]/BodElectionDetailsView.vue'
import BodMembersSection from '@/components/sections/AdministrationView/BodMembersSection.vue'
import ElectionSummarySection from '@/components/sections/AdministrationView/ElectionSummarySection.vue'
import ElectionCandidatesSection from '@/components/sections/AdministrationView/ElectionCandidatesSection.vue'
import { mockElectionsReads, resetContractMocks, setMockRoute } from '@/tests/mocks'
import type { RawElection } from '@/utils/elections/election'

const CREATOR = '0x742d35Cc6bF8C55C6C2e013e5492D2b6637e0886' as Address

const election = (resultsPublished: boolean): RawElection => [
  3n,
  'Board 2026',
  'Seats the next board',
  CREATOR,
  1_700_000_000n,
  1_700_086_400n,
  3n,
  resultsPublished
]

describe('BodElectionDetailsView.vue', () => {
  let wrapper: VueWrapper

  const mountComponent = () =>
    mount(BodElectionDetailsView, {
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })],
        stubs: {
          BodMembersSection: true,
          ElectionSummarySection: true,
          ElectionCandidatesSection: true
        }
      }
    })

  const summarySection = () => wrapper.findComponent(ElectionSummarySection)

  beforeEach(() => {
    vi.clearAllMocks()
    resetContractMocks()
    mockElectionsReads.getElection.data.value = election(false)
  })

  afterEach(() => {
    if (wrapper) wrapper.unmount()
  })

  describe('Election selection', () => {
    it('opens the election named in the URL', () => {
      setMockRoute({ query: { electionId: '2' } })
      mockElectionsReads.nextElectionId.data.value = 9n
      wrapper = mountComponent()

      expect(summarySection().props('electionId')).toBe(2n)
    })

    it('falls back to the election in progress when the URL names none', () => {
      mockElectionsReads.nextElectionId.data.value = 9n
      wrapper = mountComponent()

      expect(summarySection().props('electionId')).toBe(8n)
    })

    it('ignores an election id the URL cannot supply', () => {
      setMockRoute({ query: { electionId: 'latest' } })
      mockElectionsReads.nextElectionId.data.value = 9n

      expect(() => (wrapper = mountComponent())).not.toThrow()
      expect(summarySection().props('electionId')).toBe(8n)
    })
  })

  describe('Contracts arriving after the page is built', () => {
    it('shows nothing until an election id is known', () => {
      mockElectionsReads.nextElectionId.data.value = null
      wrapper = mountComponent()

      expect(summarySection().exists()).toBe(false)
      expect(wrapper.findComponent(ElectionCandidatesSection).exists()).toBe(false)
    })

    it('renders the election once the read lands, without remounting', async () => {
      mockElectionsReads.nextElectionId.data.value = null
      wrapper = mountComponent()

      expect(summarySection().exists()).toBe(false)

      mockElectionsReads.nextElectionId.data.value = 9n
      await wrapper.vm.$nextTick()

      expect(summarySection().exists()).toBe(true)
      expect(wrapper.findComponent(ElectionCandidatesSection).props('electionId')).toBe(8n)
    })
  })

  describe('Published results', () => {
    it('hides the elected board while the results are unpublished', () => {
      mockElectionsReads.nextElectionId.data.value = 9n
      wrapper = mountComponent()

      expect(wrapper.findComponent(BodMembersSection).exists()).toBe(false)
      expect(summarySection().props('isDetails')).toBe(false)
    })

    it('shows the elected board once the results are published', async () => {
      mockElectionsReads.nextElectionId.data.value = 9n
      wrapper = mountComponent()

      mockElectionsReads.getElection.data.value = election(true)
      await wrapper.vm.$nextTick()

      const board = wrapper.findComponent(BodMembersSection)
      expect(board.exists()).toBe(true)
      expect(board.props('electionId')).toBe(8n)
      expect(summarySection().props('isDetails')).toBe(true)
    })
  })
})
