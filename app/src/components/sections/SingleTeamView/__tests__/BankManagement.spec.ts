import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import BankManagement from '../BankManagement.vue'
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

vi.mock('@/composables/bank', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/composables/bank')>()
  return {
    ...actual,
    useBankStatus: vi.fn().mockReturnValue({
      isLoading: false,
      error: null,
      data: false,
      execute: vi.fn()
    }),
    useBankOwner: vi.fn().mockReturnValue({
      isLoading: false,
      error: null,
      data: '0x1234567890123456789012345678901234567890',
      execute: vi.fn()
    })
  }
})

describe('BankManagement', () => {
  function createComponent() {
    return mount(BankManagement, {
      props: {
        team: {
          bankAddress: '0x1234567890123456789012345678901234567890',
          ownerAddress: '0x1234567890123456789012345678901234567890',
          boardOfDirectorsAddress: '0x0987654321098765432109876543210987654321'
        },
        bankOwner: '0x1234567890123456789012345678901234567890',
        loadingOwner: false
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
      expect(wrapper.find('h2[data-test="title"]').text()).toBe('Manage Bank')
      expect(wrapper.find('h3[data-test="status"]').text()).toBe('Status: Active')
    })

    it('displays the correct bank status', async () => {
      const wrapper = createComponent()
      await wrapper.vm.$nextTick()
      expect(wrapper.find('h3[data-test="status"]').text()).toBe('Status: Active')
    })

    it('displays the correct bank owner', async () => {
      const wrapper = createComponent()
      await wrapper.vm.$nextTick()
      expect(wrapper.find('h3[data-test="owner"]').text()).toBe(
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
