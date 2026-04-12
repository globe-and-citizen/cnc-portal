import { ref } from 'vue'
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AddMemberForm from '@/components/sections/DashboardView/forms/AddMemberForm.vue'
import { createTestingPinia } from '@pinia/testing'
import { useAddMembersMutation } from '@/queries/member.queries'
import { log } from '@/utils/generalUtil'

const mockMutate = vi.fn()

interface AddMemberFormVm {
  formData: Array<{ address: string; name: string }>
  handleAddMembers?: () => void
}

// Helper to mount the component
const mountComponent = () => {
  return mount(AddMemberForm, {
    props: {
      teamId: 'team-123'
    },
    global: {
      plugins: [createTestingPinia({ createSpy: vi.fn })]
    }
  })
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
    const wrapper = mountComponent()

    // Verify the form renders with the member input component
    expect(wrapper.findComponent({ name: 'MultiSelectMemberInput' }).exists()).toBe(true)
    // Verify the component has form functionality (has a method to handle adding members)
    expect(typeof (wrapper.vm as unknown as AddMemberFormVm).handleAddMembers).toBe('function')
  })

  it('should show no error when component is initialized', () => {
    const wrapper = mountComponent()
    expect(wrapper.findAll('.alert').length).toBe(0)
  })

  it('should show warning alert when mutation error status is 401', () => {
    vi.mocked(useAddMembersMutation).mockReturnValueOnce({
      mutate: mockMutate,
      isPending: ref(false),
      error: ref({ status: 401 }),
      status: ref('error')
    } as unknown as ReturnType<typeof useAddMembersMutation>)

    const wrapper = mountComponent()
    expect(wrapper.text()).toContain("You don't have permission to add members.")
  })

  it('should show generic error alert for non-401 errors', () => {
    vi.mocked(useAddMembersMutation).mockReturnValueOnce({
      mutate: mockMutate,
      isPending: ref(false),
      error: ref({ status: 500 }),
      status: ref('error')
    } as unknown as ReturnType<typeof useAddMembersMutation>)

    const wrapper = mountComponent()
    expect(wrapper.text()).toContain('Something went wrong. Unable to add members.')
  })

  it('should handle member addition successfully', async () => {
    mockMutate.mockImplementationOnce((_payload, options) => options?.onSuccess?.())
    const wrapper = mountComponent()
    const vm = wrapper.vm as unknown as AddMemberFormVm

    // Set formData with members
    vm.formData = [
      { address: '0xabc', name: 'Alice' },
      { address: '0xdef', name: 'Bob' }
    ]

    await wrapper.vm.$nextTick()

    // Trigger handleAddMembers (simulates user clicking button)
    if (vm.handleAddMembers) {
      await vm.handleAddMembers()
    }

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
    expect(vm.formData).toEqual([])
    expect(wrapper.emitted('memberAdded')).toHaveLength(1)
  })

  it('MultiSelectMemberInput v-model updates formData', async () => {
    const MultiSelectStub = {
      template: `
        <div>
          <button data-test="stub-add" @click="$emit('update:modelValue', [{ address: '0xAAA', name: 'Alice' }])">add</button>
        </div>
      `,
      props: ['modelValue']
    }

    const wrapper = mount(AddMemberForm, {
      props: { teamId: 'team-123' },
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })],
        stubs: {
          MultiSelectMemberInput: MultiSelectStub
        }
      }
    })

    // trigger the stub to emit update:modelValue
    await wrapper.find('[data-test="stub-add"]').trigger('click')
    await wrapper.vm.$nextTick()

    const vm = wrapper.vm as unknown as AddMemberFormVm
    expect(vm.formData).toEqual([{ address: '0xAAA', name: 'Alice' }])
  })

  it('should log errors when member addition mutation fails', async () => {
    const logSpy = vi.spyOn(log, 'error').mockImplementation(() => undefined)
    mockMutate.mockImplementationOnce((_payload, options) =>
      options?.onError?.(new Error('network'))
    )

    const wrapper = mountComponent()
    const vm = wrapper.vm as unknown as AddMemberFormVm
    vm.formData = [{ address: '0xaaa', name: 'Alice' }]

    if (vm.handleAddMembers) {
      await vm.handleAddMembers()
    }

    expect(logSpy).toHaveBeenCalled()
    logSpy.mockRestore()
  })
})
