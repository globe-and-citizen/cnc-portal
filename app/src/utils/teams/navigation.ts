import type { RouteLocationNormalizedLoaded, RouteLocationRaw } from 'vue-router'

type TeamRouteContext = Pick<RouteLocationNormalizedLoaded, 'name' | 'params' | 'query' | 'hash'>

/**
 * Keep the current team-scoped destination while changing only its company.
 * Routes outside a company workspace have no page to preserve, so they open
 * the selected company's overview instead.
 */
export function routeForSelectedTeam(
  route: TeamRouteContext,
  teamId: string | number
): RouteLocationRaw {
  const id = String(teamId)

  if (!route.name || route.params.id == null) {
    return { name: 'show-team', params: { id } }
  }

  return {
    name: route.name,
    params: { ...route.params, id },
    query: route.query,
    hash: route.hash
  }
}
