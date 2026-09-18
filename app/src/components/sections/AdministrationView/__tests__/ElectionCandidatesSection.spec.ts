import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import type { Address } from 'viem'
import { unref } from 'vue'
import ElectionCandidateCard from '../ElectionCandidateCard.vue'
import ElectionCandidatesSection from '../ElectionCandidatesSection.vue'
import {
  useElectionsGetCandidateVoteCounts,
  useElectionsGetWinners
} from '@/composables/elections/reads'
import { mockElectionsReads, resetContractMocks } from '@/tests/mocks'

const ALEX = '0x742d35Cc6bF8C55C6C2e013e5492D2b6637e0886' as Address
const BLAIR = '0xA0b86a33E6441bB7bE6d0B9EB5Bbf26b2d60C1cd' as Address

describe('ElectionCandidatesSection', () => {
  let wrapper: VueWrapper

  const mountComponent = () =>
    mount(ElectionCandidatesSection, {
      props: { electionId: 4n },
      global: {
        plugins: [
          createTestingPinia({
            createSpy: vi.fn,
            initialState: {
              team: {
                currentTeam: {
                  members: [
                    { address: ALEX, name: 'Alex', imageUrl: undefined },
                    { address: BLAIR, name: 'Blair', imageUrl: undefined }
                  ]
                }
              }
            }
          })
        ]
      }
    })

  beforeEach(() => {
    vi.clearAllMocks()
    resetContractMocks()
    mockElectionsReads.getCandidates.data.value = [ALEX, BLAIR]
    mockElectionsReads.getVoteCount.data.value = 3n
    mockElectionsReads.getCandidateVoteCounts.data.value = { [ALEX]: 2n, [BLAIR]: 1n }
    mockElectionsReads.hasVoted.data.value = false
    mockElectionsReads.getVoterChoice.data.value = undefined
  })

  afterEach(() => {
    wrapper?.unmount()
  })

  it('[AC-US-EL-06-02] reads and displays every candidate vote count', () => {
    wrapper = mountComponent()

    const cards = wrapper.findAllComponents(ElectionCandidateCard)
    expect(cards).toHaveLength(2)
    expect(useElectionsGetCandidateVoteCounts).toHaveBeenCalledTimes(1)
    expect(cards[0].props('candidate')).toMatchObject({
      address: ALEX,
      currentVotes: 2,
      totalVotes: 3
    })
    expect(cards[1].props('candidate')).toMatchObject({
      address: BLAIR,
      currentVotes: 1,
      totalVotes: 3
    })
  })

  it('marks only the selected candidate once the shared voter choice arrives', async () => {
    wrapper = mountComponent()
    mockElectionsReads.hasVoted.data.value = true
    mockElectionsReads.getVoterChoice.data.value = ALEX
    await wrapper.vm.$nextTick()

    const cards = wrapper.findAllComponents(ElectionCandidateCard)
    expect(cards[0].props('candidate')).toMatchObject({ isSelected: true, isVoteDisabled: true })
    expect(cards[1].props('candidate')).toMatchObject({ isSelected: false, isVoteDisabled: true })
  })

  describe('winner badge', () => {
    const winnersReadId = () => unref(vi.mocked(useElectionsGetWinners).mock.calls[0]?.[0])
    const endedElection = (resultsPublished: boolean) =>
      [4n, 'Board 2025', '', ALEX, 1_700_000_000n, 1_700_086_400n, 1n, resultsPublished] as const

    it('crowns nobody while the results are unpublished, even after the countdown ends', async () => {
      mockElectionsReads.getElection.data.value = endedElection(false)
      wrapper = mountComponent()
      await wrapper.vm.$nextTick()

      const cards = wrapper.findAllComponents(ElectionCandidateCard)
      expect(cards.every((card) => card.props('candidate').isElectionWinner === false)).toBe(true)
      expect(winnersReadId()).toBe(0n)
    })

    it('shows the badge only on the published winners', async () => {
      mockElectionsReads.getElection.data.value = endedElection(true)
      mockElectionsReads.getWinners.data.value = [BLAIR]
      wrapper = mountComponent()
      await wrapper.vm.$nextTick()

      const cards = wrapper.findAllComponents(ElectionCandidateCard)
      expect(cards[0].props('candidate').isElectionWinner).toBe(false)
      expect(cards[1].props('candidate').isElectionWinner).toBe(true)
      expect(winnersReadId()).toBe(4n)
    })
  })
})
