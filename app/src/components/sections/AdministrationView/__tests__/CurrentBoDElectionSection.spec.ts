// ElectionComponent.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ElectionComponent from '@/components/sections/AdministrationView/CurrentBoDElectionSection.vue'
import { mockElectionsReads, mockElectionsWrites } from '@/tests/mocks'

describe('ElectionComponent', () => {
  let wrapper: ReturnType<typeof mount> | undefined

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
          CreateElectionForm: {
            name: 'CreateElectionForm',
            props: ['isLoading', 'errorMessage'],
            emits: ['createProposal', 'closeModal'],
            template: '<div data-test="create-election-form"></div>'
          },
          ElectionStatus: true,
          ElectionStats: true,
          ElectionActions: {
            name: 'ElectionActions',
            props: ['electionId'],
            emits: ['showResultsModal', 'showCreateElectionModal'],
            template:
              '<button data-test="open-create-election" @click="$emit(\'showCreateElectionModal\')"></button>'
          },
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
      mockElectionsWrites.createElection.mutateAsync.mockResolvedValue({})
    })

    it('handles past start date by adjusting to future', async () => {
      wrapper = createWrapper()

      // Open the modal via ElectionActions to mount CreateElectionForm
      await wrapper.find('[data-test="open-create-election"]').trigger('click')

      const pastDate = new Date(Date.now() - 86400000) // Yesterday
      const mockPastElectionData = {
        ...mockElectionData,
        startDate: pastDate,
        endDate: new Date(Date.now() - 43200000) // 12 hours ago
      }

      const form = wrapper.findComponent({ name: 'CreateElectionForm' })
      await form.vm.$emit('createProposal', mockPastElectionData)
      await new Promise((resolve) => setTimeout(resolve, 0))

      const [{ args }] = mockElectionsWrites.createElection.mutateAsync.mock.calls[0]! as [
        { args: readonly unknown[] }
      ]
      const startTime = Number(args[2])
      const endTime = Number(args[3])

      // Should adjust to current time + 60 seconds
      expect(startTime).toBeGreaterThan(Math.floor(Date.now() / 1000))
      expect(endTime).toBeGreaterThan(startTime)
    })
  })
})
