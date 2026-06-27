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
})
