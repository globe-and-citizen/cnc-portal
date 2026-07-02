import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import dayjs from 'dayjs'
import { useQuery } from '@tanstack/vue-query'
import { readContract } from '@wagmi/core'
import { formatUnits, isAddress, type Address } from 'viem'
import { config } from '@/wagmi.config'
import { FIXED_RETURN_ABI } from '@/artifacts/abi/fixed-return'
import { useFixedReturnAddress, useFixedReturnAllOffers } from '@/composables/fixedReturn/reads'
import { useGetFixedReturnOfferingsQuery } from '@/queries/fixedReturnOffering.queries'
import { useTeamStore } from './teamStore'
import { useUserDataStore } from './user'
import {
  gradientForAddress,
  lendingOfferToCreditRound,
  offerMaturityDate,
  offerStateToRoundStatus,
  roundInterest
} from '@/utils'
import type { CreditMember, CreditRound, RoundDetailVariant } from '@/types'

/**
 * Community Credit is the member-facing UI for a team's on-chain FixedReturn contract:
 * each "round" is a FixedReturn lending offer. This store surfaces the read side —
 * the offer list (useFixedReturnAllOffers), their off-chain title/purpose metadata and
 * the contract owner — mapped into the CreditRound shape the views render, plus the
 * `variant` layout toggle. Writes (lend / repay / create / refund) live in the views and
 * modals, since they need ERC20 approvals and toasts that only make sense in a component.
 */
export const useCommunityCreditStore = defineStore('communityCredit', () => {
  const teamStore = useTeamStore()
  const userStore = useUserDataStore()
  const fixedReturnAddress = useFixedReturnAddress()

  // ───────── view-only UI state ─────────
  const variant = ref<RoundDetailVariant>('ledger')
  function setVariant(next: RoundDetailVariant) {
    variant.value = next
  }

  // ───────── on-chain reads ─────────
  const offersQuery = useFixedReturnAllOffers()
  const metadataQuery = useGetFixedReturnOfferingsQuery({
    queryParams: { teamId: () => teamStore.currentTeamId }
  })
  const ownerQuery = useQuery({
    queryKey: ['fixedReturnOwner', fixedReturnAddress],
    queryFn: () =>
      readContract(config, {
        address: fixedReturnAddress.value as Address,
        abi: FIXED_RETURN_ABI,
        functionName: 'owner'
      }) as Promise<Address>,
    enabled: computed(() => !!fixedReturnAddress.value && isAddress(fixedReturnAddress.value))
  })

  /** True once the team actually has a FixedReturn ("Credit Account") deployed. */
  const hasContract = computed(() => !!fixedReturnAddress.value)
  const isLoading = computed(() => offersQuery.isLoading.value)
  const isError = computed(() => offersQuery.isError.value)

  function titleFor(offerId: number): string | undefined {
    return (metadataQuery.data.value ?? []).find((m) => m.offerId === offerId)?.title
  }
  function purposeFor(offerId: number): string | undefined {
    return (metadataQuery.data.value ?? []).find((m) => m.offerId === offerId)?.purpose ?? undefined
  }

  /** Every offer as a CreditRound, newest first (lenders resolved lazily by the detail view). */
  const rounds = computed<CreditRound[]>(() =>
    (offersQuery.data.value ?? []).map((raw) =>
      lendingOfferToCreditRound(raw, titleFor(raw.offerId), purposeFor(raw.offerId))
    )
  )

  // ───────── role (derived from on-chain ownership, not a manual toggle) ─────────
  const isOwner = computed(
    () =>
      !!userStore.address &&
      !!ownerQuery.data.value &&
      userStore.address.toLowerCase() === ownerQuery.data.value.toLowerCase()
  )
  const isLender = computed(() => !isOwner.value)

  // ───────── derived round buckets ─────────
  const activeRounds = computed(() =>
    rounds.value.filter(
      (r) => r.status === 'open' || r.status === 'funded' || r.status === 'active'
    )
  )
  const historyRounds = computed(() =>
    rounds.value.filter((r) => r.status === 'repaid' || r.status === 'refundable')
  )

  // ───────── account stats (from raw offers so token decimals stay correct) ─────────
  const outstandingPrincipal = computed(() =>
    activeRounds.value.reduce((sum, r) => sum + r.raised, 0)
  )
  const interestDue = computed(() =>
    activeRounds.value.reduce((sum, r) => sum + roundInterest(r), 0)
  )
  const raisedLifetime = computed(() => rounds.value.reduce((sum, r) => sum + r.raised, 0))
  const repaidLifetime = computed(() =>
    (offersQuery.data.value ?? []).reduce(
      (sum, raw) => sum + Number(formatUnits(raw.offer.totalRepaidByIssuer, raw.decimals)),
      0
    )
  )
  const nextMaturity = computed(() => {
    const soonest = (offersQuery.data.value ?? [])
      .filter((raw) => {
        const s = offerStateToRoundStatus(raw.offer)
        return s === 'open' || s === 'funded' || s === 'active'
      })
      .map((raw) => offerMaturityDate(raw.offer))
      .sort((a, b) => a.getTime() - b.getTime())[0]
    return soonest ? dayjs(soonest).format('MMM D') : '—'
  })

  // ───────── team members eligible to lend (restricted-list picker) ─────────
  const members = computed<CreditMember[]>(() =>
    (teamStore.currentTeamMeta.data?.members ?? []).map((m) => ({
      id: m.address,
      name: m.name || m.address,
      addr: m.address,
      gradient: gradientForAddress(m.address)
    }))
  )

  function getRound(id: string | undefined): CreditRound | undefined {
    return rounds.value.find((r) => r.id === id)
  }

  return {
    // ui state
    variant,
    setVariant,
    // status
    hasContract,
    isLoading,
    isError,
    // role
    isOwner,
    isLender,
    // rounds
    rounds,
    activeRounds,
    historyRounds,
    getRound,
    // account stats
    outstandingPrincipal,
    interestDue,
    raisedLifetime,
    repaidLifetime,
    nextMaturity,
    // members
    members
  }
})
