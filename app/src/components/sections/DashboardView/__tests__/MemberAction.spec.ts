import ModalComponent from '@/components/ModalComponent.vue'
import MemberAction from '@/components/sections/DashboardView/MemberAction.vue'
import type { Member } from '@/types/member'
import type { Team } from '@/types/team'
import { createTestingPinia } from '@pinia/testing'
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { nextTick, ref } from 'vue'

// 1. Create the reactive refs you want to control
const mockPutError = ref<string | null>(null)
const mockPutIsFetching = ref(false)
const mockPutData = ref<Team | null>(null)
const mockPutStatus = ref<number | null>(null)

const mockDeleteError = ref<string | null>(null)
const mockDeleteIsFetching = ref(false)
const mockDeleteData = ref<Member | null>(null)
const mockDeleteStatus = ref<number | null>(null)

// 2. Create a manual promise control
let resolveExecute: (val: unknown) => void
let rejectExecute: (err: unknown) => void

const executeMock = vi.fn(() => {
  mockDeleteIsFetching.value = true
  return new Promise((resolve, reject) => {
    resolveExecute = resolve
    rejectExecute = reject
  }).finally(() => {
    mockDeleteIsFetching.value = false
  })
})

const mocks = vi.hoisted(() => ({
  mockUseTeamStore: vi.fn(() => ({
    fetchTeam: vi.fn()
  })),
  mockUseCustomFetch: vi.fn()
}))

vi.mock('@/composables/useCustomFetch', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    useCustomFetch: mocks.mockUseCustomFetch
  }
})
vi.mock('@/stores', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    useTeamStore: mocks.mockUseTeamStore
  }
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('MemberAction', () => {
  mocks.mockUseCustomFetch.mockReturnValueOnce({
    delete: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnValue({
      data: mockDeleteData,
      isFetching: mockDeleteIsFetching,
      error: mockDeleteError,
      statusCode: mockDeleteStatus,
      execute: executeMock
    })
  })
  mocks.mockUseCustomFetch.mockReturnValueOnce({
    put: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnValue({
      data: mockPutData,
      isFetching: mockPutIsFetching,
      error: mockPutError,
      statusCode: mockPutStatus
    })
  })
  const wrapper = mount(MemberAction, {
    props: {
      teamId: '1',
      member: { id: '1', name: 'Alice', address: '1234', teamId: 1 }
    },
    global: {
      plugins: [createTestingPinia({ createSpy: vi.fn })]
    }
  })

  it('should render the component and test delet feature', async () => {
    expect(wrapper.exists()).toBe(true)
    // click the delete button
    expect(wrapper.findComponent(ModalComponent).exists()).toBeFalsy()
    await wrapper.find('[data-test="delete-member-button"]').trigger('click')
    wrapper.vm.$nextTick()

    // check if the modal is opened
    expect(wrapper.findComponent(ModalComponent).exists()).toBeTruthy()
    // expect the first modal component model is set to visible
    expect(wrapper.findComponent(ModalComponent).props().modelValue).toBe(true)

    // Cancel the delete action
    await wrapper.find('[data-test="delete-member-cancel-button"]').trigger('click')

    // check if the modal is closed
    expect(wrapper.findComponent(ModalComponent).exists()).toBeFalsy()

    // Open the modal again
    await wrapper.find('[data-test="delete-member-button"]').trigger('click')

    // check if the modal is opened
    expect(wrapper.findComponent(ModalComponent).exists()).toBeTruthy()

    // click the confirm button
    await wrapper.find('[data-test="delete-member-confirm-button"]').trigger('click')

    // Update the mock data to simulate the delete

    mockDeleteError.value = 'Error'
    mockDeleteStatus.value = 403
    await wrapper.vm.$nextTick()

    // expect the error message to be displayed

    expect(wrapper.find('[data-test="error-state"]').exists()).toBeTruthy()
    expect(wrapper.find('[data-test="error-state"]').text()).toBe(
      "You don't have the permission to delete this member"
    )

    mockDeleteStatus.value = 500
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-test="error-state"]').text()).toContain(
      'Error! Something went wrong'
    )

    mockDeleteError.value = null
    mockDeleteStatus.value = 204

    resolveExecute({})
    // await nextTick()
    // await wrapper.vm.$nextTick()
    await flushPromises()

    // check if the modal is closed
    expect(wrapper.findComponent(ModalComponent).exists()).toBeFalsy()
  })

})
