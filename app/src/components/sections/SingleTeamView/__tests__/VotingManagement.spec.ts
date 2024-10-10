import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import VotingManagement from '../VotingManagement.vue'
import { createTestingPinia } from '@pinia/testing'
import { useToastStore } from '@/stores/useToastStore'
import { useUserDataStore } from '@/stores/user'
import ModalComponent from '@/components/ModalComponent.vue'

interface ComponentData {
  transferOwnershipModal: boolean
}
vi.mock('@/stores/useToastStore', () => ({
  useToastStore: vi.fn().mockReturnValue({
    addErrorToast: vi.fn(),
    addSuccessToast: vi.fn()
  })
}))

vi.mock('@/composables/voting', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/composables/voting')>()
  return {
    ...actual,
    useVotingContractStatus: vi.fn().mockReturnValue({
      isLoading: false,
      error: null,
      data: false,
      execute: vi.fn()
    }),
    useVotingContractOwner: vi.fn().mockReturnValue({
      isLoading: false,
      error: null,
      data: '0x1234567890123456789012345678901234567890',
      execute: vi.fn()
    }),
    useVotingContractPause: vi.fn().mockReturnValue({
      isLoading: false,
      error: null,
      execute: vi.fn()
    }),
    useVotingContractUnpause: vi.fn().mockReturnValue({
      isLoading: false,
      error: null,
      execute: vi.fn()
    }),
    useVotingContractTransferOwnership: vi.fn().mockReturnValue({
      isLoading: false,
      error: null,
      execute: vi.fn()
    })
  }
})

describe('VotingManagement', () => {
  function createComponent() {
    return mount(VotingManagement, {
      props: {
        team: {
          votingAddress: '0x1234567890123456789012345678901234567890',
          boardOfDirectorsAddress: '0x0987654321098765432109876543210987654321'
        }
      },
      global: {
        plugins: [
          createTestingPinia({
            createSpy: vi.fn,
            initialState: {
              user: { address: '0x1234567890123456789012345678901234567890' }
            }
          })
        ]
      }
    })
  }

  describe('Renders', () => {
    it('renders correctly', () => {
      const wrapper = createComponent()
      expect(wrapper.find('div[data-test="title"]').text()).toBe('Manage Voting Contract')
      expect(wrapper.find('h3[data-test="status"]').text()).toBe('Status: Active')
    })

    it('displays the correct voting contract status', async () => {
      const wrapper = createComponent()
      await wrapper.vm.$nextTick()
      expect(wrapper.find('h3[data-test="status"]').text()).toBe('Status: Active')
    })

    it('displays the correct voting contract owner', async () => {
      const wrapper = createComponent()
      await wrapper.vm.$nextTick()
      expect(wrapper.find('div[data-test="owner"]').text()).toBe(
        '0x1234567890123456789012345678901234567890'
      )
    })

    it('shows transfer ownership button', () => {
      const wrapper = createComponent()
      expect(wrapper.find('button[data-test="transfer-ownership"]').text()).toBe(
        'Transfer Ownership'
      )
    })

    it('shows transfer to Board of Directors button', () => {
      const wrapper = createComponent()
      expect(wrapper.find('button[data-test="transfer-to-board-of-directors"]').text()).toBe(
        'Transfer to Board Of Directors Contract'
      )
    })

    it('shows error toast when user is not the owner', async () => {
      const wrapper = createComponent()
      const userStore = useUserDataStore()
      userStore.address = '0x0000000000000000000000000000000000000000'

      const pauseButton = wrapper.find('button.btn-primary')
      await pauseButton.trigger('click')

      const toastStore = useToastStore()
      expect(toastStore.addErrorToast).toHaveBeenCalledWith(
        'You are not the owner of this voting contract'
      )
    })

    it('shows ModalComponent when transferOwnership is clicked', async () => {
      const wrapper = createComponent()
      const transferOwnershipButton = wrapper.find('button[data-test="transfer-ownership"]')
      await transferOwnershipButton.trigger('click')
      expect(wrapper.findComponent(ModalComponent).exists()).toBeTruthy()
    })
  })

  describe('Emits', async () => {
    it('emits transferOwnership event', async () => {
      const wrapper = createComponent()
      const transferOwnershipButton = wrapper.find('button[data-test="transfer-ownership"]')
      await transferOwnershipButton.trigger('click')
      expect((wrapper.vm as unknown as ComponentData).transferOwnershipModal).toBeTruthy()
    })
  })
})
