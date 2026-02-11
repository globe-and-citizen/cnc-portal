import AddSignerModal from '@/components/sections/SafeView/forms/AddSignerModal.vue'
import ModalComponent from '@/components/ModalComponent.vue'
import ButtonUI from '@/components/ButtonUI.vue'
import MultiSelectMemberInput from '@/components/utils/MultiSelectMemberInput.vue'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick, ref } from 'vue'
import type { User } from '@/types'
import { Icon } from '@iconify/vue'

// Mock data
const MOCK_USERS: User[] = [
  { id: '1', address: '0x1234567890123456789012345678901234567890', name: 'Alice' },
  { id: '2', address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd', name: 'Bob' },
  { id: '3', address: '0x9876543210987654321098765432109876543210', name: 'Charlie' }
]

const MOCK_CURRENT_OWNERS = ['0x1111111111111111111111111111111111111111']
const MOCK_SAFE_ADDRESS = '0xSafeAddress123456789012345678901234567890' as `0x${string}`

// Hoisted mocks
const { mockToastStore, mockUseSafeOwnerManagement } = vi.hoisted(() => ({
  mockToastStore: {
    addSuccessToast: vi.fn(),
    addErrorToast: vi.fn()
  },
  mockUseSafeOwnerManagement: vi.fn()
}))

vi.mock('@/stores', () => ({
  useToastStore: vi.fn(() => mockToastStore)
}))

vi.mock('@/composables/safe', () => ({
  useSafeOwnerManagement: mockUseSafeOwnerManagement
}))

let wrapper: ReturnType<typeof mount>

const SELECTORS = {
  modal: '[data-test="add-signer-modal"]',
  newSignersInput: '[data-test="new-signers-input"]',
  cancelButton: '[data-test="cancel-button"]',
  addSignersButton: '[data-test="add-signers-button"]'
} as const

const createWrapper = (props = {}, mockComposableOverrides = {}) => {
  const mockUpdateOwners = vi.fn()
  const mockIsUpdating = ref(false)

  mockUseSafeOwnerManagement.mockReturnValue({
    isUpdating: mockIsUpdating,
    updateOwners: mockUpdateOwners,
    ...mockComposableOverrides
  })

  return mount(AddSignerModal, {
    props: {
      safeAddress: MOCK_SAFE_ADDRESS,
      currentOwners: MOCK_CURRENT_OWNERS,
      currentThreshold: 1,
      ...props
    },
    global: {
      components: {
        ModalComponent,
        ButtonUI,
        MultiSelectMemberInput,
        IconifyIcon: Icon
      },
      stubs: {
        ModalComponent: {
          template: '<div data-test="add-signer-modal"><slot /></div>',
          props: ['modelValue'],
          emits: ['reset', 'update:modelValue']
        },
        MultiSelectMemberInput: {
          template: '<div data-test="new-signers-input"></div>',
          props: ['modelValue', 'disableTeamMembers', 'currentSafeOwners'],
          emits: ['update:modelValue']
        },
        ButtonUI: {
          template:
            '<button :data-test="$attrs[\'data-test\']" :disabled="disabled || loading" @click="$emit(\'click\')"><slot /></button>',
          props: ['disabled', 'loading', 'variant'],
          emits: ['click']
        },
        IconifyIcon: {
          template: '<span></span>',
          props: ['icon']
        }
      }
    }
  })
}

describe('AddSignerModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    if (wrapper) wrapper.unmount()
  })

  describe('Validation', () => {
    it('should filter out signers with invalid addresses', async () => {
      wrapper = createWrapper()
      wrapper.vm.newSigners = [
        { id: '1', address: 'invalid', name: 'Invalid' } as User,
        MOCK_USERS[0]!
      ]
      await nextTick()

      expect(wrapper.vm.validNewSigners).toHaveLength(1)
      expect(wrapper.vm.validNewSigners[0]?.address).toBe(MOCK_USERS[0]!.address)
    })

    it('should filter out existing owners from valid signers', async () => {
      wrapper = createWrapper()
      wrapper.vm.newSigners = [
        { id: '1', address: MOCK_CURRENT_OWNERS[0], name: 'Existing' } as User,
        MOCK_USERS[0]!
      ]
      await nextTick()

      expect(wrapper.vm.validNewSigners).toHaveLength(1)
      expect(wrapper.vm.validNewSigners[0]?.address).toBe(MOCK_USERS[0]!.address)
    })
  })

  describe('Actions', () => {
    it('should show error when submitting without valid signers', async () => {
      wrapper = createWrapper()
      await wrapper.vm.handleAddSigners()
      await flushPromises()

      expect(mockToastStore.addErrorToast).toHaveBeenCalledWith(
        'Please add at least one valid signer'
      )
    })

    it('should show success toast and emit event after successful execution', async () => {
      const mockUpdateOwners = vi.fn().mockResolvedValue('0xtxhash')
      wrapper = createWrapper({ currentThreshold: 1 }, { updateOwners: mockUpdateOwners })

      wrapper.vm.newSigners = [MOCK_USERS[0]!]
      await nextTick()

      await wrapper.vm.handleAddSigners()
      await flushPromises()

      expect(mockToastStore.addSuccessToast).toHaveBeenCalledWith('Signers added successfully')
      expect(wrapper.emitted('signer-added')).toBeTruthy()
      expect(wrapper.emitted('close-modal')).toBeTruthy()
    })

    it('should show success toast for proposal when threshold >= 2', async () => {
      const mockUpdateOwners = vi.fn().mockResolvedValue('0xtxhash')
      wrapper = createWrapper({ currentThreshold: 2 }, { updateOwners: mockUpdateOwners })

      wrapper.vm.newSigners = [MOCK_USERS[0]!]
      await nextTick()

      await wrapper.vm.handleAddSigners()
      await flushPromises()

      expect(mockToastStore.addSuccessToast).toHaveBeenCalledWith(
        'Signer addition proposal submitted successfully'
      )
    })

    it('should handle updateOwners error with generic message', async () => {
      const mockUpdateOwners = vi.fn().mockRejectedValue(new Error())
      wrapper = createWrapper({}, { updateOwners: mockUpdateOwners })

      wrapper.vm.newSigners = [MOCK_USERS[0]!]
      await nextTick()

      await wrapper.vm.handleAddSigners()
      await flushPromises()

      expect(mockToastStore.addErrorToast).toHaveBeenCalledWith('Failed to add signers')
    })

    it('should handle updateOwners error with specific message', async () => {
      const mockUpdateOwners = vi.fn().mockRejectedValue(new Error('Network error'))
      wrapper = createWrapper({}, { updateOwners: mockUpdateOwners })

      wrapper.vm.newSigners = [MOCK_USERS[0]!]
      await nextTick()

      await wrapper.vm.handleAddSigners()
      await flushPromises()

      expect(mockToastStore.addErrorToast).toHaveBeenCalledWith(
        'Failed to add signers: Network error'
      )
    })

    it('should not close modal or emit when updateOwners returns null', async () => {
      const mockUpdateOwners = vi.fn().mockResolvedValue(null)
      wrapper = createWrapper({}, { updateOwners: mockUpdateOwners })

      wrapper.vm.newSigners = [MOCK_USERS[0]!]
      await nextTick()

      await wrapper.vm.handleAddSigners()
      await flushPromises()

      expect(wrapper.emitted('signer-added')).toBeFalsy()
      expect(wrapper.emitted('close-modal')).toBeFalsy()
    })
  })

  describe('Watchers', () => {
    it('should reset newSigners when modal closes via watch', async () => {
      const modelValue = ref(true)
      wrapper = createWrapper()
      await wrapper.setProps({ modelValue: true })

      wrapper.vm.newSigners = [MOCK_USERS[0]!]
      await nextTick()

      await wrapper.setProps({ modelValue: false })
      await nextTick()

      expect(wrapper.vm.newSigners).toHaveLength(0)
    })
  })
})
