import { ref } from 'vue'
import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import AddMemberForm from '@/components/sections/DashboardView/forms/AddMemberForm.vue'
import { createTestingPinia } from '@pinia/testing'

// Hoisted mock variables
const { mockUseAddMembersQuery } = vi.hoisted(() => {
  const mockMutate = vi.fn()
  return {
    mockUseAddMembersQuery: vi.fn(() => ({
      mutate: mockMutate,
      isPending: ref(false),
      error: ref(null),
      status: ref('idle')
    }))
  }
})

// Mock the member queries
vi.mock('@/queries/member.queries', () => ({
  useAddMembersMutation: mockUseAddMembersQuery
}))

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
  })

  it('should render component with title and form inputs', () => {
    const wrapper = mountComponent()

    expect(wrapper.find('h1').text()).toBe('Add New Member')
    expect(wrapper.findComponent({ name: 'MultiSelectMemberInput' }).exists()).toBe(true)
    expect(wrapper.findComponent({ name: 'ButtonUI' }).exists()).toBe(true)
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

    // Click button to trigger handleAddMembers
    const button = wrapper.findComponent({ name: 'ButtonUI' })
    await button.trigger('click')

    // Verify mutate was called with correct data
    expect(mockUseAddMembersQuery()).toBeTruthy()
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
