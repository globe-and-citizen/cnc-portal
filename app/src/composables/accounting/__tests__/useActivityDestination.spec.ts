import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useActivityDestination } from '../useActivityDestination'
import { mockRouterPush, setMockRoute, mockTeamStore } from '@/tests/mocks'
import type { ActivityDestination } from '@/utils/accounting/activityDestination'

const MEMBER = '0x1111111111111111111111111111111111111111'

/** A destination as the presenter builds it — the label is irrelevant here. */
function destination(partial: Partial<ActivityDestination> & Pick<ActivityDestination, 'section'>) {
  return { label: 'Open it', ...partial }
}

describe('useActivityDestination', () => {
  beforeEach(() => {
    mockRouterPush.mockClear()
    setMockRoute({ params: { id: '42' } })
  })

  it('routes a pocket section to its account view, scoped to the team on the route', () => {
    const { routeFor } = useActivityDestination()
    expect(routeFor(destination({ section: 'bank' }))).toEqual({
      name: 'bank-account',
      params: { id: '42' }
    })
    expect(routeFor(destination({ section: 'expense' }))).toEqual({
      name: 'expense-account',
      params: { id: '42' }
    })
  })

  it("addresses the Safe Account with the team's Safe contract", () => {
    const { routeFor } = useActivityDestination()
    expect(routeFor(destination({ section: 'safe' }))).toEqual({
      name: 'safe-account',
      params: { id: '42', address: mockTeamStore.getContractAddressByType('Safe') }
    })
  })

  it('has no route for a Safe the team does not have', () => {
    mockTeamStore.getContractAddressByType = vi.fn(() => undefined)
    const { routeFor } = useActivityDestination()
    expect(routeFor(destination({ section: 'safe' }))).toBeNull()
  })

  it('scopes payroll history to its member and a credit round to its id', () => {
    const { routeFor } = useActivityDestination()
    expect(routeFor(destination({ section: 'payroll-history', memberAddress: MEMBER }))).toEqual({
      name: 'payroll-history',
      params: { id: '42', memberAddress: MEMBER }
    })
    expect(routeFor(destination({ section: 'credit-round', roundId: '7' }))).toEqual({
      name: 'community-credit-round',
      params: { id: '42', roundId: '7' }
    })
  })

  it('has no route when the scoping detail is missing', () => {
    const { routeFor } = useActivityDestination()
    expect(routeFor(destination({ section: 'payroll-history' }))).toBeNull()
    expect(routeFor(destination({ section: 'credit-round' }))).toBeNull()
    expect(routeFor(null)).toBeNull()
    expect(routeFor(undefined)).toBeNull()
  })

  it('navigates to the resolved route, and does nothing when there is none', () => {
    const { open } = useActivityDestination()
    open(destination({ section: 'sher-token' }))
    expect(mockRouterPush).toHaveBeenCalledWith({ name: 'sher-token', params: { id: '42' } })

    mockRouterPush.mockClear()
    open(destination({ section: 'credit-round' }))
    expect(mockRouterPush).not.toHaveBeenCalled()
  })
})
