/* eslint-disable max-lines -- Already the largest reads.ts in the codebase (elections/reads.ts,
   the next-largest, is 292 lines) because FixedReturn genuinely has the most distinct read
   shapes of any contract here. Splitting it into multiple files would recreate the same
   file-proliferation this contract's composables were just consolidated to avoid. */
import { computed, unref, type MaybeRef, type MaybeRefOrGetter, toValue } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { useReadContract } from '@wagmi/vue'
import { readContract } from '@wagmi/core'
import { formatUnits, isAddress, zeroAddress, type Address, type ContractFunctionName } from 'viem'
import { useTeamStore, useUserDataStore } from '@/stores'
import { config } from '@/wagmi.config'
import { fixedReturnAbi } from '@/artifacts/abi/generated'
import { decimalsForFixedReturnToken } from '@/utils/communityCredit/offer'
import { log } from '@/lib/logging'
import type {
  FixedReturnLenderPositionResult,
  FixedReturnOfferLender,
  FixedReturnRawOffer,
  LendingOfferStruct
} from '@/types'

/** View/pure names only — `useReadContract` rejects state-changing ones. */
type FixedReturnReadNames = ContractFunctionName<typeof fixedReturnAbi, 'view' | 'pure'>

/**
 * Query-key prefixes for the three `useQuery`-based reads below (`useFixedReturnAllOffers`,
 * `useFixedReturnOfferLenders`, `useFixedReturnMyLenderPositions`). These aren't
 * `useReadContract`-wrapped, so they fall outside `useContractWritesV3`'s automatic
 * per-contract-address invalidation and need their own keys, previously duplicated as
 * raw string-literal arrays across this file and every view/modal that reads or
 * invalidates them. Every external caller (retry buttons, `invalidation.ts`) only ever
 * needs one of these coarse prefixes — the address/offer/lender-specific leaf is used
 * only here, inline at each `useQuery` call, the same way `elections/reads.ts` inlines
 * its one custom query key rather than routing it through a builder function.
 */
export const fixedReturnKeys = {
  all: ['fixedReturn'] as const,
  allOffers: ['fixedReturn', 'allOffers'] as const,
  offerLenders: ['fixedReturn', 'offerLenders'] as const,
  myLenderPositions: ['fixedReturn', 'myLenderPositions'] as const
} as const

/**
 * FixedReturn contract address helper
 */
export function useFixedReturnAddress() {
  const teamStore = useTeamStore()
  return computed(() => teamStore.getContractAddressByType('FixedReturn'))
}

/** Reads with no args beyond the contract's own address. */
function useFixedReturnRead(functionName: FixedReturnReadNames) {
  const fixedReturnAddress = useFixedReturnAddress()
  return useReadContract({
    address: fixedReturnAddress,
    abi: fixedReturnAbi,
    functionName,
    query: {
      enabled: computed(() => !!fixedReturnAddress.value && isAddress(fixedReturnAddress.value))
    }
  })
}

/** Reads taking a single offerId — no extra address to validate beyond the contract's own. */
function useFixedReturnOfferRead(functionName: FixedReturnReadNames, offerId: MaybeRef<bigint>) {
  const fixedReturnAddress = useFixedReturnAddress()
  const offerIdValue = computed(() => unref(offerId))
  return useReadContract({
    address: fixedReturnAddress,
    abi: fixedReturnAbi,
    functionName,
    args: [offerIdValue],
    query: {
      enabled: computed(() => !!fixedReturnAddress.value && isAddress(fixedReturnAddress.value))
    }
  })
}

/** Reads taking (offerId, lender) — gated on both the contract address and lender. */
function useFixedReturnOfferLenderRead(
  functionName: FixedReturnReadNames,
  offerId: MaybeRef<bigint>,
  lender: MaybeRef<Address>
) {
  const fixedReturnAddress = useFixedReturnAddress()
  const offerIdValue = computed(() => unref(offerId))
  const lenderValue = computed(() => unref(lender))
  return useReadContract({
    address: fixedReturnAddress,
    abi: fixedReturnAbi,
    functionName,
    args: [offerIdValue, lenderValue],
    query: {
      enabled: computed(
        () =>
          !!fixedReturnAddress.value &&
          isAddress(fixedReturnAddress.value) &&
          isAddress(lenderValue.value)
      )
    }
  })
}

export function useFixedReturnOwner() {
  return useFixedReturnRead('owner')
}

export function useFixedReturnVersion() {
  return useFixedReturnRead('version')
}

export function useFixedReturnTotalOfferings() {
  return useFixedReturnRead('getTotalOfferings')
}

export function useFixedReturnGetSupportedTokens() {
  return useFixedReturnRead('getSupportedTokens')
}

export function useFixedReturnGetLendingOffer(offerId: MaybeRef<bigint>) {
  return useFixedReturnOfferRead('getLendingOffer', offerId)
}

export function useFixedReturnGetOfferLenders(offerId: MaybeRef<bigint>) {
  return useFixedReturnOfferRead('getOfferLenders', offerId)
}

export function useFixedReturnTotalEntitlementOf(
  offerId: MaybeRef<bigint>,
  lender: MaybeRef<Address>
) {
  return useFixedReturnOfferLenderRead('totalEntitlementOf', offerId, lender)
}

export function useFixedReturnLenderDeposits(offerId: MaybeRef<bigint>, lender: MaybeRef<Address>) {
  return useFixedReturnOfferLenderRead('getLenderDeposits', offerId, lender)
}

export function useFixedReturnLenderAllocation(
  offerId: MaybeRef<bigint>,
  lender: MaybeRef<Address>
) {
  return useFixedReturnOfferLenderRead('getLenderAllocation', offerId, lender)
}

export function useFixedReturnHasDeposited(offerId: MaybeRef<bigint>, lender: MaybeRef<Address>) {
  return useFixedReturnOfferLenderRead('getHasDeposited', offerId, lender)
}

/**
 * The connected wallet's live position (whitelist allocation + cumulative deposits)
 * on ONE offer — built on the existing single-value useReadContract wrappers above,
 * which useContractWritesV3 already auto-invalidates on every FixedReturn write.
 * For a single round's detail page, this is 2 reads instead of re-running
 * useFixedReturnMyLenderPositions' full all-offers computation (1+4N reads) just to
 * extract one Map entry — see RoundView.vue.
 */
export function useFixedReturnMyLenderPosition(offerId: MaybeRef<bigint>) {
  const userStore = useUserDataStore()
  const lender = computed(() => userStore.address as Address | undefined)
  const allocation = useFixedReturnLenderAllocation(offerId, lender as MaybeRef<Address>)
  const deposited = useFixedReturnLenderDeposits(offerId, lender as MaybeRef<Address>)
  return { allocation, deposited }
}

export function useFixedReturnIsTokenSupported(token: MaybeRef<Address>) {
  const fixedReturnAddress = useFixedReturnAddress()
  const tokenValue = computed(() => unref(token))
  return useReadContract({
    address: fixedReturnAddress,
    abi: fixedReturnAbi,
    functionName: 'isTokenSupported',
    args: [tokenValue],
    query: {
      enabled: computed(
        () =>
          !!fixedReturnAddress.value &&
          isAddress(fixedReturnAddress.value) &&
          isAddress(tokenValue.value)
      )
    }
  })
}

/**
 * Fetches every LendingOffer struct for this team's FixedReturn contract, newest
 * first. There's no batch view for this — totalOfferings gives the count, then each
 * offer is read individually by id — so this is shared by every view that needs the
 * full list (OfferingsList, LenderMarketplace) rather than duplicated per-component.
 * Also fetches each offer's lender addresses (getOfferLenders) alongside — cheap
 * (one extra read per offer, addresses only) and needed so the round list can show an
 * accurate lender count/avatar stack without paying for the full per-lender
 * principal/expected breakdown (see useFixedReturnOfferLenders) on every card.
 */
export function useFixedReturnAllOffers(address?: MaybeRefOrGetter<string | undefined>) {
  // Defaults to the active team's contract; callers that resolve the team
  // themselves (the accounting data layer) pass their own address instead of
  // going through the store.
  const fromStore = useFixedReturnAddress()
  const fixedReturnAddress = computed(
    () => (toValue(address) || fromStore.value || undefined) as Address | undefined
  )

  async function fetchAllOffers(): Promise<FixedReturnRawOffer[]> {
    const address = fixedReturnAddress.value
    if (!address) return []

    try {
      const total = (await readContract(config, {
        address,
        abi: fixedReturnAbi,
        functionName: 'getTotalOfferings'
      })) as bigint

      const count = Number(total)
      if (count < 1) return []

      const offers: FixedReturnRawOffer[] = []
      for (let offerId = count; offerId >= 1; offerId--) {
        const [offer, lenderAddresses] = await Promise.all([
          readContract(config, {
            address,
            abi: fixedReturnAbi,
            functionName: 'getLendingOffer',
            args: [BigInt(offerId)]
          }) as Promise<LendingOfferStruct>,
          readContract(config, {
            address,
            abi: fixedReturnAbi,
            functionName: 'getOfferLenders',
            args: [BigInt(offerId)]
          }) as Promise<Address[]>
        ])
        offers.push({
          offerId,
          offer,
          decimals: decimalsForFixedReturnToken(offer.token) ?? 6,
          lenderAddresses
        })
      }
      return offers
    } catch (error) {
      log.error('Failed to fetch FixedReturn offerings:', error)
      throw error
    }
  }

  return useQuery({
    queryKey: computed(
      () => [...fixedReturnKeys.allOffers, { address: fixedReturnAddress.value ?? null }] as const
    ),
    queryFn: fetchAllOffers,
    enabled: computed(() => !!fixedReturnAddress.value)
  })
}

/**
 * Fetches every lender who has deposited into a given offer, with their principal
 * (lenderDeposits) and current entitlement (totalEntitlementOf), scaled by the
 * offer's token decimals. There's no batch getter for this — getOfferLenders only
 * returns addresses, so each lender's amounts need their own read.
 */
export function useFixedReturnOfferLenders(
  offerId: MaybeRefOrGetter<string | number>,
  token: MaybeRefOrGetter<Address>
) {
  const fixedReturnAddress = useFixedReturnAddress()

  async function fetchLenders(): Promise<FixedReturnOfferLender[]> {
    const address = fixedReturnAddress.value
    if (!address) return []

    const offerIdValue = BigInt(toValue(offerId))
    const decimals = decimalsForFixedReturnToken(toValue(token)) ?? 6

    try {
      const lenderAddresses = (await readContract(config, {
        address,
        abi: fixedReturnAbi,
        functionName: 'getOfferLenders',
        args: [offerIdValue]
      })) as Address[]

      return await Promise.all(
        lenderAddresses.map(async (lender) => {
          const [principal, expected] = await Promise.all([
            readContract(config, {
              address,
              abi: fixedReturnAbi,
              functionName: 'getLenderDeposits',
              args: [offerIdValue, lender]
            }) as Promise<bigint>,
            readContract(config, {
              address,
              abi: fixedReturnAbi,
              functionName: 'totalEntitlementOf',
              args: [offerIdValue, lender]
            }) as Promise<bigint>
          ])
          return {
            address: lender,
            principal: Number(formatUnits(principal, decimals)),
            expected: Number(formatUnits(expected, decimals))
          }
        })
      )
    } catch (error) {
      log.error('Failed to fetch FixedReturn offer lenders:', error)
      throw error
    }
  }

  // `token` starts out as `zeroAddress` (the caller's placeholder default) until the
  // offer itself resolves and reveals the real token. `zeroAddress` isn't merely
  // "unknown" to decimalsForFixedReturnToken() — it's SUPPORTED_TOKENS' own `native`
  // entry, at 18 decimals — so fetching before the real token arrives locks in the
  // wrong decimals for the entire result (e.g. 500 USDC read back as ~0.0000000005),
  // and since the query key didn't include the token, that wrong-decimals fetch would
  // cache forever with no later refetch to correct it. Including `token` in the key
  // and gating `enabled` on it being resolved avoids ever fetching against the
  // placeholder in the first place.
  const tokenValue = computed(() => toValue(token))
  return useQuery({
    queryKey: computed(
      () =>
        [
          ...fixedReturnKeys.offerLenders,
          {
            address: fixedReturnAddress.value ?? null,
            offerId: toValue(offerId) ?? null,
            token: tokenValue.value ?? null
          }
        ] as const
    ),
    queryFn: fetchLenders,
    enabled: computed(
      () =>
        !!fixedReturnAddress.value &&
        isAddress(tokenValue.value) &&
        tokenValue.value !== zeroAddress
    )
  })
}

/**
 * Per-connected-lender position (Whitelist allocation + cumulative deposits) for
 * every FixedReturn offer. Needed for every offer, not just Whitelist ones, since
 * lendFunds enforces the cumulative deposit total on-chain either way.
 * lenderAllocation is harmless to read for a General offer too — it's just an unset
 * (zero) mapping entry there. Self-contained like useFixedReturnAllOffers — it reads
 * the connected user and reuses that same query's cache rather than taking the offer
 * list or lender as params.
 */
export function useFixedReturnMyLenderPositions() {
  const fixedReturnAddress = useFixedReturnAddress()
  const userStore = useUserDataStore()
  const lenderAddress = computed(() => userStore.address as Address | undefined)
  const { data: allOffers } = useFixedReturnAllOffers()

  async function fetchMyLenderPositions(): Promise<Map<number, FixedReturnLenderPositionResult>> {
    const address = fixedReturnAddress.value
    const lender = lenderAddress.value
    if (!address || !lender) return new Map()

    const entries = await Promise.all(
      (allOffers.value ?? []).map(async ({ offerId }) => {
        try {
          const [allocation, deposited] = await Promise.all([
            readContract(config, {
              address,
              abi: fixedReturnAbi,
              functionName: 'getLenderAllocation',
              args: [BigInt(offerId), lender]
            }) as Promise<bigint>,
            readContract(config, {
              address,
              abi: fixedReturnAbi,
              functionName: 'getLenderDeposits',
              args: [BigInt(offerId), lender]
            }) as Promise<bigint>
          ])
          return [offerId, { status: 'ok', allocation, deposited }] as const
        } catch (error) {
          log.error(`Failed to fetch lender position for offer #${offerId}:`, error)
          return [offerId, { status: 'error', error }] as const
        }
      })
    )
    return new Map<number, FixedReturnLenderPositionResult>(entries)
  }

  // Plain offerIds, not `allOffers` itself — TanStack Query hashes the query key with
  // JSON.stringify, which can't serialize the bigint fields on a raw offer struct.
  const offerIds = computed(() => (allOffers.value ?? []).map(({ offerId }) => offerId))

  return useQuery({
    queryKey: computed(
      () =>
        [
          ...fixedReturnKeys.myLenderPositions,
          {
            address: fixedReturnAddress.value ?? null,
            lender: lenderAddress.value ?? null,
            offerIds: offerIds.value
          }
        ] as const
    ),
    queryFn: fetchMyLenderPositions,
    enabled: computed(() => !!fixedReturnAddress.value && offerIds.value.length > 0)
  })
}
