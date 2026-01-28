import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import VotingManagement from '@/components/sections/AdministrationView/VotingManagement.vue'
import { createTestingPinia } from '@pinia/testing'

import ModalComponent from '@/components/ModalComponent.vue'
import { ref } from 'vue'

interface ComponentData {
  transferOwnershipModal: boolean
}


// Define proper types for the mocks
type MockError = Error | null

const mockUseReadContract = {
  data: ref<boolean | string | null>('0x1234567890123456789012345678901234567890'),
  isLoading: ref(false),
  error: ref<MockError>(null),
  refetch: vi.fn()
}

const mockUseWriteContract = {
  writeContract: vi.fn(),
  error: ref<MockError>(null),
  isPending: ref(false),
  data: ref(null)
}

const mockUseWaitForTransactionReceipt = {
  isLoading: ref(false),
  isSuccess: ref(false)
}
const mockUseSendTransaction = {
  isPending: ref(false),
  error: ref<MockError>(null),
  data: ref<string>(''),
  sendTransaction: vi.fn()
}
const mockUseBalance = {
  data: ref<string | null>(null),
  isLoading: ref(false),
  error: ref<MockError>(null),
  refetch: vi.fn()
}

// Mocking wagmi functions
vi.mock('@wagmi/vue', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    useReadContract: vi.fn(() => mockUseReadContract),
    useWriteContract: vi.fn(() => mockUseWriteContract),
    useWaitForTransactionReceipt: vi.fn(() => mockUseWaitForTransactionReceipt),
    useSendTransaction: vi.fn(() => mockUseSendTransaction),
    useBalance: vi.fn(() => mockUseBalance)
  }
})

describe.skip('VotingManagement', () => {
  function createComponent() {
    return mount(VotingManagement, {
      props: {
        team: {
          teamContracts: [
            {
              address: '0xcontractaddress',
              admins: [],
              type: 'Voting',
              deployer: '0xdeployeraddress'
            },
            {
              address: '0xcontractaddress',
              admins: [],
              type: 'BoardOfDirectors',
              deployer: '0xdeployeraddress'
            }
          ]
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
      expect(wrapper.find('[data-test="title"]').text()).toBe('Manage Voting Contract')
      expect(wrapper.find('[data-test="status"]').text()).toBe('Status: Paused')
    })

    it('displays the correct voting contract status', async () => {
      const wrapper = createComponent()
      await wrapper.vm.$nextTick()
      expect(wrapper.find('[data-test="status"]').text()).toBe('Status: Paused')
    })

    it('displays the correct voting contract owner', async () => {
      const wrapper = createComponent()
      await wrapper.vm.$nextTick()
      expect(wrapper.find('[data-test="owner"]').text()).toBe(
        '0x1234567890123456789012345678901234567890'
      )
    })

    it('shows transfer ownership button', () => {
      const wrapper = createComponent()
      expect(wrapper.find('[data-test="transfer-ownership"]').text()).toBe('Transfer Ownership')
    })

    it('shows transfer to Board of Directors button', () => {
      const wrapper = createComponent()
      expect(wrapper.find('[data-test="transfer-to-board-of-directors"]').exists()).toBe(true)
    })

    it('shows ModalComponent when transferOwnership is clicked', async () => {
      const wrapper = createComponent()
      const transferOwnershipButton = wrapper.find('[data-test="transfer-ownership"]')
      await transferOwnershipButton.trigger('click')
      expect(wrapper.findComponent(ModalComponent).exists()).toBeTruthy()
    })

    it('shows loading skeleton when owner is loading', async () => {
      mockUseReadContract.isLoading.value = true
      const wrapper = createComponent()
      expect(wrapper.findComponent({ name: 'SkeletonLoading' }).exists()).toBeTruthy()
    })

    it('shows loading skeleton when paused status is loading', async () => {
      mockUseReadContract.isLoading.value = true
      const wrapper = createComponent()
      expect(wrapper.findComponent({ name: 'SkeletonLoading' }).exists()).toBeTruthy()
    })
  })

  describe('Emits', async () => {
    it('emits transferOwnership event', async () => {
      const wrapper = createComponent()
      const transferOwnershipButton = wrapper.find('[data-test="transfer-ownership"]')
      await transferOwnershipButton.trigger('click')
      expect((wrapper.vm as unknown as ComponentData).transferOwnershipModal).toBeTruthy()
    })
  })

  describe('Pause/Unpause Functionality', () => {
    it('shows correct button text based on pause status', async () => {
      mockUseReadContract.data.value = false // Not paused
      const wrapper = createComponent()
      await wrapper.vm.$nextTick()
      expect(wrapper.find('.btn.btn-primary').text()).toBe('Pause')

      mockUseReadContract.data.value = true // Paused
      await wrapper.vm.$nextTick()
      expect(wrapper.find('.btn.btn-primary').text()).toBe('Unpause')
    })

    it('calls pause function when clicking pause button', async () => {
      mockUseReadContract.data.value = false // Not paused
      const wrapper = createComponent()
      await wrapper.vm.$nextTick()
      await wrapper.find('.btn.btn-primary').trigger('click')
      expect(mockUseWriteContract.writeContract).toHaveBeenCalledWith({
        functionName: 'pause',
        args: [],
        abi: expect.any(Array),
        address: '0x1234567890123456789012345678901234567890'
      })
    })

    it('calls unpause function when clicking unpause button', async () => {
      mockUseReadContract.data.value = true // Paused
      const wrapper = createComponent()
      await wrapper.vm.$nextTick()
      await wrapper.find('.btn.btn-primary').trigger('click')
      expect(mockUseWriteContract.writeContract).toHaveBeenCalledWith({
        functionName: 'unpause',
        args: [],
        abi: expect.any(Array),
        address: '0x1234567890123456789012345678901234567890'
      })
    })
  })

  describe('Ownership Transfer', () => {
    it('calls transferOwnership with BoD address when clicking transfer to BoD button', async () => {
      const wrapper = createComponent()
      await wrapper.find('[data-test="transfer-to-board-of-directors"]').trigger('click')
      expect(mockUseWriteContract.writeContract).toHaveBeenCalledWith({
        functionName: 'transferOwnership',
        args: ['0x0987654321098765432109876543210987654321'],
        abi: expect.any(Array),
        address: '0x1234567890123456789012345678901234567890'
      })
    })

    it('closes transfer ownership modal after successful transfer', async () => {
      const wrapper = createComponent()
      await wrapper.find('[data-test="transfer-ownership"]').trigger('click')
      expect((wrapper.vm as unknown as ComponentData).transferOwnershipModal).toBeTruthy()

      mockUseWaitForTransactionReceipt.isLoading.value = true
      await wrapper.vm.$nextTick()
      mockUseWaitForTransactionReceipt.isLoading.value = false
      mockUseWaitForTransactionReceipt.isSuccess.value = true
      await wrapper.vm.$nextTick()

      expect((wrapper.vm as unknown as ComponentData).transferOwnershipModal).toBeFalsy()
    })
  })
})
