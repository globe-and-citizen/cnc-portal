import ModalComponent from '@/components/ModalComponent.vue'
import MemberAction from '@/components/sections/DashboardView/MemberAction.vue'
import type { Member } from '@/types/member'
import type { Team } from '@/types/team'
import { createTestingPinia } from '@pinia/testing'
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

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

const executeDeleteMock = vi.fn(() => {
  mockDeleteIsFetching.value = true
  return new Promise((resolve) => {
    resolveExecute = resolve
  }).finally(() => {
    mockDeleteIsFetching.value = false
  })
})

const executePutMock = vi.fn(() => {
  mockPutIsFetching.value = true
  return new Promise((resolve) => {
    resolveExecute = resolve
  }).finally(() => {
    mockPutIsFetching.value = false
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
      execute: executeDeleteMock
    })
  })
  mocks.mockUseCustomFetch.mockReturnValueOnce({
    put: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnValue({
      data: mockPutData,
      isFetching: mockPutIsFetching,
      error: mockPutError,
      statusCode: mockPutStatus,
      execute: executePutMock
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
    expect(wrapper.findComponent(ModalComponent).exists()).toBeFalsy()

    // 1- click the delete button and check if the modal is opened
    await wrapper.find('[data-test="delete-member-button"]').trigger('click')
    wrapper.vm.$nextTick()

    // check if the modal is opened
    expect(wrapper.findComponent(ModalComponent).exists()).toBeTruthy()

    // 2- Cancel the delete action
    await wrapper.find('[data-test="delete-member-cancel-button"]').trigger('click')

    // check if the modal is closed
    expect(wrapper.findComponent(ModalComponent).exists()).toBeFalsy()

    // 4- Open the modal again
    await wrapper.find('[data-test="delete-member-button"]').trigger('click')

    // check if the modal is opened
    expect(wrapper.findComponent(ModalComponent).exists()).toBeTruthy()

    // 5- click the confirm button
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

    // 6- Resolve the promise with the error state
    resolveExecute({})
    await flushPromises()

    // check if the modal is still open
    expect(wrapper.findComponent(ModalComponent).exists()).toBeTruthy()

    // 7- Close the modal by simulating the close event
    // trigger the ModalComponent to emit the close event
    await wrapper.findComponent(ModalComponent).vm.$emit('update:modelValue', false)
    await wrapper.vm.$nextTick()

    // check if the modal is closed
    expect(wrapper.findComponent(ModalComponent).exists()).toBeFalsy()

    // 8- open the modal again
    await wrapper.find('[data-test="delete-member-button"]').trigger('click')
    wrapper.vm.$nextTick()

    // check if the modal is opened
    expect(wrapper.findComponent(ModalComponent).exists()).toBeTruthy()

    // 9- trigger click again and resolve with 204
    await wrapper.find('[data-test="delete-member-confirm-button"]').trigger('click')
    // Update the mock data to simulate the delete

    mockDeleteError.value = null
    mockDeleteStatus.value = 204

    resolveExecute({})
    await flushPromises()

    // check if the modal is closed
    expect(wrapper.findComponent(ModalComponent).exists()).toBeFalsy()
  })

  it('should render the component and test set wage feature', async () => {
    expect(wrapper.exists()).toBe(true)
    expect(wrapper.findComponent(ModalComponent).exists()).toBeFalsy()

    // 1- Click the set wage button and check if the modal is opened
    await wrapper.find('[data-test="set-wage-button"]').trigger('click')
    wrapper.vm.$nextTick()

    // check if the modal is opened
    expect(wrapper.findComponent(ModalComponent).exists()).toBeTruthy()

    // 2- Set empty input then trigger save, to check if the error message is displayed
    await wrapper.find('[data-test="hourly-rate-input"]').setValue('')
    await wrapper.find('[data-test="max-hours-input"]').setValue('')
    await wrapper.find('[data-test="add-wage-button"]').trigger('click')

    // expect(wrapper.find('[data-test="hourly-rate-error"]').exists()).toBeTruthy()
    // expect(wrapper.find('[data-test="max-weekly-hours-error"]').exists()).toBeTruthy()
    expect(wrapper.find('[data-test="rate-per-hour-error"]').exists()).toBeTruthy()

    // 3- Cancel and chek if the modal is closed
    await wrapper.find('[data-test="add-wage-cancel-button"]').trigger('click')
    expect(wrapper.findComponent(ModalComponent).exists()).toBeFalsy()

    // 4- Open the modal again and check if the modal is opened
    await wrapper.find('[data-test="set-wage-button"]').trigger('click')
    wrapper.vm.$nextTick()
    expect(wrapper.findComponent(ModalComponent).exists()).toBeTruthy()
    expect(wrapper.find('[data-test="hourly-rate-error"]').exists()).toBeFalsy()
    expect(wrapper.find('[data-test="max-weekly-hours-error"]').exists()).toBeFalsy()

    // 5- set valid input and trigger save
    await wrapper.find('[data-test="hourly-rate-input"]').setValue('20')
    await wrapper.find('[data-test="max-hours-input"]').setValue('40')
    await wrapper.find('[data-test="add-wage-button"]').trigger('click')

    // Update the mock data to simulate the put
    mockPutError.value = 'Error'
    mockPutStatus.value = 403
    await wrapper.vm.$nextTick()

    // expect the error message to be displayed
    expect(wrapper.find('[data-test="error-state"]').exists()).toBeTruthy()

    mockPutStatus.value = 500
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-test="error-state"]').text()).toContain(
      'Error! Something went wrong'
    )

    // 6- Resolve the promise with the error state
    resolveExecute({})
    await flushPromises()

    // check if the modal is still open
    expect(wrapper.findComponent(ModalComponent).exists()).toBeTruthy()

    // 7- Close the modale by simulating the close event
    // trigger the ModalComponent to emit the close event
    await wrapper.findComponent(ModalComponent).vm.$emit('update:modelValue', false)
    await wrapper.vm.$nextTick()

    // check if the modal is closed
    expect(wrapper.findComponent(ModalComponent).exists()).toBeFalsy()

    // 8- open the modal again
    await wrapper.find('[data-test="set-wage-button"]').trigger('click')
    wrapper.vm.$nextTick()
    expect(wrapper.findComponent(ModalComponent).exists()).toBeTruthy()

    // 9- trigger click again and resolve with 201
    await wrapper.find('[data-test="add-wage-button"]').trigger('click')

    mockPutError.value = null
    mockPutStatus.value = 201

    resolveExecute({})
    await flushPromises()

    // check if the modal is
    expect(wrapper.findComponent(ModalComponent).exists()).toBeFalsy()
  })
})
