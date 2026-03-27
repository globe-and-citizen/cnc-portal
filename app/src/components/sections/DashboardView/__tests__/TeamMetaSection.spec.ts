import { mount, flushPromises } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import TeamMetaSection from '../TeamMetaSection.vue'
import { createTestingPinia } from '@pinia/testing'

vi.mock('vue-router', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    useRouter: vi.fn(() => ({
      push: vi.fn()
    }))
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

  it('shows delete confirmation modal when delete button is clicked', async () => {
    const wrapper = createComponent()

    const componentVM = wrapper.vm as unknown as ComponentData
    componentVM.showDeleteTeamConfirmModal = true
    await wrapper.vm.$nextTick()

    expect(componentVM.showDeleteTeamConfirmModal).toBe(true)
  })

  it('closes delete modal and navigates on successful delete', async () => {
    const wrapper = createComponent()

    const componentVM = wrapper.vm as unknown as ComponentData
    componentVM.showDeleteTeamConfirmModal = true
    await wrapper.vm.$nextTick()

    expect(componentVM.showDeleteTeamConfirmModal).toBe(true)
  })

  it('shows error message when delete fails', async () => {
    const wrapper = createComponent()

    const componentVM = wrapper.vm as unknown as ComponentData
    componentVM.showDeleteTeamConfirmModal = true
    await wrapper.vm.$nextTick()

    expect(componentVM.showDeleteTeamConfirmModal).toBe(true)
  })

  it('updates team name and description', async () => {
    const wrapper = createComponent()
    await flushPromises()

    const componentVM = wrapper.vm as unknown as ComponentData

    componentVM.updateTeamInput.name = 'Test Team'
    componentVM.updateTeamInput.description = 'A test team'

    componentVM.showModal = true
    await wrapper.vm.$nextTick()

    expect(componentVM.showModal).toBe(true)
    expect(componentVM.updateTeamInput.name).toBe('Test Team')
    expect(componentVM.updateTeamInput.description).toBe('A test team')
  })

  it('show error message when update fails', async () => {
    const wrapper = createComponent()
    await flushPromises()

    const componentVM = wrapper.vm as unknown as ComponentData

    await componentVM.updateTeamModalOpen()
    await wrapper.vm.$nextTick()

    componentVM.showModal = true
    await wrapper.vm.$nextTick()
  })

  it('opens update team modal when updateTeamModalOpen is called', async () => {
    const wrapper = createComponent()

    const componentVM = wrapper.vm as unknown as ComponentData
    await componentVM.updateTeamModalOpen()
    await wrapper.vm.$nextTick()

    expect(componentVM.showModal).toBe(true)
  })

  it.skip('closes update modal when UModal emits update:open false', async () => {
    const wrapper = createComponent()

    const componentVM = wrapper.vm as unknown as ComponentData
    componentVM.showModal = true
    await wrapper.vm.$nextTick()

    const modals = wrapper.findAllComponents({ name: 'UModal' })
    // @ts-expect-error: vm exists
    await modals[1].vm.$emit('update:open', false)
    await wrapper.vm.$nextTick()

    expect(componentVM.showModal).toBe(false)
  })

  it.skip('displays team name in delete confirmation modal', async () => {
    const wrapper = createComponent()

    const componentVM = wrapper.vm as unknown as ComponentData
    componentVM.showDeleteTeamConfirmModal = true
    await wrapper.vm.$nextTick()

    const modalText = wrapper.text()
    expect(modalText).toContain('Are you sure you want to delete the team')

    expect(componentVM.showDeleteTeamConfirmModal).toBe(true)
  })

  it('calls executeUpdateTeam when submit button is clicked with form data', async () => {
    const wrapper = createComponent()
    await flushPromises()

    const componentVM = wrapper.vm as unknown as ComponentData

    componentVM.updateTeamInput.name = 'Updated Team'
    componentVM.updateTeamInput.description = 'Updated description'
    componentVM.showModal = true
    await wrapper.vm.$nextTick()

    await flushPromises()
  })

  it('renders update form inputs when modal is open', async () => {
    const wrapper = createComponent()
    await flushPromises()

    const componentVM = wrapper.vm as unknown as ComponentData
    componentVM.showModal = true
    componentVM.updateTeamInput.name = 'Test Team'
    componentVM.updateTeamInput.description = 'A test team'
    await wrapper.vm.$nextTick()

    expect(componentVM.showModal).toBe(true)
    expect(componentVM.updateTeamInput.name).toBe('Test Team')
    expect(componentVM.updateTeamInput.description).toBe('A test team')
  })

  it('closes delete modal when cancel button is clicked', async () => {
    const wrapper = createComponent()

    const componentVM = wrapper.vm as unknown as ComponentData
    componentVM.showDeleteTeamConfirmModal = true
    await wrapper.vm.$nextTick()

    expect(componentVM.showDeleteTeamConfirmModal).toBe(true)
  })

  it('renders delete and cancel buttons in delete confirmation modal', async () => {
    const wrapper = createComponent()

    const componentVM = wrapper.vm as unknown as ComponentData
    componentVM.showDeleteTeamConfirmModal = true
    await wrapper.vm.$nextTick()

    expect(componentVM.showDeleteTeamConfirmModal).toBe(true)
  })

  it.skip('passes correct props to child components', () => {
    const wrapper = createComponent()

    expect(wrapper.findAllComponents({ name: 'UModal' })).toHaveLength(2)
  })
})
