import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { ref } from 'vue'
import PastBoDElectionCard from '@/components/sections/AdministrationView/PastBoDElectionCard.vue'
import { useReadContractFn, mockUseReadContract } from '@/tests/mocks/wagmi.vue.mock'

const memberA = '0x000000000000000000000000000000000000aaaa'
const memberB = '0x000000000000000000000000000000000000bbbb'

vi.mock('@/stores', () => ({
  useTeamStore: () => ({
    currentTeamId: '1',
    getContractAddressByType: () => '0x0000000000000000000000000000000000000010',
    currentTeam: {
      members: [{ address: memberA, name: 'Alice' }]
    }
  })
}))

describe('PastBoDElectionCard', () => {
  const election = {
    id: 7n,
    title: 'Past Election',
    description: '',
    startDate: new Date('2025-01-01'),
    endDate: new Date('2025-01-10'),
    seatCount: 2,
    isElectionOpen: false,
    isResultsPublished: true
  } as unknown as Record<string, unknown>

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    useReadContractFn.mockImplementation((args: { functionName: string }) => {
      if (args.functionName === 'getVoteCount') {
        return { ...mockUseReadContract, data: ref(12n), error: ref(null) }
      }
      if (args.functionName === 'getElectionResults') {
        return {
          ...mockUseReadContract,
          data: ref([memberA, memberB]),
          error: ref(null)
        }
      }
      return { ...mockUseReadContract }
    })
  })

  it('renders the title, vote count and elected members', () => {
    const wrapper = mount(PastBoDElectionCard, { props: { election } })
    expect(wrapper.text()).toContain('Past Election')
    expect(wrapper.text()).toContain('Completed')
    expect(wrapper.text()).toContain('12')
    expect(wrapper.text()).toContain('Alice')
    expect(wrapper.text()).toContain('Unknown')
  })
})
