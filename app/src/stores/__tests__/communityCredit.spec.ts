import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { ref } from 'vue'
import type { Address } from 'viem'
import { mockFixedReturnReads, mockUserStore } from '@/tests/mocks'
import type { FixedReturnRawOffer, LendingOfferStruct } from '@/types'

// The store reads the offer list through useFixedReturnAllOffers (globally mocked), but
// also opens an owner useQuery and the off-chain metadata query. Stub both so the store
// instantiates without a live query client; the owner ref is what drives isOwner.
const ownerData = ref<string | undefined>(undefined)
vi.mock('@tanstack/vue-query', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useQuery: vi.fn(() => ({
    data: ownerData,
    isLoading: ref(false),
    isError: ref(false),
    isSuccess: ref(true),
    error: ref(null),
    refetch: vi.fn()
  }))
}))
vi.mock('@/queries/fixedReturnOffering.queries', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useGetFixedReturnOfferingsQuery: vi.fn(() => ({ data: ref([]) }))
}))

import { useCommunityCreditStore } from '@/stores/communityCredit'

const TOKEN = '0x0000000000000000000000000000000000000abc' as Address

function offer(over: Partial<LendingOfferStruct> = {}): LendingOfferStruct {
  return {
    token: TOKEN,
    fundingTarget: 40_000_000000n,
    interestRateBps: 500n, // 5%
    termDuration: 3,
    termUnit: 1, // months
    startDate: 1_700_000_000n,
    subscriptionDeadline: 1_700_500_000n,
    fundingAccess: 0,
    isCapEnabled: false,
    lenderCap: 0n,
    totalFunded: 23_400_000000n,
    totalRepaidByIssuer: 0n,
    state: 0, // Open
    ...over
  }
}

const OPEN_OFFER: FixedReturnRawOffer = { offerId: 2, decimals: 6, offer: offer() }
const REPAID_OFFER: FixedReturnRawOffer = {
  offerId: 1,
  decimals: 6,
  offer: offer({
    interestRateBps: 550n,
    totalFunded: 18_000_000000n,
    totalRepaidByIssuer: 18_990_000000n, // 18000 + 5.5% → fully repaid
    state: 3
  })
}

describe('Community Credit store (contract-backed)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockFixedReturnReads.allOffers.data.value = [OPEN_OFFER, REPAID_OFFER]
    mockFixedReturnReads.allOffers.isLoading.value = false
    mockFixedReturnReads.allOffers.isError.value = false
    ownerData.value = undefined
  })

  it('maps each on-chain offer to a CreditRound and splits active vs history', () => {
    const store = useCommunityCreditStore()
    expect(store.hasContract).toBe(true)
    expect(store.rounds.map((r) => r.id)).toEqual(['2', '1'])
    expect(store.activeRounds.map((r) => r.id)).toEqual(['2'])
    expect(store.historyRounds.map((r) => r.id)).toEqual(['1'])
    expect(store.getRound('2')?.raised).toBe(23400)
    expect(store.getRound('1')?.status).toBe('repaid')
  })

  it('derives the account stats from the offers', () => {
    const store = useCommunityCreditStore()
    expect(store.outstandingPrincipal).toBe(23400)
    expect(store.interestDue).toBe(1170) // 23400 × 5%
    expect(store.raisedLifetime).toBe(41400)
    expect(store.repaidLifetime).toBe(18990)
    expect(store.nextMaturity).not.toBe('—')
  })

  it('derives ownership from the connected wallet', () => {
    const store = useCommunityCreditStore()
    expect(store.isOwner).toBe(false)
    ownerData.value = mockUserStore.address
    expect(store.isOwner).toBe(true)
    expect(store.isLender).toBe(false)
  })

  it('reflects the loading state and toggles the layout variant', () => {
    const store = useCommunityCreditStore()
    expect(store.variant).toBe('ledger')
    store.setVariant('gauge')
    expect(store.variant).toBe('gauge')
    mockFixedReturnReads.allOffers.isLoading.value = true
    expect(store.isLoading).toBe(true)
  })

  it('maps the team members eligible to lend', () => {
    const store = useCommunityCreditStore()
    expect(store.members.length).toBeGreaterThan(0)
    expect(store.members[0]).toMatchObject({
      id: expect.any(String),
      name: expect.any(String),
      addr: expect.any(String),
      gradient: expect.stringContaining('#')
    })
  })
})
