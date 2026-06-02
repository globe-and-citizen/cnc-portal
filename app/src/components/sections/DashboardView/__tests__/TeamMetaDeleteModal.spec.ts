import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useDeleteTeamMutation } from '@/queries/team.queries'
import { useTeamStore } from '@/stores'
import { mockTeamData } from '@/tests/mocks'
import { mockRouterPush } from '@/tests/mocks/router.mock'
import TeamMetaDeleteModal from '../TeamMetaDeleteModal.vue'
import type { Team } from '@/types/team'

const mutateSpy = vi.fn()

const teamProps = (overrides: Partial<Team> = {}): Team => ({
  ...mockTeamData,
  id: '99',
  name: 'Delete Me Inc',
  description: 'Will be removed',
  ownerAddress: '0xOwner',
  members: [],
  teamContracts: [],
  isHidden: false,
  isArchived: false,
  ...overrides
})

const mountModal = (props: { currentTeam?: Team | null } = {}) =>
  mount(TeamMetaDeleteModal, {
    props: {
      currentTeam: teamProps(),
      ...props
    }
  })

async function openModal(wrapper: ReturnType<typeof mountModal>) {
  await wrapper.findComponent({ name: 'UModal' }).vm.$emit('update:open', true)
  await wrapper.vm.$nextTick()
}

describe('TeamMetaDeleteModal.vue', () => {
  beforeEach(() => {
    mutateSpy.mockClear()
    mockRouterPush.mockClear()
    vi.mocked(useTeamStore).mockReturnValue({
      currentTeamId: '99',
      currentTeamMeta: { data: teamProps() }
    } as never)
    vi.mocked(useDeleteTeamMutation).mockReturnValue({
      mutate: mutateSpy,
      isPending: ref(false),
      error: ref(null),
      reset: vi.fn()
    } as never)
  })

  it('opens the body via UModal v-model and shows the company name', async () => {
    const wrapper = mountModal()
    await openModal(wrapper)
    expect(wrapper.text()).toContain('Delete Me Inc')
    expect(wrapper.find('[data-test="delete-team-button"]').exists()).toBe(true)
  })

  it('calls delete mutation with team id and completes success flow', async () => {
    mutateSpy.mockImplementationOnce((_payload, options) => Promise.resolve(options?.onSuccess?.()))
    mockRouterPush.mockResolvedValueOnce(undefined)

    const wrapper = mountModal()
    await openModal(wrapper)
    await wrapper.find('[data-test="delete-team-button"]').trigger('click')
    await flushPromises()

    expect(mutateSpy).toHaveBeenCalledWith({ pathParams: { teamId: '99' } }, expect.any(Object))
    expect(mockRouterPush).toHaveBeenCalledWith('/teams')
  })

  it('does not call mutate when company id is missing', async () => {
    vi.mocked(useTeamStore).mockReturnValueOnce({
      currentTeamId: null,
      currentTeamMeta: { data: teamProps() }
    } as never)

    const wrapper = mountModal()
    await openModal(wrapper)
    await wrapper.find('[data-test="delete-team-button"]').trigger('click')

    expect(mutateSpy).not.toHaveBeenCalled()
  })

  it('renders API error in UAlert when delete fails', async () => {
    vi.mocked(useDeleteTeamMutation).mockReturnValueOnce({
      mutate: mutateSpy,
      isPending: ref(false),
      error: ref(new Error('Cannot delete')),
      reset: vi.fn()
    } as never)

    const wrapper = mountModal()
    await openModal(wrapper)
    expect(wrapper.text()).toContain('Cannot delete')
  })

  it('closes via cancel and via close control', async () => {
    const wrapper = mountModal()
    await openModal(wrapper)
    expect(wrapper.find('[data-test="delete-team-button"]').exists()).toBe(true)

    await wrapper
      .findAll('button')
      .find((b) => b.text().includes('Cancel'))!
      .trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-test="delete-team-button"]').exists()).toBe(false)

    await openModal(wrapper)
    await wrapper.find('[data-test="close-wage-modal-button"]').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-test="delete-team-button"]').exists()).toBe(false)
  })

  it('renders trigger with data-test team-meta-delete-open', () => {
    const wrapper = mountModal({ currentTeam: null })
    expect(wrapper.find('[data-test="team-meta-delete-open"]').exists()).toBe(true)
  })

  it('allows delete when team is archived', async () => {
    vi.mocked(useTeamStore).mockReturnValue({
      currentTeamId: '99',
      currentTeamMeta: { data: teamProps({ isArchived: true }) }
    } as never)

    const wrapper = mountModal({ currentTeam: teamProps({ isArchived: true }) })
    await openModal(wrapper)

    const openBtn = wrapper.find('[data-test="team-meta-delete-open"]')
    expect(openBtn.attributes('disabled')).toBeUndefined()

    const deleteBtn = wrapper.find('[data-test="delete-team-button"]')
    expect(deleteBtn.attributes('disabled')).toBeUndefined()
  })

  it('shows pending state on delete button', async () => {
    vi.mocked(useDeleteTeamMutation).mockReturnValueOnce({
      mutate: mutateSpy,
      isPending: ref(true),
      error: ref(null),
      reset: vi.fn()
    } as never)

    const wrapper = mountModal()
    await openModal(wrapper)
    const deleteBtn = wrapper.get('[data-test="delete-team-button"]')
    expect(deleteBtn.attributes('disabled')).toBeDefined()
  })
})
