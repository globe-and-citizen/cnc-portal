import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import RemoveOwnerButton from '../RemoveOwnerButton.vue'

const {
  mockChainId,
  mockIsPending,
  mockUserStore,
  mockUpdateOwnersMutate,
  mockUseUpdateSafeOwnersMutation
} = vi.hoisted(() => ({
  mockChainId: { value: 137 },
  mockIsPending: { value: false },
  mockUserStore: { address: '0x1111111111111111111111111111111111111111' },
  mockUpdateOwnersMutate: vi.fn(),
  mockUseUpdateSafeOwnersMutation: vi.fn()
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
    isPending: mockIsPending
  })
}))

vi.mock('@/stores', () => ({
  useUserDataStore: () => mockUserStore
}))

vi.mock('@iconify/vue', () => ({
  Icon: defineComponent({
    name: 'IconStub',
    template: '<span data-test="icon-stub" />'
  })
}))

const UButtonStub = defineComponent({
  name: 'UButtonStub',
  props: ['disabled', 'loading'],
  emits: ['click'],
  template:
    '<button data-test="remove-owner-button" :disabled="disabled" :data-loading="loading?.value ?? loading" @click="$emit(\'click\')"><slot /></button>'
})

const mountComponent = (props = {}) =>
  mount(RemoveOwnerButton, {
    props: {
      ownerAddress: '0x2222222222222222222222222222222222222222',
      safeAddress: '0x1234567890123456789012345678901234567890',
      totalOwners: 3,
      threshold: 1,
      isConnectedUserOwner: true,
      ...props
    },
    global: {
      stubs: {
        UButton: UButtonStub
      }
    }
  })

describe('RemoveOwnerButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockChainId.value = 137
    mockIsPending.value = false
    mockUserStore.address = '0x1111111111111111111111111111111111111111'
    mockUpdateOwnersMutate.mockImplementation(() => undefined)
    mockUseUpdateSafeOwnersMutation.mockReturnValue({
      mutate: mockUpdateOwnersMutate,
      isPending: mockIsPending
    })
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  it('calls owner update mutation with expected payload', async () => {
    const wrapper = mountComponent()
    await wrapper.find('[data-test="remove-owner-button"]').trigger('click')
    await nextTick()

    expect(mockUpdateOwnersMutate).toHaveBeenCalledWith(
      {
        pathParams: { safeAddress: '0x1234567890123456789012345678901234567890' },
        queryParams: { chainId: 137 },
        body: {
          ownersToRemove: ['0x2222222222222222222222222222222222222222'],
          shouldPropose: false
        }
      },
      expect.objectContaining({
        onSuccess: expect.any(Function),
        onError: expect.any(Function)
      })
    )
  })

  it('shows proposal success toast for multisig threshold', async () => {
    const wrapper = mountComponent({ threshold: 2 })
    await wrapper.find('[data-test="remove-owner-button"]').trigger('click')
    await nextTick()
    expect(wrapper.find('[data-test="remove-owner-button"]').attributes('data-loading')).toBe(
      'false'
    )

    const callbacks = mockUpdateOwnersMutate.mock.calls[0]?.[1]
    callbacks?.onSuccess?.()
    await nextTick()

    expect(wrapper.find('[data-test="remove-owner-button"]').attributes('data-loading')).toBe(
      'false'
    )
  })

  it('shows loading state from mutation pending ref', async () => {
    mockIsPending.value = true
    const wrapper = mountComponent()

    expect(wrapper.find('[data-test="remove-owner-button"]').attributes('data-loading')).toBe(
      'true'
    )
  })

  it('maps rejected transaction error message', async () => {
    const wrapper = mountComponent()
    await wrapper.find('[data-test="remove-owner-button"]').trigger('click')
    await nextTick()

    const callbacks = mockUpdateOwnersMutate.mock.calls[0]?.[1]
    callbacks?.onError?.(new Error('User rejected signature request'))
    await nextTick()

    expect(wrapper.find('[data-test="remove-owner-button"]').attributes('data-loading')).toBe(
      'false'
    )
  })

  it('shows generic remove-owner error message', async () => {
    const wrapper = mountComponent()
    await wrapper.find('[data-test="remove-owner-button"]').trigger('click')
    await nextTick()

    const callbacks = mockUpdateOwnersMutate.mock.calls[0]?.[1]
    callbacks?.onError?.(new Error('RPC failed'))
    await nextTick()

    expect(console.error).toHaveBeenCalled()
    expect(wrapper.find('[data-test="remove-owner-button"]').attributes('data-loading')).toBe(
      'false'
    )
  })
})
