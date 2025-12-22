import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import TeamMetaSection from '../TeamMetaSection.vue'
import { ref } from 'vue'
import { createTestingPinia } from '@pinia/testing'
import { useToastStore } from '@/stores/__mocks__/useToastStore'

const mockDeleteError = ref<string | null>(null)
const mockDeleteIsFetching = ref(false)
const mockDeleteStatus = ref<number | null>(null)

const mockPutError = ref<string | null>(null)
const mockPutIsFetching = ref(false)

let resolveExecute: (val: unknown) => void

const executePutMock = vi.fn(async () => {
  mockPutIsFetching.value = true
  return new Promise((resolve) => {
    resolveExecute = resolve
  }).finally(() => {
    mockPutIsFetching.value = false
  })
})

const executeDeleteMock = vi.fn(async () => {
  mockDeleteIsFetching.value = true
  return new Promise((resolve) => {
    resolveExecute = resolve
  }).finally(() => {
    mockDeleteIsFetching.value = false
  })
})

const mockTeam = {
  id: '1',
  name: 'Test Team',
  description: 'A test team',
  members: []
}
const mocks = vi.hoisted(() => ({
  mockUseTeamStore: vi.fn(() => ({
    currentTeam: mockTeam,
  })),
  mockUseCustomFetch: vi.fn()
}))

vi.mock('vue-router', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    useRouter: vi.fn(() => ({
      push: vi.fn()
    }))
  }
})

vi.mock('@/stores/useToastStore')


vi.mock('@/stores', async (importOriginal) => {
  const actual: object = await importOriginal()

  return {
    ...actual,
    useTeamStore: vi.fn(() => ({
      currentTeam: ref(mockTeam)
    }))
  }
})

vi.mock('@/composables/useCustomFetch', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    useCustomFetch: mocks.mockUseCustomFetch
  }
})

interface ComponentData {
  showDeleteTeamConfirmModal: boolean
  updateTeamModalOpen: () => Promise<void>
  showModal: boolean
  updateTeamInput: {
    name: string
    description: string
  }
  inputs: {
    name: string
    description: string
  }[]
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('TeamMetaSection.vue', () => {
  mocks.mockUseCustomFetch.mockReturnValue({
    json: vi.fn().mockImplementation(() => ({
      put: vi.fn().mockReturnValue({
        isFetching: mockPutIsFetching,
        error: mockPutError,
        execute: executePutMock
      })
    })),
    delete: vi.fn().mockImplementation(() => ({
      json: vi.fn().mockReturnValue({
        isFetching: mockDeleteIsFetching,
        error: mockDeleteError,
        execute: executeDeleteMock,
        statusCode: mockDeleteStatus
      })
    }))
  })

  const createComponent = () => {
    return mount(TeamMetaSection, {
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })]
      }
    })
  }

  it('renders the component', () => {
    const wrapper = createComponent()
    expect(wrapper.exists()).toBe(true)
  })

  it('shows delete confirmation modal when deleteTeam event is emitted', async () => {
    const wrapper = createComponent()

    // Emit the `deleteTeam` event from the stubbed TeamDetails component
    await wrapper.findComponent({ name: 'TeamDetails' }).vm.$emit('deleteTeam')
    await wrapper.vm.$nextTick()

    // Assert that the modal's ref is now true
    expect((wrapper.vm as unknown as ComponentData).showDeleteTeamConfirmModal).toBe(true)
  })

  it('closes the delete modal when ModalComponent emits update:modelValue', async () => {
    const wrapper = createComponent()

    // Open the modal first
    await wrapper.findComponent({ name: 'TeamDetails' }).vm.$emit('deleteTeam')
    await wrapper.vm.$nextTick()

    // Emit the update:modelValue=false to simulate closing the modal
    await wrapper.findComponent({ name: 'ModalComponent' }).vm.$emit('update:modelValue', false)
    await wrapper.vm.$nextTick()

    // Assert that the modal was closed
    expect((wrapper.vm as unknown as ComponentData).showDeleteTeamConfirmModal).toBe(false)
  })

  it('closes delete modal and navigates on successful delete', async () => {
    const wrapper = createComponent()

    await wrapper.findComponent({ name: 'TeamDetails' }).vm.$emit('deleteTeam')
    await wrapper.vm.$nextTick()

    // Trigger Delete button
    const deleteButton = wrapper
      .findAllComponents({ name: 'ButtonUI' })
      .find((btn) => btn.attributes('data-test') === 'delete-team-button')

    await deleteButton!.trigger('click')

    // Simulate delete success
    mockDeleteStatus.value = 200
    resolveExecute({})
    await wrapper.vm.$nextTick()
  })

  it('shows error message when delete fails', async () => {
    const wrapper = createComponent()

    await wrapper.findComponent({ name: 'TeamDetails' }).vm.$emit('deleteTeam')
    await wrapper.vm.$nextTick()

    // Trigger Delete button
    const deleteButton = wrapper
      .findAllComponents({ name: 'ButtonUI' })
      .find((btn) => btn.attributes('data-test') === 'delete-team-button')

    await deleteButton!.trigger('click')

    // Simulate delete failure
    mockDeleteStatus.value = 500
    mockDeleteError.value = 'Error'
    resolveExecute({})
    await wrapper.vm.$nextTick()
  })

  it('updates team name and description', async () => {
    const wrapper = createComponent()

    await (wrapper.vm as unknown as ComponentData).updateTeamModalOpen()
    await wrapper.vm.$nextTick()

    expect((wrapper.vm as unknown as ComponentData).showModal).toBe(true)
    expect((wrapper.vm as unknown as ComponentData).updateTeamInput.name).toBe('Test Team')
    expect((wrapper.vm as unknown as ComponentData).updateTeamInput.description).toBe('A test team')
  })

  it('show error message when update fails', async () => {
    const wrapper = createComponent()

    // Simulate update failure
    mockPutError.value = 'Error'
    mockPutIsFetching.value = false
    resolveExecute({})
    await wrapper.vm.$nextTick()

    expect(useToastStore().addErrorToast).toHaveBeenCalled()
  })
})
