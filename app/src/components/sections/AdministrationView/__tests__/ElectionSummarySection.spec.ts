// ElectionSummarySection.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ElectionSummarySection from '@/components/sections/AdministrationView/ElectionSummarySection.vue'
import { mockElectionsReads, mockElectionsWrites } from '@/tests/mocks'

describe('ElectionSummarySection', () => {
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
    return mount(ElectionSummarySection, {
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
          ElectionSummaryEmptyState: true
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

    it('sends the dates the form decided, untouched', async () => {
      wrapper = createWrapper()

      // Open the modal via ElectionActions to mount CreateElectionForm
      await wrapper.find('[data-test="open-create-election"]').trigger('click')

      const form = wrapper.findComponent({ name: 'CreateElectionForm' })
      await form.vm.$emit('createProposal', mockElectionData)
      await new Promise((resolve) => setTimeout(resolve, 0))

      const [{ args }] = mockElectionsWrites.createElection.mutateAsync.mock.calls[0]! as [
        { args: readonly unknown[] }
      ]

      expect(Number(args[2])).toBe(Math.floor(mockElectionData.startDate.getTime() / 1000))
      expect(Number(args[3])).toBe(Math.floor(mockElectionData.endDate.getTime() / 1000))
    })
  })
})
