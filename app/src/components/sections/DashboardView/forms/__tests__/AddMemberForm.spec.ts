import { ref } from 'vue'
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AddMemberForm from '@/components/sections/DashboardView/forms/AddMemberForm.vue'
import { createTestingPinia } from '@pinia/testing'
import { useAddMembersMutation } from '@/queries/member.queries'
import { log } from '@/utils/generalUtil'

const mockMutate = vi.fn()

const MultiSelectStub = {
  name: 'MultiSelectMemberInput',
  template: '<div data-test="multi-select-stub" />',
  props: ['modelValue'],
  emits: ['update:modelValue']
}

// Helper to mount the component
const mountComponent = (options: { stubMultiSelect?: boolean } = {}) =>
  mount(AddMemberForm, {
    props: {
      teamId: 'team-123'
    },
    global: {
      plugins: [createTestingPinia({ createSpy: vi.fn })],
      stubs: options.stubMultiSelect ? { MultiSelectMemberInput: MultiSelectStub } : {}
    }
  })

const setMembers = async (
  wrapper: ReturnType<typeof mountComponent>,
  members: Array<{ address: string; name: string }>
) => {
  const input = wrapper.findComponent({ name: 'MultiSelectMemberInput' })
  await input.vm.$emit('update:modelValue', members)
  await wrapper.vm.$nextTick()
}

const clickAdd = async (wrapper: ReturnType<typeof mountComponent>) => {
  const addBtn = wrapper
    .findAllComponents({ name: 'UButton' })
    .find((b) => b.text().includes('Add Members'))
  await addBtn?.trigger('click')
  await wrapper.vm.$nextTick()
}

describe('AddMemberForm.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(useAddMembersMutation).mockReturnValue({
      mutate: mockMutate,
      isPending: ref(false),
      error: ref(null),
      status: ref('idle')
    } as unknown as ReturnType<typeof useAddMembersMutation>)
  })

  it('should render component with title and form inputs', () => {
    const wrapper = mountComponent({ stubMultiSelect: true })

    // Verify the form renders with the member input + Add Members button
    expect(wrapper.findComponent({ name: 'MultiSelectMemberInput' }).exists()).toBe(true)
    const addBtn = wrapper
      .findAllComponents({ name: 'UButton' })
      .find((b) => b.text().includes('Add Members'))
    expect(addBtn?.exists()).toBe(true)
  })

  it('should show no error when component is initialized', () => {
    const wrapper = mountComponent({ stubMultiSelect: true })
    expect(wrapper.findAll('.alert').length).toBe(0)
  })

  it('should show warning alert when mutation error status is 401', () => {
    vi.mocked(useAddMembersMutation).mockReturnValueOnce({
      mutate: mockMutate,
      isPending: ref(false),
      error: ref({ response: { status: 401 } }),
      status: ref('error')
    } as unknown as ReturnType<typeof useAddMembersMutation>)

    const wrapper = mountComponent({ stubMultiSelect: true })
    expect(wrapper.text()).toContain("You don't have permission to add members.")
  })

  it('should show generic error alert for non-401 errors', () => {
    vi.mocked(useAddMembersMutation).mockReturnValueOnce({
      mutate: mockMutate,
      isPending: ref(false),
      error: ref({ status: 500 }),
      status: ref('error')
    } as unknown as ReturnType<typeof useAddMembersMutation>)

    const wrapper = mountComponent({ stubMultiSelect: true })
    expect(wrapper.text()).toContain('Something went wrong. Unable to add members.')
  })

  it('should handle member addition successfully', async () => {
    mockMutate.mockImplementationOnce((_payload, options) => options?.onSuccess?.())
    const wrapper = mountComponent({ stubMultiSelect: true })

    // Drive form via MultiSelectMemberInput v-model update
    await setMembers(wrapper, [
      { address: '0xabc', name: 'Alice' },
      { address: '0xdef', name: 'Bob' }
    ])

    // Trigger Add Members button (real user click)
    await clickAdd(wrapper)

    expect(mockMutate).toHaveBeenCalledWith(
      {
        pathParams: { teamId: 'team-123' },
        body: [
          { address: '0xabc', name: 'Alice' },
          { address: '0xdef', name: 'Bob' }
        ]
      },
      expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) })
    )
    // After success, formData is cleared → MultiSelectMemberInput receives []
    expect(wrapper.findComponent({ name: 'MultiSelectMemberInput' }).props('modelValue')).toEqual(
      []
    )
    expect(wrapper.emitted('memberAdded')).toHaveLength(1)
  })

  it('MultiSelectMemberInput v-model updates formData', async () => {
    const StubWithButton = {
      template: `
        <div>
          <button data-test="stub-add" @click="$emit('update:modelValue', [{ address: '0xAAA', name: 'Alice' }])">add</button>
        </div>
      `,
      props: ['modelValue'],
      emits: ['update:modelValue']
    }

    const wrapper = mount(AddMemberForm, {
      props: { teamId: 'team-123' },
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })],
        stubs: {
          MultiSelectMemberInput: StubWithButton
        }
      }
    })

    // trigger the stub to emit update:modelValue
    await wrapper.find('[data-test="stub-add"]').trigger('click')
    await wrapper.vm.$nextTick()

    // Assert: the bound modelValue is propagated to the child
    expect(wrapper.findComponent(StubWithButton).props('modelValue')).toEqual([
      { address: '0xAAA', name: 'Alice' }
    ])
  })

  it('should log errors when member addition mutation fails', async () => {
    const logSpy = vi.spyOn(log, 'error').mockImplementation(() => undefined)
    mockMutate.mockImplementationOnce((_payload, options) =>
      options?.onError?.(new Error('network'))
    )

    const wrapper = mountComponent({ stubMultiSelect: true })
    await setMembers(wrapper, [{ address: '0xaaa', name: 'Alice' }])

    await clickAdd(wrapper)

    expect(logSpy).toHaveBeenCalled()
    logSpy.mockRestore()
  })
})
