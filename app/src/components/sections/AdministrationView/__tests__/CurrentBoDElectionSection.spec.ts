// ElectionComponent.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ElectionComponent from '@/components/sections/AdministrationView/CurrentBoDElectionSection.vue'
import ElectionStatus from '@/components/sections/AdministrationView/ElectionStatus.vue'
import ElectionStats from '@/components/sections/AdministrationView/ElectionStats.vue'
import ElectionActions from '@/components/sections/AdministrationView/ElectionActions.vue'
import CurrentBoDElection404 from '../CurrentBoDElection404.vue'
import { mockElectionsReads, mockWagmiCore } from '@/tests/mocks'

describe('ElectionComponent', () => {
  let wrapper: ReturnType<typeof mount> | undefined

  const setMockElection = (overrides?: Partial<readonly (string | bigint | boolean)[]>) => {
    const now = Math.floor(Date.now() / 1000)
    const base: readonly (string | bigint | boolean)[] = [
      1n,
      'Test Election',
      'Test Description',
      '0xCreator',
      BigInt(now + 60),
      BigInt(now + 3600),
      3n,
      false
    ]

    const electionData = overrides
      ? base.map((value, index) => {
          if (overrides[index] !== undefined) {
            return overrides[index] as string | bigint | boolean
          }
          return value
        })
      : base

    mockElectionsReads.getElection.data.value = electionData
  }

  beforeEach(() => {
    setActivePinia(createPinia())

    // Reset mocks
    vi.clearAllMocks()
    mockElectionsReads.getElection.data.value = null
    mockElectionsReads.getVoteCount.data.value = 0n
    mockElectionsReads.getCandidates.data.value = []
    mockElectionsReads.getEligibleVoters.data.value = []
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  const createWrapper = (props = {}) => {
    return mount(ElectionComponent, {
      props: {
        electionId: 123n,
        isDetails: false,
        ...props
      },
      global: {
        stubs: {
          CreateElectionForm: true,
          ElectionStatus: true,
          ElectionStats: true,
          ElectionActions: true,
          CurrentBoDElection404: true
        }
      }
    })
  }

  describe('Modal functionality', () => {
    it('does not mount UModal initially', () => {
      wrapper = createWrapper()
      expect(wrapper.findComponent({ name: 'UModal' }).exists()).toBe(false)
    })
  })

  describe('createElection function', () => {
    const mockElectionData = {
      title: 'New Election',
      description: 'Description',
      startDate: new Date(Date.now() + 86400000), // Tomorrow
      endDate: new Date(Date.now() + 172800000), // Day after tomorrow
      winnerCount: 3,
      candidates: [{ candidateAddress: '0xABC' }, { candidateAddress: '0xDEF' }]
    }

    beforeEach(() => {
      mockWagmiCore.simulateContract.mockResolvedValue({})
      mockWagmiCore.writeContract.mockResolvedValue('0xTXNHASH')
      mockWagmiCore.waitForTransactionReceipt.mockResolvedValue({})
    })

    it('handles past start date by adjusting to future', async () => {
      wrapper = createWrapper()

      const pastDate = new Date(Date.now() - 86400000) // Yesterday
      const mockPastElectionData = {
        ...mockElectionData,
        startDate: pastDate,
        endDate: new Date(Date.now() - 43200000) // 12 hours ago
      }

      const vm = wrapper.vm as unknown as {
        createElection: (data: typeof mockPastElectionData) => Promise<void>
      }

      await vm.createElection(mockPastElectionData)

      const args = mockWagmiCore.simulateContract.mock.calls[0]![1].args as unknown[]
      const startTime = Number(args[2])
      const endTime = Number(args[3])

      // Should adjust to current time + 60 seconds
      expect(startTime).toBeGreaterThan(Math.floor(Date.now() / 1000))
      expect(endTime).toBeGreaterThan(startTime)
    })
  })
})
