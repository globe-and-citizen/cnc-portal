import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import type { Address } from 'viem'
import ElectionCandidateCard from '../ElectionCandidateCard.vue'
import ElectionCandidatesSection from '../ElectionCandidatesSection.vue'
import { useElectionsGetCandidateVoteCounts } from '@/composables/elections/reads'
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
    mockElectionsReads.getResults.data.value = []
  })

  afterEach(() => {
    wrapper?.unmount()
  })

  it('reads every candidate count once and distributes the grouped values to cards', () => {
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
})
