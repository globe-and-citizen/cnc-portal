import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useTeamSafes } from '../useTeamSafes'
import { useRoute, type RouteLocationNormalizedLoadedGeneric } from 'vue-router'
import { useTeamStore, useUserDataStore } from '@/stores'
import { createTestingPinia } from '@pinia/testing'
import { deriveSafeFromEoa } from '@/utils/trading/safeDeploymentUtils'
import type { Member, Team } from '@/types'

// 1. Mock external dependencies
vi.mock('vue-router', () => ({
  useRoute: vi.fn()
}))

vi.mock('@/utils/trading/safeDeploymentUtils', () => ({
  deriveSafeFromEoa: vi.fn()
}))

describe('useTeamSafes', () => {
  const mockTrader = {
    name: 'Alice',
    traderSafeAddress: '0xTrader123',
    memberTeamsData: [{ isTrader: true }]
  } as Member

  beforeEach(() => {
    // 2. Initialize Pinia with a testing instance
    createTestingPinia({ createSpy: vi.fn })
    vi.clearAllMocks()
  })

  it('returns only trader safes when on the trading route', () => {
    // Setup Mocked Route
    vi.mocked(useRoute).mockReturnValue({
      name: 'trading',
      params: { address: '0xTrader123' }
    } as unknown as RouteLocationNormalizedLoadedGeneric)

    vi.mocked(useTeamStore).mockReturnValue({
      currentTeamMeta: {
        data: { members: [mockTrader as Member], safeAddress: '0xBankSafe' } as unknown as Team
      }
    } as ReturnType<typeof useTeamStore>)

    const { safes } = useTeamSafes()

    console.log('Safes: ', safes.value)

    expect(safes.value).toHaveLength(1)
    expect(safes?.value?.[0]?.name).toBe("Alice's Safe")
    expect(safes.value.find((s) => s.name === 'Bank Safe')).toBeUndefined()
  })

  it('prepends the Bank Safe when on the safe-account route', () => {
    vi.mocked(useRoute).mockReturnValue({
      name: 'safe-account',
      params: { address: '0xBankSafe' }
    } as unknown as RouteLocationNormalizedLoadedGeneric)

    const teamStore = useTeamStore()
    teamStore.currentTeamMeta = {
      //@ts-expect-error -- mocked data --
      data: { members: [mockTrader], safeAddress: '0xBankSafe' }
    }

    const { safes } = useTeamSafes()

    expect(safes.value).toHaveLength(2)
    expect(safes?.value?.[0]?.name).toBe('Bank Safe') // Prepended per logic [bankSafe, ...traderSafes]
    expect(safes?.value?.[1]?.name).toBe("Alice's Safe")
  })

  it('correctly identifies the initialSafe based on EOA derivation', () => {
    vi.mocked(useRoute).mockReturnValue({
      name: 'trading',
      params: {}
    } as unknown as RouteLocationNormalizedLoadedGeneric)
    vi.mocked(deriveSafeFromEoa).mockReturnValue('0xTrader123')

    const userDataStore = useUserDataStore()
    userDataStore.address = '0xEOA'

    const teamStore = useTeamStore()
    teamStore.currentTeamMeta = {
      //@ts-expect-error -- mocked data --
      data: { members: [mockTrader] }
    }

    const { initialSafe } = useTeamSafes()

    expect(initialSafe.value).toBe('0xTrader123')
  })

  it('selects a safe based on route params', () => {
    vi.mocked(useRoute).mockReturnValue({
      name: 'trading',
      params: { address: '0xTrader123' }
    } as unknown as RouteLocationNormalizedLoadedGeneric)

    const teamStore = useTeamStore()
    //@ts-expect-error -- mocked data --
    teamStore.currentTeamMeta = { data: { members: [mockTrader] } }

    const { selectedSafe } = useTeamSafes()

    expect(selectedSafe.value?.address).toBe('0xTrader123')
    expect(selectedSafe.value?.name).toBe("Alice's Safe")
  })

  it('returns an empty array if on safe-account but bank safe address is missing', () => {
    vi.mocked(useRoute).mockReturnValue({
      name: 'safe-account',
      params: {}
    } as unknown as RouteLocationNormalizedLoadedGeneric)

    const teamStore = useTeamStore()
    teamStore.currentTeamMeta = {
      //@ts-expect-error -- mocked data --
      data: { members: [mockTrader], safeAddress: null } // Missing address
    }

    const { safes } = useTeamSafes()
    expect(safes.value).toEqual([])
  })
})
