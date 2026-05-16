import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useUpdateTeamMutation } from '@/queries/team.queries'
import { useTeamStore } from '@/stores'
import { mockTeamData } from '@/tests/mocks'
import TeamMetaVisibilityModal from '../TeamMetaVisibilityModal.vue'
import type { Team } from '@/types/team'

const mutateSpy = vi.fn()
const resetSpy = vi.fn()

const teamProps = (overrides: Partial<Team> = {}): Team => ({
  ...mockTeamData,
  id: '8',
  name: 'Visibility Co',
  description: 'Visibility test',
  ownerAddress: '0xOwner',
  members: [],
  teamContracts: [],
  isHidden: false,
  isArchived: false,
  ...overrides
})

const mountModal = (team: Team) =>
  mount(TeamMetaVisibilityModal, {
    props: { currentTeam: team }
  })

async function openModal(wrapper: ReturnType<typeof mountModal>) {
  await wrapper.findComponent({ name: 'UModal' }).vm.$emit('update:open', true)
  await wrapper.vm.$nextTick()
}

describe('TeamMetaVisibilityModal.vue', () => {
  beforeEach(() => {
    mutateSpy.mockClear()
    resetSpy.mockClear()
    vi.mocked(useTeamStore).mockReturnValue({
      currentTeamId: '8',
      currentTeamMeta: { data: teamProps() }
    } as never)
    vi.mocked(useUpdateTeamMutation).mockReturnValue({
      mutate: mutateSpy,
      isPending: ref(false),
      error: ref(null),
      reset: resetSpy
    } as never)
  })

  it('shows hide copy when company is visible', async () => {
    const wrapper = mountModal(teamProps({ isHidden: false }))
    expect(wrapper.text()).toContain('Hide')
    await openModal(wrapper)
    expect(wrapper.text()).toContain('hide')
    expect(wrapper.text()).toContain('Visibility Co')
  })

  it('does not run show when company id is missing', async () => {
    vi.mocked(useTeamStore).mockReturnValueOnce({
      currentTeamId: null,
      currentTeamMeta: { data: teamProps({ isHidden: true }) }
    } as never)

    const wrapper = mountModal(teamProps({ isHidden: true }))
    await openModal(wrapper)
    await wrapper.find('[data-test="visibility-team-button"]').trigger('click')

    expect(mutateSpy).not.toHaveBeenCalled()
  })

  it('shows show copy when company is hidden', async () => {
    const wrapper = mountModal(teamProps({ isHidden: true }))
    expect(wrapper.text()).toContain('Show')
    await openModal(wrapper)
    expect(wrapper.text()).toContain('show')
  })

  it('treats missing isHidden as visible', async () => {
    const full = teamProps()
    const { isHidden: _ignored, ...withoutHidden } = full
    void _ignored
    const wrapper = mountModal(withoutHidden as Team)
    expect(wrapper.text()).toContain('Hide')
  })

  it('hides company on confirm', async () => {
    mutateSpy.mockImplementationOnce((_payload, options) => {
      options?.onSuccess?.()
    })

    const wrapper = mountModal(teamProps({ isHidden: false }))
    await openModal(wrapper)
    await wrapper.find('[data-test="visibility-team-button"]').trigger('click')

    expect(mutateSpy).toHaveBeenCalledWith(
      { pathParams: { id: '8' }, body: { isHidden: true } },
      expect.any(Object)
    )
    expect(resetSpy).toHaveBeenCalled()
  })

  it('shows company on confirm when hidden', async () => {
    mutateSpy.mockImplementationOnce((_payload, options) => {
      options?.onSuccess?.()
    })

    const wrapper = mountModal(teamProps({ isHidden: true }))
    await openModal(wrapper)
    await wrapper.find('[data-test="visibility-team-button"]').trigger('click')

    expect(mutateSpy).toHaveBeenCalledWith(
      { pathParams: { id: '8' }, body: { isHidden: false } },
      expect.any(Object)
    )
    expect(resetSpy).toHaveBeenCalled()
  })

  it('does not mutate when company id is missing', async () => {
    vi.mocked(useTeamStore).mockReturnValueOnce({
      currentTeamId: null,
      currentTeamMeta: { data: teamProps() }
    } as never)

    const wrapper = mountModal(teamProps({ isHidden: false }))
    await openModal(wrapper)
    await wrapper.find('[data-test="visibility-team-button"]').trigger('click')

    expect(mutateSpy).not.toHaveBeenCalled()
  })

  it('renders mutation error in the body', async () => {
    vi.mocked(useUpdateTeamMutation).mockReturnValueOnce({
      mutate: mutateSpy,
      isPending: ref(false),
      error: ref(new Error('Visibility failed')),
      reset: resetSpy
    } as never)

    const wrapper = mountModal(teamProps())
    await openModal(wrapper)
    expect(wrapper.text()).toContain('Visibility failed')
  })

  it('closes on cancel', async () => {
    const wrapper = mountModal(teamProps())
    await openModal(wrapper)
    await wrapper
      .findAll('button')
      .find((b) => b.text().includes('Cancel'))!
      .trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-test="visibility-team-button"]').exists()).toBe(false)
  })

  it('disables primary action while pending', async () => {
    vi.mocked(useUpdateTeamMutation).mockReturnValueOnce({
      mutate: mutateSpy,
      isPending: ref(true),
      error: ref(null),
      reset: resetSpy
    } as never)

    const wrapper = mountModal(teamProps())
    await openModal(wrapper)
    expect(wrapper.get('[data-test="visibility-team-button"]').attributes('disabled')).toBeDefined()
  })
})
