import AddSignerModal from '@/components/sections/SafeView/forms/AddSignerModal.vue'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { nextTick, type ComponentPublicInstance } from 'vue'
import type { User } from '@/types'
import { mockToast } from '@/tests/mocks/store.mock'

interface AddSignerModalInstance extends ComponentPublicInstance {
  isOpen: boolean
  errorMessage: string
  newSigners: User[]
  validNewSigners: User[]
  formState: {
    newSigners: Array<{ address: string }>
    newThreshold: number
    shouldPropose: boolean
  }
  formSchema: {
    safeParse: (input: unknown) => {
      success: boolean
      error?: { issues: Array<{ message: string }> }
    }
  }
  handleAddSigners(): Promise<void>
}

const { mockChainId, mockUpdateOwnersMutate, mockUpdateOwnersPending } = vi.hoisted(() => ({
  mockChainId: { value: 137 },
  mockUpdateOwnersMutate: vi.fn(),
  mockUpdateOwnersPending: { value: false }
}))

vi.mock('@wagmi/vue', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@wagmi/vue')>()
  return {
    ...actual,
    useChainId: vi.fn(() => mockChainId)
  }
})

vi.mock('@/queries/safe.mutations', () => ({
  useUpdateSafeOwnersMutation: () => ({
    mutate: mockUpdateOwnersMutate,
    isPending: mockUpdateOwnersPending
  })
}))

// Mock data
const MOCK_USERS: User[] = [
  { id: '1', address: '0x1234567890123456789012345678901234567890', name: 'Alice' },
  { id: '2', address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd', name: 'Bob' }
]

const MOCK_CURRENT_OWNERS = ['0x1111111111111111111111111111111111111111']
const MOCK_SAFE_ADDRESS = '0x1111111111111111111111111111111111111111' as const

let wrapper: VueWrapper<AddSignerModalInstance>

const createWrapper = (props = {}): VueWrapper<AddSignerModalInstance> =>
  mount(AddSignerModal, {
    props: {
      modelValue: true,
      safeAddress: MOCK_SAFE_ADDRESS,
      currentOwners: MOCK_CURRENT_OWNERS,
      currentThreshold: 1,
      ...props
    },
    global: {
      stubs: {
        MultiSelectMemberInput: {
          template: '<div data-test="new-signers-input"></div>',
          props: ['modelValue', 'disableTeamMembers', 'currentSafeOwners'],
          emits: ['update:modelValue']
        }
      }
    }
  }) as unknown as VueWrapper<AddSignerModalInstance>

describe('AddSignerModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUpdateOwnersPending.value = false
    mockUpdateOwnersMutate.mockImplementation(() => undefined)
    mockToast.add.mockReset()
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

  describe('Validation', () => {
    it('should reject invalid signer addresses in form schema', async () => {
      wrapper = createWrapper()

      const result = wrapper.vm.formSchema.safeParse({
        ...wrapper.vm.formState,
        newSigners: [{ address: 'invalid-address' }]
      })

      expect(result.success).toBe(false)
      expect(result.error?.issues.some((issue) => issue.message === 'Invalid signer address')).toBe(
        true
      )
    })

    it('should reject schema payloads without any valid new signer', async () => {
      wrapper = createWrapper()

      const result = wrapper.vm.formSchema.safeParse({
        ...wrapper.vm.formState,
        newSigners: [{ address: MOCK_CURRENT_OWNERS[0]! }]
      })

      expect(result.success).toBe(false)
      expect(
        result.error?.issues.some(
          (issue) => issue.message === 'Please add at least one valid signer'
        )
      ).toBe(true)
    })

    it('should filter out signers with invalid addresses', async () => {
      wrapper = createWrapper()
      wrapper.vm.newSigners = [
        { id: 'x', address: 'invalid', name: 'Invalid' } as User,
        MOCK_USERS[0]!
      ]
      await nextTick()

      expect(wrapper.vm.validNewSigners).toHaveLength(1)
      expect(wrapper.vm.validNewSigners[0]?.address).toBe(MOCK_USERS[0]!.address)
    })

    it('should filter out existing owners from valid signers', async () => {
      wrapper = createWrapper()
      wrapper.vm.newSigners = [
        { id: 'x', address: MOCK_CURRENT_OWNERS[0], name: 'Existing' } as User,
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

      expect(wrapper.vm.errorMessage).toBe('Please add at least one valid signer')
      expect(mockUpdateOwnersMutate).not.toHaveBeenCalled()
    })

    it('should show success toast and emit event after successful execution', async () => {
      mockUpdateOwnersMutate.mockImplementation((_params, callbacks) => callbacks?.onSuccess?.())
      wrapper = createWrapper({ currentThreshold: 1 })
      wrapper.vm.newSigners = [MOCK_USERS[0]!]
      await nextTick()

      await wrapper.vm.handleAddSigners()
      await flushPromises()

      expect(mockUpdateOwnersMutate).toHaveBeenCalledTimes(1)
      expect(mockUpdateOwnersMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({
            ownersToAdd: [MOCK_USERS[0]!.address],
            newThreshold: 1,
            shouldPropose: false
          })
        }),
        expect.any(Object)
      )
      expect(wrapper.emitted('signer-added')).toBeTruthy()
      expect(wrapper.emitted('close-modal')).toBeTruthy()
      expect(mockToast.add).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Success',
          description: 'Signers added successfully',
          color: 'success'
        })
      )
    })

    it('should show success toast for proposal when threshold >= 2', async () => {
      mockUpdateOwnersMutate.mockImplementation((_params, callbacks) => callbacks?.onSuccess?.())
      wrapper = createWrapper({ currentThreshold: 2 })
      wrapper.vm.newSigners = [MOCK_USERS[0]!]
      await nextTick()

      await wrapper.vm.handleAddSigners()
      await flushPromises()

      expect(mockUpdateOwnersMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({
            ownersToAdd: [MOCK_USERS[0]!.address],
            newThreshold: 2,
            shouldPropose: true
          })
        }),
        expect.any(Object)
      )
      expect(mockToast.add).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Success',
          description: 'Signer addition proposal submitted successfully',
          color: 'success'
        })
      )
    })

    it('should handle updateOwners error with generic message', async () => {
      mockUpdateOwnersMutate.mockImplementation((_params, callbacks) =>
        callbacks?.onError?.(new Error())
      )
      wrapper = createWrapper()
      wrapper.vm.newSigners = [MOCK_USERS[0]!]
      await nextTick()

      await wrapper.vm.handleAddSigners()
      await flushPromises()

      expect(wrapper.vm.errorMessage).toBe('Failed to add signers')
    })

    it('should handle updateOwners error with specific message', async () => {
      mockUpdateOwnersMutate.mockImplementation((_params, callbacks) =>
        callbacks?.onError?.(new Error('Network error'))
      )
      wrapper = createWrapper()
      wrapper.vm.newSigners = [MOCK_USERS[0]!]
      await nextTick()

      await wrapper.vm.handleAddSigners()
      await flushPromises()

      expect(wrapper.vm.errorMessage).toBe('Failed to add signers: Network error')
    })

    it('should not close modal or emit when mutation callbacks are not invoked', async () => {
      mockUpdateOwnersMutate.mockImplementation(() => undefined)
      wrapper = createWrapper()
      wrapper.vm.newSigners = [MOCK_USERS[0]!]
      await nextTick()

      await wrapper.vm.handleAddSigners()
      await flushPromises()

      expect(wrapper.emitted('signer-added')).toBeFalsy()
      expect(wrapper.emitted('close-modal')).toBeFalsy()
    })
  })
})
