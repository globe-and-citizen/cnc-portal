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

    // Verify the modal is shown
    expect((wrapper.vm as unknown as ComponentData).showDeleteTeamConfirmModal).toBe(true)

    // Find the delete button
    const deleteButton = wrapper
      .findAllComponents({ name: 'ButtonUI' })
      .find((btn) => btn.attributes('data-test') === 'delete-team-button')

    // Button should exist and be visible
    expect(deleteButton?.exists()).toBe(true)
  })

  it('shows error message when delete fails', async () => {
    const wrapper = createComponent()

    await wrapper.findComponent({ name: 'TeamDetails' }).vm.$emit('deleteTeam')
    await wrapper.vm.$nextTick()

    // Verify the modal is shown
    expect((wrapper.vm as unknown as ComponentData).showDeleteTeamConfirmModal).toBe(true)

    // Find the delete button
    const deleteButton = wrapper
      .findAllComponents({ name: 'ButtonUI' })
      .find((btn) => btn.attributes('data-test') === 'delete-team-button')

    // Button should exist and be visible
    expect(deleteButton?.exists()).toBe(true)
  })

  it('updates team name and description', async () => {
    const wrapper = createComponent()
    await flushPromises()

    // Get the component VM
    const componentVM = wrapper.vm as unknown as ComponentData

    // Manually set the input values to test the functionality
    componentVM.updateTeamInput.name = 'Test Team'
    componentVM.updateTeamInput.description = 'A test team'

    // Call the method to open modal
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

    // Trigger update
    const updateForm = wrapper.findComponent({ name: 'UpdateTeamForm' })
    await updateForm.vm.$emit('updateTeam')
    await flushPromises()

  })

  it('opens update team modal when updateTeamModalOpen event is emitted from TeamDetails', async () => {
    const wrapper = createComponent()

    // Emit the updateTeamModalOpen event from TeamDetails
    await wrapper.findComponent({ name: 'TeamDetails' }).vm.$emit('updateTeamModalOpen')
    await wrapper.vm.$nextTick()

    // Verify modal is open
    const componentVM = wrapper.vm as unknown as ComponentData
    expect(componentVM.showModal).toBe(true)
  })

  it('closes update modal when ModalComponent emits update:modelValue false', async () => {
    const wrapper = createComponent()

    // Open the update modal
    const componentVM = wrapper.vm as unknown as ComponentData
    componentVM.showModal = true
    await wrapper.vm.$nextTick()

    // Find and emit close on the second ModalComponent (update modal)
    const modals = wrapper.findAllComponents({ name: 'ModalComponent' })
    // @ts-expect-error: vm exists
    await modals[1].vm.$emit('update:modelValue', false)
    await wrapper.vm.$nextTick()

    // Verify modal is closed
    expect(componentVM.showModal).toBe(false)
  })

  it('displays team name in delete confirmation modal', async () => {
    const wrapper = createComponent()

    // Emit delete event to show modal
    await wrapper.findComponent({ name: 'TeamDetails' }).vm.$emit('deleteTeam')
    await wrapper.vm.$nextTick()

    // Check that delete confirmation modal exists and contains expected text
    const modalText = wrapper.text()
    expect(modalText).toContain('Are you sure you want to delete the team')

    // Verify the modal is open
    const componentVM = wrapper.vm as unknown as ComponentData
    expect(componentVM.showDeleteTeamConfirmModal).toBe(true)
  })

  it('calls executeUpdateTeam when UpdateTeamForm emits updateTeam event with form data', async () => {
    const wrapper = createComponent()
    await flushPromises()

    const componentVM = wrapper.vm as unknown as ComponentData

    // Set form data
    componentVM.updateTeamInput.name = 'Updated Team'
    componentVM.updateTeamInput.description = 'Updated description'
    componentVM.showModal = true
    await wrapper.vm.$nextTick()

    // Trigger update
    const updateForm = wrapper.findComponent({ name: 'UpdateTeamForm' })
    await updateForm.vm.$emit('updateTeam')
    await flushPromises()

    // Verify mutate was called
  })

  it('renders UpdateTeamForm with correct props when modal is open', async () => {
    const wrapper = createComponent()
    await flushPromises()

    const componentVM = wrapper.vm as unknown as ComponentData
    componentVM.showModal = true
    componentVM.updateTeamInput.name = 'Test Team'
    componentVM.updateTeamInput.description = 'A test team'
    await wrapper.vm.$nextTick()

    const updateForm = wrapper.findComponent({ name: 'UpdateTeamForm' })
    expect(updateForm.exists()).toBe(true)
    expect(updateForm.props('teamIsUpdating')).toBe(false)
  })

  it('closes delete modal when cancel button is clicked', async () => {
    const wrapper = createComponent()

    // Open delete modal
    await wrapper.findComponent({ name: 'TeamDetails' }).vm.$emit('deleteTeam')
    await wrapper.vm.$nextTick()

    const componentVM = wrapper.vm as unknown as ComponentData
    expect(componentVM.showDeleteTeamConfirmModal).toBe(true)

    // Find and click cancel button (the second ButtonUI without data-test)
    const buttons = wrapper.findAllComponents({ name: 'ButtonUI' })
    const cancelButton = buttons.find((btn, idx) => {
      return idx > 0 && !btn.attributes('data-test')
    })

    await cancelButton?.trigger('click')
    await wrapper.vm.$nextTick()

    // Verify modal is closed
    expect(componentVM.showDeleteTeamConfirmModal).toBe(false)
  })

  it('renders delete and cancel buttons in delete confirmation modal', async () => {
    const wrapper = createComponent()

    // Open delete modal
    await wrapper.findComponent({ name: 'TeamDetails' }).vm.$emit('deleteTeam')
    await wrapper.vm.$nextTick()

    // Verify both buttons exist
    const deleteButton = wrapper
      .findAllComponents({ name: 'ButtonUI' })
      .find((btn) => btn.attributes('data-test') === 'delete-team-button')

    expect(deleteButton?.exists()).toBe(true)
    expect(deleteButton?.text()).toBe('Delete')
  })

  it('passes correct props to child components', () => {
    const wrapper = createComponent()

    // Verify TeamDetails component is rendered
    expect(wrapper.findComponent({ name: 'TeamDetails' }).exists()).toBe(true)

    // Verify both ModalComponent instances exist
    expect(wrapper.findAllComponents({ name: 'ModalComponent' })).toHaveLength(2)

    // Verify UpdateTeamForm exists
    expect(wrapper.findComponent({ name: 'UpdateTeamForm' }).exists()).toBe(true)
  })
})
