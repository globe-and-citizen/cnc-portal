import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createTestingPinia } from '@pinia/testing'
import { useTeamStore } from '@/stores'
import { useUserDataStore } from '@/stores/user'
import { useDeleteTeamMutation, useUpdateTeamMutation } from '@/queries/team.queries'
import { mockRouterPush } from '@/tests/mocks/router.mock'
import TeamMetaSection from '../TeamMetaSection.vue'

const updateMutateSpy = vi.fn()
const deleteMutateSpy = vi.fn()

const teamStoreState = {
  currentTeamId: '22',
  currentTeamMeta: {
    data: {
      id: '22',
      name: 'Sher Team',
      description: 'Team description for testing coverage.',
      ownerAddress: '0xOWNER',
      members: [{ name: 'Alice', description: 'dev' }]
    }
  }
}

const mountSection = () =>
  mount(TeamMetaSection, {
    global: {
      plugins: [createTestingPinia({ createSpy: vi.fn })]
    }
  })

describe('TeamMetaSection.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(useTeamStore).mockReturnValue(teamStoreState as never)
    vi.mocked(useUserDataStore).mockReturnValue({ address: '0xOWNER' } as never)
    vi.mocked(useUpdateTeamMutation).mockReturnValue({
      isPending: ref(false),
      error: ref(null),
      mutate: updateMutateSpy
    } as never)
    vi.mocked(useDeleteTeamMutation).mockReturnValue({
      isPending: ref(false),
      error: ref(null),
      mutate: deleteMutateSpy
    } as never)
  })

  it('renders owner badge and owner action buttons', () => {
    const wrapper = mountSection()
    expect(wrapper.text()).toContain('Owner')
    expect(wrapper.text()).toContain('Update')
    expect(wrapper.text()).toContain('Delete')
  })

  it('renders employee badge when viewer is not owner', () => {
    vi.mocked(useUserDataStore).mockReturnValue({ address: '0xEMP' } as never)
    const wrapper = mountSection()
    expect(wrapper.text()).toContain('Employee')
    expect(wrapper.text()).not.toContain('Update')
  })

  it('prefills update form and submits mutation successfully', async () => {
    updateMutateSpy.mockImplementation((_payload, options) => options?.onSuccess?.())

    const wrapper = mountSection()
    await wrapper.find('button').trigger('click')
    await wrapper.vm.$nextTick()

    const vm = wrapper.vm as unknown as {
      prefillUpdateForm: () => void
      executeUpdateTeam: () => void
      updateTeamInput: { name: string; description: string }
      showModal: boolean
      inputs: unknown[]
    }

    vm.prefillUpdateForm()
    expect(vm.updateTeamInput.name).toBe('Sher Team')
    expect(vm.inputs).toHaveLength(1)

    vm.updateTeamInput.name = 'Sher Team v2'
    vm.updateTeamInput.description = 'Updated description for assertions.'
    vm.executeUpdateTeam()

    expect(updateMutateSpy).toHaveBeenCalledWith(
      {
        pathParams: { id: '22' },
        body: {
          name: 'Sher Team v2',
          description: 'Updated description for assertions.'
        }
      },
      expect.objectContaining({ onSuccess: expect.any(Function) })
    )
    expect(vm.showModal).toBe(false)
  })

  it('shows update and delete mutation errors in modal body', async () => {
    vi.mocked(useUpdateTeamMutation).mockReturnValueOnce({
      isPending: ref(false),
      error: ref(new Error('Update failed')),
      mutate: updateMutateSpy
    } as never)
    vi.mocked(useDeleteTeamMutation).mockReturnValueOnce({
      isPending: ref(false),
      error: ref(new Error('Delete failed')),
      mutate: deleteMutateSpy
    } as never)

    const wrapper = mountSection()
    const vm = wrapper.vm as unknown as { showModal: boolean; showDeleteTeamConfirmModal: boolean }
    vm.showModal = true
    vm.showDeleteTeamConfirmModal = true
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Update failed')
    expect(wrapper.text()).toContain('Delete failed')
  })

  it('handles deleteTeam guard when current team id is missing', async () => {
    vi.mocked(useTeamStore).mockReturnValue({
      ...teamStoreState,
      currentTeamId: ''
    } as never)

    const wrapper = mountSection()
    const vm = wrapper.vm as unknown as { deleteTeam: () => Promise<void> }
    await vm.deleteTeam()

    expect(deleteMutateSpy).not.toHaveBeenCalled()
  })

  it('handles successful delete by closing modal and redirecting', async () => {
    deleteMutateSpy.mockImplementation((_payload, options) => options?.onSuccess?.())

    const wrapper = mountSection()
    const vm = wrapper.vm as unknown as {
      deleteTeam: () => Promise<void>
      showDeleteTeamConfirmModal: boolean
    }

    vm.showDeleteTeamConfirmModal = true
    await vm.deleteTeam()

    expect(deleteMutateSpy).toHaveBeenCalledWith(
      { pathParams: { teamId: '22' } },
      expect.objectContaining({ onSuccess: expect.any(Function) })
    )
    expect(vm.showDeleteTeamConfirmModal).toBe(false)
    expect(mockRouterPush).toHaveBeenCalledWith('/teams')
  })

  it('closes update modal with modal close event and updates textarea model', async () => {
    const wrapper = mountSection()
    const vm = wrapper.vm as unknown as {
      showModal: boolean
      updateTeamInput: { description: string }
    }

    vm.showModal = true
    await wrapper.vm.$nextTick()

    const textarea = wrapper.find('textarea')
    if (textarea.exists()) {
      await textarea.setValue('new description through textarea')
    }

    await wrapper.find('[data-test="close-wage-modal-button"]').trigger('click')
    await wrapper.vm.$nextTick()

    expect(vm.showModal).toBe(false)
  })

  it('opens delete modal actions and closes with cancel button', async () => {
    const wrapper = mountSection()
    const vm = wrapper.vm as unknown as { showDeleteTeamConfirmModal: boolean }

    vm.showDeleteTeamConfirmModal = true
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-test="delete-team-button"]').exists()).toBe(true)
    const buttons = wrapper.findAll('button')
    const cancelButton = buttons.find((btn) => btn.text().includes('Cancel'))
    expect(cancelButton).toBeDefined()

    await cancelButton?.trigger('click')
    await wrapper.vm.$nextTick()

    expect(vm.showDeleteTeamConfirmModal).toBe(false)
  })

  it('triggers deleteTeam from delete button click in modal body', async () => {
    deleteMutateSpy.mockImplementation((_payload, options) => options?.onSuccess?.())

    const wrapper = mountSection()
    const vm = wrapper.vm as unknown as { showDeleteTeamConfirmModal: boolean }
    vm.showDeleteTeamConfirmModal = true
    await wrapper.vm.$nextTick()

    await wrapper.find('[data-test="delete-team-button"]').trigger('click')
    expect(deleteMutateSpy).toHaveBeenCalled()
  })
})
