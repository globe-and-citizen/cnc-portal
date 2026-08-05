import { describe, expect, it } from 'vitest'
import { fixedReturnOfferingKeys } from '../fixedReturnOffering.queries'

describe('fixedReturnOfferingKeys', () => {
  it('builds the base and list-scope keys', () => {
    expect(fixedReturnOfferingKeys.all).toEqual(['fixedReturnOfferings'])
    expect(fixedReturnOfferingKeys.lists()).toEqual(['fixedReturnOfferings', 'list'])
  })

  it('builds a list key scoped to a teamId', () => {
    expect(fixedReturnOfferingKeys.list(29)).toEqual([
      'fixedReturnOfferings',
      'list',
      { teamId: 29 }
    ])
  })

  it('builds a list key with a null teamId when none is selected', () => {
    expect(fixedReturnOfferingKeys.list(null)).toEqual([
      'fixedReturnOfferings',
      'list',
      { teamId: null }
    ])
  })

  it('normalizes a string teamId to the same key as its number form', () => {
    // The GET query holds teamId as a string ref (teamStore.currentTeamId); the POST
    // mutation's invalidateKeys reads it as a number from the request body. Without
    // normalizing both to the same primitive type here, TanStack Query's type-sensitive
    // key matching (`"15" !== 15`) would make the mutation's invalidation silently
    // match nothing, and the list query would never refetch after a new offering is
    // created (known-issues.md #12).
    expect(fixedReturnOfferingKeys.list('15')).toEqual(fixedReturnOfferingKeys.list(15))
  })
})
