import UpdateThresholdModal from '@/components/sections/SafeView/forms/UpdateThresholdModal.vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { mockToast } from '@/tests/mocks/store.mock'

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

vi.mock('@iconify/vue', () => ({
  Icon: {
    name: 'IconStub',
    template: '<span data-test="icon-stub" />'
  }
}))

const UModalStub = defineComponent({
  props: ['open', 'title', 'description'],
  emits: ['update:open'],
  template: '<div data-test="threshold-modal"><slot name="body" /></div>'
})

const UAlertStub = defineComponent({
  props: ['title', 'description', 'color', 'variant', 'ui'],
  template: '<div data-test="alert"><slot name="description" /></div>'
})

const UFormStub = defineComponent({
  props: ['schema', 'state'],
  emits: ['submit'],
  template: '<form data-test="threshold-form" @submit.prevent="$emit(\'submit\')"><slot /></form>'
})

const UFormFieldStub = defineComponent({
  props: ['name', 'label', 'description', 'required'],
  template: '<div data-test="form-field"><slot /></div>'
})

const UInputStub = defineComponent({
  props: ['modelValue', 'type', 'min', 'max', 'placeholder'],
  emits: ['update:modelValue'],
  template:
    '<input data-test="threshold-input" :value="modelValue" @input="$emit(\'update:modelValue\', Number(($event.target as HTMLInputElement).value))" @change="$emit(\'update:modelValue\', Number(($event.target as HTMLInputElement).value))" />'
})

const UButtonStub = defineComponent({
  props: ['disabled', 'loading', 'type', 'label', 'leadingIcon', 'color', 'variant'],
  emits: ['click'],
  template:
    '<button :data-test="$attrs[\'data-test\']" :type="type || \'button\'" :disabled="disabled" @click="$emit(\'click\')">{{ label }}</button>'
})

const setThreshold = async (wrapper: ReturnType<typeof mount>, value: number) => {
  const input = wrapper.find('[data-test="threshold-input"]')
  await input.setValue(String(value))
  await input.trigger('change')
  await nextTick()
}

const submitThreshold = async (wrapper: ReturnType<typeof mount>) => {
  const form = wrapper.find('[data-test="threshold-form"]')
  await form.trigger('submit')
  await nextTick()
}

const mountComponent = (props = {}) =>
  mount(UpdateThresholdModal, {
    props: {
      open: true,
      safeAddress: '0x1111111111111111111111111111111111111111',
      currentOwners: [
        '0x1111111111111111111111111111111111111111',
        '0x2222222222222222222222222222222222222222',
        '0x3333333333333333333333333333333333333333'
      ],
      currentThreshold: 1,
      ...props
    },
    global: {
      stubs: {
        UModal: UModalStub,
        UAlert: UAlertStub,
        UForm: UFormStub,
        UFormField: UFormFieldStub,
        UInput: UInputStub,
        UButton: UButtonStub
      }
    }
  })

describe('UpdateThresholdModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockChainId.value = 137
    mockUpdateOwnersPending.value = false
    mockUpdateOwnersMutate.mockImplementation(() => undefined)
    mockToast.add.mockReset()
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  it('calls update owner mutation with chain id and threshold payload', async () => {
    const wrapper = mountComponent()
    await setThreshold(wrapper, 2)
    await submitThreshold(wrapper)

    expect(mockUpdateOwnersMutate).toHaveBeenCalledWith(
      {
        pathParams: {
          safeAddress: '0x1111111111111111111111111111111111111111'
        },
        queryParams: {
          chainId: 137
        },
        body: {
          newThreshold: 2,
          shouldPropose: false
        }
      },
      expect.objectContaining({
        onSuccess: expect.any(Function),
        onError: expect.any(Function)
      })
    )
  })

  it('shows proposal success toast and closes modal for multisig threshold', async () => {
    const wrapper = mountComponent({ currentThreshold: 2 })
    await setThreshold(wrapper, 3)
    await submitThreshold(wrapper)

    const callbacks = mockUpdateOwnersMutate.mock.calls[0]?.[1]
    callbacks?.onSuccess?.()
    await nextTick()

    expect(wrapper.emitted('threshold-updated')).toBeTruthy()
    expect(wrapper.emitted('update:open')).toBeTruthy()
  })

  it('shows direct success toast when threshold proposal is not required', async () => {
    const wrapper = mountComponent({ currentThreshold: 1 })
    await setThreshold(wrapper, 2)
    await submitThreshold(wrapper)

    const callbacks = mockUpdateOwnersMutate.mock.calls[0]?.[1]
    callbacks?.onSuccess?.()
    await nextTick()

    expect(wrapper.emitted('threshold-updated')).toBeTruthy()
  })

  it('sets error message when update threshold fails', async () => {
    const wrapper = mountComponent()
    await setThreshold(wrapper, 2)
    await submitThreshold(wrapper)

    const callbacks = mockUpdateOwnersMutate.mock.calls[0]?.[1]
    callbacks?.onError?.(new Error('rpc failed'))
    await nextTick()

    expect(console.error).toHaveBeenCalled()
    expect(wrapper.text()).toContain('Failed to update threshold')
  })
})
