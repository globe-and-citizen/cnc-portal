import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createTestingPinia } from '@pinia/testing'
import type { Team } from '@/types/team'
import {
  useArchiveTeamMutation,
  useDeleteTeamMutation,
  useHideTeamMutation,
  useShowTeamMutation,
  useUnarchiveTeamMutation,
  useUpdateTeamMutation
} from '@/queries/team.queries'
import { useTeamStore } from '@/stores'
import { mockRouterPush } from '@/tests/mocks/router.mock'
import TeamMetaActions from '../TeamMetaActions.vue'

const useTeamStoreMock = useTeamStore as unknown as ReturnType<typeof vi.fn>
const useUpdateTeamMutationMock = useUpdateTeamMutation as unknown as ReturnType<typeof vi.fn>
const useDeleteTeamMutationMock = useDeleteTeamMutation as unknown as ReturnType<typeof vi.fn>
const useArchiveTeamMutationMock = useArchiveTeamMutation as unknown as ReturnType<typeof vi.fn>
const useUnarchiveTeamMutationMock = useUnarchiveTeamMutation as unknown as ReturnType<typeof vi.fn>
const useHideTeamMutationMock = useHideTeamMutation as unknown as ReturnType<typeof vi.fn>
const useShowTeamMutationMock = useShowTeamMutation as unknown as ReturnType<typeof vi.fn>

const updateMutateSpy = vi.fn()
const deleteMutateSpy = vi.fn()
const archiveMutateSpy = vi.fn()
const unarchiveMutateSpy = vi.fn()
const hideMutateSpy = vi.fn()
const showMutateSpy = vi.fn()

const baseTeam: Team = {
  id: '22',
  name: 'Sher Team',
  description: 'Team description for testing coverage.',
  ownerAddress: '0x1234567890123456789012345678901234567890',
  members: [],
  teamContracts: [],
  isArchived: false,
  isVisible: true
}

const mountActions = (team: Team = baseTeam, isOwner = true) =>
  mount(TeamMetaActions, {
    props: { currentTeam: team, isOwner },
    global: { plugins: [createTestingPinia({ createSpy: vi.fn })] }
  })

describe('TeamMetaActions.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useTeamStoreMock.mockReturnValue({
      currentTeamId: '22',
      currentTeamMeta: { data: baseTeam }
    })

    useUpdateTeamMutationMock.mockReturnValue({
      mutate: updateMutateSpy,
      isPending: ref(false),
      error: ref(null)
    })
    useDeleteTeamMutationMock.mockReturnValue({
      mutate: deleteMutateSpy,
      isPending: ref(false),
      error: ref(null)
    })
    useArchiveTeamMutationMock.mockReturnValue({
      mutate: archiveMutateSpy,
      isPending: ref(false),
      error: ref(null)
    })
    useUnarchiveTeamMutationMock.mockReturnValue({
      mutate: unarchiveMutateSpy,
      isPending: ref(false),
      error: ref(null)
    })
    useHideTeamMutationMock.mockReturnValue({
      mutate: hideMutateSpy,
      isPending: ref(false),
      error: ref(null)
    })
    useShowTeamMutationMock.mockReturnValue({
      mutate: showMutateSpy,
      isPending: ref(false),
      error: ref(null)
    })
  })

  it('shows only visibility action for non-owner', () => {
    const wrapper = mountActions(baseTeam, false)
    expect(wrapper.text()).toContain('Hide')
    expect(wrapper.text()).not.toContain('Update')
    expect(wrapper.text()).not.toContain('Archive')
    expect(wrapper.text()).not.toContain('Delete')
  })

  it('shows owner actions and toggled labels for archived or hidden team', () => {
    const wrapper = mountActions({ ...baseTeam, isArchived: true, isVisible: false }, true)
    expect(wrapper.text()).toContain('Unarchive')
    expect(wrapper.text()).toContain('Show')
    expect(wrapper.text()).toContain('Update')
    expect(wrapper.text()).toContain('Delete')
  })

  it('prefills update form and executes update mutation', () => {
    updateMutateSpy.mockImplementation((_payload, options) => options?.onSuccess?.())
    const wrapper = mountActions()
    const vm = wrapper.vm as unknown as {
      prefillUpdateForm: () => void
      executeUpdateTeam: () => void
      updateTeamInput: { name: string; description: string }
      showUpdateModal: boolean
    }

    vm.prefillUpdateForm()
    expect(vm.updateTeamInput).toEqual({
      name: 'Sher Team',
      description: 'Team description for testing coverage.'
    })

    vm.updateTeamInput.name = 'Sher Team v2'
    vm.updateTeamInput.description = 'Updated team description for tests.'
    vm.executeUpdateTeam()

    expect(updateMutateSpy).toHaveBeenCalledWith(
      {
        pathParams: { id: '22' },
        body: { name: 'Sher Team v2', description: 'Updated team description for tests.' }
      },
      expect.objectContaining({ onSuccess: expect.any(Function) })
    )
    expect(vm.showUpdateModal).toBe(false)
  })

  it('calls delete mutation and redirects on success', async () => {
    deleteMutateSpy.mockImplementation((_payload, options) => options?.onSuccess?.())
    const wrapper = mountActions()
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

  it('archives, unarchives, hides and shows with success handlers', async () => {
    archiveMutateSpy.mockImplementation((_payload, options) => options?.onSuccess?.())
    unarchiveMutateSpy.mockImplementation((_payload, options) => options?.onSuccess?.())
    hideMutateSpy.mockImplementation((_payload, options) => options?.onSuccess?.())
    showMutateSpy.mockImplementation((_payload, options) => options?.onSuccess?.())

    const wrapper = mountActions()
    const vm = wrapper.vm as unknown as {
      archiveTeam: () => Promise<void>
      unarchiveTeam: () => Promise<void>
      hideTeam: () => Promise<void>
      showTeam: () => Promise<void>
      showArchiveTeamConfirmModal: boolean
      showVisibilityTeamConfirmModal: boolean
    }

    vm.showArchiveTeamConfirmModal = true
    vm.showVisibilityTeamConfirmModal = true
    await vm.archiveTeam()
    await vm.unarchiveTeam()
    await vm.hideTeam()
    await vm.showTeam()

    expect(archiveMutateSpy).toHaveBeenCalledWith(
      { pathParams: { id: '22' }, body: { isArchived: true } },
      expect.objectContaining({ onSuccess: expect.any(Function) })
    )
    expect(unarchiveMutateSpy).toHaveBeenCalledWith(
      { pathParams: { id: '22' }, body: { isArchived: false } },
      expect.objectContaining({ onSuccess: expect.any(Function) })
    )
    expect(hideMutateSpy).toHaveBeenCalledWith(
      { pathParams: { id: '22' }, body: { isVisible: false } },
      expect.objectContaining({ onSuccess: expect.any(Function) })
    )
    expect(showMutateSpy).toHaveBeenCalledWith(
      { pathParams: { id: '22' }, body: { isVisible: true } },
      expect.objectContaining({ onSuccess: expect.any(Function) })
    )
    expect(vm.showArchiveTeamConfirmModal).toBe(false)
    expect(vm.showVisibilityTeamConfirmModal).toBe(false)
  })

  it('guards all actions when current team id is missing', async () => {
    useTeamStoreMock.mockReturnValue({
      currentTeamId: '',
      currentTeamMeta: { data: baseTeam }
    })
    const wrapper = mountActions()
    const vm = wrapper.vm as unknown as {
      executeUpdateTeam: () => void
      deleteTeam: () => Promise<void>
      archiveTeam: () => Promise<void>
      unarchiveTeam: () => Promise<void>
      hideTeam: () => Promise<void>
      showTeam: () => Promise<void>
    }

    vm.executeUpdateTeam()
    await vm.deleteTeam()
    await vm.archiveTeam()
    await vm.unarchiveTeam()
    await vm.hideTeam()
    await vm.showTeam()

    expect(updateMutateSpy).not.toHaveBeenCalled()
    expect(deleteMutateSpy).not.toHaveBeenCalled()
    expect(archiveMutateSpy).not.toHaveBeenCalled()
    expect(unarchiveMutateSpy).not.toHaveBeenCalled()
    expect(hideMutateSpy).not.toHaveBeenCalled()
    expect(showMutateSpy).not.toHaveBeenCalled()
  })

  it('renders query errors inside opened modals', async () => {
    useUpdateTeamMutationMock.mockReturnValueOnce({
      mutate: updateMutateSpy,
      isPending: ref(false),
      error: ref(new Error('Update failed'))
    })
    useDeleteTeamMutationMock.mockReturnValueOnce({
      mutate: deleteMutateSpy,
      isPending: ref(false),
      error: ref(new Error('Delete failed'))
    })
    useArchiveTeamMutationMock.mockReturnValueOnce({
      mutate: archiveMutateSpy,
      isPending: ref(false),
      error: ref(new Error('Archive failed'))
    })
    useHideTeamMutationMock.mockReturnValueOnce({
      mutate: hideMutateSpy,
      isPending: ref(false),
      error: ref(new Error('Visibility failed'))
    })

    const wrapper = mountActions()
    const vm = wrapper.vm as unknown as {
      showUpdateModal: boolean
      showDeleteTeamConfirmModal: boolean
      showArchiveTeamConfirmModal: boolean
      showVisibilityTeamConfirmModal: boolean
    }

    vm.showUpdateModal = true
    vm.showDeleteTeamConfirmModal = true
    vm.showArchiveTeamConfirmModal = true
    vm.showVisibilityTeamConfirmModal = true
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Update failed')
    expect(wrapper.text()).toContain('Delete failed')
  })

  it('triggers visibility and delete modal buttons from template events', async () => {
    hideMutateSpy.mockImplementation((_payload, options) => options?.onSuccess?.())
    showMutateSpy.mockImplementation((_payload, options) => options?.onSuccess?.())
    deleteMutateSpy.mockImplementation((_payload, options) => options?.onSuccess?.())

    const visibleWrapper = mountActions({ ...baseTeam, isVisible: true })
    const visibleVm = visibleWrapper.vm as unknown as { showVisibilityTeamConfirmModal: boolean }
    visibleVm.showVisibilityTeamConfirmModal = true
    await visibleWrapper.vm.$nextTick()
    await visibleWrapper.get('[data-test="visibility-team-button"]').trigger('click')
    expect(hideMutateSpy).toHaveBeenCalled()

    const hiddenWrapper = mountActions({ ...baseTeam, isVisible: false })
    const hiddenVm = hiddenWrapper.vm as unknown as { showVisibilityTeamConfirmModal: boolean }
    hiddenVm.showVisibilityTeamConfirmModal = true
    await hiddenWrapper.vm.$nextTick()
    await hiddenWrapper.get('[data-test="visibility-team-button"]').trigger('click')
    expect(showMutateSpy).toHaveBeenCalled()

    const ownerWrapper = mountActions()
    const ownerVm = ownerWrapper.vm as unknown as {
      showDeleteTeamConfirmModal: boolean
    }
    ownerVm.showDeleteTeamConfirmModal = true
    await ownerWrapper.vm.$nextTick()

    await ownerWrapper.get('[data-test="delete-team-button"]').trigger('click')
    expect(deleteMutateSpy).toHaveBeenCalled()

    const visibilityCancelWrapper = mountActions()
    const visibilityVm = visibilityCancelWrapper.vm as unknown as {
      showVisibilityTeamConfirmModal: boolean
    }
    visibilityVm.showVisibilityTeamConfirmModal = true
    await visibilityCancelWrapper.vm.$nextTick()
    const visibilityCancel = visibilityCancelWrapper.findAll('button').at(-1)
    await visibilityCancel?.trigger('click')
  })

  it('triggers archive and unarchive template button branches', async () => {
    archiveMutateSpy.mockImplementation((_payload, options) => options?.onSuccess?.())
    unarchiveMutateSpy.mockImplementation((_payload, options) => options?.onSuccess?.())

    const archiveWrapper = mountActions({ ...baseTeam, isArchived: false })
    const archiveVm = archiveWrapper.vm as unknown as { showArchiveTeamConfirmModal: boolean }
    archiveVm.showArchiveTeamConfirmModal = true
    await archiveWrapper.vm.$nextTick()
    await archiveWrapper.get('[data-test="archive-team-button"]').trigger('click')
    expect(archiveMutateSpy).toHaveBeenCalled()

    const unarchiveWrapper = mountActions({ ...baseTeam, isArchived: true })
    const unarchiveVm = unarchiveWrapper.vm as unknown as { showArchiveTeamConfirmModal: boolean }
    unarchiveVm.showArchiveTeamConfirmModal = true
    await unarchiveWrapper.vm.$nextTick()
    await unarchiveWrapper.get('[data-test="archive-team-button"]').trigger('click')
    expect(unarchiveMutateSpy).toHaveBeenCalled()
  })
})
