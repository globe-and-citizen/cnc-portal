import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useUpdateTeamMutation } from '@/queries/team.queries'
import { useTeamStore } from '@/stores'
import { mockTeamData } from '@/tests/mocks'
import TeamMetaArchiveModal from '../TeamMetaArchiveModal.vue'
import type { Team } from '@/types/team'

const mutateSpy = vi.fn()
const resetSpy = vi.fn()

const teamProps = (overrides: Partial<Team> = {}): Team => ({
  ...mockTeamData,
  id: '7',
  name: 'Archive Co',
  description: 'Archive test',
  ownerAddress: '0xOwner',
  members: [],
  teamContracts: [],
  isHidden: false,
  isArchived: false,
  ...overrides
})

const mountModal = (team: Team) =>
  mount(TeamMetaArchiveModal, {
    props: { currentTeam: team }
  })

async function openModal(wrapper: ReturnType<typeof mountModal>) {
  await wrapper.findComponent({ name: 'UModal' }).vm.$emit('update:open', true)
  await wrapper.vm.$nextTick()
}

describe('TeamMetaArchiveModal.vue', () => {
  beforeEach(() => {
    mutateSpy.mockClear()
    resetSpy.mockClear()
    vi.mocked(useTeamStore).mockReturnValue({
      currentTeamId: '7',
      currentTeamMeta: { data: teamProps() }
    } as never)
    vi.mocked(useUpdateTeamMutation).mockReturnValue({
      mutate: mutateSpy,
      isPending: ref(false),
      error: ref(null),
      reset: resetSpy
    } as never)
  })

  it('shows archive copy when company is not archived', async () => {
    const wrapper = mountModal(teamProps({ isArchived: false }))
    expect(wrapper.text()).toContain('Archive')
    await openModal(wrapper)
    expect(wrapper.text()).toContain('archive')
    expect(wrapper.text()).toContain('Archive Co')
  })

  it('treats missing isArchived as not archived', async () => {
    const full = teamProps()
    const { isArchived: _ignored, ...withoutArchived } = full
    void _ignored
    const wrapper = mountModal(withoutArchived as Team)
    expect(wrapper.text()).toContain('Archive')
  })

  it('does not run unarchive when company id is missing', async () => {
    vi.mocked(useTeamStore).mockReturnValueOnce({
      currentTeamId: null,
      currentTeamMeta: { data: teamProps({ isArchived: true }) }
    } as never)

    const wrapper = mountModal(teamProps({ isArchived: true }))
    await openModal(wrapper)
    await wrapper.find('[data-test="archive-team-button"]').trigger('click')

    expect(mutateSpy).not.toHaveBeenCalled()
  })

  it('shows unarchive copy when company is archived', async () => {
    const wrapper = mountModal(teamProps({ isArchived: true }))
    expect(wrapper.text()).toContain('Unarchive')
    await openModal(wrapper)
    expect(wrapper.text()).toContain('unarchive')
  })

  it('archives company on confirm', async () => {
    mutateSpy.mockImplementationOnce((_payload, options) => {
      options?.onSuccess?.()
    })

    const wrapper = mountModal(teamProps({ isArchived: false }))
    await openModal(wrapper)
    await wrapper.find('[data-test="archive-team-button"]').trigger('click')

    expect(mutateSpy).toHaveBeenCalledWith(
      { pathParams: { id: '7' }, body: { isArchived: true } },
      expect.any(Object)
    )
    expect(resetSpy).toHaveBeenCalled()
  })

  it('unarchives company on confirm', async () => {
    mutateSpy.mockImplementationOnce((_payload, options) => {
      options?.onSuccess?.()
    })

    const wrapper = mountModal(teamProps({ isArchived: true }))
    await openModal(wrapper)
    await wrapper.find('[data-test="archive-team-button"]').trigger('click')

    expect(mutateSpy).toHaveBeenCalledWith(
      { pathParams: { id: '7' }, body: { isArchived: false } },
      expect.any(Object)
    )
    expect(resetSpy).toHaveBeenCalled()
  })

  it('does not mutate when company id is missing', async () => {
    vi.mocked(useTeamStore).mockReturnValueOnce({
      currentTeamId: null,
      currentTeamMeta: { data: teamProps() }
    } as never)

    const wrapper = mountModal(teamProps())
    await openModal(wrapper)
    await wrapper.find('[data-test="archive-team-button"]').trigger('click')

    expect(mutateSpy).not.toHaveBeenCalled()
  })

  it('renders mutation error in the body', async () => {
    vi.mocked(useUpdateTeamMutation).mockReturnValueOnce({
      mutate: mutateSpy,
      isPending: ref(false),
      error: ref(new Error('Archive failed')),
      reset: resetSpy
    } as never)

    const wrapper = mountModal(teamProps())
    await openModal(wrapper)
    expect(wrapper.text()).toContain('Archive failed')
  })

  it('closes on cancel', async () => {
    const wrapper = mountModal(teamProps())
    await openModal(wrapper)
    await wrapper
      .findAll('button')
      .find((b) => b.text().includes('Cancel'))!
      .trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-test="archive-team-button"]').exists()).toBe(false)
  })

  it('disables archive action while pending', async () => {
    vi.mocked(useUpdateTeamMutation).mockReturnValueOnce({
      mutate: mutateSpy,
      isPending: ref(true),
      error: ref(null),
      reset: resetSpy
    } as never)

    const wrapper = mountModal(teamProps())
    await openModal(wrapper)
    expect(wrapper.get('[data-test="archive-team-button"]').attributes('disabled')).toBeDefined()
  })
})
