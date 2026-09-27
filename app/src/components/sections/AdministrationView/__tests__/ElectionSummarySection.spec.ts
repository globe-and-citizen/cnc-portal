// ElectionSummarySection.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { BaseError, UserRejectedRequestError } from 'viem'
import { ref } from 'vue'
import ElectionSummarySection from '@/components/sections/AdministrationView/ElectionSummarySection.vue'
import { mockElectionsReads, mockElectionsWrites } from '@/tests/mocks'
import { useCreateElectionNotificationsMutation } from '@/queries/action.queries'
import { mockTeamData } from '@/tests/mocks/query.mock'
import { useTeamStore } from '@/stores'

describe('[US-EL-01] ElectionSummarySection', () => {
  let wrapper: ReturnType<typeof mount> | undefined
  const addElectionNotifications = vi.fn()
  const notificationError = ref<Error | null>(null)

  beforeEach(() => {
    setActivePinia(createPinia())
    useTeamStore().currentTeamId = '1'

    // Reset mocks
    vi.clearAllMocks()
    mockElectionsReads.getElection.data.value = null
    mockElectionsReads.getVoteCount.data.value = 0n
    mockElectionsReads.getCandidates.data.value = []
    mockElectionsReads.getEligibleVoters.data.value = []
    addElectionNotifications.mockResolvedValue(undefined)
    notificationError.value = null
    vi.mocked(useCreateElectionNotificationsMutation).mockReturnValue({
      mutateAsync: addElectionNotifications,
      error: notificationError
    } as never)
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

    /**
     * Covers:
     * - [AC-US-EL-01-01]
     * - [AC-US-EL-01-03]
     * - [AC-US-EL-04-01]
     * - [AC-US-EL-04-03]
     */
    it('submits the chosen election, current members, and notification request in order', async () => {
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
      expect(args[6]).toEqual(mockTeamData.members.map((member) => member.address))
      expect(addElectionNotifications).toHaveBeenCalledWith({ pathParams: { teamId: '1' } })
      expect(
        mockElectionsWrites.createElection.mutateAsync.mock.invocationCallOrder[0]
      ).toBeLessThan(addElectionNotifications.mock.invocationCallOrder[0]!)
    })

    it('[AC-US-EL-01-08] stops after a rejected wallet request without requesting notifications', async () => {
      mockElectionsWrites.createElection.mutateAsync.mockRejectedValueOnce(
        new BaseError('rejected', {
          cause: new UserRejectedRequestError(new Error('rejected'))
        })
      )
      wrapper = createWrapper()
      await wrapper.find('[data-test="open-create-election"]').trigger('click')

      const form = wrapper.findComponent({ name: 'CreateElectionForm' })
      await form.vm.$emit('createProposal', mockElectionData)
      await new Promise((resolve) => setTimeout(resolve, 0))

      expect(mockElectionsWrites.createElection.mutateAsync).toHaveBeenCalledTimes(1)
      expect(addElectionNotifications).not.toHaveBeenCalled()
      expect(form.props('errorMessage')).toBe('')
    })

    it('[AC-US-EL-01-09] keeps a rejected creation recoverable in the open form', async () => {
      mockElectionsWrites.createElection.mutateAsync.mockRejectedValueOnce(
        new Error('creation failed')
      )
      wrapper = createWrapper()
      await wrapper.find('[data-test="open-create-election"]').trigger('click')

      const form = wrapper.findComponent({ name: 'CreateElectionForm' })
      await form.vm.$emit('createProposal', mockElectionData)
      await new Promise((resolve) => setTimeout(resolve, 0))

      expect(form.exists()).toBe(true)
      expect(form.props('errorMessage')).toBe('creation failed')
      expect(mockElectionsWrites.createElection.mutateAsync).toHaveBeenCalledTimes(1)
    })

    it('[AC-US-EL-01-14] closes an untouched creation flow without submitting', async () => {
      wrapper = createWrapper()
      await wrapper.find('[data-test="open-create-election"]').trigger('click')

      expect(wrapper.findComponent({ name: 'CreateElectionForm' }).exists()).toBe(true)
      await wrapper.find('[data-test="close-wage-modal-button"]').trigger('click')

      expect(wrapper.findComponent({ name: 'CreateElectionForm' }).exists()).toBe(false)
      expect(mockElectionsWrites.createElection.mutateAsync).not.toHaveBeenCalled()
      expect(addElectionNotifications).not.toHaveBeenCalled()
    })

    it('[AC-US-EL-04-05] leaves the successful chain write intact when notifications fail', async () => {
      addElectionNotifications.mockRejectedValueOnce(new Error('notification failed'))
      wrapper = createWrapper()
      await wrapper.find('[data-test="open-create-election"]').trigger('click')

      const form = wrapper.findComponent({ name: 'CreateElectionForm' })
      await form.vm.$emit('createProposal', mockElectionData)
      await new Promise((resolve) => setTimeout(resolve, 0))

      expect(mockElectionsWrites.createElection.mutateAsync).toHaveBeenCalledTimes(1)
      expect(addElectionNotifications).toHaveBeenCalledTimes(1)
      expect(form.exists()).toBe(true)
    })
  })
})
