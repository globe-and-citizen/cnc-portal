import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { useCompanyActions } from '@/composables/useCompanyActions'
import { useUpdateTeamMutation, useDeleteTeamMutation } from '@/queries/team.queries'
import { mockTeamsData } from '@/tests/mocks'

const updateMutate = vi.fn()
const deleteMutate = vi.fn()
const updateReset = vi.fn()
const deleteReset = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(useUpdateTeamMutation).mockReturnValue({
    mutate: updateMutate,
    isPending: ref(false),
    error: ref(null),
    reset: updateReset
  } as never)
  vi.mocked(useDeleteTeamMutation).mockReturnValue({
    mutate: deleteMutate,
    isPending: ref(false),
    error: ref(null),
    reset: deleteReset
  } as never)
})

const teams = () => mockTeamsData
const firstId = String(mockTeamsData[0].id)

describe('useCompanyActions', () => {
  it('defers `update` to the onUpdate callback', () => {
    const onUpdate = vi.fn()
    const actions = useCompanyActions(teams, { onUpdate })
    actions.handleAction({ teamId: firstId, action: 'update' })
    expect(onUpdate).toHaveBeenCalledWith(firstId)
    expect(actions.confirmOpen.value).toBe(false)
  })

  it('hides inline through the update mutation (no confirm)', () => {
    const actions = useCompanyActions(teams, { onUpdate: vi.fn() })
    actions.handleAction({ teamId: firstId, action: 'hide' })
    expect(updateMutate).toHaveBeenCalledWith(
      { pathParams: { id: firstId }, body: { isHidden: true } },
      expect.objectContaining({ onSuccess: expect.any(Function) })
    )
    expect(actions.confirmOpen.value).toBe(false)
    // success callback should run without throwing
    updateMutate.mock.calls[0][1].onSuccess()
  })

  it('opens the confirm dialog for archive with the active team', () => {
    const actions = useCompanyActions(teams, { onUpdate: vi.fn() })
    actions.handleAction({ teamId: firstId, action: 'archive' })
    expect(actions.confirmOpen.value).toBe(true)
    expect(actions.confirmKind.value).toBe('archive')
    expect(actions.activeTeam.value?.id).toBe(mockTeamsData[0].id)
  })

  it('archives via the update mutation on confirm', () => {
    const actions = useCompanyActions(teams, { onUpdate: vi.fn() })
    actions.handleAction({ teamId: firstId, action: 'archive' })
    actions.onConfirm()
    expect(updateMutate).toHaveBeenCalledWith(
      { pathParams: { id: firstId }, body: { isArchived: true } },
      expect.objectContaining({ onSuccess: expect.any(Function) })
    )
    updateMutate.mock.calls[0][1].onSuccess()
    expect(actions.confirmOpen.value).toBe(false)
  })

  it('deletes via the delete mutation on confirm', () => {
    const actions = useCompanyActions(teams, { onUpdate: vi.fn() })
    actions.handleAction({ teamId: firstId, action: 'delete' })
    actions.onConfirm()
    expect(deleteMutate).toHaveBeenCalledWith(
      { pathParams: { teamId: firstId } },
      expect.objectContaining({ onSuccess: expect.any(Function) })
    )
    deleteMutate.mock.calls[0][1].onSuccess()
  })

  it('is a no-op on confirm when no team is active', () => {
    const actions = useCompanyActions(teams, { onUpdate: vi.fn() })
    actions.onConfirm()
    expect(updateMutate).not.toHaveBeenCalled()
    expect(deleteMutate).not.toHaveBeenCalled()
  })

  it('clears state and resets mutations when the dialog closes', () => {
    const actions = useCompanyActions(teams, { onUpdate: vi.fn() })
    actions.handleAction({ teamId: firstId, action: 'delete' })
    actions.onConfirmOpenChange(false)
    expect(actions.confirmOpen.value).toBe(false)
    expect(actions.confirmKind.value).toBe(null)
    expect(actions.activeTeam.value).toBe(null)
    expect(updateReset).toHaveBeenCalled()
    expect(deleteReset).toHaveBeenCalled()
  })
})
