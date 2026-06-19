import { describe, it, expect } from 'vitest'
import { getAddress } from 'viem'
import { useTeamInternalAddresses } from '../useTeamInternalAddresses'

// `useGetTeamQuery` is globally mocked (see tests/setup/composables.setup.ts) to
// return `mockTeamData`, whose only contract is an `InvestorV1` pocket.
const INVESTOR_POCKET = getAddress('0x1111111111111111111111111111111111111111')

describe('useTeamInternalAddresses', () => {
  it('exposes the team contract pockets as a reactive Set', () => {
    const { addresses } = useTeamInternalAddresses('1')
    expect(addresses.value).toBeInstanceOf(Set)
    expect(addresses.value.has(INVESTOR_POCKET)).toBe(true)
  })

  it('surfaces the underlying query loading / error state', () => {
    const { isLoading, error } = useTeamInternalAddresses('1')
    expect(isLoading.value).toBe(false)
    expect(error.value).toBeNull()
  })
})
