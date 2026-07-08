import { computed, unref, type MaybeRef, type MaybeRefOrGetter, toValue } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { useReadContract } from '@wagmi/vue'
import { readContract } from '@wagmi/core'
import { formatUnits, isAddress, type Address } from 'viem'
import type { ExtractAbiFunctionNames } from 'abitype'
import { useTeamStore, useUserDataStore } from '@/stores'
import { config } from '@/wagmi.config'
import { FIXED_RETURN_ABI } from '@/artifacts/abi/fixed-return'
import { decimalsForOfferingToken, log, parseError } from '@/utils'
import type {
  FixedReturnLenderPosition,
  FixedReturnOfferLender,
  FixedReturnRawOffer,
  LendingOfferStruct
} from '@/types'

type FixedReturnFunctionNames = ExtractAbiFunctionNames<typeof FIXED_RETURN_ABI>

/**
 * FixedReturn contract address helper
 */
export function useFixedReturnAddress() {
  const teamStore = useTeamStore()
  return computed(() => teamStore.getContractAddressByType('FixedReturn'))
}

/** Reads with no args beyond the contract's own address. */
function useFixedReturnRead(functionName: FixedReturnFunctionNames) {
  const fixedReturnAddress = useFixedReturnAddress()
  return useReadContract({
    address: fixedReturnAddress,
    abi: FIXED_RETURN_ABI,
    functionName,
    query: { enabled: !!fixedReturnAddress.value && isAddress(fixedReturnAddress.value) }
  })
}

/** Reads taking a single offerId — no extra address to validate beyond the contract's own. */
function useFixedReturnOfferRead(
  functionName: FixedReturnFunctionNames,
  offerId: MaybeRef<bigint>
) {
  const fixedReturnAddress = useFixedReturnAddress()
  const offerIdValue = computed(() => unref(offerId))
  return useReadContract({
    address: fixedReturnAddress,
    abi: FIXED_RETURN_ABI,
    functionName,
    args: [offerIdValue],
    query: {
      enabled: computed(() => !!fixedReturnAddress.value && isAddress(fixedReturnAddress.value))
    }
  })
}

/** Reads taking (offerId, lender) — gated on both the contract address and lender. */
function useFixedReturnOfferLenderRead(
  functionName: FixedReturnFunctionNames,
  offerId: MaybeRef<bigint>,
  lender: MaybeRef<Address>
) {
  const fixedReturnAddress = useFixedReturnAddress()
  const offerIdValue = computed(() => unref(offerId))
  const lenderValue = computed(() => unref(lender))
  return useReadContract({
    address: fixedReturnAddress,
    abi: FIXED_RETURN_ABI,
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
  return useFixedReturnRead('totalOfferings')
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
  return useFixedReturnOfferLenderRead('lenderDeposits', offerId, lender)
}

export function useFixedReturnLenderAllocation(
  offerId: MaybeRef<bigint>,
  lender: MaybeRef<Address>
) {
  return useFixedReturnOfferLenderRead('lenderAllocation', offerId, lender)
}

export function useFixedReturnHasDeposited(offerId: MaybeRef<bigint>, lender: MaybeRef<Address>) {
  return useFixedReturnOfferLenderRead('hasDeposited', offerId, lender)
}

export function useFixedReturnIsTokenSupported(token: MaybeRef<Address>) {
  const fixedReturnAddress = useFixedReturnAddress()
  const tokenValue = computed(() => unref(token))
  return useReadContract({
    address: fixedReturnAddress,
    abi: FIXED_RETURN_ABI,
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
 */
export function useFixedReturnAllOffers() {
  const fixedReturnAddress = useFixedReturnAddress()

  async function fetchAllOffers(): Promise<FixedReturnRawOffer[]> {
    const address = fixedReturnAddress.value
    if (!address) return []

    try {
      const total = (await readContract(config, {
        address,
        abi: FIXED_RETURN_ABI,
        functionName: 'totalOfferings'
      })) as bigint

      const count = Number(total)
      if (count < 1) return []

      const offers: FixedReturnRawOffer[] = []
      for (let offerId = count; offerId >= 1; offerId--) {
        try {
          const offer = (await readContract(config, {
            address,
            abi: FIXED_RETURN_ABI,
            functionName: 'getLendingOffer',
            args: [BigInt(offerId)]
          })) as LendingOfferStruct
          offers.push({ offerId, offer, decimals: decimalsForOfferingToken(offer.token) ?? 6 })
        } catch (error) {
          log.error(`Failed to fetch FixedReturn offer #${offerId}:`, parseError(error))
        }
      }
      return offers
    } catch (error) {
      log.error('Failed to fetch FixedReturn offerings:', parseError(error))
      return []
    }
  }

  return useQuery({
    queryKey: ['fixedReturnAllOffers', fixedReturnAddress],
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
    const decimals = decimalsForOfferingToken(toValue(token)) ?? 6

    try {
      const lenderAddresses = (await readContract(config, {
        address,
        abi: FIXED_RETURN_ABI,
        functionName: 'getOfferLenders',
        args: [offerIdValue]
      })) as Address[]

      return await Promise.all(
        lenderAddresses.map(async (lender) => {
          const [principal, expected] = await Promise.all([
            readContract(config, {
              address,
              abi: FIXED_RETURN_ABI,
              functionName: 'lenderDeposits',
              args: [offerIdValue, lender]
            }) as Promise<bigint>,
            readContract(config, {
              address,
              abi: FIXED_RETURN_ABI,
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
      log.error('Failed to fetch FixedReturn offer lenders:', parseError(error))
      return []
    }
  }

  return useQuery({
    queryKey: ['fixedReturnOfferLenders', fixedReturnAddress, offerId],
    queryFn: fetchLenders,
    enabled: computed(() => !!fixedReturnAddress.value)
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

  async function fetchMyLenderPositions(): Promise<Map<number, FixedReturnLenderPosition>> {
    const address = fixedReturnAddress.value
    const lender = lenderAddress.value
    if (!address || !lender) return new Map()

    const entries = await Promise.all(
      (allOffers.value ?? []).map(async ({ offerId }) => {
        try {
          const [allocation, deposited] = await Promise.all([
            readContract(config, {
              address,
              abi: FIXED_RETURN_ABI,
              functionName: 'lenderAllocation',
              args: [BigInt(offerId), lender]
            }) as Promise<bigint>,
            readContract(config, {
              address,
              abi: FIXED_RETURN_ABI,
              functionName: 'lenderDeposits',
              args: [BigInt(offerId), lender]
            }) as Promise<bigint>
          ])
          return [offerId, { allocation, deposited }] as const
        } catch (error) {
          log.error(`Failed to fetch lender position for offer #${offerId}:`, parseError(error))
          return [offerId, { allocation: 0n, deposited: 0n }] as const
        }
      })
    )
    return new Map(entries)
  }

  // Plain offerIds, not `allOffers` itself — TanStack Query hashes the query key with
  // JSON.stringify, which can't serialize the bigint fields on a raw offer struct.
  const offerIds = computed(() => (allOffers.value ?? []).map(({ offerId }) => offerId))

  return useQuery({
    queryKey: ['fixedReturnMyLenderPositions', fixedReturnAddress, lenderAddress, offerIds],
    queryFn: fetchMyLenderPositions,
    enabled: computed(() => !!fixedReturnAddress.value && offerIds.value.length > 0)
  })
}
