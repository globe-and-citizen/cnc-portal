import ModalComponent from '@/components/ModalComponent.vue'
import MemberAction from '@/components/sections/DashboardView/MemberAction.vue'
import type { Member } from '@/types/member'
import type { Team } from '@/types/team'
import { createTestingPinia } from '@pinia/testing'
import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

const mockError = ref<string | null>(null)
const mockIsFetching = ref(false)
const mockData = ref<Team | null>(null)
const mockStatus = ref(200)

const mockDeleteError = ref<string | null>(null)
const mockDeleteIsFetching = ref(false)
const mockDeleteData = ref<Member | null>(null)
const mockDeleteStatus = ref(200)

vi.mock('@/composables/useCustomFetch', () => ({
  useCustomFetch: () => ({
    json: () => ({
      execute: vi.fn(),
      error: mockError,
      isFetching: mockIsFetching,
      data: mockData,
      status: mockStatus
    }),
    delete: () => ({
      json: () => ({
        execute: vi.fn(),
        error: mockDeleteError,
        isFetching: mockDeleteIsFetching,
        data: mockDeleteData,
        status: mockDeleteStatus
      })
    }),
    put: () => ({
      json: () => ({
        data: {
          bankAddress: '0x123',
          id: '1',
          name: 'Test Team'
        },
        error: null,
        execute: vi.fn()
      })
    })
  })
}))

// Add mock for teamStore
// const mockTeamStore = {
//   currentTeam: {
//     id: '1',
//     name: 'Sample Team',
//     description: 'Sample Description',
//     bankAddress: 'Sample Bank Address',
//     ownerAddress: 'owner123',
//     votingAddress: null,
//     boardOfDirectorsAddress: null,
//     members: [
//       { id: '1', name: 'Alice', address: '1234', teamId: 1 },
//       { id: '2', name: 'Bob', address: '5678', teamId: 1 }
//     ],
//     teamContracts: []
//   }
// }

vi.mock('@/stores/team', () => ({
  useTeamStore: vi.fn()
}))

describe('MemberAction', () => {
  const wrapper = mount(MemberAction, {
    props: {
      teamId: '1',
      member: { id: '1', name: 'Alice', address: '1234', teamId: 1 }
    },
    global: {
      plugins: [createTestingPinia({ createSpy: vi.fn })]
    }
  })
  it('should render the component', async () => {
    expect(wrapper.exists()).toBe(true)
    // click the delete button
    expect(wrapper.findComponent(ModalComponent).props().modelValue).toBe(false)
    // await wrapper.find('[data-test="delete-member-button"]').trigger('click')
    // // expect the first modal component model is set to visible
    // expect(wrapper.findComponent(ModalComponent).props().modelValue).toBe(true)

    // // click the confirm button
    // await wrapper.find('[data-test="delete-member-confirm-button"]').trigger('click')

    // mockDeleteError.value = null
    // mockDeleteStatus.value = 204
    // mockDeleteData.value = {
    //   id: '1',
    //   name: 'Alice',
    //   address: '1234',
    //   teamId: 1
    // }
    // await wrapper.vm.$nextTick()
    // // check if the modal is closed
    // expect(wrapper.findComponent(ModalComponent).props().modelValue).toBe(false)
    // Update the mock data to simulate the delete

    // mockError.value = 'Error'
    // mockStatus.value = 403
    // await wrapper.vm.$nextTick()

    // // expect the error message to be displayed

    // expect(wrapper.find('[data-test="error-state"]').exists()).toBeTruthy()
    // expect(wrapper.find('[data-test="error-state"]').text()).toContain('permission')

    // mockStatus.value = 500
    // await wrapper.vm.$nextTick()

    // expect(wrapper.find('[data-test="error-state"]').text()).toContain('Error')
  })
})
