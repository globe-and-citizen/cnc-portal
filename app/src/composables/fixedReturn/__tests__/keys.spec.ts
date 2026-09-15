import { describe, expect, it } from 'vitest'
import { ref } from 'vue'
import { fixedReturnKeys } from '../keys'

const ADDRESS = '0x1111111111111111111111111111111111111111' as const

describe('fixedReturnKeys', () => {
  it('nests every branch under the shared "all" prefix, so invalidating "all" matches every leaf', () => {
    expect(fixedReturnKeys.allOffers(ADDRESS).slice(0, 1)).toEqual(fixedReturnKeys.all)
    expect(fixedReturnKeys.offerLenders(ADDRESS, 1, ADDRESS).slice(0, 1)).toEqual(
      fixedReturnKeys.all
    )
    expect(fixedReturnKeys.myLenderPositions(ADDRESS, ADDRESS, [1, 2]).slice(0, 1)).toEqual(
      fixedReturnKeys.all
    )
  })

  it('each leaf key is a superset of its own coarse "All()" prefix', () => {
    expect(fixedReturnKeys.allOffers(ADDRESS).slice(0, 2)).toEqual(fixedReturnKeys.allOffersAll())
    expect(fixedReturnKeys.offerLenders(ADDRESS, 1, ADDRESS).slice(0, 2)).toEqual(
      fixedReturnKeys.offerLendersAll()
    )
    expect(fixedReturnKeys.myLenderPositions(ADDRESS, ADDRESS, [1]).slice(0, 2)).toEqual(
      fixedReturnKeys.myLenderPositionsAll()
    )
  })

  it('unwraps a ref the same way it unwraps a plain value, producing an identical key', () => {
    const plain = fixedReturnKeys.allOffers(ADDRESS)
    const reffed = fixedReturnKeys.allOffers(ref(ADDRESS))
    expect(reffed).toEqual(plain)
  })

  it('falls back to null for every unresolved argument instead of throwing', () => {
    expect(fixedReturnKeys.allOffers()).toEqual([
      ...fixedReturnKeys.all,
      'allOffers',
      { address: null }
    ])
    expect(fixedReturnKeys.offerLenders()).toEqual([
      ...fixedReturnKeys.all,
      'offerLenders',
      { address: null, offerId: null, token: null }
    ])
    expect(fixedReturnKeys.myLenderPositions()).toEqual([
      ...fixedReturnKeys.all,
      'myLenderPositions',
      { address: null, lender: null, offerIds: [] }
    ])
  })
})
