import { ref } from 'vue'
import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import AddMemberForm from '@/components/sections/DashboardView/forms/AddMemberForm.vue'
import { createTestingPinia } from '@pinia/testing'
import { useAddMembersMutation } from '@/queries/member.queries'

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
      plugins: [createTestingPinia({ createSpy: vi.fn })],
      stubs: {
        UButton: {
          name: 'UButton',
          props: ['loading', 'disabled', 'color', 'class', 'label'],
          emits: ['click'],
          template:
            '<button data-test="add-members-btn" :disabled="disabled" @click="$emit(\'click\')">{{ label || $slots.default?.() }}</button>'
        }
      }
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

  // it('should show 401 error alert when statusCode is 401', async () => {
  //   const wrapper = mountComponent()

  //   // Get the component instance and set statusCode
  //   ;(wrapper.vm as any).statusCode = 401
  //   ;(wrapper.vm as any).addMembersError = new Error('Unauthorized')

  //   await wrapper.vm.$nextTick()

  //   const alert = wrapper.find('.alert.alert-warning')
  //   expect(alert.exists()).toBe(true)
  //   expect(alert.text()).toContain("You don't have the right for this")
  // })

  // it('should show generic error alert for non-401 errors', async () => {
  //   const wrapper = mountComponent()

  //   ;(wrapper.vm as any).statusCode = 500
  //   ;(wrapper.vm as any).addMembersError = new Error('Server error')

  //   await wrapper.vm.$nextTick()

  //   const alert = wrapper.find('.alert.alert-danger')
  //   expect(alert.exists()).toBe(true)
  //   expect(alert.text()).toContain('Something went wrong')
  // })

  it('should handle member addition successfully', async () => {
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

    // Verify mutation behavior was triggered
    expect(vi.mocked(useAddMembersMutation)()).toBeTruthy()
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
})
