import ModalComponent from '@/components/ModalComponent.vue'
import MemberAction from '@/components/sections/DashboardView/MemberAction.vue'
import type { Member } from '@/types/member'
import type { Team } from '@/types/team'
import { createTestingPinia } from '@pinia/testing'
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

// --- DELETE MOCK STATE ---
const mockDeleteError = ref<string | null>(null)
const mockDeleteIsFetching = ref(false)
const mockDeleteData = ref<Member | null>(null)
const mockDeleteStatus = ref<number | null>(null)

let resolveDelete: (val: unknown) => void

const executeDeleteMock = vi.fn(() => {
  mockDeleteIsFetching.value = true
  return new Promise((resolve) => {
    resolveDelete = resolve
  }).finally(() => {
    mockDeleteIsFetching.value = false
  })
})

// --- PUT MOCK STATE ---
const mockPutError = ref<string | null>(null)
const mockPutIsFetching = ref(false)
const mockPutData = ref<Team | null>(null)
const mockPutStatus = ref<number | null>(null)

let resolvePut: (val: unknown) => void

const executePutMock = vi.fn(() => {
  mockPutIsFetching.value = true
  return new Promise((resolve) => {
    resolvePut = resolve
  }).finally(() => {
    mockPutIsFetching.value = false
  })
})

const mocks = vi.hoisted(() => ({
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
  }
})

afterEach(() => {
  vi.clearAllMocks()
})

function mountComponent() {
  // First call = DELETE
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

  // Second call = PUT
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

  return mount(MemberAction, {
    props: {
      teamId: '1',
      member: { id: '1', name: 'Alice', address: '1234', teamId: 1 }
    },
    global: {
      plugins: [createTestingPinia({ createSpy: vi.fn })]
    }
  })
}

describe('MemberAction', () => {
  it('should test delete flow', async () => {
    const wrapper = mountComponent()

    expect(wrapper.exists()).toBe(true)
    expect(wrapper.findComponent(ModalComponent).exists()).toBeFalsy()

    await wrapper.find('[data-test="delete-member-button"]').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.findComponent(ModalComponent).exists()).toBeTruthy()

    // Cancel
    await wrapper.find('[data-test="delete-member-cancel-button"]').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.findComponent(ModalComponent).exists()).toBeFalsy()

    // Reopen
    await wrapper.find('[data-test="delete-member-button"]').trigger('click')
    await wrapper.vm.$nextTick()

    // Confirm
    await wrapper.find('[data-test="delete-member-confirm-button"]').trigger('click')

    mockDeleteError.value = 'Error'
    mockDeleteStatus.value = 403
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-test="error-state"]').exists()).toBeTruthy()

    mockDeleteStatus.value = 500
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-test="error-state"]').text()).toContain(
      'Error! Something went wrong'
    )

    resolveDelete({})
    await flushPromises()

    expect(wrapper.findComponent(ModalComponent).exists()).toBeTruthy()

    // Close the modal manually
    wrapper.findComponent(ModalComponent).vm.$emit('update:modelValue', false)
    await wrapper.vm.$nextTick()
    expect(wrapper.findComponent(ModalComponent).exists()).toBeFalsy()

    // Reopen + Success
    await wrapper.find('[data-test="delete-member-button"]').trigger('click')
    await wrapper.vm.$nextTick()

    await wrapper.find('[data-test="delete-member-confirm-button"]').trigger('click')
    mockDeleteError.value = null
    mockDeleteStatus.value = 204

    resolveDelete({})
    await flushPromises()

    expect(wrapper.findComponent(ModalComponent).exists()).toBeFalsy()
  })

  it('should test set wage feature', async () => {
    const wrapper = mountComponent()

    expect(wrapper.findComponent(ModalComponent).exists()).toBeFalsy()

    // Open modal
    await wrapper.find('[data-test="set-wage-button"]').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.findComponent(ModalComponent).exists()).toBeTruthy()

    // Empty values → expect error
    await wrapper.find('[data-test="max-hours-input"]').setValue('')
    await wrapper.find('[data-test="hourly-rate-input"]').setValue('')
    await wrapper.find('[data-test="add-wage-button"]').trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-test="rate-per-hour-error"]').exists()).toBeTruthy()

    // Cancel
    await wrapper.find('[data-test="add-wage-cancel-button"]').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.findComponent(ModalComponent).exists()).toBeFalsy()

    // Reopen
    await wrapper.find('[data-test="set-wage-button"]').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.findComponent(ModalComponent).exists()).toBeTruthy()

    // Activate Native toggle or rates won't validate
    await wrapper.find('[data-test="toggle-hourly-rate-native"]').setValue(true)
    await wrapper.vm.$nextTick()

    // Valid input
    await wrapper.find('[data-test="hourly-rate-input"]').setValue('20')
    await wrapper.find('[data-test="max-hours-input"]').setValue('40')

    await wrapper.find('[data-test="add-wage-button"]').trigger('click')

    mockPutError.value = 'Error'
    mockPutStatus.value = 403
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-test="error-state"]').exists()).toBeTruthy()

    mockPutStatus.value = 500
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-test="error-state"]').text()).toContain(
      'Error! Something went wrong'
    )

    resolvePut({})
    await flushPromises()

    expect(wrapper.findComponent(ModalComponent).exists()).toBeTruthy()

    // Close
    wrapper.findComponent(ModalComponent).vm.$emit('update:modelValue', false)
    await wrapper.vm.$nextTick()

    // Reopen + success
    await wrapper.find('[data-test="set-wage-button"]').trigger('click')
    await wrapper.vm.$nextTick()

    await wrapper.find('[data-test="toggle-hourly-rate-native"]').setValue(true)
    await wrapper.find('[data-test="hourly-rate-input"]').setValue('20')
    await wrapper.find('[data-test="max-hours-input"]').setValue('40')

    await wrapper.find('[data-test="add-wage-button"]').trigger('click')

    mockPutError.value = null
    mockPutStatus.value = 201

    resolvePut({})
    await flushPromises()

    expect(wrapper.findComponent(ModalComponent).exists()).toBeFalsy()
  })
})
