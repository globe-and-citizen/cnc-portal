import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { useRoute } from 'vue-router'
import ListIndex from '@/views/team/ListIndex.vue'
import { useGetTeamsQuery, useUpdateTeamMutation } from '@/queries/team.queries'
import { mockTeamData } from '@/tests/mocks'
import { createMockMutationResponse, createMockQueryResponse } from '@/tests/mocks/query.mock'
import { mockToast } from '@/tests/mocks/store.mock'
import type { Team } from '@/types'

const TeamCardStub = {
  name: 'TeamCard',
  template: '<div />',
  props: ['team', 'treasury', 'to']
}

const mockUpdateMutation = () => {
  const mutation = createMockMutationResponse()
  vi.mocked(useUpdateTeamMutation).mockReturnValueOnce(
    mutation as unknown as ReturnType<typeof useUpdateTeamMutation>
  )
  return mutation as { mutate: ReturnType<typeof vi.fn> }
}

const createWrapper = (teams: Team[]) => {
  vi.mocked(useGetTeamsQuery).mockReturnValueOnce(createMockQueryResponse(teams))
  return mount(ListIndex, {
    global: {
      plugins: [createTestingPinia({ createSpy: vi.fn })],
      stubs: { AddTeamCard: true, TeamCard: TeamCardStub }
    }
  })
}

const cardsOf = (wrapper: ReturnType<typeof createWrapper>) =>
  wrapper.findAllComponents({ name: 'TeamCard' })

describe('[US-COMPANIES-009] ListIndex - pinning a company', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useRoute).mockReturnValue({
      params: { id: '0' },
      meta: { name: 'Team List View' }
    } as ReturnType<typeof useRoute>)
  })

  it('[AC-US-COMPANIES-009-01] pins an unpinned company', () => {
    const { mutate } = mockUpdateMutation()
    const wrapper = createWrapper([{ ...mockTeamData, id: '1', isFavorite: false }])

    cardsOf(wrapper)[0]!.vm.$emit('toggleFavorite')

    expect(mutate.mock.calls[0]![0]).toEqual({
      pathParams: { id: '1' },
      body: { isFavorite: true }
    })
  })

  it('[AC-US-COMPANIES-009-01] unpins a pinned company', () => {
    const { mutate } = mockUpdateMutation()
    const wrapper = createWrapper([{ ...mockTeamData, id: '1', isFavorite: true }])

    cardsOf(wrapper)[0]!.vm.$emit('toggleFavorite')

    expect(mutate.mock.calls[0]![0].body).toEqual({ isFavorite: false })
  })

  it('[AC-US-COMPANIES-009-07] reports a failed pin', () => {
    const { mutate } = mockUpdateMutation()
    const wrapper = createWrapper([{ ...mockTeamData, id: '1', name: 'Acme' }])

    cardsOf(wrapper)[0]!.vm.$emit('toggleFavorite')
    mutate.mock.calls[0]![1].onError()

    expect(mockToast.add).toHaveBeenCalledWith({
      title: 'Could not update the pin on Acme',
      color: 'error'
    })
  })
})
