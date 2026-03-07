import AddSignerModal from '@/components/sections/SafeView/forms/AddSignerModal.vue'
import ModalComponent from '@/components/ModalComponent.vue'
import ButtonUI from '@/components/ButtonUI.vue'
import MultiSelectMemberInput from '@/components/utils/MultiSelectMemberInput.vue'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises, VueWrapper } from '@vue/test-utils'
import { nextTick, ref, type ComponentPublicInstance } from 'vue'
import type { User } from '@/types'
import { Icon } from '@iconify/vue'

interface AddSignerModalInstance extends ComponentPublicInstance {
  isOpen: boolean
  newSigners: User[]
  validNewSigners: User[]
  handleAddSigners(): Promise<void>
}

// Mock data
const MOCK_USERS: User[] = [
  { id: '1', address: '0x1234567890123456789012345678901234567890', name: 'Alice' },
  { id: '2', address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd', name: 'Bob' },
  { id: '3', address: '0x9876543210987654321098765432109876543210', name: 'Charlie' }
]

const MOCK_CURRENT_OWNERS = ['0x1111111111111111111111111111111111111111']
const MOCK_SAFE_ADDRESS = '0xSafeAddress123456789012345678901234567890' as `0x${string}`

let wrapper: VueWrapper<AddSignerModalInstance>

const getMockToastStore = () =>
  (
    globalThis as {
      __mockToastStore?: {
        addSuccessToast: ReturnType<typeof vi.fn>
        addErrorToast: ReturnType<typeof vi.fn>
      }
    }
  ).__mockToastStore

const getToastStoreOrThrow = () => {
  const store = getMockToastStore()
  if (!store) {
    throw new Error('Mock toast store not available')
  }
  return store
}

const getMockUseSafeOwnerManagement = () =>
  (
    globalThis as {
      __mockUseSafeOwnerManagement?: {
        isUpdating: { value: boolean }
        updateOwners: ReturnType<typeof vi.fn>
      }
    }
  ).__mockUseSafeOwnerManagement

const getSafeOwnerManagementOrThrow = () => {
  const mock = getMockUseSafeOwnerManagement()
  if (!mock) {
    throw new Error('Mock useSafeOwnerManagement not available')
  }
  return mock
}

const createWrapper = (
  props = {},
  mockComposableOverrides = {}
): VueWrapper<AddSignerModalInstance> => {
  const mockUpdateOwners = vi.fn()
  const mockIsUpdating = ref(false)
  const safeOwnerManagement = getSafeOwnerManagementOrThrow()
  safeOwnerManagement.isUpdating =
    (mockComposableOverrides as { isUpdating?: { value: boolean } }).isUpdating ?? mockIsUpdating
  safeOwnerManagement.updateOwners =
    (mockComposableOverrides as { updateOwners?: ReturnType<typeof vi.fn> }).updateOwners ??
    mockUpdateOwners

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
          emits: ['reset', 'update:modelValue'],
          watch: {
            modelValue(newVal) {
              this.$emit('update:modelValue', newVal)
            }
          }
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

  describe('Modal v-model (isOpen)', () => {
    it('should emit update:modelValue when isOpen changes', async () => {
      wrapper = createWrapper({ modelValue: true })
      await nextTick()

      wrapper.vm.isOpen = false
      await nextTick()

      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
      expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false])
    })

    it('should update isOpen when modelValue prop changes', async () => {
      wrapper = createWrapper({ modelValue: false })
      await nextTick()
      expect(wrapper.vm.isOpen).toBe(false)

      await wrapper.setProps({ modelValue: true })
      await nextTick()
      expect(wrapper.vm.isOpen).toBe(true)
    })
  })

  describe('MultiSelectMemberInput v-model (newSigners)', () => {
    it('should update newSigners when MultiSelectMemberInput emits update', async () => {
      wrapper = createWrapper()
      const input = wrapper.findComponent(MultiSelectMemberInput)

      await input.vm.$emit('update:modelValue', [MOCK_USERS[0]!])
      await nextTick()

      expect(wrapper.vm.newSigners).toHaveLength(1)
      expect(wrapper.vm.newSigners[0]).toEqual(MOCK_USERS[0])
    })
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

      expect(getToastStoreOrThrow().addErrorToast).toHaveBeenCalledWith(
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

      expect(getToastStoreOrThrow().addSuccessToast).toHaveBeenCalledWith(
        'Signers added successfully'
      )
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

      expect(getToastStoreOrThrow().addSuccessToast).toHaveBeenCalledWith(
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

      expect(getToastStoreOrThrow().addErrorToast).toHaveBeenCalledWith('Failed to add signers')
    })

    it('should handle updateOwners error with specific message', async () => {
      const mockUpdateOwners = vi.fn().mockRejectedValue(new Error('Network error'))
      wrapper = createWrapper({}, { updateOwners: mockUpdateOwners })
      wrapper.vm.newSigners = [MOCK_USERS[0]!]
      await nextTick()

      await wrapper.vm.handleAddSigners()
      await flushPromises()

      expect(getToastStoreOrThrow().addErrorToast).toHaveBeenCalledWith(
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
})
