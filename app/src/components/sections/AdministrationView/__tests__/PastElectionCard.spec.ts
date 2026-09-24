import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { unref } from 'vue'
import PastElectionCard from '@/components/sections/AdministrationView/PastElectionCard.vue'
import { mockTeamStore, mockElectionsReads } from '@/tests/mocks'
import { useElectionsGetVoteCount, useElectionsGetWinners } from '@/composables/elections'
import type { Election } from '@/types'

const memberA = '0x000000000000000000000000000000000000aaaa'
const memberB = '0x000000000000000000000000000000000000bbbb'
const memberC = '0x000000000000000000000000000000000000cccc'

describe('PastElectionCard', () => {
  const election: Election = {
    id: 7,
    title: 'Past Election',
    description: '',
    createdBy: memberA,
    startDate: new Date('2025-01-01'),
    endDate: new Date('2025-01-10'),
    seatCount: 2,
    resultsPublished: true
  }

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mockTeamStore.currentTeamId = '1'
    mockTeamStore.getContractAddressByType.mockReturnValue(
      '0x0000000000000000000000000000000000000010'
    )
    mockTeamStore.currentTeam = {
      ...mockTeamStore.currentTeam,
      members: [{ address: memberA, name: 'Alice' }]
    }
    mockElectionsReads.getVoteCount.data.value = 12n
    mockElectionsReads.getCandidates.data.value = [memberA, memberB, memberC]
    mockElectionsReads.getWinners.data.value = [memberA, memberB]
  })

  it('renders the title, vote count and elected members', () => {
    const wrapper = mount(PastElectionCard, { props: { election } })
    expect(wrapper.text()).toContain('Past Election')
    expect(wrapper.text()).toContain('Completed')
    expect(wrapper.text()).toContain('12')
    expect(wrapper.text()).toContain('Alice')
    expect(wrapper.text()).toContain('Unknown')
  })

  it('shows the seats and the candidates as two distinct figures', () => {
    const wrapper = mount(PastElectionCard, { props: { election } })
    const figure = (name: string) => wrapper.find(`[data-test="${name}"] span:last-child`).text()

    expect(figure('seats')).toBe('2')
    expect(figure('candidates')).toBe('3')
    expect(figure('votes-cast')).toBe('12')
  })

  it('[AC-US-EL-06-04] names published winners instead of provisional vote counts', () => {
    mount(PastElectionCard, { props: { election } })

    const [voteCountId] = vi.mocked(useElectionsGetVoteCount).mock.calls[0] ?? []
    const [winnersId] = vi.mocked(useElectionsGetWinners).mock.calls[0] ?? []
    expect(unref(voteCountId)).toBe(7n)
    expect(unref(winnersId)).toBe(7n)
  })
})
