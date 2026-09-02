import { describe, expect, it } from 'vitest'
import { routeForSelectedTeam } from '@/utils/teams/navigation'
import type { RouteLocationNormalizedLoaded } from 'vue-router'

const routeContext = (
  overrides: Partial<RouteLocationNormalizedLoaded>
): RouteLocationNormalizedLoaded =>
  ({
    name: 'show-team',
    params: { id: '1' },
    query: {},
    hash: '',
    ...overrides
  }) as RouteLocationNormalizedLoaded

describe('routeForSelectedTeam', () => {
  it('changes only the company on a team-scoped route', () => {
    const route = routeContext({
      name: 'proposal-detail',
      params: { id: '1', proposalId: '9' },
      query: { tab: 'votes', filter: ['open', 'owned'] },
      hash: '#result'
    })

    expect(routeForSelectedTeam(route, '42')).toEqual({
      name: 'proposal-detail',
      params: { id: '42', proposalId: '9' },
      query: { tab: 'votes', filter: ['open', 'owned'] },
      hash: '#result'
    })
  })

  it('keeps the overview route when switching from an overview', () => {
    const route = routeContext({ name: 'show-team', params: { id: '1' } })

    expect(routeForSelectedTeam(route, 7)).toEqual({
      name: 'show-team',
      params: { id: '7' },
      query: {},
      hash: ''
    })
  })

  it('falls back to the selected company overview outside a team route', () => {
    const route = routeContext({ name: 'teams', params: {}, query: { create: '1' } })

    expect(routeForSelectedTeam(route, '12')).toEqual({
      name: 'show-team',
      params: { id: '12' }
    })
  })
})
