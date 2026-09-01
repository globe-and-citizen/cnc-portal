import { beforeEach, describe, expect, it, vi } from 'vitest'
import ListIndex from '@/views/team/ListIndex.vue'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { createMockQueryResponse } from '@/tests/mocks/query.mock'
import { mockTeamData } from '@/tests/mocks'
import type { Team } from '@/types'
import { useRoute } from 'vue-router'

import { useGetTeamsQuery } from '@/queries/team.queries'

// The card only announces which action was chosen; the list owns the modals.
// These cover that hand-off — that the right modal opens, against the right
// team, and that nothing else on the page reacts.
describe('ListIndex - card actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useRoute).mockReturnValue({
      params: { id: '0' },
      meta: { name: 'Team List View' }
    } as ReturnType<typeof useRoute>)
  })

  const MODAL_FOR = {
    update: 'TeamMetaUpdateModal',
    archive: 'TeamMetaArchiveModal',
    hide: 'TeamMetaVisibilityModal',
    delete: 'TeamMetaDeleteModal'
  } as const
  type CardAction = keyof typeof MODAL_FOR

  const modalStub = (name: string) => ({
    name,
    props: ['open', 'currentTeam', 'teamId', 'withTrigger'],
    template: '<div />'
  })

  const mountWithActions = (teams: Team[]) => {
    vi.mocked(useGetTeamsQuery).mockReturnValueOnce(createMockQueryResponse(teams))

    return mount(ListIndex, {
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })],
        stubs: {
          AddTeamCard: true,
          AddTeamForm: true,
          TeamCard: {
            name: 'TeamCard',
            props: ['team', 'treasury', 'to'],
            template: '<div :data-test="`team-card-${team.id}`" />'
          },
          ...Object.fromEntries(Object.values(MODAL_FOR).map((name) => [name, modalStub(name)]))
        }
      }
    })
  }

  const cardFor = (wrapper: ReturnType<typeof mountWithActions>, teamId: string) =>
    wrapper
      .findAllComponents({ name: 'TeamCard' })
      .find((card) => card.props('team').id === teamId)!

  const TEAM = { ...mockTeamData, id: '42', name: 'Acted On' }

  it.each(Object.keys(MODAL_FOR) as CardAction[])(
    'opens the %s modal against the team that raised it',
    async (action) => {
      const wrapper = mountWithActions([TEAM])
      cardFor(wrapper, '42').vm.$emit(action)
      await wrapper.vm.$nextTick()

      const modal = wrapper.findComponent({ name: MODAL_FOR[action] })
      expect(modal.props('open')).toBe(true)
      expect(modal.props('teamId')).toBe('42')
      expect(modal.props('currentTeam')).toMatchObject({ id: '42', name: 'Acted On' })
      // The list drives the modal, so the modal's own trigger button stays off.
      expect(modal.props('withTrigger')).toBe(false)
    }
  )

  it('leaves the other three modals closed', async () => {
    const wrapper = mountWithActions([TEAM])
    cardFor(wrapper, '42').vm.$emit('archive')
    await wrapper.vm.$nextTick()

    const openNames = Object.values(MODAL_FOR).filter(
      (name) => wrapper.findComponent({ name }).props('open') === true
    )
    expect(openNames).toEqual(['TeamMetaArchiveModal'])
  })

  // The modals are shared across every card, so the team they point at has to
  // follow the last card acted on rather than stick to the first.
  it('retargets the modal when a different card raises the same action', async () => {
    const wrapper = mountWithActions([TEAM, { ...mockTeamData, id: '7', name: 'Second' }])

    cardFor(wrapper, '42').vm.$emit('delete')
    await wrapper.vm.$nextTick()
    expect(wrapper.findComponent({ name: 'TeamMetaDeleteModal' }).props('teamId')).toBe('42')

    cardFor(wrapper, '7').vm.$emit('delete')
    await wrapper.vm.$nextTick()
    expect(wrapper.findComponent({ name: 'TeamMetaDeleteModal' }).props('teamId')).toBe('7')
  })

  it('closes the modal when it reports itself closed', async () => {
    const wrapper = mountWithActions([TEAM])
    cardFor(wrapper, '42').vm.$emit('hide')
    await wrapper.vm.$nextTick()

    const modal = wrapper.findComponent({ name: 'TeamMetaVisibilityModal' })
    modal.vm.$emit('update:open', false)
    await wrapper.vm.$nextTick()

    expect(modal.props('open')).toBe(false)
  })
})
